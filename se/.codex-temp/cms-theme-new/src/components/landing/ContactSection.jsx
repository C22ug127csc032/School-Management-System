import React from 'react';
import LandingSectionShell from './LandingSectionShell';
import LandingAction from './LandingAction';
import RevealOnScroll from './RevealOnScroll';

export default function ContactSection({ data = {} }) {
  const cards = Array.isArray(data?.cards) ? data.cards : [];

  return (
    <LandingSectionShell
      id="contact"
      eyebrow={data?.eyebrow}
      title={data?.title}
      description={data?.description}
    >
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <RevealOnScroll>
          <div className="card h-full">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-700">Talk To EMATIX</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-text-primary">
              {data?.email ? (
                <div className="border border-border bg-slate-50 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Email</p>
                  <p className="mt-2 break-all font-semibold">{data.email}</p>
                </div>
              ) : null}
              {data?.phone ? (
                <div className="border border-border bg-slate-50 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Phone</p>
                  <p className="mt-2 font-semibold">{data.phone}</p>
                </div>
              ) : null}
              {data?.address ? (
                <div className="border border-border bg-slate-50 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Address</p>
                  <p className="mt-2 font-semibold">{data.address}</p>
                </div>
              ) : null}
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <LandingAction
                href={data?.primaryCtaHref || 'mailto:hello@ematixsolutions.com'}
                label={data?.primaryCtaLabel || 'Book Demo'}
                className="px-5 py-3"
              />
              <LandingAction
                href={data?.secondaryCtaHref || '/trial'}
                label={data?.secondaryCtaLabel || 'Start Free Trial'}
                variant="secondary"
                className="px-5 py-3"
              />
            </div>
          </div>
        </RevealOnScroll>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card, index) => (
            <RevealOnScroll key={`${card?.title || 'contact-card'}-${index}`} delay={index * 80}>
              <div className="card h-full">
                <p className="text-xl font-semibold text-text-primary">{card?.title}</p>
                <p className="mt-2 text-sm leading-7 text-text-secondary">{card?.description}</p>
                <LandingAction
                  href={card?.ctaHref || '#contact'}
                  label={card?.ctaLabel || 'Contact Us'}
                  variant="secondary"
                  className="mt-5 w-full px-4 py-3"
                />
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </LandingSectionShell>
  );
}
