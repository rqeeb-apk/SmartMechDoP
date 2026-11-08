import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Mail, KeyRound, AlertTriangle, CheckCircle2, X, RefreshCw, Cpu } from 'lucide-react';
import { OFFICIAL_LOGO_URL } from '../../services/storage';

interface OwnerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
}

export const OwnerLoginModal: React.FC<OwnerLoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('admin@dr-smart.edu');
  const [password, setPassword] = useState('Admin#Smart2026!');
  const [pin, setPin] = useState('9876');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [lockedSec, setLockedSec] = useState<number | null>(null);

  useEffect(() => {
    let interval: any = null;
    if (lockedSec && lockedSec > 0) {
      interval = setInterval(() => {
        setLockedSec((prev) => (prev && prev > 1 ? prev - 1 : null));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockedSec]);

  if (!isOpen) return null;

  const handleNextStage = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (stage === 1) {
      if (!email.includes('@')) {
        setError('يرجى إدخال بريد إلكتروني صحيح لمالك المنصة');
        return;
      }
      setStage(2);
    } else if (stage === 2) {
      if (!password || password.length < 6) {
        setError('كلمة المرور يجب ألا تقل عن 6 أحرف');
        return;
      }
      setStage(3);
    } else if (stage === 3) {
      handleSubmitFinal();
    }
  };

  const handleSubmitFinal = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/owner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, pin }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.locked) {
          setLockedSec(data.remainingSec || 900);
        }
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
        }
        throw new Error(data.error || 'فشلت عملية المصادقة');
      }

      // Save token and invoke success
      localStorage.setItem('owner_token', data.token);
      onSuccess(data.token);
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في خادم المصادقة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0F213E] border border-amber-500/40 rounded-3xl p-6 lg:p-8 shadow-2xl text-slate-100 overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white bg-slate-800/60 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-3 mb-6 border-b border-amber-500/20 pb-4">
          <div className="w-12 h-12 rounded-2xl p-0.5 bg-gradient-to-tr from-amber-400 via-cyan-400 to-amber-500 shadow-md">
            <img src={OFFICIAL_LOGO_URL} alt="Logo" className="w-full h-full object-cover rounded-xl" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-bold text-white">مصادقة مالك المنصة (3-Stage Auth)</h3>
            </div>
            <p className="text-xs text-amber-300/80 font-mono">
              تفعيل النظام عبر 20 نقرة متتالية على الشعار
            </p>
          </div>
        </div>

        {/* Progress Tracker Steps */}
        <div className="flex items-center justify-between mb-6 px-2">
          {[
            { step: 1, label: 'البريد', icon: Mail },
            { step: 2, label: 'كلمة المرور', icon: Lock },
            { step: 3, label: 'الرمز السري PIN', icon: KeyRound },
          ].map((s) => {
            const Icon = s.icon;
            const isDone = stage > s.step;
            const isCurrent = stage === s.step;
            return (
              <div key={s.step} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isDone
                      ? 'bg-emerald-500 text-slate-950 font-mono'
                      : isCurrent
                      ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : s.step}
                </div>
                <span className={`text-xs font-semibold ${isCurrent ? 'text-amber-300' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Error / Lockout Banners */}
        {lockedSec ? (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-1">تم حظر الوصول المؤقت (Brute-Force Protection)</span>
              <span>
                تجاوزت الحد المسموح به من المحاولات الفاشلة. المتبقي حتى رفع الحظر:{' '}
                <strong className="font-mono text-white">
                  {Math.floor(lockedSec / 60)} دقيقة و {lockedSec % 60} ثانية
                </strong>
              </span>
            </div>
          </div>
        ) : null}

        {error && !lockedSec ? (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            {remainingAttempts !== null && (
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-200 font-mono text-[10px]">
                محاولات: {remainingAttempts}/5
              </span>
            )}
          </div>
        ) : null}

        {/* Form Stages */}
        <form onSubmit={handleNextStage} className="space-y-4">
          {stage === 1 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400" />
                <span>المرحلة 1: البريد الإلكتروني للمالك الرئيسي</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@dr-smart.edu"
                disabled={!!lockedSec}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono text-sm"
              />
              <p className="text-[11px] text-slate-400">
                البريد الافتراضي للنظام: <code className="text-amber-300 font-mono">admin@dr-smart.edu</code>
              </p>
            </div>
          )}

          {stage === 2 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>المرحلة 2: كلمة المرور المشفرة</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={!!lockedSec}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono text-sm"
              />
              <p className="text-[11px] text-slate-400">
                كلمة المرور الافتراضية: <code className="text-amber-300 font-mono">Admin#Smart2026!</code>
              </p>
            </div>
          )}

          {stage === 3 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>المرحلة 3: الرمز السري الحصين (Secret 4-Digit PIN)</span>
              </label>
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="9876"
                disabled={!!lockedSec}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-amber-500/50 text-amber-400 text-center font-mono text-2xl tracking-[0.5em] placeholder-slate-600 focus:outline-none focus:border-amber-400"
              />
              <p className="text-[11px] text-slate-400 text-center">
                الرمز السري الافتراضي: <code className="text-amber-300 font-mono">9876</code>
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
            {stage > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStage((s) => (s - 1) as any);
                }}
                disabled={loading || !!lockedSec}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold transition-colors"
              >
                السابق
              </button>
            ) : <div />}

            <button
              type="submit"
              disabled={loading || !!lockedSec}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري التحقق عبر الخادم...</span>
                </>
              ) : stage < 3 ? (
                <span>الانتقال للمرحلة {stage + 1}</span>
              ) : (
                <>
                  <Cpu className="w-4 h-4" />
                  <span>تأكيد ودخول لوحة المالك</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-[10px] text-slate-400 text-center flex items-center justify-center gap-2 font-mono">
          <span>DR. SMART MECHATRONICS</span>
          <span>•</span>
          <span>PROTECTED OWNER CONSOLE v2.5</span>
        </div>
      </div>
    </div>
  );
};
