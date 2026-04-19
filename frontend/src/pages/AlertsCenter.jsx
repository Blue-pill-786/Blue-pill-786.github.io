import { useState } from 'react';

const AlertsCenter = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [alertFilter, setAlertFilter] = useState('all');

  const [alerts] = useState([
    {
      id: 1,
      type: 'invoice',
      severity: 'warning',
      title: 'Invoice Due Soon',
      message: 'Invoice INV-2026-04-001 is due on 15th April 2026',
      timestamp: '2024-04-12T10:30:00',
      read: false,
    },
    {
      id: 2,
      type: 'payment',
      severity: 'success',
      title: 'Payment Successful',
      message: 'Your payment of ₹15,000 has been processed successfully',
      timestamp: '2024-04-10T14:20:00',
      read: true,
    },
    {
      id: 3,
      type: 'maintenance',
      severity: 'info',
      title: 'Maintenance Request Received',
      message: 'Your maintenance request has been received and assigned',
      timestamp: '2024-04-09T09:15:00',
      read: true,
    },
    {
      id: 4,
      type: 'invoice',
      severity: 'error',
      title: 'Payment Overdue',
      message: 'Invoice INV-2026-03-001 is now 5 days overdue',
      timestamp: '2024-04-08T00:00:00',
      read: false,
    },
    {
      id: 5,
      type: 'complaint',
      severity: 'info',
      title: 'Complaint Status Updated',
      message: 'Your complaint has been resolved',
      timestamp: '2024-04-07T16:45:00',
      read: true,
    },
  ]);

  const filteredAlerts = alerts.filter((alert) => {
    if (activeTab !== 'all' && alert.type !== activeTab) return false;
    if (alertFilter === 'unread' && alert.read) return false;
    if (alertFilter === 'read' && !alert.read) return false;
    return true;
  });

  const getSeverityColor = (severity) => {
    const colors = {
      success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      error: 'border-red-500/30 bg-red-500/10 text-red-300',
      warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
      info: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    };
    return colors[severity] || colors.info;
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    };
    return icons[severity] || 'ℹ';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/50 p-8 backdrop-blur-sm">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-200 to-blue-400 bg-clip-text text-transparent">
            Alerts & Notifications Center
          </h1>
          <p className="text-slate-400 mt-2">View and manage all your alerts and notifications</p>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-blue-500/15 bg-gradient-to-br from-blue-900/20 to-slate-900/50 p-6">
            <p className="text-sm text-slate-400 mb-2">📬 Total Alerts</p>
            <p className="text-3xl font-bold text-blue-300">{alerts.length}</p>
          </div>

          <div className="rounded-xl border border-yellow-500/15 bg-gradient-to-br from-yellow-900/20 to-slate-900/50 p-6">
            <p className="text-sm text-slate-400 mb-2">📌 Unread</p>
            <p className="text-3xl font-bold text-yellow-300">{alerts.filter((a) => !a.read).length}</p>
          </div>

          <div className="rounded-xl border border-emerald-500/15 bg-gradient-to-br from-emerald-900/20 to-slate-900/50 p-6">
            <p className="text-sm text-slate-400 mb-2">✓ Read</p>
            <p className="text-3xl font-bold text-emerald-300">{alerts.filter((a) => a.read).length}</p>
          </div>

          <div className="rounded-xl border border-purple-500/15 bg-gradient-to-br from-purple-900/20 to-slate-900/50 p-6">
            <p className="text-sm text-slate-400 mb-2">⚠️ Critical</p>
            <p className="text-3xl font-bold text-purple-300">{alerts.filter((a) => a.severity === 'error').length}</p>
          </div>
        </div>

        {/* FILTERS & CONTROLS */}
        <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/50 p-6 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Alert Type</label>
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Alerts</option>
                <option value="invoice">Invoices</option>
                <option value="payment">Payments</option>
                <option value="maintenance">Maintenance</option>
                <option value="complaint">Complaints</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
              <select
                value={alertFilter}
                onChange={(e) => setAlertFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Status</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Action</label>
              <button className="w-full px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg transition">
                🗑️ Clear Resolved
              </button>
            </div>
          </div>
        </div>

        {/* ALERTS LIST */}
        {filteredAlerts.length === 0 ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-12 text-center">
            <p className="text-slate-400 text-lg">No alerts found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-xl border ${getSeverityColor(alert.severity)} p-6 transition hover:shadow-lg cursor-pointer ${
                  !alert.read ? 'bg-opacity-20' : 'opacity-75'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 text-2xl mt-1">
                    {getSeverityIcon(alert.severity)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-white text-lg">{alert.title}</h3>
                      {!alert.read && (
                        <span className="px-2 py-1 bg-current opacity-30 rounded text-xs font-semibold">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-current mb-3">{alert.message}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(alert.timestamp).toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="flex-shrink-0 flex gap-2">
                    <button className="px-4 py-2 border border-current opacity-50 hover:opacity-100 rounded-lg text-xs font-semibold transition">
                      {!alert.read ? 'Mark Read' : 'Unread'}
                    </button>
                    <button className="px-4 py-2 border border-slate-700 text-slate-400 hover:text-slate-300 rounded-lg text-xs font-semibold transition">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* NOTIFICATION PREFERENCES */}
        <div className="rounded-2xl border border-purple-500/15 bg-slate-900/50 p-8 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-purple-100 mb-6">🔔 Notification Preferences</h2>

          <div className="space-y-4">
            {[
              { label: 'Invoice Notifications', desc: 'Get alerts when invoices are generated or due' },
              { label: 'Payment Confirmations', desc: 'Get notified when payments are processed' },
              { label: 'Maintenance Updates', desc: 'Get updates on maintenance requests' },
              { label: 'Complaint Resolution', desc: 'Get notified when complaints are resolved' },
              { label: 'Daily Summary', desc: 'Receive a daily summary of activities' },
            ].map((pref, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div>
                  <p className="font-semibold text-white">{pref.label}</p>
                  <p className="text-sm text-slate-400">{pref.desc}</p>
                </div>
                <button className="w-12 h-6 rounded-full bg-cyan-600 flex items-center cursor-pointer transition">
                  <div className="w-5 h-5 bg-white rounded-full translate-x-6 transition" />
                </button>
              </div>
            ))}
          </div>

          <button className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg transition shadow-lg">
            💾 Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertsCenter;
