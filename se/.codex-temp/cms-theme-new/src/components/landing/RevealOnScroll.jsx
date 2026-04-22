import React, { useEffect, useRef, useState } from 'react';

export default function RevealOnScroll({
  children,
  className = '',
  delay = 0,
  y = 24,
  scale = 0.98,
}) {
  const hostRef = useRef(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const element = hostRef.current;
    if (!element) return undefined;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.18 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translate3d(0, 0, 0) scale(1)' : `translate3d(0, ${y}px, 0) scale(${scale})`,
        transition: `opacity 600ms ease ${delay}ms, transform 700ms ease ${delay}ms`,
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </div>
  );
}
