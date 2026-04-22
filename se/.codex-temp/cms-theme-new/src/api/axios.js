import axios from 'axios';
import { getLoginPathForRole } from '../utils/authRedirect';
import { getUserFriendlyErrorMessage } from '../utils/errorMessages';
import {
  clearStoredTenantSession,
  getStoredInstitutionPortalKey,
  getStoredPlatformRole,
  getStoredUserRole,
} from '../utils/tenant';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

const sanitizeDownloadFileName = value => {
  const text = String(value || '').trim();
  if (!text || text === '[object Object]') return 'document.pdf';

  const cleaned = text.replace(/[<>:"/\\|?*\u0000-\u001F]+/g, '-');
  return cleaned || 'document.pdf';
};

api.interceptors.response.use(
  res => res,
  err => {
    const friendlyMessage = getUserFriendlyErrorMessage(
      err,
      'Something went wrong. Please try again.'
    );

    if (err.response?.data) {
      err.response.data.message = friendlyMessage;
    }
    err.userMessage = friendlyMessage;

    const requestUrl = err.config?.url || '';
    const isAuthAttempt =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/platform/login') ||
      requestUrl.includes('/auth/me') ||
      requestUrl.includes('/auth/logout') ||
      requestUrl.includes('/auth/send-otp') ||
      requestUrl.includes('/auth/verify-otp') ||
      requestUrl.includes('/parent/send-otp') ||
      requestUrl.includes('/parent/verify-otp') ||
      requestUrl.includes('/parent/request-register-otp') ||
      requestUrl.includes('/parent/verify-register-otp') ||
      requestUrl.includes('/parent/register');

    if (err.response?.status === 401 && !isAuthAttempt) {
      const userRole = getStoredUserRole();
      const institutionPortalKey = getStoredInstitutionPortalKey();
      const platformRole = getStoredPlatformRole();
      clearStoredTenantSession();
      window.location.href = getLoginPathForRole(userRole, institutionPortalKey, platformRole);
    }
    return Promise.reject(err);
  }
);

const downloadPdfFromResponse = (response, fallbackFileName) => {
  const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  const contentDisposition = response.headers['content-disposition'] || '';
  const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  link.href = blobUrl;
  link.download = sanitizeDownloadFileName(filenameMatch?.[1] || fallbackFileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};

export const downloadPdf = async (url, fallbackFileName = 'document.pdf') => {
  const response = await api.get(url, { responseType: 'blob' });
  downloadPdfFromResponse(response, fallbackFileName);
};

export const downloadPaymentReceipt = async paymentReceiptNo => {
  await downloadPdf(
    `/payments/receipt/${encodeURIComponent(paymentReceiptNo)}`,
    'fee-payment-receipt.pdf'
  );
};

export const downloadWalletReceipt = async (studentId, transactionReceiptNo) => {
  await downloadPdf(
    `/wallet/${encodeURIComponent(studentId)}/transactions/${encodeURIComponent(transactionReceiptNo)}/receipt`,
    'wallet-receipt.pdf'
  );
};

export const downloadSaleReceipt = async billNo => {
  await downloadPdf(`/shop/sales/${encodeURIComponent(billNo)}/receipt`, 'sale-receipt.pdf');
};

export default api;
