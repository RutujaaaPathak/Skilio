import TeacherShell, { Icon, StatCard } from '../../../components/TeacherShell.jsx'

export default function TeacherDashboard({ page, setPage }) {
  return <TeacherShell page={page} setPage={setPage} title="Teacher Dashboard">
    <section className="mb-lg"><span className="pill bg-secondary-fixed text-secondary">Academic Control Room</span><h1 className="text-4xl font-extrabold text-primary mt-sm">Good morning, Professor</h1><p className="text-on-surface-variant">Monitor exams, review suspicious activity, and manage assessments from one dashboard.</p></section>
    <div className="grid md:grid-cols-4 gap-gutter mb-lg"><StatCard label="Active Exams" value="—" icon="assignment"/><StatCard label="Students Online" value="—" icon="groups"/><StatCard label="Answers Pending" value="—" icon="fact_check"/><StatCard label="Risk Alerts" value="—" icon="warning"/></div>
    <div className="bento-grid">
      <section className="col-span-8 card overflow-hidden"><div className="p-md border-b border-outline-variant flex justify-between"><h2 className="text-xl font-bold text-primary">Today's Assessment Queue</h2><button onClick={()=>setPage('createExam')} className="btn-secondary px-md py-sm">Create Exam</button></div><div className="p-md text-center text-on-surface-variant py-xl">No exams scheduled yet.</div></section>
      <section className="col-span-4 p-md bg-primary-container text-white rounded-xl border border-outline-variant shadow-lg"><h2 className="text-xl font-bold mb-md">AI Integrity Summary</h2><p className="text-sm opacity-70">Integrity data will appear once exams are conducted.</p><button onClick={()=>setPage('alerts')} className="mt-md w-full py-sm bg-white/10 rounded-lg hover:bg-white/20">Open Alerts</button></section>
      <section className="col-span-12 card p-md"><h2 className="text-xl font-bold text-primary mb-md">Quick Actions</h2><div className="grid md:grid-cols-5 gap-sm">{[['Create Exam','add','createExam'],['Schedule','event','scheduling'],['Question Bank','database','questionBank'],['Reports','analytics','reports'],['Live Room','videocam','liveRoom']].map(([label,icon,target])=><button key={label} onClick={()=>setPage(target)} className="p-md border border-outline-variant rounded-xl hover:border-secondary-container hover:bg-secondary-container/10 text-left"><Icon className="text-primary">{icon}</Icon><p className="font-bold mt-sm">{label}</p></button>)}</div></section>
    </div>
  </TeacherShell>
}
