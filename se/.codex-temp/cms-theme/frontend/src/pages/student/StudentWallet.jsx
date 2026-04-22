import React, { useEffect, useState } from 'react';
import api, { downloadWalletReceipt } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { EmptyState, PageSpinner } from '../../components/common';
import { loadRazorpay } from '../../utils/loadRazorpay';
import toast from 'react-hot-toast';
import {
  FiArrowDown,
  FiArrowUp,
  FiCreditCard,
  FiDownload,
} from '../../components/common/icons';

export default function StudentWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [paying, setPaying] = useState(false);

  const studentId = user?.studentRef?._id || user?.studentRef;

  const fetchWallet = async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get(`/wallet/${studentId}`);
      setWallet(response.data.wallet);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [studentId]);

  const handleTopup = async () => {
    if (!amount || Number(amount) < 10) {
      toast.error('Minimum top-up is Rs. 10');
      return;
    }

    setPaying(true);
    try {
      const orderResponse = await api.post('/wallet/topup/order', {
        studentId,
        amount: Number(amount),
      });
      const { order, key } = orderResponse.data;
      const razorpayLoaded = await loadRazorpay();
      if (!razorpayLoaded) {
        throw new Error('Unable to load payment gateway');
      }

      const options = {
        key,
        amount: order.amount,
        currency: 'INR',
        name: 'College Management',
        description: 'Wallet Top-Up',
        order_id: order.id,
        handler: async response => {
          await api.post('/wallet/topup/verify', {
            ...response,
            studentId,
            amount: Number(amount),
          });
          toast.success(`Rs. ${amount} added to wallet!`);
          setAmount('');
          fetchWallet();
        },
        prefill: { name: user?.name, contact: user?.phone },
        theme: { color: '#2563eb' },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Top-up failed');
    } finally {
      setPaying(false);
    }
  };

  const handleReceiptDownload = async transactionReceiptNo => {
    if (!studentId || !transactionReceiptNo) return;
    try {
      await downloadWalletReceipt(studentId, transactionReceiptNo);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download receipt');
    }
  };

  const quickAmounts = [100, 200, 500, 1000];

  if (loading) return <PageSpinner />;

  return (
    <div className="max-w-2xl">
      <h1 className="page-title mb-6">My Wallet</h1>

      <div className="mb-6 rounded-2xl bg-gradient-to-r from-primary-700 to-primary-600 p-6 text-white shadow-lg">
        <p className="mb-1 text-sm text-primary-200">Available Balance</p>
        <p className="text-5xl font-bold">
          Rs. {(wallet?.balance || 0).toLocaleString('en-IN')}
        </p>
        <p className="mt-3 text-xs text-primary-200">
          Use for shop and canteen purchases
        </p>
      </div>

      <div className="card mb-6">
        <h3 className="section-title">Top Up Wallet</h3>

        <div className="mb-4 flex flex-wrap gap-2">
          {quickAmounts.map(value => (
            <button
              key={value}
              type="button"
              onClick={() => setAmount(String(value))}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                Number(amount) === value
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-primary-400'
              }`}
            >
              Rs. {value}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-gray-500">
              Rs.
            </span>
            <input
              type="number"
              className="input pl-9"
              placeholder="Enter amount"
              min="10"
              value={amount}
              onChange={event => setAmount(event.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={handleTopup}
            disabled={paying || !amount}
            className="btn-primary whitespace-nowrap px-6"
          >
            {paying ? 'Processing...' : 'Add Money'}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Secure payment via Razorpay. Minimum Rs. 10.
        </p>
      </div>

      <div className="card">
        <h3 className="section-title">Transaction History</h3>
        <div className="space-y-0">
          {!wallet?.transactions?.length && (
            <EmptyState message="No transactions yet" icon={<FiCreditCard />} />
          )}
          {[...(wallet?.transactions || [])].reverse().map((txn, index) => (
            <div
              key={txn.receiptNo || index}
              className="flex items-center justify-between border-b border-gray-50 py-3 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                    txn.type === 'credit'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {txn.type === 'credit' ? <FiArrowUp /> : <FiArrowDown />}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{txn.description}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(txn.date).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`font-semibold ${
                    txn.type === 'credit' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {txn.type === 'credit' ? '+' : '-'}Rs. {txn.amount?.toLocaleString('en-IN')}
                </span>
                {txn.receiptNo ? (
                  <button
                    type="button"
                    onClick={() => handleReceiptDownload(txn.receiptNo)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary-500 bg-white text-primary-600 transition hover:bg-primary-600 hover:text-white"
                    aria-label={`Download receipt for ${txn.description}`}
                    title="Download receipt"
                  >
                    <FiDownload className="text-sm" />
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
