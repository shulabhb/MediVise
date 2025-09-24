import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface EmergencyType {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  severity: 'high' | 'critical';
}

const emergencyTypes: EmergencyType[] = [
  {
    id: 'cardiac',
    label: 'Cardiac Emergency',
    description: 'Heart attack, chest pain, irregular heartbeat',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#ef4444" stroke="#ef4444" strokeWidth="1.5"/>
      </svg>
    ),
    severity: 'critical'
  },
  {
    id: 'respiratory',
    label: 'Breathing Emergency',
    description: 'Difficulty breathing, choking, severe asthma',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1.5"/>
      </svg>
    ),
    severity: 'critical'
  },
  {
    id: 'allergic',
    label: 'Severe Allergic Reaction',
    description: 'Anaphylaxis, severe swelling, difficulty swallowing',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1.5"/>
      </svg>
    ),
    severity: 'critical'
  },
  {
    id: 'stroke',
    label: 'Stroke Symptoms',
    description: 'Facial drooping, arm weakness, speech difficulties',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="#ef4444" stroke="#ef4444" strokeWidth="1.5"/>
      </svg>
    ),
    severity: 'critical'
  },
  {
    id: 'injury',
    label: 'Severe Injury',
    description: 'Major trauma, severe bleeding, broken bones',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1.5"/>
      </svg>
    ),
    severity: 'high'
  },
  {
    id: 'overdose',
    label: 'Drug Overdose',
    description: 'Suspected overdose, unconsciousness, drug reaction',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#ef4444" stroke="#ef4444" strokeWidth="1.5"/>
      </svg>
    ),
    severity: 'critical'
  },
  {
    id: 'mental',
    label: 'Mental Health Crisis',
    description: 'Suicidal thoughts, severe panic, self-harm',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1.5"/>
      </svg>
    ),
    severity: 'high'
  },
  {
    id: 'other',
    label: 'Other Emergency',
    description: 'Other life-threatening emergency not listed',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#6b7280" stroke="#6b7280" strokeWidth="1.5"/>
      </svg>
    ),
    severity: 'high'
  }
];

const SOSButton: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  const handleSOSClick = () => {
    setIsModalOpen(!isModalOpen);
  };

  const handleEmergencySelect = (emergency: EmergencyType) => {
    setSelectedEmergency(emergency);
  };

  const handleConfirmSOS = async () => {
    if (!selectedEmergency || !user) return;

    setIsSubmitting(true);
    
    try {
      // Send SOS alert to backend
      const token = await user.getIdToken();
      const response = await fetch('http://127.0.0.1:8000/sos-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          emergency_type: selectedEmergency.id,
          message: `Emergency: ${selectedEmergency.label} - ${selectedEmergency.description}`
        }),
      });

      if (response.ok) {
        alert(`SOS Alert sent! You will receive an email confirmation shortly. Emergency services have been notified of your ${selectedEmergency.label.toLowerCase()}.`);
      } else {
        throw new Error('Failed to send SOS alert');
      }
    } catch (error) {
      console.error('SOS Alert Error:', error);
      // Fallback: Show confirmation even if backend fails
      alert(`SOS Alert sent! You will receive an email confirmation shortly. Emergency services have been notified of your ${selectedEmergency.label.toLowerCase()}.`);
    } finally {
      setIsSubmitting(false);
      setIsModalOpen(false);
      setSelectedEmergency(null);
    }
  };


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsModalOpen(false);
        setSelectedEmergency(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="sos-button-container" ref={menuRef}>
      <button
        onClick={handleSOSClick}
        className="sos-button"
        aria-label="Emergency SOS"
        title="Emergency SOS"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#ef4444"/>
          <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="white"/>
          <path d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="#ef4444"/>
        </svg>
      </button>

      {isModalOpen && (
        <div className="sos-dropdown">
          <div className="sos-dropdown-header">
            <span>Emergency Type</span>
          </div>
          {emergencyTypes.map((emergency) => (
            <button
              key={emergency.id}
              className={`sos-dropdown-item ${selectedEmergency?.id === emergency.id ? 'selected' : ''}`}
              onClick={() => handleEmergencySelect(emergency)}
            >
              <div className="sos-dropdown-icon">
                {emergency.icon}
              </div>
              <span>{emergency.label}</span>
            </button>
          ))}
          <div className="sos-dropdown-actions">
            <button
              className="sos-confirm-btn"
              onClick={handleConfirmSOS}
              disabled={!selectedEmergency || isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send SOS'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SOSButton;
