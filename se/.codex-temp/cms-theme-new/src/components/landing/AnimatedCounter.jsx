import React, { useEffect, useRef, useState } from 'react';

const parseNumericValue = value => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function AnimatedCounter({
  value = 0,
  prefix = '',
  suffix = '',
  duration = 1400,
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const [active, setActive] = useState(false);
  const hostRef = useRef(null);

  useEffect(() => {
    const element = hostRef.current;
    if (!element) return undefined;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActive(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.35 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return undefined;

    const targetValue = parseNumericValue(value);
    const startedAt = performance.now();
    let animationFrameId = 0;

    const tick = currentTime => {
      const progress = Math.min((currentTime - startedAt) / duration, 1);
      const easedProgress = 1 - ((1 - progress) ** 3);
      const nextValue = Math.round(targetValue * easedProgress);
      setDisplayValue(nextValue);

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(tick);
      }
    };

    animationFrameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [active, duration, value]);

  return (
    <span ref={hostRef}>
      {prefix}{displayValue.toLocaleString('en-IN')}{suffix}
    </span>
  );
}
