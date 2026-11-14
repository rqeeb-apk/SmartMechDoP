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
  strokeSize: number;
  seed: number;
}

interface WhiteboardState {
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  snapshot: HTMLCanvasElement | null;
  snapshotCtx: CanvasRenderingContext2D | null;
  baseLayer: HTMLCanvasElement | null;
  baseLayerCtx: CanvasRenderingContext2D | null;
  rcSnapshot: ReturnType<typeof rough.canvas> | null;
  rcLive: ReturnType<typeof rough.canvas> | null;
  logicalHeight: number;
  boardFontSize: number;
  runToken: number;
  seedCounter: number;
  interactive: InteractiveStrokeState;
}

const wb: WhiteboardState = {
  canvas: null,
  ctx: null,
  snapshot: null,
  snapshotCtx: null,
  baseLayer: null,
  baseLayerCtx: null,
  rcSnapshot: null,
  rcLive: null,
  logicalHeight: BASE_LOGICAL_HEIGHT,
  boardFontSize: 16,
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
    strokeSize: 3,
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

  const baseLayer = document.createElement('canvas');
  baseLayer.width = pixelWidth;
  baseLayer.height = pixelHeight;
  const baseLayerCtx = baseLayer.getContext('2d');

  wb.canvas = canvasElement;
  wb.ctx = ctx;
  wb.snapshot = snapshot;
  wb.snapshotCtx = snapshotCtx;
  wb.baseLayer = baseLayer;
  wb.baseLayerCtx = baseLayerCtx;
  wb.rcLive = rough.canvas(canvasElement);
  wb.rcSnapshot = rough.canvas(snapshot);
}

export function captureWhiteboardBaseLayer(): void {
  if (!wb.baseLayerCtx || !wb.baseLayer || !wb.snapshot) return;
  wb.baseLayerCtx.save();
  wb.baseLayerCtx.setTransform(1, 0, 0, 1, 0, 0);
  wb.baseLayerCtx.clearRect(0, 0, wb.baseLayer.width, wb.baseLayer.height);
  wb.baseLayerCtx.drawImage(wb.snapshot, 0, 0);
  wb.baseLayerCtx.restore();
}

export function restoreWhiteboardBaseLayer(): void {
  if (!wb.snapshotCtx || !wb.snapshot || !wb.baseLayer) return;
  wb.snapshotCtx.save();
  wb.snapshotCtx.setTransform(1, 0, 0, 1, 0, 0);
  wb.snapshotCtx.clearRect(0, 0, wb.snapshot.width, wb.snapshot.height);
  wb.snapshotCtx.drawImage(wb.baseLayer, 0, 0);
  wb.snapshotCtx.restore();
  applyLogicalTransform(wb.snapshotCtx);
  syncDisplayFromSnapshot();
}

