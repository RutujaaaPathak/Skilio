import { useState } from 'react';
import StudentLayout from '../../../components/StudentLayout.jsx';

function Toggle({ label, checked: def = false }) {
  const [checked, setChecked] = useState(def);
  return (
    <label className="flex items-center justify-between p-md bg-surface-container-low rounded-xl cursor-pointer">
      <span className="font-bold text-on-surface">{label}</span>
      <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="w-5 h-5 text-secondary" />
    </label>
  );
}

export default function Settings() {
  return (
    <StudentLayout title="Settings">
      <div className="p-gutter max-w-3xl mx-auto">
        <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter">
          <h1 className="text-headline-lg text-primary font-bold mb-md">Student Settings</h1>
          <div className="space-y-md">
            <Toggle label="Email notifications" checked />
            <Toggle label="SMS exam reminders" />
            <Toggle label="Biometric quick verification" checked />
          </div>
        </section>
      </div>
    </StudentLayout>
  );
}
