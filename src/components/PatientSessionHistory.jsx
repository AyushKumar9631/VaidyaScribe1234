import { useState, useEffect, useRef } from "react";
import { supabase } from "../services/supabase";

// ── Inline SOAP view (read-only) ─────────────────────────────────────────────
function SoapView({ soap }) {
  if (!soap) return (
    <em style={{ color: "var(--text3)", fontSize: "13px" }}>
      No SOAP note saved for this session.
    </em>
  );

  const fields = [
    { letter: "S", label: "Subjective",  key: "subjective" },
    { letter: "O", label: "Objective",   key: "objective"  },
    { letter: "A", label: "Assessment",  key: "assessment" },
    { letter: "P", label: "Plan",        key: "plan"       },
  ];

  return (
    <div className="soap-grid">
      {fields.map(({ letter, label, key }) => (
        <div className="soap-field" key={key}>
          <div className="soap-field-header">
            <span className="soap-letter">{letter}</span>
            <span className="soap-field-label">{label}</span>
          </div>
          <pre className="soap-pre">
            {soap[key] || <span className="soap-empty">—</span>}
          </pre>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PatientSessionHistory({ patientId, userId, refreshTrigger }) {
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [activeTab, setActiveTab] = useState({});
  const prevPatientId = useRef(null);

  useEffect(() => {
    if (!patientId) return;
    if (prevPatientId.current !== patientId) {
      setExpanded(null);
      setActiveTab({});
      prevPatientId.current = patientId;
    }
    fetchLogs();
  }, [patientId, refreshTrigger]);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("session_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    if (!error) setLogs(data ?? []);
    setLoading(false);
  };

  const toggleExpand = (id) => {
    setExpanded(prev => prev === id ? null : id);
    setActiveTab(prev => ({ ...prev, [id]: prev[id] || "transcript" }));
  };

  const setTab = (id, t) => setActiveTab(prev => ({ ...prev, [id]: t }));

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  const TABS = [
    { id: "transcript", label: "📝 Transcript" },
    { id: "clinical",   label: "🩺 Clinical"   },
    { id: "soap",       label: "📋 SOAP"       },
    { id: "fhir",       label: "⚕️ FHIR"       },
  ];

  return (
    <div className="psh-wrapper">

      {/* Title row */}
      <div className="psh-title-row">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--text)" }}>
            🧾 Past Sessions
          </span>
          <span style={{
            fontSize: "11px", fontFamily: "var(--mono)",
            background: "var(--blue-light)", color: "var(--blue)",
            border: "1px solid rgba(77,159,255,0.3)",
            borderRadius: "4px", padding: "1px 7px",
          }}>
            {patientId}
          </span>
        </div>
        {!loading && (
          <span style={{ fontSize: "12px", color: "var(--text3)" }}>
            {logs.length} session{logs.length !== 1 ? "s" : ""} found
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="psh-empty">
          <div className="pulse-ring" />
          <span>Looking up patient records...</span>
        </div>
      )}

      {/* Empty */}
      {!loading && logs.length === 0 && (
        <div className="psh-empty">
          <span style={{ fontSize: "26px" }}>📋</span>
          <span>No past sessions found for this patient ID</span>
        </div>
      )}

      {/* Session cards */}
      {!loading && logs.map((log, index) => {
        const isOpen = expanded === log.id;
        const tab    = activeTab[log.id] || "transcript";

        return (
          <div key={log.id} className="psh-card">

            {/* Card header */}
            <div className="psh-card-header" onClick={() => toggleExpand(log.id)}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span className="psh-session-num">Session #{logs.length - index}</span>
                  <span style={{ fontSize: "11px", color: "var(--text3)" }}>
                    🕒 {formatDate(log.created_at)}
                  </span>
                  {/* SOAP indicator */}
                  {log.soap_note && (
                    <span style={{
                      fontSize: "10px", fontWeight: 600, textTransform: "uppercase",
                      letterSpacing: "0.07em", color: "var(--green)",
                      background: "var(--green-light)", border: "1px solid rgba(14,164,122,0.25)",
                      borderRadius: "4px", padding: "1px 7px", fontFamily: "var(--mono)",
                    }}>
                      SOAP ✓
                    </span>
                  )}
                </div>

                {/* Transcript preview */}
                {log.transcript && (
                  <p style={{
                    fontSize: "13px", color: "var(--text2)",
                    overflow: "hidden", textOverflow: "ellipsis",
                    whiteSpace: "nowrap", maxWidth: "520px",
                  }}>
                    "{log.transcript.slice(0, 90)}{log.transcript.length > 90 ? "…" : ""}"
                  </p>
                )}

                {/* Quick clinical summary pills */}
                {log.clinical_data && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "6px" }}>
                    {log.clinical_data.chief_complaint && (
                      <span className="psh-pill psh-pill-red">
                        🗣️ {log.clinical_data.chief_complaint.slice(0, 40)}
                        {log.clinical_data.chief_complaint.length > 40 ? "…" : ""}
                      </span>
                    )}
                    {Array.isArray(log.clinical_data.diagnosis) &&
                      log.clinical_data.diagnosis.slice(0, 2).map((d, i) => (
                        <span key={i} className="psh-pill psh-pill-blue">🔬 {d}</span>
                      ))}
                    {Array.isArray(log.clinical_data.medications) &&
                      log.clinical_data.medications.slice(0, 2).map((m, i) => (
                        <span key={i} className="psh-pill psh-pill-green">💊 {m}</span>
                      ))}
                    {/* SOAP preview pill */}
                    {log.soap_note?.assessment && (
                      <span className="psh-pill" style={{
                        background: "var(--green-light)", color: "var(--green)",
                        borderColor: "rgba(14,164,122,0.3)",
                      }}>
                        📋 {log.soap_note.assessment.slice(0, 35)}
                        {log.soap_note.assessment.length > 35 ? "…" : ""}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <span style={{
                fontSize: "11px", color: "var(--text3)",
                transition: "transform 0.2s",
                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                flexShrink: 0,
              }}>▼</span>
            </div>

            {/* Expanded detail */}
            {isOpen && (
              <div className="psh-card-body">
                <div className="tabs" style={{ borderBottom: "1px solid var(--border)" }}>
                  {TABS.map(t => (
                    <button
                      key={t.id}
                      className={`tab ${tab === t.id ? "active" : ""}`}
                      onClick={() => setTab(log.id, t.id)}
                    >
                      {t.label}
                      {t.id === "soap" && log.soap_note && <span className="dot" />}
                    </button>
                  ))}
                </div>

                <div style={{ padding: "16px" }}>
                  {tab === "transcript" && (
                    <p style={{ fontSize: "14px", lineHeight: "1.75", color: "var(--text)" }}>
                      {log.transcript || <em style={{ color: "var(--text3)" }}>No transcript</em>}
                    </p>
                  )}

                  {tab === "clinical" && log.clinical_data && (
                    <div className="clinical-view">
                      {[
                        { key: "chief_complaint", label: "Chief Complaint", icon: "🗣️" },
                        { key: "symptoms",        label: "Symptoms",        icon: "🌡️", isList: true },
                        { key: "vitals",          label: "Vitals",          icon: "💓", isObject: true },
                        { key: "diagnosis",       label: "Diagnosis",       icon: "🔬", isList: true },
                        { key: "medications",     label: "Medications",     icon: "💊", isList: true },
                        { key: "lab_orders",      label: "Lab Orders",      icon: "🧪", isList: true },
                        { key: "follow_up",       label: "Follow Up",       icon: "📅" },
                      ].map(({ key, label, icon, isList, isObject }) => {
                        const val = log.clinical_data[key];
                        if (!val || (Array.isArray(val) && val.length === 0)) return null;
                        if (isObject && typeof val === "object" && Object.keys(val).length === 0) return null;
                        return (
                          <div key={key} className="clinical-section">
                            <div className="section-header">
                              <span className="section-icon">{icon}</span>
                              <span className="section-label">{label}</span>
                            </div>
                            <div className="section-body">
                              {isList && Array.isArray(val) ? (
                                <ul>{val.map((v, i) => <li key={i}>{v}</li>)}</ul>
                              ) : isObject && typeof val === "object" ? (
                                <div className="vitals-grid">
                                  {Object.entries(val).map(([k, v]) => (
                                    <div key={k} className="vital-item">
                                      <span className="vital-key">{k}</span>
                                      <span className="vital-val">{v}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : <p>{val}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {tab === "soap" && <SoapView soap={log.soap_note} />}

                  {tab === "fhir" && (
                    <pre style={{
                      fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text2)",
                      whiteSpace: "pre-wrap", wordBreak: "break-word",
                    }}>
                      {JSON.stringify(log.fhir_bundle, null, 2) || "No FHIR bundle"}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
