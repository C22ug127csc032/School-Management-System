const FIELD_LABELS = {
  admissionNo: 'Admission Number',
  appliedByRole: 'Applicant Type',
  className: 'Class',
  courseId: 'Course',
  email: 'Email',
  exitDate: 'Exit Date',
  expectedReturn: 'Expected Return Date',
  fromDate: 'From Date',
  leaveType: 'Leave Type',
  paymentId: 'Payment',
  phone: 'Phone Number',
  regNo: 'Register Number',
  staffId: 'Staff ID',
  status: 'Status',
  studentId: 'Student',
  toDate: 'To Date',
};

const normalizeMessage = value => String(value || '').replace(/\s+/g, ' ').trim();

const getFailureMessageFromPayload = payload => {
  const firstFailure = payload?.failures?.find(failure => failure?.message)?.message;
  return firstFailure ? normalizeMessage(firstFailure) : '';
};

const humanizeFieldName = fieldName => {
  const normalized = String(fieldName || '').trim();
  if (!normalized) return 'This field';
  if (FIELD_LABELS[normalized]) return FIELD_LABELS[normalized];

  const spaced = normalized
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

export const getUserFriendlyMessage = (message, fallback = 'Something went wrong. Please try again.') => {
  const normalized = normalizeMessage(message);
  if (!normalized) return fallback;

  if (/role\s+['"`].+['"`]\s+not authorized/i.test(normalized)) {
    return 'You do not have permission to access this section.';
  }

  if (/not authorized for/i.test(normalized) || /^not authorized$/i.test(normalized)) {
    return 'You do not have permission to perform this action.';
  }

  if (/no movement records were created/i.test(normalized)) {
    return 'The selected movement could not be recorded. Please review the student status and try again.';
  }

  if (/token invalid or expired/i.test(normalized) || /jwt/i.test(normalized)) {
    return 'Your session has expired. Please sign in again.';
  }

  if (/account deactivated/i.test(normalized)) {
    return 'Your account is inactive. Please contact the administrator.';
  }

  if (/internal key/i.test(normalized)) {
    return 'This option already exists. Please use a different name.';
  }

  if (/system key/i.test(normalized)) {
    return 'This option could not be saved. Please update the label and try again.';
  }

  if (/no exportable data found/i.test(normalized)) {
    return 'Nothing to export right now.';
  }

  if (/must be checked in first/i.test(normalized)) {
    return 'This student must be checked in first.';
  }

  if (/already marked for check-in/i.test(normalized)) {
    return 'This student is already checked in. Record check-out next.';
  }

  if (/already marked for check-out/i.test(normalized)) {
    return 'This student is already checked out. Record check-in next.';
  }

  if (/currently checked in at/i.test(normalized)) {
    return normalized.replace(/check-out/gi, 'Check Out');
  }

  const requiredMatch = normalized.match(/^([A-Za-z0-9_.-]+)\s+is required\.?$/i);
  if (requiredMatch) {
    return `${humanizeFieldName(requiredMatch[1])} is required.`;
  }

  return normalized
    .replace(/\badmission_pending\b/gi, 'Enrollment Pending')
    .replace(/\bcheck_in\b/gi, 'Check In')
    .replace(/\bcheck_out\b/gi, 'Check Out');
};

export const getUserFriendlyErrorMessage = (errorOrMessage, fallback = 'Something went wrong. Please try again.') => {
  if (typeof errorOrMessage === 'string') {
    return getUserFriendlyMessage(errorOrMessage, fallback);
  }

  const failureMessage = getFailureMessageFromPayload(errorOrMessage?.response?.data);
  if (failureMessage) {
    return getUserFriendlyMessage(failureMessage, fallback);
  }

  const candidateMessage =
    errorOrMessage?.response?.data?.message ||
    errorOrMessage?.message ||
    '';

  return getUserFriendlyMessage(candidateMessage, fallback);
};
