import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const TenantDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [complaint, setComplaint] = useState({ title: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [complaintLoading, setComplaintLoading] = useState(false);

  const loadTenantData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/tenant/dashboard');
      setData(res.data.data);
    } catch (err) {
      console.error('Failed to load tenant dashboard', err);
      setError(err.response?.data?.message || 'Unable to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenantData();
  }, []);

  const payRent = async (invoiceId) => {
    try {
      await api.post('/payments/pay', { invoiceId, method: 'razorpay' });
      alert('Payment processed successfully!');
      await loadTenantData();
    } catch (err) {
      console.error('Payment failed', err);
      alert(err.response?.data?.message || 'Payment failed');
    }
  };

  const submitComplaint = async (e) => {
    e.preventDefault();

    if (!complaint.title.trim() || !complaint.description.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setComplaintLoading(true);
      await api.post('/tenant/complaints', complaint);
      setComplaint({ title: '', description: '' });
      await loadTenantData();
      alert('Complaint submitted successfully');
    } catch (err) {
      console.error('Complaint submit failed', err);
      alert(err.response?.data?.message || 'Unable to submit complaint');
    } finally {
      setComplaintLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center text-slate-400 py-20">
          <div className="animate-spin inline-block">⚙️</div>
          <p className="mt-4">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center text-red-400 py-20">
          <p className="text-lg font-semibold">⚠️ {error}</p>
        </div>
      </div>
    );
  }

  if (!data?.tenant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center text-slate-400 py-20">
          <p className="text-lg font-semibold">🔍 No tenant profile found</p>
        </div>
      </div>
    );
  }

  const { tenant, invoices = [], summary = {} } = data;
  const propertyData = tenant.property || {};
  const tenantUser = tenant.user || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* WELCOME HEADER */}
        <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/50 p-8 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-200 to-blue-400 bg-clip-text text-transparent">
                Welcome, {tenantUser.name || 'Tenant'}! 👋
              </h1>
              <p className="mt-2 text-slate-400">Manage your accommodation and payments</p>
            </div>
          </div>

          {/* PROPERTY & ROOM INFO */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <p className="text-sm text-slate-400 mb-1">📍 Property</p>
              <p className="font-semibold text-white">{propertyData.name || 'N/A'}</p>
              <p className="text-xs text-slate-500">{propertyData.city || ''}</p>
            </div>

            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <p className="text-sm text-slate-400 mb-1">🛏️ Room Assignment</p>
              <p className="font-semibold text-white">
                {tenant.floorName ? `Floor ${tenant.floorName}, Room ${tenant.roomNumber}, Bed ${tenant.bedLabel}` : 'N/A'}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <p className="text-sm text-slate-400 mb-1">💰 Monthly Rent</p>
              <p className="font-semibold text-emerald-300 text-lg">₹{tenant.monthlyRent || 0}</p>
              <p className="text-xs text-slate-500">Due on {tenant.dueDayOfMonth || 'N/A'}th of month</p>
            </div>
          </div>
        </div>

        {/* PAYMENTS SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-900/20 to-slate-900/50 p-6 backdrop-blur-sm">
            <p className="text-sm text-emerald-300 mb-2">✅ Paid</p>
            <p className="text-3xl font-bold text-emerald-400">{summary.paid || 0}</p>
            <p className="text-xs text-slate-400 mt-2">invoices</p>
          </div>

          <div className="rounded-2xl border border-yellow-500/15 bg-gradient-to-br from-yellow-900/20 to-slate-900/50 p-6 backdrop-blur-sm">
            <p className="text-sm text-yellow-300 mb-2">⏳ Pending</p>
            <p className="text-3xl font-bold text-yellow-400">{summary.pending || 0}</p>
            <p className="text-xs text-slate-400 mt-2">invoices</p>
          </div>

          <div className="rounded-2xl border border-red-500/15 bg-gradient-to-br from-red-900/20 to-slate-900/50 p-6 backdrop-blur-sm">
            <p className="text-sm text-red-300 mb-2">🔴 Overdue</p>
            <p className="text-3xl font-bold text-red-400">{summary.overdue || 0}</p>
            <p className="text-xs text-slate-400 mt-2">invoices</p>
          </div>

          <div className="rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-cyan-900/20 to-slate-900/50 p-6 backdrop-blur-sm">
            <p className="text-sm text-cyan-300 mb-2">💸 Total Due</p>
            <p className="text-3xl font-bold text-cyan-400">₹{summary.totalDue || 0}</p>
            <p className="text-xs text-slate-400 mt-2">pending & overdue</p>
          </div>
        </div>

        {/* INVOICES & PAYMENTS */}
        <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/50 p-6 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-cyan-100 mb-6">📋 Invoices & Payments</h2>

          {invoices.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg">No invoices yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => {
                const dueDate = new Date(invoice.dueDate);
                const isOverdue = invoice.status === 'overdue' || (new Date() > dueDate && invoice.status !== 'paid');
                
                return (
                  <div
                    key={invoice._id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800/70 transition"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-white">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-slate-400 mt-1">
                        Month: {invoice.billingMonth} • Base: ₹{invoice.baseAmount}
                        {invoice.lateFee > 0 && ` • Late Fee: ₹${invoice.lateFee}`}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Due: {dueDate.toLocaleDateString('en-IN')}</p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <div className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                        invoice.status === 'paid'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : isOverdue
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {invoice.status === 'paid' ? '✓ Paid' : isOverdue ? '⚠ Overdue' : '⏳ Pending'}
                      </div>

                      <div className="text-xl font-bold text-cyan-300">₹{invoice.totalAmount}</div>

                      {invoice.status !== 'paid' && (
                        <button
                          onClick={() => payRent(invoice._id)}
                          className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg transition shadow-lg hover:shadow-cyan-500/25"
                        >
                          Pay Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COMPLAINTS */}
        <form onSubmit={submitComplaint} className="rounded-2xl border border-purple-500/15 bg-gradient-to-br from-purple-900/20 to-slate-900/50 p-6 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-purple-200 mb-5">📝 Raise a Complaint</h2>
          <p className="text-sm text-slate-400 mb-6">Report any issues to the management team</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Issue Title *</label>
              <input
                type="text"
                placeholder="e.g., Water leakage, Noise complaint, etc."
                value={complaint.title}
                onChange={(e) => setComplaint((c) => ({ ...c, title: e.target.value }))}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Description *</label>
              <textarea
                placeholder="Describe the issue in detail..."
                rows="4"
                value={complaint.description}
                onChange={(e) => setComplaint((c) => ({ ...c, description: e.target.value }))}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={complaintLoading}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold rounded-lg transition shadow-lg hover:shadow-purple-500/25 disabled:shadow-none"
            >
              {complaintLoading ? '📤 Submitting...' : '📤 Submit Complaint'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default TenantDashboard;
