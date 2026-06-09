import { Link } from 'react-router-dom';
import Icon from '../../../components/Icon.jsx';

export default function Result() {
  return (
    <main className="min-h-screen bg-surface p-gutter flex items-center justify-center">
      <section className="max-w-3xl w-full bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter">
        <div className="text-center mb-lg"><Icon name="military_tech" className="text-secondary text-[64px]" fill /><h1 className="text-headline-lg text-primary font-bold">Result Summary</h1><p className="text-on-surface-variant">Advanced Cognitive Analytics</p></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-md">
          <Metric label="Score" value="88%" />
          <Metric label="Correct" value="35/40" />
          <Metric label="Integrity" value="100%" />
        </div>
        <Link to="/student/dashboard" className="w-full h-12 bg-primary text-on-primary rounded-lg flex items-center justify-center font-bold">Back to Dashboard</Link>
      </section>
    </main>
  );
}
function Metric({ label, value }) { return <div className="p-md bg-surface-container-low rounded-xl text-center"><p className="text-label-md text-on-surface-variant">{label}</p><p className="text-headline-lg text-primary font-bold">{value}</p></div>; }
