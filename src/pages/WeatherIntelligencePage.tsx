import React, { useState } from 'react';
import { CloudSun, Droplets, Wind, MapPin, RefreshCw, ExternalLink, Thermometer } from 'lucide-react';
import { useAgriPulse } from '../context/AgriPulseContext';
import { buildDemoWeatherSnapshot, fetchWeatherForLocation, INDIAN_AGRICULTURAL_LOCATIONS } from '../services/weatherService';
import { SectionCard, Notice, EmptyState } from '../components/ui/primitives';
import { AgriPulseLoader } from '../components/AgriPulseLoader';
import { formatTimestamp } from '../services/provenance';

/** Weather is intentionally separate from physical device telemetry. No generated fallback on failure. */
export const WeatherIntelligencePage: React.FC = () => {
  const { session, profile, weather, setWeather } = useAgriPulse();
  const [state, setState] = useState(profile.preferences.weatherLocation.state || 'Haryana');
  const [district, setDistrict] = useState(profile.preferences.weatherLocation.district || 'Karnal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demo, setDemo] = useState(false);
  const districts = INDIAN_AGRICULTURAL_LOCATIONS.find((location) => location.state === state)?.districts || [];
  const available = (demo && session?.isDemo) || (weather.sourceType === 'Live API' && Date.now() - Date.parse(weather.updatedAt) < 2 * 3600_000);

  const refresh = async () => {
    if (loading) return;
    setLoading(true); setError(''); setDemo(false);
    try { const result = await fetchWeatherForLocation(state, district, ''); setWeather(result.snapshot); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to load weather. Try again later.'); }
    finally { setLoading(false); }
  };

  return <div className="ap-stack">
    <header className="ap-page-head"><div><p className="ap-eyebrow">WEATHER INTELLIGENCE</p><h1 className="ap-page-title">Plan around the weather.</h1><p className="ap-page-subtitle">Location-based conditions and rainfall forecasts. Never a substitute for a field reading.</p></div><CloudSun size={36} color="var(--ap-green-strong)" aria-hidden="true" /></header>
    <SectionCard title="Choose your forecast location" icon={<MapPin size={17} />} description="District-level forecasts may differ from the conditions on your plot.">
      <form onSubmit={(event) => { event.preventDefault(); void refresh(); }} className="weather-location-form">
        <label className="ap-field"><span>State</span><select className="ap-select" value={state} onChange={(event) => { setState(event.target.value); setDistrict(INDIAN_AGRICULTURAL_LOCATIONS.find((location) => location.state === event.target.value)?.districts[0].name || ''); }}>
          {INDIAN_AGRICULTURAL_LOCATIONS.map((location) => <option key={location.state}>{location.state}</option>)}
        </select></label>
        <label className="ap-field"><span>District</span><select className="ap-select" value={district} onChange={(event) => setDistrict(event.target.value)}>{districts.map((location) => <option key={location.name}>{location.name}</option>)}</select></label>
        <button className="ap-btn ap-btn--primary" disabled={loading} type="submit"><RefreshCw size={15} />{loading ? 'Loading forecast…' : 'Load forecast'}</button>
      </form>
      {session?.isDemo && <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" style={{ marginTop: 12 }} onClick={() => { setWeather(buildDemoWeatherSnapshot(state, district, 'Example location')); setDemo(true); setError(''); }}>Explore a labeled demonstration forecast</button>}
    </SectionCard>
    {error && <div role="alert"><Notice tone="warn" title="Weather could not be updated">{error} No substitute values have been generated.</Notice></div>}
    {loading ? <AgriPulseLoader label="Fetching provider weather…" /> : !available ? <EmptyState icon={<CloudSun size={28} />} title="No current weather available" description="Choose a location and load its forecast. A configured provider is required. Rainfall comes from online weather information, not a rain gauge." /> : <>
      <Notice tone={demo ? 'warn' : 'info'} title={demo ? 'Demonstration · not actual weather' : `${weather.sourceProvider} · reported ${formatTimestamp(weather.updatedAt)}`}>
        {weather.locationLabel}. Daily precipitation is forecast rainfall, not measured rainfall on your farm. Soil temperature must come from a soil sensor; it is not inferred from air temperature.
      </Notice>
      <div className="ap-grid ap-grid--metrics">
        {[
          { label: 'Reported air temperature', value: `${weather.tempC} °C`, icon: <Thermometer size={18} />, detail: weather.condition },
          { label: 'Reported relative humidity', value: `${weather.humidityPct}%`, icon: <Droplets size={18} />, detail: 'Weather provider · not the field node' },
          { label: 'Reported wind', value: `${weather.windSpeedKmh} km/h`, icon: <Wind size={18} />, detail: weather.windDirection },
          { label: 'Forecast rainfall · first day', value: weather.daily[0] ? `${weather.daily[0].expectedRainMm} mm` : '—', icon: <CloudSun size={18} />, detail: 'Daily total forecast · not a sensor reading' },
        ].map((metric) => <article key={metric.label} className="ap-kpi"><div className="ap-kpi-top"><span className="ap-kpi-label">{metric.label}</span>{metric.icon}</div><p className="ap-kpi-value">{metric.value}</p><p className="ap-kpi-foot">{metric.detail}</p></article>)}
      </div>
      <SectionCard title="Daily forecast" description="Forecasts can change. Recheck before irrigation, spraying, harvesting or drying crops.">
        <div className="ap-table-wrap"><table className="ap-table"><caption>Forecast for {weather.locationLabel} · {weather.sourceProvider}</caption><thead><tr><th>Date</th><th>Conditions</th><th>Temperature range</th><th>Rain probability</th><th>Forecast rainfall</th><th>Wind</th></tr></thead><tbody>{weather.daily.map((day) => <tr key={day.date}><td>{day.dayLabel} · {day.date}</td><td>{day.condition}</td><td>{day.tempMinC}–{day.tempMaxC} °C</td><td>{day.rainProbPct}%</td><td>{day.expectedRainMm} mm</td><td>{day.windKmh} km/h</td></tr>)}</tbody></table></div>
      </SectionCard>
      <SectionCard title="Hourly outlook" description="Provider-defined hourly estimates; not observations from your connected hardware."><div className="weather-hour-grid">{weather.hourly.map((hour) => <article key={hour.time} className="ap-card ap-card--quiet"><p className="ap-help">{hour.time} IST</p><strong>{hour.tempC} °C</strong><p className="ap-help">{hour.condition}</p><p className="ap-help">{hour.rainProbPct}% chance of rain</p></article>)}</div></SectionCard>
      {!demo && <a href="https://www.weatherapi.com/" target="_blank" rel="noopener noreferrer" className="ap-btn ap-btn--ghost">Weather data by WeatherAPI.com <ExternalLink size={14} /></a>}
    </>}
  </div>;
};
