import { Link } from 'react-router-dom';
import logo from '../assets/MediVise.png';
import logo2 from '../assets/MediVise2.png';
import banner from '../assets/Banner.png';

export default function About() {
  return (
    <div className="stack" style={{ textAlign: 'center', maxWidth: 1080 }}>
      <div className="topbar">
        <div className="topbar-inner">
        <div className="brand-min">
          <div className="logo-seamless">
            <Link to="/" className="logo-link">
              <img src={logo} alt="MediVise" className="logo-glow nav-logo" />
            </Link>
          </div>
        </div>
        <div className="nav-actions">
          <Link to="/login" className="button small">Log in</Link>
          <Link to="/signup" className="button small primary">Sign up</Link>
        </div>
        </div>
      </div>
      {/* Hero */}
      <div className="brand-hero">
        <div className="welcome-text">
          <span className="welcome-part">WELCOME TO</span>
          <img src={logo2} alt="MediVise" className="welcome-logo" />
        </div>
      </div>

      {/* Inline hero image under heading */}
      <div style={{ width: '100%', display: 'grid', justifyItems: 'center' }}>
        <img src={banner} alt="MediVise" className="inline-hero" />
      </div>

      {/* Mission (highlighted and placed below hero) */}
      <div className="quote-wrap" style={{ marginTop: 4 }}>
        <div className="quote">
          <span className="quote-mark">“</span>
          Our mission is simple: translate healthcare into human language so every patient, family, and caregiver can move forward with clarity and confidence.
          <span className="quote-mark">”</span>
        </div>
        <div className="quote-by">AI‑assisted, privacy‑minded, built for people</div>
      </div>

      {/* Simplify card moved below features */}

      {/* Mission moved above */}

              {/* Services Heading */}
              <div className="services-heading">
                <h2>WHAT MEDIVISE DOES</h2>
              </div>

              {/* Features */}
              <div className="grid">
        <div className="feature">
          <div className="feat-top">
            <div className="feat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="3" width="16" height="18" rx="3" stroke="rgba(96,165,250,0.85)" strokeWidth="1.5"/>
                <path d="M8 9h8M8 13h8M8 17h5" stroke="rgba(168,205,255,0.9)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3>Understand your records</h3>
          </div>
          <p className="small">We turn medical language into everyday words so you know exactly what it means for you.</p>
        </div>
        <div className="feature">
          <div className="feat-top">
            <div className="feat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="rgba(45,212,191,0.85)" strokeWidth="1.5"/>
                <path d="M7 13l2.5-3 3 4 2-2 3 4" stroke="rgba(191,245,234,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Works with photos & PDFs</h3>
          </div>
          <p className="small">Upload a photo or file of your notes or lab results—MediVise reads and organizes it for you.</p>
        </div>
        <div className="feature">
          <div className="feat-top">
            <div className="feat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6.5C4 5.12 5.12 4 6.5 4h11A2.5 2.5 0 0 1 20 6.5v5A2.5 2.5 0 0 1 17.5 14H13l-3.5 4v-4H6.5A2.5 2.5 0 0 1 4 11.5v-5Z" stroke="rgba(187,206,228,0.95)" strokeWidth="1.5"/>
              </svg>
            </div>
            <h3>Ask anything, anytime</h3>
          </div>
          <p className="small">Have a question about a medicine or result? Ask in plain English and get a clear answer.</p>
        </div>
        <div className="feature">
          <div className="feat-top">
            <div className="feat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3l7 4v5c0 4.418-3.134 8-7 9-3.866-1-7-4.582-7-9V7l7-4Z" stroke="rgba(96,165,250,0.85)" strokeWidth="1.5"/>
                <path d="M9.5 12.5l2 2 3-3" stroke="rgba(168,205,255,0.95)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Your information stays yours</h3>
          </div>
          <p className="small">Designed with privacy in mind so you can feel comfortable exploring your health information.</p>
        </div>
        <div className="feature">
          <div className="feat-top">
            <div className="feat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="4" width="18" height="14" rx="2" stroke="rgba(45,212,191,0.85)" strokeWidth="1.5"/>
                <path d="M7 8h6M7 12h10M7 16h5" stroke="rgba(191,245,234,0.95)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3>Keep meds & visits on track</h3>
          </div>
          <p className="small">Save prescriptions and upcoming appointments so the important dates are easy to find.</p>
        </div>
        <div className="feature">
          <div className="feat-top">
            <div className="feat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 16l6-8 4 5 2-2 4 5" stroke="rgba(187,206,228,0.95)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 20h12" stroke="rgba(96,165,250,0.75)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3>See the key highlights</h3>
          </div>
          <p className="small">Get the essentials first—dosage, risks, and next steps—without digging through pages.</p>
        </div>
      </div>

      {/* Simplify card now below features */}
      <div className="card section" style={{ width: 'min(980px,92vw)', textAlign: 'left' }}>
        <h2
          className="hero-title hero-center-small"
          style={{
            marginTop: 0,
            marginBottom: 18,
            background: 'linear-gradient(90deg, #a7f3d0, var(--primary-200))',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          Simplify your healthcare journey
        </h2>
        <div className="lead soft" style={{ textAlign: 'center' }}>
          MediVise helps patients, caregivers, and families make sense of healthcare information.
          Upload doctors’ notes, lab results, or prescriptions, and get a clear, plain‑language summary
          that highlights what matters most — medications, dosages, potential interactions, and next steps.
          Our mission is to reduce confusion and empower you to make informed decisions with confidence.
        </div>
        <div className="lead soft" style={{ marginTop: 10, textAlign: 'center' }}>
          You can also ask follow‑up questions in everyday language and receive answers grounded in your document.
          Whether you’re preparing for an appointment or reviewing past care, MediVise keeps everything simple,
          private, and focused on what you need to know.
        </div>
        <div className="cta-row" style={{ marginTop: 18 }}>
          <Link to="/signup" className="button green">Get started</Link>
        </div>
      </div>

      {/* Disclaimer/Privacy Card */}
      <div className="disclaimer-card">
        <div className="disclaimer-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3>Important Disclaimer</h3>
        </div>
        <div className="disclaimer-content">
          <p><strong>MediVise is not a professional medical advisor.</strong> We are a healthcare information translator and simplifier designed to help you understand your medical records in plain language.</p>
          <p>Our AI-powered tool processes your documents to provide clear summaries, but this information should never replace professional medical advice, diagnosis, or treatment from qualified healthcare providers.</p>
          <p><strong>Your privacy matters:</strong> All uploaded documents and personal health information are processed securely and are not used for any other purposes beyond providing you with simplified explanations. We do not share, sell, or use your data for training our AI models.</p>
          <p>Always consult with your healthcare provider for medical decisions, especially regarding medications, treatments, or health concerns.</p>
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        <p>Designed and Developed by <strong>Shulabh Bhattarai</strong>. © 2025 All rights reserved.</p>
      </div>
    </div>
  );
}