export function getLogicalHeight(): number {
  return wb.logicalHeight;
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
  captureWhiteboardBaseLayer();
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
 * ضبط حجم خط الشرح المكتوب داخل السبورة البيضاء
 */
export function setBoardFontSize(sizePx: number): void {
  wb.boardFontSize = Math.max(13, Math.min(24, Math.round(sizePx)));
}

export function getBoardFontSize(): number {
  return wb.boardFontSize;
}

/**
 * بدء رسم يدوي على السبورة حسب الوضع المختار (Pencil / Line / Shape / Erase)
 */
export function startInteractiveStroke(
  mode: WhiteboardDrawMode,
  x: number,
  y: number,
  color: string = '#0F172A',
  strokeSize: number = 3
): void {
  if (!wb.ctx || !wb.snapshotCtx) return;
  const seed = nextSeed();
  const safeSize = Math.max(1.5, Math.min(18, strokeSize));
  wb.interactive = {
    active: true,
    mode,
    startX: x,
    startY: y,
    lastX: x,
    lastY: y,
    points: [[x, y]],
    color,
    strokeSize: safeSize,
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
  const { mode, startX, startY, lastX, lastY, color, strokeSize, seed } = wb.interactive;

  if (mode === 'pencil') {
    wb.interactive.points.push([x, y]);
    wb.interactive.lastX = x;
    wb.interactive.lastY = y;

    applyLogicalTransform(wb.ctx);
    wb.ctx.save();
    wb.ctx.strokeStyle = color;
    wb.ctx.lineWidth = strokeSize;
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
    wb.snapshotCtx.lineWidth = strokeSize;
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
    const eraserWidth = Math.max(18, strokeSize * 4.5);

    applyLogicalTransform(wb.snapshotCtx);
    wb.snapshotCtx.save();
    wb.snapshotCtx.strokeStyle = '#FFFFFF';
    wb.snapshotCtx.lineWidth = eraserWidth;
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
      strokeWidth: strokeSize,
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
      strokeWidth: Math.max(1.5, strokeSize * 0.9),
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
  const { mode, startX, startY, lastX, lastY, color, strokeSize, seed, points } = wb.interactive;
  wb.interactive.active = false;

  if (mode === 'pencil' && points.length === 1) {
    applyLogicalTransform(wb.snapshotCtx);
    wb.snapshotCtx.save();
    wb.snapshotCtx.fillStyle = color;
    wb.snapshotCtx.beginPath();
    wb.snapshotCtx.arc(startX, startY, Math.max(1.6, strokeSize * 0.55), 0, Math.PI * 2);
    wb.snapshotCtx.fill();
    wb.snapshotCtx.restore();
    syncDisplayFromSnapshot();
    captureWhiteboardBaseLayer();
    return;
  }

  if (mode === 'line') {
    applyLogicalTransform(wb.snapshotCtx);
    wb.rcSnapshot.line(startX, startY, lastX, lastY, {
      stroke: color,
      strokeWidth: strokeSize,
      roughness: 1.0,
      seed,
    });
    syncDisplayFromSnapshot();
    captureWhiteboardBaseLayer();
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
      strokeWidth: Math.max(1.5, strokeSize * 0.9),
      fill: 'rgba(14, 165, 233, 0.14)',
      fillStyle: 'hachure',
      hachureGap: 8,
      roughness: 1.1,
      seed,
    });
    syncDisplayFromSnapshot();
    captureWhiteboardBaseLayer();
    return;
  }

  captureWhiteboardBaseLayer();
}

/**
 * رسم سلك كهربائي متحرك من (x1, y1) إلى (x2, y2) باستخدام Rough.js و Anime.js
 */
export async function drawWire(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options?: { color?: string; duration?: number; token?: number; instant?: boolean; seed?: number }
): Promise<void> {
  if (!wb.ctx || !wb.rcLive || !wb.snapshotCtx || !wb.rcSnapshot) return;
  const token = options?.token ?? wb.runToken;
  const color = options?.color || '#0F172A';
  const duration = options?.duration ?? 360;
  const seed = options?.seed ?? nextSeed();

  const commitWire = () => {
    if (!wb.snapshotCtx || !wb.rcSnapshot) return;
    applyLogicalTransform(wb.snapshotCtx);
    wb.rcSnapshot.line(x1, y1, x2, y2, {
      stroke: color,
      strokeWidth: 2.6,
      roughness: 1.05,
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
  };

  if (options?.instant) {
    commitWire();
    return;
  }

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
        roughness: 1.05,
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
  commitWire();
}

/**
 * رسم بطارية كهربائية DC عند الإحداثي (x, y) — مرتبطة مباشرة مع الأيقونة القابلة للسحب والإفلات
 */
export async function drawBattery(
  x: number,
  y: number,
  label: string = 'V = 12V',
  options?: { token?: number; duration?: number; instant?: boolean; seed?: number; highlight?: boolean }
): Promise<void> {
  if (!wb.ctx || !wb.rcLive || !wb.snapshotCtx || !wb.rcSnapshot) return;
  const token = options?.token ?? wb.runToken;
  const duration = options?.duration ?? 480;
  const seed = options?.seed ?? nextSeed();

  const renderBattery = (rc: ReturnType<typeof rough.canvas>, ctx: CanvasRenderingContext2D, progress: number) => {
    if (options?.highlight && progress > 0.3) {
      rc.rectangle(x - 42, y - 46, 84, 92, {
        stroke: 'rgba(14, 165, 233, 0.55)',
        strokeWidth: 1.5,
        fill: 'rgba(224, 242, 254, 0.25)',
        fillStyle: 'solid',
        roughness: 0.7,
        seed: seed + 10,
      });
    }

    const topProg = Math.min(1, progress * 3);
    if (topProg > 0) {
      rc.line(x, y - 40, x, y - 40 + 30 * topProg, {
        stroke: '#0F172A',
        strokeWidth: 2.6,
        roughness: 0.95,
        seed: seed + 1,
      });
    }

    if (progress > 0.2) {
      const plateP = Math.min(1, (progress - 0.2) / 0.35);
      rc.line(x - 26 * plateP, y - 10, x + 26 * plateP, y - 10, {
        stroke: '#DC2626',
        strokeWidth: 3.6,
        roughness: 0.95,
        seed: seed + 2,
      });
    }

    if (progress > 0.45) {
      const plateP = Math.min(1, (progress - 0.45) / 0.35);
      rc.line(x - 14 * plateP, y + 10, x + 14 * plateP, y + 10, {
        stroke: '#0F172A',
        strokeWidth: 4.8,
        roughness: 0.95,
        seed: seed + 3,
      });
    }

    if (progress > 0.65) {
      const botP = Math.min(1, (progress - 0.65) / 0.35);
      rc.line(x, y + 10, x, y + 10 + 30 * botP, {
        stroke: '#0F172A',
        strokeWidth: 2.6,
        roughness: 0.95,
        seed: seed + 4,
      });
    }

    if (progress > 0.72) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (progress - 0.72) / 0.28);
      // Terminal connection dots
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.arc(x, y - 40, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(x, y + 40, 3.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 16px Cairo, sans-serif';
      ctx.fillStyle = '#DC2626';
      ctx.textAlign = 'center';
      ctx.fillText('+', x + 20, y - 22);
      ctx.fillStyle = '#0F172A';
      ctx.fillText('−', x + 20, y + 26);

      if (label) {
        ctx.font = 'bold 13px "JetBrains Mono", Cairo, sans-serif';
        ctx.fillStyle = '#0284C7';
        ctx.textAlign = 'right';
        ctx.fillText(label, x - 34, y + 4);
      }
      ctx.restore();
    }
  };

  if (options?.instant) {
    applyLogicalTransform(wb.snapshotCtx);
    renderBattery(wb.rcSnapshot, wb.snapshotCtx, 1);
    syncDisplayFromSnapshot();
    return;
  }

  const state = { p: 0 };
  whiteboardAudioSfx.playPenStroke('component');

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
 * رسم مقاومة كهربائية متعرجة عند الإحداثي (x, y) — مرتبطة مباشرة مع الأيقونة القابلة للسحب والإفلات
 */
export async function drawResistor(
  x: number,
  y: number,
  label: string = 'R = 100Ω',
  options?: { token?: number; duration?: number; instant?: boolean; seed?: number; highlight?: boolean }
): Promise<void> {
  if (!wb.ctx || !wb.rcLive || !wb.snapshotCtx || !wb.rcSnapshot) return;
  const token = options?.token ?? wb.runToken;
  const duration = options?.duration ?? 500;
  const seed = options?.seed ?? nextSeed();

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
    if (options?.highlight && progress > 0.3) {
      rc.rectangle(x - 54, y - 24, 108, 48, {
        stroke: 'rgba(217, 119, 6, 0.55)',
        strokeWidth: 1.5,
        fill: 'rgba(254, 243, 199, 0.35)',
        fillStyle: 'solid',
        roughness: 0.7,
        seed: seed + 12,
      });
    }

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
        strokeWidth: 2.9,
        roughness: 0.95,
        seed,
      });
    }

    if (progress > 0.7) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (progress - 0.7) / 0.3);
      // Terminal pins
      ctx.fillStyle = '#0EA5E9';
      ctx.beginPath();
      ctx.arc(x - 50, y, 3.3, 0, Math.PI * 2);
      ctx.arc(x + 50, y, 3.3, 0, Math.PI * 2);
      ctx.fill();

      if (label) {
        ctx.font = 'bold 13px "JetBrains Mono", Cairo, sans-serif';
        ctx.fillStyle = '#0F172A';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, y - 24);
      }
      ctx.restore();
    }
  };

  if (options?.instant) {
    applyLogicalTransform(wb.snapshotCtx);
    renderResistor(wb.rcSnapshot, wb.snapshotCtx, 1);
    syncDisplayFromSnapshot();
    return;
  }

  const state = { p: 0 };
  whiteboardAudioSfx.playPenStroke('component');

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
 * رسم مكثف كهربائي (Capacitor) بلوحين متوازيين
 */
