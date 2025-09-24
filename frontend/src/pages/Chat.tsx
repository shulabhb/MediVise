import { Link } from 'react-router-dom';
import LoggedInNavbar from '../components/LoggedInNavbar';
import logo2 from '../assets/MediVise2.png';

export default function Chat() {
  return (
    <div className="dashboard-page">
      <Link to="/about">
        <img src={logo2} alt="MediVise" className="nav-logo-small" />
      </Link>
      <LoggedInNavbar />

      <div className="dashboard-content" style={{ display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <h1 className="dashboard-title">Chat</h1>
          <p className="dashboard-subtitle">This section is coming soon.</p>
        </div>
      </div>
    </div>
  );
}


