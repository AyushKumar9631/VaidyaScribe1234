import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("hospital");

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <div className="logo-mark">🩺</div>
          <div>
            <div className="logo-text">VaidyaScribe</div>
            <div className="logo-sub">Admin Portal</div>
          </div>
        </div>

        <nav className="admin-nav">
          <button
            className={`admin-nav-item ${activeTab === "hospital" ? "active" : ""}`}
            onClick={() => setActiveTab("hospital")}
          >
            🏥 Hospital Details
          </button>
          <button
            className={`admin-nav-item ${activeTab === "doctors" ? "active" : ""}`}
            onClick={() => setActiveTab("doctors")}
          >
            👨‍⚕️ Doctors
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <p style={{ fontSize: "11px", color: "var(--text3)", marginBottom: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.email}
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ fontSize: "12px", color: "var(--text3)", background: "transparent", border: "1px solid var(--border)", borderRadius: "6px", padding: "5px 10px", cursor: "pointer", fontFamily: "var(--font)", width: "100%" }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        {activeTab === "hospital" && <HospitalTab adminId={user.id} />}
        {activeTab === "doctors"  && <DoctorsTab  adminId={user.id} />}
      </main>
    </div>
  );
}

// ── Hospital Details Tab ─────────────────────────────────────────────────────
function HospitalTab({ adminId }) {
  const [hospital, setHospital]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [name, setName]             = useState("");
  const [code, setCode]             = useState("");
  const [pass, setPass]             = useState("");
  const [msg, setMsg]               = useState(null);
  const [error, setError]           = useState(null);

  useEffect(() => { fetchHospital(); }, []);

  const fetchHospital = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("hospitals")
      .select("*")
      .eq("admin_id", adminId)
      .single();
    if (data) {
      setHospital(data);
      setName(data.hospital_name);
      setCode(data.hospital_code);
      setPass(data.hospital_pass);
    }
    setLoading(false);
  };

  const save = async () => {
    setSaving(true); setMsg(null); setError(null);
    if (!name || !code || !pass) { setError("All fields are required"); setSaving(false); return; }

    if (hospital) {
      // Update
      const { error } = await supabase
        .from("hospitals")
        .update({ hospital_name: name, hospital_code: code, hospital_pass: pass })
        .eq("id", hospital.id);
      if (error) setError(error.message);
      else { setMsg("Hospital details updated!"); fetchHospital(); }
    } else {
      // Insert
      const { error } = await supabase
        .from("hospitals")
        .insert({ admin_id: adminId, hospital_name: name, hospital_code: code, hospital_pass: pass });
      if (error) setError(error.message);
      else { setMsg("Hospital registered successfully!"); fetchHospital(); }
    }
    setSaving(false);
  };

  if (loading) return <div className="admin-loading"><div className="pulse-ring" /><p>Loading...</p></div>;

  return (
    <div className="admin-content">
      <h2 className="admin-page-title">🏥 Hospital Details</h2>
      <p className="admin-page-sub">
        Set your hospital information. Doctors will use the <strong>Hospital Code</strong> and <strong>Hospital Password</strong> to link their account to your hospital.
      </p>

      <div className="admin-form-card">
        {hospital && (
          <div className="admin-info-row">
            <span className="admin-info-label">Hospital ID</span>
            <span className="admin-info-val mono">{hospital.id}</span>
          </div>
        )}

        <div className="admin-field">
          <label className="admin-label">Hospital Name</label>
          <input className="key-input" value={name}
            onChange={e => setName(e.target.value)} placeholder="e.g. AIIMS Patna" />
        </div>

        <div className="admin-field">
          <label className="admin-label">
            Hospital Code <span style={{ color: "var(--text3)", fontWeight: 400 }}>(doctors type this)</span>
          </label>
          <input className="key-input" value={code}
            onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. AIIMS01" />
        </div>

        <div className="admin-field">
          <label className="admin-label">
            Hospital Password <span style={{ color: "var(--text3)", fontWeight: 400 }}>(shared with doctors)</span>
          </label>
          <input className="key-input" type="password" value={pass}
            onChange={e => setPass(e.target.value)} placeholder="Set a secure password" />
        </div>

        {error && <p style={{ color: "var(--red)", fontSize: "13px" }}>{error}</p>}
        {msg   && <p style={{ color: "var(--green)", fontSize: "13px" }}>{msg}</p>}

        <button className="key-btn" onClick={save} disabled={saving} style={{ marginTop: "6px" }}>
          {saving ? "Saving..." : hospital ? "Update Details" : "Register Hospital"}
        </button>
      </div>

      {/* Credentials summary card for sharing with doctors */}
      {hospital && (
        <div className="admin-creds-card">
          <p className="admin-creds-title">📋 Share with your doctors</p>
          <div className="admin-creds-row">
            <span>Hospital Code</span>
            <span className="mono">{hospital.hospital_code}</span>
          </div>
          <div className="admin-creds-row">
            <span>Hospital Password</span>
            <span className="mono">{"•".repeat(hospital.hospital_pass.length)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Doctors Tab ──────────────────────────────────────────────────────────────
function DoctorsTab({ adminId }) {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDoctors(); }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    // Get hospital for this admin first
    const { data: hospital } = await supabase
      .from("hospitals")
      .select("id")
      .eq("admin_id", adminId)
      .single();

    if (!hospital) { setLoading(false); return; }

    // Get all linked doctors
    const { data: links } = await supabase
      .from("doctor_hospital_links")
      .select("*")
      .eq("hospital_id", hospital.id)
      .order("linked_at", { ascending: false });

    if (!links) { setLoading(false); return; }

    // For each doctor, get their session stats
    const enriched = await Promise.all(
      links.map(async (link) => {
        const { data: sessions } = await supabase
          .from("session_logs")
          .select("id, patient_id, created_at")
          .eq("user_id", link.doctor_id);

        const uniquePatients = new Set((sessions || []).map(s => s.patient_id)).size;
        const totalSessions  = (sessions || []).length;
        const lastActive     = sessions?.length
          ? new Date(Math.max(...sessions.map(s => new Date(s.created_at)))).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
          : "Never";

        return { ...link, totalSessions, uniquePatients, lastActive };
      })
    );

    setDoctors(enriched);
    setLoading(false);
  };

  if (loading) return <div className="admin-loading"><div className="pulse-ring" /><p>Loading doctors...</p></div>;

  return (
    <div className="admin-content">
      <h2 className="admin-page-title">👨‍⚕️ Linked Doctors</h2>
      <p className="admin-page-sub">{doctors.length} doctor{doctors.length !== 1 ? "s" : ""} linked to your hospital</p>

      {doctors.length === 0 && (
        <div className="admin-empty">
          <p style={{ fontSize: "32px" }}>👨‍⚕️</p>
          <p>No doctors linked yet. Share your Hospital Code & Password with doctors so they can link their accounts.</p>
        </div>
      )}

      <div className="doctor-cards-grid">
        {doctors.map((doc) => (
          <div key={doc.id} className="doctor-card">
            <div className="doctor-card-avatar">
              {doc.doctor_email?.[0]?.toUpperCase() || "D"}
            </div>
            <div className="doctor-card-info">
              <p className="doctor-card-email">{doc.doctor_email}</p>
              <p className="doctor-card-linked">Linked {new Date(doc.linked_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
            </div>
            <div className="doctor-card-stats">
              <div className="doctor-stat">
                <span className="doctor-stat-val">{doc.totalSessions}</span>
                <span className="doctor-stat-label">Sessions</span>
              </div>
              <div className="doctor-stat">
                <span className="doctor-stat-val">{doc.uniquePatients}</span>
                <span className="doctor-stat-label">Patients</span>
              </div>
              <div className="doctor-stat">
                <span className="doctor-stat-val" style={{ fontSize: "11px" }}>{doc.lastActive}</span>
                <span className="doctor-stat-label">Last Active</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
