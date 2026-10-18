import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  CloudSun,
  Cpu,
  Mail,
  MapPin,
  RadioTower,
  Send,
  ShieldCheck,
  Sprout,
  Users,
} from 'lucide-react';
import { SiteHero, SiteSection } from '../../components/SiteLayout';
import { SectionCard, Accordion, Notice, StatusBadge, KeyValueList } from '../../components/ui/primitives';
import { CONTACT_REASONS } from '../../data/siteContent';

/* ---------------------------------------------------------------------------
   FAQ
   ------------------------------------------------------------------------- */

const FAQ_GROUPS: { title: string; icon: React.ReactNode; items: { question: string; answer: React.ReactNode }[] }[] = [
  {
    title: 'Getting started',
    icon: <Sprout size={16} />,
    items: [
      {
        question: 'Do I need sensors to use AGRIPULSE?',
        answer:
          'No. The farm record, field observations, crop health, weather, alerts, reports and the digital twin all work from manual entries. Sensor-based live monitoring simply adds automatic readings to the same zones.',
      },
      {
        question: 'How long does setup take?',
        answer:
          'A farm, one or two plots and a crop record take a couple of minutes. Device commissioning depends on the hardware: you create the record, then complete pairing from the device page when the node is physically installed and powered.',
      },
      {
        question: 'What happens to my data if hardware is not installed?',
        answer:
          'Nothing is invented to fill the gap. Zones without readings show “waiting for readings”, and guidance holds rather than guessing an irrigation action.',
      },
    ],
  },
  {
    title: 'Data and honesty',
    icon: <ShieldCheck size={16} />,
    items: [
      {
        question: 'How do I know whether a number is measured or estimated?',
        answer:
          'Every value carries a source tag: Sensor measured, Farmer recorded, Forecast, Rule-based or Sample data. The tag appears next to the value in modules, alerts and exported reports.',
      },
      {
        question: 'Why does a chart show gaps?',
        answer:
          'Because no reading was received for that period. Drawing a line through missing data — or filling it with zero — would misrepresent your field, so AGRIPULSE leaves the gap visible.',
      },
      {
        question: 'Does AGRIPULSE measure rainfall?',
        answer:
          'No. This build has no rain-gauge sensor. Precipitation appears either as provider forecast data or as rainfall you record yourself, and both are labelled accordingly.',
      },
      {
        question: 'Is the weather data live?',
        answer:
          'It depends on configuration. If no weather endpoint is configured on the server, the portal shows a clearly labelled sample forecast and names the source as a demo fallback.',
      },
    ],
  },
  {
    title: 'AI and recommendations',
    icon: <Bot size={16} />,
    items: [
      {
        question: 'Is the crop-stress screening a machine-learning model?',
        answer:
          'No. It is rule-based screening: your reading is compared with a published reference band for the recorded growth stage, and the comparison, assumptions and confidence are shown. That is deliberate — a farmer can check it by hand.',
      },
      {
        question: 'Can it identify a disease from a photo?',
        answer:
          'Not in this build. Photo-based identification is listed as planned. The crop-health library offers documented symptom descriptions and management guidance for comparison, not a diagnosis.',
      },
      {
        question: 'Does the assistant send my data to an AI provider?',
        answer:
          'No. The assistant answers locally in your browser using rules, your saved records and the reference library. If a vision or language service is configured by the operator in future, it would run server-side with credentials that never reach the browser.',
      },
      {
        question: 'Will AGRIPULSE tell me my expected yield?',
        answer:
          'No. Yield estimation is not implemented, and AGRIPULSE will not produce a yield figure from incomplete data.',
      },
    ],
  },
  {
    title: 'Devices, access and security',
    icon: <RadioTower size={16} />,
    items: [
      {
        question: 'Why is my device not showing as online?',
        answer:
          'Online status is derived from an authenticated heartbeat received by the API. A registration or pairing code alone never marks a device online. Check power, gateway coverage and antenna placement, then re-check the heartbeat.',
      },
      {
        question: 'Can I add someone else to my farm?',
        answer:
          'Farm data is scoped to the authenticated account. Shared access for family members or agronomists is not implemented in this build; each account sees only the records it owns.',
      },
      {
        question: 'Is my farm data protected?',
        answer:
          'Requests are authenticated with an HttpOnly session cookie, ownership is verified server-side on every farm, plot and device request, and sensitive workspace fields are rejected. A production deployment additionally requires TLS, a managed database and a reviewed authorization model.',
      },
      {
        question: 'Is the marketplace real?',
        answer:
          'No. The store, cart, orders and offers modules are demonstrations of the interface. No payment is charged, no shipment is arranged and no seller is verified.',
      },
    ],
  },
  {
    title: 'Weather and advisories',
    icon: <CloudSun size={16} />,
    items: [
      {
        question: 'How are advisories triggered?',
        answer:
          'By transparent thresholds on the configured weather values — for example high temperature combined with low humidity, or sustained humidity with rain probability. The trigger condition is printed on the advisory.',
      },
      {
        question: 'Can I rely on a forecast advisory for a spraying decision?',
        answer:
          'Treat it as one input. Forecasts for a nearby location may not match your field, and AGRIPULSE cannot see wind at your bund. Confirm locally, and follow label instructions for any product.',
      },
    ],
  },
];

