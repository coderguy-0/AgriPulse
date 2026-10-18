import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Bot,
  BookOpen,
  Droplets,
  Eraser,
  Leaf,
  RadioTower,
  Send,
  Sparkles,
  Store,
  Wrench,
} from 'lucide-react';
import {
  PageHeader,
  SectionCard,
  Notice,
  ProvenanceTag,
  StatusBadge,
  EmptyState,
  Accordion,
} from '../components/ui/primitives';
import { useAgriPulse } from '../context/AgriPulseContext';
import { generateAssistantReply } from '../services/aiAssistantService';
import { formatTimestamp } from '../services/provenance';

const PROMPT_GROUPS: { title: string; icon: React.ReactNode; prompts: string[] }[] = [
  {
    title: 'Readings & irrigation',
    icon: <Droplets size={14} />,
    prompts: [
      'What is the soil moisture in my plots right now?',
      'Should I irrigate today?',
      'Which zone has the lowest soil moisture?',
    ],
  },
  {
    title: 'Crop health',
    icon: <Leaf size={14} />,
    prompts: [
      'What do yellowing lower leaves on tomato mean?',
      'Which diseases are favoured by high humidity?',
      'Explain bacterial leaf blight symptoms',
    ],
  },
  {
    title: 'Devices',
    icon: <RadioTower size={14} />,
    prompts: [
      'What does pending pairing mean for my device?',
      'Why is my sensor node offline?',
      'Which sensors are configured on my nodes?',
    ],
  },
  {
    title: 'Farm records',
    icon: <Wrench size={14} />,
    prompts: [
      'Summarise my pending farm activities',
      'What crops are recorded on this farm?',
      'Show my latest field observations',
    ],
  },
];

