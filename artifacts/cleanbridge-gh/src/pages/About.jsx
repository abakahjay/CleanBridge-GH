import { Link } from 'wouter';
import { ArrowLeft, ArrowRight, Compass, Eye, Flag, Leaf, Lightbulb, Target, TrendingUp, Users } from 'lucide-react';
import { Logo, ThemeToggle } from '../components/ui.jsx';
import { AUTHOR_NAME, PORTFOLIO_URL } from '../lib/contact.js';
import { BUSINESS_MODEL, GOALS, IMPACT, MARKET, MISSION, PROBLEM, ROADMAP, SOLUTION, VALUES, VISION } from '../content/about.js';

const Section = ({ icon: Icon, eyebrow, title, children }) => <section className="about-section">
  <div className="about-head"><div className="card-icon sm"><Icon size={16} /></div><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2></div></div>
  {children}
</section>;

const Cards = ({ items }) => <div className="about-cards">{items.map(([title, text]) => <div className="panel panel-pad" key={title}><strong>{title}</strong><p>{text}</p></div>)}</div>;

export default function About() {
  return <div className="legal-page about-page">
    <header className="legal-head"><Link href="/"><Logo /></Link><div style={{ display: 'flex', gap: '.5rem' }}><ThemeToggle /><Link href="/" className="btn btn-ghost btn-sm"><ArrowLeft size={14} /> Home</Link></div></header>

    <div className="about-hero">
      <div className="eyebrow">About CleanBridge GH</div>
      <h1>Bridging homes and collectors for a cleaner Ghana.</h1>
      <p className="muted">CleanBridge GH is a waste-collection platform that connects households and businesses with verified collectors — with upfront prices, Mobile Money payments and live tracking.</p>
    </div>

    <div className="mv-grid">
      <div className="panel panel-pad mv-card"><Compass size={20} /><div className="eyebrow">Our mission</div><p>{MISSION}</p></div>
      <div className="panel panel-pad mv-card"><Eye size={20} /><div className="eyebrow">Our vision</div><p>{VISION}</p></div>
    </div>

    <Section icon={Leaf} eyebrow="What we stand for" title="Our values"><Cards items={VALUES} /></Section>

    <Section icon={Lightbulb} eyebrow="Why we exist" title="The problem">
      <ul className="about-list">{PROBLEM.map((p) => <li key={p}>{p}</li>)}</ul>
    </Section>

    <Section icon={Target} eyebrow="What we built" title="Our solution"><Cards items={SOLUTION} /></Section>

    <Section icon={Users} eyebrow="Who we serve" title="Our market"><Cards items={MARKET} /></Section>

    <Section icon={TrendingUp} eyebrow="How we sustain it" title="Business model"><Cards items={BUSINESS_MODEL} /></Section>

    <Section icon={Flag} eyebrow="Where we’re going" title="Goals">
      <div className="timeline about-timeline">{GOALS.map(([when, what]) => <div className="timeline-item" key={when}><div className="timeline-dot" /><div className="timeline-copy"><strong>{when}</strong><span>{what}</span></div></div>)}</div>
      <p className="muted" style={{ fontSize: '.72rem' }}>These are targets we are working towards.</p>
    </Section>

    <Section icon={Compass} eyebrow="Roadmap" title="What’s next"><Cards items={ROADMAP} /></Section>

    <Section icon={Leaf} eyebrow="Impact" title="Sustainable Development Goals we contribute to">
      <div className="chip-row">{IMPACT.map(([code, name]) => <span className="chip" key={code}><strong>{code}</strong> · {name}</span>)}</div>
    </Section>

    <div className="about-cta panel panel-pad">
      <div><strong>Built in Ghana by <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">{AUTHOR_NAME}</a>.</strong><p className="muted">Want a cleaner street? Book a pickup — or join us as a collector.</p></div>
      <div className="row-actions"><Link className="btn btn-primary" href="/pickup">Request a pickup <ArrowRight size={15} /></Link><Link className="btn btn-outline" href="/register?role=collector">Become a collector</Link></div>
    </div>
  </div>;
}
