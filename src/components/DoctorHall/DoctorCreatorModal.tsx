import React, { useState } from 'react';
import { Doctor, DoctorStyle, BoardColor, ExplanationLevel, Language } from '../../types';
import { OFFICIAL_LOGO_URL } from '../../services/storage';
import { X, Bot, Palette, Volume2, Globe, Shield, Sparkles } from 'lucide-react';

interface DoctorCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDoctor: (doc: Doctor) => void;
  existingDoctor?: Doctor | null;
}

export const DoctorCreatorModal: React.FC<DoctorCreatorModalProps> = ({
  isOpen,
  onClose,
  onSaveDoctor,
  existingDoctor,
}) => {
  const [name, setName] = useState(existingDoctor?.name || 'دكتور الميكاترونكس الذكي');
  const [subject, setSubject] = useState(existingDoctor?.subject || 'أنظمة الميكاترونكس والنظم المدمجة والروبوتات');
  const [specialization, setSpecialization] = useState(existingDoctor?.specialization || 'دكتوراة في هندسة الميكاترونكس والذكاء الاصطناعي');
  const [description, setDescription] = useState(existingDoctor?.description || 'شرح تفاعلي مبسط مع حل المسائل ورسم المخططات.');
  const [style, setStyle] = useState<DoctorStyle>(existingDoctor?.style || 'real');
  const [boardColor, setBoardColor] = useState<BoardColor>(existingDoctor?.boardColor || 'navy');
  const [language, setLanguage] = useState<Language>(existingDoctor?.language || 'ar');
  const [level, setLevel] = useState<ExplanationLevel>(existingDoctor?.level || 'intermediate');
  const [voiceSpeed, setVoiceSpeed] = useState<number>(existingDoctor?.voiceSpeed || 1.0);
  const [avatarUrl, setAvatarUrl] = useState<string>(existingDoctor?.avatarUrl || OFFICIAL_LOGO_URL);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newDoc: Doctor = {
      id: existingDoctor?.id || `doc_${Date.now()}`,
      name,
      subject,
      specialization,
      description,
      style,
      boardColor,
      language,
      level,
      voiceSpeed,
      avatarUrl,
      createdAt: existingDoctor?.createdAt || new Date().toISOString(),
    };

    onSaveDoctor(newDoc);
    onClose();
  };

  const sampleAvatars = [
    { url: OFFICIAL_LOGO_URL, label: 'الشعار الرسمي لدكتور الميكاترونكس' },
    { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop', label: 'دكتور أكاديمي يمني' },
    { url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop', label: 'أستاذ هندسة الميكاترونكس' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0D1B2A] border border-amber-500/30 w-full max-w-2xl rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 text-slate-100 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-xl bg-amber-500/20 border border-amber-500/30">
              <img src={OFFICIAL_LOGO_URL} alt="الشعار" className="w-8 h-8 rounded-lg object-cover" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {existingDoctor ? 'تعديل بيانات الدكتور الذكي' : 'إنشاء دكتور تعليمي جديد'}
              </h2>
              <p className="text-xs text-slate-400">تخصيص هوية الدكتور واسم المادة ونوع السبورة ومستوى الشرح</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم الدكتور</label>
              <input
                type="text"
                required
                placeholder="مثال: دكتور الميكاترونكس الذكي"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم المادة / التخصص</label>
              <input
                type="text"
                required
                placeholder="مثال: التحكم والأنظمة المدمجة والروبوتات"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">التخصص الدقيق والدرجة العلمية</label>
            <input
              type="text"
              placeholder="مثال: دكتوراة في هندسة الميكاترونكس والأنظمة المدمجة"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">وصف أسلوب الدكتور</label>
            <textarea
              rows={2}
              placeholder="وصف مختصر لطريقة الدكتور في الشرح والإجابة..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-amber-400 focus:outline-none resize-none"
            />
          </div>

          {/* Doctor Visual Style */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">شكل مظهر الدكتور</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'real', label: 'الشعار الرسمي', desc: 'رمز أكاديمي موثوق' },
                { id: 'cartoon', label: 'شخصية كرتونية', desc: 'أسلوب ممتع وتفاعلي' },
                { id: 'illustration', label: 'رسم توضيحي', desc: 'رسوم هندسية متقدمة' },
                { id: 'icon', label: 'أيقونة افتراضية', desc: 'شعار رقمي ذكي' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setStyle(item.id as DoctorStyle)}
                  className={`p-3 rounded-xl border text-right transition-all ${
                    style === item.id
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">{item.label}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Preset Avatar Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">اختيار صورة الشخصية</label>
            <div className="flex items-center gap-3">
              {sampleAvatars.map((av, idx) => (
                <img
                  key={idx}
                  src={av.url}
                  alt={av.label}
                  title={av.label}
                  onClick={() => setAvatarUrl(av.url)}
                  className={`w-14 h-14 rounded-xl object-cover cursor-pointer border-2 transition-all ${
                    avatarUrl === av.url ? 'border-amber-400 scale-105 shadow-md shadow-amber-500/30' : 'border-slate-700 opacity-60 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Blackboard Color Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-cyan-400" />
              <span>اختيار لون السبورة الإلكترونية</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'navy', label: 'سبورة كحلي هندسي', bg: 'bg-[#0b2545] text-cyan-200' },
                { id: 'green', label: 'سبورة خضراء تقليدية', bg: 'bg-[#1b4332] text-emerald-200' },
                { id: 'dark', label: 'سبورة رمادية داكنة', bg: 'bg-[#1e293b] text-slate-200' },
                { id: 'white', label: 'سبورة بيضاء حديثة', bg: 'bg-slate-100 text-slate-900 font-bold' },
              ].map((b) => (
                <button
                  type="button"
                  key={b.id}
                  onClick={() => setBoardColor(b.id as BoardColor)}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${b.bg} ${
                    boardColor === b.id ? 'ring-2 ring-amber-400 border-amber-400' : 'border-slate-700 opacity-80'
                  }`}
                >
                  <span>{b.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Language & Level & Voice Speed */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">لغة الشرح</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-amber-400 focus:outline-none"
              >
                <option value="ar">العربية (مع مصطلحات بالإنجليزية)</option>
                <option value="en">English (Academic Standard)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">مستوى الشرح</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as ExplanationLevel)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-amber-400 focus:outline-none"
              >
                <option value="beginner">مبتدئ (مبسط بدون تعقيد)</option>
                <option value="intermediate">متوسط (أكاديمي متوازن)</option>
                <option value="advanced">متقدم (عميق بالمعادلات)</option>
                <option value="expert">خبير (تطبيقات صناعية وقوانين)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">سرعة الصوت ({voiceSpeed}x)</label>
                <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                  صوت ذكر بالغ (40-50 سنة)
                </span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.3"
                step="0.05"
                value={voiceSpeed}
                onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                className="w-full accent-amber-400 mt-1"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                نبرة أبوية دافئة، واثقة، كأستاذ جامعي يمني بوقفات تعليمية متزنة (ممنوع أي صوت أنثوي).
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700"
            >
              إلغاء
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40"
            >
              حفظ وتطبيق الدكتور
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
