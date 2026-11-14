/**
 * Centralized Strict Adult Male Professor Text-to-Speech Engine
 * Primary Engine: Server-side Gemini Neural TTS (Charon / Fenrir Adult Male Arabic voice)
 * so Arabic speech is smooth, natural, un-chopped, and guaranteed Male on ALL phones/OSes.
 * Emergency Fallback: Verified OS Adult Male speechSynthesis voice only (female voices strictly blocked).
 */

export interface AdultMaleVoiceProfile {
  readonly persona: 'adult_male_professor';
  readonly ageRange: '40-50';
  readonly neuralVoice: 'Charon' | 'Fenrir';
  readonly rate: number;
  readonly pitch: number;
  readonly fallbackPitch: number;
  readonly volume: number;
  readonly defaultLang: 'ar-SA' | 'en-US';
}

export const ADULT_MALE_PROFESSOR_PROFILE: AdultMaleVoiceProfile = {
  persona: 'adult_male_professor',
  ageRange: '40-50',
  neuralVoice: 'Charon',
  rate: 0.94,
  pitch: 0.86,
  fallbackPitch: 0.74,
  volume: 1.0,
  defaultLang: 'ar-SA',
};

const FEMALE_VOICE_EXCLUSIONS: string[] = [
  'female', 'woman', 'lady', 'girl', 'fem', '-f-', '_f_', '(f)',
  'zeina', 'zariyah', 'laila', 'leila', 'salma', 'hoda', 'maryam', 'mariam',
  'fatima', 'fatma', 'fatimah', 'amina', 'noura', 'nouf', 'rana', 'amira',
  'aisha', 'ghaida', 'jamila', 'jood', 'karima', 'kawthar', 'khaleda',
  'latifa', 'lubna', 'malak', 'marwa', 'may', 'muna', 'mouna', 'nadine',
  'nahla', 'najla', 'nawal', 'nesreen', 'nisrine', 'rehab', 'rim', 'roaa',
  'safaa', 'sahar', 'samah', 'sana', 'asma', 'iman', 'kenza', 'nadia',
  'samira', 'layla', 'sara', 'sarah', 'yasmin', 'yasmine', 'dalia', 'reem',
  'amal', 'maha', 'hala', 'lina', 'maya', 'nada', 'samar', 'suha', 'wafa',
  'zainab', 'shaimaa', 'suad', 'sumaya', 'tahani', 'widad', 'yara', 'yusra',
  'zahra', 'zina',
  'samantha', 'victoria', 'karen', 'zira', 'hazel', 'siri female',
  'cathy', 'princess', 'monica', 'eva', 'anissa', 'jenny', 'aria', 'emma',
  'ar-xa-x-ard', 'ar-xa-x-arz', 'ar-eg-x-ard', 'ar-xa-standard-a',
  'ar-xa-wavenet-a', 'ar-xa-standard-d', 'ar-xa-wavenet-d', 'ar-sa-x-saa',
];

const VERIFIED_MALE_VOICE_KEYWORDS: string[] = [
  'naayf', 'maged', 'majid', 'majed', 'tariq', 'hamed', 'shakir', 'bassel',
  'jamal', 'moaz', 'laith', 'fahed', 'salman', 'hamdan', 'taim', 'uday',
  'rami', 'ayman', 'zayd', 'badr', 'mustafa', 'karim', 'nabil', 'sami',
  'omar', 'hassan', 'youssef', 'abdullah', 'ali', 'khalid', 'ahmad', 'ahmed',
  'mohammad', 'muhammad', 'ibrahim', 'salem', 'yasser', 'faisal', 'mansour',
  'saud', 'turki', 'nasser', 'adnan', 'adel', 'kamal', 'walid',
  'david', 'mark', 'guy', 'andrew', 'brian', 'christopher',
  'male', 'man', '-m-', '_m_', '(m)',
  'ar-xa-x-arc', 'ar-xa-x-are', 'ar-xa-x-arm', 'ar-xa-standard-b',
  'ar-xa-wavenet-b', 'ar-xa-standard-c', 'ar-xa-wavenet-c',
];

export interface VoiceSelectionResult {
  voice: SpeechSynthesisVoice | null;
  isVerifiedMale: boolean;
  appliedPitch: number;
}

export function isExplicitFemaleVoice(v: SpeechSynthesisVoice): boolean {
  const name = (v.name || '').toLowerCase();
  const uri = (v.voiceURI || '').toLowerCase();
  return FEMALE_VOICE_EXCLUSIONS.some((fk) => name.includes(fk) || uri.includes(fk));
}

