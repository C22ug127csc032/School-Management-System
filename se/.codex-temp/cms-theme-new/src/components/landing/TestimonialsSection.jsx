import React from 'react';
import LandingSectionShell from './LandingSectionShell';
import RevealOnScroll from './RevealOnScroll';
import BrandAvatar from '../common/BrandAvatar';
import { FiAward } from '../common/icons';

export default function TestimonialsSection({ data = {} }) {
  const items = Array.isArray(data?.items) ? data.items : [];

  return (
    <LandingSectionShell
      id="testimonials"
      eyebrow={data?.eyebrow}
      title={data?.title}
      description={data?.description}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((item, index) => (
          <RevealOnScroll key={`${item?.name || 'testimonial'}-${index}`} delay={index * 80}>
            <div className="card h-full">
              <p className="text-lg leading-8 text-text-primary">"{item?.quote}"</p>
              <div className="mt-6 flex items-center gap-3">
                <BrandAvatar
                  src={item?.avatarUrl || ''}
                  alt={item?.name || 'Client'}
                  fallback={String(item?.name || 'C').charAt(0).toUpperCase()}
                  className="flex h-12 w-12 items-center justify-center border border-border bg-primary-50 text-lg font-semibold text-primary-700"
                  imageClassName="h-full w-full object-cover"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary">{item?.name}</p>
                  <p className="text-sm text-text-secondary">
                    {item?.role}{item?.institution ? ` | ${item.institution}` : ''}
                  </p>
                </div>
              </div>
              <div className="mt-5 inline-flex items-center gap-2 border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary-700">
                <FiAward />
                Rating {item?.rating || 5}/5
              </div>
            </div>
          </RevealOnScroll>
        ))}
      </div>
    </LandingSectionShell>
  );
}
