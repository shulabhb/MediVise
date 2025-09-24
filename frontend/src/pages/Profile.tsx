import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import HomeLink from '../components/HomeLink';
import logo2 from '../assets/MediVise2.png';
import UserMenu from '../components/UserMenu';
import SOSButton from '../components/SOSButton';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, getAuth, sendPasswordResetEmail } from 'firebase/auth';

interface UserProfile {
  uid: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
}

export default function Profile() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);

  // Change password state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  // Fetch user profile on component mount
  useEffect(() => {
    fetchUserProfile();
  }, []);

  async function fetchUserProfile() {
    if (!user) return;
    
    try {
      const token = await user.getIdToken();
      const response = await fetch('http://127.0.0.1:8000/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
        setUsername(data.user.username);
        setFirstName(data.user.first_name);
        setLastName(data.user.last_name);
        setEmail(data.user.email);
      } else if (response.status === 404) {
        // User profile doesn't exist yet, create it with Firebase user data
        console.log('User profile not found, creating new profile...');
        try {
          const createResponse = await fetch('http://127.0.0.1:8000/users', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: user.displayName || user.email?.split('@')[0] || 'user',
              email: user.email || '',
              first_name: '',
              last_name: '',
              date_of_birth: '',
            }),
          });
          
          if (createResponse.ok) {
            const createData = await createResponse.json();
            setProfile(createData.user);
            setUsername(createData.user.username);
            setFirstName(createData.user.first_name);
            setLastName(createData.user.last_name);
            setEmail(createData.user.email);
          } else {
            // Fallback to Firebase user data
            setUsername(user.displayName || user.email?.split('@')[0] || '');
            setEmail(user.email || '');
          }
        } catch (createErr) {
          console.error('Error creating user profile:', createErr);
          // Fallback to Firebase user data
          setUsername(user.displayName || user.email?.split('@')[0] || '');
          setEmail(user.email || '');
        }
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Failed to load profile data');
    } finally {
      setFetching(false);
    }
  }

  async function checkUsernameAvailability(usernameToCheck: string) {
    if (!usernameToCheck || usernameToCheck === profile?.username) {
      setUsernameError(null);
      return;
    }

    setCheckingUsername(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/users/check-username/${usernameToCheck}`);
      const data = await response.json();
      
      if (!data.available) {
        setUsernameError('Username is already taken');
      } else {
        setUsernameError(null);
      }
    } catch (err) {
      console.error('Error checking username:', err);
      setUsernameError('Error checking username availability');
    } finally {
      setCheckingUsername(false);
    }
  }

  // Debounced username checking
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (username && username.length >= 3) {
        checkUsernameAvailability(username);
      } else if (username.length > 0 && username.length < 3) {
        setUsernameError('Username must be at least 3 characters');
      } else {
        setUsernameError(null);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    // Validation
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      setLoading(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      setLoading(false);
      return;
    }

    if (usernameError) {
      setError('Please fix username errors before saving');
      setLoading(false);
      return;
    }

    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('http://127.0.0.1:8000/users/me', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
        setMessage('Profile updated successfully!');
        // Refresh the page to update the dashboard greeting
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to update profile');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  }

  async function deleteAccount() {
    if (!confirm('Are you sure you want to permanently delete your account? This cannot be undone.')) return;
    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      const res = await fetch('http://127.0.0.1:8000/users/me', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete account');
      await logout();
      window.location.href = '/';
    } catch (err: any) {
      alert(err?.message || 'Failed to delete account');
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setError(null); setMessage(null);
    if (!user?.email) { setError('Not authenticated'); return; }
    if (newPwd.length < 8) { setError('New password must be at least 8 characters'); return; }
    if (newPwd !== confirmPwd) { setError('Passwords do not match'); return; }
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPwd);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPwd);
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      setMessage('Password updated successfully');
    } catch (err: any) {
      setError(err?.message || 'Failed to update password');
    }
  }

  return (
    <div className="dashboard-page">
      {/* Top Navigation - consistent */}
      <Link to="/about">
        <img src={logo2} alt="MediVise" className="nav-logo-small" />
      </Link>
      <nav className="stage-nav">
        <div className="nav-links">
          <HomeLink className="nav-link">Dashboard</HomeLink>
          <Link to="/chat" className="nav-link">Chat</Link>
          <Link to="/medications" className="nav-link">Medications</Link>
          <Link to="/appointments" className="nav-link">Appointments</Link>
          <SOSButton />
          <UserMenu />
        </div>
      </nav>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Seamless Profile Layout (no card) */}
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', alignItems: 'start', width: 'min(1100px, 94vw)', margin: '0 auto' }}>
          {/* Avatar + quick actions */}
          <div style={{ display: 'grid', justifyItems: 'center', gap: '1rem' }}>
            <div style={{ width: 220, height: 220, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.22)', boxShadow: '0 16px 44px rgba(0,0,0,0.35)' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #8b5a8b, #6a4c93)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '2rem', fontWeight: 'bold' }}>
                {profile?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ margin: '0 0 6px 0', color: 'rgb(229, 103, 54)' }}>{profile?.username || user?.displayName || user?.email?.split('@')[0] || 'User'}</h2>
              <p style={{ margin: 0, color: 'var(--muted)' }}>{email}</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="button subtle" onClick={async() => { if (!user?.email) return; try { await sendPasswordResetEmail(getAuth(), user.email); alert('Password reset email sent.'); } catch (e:any) { alert(e?.message || 'Failed to send reset email'); } }}>
                Forgot password
              </button>
            </div>
          </div>

          {/* Details */}
          <div style={{ display: 'grid', gap: '1.2rem' }}>
            {fetching ? (
              <p>Loading profile...</p>
            ) : (
              <>
                <form onSubmit={onSubmit} className="form-grid" style={{ marginBottom: 8 }}>
                  <div id="username-field">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label className="small" style={{ color: '#e5e7eb', fontWeight: 600 }}>Username</label>
                      {!isEditingUsername && (
                        <button type="button" className="button subtle" onClick={() => setIsEditingUsername(true)}>
                          Edit
                        </button>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input className={`input ${usernameError ? 'input-error' : ''}`} value={username} onChange={(e) => setUsername(e.target.value)} type="text" placeholder="username" required disabled={!isEditingUsername} />
                      {checkingUsername && isEditingUsername && (
                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '0.8rem' }}>Checking...</div>
                      )}
                    </div>
                    {isEditingUsername && (
                      <div className="cta-row" style={{ justifyContent: 'flex-start', marginTop: 6, gap: 8 }}>
                        <button className="button subtle" type="submit" disabled={loading || checkingUsername || !!usernameError}>
                          {loading ? 'Saving...' : 'Save username'}
                        </button>
                        <button type="button" className="button subtle" onClick={() => { setUsername(profile?.username || username); setUsernameError(null); setIsEditingUsername(false); }}>
                          Cancel
                        </button>
                      </div>
                    )}
                    {usernameError && (<p style={{ color: '#fca5a5', margin: '6px 0 0 0', fontSize: '0.9rem' }}>{usernameError}</p>)}
                    {!usernameError && isEditingUsername && username && username.length >= 3 && (<p style={{ color: '#10b981', margin: '6px 0 0 0', fontSize: '0.9rem', fontWeight: 600 }}>✓ Username is available</p>)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label className="small" style={{ color: '#e5e7eb', fontWeight: 600 }}>First Name</label>
                      <input className="input" value={firstName || ''} type="text" disabled placeholder="first name" />
                    </div>
                    <div>
                      <label className="small" style={{ color: '#e5e7eb', fontWeight: 600 }}>Last Name</label>
                      <input className="input" value={lastName || ''} type="text" disabled placeholder="last name" />
                    </div>
                  </div>
                  <div>
                    <label className="small" style={{ color: '#e5e7eb', fontWeight: 600 }}>Email</label>
                    <input className="input" value={email} type="email" disabled placeholder="email" />
                  </div>
                  {error && <p style={{ color: '#fca5a5', margin: '8px 0 0 0' }}>{error}</p>}
                  {message && <p style={{ color: '#10b981', margin: 0 }}>{message}</p>}
                </form>

                <div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#e5e7eb' }}>Change Password</h3>
                  <form onSubmit={onChangePassword} className="form-grid" style={{ marginBottom: 8 }}>
                    <div className="field"><label className="small" style={{ color: '#e5e7eb', fontWeight: 600 }}>Current Password</label><input className="input" type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} placeholder="current password" required /></div>
                    <div className="field"><label className="small" style={{ color: '#e5e7eb', fontWeight: 600 }}>New Password</label><input className="input" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="new password" required /></div>
                    <div className="field"><label className="small" style={{ color: '#e5e7eb', fontWeight: 600 }}>Confirm New Password</label><input className="input" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} placeholder="confirm new password" required /></div>
                    <div className="cta-row" style={{ justifyContent: 'flex-start' }}><button className="button subtle" type="submit">Update Password</button></div>
                  </form>
                </div>

                <div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#e5e7eb' }}>Account</h3>
                  <div className="account-info">
                    <div className="info-item"><span className="info-label">User ID:</span><span className="info-value">{user?.uid || 'N/A'}</span></div>
                    <div className="info-item"><span className="info-label">Account Created:</span><span className="info-value">{user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}</span></div>
                    <div className="info-item"><span className="info-label">Last Sign In:</span><span className="info-value">{user?.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString() : 'N/A'}</span></div>
                  </div>
                  <div className="cta-row" style={{ marginTop: 14, justifyContent: 'flex-start' }}>
                    <button className="button" onClick={deleteAccount} style={{ background: 'rgba(189, 44, 44, 0.8)', borderColor: 'rgba(246, 242, 242, 0.8)', color: '#fff' }}>Delete Account</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
