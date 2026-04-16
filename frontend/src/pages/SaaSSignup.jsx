import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {api} from '../lib/api';

const SaaSSignup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // Step 1: Signup, Step 2: Trial, Step 3: Tier selection
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Organization and owner info
  const [formData, setFormData] = useState({
    organizationName: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    confirmPassword: '',
    companyPhone: ''
  });

  // Step 3: Tier selection
  const [selectedTier, setSelectedTier] = useState('starter');
  const [billingCycle, setBillingCycle] = useState('monthly');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  // Step 1: Submit signup
 // 🔥 ONLY CHANGES SHOWN (focus here)

const handleSignup = async (e) => {
  e.preventDefault();
  setError('');

  if (!formData.organizationName.trim()) return setError('Organization name is required');
  if (!formData.ownerName.trim()) return setError('Owner name is required');
  if (!formData.ownerEmail.includes('@')) return setError('Valid email is required');
  if (formData.ownerPassword.length < 6) return setError('Password must be at least 6 characters');
  if (formData.ownerPassword !== formData.confirmPassword) return setError('Passwords do not match');

  setLoading(true);

  try {
    const response = await api.post('/saas/signup', {   // ✅ FIXED
      organizationName: formData.organizationName.trim(),
      ownerName: formData.ownerName.trim(),
      ownerEmail: formData.ownerEmail.trim(),
      ownerPassword: formData.ownerPassword,
      companyPhone: formData.companyPhone.trim()
    });

    localStorage.setItem('pg_token', response.data.token);   // ✅ consistent key
    localStorage.setItem('organizationId', response.data.organization._id);

    setStep(2);
  } catch (err) {
    setError(err.response?.data?.message || 'Signup failed');  // ✅ fixed error key
  } finally {
    setLoading(false);
  }
};

  // Step 3: Select tier
const handleSelectTier = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    const orgId = localStorage.getItem('organizationId');

    await api.post(
      `/saas/organizations/${orgId}/select-tier`,   // ✅ FIXED
      {
        tier: selectedTier,
        billingCycle
      }
    );

    navigate(`/org/${orgId}/dashboard`);
  } catch (err) {
    setError(err.response?.data?.message || 'Failed to select tier');
  } finally {
    setLoading(false);
  }
};

  const tiers = [
    {
      name: 'Starter',
      tier: 'starter',
      price: '$199',
      period: '/month',
      description: 'Perfect for small PG operations',
      features: [
        '1 Property',
        'Up to 50 Beds',
        'Basic Reports',
        'Email Notifications',
        'Standard Support'
      ]
    },
    {
      name: 'Professional',
      tier: 'professional',
      price: '$499',
      period: '/month',
      description: 'For growing PG businesses',
      features: [
        'Up to 5 Properties',
        'Up to 500 Beds',
        'Advanced Reports',
        'Email + SMS Notifications',
        'Priority Support',
        'API Access'
      ],
      recommended: true
    },
    {
      name: 'Enterprise',
      tier: 'enterprise',
      price: 'Custom',
      period: 'pricing',
      description: 'For large-scale operations',
      features: [
        'Unlimited Properties',
        'Unlimited Beds',
        'Custom Analytics',
        'All Integrations',
        'Dedicated Account Manager',
        'White-label Options'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">PG Manager SaaS</h1>
          <p className="text-slate-400 mt-2">Professional property management simplified</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Step 1: Organization Signup */}
        {step === 1 && (
          <div className="bg-slate-800 rounded-lg p-8 shadow-xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold">Create Your Account</h2>
              <p className="text-slate-400 mt-2">Get started with a 30-day free trial</p>
            </div>

            <form onSubmit={handleSignup} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Organization Name</label>
                <input
                  type="text"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleInputChange}
                  placeholder="Your PG Name"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Owner Name</label>
                  <input
                    type="text"
                    name="ownerName"
                    value={formData.ownerName}
                    onChange={handleInputChange}
                    placeholder="Your Full Name"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <input
                    type="tel"
                    name="companyPhone"
                    value={formData.companyPhone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  name="ownerEmail"
                  value={formData.ownerEmail}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Password</label>
                  <input
                    type="password"
                    name="ownerPassword"
                    value={formData.ownerPassword}
                    onChange={handleInputChange}
                    placeholder="••••••"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="••••••"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition"
              >
                {loading ? 'Creating Account...' : 'Start Free Trial'}
              </button>

              <p className="text-center text-slate-400 text-sm">
                By signing up, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          </div>
        )}

        {/* Step 2: Trial Info */}
        {step === 2 && (
          <div className="bg-slate-800 rounded-lg p-8 shadow-xl text-center space-y-6">
            <div className="text-6xl">🎉</div>
            <div>
              <h2 className="text-3xl font-bold">Welcome to PG Manager!</h2>
              <p className="text-slate-400 mt-2">Your 30-day free trial is now active</p>
            </div>

            <div className="bg-slate-700 rounded-lg p-6 mt-8">
              <h3 className="text-xl font-bold mb-4">Trial includes:</h3>
              <ul className="space-y-2 text-left text-slate-300">
                <li>✅ 1 Property with 50 Beds</li>
                <li>✅ Basic Reports</li>
                <li>✅ Email Notifications</li>
                <li>✅ Full Feature Access</li>
                <li>✅ No credit card required</li>
              </ul>
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 rounded-lg transition mt-8"
            >
              Continue to Payment Plans
            </button>

            <button
              onClick={() => navigate(`/org/${localStorage.getItem('organizationId')}/dashboard`)}
              className="w-full border border-slate-600 hover:border-slate-500 text-white font-bold py-3 rounded-lg transition"
            >
              Skip for Now →
            </button>
          </div>
        )}

        {/* Step 3: Tier Selection */}
        {step === 3 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Choose Your Plan</h2>
              <p className="text-slate-400">Upgrade anytime to access more features</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {/* Billing Cycle Toggle */}
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-lg font-semibold transition ${
                  billingCycle === 'monthly'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-6 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                  billingCycle === 'annual'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Annual
                <span className="bg-emerald-600 text-xs px-2 py-1 rounded">Save 20%</span>
              </button>
            </div>

            {/* Tier Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tiers.map((tier) => (
                <div
                  key={tier.tier}
                  onClick={() => setSelectedTier(tier.tier)}
                  className={`relative rounded-lg p-8 cursor-pointer transition transform hover:scale-105 ${
                    selectedTier === tier.tier
                      ? 'bg-gradient-to-br from-cyan-600 to-blue-600 ring-2 ring-cyan-400'
                      : 'bg-slate-800 border border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {tier.recommended && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-emerald-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                        RECOMMENDED
                      </span>
                    </div>
                  )}

                  <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                  <p className="text-sm opacity-90 mb-4">{tier.description}</p>

                  <div className="mb-6">
                    <div className="text-4xl font-bold">{tier.price}</div>
                    <div className="text-sm opacity-75">{tier.period}</div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="text-lg">✓</span>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {selectedTier === tier.tier && (
                    <div className="text-center py-2 bg-white/20 rounded-lg font-bold">
                      Selected
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* CTA */}
            <form onSubmit={handleSelectTier} className="space-y-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 text-white font-bold py-4 rounded-lg text-lg transition"
              >
                {loading ? 'Processing...' : `Continue with ${selectedTier.toUpperCase()}`}
              </button>

              <p className="text-center text-slate-400 text-sm">
                You can upgrade or downgrade at any time. No long-term commitment.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default SaaSSignup;
