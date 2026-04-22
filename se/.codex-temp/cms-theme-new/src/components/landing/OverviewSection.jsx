import React from 'react';
import LandingSectionShell from './LandingSectionShell';
import RevealOnScroll from './RevealOnScroll';

export default function OverviewSection({ data = {} }) {
  const cards = Array.isArray(data?.cards) ? data.cards : [];

  return (
    <LandingSectionShell
      id="overview"
      eyebrow={data?.eyebrow}
      title={data?.title}
      description={data?.description}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {cards.map((card, index) => (
          <RevealOnScroll key={`${card?.title || 'overview'}-${index}`} delay={index * 90}>
            <div className="card h-full">
              <div className="flex h-11 w-11 items-center justify-center border border-primary-200 bg-primary-50 text-sm font-semibold text-primary-700">
                {String(index + 1).padStart(2, '0')}
              </div>
              <h3 className="mt-5 text-xl font-semibold text-text-primary">{card?.title}</h3>
              <p className="mt-3 text-sm leading-7 text-text-secondary">{card?.description}</p>
            </div>
          </RevealOnScroll>
        ))}
      </div>
    </LandingSectionShell>
  );
}
