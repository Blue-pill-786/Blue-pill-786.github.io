import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const AccountSettingsPage = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    timezone: 'Asia/Kolkata',
  });
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    weeklyReport: true,
    darkMode: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await api.get('/auth/preferences');
      if (response.data.data) {
        setPreferences(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePreferenceChange = (key) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      await api.put('/auth/profile', formData);
      
      // Save preferences
      await api.put('/auth/preferences', preferences);
      
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/50 p-8 backdrop-blur-sm">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-200 to-blue-400 bg-clip-text text-transparent">
            Account Settings
          </h1>
          <p className="text-slate-400 mt-2">Manage your profile and preferences</p>
        </div>

        {/* PROFILE INFORMATION */}
        <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/50 p-8 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-cyan-100 mb-6">📝 Profile Information</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  placeholder="+91"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Timezone</label>
                <select
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
                >
                  <option>Asia/Kolkata</option>
                  <option>Asia/Dubai</option>
                  <option>Europe/London</option>
                  <option>America/New_York</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* NOTIFICATIONS */}
        <div className="rounded-2xl border border-purple-500/15 bg-slate-900/50 p-8 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-purple-100 mb-6">🔔 Notifications</h2>

          <div className="space-y-4">
            {Object.entries(preferences).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div>
                  <p className="font-semibold text-white capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <p className="text-sm text-slate-400">
                    {key === 'emailNotifications' && 'Receive notifications via email'}
                    {key === 'smsNotifications' && 'Receive alerts via SMS'}
                    {key === 'weeklyReport' && 'Get weekly property reports'}
                    {key === 'darkMode' && 'Use dark theme'}
                  </p>
                </div>
                <button
                  onClick={() => handlePreferenceChange(key)}
                  className={`w-12 h-6 rounded-full transition flex items-center ${
                    value ? 'bg-cyan-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition transform ${
                      value ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* SECURITY */}
        <div className="rounded-2xl border border-red-500/15 bg-slate-900/50 p-8 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-red-100 mb-6">🔒 Security</h2>

          <div className="space-y-3">
            <button className="w-full px-4 py-3 text-left rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-800 text-white font-semibold transition">
              🔑 Change Password
            </button>
            <button className="w-full px-4 py-3 text-left rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-800 text-white font-semibold transition">
              📱 Enable Two-Factor Authentication
            </button>
            <button className="w-full px-4 py-3 text-left rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-800 text-white font-semibold transition">
              🗑️ Delete Account
            </button>
          </div>
        </div>

        {/* SAVE BUTTON */}
        <div className="flex justify-end gap-4">
          <button className="px-6 py-3 border border-slate-700 rounded-lg text-white font-semibold hover:bg-slate-800 transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold rounded-lg transition shadow-lg hover:shadow-cyan-500/25"
          >
            {saving ? '💾 Saving...' : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsPage;
