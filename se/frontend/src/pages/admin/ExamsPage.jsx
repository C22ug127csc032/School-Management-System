import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiBookOpen, FiEdit2, FiSave } from 'react-icons/fi';
import api from '../../api/axios.js';
import { EmptyState, PageHeader, PageLoader, SearchableSelect, StatusBadge } from '../../components/common/index.jsx';
import useAcademicYear from '../../hooks/useAcademicYear.js';
import useTeacherScope from '../../hooks/useTeacherScope.js';

const normalizeText = value => String(value || '').trim().toLowerCase();

const isSocialScienceSubject = subject => {
  const value = normalizeText(`${subject?.name || ''} ${subject?.code || ''}`);
  return value.includes('social science') || value.includes('socialscience');
};

const isScienceSubject = subject => {
  const value = normalizeText(`${subject?.name || ''} ${subject?.code || ''}`);
  return !isSocialScienceSubject(subject) && value.includes('science');
};

const getMarksStructure = subject => (
  isScienceSubject(subject)
    ? { theoryMaxMarks: 75, assessmentMaxMarks: 25, assessmentLabel: 'Practical / Internal' }
    : { theoryMaxMarks: 90, assessmentMaxMarks: 10, assessmentLabel: 'Internal' }
);

const createEmptyEntry = subjectId => ({
  subjectId,
  theoryMarks: '',
  theoryMaxMarks: 90,
  assessmentMarks: '',
  assessmentMaxMarks: 10,
  isAbsent: false,
  remarks: '',
  workflowStatus: 'draft',
});

const clampMarksInput = (value, maxMarks) => {
  if (value === '') return '';
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '';
  return String(Math.max(0, Math.min(numericValue, Number(maxMarks) || 0)));
};

const getSelectionStorageKey = academicYear => `exam-marks-selection:${academicYear}`;

const getWorkflowCopy = status => {
  if (status === 'published') return { label: 'Published', badge: 'active', hint: 'Visible to parents and students' };
  if (status === 'submitted_to_class_teacher') return { label: 'Submitted', badge: 'pending', hint: 'Waiting in class teacher review' };
  return { label: 'Draft', badge: 'inactive', hint: 'Not yet sent for review' };
};

const getEnteredByLabel = mark => mark?.enteredBy?.name || '';

function buildMarkSubjects(assignments, teacherId, isAdminRole) {
  const byId = new Map();

  assignments.forEach(assignment => {
    const subject = assignment?.subject;
    if (!subject) return;

    const normalizedSubject = subject.subjectRole === 'sub' && subject.parentSubject?._id
      ? { ...subject.parentSubject, _id: subject.parentSubject._id, code: subject.parentSubject.code || subject.code }
      : subject;

    const subjectId = String(normalizedSubject._id || '');
    if (!subjectId) return;

    if (!byId.has(subjectId)) {
      byId.set(subjectId, {
        subjectId,
        subject: normalizedSubject,
        structure: getMarksStructure(normalizedSubject),
        ownedByTeacher: false,
      });
    }

    const entry = byId.get(subjectId);
    const assignmentTeacherId = String(assignment?.teacher?._id || assignment?.teacher || '');
    if (isAdminRole || (teacherId && assignmentTeacherId === String(teacherId))) {
      entry.ownedByTeacher = true;
    }
  });

  return [...byId.values()].sort((left, right) => String(left.subject?.name || '').localeCompare(String(right.subject?.name || '')));
}

