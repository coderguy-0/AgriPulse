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
  Flag,
  Gauge,
  GitBranch,
  GraduationCap,
  Layers,
  Leaf,
  Map as MapIcon,
  RadioTower,
  Rocket,
  Ruler,
  ShieldCheck,
  Sprout,
  Target,
  Users,
  Wifi,
} from 'lucide-react';
import { SiteHero, SiteSection } from '../../components/SiteLayout';
import {
  SectionCard,
  StatusBadge,
  ProvenanceTag,
  Notice,
  KeyValueList,
  Tabs,
  EmptyState,
} from '../../components/ui/primitives';
import {
  CAPABILITIES,
  HONESTY_POINTS,
  HOW_IT_WORKS_STEPS,
  IMPACT_AREAS,
  PLATFORM_MODULES,
  ROADMAP_STAGES,
  TECHNOLOGY_STACK,
} from '../../data/siteContent';

const STATUS_TONE: Record<string, { label: string; tone: 'ok' | 'warn' | 'info' | 'muted' }> = {
  available: { label: 'Available in this build', tone: 'ok' },
  demonstration: { label: 'Demonstration logic', tone: 'info' },
  planned: { label: 'Planned — not implemented', tone: 'muted' },
  not_configured: { label: 'Needs operator configuration', tone: 'warn' },
};

const StatusPill: React.FC<{ status: string }> = ({ status }) => (
  <StatusBadge tone={STATUS_TONE[status]?.tone || 'muted'}>{STATUS_TONE[status]?.label || status}</StatusBadge>
);

/* ---------------------------------------------------------------------------
   Platform
   ------------------------------------------------------------------------- */

export const PlatformPage: React.FC = () => (
  <div className="ap-stack" style={{ gap: 32 }}>
    <SiteHero
      eyebrow="Platform"
      title="Every module your season needs, in one consistent workspace"
      lead="AGRIPULSE is organised around the questions farmers ask: what is my field doing right now, what needs attention, what should I do next, and what did I record last time."
      bullets={[
        'Fourteen farmer modules sharing one design system',
        'Provenance labelled on every value shown',
        'Works with sensors, manual records, or both',
        'Reports and CSV export from the same data the screen shows',
      ]}
      primaryCta={{ to: '/farmer/signup', label: 'Create account' }}
      secondaryCta={{ to: '/technology', label: 'Technology & data' }}
    />

    <SiteSection title="Module catalog" lead="Each card states what the module does today and what it still needs.">
      <div className="ap-grid">
        {PLATFORM_MODULES.map((module) => (
          <article key={module.id} className="ap-card">
            <div className="ap-card-head">
              <h3 className="ap-card-title">
                <Sprout size={15} />
                {module.name}
              </h3>
              <StatusPill status={module.status} />
            </div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.7, color: 'var(--ap-text-muted)' }}>{module.summary}</p>
            <ul className="ap-list" style={{ marginTop: 10 }}>
              {module.details.map((detail) => (
                <li key={detail} className="ap-list-item" style={{ padding: '7px 0' }}>
                  <span className="ap-list-marker" aria-hidden="true">
                    <BadgeCheck size={12} />
                  </span>
                  <span style={{ fontSize: 11.5, lineHeight: 1.6 }}>{detail}</span>
                </li>
              ))}
            </ul>
            <div className="ap-card-foot">
              <span className="ap-help">{module.statusNote}</span>
            </div>
          </article>
        ))}
      </div>
    </SiteSection>

    <SectionCard title="What stays consistent across every module" icon={<Ruler size={16} />}>
      <div className="ap-grid ap-grid--two">
        {[
          'One palette, typography scale, spacing scale and card shape across public pages, portal modules and authentication screens.',
          'One button hierarchy: primary, secondary, ghost and destructive — never more than one primary action per view.',
          'One chart style: labelled axes with units, informative tooltips, visible legends and gaps for missing readings.',
          'One table style with sorting, pagination, horizontal scroll on phones and CSV export.',
          'One set of states: loading, empty, error, offline, permission denied and success — implemented, not implied.',
          'One data-status vocabulary shown on every surface: measured, recorded, forecast, sample, unavailable.',
        ].map((item) => (
          <div key={item} className="ap-card ap-card--quiet">
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.7 }}>{item}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  </div>
);

