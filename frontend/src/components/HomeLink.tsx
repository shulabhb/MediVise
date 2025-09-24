import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Props = {
  className?: string;
  children?: React.ReactNode;
};

export default function HomeLink({ className, children }: Props) {
  const { currentUser } = useAuth() as any;
  // Some AuthContext expose `user`, others `currentUser` – check both
  const user = currentUser ?? (useAuth() as any).user;
  const to = user ? '/dashboard' : '/';
  const label = user ? 'Dashboard' : (children || 'Home');
  return (
    <Link to={to} className={className}>
      {label}
    </Link>
  );
}


