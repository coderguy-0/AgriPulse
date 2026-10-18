import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Tag,
  Store,
  FileCheck,
  Sprout,
  Users,
  ArrowLeft,
} from 'lucide-react';
import { AgriPulseLogo } from '../components/AgriPulseLogo';
import { AgriPulseLoader } from '../components/AgriPulseLoader';
import { useAgriPulse } from '../context/AgriPulseContext';

const BUSINESS_CATEGORIES = [
  'Seeds & Planting Material',
  'Fertilizers & Soil Nutrition',
  'Crop Protection & Bio-Pesticides',
  'Farm Machinery & Implements',
  'Micro-Irrigation & Hardware',
  'Organic Inputs & Bio-fertilizers',
  'General Agri Inputs & Safety Gear',
];

export const SellerSignUpPage: React.FC = () => {
  const { registerSeller } = useAgriPulse();
  const navigate = useNavigate();

  const [businessName, setBusinessName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [category, setCategory] = useState(BUSINESS_CATEGORIES[0]);
  const [gstin, setGstin] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!businessName.trim()) {
      setErrorMsg('Please enter your business or enterprise name.');
      return;
    }
    if (!contactPerson.trim()) {
      setErrorMsg('Please enter the contact person name.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Please enter a valid business email address.');
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
    if (!acceptTerms) {
      setErrorMsg('Please confirm you understand that the account is not identity-verified and does not enable marketplace sales or payouts.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerSeller({
        businessName: businessName.trim(),
        tradeName: tradeName.trim() || businessName.trim(),
        contactPerson: contactPerson.trim(),
        email: email.trim(),
        password,
        mobile: mobile.trim(),
        category,
        gstin: gstin.trim(),
        licenseNumber: licenseNumber.trim(),
        state,
        district,
        city,
        address,
        pincode,
      });

      if (res.ok) {
        navigate('/seller', { replace: true });
      } else {
        setErrorMsg(res.error || 'Registration failed. Please check your details.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-forest-950 text-white border-b border-forest-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AgriPulseLogo size="md" theme="light" />
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Seller Central
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Link
            to="/login"
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition shadow-sm"
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
      <main className="max-w-4xl mx-auto w-full px-4 py-8 sm:py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-forest-950 via-forest-900 to-forest-950 text-white p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2 border border-emerald-500/30">
                  <Store className="w-3.5 h-3.5" />
                  Agro-Business Partner Registration
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Register as an Agri-Input Seller
                </h1>
                <p className="mt-1.5 text-sm text-forest-200 max-w-xl">
                  Preview catalogue, order, and settlement workflows. Listings, verification, and payments require production services that are not connected in this prototype.
                </p>
              </div>


            </div>
          </div>

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
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
              <p>This creates a server-backed seller sign-in and business profile. Passwords are hashed by the API and are never saved in browser storage. This does not verify licenses, approve listings, establish a commercial agreement, or enable payments; email verification and account recovery are not configured yet. Use a unique password.</p>
            </div>

            {/* Section 1: Business Details */}
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                <Building2 className="w-4 h-4 text-emerald-600" />
                1. Enterprise & Contact Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Registered Business / Enterprise Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g., Karnal Kisan Agro Cooperative"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Trade / Store Display Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    placeholder="e.g., Karnal Agro Inputs & Seeds Mart"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Authorized Contact Person <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g., Rajesh Kumar Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Primary Business Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {BUSINESS_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Official Business Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seller@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mobile Number (SMS & WhatsApp Alerts) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="+91 94160 22345"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password <span className="text-rose-500">*</span></label>
                  <input type="password" required minLength={10} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 10 characters" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm password <span className="text-rose-500">*</span></label>
                  <input type="password" required minLength={10} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Enter the same password again" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
            </div>

            {/* Section 2: Statutory & Licensing */}
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                2. Licenses & Operating Mandi
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    GSTIN (Goods and Services Tax ID)
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="Enter only for a production verification flow"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Verification requires a secure backend and document review; this prototype does not verify tax or dealer credentials.
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Seed / Fertilizer Dealer License No.
                  </label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="Enter only for a production verification flow"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    State <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g., Haryana"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Operating District / Mandi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g., Karnal"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Warehouse / Dispatch Yard Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter only for a production registration flow"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div role="note" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
              <strong className="block text-slate-900">Seller verification is separate</strong>
              <span>This signup stores the seller profile but does not verify GSTIN or licenses. Do not enter bank account details here; settlement services are not connected.</span>
            </div>

            {/* Terms Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  I understand this creates a sign-in account and stores my seller profile but does not verify documents, approve listings, create a commercial agreement, or enable payouts.
                </span>
              </label>
            </div>

            <p className="text-xs leading-relaxed text-slate-600">Please read the <Link to="/terms" className="underline text-forest-800">terms of use</Link> and <Link to="/privacy" className="underline text-forest-800">privacy notice</Link> before creating your account.</p>
            {/* Form Actions */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                Already registered?{' '}
                <Link to="/login" className="text-emerald-700 font-bold hover:underline">
                  Sign in to Seller Central
                </Link>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold text-sm shadow-sm transition"
                >
                  <span>{isSubmitting ? 'Creating account…' : 'Create Seller Account'}</span>
                  {isSubmitting ? <AgriPulseLoader size="sm" className="agri-loader--button" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Bridge to Farmer Portal */}
        <div className="mt-8 rounded-2xl bg-emerald-50 border border-emerald-200 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-950">
                Are you a Farmer or Agricultural Grower?
              </h3>
              <p className="text-xs text-emerald-800">
                Access your crop digital twin, 100-disease documentary, weather intelligence, and
                order certified farm inputs.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Link
              to="/farmer/login"
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-sm whitespace-nowrap"
            >
              Farmer Sign In Portal →
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-slate-500 border-t border-slate-200">
        © 2026 AGRIPULSE Agro-Business & Seller Network. Designed for Agricultural Input Dealers,
        Cooperatives & Farmers.
      </footer>
    </div>
  );
};
