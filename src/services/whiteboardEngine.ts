import rough from 'roughjs';
import { animate } from 'animejs';
import { whiteboardAudioSfx } from './whiteboardAudioSfx';

export const LOGICAL_WIDTH = 900;
export const BASE_LOGICAL_HEIGHT = 500;

export type WhiteboardDrawMode = 'pencil' | 'line' | 'shape' | 'erase';

interface InteractiveStrokeState {
  active: boolean;
  mode: WhiteboardDrawMode;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  points: [number, number][];
  color: string;
  seed: number;
}

interface WhiteboardState {
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  snapshot: HTMLCanvasElement | null;
  snapshotCtx: CanvasRenderingContext2D | null;
  rcSnapshot: ReturnType<typeof rough.canvas> | null;
  rcLive: ReturnType<typeof rough.canvas> | null;
  logicalHeight: number;
  runToken: number;
  seedCounter: number;
  interactive: InteractiveStrokeState;
}

const wb: WhiteboardState = {
  canvas: null,
  ctx: null,
  snapshot: null,
  snapshotCtx: null,
  rcSnapshot: null,
  rcLive: null,
  logicalHeight: BASE_LOGICAL_HEIGHT,
  runToken: 0,
  seedCounter: 100,
  interactive: {
    active: false,
    mode: 'pencil',
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    points: [],
    color: '#0F172A',
    seed: 100,
  },
};

function nextSeed(): number {
  wb.seedCounter += 1;
  return wb.seedCounter;
}

function applyLogicalTransform(ctx: CanvasRenderingContext2D) {
  const sx = ctx.canvas.width / LOGICAL_WIDTH;
  const sy = ctx.canvas.height / wb.logicalHeight;
  ctx.setTransform(sx, 0, 0, sy, 0, 0);
}

