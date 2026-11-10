import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FileText, Sparkles, Upload, Download, Copy, Share2, Search,
  CheckCircle2, AlertTriangle, BookOpen, Calculator, Layers,
  Printer, ArrowLeft, RefreshCw, Trash2, Clock, Check, HelpCircle,
  FileCode, Image as ImageIcon, FileType, ChevronDown, ChevronUp,
  Cpu, Award, Bookmark, BookmarkCheck, ExternalLink, ShieldCheck, Zap
} from 'lucide-react';
import {
  LectureSummaryData,
  SummaryType,
  SavedSummaryItem
} from '../../types';
import {
  requestLectureSummary,
  requestLectureSummaryStream,
  requestSummaryTransformation,
  getStoredSummaries,
  saveSummaryToStorage,
  deleteSavedSummary
} from '../../services/summarizeApi';
import { readFileAsBase64OrText } from '../../services/explainLessonApi';
import confetti from 'canvas-confetti';

const PROGRESS_STEPS = [
  'جاري قراءة الملف...',
  'جاري استخراج المعلومات...',
  'جاري تحديد النقاط المهمة...',
  'جاري ترتيب الملخص...',
  'جاري تجهيز ورقة المراجعة...',
];

const SUMMARY_TYPES_CONFIG: {
  id: SummaryType;
  label: string;
  desc: string;
  badge: string;
}[] = [
  {
    id: 'quick',
    label: 'ملخص سريع',
    desc: 'ملخص قصير جداً للمراجعة السريعة في 3 دقائق.',
    badge: '⚡ سريع',
  },
  {
    id: 'medium',
    label: 'ملخص متوسط',
    desc: 'واضح يحتوي على أهم الأفكار والقوانين والتعريفات بتوازن.',
    badge: '⚖️ متوازن',
  },
  {
    id: 'comprehensive',
    label: 'ملخص شامل',
    desc: 'مفصل يحافظ على معظم المعلومات المهمة مع حذف الحشو.',
    badge: '📚 شامل',
  },
  {
    id: 'study',
    label: 'ملخص للمذاكرة',
    desc: 'يركز على النقاط المرشحة للاختبارات التي يجب حفظها وفهمها.',
    badge: '🎯 للاختبار',
  },
  {
    id: 'cheatsheet',
    label: 'ورقة مراجعة',
    desc: 'تحويل المحاضرة إلى جدول وقوائم مكثفة وسهلة القراءة ليلة الامتحان.',
    badge: '📑 Cheat Sheet',
  },
];

