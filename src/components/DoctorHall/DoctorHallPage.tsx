import React, { useState, useEffect } from 'react';
import { Doctor, SavedLecture, LectureData } from '../../types';
import { getStoredDoctors, saveDoctor, saveLecture, getStoredLectures } from '../../services/storage';
import { requestLectureExplanation, doctorVoice, compressImageFile, LectureProgressStage, PROGRESS_STAGE_LABELS } from '../../services/ai';
import { DoctorCreatorModal } from './DoctorCreatorModal';
import { VirtualClassroomView } from './VirtualClassroomView';
import { Bot, Plus, Play, Pause, Square, Volume2, Sparkles, Upload, HelpCircle, CheckCircle, Award, BookOpen, Layers, RefreshCw, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';

export const DoctorHallPage: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [activeDoctor, setActiveDoctor] = useState<Doctor | null>(null);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [savedLectures, setSavedLectures] = useState<SavedLecture[]>([]);

  // Input states (preserved on error)
  const [lessonTitle, setLessonTitle] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [uploadedContent, setUploadedContent] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [educationalUrl, setEducationalUrl] = useState('');

  // Execution & Progress states
  const [isLoading, setIsLoading] = useState(false);
  const [currentProgressStage, setCurrentProgressStage] = useState<LectureProgressStage | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [lectureData, setLectureData] = useState<LectureData | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Quiz Modal state
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);

  useEffect(() => {
    const loadedDocs = getStoredDoctors();
    setDoctors(loadedDocs);
    if (loadedDocs.length > 0) {
      setActiveDoctor(loadedDocs[0]);
    }
    setSavedLectures(getStoredLectures());
  }, []);

  const handleSaveDoctor = (doc: Doctor) => {
    const updated = saveDoctor(doc);
    setDoctors(updated);
    setActiveDoctor(doc);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);

    if (file.type.startsWith('image/')) {
      const compressed = await compressImageFile(file);
      // Original high-res preview for user viewing
      setImagePreviewUrl(compressed.originalUrl);
      // Only send optimized thumbnail base64 to Gemini Vision
      setUploadedContent(compressed.optimizedVisionBase64);
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        setUploadedContent(text || `محتوى ملف: ${file.name}`);
      };
      reader.readAsText(file);
    }
  };


  const handleGenerateLecture = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeDoctor || isLoading) return;
    if (!lessonTitle.trim() && !userPrompt.trim() && !uploadedContent.trim()) {
      setErrorMsg('يرجى إدخال عنوان الدرس أو السؤال أو رفع محتوى المحاضرة.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setCurrentProgressStage('uploading');
    doctorVoice.stop();
    setIsSpeaking(false);

    try {
      const fullPrompt = `${userPrompt} ${educationalUrl ? `[رابط تعليمي: ${educationalUrl}]` : ''}`;
      
      const data = await requestLectureExplanation(
        activeDoctor,
        lessonTitle,
        fullPrompt,
        uploadedContent,
        (stage) => setCurrentProgressStage(stage)
      );

      setLectureData(data);

      // Save to lectures history
      const saved: SavedLecture = {
        id: `lec_${Date.now()}`,
        doctorId: activeDoctor.id,
        doctorName: activeDoctor.name,
        title: data.title || lessonTitle || 'محاضرة جديدة',
        subject: activeDoctor.subject,
        userPrompt: fullPrompt,
        uploadedFileName,
        data,
        createdAt: new Date().toISOString(),
      };
      setSavedLectures(saveLecture(saved));

      if (data.summary) {
        doctorVoice.speak(data.summary, activeDoctor.language, activeDoctor.voiceSpeed, () => {
          setIsSpeaking(false);
        });
        setIsSpeaking(true);
      }
    } catch (err: any) {
      console.error('Lecture Generation Failed:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء إعداد المحاضرة.');
    } finally {
      setIsLoading(false);
      setCurrentProgressStage(null);
    }
  };

  const handleSpeechControl = (action: 'play' | 'pause' | 'stop') => {
    if (!activeDoctor || !lectureData) return;

    if (action === 'play') {
      if (isPaused) {
        doctorVoice.resume();
        setIsPaused(false);
        setIsSpeaking(true);
      } else {
        const fullText = `${lectureData.title}. ${lectureData.summary}. ${lectureData.sections.map(s => s.content).join('. ')}`;
        doctorVoice.speak(fullText, activeDoctor.language, activeDoctor.voiceSpeed, () => {
          setIsSpeaking(false);
        });
        setIsSpeaking(true);
        setIsPaused(false);
      }
    } else if (action === 'pause') {
      doctorVoice.pause();
      setIsPaused(true);
      setIsSpeaking(false);
    } else if (action === 'stop') {
      doctorVoice.stop();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  const handleQuizSubmit = () => {
    if (!lectureData?.quiz) return;
    let correct = 0;
    lectureData.quiz.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctIndex) correct++;
    });

    const finalPercent = Math.round((correct / lectureData.quiz.length) * 100);
    setQuizScore(finalPercent);

    if (finalPercent >= 70) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Active Doctor Selection Header */}
      <div className="bg-[#0D1B2A] border border-[#00f0ff]/20 rounded-2xl p-4 lg:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 via-cyan-400 to-amber-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-amber-500/20 overflow-hidden border border-amber-400/40">
              {activeDoctor?.avatarUrl ? (
                <img src={activeDoctor.avatarUrl} alt={activeDoctor.name} className="w-full h-full object-cover" />
              ) : (
                <Bot className="w-9 h-9" />
              )}
            </div>
            {isSpeaking && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500 border-2 border-slate-900"></span>
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{activeDoctor?.name || 'دكتور الميكاترونكس الذكي'}</h2>
              <span className="text-[10px] font-semibold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                {activeDoctor?.level === 'beginner' ? 'مبتدئ' : activeDoctor?.level === 'advanced' ? 'متقدم' : 'متوسط'}
              </span>
            </div>
            <p className="text-xs text-cyan-400 font-medium mt-0.5">{activeDoctor?.subject}</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">{activeDoctor?.specialization}</p>
          </div>
        </div>

        {/* Doctor Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={activeDoctor?.id || ''}
            onChange={(e) => {
              const doc = doctors.find((d) => d.id === e.target.value);
              if (doc) setActiveDoctor(doc);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:border-amber-400 focus:outline-none"
          >
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.subject})
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsCreatorOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500 hover:text-black transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء دكتور جديد</span>
          </button>
        </div>
      </div>

      {/* Main Classroom Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Input Form & Saved Lectures */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Lecture Generator Card */}
          <div className="bg-[#0D1B2A] border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-amber-400 border-b border-slate-800 pb-3">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">إلقاء محاضرة تفاعلية جديدة</h3>
            </div>

            <form onSubmit={handleGenerateLecture} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">عنوان الدرس أو موضوع الشرح</label>
                <input
                  type="text"
                  placeholder="مثال: تحليل الدوائر الكهربائية بـ Ohm's Law"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-amber-400 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">السؤال التفصيلي أو النقاط المطلوبة</label>
                <textarea
                  rows={3}
                  placeholder="اكتب أي سؤال أو استفسار محدد تريد حله بالتفصيل..."
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-amber-400 focus:outline-none resize-none text-xs"
                />
              </div>

              {/* Upload Image / PDF / Word / Text */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">رفع مستند أو صورة دائرة (PDF / Word / صورة)</label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="doc-upload"
                  />
                  <label
                    htmlFor="doc-upload"
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-dashed border-slate-700 hover:border-amber-400 text-slate-400 hover:text-amber-400 cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{uploadedFileName ? uploadedFileName : 'اختر صورة أو ملف مرفق'}</span>
                  </label>
                </div>

                {imagePreviewUrl && (
                  <div className="mt-2 relative rounded-xl overflow-hidden border border-cyan-500/30 h-28 bg-slate-900">
                    <img src={imagePreviewUrl} alt="معاينة المرفق" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-1 text-[9px] font-mono bg-black/70 px-1.5 py-0.5 rounded text-cyan-300">
                      محسنة ومحفوظة
                    </span>
                  </div>
                )}
              </div>

              {/* Educational Link */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">رابط تعليمي خارجي (اختياري)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={educationalUrl}
                  onChange={(e) => setEducationalUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-amber-400 focus:outline-none text-xs font-mono"
                />
              </div>

              {/* Multi-Step Realtime Progress Indicator */}
              {isLoading && currentProgressStage && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                    <span className="flex items-center gap-1.5">
                      <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      <span>{PROGRESS_STAGE_LABELS[currentProgressStage]}</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-400 h-full transition-all duration-300"
                      style={{
                        width:
                          currentProgressStage === 'uploading'
                            ? '20%'
                            : currentProgressStage === 'analyzing'
                            ? '45%'
                            : currentProgressStage === 'preparing'
                            ? '70%'
                            : currentProgressStage === 'whiteboard'
                            ? '90%'
                            : '100%',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Error Message with Preserved State & Retry Button */}
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2">
                  <div className="flex items-start gap-2 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGenerateLecture()}
                    className="w-full py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>إعادة المحاولة مباشرةً (بدون إعادة الرفع)</span>
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span>جاري إعداد المحاضرة والتفاعل...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>إلقاء المحاضرة وتفعيل الدكتور المتحرك</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Saved Lectures History */}
          <div className="bg-[#0D1B2A] border border-slate-800 rounded-2xl p-5 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>المحاضرات المحفوظة سابقاً</span>
            </h4>

            {savedLectures.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">لا توجد محاضرات محفوظة حتى الآن</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                {savedLectures.map((lec) => (
                  <div
                    key={lec.id}
                    onClick={() => setLectureData(lec.data)}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-colors space-y-1"
                  >
                    <h5 className="text-xs font-bold text-white truncate">{lec.title}</h5>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{lec.doctorName}</span>
                      <span>{new Date(lec.createdAt).toLocaleDateString('ar-SA')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Virtual Animated Classroom Viewport */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Animated Virtual Classroom Component */}
          {activeDoctor && (
            <VirtualClassroomView
              activeDoctor={activeDoctor}
              lectureData={lectureData}
            />
          )}

          {/* Formatted AI Lecture Output Breakdown */}
          {lectureData && (
            <div className="bg-[#0D1B2A] border border-slate-800 rounded-2xl p-6 space-y-6 text-slate-200">
              
              <div className="border-b border-slate-800 pb-4">
                <span className="text-xs font-mono text-cyan-400">محاضرة تفاعلية مكتملة</span>
                <h3 className="text-2xl font-bold text-white mt-1">{lectureData.title}</h3>
              </div>

              {/* Objectives */}
              {lectureData.objectives && lectureData.objectives.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">الأهداف التعليمية</h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300">
                    {lectureData.objectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sections Breakdown */}
              <div className="space-y-6">
                {lectureData.sections.map((sec, idx) => (
                  <div key={idx} className="space-y-2">
                    <h4 className="text-base font-bold text-cyan-300 border-r-4 border-amber-500 pr-3">
                      {sec.heading}
                    </h4>
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                      {sec.content}
                    </p>

                    {sec.whiteboardNotes && (
                      <div className="p-3 rounded-lg bg-slate-900 border border-amber-500/30 text-xs font-mono text-amber-300">
                        📌 ملاحظات السبورة: {sec.whiteboardNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Solved Example */}
              {lectureData.solvedExample && (
                <div className="p-5 rounded-xl bg-[#0F2338] border border-blue-500/30 space-y-3">
                  <h4 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    <span>مثال تطبيقي محلول خطوة بخطوة</span>
                  </h4>
                  <p className="text-xs text-white font-medium">{lectureData.solvedExample.problem}</p>

                  <ol className="list-decimal list-inside space-y-1 text-xs text-slate-300">
                    {lectureData.solvedExample.steps.map((st, i) => (
                      <li key={i}>{st}</li>
                    ))}
                  </ol>

                  <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
                    النتيجة النهائية: {lectureData.solvedExample.finalAnswer}
                  </div>
                </div>
              )}

              {/* Summary */}
              {lectureData.summary && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-amber-400 uppercase">ملخص الدكتور</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{lectureData.summary}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quiz Modal */}
      {showQuizModal && lectureData?.quiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#0D1B2A] border border-amber-500/30 w-full max-w-xl rounded-2xl p-6 space-y-6 text-slate-100 my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-6 h-6 text-amber-400" />
                <h3 className="text-lg font-bold text-white">اختبار تفاعلي بعد المحاضرة</h3>
              </div>
              <button onClick={() => setShowQuizModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-6 max-h-96 overflow-y-auto no-scrollbar pr-1">
              {lectureData.quiz.map((q, qIdx) => (
                <div key={qIdx} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <h4 className="text-sm font-bold text-white">{qIdx + 1}. {q.question}</h4>
                  <div className="space-y-2">
                    {q.options.map((opt, oIdx) => {
                      const isSelected = quizAnswers[qIdx] === oIdx;
                      return (
                        <button
                          key={oIdx}
                          onClick={() => setQuizAnswers({ ...quizAnswers, [qIdx]: oIdx })}
                          className={`w-full text-right px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                              : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {quizScore !== null && (
                    <div className="text-[11px] text-slate-400 mt-2 p-2 rounded bg-slate-800/50">
                      تفسير: {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {quizScore !== null ? (
              <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-center space-y-1">
                <div className="text-xl font-bold text-amber-300">النتيجة: {quizScore}%</div>
                <p className="text-xs text-slate-300">
                  {quizScore >= 70 ? 'رائع جداً! تم اجتياز اختبار المحاضرة بنجاح' : 'حاول مراجعة أجزاء المحاضرة مرة أخرى لإتقان النتيجة.'}
                </p>
              </div>
            ) : (
              <button
                onClick={handleQuizSubmit}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40"
              >
                تسليم الإجابات وتقييم النتيجة
              </button>
            )}
          </div>
        </div>
      )}

      {/* Doctor Creator Modal */}
      <DoctorCreatorModal
        isOpen={isCreatorOpen}
        onClose={() => setIsCreatorOpen(false)}
        onSaveDoctor={handleSaveDoctor}
      />
    </div>
  );
};
