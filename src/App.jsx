import { useState, useEffect } from "react";
import RecordingPanel from "./components/RecordingPanel";
import TranscriptPanel from "./components/TranscriptPanel";
import FHIRPanel from "./components/FHIRPanel";
import SOAPPanel, { deriveSoap } from "./components/SOAPPanel";
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
  const [role, setRole]             = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hospitalName, setHospitalName] = useState(null);

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
  const [soapNote, setSoapNote]         = useState(null);   // { subjective, objective, assessment, plan }
  const [activeTab, setActiveTab]       = useState("transcript");
  const [error, setError]               = useState(null);
  const [processingStep, setProcessingStep] = useState("");
  const [apiKey]                        = useState(import.meta.env.VITE_GROQ_API_KEY);
  const [showHistory, setShowHistory]   = useState(false);
  const [showLinkHospital, setShowLinkHospital] = useState(false);
  const [sessionSavedAt, setSessionSavedAt] = useState(null);
  const [patientInfo, setPatientInfo]   = useState({ patientId: "", patientName: "", language: { label: "Hindi", code: "hi" } });

  // submission state
  const [submitting, setSubmitting]     = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError]   = useState(null);

  // ── Doctor handlers ────────────────────────────────────────────────────────
  const handleStartRecording = () => {
    setPhase("recording");
    setTranscript(""); setClinicalData(null); setFhirBundle(null);
    setSoapNote(null); setError(null);
    setSubmitSuccess(false); setSubmitError(null);
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

      // Auto-derive SOAP note — user can edit before submitting
      setSoapNote(deriveSoap(entities, text));

      setPhase("done");
      setActiveTab("transcript");
    } catch (err) {
      setError(err.message);
      setPhase("idle");
    }
  };

  // ── Submit handler — saves to DB only on explicit submit ─────────────────
  const handleSubmit = async () => {
    if (!transcript) return;
    setSubmitting(true);
    setSubmitError(null);

    const { error: dbError } = await supabase.from("session_logs").insert({
      user_id:       user.id,
      patient_id:    patientInfo.patientId.trim(),
      patient_name:  patientInfo.patientName.trim(),
      transcript,
      clinical_data: clinicalData,
      fhir_bundle:   fhirBundle,
      soap_note:     soapNote,          // NEW column
    });

    setSubmitting(false);
    if (dbError) {
      setSubmitError(dbError.message);
    } else {
      setSubmitSuccess(true);
      setSessionSavedAt(Date.now());
    }
  };

  const handleReset = () => {
    setPhase("idle");
    setTranscript(""); setClinicalData(null); setFhirBundle(null); setSoapNote(null);
    setError(null); setProcessingStep(""); setSessionSavedAt(null);
    setSubmitSuccess(false); setSubmitError(null);
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

  if (!user) return <div className="app"><LandingPage /></div>;
  if (role === "admin") return <div className="app"><AdminDashboard user={user} /></div>;

  // ── Doctor app ─────────────────────────────────────────────────────────────
  const showResults = transcript || phase === "processing";

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
          onClose={() => { setShowLinkHospital(false); loadProfile(user.id); }}
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

        {/* ── Results tabs ──────────────────────────────────────────── */}
        {showResults && (
          <>
            <div className="results">
              <div className="tabs">
                {["transcript", "clinical", "soap", "fhir"].map((tab) => (
                  <button
                    key={tab}
                    className={`tab ${activeTab === tab ? "active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === "transcript" && "📝 Transcript"}
                    {tab === "clinical"   && "🩺 Clinical Notes"}
                    {tab === "soap"       && "📋 SOAP Note"}
                    {tab === "fhir"       && "⚕️ FHIR Bundle"}
                    {tab === "clinical" && clinicalData && <span className="dot" />}
                    {tab === "soap"     && soapNote     && <span className="dot" />}
                    {tab === "fhir"     && fhirBundle   && <span className="dot" />}
                  </button>
                ))}
              </div>

              <div className="tab-content">
                {activeTab === "transcript" && (
                  <TranscriptPanel
                    transcript={transcript}
                    loading={phase === "processing" && !transcript}
                    apiKey={apiKey}
                    languageCode={patientInfo.language?.code}
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

                {activeTab === "soap" && (
                  <SOAPPanel
                    clinicalData={clinicalData}
                    transcript={transcript}
                    soap={soapNote}
                    onChange={setSoapNote}
                  />
                )}

                {activeTab === "fhir" && (
                  <FHIRPanel bundle={fhirBundle} loading={!fhirBundle && phase === "processing"} />
                )}
              </div>
            </div>

            {/* ── Submit bar ──────────────────────────────────────────── */}
            {phase === "done" && (
              <div className="submit-bar">
                {submitSuccess ? (
                  <div className="submit-success">
                    <span className="submit-success-icon">✓</span>
                    Session saved to records
                    <button className="reset-btn" style={{ marginLeft: "auto" }} onClick={handleReset}>
                      New session
                    </button>
                  </div>
                ) : (
                  <>
                    {submitError && (
                      <div className="error-box" style={{ marginBottom: 12 }}>
                        Failed to save: {submitError}
                      </div>
                    )}
                    <div className="submit-bar-inner">
                      <div className="submit-info">
                        <span className="submit-info-label">Ready to submit</span>
                        <span className="submit-info-sub">
                          Review all tabs before saving. SOAP note is editable.
                        </span>
                      </div>
                      <button
                        className="submit-btn"
                        onClick={handleSubmit}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <span className="submit-spinner" />
                            Saving...
                          </>
                        ) : (
                          "Save Record →"
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
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
