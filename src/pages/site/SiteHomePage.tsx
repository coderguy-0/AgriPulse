import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CloudSun,
  Cpu,
  Database,
  Droplets,
  Gauge,
  Layers,
  Map as MapIcon,
  RadioTower,
  ShieldCheck,
  Sprout,
  Stethoscope,
  Wifi,
} from 'lucide-react';
import { SiteHero, SiteSection } from '../../components/SiteLayout';
import { SectionCard, StatusBadge, ProvenanceTag, Notice } from '../../components/ui/primitives';
import { HOW_IT_WORKS_STEPS, HONESTY_POINTS, PLATFORM_MODULES } from '../../data/siteContent';

const MODULE_ICONS: Record<string, React.ReactNode> = {
  dashboard: <Gauge size={16} />,
  monitoring: <RadioTower size={16} />,
  twin: <MapIcon size={16} />,
  irrigation: <Droplets size={16} />,
  soil: <Layers size={16} />,
  'crop-health': <Stethoscope size={16} />,
  weather: <CloudSun size={16} />,
  assistant: <Bot size={16} />,
  devices: <Wifi size={16} />,
  alerts: <ShieldCheck size={16} />,
  reports: <Database size={16} />,
};

const STATUS_LABEL: Record<string, { label: string; tone: 'ok' | 'warn' | 'info' | 'muted' }> = {
  available: { label: 'Working now', tone: 'ok' },
  demonstration: { label: 'Demonstration', tone: 'info' },
  planned: { label: 'Planned', tone: 'muted' },
  not_configured: { label: 'Needs configuration', tone: 'warn' },
};

