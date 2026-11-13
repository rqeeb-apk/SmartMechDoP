import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, MessageSquare, CheckCircle2, HelpCircle, AlertOctagon,
  Mic, MicOff, Send, Upload, FileText, Download, RotateCcw,
  BookOpen, ChevronRight, Award, Check, X, ArrowLeft, Layers, Volume2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SmartBoardCanvas } from './SmartBoardCanvas';
import { YemeniDoctorAvatar } from './YemeniDoctorAvatar';
import {
  requestLectureHall,
  yemeniDoctorVoice,
  LectureServiceType,
  YemeniDialect,
  CourseSubject,
  LectureHallResponseData
} from '../../services/lectureHallApi';
import { readFileAsBase64OrText } from '../../services/explainLessonApi';

const DEFAULT_WELCOME: LectureHallResponseData = {
  doctorSpeech:
    'أهلاً وسهلاً بك يا مهندس في قاعة المحاضرات والسبورة الذكية! أنا دكتور الميكاترونكس، ومعنا اليوم سبورتنا التفاعلية. اختر أي خدمة من الخدمات الخمس، أو اطرح أي سؤال في مقررات الميكاترونكس وسأشرحه لك بالهندسة والواقع، حبة حبة، وتذكّر: المهندس اليمني ما يعرف مستحيل!',
  boardTitle: 'قاعة المحاضرات الذكية · هندسة الميكاترونكس',
  boardNotes: [
    'الربط التكاملي بين الميكانيكا، الإلكترونيات، والبرمجة',
    'التحكم الدقيق في المحركات والأنظمة المضمنة Actuators & Sensors',
    'تصميم وتنفيذ المشاريع الهندسية الذكية بكفاءة عالية',
  ],
  boardEquation: 'System = Mechanical + Electronics + Software',
  diagramType: 'circuit',
  diagramTitle: 'المفهوم الأساسي للمنظومة الذكية',
  yemeniEncouragement: 'تذكّر: المهندس اليمني ما يعرف مستحيل! 🇾🇪',
  followupOptions: [
    'اشرح لي قانون أوم بتشبيه شبكة المياه بصنعاء',
    'كيف يعمل محرك السيرفو ومسننات سوق الملح؟',
    'أعطني مسألة اختبار هندسية',
  ],
};

