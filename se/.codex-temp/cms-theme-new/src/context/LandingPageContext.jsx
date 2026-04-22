import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { normalizeLandingPagePayload } from '../utils/landingPage';

const LandingPageContext = createContext(null);

export function LandingPageProvider({ children }) {
  const [landingPage, setLandingPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadLandingPage = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/platform/landing-page', {
          params: { _ts: Date.now() },
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        });
        if (!active) return;
        setLandingPage(normalizeLandingPagePayload(response.data));
      } catch (loadError) {
        if (!active) return;
        setError(loadError?.response?.data?.message || 'Unable to load landing page');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadLandingPage();
    return () => {
      active = false;
    };
  }, []);

  const orderedSections = useMemo(() => {
    if (!landingPage) return [];
    return (landingPage.sectionOrder || [])
      .filter(sectionKey => landingPage.sectionVisibility?.[sectionKey] !== false)
      .map(sectionKey => ({
        key: sectionKey,
        data: landingPage[sectionKey] || null,
      }));
  }, [landingPage]);

  const value = useMemo(() => ({
    landingPage,
    orderedSections,
    loading,
    error,
  }), [error, landingPage, loading, orderedSections]);

  return (
    <LandingPageContext.Provider value={value}>
      {children}
    </LandingPageContext.Provider>
  );
}

export const useLandingPage = () => useContext(LandingPageContext);

export default LandingPageContext;
