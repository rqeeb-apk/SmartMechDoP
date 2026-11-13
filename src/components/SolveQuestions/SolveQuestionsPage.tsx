import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, FileText, Upload, Camera, Video, Sparkles, Volume2,
  Download, AlertTriangle, RefreshCw, ListChecks, HelpCircle, Check, X,
  BookOpen, Cpu, Trash2, Play
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QuestionFormatType, SolveQuestionsResponse, SolvedQuestionItem } from '../../types';
import { requestSolveQuestions } from '../../services/solveQuestionsApi';
import { processUploadedMedia, ProcessedMediaResult } from '../../services/mediaExtractor';
import { yemeniDoctorVoice, YemeniDialect } from '../../services/lectureHallApi';
import { CameraCaptureModal } from '../common/CameraCaptureModal';
import { SmartBoardCanvas } from '../LectureHall/SmartBoardCanvas';

const QUESTION_TYPE_META: Record<
  QuestionFormatType,
  { label: string; badgeClass: string; iconLabel: string }
> = {
  automation: {
    label: 'أتمتة',
    badgeClass: 'bg-[#E0F2FE] border-[#0EA5E9]/40 text-[#0284C7] dark:bg-purple-500/20 dark:border-purple-400/50 dark:text-purple-200',
    iconLabel: '⚡',
  },
  mcq: {
    label: 'اختيارات',
    badgeClass: 'bg-[#E0F2FE] border-[#0EA5E9]/40 text-[#0284C7] dark:bg-cyan-500/20 dark:border-cyan-400/50 dark:text-cyan-200',
    iconLabel: '🔘',
  },
  true_false: {
    label: 'صح وخطأ',
    badgeClass: 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-500/20 dark:border-emerald-400/50 dark:text-emerald-200',
    iconLabel: '✓✗',
  },
  essay: {
    label: 'مقالي',
    badgeClass: 'bg-[#FAF5E8] border-[rgba(212,175,55,0.5)] text-[#0F172A] dark:bg-amber-500/20 dark:border-amber-400/50 dark:text-amber-200',
    iconLabel: '📝',
  },
  direct: {
    label: 'مباشر / مسألة',
    badgeClass: 'bg-[#E0F2FE] border-[#0EA5E9]/40 text-[#0284C7] dark:bg-blue-500/20 dark:border-blue-400/50 dark:text-blue-200',
    iconLabel: '📐',
  },
};

