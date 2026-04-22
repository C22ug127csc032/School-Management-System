import React from 'react';
import LandingSectionShell from './LandingSectionShell';
import RevealOnScroll from './RevealOnScroll';
import { resolveLandingIcon } from './iconMap';

export default function FeaturesSection({ data = {} }) {
  const items = Array.isArray(data?.items) ? data.items : [];

  return (
    <LandingSectionShell
      id="features"
      eyebrow={data?.eyebrow}
      title={data?.title}
      description={data?.description}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((item, index) => {
          const Icon = resolveLandingIcon(item?.iconKey);
          return (
            <RevealOnScroll key={`${item?.title || 'feature'}-${index}`} delay={index * 60}>
              <div className="card flex h-full gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-primary-200 bg-primary-50 text-xl text-primary-700">
                  <Icon />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">{item?.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-text-secondary">{item?.description}</p>
                </div>
              </div>
            </RevealOnScroll>
          );
        })}
      </div>
    </LandingSectionShell>
  );
}
