import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInWithPopup, updateProfile } from 'firebase/auth';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, username?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Ensure backend profile exists immediately after login
  useEffect(() => {
    async function ensureBackendProfile() {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const username = user.displayName || user.email?.split('@')[0] || 'user';
        await fetch('http://127.0.0.1:8000/users', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            email: user.email || '',
            first_name: '',
            last_name: '',
            date_of_birth: '',
          }),
        }).catch(() => {});
      } catch {
        // no-op; dashboard has fallback creation too
      }
    }
    ensureBackendProfile();
  }, [user]);

  function mapFirebaseError(err: any): string {
    const code = err?.code || '';
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        return 'Incorrect email/username or password.';
      case 'auth/user-not-found':
        return 'No account found with those credentials.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and try again.';
      case 'auth/email-already-in-use':
        return 'That email is already in use. Try logging in.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 6 characters.';
      default:
        return err?.message?.replace(/^Firebase:\s*/i, '') || 'Something went wrong. Please try again.';
    }
  }

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    async signInWithEmail(emailOrUsername, password) {
      try {
        let ident = emailOrUsername;
        // If it doesn't look like an email, try resolving as username via backend
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailOrUsername)) {
          try {
            const r = await fetch(`http://127.0.0.1:8000/public/resolve-username/${encodeURIComponent(emailOrUsername)}`);
            if (r.ok) {
              const data = await r.json();
              if (data?.email) ident = data.email;
            }
          } catch { /* fallback to original */ }
        }
        await signInWithEmailAndPassword(auth, ident, password);
      } catch (e: any) {
        throw new Error(mapFirebaseError(e));
      }
    },
    async signUpWithEmail(email, password, _username) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Best-effort: set displayName to provided username for consistency
        if (_username && cred.user) {
          try { await updateProfile(cred.user, { displayName: _username }); } catch {}
        }
      } catch (e: any) {
        throw new Error(mapFirebaseError(e));
      }
    },
    async signInWithGoogle() {
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (e: any) {
        throw new Error(mapFirebaseError(e));
      }
    },
    async logout() {
      await signOut(auth);
    },
  }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


