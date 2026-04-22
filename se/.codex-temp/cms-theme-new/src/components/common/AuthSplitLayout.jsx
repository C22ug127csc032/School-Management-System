import React, { useEffect } from 'react';
import BrandAvatar from './BrandAvatar';
import { applyDocumentBranding, getPortalBranding } from '../../utils/branding';

const renderEmatixWordmarkText = text => {
  const normalized = String(text || '');
  const matchIndex = normalized.toUpperCase().indexOf('EMATIX');
  if (matchIndex === -1) {
    return text;
  }

  const before = normalized.slice(0, matchIndex);
  const after = normalized.slice(matchIndex + 6);

  return (
    <>
      {before}
      <span className="inline-flex items-end">
        <span className="text-inherit">EMAT</span>
        <span className="relative mx-[0.02em] inline-flex text-[#D91F26]">
          I
          <span className="absolute left-1/2 top-0 h-[0.18em] w-[0.18em] -translate-x-1/2 -translate-y-[0.2em] rounded-full bg-[#D91F26]" />
        </span>
        <span className="text-inherit">X</span>
      </span>
      {after}
    </>
  );
};

export default function AuthSplitLayout({
  badge,
  panelTitle = 'Sign in',
  panelSubtitle,
  welcomeLabel = 'WELCOME',
  welcomeTitle,
  welcomeDescription,
  welcomeNote,
  brandIdentity = null,
  footer,
  children,
}) {
  const branding = brandIdentity || getPortalBranding({ platform: true });

  useEffect(() => {
    applyDocumentBranding({
      title: branding?.usesEmatixBrand ? 'Ematix' : (branding?.title || 'Institution Portal'),
      iconSrc: branding?.iconSrc || '',
      initial: branding?.initial || 'C',
      primaryColor: '#2D56C5',
    });
  }, [branding]);

  return (
    <div
      className="min-h-screen px-3 py-4 sm:px-5 sm:py-6 lg:px-6 lg:py-8"
      style={{
        background: 'linear-gradient(135deg, var(--brand-secondary) 0%, var(--brand-primary-dark) 48%, var(--brand-primary) 100%)',
      }}
    >
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl items-center justify-center sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
        <div
          className="relative w-full overflow-hidden border border-white/20 bg-white shadow-[0_35px_90px_-35px_rgba(15,23,42,0.55)]"
          style={{ borderRadius: '8px' }}
        >
          <div className="grid lg:grid-cols-[1.02fr_0.98fr]">
            <section
              className="relative overflow-hidden px-6 py-7 sm:px-8 sm:py-9 lg:min-h-[620px] lg:px-12 lg:py-14"
              style={{
                background: 'linear-gradient(180deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%)',
              }}
            >
              <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/95" />
              <div className="absolute -left-24 bottom-0 h-48 w-48 rounded-full bg-white/10" />
              <div
                className="absolute bottom-6 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full shadow-2xl sm:bottom-10 sm:h-40 sm:w-40"
                style={{
                  background: 'linear-gradient(135deg, rgba(221,231,255,0.92) 0%, rgba(45,86,197,0.92) 100%)',
                  boxShadow: '0 25px 50px -20px rgba(19,37,84,0.45)',
                }}
              />
              <div className="absolute left-6 top-6 h-20 w-20 bg-white/8 blur-[2px] sm:left-8 sm:top-8 sm:h-24 sm:w-24" style={{ borderRadius: '24px' }} />

              <div className="relative z-10 flex h-full flex-col justify-between">
                <div className="max-w-sm">
                  <div className="mb-6 flex justify-center lg:justify-start">
                    <BrandAvatar
                      src={branding?.iconSrc || ''}
                      alt={branding?.title || 'Brand'}
                      fallback={branding?.initial || 'E'}
                      circularImage={Boolean(branding?.usesEmatixBrand)}
                      className="flex h-20 w-20 items-center justify-center overflow-hidden text-3xl font-bold text-white sm:h-24 sm:w-24"
                      imageClassName="h-full w-full object-contain p-2"
                    />
                  </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/75 sm:text-xs sm:tracking-[0.35em]">
                  {welcomeLabel}
                </p>
                <h1 className="mt-4 text-3xl font-bold uppercase tracking-[0.06em] text-white sm:mt-5 sm:text-4xl lg:text-[3.35rem] lg:leading-[1.02]">
                  {renderEmatixWordmarkText(welcomeTitle)}
                </h1>
                <p className="mt-3 max-w-xs text-sm font-medium leading-6 text-white/90 sm:mt-5 sm:text-base sm:leading-7">
                  {welcomeDescription}
                </p>
                {welcomeNote && (
                  <p className="mt-4 max-w-sm border-l border-white/25 pl-4 text-xs leading-5 text-white/70 sm:mt-5 sm:text-sm sm:leading-6">
                    {welcomeNote}
                  </p>
                )}
                </div>

              </div>
            </section>

            <section className="flex flex-col justify-start bg-white px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
              {branding?.logoSrc ? (
                <div className="mb-4 flex justify-center pt-1 sm:mb-5 sm:pt-2">
                  <img
                    src={branding.logoSrc}
                    alt={branding?.title || 'Brand'}
                    className="max-h-14 w-full max-w-[200px] object-contain sm:max-h-16 sm:max-w-[240px] lg:max-h-20 lg:max-w-[290px]"
                  />
                </div>
              ) : null}
              {badge && (
                <span
                  className="mb-3 inline-flex w-fit items-center border border-primary-100 bg-primary-50 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-600 sm:mb-4 sm:px-4 sm:text-xs sm:tracking-[0.18em]"
                  style={{ borderRadius: '999px' }}
                >
                  {badge}
                </span>
              )}
              <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-5xl">
                {panelTitle}
              </h2>
              {panelSubtitle && (
                <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary">
                  {panelSubtitle}
                </p>
              )}

              <div className="mt-5 sm:mt-6">{children}</div>

              {footer && <div className="mt-5 sm:mt-6">{footer}</div>}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