export const SummarizePage: React.FC = () => {
  // Input State
  const [selectedType, setSelectedType] = useState<SummaryType>('medium');
  const [activeTab, setActiveTab] = useState<'upload' | 'text' | 'history'>('upload');
  const [textInput, setTextInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Execution & Progress State
  const [isLoading, setIsLoading] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [streamStatusMessage, setStreamStatusMessage] = useState<string>('');
  const [streamChunkText, setStreamChunkText] = useState<string>('');

  // Result & Saved Summaries State
  const [summaryData, setSummaryData] = useState<LectureSummaryData | null>(null);
  const [savedSummaries, setSavedSummaries] = useState<SavedSummaryItem[]>([]);
  const [isCurrentSaved, setIsCurrentSaved] = useState(false);

  // Search filter inside summary
  const [searchQuery, setSearchQuery] = useState('');

  // Transform Modal / Result State
  const [transformedResult, setTransformedResult] = useState<{ title: string; content: string } | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  useEffect(() => {
    setSavedSummaries(getStoredSummaries());
  }, []);

  // Progress animation
  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setProgressIndex((prev) => (prev < PROGRESS_STEPS.length - 1 ? prev + 1 : prev));
      }, 2200);
    } else {
      setProgressIndex(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Handle File Input
  const handleFileProcess = async (file: File) => {
    setUploadedFile(file);
    setErrorMsg('');
    try {
      const read = await readFileAsBase64OrText(file);
      setFileBase64(read.content);
    } catch (e) {
      setErrorMsg('تعذر قراءة الملف. يرجى تجربة ملف آخر.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  // Run Summarization with Vercel AI SDK progressive streaming
  const handleGenerateSummary = async () => {
    let contentToAnalyze = '';
    let fileName = '';

    if (activeTab === 'text') {
      if (!textInput.trim()) {
        setErrorMsg('يرجى إدخال أو نسخ نص المحاضرة أولاً.');
        return;
      }
      contentToAnalyze = textInput.trim();
      fileName = 'نص المحاضرة';
    } else {
      if (!uploadedFile || !fileBase64) {
        setErrorMsg('يرجى اختيار أو سحب ملف المحاضرة أولاً.');
        return;
      }
      contentToAnalyze = fileBase64;
      fileName = uploadedFile.name;
    }

    setIsLoading(true);
    setErrorMsg('');
    setTransformedResult(null);
    setSearchQuery('');
    setIsCurrentSaved(false);
    setStreamChunkText('');
    setStreamStatusMessage('جاري الاتصال المباشر بنموذج الذكاء الاصطناعي عبر Vercel AI SDK streamText...');

    try {
      const data = await requestLectureSummaryStream(
        {
          summaryType: selectedType,
          content: contentToAnalyze,
          fileName,
          fileMimeType: uploadedFile?.type,
        },
        {
          onStart: () => {
            setStreamStatusMessage('تم استلام المحتوى وبدء بث التلخيص مباشرة...');
          },
          onStatus: (_stage, message) => {
            setStreamStatusMessage(message);
          },
          onChunk: (accumulated) => {
            setStreamChunkText(accumulated);
          },
          onComplete: (completedData) => {
            setSummaryData({
              ...completedData,
              id: `sum_${Date.now()}`,
              fileName,
              createdAt: new Date().toISOString(),
            });
          },
          onError: (err) => {
            setErrorMsg(err.message || 'حدث خطأ أثناء بث التلخيص.');
          },
        }
      );

      setSummaryData({
        ...data,
        id: `sum_${Date.now()}`,
        fileName,
        createdAt: new Date().toISOString(),
      });

      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'حدث خطأ أثناء إنشاء الملخص.');
    } finally {
      setIsLoading(false);
    }
  };

  // Save Current Summary to «ملخصاتي»
  const handleSaveToMySummaries = () => {
    if (!summaryData) return;
    const newItem: SavedSummaryItem = {
      id: summaryData.id || `sum_${Date.now()}`,
      fileName: summaryData.fileName || 'ملخص محاضرة',
      title: summaryData.title,
      summaryType: summaryData.summaryType,
      createdAt: summaryData.createdAt || new Date().toISOString(),
      data: summaryData,
    };
    const updated = saveSummaryToStorage(newItem);
    setSavedSummaries(updated);
    setIsCurrentSaved(true);
  };

  // Delete from «ملخصاتي»
  const handleDeleteSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteSavedSummary(id);
    setSavedSummaries(updated);
  };

  // Transform mode trigger
  const handleTransform = async (mode: 'to_questions' | 'extract_formulas' | 'extract_definitions' | 'explain_hard_points') => {
    if (!summaryData || isTransforming) return;
    setIsTransforming(true);

    const titles = {
      to_questions: '📝 بنك أسئلة مراجعة شامل من المحاضرة',
      extract_formulas: '📐 بطاقة القوانين والمعادلات الهندسية',
      extract_definitions: '📚 معجم التعريفات والمفاهيم الأساسية',
      explain_hard_points: '💡 شرح وتبسيط النقاط الصعبة في المحاضرة',
    };

    try {
      const text = await requestSummaryTransformation(summaryData, mode);
      setTransformedResult({
        title: titles[mode],
        content: text,
      });
    } catch (err: any) {
      setErrorMsg('تعذر تحويل الملخص.');
    } finally {
      setIsTransforming(false);
    }
  };

  // Copy text to clipboard
  const handleCopySummary = () => {
    if (!summaryData) return;
    const text = `ملخص: ${summaryData.title}
الفكرة العامة:
${summaryData.generalIdea}

أهم النقاط:
${summaryData.keyPoints.map((p) => `• ${p}`).join('\n')}

المفاهيم والتعريفات:
${summaryData.conceptsAndDefinitions.map((c) => `- ${c.termArabic} ${c.termEnglish ? `(${c.termEnglish})` : ''}: ${c.definition}`).join('\n')}

القوانين والمعادلات:
${summaryData.equations.map((e) => `${e.name || 'قانون'}: ${e.formula}\n${e.symbolMeanings.map((s) => `  ${s.symbol}: ${s.meaning} (${s.unit})`).join('\n')}\nاستخدامه: ${e.usageContext}`).join('\n\n')}

الخلاصة:
${summaryData.conclusion}`;

    navigator.clipboard.writeText(text);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  // Share summary
  const handleShare = async () => {
    if (navigator.share && summaryData) {
      try {
        await navigator.share({
          title: summaryData.title,
          text: `ملخص: ${summaryData.title}\n${summaryData.generalIdea}`,
        });
      } catch (e) {
        handleCopySummary();
      }
    } else {
      handleCopySummary();
    }
  };

  // Download Formatted View / Word / Text
  const handleDownloadDoc = () => {
    if (!summaryData) return;
    const content = `================================================
منصة دكتور الميكاترونكس الذكي - خدمة «لخّص لي»
================================================
عنوان المحاضرة: ${summaryData.title}
نوع الملخص: ${summaryData.summaryType}
تاريخ التلخيص: ${new Date().toLocaleDateString('ar-EG')}

الفكرة العامة:
${summaryData.generalIdea}

أهم النقاط:
${summaryData.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

المفاهيم والتعريفات الهندسية:
${summaryData.conceptsAndDefinitions.map((c) => `- ${c.termArabic} ${c.termEnglish ? `(${c.termEnglish})` : ''}: ${c.definition}`).join('\n')}

القوانين والمعادلات الهندسية:
${summaryData.equations.map((e) => `[ ${e.formula} ] - ${e.name || ''}\n${e.symbolMeanings.map((s) => `  * ${s.symbol}: ${s.meaning} (${s.unit})`).join('\n')}\n  طريقة الاستخدام: ${e.usageContext}`).join('\n\n')}

الأمثلة التطبيقية:
${summaryData.examples.map((ex, i) => `مثال ${i + 1}: ${ex.problem}\nطريقة الحل: ${ex.solutionOutline}\nالنتيجة: ${ex.result || 'مكتملة'}`).join('\n\n')}

الملاحظات الهامة:
${summaryData.importantNotes.map((n) => `! ${n}`).join('\n')}

الخلاصة:
${summaryData.conclusion}
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${summaryData.title.replace(/[\/\\?%*:|"<>]/g, '_')}_ملخص.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Search matching filter
  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.trim().toLowerCase());
  };

  return (
    <div className="space-y-8 pb-16 font-sans select-none text-slate-100">
      
      {/* =========================================================================
          ZONE 1: Header Banner
          ========================================================================= */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F1D33] via-[#0A1628] to-[#1a1c38] border-2 border-amber-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-bold">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>مساعد التلخيص والمراجعة السريعة</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              لخّص <span className="gold-gradient-text">لي</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 font-medium">
              حوّل محاضراتك وملفاتك الطويلة إلى ملخص واضح وسهل للمراجعة والامتحانات دون فقدان القوانين والأفكار الأساسية.
            </p>
          </div>

          {/* Quick tab switcher (Upload / Text / Saved) */}
          <div className="bg-[#091527] border border-slate-700 rounded-2xl p-1.5 flex items-center gap-1 shrink-0 w-full md:w-auto">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'upload'
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📁 رفع ملف
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'text'
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ✍️ إضافة نص
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 justify-center ${
                activeTab === 'history'
                  ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>ملخصاتي ({savedSummaries.length})</span>
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          ZONE 2: Saved Summaries Drawer / View («ملخصاتي»)
          ========================================================================= */}
      {activeTab === 'history' && (
        <section className="bg-[#0D1B2A] border border-cyan-500/30 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-extrabold text-white">الملخصات المحفوظة بحسابك</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              إجمالي المحفوظات: {savedSummaries.length}
            </span>
          </div>

          {savedSummaries.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <p className="text-sm">لا توجد ملخصات محفوظة حتى الآن.</p>
              <p className="text-xs text-slate-500">قم بتلخيص محاضرة جديدة واضغط «حفظ في ملخصاتي» للرجوع إليها لاحقاً.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedSummaries.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSummaryData(item.data);
                    setIsCurrentSaved(true);
                  }}
                  className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-400 cursor-pointer transition-all hover:scale-[1.02] space-y-2 relative group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                      {SUMMARY_TYPES_CONFIG.find((t) => t.id === item.summaryType)?.label || item.summaryType}
                    </span>
                    <button
                      onClick={(e) => handleDeleteSaved(item.id, e)}
                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="حذف من المحفوظات"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 line-clamp-1">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {item.data.generalIdea}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-800/80">
                    <span>{item.fileName}</span>
                    <span>{new Date(item.createdAt).toLocaleDateString('ar-EG')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          ZONE 3: Upload Studio & Summarization Types
          ========================================================================= */}
      {activeTab !== 'history' && (
        <section className="bg-[#0D1B2A] border border-amber-500/30 rounded-3xl p-5 sm:p-7 space-y-6 shadow-xl">
          
          {/* Upload Dropzone */}
          {activeTab === 'upload' && (
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
                    : 'border-slate-700 hover:border-amber-400 bg-[#091527]/80'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileProcess(f);
                  }}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/*"
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shadow-lg border border-amber-500/30">
                  <Upload className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <p className="text-base font-extrabold text-white">
                    ارفع الملف هنا
                  </p>
                  <p className="text-xs text-slate-400 font-mono">
                    PDF | Word | PowerPoint | صورة | نص
                  </p>
                </div>
              </div>

              {/* Uploaded File Chip */}
              {uploadedFile && (
                <div className="p-3.5 rounded-2xl bg-[#091527] border border-amber-500/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📎</span>
                    <div>
                      <span className="font-bold text-white block">{uploadedFile.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {(uploadedFile.size / 1024).toFixed(1)} KB | {uploadedFile.type || 'ملف'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setUploadedFile(null);
                      setFileBase64('');
                    }}
                    className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                  >
                    تغيير
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Text Input Mode */}
          {activeTab === 'text' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block text-right">
                اكتب أو ألصق نص المحاضرة / الملزمة لتلخيصها:
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="ألصق هنا نصوص المحاضرات، القوانين، أو المذكرات الدراسية..."
                rows={6}
                className="w-full p-4 rounded-2xl bg-[#091527] border border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm focus:border-amber-400 outline-none leading-relaxed transition-colors"
              />
              <span className="text-[11px] text-slate-500 font-mono block text-left">
                عدد الحروف: {textInput.length}
              </span>
            </div>
          )}

          {/* Summarization Type Picker (5 Modes) */}
          <div className="space-y-3 border-t border-slate-800 pt-5">
            <span className="text-xs font-extrabold text-white block text-right">
              اختر طريقة التلخيص:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
              {SUMMARY_TYPES_CONFIG.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedType(t.id)}
                  className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                    selectedType === t.id
                      ? 'bg-amber-500/20 border-amber-400 shadow-md shadow-amber-500/20 text-white'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black">{t.label}</span>
                    <span className="text-[10px] font-mono">{t.badge}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal line-clamp-2">
                    {t.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Primary Action Button: «إنشاء الملخص» */}
          <div className="flex items-center justify-center pt-2">
            <button
              onClick={handleGenerateSummary}
              disabled={isLoading}
              className={`px-10 py-4 rounded-2xl text-sm font-black flex items-center gap-3 shadow-2xl transition-all cursor-pointer ${
                isLoading
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 hover:scale-105 active:scale-95 shadow-amber-500/30'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>{PROGRESS_STEPS[progressIndex]}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 fill-slate-950" />
                  <span>إنشاء الملخص الآن</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </section>
      )}

      {/* =========================================================================
          ZONE 4: Active Loading Animation HUD
          ========================================================================= */}
      {isLoading && (
        <section className="bg-[#0D1B2A] border-2 border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4 animate-pulse">
          <div className="flex items-center justify-between text-xs font-bold text-amber-300">
            <span>مساعد التلخيص يفحص مستنداتك ويستخلص الأفكار والقوانين...</span>
            <span className="font-mono">{progressIndex + 1} / 5</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {PROGRESS_STEPS.map((step, idx) => (
              <div
                key={step}
                className={`p-3 rounded-xl border text-center text-xs font-bold transition-all ${
                  idx <= progressIndex
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-500'
                }`}
              >
                <div className="text-[10px] text-cyan-400 font-mono mb-1">خطوة {idx + 1}</div>
                <div>{step}</div>
              </div>
            ))}
          </div>

          {/* Real-time Streaming Output Preview HUD */}
          {streamChunkText && (
            <div className="mt-4 p-4 rounded-2xl bg-[#070e18] border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-bold text-amber-400">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>📡 {streamStatusMessage || 'جاري استقبال البث المباشر للتلخيص عبر Vercel AI SDK (streamText)...'}</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {streamChunkText.length} حرف تم استلامها
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap select-text">
                {streamChunkText.slice(-600)}
                <span className="inline-block w-2 h-4 bg-amber-400 animate-pulse ml-1 align-middle" />
              </div>
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          ZONE 5: Structured Summary Viewer
          ========================================================================= */}
      {summaryData && !isLoading && (
        <div className="space-y-6">
          
          {/* Top Actions & In-Summary Real-time Search Toolbar */}
          <div className="bg-[#0D1B2A] border border-cyan-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            
            {/* Search within Summary */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-cyan-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث داخل الملخص (مثل: قانون أوم، المقاومة...)"
                className="w-full pr-9 pl-4 py-2 rounded-xl bg-[#091527] border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 outline-none font-sans"
              />
            </div>

            {/* Save, Copy, Share, Print/PDF, Word Export Buttons */}
            <div className="flex items-center gap-2 flex-wrap justify-end w-full md:w-auto text-xs font-bold">
              
              {/* Save to «ملخصاتي» */}
              <button
                onClick={handleSaveToMySummaries}
                className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                  isCurrentSaved
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                {isCurrentSaved ? <BookmarkCheck className="w-4 h-4 text-emerald-400" /> : <Bookmark className="w-4 h-4 text-amber-400" />}
                <span>{isCurrentSaved ? 'تم الحفظ في ملخصاتي' : 'حفظ في ملخصاتي'}</span>
              </button>

              {/* Copy */}
              <button
                onClick={handleCopySummary}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
                title="نسخ نص الملخص"
              >
                {copiedToast ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
                <span>{copiedToast ? 'تم النسخ!' : 'نسخ'}</span>
              </button>

              {/* Share */}
              <button
                onClick={handleShare}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
                title="مشاركة الملخص"
              >
                <Share2 className="w-4 h-4 text-amber-400" />
                <span>مشاركة</span>
              </button>

              {/* Print / Download Formatted PDF */}
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
                title="طباعة أو تصدير PDF"
              >
                <Printer className="w-4 h-4 text-purple-400" />
                <span>طباعة / PDF</span>
              </button>

              {/* Download Word/Text */}
              <button
                onClick={handleDownloadDoc}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-500/30 transition-colors flex items-center gap-1.5"
                title="تنزيل ملف نصي"
              >
                <Download className="w-4 h-4" />
                <span>تنزيل مستند</span>
              </button>
            </div>

          </div>

          {/* Search Highlight Warning */}
          {searchQuery && (
            <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-300 flex items-center justify-between">
              <span>تصفية الملخص بالبحث عن: «{searchQuery}»</span>
              <button onClick={() => setSearchQuery('')} className="underline text-slate-400">
                إلغاء التصفية
              </button>
            </div>
          )}

          {/* The Printable Master Summary Body */}
          <div className="bg-[#0D1B2A] border-2 border-amber-500/30 rounded-3xl p-6 sm:p-9 space-y-8 shadow-2xl print:bg-white print:text-black print:border-none">
            
            {/* Title Header */}
            <div className="border-b border-slate-800 pb-5 space-y-1 text-right">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 font-mono text-[11px] font-bold border border-amber-500/30">
                  {SUMMARY_TYPES_CONFIG.find((t) => t.id === summaryData.summaryType)?.label || summaryData.summaryType}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {summaryData.fileName}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {summaryData.title}
              </h2>
            </div>

            {/* الفكرة العامة (General Idea) */}
            {matchesSearch(summaryData.generalIdea) && (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-cyan-500/10 border border-amber-500/30 space-y-1.5">
                <span className="text-xs font-extrabold text-amber-400 block">
                  💡 الفكرة العامة:
                </span>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                  {summaryData.generalIdea}
                </p>
              </div>
            )}

            {/* أهم النقاط (Key Points) */}
            {summaryData.keyPoints && summaryData.keyPoints.some(matchesSearch) && (
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-cyan-400 border-b border-slate-800 pb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>أهم النقاط:</span>
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-200">
                  {summaryData.keyPoints.filter(matchesSearch).map((point, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="text-amber-400 font-bold text-base leading-none">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* المفاهيم والتعريفات (Concepts & Definitions) */}
            {summaryData.conceptsAndDefinitions &&
              summaryData.conceptsAndDefinitions.some(
                (c) => matchesSearch(c.termArabic) || matchesSearch(c.definition)
              ) && (
                <div className="space-y-3">
                  <h3 className="text-sm font-extrabold text-cyan-400 border-b border-slate-800 pb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span>المفاهيم والتعريفات الهندسية:</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {summaryData.conceptsAndDefinitions
                      .filter((c) => matchesSearch(c.termArabic) || matchesSearch(c.definition))
                      .map((c, i) => (
                        <div
                          key={i}
                          className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-white">{c.termArabic}</span>
                            {c.termEnglish && (
                              <span className="text-[10px] font-mono text-cyan-400 font-bold">
                                ({c.termEnglish})
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{c.definition}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {/* القوانين والمعادلات (Laws & Equations) */}
            {summaryData.equations &&
              summaryData.equations.some(
                (e) => matchesSearch(e.formula) || matchesSearch(e.name || '')
              ) && (
                <div className="space-y-4">
                  <h3 className="text-sm font-extrabold text-cyan-400 border-b border-slate-800 pb-2 flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    <span>القوانين والمعادلات:</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {summaryData.equations
                      .filter((e) => matchesSearch(e.formula) || matchesSearch(e.name || ''))
                      .map((eq, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-2xl bg-[#091527] border border-cyan-500/30 space-y-3"
                        >
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="text-xs font-bold text-amber-400">
                              {eq.name || `قانون ${i + 1}`}
                            </span>
                            <span className="px-3 py-1 rounded-lg bg-slate-900 font-mono font-bold text-amber-300 text-sm border border-cyan-500/40">
                              {eq.formula}
                            </span>
                          </div>

                          {/* Symbol meanings */}
                          <div className="space-y-1 text-[11px] font-mono">
                            {eq.symbolMeanings.map((s, sIdx) => (
                              <div key={sIdx} className="flex items-center justify-between text-slate-300">
                                <span className="text-cyan-400 font-bold">{s.symbol}:</span>
                                <span>{s.meaning}</span>
                                <span className="text-emerald-400 font-sans">[{s.unit}]</span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                            <span className="font-bold text-slate-300">متى يستخدم: </span>
                            <span>{eq.usageContext}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {/* الأمثلة المهمة (Worked Examples) */}
            {summaryData.examples && summaryData.examples.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-cyan-400 border-b border-slate-800 pb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>الأمثلة المهمة:</span>
                </h3>
                <div className="space-y-3">
                  {summaryData.examples.map((ex, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                      <div className="font-bold text-white">المسألة: {ex.problem}</div>
                      <p className="text-slate-300 leading-relaxed">
                        <span className="text-cyan-400 font-bold">طريقة الحل: </span>
                        {ex.solutionOutline}
                      </p>
                      {ex.result && (
                        <div className="pt-1 text-emerald-400 font-mono font-bold">
                          النتيجة: {ex.result}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* الملاحظات المهمة (Important Notes) */}
            {summaryData.importantNotes && summaryData.importantNotes.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs">
                <span className="font-bold text-amber-400 block">⚠️ الملاحظات المهمة:</span>
                <ul className="space-y-1 text-slate-300">
                  {summaryData.importantNotes.map((note, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-400">•</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* الخلاصة (Conclusion) */}
            {matchesSearch(summaryData.conclusion) && (
              <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-1.5">
                <span className="text-xs font-bold text-emerald-400 block">
                  🎯 الخلاصة:
                </span>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-semibold">
                  {summaryData.conclusion}
                </p>
              </div>
            )}

            {/* تحليل الرسومات والمخططات (Diagrams Summary) */}
            {summaryData.diagramsSummary && summaryData.diagramsSummary.length > 0 && (
              <div className="space-y-3 border-t border-slate-800 pt-4">
                <h3 className="text-sm font-extrabold text-cyan-400 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  <span>تحليل الرسومات والمخططات الهندسية:</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {summaryData.diagramsSummary.map((diag, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1">
                      <h4 className="font-bold text-amber-400">{diag.diagramName}</h4>
                      <p className="text-slate-300 text-[11px] leading-relaxed">{diag.description}</p>
                      <div className="text-emerald-400 text-[10px] pt-1">💡 الفائدة: {diag.keyTakeaway}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* =========================================================================
              ZONE 6: Transform to Exam Prep ("عاشراً: التحويل إلى مراجعة قبل الاختبار")
              ========================================================================= */}
          <section className="bg-[#0D1B2A] border border-cyan-500/30 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Award className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-extrabold text-white">
                التحويل إلى مراجعة قبل الاختبار:
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => handleTransform('to_questions')}
                disabled={isTransforming}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all hover:scale-105"
              >
                📝 «حوّل الملخص إلى أسئلة»
              </button>

              <button
                onClick={() => handleTransform('extract_formulas')}
                disabled={isTransforming}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all hover:scale-105"
              >
                📐 «استخرج أهم القوانين»
              </button>

              <button
                onClick={() => handleTransform('extract_definitions')}
                disabled={isTransforming}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all hover:scale-105"
              >
                📚 «استخرج التعريفات»
              </button>

              <button
                onClick={() => handleTransform('explain_hard_points')}
                disabled={isTransforming}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all hover:scale-105"
              >
                💡 «اشرح النقاط الصعبة»
              </button>
            </div>

            {/* Transform Loading */}
            {isTransforming && (
              <div className="p-4 rounded-xl bg-[#091527] text-xs text-amber-400 font-bold flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري معالجة المحتوى وتجهيز المراجعة...</span>
              </div>
            )}

            {/* Transformed Result View */}
            {transformedResult && (
              <div className="p-5 rounded-2xl bg-[#091527] border-2 border-amber-500/40 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="font-extrabold text-amber-400 text-sm">
                    {transformedResult.title}
                  </h4>
                  <button
                    onClick={() => setTransformedResult(null)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    إغلاق
                  </button>
                </div>
                <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line font-medium">
                  {transformedResult.content}
                </div>
              </div>
            )}
          </section>

        </div>
      )}

    </div>
  );
};
