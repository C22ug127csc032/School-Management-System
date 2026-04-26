import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios.js';
import { EmptyState, PageHeader, PageLoader, SearchableSelect, StatusBadge } from '../../components/common/index.jsx';
import useAcademicYear from '../../hooks/useAcademicYear.js';
import useTeacherScope from '../../hooks/useTeacherScope.js';
import { formatIndianDate } from '../../utils/dateTime.js';

const EXAM_CALENDAR_STYLES = {
  exam_day: {
    card: 'border-emerald-200 bg-emerald-50/80',
    badge: 'bg-emerald-600 text-white',
    label: 'Exam Day',
  },
  working_day: {
    card: 'border-slate-200 bg-slate-50',
    badge: 'bg-slate-600 text-white',
    label: 'Working Day',
  },
  holiday: {
    card: 'border-rose-200 bg-rose-50/80',
    badge: 'bg-rose-600 text-white',
    label: 'Holiday',
  },
  sunday: {
    card: 'border-amber-200 bg-amber-50/80',
    badge: 'bg-amber-600 text-white',
    label: 'Sunday',
  },
  blocked_with_entry: {
    card: 'border-red-300 bg-red-50/90',
    badge: 'bg-red-700 text-white',
    label: 'Conflict',
  },
  exam: {
    card: 'border-emerald-200 bg-emerald-50/80',
    badge: 'bg-emerald-600 text-white',
    label: 'Exam',
  },
  revision: {
    card: 'border-sky-200 bg-sky-50/80',
    badge: 'bg-sky-600 text-white',
    label: 'Revision',
  },
  no_session: {
    card: 'border-slate-200 bg-slate-100',
    badge: 'bg-slate-600 text-white',
    label: 'No Session',
  },
  empty: {
    card: 'border-slate-200 bg-white',
    badge: 'bg-slate-500 text-white',
    label: 'Empty',
  },
  no_exam: {
    card: 'border-slate-200 bg-slate-50',
    badge: 'bg-slate-600 text-white',
    label: 'No Exam',
  },
};

