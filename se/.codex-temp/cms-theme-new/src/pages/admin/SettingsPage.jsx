import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useBeforeUnload, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import { EmptyState, PageHeader, PageSpinner } from '../../components/common';
import {
  FiBarChart2,
  FiBell,
  FiCheckCircle,
  FiClipboard,
  FiDollarSign,
  FiHome,
  FiShield,
  FiUsers,
} from '../../components/common/icons';
import { useAppSettings } from '../../context/AppSettingsContext';

const MASTER_GROUP_MAP = {
  student_admission_types: { title: 'Admission Types', description: 'Quota and admission source options used in student admission.' },
  student_roll_number_formats: { title: 'Roll Number Format', description: 'Choose the pattern used when roll numbers are generated.' },
  student_genders: { title: 'Student Genders', description: 'Gender choices used in student forms and records.' },
  student_blood_groups: { title: 'Blood Groups', description: 'Blood group values available in the student profile.' },
  student_categories: { title: 'Student Categories', description: 'Community and reservation category values.' },
  student_annual_income_ranges: { title: 'Annual Income Ranges', description: 'Income slabs available in student and scholarship data.' },
  finance_payment_modes: { title: 'Finance Payment Modes', description: 'Payment modes for fees and finance records.' },
  expense_categories: { title: 'Expense Categories', description: 'Expense classification options for accounting.' },
  expense_payment_modes: { title: 'Expense Payment Modes', description: 'Payment modes for expense entries.' },
  leave_types: { title: 'Leave Types', description: 'Leave reasons used in parent and student leave requests.' },
  inventory_categories: { title: 'Inventory Categories', description: 'Stock and inventory categories for storekeeping modules.' },
  circular_types: { title: 'Circular Types', description: 'Circular and announcement classifications.' },
  circular_audiences: { title: 'Circular Audiences', description: 'Who receives circulars and notifications.' },
  checkin_types: { title: 'Check In Types', description: 'Movement record type options.' },
  checkin_locations: { title: 'Check In Locations', description: 'Location options used in attendance and movement records.' },
  parent_relations: { title: 'Parent Relations', description: 'Available parent and guardian relationship options.' },
};

const PREFERENCE_CONFIG = {
  library_fine_per_day: {
    title: 'Library Fine Per Day',
    description: 'Daily overdue fine charged per book for this institution.',
    sectionKey: 'campus',
    fieldLabel: 'Amount In Rupees',
    min: 0,
    step: 1,
  },
  fee_due_reminder_days_before: {
    title: 'Fee Reminder Lead Time',
    description: 'How many days before the due date the fee reminder should be sent.',
    sectionKey: 'finance',
    fieldLabel: 'Days Before Due Date',
    min: 0,
    step: 1,
  },
};