export const LectureHallPage: React.FC = () => {
  // Dialect & Course Selection
  const [activeDialect, setActiveDialect] = useState<YemeniDialect>('sanani');
  const [activeCourse, setActiveCourse] = useState<CourseSubject>('electronics');
  const [activeService, setActiveService] = useState<LectureServiceType>('explain');

  // Input States
  const [inputText, setInputText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedBase64, setUploadedBase64] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionObj, setRecognitionObj] = useState<any>(null);

  // Homework Solver Step state
  const [currentStepIndex, setCurrentStepIndex] = useState(1);

  // Emergency Did Not Understand state
  const [confusionChoice, setConfusionChoice] = useState<'concept' | 'math' | 'wiring'>('concept');

  // Execution & Progress State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lectureData, setLectureData] = useState<LectureHallResponseData>(DEFAULT_WELCOME);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Quiz State
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [isQuizAnswered, setIsQuizAnswered] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Saved Notes history in localStorage
  const [savedNotes, setSavedNotes] = useState<{ id: string; title: string; date: string; data: LectureHallResponseData }[]>([]);
  const [showSavedNotesDrawer, setShowSavedNotesDrawer] = useState(false);

  // Speech Recognition Setup (Web Speech API)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const reco = new SpeechRecognition();
        reco.lang = 'ar-YE'; // Yemeni Arabic
        reco.continuous = false;
        reco.interimResults = false;

        reco.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputText(transcript);
          setIsRecording(false);
        };

        reco.onerror = () => {
          setIsRecording(false);
        };

        reco.onend = () => {
          setIsRecording(false);
        };

        setRecognitionObj(reco);
      }
    }

    try {
      const stored = localStorage.getItem('dr_mecha_lecture_notes');
      if (stored) setSavedNotes(JSON.parse(stored));
    } catch {}
  }, []);

  // Play Doctor Welcome Speech on first load
  useEffect(() => {
    // Speak initial welcome
    yemeniDoctorVoice.speak(
      DEFAULT_WELCOME.doctorSpeech,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      () => setIsSpeaking(false)
    );

    return () => {
      yemeniDoctorVoice.stop();
    };
  }, []);

  const handleToggleSpeech = () => {
    if (isSpeaking) {
      yemeniDoctorVoice.stop();
      setIsSpeaking(false);
    } else if (lectureData?.doctorSpeech) {
      yemeniDoctorVoice.speak(
        lectureData.doctorSpeech,
        () => setIsSpeaking(true),
        () => setIsSpeaking(false),
        () => setIsSpeaking(false)
      );
    }
  };

  const handleReplaySpeech = () => {
    if (!lectureData?.doctorSpeech) return;
    yemeniDoctorVoice.speak(
      lectureData.doctorSpeech,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      () => setIsSpeaking(false)
    );
  };

  const handleTestTone = () => {
    yemeniDoctorVoice.speak(
      'أهلاً وسهلاً بك يا ابني، معك دكتور الميكاترونكس. نبرة الأستاذ الجامعي اليمني الدافئة والواثقة جاهزة الآن لشرح الدروس والمسائل الهندسية حبة حبة.',
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      () => setIsSpeaking(false)
    );
  };

  const handleToggleVoiceInput = () => {
    if (!recognitionObj) {
      alert('المتصفح الحالي لا يدعم التعرف الصوتي المباشر. يمكنك الكتابة في المربع.');
      return;
    }

    if (isRecording) {
      recognitionObj.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      recognitionObj.start();
    }
  };

  const handleFileProcess = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    try {
      const res = await readFileAsBase64OrText(file);
      setUploadedBase64(res.content);
    } catch {
      setErrorMsg('تعذر قراءة الملف.');
    }
  };

  // Submit to Backend
  const handleSubmitService = async (overridePrompt?: string, customStepIndex?: number) => {
    const promptToSend = overridePrompt || inputText;
    if (!promptToSend.trim() && !uploadedBase64 && activeService !== 'quiz_me') {
      setErrorMsg('يرجى كتابة السؤال أو اختيار موضوع أو رفع صورة المسألة.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSelectedQuizAnswer(null);
    setIsQuizAnswered(false);
    yemeniDoctorVoice.stop();
    setIsSpeaking(false);

    try {
      const result = await requestLectureHall({
        serviceType: activeService,
        dialect: activeDialect,
        courseSubject: activeCourse,
        topic: promptToSend.slice(0, 80),
        question: promptToSend,
        uploadedContent: uploadedBase64,
        stepIndex: customStepIndex || currentStepIndex,
        confusionPoint:
          activeService === 'did_not_understand'
            ? confusionChoice === 'concept'
              ? 'الفكرة النظرية والمفهوم الأساسي'
              : confusionChoice === 'math'
              ? 'التعويض الرياضي والقوانين'
              : 'طريقة التوصيل والواقع العملي'
            : undefined,
      });

      setLectureData(result);

      // Play Doctor Voice automatically
      if (result.doctorSpeech) {
        yemeniDoctorVoice.speak(
          result.doctorSpeech,
          () => setIsSpeaking(true),
          () => setIsSpeaking(false),
          () => setIsSpeaking(false)
        );
      }

      // If quiz, celebration if correct
      if (activeService === 'quiz_me') {
        setSelectedQuizAnswer(null);
      }

      // Save to history automatically
      const newNote = {
        id: `note_${Date.now()}`,
        title: result.boardTitle || promptToSend.slice(0, 40),
        date: new Date().toLocaleDateString('ar-EG'),
        data: result,
      };
      const updatedNotes = [newNote, ...savedNotes.slice(0, 15)];
      setSavedNotes(updatedNotes);
      try {
        localStorage.setItem('dr_mecha_lecture_notes', JSON.stringify(updatedNotes));
      } catch {}

      if (activeService === 'explain' || activeService === 'solve_homework') {
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'حدث خطأ أثناء إعداد المحاضرة.');
    } finally {
      setIsLoading(false);
    }
  };

  // Answer Quiz Option
  const handleAnswerQuiz = (index: number) => {
    if (isQuizAnswered || !lectureData?.quiz) return;
    setSelectedQuizAnswer(index);
    setIsQuizAnswered(true);

    const isCorrect = index === lectureData.quiz.correctIndex;
    if (isCorrect) {
      setQuizScore((prev) => prev + 25);
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.5 } });
      yemeniDoctorVoice.speak(
        'صح لسانك يا بطل! كفو يا مهندس اليمن، إجابة هندسية نموذجية ودقيقة 🇾🇪!'
      );
    } else {
      yemeniDoctorVoice.speak(
        'ما عليه يا ابني، الغلط هو بداية الفهم الحقيقي. ركّز في تفسير السؤال والتعويض الصحيح.'
      );
    }
  };

  // Export / Print Summary Notes
  const handleExportSummary = () => {
    if (!lectureData) return;
    const content = `================================================
منصة دكتور الميكاترونكس الذكي - قاعة المحاضرات 🎓
================================================
عنوان الدرس: ${lectureData.boardTitle}
المعادلة الرئيسية: ${lectureData.boardEquation || 'لا توجد'}
المقرر: ${activeCourse} | اللهجة: ${activeDialect}

شرح دكتور الميكاترونكس:
${lectureData.doctorSpeech}

ملاحظات السبورة الذكية:
${lectureData.boardNotes.map((n, i) => `${i + 1}. ${n}`).join('\n')}

${lectureData.steps ? `مراحل الحل:\n` + lectureData.steps.map((s) => `[${s.phase}]\n${s.details}`).join('\n\n') : ''}

حكمة المهندس: ${lectureData.yemeniEncouragement || 'المهندس اليمني ما يعرف مستحيل'}
تاريخ المحاضرة: ${new Date().toLocaleString('ar-EG')}
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${lectureData.boardTitle.replace(/[\/\\?%*:|"<>]/g, '_')}_محاضرة.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-20 font-sans select-none text-slate-100 w-full max-w-full overflow-x-hidden min-w-0">
      
      {/* =========================================================================
          SECTION 1: Top Lecture Hall Navigation & Preferences
          ========================================================================= */}
      <section className="bg-gradient-to-br from-[#0F1D33] via-[#0A1628] to-[#141F36] border-2 border-amber-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Title & Badge */}
        <div className="space-y-1 text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>قاعة المحاضرات التفاعلية 🎓</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-white">
            سبورة <span className="gold-gradient-text">دكتور الميكاترونكس</span> الذكية
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            بيئة تفاعلية حية بلهجة يمنية أصيلة، سبورة ترسم الأنيميشن، وتفاعل مباشر كأنك في قلب قاعة الجامعة.
          </p>
        </div>

        {/* Dialect Switcher & Course Selector Toolbar */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start sm:justify-end">
          
          {/* Dialect Switcher (صنعاني / عدني / تعزي) */}
          <div className="flex items-center bg-[#070F1E] p-1 rounded-2xl border border-slate-700/80 text-xs font-bold">
            {[
              { id: 'sanani', label: 'صنعاني 🇾🇪' },
              { id: 'adani', label: 'عدني 🏖️' },
              { id: 'taizzi', label: 'تعزي 🏰' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setActiveDialect(d.id as YemeniDialect)}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeDialect === d.id
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Course Subject Selector */}
          <select
            value={activeCourse}
            onChange={(e) => setActiveCourse(e.target.value as CourseSubject)}
            className="px-3 py-2 rounded-2xl bg-[#070F1E] border border-amber-500/40 text-xs font-bold text-amber-300 outline-none cursor-pointer"
          >
            <option value="electronics">⚡ الإلكترونيات والدوائر</option>
            <option value="control">🛡️ التحكم الآلي و PLC</option>
            <option value="mechanics">⚙️ الميكانيكا والتروس</option>
            <option value="programming">💻 الأردوينو والمتحكمات</option>
            <option value="robotics">🤖 الروبوتات والذكاء الاصطناعي</option>
          </select>

          {/* Export Notes Button */}
          <button
            onClick={handleExportSummary}
            className="px-3 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors"
            title="تصدير وحفظ ملاحظات المحاضرة"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">احفظ الملخص</span>
          </button>
        </div>

      </section>

      {/* =========================================================================
          SECTION 2: The 5 Core Service Selector Tabs
          ========================================================================= */}
      <section className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        {[
          {
            id: 'explain',
            label: '1. اشرح لي',
            desc: 'شرح المفهوم بأسلوب وتشبيه يمني',
            badge: '💡 شرح مبسط',
            color: 'from-amber-500 to-orange-500',
          },
          {
            id: 'ask_doctor',
            label: '2. اسأل دكتورك',
            desc: 'حوار مباشر بالصوت والنص',
            badge: '🎙️ محادثة تفاعلية',
            color: 'from-cyan-500 to-blue-500',
          },
          {
            id: 'solve_homework',
            label: '3. حل أسئلتي',
            desc: 'حل المسائل والواجبات خطوة بخطوة',
            badge: '📐 حل مرحلي مع السبب',
            color: 'from-emerald-500 to-teal-500',
          },
          {
            id: 'quiz_me',
            label: '4. اختبرني',
            desc: 'سؤال تفاعلي بشارة مهندس يمني',
            badge: '🏆 نقاط وشارات 🇾🇪',
            color: 'from-purple-500 to-pink-500',
          },
          {
            id: 'did_not_understand',
            label: '5. لم أفهم',
            desc: 'زر الطوارئ لإعادة الشرح بزاوية أخرى',
            badge: '🚨 طوارئ تعليمية',
            color: 'from-rose-500 to-red-600',
          },
        ].map((srv) => {
          const isActive = activeService === srv.id;
          return (
            <button
              key={srv.id}
              onClick={() => {
                setActiveService(srv.id as LectureServiceType);
                if (srv.id === 'quiz_me') {
                  handleSubmitService('سؤال اختبار ذكي في المقرر', 1);
                }
              }}
              className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-br from-[#0D2240] to-[#0A1628] border-amber-400 shadow-xl shadow-amber-500/20 text-white'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black ${isActive ? 'text-amber-300' : 'text-slate-200'}`}>
                  {srv.label}
                </span>
                <span className="text-[10px] font-mono">{srv.badge}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                {srv.desc}
              </p>
            </button>
          );
        })}
      </section>

      {/* =========================================================================
          SECTION 3: The Central Interactive Smart Board Canvas
          ========================================================================= */}
      <SmartBoardCanvas
        lectureData={lectureData}
        isSpeaking={isSpeaking}
        activeDialect={activeDialect}
        onClearBoard={() => {}}
      />

      {/* =========================================================================
          SECTION 4: Animated Dr. Mechatronics Avatar with Spoken Audio
          ========================================================================= */}
      <YemeniDoctorAvatar
        doctorSpeech={lectureData?.doctorSpeech}
        isSpeaking={isSpeaking}
        onToggleSpeech={handleToggleSpeech}
        onReplaySpeech={handleReplaySpeech}
        onTestTone={handleTestTone}
        dialect={activeDialect}
      />

      {/* =========================================================================
          SECTION 5: Service Specific Interaction Panels
          ========================================================================= */}
      
      {/* 5A. Phase-by-Phase Steps Viewer (For 'solve_homework') */}
      {activeService === 'solve_homework' && lectureData?.steps && lectureData.steps.length > 0 && (
        <section className="bg-[#0A1628] border-2 border-emerald-500/40 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-black text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>مراحل حل المسألة الهندسية خطوة بخطوة</span>
            </h3>
            <span className="text-xs font-mono font-bold text-amber-300">
              المرحلة {currentStepIndex} من {lectureData.steps.length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            {lectureData.steps.map((st, i) => (
              <div
                key={i}
                className={`p-3.5 rounded-2xl border text-right transition-all ${
                  i + 1 === currentStepIndex
                    ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-lg'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="text-[10px] font-bold text-emerald-400 mb-1">{st.phase}</div>
                <div className="text-xs leading-relaxed">{st.details}</div>
              </div>
            ))}
          </div>

          {/* Stepper Advance Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                const nextStep = currentStepIndex < (lectureData.steps?.length || 4) ? currentStepIndex + 1 : 1;
                setCurrentStepIndex(nextStep);
                handleSubmitService(inputText, nextStep);
              }}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs shadow-lg hover:opacity-90 flex items-center gap-2"
            >
              <span>{currentStepIndex < (lectureData.steps?.length || 4) ? `الانتقال للمرحلة ${currentStepIndex + 1}` : 'إعادة الحل من البداية'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      {/* 5B. Interactive Quiz Card on Board (For 'quiz_me') */}
      {activeService === 'quiz_me' && lectureData?.quiz && (
        <section className="bg-[#0A1628] border-2 border-purple-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-black text-purple-300 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>اختبار السبورة الذكي (مقرر {activeCourse})</span>
            </h3>

            {/* Yemeni Engineer Badge Counter */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-bold font-mono">
              <span>رصيد النقاط: {quizScore}</span>
              {quizScore >= 75 && <span>🎖️ شارة مهندس يمني كفء 🇾🇪</span>}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-sm font-bold text-white text-right leading-relaxed">
            {lectureData.quiz.question}
          </div>

          {/* 4 Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {lectureData.quiz.options.map((opt, idx) => {
              const isSelected = selectedQuizAnswer === idx;
              const isCorrect = idx === lectureData.quiz?.correctIndex;
              let btnClass = 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800';

              if (isQuizAnswered) {
                if (isCorrect) {
                  btnClass = 'bg-emerald-500/25 border-emerald-400 text-emerald-200 font-bold';
                } else if (isSelected) {
                  btnClass = 'bg-rose-500/25 border-rose-400 text-rose-200 font-bold';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswerQuiz(idx)}
                  disabled={isQuizAnswered}
                  className={`p-3.5 rounded-2xl border text-right text-xs transition-all flex items-center justify-between ${btnClass}`}
                >
                  <span>{opt}</span>
                  {isQuizAnswered && isCorrect && <Check className="w-4 h-4 text-emerald-400" />}
                  {isQuizAnswered && isSelected && !isCorrect && <X className="w-4 h-4 text-rose-400" />}
                </button>
              );
            })}
          </div>

          {/* Explanation reveal */}
          {isQuizAnswered && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-500/30 text-xs text-slate-200 space-y-2 text-right">
              <span className="font-bold text-amber-300">التفسير الأكاديمي للدكتور:</span>
              <p>{lectureData.quiz.explanation}</p>
              
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => handleSubmitService('سؤال اختبار جديد في الميكاترونكس')}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all"
                >
                  سؤال اختبار جديد 🎯
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 5C. Emergency Confusion Chooser (For 'did_not_understand') */}
      {activeService === 'did_not_understand' && (
        <section className="bg-[#1a0f1d] border-2 border-rose-500/40 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 text-rose-300 font-black text-sm sm:text-base">
            <AlertOctagon className="w-5 h-5 text-rose-400 animate-pulse" />
            <span>وين بالضبط وقفت معك؟ (حدّد نقطة الغموض وسيعيد الدكتور الشرح بزاوية ثانية):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { id: 'concept', label: '1. الفكرة النظرية والمفهوم', desc: 'أريد تشبيهاً أبسط بكثير من الواقع' },
              { id: 'math', label: '2. التعويض الحسابي والرياضي', desc: 'أريد معرفة كيف طُبقت الأرقام والوحدات' },
              { id: 'wiring', label: '3. التوصيل والواقع العملي', desc: 'أريد معرفة كيف تركب القطع بالواقع' },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setConfusionChoice(c.id as any)}
                className={`p-3.5 rounded-2xl border text-right transition-all ${
                  confusionChoice === c.id
                    ? 'bg-rose-500/25 border-rose-400 text-white shadow-md'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="text-xs font-bold mb-1">{c.label}</div>
                <div className="text-[11px] text-slate-400">{c.desc}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 6: Interactive Input Bar (Voice + Text + File Upload)
          ========================================================================= */}
      <section className="bg-[#0A1628] border-2 border-amber-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3">
        
        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          <span className="text-slate-400 font-bold shrink-0 text-[11px]">مواضيع مقترحة:</span>
          {(lectureData?.followupOptions || DEFAULT_WELCOME.followupOptions || []).map((opt, i) => (
            <button
              key={i}
              onClick={() => {
                setInputText(opt);
                handleSubmitService(opt);
              }}
              className="px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-amber-300 hover:border-amber-400/50 whitespace-nowrap shrink-0 text-[11px] transition-all"
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Input Bar with Mic, File Upload, and Send */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          
          {/* Main Input Text Field */}
          <div className="relative w-full flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitService()}
              placeholder={
                activeService === 'solve_homework'
                  ? 'اكتب المسألة أو الواجب هنا، أو ارفع صورة المسألة...'
                  : activeService === 'ask_doctor'
                  ? 'تحدث أو اكتب سؤالك للدكتور بالهندسة...'
                  : 'اكتب موضوع المحاضرة الذي تريد شرحه على السبورة...'
              }
              className="w-full pr-4 pl-12 py-3.5 rounded-2xl bg-slate-900 border border-slate-700/80 text-white placeholder:text-slate-500 text-xs sm:text-sm focus:border-amber-400 focus:outline-none font-sans"
            />

            {/* Voice Input Button */}
            <button
              type="button"
              onClick={handleToggleVoiceInput}
              className={`absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'text-slate-400 hover:text-amber-400'
              }`}
              title="تحدث بصوتك بالهاتف أو الحاسوب"
            >
              {isRecording ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
          </div>

          {/* File Upload Attachment Button */}
          <label className="p-3.5 rounded-2xl bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-amber-400 hover:border-amber-400 cursor-pointer transition-colors shrink-0 flex items-center gap-1.5 text-xs font-bold">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">{uploadedFile ? uploadedFile.name.slice(0, 15) : 'رفع صورة'}</span>
            <input
              type="file"
              accept="image/*,.pdf,.txt"
              onChange={handleFileProcess}
              className="hidden"
            />
          </label>

          {/* Primary Action Button: «اطرح على السبورة» */}
          <button
            onClick={() => handleSubmitService()}
            disabled={isLoading}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
              isLoading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 hover:scale-105 active:scale-95 shadow-amber-500/25'
            }`}
          >
            {isLoading ? (
              <span>جاري التحضير على السبورة...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>شرح على السبورة الذكية</span>
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold text-right">
            {errorMsg}
          </div>
        )}
      </section>

    </div>
  );
};
