import { z } from 'zod';

const finite = z.number().finite();
const percentage = finite.min(0).max(100);
const condition = z.object({ text: z.string().max(120) });
const providerSchema = z.object({
  location: z.object({ name: z.string(), region: z.string(), country: z.string(), localtime_epoch: finite }),
  current: z.object({ last_updated_epoch: finite, temp_c: finite, feelslike_c: finite, humidity: percentage, wind_kph: finite.min(0), wind_dir: z.string(), precip_mm: finite.min(0), cloud: percentage, vis_km: finite.min(0), condition }),
  forecast: z.object({ forecastday: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    day: z.object({ mintemp_c: finite, maxtemp_c: finite, daily_chance_of_rain: percentage, totalprecip_mm: finite.min(0), avghumidity: percentage, maxwind_kph: finite.min(0), condition }),
    hour: z.array(z.object({ time_epoch: finite, temp_c: finite, chance_of_rain: percentage, wind_kph: finite.min(0), condition })).max(24),
  })).min(1).max(14) }),
});

export class WeatherError extends Error {
  constructor(code, message, status = 503) { super(message); this.code = code; this.status = status; }
}

/** Fixed, server-side provider boundary: credentials and provider payloads never reach the browser. */
export function createWeatherService({ environment = process.env, fetchImpl = fetch, now = Date.now } = {}) {
  const cache = new Map();
  const pending = new Map();
  return {
    async get({ state, district }) {
      if (environment.WEATHER_PROVIDER !== 'weatherapi' || !environment.WEATHER_API_KEY) {
        throw new WeatherError('WEATHER_NOT_CONFIGURED', 'Weather is not connected. Ask the operator to configure a weather provider.');
      }
      const key = `${district}, ${state}, India`;
      const cached = cache.get(key);
      if (cached && now() - cached.fetchedAt < 10 * 60_000) return cached.result;
      if (pending.has(key)) return pending.get(key);
      const load = (async () => {
        const url = new URL('https://api.weatherapi.com/v1/forecast.json');
        url.search = new URLSearchParams({ key: environment.WEATHER_API_KEY, q: key, days: '3', aqi: 'no', alerts: 'no' }).toString();
        let response;
        try { response = await fetchImpl(url, { signal: AbortSignal.timeout(8000) }); }
        catch { throw new WeatherError('WEATHER_UNAVAILABLE', 'The weather provider could not be reached. Try again later.'); }
        if (!response.ok) throw new WeatherError(response.status === 429 ? 'WEATHER_RATE_LIMITED' : 'WEATHER_UNAVAILABLE', 'The weather provider is temporarily unavailable. Try again later.');
        let data;
        try { data = providerSchema.parse(await response.json()); }
        catch { throw new WeatherError('WEATHER_INVALID_RESPONSE', 'The weather provider returned incomplete information. No forecast is shown.'); }
        const current = data.current;
        const updatedAt = new Date(current.last_updated_epoch * 1000).toISOString();
        if (now() - current.last_updated_epoch * 1000 > 2 * 60 * 60_000 || current.last_updated_epoch * 1000 > now() + 5 * 60_000) {
          throw new WeatherError('WEATHER_EXPIRED', 'The weather provider returned expired or invalid timestamps. Refresh later.');
        }
        const first = data.forecast.forecastday[0];
        const snapshot = {
          locationLabel: `${data.location.name}, ${data.location.region}, ${data.location.country}`,
          state, district, tempC: current.temp_c, feelsLikeC: current.feelslike_c,
          tempMinC: first.day.mintemp_c, tempMaxC: first.day.maxtemp_c,
          condition: current.condition.text, humidityPct: current.humidity, windSpeedKmh: current.wind_kph,
          windDirection: current.wind_dir, rainProbabilityPct: first.day.daily_chance_of_rain,
          rainfallTodayMm: current.precip_mm, cloudCoverPct: current.cloud, visibilityKm: current.vis_km,
          soilTempEstimateC: null, sourceType: 'Live API', sourceProvider: 'WeatherAPI.com', updatedAt,
          hourly: first.hour.map((hour) => ({ time: new Date(hour.time_epoch * 1000).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }), tempC: hour.temp_c, rainProbPct: hour.chance_of_rain, condition: hour.condition.text, windKmh: hour.wind_kph })),
          daily: data.forecast.forecastday.map(({ date, day }) => ({ date, dayLabel: new Date(`${date}T12:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' }), tempMinC: day.mintemp_c, tempMaxC: day.maxtemp_c, condition: day.condition.text, rainProbPct: day.daily_chance_of_rain, expectedRainMm: day.totalprecip_mm, humidityPct: day.avghumidity, windKmh: day.maxwind_kph })),
          warnings: [],
        };
        const result = { snapshot, fetchedAt: new Date(now()).toISOString(), expiresAt: new Date(now() + 10 * 60_000).toISOString(), precipitationLabel: 'Provider-reported current precipitation; daily amounts are forecasts, not field sensor measurements.' };
        if (cache.size >= 100) cache.delete(cache.keys().next().value);
        cache.set(key, { fetchedAt: now(), result });
        return result;
      })();
      pending.set(key, load);
      try { return await load; } finally { pending.delete(key); }
    },
  };
}
