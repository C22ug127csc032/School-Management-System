import Subject from '../models/Subject.model.js';
import ClassSubject from '../models/ClassSubject.model.js';
import TimetableSlot from '../models/TimetableSlot.model.js';
import Teacher from '../models/Teacher.model.js';
import { Homework, ExamSchedule, Mark } from '../models/Academic.model.js';
import { Substitution } from '../models/Substitution.model.js';
import { createPaginatedResponse, createSearchRegex, parseListQuery, resolveSort } from '../utils/query.js';

const SUBJECT_POPULATE = { path: 'parentSubject', select: 'name code subjectRole color' };

const normalizeSubjectPayload = body => ({
  ...body,
  subjectRole: body.subjectRole || 'standalone',
  parentSubject: body.subjectRole === 'sub' ? (body.parentSubject || null) : null,
  isGroupSpecific: Array.isArray(body.applicableGroups) && body.applicableGroups.length > 0,
});

const validateHierarchy = async (payload, subjectId = null) => {
  if (payload.subjectRole !== 'sub') return null;
  if (!payload.parentSubject) return 'Choose a main subject for the sub subject.';
  if (subjectId && String(payload.parentSubject) === String(subjectId)) return 'A subject cannot be its own parent.';

  const parentSubject = await Subject.findById(payload.parentSubject);
  if (!parentSubject) return 'Selected parent subject not found.';
  if (parentSubject.subjectRole === 'sub') return 'A sub subject cannot be used as the parent subject.';
  return null;
};

// GET /api/subjects
export const getSubjects = async (req, res) => {
  try {
    const { gradeLevel, type, group, includeInactive, search } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = parseListQuery(req.query, {
      defaultLimit: 50,
      defaultSortBy: 'name',
      defaultSortOrder: 'asc',
    });
    const { sort } = resolveSort(sortBy, sortOrder, {
      name: 'name',
      code: 'code',
      type: 'type',
      periodsPerWeek: 'periodsPerWeek',
      createdAt: 'createdAt',
    }, 'name');
    const query = {};
    if (!includeInactive) query.isActive = true;
    if (gradeLevel) query.applicableGradeLevels = gradeLevel;
    if (type)       query.type = type;
    if (group) {
      // Return subjects applicable to this group:
      // Either common to all groups (applicableGroups is empty/missing)
      // OR explicitly includes this group.
      query.$or = [
        { applicableGroups: { $exists: false } },
        { applicableGroups: { $size: 0 } },
        { applicableGroups: group },
      ];
    }
    if (search) {
      const re = createSearchRegex(search);
      query.$and = query.$and || [];
      query.$and.push({ $or: [{ name: re }, { code: re }] });
    }

    const total = await Subject.countDocuments(query);
    const subjects = await Subject.find(query).populate(SUBJECT_POPULATE).skip(skip).limit(limit).sort(sort);
    res.json(createPaginatedResponse({ data: subjects, total, page, limit }));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/subjects/:id
export const getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id).populate(SUBJECT_POPULATE);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });
    res.json({ success: true, data: subject });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/subjects
export const createSubject = async (req, res) => {
  try {
    const payload = normalizeSubjectPayload(req.body);
    const hierarchyError = await validateHierarchy(payload);
    if (hierarchyError) return res.status(400).json({ success: false, message: hierarchyError });

    const subject = await Subject.create(payload);
    const populated = await Subject.findById(subject._id).populate(SUBJECT_POPULATE);
    res.status(201).json({ success: true, data: populated, message: 'Subject created.' });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ success: false, message: 'Subject code already exists.' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/subjects/:id
export const updateSubject = async (req, res) => {
  try {
    const payload = normalizeSubjectPayload(req.body);
    const hierarchyError = await validateHierarchy(payload, req.params.id);
    if (hierarchyError) return res.status(400).json({ success: false, message: hierarchyError });

    const subject = await Subject.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    }).populate(SUBJECT_POPULATE);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });
    res.json({ success: true, data: subject, message: 'Subject updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/subjects/:id/deactivate
export const deactivateSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true, runValidators: true },
    ).populate(SUBJECT_POPULATE);

    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });
    res.json({ success: true, data: subject, message: 'Subject deactivated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/subjects/:id
export const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    const childCount = await Subject.countDocuments({ parentSubject: subject._id });

    if (childCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'Delete the sub subjects under this main subject first.',
      });
    }

    await Promise.all([
      Teacher.updateMany({ eligibleSubjects: subject._id }, { $pull: { eligibleSubjects: subject._id } }),
      ClassSubject.deleteMany({ subject: subject._id }),
      TimetableSlot.deleteMany({ subject: subject._id }),
      Homework.deleteMany({ subject: subject._id }),
      ExamSchedule.deleteMany({
        $or: [
          { subject: subject._id },
          { componentSubjects: subject._id },
        ],
      }),
      Mark.deleteMany({ subject: subject._id }),
      Substitution.deleteMany({ subject: subject._id }),
    ]);

    await Subject.findByIdAndDelete(subject._id);
    res.json({ success: true, message: 'Subject and all linked records deleted permanently.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export default { getSubjects, getSubjectById, createSubject, updateSubject, deactivateSubject, deleteSubject };
