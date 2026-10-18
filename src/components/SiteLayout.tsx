import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { AgriPulseLogo } from './AgriPulseLogo';
import { useAgriPulse } from '../context/AgriPulseContext';

const PRIMARY_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/platform', label: 'Platform' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/technology', label: 'Technology' },
];
const SECONDARY_LINKS = [{ to: '/about', label: 'About' }];

const FOOTER_GROUPS: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { to: '/platform', label: 'Platform overview' },
      { to: '/ai-capabilities', label: 'AI capabilities' },
      { to: '/digital-twin', label: 'Digital farm twin' },
      { to: '/how-it-works', label: 'How it works' },
      { to: '/technology', label: 'Technology & data' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/about', label: 'About AGRIPULSE' },
      { to: '/impact', label: 'Innovation & impact' },
      { to: '/roadmap', label: 'Roadmap' },
      { to: '/contact', label: 'Contact' },
      { to: '/faq', label: 'FAQ' },
      { to: '/privacy', label: 'Privacy & your data' },
      { to: '/terms', label: 'Terms of use' },
    ],
  },
  {
    title: 'Get started',
    links: [
      { to: '/farmer/signup', label: 'Create a farmer account' },
      { to: '/farmer/login', label: 'Farmer sign in' },
      { to: '/seller/login', label: 'Seller / dealer sign in' },
      { to: '/seller/signup', label: 'Register as a seller' },
    ],
  },
];

/**
 * Chrome for every public page. Marketing pages stay visually related to the farmer portal: the
 * same palette, cards, radii and typography, with an informational layout instead of the sidebar.
 */
export const SiteLayout: React.FC = () => {
  const { session, sessionLoading } = useAgriPulse();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  const portalPath = session?.portalType === 'seller' ? '/seller' : '/home';

  return (
    <div className="ap-site">
      <a
        href="#site-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-bold"
      >
        Skip to content
      </a>

      <header className="ap-site-header">
        <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
          <Link to="/" className="shrink-0" aria-label="AGRIPULSE home">
            <AgriPulseLogo size="md" />
          </Link>

          <nav className="ap-site-nav ml-auto hidden lg:flex" aria-label="Public site navigation">
            {PRIMARY_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `ap-site-link${isActive ? ' is-active' : ''}`}
              >
                {link.label}
              </NavLink>
            ))}
            <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />
            {SECONDARY_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className={({ isActive }) => `ap-site-link${isActive ? ' is-active' : ''}`}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            {!sessionLoading && session ? (
              <Link to={portalPath} className="ap-btn ap-btn--primary">
                Open my portal <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link to="/farmer/login" className="ap-btn ap-btn--secondary hidden sm:inline-flex">
                  Sign in
                </Link>
                <Link to="/farmer/signup" className="ap-btn ap-btn--primary">
                  Create account
                </Link>
              </>
            )}
            <button
              type="button"
              className="ap-btn ap-btn--secondary ap-btn--sm lg:hidden"
              aria-expanded={mobileOpen}
              aria-controls="site-mobile-nav"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileOpen((value) => !value)}
            >
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        <nav
          id="site-mobile-nav"
          aria-label="Public site navigation (mobile)"
          className={`border-t border-slate-200 bg-white px-4 pb-4 lg:hidden ${mobileOpen ? 'block' : 'hidden'}`}
        >
          <div className="grid gap-1 pt-3 sm:grid-cols-2">
            {[...PRIMARY_LINKS, ...SECONDARY_LINKS].map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={'end' in link ? Boolean(link.end) : false}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2.5 text-sm font-semibold ${
                    isActive ? 'bg-forest-50 text-forest-900' : 'text-slate-700 hover:bg-slate-50'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 sm:grid-cols-2">
            <Link to="/farmer/login" className="ap-btn ap-btn--secondary ap-btn--block">
              Farmer sign in
            </Link>
            <Link to="/seller/login" className="ap-btn ap-btn--secondary ap-btn--block">
              Seller sign in
            </Link>
          </div>
        </nav>
      </header>

      <main id="site-main" className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="ap-site-footer">
        <div className="mx-auto grid w-full max-w-[1280px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <AgriPulseLogo size="md" theme="light" showTagline />
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-emerald-100/80">
              Intelligent farm digital twin and early crop-stress screening for Indian farms. Sensor monitoring, soil and crop
              intelligence, irrigation guidance and weather advisories in one workspace.
            </p>
            <p className="mt-4 text-[11px] leading-relaxed text-emerald-200/70">
              Development build: hardware integration, weather provider and AI services are configured by the operator. Sample
              data is always labelled as such inside the portal.
            </p>
          </div>
          {FOOTER_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300">{group.title}</h3>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.to + link.label}>
                    <Link to={link.to}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-emerald-900/60">
          <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-[11px] text-emerald-200/70 sm:px-6">
            <span>© {new Date().getFullYear()} AGRIPULSE. Prototype platform — not a certified agronomic advisory service.</span>
            <span>See more. Predict earlier. Grow smarter.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

interface SiteHeroProps {
  eyebrow: string;
  title: React.ReactNode;
  lead: React.ReactNode;
  bullets?: string[];
  primaryCta?: { to: string; label: string };
  secondaryCta?: { to: string; label: string };
  aside?: React.ReactNode;
}

export const SiteHero: React.FC<SiteHeroProps> = ({ eyebrow, title, lead, bullets, primaryCta, secondaryCta, aside }) => (
  <section className="ap-site-hero px-6 py-10 sm:px-10 sm:py-14">
    <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-center">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-900/40 px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-emerald-200">
          {eyebrow}
        </span>
        <h1 className="mt-4 max-w-3xl text-[clamp(28px,4vw,44px)] font-extrabold leading-[1.08] tracking-[-0.035em]">{title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-emerald-50/90 sm:text-[15px]">{lead}</p>
        {bullets && bullets.length > 0 && (
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2 text-[12.5px] text-emerald-50/90">
                <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-leaf-300" aria-hidden="true" />
                {bullet}
              </li>
            ))}
          </ul>
        )}
        {(primaryCta || secondaryCta) && (
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {primaryCta && (
              <Link
                to={primaryCta.to}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-forest-900 transition hover:bg-emerald-50"
              >
                {primaryCta.label} <ArrowRight size={14} />
              </Link>
            )}
            {secondaryCta && (
              <Link
                to={secondaryCta.to}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200/40 px-4 py-2.5 text-xs font-bold text-emerald-50 transition hover:bg-emerald-900/40"
              >
                {secondaryCta.label}
              </Link>
            )}
          </div>
        )}
      </div>
      {aside && <div>{aside}</div>}
    </div>
  </section>
);

export const SiteSection: React.FC<{
  id?: string;
  title: string;
  lead?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ id, title, lead, children, actions }) => (
  <section id={id} className="ap-site-section">
    <div className="ap-page-head">
      <div>
        <h2 className="ap-site-section-title">{title}</h2>
        {lead && <p className="ap-site-section-lead">{lead}</p>}
      </div>
      {actions && <div className="ap-page-actions">{actions}</div>}
    </div>
    {children}
  </section>
);
