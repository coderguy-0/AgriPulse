import { SEED_WEATHER_SNAPSHOT } from '../data/seedFarmData';
import { WeatherSnapshot } from '../types';

export const INDIAN_AGRICULTURAL_LOCATIONS: {
  state: string;
  districts: {
    name: string;
    locality: string;
    baseTempC: number;
    humidityPct: number;
    windKmh: number;
    rainProbPct: number;
  }[];
}[] = [
  {
    state: 'Haryana',
    districts: [
      { name: 'Karnal', locality: 'Taraori Agricultural Block', baseTempC: 29, humidityPct: 58, windKmh: 12, rainProbPct: 20 },
      { name: 'Kurukshetra', locality: 'Shahabad Markanda', baseTempC: 28, humidityPct: 60, windKmh: 11, rainProbPct: 22 },
      { name: 'Hisar', locality: 'HAU Agro-Climatic Zone', baseTempC: 32, humidityPct: 45, windKmh: 15, rainProbPct: 10 },
      { name: 'Sirsa', locality: 'Ghaggar Cotton-Wheat Belt', baseTempC: 33, humidityPct: 42, windKmh: 16, rainProbPct: 8 },
    ],
  },
  {
    state: 'Punjab',
    districts: [
      { name: 'Ludhiana', locality: 'PAU Central Plain Zone', baseTempC: 28, humidityPct: 57, windKmh: 11, rainProbPct: 18 },
      { name: 'Patiala', locality: 'Nabha Paddy-Wheat Belt', baseTempC: 29, humidityPct: 59, windKmh: 10, rainProbPct: 20 },
      { name: 'Bathinda', locality: 'South-Western Cotton Zone', baseTempC: 31, humidityPct: 46, windKmh: 14, rainProbPct: 10 },
    ],
  },
  {
    state: 'Uttar Pradesh',
    districts: [
      { name: 'Meerut', locality: 'Western UP Sugarcane-Wheat Belt', baseTempC: 30, humidityPct: 61, windKmh: 10, rainProbPct: 20 },
      { name: 'Varanasi', locality: 'Eastern Gangetic Alluvial Zone', baseTempC: 31, humidityPct: 68, windKmh: 9, rainProbPct: 30 },
      { name: 'Lucknow', locality: 'Central UP Agro Zone', baseTempC: 31, humidityPct: 64, windKmh: 11, rainProbPct: 25 },
    ],
  },
  {
    state: 'Madhya Pradesh',
    districts: [
      { name: 'Sehore', locality: 'Malwa Sharbati Wheat & Soybean Belt', baseTempC: 30, humidityPct: 54, windKmh: 13, rainProbPct: 15 },
      { name: 'Indore', locality: 'Malwa Plateau Zone', baseTempC: 30, humidityPct: 52, windKmh: 14, rainProbPct: 15 },
      { name: 'Jabalpur', locality: 'Narmada Valley Zone', baseTempC: 29, humidityPct: 63, windKmh: 10, rainProbPct: 25 },
    ],
  },
  {
    state: 'Rajasthan',
    districts: [
      { name: 'Sri Ganganagar', locality: 'IGNP Canal Irrigated Zone', baseTempC: 33, humidityPct: 40, windKmh: 16, rainProbPct: 8 },
      { name: 'Kota', locality: 'Hadoti Mustard & Coriander Belt', baseTempC: 32, humidityPct: 48, windKmh: 12, rainProbPct: 12 },
      { name: 'Alwar', locality: 'Eastern Mustard Zone', baseTempC: 31, humidityPct: 50, windKmh: 13, rainProbPct: 15 },
    ],
  },
  {
    state: 'Maharashtra',
    districts: [
      { name: 'Nashik', locality: 'Grape & Tomato Horticulture Belt', baseTempC: 28, humidityPct: 65, windKmh: 14, rainProbPct: 35 },
      { name: 'Pune', locality: 'Western Maharashtra Irrigated Zone', baseTempC: 29, humidityPct: 62, windKmh: 13, rainProbPct: 30 },
      { name: 'Nagpur', locality: 'Vidarbha Cotton & Citrus Belt', baseTempC: 31, humidityPct: 56, windKmh: 11, rainProbPct: 20 },
    ],
  },
];

