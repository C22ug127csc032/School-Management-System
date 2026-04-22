import Period from '../models/Period.model.js';

export const getActivePeriodsForDisplay = async (academicYear, extraFilter = {}) => {
  const requestedPeriods = await Period.find({
    academicYear,
    isActive: true,
    ...extraFilter,
  }).sort({ periodNo: 1 });

  if (requestedPeriods.length > 0) {
    return requestedPeriods;
  }

  const latestPeriod = await Period.findOne({
    isActive: true,
    ...extraFilter,
  }).sort({ academicYear: -1, periodNo: -1 });

  if (!latestPeriod) {
    return [];
  }

  return Period.find({
    academicYear: latestPeriod.academicYear,
    isActive: true,
    ...extraFilter,
  }).sort({ periodNo: 1 });
};
