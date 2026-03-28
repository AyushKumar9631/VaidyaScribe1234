export default function Header() {
  return (
    <header className="header">
      <div className="header-logo">
        <div className="logo-mark">🩺</div>
        <div>
          <div className="logo-text">VaidyaScribe</div>
          <div className="logo-sub">Ambient AI Clinical Scribe</div>
        </div>
      </div>
      <div className="header-badges">
        <span className="badge badge-fhir">FHIR R4</span>
        <span className="badge badge-ai">Groq Powered</span>
      </div>
    </header>
  );
}
