import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LoggedInNavbar from '../components/LoggedInNavbar';
import logo2 from '../assets/MediVise2.png';

type MeditationPhase = 'welcome' | 'meditation' | 'completion';
  type SoundType = 'none' | 'zen' | 'chimes';

interface SoundOption {
  id: SoundType;
  name: string;
  emoji: string;
  description: string;
}

const soundOptions: SoundOption[] = [
  { id: 'none', name: 'Silence', emoji: '🔇', description: 'No background sound' },
  { id: 'zen', name: 'Zen', emoji: '🧘', description: 'Tibetan singing bowls' },
  { id: 'chimes', name: 'Chimes', emoji: '🎐', description: 'Gentle wind chimes' }
];

// SVG Icons
const SoundIcon = ({ type }: { type: SoundType }) => {
  switch (type) {
    case 'none':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M23 9l-6 6M17 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
    case 'zen':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3"/>
        </svg>
      );
    case 'chimes':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M12 20v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M4.93 4.93l1.41 1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M17.66 17.66l1.41 1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M2 12h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M20 12h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M6.34 17.66l-1.41 1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M19.07 4.93l-1.41 1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
          <path d="M8 8l2 2M16 8l-2 2M8 16l2-2M16 16l-2-2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
        </svg>
      );
    default:
      return null;
  }
};

const VolumeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const MuteIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M23 9l-6 6M17 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// Duration slider range: 2-30 minutes

const guidedPrompts = [
  "Find a comfortable position and close your eyes...",
  "Take a deep breath in... and slowly exhale...",
  "Feel your body relaxing with each breath...",
  "Let go of any tension in your shoulders...",
  "Allow your mind to become still and peaceful...",
  "Focus on the present moment...",
  "Feel gratitude for this moment of peace...",
  "Slowly bring your awareness back to your body...",
  "Wiggle your fingers and toes gently...",
  "When you're ready, open your eyes..."
];

