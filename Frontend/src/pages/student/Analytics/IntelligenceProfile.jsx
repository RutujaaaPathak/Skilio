import StudentLayout from '../../../components/StudentLayout.jsx';

export default function IntelligenceProfile() {
  const skills = [['Logical Reasoning', 92], ['Quantitative Aptitude', 78], ['Verbal Ability', 85], ['Problem Solving Speed', 89]];
  return (
    <StudentLayout title="Intelligence Profile">
      <div className="p-gutter max-w-4xl mx-auto">
        <section className="bg-primary-container text-white rounded-2xl p-gutter">
          <h1 className="text-headline-lg font-bold mb-md">AI Intelligence Profile</h1>
          {skills.map(([name, value]) => <div key={name} className="mb-md"><div className="flex justify-between mb-xs"><span>{name}</span><b>{value}%</b></div><div className="h-3 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-secondary-container" style={{ width: `${value}%` }} /></div></div>)}
        </section>
      </div>
    </StudentLayout>
  );
}
