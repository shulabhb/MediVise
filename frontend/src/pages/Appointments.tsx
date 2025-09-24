import UserMenu from '../components/UserMenu';
import SOSButton from '../components/SOSButton';
import { Link } from 'react-router-dom';
import HomeLink from '../components/HomeLink';
import logo2 from '../assets/MediVise2.png';

export default function Appointments() {
  return (
    <div className="dashboard-page">
      <Link to="/about">
        <img src={logo2} alt="MediVise" className="nav-logo-small" />
      </Link>
      <nav className="stage-nav">
        <div className="nav-links">
          <HomeLink className="nav-link">Dashboard</HomeLink>
          <Link to="/chat" className="nav-link">Chat</Link>
          <Link to="/medications" className="nav-link">Medications</Link>
          <Link to="/appointments" className="nav-link active">Appointments</Link>
          <SOSButton />
          <UserMenu />
        </div>
      </nav>

      <div className="dashboard-content" style={{ display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <h1 className="dashboard-title">Appointments</h1>
          <p className="dashboard-subtitle">This section is coming soon.</p>
        </div>
      </div>
    </div>
  );
}


