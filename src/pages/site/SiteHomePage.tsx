import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Sprout, RadioTower, CloudSun, Map, ShieldCheck, BookOpen, ShoppingBag, Bot, Droplets, Thermometer, Wind, Layers, Check, Wifi } from 'lucide-react';

const capabilities = [
  { number: '01', icon: <Map size={24} />, title: 'Your farm. Every detail.', text: 'Bring farms, plots, crops and field observations together. Build a useful record, one season at a time.', to: '/digital-twin', link: 'Explore farm management', tag: 'FARMS & FIELD RECORDS' },
  { number: '02', icon: <RadioTower size={24} />, title: 'A closer connection to the soil.', text: 'Register nodes and LoRa gateways. Review real readings, last communication and measurement history when hardware is connected.', to: '/technology', link: 'Discover connected farming', tag: 'DEVICES & SOIL MONITORING' },
  { number: '03', icon: <CloudSun size={24} />, title: 'Look ahead, with context.', text: 'Keep provider forecasts separate from field measurements. Use the evidence behind a recommendation—not just a number.', to: '/ai-capabilities', link: 'Understand the insights', tag: 'WEATHER & FIELD INTELLIGENCE' },
];

export const SiteHomePage: React.FC = () => <div className="harvest-home">
  <section className="harvest-hero" aria-labelledby="harvest-title">
    <img className="harvest-hero-image" src="/images/field-landscape.webp" alt="Illustrative green crop rows in a warm, sunlit farming landscape" width="1536" height="1024" loading="eager" />
    <div className="harvest-hero-shade" />
    <div className="harvest-hero-content">
      <p className="harvest-eyebrow"><span /> ROOTED IN FARMING. CONNECTED BY TECHNOLOGY.</p>
      <h1 id="harvest-title">Good farming starts<br />with a <em>clearer picture.</em></h1>
      <p className="harvest-hero-lead">Know your soil. Understand your fields. Plan your next move.<br className="hidden sm:block" /> One connected workspace for a more informed farming season.</p>
      <div className="harvest-actions"><Link to="/farmer/signup" className="harvest-button">Start your farm workspace <ArrowUpRight size={18} /></Link><Link to="/seller/signup" className="harvest-button harvest-button--outline">Join as a seller <ArrowRight size={16} /></Link></div>
      <p className="harvest-hero-note"><ShieldCheck size={14} /> Your farm data stays in your account. Hardware is optional to get started.</p>
    </div>
    <div className="harvest-field-note"><span className="harvest-field-icon"><Sprout size={22} /></span><div><strong>Better context. Thoughtful decisions.</strong><span>From the soil beneath you to the season ahead.</span></div></div>
    <span className="harvest-image-credit">AI-generated landscape · not an actual AGRIPULSE farm</span>
  </section>

  <div className="harvest-proof" aria-label="Platform capabilities">{[{ icon: <Layers />, label: 'Farm & plot management' }, { icon: <RadioTower />, label: 'Connected soil monitoring' }, { icon: <CloudSun />, label: 'Weather intelligence' }, { icon: <BookOpen />, label: 'English & Hindi references' }].map((item) => <div key={item.label}>{item.icon}<span>{item.label}</span></div>)}</div>

  <section className="harvest-section">
    <div className="harvest-section-head"><div><p className="harvest-kicker">THE WHOLE FARM, IN FOCUS</p><h2>Less guesswork.<br />More understanding.</h2></div><p>Good decisions need the right information.<br />AGRIPULSE brings your field records, connected<br className="hidden lg:block" /> equipment and agricultural knowledge into one place.</p></div>
    <div className="harvest-capabilities">{capabilities.map((item) => <article key={item.number}><div className="harvest-capability-top"><span>{item.icon}</span><span>{item.number}</span></div><p className="harvest-kicker">{item.tag}</p><h3>{item.title}</h3><p>{item.text}</p><Link to={item.to}>{item.link}<ArrowUpRight size={17} /></Link></article>)}</div>
  </section>

  <section className="harvest-workspace">
    <div className="harvest-workspace-copy"><p className="harvest-kicker">A WORKSPACE THAT GROWS WITH YOU</p><h2>Your fields,<br />not another spreadsheet.</h2><p>Start with one farm and a few observations. Add plots, crop records and devices when you’re ready. Everything stays connected to the right field.</p><ul>{['Switch between farms and plots', 'Record crops, growth stages and field observations', 'See timestamps, sources and missing data clearly'].map((text) => <li key={text}><Check size={17} />{text}</li>)}</ul><Link className="harvest-text-link" to="/platform">Take a closer look <ArrowRight size={17} /></Link></div>
    <div className="harvest-dashboard-preview" aria-label="Illustrative dashboard preview; no live farm readings">
      <div className="harvest-preview-bar"><span><Sprout size={18} /> AGRIPULSE</span><span className="harvest-preview-label">WORKSPACE PREVIEW</span></div>
      <div className="harvest-preview-body"><div className="harvest-preview-greeting"><div><p>YOUR FARM AT A GLANCE</p><h3>A new season starts here.</h3></div><span><Map size={14} /> Your selected farm</span></div>
        <div className="harvest-preview-metrics">{[{ icon: <Droplets />, name: 'Soil moisture', unit: '%' }, { icon: <Thermometer />, name: 'Soil temperature', unit: '°C' }, { icon: <Wind />, name: 'Air humidity', unit: '% RH' }].map((metric) => <div key={metric.name}>{metric.icon}<span>{metric.name}</span><strong>— <small>{metric.unit}</small></strong><p>Awaiting a valid reading</p></div>)}</div>
        <div className="harvest-preview-plot"><div><span><Layers size={16} /> Field overview</span><span>Illustrative plot layout</span></div><div className="harvest-plot-grid"><span>Plot A<br /><small>Add crop details</small></span><span>Plot B<br /><small>Add crop details</small></span><span>Plot C<br /><small>Add crop details</small></span></div></div>
        <p className="harvest-preview-bottom"><Wifi size={14} /> No device connected · register and pair hardware to see measurements.</p>
      </div>
    </div>
  </section>

  <section className="harvest-section harvest-sensors"><div><p className="harvest-kicker">CONNECTED TO WHAT MATTERS</p><h2>Four sensor types.<br />One clearer view of your soil.</h2><p>The approved AGRIPULSE node brings together capacitive soil moisture, soil NPK, soil temperature and air humidity sensors. Nitrogen, phosphorus and potassium are three readings from one NPK sensor.</p><Link className="harvest-text-link" to="/technology">See the technology <ArrowRight size={17} /></Link></div><div className="harvest-sensor-flow"><div className="harvest-sensor-list">{['Capacitive soil moisture', 'Soil NPK · N / P / K', 'Soil temperature', 'Air humidity'].map((sensor) => <span key={sensor}><Sprout size={16} />{sensor}</span>)}</div><div className="harvest-flow-path"><span>Sensor node</span><ArrowRight size={16} /><span>LoRa gateway</span><ArrowRight size={16} /><span>AGRIPULSE</span></div><p><ShieldCheck size={16} /> Registration is not connectivity. Status comes from authenticated communication; converted readings require documented calibration. Rainfall comes from an online weather provider, never a physical rain sensor.</p></div></section>

  <section className="harvest-section"><div className="harvest-section-head"><div><p className="harvest-kicker">KNOWLEDGE FOR THE SEASON AHEAD</p><h2>A little more insight.<br />A better place to begin.</h2></div></div><div className="harvest-resource-grid">{[
    { icon: <BookOpen size={23} />, title: 'Agricultural knowledge', body: 'Explore crop disease references and a bilingual English–Hindi dictionary. Reference material supports learning, not a confirmed diagnosis.', to: '/farmer/login', label: 'Explore the farmer portal' },
    { icon: <Bot size={23} />, title: 'Meet AgriSense', body: 'A home for agricultural questions and farm context. AI advice requires a configured provider; reference and demo guidance are labeled separately.', to: '/ai-capabilities', label: 'About the AI Advisor' },
    { icon: <ShoppingBag size={23} />, title: 'A space for agricultural sellers', body: 'Seller Central brings catalog and inventory workflows into the same AGRIPULSE experience. Checkout and orders are currently a demonstration, not live commerce.', to: '/seller/signup', label: 'Discover Seller Central' },
  ].map((resource) => <article key={resource.title}>{resource.icon}<h3>{resource.title}</h3><p>{resource.body}</p><Link to={resource.to}>{resource.label}<ArrowUpRight size={17} /></Link></article>)}</div></section>

  <section className="harvest-cta"><Sprout size={38} /><p className="harvest-kicker">YOUR NEXT SEASON, BETTER CONNECTED</p><h2>Start small. See the bigger picture.</h2><p>Your first farm record is a good place to start.</p><Link className="harvest-button" to="/farmer/signup">Create your farmer account <ArrowUpRight size={18} /></Link><Link className="harvest-cta-secondary" to="/how-it-works">See how AGRIPULSE works <ArrowRight size={15} /></Link></section>
</div>;
