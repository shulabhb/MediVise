import { useEffect, useState } from 'react';

type Props = {
  text: string;
  speedMs?: number; // time between chars
  startDelayMs?: number;
  className?: string;
  showCaret?: boolean;
};

export default function Typewriter({
  text,
  speedMs = 24,
  startDelayMs = 200,
  className,
  showCaret = true,
}: Props) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    let mounted = true;
    const start = window.setTimeout(() => {
      let i = 0;
      const timer = window.setInterval(() => {
        if (!mounted) { window.clearInterval(timer); return; }
        i += 1;
        setDisplay(text.slice(0, i));
        if (i >= text.length) window.clearInterval(timer);
      }, speedMs);
    }, startDelayMs);
    return () => { mounted = false; window.clearTimeout(start); };
  }, [text, speedMs, startDelayMs]);

  return (
    <span className={className} aria-live="polite">
      {display}
      {showCaret && (
        <span className="tw-caret" aria-hidden>
          |
        </span>
      )}
    </span>
  );
}


