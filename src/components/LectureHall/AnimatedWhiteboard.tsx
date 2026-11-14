import React, { useEffect, useRef, useState } from 'react';
import {
  Send,
  Trash2,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  PenLine,
  Pencil,
  Minus,
  Square,
  Eraser,
  Keyboard,
  X,
  Paperclip,
  Palette,
  Type,
  Minimize2,
  PenTool,
} from 'lucide-react';
import {
  initWhiteboard,
  clearBoard,
  cancelWhiteboardAnimation,
  processAIResponse,
  WhiteboardDrawMode,
  clientToLogicalPoint,
  startInteractiveStroke,
  moveInteractiveStroke,
  endInteractiveStroke,
  setBoardFontSize,
} from '../../services/whiteboardEngine';
import { whiteboardAudioSfx } from '../../services/whiteboardAudioSfx';
import { processUploadedMedia, ProcessedMediaResult } from '../../services/mediaExtractor';

interface AnimatedWhiteboardProps {
  title?: string;
  whiteboardScript: string;
  explanationText?: string;
  isLoading?: boolean;
  isSpeaking?: boolean;
  placeholder?: string;
  onSendQuestion?: (question: string) => void;
  onSendMultimodal?: (payload: { question: string; media?: ProcessedMediaResult }) => void;
  onToggleSpeak?: () => void;
}

const DRAW_MODES: Array<{
  id: WhiteboardDrawMode;
  keyLabel: string;
  label: string;
  english: string;
  tooltip: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'pencil', keyLabel: 'P', label: 'قلم حر', english: 'Pencil', tooltip: 'قلم رسم حر (P)', icon: Pencil },
  { id: 'line', keyLabel: 'L', label: 'خط مستقيم', english: 'Line', tooltip: 'رسم خط مستقيم (L)', icon: Minus },
  { id: 'shape', keyLabel: 'S', label: 'شكل هندسي', english: 'Shape', tooltip: 'رسم شكل / مربع هندسي (S)', icon: Square },
  { id: 'erase', keyLabel: 'E', label: 'ممحاة', english: 'Erase', tooltip: 'ممحاة لمسح الرسم (E)', icon: Eraser },
];

const INK_COLORS: Array<{ hex: string; label: string }> = [
  { hex: '#0F172A', label: 'قلم كحلي داكن' },
  { hex: '#0EA5E9', label: 'قلم أزرق سماوي' },
  { hex: '#DC2626', label: 'قلم أحمر للتنبيه' },
  { hex: '#059669', label: 'قلم أخضر هندسي' },
  { hex: '#D97706', label: 'قلم ذهبي كهرماني' },
  { hex: '#7C3AED', label: 'قلم بنفسجي' },
];

const STROKE_PRESETS: Array<{ stroke: number; font: number; label: string }> = [
  { stroke: 2, font: 14, label: 'رفيع (14px)' },
  { stroke: 4, font: 16, label: 'متوسط (16px)' },
  { stroke: 7, font: 19, label: 'عريض (19px)' },
  { stroke: 11, font: 22, label: 'كبير (22px)' },
];

interface TooltipWrapperProps {
  tip: string;
  children: React.ReactNode;
}

