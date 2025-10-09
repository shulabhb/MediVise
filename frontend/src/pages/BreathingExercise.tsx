import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LoggedInNavbar from '../components/LoggedInNavbar';
import logo2 from '../assets/MediVise2.png';

type BreathingPhase = 'welcome' | 'inhale' | 'hold' | 'exhale' | 'complete';

export default function BreathingExercise() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<BreathingPhase>('welcome');
  const [cycle, setCycle] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

  const breathingCycle = {
    inhale: 4,    // 4 seconds to breathe in
    hold: 4,      // 4 seconds to hold
    exhale: 6,    // 6 seconds to breathe out
  };

  const totalCycleTime = breathingCycle.inhale + breathingCycle.hold + breathingCycle.exhale;
  const maxCycles = 4; // Complete 4 breathing cycles

  const startBreathing = () => {
    setPhase('inhale');
    setCycle(1);
    setIsActive(true);
    setTimeRemaining(breathingCycle.inhale);
  };

  const stopBreathing = () => {
    setIsActive(false);
    setPhase('welcome');
    setCycle(0);
    setTimeRemaining(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const completeSession = () => {
    setIsActive(false);
    setPhase('complete');
    setTimeRemaining(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  useEffect(() => {
    if (!isActive) return;

    const runBreathingCycle = () => {
      let currentTime = 0;
      let currentCycle = 1;
      let currentPhase: BreathingPhase = 'inhale';

      const updateCycle = () => {
        if (currentTime >= totalCycleTime) {
          currentCycle++;
          currentTime = 0;
          currentPhase = 'inhale';
        }

        if (currentCycle > maxCycles) {
          completeSession();
          return;
        }

        // Determine current phase
        if (currentTime < breathingCycle.inhale) {
          currentPhase = 'inhale';
          setTimeRemaining(breathingCycle.inhale - currentTime);
        } else if (currentTime < breathingCycle.inhale + breathingCycle.hold) {
          currentPhase = 'hold';
          setTimeRemaining(breathingCycle.inhale + breathingCycle.hold - currentTime);
        } else {
          currentPhase = 'exhale';
          setTimeRemaining(totalCycleTime - currentTime);
        }

        setPhase(currentPhase);
        setCycle(currentCycle);
        currentTime += 0.1;

        if (isActive && currentCycle <= maxCycles) {
          intervalRef.current = setTimeout(updateCycle, 100);
        }
      };

      updateCycle();
    };

    runBreathingCycle();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive]);

  const getPhaseText = () => {
    switch (phase) {
      case 'welcome':
        return 'Welcome to Breathing Exercise';
      case 'inhale':
        return 'Breathe In';
      case 'hold':
        return 'Hold';
      case 'exhale':
        return 'Breathe Out';
      case 'complete':
        return 'Session Complete';
      default:
        return '';
    }
  };

  const getPhaseInstructions = () => {
    switch (phase) {
      case 'welcome':
        return 'Take a moment to relax and focus on your breathing. This exercise will guide you through 4 calming breathing cycles.';
      case 'inhale':
        return 'Slowly breathe in through your nose...';
      case 'hold':
        return 'Hold your breath gently...';
      case 'exhale':
        return 'Slowly breathe out through your mouth...';
      case 'complete':
        return 'Great job! You\'ve completed your breathing exercise. Take a moment to notice how you feel.';
      default:
        return '';
    }
  };

  const getBreathingScale = () => {
    if (phase === 'welcome' || phase === 'complete') return 1;
    
    const progress = timeRemaining / (phase === 'inhale' ? breathingCycle.inhale : 
                                    phase === 'hold' ? breathingCycle.hold : 
                                    breathingCycle.exhale);
    
    if (phase === 'inhale') {
      return 1 + (1 - progress) * 0.5; // Scale from 1 to 1.5
    } else if (phase === 'hold') {
      return 1.5; // Stay at max scale
    } else {
      return 1.5 - (1 - progress) * 0.5; // Scale from 1.5 to 1
    }
  };

  const getBreathingOpacity = () => {
    if (phase === 'welcome' || phase === 'complete') return 0.8;
    
    const progress = timeRemaining / (phase === 'inhale' ? breathingCycle.inhale : 
                                    phase === 'hold' ? breathingCycle.hold : 
                                    breathingCycle.exhale);
    
    return 0.6 + (1 - progress) * 0.4; // Fade from 0.6 to 1.0
  };

  return (
    <div className="dashboard-page">
      <Link to="/about">
        <img src={logo2} alt="MediVise" className="nav-logo-small" />
      </Link>
      <LoggedInNavbar />

      <div className="dashboard-content breathing-exercise-container">
        <div className="breathing-header">
          <h1 className="dashboard-title">Breathing Exercise</h1>
          <p className="breathing-subtitle">Calm your mind and reduce anxiety</p>
        </div>

        <div className="breathing-main">
          <div className="breathing-circle-container">
            <div 
              className="breathing-circle"
              style={{
                transform: `scale(${getBreathingScale()})`,
                opacity: getBreathingOpacity(),
                backgroundColor: phase === 'inhale' ? '#10b981' : 
                                phase === 'hold' ? '#3b82f6' : 
                                phase === 'exhale' ? '#8b5cf6' : '#6b7280'
              }}
            >
              <div className="breathing-circle-inner">
                <div className="breathing-text">
                  {phase !== 'welcome' && phase !== 'complete' && (
                    <div className="cycle-counter">
                      Cycle {cycle} of {maxCycles}
                    </div>
                  )}
                  <div className="phase-text">{getPhaseText()}</div>
                  {phase !== 'welcome' && phase !== 'complete' && (
                    <div className="time-remaining">
                      {Math.ceil(timeRemaining)}s
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="breathing-instructions">
            <p className="instruction-text">{getPhaseInstructions()}</p>
            
            {phase === 'welcome' && (
              <div className="welcome-actions">
                <button 
                  className="breathing-start-btn"
                  onClick={startBreathing}
                >
                  <span className="btn-icon">🌬️</span>
                  Start Breathing Exercise
                </button>
                <div className="exercise-info">
                  <div className="info-item">
                    <span className="info-icon">⏱️</span>
                    <span>Duration: ~1 minute</span>
                  </div>
                  <div className="info-item">
                    <span className="info-icon">🔄</span>
                    <span>4 breathing cycles</span>
                  </div>
                  <div className="info-item">
                    <span className="info-icon">💚</span>
                    <span>Reduces anxiety & stress</span>
                  </div>
                </div>
              </div>
            )}

            {phase === 'complete' && (
              <div className="complete-actions">
                <button 
                  className="breathing-start-btn"
                  onClick={startBreathing}
                >
                  <span className="btn-icon">🔄</span>
                  Start Another Session
                </button>
                <button 
                  className="breathing-stop-btn"
                  onClick={() => navigate('/game')}
                >
                  <span className="btn-icon">🏠</span>
                  Back to Games
                </button>
              </div>
            )}

            {isActive && (
              <div className="active-actions">
                <button 
                  className="breathing-stop-btn"
                  onClick={stopBreathing}
                >
                  <span className="btn-icon">⏹️</span>
                  Stop Exercise
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="breathing-tips">
          <h3>💡 Tips for Better Results</h3>
          <ul>
            <li>Find a quiet, comfortable place to sit or lie down</li>
            <li>Close your eyes and focus on your breathing</li>
            <li>Don't force your breath - let it flow naturally</li>
            <li>If you feel dizzy, stop and breathe normally</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