function drawWhiteGridBackground(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (ctx.canvas) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
  ctx.restore();

  applyLogicalTransform(ctx);
  ctx.save();
  ctx.fillStyle = 'rgba(14, 165, 233, 0.14)';
  for (let x = 30; x < LOGICAL_WIDTH; x += 30) {
    for (let y = 30; y < wb.logicalHeight; y += 30) {
      ctx.beginPath();
      ctx.arc(x, y, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function syncDisplayFromSnapshot() {
  if (!wb.ctx || !wb.canvas || !wb.snapshot) return;
  wb.ctx.save();
  wb.ctx.setTransform(1, 0, 0, 1, 0, 0);
  wb.ctx.clearRect(0, 0, wb.canvas.width, wb.canvas.height);
  wb.ctx.drawImage(wb.snapshot, 0, 0);
  wb.ctx.restore();
  applyLogicalTransform(wb.ctx);
}

function isRunCancelled(token: number): boolean {
  return token !== wb.runToken || !wb.canvas || !wb.ctx;
}

function resizeCanvasBuffers(canvasElement: HTMLCanvasElement, targetLogicalHeight: number): void {
  const clampedLogicalH = Math.max(BASE_LOGICAL_HEIGHT, Math.min(3400, Math.round(targetLogicalHeight)));
  wb.logicalHeight = clampedLogicalH;

  const rect = canvasElement.getBoundingClientRect();
  const displayWidth = Math.max(320, rect.width || LOGICAL_WIDTH);
  const displayHeight = Math.round(displayWidth * (clampedLogicalH / LOGICAL_WIDTH));

  canvasElement.style.height = `${displayHeight}px`;

  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  const pixelWidth = Math.round(displayWidth * dpr);
  const pixelHeight = Math.round(displayHeight * dpr);

  canvasElement.width = pixelWidth;
  canvasElement.height = pixelHeight;

  const ctx = canvasElement.getContext('2d');
  if (!ctx) return;

  const snapshot = document.createElement('canvas');
  snapshot.width = pixelWidth;
  snapshot.height = pixelHeight;
  const snapshotCtx = snapshot.getContext('2d');
  if (!snapshotCtx) return;

  wb.canvas = canvasElement;
  wb.ctx = ctx;
  wb.snapshot = snapshot;
  wb.snapshotCtx = snapshotCtx;
  wb.rcLive = rough.canvas(canvasElement);
  wb.rcSnapshot = rough.canvas(snapshot);
}

/**
 * تهيئة السبورة البيضاء HTML5 Canvas وإعداد Rough.js
 */
export function initWhiteboard(canvasElement: HTMLCanvasElement): void {
  if (!canvasElement) return;
  resizeCanvasBuffers(canvasElement, BASE_LOGICAL_HEIGHT);
  clearBoard();
}

/**
 * مسح السبورة وإعادة تهيئتها بخلفية بيضاء ناصعة
 */
export function clearBoard(): void {
  wb.runToken += 1;
  if (!wb.canvas) return;
  if (wb.logicalHeight !== BASE_LOGICAL_HEIGHT) {
    resizeCanvasBuffers(wb.canvas, BASE_LOGICAL_HEIGHT);
  }
  if (!wb.snapshotCtx || !wb.ctx) return;
  drawWhiteGridBackground(wb.snapshotCtx);
  syncDisplayFromSnapshot();
}

/**
 * إلغاء أي أنيميشن قيد التشغيل دون مسح المحتوى الحالي
 */
export function cancelWhiteboardAnimation(): void {
  wb.runToken += 1;
}

/**
 * تحويل إحداثيات المؤشر في الشاشة إلى إحداثيات السبورة المنطقية
 */
export function clientToLogicalPoint(
  canvasEl: HTMLCanvasElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const rect = canvasEl.getBoundingClientRect();
  const w = rect.width || LOGICAL_WIDTH;
  const h = rect.height || wb.logicalHeight;
  return {
    x: Math.max(0, Math.min(LOGICAL_WIDTH, ((clientX - rect.left) / w) * LOGICAL_WIDTH)),
    y: Math.max(0, Math.min(wb.logicalHeight, ((clientY - rect.top) / h) * wb.logicalHeight)),
  };
}

/**
 * بدء رسم يدوي على السبورة حسب الوضع المختار (Pencil / Line / Shape / Erase)
 */
export function startInteractiveStroke(
  mode: WhiteboardDrawMode,
  x: number,
  y: number,
  color: string = '#0F172A'
): void {
  if (!wb.ctx || !wb.snapshotCtx) return;
  const seed = nextSeed();
  wb.interactive = {
    active: true,
    mode,
    startX: x,
    startY: y,
    lastX: x,
    lastY: y,
    points: [[x, y]],
    color,
    seed,
  };

  if (mode === 'pencil' || mode === 'line') {
    whiteboardAudioSfx.playPenStroke('wire');
  } else if (mode === 'shape') {
    whiteboardAudioSfx.playPenStroke('box');
  } else if (mode === 'erase') {
    whiteboardAudioSfx.playPenStroke('clear');
  }
}

/**
 * متابعة الرسم اليدوي عند تحريك المؤشر أو الإصبع
 */
export function moveInteractiveStroke(x: number, y: number): void {
  if (!wb.interactive.active || !wb.ctx || !wb.rcLive || !wb.snapshotCtx) return;
  const { mode, startX, startY, lastX, lastY, color, seed } = wb.interactive;

  if (mode === 'pencil') {
    wb.interactive.points.push([x, y]);
    wb.interactive.lastX = x;
    wb.interactive.lastY = y;

    applyLogicalTransform(wb.ctx);
    wb.ctx.save();
    wb.ctx.strokeStyle = color;
    wb.ctx.lineWidth = 2.6;
    wb.ctx.lineCap = 'round';
    wb.ctx.lineJoin = 'round';
    wb.ctx.beginPath();
    wb.ctx.moveTo(lastX, lastY);
    wb.ctx.lineTo(x, y);
    wb.ctx.stroke();
    wb.ctx.restore();

    applyLogicalTransform(wb.snapshotCtx);
    wb.snapshotCtx.save();
    wb.snapshotCtx.strokeStyle = color;
    wb.snapshotCtx.lineWidth = 2.6;
    wb.snapshotCtx.lineCap = 'round';
    wb.snapshotCtx.lineJoin = 'round';
    wb.snapshotCtx.beginPath();
    wb.snapshotCtx.moveTo(lastX, lastY);
    wb.snapshotCtx.lineTo(x, y);
    wb.snapshotCtx.stroke();
    wb.snapshotCtx.restore();
    return;
  }

  if (mode === 'erase') {
    wb.interactive.lastX = x;
    wb.interactive.lastY = y;

    applyLogicalTransform(wb.snapshotCtx);
    wb.snapshotCtx.save();
    wb.snapshotCtx.strokeStyle = '#FFFFFF';
    wb.snapshotCtx.lineWidth = 26;
    wb.snapshotCtx.lineCap = 'round';
    wb.snapshotCtx.lineJoin = 'round';
    wb.snapshotCtx.beginPath();
    wb.snapshotCtx.moveTo(lastX, lastY);
    wb.snapshotCtx.lineTo(x, y);
    wb.snapshotCtx.stroke();
    wb.snapshotCtx.restore();
    syncDisplayFromSnapshot();
    return;
  }

  if (mode === 'line') {
    wb.interactive.lastX = x;
    wb.interactive.lastY = y;
    syncDisplayFromSnapshot();
    wb.rcLive.line(startX, startY, x, y, {
      stroke: color,
      strokeWidth: 2.6,
      roughness: 1.0,
      seed,
    });
    return;
  }

  if (mode === 'shape') {
    wb.interactive.lastX = x;
    wb.interactive.lastY = y;
    syncDisplayFromSnapshot();
    const rx = Math.min(startX, x);
    const ry = Math.min(startY, y);
    const rw = Math.max(6, Math.abs(x - startX));
    const rh = Math.max(6, Math.abs(y - startY));
    wb.rcLive.rectangle(rx, ry, rw, rh, {
      stroke: color,
      strokeWidth: 2.4,
      fill: 'rgba(14, 165, 233, 0.14)',
      fillStyle: 'hachure',
      hachureGap: 8,
      roughness: 1.1,
      seed,
    });
  }
}

/**
 * إنهاء وتثبيت الرسم اليدوي في اللوحة
 */
export function endInteractiveStroke(): void {
  if (!wb.interactive.active || !wb.snapshotCtx || !wb.rcSnapshot) return;
  const { mode, startX, startY, lastX, lastY, color, seed, points } = wb.interactive;
  wb.interactive.active = false;

  if (mode === 'pencil' && points.length === 1) {
    applyLogicalTransform(wb.snapshotCtx);
    wb.snapshotCtx.save();
    wb.snapshotCtx.fillStyle = color;
    wb.snapshotCtx.beginPath();
    wb.snapshotCtx.arc(startX, startY, 1.8, 0, Math.PI * 2);
    wb.snapshotCtx.fill();
    wb.snapshotCtx.restore();
    syncDisplayFromSnapshot();
    return;
  }

  if (mode === 'line') {
    applyLogicalTransform(wb.snapshotCtx);
    wb.rcSnapshot.line(startX, startY, lastX, lastY, {
      stroke: color,
      strokeWidth: 2.6,
      roughness: 1.0,
      seed,
    });
    syncDisplayFromSnapshot();
    return;
  }

  if (mode === 'shape') {
    applyLogicalTransform(wb.snapshotCtx);
    const rx = Math.min(startX, lastX);
    const ry = Math.min(startY, lastY);
    const rw = Math.max(12, Math.abs(lastX - startX));
    const rh = Math.max(12, Math.abs(lastY - startY));
    wb.rcSnapshot.rectangle(rx, ry, rw, rh, {
      stroke: color,
      strokeWidth: 2.4,
      fill: 'rgba(14, 165, 233, 0.14)',
      fillStyle: 'hachure',
      hachureGap: 8,
      roughness: 1.1,
      seed,
    });
    syncDisplayFromSnapshot();
  }
}

/**
 * رسم سلك كهربائي متحرك من (x1, y1) إلى (x2, y2) باستخدام Rough.js و Anime.js
 */
export async function drawWire(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options?: { color?: string; duration?: number; token?: number }
): Promise<void> {
  if (!wb.ctx || !wb.rcLive || !wb.snapshotCtx || !wb.rcSnapshot) return;
  const token = options?.token ?? wb.runToken;
  const color = options?.color || '#0F172A';
  const duration = options?.duration ?? 380;
  const seed = nextSeed();
  const state = { t: 0 };
  whiteboardAudioSfx.playPenStroke('wire');

  await animate(state, {
    t: 1,
    duration,
    ease: 'inOutSine',
    onUpdate: () => {
      if (isRunCancelled(token) || !wb.rcLive || !wb.ctx) return;
      syncDisplayFromSnapshot();
      const cx = x1 + (x2 - x1) * state.t;
      const cy = y1 + (y2 - y1) * state.t;
      wb.rcLive.line(x1, y1, cx, cy, {
        stroke: color,
        strokeWidth: 2.6,
        roughness: 1.1,
        seed,
      });
      wb.ctx.save();
      wb.ctx.fillStyle = '#0EA5E9';
      wb.ctx.beginPath();
      wb.ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      wb.ctx.fill();
      wb.ctx.restore();
    },
  });

  if (isRunCancelled(token)) return;
  applyLogicalTransform(wb.snapshotCtx);
  wb.rcSnapshot.line(x1, y1, x2, y2, {
    stroke: color,
    strokeWidth: 2.6,
    roughness: 1.1,
    seed,
  });
  wb.snapshotCtx.save();
  wb.snapshotCtx.fillStyle = '#0EA5E9';
  wb.snapshotCtx.beginPath();
  wb.snapshotCtx.arc(x1, y1, 3.2, 0, Math.PI * 2);
  wb.snapshotCtx.arc(x2, y2, 3.2, 0, Math.PI * 2);
  wb.snapshotCtx.fill();
  wb.snapshotCtx.restore();
  syncDisplayFromSnapshot();
}

/**
 * رسم بطارية كهربائية DC عند الإحداثي (x, y)
 */
export async function drawBattery(
  x: number,
  y: number,
  label: string = 'V = 12V',
  options?: { token?: number; duration?: number }
): Promise<void> {
  if (!wb.ctx || !wb.rcLive || !wb.snapshotCtx || !wb.rcSnapshot) return;
  const token = options?.token ?? wb.runToken;
  const duration = options?.duration ?? 500;
  const seed = nextSeed();
  const state = { p: 0 };
  whiteboardAudioSfx.playPenStroke('component');

  const renderBattery = (rc: ReturnType<typeof rough.canvas>, ctx: CanvasRenderingContext2D, progress: number) => {
    const topProg = Math.min(1, progress * 3);
    if (topProg > 0) {
      rc.line(x, y - 40, x, y - 40 + 30 * topProg, {
        stroke: '#0F172A',
        strokeWidth: 2.5,
        roughness: 1.0,
        seed: seed + 1,
      });
    }

    if (progress > 0.2) {
      const plateP = Math.min(1, (progress - 0.2) / 0.35);
      rc.line(x - 26 * plateP, y - 10, x + 26 * plateP, y - 10, {
        stroke: '#DC2626',
        strokeWidth: 3.4,
        roughness: 1.0,
        seed: seed + 2,
      });
    }

    if (progress > 0.45) {
      const plateP = Math.min(1, (progress - 0.45) / 0.35);
      rc.line(x - 14 * plateP, y + 10, x + 14 * plateP, y + 10, {
        stroke: '#0F172A',
        strokeWidth: 4.5,
        roughness: 1.0,
        seed: seed + 3,
      });
    }

    if (progress > 0.65) {
      const botP = Math.min(1, (progress - 0.65) / 0.35);
      rc.line(x, y + 10, x, y + 10 + 30 * botP, {
        stroke: '#0F172A',
        strokeWidth: 2.5,
        roughness: 1.0,
        seed: seed + 4,
      });
    }

    if (progress > 0.75) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (progress - 0.75) / 0.25);
      ctx.font = 'bold 16px Cairo, sans-serif';
      ctx.fillStyle = '#DC2626';
      ctx.textAlign = 'center';
      ctx.fillText('+', x + 20, y - 22);
      ctx.fillStyle = '#0F172A';
      ctx.fillText('−', x + 20, y + 26);

      if (label) {
        ctx.font = 'bold 14px "JetBrains Mono", Cairo, sans-serif';
        ctx.fillStyle = '#0284C7';
        ctx.textAlign = 'right';
        ctx.fillText(label, x - 34, y + 4);
      }
      ctx.restore();
    }
  };

  await animate(state, {
    p: 1,
    duration,
    ease: 'outCubic',
    onUpdate: () => {
      if (isRunCancelled(token) || !wb.rcLive || !wb.ctx) return;
      syncDisplayFromSnapshot();
      renderBattery(wb.rcLive, wb.ctx, state.p);
    },
  });

  if (isRunCancelled(token)) return;
  applyLogicalTransform(wb.snapshotCtx);
  renderBattery(wb.rcSnapshot, wb.snapshotCtx, 1);
  syncDisplayFromSnapshot();
}

/**
 * رسم مقاومة كهربائية متعرجة عند الإحداثي (x, y)
 */
export async function drawResistor(
  x: number,
  y: number,
  label: string = 'R = 100Ω',
  options?: { token?: number; duration?: number }
): Promise<void> {
  if (!wb.ctx || !wb.rcLive || !wb.snapshotCtx || !wb.rcSnapshot) return;
  const token = options?.token ?? wb.runToken;
  const duration = options?.duration ?? 520;
  const seed = nextSeed();
  const state = { p: 0 };
  whiteboardAudioSfx.playPenStroke('component');

  const points: [number, number][] = [
    [x - 50, y],
    [x - 30, y],
    [x - 24, y - 14],
    [x - 14, y + 14],
    [x - 4, y - 14],
    [x + 6, y + 14],
    [x + 16, y - 14],
    [x + 26, y + 14],
    [x + 32, y],
    [x + 50, y],
  ];

  const renderResistor = (rc: ReturnType<typeof rough.canvas>, ctx: CanvasRenderingContext2D, progress: number) => {
    const totalSegments = points.length - 1;
    const exactSeg = progress * totalSegments;
    const fullSegs = Math.floor(exactSeg);
    const frac = exactSeg - fullSegs;

    const activePoints: [number, number][] = points.slice(0, fullSegs + 1);
    if (fullSegs < totalSegments && frac > 0) {
      const [sx, sy] = points[fullSegs];
      const [ex, ey] = points[fullSegs + 1];
      activePoints.push([sx + (ex - sx) * frac, sy + (ey - sy) * frac]);
    }

    if (activePoints.length >= 2) {
      rc.linearPath(activePoints, {
        stroke: '#D97706',
        strokeWidth: 2.8,
        roughness: 1.0,
        seed,
      });
    }

    if (progress > 0.7 && label) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (progress - 0.7) / 0.3);
      ctx.font = 'bold 14px "JetBrains Mono", Cairo, sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y - 24);
      ctx.restore();
    }
  };

  await animate(state, {
    p: 1,
    duration,
    ease: 'inOutQuad',
    onUpdate: () => {
      if (isRunCancelled(token) || !wb.rcLive || !wb.ctx) return;
      syncDisplayFromSnapshot();
      renderResistor(wb.rcLive, wb.ctx, state.p);
    },
  });

  if (isRunCancelled(token)) return;
  applyLogicalTransform(wb.snapshotCtx);
  renderResistor(wb.rcSnapshot, wb.snapshotCtx, 1);
  syncDisplayFromSnapshot();
}

