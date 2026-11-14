import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, CheckCircle2, AlertOctagon, Mic, MicOff, Upload, FileText, Download,
  BookOpen, Award, Check, X, Video, Image as ImageIcon, Link2, Type, MessageSquare,
  Lightbulb, Factory, ChevronRight, Trash2, Play
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SmartBoardCanvas } from './SmartBoardCanvas';
import { AnimatedWhiteboard } from './AnimatedWhiteboard';
import { YemeniDoctorAvatar } from './YemeniDoctorAvatar';
import { buildFallbackWhiteboardScript } from '../../services/whiteboardEngine';
import {
  requestLectureHall,
  yemeniDoctorVoice,
  LectureServiceType,
  YemeniDialect,
  CourseSubject,
  LectureHallResponseData
} from '../../services/lectureHallApi';
import { processUploadedMedia, ProcessedMediaResult } from '../../services/mediaExtractor';

type ExplainInputMode = 'text' | 'image' | 'video' | 'file' | 'social_url';

const DEFAULT_WELCOME: LectureHallResponseData = {
  doctorSpeech:
    'أهلاً وسهلاً بك يا مهندس في قاعة المحاضرات والسبورة الذكية! اختر طريقة إدخال الدرس — نص، صورة، فيديو، ملف، أو حتى رابط فيديو من مواقع التواصل — وأضف أي تفاصيل تريدها ثم اضغط "اشرح"، وسأستخرج لك كل الشرح على السبورة بالأنيميشن واللهجة اليمنية!',
  boardTitle: 'قاعة المحاضرات الذكية · قسم «اشرح لي»',
  boardNotes: [
    'استخراج شامل لجميع المفاهيم من النص أو الصورة أو الفيديو أو الرابط',
    'شرح مبسّط باللهجة اليمنية وأمثلة من الحياة والهندسة',
    'رسومات تفاعلية متحركة على السبورة لتسريع الفهم',
  ],
  boardEquation: 'V = I × R  |  I = 12V / 100Ω = 0.12 A',
  diagramType: 'circuit',
  diagramTitle: 'السبورة الذكية التفاعلية للميكاترونكس',
  yemeniEncouragement: 'تذكّر: المهندس اليمني ما يعرف مستحيل! 🇾🇪',
  followupOptions: [
    'اشرح لي قانون أوم بتشبيه شبكة المياه بصنعاء',
    'كيف يعمل محرك السيرفو وPWM؟',
    'اشرح لي دائرة الترانزستور كمفتاح إلكتروني',
  ],
  whiteboardScript: `[TEXT]أهلاً وسهلاً بك يا مهندس في قاعة المحاضرات! لنبدأ بمثال تفاعلي لقانون أوم: نرسم مصدر الجهد (بطارية 12 فولت) والأسلاك المتصلة.[/TEXT]
[DRAW]
TEXT("الدائرة البسيطة لقانون أوم · السبورة البيضاء", 450, 38, "#0F172A", 20)
BATTERY(180, 220, "12V")
WIRE(180, 180, 180, 120, "#0F172A")
WIRE(180, 120, 400, 120, "#0F172A")
[/DRAW]
[TEXT]الآن نضع المقاومة بقيمة 100 أوم ونغلق الدائرة نحو القطب السالب للبطارية، وبذلك يمر التيار الكهربائي I = V / R.[/TEXT]
[DRAW]
RESISTOR(450, 120, "R = 100Ω")
WIRE(500, 120, 720, 120, "#0F172A")
WIRE(720, 120, 720, 310, "#0F172A")
ARROW(540, 92, 665, 92, "I = 0.12 A", "#0EA5E9")
WIRE(720, 310, 180, 310, "#0F172A")
WIRE(180, 310, 180, 260, "#0F172A")
TEXT("I = V / R = 12 / 100 = 0.12 A", 450, 370, "#0284C7", 19)
[/DRAW]`,
};

