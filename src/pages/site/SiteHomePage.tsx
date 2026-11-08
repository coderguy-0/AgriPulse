import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  CloudSun,
  Droplets,
  Leaf,
  LoaderCircle,
  MapPinned,
  RadioTower,
  ShieldCheck,
  Sprout,
  Store,
  SunMedium,
  Waves,
} from 'lucide-react';
import { useAgriPulse } from '../../context/AgriPulseContext';

const features = [
  { icon: <MapPinned />, number: '01', title: 'A living picture of your farm', text: 'Bring fields, plots, crops and observations together in a useful record that grows with every season.', link: '/digital-twin', label: 'Explore the farm twin' },
  { icon: <Waves />, number: '02', title: 'Stay close to the soil', text: 'Connect sensor nodes and review readings with their source, timestamp and context in view.', link: '/technology', label: 'See how it connects' },
  { icon: <CloudSun />, number: '03', title: 'Plan with better context', text: 'Keep forecasts, field notes and practical crop references together—without confusing samples for live data.', link: '/ai-capabilities', label: 'Explore field intelligence' },
];

export const SiteHomePage: React.FC = () => {
  const { session, loginAsFarmerDemo, loginAsSellerDemo } = useAgriPulse();
  const navigate = useNavigate();
  const [opening, setOpening] = useState<'farmer' | 'seller' | null>(null);
  const [demoError, setDemoError] = useState('');

  const openDemo = async (portal: 'farmer' | 'seller') => {
    if (session) {
      navigate(session.portalType === 'seller' ? '/seller' : '/home');
      return;
    }
    setOpening(portal);
    setDemoError('');
    try {
      const result = portal === 'farmer' ? await loginAsFarmerDemo() : await loginAsSellerDemo();
      if (result.ok) navigate(portal === 'seller' ? '/seller' : '/home');
      else setDemoError(result.error || 'The demo workspace could not be opened. Please try again.');
    } catch {
      setDemoError('The demo workspace could not be opened. Please try again.');
    } finally {
      setOpening(null);
    }
  };

  return (
    <div className="harvest-home">
      <section className="harvest-hero" aria-labelledby="harvest-title">
        <img className="harvest-hero-image" src="/agripulse-hero.jpg" alt="AI-generated illustrative scene of a farmer looking across green fields at sunrise" width="1536" height="1024" fetchPriority="high" />
        <div className="harvest-hero-shade" />
        <div className="harvest-hero-inner">
          <div className="harvest-hero-copy">
            <p className="harvest-eyebrow"><span /> MADE FOR THE WAY FARMING REALLY WORKS</p>
            <h1 id="harvest-title">Know your land.<br />Grow with <em>confidence.</em></h1>
            <p className="harvest-hero-lead">One thoughtful workspace for your fields, crops, soil and season—so the next decision starts with a clearer picture.</p>
            <div className="harvest-actions">
              <button type="button" className="harvest-button" onClick={() => void openDemo('farmer')} disabled={opening !== null}>
                {opening === 'farmer' ? <LoaderCircle className="harvest-spin" size={17} /> : <Sprout size={17} />}
                Explore the farmer demo <ArrowUpRight size={17} />
              </button>
              <Link to="/platform" className="harvest-button harvest-button--outline">Discover the platform <ArrowRight size={16} /></Link>
            </div>
            {demoError && <p className="harvest-demo-error" role="alert">{demoError}</p>}
            <div className="harvest-trust-line"><ShieldCheck size={15} /> Start with a farm record. Add connected hardware when you’re ready.</div>
          </div>
          <div className="harvest-hero-card" aria-label="Farm workspace preview. Sample interface, not live farm data.">
            <div className="harvest-float-top"><span className="harvest-live-dot" /> YOUR FARM, IN FOCUS <span className="harvest-sample-tag">PREVIEW</span></div>
            <div className="harvest-farm-label"><span className="harvest-farm-avatar"><Leaf size={18} /></span><div><strong>Green Horizon Farm</strong><span>Karnal, Haryana · Sample workspace</span></div><ArrowUpRight size={16} /></div>
            <div className="harvest-metric-row">
              <div><span className="harvest-metric-icon"><Droplets size={16} /></span><small>Soil moisture</small><strong>— <i>%</i></strong><em>Awaiting sensor data</em></div>
              <div><span className="harvest-metric-icon harvest-metric-icon--sun"><SunMedium size={16} /></span><small>Field conditions</small><strong>Clear <i>view</i></strong><em>Record what you observe</em></div>
            </div>
            <div className="harvest-card-bottom"><span><MapPinned size={14} /> 3 plots on your map</span><span><BarChart3 size={14} /> Season overview <ArrowRight size={13} /></span></div>
          </div>
          <a className="harvest-scroll-cue" href="#made-for-fields" aria-label="Scroll to learn more"><ArrowDownRight size={17} /> SCROLL TO EXPLORE</a>
          <span className="harvest-image-credit">AI-GENERATED FIELD SCENE · SAMPLE WORKSPACE PREVIEW</span>
        </div>
      </section>

      <section className="harvest-demo-strip" aria-label="Try AGRIPULSE">
        <div className="harvest-demo-intro"><span className="harvest-demo-icon"><Sprout size={20} /></span><div><p>TAKE A LOOK AROUND</p><strong>Explore AGRIPULSE with a demo workspace</strong></div></div>
        <div className="harvest-demo-actions">
          <button type="button" onClick={() => void openDemo('farmer')} disabled={opening !== null}>
            <span className="harvest-demo-role-icon"><Sprout size={17} /></span><span><strong>{opening === 'farmer' ? 'Opening farmer demo…' : 'Farmer workspace'}</strong><small>Fields, crops & field insights</small></span><ArrowUpRight size={16} />
          </button>
          <button type="button" onClick={() => void openDemo('seller')} disabled={opening !== null}>
            <span className="harvest-demo-role-icon harvest-demo-role-icon--seller"><Store size={17} /></span><span><strong>{opening === 'seller' ? 'Opening seller demo…' : 'Seller workspace'}</strong><small>Catalog & inventory preview</small></span><ArrowUpRight size={16} />
          </button>
        </div>
      </section>

      <section id="made-for-fields" className="harvest-section harvest-section--intro">
        <div className="harvest-section-head"><div><p className="harvest-kicker">A CLEARER VIEW, FROM THE GROUND UP</p><h2>Made for fields.<br /><em>Thoughtful by design.</em></h2></div><p>Good farming is built on close observation and hard-won experience. AGRIPULSE brings useful context into one place—without pretending a screen can replace either.</p></div>
        <div className="harvest-capabilities">{features.map((item) => <article key={item.number}><div className="harvest-capability-top"><span>{item.icon}</span><span>{item.number}</span></div><h3>{item.title}</h3><p>{item.text}</p><Link to={item.link}>{item.label}<ArrowRight size={16} /></Link></article>)}</div>
      </section>

      <section className="harvest-story-grid">
        <div className="harvest-story-visual">
          <img src="/agripulse-hero.jpg" alt="Rows of crops in a Haryana field at first light" loading="lazy" />
          <div className="harvest-story-caption"><span>FIELD NOTES · 01</span><strong>Every good season begins<br />with paying attention.</strong></div>
          <span className="harvest-image-credit">Illustrative landscape</span>
        </div>
        <div className="harvest-story-copy"><p className="harvest-kicker">YOUR FARM, YOUR CONTEXT</p><h2>One season at a time.<br /><em>One clearer decision at a time.</em></h2><p>Start with the details you already know. Add crop records, field observations and connected sensors as your needs grow. AGRIPULSE keeps the story of your farm together.</p><ul><li><Check size={17} /> Keep farms, plots and crop records connected</li><li><Check size={17} /> See where a reading came from and when it was recorded</li><li><Check size={17} /> Know what is sample, measured, forecast or still missing</li></ul><Link className="harvest-text-link" to="/how-it-works">See how it works <ArrowRight size={16} /></Link></div>
      </section>

      <section className="harvest-knowledge">
        <div className="harvest-knowledge-heading"><span className="harvest-knowledge-mark"><BookOpen size={21} /></span><div><p className="harvest-kicker">MORE THAN A DASHBOARD</p><h2>Good tools leave room for good judgment.</h2></div></div>
        <p>Explore crop-health references, an English–Hindi dictionary and a place to review farm information. Guidance is educational; it is not a confirmed diagnosis or a substitute for local expertise.</p>
        <Link to="/farmer/login">Explore the farmer workspace <ArrowUpRight size={17} /></Link>
      </section>

      <section className="harvest-cta"><div className="harvest-cta-orbit"><Sprout size={25} /></div><p className="harvest-kicker">A BETTER PLACE TO BEGIN</p><h2>Bring your farm into focus.</h2><p>Take a first look with a demo—or make a workspace of your own.</p><div className="harvest-cta-actions"><button type="button" className="harvest-button" onClick={() => void openDemo('farmer')} disabled={opening !== null}>Explore the farmer demo <ArrowUpRight size={17} /></button><Link className="harvest-button harvest-button--light" to="/farmer/signup">Create an account <ArrowRight size={16} /></Link></div><span className="harvest-prototype-note"><ShieldCheck size={14} /> Demonstration platform · sample information is labelled in the workspace</span></section>
    </div>
  );
};
