import React, { useEffect } from 'react';
import { FiArrowUp } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { LandingPageProvider, useLandingPage } from '../context/LandingPageContext';
import LandingHeader from '../components/landing/LandingHeader';
import HeroSection from '../components/landing/HeroSection';
import StatsSection from '../components/landing/StatsSection';
import OverviewSection from '../components/landing/OverviewSection';
import ModulesSection from '../components/landing/ModulesSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import PreviewSection from '../components/landing/PreviewSection';
import PricingSection from '../components/landing/PricingSection';
import CTASection from '../components/landing/CTASection';
import TestimonialsSection from '../components/landing/TestimonialsSection';
import FAQSection from '../components/landing/FAQSection';
import ContactSection from '../components/landing/ContactSection';
import FooterSection from '../components/landing/FooterSection';
import LandingPageSkeleton from '../components/landing/LandingPageSkeleton';
import { applyDocumentBranding, getPortalBranding } from '../utils/branding';
import whatsappIcon from '../../assets/Whatsapp-icon.png';

const SECTION_COMPONENTS = {
  hero: HeroSection,
  stats: StatsSection,
  overview: OverviewSection,
  modules: ModulesSection,
  features: FeaturesSection,
  preview: PreviewSection,
  pricing: PricingSection,
  cta: CTASection,
  testimonials: TestimonialsSection,
  faq: FAQSection,
  contact: ContactSection,
  footer: FooterSection,
};

const polishLandingCopy = value => {
  if (Array.isArray(value)) {
    return value.map(polishLandingCopy);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, polishLandingCopy(nestedValue)])
    );
  }

  if (typeof value !== 'string') {
    return value;
  }

  return value
    .replace(
      /Run admissions, academics, finance, hostel, library, and campus operations from one connected workspace\./gi,
      'EMATIX Unifies Admissions, Academics, Finance,\nHostel, Library, And Campus Operations.'
    )
    .replace(
      /EMATIX helps colleges manage daily academic and administrative work with one clear, modern system\./gi,
      'EMATIX Helps Colleges Manage Academic And Administrative Work In One Clear, Professional System.'
    )
    .replace(/Ematix Master Admin/gi, 'EMATIX')
    .replace(/Master Admin-controlled/gi, 'Managed by EMATIX')
    .replace(/governed by Ematix Master Admin/gi, 'managed by EMATIX')
    .replace(/from the Ematix platform/gi, 'from EMATIX')
    .replace(/Ematix platform/gi, 'EMATIX')
    .replace(/control panel/gi, 'service desk')
    .replace(/control plane/gi, 'team')
    .replace(/controlled/gi, 'managed')
    .replace(/read-only/gi, 'view mode')
    .replace(/Professional Governance/gi, 'Professional Support')
    .replace(/Built for SaaS control, not just campus screens\./gi, 'Built for smooth daily campus work.')
    .replace(/SaaS-ready/gi, 'modern')
    .replace(/\bSaaS\b/gi, 'platform')
    .replace(/subscription-led SaaS deployment/gi, 'subscription-based deployment')
    .replace(/Ematix/g, 'EMATIX');
};

function LandingPageContent() {
  const { landingPage, orderedSections, loading, error } = useLandingPage();

  useEffect(() => {
    const brandIdentity = getPortalBranding({ platform: true });
    applyDocumentBranding({
      title: 'EMATIX | College Management System',
      iconSrc: brandIdentity.iconSrc,
      initial: brandIdentity.initial,
      primaryColor: '#2D56C5',
    });
  }, []);

  if (loading) {
    return <LandingPageSkeleton />;
  }

  if (error || !landingPage) {
    return (
      <div className="public-page">
        <div className="public-panel max-w-3xl">
          <p className="institution-tag">Landing Page</p>
          <h1 className="mt-4 text-3xl font-semibold text-text-primary">EMATIX page is not available right now.</h1>
          <p className="mt-4 text-sm leading-7 text-text-secondary">
            {error || 'The landing page configuration could not be loaded at the moment.'}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to="/trial" className="btn-primary px-5 py-3">Start Free Trial</Link>
            <Link to="/admin/login" className="btn-secondary px-5 py-3">Institution Login</Link>
          </div>
        </div>
      </div>
    );
  }

  const normalizedLandingPage = polishLandingCopy(landingPage);
  const normalizedSections = orderedSections.map(section => ({
    ...section,
    data: polishLandingCopy(section.data),
  }));
  const visibleSectionKeys = normalizedSections.map(section => section.key);
  const whatsappNumber = String(
    normalizedLandingPage?.contact?.whatsappNumber || normalizedLandingPage?.contact?.phone || ''
  ).replace(/\D/g, '');
  const whatsappMessage = encodeURIComponent(
    normalizedLandingPage?.contact?.whatsappMessage ||
      'Hello EMATIX, I would like to know more about your college management system.'
  );
  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${whatsappMessage}` : null;
  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-light-bg">
      <LandingHeader hero={normalizedLandingPage.hero} visibleSectionKeys={visibleSectionKeys} />
      <main>
        {normalizedSections.map(section => {
          const SectionComponent = SECTION_COMPONENTS[section.key];
          if (!SectionComponent) return null;
          return <SectionComponent key={section.key} data={section.data} />;
        })}
      </main>
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-center gap-3 sm:bottom-6 sm:right-6">
        <button
          type="button"
          onClick={handleBackToTop}
          className="inline-flex h-11 w-11 items-center justify-center border border-border bg-white text-text-primary shadow-[0_16px_32px_rgba(15,23,42,0.16)] transition-all hover:-translate-y-1 hover:border-primary-600 hover:bg-primary-600 hover:text-white sm:h-12 sm:w-12"
          aria-label="Back to top"
          title="Back to top"
        >
          <FiArrowUp className="h-5 w-5" />
        </button>
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            aria-label="Chat with EMATIX on WhatsApp"
            title="Chat with EMATIX on WhatsApp"
            className="inline-flex h-14 w-14 items-center justify-center transition-transform hover:-translate-y-1 sm:h-16 sm:w-16"
          >
            <img src={whatsappIcon} alt="WhatsApp" className="h-full w-full object-contain" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <LandingPageProvider>
      <LandingPageContent />
    </LandingPageProvider>
  );
}
