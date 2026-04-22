import { useEffect, useState } from 'react';
import api from '../api/axios.js';

const ACADEMIC_YEAR_STORAGE_KEY = 'erp_current_academic_year';

export function getDefaultAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  const endShort = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}-${endShort}`;
}

export function getStoredAcademicYear() {
  return localStorage.getItem(ACADEMIC_YEAR_STORAGE_KEY) || '';
}

export function setStoredAcademicYear(value) {
  if (!value) {
    localStorage.removeItem(ACADEMIC_YEAR_STORAGE_KEY);
    return;
  }
  localStorage.setItem(ACADEMIC_YEAR_STORAGE_KEY, value);
}

export default function useAcademicYear() {
  const [academicYear, setAcademicYear] = useState(() => getStoredAcademicYear() || getDefaultAcademicYear());

  useEffect(() => {
    let active = true;

    api.get('/settings')
      .then(response => {
        const nextYear = response.data?.settings?.currentAcademicYear || getDefaultAcademicYear();
        setStoredAcademicYear(nextYear);
        if (active) setAcademicYear(nextYear);
      })
      .catch(() => {
        const fallbackYear = getStoredAcademicYear() || getDefaultAcademicYear();
        if (active) setAcademicYear(fallbackYear);
      });

    return () => {
      active = false;
    };
  }, []);

  return academicYear;
}
