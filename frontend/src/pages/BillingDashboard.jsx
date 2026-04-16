import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {api} from '../lib/api';

const BillingDashboard = () => {
  const { organizationId } = useParams();
  const [organization, setOrganization] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [organizationId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [orgRes, subRes, invoicesRes] = await Promise.all([
        api.get(`/api/saas/organizations/${organizationId}`),
        api.get(`/api/saas/organizations/${organizationId}/subscription`),
        api.get(`/api/saas/organizations/${organizationId}/invoices`)
      ]);

      setOrganization(orgRes.data.organization);
      setSubscription(subRes.data.subscription);
      setInvoices(invoicesRes.data.invoices || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (newTier) => {
    try {
      await api.post(
        `/api/saas/organizations/${organizationId}/upgrade`,
        { newTier, billingCycle: 'monthly' }
      );
      setShowUpgradeModal(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Upgrade failed');
    }
  };

  const handleCancel = async (reason) => {
    try {
      await api.post(
        `/api/saas/organizations/${organizationId}/cancel-subscription`,
        { reason }
      );
      setShowCancelModal(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Cancellation failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          <p className="text-slate-400 mt-4">Loading billing information...</p>
        </div>
      </div>
    );
  }

  if (error && !organization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
        <div className="max-w-2xl mx-auto bg-red-500/10 border border-red-500 rounded-lg p-6">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-slate-400 mt-2">{organization?.name}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Current Plan Card */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 md:col-span-2">
            <h2 className="text-xl font-bold mb-6">Current Plan</h2>

            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-slate-400 text-sm mb-2">Plan Tier</p>
                <p className="text-3xl font-bold capitalize">{organization?.tier}</p>
              </div>

              <div>
                <p className="text-slate-400 text-sm mb-2">Status</p>
                <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                  organization?.status === 'active'
                    ? 'bg-emerald-600/20 border border-emerald-600 text-emerald-400'
                    : organization?.status === 'suspended'
                    ? 'bg-red-600/20 border border-red-600 text-red-400'
                    : 'bg-yellow-600/20 border border-yellow-600 text-yellow-400'
                }`}>
                  {organization?.status?.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Plan Features */}
            <div className="mb-8">
              <h3 className="font-bold mb-4">Included Features</h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(organization?.features || {}).map(([feature, enabled]) => (
                  <div key={feature} className="flex items-center gap-2">
                    <span className={enabled ? 'text-emerald-500' : 'text-slate-600'}>
                      {enabled ? '✓' : '✗'}
                    </span>
                    <span className={enabled ? 'text-slate-300' : 'text-slate-600'}>
                      {feature.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Limits */}
            <div className="mb-8 pt-6 border-t border-slate-700">
              <h3 className="font-bold mb-4">Resource Limits</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(organization?.limits || {}).map(([limit, value]) => (
                  <div key={limit} className="bg-slate-700 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-2">{limit}</p>
                    <p className="text-2xl font-bold">{value === -1 ? '∞' : value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t border-slate-700">
              {organization?.tier !== 'enterprise' && (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 rounded-lg transition"
                >
                  Upgrade Plan
                </button>
              )}

              {organization?.status === 'active' && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="flex-1 border border-red-600 text-red-400 hover:bg-red-600/10 font-bold py-3 rounded-lg transition"
                >
                  Cancel Subscription
                </button>
              )}
            </div>
          </div>

          {/* Usage Summary */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-6">Usage</h2>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-400">Properties</span>
                  <span className="font-bold">{organization?.usage?.properties}/{organization?.limits?.properties === -1 ? '∞' : organization?.limits?.properties}</span>
                </div>
                <div className="bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-cyan-500 h-2 rounded-full transition-all"
                    style={{
                      width: organization?.limits?.properties === -1
                        ? '0%'
                        : `${Math.min((organization?.usage?.properties / organization?.limits?.properties) * 100, 100)}%`
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-400">Beds</span>
                  <span className="font-bold">{organization?.usage?.beds}/{organization?.limits?.beds === -1 ? '∞' : organization?.limits?.beds}</span>
                </div>
                <div className="bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{
                      width: organization?.limits?.beds === -1
                        ? '0%'
                        : `${Math.min((organization?.usage?.beds / organization?.limits?.beds) * 100, 100)}%`
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-400">API Calls</span>
                  <span className="font-bold">{organization?.usage?.apiCalls}/{organization?.limits?.apiCalls === -1 ? '∞' : organization?.limits?.apiCalls}</span>
                </div>
                <div className="bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{
                      width: organization?.limits?.apiCalls === -1
                        ? '0%'
                        : `${Math.min((organization?.usage?.apiCalls / organization?.limits?.apiCalls) * 100, 100)}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-700 mb-8">
          <div className="flex gap-8">
            {['overview', 'invoices'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 font-bold capitalize transition ${
                  activeTab === tab
                    ? 'border-b-2 border-cyan-500 text-white'
                    : 'border-b-2 border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-6">Billing History</h2>

            {invoices.length === 0 ? (
              <p className="text-slate-400 text-center py-12">No invoices yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-4 px-4 text-slate-400">Invoice #</th>
                      <th className="text-left py-4 px-4 text-slate-400">Date</th>
                      <th className="text-left py-4 px-4 text-slate-400">Amount</th>
                      <th className="text-left py-4 px-4 text-slate-400">Status</th>
                      <th className="text-left py-4 px-4 text-slate-400">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(invoice => (
                      <tr key={invoice.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition">
                        <td className="py-4 px-4">{invoice.number}</td>
                        <td className="py-4 px-4">{new Date(invoice.date).toLocaleDateString()}</td>
                        <td className="py-4 px-4 font-bold">${invoice.amount.toFixed(2)}</td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-1 rounded text-sm font-bold ${
                            invoice.status === 'paid'
                              ? 'bg-emerald-600/20 text-emerald-400'
                              : invoice.status === 'open'
                              ? 'bg-yellow-600/20 text-yellow-400'
                              : 'bg-red-600/20 text-red-400'
                          }`}>
                            {invoice.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {invoice.pdfUrl && (
                            <a
                              href={invoice.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-400 hover:text-cyan-300"
                            >
                              Download PDF
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg max-w-md w-full p-8 border border-slate-700">
            <h3 className="text-2xl font-bold mb-6">Upgrade Your Plan</h3>

            <div className="space-y-3 mb-8">
              {['professional', 'enterprise'].map(tier => (
                tier !== organization?.tier && (
                  <button
                    key={tier}
                    onClick={() => handleUpgrade(tier)}
                    className="w-full bg-slate-700 hover:bg-slate-600 p-4 rounded-lg text-left transition capitalize font-semibold"
                  >
                    {tier} Plan
                  </button>
                )
              ))}
            </div>

            <button
              onClick={() => setShowUpgradeModal(false)}
              className="w-full border border-slate-600 text-slate-300 hover:bg-slate-700 p-3 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg max-w-md w-full p-8 border border-slate-700">
            <h3 className="text-2xl font-bold mb-6 text-red-400">Cancel Subscription?</h3>

            <p className="text-slate-300 mb-6">
              You will lose access at the end of your billing cycle. This action cannot be undone.
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 border border-slate-600 text-slate-300 hover:bg-slate-700 p-3 rounded-lg transition"
              >
                Keep Subscription
              </button>

              <button
                onClick={() => handleCancel('User requested cancellation')}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg transition"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingDashboard;