export interface WeatherServiceResult {
  snapshot: WeatherSnapshot;
  isLive: boolean;
  errorMessage?: string;
}

export async function fetchWeatherForLocation(
  state: string,
  district: string,
  locality: string,
  options?: { simulateFailure?: boolean }
): Promise<WeatherServiceResult> {
  if (options?.simulateFailure) throw new Error('Weather service unavailable. No replacement forecast was generated.');
  const query = new URLSearchParams({ state, district });
  const response = await fetch(`/api/weather?${query}`, { credentials: 'include', signal: AbortSignal.timeout(12_000) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || 'Weather is unavailable. Please try again later.');
  return { snapshot: payload.snapshot as WeatherSnapshot, isLive: true };
}

export function buildDemoWeatherSnapshot(
  state: string,
  district: string,
  locality: string
): WeatherSnapshot {
  const matchedState = INDIAN_AGRICULTURAL_LOCATIONS.find(
    (s) => s.state.toLowerCase() === state.toLowerCase()
  );
  const matchedDistrict = matchedState?.districts.find(
    (d) => d.name.toLowerCase() === district.toLowerCase()
  );

  const baseTemp = matchedDistrict?.baseTempC ?? 29;
  const humidity = matchedDistrict?.humidityPct ?? 58;
  const wind = matchedDistrict?.windKmh ?? 12;
  const rainProb = matchedDistrict?.rainProbPct ?? 20;
  const displayLocality = locality || matchedDistrict?.locality || `${district} Block`;

  return {
    ...SEED_WEATHER_SNAPSHOT,
    locationLabel: `${displayLocality}, ${district}, ${state}`,
    state,
    district,
    tempC: baseTemp,
    feelsLikeC: baseTemp + 2,
    tempMinC: baseTemp - 10,
    tempMaxC: baseTemp + 3,
    humidityPct: humidity,
    windSpeedKmh: wind,
    rainProbabilityPct: rainProb,
    soilTempEstimateC: Number((baseTemp - 4.5).toFixed(1)),
    sourceType: 'Demo Fallback Forecast',
    sourceProvider: 'AGRIPULSE Demo Agro-Meteorological Dataset (No Live API Key Configured)',
    updatedAt: new Date().toISOString(),
    hourly: [
      { time: '06:00', tempC: baseTemp - 9, rainProbPct: Math.max(5, rainProb - 10), condition: 'Clear Dawn', windKmh: Math.max(6, wind - 4) },
      { time: '09:00', tempC: baseTemp - 4, rainProbPct: Math.max(10, rainProb - 5), condition: 'Sunny', windKmh: Math.max(8, wind - 2) },
      { time: '12:00', tempC: baseTemp + 1, rainProbPct: rainProb, condition: 'Partly Cloudy', windKmh: wind + 2 },
      { time: '15:00', tempC: baseTemp + 3, rainProbPct: Math.min(90, rainProb + 5), condition: 'Warm Afternoon', windKmh: wind + 4 },
      { time: '18:00', tempC: baseTemp - 2, rainProbPct: rainProb, condition: 'Mostly Clear', windKmh: wind - 1 },
      { time: '21:00', tempC: baseTemp - 6, rainProbPct: Math.max(5, rainProb - 10), condition: 'Cool Night', windKmh: Math.max(6, wind - 5) },
    ],
    daily: SEED_WEATHER_SNAPSHOT.daily.map((day, idx) => ({
      ...day,
      tempMinC: baseTemp - 10 + (idx % 2 === 0 ? 0 : -1),
      tempMaxC: baseTemp + 3 - (idx === 3 ? 4 : idx % 2),
    })),
  };
}
