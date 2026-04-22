import Subject from '../models/Subject.model.js';
import { createPaginatedResponse, createSearchRegex, parseListQuery, resolveSort } from '../utils/query.js';

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
    const subjects = await Subject.find(query).skip(skip).limit(limit).sort(sort);
    res.json(createPaginatedResponse({ data: subjects, total, page, limit }));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/subjects/:id
export const getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });
    res.json({ success: true, data: subject });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/subjects
export const createSubject = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      isGroupSpecific: Array.isArray(req.body.applicableGroups) && req.body.applicableGroups.length > 0,
    };
    const subject = await Subject.create(payload);
    res.status(201).json({ success: true, data: subject, message: 'Subject created.' });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ success: false, message: 'Subject code already exists.' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/subjects/:id
export const updateSubject = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      isGroupSpecific: Array.isArray(req.body.applicableGroups) && req.body.applicableGroups.length > 0,
    };
    const subject = await Subject.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });
    res.json({ success: true, data: subject, message: 'Subject updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/subjects/:id
export const deleteSubject = async (req, res) => {
  try {
    await Subject.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Subject deactivated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export default { getSubjects, getSubjectById, createSubject, updateSubject, deleteSubject };
