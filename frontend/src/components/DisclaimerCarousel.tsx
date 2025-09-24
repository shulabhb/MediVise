import React, { useEffect, useRef, useState } from 'react';

type Slide = {
  title: string;
  body: React.ReactNode;
  icon?: React.ReactNode;
};

type Props = {
  slides: Slide[];
  intervalMs?: number;
  className?: string;
  showArrows?: boolean;
};

export default function DisclaimerCarousel({ slides, intervalMs = 5000, className, showArrows = true }: Props) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!slides.length) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setIdx((i) => (i + 1) % slides.length), intervalMs);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [idx, slides.length, intervalMs]);

  function go(n: number) {
    setIdx((i) => (i + n + slides.length) % slides.length);
  }

  return (
    <div className={className ? `dc-container ${className}` : 'dc-container'} aria-roledescription="carousel">
      <div className="dc-track" style={{ transform: `translateX(-${idx * 100}%)` }}>
        {slides.map((s, i) => (
          <section className="dc-slide" key={i} aria-hidden={i !== idx} aria-label={s.title}>
            <header className="dc-header">
              {s.icon}
              <h3>{s.title}</h3>
            </header>
            <div className="dc-body">{s.body}</div>
          </section>
        ))}
      </div>
      <div className={`dc-controls${showArrows ? '' : ' just-dots'}`}>
        {showArrows && (
          <button className="dc-btn" aria-label="Previous" onClick={() => go(-1)}>
            ‹
          </button>
        )}
        <div className="dc-dots" role="tablist" aria-label="Slides">
          {slides.map((_, i) => (
            <button key={i} role="tab" aria-selected={i === idx} className={`dc-dot${i === idx ? ' active' : ''}`} onClick={() => setIdx(i)} />
          ))}
        </div>
        {showArrows && (
          <button className="dc-btn" aria-label="Next" onClick={() => go(1)}>
            ›
          </button>
        )}
      </div>
    </div>
  );
}


