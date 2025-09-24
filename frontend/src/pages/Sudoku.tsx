import LoggedInNavbar from '../components/LoggedInNavbar';
import { useMemo, useState, useEffect } from 'react';
import type { CSSProperties } from 'react';

type Cell = { value: number | null; fixed: boolean };

// --- 4x4 sudoku helpers ----------------------------------------------------
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Generate a solved 4x4 grid using a base pattern and random row/column/symbol permutations
function generateSolved4x4(): number[][] {
  // Correct base: shift by box width (2) and add band offset (r//2)
  const base = (r: number, c: number) => ((r * 2 + Math.floor(r / 2) + c) % 4) + 1;
  let grid = Array.from({ length: 4 }, (_, r) => Array.from({ length: 4 }, (_, c) => base(r, c)));

  // Permute symbols
  const symbols = shuffle([1, 2, 3, 4]);
  grid = grid.map(row => row.map(v => symbols[v - 1]));

  // Permute rows within bands and swap bands
  const band1 = shuffle([0, 1]);
  const band2 = shuffle([2, 3]);
  const bandOrder = shuffle([0, 1]); // 0=>top band first, 1=>bottom band first
  const rowOrder = bandOrder.flatMap(b => (b === 0 ? band1 : band2));
  grid = rowOrder.map(r => grid[r]);

  // Permute columns within stacks and swap stacks
  const st1 = shuffle([0, 1]);
  const st2 = shuffle([2, 3]);
  const stackOrder = shuffle([0, 1]);
  const colOrder = stackOrder.flatMap(s => (s === 0 ? st1 : st2));
  grid = grid.map(row => colOrder.map(c => row[c]));
  return grid;
}

function hideCells(solved: number[][], holes = 8): number[][] {
  const puzzle = solved.map(r => [...r]);
  const idxs = shuffle(Array.from({ length: 16 }, (_, i) => i)).slice(0, holes);
  for (const i of idxs) {
    const r = Math.floor(i / 4), c = i % 4;
    puzzle[r][c] = 0;
  }
  return puzzle;
}

// Count solutions for a 4x4 puzzle (early-exit >1)
function countSolutions(puzzle: number[][], limit = 2): number {
  const g = puzzle.map(r => [...r]);
  function findEmpty(): [number, number] | null {
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (g[r][c] === 0) return [r, c];
    return null;
  }
  function valid(r: number, c: number, v: number): boolean {
    for (let i = 0; i < 4; i++) if (g[r][i] === v || g[i][c] === v) return false;
    const br = Math.floor(r / 2) * 2, bc = Math.floor(c / 2) * 2;
    for (let i = br; i < br + 2; i++) for (let j = bc; j < bc + 2; j++) if (g[i][j] === v) return false;
    return true;
  }
  let solutions = 0;
  function backtrack() {
    if (solutions >= limit) return; // early exit
    const pos = findEmpty();
    if (!pos) { solutions++; return; }
    const [r, c] = pos;
    for (let v = 1; v <= 4; v++) {
      if (valid(r, c, v)) {
        g[r][c] = v;
        backtrack();
        g[r][c] = 0;
        if (solutions >= limit) return;
      }
    }
  }
  backtrack();
  return solutions;
}

// Create a puzzle by removing cells while preserving uniqueness
function uniquePuzzle(solved: number[][], desiredHoles = 8): number[][] {
  const puzzle = solved.map(r => [...r]);
  const positions = shuffle(Array.from({ length: 16 }, (_, i) => i));
  let removed = 0;
  for (const idx of positions) {
    if (removed >= desiredHoles) break;
    const r = Math.floor(idx / 4), c = idx % 4;
    if (puzzle[r][c] === 0) continue;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    // Ensure unique solution remains
    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[r][c] = backup; // revert
    } else {
      removed++;
    }
  }
  return puzzle;
}

