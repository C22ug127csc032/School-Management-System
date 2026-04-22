import User    from '../models/User.model.js';
import Student from '../models/Student.model.js';
import Teacher from '../models/Teacher.model.js';
import jwt     from 'jsonwebtoken';
import { isValidIndianPhone, normalizePhone } from '../utils/phone.js';

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

const toSafeUser = user => {
  const u = typeof user?.toObject === 'function' ? user.toObject() : { ...user };
  delete u.password;
  return u;
};

const userPopulate = [
  {
    path: 'studentRef',
    populate: [
      { path: 'classRef', select: 'displayName grade section groupName academicYear' },
      { path: 'parentRefs', select: 'name phone email role relation isActive createdAt' },
    ],
  },
  {
    path: 'teacherRef',
    populate: [
      { path: 'eligibleSubjects', select: 'name code color type' },
      { path: 'classTeacherOf', select: 'grade section displayName groupName' },
    ],
  },
];

// Ensure student user exists (auto-create on first login attempt)
const ensureStudentUser = async phone => {
  const student = await Student.findOne({ phone });
  if (!student) return null;
  let user = await User.findOne({ phone }).populate(userPopulate);
  if (user) return user;
  user = await User.create({
    name:         `${student.firstName} ${student.lastName}`.trim(),
    phone:        student.phone,
    email:        student.email || undefined,
    password:     student.admissionNo || student.phone,
    role:         'student',
    studentRef:   student._id,
    isFirstLogin: true,
  });
  if (!student.userRef) { student.userRef = user._id; await student.save(); }
  return User.findById(user._id).populate(userPopulate);
};

const getLinkedParentContact = student => {
  if (student?.father?.name || student?.father?.phone || student?.father?.email) {
    return {
      name: student.father?.name?.trim() || '',
      phone: normalizePhone(student.father?.phone || ''),
      email: (student.father?.email || '').trim().toLowerCase(),
      relation: 'father',
    };
  }
  if (student?.mother?.name || student?.mother?.phone || student?.mother?.email) {
    return {
      name: student.mother?.name?.trim() || '',
      phone: normalizePhone(student.mother?.phone || ''),
      email: (student.mother?.email || '').trim().toLowerCase(),
      relation: 'mother',
    };
  }
  if (student?.guardian?.name || student?.guardian?.phone) {
    return {
      name: student.guardian?.name?.trim() || '',
      phone: normalizePhone(student.guardian?.phone || ''),
      email: '',
      relation: student.guardian?.relation?.trim() || 'guardian',
    };
  }
  return { name: '', phone: '', email: '', relation: 'parent' };
};

const buildParentPreview = student => {
  const contact = getLinkedParentContact(student);
  const studentName = `${student.firstName || ''} ${student.lastName || ''}`.trim();

  return {
    student: {
      id: student._id,
      name: studentName,
      admissionNo: student.admissionNo,
      grade: student.grade,
      section: student.section,
      academicYear: student.academicYear,
      status: student.status,
    },
    parent: {
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      relation: contact.relation,
    },
    hasRegisteredParent: Array.isArray(student.parentRefs) && student.parentRefs.length > 0,
  };
};

