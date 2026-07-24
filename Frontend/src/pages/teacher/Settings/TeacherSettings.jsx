import { useState } from 'react';
import TeacherShell, { Icon } from '../../../components/TeacherShell.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { authService } from '../../../services/authService.js';

const DEFAULT_PREFS = {
  email_exam_assigned: true,
  email_suspicious_activity: true,
  email_exam_results: true,
  email_announcements: false,
  sms_notifications: false,
};

function parsePrefs(value) {
  if (!value) return { ...DEFAULT_PREFS };
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(value) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export default function TeacherSettings({ page, setPage }) {
  const { user, updateUser } = useAuth();
  const [prefs, setPrefs] = useState(() => parsePrefs(user?.notification_preferences));
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  function handleToggle(key) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const payload = { notification_preferences: JSON.stringify(prefs) };
      const result = await authService.updateProfile(payload);
      updateUser(result.user);
      setSuccess('Settings saved successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <TeacherShell page={page} setPage={setPage} title="Settings">
      <div className="max-w-2xl">
        {success && (
          <div className="mb-md rounded-lg bg-tertiary-fixed p-md text-label-md text-on-tertiary-fixed font-bold flex items-center gap-xs">
            <Icon>check_circle</Icon> {success}
          </div>
        )}
        {error && (
          <div className="mb-md rounded-lg bg-error-container p-md text-label-md text-error font-bold flex items-center gap-xs">
            <Icon>error</Icon> {error}
          </div>
        )}

        <form onSubmit={handleSave}>
          <section className="card p-lg mb-lg">
            <h3 className="text-label-lg font-bold text-primary mb-md flex items-center gap-xs">
              <Icon>notifications</Icon> Notification Preferences
            </h3>
            <p className="text-body-sm text-on-surface-variant mb-md">Choose which notifications you'd like to receive.</p>
            <div className="space-y-md">
              <ToggleRow
                label="Exam Assigned"
                description="When a new exam is assigned to you"
                checked={prefs.email_exam_assigned}
                onChange={() => handleToggle('email_exam_assigned')}
              />
              <ToggleRow
                label="Suspicious Activity Alerts"
                description="When suspicious activity is detected during an exam"
                checked={prefs.email_suspicious_activity}
                onChange={() => handleToggle('email_suspicious_activity')}
              />
              <ToggleRow
                label="Exam Results"
                description="When exam results are published"
                checked={prefs.email_exam_results}
                onChange={() => handleToggle('email_exam_results')}
              />
              <ToggleRow
                label="Announcements"
                description="Platform updates and announcements"
                checked={prefs.email_announcements}
                onChange={() => handleToggle('email_announcements')}
              />
              <ToggleRow
                label="SMS Notifications"
                description="Receive critical alerts via SMS"
                checked={prefs.sms_notifications}
                onChange={() => handleToggle('sms_notifications')}
              />
            </div>
          </section>

          <button type="submit" disabled={saving} className="btn-primary px-lg py-sm flex items-center gap-xs">
            {saving ? <><div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" /> Saving...</> : <><Icon>save</Icon> Save Settings</>}
          </button>
        </form>
      </div>
    </TeacherShell>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <label className="flex items-start gap-md cursor-pointer group">
      <div className={`relative w-11 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${checked ? 'bg-secondary' : 'bg-outline-variant'}`}>
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${checked ? 'translate-x-5' : ''}`} />
        <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      </div>
      <div>
        <p className="text-body-md font-bold text-on-surface group-hover:text-primary transition-colors">{label}</p>
        <p className="text-body-sm text-on-surface-variant">{description}</p>
      </div>
    </label>
  );
}