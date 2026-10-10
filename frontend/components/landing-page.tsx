import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  Activity,
  BrainCircuit,
  Check,
  ClipboardPlus,
  LockKeyhole,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

const capabilities = [
  {
    icon: ClipboardPlus,
    title: "One patient view",
    description: "Bring visits, medications, labs, and care history together in one clear record.",
    tone: "mint",
  },
  {
    icon: BrainCircuit,
    title: "Clinical context, quickly",
    description: "Turn a patient's record into a concise summary with sources close at hand.",
    tone: "blue",
  },
  {
    icon: Activity,
    title: "Signals worth a second look",
    description: "Surface changing lab trends and potential medication interactions for review.",
    tone: "coral",
  },
];

export default function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <Link className="landing-brand" href="/" aria-label="MedAI Pro home">
          <span className="landing-brand-mark"><Stethoscope size={20} strokeWidth={2.2} /></span>
          <span>MedAI <b>Pro</b></span>
        </Link>
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#platform">Platform</a>
          <a href="#workflow">How it works</a>
        </nav>
        <div className="landing-actions">
          <Link className="landing-signin" href="/auth/login">Sign in</Link>
          <Link className="landing-button landing-button-small" href="/auth/register">
            Get started <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow"><span /> CLINICAL INTELLIGENCE, BUILT AROUND CARE</p>
          <h1>A clearer view of <em>every patient.</em></h1>
          <p className="landing-lede">
            Bring the details together, spot what is changing, and make room for better conversations.
            One calm workspace for the work behind great care.
          </p>
          <div className="landing-hero-actions">
            <Link className="landing-button" href="/auth/register">
              Create your workspace <ArrowRight size={17} />
            </Link>
            <Link className="landing-text-link" href="/auth/login">
              Sign in to your account <ArrowDownRight size={16} />
            </Link>
          </div>
          <div className="landing-assurance">
            <span><Check size={14} /> Patient-first workspace</span>
            <span><Check size={14} /> Clinician-reviewed insights</span>
          </div>
        </div>

        <div className="landing-visual" aria-label="Patient intelligence workspace preview">
          <div className="landing-orbit landing-orbit-one" />
          <div className="landing-orbit landing-orbit-two" />
          <div className="landing-visual-label"><span className="landing-live-dot" /> CARE CONTEXT / 01</div>
          <div className="landing-logo-art">
            <Image src="/app_logo.png" alt="MedAI clinical intelligence mark" width={684} height={684} priority />
          </div>
          <div className="landing-patient-note">
            <div className="landing-note-icon"><Activity size={17} /></div>
            <div>
              <p>Patient context</p>
              <span>Visits · medications · lab trends</span>
            </div>
            <ArrowUpRightIcon />
          </div>
          <div className="landing-visual-caption">CARE, WITH THE FULL PICTURE.</div>
        </div>
      </section>

      <section className="landing-platform" id="platform">
        <div className="landing-section-heading">
          <p className="landing-eyebrow">A PRACTICAL CLINICAL WORKSPACE</p>
          <h2>Less hunting. More understanding.</h2>
          <p>Useful tools that fit into the way care teams already think and work.</p>
        </div>
        <div className="landing-capabilities">
          {capabilities.map(({ icon: Icon, title, description, tone }, index) => (
            <article className="landing-capability" key={title}>
              <div className={`landing-capability-icon ${tone}`}><Icon size={20} strokeWidth={1.8} /></div>
              <span className="landing-capability-number">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-workflow" id="workflow">
        <div className="landing-workflow-copy">
          <p className="landing-eyebrow">DESIGNED FOR CLINICAL TEAMS</p>
          <h2>Good decisions start with a complete picture.</h2>
          <p>Keep the record close, make patterns easier to notice, and keep the clinician in control of every decision.</p>
        </div>
        <div className="landing-workflow-points">
          <div><span><ShieldCheck size={18} /></span><p><b>Context before conclusions</b><small>Relevant history stays connected to each insight.</small></p></div>
          <div><span><LockKeyhole size={18} /></span><p><b>Built for responsible review</b><small>Decision support helps clinicians; it does not replace them.</small></p></div>
        </div>
      </section>

      <footer className="landing-footer">
        <Link className="landing-brand" href="/" aria-label="MedAI Pro home">
          <span className="landing-brand-mark"><Stethoscope size={18} strokeWidth={2.2} /></span>
          <span>MedAI <b>Pro</b></span>
        </Link>
        <p>Clinical intelligence, with care at the center.</p>
        <Link href="/auth/login">Clinician sign in <ArrowRight size={14} /></Link>
      </footer>

      <style jsx global>{`
        .landing-page {
          --ink: #15313a;
          --muted: #647a7e;
          --line: #dbe6e3;
          --green: #147d70;
          color: var(--ink);
          background: #f8fbf9;
          min-height: 100vh;
        }
        .landing-header {
          max-width: 1280px; height: 78px; margin: auto; padding: 0 48px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid rgba(21,49,58,.08);
        }
        .landing-brand { display: inline-flex; align-items: center; gap: 10px; color: var(--ink); font-size: 18px; font-weight: 600; text-decoration: none; }
        .landing-brand b { color: var(--green); font-weight: 600; }
        .landing-brand-mark { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; color: white; background: var(--green); }
        .landing-nav, .landing-actions { display: flex; align-items: center; gap: 30px; }
        .landing-nav a, .landing-signin { color: #52696c; text-decoration: none; font-size: 13px; font-weight: 500; }
        .landing-nav a:hover, .landing-signin:hover { color: var(--green); }
        .landing-button { display: inline-flex; min-height: 48px; padding: 0 19px; align-items: center; justify-content: center; gap: 10px; border: 1px solid var(--green); border-radius: 5px; background: var(--green); color: #fff; text-decoration: none; font-size: 13px; font-weight: 600; transition: background .2s, transform .2s; }
        .landing-button:hover { background: #0d655b; transform: translateY(-1px); }
        .landing-button-small { min-height: 38px; padding: 0 14px; font-size: 12px; }
        .landing-hero { max-width: 1280px; min-height: 580px; margin: auto; padding: 65px 48px 75px; display: grid; grid-template-columns: 1.02fr .98fr; align-items: center; gap: 44px; }
        .landing-hero-copy { max-width: 560px; animation: landing-rise .6s ease-out both; }
        .landing-eyebrow { display: flex; align-items: center; gap: 9px; margin: 0 0 20px; color: #648080; font-size: 10px; font-weight: 700; letter-spacing: 1.1px; }
        .landing-eyebrow > span { width: 7px; height: 7px; border-radius: 50%; background: #e77e62; }
        .landing-hero h1 { max-width: 550px; margin: 0; font-family: Georgia, serif; font-size: clamp(48px, 5vw, 70px); font-weight: 400; line-height: 1.02; letter-spacing: 0; }
        .landing-hero h1 em { color: var(--green); font-weight: 400; }
        .landing-lede { max-width: 470px; margin: 23px 0 0; color: #61777a; font-size: 15px; line-height: 1.75; }
        .landing-hero-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 21px; margin-top: 29px; }
        .landing-text-link { display: inline-flex; align-items: center; gap: 7px; color: var(--ink); text-decoration: none; font-size: 12px; font-weight: 600; }
        .landing-assurance { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 29px; color: #698082; font-size: 11px; }
        .landing-assurance span { display: flex; align-items: center; gap: 6px; }
        .landing-assurance svg { color: var(--green); }
        .landing-visual { position: relative; display: grid; place-items: center; min-height: 435px; overflow: hidden; border: 1px solid #d7e7e1; background: #eaf4f0; animation: landing-rise .75s .1s ease-out both; }
        .landing-visual::before { position: absolute; inset: 0; content: ""; opacity: .46; background-image: linear-gradient(rgba(21,49,58,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(21,49,58,.045) 1px, transparent 1px); background-size: 34px 34px; mask-image: linear-gradient(135deg, black, transparent 78%); }
        .landing-orbit { position: absolute; width: 310px; height: 310px; border: 1px solid rgba(20,125,112,.18); border-radius: 50%; }
        .landing-orbit-one { transform: translate(25px, -2px); }
        .landing-orbit-two { width: 410px; height: 410px; transform: translate(25px, -2px); border-color: rgba(20,125,112,.1); }
        .landing-visual-label { position: absolute; z-index: 1; left: 23px; top: 22px; display: flex; align-items: center; gap: 8px; color: #718a87; font-size: 9px; font-weight: 700; letter-spacing: 1px; }
        .landing-live-dot { width: 6px; height: 6px; border-radius: 50%; background: #e77e62; box-shadow: 0 0 0 4px rgba(231,126,98,.13); }
        .landing-logo-art { position: relative; z-index: 1; width: min(68%, 285px); aspect-ratio: 1; overflow: hidden; border-radius: 50%; box-shadow: 0 18px 55px rgba(37,95,104,.13); }
        .landing-logo-art img { width: 100%; height: 100%; object-fit: cover; }
        .landing-patient-note { position: absolute; z-index: 2; right: 19px; bottom: 53px; display: flex; align-items: center; gap: 11px; min-width: 250px; padding: 13px 14px; border: 1px solid #dce8e4; background: rgba(255,255,255,.96); box-shadow: 0 9px 28px rgba(30,71,72,.09); }
        .landing-note-icon { display: grid; place-items: center; width: 34px; height: 34px; color: #147d70; background: #e5f3ef; }
        .landing-patient-note p { margin: 0 0 3px; font-size: 11px; font-weight: 700; }
        .landing-patient-note span { color: #718487; font-size: 9px; }
        .landing-note-arrow { margin-left: auto; color: #77908c; }
        .landing-visual-caption { position: absolute; left: 23px; bottom: 22px; color: #718a87; font-size: 9px; font-weight: 700; letter-spacing: 1px; }
        .landing-platform { padding: 76px max(48px, calc((100vw - 1184px) / 2)) 82px; background: #fff; }
        .landing-section-heading { max-width: 650px; }
        .landing-section-heading .landing-eyebrow { margin-bottom: 13px; }
        .landing-section-heading h2, .landing-workflow h2 { margin: 0; font-family: Georgia, serif; font-size: 38px; line-height: 1.15; font-weight: 400; letter-spacing: 0; }
        .landing-section-heading > p:last-child { margin: 12px 0 0; color: var(--muted); font-size: 13px; line-height: 1.7; }
        .landing-capabilities { display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 40px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
        .landing-capability { position: relative; min-height: 200px; padding: 25px 28px 26px 0; }
        .landing-capability + .landing-capability { padding-left: 28px; border-left: 1px solid var(--line); }
        .landing-capability-icon { display: grid; place-items: center; width: 39px; height: 39px; margin-bottom: 18px; }
        .landing-capability-icon.mint { color: #147d70; background: #e5f3ef; }
        .landing-capability-icon.blue { color: #267b9c; background: #e8f3f7; }
        .landing-capability-icon.coral { color: #bd654d; background: #fbefeb; }
        .landing-capability-number { position: absolute; top: 28px; right: 24px; color: #9bb0ad; font-size: 10px; }
        .landing-capability h3 { margin: 0 0 8px; font-size: 14px; font-weight: 700; }
        .landing-capability p { max-width: 290px; margin: 0; color: var(--muted); font-size: 12px; line-height: 1.7; }
        .landing-workflow { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; max-width: 1184px; margin: auto; padding: 74px 0; }
        .landing-workflow-copy .landing-eyebrow { margin-bottom: 14px; }
        .landing-workflow h2 { max-width: 520px; }
        .landing-workflow-copy > p:last-child { max-width: 450px; margin: 15px 0 0; color: var(--muted); font-size: 13px; line-height: 1.75; }
        .landing-workflow-points { display: grid; gap: 22px; }
        .landing-workflow-points > div { display: flex; align-items: flex-start; gap: 13px; }
        .landing-workflow-points > div > span { display: grid; flex: 0 0 36px; place-items: center; width: 36px; height: 36px; color: #147d70; background: #e5f3ef; }
        .landing-workflow-points p { margin: 1px 0 0; font-size: 12px; }
        .landing-workflow-points b, .landing-workflow-points small { display: block; }
        .landing-workflow-points b { font-size: 12px; }
        .landing-workflow-points small { margin-top: 5px; color: var(--muted); font-size: 11px; line-height: 1.6; }
        .landing-footer { display: flex; max-width: 1280px; min-height: 76px; align-items: center; justify-content: space-between; gap: 16px; margin: auto; padding: 12px 48px; border-top: 1px solid var(--line); }
        .landing-footer .landing-brand { font-size: 15px; }
        .landing-footer .landing-brand-mark { width: 29px; height: 29px; border-radius: 8px; }
        .landing-footer p { color: #718487; font-size: 10px; }
        .landing-footer > a:last-child { display: inline-flex; align-items: center; gap: 7px; color: var(--green); text-decoration: none; font-size: 11px; font-weight: 600; }
        @keyframes landing-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 800px) {
          .landing-header { height: 68px; padding: 0 22px; }
          .landing-nav { display: none; }
          .landing-actions { gap: 14px; }
          .landing-hero { min-height: initial; grid-template-columns: 1fr; gap: 38px; padding: 62px 22px 54px; }
          .landing-hero h1 { max-width: 600px; font-size: 54px; }
          .landing-visual { min-height: 380px; }
          .landing-platform { padding: 58px 22px; }
          .landing-capabilities { grid-template-columns: 1fr; }
          .landing-capability, .landing-capability + .landing-capability { min-height: initial; padding: 22px 34px 22px 0; border-left: 0; }
          .landing-capability + .landing-capability { border-top: 1px solid var(--line); }
          .landing-capability-icon { margin-bottom: 13px; }
          .landing-capability-number { top: 27px; right: 3px; }
          .landing-workflow { grid-template-columns: 1fr; gap: 30px; padding: 58px 22px; }
          .landing-footer { flex-wrap: wrap; padding: 16px 22px; }
        }
        @media (max-width: 460px) {
          .landing-brand { gap: 7px; font-size: 16px; }
          .landing-brand-mark { width: 30px; height: 30px; }
          .landing-button-small { min-height: 35px; padding: 0 10px; font-size: 11px; }
          .landing-actions { gap: 10px; }
          .landing-signin { font-size: 11px; }
          .landing-hero { padding-top: 48px; }
          .landing-hero h1 { font-size: 46px; }
          .landing-lede { font-size: 14px; }
          .landing-hero-actions { align-items: flex-start; flex-direction: column; gap: 16px; }
          .landing-visual { min-height: 325px; }
          .landing-logo-art { width: min(68%, 225px); }
          .landing-patient-note { right: 10px; bottom: 46px; min-width: 220px; padding: 10px; }
          .landing-section-heading h2, .landing-workflow h2 { font-size: 32px; }
          .landing-footer p { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .landing-hero-copy, .landing-visual { animation: none; }
          .landing-button { transition: none; }
        }
      `}</style>
    </main>
  );
}

function ArrowUpRightIcon() {
  return <ArrowRight className="landing-note-arrow" size={15} aria-hidden="true" />;
}