import { Link } from 'react-router-dom';
import HomeLink from '../components/HomeLink';
import logo2 from '../assets/MediVise2.png';
import banner from '../assets/Banner.png';
import Typewriter from '../components/Typewriter';
import DisclaimerCarousel from '../components/DisclaimerCarousel';

export default function About() {
  return (
    <div className="stage-container">
      {/* Navigation */}
      <nav className="stage-nav">
        <div className="nav-links">
          <HomeLink className="nav-link">
            <span className="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="nav-text">Home</span>
            <span className="nav-tooltip">Home</span>
          </HomeLink>
          <Link to="/about" className="nav-link active">
            <span className="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="nav-text">About</span>
            <span className="nav-tooltip">About</span>
          </Link>
        </div>
      </nav>

      {/* About Content */}
      <div className="about-content" style={{ paddingTop: '15.5rem' }}>
        {/* Hero Section - centered logo + subtitle */}
        <div className="about-hero" style={{ textAlign: 'center', display: 'grid', gap: '0.75rem', justifyItems: 'center' }}>
          <div className="mission-section" style={{ marginBottom: '2rem' }}>
            <div className="mission-quote">
              <Typewriter
                text={"Trouble understanding your healthcare documents? Don't worry, MediVise is here to simplify it for you!"}
                speedMs={20}
                startDelayMs={200}
              />
            </div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(15px)',
            borderRadius: '20px',
            padding: '1.5rem',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            display: 'inline-block'
          }}>
            <img src={logo2} alt="MediVise" className="about-logo" style={{ height: '20rem' }} />
            <p className="about-subtitle" style={{ textAlign: 'center', margin: '1rem 0 0 0' }}>Simplifying healthcare for everyone</p>
          </div>
        </div>

        {/* Mission (moved above banner) */}
        <div className="mission-section" style={{
          background: 'rgba(255,255,255,0.2)',
          backdropFilter: 'blur(15px)',
          borderRadius: '20px',
          padding: '2rem',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          margin: '2rem auto',
          maxWidth: '800px',
          textAlign: 'center',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.4)';
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
        }}>
          <div className="mission-quote">
            <span className="quote-mark">"</span>
            Our mission is simple: translate healthcare into human language so every patient, family, and caregiver can move forward with clarity and confidence.
            <span className="quote-mark">"</span>
          </div>
        </div>
        <div className="mission-tagline" style={{ color: '#000000', textAlign: 'center', margin: '1rem 0' }}>AI‑assisted, privacy‑minded, built for people</div>

        {/* Banner Image (smaller) */}
        <div className="about-banner" style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(15px)',
          borderRadius: '20px',
          padding: '0.75rem',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '2rem 0',
          width: '100vw',
          maxWidth: 'none',
          textAlign: 'center',
          position: 'relative',
          left: '50%',
          right: '50%',
          marginLeft: '-50vw',
          marginRight: '-50vw'
        }}>
          <img src={banner} alt="MediVise" className="banner-image" style={{ maxWidth: '1220px', width: '90%', borderRadius: 16 }} />
        </div>

        {/* What MediVise Does */}
        <div className="services-section" style={{ 
          background: 'rgba(255,255,255,0.1)', 
          backdropFilter: 'blur(20px)', 
          borderRadius: '24px', 
          padding: '2rem', 
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          margin: '2rem 0'
        }}>
          <h2 style={{ 
            fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: '2.5rem',
            fontWeight: '300',
            letterSpacing: '-0.02em',
            color: '#1a1a1a',
            margin: '0 0 2rem 0',
            textAlign: 'center'
          }}>Services</h2>
          <div className="bento-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', maxWidth: '1000px', margin: '0 auto' }}>
            <div className="bento-card" style={{ 
              gridColumn: 'span 2', 
              gridRow: 'span 1', 
              background: 'rgba(255,255,255,0.9)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.3)', 
              borderRadius: '20px', 
              padding: '1.5rem', 
              color: '#1a1a1a',
              fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease'
            }}>
              <div className="feature-icon" style={{ color: '#1e40af', marginBottom: '0.75rem' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="3" width="16" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 style={{ 
                color: '#1e40af', 
                margin: '0 0 0.5rem 0', 
                fontSize: '1.3rem', 
                fontWeight: '500',
                letterSpacing: '-0.01em'
              }}>Understand your records</h3>
              <p style={{ 
                margin: 0, 
                color: '#4a5568', 
                lineHeight: '1.6',
                fontSize: '0.95rem',
                fontWeight: '400'
              }}>We turn medical language into everyday words so you know exactly what it means for you.</p>
            </div>

            <div className="bento-card" style={{ gridColumn: 'span 1', gridRow: 'span 2', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '1.5rem', color: '#1a1a1a', fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", boxShadow: '0 4px 16px rgba(0,0,0,0.1)', transition: 'all 0.3s ease' }}>
              <div className="feature-icon" style={{ color: '#1e40af', marginBottom: '0.75rem' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M7 13l2.5-3 3 4 2-2 3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 style={{ 
                color: '#1e40af', 
                margin: '0 0 0.5rem 0', 
                fontSize: '1.3rem', 
                fontWeight: '500',
                letterSpacing: '-0.01em'
              }}>Works with photos & PDFs</h3>
              <p style={{ 
                margin: 0, 
                color: '#4a5568', 
                lineHeight: '1.6',
                fontSize: '0.95rem',
                fontWeight: '400'
              }}>Upload a photo or file of your notes or lab results—MediVise reads and organizes it for you.</p>
            </div>

            <div className="bento-card" style={{ gridColumn: 'span 1', gridRow: 'span 1', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '1.5rem', color: '#1a1a1a', fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", boxShadow: '0 4px 16px rgba(0,0,0,0.1)', transition: 'all 0.3s ease' }}>
              <div className="feature-icon" style={{ color: '#1e40af', marginBottom: '0.75rem' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 6.5C4 5.12 5.12 4 6.5 4h11A2.5 2.5 0 0 1 20 6.5v5A2.5 2.5 0 0 1 17.5 14H13l-3.5 4v-4H6.5A2.5 2.5 0 0 1 4 11.5v-5Z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <h3 style={{ 
                color: '#1e40af', 
                margin: '0 0 0.5rem 0', 
                fontSize: '1.3rem', 
                fontWeight: '500',
                letterSpacing: '-0.01em'
              }}>Ask anything, anytime</h3>
              <p style={{ 
                margin: 0, 
                color: '#4a5568', 
                lineHeight: '1.6',
                fontSize: '0.95rem',
                fontWeight: '400'
              }}>Have a question about a medicine or result? Ask in plain English and get a clear answer.</p>
            </div>

            <div className="bento-card" style={{ gridColumn: 'span 1', gridRow: 'span 1', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '1.5rem', color: '#1a1a1a', fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", boxShadow: '0 4px 16px rgba(0,0,0,0.1)', transition: 'all 0.3s ease' }}>
              <div className="feature-icon" style={{ color: '#1e40af', marginBottom: '0.75rem' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3l7 4v5c0 4.418-3.134 8-7 9-3.866-1-7-4.582-7-9V7l7-4Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M9.5 12.5l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 style={{ 
                color: '#1e40af', 
                margin: '0 0 0.5rem 0', 
                fontSize: '1.3rem', 
                fontWeight: '500',
                letterSpacing: '-0.01em'
              }}>Keep meds & visits on track</h3>
              <p style={{ 
                margin: 0, 
                color: '#4a5568', 
                lineHeight: '1.6',
                fontSize: '0.95rem',
                fontWeight: '400'
              }}>Never miss a dose or appointment. MediVise helps you stay organized and healthy.</p>
            </div>

            <div className="bento-card" style={{ gridColumn: 'span 1', gridRow: 'span 1', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '1.5rem', color: '#1a1a1a', fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", boxShadow: '0 4px 16px rgba(0,0,0,0.1)', transition: 'all 0.3s ease' }}>
              <div className="feature-icon" style={{ color: '#1e40af', marginBottom: '0.75rem' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3l7 4v5c0 4.418-3.134 8-7 9-3.866-1-7-4.582-7-9V7l7-4Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M9.5 12.5l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 style={{ 
                color: '#1e40af', 
                margin: '0 0 0.5rem 0', 
                fontSize: '1.3rem', 
                fontWeight: '500',
                letterSpacing: '-0.01em'
              }}>Your information stays yours</h3>
              <p style={{ 
                margin: 0, 
                color: '#4a5568', 
                lineHeight: '1.6',
                fontSize: '0.95rem',
                fontWeight: '400'
              }}>Designed with privacy in mind so you can feel comfortable exploring your health information.</p>
            </div>

            <div className="bento-card" style={{ gridColumn: 'span 2', gridRow: 'span 1', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '1.5rem', color: '#1a1a1a', fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", boxShadow: '0 4px 16px rgba(0,0,0,0.1)', transition: 'all 0.3s ease' }}>
              <div className="feature-icon" style={{ color: '#1e40af', marginBottom: '0.75rem' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 16l6-8 4 5 2-2 4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 20h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 style={{ 
                color: '#1e40af', 
                margin: '0 0 0.5rem 0', 
                fontSize: '1.3rem', 
                fontWeight: '500',
                letterSpacing: '-0.01em'
              }}>See the key highlights</h3>
              <p style={{ 
                margin: 0, 
                color: '#4a5568', 
                lineHeight: '1.6',
                fontSize: '0.95rem',
                fontWeight: '400'
              }}>Get the essentials first—dosage, risks, and next steps—without digging through pages.</p>
            </div>
          </div>
        </div>

        {/* Simplify Section */}
        <div className="simplify-section">
          <h2>Simplify your healthcare journey</h2>
          <p>MediVise helps patients, caregivers, and families make sense of healthcare information. Upload doctors' notes, lab results, or prescriptions, and get a clear, plain‑language summary that highlights what matters most — medications, dosages, potential interactions, and next steps.</p>
        </div>

        {/* Disclaimer/Privacy Carousel */}
        <DisclaimerCarousel
          showArrows={false}
          slides={[
            {
              title: 'Privacy & Data Protection',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9.5 11.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0Z" stroke="#fbbf24" strokeWidth="1.5"/>
                </svg>
              ),
              body: (
                <>
                  <p><strong>Your privacy matters.</strong> Uploaded documents and personal health information are processed only to generate your explanations. We never sell your data or use it to train models.</p>
                  <p>All processing uses industry‑standard security. You remain in control and can delete your content at any time.</p>
                </>
              ),
            },
            {
              title: 'Not a Medical Advisor',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 9v6m-3-3h6" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="12" cy="12" r="9" stroke="#fbbf24" strokeWidth="1.5"/>
                </svg>
              ),
              body: (
                <>
                  <p><strong>MediVise explains—doesn't prescribe.</strong> Information provided is for understanding and education only.</p>
                  <p>For diagnosis, treatment, emergencies, or medication questions, consult a licensed healthcare professional.</p>
                </>
              ),
            },
          ]}
        />

        {/* Footer */}
        <div className="about-footer">
          <p>Designed and Developed by Shulabh Bhattarai. © 2025 All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}