export default function GuidedMeditation() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<MeditationPhase>('welcome');
  const [selectedDuration, setSelectedDuration] = useState(10);
  const [selectedSound, setSelectedSound] = useState<SoundType>('zen');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [promptFade, setPromptFade] = useState<'fade-in' | 'fade-out'>('fade-in');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  const promptIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const soundSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const sessionEndAtMsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const isStartingRef = useRef(false);

  // Ensure AudioContext + Master Gain
  const ensureAudio = () => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    if (!masterGainRef.current) {
      masterGainRef.current = ctx.createGain();
      masterGainRef.current.gain.value = volume; // master volume [0..1]
      masterGainRef.current.connect(ctx.destination);
    }
    return ctx;
  };

  const playBeep = (type: 'start' | 'end') => {
    try {
      const ctx = ensureAudio();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const duration = 0.3; // 300ms
      const now = ctx.currentTime;
      const freq = type === 'start' ? 660 : 520;
      osc.frequency.value = freq;
      // envelope to avoid clicks
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(Math.min(0.8, volume), now + 0.02);
      gain.gain.linearRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      if (!masterGainRef.current) masterGainRef.current = ctx.createGain();
      gain.connect(masterGainRef.current!);
      osc.start(now);
      osc.stop(now + duration + 0.01);
    } catch (e) {
      console.warn('Beep error', e);
    }
  };

  // Create continuous ambient sounds using Web Audio API
  const createAmbientSound = (soundType: SoundType) => {
    try {
      // Stop all existing sounds first (but don't close context yet)
      stopAllSoundsWithoutClosingContext();
      const audioContext = ensureAudio();
    } catch (error) {
      console.error('Error creating ambient sound:', error);
      return;
    }
    
    const audioContext = audioContextRef.current!;
    const gainNode = audioContext.createGain();
    gainNode.gain.value = Math.max(0, Math.min(1, volume)) * 0.5; // ambient under master
    gainNode.connect(masterGainRef.current!);
    
    switch (soundType) {
      case 'zen':
        createZenSound(audioContext, gainNode);
        break;
      case 'chimes':
        createChimesSound(audioContext, gainNode);
        break;
    }
  };




  const createZenSound = (audioContext: AudioContext, gainNode: GainNode) => {
    // Create meditative singing bowl sounds with harmonics
    const createSingingBowl = (baseFreq: number, harmonics: number[]) => {
      const bufferSize = audioContext.sampleRate * 8; // 8 seconds
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        const time = i / audioContext.sampleRate;
        let sound = 0;
        
        // Base frequency with decay
        const decay = Math.exp(-time * 0.1);
        sound += Math.sin(time * baseFreq * 2 * Math.PI) * decay * 0.3;
        
        // Add harmonics for richness
        harmonics.forEach((harmonic, index) => {
          const harmonicDecay = Math.exp(-time * (0.1 + index * 0.05));
          sound += Math.sin(time * baseFreq * harmonic * 2 * Math.PI) * harmonicDecay * (0.2 / (index + 1));
        });
        
        // Add subtle modulation for natural feel
        const modulation = Math.sin(time * 0.5) * 0.1;
        sound += modulation;
        
        data[i] = sound * 0.4;
      }
      
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gainNode);
      source.start();
      
      // Track this source for cleanup
      activeSourcesRef.current.push(source);
      
      return source;
    };
    
    // Create multiple singing bowls for depth
    const bowl1 = createSingingBowl(220, [2, 3, 4, 5]); // A3 with harmonics
    const bowl2 = createSingingBowl(165, [2, 3, 4]);    // E3 with harmonics
    const bowl3 = createSingingBowl(110, [2, 3]);       // A2 with harmonics
    
    soundSourceRef.current = bowl1;
  };

  const createChimesSound = (audioContext: AudioContext, gainNode: GainNode) => {
    // Create gentle wind chimes with beautiful harmonic tones
    const createWindChime = (baseFreq: number, harmonics: number[], delay: number) => {
      const bufferSize = audioContext.sampleRate * 8; // 8 seconds
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        const time = i / audioContext.sampleRate;
        
        // Create chime strike pattern (very gentle and random)
        const chimeRate = 0.3 + Math.sin(time * 0.02) * 0.1; // 0.2-0.4 strikes per second
        const chimePhase = (time * chimeRate) % 1;
        
        // Gentle chime envelope
        const chimeEnvelope = Math.exp(-chimePhase * 3) * (chimePhase < 0.4 ? 1 : 0);
        
        let chimeSound = 0;
        
        // Base frequency with harmonics
        const decay = Math.exp(-time * 0.2);
        chimeSound += Math.sin(time * baseFreq * 2 * Math.PI) * decay * 0.3;
        
        // Add harmonics for richness
        harmonics.forEach((harmonic, index) => {
          const harmonicDecay = Math.exp(-time * (0.2 + index * 0.1));
          chimeSound += Math.sin(time * baseFreq * harmonic * 2 * Math.PI) * harmonicDecay * (0.2 / (index + 1));
        });
        
        // Add subtle modulation for natural feel
        const modulation = Math.sin(time * 0.5) * 0.1;
        chimeSound += modulation;
        
        data[i] = chimeSound * chimeEnvelope * 0.2;
      }
      
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.start(delay); // Stagger the start times
      source.connect(gainNode);
      
      // Track this source for cleanup
      activeSourcesRef.current.push(source);
      
      return source;
    };

    // Create multiple wind chimes with different pitches and timing
    const chime1 = createWindChime(220, [2, 3, 4], 0);      // A3 - starts immediately
    const chime2 = createWindChime(165, [2, 3, 4], 0.5);    // E3 - starts after 0.5s
    const chime3 = createWindChime(110, [2, 3], 1.0);       // A2 - starts after 1s
    const chime4 = createWindChime(330, [2, 3, 4, 5], 1.5); // E4 - starts after 1.5s
    const chime5 = createWindChime(147, [2, 3], 2.0);       // D3 - starts after 2s

    // Store the first source as the main reference
    soundSourceRef.current = chime1;
  };


  const startMeditation = () => {
    if (isStartingRef.current || isActive) return; // debounce
    isStartingRef.current = true;
    try {
      const totalMs = Math.max(1, selectedDuration) * 60 * 1000;
      const startMs = performance.now();
      sessionEndAtMsRef.current = startMs + totalMs;
      setPhase('meditation');
      setIsActive(true);
      setCurrentPrompt(0);
      setTimeRemaining(Math.ceil(totalMs / 1000));

      // Start audio
      if (selectedSound === 'none') {
        playBeep('start');
      } else {
        createAmbientSound(selectedSound);
      }

      // Accurate timer via RAF
      const tick = () => {
        if (!sessionEndAtMsRef.current) return;
        const now = performance.now();
        const remainingMs = Math.max(0, sessionEndAtMsRef.current - now);
        setTimeRemaining(Math.ceil(remainingMs / 1000));
        if (remainingMs <= 50) {
          completeMeditation();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      // Slow guided prompts with fade
      const promptInterval = Math.max((totalMs / 1000) / guidedPrompts.length, 60);
      if (promptIntervalRef.current) clearInterval(promptIntervalRef.current);
      promptIntervalRef.current = window.setInterval(() => {
        setPromptFade('fade-out');
        window.setTimeout(() => {
          setCurrentPrompt(prev => (prev + 1) % guidedPrompts.length);
          setPromptFade('fade-in');
        }, 1000);
      }, promptInterval * 1000);
    } finally {
      // small unlock to allow next interactions
      window.setTimeout(() => { isStartingRef.current = false; }, 250);
    }
  };


  // removed "beginMeditation" step; Start begins immediately

  const completeMeditation = () => {
    setIsActive(false);
    setPhase('completion');
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    if (promptIntervalRef.current) window.clearInterval(promptIntervalRef.current);
    sessionEndAtMsRef.current = null;
    // Stop ambient sound
    stopAmbientSound();
    // End beep always, even in ambient mode (quiet but audible)
    playBeep('end');
  };

  const stopAllSoundsWithoutClosingContext = () => {
    try {
      // Stop all active audio sources
      activeSourcesRef.current.forEach(source => {
        try {
          source.stop();
          source.disconnect();
        } catch (error) {
          // Source might already be stopped
          console.log('Source already stopped');
        }
      });
      
      // Clear the array
      activeSourcesRef.current = [];
    } catch (error) {
      console.error('Error in stopAllSoundsWithoutClosingContext:', error);
    }
    
    // Also stop the main reference
    if (soundSourceRef.current) {
      try {
        soundSourceRef.current.stop();
        soundSourceRef.current.disconnect();
      } catch (error) {
        console.log('Main source already stopped');
      }
      soundSourceRef.current = null;
    }
  };

  const stopAllSounds = () => {
    // Stop all sounds without closing context
    stopAllSoundsWithoutClosingContext();
    
    // Close audio context to ensure complete cleanup
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
        audioContextRef.current = null;
        masterGainRef.current = null;
      } catch (error) {
        console.log('Audio context already closed');
      }
    }
  };

  const stopAmbientSound = () => {
    stopAllSounds();
  };

  const updateVolume = (newVolume: number) => {
    setVolume(newVolume);
    if (masterGainRef.current) {
      const v = Math.max(0, Math.min(1, newVolume));
      masterGainRef.current.gain.setValueAtTime(v, audioContextRef.current?.currentTime || 0);
    }
  };

  const stopMeditation = () => {
    setIsActive(false);
    setPhase('welcome');
    setTimeRemaining(0);
    setCurrentPrompt(0);
    
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    if (promptIntervalRef.current) window.clearInterval(promptIntervalRef.current);
    sessionEndAtMsRef.current = null;
    
    // Stop ambient sound
    stopAmbientSound();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (phase !== 'meditation') return 0;
    const total = selectedDuration * 60;
    return ((total - timeRemaining) / total) * 100;
  };

  useEffect(() => {
    const onVisibility = () => {
      const ctx = audioContextRef.current;
      if (!ctx) return;
      if (document.visibilityState === 'visible') {
        if (isActive && ctx.state === 'suspended') ctx.resume();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      // Cleanup on component unmount
      stopAmbientSound();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (promptIntervalRef.current) window.clearInterval(promptIntervalRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div className="dashboard-page">
      <Link to="/about">
        <img src={logo2} alt="MediVise" className="nav-logo-small" />
      </Link>
      <LoggedInNavbar />

      <div className="dashboard-content meditation-container">
        <div className="meditation-header">
          <h1 className="dashboard-title">Guided Meditation</h1>
          <p className="meditation-subtitle">Find peace and clarity through guided mindfulness</p>
        </div>

        <div className="meditation-main">
          {phase === 'welcome' && (
            <div className="meditation-setup">
              <div className="setup-section">
                <h3>Choose Duration</h3>
                <div className="duration-slider-container">
                  <div className="duration-display">
                    <span className="duration-value">{selectedDuration} minutes</span>
                    <span className="duration-range">2 - 30 minutes</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="30"
                    value={selectedDuration}
                    onChange={(e) => setSelectedDuration(Number(e.target.value))}
                    className="duration-slider"
                  />
                  <div className="duration-labels">
                    <span>2 min</span>
                    <span>30 min</span>
                  </div>
                </div>
              </div>

              <div className="setup-section">
                <h3>Background Sound</h3>
                <div className="sound-options">
                  {soundOptions.map(sound => (
                    <button
                      key={sound.id}
                      className={`sound-btn ${selectedSound === sound.id ? 'selected' : ''}`}
                      onClick={() => setSelectedSound(sound.id)}
                    >
                      <div className="sound-icon">
                        <SoundIcon type={sound.id} />
                      </div>
                      <div className="sound-info">
                        <div className="sound-name">{sound.name}</div>
                        <div className="sound-desc">{sound.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedSound !== 'none' && (
                <div className="setup-section">
                  <h3>Volume</h3>
                  <div className="volume-control">
                    <MuteIcon />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) => updateVolume(parseFloat(e.target.value))}
                      className="volume-slider"
                    />
                    <VolumeIcon />
                  </div>
                </div>
              )}

              <div className="meditation-actions">
                <button 
                  className="meditation-start-btn"
                  onClick={startMeditation}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Start
                </button>
              </div>
            </div>
          )}

          {/* preparation phase removed; start is immediate */}

          {phase === 'meditation' && (
            <div className="meditation-active">
              <div className="meditation-circle">
                <div className="progress-ring">
                  <svg className="progress-ring-svg" width="200" height="200">
                    <circle
                      className="progress-ring-circle-bg"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                      fill="transparent"
                      r="90"
                      cx="100"
                      cy="100"
                    />
                    <circle
                      className="progress-ring-circle"
                      stroke="#10b981"
                      strokeWidth="8"
                      fill="transparent"
                      r="90"
                      cx="100"
                      cy="100"
                      style={{
                        strokeDasharray: `${2 * Math.PI * 90}`,
                        strokeDashoffset: `${2 * Math.PI * 90 * (1 - getProgressPercentage() / 100)}`,
                        transition: 'stroke-dashoffset 1s ease-in-out'
                      }}
                    />
                  </svg>
                  <div className="meditation-timer">
                    {formatTime(timeRemaining)}
                  </div>
                </div>
              </div>

              <div className="meditation-prompt">
                <p className={`prompt-text ${promptFade}`}>{guidedPrompts[currentPrompt]}</p>
              </div>

              <div className="meditation-controls">
                <button 
                  className="meditation-stop-btn"
                  onClick={stopMeditation}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  End Session
                </button>
              </div>
            </div>
          )}

          {phase === 'completion' && (
            <div className="meditation-completion">
              <div className="completion-circle">
                <div className="completion-content">
                  <h2>✨ Well Done!</h2>
                  <p>You've completed your {selectedDuration}-minute meditation</p>
                  <p>Take a moment to notice how you feel</p>
                </div>
              </div>
              <div className="completion-actions">
                <button 
                  className="meditation-start-btn"
                  onClick={startMeditation}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Meditate Again
                </button>
                <button 
                  className="meditation-stop-btn"
                  onClick={() => navigate('/game')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Back to Games
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="meditation-tips">
          <h3>💡 Meditation Tips</h3>
          <ul>
            <li>Find a quiet space free from distractions</li>
            <li>Use headphones for better sound experience</li>
            <li>Don't worry if your mind wanders - gently return focus</li>
            <li>Consistency is more important than duration</li>
          </ul>
        </div>

        {/* Hidden audio element */}
        <audio ref={audioRef} preload="auto" />
      </div>
    </div>
  );
}