export const FaqPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();

  const filtered = FAQ_GROUPS.map((group) => ({
    ...group,
    items: needle
      ? group.items.filter(
          (item) => item.question.toLowerCase().includes(needle) || String(item.answer).toLowerCase().includes(needle),
        )
      : group.items,
  })).filter((group) => group.items.length > 0);

  return (
    <div className="ap-stack" style={{ gap: 30 }}>
      <SiteHero
        eyebrow="FAQ"
        title="Straight answers about what AGRIPULSE does"
        lead="If a capability is not implemented, it is listed as planned rather than described as working. Search the questions below or read the grouped answers."
        primaryCta={{ to: '/contact', label: 'Still have a question?' }}
        secondaryCta={{ to: '/platform', label: 'Platform modules' }}
      />

      <SectionCard title="Search the FAQ" icon={<Sprout size={16} />}>
        <label className="ap-field" style={{ maxWidth: 520 }}>
          <span className="ap-label">Search questions and answers</span>
          <input
            type="search"
            className="ap-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. sensors, rainfall, diagnosis, pricing"
          />
        </label>
      </SectionCard>

      {filtered.length === 0 ? (
        <Notice tone="neutral" title="No matching question.">
          Try a different term, or <Link to="/contact" style={{ fontWeight: 700 }}>send the question to the team</Link>.
        </Notice>
      ) : (
        filtered.map((group) => (
          <SiteSection key={group.title} title={group.title}>
            <div>
              {group.items.map((item, index) => (
                <Accordion key={item.question} question={item.question} defaultOpen={index === 0 && !needle}>
                  {item.answer}
                </Accordion>
              ))}
            </div>
          </SiteSection>
        ))
      )}

      <SectionCard variant="tint" title="Related pages" icon={<ArrowRight size={16} />}>
        <div className="ap-row">
          <Link className="ap-btn ap-btn--secondary ap-btn--sm" to="/ai-capabilities">AI capabilities</Link>
          <Link className="ap-btn ap-btn--secondary ap-btn--sm" to="/technology">Technology & data</Link>
          <Link className="ap-btn ap-btn--secondary ap-btn--sm" to="/roadmap">Roadmap</Link>
          <Link className="ap-btn ap-btn--primary ap-btn--sm" to="/farmer/signup">Create an account</Link>
        </div>
      </SectionCard>
    </div>
  );
};

/* ---------------------------------------------------------------------------
   Contact
   ------------------------------------------------------------------------- */

interface ContactDraft {
  name: string;
  email: string;
  role: string;
  topic: string;
  message: string;
  consent: boolean;
}

const EMPTY_DRAFT: ContactDraft = { name: '', email: '', role: 'Farmer', topic: 'Pilot a farm or cluster', message: '', consent: false };

