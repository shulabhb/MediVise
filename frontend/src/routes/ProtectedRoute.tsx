import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <p style={{ padding: 16 }}>Loading...</p>;
  if (!user) return <Navigate to="/" replace />;
  return children;
}


