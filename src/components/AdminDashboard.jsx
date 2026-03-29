import { useState, useEffect, useRef } from "react";
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
  const [hospital, setHospital]         = useState(null);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [msg, setMsg]                   = useState(null);
  const [error, setError]               = useState(null);

  // Basic fields
  const [name, setName]                 = useState("");
  const [code, setCode]                 = useState("");
  const [pass, setPass]                 = useState("");

  // Extra fields
  const [logoFile, setLogoFile]         = useState(null);
  const [logoPreview, setLogoPreview]   = useState(null);
  const [logoUrl, setLogoUrl]           = useState("");
  const [ccn, setCcn]                   = useState("");
  const [ownershipType, setOwnershipType] = useState("");
  const [licensedBeds, setLicensedBeds] = useState("");
  const [icuBeds, setIcuBeds]           = useState("");
  const [nicuBeds, setNicuBeds]         = useState("");
  const [burnBeds, setBurnBeds]         = useState("");

  const logoInputRef = useRef(null);

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
      setName(data.hospital_name || "");
      setCode(data.hospital_code || "");
      setPass(data.hospital_pass || "");
      setCcn(data.ccn || "");
      setOwnershipType(data.ownership_type || "");
      setLicensedBeds(data.licensed_beds ?? "");
      setIcuBeds(data.icu_beds ?? "");
      setNicuBeds(data.nicu_beds ?? "");
      setBurnBeds(data.burn_beds ?? "");
      setLogoUrl(data.logo_url || "");
      if (data.logo_url) setLogoPreview(data.logo_url);
    }
    setLoading(false);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const uploadLogo = async () => {
    if (!logoFile) return logoUrl;
    const ext = logoFile.name.split(".").pop();
    const path = `hospital-logos/${adminId}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("assets")
      .upload(path, logoFile, { upsert: true, contentType: logoFile.type });
    if (upErr) { setError("Logo upload failed: " + upErr.message); return null; }
    const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const save = async () => {
    setSaving(true); setMsg(null); setError(null);
    if (!name || !code || !pass) { setError("Hospital Name, Code and Password are required"); setSaving(false); return; }

    let finalLogoUrl = logoUrl;
    if (logoFile) {
      const uploaded = await uploadLogo();
      if (!uploaded) { setSaving(false); return; }
      finalLogoUrl = uploaded;
      setLogoUrl(uploaded);
    }

    const payload = {
      hospital_name:  name,
      hospital_code:  code,
      hospital_pass:  pass,
      ccn:            ccn || null,
      ownership_type: ownershipType || null,
      licensed_beds:  licensedBeds !== "" ? parseInt(licensedBeds, 10) : null,
      icu_beds:       icuBeds  !== "" ? parseInt(icuBeds, 10)  : null,
      nicu_beds:      nicuBeds !== "" ? parseInt(nicuBeds, 10) : null,
      burn_beds:      burnBeds !== "" ? parseInt(burnBeds, 10) : null,
      logo_url:       finalLogoUrl || null,
    };

    if (hospital) {
      const { error: e } = await supabase
        .from("hospitals")
        .update(payload)
        .eq("id", hospital.id);
      if (e) setError(e.message);
      else { setMsg("Hospital details updated!"); fetchHospital(); }
    } else {
      const { error: e } = await supabase
        .from("hospitals")
        .insert({ admin_id: adminId, ...payload });
      if (e) setError(e.message);
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

      {/* ── Section 1: Basic Info ── */}
      <div className="admin-form-card">
        <p className="admin-section-heading">Basic Information</p>

        {hospital && (
          <div className="admin-info-row">
            <span className="admin-info-label">Hospital ID</span>
            <span className="admin-info-val mono">{hospital.id}</span>
          </div>
        )}

        {/* Logo Upload */}
        <div className="admin-field">
          <label className="admin-label">Hospital Logo</label>
          <div className="logo-upload-row">
            <div
              className="logo-preview-box"
              onClick={() => logoInputRef.current?.click()}
              title="Click to upload logo"
            >
              {logoPreview
                ? <img src={logoPreview} alt="Hospital logo" className="logo-preview-img" />
                : <span className="logo-placeholder">🏥<br /><span style={{ fontSize: "11px", color: "var(--text3)" }}>Click to upload</span></span>
              }
            </div>
            <div style={{ flex: 1 }}>
              <button
                type="button"
                className="logo-upload-btn"
                onClick={() => logoInputRef.current?.click()}
              >
                {logoPreview ? "Change Logo" : "Upload Logo"}
              </button>
              <p style={{ fontSize: "11px", color: "var(--text3)", marginTop: "6px" }}>
                PNG, JPG or SVG · Recommended 256 × 256 px
              </p>
              {logoFile && (
                <p style={{ fontSize: "11px", color: "var(--accent)", marginTop: "4px" }}>
                  ✓ {logoFile.name}
                </p>
              )}
            </div>
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            style={{ display: "none" }}
            onChange={handleLogoChange}
          />
        </div>

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
      </div>

      {/* ── Section 2: Regulatory & Ownership ── */}
      <div className="admin-form-card" style={{ marginTop: "16px" }}>
        <p className="admin-section-heading">Regulatory &amp; Ownership</p>

        <div className="admin-field">
          <label className="admin-label">
            CMS Certification Number (CCN)
            <span className="admin-label-hint"> · 6-digit Medicare/Medicaid provider ID</span>
          </label>
          <input
            className="key-input"
            value={ccn}
            onChange={e => setCcn(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="e.g. 110001"
            maxLength={6}
          />
        </div>

        <div className="admin-field">
          <label className="admin-label">Ownership Type</label>
          <div className="ownership-radio-group">
            {[
              { value: "public",              label: "🏛️ Public",              desc: "Government / State-run" },
              { value: "private_nonprofit",   label: "🤝 Private Non-profit",  desc: "NGO / Trust / Charity" },
              { value: "private_forprofit",   label: "💼 Private For-profit",  desc: "Corporate / Private Ltd." },
            ].map(opt => (
              <label
                key={opt.value}
                className={`ownership-radio-card ${ownershipType === opt.value ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="ownershipType"
                  value={opt.value}
                  checked={ownershipType === opt.value}
                  onChange={() => setOwnershipType(opt.value)}
                  style={{ display: "none" }}
                />
                <span className="ownership-card-label">{opt.label}</span>
                <span className="ownership-card-desc">{opt.desc}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 3: Bed Capacity ── */}
      <div className="admin-form-card" style={{ marginTop: "16px" }}>
        <p className="admin-section-heading">Bed Capacity</p>

        <div className="admin-field">
          <label className="admin-label">
            Licensed Inpatient Beds
            <span className="admin-label-hint"> · Total beds the hospital is legally permitted to operate</span>
          </label>
          <input
            className="key-input"
            type="number"
            min="0"
            value={licensedBeds}
            onChange={e => setLicensedBeds(e.target.value)}
            placeholder="e.g. 500"
          />
        </div>

        <p className="admin-label" style={{ marginBottom: "10px" }}>
          Specialized Care Beds
          <span className="admin-label-hint"> · Leave blank if not applicable</span>
        </p>
        <div className="beds-grid">
          <div className="admin-field">
            <label className="admin-label-small">🏥 ICU Beds</label>
            <input
              className="key-input"
              type="number"
              min="0"
              value={icuBeds}
              onChange={e => setIcuBeds(e.target.value)}
              placeholder="e.g. 30"
            />
          </div>
          <div className="admin-field">
            <label className="admin-label-small">🍼 NICU Beds (Neonatal)</label>
            <input
              className="key-input"
              type="number"
              min="0"
              value={nicuBeds}
              onChange={e => setNicuBeds(e.target.value)}
              placeholder="e.g. 12"
            />
          </div>
          <div className="admin-field">
            <label className="admin-label-small">🔥 Burn Unit Beds</label>
            <input
              className="key-input"
              type="number"
              min="0"
              value={burnBeds}
              onChange={e => setBurnBeds(e.target.value)}
              placeholder="e.g. 8"
            />
          </div>
        </div>
      </div>

      {/* Messages & Save */}
      {error && <p style={{ color: "var(--red)",   fontSize: "13px", marginTop: "12px" }}>{error}</p>}
      {msg   && <p style={{ color: "var(--green)", fontSize: "13px", marginTop: "12px" }}>{msg}</p>}

      <button className="key-btn" onClick={save} disabled={saving} style={{ marginTop: "16px" }}>
        {saving ? "Saving…" : hospital ? "Update Details" : "Register Hospital"}
      </button>

      {/* Credentials summary card for sharing with doctors */}
      {hospital && (
        <div className="admin-creds-card" style={{ marginTop: "24px" }}>
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
    const { data: hospital } = await supabase
      .from("hospitals")
      .select("id")
      .eq("admin_id", adminId)
      .single();

    if (!hospital) { setLoading(false); return; }

    const { data: links } = await supabase
      .from("doctor_hospital_links")
      .select("*")
      .eq("hospital_id", hospital.id)
      .order("linked_at", { ascending: false });

    if (!links) { setLoading(false); return; }

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
          <p>No doctors linked yet. Share your Hospital Code &amp; Password with doctors so they can link their accounts.</p>
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
