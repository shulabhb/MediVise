import { useEffect, useRef, useState } from 'react';

type Props = {
  className?: string;
  words: string[];
  durationMs?: number; // time each word stays visible
  transitionMs?: number; // fade/slide duration
};

export function WordRotate({
  className,
  words,
  durationMs = 2200,
  transitionMs = 420,
}: Props) {
  const [index, setIndex] = useState(0);
  const [entering, setEntering] = useState(true);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    function schedule() {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setEntering(false);
        // allow exit transition
        window.setTimeout(() => {
          setIndex((i) => (i + 1) % words.length);
          setEntering(true);
        }, transitionMs);
      }, durationMs);
    }
    schedule();
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [index, words.length, durationMs, transitionMs]);

  const current = words[index] ?? '';

  return (
    <span className={className} aria-live="polite" style={{ display: 'inline-block', height: '1.75rem', lineHeight: '1.75rem', verticalAlign: 'middle', overflow: 'hidden' }}>
      <span style={{ display: 'inline-block', whiteSpace: 'nowrap', transform: entering ? 'translateY(0)' : 'translateY(-6px)', opacity: entering ? 1 : 0, transition: `opacity ${transitionMs}ms ease, transform ${transitionMs}ms ease` }}>{current}</span>
    </span>
  );
}

export default WordRotate;