// ── POST /api/auth/login ─────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const loginVal = (identifier || '').trim();
    if (!loginVal || !password)
      return res.status(400).json({ success: false, message: 'Identifier and password are required.' });

    const normPhone = normalizePhone(loginVal);
    const queries   = [];
    if (isValidIndianPhone(normPhone)) queries.push({ phone: normPhone });
    if (loginVal.includes('@'))         queries.push({ email: loginVal.toLowerCase() });
    if (!queries.length)                queries.push({ email: loginVal.toLowerCase() });

    let user = await User.findOne({ $or: queries }).populate(userPopulate);

    // Auto-create student user if not found
    if (!user && isValidIndianPhone(normPhone))
      user = await ensureStudentUser(normPhone);

    if (!user) return res.status(401).json({ success: false, message: 'No account found with this identifier.' });
    if (!user.isActive) return res.status(401).json({ success: false, message: 'Account is inactive. Contact admin.' });

    const match = await user.matchPassword(password);
    if (!match) return res.status(401).json({ success: false, message: 'Incorrect password.' });

    // Portal-Role Validation
    const { portal } = req.body;
    if (portal === 'student' && user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Access Denied: Please use the Student Portal to login.' });
    }
    if (portal === 'parent' && user.role !== 'parent') {
      return res.status(403).json({ success: false, message: 'Access Denied: Please use the Parent Portal to login.' });
    }
    if (portal === 'admin' && (user.role === 'student' || user.role === 'parent')) {
      return res.status(403).json({ success: false, message: 'Access Denied: You do not have permission to access the Staff Portal.' });
    }

    res.json({
      success: true,
      token:   generateToken(user._id, user.role),
      user:    toSafeUser(user),
      isFirstLogin: user.isFirstLogin,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getParentRegistrationPreview = async (req, res) => {
  try {
    const admissionNo = (req.params.admissionNo || '').trim();
    if (!admissionNo) {
      return res.status(400).json({ success: false, message: 'Admission number is required.' });
    }

    const student = await Student.findOne({ admissionNo })
      .populate('parentRefs', 'name phone email role relation isActive');

    if (!student) {
      return res.status(404).json({ success: false, message: 'No student found with this admission number.' });
    }

    const preview = buildParentPreview(student);
    if (!preview.parent.name || !preview.parent.phone) {
      return res.status(400).json({
        success: false,
        message: 'Parent contact details are incomplete for this admission record. Please contact the school.',
      });
    }

    res.json({ success: true, data: preview });
  } catch (err) {
    console.error('Parent preview error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const registerParent = async (req, res) => {
  try {
    const admissionNo = (req.body.admissionNo || '').trim();
    const password = req.body.password || '';
    const requestedEmail = (req.body.email || '').trim().toLowerCase();

    if (!admissionNo || !password) {
      return res.status(400).json({ success: false, message: 'Admission number and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const student = await Student.findOne({ admissionNo }).populate('parentRefs', 'name phone email role relation isActive');
    if (!student) {
      return res.status(404).json({ success: false, message: 'No student found with this admission number.' });
    }

    const preview = buildParentPreview(student);
    const { name, phone, email, relation } = preview.parent;
    const finalEmail = email || requestedEmail;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Parent contact details are incomplete for this student. Please contact the school.',
      });
    }

    const existingLinkedParent = await User.findOne({ role: 'parent', studentRef: student._id }).populate(userPopulate);
    if (existingLinkedParent) {
      return res.status(409).json({
        success: false,
        message: 'A parent account is already registered for this student. Please log in instead.',
      });
    }

    const phoneOwner = await User.findOne({ phone });
    if (phoneOwner) {
      return res.status(409).json({
        success: false,
        message: 'This phone number is already used by another account. Please contact the school.',
      });
    }

    if (finalEmail) {
      const emailOwner = await User.findOne({ email: finalEmail });
      if (emailOwner) {
        return res.status(409).json({
          success: false,
          message: 'This email address is already used by another account. Please contact the school.',
        });
      }
    }

    const parentUser = await User.create({
      name,
      phone,
      email: finalEmail || undefined,
      password,
      role: 'parent',
      relation,
      studentRef: student._id,
      isFirstLogin: false,
      isActive: true,
    });

    student.parentRefs = student.parentRefs || [];
    student.parentRefs.push(parentUser._id);
    await student.save();

    const parent = await User.findById(parentUser._id).populate(userPopulate);

    res.status(201).json({
      success: true,
      message: 'Parent account created successfully. You can now log in to the Parent Portal.',
      user: toSafeUser(parent),
    });
  } catch (err) {
    console.error('Parent registration error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password').populate(userPopulate);
    res.json({ success: true, user: toSafeUser(user) });
  } catch (err) {
    console.error('Get current user error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/auth/change-password ────────────────────────────────────────────
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });

    const user = await User.findById(req.user._id);

    if (!user.isFirstLogin) {
      if (!currentPassword)
        return res.status(400).json({ success: false, message: 'Current password is required.' });
      const match = await user.matchPassword(currentPassword);
      if (!match)
        return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password     = newPassword;
    user.isFirstLogin = false;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/auth/profile ─────────────────────────────────────────────────────
export const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user._id);
    if (name)  user.name  = name;
    if (email) user.email = email.toLowerCase();
    await user.save();
    res.json({ success: true, user: toSafeUser(user) });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export default { login, getParentRegistrationPreview, registerParent, getMe, changePassword, updateProfile };
