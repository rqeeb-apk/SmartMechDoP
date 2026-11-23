import React, { useState } from 'react';
import { X, Lightbulb, Send, CheckCircle2, AlertTriangle, MessageSquare } from 'lucide-react';
import { submitFeedback } from '../../services/feedbackService';
import { UserProfile } from '../../types';

interface FloatingFeedbackWidgetProps {
  user: UserProfile;
}

export const FloatingFeedbackWidget: React.FC<FloatingFeedbackWidgetProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<'اقتراح' | 'مشكلة' | 'طلب ميزة جديدة'>('اقتراح');
  const [message, setMessage] = useState('');
  const [guestName, setGuestName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setErrorMsg('يرجى كتابة تفاصيل الرسالة.');
      return;
    }

    const studentName = user.role === 'owner' ? 'مالك المنصة' : user.name || guestName.trim() || 'زائر للمنصة';
    const studentId = user.id || 'guest';

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await submitFeedback({
        student_id: studentId,
        student_name: studentName,
        type,
        message: message.trim(),
      });

      setSuccessMsg('شكراً لك! تم استلام اقتراحك وسنقوم بمراجعته قريباً.');
      setMessage('');
      setGuestName('');
      setTimeout(() => {
        setSuccessMsg(null);
        setIsOpen(false);
      }, 2500);
    } catch (e: any) {
      setErrorMsg(e?.message || 'تعذر إرسال الرسالة، يرجى المحاولة مجدداً.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Action Button in Bottom-Left Corner */}
      <div className="fixed bottom-20 left-4 z-40 group">
        <button
          onClick={() => setIsOpen(true)}
          className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 text-slate-950 shadow-2xl flex items-center justify-center text-xl hover:scale-110 active:scale-95 transition-all cursor-pointer animate-pulse"
          aria-label="الاقتراحات والإبلاغ عن المشاكل"
        >
          <Lightbulb className="w-6 h-6 text-slate-950 fill-amber-300" />
        </button>

        {/* Hover Tooltip */}
        <div className="absolute left-14 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xl">
          هل لديك اقتراح أو مشكلة؟
        </div>
      </div>

      {/* Glassmorphism / Dark Mode Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in font-sans text-right">
          <div className="w-full max-w-md champagne-card dark:bg-[#0B192E] border border-[rgba(212,175,55,0.4)] dark:border-amber-500/40 rounded-3xl p-6 shadow-2xl text-[#0F172A] dark:text-slate-100 relative overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-xl">
                  💡
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0F172A] dark:text-white">
                    الاقتراحات والإبلاغ عن المشاكل
                  </h3>
                  <p className="text-[11px] text-[#475569] dark:text-slate-400">
                    نصائحك وآراؤك تطور منصة الدكتور الذكي
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-500/20 text-slate-500 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {successMsg ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                <p className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 leading-relaxed">
                  {successMsg}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-200 mb-1.5">
                    نوع الرسالة:
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-[#0F172A] dark:text-white font-bold focus:outline-none focus:border-[#0EA5E9]"
                  >
                    <option value="اقتراح">💡 اقتراح تطوير</option>
                    <option value="مشكلة">⚠️ الإبلاغ عن مشكلة</option>
                    <option value="طلب ميزة جديدة">🚀 طلب ميزة جديدة</option>
                  </select>
                </div>

                {(!user.name || user.role === 'owner') && (
                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-200 mb-1.5">
                      اسمك الكريم (اختياري):
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="أدخل اسمك..."
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-[#0F172A] dark:text-white focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-200 mb-1.5">
                    تفاصيل الرسالة أو المقترح:
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    placeholder="اكتب اقتراحك أو صِف المشكلة بالتفصيل..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-[#0F172A] dark:text-white focus:outline-none leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !message.trim()}
                    className="px-6 py-2.5 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-gradient-to-r dark:from-amber-400 dark:to-yellow-500 dark:text-slate-950 text-white font-black text-xs flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'جاري الإرسال...' : 'إرسال الرسالة'}</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </>
  );
};