/**
 * رسم صندوق/كتلة هندسية (مثل Arduino / PLC / Sensor / Block)
 */
export async function drawBox(
  x: number,
  y: number,
  w: number,
  h: number,
  label: string = '',
  options?: { color?: string; fill?: string; token?: number }
): Promise<void> {
  if (!wb.ctx || !wb.rcLive || !wb.snapshotCtx || !wb.rcSnapshot) return;
  const token = options?.token ?? wb.runToken;
  const color = options?.color || '#0EA5E9';
  const fill = options?.fill || 'rgba(224, 242, 254, 0.55)';
  const seed = nextSeed();
  const state = { p: 0 };
  whiteboardAudioSfx.playPenStroke('box');

  const renderBox = (rc: ReturnType<typeof rough.canvas>, ctx: CanvasRenderingContext2D, progress: number) => {
    const cw = Math.max(4, w * progress);
    const ch = Math.max(4, h * progress);
    rc.rectangle(x, y, cw, ch, {
      stroke: color,
      strokeWidth: 2.4,
      fill,
      fillStyle: 'hachure',
      hachureGap: 7,
      roughness: 1.2,
      seed,
    });
    if (progress > 0.7 && label) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (progress - 0.7) / 0.3);
      ctx.font = 'bold 14px Cairo, sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + w / 2, y + h / 2);
      ctx.restore();
    }
  };

  await animate(state, {
    p: 1,
    duration: 420,
    ease: 'outBack',
    onUpdate: () => {
      if (isRunCancelled(token) || !wb.rcLive || !wb.ctx) return;
      syncDisplayFromSnapshot();
      renderBox(wb.rcLive, wb.ctx, state.p);
    },
  });

  if (isRunCancelled(token)) return;
  applyLogicalTransform(wb.snapshotCtx);
  renderBox(wb.rcSnapshot, wb.snapshotCtx, 1);
  syncDisplayFromSnapshot();
}

