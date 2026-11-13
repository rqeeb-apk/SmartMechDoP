/**
 * Centralized Strict Adult Male Professor Text-to-Speech Engine
 * Enforces an authoritative, warm, fatherly 40-50 yr old university professor voice
 * across Lecture Hall, Doctor Hall, and Explain Lesson services.
 */

export interface AdultMaleVoiceProfile {
  readonly persona: 'adult_male_professor';
  readonly ageRange: '40-50';
  readonly rate: number;
  readonly pitch: number;
  readonly fallbackPitch: number;
  readonly volume: number;
  readonly defaultLang: 'ar-SA' | 'en-US';
}

export const ADULT_MALE_PROFESSOR_PROFILE: AdultMaleVoiceProfile = {
  persona: 'adult_male_professor',
  ageRange: '40-50',
  rate: 0.93, // Confident, measured, unhurried 40-50 yr Yemeni university professor cadence
  pitch: 0.86, // Warm, deep, resonant fatherly adult male baritone
  fallbackPitch: 0.74, // Deep baritone guard if OS only exposes an unlabelled system voice
  volume: 1.0, // Full clear classroom projection
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

/**
 * Selects the strongest Adult Male voice matching the requested language.
 * Strictly blocks any known female voice from being selected.
 */
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
    appliedPitch: 0.68, // Deepest safe male pitch floor if OS only ships female default voices
  };
}

/**
 * Cleans markdown/LaTeX/emoji symbols and splits long explanations into natural spoken sentences
 * so Chrome/Android TTS never cuts off mid-lecture (~15s limit) and retains Yemeni academic pauses.
 */
function prepareProfessorSpeechChunks(text: string): string[] {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, ' الكود البرمجي الموضح على السبورة. ')
    .replace(/\\\(.*?\\\)/g, ' المعادلة ')
    .replace(/\$(.*?)\$/g, ' المعادلة ')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ')
    .replace(/[*_#`~[\]()<>]/g, ' ')
    .replace(/([،,])/g, '$1 ')
    .replace(
      /(أهلاً وسهلاً بك يا مهندس|شوف يا ابني|يا مهندس|يا بطل|ركّز معي|ركز معي|خلّينا نفكر مع بعض|حبة حبة|تذكّر)/g,
      '$1، '
    )
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return [];

  // Split into sentence chunks <= 170 chars at natural punctuation boundaries
  const rawSegments = cleaned.split(/(?<=[.!?؟\n])\s+/);
  const chunks: string[] = [];

  for (const seg of rawSegments) {
    const trimmed = seg.trim();
    if (!trimmed) continue;

    if (trimmed.length <= 170) {
      chunks.push(trimmed);
    } else {
      // Secondary split on Arabic/English commas if a sentence is very long
      const subParts = trimmed.split(/(?<=[،,;؛])\s+/);
      let buffer = '';
      for (const part of subParts) {
        if ((buffer + ' ' + part).trim().length <= 170) {
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

export class AdultMaleProfessorVoiceEngine {
  private synth: SpeechSynthesis | null = null;
  private isSpeaking = false;
  private isPausedState = false;
  private sessionId = 0;
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;

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

  /**
   * Waits briefly for async browser voice catalogs (Chrome / Android / Safari)
   * so the initial welcome lecture selects the Adult Male voice reliably.
   */
  private async ensureVoicesReady(timeoutMs = 350): Promise<SpeechSynthesisVoice[]> {
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
    if (!this.synth) return;

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
    const chunks = prepareProfessorSpeechChunks(text);
    if (chunks.length === 0) return;

    this.stop();
    const activeSession = ++this.sessionId;

    const voices = await this.ensureVoicesReady();
    if (activeSession !== this.sessionId || !this.synth) return;

    const selection = selectStrictAdultMaleVoice(voices, lang);

    const speakChunkAt = (index: number) => {
      if (activeSession !== this.sessionId || !this.synth) return;

      if (index >= chunks.length) {
        this.isSpeaking = false;
        this.isPausedState = false;
        this.currentUtterance = null;
        opts.onEnd?.();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.lang = selection.voice?.lang || (lang === 'ar' ? ADULT_MALE_PROFESSOR_PROFILE.defaultLang : 'en-US');
      utterance.rate = ADULT_MALE_PROFESSOR_PROFILE.rate;
      utterance.pitch = selection.appliedPitch;
      utterance.volume = ADULT_MALE_PROFESSOR_PROFILE.volume;

      if (selection.voice) {
        utterance.voice = selection.voice;
      }

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
        this.currentUtterance = null;
        opts.onError?.();
        opts.onEnd?.();
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    };

    speakChunkAt(0);
  }

  public stop(): void {
    this.sessionId++;
    if (this.synth) {
      this.synth.cancel();
    }
    this.isSpeaking = false;
    this.isPausedState = false;
    this.currentUtterance = null;
  }

  public pause(): void {
    if (this.synth && this.isSpeaking && !this.isPausedState) {
      this.synth.pause();
      this.isPausedState = true;
    }
  }

  public resume(): void {
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
  } {
    const selection = selectStrictAdultMaleVoice(this.refreshVoices(), lang);
    return {
      voiceName: selection.voice?.name || 'System Default (Male-Tuned)',
      isVerifiedMale: selection.isVerifiedMale,
      pitch: selection.appliedPitch,
      rate: ADULT_MALE_PROFESSOR_PROFILE.rate,
    };
  }
}

export const professorVoiceEngine = new AdultMaleProfessorVoiceEngine();
