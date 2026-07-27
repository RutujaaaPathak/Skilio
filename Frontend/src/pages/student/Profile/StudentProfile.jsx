import { useState, useRef, useEffect, useCallback, useId } from 'react';
import StudentLayout from '../../../components/StudentLayout.jsx';
import Icon from '../../../components/Icon.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { authService } from '../../../services/authService.js';

let fieldIdCounter = 0;
function nextFieldId() { return `field-${++fieldIdCounter}`; }

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold text-on-surface-variant mb-xs">{label}</label>
      <input
        id={id}
        type={type}
        className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus-visible:outline-2 focus-visible:outline-secondary"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-label-sm text-on-surface-variant font-bold">{label}</p>
      <p className="text-body-md text-on-surface">{value}</p>
    </div>
  );
}

function EcField({ label, value, onChange, placeholder }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-on-surface-variant mb-xs">{label}</label>
      <input
        id={id}
        className="w-full h-10 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm focus-visible:outline-2 focus-visible:outline-secondary"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export default function StudentProfile() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  const photoId = useId();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [completion, setCompletion] = useState(null);
  const [completionLoading, setCompletionLoading] = useState(true);
  const [institutions, setInstitutions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [ecEditIndex, setEcEditIndex] = useState(null);
  const [ecNewForm, setEcNewForm] = useState(false);
  const [ecForm, setEcForm] = useState({ name: '', relationship: '', phone: '', alternate_phone: '', email: '', address: '', is_primary: false, note: '' });

  function resetEcForm() {
    setEcForm({ name: '', relationship: '', phone: '', alternate_phone: '', email: '', address: '', is_primary: false, note: '' });
  }

  function loadEmergencyContacts() {
    authService.getEmergencyContacts()
      .then(setEmergencyContacts)
      .catch(() => setEmergencyContacts([]));
  }

  useEffect(() => {
    authService.getProfileCompletion()
      .then(setCompletion)
      .catch(() => setCompletion(null))
      .finally(() => setCompletionLoading(false));
    authService.getInstitutions()
      .then(setInstitutions)
      .catch(() => setInstitutions([]));
    loadEmergencyContacts();
  }, [user?.updated_at]);

  const [form, setForm] = useState(() => buildForm(user));

  useEffect(() => {
    const instId = editing ? form.institution_id : user?.institution_id;
    if (instId) {
      authService.getDepartments(instId)
        .then(setDepartments)
        .catch(() => setDepartments([]));
    } else {
      setDepartments([]);
    }
  }, [editing ? form.institution_id : user?.institution_id, editing]);

  function buildForm(u) {
    return {
      name: u?.name || '',
      phone: u?.phone || '',
      college: u?.college || '',
      branch: u?.branch || '',
      division: u?.division || '',
      year: u?.year || '',
      batch: u?.batch || '',
      institution_id: u?.institution_id ?? null,
      department_id: u?.department_id ?? null,
      roll_number: u?.roll_number || '',
    };
  }

  function setFormField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function startEditing() {
    setForm(buildForm(user));
    setEditing(true);
  }

  function handleCancel() {
    setForm(buildForm(user));
    setMsg({ type: '', text: '' });
    setEditing(false);
  }

  async function handleEcSubmit() {
    if (!ecForm.name.trim() || !ecForm.relationship.trim() || !ecForm.phone.trim()) {
      setMsg({ type: 'error', text: 'Name, relationship, and phone are required.' });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...ecForm };
      for (const key of ['alternate_phone', 'email', 'address', 'note']) {
        if (!payload[key]) payload[key] = null;
      }
      await authService.createEmergencyContact(payload);
      await loadEmergencyContacts();
      resetEcForm();
      setEcNewForm(false);
      setMsg({ type: 'success', text: 'Emergency contact added.' });
      setTimeout(() => setMsg({ type: '', text: '' }), 3000);
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to add emergency contact.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleEcUpdate(index) {
    const contact = emergencyContacts[index];
    if (!ecForm.name.trim() || !ecForm.relationship.trim() || !ecForm.phone.trim()) {
      setMsg({ type: 'error', text: 'Name, relationship, and phone are required.' });
      return;
    }
    setSaving(true);
    try {
      const payload = {};
      for (const key of Object.keys(ecForm)) {
        if (ecForm[key] !== contact[key]) {
          payload[key] = ecForm[key];
        }
      }
      for (const key of ['alternate_phone', 'email', 'address', 'note']) {
        if (key in payload && !payload[key]) payload[key] = null;
      }
      if (Object.keys(payload).length === 0) {
        setEcEditIndex(null);
        resetEcForm();
        setSaving(false);
        return;
      }
      await authService.updateEmergencyContact(contact.id, payload);
      await loadEmergencyContacts();
      setEcEditIndex(null);
      resetEcForm();
      setMsg({ type: 'success', text: 'Emergency contact updated.' });
      setTimeout(() => setMsg({ type: '', text: '' }), 3000);
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to update emergency contact.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleEcDelete(contactId) {
    if (!confirm('Delete this emergency contact?')) return;
    setSaving(true);
    try {
      await authService.deleteEmergencyContact(contactId);
      await loadEmergencyContacts();
      setEcEditIndex(null);
      resetEcForm();
      setMsg({ type: 'success', text: 'Emergency contact deleted.' });
      setTimeout(() => setMsg({ type: '', text: '' }), 3000);
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to delete emergency contact.' });
    } finally {
      setSaving(false);
    }
  }

  function startEcEdit(index) {
    const c = emergencyContacts[index];
    setEcForm({
      name: c.name || '',
      relationship: c.relationship || '',
      phone: c.phone || '',
      alternate_phone: c.alternate_phone || '',
      email: c.email || '',
      address: c.address || '',
      is_primary: c.is_primary || false,
      note: c.note || '',
    });
    setEcEditIndex(index);
    setEcNewForm(false);
  }

  function cancelEcEdit() {
    setEcEditIndex(null);
    resetEcForm();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: '', text: '' });
    try {
      const payload = {};
      for (const key of Object.keys(form)) {
        const raw = form[key];
        if (raw == null) continue;
        const val = String(raw).trim();
        if (val !== String(user[key] ?? '')) {
          payload[key] = val || null;
        }
      }
      if (Object.keys(payload).length === 0) {
        setMsg({ type: 'info', text: 'No changes to save.' });
        setSaving(false);
        return;
      }
      const result = await authService.updateProfile(payload);
      updateUser(result.user);
      setMsg({ type: 'success', text: 'Profile updated successfully.' });
      setTimeout(() => setMsg({ type: '', text: '' }), 3000);
      setEditing(false);
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMsg({ type: 'error', text: 'Only JPG, PNG, and WebP images are allowed.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMsg({ type: 'error', text: 'File too large. Maximum size is 5MB.' });
      return;
    }
    setUploading(true);
    setMsg({ type: '', text: '' });
    try {
      const result = await authService.uploadPhoto(file);
      updateUser(result.user);
      setMsg({ type: 'success', text: 'Profile photo updated.' });
      setTimeout(() => setMsg({ type: '', text: '' }), 3000);
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to upload photo.' });
    } finally {
      setUploading(false);
    }
  }

  async function handleRemovePhoto() {
    setUploading(true);
    setMsg({ type: '', text: '' });
    try {
      const result = await authService.removePhoto();
      updateUser(result.user);
      setMsg({ type: 'success', text: 'Profile photo removed.' });
      setTimeout(() => setMsg({ type: '', text: '' }), 3000);
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to remove photo.' });
    } finally {
      setUploading(false);
    }
  }

  function handlePhotoClick() {
    fileInputRef.current?.click();
  }

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'ST';

  const photoSrc = user?.profile_photo_url;

  return (
    <StudentLayout title="My Profile">
      <div className="p-gutter max-w-3xl mx-auto">
        {msg.text && (
          <div className={`mb-md rounded-lg p-sm text-label-md font-bold flex items-center gap-xs ${
            msg.type === 'success' ? 'bg-tertiary-container text-on-tertiary-container' :
            msg.type === 'error' ? 'bg-error-container text-error' :
            'bg-surface-container-high text-on-surface-variant'
          }`}>
            <Icon name={msg.type === 'success' ? 'check_circle' : msg.type === 'error' ? 'error' : 'info'} className="inline" />
            {msg.text}
          </div>
        )}

        <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter mb-gutter">
          <div className="flex items-start gap-lg flex-wrap">
            <div className="shrink-0 relative group">
              {uploading ? (
                <div className="w-24 h-24 rounded-full bg-surface-container-low flex items-center justify-center border border-outline-variant">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : photoSrc ? (
                <img
                  src={photoSrc}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border border-outline-variant"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary text-on-primary grid place-items-center text-headline-lg font-bold border border-outline-variant">
                  {initials}
                </div>
              )}
              <div
                role="button"
                tabIndex={0}
                aria-label="Upload profile photo"
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
                onClick={handlePhotoClick}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePhotoClick(); } }}
              >
                <Icon name="camera_alt" className="text-white" />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              {photoSrc && !uploading && (
                <button
                  onClick={handleRemovePhoto}
                  aria-label="Remove profile photo"
                  className="absolute -top-2 -right-2 min-w-[44px] min-h-[44px] bg-error text-on-error rounded-full flex items-center justify-center text-sm hover:opacity-90 focus-visible:outline-2 focus-visible:outline-error"
                >
                  <Icon name="close" />
                </button>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-headline-lg text-primary font-bold">{user?.name}</h1>
              <p className="text-body-md text-on-surface-variant">{user?.email}</p>
              {user?.username && (
                <div className="flex items-center gap-xs mt-xs">
                  <span className="pill bg-secondary-container text-secondary text-xs font-bold px-sm py-1 rounded-full">
                    ID: {user.username}
                  </span>
                  {user?.is_verified && (
                    <span className="pill bg-tertiary-fixed text-on-tertiary-fixed text-xs font-bold px-sm py-1 rounded-full">
                      Verified
                    </span>
                  )}
                  <span className="pill bg-surface-container-high text-on-surface-variant text-xs font-bold px-sm py-1 rounded-full capitalize">
                    {user?.role}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => { if (editing) handleCancel(); else startEditing(); }}
              className="h-11 px-md border border-outline-variant rounded-lg text-sm font-bold text-on-surface-variant hover:bg-surface-container-high focus-visible:outline-2 focus-visible:outline-secondary flex items-center gap-xs shrink-0"
            >
              <Icon name={editing ? 'close' : 'edit'} />
              {editing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
        </section>

        {!completionLoading && completion && (
          <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter mb-gutter">
            <div className="flex items-center justify-between mb-sm">
              <h2 className="text-headline-sm text-primary font-bold flex items-center gap-xs">
                <Icon name="checklist" /> Profile Completion
              </h2>
              <span className={`text-label-lg font-bold ${completion.is_complete ? 'text-tertiary' : 'text-secondary'}`}>
                {completion.percentage}%
              </span>
            </div>
            <div className="h-3 w-full bg-surface-container-high rounded-full overflow-hidden mb-md">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  completion.is_complete ? 'bg-tertiary' : 'bg-secondary'
                }`}
                style={{ width: `${completion.percentage}%` }}
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-sm">
              {(completion.completed_fields || []).map(field => (
                <div key={field} className="flex items-center gap-xs text-label-sm text-tertiary">
                  <Icon name="check_circle" className="text-sm" /> {field}
                </div>
              ))}
              {(completion.missing_fields || []).map(field => (
                <div key={field} className="flex items-center gap-xs text-label-sm text-on-surface-variant">
                  <Icon name="radio_button_unchecked" className="text-sm" /> {field}
                </div>
              ))}
            </div>
            {!completion.is_complete && (
              <p className="mt-sm text-label-sm text-secondary flex items-center gap-xs">
                <Icon name="info" className="text-sm" />
                Complete all required fields to unlock exam participation.
              </p>
            )}
          </section>
        )}

        {editing ? (
          <form onSubmit={handleSubmit}>
            <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter mb-gutter">
              <h2 className="text-headline-sm text-primary font-bold mb-md flex items-center gap-xs">
                <Icon name="person" /> Personal Information
              </h2>
              <div className="grid md:grid-cols-2 gap-md">
                <Field label="Full Name" value={form.name} onChange={v => setFormField('name', v)} placeholder="e.g. John Doe" />
                <Field label="Phone Number" value={form.phone} onChange={v => setFormField('phone', v)} placeholder="e.g. +91 9876543210" />
              </div>
            </section>

            <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter mb-gutter">
              <h2 className="text-headline-sm text-primary font-bold mb-md flex items-center gap-xs">
                <Icon name="school" /> Academic Information
              </h2>
              <div className="space-y-md">
                <div>
                  <label htmlFor="profile-institution" className="block text-sm font-bold text-on-surface-variant mb-xs">College / Institution</label>
                  <select
                    id="profile-institution"
                    className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-lg text-body-md"
                    value={form.institution_id || ''}
                    onChange={e => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      setFormField('institution_id', val);
                      setFormField('department_id', null);
                    }}
                  >
                    <option value="">Select Institution</option>
                    {(institutions || []).map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.name} ({inst.code})</option>
                    ))}
                  </select>
                  {(institutions || []).length === 0 && (
                    <p className="mt-xs text-label-sm text-on-surface-variant">
                      No institutions available. <button type="button" className="text-secondary font-bold underline" onClick={() => setFormField('college', form.college || user?.college || '')}>Enter manually?</button>
                    </p>
                  )}
                </div>
                {form.institution_id && (
                  <div>
                    <label htmlFor="profile-department" className="block text-sm font-bold text-on-surface-variant mb-xs">Branch / Department</label>
                    <select
                      id="profile-department"
                      className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-lg text-body-md"
                      value={form.department_id || ''}
                      onChange={e => setFormField('department_id', e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">Select Department</option>
                      {(departments || []).map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid md:grid-cols-2 gap-md">
                  <Field label="Roll Number" value={form.roll_number} onChange={v => setFormField('roll_number', v)} placeholder="e.g. 2024CS001" />
                  <Field label="Division" value={form.division} onChange={v => setFormField('division', v)} placeholder="e.g. A" />
                  <div>
                    <label htmlFor="profile-year" className="block text-sm font-bold text-on-surface-variant mb-xs">Year / Semester</label>
                    <select
                      id="profile-year"
                      className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-lg text-body-md"
                      value={form.year}
                      onChange={e => setFormField('year', e.target.value)}
                    >
                      <option value="">Select Semester</option>
                      {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map(s => (
                        <option key={s} value={s}>{s} Semester</option>
                      ))}
                    </select>
                  </div>
                  <Field label="Batch" value={form.batch} onChange={v => setFormField('batch', v)} placeholder="e.g. 2024-2028" />
                </div>
              </div>
            </section>

            <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter mb-gutter">
              <h2 className="text-headline-sm text-primary font-bold mb-md flex items-center gap-xs">
                <Icon name="contact_emergency" /> Emergency Contact
              </h2>

              {(emergencyContacts || []).map((c, i) => (
                <div key={c?.id ?? i} className={`bg-surface-container-low rounded-xl p-md border border-outline-variant ${i > 0 ? 'mt-sm' : 'mb-md'}`}>
                  {ecEditIndex === i ? (
                    <div className="space-y-sm">
                      <EcField label="Full Name" value={ecForm.name} onChange={v => setEcForm(f => ({ ...f, name: v }))} placeholder="e.g. Jane Doe" />
                      <div className="grid grid-cols-2 gap-sm">
                        <EcField label="Relationship" value={ecForm.relationship} onChange={v => setEcForm(f => ({ ...f, relationship: v }))} placeholder="e.g. Mother" />
                        <EcField label="Phone" value={ecForm.phone} onChange={v => setEcForm(f => ({ ...f, phone: v }))} placeholder="e.g. +91 9876543210" />
                      </div>
                      <div className="grid grid-cols-2 gap-sm">
                        <EcField label="Alternate Phone" value={ecForm.alternate_phone} onChange={v => setEcForm(f => ({ ...f, alternate_phone: v }))} placeholder="Optional" />
                        <EcField label="Email" value={ecForm.email} onChange={v => setEcForm(f => ({ ...f, email: v }))} placeholder="Optional" />
                      </div>
                      <EcField label="Address" value={ecForm.address} onChange={v => setEcForm(f => ({ ...f, address: v }))} placeholder="Optional" />
                      <EcField label="Note" value={ecForm.note} onChange={v => setEcForm(f => ({ ...f, note: v }))} placeholder="Optional" />
                      <div className="flex items-center gap-xs mt-xs">
                        <input type="checkbox" id={`ec-primary-${c.id}`} checked={ecForm.is_primary} onChange={e => setEcForm(f => ({ ...f, is_primary: e.target.checked }))} />
                        <label htmlFor={`ec-primary-${c.id}`} className="text-label-sm text-on-surface-variant">Set as primary contact</label>
                      </div>
                      <div className="flex gap-sm mt-sm">
                        <button type="button" onClick={() => handleEcUpdate(i)} disabled={saving} className="h-9 px-md bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-90 focus-visible:outline-2 focus-visible:outline-secondary disabled:opacity-50">Update</button>
                        <button type="button" onClick={cancelEcEdit} className="h-9 px-md border border-outline-variant rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container-high focus-visible:outline-2 focus-visible:outline-secondary">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-xs">
                          <span className="text-label-md font-bold text-primary">{c.name}</span>
                          {c.is_primary && (
                            <span className="pill bg-secondary-container text-secondary text-xs font-bold px-sm py-0.5 rounded-full">Primary</span>
                          )}
                        </div>
                        <div className="flex">
                          <button type="button" onClick={() => startEcEdit(i)} aria-label="Edit contact" className="min-w-[44px] min-h-[44px] flex items-center justify-center text-on-surface-variant hover:text-primary focus-visible:outline-2 focus-visible:outline-secondary rounded-lg"><Icon name="edit" /></button>
                          <button type="button" onClick={() => handleEcDelete(c.id)} aria-label="Delete contact" className="min-w-[44px] min-h-[44px] flex items-center justify-center text-on-surface-variant hover:text-error focus-visible:outline-2 focus-visible:outline-secondary rounded-lg"><Icon name="delete" /></button>
                        </div>
                      </div>
                      <p className="text-body-xs text-on-surface-variant mt-xs">{c.relationship} &middot; {c.phone}</p>
                    </div>
                  )}
                </div>
              ))}

              {ecNewForm ? (
                <div className="bg-surface-container-low rounded-xl p-md border border-outline-variant mb-md">
                  <div className="space-y-sm">
                    <EcField label="Full Name" value={ecForm.name} onChange={v => setEcForm(f => ({ ...f, name: v }))} placeholder="e.g. Jane Doe" />
                    <div className="grid grid-cols-2 gap-sm">
                      <EcField label="Relationship" value={ecForm.relationship} onChange={v => setEcForm(f => ({ ...f, relationship: v }))} placeholder="e.g. Mother" />
                      <EcField label="Phone" value={ecForm.phone} onChange={v => setEcForm(f => ({ ...f, phone: v }))} placeholder="e.g. +91 9876543210" />
                    </div>
                    <div className="grid grid-cols-2 gap-sm">
                      <EcField label="Alternate Phone" value={ecForm.alternate_phone} onChange={v => setEcForm(f => ({ ...f, alternate_phone: v }))} placeholder="Optional" />
                      <EcField label="Email" value={ecForm.email} onChange={v => setEcForm(f => ({ ...f, email: v }))} placeholder="Optional" />
                    </div>
                    <EcField label="Address" value={ecForm.address} onChange={v => setEcForm(f => ({ ...f, address: v }))} placeholder="Optional" />
                    <EcField label="Note" value={ecForm.note} onChange={v => setEcForm(f => ({ ...f, note: v }))} placeholder="Optional" />
                    <div className="flex items-center gap-xs mt-xs">
                      <input type="checkbox" id="ec-new-primary" checked={ecForm.is_primary} onChange={e => setEcForm(f => ({ ...f, is_primary: e.target.checked }))} />
                      <label htmlFor="ec-new-primary" className="text-label-sm text-on-surface-variant">Set as primary contact</label>
                    </div>
                    <div className="flex gap-sm mt-sm">
                      <button type="button" onClick={handleEcSubmit} disabled={saving} className="h-9 px-md bg-secondary text-on-secondary rounded-lg text-xs font-bold hover:opacity-90 focus-visible:outline-2 focus-visible:outline-secondary disabled:opacity-50">{saving ? 'Adding...' : 'Add Contact'}</button>
                      <button type="button" onClick={() => { setEcNewForm(false); resetEcForm(); }} className="h-9 px-md border border-outline-variant rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container-high focus-visible:outline-2 focus-visible:outline-secondary">Cancel</button>
                    </div>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => { setEcNewForm(true); setEcEditIndex(null); resetEcForm(); }} className="w-full h-11 border-2 border-dashed border-outline-variant rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-high focus-visible:outline-2 focus-visible:outline-secondary flex items-center justify-center gap-xs">
                  <Icon name="add" /> Add Emergency Contact
                </button>
              )}
            </section>

            <div className="flex justify-end gap-md">
              <button
                type="button"
                onClick={handleCancel}
                className="h-12 px-lg border border-outline-variant rounded-lg text-sm font-bold text-on-surface-variant hover:bg-surface-container-high focus-visible:outline-2 focus-visible:outline-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-12 px-xl bg-primary text-on-primary rounded-lg text-sm font-bold hover:opacity-90 focus-visible:outline-2 focus-visible:outline-secondary disabled:opacity-50 flex items-center gap-xs"
              >
                {saving ? (
                  <><div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" /> Saving...</>
                ) : (
                  <><Icon name="save" /> Save Changes</>
                )}
              </button>
            </div>
          </form>
        ) : (
          <>
            <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter mb-gutter">
              <h2 className="text-headline-sm text-primary font-bold mb-md flex items-center gap-xs">
                <Icon name="person" /> Personal Information
              </h2>
              <div className="grid md:grid-cols-2 gap-md text-body-md">
                <InfoRow label="Full Name" value={user?.name} />
                <InfoRow label="Email" value={user?.email} />
                <InfoRow label="Phone Number" value={user?.phone} />
                <InfoRow label="Student ID" value={user?.username} />
              </div>
            </section>

            <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter mb-gutter">
              <h2 className="text-headline-sm text-primary font-bold mb-md flex items-center gap-xs">
                <Icon name="school" /> Academic Information
              </h2>
              <div className="grid md:grid-cols-2 gap-md text-body-md">
                <InfoRow label="College / Institution" value={user?.college} />
                <InfoRow label="Branch / Department" value={user?.branch} />
                <InfoRow label="Roll Number" value={user?.roll_number} />
                <InfoRow label="Division" value={user?.division} />
                <InfoRow label="Year / Semester" value={user?.year} />
                <InfoRow label="Batch" value={user?.batch} />
              </div>
            </section>

            <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter mb-gutter">
              <h2 className="text-headline-sm text-primary font-bold mb-md flex items-center gap-xs">
                <Icon name="contact_emergency" /> Emergency Contact
              </h2>
              {(emergencyContacts || []).length === 0 ? (
                <p className="text-body-md text-on-surface-variant">No emergency contact added.</p>
              ) : (
                <div className="space-y-md">
                  {(emergencyContacts || []).map((c, i) => (
                    <div key={c?.id ?? i} className="bg-surface-container-low rounded-xl p-md border border-outline-variant">
                      <div className="flex items-start justify-between mb-xs">
                        <div className="flex items-center gap-xs">
                          <span className="text-headline-xs text-primary font-bold">{c.name}</span>
                          {c.is_primary && (
                            <span className="pill bg-secondary-container text-secondary text-xs font-bold px-sm py-0.5 rounded-full">Primary</span>
                          )}
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-x-md gap-y-xs text-body-sm">
                        <InfoRow label="Relationship" value={c.relationship} />
                        <InfoRow label="Phone" value={c.phone} />
                        <InfoRow label="Alternate Phone" value={c.alternate_phone} />
                        <InfoRow label="Email" value={c.email} />
                        {c.address && <div className="md:col-span-2"><InfoRow label="Address" value={c.address} /></div>}
                        {c.note && <div className="md:col-span-2"><InfoRow label="Note" value={c.note} /></div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </StudentLayout>
  );
}
