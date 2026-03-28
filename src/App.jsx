import { useState, useEffect } from "react";
import RecordingPanel from "./components/RecordingPanel";
import TranscriptPanel from "./components/TranscriptPanel";
import FHIRPanel from "./components/FHIRPanel";
import Header from "./components/Header";
import LandingPage from "./components/LandingPage";
import PatientHistory from "./components/PatientHistory";
import PatientSessionHistory from "./components/PatientSessionHistory";
import AdminDashboard from "./components/AdminDashboard";
import LinkHospital from "./components/LinkHospital";
import { transcribeAudio, extractClinicalEntities } from "./services/groq";
import { buildFHIRBundle } from "./services/fhir";
import { supabase } from "./services/supabase";
import "./styles/global.css";

export default function App() {
  // ── Auth & role state ──────────────────────────────────────────────────────
  const [user, setUser]             = useState(null);
  const [role, setRole]             = useState(null);   // 'doctor' | 'admin' | null
  const [authLoading, setAuthLoading] = useState(true);
  const [hospitalName, setHospitalName] = useState(null); // linked hospital name

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) loadProfile(u.id);
      else setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadProfile(u.id);
      else { setRole(null); setAuthLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (uid) => {
    const { data } = await supabase.from("profiles").select("role").eq("id", uid).single();
    setRole(data?.role ?? "doctor");
    // Also check hospital link
    const { data: link } = await supabase
      .from("doctor_hospital_links")
      .select("hospitals(hospital_name)")
      .eq("doctor_id", uid)
      .single();
    if (link?.hospitals?.hospital_name) setHospitalName(link.hospitals.hospital_name);
    setAuthLoading(false);
  };

  // ── Doctor app state ───────────────────────────────────────────────────────
  const [phase, setPhase]               = useState("idle");
  const [transcript, setTranscript]     = useState("");
  const [clinicalData, setClinicalData] = useState(null);
  const [fhirBundle, setFhirBundle]     = useState(null);
  const [activeTab, setActiveTab]       = useState("transcript");
  const [error, setError]               = useState(null);
  const [processingStep, setProcessingStep] = useState("");
  const [apiKey]                        = useState(import.meta.env.VITE_GROQ_API_KEY);
  const [showHistory, setShowHistory]   = useState(false);
  const [showLinkHospital, setShowLinkHospital] = useState(false);
  const [sessionSavedAt, setSessionSavedAt] = useState(null);
  const [patientInfo, setPatientInfo]   = useState({ patientId: "", patientName: "", language: { label: "Hindi", code: "hi" } });

  // ── Doctor handlers ────────────────────────────────────────────────────────
  const handleStartRecording = () => {
    setPhase("recording");
    setTranscript(""); setClinicalData(null); setFhirBundle(null); setError(null);
  };

  const handleStopRecording = async (audioBlob) => {
    setPhase("processing");
    setProcessingStep("Transcribing audio with Whisper...");
    try {
      const text = await transcribeAudio(audioBlob, apiKey, patientInfo.language?.code || "hi");
      setTranscript(text);
      setProcessingStep("Extracting clinical entities with Qwen3-32B...");

      const entities = await extractClinicalEntities(text, apiKey, patientInfo.language?.label || "Hindi");
      setClinicalData(entities);
      setProcessingStep("Generating FHIR R4 bundle...");

      const bundle = buildFHIRBundle(entities);
      setFhirBundle(bundle);

      setProcessingStep("Saving session log...");
      const { error: dbError } = await supabase.from("session_logs").insert({
        user_id: user.id,
        patient_id: patientInfo.patientId.trim(),
        patient_name: patientInfo.patientName.trim(),
        transcript: text,
        clinical_data: entities,
        fhir_bundle: bundle,
      });
      if (dbError) console.error("Failed to save log:", dbError.message);
      else setSessionSavedAt(Date.now());

      setPhase("done");
      setActiveTab("transcript");
    } catch (err) {
      setError(err.message);
      setPhase("idle");
    }
  };

  const handleReset = () => {
    setPhase("idle");
    setTranscript(""); setClinicalData(null); setFhirBundle(null);
    setError(null); setProcessingStep(""); setSessionSavedAt(null);
    setPatientInfo({ patientId: "", patientName: "", language: { label: "Hindi", code: "hi" } });
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

  // Not logged in — show landing
  if (!user) return <div className="app"><LandingPage /></div>;

  // Admin dashboard
  if (role === "admin") return <div className="app"><AdminDashboard user={user} /></div>;

  // ── Doctor app ─────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <Header
        patientName={patientInfo.patientName}
        onHistoryClick={() => setShowHistory(true)}
        onSignOut={() => supabase.auth.signOut()}
        userEmail={user.email}
        onLinkHospital={() => setShowLinkHospital(true)}
        hospitalName={hospitalName}
      />

      {showHistory && <PatientHistory onClose={() => setShowHistory(false)} />}
      {showLinkHospital && (
        <LinkHospital
          user={user}
          onClose={() => {
            setShowLinkHospital(false);
            loadProfile(user.id); // refresh hospital name in header
          }}
        />
      )}

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
                <button key={tab}
                  className={`tab ${activeTab === tab ? "active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "transcript" && "📝 Transcript"}
                  {tab === "clinical"   && "🩺 Clinical Notes"}
                  {tab === "fhir"       && "⚕️ FHIR Bundle"}
                  {tab === "clinical" && clinicalData && <span className="dot" />}
                  {tab === "fhir"     && fhirBundle   && <span className="dot" />}
                </button>
              ))}
            </div>
            <div className="tab-content">
              {activeTab === "transcript" && (
                <TranscriptPanel transcript={transcript}
                  loading={phase === "processing" && !transcript}
                  apiKey={apiKey} languageCode={patientInfo.language?.code} />
              )}
              {activeTab === "clinical" && (
                <div className="clinical-panel">
                  {clinicalData ? <ClinicalView data={clinicalData} /> : (
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

        {/* Per-patient history */}
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

// ── ClinicalView ─────────────────────────────────────────────────────────────
function ClinicalView({ data }) {
  const sections = [
    { key: "chief_complaint", label: "Chief Complaint", icon: "🗣️" },
    { key: "symptoms",        label: "Symptoms",        icon: "🌡️", isList: true },
    { key: "vitals",          label: "Vitals",          icon: "💓", isObject: true },
    { key: "diagnosis",       label: "Diagnosis",       icon: "🔬", isList: true },
    { key: "medications",     label: "Medications",     icon: "💊", isList: true },
    { key: "lab_orders",      label: "Lab Orders",      icon: "🧪", isList: true },
    { key: "follow_up",       label: "Follow Up",       icon: "📅" },
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
              ) : <p>{val}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
