import React from 'react';

export default function LandingSectionShell({
  id,
  eyebrow,
  title,
  description,
  children,
  className = '',
  contentClassName = '',
}) {
  return (
    <section id={id} className={`relative py-10 sm:py-12 lg:py-14 ${className}`.trim()}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {(eyebrow || title || description) ? (
          <div className="mx-auto max-w-3xl text-center">
            {eyebrow ? <p className="institution-tag mx-auto mb-3">{eyebrow}</p> : null}
            {title ? <h2 className="page-title">{title}</h2> : null}
            {description ? <p className="mt-3 text-sm leading-7 text-text-secondary sm:text-base">{description}</p> : null}
          </div>
        ) : null}
        <div className={`${eyebrow || title || description ? 'mt-7 sm:mt-8' : ''} ${contentClassName}`.trim()}>
          {children}
        </div>
      </div>
    </section>
  );
}
