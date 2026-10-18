import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { deviceApi } from '../services/apiClient';
import { DeviceStatus, IoTDevice, TelemetryReading } from '../types';

/**
 * Shared store for stored physical-sensor telemetry.
 *
 * Every module (dashboard, monitoring, twin, soil health, alerts) needs the same readings, so the
 * fetch lives in one module-level store instead of one request per component. The API is the only
 * source of readings: nothing is synthesised here, and devices that never reported stay empty so
 * the UI can say "waiting for readings" rather than showing zeros.
 */

const REPORTING_STATUSES: DeviceStatus[] = ['online', 'offline'];

/** Only paired sensor nodes can have stored readings: pending or retired devices cannot report. */
const isTelemetryEligible = (device: IoTDevice): boolean =>
  device.type === 'sensor_node' && REPORTING_STATUSES.includes(device.status) && (device.installedSensors?.length || 0) > 0;

interface TelemetryStore {
  readingsByDevice: Record<string, TelemetryReading[]>;
  loading: boolean;
  error: string | null;
  lastFetchedAt: string | null;
  /** Device-id set of the last completed request, used to decide whether a refetch is needed. */
  loadedKey: string | null;
}

const STALE_AFTER_MS = 60_000;

const store: TelemetryStore = {
  readingsByDevice: {},
  loading: false,
  error: null,
  lastFetchedAt: null,
  loadedKey: null,
};

const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;
let snapshot: TelemetryStore = { ...store };

function emit() {
  snapshot = { ...store };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => snapshot;

async function fetchDevices(deviceIds: string[]) {
  if (deviceIds.length === 0) {
    store.readingsByDevice = {};
    store.error = null;
    store.lastFetchedAt = new Date().toISOString();
    store.loadedKey = '';
    emit();
    return;
  }

  store.loading = true;
  emit();
  try {
    const responses = await Promise.all(
      deviceIds.map(async (deviceId) => {
        const response = await deviceApi.telemetry(deviceId, 400);
        return [deviceId, response.readings] as const;
      }),
    );
    store.readingsByDevice = Object.fromEntries(responses);
    store.error = null;
  } catch (caught) {
    store.error = caught instanceof Error ? caught.message : 'Sensor readings could not be loaded.';
  } finally {
    store.loading = false;
    store.lastFetchedAt = new Date().toISOString();
    emit();
  }
}

function load(deviceIds: string[], { force = false }: { force?: boolean } = {}) {
  const key = [...deviceIds].sort().join(',');
  const isFresh = store.lastFetchedAt !== null && Date.now() - new Date(store.lastFetchedAt).getTime() < STALE_AFTER_MS;
  if (!force && store.loadedKey === key && isFresh) return Promise.resolve();
  if (inflight) return inflight;
  store.loadedKey = key;
  inflight = fetchDevices(deviceIds).finally(() => {
    inflight = null;
  });
  return inflight;
}

export interface TelemetryState {
  readingsByDevice: Record<string, TelemetryReading[]>;
  loading: boolean;
  error: string | null;
  lastFetchedAt: string | null;
  refresh: () => Promise<void>;
}

export function useFarmTelemetry(devices: IoTDevice[], enabled: boolean): TelemetryState {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const eligibleIds = useMemo(
    () => devices.filter(isTelemetryEligible).map((device) => device.id),
    [devices],
  );
  const key = useMemo(() => [...eligibleIds].sort().join(','), [eligibleIds]);

  useEffect(() => {
    if (!enabled) return;
    void load(eligibleIds);
    // `key` captures the device set; eligibleIds is derived from it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key]);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    await load(eligibleIds, { force: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key]);

  return {
    readingsByDevice: enabled ? state.readingsByDevice : {},
    loading: enabled ? state.loading : false,
    error: enabled ? state.error : null,
    lastFetchedAt: enabled ? state.lastFetchedAt : null,
    refresh,
  };
}
