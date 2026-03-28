import { useState } from "react";
import DoctorAuth from "./DoctorAuth";
import AdminAuth from "./AdminAuth";

export default function LandingPage() {
  const [mode, setMode] = useState(null); // null | 'doctor' | 'admin'

  if (mode === "doctor") return <DoctorAuth onBack={() => setMode(null)} />;
  if (mode === "admin")  return <AdminAuth  onBack={() => setMode(null)} />;

  return (
    <div className="landing-bg">
      <div className="landing-card">
        {/* Logo */}
        <div className="landing-logo">
          <div className="landing-logo-mark">🩺</div>
          <h1 className="landing-title">VaidyaScribe</h1>
          <p className="landing-sub">Ambient AI Clinical Scribe</p>
        </div>

        {/* Divider */}
        <div className="landing-divider" />

        <p className="landing-prompt">Continue as</p>

        {/* Buttons */}
        <div className="landing-btns">
          <button className="landing-btn landing-btn-doctor" onClick={() => setMode("doctor")}>
            <span className="landing-btn-icon">👨‍⚕️</span>
            <div>
              <div className="landing-btn-label">Doctor</div>
              <div className="landing-btn-desc">Record & transcribe consultations</div>
            </div>
          </button>

          <button className="landing-btn landing-btn-admin" onClick={() => setMode("admin")}>
            <span className="landing-btn-icon">🏥</span>
            <div>
              <div className="landing-btn-label">Hospital Admin</div>
              <div className="landing-btn-desc">Manage hospital & doctor accounts</div>
            </div>
          </button>
        </div>

        <p className="landing-footer">VaidyaScribe · IIT Patna</p>
      </div>
    </div>
  );
}
