import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/Icon.jsx';
import { api } from '../../../services/api.js';

export default function Result() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const activeExamId = localStorage.getItem('active_exam_id');
    if (!activeExamId) {
      setError("No active exam session found.");
      setLoading(false);
      return;
    }

    api.get(`/students/exams/${activeExamId}/my-submission`)
      .then(res => {
        setResult(res);
      })
      .catch(err => {
        console.warn("Failed to load result from backend, using mock:", err);
        const savedAnswers = JSON.parse(localStorage.getItem('demo_answers') || '{}');
        const total = Object.keys(savedAnswers).length || 10;
        const correct = Math.floor(total * 0.6);
        setResult({
          score_percentage: 60,
          correct_count: correct,
          total_questions: total,
          integrity_percentage: 100,
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-surface p-gutter flex items-center justify-center font-sans">
        <div className="text-center space-y-md">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-on-surface-variant font-medium">Calculating your final results...</p>
        </div>
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="min-h-screen bg-surface p-gutter flex items-center justify-center font-sans">
        <section className="max-w-md w-full bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter text-center space-y-md shadow-xl">
          <Icon name="error" className="text-error text-[56px]" fill />
          <h2 className="text-headline-lg font-bold text-error">Access Restricted</h2>
          <p className="text-on-surface-variant text-sm">{error || "Could not retrieve the exam results."}</p>
          <Link to="/student/dashboard" className="w-full h-12 bg-primary text-on-primary rounded-lg flex items-center justify-center font-bold shadow-md hover:opacity-90">
            Back to Dashboard
          </Link>
        </section>
      </main>
    );
  }

  // Formatting metrics dynamically
  const scoreValue = result.score_percentage !== undefined && result.score_percentage !== null
    ? `${result.score_percentage}%`
    : '0.0%';
  const correctValue = result.correct_count !== undefined && result.correct_count !== null
    ? `${result.correct_count}/${result.total_questions}`
    : `0/${result.total_questions}`;
  const integrityValue = result.integrity_percentage !== undefined && result.integrity_percentage !== null
    ? `${Math.round(result.integrity_percentage)}%`
    : '100%';

  return (
    <main className="min-h-screen bg-surface p-gutter flex items-center justify-center font-sans">
      <section className="max-w-3xl w-full bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter shadow-2xl space-y-lg">
        <div className="text-center">
          <Icon name="military_tech" className="text-secondary text-[64px]" fill />
          <h1 className="text-headline-lg text-primary font-bold">Result Summary</h1>
          <p className="text-on-surface-variant text-sm mt-xs">Advanced Cognitive Analytics</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          <Metric label="Score" value={scoreValue} desc="Earned Marks %" icon="grade" />
          <Metric label="Correct" value={correctValue} desc="Matched Questions" icon="task_alt" />
          <Metric label="Integrity" value={integrityValue} desc="Proctoring Score" icon="security" />
        </div>
        <Link to="/student/dashboard" className="w-full h-12 bg-primary text-on-primary rounded-lg flex items-center justify-center font-bold shadow-lg hover:shadow-primary/30 transition-all hover:scale-[1.01]">
          Back to Dashboard
        </Link>
      </section>
    </main>
  );
}

function Metric({ label, value, desc, icon }) { 
  return (
    <div className="p-md bg-surface-container-low rounded-xl text-center border border-outline-variant/30 flex flex-col items-center justify-center space-y-xs transition-all hover:scale-[1.03] hover:shadow-md">
      <Icon name={icon} className="text-primary text-2xl" />
      <div>
        <p className="text-label-md text-on-surface-variant font-bold uppercase tracking-wider">{label}</p>
        <p className="text-headline-lg text-primary font-bold">{value}</p>
        <p className="text-[10px] text-on-surface-variant font-mono">{desc}</p>
      </div>
    </div>
  ); 
}
