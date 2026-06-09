import StudentLayout from '../../../components/StudentLayout.jsx';

export default function StudentPerformanceAnalytics() {
  return (
    <StudentLayout title="Performance Analytics">
      <div className="p-gutter max-w-container-max mx-auto grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <Card title="Average Score" value="88%" note="Top 5% this month" />
        <Card title="Accuracy" value="94%" note="Stable performance" />
        <Card title="Speed" value="82%" note="Improving weekly" />
        <section className="md:col-span-3 bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter">
          <h2 className="text-headline-sm text-primary font-bold mb-md">Subject Performance</h2>
          {['AI Fundamentals', 'Data Ethics', 'Quantitative Aptitude'].map((s, i) => <div key={s} className="mb-sm"><div className="flex justify-between text-label-md mb-xs"><span>{s}</span><b>{85 + i * 3}%</b></div><div className="h-3 bg-surface-container-high rounded-full"><div className="h-full bg-secondary rounded-full" style={{ width: `${85 + i * 3}%` }} /></div></div>)}
        </section>
      </div>
    </StudentLayout>
  );
}
function Card({ title, value, note }) { return <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md"><p className="text-label-md text-on-surface-variant">{title}</p><p className="text-display text-primary font-bold">{value}</p><p className="text-label-sm text-on-surface-variant">{note}</p></div>; }