/* ---------------------------------------------------------------------------
   AI capabilities
   ------------------------------------------------------------------------- */

export const AiCapabilitiesPage: React.FC = () => (
  <div className="ap-stack" style={{ gap: 32 }}>
    <SiteHero
      eyebrow="AI capabilities"
      title="Understandable intelligence — including its limits"
      lead="AGRIPULSE separates three things that are usually mixed together: measurements, transparent rule-based guidance, and research that is not implemented yet."
      bullets={[
        'Rule-based screening you can verify by hand',
        'Every insight lists the data it used and its assumptions',
        'Confidence stated as higher, moderate or low',
        'Planned features labelled as planned, never mocked up as real',
      ]}
      primaryCta={{ to: '/farmer/signup', label: 'Try it with your records' }}
      secondaryCta={{ to: '/technology', label: 'How the data flows' }}
    />

    <SiteSection title="Capability status" lead="Nothing on this page is claimed as working unless this build actually performs it.">
      <div className="ap-grid ap-grid--two">
        {CAPABILITIES.map((capability) => (
          <article key={capability.id} className="ap-card">
            <div className="ap-card-head">
              <h3 className="ap-card-title">
                <Bot size={15} />
                {capability.name}
              </h3>
              <StatusPill status={capability.status} />
            </div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.7 }}>{capability.summary}</p>
            <div className="ap-stack ap-stack--tight" style={{ marginTop: 12 }}>
              <div>
                <p className="ap-kpi-label" style={{ marginBottom: 4 }}>How it works</p>
                <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.7, color: 'var(--ap-text-muted)' }}>{capability.how}</p>
              </div>
              <div>
                <p className="ap-kpi-label" style={{ marginBottom: 4 }}>Limitation you should know</p>
                <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.7, color: 'var(--ap-text-muted)' }}>{capability.limitation}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </SiteSection>

    <SectionCard title="What an insight card contains" description="The same structure is used in the portal, so you always know why a recommendation appeared." icon={<Target size={16} />}>
      <ol className="ap-list">
        {[
          'What was observed — the value, the unit and the band or threshold it was compared against.',
          'Which field zone is affected, by name, using your own plot names.',
          'Which data supports it, with a provenance tag and timestamp for each input.',
          'Why the condition may matter for the crop at its recorded growth stage.',
          'What action could be considered, phrased as a next step rather than a command.',
          'How confident the screening is, and the assumptions behind the reference band.',
          'When the finding was generated, so a stale insight is obvious.',
        ].map((item, index) => (
          <li key={item} className="ap-list-item">
            <span className="ap-list-marker" aria-hidden="true">
              {index + 1}
            </span>
            <span style={{ fontSize: 12, lineHeight: 1.7 }}>{item}</span>
          </li>
        ))}
      </ol>
      <Notice tone="warn" title="No guarantee is implied.">
        AGRIPULSE does not claim to predict disease outbreaks, guarantee yield, diagnose every plant problem or prevent crop loss.
        Findings help you decide where to look first.
      </Notice>
    </SectionCard>
  </div>
);

/* ---------------------------------------------------------------------------
   Digital twin (public)
   ------------------------------------------------------------------------- */

