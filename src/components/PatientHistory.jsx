import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";

export default function PatientHistory({ onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null); // id of expanded log
  const [activeTab, setActiveTab] = useState({}); // per-log active tab

  useEffect(() => {
    fetchLogs();
  }, []);

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
    setExpanded((prev) => (prev === id ? null : id));
    setActiveTab((prev) => ({ ...prev, [id]: prev[id] || "transcript" }));
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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

          {!loading &&
            logs.map((log) => {
              const isOpen = expanded === log.id;
              const tab = activeTab[log.id] || "transcript";

              return (
                <div key={log.id} className="history-card">
                  {/* Card header — click to expand */}
                  <div
                    className="history-card-header"
                    onClick={() => toggleExpand(log.id)}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className="history-badge">Session</span>
                        <span style={{ fontSize: "12px", color: "var(--text3)", fontFamily: "var(--mono)" }}>
                          {log.id.slice(0, 8)}...
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text2)", marginTop: "4px" }}>
                        🕒 {formatDate(log.created_at)}
                      </div>
                      {log.transcript && (
                        <div
                          style={{
                            fontSize: "13px",
                            color: "var(--text)",
                            marginTop: "6px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: "520px",
                          }}
                        >
                          "{log.transcript.slice(0, 80)}{log.transcript.length > 80 ? "…" : ""}"
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--text3)", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                      ▼
                    </span>
                  </div>

                  {/* Expanded content */}
                  {isOpen && (
                    <div className="history-card-body">
                      {/* Tabs */}
                      <div className="tabs" style={{ borderBottom: "1px solid var(--border)" }}>
                        {["transcript", "clinical", "fhir"].map((t) => (
                          <button
                            key={t}
                            className={`tab ${tab === t ? "active" : ""}`}
                            onClick={() =>
                              setActiveTab((prev) => ({ ...prev, [log.id]: t }))
                            }
                          >
                            {t === "transcript" && "📝 Transcript"}
                            {t === "clinical" && "🩺 Clinical"}
                            {t === "fhir" && "⚕️ FHIR"}
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
                          <pre
                            style={{
                              fontFamily: "var(--mono)",
                              fontSize: "12px",
                              color: "var(--text2)",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }}
                          >
                            {JSON.stringify(log.clinical_data, null, 2) || "No clinical data"}
                          </pre>
                        )}

                        {tab === "fhir" && (
                          <pre
                            style={{
                              fontFamily: "var(--mono)",
                              fontSize: "12px",
                              color: "var(--text2)",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }}
                          >
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
