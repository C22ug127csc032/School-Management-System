import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import { getAllowedRolesForCapability, ROLES } from '../utils/roles.js';

const MSG = {
  NO_TOKEN:    'Please sign in to continue.',
  EXPIRED:     'Your session has expired. Please sign in again.',
  INACTIVE:    'Your account is inactive. Please contact the administrator.',
  FORBIDDEN:   'You do not have permission to access this section.',
  CHECK_FAIL:  'Unable to verify access. Please try again.',
};

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer '))
    token = req.headers.authorization.split(' ')[1];

  if (!token) return res.status(401).json({ success: false, message: MSG.NO_TOKEN });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user || !req.user.isActive)
      return res.status(401).json({ success: false, message: MSG.INACTIVE });
    next();
  } catch {
    res.status(401).json({ success: false, message: MSG.EXPIRED });
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ success: false, message: MSG.FORBIDDEN });
  next();
};

export const authorizeCapability = (capabilityKey, fallbackRoles = []) => (req, res, next) => {
  try {
    const allowed = getAllowedRolesForCapability(capabilityKey);
    const effective = allowed.length ? allowed : fallbackRoles;
    if (!effective.includes(req.user.role))
      return res.status(403).json({ success: false, message: MSG.FORBIDDEN });
    next();
  } catch {
    res.status(500).json({ success: false, message: MSG.CHECK_FAIL });
  }
};

// Convenience exports
export const superAdminOnly    = authorize(ROLES.SUPER_ADMIN);
export const adminOnly         = authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL);
export const teachingStaff     = authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.CLASS_TEACHER);
export const allStaff          = authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.CLASS_TEACHER, ROLES.ACCOUNTANT, ROLES.LIBRARIAN, ROLES.ADMISSION_STAFF);
export const financeStaff      = authorizeCapability('admin_payments_view',        [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT]);
export const admissionStaff    = authorizeCapability('admin_students_create',      [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ADMISSION_STAFF]);
export const feeStructureStaff = authorizeCapability('admin_fee_structure_manage', [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
export const feeAssignStaff    = authorizeCapability('admin_fee_assign',           [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT]);
export const libStaff          = authorizeCapability('admin_library_manage',       [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LIBRARIAN]);
export const inventoryStaff    = authorizeCapability('admin_inventory_manage',     [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
export const reportStaff       = authorizeCapability('admin_reports_view',         [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.ACCOUNTANT]);
export const timetableManagers = authorizeCapability('admin_timetable_manage',     [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL]);
export const timetableViewers  = authorizeCapability('admin_timetable_view',       [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.CLASS_TEACHER]);
export const leaveReviewers    = authorizeCapability('admin_leave_manage',         [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.CLASS_TEACHER]);
export const settingsManagers  = authorizeCapability('admin_settings_manage',      [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
export const staffManagers     = authorizeCapability('admin_staff_manage',         [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL]);
export const parentOnly        = authorize(ROLES.PARENT);
export const studentOnly       = authorize(ROLES.STUDENT);
export const classTeacherUp    = authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.CLASS_TEACHER);
export const teacherUp         = authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.CLASS_TEACHER);
export const substitutionMgr   = authorizeCapability('admin_substitution_manage',  [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL]);

export default { protect, authorize, adminOnly, allStaff, parentOnly, studentOnly };
