import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { SectionCard, Notice } from '../../components/ui/primitives';

export const LegalPage: React.FC = () => {
  const privacy = useLocation().pathname === '/privacy';
  return <div className="ap-stack"><header className="ap-page-head"><div><p className="ap-eyebrow">AGRIPULSE · PLATFORM INFORMATION</p><h1 className="ap-page-title">{privacy ? 'Privacy & your data' : 'Terms of use'}</h1><p className="ap-page-subtitle">Technical platform notice · updated 18 October 2026</p></div><ShieldCheck size={30} /></header>
    <Notice tone="warn" title="Development platform notice">This describes the repository’s current behavior. Before a public launch, the operator must publish reviewed legal policies, its identity, retention periods and a verified contact for privacy requests. These notices are not a legal compliance certification.</Notice>
    {privacy ? <>
      <SectionCard title="What the platform stores"><p>Account details, password hashes, server-side sessions, farm and plot records, observations, device registrations, telemetry and saved workspace content are stored by the API. Never enter device secrets, bank account details or API credentials in notes or chat.</p></SectionCard>
      <SectionCard title="How information is used"><p>Records provide your authenticated workspace, device history and contextual field guidance. Role and account ownership checks protect API access. When configured, weather queries send a selected district and state to WeatherAPI.com. No connected AI provider is enabled by this implementation.</p></SectionCard>
      <SectionCard title="Browser storage and cookies"><p>An HTTP-only session cookie maintains your login. Existing browser workspace storage is retained for compatibility and demonstration data; use a trusted device, and do not treat browser storage as a backup. Signing out invalidates the server session. The development workspace contains explicitly labeled sample records.</p></SectionCard>
      <SectionCard title="Retention and requests"><p>This build does not provide automated account deletion or a guaranteed retention schedule. Contact the deployment operator through its configured contact channel for access, correction, export or deletion requests. The operator must define backup and telemetry retention policies before production.</p><Link className="ap-btn ap-btn--secondary" to="/contact">Contact information</Link></SectionCard>
    </> : <>
      <SectionCard title="Use and limitations"><p>Use AGRIPULSE only for records and devices you are authorized to manage. Protect your credentials and use secure HTTPS deployments. Development demo workspaces are shared examples and must not contain personal or confidential information.</p></SectionCard>
      <SectionCard title="Agricultural decisions"><p>Weather is location-based provider information; forecasts are uncertain and are not farm sensor measurements. Device registration does not prove hardware connectivity. Reference content and rule-based screening do not establish a diagnosis, safe pesticide prescription, guaranteed yield or profit. Consult local experts and official product labels.</p></SectionCard>
      <SectionCard title="Commerce and external services"><p>Current checkout, orders and payment screens are demonstrations. No purchase, payment, refund or delivery is promised. Seller records are not certifications or endorsements. Government scheme information must be verified against the relevant official source. AI, news and weather capabilities depend on separately configured services.</p></SectionCard>
      <SectionCard title="Before production"><p>A reviewed service agreement, operator contact, legally appropriate privacy policy, verified content, production infrastructure and an operational support process are still required.</p><Link className="ap-btn ap-btn--secondary" to="/privacy">Read the privacy notice</Link></SectionCard>
    </>}
  </div>;
};
