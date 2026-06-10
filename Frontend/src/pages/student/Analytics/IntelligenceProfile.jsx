import StudentLayout from '../../../components/StudentLayout.jsx';

export default function IntelligenceProfile() {
  return (
    <StudentLayout title="Intelligence Profile">
      <div className="p-gutter max-w-4xl mx-auto">
        <section className="bg-primary-container text-white rounded-2xl p-gutter">
          <h1 className="text-headline-lg font-bold mb-md">AI Intelligence Profile</h1>
          <p className="text-sm opacity-80">Complete exams to generate your personalized intelligence profile.</p>
          {['Logical Reasoning', 'Quantitative Aptitude', 'Verbal Ability', 'Problem Solving Speed'].map((name) => (
            <div key={name} className="mb-md">
              <div className="flex justify-between mb-xs"><span>{name}</span><b>—%</b></div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden"><div className="h-full w-0 bg-secondary-container" /></div>
            </div>
          ))}
        </section>
      </div>
    </StudentLayout>
  );
}