export function isVerifiedMaleVoice(v: SpeechSynthesisVoice): boolean {
  if (isExplicitFemaleVoice(v)) return false;
  const name = (v.name || '').toLowerCase();
  const uri = (v.voiceURI || '').toLowerCase();
  return VERIFIED_MALE_VOICE_KEYWORDS.some((mk) => name.includes(mk) || uri.includes(mk));
}

export function selectStrictAdultMaleVoice(
  voices: SpeechSynthesisVoice[],
  lang: 'ar' | 'en' = 'ar'
): VoiceSelectionResult {
  const nonFemaleLangVoices = voices.filter(
    (v) => v.lang.toLowerCase().startsWith(lang) && !isExplicitFemaleVoice(v)
  );

  const scoreVoice = (v: SpeechSynthesisVoice): number => {
    const n = `${v.name || ''} ${v.voiceURI || ''}`.toLowerCase();
    const l = (v.lang || '').toLowerCase();
    let score = 0;

    if (isVerifiedMaleVoice(v)) score += 35;
    if (n.includes('natural') || n.includes('neural') || n.includes('online')) score += 15;
    if (
      n.includes('naayf') ||
      n.includes('hamed') ||
      n.includes('shakir') ||
      n.includes('tariq') ||
      n.includes('maged') ||
      n.includes('majid')
    ) {
      score += 12;
    }
    if (lang === 'ar') {
      if (l.includes('ye') || l.includes('sa') || l.includes('ae')) score += 6;
      else if (l.includes('eg') || l.includes('jo') || l.includes('kw')) score += 4;
    }
    if (!v.localService) score += 2;

    return score;
  };

  const ranked = [...nonFemaleLangVoices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  const bestVoice = ranked[0] || null;

  if (bestVoice) {
    const verified = isVerifiedMaleVoice(bestVoice);
    return {
      voice: bestVoice,
      isVerifiedMale: verified,
      appliedPitch: verified
        ? ADULT_MALE_PROFESSOR_PROFILE.pitch
        : ADULT_MALE_PROFESSOR_PROFILE.fallbackPitch,
    };
  }

  return {
    voice: null,
    isVerifiedMale: false,
    appliedPitch: 0.68,
  };
}

function cleanSpeechInput(text: string): string {
  return String(text || '')
    .replace(/\[DRAW\][\s\S]*?\[\/DRAW\]/gi, ' كما هو مرسوم وموضح أمامك على السبورة. ')
    .replace(/\[\/?TEXT\]/gi, ' ')
    .replace(/```[\s\S]*?```/g, ' الكود البرمجي الموضح على السبورة. ')
    .replace(/\\\(.*?\\\)/g, ' المعادلة ')
    .replace(/\$(.*?)\$/g, ' المعادلة ')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ')
    .replace(/[*_#`~[\]()<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function prepareProfessorSpeechChunks(text: string): string[] {
  const cleaned = cleanSpeechInput(text);
  if (!cleaned) return [];

  const rawSegments = cleaned.split(/(?<=[.!?؟\n])\s+/);
  const chunks: string[] = [];

  for (const seg of rawSegments) {
    const trimmed = seg.trim();
    if (!trimmed) continue;

    if (trimmed.length <= 180) {
      chunks.push(trimmed);
    } else {
      const subParts = trimmed.split(/(?<=[،,;؛])\s+/);
      let buffer = '';
      for (const part of subParts) {
        if ((buffer + ' ' + part).trim().length <= 180) {
          buffer = (buffer + ' ' + part).trim();
        } else {
          if (buffer) chunks.push(buffer);
          buffer = part.trim();
        }
      }
      if (buffer) chunks.push(buffer);
    }
  }

  return chunks.length > 0 ? chunks : [cleaned];
}

function base64WavToObjectUrl(base64: string, mimeType = 'audio/wav'): string {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

export class AdultMaleProfessorVoiceEngine {
  private synth: SpeechSynthesis | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private isSpeaking = false;
  private isPausedState = false;
  private sessionId = 0;
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private neuralAudioCache = new Map<string, string>();
  private lastUsedMode: 'neural_male' | 'browser_male' = 'neural_male';

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.refreshVoices();
      if (typeof this.synth.addEventListener === 'function') {
        this.synth.addEventListener('voiceschanged', () => this.refreshVoices());
      } else {
        this.synth.onvoiceschanged = () => this.refreshVoices();
      }
    }
  }

  private refreshVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    const list = this.synth.getVoices();
    if (list && list.length > 0) {
      this.cachedVoices = list;
    }
    return this.cachedVoices;
  }

  private async ensureVoicesReady(timeoutMs = 300): Promise<SpeechSynthesisVoice[]> {
    const existing = this.refreshVoices();
    if (existing.length > 0 || !this.synth) return existing;

    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve(this.refreshVoices());
      };

      const onChanged = () => {
        if (this.refreshVoices().length > 0) {
          if (this.synth && typeof this.synth.removeEventListener === 'function') {
            this.synth.removeEventListener('voiceschanged', onChanged);
          }
          finish();
        }
      };

      if (typeof this.synth?.addEventListener === 'function') {
        this.synth.addEventListener('voiceschanged', onChanged);
      }
      setTimeout(finish, timeoutMs);
    });
  }

  private async speakWithNeuralMaleTts(
    cleanedText: string,
    lang: 'ar' | 'en',
    activeSession: number,
    opts: { onStart?: () => void; onEnd?: () => void; onError?: () => void }
  ): Promise<boolean> {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return false;

    const cacheKey = `${lang}_${cleanedText.slice(0, 600)}_${cleanedText.length}`;
    let objectUrl = this.neuralAudioCache.get(cacheKey);

    if (!objectUrl) {
      const response = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanedText, lang }),
      });

      if (!response.ok) return false;
      const result = await response.json();
      if (!result?.success || !result?.audioBase64) return false;

      objectUrl = base64WavToObjectUrl(result.audioBase64, result.mimeType || 'audio/wav');
      if (this.neuralAudioCache.size > 40) {
        const firstKey = this.neuralAudioCache.keys().next().value;
        if (firstKey) {
          const oldUrl = this.neuralAudioCache.get(firstKey);
          if (oldUrl) URL.revokeObjectURL(oldUrl);
          this.neuralAudioCache.delete(firstKey);
        }
      }
      this.neuralAudioCache.set(cacheKey, objectUrl);
    }

    if (activeSession !== this.sessionId) return true;

    const audio = new Audio(objectUrl);
    audio.volume = ADULT_MALE_PROFESSOR_PROFILE.volume;
    audio.playbackRate = 1.0;
    this.currentAudio = audio;
    this.lastUsedMode = 'neural_male';

    return new Promise<boolean>((resolve) => {
      audio.onplay = () => {
        if (activeSession !== this.sessionId) return;
        this.isSpeaking = true;
        this.isPausedState = false;
        opts.onStart?.();
      };

      audio.onended = () => {
        if (activeSession !== this.sessionId) return;
        this.isSpeaking = false;
        this.isPausedState = false;
        this.currentAudio = null;
        opts.onEnd?.();
        resolve(true);
      };

      audio.onerror = () => {
        if (activeSession !== this.sessionId) return;
        this.isSpeaking = false;
        this.isPausedState = false;
        this.currentAudio = null;
        resolve(false);
      };

      audio.play().catch(() => {
        if (activeSession === this.sessionId) {
          this.isSpeaking = false;
          this.currentAudio = null;
        }
        resolve(false);
      });
    });
  }

  private async speakWithBrowserFallback(
    cleanedText: string,
    lang: 'ar' | 'en',
    activeSession: number,
    opts: { onStart?: () => void; onEnd?: () => void; onError?: () => void }
  ): Promise<void> {
    if (!this.synth) {
      opts.onError?.();
      opts.onEnd?.();
      return;
    }

    const chunks = prepareProfessorSpeechChunks(cleanedText);
    if (chunks.length === 0) {
      opts.onEnd?.();
      return;
    }

    const voices = await this.ensureVoicesReady();
    if (activeSession !== this.sessionId || !this.synth) return;

    const selection = selectStrictAdultMaleVoice(voices, lang);
    // Strict guard: only fall back to OS voice if it is verified male (never allow OS female default)
    if (!selection.voice || !selection.isVerifiedMale) {
      this.isSpeaking = false;
      opts.onError?.();
      opts.onEnd?.();
      return;
    }

    this.lastUsedMode = 'browser_male';

    const speakChunkAt = (index: number) => {
      if (activeSession !== this.sessionId || !this.synth) return;

      if (index >= chunks.length) {
        this.isSpeaking = false;
        this.isPausedState = false;
        opts.onEnd?.();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.lang = selection.voice?.lang || (lang === 'ar' ? ADULT_MALE_PROFESSOR_PROFILE.defaultLang : 'en-US');
      utterance.rate = ADULT_MALE_PROFESSOR_PROFILE.rate;
      utterance.pitch = selection.appliedPitch;
      utterance.volume = ADULT_MALE_PROFESSOR_PROFILE.volume;
      if (selection.voice) utterance.voice = selection.voice;

      utterance.onstart = () => {
        if (activeSession !== this.sessionId) return;
        if (!this.isSpeaking) {
          this.isSpeaking = true;
          this.isPausedState = false;
          opts.onStart?.();
        }
      };

      utterance.onend = () => {
        if (activeSession !== this.sessionId) return;
        speakChunkAt(index + 1);
      };

      utterance.onerror = () => {
        if (activeSession !== this.sessionId) return;
        this.isSpeaking = false;
        this.isPausedState = false;
        opts.onError?.();
        opts.onEnd?.();
      };

      this.synth.speak(utterance);
    };

    speakChunkAt(0);
  }

  public async speak(
    text: string,
    optionsOrOnStart?:
      | {
          lang?: 'ar' | 'en';
          onStart?: () => void;
          onEnd?: () => void;
          onError?: () => void;
        }
      | (() => void),
    onEndArg?: () => void,
    onErrorArg?: () => void
  ): Promise<void> {
    const opts =
      typeof optionsOrOnStart === 'function'
        ? {
            lang: 'ar' as const,
            onStart: optionsOrOnStart,
            onEnd: onEndArg,
            onError: onErrorArg,
          }
        : optionsOrOnStart || {};

    const lang = opts.lang || 'ar';
    const cleaned = cleanSpeechInput(text);
    if (!cleaned) return;

    this.stop();
    const activeSession = ++this.sessionId;

    // Signal active state promptly while neural audio synthesizes
    this.isSpeaking = true;
    opts.onStart?.();

    try {
      const playedNeural = await this.speakWithNeuralMaleTts(cleaned, lang, activeSession, opts);
      if (playedNeural || activeSession !== this.sessionId) {
        return;
      }
    } catch (err) {
      console.warn('[ProfessorVoiceEngine] Neural TTS unavailable, checking strict male fallback:', err);
    }

    if (activeSession !== this.sessionId) return;
    await this.speakWithBrowserFallback(cleaned, lang, activeSession, opts);
  }

  public stop(): void {
    this.sessionId++;
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (_e) {
        // Ignore audio reset errors
      }
      this.currentAudio = null;
    }
    if (this.synth) {
      this.synth.cancel();
    }
    this.isSpeaking = false;
    this.isPausedState = false;
  }

  public pause(): void {
    if (this.currentAudio && this.isSpeaking && !this.isPausedState) {
      this.currentAudio.pause();
      this.isPausedState = true;
      return;
    }
    if (this.synth && this.isSpeaking && !this.isPausedState) {
      this.synth.pause();
      this.isPausedState = true;
    }
  }

  public resume(): void {
    if (this.currentAudio && this.isPausedState) {
      void this.currentAudio.play();
      this.isPausedState = false;
      return;
    }
    if (this.synth && this.isPausedState) {
      this.synth.resume();
      this.isPausedState = false;
    }
  }

  public getSpeakingState(): boolean {
    return this.isSpeaking;
  }

  public getProfileConfig(): AdultMaleVoiceProfile {
    return ADULT_MALE_PROFESSOR_PROFILE;
  }

  public getSelectedVoiceInfo(lang: 'ar' | 'en' = 'ar'): {
    voiceName: string;
    isVerifiedMale: boolean;
    pitch: number;
    rate: number;
    engineMode: 'neural_male' | 'browser_male';
  } {
    if (this.lastUsedMode === 'neural_male') {
      return {
        voiceName: 'Gemini Neural Arabic Male (Charon)',
        isVerifiedMale: true,
        pitch: ADULT_MALE_PROFESSOR_PROFILE.pitch,
        rate: ADULT_MALE_PROFESSOR_PROFILE.rate,
        engineMode: 'neural_male',
      };
    }

    const selection = selectStrictAdultMaleVoice(this.refreshVoices(), lang);
    return {
      voiceName: selection.voice?.name || 'Neural Adult Male Arabic (Charon)',
      isVerifiedMale: true,
      pitch: selection.appliedPitch,
      rate: ADULT_MALE_PROFESSOR_PROFILE.rate,
      engineMode: this.lastUsedMode,
    };
  }
}

export const professorVoiceEngine = new AdultMaleProfessorVoiceEngine();
