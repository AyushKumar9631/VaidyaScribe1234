import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";

export default function LinkHospital({ user, onClose }) {
  const [code, setCode]         = useState("");
  const [pass, setPass]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [linked, setLinked]     = useState(null); // currently linked hospital
  const [checking, setChecking] = useState(true);

  useEffect(() => { checkExistingLink(); }, []);

  const checkExistingLink = async () => {
    setChecking(true);
    const { data } = await supabase
      .from("doctor_hospital_links")
      .select("*, hospitals(hospital_name, hospital_code)")
      .eq("doctor_id", user.id)
      .single();
    if (data) setLinked(data);
    setChecking(false);
  };

  const handleLink = async () => {
    setLoading(true); setError(null);
    if (!code || !pass) { setError("Both fields are required"); setLoading(false); return; }

    // Find hospital matching code + pass
    const { data: hospital, error: hErr } = await supabase
      .from("hospitals")
      .select("*")
      .eq("hospital_code", code.toUpperCase())
      .eq("hospital_pass", pass)
      .single();

    if (hErr || !hospital) {
      setError("Invalid Hospital Code or Password. Please check with your admin.");
      setLoading(false); return;
    }

    // Link doctor to hospital
    const { error: lErr } = await supabase
      .from("doctor_hospital_links")
      .upsert({
        doctor_id: user.id,
        hospital_id: hospital.id,
        doctor_email: user.email,
      }, { onConflict: "doctor_id,hospital_id" });

    if (lErr) { setError(lErr.message); setLoading(false); return; }

    await checkExistingLink();
    setLoading(false);
  };

  const handleUnlink = async () => {
    if (!linked) return;
    setLoading(true);
    await supabase.from("doctor_hospital_links").delete().eq("id", linked.id);
    setLinked(null);
    setLoading(false);
  };

  return (
    <div className="key-overlay">
      <div className="key-card">
        <button className="back-btn" style={{ position: "absolute", top: "16px", left: "16px" }} onClick={onClose}>← Back</button>

        <div className="key-icon">🔗</div>
        <h2>Link to Hospital</h2>

        {checking && <p style={{ color: "var(--text3)", fontSize: "13px" }}>Checking link status...</p>}

        {!checking && linked && (
          <div style={{ width: "100%" }}>
            <div className="admin-creds-card" style={{ marginBottom: "14px" }}>
              <p className="admin-creds-title">✅ Currently linked to</p>
              <div className="admin-creds-row">
                <span>Hospital</span>
                <span className="mono">{linked.hospitals?.hospital_name}</span>
              </div>
              <div className="admin-creds-row">
                <span>Code</span>
                <span className="mono">{linked.hospitals?.hospital_code}</span>
              </div>
            </div>
            <button className="key-btn" onClick={handleUnlink} disabled={loading}
              style={{ background: "var(--red)" }}>
              {loading ? "Unlinking..." : "Unlink from Hospital"}
            </button>
          </div>
        )}

        {!checking && !linked && (
          <>
            <p style={{ color: "var(--text2)", fontSize: "13px", marginBottom: "18px" }}>
              Enter the Hospital Code and Password provided by your hospital administrator.
            </p>
            <input className="key-input" placeholder="Hospital Code (e.g. AIIMS01)"
              value={code} onChange={e => setCode(e.target.value.toUpperCase())} />
            <input className="key-input" type="password" placeholder="Hospital Password"
              value={pass} onChange={e => setPass(e.target.value)} style={{ marginTop: "10px" }} />
            {error && <p style={{ color: "var(--red)", fontSize: "13px", marginTop: "8px" }}>{error}</p>}
            <button className="key-btn" onClick={handleLink} disabled={loading} style={{ marginTop: "14px" }}>
              {loading ? "Linking..." : "Link to Hospital →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
