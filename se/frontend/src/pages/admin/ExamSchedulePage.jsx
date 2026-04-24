import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios.js';
import { EmptyState, PageHeader, PageLoader, SearchableSelect } from '../../components/common/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import useAcademicYear from '../../hooks/useAcademicYear.js';
import useTeacherScope from '../../hooks/useTeacherScope.js';

const EXAM_TYPES = [
  { value: 'unit_test', label: 'Unit Test' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half Yearly' },
  { value: 'annual', label: 'Annual' },
  { value: 'mock', label: 'Mock' },
  { value: 'other', label: 'Other' },
];

const SCHEDULE_TYPES = [
  { value: 'test', label: 'Test' },
  { value: 'exam', label: 'Exam' },
];

const SCIENCE_KEYS = ['physics', 'chemistry', 'biology'];
const SOCIAL_SCIENCE_KEYS = ['history', 'geography', 'civics', 'economics', 'social science', 'socialscience'];

const normalizeText = value => String(value || '').trim().toLowerCase();

const hasMatchingSubjects = (subjects, keys) => {
  const names = subjects.map(subject => normalizeText(`${subject?.name || ''} ${subject?.code || ''}`));
  return keys.every(key => names.some(name => name.includes(key)));
};

const buildCombinedPaperOptions = subjects => {
  const options = [];

  if (hasMatchingSubjects(subjects, SCIENCE_KEYS)) {
    const componentIds = subjects
      .filter(subject => SCIENCE_KEYS.some(key => normalizeText(`${subject?.name || ''} ${subject?.code || ''}`).includes(key)))
      .map(subject => String(subject._id))
      .filter(Boolean);

    options.push({
      value: 'science',
      label: 'Science',
      paperName: 'Science',
      componentSubjectIds: [...new Set(componentIds)],
    });
  }

  const socialComponents = subjects
    .filter(subject => SOCIAL_SCIENCE_KEYS.some(key => normalizeText(`${subject?.name || ''} ${subject?.code || ''}`).includes(key)))
    .map(subject => String(subject._id))
    .filter(Boolean);

  if (socialComponents.length) {
    options.push({
      value: 'social_science',
      label: 'Social Science',
      paperName: 'Social Science',
      componentSubjectIds: [...new Set(socialComponents)],
    });
  }

  return options;
};

export default function ExamSchedulePage() {
  const { user } = useAuth();
  const academicYear = useAcademicYear();
  const { isTeacherRole, isClassTeacherRole, teacherId, classTeacherOf } = useTeacherScope();
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loading, setLoading] = useState(true);
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingExam, setSavingExam] = useState(false);
  const [announcing, setAnnouncing] = useState(false);
  const [examForm, setExamForm] = useState({ name: '', examType: 'unit_test', startDate: '', endDate: '', grades: [] });
  const [form, setForm] = useState({
    scheduleType: 'test',
    subjectId: '',
    combinedPaperKey: '',
    date: '',
    startTime: '',
    endTime: '',
    maxMarks: 100,
    passMarks: 35,
    hall: '',
  });

  useEffect(() => {
    setLoading(true);
    const classParams = isTeacherRole ? { academicYear, teacherId } : { academicYear };

    Promise.all([
      api.get('/exams', { params: { academicYear } }),
      api.get('/classes', { params: classParams }),
    ]).then(([examRes, classRes]) => {
      const nextExams = examRes.data.data || [];
      const nextClasses = classRes.data.data || [];
      setExams(nextExams);
      setClasses(nextClasses);
      setSelectedExamId(current => nextExams.some(item => String(item._id) === String(current)) ? current : (nextExams[0]?._id || ''));
      setSelectedClassId(current => {
        if (isTeacherRole && classTeacherOf && nextClasses.some(item => String(item._id) === String(classTeacherOf))) {
          return current && nextClasses.some(item => String(item._id) === String(current)) ? current : classTeacherOf;
        }
        return nextClasses.some(item => String(item._id) === String(current)) ? current : (nextClasses[0]?._id || '');
      });
    }).catch(() => {
      toast.error('Failed to load exam schedule data.');
    }).finally(() => setLoading(false));
  }, [academicYear, isTeacherRole, teacherId, classTeacherOf]);

  useEffect(() => {
    if (!selectedClassId) {
      setClassSubjects([]);
      return;
    }

    setSubjectLoading(true);
    const subjectUrl = isClassTeacherRole && classTeacherOf && String(selectedClassId) === String(classTeacherOf)
      ? '/class-subjects'
      : (isTeacherRole ? `/class-subjects/teacher/${teacherId}` : '/class-subjects');

    api.get(subjectUrl, { params: { classId: selectedClassId, academicYear } })
      .then(response => {
        setClassSubjects(response.data.data || []);
        setForm(current => ({ ...current, subjectId: '', combinedPaperKey: '' }));
      })
      .catch(() => {
        toast.error('Failed to load class subjects.');
        setClassSubjects([]);
      })
      .finally(() => setSubjectLoading(false));
  }, [selectedClassId, academicYear, isTeacherRole, isClassTeacherRole, teacherId, classTeacherOf]);

  const loadSchedules = async (examId, classId) => {
    if (!examId || !classId) {
      setSchedules([]);
      return;
    }

    setScheduleLoading(true);
    try {
      const response = await api.get('/exams/schedule', { params: { examId, classId } });
      setSchedules(response.data.data || []);
    } catch {
      toast.error('Failed to load exam schedule.');
      setSchedules([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules(selectedExamId, selectedClassId);
  }, [selectedExamId, selectedClassId]);

  const classOptions = classes.map(item => ({ value: item._id, label: item.displayName || `Grade ${item.grade}-${item.section}` }));
  const examOptions = exams.map(item => ({ value: item._id, label: item.name }));
  const selectedClass = classes.find(item => String(item._id) === String(selectedClassId));
  const isSuperAdmin = user?.role === 'super_admin';
  const isSecondaryClass = ['9', '10'].includes(String(selectedClass?.grade || ''));
  const gradeOptions = [...new Set(classes.map(item => item.grade).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
  const regularSubjectOptions = classSubjects
    .filter(item => item.subject?._id)
    .map(item => ({
      value: item.subject._id,
      label: `${item.subject?.name || 'Subject'}${item.subject?.code ? ` (${item.subject.code})` : ''}`,
    }));
  const combinedPaperOptions = buildCombinedPaperOptions(classSubjects.map(item => item.subject).filter(Boolean));
  const useCombinedPapers = form.scheduleType === 'exam' && isSecondaryClass;

  const handleCreateSchedule = async event => {
    event.preventDefault();

    if (!selectedExamId || !selectedClassId || !form.date) {
      return toast.error('Select exam, class, and date first.');
    }

    const selectedCombinedPaper = combinedPaperOptions.find(option => option.value === form.combinedPaperKey);
    if (useCombinedPapers && !selectedCombinedPaper) {
      return toast.error('Select a combined paper.');
    }
    if (!useCombinedPapers && !form.subjectId) {
      return toast.error('Select a subject.');
    }

    const selectedSubject = classSubjects.find(item => String(item.subject?._id || '') === String(form.subjectId))?.subject;
    const payload = {
      exam: selectedExamId,
      class: selectedClassId,
      scheduleType: form.scheduleType,
      subject: useCombinedPapers ? null : form.subjectId,
      paperName: useCombinedPapers ? selectedCombinedPaper.paperName : (selectedSubject?.name || ''),
      componentSubjects: useCombinedPapers ? selectedCombinedPaper.componentSubjectIds : (form.subjectId ? [form.subjectId] : []),
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      maxMarks: Number(form.maxMarks || 100),
      passMarks: Number(form.passMarks || 35),
      hall: form.hall.trim(),
    };

    setSavingSchedule(true);
    try {
      await api.post('/exams/schedule', payload);
      toast.success('Exam schedule created.');
      setForm(current => ({
        ...current,
        subjectId: '',
        combinedPaperKey: '',
        date: '',
        startTime: '',
        endTime: '',
        maxMarks: 100,
        passMarks: 35,
        hall: '',
      }));
      await loadSchedules(selectedExamId, selectedClassId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create exam schedule.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleCreateExam = async event => {
    event.preventDefault();
    if (!examForm.name.trim()) return toast.error('Exam name is required.');

    setSavingExam(true);
    try {
      const response = await api.post('/exams', {
        ...examForm,
        name: examForm.name.trim(),
        grades: examForm.grades,
        academicYear,
      });
      const createdExam = response.data.data;
      toast.success('Exam created.');
      setExamForm({ name: '', examType: 'unit_test', startDate: '', endDate: '', grades: [] });

      const refreshed = await api.get('/exams', { params: { academicYear } });
      const nextExams = refreshed.data.data || [];
      setExams(nextExams);
      setSelectedExamId(createdExam?._id || nextExams[0]?._id || '');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create exam.');
    } finally {
      setSavingExam(false);
    }
  };

  const handleAnnounceSchedule = async () => {
    if (!selectedExamId || !selectedClassId) {
      return toast.error('Select exam and class first.');
    }

    setAnnouncing(true);
    try {
      const response = await api.post('/exams/announce', { examId: selectedExamId, classId: selectedClassId });
      toast.success(response.data.message || 'Exam schedule announced.');
      await loadSchedules(selectedExamId, selectedClassId);
      const refreshed = await api.get('/exams', { params: { academicYear } });
      setExams(refreshed.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to announce exam schedule.');
    } finally {
      setAnnouncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Exam Schedule" subtitle="Create exam and test schedules with the form above and view records below." />

      {loading ? <PageLoader /> : (
        <>
          {isSuperAdmin ? (
            <form onSubmit={handleCreateExam} className="campus-panel p-5">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-text-primary">Create Exam</p>
                <p className="text-xs text-text-secondary">Create the exam first here, then add its schedule below.</p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="form-group">
                  <label className="label">Exam Name *</label>
                  <input className="input" placeholder="e.g. Unit Test 1" value={examForm.name} onChange={event => setExamForm(current => ({ ...current, name: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="label">Exam Type</label>
                  <SearchableSelect options={EXAM_TYPES} value={examForm.examType} onChange={value => setExamForm(current => ({ ...current, examType: value }))} />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="form-group">
                  <label className="label">Start Date</label>
                  <input type="date" className="input" value={examForm.startDate} onChange={event => setExamForm(current => ({ ...current, startDate: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="label">End Date</label>
                  <input type="date" className="input" value={examForm.endDate} onChange={event => setExamForm(current => ({ ...current, endDate: event.target.value }))} />
                </div>
              </div>

              <div className="mt-4 form-group">
                <label className="label">Grades</label>
                <div className="grid grid-cols-4 gap-2">
                  {gradeOptions.map(grade => (
                    <label key={grade} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={examForm.grades.includes(grade)}
                        onChange={() => setExamForm(current => ({
                          ...current,
                          grades: current.grades.includes(grade)
                            ? current.grades.filter(item => item !== grade)
                            : [...current.grades, grade],
                        }))}
                        className="accent-primary-700"
                      />
                      Grade {grade}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button type="submit" disabled={savingExam} className="btn-primary btn-sm">
                  {savingExam ? 'Saving...' : 'Create Exam'}
                </button>
              </div>
            </form>
          ) : null}

          <form onSubmit={isSuperAdmin ? handleCreateSchedule : event => event.preventDefault()} className="campus-panel p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="form-group">
                <label className="label">Exam</label>
                <SearchableSelect options={examOptions} value={selectedExamId} onChange={setSelectedExamId} placeholder="Select exam..." />
              </div>
              <div className="form-group">
                <label className="label">Class</label>
                <SearchableSelect options={classOptions} value={selectedClassId} onChange={setSelectedClassId} placeholder="Select class..." />
              </div>
            </div>

            {isSuperAdmin ? (
              <>
                <div className="mt-4 form-group">
                  <label className="label">Schedule Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SCHEDULE_TYPES.map(option => (
                      <label key={option.value} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                        <input
                          type="radio"
                          name="scheduleType"
                          checked={form.scheduleType === option.value}
                          onChange={() => setForm(current => ({ ...current, scheduleType: option.value, subjectId: '', combinedPaperKey: '' }))}
                          className="accent-primary-700"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-text-secondary">
                    {isSecondaryClass
                      ? 'For Grade 9 and 10, Test shows separate subjects and Exam shows combined papers.'
                      : 'For other grades, the schedule uses regular subjects.'}
                  </p>
                </div>

                {subjectLoading ? <PageLoader /> : useCombinedPapers ? (
                  <div className="mt-4 form-group">
                    <label className="label">Combined Paper</label>
                    <SearchableSelect options={combinedPaperOptions} value={form.combinedPaperKey} onChange={value => setForm(current => ({ ...current, combinedPaperKey: value }))} placeholder="Select combined paper..." />
                    {combinedPaperOptions.length === 0 ? <p className="mt-2 text-xs text-amber-600">No combined papers were detected from this class subject list.</p> : null}
                  </div>
                ) : (
                  <div className="mt-4 form-group">
                    <label className="label">Subject</label>
                    <SearchableSelect options={regularSubjectOptions} value={form.subjectId} onChange={value => setForm(current => ({ ...current, subjectId: value }))} placeholder="Select subject..." />
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="form-group">
                    <label className="label">Date</label>
                    <input type="date" className="input" value={form.date} onChange={event => setForm(current => ({ ...current, date: event.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="label">Hall</label>
                    <input className="input" value={form.hall} onChange={event => setForm(current => ({ ...current, hall: event.target.value }))} placeholder="Optional hall / room" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="form-group">
                    <label className="label">Start Time</label>
                    <input type="time" className="input" value={form.startTime} onChange={event => setForm(current => ({ ...current, startTime: event.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="label">End Time</label>
                    <input type="time" className="input" value={form.endTime} onChange={event => setForm(current => ({ ...current, endTime: event.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="label">Max Marks</label>
                    <input type="number" className="input" value={form.maxMarks} onChange={event => setForm(current => ({ ...current, maxMarks: event.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="label">Pass Marks</label>
                    <input type="number" className="input" value={form.passMarks} onChange={event => setForm(current => ({ ...current, passMarks: event.target.value }))} />
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-3">
                  <button type="button" onClick={handleAnnounceSchedule} disabled={announcing || !selectedExamId || !selectedClassId} className="btn-secondary btn-sm">
                    {announcing ? 'Announcing...' : 'Announce Schedule'}
                  </button>
                  <button type="submit" disabled={savingSchedule} className="btn-primary btn-sm">
                    {savingSchedule ? 'Saving...' : 'Save Schedule'}
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-5 rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-text-secondary">
                Only the super admin can create exams, save schedules, and announce the timetable. Other roles can view the records below.
              </div>
            )}
          </form>

          <div className="campus-panel overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-text-primary">Schedule Records</p>
              <p className="text-xs text-text-secondary">Saved schedule records are shown below for the selected exam and class.</p>
            </div>

            {scheduleLoading ? <PageLoader /> : schedules.length === 0 ? (
              <div className="px-4 py-10">
                <EmptyState title="No schedule records yet" description="Create the first exam schedule from the form above." />
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="table-header">Exam</th>
                      <th className="table-header">Type</th>
                      <th className="table-header">Paper</th>
                      <th className="table-header">Date</th>
                      <th className="table-header">Time</th>
                      <th className="table-header">Marks</th>
                      <th className="table-header">Hall</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map(item => (
                      <tr key={item._id}>
                        <td className="table-cell font-semibold">{item.exam?.name || '-'}</td>
                        <td className="table-cell">
                          <span className={item.scheduleType === 'exam' ? 'badge-blue' : 'badge-gray'}>
                            {item.scheduleType === 'exam' ? 'Exam' : 'Test'}
                          </span>
                        </td>
                        <td className="table-cell">
                          <div className="min-w-0">
                            <p className="font-semibold text-text-primary">{item.paperName || item.subject?.name || '-'}</p>
                            <p className="text-xs text-text-secondary">
                              {item.scheduleType === 'exam' && item.componentSubjects?.length
                                ? item.componentSubjects.map(subject => subject?.name).filter(Boolean).join(', ')
                                : (item.subject?.code || item.subject?.name || '-')}
                            </p>
                          </div>
                        </td>
                        <td className="table-cell">{item.date ? new Date(item.date).toLocaleDateString('en-IN') : '-'}</td>
                        <td className="table-cell">{[item.startTime, item.endTime].filter(Boolean).join(' - ') || '-'}</td>
                        <td className="table-cell">{item.maxMarks} / {item.passMarks}</td>
                        <td className="table-cell">{item.hall || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
