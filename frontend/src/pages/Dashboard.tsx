import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoggedInNavbar from '../components/LoggedInNavbar';
import { BentoGrid, BentoCard } from '../components/Bento';
import WordRotate from '../components/WordRotate';

interface UserProfile {
  uid: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  function MiniCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<number | null> = Array(42).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells[firstDay + d - 1] = d;
    }
    const weekdays = ['S','M','T','W','T','F','S'];
    const today = now.getDate();
    return (
      <div style={{ position: 'absolute', inset: 0, padding: 10, opacity: .7 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
          {weekdays.map((w, idx) => (
            <div key={`${w}-${idx}`} style={{ textAlign: 'center', fontSize: 10, color: '#6b7280' }}>{w}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {cells.map((d, i) => (
            <div key={i} style={{
              height: 18,
              borderRadius: 6,
              background: d ? '#feecc7' : 'transparent',
              display: 'grid', placeItems: 'center',
              color: '#0e1726', fontSize: 10,
              opacity: d ? (d === today ? 1 : .7) : 1,
              border: d === today ? '1px solid #f59e0b' : '1px solid rgba(0,0,0,0.06)'
            }}>
              {d ?? ''}
            </div>
          ))}
        </div>
      </div>
    );
  }

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
        setUserProfile(data.user);
      } else if (response.status === 404) {
        // User profile doesn't exist yet, create it with Firebase user data
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
            setUserProfile(createData.user);
          }
        } catch (createErr) {
          console.error('Error creating user profile:', createErr);
        }
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  }


  return (
    <div className="dashboard-page">
      <LoggedInNavbar />

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Welcome Section */}
        <div className="welcome-section">
          <h1 className="dashboard-title">
            Welcome back, {loadingProfile ? '...' : (userProfile?.username || user?.displayName || user?.email?.split('@')[0] || 'there')}!
          </h1>
          <div className="dashboard-tips">
            <span className="tips-prefix">Ready to </span>
                <WordRotate
                  className="tips-rotate"
                  words={[
                    'simplify your healthcare journey?',
                    'upload your medical documents?',
                    'ask questions about your health?',
                    'track your medications?',
                    'manage your appointments?',
                    'get clear health explanations?'
                  ]}
                  durationMs={2500}
                  transitionMs={500}
                />
          </div>
        </div>

        {/* Quick Actions */}
        <BentoGrid className="bento-lg-rows-3">
          <BentoCard
            title="Upload Documents"
            description="Upload your medical records, lab reports, and health documents for AI analysis"
            cta="Upload Now"
            className="col-span-3 lg:col-span-1"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
            background={
              <div style={{ position: 'absolute', inset: 0, opacity: 0.1 }}>
                <div style={{ position: 'absolute', top: '60%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.8rem', color: '#6b7280', textAlign: 'center' }}>
                  <div>📄 Medical Records</div>
                  <div>📊 Lab Reports</div>
                  <div>📋 Prescriptions</div>
                </div>
              </div>
            }
            onClick={() => navigate('/chat?new=1')}
          />
          
          <BentoCard
            title="Ask Questions"
            description="Get instant answers about your health, medications, and medical conditions"
            cta="Start Chat"
            className="col-span-3 lg:col-span-2"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
            background={
              <div style={{ position: 'absolute', inset: 0, opacity: 0.15, background: 'linear-gradient(135deg, #1f2937, #374151)' }}>
                <div style={{ position: 'absolute', top: '20%', left: '20%', fontSize: '0.7rem', color: '#9ca3af' }}>
                  <div style={{ background: '#374151', padding: '4px 8px', borderRadius: '8px', marginBottom: '4px' }}>What does this medication do?</div>
                  <div style={{ background: '#374151', padding: '4px 8px', borderRadius: '8px', marginBottom: '4px' }}>Explain my lab results</div>
                  <div style={{ background: '#374151', padding: '4px 8px', borderRadius: '8px' }}>Side effects of this drug?</div>
                </div>
                <div style={{ position: 'absolute', bottom: '30%', left: '50%', fontSize: '0.8rem', color: '#6b7280', textAlign: 'center' }}>
                  <div>💬 AI Health Assistant</div>
                  <div>24/7 Medical Q&A</div>
                </div>
              </div>
            }
            onClick={() => navigate('/chat?new=1')}
          />
          
          <BentoCard
            title="Documents"
            description="View and manage your uploaded medical documents and reports"
            cta="View All"
            className="col-span-3 lg:col-span-1"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
            background={
              <div style={{ position: 'absolute', inset: 0, opacity: 0.1 }}>
                <div style={{ position: 'absolute', top: '60%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.8rem', color: '#6b7280', textAlign: 'center' }}>
                  <div>📁 0 Documents</div>
                  <div>📊 0 Reports</div>
                  <div>📋 0 Prescriptions</div>
                </div>
              </div>
            }
            onClick={() => navigate('/documents')}
          />
          
          <BentoCard
            title="Appointments"
            description="Manage your upcoming medical appointments and schedule new ones"
            cta="Schedule"
            className="col-span-3 lg:col-span-1"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
              </svg>
            }
            background={
              <div style={{ position: 'absolute', inset: 0, opacity: 0.1 }}>
                <MiniCalendar />
                <div style={{ position: 'absolute', bottom: '10%', left: '50%', transform: 'translateX(-50%)', fontSize: '0.7rem', color: '#6b7280', textAlign: 'center' }}>
                  <div>📅 No upcoming appointments</div>
                </div>
              </div>
            }
            onClick={() => navigate('/appointments')}
          />
          
          <BentoCard
            title="Medications"
            description="Track your medications, dosages, and refill schedules"
            cta="Add Medication"
            className="col-span-3 lg:col-span-2"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
            background={
              <div style={{ position: 'absolute', inset: 0, opacity: 0.1 }}>
                <div style={{ position: 'absolute', top: '60%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.8rem', color: '#6b7280', textAlign: 'center' }}>
                  <div>💊 0 Active Medications</div>
                  <div>📅 0 Refills Due</div>
                  <div>⏰ 0 Doses Today</div>
                </div>
              </div>
            }
            onClick={() => navigate('/medications')}
          />
        </BentoGrid>

        {/* Disclaimer Carousel */}
        <div className="disclaimer-carousel">
          <div className="disclaimer-track">
            <div className="disclaimer-item">
              <span className="disclaimer-icon">⚠️</span>
              <span className="disclaimer-text">MediVise is not a professional medical advisor. Always consult with healthcare professionals for medical decisions.</span>
            </div>
            <div className="disclaimer-item">
            <span className="disclaimer-icon">⚠️</span>

              <span className="disclaimer-text">This platform is for informational purposes only and should not replace professional medical advice.</span>
            </div>
            <div className="disclaimer-item">
            <span className="disclaimer-icon">⚠️</span>
            <span className="disclaimer-text">In case of medical emergency, contact emergency services immediately.</span>
            </div>
            <div className="disclaimer-item">
            <span className="disclaimer-icon">⚠️</span>
            <span className="disclaimer-text">Your health data is protected with industry-standard security measures.</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="dashboard-footer">
          <div className="footer-content" style={{ display: 'grid', gap: '0.75rem', width: '100%' }}>
            <div className="helpline-carousel">
              <div className="helpline-track">
                <div className="helpline-item">Emergency: <a href="tel:911">911</a> — Immediate emergencies</div>
                <div className="helpline-item">Mental Health: <a href="tel:988">988</a> — Suicide & Crisis Lifeline (24/7)</div>
                <div className="helpline-item">Poison Control: <a href="tel:+18002221222">1‑800‑222‑1222</a></div>
                <div className="helpline-item">Substance Use: <a href="tel:+18006624357">1‑800‑662‑HELP (4357)</a> — SAMHSA (24/7)</div>
                <div className="helpline-item">Domestic Violence: <a href="tel:+18007997233">1‑800‑799‑SAFE (7233)</a></div>
                <div className="helpline-item">Sexual Assault: <a href="tel:+18006564673">1‑800‑656‑HOPE (4673)</a></div>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span className="footercopyright">© 2025 MediVise by Shulabh Bhattarai -- shulabhb.com</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}