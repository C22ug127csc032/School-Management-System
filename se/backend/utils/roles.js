// ── School ERP Roles ─────────────────────────────────────────────────────────

export const ROLES = {
  SUPER_ADMIN:     'super_admin',
  ADMIN:           'admin',
  PRINCIPAL:       'principal',
  TEACHER:         'teacher',
  CLASS_TEACHER:   'class_teacher',
  ACCOUNTANT:      'accountant',
  LIBRARIAN:       'librarian',
  ADMISSION_STAFF: 'admission_staff',
  STUDENT:         'student',
  PARENT:          'parent',
};

export const ALL_ROLES = Object.values(ROLES);

export const ADMIN_ROLES = [
  ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL,
  ROLES.ACCOUNTANT, ROLES.LIBRARIAN, ROLES.ADMISSION_STAFF,
];

export const STAFF_ROLES = [
  ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL,
  ROLES.TEACHER, ROLES.CLASS_TEACHER,
  ROLES.ACCOUNTANT, ROLES.LIBRARIAN, ROLES.ADMISSION_STAFF,
];

export const TEACHING_ROLES = [ROLES.TEACHER, ROLES.CLASS_TEACHER];

export const SYSTEM_ROLE_DEFINITIONS = [
  { value: ROLES.SUPER_ADMIN,     label: 'Super Admin',     type: 'admin' },
  { value: ROLES.ADMIN,           label: 'Admin',           type: 'admin' },
  { value: ROLES.PRINCIPAL,       label: 'Principal',       type: 'admin' },
  { value: ROLES.TEACHER,         label: 'Teacher',         type: 'staff' },
  { value: ROLES.CLASS_TEACHER,   label: 'Class Teacher',   type: 'staff' },
  { value: ROLES.ACCOUNTANT,      label: 'Accountant',      type: 'staff' },
  { value: ROLES.LIBRARIAN,       label: 'Librarian',       type: 'staff' },
  { value: ROLES.ADMISSION_STAFF, label: 'Admission Staff', type: 'staff' },
  { value: ROLES.STUDENT,         label: 'Student',         type: 'portal' },
  { value: ROLES.PARENT,          label: 'Parent',          type: 'portal' },
];

// Capability → default allowed roles
export const CAPABILITY_DEFAULTS = {
  admin_dashboard:             [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.ACCOUNTANT, ROLES.LIBRARIAN, ROLES.ADMISSION_STAFF],
  admin_students_view:         [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.CLASS_TEACHER, ROLES.TEACHER, ROLES.ADMISSION_STAFF, ROLES.ACCOUNTANT],
  admin_students_create:       [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ADMISSION_STAFF],
  admin_students_edit:         [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ADMISSION_STAFF, ROLES.CLASS_TEACHER],
  admin_students_deactivate:   [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  admin_students_promote:      [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  admin_teachers_manage:       [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL],
  admin_classes_manage:        [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL],
  admin_subjects_manage:       [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL],
  admin_timetable_manage:      [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL],
  admin_timetable_view:        [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.CLASS_TEACHER],
  admin_attendance_manage:     [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.CLASS_TEACHER],
  admin_leave_manage:          [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.CLASS_TEACHER],
  admin_outpass_manage:        [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CLASS_TEACHER],
  admin_homework_manage:       [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.CLASS_TEACHER],
  admin_exam_manage:           [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.CLASS_TEACHER],
  admin_marks_manage:          [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.CLASS_TEACHER],
  admin_fee_structure_manage:  [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  admin_fee_assign:            [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT],
  admin_fees_list_view:        [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.CLASS_TEACHER],
  admin_payments_view:         [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT],
  admin_library_manage:        [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LIBRARIAN],
  admin_inventory_manage:      [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  admin_expense_manage:        [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT],
  admin_circular_manage:       [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.CLASS_TEACHER],
  admin_notifications_view:    [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.CLASS_TEACHER, ROLES.ACCOUNTANT],
  admin_reports_view:          [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.ACCOUNTANT],
  admin_staff_manage:          [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL],
  admin_settings_manage:       [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  admin_substitution_manage:   [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL],
};

export const getAllowedRolesForCapability = (capabilityKey) => {
  return CAPABILITY_DEFAULTS[capabilityKey] || [ROLES.SUPER_ADMIN];
};
