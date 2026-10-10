import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Stethoscope } from "lucide-react";

export function AuthFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="auth-page">
      <header className="auth-header">
        <Link href="/" className="auth-brand" aria-label="MedAI Pro home">
          <span><Stethoscope size={19} /></span>
          <b>MedAI <i>Pro</i></b>
        </Link>
        <Link href="/" className="auth-back"><ArrowLeft size={14} /> Back to overview</Link>
      </header>
      <div className="auth-layout">
        <section className="auth-aside">
          <p className="auth-aside-label"><span /> CARE CONTEXT / SECURE ACCESS</p>
          <h1>Clinical context,<br /><em>within reach.</em></h1>
          <p className="auth-aside-copy">Patient records, useful signals, and thoughtful decision support in one calm workspace.</p>
          <div className="auth-art-wrap">
            <div className="auth-art-ring auth-art-ring-one" />
            <div className="auth-art-ring auth-art-ring-two" />
            <Image src="/app_logo.png" alt="MedAI clinical intelligence mark" width={684} height={684} priority />
          </div>
          <div className="auth-assurance"><ShieldCheck size={16} /> Secure access for clinical teams</div>
        </section>
        <section className="auth-form-section" aria-labelledby="auth-title">
          <div className="auth-form-wrap">
            <p className="auth-eyebrow">{eyebrow}</p>
            <h2 id="auth-title">{title}</h2>
            <p className="auth-description">{description}</p>
            {children}
          </div>
        </section>
      </div>
      <style jsx global>{`
        .auth-page { min-height: 100vh; color: #15313a; background: #f8fbf9; }
        .auth-header { height: 72px; padding: 0 5.5%; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #dbe6e3; background: rgba(255,255,255,.76); }
        .auth-brand { display: inline-flex; align-items: center; gap: 10px; color: #15313a; text-decoration: none; font-size: 17px; }
        .auth-brand > span { width: 32px; height: 32px; display: grid; place-items: center; color: #fff; background: #147d70; border-radius: 8px; }
        .auth-brand b { font-weight: 650; }.auth-brand i { color: #147d70; font-style: normal; }
        .auth-back { display: inline-flex; align-items: center; gap: 7px; color: #61777a; text-decoration: none; font-size: 12px; }
        .auth-back:hover { color: #147d70; }
        .auth-layout { min-height: calc(100vh - 72px); display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(400px, .95fr); }
        .auth-aside { position: relative; isolation: isolate; overflow: hidden; padding: clamp(44px, 7vw, 92px) clamp(28px, 7vw, 94px); background: #eaf4f0; }
        .auth-aside::before { position: absolute; z-index: -1; inset: 0; content: ""; opacity: .46; background-image: linear-gradient(rgba(21,49,58,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(21,49,58,.045) 1px, transparent 1px); background-size: 34px 34px; mask-image: linear-gradient(135deg, black, transparent 83%); }
        .auth-aside-label, .auth-eyebrow { display: flex; align-items: center; gap: 8px; color: #648080; font-size: 9px; font-weight: 700; letter-spacing: 1px; }
        .auth-aside-label > span { width: 6px; height: 6px; border-radius: 50%; background: #e77e62; }
        .auth-aside h1 { margin: 32px 0 14px; font: 400 clamp(38px, 4vw, 56px)/1.05 Georgia, serif; }
        .auth-aside h1 em { color: #147d70; font-weight: 400; }
        .auth-aside-copy { max-width: 390px; color: #61777a; font-size: 14px; line-height: 1.75; }
        .auth-art-wrap { position: relative; display: grid; place-items: center; max-width: 350px; aspect-ratio: 1; margin: 18px auto 0; }
        .auth-art-wrap img { z-index: 1; width: min(72%, 255px); height: auto; border-radius: 50%; box-shadow: 0 18px 55px rgba(37,95,104,.13); }
        .auth-art-ring { position: absolute; width: 78%; aspect-ratio: 1; border: 1px solid rgba(20,125,112,.18); border-radius: 50%; }
        .auth-art-ring-two { width: 100%; border-color: rgba(20,125,112,.1); }
        .auth-assurance { display: flex; align-items: center; gap: 8px; color: #698082; font-size: 11px; }
        .auth-assurance svg { color: #147d70; }
        .auth-form-section { display: flex; justify-content: center; align-items: center; padding: 54px clamp(28px, 6vw, 82px); background: #fff; }
        .auth-form-wrap { width: 100%; max-width: 390px; animation: auth-rise .45s ease-out both; }
        .auth-eyebrow { margin: 0 0 16px; text-transform: uppercase; }
        .auth-form-wrap h2 { margin: 0; color: #15313a; font: 400 36px/1.14 Georgia, serif; }
        .auth-description { margin: 10px 0 28px; color: #718487; font-size: 13px; line-height: 1.65; }
        .auth-form { display: grid; gap: 16px; }
        .auth-field { display: grid; gap: 7px; color: #52696c; font-size: 11px; font-weight: 650; }
        .auth-field input { width: 100%; min-height: 44px; padding: 0 12px; border: 1px solid #dbe6e3; border-radius: 4px; outline: none; color: #15313a; background: #fbfdfc; font: inherit; font-size: 13px; }
        .auth-field input:focus { border-color: #147d70; box-shadow: 0 0 0 3px rgba(20,125,112,.12); }
        .auth-field input::placeholder { color: #9aabaa; }
        .auth-submit { display: flex; min-height: 46px; align-items: center; justify-content: center; gap: 9px; margin-top: 5px; border: 1px solid #147d70; border-radius: 4px; color: white; background: #147d70; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; transition: background .2s, transform .2s; }
        .auth-submit:hover:not(:disabled) { background: #0d655b; transform: translateY(-1px); }
        .auth-submit:disabled { opacity: .6; cursor: wait; }
        .auth-error { padding: 10px 12px; border: 1px solid #efd1c8; color: #a84936; background: #fff5f1; font-size: 12px; line-height: 1.5; }
        .auth-switch { margin-top: 24px; padding-top: 19px; border-top: 1px solid #e7eeeb; color: #718487; text-align: center; font-size: 12px; }
        .auth-switch a { margin-left: 5px; color: #147d70; font-weight: 700; text-decoration: none; }
        .auth-switch a:hover { text-decoration: underline; }
        @keyframes auth-rise { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 820px) { .auth-layout { grid-template-columns: 1fr; }.auth-aside { display: none; }.auth-form-section { min-height: calc(100vh - 72px); padding: 46px 24px; } }
        @media (max-width: 460px) { .auth-header { height: 64px; padding: 0 18px; }.auth-layout { min-height: calc(100vh - 64px); }.auth-form-section { min-height: calc(100vh - 64px); padding: 36px 22px; }.auth-form-wrap h2 { font-size: 32px; } }
        @media (prefers-reduced-motion: reduce) { .auth-form-wrap { animation: none; }.auth-submit { transition: none; } }
      `}</style>
    </main>
  );
}
