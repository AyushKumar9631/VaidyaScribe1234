import { useState, useEffect } from "react";
import RecordingPanel from "./components/RecordingPanel";
import TranscriptPanel from "./components/TranscriptPanel";
import FHIRPanel from "./components/FHIRPanel";
import Header from "./components/Header";
import AuthGate from "./components/AuthGate";
import PatientHistory from "./components/PatientHistory";
import PatientSessionHistory from "./components/PatientSessionHistory";
import { transcribeAudio, extractClinicalEntities } from "./services/groq";
import { buildFHIRBundle } from "./services/fhir";
import { supabase } from "./services/supabase";
import "./styles/global.css";

export default function App() {
  // ── Auth state ─────────────────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── App state ──────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [clinicalData, setClinicalData] = useState(null);
  const [fhirBundle, setFhirBundle] = useState(null);
  const [activeTab, setActiveTab] = useState("transcript");
  const [error, setError] = useState(null);
  const [processingStep, setProcessingStep] = useState("");
  const [apiKey] = useState(import.meta.env.VITE_GROQ_API_KEY);
  const [showHistory, setShowHistory] = useState(false);

  // Patient info lifted from RecordingPanel
  const [patientInfo, setPatientInfo] = useState({ patientId: "", patientName: "", language: { label: "Hindi", code: "hi" } });

  // Trigger re-fetch in PatientSessionHistory after a new session is saved
  const [sessionSavedAt, setSessionSavedAt] = useState(null);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleStartRecording = () => {
    setPhase("recording");
    setTranscript("");
    setClinicalData(null);
    setFhirBundle(null);
    setError(null);
  };

  const handleStopRecording = async (audioBlob) => {
    setPhase("processing");
    setProcessingStep("Transcribing audio with Whisper...");

    try {
      // Step 1: Transcribe
      const text = await transcribeAudio(audioBlob, apiKey, patientInfo.language?.code || "hi");
      setTranscript(text);
      setProcessingStep("Extracting clinical entities with Qwen3-32B...");

      // Step 2: Extract clinical entities
      const entities = await extractClinicalEntities(text, apiKey, patientInfo.language?.label || "Hindi");
      setClinicalData(entities);
      setProcessingStep("Generating FHIR R4 bundle...");

      // Step 3: Build FHIR
      const bundle = buildFHIRBundle(entities);
      setFhirBundle(bundle);

      // Step 4: Save to Supabase — now includes patient_id
      setProcessingStep("Saving session log...");
      const { error: dbError } = await supabase.from("session_logs").insert({
        user_id: user.id,
        patient_id: patientInfo.patientId.trim(),
        patient_name: patientInfo.patientName.trim(),
        transcript: text,
        clinical_data: entities,
        fhir_bundle: bundle,
      });
      if (dbError) {
        console.error("Failed to save log:", dbError.message);
      } else {
        // Tell PatientSessionHistory to re-fetch
        setSessionSavedAt(Date.now());
      }

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
    setClinicalData(null);
    setFhirBundle(null);
    setError(null);
    setProcessingStep("");
    setPatientInfo({ patientId: "", patientName: "", language: { label: "Hindi", code: "hi" } });
    setSessionSavedAt(null);
  };

  // ── Render guards ──────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="app">
        <div className="key-overlay">
          <div className="key-card">
            <div className="key-icon">⏳</div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app">
        <AuthGate />
      </div>
    );
  }

  // ── Main app (authenticated) ───────────────────────────────────────────────
  return (
    <div className="app">
      <Header
        patientName={patientInfo.patientName}
        onHistoryClick={() => setShowHistory(true)}
        onSignOut={() => supabase.auth.signOut()}
        userEmail={user.email}
      />

      {/* Full history slide-over */}
      {showHistory && <PatientHistory onClose={() => setShowHistory(false)} />}

      <main className="main">
        <RecordingPanel
          phase={phase}
          processingStep={processingStep}
          onStart={handleStartRecording}
          onStop={handleStopRecording}
          onReset={handleReset}
          error={error}
          onPatientChange={setPatientInfo}
        />

        {/* Current session results */}
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
                <FHIRPanel
                  bundle={fhirBundle}
                  loading={!fhirBundle && phase === "processing"}
                />
              )}
            </div>
          </div>
        )}

        {/* Per-patient history — shown as soon as patient ID is typed */}
        {patientInfo.patientId.trim().length > 0 && (
          <PatientSessionHistory
            patientId={patientInfo.patientId.trim()}
            userId={user.id}
            refreshTrigger={sessionSavedAt}
          />
        )}
      </main>
    </div>
  );
}

// ── ClinicalView (unchanged) ─────────────────────────────────────────────────
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
        if (isObject && typeof val === "object" && Object.keys(val).length === 0)
          return null;

        return (
          <div key={key} className="clinical-section">
            <div className="section-header">
              <span className="section-icon">{icon}</span>
              <span className="section-label">{label}</span>
            </div>
            <div className="section-body">
              {isList && Array.isArray(val) ? (
                <ul>
                  {val.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
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
