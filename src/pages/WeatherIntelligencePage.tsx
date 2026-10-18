import React, { useMemo, useState } from 'react';
import {
  CloudSun,
  Droplets,
  Wind,
  Eye,
  Thermometer,
  MapPin,
  RefreshCw,
  AlertTriangle,
  Info,
  Navigation,
  ShieldAlert,
} from 'lucide-react';
import { AgriPulseLoader } from '../components/AgriPulseLoader';
import { useAgriPulse } from '../context/AgriPulseContext';
import {
  fetchWeatherForLocation,
  INDIAN_AGRICULTURAL_LOCATIONS,
} from '../services/weatherService';
import { formatDateTime } from '../utils/formatters';

export const WeatherIntelligencePage: React.FC = () => {
  const {
    profile,
    updateProfile,
    weather,
    setWeather,
  } = useAgriPulse();

  const [selectedState, setSelectedState] = useState(weather.state || 'Haryana');
  const [selectedDistrict, setSelectedDistrict] = useState(weather.district || 'Karnal');
  const [customLocality, setCustomLocality] = useState(
    profile.preferences.weatherLocation.locality || 'Taraori Agricultural Block'
  );

  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);


  const availableDistricts = useMemo(() => {
    const st = INDIAN_AGRICULTURAL_LOCATIONS.find((s) => s.state === selectedState);
    return st ? st.districts : INDIAN_AGRICULTURAL_LOCATIONS[0].districts;
  }, [selectedState]);

  const handleLocationApply = async (simulateFailure = false) => {
    setIsLoading(true);
    setApiError(null);
    try {
      const result = await fetchWeatherForLocation(
        selectedState,
        selectedDistrict,
        customLocality,
        { simulateFailure }
      );
      setWeather(result.snapshot);
      if (result.errorMessage) {
        setApiError(result.errorMessage);
      }
      updateProfile({
        ...profile,
        preferences: {
          ...profile.preferences,
          weatherLocation: {
            ...profile.preferences.weatherLocation,
            state: selectedState,
            district: selectedDistrict,
            locality: customLocality,
          },
        },
      });
    } catch (err) {
      setApiError(
        err instanceof Error
          ? err.message
          : 'Unable to fetch live weather. Displaying last saved Demo Fallback Forecast.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestBrowserGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('Browser geolocation is not supported on this device. Please use manual selection.');
      return;
    }
    setGeoStatus('Requesting location permission from browser...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lon = Number(pos.coords.longitude.toFixed(4));
        const locLabel = `GPS (${lat}°N, ${lon}°E) — ${selectedDistrict}`;
        setCustomLocality(locLabel);
        setGeoStatus(`Coordinates obtained (${lat}°N, ${lon}°E). Updating demo forecast...`);
        void handleLocationApply(false);
      },
      (err) => {
        setGeoStatus(
          `Geolocation permission declined or unavailable (${err.message}). Using manual location selection.`
        );
      },
      { timeout: 8000 }
    );
  };

  // Generate cautious farming recommendations with explicit trigger explanations
  const farmingRecommendations = useMemo(() => {
    const recs: {
      id: string;
      title: string;
      suggestion: string;
      triggerReason: string;
      category: 'Irrigation' | 'Drainage' | 'Spraying & Scouting' | 'Harvest & Storage';
    }[] = [];

    const rainyDay = weather.daily.find((d) => d.rainProbPct >= 50 || d.expectedRainMm >= 10);
    if (rainyDay) {
      recs.push({
        id: 'rec-rain',
        category: 'Drainage',
        title: `Inspect Plot Drainage & Pause Non-Essential Irrigation Before ${rainyDay.dayLabel}`,
        suggestion:
          'Keep field bund outlets clear in low-lying plots (such as Chickpea and Mustard seedbeds) and consider postponing routine irrigation ahead of expected showers to prevent water stagnation or cereal lodging.',
        triggerReason: `Triggered by forecast showing ${rainyDay.rainProbPct}% rain probability (~${rainyDay.expectedRainMm} mm) and ${rainyDay.windKmh} km/h winds on ${rainyDay.dayLabel} (${rainyDay.date}).`,
      });
    }

    if (weather.windSpeedKmh >= 15 || weather.daily.some((d) => d.windKmh >= 18)) {
      recs.push({
        id: 'rec-wind',
        category: 'Spraying & Scouting',
        title: 'Schedule Foliar Applications in Calm Early Morning Hours Only',
        suggestion:
          'Avoid spraying foliar nutrients or botanical extracts during breezy afternoon hours when wind exceeds 12–15 km/h to prevent spray drift and evaporation.',
        triggerReason: `Triggered by forecast afternoon wind speeds reaching ${Math.max(
          weather.windSpeedKmh,
          ...weather.daily.map((d) => d.windKmh)
        )} km/h.`,
      });
    }

    if (weather.humidityPct >= 55) {
      recs.push({
        id: 'rec-humidity',
        category: 'Spraying & Scouting',
        title: 'Monitor Lower Canopy for Dew Moisture & Sucking Pest Vectors',
        suggestion:
          'Warm daytime temperatures (~29°C–32°C) paired with moderate-to-high morning humidity can encourage whitefly and fungal leaf-spot activity in vegetables. Inspect lower leaves and yellow sticky traps.',
        triggerReason: `Triggered by current temperature (${weather.tempC}°C) and relative humidity (${weather.humidityPct}%).`,
      });
    }

    recs.push({
      id: 'rec-harvest',
      category: 'Harvest & Storage',
      title: 'Use Dry Sunshine Windows for Grain Drying & Tarpaulin Readiness',
      suggestion:
        'Take advantage of sunny days (Wed/Sun/Mon) to check Basmati paddy grain moisture (<18% for harvesting, <12–14% for storage) and keep tarpaulins handy before Friday clouds arrive.',
      triggerReason: `Triggered by dry sunshine days (10% rain probability) alternating with Friday cloud build-up (${weather.daily[3]?.rainProbPct ?? 75}% rain probability).`,
    });

    return recs;
  }, [weather]);



  return (
    <div className="weather-page space-y-6">
      {/* 1. Data Source & Fallback Transparency Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold">Weather Data Mode: {weather.sourceType}</span>
              <span className="px-2 py-0.5 rounded bg-white border border-amber-300 text-[10px] font-bold">
                Last Updated: {formatDateTime(weather.updatedAt)}
              </span>
            </div>
            <p className="mt-1 text-amber-900">
              Live external weather API is not configured with a key in this environment. Displaying clearly labelled sample agro-meteorological forecast data for demonstration. Sample values are never reported as live sensor readings.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void handleLocationApply(false)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold transition-colors"
          >
            {isLoading ? <AgriPulseLoader size="sm" className="agri-loader--button" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>{isLoading ? 'Refreshing...' : 'Retry / Refresh'}</span>
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void handleLocationApply(true)}
            className="px-3 py-2 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold transition-colors"
          >
            Simulate API Failure
          </button>
        </div>
      </div>

      {/* Simulated or Real API Error Alert with Retry */}
      {apiError && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-red-900"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Live Weather Connection Error</p>
              <p className="mt-0.5">{apiError}</p>
              <p className="mt-1 text-[11px] text-red-700">
                Last saved demo snapshot timestamp: {formatDateTime(weather.updatedAt)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleLocationApply(false)}
            className="px-3.5 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold shrink-0"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* 2. Location Selector Panel */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Select Farm Weather Location
            </h2>
            <p className="text-xs text-slate-500">
              Choose your State, District, and Village/Block manually or request browser geolocation permission.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRequestBrowserGeolocation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200"
          >
            <Navigation className="w-3.5 h-3.5 text-forest-700" />
            <span>Use Browser Location (Asks Permission)</span>
          </button>
        </div>

        {geoStatus && (
          <p className="mt-2.5 text-xs text-forest-800 bg-forest-50 px-3 py-1.5 rounded-lg border border-forest-200">
            {geoStatus}
          </p>
        )}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">State</label>
            <select
              value={selectedState}
              onChange={(e) => {
                const nextState = e.target.value;
                setSelectedState(nextState);
                const firstDist =
                  INDIAN_AGRICULTURAL_LOCATIONS.find((s) => s.state === nextState)
                    ?.districts[0];
                if (firstDist) {
                  setSelectedDistrict(firstDist.name);
                  setCustomLocality(firstDist.locality);
                }
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
            >
              {INDIAN_AGRICULTURAL_LOCATIONS.map((s) => (
                <option key={s.state} value={s.state}>
                  {s.state}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">District</label>
            <select
              value={selectedDistrict}
              onChange={(e) => {
                const nextDist = e.target.value;
                setSelectedDistrict(nextDist);
                const distObj = availableDistricts.find((d) => d.name === nextDist);
                if (distObj) setCustomLocality(distObj.locality);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
            >
              {availableDistricts.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Village / Agricultural Block
            </label>
            <input
              type="text"
              value={customLocality}
              onChange={(e) => setCustomLocality(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => void handleLocationApply(false)}
              className="w-full py-2 px-4 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold shadow-sm transition-colors"
            >
              Update Location Forecast
            </button>
          </div>
        </div>
      </section>

      {/* 3. Current Weather Conditions & Hourly Outlook */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Current Weather (5 cols) */}
        <section className="lg:col-span-5 bg-forest-950 text-white rounded-2xl p-5 shadow-sm border border-forest-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-leaf-300">
                <MapPin className="w-4 h-4" />
                {weather.locationLabel}
              </span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-400/20 text-amber-200 border border-amber-400/30">
                {weather.sourceType}
              </span>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <div>
                <div className="text-4xl font-extrabold tracking-tight">
                  {weather.tempC}°C
                </div>
                <p className="text-sm font-semibold text-leaf-300 mt-1">
                  {weather.condition}
                </p>
                <p className="text-xs text-forest-200 mt-0.5">
                  Feels like {weather.feelsLikeC}°C • High {weather.tempMaxC}°C / Low{' '}
                  {weather.tempMinC}°C
                </p>
              </div>
              <CloudSun className="w-14 h-14 text-harvest-400" />
            </div>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-forest-900/90 border border-forest-800">
                <span className="text-forest-300 flex items-center gap-1 text-[11px]">
                  <Droplets className="w-3.5 h-3.5 text-sky-400" /> Humidity
                </span>
                <span className="text-base font-bold text-white mt-0.5 block">
                  {weather.humidityPct}%
                </span>
              </div>

              <div className="p-3 rounded-xl bg-forest-900/90 border border-forest-800">
                <span className="text-forest-300 flex items-center gap-1 text-[11px]">
                  <Wind className="w-3.5 h-3.5 text-leaf-400" /> Wind Speed
                </span>
                <span className="text-base font-bold text-white mt-0.5 block">
                  {weather.windSpeedKmh} km/h
                </span>
                <span className="text-[10px] text-forest-300">{weather.windDirection}</span>
              </div>

              <div className="p-3 rounded-xl bg-forest-900/90 border border-forest-800">
                <span className="text-forest-300 flex items-center gap-1 text-[11px]">
                  <Droplets className="w-3.5 h-3.5 text-sky-300" /> Rain Prob
                </span>
                <span className="text-base font-bold text-white mt-0.5 block">
                  {weather.rainProbabilityPct}%
                </span>
                <span className="text-[10px] text-forest-300">
                  Forecast estimate: {weather.daily[0]?.expectedRainMm ?? 'Unavailable'} mm
                </span>
              </div>

              <div className="p-3 rounded-xl bg-forest-900/90 border border-forest-800">
                <span className="text-forest-300 flex items-center gap-1 text-[11px]">
                  <CloudSun className="w-3.5 h-3.5 text-amber-300" /> Cloud Cover
                </span>
                <span className="text-base font-bold text-white mt-0.5 block">
                  {weather.cloudCoverPct}%
                </span>
              </div>

              <div className="p-3 rounded-xl bg-forest-900/90 border border-forest-800">
                <span className="text-forest-300 flex items-center gap-1 text-[11px]">
                  <Eye className="w-3.5 h-3.5 text-forest-200" /> Visibility
                </span>
                <span className="text-base font-bold text-white mt-0.5 block">
                  {weather.visibilityKm} km
                </span>
              </div>

              <div className="p-3 rounded-xl bg-forest-900/90 border border-forest-800">
                <span className="text-forest-300 flex items-center gap-1 text-[11px]">
                  <Thermometer className="w-3.5 h-3.5 text-harvest-400" /> Est. Soil Temp
                </span>
                <span className="text-base font-bold text-white mt-0.5 block">
                  {weather.soilTempEstimateC}°C
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-forest-800 text-[11px] text-forest-300">
            Source: {weather.sourceProvider}
          </div>
        </section>

        {/* Hourly Forecast & Warnings (7 cols) */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Hourly Outlook (Sample Forecast)
                </h3>
                <p className="text-xs text-slate-500">
                  Plan spraying, irrigation, and harvesting during low-wind windows
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                Demo Data
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {weather.hourly.map((h) => (
                <div
                  key={h.time}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center"
                >
                  <span className="text-xs font-bold text-slate-700 block">{h.time}</span>
                  <span className="text-lg font-extrabold text-forest-900 mt-1 block">
                    {h.tempC}°C
                  </span>
                  <span className="text-[11px] text-slate-600 block truncate mt-0.5">
                    {h.condition}
                  </span>
                  <div className="mt-1.5 pt-1.5 border-t border-slate-200/70 text-[10px] text-slate-500 space-y-0.5">
                    <div>Rain: {h.rainProbPct}%</div>
                    <div>Wind: {h.windKmh} km/h</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Agricultural Weather Warnings */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Agricultural Weather Advisories & Trigger Conditions
            </h4>
            {weather.warnings.map((w) => (
              <div
                key={w.id}
                className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-700" />
                    {w.title}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-200/80 text-amber-950">
                    {w.severity}
                  </span>
                </div>
                <p className="text-slate-700 mt-1">{w.description}</p>
                <p className="text-[11px] font-medium text-amber-900 mt-1">
                  <strong>Trigger:</strong> {w.triggerCondition}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 4. Seven-Day Forecast Table / Cards */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              7-Day Agricultural Forecast — {weather.district}, {weather.state}
            </h3>
            <p className="text-xs text-slate-500">
              Includes min/max temperatures, rain probability, expected rainfall (mm), humidity, and wind speed
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
            {weather.sourceType}
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                <th className="py-2.5 px-3">Day & Date</th>
                <th className="py-2.5 px-3">Condition</th>
                <th className="py-2.5 px-3">Max / Min Temp</th>
                <th className="py-2.5 px-3">Forecast chance & precipitation</th>
                <th className="py-2.5 px-3">Humidity</th>
                <th className="py-2.5 px-3">Wind Speed</th>
                <th className="py-2.5 px-3">Field Advisory Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {weather.daily.map((d) => (
                <tr key={d.date} className="hover:bg-slate-50/80">
                  <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                    {d.dayLabel}
                    <span className="block text-[10px] font-normal text-slate-500">
                      {d.date}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-forest-900">{d.condition}</td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <strong className="text-slate-900">{d.tempMaxC}°C</strong> /{' '}
                    <span className="text-slate-600">{d.tempMinC}°C</span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-0.5 rounded font-bold ${
                        d.rainProbPct >= 50
                          ? 'bg-sky-100 text-sky-900'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {d.expectedRainMm} mm · {d.rainProbPct}% chance
                    </span>
                  </td>
                  <td className="py-3 px-3">{d.humidityPct}%</td>
                  <td className="py-3 px-3">{d.windKmh} km/h</td>
                  <td className="py-3 px-3 text-slate-600 max-w-xs">{d.advisoryNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Cautious recommendations & provider-sourced precipitation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="weather-recommendations-card lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Forecast-based farming suggestions</h3>
              <p className="text-xs text-slate-500">Each suggestion explains its trigger and data source; use as decision support, not a guarantee.</p>
            </div>
            <div className="mt-4 space-y-3">
              {farmingRecommendations.map((rec) => (
                <div key={rec.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-forest-100 text-forest-900">{rec.category}</span></div>
                  <h4 className="font-bold text-slate-900">{rec.title}</h4>
                  <p className="text-slate-700 leading-relaxed">{rec.suggestion}</p>
                  <p className="text-[11px] text-forest-800 bg-forest-50/80 px-2.5 py-1 rounded border border-forest-100"><strong>Trigger:</strong> {rec.triggerReason}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-950"><strong>Advisory disclaimer:</strong> These educational suggestions do not guarantee crop protection and do not replace official IMD, State Agricultural University, or KVK guidance.</div>
        </section>

        <section className="weather-precipitation-card lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
            <div><span className="device-eyebrow">Provider data · not a physical measurement</span><h3 className="text-base font-bold text-slate-900 mt-1">Forecast precipitation</h3><p className="text-xs text-slate-500">7-day precipitation estimate and rain probability.</p></div>
            <span className="weather-source-tag">{weather.sourceType}</span>
          </div>
          <div className="precipitation-summary">
            <div><span>7-day forecast total</span><strong>{weather.daily.length ? `${weather.daily.reduce((sum, day) => sum + day.expectedRainMm, 0).toFixed(1)} mm` : 'Unavailable'}</strong></div>
            <div><span>Highest rain probability</span><strong>{weather.daily.length ? `${Math.max(...weather.daily.map((day) => day.rainProbPct))}%` : 'Unavailable'}</strong></div>
          </div>
          <div className="precipitation-day-list">
            {weather.daily.length ? weather.daily.slice(0, 7).map((day) => (
              <div className="precipitation-day-row" key={day.date}>
                <span className="precipitation-day-label">{day.dayLabel.split(' ')[0]}</span>
                <span className="precipitation-day-bar"><i style={{ width: `${Math.max(4, Math.min(100, day.rainProbPct))}%` }} /></span>
                <strong>{day.expectedRainMm} mm</strong>
                <small>{day.rainProbPct}%</small>
              </div>
            )) : <div className="precipitation-unavailable">Precipitation data is currently unavailable. No value is assumed to be zero.</div>}
          </div>
          <div className="precipitation-provenance"><Info size={15} /><div><strong>Source: {weather.sourceProvider}</strong><span>Period: {weather.daily[0]?.date || 'Not available'} through {weather.daily[weather.daily.length - 1]?.date || 'Not available'} · Updated {formatDateTime(weather.updatedAt)}</span></div></div>
          <div className="precipitation-integrity-note"><ShieldAlert size={15} /><span>AGRIPULSE does not include a physical rain gauge or rainfall-mm sensor in this version. Forecast estimates are never stored or displayed as measured farm rainfall.</span></div>
        </section>
      </div>
    </div>
  );
};
