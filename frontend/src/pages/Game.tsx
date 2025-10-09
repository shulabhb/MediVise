import { useNavigate } from 'react-router-dom';
import { BentoGrid, BentoCard } from '../components/Bento';
import LoggedInNavbar from '../components/LoggedInNavbar';

export default function Game() {
  const navigate = useNavigate();
  return (
    <div className="dashboard-page">
      {/* Top Navigation */}
      <LoggedInNavbar />

      {/* Content */}
      <div className="dashboard-content">
        <h1 className="dashboard-title" style={{ textAlign: 'center' }}>Destress with these fun games!</h1>

        <BentoGrid>
          <BentoCard
            title="Mini Sudoku"
            description="A quick 4x4 brain refresher"
            cta="Play"
            className="col-span-3 lg:col-span-1"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke="currentColor" strokeWidth="2"/>
              </svg>
            }
            background={
              <div style={{ position: 'absolute', inset: 0, opacity: 0.35 }}>
                {/* 4x4 grid background */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 16,
                    borderRadius: 12,
                    background:
                      'linear-gradient(#9ca3af55 2px, transparent 2px) 0 0/25% 25%, linear-gradient(90deg, #9ca3af55 2px, transparent 2px) 0 0/25% 25%',
                  }}
                />
                {/* Thicker middle lines */}
                <div style={{ position: 'absolute', left: '50%', top: 16, bottom: 16, width: 3, background: '#9ca3af77', transform: 'translateX(-50%)', borderRadius: 2 }} />
                <div style={{ position: 'absolute', top: '50%', left: 16, right: 16, height: 3, background: '#9ca3af77', transform: 'translateY(-50%)', borderRadius: 2 }} />
              </div>
            }
            onClick={() => navigate('/game/sudoku')}
          />

          <BentoCard
            title="Tic‑Tac‑Toe"
            description="Classic 3×3—beat the CPU or a friend"
            cta="Play"
            className="col-span-3 lg:col-span-1"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 3v18M16 3v18M3 8h18M3 16h18" stroke="currentColor" strokeWidth="2"/>
                <path d="M6 6l4 4M10 6l-4 4M14 14l4 4M18 14l-4 4" stroke="currentColor" strokeWidth="2"/>
              </svg>
            }
            background={
              <div style={{ position: 'absolute', inset: 0, opacity: 0.25 }}>
                {/* 3x3 grid */}
                <div style={{ position: 'absolute', left: '33.33%', top: 16, bottom: 16, width: 3, background: '#64748b66', borderRadius: 2 }} />
                <div style={{ position: 'absolute', left: '66.66%', top: 16, bottom: 16, width: 3, background: '#64748b66', borderRadius: 2 }} />
                <div style={{ position: 'absolute', top: '33.33%', left: 16, right: 16, height: 3, background: '#64748b66', borderRadius: 2 }} />
                <div style={{ position: 'absolute', top: '66.66%', left: 16, right: 16, height: 3, background: '#64748b66', borderRadius: 2 }} />
                {/* Ghost X and O */}
                <svg width="120" height="120" viewBox="0 0 120 120" style={{ position: 'absolute', right: 18, bottom: 18, opacity: 0.35 }}>
                  <circle cx="90" cy="30" r="16" stroke="#94a3b8" strokeWidth="6" fill="none" />
                  <g stroke="#94a3b8" strokeWidth="6" strokeLinecap="round">
                    <path d="M20 80 L44 104" />
                    <path d="M44 80 L20 104" />
                  </g>
                </svg>
              </div>
            }
            onClick={() => navigate('/game/tictactoe')}
          />

          <BentoCard
            title="Memory Match"
            description="Flip and match pairs—train your focus"
            cta="Play"
            className="col-span-3 lg:col-span-1"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
                <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
                <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
                <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
              </svg>
            }
            background={
              <div style={{ position: 'absolute', inset: 0, opacity: 0.25 }}>
                {/* Card silhouettes */}
                <div style={{ position: 'absolute', left: 24, top: 22, width: 54, height: 36, borderRadius: 8, background: '#94a3b844' }} />
                <div style={{ position: 'absolute', left: 90, top: 22, width: 54, height: 36, borderRadius: 8, background: '#94a3b84d' }} />
                <div style={{ position: 'absolute', left: 156, top: 22, width: 54, height: 36, borderRadius: 8, background: '#94a3b844' }} />
                <div style={{ position: 'absolute', left: 24, top: 66, width: 54, height: 36, borderRadius: 8, background: '#94a3b84d' }} />
                <div style={{ position: 'absolute', left: 90, top: 66, width: 54, height: 36, borderRadius: 8, background: '#94a3b844' }} />
                <div style={{ position: 'absolute', left: 156, top: 66, width: 54, height: 36, borderRadius: 8, background: '#94a3b84d' }} />
              </div>
            }
            onClick={() => navigate('/game/memory')}
          />

          <BentoCard
            title="Breathing Exercise"
            description="Calm your mind and reduce anxiety"
            cta="Start"
            className="col-span-3 lg:col-span-1"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
              </svg>
            }
            background={
              <div style={{ position: 'absolute', inset: 0, opacity: 0.2 }}>
                {/* Breathing circles animation */}
                <div style={{ 
                  position: 'absolute', 
                  left: '50%', 
                  top: '50%', 
                  width: 60, 
                  height: 60, 
                  borderRadius: '50%', 
                  background: 'radial-gradient(circle, #10b98133 0%, transparent 70%)',
                  transform: 'translate(-50%, -50%)',
                  animation: 'breathe-pulse 3s ease-in-out infinite'
                }} />
                <div style={{ 
                  position: 'absolute', 
                  left: '50%', 
                  top: '50%', 
                  width: 40, 
                  height: 40, 
                  borderRadius: '50%', 
                  background: 'radial-gradient(circle, #05966944 0%, transparent 70%)',
                  transform: 'translate(-50%, -50%)',
                  animation: 'breathe-pulse 3s ease-in-out infinite 0.5s'
                }} />
                <div style={{ 
                  position: 'absolute', 
                  left: '50%', 
                  top: '50%', 
                  width: 20, 
                  height: 20, 
                  borderRadius: '50%', 
                  background: 'radial-gradient(circle, #04785755 0%, transparent 70%)',
                  transform: 'translate(-50%, -50%)',
                  animation: 'breathe-pulse 3s ease-in-out infinite 1s'
                }} />
              </div>
            }
            onClick={() => navigate('/game/breathing')}
          />

          <BentoCard
            title="Guided Meditation"
            description="Find peace with ambient sounds"
            cta="Meditate"
            className="col-span-3 lg:col-span-1"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
              </svg>
            }
            background={
              <div style={{ position: 'absolute', inset: 0, opacity: 0.2 }}>
                {/* Meditation waves animation */}
                <div style={{ 
                  position: 'absolute', 
                  left: '20%', 
                  top: '30%', 
                  width: 80, 
                  height: 4, 
                  borderRadius: '2px', 
                  background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                  animation: 'meditation-wave 4s ease-in-out infinite'
                }} />
                <div style={{ 
                  position: 'absolute', 
                  left: '30%', 
                  top: '50%', 
                  width: 100, 
                  height: 4, 
                  borderRadius: '2px', 
                  background: 'linear-gradient(90deg, #8b5cf6, #ec4899)',
                  animation: 'meditation-wave 4s ease-in-out infinite 0.5s'
                }} />
                <div style={{ 
                  position: 'absolute', 
                  left: '25%', 
                  top: '70%', 
                  width: 90, 
                  height: 4, 
                  borderRadius: '2px', 
                  background: 'linear-gradient(90deg, #ec4899, #f59e0b)',
                  animation: 'meditation-wave 4s ease-in-out infinite 1s'
                }} />
                {/* Sound waves */}
                <div style={{ 
                  position: 'absolute', 
                  right: '20%', 
                  top: '40%', 
                  width: 3, 
                  height: 20, 
                  borderRadius: '2px', 
                  background: '#3b82f6',
                  animation: 'sound-wave 2s ease-in-out infinite'
                }} />
                <div style={{ 
                  position: 'absolute', 
                  right: '25%', 
                  top: '35%', 
                  width: 3, 
                  height: 30, 
                  borderRadius: '2px', 
                  background: '#8b5cf6',
                  animation: 'sound-wave 2s ease-in-out infinite 0.3s'
                }} />
                <div style={{ 
                  position: 'absolute', 
                  right: '30%', 
                  top: '30%', 
                  width: 3, 
                  height: 40, 
                  borderRadius: '2px', 
                  background: '#ec4899',
                  animation: 'sound-wave 2s ease-in-out infinite 0.6s'
                }} />
              </div>
            }
            onClick={() => navigate('/game/meditation')}
          />
        </BentoGrid>
      </div>
    </div>
  );
}


