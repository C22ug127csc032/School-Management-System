import User from '../models/User.model.js';
import { createPaginatedResponse, createSearchRegex, parseListQuery, resolveSort } from '../utils/query.js';
import { ROLES } from '../utils/roles.js';
import { normalizePhone } from '../utils/phone.js';

const NON_TEACHING_STAFF_ROLES = [
  ROLES.ADMIN,
  ROLES.PRINCIPAL,
  ROLES.ACCOUNTANT,
  ROLES.LIBRARIAN,
  ROLES.ADMISSION_STAFF,
];

const isManagedStaffRole = role => NON_TEACHING_STAFF_ROLES.includes(role);

const baseStaffQuery = {
  role: { $in: NON_TEACHING_STAFF_ROLES },
};

const toSafeUser = user => {
  const plain = typeof user?.toObject === 'function' ? user.toObject() : { ...user };
  delete plain.password;
  delete plain.otp;
  delete plain.otpExpire;
  return plain;
};

export const getStaff = async (req, res) => {
  try {
    const { search, role, department, status } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = parseListQuery(req.query, {
      defaultLimit: 20,
      defaultSortBy: 'name',
      defaultSortOrder: 'asc',
    });
    const { sort } = resolveSort(sortBy, sortOrder, {
      name: 'name',
      role: 'role',
      department: 'department',
      staffId: 'staffId',
      createdAt: 'createdAt',
    }, 'name');

    const query = { ...baseStaffQuery };

    if (role && isManagedStaffRole(role)) query.role = role;
    if (department) query.department = createSearchRegex(department);
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (search) {
      const re = createSearchRegex(search);
      query.$or = [
        { name: re },
        { email: re },
        { phone: re },
        { staffId: re },
        { department: re },
      ];
    }

    const total = await User.countDocuments(query);
    const staff = await User.find(query)
      .select('-password -otp -otpExpire')
      .skip(skip)
      .limit(limit)
      .sort(sort);

    res.json(createPaginatedResponse({ data: staff, total, page, limit }));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createStaff = async (req, res) => {
  try {
    const { name, email, phone, password, role, department, staffId, isActive } = req.body;

    if (!name || !phone || !role || !staffId) {
      return res.status(400).json({ success: false, message: 'Name, phone, role, and staff ID are required.' });
    }
    if (!isManagedStaffRole(role)) {
      return res.status(400).json({ success: false, message: 'Invalid staff role selected.' });
    }

    const normalizedPhone = normalizePhone(phone);
    const normalizedEmail = email?.toLowerCase() || undefined;
    const existing = await User.findOne({
      $or: [
        { phone: normalizedPhone },
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        { staffId },
      ],
    });

    if (existing) {
      return res.status(409).json({ success: false, message: 'Phone, email, or staff ID already exists.' });
    }

    const staff = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: password || staffId,
      role,
      department: department?.trim() || '',
      staffId: staffId.trim(),
      isActive: isActive ?? true,
      isFirstLogin: !password,
    });

    res.status(201).json({
      success: true,
      data: toSafeUser(staff),
      message: 'Staff created.',
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Phone, email, or staff ID already exists.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateStaff = async (req, res) => {
  try {
    const staff = await User.findById(req.params.id);
    if (!staff || !isManagedStaffRole(staff.role)) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    const { name, email, phone, password, role, department, staffId, isActive } = req.body;

    if (role && !isManagedStaffRole(role)) {
      return res.status(400).json({ success: false, message: 'Invalid staff role selected.' });
    }

    const normalizedPhone = phone ? normalizePhone(phone) : staff.phone;
    const normalizedEmail = email ? email.toLowerCase() : (email === '' ? undefined : staff.email);
    const normalizedStaffId = staffId?.trim() || staff.staffId;

    const duplicate = await User.findOne({
      _id: { $ne: staff._id },
      $or: [
        { phone: normalizedPhone },
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        { staffId: normalizedStaffId },
      ],
    });

    if (duplicate) {
      return res.status(409).json({ success: false, message: 'Phone, email, or staff ID already exists.' });
    }

    staff.name = name?.trim() || staff.name;
    staff.phone = normalizedPhone;
    staff.email = normalizedEmail;
    staff.role = role || staff.role;
    staff.department = department?.trim() || '';
    staff.staffId = normalizedStaffId;
    if (typeof isActive === 'boolean') staff.isActive = isActive;
    if (password) {
      staff.password = password;
      staff.isFirstLogin = false;
    }

    await staff.save();

    res.json({
      success: true,
      data: toSafeUser(staff),
      message: 'Staff updated.',
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Phone, email, or staff ID already exists.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deactivateStaff = async (req, res) => {
  try {
    const staff = await User.findById(req.params.id);
    if (!staff || !isManagedStaffRole(staff.role)) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    staff.isActive = false;
    await staff.save();

    res.json({ success: true, message: 'Staff deactivated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export default { getStaff, createStaff, updateStaff, deactivateStaff };
