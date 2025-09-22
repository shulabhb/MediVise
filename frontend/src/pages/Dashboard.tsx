import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import logo2 from '../assets/MediVise2.png';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [apiResult, setApiResult] = useState<string>('');

  async function verifyBackend() {
    try {
      const token = await user?.getIdToken();
      const res = await fetch('http://127.0.0.1:8000/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setApiResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setApiResult(err?.message || 'Failed to call backend');
    }
  }

  return (
    <div className="dashboard-page">
      {/* Top Navigation */}
      <div className="dashboard-nav">
        <div className="nav-brand">
          <img src={logo2} alt="MediVise" className="nav-logo-small" />
          <span className="nav-title">MediVise</span>
        </div>
        <div className="nav-actions">
          <button onClick={logout} className="button small">Logout</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Welcome Section */}
        <div className="welcome-section">
          <h1 className="dashboard-title">Welcome back, {user?.displayName || user?.email?.split('@')[0] || 'there'}!</h1>
          <p className="dashboard-subtitle">Ready to simplify your healthcare journey?</p>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <div className="action-card">
            <div className="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Upload Document</h3>
            <p>Upload your medical records, lab results, or prescriptions for AI-powered analysis.</p>
            <button className="button primary">Get Started</button>
          </div>

          <div className="action-card">
            <div className="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Ask Questions</h3>
            <p>Have questions about your health? Ask in plain English and get clear answers.</p>
            <button className="button primary">Ask Now</button>
          </div>

          <div className="action-card">
            <div className="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>View History</h3>
            <p>Review your previous documents and conversations with MediVise.</p>
            <button className="button primary">View All</button>
          </div>

          <div className="action-card">
            <div className="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="2"/>
                <circle cx="16" cy="16" r="2" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <h3>Medications</h3>
            <p>Track your active medications and view your medication history.</p>
            <button className="button primary">Manage Meds</button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="recent-section">
          <h2 className="section-title">Recent Activity</h2>
          <div className="activity-card">
            <div className="activity-item">
              <div className="activity-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="activity-content">
                <h4>Welcome to MediVise!</h4>
                <p>You've successfully logged in. Start by uploading your first document.</p>
                <span className="activity-time">Just now</span>
              </div>
            </div>
          </div>
        </div>

        {/* Backend Verification (Development) */}
        <div className="dev-section">
          <h2 className="section-title">Development Tools</h2>
          <div className="dev-card">
            <button onClick={verifyBackend} className="button">Verify Backend Connection</button>
            {apiResult && (
              <div className="api-result">
                <h4>Backend Response:</h4>
                <pre>{apiResult}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


