import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserIcon from './UserIcon';

export default function UserMenu() {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  async function onLogout() {
    if (confirm('Are you sure you want to log out?')) {
      await logout();
      window.location.href = '/';
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="nav-link"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', border: 0, cursor: 'pointer', padding: '0.5rem 1.5rem' }}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        <UserIcon size={18} color="#e5e7eb" />
      </button>
      {open && (
        <div
          role="menu"
          style={{ position: 'absolute', right: 0, top: '110%', minWidth: 200, background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 12, boxShadow: '0 12px 28px rgba(0,0,0,0.35)', padding: 6, zIndex: 200 }}
        >
          <Link to="/profile" className="nav-link" role="menuitem" onClick={() => setOpen(false)} style={{ display: 'block', padding: '10px 14px', borderRadius: 8 }}>Profile</Link>
          <button role="menuitem" onClick={onLogout} className="nav-link" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', borderRadius: 8, background: 'transparent', border: 0, cursor: 'pointer' }}>Logout</button>
        </div>
      )}
    </div>
  );
}


