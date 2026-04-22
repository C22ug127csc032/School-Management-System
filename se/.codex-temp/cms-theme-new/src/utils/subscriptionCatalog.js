export const FEATURE_OPTIONS = [
  { key: 'student_management', label: 'Student Management', description: 'Admissions, student records, and lifecycle workflows.' },
  { key: 'academic', label: 'Academic', description: 'Courses, class structure, and academic setup.' },
  { key: 'staff_roles', label: 'Staff & Roles', description: 'Staff accounts, role controls, and admin permissions.' },
  { key: 'parent_portal', label: 'Parent Portal', description: 'Parent login, fee visibility, and student follow-up.' },
  { key: 'student_portal', label: 'Student Portal', description: 'Student self-service dashboard and profile access.' },
  { key: 'finance', label: 'Finance', description: 'Fee setup, fee assignment, payments, and due management.' },
  { key: 'online_payments', label: 'Online Payments', description: 'Online payment collection for fees and subscriptions.' },
  { key: 'ledger', label: 'Ledger', description: 'Transaction ledger, payment history, and account tracking.' },
  { key: 'wallet', label: 'Wallet', description: 'Student and parent wallet balances and top-ups.' },
  { key: 'hostel_leave', label: 'Hostel Leave', description: 'Leave and outpass management for hostel and campus movement.' },
  { key: 'hostel_checkin', label: 'Hostel Check-In', description: 'Check-in and check-out monitoring.' },
  { key: 'library', label: 'Library', description: 'Books, issue/return, fines, and library operations.' },
  { key: 'inventory', label: 'Inventory', description: 'Inventory stock, item control, and supply monitoring.' },
  { key: 'expense', label: 'Expense', description: 'Expense entry and finance-side operational tracking.' },
  { key: 'circulars_notifications', label: 'Circulars & Notifications', description: 'Notices, circulars, and internal alerts.' },
  { key: 'sms_notifications', label: 'SMS Notifications', description: 'SMS notifications for institutions using messaging workflows.' },
  { key: 'commerce_pos', label: 'Commerce POS', description: 'Shop, canteen, and operator billing workflows.' },
  { key: 'reports', label: 'Reports', description: 'Dashboard analytics and operational reports.' },
  { key: 'settings', label: 'Settings', description: 'Dynamic masters, preferences, and access policies.' },
  { key: 'white_label', label: 'White Label', description: 'Institution-specific branding controls.' },
];

export const FEATURE_LABEL_MAP = Object.fromEntries(
  FEATURE_OPTIONS.map(feature => [feature.key, feature.label])
);

export const PLAN_CATALOG = [
  {
    key: 'starter',
    label: 'Starter',
    priceLabel: 'Free',
    limits: { students: 30, staffAccounts: 1, operatorAccounts: 0 },
    features: ['student_management', 'academic', 'staff_roles', 'student_portal', 'circulars_notifications', 'settings'],
  },
  {
    key: 'basic',
    label: 'Basic',
    priceLabel: 'Rs. 2,499 / month',
    limits: { students: 300, staffAccounts: 3, operatorAccounts: 0 },
    features: ['student_management', 'academic', 'staff_roles', 'parent_portal', 'student_portal', 'finance', 'online_payments', 'ledger', 'circulars_notifications', 'settings'],
  },
  {
    key: 'standard',
    label: 'Standard',
    priceLabel: 'Rs. 7,999 / month',
    limits: { students: 1500, staffAccounts: 10, operatorAccounts: 2 },
    features: ['student_management', 'academic', 'staff_roles', 'parent_portal', 'student_portal', 'finance', 'online_payments', 'ledger', 'wallet', 'hostel_leave', 'hostel_checkin', 'library', 'circulars_notifications', 'sms_notifications', 'settings'],
  },
  {
    key: 'premium',
    label: 'Premium',
    priceLabel: 'Rs. 19,999 / month',
    limits: { students: 5000, staffAccounts: 25, operatorAccounts: 10 },
    features: ['student_management', 'academic', 'staff_roles', 'parent_portal', 'student_portal', 'finance', 'online_payments', 'ledger', 'wallet', 'hostel_leave', 'hostel_checkin', 'library', 'inventory', 'expense', 'circulars_notifications', 'sms_notifications', 'commerce_pos', 'reports', 'settings'],
  },
  {
    key: 'enterprise',
    label: 'Enterprise',
    priceLabel: 'Custom Quote',
    limits: { students: null, staffAccounts: null, operatorAccounts: null },
    features: FEATURE_OPTIONS.map(feature => feature.key),
  },
];

export const PLAN_SEQUENCE = PLAN_CATALOG.map(plan => plan.key);

export const SUBSCRIPTION_STATUS_LABELS = {
  trialing: 'Trialing',
  active: 'Active',
  overdue: 'Overdue',
  suspended: 'Suspended',
  cancelled: 'Cancelled',
};

export const BILLING_STATUS_LABELS = {
  pending: 'Pending Confirmation',
  paid: 'Paid',
  failed: 'Payment Failed',
  cancelled: 'Cancelled',
  licensed: 'Enterprise Licensed',
};

export const ENTERPRISE_LICENSE_STATUS_LABELS = {
  not_issued: 'Not Issued',
  issued: 'Issued',
  redeemed: 'Redeemed',
  expired: 'Expired',
};

export const getPlanRank = planKey => {
  const rank = PLAN_SEQUENCE.indexOf(String(planKey || '').toLowerCase());
  return rank === -1 ? 0 : rank;
};

export const canUpgradeToPlan = (currentPlanKey, requestedPlanKey) =>
  getPlanRank(requestedPlanKey) > getPlanRank(currentPlanKey);

export const getPlanDefinition = planKey =>
  PLAN_CATALOG.find(plan => plan.key === String(planKey || '').toLowerCase()) || PLAN_CATALOG[0];

export const getSubscriptionStatusLabel = status =>
  SUBSCRIPTION_STATUS_LABELS[String(status || '').toLowerCase()] || 'Not Set';

export const getBillingStatusLabel = status =>
  BILLING_STATUS_LABELS[String(status || '').toLowerCase()] || 'Not Set';

export const getEnterpriseLicenseStatusLabel = status =>
  ENTERPRISE_LICENSE_STATUS_LABELS[String(status || '').toLowerCase()] || 'Not Issued';

export default {
  FEATURE_OPTIONS,
  FEATURE_LABEL_MAP,
  PLAN_CATALOG,
  PLAN_SEQUENCE,
  SUBSCRIPTION_STATUS_LABELS,
  BILLING_STATUS_LABELS,
  ENTERPRISE_LICENSE_STATUS_LABELS,
  canUpgradeToPlan,
  getBillingStatusLabel,
  getEnterpriseLicenseStatusLabel,
  getPlanDefinition,
  getPlanRank,
  getSubscriptionStatusLabel,
};
