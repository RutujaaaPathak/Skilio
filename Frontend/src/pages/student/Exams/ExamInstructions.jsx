import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '../../../components/StudentLayout.jsx';
import Icon from '../../../components/Icon.jsx';
import { api } from '../../../services/api.js';

export default function ExamInstructions() {
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);

  const rules = [
    'Keep your webcam and microphone enabled.',
    'Do not switch tabs or leave the secure window.',
    'No phones, books, notes, or extra devices allowed.',
    'Submit before the timer ends.'
  ];

  useEffect(() => {
    const activeExamId = localStorage.getItem('active_exam_id');
    if (!activeExamId) {
      setLoading(false);
      return;
    }

    api.get(`/exams/${activeExamId}`)
      .then(res => {
        setExam(res);
      })
      .catch(err => {
        console.error("Failed to load exam instructions:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleProceed = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen()
        .then(() => {
          navigate('/student/exams/security-check');
        })
        .catch((err) => {
          console.error("Fullscreen request failed, navigating anyway:", err);
          navigate('/student/exams/security-check');
        });
    } else {
      navigate('/student/exams/security-check');
    }
  };

  if (loading) {
    return (
      <StudentLayout title="Exam Instructions">
        <div className="text-center py-xl text-on-surface-variant animate-pulse">Loading exam instructions...</div>
      </StudentLayout>
    );
  }

  const title = exam ? exam.title : "Advanced Cognitive Analytics";
  const duration = exam ? exam.duration_minutes : 90;
  const totalMarks = exam ? exam.total_marks : 100;

  return (
    <StudentLayout title="Exam Instructions">
      <div className="p-gutter max-w-4xl mx-auto font-sans">
        <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter shadow-xl">
          <div className="flex items-center gap-md mb-md">
            <div className="w-14 h-14 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-md"><Icon name="menu_book" /></div>
            <div>
              <h1 className="text-headline-lg text-primary font-bold">{title}</h1>
              <p className="text-on-surface-variant font-mono">Duration: {duration} minutes • Marks: {totalMarks} • Secure offline mode</p>
            </div>
          </div>
          <div className="space-y-sm">
            {rules.map((rule) => (
              <div key={rule} className="flex items-start gap-sm p-sm bg-surface-container-low rounded-lg transition-transform hover:translate-x-1 duration-200">
                <Icon name="check_circle" className="text-on-tertiary-container" fill />
                <p className="text-on-surface">{rule}</p>
              </div>
            ))}
          </div>
          <button 
            onClick={handleProceed} 
            className="w-full mt-gutter h-12 bg-primary text-on-primary rounded-lg flex items-center justify-center gap-xs font-bold hover:opacity-90 cursor-pointer shadow-lg hover:shadow-primary/30 transition-all hover:scale-[1.01]"
          >
            Proceed to Security Check <Icon name="arrow_forward" />
          </button>
        </section>
      </div>
    </StudentLayout>
  );
}