const SECTION_CONFIG = [
  {
    key: 'students',
    title: 'Students',
    description: 'Admissions, profile data, and student workflows.',
    icon: FiUsers,
    masters: ['student_admission_types', 'student_roll_number_formats', 'student_genders', 'student_blood_groups', 'student_categories', 'student_annual_income_ranges'],
    capabilityGroups: [
      {
        title: 'Student Operations Access',
        description: 'Choose which roles can manage student records and academic setup.',
        items: [
          { key: 'admin_dashboard', label: 'Admin Dashboard' },
          { key: 'admin_students_view', label: 'View Students' },
          { key: 'admin_students_create', label: 'Create Students' },
          { key: 'admin_students_edit', label: 'Edit Students' },
          { key: 'admin_students_deactivate', label: 'Deactivate Students' },
          { key: 'admin_students_promote', label: 'Promote Students' },
          { key: 'admin_roll_numbers_generate', label: 'Generate Roll Numbers' },
          { key: 'admin_courses_manage', label: 'Manage Courses' },
        ],
      },
    ],
  },
  {
    key: 'finance',
    title: 'Finance',
    description: 'Fees, payments, expense masters, and financial controls.',
    icon: FiDollarSign,
    masters: ['finance_payment_modes', 'expense_categories', 'expense_payment_modes'],
    capabilityGroups: [
      {
        title: 'Finance Access',
        description: 'Control who can work with structures, dues, payments, and expense entries.',
        items: [
          { key: 'admin_fee_structure_manage', label: 'Manage Fee Structures' },
          { key: 'admin_fee_assign', label: 'Assign Fees' },
          { key: 'admin_fees_list_view', label: 'View Fees List' },
          { key: 'admin_payments_view', label: 'View Payments' },
          { key: 'admin_expense_manage', label: 'Manage Expenses' },
        ],
      },
    ],
  },
  {
    key: 'campus',
    title: 'Campus Operations',
    description: 'Hostel, library, inventory, and movement-related settings.',
    icon: FiHome,
    masters: ['leave_types', 'inventory_categories', 'checkin_types', 'checkin_locations'],
    capabilityGroups: [
      {
        title: 'Hostel and Movement',
        description: 'Review flows for day scholars through class advisors and hostel students through wardens.',
        items: [
          { key: 'admin_leave_manage', label: 'Review Leave Requests' },
          { key: 'admin_outpass_manage', label: 'Review Outpass Requests' },
          { key: 'admin_checkin_manage', label: 'Manage Check In / Out' },
        ],
      },
      {
        title: 'Library and Inventory',
        description: 'Permissions for campus resource management modules.',
        items: [
          { key: 'admin_inventory_manage', label: 'Manage Inventory' },
          { key: 'admin_library_manage', label: 'Manage Library' },
          { key: 'admin_library_dashboard', label: 'Library Dashboard' },
          { key: 'admin_hostel_dashboard', label: 'Hostel Dashboard' },
        ],
      },
    ],
  },
  {
    key: 'communication',
    title: 'Communication',
    description: 'Circular, audience, and parent-facing master data.',
    icon: FiBell,
    masters: ['circular_types', 'circular_audiences', 'parent_relations'],
    capabilityGroups: [
      {
        title: 'Communication Access',
        description: 'Control who can publish announcements and read system notifications.',
        items: [
          { key: 'admin_circular_manage', label: 'Manage Circulars' },
          { key: 'admin_notifications_view', label: 'View Notifications' },
        ],
      },
    ],
  },
  {
    key: 'reports',
    title: 'Reports',
    description: 'Control who can open reports and which report tabs are available.',
    icon: FiBarChart2,
    masters: [],
    capabilityGroups: [
      {
        title: 'Reports Workspace',
        description: 'Control entry to the reports area.',
        items: [{ key: 'admin_reports_view', label: 'Open Reports Page' }],
      },
      {
        title: 'Report Tabs',
        description: 'Turn individual report tabs on or off for each staff role.',
        items: [
          { key: 'admin_reports_tab_overview', label: 'Overview Tab' },
          { key: 'admin_reports_tab_fees', label: 'Fees Tab' },
          { key: 'admin_reports_tab_payments', label: 'Payments Tab' },
          { key: 'admin_reports_tab_expenses', label: 'Expenses Tab' },
          { key: 'admin_reports_tab_inventory', label: 'Inventory Tab' },
          { key: 'admin_reports_tab_library', label: 'Library Tab' },
          { key: 'admin_reports_tab_shop', label: 'Shop & Canteen Tab' },
          { key: 'admin_reports_tab_attendance', label: 'Attendance Tab' },
        ],
      },
    ],
  },
  {
    key: 'system',
    title: 'System & Operators',
    description: 'Staff, settings, and commerce-operator workspace controls.',
    icon: FiShield,
    masters: [],
    capabilityGroups: [
      {
        title: 'System Access',
        description: 'Permissions for the internal admin-control workspace.',
        items: [
          { key: 'admin_staff_manage', label: 'Manage Staff' },
          { key: 'admin_settings_manage', label: 'Manage Settings' },
        ],
      },
      {
        title: 'Operator Access',
        description: 'Control the shop, canteen, and shop-canteen operator admin workspace.',
        items: [
          { key: 'operator_dashboard_view', label: 'Operator Admin Dashboard' },
          { key: 'operator_shop_view', label: 'Shop Counter Access' },
          { key: 'operator_canteen_view', label: 'Canteen Counter Access' },
          { key: 'operator_reports_view', label: 'Operator Reports' },
        ],
      },
    ],
  },
];