export default function ExamsPage() {
  const academicYear = useAcademicYear();
  const {
    user,
    isTeacherRole,
    isClassTeacherRole,
    isAdminRole,
    teacherId,
    classTeacherOf,
  } = useTeacherScope();

  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [markEntries, setMarkEntries] = useState({});
  const [savedMarks, setSavedMarks] = useState([]);
  const [studentMarksStatus, setStudentMarksStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [studentLoading, setStudentLoading] = useState(false);
  const [marksLoading, setMarksLoading] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);
  const [isEditMode, setIsEditMode] = useState(true);

  useEffect(() => {
    const loadBase = async () => {
      setLoading(true);
      try {
        const classParams = isTeacherRole ? { academicYear, teacherId } : { academicYear };
        const [examRes, classRes] = await Promise.all([
          api.get('/exams', { params: { academicYear } }),
          api.get('/classes', { params: classParams }),
        ]);

        setExams(examRes.data.data || []);
        setClasses(classRes.data.data || []);
      } catch {
        toast.error('Failed to load exams.');
      } finally {
        setLoading(false);
      }
    };

    loadBase();
  }, [academicYear, isTeacherRole, teacherId]);

  useEffect(() => {
    const saved = window.localStorage.getItem(getSelectionStorageKey(academicYear));
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      setSelectedExamId(parsed.selectedExamId || '');
      setSelectedClassId(parsed.selectedClassId || '');
      setSelectedStudentId(parsed.selectedStudentId || '');
    } catch {
      window.localStorage.removeItem(getSelectionStorageKey(academicYear));
    }
  }, [academicYear]);

  useEffect(() => {
    window.localStorage.setItem(getSelectionStorageKey(academicYear), JSON.stringify({
      selectedExamId,
      selectedClassId,
      selectedStudentId,
    }));
  }, [academicYear, selectedExamId, selectedClassId, selectedStudentId]);

  useEffect(() => {
    if (isTeacherRole && classTeacherOf && !selectedClassId && classes.some(item => String(item._id) === String(classTeacherOf))) {
      setSelectedClassId(classTeacherOf);
    }
  }, [classTeacherOf, classes, isTeacherRole, selectedClassId]);

  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      setClassSubjects([]);
      setSelectedStudentId('');
      return;
    }

    setStudentLoading(true);
    const subjectUrl = isClassTeacherRole && classTeacherOf && String(selectedClassId) === String(classTeacherOf)
      ? '/class-subjects'
      : (isTeacherRole ? `/class-subjects/teacher/${teacherId}` : '/class-subjects');

    Promise.all([
      api.get('/students', { params: { classId: selectedClassId, status: 'active', limit: 200, academicYear } }),
      api.get(subjectUrl, { params: { classId: selectedClassId, academicYear } }),
    ])
      .then(([studentRes, subjectRes]) => {
        const nextStudents = studentRes.data.data || [];
        setStudents(nextStudents);
        setClassSubjects(subjectRes.data.data || []);
        setSelectedStudentId(current => nextStudents.some(item => String(item._id) === String(current)) ? current : (nextStudents[0]?._id || ''));
      })
      .catch(() => {
        toast.error('Failed to load class students or subjects.');
        setStudents([]);
        setClassSubjects([]);
      })
      .finally(() => setStudentLoading(false));
  }, [selectedClassId, academicYear, isTeacherRole, isClassTeacherRole, teacherId, classTeacherOf]);

  const markSubjects = useMemo(
    () => buildMarkSubjects(classSubjects, teacherId, isAdminRole),
    [classSubjects, teacherId, isAdminRole],
  );

  useEffect(() => {
    if (!selectedExamId || !selectedClassId || !selectedStudentId) {
      setSavedMarks([]);
      setMarkEntries({});
      setIsEditMode(true);
      return;
    }

    setMarksLoading(true);
    api.get('/exams/marks', {
      params: {
        examId: selectedExamId,
        classId: selectedClassId,
        studentId: selectedStudentId,
        academicYear,
      },
    })
      .then(response => {
        const nextMarks = response.data.data || [];
        setSavedMarks(nextMarks);
        setIsEditMode(nextMarks.length === 0);

        const nextEntries = {};
        markSubjects.forEach(item => {
          const existing = nextMarks.find(mark => String(mark.subject?._id || mark.subject) === item.subjectId);
          nextEntries[item.subjectId] = {
            subjectId: item.subjectId,
            theoryMarks: existing?.theoryMarks ?? '',
            theoryMaxMarks: existing?.theoryMaxMarks ?? item.structure.theoryMaxMarks,
            assessmentMarks: existing?.assessmentMarks ?? '',
            assessmentMaxMarks: existing?.assessmentMaxMarks ?? item.structure.assessmentMaxMarks,
            isAbsent: existing?.isAbsent ?? false,
            remarks: existing?.remarks ?? '',
            workflowStatus: existing?.workflowStatus || 'draft',
          };
        });
        setMarkEntries(nextEntries);
      })
      .catch(() => toast.error('Failed to load marks.'))
      .finally(() => setMarksLoading(false));
  }, [selectedExamId, selectedClassId, selectedStudentId, academicYear, markSubjects]);

  useEffect(() => {
    if (!selectedExamId || !selectedClassId) {
      setStudentMarksStatus({});
      return;
    }

    api.get('/exams/marks', {
      params: {
        examId: selectedExamId,
        classId: selectedClassId,
        academicYear,
      },
    })
      .then(response => {
        const nextStatus = {};
        (response.data.data || []).forEach(mark => {
          const studentIdKey = String(mark.student?._id || mark.student || '');
          if (!studentIdKey) return;
          nextStatus[studentIdKey] = nextStatus[studentIdKey] || { entered: false, published: false };
          nextStatus[studentIdKey].entered = true;
          if (mark.workflowStatus === 'published') nextStatus[studentIdKey].published = true;
        });
        setStudentMarksStatus(nextStatus);
      })
      .catch(() => setStudentMarksStatus({}));
  }, [selectedExamId, selectedClassId, academicYear]);

  const handleMarkChange = (subjectId, key, value) => {
    const currentEntry = markEntries[subjectId] || createEmptyEntry(subjectId);
    let nextValue = value;

    if (key === 'theoryMarks') nextValue = clampMarksInput(value, currentEntry.theoryMaxMarks);
    if (key === 'assessmentMarks') nextValue = clampMarksInput(value, currentEntry.assessmentMaxMarks);

    setMarkEntries(current => ({
      ...current,
      [subjectId]: {
        ...(current[subjectId] || createEmptyEntry(subjectId)),
        [key]: nextValue,
      },
    }));
  };

  const ownedSubjects = markSubjects.filter(item => item.ownedByTeacher || isAdminRole);
  const selectedExam = exams.find(item => String(item._id) === String(selectedExamId));
  const selectedClass = classes.find(item => String(item._id) === String(selectedClassId));
  const selectedStudent = students.find(item => String(item._id) === String(selectedStudentId));
  const canShowMarksTable = Boolean(selectedExamId && selectedClassId && selectedStudentId);
  const subjectStatusMap = savedMarks.reduce((acc, mark) => {
    acc[String(mark.subject?._id || mark.subject)] = mark;
    return acc;
  }, {});
  const completionCount = markSubjects.filter(item => subjectStatusMap[item.subjectId]).length;
  const allSubjectsReady = markSubjects.length > 0 && completionCount === markSubjects.length;
  const hasPublishedMarks = savedMarks.some(mark => mark.workflowStatus === 'published');
  const handleSaveMarks = async () => {
    if (!selectedExamId || !selectedClassId || !selectedStudentId) {
      return toast.error('Select exam, class, and student first.');
    }
    if (!ownedSubjects.length) {
      return toast.error('No subject rows are assigned to you for mark entry.');
    }

    const payload = ownedSubjects.map(item => {
      const entry = markEntries[item.subjectId] || createEmptyEntry(item.subjectId);
      return {
        examId: selectedExamId,
        studentId: selectedStudentId,
        subjectId: item.subjectId,
        classId: selectedClassId,
        academicYear,
        theoryMarks: Number(entry.theoryMarks || 0),
        theoryMaxMarks: Number(entry.theoryMaxMarks || item.structure.theoryMaxMarks),
        assessmentMarks: Number(entry.assessmentMarks || 0),
        assessmentMaxMarks: Number(entry.assessmentMaxMarks || item.structure.assessmentMaxMarks),
        isAbsent: Boolean(entry.isAbsent),
        remarks: entry.remarks || '',
      };
    });

    setSavingMarks(true);
    try {
      const response = await api.post('/exams/marks', { marks: payload });
      toast.success(response.data.message || 'Marks submitted.');

      const refreshed = await api.get('/exams/marks', {
        params: {
          examId: selectedExamId,
          classId: selectedClassId,
          studentId: selectedStudentId,
          academicYear,
        },
      });
      setSavedMarks(refreshed.data.data || []);
      setIsEditMode(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save marks.');
    } finally {
      setSavingMarks(false);
    }
  };

  const studentOptions = students.map(item => {
    const status = studentMarksStatus[String(item._id)] || { entered: false, published: false };
    return {
      value: item._id,
      label: `${item.firstName} ${item.lastName}${item.rollNo ? ` (${item.rollNo})` : ''}`,
      hasMarks: status.entered,
      isPublished: status.published,
    };
  });

  const classOptions = classes.map(item => ({ value: item._id, label: item.displayName || `Grade ${item.grade}-${item.section}` }));
  const examOptions = exams.map(item => ({ value: item._id, label: item.name }));

  const summaryCards = [
    { label: 'Subjects In Class', value: markSubjects.length },
    { label: 'Marks Received', value: completionCount },
    { label: 'My Subjects', value: ownedSubjects.length },
    { label: 'Portal Status', value: hasPublishedMarks ? 'Published' : 'Not Published' },
  ];

  return (
    <div className="float-in">
      <PageHeader
        title="Exam Marks"
        subtitle="Subject teachers submit their own subject marks here. Final result publishing now happens from the Report Cards module."
      />

      {loading ? <PageLoader /> : (
        <>
          {exams.length === 0 ? (
            <div className="campus-panel">
              <EmptyState icon={FiBookOpen} title="No exams yet" description="Create the first exam before entering marks." />
            </div>
          ) : null}

          <div className="campus-panel p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="form-group">
                <label className="label">Exam</label>
                <SearchableSelect options={examOptions} value={selectedExamId} onChange={setSelectedExamId} placeholder="Select exam..." />
              </div>
              <div className="form-group">
                <label className="label">Class</label>
                <SearchableSelect options={classOptions} value={selectedClassId} onChange={setSelectedClassId} placeholder="Select class..." />
              </div>
              <div className="form-group">
                <label className="label">Student</label>
                <SearchableSelect
                  options={studentOptions}
                  value={selectedStudentId}
                  onChange={setSelectedStudentId}
                  placeholder="Select student..."
                  optionClassName={option => option?.isPublished ? 'text-emerald-700' : option?.hasMarks ? 'text-amber-700' : 'text-rose-700'}
                  selectedClassName={option => option?.isPublished ? 'text-emerald-700' : option?.hasMarks ? 'text-amber-700' : 'text-rose-700'}
                />
              </div>
            </div>
          </div>

          {(studentLoading || marksLoading) ? <PageLoader /> : null}

          {canShowMarksTable && !(studentLoading || marksLoading) ? (
            <div className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                {summaryCards.map(card => (
                  <div key={card.label} className="campus-panel p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">{card.label}</p>
                    <p className="mt-2 text-2xl font-bold text-text-primary">{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="campus-panel border border-primary-100 bg-primary-50/70 p-4">
                <p className="text-sm font-semibold text-text-primary">
                  {selectedExam?.name || 'Selected Exam'} • {selectedClass?.displayName || 'Selected Class'} • {selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : 'Selected Student'}
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  Subject teachers should update only their subject rows. Once every subject is submitted, the class teacher can review it here and publish the final result from Report Cards.
                </p>
                {isClassTeacherRole && String(selectedClassId) === String(classTeacherOf) ? (
                  <p className="mt-2 text-xs text-text-secondary">
                    Class teacher review: {completionCount} of {markSubjects.length} subjects have been received for this student.
                  </p>
                ) : null}
              </div>

              <div className="campus-panel overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Subject-Wise Mark Workflow</p>
                    <p className="text-xs text-text-secondary">
                      {isClassTeacherRole && String(selectedClassId) === String(classTeacherOf)
                        ? 'Review all subjects for this class here. Publish the final result from the Report Cards page.'
                        : 'Enter only the subjects assigned to you. They will automatically move to the class teacher review step.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {ownedSubjects.length > 0 ? (
                      <>
                        {savedMarks.length > 0 ? (
                          <button onClick={() => setIsEditMode(current => !current)} className="btn-secondary btn-sm">
                            <FiEdit2 /> {isEditMode ? 'Stop Editing' : 'Edit My Subjects'}
                          </button>
                        ) : null}
                        <button
                          onClick={handleSaveMarks}
                          disabled={savingMarks || (savedMarks.length > 0 && !isEditMode) || hasPublishedMarks}
                          className="btn-primary btn-sm"
                        >
                          <FiSave /> {savingMarks ? 'Submitting...' : 'Submit My Subject Marks'}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="table-header">Subject</th>
                        <th className="table-header">Theory</th>
                        <th className="table-header">Internal / Practical</th>
                        <th className="table-header">Total</th>
                        <th className="table-header">Absent</th>
                        <th className="table-header">Workflow</th>
                        <th className="table-header">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {markSubjects.length === 0 ? (
                        <tr><td colSpan="7" className="py-10 text-center text-sm text-slate-400">No subjects found for this class.</td></tr>
                      ) : markSubjects.map(item => {
                        const subjectId = item.subjectId;
                        const existingMark = subjectStatusMap[subjectId];
                        const entry = markEntries[subjectId] || createEmptyEntry(subjectId);
                        const totalMarks = entry.isAbsent ? 0 : Number(entry.theoryMarks || 0) + Number(entry.assessmentMarks || 0);
                        const totalMax = Number(entry.theoryMaxMarks || item.structure.theoryMaxMarks) + Number(entry.assessmentMaxMarks || item.structure.assessmentMaxMarks);
                        const statusInfo = getWorkflowCopy(existingMark?.workflowStatus || entry.workflowStatus || 'draft');
                        const lockedByOtherRelatedTeacher = Boolean(
                          existingMark &&
                          existingMark.enteredBy?._id &&
                          !isAdminRole &&
                          String(existingMark.enteredBy._id) !== String(user?._id || ''),
                        );
                        const rowEditable = (item.ownedByTeacher || isAdminRole) && isEditMode && !(existingMark?.workflowStatus === 'published' && !isAdminRole) && !lockedByOtherRelatedTeacher;

                        return (
                          <tr key={subjectId}>
                            <td className="table-cell">
                              <div>
                                <p className="font-semibold text-text-primary">{item.subject?.name || '-'}</p>
                                <p className="text-xs text-text-secondary">
                                  {item.subject?.code || '-'} {item.ownedByTeacher || isAdminRole ? '• your entry row' : '• review only'}
                                </p>
                              </div>
                            </td>
                            <td className="table-cell">
                              <input
                                type="number"
                                disabled={!rowEditable || entry.isAbsent}
                                className="input min-w-[90px]"
                                min="0"
                                max={entry.theoryMaxMarks || item.structure.theoryMaxMarks}
                                value={entry.theoryMarks}
                                onChange={event => handleMarkChange(subjectId, 'theoryMarks', event.target.value)}
                              />
                              <p className="mt-1 text-xs text-slate-400">Max {entry.theoryMaxMarks || item.structure.theoryMaxMarks}</p>
                            </td>
                            <td className="table-cell">
                              <input
                                type="number"
                                disabled={!rowEditable || entry.isAbsent}
                                className="input min-w-[110px]"
                                min="0"
                                max={entry.assessmentMaxMarks || item.structure.assessmentMaxMarks}
                                value={entry.assessmentMarks}
                                onChange={event => handleMarkChange(subjectId, 'assessmentMarks', event.target.value)}
                              />
                              <p className="mt-1 text-xs text-slate-400">{item.structure.assessmentLabel} Max {entry.assessmentMaxMarks || item.structure.assessmentMaxMarks}</p>
                            </td>
                            <td className="table-cell font-semibold">
                              {entry.isAbsent ? 'Absent' : `${totalMarks} / ${totalMax}`}
                            </td>
                            <td className="table-cell">
                              <input
                                type="checkbox"
                                disabled={!rowEditable}
                                checked={Boolean(entry.isAbsent)}
                                onChange={event => handleMarkChange(subjectId, 'isAbsent', event.target.checked)}
                                className="accent-primary-700"
                              />
                            </td>
                            <td className="table-cell">
                              <StatusBadge status={statusInfo.badge} />
                              <p className="mt-1 text-xs text-slate-500">{statusInfo.label}</p>
                              <p className="text-xs text-slate-400">{statusInfo.hint}</p>
                              {lockedByOtherRelatedTeacher && getEnteredByLabel(existingMark) ? (
                                <p className="mt-1 text-xs text-slate-500">Already entered by {getEnteredByLabel(existingMark)}</p>
                              ) : null}
                            </td>
                            <td className="table-cell">
                              <input
                                disabled={!rowEditable}
                                className="input min-w-[180px]"
                                value={entry.remarks}
                                onChange={event => handleMarkChange(subjectId, 'remarks', event.target.value)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {savedMarks.length > 0 ? (
                <div className="campus-panel overflow-hidden">
                  <div className="border-b border-border px-4 py-3">
                    <p className="text-sm font-semibold text-text-primary">Submitted Subject Marks</p>
                    <p className="text-xs text-text-secondary">This is the current saved state that the class teacher can review and publish.</p>
                  </div>
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="table-header">Subject</th>
                        <th className="table-header">Total</th>
                        <th className="table-header">Grade</th>
                        <th className="table-header">Result</th>
                        <th className="table-header">Workflow</th>
                        <th className="table-header">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedMarks.map(mark => {
                        const workflow = getWorkflowCopy(mark.workflowStatus);
                        return (
                          <tr key={mark._id}>
                            <td className="table-cell font-semibold">{mark.subject?.name || '-'}</td>
                            <td className="table-cell">{mark.isAbsent ? 'Absent' : `${mark.marksObtained} / ${mark.maxMarks}`}</td>
                            <td className="table-cell">{mark.grade || '-'}</td>
                            <td className="table-cell">
                              <StatusBadge status={mark.isAbsent ? 'absent' : mark.isPassed ? 'active' : 'rejected'} />
                            </td>
                            <td className="table-cell">
                              <StatusBadge status={workflow.badge} />
                              <p className="mt-1 text-xs text-slate-500">{workflow.label}</p>
                            </td>
                            <td className="table-cell">{mark.remarks || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
