import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/Icon.jsx';

const questions = Array.from({ length: 40 }, (_, i) => i + 1);
const options = ['Supervised AI monitoring', 'Open-book collaboration', 'Unrestricted browser access', 'Manual attendance only'];

export default function ExamInterface() {
  const [current, setCurrent] = useState(1);
  const [selected, setSelected] = useState('');
  const time = useMemo(() => '01:42:15', []);

  return (
    <div className="bg-surface text-on-surface overflow-hidden min-h-screen">
      <div className="fixed top-0 left-0 w-full h-[4px] bg-outline-variant z-50"><div className="h-full bg-secondary-container" style={{ width: '35%' }} /></div>
      <header className="h-16 flex justify-between items-center px-gutter bg-surface border-b border-outline-variant z-40 relative">
        <div className="flex items-center gap-sm">
          <div className="flex items-center gap-xs px-base py-xs bg-tertiary-fixed rounded-full">
            <Icon name="fiber_manual_record" className="text-on-tertiary-fixed-variant text-[16px] animate-pulse" fill />
            <span className="text-label-sm text-on-tertiary-fixed-variant tracking-wider uppercase">EXAM RUNNING OFFLINE SECURELY</span>
          </div>
          <div className="h-6 w-px bg-outline-variant mx-xs" />
          <div className="flex flex-col"><span className="text-label-md font-bold">Skillo</span><span className="text-label-sm text-on-surface-variant">Session ID: ED-9921-X</span></div>
        </div>
        <div className="flex items-center gap-lg">
          <div className="flex flex-col items-center"><span className="text-label-sm text-on-surface-variant uppercase tracking-widest">Time Remaining</span><span className="text-headline-sm text-secondary font-bold">{time}</span></div>
          <div className="flex items-center gap-sm bg-surface-container-low px-md py-xs rounded-lg border border-outline-variant"><div className="flex flex-col items-end"><span className="text-label-md font-bold">Arjun Sharma</span><span className="text-label-sm text-on-surface-variant">ID: 202488192</span></div><div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary">AS</div></div>
        </div>
      </header>

      <main className="lockdown-layout">
        <aside className="bg-surface-container-low p-md border-r border-outline-variant flex flex-col gap-md overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-center"><h2 className="text-headline-sm font-bold">Questions</h2><span className="px-sm py-xs bg-surface-container-highest rounded text-label-sm">12 / 40</span></div>
          <div className="grid grid-cols-4 gap-sm">
            {questions.map((q) => <button key={q} onClick={() => setCurrent(q)} className={`aspect-square rounded-lg font-bold text-label-md ${q === current ? 'bg-primary text-on-primary' : q < current ? 'bg-tertiary-fixed text-on-tertiary-container' : 'bg-surface-container-highest text-on-surface-variant'}`}>{String(q).padStart(2, '0')}</button>)}
          </div>
        </aside>

        <section className="p-gutter overflow-y-auto custom-scrollbar">
          <div className="max-w-4xl mx-auto bg-surface-container-lowest rounded-2xl border border-outline-variant p-gutter">
            <div className="flex justify-between items-center mb-md"><span className="text-label-md text-on-surface-variant">Question {current} of 40</span><span className="px-sm py-xs rounded bg-secondary-fixed text-on-secondary-container text-label-sm">Multiple Choice</span></div>
            <h1 className="text-headline-md text-primary font-bold mb-md">Which feature ensures the exam remains secure even without an active internet connection?</h1>
            <div className="space-y-sm">
              {options.map((opt) => <button key={opt} onClick={() => setSelected(opt)} className={`w-full text-left p-md rounded-xl border transition-colors ${selected === opt ? 'border-secondary bg-secondary-fixed/40' : 'border-outline-variant bg-surface hover:border-secondary hover:bg-orange-50'}`}>{opt}</button>)}
            </div>
            <div className="flex justify-between mt-lg"><button onClick={() => setCurrent(Math.max(1, current - 1))} className="px-lg py-sm border border-outline-variant rounded-lg font-bold">Previous</button><button onClick={() => setCurrent(Math.min(40, current + 1))} className="px-lg py-sm bg-primary text-on-primary rounded-lg font-bold">Save & Next</button></div>
          </div>
        </section>

        <aside className="bg-surface-container-low p-md border-l border-outline-variant hidden lg:flex flex-col gap-md">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md"><h3 className="text-headline-sm text-primary font-bold mb-sm">Proctor Status</h3><Status label="Face visible" ok /><Status label="Audio normal" ok /><Status label="Tab locked" ok /><Status label="Network optional" ok /></div>
          <Link to="/student/exams/submission" className="mt-auto h-12 bg-error text-on-error rounded-lg flex items-center justify-center font-bold gap-xs">Submit Exam <Icon name="send" /></Link>
        </aside>
      </main>
    </div>
  );
}

function Status({ label, ok }) {
  return <div className="flex items-center justify-between py-xs"><span className="text-label-md text-on-surface-variant">{label}</span><Icon name={ok ? 'check_circle' : 'warning'} className={ok ? 'text-on-tertiary-container' : 'text-error'} fill /></div>;
}
