export const FEE_HEAD_APPLICABILITY = {
  ALL: 'all',
  HOSTELER: 'hosteler',
  DAYSCHOLAR: 'dayscholar',
};

export const FEE_HEAD_APPLICABILITY_LABELS = {
  [FEE_HEAD_APPLICABILITY.ALL]: 'All Students',
  [FEE_HEAD_APPLICABILITY.HOSTELER]: 'Hostel Students',
  [FEE_HEAD_APPLICABILITY.DAYSCHOLAR]: 'Day Scholars',
};

export const DEFAULT_CATEGORY_FEE_HEADS = [
  {
    headName: 'Hostel Fee',
    amount: '',
    applicableTo: FEE_HEAD_APPLICABILITY.HOSTELER,
  },
  {
    headName: 'Bus Fee',
    amount: '',
    applicableTo: FEE_HEAD_APPLICABILITY.DAYSCHOLAR,
  },
];

const normalizeApplicability = value => (
  Object.values(FEE_HEAD_APPLICABILITY).includes(value) ? value : FEE_HEAD_APPLICABILITY.ALL
);

export const sanitizeFeeHead = head => ({
  headName: String(head?.headName || '').trim(),
  amount: Number(head?.amount) || 0,
  applicableTo: normalizeApplicability(head?.applicableTo),
});

export const getStructureTotals = feeHeads => {
  const normalizedHeads = (Array.isArray(feeHeads) ? feeHeads : []).map(sanitizeFeeHead).filter(head => head.headName);

  return normalizedHeads.reduce((totals, head) => {
    if (head.applicableTo === FEE_HEAD_APPLICABILITY.ALL) {
      totals.commonTotal += head.amount;
      totals.dayScholarTotal += head.amount;
      totals.hostellerTotal += head.amount;
    } else if (head.applicableTo === FEE_HEAD_APPLICABILITY.DAYSCHOLAR) {
      totals.dayScholarTotal += head.amount;
      totals.hasCategorySpecificHeads = true;
    } else if (head.applicableTo === FEE_HEAD_APPLICABILITY.HOSTELER) {
      totals.hostellerTotal += head.amount;
      totals.hasCategorySpecificHeads = true;
    }

    totals.fullConfiguredTotal += head.amount;
    return totals;
  }, {
    commonTotal: 0,
    dayScholarTotal: 0,
    hostellerTotal: 0,
    fullConfiguredTotal: 0,
    hasCategorySpecificHeads: false,
  });
};

export const getStudentSpecificStructureTotal = (feeHeads, isHosteler) => {
  const totals = getStructureTotals(feeHeads);
  return isHosteler ? totals.hostellerTotal : totals.dayScholarTotal;
};
