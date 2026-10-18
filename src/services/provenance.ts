/**
 * Data provenance and freshness helpers.
 *
 * AGRIPULSE mixes four different kinds of information. The interface must never blur them:
 *
 *  - `measured`    reading received from paired hardware through the ingestion API
 *  - `recorded`    value a farmer entered or confirmed by hand (observation, rainfall log)
 *  - `forecast`    value produced by a weather provider or forecast estimate
 *  - `rule`        deterministic guidance produced by AGRIPULSE rules, not a trained model
 *  - `demo`        sample/demo content shipped with the development build
 *  - `unavailable` no data exists for this value
 */
export type ProvenanceKind = 'measured' | 'recorded' | 'forecast' | 'rule' | 'demo' | 'unavailable';

export interface DataPoint<T = number> {
  /** The value, or `null` when no data is available. Never coerce missing data to zero. */
  value: T | null;
  provenance: ProvenanceKind;
  /** When the value was measured/recorded/issued. */
  capturedAt?: string;
  /** Human explanation of the source, e.g. "Sensor node · North Canal Soil Node". */
  sourceLabel?: string;
  unit?: string;
  /** Extra context, e.g. why a value is considered stale. */
  note?: string;
}

export const unavailable = <T,>(note = 'No data received yet'): DataPoint<T> => ({
  value: null,
  provenance: 'unavailable',
  note,
});

/* ---------------------------------------------------------------------------
   Freshness
   ------------------------------------------------------------------------- */

export type FreshnessState = 'live' | 'recent' | 'stale' | 'unknown';

export interface Freshness {
  state: FreshnessState;
  label: string;
  minutes: number | null;
}

/**
 * Describes how old a reading is. `liveWindowMinutes` follows the API's device
 * online window default (300 s) so the UI and the backend agree on "online".
 */
export function describeFreshness(
  timestamp?: string,
  { liveWindowMinutes = 5, recentWindowMinutes = 90, now = Date.now() }: {
    liveWindowMinutes?: number;
    recentWindowMinutes?: number;
    now?: number;
  } = {},
): Freshness {
  if (!timestamp) return { state: 'unknown', label: 'Timestamp unavailable', minutes: null };
  const time = new Date(timestamp).getTime();
  if (Number.isNaN(time)) return { state: 'unknown', label: 'Timestamp unavailable', minutes: null };
  const minutes = Math.round((now - time) / 60000);
  if (minutes <= liveWindowMinutes) {
    return { state: 'live', label: minutes <= 1 ? 'Received just now' : `Received ${minutes} min ago`, minutes };
  }
  if (minutes <= recentWindowMinutes) return { state: 'recent', label: `Received ${formatRelative(minutes)} ago`, minutes };
  if (minutes <= 60 * 24 * 3) return { state: 'stale', label: `Last received ${formatRelative(minutes)} ago`, minutes };
  return { state: 'stale', label: `Last received ${formatRelative(minutes)} ago`, minutes };
}

export function formatRelative(minutes: number): string {
  if (minutes < 1) return 'under a minute';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

/* ---------------------------------------------------------------------------
   Formatting
   ------------------------------------------------------------------------- */

export function formatTimestamp(value?: string, fallback = 'Not recorded'): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function formatDay(value?: string, fallback = 'Not recorded'): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date);
}

export function formatMeasurement(value: number | null | undefined, digits = 1, unit = ''): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const rounded = Number(value.toFixed(digits));
  return `${rounded.toLocaleString('en-IN')}${unit ? ` ${unit}` : ''}`;
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${Number(value.toFixed(digits))}%`;
}

/** Returns '—' for missing data and never pretends that unavailable means zero. */
export const displayValue = (point: DataPoint<number>, digits = 1): string =>
  point.value === null ? '—' : formatMeasurement(point.value, digits);

export const isDemoEnvironment = (): boolean =>
  typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);
