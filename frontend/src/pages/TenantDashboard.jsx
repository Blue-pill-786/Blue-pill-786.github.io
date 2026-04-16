import { useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTenantDashboard } from '../hooks/useTenantDashboard';
import WelcomeHeader from '../components/tenant/WelcomeHeader';
import PaymentsSummary from '../components/tenant/PaymentsSummary';
import InvoicesList from '../components/tenant/InvoicesList';
import ComplaintForm from '../components/tenant/ComplaintForm';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { Link } from 'react-router-dom';

const TenantDashboard = () => {
  const { user } = useAuth();
  const {
    data,
    loading,
    error,
    complaintLoading,
    complaint,
    setComplaint,
    payRent,
    submitComplaint,
    refreshData,
  } = useTenantDashboard();
  
  const [activeTab, setActiveTab] = useState('overview');

  const handleComplaintSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      await submitComplaint(() => setComplaint({ title: '', description: '' }));
    },
    [submitComplaint]
  );

  const handlePayRent = useCallback(
    async (invoiceId) => {
      await payRent(invoiceId);
    },
    [payRent]
  );

  if (loading) {
    return <LoadingState message="Loading your dashboard..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!data?.tenant) {
    return <ErrorState message="🔍 No tenant profile found" />;
  }

  const invoices = data.invoices || [];
  const upcomingInvoice = invoices.find((inv) => inv.status === 'pending');
  const overdueCount = invoices.filter((inv) => inv.status === 'overdue').length;
  const daysToPayment = upcomingInvoice ? Math.ceil(Math.random() * 15) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* WELCOME & HEADER */}
        <WelcomeHeader tenant={data.tenant} propertyData={data.tenant.property || {}} />

        {/* QUICK ACTIONS BAR */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Link
            to="/payments"
            className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-900/20 to-slate-900/50 p-4 hover:border-blue-500/60 hover:shadow-lg transition group cursor-pointer"
          >
            <p className="text-2xl mb-1">💳</p>
            <p className="text-sm font-medium text-blue-200">Make Payment</p>
            <p className="text-xs text-slate-400">Quick rent payment</p>
          </Link>

          <Link
            to="/alerts"
            className="rounded-xl border border-yellow-500/30 bg-gradient-to-br from-yellow-900/20 to-slate-900/50 p-4 hover:border-yellow-500/60 hover:shadow-lg transition group cursor-pointer"
          >
            <p className="text-2xl mb-1">🔔</p>
            <p className="text-sm font-medium text-yellow-200">Alerts Center</p>
            <p className="text-xs text-slate-400">View all notifications</p>
          </Link>

          <Link
            to="/tenant/profile"
            className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-slate-900/50 p-4 hover:border-purple-500/60 hover:shadow-lg transition group cursor-pointer"
          >
            <p className="text-2xl mb-1">👤</p>
            <p className="text-sm font-medium text-purple-200">My Profile</p>
            <p className="text-xs text-slate-400">View & update info</p>
          </Link>

          <button
            onClick={() => setActiveTab('complaints')}
            className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 to-slate-900/50 p-4 hover:border-emerald-500/60 hover:shadow-lg transition group cursor-pointer"
          >
            <p className="text-2xl mb-1">⚙️</p>
            <p className="text-sm font-medium text-emerald-200">File Complaint</p>
            <p className="text-xs text-slate-400">Report issues</p>
          </button>
        </div>

        {/* ALERT INDICATORS */}
        {overdueCount > 0 && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-center gap-4">
            <div className="text-3xl">⚠️</div>
            <div className="flex-1">
              <p className="font-bold text-red-200">You have {overdueCount} overdue payment{overdueCount > 1 ? 's' : ''}!</p>
              <p className="text-sm text-red-300">Please settle these immediately to avoid penalties</p>
            </div>
            <button
              onClick={() => setActiveTab('invoices')}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition"
            >
              Pay Now
            </button>
          </div>
        )}

        {upcomingInvoice && overdueCount === 0 && (
          <div className="rounded-xl border border-cyan-500/20 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-cyan-100">📅 Next Payment Due</p>
              <p className="text-sm text-cyan-300 font-semibold">{daysToPayment} days remaining</p>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all"
                style={{ width: `${Math.min(100, (daysToPayment / 15) * 100)}%` }}
              />
            </div>
            <div className="mt-3 flex justify-between text-xs text-slate-400">
              <span>Amount: ₹{upcomingInvoice.amount?.toLocaleString('en-IN')}</span>
              <span>Invoice ID: {upcomingInvoice._id?.slice(-6)}</span>
            </div>
          </div>
        )}

        {/* TABS */}
        <div className="flex gap-2 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'overview'
                ? 'text-cyan-300 border-b-2 border-cyan-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'invoices'
                ? 'text-cyan-300 border-b-2 border-cyan-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Invoices
          </button>
          <button
            onClick={() => setActiveTab('complaints')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'complaints'
                ? 'text-cyan-300 border-b-2 border-cyan-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Support
          </button>
        </div>

        {/* TAB CONTENT */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <PaymentsSummary summary={data.summary || {}} />
            
            {/* RECENT ACTIVITY */}
            <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6">
              <h3 className="text-lg font-bold text-white mb-6">📊 Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="text-2xl">✅</div>
                  <div className="flex-1">
                    <p className="font-semibold text-white">Payment Successful</p>
                    <p className="text-sm text-slate-400">₹{(data.summary?.paid || 0)?.toLocaleString('en-IN')} on April 10</p>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300">Completed</span>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="text-2xl">📝</div>
                  <div className="flex-1">
                    <p className="font-semibold text-white">Invoice Generated</p>
                    <p className="text-sm text-slate-400">Monthly rent invoice on April 1</p>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-blue-500/20 text-blue-300">Created</span>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="text-2xl">🏠</div>
                  <div className="flex-1">
                    <p className="font-semibold text-white">Lease Agreement Signed</p>
                    <p className="text-sm text-slate-400">1-year lease from Jan 1 - Dec 31, 2026</p>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300">Active</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div>
            <InvoicesList
              invoices={invoices}
              onPayRent={handlePayRent}
            />
          </div>
        )}

        {activeTab === 'complaints' && (
          <div>
            <ComplaintForm
              complaint={complaint}
              onComplaintChange={setComplaint}
              onSubmit={handleComplaintSubmit}
              isLoading={complaintLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantDashboard;
