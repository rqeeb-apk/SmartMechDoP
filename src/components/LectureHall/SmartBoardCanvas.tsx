import React, { useState, useRef, useEffect } from 'react';
import {
  PenTool, Eraser, Trash2, Radio, Sparkles, Play, Pause, RotateCcw, Zap, Lightbulb, Factory, Volume2, VolumeX
} from 'lucide-react';
import { LectureHallResponseData } from '../../services/lectureHallApi';
import { whiteboardAudioSfx } from '../../services/whiteboardAudioSfx';

interface SmartBoardCanvasProps {
  lectureData: LectureHallResponseData | null;
  isSpeaking: boolean;
  activeDialect: string;
  onClearBoard?: () => void;
}

export const SmartBoardCanvas: React.FC<SmartBoardCanvasProps> = ({
  lectureData,
  isSpeaking,
  activeDialect,
  onClearBoard,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Drawing tools state
  const [activeTool, setActiveTool] = useState<'laser' | 'pen' | 'eraser'>('laser');
  const [penColor, setPenColor] = useState<string>('#38bdf8');
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Smart Animation Engine States
  const [activeGearAngle, setActiveGearAngle] = useState(0);
  const [activeServoAngle, setActiveServoAngle] = useState(45);
  const [currentTick, setCurrentTick] = useState(0);
  const [revealStep, setRevealStep] = useState<number>(4);
  const [isAutoAnimating, setIsAutoAnimating] = useState<boolean>(true);
  const [penSfxEnabled, setPenSfxEnabled] = useState<boolean>(() => whiteboardAudioSfx.isEnabled());

  // Continuous physics & signal loop
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveGearAngle((prev) => (prev + 3) % 360);
      setActiveServoAngle(45 + Math.sin(Date.now() / 750) * 45);
      setCurrentTick((prev) => (prev + 1) % 120);
    }, 40);
    return () => clearInterval(timer);
  }, []);

  // Progressive Smart Reveal Animation whenever lectureData changes
  useEffect(() => {
    if (!lectureData) return;
    setRevealStep(1);
    setIsAutoAnimating(true);
    whiteboardAudioSfx.playPenStroke('text');

    const t1 = setTimeout(() => {
      setRevealStep(2);
      whiteboardAudioSfx.playPenStroke('component');
    }, 450);
    const t2 = setTimeout(() => {
      setRevealStep(3);
      whiteboardAudioSfx.playPenStroke('box');
    }, 950);
    const t3 = setTimeout(() => {
      setRevealStep(4);
      whiteboardAudioSfx.playPenStroke('wire');
    }, 1450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [lectureData?.boardTitle, lectureData?.boardEquation, lectureData?.diagramType]);

  const replayBoardAnimation = () => {
    setRevealStep(1);
    whiteboardAudioSfx.playPenStroke('text');
    setTimeout(() => {
      setRevealStep(2);
      whiteboardAudioSfx.playPenStroke('component');
    }, 450);
    setTimeout(() => {
      setRevealStep(3);
      whiteboardAudioSfx.playPenStroke('box');
    }, 950);
    setTimeout(() => {
      setRevealStep(4);
      whiteboardAudioSfx.playPenStroke('wire');
    }, 1450);
  };

  // Handle Freehand Canvas Drawing
  const handleStartDraw = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (activeTool === 'laser') {
      setLaserPos({ x, y });
      return;
    }

    setIsDrawing(true);
    whiteboardAudioSfx.playPenStroke(activeTool === 'eraser' ? 'clear' : 'wire');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = activeTool === 'eraser' ? '#070f1e' : penColor;
    ctx.lineWidth = activeTool === 'eraser' ? 22 : 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const handleMoveDraw = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (activeTool === 'laser') {
      setLaserPos({ x, y });
      return;
    }

    if (!isDrawing) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleEndDraw = () => setIsDrawing(false);

  const clearCanvasDrawings = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setLaserPos(null);
    if (onClearBoard) onClearBoard();
  };

  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const diagram = lectureData?.diagramType || 'circuit';
  const dynamicNodes = lectureData?.diagramData?.nodes || [];
  const keyMetrics = lectureData?.diagramData?.keyMetrics || [];

  // Build dynamic sine/step response SVG path for 'graph' mode
  const wavePath = (() => {
    const pts: string[] = [];
    for (let x = 0; x <= 280; x += 7) {
      const t = (x + currentTick * 3) * 0.045;
      const y = 60 - Math.sin(t) * 32 - Math.cos(t * 0.5) * 8;
      pts.push(`${x === 0 ? 'M' : 'L'} ${x + 20} ${y.toFixed(1)}`);
    }
    return pts.join(' ');
  })();

  return (
    <div className="relative w-full max-w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-[#0A1628] border-2 sm:border-4 border-amber-500/50 shadow-2xl flex flex-col select-none min-w-0">
      {/* Smart Board Bezel Header */}
      <div className="bg-[#050B14] px-3 sm:px-4 py-2 border-b border-amber-500/30 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isSpeaking ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`} />
          <span className="font-mono font-bold text-emerald-400 text-[10px] sm:text-[11px] truncate">
            السبورة الذكية التفاعلية · أنيميشن حي
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1 bg-[#0D1E38] p-1 rounded-xl border border-slate-700/80 flex-wrap">
          <button
            type="button"
            onClick={() => setPenSfxEnabled(whiteboardAudioSfx.toggle())}
            className={`p-1.5 rounded-lg text-[10px] sm:text-xs font-bold flex items-center gap-1 cursor-pointer ${
              penSfxEnabled ? 'text-emerald-300 bg-emerald-500/15' : 'text-slate-400 hover:text-white'
            }`}
            title={penSfxEnabled ? 'كتم صوت القلم عند الرسم' : 'تفعيل صوت القلم عند الرسم'}
          >
            {penSfxEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={replayBoardAnimation}
            className="p-1.5 rounded-lg text-[10px] sm:text-xs font-bold text-amber-300 hover:bg-slate-800 flex items-center gap-1"
            title="إعادة تشغيل الأنيميشن خطوة بخطوة"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">إعادة الأنيميشن</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAutoAnimating(!isAutoAnimating)}
            className="p-1.5 rounded-lg text-[10px] sm:text-xs font-bold text-cyan-300 hover:bg-slate-800 flex items-center gap-1"
            title={isAutoAnimating ? 'تثبيت مؤشر التتبع' : 'تفعيل مؤشر التتبع الذكي'}
          >
            {isAutoAnimating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('laser')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              activeTool === 'laser'
                ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50'
                : 'text-slate-400 hover:text-white'
            }`}
            title="مؤشر الليزر التفاعلي"
          >
            <Radio className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden md:inline">ليزر</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('pen')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              activeTool === 'pen'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:text-white'
            }`}
            title="قلم السبورة"
          >
            <PenTool className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">قلم</span>
          </button>

          {activeTool === 'pen' && (
            <div className="flex items-center gap-1 px-1">
              {['#ffffff', '#fbbf24', '#38bdf8', '#34d399', '#f87171'].map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setPenColor(c)}
                  className={`w-3.5 h-3.5 rounded-full border ${
                    penColor === c ? 'scale-125 border-white' : 'border-slate-600 opacity-70'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setActiveTool('eraser')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTool === 'eraser'
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                : 'text-slate-400 hover:text-white'
            }`}
            title="ممحاة"
          >
            <Eraser className="w-3.5 h-3.5 text-amber-400" />
          </button>

          <button
            type="button"
            onClick={clearCanvasDrawings}
            className="p-1.5 rounded-lg text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800"
            title="مسح رسومات القلم"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Board Surface */}
      <div
        ref={containerRef}
        className="relative min-h-[340px] sm:min-h-[440px] w-full max-w-full bg-gradient-to-b from-[#060F1E] via-[#08152B] to-[#050C18] p-3 sm:p-6 overflow-hidden flex flex-col justify-between gap-4"
        onMouseDown={(e) => handleStartDraw(e.clientX, e.clientY)}
        onMouseMove={(e) => handleMoveDraw(e.clientX, e.clientY)}
        onMouseUp={handleEndDraw}
        onTouchStart={(e) => {
          if (e.touches && e.touches[0]) handleStartDraw(e.touches[0].clientX, e.touches[0].clientY);
        }}
        onTouchMove={(e) => {
          if (e.touches && e.touches[0]) handleMoveDraw(e.touches[0].clientX, e.touches[0].clientY);
        }}
        onTouchEnd={handleEndDraw}
        style={{ touchAction: activeTool === 'laser' ? 'pan-y' : 'none' }}
      >
        {/* Subtle Engineering Grid Background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle, #38bdf8 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Freehand Canvas Overlay */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-20" />

        {/* Interactive Laser Pointer */}
        {laserPos && (
          <div
            className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{ left: laserPos.x, top: laserPos.y }}
          >
            <div className="w-4 h-4 rounded-full bg-rose-500 animate-ping opacity-75" />
            <div className="absolute inset-0 w-3 h-3 m-auto rounded-full bg-rose-400 shadow-[0_0_15px_#f43f5e]" />
          </div>
        )}

        {/* ZONE A: Board Title & Main Equation (Step 1) */}
        <div
          className={`relative z-10 text-right space-y-2 transition-all duration-500 ${
            revealStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[11px] font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>{lectureData?.diagramTitle || 'رسم توضيحي تفاعلي على السبورة'}</span>
          </div>

          <h2 className="text-lg sm:text-2xl lg:text-3xl font-black text-white tracking-tight drop-shadow-md">
            {lectureData?.boardTitle || 'أهلاً بك في قاعة المحاضرات والسبورة الذكية'}
          </h2>

          {lectureData?.boardEquation && (
            <div className="inline-block mt-1 p-2 sm:p-3 rounded-2xl bg-slate-900/90 border border-cyan-400/40 text-cyan-300 font-mono font-black text-xs sm:text-base shadow-lg max-w-full overflow-x-auto">
              <span className="text-amber-400 font-sans text-xs ml-2">المعادلة:</span>
              <span dir="ltr">{lectureData.boardEquation}</span>
            </div>
          )}
        </div>

        {/* ZONE B: Central Animated Smart Diagrams (Step 2) */}
        <div
          className={`relative z-10 my-2 flex flex-col items-center justify-center min-h-[160px] transition-all duration-500 ${
            revealStep >= 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          {/* 1. Circuit Diagram */}
          {diagram === 'circuit' && (
            <div className="relative w-full max-w-lg bg-slate-950/85 border border-cyan-500/35 rounded-2xl p-3 sm:p-5 shadow-xl flex flex-col items-center">
              <div className="flex items-center justify-between w-full text-[10px] sm:text-[11px] text-cyan-300 font-mono font-bold mb-2">
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                  <span>{lectureData?.diagramTitle || 'مخطط الدائرة وتدفق الطاقة'}</span>
                </span>
                <span className="text-emerald-400">● تدفق نشط</span>
              </div>

              <svg viewBox="0 0 340 140" className="w-full max-w-sm h-28 sm:h-32 overflow-visible">
                <rect x="20" y="20" width="300" height="100" rx="10" fill="none" stroke="#1e293b" strokeWidth="4" />
                <rect
                  x="20"
                  y="20"
                  width="300"
                  height="100"
                  rx="10"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3"
                  strokeDasharray="12 18"
                  strokeDashoffset={-currentTick * 2}
                />
                <g transform="translate(20, 70)">
                  <circle cx="0" cy="0" r="15" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
                  <text x="0" y="4" fill="#fbbf24" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                    PWR
                  </text>
                </g>
                <g transform="translate(170, 20)">
                  <rect x="-42" y="-11" width="84" height="22" rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                  <text x="0" y="4" fill="#f8fafc" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                    {keyMetrics[0]?.slice(0, 14) || 'LOAD / R'}
                  </text>
                </g>
                <g transform="translate(320, 70)">
                  <circle cx="0" cy="0" r="13" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                  <text x="0" y="3.5" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                    OUT
                  </text>
                </g>
                <g transform="translate(170, 120)">
                  <rect x="-42" y="-9" width="84" height="18" rx="4" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
                  <text x="0" y="3.5" fill="#10b981" fontSize="8" fontWeight="bold" textAnchor="middle">
                    {keyMetrics[1]?.slice(0, 14) || 'CONTROL ON'}
                  </text>
                </g>
              </svg>
            </div>
          )}

          {/* 2. Gears Mechanism */}
          {diagram === 'gears' && (
            <div className="relative w-full max-w-lg bg-slate-950/85 border border-amber-500/35 rounded-2xl p-4 shadow-xl flex flex-col items-center">
              <div className="flex items-center justify-between w-full text-[11px] text-amber-300 font-mono font-bold mb-2">
                <span>تعشيق التروس ونقل العزم</span>
                <span className="text-cyan-400">نسبة النقل i = N2 / N1</span>
              </div>
              <div className="flex items-center justify-center gap-3 py-2">
                <div
                  className="w-16 h-16 sm:w-22 sm:h-22 rounded-full border-4 border-amber-400 border-dashed flex items-center justify-center bg-amber-500/10"
                  style={{ transform: `rotate(${activeGearAngle}deg)` }}
                >
                  <span className="text-[10px] font-bold text-amber-300">N1</span>
                </div>
                <div
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-cyan-400 border-dashed flex items-center justify-center bg-cyan-500/10"
                  style={{ transform: `rotate(${-activeGearAngle / 2}deg)` }}
                >
                  <span className="text-xs font-bold text-cyan-300">N2</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Arduino MCU */}
          {diagram === 'arduino' && (
            <div className="relative w-full max-w-lg bg-slate-950/85 border border-teal-500/35 rounded-2xl p-4 shadow-xl flex flex-col items-center">
              <div className="flex items-center justify-between w-full text-[11px] text-teal-300 font-mono font-bold mb-2">
                <span>المتحكم الدقيق Arduino / MCU</span>
                <span className="text-amber-400">16MHz · PWM</span>
              </div>
              <div className="w-60 h-32 bg-[#005c6e] border-2 border-[#00979d] rounded-2xl p-3 flex flex-col justify-between">
                <div className="flex justify-between text-[9px] font-mono text-teal-100 font-bold">
                  <span>ARDUINO UNO R3</span>
                  <span className="text-emerald-300">● TX/RX</span>
                </div>
                <div className="w-32 mx-auto h-7 bg-slate-900 rounded border border-slate-700 flex items-center justify-center text-[9px] font-mono text-slate-300">
                  ATmega328P
                </div>
                <div className="flex justify-between items-center text-[8px] font-mono text-teal-100">
                  <span>DIGITAL PWM ~</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-amber-400/50 text-amber-300 animate-pulse">
                    PIN 13 ON
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 4. Servo Motor */}
          {diagram === 'servo' && (
            <div className="relative w-full max-w-lg bg-slate-950/85 border border-blue-500/35 rounded-2xl p-4 shadow-xl flex flex-col items-center">
              <div className="flex items-center justify-between w-full text-[11px] text-blue-300 font-mono font-bold mb-2">
                <span>محرك السيرفو SG90 (تغذية راجعة)</span>
                <span className="text-amber-400">الزاوية: {Math.round(activeServoAngle)}°</span>
              </div>
              <div className="relative w-40 h-24 flex items-center justify-center">
                <div className="w-24 h-16 bg-blue-600 rounded-xl border border-blue-400 flex items-center justify-center">
                  <span className="text-[10px] font-black text-white font-mono">SERVO</span>
                </div>
                <div
                  className="absolute w-16 h-2.5 bg-white rounded-full border border-slate-400 origin-left"
                  style={{ left: '50%', transform: `rotate(${activeServoAngle}deg)` }}
                />
              </div>
            </div>
          )}

          {/* 5. PLC Ladder Logic */}
          {diagram === 'plc' && (
            <div className="relative w-full max-w-lg bg-slate-950/85 border border-emerald-500/35 rounded-2xl p-4 shadow-xl flex flex-col items-center">
              <div className="flex items-center justify-between w-full text-[11px] text-emerald-300 font-mono font-bold mb-2">
                <span>مخطط السلم المنطقي PLC Ladder</span>
                <span className="text-amber-400">Scan: 2ms</span>
              </div>
              <div className="w-full flex items-center justify-between px-3 py-3 bg-slate-900 border border-slate-800 rounded-xl font-mono text-[11px] sm:text-xs text-white overflow-x-auto">
                <span className="text-amber-400 font-black">| L1</span>
                <span className="text-emerald-400 font-bold">--[ I0.0 START ]--</span>
                <span className="text-cyan-400 font-bold animate-pulse">--( Q0.0 OUT )--</span>
                <span className="text-amber-400 font-black">L2 |</span>
              </div>
            </div>
          )}

          {/* 6. Animated Waveform / Graph */}
          {diagram === 'graph' && (
            <div className="relative w-full max-w-lg bg-slate-950/85 border border-cyan-500/35 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between w-full text-[11px] text-cyan-300 font-mono font-bold mb-2">
                <span>منحنى الاستجابة والإشارة Signal Plot</span>
                <span className="text-emerald-400">Live Wave</span>
              </div>
              <svg viewBox="0 0 320 120" className="w-full h-28 bg-slate-900/80 rounded-xl border border-slate-800">
                <line x1="20" y1="60" x2="300" y2="60" stroke="#334155" strokeDasharray="4 4" />
                <line x1="20" y1="15" x2="20" y2="105" stroke="#475569" strokeWidth="1.5" />
                <path d={wavePath} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
              </svg>
            </div>
          )}

          {/* 7. Dynamic Interactive Mindmap / System Block Diagram */}
          {diagram === 'mindmap' && (
            <div className="relative w-full max-w-lg bg-slate-950/85 border border-purple-500/35 rounded-2xl p-4 shadow-xl">
              <div className="text-[11px] text-purple-300 font-mono font-bold mb-3 text-right">
                خريطة التدفق والفهم السريع للمفهوم
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-bold">
                {(dynamicNodes.length > 0
                  ? dynamicNodes.slice(0, 3).map((n) => ({ title: n.label, sub: n.sub || '' }))
                  : (lectureData?.boardNotes || ['المدخلات', 'المعالجة', 'المخرجات'])
                      .slice(0, 3)
                      .map((n) => ({ title: n, sub: '' }))
                ).map((node, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-xl border text-right transition-all ${
                      isAutoAnimating && currentTick % 90 >= i * 30 && currentTick % 90 < (i + 1) * 30
                        ? 'bg-purple-500/25 border-amber-400 text-white shadow-md'
                        : 'bg-slate-900/90 border-purple-500/30 text-purple-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      <span className="truncate">{node.title}</span>
                    </div>
                    {node.sub && <p className="text-[10px] text-slate-300 font-normal mt-1">{node.sub}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Metrics Callouts */}
          {(keyMetrics.length > 0 || lectureData?.diagramData?.summary) && (
            <div className="w-full max-w-lg mt-2.5 space-y-1.5">
              {keyMetrics.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {keyMetrics.map((m, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 font-bold"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}
              {lectureData?.diagramData?.summary && (
                <p className="text-[11px] text-slate-300 text-center leading-relaxed">
                  {lectureData.diagramData.summary}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ZONE C: Board Notes & Real-World Examples (Steps 3 & 4) */}
        <div
          className={`relative z-10 space-y-3 transition-all duration-500 ${
            revealStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          {lectureData?.boardNotes && lectureData.boardNotes.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {lectureData.boardNotes.slice(0, 3).map((note, idx) => {
                const isHighlighted =
                  isAutoAnimating && Math.floor((currentTick % 90) / 30) === idx;
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border text-right text-xs leading-relaxed shadow-md flex items-start gap-2 transition-all ${
                      isHighlighted
                        ? 'bg-amber-500/15 border-amber-400 text-white'
                        : 'bg-slate-950/75 border-amber-500/25 text-slate-200'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{note}</span>
                  </div>
                );
              })}
            </div>
          )}

          {lectureData?.realWorldExamples && lectureData.realWorldExamples.length > 0 && revealStep >= 4 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {lectureData.realWorldExamples.slice(0, 2).map((ex, i) => (
                <div
                  key={i}
                  className="p-3 rounded-2xl bg-[#071a30]/90 border border-emerald-500/35 text-right space-y-1.5 text-xs"
                >
                  <div className="font-black text-emerald-300 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{ex.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-200">
                    <strong className="text-amber-300">من واقعنا اليمني: </strong>
                    {ex.yemeniAnalogy}
                  </p>
                  <p className="text-[11px] text-cyan-200 flex items-start gap-1">
                    <Factory className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{ex.engineeringApplication}</span>
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Yemeni Encouragement Footer Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-bold">
            <span className="text-amber-300 font-sans flex items-center gap-1.5">
              <span>🇾🇪</span>
              <span>{lectureData?.yemeniEncouragement || 'تذكّر: المهندس اليمني ما يعرف مستحيل!'}</span>
            </span>
            <span className="text-slate-400 font-mono text-[10px]">
              اللهجة: {activeDialect === 'sanani' ? 'صنعانية' : activeDialect === 'adani' ? 'عدنية' : 'تعزية'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
