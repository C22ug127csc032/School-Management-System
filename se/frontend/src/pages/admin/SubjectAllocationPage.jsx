import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiEdit2, FiAlertCircle, FiBookOpen } from 'react-icons/fi';
import api from '../../api/axios.js';
import useAcademicYear from '../../hooks/useAcademicYear.js';
import { PageHeader, SearchableSelect, Modal, PageLoader, EmptyState } from '../../components/common/index.jsx';
import useTeacherScope from '../../hooks/useTeacherScope.js';

const GROUP_LABELS = {
  science_biology: 'Maths Biology', science_maths: 'Computer Maths',
  commerce: 'Business Maths', arts: 'Arts Computer',
};

const GRADE_LEVEL_LABELS = {
  pre_primary: 'Pre Primary',
  primary: 'Primary',
  middle: 'Middle',
  secondary: 'Secondary',
  higher_secondary: 'Higher Secondary',
};

export default function SubjectAllocationPage() {
  const academicYear = useAcademicYear();
  const { isTeacherRole, isAdminRole, classTeacherOf } = useTeacherScope();
  const [classes,       setClasses]       = useState([]);
  const [assignments,   setAssignments]   = useState([]);
  const [availSubjects, setAvailSubjects] = useState([]);
  const [teachers,      setTeachers]      = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [classInfo,     setClassInfo]     = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [modal,         setModal]         = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [form,          setForm]          = useState({ subjectId: '', teacherId: '', periodsPerWeek: 5 });
  const [saving,        setSaving]        = useState(false);

  useEffect(() => {
    if (isTeacherRole && classTeacherOf && !selectedClass) {
      setSelectedClass(classTeacherOf);
    }
  }, [isTeacherRole, classTeacherOf, selectedClass]);

  useEffect(() => {
    api.get('/classes', { params: { academicYear } }).then(r => setClasses(r.data.data)).catch(() => {});
    api.get('/teachers').then(r => setTeachers(r.data.data)).catch(() => {});
  }, [academicYear]);

  const loadAssignments = useCallback(async (classId) => {
    if (!classId) return;
    setLoading(true);
    try {
      const [aRes, sRes] = await Promise.all([
        api.get('/class-subjects', { params: { classId, academicYear } }),
        api.get('/class-subjects/available-subjects', { params: { classId, academicYear } }),
      ]);
      setAssignments(aRes.data.data);
      setClassInfo(aRes.data.class);
      setAvailSubjects(sRes.data.data);
    } catch { toast.error('Failed to load.'); }
    finally { setLoading(false); }
  }, [academicYear]);

  useEffect(() => { loadAssignments(selectedClass); }, [selectedClass, loadAssignments]);

  const closeModal = () => {
    setModal(false);
    setEditingAssignment(null);
    setForm({ subjectId: '', teacherId: '', periodsPerWeek: 5 });
  };

  const handleAssign = async () => {
    if (!form.subjectId) return toast.error('Select a subject.');
    setSaving(true);
    try {
      await api.post('/class-subjects', {
        classId: selectedClass, subjectId: form.subjectId,
        teacherId: form.teacherId || null, periodsPerWeek: form.periodsPerWeek, academicYear,
      });
      toast.success('Subject assigned.');
      closeModal();
      loadAssignments(selectedClass);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const handleEdit = (assignment) => {
    setEditingAssignment(assignment);
    setForm({
      subjectId: assignment.subject?._id || '',
      teacherId: assignment.teacher?._id || '',
      periodsPerWeek: assignment.periodsPerWeek || 5,
    });
    setModal(true);
  };

  const handleUpdate = async () => {
    if (!editingAssignment) return;
    setSaving(true);
    try {
      await api.put(`/class-subjects/${editingAssignment._id}`, {
        teacherId: form.teacherId || null,
        periodsPerWeek: form.periodsPerWeek,
      });
      toast.success('Subject allocation updated.');
      closeModal();
      loadAssignments(selectedClass);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const handleRemove = async (id) => {
    try {
      await api.delete(`/class-subjects/${id}`);
      toast.success('Subject removed.');
      loadAssignments(selectedClass);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
  };

  const classOptions = classes.map(c => ({
    value: c._id,
    label: c.displayName || `Grade ${c.grade}-${c.section}`,
  }));
  const subjectOptions = availSubjects.map(s => ({ value: s._id, label: `${s.name} (${s.code})` }));
  const selectedClassObj = classInfo || classes.find(c => c._id === selectedClass) || null;
  const selectedSubjectObj = availSubjects.find(subject => subject._id === form.subjectId)
    || assignments.find(assignment => assignment.subject?._id === form.subjectId)?.subject
    || null;
  const matchingTeachers = useMemo(() => {
    if (!selectedClassObj) return teachers;

    const classGradeLevel = selectedClassObj.gradeLevel;
    const subjectId = form.subjectId;

    return teachers.filter(teacher => {
      const teacherGradeLevels = teacher.eligibleGradeLevels || [];
      const teacherSubjects = (teacher.eligibleSubjects || []).map(subject => String(subject?._id || subject));

      const matchesGradeLevel = !classGradeLevel || teacherGradeLevels.length === 0 || teacherGradeLevels.includes(classGradeLevel);
      const matchesSubject = !subjectId || teacherSubjects.length === 0 || teacherSubjects.includes(String(subjectId));

      return matchesGradeLevel && matchesSubject;
    });
  }, [teachers, selectedClassObj, form.subjectId]);
  const fallbackTeacherOptions = useMemo(() => {
    const classGradeLevel = selectedClassObj?.gradeLevel;
    return teachers.map(teacher => {
      const subjectCodes = (teacher.eligibleSubjects || []).map(subject => subject?.code || subject?.name).filter(Boolean).slice(0, 2);
      const gradeLabel = classGradeLevel && (teacher.eligibleGradeLevels || []).includes(classGradeLevel)
        ? `Eligible for ${GRADE_LEVEL_LABELS[classGradeLevel] || classGradeLevel}`
        : '';
      const suffixParts = [gradeLabel, subjectCodes.length ? subjectCodes.join(', ') : 'All subjects'];

      return {
        value: teacher._id,
        label: `${teacher.firstName} ${teacher.lastName}${suffixParts.length ? ` — ${suffixParts.filter(Boolean).join(' • ')}` : ''}`,
      };
    });
  }, [teachers, selectedClassObj]);
  const matchedTeacherOptions = useMemo(() => matchingTeachers.map(teacher => {
    const subjectCodes = (teacher.eligibleSubjects || []).map(subject => subject?.code || subject?.name).filter(Boolean).slice(0, 2);
    const suffixParts = [
      selectedClassObj?.gradeLevel ? `Eligible for ${GRADE_LEVEL_LABELS[selectedClassObj.gradeLevel] || selectedClassObj.gradeLevel}` : '',
      subjectCodes.length ? subjectCodes.join(', ') : 'All subjects',
    ];

    return {
      value: teacher._id,
      label: `${teacher.firstName} ${teacher.lastName}${suffixParts.filter(Boolean).length ? ` — ${suffixParts.filter(Boolean).join(' • ')}` : ''}`,
    };
  }), [matchingTeachers, selectedClassObj]);
  const hasTeacherMatches = matchingTeachers.length > 0;
  const teacherOptions = [{ value: '', label: 'No teacher yet' }, ...(hasTeacherMatches ? matchedTeacherOptions : fallbackTeacherOptions)];
  const totalPeriods = useMemo(
    () => assignments.reduce((sum, assignment) => sum + (assignment.periodsPerWeek || 0), 0),
    [assignments]
  );
  const selectedClassHeading = classInfo?.displayName
    || classes.find(c => c._id === selectedClass)?.displayName
    || classOptions.find(option => option.value === selectedClass)?.label
    || 'Selected Class';

  useEffect(() => {
    if (!form.teacherId) return;
    if (teacherOptions.some(option => option.value === form.teacherId)) return;
    setForm(current => ({ ...current, teacherId: '' }));
  }, [form.teacherId, teacherOptions]);

  return (
    <div className="float-in">
      <PageHeader
        title="Subject Allocation"
        subtitle="View subjects and assigned teachers for each class"
        actions={isAdminRole && selectedClass && (
          <button onClick={() => {
            setEditingAssignment(null);
            setForm({ subjectId: '', teacherId: '', periodsPerWeek: 5 });
            setModal(true);
          }} className="btn-primary"><FiPlus /> Assign Subject</button>
        )}
      />

      <div className="campus-panel mb-4 p-4">
        <div className="max-w-md">
          <label className="label">Select Class</label>
          <SearchableSelect options={classOptions} value={selectedClass}
            onChange={v => setSelectedClass(v)} placeholder="Choose a class..." />
        </div>

        {classInfo?.classType === 'group' && (
          <div className="mt-3 border border-amber-200 bg-amber-50 p-3">
            <div className="flex gap-2">
              <FiAlertCircle className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-700">Grade 11/12 Group: {GROUP_LABELS[classInfo.groupName]}</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Only subjects applicable to the <strong>{GROUP_LABELS[classInfo.groupName]}</strong> group are shown for assignment.
                  Biology cannot be assigned to Commerce classes and vice versa.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {!selectedClass && <EmptyState icon={FiEdit2} title="Select a class" description="Choose a class to manage its subject assignments." />}

      {selectedClass && loading && <PageLoader />}

      {selectedClass && !loading && (
        <div className="campus-panel overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Class</p>
                <h2 className="mt-1 text-xl font-bold text-text-primary">{selectedClassHeading}</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {assignments.length} subject{assignments.length !== 1 ? 's' : ''} assigned to this class
                </p>
              </div>
              <div className="flex gap-3">
                <div className="rounded border border-border bg-slate-50 px-4 py-2 text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Subjects</p>
                  <p className="mt-1 text-lg font-bold text-text-primary">{assignments.length}</p>
                </div>
                <div className="rounded border border-border bg-slate-50 px-4 py-2 text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Periods/Week</p>
                  <p className="mt-1 text-lg font-bold text-text-primary">{totalPeriods}</p>
                </div>
              </div>
            </div>
          </div>

          {assignments.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <FiBookOpen className="mx-auto text-3xl text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-text-primary">No subjects assigned yet</p>
              <p className="mt-1 text-sm text-text-secondary">Click `Assign Subject` to add subjects under this class.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {assignments.map(assignment => (
                <div key={assignment._id} className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 h-3 w-3 shrink-0 rounded-sm border" style={{ background: assignment.subject?.color }} />
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

                  <div className="flex items-center justify-between gap-3 md:min-w-[280px] md:justify-end">
                    <div className="text-left md:text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Teacher</p>
                      <p className="mt-1 text-sm text-text-primary">
                        {assignment.teacher ? `${assignment.teacher.firstName} ${assignment.teacher.lastName}` : 'Not assigned'}
                      </p>
                    </div>
                    {isAdminRole && (
                      <>
                        <button onClick={() => handleEdit(assignment)} className="btn-icon btn-sm" title="Edit subject allocation">
                          <FiEdit2 />
                        </button>
                        <button onClick={() => handleRemove(assignment._id)} className="btn-icon btn-sm text-red-600" title="Remove subject">
                          <FiTrash2 />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal
        open={modal}
        onClose={closeModal}
        title={editingAssignment ? 'Edit Subject Allocation' : 'Assign Subject to Class'}
        footer={
          <>
            <button onClick={closeModal} className="btn-secondary btn-sm">Cancel</button>
            <button onClick={editingAssignment ? handleUpdate : handleAssign} disabled={saving} className="btn-primary btn-sm">
              {saving ? (editingAssignment ? 'Saving...' : 'Assigning...') : (editingAssignment ? 'Update' : 'Assign')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="label">Subject</label>
            <SearchableSelect options={editingAssignment
              ? [{ value: editingAssignment.subject?._id, label: `${editingAssignment.subject?.name} (${editingAssignment.subject?.code})` }]
              : subjectOptions} value={form.subjectId}
              onChange={v => setForm(f => ({ ...f, subjectId: v }))}
              placeholder="Select subject..."
              disabled={Boolean(editingAssignment)} />
            {!editingAssignment && availSubjects.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">All eligible subjects have been assigned.</p>
            )}
            {editingAssignment && (
              <p className="mt-1 text-xs text-text-secondary">Subject cannot be changed here. You can update teacher and periods.</p>
            )}
          </div>
          <div className="form-group">
            <label className="label">Teacher</label>
            <SearchableSelect options={teacherOptions} value={form.teacherId}
              onChange={v => setForm(f => ({ ...f, teacherId: v }))} placeholder="Select teacher (optional)..." />
            {form.subjectId && hasTeacherMatches && (
              <p className="mt-1 text-xs text-emerald-700">
                Showing teachers eligible for {selectedSubjectObj?.name || 'the selected subject'} in {GRADE_LEVEL_LABELS[selectedClassObj?.gradeLevel] || 'this class level'}.
              </p>
            )}
            {form.subjectId && !hasTeacherMatches && (
              <p className="mt-1 text-xs text-amber-700">
                No exact eligible teacher match found for {selectedSubjectObj?.name || 'this subject'}, so all teachers are shown as a fallback.
              </p>
            )}
          </div>
          <div className="form-group">
            <label className="label">Periods Per Week</label>
            <input type="number" className="input" min="1" max="10"
              value={form.periodsPerWeek}
              onChange={e => setForm(f => ({ ...f, periodsPerWeek: Number(e.target.value) }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