export async function drawCapacitor(
  x: number,
  y: number,
  label: string = 'C = 100µF',
  options?: { token?: number; duration?: number; instant?: boolean; seed?: number }
): Promise<void> {
  if (!wb.ctx || !wb.rcLive || !wb.snapshotCtx || !wb.rcSnapshot) return;
  const token = options?.token ?? wb.runToken;
  const seed = options?.seed ?? nextSeed();

  const renderCap = (rc: ReturnType<typeof rough.canvas>, ctx: CanvasRenderingContext2D, progress: number) => {
    const leadP = Math.min(1, progress * 2.2);
    rc.line(x - 45, y, x - 45 + 37 * leadP, y, { stroke: '#0F172A', strokeWidth: 2.5, seed: seed + 1 });
    rc.line(x + 45, y, x + 45 - 37 * leadP, y, { stroke: '#0F172A', strokeWidth: 2.5, seed: seed + 2 });

    if (progress > 0.35) {
      const plateH = 22 * Math.min(1, (progress - 0.35) / 0.45);
      rc.line(x - 8, y - plateH, x - 8, y + plateH, { stroke: '#0284C7', strokeWidth: 3.6, seed: seed + 3 });
      rc.line(x + 8, y - plateH, x + 8, y + plateH, { stroke: '#0284C7', strokeWidth: 3.6, seed: seed + 4 });
    }

    if (progress > 0.72) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (progress - 0.72) / 0.28);
      ctx.fillStyle = '#0EA5E9';
      ctx.beginPath();
      ctx.arc(x - 45, y, 3.2, 0, Math.PI * 2);
      ctx.arc(x + 45, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = 'bold 12px "JetBrains Mono", Cairo, sans-serif';
      ctx.fillStyle = '#0284C7';
      ctx.textAlign = 'center';
      ctx.fillText('+', x - 18, y - 16);
      ctx.fillStyle = '#0F172A';
      ctx.fillText('−', x + 18, y - 16);
      if (label) {
        ctx.font = 'bold 13px "JetBrains Mono", Cairo, sans-serif';
        ctx.fillText(label, x, y - 28);
      }
      ctx.restore();
    }
  };

  if (options?.instant) {
    applyLogicalTransform(wb.snapshotCtx);
    renderCap(wb.rcSnapshot, wb.snapshotCtx, 1);
    syncDisplayFromSnapshot();
    return;
  }

  const state = { p: 0 };
  whiteboardAudioSfx.playPenStroke('component');
  await animate(state, {
    p: 1,
    duration: options?.duration ?? 450,
    ease: 'outCubic',
    onUpdate: () => {
      if (isRunCancelled(token) || !wb.rcLive || !wb.ctx) return;
      syncDisplayFromSnapshot();
      renderCap(wb.rcLive, wb.ctx, state.p);
    },
  });
  if (isRunCancelled(token)) return;
  applyLogicalTransform(wb.snapshotCtx);
  renderCap(wb.rcSnapshot, wb.snapshotCtx, 1);
  syncDisplayFromSnapshot();
}

