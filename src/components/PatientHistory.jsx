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

// ── CSV helpers ───────────────────────────────────────────────────────────────

/** Wrap a cell value so commas / quotes / newlines don't break the CSV */
function csvCell(val) {
  if (val == null) return "";
  const str = String(val).replace(/\r?\n/g, " ").trim();
  // Always quote — simplest safe approach
  return `"${str.replace(/"/g, '""')}"`;
}

/** Join an array to a readable semicolon-separated string */
function joinArr(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return "";
  return arr.join("; ");
}

/** Flatten a vitals object to "BP: 120/80; Temp: 98.6°F; …" */
function flatVitals(vitals) {
  if (!vitals || typeof vitals !== "object") return "";
  return Object.entries(vitals)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
}

/**
 * Build and trigger a CSV download from the session logs.
 *
 * Columns (14 attributes):
 *  1  Session ID
 *  2  Patient Name
 *  3  Patient ID
 *  4  Date
 *  5  Time
 *  6  Chief Complaint
 *  7  Symptoms
 *  8  Diagnosis
 *  9  Medications
 * 10  Lab Orders
 * 11  Follow-up
 * 12  Vitals
 * 13  SOAP – Subjective
 * 14  SOAP – Objective
 * 15  SOAP – Assessment
 * 16  SOAP – Plan
 */
function downloadSheet(logs) {
  const HEADERS = [
    "Session ID",
    "Patient Name",
    "Patient ID",
    "Date",
    "Time",
    "Chief Complaint",
    "Symptoms",
    "Diagnosis",
    "Medications",
    "Lab Orders",
    "Follow-up",
    "Vitals",
    "SOAP – Subjective",
    "SOAP – Objective",
    "SOAP – Assessment",
    "SOAP – Plan",
  ];

  const rows = logs.map((log) => {
    const cd   = log.clinical_data || {};
    const soap = log.soap_note     || {};
    const dt   = new Date(log.created_at);

    return [
      log.id,
      log.patient_name || "",
      log.patient_id   || "",
      dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      cd.chief_complaint || "",
      joinArr(cd.symptoms),
      joinArr(cd.diagnosis),
      joinArr(cd.medications),
      joinArr(cd.lab_orders),
      cd.follow_up || "",
      flatVitals(cd.vitals),
      soap.subjective || "",
      soap.objective  || "",
      soap.assessment || "",
      soap.plan       || "",
    ].map(csvCell).join(",");
  });

  const csvContent = [HEADERS.map(csvCell).join(","), ...rows].join("\r\n");
  const blob       = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" }); // BOM for Excel
  const url        = URL.createObjectURL(blob);
  const a          = document.createElement("a");
  a.href           = url;
  a.download       = `patient_history_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PatientHistory({ userId, onClose }) {
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
      .eq("user_id", userId)          // ← only this doctor's sessions
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

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Download Sheet button — only shown when there is data */}
            {!loading && logs.length > 0 && (
              <button
                onClick={() => downloadSheet(logs)}
                title="Download all sessions as a spreadsheet"
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "7px 14px", borderRadius: "8px", cursor: "pointer",
                  fontSize: "13px", fontWeight: 600, fontFamily: "var(--font)",
                  background: "var(--green-light)",
                  color: "var(--green)",
                  border: "1px solid rgba(18,184,134,0.35)",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(18,184,134,0.2)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--green-light)"}
              >
                {/* spreadsheet icon */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M3 9h18M3 15h18M9 3v18"/>
                </svg>
                Download Sheet
              </button>
            )}

            <button className="history-close" onClick={onClose}>✕</button>
          </div>
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
