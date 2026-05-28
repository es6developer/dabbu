'use client';

import { useState } from 'react';
import { Settings, Save, User, Bell, Shield, Globe } from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    appName: 'Dabbu',
    supportEmail: 'support@dabbu.app',
    maintenanceMode: false,
    otpEnabled: true,
    maxLoginAttempts: 5,
    sessionTimeout: 60,
    newUserDefaultPlan: 'free',
    trialDurationDays: 14,
    enableSignups: true,
    enableApiAccess: false,
    currency: 'USD',
    timezone: 'UTC',
    language: 'en',
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
  });

  const updateSetting = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'localization', label: 'Localization', icon: Globe },
  ];

  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400">Configure application settings and preferences</p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
          <Save className="w-4 h-4" /> Save Changes
        </button>
      </div>

      <div className="flex gap-6">
        <div className="w-64 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm dark:border dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                  <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Profile</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Admin account information</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                  <input type="text" defaultValue="Admin User" className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input type="email" defaultValue="admin@dabbu.app" className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Change Password</button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm dark:border dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10">
                  <Settings className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Common administrative tasks</p>
                </div>
              </div>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                  Clear application cache
                </button>
                <button className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                  Run database maintenance
                </button>
                <button className="w-full text-left px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-sm hover:bg-red-100 dark:hover:bg-red-500/20">
                  Generate system report
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm dark:border dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">General Settings</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">App Name</label>
                  <input
                    type="text"
                    value={settings.appName}
                    onChange={(e) => updateSetting('appName', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Support Email</label>
                  <input
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) => updateSetting('supportEmail', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Plan</label>
                  <select
                    value={settings.newUserDefaultPlan}
                    onChange={(e) => updateSetting('newUserDefaultPlan', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="free">Free</option>
                    <option value="basic">Basic</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trial Duration (days)</label>
                  <input
                    type="number"
                    value={settings.trialDurationDays}
                    onChange={(e) => updateSetting('trialDurationDays', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              {[
                { key: 'enableSignups', label: 'Enable New Signups' },
                { key: 'enableApiAccess', label: 'Enable API Access' },
                { key: 'maintenanceMode', label: 'Maintenance Mode' },
              ].map((toggle) => (
                <label key={toggle.key} className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{toggle.label}</span>
                  <button
                    onClick={() => updateSetting(toggle.key, !(settings as any)[toggle.key])}
                    className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                      (settings as any)[toggle.key] ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ml-0.5 ${
                      (settings as any)[toggle.key] ? 'translate-x-5' : ''
                    }`} />
                  </button>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
