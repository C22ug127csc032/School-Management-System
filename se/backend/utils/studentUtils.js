import Student from '../models/Student.model.js';

const GROUP_ROLL_CODES = {
  science_biology: 'BIO',
  science_maths: 'MAT',
  commerce: 'COM',
  arts: 'ART',
};

export const generateAdmissionNo = async () => {
  const year = new Date().getFullYear();
  const latest = await Student.findOne({ admissionNo: { $regex: `^ADM${year}` } })
    .sort({ admissionNo: -1 }).select('admissionNo');
  let seq = 1;
  if (latest?.admissionNo) {
    const n = parseInt(latest.admissionNo.replace(`ADM${year}`, ''), 10);
    if (!isNaN(n)) seq = n + 1;
  }
  return `ADM${year}${String(seq).padStart(4, '0')}`;
};

export const getRollNumberPrefix = ({ grade, section, groupName }) => {
  const normalizedSection = String(section || '').toUpperCase();
  const groupCode = ['11', '12'].includes(String(grade)) ? (GROUP_ROLL_CODES[groupName] || '') : '';
  return `${grade}${normalizedSection}${groupCode}`;
};

export const formatRollNo = ({ grade, section, groupName }, sequence) => (
  `${getRollNumberPrefix({ grade, section, groupName })}${String(sequence).padStart(2, '0')}`
);

export const buildStudentQuery = (search) => {
  if (!search) return {};
  const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return {
    $or: [
      { firstName: re }, { lastName: re },
      { admissionNo: re }, { rollNo: re }, { phone: re }, { email: re },
    ],
  };
};
