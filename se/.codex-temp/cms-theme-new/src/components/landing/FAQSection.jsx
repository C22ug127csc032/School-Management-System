import React from 'react';
import LandingSectionShell from './LandingSectionShell';
import RevealOnScroll from './RevealOnScroll';

export default function FAQSection({ data = {} }) {
  const items = Array.isArray(data?.items) ? data.items : [];

  return (
    <LandingSectionShell
      id="faq"
      eyebrow={data?.eyebrow}
      title={data?.title}
      description={data?.description}
    >
      <div className="mx-auto grid max-w-4xl gap-4">
        {items.map((item, index) => (
          <RevealOnScroll key={`${item?.question || 'faq'}-${index}`} delay={index * 60}>
            <details className="border border-border bg-white px-5 py-4 shadow-sm">
              <summary className="cursor-pointer list-none pr-6 text-left text-lg font-semibold text-text-primary">
                {item?.question}
              </summary>
              <p className="mt-4 text-sm leading-7 text-text-secondary">{item?.answer}</p>
            </details>
          </RevealOnScroll>
        ))}
      </div>
    </LandingSectionShell>
  );
}
