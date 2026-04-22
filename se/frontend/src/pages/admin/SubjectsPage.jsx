import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiBookOpen } from 'react-icons/fi';
import api from '../../api/axios.js';
import useListParams from '../../hooks/useListParams.js';
import useAcademicYear from '../../hooks/useAcademicYear.js';
import useTeacherScope from '../../hooks/useTeacherScope.js';
import { applyClientListOperations } from '../../utils/listUtils.js';
import {
  PageHeader,
  Modal,
  SearchInput,
  FilterSelect,
} from '../../components/common/index.jsx';

const GRADE_LEVELS = ['pre_primary', 'primary', 'middle', 'secondary', 'higher_secondary'];
const GROUPS = [
  { value: 'science_biology', label: 'Maths Biology' },
  { value: 'science_maths', label: 'Computer Maths' },
  { value: 'commerce', label: 'Business Maths' },
  { value: 'arts', label: 'Arts Computer' },
];
const TYPES = ['regular', 'lab', 'library', 'pt', 'assembly', 'activity', 'language'];
const RESOURCES = [null, 'library', 'physics_lab', 'chemistry_lab', 'bio_lab', 'computer_lab', 'pt_ground'];
const SUBJECT_SECTIONS = [
  { key: 'pre_primary', title: 'Pre Primary Subjects', description: 'Subjects added for pre-primary classes.' },
  { key: 'primary', title: 'Primary Subjects', description: 'Subjects added for primary classes.' },
  { key: 'middle', title: 'Middle School Subjects', description: 'Subjects added for middle school classes.' },
  { key: 'secondary', title: 'Secondary Subjects', description: 'Subjects added for secondary classes.' },
  { key: 'science_biology', title: '11/12 Maths Biology Subjects', description: 'Subjects added for the Maths Biology stream.' },
  { key: 'science_maths', title: '11/12 Computer Maths Subjects', description: 'Subjects added for the Computer Maths stream.' },
  { key: 'commerce', title: '11/12 Business Maths Subjects', description: 'Subjects added for the Business Maths stream.' },
  { key: 'arts', title: '11/12 Arts Computer Subjects', description: 'Subjects added for the Arts Computer stream.' },
];

const empty = {
  name: '',
  code: '',
  type: 'regular',
  periodsPerWeek: 5,
  color: '#4F46E5',
  applicableGradeLevels: [],
  applicableGroups: [],
  isResourceBased: false,
  resourceType: null,
};

