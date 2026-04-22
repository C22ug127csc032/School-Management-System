import React from 'react';
import LandingAction from './LandingAction';
import RevealOnScroll from './RevealOnScroll';
import { FiCheck } from '../common/icons';

export default function CTASection({ data = {} }) {
  const checkpoints = Array.isArray(data?.checkpoints) ? data.checkpoints : [];

  return (
    <section id="cta" className="py-10 sm:py-12 lg:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealOnScroll>
          <div className="overflow-hidden border border-primary-200 bg-primary-50 shadow-sm">
            <div className="grid gap-6 px-5 py-6 sm:px-7 sm:py-7 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
              <div>
                {data?.eyebrow ? <p className="institution-tag">{data.eyebrow}</p> : null}
                <h2 className="mt-4 text-3xl font-semibold text-text-primary sm:text-4xl">{data?.title}</h2>
                {data?.description ? (
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary sm:text-base">{data.description}</p>
                ) : null}
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <LandingAction
                    href={data?.primaryCtaHref || '/trial'}
                    label={data?.primaryCtaLabel || 'Start Free Trial'}
                    className="px-6 py-3"
                  />
                  <LandingAction
                    href={data?.secondaryCtaHref || '#contact'}
                    label={data?.secondaryCtaLabel || 'Book Demo'}
                    variant="secondary"
                    className="px-6 py-3"
                  />
                </div>
              </div>

              <div className="grid gap-3">
                {checkpoints.map((item, index) => (
                  <div key={`${item}-${index}`} className="flex items-start gap-3 border border-white/70 bg-white/80 px-4 py-3.5 shadow-sm">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center bg-primary-50 text-primary-700">
                      <FiCheck />
                    </div>
                    <p className="text-sm font-medium leading-6 text-text-primary">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
