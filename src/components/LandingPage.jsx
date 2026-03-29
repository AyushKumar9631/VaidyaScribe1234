import { useState, useEffect, useRef } from "react";
import DoctorAuth from "./DoctorAuth";
import AdminAuth from "./AdminAuth";
import { ThemeToggleBtn } from "../context/ThemeContext";

// ── Loader → Logo animation ──────────────────────────────────────────────────
function SplashLoader({ onDone }) {
  const [phase, setPhase] = useState("center"); // center | shrinking | done

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("shrinking"), 2200);
    const t2 = setTimeout(() => onDone(), 3400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === "done") return null;

  return (
    <div className={`splash-overlay ${phase === "shrinking" ? "splash-exit" : ""}`}>
      <div className={`splash-content ${phase === "shrinking" ? "splash-content-exit" : ""}`}>
        <div className="splash-icon">
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <rect width="52" height="52" rx="14" fill="#12b886"/>
            <path d="M14 26C14 19.373 19.373 14 26 14C32.627 14 38 19.373 38 26" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="26" cy="32" r="6" fill="white"/>
            <path d="M22 26L26 22L30 26" stroke="#12b886" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="splash-title">VaidyaScribe</h1>
        <p className="splash-sub">A doctor speaks · A medical record is born</p>
      </div>
    </div>
  );
}

// ── Animated cycling words ───────────────────────────────────────────────────
function CycleWord({ words, className }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % words.length);
        setVisible(true);
      }, 350);
    }, 2000);
    return () => clearInterval(cycle);
  }, [words.length]);

  return (
    <span className={`${className} ${visible ? "cycle-in" : "cycle-out"}`}>
      {words[idx]}
    </span>
  );
}

// ── Typewriter / backspace for "Built for ___" ───────────────────────────────
function TypewriterWord({ words }) {
  const [display, setDisplay] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [typing, setTyping] = useState(true);
  const [charIdx, setCharIdx] = useState(0);

  useEffect(() => {
    const word = words[wordIdx];
    let timeout;
    if (typing) {
      if (charIdx < word.length) {
        timeout = setTimeout(() => setCharIdx(c => c + 1), 90);
      } else {
        timeout = setTimeout(() => setTyping(false), 1400);
      }
    } else {
      if (charIdx > 0) {
        timeout = setTimeout(() => setCharIdx(c => c - 1), 55);
      } else {
        setWordIdx(i => (i + 1) % words.length);
        setTyping(true);
      }
    }
    setDisplay(word.slice(0, charIdx));
    return () => clearTimeout(timeout);
  }, [charIdx, typing, wordIdx, words]);

  return (
    <span className="typewriter-word">
      {display}
      <span className="typewriter-cursor">|</span>
    </span>
  );
}

// ── Customer logos ───────────────────────────────────────────────────────────
const CUSTOMERS = [
  { name: "Jilo Health",    logo: "https://vtucaarhxgazksfyhdax.supabase.co/storage/v1/object/public/assets/Jilo_Health_New_Logo.png",                                                        fallback: "JH",  color: "#3b82f6" },
  { name: "Ruban Hospital", logo: "https://rubanhospitals.com/public/assets/img/ruban.png",                    fallback: "RH",  color: "#10b981" },
  { name: "Mediversal",     logo: "https://www.mediversalhomecare.in/uploads/mediversal_logo_521965c0f6.png",                      fallback: "MV",  color: "#8b5cf6" },
  { name: "NJACK – IIT Patna", logo: "https://njack.iitp.ac.in/home/NJACK%20logo.svg",                                                fallback: "IIT", color: "#f59e0b" },
  { name: "NIT Patna",      logo: "https://www.nitp.ac.in/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo.00e5159e.png&w=128&q=75",                                           fallback: "NIT", color: "#ef4444" },
];

function CustomerLogo({ customer }) {
  const [errored, setErrored] = useState(false);
  return (
    <div className="customer-logo-wrap" title={customer.name}>
      {!errored ? (
        <img
          src={customer.logo}
          alt={customer.name}
          className="customer-logo-img"
          onError={() => setErrored(true)}
        />
      ) : (
        <div
          className="customer-logo-fallback"
          style={{ background: customer.color + "22", color: customer.color, border: `1px solid ${customer.color}33` }}
        >
          {customer.fallback}
        </div>
      )}
      <span className="customer-name">{customer.name}</span>
    </div>
  );
}

