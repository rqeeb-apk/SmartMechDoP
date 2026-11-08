import React, { useRef, useState, useEffect } from 'react';
import { BoardColor } from '../../types';
import { Edit2, Eraser, Download, RotateCcw, Plus, ChevronRight, ChevronLeft, Type, Square, Circle, ArrowRight, Zap } from 'lucide-react';

interface WhiteboardCanvasProps {
  boardColor: BoardColor;
  initialTextNotes?: string;
  diagramCommands?: string[];
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  boardColor,
  initialTextNotes,
  diagramCommands,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'line' | 'rect' | 'circle' | 'resistor' | 'capacitor' | 'diode' | 'text'>('pen');
  const [color, setColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(3);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(3);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

  // Background color mapping
  const bgStyles: Record<BoardColor, { bg: string; grid: string; defaultColor: string }> = {
    green: { bg: '#1b4332', grid: 'rgba(255,255,255,0.05)', defaultColor: '#f1f5f9' },
    navy: { bg: '#0b2545', grid: 'rgba(0,240,255,0.07)', defaultColor: '#00f0ff' },
    dark: { bg: '#0f172a', grid: 'rgba(255,255,255,0.06)', defaultColor: '#e2e8f0' },
    white: { bg: '#ffffff', grid: 'rgba(0,0,0,0.06)', defaultColor: '#0f172a' },
  };

  const currentBg = bgStyles[boardColor] || bgStyles.green;

  // Initialize Canvas & Draw Background Grid
  const drawCanvasBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = currentBg.bg;
    ctx.fillRect(0, 0, width, height);

    // Draw subtle grid lines
    ctx.strokeStyle = currentBg.grid;
    ctx.lineWidth = 1;
    const step = 30;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  // Word wrapper helper for blackboard canvas text rendering
  const drawChalkTextWrapped = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): number => {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
    return currentY + lineHeight;
  };

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawCanvasBackground(ctx, canvas.width, canvas.height);

    // Render lecture content & notes DIRECTLY INSIDE THE WHITEBOARD
    if (initialTextNotes) {
      let currentY = 50;

      // Draw Top Blackboard Header
      ctx.font = 'bold 22px Cairo, sans-serif';
      ctx.fillStyle = '#f59e0b'; // Gold chalk
      ctx.fillText('📌 سبورة الدكتور الذكي للميكاترونكس', 40, currentY);
      currentY += 35;

      // Line Separator
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(40, currentY - 10);
      ctx.lineTo(canvas.width - 40, currentY - 10);
      ctx.stroke();

      ctx.font = 'bold 16px Cairo, sans-serif';
      ctx.fillStyle = currentBg.defaultColor;

      const lines = initialTextNotes.split('\n');
      lines.forEach((lineText) => {
        if (currentY > canvas.height - 40) return; // Prevent overflow beyond canvas boundary

        if (lineText.startsWith('•') || lineText.startsWith('-')) {
          ctx.fillStyle = '#00f0ff'; // Cyan bullet
          currentY = drawChalkTextWrapped(ctx, lineText, 50, currentY, canvas.width - 100, 26);
        } else if (lineText.includes('=')) {
          ctx.font = 'bold 18px JetBrains Mono, monospace';
          ctx.fillStyle = '#f59e0b'; // Formula highlight
          currentY = drawChalkTextWrapped(ctx, `📐  ${lineText}`, 45, currentY, canvas.width - 90, 28);
          ctx.font = 'bold 16px Cairo, sans-serif';
        } else {
          ctx.fillStyle = currentBg.defaultColor;
          currentY = drawChalkTextWrapped(ctx, lineText, 40, currentY, canvas.width - 80, 26);
        }
      });
    }

