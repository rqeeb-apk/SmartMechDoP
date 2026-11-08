import React, { useState } from 'react';
import { getStoredQuizzes } from '../../services/storage';
import { QuizTest, QuizQuestion } from '../../types';
import { Award, Clock, CheckCircle2, AlertCircle, Sparkles, Download } from 'lucide-react';
import confetti from 'canvas-confetti';

export const QuizCenterPage: React.FC = () => {
  const quizzes = getStoredQuizzes();
  const [activeQuiz, setActiveQuiz] = useState<QuizTest | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const handleStartQuiz = (q: QuizTest) => {
    setActiveQuiz(q);
    setUserAnswers({});
    setFinalScore(null);
  };

  const handleSubmitAnswers = () => {
    if (!activeQuiz) return;
    let correct = 0;
    activeQuiz.questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctIndex) correct++;
    });

    const percent = Math.round((correct / activeQuiz.questions.length) * 100);
    setFinalScore(percent);

    if (percent >= 75) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div className="bg-[#0D1B2A] border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">مركز الاختبارات والتقييم الهندسي</h1>
            <p className="text-xs text-slate-400">اختبارات تفاعلية بتصحيح تلقائي وإصدار شهادات التفوق</p>
          </div>
        </div>
      </div>

      {/* Quiz List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quizzes.map((quiz) => (
          <div
            key={quiz.id}
            className="bg-[#0D1B2A] border border-slate-800 hover:border-rose-500/40 rounded-2xl p-6 space-y-4 transition-all hover:shadow-xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/30">
                {quiz.category}
              </span>
              <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                <Clock className="w-3.5 h-3.5" />
                <span>{quiz.timeMinutes} دقائق</span>
              </div>
            </div>

            <h3 className="text-lg font-bold text-white leading-snug">{quiz.title}</h3>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800">
              <span>عدد الأسئلة: {quiz.questionsCount} سؤال</span>

              <button
                onClick={() => handleStartQuiz(quiz)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold text-xs hover:shadow-lg hover:shadow-rose-500/30 transition-all"
              >
                بدء الاختبار الآن
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Active Quiz Modal */}
      {activeQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#0D1B2A] border border-cyan-500/30 w-full max-w-2xl rounded-2xl p-6 sm:p-8 space-y-6 text-slate-100 my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-6 h-6 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">{activeQuiz.title}</h3>
              </div>
              <button onClick={() => setActiveQuiz(null)} className="text-slate-400 hover:text-white">✕ إغلاق</button>
            </div>

            <div className="space-y-6 max-h-96 overflow-y-auto no-scrollbar pr-1">
              {activeQuiz.questions.map((q, qIdx) => (
                <div key={qIdx} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <h4 className="text-sm font-bold text-white">{qIdx + 1}. {q.question}</h4>

                  <div className="space-y-2">
                    {q.options.map((opt, oIdx) => {
                      const isSelected = userAnswers[qIdx] === oIdx;
                      return (
                        <button
                          key={oIdx}
                          onClick={() => setUserAnswers({ ...userAnswers, [qIdx]: oIdx })}
                          className={`w-full text-right px-3.5 py-2.5 rounded-xl text-xs font-medium border transition-colors ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                              : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {finalScore !== null && (
                    <div className="p-2.5 rounded-lg bg-slate-800 text-[11px] text-slate-300 border border-slate-700">
                      💡 الشرح: {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {finalScore !== null ? (
              <div className="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-center space-y-3">
                <div className="text-2xl font-extrabold text-cyan-300 font-mono">النتيجة: {finalScore}%</div>
                <p className="text-xs text-slate-300">
                  {finalScore >= 75
                    ? 'ممتاز جداً! لقد نجحت في إثبات الجدارة الهندسية في الاختبار.'
                    : 'حاول مراجعة محتوى الدروس بالمكتبة ثم أعد الاختبار.'}
                </p>

                {finalScore >= 75 && (
                  <button
                    onClick={() => alert('تم توليد وتنزيل شهادة إنجاز الاختبار بنجاح!')}
                    className="px-5 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs inline-flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل شهادة التقييم الرقمية</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleSubmitAnswers}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
              >
                تسليم وتصحيح الاختبار
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
