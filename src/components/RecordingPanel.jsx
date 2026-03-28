import { useState, useRef, useEffect } from "react";

export default function RecordingPanel({ phase, processingStep, onStart, onStop, onReset, error, onPatientChange }) {
  const [seconds, setSeconds] = useState(0);
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const canRecord = patientId.trim() !== "" && patientName.trim() !== "";

  // Notify parent whenever patient info changes
  useEffect(() => {
    if (onPatientChange) onPatientChange({ patientId, patientName });
  }, [patientId, patientName]);

  useEffect(() => {
    if (phase === "recording") {
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const handleMicClick = async () => {
    if (!canRecord) return;

    if (phase === "idle" || phase === "done") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        chunksRef.current = [];

        const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
        mediaRecorderRef.current = mr;

        mr.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mr.start(1000);
        onStart();
      } catch (err) {
        console.error("Mic access denied:", err);
      }
    } else if (phase === "recording") {
      const mr = mediaRecorderRef.current;
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        onStop(blob, chunksRef.current);
      };
      mr.stop();
    }
  };

  const getMicEmoji = () => {
    if (phase === "recording") return "⏹";
    if (phase === "processing") return "⚙️";
    return "🎙️";
  };

  const handleReset = () => {
    setPatientId("");
    setPatientName("");
    onReset();
  };

  return (
    <div className="recording-panel">
      {/* Session info */}
      <div className="session-info">
        <div className="info-field">
          <span className="info-label">
            Patient Name <span style={{ color: "var(--red)" }}>*</span>
          </span>
          <input
            className={`info-input ${patientName.trim() === "" && phase === "idle" ? "info-input-required" : ""}`}
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="e.g. Ramesh Kumar"
            disabled={phase === "recording" || phase === "processing"}
          />
        </div>
        <div className="info-field">
          <span className="info-label">
            Patient ID <span style={{ color: "var(--red)" }}>*</span>
          </span>
          <input
            className={`info-input ${patientId.trim() === "" && phase === "idle" ? "info-input-required" : ""}`}
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            placeholder="e.g. PT-1234"
            disabled={phase === "recording" || phase === "processing"}
          />
        </div>
        <div className="info-field">
          <span className="info-label">Language</span>
          <input className="info-input" value="Hindi + English" readOnly />
        </div>
      </div>

      {/* Mandatory fields hint */}
      {!canRecord && phase === "idle" && (
        <p style={{ fontSize: "12px", color: "var(--text3)", marginTop: "-8px" }}>
          ⚠️ Enter Patient Name and Patient ID to enable recording
        </p>
      )}

      {/* Visualizer */}
      <div className="visualizer-container">
        <div className={`ring ring-1 ${phase === "recording" ? "active" : ""}`} />
        <div className={`ring ring-2 ${phase === "recording" ? "active" : ""}`} />
        <div className={`ring ring-3 ${phase === "recording" ? "active" : ""}`} />
        <button
          className={`mic-btn ${phase} ${!canRecord && phase === "idle" ? "mic-btn-disabled" : ""}`}
          onClick={handleMicClick}
          disabled={phase === "processing" || (!canRecord && phase === "idle")}
          title={
            !canRecord && phase === "idle"
              ? "Fill in Patient Name and ID first"
              : phase === "recording"
              ? "Stop recording"
              : "Start recording"
          }
        >
          {getMicEmoji()}
        </button>
      </div>

      {/* Timer */}
      <div className={`timer ${phase}`}>
        {phase === "processing" ? "⚙️" : formatTime(phase === "recording" ? seconds : 0)}
      </div>

      {/* Status */}
      <div className="status-row">
        <div
          className={`status-dot ${
            phase === "recording"
              ? "active"
              : phase === "processing"
              ? "processing"
              : phase === "done"
              ? "done"
              : ""
          }`}
        />
        {phase === "idle" && (
          <span>{canRecord ? "Tap mic to start recording" : "Fill in patient details above"}</span>
        )}
        {phase === "recording" && <span>Recording in progress — speak naturally</span>}
        {phase === "processing" && (
          <span className="processing-step">{processingStep || "Processing..."}</span>
        )}
        {phase === "done" && (
          <span style={{ color: "var(--teal)" }}>✓ FHIR bundle generated & saved</span>
        )}
      </div>

      {/* Waveform */}
      <div className="waveform">
        {[...Array(8)].map((_, i) => (
          <div key={i} className={`wave-bar ${phase === "recording" ? "active" : "idle"}`} />
        ))}
      </div>

      {/* Error */}
      {error && <div className="error-box">⚠️ {error}</div>}

      {/* Reset */}
      {(phase === "done" || error) && (
        <button className="reset-btn" onClick={handleReset}>
          ↺ New Session
        </button>
      )}
    </div>
  );
}
