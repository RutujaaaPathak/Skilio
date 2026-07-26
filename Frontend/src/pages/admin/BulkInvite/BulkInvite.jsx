import { useState, useRef } from 'react';
import Icon from '../../../components/Icon.jsx';
import { authService } from '../../../services/authService.js';

export default function BulkInvite() {
  const [file, setFile] = useState(null);
  const [role, setRole] = useState('student');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError('');
    setResult(null);
    try {
      const data = await authService.adminBulkInvite(file, role);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-gutter max-w-3xl mx-auto">
      <div className="mb-lg">
        <h1 className="text-headline-lg text-primary font-bold">Bulk Invite</h1>
        <p className="text-on-surface-variant">Upload a CSV file to create multiple user accounts at once.</p>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter space-y-md">
        <div>
          <label className="block text-label-sm font-bold text-on-surface-variant mb-xs">CSV Format</label>
          <pre className="bg-surface-container-high p-md rounded-lg text-label-sm text-on-surface-variant overflow-x-auto">
name,email,role,college,branch,division,year,batch{'\n'}
John Doe,john@example.com,student,MIT,CS,A,2,2024-2028{'\n'}
Jane Smith,jane@example.com,teacher,Harvard,Physics,B,,
          </pre>
          <p className="text-label-sm text-on-surface-variant mt-xs">Only <strong>name</strong> and <strong>email</strong> are required. Other columns are optional.</p>
        </div>

        <div>
          <label className="block text-label-sm font-bold text-on-surface-variant mb-xs">Target Role</label>
          <select value={role} onChange={e => setRole(e.target.value)} className="h-10 px-md rounded-lg border border-outline-variant bg-surface text-body-md">
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
        </div>

        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-outline-variant rounded-xl p-xl text-center cursor-pointer hover:bg-surface-container-low"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => setFile(e.target.files?.[0] || null)}
          />
          <Icon name="upload_file" className="text-3xl text-on-surface-variant mb-sm" />
          <p className="text-label-md font-bold text-on-surface-variant">
            {file ? file.name : 'Click to select CSV file'}
          </p>
          {file && <p className="text-label-sm text-on-surface-variant mt-xs">{(file.size / 1024).toFixed(1)} KB</p>}
        </div>

        {error && (
          <div className="rounded-lg bg-error-container p-sm text-label-md text-error font-bold flex items-center gap-xs">
            <Icon name="error" /> {error}
          </div>
        )}

        {result && (
          <div className={`rounded-lg p-sm text-label-md font-bold flex items-center gap-xs ${result.failed > 0 ? 'bg-error-container text-error' : 'bg-tertiary-container text-tertiary'}`}>
            <Icon name={result.failed > 0 ? 'warning' : 'check_circle'} />
            Imported: {result.imported} | Failed: {result.failed}
            {result.errors?.length > 0 && (
              <div className="mt-xs text-label-sm">{result.errors.map((e, i) => <div key={i}>Row {e.row}: {e.email} - {e.error}</div>)}</div>
            )}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full h-12 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-xs"
        >
          {uploading ? 'Uploading...' : <><Icon name="upload" /> Import Users</>}
        </button>
      </div>
    </div>
  );
}