export const DigitalTwinPublicPage: React.FC = () => (
  <div className="ap-stack" style={{ gap: 32 }}>
    <SiteHero
      eyebrow="Digital farm twin"
      title="A twin built from your records — not from imagination"
      lead="The digital twin represents each plot, the crops on it, the devices installed there and the current condition AGRIPULSE can actually determine. Selecting a zone gives you its measurements, alerts and observations."
      bullets={[
        'Zone tiles with condition indicators and a legend',
        'Device markers with API-derived online / offline state',
        'Accessible list alternative to the schematic',
        'Explicitly labelled as a data view, not satellite imagery',
      ]}
      primaryCta={{ to: '/farmer/login', label: 'Open the twin in the portal' }}
      secondaryCta={{ to: '/how-it-works', label: 'See the data flow' }}
      aside={
        <figure className="overflow-hidden rounded-2xl border border-emerald-300/20 bg-emerald-950/30">
          <img
            src="/images/agripulse-field-hero.jpg"
            alt="Illustration of field zones with sensor nodes reporting into the AGRIPULSE digital twin"
            className="h-full w-full object-cover"
            loading="lazy"
            width={1365}
            height={768}
          />
          <figcaption className="px-4 py-3 text-[11px] text-emerald-100/80">
            Conceptual illustration of the twin: plots, nodes and a data summary. The portal twin is drawn from your recorded
            plots and API device state.
          </figcaption>
        </figure>
      }
    />

    <SiteSection title="What the twin shows, and what it does not" lead="A twin is only useful if you know which parts are measured.">
      <div className="ap-grid ap-grid--two">
        <SectionCard title="It does show" icon={<MapIcon size={16} />}>
          <ul className="ap-list">
            {[
              'Each recorded plot with area, soil type and irrigation method',
              'The crop, variety and growth stage recorded for that plot',
              'Paired devices with their backend-derived status and sensor types',
              'Latest moisture and soil temperature with source tags and timestamps',
              'Open alerts and the most recent field observation for the zone',
            ].map((item) => (
              <li key={item} className="ap-list-item" style={{ padding: '8px 0' }}>
                <span className="ap-list-marker" aria-hidden="true">
                  <BadgeCheck size={12} />
                </span>
                <span style={{ fontSize: 11.5, lineHeight: 1.65 }}>{item}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="It does not show" icon={<ShieldCheck size={16} />}>
          <ul className="ap-list">
            {[
              'A satellite, drone or aerial image of your land',
              'A precise map outline of plot boundaries — plots are recorded as named zones, not surveyed polygons',
              'Interpolated values between sensors: only the readings that exist are displayed',
              'Live video or imagery of the crop canopy',
              'A verified representation of unregistered infrastructure such as pipes or valves',
            ].map((item) => (
              <li key={item} className="ap-list-item" style={{ padding: '8px 0' }}>
                <span className="ap-list-marker ap-list-marker--muted" aria-hidden="true">
                  <Layers size={12} />
                </span>
                <span style={{ fontSize: 11.5, lineHeight: 1.65 }}>{item}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </SiteSection>

    <SectionCard title="Interaction model" icon={<Gauge size={16} />}>
      <div className="ap-grid ap-grid--two">
        {[
          { title: 'Select a zone', body: 'Click or keyboard-activate a zone tile. The selected tile is highlighted with a visible focus ring and the detail panel updates.' },
          { title: 'Inspect measurements', body: 'Each measurement card shows the value, unit, source tag and how long ago it arrived.' },
          { title: 'Follow the alert', body: 'Open alerts list the affected zone, the evidence and a suggested next step with a direct link.' },
          { title: 'Use the accessible alternative', body: 'The same information is available as a table and as text, so the twin is usable without relying on spatial layout.' },
        ].map((item) => (
          <div key={item.title} className="ap-card ap-card--quiet">
            <h3 className="ap-card-title" style={{ fontSize: 13 }}>{item.title}</h3>
            <p style={{ margin: '8px 0 0', fontSize: 11.5, lineHeight: 1.7, color: 'var(--ap-text-muted)' }}>{item.body}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  </div>
);

/* ---------------------------------------------------------------------------
   How it works
   ------------------------------------------------------------------------- */

export const HowItWorksPage: React.FC = () => (
  <div className="ap-stack" style={{ gap: 32 }}>
    <SiteHero
      eyebrow="How it works"
      title="From an empty account to a defended field decision"
      lead="AGRIPULSE's value comes from the quality of its record. Here is exactly how information is captured, labelled, used and verified."
      bullets={[
        'Setup takes a farm record and a plot list',
        'Hardware is optional in every module',
        'Each step preserves data provenance',
        'Nothing is hidden behind unexplained automation',
      ]}
      primaryCta={{ to: '/farmer/signup', label: 'Start with a farm record' }}
      secondaryCta={{ to: '/faq', label: 'Read the FAQ' }}
    />

    <SiteSection title="The five steps" lead="Each step also states the quality rule that protects the next one.">
      <div className="ap-stack">
        {HOW_IT_WORKS_STEPS.map((step) => (
          <article key={step.step} className="ap-card">
            <div className="ap-row" style={{ gap: 14 }}>
              <span className="ap-list-marker" aria-hidden="true" style={{ width: 38, height: 38 }}>
                {step.step}
              </span>
              <div>
                <h3 className="ap-card-title">{step.title}</h3>
                <p style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.7, color: 'var(--ap-text-muted)' }}>{step.body}</p>
              </div>
            </div>
            <div className="ap-card-foot">
              <span className="ap-help">{step.outcome}</span>
            </div>
          </article>
        ))}
      </div>
    </SiteSection>

    <SectionCard title="A worked example" description="Values below are illustrative of the interface logic, not measurements from your farm." icon={<Droplets size={16} />}>
      <div className="ap-stack ap-stack--tight">
        <KeyValueList
          items={[
            { label: 'Zone', value: 'Plot A2 — Central Tube-well Block (recorded)' },
            { label: 'Reading', value: '38% soil moisture · Sensor measured · 40 minutes ago' },
            { label: 'Crop stage', value: 'Wheat · Germination & emergence (recorded)' },
            { label: 'Reference band', value: '45–75% for this stage (published guidance, generic)' },
            { label: 'Forecast rain', value: '2 mm expected in 24 h (forecast data)' },
            { label: 'Guidance', value: 'Irrigate within 24–48 hours — moisture below the band, little rain expected' },
            { label: 'Assumption', value: 'Band not calibrated to this field’s texture or sensor depth' },
            { label: 'Confidence', value: 'Higher — the value is a live sensor reading' },
          ]}
        />
        <Notice tone="info" title="What the farmer does next.">
          Walk the zone, confirm the soil feels dry at root depth, check the canal turn or pump window, irrigate, then log the
          activity. The next reading tells whether the band was restored.
        </Notice>
      </div>
    </SectionCard>
  </div>
);

/* ---------------------------------------------------------------------------
   Technology
   ------------------------------------------------------------------------- */

export const TechnologyPage: React.FC = () => (
  <div className="ap-stack" style={{ gap: 32 }}>
    <SiteHero
      eyebrow="Technology"
      title="Engineered so that every number can be traced"
      lead="AGRIPULSE is a full-stack product: a responsive React workspace, an authenticated Express API with database-backed device state, and a telemetry ingestion path that validates units, ranges and timestamps."
      bullets={[
        'Session-based authentication with server-side ownership checks',
        'Telemetry validated before storage — never trusted from the client',
        'Workspace snapshots revisioned to prevent stale overwrites',
        'Rate limits and security headers on sensitive routes',
      ]}
      primaryCta={{ to: '/platform', label: 'Platform modules' }}
      secondaryCta={{ to: '/contact', label: 'Talk to the team' }}
    />

    <SiteSection title="Stack" lead="Everything below is present in the repository and exercised by the automated API tests.">
      <div className="ap-grid ap-grid--two">
        {TECHNOLOGY_STACK.map((group) => (
          <SectionCard key={group.title} title={group.title} icon={<Cpu size={16} />}>
            <ul className="ap-list">
              {group.items.map((item) => (
                <li key={item} className="ap-list-item" style={{ padding: '8px 0' }}>
                  <span className="ap-list-marker" aria-hidden="true">
                    <BadgeCheck size={12} />
                  </span>
                  <span style={{ fontSize: 11.5, lineHeight: 1.65 }}>{item}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        ))}
      </div>
    </SiteSection>

    <Tabs
      ariaLabel="Technology detail"
      tabs={[
        {
          id: 'data-flow',
          label: 'Data flow',
          content: (
            <SectionCard title="How a reading reaches your screen" icon={<Database size={16} />}>
              <ol className="ap-list">
                {[
                  'A paired node posts a reading batch to the ingestion endpoint using its device secret.',
                  'The API validates sensor type, unit, value bounds and timestamp before storing anything.',
                  'The reading is stored with its measured time, received time, quality flag and physical-sensor source.',
                  'The workspace requests telemetry for the devices it owns; ownership is verified server-side.',
                  'The interface attaches a provenance tag, freshness state and unit, then renders it in the relevant modules.',
                  'If anything in that chain is missing, the screen says so instead of displaying a substitute value.',
                ].map((step, index) => (
                  <li key={step} className="ap-list-item">
                    <span className="ap-list-marker" aria-hidden="true">{index + 1}</span>
                    <span style={{ fontSize: 11.5, lineHeight: 1.7 }}>{step}</span>
                  </li>
                ))}
              </ol>
            </SectionCard>
          ),
        },
        {
          id: 'security',
          label: 'Security & privacy',
          content: (
            <SectionCard title="Access and data handling" icon={<ShieldCheck size={16} />}>
              <div className="ap-grid ap-grid--two">
                {[
                  { title: 'Ownership enforced by the API', body: 'Device, farm and plot access is checked against the authenticated session on every request, not just hidden in the interface.' },
                  { title: 'Secrets hashed at rest', body: 'Pairing codes and device secrets are stored as hashes; the raw pairing code is returned once and expires in ten minutes.' },
                  { title: 'No credentials in the browser bundle', body: 'Weather, AI and marketplace integrations belong on the server. Variable names prefixed VITE_ are treated as public.' },
                  { title: 'Sensitive fields rejected', body: 'Workspace snapshots refuse credential-like fields, and the demo workspace is clearly marked as shared, non-production storage.' },
                ].map((item) => (
                  <div key={item.title} className="ap-card ap-card--quiet">
                    <h3 className="ap-card-title" style={{ fontSize: 13 }}>{item.title}</h3>
                    <p style={{ margin: '8px 0 0', fontSize: 11.5, lineHeight: 1.7, color: 'var(--ap-text-muted)' }}>{item.body}</p>
                  </div>
                ))}
              </div>
              <Notice tone="warn" title="Before production use.">
                A production deployment needs a managed database with backups, TLS at every hop, account verification and recovery,
                device attestation with credential rotation, monitoring and a reviewed authorization model.
              </Notice>
            </SectionCard>
          ),
        },
        {
          id: 'integrity',
          label: 'Data integrity rules',
          content: (
            <SectionCard title="Rules enforced in code" icon={<BadgeCheck size={16} />}>
              <div className="ap-grid ap-grid--two">
                {HONESTY_POINTS.map((point) => (
                  <div key={point.title} className="ap-card ap-card--quiet">
                    <h3 className="ap-card-title" style={{ fontSize: 13 }}>{point.title}</h3>
                    <p style={{ margin: '8px 0 0', fontSize: 11.5, lineHeight: 1.7, color: 'var(--ap-text-muted)' }}>{point.body}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          ),
        },
      ]}
    />
  </div>
);

/* ---------------------------------------------------------------------------
   Innovation & impact
   ------------------------------------------------------------------------- */

export const ImpactPage: React.FC = () => (
  <div className="ap-stack" style={{ gap: 32 }}>
    <SiteHero
      eyebrow="Innovation & impact"
      title="Innovation that survives a field visit"
      lead="AGRIPULSE's contribution is not a dashboard — it is a discipline: measure what you claim, label what you infer, and design for the farmer who has to act on it."
      bullets={[
        'Provenance-first interface design',
        'Rule-based transparency instead of black-box scores',
        'Offline-tolerant, phone-first workflows',
        'Validation plan tied to agronomic measurement',
      ]}
      primaryCta={{ to: '/contact', label: 'Discuss a pilot' }}
      secondaryCta={{ to: '/roadmap', label: 'See the roadmap' }}
    />

    <SiteSection title="Where the impact is expected" lead="Each area states what is measurable today and what still needs validation.">
      <div className="ap-grid ap-grid--two">
        {IMPACT_AREAS.map((area) => (
          <article key={area.title} className="ap-card">
            <h3 className="ap-card-title">
              <Leaf size={15} />
              {area.title}
            </h3>
            <p style={{ margin: '9px 0 0', fontSize: 12, lineHeight: 1.7 }}>{area.body}</p>
            <div className="ap-card-foot">
              <span className="ap-help">{area.measure}</span>
            </div>
          </article>
        ))}
      </div>
    </SiteSection>

    <SectionCard title="Innovation themes" icon={<GraduationCap size={16} />}>
      <div className="ap-grid ap-grid--two">
        {[
          { title: 'Honest-by-design data interfaces', body: 'A reusable pattern for representing measured, inferred and unavailable data in agricultural software — provenance tags, freshness states and gap-preserving charts.' },
          { title: 'Edge-friendly device integration', body: 'A pairing and telemetry contract that keeps device credentials out of the browser and derives online state from heartbeats rather than user assertions.' },
          { title: 'One design language, many roles', body: 'Farmer, seller and institutional screens share tokens and components, so a new module cannot drift into a different visual dialect.' },
          { title: 'Accessible data storytelling', body: 'Every visual — the twin schematic, meters, charts and tables — has a text or table equivalent, so the platform works for users who cannot rely on colour alone.' },
        ].map((theme) => (
          <div key={theme.title} className="ap-card ap-card--quiet">
            <h3 className="ap-card-title" style={{ fontSize: 13 }}>{theme.title}</h3>
            <p style={{ margin: '8px 0 0', fontSize: 11.5, lineHeight: 1.7, color: 'var(--ap-text-muted)' }}>{theme.body}</p>
          </div>
        ))}
      </div>
    </SectionCard>

    <SectionCard title="Validation plan" description="How the team intends to move from interface claims to measured outcomes." icon={<Target size={16} />}>
      <ol className="ap-list">
        {[
          'Instrument one plot per crop with calibrated soil-moisture sensors and a manual gravimetric check on the same day.',
          'Compare the reference band used in guidance with measured field capacity and wilting point for that soil texture.',
          'Record every irrigation event, volume and duration so water use can be compared with the recommendation.',
          'Log stress observations and interventions to measure the time between an alert and an action.',
          'Run a control plot without guidance in the same soil and season before publishing any outcome claim.',
        ].map((item, index) => (
          <li key={item} className="ap-list-item">
            <span className="ap-list-marker" aria-hidden="true">{index + 1}</span>
            <span style={{ fontSize: 11.5, lineHeight: 1.7 }}>{item}</span>
          </li>
        ))}
      </ol>
    </SectionCard>
  </div>
);

/* ---------------------------------------------------------------------------
   Roadmap
   ------------------------------------------------------------------------- */

export const RoadmapPage: React.FC = () => (
  <div className="ap-stack" style={{ gap: 32 }}>
    <SiteHero
      eyebrow="Roadmap"
      title="What exists today, and what is honestly still ahead"
      lead="AGRIPULSE publishes its build status instead of implying maturity. Items below are grouped by whether they are shipped, awaiting field validation, or planned."
      bullets={[
        'Shipped modules are usable today in this build',
        'Validation work is listed before scale-up claims',
        'Planned intelligence features are not simulated',
      ]}
      primaryCta={{ to: '/faq', label: 'Read the FAQ' }}
      secondaryCta={{ to: '/contact', label: 'Ask about a stage' }}
    />

    <div className="ap-grid ap-grid--two">
      {ROADMAP_STAGES.map((stage) => (
        <SectionCard
          key={stage.stage}
          title={stage.stage}
          icon={stage.status === 'available' ? <Rocket size={16} /> : <GitBranch size={16} />}
          actions={<StatusPill status={stage.status} />}
        >
          <ul className="ap-list">
            {stage.items.map((item) => (
              <li key={item} className="ap-list-item" style={{ padding: '8px 0' }}>
                <span className={`ap-list-marker${stage.status === 'available' ? '' : ' ap-list-marker--muted'}`} aria-hidden="true">
                  {stage.status === 'available' ? <BadgeCheck size={12} /> : <Flag size={12} />}
                </span>
                <span style={{ fontSize: 11.5, lineHeight: 1.65 }}>{item}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      ))}
    </div>
  </div>
);

/* ---------------------------------------------------------------------------
   About
   ------------------------------------------------------------------------- */

export const AboutPage: React.FC = () => (
  <div className="ap-stack" style={{ gap: 32 }}>
    <SiteHero
      eyebrow="About"
      title="Built for farmers who need answers, not dashboards"
      lead="AGRIPULSE is a smart-agriculture platform project focused on early crop-stress detection and a farm digital twin that a farmer can actually read, trust and act on."
      bullets={[
        'Farmer-first interface design',
        'Explicit data provenance',
        'Open about prototype status',
        'Designed for Indian field conditions',
      ]}
      primaryCta={{ to: '/contact', label: 'Get in touch' }}
      secondaryCta={{ to: '/impact', label: 'Innovation & impact' }}
    />

    <div className="ap-split">
      <SectionCard title="Why AGRIPULSE exists" icon={<Sprout size={16} />}>
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.8, color: 'var(--ap-text-muted)' }}>
          Farm decisions are made with incomplete information: a remembered rainfall total, a visual guess at soil moisture, a
          forecast for a nearby town. Sensors help, but they usually arrive as raw numbers that do not answer the question a
          farmer actually has — should I irrigate this plot today, and which plot first?
        </p>
        <p style={{ margin: '12px 0 0', fontSize: 12.5, lineHeight: 1.8, color: 'var(--ap-text-muted)' }}>
          AGRIPULSE exists to close that gap: capture the farm record properly, collect measurements honestly, then translate
          them into clear, checkable guidance that never hides what it does not know.
        </p>
      </SectionCard>

      <div className="ap-stack">
        <SectionCard title="Principles" icon={<Users size={16} />}>
          <ul className="ap-list">
            {[
              'Never show a fabricated measurement.',
              'Never present an estimate without a label.',
              'Never let a visual flourish outrank clarity.',
              'Never hide a limitation behind technical language.',
              'Never ship a control that does not work.',
            ].map((item) => (
              <li key={item} className="ap-list-item" style={{ padding: '9px 0' }}>
                <span className="ap-list-marker" aria-hidden="true">
                  <BadgeCheck size={12} />
                </span>
                <span style={{ fontSize: 11.5, lineHeight: 1.65 }}>{item}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Status of this build" icon={<ShieldCheck size={16} />}>
          <KeyValueList
            items={[
              { label: 'Stage', value: 'Working prototype with local API' },
              { label: 'Hardware', value: 'Firmware not included; ingestion contract documented' },
              { label: 'Weather', value: 'Provider-ready; labelled sample forecast by default' },
              { label: 'AI', value: 'Rule-based assistant; vision and forecasting planned' },
              { label: 'Certification', value: 'None claimed — not a formal advisory service' },
            ]}
          />
          <div className="ap-row" style={{ marginTop: 12 }}>
            <Link className="ap-btn ap-btn--secondary ap-btn--sm" to="/technology">
              Technology detail <ArrowRight size={12} />
            </Link>
            <Link className="ap-btn ap-btn--ghost ap-btn--sm" to="/roadmap">
              Roadmap <ArrowRight size={12} />
            </Link>
          </div>
        </SectionCard>
      </div>
    </div>

    <SectionCard title="For researchers, reviewers and judges" icon={<GraduationCap size={16} />}>
      <div className="ap-grid ap-grid--two">
        {[
          { title: 'Data model', body: 'Farm → plot → crop → observation → device → telemetry, with explicit provenance on each record type.' },
          { title: 'Traceability', body: 'Each recommendation exposes its inputs, band, assumptions and confidence level in the interface itself.' },
          { title: 'Failure behaviour', body: 'Missing data, stale readings, unreachable APIs and permission denials all have designed, visible states.' },
          { title: 'Reproducibility', body: 'Automated API tests cover registration, ownership checks, pairing, telemetry validation and offline derivation.' },
        ].map((item) => (
          <div key={item.title} className="ap-card ap-card--quiet">
            <h3 className="ap-card-title" style={{ fontSize: 13 }}>{item.title}</h3>
            <p style={{ margin: '8px 0 0', fontSize: 11.5, lineHeight: 1.7, color: 'var(--ap-text-muted)' }}>{item.body}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  </div>
);

/* ---------------------------------------------------------------------------
   Shared empty state used by site pages that need one
   ------------------------------------------------------------------------- */

export const SiteEmptyState: React.FC<{ title: string; description: string; action?: { to: string; label: string } }> = ({
  title,
  description,
  action,
}) => (
  <EmptyState
    icon={<Sprout size={19} />}
    title={title}
    description={description}
    action={action ? <Link className="ap-btn ap-btn--primary" to={action.to}>{action.label}</Link> : undefined}
  />
);

export const UnusedIcons = { CloudSun, MapIcon, RadioTower, Wifi };
