import { Link } from 'react-router-dom';
import StudentLayout from '../../../components/StudentLayout.jsx';
import PageFooter from '../../../components/PageFooter.jsx';
import Icon from '../../../components/Icon.jsx';

const stats = [
  { label: 'Completed Exams', value: '24', tag: '+2 this week', tagClass: 'bg-tertiary-fixed text-on-tertiary-container' },
  { label: 'Avg Score', value: '88%', tag: 'Top 5%', tagClass: 'bg-tertiary-fixed text-on-tertiary-container' },
  { label: 'Accuracy Rate', value: '94%', tag: 'Steady', tagClass: 'bg-secondary-fixed text-on-secondary-container' }
];

export default function StudentDashboard() {
  return (
    <StudentLayout title="Candidate Overview">
      <div className="p-gutter max-w-container-max mx-auto">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-lg">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm">
              <p className="text-label-md text-on-surface-variant mb-xs">{stat.label}</p>
              <div className="flex items-end gap-sm">
                <span className="text-display text-primary font-bold">{stat.value}</span>
                <span className={`${stat.tagClass} text-label-sm px-xs py-1 rounded mb-2`}>{stat.tag}</span>
              </div>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <section className="lg:col-span-4 bg-primary-container p-gutter rounded-xl text-on-primary-container relative overflow-hidden">
            <h3 className="text-headline-sm mb-md text-white font-bold">Intelligence Profile</h3>
            {[
              ['Logical Reasoning', 92],
              ['Quantitative Aptitude', 78],
              ['Verbal Ability', 85]
            ].map(([name, value]) => (
              <div key={name} className="mb-md">
                <div className="flex justify-between mb-xs">
                  <span className="text-label-md text-on-primary-fixed-variant">{name}</span>
                  <span className="text-label-md text-white">{value}%</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-secondary-container" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
            <div className="mt-lg p-sm bg-white/5 rounded-lg border border-white/10">
              <p className="text-label-sm italic">AI Insight: Your analytical speed is improving. Focus on quantitative accuracy.</p>
            </div>
          </section>

          <section className="lg:col-span-8 flex flex-col gap-gutter">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
              <div className="bg-primary px-gutter py-md flex justify-between items-center">
                <h3 className="text-headline-sm text-white font-bold">Today's Exams</h3>
                <span className="text-label-sm bg-secondary text-white px-md py-xs rounded-full">2 Pending</span>
              </div>
              <ExamRow icon="psychology" title="Advanced Cognitive Analytics" time="Starts: 10:30 AM • Duration: 90 Mins" active />
              <ExamRow icon="shield" title="Data Integrity & Ethics" time="Starts: 02:00 PM • Duration: 60 Mins" />
            </div>

            <div>
              <h3 className="text-headline-sm text-primary mb-md font-bold">Upcoming Exams</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                {['Neural Network Foundations', 'Quantum Computing Intro'].map((exam) => (
                  <Link to="/student/exams/instructions" key={exam} className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl hover:border-secondary transition-colors">
                    <div className="flex justify-between items-start mb-sm">
                      <span className="text-label-sm text-on-surface-variant">Nov 24, 2024</span>
                      <Icon name="event" className="text-primary" />
                    </div>
                    <h5 className="text-headline-sm text-primary font-bold">{exam}</h5>
                    <p className="text-label-md text-on-surface-variant mt-xs">Professor Julian Vance</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
      <PageFooter />
    </StudentLayout>
  );
}

function ExamRow({ icon, title, time, active }) {
  return (
    <div className="p-gutter flex flex-col md:flex-row justify-between items-center gap-md border-t border-outline-variant hover:bg-surface-container-low">
      <div className="flex items-center gap-md">
        <div className="w-12 h-12 bg-surface-container rounded-lg flex items-center justify-center text-primary">
          <Icon name={icon} />
        </div>
        <div>
          <h4 className="text-headline-sm text-primary font-bold">{title}</h4>
          <p className="text-label-md text-on-surface-variant">{time}</p>
        </div>
      </div>
      <Link to={active ? '/student/exams/security-check' : '#'} className={`w-full md:w-auto px-lg py-sm font-bold rounded-lg flex items-center justify-center gap-sm ${active ? 'bg-secondary text-primary shadow-md' : 'bg-surface-container-highest text-on-surface-variant cursor-not-allowed'}`}>
        <Icon name={active ? 'lock' : 'schedule'} /> {active ? 'Enter Secure Exam' : 'Available Soon'}
      </Link>
    </div>
  );
}
