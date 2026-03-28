import { useState } from 'react';
import { supabase } from '../services/supabase';

export default function AuthGate() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handle = async () => {
    setLoading(true); setError(null);
    const fn = mode === 'login'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    if (error) setError(error.message);
    else if (mode === 'signup') setMessage('Check your email to confirm!');
    setLoading(false);
  };

  return (
    <div className="key-overlay">
      <div className="key-card">
        <div className="key-icon">🏥</div>
        <h2>{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>
        <input className="key-input" type="email" placeholder="Email"
          value={email} onChange={e => setEmail(e.target.value)} />
        <input className="key-input" type="password" placeholder="Password"
          value={password} onChange={e => setPassword(e.target.value)} style={{marginTop:'10px'}} />
        {error && <p style={{color:'red', fontSize:'14px'}}>{error}</p>}
        {message && <p style={{color:'green', fontSize:'14px'}}>{message}</p>}
        <button className="key-btn" onClick={handle} disabled={loading || !email || !password}>
          {loading ? 'Loading...' : mode === 'login' ? 'Sign In →' : 'Sign Up →'}
        </button>
        <p style={{fontSize:'13px', marginTop:'12px', cursor:'pointer', opacity:0.7}}
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </p>
      </div>
    </div>
  );
}
