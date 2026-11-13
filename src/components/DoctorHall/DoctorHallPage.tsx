import React, { useState, useEffect } from 'react';
import { Doctor, SavedLecture, LectureData } from '../../types';
import { getStoredDoctors, saveDoctor, saveLecture, getStoredLectures } from '../../services/storage';
import {
  requestLectureExplanation,
  doctorVoice,
  LectureProgressStage,
  PROGRESS_STAGE_LABELS
} from '../../services/ai';
import { processUploadedMedia, ProcessedMediaResult } from '../../services/mediaExtractor';
import { DoctorCreatorModal } from './DoctorCreatorModal';
import { VirtualClassroomView } from './VirtualClassroomView';
import { SmartBoardCanvas } from '../LectureHall/SmartBoardCanvas';
import { CameraCaptureModal } from '../common/CameraCaptureModal';
import {
  Bot, Plus, Play, Pause, Square, Volume2, Sparkles, Upload, HelpCircle,
  CheckCircle, BookOpen, RefreshCw, AlertTriangle, Camera, Video, FileText,
  Image as ImageIcon, Link2, Lightbulb, Factory, Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';

type DoctorInputMethod = 'text' | 'image' | 'camera' | 'video' | 'file' | 'link';

export const DoctorHallPage: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [activeDoctor, setActiveDoctor] = useState<Doctor | null>(null);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [savedLectures, setSavedLectures] = useState<SavedLecture[]>([]);

  // Ask Doctor Multi-modal Inputs (Text, Image, Camera Photo, Video, File, Video Link)
  const [inputMethod, setInputMethod] = useState<DoctorInputMethod>('text');
  const [lessonTitle, setLessonTitle] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [videoLinkUrl, setVideoLinkUrl] = useState('');
  const [processedMedia, setProcessedMedia] = useState<ProcessedMediaResult | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Execution & Progress states
  const [isLoading, setIsLoading] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [currentProgressStage, setCurrentProgressStage] = useState<LectureProgressStage | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [lectureData, setLectureData] = useState<LectureData | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const loadedDocs = getStoredDoctors();
    setDoctors(loadedDocs);
    if (loadedDocs.length > 0) {
      setActiveDoctor(loadedDocs[0]);
    }
    setSavedLectures(getStoredLectures());
    return () => {
      doctorVoice.stop();
    };
  }, []);

  const handleSaveDoctor = (doc: Doctor) => {
    const updated = saveDoctor(doc);
    setDoctors(updated);
    setActiveDoctor(doc);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, method?: DoctorInputMethod) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    setIsReadingFile(true);
    try {
      const processed = await processUploadedMedia(file);
      setProcessedMedia(processed);
      if (method) setInputMethod(method);
    } catch {
      setErrorMsg('تعذر قراءة الملف المرفوع. يرجى المحاولة بصيغة أخرى.');
    } finally {
      setIsReadingFile(false);
    }
  };

  const handleCameraCaptured = (dataUrl: string, fileName: string) => {
    setProcessedMedia({
      content: dataUrl,
      mimeType: 'image/jpeg',
      fileName,
      mediaKind: 'image',
      previewUrl: dataUrl,
    });
    setInputMethod('camera');
  };

  const handleGenerateLecture = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeDoctor || isLoading) return;

    const hasMedia = Boolean(
      processedMedia?.content || (processedMedia?.videoFrames && processedMedia.videoFrames.length > 0)
    );
    if (!lessonTitle.trim() && !userPrompt.trim() && !hasMedia && !videoLinkUrl.trim()) {
      setErrorMsg('يرجى كتابة سؤالك للدكتور أو إرفاق صورة / تصوير سؤال / فيديو / ملف / رابط فيديو.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setCurrentProgressStage('uploading');
    doctorVoice.stop();
    setIsSpeaking(false);

    try {
      const data = await requestLectureExplanation(
        activeDoctor,
        lessonTitle || userPrompt.slice(0, 60) || processedMedia?.fileName || 'سؤال للدكتور الذكي',
        userPrompt || 'اشرح لي هذا المحتوى على السبورة الذكية مع أمثلة واقعية ورسومات توضيحية',
        processedMedia?.content,
        (stage) => setCurrentProgressStage(stage),
        processedMedia?.mimeType,
        videoLinkUrl.trim() || undefined,
        processedMedia?.videoFrames
      );

      setLectureData(data);

      const saved: SavedLecture = {
        id: `lec_${Date.now()}`,
        doctorId: activeDoctor.id,
        doctorName: activeDoctor.name,
        title: data.title || lessonTitle || 'محاضرة جديدة',
        subject: activeDoctor.subject,
        userPrompt: userPrompt || videoLinkUrl || processedMedia?.fileName || '',
        uploadedFileName: processedMedia?.fileName,
        data,
        createdAt: new Date().toISOString(),
      };
      setSavedLectures(saveLecture(saved));

      confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });

      if (data.summary) {
        doctorVoice.speak(data.summary, activeDoctor.language, activeDoctor.voiceSpeed, () => {
          setIsSpeaking(false);
        });
        setIsSpeaking(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء إرسال السؤال للدكتور الذكي.');
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
        const fullText = `${lectureData.title}. ${lectureData.summary}. ${lectureData.sections
          .map((s) => s.content)
          .join('. ')}`;
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

  // Adapt LectureData -> SmartBoardCanvas format for interactive SVG/Canvas diagrams & real-world examples
  const smartBoardPayload = lectureData
    ? {
        doctorSpeech: lectureData.summary,
        boardTitle: lectureData.title,
        boardNotes: lectureData.objectives?.slice(0, 3) || lectureData.sections.slice(0, 3).map((s) => s.heading),
        boardEquation: lectureData.visualDiagram?.equation || lectureData.sections[0]?.whiteboardNotes || '',
        diagramType:
          (lectureData.visualDiagram?.diagramType as any) ||
          (lectureData.sections[0]?.whiteboardDiagramType === 'formula'
            ? 'graph'
            : lectureData.sections[0]?.whiteboardDiagramType === 'mechanism'
            ? 'gears'
            : lectureData.sections[0]?.whiteboardDiagramType === 'block_diagram'
            ? 'mindmap'
            : 'circuit'),
        diagramTitle: lectureData.visualDiagram?.diagramTitle || `رسم توضيحي: ${lectureData.title}`,
        diagramData: {
          keyMetrics: (lectureData.visualDiagram?.nodes || []).map((n) => `${n.label}: ${n.value || n.role || ''}`),
          summary: lectureData.sections[0]?.whiteboardNotes || lectureData.summary,
          nodes: (lectureData.visualDiagram?.nodes || []).map((n, i) => ({
            id: `n_${i}`,
            label: n.label,
            sub: n.value || n.role,
          })),
        },
        realWorldExamples: lectureData.realWorldExamples,
      }
    : null;

  return (
    <div className="space-y-6 pb-16 w-full max-w-full overflow-x-hidden min-w-0 text-[#0F172A] dark:text-slate-100">
      {/* Header Bar */}
      <div className="champagne-card dark:bg-[#0D1B2A] dark:border-cyan-500/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative shrink-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-[#D4AF37] via-[#0EA5E9] to-[#0284C7] dark:from-amber-400 dark:via-cyan-400 dark:to-amber-500 flex items-center justify-center text-white overflow-hidden border border-[rgba(212,175,55,0.45)] dark:border-amber-400/40 shadow-md">
              {activeDoctor?.avatarUrl ? (
                <img src={activeDoctor.avatarUrl} alt={activeDoctor.name} className="w-full h-full object-cover" />
              ) : (
                <Bot className="w-8 h-8" />
              )}
            </div>
            {isSpeaking && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0EA5E9] dark:bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-[#0EA5E9] dark:bg-cyan-500 border-2 border-white dark:border-slate-900" />
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-[#E0F2FE] dark:bg-indigo-500/20 border border-[#0EA5E9]/30 dark:border-indigo-400/40 text-[#0284C7] dark:text-indigo-300 text-[10px] font-black">
                الخدمة 2 · قاعة الدكتور الذكي
              </span>
              <h2 className="text-base sm:text-xl font-black text-[#0F172A] dark:text-white truncate">
                اسأل {activeDoctor?.name || 'دكتور الميكاترونكس الذكي'}
              </h2>
            </div>
            <p className="text-xs text-[#475569] dark:text-slate-300 mt-1">
              اسأل عبر النص، الصورة، الكاميرا المباشرة، الفيديو، الملف، أو رابط فيديو — والرد على السبورة بأمثلة واقعية ورسومات توضيحية.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <select
            value={activeDoctor?.id || ''}
            onChange={(e) => {
              const doc = doctors.find((d) => d.id === e.target.value);
              if (doc) setActiveDoctor(doc);
            }}
            className="flex-1 md:flex-initial px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-[#0F172A] dark:text-white text-xs font-bold outline-none"
          >
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.subject})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setIsCreatorOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#E0F2FE] hover:bg-[#0EA5E9] text-[#0284C7] hover:text-white dark:bg-amber-500/15 dark:text-amber-300 border border-[#0EA5E9]/35 dark:border-amber-500/30 text-xs font-bold dark:hover:bg-amber-500 dark:hover:text-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>دكتور مخصص</span>
          </button>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Ask Doctor Form (All 6 Input Modalities) */}
        <div className="lg:col-span-4 space-y-5 min-w-0">
          <div className="champagne-card dark:bg-[#0D1B2A] dark:border-2 dark:border-indigo-500/30 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[rgba(212,175,55,0.25)] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-[#0EA5E9] dark:text-amber-400">
                <span className="w-8 h-8 rounded-xl sky-icon-box flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h3 className="text-sm sm:text-base font-black text-[#0F172A] dark:text-white">اسأل الدكتور عبر 6 طرق</h3>
              </div>
              {lectureData && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSpeechControl('play')}
                    className="p-1.5 rounded-lg bg-[#E0F2FE] dark:bg-slate-800 text-[#0284C7] dark:text-emerald-400 hover:bg-sky-200 dark:hover:bg-slate-700"
                    title="استمع للرد"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSpeechControl('pause')}
                    className="p-1.5 rounded-lg bg-[#E0F2FE] dark:bg-slate-800 text-[#0284C7] dark:text-amber-400 hover:bg-sky-200 dark:hover:bg-slate-700"
                    title="إيقاف مؤقت"
                  >
                    <Pause className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSpeechControl('stop')}
                    className="p-1.5 rounded-lg bg-rose-50 dark:bg-slate-800 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-slate-700"
                    title="إيقاف الصوت"
                  >
                    <Square className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* 6 Modality Selector Grid */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'text', label: 'نص', icon: HelpCircle },
                { id: 'image', label: 'صورة', icon: ImageIcon },
                { id: 'camera', label: 'تصوير صورة', icon: Camera },
                { id: 'video', label: 'فيديو', icon: Video },
                { id: 'file', label: 'ملف', icon: FileText },
                { id: 'link', label: 'رابط فيديو', icon: Link2 },
              ].map((m) => {
                const Icon = m.icon;
                const active = inputMethod === m.id;
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => {
                      setInputMethod(m.id as DoctorInputMethod);
                      if (m.id === 'camera') setIsCameraOpen(true);
                    }}
                    className={`p-2 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      active
                        ? 'bg-[#0EA5E9] border-[#0284C7] text-white dark:bg-indigo-600/30 dark:border-amber-400 dark:text-amber-300 shadow'
                        : 'bg-white dark:bg-slate-900 border-[rgba(212,175,55,0.3)] dark:border-slate-800 text-[#475569] dark:text-slate-300 hover:border-[#0EA5E9] dark:hover:border-cyan-400/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-white dark:text-amber-300' : 'text-[#0EA5E9] dark:text-slate-300'}`} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleGenerateLecture} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#0F172A] dark:text-slate-300 font-bold mb-1">موضوع السؤال (اختياري)</label>
                <input
                  type="text"
                  placeholder="مثال: دوائر Op-Amp أو برمجة PID أو محرك DC..."
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-[#0F172A] dark:text-white focus:border-[#0EA5E9] dark:focus:border-amber-400 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-[#0F172A] dark:text-slate-300 font-bold mb-1">اسأل الدكتور بالتفصيل</label>
                <textarea
                  rows={3}
                  placeholder="اكتب سؤالك هنا أو ما الذي تريد من الدكتور توضيحه في الصورة/الفيديو/الملف..."
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-[#0F172A] dark:text-white focus:border-[#0EA5E9] dark:focus:border-amber-400 focus:outline-none resize-none text-xs"
                />
              </div>

              {/* Camera Snap Button */}
              {inputMethod === 'camera' && (
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  className="w-full py-3 rounded-xl bg-[#E0F2FE] hover:bg-sky-200 dark:bg-cyan-500/20 dark:hover:bg-cyan-500/30 border border-[#0EA5E9]/45 dark:border-cyan-400/50 text-[#0284C7] dark:text-cyan-200 font-black flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>فتح الكاميرا والتقاط صورة جديدة</span>
                </button>
              )}

              {/* Upload Zone for Image / Video / File */}
              {(inputMethod === 'image' || inputMethod === 'video' || inputMethod === 'file') && (
                <label className="flex items-center justify-center gap-2 w-full py-3 px-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-dashed border-[#0EA5E9]/45 dark:border-slate-700 hover:border-[#0284C7] dark:hover:border-amber-400 text-[#0284C7] dark:text-slate-300 dark:hover:text-amber-300 cursor-pointer transition-colors font-bold">
                  <Upload className="w-4 h-4" />
                  <span>
                    {inputMethod === 'image' && 'اختر صورة من جهازك'}
                    {inputMethod === 'video' && 'اختر ملف فيديو (MP4/WEBM/MOV)'}
                    {inputMethod === 'file' && 'اختر ملف PDF / Word / TXT'}
                  </span>
                  <input
                    type="file"
                    accept={
                      inputMethod === 'image'
                        ? 'image/*'
                        : inputMethod === 'video'
                        ? 'video/*'
                        : '.pdf,.doc,.docx,.txt,.ppt,.pptx,.ino'
                    }
                    onChange={(e) => handleFileUpload(e, inputMethod)}
                    className="hidden"
                  />
                </label>
              )}

              {/* Video Link Field */}
              {inputMethod === 'link' && (
                <div>
                  <label className="block text-[#0284C7] dark:text-cyan-300 font-bold mb-1">رابط الفيديو (YouTube / TikTok / Facebook / Instagram)</label>
                  <input
                    type="url"
                    dir="ltr"
                    placeholder="https://..."
                    value={videoLinkUrl}
                    onChange={(e) => setVideoLinkUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[#0EA5E9]/40 dark:border-cyan-500/40 text-[#0F172A] dark:text-cyan-300 focus:border-[#0EA5E9] dark:focus:border-amber-400 focus:outline-none text-xs font-mono"
                  />
                </div>
              )}

              {isReadingFile && (
                <div className="text-center text-[#0284C7] dark:text-amber-300 font-bold animate-pulse py-1">
                  جاري معالجة المرفق...
                </div>
              )}

              {/* Attached Media Preview */}
              {processedMedia && (
                <div className="p-2.5 rounded-xl bg-[#E0F2FE] dark:bg-emerald-500/10 border border-[#0EA5E9]/40 dark:border-emerald-500/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {processedMedia.previewUrl && processedMedia.mediaKind === 'image' && (
                      <img src={processedMedia.previewUrl} alt="معاينة" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-[#0F172A] dark:text-emerald-300 truncate">{processedMedia.fileName}</div>
                      <div className="text-[10px] text-[#475569] dark:text-slate-300">
                        {processedMedia.videoFrames?.length
                          ? `تم استخراج ${processedMedia.videoFrames.length} لقطات من الفيديو`
                          : 'جاهز للإرسال للدكتور الذكي'}
                      </div>
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

              {/* Progress Indicator */}
              {isLoading && currentProgressStage && (
                <div className="p-3 rounded-xl bg-[#E0F2FE] dark:bg-amber-500/10 border border-[#0EA5E9]/35 dark:border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0284C7] dark:text-amber-300">
                    <div className="w-3.5 h-3.5 border-2 border-[#0EA5E9] dark:border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <span>{PROGRESS_STAGE_LABELS[currentProgressStage]}</span>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs space-y-2">
                  <div className="flex items-start gap-2 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGenerateLecture()}
                    className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-500/20 dark:hover:bg-rose-500/30 dark:text-rose-200 font-bold flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>إعادة المحاولة</span>
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || isReadingFile}
                className="w-full py-3.5 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white dark:bg-gradient-to-r dark:from-amber-500 dark:to-orange-600 dark:text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-sky-500/25 dark:shadow-amber-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isLoading ? 'جاري التحليل والرد على السبورة...' : 'إرسال للدكتور الذكي'}</span>
              </button>
            </form>
          </div>

          {/* Saved History */}
          <div className="champagne-card dark:bg-[#0D1B2A] dark:border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white flex items-center gap-2 border-b border-[rgba(212,175,55,0.25)] dark:border-slate-800 pb-2">
              <BookOpen className="w-4 h-4 text-[#0EA5E9] dark:text-amber-400" />
              <span>أسئلة وردود الدكتور السابقة</span>
            </h4>
            {savedLectures.length === 0 ? (
              <p className="text-xs text-[#475569] dark:text-slate-500 py-3 text-center">لا توجد محاضرات محفوظة بعد</p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar">
                {savedLectures.map((lec) => (
                  <div
                    key={lec.id}
                    onClick={() => setLectureData(lec.data)}
                    className="p-2.5 rounded-xl champagne-subcard dark:bg-slate-900 dark:border-slate-800 hover:border-[#0EA5E9] dark:hover:border-amber-500/40 cursor-pointer"
                  >
                    <h5 className="text-xs font-bold text-[#0F172A] dark:text-white truncate">{lec.title}</h5>
                    <div className="flex items-center justify-between text-[10px] text-[#475569] dark:text-slate-400 mt-1">
                      <span>{lec.doctorName}</span>
                      <span>{new Date(lec.createdAt).toLocaleDateString('ar-SA')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Virtual Classroom + Animated Diagram Smart Board + Real-World Examples */}
        <div className="lg:col-span-8 space-y-6 min-w-0">
          {activeDoctor && (
            <VirtualClassroomView activeDoctor={activeDoctor} lectureData={lectureData} />
          )}

          {smartBoardPayload && (
            <SmartBoardCanvas
              lectureData={smartBoardPayload}
              isSpeaking={isSpeaking}
              activeDialect="sanani"
            />
          )}

          {lectureData && (
            <div className="champagne-card dark:bg-[#0D1B2A] dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 text-[#0F172A] dark:text-slate-200">
              <div className="border-b border-[rgba(212,175,55,0.25)] dark:border-slate-800 pb-3 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-xs font-mono text-[#0284C7] dark:text-cyan-400">الرد التفصيلي من قاعة الدكتور</span>
                  <h3 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-white mt-0.5">{lectureData.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleSpeechControl(isSpeaking ? 'stop' : 'play')}
                  className="px-4 py-2 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white dark:bg-amber-500/15 dark:border dark:border-amber-400/40 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{isSpeaking ? 'إيقاف الصوت' : 'استمع للشرح كاملاً'}</span>
                </button>
              </div>

              {/* Real World Examples */}
              {lectureData.realWorldExamples && lectureData.realWorldExamples.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-[#0F172A] dark:text-emerald-300 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-[#0EA5E9] dark:text-amber-400" />
                    <span>أمثلة واقعية وتطبيقات هندسية لتسهيل الفهم</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {lectureData.realWorldExamples.map((ex, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-[rgba(212,175,55,0.35)] dark:border-emerald-500/30 space-y-2 text-xs">
                        <div className="font-black text-[#0F172A] dark:text-white">{ex.title}</div>
                        <p className="text-[#475569] dark:text-amber-200 leading-relaxed">
                          <strong className="text-[#0F172A] dark:text-amber-300">من الواقع اليومي: </strong>
                          {ex.yemeniAnalogy}
                        </p>
                        <p className="text-[#0284C7] dark:text-cyan-200 leading-relaxed flex items-start gap-1.5">
                          <Factory className="w-4 h-4 text-[#0EA5E9] dark:text-cyan-400 shrink-0 mt-0.5" />
                          <span>{ex.engineeringApplication}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Objectives */}
              {lectureData.objectives && lectureData.objectives.length > 0 && (
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900/80 border border-[rgba(212,175,55,0.3)] dark:border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-[#0284C7] dark:text-amber-400">نقاط التركيز الرئيسية</h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[#475569] dark:text-slate-300">
                    {lectureData.objectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-[#0EA5E9] dark:text-cyan-400 shrink-0 mt-0.5" />
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sections */}
              <div className="space-y-5">
                {lectureData.sections.map((sec, idx) => (
                  <div key={idx} className="space-y-2">
                    <h4 className="text-base font-bold text-[#0F172A] dark:text-cyan-300 border-r-4 border-[#0EA5E9] dark:border-amber-500 pr-3">
                      {sec.heading}
                    </h4>
                    <p className="text-xs sm:text-sm text-[#475569] dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {sec.content}
                    </p>
                    {sec.whiteboardNotes && (
                      <div className="p-3 rounded-lg bg-[#E0F2FE] dark:bg-slate-900 border border-[#0EA5E9]/35 dark:border-amber-500/30 text-xs font-mono text-[#0284C7] dark:text-amber-300">
                        📌 على السبورة: {sec.whiteboardNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Solved Example */}
              {lectureData.solvedExample && (
                <div className="p-4 sm:p-5 rounded-xl bg-[#F8FAFC] dark:bg-[#0F2338] border border-slate-200 dark:border-blue-500/30 space-y-3">
                  <h4 className="text-sm font-bold text-[#0284C7] dark:text-blue-300 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    <span>مثال تطبيقي محلول خطوة بخطوة</span>
                  </h4>
                  <p className="text-xs text-[#0F172A] dark:text-white font-semibold">{lectureData.solvedExample.problem}</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-[#475569] dark:text-slate-300">
                    {lectureData.solvedExample.steps.map((st, i) => (
                      <li key={i}>{st}</li>
                    ))}
                  </ol>
                  <div className="p-2.5 rounded-lg bg-[#E0F2FE] dark:bg-cyan-500/10 border border-[#0EA5E9]/40 dark:border-cyan-500/30 text-[#0284C7] dark:text-cyan-300 text-xs font-mono font-bold">
                    النتيجة النهائية: {lectureData.solvedExample.finalAnswer}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Live Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCaptured}
      />

      {/* Doctor Creator Modal */}
      <DoctorCreatorModal
        isOpen={isCreatorOpen}
        onClose={() => setIsCreatorOpen(false)}
        onSaveDoctor={handleSaveDoctor}
      />
    </div>
  );
};
