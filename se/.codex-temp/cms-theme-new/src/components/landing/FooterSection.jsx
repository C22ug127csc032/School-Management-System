import React from 'react';
import { Link } from 'react-router-dom';
import BrandAvatar from '../common/BrandAvatar';
import { EMATIX_WORDMARK, getPortalBranding } from '../../utils/branding';

export default function FooterSection({ data = {} }) {
  const brandIdentity = getPortalBranding({ platform: true });
  const links = Array.isArray(data?.links) ? data.links : [];

  return (
    <footer id="footer" className="border-t border-border bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <BrandAvatar
                src={brandIdentity.iconSrc}
                alt="EMATIX"
                fallback={brandIdentity.initial}
                circularImage={Boolean(brandIdentity.usesEmatixBrand)}
                className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden border border-border bg-primary-50 text-lg font-bold text-primary-700"
                imageClassName="h-full w-full object-contain p-1.5"
              />
              <div className="min-w-0">
                <img
                  src={EMATIX_WORDMARK}
                  alt="EMATIX"
                  className="h-9 w-auto max-w-[190px] object-contain"
                />
                <p className="mt-1 text-sm font-semibold text-text-primary">{data?.brandTitle || 'EMATIX'}</p>
              </div>
            </div>
            {data?.brandDescription ? (
              <p className="mt-4 max-w-2xl text-sm leading-7 text-text-secondary">{data.brandDescription}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border border-border bg-slate-50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Quick Links</p>
              <div className="mt-4 grid gap-3">
                {links.map((item, index) => (
                  String(item?.href || '').startsWith('/') ? (
                    <Link
                      key={`${item?.label || 'link'}-${index}`}
                      to={item.href}
                      className="text-sm font-semibold text-text-primary transition-colors hover:text-primary-700"
                    >
                      {item?.label}
                    </Link>
                  ) : (
                    <a
                      key={`${item?.label || 'link'}-${index}`}
                      href={item?.href || '#'}
                      className="text-sm font-semibold text-text-primary transition-colors hover:text-primary-700"
                    >
                      {item?.label}
                    </a>
                  )
                ))}
              </div>
            </div>
            <div className="border border-border bg-slate-50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Public Access</p>
              <div className="mt-4 grid gap-3 text-sm text-text-secondary">
                <p>Institution onboarding and trial access are supported directly by EMATIX.</p>
                <p>Dedicated portal URLs and paid-plan journeys continue inside the scoped tenant routes.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-5">
          <div className="flex flex-col items-center justify-center gap-4">
            <p className="text-center text-sm font-bold tracking-[0.01em] text-text-primary sm:text-base">
              {data?.copyright || 'All Rights Reserved. Powered by EMATIX Embedded and Software Solutions Inc.'}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