/**
 * رسم سهم توضيحي لاتجاه التيار أو الإشارة
 */
export async function drawArrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label: string = '',
  options?: { color?: string; token?: number }
): Promise<void> {
  if (!wb.ctx || !wb.rcLive || !wb.snapshotCtx || !wb.rcSnapshot) return;
  const token = options?.token ?? wb.runToken;
  const color = options?.color || '#0EA5E9';
  const seed = nextSeed();
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 12;

  await drawWire(x1, y1, x2, y2, { color, duration: 320, token });
  if (isRunCancelled(token)) return;

  applyLogicalTransform(wb.snapshotCtx);
  wb.rcSnapshot.line(
    x2,
    y2,
    x2 - headLen * Math.cos(angle - Math.PI / 6),
    y2 - headLen * Math.sin(angle - Math.PI / 6),
    { stroke: color, strokeWidth: 2.5, seed }
  );
  wb.rcSnapshot.line(
    x2,
    y2,
    x2 - headLen * Math.cos(angle + Math.PI / 6),
    y2 - headLen * Math.sin(angle + Math.PI / 6),
    { stroke: color, strokeWidth: 2.5, seed: seed + 1 }
  );
  if (label) {
    wb.snapshotCtx.save();
    wb.snapshotCtx.font = 'bold 13px Cairo, sans-serif';
    wb.snapshotCtx.fillStyle = color;
    wb.snapshotCtx.textAlign = 'center';
    wb.snapshotCtx.fillText(label, (x1 + x2) / 2, (y1 + y2) / 2 - 12);
    wb.snapshotCtx.restore();
  }
  syncDisplayFromSnapshot();
}

