import { useState } from "react";
import { supabase } from "../services/supabase";

export default function AdminAuth({ onBack }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode]         = useState("login");
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);

  const handle = async () => {
    setLoading(true); setError(null);

    if (mode === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }

      // Check role — block doctors from using admin portal
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profile?.role === "doctor") {
        // Sign them back out and show a helpful error
        await supabase.auth.signOut();
        setError("This account is registered as a Doctor. Please use the Doctor portal instead.");
        setLoading(false);
        return;
      }

      // role is 'admin' or no profile yet — allow through
      if (!profile) {
        await supabase.from("profiles").upsert({ id: data.user.id, role: "admin" });
      }

    } else {
      // Sign up — always creates admin account from this portal
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      if (data.user) {
        await supabase.from("profiles").upsert({ id: data.user.id, role: "admin" });
      }
    }

    setLoading(false);
  };

  return (
    <div className="landing-bg">
      <div className="key-card" style={{ position: "relative" }}>
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="key-icon">🏥</div>
        <h2>{mode === "login" ? "Admin Sign In" : "Admin Sign Up"}</h2>
        <p style={{ color: "var(--text2)", fontSize: "13px", marginBottom: "20px" }}>
          {mode === "login" ? "Hospital administrator portal" : "Register as hospital administrator"}
        </p>
        <input className="key-input" type="email" placeholder="Admin Email"
          value={email} onChange={e => setEmail(e.target.value)} />
        <input className="key-input" type="password" placeholder="Password"
          value={password} onChange={e => setPassword(e.target.value)}
          style={{ marginTop: "10px" }} />
        {error && (
          <p style={{ color: "var(--red)", fontSize: "13px", marginTop: "8px", lineHeight: "1.5" }}>
            {error}
          </p>
        )}
        <button className="key-btn" onClick={handle}
          disabled={loading || !email || !password} style={{ marginTop: "14px" }}>
          {loading ? "Checking..." : mode === "login" ? "Sign In →" : "Register →"}
        </button>
        <p style={{ fontSize: "13px", marginTop: "12px", cursor: "pointer", opacity: 0.7 }}
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}>
          {mode === "login" ? "New admin? Register here" : "Already registered? Sign in"}
        </p>
      </div>
    </div>
  );
}
