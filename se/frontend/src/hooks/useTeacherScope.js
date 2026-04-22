import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function useTeacherScope() {
  const { user, isTeacher, isAdmin } = useAuth();

  return useMemo(() => {
    const teacher = user?.teacherRef || null;
    const teacherId = teacher?._id || '';
    const classTeacherOf = teacher?.classTeacherOf?._id || teacher?.classTeacherOf || '';
    const eligibleSubjectIds = (teacher?.eligibleSubjects || []).map(subject => String(subject?._id || subject));

    return {
      user,
      teacher,
      teacherId,
      classTeacherOf,
      eligibleSubjectIds,
      isTeacherRole: Boolean(isTeacher && teacherId),
      isAdminRole: Boolean(isAdmin),
      isClassTeacherRole: user?.role === 'class_teacher' || !!classTeacherOf,
    };
  }, [user, isTeacher, isAdmin]);
}