/**
 * رسم مصباح دايود باعث للضوء (LED) مع أشعة إضاءة تفاعلية
 */
export async function drawLED(
  x: number,
  y: number,
  label: string = 'LED (2.2V)',
  options?: { token?: number; duration?: number; instant?: boolean; seed?: number; lit?: boolean }
): Promise<void> {
  if (!wb.ctx || !wb.rcLive || !wb.snapshotCtx || !wb.rcSnapshot) return;
  const token = options?.token ?? wb.runToken;
  const seed = options?.seed ?? nextSeed();
  const isLit = options?.lit ?? true;

  const renderLED = (rc: ReturnType<typeof rough.canvas>, ctx: CanvasRenderingContext2D, progress: number) => {
    rc.line(x - 45, y, x - 14, y, { stroke: '#0F172A', strokeWidth: 2.5, seed: seed + 1 });
    rc.line(x + 14, y, x + 45, y, { stroke: '#0F172A', strokeWidth: 2.5, seed: seed + 2 });

    if (progress > 0.25) {
      rc.circle(x, y, 44 * Math.min(1, (progress - 0.25) / 0.4), {
        stroke: isLit ? '#F59E0B' : '#64748B',
        fill: isLit ? 'rgba(253, 224, 71, 0.35)' : 'rgba(226, 232, 240, 0.25)',
        fillStyle: 'solid',
        strokeWidth: 2.2,
        seed: seed + 3,
      });
      rc.polygon(
        [
          [x - 12, y - 12],
          [x - 12, y + 12],
          [x + 10, y],
        ],
        {
          stroke: '#0F172A',
          fill: isLit ? '#FBBF24' : '#94A3B8',
          fillStyle: 'solid',
          strokeWidth: 2,
          seed: seed + 4,
        }
      );
      rc.line(x + 11, y - 13, x + 11, y + 13, { stroke: '#0F172A', strokeWidth: 3, seed: seed + 5 });
    }

    if (progress > 0.65) {
      if (isLit) {
        rc.line(x + 8, y - 24, x + 19, y - 35, { stroke: '#F59E0B', strokeWidth: 2.2, seed: seed + 6 });
        rc.line(x + 18, y - 19, x + 31, y - 28, { stroke: '#F59E0B', strokeWidth: 2.2, seed: seed + 7 });
      }
      ctx.save();
      ctx.globalAlpha = Math.min(1, (progress - 0.65) / 0.35);
      ctx.fillStyle = '#0EA5E9';
      ctx.beginPath();
      ctx.arc(x - 45, y, 3.2, 0, Math.PI * 2);
      ctx.arc(x + 45, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      if (label) {
        ctx.font = 'bold 13px "JetBrains Mono", Cairo, sans-serif';
        ctx.fillStyle = '#B45309';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, y + 36);
      }
      ctx.restore();
    }
  };

  if (options?.instant) {
    applyLogicalTransform(wb.snapshotCtx);
    renderLED(wb.rcSnapshot, wb.snapshotCtx, 1);
    syncDisplayFromSnapshot();
    return;
  }

  const state = { p: 0 };
  whiteboardAudioSfx.playPenStroke('component');
  await animate(state, {
    p: 1,
    duration: options?.duration ?? 480,
    ease: 'outCubic',
    onUpdate: () => {
      if (isRunCancelled(token) || !wb.rcLive || !wb.ctx) return;
      syncDisplayFromSnapshot();
      renderLED(wb.rcLive, wb.ctx, state.p);
    },
  });
  if (isRunCancelled(token)) return;
  applyLogicalTransform(wb.snapshotCtx);
  renderLED(wb.rcSnapshot, wb.snapshotCtx, 1);
  syncDisplayFromSnapshot();
}

/**
 * رسم محرك كهربائي DC / Servo Motor مع محور دوران وسهم حركة
 */
