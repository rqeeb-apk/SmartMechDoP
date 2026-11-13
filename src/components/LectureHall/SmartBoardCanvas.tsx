import React, { useState, useRef, useEffect } from 'react';
import {
  PenTool, Eraser, Trash2, Radio, Sparkles, Activity,
  Maximize2, RotateCcw, Zap, Compass, Cpu, Layers, Bot, Eye
} from 'lucide-react';
import { LectureHallResponseData } from '../../services/lectureHallApi';

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
  const [penColor, setPenColor] = useState<string>('#38bdf8'); // cyan default
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeGearAngle, setActiveGearAngle] = useState(0);
  const [activeServoAngle, setActiveServoAngle] = useState(45);
  const [currentTick, setCurrentTick] = useState(0);

  // Animation frame for rotating gears, circuits, and servos
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveGearAngle((prev) => (prev + 3) % 360);
      setActiveServoAngle((prev) => 45 + Math.sin(Date.now() / 800) * 45);
      setCurrentTick((prev) => (prev + 1) % 100);
    }, 40);
    return () => clearInterval(timer);
  }, []);

  // Handle Canvas Drawing
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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = activeTool === 'eraser' ? '#070f1e' : penColor;
    ctx.lineWidth = activeTool === 'eraser' ? 24 : 3;
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

  const handleEndDraw = () => {
    setIsDrawing(false);
  };

  const clearCanvasDrawings = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setLaserPos(null);
    if (onClearBoard) onClearBoard();
  };

  // Resize canvas according to display DPI
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * (window.devicePixelRatio || 1);
    canvas.height = rect.height * (window.devicePixelRatio || 1);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }
  }, []);

  const diagram = lectureData?.diagramType || 'circuit';

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-[#0A1628] border-4 border-amber-500/50 shadow-2xl flex flex-col select-none">
      
      {/* Smart Board Bezel Header */}
      <div className="bg-[#050B14] px-4 py-2 border-b border-amber-500/30 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="font-mono font-bold text-emerald-400 text-[11px]">السبورة الذكية متصلة · 4K UHD</span>
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-amber-400 font-bold hidden sm:inline font-mono">
            جامعات اليمن للهندسة · ميكاترونكس
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5 bg-[#0D1E38] p-1 rounded-xl border border-slate-700/80">
          {/* Laser Pointer Tool */}
          <button
            onClick={() => setActiveTool('laser')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              activeTool === 'laser'
                ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50 shadow-sm shadow-rose-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
            title="مؤشر الليزر التفاعلي"
          >
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span className="hidden md:inline">مؤشر ليزر</span>
          </button>

          {/* Pen Tool */}
          <button
            onClick={() => setActiveTool('pen')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              activeTool === 'pen'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:text-white'
            }`}
            title="قلم السبورة الذكية"
          >
            <PenTool className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">قلم</span>
          </button>

          {/* Color Selector if Pen */}
          {activeTool === 'pen' && (
            <div className="flex items-center gap-1 px-1">
              {[
                { color: '#ffffff', name: 'أبيض' },
                { color: '#fbbf24', name: 'ذهبي' },
                { color: '#38bdf8', name: 'سماوي' },
                { color: '#34d399', name: 'أخضر' },
                { color: '#f87171', name: 'أحمر' },
              ].map((c) => (
                <button
                  key={c.color}
                  onClick={() => setPenColor(c.color)}
                  className={`w-4 h-4 rounded-full border transition-transform ${
                    penColor === c.color ? 'scale-125 border-white shadow' : 'border-slate-600 opacity-60'
                  }`}
                  style={{ backgroundColor: c.color }}
                  title={c.name}
                />
              ))}
            </div>
          )}

          {/* Eraser */}
          <button
            onClick={() => setActiveTool('eraser')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              activeTool === 'eraser'
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                : 'text-slate-400 hover:text-white'
            }`}
            title="ممحاة"
          >
            <Eraser className="w-3.5 h-3.5 text-amber-400" />
          </button>

          {/* Clear Board */}
          <button
            onClick={clearCanvasDrawings}
            className="p-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="مسح السبورة"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Board Surface */}
      <div
        ref={containerRef}
        className="relative min-h-[380px] sm:min-h-[460px] md:min-h-[520px] w-full bg-gradient-to-b from-[#060F1E] via-[#08152B] to-[#050C18] p-4 sm:p-6 overflow-hidden flex flex-col justify-between"
        onMouseDown={(e) => handleStartDraw(e.clientX, e.clientY)}
        onMouseMove={(e) => handleMoveDraw(e.clientX, e.clientY)}
        onMouseUp={handleEndDraw}
        onTouchStart={(e) => {
          if (e.touches && e.touches[0]) {
            handleStartDraw(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchMove={(e) => {
          if (e.touches && e.touches[0]) {
            handleMoveDraw(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchEnd={handleEndDraw}
        style={{ touchAction: 'none' }}
      >
        {/* Subtle Engineering Grid Background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, #38bdf8 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
        />

        {/* Freehand HTML5 Canvas Overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
        />

        {/* Laser Pointer Dot */}
        {laserPos && (
          <div
            className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{ left: laserPos.x, top: laserPos.y }}
          >
            <div className="w-4 h-4 rounded-full bg-rose-500 animate-ping opacity-75" />
            <div className="absolute inset-0 w-3 h-3 m-auto rounded-full bg-rose-400 shadow-[0_0_15px_#f43f5e]" />
          </div>
        )}

        {/* =========================================================================
            ZONE A: Smart Board Title & Equation Header
            ========================================================================= */}
        <div className="relative z-10 text-right space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[11px] font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>{lectureData?.diagramTitle || 'شرح المفهوم الهندسي التفاعلي'}</span>
          </div>

          <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
            {lectureData?.boardTitle || 'أهلاً بك في قاعة المحاضرات والسبورة الذكية'}
          </h2>

          {lectureData?.boardEquation && (
            <div className="inline-block mt-1 p-2 sm:p-3 rounded-2xl bg-slate-900/90 border border-cyan-400/40 text-cyan-300 font-mono font-black text-sm sm:text-lg shadow-lg">
              <span className="text-amber-400 font-sans text-xs ml-2">المعادلة:</span>
              <span>{lectureData.boardEquation}</span>
            </div>
          )}
        </div>

        {/* =========================================================================
            ZONE B: Central Animated Smart Diagrams (Tinkercad-Style)
            ========================================================================= */}
        <div className="relative z-10 my-4 flex items-center justify-center min-h-[180px] sm:min-h-[220px]">
          
          {/* 1. Circuit Schematic with Glowing Flowing Current */}
          {diagram === 'circuit' && (
            <div className="relative w-full max-w-md bg-slate-950/80 border border-cyan-500/30 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col items-center">
              <div className="flex items-center justify-between w-full text-[11px] text-cyan-300 font-mono font-bold mb-3">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                  <span>دائرة كهربائية مغلقة Closed Loop</span>
                </span>
                <span className="text-emerald-400">سريان التيار: نشط I = V / R</span>
              </div>

              {/* Animated SVG Circuit Diagram */}
              <svg viewBox="0 0 340 140" className="w-full max-w-sm h-32 overflow-visible">
                {/* Wire Path */}
                <rect
                  x="20"
                  y="20"
                  width="300"
                  height="100"
                  rx="10"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="4"
                />

                {/* Animated Flowing Electricity Dash */}
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
                  className="filter drop-shadow-[0_0_6px_#38bdf8]"
                />

                {/* 5V DC Source (Left) */}
                <g transform="translate(20, 70)">
                  <circle cx="0" cy="0" r="14" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
                  <text x="0" y="4" fill="#fbbf24" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                    +5V
                  </text>
                </g>

                {/* Resistor (Top) */}
                <g transform="translate(170, 20)">
                  <rect x="-35" y="-10" width="70" height="20" rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                  <text x="0" y="4" fill="#f8fafc" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                    R = 220Ω
                  </text>
                  {/* Resistor Color Bands */}
                  <line x1="-20" y1="-8" x2="-20" y2="8" stroke="#ef4444" strokeWidth="2.5" />
                  <line x1="-10" y1="-8" x2="-10" y2="8" stroke="#ef4444" strokeWidth="2.5" />
                  <line x1="0" y1="-8" x2="0" y2="8" stroke="#854d0e" strokeWidth="2.5" />
                  <line x1="15" y1="-8" x2="15" y2="8" stroke="#fbbf24" strokeWidth="2.5" />
                </g>

                {/* Glowing LED (Right) */}
                <g transform="translate(320, 70)">
                  <circle
                    cx="0"
                    cy="0"
                    r="12"
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="filter drop-shadow-[0_0_12px_#ef4444]"
                  />
                  <text x="0" y="4" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                    LED
                  </text>
                </g>

                {/* Switch (Bottom) */}
                <g transform="translate(170, 120)">
                  <rect x="-30" y="-8" width="60" height="16" rx="4" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
                  <text x="0" y="3.5" fill="#10b981" fontSize="8" fontWeight="bold" textAnchor="middle">
                    قاطع مغلق ON
                  </text>
                </g>
              </svg>
            </div>
          )}

          {/* 2. Rotating Meshing Gears (Mechanics / Souq al-Milh Mill analogy) */}
          {diagram === 'gears' && (
            <div className="relative w-full max-w-md bg-slate-950/80 border border-amber-500/30 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col items-center">
              <div className="flex items-center justify-between w-full text-[11px] text-amber-300 font-mono font-bold mb-3">
                <span>تعشيق التروس ونقل العزم (Gear Mesh)</span>
                <span className="text-cyan-400">نسبة التخفيض i = 2 : 1</span>
              </div>

              <div className="flex items-center justify-center gap-2 sm:gap-4 py-2">
                {/* Driver Gear (Small, Fast) */}
                <div
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-amber-400 border-dashed flex items-center justify-center bg-amber-500/10 shadow-lg shadow-amber-500/20"
                  style={{ transform: `rotate(${activeGearAngle}deg)` }}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-amber-300 flex items-center justify-center text-[10px] font-bold text-amber-300">
                    N1
                  </div>
                </div>

                {/* Driven Gear (Large, Slow) */}
                <div
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-cyan-400 border-dashed flex items-center justify-center bg-cyan-500/10 shadow-lg shadow-cyan-500/20"
                  style={{ transform: `rotate(${-activeGearAngle / 2}deg)` }}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-cyan-300 flex items-center justify-center text-xs font-bold text-cyan-300">
                    N2
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 font-sans mt-2 text-center">
                الترس الصغير يدور بسرعة أعلى ويضاعف العزم في الترس الكبير (كما في مطاحن الحبوب وصناديق التروس).
              </p>
            </div>
          )}

          {/* 3. Arduino UNO / Microcontroller System */}
          {diagram === 'arduino' && (
            <div className="relative w-full max-w-md bg-slate-950/80 border border-teal-500/30 rounded-2xl p-4 shadow-xl flex flex-col items-center">
              <div className="flex items-center justify-between w-full text-[11px] text-teal-300 font-mono font-bold mb-2">
                <span>لوحة التحكم Arduino UNO R3</span>
                <span className="text-amber-400 font-bold">ATMega328P · 16MHz</span>
              </div>

              <div className="w-64 h-36 bg-[#005c6e] border-2 border-[#00979d] rounded-2xl p-3 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                <div className="flex justify-between items-center text-[9px] font-mono text-teal-200">
                  <span className="font-bold">ARDUINO UNO</span>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-emerald-300 text-[8px]">TX/RX</span>
                  </div>
                </div>

                {/* MCU Chip */}
                <div className="w-32 mx-auto h-7 bg-slate-900 rounded border border-slate-700 flex items-center justify-center text-[9px] font-mono text-slate-300">
                  ATmega328P-PU
                </div>

                {/* Active Pin 13 LED */}
                <div className="flex justify-between items-center text-[8px] font-mono text-teal-100">
                  <span>DIGITAL (PWM ~)</span>
                  <div className="flex items-center gap-1.5 bg-slate-900/80 px-2 py-0.5 rounded-full border border-amber-400/50">
                    <span>PIN 13</span>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. Servo Motor 0° - 180° */}
          {diagram === 'servo' && (
            <div className="relative w-full max-w-md bg-slate-950/80 border border-blue-500/30 rounded-2xl p-4 shadow-xl flex flex-col items-center">
              <div className="flex items-center justify-between w-full text-[11px] text-blue-300 font-mono font-bold mb-2">
                <span>محرك السيرفو SG90 Micro Servo</span>
                <span className="text-amber-400 font-mono">الزاوية: {Math.round(activeServoAngle)}°</span>
              </div>

              <div className="relative w-40 h-28 flex items-center justify-center">
                {/* Servo Body */}
                <div className="w-24 h-20 bg-blue-600 rounded-xl border border-blue-400 shadow-md flex items-center justify-center">
                  <span className="text-[10px] font-black text-white font-mono">SG90</span>
                </div>

                {/* Rotating Arm */}
                <div
                  className="absolute w-16 h-3 bg-white rounded-full border border-slate-400 shadow origin-left transition-transform"
                  style={{
                    left: '50%',
                    transform: `rotate(${activeServoAngle}deg)`,
                  }}
                />
              </div>
            </div>
          )}

          {/* 5. PLC Ladder Logic */}
          {diagram === 'plc' && (
            <div className="relative w-full max-w-md bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-4 shadow-xl flex flex-col items-center">
              <div className="flex items-center justify-between w-full text-[11px] text-emerald-300 font-mono font-bold mb-3">
                <span>مخطط السلم المنطقي PLC Ladder Rung</span>
                <span className="text-amber-400">Scan Time: 2ms</span>
              </div>

              {/* Ladder Rung Graphic */}
              <div className="w-full flex items-center justify-between px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-white">
                <span className="text-amber-400 font-black">| L1</span>
                
                {/* Contact I0.0 */}
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">--[</span>
                  <span className="text-emerald-400 font-bold">I0.0 (ON)</span>
                  <span className="text-slate-400">]--</span>
                </div>

                {/* Output Coil Q0.0 */}
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">--(</span>
                  <span className="text-cyan-400 font-bold animate-pulse">Q0.0 Motor</span>
                  <span className="text-slate-400">)--</span>
                </div>

                <span className="text-amber-400 font-black">L2 |</span>
              </div>
            </div>
          )}

          {/* 6. Concept Mindmap or Graph */}
          {(diagram === 'mindmap' || diagram === 'graph') && (
            <div className="relative w-full max-w-md bg-slate-950/80 border border-purple-500/30 rounded-2xl p-4 shadow-xl">
              <div className="text-[11px] text-purple-300 font-mono font-bold mb-3 text-right">
                خريطة المفاهيم الهندسية والترابط المنطقي
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                {(lectureData?.boardNotes || [
                  'التحكم المغلق Feedback Loop',
                  'المستشعرات Sensors',
                  'المعالجات Microcontrollers',
                  'المحركات ومشغلات الحركة Actuators',
                ]).slice(0, 4).map((n, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-slate-900/90 border border-purple-500/30 text-purple-200 text-right flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                    <span>{n}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* =========================================================================
            ZONE C: Board Notes, Yemeni Wisdom, and Live Step Indicator
            ========================================================================= */}
        <div className="relative z-10 space-y-3">
          {/* Notes Bullet Cards */}
          {lectureData?.boardNotes && lectureData.boardNotes.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {lectureData.boardNotes.slice(0, 3).map((note, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-950/70 border border-amber-500/25 text-right text-xs text-slate-200 leading-relaxed shadow-md flex items-start gap-2"
                >
                  <span className="w-4 h-4 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{note}</span>
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
