import React from 'react';
import LandingSectionShell from './LandingSectionShell';
import RevealOnScroll from './RevealOnScroll';
import { resolveLandingIcon } from './iconMap';

export default function ModulesSection({ data = {} }) {
  const items = Array.isArray(data?.items) ? data.items : [];

  return (
    <LandingSectionShell
      id="modules"
      eyebrow={data?.eyebrow}
      title={data?.title}
      description={data?.description}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => {
          const Icon = resolveLandingIcon(item?.iconKey);
          return (
            <RevealOnScroll key={`${item?.title || 'module'}-${index}`} delay={index * 70}>
              <div className="card h-full">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center border border-primary-200 bg-primary-50 text-xl text-primary-700">
                    <Icon />
                  </div>
                  {item?.badge ? <span className="badge-blue">{item.badge}</span> : null}
                </div>
                <h3 className="mt-5 text-xl font-semibold text-text-primary">{item?.title}</h3>
                <p className="mt-3 text-sm leading-7 text-text-secondary">{item?.description}</p>
              </div>
            </RevealOnScroll>
          );
        })}
      </div>
    </LandingSectionShell>
  );
}
