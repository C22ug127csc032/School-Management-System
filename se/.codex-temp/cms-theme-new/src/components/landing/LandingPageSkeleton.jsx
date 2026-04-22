import React from 'react';

export default function LandingPageSkeleton() {
  return (
    <div className="min-h-screen bg-light-bg">
      <div className="mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-6 lg:px-8">
        <div className="border border-border bg-white p-6 shadow-sm">
          <div className="h-10 w-40 bg-slate-100" />
          <div className="mt-6 h-14 w-full max-w-3xl bg-slate-100" />
          <div className="mt-4 h-5 w-full max-w-2xl bg-slate-100" />
          <div className="mt-8 flex gap-3">
            <div className="h-11 w-40 bg-slate-100" />
            <div className="h-11 w-36 bg-slate-100" />
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 border border-border bg-slate-50" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
