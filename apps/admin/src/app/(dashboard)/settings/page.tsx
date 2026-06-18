'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Shield, Bell, Globe, Mail, Loader2, CheckCircle, AlertCircle, Clock, Smartphone, KeyRound, QrCode, XCircle, Trash2, Download } from 'lucide-react';
import { getAppConfig, updateAppConfig, getMfaStatus, setupMfa, verifyMfaSetup, disableMfa } from '@/lib/api';
import type { AppConfig } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dabbu-1ff9.onrender.com/api/v1';

function getToken() {
  return localStorage.getItem('admin_token') || '';
}

export default function AdminSettingsPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const [testTo, setTestTo] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [dataRetention, setDataRetention] = useState<any>(null);
  const [retentionLoading, setRetentionLoading] = useState(false);
  const [deleteInactiveLoading, setDeleteInactiveLoading] = useState(false);
  const [exportAllLoading, setExportAllLoading] = useState(false);
  const [enforceLoading, setEnforceLoading] = useState(false);

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaVerified, setMfaVerified] = useState(false);
  const [mfaEmail, setMfaEmail] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaQrUrl, setMfaQrUrl] = useState('');
  const [mfaSetupCode, setMfaSetupCode] = useState('');
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaSetupLoading, setMfaSetupLoading] = useState(false);
  const [mfaDisabling, setMfaDisabling] = useState(false);
  const [mfaError, setMfaError] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState('');

  useEffect(() => { loadConfig(); loadMfaStatus(); }, []);

  async function loadMfaStatus() {
    try {
      const res = await getMfaStatus();
      setMfaRequired(res.data.required);
      setMfaVerified(res.data.verified);
      setMfaEmail(res.data.email);
    } catch { /* ignore */ }
  }

  async function handleSetupMfa() {
    setMfaSetupLoading(true);
    setMfaError('');
    setMfaSuccess('');
    try {
      const res = await setupMfa();
      setMfaSecret(res.data.secret);
      setMfaQrUrl(res.data.qrCodeUrl);
    } catch (e: any) {
      setMfaError(e.message);
    } finally {
      setMfaSetupLoading(false);
    }
  }

  async function handleVerifyMfaSetup() {
    if (mfaSetupCode.length !== 6) return;
    setMfaVerifying(true);
    setMfaError('');
    try {
      await verifyMfaSetup(mfaSetupCode);
      setMfaRequired(true);
      setMfaSecret('');
      setMfaQrUrl('');
      setMfaSetupCode('');
      setMfaSuccess('MFA has been enabled successfully.');
      setTimeout(() => setMfaSuccess(''), 3000);
    } catch (e: any) {
      setMfaError(e.message);
    } finally {
      setMfaVerifying(false);
    }
  }

  async function handleDisableMfa() {
    setMfaDisabling(true);
    setMfaError('');
    try {
      await disableMfa();
      setMfaRequired(false);
      setMfaSecret('');
      setMfaQrUrl('');
      setMfaSetupCode('');
      setMfaSuccess('MFA has been disabled.');
      setTimeout(() => setMfaSuccess(''), 3000);
    } catch (e: any) {
      setMfaError(e.message);
    } finally {
      setMfaDisabling(false);
    }
  }

  async function loadConfig() {
    setLoading(true);
    try { const res = await getAppConfig(); setConfig(res.data); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  function updateField(key: string, value: any) { if (!config) return; setConfig({ ...config, [key]: value }); }

  async function handleSave() {
    if (!config) return;
    setSaving(true); setSaved(false); setError('');
    try { await updateAppConfig(config); setSaved(true); setTimeout(() => setSaved(false), 3000); }
    catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleSendTest() {
    if (!testTo.trim()) return;
    setTestSending(true); setTestResult(null);
    try {
      const res = await fetch(`${API_URL}/admin/configuration/test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ to: testTo.trim() }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message?.[0] || err.message || 'Failed'); }
      setTestResult({ ok: true, msg: 'Test email sent successfully!' });
    } catch (e: any) { setTestResult({ ok: false, msg: e.message }); }
    finally { setTestSending(false); }
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'email', label: 'SMTP / Email', icon: Mail },
    { id: 'localization', label: 'Localization', icon: Globe },
    { id: 'data-retention', label: 'Data Retention', icon: Clock },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>;
  if (!config) return <div className="flex items-center justify-center h-64 text-red-400"><p>{error || 'Failed to load settings'}</p></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-white/40">Configure application settings and preferences</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-glass">
          {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {saved && (
        <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 px-4 py-3 rounded-2xl border border-emerald-500/20">
          <CheckCircle className="w-4 h-4" /> Settings saved successfully
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 px-4 py-3 rounded-2xl border border-red-500/20">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="flex gap-6">
        <div className="w-64 space-y-1">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-2xl transition-all ${activeTab === tab.id ? 'bg-white/[0.08] text-white border border-white/[0.06]' : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="glass-panel p-6">
                <h3 className="font-semibold text-white/80 mb-4">General Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <TextField label="App Name" value={config.appName} onChange={(v) => updateField('appName', v)} />
                  <TextField label="Support Email" value={config.supportEmail} onChange={(v) => updateField('supportEmail', v)} />
                  <SelectField label="Default Plan" value={config.newUserDefaultPlan} onChange={(v) => updateField('newUserDefaultPlan', v)}
                    options={[{ value: 'free', label: 'Free' }, { value: 'basic', label: 'Basic' }, { value: 'premium', label: 'Premium' }]} />
                  <TextField label="Trial Duration (days)" value={String(config.trialDurationDays)} onChange={(v) => updateField('trialDurationDays', parseInt(v))} type="number" />
                </div>
              </div>

              <div className="glass-panel p-6">
                <h3 className="font-semibold text-white/80 mb-4">Toggles</h3>
                <div className="space-y-4">
                  <ToggleRow label="Enable New Signups" checked={!!config.enableSignups} onChange={(v) => updateField('enableSignups', v)} />
                  <ToggleRow label="Enable API Access" checked={!!config.enableApiAccess} onChange={(v) => updateField('enableApiAccess', v)} />
                </div>
              </div>

              <div className="glass-panel p-6">
                <h3 className="font-semibold text-white/80 mb-4">Maintenance Mode</h3>
                <div className="space-y-4">
                  <ToggleRow label="Maintenance Mode" checked={!!config.maintenanceMode} onChange={(v) => updateField('maintenanceMode', v)} />
                  {config.maintenanceMode && (
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-1">Maintenance Message</label>
                      <textarea value={config.maintenanceMessage || ''} onChange={(e) => updateField('maintenanceMessage', e.target.value)}
                        placeholder="We are improving your experience. Please check back shortly." rows={2} className="glass-input w-full px-3 py-2.5 resize-none" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <>
              <div className="glass-panel p-6">
                <h3 className="font-semibold text-white/80 mb-4">Security Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <TextField label="Max Login Attempts" value={String(config.maxLoginAttempts)} onChange={(v) => updateField('maxLoginAttempts', parseInt(v))} type="number" />
                  <TextField label="Session Timeout (min)" value={String(config.sessionTimeout)} onChange={(v) => updateField('sessionTimeout', parseInt(v))} type="number" />
                </div>
                <div className="mt-4"><ToggleRow label="OTP Authentication" checked={!!config.otpEnabled} onChange={(v) => updateField('otpEnabled', v)} /></div>
              </div>

              <div className="glass-panel p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white/80">Multi-Factor Authentication</h3>
                  <Smartphone className="w-5 h-5 text-white/40" />
                </div>

                {mfaError && (
                  <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 px-4 py-3 rounded-2xl border border-red-500/20 mb-4">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {mfaError}
                  </div>
                )}
                {mfaSuccess && (
                  <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 px-4 py-3 rounded-2xl border border-emerald-500/20 mb-4">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" /> {mfaSuccess}
                  </div>
                )}

                {mfaRequired && mfaVerified && !mfaSecret ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-emerald-400">
                      <CheckCircle className="w-4 h-4" /> MFA is currently enabled
                    </div>
                    <button
                      onClick={handleDisableMfa}
                      disabled={mfaDisabling}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-red-500/20 text-red-300 border border-red-500/20 hover:bg-red-500/30 disabled:opacity-50 transition-all"
                    >
                      {mfaDisabling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      {mfaDisabling ? 'Disabling...' : 'Disable MFA'}
                    </button>
                  </div>
                ) : mfaSecret ? (
                  <div className="space-y-4">
                    <p className="text-sm text-white/60">
                      Scan this QR code with your authenticator app (e.g. Google Authenticator, Authy) or enter the setup key manually.
                    </p>
                    <div className="flex justify-center">
                      <div className="bg-white p-4 rounded-xl">
                        <QrCode className="w-40 h-40 text-black" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-white/40 mb-1">Or enter this key manually:</p>
                      <code className="text-sm font-mono bg-white/[0.06] px-3 py-1.5 rounded-lg text-indigo-300 select-all">{mfaSecret}</code>
                    </div>
                    <div className="pt-2">
                      <label className="block text-sm font-medium text-white/60 mb-1.5">
                        Enter the 6-digit code from your authenticator app
                      </label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={mfaSetupCode}
                          onChange={(e) => setMfaSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="glass-input flex-1 px-3 py-2.5 text-center text-lg tracking-[0.4em] font-mono"
                          placeholder="000000"
                          maxLength={6}
                        />
                        <button
                          onClick={handleVerifyMfaSetup}
                          disabled={mfaVerifying || mfaSetupCode.length !== 6}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/30 disabled:opacity-50 transition-all"
                        >
                          {mfaVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                          {mfaVerifying ? 'Verifying...' : 'Verify'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-white/60">
                      Add an extra layer of security by requiring a one-time code from your authenticator app when logging in.
                    </p>
                    <button
                      onClick={handleSetupMfa}
                      disabled={mfaSetupLoading}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/30 disabled:opacity-50 transition-all"
                    >
                      {mfaSetupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                      {mfaSetupLoading ? 'Setting up...' : 'Enable MFA'}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'notifications' && (
            <div className="glass-panel p-6">
              <h3 className="font-semibold text-white/80 mb-4">Notification Defaults</h3>
              <div className="space-y-4">
                <ToggleRow label="Email Notifications" checked={!!config.emailNotifications} onChange={(v) => updateField('emailNotifications', v)} />
                <ToggleRow label="Push Notifications" checked={!!config.pushNotifications} onChange={(v) => updateField('pushNotifications', v)} />
                <ToggleRow label="SMS Notifications" checked={!!config.smsNotifications} onChange={(v) => updateField('smsNotifications', v)} />
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="space-y-6">
              <div className="glass-panel p-6">
                <h3 className="font-semibold text-white/80 mb-4">SMTP Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <TextField label="SMTP Host" value={config.smtpHost || ''} onChange={(v) => updateField('smtpHost', v || null)} />
                  <TextField label="SMTP Port" value={config.smtpPort ? String(config.smtpPort) : ''} onChange={(v) => updateField('smtpPort', v ? parseInt(v) : null)} type="number" />
                  <TextField label="SMTP User" value={config.smtpUser || ''} onChange={(v) => updateField('smtpUser', v || null)} />
                  <TextField label="SMTP Password" value={config.smtpPass || ''} onChange={(v) => updateField('smtpPass', v || null)} type="password" />
                  <TextField label="From Name" value={config.smtpFromName || ''} onChange={(v) => updateField('smtpFromName', v || null)} />
                  <TextField label="From Email" value={config.smtpFromEmail || ''} onChange={(v) => updateField('smtpFromEmail', v || null)} />
                </div>
                <div className="mt-4">
                  <ToggleRow label="Use SSL/TLS (secure port)" checked={!!config.smtpSecure} onChange={(v) => updateField('smtpSecure', v)} />
                </div>
              </div>

              <div className="glass-panel p-6">
                <h3 className="font-semibold text-white/80 mb-4">Test Email</h3>
                <p className="text-sm text-white/40 mb-4">Send a test email to verify your SMTP configuration.</p>
                <div className="flex gap-3">
                  <input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)}
                    placeholder="es6developer@gmail.com"
                    className="glass-input flex-1 px-3 py-2.5" />
                  <button onClick={handleSendTest} disabled={testSending || !testTo.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/30 disabled:opacity-50 transition-all">
                    {testSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    {testSending ? 'Sending...' : 'Send Test'}
                  </button>
                </div>
                {testResult && (
                  <div className={`flex items-center gap-2 text-sm mt-3 px-3 py-2 rounded-xl ${testResult.ok ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/20'}`}>
                    {testResult.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} {testResult.msg}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'localization' && (
            <div className="glass-panel p-6">
              <h3 className="font-semibold text-white/80 mb-4">Localization Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="Default Currency" value={config.defaultCurrency} onChange={(v) => updateField('defaultCurrency', v)}
                  options={[{ value: 'INR', label: 'INR' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }, { value: 'GBP', label: 'GBP' }]} />
                <SelectField label="Timezone" value={config.timezone} onChange={(v) => updateField('timezone', v)}
                  options={[{ value: 'UTC', label: 'UTC' }, { value: 'Asia/Kolkata', label: 'Asia/Kolkata' }, { value: 'America/New_York', label: 'America/New_York' }]} />
                <SelectField label="Default Language" value={config.language} onChange={(v) => updateField('language', v)}
                  options={[{ value: 'en', label: 'English' }, { value: 'hi', label: 'Hindi' }]} />
              </div>
            </div>
          )}

          {activeTab === 'data-retention' && (
            <div className="space-y-6">
              <div className="glass-panel p-6">
                <h3 className="font-semibold text-white/80 mb-4">Data Retention Periods</h3>
                {retentionLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/40" /></div>
                ) : dataRetention ? (
                  <div className="space-y-3">
                    {Object.entries(dataRetention.retentionPeriods || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                        <span className="text-sm text-white/80 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-sm text-white/40">{value as string}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <button onClick={async () => {
                      setRetentionLoading(true);
                      try {
                        const res = await fetch(`${API_URL}/compliance/data-retention-policy`);
                        const json = await res.json();
                        setDataRetention(json.data || json);
                      } catch { setDataRetention({ retentionPeriods: { error: 'Failed to load' } }); }
                      finally { setRetentionLoading(false); }
                    }} className="btn-glass text-sm">Load Retention Policy</button>
                  </div>
                )}
              </div>

              <div className="glass-panel p-6">
                <h3 className="font-semibold text-white/80 mb-4">Actions</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <div>
                      <p className="text-sm font-medium text-white/80">Enforce Data Retention</p>
                      <p className="text-xs text-white/40 mt-1">Purge expired analytics, sessions, logs, and exports per policy</p>
                    </div>
                    <button onClick={async () => {
                      setEnforceLoading(true);
                      try {
                        const res = await fetch(`${API_URL}/admin/compliance/enforce-retention`, {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${getToken()}` },
                        });
                        const json = await res.json();
                        alert(JSON.stringify(json.data || json, null, 2));
                      } catch (e: any) { alert('Failed: ' + e.message); }
                      finally { setEnforceLoading(false); }
                    }} disabled={enforceLoading} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/20 hover:bg-amber-500/30 disabled:opacity-50 transition-all">
                      {enforceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                      {enforceLoading ? 'Enforcing...' : 'Enforce Now'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <div>
                      <p className="text-sm font-medium text-white/80">Delete Inactive Users</p>
                      <p className="text-xs text-white/40 mt-1">Remove users with no activity in the last 365 days</p>
                    </div>
                    <button onClick={async () => {
                      if (!confirm('Are you sure you want to delete all users inactive for 365+ days?')) return;
                      setDeleteInactiveLoading(true);
                      try {
                        const res = await fetch(`${API_URL}/admin/compliance/delete-inactive`, {
                          method: 'DELETE',
                          headers: { Authorization: `Bearer ${getToken()}` },
                        });
                        const json = await res.json();
                        const data = json.data || json;
                        alert(data.message || 'Done');
                      } catch (e: any) { alert('Failed: ' + e.message); }
                      finally { setDeleteInactiveLoading(false); }
                    }} disabled={deleteInactiveLoading} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-red-500/20 text-red-300 border border-red-500/20 hover:bg-red-500/30 disabled:opacity-50 transition-all">
                      {deleteInactiveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      {deleteInactiveLoading ? 'Deleting...' : 'Delete Inactive Users'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <div>
                      <p className="text-sm font-medium text-white/80">Export All User Data</p>
                      <p className="text-xs text-white/40 mt-1">Download a JSON file with all registered users and their metadata</p>
                    </div>
                    <button onClick={async () => {
                      setExportAllLoading(true);
                      try {
                        const res = await fetch(`${API_URL}/admin/compliance/export-all-users`, {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${getToken()}` },
                        });
                        const json = await res.json();
                        const data = json.data || json;
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `all-users-export-${new Date().toISOString().split('T')[0]}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch (e: any) { alert('Failed: ' + e.message); }
                      finally { setExportAllLoading(false); }
                    }} disabled={exportAllLoading} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/30 disabled:opacity-50 transition-all">
                      {exportAllLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {exportAllLoading ? 'Exporting...' : 'Export All User Data'}
                    </button>
                  </div>
                </div>
              </div>

              {dataRetention && (
                <div className="glass-panel p-6">
                  <h3 className="font-semibold text-white/80 mb-4">GDPR Compliance Info</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-white/60"><span className="text-white/80 font-medium">GDPR Contact:</span> {dataRetention.gdprContact}</p>
                    <p className="text-white/60"><span className="text-white/80 font-medium">DPO:</span> {dataRetention.dataProtectionOfficer}</p>
                    <p className="text-white/60"><span className="text-white/80 font-medium">Legal Basis:</span> {dataRetention.legalBase}</p>
                    <p className="text-white/60"><span className="text-white/80 font-medium">Deletion Process:</span> {dataRetention.deletionProcess}</p>
                    <p className="text-white/60"><span className="text-white/80 font-medium">Export Formats:</span> {dataRetention.exportFormats?.join(', ')}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/60 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="glass-input w-full px-3 py-2.5" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/60 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="glass-input w-full px-3 py-2.5 appearance-none">
        {options.map((o) => <option key={o.value} value={o.value} className="bg-gray-900">{o.label}</option>)}
      </select>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between py-2">
      <span className="text-sm text-white/80">{label}</span>
      <button onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${checked ? 'bg-indigo-500/50' : 'bg-white/[0.08]'}`}>
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ml-0.5 ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </label>
  );
}