export default function SubjectsPage() {
  const academicYear = useAcademicYear();
  const { isTeacherRole, isClassTeacherRole, teacherId, classTeacherOf, eligibleSubjectIds, teacher } = useTeacherScope();
  const [subjects, setSubjects] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [classAssignments, setClassAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const {
    search,
    setSearch,
    filters,
    setFilter,
    sortBy,
    sortOrder,
    params,
  } = useListParams({
    initialFilters: { gradeLevel: '' },
    initialLimit: 20,
    initialSortBy: 'name',
    initialSortOrder: 'asc',
  });

  const load = useCallback(() => {
    setLoading(true);
    const request = !isTeacherRole
      ? Promise.all([
          api.get('/subjects', { params: { ...params, includeInactive: false } }),
        ])
      : Promise.all([
          api.get(`/class-subjects/teacher/${teacherId}`, { params: { academicYear } }),
          ...(isClassTeacherRole && classTeacherOf
            ? [api.get('/class-subjects', { params: { classId: classTeacherOf, academicYear } })]
            : []),
        ]);

    request
      .then(([primaryResponse, classResponse]) => {
        if (isTeacherRole) {
          setTeacherAssignments(primaryResponse.data.data || []);
          setClassAssignments(classResponse?.data?.data || []);
          setSubjects([]);
          return;
        }
        setSubjects(primaryResponse.data.data);
        setTeacherAssignments([]);
        setClassAssignments([]);
      })
      .catch(() => toast.error('Failed to load subjects.'))
      .finally(() => setLoading(false));
  }, [params, isTeacherRole, isClassTeacherRole, teacherId, classTeacherOf, academicYear]);

  useEffect(() => {
    load();
  }, [load]);

  const openModal = (subject = null) => {
    if (subject) {
      setForm({
        ...empty,
        ...subject,
        applicableGradeLevels: subject.applicableGradeLevels || [],
        applicableGroups: subject.applicableGroups || [],
      });
      setEditItem(subject);
    } else {
      setForm(empty);
      setEditItem(null);
    }

    setModal(true);
  };

  const toggleArr = (key, value) => setForm(current => ({
    ...current,
    [key]: current[key].includes(value)
      ? current[key].filter(item => item !== value)
      : [...current[key], value],
  }));

  const handleSave = async () => {
    if (!form.name || !form.code || !form.applicableGradeLevels.length) {
      toast.error('Name, code, and at least one grade level required.');
      return;
    }

    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/subjects/${editItem._id}`, form);
        toast.success('Subject updated.');
      } else {
        await api.post('/subjects', form);
        toast.success('Subject created.');
      }

      setModal(false);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Deactivate this subject?')) return;

    try {
      await api.delete(`/subjects/${id}`);
      toast.success('Subject deactivated.');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed.');
    }
  };

  const hsSubjects = form.applicableGradeLevels.includes('higher_secondary');
  const filteredSubjects = useMemo(() => applyClientListOperations({
    data: subjects,
    search,
    searchFields: [subject => `${subject.name} ${subject.code}`],
    filters,
    filterFns: {
      gradeLevel: (subject, value) => subject.applicableGradeLevels?.includes(value),
    },
    sortBy,
    sortOrder,
    sortAccessors: {
      name: subject => subject.name,
      code: subject => subject.code,
      type: subject => subject.type,
      periodsPerWeek: subject => subject.periodsPerWeek,
    },
  }), [subjects, search, filters, sortBy, sortOrder]);
  const groupedSections = useMemo(() => SUBJECT_SECTIONS.map(section => {
    const sectionSubjects = filteredSubjects.filter(subject => {
      if (GRADE_LEVELS.includes(section.key)) {
        return subject.applicableGradeLevels?.includes(section.key);
      }

      return subject.applicableGradeLevels?.includes('higher_secondary')
        && (
          !subject.applicableGroups?.length
          || subject.applicableGroups.includes(section.key)
        );
    });

    return {
      ...section,
      subjects: sectionSubjects,
      totalPeriods: sectionSubjects.reduce((sum, subject) => sum + (subject.periodsPerWeek || 0), 0),
    };
  }).filter(section => section.subjects.length > 0), [filteredSubjects]);

  const teacherSections = useMemo(() => {
    if (!isTeacherRole) return [];

    const grouped = new Map();
    teacherAssignments.forEach(assignment => {
      const key = assignment.class?._id || 'unassigned';
      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          title: assignment.class?.displayName || 'Assigned Class',
          assignments: [],
        });
      }
      grouped.get(key).assignments.push(assignment);
    });

    return [...grouped.values()];
  }, [isTeacherRole, teacherAssignments]);

  const classTeacherOwnAssignments = useMemo(() => {
    if (!isClassTeacherRole || !classTeacherOf) return [];
    const directAssignments = teacherAssignments.filter(assignment => String(assignment.class?._id) === String(classTeacherOf));
    const directSubjectIds = new Set(directAssignments.map(assignment => String(assignment.subject?._id || '')));

    const fallbackAssignments = classAssignments
      .filter(assignment => (
        !assignment.teacher
        && eligibleSubjectIds.includes(String(assignment.subject?._id || ''))
        && !directSubjectIds.has(String(assignment.subject?._id || ''))
      ))
      .map(assignment => ({
        ...assignment,
        teacher: teacher
          ? {
              _id: teacher._id,
              firstName: teacher.firstName,
              lastName: teacher.lastName,
              employeeId: teacher.employeeId,
            }
          : assignment.teacher,
      }));

    return [...directAssignments, ...fallbackAssignments];
  }, [isClassTeacherRole, classTeacherOf, teacherAssignments, classAssignments, eligibleSubjectIds, teacher]);

  const classAssignmentsForDisplay = useMemo(() => {
    if (!isClassTeacherRole || !classTeacherOf) return classAssignments;

    return classAssignments.map(assignment => (
      !assignment.teacher && eligibleSubjectIds.includes(String(assignment.subject?._id || '')) && teacher
        ? {
            ...assignment,
            teacher: {
              _id: teacher._id,
              firstName: teacher.firstName,
              lastName: teacher.lastName,
              employeeId: teacher.employeeId,
            },
          }
        : assignment
    ));
  }, [isClassTeacherRole, classTeacherOf, classAssignments, eligibleSubjectIds, teacher]);

  const classTeacherTitle = useMemo(() => {
    return classAssignmentsForDisplay[0]?.class?.displayName
      || teacherAssignments.find(assignment => String(assignment.class?._id) === String(classTeacherOf))?.class?.displayName
      || 'My Class';
  }, [classAssignmentsForDisplay, teacherAssignments, classTeacherOf]);

  return (
    <div className="float-in">
      <PageHeader
        title="Subjects"
        subtitle={isTeacherRole ? 'Subjects assigned to you' : `${filteredSubjects.length} subjects`}
        actions={!isTeacherRole ? <button onClick={() => openModal()} className="btn-primary"><FiPlus />Add Subject</button> : null}
      />

      {!isTeacherRole && <div className="campus-panel mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by subject name or code..." />
          <FilterSelect
            value={filters.gradeLevel}
            onChange={value => setFilter('gradeLevel', value)}
            placeholder="All Grade Levels"
            options={GRADE_LEVELS.map(level => ({ value: level, label: level.replace(/_/g, ' ') }))}
          />
        </div>
      </div>}

      <div className="space-y-4">
        {loading ? (
          <div className="campus-panel px-5 py-12 text-center text-sm text-text-secondary">Loading subjects...</div>
        ) : isClassTeacherRole && classTeacherOf ? (
          <>
            <div className="campus-panel overflow-hidden">
              <div className="border-b border-border px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">My Teaching Subjects</p>
                <h2 className="mt-1 text-lg font-bold text-text-primary">{classTeacherTitle}</h2>
                <p className="mt-1 text-sm text-text-secondary">Subjects personally handled by you in this class.</p>
              </div>

              {classTeacherOwnAssignments.length === 0 ? (
                <div className="px-5 py-8 text-sm text-text-secondary">No direct subject assignments found for you in this class.</div>
              ) : (
                <div className="divide-y divide-border">
                  {classTeacherOwnAssignments.map(assignment => (
                    <div key={assignment._id} className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-3">
                          <span className="mt-1 h-3.5 w-3.5 shrink-0 border" style={{ background: assignment.subject?.color }} />
                          <div className="min-w-0">
                            <p className="font-semibold text-text-primary">{assignment.subject?.name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="text-xs text-text-secondary">{assignment.subject?.code}</span>
                              <span className="badge-blue">{assignment.subject?.type}</span>
                              <span className="badge-gray">{assignment.periodsPerWeek} periods/week</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="campus-panel overflow-hidden">
              <div className="border-b border-border px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">All Subjects In My Class</p>
                <h2 className="mt-1 text-lg font-bold text-text-primary">{classTeacherTitle}</h2>
                <p className="mt-1 text-sm text-text-secondary">Complete subject list for your class with the assigned teacher for each subject.</p>
              </div>

              {classAssignmentsForDisplay.length === 0 ? (
                <div className="px-5 py-8 text-sm text-text-secondary">No subject allocations found for this class.</div>
              ) : (
                <div className="divide-y divide-border">
                  {classAssignmentsForDisplay.map(assignment => (
                    <div key={assignment._id} className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-3">
                          <span className="mt-1 h-3.5 w-3.5 shrink-0 border" style={{ background: assignment.subject?.color }} />
                          <div className="min-w-0">
                            <p className="font-semibold text-text-primary">{assignment.subject?.name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="text-xs text-text-secondary">{assignment.subject?.code}</span>
                              <span className="badge-blue">{assignment.subject?.type}</span>
                              <span className="badge-gray">{assignment.periodsPerWeek} periods/week</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-text-secondary">
                        <span className="font-semibold text-text-primary">Teacher:</span>{' '}
                        {assignment.teacher ? `${assignment.teacher.firstName} ${assignment.teacher.lastName}` : 'Not assigned'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : isTeacherRole ? (
          teacherSections.length === 0 ? (
            <div className="campus-panel px-5 py-12 text-center">
              <FiBookOpen className="mx-auto text-3xl text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-text-primary">No assigned subjects found</p>
              <p className="mt-1 text-sm text-text-secondary">This teacher does not have any subject allocations in the selected academic year.</p>
            </div>
          ) : teacherSections.map(section => (
            <div key={section.key} className="campus-panel overflow-hidden">
              <div className="border-b border-border px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Class</p>
                <h2 className="mt-1 text-lg font-bold text-text-primary">{section.title}</h2>
                <p className="mt-1 text-sm text-text-secondary">Subjects assigned to this teacher for the class.</p>
              </div>

              <div className="divide-y divide-border">
                {section.assignments.map(assignment => (
                  <div key={assignment._id} className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        <span className="mt-1 h-3.5 w-3.5 shrink-0 border" style={{ background: assignment.subject?.color }} />
                        <div className="min-w-0">
                          <p className="font-semibold text-text-primary">{assignment.subject?.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-text-secondary">{assignment.subject?.code}</span>
                            <span className="badge-blue">{assignment.subject?.type}</span>
                            <span className="badge-gray">{assignment.periodsPerWeek} periods/week</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : groupedSections.length === 0 ? (
          <div className="campus-panel px-5 py-12 text-center">
            <FiBookOpen className="mx-auto text-3xl text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-text-primary">No subjects found</p>
            <p className="mt-1 text-sm text-text-secondary">Add subjects first, then they will appear under the correct grade or stream section.</p>
          </div>
        ) : groupedSections.map(section => (
          <div key={section.key} className="campus-panel overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
                    {GRADE_LEVELS.includes(section.key) ? 'Grade Section' : '11/12 Stream Section'}
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-text-primary">{section.title}</h2>
                  <p className="mt-1 text-sm text-text-secondary">{section.description}</p>
                </div>
                <div className="flex gap-3">
                  <div className="rounded border border-border bg-slate-50 px-4 py-2 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Subjects</p>
                    <p className="mt-1 text-lg font-bold text-text-primary">{section.subjects.length}</p>
                  </div>
                  <div className="rounded border border-border bg-slate-50 px-4 py-2 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Periods/Week</p>
                    <p className="mt-1 text-lg font-bold text-text-primary">{section.totalPeriods}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="divide-y divide-border">
              {section.subjects.map(subject => (
                <div key={`${section.key}-${subject._id}`} className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 h-3.5 w-3.5 shrink-0 border" style={{ background: subject.color }} />
                      <div className="min-w-0">
                        <p className="font-semibold text-text-primary">{subject.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-text-secondary">{subject.code}</span>
                          <span className="badge-blue">{subject.type}</span>
                          <span className="badge-gray">{subject.periodsPerWeek} periods/week</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openModal(subject)} className="btn-icon btn-sm" title="Edit subject"><FiEdit2 /></button>
                    <button onClick={() => handleDelete(subject._id)} className="btn-icon btn-sm text-red-600" title="Deactivate subject"><FiTrash2 /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!isTeacherRole && <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editItem ? 'Edit Subject' : 'Add Subject'}
        size="lg"
        footer={(
          <>
            <button onClick={() => setModal(false)} className="btn-secondary btn-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm">{saving ? 'Saving...' : editItem ? 'Update' : 'Create'}</button>
          </>
        )}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group"><label className="label">Subject Name *</label><input className="input" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></div>
            <div className="form-group"><label className="label">Subject Code *</label><input className="input" placeholder="e.g. MATH" value={form.code} onChange={event => setForm(current => ({ ...current, code: event.target.value.toUpperCase() }))} /></div>
            <div className="form-group"><label className="label">Type</label><select className="input" value={form.type} onChange={event => setForm(current => ({ ...current, type: event.target.value }))}>{TYPES.map(type => <option key={type} value={type}>{type}</option>)}</select></div>
            <div className="form-group"><label className="label">Periods Per Week</label><input type="number" className="input" min="1" max="10" value={form.periodsPerWeek} onChange={event => setForm(current => ({ ...current, periodsPerWeek: Number(event.target.value) }))} /></div>
            <div className="form-group"><label className="label">Color</label><input type="color" className="input h-11 cursor-pointer" value={form.color} onChange={event => setForm(current => ({ ...current, color: event.target.value }))} /></div>
          </div>

          <div className="form-group">
            <label className="label">Applicable Grade Levels *</label>
            <div className="flex flex-wrap gap-2">
              {GRADE_LEVELS.map(level => (
                <label key={level} className="flex cursor-pointer items-center gap-2 border border-border px-3 py-1.5 text-xs transition hover:border-primary-400">
                  <input type="checkbox" checked={form.applicableGradeLevels.includes(level)} onChange={() => toggleArr('applicableGradeLevels', level)} className="accent-primary-700" />
                  {level.replace(/_/g, ' ')}
                </label>
              ))}
            </div>
          </div>

          {hsSubjects && (
            <div className="form-group border border-amber-200 bg-amber-50 p-3">
              <label className="label text-amber-700">Grade 11 & 12 Groups (leave empty = common to all groups)</label>
              <p className="mb-2 text-xs text-amber-600">Select groups only if this subject belongs to a specific stream.</p>
              <div className="flex flex-wrap gap-2">
                {GROUPS.map(group => (
                  <label key={group.value} className="flex cursor-pointer items-center gap-2 border border-amber-300 bg-white px-3 py-1.5 text-xs transition hover:border-amber-500">
                    <input type="checkbox" checked={form.applicableGroups.includes(group.value)} onChange={() => toggleArr('applicableGroups', group.value)} className="accent-amber-600" />
                    {group.label}
                  </label>
                ))}
              </div>
              {form.applicableGroups.length === 0 && <p className="mt-1 text-xs text-amber-600">Subject will appear for all Grade 11 and 12 groups.</p>}
              {form.applicableGroups.length > 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  Subject will appear only for: {form.applicableGroups.map(groupValue => GROUPS.find(group => group.value === groupValue)?.label || groupValue).join(', ')}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isResourceBased} onChange={event => setForm(current => ({ ...current, isResourceBased: event.target.checked }))} className="accent-primary-700" />
              Resource-Based Period (Lab/Library/PT)
            </label>
          </div>

          {form.isResourceBased && (
            <div className="form-group">
              <label className="label">Resource Type</label>
              <select className="input" value={form.resourceType || ''} onChange={event => setForm(current => ({ ...current, resourceType: event.target.value || null }))}>
                <option value="">None</option>
                {RESOURCES.filter(Boolean).map(resource => <option key={resource} value={resource}>{resource.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          )}
        </div>
      </Modal>}
    </div>
  );
}
