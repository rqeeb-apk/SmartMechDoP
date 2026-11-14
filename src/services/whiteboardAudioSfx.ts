/**
 * محرك المؤثرات الصوتية الخفيفة للسبورة الذكية (Web Audio API)
 * يولّد صوت قلم واقعي وخفيف على الورق/السبورة عند بدء رسم كل عنصر
 * بدون الاعتماد على ملفات صوتية خارجية أو استهلاك الشبكة.
 */

export type PenStrokeKind = 'wire' | 'component' | 'box' | 'text' | 'clear';

const STORAGE_KEY = 'dr_smart_pen_sfx';

class WhiteboardAudioSfxEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private enabled: boolean = true;
  private lastPlayedAt: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'false') this.enabled = false;
      } catch {
        // Ignore storage errors
      }

      const unlock = () => {
        this.ensureContext();
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('pointerdown', unlock, { once: true, passive: true });
      window.addEventListener('keydown', unlock, { once: true, passive: true });
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(next: boolean): void {
    this.enabled = next;
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'true' : 'false');
    } catch {
      // Ignore storage errors
    }
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled);
    if (this.enabled) {
      this.playPenStroke('text');
    }
    return this.enabled;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.noiseBuffer && this.ctx) {
      // Create 0.6s filtered white-noise buffer once for natural paper-grain friction
      const sampleRate = this.ctx.sampleRate;
      const length = Math.floor(sampleRate * 0.6);
      const buffer = this.ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      let prev = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        // Slight pink/brown smoothing so paper friction sounds warm, never harsh
        prev = prev * 0.45 + white * 0.55;
        data[i] = prev;
      }
      this.noiseBuffer = buffer;
    }
    return this.ctx;
  }

  /**
   * تشغيل صوت قلم خفيف عند بدء رسم عنصر جديد على السبورة
   */
  public playPenStroke(kind: PenStrokeKind = 'wire'): void {
    if (!this.enabled || typeof window === 'undefined') return;

    const nowMs = performance.now();
    // Throttle rapid overlapping bursts (minimum 65ms gap)
    if (nowMs - this.lastPlayedAt < 65) return;
    this.lastPlayedAt = nowMs;

    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running' || !this.noiseBuffer) return;

    try {
      const t0 = ctx.currentTime + 0.005;

      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      // Start at slight random offset so consecutive strokes sound organic
      const maxOffset = Math.max(0.05, this.noiseBuffer.duration - 0.35);
      const offset = Math.random() * maxOffset;

      const bandpass = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      let duration = 0.18;
      let peakGain = 0.045;

      if (kind === 'wire') {
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(1750, t0);
        bandpass.frequency.linearRampToValueAtTime(2450, t0 + 0.14);
        bandpass.Q.value = 1.9;
        duration = 0.19;
        peakGain = 0.042;
      } else if (kind === 'component') {
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(1950, t0);
        bandpass.frequency.linearRampToValueAtTime(2700, t0 + 0.12);
        bandpass.frequency.linearRampToValueAtTime(2050, t0 + 0.24);
        bandpass.Q.value = 2.1;
        duration = 0.25;
        peakGain = 0.05;
      } else if (kind === 'box') {
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(1400, t0);
        bandpass.frequency.linearRampToValueAtTime(1850, t0 + 0.2);
        bandpass.Q.value = 1.6;
        duration = 0.22;
        peakGain = 0.045;
      } else if (kind === 'text') {
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(2600, t0);
        bandpass.Q.value = 2.6;
        duration = 0.1;
        peakGain = 0.026;
      } else if (kind === 'clear') {
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(750, t0);
        bandpass.frequency.exponentialRampToValueAtTime(420, t0 + 0.2);
        bandpass.Q.value = 1.1;
        duration = 0.21;
        peakGain = 0.04;
      }

      // Smooth attack & natural paper release envelope (no clicks)
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(peakGain, t0 + Math.min(0.035, duration * 0.25));
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

      source.connect(bandpass);
      bandpass.connect(gain);
      gain.connect(ctx.destination);

      source.start(t0, offset, duration + 0.02);
      source.stop(t0 + duration + 0.03);
    } catch {
      // Fail silently if audio context cannot schedule
    }
  }
}

export const whiteboardAudioSfx = new WhiteboardAudioSfxEngine();
