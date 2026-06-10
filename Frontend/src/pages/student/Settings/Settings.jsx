import { useState } from 'react';
import StudentLayout from '../../../components/StudentLayout.jsx';
import Icon from '../../../components/Icon.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { api } from '../../../services/api.js';

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

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
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
      </div>
    </StudentLayout>
  );
}
