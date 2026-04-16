/**
 * Notification Preferences Page
 * User-friendly notification settings management
 * Categories, quiet hours, channels, muting
 */

import React, { useState, useEffect } from 'react';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { NotificationContext } from '../context/NotificationContext';
import { useContext } from 'react';

export const NotificationPreferencesPage = () => {
  const { preferences, updatePreferences } = useRealtimeNotifications();
  const { addNotification } = useContext(NotificationContext);
  const [localPrefs, setLocalPrefs] = useState(preferences);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences);
    }
  }, [preferences]);

  const handleChannelChange = (channel, value) => {
    setLocalPrefs({
      ...localPrefs,
      [channel]: value,
    });
  };

  const handleCategoryChange = (category, field, value) => {
    setLocalPrefs({
      ...localPrefs,
      categories: {
        ...localPrefs.categories,
        [category]: {
          ...localPrefs.categories[category],
          [field]: value,
        },
      },
    });
  };

  const handleQuietHoursChange = (field, value) => {
    setLocalPrefs({
      ...localPrefs,
      quietHours: {
        ...localPrefs.quietHours,
        [field]: value,
      },
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePreferences(localPrefs);
    } finally {
      setIsSaving(false);
    }
  };

  if (!localPrefs) {
    return <div className="p-6 text-center">Loading preferences...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Notification Preferences
      </h1>

      {/* Notification Channels */}
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          📢 Notification Channels
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Choose how you want to receive notifications
        </p>

        <div className="space-y-3">
          {[
            {
              key: 'emailNotifications',
              label: 'Email',
              icon: '📧',
              description: 'Receive notifications via email',
            },
            {
              key: 'smsNotifications',
              label: 'SMS',
              icon: '📱',
              description: 'Receive notifications via SMS',
            },
            {
              key: 'inAppNotifications',
              label: 'In-App',
              icon: '🔔',
              description: 'See notifications in the app',
            },
            {
              key: 'inAppSound',
              label: 'Sound',
              icon: '🔊',
              description: 'Play sound for notifications',
            },
          ].map(({ key, label, icon, description }) => (
            <label
              key={key}
              className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <input
                type="checkbox"
                checked={localPrefs[key] === true}
                onChange={(e) => handleChannelChange(key, e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="ml-3 text-lg">{icon}</span>
              <div className="ml-3">
                <p className="font-medium text-gray-900 dark:text-white">{label}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Notification Categories */}
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          🎯 Notification Categories
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Control notifications by type and frequency
        </p>

        <div className="grid gap-4">
          {Object.entries(localPrefs.categories).map(([category, settings]) => (
            <div
              key={category}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900 dark:text-white capitalize">
                  {getCategoryIcon(category)} {getCategoryLabel(category)}
                </h3>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => handleCategoryChange(category, 'enabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="ml-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                    {settings.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>

              {settings.enabled && (
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">Frequency:</label>
                  <select
                    value={settings.frequency}
                    onChange={(e) => handleCategoryChange(category, 'frequency', e.target.value)}
                    className="mt-2 w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="instant">Instant</option>
                    <option value="daily">Daily Digest</option>
                    <option value="weekly">Weekly Digest</option>
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Quiet Hours */}
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          🌙 Quiet Hours
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Don't receive notifications during these hours
        </p>

        <div className="space-y-4">
          <label className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={localPrefs.quietHours.enabled}
              onChange={(e) => handleQuietHoursChange('enabled', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="ml-3 font-medium text-gray-900 dark:text-white">
              Enable Quiet Hours
            </span>
          </label>

          {localPrefs.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={localPrefs.quietHours.start}
                  onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={localPrefs.quietHours.end}
                  onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Timezone
                </label>
                <select
                  value={localPrefs.quietHours.timezone}
                  onChange={(e) => handleQuietHoursChange('timezone', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Asia/Kolkata">India (IST)</option>
                  <option value="UTC">UTC</option>
                  <option value="US/Eastern">US Eastern</option>
                  <option value="US/Pacific">US Pacific</option>
                  <option value="Europe/London">Europe London</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Mute Notifications */}
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          🔇 Mute Notifications
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Temporarily mute all notifications
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[15, 30, 60, 120].map((minutes) => (
            <button
              key={minutes}
              onClick={async () => {
                const token = localStorage.getItem('auth_token');
                await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/mute`, {
                  method: 'PUT',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ minutes }),
                });
                addNotification({
                  title: 'Muted',
                  message: `Notifications muted for ${minutes} minutes`,
                  type: 'success',
                });
              }}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition"
            >
              {minutes} min
            </button>
          ))}
        </div>
      </section>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => setLocalPrefs(preferences)}
          className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

// Helper functions
const getCategoryIcon = (category) => {
  const icons = {
    payments: '💰',
    complaints: '🔗',
    tenants: '👥',
    occupancy: '📊',
    financial: '📈',
    maintenance: '🔧',
    documents: '📄',
    messages: '💬',
  };
  return icons[category] || '🔔';
};

const getCategoryLabel = (category) => {
  const labels = {
    payments: 'Payments',
    complaints: 'Complaints',
    tenants: 'Tenant Updates',
    occupancy: 'Occupancy',
    financial: 'Financial Reports',
    maintenance: 'Maintenance',
    documents: 'Documents',
    messages: 'Messages',
  };
  return labels[category] || category;
};

export default NotificationPreferencesPage;