function ExamCalendarPreview({ calendarDays }) {
  return (
    <div className="space-y-4">
      {calendarDays.map(day => {
        const style = EXAM_CALENDAR_STYLES[day.status] || EXAM_CALENDAR_STYLES.no_exam;
        return (
          <div key={day.date} className={`rounded-2xl border p-4 ${style.card}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{day.weekday}</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{formatIndianDate(day.date)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${style.badge}`}>
                {style.label}
              </span>
            </div>

            {day.isHoliday ? (
              <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-sm font-medium text-rose-700">
                {day.holidayReason || 'Holiday'}
              </p>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {day.slots?.map(slot => (
                <div key={slot.key} className={`rounded-2xl border p-3 ${(EXAM_CALENDAR_STYLES[slot.status] || EXAM_CALENDAR_STYLES.no_exam).card}`}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{slot.label}</p>
                  {slot.entry?.slotType === 'exam' ? (
                    <>
                      <p className="mt-2 font-bold text-slate-900">{slot.entry.paperName || slot.entry.subject?.name || 'Subject'}</p>
                      <p className="mt-1 text-sm text-slate-500">{[slot.entry.startTime, slot.entry.endTime].filter(Boolean).join(' - ') || 'Time pending'}</p>
                      {slot.entry.componentSubjects?.length ? (
                        <p className="mt-1 text-xs text-slate-500">{slot.entry.componentSubjects.map(subject => subject?.name).filter(Boolean).join(', ')}</p>
                      ) : null}
                      {slot.entry.hall ? <p className="mt-1 text-xs text-slate-500">Hall: {slot.entry.hall}</p> : null}
                    </>
                  ) : slot.entry?.slotType === 'revision' ? (
                    <>
                      <p className="mt-2 font-bold text-slate-900">Revision</p>
                      <p className="mt-1 text-sm text-slate-500">{[slot.entry.startTime, slot.entry.endTime].filter(Boolean).join(' - ') || 'Time pending'}</p>
                      {slot.entry.note ? <p className="mt-1 text-xs text-slate-500">{slot.entry.note}</p> : null}
                    </>
                  ) : slot.entry?.slotType === 'holiday' ? (
                    <p className="mt-2 text-sm font-semibold text-rose-700">{slot.entry.note || 'Holiday'}</p>
                  ) : slot.entry?.slotType === 'no_session' ? (
                    <p className="mt-2 text-sm font-semibold text-slate-700">{slot.entry.note || 'No session'}</p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">
                      {slot.status === 'sunday'
                        ? 'Sunday break'
                        : slot.status === 'holiday'
                          ? (slot.note || 'Holiday')
                          : 'No slot scheduled'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ReportCardsPage() {
  const academicYear = useAcademicYear();
  const { isTeacherRole, isAdminRole, isClassTeacherRole, teacherId, classTeacherOf } = useTeacherScope();
  const [classes, setClasses] = useState([]);
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [reportCard, setReportCard] = useState(null);
  const [savedMarks, setSavedMarks] = useState([]);
  const [calendarDays, setCalendarDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    setLoading(true);
    const classParams = isTeacherRole
      ? { academicYear, teacherId }
      : { academicYear };

    Promise.all([
      api.get('/classes', { params: classParams }),
      api.get('/exams', { params: { academicYear } }),
    ]).then(([classRes, examRes]) => {
      setClasses(classRes.data.data || []);
      setExams(examRes.data.data || []);
    }).catch(() => {
      toast.error('Failed to load report card data.');
    }).finally(() => setLoading(false));
  }, [academicYear, isTeacherRole, teacherId, classTeacherOf]);

  useEffect(() => {
    if (isTeacherRole && classTeacherOf && !selectedClassId && classes.some(item => String(item._id) === String(classTeacherOf))) {
      setSelectedClassId(classTeacherOf);
    }
  }, [isTeacherRole, classTeacherOf, selectedClassId, classes]);

  useEffect(() => {
    if (selectedClassId && !classes.some(item => String(item._id) === String(selectedClassId))) {
      setSelectedClassId('');
      setSelectedStudentId('');
      setReportCard(null);
    }
  }, [classes, selectedClassId]);

  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      setClassSubjects([]);
      setSelectedStudentId('');
      return;
    }

    const subjectUrl = isClassTeacherRole && classTeacherOf && String(selectedClassId) === String(classTeacherOf)
      ? '/class-subjects'
      : (isTeacherRole ? `/class-subjects/teacher/${teacherId}` : '/class-subjects');

    Promise.all([
      api.get('/students', { params: { classId: selectedClassId, status: 'active', limit: 200, academicYear } }),
      api.get(subjectUrl, { params: { classId: selectedClassId, academicYear } }),
    ])
      .then(([studentResponse, subjectResponse]) => {
        const nextStudents = studentResponse.data.data || [];
        setStudents(nextStudents);
        setClassSubjects(subjectResponse.data.data || []);
        setSelectedStudentId(current => nextStudents.some(item => String(item._id) === String(current)) ? current : (nextStudents[0]?._id || ''));
      })
      .catch(() => toast.error('Failed to load students.'));
  }, [selectedClassId, academicYear, isClassTeacherRole, classTeacherOf, isTeacherRole, teacherId]);

  useEffect(() => {
    if (!selectedExamId || !selectedStudentId) {
      setReportCard(null);
      setSavedMarks([]);
      setCalendarDays([]);
      return;
    }

    setReportLoading(true);
    Promise.all([
      api.get('/exams/report-card', { params: { examId: selectedExamId, studentId: selectedStudentId } }),
      api.get('/exams/marks', { params: { examId: selectedExamId, classId: selectedClassId, studentId: selectedStudentId, academicYear } }),
      api.get('/exams/schedule', { params: { examId: selectedExamId, classId: selectedClassId, includeCalendar: true, academicYear } }),
    ])
      .then(([reportResponse, marksResponse, scheduleResponse]) => {
        setReportCard(reportResponse.data.data);
        setSavedMarks(marksResponse.data.data || []);
        setCalendarDays(scheduleResponse.data.data?.calendarDays || []);
      })
      .catch(err => {
        setReportCard(null);
        setSavedMarks([]);
        setCalendarDays([]);
        toast.error(err.response?.data?.message || 'Failed to load report card.');
      })
      .finally(() => setReportLoading(false));
  }, [selectedExamId, selectedStudentId, selectedClassId, academicYear]);

  const classOptions = classes.map(item => ({ value: item._id, label: item.displayName || `Grade ${item.grade}-${item.section}` }));
  const examOptions = exams.map(item => ({ value: item._id, label: item.name }));
  const studentOptions = students.map(item => ({
    value: item._id,
    label: `${item.firstName} ${item.lastName}${item.rollNo ? ` (${item.rollNo})` : ''}`,
  }));
  const selectedClass = classes.find(item => String(item._id) === String(selectedClassId));
  const selectedStudent = students.find(item => String(item._id) === String(selectedStudentId));
  const selectedExam = exams.find(item => String(item._id) === String(selectedExamId));
  const requiredSubjectIds = useMemo(() => {
    const byId = new Set();
    classSubjects.forEach(item => {
      const subject = item?.subject;
      if (!subject) return;
      const normalizedId = String(subject?.subjectRole === 'sub' && subject?.parentSubject?._id
        ? subject.parentSubject._id
        : subject?._id || '');
      if (normalizedId) byId.add(normalizedId);
    });
    return [...byId];
  }, [classSubjects]);
  const completionCount = savedMarks.length;
  const allSubjectsReady = requiredSubjectIds.length > 0 && requiredSubjectIds.every(subjectId =>
    savedMarks.some(mark => String(mark.subject?._id || mark.subject) === String(subjectId))
  );
  const hasPublishedMarks = savedMarks.length > 0 && savedMarks.every(mark => mark.workflowStatus === 'published');
  const canPublishReportCard = Boolean(
    selectedExamId &&
    selectedClassId &&
    selectedStudentId &&
    allSubjectsReady &&
    !hasPublishedMarks &&
    (isAdminRole || (isClassTeacherRole && classTeacherOf && String(selectedClassId) === String(classTeacherOf))),
  );

  const handlePublishReportCard = async () => {
    if (!canPublishReportCard) return;

    setPublishing(true);
    try {
      const response = await api.post('/exams/marks/publish', {
        examId: selectedExamId,
        classId: selectedClassId,
        studentId: selectedStudentId,
        academicYear,
      });
      toast.success(response.data.message || 'Report card published.');

      const [reportResponse, marksResponse] = await Promise.all([
        api.get('/exams/report-card', { params: { examId: selectedExamId, studentId: selectedStudentId } }),
        api.get('/exams/marks', { params: { examId: selectedExamId, classId: selectedClassId, studentId: selectedStudentId, academicYear } }),
      ]);
      setReportCard(reportResponse.data.data);
      setSavedMarks(marksResponse.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish report card.');
    } finally {
      setPublishing(false);
    }
  };

  const summaryCards = useMemo(() => {
    if (!reportCard) return [];
    return [
      { label: 'Total', value: `${reportCard.summary.totalObtained} / ${reportCard.summary.totalMax}` },
      { label: 'Percentage', value: `${reportCard.summary.percentage}%` },
      { label: 'Result', value: reportCard.summary.result },
      { label: 'Subjects', value: reportCard.summary.totalSubjects },
    ];
  }, [reportCard]);

  return (
    <div className="float-in">
      <PageHeader title="Report Cards" subtitle={isTeacherRole ? 'Review completed marks and publish the final result from here' : 'Preview and publish final student report cards'} />

	      <div className="campus-panel p-4">
	        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="form-group">
            <label className="label">Class</label>
            <SearchableSelect options={classOptions} value={selectedClassId} onChange={setSelectedClassId} placeholder="Select class..." />
          </div>
          <div className="form-group">
            <label className="label">Exam</label>
            <SearchableSelect options={examOptions} value={selectedExamId} onChange={setSelectedExamId} placeholder="Select exam..." />
          </div>
          <div className="form-group">
            <label className="label">Student</label>
            <SearchableSelect options={studentOptions} value={selectedStudentId} onChange={setSelectedStudentId} placeholder="Select student..." />
	        </div>
          {selectedExam ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Selected Exam</p>
                  <h2 className="mt-2 text-lg font-semibold text-text-primary">{selectedExam.name}</h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    {selectedClass?.displayName || 'Selected class'} {selectedStudent ? `• ${selectedStudent.firstName} ${selectedStudent.lastName}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {formatIndianDate(selectedExam.startDate) || '-'} to {formatIndianDate(selectedExam.endDate) || '-'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Portal Status</p>
                  <p className={`mt-2 text-sm font-semibold ${hasPublishedMarks ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {hasPublishedMarks ? 'Published to Parent / Student' : 'Not Published Yet'}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
	      </div>
      </div>

      {loading || reportLoading ? <PageLoader /> : (!selectedClassId || !selectedExamId || !selectedStudentId) ? (
        <div className="campus-panel mt-4">
          <EmptyState title="Select class, exam, and student" description="Choose a class, exam, and student to preview saved marks." />
        </div>
      ) : students.length === 0 ? (
        <div className="campus-panel mt-4">
          <EmptyState title="No students found" description="There are no active students in this class." />
        </div>
      ) : (
        !reportCard ? (
          <div className="campus-panel mt-4">
            <EmptyState
              title="Select a student"
              description={selectedStudent ? `Loading ${selectedStudent.firstName} ${selectedStudent.lastName}'s saved marks.` : 'Choose a student from the dropdown to view saved marks.'}
            />
          </div>
        ) : (
	          <div className="space-y-4">
	            <div className="campus-panel border border-primary-100 bg-primary-50/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Result Release Workflow</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Subject teachers enter marks in Exam Marks. Final parent/student publishing happens from Report Cards after class teacher review.
                  </p>
                  <p className="mt-2 text-xs text-text-secondary">
                    Progress: {completionCount} of {requiredSubjectIds.length || reportCard.summary.totalSubjects} subjects received.
                  </p>
                </div>
                {canPublishReportCard ? (
                  <button onClick={handlePublishReportCard} disabled={publishing} className="btn-primary btn-sm">
                    {publishing ? 'Publishing...' : 'Publish Report Card'}
                  </button>
                ) : null}
              </div>
              {!allSubjectsReady ? (
                <p className="mt-2 text-xs text-amber-700">
                  All subject marks must be submitted before this report card can be published.
                </p>
              ) : null}
              {hasPublishedMarks ? (
                <p className="mt-2 text-xs text-emerald-700">
                  This report card is already published and visible in the parent/student portals.
                </p>
              ) : null}
	            </div>

              <div className="campus-panel overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-4">
                  <p className="text-sm font-semibold text-text-primary">Exam Timetable</p>
                  <p className="mt-1 text-xs text-text-secondary">This shows the same published exam timetable structure used in the class teacher schedule.</p>
                </div>
                <div className="p-5">
                  {calendarDays.length === 0 ? (
                    <EmptyState title="No timetable available" description="Create and announce the exam schedule to preview it here." />
                  ) : (
                    <ExamCalendarPreview calendarDays={calendarDays} />
                  )}
                </div>
              </div>

	            <div className="campus-panel mt-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Student Report Card</p>
                  <h2 className="mt-2 text-2xl font-semibold text-text-primary">{reportCard.student.firstName} {reportCard.student.lastName}</h2>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-text-secondary">
                    <span><strong>Class:</strong> {reportCard.student.className}</span>
                    <span><strong>Admission No:</strong> {reportCard.student.admissionNo || '-'}</span>
                    <span><strong>Roll No:</strong> {reportCard.student.rollNo || '-'}</span>
                    <span><strong>Exam:</strong> {reportCard.exam.name}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Academic Year</p>
                  <p className="mt-2 text-base font-semibold text-text-primary">{reportCard.exam.academicYear}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {summaryCards.map(card => (
                <div key={card.label} className="campus-panel p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">{card.label}</p>
                  <p className="mt-2 text-2xl font-bold text-text-primary">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="campus-panel overflow-hidden">
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
                  {reportCard.marks.length === 0 ? (
                    <tr><td colSpan="6" className="py-10 text-center text-sm text-slate-400">No saved marks found for this student.</td></tr>
                  ) : reportCard.marks.map(mark => (
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
          </div>
        )
      )}
    </div>
  );
}
