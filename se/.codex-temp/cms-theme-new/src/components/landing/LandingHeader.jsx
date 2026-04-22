import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BrandAvatar from '../common/BrandAvatar';
import LandingAction from './LandingAction';
import { EMATIX_WORDMARK, getPortalBranding } from '../../utils/branding';
import { FiMenu, FiX } from '../common/icons';

const NAV_SECTION_KEYS = ['overview', 'modules', 'features', 'pricing', 'testimonials', 'faq', 'contact'];

const NAV_LABELS = {
  overview: 'Overview',
  modules: 'Modules',
  features: 'Features',
  pricing: 'Pricing',
  testimonials: 'Testimonials',
  faq: 'FAQ',
  contact: 'Contact',
};

export default function LandingHeader({
  hero = null,
  visibleSectionKeys = [],
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const brandIdentity = getPortalBranding({ platform: true });

  const navItems = useMemo(
    () => NAV_SECTION_KEYS
      .filter(sectionKey => visibleSectionKeys.includes(sectionKey))
      .map(sectionKey => ({
        href: `#${sectionKey}`,
        label: NAV_LABELS[sectionKey],
      })),
    [visibleSectionKeys]
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 py-2.5 sm:py-3">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <BrandAvatar
              src={brandIdentity.iconSrc}
              alt="EMATIX"
              fallback={brandIdentity.initial}
              circularImage={Boolean(brandIdentity.usesEmatixBrand)}
              className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border border-border bg-white text-lg font-bold text-primary-700 shadow-sm"
              imageClassName="h-full w-full object-contain p-1.5"
            />
            <div className="min-w-0">
              <img
                src={EMATIX_WORDMARK}
                alt="EMATIX"
                className="h-8 w-auto max-w-[146px] object-contain sm:h-9 sm:max-w-[162px]"
              />
              <p className="hidden text-[11px] uppercase tracking-[0.18em] text-text-secondary sm:block">
                College Management System
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {navItems.map(item => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-text-secondary transition-colors hover:text-primary-700"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <LandingAction
              href="/admin/login"
              label="Institution Login"
              variant="secondary"
              className="px-4 py-2.5"
            />
            <LandingAction
              href={hero?.primaryCtaHref || '/trial'}
              label={hero?.primaryCtaLabel || 'Start Free Trial'}
              className="px-5 py-2.5"
            />
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(current => !current)}
            className="flex h-11 w-11 items-center justify-center border border-border bg-white text-text-primary shadow-sm transition-colors hover:border-primary-700 hover:text-primary-700 lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>

        {mobileOpen ? (
          <div className="border-t border-border py-4 lg:hidden">
            <div className="grid gap-3">
              {navItems.map(item => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="border border-border bg-slate-50 px-4 py-3 text-sm font-semibold text-text-primary"
                >
                  {item.label}
                </a>
              ))}
            </div>
            <div className="mt-4 grid gap-3">
              <LandingAction
                href="/admin/login"
                label="Institution Login"
                variant="secondary"
                className="w-full px-4 py-3"
              />
              <LandingAction
                href={hero?.primaryCtaHref || '/trial'}
                label={hero?.primaryCtaLabel || 'Start Free Trial'}
                className="w-full px-4 py-3"
              />
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
