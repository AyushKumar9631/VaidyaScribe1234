import { useState, useEffect, useRef } from "react";
import { ThemeToggleBtn } from "../context/ThemeContext";
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
          <button
            className={`admin-nav-item ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            📊 Analytics
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <div style={{ marginBottom: "10px" }}>
            <ThemeToggleBtn style={{ width: "100%", justifyContent: "center" }} />
          </div>
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
        {activeTab === "hospital"  && <HospitalTab  adminId={user.id} />}
        {activeTab === "doctors"   && <DoctorsTab   adminId={user.id} />}
        {activeTab === "analytics" && <AnalyticsTab adminId={user.id} />}
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
  const [doctors, setDoctors]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);   // doc with profile attached
  const [drawerOpen, setDrawerOpen] = useState(false);

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

        const { data: profile } = await supabase
          .from("doctor_profiles")
          .select("*")
          .eq("user_id", link.doctor_id)
          .single();

        const uniquePatients = new Set((sessions || []).map(s => s.patient_id)).size;
        const totalSessions  = (sessions || []).length;
        const lastActive     = sessions?.length
          ? new Date(Math.max(...sessions.map(s => new Date(s.created_at)))).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
          : "Never";

        return { ...link, totalSessions, uniquePatients, lastActive, profile: profile || null };
      })
    );

    setDoctors(enriched);
    setLoading(false);
  };

  const openDrawer = (doc) => {
    setSelected(doc);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelected(null), 300);
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
          <div
            key={doc.id}
            className="doctor-card doctor-card-clickable"
            onClick={() => openDrawer(doc)}
            title="Click to view full profile"
          >
            <div className="doctor-card-avatar">
              {doc.profile?.photo_url
                ? <img src={doc.profile.photo_url} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                : (doc.profile?.full_name?.[0]?.toUpperCase() || doc.doctor_email?.[0]?.toUpperCase() || "D")
              }
            </div>
            <div className="doctor-card-info">
              <p className="doctor-card-email">
                {doc.profile?.full_name || doc.doctor_email}
              </p>
              <p className="doctor-card-linked">
                {doc.profile?.specialization
                  ? <span style={{ color: "var(--green)", fontSize: "11px" }}>{doc.profile.specialization}</span>
                  : <span>Linked {new Date(doc.linked_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                }
              </p>
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
            <div className="doctor-card-hint">View profile →</div>
          </div>
        ))}
      </div>

      {/* ── Doctor Profile Drawer ── */}
      {drawerOpen && selected && (
        <div className="drawer-overlay" onClick={closeDrawer}>
          <div
            className={`doctor-drawer ${drawerOpen ? "drawer-open" : ""}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="drawer-header">
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>Doctor Profile</span>
              <button className="drawer-close" onClick={closeDrawer}>✕</button>
            </div>

            {/* Hero */}
            <div className="drawer-hero">
              <div className="drawer-avatar">
                {selected.profile?.photo_url
                  ? <img src={selected.profile.photo_url} alt="" className="drawer-avatar-img" />
                  : <span className="drawer-avatar-placeholder">
                      {selected.profile?.full_name?.[0]?.toUpperCase() || selected.doctor_email?.[0]?.toUpperCase() || "D"}
                    </span>
                }
              </div>
              <div className="drawer-hero-info">
                <h3 className="drawer-hero-name">
                  {selected.profile?.full_name || "—"}
                </h3>
                <p className="drawer-hero-spec">
                  {selected.profile?.specialization || "Specialization not set"}
                </p>
                <p className="drawer-hero-email">{selected.doctor_email}</p>
              </div>
            </div>

            {/* Stats strip */}
            <div className="drawer-stats">
              <div className="drawer-stat">
                <span className="drawer-stat-val">{selected.totalSessions}</span>
                <span className="drawer-stat-label">Sessions</span>
              </div>
              <div className="drawer-stat">
                <span className="drawer-stat-val">{selected.uniquePatients}</span>
                <span className="drawer-stat-label">Patients</span>
              </div>
              <div className="drawer-stat">
                <span className="drawer-stat-val">{selected.lastActive}</span>
                <span className="drawer-stat-label">Last Active</span>
              </div>
            </div>

            {selected.profile ? (
              <div className="drawer-body">

                {/* Identity */}
                <div className="drawer-section">
                  <p className="drawer-section-title">Identity</p>
                  <div className="drawer-row">
                    <span className="drawer-row-label">Registration ID</span>
                    <span className="drawer-row-val mono">{selected.profile.registration_id || "—"}</span>
                  </div>
                  <div className="drawer-row">
                    <span className="drawer-row-label">Qualification</span>
                    <span className="drawer-row-val">{selected.profile.qualification || "—"}</span>
                  </div>
                  <div className="drawer-row">
                    <span className="drawer-row-label">Experience</span>
                    <span className="drawer-row-val">
                      {selected.profile.experience_years != null
                        ? `${selected.profile.experience_years} year${selected.profile.experience_years !== 1 ? "s" : ""}`
                        : "—"}
                    </span>
                  </div>
                </div>

                {/* Contact */}
                <div className="drawer-section">
                  <p className="drawer-section-title">Contact</p>
                  <div className="drawer-row">
                    <span className="drawer-row-label">Phone</span>
                    <span className="drawer-row-val">{selected.profile.phone || "—"}</span>
                  </div>
                  <div className="drawer-row">
                    <span className="drawer-row-label">Linked since</span>
                    <span className="drawer-row-val">
                      {new Date(selected.linked_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>

                {/* Bio */}
                {selected.profile.bio && (
                  <div className="drawer-section">
                    <p className="drawer-section-title">Bio</p>
                    <p className="drawer-bio">{selected.profile.bio}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="drawer-body">
                <div className="admin-empty" style={{ padding: "32px 0" }}>
                  <p style={{ fontSize: "28px" }}>📋</p>
                  <p>This doctor hasn't filled in their profile yet.</p>
                </div>
                <div className="drawer-section">
                  <div className="drawer-row">
                    <span className="drawer-row-label">Linked since</span>
                    <span className="drawer-row-val">
                      {new Date(selected.linked_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
// ── Analytics Tab ─────────────────────────────────────────────────────────────
// Paste this function into AdminDashboard.jsx alongside HospitalTab & DoctorsTab

function AnalyticsTab({ adminId }) {
  const [loading, setLoading]       = useState(true);
  const [stats, setStats]           = useState(null);
  const [chartData, setChartData]   = useState([]);
  const [diagnoses, setDiagnoses]   = useState([]);
  const [recentSessions, setRecent] = useState([]);

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    setLoading(true);

    // 1. Get hospital for this admin
    const { data: hospital } = await supabase
      .from("hospitals")
      .select("id")
      .eq("admin_id", adminId)
      .single();

    if (!hospital) { setLoading(false); return; }

    // 2. Get all linked doctors
    const { data: links } = await supabase
      .from("doctor_hospital_links")
      .select("doctor_id")
      .eq("hospital_id", hospital.id);

    const doctorIds = (links || []).map(l => l.doctor_id);
    const linkedDoctors = doctorIds.length;

    if (linkedDoctors === 0) {
      setStats({ totalSessions: 0, uniquePatients: 0, linkedDoctors: 0, avgPerDoctor: 0 });
      setLoading(false);
      return;
    }

    // 3. Get all sessions for those doctors
    const { data: sessions } = await supabase
      .from("session_logs")
      .select("id, patient_id, patient_name, created_at, clinical_data")
      .in("user_id", doctorIds)
      .order("created_at", { ascending: false });

    const allSessions = sessions || [];

    // 4. Stats
    const uniquePatients = new Set(allSessions.map(s => s.patient_id)).size;
    const totalSessions  = allSessions.length;
    const avgPerDoctor   = linkedDoctors > 0 ? Math.round(totalSessions / linkedDoctors) : 0;

    setStats({ totalSessions, uniquePatients, linkedDoctors, avgPerDoctor });

    // 5. Sessions over last 14 days
    const today = new Date();
    const days  = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (13 - i));
      return {
        label: d.toLocaleDateString("en-IN", { day: "2-digit" }),
        date:  d.toISOString().slice(0, 10),
        count: 0,
      };
    });

    allSessions.forEach(s => {
      const day = s.created_at?.slice(0, 10);
      const entry = days.find(d => d.date === day);
      if (entry) entry.count++;
    });

    setChartData(days);

    // 6. Most common diagnoses (from clinical_data.diagnosis)
    const diagCount = {};
    allSessions.forEach(s => {
      const diags = s.clinical_data?.diagnosis;
      if (Array.isArray(diags)) {
        diags.forEach(d => {
          if (d && d.trim()) {
            const key = d.trim();
            diagCount[key] = (diagCount[key] || 0) + 1;
          }
        });
      }
    });

    const sorted = Object.entries(diagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    setDiagnoses(sorted);

    // 7. Recent sessions (last 8)
    setRecent(allSessions.slice(0, 8));

    setLoading(false);
  };

  if (loading) return (
    <div className="admin-loading">
      <div className="pulse-ring" />
      <p>Loading analytics...</p>
    </div>
  );

  if (!stats) return (
    <div className="admin-content">
      <div className="admin-empty">
        <p style={{ fontSize: "32px" }}>📊</p>
        <p>No hospital found. Please set up your hospital first.</p>
      </div>
    </div>
  );

  const maxCount = Math.max(...chartData.map(d => d.count), 1);

  const diagMax = diagnoses.length > 0 ? diagnoses[0][1] : 1;

  return (
    <div className="admin-content" style={{ maxWidth: "780px" }}>
      <h2 className="admin-page-title">📊 Analytics</h2>
      <p className="admin-page-sub" style={{ marginBottom: "20px" }}>
        Insights &amp; Usage
      </p>

      {/* ── Stat Cards ── */}
      <div className="analytics-stat-grid">
        <div className="analytics-stat-card">
          <span className="analytics-stat-icon">📋</span>
          <span className="analytics-stat-val">{stats.totalSessions}</span>
          <span className="analytics-stat-label">TOTAL SESSIONS</span>
        </div>
        <div className="analytics-stat-card">
          <span className="analytics-stat-icon">🧑</span>
          <span className="analytics-stat-val">{stats.uniquePatients}</span>
          <span className="analytics-stat-label">UNIQUE PATIENTS</span>
        </div>
        <div className="analytics-stat-card">
          <span className="analytics-stat-icon">👨‍⚕️</span>
          <span className="analytics-stat-val">{stats.linkedDoctors}</span>
          <span className="analytics-stat-label">LINKED DOCTORS</span>
        </div>
        <div className="analytics-stat-card">
          <span className="analytics-stat-icon">📈</span>
          <span className="analytics-stat-val">{stats.avgPerDoctor}</span>
          <span className="analytics-stat-label">AVG / DOCTOR</span>
        </div>
      </div>

      {/* ── Sessions Bar Chart ── */}
      <div className="admin-form-card" style={{ marginBottom: "16px" }}>
        <p className="analytics-section-title">📅 Sessions — Last 14 Days</p>
        <div className="analytics-bar-chart">
          {chartData.map((d, i) => (
            <div key={i} className="analytics-bar-col">
              <div className="analytics-bar-track">
                <div
                  className="analytics-bar-fill"
                  style={{ height: `${(d.count / maxCount) * 100}%` }}
                  title={`${d.count} session${d.count !== 1 ? "s" : ""}`}
                />
              </div>
              <span className="analytics-bar-label">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Most Common Diagnoses ── */}
      <div className="admin-form-card" style={{ marginBottom: "16px" }}>
        <p className="analytics-section-title">🩺 Most Common Diagnoses</p>
        {diagnoses.length === 0 ? (
          <p style={{ fontSize: "13px", color: "var(--text3)", padding: "8px 0" }}>
            No diagnosis data yet.
          </p>
        ) : (
          <div className="analytics-diag-list">
            {diagnoses.map(([name, count], i) => (
              <div key={i} className="analytics-diag-row">
                <span className="analytics-diag-name" title={name}>
                  {name.length > 36 ? name.slice(0, 34) + "…" : name}
                </span>
                <div className="analytics-diag-bar-track">
                  <div
                    className="analytics-diag-bar-fill"
                    style={{ width: `${(count / diagMax) * 100}%` }}
                  />
                </div>
                <span className="analytics-diag-count">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Recent Sessions ── */}
      <div className="admin-form-card">
        <p className="analytics-section-title">🕐 Recent Sessions</p>
        {recentSessions.length === 0 ? (
          <p style={{ fontSize: "13px", color: "var(--text3)", padding: "8px 0" }}>
            No sessions recorded yet.
          </p>
        ) : (
          <div className="analytics-session-list">
            {recentSessions.map((s, i) => {
              const diags = s.clinical_data?.diagnosis;
              const firstDiag = Array.isArray(diags) && diags.length > 0 ? diags[0] : null;
              const dt = new Date(s.created_at);
              const dateStr = dt.toLocaleDateString("en-IN", {
                day: "2-digit", month: "short", year: "numeric",
              });
              const timeStr = dt.toLocaleTimeString("en-IN", {
                hour: "2-digit", minute: "2-digit", hour12: true,
              });

              return (
                <div key={s.id} className="analytics-session-row">
                  <div className="analytics-session-icon">📄</div>
                  <div className="analytics-session-info">
                    <span className="analytics-session-patient">
                      Patient: {s.patient_name || s.patient_id || "Unknown"}
                    </span>
                    <span className="analytics-session-time">
                      {dateStr}, {timeStr}
                    </span>
                  </div>
                  {firstDiag && (
                    <span className="analytics-session-diag">
                      {firstDiag.length > 24 ? firstDiag.slice(0, 22) + "…" : firstDiag}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
