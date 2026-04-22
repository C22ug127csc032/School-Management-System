import React from 'react';
import LandingSectionShell from './LandingSectionShell';
import LandingAction from './LandingAction';
import RevealOnScroll from './RevealOnScroll';
import { FEATURE_LABEL_MAP } from '../../utils/subscriptionCatalog';
import { FiCheck } from '../common/icons';

const formatFeature = value =>
  FEATURE_LABEL_MAP[value] || String(value || '').replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());

const splitIntoColumns = (items = []) => {
  const midpoint = Math.ceil(items.length / 2);
  return [items.slice(0, midpoint), items.slice(midpoint)];
};

export default function PricingSection({ data = {} }) {
  const plans = Array.isArray(data?.plans) ? data.plans : [];

  return (
    <LandingSectionShell
      id="pricing"
      eyebrow={data?.eyebrow}
      title={data?.title}
      description={data?.description}
    >
      <div className="flex flex-col gap-3 border border-border bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-text-primary">Simple pricing for every institution size</p>
          <p className="mt-1 text-xs text-text-secondary">
            {data?.billingNote || 'Choose the plan that fits your institution today and move up anytime you need more capacity.'}
          </p>
        </div>
        <div className="inline-flex w-fit items-center border border-primary-200 bg-white p-1 shadow-sm">
          <span className="bg-primary-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary-700">Monthly</span>
          <span className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">Yearly Soon</span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-4">
        {plans.map((plan, index) => (
          <RevealOnScroll
            key={`${plan?.key || 'plan'}-${index}`}
            delay={index * 70}
            className="w-full md:max-w-[calc(50%-0.5rem)] xl:max-w-[calc(33.333%-0.75rem)]"
          >
            <div className={`flex h-full flex-col border bg-white shadow-sm ${plan?.isHighlighted ? 'border-primary-500 ring-1 ring-primary-200' : 'border-border'}`}>
              <div className={`border-b px-4 py-4 ${plan?.isHighlighted ? 'border-primary-200 bg-primary-50' : 'border-border bg-slate-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-semibold text-text-primary">{plan?.name}</p>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">{plan?.tagline}</p>
                  </div>
                  {plan?.badge ? (
                    <span className={plan?.isHighlighted ? 'badge-blue' : 'badge-gray'}>
                      {plan.badge}
                    </span>
                  ) : null}
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-semibold text-text-primary">{plan?.priceLabel}</p>
                  <p className="mt-1 text-sm text-text-secondary">{plan?.periodLabel}</p>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-4">
                {Array.isArray(plan?.limits) && plan.limits.length ? (
                  <div className="flex flex-wrap gap-2">
                    {plan.limits.map((limit, limitIndex) => (
                      <span key={`${limit}-${limitIndex}`} className="badge-gray">
                        {limit}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex-1">
                  <div className="grid gap-4 md:grid-cols-2">
                    {splitIntoColumns(plan?.features || []).map((column, columnIndex) => (
                      <div key={`${plan?.key || 'plan'}-col-${columnIndex}`} className="space-y-3">
                        {column.map((feature, featureIndex) => (
                          <div key={`${feature}-${featureIndex}`} className="flex items-start gap-3 border-l-2 border-primary-200 pl-3">
                            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center bg-primary-50 text-sm text-primary-700">
                              <FiCheck />
                            </div>
                            <p className="text-sm leading-6 text-text-primary">{formatFeature(feature)}</p>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {plan?.footnote ? (
                  <p className="mt-4 border-t border-border pt-4 text-xs leading-6 text-text-secondary">{plan.footnote}</p>
                ) : null}

                <LandingAction
                  href={plan?.ctaHref || '/trial'}
                  label={plan?.ctaLabel || 'Choose Plan'}
                  variant={plan?.isHighlighted ? 'primary' : 'secondary'}
                  className="mt-5 w-full px-5 py-3"
                />
              </div>
            </div>
          </RevealOnScroll>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="border border-border bg-slate-50 px-4 py-4 text-sm leading-6 text-text-secondary shadow-sm">
          Start with the plan that fits your current student strength and expand when your institution grows.
        </div>
        <div className="border border-border bg-slate-50 px-4 py-4 text-sm leading-6 text-text-secondary shadow-sm">
          Every plan is designed for practical college workflows, not just software screens.
        </div>
        <div className="border border-border bg-slate-50 px-4 py-4 text-sm leading-6 text-text-secondary shadow-sm">
          Need a larger setup or custom rollout? EMATIX can guide you with the right path.
        </div>
      </div>
    </LandingSectionShell>
  );
}
