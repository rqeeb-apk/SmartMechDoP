import React, { useState, useEffect, useRef } from 'react';
import { Doctor, LectureData, BoardColor } from '../../types';
import { VirtualInstructorCanvas } from './VirtualInstructorCanvas';
import { WhiteboardCanvas } from './WhiteboardCanvas';
import { generateLectureTimeline, calculateVisemeFrame, TimelineEvent, VisemeFrame } from './LectureTimelineEngine';
import { doctorVoice } from '../../services/ai';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, Play, Pause, SkipForward, SkipBack, Eye, EyeOff, Cpu, Volume2, Settings, Sparkles, Layers } from 'lucide-react';

interface VirtualClassroomViewProps {
  activeDoctor: Doctor;
  lectureData: LectureData | null;
}

export const VirtualClassroomView: React.FC<VirtualClassroomViewProps> = ({
  activeDoctor,
  lectureData,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Classroom controls
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [hideDoctor, setHideDoctor] = useState(false);
  const [lowResourceMode, setLowResourceMode] = useState(false);

  // Timeline & Playback states
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visemeFrame, setVisemeFrame] = useState<VisemeFrame>({ mouthShape: 'NEUTRAL', mouthOpen: 0 });

  // Sync timeline when lectureData changes
  useEffect(() => {
    if (lectureData) {
      const generatedEvents = generateLectureTimeline(lectureData);
      setTimeline(generatedEvents);
      setCurrentEventIndex(0);
    } else {
      setTimeline([]);
    }
  }, [lectureData]);

  // Active event
  const currentEvent: TimelineEvent | null = timeline[currentEventIndex] || null;

  // Speech & Timeline playback loop
  useEffect(() => {
    if (!isPlaying || !timeline.length) return;

    let timerId: NodeJS.Timeout;
    let audioProgressTimer: NodeJS.Timeout;
    let audioSec = 0;

    const activeEvt = timeline[currentEventIndex];
    if (!activeEvt) return;

    // Speak audio chunk if present
    if (activeEvt.speechChunk) {
      doctorVoice.speak(activeEvt.speechChunk, activeDoctor.language, activeDoctor.voiceSpeed, () => {
        // Speech end handler
      });
    }

    // Lip-sync timer
    audioProgressTimer = setInterval(() => {
      audioSec += 0.1;
      const vf = calculateVisemeFrame(audioSec, doctorVoice.getSpeakingState());
      setVisemeFrame(vf);
    }, 80);

    // Event duration step timer
    const stepDuration = Math.max(3000, activeEvt.durationSec * 1000);
    timerId = setTimeout(() => {
      if (currentEventIndex < timeline.length - 1) {
        setCurrentEventIndex((prev) => prev + 1);
      } else {
        setIsPlaying(false);
        doctorVoice.stop();
      }
    }, stepDuration);

    return () => {
      clearTimeout(timerId);
      clearInterval(audioProgressTimer);
    };
  }, [isPlaying, currentEventIndex, timeline, activeDoctor]);

  const togglePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      doctorVoice.pause();
    } else {
      setIsPlaying(true);
      if (doctorVoice.getSpeakingState()) {
        doctorVoice.resume();
      }
    }
  };

  const handleStepNext = () => {
    doctorVoice.stop();
    if (currentEventIndex < timeline.length - 1) {
      setCurrentEventIndex((p) => p + 1);
    }
  };

  const handleStepPrev = () => {
    doctorVoice.stop();
    if (currentEventIndex > 0) {
      setCurrentEventIndex((p) => p - 1);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-3xl overflow-hidden bg-gradient-to-b from-[#0f172a] via-[#0D1B2A] to-[#020617] border border-amber-500/30 shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : 'min-h-[580px]'
      }`}
    >
      {/* University Lecture Hall Background Decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(0,240,255,0.08),transparent_60%)] pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

      {/* Top Classroom Bar */}
      <div className="relative z-10 px-6 py-3 bg-black/60 backdrop-blur-md border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Active Stage Status Badge */}
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-bold text-white text-sm">قاعة الدكتور الذكي التفاعلية</span>
          {currentEvent && (
            <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold font-mono text-[11px] animate-glow">
              {currentEvent.statusLabel}
            </span>
          )}
        </div>

        {/* Classroom Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1">
            <button
              onClick={() => setZoomScale((z) => Math.min(1.4, z + 0.1))}
              className="text-slate-300 hover:text-white p-1"
              title="تكبير السبورة"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[10px] text-cyan-400 px-1">{Math.round(zoomScale * 100)}%</span>
            <button
              onClick={() => setZoomScale((z) => Math.max(0.8, z - 0.1))}
              className="text-slate-300 hover:text-white p-1"
              title="تصغير السبورة"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Toggle Doctor visibility */}
          <button
            onClick={() => setHideDoctor(!hideDoctor)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              hideDoctor
                ? 'bg-slate-800 border-slate-700 text-slate-400'
                : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
            }`}
          >
            {hideDoctor ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{hideDoctor ? 'إظهار الدكتور' : 'إخفاء/تصغير'}</span>
          </button>

          {/* Low Resource mode toggle for mobile */}
          <button
            onClick={() => setLowResourceMode(!lowResourceMode)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold hidden sm:flex items-center gap-1 transition-all ${
              lowResourceMode
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
            title="نموذج أداء للأجهزة الضعيفة"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{lowResourceMode ? 'عرض منخفض الموارد' : 'عرض كامل الدقة'}</span>
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            title="ملء الشاشة"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Classroom Viewport Stage */}
      <div className="relative z-10 p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Interactive Whiteboard Canvas (Center / Left) */}
        <div
          className={`transition-all duration-300 ${
            hideDoctor ? 'lg:col-span-12' : 'lg:col-span-8'
          }`}
          style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top center' }}
        >
          <WhiteboardCanvas
            boardColor={activeDoctor.boardColor}
            initialTextNotes={currentEvent?.whiteboardTextToReveal || (lectureData ? `${lectureData.title}\n• ${lectureData.objectives.join('\n• ')}` : undefined)}
            diagramCommands={currentEvent?.whiteboardDiagramCommand ? [currentEvent.whiteboardDiagramCommand] : lectureData?.sections.flatMap((s) => s.diagramCommands || [])}
          />
        </div>

        {/* Animated Virtual Doctor Instructor (Right Side of Whiteboard) */}
        {!hideDoctor && (
          <div className="lg:col-span-4 flex flex-col items-center justify-center">
            <VirtualInstructorCanvas
              doctorAvatarUrl={activeDoctor.avatarUrl}
              doctorName={activeDoctor.name}
              pose={currentEvent?.pose || 'PRESENTING'}
              viseme={visemeFrame}
              handTargetX={currentEvent?.handTargetX || 200}
              handTargetY={currentEvent?.handTargetY || 150}
              isSpeaking={doctorVoice.getSpeakingState() || isPlaying}
              lowResourceMode={lowResourceMode}
            />
          </div>
        )}
      </div>

      {/* Lecture Synchronized Playback Control Dock */}
      {timeline.length > 0 && (
        <div className="relative z-20 px-6 py-3 bg-black/80 backdrop-blur-md border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          
          {/* Step Progress & Timeline Slider */}
          <div className="flex items-center gap-3 flex-1">
            <span className="font-mono text-cyan-400 font-bold">
              حدث {currentEventIndex + 1} / {timeline.length}
            </span>

            <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-400 to-amber-400 h-full transition-all duration-300"
                style={{ width: `${((currentEventIndex + 1) / timeline.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Action Playback Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleStepPrev}
              disabled={currentEventIndex <= 0}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40"
              title="الحدث السابق"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlayPause}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/20 hover:scale-105 transition-all"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? 'إيقاف مؤقت' : 'تشغيل محاكاة الشرح والتفاعل'}</span>
            </button>

            <button
              onClick={handleStepNext}
              disabled={currentEventIndex >= timeline.length - 1}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40"
              title="الحدث التالي"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
