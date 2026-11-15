import React, { useState } from 'react';
import { Lock, Key, Sparkles, AlertTriangle, MessageCircle, X, LogOut } from 'lucide-react';
import { UserProfile } from '../../types';
import { updateUserProfile } from '../../services/storage';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';

interface TrialExpiredLockModalProps {
  isOpen: boolean;
  user: UserProfile;
  onSuccess: (updatedUser: UserProfile) => void;
  allowClose?: boolean;
  onClose?: () => void;
  onSignOut?: () => void;
}

export const TrialExpiredLockModal: React.FC<TrialExpiredLockModalProps> = ({
  isOpen,
  user,
  onSuccess,
  allowClose = false,
  onClose,
  onSignOut,
}) => {
  const [activationCode, setActivationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const whatsappMessage = [
    'أريد الإشتراك في منصه الدكتور الذكي',
    `الاسم: ${user.name || 'غير محدد'}`,
    `الرقم: ${user.phone || 'غير محدد'}`,
    `الجامعه: ${user.university || 'غير محدد'}`,
    `السنه: ${user.level || 'السنة الأولى'}`,
  ].join('\n');

  const whatsappUrl = `https://wa.me/967785500075?text=${encodeURIComponent(whatsappMessage)}`;

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!activationCode.trim()) {
      setError('يرجى إدخال كود التفعيل السنوي الخاص بك.');
      return;
    }

    if (!supabase || !isSupabaseConfigured) {
      setError('لم يتم إعداد مفاتيح الربط مع Supabase (VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY).');
      return;
    }

    setLoading(true);
    const cleanCode = activationCode.trim();

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const targetUserId = session?.user?.id || user.id;

      const { data: redeemResult, error: rpcError } = await supabase.rpc('redeem_code', {
        user_id: targetUserId,
        input_code: cleanCode,
      });

      if (rpcError || redeemResult !== true) {
        setError('عذراً، كود التفعيل غير صحيح أو مستخدم مسبقاً. يرجى التواصل مع الدعم عبر الواتساب.');
        return;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_subscribed: true })
        .eq('id', targetUserId);

      if (profileError) {
        throw new Error(`تعذر تحديث حالة الاشتراك: ${profileError.message}`);
      }

      const nowIso = new Date().toISOString();
      const expiresDate = new Date();
      expiresDate.setDate(expiresDate.getDate() + 365);

      const updated = updateUserProfile({
        isSubscribed: true,
        subscription: {
          status: 'active',
          codeUsed: cleanCode,
          activatedAt: nowIso,
          expiresAt: expiresDate.toISOString(),
          priceYER: 4000,
          durationDays: 365,
        },
      });

      onSuccess(updated);
      if (onClose) onClose();
    } catch (err: any) {
      setError(err?.message || 'فشلت عملية تفعيل الكود، يرجى التأكد من الرموز والمحاولة مجدداً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden bg-slate-900/75 dark:bg-black/90 backdrop-blur-xl animate-fade-in"
      onClick={() => {
        if (allowClose && onClose) onClose();
      }}
    >
      <div className="min-h-full w-full flex items-center justify-center p-3 sm:p-6 text-center">
        <div
          className="relative w-full max-w-lg champagne-card dark:bg-[#0F213E] border-2 border-[rgba(212,175,55,0.45)] dark:border-amber-500/50 rounded-3xl p-5 sm:p-8 shadow-2xl text-[#0F172A] dark:text-slate-100 overflow-hidden text-center my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Glow Effects */}
          <div className="hidden dark:block absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="hidden dark:block absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button ONLY allowed when opened voluntarily from active trial banner */}
          {allowClose && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 left-4 p-2 text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white bg-white dark:bg-slate-800/80 border border-[rgba(212,175,55,0.3)] dark:border-transparent hover:bg-[#F8FAFC] dark:hover:bg-slate-700 rounded-full transition-colors z-20"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Lock Emblem Badge */}
          <div className="w-20 h-20 mx-auto rounded-3xl p-1 bg-gradient-to-tr from-[#0EA5E9] via-amber-400 to-[#0284C7] shadow-lg flex items-center justify-center mb-5">
            <div className="w-full h-full bg-white dark:bg-[#0A192F] rounded-2xl flex items-center justify-center text-[#0EA5E9] dark:text-amber-400">
              <Lock className="w-10 h-10 animate-bounce" />
            </div>
          </div>

          <h2 className="text-xl md:text-2xl font-black text-[#0F172A] dark:text-white mb-2">
            {allowClose ? 'تفعيل الاشتراك السنوي الشامل' : 'انتهت فترة التجربة المجانية (24 ساعة)'}
          </h2>

          <p className="text-xs md:text-sm text-[#475569] dark:text-slate-300 leading-relaxed mb-5 font-medium">
            {allowClose ? (
              <>
                مرحباً <span className="font-bold text-[#0284C7] dark:text-amber-300">{user.name}</span>، يمكنك طلب كود التفعيل عبر واتساب وإدخاله أدناه لترقية حسابك فوراً.
              </>
            ) : (
              <>
                عذراً <span className="font-bold text-[#0284C7] dark:text-amber-300">{user.name}</span>، لقد انتهت مدة التجربة المجانية (24 ساعة).
                يرجى الاشتراك عبر واتساب وإدخال كود التفعيل للاستمرار في استخدام المنصة.
              </>
            )}
          </p>

          {/* Price & Duration Info Badge */}
          <div className="p-4 rounded-2xl bg-[#E0F2FE] dark:bg-amber-500/10 border border-[#0EA5E9]/30 dark:border-amber-500/30 mb-5 flex items-center justify-between text-xs font-bold font-mono">
            <span className="text-[#0F172A] dark:text-slate-300 font-sans">سعر الاشتراك السنوي الشامل:</span>
            <span className="text-[#0284C7] dark:text-amber-400 text-sm">4000 ريال يمني (365 يوم)</span>
          </div>

          {/* WhatsApp Subscribe Button */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full mb-5 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2.5 no-underline"
          >
            <MessageCircle className="w-5 h-5 shrink-0" />
            <span>طلب كود التفعيل عبر واتساب</span>
          </a>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2 text-right">
              <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Activation Code Input Form */}
          <form onSubmit={handleRedeemCode} className="space-y-4">
            <div className="relative">
              <Key className="w-5 h-5 text-[#0EA5E9] dark:text-amber-400 absolute right-4 top-3.5" />
              <input
                type="text"
                placeholder="أدخل كود التفعيل السنوي الخاص بك"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
                required
                className="w-full pr-12 pl-4 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.4)] dark:border-amber-500/50 text-[#0F172A] dark:text-amber-300 font-mono font-bold text-sm tracking-widest placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0EA5E9] dark:focus:border-amber-400 text-center"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-gradient-to-r dark:from-amber-500 dark:via-orange-500 dark:to-amber-600 text-white dark:text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>جاري التحقق من كود التفعيل...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>تفعيل الكود وفتح المنصة</span>
                </>
              )}
            </button>
          </form>

          {/* Sign out option to switch accounts cleanly */}
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="w-full mt-4 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 text-[#475569] dark:text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-2 border border-[rgba(212,175,55,0.3)] dark:border-slate-700"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>تسجيل الخروج / الدخول بحساب آخر</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
