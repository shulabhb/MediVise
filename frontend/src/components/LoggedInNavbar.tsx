import { NavLink, Link } from 'react-router-dom';
import logo2 from '../assets/MediVise2.png';
import SOSButton from './SOSButton';
import UserMenu from './UserMenu';

export default function LoggedInNavbar() {
  return (
    <>
      {/* Top-left logo (consistent on logged-in pages) */}
      <Link to="/about">
        <img src={logo2} alt="MediVise" className="nav-logo-small" />
      </Link>

      {/* Floating glass navbar */}
      <nav className="stage-nav">
        <div className="nav-links">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} aria-label="Dashboard">
            <span className="nav-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="nav-text">Home</span>
            <span className="nav-tooltip">Home</span>
          </NavLink>
          <NavLink to="/chat" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} aria-label="Chat">
            <span className="nav-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="nav-text">Chat</span>
            <span className="nav-tooltip">Chat</span>
          </NavLink>
          <NavLink to="/medications" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} aria-label="Medications">
            <span className="nav-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="8" height="18" rx="4" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M21 7l-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </span>
            <span className="nav-text">Medications</span>
            <span className="nav-tooltip">Medications</span>
          </NavLink>
          <NavLink to="/appointments" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} aria-label="Appointments">
            <span className="nav-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </span>
            <span className="nav-text">Appointments</span>
            <span className="nav-tooltip">Appointments</span>
          </NavLink>
          <NavLink to="/documents" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} aria-label="Documents">
            <span className="nav-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.8"/>
              </svg>
            </span>
            <span className="nav-text">Documents</span>
            <span className="nav-tooltip">Documents</span>
          </NavLink>
          <NavLink to="/game" aria-label="Game" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="nav-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 8h12a4 4 0 0 1 4 4v4a2 2 0 0 1-2 2h-2l-2-2h-4l-2 2H8l-2-2H4a2 2 0 0 1-2-2v-4a4 4 0 0 1 4-4z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M9 12h-3m1.5-1.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="16.5" cy="12.5" r="1" fill="currentColor"/>
                <circle cx="19" cy="10.5" r="1" fill="currentColor"/>
              </svg>
            </span>
            <span className="nav-text sr-only">Game</span>
            <span className="nav-tooltip">Game</span>
          </NavLink>
          <SOSButton />
          <UserMenu />
        </div>
      </nav>
    </>
  );
}