export const SolveQuestionsPage: React.FC = () => {
  const [questionsText, setQuestionsText] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [dialect, setDialect] = useState<YemeniDialect>('sanani');
  const [processedMedia, setProcessedMedia] = useState<ProcessedMediaResult | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isReadingMedia, setIsReadingMedia] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [solutionData, setSolutionData] = useState<SolveQuestionsResponse | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | QuestionFormatType>('all');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSmartBoard, setShowSmartBoard] = useState(true);

  useEffect(() => {
    return () => {
      yemeniDoctorVoice.stop();
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    setIsReadingMedia(true);
    try {
      const processed = await processUploadedMedia(file);
      setProcessedMedia(processed);
    } catch {
      setErrorMsg('تعذر قراءة الملف المرفوع. يرجى المحاولة بصورة أو ملف PDF/نص واضح.');
    } finally {
      setIsReadingMedia(false);
    }
  };

  const handleCameraCapture = (dataUrl: string, fileName: string) => {
    setProcessedMedia({
      content: dataUrl,
      mimeType: 'image/jpeg',
      fileName,
      mediaKind: 'image',
      previewUrl: dataUrl,
    });
  };

  const handleSolveSubmit = async () => {
    const hasMedia = Boolean(
      processedMedia?.content || (processedMedia?.videoFrames && processedMedia.videoFrames.length > 0)
    );
    if (!questionsText.trim() && !hasMedia) {
      setErrorMsg('يرجى كتابة الأسئلة أو رفع ورقة الأسئلة (صورة / PDF / ملف / فيديو) ثم الضغط على «حل».');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setActiveFilter('all');
    yemeniDoctorVoice.stop();
    setIsSpeaking(false);

    try {
      const result = await requestSolveQuestions({
        questionsText,
        extraNotes: extraNotes.trim() || undefined,
        uploadedContent: processedMedia?.content,
        uploadedMimeType: processedMedia?.mimeType,
        videoFrames: processedMedia?.videoFrames,
        fileName: processedMedia?.fileName,
        dialect,
      });

      setSolutionData(result);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });

      if (result.doctorOverviewSpeech) {
        yemeniDoctorVoice.speak(
          result.doctorOverviewSpeech,
          () => setIsSpeaking(true),
          () => setIsSpeaking(false),
          () => setIsSpeaking(false)
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'تعذر استخراج وحل الأسئلة الآن. يرجى المحاولة مجدداً.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeakQuestion = (q: SolvedQuestionItem) => {
    const speech = `السؤال رقم ${q.questionNumber}: ${q.finalAnswerSummary}. والسبب: ${q.reasonAndExplanation}`;
    yemeniDoctorVoice.speak(
      speech,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      () => setIsSpeaking(false)
    );
  };

  const handleExportSolutions = () => {
    if (!solutionData) return;
    const lines = [
      '====================================================',
      'منصة دكتور الميكاترونكس الذكي - خدمة حل أسئلتي',
      `عنوان الورقة: ${solutionData.examTitle}`,
      `التخصص: ${solutionData.subjectArea} | عدد الأسئلة: ${solutionData.questions.length}`,
      '====================================================',
      '',
      ...solutionData.questions.flatMap((q) => [
        `[سؤال #${q.questionNumber} · ${QUESTION_TYPE_META[q.questionType]?.label || q.questionType}]`,
        q.questionText,
        ...(q.options && q.options.length > 0 ? q.options.map((o) => `   - ${o}`) : []),
        `✅ ملخص الحل: ${q.finalAnswerSummary}`,
        `💡 السبب للوصول لهذا الحل: ${q.reasonAndExplanation}`,
        ...(q.steps && q.steps.length > 0 ? ['الخطوات:', ...q.steps.map((s, idx) => `   ${idx + 1}. ${s}`)] : []),
        '----------------------------------------------------',
      ]),
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(solutionData.examTitle || 'حل_الأسئلة').replace(/[\/\\?%*:|"<>]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredQuestions =
    solutionData?.questions?.filter((q) => activeFilter === 'all' || q.questionType === activeFilter) || [];

  const smartBoardData = solutionData
    ? {
        doctorSpeech: solutionData.doctorOverviewSpeech,
        boardTitle: solutionData.examTitle || 'ملخص حل ورقة الأسئلة',
        boardNotes: solutionData.boardSummaryNotes || [],
        boardEquation: solutionData.boardKeyFormula,
        diagramType: solutionData.diagramType || 'circuit',
        diagramTitle: `خريطة الحل · ${solutionData.subjectArea || 'هندسة الميكاترونكس'}`,
      }
    : null;

  return (
    <div className="space-y-6 pb-20 w-full max-w-full overflow-x-hidden min-w-0 font-sans text-[#0F172A] dark:text-slate-100">
      {/* Header */}
      <section className="champagne-card dark:bg-gradient-to-br dark:from-[#0E1E36] dark:via-[#091629] dark:to-[#0E2439] dark:border-2 dark:border-emerald-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1.5 text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E0F2FE] dark:bg-emerald-500/15 border border-[#0EA5E9]/30 dark:border-emerald-400/40 text-[#0284C7] dark:text-emerald-300 text-xs font-black">
            <ListChecks className="w-4 h-4" />
            <span>الخدمة 3 · حل أسئلتي الشامل (حتى 30+ سؤال في الورقة الواحدة)</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-[#0F172A] dark:text-white">
            حل جميع الأسئلة مع <span className="text-[#0EA5E9] dark:text-amber-400">ملخص الحل والسبب العلمي</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#475569] dark:text-slate-300 max-w-3xl">
            اطرح سؤالك أو ارفع ورقة الأسئلة (صورة / كاميرا / ملف PDF-Word / فيديو)، واضغط «حل» ليقوم الدكتور باستخراج وحل كافة الأسئلة (أتمتة، اختيارات، صح وخطأ، مقالي، ومباشر).
          </p>
        </div>

        {/* Yemeni Dialect Toggle for Doctor Overview Voice */}
        <div className="flex items-center bg-white dark:bg-[#070F1E] p-1 rounded-2xl border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-xs font-bold shrink-0 shadow-sm">
          {[
            { id: 'sanani', label: 'صنعاني 🇾🇪' },
            { id: 'adani', label: 'عدني 🏖️' },
            { id: 'taizzi', label: 'تعزي 🏰' },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setDialect(d.id as YemeniDialect)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                dialect === d.id
                  ? 'bg-[#0EA5E9] text-white dark:bg-emerald-500 dark:text-slate-950 font-black shadow-sm'
                  : 'text-[#475569] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </section>

      {/* Input Sheet & Attachments Panel */}
      <section className="champagne-card dark:bg-[#0A1628] dark:border-2 dark:border-emerald-500/35 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Questions Textarea */}
          <div className="lg:col-span-7 space-y-3">
            <label className="text-xs font-black text-[#0F172A] dark:text-emerald-300 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-[#0EA5E9] dark:text-emerald-400" />
              <span>اكتب سؤالك أو الصق ورقة الأسئلة كاملة (من سؤال واحد حتى 30+ سؤال):</span>
            </label>
            <textarea
              rows={5}
              value={questionsText}
              onChange={(e) => setQuestionsText(e.target.value)}
              placeholder="مثال: الصق هنا أسئلة الاختيارات أو الصح والخطأ أو الأتمتة أو المسائل المقالية والمباشرة..."
              className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-[#0F172A] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs sm:text-sm focus:border-[#0EA5E9] dark:focus:border-emerald-400 focus:outline-none resize-y shadow-inner"
            />
            <input
              type="text"
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              placeholder="ملاحظة إضافية للدكتور (اختياري): مثلاً حل الأسئلة من 1 إلى 30 ووضح القوانين المستخدمة..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-[#0F172A] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:border-[#0EA5E9] dark:focus:border-amber-400 outline-none"
            />
          </div>

          {/* Exam Sheet Upload Options */}
          <div className="lg:col-span-5 space-y-3">
            <label className="text-xs font-black text-[#0F172A] dark:text-amber-300 block">
              أو ارفع ورقة الأسئلة / ملف / فيديو / التقط صورة:
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="p-3 rounded-2xl champagne-subcard dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-cyan-500/35 hover:border-[#0EA5E9] dark:hover:border-amber-400 cursor-pointer flex flex-col items-center justify-center gap-1.5 text-center text-xs font-bold text-[#0F172A] dark:text-slate-200 transition-all">
                <span className="w-9 h-9 rounded-xl sky-icon-box flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </span>
                <span>ورقة / ملف PDF-Word</span>
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="p-3 rounded-2xl champagne-subcard dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-emerald-500/35 hover:border-[#0EA5E9] dark:hover:border-amber-400 flex flex-col items-center justify-center gap-1.5 text-center text-xs font-bold text-[#0F172A] dark:text-slate-200 transition-all cursor-pointer"
              >
                <span className="w-9 h-9 rounded-xl sky-icon-box flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </span>
                <span>تصوير ورقة الأسئلة</span>
              </button>

              <label className="col-span-2 p-3 rounded-2xl champagne-subcard dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-purple-500/35 hover:border-[#0EA5E9] dark:hover:border-amber-400 cursor-pointer flex items-center justify-center gap-2 text-xs font-bold text-[#0F172A] dark:text-slate-200 transition-all">
                <span className="w-7 h-7 rounded-lg sky-icon-box flex items-center justify-center shrink-0">
                  <Video className="w-4 h-4" />
                </span>
                <span>رفع فيديو يحتوي على الأسئلة أو الشرح</span>
                <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {isReadingMedia && (
              <div className="text-xs text-[#0284C7] dark:text-amber-300 font-bold text-center animate-pulse">
                جاري تجهيز المرفق للقراءة الدقيقة...
              </div>
            )}

            {processedMedia && (
              <div className="p-2.5 rounded-xl bg-[#E0F2FE] dark:bg-emerald-500/10 border border-[#0EA5E9]/40 dark:border-emerald-500/40 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  {processedMedia.previewUrl && processedMedia.mediaKind === 'image' && (
                    <img src={processedMedia.previewUrl} alt="ورقة الأسئلة" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-[#0F172A] dark:text-emerald-300 truncate">{processedMedia.fileName}</div>
                    <div className="text-[10px] text-[#475569] dark:text-slate-300">جاهز لاستخراج وحل جميع الأسئلة</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProcessedMedia(null)}
                  className="p-1.5 rounded-lg text-rose-500 dark:text-rose-400 hover:bg-rose-500/15"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Big «حل» Button + Quick Formats Info */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#475569] dark:text-slate-300">
            <span className="font-bold text-[#0F172A] dark:text-amber-300">الصيغ المدعومة:</span>
            {Object.values(QUESTION_TYPE_META).map((m) => (
              <span key={m.label} className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.3)] dark:border-slate-800 text-[#0F172A] dark:text-slate-200">
                {m.iconLabel} {m.label}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSolveSubmit}
            disabled={isLoading || isReadingMedia}
            className={`px-10 py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-lg transition-all shrink-0 cursor-pointer ${
              isLoading || isReadingMedia
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                : 'bg-[#0EA5E9] hover:bg-[#0284C7] text-white dark:bg-gradient-to-r dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 dark:text-slate-950 hover:scale-[1.02] active:scale-95 shadow-sky-500/25 dark:shadow-emerald-500/30'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isLoading ? 'جاري استخراج وحل جميع الأسئلة...' : 'حل'}</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={handleSolveSubmit}
              className="px-3 py-1.5 rounded-lg bg-rose-600 dark:bg-rose-500/25 text-white font-bold flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        )}
      </section>

      {/* Solution Results Dashboard */}
      {solutionData && (
        <div className="space-y-6">
          {/* Summary Overview Banner */}
          <section className="champagne-card dark:bg-[#0D1B2A] dark:border-2 dark:border-amber-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-[#E0F2FE] dark:bg-emerald-500/20 border border-[#0EA5E9]/40 dark:border-emerald-400/50 text-[#0284C7] dark:text-emerald-300 text-xs font-black">
                    تم حل {solutionData.questions?.length || solutionData.totalQuestionsFound} سؤال بنجاح
                  </span>
                  <span className="text-xs font-mono text-[#0284C7] dark:text-cyan-300">{solutionData.subjectArea}</span>
                </div>
                <h2 className="text-lg sm:text-2xl font-black text-[#0F172A] dark:text-white mt-1">{solutionData.examTitle}</h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isSpeaking) {
                      yemeniDoctorVoice.stop();
                      setIsSpeaking(false);
                    } else if (solutionData.doctorOverviewSpeech) {
                      yemeniDoctorVoice.speak(
                        solutionData.doctorOverviewSpeech,
                        () => setIsSpeaking(true),
                        () => setIsSpeaking(false),
                        () => setIsSpeaking(false)
                      );
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#E0F2FE] dark:bg-amber-500/20 border border-[#0EA5E9]/35 dark:border-amber-400/50 text-[#0284C7] dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{isSpeaking ? 'إيقاف الصوت' : 'استمع لملخص الدكتور'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSmartBoard(!showSmartBoard)}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-[#F8FAFC] dark:hover:bg-slate-700 text-[#0F172A] dark:text-cyan-300 text-xs font-bold border border-[rgba(212,175,55,0.35)] dark:border-slate-700 cursor-pointer"
                >
                  {showSmartBoard ? 'إخفاء السبورة' : 'عرض السبورة الذكية'}
                </button>

                <button
                  type="button"
                  onClick={handleExportSolutions}
                  className="px-3.5 py-2 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>تصدير الحلول TXT</span>
                </button>
              </div>
            </div>

            {solutionData.doctorOverviewSpeech && (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950/70 border border-[rgba(212,175,55,0.3)] dark:border-amber-500/25 text-xs sm:text-sm text-[#0F172A] dark:text-slate-200 leading-relaxed">
                {solutionData.doctorOverviewSpeech}
              </div>
            )}

            {/* Format Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-[#0EA5E9] text-white dark:bg-amber-400 dark:text-slate-950'
                    : 'bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-800 text-[#475569] dark:text-slate-300'
                }`}
              >
                الكل ({solutionData.questions?.length || 0})
              </button>
              {(Object.keys(QUESTION_TYPE_META) as QuestionFormatType[]).map((fmt) => {
                const count = (solutionData.questions || []).filter((q) => q.questionType === fmt).length;
                if (count === 0) return null;
                const meta = QUESTION_TYPE_META[fmt];
                return (
                  <button
                    key={fmt}
                    onClick={() => setActiveFilter(fmt)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                      activeFilter === fmt
                        ? 'bg-[#0EA5E9] text-white dark:bg-cyan-500 dark:text-slate-950 font-black'
                        : 'bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-800 text-[#475569] dark:text-slate-300'
                    }`}
                  >
                    {meta.iconLabel} {meta.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Quick Number Jump Bar (Helpful when sheet has 30 questions) */}
            {filteredQuestions.length > 5 && (
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1">
                <span className="text-[11px] text-[#475569] dark:text-slate-400 font-bold shrink-0 ml-1">انتقال سريع:</span>
                {filteredQuestions.map((q) => (
                  <a
                    key={q.questionNumber}
                    href={`#solved-q-${q.questionNumber}`}
                    className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 hover:bg-[#0EA5E9] hover:text-white dark:hover:bg-amber-500 dark:hover:text-slate-950 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-[#0F172A] dark:text-slate-200 text-[11px] font-mono font-bold flex items-center justify-center shrink-0 transition-colors"
                  >
                    {q.questionNumber}
                  </a>
                ))}
              </div>
            )}
          </section>

          {/* Optional Smart Board Summary */}
          {showSmartBoard && smartBoardData && (
            <SmartBoardCanvas
              lectureData={smartBoardData}
              isSpeaking={isSpeaking}
              activeDialect={dialect}
            />
          )}

          {/* Individual Question Cards (1..30+) */}
          <div className="space-y-4">
            {filteredQuestions.map((q) => {
              const typeMeta = QUESTION_TYPE_META[q.questionType] || QUESTION_TYPE_META.direct;
              return (
                <article
                  id={`solved-q-${q.questionNumber}`}
                  key={q.questionNumber}
                  className="champagne-card dark:bg-[#0D1B2A] dark:border-cyan-500/30 hover:border-[#0EA5E9] dark:hover:border-amber-400/50 rounded-2xl p-4 sm:p-5 space-y-3 transition-colors"
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(212,175,55,0.25)] dark:border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-[#0EA5E9] text-white dark:bg-amber-500 dark:text-slate-950 font-black text-xs font-mono">
                        سؤال #{q.questionNumber}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${typeMeta.badgeClass}`}>
                        {typeMeta.iconLabel} {typeMeta.label}
                      </span>
                      {q.keyFormula && (
                        <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[#0284C7] dark:text-cyan-300 font-mono text-[11px]" dir="ltr">
                          {q.keyFormula}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSpeakQuestion(q)}
                      className="px-3 py-1 rounded-lg bg-[#E0F2FE] hover:bg-[#0EA5E9] text-[#0284C7] hover:text-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>اسمع السبب والحل</span>
                    </button>
                  </div>

                  {/* Extracted Question Text */}
                  <p className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-white leading-relaxed">
                    {q.questionText}
                  </p>

                  {/* Choices list if MCQ/Automation */}
                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-[#475569] dark:text-slate-300">
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Final Summarized Answer + Reason Why */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="p-3.5 rounded-2xl bg-[#E0F2FE]/60 dark:bg-emerald-500/10 border border-[#0EA5E9]/35 dark:border-emerald-500/40 space-y-1">
                      <div className="text-xs font-black text-[#0284C7] dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>ملخص الحل / الإجابة النهائية</span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white leading-relaxed">
                        {q.finalAnswerSummary}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white dark:bg-amber-500/10 border border-[rgba(212,175,55,0.4)] dark:border-amber-500/40 space-y-1">
                      <div className="text-xs font-black text-[#0F172A] dark:text-amber-300 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#0EA5E9] dark:text-amber-300" />
                        <span>السبب للوصول لهذا الحل</span>
                      </div>
                      <p className="text-xs sm:text-sm text-[#475569] dark:text-slate-100 leading-relaxed">
                        {q.reasonAndExplanation}
                      </p>
                    </div>
                  </div>

                  {/* Step-by-Step Derivation if available */}
                  {q.steps && q.steps.length > 0 && (
                    <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                      <div className="font-bold text-[#0284C7] dark:text-cyan-300">خطوات الحل المرتبة:</div>
                      <ol className="list-decimal list-inside space-y-1 text-[#475569] dark:text-slate-300">
                        {q.steps.map((st, sIdx) => (
                          <li key={sIdx}>{st}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}

      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
};
