import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

// Redirects old institution portal aliases to the current canonical portal URL.
export default function useCanonicalPortalRedirect(scopedPortalKey, targetPath) {
  const navigate = useNavigate();
  const [resolvingPortal, setResolvingPortal] = useState(Boolean(scopedPortalKey));

  useEffect(() => {
    let active = true;

    const resolvePortal = async () => {
      const requestedKey = String(scopedPortalKey || '').trim().toLowerCase();
      if (!requestedKey) {
        if (active) {
          setResolvingPortal(false);
        }
        return;
      }

      try {
        const response = await api.get(`/saas/tenant/${encodeURIComponent(requestedKey)}`, {
          params: { _ts: Date.now() },
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        });
        const canonicalPortalKey = String(response.data?.institution?.portalKey || '').trim().toLowerCase();

        if (active && canonicalPortalKey && canonicalPortalKey !== requestedKey) {
          navigate(`/${canonicalPortalKey}${targetPath}`, { replace: true });
          return;
        }
      } catch {
        // Let the page render normally when the institution cannot be resolved.
      } finally {
        if (active) {
          setResolvingPortal(false);
        }
      }
    };

    resolvePortal();
    return () => {
      active = false;
    };
  }, [navigate, scopedPortalKey, targetPath]);

  return resolvingPortal;
}