export const LectureHallPage: React.FC = () => {
  const [activeDialect, setActiveDialect] = useState<YemeniDialect>('sanani');
  const [activeCourse, setActiveCourse] = useState<CourseSubject>('electronics');
  const [activeService, setActiveService] = useState<LectureServiceType>('explain');
  const [inputMode, setInputMode] = useState<ExplainInputMode>('text');

  // Input States
  const [inputText, setInputText] = useState('');
  const [extraDetails, setExtraDetails] = useState('');
  const [socialUrl, setSocialUrl] = useState('');
  const [processedMedia, setProcessedMedia] = useState<ProcessedMediaResult | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionObj, setRecognitionObj] = useState<any>(null);

  // Solver & Emergency States
  const [currentStepIndex, setCurrentStepIndex] = useState(1);
  const [confusionChoice, setConfusionChoice] = useState<'concept' | 'math' | 'wiring'>('concept');

  // Execution & Progress State
  const [isLoading, setIsLoading] = useState(false);
  const [isReadingMedia, setIsReadingMedia] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lectureData, setLectureData] = useState<LectureHallResponseData>(DEFAULT_WELCOME);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [boardViewMode, setBoardViewMode] = useState<'animated_white' | 'dark_smart'>('animated_white');
  const [showExternalSteps, setShowExternalSteps] = useState(false);
  const whiteboardSectionRef = useRef<HTMLDivElement | null>(null);

  // Quiz State
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [isQuizAnswered, setIsQuizAnswered] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Speech Recognition Setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const reco = new SpeechRecognition();
        reco.lang = 'ar-YE';
        reco.continuous = false;
        reco.interimResults = false;
        reco.onresult = (event: any) => {
          setInputText((prev) => `${prev ? prev + ' ' : ''}${event.results[0][0].transcript}`);
          setIsRecording(false);
        };
        reco.onerror = () => setIsRecording(false);
        reco.onend = () => setIsRecording(false);
        setRecognitionObj(reco);
      }
    }

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
      setErrorMsg('المتصفح لا يدعم الإملاء الصوتي المباشر. يمكنك الكتابة في المربع.');
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

  const handleFileProcess = async (e: React.ChangeEvent<HTMLInputElement>, expectedKind?: ExplainInputMode) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    setIsReadingMedia(true);
    try {
      const processed = await processUploadedMedia(file);
      setProcessedMedia(processed);
      if (expectedKind) setInputMode(expectedKind);
    } catch {
      setErrorMsg('تعذر معالجة الملف المرفوع. يرجى المحاولة بملف آخر.');
    } finally {
      setIsReadingMedia(false);
    }
  };

  const handleSubmitService = async (
    overridePrompt?: string,
    customStepIndex?: number,
    overrideMedia?: ProcessedMediaResult
  ) => {
    const activeMedia = overrideMedia ?? processedMedia;
    if (overrideMedia) {
      setProcessedMedia(overrideMedia);
    }
    const promptToSend = overridePrompt ?? inputText;
    const hasMedia = Boolean(activeMedia?.content || (activeMedia?.videoFrames && activeMedia.videoFrames.length > 0));
    const hasSocial = Boolean(socialUrl.trim());

    if (!promptToSend.trim() && !hasMedia && !hasSocial && !extraDetails.trim() && activeService !== 'quiz_me') {
      setErrorMsg('يرجى كتابة نص الدرس، أو رفع صورة/فيديو/ملف، أو وضع رابط الفيديو ثم الضغط على «اشرح».');
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
        topic: (promptToSend || activeMedia?.fileName || socialUrl || extraDetails).slice(0, 90),
        question: promptToSend,
        extraDetails: extraDetails.trim() || undefined,
        socialUrl: socialUrl.trim() || undefined,
        uploadedContent: activeMedia?.content,
        uploadedMimeType: activeMedia?.mimeType,
        videoFrames: activeMedia?.videoFrames,
        fileName: activeMedia?.fileName,
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
      whiteboardSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

      if (result.doctorSpeech) {
        yemeniDoctorVoice.speak(
          result.doctorSpeech,
          () => setIsSpeaking(true),
          () => setIsSpeaking(false),
          () => setIsSpeaking(false)
        );
      }

      if (activeService === 'explain') {
        confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء استخراج الشرح على السبورة الذكية.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerQuiz = (index: number) => {
    if (isQuizAnswered || !lectureData?.quiz) return;
    setSelectedQuizAnswer(index);
    setIsQuizAnswered(true);

    if (index === lectureData.quiz.correctIndex) {
      setQuizScore((prev) => prev + 25);
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.5 } });
      yemeniDoctorVoice.speak('صح لسانك يا بطل! كفو يا مهندس اليمن، إجابة هندسية نموذجية ودقيقة 🇾🇪!');
    } else {
      yemeniDoctorVoice.speak('ما عليه يا ابني، الغلط هو بداية الفهم الحقيقي. ركّز في تفسير السؤال.');
    }
  };

  const handleExportSummary = () => {
    if (!lectureData) return;
    const content = `================================================
منصة دكتور الميكاترونكس الذكي - قاعة المحاضرات 🎓
================================================
عنوان الدرس: ${lectureData.boardTitle}
المعادلة الرئيسية: ${lectureData.boardEquation || 'لا توجد'}

الشرح باللهجة اليمنية:
${lectureData.doctorSpeech}

نقاط السبورة الذكية:
${lectureData.boardNotes.map((n, i) => `${i + 1}. ${n}`).join('\n')}

${lectureData.steps ? `خطوات الفهم المستخرجة:\n${lectureData.steps.map((s) => `- ${s.phase}: ${s.details}`).join('\n')}` : ''}
`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(lectureData.boardTitle || 'محاضرة').replace(/[\/\\?%*:|"<>]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 pb-20 font-sans text-[#0F172A] dark:text-slate-100 w-full max-w-full overflow-x-hidden min-w-0">
      {/* SECTION 1: Top Hall Preferences & Dialect Selector */}
      <section className="champagne-card dark:bg-gradient-to-br dark:from-[#0F1D33] dark:via-[#0A1628] dark:to-[#141F36] dark:border-2 dark:border-amber-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1 text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E0F2FE] dark:bg-amber-500/15 border border-[#0EA5E9]/30 dark:border-amber-400/40 text-[#0284C7] dark:text-amber-300 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-[#0EA5E9] dark:bg-emerald-400 animate-pulse" />
            <span>الخدمة 1 · قاعة المحاضرات الذكية 🎓</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#0F172A] dark:text-white">
            قسم <span className="text-[#0EA5E9] dark:text-amber-400">«اشرح لي»</span> والسبورة الذكية
          </h1>
          <p className="text-xs sm:text-sm text-[#475569] dark:text-slate-300">
            اكتب نصاً أو ارفع صورة أو فيديو أو ملفاً أو رابط فيديو من التواصل الاجتماعي + تفاصيلك الإضافية، وسيشرحها الدكتور بالأنيميشن واللهجة اليمنية!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="flex items-center bg-white dark:bg-[#070F1E] p-1 rounded-2xl border border-[rgba(212,175,55,0.35)] dark:border-slate-700/80 text-xs font-bold shadow-sm">
            {[
              { id: 'sanani', label: 'صنعاني 🇾🇪' },
              { id: 'adani', label: 'عدني 🏖️' },
              { id: 'taizzi', label: 'تعزي 🏰' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setActiveDialect(d.id as YemeniDialect)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeDialect === d.id
                    ? 'bg-[#0EA5E9] text-white dark:bg-amber-500 dark:text-slate-950 font-black shadow-sm'
                    : 'text-[#475569] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <select
            value={activeCourse}
            onChange={(e) => setActiveCourse(e.target.value as CourseSubject)}
            className="px-3 py-2 rounded-2xl bg-white dark:bg-[#070F1E] border border-[rgba(212,175,55,0.4)] dark:border-amber-500/40 text-xs font-bold text-[#0F172A] dark:text-amber-300 outline-none shadow-sm"
          >
            <option value="electronics">⚡ الإلكترونيات والدوائر</option>
            <option value="control">🛡️ التحكم الآلي و PLC</option>
            <option value="mechanics">⚙️ الميكانيكا والتروس</option>
            <option value="programming">💻 الأردوينو والمتحكمات</option>
            <option value="robotics">🤖 الروبوتات والذكاء الاصطناعي</option>
          </select>

          <button
            onClick={handleExportSummary}
            className="px-3 py-2 rounded-2xl bg-[#E0F2FE] hover:bg-sky-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0284C7] dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-[#0EA5E9]/30 dark:border-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#0EA5E9] dark:text-cyan-400" />
            <span>حفظ الشرح</span>
          </button>
        </div>
      </section>

      {/* SECTION 2: Hall Sub-Sections Navigation */}
      <section className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { id: 'explain', label: 'قسم اشرح لي ✨', desc: 'نص/صورة/فيديو/ملف/رابط + تفاصيل' },
          { id: 'solve_homework', label: 'تبسيط وخطوات 📐', desc: 'تفكيك الدرس 4 مراحل' },
          { id: 'ask_doctor', label: 'مناقشة القاعة 💬', desc: 'استفسار سريع داخل المحاضرة' },
          { id: 'quiz_me', label: 'اختبرني سريعاً 🏆', desc: 'سؤال فوري على السبورة' },
          { id: 'did_not_understand', label: 'لم أفهم (طوارئ) 🚨', desc: 'إعادة شرح بتشبيه أبسط' },
        ].map((srv) => {
          const isActive = activeService === srv.id;
          return (
            <button
              key={srv.id}
              onClick={() => {
                setActiveService(srv.id as LectureServiceType);
                if (srv.id === 'quiz_me') {
                  handleSubmitService('أعطني سؤال اختبار ذكي في المقرر مع الشرح', 1);
                }
              }}
              className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                isActive
                  ? 'bg-[#0EA5E9] border-[#0284C7] shadow-md shadow-sky-500/20 text-white dark:bg-gradient-to-br dark:from-[#0D2240] dark:to-[#0A1628] dark:border-amber-400 dark:shadow-lg dark:text-white'
                  : 'champagne-subcard dark:bg-slate-900/80 dark:border-slate-800 text-[#475569] dark:text-slate-400 hover:border-[#0EA5E9] dark:hover:text-white dark:hover:bg-slate-800'
              }`}
            >
              <span className={`text-xs font-black ${isActive ? 'text-white dark:text-amber-300' : 'text-[#0F172A] dark:text-slate-200'}`}>
                {srv.label}
              </span>
              <span className={`text-[10px] leading-tight ${isActive ? 'text-sky-50 dark:text-slate-300' : 'text-[#475569] dark:text-slate-400'}`}>
                {srv.desc}
              </span>
            </button>
          );
        })}
      </section>

      {/* SECTION 3: Multimodal Input Dock (Text, Image, Video, File, Social Link + Extra Details + "اشرح") */}
      <section className="champagne-card dark:bg-[#0A1628] dark:border-2 dark:border-cyan-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-4">
        {/* 5 Input Modality Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black text-[#0F172A] dark:text-amber-300 ml-1">اختر نوع المحتوى:</span>
          {[
            { id: 'text', label: 'كتابة نص', icon: Type },
            { id: 'image', label: 'رفع صورة', icon: ImageIcon },
            { id: 'video', label: 'رفع فيديو', icon: Video },
            { id: 'file', label: 'رفع ملف PDF/مستند', icon: FileText },
            { id: 'social_url', label: 'رابط فيديو تواصل اجتماعي', icon: Link2 },
          ].map((m) => {
            const Icon = m.icon;
            const active = inputMode === m.id;
            return (
              <button
                type="button"
                key={m.id}
                onClick={() => setInputMode(m.id as ExplainInputMode)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all min-h-[40px] cursor-pointer ${
                  active
                    ? 'bg-[#0EA5E9] text-white dark:bg-cyan-500 dark:text-slate-950 font-black shadow-md'
                    : 'bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-[#0F172A] dark:text-slate-300 hover:border-[#0EA5E9] dark:hover:border-amber-400'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white dark:text-slate-950' : 'text-[#0EA5E9] dark:text-slate-300'}`} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Modality Inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Primary Input Zone */}
          <div className="lg:col-span-7 space-y-3">
            {inputMode === 'social_url' && (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-[#0EA5E9]/40 dark:border-cyan-500/40 space-y-2">
                <label className="text-xs font-bold text-[#0284C7] dark:text-cyan-300 flex items-center gap-1.5">
                  <Link2 className="w-4 h-4" />
                  <span>رابط فيديو من مواقع التواصل الاجتماعي (YouTube, TikTok, Instagram, Facebook, X):</span>
                </label>
                <input
                  type="url"
                  dir="ltr"
                  value={socialUrl}
                  onChange={(e) => setSocialUrl(e.target.value)}
                  placeholder="https://youtube.com/... أو https://tiktok.com/..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-[#0F172A] dark:text-cyan-300 text-xs font-mono focus:border-[#0EA5E9] dark:focus:border-amber-400 outline-none"
                />
              </div>
            )}

            {(inputMode === 'image' || inputMode === 'video' || inputMode === 'file') && (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border-2 border-dashed border-[#0EA5E9]/45 dark:border-cyan-500/40 hover:border-[#0284C7] dark:hover:border-amber-400 transition-colors">
                <label className="flex flex-col items-center justify-center gap-2 cursor-pointer text-center">
                  <span className="w-12 h-12 rounded-2xl sky-icon-box flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </span>
                  <span className="text-xs font-black text-[#0F172A] dark:text-white">
                    {inputMode === 'image' && 'اضغط لرفع صورة صفحة الكتاب أو الدائرة أو اللوحة'}
                    {inputMode === 'video' && 'اضغط لرفع فيديو الشرح (سيتم استخراج الإطارات وتحليلها تلقائياً)'}
                    {inputMode === 'file' && 'اضغط لرفع ملف (PDF, Word, TXT, Arduino Code)'}
                  </span>
                  <input
                    type="file"
                    accept={
                      inputMode === 'image'
                        ? 'image/*'
                        : inputMode === 'video'
                        ? 'video/*'
                        : '.pdf,.doc,.docx,.txt,.ppt,.pptx,.ino,.cpp,.py'
                    }
                    onChange={(e) => handleFileProcess(e, inputMode)}
                    className="hidden"
                  />
                </label>

                {isReadingMedia && (
                  <p className="text-center text-xs text-[#0284C7] dark:text-amber-300 font-bold mt-2 animate-pulse">
                    جاري تجهيز واستخراج بيانات الملف/الفيديو...
                  </p>
                )}
              </div>
            )}

            {/* Main Text Box + Voice Dictation */}
            <div className="relative">
              <textarea
                rows={inputMode === 'text' ? 4 : 2}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  inputMode === 'text'
                    ? 'اكتب نص المحاضرة أو المفهوم أو السؤال الهندسي الذي تريد أن يشرحه الدكتور على السبورة...'
                    : 'عنوان الدرس أو نص إضافي مع المرفق (اختياري)...'
                }
                className="w-full p-3.5 pl-12 rounded-2xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-[#0F172A] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs sm:text-sm focus:border-[#0EA5E9] dark:focus:border-amber-400 focus:outline-none resize-y shadow-inner"
              />
              <button
                type="button"
                onClick={handleToggleVoiceInput}
                className={`absolute left-3 top-3 p-2 rounded-xl transition-all cursor-pointer ${
                  isRecording
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-[#E0F2FE] dark:bg-slate-800 text-[#0284C7] dark:text-slate-300 hover:bg-[#0EA5E9] hover:text-white dark:hover:text-amber-400'
                }`}
                title="إملاء صوتي"
              >
                {isRecording ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Right Column: Additional Details Textarea + Media Preview */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <label className="text-xs font-black text-[#0F172A] dark:text-amber-300 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-[#0EA5E9] dark:text-amber-300" />
                <span>مربع كتابة تفاصيل إضافية (اختياري):</span>
              </label>
              <textarea
                rows={4}
                value={extraDetails}
                onChange={(e) => setExtraDetails(e.target.value)}
                placeholder="مثال: ركّز على القوانين، أعطني تشبيهاً بسيطاً جداً، واشرح لي الجزء العملي في السوق والمصنع..."
                className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-amber-500/30 text-[#0F172A] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:border-[#0EA5E9] dark:focus:border-amber-400 focus:outline-none resize-none shadow-inner"
              />
            </div>

            {processedMedia && (
              <div className="p-2.5 rounded-xl bg-[#E0F2FE] dark:bg-emerald-500/10 border border-[#0EA5E9]/40 dark:border-emerald-500/40 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  {processedMedia.mediaKind === 'image' && processedMedia.previewUrl && (
                    <img src={processedMedia.previewUrl} alt="preview" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-[#0F172A] dark:text-emerald-300 truncate">{processedMedia.fileName}</div>
                    <div className="text-[10px] text-[#475569] dark:text-slate-300">
                      {processedMedia.videoFrames?.length
                        ? `تم استخراج ${processedMedia.videoFrames.length} إطارات فيديو للتحليل`
                        : 'مرفق جاهز لاستخراج الشرح'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProcessedMedia(null)}
                  className="p-1.5 rounded-lg text-rose-500 dark:text-rose-400 hover:bg-rose-500/15"
                  title="إزالة المرفق"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Topic Chips + Big «اشرح» Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs min-w-0 flex-1">
            <span className="text-[#475569] dark:text-slate-400 font-bold shrink-0 text-[11px]">اقتراحات سريعة:</span>
            {(lectureData?.followupOptions || DEFAULT_WELCOME.followupOptions || []).map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setInputText(opt);
                  handleSubmitService(opt);
                }}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-[#475569] dark:text-slate-300 hover:text-[#0284C7] hover:border-[#0EA5E9] dark:hover:text-amber-300 dark:hover:border-amber-400 whitespace-nowrap shrink-0 text-[11px] cursor-pointer"
              >
                {opt}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleSubmitService()}
            disabled={isLoading || isReadingMedia}
            className={`px-8 py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-lg transition-all shrink-0 cursor-pointer ${
              isLoading || isReadingMedia
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                : 'bg-[#0EA5E9] hover:bg-[#0284C7] text-white dark:bg-gradient-to-r dark:from-amber-400 dark:via-orange-500 dark:to-amber-500 dark:text-slate-950 hover:scale-[1.02] active:scale-95 shadow-sky-500/25 dark:shadow-amber-500/30'
            }`}
          >
            {isLoading ? (
              <span>جاري استخراج الشرح على السبورة...</span>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>اشرح</span>
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs font-bold text-right">
            {errorMsg}
          </div>
        )}
      </section>

      {/* Emergency Confusion Chooser (if active) */}
      {activeService === 'did_not_understand' && (
        <section className="bg-rose-50 dark:bg-[#1a0f1d] border-2 border-rose-300 dark:border-rose-500/40 rounded-3xl p-4 sm:p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-black text-sm">
            <AlertOctagon className="w-5 h-5 text-rose-500 dark:text-rose-400 animate-pulse" />
            <span>وين بالضبط وقفت معك؟ حدّد نقطة الغموض ليعيد الدكتور الشرح من زاوية أسهل:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { id: 'concept', label: '1. الفكرة النظرية', desc: 'أريد تشبيهاً أبسط من الواقع' },
              { id: 'math', label: '2. القوانين والحسابات', desc: 'كيف نطبق الأرقام والوحدات' },
              { id: 'wiring', label: '3. التوصيل والواقع', desc: 'كيف تركب وتعمل في المعمل' },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setConfusionChoice(c.id as any)}
                className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                  confusionChoice === c.id
                    ? 'bg-rose-600 border-rose-500 text-white dark:bg-rose-500/25 dark:border-rose-400'
                    : 'bg-white dark:bg-slate-900/60 border-rose-200 dark:border-slate-800 text-[#475569] dark:text-slate-400'
                }`}
              >
                <div className="text-xs font-bold">{c.label}</div>
                <div className={`text-[11px] ${confusionChoice === c.id ? 'text-rose-100' : 'text-[#475569] dark:text-slate-400'}`}>{c.desc}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 4: Split-Screen Animated Whiteboard (Rough.js + Anime.js) + Dark Smart Board Switcher */}
      <div ref={whiteboardSectionRef} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-black text-[#0F172A] dark:text-amber-300">
            وضع العرض التفاعلي على السبورة:
          </span>
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 shadow-sm text-xs font-bold">
            <button
              type="button"
              onClick={() => setBoardViewMode('animated_white')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                boardViewMode === 'animated_white'
                  ? 'bg-[#0EA5E9] text-white font-black shadow-sm'
                  : 'text-[#475569] dark:text-slate-300 hover:text-[#0F172A]'
              }`}
            >
              السبورة البيضاء المتحركة (Rough.js)
            </button>
            <button
              type="button"
              onClick={() => setBoardViewMode('dark_smart')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                boardViewMode === 'dark_smart'
                  ? 'bg-[#0EA5E9] text-white font-black shadow-sm'
                  : 'text-[#475569] dark:text-slate-300 hover:text-[#0F172A]'
              }`}
            >
              السبورة الذكية الهندسية
            </button>
          </div>
        </div>

        {boardViewMode === 'animated_white' ? (
          <AnimatedWhiteboard
            title={lectureData.boardTitle || 'السبورة البيضاء المتحركة · قسم اشرح لي'}
            whiteboardScript={(() => {
              const base = lectureData.whiteboardScript;
              if (base && /\[DRAW\]/i.test(base)) {
                const missingSteps = (lectureData.steps || [])
                  .filter((st) => st.phase && !base.includes(st.phase))
                  .map((st) => `[TEXT]${st.phase}: ${st.details}[/TEXT]`)
                  .join('\n');
                return missingSteps ? `${base}\n${missingSteps}` : base;
              }
              return buildFallbackWhiteboardScript({
                title: lectureData.boardTitle,
                equation: lectureData.boardEquation,
                notes: lectureData.boardNotes,
                speech: lectureData.doctorSpeech,
                diagramType: lectureData.diagramType,
                nodes: lectureData.diagramData?.nodes,
                steps: lectureData.steps,
              });
            })()}
            explanationText={lectureData.doctorSpeech}
            isLoading={isLoading}
            isSpeaking={isSpeaking}
            placeholder="اكتب سؤالك أو أرفق صورة/فيديو/ملف ليشرحه الدكتور بالأنيميشن على السبورة البيضاء..."
            onSendQuestion={(q) => {
              setInputText(q);
              handleSubmitService(q);
            }}
            onSendMultimodal={({ question, media }) => {
              if (question) setInputText(question);
              handleSubmitService(question || 'حلل المحتوى المرفق واشرحه خطوة بخطوة على السبورة البيضاء', undefined, media);
            }}
            onToggleSpeak={handleToggleSpeech}
          />
        ) : (
          <SmartBoardCanvas
            lectureData={lectureData}
            isSpeaking={isSpeaking}
            activeDialect={activeDialect}
            onClearBoard={() => {}}
          />
        )}
      </div>

      {/* SECTION 5: Yemeni Adult Male Doctor Avatar & Complete Audio Speech */}
      <YemeniDoctorAvatar
        doctorSpeech={lectureData?.doctorSpeech}
        isSpeaking={isSpeaking}
        onToggleSpeech={handleToggleSpeech}
        onReplaySpeech={handleReplaySpeech}
        onTestTone={handleTestTone}
        dialect={activeDialect}
      />

      {/* Optional Toggleable Print/Copy Steps Drawer (Explanation is written inside the Whiteboard above) */}
      {lectureData?.steps && lectureData.steps.length > 0 && (
        <section className="champagne-card dark:bg-[#0A1628] dark:border dark:border-emerald-500/40 rounded-3xl p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowExternalSteps((prev) => !prev)}
              className="text-xs sm:text-sm font-black text-[#0F172A] dark:text-emerald-300 flex items-center gap-2 cursor-pointer"
            >
              <span className="w-7 h-7 rounded-xl sky-icon-box flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <span>
                {showExternalSteps
                  ? 'إخفاء النسخة النصية للخطوات'
                  : `عرض الخطوات المستخرجة كبطاقات للطباعة (${lectureData.steps.length})`}
              </span>
            </button>
            {activeService === 'solve_homework' && (
              <button
                onClick={() => {
                  const next = currentStepIndex < (lectureData.steps?.length || 4) ? currentStepIndex + 1 : 1;
                  setCurrentStepIndex(next);
                  handleSubmitService(inputText, next);
                }}
                className="px-4 py-1.5 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white dark:bg-emerald-500 dark:text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer"
              >
                <span>المرحلة التالية</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {showExternalSteps && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {lectureData.steps.map((st, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-2xl champagne-subcard dark:bg-slate-900/80 dark:border-slate-800 hover:border-[#0EA5E9] dark:hover:border-amber-400/50 text-right space-y-1.5 transition-colors"
                >
                  <div className="text-xs font-black text-[#0284C7] dark:text-amber-300">{st.phase}</div>
                  <div className="text-xs text-[#475569] dark:text-slate-200 leading-relaxed">{st.details}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Interactive Quiz Reveal on Board */}
      {activeService === 'quiz_me' && lectureData?.quiz && (
        <section className="champagne-card dark:bg-[#0A1628] dark:border-2 dark:border-purple-500/40 rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-base font-black text-[#0F172A] dark:text-purple-300 flex items-center gap-2">
              <Award className="w-5 h-5 text-[#0EA5E9] dark:text-amber-400" />
              <span>اختبار الفهم السريع على السبورة</span>
            </h3>
            <span className="px-3 py-1 rounded-full bg-[#E0F2FE] dark:bg-amber-500/15 border border-[#0EA5E9]/30 dark:border-amber-400/40 text-[#0284C7] dark:text-amber-300 text-xs font-bold font-mono">
              النقاط: {quizScore}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.3)] dark:border-slate-800 text-sm font-bold text-[#0F172A] dark:text-white text-right">
            {lectureData.quiz.question}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {lectureData.quiz.options.map((opt, idx) => {
              const isSelected = selectedQuizAnswer === idx;
              const isCorrect = idx === lectureData.quiz?.correctIndex;
              let btnClass = 'bg-white dark:bg-slate-900 border-[rgba(212,175,55,0.3)] dark:border-slate-800 text-[#0F172A] dark:text-slate-200 hover:border-[#0EA5E9] dark:hover:bg-slate-800';
              if (isQuizAnswered) {
                if (isCorrect) btnClass = 'bg-emerald-50 dark:bg-emerald-500/25 border-emerald-500 dark:border-emerald-400 text-emerald-800 dark:text-emerald-200 font-bold';
                else if (isSelected) btnClass = 'bg-rose-50 dark:bg-rose-500/25 border-rose-500 dark:border-rose-400 text-rose-800 dark:text-rose-200 font-bold';
              }
              return (
                <button
                  key={idx}
                  onClick={() => handleAnswerQuiz(idx)}
                  disabled={isQuizAnswered}
                  className={`p-3.5 rounded-2xl border text-right text-xs flex items-center justify-between cursor-pointer ${btnClass}`}
                >
                  <span>{opt}</span>
                  {isQuizAnswered && isCorrect && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                  {isQuizAnswered && isSelected && !isCorrect && <X className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
                </button>
              );
            })}
          </div>

          {isQuizAnswered && (
            <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-slate-950/80 border border-slate-200 dark:border-purple-500/30 text-xs text-[#475569] dark:text-slate-200 text-right">
              <strong className="text-[#0284C7] dark:text-amber-300">التفسير: </strong>
              {lectureData.quiz.explanation}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
