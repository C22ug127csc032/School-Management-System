import React, { useEffect, useState } from 'react';
import api, { downloadWalletReceipt } from '../../api/axios';
import {
  EmptyState,
  FilterBar,
  PageHeader,
  PageSpinner,
} from '../../components/common';
import {
  FiArrowDown,
  FiArrowUp,
  FiCreditCard,
  FiDownload,
  FiEye,
  FiInfo,
  FiUser,
  FiX,
} from '../../components/common/icons';
import toast from 'react-hot-toast';

export default function WalletAdmin() {
  const [students, setStudents] = useState([]);
  const [wallets, setWallets] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [txnLoading, setTxnLoading] = useState(false);

  useEffect(() => {
    api.get('/students?limit=200')
      .then(response => setStudents(response.data.students || []))
      .finally(() => setLoading(false));
  }, []);

  const loadWallet = async studentId => {
    if (wallets[studentId]) return;
    try {
      const response = await api.get(`/wallet/${studentId}`);
      setWallets(current => ({ ...current, [studentId]: response.data.wallet }));
    } catch {
      // Ignore hover prefetch failures and let explicit open handle messaging.
    }
  };

  const openDetail = async student => {
    setSelected(student);
    setTxnLoading(true);
    try {
      const response = await api.get(`/wallet/${student._id}`);
      setWallets(current => ({ ...current, [student._id]: response.data.wallet }));
    } catch {
      toast.error('Failed to load wallet');
    } finally {
      setTxnLoading(false);
    }
  };

  const handleTransactionReceiptDownload = async transactionReceiptNo => {
    if (!selected?._id || !transactionReceiptNo) return;
    try {
      await downloadWalletReceipt(selected._id, transactionReceiptNo);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download receipt');
    }
  };

  const filteredStudents = students.filter(student =>
    !search ||
    `${student.firstName} ${student.lastName} ${student.rollNo} ${student.admissionNo} ${student.phone}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const wallet = selected ? wallets[selected._id] : null;

  return (
    <div>
      <PageHeader
        title="Wallet Management"
        subtitle="View student wallet balances and download transaction receipts."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <FilterBar>
            <input
              className="input w-64"
              placeholder="Search by name, student ID, phone..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </FilterBar>

          {loading ? <PageSpinner /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Student</th>
                    <th className="table-header">Roll No</th>
                    <th className="table-header">Balance</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredStudents.map(student => (
                    <tr
                      key={student._id}
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                      onMouseEnter={() => loadWallet(student._id)}
                      onClick={() => openDetail(student)}
                    >
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-xs font-bold text-primary-700">
                            {student.firstName?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-xs text-gray-400">{student.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell font-mono text-xs text-gray-500">
                        {student.rollNo || student.admissionNo || student.regNo || '-'}
                      </td>
                      <td className="table-cell">
                        <span className="text-base font-bold text-green-600">
                          Rs. {wallets[student._id]?.balance?.toLocaleString('en-IN') ?? '-'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <button
                          type="button"
                          onClick={event => {
                            event.stopPropagation();
                            openDetail(student);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary-500 bg-white text-primary-600 transition hover:bg-primary-600 hover:text-white"
                          aria-label={`View wallet for ${student.firstName} ${student.lastName}`}
                          title="View wallet history"
                        >
                          <FiEye className="text-sm" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredStudents.length === 0 && (
                <EmptyState message="No students found" icon={<FiUser />} />
              )}
            </div>
          )}
        </div>

        <div className="card">
          {!selected ? (
            <div className="flex h-64 flex-col items-center justify-center text-gray-300">
              <FiCreditCard className="mb-3 text-4xl" />
              <p className="text-sm">Click a student to view wallet</p>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-center gap-3 border-b border-gray-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 font-bold text-primary-700">
                  {selected.firstName?.[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">
                    {selected.firstName} {selected.lastName}
                  </p>
                  <p className="font-mono text-xs text-gray-400">
                    {selected.rollNo || selected.admissionNo || selected.regNo}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="ml-auto text-gray-400 transition hover:text-gray-600"
                >
                  <FiX />
                </button>
              </div>

              <div className="mb-4 rounded-xl bg-gradient-to-r from-green-600 to-green-500 p-4 text-white">
                <p className="mb-1 text-xs text-green-100">Wallet Balance</p>
                <p className="text-3xl font-bold">
                  Rs. {(wallet?.balance || 0).toLocaleString('en-IN')}
                </p>
                <p className="mt-1 text-xs text-green-200">
                  Parent tops up via Parent Portal
                </p>
              </div>

              <div className="mb-4 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
                <FiInfo className="mt-0.5 shrink-0 text-sm text-blue-500" />
                <p className="text-xs text-blue-700">
                  Only parents can top up the wallet. Canteen and shop operators deduct from the wallet when the student makes a purchase.
                </p>
              </div>

              <p className="mb-3 text-sm font-semibold text-gray-700">
                Recent Transactions
              </p>
              {txnLoading ? (
                <div className="py-6 text-center text-sm text-gray-400">Loading...</div>
              ) : !wallet?.transactions?.length ? (
                <p className="py-6 text-center text-sm text-gray-400">No transactions yet</p>
              ) : (
                <div className="max-h-80 space-y-0 overflow-y-auto">
                  {[...(wallet.transactions || [])].reverse().map((txn, index) => (
                    <div
                      key={txn.receiptNo || index}
                      className="flex items-center justify-between border-b border-gray-50 py-2.5 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
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
                          <p className="text-xs font-medium text-gray-700">
                            {txn.description}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(txn.date).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold ${
                            txn.type === 'credit' ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {txn.type === 'credit' ? '+' : '-'}Rs. {Number(txn.amount || 0).toLocaleString('en-IN')}
                        </span>
                        {txn.receiptNo ? (
                          <button
                            type="button"
                            onClick={() => handleTransactionReceiptDownload(txn.receiptNo)}
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
          )}
        </div>
      </div>
    </div>
  );
}
