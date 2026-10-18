import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createWeatherService } from '../weather-service.mjs';

const now = Date.parse('2026-10-18T12:00:00Z');
const environment = { WEATHER_PROVIDER: 'weatherapi', WEATHER_API_KEY: 'test-secret-do-not-return' };
const payload = () => ({
  location: { name: 'Karnal', region: 'Haryana', country: 'India', localtime_epoch: now / 1000 },
  current: { last_updated_epoch: now / 1000, temp_c: 28, feelslike_c: 29, humidity: 60, wind_kph: 12, wind_dir: 'NE', precip_mm: 0.1, cloud: 20, vis_km: 10, condition: { text: 'Clear' } },
  forecast: { forecastday: [{ date: '2026-10-18', day: { mintemp_c: 20, maxtemp_c: 30, daily_chance_of_rain: 15, totalprecip_mm: 0.5, avghumidity: 60, maxwind_kph: 15, condition: { text: 'Clear' } }, hour: [{ time_epoch: now / 1000, temp_c: 28, chance_of_rain: 15, wind_kph: 12, condition: { text: 'Clear' } }] }] },
});

describe('server-side weather boundary', () => {
  it('fails closed without configuration and never calls an external provider', async () => {
    const service = createWeatherService({ environment: {}, fetchImpl: () => { throw new Error('must not call'); } });
    await assert.rejects(service.get({ state: 'Haryana', district: 'Karnal' }), { code: 'WEATHER_NOT_CONFIGURED' });
  });
  it('normalizes weather, preserves source time, keeps secrets private and caches', async () => {
    let calls = 0;
    const service = createWeatherService({ environment, now: () => now, fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url.origin, 'https://api.weatherapi.com');
      assert.equal(url.searchParams.get('q'), 'Karnal, Haryana, India');
      assert.ok(options.signal);
      return Response.json(payload());
    } });
    const first = await service.get({ state: 'Haryana', district: 'Karnal' });
    assert.equal(first.snapshot.sourceType, 'Live API');
    assert.equal(first.snapshot.updatedAt, new Date(now).toISOString());
    assert.equal(first.snapshot.soilTempEstimateC, null);
    assert.equal(first.snapshot.daily[0].expectedRainMm, 0.5);
    assert.match(first.precipitationLabel, /not field sensor/);
    assert.equal(JSON.stringify(first).includes(environment.WEATHER_API_KEY), false);
    assert.deepEqual(await service.get({ state: 'Haryana', district: 'Karnal' }), first);
    assert.equal(calls, 1);
  });
  it('does not fabricate data on rate limits, network errors, bad schemas or expired weather', async () => {
    const cases = [
      [async () => new Response('', { status: 429 }), 'WEATHER_RATE_LIMITED'],
      [async () => { throw new Error('network'); }, 'WEATHER_UNAVAILABLE'],
      [async () => Response.json({ wrong: true }), 'WEATHER_INVALID_RESPONSE'],
      [async () => { const old = payload(); old.current.last_updated_epoch -= 3 * 3600; return Response.json(old); }, 'WEATHER_EXPIRED'],
    ];
    for (const [fetchImpl, code] of cases) {
      const service = createWeatherService({ environment, fetchImpl, now: () => now });
      await assert.rejects(service.get({ state: 'Haryana', district: 'Karnal' }), { code });
    }
  });
});
