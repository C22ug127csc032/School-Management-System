import React from 'react';
import LandingSectionShell from './LandingSectionShell';
import RevealOnScroll from './RevealOnScroll';
import AnimatedCounter from './AnimatedCounter';

export default function StatsSection({ data = {} }) {
  const items = Array.isArray(data?.items) ? data.items : [];

  return (
    <LandingSectionShell
      id="stats"
      eyebrow={data?.eyebrow}
      title={data?.title}
      description={data?.description}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item, index) => (
          <RevealOnScroll key={`${item?.label || 'stat'}-${index}`} delay={index * 80}>
            <div className="card h-full border-primary-200">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">{item?.label}</p>
              <p className="mt-4 text-4xl font-semibold text-text-primary">
                <AnimatedCounter
                  value={Number(item?.value || 0)}
                  prefix={item?.prefix || ''}
                  suffix={item?.suffix || ''}
                />
              </p>
              {item?.description ? (
                <p className="mt-4 text-sm leading-6 text-text-secondary">{item.description}</p>
              ) : null}
            </div>
          </RevealOnScroll>
        ))}
      </div>
    </LandingSectionShell>
  );
}
