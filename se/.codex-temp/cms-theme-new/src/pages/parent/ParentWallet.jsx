import React, { useEffect, useState } from 'react';
import api, { downloadWalletReceipt } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { PageSpinner, EmptyState } from '../../components/common';
import { loadRazorpay } from '../../utils/loadRazorpay';
import toast from 'react-hot-toast';
import {
  FiArrowDown, FiArrowUp, FiCreditCard, FiDownload,
} from '../../components/common/icons';

const QUICK = [100, 200, 500, 1000];

export default function ParentWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [paying, setPaying] = useState(false);

  const studentId = user?.studentRef?._id || user?.studentRef;

  const fetchWallet = async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    try {
      const r = await api.get(`/wallet/${studentId}`);
      setWallet(r.data.wallet);
    } catch {
      toast.error('Failed to load wallet');
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
      const orderRes = await api.post('/wallet/topup/order', {
        studentId,
        amount: Number(amount),
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
        description: desc || "Child's Wallet Top-Up",
        order_id: order.id,
        handler: async response => {
          await api.post('/wallet/topup/verify', {
            ...response,
            studentId,
            amount: Number(amount),
          });
          toast.success(`Rs. ${amount} added to wallet!`);
          setAmount('');
          setDesc('');
          fetchWallet();
        },
        prefill: {
          name: user?.name,
          contact: user?.phone,
        },
        theme: { color: '#16a34a' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Top-up failed');
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <PageSpinner />;

  const handleReceiptDownload = async transactionReceiptNo => {
    if (!studentId || !transactionReceiptNo) return;
    try {
      await downloadWalletReceipt(studentId, transactionReceiptNo);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download receipt');
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="page-title mb-6">Child&apos;s Wallet</h1>

      <div className="bg-gradient-to-r from-green-700 to-green-600 rounded-2xl p-6 text-white mb-6 shadow-lg">
        <p className="text-green-100 text-sm mb-1">Available Balance</p>
        <p className="text-5xl font-bold">
          Rs. {(wallet?.balance || 0).toLocaleString('en-IN')}
        </p>
        <p className="text-green-100 text-xs mt-3">
          Used at Canteen and Shop inside college
        </p>
      </div>

      <div className="card mb-6">
        <h3 className="section-title mb-4">Add Money to Wallet</h3>

        <div className="flex gap-2 mb-4 flex-wrap">
          {QUICK.map(value => (
            <button
              key={value}
              onClick={() => setAmount(String(value))}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                Number(amount) === value
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
              }`}
            >
              Rs. {value}
            </button>
          ))}
        </div>

        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
            Rs.
          </span>
          <input
            type="number"
            className="input pl-12 text-lg"
            placeholder="Enter amount (min Rs. 10)"
            min="10"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>

        <input
          className="input mb-3"
          placeholder="Note (optional) e.g. Monthly canteen allowance"
          value={desc}
          onChange={e => setDesc(e.target.value)}
        />

        {amount && Number(amount) >= 10 && (
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl mb-3">
            <span className="text-sm text-green-700">New balance after top-up</span>
            <span className="text-lg font-bold text-green-700">
              Rs. {((wallet?.balance || 0) + Number(amount)).toLocaleString('en-IN')}
            </span>
          </div>
        )}

        <button
          onClick={handleTopup}
          disabled={paying || !amount || Number(amount) < 10}
          className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {paying ? 'Processing...' : `Add Rs. ${amount || 0} to Wallet`}
        </button>
        <p className="text-xs text-gray-400 mt-2">
          Secure payment via Razorpay. Minimum Rs. 10.
        </p>
      </div>

      <div className="card">
        <h3 className="section-title mb-4">Transaction History</h3>
        {!wallet?.transactions?.length ? (
          <EmptyState message="No transactions yet" icon={<FiCreditCard />} />
        ) : (
          <div className="space-y-0">
            {[...wallet.transactions].reverse().map((txn, index) => (
              <div
                key={txn.receiptNo || index}
                className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                      txn.type === 'credit'
                        ? 'bg-green-100 text-green-700'
                        : txn.description?.toLowerCase().includes('canteen')
                          ? 'bg-orange-100 text-orange-700'
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
                    {txn.type === 'credit' ? '+' : '-'}
                    Rs. {txn.amount?.toLocaleString('en-IN')}
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
        )}
      </div>
    </div>
  );
}
