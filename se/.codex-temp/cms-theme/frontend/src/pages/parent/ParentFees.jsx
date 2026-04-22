import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { ExportActions, PageSpinner, StatusBadge, EmptyState } from '../../components/common';
import { loadRazorpay } from '../../utils/loadRazorpay';
import toast from 'react-hot-toast';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiCreditCard,
  FiInfo,
} from '../../components/common/icons';

export default function ParentFees() {
  const { user } = useAuth();
  const [fees, setFees] = useState([]);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [currentSemester, setCurrentSemester] = useState(0);
  const [loading, setLoading] = useState(true);
  const [payingFeeId, setPayingFeeId] = useState(null);
  const [paymentChoices, setPaymentChoices] = useState({});

  const studentId = user?.studentRef?._id || user?.studentRef;

  const fetchFees = async () => {
    const r = await api.get('/parent/fees');
    setFees(r.data.fees || []);
    setAdvanceAmount(Number(r.data.advanceAmount || 0));
    setCurrentSemester(Number(r.data.currentSemester || 0));
    setLoading(false);
  };

  useEffect(() => {
    fetchFees();
  }, []);

  const fmt = n => `Rs. ${(n || 0).toLocaleString('en-IN')}`;
  const getEffectiveTotal = fee => Number(fee?.totalAmount || 0) + Number(fee?.totalFine || 0);
  const payAmount = fee => Math.max(fee?.totalDue || 0, 0);
  const getChoice = fee => paymentChoices[fee._id] || { mode: 'full', amount: String(payAmount(fee)) };
  const getSelectedAmount = fee => {
    const choice = getChoice(fee);
    return choice.mode === 'custom' ? Number(choice.amount) : payAmount(fee);
  };
  const getRemainingDuePreview = fee => Math.max(payAmount(fee) - getSelectedAmount(fee), 0);
  const getAdvancePreview = fee => Math.max(getSelectedAmount(fee) - payAmount(fee), 0);
  const nextSemesterLabel = currentSemester > 0 ? `Semester ${currentSemester + 1}` : 'the next semester';
  const getFeeNextSemesterLabel = fee => {
    const feeSemester = Number(fee?.semester);
    return Number.isFinite(feeSemester) && feeSemester > 0
      ? `Semester ${feeSemester + 1}`
      : nextSemesterLabel;
  };

  const updateChoice = (fee, updates) => {
    setPaymentChoices(current => {
      const existing = current[fee._id] || { mode: 'full', amount: String(payAmount(fee)) };
      return {
        ...current,
        [fee._id]: {
          ...existing,
          ...updates,
        },
      };
    });
  };

  const handlePay = async fee => {
    if (payingFeeId) return;

    try {
      setPayingFeeId(fee._id);
      const amountToPay = Number(getSelectedAmount(fee));
      if (!Number.isFinite(amountToPay) || amountToPay <= 0) {
        toast.error('Enter a valid payment amount');
        return;
      }

      if (amountToPay < 1) {
        toast.error('Minimum payment is Rs. 1');
        return;
      }

      if (payAmount(fee) <= 0) {
        toast.error('No pending due for this semester');
        return;
      }

      const orderRes = await api.post('/payments/create-order', {
        amount: amountToPay,
        studentFeesId: fee._id,
        studentId,
      });
      const { order, key } = orderRes.data;
      const razorpayLoaded = await loadRazorpay();
      if (!razorpayLoaded) {
        throw new Error('Unable to load payment gateway');
      }

      const options = {
        key,
        amount: order.amount,
        currency: 'INR',
        name: 'College Management',
        description: `Fee Payment - ${fee.academicYear}`,
        order_id: order.id,
        handler: async response => {
          const verifyRes = await api.post('/payments/verify', {
            ...response,
            studentFeesId: fee._id,
            studentId,
            amount: amountToPay,
          });
          toast.success(verifyRes.data?.message || 'Payment successful');
          fetchFees();
        },
        prefill: { name: user?.name, contact: user?.phone },
        theme: { color: '#16a34a' },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setPayingFeeId(null);
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Fee Details</h1>
        <ExportActions
          getExportConfig={() => ({
            fileName: 'parent-fees',
            title: 'Parent Fees Export',
            subtitle: 'Fee records visible to the logged-in parent.',
            summary: [
              { label: 'Fee Records', value: fees.length },
              { label: 'Total Billed', value: fmt(fees.reduce((sum, fee) => sum + getEffectiveTotal(fee), 0)) },
              { label: 'Total Paid', value: fmt(fees.reduce((sum, fee) => sum + Number(fee.totalPaid || 0), 0)) },
              { label: 'Total Due', value: fmt(fees.reduce((sum, fee) => sum + Number(fee.totalDue || 0), 0)) },
              { label: 'Late Fine Total', value: fmt(fees.reduce((sum, fee) => sum + Number(fee.totalFine || 0), 0)) },
            ],
            sections: [
              {
                title: 'Fee Records',
                columns: [
                  { header: 'Academic Year', value: fee => fee.academicYear || '-' },
                  { header: 'Semester', value: fee => fee.semester || '-' },
                  { header: 'Due Date', value: fee => fee.dueDate ? new Date(fee.dueDate).toLocaleDateString('en-IN') : 'N/A' },
                  { header: 'Total', value: fee => fmt(getEffectiveTotal(fee)), align: 'right' },
                  { header: 'Paid', value: fee => fmt(fee.totalPaid), align: 'right' },
                  { header: 'Due', value: fee => fmt(fee.totalDue), align: 'right' },
                  { header: 'Late Fine', value: fee => fee.totalFine > 0 ? fmt(fee.totalFine) : '-', align: 'right' },
                  { header: 'Status', value: fee => fee.status || '-' },
                ],
                rows: fees,
              },
            ],
          })}
          disabled={fees.length === 0}
        />
      </div>
      {advanceAmount > 0 && (
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm font-semibold text-blue-800">Advance balance available</p>
          <p className="mt-1 text-sm text-blue-700">
            {fmt(advanceAmount)} is available and will be adjusted toward {nextSemesterLabel.toLowerCase()} fees.
          </p>
        </div>
      )}
      <div className="space-y-6">
        {fees.map(f => (
          <div key={f._id} className="card">
            {(() => {
              const selectedAmount = Math.max(getSelectedAmount(f), 0);
              const feeNextSemesterLabel = getFeeNextSemesterLabel(f);

              return (
                <>

            <div className="flex flex-wrap justify-between items-start mb-4">
              <div>
                <p className="font-bold text-gray-900 text-base">
                  {f.academicYear} - Semester {f.semester}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Due Date: {f.dueDate ? new Date(f.dueDate).toLocaleDateString('en-IN') : 'N/A'}
                </p>
              </div>
              <StatusBadge status={f.status} />
            </div>

            <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-xs text-blue-500 font-medium mb-1">Total</p>
                <p className="text-lg font-bold text-blue-700">{fmt(getEffectiveTotal(f))}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xs text-green-500 font-medium mb-1">Paid</p>
                <p className="text-lg font-bold text-green-700">{fmt(f.totalPaid)}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-xs text-red-500 font-medium mb-1">Due</p>
                <p className="text-lg font-bold text-red-700">{fmt(f.totalDue)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 overflow-hidden mb-4">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Fee Structure
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Fee Head</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Amount</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Paid</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {f.feeHeads?.map((head, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-gray-700 font-medium">{head.headName}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{fmt(head.amount)}</td>
                      <td className="px-4 py-2.5 text-right text-green-600 font-medium">
                        {head.paid > 0 ? fmt(head.paid) : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium">
                        {head.due > 0 ? (
                          <span className="text-red-600">{fmt(head.due)}</span>
                        ) : (
                          <span className="text-green-500 text-xs font-semibold">Paid</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td className="px-4 py-3 font-bold text-gray-800">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-700">{fmt(getEffectiveTotal(f))}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-700">{fmt(f.totalPaid)}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-700">
                      {f.totalDue > 0 ? fmt(f.totalDue) : (
                        <span className="text-green-600">Fully Paid</span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {f.totalFine > 0 && (
              <div className="mb-4 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-2">
                <FiAlertCircle className="text-orange-500 shrink-0" />
                <p className="text-sm text-orange-700">
                  Late fine applied: <strong>{fmt(f.totalFine)}</strong>
                </p>
              </div>
            )}

            {f.totalDue > 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => updateChoice(f, { mode: 'full', amount: String(payAmount(f)) })}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                      getChoice(f).mode === 'full'
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-primary-400'
                    }`}
                  >
                    Full Amount
                  </button>
                  <button
                    type="button"
                    onClick={() => updateChoice(f, { mode: 'custom', amount: getChoice(f).amount || String(payAmount(f)) })}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                      getChoice(f).mode === 'custom'
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-primary-400'
                    }`}
                  >
                    Custom Amount
                  </button>
                </div>

                {getChoice(f).mode === 'custom' && (
                  <div className="space-y-2">
                    <label className="label mb-0">Enter payment amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">
                        Rs.
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        className="input pl-12"
                        value={getChoice(f).amount}
                        onChange={event => updateChoice(f, { amount: event.target.value })}
                        placeholder={`Current due ${fmt(f.totalDue)}`}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Pay any amount you can now. If you pay extra, it will be adjusted to {feeNextSemesterLabel.toLowerCase()} or kept as advance until that semester is assigned.
                    </p>
                  </div>
                )}

                {selectedAmount > 0 && getRemainingDuePreview(f) > 0 && (
                  <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
                    <p className="text-sm font-medium text-yellow-800">
                      Remaining due after this payment: {fmt(getRemainingDuePreview(f))}
                    </p>
                  </div>
                )}

                {getAdvancePreview(f) > 0 && (
                  <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                    <p className="text-sm font-medium text-green-800">
                      Extra amount moving forward: {fmt(getAdvancePreview(f))}
                    </p>
                    <p className="mt-1 text-xs text-green-700">
                      This extra will be adjusted to {feeNextSemesterLabel.toLowerCase()} fees when available.
                    </p>
                  </div>
                )}

                <button
                  onClick={() => handlePay(f)}
                  className="btn-primary w-full"
                  disabled={Boolean(payingFeeId) || selectedAmount <= 0}
                >
                  {payingFeeId === f._id
                    ? 'Preparing payment...'
                    : `Pay ${fmt(selectedAmount)}`}
                </button>
              </div>
            )}

            {f.totalDue === 0 && (
              <div className="text-center py-3 bg-green-50 rounded-xl border border-green-200">
                <p className="text-green-700 font-semibold text-sm">
                  <FiCheckCircle className="inline mr-1 align-[-2px]" />
                  All fees paid for this semester
                </p>
              </div>
            )}

            {f.totalDue < 0 && (
              <div className="text-center py-3 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-700">
                  <FiInfo className="inline mr-1 align-[-2px]" />
                  This semester has an advance balance of <strong>{fmt(Math.abs(f.totalDue))}</strong>, so no payment is required now.
                </p>
              </div>
            )}
                </>
              );
            })()}
          </div>
        ))}
        {fees.length === 0 && <EmptyState message="No fee records" icon={<FiCreditCard />} />}
      </div>
    </div>
  );
}
