export default function Header({ patientName, onHistoryClick, onSignOut, userEmail }) {
  return (
    <header className="header">
      <div className="header-logo">
        <div className="logo-mark">🩺</div>
        <div>
          <div className="logo-text">VaidyaScribe</div>
          <div className="logo-sub">
            {patientName
              ? `Patient: ${patientName}`
              : "Ambient AI Clinical Scribe"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div className="header-badges">
          <span className="badge badge-fhir">FHIR R4</span>
          <span className="badge badge-ai">Groq Powered</span>
        </div>

        {/* Patient History button */}
        <button
          onClick={onHistoryClick}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "5px 12px",
            background: "var(--blue-light)",
            border: "1px solid #bfdbfe",
            borderRadius: "8px",
            color: "var(--blue)",
            fontSize: "12px",
            fontWeight: "500",
            cursor: "pointer",
            fontFamily: "var(--font)",
            whiteSpace: "nowrap",
          }}
        >
          🗂️ History
        </button>

        {/* User + sign out */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
          <span style={{ fontSize: "11px", color: "var(--text3)", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {userEmail}
          </span>
          <button
            onClick={onSignOut}
            style={{
              fontSize: "11px",
              color: "var(--text3)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontFamily: "var(--font)",
              textDecoration: "underline",
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
