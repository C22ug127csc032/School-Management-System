import Teacher from '../models/Teacher.model.js';
import User    from '../models/User.model.js';
import { normalizePhone } from '../utils/phone.js';
import { createPaginatedResponse, createSearchRegex, parseListQuery, resolveSort } from '../utils/query.js';

// GET /api/teachers
export const getTeachers = async (req, res) => {
  try {
    const { search, department, gradeLevel, includeInactive } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = parseListQuery(req.query, {
      defaultLimit: 20,
      defaultSortBy: 'name',
      defaultSortOrder: 'asc',
    });
    const { sort } = resolveSort(sortBy, sortOrder, {
      name: order => ({ firstName: order === 'asc' ? 1 : -1, lastName: order === 'asc' ? 1 : -1 }),
      employeeId: 'employeeId',
      department: 'department',
      designation: 'designation',
      createdAt: 'createdAt',
    }, 'name');
    const query = {};
    if (!includeInactive) query.isActive = true;
    if (department)  query.department = createSearchRegex(department);
    if (gradeLevel)  query.eligibleGradeLevels = gradeLevel;
    if (search) {
      const re = createSearchRegex(search);
      query.$or = [{ firstName: re }, { lastName: re }, { employeeId: re }, { email: re }, { phone: re }];
    }

    const total = await Teacher.countDocuments(query);
    const teachers = await Teacher.find(query)
      .populate('eligibleSubjects', 'name code')
      .populate('classTeacherOf', 'grade section displayName')
      .skip(skip).limit(limit)
      .sort(sort);

    res.json(createPaginatedResponse({ data: teachers, total, page, limit }));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/teachers/:id
export const getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .populate('eligibleSubjects', 'name code color type')
      .populate('eligibleClasses', 'grade section displayName')
      .populate('classTeacherOf', 'grade section displayName');
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found.' });
    res.json({ success: true, data: teacher });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/teachers
export const createTeacher = async (req, res) => {
  try {
    const {
      firstName, lastName, email, phone, employeeId, department, designation,
      qualification, joiningDate, gender, dob, experienceYears, address,
      eligibleGradeLevels, eligibleSubjects,
      maxPeriodsPerDay, maxPeriodsPerWeek,
      isLabEligible, isPTEligible, isLibraryEligible,
      createUserAccount, password,
    } = req.body;

    const normPhone = normalizePhone(phone);

    // Check duplicates
    const existing = await Teacher.findOne({ $or: [{ email: email?.toLowerCase() }, { phone: normPhone }, { employeeId }] });
    if (existing) {
      const field = existing.email === email?.toLowerCase() ? 'Email' : existing.phone === normPhone ? 'Phone' : 'Employee ID';
      return res.status(409).json({ success: false, message: `${field} already registered.` });
    }

    const teacher = await Teacher.create({
      firstName, lastName,
      email: email?.toLowerCase(),
      phone: normPhone, employeeId, department, designation,
      qualification, joiningDate, gender, dob, experienceYears, address,
      eligibleGradeLevels: eligibleGradeLevels || [],
      eligibleSubjects: eligibleSubjects || [],
      maxPeriodsPerDay: maxPeriodsPerDay || 6,
      maxPeriodsPerWeek: maxPeriodsPerWeek || 30,
      isLabEligible: !!isLabEligible,
      isPTEligible:  !!isPTEligible,
      isLibraryEligible: !!isLibraryEligible,
    });

    // Optionally create login account
    if (createUserAccount) {
      const role = req.body.isClassTeacher ? 'class_teacher' : 'teacher';
      const user = await User.create({
        name:      `${firstName} ${lastName}`.trim(),
        email:     email?.toLowerCase(),
        phone:     normPhone,
        password:  password || employeeId,
        role,
        teacherRef: teacher._id,
        isFirstLogin: !password,
      });
      teacher.userRef = user._id;
      await teacher.save();
    }

    const populated = await Teacher.findById(teacher._id).populate('eligibleSubjects', 'name code');
    res.status(201).json({ success: true, data: populated, message: 'Teacher created.' });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ success: false, message: 'Duplicate entry detected.' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/teachers/:id
export const updateTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('eligibleSubjects', 'name code color')
      .populate('classTeacherOf', 'grade section displayName');
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found.' });
    res.json({ success: true, data: teacher, message: 'Teacher updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/teachers/:id
export const deleteTeacher = async (req, res) => {
  try {
    await Teacher.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Teacher deactivated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/teachers/free — teachers free in a given period/day (for substitution)
export const getAvailableTeachers = async (req, res) => {
  try {
    const { day, periodId, academicYear, subjectId, gradeLevel } = req.query;
    const ay = academicYear;

    const TimetableSlot = (await import('../models/TimetableSlot.model.js')).default;

    // Find teachers already busy in this slot
    const busySlots = await TimetableSlot.find({ day, period: periodId, academicYear: ay, isActive: true }).select('teacher');
    const busyIds   = busySlots.map(s => String(s.teacher));

    const query = { isActive: true, _id: { $nin: busyIds } };
    if (gradeLevel) query.eligibleGradeLevels = gradeLevel;
    if (subjectId)  query.eligibleSubjects = subjectId;

    const teachers = await Teacher.find(query)
      .populate('eligibleSubjects', 'name code')
      .sort({ firstName: 1 });

    res.json({ success: true, data: teachers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export default { getTeachers, getTeacherById, createTeacher, updateTeacher, deleteTeacher, getAvailableTeachers };