export async function drawMotor(
  x: number,
  y: number,
  label: string = 'DC Motor',
  options?: { token?: number; duration?: number; instant?: boolean; seed?: number }
): Promise<void> {
  if (!wb.ctx || !wb.rcLive || !wb.snapshotCtx || !wb.rcSnapshot) return;
  const token = options?.token ?? wb.runToken;
  const seed = options?.seed ?? nextSeed();

  const renderMotor = (rc: ReturnType<typeof rough.canvas>, ctx: CanvasRenderingContext2D, progress: number) => {
    rc.line(x - 52, y, x - 26, y, { stroke: '#0F172A', strokeWidth: 2.5, seed: seed + 1 });
    rc.line(x + 26, y, x + 52, y, { stroke: '#0F172A', strokeWidth: 2.5, seed: seed + 2 });

    rc.circle(x, y, 52 * Math.max(0.2, progress), {
      stroke: '#0284C7',
      fill: 'rgba(224, 242, 254, 0.6)',
      fillStyle: 'hachure',
      hachureGap: 7,
      strokeWidth: 2.6,
      seed: seed + 3,
    });

    if (progress > 0.6) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (progress - 0.6) / 0.4);
      ctx.font = '900 20px "JetBrains Mono", sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('M', x, y);

      // Rotation arc above motor
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y - 34, 14, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();

      ctx.fillStyle = '#0EA5E9';
      ctx.beginPath();
      ctx.arc(x - 52, y, 3.2, 0, Math.PI * 2);
      ctx.arc(x + 52, y, 3.2, 0, Math.PI * 2);
      ctx.fill();

      if (label) {
        ctx.font = 'bold 13px "JetBrains Mono", Cairo, sans-serif';
        ctx.fillStyle = '#0F172A';
        ctx.fillText(label, x, y + 40);
      }
      ctx.restore();
    }
  };

  if (options?.instant) {
    applyLogicalTransform(wb.snapshotCtx);
    renderMotor(wb.rcSnapshot, wb.snapshotCtx, 1);
    syncDisplayFromSnapshot();
    return;
  }

  const state = { p: 0 };
  whiteboardAudioSfx.playPenStroke('box');
  await animate(state, {
    p: 1,
    duration: options?.duration ?? 500,
    ease: 'outBack',
    onUpdate: () => {
      if (isRunCancelled(token) || !wb.rcLive || !wb.ctx) return;
      syncDisplayFromSnapshot();
      renderMotor(wb.rcLive, wb.ctx, state.p);
    },
  });
  if (isRunCancelled(token)) return;
  applyLogicalTransform(wb.snapshotCtx);
  renderMotor(wb.rcSnapshot, wb.snapshotCtx, 1);
  syncDisplayFromSnapshot();
}

/**
 * رسم راسم إشارات / موجات (Sine / PWM / PID Step Response) لتبسيط التحكم والإلكترونيات
 */
export async function drawWave(
  x: number,
  y: number,
  w: number = 240,
  h: number = 110,
  waveType: string = 'sine',
  label: string = 'Signal Wave',
  options?: { token?: number; duration?: number; instant?: boolean; seed?: number }
): Promise<void> {
  if (!wb.ctx || !wb.rcLive || !wb.snapshotCtx || !wb.rcSnapshot) return;
  const token = options?.token ?? wb.runToken;
  const seed = options?.seed ?? nextSeed();
  const kind = (waveType || 'sine').toLowerCase();

  const buildWavePoints = (progress: number): [number, number][] => {
    const pts: [number, number][] = [];
    const steps = 64;
    const activeSteps = Math.max(2, Math.floor(steps * progress));
    const padX = 16;
    const drawW = Math.max(40, w - padX * 2);
    const midY = y + h * 0.52;
    const amp = h * 0.28;

    for (let i = 0; i <= activeSteps; i++) {
      const t = i / steps;
      const px = x + padX + t * drawW;
      let py = midY;
      if (kind.includes('pwm') || kind.includes('square')) {
        const cycle = (t * 3) % 1;
        py = cycle < 0.45 ? midY - amp : midY + amp;
      } else if (kind.includes('step') || kind.includes('pid')) {
        const target = midY - amp * 0.65;
        const base = midY + amp * 0.65;
        const damped = Math.exp(-4.5 * t) * Math.cos(14 * t);
        py = target + (base - target) * damped;
      } else {
        py = midY - Math.sin(t * Math.PI * 4) * amp;
      }
      pts.push([px, py]);
    }
    return pts;
  };

  const renderWave = (rc: ReturnType<typeof rough.canvas>, ctx: CanvasRenderingContext2D, progress: number) => {
    rc.rectangle(x, y, w, h, {
      stroke: '#0EA5E9',
      strokeWidth: 2,
      fill: 'rgba(240, 249, 255, 0.72)',
      fillStyle: 'solid',
      roughness: 0.8,
      seed,
    });
    // Axis crosshair
    ctx.save();
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x + 12, y + h * 0.52);
    ctx.lineTo(x + w - 12, y + h * 0.52);
    ctx.stroke();
    ctx.restore();

    const pts = buildWavePoints(progress);
    if (pts.length >= 2) {
      rc.linearPath(pts, {
        stroke: kind.includes('step') ? '#059669' : '#0284C7',
        strokeWidth: 2.6,
        roughness: 0.6,
        seed: seed + 5,
      });
    }

    if (label && progress > 0.5) {
      ctx.save();
      ctx.font = 'bold 12px "JetBrains Mono", Cairo, sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + w / 2, y + h + 16);
      ctx.restore();
    }
  };

  if (options?.instant) {
    applyLogicalTransform(wb.snapshotCtx);
    renderWave(wb.rcSnapshot, wb.snapshotCtx, 1);
    syncDisplayFromSnapshot();
    return;
  }

  const state = { p: 0 };
  whiteboardAudioSfx.playPenStroke('wire');
  await animate(state, {
    p: 1,
    duration: options?.duration ?? 580,
    ease: 'outCubic',
    onUpdate: () => {
      if (isRunCancelled(token) || !wb.rcLive || !wb.ctx) return;
      syncDisplayFromSnapshot();
      renderWave(wb.rcLive, wb.ctx, state.p);
    },
  });
  if (isRunCancelled(token)) return;
  applyLogicalTransform(wb.snapshotCtx);
  renderWave(wb.rcSnapshot, wb.snapshotCtx, 1);
  syncDisplayFromSnapshot();
}

