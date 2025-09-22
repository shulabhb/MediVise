import { FormEvent, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import logo2 from '../assets/MediVise2.png';

export default function Signup() {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }
    
    try {
      await signUpWithEmail(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Signup failed');
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
      <h2 style={{ margin: 0 }}>Create your account</h2>
      <p className="small">Join with email or Google</p>
      <form onSubmit={onSubmit} className="form-grid">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label className="small">First Name</label>
            <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} type="text" placeholder="John" required />
          </div>
          <div>
            <label className="small">Last Name</label>
            <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} type="text" placeholder="Doe" required />
          </div>
        </div>
        <div>
          <label className="small">Email</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" required />
        </div>
        <div>
          <label className="small">Date of Birth</label>
          <input className="input" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} type="date" required />
        </div>
        <div>
          <label className="small">Password</label>
          <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" required />
        </div>
        <div>
          <label className="small">Confirm Password</label>
          <input className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" placeholder="••••••••" required />
        </div>
        {error && <p style={{ color: '#fca5a5', margin: 0 }}>{error}</p>}
        <button className="button primary" type="submit" disabled={loading}>Create account</button>
      </form>
      <div className="hr"><span>or</span></div>
      <button className="button" onClick={onGoogle} disabled={loading}>Continue with Google</button>
      <p className="small" style={{ marginTop: 12 }}>Have an account? <Link to="/login">Log in</Link></p>
      </div>
      </div>
    </div>
  );
}


