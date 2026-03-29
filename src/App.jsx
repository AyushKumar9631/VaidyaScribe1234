import { useState, useEffect, useRef } from "react";
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
import ExportPDFButton from "./components/ExportPDFButton";
import { transcribeAudio, extractClinicalEntities } from "./services/groq";
import { buildFHIRBundle } from "./services/fhir";
import { supabase } from "./services/supabase";
import "./styles/global.css";

export default function App() {
  // ── Auth & role state ──────────────────────────────────────────────────────
  const [user, setUser]               = useState(null);
  const [role, setRole]               = useState(null);
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
    // Load doctor profile for PDF export
    const { data: dp } = await supabase
      .from("doctor_profiles")
      .select("full_name,registration_id,specialization,qualification,photo_url")
      .eq("user_id", uid)
      .single();
    if (dp) setDoctorProfile(dp);
    setAuthLoading(false);
  };

  // ── Doctor app state ───────────────────────────────────────────────────────
  const [phase, setPhase]               = useState("idle");
  const [transcript, setTranscript]     = useState("");
  const [clinicalData, setClinicalData] = useState(null);
  const [fhirBundle, setFhirBundle]     = useState(null);
  const [soapNote, setSoapNote]         = useState(null);
  const [activeTab, setActiveTab]       = useState("transcript");
  const [error, setError]               = useState(null);
  const [processingStep, setProcessingStep] = useState("");
  const [apiKey]                        = useState(import.meta.env.VITE_GROQ_API_KEY);
  const [showHistory, setShowHistory]   = useState(false);
  const [showLinkHospital, setShowLinkHospital] = useState(false);
  const [sessionSavedAt, setSessionSavedAt] = useState(null);
  const [patientInfo, setPatientInfo]   = useState({ patientId: "", patientName: "", language: { label: "Hindi", code: "hi" } });
  const [doctorProfile, setDoctorProfile] = useState(null);

  // Doctor sidebar nav
  const [doctorNav, setDoctorNav]       = useState("scribe");

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

      setSoapNote(deriveSoap(entities, text));

      setPhase("done");
      setActiveTab("transcript");
    } catch (err) {
      setError(err.message);
      setPhase("idle");
    }
  };

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
      soap_note:     soapNote,
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
    <div className="app doctor-app">
      {/* Top header — spans full width */}
      <Header
        patientName={patientInfo.patientName}
        onHistoryClick={() => setShowHistory(true)}
        onSignOut={() => supabase.auth.signOut()}
        userEmail={user.email}
        onLinkHospital={() => setShowLinkHospital(true)}
        hospitalName={hospitalName}
      />

      {/* Overlay modals */}
      {showHistory && <PatientHistory onClose={() => setShowHistory(false)} />}
      {showLinkHospital && (
        <LinkHospital
          user={user}
          onClose={() => { setShowLinkHospital(false); loadProfile(user.id); }}
        />
      )}

      {/* Body: sidebar + content */}
      <div className="doctor-layout">

        {/* ── Left sidebar nav ── */}
        <aside className="doctor-sidebar">
          <nav className="admin-nav">
            <button
              className={`admin-nav-item ${doctorNav === "scribe" ? "active" : ""}`}
              onClick={() => setDoctorNav("scribe")}
            >
              🎙️ Scribe
            </button>
            <button
              className={`admin-nav-item ${doctorNav === "myinfo" ? "active" : ""}`}
              onClick={() => setDoctorNav("myinfo")}
            >
              🪪 My Information
            </button>
          </nav>

          {/* Sidebar footer */}
          <div className="doctor-sidebar-footer">
            {hospitalName && (
              <div className="doctor-sidebar-hospital">
                <span style={{ fontSize: "10px", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Hospital</span>
                <span style={{ fontSize: "12px", color: "var(--green)", fontWeight: 600 }}>🏥 {hospitalName}</span>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main content area ── */}
        <div className="doctor-content">

          {/* ══ SCRIBE TAB ══ */}
          {doctorNav === "scribe" && (
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

              {showResults && (
                <>
                  <div className="results">
                    <div className="tabs-row">
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
                      {phase === "done" && (
                        <div className="tabs-row-actions">
                          <ExportPDFButton
                            transcript={transcript}
                            clinicalData={clinicalData}
                            soapNote={soapNote}
                            fhirBundle={fhirBundle}
                            patientInfo={patientInfo}
                            doctorProfile={doctorProfile}
                            hospitalName={hospitalName}
                          />
                        </div>
                      )}
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

              {patientInfo.patientId.trim().length > 0 && (
                <PatientSessionHistory
                  patientId={patientInfo.patientId.trim()}
                  userId={user.id}
                  refreshTrigger={sessionSavedAt}
                />
              )}
            </main>
          )}

          {/* ══ MY INFORMATION TAB ══ */}
          {doctorNav === "myinfo" && (
            <DoctorMyInfo userId={user.id} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Doctor My Information Page ────────────────────────────────────────────────
function DoctorMyInfo({ userId }) {
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [profile, setProfile]               = useState(null);
  const [msg, setMsg]                       = useState(null);
  const [error, setError]                   = useState(null);

  const [fullName, setFullName]             = useState("");
  const [regId, setRegId]                   = useState("");
  const [specialization, setSpecialization] = useState("");
  const [qualification, setQualification]   = useState("");
  const [phone, setPhone]                   = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [bio, setBio]                       = useState("");
  const [photoFile, setPhotoFile]           = useState(null);
  const [photoPreview, setPhotoPreview]     = useState(null);
  const [photoUrl, setPhotoUrl]             = useState("");

  const photoInputRef = useRef(null);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("doctor_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (data) {
      setProfile(data);
      setFullName(data.full_name || "");
      setRegId(data.registration_id || "");
      setSpecialization(data.specialization || "");
      setQualification(data.qualification || "");
      setPhone(data.phone || "");
      setExperienceYears(data.experience_years ?? "");
      setBio(data.bio || "");
      setPhotoUrl(data.photo_url || "");
      if (data.photo_url) setPhotoPreview(data.photo_url);
    }
    setLoading(false);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async () => {
    if (!photoFile) return photoUrl;
    const ext = photoFile.name.split(".").pop();
    const path = `doctor-photos/${userId}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("assets")
      .upload(path, photoFile, { upsert: true, contentType: photoFile.type });
    if (upErr) { setError("Photo upload failed: " + upErr.message); return null; }
    const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const save = async () => {
    setSaving(true); setMsg(null); setError(null);
    if (!fullName || !regId) {
      setError("Full Name and Registration ID are required.");
      setSaving(false); return;
    }

    let finalPhotoUrl = photoUrl;
    if (photoFile) {
      const uploaded = await uploadPhoto();
      if (!uploaded) { setSaving(false); return; }
      finalPhotoUrl = uploaded;
      setPhotoUrl(uploaded);
    }

    const payload = {
      user_id:          userId,
      full_name:        fullName,
      registration_id:  regId,
      specialization:   specialization || null,
      qualification:    qualification  || null,
      phone:            phone          || null,
      experience_years: experienceYears !== "" ? parseInt(experienceYears, 10) : null,
      bio:              bio            || null,
      photo_url:        finalPhotoUrl  || null,
    };

    if (profile) {
      const { error: e } = await supabase
        .from("doctor_profiles")
        .update(payload)
        .eq("id", profile.id);
      if (e) setError(e.message);
      else { setMsg("Profile updated!"); fetchProfile(); }
    } else {
      const { error: e } = await supabase
        .from("doctor_profiles")
        .insert(payload);
      if (e) setError(e.message);
      else { setMsg("Profile saved!"); fetchProfile(); }
    }
    setSaving(false);
  };

  if (loading) return <div className="admin-loading"><div className="pulse-ring" /><p>Loading profile...</p></div>;

  return (
    <div className="myinfo-page">
      {/* Profile hero */}
      <div className="myinfo-hero">
        <div
          className="myinfo-avatar"
          onClick={() => photoInputRef.current?.click()}
          title="Click to change photo"
        >
          {photoPreview
            ? <img src={photoPreview} alt="Profile" className="myinfo-avatar-img" />
            : <span className="myinfo-avatar-placeholder">👤</span>
          }
          <div className="myinfo-avatar-overlay">📷</div>
        </div>
        <div>
          <h2 className="myinfo-hero-name">{fullName || "Your Name"}</h2>
          <p className="myinfo-hero-sub">
            {specialization || "Specialization not set"}
            {regId ? <> &nbsp;·&nbsp; <span className="mono" style={{ fontSize: "12px" }}>{regId}</span></> : ""}
          </p>
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: "none" }}
          onChange={handlePhotoChange}
        />
      </div>

      {/* Form sections */}
      <div className="myinfo-body">

        {/* ── Identity ── */}
        <div className="admin-form-card">
          <p className="admin-section-heading">Identity</p>

          <div className="admin-field">
            <label className="admin-label">Full Name <span style={{ color: "var(--red)" }}>*</span></label>
            <input className="key-input" value={fullName}
              onChange={e => setFullName(e.target.value)} placeholder="e.g. Dr. Priya Sharma" />
          </div>

          <div className="admin-field">
            <label className="admin-label">
              Medical Registration ID <span style={{ color: "var(--red)" }}>*</span>
              <span className="admin-label-hint"> · State / National Medical Council</span>
            </label>
            <input className="key-input" value={regId}
              onChange={e => setRegId(e.target.value.toUpperCase())} placeholder="e.g. MCI-2023-DL-12345" />
          </div>
        </div>

        {/* ── Qualifications ── */}
        <div className="admin-form-card" style={{ marginTop: "16px" }}>
          <p className="admin-section-heading">Qualifications &amp; Specialization</p>

          <div className="admin-field">
            <label className="admin-label">Specialization</label>
            <input className="key-input" value={specialization}
              onChange={e => setSpecialization(e.target.value)} placeholder="e.g. Cardiology, General Medicine…" />
          </div>

          <div className="admin-field">
            <label className="admin-label">Highest Qualification</label>
            <input className="key-input" value={qualification}
              onChange={e => setQualification(e.target.value)} placeholder="e.g. MBBS, MD, DNB…" />
          </div>

          <div className="admin-field">
            <label className="admin-label">Years of Experience</label>
            <input className="key-input" type="number" min="0" max="60"
              value={experienceYears} onChange={e => setExperienceYears(e.target.value)} placeholder="e.g. 12" />
          </div>
        </div>

        {/* ── Contact & Bio ── */}
        <div className="admin-form-card" style={{ marginTop: "16px" }}>
          <p className="admin-section-heading">Contact &amp; Bio</p>

          <div className="admin-field">
            <label className="admin-label">
              Phone <span className="admin-label-hint"> · Internal use only</span>
            </label>
            <input className="key-input" type="tel" value={phone}
              onChange={e => setPhone(e.target.value)} placeholder="e.g. +91 98765 43210" />
          </div>

          <div className="admin-field">
            <label className="admin-label">
              Short Bio <span className="admin-label-hint"> · Shown on patient-facing records</span>
            </label>
            <textarea
              className="key-input" rows={4} value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Brief professional background, areas of expertise, notable achievements…"
              style={{ resize: "vertical", fontFamily: "var(--font)", lineHeight: "1.6" }}
            />
          </div>
        </div>

        {error && <p style={{ color: "var(--red)",   fontSize: "13px", marginTop: "12px" }}>{error}</p>}
        {msg   && <p style={{ color: "var(--green)", fontSize: "13px", marginTop: "12px" }}>{msg}</p>}

        <button className="key-btn" onClick={save} disabled={saving} style={{ marginTop: "16px" }}>
          {saving ? "Saving…" : profile ? "Update Profile" : "Save Profile"}
        </button>
      </div>
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
