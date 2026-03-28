import { useState, useRef, useCallback } from "react";
import RecordingPanel from "./components/RecordingPanel";
import TranscriptPanel from "./components/TranscriptPanel";
import FHIRPanel from "./components/FHIRPanel";
import Header from "./components/Header";
import { transcribeAudio, extractClinicalEntities } from "./services/groq";
import { buildFHIRBundle } from "./services/fhir";
import "./styles/global.css";

export default function App() {
  const [phase, setPhase] = useState("idle"); // idle | recording | processing | done
  const [transcript, setTranscript] = useState("");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [clinicalData, setClinicalData] = useState(null);
  const [fhirBundle, setFhirBundle] = useState(null);
  const [activeTab, setActiveTab] = useState("transcript");
  const [error, setError] = useState(null);
  const [processingStep, setProcessingStep] = useState("");
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_GROQ_API_KEY);
const [showKeyInput, setShowKeyInput] = useState(false);

  const handleStartRecording = () => {
    setPhase("recording");
    setTranscript("");
    setPartialTranscript("");
    setClinicalData(null);
    setFhirBundle(null);
    setError(null);
  };

  const handleStopRecording = async (audioBlob, chunks) => {
    setPhase("processing");
    setProcessingStep("Transcribing audio with Whisper...");

    try {
      // Step 1: Transcribe
      const text = await transcribeAudio(audioBlob, apiKey);
      setTranscript(text);
      setProcessingStep("Extracting clinical entities with LLaMA...");

      // Step 2: Extract clinical entities
      const entities = await extractClinicalEntities(text, apiKey);
      setClinicalData(entities);
      setProcessingStep("Generating FHIR R4 bundle...");

      // Step 3: Build FHIR
      const bundle = buildFHIRBundle(entities);
      setFhirBundle(bundle);

      setPhase("done");
      setActiveTab("transcript");
    } catch (err) {
      setError(err.message);
      setPhase("idle");
    }
  };

  const handleReset = () => {
    setPhase("idle");
    setTranscript("");
    setPartialTranscript("");
    setClinicalData(null);
    setFhirBundle(null);
    setError(null);
    setProcessingStep("");
  };

  return (
    <div className="app">
      <Header />

      {showKeyInput && (
        <div className="key-overlay">
          <div className="key-card">
            <div className="key-icon">🔑</div>
            <h2>Enter Groq API Key</h2>
            <p>Your key stays in-browser and is never stored, and GROQ API key is free</p>
            <input
              type="password"
              placeholder="gsk_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="key-input"
            />
            <button
              className="key-btn"
              onClick={() => apiKey && setShowKeyInput(false)}
              disabled={!apiKey}
            >
              Start Session →
            </button>
          </div>
        </div>
      )}

      {!showKeyInput && (
        <main className="main">
          <RecordingPanel
            phase={phase}
            processingStep={processingStep}
            onStart={handleStartRecording}
            onStop={handleStopRecording}
            onReset={handleReset}
            error={error}
          />

          {(transcript || phase === "processing") && (
            <div className="results">
              <div className="tabs">
                {["transcript", "clinical", "fhir"].map((tab) => (
                  <button
                    key={tab}
                    className={`tab ${activeTab === tab ? "active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === "transcript" && "📝 Transcript"}
                    {tab === "clinical" && "🩺 Clinical Notes"}
                    {tab === "fhir" && "⚕️ FHIR Bundle"}
                    {tab === "clinical" && clinicalData && <span className="dot" />}
                    {tab === "fhir" && fhirBundle && <span className="dot" />}
                  </button>
                ))}
              </div>

              <div className="tab-content">
                {activeTab === "transcript" && (
                  <TranscriptPanel
                    transcript={transcript}
                    loading={phase === "processing" && !transcript}
                  />
                )}
                {activeTab === "clinical" && (
                  <div className="clinical-panel">
                    {clinicalData ? (
                      <ClinicalView data={clinicalData} />
                    ) : (
                      <div className="loading-state">
                        <div className="pulse-ring" />
                        <p>Extracting clinical entities...</p>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === "fhir" && (
                  <FHIRPanel bundle={fhirBundle} loading={!fhirBundle && phase === "processing"} />
                )}
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}

function ClinicalView({ data }) {
  const sections = [
    { key: "chief_complaint", label: "Chief Complaint", icon: "🗣️" },
    { key: "symptoms", label: "Symptoms", icon: "🌡️", isList: true },
    { key: "vitals", label: "Vitals", icon: "💓", isObject: true },
    { key: "diagnosis", label: "Diagnosis", icon: "🔬", isList: true },
    { key: "medications", label: "Medications", icon: "💊", isList: true },
    { key: "lab_orders", label: "Lab Orders", icon: "🧪", isList: true },
    { key: "follow_up", label: "Follow Up", icon: "📅" },
  ];

  return (
    <div className="clinical-view">
      {sections.map(({ key, label, icon, isList, isObject }) => {
        const val = data[key];
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
              ) : (
                <p>{val}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
