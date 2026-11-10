import React, { useState } from 'react';
import { Lock, Key, Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
import { UserProfile } from '../../types';
import { updateUserProfile, OFFICIAL_LOGO_URL } from '../../services/storage';

interface TrialExpiredLockModalProps {
  isOpen: boolean;
  user: UserProfile;
  onSuccess: (updatedUser: UserProfile) => void;
}

export const TrialExpiredLockModal: React.FC<TrialExpiredLockModalProps> = ({
  isOpen,
  user,
  onSuccess,
}) => {
  const [activationCode, setActivationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!activationCode.trim()) {
      setError('يرجى إدخال كود التفعيل السنوي الخاص بك.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/subscriptions/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: activationCode.trim().toUpperCase(),
          studentName: user.name,
          studentEmail: user.email,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'كود التفعيل المدخل غير صحيح أو تم استخدامه من قبل طالب آخر.');
      }

      const updated = updateUserProfile({
        subscription: data.subscription,
      });

      onSuccess(updated);
    } catch (err: any) {
      setError(err.message || 'فشلت عملية تفعيل الكود، يرجى التأكد من الرموز والمحاولة مجدداً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden bg-black/90 backdrop-blur-xl animate-fade-in">
      <div className="min-h-full w-full flex items-center justify-center p-3 sm:p-6 text-center">
        <div className="relative w-full max-w-lg bg-[#0F213E] border-2 border-amber-500/50 rounded-3xl p-5 sm:p-8 shadow-2xl text-slate-100 overflow-hidden text-center my-auto">
        
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Lock Emblem Badge */}
        <div className="w-20 h-20 mx-auto rounded-3xl p-1 bg-gradient-to-tr from-amber-400 via-orange-500 to-amber-600 shadow-xl shadow-amber-500/30 flex items-center justify-center mb-5">
          <div className="w-full h-full bg-[#0A192F] rounded-2xl flex items-center justify-center text-amber-400">
            <Lock className="w-10 h-10 animate-bounce" />
          </div>
        </div>

        <h2 className="text-xl md:text-2xl font-black text-white mb-2">
          انتهت فترة التجربة المجانية (48 ساعة)
        </h2>

        <p className="text-xs md:text-sm text-slate-300 leading-relaxed mb-6 font-medium">
          عذراً <span className="font-bold text-amber-300">{user.name}</span>، لقد استنفدت التجربة المجانية الممنوحة لك على منصة دكتور الميكاترونكس الذكي.
          لا يمكنك الاستمرار في استخدام قاعة الدكتور، المختبر 3D، أو خدمات المنصة إلا بتفعيل كود الاشتراك السنوي.
        </p>

        {/* Price & Duration Info Badge */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-6 flex items-center justify-between text-xs font-bold font-mono">
          <span className="text-slate-300">سعر الاشتراك السنوي الشامل:</span>
          <span className="text-amber-400 text-sm">4000 ريال يمني (365 يوم)</span>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 text-right">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Activation Code Input Form */}
        <form onSubmit={handleRedeemCode} className="space-y-4">
          <div className="relative">
            <Key className="w-5 h-5 text-amber-400 absolute right-4 top-3.5" />
            <input
              type="text"
              placeholder="أدخل كود التفعيل السنوي الخاص بك"
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value)}
              required
              className="w-full pr-12 pl-4 py-3.5 rounded-2xl bg-slate-900 border border-amber-500/50 text-amber-300 font-mono font-bold text-sm tracking-widest placeholder-slate-600 focus:outline-none focus:border-amber-400 text-center"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>جاري التحقق من كود التفعيل عبر الخادم...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>تفعيل الكود وفتح المنصة لمدة 365 يوماً</span>
              </>
            )}
          </button>
        </form>

        <p className="text-[11px] text-slate-500 mt-4">
          للحصول على كود تفعيل، يرجى التواصل مع موزع المنصة المعتمد أو إدارة المنصة.
        </p>
        </div>
      </div>
    </div>
  );
};
