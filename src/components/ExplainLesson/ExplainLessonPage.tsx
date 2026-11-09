import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles, FileText, Image as ImageIcon, Video, FileCode, CheckCircle2,
  AlertTriangle, ArrowLeft, RefreshCw, Volume2, VolumeX, HelpCircle,
  BookOpen, Calculator, Layers, Cpu, Award, Zap, Send, RotateCcw,
  Maximize2, Eye, ShieldCheck, ChevronDown, ChevronUp, Bot, Copy,
  Check, Play, Pause, CornerDownLeft, FileType
} from 'lucide-react';
import {
  LessonExplanationData,
  StudentLevel,
  LessonSourceType,
  LessonFollowupMessage
} from '../../types';
import {
  requestLessonExplanation,
  askLessonFollowupQuestion,
  requestLessonAlternative,
  readFileAsBase64OrText
} from '../../services/explainLessonApi';
import confetti from 'canvas-confetti';

const PROGRESS_STEPS = [
  { id: 'reading', label: 'جاري قراءة واستخراج المحتوى...' },
  { id: 'analyzing', label: 'جاري تحليل الدرس والمفاهيم الهندسية...' },
  { id: 'equations', label: 'جاري استخراج وتدقيق المعادلات والوحدات...' },
  { id: 'visuals', label: 'جاري فهم الرسومات والمخططات...' },
  { id: 'drafting', label: 'جاري إعداد الشرح التدريجي الموثق...' },
];

