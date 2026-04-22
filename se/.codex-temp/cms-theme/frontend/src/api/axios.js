import axios from 'axios';
import { getLoginPathForRole } from '../utils/authRedirect';
import { getUserFriendlyErrorMessage } from '../utils/errorMessages';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

const sanitizeDownloadFileName = value => {
  const text = String(value || '').trim();
  if (!text || text === '[object Object]') return 'document.pdf';

  const cleaned = text.replace(/[<>:"/\\|?*\u0000-\u001F]+/g, '-');
  return cleaned || 'document.pdf';
};

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

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
      requestUrl.includes('/auth/send-otp') ||
      requestUrl.includes('/auth/verify-otp') ||
      requestUrl.includes('/parent/send-otp') ||
      requestUrl.includes('/parent/verify-otp') ||
      requestUrl.includes('/parent/request-register-otp') ||
      requestUrl.includes('/parent/verify-register-otp') ||
      requestUrl.includes('/parent/register');

    if (err.response?.status === 401 && !isAuthAttempt) {
      const userRole = localStorage.getItem('userRole');
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      delete api.defaults.headers.common['Authorization'];
      window.location.href = getLoginPathForRole(userRole);
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