export const AssistantPage: React.FC = () => {
  const {
    profile,
    farms,
    activeFarm,
    crops,
    observations,
    activities,
    devices,
    weather,
    dictionary,
    products,
    schemes,
    chatHistory,
    appendChatMessage,
    clearChatHistory,
    openChatWithPrompt,
  } = useAgriPulse();

  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const activeFarmCrops = useMemo(() => crops.filter((crop) => !activeFarm || crop.farmId === activeFarm.id), [crops, activeFarm]);
  const activeFarmObservations = useMemo(
    () => observations.filter((observation) => !activeFarm || observation.farmId === activeFarm.id),
    [observations, activeFarm],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [chatHistory.length, thinking]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || thinking) return;
    appendChatMessage({ sender: 'user', text: question });
    setInput('');
    setThinking(true);
    try {
      const reply = await generateAssistantReply(question, {
        profile,
        activeFarm,
        farms,
        crops: activeFarmCrops,
        observations: activeFarmObservations,
        activities,
        devices,
        weather,
        dictionary,
        products,
        schemes,
        recentMessages: chatHistory,
      });
      appendChatMessage(reply);
    } catch {
      appendChatMessage({
        sender: 'assistant',
        text: 'The assistant could not build an answer from your saved records. Nothing was changed. Please try again, or open the relevant module to read the underlying data directly.',
        modeLabel: 'Demo Rule-Based Guidance',
      });
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="ap-page">
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-2"><Bot size={12} /> AI farming assistant</span>}
        title="AI farming assistant"
        subtitle={
          <>
            Ask questions in plain language. Answers are generated on your device from AGRIPULSE’s own rule engine, your saved
            records and the crop-disease library — they are educational guidance, not a diagnosis or prescription.
          </>
        }
        breadcrumbs={[{ label: 'Portal', to: '/home' }, { label: 'Assistance' }, { label: 'AI assistant' }]}
        actions={
          <>
            <button type="button" className="ap-btn ap-btn--secondary" onClick={() => openChatWithPrompt()}>
              <Sparkles size={14} /> Open floating assistant
            </button>
            <button type="button" className="ap-btn ap-btn--ghost" onClick={clearChatHistory} disabled={chatHistory.length === 0}>
              <Eraser size={14} /> Clear conversation
            </button>
          </>
        }
      />

      <Notice tone="warn" title="No hosted language model is connected in this build.">
        The assistant runs entirely in your browser using deterministic rules, your workspace records and the disease library.
        It does not call an external AI provider, it does not learn from your data, and it cannot see anything you have not
        saved to AGRIPULSE. Field decisions remain yours — confirm anything critical with your extension officer.
      </Notice>

      <div className="ap-split">
        <SectionCard
          title="Conversation"
          description="Answers that reference your records quote the value and its source so you can verify it in the module."
          icon={<Bot size={15} />}
          actions={<StatusBadge tone="info">Rule-based guidance</StatusBadge>}
        >
          <div
            className="ap-stack"
            style={{ maxHeight: 460, overflowY: 'auto', paddingRight: 4 }}
            aria-live="polite"
            aria-label="Assistant conversation"
          >
            {chatHistory.length === 0 && (
              <EmptyState
                icon={<Sparkles size={19} />}
                title="Ask your first question"
                description="Try one of the suggested questions, or type your own. For example: “Should I irrigate Plot A2 today?”"
              />
            )}
            {chatHistory.map((message) => (
              <div key={message.id} style={{ display: 'flex', flexDirection: 'column', alignItems: message.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                <div
                  className="ap-card"
                  style={{
                    maxWidth: '86%',
                    padding: '11px 14px',
                    borderRadius: 14,
                    background: message.sender === 'user' ? 'linear-gradient(180deg,#2f6330,#285b32)' : undefined,
                    color: message.sender === 'user' ? '#fff' : undefined,
                    borderColor: message.sender === 'user' ? 'transparent' : undefined,
                    boxShadow: 'var(--ap-shadow-sm)',
                  }}
                >
                  <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{message.text}</p>
                  {message.suggestedLinks && message.suggestedLinks.length > 0 && (
                    <div className="ap-row ap-no-print" style={{ marginTop: 10, gap: 6 }}>
                      {message.suggestedLinks.map((link) => (
                        <button
                          key={link.route + link.label}
                          type="button"
                          className="ap-btn ap-btn--secondary ap-btn--sm"
                          onClick={() => navigate(link.route)}
                        >
                          {link.label} <ArrowUpRight size={12} />
                        </button>
                      ))}
                    </div>
                  )}
                  {message.sourceCitations && message.sourceCitations.length > 0 && (
                    <ul style={{ margin: '9px 0 0', paddingLeft: 16, fontSize: 10.5, lineHeight: 1.6, color: message.sender === 'user' ? 'rgba(255,255,255,0.8)' : 'var(--ap-text-soft)' }}>
                      {message.sourceCitations.map((citation) => (
                        <li key={citation}>{citation}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <span className="ap-help" style={{ marginTop: 4 }}>
                  {message.sender === 'user' ? 'You' : message.modeLabel || 'AGRIPULSE rule engine'} · {formatTimestamp(message.timestamp)}
                </span>
              </div>
            ))}
            {thinking && (
              <div className="ap-row" style={{ gap: 8 }}>
                <Sparkles size={14} className="animate-pulse" aria-hidden="true" />
                <span className="ap-help">Checking your saved farm records…</span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            className="ap-row ap-no-print"
            style={{ marginTop: 14, gap: 9 }}
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
          >
            <label className="ap-field" style={{ flex: 1 }}>
              <span className="sr-only">Ask the AGRIPULSE assistant</span>
              <input
                type="text"
                className="ap-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about readings, irrigation, crop symptoms, devices or records…"
                disabled={thinking}
              />
            </label>
            <button type="submit" className="ap-btn ap-btn--primary" disabled={thinking || input.trim().length === 0}>
              <Send size={14} /> Ask
            </button>
          </form>
        </SectionCard>

        <div className="ap-stack">
          <SectionCard title="Suggested questions" description="Each prompt is answered with your data where it exists, and with reference material where it does not." icon={<Sparkles size={15} />}>
            <div className="ap-stack ap-stack--tight">
              {PROMPT_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="ap-kpi-label" style={{ marginBottom: 6 }}>
                    {group.icon} {group.title}
                  </p>
                  <div className="ap-row" style={{ gap: 6 }}>
                    {group.prompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="ap-btn ap-btn--secondary ap-btn--sm"
                        style={{ whiteSpace: 'normal', textAlign: 'left' }}
                        onClick={() => void send(prompt)}
                        disabled={thinking}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Sources the assistant can use" icon={<BookOpen size={15} />}>
            <ul className="ap-list">
              {[
                { label: `Farm records: ${farms.filter((farm) => !farm.isArchived).length} farm(s)`, to: '/farm' },
                { label: `Crop records: ${activeFarmCrops.length} on this farm`, to: '/crop-health' },
                { label: `Field observations: ${activeFarmObservations.length}`, to: '/soil' },
                { label: `Devices: ${devices.filter((device) => device.status !== 'retired').length} registered`, to: '/devices' },
                { label: 'Disease library: documented reference entries', to: '/disease' },
                { label: `Dictionary terms: ${dictionary.length}`, to: '/dictionary' },
              ].map((source) => (
                <li key={source.label} className="ap-list-item" style={{ padding: '9px 0' }}>
                  <span className="ap-list-marker" aria-hidden="true">
                    <Leaf size={13} />
                  </span>
                  <span className="ap-list-body">
                    <span style={{ fontSize: 11.5, fontWeight: 600 }}>{source.label}</span>
                  </span>
                  <Link className="ap-btn ap-btn--ghost ap-btn--sm" to={source.to}>
                    Open
                  </Link>
                </li>
              ))}
            </ul>
            <Notice tone="neutral" style={{ marginTop: 12 }}>
              Weather answers use <ProvenanceTag kind="forecast" /> data from the configured source, and sample-forecast values are
              labelled as such. Marketplace and scheme answers reference demonstrational catalogues.
            </Notice>
          </SectionCard>

          <SectionCard title="Limitations" icon={<Bot size={15} />}>
            <Accordion question="Can it diagnose my crop?" defaultOpen>
              No. It can explain symptoms, list likely causes from the reference library and suggest checks to perform, but it does
              not confirm a disease. Confirmation needs laboratory or expert inspection.
            </Accordion>
            <Accordion question="Does it use my sensor readings?">
              Yes — when a stored reading exists it cites the value, its source tag and the timestamp. When no reading exists, the
              answer says so instead of inventing a value.
            </Accordion>
            <Accordion question="Is my data sent anywhere?">
              No. Answers are generated locally in the browser from the workspace already synchronised with your account.
            </Accordion>
            <Accordion question="Marketplace help">
              Store, order and scheme answers describe the demonstration catalogue. No real order, payment or delivery is created
              by asking the assistant.
            </Accordion>
            <div className="ap-row" style={{ marginTop: 10 }}>
              <Link className="ap-btn ap-btn--secondary ap-btn--sm" to="/store">
                <Store size={13} /> Demonstration store
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};