export default function Sudoku() {
  const [seed, setSeed] = useState(0);
  const solved = useMemo(() => generateSolved4x4(), [seed]);
  const starter = useMemo(() => {
    // Try multiple times to get a puzzle with enough holes
    for (let i = 0; i < 10; i++) {
      const p = uniquePuzzle(solved, 10);
      const holes = p.flat().filter(v => v === 0).length;
      if (holes >= 8) return p; // acceptable density
    }
    // Fallback
    return hideCells(solved, 10);
  }, [solved]);
  const [grid, setGrid] = useState<Cell[][]>(starter.map(row => row.map(v => ({ value: v === 0 ? null : v, fixed: v !== 0 }))));

  // Keep grid in sync with newly generated starter
  // (ensures first render shows a puzzle, not a full solution)
  useEffect(() => {
    setGrid(starter.map(row => row.map(v => ({ value: v === 0 ? null : v, fixed: v !== 0 }))));
  }, [starter]);

  function setCell(r: number, c: number, val: number | null) {
    setGrid(g => g.map((row, i) => row.map((cell, j) => (i === r && j === c ? { ...cell, value: val } : cell))));
  }

  function isValid(): boolean {
    for (let i = 0; i < 4; i++) {
      const row = new Set(grid[i].map(c => c.value));
      const col = new Set(grid.map(r => r[i].value));
      if ([...row].filter(Boolean).length !== 4) return false;
      if ([...col].filter(Boolean).length !== 4) return false;
    }
    for (let br = 0; br < 4; br += 2) {
      for (let bc = 0; bc < 4; bc += 2) {
        const box = new Set<number | null>();
        for (let r = br; r < br + 2; r++) for (let c = bc; c < bc + 2; c++) box.add(grid[r][c].value);
        if ([...box].filter(Boolean).length !== 4) return false;
      }
    }
    return true;
  }

  function isPlacementValid(r: number, c: number, v: number): boolean {
    // row
    for (let i = 0; i < 4; i++) {
      if (i !== c && grid[r][i].value === v) return false;
    }
    // col
    for (let i = 0; i < 4; i++) {
      if (i !== r && grid[i][c].value === v) return false;
    }
    // box
    const br = Math.floor(r / 2) * 2, bc = Math.floor(c / 2) * 2;
    for (let i = br; i < br + 2; i++) for (let j = bc; j < bc + 2; j++) {
      if ((i !== r || j !== c) && grid[i][j].value === v) return false;
    }
    return true;
  }

  const completed = grid.every(row => row.every(c => c.value));
  const won = completed && isValid();

  function resetGame() {
    setGrid(starter.map(row => row.map(v => ({ value: v === 0 ? null : v, fixed: v !== 0 }))));
  }

  function newGame() {
    setSeed(s => s + 1);
    // setGrid will refresh via useEffect tied to starter after seed changes
  }

  return (
    <div className="dashboard-page">
      <LoggedInNavbar />
      <div className="dashboard-content" style={{ display: 'grid', placeItems: 'center', gap: 16 }}>
        <h1 className="dashboard-title" style={{ textAlign: 'center' }}>Mini Sudoku (4×4)</h1>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 54px)', gridTemplateRows: 'repeat(4, 54px)',
          gap: 6, padding: 10, borderRadius: 14,
          background: won ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.08)',
          border: won ? '1px solid rgba(34,197,94,0.6)' : '1px solid rgba(255,255,255,0.15)',
          boxShadow: won ? '0 0 0 3px rgba(34,197,94,0.25), 0 10px 30px rgba(0,0,0,0.25)' : '0 20px 40px rgba(0,0,0,0.3)'
        }}>
          {grid.map((row, r) => row.map((cell, c) => (
            <input
              key={`${r}-${c}`}
              value={cell.value ?? ''}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (Number.isNaN(v) || v < 1 || v > 4) { setCell(r, c, null); return; }
                // Allow setting even if currently invalid; style will indicate error
                setCell(r, c, v);
              }}
              disabled={cell.fixed}
              inputMode="numeric"
              pattern="[1-4]"
              maxLength={1}
              placeholder=""
              style={(() => {
                const val = cell.value;
                const invalid = !cell.fixed && val != null && !isPlacementValid(r, c, val);
                const style: CSSProperties = {
                  width: 54, height: 54, textAlign: 'center', fontSize: 18, fontWeight: 700,
                  borderRadius: 10,
                  border: invalid ? '2px solid rgba(239,68,68,0.9)' : '1px solid rgba(0,0,0,0.1)',
                  background: cell.fixed
                    ? 'rgba(255,255,255,0.9)'
                    : invalid
                      ? 'rgba(254,226,226,0.9)'
                      : 'rgba(255,255,255,0.7)',
                  color: invalid ? '#991b1b' : '#0f172a'
                };
                return style;
              })()}
            />
          )))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="button subtle" onClick={newGame}>New game</button>
          <button className="button subtle" onClick={resetGame}>Reset</button>
        </div>
        <div style={{
          color: completed && !won ? '#ef4444' : 'rgba(255,255,255,0.7)',
          fontSize: '1rem', fontWeight: 800, marginTop: 6
        }}>
          {completed && !won ? 'Not quite right—check again.' : 'Fill in 1–4 so rows, cols, and boxes contain each number once.'}
        </div>
      </div>
    </div>
  );
}


