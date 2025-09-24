import LoggedInNavbar from '../components/LoggedInNavbar';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

type Mode = 'pvp' | 'cpu';

export default function TicTacToe() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('pvp');
  const [board, setBoard] = useState<(null | 'X' | 'O')[]>(Array(9).fill(null));
  const [xTurn, setXTurn] = useState(true);
  const playerName = (user?.displayName || (user?.email ? user.email.split('@')[0] : '') || 'You');

  const LINES = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ] as const;

  function winner(b: (null | 'X' | 'O')[]) {
    for (const [a,b2,c] of LINES) if (b[a] && b[a]===b[b2] && b[a]===b[c]) return b[a];
    return null;
  }

  const isFull = (b: (null | 'X' | 'O')[]) => b.every(Boolean);

  // Minimax with alpha-beta pruning (CPU='O', human='X')
  function minimax(state: (null | 'X' | 'O')[], isMaximizing: boolean, depth: number, alpha: number, beta: number): number {
    const w = winner(state);
    if (w === 'O') return 10 - depth;
    if (w === 'X') return depth - 10;
    if (isFull(state)) return 0;

    if (isMaximizing) {
      let best = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (state[i] != null) continue;
        state[i] = 'O';
        const val = minimax(state, false, depth + 1, alpha, beta);
        state[i] = null;
        if (val > best) best = val;
        if (val > alpha) alpha = val;
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (let i = 0; i < 9; i++) {
        if (state[i] != null) continue;
        state[i] = 'X';
        const val = minimax(state, true, depth + 1, alpha, beta);
        state[i] = null;
        if (val < best) best = val;
        if (val < beta) beta = val;
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  function bestCpuMove(state: (null | 'X' | 'O')[]) {
    if (state.every(v => v === null) && state[4] === null) return 4; // open center first
    let bestScore = -Infinity;
    let move = -1;
    for (let i = 0; i < 9; i++) {
      if (state[i] != null) continue;
      state[i] = 'O';
      const score = minimax(state, false, 0, -Infinity, Infinity);
      state[i] = null;
      if (score > bestScore) { bestScore = score; move = i; }
    }
    return move;
  }

  function play(i: number) {
    if (board[i] || winner(board)) return;
    // Human move (X)
    if (xTurn) {
      const next = [...board];
      next[i] = 'X';
      setBoard(next);
      const w = winner(next);
      if (mode !== 'cpu' || w || isFull(next)) { setXTurn(false); return; }
      // CPU move (O) using minimax
      setXTurn(false);
      setTimeout(() => {
        const cpuIndex = bestCpuMove(next);
        if (cpuIndex >= 0 && !winner(next) && !isFull(next)) {
          const n2 = [...next];
          n2[cpuIndex] = 'O';
          setBoard(n2);
        }
        setXTurn(true);
      }, 250);
    } else if (mode === 'pvp') {
      // Second player move in PvP
      const next = [...board];
      next[i] = 'O';
      setBoard(next);
      setXTurn(true);
    }
  }

  const w = winner(board);
  const full = board.every(Boolean);
  const xWin = w === 'X';
  const oWin = w === 'O';
  const isDraw = !w && full;

  return (
    <div className="dashboard-page">
      <LoggedInNavbar />
      <div className="dashboard-content" style={{ display: 'grid', placeItems: 'center', gap: 16 }}>
        <h1 className="dashboard-title" style={{ textAlign: 'center' }}>Tic‑Tac‑Toe</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="button subtle" onClick={() => { setMode('pvp'); setBoard(Array(9).fill(null)); setXTurn(true); }}>2 Players</button>
          <button className="button subtle" onClick={() => { setMode('cpu'); setBoard(Array(9).fill(null)); setXTurn(true); }}>1 Player</button>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 90px)', gridTemplateRows: 'repeat(3, 90px)', gap: 8,
          padding: 12, borderRadius: 14,
          background: xWin
            ? 'rgba(34,197,94,0.12)'
            : oWin
            ? 'rgba(239,68,68,0.12)'
            : isDraw
            ? 'rgba(59,130,246,0.12)'
            : 'rgba(255,255,255,0.08)',
          border: xWin
            ? '1px solid rgba(34,197,94,0.6)'
            : oWin
            ? '1px solid rgba(239,68,68,0.6)'
            : isDraw
            ? '1px solid rgba(59,130,246,0.6)'
            : '1px solid rgba(255,255,255,0.15)',
          boxShadow: xWin
            ? '0 0 0 3px rgba(34,197,94,0.25), 0 10px 30px rgba(0,0,0,0.25)'
            : oWin
            ? '0 0 0 3px rgba(239,68,68,0.25), 0 10px 30px rgba(0,0,0,0.25)'
            : isDraw
            ? '0 0 0 3px rgba(59,130,246,0.25), 0 10px 30px rgba(0,0,0,0.25)'
            : 'none'
        }}>
          {board.map((v, i) => (
            <button
              key={i}
              onClick={() => play(i)}
              disabled={!!w || (mode==='cpu' && !xTurn)}
              style={{
                width: 90, height: 90, borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)',
                background: 'rgba(255,255,255,0.7)', color: '#0f172a', fontSize: 28, fontWeight: 800, cursor: 'pointer'
              }}
            >{v ?? ''}</button>
          ))}
        </div>
        <div style={{
          color: w ? '#0a0a0a' : full ? '#2563eb' : 'rgba(255,255,255,0.7)',
          fontWeight: 900,
          fontSize: w ? '1.6rem' : '1rem'
        }}>
          {w
            ? (mode === 'cpu'
                ? (w === 'X' ? `${playerName} WINS` : 'CPU WINS')
                : `${w} WINS`)
            : full
            ? 'Draw.'
            : mode==='pvp'
            ? (xTurn ? 'X turn' : 'O turn')
            : (xTurn ? 'Your turn' : 'CPU thinking…')}
        </div>
      </div>
    </div>
  );
}


