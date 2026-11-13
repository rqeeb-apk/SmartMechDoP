import React from 'react';
import { Volume2, VolumeX, Sparkles, MessageSquareQuote, RotateCcw, Bot } from 'lucide-react';
import { OFFICIAL_LOGO_URL } from '../../services/storage';

interface YemeniDoctorAvatarProps {
  doctorSpeech: string;
  isSpeaking: boolean;
  onToggleSpeech: () => void;
  onReplaySpeech: () => void;
  onTestTone?: () => void;
  dialect: 'sanani' | 'adani' | 'taizzi';
}

export const YemeniDoctorAvatar: React.FC<YemeniDoctorAvatarProps> = ({
  doctorSpeech,
  isSpeaking,
  onToggleSpeech,
  onReplaySpeech,
  onTestTone,
  dialect,
}) => {
  const dialectBadge =
    dialect === 'sanani' ? 'صنعاني' : dialect === 'adani' ? 'عدني' : 'تعزي';

  return (
    <div className="relative flex flex-col md:flex-row items-start md:items-center gap-4 champagne-card dark:bg-gradient-to-r dark:from-[#0F1F38] dark:via-[#0A1628] dark:to-[#121B2F] dark:border-2 dark:border-amber-500/40 rounded-3xl p-4 sm:p-5 overflow-hidden">
      
      {/* Decorative Aura */}
      <div className="hidden dark:block absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
      <div className="hidden dark:block absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/2" />

      {/* Doctor Character Avatar with Speaking Animation Frame */}
      <div className="relative shrink-0 flex items-center justify-center mx-auto md:mx-0">
        <div className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 bg-gradient-to-tr from-[#D4AF37] via-[#0EA5E9] to-[#0284C7] dark:from-amber-400 dark:via-orange-500 dark:to-cyan-400 shadow-lg transition-all ${
          isSpeaking ? 'ring-4 ring-[#0EA5E9]/40 dark:ring-amber-400/50 scale-105' : ''
        }`}>
          <img
            src={OFFICIAL_LOGO_URL}
            alt="دكتور الميكاترونكس الذكي"
            className="w-full h-full object-cover rounded-full"
          />

          {/* Speaking Audio Waveform Indicator */}
          {isSpeaking && (
            <div className="absolute -bottom-1.5 inset-x-0 mx-auto w-max px-2 py-0.5 rounded-full bg-white dark:bg-slate-950/95 border border-[#0EA5E9] dark:border-amber-400/80 flex items-center gap-1 shadow-lg">
              <span className="w-1 h-3 bg-[#0EA5E9] dark:bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-4 bg-[#0284C7] dark:bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-2.5 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-[9px] font-bold text-[#0F172A] dark:text-amber-300 font-mono">يتحدث...</span>
            </div>
          )}
        </div>

        {/* Dialect Tag */}
        <span className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.45)] dark:border-amber-400/60 text-[#0F172A] dark:text-amber-300 text-[10px] font-black shadow">
          {dialectBadge} 🇾🇪
        </span>
      </div>

      {/* Doctor Persona Speech Bubble */}
      <div className="flex-1 space-y-2 text-right w-full">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-white">
              دكتور <span className="text-[#0EA5E9] dark:gold-gradient-text">الميكاترونكس</span> اليمني
            </h3>
            <span className="text-[11px] text-[#0284C7] dark:text-cyan-400 font-bold bg-[#E0F2FE] dark:bg-cyan-500/10 px-2 py-0.5 rounded-full border border-[#0EA5E9]/30 dark:border-cyan-400/30">
              أستاذ المحاضرة
            </span>
            <span className="text-[10px] text-[#0F172A] dark:text-amber-300 font-bold bg-white dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-[rgba(212,175,55,0.4)] dark:border-amber-400/30">
              صوت ذكر بالغ حصرياً 🎙️ (أستاذ جامعي 40-50 سنة)
            </span>
            <button
              type="button"
              onClick={() => {
                if (onTestTone) {
                  onTestTone();
                } else {
                  import('../../services/lectureHallApi').then(({ yemeniDoctorVoice }) => {
                    yemeniDoctorVoice.speak(
                      'أهلاً وسهلاً بك يا مهندس، النبرة الأكاديمية الوقورة والدافئة مضبوطة الآن تماماً لشرح كافة مفاهيم الميكاترونكس.'
                    );
                  });
                }
              }}
              className="text-[10px] text-[#0284C7] dark:text-amber-300 font-bold bg-[#E0F2FE] hover:bg-sky-200/80 dark:bg-amber-500/15 dark:hover:bg-amber-500/30 px-2 py-0.5 rounded-full border border-[#0EA5E9]/35 dark:border-amber-400/40 transition-colors cursor-pointer"
              title="انقر لتجربة نبرة الصوت الأكاديمية الوقورة"
            >
              اختبار النبرة 🔊
            </button>
          </div>

          {/* Voice Controls (Play / Mute / Replay) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onReplaySpeech}
              className="p-1.5 rounded-xl bg-white hover:bg-[#E0F2FE] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0284C7] dark:text-slate-300 dark:hover:text-amber-400 transition-colors border border-[rgba(212,175,55,0.35)] dark:border-slate-700 cursor-pointer"
              title="إعادة الاستماع للشرح"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onToggleSpeech}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isSpeaking
                  ? 'bg-[#0EA5E9] text-white dark:bg-amber-500 dark:text-slate-950 shadow-md'
                  : 'bg-[#E0F2FE] hover:bg-[#0EA5E9] text-[#0284C7] hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white border border-[#0EA5E9]/30 dark:border-slate-700'
              }`}
            >
              {isSpeaking ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                  <span>إيقاف الصوت</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>تشغيل الشرح الصوتي</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Spoken Text Display */}
        <div className="relative p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-950/70 border border-[rgba(212,175,55,0.3)] dark:border-amber-500/25 text-xs sm:text-sm text-[#0F172A] dark:text-slate-100 leading-relaxed shadow-inner">
          <MessageSquareQuote className="w-4 h-4 text-[#0EA5E9] dark:text-amber-400/60 absolute left-3 top-3 pointer-events-none" />
          <p className="whitespace-pre-line font-medium pl-6">
            {doctorSpeech || 'أهلاً وسهلاً بك يا مهندس في قاعة المحاضرات والسبورة الذكية! اختر أي خدمة أو اطرح موضوعك وسأشرحه لك بالهندسة والواقع.'}
          </p>
        </div>
      </div>

    </div>
  );
};
