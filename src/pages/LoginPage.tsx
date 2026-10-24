import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Store,
  Building2,
  Lock,
  Mail,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Sprout,
  ShieldCheck,
  TrendingUp,
  Package,
  Truck,
  ArrowLeft,
} from 'lucide-react';
import { AgriPulseLogo } from '../components/AgriPulseLogo';
import { AgriPulseLoader } from '../components/AgriPulseLoader';
import { useAgriPulse, DEMO_MODE_ENABLED, DEMO_FARMER_EMAIL, DEMO_SELLER_EMAIL, DEMO_PASSWORD } from '../context/AgriPulseContext';

export const LoginPage: React.FC = () => {
  const {
    session,
    loginWithCredentials,
    loginAsSellerDemo,
    loginAsFarmerDemo,
  } = useAgriPulse();

  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<'credentials' | 'farmer-demo' | 'seller-demo' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  // If already logged in, redirect to respective portal
  if (session) {
    const fromPath = (location.state as { from?: string } | null)?.from;
    if (fromPath) {
      return <Navigate to={fromPath} replace />;
    }
    return <Navigate to={session.portalType === 'seller' ? '/seller' : '/home'} replace />;
  }

  const validateFields = (emailVal: string, passVal: string) => {
    const errs: { email?: string; password?: string } = {};
    const trimmed = emailVal.trim();
    if (!trimmed) {
      errs.email = 'Please enter your registered seller or vendor email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      errs.email = 'Please enter a valid email address (e.g., seller@example.com).';
    }
    if (!passVal) {
      errs.password = 'Please enter your account password.';
    } else if (passVal.length < 10) {
      errs.password = 'Password must be at least 10 characters.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSellerLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg(null);
    if (!validateFields(email, password)) return;

    setIsSubmitting(true);
    setSubmittingAction('credentials');
    try {
      const res = await loginWithCredentials(email, password, rememberMe, 'seller');
      if (res.ok) {
        navigate(res.portal === 'seller' ? '/seller' : '/home', { replace: true });
      } else {
        setErrorMsg(res.error || 'Invalid credentials.');
      }
    } finally {
      setIsSubmitting(false);
      setSubmittingAction(null);
    }
  };

  const handleInstantDemoSeller = async () => {
    setIsSubmitting(true);
    setSubmittingAction('seller-demo');
    setErrorMsg(null);
    try {
      const res = await loginAsSellerDemo();
      if (res.ok) {
        navigate('/seller', { replace: true });
      } else {
        setErrorMsg(res.error || 'Could not open the development seller workspace.');
      }
    } finally {
      setIsSubmitting(false);
      setSubmittingAction(null);
    }
  };

  const handleInstantDemoFarmer = async () => {
    setIsSubmitting(true);
    setSubmittingAction('farmer-demo');
    setErrorMsg(null);
    try {
      const res = await loginAsFarmerDemo();
      if (res.ok) {
        navigate('/home', { replace: true });
      } else {
        setErrorMsg(res.error || 'Could not open the development farmer workspace.');
      }
    } finally {
      setIsSubmitting(false);
      setSubmittingAction(null);
    }
  };



  return (
    <div className="login-page min-h-screen bg-warmbg flex flex-col justify-between text-slate-900">
      {/* Top Header */}
      <header className="login-header bg-white border-b border-forest-100 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AgriPulseLogo size="md" theme="dark" />
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Store className="w-3.5 h-3.5" />
            Seller Central
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Link
            to="/farmer/login"
            className="px-3 py-1.5 rounded-xl bg-forest-900 hover:bg-forest-800 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 transition flex items-center gap-1.5 font-medium"
          >
            <Sprout className="w-3.5 h-3.5" />
            <span>Farmer Portal Sign In</span>
          </Link>
          <Link
            to="/signup"
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-sm"
          >
            Register Seller Account
          </Link>
        </div>
          <Link
            to="/"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-forest-800 hover:text-forest-950 hover:bg-forest-50 border border-transparent hover:border-forest-200 font-medium transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Website home</span>
          </Link>
      </header>

      {/* Main Split Section */}
      <main className="login-main max-w-6xl mx-auto w-full px-4 py-8 sm:py-10 flex-1 grid grid-cols-1 lg:grid-cols-2 items-stretch gap-6 lg:gap-8">
        {/* Left Hero Card */}
        <div className="login-story space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>AGRIPULSE Seller Portal</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Seller Central Sign In
          </h1>

          <p className="text-base text-slate-300 leading-relaxed">
            Sign in to your server-backed seller account. Catalog, order, and settlement screens currently contain sample workflows; seller verification, shipping, payments, and payouts are not connected.
          </p>

          {/* Value Props for Sellers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="rounded-2xl bg-forest-900/60 border border-forest-800 p-4">
              <Package className="w-5 h-5 text-emerald-400 mb-2" />
              <h2 className="text-xs font-bold text-white">Catalog tools preview</h2>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Demo listings only; not published to a live store
              </p>
            </div>
            <div className="rounded-2xl bg-forest-900/60 border border-forest-800 p-4">
              <Truck className="w-5 h-5 text-emerald-400 mb-2" />
              <h2 className="text-xs font-bold text-white">Order workflow preview</h2>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Simulated dispatch and invoice views
              </p>
            </div>
            <div className="rounded-2xl bg-forest-900/60 border border-forest-800 p-4">
              <TrendingUp className="w-5 h-5 text-emerald-400 mb-2" />
              <h2 className="text-xs font-bold text-white">Settlement tools preview</h2>
              <p className="text-[11px] text-slate-300 mt-0.5">
                No bank or payment connection is active
              </p>
            </div>
          </div>

          {/* Bridge to Farmer Portal */}
          <div className="rounded-2xl bg-emerald-950/70 border border-emerald-800/60 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sprout className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Are you a Farmer?</p>
                <p className="text-[11px] text-emerald-200">
                  Access crop stress digital twin, 100-disease encyclopedia & weather alerts.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {DEMO_MODE_ENABLED && <button
                type="button"
                onClick={handleInstantDemoFarmer}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-emerald-200 text-xs font-semibold border border-emerald-700 transition"
              >
                Farmer Demo
              </button>}
              <Link
                to="/farmer/login"
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition whitespace-nowrap"
              >
                Farmer Sign In →
              </Link>
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="login-form-wrap">
          <div className="login-form-card bg-white rounded-3xl shadow-xl border border-slate-200 text-slate-900 p-6 sm:p-8">
            {/* Top Primary Demo Account Access */}
            {DEMO_MODE_ENABLED && (
              <div className="mb-6 pb-6 border-b border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Demo Accounts
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Ready for immediate testing</span>
                </div>

                <div className="space-y-2.5">
                  {/* Seller Demo Card */}
                  <div className="p-3 rounded-2xl bg-forest-50/70 border border-forest-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="text-xs font-bold text-forest-950">Seller Demo Account</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1 flex flex-wrap items-center gap-2">
                        <span>Email: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800 font-mono text-[10px]">{DEMO_SELLER_EMAIL}</code></span>
                        <span>Pass: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800 font-mono text-[10px]">{DEMO_PASSWORD}</code></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEmail(DEMO_SELLER_EMAIL);
                          setPassword(DEMO_PASSWORD);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 transition"
                      >
                        Fill
                      </button>
                      <button
                        type="button"
                        onClick={handleInstantDemoSeller}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-forest-950 hover:bg-forest-900 text-white text-xs font-bold transition shadow-xs"
                      >
                        {submittingAction === 'seller-demo' ? <AgriPulseLoader size="sm" className="agri-loader--button" /> : <Store className="w-3.5 h-3.5 text-emerald-400" />}
                        <span>Use Seller Demo</span>
                      </button>
                    </div>
                  </div>

                  {/* Farmer Demo Card */}
                  <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Sprout className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="text-xs font-bold text-emerald-950">Farmer Demo Account</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1 flex flex-wrap items-center gap-2">
                        <span>Email: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800 font-mono text-[10px]">{DEMO_FARMER_EMAIL}</code></span>
                        <span>Pass: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800 font-mono text-[10px]">{DEMO_PASSWORD}</code></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEmail(DEMO_FARMER_EMAIL);
                          setPassword(DEMO_PASSWORD);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 transition"
                      >
                        Fill
                      </button>
                      <button
                        type="button"
                        onClick={handleInstantDemoFarmer}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                      >
                        {submittingAction === 'farmer-demo' ? <AgriPulseLoader size="sm" className="agri-loader--button" /> : <Sprout className="w-3.5 h-3.5 text-amber-300" />}
                        <span>Use Farmer Demo</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Standard Seller Sign In Form */}
            <form onSubmit={handleSellerLogin} className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Seller account sign-in
              </div>

              {errorMsg && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-2.5 text-rose-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Authentication Notice:</span> {errorMsg}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business / Seller Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                    }}
                    placeholder="seller@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Portal Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors({ ...fieldErrors, password: undefined });
                      }
                    }}
                    placeholder="Enter password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.password}</p>
                )}
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span className="text-slate-600">Keep me logged in</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-forest-950 hover:bg-forest-900 text-white font-bold text-sm transition shadow-sm"
              >
                <span>{submittingAction === 'credentials' ? 'Accessing portal…' : 'Sign In to Seller Central'}</span>
                {submittingAction === 'credentials' ? <AgriPulseLoader size="sm" className="agri-loader--button" /> : <ArrowRight className="w-4 h-4 text-emerald-400" />}
              </button>
            </form>

            <div className="auth-security-note mt-5">
              <ShieldCheck className="w-4 h-4" />
              <p>{DEMO_MODE_ENABLED
                ? 'Account sign-in uses the AGRIPULSE API. Development demo access uses one-click launchers above; no shared password is embedded in this page.'
                : 'Sign-in is handled by the AGRIPULSE API. Email verification, password recovery, seller verification, and payout services are not configured here.'}</p>
            </div>

            {/* Bottom Links */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <Link to="/signup" className="text-emerald-700 font-bold hover:underline">
                New Agro-Seller? Register Account
              </Link>
              <Link to="/farmer/login" className="text-slate-700 font-semibold hover:underline">
                Farmer Sign In Portal →
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-slate-400 border-t border-slate-800 bg-forest-950">
        © 2026 AGRIPULSE Seller Portal. Catalog, order, and payout workflows are demonstrations.
      </footer>
    </div>
  );
};
