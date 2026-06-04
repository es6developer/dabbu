'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Shield,
  Bell,
  Globe,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { getAppConfig, updateAppConfig } from '@/lib/api';
import type { AppConfig } from '@/lib/api';

export default function AdminSettingsPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    setLoading(true);
    try {
      const res = await getAppConfig();
      setConfig(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function updateField(key: string, value: any) {
    if (!config) {
      return;
    }
    setConfig({ ...config, [key]: value });
  }

  async function handleSave() {
    if (!config) {
      return;
    }
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      await updateAppConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'localization', label: 'Localization', icon: Globe },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive">
        <p>{error || 'Failed to load settings'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Configure application settings and preferences</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {saved && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 rounded-lg">
          <CheckCircle className="w-4 h-4" /> Settings saved successfully
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-4 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="flex gap-6">
        <div className="w-64 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4">General Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      App Name
                    </label>
                    <input
                      type="text"
                      value={config.appName}
                      onChange={(e) => updateField('appName', e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Support Email
                    </label>
                    <input
                      type="email"
                      value={config.supportEmail}
                      onChange={(e) => updateField('supportEmail', e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Default Plan
                    </label>
                    <select
                      value={config.newUserDefaultPlan}
                      onChange={(e) => updateField('newUserDefaultPlan', e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                    >
                      <option value="free">Free</option>
                      <option value="basic">Basic</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Trial Duration (days)
                    </label>
                    <input
                      type="number"
                      value={config.trialDurationDays}
                      onChange={(e) => updateField('trialDurationDays', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4">Toggles</h3>
                <div className="space-y-4">
                  {[
                    { key: 'enableSignups', label: 'Enable New Signups' },
                    { key: 'enableApiAccess', label: 'Enable API Access' },
                  ].map((toggle) => (
                    <label key={toggle.key} className="flex items-center justify-between py-2">
                      <span className="text-sm text-foreground">{toggle.label}</span>
                      <button
                        onClick={() => updateField(toggle.key, !(config as any)[toggle.key])}
                        className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                          (config as any)[toggle.key]
                            ? 'bg-indigo-600'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ml-0.5 ${(config as any)[toggle.key] ? 'translate-x-5' : ''}`}
                        />
                      </button>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4">Maintenance Mode</h3>
                <div className="space-y-4">
                  <label className="flex items-center justify-between py-2">
                    <span className="text-sm text-foreground">Maintenance Mode</span>
                    <button
                      onClick={() => updateField('maintenanceMode', !config.maintenanceMode)}
                      className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                        config.maintenanceMode ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ml-0.5 ${config.maintenanceMode ? 'translate-x-5' : ''}`}
                      />
                    </button>
                  </label>
                  {config.maintenanceMode && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Maintenance Message
                      </label>
                      <textarea
                        value={config.maintenanceMessage || ''}
                        onChange={(e) => updateField('maintenanceMessage', e.target.value)}
                        placeholder="We are improving your experience. Please check back shortly."
                        rows={2}
                        className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4">Security Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Max Login Attempts
                  </label>
                  <input
                    type="number"
                    value={config.maxLoginAttempts}
                    onChange={(e) => updateField('maxLoginAttempts', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Session Timeout (min)
                  </label>
                  <input
                    type="number"
                    value={config.sessionTimeout}
                    onChange={(e) => updateField('sessionTimeout', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                  />
                </div>
              </div>
              <label className="flex items-center justify-between py-2 mt-4">
                <span className="text-sm text-foreground">OTP Authentication</span>
                <button
                  onClick={() => updateField('otpEnabled', !config.otpEnabled)}
                  className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${config.otpEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ml-0.5 ${config.otpEnabled ? 'translate-x-5' : ''}`}
                  />
                </button>
              </label>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4">Notification Defaults</h3>
              <div className="space-y-4">
                {[
                  { key: 'emailNotifications', label: 'Email Notifications' },
                  { key: 'pushNotifications', label: 'Push Notifications' },
                  { key: 'smsNotifications', label: 'SMS Notifications' },
                ].map((toggle) => (
                  <label key={toggle.key} className="flex items-center justify-between py-2">
                    <span className="text-sm text-foreground">{toggle.label}</span>
                    <button
                      onClick={() => updateField(toggle.key, !(config as any)[toggle.key])}
                      className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${(config as any)[toggle.key] ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <span
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ml-0.5 ${(config as any)[toggle.key] ? 'translate-x-5' : ''}`}
                      />
                    </button>
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'localization' && (
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4">Localization Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Default Currency
                  </label>
                  <select
                    value={config.defaultCurrency}
                    onChange={(e) => updateField('defaultCurrency', e.target.value)}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Timezone</label>
                  <select
                    value={config.timezone}
                    onChange={(e) => updateField('timezone', e.target.value)}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                  >
                    <option value="UTC">UTC</option>
                    <option value="Asia/Kolkata">Asia/Kolkata</option>
                    <option value="America/New_York">America/New_York</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Default Language
                  </label>
                  <select
                    value={config.language}
                    onChange={(e) => updateField('language', e.target.value)}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
