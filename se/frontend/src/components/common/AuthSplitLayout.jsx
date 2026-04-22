import React from 'react';

export default function AuthSplitLayout({
  badge,
  panelTitle = 'Sign in',
  panelSubtitle,
  welcomeLabel = 'WELCOME',
  welcomeTitle,
  welcomeDescription,
  welcomeNote,
  footer,
  children,
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sidebar via-primary-dark to-primary-500 px-3 py-4 sm:px-5 sm:py-6 lg:px-6 lg:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl items-center justify-center sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
        <div
          className="relative w-full overflow-hidden border border-white/20 bg-white shadow-[0_35px_90px_-35px_rgba(15,23,42,0.55)]"
          style={{ borderRadius: '28px' }}
        >
          <div className="grid lg:grid-cols-[1.02fr_0.98fr]">
            <section className="relative overflow-hidden bg-gradient-to-br from-primary-500 via-primary-600 to-sidebar px-6 py-7 text-white sm:px-8 sm:py-9 lg:min-h-[620px] lg:px-12 lg:py-14">
              <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/95" />
              <div className="absolute -left-24 bottom-0 h-48 w-48 rounded-full bg-white/10" />
              <div className="absolute bottom-6 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full bg-gradient-to-br from-primary-200/80 to-primary-700/90 shadow-2xl shadow-primary-950/25 sm:bottom-10 sm:h-40 sm:w-40" />
              <div className="absolute left-6 top-6 h-20 w-20 bg-white/8 blur-[2px] sm:left-8 sm:top-8 sm:h-24 sm:w-24" style={{ borderRadius: '24px' }} />

              <div className="relative z-10 max-w-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/75 sm:text-xs sm:tracking-[0.35em]">
                  {welcomeLabel}
                </p>
                <h1 className="mt-4 text-3xl font-bold uppercase tracking-[0.06em] text-white sm:mt-5 sm:text-4xl lg:text-[3.35rem] lg:leading-[1.02]">
                  {welcomeTitle}
                </h1>
                <p className="mt-3 max-w-xs text-sm font-medium leading-6 text-white/92 sm:mt-5 sm:text-base sm:leading-7">
                  {welcomeDescription}
                </p>
                {welcomeNote ? (
                  <p className="mt-4 max-w-sm border-l border-white/25 pl-4 text-xs leading-5 text-white/70 sm:mt-5 sm:text-sm sm:leading-6">
                    {welcomeNote}
                  </p>
                ) : null}
              </div>
            </section>

            <section className="flex flex-col justify-center bg-white px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-12">
              {badge ? (
                <span
                  className="mb-4 inline-flex w-fit items-center border border-primary-100 bg-primary-50 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-600 sm:mb-5 sm:px-4 sm:text-xs sm:tracking-[0.18em]"
                  style={{ borderRadius: '999px' }}
                >
                  {badge}
                </span>
              ) : null}
              <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-5xl">
                {panelTitle}
              </h2>
              {panelSubtitle ? (
                <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary">
                  {panelSubtitle}
                </p>
              ) : null}

              <div className="mt-6 sm:mt-8">{children}</div>

              {footer ? <div className="mt-6 sm:mt-8">{footer}</div> : null}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
