import { useState } from 'react';

const PaymentPage = () => {
  const [activeTab, setActiveTab] = useState('history');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');

  const [paymentHistory, setPaymentHistory] = useState([
    {
      id: 1,
      invoiceNumber: 'INV-2026-04-001',
      month: 'April 2026',
      amount: 15000,
      status: 'paid',
      paymentDate: '2026-04-13',
      paymentMethod: 'Credit Card (Visa)',
      transactionId: 'TXN-2026-04-001',
    },
    {
      id: 2,
      invoiceNumber: 'INV-2026-03-001',
      month: 'March 2026',
      amount: 15000,
      status: 'paid',
      paymentDate: '2026-03-15',
      paymentMethod: 'Credit Card (Mastercard)',
      transactionId: 'TXN-2026-03-001',
    },
    {
      id: 3,
      invoiceNumber: 'INV-2026-02-001',
      month: 'February 2026',
      amount: 15000,
      status: 'paid',
      paymentDate: '2026-02-10',
      paymentMethod: 'Bank Transfer',
      transactionId: 'TXN-2026-02-001',
    },
    {
      id: 4,
      invoiceNumber: 'INV-2026-01-001',
      month: 'January 2026',
      amount: 15000,
      status: 'paid',
      paymentDate: '2026-01-05',
      paymentMethod: 'UPI (GPay)',
      transactionId: 'TXN-2026-01-001',
    },
    {
      id: 5,
      invoiceNumber: 'INV-2025-12-001',
      month: 'December 2025',
      amount: 15000,
      status: 'refunded',
      paymentDate: '2025-12-20',
      refundDate: '2025-12-25',
      paymentMethod: 'Credit Card (Visa)',
      transactionId: 'TXN-2025-12-001',
    },
  ]);

  const [statistics, setStatistics] = useState({
    totalPaid: 75000,
    totalPending: 0,
    totalRefunded: 15000,
    averagePaymentTime: '5 days',
  });

  const filteredHistory = paymentHistory.filter((payment) => {
    if (filterStatus !== 'all' && payment.status !== filterStatus) return false;
    const paymentMonth = payment.month.split(' ')[1];
    const currentYear = new Date().getFullYear();
    if (filterMonth !== 'all' && paymentMonth !== filterMonth) return false;
    return true;
  });

  const exportAsCSV = () => {
    const csv = [
      ['Invoice Number', 'Month', 'Amount', 'Status', 'Payment Date', 'Payment Method', 'Transaction ID'],
      ...filteredHistory.map((p) => [
        p.invoiceNumber,
        p.month,
        p.amount,
        p.status,
        p.paymentDate,
        p.paymentMethod,
        p.transactionId,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/50 p-8 backdrop-blur-sm">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-200 to-blue-400 bg-clip-text text-transparent">
            Payment History
          </h1>
          <p className="text-slate-400 mt-2">Track all your payments and transactions</p>
        </div>

        {/* STATISTICS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-900/20 to-slate-900/50 p-6">
            <p className="text-sm text-emerald-300 mb-2">💰 Total Paid</p>
            <p className="text-3xl font-bold text-emerald-400">₹{statistics.totalPaid.toLocaleString()}</p>
          </div>

          <div className="rounded-2xl border border-yellow-500/15 bg-gradient-to-br from-yellow-900/20 to-slate-900/50 p-6">
            <p className="text-sm text-yellow-300 mb-2">⏳ Pending</p>
            <p className="text-3xl font-bold text-yellow-400">₹{statistics.totalPending.toLocaleString()}</p>
          </div>

          <div className="rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-cyan-900/20 to-slate-900/50 p-6">
            <p className="text-sm text-cyan-300 mb-2">↩️ Refunded</p>
            <p className="text-3xl font-bold text-cyan-400">₹{statistics.totalRefunded.toLocaleString()}</p>
          </div>

          <div className="rounded-2xl border border-purple-500/15 bg-gradient-to-br from-purple-900/20 to-slate-900/50 p-6">
            <p className="text-sm text-purple-300 mb-2">⏱️ Avg Payment Time</p>
            <p className="text-3xl font-bold text-purple-400">{statistics.averagePaymentTime}</p>
          </div>
        </div>

        {/* FILTERS & ACTIONS */}
        <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/50 p-6 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="refunded">Refunded</option>
              </select>

              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Months</option>
                <option value="04">April</option>
                <option value="03">March</option>
                <option value="02">February</option>
                <option value="01">January</option>
                <option value="12">December</option>
              </select>
            </div>

            <button
              onClick={exportAsCSV}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg transition shadow-lg"
            >
              📥 Export as CSV
            </button>
          </div>
        </div>

        {/* PAYMENT HISTORY TABLE */}
        <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/50 p-6 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-cyan-100 mb-6">📋 Transaction History</h2>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg">No transactions found with selected filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Invoice</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Month</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Amount</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Payment Date</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Method</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((payment) => (
                    <tr key={payment.id} className="border-b border-slate-700 hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 text-white font-semibold">{payment.invoiceNumber}</td>
                      <td className="py-3 px-4 text-slate-400">{payment.month}</td>
                      <td className="py-3 px-4 text-cyan-300 font-semibold">₹{payment.amount.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            payment.status === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : payment.status === 'refunded'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-yellow-500/20 text-yellow-300'
                          }`}
                        >
                          {payment.status === 'paid' && '✓ Paid'}
                          {payment.status === 'pending' && '⏳ Pending'}
                          {payment.status === 'refunded' && '↩️ Refunded'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-sm">{payment.paymentDate}</td>
                      <td className="py-3 px-4 text-slate-400 text-sm">{payment.paymentMethod}</td>
                      <td className="py-3 px-4">
                        <button className="px-4 py-1.5 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 rounded transition text-sm font-semibold">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PAYMENT METHODS */}
        <div className="rounded-2xl border border-purple-500/15 bg-slate-900/50 p-6 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-purple-100 mb-6">💳 Available Payment Methods</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-cyan-500 transition cursor-pointer">
              <p className="text-white font-semibold mb-2">💳 Credit Card</p>
              <p className="text-sm text-slate-400">Visa, Mastercard, Amex</p>
            </div>

            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-cyan-500 transition cursor-pointer">
              <p className="text-white font-semibold mb-2">🏦 Bank Transfer</p>
              <p className="text-sm text-slate-400">Direct Bank Account</p>
            </div>

            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-cyan-500 transition cursor-pointer">
              <p className="text-white font-semibold mb-2">📱 UPI</p>
              <p className="text-sm text-slate-400">GPay, PhonePe, Paytm</p>
            </div>
          </div>
        </div>

        {/* REFUND POLICY */}
        <div className="rounded-2xl border border-blue-500/15 bg-slate-900/50 p-6 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-blue-100 mb-4">ℹ️ Refund Policy</h2>
          <p className="text-slate-300 mb-4">
            Refunds are processed within 5-7 business days. If you believe a payment was made in error, 
            please contact our support team at support@propertymanage.com or call +91-1234-567-890.
          </p>
          <button className="px-6 py-2 border border-blue-500/30 text-blue-300 hover:bg-blue-500/10 rounded-lg transition font-semibold">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
