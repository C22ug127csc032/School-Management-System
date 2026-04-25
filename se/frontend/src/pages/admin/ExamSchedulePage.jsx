import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios.js';
import { EmptyState, Modal, PageHeader, PageLoader, SearchableSelect } from '../../components/common/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import useAcademicYear from '../../hooks/useAcademicYear.js';
import useTeacherScope from '../../hooks/useTeacherScope.js';
import { formatIndianDate } from '../../utils/dateTime.js';

const EXAM_TYPES = [
  { value: 'unit_test', label: 'Unit Test' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half Yearly' },
  { value: 'annual', label: 'Annual' },
  { value: 'mock', label: 'Mock' },
  { value: 'other', label: 'Other' },
];

const SLOT_TYPES = [
  { value: 'exam', label: 'Exam' },
  { value: 'revision', label: 'Revision' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'no_session', label: 'No Session' },
];

const SCIENCE_KEYS = ['physics', 'chemistry', 'biology', 'science'];
const SOCIAL_SCIENCE_KEYS = ['history', 'geography', 'civics', 'economics', 'social science', 'socialscience'];
const TAMIL_KEYS = ['tamil'];
const ENGLISH_KEYS = ['english'];
const MATHS_KEYS = ['math', 'maths', 'mathematics'];

const createSlotForm = () => ({
  slotType: 'exam',
  subjectKey: '',
  fromPeriodId: '',
  toPeriodId: '',
  maxMarks: 100,
  passMarks: 35,
  hall: '',
  note: '',
});

const normalizeText = value => String(value || '').trim().toLowerCase();
const getParentSubjectId = subject => String(subject?.parentSubject?._id || subject?.parentSubject || '');

const findMatchingSubjects = (subjects, keys) => subjects.filter(subject =>
  keys.some(key => normalizeText(`${subject?.name || ''} ${subject?.code || ''}`).includes(key))
);

const buildMainExamSubjectOptions = subjects => {
  const options = [];
  const topLevelSubjects = subjects.filter(subject => !getParentSubjectId(subject));
  const childSubjectsByParent = subjects.reduce((map, subject) => {
    const parentId = getParentSubjectId(subject);
    if (!parentId) return map;
    if (!map.has(parentId)) map.set(parentId, []);
    map.get(parentId).push(subject);
    return map;
  }, new Map());

  const resolveNamedTopLevel = keys => (
    topLevelSubjects.find(subject => keys.some(key => normalizeText(`${subject?.name || ''} ${subject?.code || ''}`).includes(key)))
    || findMatchingSubjects(subjects, keys)[0]
  );

  const tamil = resolveNamedTopLevel(TAMIL_KEYS);
  if (tamil) options.push({ value: `single:${tamil._id}`, label: 'Tamil', paperName: 'Tamil', subjectId: tamil._id, componentSubjectIds: [String(tamil._id)] });

  const english = resolveNamedTopLevel(ENGLISH_KEYS);
  if (english) options.push({ value: `single:${english._id}`, label: 'English', paperName: 'English', subjectId: english._id, componentSubjectIds: [String(english._id)] });

  const maths = resolveNamedTopLevel(MATHS_KEYS);
  if (maths) options.push({ value: `single:${maths._id}`, label: 'Maths', paperName: 'Maths', subjectId: maths._id, componentSubjectIds: [String(maths._id)] });

  const scienceMain = resolveNamedTopLevel(['science']);
  const scienceChildren = scienceMain ? (childSubjectsByParent.get(String(scienceMain._id)) || []) : [];
  const scienceSubjects = scienceChildren.length ? scienceChildren : findMatchingSubjects(subjects, SCIENCE_KEYS);
  if (scienceMain || scienceSubjects.length) {
    options.push({
      value: 'combined:science',
      label: 'Science',
      paperName: 'Science',
      subjectId: scienceMain?._id || null,
      componentSubjectIds: [...new Set((scienceSubjects.length ? scienceSubjects : [scienceMain]).filter(Boolean).map(subject => String(subject._id)))],
    });
  }

  const socialScienceMain = resolveNamedTopLevel(['social science', 'socialscience']);
  const socialScienceChildren = socialScienceMain ? (childSubjectsByParent.get(String(socialScienceMain._id)) || []) : [];
  const socialScienceSubjects = socialScienceChildren.length ? socialScienceChildren : findMatchingSubjects(subjects, SOCIAL_SCIENCE_KEYS);
  if (socialScienceMain || socialScienceSubjects.length) {
    options.push({
      value: 'combined:social_science',
      label: 'Social Science',
      paperName: 'Social Science',
      subjectId: socialScienceMain?._id || null,
      componentSubjectIds: [...new Set((socialScienceSubjects.length ? socialScienceSubjects : [socialScienceMain]).filter(Boolean).map(subject => String(subject._id)))],
    });
  }

  return options;
};

const buildUnitTestSubjectOptions = subjects => subjects.map(subject => ({
  value: `single:${subject._id}`,
  label: `${subject?.name || 'Subject'}${subject?.code ? ` (${subject.code})` : ''}`,
  paperName: subject?.name || 'Subject',
  subjectId: subject._id,
  componentSubjectIds: [String(subject._id)],
}));

const getSelectedSubjectOption = (options, entry) => {
  if (!entry) return '';
  const componentIds = [...new Set((entry.componentSubjects || []).map(subject => String(subject?._id || subject)).filter(Boolean))].sort().join('|');
  const matchingOption = options.find(option => {
    const optionIds = [...new Set(option.componentSubjectIds || [])].sort().join('|');
    if (optionIds && optionIds === componentIds) return true;
    return option.subjectId && String(option.subjectId) === String(entry.subject?._id || entry.subject || '');
  });
  return matchingOption?.value || '';
};

const getEntryPeriodRange = (entry, periods) => {
  if (!entry?.period || !entry?.endPeriod) return null;
  const startIndex = periods.findIndex(period => String(period._id) === String(entry.period._id || entry.period));
  const endIndex = periods.findIndex(period => String(period._id) === String(entry.endPeriod._id || entry.endPeriod));
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) return null;
  return { startIndex, endIndex, span: endIndex - startIndex + 1 };
};

