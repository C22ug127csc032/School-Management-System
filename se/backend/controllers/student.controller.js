import mongoose from 'mongoose';
import Student from '../models/Student.model.js';
import User    from '../models/User.model.js';
import Class   from '../models/Class.model.js';
import Teacher from '../models/Teacher.model.js';
import { generateAdmissionNo, formatRollNo, buildStudentQuery } from '../utils/studentUtils.js';
import { normalizePhone } from '../utils/phone.js';
import { resolveAcademicYear } from '../utils/academicYear.js';
import { createPaginatedResponse, parseListQuery, resolveSort } from '../utils/query.js';

const normalizeOptionalPhone = value => normalizePhone(value) || undefined;

const getStudentPrimaryContact = ({ phone, guardian, father, mother }) => (
  normalizeOptionalPhone(phone)
  || normalizeOptionalPhone(guardian?.phone)
  || normalizeOptionalPhone(father?.phone)
  || normalizeOptionalPhone(mother?.phone)
  || null
);

// GET /api/students
export const getStudents = async (req, res) => {
  try {
    const {
      search, grade, section, classId, groupName, status,
      academicYear,
    } = req.query;
    const ay = resolveAcademicYear(academicYear);
    const { page, limit, skip, sortBy, sortOrder } = parseListQuery(req.query, {
      defaultLimit: 30,
      defaultSortBy: 'name',
      defaultSortOrder: 'asc',
    });
    const { sort } = resolveSort(sortBy, sortOrder, {
      name: sortOrderValue => ({ firstName: sortOrderValue === 'asc' ? 1 : -1, lastName: sortOrderValue === 'asc' ? 1 : -1 }),
      admissionNo: 'admissionNo',
      grade: sortOrderValue => ({ grade: sortOrderValue === 'asc' ? 1 : -1, section: sortOrderValue === 'asc' ? 1 : -1, firstName: sortOrderValue === 'asc' ? 1 : -1 }),
      rollNo: 'rollNo',
      status: 'status',
      createdAt: 'createdAt',
    }, 'name');

    const query = { academicYear: ay };
    if (status)    query.status = status;
    else           query.status = { $in: ['active','admission_pending'] };
    if (grade)     query.grade   = grade;
    if (section)   query.section = section;
    if (groupName) query.groupName = groupName;

    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      const cls = await Class.findById(classId);
      if (cls) {
        query.$or = [
          { classRef: cls._id },
          { 
            grade: cls.grade, 
            section: cls.section, 
            groupName: cls.groupName || null,
            academicYear: ay 
          }
        ];
      } else {
        query.classRef = classId;
      }
    } else if (classId === '__none__') {
       query.classRef = new mongoose.Types.ObjectId();
    }

    if (search)    Object.assign(query, buildStudentQuery(search));

    if (['teacher', 'class_teacher'].includes(req.user.role)) {
      if (!req.user.teacherRef) {
        query.classRef = new mongoose.Types.ObjectId();
      } else {
        const teacher = await Teacher.findById(req.user.teacherRef).select('classTeacherOf');
        if (teacher?.classTeacherOf) {
          const cls = await Class.findById(teacher.classTeacherOf);
          if (cls) {
            query.$or = [
              { classRef: cls._id },
              {
                grade: cls.grade,
                section: cls.section,
                groupName: cls.groupName || null,
                academicYear: ay,
              },
            ];
          } else {
            query.classRef = teacher.classTeacherOf;
          }
        } else {
          query.classRef = new mongoose.Types.ObjectId();
        }
      }
    }

    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .populate('classRef', 'grade section displayName groupName')
      .skip(skip).limit(limit)
      .sort(sort);

    res.json(createPaginatedResponse({ data: students, total, page, limit }));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/students/:id
export const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('classRef', 'grade section displayName groupName classTeacher')
      .populate('parentRefs', 'name phone role relation');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/students
export const createStudent = async (req, res) => {
  try {
    const {
      firstName, lastName, dob, gender, bloodGroup, religion, category,
      nationality, aadharNo, address, phone, email,
      father, mother, guardian, annualIncome,
      grade, section, groupName, academicYear, admissionType,
      previousSchool, hasTransport, transportRoute, busNo, pickupPoint,
      isHosteler, hostelRoom,
    } = req.body;

    const ay          = resolveAcademicYear(academicYear);
    const normPhone   = normalizeOptionalPhone(phone);
    const normalizedFatherPhone = normalizeOptionalPhone(father?.phone);
    const normalizedMotherPhone = normalizeOptionalPhone(mother?.phone);
    const normalizedGuardianPhone = normalizeOptionalPhone(guardian?.phone);
    const admissionNo = await generateAdmissionNo();

    if (!getStudentPrimaryContact({ phone: normPhone, guardian: { phone: normalizedGuardianPhone }, father: { phone: normalizedFatherPhone }, mother: { phone: normalizedMotherPhone } })) {
      return res.status(400).json({ success: false, message: 'At least one parent or guardian phone number is required.' });
    }

    // Find the class reference
    const classQuery = { grade, section, academicYear: ay, isActive: true };
    if (groupName) classQuery.groupName = groupName;
    const classRef = await Class.findOne(classQuery);

    const student = await Student.create({
      admissionNo, firstName, lastName, dob, gender, bloodGroup, religion,
      category, nationality, aadharNo, address,
      phone: normPhone, email,
      father: father ? { ...father, phone: normalizedFatherPhone } : father,
      mother: mother ? { ...mother, phone: normalizedMotherPhone } : mother,
      guardian: guardian ? { ...guardian, phone: normalizedGuardianPhone } : guardian,
      annualIncome,
      grade, section, groupName: groupName || null,
      classRef: classRef?._id || null,
      academicYear: ay, admissionType: admissionType || 'regular',
      previousSchool, hasTransport, transportRoute, busNo, pickupPoint,
      isHosteler, hostelRoom, status: 'admission_pending',
    });

    res.status(201).json({ success: true, data: student, message: `Student admitted. Admission No: ${admissionNo}` });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ success: false, message: 'Phone number already registered.' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/students/:id
export const updateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    if (req.body.phone !== undefined) req.body.phone = normalizeOptionalPhone(req.body.phone);
    if (req.body.father?.phone !== undefined) req.body.father.phone = normalizeOptionalPhone(req.body.father.phone);
    if (req.body.mother?.phone !== undefined) req.body.mother.phone = normalizeOptionalPhone(req.body.mother.phone);
    if (req.body.guardian?.phone !== undefined) req.body.guardian.phone = normalizeOptionalPhone(req.body.guardian.phone);

    const primaryContact = getStudentPrimaryContact({
      phone: req.body.phone !== undefined ? req.body.phone : student.phone,
      guardian: { phone: req.body.guardian?.phone !== undefined ? req.body.guardian.phone : student.guardian?.phone },
      father: { phone: req.body.father?.phone !== undefined ? req.body.father.phone : student.father?.phone },
      mother: { phone: req.body.mother?.phone !== undefined ? req.body.mother.phone : student.mother?.phone },
    });

    if (!primaryContact) {
      return res.status(400).json({ success: false, message: 'At least one parent or guardian phone number is required.' });
    }

    // If class/grade/section changed, update classRef
    const { grade, section, groupName, academicYear } = req.body;
    if (grade || section) {
      const ay = resolveAcademicYear(academicYear || student.academicYear);
      const g  = grade || student.grade;
      const s  = section || student.section;
      const gn = groupName !== undefined ? groupName : student.groupName;
      const classQuery = { grade: g, section: s, academicYear: ay, isActive: true };
      if (gn) classQuery.groupName = gn;
      const cls = await Class.findOne(classQuery);
      req.body.classRef = cls?._id || null;
    }

    Object.assign(student, req.body);
    await student.save();
    res.json({ success: true, data: student, message: 'Student updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/students/generate-roll-nos
export const generateRollNumbers = async (req, res) => {
  try {
    const { classId, academicYear } = req.body;
    const ay = resolveAcademicYear(academicYear);

    if (!classId) {
      return res.status(400).json({ success: false, message: 'Please select a class first.' });
    }

    const cls = await Class.findById(classId);
    if (!cls || !cls.isActive) {
      return res.status(404).json({ success: false, message: 'Class not found.' });
    }

    const query = {
      academicYear: ay,
      grade: cls.grade,
      section: cls.section,
      status: { $in: ['active', 'admission_pending'] },
    };

    if (cls.groupName) query.groupName = cls.groupName;
    else query.$or = [{ groupName: null }, { groupName: '' }, { groupName: { $exists: false } }];

    const students = await Student.find(query)
      .sort({ firstName: 1, lastName: 1, admissionNo: 1, createdAt: 1 });

    if (!students.length) {
      return res.status(400).json({ success: false, message: 'No students found in this class for roll number generation.' });
    }

    await Student.bulkWrite(students.map((student, index) => ({
      updateOne: {
        filter: { _id: student._id },
        update: {
          $set: {
            classRef: cls._id,
            rollNo: formatRollNo({
              grade: cls.grade,
              section: cls.section,
              groupName: cls.groupName,
            }, index + 1),
          },
        },
      },
    })));

    const updatedStudents = await Student.find(query)
      .populate('classRef', 'grade section displayName groupName')
      .sort({ rollNo: 1, firstName: 1, lastName: 1 });

    res.json({
      success: true,
      data: updatedStudents,
      count: updatedStudents.length,
      message: `Roll numbers generated for ${cls.displayName || `Grade ${cls.grade} - ${cls.section}`}.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/students/:id/activate
export const activateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const ay = resolveAcademicYear(student.academicYear);
    if (!student.classRef && student.grade) {
      const classQuery = {
        grade: student.grade,
        section: student.section || '',
        academicYear: ay,
        isActive: true,
      };
      if (student.groupName) classQuery.groupName = student.groupName;
      else classQuery.$or = [{ groupName: null }, { groupName: '' }, { groupName: { $exists: false } }];

      const cls = await Class.findOne(classQuery);
      if (cls) {
        student.classRef = cls._id;
        student.section = student.section || cls.section || '';
      }
    }

    student.status = 'active';

    // Create user account if not exists
    if (!student.userRef) {
      const primaryContact = getStudentPrimaryContact(student);
      if (!primaryContact) {
        return res.status(400).json({ success: false, message: 'Student or guardian phone number is required before activation.' });
      }

      const user = await User.create({
        name:      `${student.firstName} ${student.lastName}`.trim(),
        phone:      primaryContact,
        email:      student.email || undefined,
        password:   student.admissionNo,
        role:       'student',
        studentRef: student._id,
        isFirstLogin: true,
      });
      student.userRef = user._id;
    }

    await student.save();
    res.json({
      success: true,
      data: student,
      message: student.rollNo ? `Student activated. Roll No: ${student.rollNo}` : 'Student activated.',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/students/:id/status
export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const student = await Student.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    res.json({ success: true, data: student, message: `Status updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/students/stats
export const getStudentStats = async (req, res) => {
  try {
    const ay = resolveAcademicYear(req.query.academicYear);
    const [total, active, pending, transferred] = await Promise.all([
      Student.countDocuments({ academicYear: ay }),
      Student.countDocuments({ academicYear: ay, status: 'active' }),
      Student.countDocuments({ academicYear: ay, status: 'admission_pending' }),
      Student.countDocuments({ academicYear: ay, status: 'transferred' }),
    ]);
    res.json({ success: true, data: { total, active, pending, transferred } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export default { getStudents, getStudentById, createStudent, updateStudent, generateRollNumbers, activateStudent, updateStatus, getStudentStats };
