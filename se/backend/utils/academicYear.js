export const getDefaultAcademicYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  const endShort = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}-${endShort}`;
};

export const resolveAcademicYear = (value) => value || getDefaultAcademicYear();

export const parseAcademicYear = (ay) => {
  const [start] = ay.split('-');
  return { startYear: parseInt(start), endYear: parseInt(start) + 1 };
};