export default function ExamSchedulePage() {
  const { user } = useAuth();
  const academicYear = useAcademicYear();
  const { isTeacherRole, isClassTeacherRole, teacherId, classTeacherOf } = useTeacherScope();

  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [calendarDays, setCalendarDays] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loading, setLoading] = useState(true);
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [savingSlot, setSavingSlot] = useState(false);
  const [savingExam, setSavingExam] = useState(false);
  const [announcing, setAnnouncing] = useState(false);
  const [examForm, setExamForm] = useState({ name: '', examType: 'unit_test', startDate: '', endDate: '', grades: [] });
  const [editor, setEditor] = useState({ open: false, day: null, clickedPeriodId: '' });
  const [slotForm, setSlotForm] = useState(createSlotForm());

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
      toast.error('Failed to load exam timetable data.');
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
      .then(response => setClassSubjects(response.data.data || []))
      .catch(() => {
        toast.error('Failed to load class subjects.');
        setClassSubjects([]);
      })
      .finally(() => setSubjectLoading(false));
  }, [selectedClassId, academicYear, isTeacherRole, isClassTeacherRole, teacherId, classTeacherOf]);

  const loadSchedules = async (examId, classId) => {
    if (!examId || !classId) {
      setCalendarDays([]);
      setPeriods([]);
      return;
    }

    setScheduleLoading(true);
    try {
      const response = await api.get('/exams/schedule', { params: { examId, classId, includeCalendar: true, academicYear } });
      setCalendarDays(response.data.data?.calendarDays || []);
      setPeriods((response.data.data?.slotTemplates || []).filter(period => !period.isBreak));
    } catch {
      toast.error('Failed to load exam schedule.');
      setCalendarDays([]);
      setPeriods([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules(selectedExamId, selectedClassId);
  }, [selectedExamId, selectedClassId, academicYear]);

  const classOptions = classes.map(item => ({ value: item._id, label: item.displayName || `Grade ${item.grade}-${item.section}` }));
  const examOptions = exams.map(item => ({ value: item._id, label: item.name }));
  const selectedExam = exams.find(item => String(item._id) === String(selectedExamId));
  const selectedClass = classes.find(item => String(item._id) === String(selectedClassId));
  const isSuperAdmin = user?.role === 'super_admin';
  const gradeOptions = [...new Set(classes.map(item => item.grade).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
  const allSubjects = classSubjects.map(item => item.subject).filter(Boolean);

  const subjectOptions = useMemo(() => {
    const grade = String(selectedClass?.grade || '');
    const useGroupedSecondarySubjects = ['9', '10'].includes(grade);

    if (useGroupedSecondarySubjects) {
      return buildMainExamSubjectOptions(allSubjects);
    }

    if (selectedExam?.examType === 'unit_test') {
      return buildUnitTestSubjectOptions(allSubjects);
    }

    return buildMainExamSubjectOptions(allSubjects);
  }, [allSubjects, selectedClass?.grade, selectedExam?.examType]);

  const periodOptions = useMemo(() => periods.map(period => ({
    value: period._id,
    label: `${period.name} (${period.startTime}-${period.endTime})`,
    periodNo: period.periodNo,
  })), [periods]);

  const toPeriodOptions = useMemo(() => {
    const selectedFrom = periodOptions.find(option => String(option.value) === String(slotForm.fromPeriodId));
    if (!selectedFrom) return periodOptions;
    return periodOptions.filter(option => Number(option.periodNo) >= Number(selectedFrom.periodNo));
  }, [periodOptions, slotForm.fromPeriodId]);

  const selectedFromPeriod = periods.find(period => String(period._id) === String(slotForm.fromPeriodId));
  const selectedToPeriod = periods.find(period => String(period._id) === String(slotForm.toPeriodId));

  const openEditor = (day, clickedPeriodId = '') => {
    const entry = day?.entry || null;
    const defaultPeriodId = clickedPeriodId || entry?.period?._id || '';
    setEditor({ open: true, day, clickedPeriodId: defaultPeriodId });
    setSlotForm({
      slotType: entry?.slotType || (day?.isHoliday ? 'holiday' : (day?.isSunday ? 'no_session' : 'exam')),
      subjectKey: getSelectedSubjectOption(subjectOptions, entry),
      fromPeriodId: entry?.period?._id || defaultPeriodId,
      toPeriodId: entry?.endPeriod?._id || entry?.period?._id || defaultPeriodId,
      maxMarks: entry?.maxMarks || 100,
      passMarks: entry?.passMarks || 35,
      hall: entry?.hall || '',
      note: entry?.note || day?.holidayReason || '',
    });
  };

  const closeEditor = () => {
    setEditor({ open: false, day: null, clickedPeriodId: '' });
    setSlotForm(createSlotForm());
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

  const handleSaveSlot = async () => {
    if (!selectedExamId || !selectedClassId || !editor.day?.date) {
      return toast.error('Select exam, class, and date first.');
    }

    const selectedSubject = subjectOptions.find(option => option.value === slotForm.subjectKey);

    if (slotForm.slotType === 'exam') {
      if (!selectedSubject) return toast.error('Select a subject.');
      if (!slotForm.fromPeriodId || !slotForm.toPeriodId) return toast.error('Select from and to periods.');
    }

    if (slotForm.slotType === 'revision' && (!slotForm.fromPeriodId || !slotForm.toPeriodId)) {
      return toast.error('Select from and to periods for revision.');
    }

    const payload = {
      exam: selectedExamId,
      class: selectedClassId,
      date: editor.day.date,
      scheduleType: 'exam',
      slotType: slotForm.slotType,
      academicYear,
      periodId: slotForm.slotType === 'exam' || slotForm.slotType === 'revision' ? slotForm.fromPeriodId : null,
      endPeriodId: slotForm.slotType === 'exam' || slotForm.slotType === 'revision' ? slotForm.toPeriodId : null,
      maxMarks: Number(slotForm.maxMarks || 100),
      passMarks: Number(slotForm.passMarks || 35),
      hall: slotForm.slotType === 'exam' ? slotForm.hall.trim() : '',
      note: slotForm.note.trim(),
      subject: slotForm.slotType === 'exam' ? (selectedSubject?.subjectId || null) : null,
      paperName: slotForm.slotType === 'exam' ? (selectedSubject?.paperName || '') : '',
      componentSubjects: slotForm.slotType === 'exam' ? (selectedSubject?.componentSubjectIds || []) : [],
    };

    setSavingSlot(true);
    try {
      await api.post('/exams/schedule', payload);
      toast.success('Exam schedule saved.');
      closeEditor();
      await loadSchedules(selectedExamId, selectedClassId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save exam schedule.');
    } finally {
      setSavingSlot(false);
    }
  };

  const handleAnnounceSchedule = async () => {
    if (!selectedExamId || !selectedClassId) {
      return toast.error('Select exam and class first.');
    }

    setAnnouncing(true);
    try {
      const response = await api.post('/exams/announce', { examId: selectedExamId, classId: selectedClassId });
      toast.success(response.data.message || 'Exam timetable announced.');
      const refreshed = await api.get('/exams', { params: { academicYear } });
      setExams(refreshed.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to announce exam timetable.');
    } finally {
      setAnnouncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Exam Schedule" subtitle="Timetable-style exam scheduler with popup-based subject and duration selection." />

      {loading ? <PageLoader /> : (
        <>
          {isSuperAdmin ? (
            <form onSubmit={handleCreateExam} className="campus-panel p-5">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-text-primary">Create Exam</p>
                <p className="text-xs text-text-secondary">The start and end dates generate the timetable rows automatically.</p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="form-group">
                  <label className="label">Exam Name *</label>
                  <input className="input" placeholder="e.g. Mid Term Exam" value={examForm.name} onChange={event => setExamForm(current => ({ ...current, name: event.target.value }))} />
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

          <div className="campus-panel p-5">
            <div className="grid gap-4 md:grid-cols-2">
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
              <div className="mt-5 flex justify-end">
                <button type="button" onClick={handleAnnounceSchedule} disabled={announcing || !selectedExamId || !selectedClassId} className="btn-secondary btn-sm">
                  {announcing ? 'Announcing...' : 'Announce Timetable'}
                </button>
              </div>
            ) : (
              <div className="mt-5 rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-text-secondary">
                Only the super admin can edit or announce the exam timetable. Other roles can view it here.
              </div>
            )}
          </div>

          <div className="campus-panel overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="font-bold text-slate-900">{selectedClass ? `Timetable for ${selectedClass.displayName || `Grade ${selectedClass.grade}-${selectedClass.section}`}` : 'Exam Timetable'}</h3>
                <p className="text-xs text-text-secondary">Click a period cell to assign an exam, then choose the exam duration inside the popup.</p>
              </div>
            </div>

            {scheduleLoading || subjectLoading ? <PageLoader /> : periods.length === 0 ? (
              <div className="px-4 py-10">
                <EmptyState title="No timetable periods available" description="Create or generate the school periods first so exam timings can be selected." />
              </div>
            ) : calendarDays.length === 0 ? (
              <div className="px-4 py-10">
                <EmptyState title="No exam dates generated" description="Create an exam with a valid start date and end date to generate the timetable rows." />
              </div>
            ) : (
              <div className="tt-container-fixed pb-6">
                <table className="tt-grid !table-fixed !w-full">
                  <thead>
                    <tr className="!table-row">
                      <th className="tt-header-cell tt-day-header !w-24 !p-1">Day</th>
                      {periods.map(period => (
                        <th key={period._id} className="tt-header-cell !p-0.5">
                          <div className="flex flex-col items-center">
                            <span className="w-full truncate text-[8px] font-black uppercase tracking-tighter text-slate-800 leading-none">{period.name}</span>
                            <span className="mt-0.5 w-full truncate text-[7px] font-bold text-slate-400">{period.startTime}-{period.endTime}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {calendarDays.map(day => {
                      const entry = day.entry;
                      const entryRange = getEntryPeriodRange(entry, periods);

                      return (
                        <tr key={day.date} className="!table-row">
                          <td className="tt-header-cell tt-day-header !bg-white !text-center !font-black !text-[10px] !py-1">
                            <div className="leading-none">
                              <div>{day.weekday.slice(0, 3)}</div>
                              <div className="mt-1 text-[8px] font-bold text-slate-400 normal-case">{formatIndianDate(day.date)}</div>
                            </div>
                          </td>
                          {entry?.slotType === 'holiday' || entry?.slotType === 'no_session' ? (
                            <td colSpan={periods.length} className="tt-slot group !table-cell" style={{ borderTop: `2px solid ${entry?.slotType === 'holiday' ? '#f43f5e' : '#64748b'}` }}>
                              <button type="button" onClick={() => isSuperAdmin && openEditor(day)} disabled={!isSuperAdmin} className="flex h-full w-full flex-col items-center justify-center text-center leading-none">
                                <p className="tt-slot-subject !text-[10px] truncate w-full">{entry?.slotType === 'holiday' ? 'Holiday' : 'No Session'}</p>
                                <p className="tt-slot-teacher !text-[7px] truncate w-full opacity-70">{entry?.note || day.holidayReason || 'Full day entry'}</p>
                              </button>
                            </td>
                          ) : periods.map((period, index) => {
                            if (entryRange && index > entryRange.startIndex && index <= entryRange.endIndex) {
                              return null;
                            }

                            if (entryRange && index === entryRange.startIndex) {
                              const borderColor = entry?.slotType === 'revision' ? '#0ea5e9' : '#16a34a';
                              return (
                                <td key={`${day.date}-${period._id}`} colSpan={entryRange.span} className="tt-slot group !table-cell" style={{ borderTop: `2px solid ${borderColor}` }}>
                                  <button type="button" onClick={() => isSuperAdmin && openEditor(day, period._id)} disabled={!isSuperAdmin} className="flex h-full w-full flex-col items-center justify-center text-center leading-none">
                                    <p className="tt-slot-subject !text-[9px] truncate w-full">{entry?.paperName || entry?.subject?.name || (entry?.slotType === 'revision' ? 'Revision' : 'Exam')}</p>
                                    <p className="tt-slot-teacher !text-[7px] truncate w-full opacity-70">{entry?.slotType === 'revision' ? 'Revision' : 'Exam'}</p>
                                    <span className="tt-slot-class !text-[7px] truncate w-full">
                                      {entry?.period?.name}{entry?.endPeriod && String(entry.period?._id) !== String(entry.endPeriod?._id) ? ` - ${entry.endPeriod.name}` : ''}
                                    </span>
                                  </button>
                                </td>
                              );
                            }

                            return (
                              <td
                                key={`${day.date}-${period._id}`}
                                className={`tt-slot tt-slot-empty group !table-cell ${isSuperAdmin ? 'cursor-pointer' : ''}`}
                                onClick={() => isSuperAdmin && openEditor(day, period._id)}
                              >
                                <div className="flex flex-col items-center justify-center">
                                  {isSuperAdmin ? (
                                    <>
                                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors group-hover:bg-primary-100 group-hover:text-primary-600">
                                        <span className="text-[8px] font-black">+</span>
                                      </div>
                                      <span className="mt-1 text-[7px] font-black uppercase tracking-tighter text-slate-300">Assign</span>
                                    </>
                                  ) : (
                                    <span className="text-[6px] font-black uppercase tracking-tighter text-slate-100">Free</span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <Modal
            open={editor.open}
            onClose={closeEditor}
            title="Assign Exam"
            size="lg"
            footer={(
              <>
                <button onClick={closeEditor} className="btn-secondary btn-sm">Cancel</button>
                <button onClick={handleSaveSlot} disabled={savingSlot} className="btn-primary btn-sm">
                  {savingSlot ? 'Saving...' : 'Save Schedule'}
                </button>
              </>
            )}
          >
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {editor.day ? `${formatIndianDate(editor.day.date)} • ${editor.day.weekday}` : '-'}
              </div>

              <div className="form-group">
                <label className="label">Slot Type</label>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {SLOT_TYPES.map(option => (
                    <label key={option.value} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                      <input
                        type="radio"
                        name="slotType"
                        checked={slotForm.slotType === option.value}
                        onChange={() => setSlotForm(current => ({ ...current, slotType: option.value, subjectKey: '' }))}
                        className="accent-primary-700"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              {slotForm.slotType === 'exam' ? (
                <div className="form-group">
                  <label className="label">Subject</label>
                  <SearchableSelect options={subjectOptions} value={slotForm.subjectKey} onChange={value => setSlotForm(current => ({ ...current, subjectKey: value }))} placeholder="Select subject..." />
                </div>
              ) : null}

              {(slotForm.slotType === 'exam' || slotForm.slotType === 'revision') ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="form-group">
                      <label className="label">From Period</label>
                      <SearchableSelect options={periodOptions} value={slotForm.fromPeriodId} onChange={value => setSlotForm(current => ({ ...current, fromPeriodId: value, toPeriodId: value }))} placeholder="Select starting period..." />
                    </div>
                    <div className="form-group">
                      <label className="label">To Period</label>
                      <SearchableSelect options={toPeriodOptions} value={slotForm.toPeriodId} onChange={value => setSlotForm(current => ({ ...current, toPeriodId: value }))} placeholder="Select ending period..." />
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Timetable Period Selection</p>
                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      {periods.map(period => {
                        const isFrom = String(slotForm.fromPeriodId) === String(period._id);
                        const isTo = String(slotForm.toPeriodId) === String(period._id);
                        const inRange = selectedFromPeriod && selectedToPeriod
                          ? Number(period.periodNo) >= Number(selectedFromPeriod.periodNo) && Number(period.periodNo) <= Number(selectedToPeriod.periodNo)
                          : false;
                        return (
                          <button
                            key={period._id}
                            type="button"
                            onClick={() => {
                              if (!slotForm.fromPeriodId || (selectedFromPeriod && selectedToPeriod)) {
                                setSlotForm(current => ({ ...current, fromPeriodId: period._id, toPeriodId: period._id }));
                                return;
                              }
                              if (selectedFromPeriod && Number(period.periodNo) >= Number(selectedFromPeriod.periodNo)) {
                                setSlotForm(current => ({ ...current, toPeriodId: period._id }));
                                return;
                              }
                              setSlotForm(current => ({ ...current, fromPeriodId: period._id, toPeriodId: period._id }));
                            }}
                            className={`rounded-lg border px-3 py-3 text-left transition ${
                              isFrom || isTo
                                ? 'border-primary-500 bg-primary-50'
                                : inRange
                                  ? 'border-sky-200 bg-sky-50'
                                  : 'border-slate-200 bg-white hover:border-primary-300 hover:bg-primary-50'
                            }`}
                          >
                            <p className="text-xs font-semibold text-slate-900">{period.name}</p>
                            <p className="mt-1 text-[11px] text-slate-500">{period.startTime} - {period.endTime}</p>
                            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                              {isFrom && isTo ? 'From / To' : isFrom ? 'From' : isTo ? 'To' : inRange ? 'Selected Range' : 'Select'}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Selected timing:
                {' '}
                <strong>
                  {selectedFromPeriod && selectedToPeriod
                    ? `${selectedFromPeriod.name} to ${selectedToPeriod.name} (${selectedFromPeriod.startTime}-${selectedToPeriod.endTime})`
                    : 'Choose the period range'}
                </strong>
              </div>

              {slotForm.slotType === 'exam' ? (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="form-group">
                      <label className="label">Max Marks</label>
                      <input type="number" className="input" value={slotForm.maxMarks} onChange={event => setSlotForm(current => ({ ...current, maxMarks: event.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="label">Pass Marks</label>
                      <input type="number" className="input" value={slotForm.passMarks} onChange={event => setSlotForm(current => ({ ...current, passMarks: event.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="label">Hall</label>
                      <input className="input" value={slotForm.hall} onChange={event => setSlotForm(current => ({ ...current, hall: event.target.value }))} placeholder="Optional hall / room" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="label">Exam Note</label>
                    <textarea className="input min-h-[96px]" value={slotForm.note} onChange={event => setSlotForm(current => ({ ...current, note: event.target.value }))} placeholder="Optional note for this exam day" />
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label className="label">Note</label>
                  <textarea className="input min-h-[96px]" value={slotForm.note} onChange={event => setSlotForm(current => ({ ...current, note: event.target.value }))} placeholder={slotForm.slotType === 'revision' ? 'Revision note' : 'Reason / note'} />
                </div>
              )}
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
