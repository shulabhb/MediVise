import { Link, useNavigate } from 'react-router-dom';
import HomeLink from '../components/HomeLink';
import logo2 from '../assets/MediVise2.png';
import { useState, useEffect } from 'react';
import { WordRotate } from '../components/WordRotate';
import Ripple from '../components/Ripple';
import ShineBorder from '../components/ShineBorder';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';

/**
 * Home/Landing Page Component
 * 
 * Main entry point for unauthenticated users featuring:
 * - Dynamic authentication forms (login/signup toggle)
 * - Animated logo with WordRotate feature carousel
 * - Ripple background animation
 * - Shine border effects on auth forms
 * - Google OAuth integration
 * - Complete user profile creation flow
 */
export default function Home() {
  const navigate = useNavigate();
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const initialMode = (new URLSearchParams(window.location.search).get('mode') as 'login' | 'signup' | null) || 'none';
  const [mode, setMode] = useState<'none' | 'login' | 'signup'>(initialMode);
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  /**
   * Handle user login with email/password authentication
   * Redirects to dashboard on successful authentication
   */
  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      await signInWithEmail(emailOrUsername, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally { setLoading(false); }
  }

  /**
   * Handle user signup with complete profile creation
   * Creates Firebase user and backend profile with all collected data
   */
  async function onSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      if (password !== confirm) throw new Error('Passwords do not match');
      if (!username || username.length < 3) throw new Error('Username must be at least 3 characters');
      if (usernameError) throw new Error('Username is already taken');
      
      // Create Firebase user first
      await signUpWithEmail(signupEmail, password, username);
      
      // Create backend profile with all user data
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        const createResponse = await fetch('http://127.0.0.1:8000/users', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: username,
            email: signupEmail,
            first_name: firstName,
            last_name: lastName,
            date_of_birth: '', // Can be added later
          }),
        });
        
        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          throw new Error(errorData.detail || 'Failed to create user profile');
        }
      }
      
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Signup failed');
    } finally { setLoading(false); }
  }

  /**
   * Handle Google OAuth sign-in with automatic profile creation
   * Extracts name from Google displayName and creates backend profile
   */
  async function onGoogle() {
    setLoading(true); setError(null);
    try {
      await signInWithGoogle();
      
      // Create backend profile for Google users
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        const createResponse = await fetch('http://127.0.0.1:8000/users', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: user.displayName || user.email?.split('@')[0] || 'user',
            email: user.email || '',
            first_name: user.displayName?.split(' ')[0] || '',
            last_name: user.displayName?.split(' ').slice(1).join(' ') || '',
            date_of_birth: '',
          }),
        });
        
        // Don't throw error if profile already exists
        if (!createResponse.ok && createResponse.status !== 400) {
          console.warn('Failed to create Google user profile:', await createResponse.text());
        }
      }
      
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed');
    } finally { setLoading(false); }
  }

  // Debounced username availability check for signup
  useEffect(() => {
    const t = setTimeout(async () => {
      if (mode !== 'signup') { setUsernameError(null); return; }
      const clean = username.trim();
      if (!clean) { setUsernameError(null); return; }
      if (clean.length < 3) { setUsernameError('Username must be at least 3 characters'); return; }
      setCheckingUsername(true);
      try {
        const res = await fetch(`http://127.0.0.1:8000/public/check-username/${encodeURIComponent(clean)}`);
        const data = await res.json();
        setUsernameError(data.available ? null : 'Username is already taken');
      } catch (_e) {
        setUsernameError(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [username, mode]);

  return (
    <div className="stage-container home-stage">
      <Ripple />
      {/* Navigation */}
      <nav className="stage-nav">
        <div className="nav-links">
          <HomeLink className="nav-link active">
            <span className="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="nav-text">Home</span>
            <span className="nav-tooltip">Home</span>
          </HomeLink>
          <Link to="/about" className="nav-link">
            <span className="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="nav-text">About</span>
            <span className="nav-tooltip">About</span>
          </Link>
        </div>
      </nav>

      {/* Stage Content - Split Layout */}
      <div className="stage-content">
        <div className="stage-split">
          <div className="stage-left">
            <div className="stage-logo" style={{ marginBottom: 0 }}>
              <img src={logo2} alt="MediVise" className="logo-on-stage large" />
            </div>
            {/* WordRotate under logo */}
            <div className="home-carousel">
              <span className="carousel-prefix">MediVise&nbsp;</span>
              <WordRotate
                className="carousel-rotate"
                words={[
                  'Helps you understand your medical records',
                  'Answers plain‑English questions',
                  'Summarizes lab reports and medical notes',
                  'Tracks medications & doses',
                  'Manages upcoming appointments',
                  'Is not a professional medical advisor'
                ]}
              />
            </div>
          </div>
          <div className="stage-right">
            <ShineBorder>
              <div className={`prompt-card minimal ${mode !== 'none' ? 'expanded' : ''}`}>
              {mode === 'none' && (
                <div className="auth-buttons">
                  <button className="auth-btn primary" onClick={() => setMode('login')}>Log In</button>
                  <button className="auth-btn secondary" onClick={() => setMode('signup')}>Sign Up</button>
                  <button type="button" className="auth-btn google" onClick={onGoogle} aria-label="Continue with Google">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>
                </div>
              )}

              {mode === 'login' && (
                <form onSubmit={onLogin} className="form-grid spaced">
                  <div className="field">
                    <label className="small">Email or Username</label>
                    <input className="input boxed" value={emailOrUsername} onChange={(e) => setEmailOrUsername(e.target.value)} type="text" placeholder="username/email" required />
                  </div>
                  <div className="field password">
                    <label className="small">Password</label>
                    <input className="input boxed" value={password} onChange={(e) => setPassword(e.target.value)} type={showPwd ? 'text' : 'password'} placeholder="password" required />
                    <button type="button" className="eye-toggle" aria-label={showPwd ? 'Hide password' : 'Show password'} onClick={() => setShowPwd(v => !v)}>
                      {showPwd ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {error && <p className="small" style={{ color: '#dc2626', margin: 0, fontWeight: '600' }}>{error}</p>}
                  <div className="cta-row">
                    <button className="auth-btn primary" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
                    <button type="button" className="auth-btn secondary" onClick={() => setMode('none')}>Cancel</button>
                  </div>
                  <button type="button" className="auth-btn google" onClick={onGoogle} disabled={loading} aria-label="Continue with Google">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>
                </form>
              )}

              {mode === 'signup' && (
                <form onSubmit={onSignup} className="form-grid spaced">
                  <div className="field">
                    <label className="small">Username</label>
                    <input className="input boxed" value={username} onChange={(e) => setUsername(e.target.value)} type="text" placeholder="username" required />
                    {checkingUsername && (
                      <span className="small" style={{ color: 'var(--muted)', marginTop: 2 }}>Checking...</span>
                    )}
                    {!checkingUsername && usernameError && (
                      <span className="small" style={{ color: '#dc2626', marginTop: 2, fontWeight: '600' }}>{usernameError}</span>
                    )}
                    {!checkingUsername && !usernameError && username.trim().length >= 3 && (
                      <span className="small" style={{ color: '#10b981', marginTop: 2 }}>✓ Username is available</span>
                    )}
                  </div>
                  <div className="field">
                    <label className="small">First Name</label>
                    <input className="input boxed" value={firstName} onChange={(e) => setFirstName(e.target.value)} type="text" placeholder="first name" required />
                  </div>
                  <div className="field">
                    <label className="small">Last Name</label>
                    <input className="input boxed" value={lastName} onChange={(e) => setLastName(e.target.value)} type="text" placeholder="last name" required />
                  </div>
                  <div className="field">
                    <label className="small">Email</label>
                    <input className="input boxed" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} type="email" placeholder="email" required />
                  </div>
                  <div className="field password">
                    <label className="small">Password</label>
                    <input className="input boxed" value={password} onChange={(e) => setPassword(e.target.value)} type={showPwd ? 'text' : 'password'} placeholder="password" required />
                    <button type="button" className="eye-toggle" aria-label={showPwd ? 'Hide password' : 'Show password'} onClick={() => setShowPwd(v => !v)}>
                      {showPwd ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="field password">
                    <label className="small">Confirm Password</label>
                    <input className="input boxed" value={confirm} onChange={(e) => setConfirm(e.target.value)} type={showConfirmPwd ? 'text' : 'password'} placeholder="confirm password" required />
                    <button type="button" className="eye-toggle" aria-label={showConfirmPwd ? 'Hide password' : 'Show password'} onClick={() => setShowConfirmPwd(v => !v)}>
                      {showConfirmPwd ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {error && <p className="small" style={{ color: '#dc2626', margin: 0, fontWeight: '600' }}>{error}</p>}
                  <div className="cta-row">
                    <button className="auth-btn primary" type="submit" disabled={loading || checkingUsername || !!usernameError}>{loading ? 'Creating...' : 'Create Account'}</button>
                    <button type="button" className="auth-btn secondary" onClick={() => setMode('none')}>Cancel</button>
                  </div>
                  <button type="button" className="auth-btn google" onClick={onGoogle} disabled={loading} aria-label="Continue with Google">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>
                </form>
              )}
              </div>
            </ShineBorder>
          </div>
        </div>
      </div>
    </div>
  );
}