// ── Nav ──────────────────────────────────────────────────────────────────────
function NavBar({ onLogin, onAdmin }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav className={`landing-nav ${scrolled ? "landing-nav-scrolled" : ""}`}>
      <div className="nav-logo">
        <div className="nav-logo-mark">
          <svg width="22" height="22" viewBox="0 0 52 52" fill="none">
            <rect width="52" height="52" rx="14" fill="#12b886"/>
            <path d="M14 26C14 19.373 19.373 14 26 14C32.627 14 38 19.373 38 26" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            <circle cx="26" cy="32" r="6" fill="white"/>
          </svg>
        </div>
        <span className="nav-brand">VaidyaScribe</span>
      </div>

      <div className="nav-links">
        <a href="#features" className="nav-link">Features</a>
        <a href="#how-it-works" className="nav-link">How it works</a>
        <a href="#integrations" className="nav-link">Integrations</a>
        <a href="#security" className="nav-link">Security</a>
        <a href="#pricing" className="nav-link">Pricing</a>
      </div>

      <div className="nav-actions">
        <ThemeToggleBtn />
        <button className="nav-btn-ghost" onClick={onAdmin}>Hospital Admin</button>
        <button className="nav-btn-primary" onClick={onLogin}>Doctor Login →</button>
      </div>
    </nav>
  );
}

// ── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-desc">{desc}</p>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const [mode, setMode] = useState(null);
  const [splashDone, setSplashDone] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    if (splashDone) {
      setTimeout(() => setContentVisible(true), 80);
    }
  }, [splashDone]);

  if (mode === "doctor") return <DoctorAuth onBack={() => setMode(null)} />;
  if (mode === "admin")  return <AdminAuth  onBack={() => setMode(null)} />;

  const processingWords = ["Examining", "Transcribing", "Prescribing", "Diagnosing"];
  const builtForWords   = ["Doctors", "Hospitals", "Clinics", "Specialists"];

  return (
    <div className="marketing-root">
      {!splashDone && <SplashLoader onDone={() => setSplashDone(true)} />}

      <div className={`marketing-body ${contentVisible ? "marketing-body-visible" : ""}`}>
        <NavBar onLogin={() => setMode("doctor")} onAdmin={() => setMode("admin")} />

        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <section className="hero-section">
          <div className="hero-noise" />
          <div className="hero-glow" />

          <div className="hero-inner">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              Now live
            </div>

            <h1 className="hero-h1">
              <CycleWord words={processingWords} className="hero-cycle" />
              <br />
              <span className="hero-h1-sub">happens automatically</span>
            </h1>

            <p className="hero-tagline">
              Ambient AI clinical scribe. A doctor speaks — a structured
              medical record is born. No typing. No delays. Full FHIR R4 output.
            </p>

            <p className="hero-built">
              Built for{" "}
              <TypewriterWord words={builtForWords} />
            </p>

            <div className="hero-cta-row">
              <button className="hero-cta-primary" onClick={() => setMode("doctor")}>
                Start Recording Free
              </button>
              <button className="hero-cta-ghost" onClick={() => setMode("admin")}>
                Hospital Admin →
              </button>
            </div>

            <div className="hero-meta">
              <span>🔒 HIPAA-ready architecture</span>
              <span>⚡ &lt; 3s transcription</span>
              <span>🌐 Hindi, English + 8 more</span>
            </div>
          </div>

          {/* terminal mockup */}
          <div className="hero-terminal">
            <div className="terminal-bar">
              <span className="terminal-dot red" />
              <span className="terminal-dot yellow" />
              <span className="terminal-dot green" />
              <span className="terminal-title">vaidyascribe — session</span>
            </div>
            <div className="terminal-body">
              <TerminalDemo />
            </div>
          </div>
        </section>

        {/* ── CUSTOMERS ─────────────────────────────────────────────────── */}
        <section className="customers-section" id="integrations">
          <p className="customers-label">Trusted by leading healthcare institutions</p>
          <div className="customers-row">
            {CUSTOMERS.map(c => <CustomerLogo key={c.name} customer={c} />)}
          </div>
        </section>

        {/* ── FEATURES ──────────────────────────────────────────────────── */}
        <section className="features-section" id="features">
          <div className="section-header-block">
            <h2 className="section-h2">Everything a scribe can do — and more</h2>
            <p className="section-sub">From voice to structured FHIR data in seconds.</p>
          </div>
          <div className="features-grid">
            <FeatureCard icon="🎙️" title="Ambient Voice Capture"   desc="Records the doctor-patient conversation in real time. No button mashing. Just talk." />
            <FeatureCard icon="⚡" title="Instant Transcription"    desc="Groq Whisper processes audio in under 3 seconds, even in noisy OPD environments." />
            <FeatureCard icon="🩺" title="Clinical NLP"             desc="Extracts chief complaints, vitals, diagnosis, medications, and lab orders automatically." />
            <FeatureCard icon="📋" title="FHIR R4 Export"           desc="Every session produces a standards-compliant FHIR bundle ready for any EHR system." />
            <FeatureCard icon="🌐" title="Multilingual Support"     desc="Hindi, English, Tamil, Bengali, and 6 more languages — with code-mixed speech support." />
            <FeatureCard icon="🏥" title="Hospital Dashboard"       desc="Admins manage doctors, link hospitals, and monitor session analytics from one panel." />
          </div>
        </section>

        {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
        <section className="how-section" id="how-it-works">
          <div className="section-header-block">
            <h2 className="section-h2">How it works</h2>
            <p className="section-sub">Three steps. Zero friction.</p>
          </div>
          <div className="steps-row">
            {[
              { n: "01", title: "Doctor starts session", desc: "Tap record. VaidyaScribe begins listening in the background while the consultation proceeds naturally." },
              { n: "02", title: "AI processes speech",   desc: "Whisper transcribes, Qwen3-32B extracts entities. Everything happens on-device in under 3 seconds." },
              { n: "03", title: "Record is born",        desc: "A complete FHIR R4 bundle — diagnosis, prescriptions, follow-ups — is saved and ready to export." },
            ].map(s => (
              <div className="step-card" key={s.n}>
                <div className="step-num">{s.n}</div>
                <h3 className="step-title">{s.title}</h3>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECURITY ──────────────────────────────────────────────────── */}
        <section className="security-section" id="security">
          <div className="security-inner">
            <div className="security-text">
              <div className="security-badge">🔒 Security first</div>
              <h2 className="section-h2" style={{ textAlign: "left" }}>
                Built with privacy at its core
              </h2>
              <p className="section-sub" style={{ textAlign: "left" }}>
                Patient data never leaves your infrastructure without consent.
                Role-based access, encrypted storage, and audit logs — by design.
              </p>
              <ul className="security-list">
                <li>✓ Supabase RLS — row-level security on all patient data</li>
                <li>✓ No audio stored after transcription</li>
                <li>✓ Doctor ↔ Hospital isolation enforced at DB level</li>
                <li>✓ HIPAA-ready architecture</li>
              </ul>
            </div>
            <div className="security-card">
              <div className="sec-item"><span className="sec-icon">🔐</span> End-to-end encrypted sessions</div>
              <div className="sec-item"><span className="sec-icon">👁️</span> Full audit trails</div>
              <div className="sec-item"><span className="sec-icon">🏛️</span> On-premise deployment option</div>
              <div className="sec-item"><span className="sec-icon">📋</span> FHIR R4 compliant output</div>
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <section className="cta-section" id="pricing">
          <h2 className="cta-h2">Start scribing today</h2>
          <p className="cta-sub">Free for individual doctors. Enterprise plans for hospitals.</p>
          <div className="cta-buttons">
            <button className="hero-cta-primary" onClick={() => setMode("doctor")}>
              Get started — it's free
            </button>
            <button className="hero-cta-ghost" onClick={() => setMode("admin")}>
              Contact for hospitals
            </button>
          </div>
        </section>

        <footer className="landing-footer-bar">
          <span>© 2025 VaidyaScribe · IIT Patna</span>
          <span>Built with ♥ for Indian healthcare</span>
        </footer>
      </div>
    </div>
  );
}

// ── Terminal demo animation ──────────────────────────────────────────────────
function TerminalDemo() {
  const lines = [
    { delay: 0,    text: "$ vaidyascribe start-session",                      type: "cmd" },
    { delay: 800,  text: "● Recording... 00:02:14",                            type: "info" },
    { delay: 1400, text: "◉ Transcribing audio with Whisper...",               type: "processing" },
    { delay: 2200, text: "◉ Extracting clinical entities (Qwen3-32B)...",      type: "processing" },
    { delay: 3000, text: "◉ Generating FHIR R4 bundle...",                    type: "processing" },
    { delay: 3600, text: "✓ Chief complaint: Chest pain, 3 days",             type: "success" },
    { delay: 3800, text: "✓ Diagnosis: Costochondritis (M94.0)",              type: "success" },
    { delay: 4000, text: "✓ Rx: Ibuprofen 400mg × 5 days",                   type: "success" },
    { delay: 4200, text: "✓ FHIR bundle saved · 4 resources",                type: "success" },
    { delay: 4600, text: "Session complete in 2.8s",                          type: "done" },
  ];
  const [shown, setShown] = useState([]);
  useEffect(() => {
    lines.forEach((l, i) => {
      setTimeout(() => setShown(s => [...s, i]), l.delay + 600);
    });
  }, []);
  return (
    <div className="terminal-lines">
      {lines.map((l, i) =>
        shown.includes(i) ? (
          <div key={i} className={`t-line t-${l.type}`}>{l.text}</div>
        ) : null
      )}
    </div>
  );
}
