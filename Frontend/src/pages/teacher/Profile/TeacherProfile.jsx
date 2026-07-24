import { useState, useRef } from 'react';
import TeacherShell, { Icon } from '../../../components/TeacherShell.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { authService } from '../../../services/authService.js';

function parseJsonArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function TeacherProfile({ page, setPage }) {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    alternate_contact: user?.alternate_contact || '',
    department: user?.department || '',
    designation: user?.designation || '',
    specialization: user?.specialization || '',
    subjects: user?.subjects || '',
    institution_address: user?.institution_address || '',
    qualifications: parseJsonArray(user?.qualifications),
    experience: parseJsonArray(user?.experience),
    bio: user?.bio || '',
    languages: user?.languages || '',
    college: user?.college || '',
  });

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function addListItem(field, template) {
    setForm((f) => ({ ...f, [field]: [...(f[field] || []), { ...template }] }));
  }

  function removeListItem(field, index) {
    setForm((f) => ({ ...f, [field]: (f[field] || []).filter((_, i) => i !== index) }));
  }

  function updateListItem(field, index, key, value) {
    setForm((f) => {
      const items = [...(f[field] || [])];
      items[index] = { ...items[index], [key]: value };
      return { ...f, [field]: items };
    });
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPG, PNG, and WebP images are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }
    setUploading(true);
    setError('');
    setSuccess('');
    try {
      const result = await authService.uploadPhoto(file);
      updateUser(result.user);
      setPhotoPreview(null);
      setSuccess('Profile photo updated.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemovePhoto() {
    setUploading(true);
    setError('');
    try {
      const result = await authService.removePhoto();
      updateUser(result.user);
      setSuccess('Profile photo removed.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to remove photo.');
    } finally {
      setUploading(false);
    }
  }

  function handlePhotoClick() {
    fileInputRef.current?.click();
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const payload = {};
      for (const [key, value] of Object.entries(form)) {
        const serialized = Array.isArray(value) ? (value.length > 0 ? JSON.stringify(value) : null) : value;
        if (serialized !== user[key]) {
          payload[key] = serialized || null;
        }
      }
      if (Object.keys(payload).length === 0) {
        setEditing(false);
        return;
      }
      const result = await authService.updateProfile(payload);
      updateUser(result.user);
      setSuccess('Profile updated successfully.');
      setTimeout(() => setSuccess(''), 3000);
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      alternate_contact: user?.alternate_contact || '',
      department: user?.department || '',
      designation: user?.designation || '',
      specialization: user?.specialization || '',
      subjects: user?.subjects || '',
      institution_address: user?.institution_address || '',
      qualifications: parseJsonArray(user?.qualifications),
      experience: parseJsonArray(user?.experience),
      bio: user?.bio || '',
      languages: user?.languages || '',
      college: user?.college || '',
    });
    setError('');
    setEditing(false);
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'TE';

  const photoSrc = photoPreview || user?.profile_photo_url;

  return (
    <TeacherShell page={page} setPage={setPage} title="My Profile">
      <div className="max-w-3xl">
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

        <section className="card p-lg mb-lg">
          <div className="flex items-start gap-lg flex-wrap">
            <div className="shrink-0 relative group">
              {uploading ? (
                <div className="w-24 h-24 rounded-full bg-surface-container-low flex items-center justify-center border border-outline-variant">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : photoSrc ? (
                <img src={photoSrc} alt="Profile" className="w-24 h-24 rounded-full object-cover border border-outline-variant" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary-container text-white grid place-items-center text-headline-lg font-bold border border-outline-variant">
                  {initials}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-xs cursor-pointer" onClick={handlePhotoClick}>
                <Icon className="text-white text-sm">camera_alt</Icon>
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoUpload} />
              {photoSrc && !uploading && (
                <button onClick={handleRemovePhoto} className="absolute -top-1 -right-1 w-6 h-6 bg-error text-on-error rounded-full flex items-center justify-center text-xs hover:opacity-90" title="Remove photo">
                  <Icon>close</Icon>
                </button>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-headline-md text-primary font-bold">{user?.name}</h2>
              <p className="text-body-md text-on-surface-variant">{user?.designation || 'No designation set'}</p>
              <p className="text-body-sm text-on-surface-variant mt-xs">{user?.email}</p>
              <div className="flex gap-sm mt-sm flex-wrap">
                <span className="pill bg-secondary-container text-secondary capitalize">{user?.role}</span>
                {user?.is_verified && <span className="pill bg-tertiary-fixed text-on-tertiary-fixed">Verified</span>}
                {user?.department && <span className="pill bg-surface-container-high text-on-surface-variant">{user.department}</span>}
              </div>
            </div>
            <button onClick={() => setEditing(!editing)} className="btn-secondary px-md py-sm flex items-center gap-xs shrink-0">
              <Icon>{editing ? 'close' : 'edit'}</Icon>
              {editing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
        </section>

        {editing ? (
          <form onSubmit={handleSave}>
            <section className="card p-lg mb-lg">
              <h3 className="text-label-lg font-bold text-primary mb-md flex items-center gap-xs">
                <Icon>person</Icon> Personal Information
              </h3>
              <div className="grid md:grid-cols-2 gap-md">
                <Field label="Full Name" value={form.name} onChange={(v) => handleChange('name', v)} />
                <Field label="Email" value={form.email} onChange={(v) => handleChange('email', v)} type="email" />
                <Field label="Phone" value={form.phone} onChange={(v) => handleChange('phone', v)} />
                <Field label="Alternate Contact" value={form.alternate_contact} onChange={(v) => handleChange('alternate_contact', v)} />
              </div>
            </section>

            <section className="card p-lg mb-lg">
              <h3 className="text-label-lg font-bold text-primary mb-md flex items-center gap-xs">
                <Icon>business</Icon> Institution & Department
              </h3>
              <div className="grid md:grid-cols-2 gap-md">
                <Field label="College / Institution" value={form.college} onChange={(v) => handleChange('college', v)} />
                <Field label="Department" value={form.department} onChange={(v) => handleChange('department', v)} />
                <Field label="Designation" value={form.designation} onChange={(v) => handleChange('designation', v)} />
                <Field label="Specialization" value={form.specialization} onChange={(v) => handleChange('specialization', v)} />
                <div className="md:col-span-2">
                  <Field label="Institution Address" value={form.institution_address} onChange={(v) => handleChange('institution_address', v)} isTextarea />
                </div>
              </div>
            </section>

            <section className="card p-lg mb-lg">
              <h3 className="text-label-lg font-bold text-primary mb-md flex items-center gap-xs">
                <Icon>school</Icon> Qualifications
              </h3>
              <div className="space-y-md">
                {(form.qualifications || []).map((q, i) => (
                  <div key={i} className="bg-surface-container-low rounded-lg p-md relative">
                    <button type="button" onClick={() => removeListItem('qualifications', i)} className="absolute top-2 right-2 w-6 h-6 bg-error text-on-error rounded-full flex items-center justify-center text-xs hover:opacity-90">
                      <Icon>close</Icon>
                    </button>
                    <div className="grid md:grid-cols-2 gap-sm">
                      <Field label="Degree" value={q.degree || ''} onChange={(v) => updateListItem('qualifications', i, 'degree', v)} />
                      <Field label="Institution" value={q.institution || ''} onChange={(v) => updateListItem('qualifications', i, 'institution', v)} />
                      <Field label="Year" value={q.year || ''} onChange={(v) => updateListItem('qualifications', i, 'year', v)} />
                      <Field label="Specialization" value={q.specialization || ''} onChange={(v) => updateListItem('qualifications', i, 'specialization', v)} />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => addListItem('qualifications', { degree: '', institution: '', year: '', specialization: '' })} className="w-full h-10 border-2 border-dashed border-outline-variant rounded-lg text-label-md text-on-surface-variant hover:border-secondary-container hover:text-secondary flex items-center justify-center gap-xs">
                  <Icon>add</Icon> Add Qualification
                </button>
              </div>
            </section>

            <section className="card p-lg mb-lg">
              <h3 className="text-label-lg font-bold text-primary mb-md flex items-center gap-xs">
                <Icon>work</Icon> Experience
              </h3>
              <div className="space-y-md">
                {(form.experience || []).map((e, i) => (
                  <div key={i} className="bg-surface-container-low rounded-lg p-md relative">
                    <button type="button" onClick={() => removeListItem('experience', i)} className="absolute top-2 right-2 w-6 h-6 bg-error text-on-error rounded-full flex items-center justify-center text-xs hover:opacity-90">
                      <Icon>close</Icon>
                    </button>
                    <div className="grid md:grid-cols-2 gap-sm">
                      <Field label="Company / Organization" value={e.company || ''} onChange={(v) => updateListItem('experience', i, 'company', v)} />
                      <Field label="Role / Position" value={e.role || ''} onChange={(v) => updateListItem('experience', i, 'role', v)} />
                      <Field label="Start Date" value={e.start_date || ''} onChange={(v) => updateListItem('experience', i, 'start_date', v)} />
                      <Field label="End Date" value={e.end_date || ''} onChange={(v) => updateListItem('experience', i, 'end_date', v)} />
                      <div className="md:col-span-2">
                        <Field label="Description" value={e.description || ''} onChange={(v) => updateListItem('experience', i, 'description', v)} isTextarea rows={2} />
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => addListItem('experience', { company: '', role: '', start_date: '', end_date: '', description: '' })} className="w-full h-10 border-2 border-dashed border-outline-variant rounded-lg text-label-md text-on-surface-variant hover:border-secondary-container hover:text-secondary flex items-center justify-center gap-xs">
                  <Icon>add</Icon> Add Experience
                </button>
              </div>
            </section>

            <section className="card p-lg mb-lg">
              <h3 className="text-label-lg font-bold text-primary mb-md flex items-center gap-xs">
                <Icon>category</Icon> Subjects & Languages
              </h3>
              <div className="grid md:grid-cols-2 gap-md">
                <Field label="Subjects (comma-separated)" value={form.subjects} onChange={(v) => handleChange('subjects', v)} />
                <Field label="Languages (comma-separated)" value={form.languages} onChange={(v) => handleChange('languages', v)} />
              </div>
            </section>

            <section className="card p-lg mb-lg">
              <h3 className="text-label-lg font-bold text-primary mb-md flex items-center gap-xs">
                <Icon>info</Icon> About
              </h3>
              <Field label="Bio" value={form.bio} onChange={(v) => handleChange('bio', v)} isTextarea rows={4} />
            </section>

            <div className="flex gap-sm">
              <button type="submit" disabled={saving} className="btn-primary px-lg py-sm flex items-center gap-xs">
                {saving ? <><div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" /> Saving...</> : <><Icon>save</Icon> Save Changes</>}
              </button>
              <button type="button" onClick={handleCancel} className="btn-secondary px-lg py-sm">Cancel</button>
            </div>
          </form>
        ) : (
          <>
            <section className="card p-lg mb-lg">
              <h3 className="text-label-lg font-bold text-primary mb-md flex items-center gap-xs">
                <Icon>person</Icon> Personal Information
              </h3>
              <div className="grid md:grid-cols-2 gap-md text-body-md">
                <InfoRow label="Full Name" value={user?.name} />
                <InfoRow label="Email" value={user?.email} />
                <InfoRow label="Phone" value={user?.phone} />
                <InfoRow label="Alternate Contact" value={user?.alternate_contact} />
              </div>
            </section>

            <section className="card p-lg mb-lg">
              <h3 className="text-label-lg font-bold text-primary mb-md flex items-center gap-xs">
                <Icon>business</Icon> Institution & Department
              </h3>
              <div className="grid md:grid-cols-2 gap-md text-body-md">
                <InfoRow label="College / Institution" value={user?.college} />
                <InfoRow label="Department" value={user?.department} />
                <InfoRow label="Designation" value={user?.designation} />
                <InfoRow label="Specialization" value={user?.specialization} />
                <div className="md:col-span-2">
                  <InfoRow label="Institution Address" value={user?.institution_address} />
                </div>
              </div>
            </section>

            <section className="card p-lg mb-lg">
              <h3 className="text-label-lg font-bold text-primary mb-md flex items-center gap-xs">
                <Icon>school</Icon> Qualifications
              </h3>
              {renderQualificationList(user?.qualifications)}

              {user?.subjects || user?.languages ? (
                <div className="grid md:grid-cols-2 gap-md mt-md pt-md border-t border-outline-variant">
                  <InfoRow label="Subjects" value={user?.subjects} />
                  <InfoRow label="Languages" value={user?.languages} />
                </div>
              ) : null}
            </section>

            <section className="card p-lg mb-lg">
              <h3 className="text-label-lg font-bold text-primary mb-md flex items-center gap-xs">
                <Icon>work</Icon> Experience
              </h3>
              {renderExperienceList(user?.experience)}
            </section>

            {user?.bio && (
              <section className="card p-lg mb-lg">
                <h3 className="text-label-lg font-bold text-primary mb-md flex items-center gap-xs">
                  <Icon>info</Icon> About
                </h3>
                <p className="text-body-md text-on-surface-variant whitespace-pre-wrap">{user.bio}</p>
              </section>
            )}
          </>
        )}
      </div>
    </TeacherShell>
  );
}

function renderQualificationList(value) {
  const items = parseJsonArray(value);
  if (items.length === 0) return <p className="text-body-md text-on-surface-variant">No qualifications added.</p>;
  return (
    <div className="space-y-md">
      {items.map((q, i) => (
        <div key={i} className="flex gap-md pb-md border-b border-outline-variant last:border-0">
          <div className="w-10 h-10 rounded-full bg-secondary-container text-secondary flex items-center justify-center shrink-0 font-bold">
            <Icon>school</Icon>
          </div>
          <div>
            <p className="text-body-md font-bold text-on-surface">{q.degree || 'Qualification'}</p>
            <p className="text-body-sm text-on-surface-variant">{[q.institution, q.specialization].filter(Boolean).join(' — ')}</p>
            {q.year && <p className="text-label-sm text-secondary font-bold mt-xs">{q.year}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderExperienceList(value) {
  const items = parseJsonArray(value);
  if (items.length === 0) return <p className="text-body-md text-on-surface-variant">No experience added.</p>;
  return (
    <div className="space-y-md">
      {items.map((e, i) => (
        <div key={i} className="flex gap-md pb-md border-b border-outline-variant last:border-0">
          <div className="w-10 h-10 rounded-full bg-primary-container text-primary flex items-center justify-center shrink-0 font-bold">
            <Icon>work</Icon>
          </div>
          <div>
            <p className="text-body-md font-bold text-on-surface">{e.role || 'Position'}</p>
            <p className="text-body-sm text-on-surface-variant">{e.company}</p>
            {(e.start_date || e.end_date) && (
              <p className="text-label-sm text-on-surface-variant mt-xs">{[e.start_date, e.end_date].filter(Boolean).join(' — ')}</p>
            )}
            {e.description && <p className="text-body-sm text-on-surface-variant mt-xs whitespace-pre-wrap">{e.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', isTextarea = false, rows = 2 }) {
  return (
    <div className="space-y-xs">
      <label className="text-label-sm font-bold text-on-surface-variant">{label}</label>
      {isTextarea ? (
        <textarea
          className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg focus-ring text-body-md resize-none"
          rows={rows}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="w-full h-11 px-4 bg-surface-container-low border border-outline-variant rounded-lg focus-ring text-body-md"
          type={type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function InfoRow({ label, value, isText = false }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-label-sm text-on-surface-variant font-bold">{label}</p>
      <p className={`text-body-md text-on-surface ${isText ? 'whitespace-pre-wrap' : ''}`}>{value}</p>
    </div>
  );
}