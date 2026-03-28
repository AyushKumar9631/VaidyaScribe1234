import { useState, useRef, useEffect } from "react";

export default function RecordingPanel({ phase, processingStep, onStart, onStop, onReset, error }) {
  const [seconds, setSeconds] = useState(0);
  const [patientId, setPatientId] = useState("PT-" + Math.floor(Math.random() * 9000 + 1000));
  const [doctorName, setDoctorName] = useState("");
  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  useEffect(() => {
    if (phase === "recording") {
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
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
          streamRef.current.getTracks().forEach(t => t.stop());
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

  return (
    <div className="recording-panel">
      {/* Session info */}
      <div className="session-info">
        <div className="info-field">
          <span className="info-label">Patient ID</span>
          <input
            className="info-input"
            value={patientId}
            onChange={e => setPatientId(e.target.value)}
            placeholder="PT-0000"
          />
        </div>
        <div className="info-field">
          <span className="info-label">Doctor</span>
          <input
            className="info-input"
            value={doctorName}
            onChange={e => setDoctorName(e.target.value)}
            placeholder="Dr. Name"
          />
        </div>
        <div className="info-field">
          <span className="info-label">Language</span>
          <input className="info-input" value="Hindi + English" readOnly />
        </div>
      </div>

      {/* Visualizer */}
      <div className="visualizer-container">
        <div className={`ring ring-1 ${phase === "recording" ? "active" : ""}`} />
        <div className={`ring ring-2 ${phase === "recording" ? "active" : ""}`} />
        <div className={`ring ring-3 ${phase === "recording" ? "active" : ""}`} />
        <button
          className={`mic-btn ${phase}`}
          onClick={handleMicClick}
          disabled={phase === "processing"}
          title={phase === "recording" ? "Stop recording" : "Start recording"}
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
        <div className={`status-dot ${phase === "recording" ? "active" : phase === "processing" ? "processing" : phase === "done" ? "done" : ""}`} />
        {phase === "idle" && <span>Tap mic to start recording</span>}
        {phase === "recording" && <span>Recording in progress — speak naturally</span>}
        {phase === "processing" && <span className="processing-step">{processingStep || "Processing..."}</span>}
        {phase === "done" && <span style={{ color: "var(--teal)" }}>✓ FHIR bundle generated</span>}
      </div>

      {/* Waveform */}
      <div className="waveform">
        {[...Array(8)].map((_, i) => (
          <div key={i} className={`wave-bar ${phase === "recording" ? "active" : "idle"}`} />
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="error-box">⚠️ {error}</div>
      )}

      {/* Reset */}
      {(phase === "done" || error) && (
        <button className="reset-btn" onClick={onReset}>↺ New Session</button>
      )}
    </div>
  );
}