export const ContactPage: React.FC = () => {
  const [draft, setDraft] = useState<ContactDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactDraft, string>>>({});
  const [submitted, setSubmitted] = useState<ContactDraft | null>(null);

  const update = <K extends keyof ContactDraft>(key: K, value: ContactDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof ContactDraft, string>> = {};
    if (draft.name.trim().length < 2) next.name = 'Enter your name so we can address the reply.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(draft.email.trim())) next.email = 'Enter a valid email address.';
    if (draft.message.trim().length < 20) next.message = 'Add a little more detail (at least 20 characters) so the reply is useful.';
    if (!draft.consent) next.consent = 'Please confirm you are happy for us to reply to this address.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  return (
    <div className="ap-stack" style={{ gap: 30 }}>
      <SiteHero
        eyebrow="Contact"
        title="Talk to the AGRIPULSE team"
        lead="Pilot enquiries, hardware questions, research collaboration and dealer access. Tell us about your farm or organisation and what you want to measure."
        bullets={[
          'Honest answers about current capabilities',
          'Practical hardware and placement guidance',
          'No sales pressure on unvalidated claims',
        ]}
        primaryCta={{ to: '/faq', label: 'Check the FAQ first' }}
        secondaryCta={{ to: '/platform', label: 'Module catalog' }}
      />

      <div className="ap-split">
        <SectionCard
          title="Send an enquiry"
          description="This development build has no mail server configured, so the form validates your message and shows exactly what would be sent."
          icon={<Mail size={16} />}
        >
          {submitted ? (
            <div className="ap-stack">
              <Notice tone="ok" title="Enquiry validated.">
                Nothing has been transmitted: no mail or ticket service is connected in this build. Copy the summary below into your
                own email client, or use it to brief a colleague.
              </Notice>
              <KeyValueList
                items={[
                  { label: 'Name', value: submitted.name },
                  { label: 'Email', value: submitted.email },
                  { label: 'Role', value: submitted.role },
                  { label: 'Topic', value: submitted.topic },
                  { label: 'Message', value: submitted.message },
                  { label: 'Captured at', value: new Date().toLocaleString('en-IN') },
                ]}
              />
              <div className="ap-row">
                <button
                  type="button"
                  className="ap-btn ap-btn--secondary"
                  onClick={() => {
                    void navigator.clipboard?.writeText(
                      `AGRIPULSE enquiry\nName: ${submitted.name}\nEmail: ${submitted.email}\nRole: ${submitted.role}\nTopic: ${submitted.topic}\n\n${submitted.message}`,
                    );
                  }}
                >
                  Copy summary
                </button>
                <button
                  type="button"
                  className="ap-btn ap-btn--primary"
                  onClick={() => {
                    setSubmitted(null);
                    setDraft(EMPTY_DRAFT);
                  }}
                >
                  Send another enquiry
                </button>
              </div>
            </div>
          ) : (
            <form
              className="ap-stack"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                if (validate()) setSubmitted(draft);
              }}
            >
              <div className="ap-grid ap-grid--two">
                <label className="ap-field">
                  <span className="ap-label">Your name</span>
                  <input
                    type="text"
                    className="ap-input"
                    value={draft.name}
                    aria-invalid={Boolean(errors.name)}
                    onChange={(event) => update('name', event.target.value)}
                    required
                  />
                  {errors.name && <span className="ap-error-text"><AlertTriangle size={12} aria-hidden="true" /> {errors.name}</span>}
                </label>
                <label className="ap-field">
                  <span className="ap-label">Email address</span>
                  <input
                    type="email"
                    className="ap-input"
                    value={draft.email}
                    aria-invalid={Boolean(errors.email)}
                    onChange={(event) => update('email', event.target.value)}
                    required
                  />
                  {errors.email && <span className="ap-error-text"><AlertTriangle size={12} aria-hidden="true" /> {errors.email}</span>}
                </label>
              </div>

              <div className="ap-grid ap-grid--two">
                <label className="ap-field">
                  <span className="ap-label">I am a…</span>
                  <select className="ap-select" value={draft.role} onChange={(event) => update('role', event.target.value)}>
                    {['Farmer', 'FPO / cooperative', 'Agri-input dealer', 'Researcher / student', 'Institution / government', 'Other'].map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ap-field">
                  <span className="ap-label">Topic</span>
                  <select className="ap-select" value={draft.topic} onChange={(event) => update('topic', event.target.value)}>
                    {CONTACT_REASONS.map((reason) => (
                      <option key={reason.title} value={reason.title}>
                        {reason.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="ap-field">
                <span className="ap-label">Message</span>
                <textarea
                  className="ap-textarea"
                  value={draft.message}
                  aria-invalid={Boolean(errors.message)}
                  onChange={(event) => update('message', event.target.value)}
                  placeholder="Location, crops, plot sizes, and what you would like AGRIPULSE to measure or explain."
                  required
                />
                {errors.message && <span className="ap-error-text"><AlertTriangle size={12} aria-hidden="true" /> {errors.message}</span>}
              </label>

              <label className="ap-row" style={{ gap: 9, alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  checked={draft.consent}
                  onChange={(event) => update('consent', event.target.checked)}
                  aria-invalid={Boolean(errors.consent)}
                  style={{ width: 16, height: 16, marginTop: 2 }}
                />
                <span style={{ fontSize: 11.5, lineHeight: 1.6 }}>
                  I understand this is a development build with no mail service configured, and I am happy for the message to be
                  used to prepare a reply.
                </span>
              </label>
              {errors.consent && <span className="ap-error-text"><AlertTriangle size={12} aria-hidden="true" /> {errors.consent}</span>}

              <div className="ap-row">
                <button type="submit" className="ap-btn ap-btn--primary">
                  <Send size={14} /> Validate message
                </button>
                <span className="ap-help">No credentials or sensitive farm details are needed in this form.</span>
              </div>
            </form>
          )}
        </SectionCard>

        <div className="ap-stack">
          <SectionCard title="What we can help with" icon={<Users size={16} />}>
            <ul className="ap-list">
              {CONTACT_REASONS.map((reason) => (
                <li key={reason.title} className="ap-list-item">
                  <span className="ap-list-marker" aria-hidden="true">
                    <CheckCircle2 size={13} />
                  </span>
                  <div className="ap-list-body">
                    <p className="ap-list-title">{reason.title}</p>
                    <p>{reason.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Registration paths" icon={<Cpu size={16} />}>
            <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.7, color: 'var(--ap-text-muted)' }}>
              Farmers and sellers use the same secure account system with different role permissions.
            </p>
            <div className="ap-row">
              <Link className="ap-btn ap-btn--primary ap-btn--sm" to="/farmer/signup">
                Farmer registration
              </Link>
              <Link className="ap-btn ap-btn--secondary ap-btn--sm" to="/seller/signup">
                Seller registration
              </Link>
            </div>
            <div className="ap-card-foot" style={{ gap: 8 }}>
              <StatusBadge tone="info">
                <MapPin size={12} /> Built for Indian field conditions
              </StatusBadge>
              <StatusBadge tone="muted">Prototype status</StatusBadge>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------------------
   Not found
   ------------------------------------------------------------------------- */

export const SiteNotFoundPage: React.FC = () => (
  <div className="ap-stack" style={{ gap: 24 }}>
    <SiteHero
      eyebrow="Page not found"
      title="That page does not exist"
      lead="The address you followed is not part of AGRIPULSE. Use the links below to continue — no farm data was affected."
      primaryCta={{ to: '/', label: 'Back to home' }}
      secondaryCta={{ to: '/platform', label: 'Platform overview' }}
    />
    <SectionCard title="Popular destinations" icon={<ArrowRight size={16} />}>
      <div className="ap-row">
        <Link className="ap-btn ap-btn--secondary ap-btn--sm" to="/how-it-works">How it works</Link>
        <Link className="ap-btn ap-btn--secondary ap-btn--sm" to="/ai-capabilities">AI capabilities</Link>
        <Link className="ap-btn ap-btn--secondary ap-btn--sm" to="/digital-twin">Digital twin</Link>
        <Link className="ap-btn ap-btn--secondary ap-btn--sm" to="/faq">FAQ</Link>
        <Link className="ap-btn ap-btn--primary ap-btn--sm" to="/farmer/login">Farmer sign in</Link>
      </div>
    </SectionCard>
  </div>
);