const normalizeOptionLabel = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const slugifyOptionValue = value => String(value || '').trim().toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/_+/g, '_');
const SINGLE_ACTIVE_MASTER_GROUPS = new Set(['student_roll_number_formats']);
const PRESET_MASTER_GROUPS = new Set(['student_roll_number_formats']);
const PRESET_MASTER_OPTIONS = {
  student_roll_number_formats: [
    { value: 'yy_code_serial', label: '26BCA001 - Year + Course + Serial', isActive: true },
    { value: 'code_yy_serial', label: 'BCA26001 - Course + Year + Serial', isActive: false },
    { value: 'code_dash_yy_dash_serial', label: 'BCA-26-001 - Course / Year / Serial', isActive: false },
    { value: 'yy_dash_code_dash_serial', label: '26-BCA-001 - Year / Course / Serial', isActive: false },
  ],
};
const REQUIRED_CAPABILITY_ROLES = {
  admin_leave_manage: ['class_teacher', 'hostel_warden'],
  admin_outpass_manage: ['class_teacher', 'hostel_warden'],
};
const createDraftOption = (option = {}, index = 0, autoValue = false) => ({ value: String(option?.value || '').trim(), label: String(option?.label || '').trim(), isActive: option?.isActive !== false, sortOrder: Number(option?.sortOrder || index + 1), _autoValue: autoValue });
const hydrateMasterDrafts = masters => Object.fromEntries(Object.entries(masters || {}).map(([groupKey, options]) => [groupKey, (Array.isArray(options) ? options : []).map((option, index) => createDraftOption(option, index, false))]));
const createEmptyOption = nextIndex => ({ value: '', label: '', isActive: true, sortOrder: nextIndex, _autoValue: true });
const normalizeDraftOptions = options => (Array.isArray(options) ? options : []).map((option, index) => ({
  label: String(option?.label || '').trim(),
  value: String(option?.value || slugifyOptionValue(option?.label)).trim(),
  isActive: option?.isActive !== false,
  sortOrder: index + 1,
}));
const serializeOptions = options => JSON.stringify(normalizeDraftOptions(options));
const normalizeRoles = roles => [...new Set((Array.isArray(roles) ? roles : []).map(role => String(role || '').trim()).filter(Boolean))].sort();
const getCompatibleRoleTypes = capabilityKey =>
  String(capabilityKey || '').startsWith('operator_')
    ? new Set(['operator'])
    : new Set(['admin', 'staff']);
const getRequiredCapabilityRoles = capabilityKey => REQUIRED_CAPABILITY_ROLES[capabilityKey] || [];
const normalizeCapabilityRoles = (capabilityKey, roles) =>
  [...new Set([...normalizeRoles(roles), ...getRequiredCapabilityRoles(capabilityKey)])].sort();
const roleTypeStyles = {
  admin: 'border-primary-200 bg-primary-50 text-primary-700',
  staff: 'border-border bg-white text-text-secondary',
  operator: 'border-amber-200 bg-amber-50 text-amber-700',
};
const roleTypeLabels = { admin: 'Admin', staff: 'Staff', operator: 'Operator' };
const APP_SETTINGS_SYNC_KEY = 'appSettingsSyncVersion';