export const SiteHomePage: React.FC = () => (
  <div className="ap-stack" style={{ gap: 34 }}>
    <SiteHero
      eyebrow="Intelligent farm digital twin"
      title={
        <>
          See more. Predict earlier.<br />
          <span className="text-leaf-300">Grow smarter.</span>
        </>
      }
      lead={
        <>
          AGRIPULSE connects IoT soil and crop sensors, a digital twin of your fields, transparent crop-stress screening,
          irrigation guidance and weather advisories into one farmer workspace — and labels clearly what is measured, what is
          forecast and what still needs a field visit.
        </>
      }
      bullets={[
        'Live sensor monitoring with honest data-status labels',
        'Per-zone irrigation guidance with the evidence shown',
        'Early crop-stress screening against published bands',
        'Device registry with secure pairing and audit history',
      ]}
      primaryCta={{ to: '/farmer/signup', label: 'Create a farmer account' }}
      secondaryCta={{ to: '/platform', label: 'Explore the platform' }}
      aside={
        <figure className="overflow-hidden rounded-2xl border border-emerald-300/20 bg-emerald-950/30">
          <img
            src="/images/agripulse-field-hero.jpg"
            alt="Illustration of a farm with sensor nodes in three plots sending readings to an AGRIPULSE dashboard card"
            className="h-full w-full object-cover"
            loading="eager"
            width={1365}
            height={768}
          />
          <figcaption className="px-4 py-3 text-[11px] leading-relaxed text-emerald-100/80">
            Conceptual illustration: sensors post readings to the AGRIPULSE API, where a zone-level digital twin is built from
            field records. It is not a satellite image of your farm.
          </figcaption>
        </figure>
      }
    />

    <div className="ap-grid ap-grid--metrics">
      {[
        { label: 'Field zones modelled', value: 'Unlimited', note: 'Every plot you record becomes a zone', icon: <Layers size={15} /> },
        { label: 'Sensor types supported', value: '8', note: 'Moisture, temperature, pH, light, NPK, battery, standing water, air', icon: <Cpu size={15} /> },
        { label: 'Data provenance tags', value: '4', note: 'Measured · recorded · forecast · sample', icon: <BadgeCheck size={15} /> },
        { label: 'Farmer-facing modules', value: '14', note: 'One design language across every screen', icon: <Sprout size={15} /> },
      ].map((item) => (
        <article key={item.label} className="ap-kpi">
          <div className="ap-kpi-top">
            <span className="ap-kpi-label">{item.label}</span>
            <span className="ap-kpi-icon" aria-hidden="true">{item.icon}</span>
          </div>
          <p className="ap-kpi-value">{item.value}</p>
          <p className="ap-kpi-foot">{item.note}</p>
        </article>
      ))}
    </div>

    <SiteSection
      title="One workspace for the whole farm"
      lead="Each module answers one question a farmer actually asks during the season. They share the same design language, the same data and the same honesty rules about where a number came from."
      actions={<Link className="ap-btn ap-btn--secondary" to="/platform">Platform detail <ArrowRight size={14} /></Link>}
    >
      <div className="ap-grid">
        {PLATFORM_MODULES.slice(0, 9).map((module) => (
          <article key={module.id} className="ap-site-feature">
            <div className="ap-row ap-row--between">
              <span className="ap-kpi-icon" aria-hidden="true">{MODULE_ICONS[module.id]}</span>
              <StatusBadge tone={STATUS_LABEL[module.status].tone}>{STATUS_LABEL[module.status].label}</StatusBadge>
            </div>
            <h3>{module.name}</h3>
            <p>{module.summary}</p>
            <p className="ap-help" style={{ marginTop: 'auto' }}>{module.statusNote}</p>
          </article>
        ))}
      </div>
    </SiteSection>

    <SiteSection
      title="How AGRIPULSE works"
      lead="Five steps from an empty account to decisions you can defend, with the data quality rules applied at each step."
      actions={<Link className="ap-btn ap-btn--secondary" to="/how-it-works">Read the flow <ArrowRight size={14} /></Link>}
    >
      <div className="ap-grid ap-grid--two">
        {HOW_IT_WORKS_STEPS.map((step) => (
          <article key={step.step} className="ap-card">
            <div className="ap-row" style={{ gap: 12 }}>
              <span
                className="ap-numeric"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: 'var(--ap-green-soft)',
                  color: 'var(--ap-green-strong)',
                  fontWeight: 800,
                  fontSize: 13,
                }}
                aria-hidden="true"
              >
                {step.step}
              </span>
              <h3 className="ap-card-title">{step.title}</h3>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 12, lineHeight: 1.7, color: 'var(--ap-text-muted)' }}>{step.body}</p>
            <div className="ap-card-foot">
              <span className="ap-help">{step.outcome}</span>
            </div>
          </article>
        ))}
      </div>
    </SiteSection>

    <SectionCard
      title="Transparency is a feature, not a disclaimer"
      description="Every screen in AGRIPULSE distinguishes what the platform measured from what it inferred. These are the rules the interface is built on."
      icon={<ShieldCheck size={16} />}
    >
      <div className="ap-grid ap-grid--two">
        {HONESTY_POINTS.map((point) => (
          <div key={point.title} className="ap-card ap-card--quiet">
            <h3 className="ap-card-title" style={{ fontSize: 13 }}>
              <BadgeCheck size={15} />
              {point.title}
            </h3>
            <p style={{ margin: '8px 0 0', fontSize: 11.5, lineHeight: 1.7, color: 'var(--ap-text-muted)' }}>{point.body}</p>
          </div>
        ))}
      </div>
      <p className="ap-help" style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        Example of how values are labelled in the portal:
        <ProvenanceTag kind="measured" />
        <ProvenanceTag kind="recorded" />
        <ProvenanceTag kind="forecast" />
        <ProvenanceTag kind="demo" />
      </p>
    </SectionCard>

    <SiteSection
      title="Built for the realities of Indian farming"
      lead="Small and marginal holdings, mixed cropping, canal and tube-well scheduling, patchy connectivity, and a farmer who needs an answer in the field — not a data science lecture."
    >
      <div className="ap-grid ap-grid--two">
        {[
          {
            title: 'Works with or without hardware',
            body: 'Manual observations keep the twin, soil and crop-health modules useful while sensors are being installed — and stay in the record afterwards.',
            icon: <Sprout size={16} />,
          },
          {
            title: 'Honest about connectivity',
            body: 'The portal shows when a reading is stale or a request failed, and lets you retry, rather than displaying a confident-looking stale number.',
            icon: <Wifi size={16} />,
          },
          {
            title: 'Mobile-first operation',
            body: 'A drawer navigation, bottom bar and touch-sized controls make the workspace usable on a phone in bright sun or with wet hands.',
            icon: <Gauge size={16} />,
          },
          {
            title: 'Role-aware access',
            body: 'Farm data is scoped to the authenticated account. Seller workspaces cannot read farmer device data, and ownership is enforced by the API.',
            icon: <ShieldCheck size={16} />,
          },
        ].map((item) => (
          <article key={item.title} className="ap-site-feature">
            <span className="ap-kpi-icon" aria-hidden="true">{item.icon}</span>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
    </SiteSection>

    <SectionCard variant="tint" title="Start with your own farm record" icon={<Sprout size={16} />}>
      <div className="ap-row ap-row--between" style={{ gap: 16 }}>
        <p style={{ margin: 0, maxWidth: '70ch', fontSize: 12.5, lineHeight: 1.75, color: 'var(--ap-text-muted)' }}>
          Create an account, add one farm and one plot, and the dashboard, twin, soil, irrigation, alerts and reports modules
          will immediately reflect your own records. In this development build you can also launch a clearly labelled demo
          workspace to explore the interface without entering real farm details.
        </p>
        <div className="ap-row">
          <Link className="ap-btn ap-btn--secondary" to="/farmer/login">Farmer sign in</Link>
          <Link className="ap-btn ap-btn--primary" to="/farmer/signup">
            Create account <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </SectionCard>

    <Notice tone="neutral" title="Prototype status.">
      This is a development build of AGRIPULSE: a complete farmer-facing product surface with a local API, honest data states and
      clearly labelled sample content. It is not a certified agronomic advisory service, and hardware, weather and AI services
      depend on operator configuration.
    </Notice>
  </div>
);
