import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCog,
  Save,
  RotateCcw,
  LogOut,
  CheckCircle2,
  ShieldAlert,
  Bell,
  Database,
} from 'lucide-react';
import { DEMO_ACCOUNT_EMAIL, useAgriPulse } from '../context/AgriPulseContext';
import { AreaUnit, LanguageCode } from '../types';
import { REGIONAL_BIGHA_FACTORS } from '../utils/formatters';

export const AccountSettingsPage: React.FC = () => {
  const {
    session,
    profile,
    updateProfile,
    farms,
    logout,
    resetAllDemoData,
    workspaceSyncStatus,
    workspaceSyncError,
  } = useAgriPulse();

  const navigate = useNavigate();

  const [name, setName] = useState(profile.name);
  const [mobile, setMobile] = useState(profile.mobile);
  const [state, setState] = useState(profile.state);
  const [district, setDistrict] = useState(profile.district);
  const [village, setVillage] = useState(profile.village);

  const [language, setLanguage] = useState<LanguageCode>(profile.preferences.language);
  const [preferredAreaUnit, setPreferredAreaUnit] = useState<AreaUnit>(
    profile.preferences.preferredAreaUnit
  );
  const [bighaToAcreFactor, setBighaToAcreFactor] = useState<number>(
    profile.preferences.bighaToAcreFactor
  );
  const [defaultFarmId, setDefaultFarmId] = useState(profile.preferences.defaultFarmId);
  const [defaultCrop, setDefaultCrop] = useState(profile.preferences.defaultCrop);
  const [weatherState, setWeatherState] = useState(
    profile.preferences.weatherLocation.state
  );
  const [weatherDistrict, setWeatherDistrict] = useState(
    profile.preferences.weatherLocation.district
  );
  const [weatherLocality, setWeatherLocality] = useState(
    profile.preferences.weatherLocation.locality
  );

  const [notifications, setNotifications] = useState(profile.preferences.notifications);

  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedBigha = REGIONAL_BIGHA_FACTORS.find(
      (r) => r.bighaToAcre === bighaToAcreFactor
    );

    updateProfile({
      ...profile,
      name: name.trim() || profile.name,
      mobile: mobile.trim() || profile.mobile,
      state: state.trim() || profile.state,
      district: district.trim() || profile.district,
      village: village.trim() || profile.village,
      preferences: {
        language,
        preferredAreaUnit,
        bighaToAcreFactor,
        bighaRegionLabel:
          matchedBigha?.label || profile.preferences.bighaRegionLabel,
        defaultFarmId,
        defaultCrop: defaultCrop.trim() || 'Wheat',
        weatherLocation: {
          ...profile.preferences.weatherLocation,
          state: weatherState.trim() || state.trim(),
          district: weatherDistrict.trim() || district.trim(),
          locality: weatherLocality.trim() || village.trim(),
        },
        notifications,
      },
    });

    setSavedBanner('Profile and preferences updated. The authenticated workspace is syncing to the AGRIPULSE API.');
    setTimeout(() => setSavedBanner(null), 4000);
  };

  const handleConfirmReset = () => {
    resetAllDemoData();
    setShowResetConfirm(false);
    setSavedBanner(
      'The development demo workspace was restored to its initial sample data. Device registry records are unchanged; check the save status before leaving.'
    );
    setTimeout(() => setSavedBanner(null), 5000);
  };

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/farmer/login', { replace: true });
    } catch {
      // The context keeps the session active and displays a server-logout error.
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Demo Account Profile Badge Banner */}
      <div className="bg-forest-900 text-white rounded-2xl p-5 shadow-sm border border-forest-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-leaf-500/20 text-leaf-300 border border-leaf-400/30 text-[11px] font-bold mb-1.5">
            <span>Farmer Account Profile</span>
          </div>
          <h2 className="text-xl font-extrabold">{profile.name}</h2>
          <p className="text-xs text-forest-200 mt-0.5">
            {profile.isDemoAccount ? 'Development demo profile · ' : 'Authenticated farmer profile · '}{profile.email}. Passwords are server-hashed; no device secret is exposed to this page.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-800/80 hover:bg-red-700 text-white text-xs font-bold border border-red-600/50 transition-colors self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out of AGRIPULSE</span>
        </button>
      </div>

      {savedBanner && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-leaf-50 border border-leaf-300 text-forest-950 text-xs font-bold flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-leaf-600 shrink-0" />
          <span>{savedBanner}</span>
        </div>
      )}

      {/* Main Profile & Preferences Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Personal & Location Details (6 cols) */}
          <section className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <UserCog className="w-4 h-4 text-forest-700" />
              <span>Farmer Profile Details</span>
            </h3>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Farmer Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Account Email Address (Read-Only in this Prototype)
              </label>
              <input
                type="email"
                readOnly
                value={profile.email || DEMO_ACCOUNT_EMAIL}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-mono cursor-not-allowed"
              />
              <span className="text-[11px] text-slate-500 block mt-1">
                Password authentication is handled by the production API when connected. Demo access is available only in the development workspace.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mobile Number
              </label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">District</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Village</label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>
          </section>

          {/* Farm Units, Language & Defaults (6 cols) */}
          <section className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
              Measurement Units, Language & Defaults
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Preferred Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Preferred Area Measurement Unit
                </label>
                <select
                  value={preferredAreaUnit}
                  onChange={(e) => setPreferredAreaUnit(e.target.value as AreaUnit)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
                >
                  <option value="acre">Acre</option>
                  <option value="hectare">Hectare</option>
                  <option value="bigha">Bigha (Regional)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Regional Bigha-to-Acre Conversion Factor
              </label>
              <select
                value={bighaToAcreFactor}
                onChange={(e) => setBighaToAcreFactor(parseFloat(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
              >
                {REGIONAL_BIGHA_FACTORS.map((r) => (
                  <option key={r.id} value={r.bighaToAcre}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Default Active Farm
                </label>
                <select
                  value={defaultFarmId}
                  onChange={(e) => setDefaultFarmId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                >
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Default Crop
                </label>
                <input
                  type="text"
                  value={defaultCrop}
                  onChange={(e) => setDefaultCrop(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Weather State
                </label>
                <input
                  type="text"
                  value={weatherState}
                  onChange={(e) => setWeatherState(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Weather District
                </label>
                <input
                  type="text"
                  value={weatherDistrict}
                  onChange={(e) => setWeatherDistrict(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Weather Locality
                </label>
                <input
                  type="text"
                  value={weatherLocality}
                  onChange={(e) => setWeatherLocality(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Notification Preferences & Custom Brand Logo */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
          <section className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Bell className="w-4 h-4 text-forest-700" />
              <span>Notification Preferences</span>
            </h3>

            {[
              {
                key: 'weatherAlerts' as const,
                label: 'Weather & Heavy Rainfall Advisories',
              },
              {
                key: 'irrigationReminders' as const,
                label: 'Plot Irrigation & Moisture Reminders',
              },
              {
                key: 'cropInspectionAlerts' as const,
                label: 'Crop Health & Plant Pathology Advisories',
              },
              {
                key: 'orderUpdates' as const,
                label: 'Store Demo Order Status Updates',
              },
              {
                key: 'schemeUpdates' as const,
                label: 'Government Scheme Seasonal Reminders',
              },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer"
              >
                <span className="font-semibold text-slate-800">{item.label}</span>
                <input
                  type="checkbox"
                  checked={notifications[item.key]}
                  onChange={(e) =>
                    setNotifications({ ...notifications, [item.key]: e.target.checked })
                  }
                  className="rounded border-slate-300 text-forest-800"
                />
              </label>
            ))}
          </section>

          <section className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-forest-700" />
              <span>Workspace persistence & data safety</span>
            </h3>

            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                <span>{session?.isDemo ? 'Development demo data' : 'Account workspace data'}</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                {session?.isDemo
                  ? 'Farm, profile, observation and sample commerce changes sync to this development server’s SQLite workspace. This is not a production service or a verified agricultural record. Device metadata, pairing events and telemetry are stored separately by the authenticated API; sample devices do not prove physical installation.'
                  : 'Farm, profile, observation and workspace commerce changes sync to the authenticated AGRIPULSE API. This development deployment uses local SQLite persistence, not a managed production database. Device metadata, pairing events and physical telemetry are stored separately and are never kept in browser storage.'}{' '}
                Browser storage is development-only and may contain non-sensitive drafts or cached demo UI data. Never enter network passwords, provisioning tokens, SIM PINs, private keys, bank credentials, or real payment details. Weather forecasts and crop-health content are not a substitute for professional advice.
              </p>
            </div>
            {(workspaceSyncError || workspaceSyncStatus === 'saving') && (
              <p role={workspaceSyncError ? 'alert' : 'status'} className="text-xs font-semibold text-amber-900">
                {workspaceSyncError ? `Workspace sync issue: ${workspaceSyncError}` : 'Saving workspace changes to the server…'}
              </p>
            )}
          </section>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          {import.meta.env.DEV && session?.isDemo && <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 text-xs font-bold"
          >
            <RotateCcw className="w-4 h-4 text-amber-700" />
            <span>Reset Development Demo Data</span>
          </button>}

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-extrabold shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>Save Profile & Preferences</span>
          </button>
        </div>
      </form>

      {/* Accessible Confirmation Dialog for Resetting Demo Data */}
      {showResetConfirm && (
        <div
          role="alertdialog"
          aria-labelledby="demo-reset-title"
          className="bg-red-50 border-2 border-red-400 rounded-2xl p-5 space-y-3 text-xs text-red-950"
        >
          <h4 className="text-sm font-extrabold">
            <span id="demo-reset-title">Reset development demo workspace?</span>
          </h4>
          <p className="leading-relaxed">
            This action restores the demo account workspace to its initial sample dataset:
            <strong>
              {' '}
              Farms, plots, crop records, observations, activities, disease reports, bookmarks, cart, wishlist, and sample orders.
            </strong>{' '}
            Device registry records are not reset. Your active demo login session remains signed in.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowResetConfirm(false)}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 font-bold"
            >
              Cancel — Keep My Changes
            </button>
            <button
              type="button"
              onClick={handleConfirmReset}
              className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold"
            >
              Yes, Reset Demo Data Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