const FloatingTooltip: React.FC<TooltipWrapperProps> = ({ tip, children }) => (
  <div className="relative group/tool inline-flex items-center justify-center">
    {children}
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 translate-y-1 opacity-0 group-hover/tool:opacity-100 group-hover/tool:translate-y-0 group-focus-within/tool:opacity-100 group-focus-within/tool:translate-y-0 transition-all duration-150 z-40 px-2.5 py-1 rounded-lg bg-[#0F172A] text-white text-[11px] font-bold whitespace-nowrap shadow-xl border border-white/10"
    >
      {tip}
      <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-[#0F172A]" />
    </span>
  </div>
);

export const AnimatedWhiteboard: React.FC<AnimatedWhiteboardProps> = ({
  title = 'السبورة البيضاء المتحركة (Animated Whiteboard)',
  whiteboardScript,
  explanationText = '',
  isLoading = false,
  isSpeaking = false,
  placeholder = 'اكتب سؤالك هنا أو أرفق صورة/فيديو/ملف ليُكتب الشرح ويُرسم بالأنيميشن داخل السبورة البيضاء...',
  onSendQuestion,
  onSendMultimodal,
  onToggleSpeak,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasScrollRef = useRef<HTMLDivElement | null>(null);
  const latestScriptRef = useRef<string>(whiteboardScript);
  latestScriptRef.current = whiteboardScript;
  const lastWidthRef = useRef<number>(0);
  const shortcutToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [questionInput, setQuestionInput] = useState('');
  const [attachedMedia, setAttachedMedia] = useState<ProcessedMediaResult | null>(null);
  const [isReadingAttachment, setIsReadingAttachment] = useState(false);

  const [hasWrittenText, setHasWrittenText] = useState(Boolean(explanationText || whiteboardScript));
  const [activeCommand, setActiveCommand] = useState<string>('');
  const [isAnimatingBoard, setIsAnimatingBoard] = useState(false);
  const [penSfxEnabled, setPenSfxEnabled] = useState<boolean>(() => whiteboardAudioSfx.isEnabled());

  // Interactive Drawing Mode + Floating Toolbar States
  const [drawMode, setDrawMode] = useState<WhiteboardDrawMode>('pencil');
  const [inkColor, setInkColor] = useState<string>('#0F172A');
  const [strokeSize, setStrokeSize] = useState<number>(4);
  const [fontSize, setFontSize] = useState<number>(16);
  const [openPopover, setOpenPopover] = useState<'none' | 'color' | 'size'>('none');
  const [toolbarCollapsed, setToolbarCollapsed] = useState<boolean>(false);

  const [showShortcutsOverlay, setShowShortcutsOverlay] = useState(false);
  const [shortcutToast, setShortcutToast] = useState<string>('');

  const showModeFeedback = (msg: string) => {
    setShortcutToast(msg);
    if (shortcutToastTimerRef.current) clearTimeout(shortcutToastTimerRef.current);
    shortcutToastTimerRef.current = setTimeout(() => setShortcutToast(''), 1800);
  };

  const selectDrawMode = (mode: WhiteboardDrawMode, fromShortcut = false) => {
    setDrawMode(mode);
    setOpenPopover('none');
    const meta = DRAW_MODES.find((m) => m.id === mode);
    if (meta) {
      whiteboardAudioSfx.playPenStroke(mode === 'erase' ? 'clear' : mode === 'shape' ? 'box' : 'wire');
      showModeFeedback(
        fromShortcut
          ? `اختصار (${meta.keyLabel}): ${meta.label} (${meta.english})`
          : `الوضع النشط: ${meta.label}`
      );
    }
  };

  // Initialize Canvas once on mount and handle width resize safely
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    lastWidthRef.current = canvas.clientWidth;
    setBoardFontSize(fontSize);
    initWhiteboard(canvas);

    const handleResize = () => {
      const current = canvasRef.current;
      if (!current) return;
      const newWidth = current.clientWidth;
      if (Math.abs(newWidth - lastWidthRef.current) < 8) return;
      lastWidthRef.current = newWidth;
      initWhiteboard(current);
      if (latestScriptRef.current) {
        runSequence(latestScriptRef.current);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      cancelWhiteboardAnimation();
      if (shortcutToastTimerRef.current) clearTimeout(shortcutToastTimerRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const runSequence = async (script: string) => {
    if (!canvasRef.current || !script.trim()) return;
    setIsAnimatingBoard(true);
    setHasWrittenText(true);
    setActiveCommand('');
    if (canvasScrollRef.current) {
      canvasScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }

    await processAIResponse(script, {
      onTextUpdate: () => {
        setHasWrittenText(true);
      },
      onCommandStep: (cmd) => {
        setActiveCommand(cmd);
      },
      onScrollToY: (logicalY, totalLogicalHeight) => {
        const container = canvasScrollRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas || totalLogicalHeight <= 0) return;
        const pixelY = (logicalY / totalLogicalHeight) * canvas.clientHeight;
        const desiredTop = Math.max(0, pixelY - container.clientHeight + 90);
        if (desiredTop > container.scrollTop + 12 || logicalY < 220) {
          container.scrollTo({
            top: logicalY < 220 ? 0 : desiredTop,
            behavior: 'smooth',
          });
        }
      },
      onComplete: () => {
        setIsAnimatingBoard(false);
        setActiveCommand('');
      },
    });
  };

  // Run animation whenever a new AI whiteboardScript arrives
  useEffect(() => {
    if (whiteboardScript && whiteboardScript.trim()) {
      runSequence(whiteboardScript);
    }
  }, [whiteboardScript]);

  const handleClearBoard = () => {
    whiteboardAudioSfx.playPenStroke('clear');
    clearBoard();
    setHasWrittenText(false);
    setActiveCommand('');
    setIsAnimatingBoard(false);
    setOpenPopover('none');
    if (canvasScrollRef.current) {
      canvasScrollRef.current.scrollTop = 0;
    }
  };

  const handleTogglePenSfx = () => {
    const next = whiteboardAudioSfx.toggle();
    setPenSfxEnabled(next);
  };

  const applyFontSize = (nextFontPx: number, nextStrokePx?: number) => {
    setFontSize(nextFontPx);
    setBoardFontSize(nextFontPx);
    if (typeof nextStrokePx === 'number') {
      setStrokeSize(nextStrokePx);
    }
    showModeFeedback(`حجم الخط: ${nextFontPx}px`);
    if (latestScriptRef.current && latestScriptRef.current.trim()) {
      runSequence(latestScriptRef.current);
    }
  };

  // Global Keyboard Shortcuts for Whiteboard (P, L, S, E, ?, R, M, C, Esc)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTypingField =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        if (showShortcutsOverlay) setShowShortcutsOverlay(false);
        if (openPopover !== 'none') setOpenPopover('none');
        return;
      }

      if (isTypingField || e.ctrlKey || e.metaKey || e.altKey) return;

      const code = e.code;
      const key = e.key.toLowerCase();

      if (e.key === '?' || (e.shiftKey && code === 'Slash') || code === 'F1') {
        e.preventDefault();
        setShowShortcutsOverlay((prev) => !prev);
        return;
      }

      if (code === 'KeyP' || key === 'p') {
        e.preventDefault();
        selectDrawMode('pencil', true);
        setShowShortcutsOverlay(false);
      } else if (code === 'KeyL' || key === 'l') {
        e.preventDefault();
        selectDrawMode('line', true);
        setShowShortcutsOverlay(false);
      } else if (code === 'KeyS' || key === 's') {
        e.preventDefault();
        selectDrawMode('shape', true);
        setShowShortcutsOverlay(false);
      } else if (code === 'KeyE' || key === 'e') {
        e.preventDefault();
        selectDrawMode('erase', true);
        setShowShortcutsOverlay(false);
      } else if (code === 'KeyR' || key === 'r') {
        if (latestScriptRef.current) {
          e.preventDefault();
          runSequence(latestScriptRef.current);
          showModeFeedback('اختصار (R): إعادة تشغيل الرسم');
        }
      } else if (code === 'KeyM' || key === 'm') {
        e.preventDefault();
        const next = whiteboardAudioSfx.toggle();
        setPenSfxEnabled(next);
        showModeFeedback(next ? 'اختصار (M): تفعيل صوت القلم' : 'اختصار (M): كتم صوت القلم');
      } else if (code === 'KeyC' || key === 'c') {
        e.preventDefault();
        handleClearBoard();
        showModeFeedback('اختصار (C): مسح السبورة');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showShortcutsOverlay, openPopover]);

  // Pointer/Touch handlers for live drawing on the white canvas
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || isLoading) return;
    setOpenPopover('none');
    canvas.setPointerCapture(e.pointerId);
    const pt = clientToLogicalPoint(canvas, e.clientX, e.clientY);
    startInteractiveStroke(drawMode, pt.x, pt.y, inkColor, strokeSize);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pt = clientToLogicalPoint(canvas, e.clientX, e.clientY);
    moveInteractiveStroke(pt.x, pt.y);
  };

  const handlePointerUp = () => {
    endInteractiveStroke();
  };

  const handleQuickAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsReadingAttachment(true);
    try {
      const processed = await processUploadedMedia(file);
      setAttachedMedia(processed);
    } finally {
      setIsReadingAttachment(false);
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = questionInput.trim();
    if ((!trimmed && !attachedMedia) || isLoading || isReadingAttachment) return;

    if (attachedMedia && onSendMultimodal) {
      onSendMultimodal({ question: trimmed, media: attachedMedia });
      setQuestionInput('');
      setAttachedMedia(null);
      return;
    }

    if (onSendQuestion && trimmed) {
      onSendQuestion(trimmed);
      setQuestionInput('');
    }
  };

  const primaryModes = DRAW_MODES.filter((m) => m.id !== 'erase');

  return (
    <section
      className="champagne-card rounded-2xl sm:rounded-3xl p-3 sm:p-5 space-y-3.5 w-full max-w-full min-w-0"
      aria-label="السبورة البيضاء المتحركة"
    >
      {/* Top Status & Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-xl sky-icon-box flex items-center justify-center shrink-0">
            <PenLine className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black text-[#0F172A] dark:text-white truncate">
              {title}
            </h3>
            <p className="text-[11px] text-[#475569] dark:text-slate-400">
              يُكتب الشرح والحل وتُرسم المخططات بالأنيميشن مباشرة داخل السبورة البيضاء
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {isAnimatingBoard && (
            <span className="px-2.5 py-1 rounded-full bg-[#E0F2FE] dark:bg-cyan-500/15 border border-[#0EA5E9]/35 dark:border-cyan-400/40 text-[#0284C7] dark:text-cyan-300 text-[11px] font-bold font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0EA5E9] animate-ping" />
              <span className="max-w-[160px] truncate">
                {activeCommand || 'جاري الكتابة والرسم...'}
              </span>
            </span>
          )}

          {onToggleSpeak && (hasWrittenText || explanationText) && (
            <button
              type="button"
              onClick={onToggleSpeak}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isSpeaking
                  ? 'bg-[#0EA5E9] border-[#0284C7] text-white'
                  : 'bg-[#E0F2FE] hover:bg-[#0EA5E9] border-[#0EA5E9]/40 text-[#0284C7] hover:text-white dark:bg-slate-800 dark:text-cyan-300'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{isSpeaking ? 'إيقاف الصوت' : 'صوت الدكتور'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowShortcutsOverlay((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              showShortcutsOverlay
                ? 'bg-[#0EA5E9] border-[#0284C7] text-white'
                : 'bg-white dark:bg-slate-900 border-[rgba(212,175,55,0.4)] dark:border-slate-700 text-[#0F172A] dark:text-slate-200 hover:border-[#0EA5E9]'
            }`}
            title="عرض اختصارات لوحة المفاتيح (?)"
          >
            <Keyboard className="w-3.5 h-3.5 text-current" />
            <span>اختصارات</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[#0F172A] dark:text-slate-200 text-[10px] font-mono">
              ?
            </kbd>
          </button>

          <button
            type="button"
            onClick={handleTogglePenSfx}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              penSfxEnabled
                ? 'bg-[#E0F2FE] dark:bg-sky-500/15 border-[#0EA5E9]/40 text-[#0284C7] dark:text-sky-300'
                : 'bg-white dark:bg-slate-900 border-[rgba(212,175,55,0.4)] dark:border-slate-700 text-[#475569] dark:text-slate-400'
            }`}
            title={penSfxEnabled ? 'كتم صوت القلم عند الرسم (M)' : 'تفعيل صوت القلم عند الرسم (M)'}
          >
            {penSfxEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{penSfxEnabled ? 'صوت القلم' : 'صوت مكتوم'}</span>
          </button>

          {whiteboardScript && (
            <button
              type="button"
              onClick={() => runSequence(whiteboardScript)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.4)] dark:border-slate-700 text-[#0F172A] dark:text-slate-200 hover:border-[#0EA5E9] hover:text-[#0284C7] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="إعادة تشغيل رسم وكتابة السبورة (R)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#0EA5E9]" />
              <span>إعادة الرسم</span>
            </button>
          )}
        </div>
      </div>

      {/* =====================================================================
          مساحة السبورة البيضاء الكاملة (HTML5 Canvas) + لوحة الأدوات العائمة (Floating Toolbar)
         ===================================================================== */}
      <div className="relative w-full">
        <div className="relative w-full rounded-2xl bg-[#FFFFFF] border border-[rgba(212,175,55,0.35)] shadow-[0_8px_28px_rgba(15,23,42,0.08)] overflow-hidden">
          <div
            ref={canvasScrollRef}
            className="w-full h-[380px] sm:h-[470px] lg:h-[530px] overflow-y-auto bg-[#FFFFFF] pb-16"
          >
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ touchAction: 'none' }}
              className={`w-full block bg-[#FFFFFF] ${
                drawMode === 'erase' ? 'cursor-cell' : 'cursor-crosshair'
              }`}
            />
          </div>

          {/* Quick Keyboard Shortcut Switch Feedback Pill */}
          {shortcutToast && (
            <div className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-full bg-[#0F172A]/90 text-white text-xs font-bold shadow-lg pointer-events-none flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-[#0EA5E9]" />
              <span>{shortcutToast}</span>
            </div>
          )}

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 z-20 bg-white/85 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 text-[#0F172A]">
              <Sparkles className="w-7 h-7 text-[#0EA5E9] animate-spin" />
              <span className="text-xs sm:text-sm font-black text-center px-4">
                جاري تحليل المحتوى وكتابة الشرح والرسم بالأنيميشن داخل السبورة البيضاء...
              </span>
            </div>
          )}

          {/* Keyboard Shortcut Overlay */}
          {showShortcutsOverlay && (
            <div
              role="dialog"
              aria-label="اختصارات لوحة المفاتيح للسبورة"
              onClick={() => setShowShortcutsOverlay(false)}
              className="absolute inset-0 z-30 bg-[#0F172A]/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0B1628] border border-[rgba(212,175,55,0.45)] shadow-2xl p-4 sm:p-5 space-y-4 text-right"
              >
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-[#E0F2FE] text-[#0EA5E9] flex items-center justify-center">
                      <Keyboard className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-[#0F172A] dark:text-white">
                        اختصارات السبورة البيضاء
                      </h4>
                      <p className="text-[11px] text-[#475569] dark:text-slate-400">
                        اضغط المفتاح مباشرة للتبديل الفوري أو انقر على الوضع
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowShortcutsOverlay(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {DRAW_MODES.map((m) => {
                    const Icon = m.icon;
                    const active = drawMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          selectDrawMode(m.id, true);
                          setShowShortcutsOverlay(false);
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                          active
                            ? 'bg-[#E0F2FE] dark:bg-sky-500/20 border-[#0EA5E9] text-[#0F172A] dark:text-white font-bold'
                            : 'bg-[#F8FAFC] dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-[#0F172A] dark:text-slate-200 hover:border-[#0EA5E9]'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-[#0EA5E9]" />
                          <span>
                            {m.label} <span className="text-[10px] text-[#475569] dark:text-slate-400">({m.english})</span>
                          </span>
                        </span>
                        <kbd className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-black text-[#0284C7] dark:text-sky-300 shadow-xs">
                          {m.keyLabel}
                        </kbd>
                      </button>
                    );
                  })}

                  {[
                    { keyLabel: 'R', desc: 'إعادة تشغيل أنيميشن السبورة' },
                    { keyLabel: 'M', desc: 'كتم / تفعيل صوت القلم' },
                    { keyLabel: 'C', desc: 'مسح السبورة بالكامل' },
                    { keyLabel: '?', desc: 'إظهار / إخفاء هذه النافذة' },
                  ].map((item) => (
                    <div
                      key={item.keyLabel}
                      className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-[#475569] dark:text-slate-300"
                    >
                      <span>{item.desc}</span>
                      <kbd className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-black text-[#0F172A] dark:text-white">
                        {item.keyLabel}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* =====================================================================
            لوحة الأدوات العائمة (Floating Toolbar) فوق السبورة البيضاء
            تحتوي على: تغيير لون القلم، حجم الخط وسماكة القلم، ممحاة، وتلميحات توضيحية عند التمرير
           ===================================================================== */}
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center max-w-[96%]"
          aria-label="لوحة الأدوات العائمة للسبورة"
        >
          {toolbarCollapsed ? (
            <FloatingTooltip tip="إظهار لوحة أدوات السبورة العائمة">
              <button
                type="button"
                onClick={() => setToolbarCollapsed(false)}
                className="px-3.5 py-2 rounded-full bg-white/95 dark:bg-[#0B1628]/95 backdrop-blur-md border border-[rgba(212,175,55,0.5)] dark:border-slate-700 shadow-[0_10px_28px_rgba(15,23,42,0.16)] text-[#0F172A] dark:text-white hover:border-[#0EA5E9] text-xs font-black flex items-center gap-2 cursor-pointer"
              >
                <PenTool className="w-4 h-4 text-[#0EA5E9]" />
                <span>أدوات السبورة</span>
                <span
                  className="w-3 h-3 rounded-full border border-slate-300"
                  style={{ backgroundColor: inkColor }}
                />
              </button>
            </FloatingTooltip>
          ) : (
            <div className="relative flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-2xl bg-white/95 dark:bg-[#0B1628]/95 backdrop-blur-md border border-[rgba(212,175,55,0.48)] dark:border-slate-700 shadow-[0_12px_32px_rgba(15,23,42,0.16)]">
              {/* Drawing Tools: Pencil, Line, Shape */}
              {primaryModes.map((m) => {
                const Icon = m.icon;
                const active = drawMode === m.id;
                return (
                  <FloatingTooltip key={m.id} tip={m.tooltip}>
                    <button
                      type="button"
                      onClick={() => selectDrawMode(m.id)}
                      aria-label={m.tooltip}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        active
                          ? 'bg-[#0EA5E9] text-white shadow-md shadow-sky-500/25'
                          : 'text-[#0F172A] dark:text-slate-200 hover:bg-[#E0F2FE] dark:hover:bg-slate-800 hover:text-[#0284C7]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  </FloatingTooltip>
                );
              })}

              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-0.5" />

              {/* Pen Color Picker Button + Popover */}
              <div className="relative">
                <FloatingTooltip tip="تغيير لون القلم">
                  <button
                    type="button"
                    onClick={() => setOpenPopover((prev) => (prev === 'color' ? 'none' : 'color'))}
                    aria-label="تغيير لون القلم"
                    className={`h-9 px-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                      openPopover === 'color'
                        ? 'bg-[#E0F2FE] dark:bg-sky-500/20 text-[#0284C7] dark:text-sky-300 ring-1 ring-[#0EA5E9]'
                        : 'text-[#0F172A] dark:text-slate-200 hover:bg-[#E0F2FE] dark:hover:bg-slate-800'
                    }`}
                  >
                    <Palette className="w-4 h-4 text-[#0EA5E9]" />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 shadow-xs"
                      style={{ backgroundColor: inkColor }}
                    />
                  </button>
                </FloatingTooltip>

                {openPopover === 'color' && (
                  <div
                    role="menu"
                    aria-label="ألوان القلم"
                    className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-40 p-2.5 rounded-2xl bg-white dark:bg-[#0B1628] border border-[rgba(212,175,55,0.45)] dark:border-slate-700 shadow-2xl flex items-center gap-2"
                  >
                    {INK_COLORS.map((c) => (
                      <FloatingTooltip key={c.hex} tip={c.label}>
                        <button
                          type="button"
                          onClick={() => {
                            setInkColor(c.hex);
                            if (drawMode === 'erase') setDrawMode('pencil');
                            setOpenPopover('none');
                            showModeFeedback(`لون القلم: ${c.label}`);
                          }}
                          aria-label={c.label}
                          className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                            inkColor === c.hex && drawMode !== 'erase'
                              ? 'scale-115 border-[#0EA5E9] ring-2 ring-[#0EA5E9]/30'
                              : 'border-white dark:border-slate-700 hover:scale-110'
                          }`}
                          style={{ backgroundColor: c.hex }}
                        />
                      </FloatingTooltip>
                    ))}
                  </div>
                )}
              </div>

              {/* Font & Pen Size Picker Button + Popover */}
              <div className="relative">
                <FloatingTooltip tip="حجم الخط وسماكة القلم">
                  <button
                    type="button"
                    onClick={() => setOpenPopover((prev) => (prev === 'size' ? 'none' : 'size'))}
                    aria-label="حجم الخط وسماكة القلم"
                    className={`h-9 px-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                      openPopover === 'size'
                        ? 'bg-[#E0F2FE] dark:bg-sky-500/20 text-[#0284C7] dark:text-sky-300 ring-1 ring-[#0EA5E9]'
                        : 'text-[#0F172A] dark:text-slate-200 hover:bg-[#E0F2FE] dark:hover:bg-slate-800'
                    }`}
                  >
                    <Type className="w-4 h-4 text-[#0EA5E9]" />
                    <span className="text-[11px] font-mono font-black">{fontSize}px</span>
                  </button>
                </FloatingTooltip>

                {openPopover === 'size' && (
                  <div
                    role="menu"
                    aria-label="خيارات حجم الخط وسماكة القلم"
                    className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-40 w-64 p-3 rounded-2xl bg-white dark:bg-[#0B1628] border border-[rgba(212,175,55,0.45)] dark:border-slate-700 shadow-2xl space-y-3 text-right"
                  >
                    <div>
                      <div className="text-[11px] font-black text-[#0F172A] dark:text-white mb-1.5">
                        حجم الخط وسماكة القلم
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {STROKE_PRESETS.map((preset) => {
                          const isSelected = fontSize === preset.font && strokeSize === preset.stroke;
                          return (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                applyFontSize(preset.font, preset.stroke);
                                setOpenPopover('none');
                              }}
                              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center justify-between transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#0EA5E9] border-[#0284C7] text-white'
                                  : 'bg-[#F8FAFC] dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-[#0F172A] dark:text-slate-200 hover:border-[#0EA5E9]'
                              }`}
                            >
                              <span>{preset.label}</span>
                              <span
                                className="rounded-full bg-current shrink-0"
                                style={{
                                  width: `${Math.min(12, preset.stroke + 3)}px`,
                                  height: `${Math.min(12, preset.stroke + 3)}px`,
                                }}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1 pt-1 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#475569] dark:text-slate-300">
                        <span>سماكة القلم / الممحاة</span>
                        <span className="font-mono text-[#0EA5E9]">{strokeSize}px</span>
                      </div>
                      <input
                        type="range"
                        min={2}
                        max={14}
                        step={1}
                        value={strokeSize}
                        onChange={(e) => setStrokeSize(Number(e.target.value))}
                        aria-label="سماكة القلم"
                        className="w-full accent-[#0EA5E9] cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-0.5" />

              {/* Eraser Button */}
              <FloatingTooltip tip="ممحاة لمسح الرسم (E)">
                <button
                  type="button"
                  onClick={() => selectDrawMode('erase')}
                  aria-label="ممحاة لمسح الرسم"
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    drawMode === 'erase'
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                      : 'text-[#0F172A] dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-600'
                  }`}
                >
                  <Eraser className="w-4 h-4" />
                </button>
              </FloatingTooltip>

              {/* Clear Board Button */}
              <FloatingTooltip tip="مسح السبورة بالكامل (C)">
                <button
                  type="button"
                  onClick={handleClearBoard}
                  aria-label="مسح السبورة بالكامل"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[#475569] dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-600 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </FloatingTooltip>

              {/* Collapse Floating Toolbar Button */}
              <FloatingTooltip tip="تصغير لوحة الأدوات">
                <button
                  type="button"
                  onClick={() => {
                    setOpenPopover('none');
                    setToolbarCollapsed(true);
                  }}
                  aria-label="تصغير لوحة الأدوات"
                  className="w-8 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
              </FloatingTooltip>
            </div>
          )}
        </div>
      </div>

      {/* Quick Attachment Preview if attached directly in whiteboard bar */}
      {attachedMedia && (
        <div className="px-3 py-2 rounded-xl bg-[#E0F2FE] dark:bg-emerald-500/10 border border-[#0EA5E9]/40 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {attachedMedia.mediaKind === 'image' && attachedMedia.previewUrl && (
              <img src={attachedMedia.previewUrl} alt="attachment" className="w-8 h-8 rounded-lg object-cover shrink-0" />
            )}
            <span className="font-bold text-[#0F172A] dark:text-white truncate">{attachedMedia.fileName}</span>
            <span className="text-[10px] text-[#0284C7] dark:text-sky-300 shrink-0">
              ({attachedMedia.videoFrames?.length ? `${attachedMedia.videoFrames.length} إطارات فيديو` : attachedMedia.mediaKind})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAttachedMedia(null)}
            className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
            title="إزالة المرفق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =====================================================================
          شريط الإدخال: إرفاق صورة/فيديو/ملف + حقل نصي للسؤال + "إرسال" + "مسح السبورة"
         ===================================================================== */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1"
      >
        <div className="flex-1 flex items-center gap-2">
          {onSendMultimodal && (
            <label
              className="px-3 py-3 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.4)] dark:border-slate-700 hover:border-[#0EA5E9] text-[#0284C7] dark:text-sky-300 cursor-pointer flex items-center justify-center gap-1.5 shrink-0 text-xs font-bold shadow-sm"
              title="إرفاق صورة أو فيديو أو ملف PDF/مستند لتحليله على السبورة"
            >
              <Paperclip className="w-4 h-4" />
              <span className="hidden md:inline">
                {isReadingAttachment ? 'جاري التجهيز...' : 'صورة / فيديو / ملف'}
              </span>
              <input
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx,.txt,.ino,.cpp,.py"
                onChange={handleQuickAttach}
                className="hidden"
              />
            </label>
          )}

          <input
            type="text"
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.4)] dark:border-slate-700 text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] text-xs sm:text-sm focus:border-[#0EA5E9] focus:outline-none shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="submit"
            disabled={isLoading || isReadingAttachment || (!questionInput.trim() && !attachedMedia)}
            className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-sky-500/20 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>إرسال</span>
          </button>

          <button
            type="button"
            onClick={handleClearBoard}
            className="px-4 py-3 rounded-xl bg-white hover:bg-rose-50 dark:bg-slate-900 dark:hover:bg-rose-500/15 border border-[rgba(212,175,55,0.4)] dark:border-slate-700 hover:border-rose-400 text-[#475569] hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>مسح السبورة</span>
          </button>
        </div>
      </form>
    </section>
  );
};