export default function SettingsPage() {
  const { settings, loading, roleDefinitions, refreshSettings } = useAppSettings();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState(SECTION_CONFIG[0].key);
  const [masterDrafts, setMasterDrafts] = useState({});
  const [capabilityDrafts, setCapabilityDrafts] = useState({});
  const [preferenceDrafts, setPreferenceDrafts] = useState({});
  const [savingMasterKey, setSavingMasterKey] = useState('');
  const [savingCapabilitySection, setSavingCapabilitySection] = useState('');
  const [savingPreferenceKey, setSavingPreferenceKey] = useState('');

  useEffect(() => {
    setMasterDrafts(hydrateMasterDrafts(settings.masters || {}));
    setCapabilityDrafts(
      Object.fromEntries(
        Object.entries(settings.capabilities || {}).map(([capabilityKey, roles]) => [
          capabilityKey,
          normalizeCapabilityRoles(capabilityKey, roles),
        ])
      )
    );
    setPreferenceDrafts(settings.preferences || {});
  }, [settings]);

  const visibleRoles = useMemo(() => (roleDefinitions || []).filter(role => role.value !== 'student' && role.value !== 'parent'), [roleDefinitions]);

  const roleLegend = useMemo(() => Object.keys(roleTypeLabels).map(type => ({
    type,
    label: roleTypeLabels[type],
    count: visibleRoles.filter(role => role.type === type).length,
  })), [visibleRoles]);

  const sectionMap = useMemo(() => Object.fromEntries(SECTION_CONFIG.map(section => [section.key, section])), []);
  const currentSection = sectionMap[activeSection] || SECTION_CONFIG[0];

  const dirtyMasterGroups = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(settings.masters || {}).map(groupKey => [
          groupKey,
          serializeOptions(masterDrafts[groupKey] || []) !== serializeOptions(settings.masters?.[groupKey] || []),
        ])
      ),
    [masterDrafts, settings.masters]
  );

  const masterGroupNewCounts = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(settings.masters || {}).map(groupKey => {
          const baselineSignatures = new Set(
            normalizeDraftOptions(settings.masters?.[groupKey] || []).map(
              option => `${normalizeOptionLabel(option.label)}::${normalizeOptionLabel(option.value)}`
            )
          );

          const newCount = normalizeDraftOptions(masterDrafts[groupKey] || []).filter(option => {
            if (!option.label || !option.value) return false;
            const signature = `${normalizeOptionLabel(option.label)}::${normalizeOptionLabel(option.value)}`;
            return !baselineSignatures.has(signature);
          }).length;

          return [groupKey, newCount];
        })
      ),
    [masterDrafts, settings.masters]
  );

  const dirtyCapabilityKeys = useMemo(
    () =>
      Object.fromEntries(
      Object.keys(settings.capabilities || {}).map(capabilityKey => [
        capabilityKey,
          JSON.stringify(normalizeCapabilityRoles(capabilityKey, capabilityDrafts[capabilityKey])) !== JSON.stringify(normalizeCapabilityRoles(capabilityKey, settings.capabilities?.[capabilityKey] || [])),
        ])
      ),
    [capabilityDrafts, settings.capabilities]
  );

  const dirtyPreferenceKeys = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(PREFERENCE_CONFIG).map(preferenceKey => [
          preferenceKey,
          String(preferenceDrafts[preferenceKey] ?? '') !== String(settings.preferences?.[preferenceKey] ?? ''),
        ])
      ),
    [preferenceDrafts, settings.preferences]
  );

  const dirtySections = useMemo(
    () =>
      Object.fromEntries(
        SECTION_CONFIG.map(section => {
          const hasMasterChanges = section.masters.some(groupKey => dirtyMasterGroups[groupKey]);
          const hasCapabilityChanges = section.capabilityGroups.some(group =>
            group.items.some(item => dirtyCapabilityKeys[item.key])
          );
          const hasPreferenceChanges = Object.entries(PREFERENCE_CONFIG).some(
            ([preferenceKey, config]) => config.sectionKey === section.key && dirtyPreferenceKeys[preferenceKey]
          );
          return [section.key, hasMasterChanges || hasCapabilityChanges || hasPreferenceChanges];
        })
      ),
    [dirtyCapabilityKeys, dirtyMasterGroups, dirtyPreferenceKeys]
  );

  const hasUnsavedChanges = useMemo(
    () => Object.values(dirtySections).some(Boolean),
    [dirtySections]
  );

  const updateMasterOption = (groupKey, index, field, value) => {
    setMasterDrafts(current => ({
      ...current,
      [groupKey]: (current[groupKey] || []).map((option, optionIndex) => {
        if (optionIndex !== index) return option;
        if (field === 'label') return { ...option, label: value, value: option._autoValue ? slugifyOptionValue(value) : option.value };
        if (field === 'value') return { ...option, value, _autoValue: false };
        if (field === 'isActive' && SINGLE_ACTIVE_MASTER_GROUPS.has(groupKey)) {
          return { ...option, isActive: true };
        }
        return { ...option, [field]: value };
      }).map((option, optionIndex) => (
        field === 'isActive' && SINGLE_ACTIVE_MASTER_GROUPS.has(groupKey)
          ? { ...option, isActive: optionIndex === index }
          : option
      )),
    }));
  };

  const addMasterOption = groupKey => {
    if (PRESET_MASTER_GROUPS.has(groupKey)) {
      const presetOptions = PRESET_MASTER_OPTIONS[groupKey] || [];
      const currentSignatures = new Set(
        (masterDrafts[groupKey] || []).map(option => `${normalizeOptionLabel(option.label)}::${normalizeOptionLabel(option.value)}`)
      );
      const nextPreset = presetOptions.find(option => {
        const signature = `${normalizeOptionLabel(option.label)}::${normalizeOptionLabel(option.value)}`;
        return !currentSignatures.has(signature);
      });

      if (!nextPreset) {
        toast.error('All supported format options are already added');
        return;
      }

      setMasterDrafts(current => {
        const currentOptions = current[groupKey] || [];
        const hasActive = currentOptions.some(option => option.isActive !== false);
        return {
          ...current,
          [groupKey]: [
            ...currentOptions,
            createDraftOption(
              {
                ...nextPreset,
                isActive: SINGLE_ACTIVE_MASTER_GROUPS.has(groupKey)
                  ? !hasActive
                  : nextPreset.isActive !== false,
              },
              currentOptions.length,
              false
            ),
          ],
        };
      });
      return;
    }

    setMasterDrafts(current => ({
      ...current,
      [groupKey]: [...(current[groupKey] || []), createEmptyOption((current[groupKey] || []).length + 1)],
    }));
  };

  const removeMasterOption = (groupKey, index) => {
    setMasterDrafts(current => ({
      ...current,
      [groupKey]: (current[groupKey] || []).filter((_, optionIndex) => optionIndex !== index).map((option, optionIndex) => ({ ...option, sortOrder: optionIndex + 1 })),
    }));
  };

  const validateMasterGroup = groupKey => {
    const options = (masterDrafts[groupKey] || []).map((option, index) => ({
      label: String(option.label || '').trim(),
      value: String(option.value || slugifyOptionValue(option.label)).trim(),
      isActive: option.isActive !== false,
      sortOrder: index + 1,
    }));
    if (!options.length) {
      toast.error('Add at least one option before saving this group');
      return null;
    }

    if (SINGLE_ACTIVE_MASTER_GROUPS.has(groupKey)) {
      const activeCount = options.filter(option => option.isActive !== false).length;
      if (activeCount !== 1) {
        toast.error('Select exactly one active option for this group');
        return null;
      }
    }

    const seenLabels = new Set();
    const seenValues = new Set();
    for (const option of options) {
      if (!option.label) {
        toast.error('Every option needs a display label');
        return null;
      }
      if (!option.value) {
        toast.error('One of the options could not be prepared. Please update the label and try again.');
        return null;
      }
      const normalizedLabel = normalizeOptionLabel(option.label);
      const normalizedValue = normalizeOptionLabel(option.value);
      if (seenLabels.has(normalizedLabel)) {
        toast.error(`Duplicate label found: ${option.label}`);
        return null;
      }
      if (seenValues.has(normalizedValue)) {
        toast.error(`An option named ${option.label} already exists`);
        return null;
      }
      seenLabels.add(normalizedLabel);
      seenValues.add(normalizedValue);
    }

    return options;
  };

  const saveMasterGroup = async groupKey => {
    const options = validateMasterGroup(groupKey);
    if (!options) return;
    setSavingMasterKey(groupKey);
    try {
      await api.put(`/settings/masters/${groupKey}`, { options });
      await refreshSettings();
      const syncStamp = String(Date.now());
      localStorage.setItem(APP_SETTINGS_SYNC_KEY, syncStamp);
      window.dispatchEvent(new Event('app-settings-updated'));
      toast.success('Section options updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSavingMasterKey('');
    }
  };

  const toggleCapability = (capabilityKey, roleValue) => {
    if (getRequiredCapabilityRoles(capabilityKey).includes(roleValue)) return;
    setCapabilityDrafts(current => {
      const roles = Array.isArray(current[capabilityKey]) ? current[capabilityKey] : [];
      const nextRoles = roles.includes(roleValue) ? roles.filter(role => role !== roleValue) : [...roles, roleValue];
      return { ...current, [capabilityKey]: normalizeCapabilityRoles(capabilityKey, nextRoles) };
    });
  };

  const saveCapabilitySection = async sectionKey => {
    const section = sectionMap[sectionKey];
    if (!section) return;
    const patch = {};
    section.capabilityGroups.forEach(group => {
      group.items.forEach(item => {
        patch[item.key] = normalizeCapabilityRoles(item.key, capabilityDrafts[item.key] || []);
      });
    });
    setSavingCapabilitySection(sectionKey);
    try {
      await api.put('/settings/capabilities', { capabilities: patch });
      await refreshSettings();
      const syncStamp = String(Date.now());
      localStorage.setItem(APP_SETTINGS_SYNC_KEY, syncStamp);
      window.dispatchEvent(new Event('app-settings-updated'));
      toast.success('Access policies updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save access policies');
    } finally {
      setSavingCapabilitySection('');
    }
  };

  const savePreference = async preferenceKey => {
    const config = PREFERENCE_CONFIG[preferenceKey];
    if (!config) return;

    const numericValue = Number(preferenceDrafts[preferenceKey]);
    if (!Number.isFinite(numericValue) || numericValue < Number(config.min || 0)) {
      toast.error(`${config.title} must be a valid non-negative number`);
      return;
    }

    setSavingPreferenceKey(preferenceKey);
    try {
      await api.put('/settings/preferences', {
        preferences: {
          [preferenceKey]: numericValue,
        },
      });
      await refreshSettings();
      const syncStamp = String(Date.now());
      localStorage.setItem(APP_SETTINGS_SYNC_KEY, syncStamp);
      window.dispatchEvent(new Event('app-settings-updated'));
      toast.success(`${config.title} updated`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save preference');
    } finally {
      setSavingPreferenceKey('');
    }
  };

  const currentSectionStats = useMemo(() => ({
    masterCount: currentSection.masters.length,
    capabilityCount: currentSection.capabilityGroups.reduce((count, group) => count + group.items.length, 0),
    preferenceCount: Object.values(PREFERENCE_CONFIG).filter(config => config.sectionKey === currentSection.key).length,
  }), [currentSection]);
  const CurrentSectionIcon = currentSection.icon;
  const currentSectionDirty = dirtySections[currentSection.key];

  useBeforeUnload(event => {
    if (!hasUnsavedChanges) return;
    event.preventDefault();
    event.returnValue = '';
  });

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;

    const handleDocumentClick = event => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;

      const anchor = event.target.closest('a[href]');
      if (!anchor) return;
      if (anchor.getAttribute('target') === '_blank') return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      const nextUrl = new URL(anchor.href, window.location.origin);
      const currentUrl = new URL(window.location.href);
      if (nextUrl.origin !== currentUrl.origin) return;

      const sameRoute =
        nextUrl.pathname === currentUrl.pathname &&
        nextUrl.search === currentUrl.search &&
        nextUrl.hash === currentUrl.hash;

      if (sameRoute) return;

      const shouldLeave = window.confirm('You have unsaved settings changes. Leave this page without saving?');
      if (!shouldLeave) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => document.removeEventListener('click', handleDocumentClick, true);
  }, [hasUnsavedChanges, location.pathname, location.search, location.hash]);

  if (loading && !Object.keys(settings.masters || {}).length && !Object.keys(settings.capabilities || {}).length) {
    return <PageSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings Center"
        subtitle="Manage dynamic options and access policies by module."
      />

      <div className="card">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-2xl text-primary-600">
              <CurrentSectionIcon />
            </div>
            <div>
              <span className="institution-tag mb-3">Current Section</span>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-text-primary">{currentSection.title}</h2>
                {currentSectionDirty ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    Unsaved changes
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-text-secondary">{currentSection.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:min-w-[360px] xl:grid-cols-4">
            <div className="rounded-xl border border-border bg-light-bg px-4 py-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Modules</p>
              <p className="mt-1 text-xl font-bold text-text-primary">{SECTION_CONFIG.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-light-bg px-4 py-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Masters</p>
              <p className="mt-1 text-xl font-bold text-text-primary">{currentSectionStats.masterCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-light-bg px-4 py-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Access</p>
              <p className="mt-1 text-xl font-bold text-text-primary">{currentSectionStats.capabilityCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-light-bg px-4 py-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Preferences</p>
              <p className="mt-1 text-xl font-bold text-text-primary">{currentSectionStats.preferenceCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {SECTION_CONFIG.map(section => {
          const Icon = section.icon;
          const isActive = activeSection === section.key;
          const capabilityCount = section.capabilityGroups.reduce((count, group) => count + group.items.length, 0);

          return (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSection(section.key)}
              className={`rounded-2xl border px-4 py-4 text-left shadow-sm transition ${isActive ? 'border-primary-500 bg-primary-500 text-white' : 'border-border bg-white text-text-primary hover:border-primary-200 hover:bg-primary-50'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${isActive ? 'bg-white/15 text-white' : 'bg-primary-50 text-primary-600'}`}>
                  <Icon />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{section.title}</p>
                    {dirtySections[section.key] ? (
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${isActive ? 'bg-white/15 text-white' : 'bg-amber-50 text-amber-700'}`}>
                        Unsaved
                      </span>
                    ) : null}
                  </div>
                  <div className={`mt-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] ${isActive ? 'text-white/80' : 'text-text-secondary'}`}>
                    <span>{section.masters.length} master groups</span>
                    <span>{capabilityCount} access rules</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-6">
        <section className="space-y-6">
          <div className="card">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                <FiClipboard />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{currentSection.title} Data Controls</h2>
                <p className="mt-1 text-sm text-text-secondary">Manage labels and active options for this module.</p>
              </div>
            </div>

            {currentSection.masters.length === 0 ? (
              <EmptyState
                message="No editable option groups in this section."
                icon={<FiCheckCircle />}
              />
            ) : (
              <div className="space-y-4">
                {Object.entries(PREFERENCE_CONFIG)
                  .filter(([, config]) => config.sectionKey === currentSection.key)
                  .map(([preferenceKey, config]) => (
                    <div key={preferenceKey} className="rounded-2xl border border-border bg-white shadow-sm">
                      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-text-primary">{config.title}</h3>
                            {dirtyPreferenceKeys[preferenceKey] ? (
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                                Modified
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm leading-6 text-text-secondary">{config.description}</p>
                        </div>
                      </div>

                      <div className="px-5 py-5">
                        <label className="label">{config.fieldLabel || 'Value'}</label>
                        <input
                          className="input max-w-xs"
                          type="number"
                          min={config.min}
                          step={config.step}
                          value={preferenceDrafts[preferenceKey] ?? ''}
                          onChange={event => setPreferenceDrafts(current => ({
                            ...current,
                            [preferenceKey]: event.target.value,
                          }))}
                        />
                      </div>

                      <div className="border-t border-border px-5 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs text-text-secondary">
                            {dirtyPreferenceKeys[preferenceKey] ? 'You have unsaved changes in this preference.' : 'No pending changes.'}
                          </p>
                          <button
                            type="button"
                            onClick={() => savePreference(preferenceKey)}
                            disabled={savingPreferenceKey === preferenceKey}
                            className="btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {savingPreferenceKey === preferenceKey ? 'Saving...' : 'Save Preference'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                {currentSection.masters.map(groupKey => {
                  const group = MASTER_GROUP_MAP[groupKey];
                  const options = masterDrafts[groupKey] || [];
                  const groupDirty = dirtyMasterGroups[groupKey];
                  const newCount = masterGroupNewCounts[groupKey] || 0;
                  const isPresetGroup = PRESET_MASTER_GROUPS.has(groupKey);
                  const isSingleChoiceGroup = SINGLE_ACTIVE_MASTER_GROUPS.has(groupKey);

                  return (
                    <div key={groupKey} className="rounded-2xl border border-border bg-white shadow-sm">
                      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-text-primary">{group.title}</h3>
                            {groupDirty ? (
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                                Modified
                              </span>
                            ) : null}
                            {newCount ? (
                              <span className="rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-700">
                                New {newCount}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm leading-6 text-text-secondary">{group.description}</p>
                        </div>
                      </div>

                      <div className="space-y-3 px-5 py-5">
                        {options.length ? (
                          options.map((option, index) => (
                            <div key={`${groupKey}-${index}`} className="rounded-2xl border border-border bg-light-bg/70 p-4">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0 flex-1">
                                  {isPresetGroup ? (
                                    <>
                                      <p className="label">Format Option</p>
                                      <div className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium text-text-primary">
                                        {option.label || 'Untitled option'}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <label className="label">Display Label</label>
                                      <input
                                        className="input"
                                        placeholder="What users should see"
                                        value={option.label || ''}
                                        onChange={event => updateMasterOption(groupKey, index, 'label', event.target.value)}
                                      />
                                    </>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 lg:ml-4">
                                  <button
                                    type="button"
                                    onClick={() => updateMasterOption(groupKey, index, 'isActive', isSingleChoiceGroup ? true : option.isActive === false)}
                                    className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${option.isActive !== false ? 'border-primary-500 bg-primary-500 text-white' : 'border-border bg-white text-text-secondary hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700'}`}
                                  >
                                    {isSingleChoiceGroup
                                      ? option.isActive !== false ? 'Selected' : 'Select'
                                      : option.isActive !== false ? 'Active' : 'Inactive'}
                                  </button>
                                  <button type="button" onClick={() => removeMasterOption(groupKey, index)} className="btn-secondary text-sm">
                                    Remove
                                  </button>
                                </div>
                              </div>

                            </div>
                          ))
                        ) : (
                          <EmptyState message="No options yet. Add the first one to start this group." icon={<FiClipboard />} />
                        )}
                      </div>

                      <div className="border-t border-border px-5 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs text-text-secondary">
                            {groupDirty ? 'You have unsaved changes in this group.' : 'No pending changes.'}
                          </p>
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() => addMasterOption(groupKey)}
                              className="btn-secondary text-sm"
                            >
                              + Add
                            </button>
                            <button
                              type="button"
                              onClick={() => saveMasterGroup(groupKey)}
                              disabled={savingMasterKey === groupKey}
                              className="btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {savingMasterKey === groupKey ? 'Saving...' : 'Save Group'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="card">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                <FiShield />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-text-primary">{currentSection.title} Access Controls</h2>
                  {currentSection.capabilityGroups.some(group => group.items.some(item => dirtyCapabilityKeys[item.key])) ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      Unsaved changes
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-text-secondary">Choose who can open each feature.</p>
              </div>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {roleLegend.map(item => (
                <div key={item.type} className={`rounded-full border px-3 py-2 text-xs font-semibold ${roleTypeStyles[item.type] || roleTypeStyles.staff}`}>
                  {item.label} Roles: {item.count}
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {currentSection.capabilityGroups.map(group => (
                <div key={group.title} className="rounded-2xl border border-border bg-light-bg/60 p-4">
                  <div className="mb-4">
                    <h3 className="font-semibold text-text-primary">{group.title}</h3>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-border bg-white">
                    {group.items.map((item, itemIndex) => {
                      const selectedRoles = capabilityDrafts[item.key] || [];
                      const capabilityDirty = dirtyCapabilityKeys[item.key];
                      const compatibleRoleTypes = getCompatibleRoleTypes(item.key);
                      const compatibleRoles = visibleRoles.filter(role => compatibleRoleTypes.has(role.type));

                      return (
                        <div key={item.key} className={`grid gap-3 px-4 py-4 xl:grid-cols-[260px_minmax(0,1fr)] ${itemIndex ? 'border-t border-border' : ''}`}>
                          <div>
                            <div className="min-h-[1.5rem]">
                              <p className="font-medium text-text-primary">{item.label}</p>
                            </div>
                            <div className="mt-1 flex min-h-[1.5rem] flex-wrap items-center gap-2">
                              <p className="text-xs text-text-secondary">
                                {selectedRoles.length ? `${selectedRoles.length} role${selectedRoles.length === 1 ? '' : 's'} selected` : 'No roles selected'}
                              </p>
                              <span
                                className={`rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700 transition-opacity ${
                                  capabilityDirty ? 'opacity-100' : 'opacity-0'
                                }`}
                              >
                                Modified
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {compatibleRoles.map(role => {
                              const selected = selectedRoles.includes(role.value);
                              const isRequired = getRequiredCapabilityRoles(item.key).includes(role.value);

                              return (
                                <button
                                  key={`${item.key}-${role.value}`}
                                  type="button"
                                  onClick={() => toggleCapability(item.key, role.value)}
                                  className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${selected ? 'border-primary-600 bg-primary-600 text-white shadow-sm' : 'border-border bg-white text-text-secondary hover:border-primary-200 hover:text-primary-700'} ${isRequired ? 'cursor-default' : ''}`}
                                  title={isRequired ? 'Required for this workflow' : role.label}
                                >
                                  {role.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-border pt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-text-secondary">Save this section after reviewing the role access.</p>
                <button
                  type="button"
                  onClick={() => saveCapabilitySection(currentSection.key)}
                  disabled={savingCapabilitySection === currentSection.key}
                  className="btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingCapabilitySection === currentSection.key ? 'Saving...' : 'Save Access'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
