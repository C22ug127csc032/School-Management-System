import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function usePortalInstitution(portalKey) {
  const [institution, setInstitution] = useState(null);

  useEffect(() => {
    let active = true;

    const loadInstitution = async () => {
      const key = String(portalKey || '').trim().toLowerCase();
      if (!key) {
        if (active) {
          setInstitution(null);
        }
        return;
      }

      try {
        const response = await api.get(`/saas/tenant/${encodeURIComponent(key)}`, {
          params: { _ts: Date.now() },
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        });
        if (active) {
          setInstitution(response.data?.institution || null);
        }
      } catch {
        if (active) {
          setInstitution(null);
        }
      }
    };

    loadInstitution();
    return () => {
      active = false;
    };
  }, [portalKey]);

  return institution;
}