    if (diagramCommands && diagramCommands.length > 0) {
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      diagramCommands.forEach((cmd, idx) => {
        if (cmd.includes('RESISTOR')) {
          drawResistorStamp(ctx, 600 + (idx % 2) * 160, 160 + Math.floor(idx / 2) * 100);
        } else if (cmd.includes('CAPACITOR')) {
          drawCapacitorStamp(ctx, 600 + (idx % 2) * 160, 160 + Math.floor(idx / 2) * 100);
        } else if (cmd.includes('LABEL') || cmd.includes('FORMULA')) {
          ctx.font = 'bold 16px JetBrains Mono, monospace';
          ctx.fillStyle = '#10b981';
          ctx.fillText(cmd.replace(/DRAW_.*?:/, ''), 550, 340 + idx * 30);
        }
      });
    }
  };


  useEffect(() => {
    resetCanvas();
  }, [boardColor, initialTextNotes, diagramCommands, currentPage]);

  const drawResistorStamp = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.save();
    ctx.strokeStyle = color === '#ffffff' ? '#00f0ff' : color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 20, y);
    // Zig-zag
    ctx.lineTo(x + 25, y - 10);
    ctx.lineTo(x + 35, y + 10);
    ctx.lineTo(x + 45, y - 10);
    ctx.lineTo(x + 55, y + 10);
    ctx.lineTo(x + 65, y - 10);
    ctx.lineTo(x + 75, y + 10);
    ctx.lineTo(x + 80, y);
    ctx.lineTo(x + 100, y);
    ctx.stroke();
    ctx.font = '12px JetBrains Mono';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillText('R (10kΩ)', x + 25, y - 18);
    ctx.restore();
  };

  const drawCapacitorStamp = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 35, y);
    ctx.moveTo(x + 35, y - 20);
    ctx.lineTo(x + 35, y + 20);
    ctx.moveTo(x + 45, y - 20);
    ctx.lineTo(x + 45, y + 20);
    ctx.moveTo(x + 45, y);
    ctx.lineTo(x + 80, y);
    ctx.stroke();
    ctx.font = '12px JetBrains Mono';
    ctx.fillStyle = color;
    ctx.fillText('C (100uF)', x + 20, y - 24);
    ctx.restore();
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPos(coords);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (tool === 'resistor') {
      drawResistorStamp(ctx, coords.x, coords.y);
      setIsDrawing(false);
      return;
    }
    if (tool === 'capacitor') {
      drawCapacitorStamp(ctx, coords.x, coords.y);
      setIsDrawing(false);
      return;
    }
    if (tool === 'text') {
      const textPrompt = prompt('أدخل النص أو القانون المطلوب كتابته على السبورة:');
      if (textPrompt) {
        ctx.font = 'bold 20px Cairo, sans-serif';
        ctx.fillStyle = color;
        ctx.fillText(textPrompt, coords.x, coords.y);
      }
      setIsDrawing(false);
      return;
    }

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (tool === 'pen') {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (tool === 'eraser') {
      ctx.strokeStyle = currentBg.bg;
      ctx.lineWidth = lineWidth * 5;
      ctx.lineCap = 'round';
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setStartPos(null);
  };

  const downloadCanvasImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `dr_smart_whiteboard_page_${currentPage}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl text-slate-200">
        
        {/* Tools */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setTool('pen')}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              tool === 'pen' ? 'bg-cyan-500 text-black font-bold' : 'hover:bg-slate-800 text-slate-300'
            }`}
            title="قلم كتابة"
          >
            <Edit2 className="w-4 h-4" />
            <span className="hidden sm:inline">القلم</span>
          </button>

          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              tool === 'eraser' ? 'bg-rose-500 text-white font-bold' : 'hover:bg-slate-800 text-slate-300'
            }`}
            title="ممحاة الإلكترونية"
          >
            <Eraser className="w-4 h-4" />
            <span className="hidden sm:inline">ممحاة</span>
          </button>

          <button
            onClick={() => setTool('resistor')}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              tool === 'resistor' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'hover:bg-slate-800 text-slate-300'
            }`}
            title="طبع مقاومة R"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">مقاومة R</span>
          </button>

          <button
            onClick={() => setTool('text')}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              tool === 'text' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'hover:bg-slate-800 text-slate-300'
            }`}
            title="إضافة معادلة/نص"
          >
            <Type className="w-4 h-4" />
            <span className="hidden sm:inline">معادلة/نص</span>
          </button>
        </div>

        {/* Colors Palette */}
        <div className="flex items-center gap-1.5">
          {['#ffffff', '#00f0ff', '#f59e0b', '#10b981', '#ef4444', '#a855f7'].map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                color === c ? 'scale-125 border-white shadow-md' : 'border-slate-700 hover:scale-110'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Pagination & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded-lg">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="disabled:opacity-40 hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span>
              صفحة {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => {
                if (currentPage >= totalPages) setTotalPages((t) => t + 1);
                setCurrentPage((p) => p + 1);
              }}
              className="hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={resetCanvas}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            title="مسح السبورة"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={downloadCanvasImage}
            className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500 hover:text-black transition-colors"
            title="حفظ السبورة كصورة"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl" style={{ backgroundColor: currentBg.bg }}>
        <canvas
          ref={canvasRef}
          width={1000}
          height={550}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="w-full h-auto cursor-crosshair touch-none block"
        />

        <div className="absolute top-3 left-3 pointer-events-none px-3 py-1 rounded-full bg-black/40 text-[11px] font-mono text-cyan-400 backdrop-blur-sm border border-white/10">
          سبورة الدكتور الذكي - صفحة {currentPage}
        </div>
      </div>
    </div>
  );
};
