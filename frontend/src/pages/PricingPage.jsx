import { useState } from 'react';

const PricingPage = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');

  const plans = [
    {
      name: 'Starter',
      description: 'Perfect for getting started',
      monthlyPrice: 299,
      yearlyPrice: 2990,
      features: [
        'Up to 1 property',
        'Up to 10 tenants',
        'Basic invoicing',
        'Payment tracking',
        'Email support',
      ],
    },
    {
      name: 'Professional',
      description: 'Best for growing businesses',
      monthlyPrice: 799,
      yearlyPrice: 7990,
      features: [
        'Up to 5 properties',
        'Unlimited tenants',
        'Advanced invoicing',
        'Payment tracking',
        'Expense management',
        'Reports & analytics',
        'Priority support',
      ],
      popular: true,
    },
    {
      name: 'Enterprise',
      description: 'For large organizations',
      monthlyPrice: 1999,
      yearlyPrice: 19990,
      features: [
        'Unlimited properties',
        'Unlimited tenants',
        'Complete automation',
        'API access',
        'Custom integrations',
        'Advanced reports',
        'Dedicated account manager',
        '24/7 support',
      ],
    },
  ];

  const getPrice = (plan) => {
    return billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-200 to-blue-400 bg-clip-text text-transparent mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-400 mb-8">
            Scale your property management with flexible pricing plans
          </p>

          {/* BILLING TOGGLE */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                billingCycle === 'monthly'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                billingCycle === 'yearly'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Yearly (Save 17%)
            </button>
          </div>
        </div>

        {/* PRICING CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl backdrop-blur-sm transition transform hover:scale-105 ${
                plan.popular
                  ? 'border border-cyan-500 bg-gradient-to-br from-cyan-900/30 to-slate-900/50 shadow-2xl shadow-cyan-500/20'
                  : 'border border-slate-700 bg-slate-900/50'
              }`}
            >
              {plan.popular && (
                <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-2 rounded-t-2xl text-center font-semibold">
                  🌟 Most Popular
                </div>
              )}

              <div className="p-8">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-slate-400 text-sm mb-6">{plan.description}</p>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-cyan-300">
                      ₹{getPrice(plan).toLocaleString()}
                    </span>
                    <span className="text-slate-400 text-sm">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                  </div>
                </div>

                <button
                  className={`w-full px-4 py-3 rounded-lg font-semibold transition mb-8 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white'
                      : 'border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10'
                  }`}
                >
                  Get Started
                </button>

                <ul className="space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-slate-300">
                      <span className="text-cyan-400 mt-1">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ SECTION */}
        <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/50 p-8 backdrop-blur-sm">
          <h2 className="text-3xl font-bold text-cyan-100 mb-8 text-center">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            {[
              {
                q: 'Can I change my plan anytime?',
                a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.',
              },
              {
                q: 'Is there a free trial?',
                a: 'Yes, all plans come with a 14-day free trial. No credit card required.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards, debit cards, and bank transfers via Razorpay.',
              },
              {
                q: 'Is there a discount for annual billing?',
                a: 'Yes! Pay yearly and save 17% compared to monthly billing.',
              },
            ].map((faq, idx) => (
              <div key={idx} className="border-b border-slate-700 pb-6 last:border-b-0">
                <h3 className="text-lg font-semibold text-cyan-300 mb-2">{faq.q}</h3>
                <p className="text-slate-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
