import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiBookOpen, FiEdit2, FiSave } from 'react-icons/fi';
import api from '../../api/axios.js';
import { EmptyState, Modal, PageHeader, PageLoader, SearchableSelect, StatusBadge } from '../../components/common/index.jsx';
import useAcademicYear from '../../hooks/useAcademicYear.js';
import useTeacherScope from '../../hooks/useTeacherScope.js';

const createEmptyEntry = subjectId => ({
  subjectId,
  marksObtained: '',
  maxMarks: 100,
  isAbsent: false,
  remarks: '',
});

const getSelectionStorageKey = academicYear => `exam-marks-selection:${academicYear}`;

export default function ExamsPage() {
  const academicYear = useAcademicYear();
  const { isTeacherRole, isClassTeacherRole, teacherId, classTeacherOf } = useTeacherScope();
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [markEntries, setMarkEntries] = useState({});
  const [savedMarks, setSavedMarks] = useState([]);
  const [hasSavedMarks, setHasSavedMarks] = useState(false);
  const [isEditMode, setIsEditMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [studentLoading, setStudentLoading] = useState(false);
  const [marksLoading, setMarksLoading] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);

  const loadBase = async () => {
    setLoading(true);
    try {
      const classParams = isTeacherRole
        ? { academicYear, teacherId }
        : { academicYear };

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

  useEffect(() => {
    loadBase();
  }, [academicYear, isTeacherRole, teacherId, classTeacherOf]);

  useEffect(() => {
    const saved = window.localStorage.getItem(getSelectionStorageKey(academicYear));
    if (!saved) {
      setSelectedExamId('');
      setSelectedClassId('');
      setSelectedStudentId('');
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      setSelectedExamId(parsed.selectedExamId || '');
      setSelectedClassId(parsed.selectedClassId || '');
      setSelectedStudentId(parsed.selectedStudentId || '');
    } catch {
      window.localStorage.removeItem(getSelectionStorageKey(academicYear));
      setSelectedExamId('');
      setSelectedClassId('');
      setSelectedStudentId('');
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
    if (selectedExamId && !exams.some(item => String(item._id) === String(selectedExamId))) {
      setSelectedExamId('');
    }
  }, [exams, selectedExamId]);

  useEffect(() => {
    if (selectedClassId && !classes.some(item => String(item._id) === String(selectedClassId))) {
      setSelectedClassId('');
      setSelectedStudentId('');
    }
  }, [classes, selectedClassId]);

  useEffect(() => {
    if (isTeacherRole && classTeacherOf && !selectedClassId && classes.some(item => String(item._id) === String(classTeacherOf))) {
      setSelectedClassId(classTeacherOf);
    }
  }, [isTeacherRole, classTeacherOf, selectedClassId, classes]);

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
    ]).then(([studentRes, subjectRes]) => {
      const nextStudents = studentRes.data.data || [];
      const nextSubjects = subjectRes.data.data || [];
      setStudents(nextStudents);
      setClassSubjects(nextSubjects);
      setSelectedStudentId(current => nextStudents.some(item => String(item._id) === String(current)) ? current : (nextStudents[0]?._id || ''));
    }).catch(() => {
      toast.error('Failed to load class students or subjects.');
      setStudents([]);
      setClassSubjects([]);
    }).finally(() => setStudentLoading(false));
  }, [selectedClassId, academicYear, isTeacherRole, isClassTeacherRole, teacherId, classTeacherOf]);

  useEffect(() => {
    if (!selectedExamId || !selectedClassId || !selectedStudentId) {
      setSavedMarks([]);
      setMarkEntries({});
      setHasSavedMarks(false);
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
        setHasSavedMarks(nextMarks.length > 0);
        setIsEditMode(nextMarks.length === 0);

        const nextEntries = {};
        classSubjects.forEach(item => {
          const subjectId = String(item.subject?._id || '');
          if (!subjectId) return;
          const existing = nextMarks.find(mark => String(mark.subject?._id || mark.subject) === subjectId);
          nextEntries[subjectId] = {
            subjectId,
            marksObtained: existing?.marksObtained ?? '',
            maxMarks: existing?.maxMarks ?? 100,
            isAbsent: existing?.isAbsent ?? false,
            remarks: existing?.remarks ?? '',
          };
        });
        setMarkEntries(nextEntries);
      })
      .catch(() => toast.error('Failed to load marks.'))
      .finally(() => setMarksLoading(false));
  }, [selectedExamId, selectedClassId, selectedStudentId, classSubjects, academicYear]);

  const handleMarkChange = (subjectId, key, value) => {
    setMarkEntries(current => ({
      ...current,
      [subjectId]: {
        ...(current[subjectId] || createEmptyEntry(subjectId)),
        [key]: value,
      },
    }));
  };

  const handleSaveMarks = async () => {
    if (!selectedExamId || !selectedClassId || !selectedStudentId) {
      return toast.error('Select exam, class, and student first.');
    }

    const payload = classSubjects
      .filter(item => item.subject?._id)
      .map(item => {
        const subjectId = String(item.subject._id);
        const entry = markEntries[subjectId] || createEmptyEntry(subjectId);
        return {
          examId: selectedExamId,
          studentId: selectedStudentId,
          subjectId,
          classId: selectedClassId,
          academicYear,
          marksObtained: Number(entry.marksObtained || 0),
          maxMarks: Number(entry.maxMarks || 100),
          isAbsent: Boolean(entry.isAbsent),
          remarks: entry.remarks || '',
        };
      });

    setSavingMarks(true);
    try {
      const response = await api.post('/exams/marks', { marks: payload });
      toast.success(response.data.message || 'Marks saved.');
      setHasSavedMarks(true);
      setIsEditMode(false);

      const refreshed = await api.get('/exams/marks', {
        params: {
          examId: selectedExamId,
          classId: selectedClassId,
          studentId: selectedStudentId,
          academicYear,
        },
      });
      setSavedMarks(refreshed.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save marks.');
    } finally {
      setSavingMarks(false);
    }
  };

  const classOptions = classes.map(item => ({ value: item._id, label: item.displayName || `Grade ${item.grade}-${item.section}` }));
  const examOptions = exams.map(item => ({ value: item._id, label: item.name }));
  const studentOptions = students.map(item => ({
    value: item._id,
    label: `${item.firstName} ${item.lastName}${item.rollNo ? ` (${item.rollNo})` : ''}`,
  }));

  const selectedExam = exams.find(item => String(item._id) === String(selectedExamId));
  const selectedClass = classes.find(item => String(item._id) === String(selectedClassId));
  const selectedStudent = students.find(item => String(item._id) === String(selectedStudentId));
  const canShowMarksTable = selectedExamId && selectedClassId && selectedStudentId;
  const inputsDisabled = savingMarks || (hasSavedMarks && !isEditMode);

  const summaryCards = useMemo(() => {
    const subjectEntries = classSubjects
      .filter(item => item.subject?._id)
      .map(item => {
        const subjectId = String(item.subject._id);
        return markEntries[subjectId] || createEmptyEntry(subjectId);
      });

    if (subjectEntries.length === 0) return [];

    const totalObtained = subjectEntries.reduce((sum, entry) => sum + (entry.isAbsent ? 0 : Number(entry.marksObtained || 0)), 0);
    const totalMax = subjectEntries.reduce((sum, entry) => sum + Number(entry.maxMarks || 0), 0);
    const percentage = totalMax > 0 ? Number(((totalObtained / totalMax) * 100).toFixed(2)) : 0;
    const failedCount = subjectEntries.filter(entry => !entry.isAbsent && Number(entry.marksObtained || 0) < 35).length;

    return [
      { label: 'Total', value: `${totalObtained} / ${totalMax}` },
      { label: 'Percentage', value: `${percentage}%` },
      { label: 'Result', value: failedCount === 0 ? 'PASS' : 'FAIL' },
      { label: 'Subjects', value: subjectEntries.length },
    ];
  }, [classSubjects, markEntries]);

  const examCards = useMemo(() => exams.map(exam => (
    <div key={exam._id} className="campus-panel border-l-4 border-primary-600 p-4">
      <h2 className="text-lg font-semibold text-text-primary">{exam.name}</h2>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-secondary">
        <span><strong>Type:</strong> {exam.examType?.replace(/_/g, ' ')}</span>
        <span><strong>Start:</strong> {exam.startDate ? new Date(exam.startDate).toLocaleDateString('en-IN') : '-'}</span>
        <span><strong>End:</strong> {exam.endDate ? new Date(exam.endDate).toLocaleDateString('en-IN') : '-'}</span>
        <span><strong>Published:</strong> <StatusBadge status={exam.isPublished ? 'active' : 'pending'} /></span>
      </div>
    </div>
  )), [exams]);

  return (
    <div className="float-in">
      <PageHeader
        title="Exam Marks Entry"
        subtitle="Record subject-wise marks for individual students"
      />

      {loading ? <PageLoader /> : (
        <>
          {examCards.length === 0 ? (
            <div className="campus-panel">
              <EmptyState icon={FiBookOpen} title="No exams yet" description="Create the first exam to start entering marks." />
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">{examCards}</div>
          )}

          <div className="campus-panel mt-6 p-4">
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
                <SearchableSelect options={studentOptions} value={selectedStudentId} onChange={setSelectedStudentId} placeholder="Select student..." />
              </div>
            </div>

            {canShowMarksTable && (
              <div className="mt-4 rounded border border-primary-100 bg-primary-50/70 px-4 py-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {selectedExam?.name || 'Selected Exam'} • {selectedClass?.displayName || 'Selected Class'} • {selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : 'Selected Student'}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {hasSavedMarks
                        ? (isEditMode ? 'Editing saved marks for this student. Update the subject rows and save again.' : 'Saved marks loaded. Click Edit Marks to update them.')
                        : 'Enter marks for all subjects of the selected student.'}
                    </p>
                  </div>
                  {hasSavedMarks && (
                    <button onClick={() => setIsEditMode(current => !current)} className="btn-secondary btn-sm">
                      <FiEdit2 /> {isEditMode ? 'Stop Editing' : 'Edit Marks'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {(studentLoading || marksLoading) ? <PageLoader /> : canShowMarksTable && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                {summaryCards.map(card => (
                  <div key={card.label} className="campus-panel p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">{card.label}</p>
                    <p className="mt-2 text-2xl font-bold text-text-primary">{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="campus-panel overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : 'Selected Student'}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {hasSavedMarks && !isEditMode ? 'Saved marks are shown below. Click Edit Marks to update them.' : 'Enter all subject marks for the selected student.'}
                    </p>
                  </div>
                  <button onClick={handleSaveMarks} disabled={savingMarks || classSubjects.length === 0 || (hasSavedMarks && !isEditMode)} className="btn-primary btn-sm">
                    <FiSave /> {savingMarks ? 'Saving...' : 'Save Marks'}
                  </button>
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="table-header">Subject</th>
                        <th className="table-header">Marks</th>
                        <th className="table-header">Max</th>
                        <th className="table-header">Absent</th>
                        <th className="table-header">Result</th>
                        <th className="table-header">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classSubjects.length === 0 ? (
                        <tr><td colSpan="6" className="py-10 text-center text-sm text-slate-400">No subjects found for this class.</td></tr>
                      ) : classSubjects.map(item => {
                        const subjectId = String(item.subject?._id || '');
                        const entry = markEntries[subjectId] || createEmptyEntry(subjectId);
                        const isPassed = entry.isAbsent ? false : Number(entry.marksObtained || 0) >= 35;

                        return (
                          <tr key={item._id || subjectId}>
                            <td className="table-cell">
                              <div className="min-w-0">
                                <p className="font-semibold text-text-primary">{item.subject?.name || '-'}</p>
                                <p className="text-xs text-text-secondary">{item.subject?.code || '-'}</p>
                              </div>
                            </td>
                            <td className="table-cell">
                              <input
                                type="number"
                                disabled={inputsDisabled || entry.isAbsent}
                                className="input min-w-[90px]"
                                value={entry.marksObtained}
                                onChange={event => handleMarkChange(subjectId, 'marksObtained', event.target.value)}
                              />
                            </td>
                            <td className="table-cell">
                              <input
                                type="number"
                                disabled={inputsDisabled}
                                className="input min-w-[90px]"
                                value={entry.maxMarks}
                                onChange={event => handleMarkChange(subjectId, 'maxMarks', event.target.value)}
                              />
                            </td>
                            <td className="table-cell">
                              <input
                                type="checkbox"
                                disabled={inputsDisabled}
                                checked={Boolean(entry.isAbsent)}
                                onChange={event => handleMarkChange(subjectId, 'isAbsent', event.target.checked)}
                                className="accent-primary-700"
                              />
                            </td>
                            <td className="table-cell">
                              <StatusBadge status={entry.isAbsent ? 'absent' : isPassed ? 'active' : 'rejected'} />
                            </td>
                            <td className="table-cell">
                              <input
                                disabled={inputsDisabled}
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

              {savedMarks.length > 0 && (
                <div className="campus-panel overflow-hidden">
                  <div className="border-b border-border px-4 py-3">
                    <p className="text-sm font-semibold text-text-primary">Saved Marks</p>
                    <p className="text-xs text-text-secondary">Marks already saved for this student in this exam.</p>
                  </div>
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="table-header">Subject</th>
                        <th className="table-header">Marks</th>
                        <th className="table-header">Max</th>
                        <th className="table-header">Grade</th>
                        <th className="table-header">Result</th>
                        <th className="table-header">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedMarks.map(mark => (
                        <tr key={mark._id}>
                          <td className="table-cell font-semibold">{mark.subject?.name || '-'}</td>
                          <td className="table-cell">{mark.isAbsent ? 'Absent' : mark.marksObtained}</td>
                          <td className="table-cell">{mark.maxMarks}</td>
                          <td className="table-cell">{mark.grade || '-'}</td>
                          <td className="table-cell">
                            <StatusBadge status={mark.isAbsent ? 'absent' : mark.isPassed ? 'active' : 'rejected'} />
                          </td>
                          <td className="table-cell">{mark.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

    </div>
  );
}
