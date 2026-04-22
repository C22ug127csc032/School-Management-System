import React from 'react';
import LandingAction from './LandingAction';
import RevealOnScroll from './RevealOnScroll';
import useParallaxShift from './useParallaxShift';
import { FiCheck } from '../common/icons';

export default function HeroSection({ data = {} }) {
  const shift = useParallaxShift(0.12);
  const floatingCards = Array.isArray(data?.media?.floatingCards) ? data.media.floatingCards : [];
  const trustPoints = Array.isArray(data?.trustPoints) ? data.trustPoints : [];
  const titleLines = String(data?.title || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary-50 via-white to-white">
      <div
        className="pointer-events-none absolute -left-16 top-16 h-36 w-36 border border-primary-200 bg-white/70 blur-3xl sm:h-48 sm:w-48"
        style={{ transform: `translate3d(0, ${shift * 0.9}px, 0)` }}
      />
      <div
        className="pointer-events-none absolute right-0 top-0 h-72 w-72 bg-primary-50 blur-3xl sm:h-96 sm:w-96"
        style={{ transform: `translate3d(0, ${shift * -0.7}px, 0)` }}
      />
      <div
        className="pointer-events-none absolute bottom-4 left-1/2 h-40 w-40 -translate-x-1/2 border border-primary-200 bg-white/60 blur-2xl"
        style={{ transform: `translate3d(0, ${shift * 0.5}px, 0)` }}
      />

      <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="grid items-start gap-7 lg:grid-cols-[1.02fr_0.98fr] lg:gap-8">
          <RevealOnScroll className="relative z-10">
            {data?.eyebrow ? <p className="institution-tag">{data.eyebrow}</p> : null}
            {data?.badge ? (
              <div className="mt-3 inline-flex items-center border border-primary-200 bg-white/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-700 shadow-sm backdrop-blur-sm">
                {data.badge}
              </div>
            ) : null}
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight text-text-primary sm:text-5xl lg:text-[3.55rem]">
              {(titleLines.length ? titleLines : [data?.title]).map((line, index) => (
                <span key={`${line}-${index}`} className="block">
                  {line}
                </span>
              ))}
            </h1>
            {data?.description ? (
              <p className="mt-4 max-w-2xl text-justify text-base leading-7 text-text-secondary sm:text-lg">
                {data.description}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
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

            {data?.announcement ? (
              <div className="mt-6 border border-primary-200 bg-white/75 p-4 shadow-sm backdrop-blur-sm">
                <p className="text-sm leading-6 text-text-primary">{data.announcement}</p>
              </div>
            ) : null}

            {trustPoints.length ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {trustPoints.map((item, index) => (
                  <div key={`${item}-${index}`} className="flex items-start gap-3 border border-border bg-white px-4 py-4 shadow-sm">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center bg-primary-50 text-primary-700">
                      <FiCheck />
                    </div>
                    <p className="text-sm font-medium leading-6 text-text-primary">{item}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </RevealOnScroll>

          <RevealOnScroll delay={120} className="relative" y={32}>
            <div
              className="relative overflow-hidden border border-border bg-white shadow-sm"
              style={{ transform: `translate3d(0, ${shift * -0.14}px, 0)` }}
            >
              {data?.media?.imageUrl ? (
                <div className="border-b border-border bg-slate-50 p-3">
                  <img
                    src={data.media.imageUrl}
                    alt={data?.media?.headline || 'EMATIX product preview'}
                    className="h-64 w-full object-cover sm:h-72 lg:h-80"
                  />
                </div>
              ) : null}

              <div className="border-b border-border bg-slate-50 px-4 py-4 sm:px-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-700">
                  {data?.media?.headline || 'One platform for every institution'}
                </p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  {data?.media?.subheadline || 'Manage admissions, operations, payments, and communication in one workspace.'}
                </p>
              </div>

              <div className="grid gap-3 p-4 sm:p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="border border-primary-200 bg-primary-50 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-700">Admissions</p>
                    <p className="mt-2 text-lg font-semibold text-text-primary">Student intake with clear workflow</p>
                  </div>
                  <div className="border border-border bg-white px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Finance</p>
                    <p className="mt-2 text-lg font-semibold text-text-primary">Fees, ledger, and payments in one place</p>
                  </div>
                  <div className="border border-border bg-white px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Operations</p>
                    <p className="mt-2 text-lg font-semibold text-text-primary">Hostel, library, and daily control</p>
                  </div>
                </div>

                {floatingCards.length ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {floatingCards.map((item, index) => (
                      <div key={`${item?.title || 'card'}-${index}`} className="border border-border bg-slate-50 px-4 py-4">
                        <p className="text-sm font-semibold text-text-primary">{item?.title}</p>
                        <p className="mt-2 text-sm leading-6 text-text-secondary">{item?.value}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