/**
 * كتابة معادلة أو عنوان داخل منطقة الرسم باليد على السبورة بتأثير الكتابة التدريجية
 */
export async function drawText(
  text: string,
  x: number,
  y: number,
  options?: { color?: string; size?: number; token?: number; align?: CanvasTextAlign }
): Promise<void> {
  if (!wb.ctx || !wb.snapshotCtx) return;
  const token = options?.token ?? wb.runToken;
  const color = options?.color || '#0F172A';
  const size = options?.size || 18;
  const align = options?.align || 'center';
  const cleanText = String(text || '').trim();
  if (!cleanText) return;

  const state = { chars: 0 };
  const duration = Math.min(720, Math.max(240, cleanText.length * 20));
  whiteboardAudioSfx.playPenStroke('text');

  const renderLabel = (ctx: CanvasRenderingContext2D, partial: string) => {
    ctx.save();
    ctx.font = `800 ${size}px Cairo, "JetBrains Mono", sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(partial, x, y);
    ctx.restore();
  };

  await animate(state, {
    chars: cleanText.length,
    duration,
    ease: 'linear',
    onUpdate: () => {
      if (isRunCancelled(token) || !wb.ctx) return;
      syncDisplayFromSnapshot();
      const count = Math.max(1, Math.round(state.chars));
      renderLabel(wb.ctx, cleanText.slice(0, count));
    },
  });

  if (isRunCancelled(token)) return;
  applyLogicalTransform(wb.snapshotCtx);
  renderLabel(wb.snapshotCtx, cleanText);
  syncDisplayFromSnapshot();
}

/**
 * تقطيع النص العربي/الهندسي إلى أسطر متناسقة داخل حدود السبورة البيضاء
 */
function wrapCanvasLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string
): string[] {
  ctx.save();
  ctx.font = font;
  const rawParagraphs = String(text || '').split(/\r?\n/);
  const lines: string[] = [];

  for (const para of rawParagraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) {
      lines.push('');
      continue;
    }
    const words = trimmedPara.split(/\s+/);
    let currentLine = '';
    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        currentLine = candidate;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
  }
  ctx.restore();
  return lines;
}

/**
 * كتابة فقرة شرح أو حل مباشرة داخل السبورة البيضاء بالأنيميشن (سطر بسطر وحرف بحرف)
 */
async function drawBoardExplanationBlock(
  text: string,
  startY: number,
  token: number,
  onScrollToY?: (logicalY: number) => void
): Promise<number> {
  if (!wb.ctx || !wb.snapshotCtx || !wb.rcSnapshot || isRunCancelled(token)) return startY;

  const trimmed = text.trim();
  if (!trimmed) return startY;

  const isAnswerHighlight = trimmed.startsWith('✅') || trimmed.startsWith('💡') || trimmed.startsWith('سؤال');
  const font = isAnswerHighlight
    ? '800 17px Cairo, "JetBrains Mono", sans-serif'
    : '600 16px Cairo, "JetBrains Mono", sans-serif';
  const color = trimmed.startsWith('✅')
    ? '#0284C7'
    : trimmed.startsWith('💡')
    ? '#B45309'
    : '#0F172A';

  const maxLineWidth = 790; // Right margin 848 down to left margin 58
  const lineHeight = 29;
  const rightX = 835;

  const lines = wrapCanvasLines(wb.snapshotCtx, trimmed, maxLineWidth, font);
  let cursorY = startY;

  // Draw hand-drawn bullet marker next to the first line inside the whiteboard
  if (lines.length > 0 && lines[0] !== '') {
    applyLogicalTransform(wb.snapshotCtx);
    wb.rcSnapshot.circle(855, cursorY, 8, {
      stroke: isAnswerHighlight ? '#0EA5E9' : '#D97706',
      fill: isAnswerHighlight ? '#0EA5E9' : 'rgba(217, 119, 6, 0.25)',
      fillStyle: 'solid',
      strokeWidth: 1.8,
      seed: nextSeed(),
    });
    syncDisplayFromSnapshot();
  }

  for (const line of lines) {
    if (isRunCancelled(token)) return cursorY;
    if (!line) {
      cursorY += 12;
      continue;
    }

    onScrollToY?.(cursorY);
    whiteboardAudioSfx.playPenStroke('text');

    const state = { chars: 0 };
    const duration = Math.min(640, Math.max(180, line.length * 14));

    const paintLine = (targetCtx: CanvasRenderingContext2D, partial: string, showCursor: boolean) => {
      targetCtx.save();
      targetCtx.font = font;
      targetCtx.fillStyle = color;
      targetCtx.direction = 'rtl';
      targetCtx.textAlign = 'right';
      targetCtx.textBaseline = 'middle';
      targetCtx.fillText(partial, rightX, cursorY);

      if (showCursor) {
        const w = targetCtx.measureText(partial).width;
        targetCtx.fillStyle = '#0EA5E9';
        targetCtx.beginPath();
        targetCtx.arc(Math.max(45, rightX - w - 6), cursorY, 3.2, 0, Math.PI * 2);
        targetCtx.fill();
      }
      targetCtx.restore();
    };

    await animate(state, {
      chars: line.length,
      duration,
      ease: 'linear',
      onUpdate: () => {
        if (isRunCancelled(token) || !wb.ctx) return;
        syncDisplayFromSnapshot();
        const count = Math.max(1, Math.round(state.chars));
        paintLine(wb.ctx, line.slice(0, count), true);
      },
    });

    if (isRunCancelled(token)) return cursorY;
    applyLogicalTransform(wb.snapshotCtx);
    paintLine(wb.snapshotCtx, line, false);
    syncDisplayFromSnapshot();

    cursorY += lineHeight;
    if (cursorY > wb.logicalHeight - 25) break;
  }

  return cursorY + 14;
}

/**
 * رسم خط فاصل يدوي داخل السبورة بين منطقة الرسم التوضيحي ومنطقة الشرح والحل المكتوب
 */
async function drawSectionDivider(y: number, label: string, token: number): Promise<void> {
  if (!wb.snapshotCtx || !wb.rcSnapshot || isRunCancelled(token)) return;
  applyLogicalTransform(wb.snapshotCtx);
  wb.rcSnapshot.line(55, y, 845, y, {
    stroke: 'rgba(14, 165, 233, 0.45)',
    strokeWidth: 1.8,
    roughness: 1.2,
    seed: nextSeed(),
  });
  wb.snapshotCtx.save();
  wb.snapshotCtx.fillStyle = '#FFFFFF';
  wb.snapshotCtx.fillRect(615, y - 13, 225, 24);
  wb.snapshotCtx.font = '800 13px Cairo, sans-serif';
  wb.snapshotCtx.fillStyle = '#0284C7';
  wb.snapshotCtx.direction = 'rtl';
  wb.snapshotCtx.textAlign = 'right';
  wb.snapshotCtx.textBaseline = 'middle';
  wb.snapshotCtx.fillText(label, 835, y - 1);
  wb.snapshotCtx.restore();
  syncDisplayFromSnapshot();
}

/**
 * تحليل وتنفيذ أمر رسم واحد مع حماية الإحداثيات داخل منطقة الرسم
 */
async function executeDrawCommand(rawCommand: string, token: number, maxDrawY: number = 390): Promise<void> {
  if (isRunCancelled(token)) return;
  const cmd = rawCommand.trim();
  if (!cmd) return;

  const match = cmd.match(/^([A-Z_]+)\s*\(([\s\S]*)\)$/i);
  if (!match) return;

  const fnName = match[1].toUpperCase();
  const rawArgs = match[2];

  const args: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  for (let i = 0; i < rawArgs.length; i++) {
    const ch = rawArgs[i];
    if ((ch === '"' || ch === "'" || ch === '«' || ch === '»') && rawArgs[i - 1] !== '\\') {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = ch === '«' ? '»' : ch;
      } else if (quoteChar === ch) {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === ',' && !inQuotes) {
      args.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim().length > 0) args.push(current.trim());

  const num = (idx: number, fallback: number) => {
    const n = parseFloat(args[idx]);
    return Number.isFinite(n) ? n : fallback;
  };
  const clampY = (y: number) => Math.max(24, Math.min(maxDrawY, y));
  const str = (idx: number, fallback = '') =>
    (args[idx] ?? fallback).replace(/^["'«]|["'»]$/g, '').trim();

  switch (fnName) {
    case 'CLEAR':
      // Reset background without cancelling the active runToken
      if (wb.snapshotCtx) {
        drawWhiteGridBackground(wb.snapshotCtx);
        syncDisplayFromSnapshot();
      }
      break;
    case 'WIRE':
      await drawWire(num(0, 120), clampY(num(1, 120)), num(2, 320), clampY(num(3, 120)), {
        color: str(4) || '#0F172A',
        token,
      });
      break;
    case 'BATTERY':
      await drawBattery(num(0, 180), clampY(num(1, 215)), str(2, 'V = 12V'), { token });
      break;
    case 'RESISTOR':
      await drawResistor(num(0, 450), clampY(num(1, 120)), str(2, 'R = 100Ω'), { token });
      break;
    case 'TEXT':
      await drawText(str(0, ''), num(1, 450), clampY(num(2, 42)), {
        color: str(3) || '#0F172A',
        size: num(4, 18),
        token,
      });
      break;
    case 'BOX':
      await drawBox(num(0, 300), clampY(num(1, 150)), num(2, 180), num(3, 72), str(4, ''), { token });
      break;
    case 'ARROW':
      await drawArrow(num(0, 200), clampY(num(1, 200)), num(2, 360), clampY(num(3, 200)), str(4, ''), { token });
      break;
    default:
      break;
  }
}

/**
 * تحليل رد الذكاء الاصطناعي وفصل [TEXT] عن [DRAW] وكتابة الشرح/الحل والرسم بالتتابع داخل السبورة البيضاء
 */
export async function processAIResponse(
  responseText: string,
  callbacks?: {
    onTextUpdate?: (accumulatedText: string) => void;
    onCommandStep?: (commandLabel: string) => void;
    onScrollToY?: (logicalY: number, totalLogicalHeight: number) => void;
    onComplete?: () => void;
  }
): Promise<void> {
  if (!responseText || !wb.canvas) return;

  const tokenRegex =
    /\[(TEXT|DRAW)\]([\s\S]*?)\[\/\1\]|\[(TEXT|DRAW)\]\s*([^\n\[]+)/gi;

  const sequence: Array<{ type: 'TEXT' | 'DRAW'; payload: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(responseText)) !== null) {
    const tag = (match[1] || match[3] || '').toUpperCase() as 'TEXT' | 'DRAW';
    const content = (match[2] || match[4] || '').trim();
    if (content) {
      sequence.push({ type: tag, payload: content });
    }
  }

  if (sequence.length === 0) {
    sequence.push({ type: 'TEXT', payload: responseText.trim() });
  }

  const hasDrawCommands = sequence.some(
    (s) => s.type === 'DRAW' && /\b(WIRE|BATTERY|RESISTOR|BOX|ARROW)\s*\(/i.test(s.payload)
  );

  // Measure total text lines beforehand so the white canvas fits all explanation/solution lines cleanly
  const textStartY = hasDrawCommands ? 426 : 54;
  let estimatedTextHeight = textStartY + 30;
  if (wb.snapshotCtx) {
    for (const item of sequence) {
      if (item.type === 'TEXT') {
        const lines = wrapCanvasLines(
          wb.snapshotCtx,
          item.payload,
          790,
          '800 17px Cairo, "JetBrains Mono", sans-serif'
        );
        estimatedTextHeight += Math.max(1, lines.length) * 29 + 16;
      }
    }
  }

  // Cancel any previous run, resize canvas cleanly to fit diagram + full explanation/solution
  wb.runToken += 1;
  const token = wb.runToken;
  const neededLogicalH = Math.max(BASE_LOGICAL_HEIGHT, estimatedTextHeight + 30);
  resizeCanvasBuffers(wb.canvas, neededLogicalH);
  if (!wb.snapshotCtx || !wb.ctx) return;
  drawWhiteGridBackground(wb.snapshotCtx);
  syncDisplayFromSnapshot();

  let accumulatedText = '';
  let textCursorY = textStartY;
  let dividerDrawn = false;

  for (const item of sequence) {
    if (isRunCancelled(token)) return;

    if (item.type === 'TEXT') {
      accumulatedText += (accumulatedText ? '\n\n' : '') + item.payload;
      callbacks?.onTextUpdate?.(accumulatedText);
      callbacks?.onCommandStep?.('كتابة الشرح على السبورة...');

      if (hasDrawCommands && !dividerDrawn) {
        dividerDrawn = true;
        await drawSectionDivider(396, 'الشرح والحل المستخرج على السبورة:', token);
      }

      textCursorY = await drawBoardExplanationBlock(
        item.payload,
        textCursorY,
        token,
        (y) => callbacks?.onScrollToY?.(y, wb.logicalHeight)
      );
    } else if (item.type === 'DRAW') {
      callbacks?.onScrollToY?.(180, wb.logicalHeight);
      const commands = item.payload
        .split(/\n|;/)
        .map((c) => c.trim())
        .filter(Boolean);
      for (const cmd of commands) {
        if (isRunCancelled(token)) return;
        callbacks?.onCommandStep?.(cmd);
        await executeDrawCommand(cmd, token, hasDrawCommands ? 372 : 340);
      }
    }
  }

  if (!isRunCancelled(token)) {
    callbacks?.onComplete?.();
  }
}

/**
 * توليد سكربت سبورة متكامل تلقائياً لكتابة الشرح/الحل والرسم داخل السبورة البيضاء
 */
export function buildFallbackWhiteboardScript(params: {
  title: string;
  equation?: string;
  notes?: string[];
  speech?: string;
  diagramType?: string;
  nodes?: { label: string; sub?: string }[];
  steps?: { phase: string; details: string }[];
  questions?: Array<{
    questionNumber: number;
    questionText: string;
    finalAnswerSummary: string;
    reasonAndExplanation: string;
    steps?: string[];
  }>;
}): string {
  const safeTitle = (params.title || 'شرح هندسي تفاعلي').replace(/"/g, "'").slice(0, 54);
  const safeEq = (params.equation || 'V = I × R').replace(/"/g, "'").slice(0, 54);
  const diagram = params.diagramType || 'circuit';

  const lines: string[] = [];

  if (params.speech) {
    lines.push(`[TEXT]${params.speech}[/TEXT]`);
  }

  lines.push(`[DRAW]\nTEXT("${safeTitle}", 450, 36, "#0F172A", 20)`);

  if (params.nodes && params.nodes.length >= 2) {
    const n1 = (params.nodes[0]?.label || 'المدخلات').replace(/"/g, "'").slice(0, 22);
    const n2 = (params.nodes[1]?.label || 'المعالجة').replace(/"/g, "'").slice(0, 22);
    const n3 = (params.nodes[2]?.label || 'المخرج').replace(/"/g, "'").slice(0, 22);
    lines.push(`BOX(90, 125, 190, 78, "${n1}")`);
    lines.push(`ARROW(286, 164, 354, 164, "تحليل", "#0EA5E9")`);
    lines.push(`BOX(360, 125, 190, 78, "${n2}")`);
    if (params.nodes.length >= 3) {
      lines.push(`ARROW(556, 164, 624, 164, "نتيجة", "#0EA5E9")`);
      lines.push(`BOX(630, 125, 190, 78, "${n3}")`);
    }
  } else if (diagram === 'circuit' || diagram === 'arduino') {
    lines.push(`BATTERY(180, 200, "V = 12V")`);
    lines.push(`WIRE(180, 160, 180, 105, "#0F172A")`);
    lines.push(`WIRE(180, 105, 400, 105, "#0F172A")`);
    lines.push(`RESISTOR(450, 105, "R = 220Ω")`);
    lines.push(`WIRE(500, 105, 720, 105, "#0F172A")`);
    lines.push(`WIRE(720, 105, 720, 290, "#0F172A")`);
    lines.push(`ARROW(545, 78, 665, 78, "I (Current)", "#0EA5E9")`);
    lines.push(`WIRE(720, 290, 180, 290, "#0F172A")`);
    lines.push(`WIRE(180, 290, 180, 240, "#0F172A")`);
  } else {
    lines.push(`BOX(110, 130, 180, 78, "المدخلات (Input)")`);
    lines.push(`ARROW(295, 169, 360, 169, "Signal", "#0EA5E9")`);
    lines.push(`BOX(365, 130, 190, 78, "المعالجة والتحكم")`);
    lines.push(`ARROW(560, 169, 625, 169, "Output", "#0EA5E9")`);
    lines.push(`BOX(630, 130, 170, 78, "المخرج (Actuator)")`);
  }

  lines.push(`TEXT("${safeEq}", 450, 342, "#0284C7", 19)\n[/DRAW]`);

  if (params.notes && params.notes.length > 0) {
    lines.push(`[TEXT]${params.notes.map((n, i) => `${i + 1}. ${n}`).join('\n')}[/TEXT]`);
  }

  if (params.steps && params.steps.length > 0) {
    for (const st of params.steps) {
      lines.push(`[TEXT]${st.phase}: ${st.details}[/TEXT]`);
    }
  }

  if (params.questions && params.questions.length > 0) {
    for (const q of params.questions.slice(0, 12)) {
      lines.push(
        `[TEXT]سؤال #${q.questionNumber}: ${q.questionText}\n✅ الحل: ${q.finalAnswerSummary}\n💡 السبب: ${q.reasonAndExplanation}${
          q.steps && q.steps.length ? `\nالخطوات: ${q.steps.join(' ← ')}` : ''
        }[/TEXT]`
      );
    }
  }

  return lines.join('\n');
}

// إتاحة دوال السبورة عالمياً على window لسهولة الدمج المباشر
if (typeof window !== 'undefined') {
  (window as any).initWhiteboard = initWhiteboard;
  (window as any).clearBoard = clearBoard;
  (window as any).drawWire = drawWire;
  (window as any).drawBattery = drawBattery;
  (window as any).drawResistor = drawResistor;
  (window as any).drawText = drawText;
  (window as any).drawBox = drawBox;
  (window as any).drawArrow = drawArrow;
  (window as any).processAIResponse = processAIResponse;
}
