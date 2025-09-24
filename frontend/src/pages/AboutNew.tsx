import { Link } from 'react-router-dom';
import HomeLink from '../components/HomeLink';
import logo2 from '../assets/MediVise2.png';
import banner from '../assets/Banner.png';
import Typewriter from '../components/Typewriter';
import DisclaimerCarousel from '../components/DisclaimerCarousel';

export default function AboutNew() {
  return (
    <div className="stage-container">
      {/* Navigation */}
      <nav className="stage-nav">
        <div className="nav-links">
          <HomeLink className="nav-link">Home</HomeLink>
          <Link to="/about" className="nav-link active">About</Link>
        </div>
      </nav>

      {/* About Content */}
      <div className="about-content" style={{ paddingTop: '15.5rem' }}>
        {/* Hero Section - centered logo + subtitle */}
        <div className="about-hero" style={{ textAlign: 'center', display: 'grid', gap: '0.75rem', justifyItems: 'center' }}>
          <img src={logo2} alt="MediVise" className="about-logo" style={{ height: '10rem' }} />
          <p className="about-subtitle" style={{ textAlign: 'center', margin: 0 }}>Simplifying healthcare for everyone</p>
        </div>

        {/* Mission (moved above banner) */}
        <div className="mission-section">
          <div className="mission-quote">
            <span className="quote-mark">"</span>
            <Typewriter
              text={"Our mission is simple: translate healthcare into human language so every patient, family, and caregiver can move forward with clarity and confidence."}
              speedMs={20}
              startDelayMs={200}
            />
            <span className="quote-mark">"</span>
          </div>
          <div className="mission-tagline">AI‑assisted, privacy‑minded, built for people</div>
        </div>

        {/* Banner Image (smaller) */}
        <div className="about-banner">
          <img src={banner} alt="MediVise" className="banner-image" style={{ maxWidth: '720px', width: '90%', borderRadius: 16 }} />
        </div>

        {/* What MediVise Does */}
        <div className="services-section">
          <h2>Services</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="3" width="16" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h3>Understand your records</h3>
              <p>We turn medical language into everyday words so you know exactly what it means for you.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M7 13l2.5-3 3 4 2-2 3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Works with photos & PDFs</h3>
              <p>Upload a photo or file of your notes or lab results—MediVise reads and organizes it for you.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 6.5C4 5.12 5.12 4 6.5 4h11A2.5 2.5 0 0 1 20 6.5v5A2.5 2.5 0 0 1 17.5 14H13l-3.5 4v-4H6.5A2.5 2.5 0 0 1 4 11.5v-5Z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <h3>Ask anything, anytime</h3>
              <p>Have a question about a medicine or result? Ask in plain English and get a clear answer.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3l7 4v5c0 4.418-3.134 8-7 9-3.866-1-7-4.582-7-9V7l7-4Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M9.5 12.5l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Keep meds & visits on track</h3>
              <p>Never miss a dose or appointment. MediVise helps you stay organized and healthy.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3l7 4v5c0 4.418-3.134 8-7 9-3.866-1-7-4.582-7-9V7l7-4Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M9.5 12.5l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Your information stays yours</h3>
              <p>Designed with privacy in mind so you can feel comfortable exploring your health information.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 16l6-8 4 5 2-2 4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 20h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h3>See the key highlights</h3>
              <p>Get the essentials first—dosage, risks, and next steps—without digging through pages.</p>
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
                  <p><strong>MediVise explains—doesn’t prescribe.</strong> Information provided is for understanding and education only.</p>
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
