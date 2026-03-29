import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";

// ── Inline SOAP view (read-only) ─────────────────────────────────────────────
function SoapView({ soap }) {
  if (!soap) return <em style={{ color: "var(--text3)", fontSize: "13px" }}>No SOAP note saved for this session.</em>;

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
export default function PatientHistory({ onClose }) {
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [activeTab, setActiveTab] = useState({});

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("session_logs")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setLogs(data);
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

  return (
    <div className="history-overlay">
      <div className="history-panel">

        {/* Header */}
        <div className="history-header">
          <div>
            <h2 className="history-title">🗂️ Patient History</h2>
            <p style={{ fontSize: "12px", color: "var(--text3)", marginTop: "2px" }}>
              {logs.length} session{logs.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
          <button className="history-close" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="history-body">
          {loading && (
            <div className="loading-state">
              <div className="pulse-ring" />
              <p>Loading sessions...</p>
            </div>
          )}

          {!loading && logs.length === 0 && (
            <div className="loading-state">
              <p style={{ fontSize: "32px" }}>📭</p>
              <p>No sessions recorded yet.</p>
            </div>
          )}

          {!loading && logs.map((log) => {
            const isOpen = expanded === log.id;
            const tab    = activeTab[log.id] || "transcript";
            const TABS   = [
              { id: "transcript", label: "📝 Transcript" },
              { id: "clinical",   label: "🩺 Clinical"   },
              { id: "soap",       label: "📋 SOAP"       },
              { id: "fhir",       label: "⚕️ FHIR"       },
            ];

            return (
              <div key={log.id} className="history-card">

                {/* Card header */}
                <div className="history-card-header" onClick={() => toggleExpand(log.id)}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span className="history-badge">Session</span>
                      {log.patient_name && (
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text)" }}>
                          {log.patient_name}
                        </span>
                      )}
                      <span style={{ fontSize: "11px", color: "var(--text3)", fontFamily: "var(--mono)" }}>
                        {log.id.slice(0, 8)}…
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text2)", marginTop: "4px" }}>
                      🕒 {formatDate(log.created_at)}
                    </div>
                    {log.transcript && (
                      <div style={{
                        fontSize: "13px", color: "var(--text)", marginTop: "6px",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "520px",
                      }}>
                        "{log.transcript.slice(0, 80)}{log.transcript.length > 80 ? "…" : ""}"
                      </div>
                    )}
                    {/* SOAP badge */}
                    {log.soap_note && (
                      <span style={{
                        display: "inline-block", marginTop: "6px",
                        fontSize: "10px", fontWeight: 600, textTransform: "uppercase",
                        letterSpacing: "0.07em", color: "var(--green)",
                        background: "var(--green-light)", border: "1px solid rgba(14,164,122,0.25)",
                        borderRadius: "4px", padding: "1px 7px", fontFamily: "var(--mono)",
                      }}>
                        SOAP ✓
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: "12px", color: "var(--text3)",
                    transition: "transform 0.2s",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}>▼</span>
                </div>

                {/* Expanded */}
                {isOpen && (
                  <div className="history-card-body">
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
                          {log.transcript || <em style={{ color: "var(--text3)" }}>No transcript available</em>}
                        </p>
                      )}

                      {tab === "clinical" && (
                        <pre style={{
                          fontFamily: "var(--mono)", fontSize: "12px", color: "var(--text2)",
                          whiteSpace: "pre-wrap", wordBreak: "break-word",
                        }}>
                          {JSON.stringify(log.clinical_data, null, 2) || "No clinical data"}
                        </pre>
                      )}

                      {tab === "soap" && <SoapView soap={log.soap_note} />}

                      {tab === "fhir" && (
                        <pre style={{
                          fontFamily: "var(--mono)", fontSize: "12px", color: "var(--text2)",
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
      </div>
    </div>
  );
}
