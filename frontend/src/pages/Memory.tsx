import LoggedInNavbar from '../components/LoggedInNavbar';
import { useEffect, useState } from 'react';

type Card = { id: number; face: string; flipped: boolean; matched: boolean };

// Medical-themed emoji set (6 pairs)
const faces = ['🩺','💊','🧪','🩹','🧬','🏥'];

export default function Memory() {
  const [cards, setCards] = useState<Card[]>([]);
  const [lock, setLock] = useState(false);
  const [sel, setSel] = useState<number[]>([]);

  function buildDeck(): Card[] {
    return [...faces, ...faces]
      .sort(() => Math.random() - 0.5)
      .map((f, i) => ({ id: i, face: f, flipped: false, matched: false }));
  }

  useEffect(() => {
    setCards(buildDeck());
  }, []);

  function resetGame() {
    setLock(false);
    setSel([]);
    setCards(buildDeck());
  }

  function onFlip(i: number) {
    if (lock) return;
    setCards(cs => {
      const c = cs[i];
      if (c.flipped || c.matched) return cs;
      const next = cs.map((cc, idx) => idx===i ? { ...cc, flipped: true } : cc);
      const open = sel.concat(i);
      setSel(open);
      if (open.length === 2) {
        setLock(true);
        setTimeout(() => {
          setCards(cur => {
            const [a,b] = open;
            if (cur[a].face === cur[b].face) {
              return cur.map((cc, idx) => (idx===a || idx===b) ? { ...cc, matched: true } : cc);
            } else {
              return cur.map((cc, idx) => (idx===a || idx===b) ? { ...cc, flipped: false } : cc);
            }
          });
          setSel([]);
          setLock(false);
        }, 700);
      }
      return next;
    });
  }

  const allMatched = cards.length>0 && cards.every(c => c.matched);

  return (
    <div className="dashboard-page">
      <LoggedInNavbar />
      <div className="dashboard-content" style={{ display: 'grid', placeItems: 'center', gap: 16 }}>
        <h1 className="dashboard-title" style={{ textAlign: 'center' }}>Memory Match</h1>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 80px)', gridTemplateRows: 'repeat(3, 80px)', gap: 10,
          padding: 12, borderRadius: 14,
          background: allMatched ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.08)',
          border: allMatched ? '1px solid rgba(34,197,94,0.6)' : '1px solid rgba(255,255,255,0.15)',
          boxShadow: allMatched ? '0 0 0 3px rgba(34,197,94,0.25), 0 10px 30px rgba(0,0,0,0.25)' : 'none'
        }}>
          {cards.map((c, i) => (
            <button key={c.id} onClick={() => onFlip(i)} style={{
              width: 80, height: 80, borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.12)',
              background: c.flipped || c.matched ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
              color: '#0f172a', fontSize: 28, fontWeight: 800, cursor: 'pointer'
            }}>
              {c.flipped || c.matched ? c.face : ''}
            </button>
          ))}
        </div>
        {allMatched && (
          <>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button
                className="button"
                onClick={resetGame}
                style={{
                  background: '#e5e7eb',
                  color: '#111827',
                  border: '1px solid rgba(0,0,0,0.18)'
                }}
              >
                Restart
              </button>
            </div>
            <div style={{ color: '#10b981', fontWeight: 900 }}>Completed</div>
          </>
        )}
      </div>
    </div>
  );
}