export const ExplainLessonPage: React.FC = () => {
  // Source input state
  const [activeSourceType, setActiveSourceType] = useState<LessonSourceType>('text');
  const [studentLevel, setStudentLevel] = useState<StudentLevel>('intermediate');
  const [textInput, setTextInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [filePreviewUrl, setFilePreviewUrl] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Analysis & Loading state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressStageIndex, setProgressStageIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Result Lesson Data (Preserved during session)
  const [lessonData, setLessonData] = useState<LessonExplanationData | null>(null);
  const [alternativeResult, setAlternativeResult] = useState<{ title: string; content: string } | null>(null);
  const [isAlternativeLoading, setIsAlternativeLoading] = useState(false);

  // Interactive Quiz state
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<Record<number, number>>({});
  const [revealedQuizResults, setRevealedQuizResults] = useState(false);

  // Interactive Follow-up Questions (Grounded Chat)
  const [followupHistory, setFollowupHistory] = useState<LessonFollowupMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isFollowupLoading, setIsFollowupLoading] = useState(false);

  // Audio Speech state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Progress animation simulator
  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      interval = setInterval(() => {
        setProgressStageIndex((prev) => (prev < PROGRESS_STEPS.length - 1 ? prev + 1 : prev));
      }, 2500);
    } else {
      setProgressStageIndex(0);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Handle File Selection
  const handleProcessSelectedFile = async (file: File) => {
    setUploadedFile(file);
    setErrorMsg('');

    // Determine type
    if (file.type.startsWith('image/')) {
      setActiveSourceType('image');
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else if (file.type.startsWith('video/')) {
      setActiveSourceType('video');
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      setActiveSourceType('pdf');
      setFilePreviewUrl('');
    } else {
      setActiveSourceType('document');
      setFilePreviewUrl('');
    }

    try {
      const readData = await readFileAsBase64OrText(file);
      setFileBase64(readData.content);
    } catch (err: any) {
      setErrorMsg('تعذر قراءة الملف المرفوع. يرجى تجربة ملف آخر.');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessSelectedFile(file);
    }
  };

  // Launch Full 14-Step Explanation
  const handleStartExplanation = async () => {
    let contentToAnalyze = '';
    let fileName = '';

    if (activeSourceType === 'text') {
      if (!textInput.trim()) {
        setErrorMsg('يرجى كتابة أو نسخ نص الدرس أو المسألة المراد شرحها.');
        return;
      }
      contentToAnalyze = textInput.trim();
      fileName = 'نص مكتوب';
    } else {
      if (!fileBase64 && !uploadedFile) {
        setErrorMsg('يرجى رفع ملف أو صورة أو فيديو للدرس أولاً.');
        return;
      }
      contentToAnalyze = fileBase64;
      fileName = uploadedFile?.name || 'ملف مرفوع';
    }

    setIsAnalyzing(true);
    setErrorMsg('');
    setAlternativeResult(null);
    setSelectedQuizAnswers({});
    setRevealedQuizResults(false);
    setFollowupHistory([]);

    try {
      const data = await requestLessonExplanation({
        sourceType: activeSourceType,
        content: contentToAnalyze,
        fileName,
        fileMimeType: uploadedFile?.type,
        studentLevel,
      });

      setLessonData(data);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'حدث خطأ أثناء تحليل وشرح الدرس.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Follow-up Question Handler
  const handleSendFollowup = async (customPrompt?: string) => {
    const q = customPrompt || currentQuestion.trim();
    if (!q || !lessonData || isFollowupLoading) return;

    const userMsg: LessonFollowupMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    setFollowupHistory((prev) => [...prev, userMsg]);
    if (!customPrompt) setCurrentQuestion('');
    setIsFollowupLoading(true);

    try {
      const res = await askLessonFollowupQuestion({
        lessonContext: lessonData,
        question: q,
      });

      const botMsg: LessonFollowupMessage = {
        id: `bot_${Date.now()}`,
        role: 'assistant',
        content: res.answer,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        isOutOfLessonContext: res.isOutOfLessonContext,
      };

      setFollowupHistory((prev) => [...prev, botMsg]);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      setFollowupHistory((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: 'تعذر الرد حالياً. يرجى إعادة المحاولة.',
          timestamp: new Date().toLocaleTimeString('ar-EG'),
        },
      ]);
    } finally {
      setIsFollowupLoading(false);
    }
  };

  // Request Quick Alternative (Simpler, Deeper, Solved Example)
  const handleAlternativeMode = async (mode: 'simplify' | 'deepen' | 'solved_example') => {
    if (!lessonData || isAlternativeLoading) return;
    setIsAlternativeLoading(true);

    const titleMap = {
      simplify: '✨ شرح أبسط وميسّر للدرس',
      deepen: '🔬 تعمق هندسي تحليلي متقدم',
      solved_example: '📐 مثال تطبيقي محلول خطوة بخطوة',
    };

    try {
      const text = await requestLessonAlternative({
        lessonContext: lessonData,
        mode,
      });
      setAlternativeResult({
        title: titleMap[mode],
        content: text,
      });
    } catch (err: any) {
      setErrorMsg('تعذر تحميل الشرح البديل.');
    } finally {
      setIsAlternativeLoading(false);
    }
  };

  // Text to Speech
  const toggleSpeech = (textToRead: string) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!('speechSynthesis' in window)) {
      alert('المتصفح لا يدعم القراءة الصوتية.');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <div className="space-y-8 pb-16 font-sans select-none text-slate-100">
      
      {/* =========================================================================
          ZONE 1: Header & Service Banner
          ========================================================================= */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F1D33] via-[#0A1628] to-[#16233B] border-2 border-cyan-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-xs font-bold">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>مدرس الميكاترونكس الأكاديمي الذكي</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              اشرح لي <span className="gold-gradient-text">الدرس</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 font-medium">
              ارفع نصاً أو صورة أو فيديو أو ملفاً وسأشرح المحتوى خطوة بخطوة بدقة هندسية مطلقة ومطابقة للمصدر.
            </p>
          </div>

          {/* Student Level Selector */}
          <div className="bg-[#091527] border border-slate-700/80 rounded-2xl p-2.5 space-y-1.5 shrink-0 w-full md:w-auto">
            <span className="text-[11px] font-bold text-slate-400 block text-right px-1">
              اختر مستوى الشرح الأكاديمي:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-bold">
              {[
                { id: 'beginner', label: 'مبتدئ' },
                { id: 'intermediate', label: 'متوسط' },
                { id: 'advanced', label: 'متقدم' },
                { id: 'specialized', label: 'هندسي متخصص' },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => setStudentLevel(lvl.id as StudentLevel)}
                  className={`px-3 py-2 rounded-xl transition-all text-center ${
                    studentLevel === lvl.id
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          ZONE 2: Multimodal Upload Studio (Text, Image, PDF, Document, Video)
          ========================================================================= */}
      <section className="bg-[#0D1B2A] border border-cyan-500/30 rounded-3xl p-5 sm:p-7 space-y-6 shadow-xl">
        
        {/* Source Mode Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-slate-800">
          {[
            { id: 'text', label: 'إضافة نص', icon: FileText },
            { id: 'image', label: 'رفع صورة (كتاب / رسم / مسألة)', icon: ImageIcon },
            { id: 'pdf', label: 'رفع PDF', icon: FileType },
            { id: 'document', label: 'رفع Word / PPTX / TXT', icon: FileCode },
            { id: 'video', label: 'رفع فيديو تعليمي', icon: Video },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSourceType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSourceType(tab.id as LessonSourceType)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/25 scale-[1.02]'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Input Views per Tab */}
        <div className="space-y-4">
          
          {/* 1. Text Mode */}
          {activeSourceType === 'text' && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 block text-right">
                اكتب أو انسخ محتوى الدرس، القانون، المسألة، أو الأفكار الهندسية:
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="ألصق هنا نص الدرس أو شرح التجربة أو المسألة الحسابية بالتفصيل..."
                rows={6}
                className="w-full p-4 rounded-2xl bg-[#091527] border border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm focus:border-cyan-400 outline-none leading-relaxed transition-colors"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>عدد الحروف: {textInput.length}</span>
                <span className="text-cyan-400">سيتم الشرح بنسبة 100% بناءً على النص المدخل دون اختراع.</span>
              </div>
            </div>
          )}

          {/* 2. File / Image / PDF / Video Drag and Drop Zone */}
          {activeSourceType !== 'text' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                  isDragOver
                    ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
                    : 'border-slate-700 hover:border-cyan-400 bg-[#091527]/80'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileInputChange}
                  accept={
                    activeSourceType === 'image'
                      ? 'image/*'
                      : activeSourceType === 'video'
                      ? 'video/*'
                      : activeSourceType === 'pdf'
                      ? '.pdf,application/pdf'
                      : '.doc,.docx,.ppt,.pptx,.txt'
                  }
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shadow-lg border border-cyan-500/30">
                  {activeSourceType === 'image' && <ImageIcon className="w-8 h-8" />}
                  {activeSourceType === 'video' && <Video className="w-8 h-8" />}
                  {activeSourceType === 'pdf' && <FileType className="w-8 h-8" />}
                  {activeSourceType === 'document' && <FileCode className="w-8 h-8" />}
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">
                    اسحب وأفلت الملف هنا، أو <span className="text-cyan-400 underline">استعرض جهازك</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {activeSourceType === 'image' && 'يدعم الصور عالية الدقة، صفحات الكتب، رسومات الدوائر، ومخططات Arduino'}
                    {activeSourceType === 'video' && 'يدعم ملفات الفيديو MP4 و WebM (سيتم تحليل الشرح الصوتي والمرئي والأجهزة)'}
                    {activeSourceType === 'pdf' && 'يدعم مذكرات ومقررات PDF واستخراج الدروس والصفحات'}
                    {activeSourceType === 'document' && 'يدعم ملفات Word (.docx) و PowerPoint (.pptx) والملفات النصية'}
                  </p>
                </div>
              </div>

              {/* Pre-Analysis Preview HUD */}
              {uploadedFile && (
                <div className="p-4 rounded-2xl bg-[#091527] border border-cyan-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-cyan-400 shrink-0">
                      📎
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{uploadedFile.name}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        الحجم: {(uploadedFile.size / 1024).toFixed(1)} KB | النوع: {uploadedFile.type || 'ملف'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setUploadedFile(null);
                        setFileBase64('');
                        setFilePreviewUrl('');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white text-xs font-bold transition-colors"
                    >
                      تغيير الملف
                    </button>
                  </div>
                </div>
              )}

              {/* Visual Media Preview (Image or Video) */}
              {filePreviewUrl && activeSourceType === 'image' && (
                <div className="p-3 rounded-2xl bg-[#091527] border border-slate-800 overflow-hidden flex justify-center">
                  <img
                    src={filePreviewUrl}
                    alt="معاينة الصورة المرفوعة"
                    className="max-h-72 object-contain rounded-xl shadow-lg border border-slate-700"
                  />
                </div>
              )}

              {filePreviewUrl && activeSourceType === 'video' && (
                <div className="p-3 rounded-2xl bg-[#091527] border border-slate-800 overflow-hidden flex justify-center">
                  <video
                    src={filePreviewUrl}
                    controls
                    className="max-h-72 w-full rounded-xl shadow-lg border border-slate-700"
                  />
                </div>
              )}
            </div>
          )}

        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Primary Action Button: «ابدأ شرح الدرس» */}
        <div className="flex items-center justify-center pt-2">
          <button
            onClick={handleStartExplanation}
            disabled={isAnalyzing}
            className={`px-8 py-4 rounded-2xl text-sm font-black flex items-center gap-3 shadow-2xl transition-all cursor-pointer ${
              isAnalyzing
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 hover:scale-105 active:scale-95 shadow-amber-500/30'
            }`}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>{PROGRESS_STEPS[progressStageIndex].label}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 fill-slate-950" />
                <span>ابدأ شرح الدرس الآن</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </section>

      {/* =========================================================================
          ZONE 3: Progressive Analysis Status HUD (During Generation)
          ========================================================================= */}
      {isAnalyzing && (
        <section className="bg-[#0D1B2A] border-2 border-cyan-500/40 rounded-3xl p-6 shadow-2xl space-y-4 animate-pulse">
          <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
            <span className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-amber-400" />
              <span>مدرس الميكاترونكس الذكي يقوم بفحص وتدقيق المحتوى بدقة علمية...</span>
            </span>
            <span className="font-mono">{progressStageIndex + 1} / 5</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {PROGRESS_STEPS.map((step, idx) => (
              <div
                key={step.id}
                className={`p-3 rounded-xl border text-center text-xs font-bold transition-all ${
                  idx <= progressStageIndex
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-500'
                }`}
              >
                <div className="text-[10px] text-amber-400 font-mono mb-1">مرحلة {idx + 1}</div>
                <div>{step.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =========================================================================
          ZONE 4: Comprehensive 14-Step Grounded Academic Explanation Viewer
          ========================================================================= */}
      {lessonData && !isAnalyzing && (
        <div className="space-y-6">
          
          {/* Scientific Verification Banner */}
          <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-cyan-950/70 border border-emerald-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <span className="font-black text-white text-sm block">
                  شرح مطابق بنسبة 100% للمحتوى المرفوع (خالٍ تماماً من التخمين)
                </span>
                <span className="text-[11px] text-slate-300">
                  المصدر المكتشف: {lessonData.sourceAnalysis.detectedType} | المستوى: {lessonData.studentLevel || studentLevel}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Audio Listen Button */}
              <button
                onClick={() =>
                  toggleSpeech(
                    `${lessonData.lessonTitle}. ${lessonData.coreIdea}. ${lessonData.summary.join('. ')}`
                  )
                }
                className="px-3.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span>{isSpeaking ? 'إيقاف الاستماع' : 'استمع للشرح صوتياً'}</span>
              </button>
            </div>
          </div>

          {/* Unclear Warning Banner (If image or file had blurred/illegible parts) */}
          {lessonData.sourceAnalysis.unclearNotice && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/50 text-amber-200 text-xs font-bold flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>{lessonData.sourceAnalysis.unclearNotice}</span>
            </div>
          )}

          {/* Scientific Errors Found in Source (Explicit correction with quote) */}
          {lessonData.sourceAnalysis.scientificErrorsFound &&
            lessonData.sourceAnalysis.scientificErrorsFound.length > 0 && (
              <div className="p-5 rounded-2xl bg-rose-950/60 border-2 border-rose-500/60 space-y-3">
                <div className="flex items-center gap-2 text-rose-300 font-extrabold text-sm">
                  <AlertTriangle className="w-5 h-5" />
                  <span>تنبيه علمي: تم اكتشاف خطأ في المحتوى المرفوع وتم تصحيحه بوضوح</span>
                </div>
                {lessonData.sourceAnalysis.scientificErrorsFound.map((err, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-slate-900/90 border border-rose-500/30 space-y-1.5 text-xs">
                    <div className="text-slate-300">
                      <span className="font-bold text-rose-400">النص كما ورد في المصدر: </span>
                      <span className="font-mono bg-black/40 px-2 py-0.5 rounded text-rose-300">
                        {err.sourceText}
                      </span>
                    </div>
                    <div className="text-emerald-300 font-bold">
                      <span>التصحيح العلمي الدقيق: </span>
                      <span>{err.correction}</span>
                    </div>
                    <div className="text-slate-400 text-[11px]">{err.explanation}</div>
                  </div>
                ))}
              </div>
            )}

          {/* Master 14-Step Ordered Presentation Container */}
          <div className="bg-[#0D1B2A] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 space-y-8 shadow-2xl">
            
            {/* 1. عنوان الدرس (Lesson Title) */}
            <div className="border-b border-slate-800 pb-5">
              <span className="text-[10px] font-mono font-bold text-amber-400 block mb-1">
                الخطوة 1: عنوان الدرس
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {lessonData.lessonTitle}
              </h2>
            </div>

            {/* 2. ما الذي سنتعلمه؟ (Learning Objectives) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>الخطوة 2: ما الذي سنتعلمه في هذا الدرس؟ (الأهداف التعليمية)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {lessonData.objectives.map((obj, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5 text-xs font-semibold text-slate-200"
                  >
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span>{obj}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. الفكرة الأساسية للدرس (Core Idea) */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-cyan-500/10 border border-amber-500/30 space-y-2">
              <span className="text-xs font-extrabold text-amber-400 block">
                الخطوة 3: الفكرة الأساسية للدرس (Core Concept)
              </span>
              <p className="text-sm text-slate-100 leading-relaxed font-medium">
                {lessonData.coreIdea}
              </p>
            </div>

            {/* 4. شرح المفاهيم واحداً واحداً (Step-by-step Concepts) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm border-b border-slate-800 pb-2">
                <BookOpen className="w-4 h-4" />
                <span>الخطوة 4: شرح المفاهيم الهندسية واحداً واحداً</span>
              </div>
              <div className="space-y-3">
                {lessonData.concepts.map((concept, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 hover:border-cyan-500/40 transition-colors"
                  >
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-mono text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span>{concept.title}</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {concept.explanation}
                    </p>
                    {concept.engineeringNotes && (
                      <div className="pt-2 text-[11px] text-cyan-300 font-semibold border-t border-slate-800/80">
                        💡 ملاحظة هندسية: {concept.engineeringNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 5. شرح المصطلحات الهندسية بطريقة سهلة (Terminology Table) */}
            {lessonData.terminology && lessonData.terminology.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm border-b border-slate-800 pb-2">
                  <Cpu className="w-4 h-4" />
                  <span>الخطوة 5: شرح المصطلحات الهندسية بطريقة سهلة</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {lessonData.terminology.map((term, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{term.termArabic}</span>
                        <span className="text-[10px] font-mono text-cyan-400 font-bold">
                          ({term.termEnglish})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-normal">{term.simpleDefinition}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6 & 7. شرح المعادلات بالتفصيل وتعريف كل رمز ووحدته (Equations & Symbol SI Units) */}
            {lessonData.equations && lessonData.equations.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm border-b border-slate-800 pb-2">
                  <Calculator className="w-4 h-4" />
                  <span>الخطوة 6 و 7: شرح المعادلات وتعريف كل رمز ووحدته الفيزيائية</span>
                </div>

                <div className="space-y-4">
                  {lessonData.equations.map((eq, i) => (
                    <div
                      key={i}
                      className="p-5 rounded-2xl bg-[#091527] border-2 border-cyan-500/30 space-y-4 shadow-lg"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                        <span className="text-xs font-extrabold text-amber-400">
                          {eq.name || `معادلة ${i + 1}`}
                        </span>
                        <div className="px-4 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/40 text-amber-300 font-mono font-bold text-sm sm:text-base">
                          {eq.formula}
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {eq.description}
                      </p>

                      {/* Symbols SI Units Table */}
                      {eq.symbols && eq.symbols.length > 0 && (
                        <div className="overflow-x-auto no-scrollbar">
                          <table className="w-full text-right text-xs">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-400 font-bold">
                                <th className="pb-2">الرمز</th>
                                <th className="pb-2">المعنى الفيزيائي</th>
                                <th className="pb-2">وحدة القياس (SI)</th>
                                <th className="pb-2">القيمة في المصدر</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 font-mono">
                              {eq.symbols.map((sym, sIdx) => (
                                <tr key={sIdx} className="text-slate-200">
                                  <td className="py-2 text-cyan-400 font-bold">{sym.symbol}</td>
                                  <td className="py-2 font-sans">{sym.name}</td>
                                  <td className="py-2 text-emerald-400">{sym.unit}</td>
                                  <td className="py-2 text-amber-400">{sym.valueFromSource || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 8. شرح خطوات الحل بالتسلسل (Step-by-Step Solution) */}
            {lessonData.solutionSteps && lessonData.solutionSteps.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm border-b border-slate-800 pb-2">
                  <Zap className="w-4 h-4" />
                  <span>الخطوة 8: شرح خطوات الحل بالتسلسل</span>
                </div>
                <div className="space-y-2.5">
                  {lessonData.solutionSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3 text-xs"
                    >
                      <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold flex items-center justify-center shrink-0">
                        {step.stepNumber || idx + 1}
                      </span>
                      <div className="space-y-1">
                        <h4 className="font-bold text-white">{step.title}</h4>
                        <p className="text-slate-300 leading-relaxed">{step.description}</p>
                        {step.calculation && (
                          <div className="font-mono text-amber-400 font-bold bg-black/40 px-2.5 py-1 rounded-lg inline-block">
                            {step.calculation}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 9. تطبيق عملي على ما ورد في الدرس (Practical Application) */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-2">
              <span className="text-xs font-bold text-emerald-400 block">
                الخطوة 9: تطبيق عملي على ما ورد في الدرس
              </span>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {lessonData.practicalApplication}
              </p>
            </div>

            {/* 10. شرح الرسومات والمخططات الموجودة في المصدر (Diagrams Explanation) */}
            {lessonData.diagramsExplanation && (
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 space-y-3">
                <span className="text-xs font-bold text-cyan-400 block">
                  الخطوة 10: شرح الرسومات والمخططات الموجودة في المصدر
                </span>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {lessonData.diagramsExplanation}
                </p>

                {/* Detected visual elements list */}
                {lessonData.sourceAnalysis.visualElements &&
                  lessonData.sourceAnalysis.visualElements.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      {lessonData.sourceAnalysis.visualElements.map((elem, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-black/40 border border-slate-800 text-xs space-y-1">
                          <span className="font-bold text-amber-400">{elem.element}</span>
                          <p className="text-slate-300 text-[11px]">{elem.description}</p>
                          <span className="text-[10px] text-cyan-400 block">مسار التوصيل: {elem.connection}</span>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            )}

            {/* Video Timeline Chapters (If Video Source) */}
            {lessonData.sourceAnalysis.timelineParts &&
              lessonData.sourceAnalysis.timelineParts.length > 0 && (
                <div className="p-5 rounded-2xl bg-slate-900 border border-purple-500/40 space-y-3">
                  <span className="text-xs font-bold text-purple-300 block flex items-center gap-2">
                    <Video className="w-4 h-4 text-purple-400" />
                    <span>تقسيم وتوقيت أجزاء الفيديو التعليمي (Video Timeline Breakdown)</span>
                  </span>
                  <div className="space-y-2">
                    {lessonData.sourceAnalysis.timelineParts.map((part, pIdx) => (
                      <div key={pIdx} className="p-3 rounded-xl bg-[#091527] border border-slate-800 text-xs flex items-start gap-3">
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold shrink-0">
                          {part.timeRange}
                        </span>
                        <div>
                          <h4 className="font-bold text-white">{part.title}</h4>
                          <p className="text-slate-300 text-[11px] leading-relaxed">{part.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* 11. ربط المفهوم بتطبيقات الميكاترونكس (Mechatronics Connection) */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-500/40 space-y-2">
              <span className="text-xs font-bold text-blue-300 block flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                <span>الخطوة 11: ربط المفهوم بتطبيقات الميكاترونكس والروبوتات</span>
              </span>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {lessonData.mechatronicsConnection}
              </p>
            </div>

            {/* 12. تلخيص أهم النقاط (Summary) */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-2">
              <span className="text-xs font-bold text-amber-400 block">
                الخطوة 12: تلخيص أهم النقاط
              </span>
              <ul className="space-y-1.5 text-xs sm:text-sm text-slate-200">
                {lessonData.summary.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 13. أسئلة قصيرة للتأكد من فهم الطالب (Interactive Quiz) */}
            {lessonData.quizQuestions && lessonData.quizQuestions.length > 0 && (
              <div className="space-y-4 border-t border-slate-800 pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>الخطوة 13: أسئلة قصيرة للتأكد من فهمك للدرس</span>
                  </div>
                  {!revealedQuizResults && (
                    <button
                      onClick={() => setRevealedQuizResults(true)}
                      className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400"
                    >
                      تحقق من إجاباتي
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {lessonData.quizQuestions.map((q, qIdx) => (
                    <div
                      key={qIdx}
                      className="p-4 rounded-2xl bg-[#091527] border border-slate-800 space-y-3"
                    >
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        {qIdx + 1}. {q.question}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, oIdx) => {
                          const isSelected = selectedQuizAnswers[qIdx] === oIdx;
                          const isCorrect = q.correctIndex === oIdx;
                          let btnStyle = 'bg-slate-900 border-slate-800 text-slate-300';

                          if (revealedQuizResults) {
                            if (isCorrect) {
                              btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold';
                            } else if (isSelected && !isCorrect) {
                              btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-300';
                            }
                          } else if (isSelected) {
                            btnStyle = 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold';
                          }

                          return (
                            <button
                              key={oIdx}
                              onClick={() => {
                                if (!revealedQuizResults) {
                                  setSelectedQuizAnswers({
                                    ...selectedQuizAnswers,
                                    [qIdx]: oIdx,
                                  });
                                }
                              }}
                              className={`p-2.5 rounded-xl border text-right text-xs transition-all ${btnStyle}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {revealedQuizResults && (
                        <div className="p-2.5 rounded-xl bg-slate-900/80 text-[11px] text-cyan-300 border border-slate-800">
                          💡 التفسير العلمي: {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 14. خيارات المتابعة السريعة (Quick Action Exploration) */}
            <div className="border-t border-slate-800 pt-6 space-y-3">
              <span className="text-xs font-bold text-slate-400 block text-right">
                الخطوة 14: خيارات المتابعة والتنقل الذكي
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleAlternativeMode('simplify')}
                  disabled={isAlternativeLoading}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all hover:scale-105"
                >
                  ✨ «شرح أبسط»
                </button>
                <button
                  onClick={() => handleAlternativeMode('deepen')}
                  disabled={isAlternativeLoading}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all hover:scale-105"
                >
                  🔬 «شرح أعمق»
                </button>
                <button
                  onClick={() => handleAlternativeMode('solved_example')}
                  disabled={isAlternativeLoading}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all hover:scale-105"
                >
                  📐 «مثال محلول»
                </button>
                <button
                  onClick={() => {
                    setSelectedQuizAnswers({});
                    setRevealedQuizResults(false);
                    handleSendFollowup('اختبرني بـ 3 أسئلة هندسية جديدة حول هذا الدرس');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all hover:scale-105"
                >
                  🎯 «اختبرني»
                </button>
                <button
                  onClick={handleStartExplanation}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold transition-all"
                >
                  🔄 «أعد الشرح من البداية»
                </button>
              </div>
            </div>

          </div>

          {/* Alternative Result Card (If student clicked Simplify / Deepen / Solved Example) */}
          {alternativeResult && (
            <div className="bg-[#0D1B2A] border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base sm:text-lg font-black text-amber-400">
                  {alternativeResult.title}
                </h3>
                <button
                  onClick={() => setAlternativeResult(null)}
                  className="text-slate-400 hover:text-white text-xs font-bold"
                >
                  إغلاق
                </button>
              </div>
              <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line font-medium">
                {alternativeResult.content}
              </div>
            </div>
          )}

          {/* =========================================================================
              ZONE 5: Interactive Grounded Q&A Assistant ("عدم فقدان المحتوى")
              ========================================================================= */}
          <section className="bg-[#0D1B2A] border border-cyan-500/30 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-extrabold text-white">
                  اسأل مدرس الدرس (محتوى الدرس محفوظ ومستمر طوال الجلسة)
                </h3>
              </div>
              <span className="text-[10px] text-cyan-400 font-mono">سياق الدرس نشط</span>
            </div>

            {/* Quick Question Chips */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs font-bold">
              {[
                'اشرح هذه النقطة أكثر',
                'لم أفهم الخطوة الثانية',
                'أعطني مثالاً آخر',
                'ما سبب استخدام هذا القانون؟',
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSendFollowup(chip)}
                  disabled={isFollowupLoading}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-cyan-400 whitespace-nowrap transition-colors"
                >
                  💬 {chip}
                </button>
              ))}
            </div>

            {/* Conversation Log */}
            {followupHistory.length > 0 && (
              <div className="space-y-3 max-h-80 overflow-y-auto no-scrollbar p-3 rounded-2xl bg-[#091527] border border-slate-800">
                {followupHistory.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-amber-500 text-slate-950 font-bold rounded-br-none'
                          : 'bg-slate-900 border border-slate-700 text-slate-100 rounded-bl-none'
                      }`}
                    >
                      {msg.isOutOfLessonContext && (
                        <span className="text-[10px] font-bold text-amber-400 block mb-1">
                          ⚠️ تنبيه: السؤال يقع خارج سياق الدرس
                        </span>
                      )}
                      <p className="whitespace-pre-line">{msg.content}</p>
                      <span className="text-[9px] opacity-60 block text-left mt-1 font-mono">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
                {isFollowupLoading && (
                  <div className="flex items-center gap-2 text-xs text-cyan-400 p-2 font-mono">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>المدرس يفحص محتوى الدرس ويصيغ الإجابة...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>
            )}

            {/* Chat Input Bar */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendFollowup();
                }}
                placeholder="اسأل أي استفسار أو اطلب توضيحاً لنقطة معينة في هذا الدرس..."
                className="flex-1 px-4 py-3 rounded-2xl bg-[#091527] border border-slate-700 text-slate-100 placeholder:text-slate-500 text-xs sm:text-sm focus:border-cyan-400 outline-none"
              />
              <button
                onClick={() => handleSendFollowup()}
                disabled={isFollowupLoading || !currentQuestion.trim()}
                className="p-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold disabled:opacity-50 hover:scale-105 transition-all shadow-md"
              >
                <Send className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </section>

        </div>
      )}

    </div>
  );
};