/**
 * رسم حساس (Ultrasonic / IR / Temperature Sensor) مع موجات استشعار
 */
export async function drawSensor(
  x: number,
  y: number,
  label: string = 'Ultrasonic Sensor',
  options?: { token?: number; duration?: number; instant?: boolean; seed?: number }
): Promise<void> {
  if (!wb.ctx || !wb.rcLive || !wb.snapshotCtx || !wb.rcSnapshot) return;
  const token = options?.token ?? wb.runToken;
  const seed = options?.seed ?? nextSeed();

  const renderSensor = (rc: ReturnType<typeof rough.canvas>, ctx: CanvasRenderingContext2D, progress: number) => {
    rc.rectangle(x - 42, y - 24, 84, 48, {
      stroke: '#059669',
      fill: 'rgba(209, 250, 229, 0.55)',
      fillStyle: 'hachure',
      strokeWidth: 2.2,
      seed,
    });
    if (progress > 0.35) {
      rc.circle(x - 18, y, 22, { stroke: '#0F172A', strokeWidth: 2, seed: seed + 1 });
      rc.circle(x + 18, y, 22, { stroke: '#0F172A', strokeWidth: 2, seed: seed + 2 });
    }
    if (progress > 0.65) {
      ctx.save();
      ctx.strokeStyle = '#0EA5E9';
      ctx.lineWidth = 2;
      [10, 18, 26].forEach((r) => {
        ctx.beginPath();
        ctx.arc(x, y - 26, r, Math.PI * 1.2, Math.PI * 1.8);
        ctx.stroke();
      });
      if (label) {
        ctx.font = 'bold 12px Cairo, sans-serif';
        ctx.fillStyle = '#0F172A';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, y + 38);
      }
      ctx.restore();
    }
  };

  if (options?.instant) {
    applyLogicalTransform(wb.snapshotCtx);
    renderSensor(wb.rcSnapshot, wb.snapshotCtx, 1);
    syncDisplayFromSnapshot();
    return;
  }

  const state = { p: 0 };
  whiteboardAudioSfx.playPenStroke('box');
  await animate(state, {
    p: 1,
    duration: options?.duration ?? 460,
    ease: 'outBack',
    onUpdate: () => {
      if (isRunCancelled(token) || !wb.rcLive || !wb.ctx) return;
      syncDisplayFromSnapshot();
      renderSensor(wb.rcLive, wb.ctx, state.p);
    },
  });
  if (isRunCancelled(token)) return;
  applyLogicalTransform(wb.snapshotCtx);
  renderSensor(wb.rcSnapshot, wb.snapshotCtx, 1);
  syncDisplayFromSnapshot();
}

/**
 * رسم ترس ميكانيكي (Gear) لشرح أنظمة النقل والعزم الميكانيكي
 */
