import { useState, useEffect, useCallback } from 'react';
import StudentLayout from '../../../components/StudentLayout.jsx';
import Icon from '../../../components/Icon.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { api, clearAccessToken } from '../../../services/api.js';
import { authService } from '../../../services/authService.js';

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="block text-sm font-bold text-on-surface-variant mb-xs">{label}</label>
      <input
        type={type}
        className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-lg text-body-md"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    college: user?.college || '',
    branch: user?.branch || '',
    division: user?.division || '',
    year: user?.year || '',
    phone: user?.phone || '',
    batch: user?.batch || '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [loginHistory, setLoginHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [passkeys, setPasskeys] = useState([]);
  const [passkeysLoading, setPasskeysLoading] = useState(true);
  const [registeringPasskey, setRegisteringPasskey] = useState(false);

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await authService.getSessions();
      setSessions(data);
    } catch {
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  useEffect(() => {
    authService.getLoginHistory()
      .then(setLoginHistory)
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  async function handleRevokeSession(id) {
    setRevokingId(id);
    try {
      await authService.revokeSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setRevokingId(null);
    }
  }

  async function handleRevokeAll() {
    setRevokingAll(true);
    try {
      await authService.revokeAllSessions();
      setSessions(prev => prev.filter(s => !s.is_current));
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setRevokingAll(false);
    }
  }

  async function fetchPasskeys() {
    setPasskeysLoading(true);
    try {
      const data = await authService.webauthnListCredentials();
      setPasskeys(data);
    } catch {} finally {
      setPasskeysLoading(false);
    }
  }

  useEffect(() => { fetchPasskeys(); }, []);

  async function handleRegisterPasskey() {
    setRegisteringPasskey(true);
    try {
      const { options, challenge } = await authService.webauthnRegisterBegin();
      const opts = JSON.parse(options);
      const cred = await navigator.credentials.create({ publicKey: opts });
      const credential = {
        id: cred.id,
        rawId: Array.from(new Uint8Array(cred.rawId)),
        response: {
          clientDataJSON: Array.from(new Uint8Array(cred.response.clientDataJSON)),
          attestationObject: Array.from(new Uint8Array(cred.response.attestationObject)),
        },
        type: cred.type,
      };
      await authService.webauthnRegisterComplete(credential, challenge);
      await fetchPasskeys();
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Passkey registration failed' });
    } finally {
      setRegisteringPasskey(false);
    }
  }

  async function handleDeletePasskey(id) {
    try {
      await authService.webauthnDeleteCredential(id);
      setPasskeys(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  }

  function formatUA(ua) {
    if (!ua) return 'Unknown device';
    const simplified = ua.replace(/^(Mozilla\/5\.0\s*)?/i, '').replace(/\s*AppleWebKit\/[\d.]+.*$/i, '').replace(/\s*Chrome\/[\d.]+.*$/i, 'Chrome').replace(/\s*Firefox\/[\d.]+.*$/i, 'Firefox').replace(/\s*Safari\/[\d.]+.*$/i, 'Safari').replace(/\s*Edge\/[\d.]+.*$/i, 'Edge');
    return simplified.slice(0, 60);
  }

  function formatTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: '', text: '' });
    try {
      const payload = {};
      for (const key of Object.keys(form)) {
        const val = form[key].trim();
        if (val !== (user[key] || '')) {
          payload[key] = val || null;
        }
      }
      if (Object.keys(payload).length === 0) {
        setMsg({ type: 'info', text: 'No changes to save.' });
        setSaving(false);
        return;
      }
      const res = await api.put('/auth/me', payload);
      updateUser(res.user);
      setMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <StudentLayout title="My Profile">
      <div className="p-gutter max-w-3xl mx-auto">
        <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter">
          <div className="flex items-center gap-md mb-lg">
            <div className="w-16 h-16 rounded-full bg-primary grid place-items-center">
              <span className="text-headline-md text-on-primary font-bold">
                {(user?.name || 'S').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-headline-lg text-primary font-bold">{user?.name || 'Student'}</h1>
              <p className="text-on-surface-variant">{user?.email} • {user?.role}</p>
            </div>
          </div>

          {msg.text && (
            <div className={`mb-md rounded-lg p-sm text-label-md font-bold ${
              msg.type === 'success' ? 'bg-tertiary-container text-on-tertiary-container' :
              msg.type === 'error' ? 'bg-error-container text-error' :
              'bg-surface-container-high text-on-surface-variant'
            }`}>
              {msg.type === 'success' && <Icon name="check_circle" className="inline mr-xs" />}
              {msg.type === 'error' && <Icon name="error" className="inline mr-xs" />}
              {msg.text}
            </div>
          )}

          <form className="space-y-md" onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-2 gap-md">
              <Field label="Full Name" value={form.name} onChange={v => set('name', v)} placeholder="e.g. John Doe" />
              <div>
                <label className="block text-sm font-bold text-on-surface-variant mb-xs">Email</label>
                <input
                  type="email"
                  className="w-full h-12 px-4 bg-surface-container-high border border-outline-variant rounded-lg text-body-md text-on-surface-variant cursor-not-allowed"
                  value={user?.email || ''}
                  disabled
                />
              </div>
              <Field label="Phone Number" value={form.phone} onChange={v => set('phone', v)} placeholder="e.g. +91 9876543210" />
              <Field label="Batch" value={form.batch} onChange={v => set('batch', v)} placeholder="e.g. 2024-2028" />
              <Field label="College" value={form.college} onChange={v => set('college', v)} placeholder="e.g. MIT College" />
              <Field label="Branch" value={form.branch} onChange={v => set('branch', v)} placeholder="e.g. Computer Science" />
              <Field label="Division" value={form.division} onChange={v => set('division', v)} placeholder="e.g. A" />
              <Field label="Year" value={form.year} onChange={v => set('year', v)} placeholder="e.g. 3rd Year" />
            </div>

            <div className="flex justify-end gap-md pt-md border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setForm({
                  name: user?.name || '',
                  college: user?.college || '',
                  branch: user?.branch || '',
                  division: user?.division || '',
                  year: user?.year || '',
                  phone: user?.phone || '',
                  batch: user?.batch || '',
                })}
                className="px-lg py-sm border border-outline-variant rounded-lg text-sm font-bold text-on-surface-variant hover:bg-surface-container-high"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-xl py-sm bg-primary text-on-primary rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </section>

        <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter mt-lg">
          <div className="flex items-center justify-between mb-lg">
            <div>
              <h2 className="text-headline-md text-primary font-bold">Active Sessions</h2>
              <p className="text-body-sm text-on-surface-variant mt-xs">Devices and browsers where you're currently signed in.</p>
            </div>
            {user?.last_login && (
              <div className="text-label-sm text-on-surface-variant text-right">
                <span className="block">Last login</span>
                <span className="font-bold">{formatTime(user.last_login)}</span>
              </div>
            )}
          </div>

          {sessionsLoading ? (
            <div className="flex items-center justify-center py-xl text-on-surface-variant gap-sm">
              <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              Loading sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-xl text-on-surface-variant">
              <Icon name="devices" className="text-3xl mb-sm" />
              <p>No active sessions found.</p>
            </div>
          ) : (
            <div className="space-y-sm">
              {sessions.map(session => (
                <div key={session.id} className={`flex items-center gap-md p-md rounded-xl border ${session.is_current ? 'bg-secondary-container/10 border-secondary-container' : 'bg-surface-container-low border-outline-variant'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${session.is_current ? 'bg-secondary-container text-secondary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                    <Icon name={session.is_current ? 'laptop' : 'devices_other'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-sm flex-wrap">
                      <span className="text-label-md font-bold text-on-surface truncate">{session.device_info || formatUA(session.user_agent) || 'Unknown device'}</span>
                      {session.is_current && <span className="pill bg-secondary-container text-secondary text-label-xs font-bold">Current</span>}
                    </div>
                    <div className="text-label-sm text-on-surface-variant mt-xs space-x-md">
                      {session.ip_address && <span>IP: {session.ip_address}</span>}
                      <span>Created: {formatTime(session.created_at)}</span>
                      <span>Expires: {formatTime(session.expires_at)}</span>
                    </div>
                  </div>
                  {!session.is_current && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={revokingId === session.id}
                      className="shrink-0 px-md py-sm rounded-lg border border-error text-error text-label-sm font-bold hover:bg-error-container disabled:opacity-50 flex items-center gap-xs"
                    >
                      {revokingId === session.id ? <><div className="w-3 h-3 border-2 border-error border-t-transparent rounded-full animate-spin" /> Revoking</> : <><Icon name="logout" className="text-sm" /> Revoke</>}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {sessions.filter(s => !s.is_current).length > 0 && (
            <div className="mt-md pt-md border-t border-outline-variant flex justify-end">
              <button
                onClick={handleRevokeAll}
                disabled={revokingAll}
                className="px-lg py-sm rounded-lg bg-error text-on-error text-label-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-xs"
              >
                {revokingAll ? <><div className="w-4 h-4 border-2 border-on-error border-t-transparent rounded-full animate-spin" /> Revoking All...</> : <><Icon name="logout" /> Log Out All Other Devices</>}
              </button>
            </div>
          )}
        </section>

        <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter mt-lg">
          <div className="mb-lg">
            <h2 className="text-headline-md text-primary font-bold">Login History</h2>
            <p className="text-body-sm text-on-surface-variant mt-xs">Recent login attempts on your account.</p>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center py-xl text-on-surface-variant gap-sm">
              <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              Loading history...
            </div>
          ) : loginHistory.length === 0 ? (
            <div className="text-center py-xl text-on-surface-variant">
              <Icon name="history" className="text-3xl mb-sm" />
              <p>No login history available.</p>
            </div>
          ) : (
            <div className="space-y-sm">
              {loginHistory.map(entry => (
                <div key={entry.id} className="flex items-center gap-md p-md rounded-xl bg-surface-container-low border border-outline-variant">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${entry.success ? 'bg-tertiary-container text-tertiary' : 'bg-error-container text-error'}`}>
                    <Icon name={entry.success ? 'check_circle' : 'cancel'} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-sm">
                      <span className={`text-label-md font-bold ${entry.success ? 'text-tertiary' : 'text-error'}`}>
                        {entry.success ? 'Successful login' : 'Failed login'}
                      </span>
                    </div>
                    <div className="text-label-sm text-on-surface-variant mt-xs space-x-md">
                      {entry.ip_address && <span>IP: {entry.ip_address}</span>}
                      <span>{formatTime(entry.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter mt-lg">
          <div className="flex items-center justify-between mb-lg">
            <div>
              <h2 className="text-headline-md text-primary font-bold">Passkeys</h2>
              <p className="text-body-sm text-on-surface-variant mt-xs">Use fingerprint, face, or a hardware key to sign in quickly.</p>
            </div>
            <button
              onClick={handleRegisterPasskey}
              disabled={registeringPasskey}
              className="px-lg py-sm rounded-lg bg-secondary text-on-secondary text-label-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-xs"
            >
              {registeringPasskey ? 'Registering...' : <><Icon name="fingerprint" /> Add Passkey</>}
            </button>
          </div>

          {passkeysLoading ? (
            <div className="flex items-center justify-center py-xl text-on-surface-variant gap-sm">
              <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              Loading passkeys...
            </div>
          ) : passkeys.length === 0 ? (
            <div className="text-center py-xl text-on-surface-variant">
              <Icon name="fingerprint" className="text-3xl mb-sm" />
              <p>No passkeys registered. Add one for faster sign-in.</p>
            </div>
          ) : (
            <div className="space-y-sm">
              {passkeys.map(pk => (
                <div key={pk.id} className="flex items-center gap-md p-md rounded-xl bg-surface-container-low border border-outline-variant">
                  <div className="w-10 h-10 rounded-full bg-secondary-container text-secondary flex items-center justify-center shrink-0">
                    <Icon name="fingerprint" />
                  </div>
                  <div className="flex-1">
                    <p className="text-label-md font-bold">{pk.name}</p>
                    <p className="text-label-sm text-on-surface-variant">Registered: {formatTime(pk.created_at)}</p>
                  </div>
                  <button
                    onClick={() => handleDeletePasskey(pk.id)}
                    className="shrink-0 px-md py-sm rounded-lg border border-error text-error text-label-sm font-bold hover:bg-error-container"
                  >
                    <Icon name="delete" className="text-sm" /> Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter mt-lg">
          <div className="mb-lg">
            <h2 className="text-headline-md text-primary font-bold">Data & Account</h2>
            <p className="text-body-sm text-on-surface-variant mt-xs">Export your data or delete your account.</p>
          </div>

          <div className="space-y-md">
            <div className="flex items-center justify-between p-md rounded-xl bg-surface-container-low border border-outline-variant">
              <div>
                <p className="text-label-md font-bold">Export Personal Data</p>
                <p className="text-label-sm text-on-surface-variant">Download all your data in JSON format (GDPR compliant).</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    const data = await authService.exportData();
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `skillo-export-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    setMsg({ type: 'success', text: 'Data exported successfully.' });
                  } catch (err) {
                    setMsg({ type: 'error', text: err.message });
                  }
                }}
                className="shrink-0 px-lg py-sm rounded-lg bg-primary text-on-primary text-label-sm font-bold hover:opacity-90"
              >
                <Icon name="download" className="inline mr-xs" /> Export
              </button>
            </div>

            <div className="flex items-center justify-between p-md rounded-xl bg-surface-container-low border border-error/20">
              <div>
                <p className="text-label-md font-bold text-error">Delete Account</p>
                <p className="text-label-sm text-on-surface-variant">Permanently delete your account and all associated data. This action cannot be undone.</p>
              </div>
              <button
                onClick={() => {
                  const password = prompt('Enter your password to confirm account deletion:');
                  if (!password) return;
                  authService.deleteAccount(password)
                    .then(() => {
                      clearAccessToken();
                      window.location.href = '/';
                    })
                    .catch(err => setMsg({ type: 'error', text: err.message }));
                }}
                className="shrink-0 px-lg py-sm rounded-lg bg-error text-on-error text-label-sm font-bold hover:opacity-90"
              >
                <Icon name="delete_forever" className="inline mr-xs" /> Delete Account
              </button>
            </div>
          </div>
        </section>
      </div>
    </StudentLayout>
  );
}
