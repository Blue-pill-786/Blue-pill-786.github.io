import { useState, useEffect } from 'react';
import { api } from '../lib/api';

const PaymentMethodsPage = () => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newMethod, setNewMethod] = useState({
    cardholderName: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  });

  // Load payment methods on mount
  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const response = await api.get('/saas/payment-methods');
      setPaymentMethods(response.data.data || []);
      setError('');
    } catch (err) {
      setError('Failed to load payment methods');
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    if (!newMethod.cardNumber || !newMethod.expiryMonth || !newMethod.expiryYear || !newMethod.cvv) {
      setError('Please fill in all card details');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post('/saas/payment-methods', {
        cardholderName: newMethod.cardholderName,
        cardNumber: newMethod.cardNumber,
        expiryMonth: newMethod.expiryMonth,
        expiryYear: newMethod.expiryYear,
        cvv: newMethod.cvv,
      });
      
      // Add new method to list
      setPaymentMethods([...paymentMethods, response.data.data]);
      setShowAddForm(false);
      setNewMethod({ cardholderName: '', cardNumber: '', expiryMonth: '', expiryYear: '', cvv: '' });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add payment method');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await api.put(`/saas/payment-methods/${id}/set-default`);
      setPaymentMethods((prev) =>
        prev.map((method) => ({
          ...method,
          isDefault: method.id === id || method._id === id,
        }))
      );
      setError('');
    } catch (err) {
      setError('Failed to set default payment method');
    }
  };

  const handleRemoveMethod = async (id) => {
    if (!confirm('Are you sure you want to remove this payment method?')) return;

    try {
      await api.delete(`/saas/payment-methods/${id}`);
      setPaymentMethods((prev) => prev.filter((m) => m.id !== id && m._id !== id));
      setError('');
    } catch (err) {
      setError('Failed to remove payment method');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/50 p-8 backdrop-blur-sm">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-200 to-blue-400 bg-clip-text text-transparent">
            Payment Methods
          </h1>
          <p className="text-slate-400 mt-2">Manage your payment methods and billing information</p>
        </div>

        {/* PAYMENT METHODS LIST */}
        <div className="space-y-4">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className="rounded-2xl border border-cyan-500/15 bg-slate-900/50 p-6 backdrop-blur-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">💳</div>
                  <div>
                    <p className="font-semibold text-white text-lg">{method.cardType} ending in {method.lastFour}</p>
                    <p className="text-slate-400 text-sm">Expires {method.expiryDate}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {method.isDefault && (
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-sm font-semibold rounded-full">
                    ✓ Default
                  </span>
                )}

                {!method.isDefault && (
                  <button
                    onClick={() => handleSetDefault(method.id)}
                    className="px-4 py-2 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition text-sm font-semibold"
                  >
                    Set as Default
                  </button>
                )}

                <button
                  onClick={() => handleRemoveMethod(method.id)}
                  className="px-4 py-2 border border-red-500/30 text-red-300 hover:bg-red-500/10 rounded-lg transition text-sm font-semibold"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ADD NEW PAYMENT METHOD */}
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full px-6 py-4 rounded-2xl border-2 border-dashed border-cyan-500/30 hover:border-cyan-500/50 text-cyan-300 font-semibold transition flex items-center justify-center gap-2"
          >
            <span className="text-2xl">+</span>
            Add Payment Method
          </button>
        ) : (
          <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/50 p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-cyan-100 mb-6">Add New Card</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Cardholder Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={newMethod.cardholderName}
                  onChange={(e) => setNewMethod((prev) => ({ ...prev, cardholderName: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Card Number</label>
                <input
                  type="text"
                  placeholder="4242 4242 4242 4242"
                  value={newMethod.cardNumber}
                  onChange={(e) => setNewMethod((prev) => ({ ...prev, cardNumber: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Month</label>
                  <input
                    type="text"
                    placeholder="MM"
                    maxLength="2"
                    value={newMethod.expiryMonth}
                    onChange={(e) => setNewMethod((prev) => ({ ...prev, expiryMonth: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Year</label>
                  <input
                    type="text"
                    placeholder="YY"
                    maxLength="2"
                    value={newMethod.expiryYear}
                    onChange={(e) => setNewMethod((prev) => ({ ...prev, expiryYear: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">CVV</label>
                  <input
                    type="text"
                    placeholder="123"
                    maxLength="4"
                    value={newMethod.cvv}
                    onChange={(e) => setNewMethod((prev) => ({ ...prev, cvv: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-6 py-3 border border-slate-700 text-white font-semibold rounded-lg hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPaymentMethod}
                className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg transition shadow-lg"
              >
                Add Card
              </button>
            </div>
          </div>
        )}

        {/* BILLING HISTORY */}
        <div className="rounded-2xl border border-purple-500/15 bg-slate-900/50 p-8 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-purple-100 mb-6">📋 Billing History</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">Date</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">Description</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">Amount</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-700 hover:bg-slate-800/30">
                  <td className="py-3 px-4 text-slate-400">Apr 13, 2026</td>
                  <td className="py-3 px-4 text-white font-semibold">Professional Plan - Monthly</td>
                  <td className="py-3 px-4 text-cyan-300 font-semibold">₹799</td>
                  <td className="py-3 px-4">
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-sm font-semibold rounded-full">
                      Paid
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-slate-700 hover:bg-slate-800/30">
                  <td className="py-3 px-4 text-slate-400">Mar 13, 2026</td>
                  <td className="py-3 px-4 text-white font-semibold">Professional Plan - Monthly</td>
                  <td className="py-3 px-4 text-cyan-300 font-semibold">₹799</td>
                  <td className="py-3 px-4">
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-sm font-semibold rounded-full">
                      Paid
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodsPage;
