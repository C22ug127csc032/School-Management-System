import React, { useState, useEffect } from 'react';
import api, { downloadPaymentReceipt } from '../../api/axios';
import { ExportActions, StatusBadge, EmptyState } from '../../components/common';
import { FiCreditCard, FiDownload } from '../../components/common/icons';
import toast from 'react-hot-toast';

export default function ParentPayments() {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    api.get('/parent/payments').then(r => setPayments(r.data.payments));
  }, []);

  const handleReceiptDownload = async paymentReceiptNo => {
    try {
      await downloadPaymentReceipt(paymentReceiptNo);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download receipt');
    }
  };

  const fmt = n => '₹' + (n || 0).toLocaleString('en-IN');

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Payment History</h1>
        <ExportActions
          getExportConfig={() => ({
            fileName: 'parent-payments',
            title: 'Parent Payments Export',
            subtitle: 'Payment history visible to the logged-in parent.',
            summary: [
              { label: 'Payments', value: payments.length },
              { label: 'Total Paid', value: fmt(payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)) },
            ],
            sections: [
              {
                title: 'Payments',
                columns: [
                  { header: 'Receipt', value: payment => payment.receiptNo || '-' },
                  { header: 'Date', value: payment => new Date(payment.paymentDate).toLocaleDateString('en-IN') },
                  { header: 'Amount', value: payment => fmt(payment.amount), align: 'right' },
                  { header: 'Mode', value: payment => payment.paymentMode || '-' },
                  { header: 'Status', value: payment => payment.status || '-' },
                ],
                rows: payments,
              },
            ],
          })}
          disabled={payments.length === 0}
        />
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-header">Receipt</th>
              <th className="table-header">Date</th>
              <th className="table-header">Amount</th>
              <th className="table-header">Mode</th>
              <th className="table-header">Status</th>
              <th className="table-header">Receipt No</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {payments.map(p => (
              <tr key={p._id} className="hover:bg-gray-50">
                <td className="table-cell font-mono text-xs">{p.receiptNo}</td>
                <td className="table-cell">
                  {new Date(p.paymentDate).toLocaleDateString('en-IN')}
                </td>
                <td className="table-cell font-semibold text-green-600">{fmt(p.amount)}</td>
                <td className="table-cell capitalize">{p.paymentMode}</td>
                <td className="table-cell"><StatusBadge status={p.status} /></td>
                <td className="table-cell">
                  <button
                    type="button"
                    onClick={() => handleReceiptDownload(p.receiptNo)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary-500 bg-white text-primary-600 transition hover:bg-primary-600 hover:text-white"
                    aria-label={`Download receipt ${p.receiptNo}`}
                    title="Download receipt"
                  >
                    <FiDownload className="text-sm" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.length === 0 && <EmptyState message="No payments yet" icon={<FiCreditCard />} />}
      </div>
    </div>
  );
}
