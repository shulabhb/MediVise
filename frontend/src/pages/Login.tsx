import { FormEvent, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import logo2 from '../assets/MediVise2.png';

export default function Login() {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmail(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <Link to="/" className="back-button-left">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back
      </Link>
      <div className="auth-content">
        <img src={logo2} alt="MediVise" className="auth-logo" />
      <div className="card">
      <h2 style={{ margin: 0 }}>Welcome back</h2>
      <p className="small">Sign in to your dashboard</p>
      <form onSubmit={onSubmit} className="form-grid">
        <div>
          <label className="small">Email</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" required />
        </div>
        <div>
          <label className="small">Password</label>
          <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" required />
        </div>
        {error && <p style={{ color: '#fca5a5', margin: 0 }}>{error}</p>}
        <button className="button primary" type="submit" disabled={loading}>Sign in</button>
        <Link to="/signup" className="small" style={{ textAlign: 'center', marginTop: '8px' }}>Forgot password?</Link>
      </form>
      <div className="hr"><span>or</span></div>
      <button className="button" onClick={onGoogle} disabled={loading}>Continue with Google</button>
      <p className="small" style={{ marginTop: 12 }}>No account? <Link to="/signup">Create one</Link></p>
      </div>
      </div>
    </div>
  );
}


