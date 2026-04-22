import React from 'react';
import LandingSectionShell from './LandingSectionShell';
import RevealOnScroll from './RevealOnScroll';
import useParallaxShift from './useParallaxShift';

export default function PreviewSection({ data = {} }) {
  const shift = useParallaxShift(0.08);
  const metricCards = Array.isArray(data?.metricCards) ? data.metricCards : [];
  const sidebarItems = Array.isArray(data?.sidebarItems) ? data.sidebarItems : [];
  const activityItems = Array.isArray(data?.activityItems) ? data.activityItems : [];
  const featuredMetric = metricCards[0] || null;
  const secondaryMetrics = metricCards.slice(1, 4);

  return (
    <LandingSectionShell
      id="preview"
      eyebrow={data?.eyebrow}
      title={data?.title}
      description={data?.description}
    >
      <div className="grid gap-4 xl:grid-cols-[1.14fr_0.86fr]">
        <RevealOnScroll>
          <div
            className="overflow-hidden border border-border bg-white shadow-sm"
            style={{ transform: `translate3d(0, ${shift * -0.08}px, 0)` }}
          >
            {data?.imageUrl ? (
              <div className="border-b border-border bg-slate-50 p-3">
                <img
                  src={data.imageUrl}
                  alt={data?.title || 'Product preview'}
                  className="h-64 w-full object-cover sm:h-80"
                />
              </div>
            ) : null}

            <div className="grid lg:grid-cols-[200px_1fr]">
              <div className="border-b border-border bg-sidebar px-4 py-5 text-white lg:border-b-0 lg:border-r">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">Workspace</p>
                <div className="mt-4 space-y-2">
                  {sidebarItems.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className={`border px-4 py-3 text-sm font-medium ${index === 0 ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 bg-white/5 text-white/80'}`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  {metricCards.map((item, index) => (
                    <div
                      key={`${item?.label || 'metric'}-${index}`}
                      className="border border-primary-200 bg-primary-50 px-4 py-4"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-700">{item?.label}</p>
                      <p className="mt-3 text-2xl font-semibold text-text-primary">{item?.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 border border-border">
                  <div className="border-b border-border bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Recent Activity</p>
                  </div>
                  <div className="divide-y divide-border">
                    {activityItems.map((item, index) => (
                      <div key={`${item?.title || 'activity'}-${index}`} className="px-4 py-4">
                        <p className="font-semibold text-text-primary">{item?.title}</p>
                        <p className="mt-1 text-sm text-text-secondary">{item?.meta}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={100}>
          <div className="grid gap-3" style={{ transform: `translate3d(0, ${shift * 0.06}px, 0)` }}>
            <div className="border border-primary-200 bg-white shadow-sm">
              <div className="grid gap-4 p-4 sm:p-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-700">Why Institutions Like It</p>
                  <h3 className="mt-3 text-2xl font-semibold text-text-primary">
                    A clean workspace that feels practical from the first use.
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-text-secondary">
                    Admissions, finance, hostel, library, and communication stay easy to follow in one well-organized system.
                  </p>
                </div>

                {featuredMetric ? (
                  <div className="border border-primary-200 bg-primary-50 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-700">
                      {featuredMetric?.label}
                    </p>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <p className="text-3xl font-semibold text-text-primary">{featuredMetric?.value}</p>
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-700">
                        Live Snapshot
                      </span>
                    </div>
                  </div>
                ) : null}

                {secondaryMetrics.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {secondaryMetrics.map((item, index) => (
                      <div key={`${item?.label || 'secondary-metric'}-${index}`} className="border border-border bg-slate-50 px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">{item?.label}</p>
                        <p className="mt-2 text-xl font-semibold text-text-primary">{item?.value}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="border border-border bg-white shadow-sm">
              <div className="border-b border-border bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Highlights</p>
              </div>
              <div className="grid gap-3 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="border border-border bg-slate-50 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Role-Based Access</p>
                    <p className="mt-2 text-lg font-semibold text-text-primary">Different teams, one connected system</p>
                  </div>
                  <div className="border border-border bg-slate-50 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Institution Branding</p>
                    <p className="mt-2 text-lg font-semibold text-text-primary">A polished presentation supported by EMATIX</p>
                  </div>
                </div>
                <div className="border border-border bg-slate-50 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Operational Visibility</p>
                  <p className="mt-2 text-base leading-7 text-text-secondary">
                    Daily updates, financial movement, and workflow checkpoints stay visible in one neatly arranged workspace.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </LandingSectionShell>
  );
}
