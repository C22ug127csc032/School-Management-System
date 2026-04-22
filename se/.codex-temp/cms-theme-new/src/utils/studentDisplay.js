export const getStudentIdentifier = student =>
  student?.regNo ||
  student?.rollNo ||
  student?.admissionNo ||
  student?.phone ||
  '';

export const getStudentLabel = student => {
  if (!student) return '';

  const name = `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown Student';
  const identifier = getStudentIdentifier(student);

  return identifier ? `${name} (${identifier})` : name;
};

export const getStudentSearchText = student => [
  student?.firstName,
  student?.lastName,
  student?.regNo,
  student?.rollNo,
  student?.admissionNo,
  student?.phone,
  student?.course?.name,
  student?.course?.code,
  student?.className,
  student?.batch,
].filter(Boolean).join(' ');

export const toStudentSelectOption = student => ({
  value: student?._id || '',
  label: getStudentLabel(student),
  searchText: getStudentSearchText(student),
});