export async function drawGear(
  x: number,
  y: number,
  radius: number = 32,
  label: string = 'Gear',
  options?: { token?: number; duration?: number; instant?: boolean; seed?: number }
): Promise<void> {
  if (!wb.ctx || !wb.rcLive || !wb.snapshotCtx || !wb.rcSnapshot) return;
  const token = options?.token ?? wb.runToken;
  const seed = options?.seed ?? nextSeed();

  const renderGear = (rc: ReturnType<typeof rough.canvas>, ctx: CanvasRenderingContext2D, progress: number) => {
    const teeth = 10;
    const pts: [number, number][] = [];
    const rInner = radius * 0.78;
    const rOuter = radius;
    const angleLimit = Math.PI * 2 * Math.max(0.2, progress);
    for (let i = 0; i <= teeth * 4; i++) {
      const a = (i / (teeth * 4)) * Math.PI * 2;
      if (a > angleLimit) break;
      const r = i % 4 < 2 ? rOuter : rInner;
      pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    if (pts.length >= 3) {
      rc.linearPath(pts, { stroke: '#475569', strokeWidth: 2.4, roughness: 0.9, seed });
    }
    rc.circle(x, y, radius * 0.55, { stroke: '#0EA5E9', strokeWidth: 2.2, seed: seed + 2 });
    if (label && progress > 0.7) {
      ctx.save();
      ctx.font = 'bold 12px Cairo, sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y + radius + 18);
      ctx.restore();
    }
  };

  if (options?.instant) {
    applyLogicalTransform(wb.snapshotCtx);
    renderGear(wb.rcSnapshot, wb.snapshotCtx, 1);
    syncDisplayFromSnapshot();
    return;
  }

  const state = { p: 0 };
  whiteboardAudioSfx.playPenStroke('component');
  await animate(state, {
    p: 1,
    duration: options?.duration ?? 520,
    ease: 'outCubic',
    onUpdate: () => {
      if (isRunCancelled(token) || !wb.rcLive || !wb.ctx) return;
      syncDisplayFromSnapshot();
      renderGear(wb.rcLive, wb.ctx, state.p);
    },
  });
  if (isRunCancelled(token)) return;
  applyLogicalTransform(wb.snapshotCtx);
  renderGear(wb.rcSnapshot, wb.snapshotCtx, 1);
  syncDisplayFromSnapshot();
}

/**
 * رسم بطاقة ملاحظة ذهبية مميزة داخل الرسم الهندسي لتثبيت المعلومة
 */
export async function drawCallout(
  x: number,
  y: number,
  text: string = 'ملاحظة هندسية',
  options?: { token?: number; instant?: boolean; seed?: number }
): Promise<void> {
  if (!wb.ctx || !wb.rcSnapshot || !wb.snapshotCtx) return;
  const seed = options?.seed ?? nextSeed();
  const clean = String(text || '').trim().slice(0, 56);
  if (!clean) return;
  const w = Math.max(170, Math.min(340, clean.length * 9.5 + 32));
  const h = 38;

  applyLogicalTransform(wb.snapshotCtx);
  wb.rcSnapshot.rectangle(x - w / 2, y - h / 2, w, h, {
    stroke: '#D97706',
    fill: 'rgba(254, 243, 199, 0.72)',
    fillStyle: 'solid',
    strokeWidth: 2,
    roughness: 1.0,
    seed,
  });
  wb.snapshotCtx.save();
  wb.snapshotCtx.font = 'bold 13px Cairo, sans-serif';
  wb.snapshotCtx.fillStyle = '#92400E';
  wb.snapshotCtx.direction = 'rtl';
  wb.snapshotCtx.textAlign = 'center';
  wb.snapshotCtx.textBaseline = 'middle';
  wb.snapshotCtx.fillText(`💡 ${clean}`, x, y);
  wb.snapshotCtx.restore();
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
  options?: { color?: string; token?: number; instant?: boolean; seed?: number }
): Promise<void> {
  if (!wb.ctx || !wb.rcLive || !wb.snapshotCtx || !wb.rcSnapshot) return;
  const token = options?.token ?? wb.runToken;
  const color = options?.color || '#0EA5E9';
  const seed = options?.seed ?? nextSeed();
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 12;

  await drawWire(x1, y1, x2, y2, { color, duration: 320, token, instant: options?.instant, seed });
  if (!options?.instant && isRunCancelled(token)) return;

  applyLogicalTransform(wb.snapshotCtx);
  wb.rcSnapshot.line(
    x2,
    y2,
    x2 - headLen * Math.cos(angle - Math.PI / 6),
    y2 - headLen * Math.sin(angle - Math.PI / 6),
    { stroke: color, strokeWidth: 2.5, seed: seed + 1 }
  );
  wb.rcSnapshot.line(
    x2,
    y2,
    x2 - headLen * Math.cos(angle + Math.PI / 6),
    y2 - headLen * Math.sin(angle + Math.PI / 6),
    { stroke: color, strokeWidth: 2.5, seed: seed + 2 }
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
  options?: { color?: string; size?: number; token?: number; align?: CanvasTextAlign; instant?: boolean }
): Promise<void> {
  if (!wb.ctx || !wb.snapshotCtx) return;
  const token = options?.token ?? wb.runToken;
  const color = options?.color || '#0F172A';
  const size = options?.size || 18;
  const align = options?.align || 'center';
  const cleanText = String(text || '').trim();
  if (!cleanText) return;

  const renderLabel = (ctx: CanvasRenderingContext2D, partial: string) => {
    ctx.save();
    ctx.font = `800 ${size}px Cairo, "JetBrains Mono", sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(partial, x, y);
    ctx.restore();
  };

  if (options?.instant) {
    applyLogicalTransform(wb.snapshotCtx);
    renderLabel(wb.snapshotCtx, cleanText);
    syncDisplayFromSnapshot();
    return;
  }

  const state = { chars: 0 };
  const duration = Math.min(720, Math.max(240, cleanText.length * 20));
  whiteboardAudioSfx.playPenStroke('text');

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
  const baseFont = wb.boardFontSize || 16;
  const font = isAnswerHighlight
    ? `800 ${baseFont + 1}px Cairo, "JetBrains Mono", sans-serif`
    : `600 ${baseFont}px Cairo, "JetBrains Mono", sans-serif`;
  const color = trimmed.startsWith('✅')
    ? '#0284C7'
    : trimmed.startsWith('💡')
    ? '#B45309'
    : '#0F172A';

  const maxLineWidth = 790; // Right margin 848 down to left margin 58
  const lineHeight = Math.round(baseFont * 1.82);
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
    case 'CAPACITOR':
      await drawCapacitor(num(0, 520), clampY(num(1, 160)), str(2, 'C = 100µF'), { token });
      break;
    case 'LED':
      await drawLED(num(0, 580), clampY(num(1, 180)), str(2, 'LED'), { token });
      break;
    case 'MOTOR':
      await drawMotor(num(0, 620), clampY(num(1, 200)), str(2, 'DC Motor'), { token });
      break;
    case 'WAVE':
      await drawWave(
        num(0, 560),
        clampY(num(1, 110)),
        num(2, 230),
        num(3, 110),
        str(4, 'sine'),
        str(5, 'Wave'),
        { token }
      );
      break;
    case 'SENSOR':
      await drawSensor(num(0, 200), clampY(num(1, 170)), str(2, 'Sensor'), { token });
      break;
    case 'GEAR':
      await drawGear(num(0, 450), clampY(num(1, 190)), num(2, 34), str(3, 'Gear'), { token });
      break;
    case 'CALLOUT':
      await drawCallout(num(0, 450), clampY(num(1, 325)), str(2, 'فكرة هندسية'), { token });
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
    (s) =>
      s.type === 'DRAW' &&
      /\b(WIRE|BATTERY|RESISTOR|CAPACITOR|LED|MOTOR|WAVE|SENSOR|GEAR|CALLOUT|BOX|ARROW)\s*\(/i.test(s.payload)
  );

  // Measure total text lines beforehand so the white canvas fits all explanation/solution lines cleanly
  const textStartY = hasDrawCommands ? 426 : 54;
  let estimatedTextHeight = textStartY + 30;
  const baseFont = wb.boardFontSize || 16;
  const measuredLineHeight = Math.round(baseFont * 1.82);
  if (wb.snapshotCtx) {
    for (const item of sequence) {
      if (item.type === 'TEXT') {
        const lines = wrapCanvasLines(
          wb.snapshotCtx,
          item.payload,
          790,
          `800 ${baseFont + 1}px Cairo, "JetBrains Mono", sans-serif`
        );
        estimatedTextHeight += Math.max(1, lines.length) * measuredLineHeight + 16;
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
    captureWhiteboardBaseLayer();
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
    lines.push(`BATTERY(160, 200, "V = 12V")`);
    lines.push(`WIRE(160, 160, 160, 105, "#0F172A")`);
    lines.push(`WIRE(160, 105, 340, 105, "#0F172A")`);
    lines.push(`RESISTOR(390, 105, "R = 220Ω")`);
    lines.push(`WIRE(440, 105, 575, 105, "#0F172A")`);
    lines.push(`LED(620, 105, "LED")`);
    lines.push(`WIRE(665, 105, 740, 105, "#0F172A")`);
    lines.push(`WIRE(740, 105, 740, 290, "#0F172A")`);
    lines.push(`ARROW(460, 72, 560, 72, "I (Current)", "#0EA5E9")`);
    lines.push(`WIRE(740, 290, 160, 290, "#0F172A")`);
    lines.push(`WIRE(160, 290, 160, 240, "#0F172A")`);
  } else if (diagram === 'control' || diagram === 'pid') {
    lines.push(`BOX(80, 130, 150, 70, "Setpoint (الهدف)")`);
    lines.push(`ARROW(235, 165, 295, 165, "Error", "#0EA5E9")`);
    lines.push(`BOX(300, 130, 160, 70, "PID Controller")`);
    lines.push(`ARROW(465, 165, 525, 165, "PWM", "#0EA5E9")`);
    lines.push(`WAVE(540, 105, 260, 115, "step", "استجابة النظام PID")`);
  } else {
    lines.push(`SENSOR(145, 165, "حساس ذكي")`);
    lines.push(`ARROW(200, 165, 290, 165, "إشارة", "#0EA5E9")`);
    lines.push(`BOX(295, 128, 190, 74, "المتحكم الدقيق (MCU)")`);
    lines.push(`ARROW(490, 165, 595, 165, "PWM", "#0EA5E9")`);
    lines.push(`MOTOR(655, 165, "محرك DC")`);
  }

  lines.push(`CALLOUT(450, 342, "${safeEq}")\n[/DRAW]`);

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
  (window as any).drawCapacitor = drawCapacitor;
  (window as any).drawLED = drawLED;
  (window as any).drawMotor = drawMotor;
  (window as any).drawWave = drawWave;
  (window as any).drawSensor = drawSensor;
  (window as any).drawGear = drawGear;
  (window as any).drawCallout = drawCallout;
  (window as any).drawText = drawText;
  (window as any).drawBox = drawBox;
  (window as any).drawArrow = drawArrow;
  (window as any).processAIResponse = processAIResponse;
}
