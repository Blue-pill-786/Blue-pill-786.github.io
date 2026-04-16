import { useState } from 'react';

const SubscriptionSettingsPage = () => {
  const [currentPlan, setCurrentPlan] = useState('Professional');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const subscription = {
    plan: 'Professional',
    status: 'Active',
    price: 799,
    billingCycle: 'monthly',
    nextBillingDate: '2026-05-13',
    startDate: '2026-04-13',
    properties: 5,
    tenants: 'Unlimited',
    invoices: 'Advanced',
  };

  const plans = [
    {
      name: 'Starter',
      monthlyPrice: 299,
      yearlyPrice: 2990,
      features: ['Up to 1 property', 'Up to 10 tenants', 'Basic invoicing', 'Email support'],
    },
    {
      name: 'Professional',
      monthlyPrice: 799,
      yearlyPrice: 7990,
      features: ['Up to 5 properties', 'Unlimited tenants', 'Advanced invoicing', 'Priority support'],
      current: true,
    },
    {
      name: 'Enterprise',
      monthlyPrice: 1999,
      yearlyPrice: 19990,
      features: ['Unlimited properties', 'Unlimited tenants', 'Complete automation', '24/7 support'],
    },
  ];

  const handleUpgrade = (plan) => {
    setSelectedPlan(plan);
    setShowUpgradeModal(true);
  };

  const handleDowngrade = () => {
    if (confirm('Downgrading will reduce your property and tenant limits. Continue?')) {
      alert('Downgrade request submitted. Changes will take effect at the end of your billing cycle.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/50 p-8 backdrop-blur-sm">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-200 to-blue-400 bg-clip-text text-transparent">
            Subscription & Billing
          </h1>
          <p className="text-slate-400 mt-2">Manage your subscription plan and billing details</p>
        </div>

        {/* CURRENT SUBSCRIPTION */}
        <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/50 p-8 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-cyan-100 mb-6">📊 Current Subscription</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="mb-6">
                <p className="text-sm text-slate-400 mb-1">Plan</p>
                <p className="text-3xl font-bold text-cyan-300">{subscription.plan}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Status</p>
                  <span className="inline-block px-4 py-2 bg-emerald-500/20 text-emerald-300 font-semibold rounded-lg">
                    ✓ {subscription.status}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-slate-400 mb-1">Billing Cycle</p>
                  <p className="text-white font-semibold">{subscription.billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-400 mb-1">Next Billing Date</p>
                  <p className="text-white font-semibold">{subscription.nextBillingDate}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-900/20 to-slate-900/50 rounded-xl p-6 border border-cyan-500/15">
              <h3 className="text-lg font-bold text-cyan-100 mb-4">Monthly Usage</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="text-sm text-slate-400">Properties</p>
                    <p className="text-sm font-semibold text-cyan-300">{subscription.properties}/5</p>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: '100%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <p className="text-sm text-slate-400">Tenants</p>
                    <p className="text-sm font-semibold text-cyan-300">Unlimited</p>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: '0%' }}></div>
                  </div>
                </div>
              </div>

              <button className="mt-6 w-full px-4 py-2 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition font-semibold">
                📊 View Detailed Usage
              </button>
            </div>
          </div>
        </div>

        {/* UPGRADE/CHANGE PLAN */}
        <div className="rounded-2xl border border-purple-500/15 bg-slate-900/50 p-8 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-purple-100 mb-6">📈 Change Your Plan</h2>
          <p className="text-slate-400 mb-8">Upgrade to unlock more features or downgrade to save costs</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl p-6 transition ${
                  plan.current
                    ? 'border-2 border-cyan-500 bg-gradient-to-br from-cyan-900/30 to-slate-900/50'
                    : 'border border-slate-700 bg-slate-800/50 hover:bg-slate-800'
                }`}
              >
                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-2xl font-bold text-cyan-300 mb-4">₹{plan.monthlyPrice}</p>

                {plan.current && (
                  <span className="inline-block px-3 py-1 bg-cyan-500/20 text-cyan-300 text-sm font-semibold rounded mb-4">
                    Current Plan
                  </span>
                )}

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-cyan-400 mt-1">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.current ? (
                  <button
                    onClick={handleDowngrade}
                    className="w-full px-4 py-2 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10 rounded-lg transition font-semibold"
                  >
                    Downgrade
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan)}
                    className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg transition font-semibold"
                  >
                    {plan.name === 'Starter' ? 'Downgrade' : 'Upgrade'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* SUBSCRIPTION ACTIONS */}
        <div className="rounded-2xl border border-red-500/15 bg-slate-900/50 p-8 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-red-100 mb-6">⚙️ Subscription Actions</h2>

          <div className="space-y-3">
            <button className="w-full px-4 py-3 text-left rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-800 text-white font-semibold transition">
              ⏸️ Pause Subscription
            </button>
            <button className="w-full px-4 py-3 text-left rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-800 text-white font-semibold transition">
              📥 Download Invoice
            </button>
            <button className="w-full px-4 py-3 text-left rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-800 text-red-400 font-semibold transition">
              ❌ Cancel Subscription
            </button>
          </div>
        </div>
      </div>

      {/* UPGRADE MODAL */}
      {showUpgradeModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-2xl border border-cyan-500 p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-cyan-100 mb-4">Upgrade to {selectedPlan.name}?</h3>
            <p className="text-slate-400 mb-6">
              Your plan will be upgraded immediately and prorated based on your cycle.
            </p>

            <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-400 mb-1">New Monthly Cost</p>
              <p className="text-3xl font-bold text-cyan-300">₹{selectedPlan.monthlyPrice}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 px-4 py-2 border border-slate-700 text-white rounded-lg hover:bg-slate-800 transition font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('Upgrade initiated! This will be processed shortly.');
                  setShowUpgradeModal(false);
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-500 hover:to-blue-500 transition font-semibold"
              >
                Confirm Upgrade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionSettingsPage;
