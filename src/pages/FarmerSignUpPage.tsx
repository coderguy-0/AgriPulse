import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sprout,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Tractor,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import { AgriPulseLogo } from '../components/AgriPulseLogo';
import { AgriPulseLoader } from '../components/AgriPulseLoader';
import { useAgriPulse } from '../context/AgriPulseContext';

export const FarmerSignUpPage: React.FC = () => {
  const { registerFarmer } = useAgriPulse();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [village, setVillage] = useState('');
  const [primaryCrop, setPrimaryCrop] = useState('');
  const [landArea, setLandArea] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 10) {
      setErrorMsg('Create a password with at least 10 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('The password confirmation does not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerFarmer({
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        password,
        state: state.trim(),
        district: district.trim(),
        village: village.trim(),
        primaryCrop,
        landArea,
      });

      if (res.ok) {
        navigate('/home', { replace: true });
      } else {
        setErrorMsg(res.error || 'Unable to register farmer profile.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="min-h-screen bg-warmbg flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-forest-950 text-white border-b border-forest-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AgriPulseLogo size="md" theme="light" />
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-leaf-500/20 text-leaf-300 border border-leaf-500/30">
            Farmer Portal
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Link
            to="/farmer/login"
            className="px-3.5 py-1.5 rounded-lg bg-leaf-600 hover:bg-leaf-500 text-white font-medium transition shadow-sm"
          >
            Already Registered? Sign In
          </Link>
        </div>
          <Link
            to="/"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-forest-100 hover:text-white bg-forest-900 hover:bg-forest-800 border border-forest-700 font-medium transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Website home</span>
          </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto w-full px-4 py-8 sm:py-10">
        <div className="bg-white rounded-3xl shadow-sm border border-forest-100 overflow-hidden">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-forest-950 via-forest-900 to-forest-950 text-white p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-leaf-500/20 text-leaf-300 text-xs font-semibold mb-2 border border-leaf-500/30">
                  <Sprout className="w-3.5 h-3.5" />
                  Farmer Digital Twin Profile
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Register as a Farmer
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-forest-200">
                  Setup your farm plots, track soil and weather conditions, and get localized disease advisories.
                </p>
              </div>


            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
            {errorMsg && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3 text-rose-800 text-sm">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Unable to register</p>
                  <p className="text-rose-700 mt-0.5">{errorMsg}</p>
                </div>
              </div>
            )}

            <div role="note" className="auth-security-note">
              <ShieldCheck className="w-4 h-4" />
              <p>This creates a server-backed farmer account and profile. Passwords are hashed by the API and are never saved in browser storage. Email verification and account recovery are not configured yet; use a unique password you do not use elsewhere.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-forest-900 mb-1.5">
                  Farmer Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Harish Patel"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-forest-200 text-forest-950 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-forest-900 mb-1.5">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+91 98124 56780"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-forest-200 text-forest-950 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-forest-900 mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="farmer@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-forest-200 text-forest-950 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-forest-900 mb-1.5">
                  Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={10}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 10 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-forest-200 text-forest-950 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-forest-900 mb-1.5">
                  Confirm password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={10}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Enter the same password again"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-forest-200 text-forest-950 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-forest-900 mb-1.5">
                  Primary Crop
                </label>
                <select
                  value={primaryCrop}
                  onChange={(e) => setPrimaryCrop(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-forest-200 text-forest-950 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500 bg-white"
                >
                  <option value="" disabled>Select a crop (optional)</option>
                  <option value="Wheat">Wheat (Rabi)</option>
                  <option value="Rice (Paddy)">Rice / Paddy (Kharif)</option>
                  <option value="Cotton">Cotton</option>
                  <option value="Sugarcane">Sugarcane</option>
                  <option value="Mustard">Mustard</option>
                  <option value="Vegetables">Horticulture & Vegetables</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-forest-900 mb-1.5">State</label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g., Haryana"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-forest-200 text-forest-950 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-forest-900 mb-1.5">
                  District
                </label>
                <input
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g., Karnal"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-forest-200 text-forest-950 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-forest-900 mb-1.5">
                  Village / Tehsil
                </label>
                <input
                  type="text"
                  required
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="e.g., Taraori"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-forest-200 text-forest-950 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-forest-900 mb-1.5">
                  Total Landholding (Acres)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={landArea}
                  onChange={(e) => setLandArea(e.target.value)}
                  placeholder="6.5"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-forest-200 text-forest-950 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500"
                />
              </div>

            </div>

            <div className="pt-4 border-t border-forest-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-forest-600">
                Already registered?{' '}
                <Link to="/farmer/login" className="text-leaf-700 font-bold hover:underline">
                  Sign In to Farmer Portal
                </Link>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-forest-950 hover:bg-forest-900 text-white font-bold text-sm shadow-sm transition"
                >
                  <span>{isSubmitting ? 'Creating account…' : 'Create Farmer Account'}</span>
                  {isSubmitting ? <AgriPulseLoader size="sm" className="agri-loader--button" /> : <ArrowRight className="w-4 h-4 text-leaf-400" />}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-forest-600 border-t border-forest-100">
        © 2026 AGRIPULSE Agricultural Intelligence.
      </footer>
    </div>
  );
};
