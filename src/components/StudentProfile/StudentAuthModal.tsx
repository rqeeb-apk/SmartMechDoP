import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, User, Key, CheckCircle2, AlertTriangle, Sparkles, Cpu, BookOpen, GraduationCap, X } from 'lucide-react';
import { UserProfile } from '../../types';
import { updateUserProfile, OFFICIAL_LOGO_URL } from '../../services/storage';

interface StudentAuthModalProps {
  isOpen: boolean;
  onSuccess: (updatedUser: UserProfile) => void;
  onClose?: () => void;
  allowClose?: boolean;
}

export const StudentAuthModal: React.FC<StudentAuthModalProps> = ({
  isOpen,
  onSuccess,
  onClose,
  allowClose = false,
}) => {
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');

  // Form states
  const [name, setName] = useState('');
  const [university, setUniversity] = useState('');
  const [level, setLevel] = useState('المستوى الثالث');
  const [specialization, setSpecialization] = useState('هندسة الميكاترونكس والنظم المدمجة');
  const [password, setPassword] = useState('');
  const [activationCode, setActivationCode] = useState('');

  // Login form state
  const [loginNameOrCode, setLoginNameOrCode] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!name.trim() || !university.trim() || !password.trim()) {
      setError('يرجى كتابة الاسم الكامل، اسم الجامعة، وكلمة المرور.');
      return;
    }

    setLoading(true);

    try {
      const now = new Date();
      const nowIso = now.toISOString();
      const trialExpiresIso = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
      const generatedEmail = `student_${Date.now()}@mechatronics.dr-smart.edu`;

      let subData: any = {
        status: 'trial',
        trialStartedAt: nowIso,
        trialExpiresAt: trialExpiresIso,
        priceYER: 4000,
        durationDays: 365,
      };

      // If student provided an activation code during registration
      if (activationCode.trim()) {
        const res = await fetch('/api/subscriptions/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: activationCode.trim().toUpperCase(),
            studentName: name.trim(),
            studentEmail: generatedEmail,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'كود التفعيل الذي أدخلته غير صحيح أو تم استخدامه سابقاً.');
        }
        subData = data.subscription;
      }

      const newUser: UserProfile = {
        id: `usr_${Date.now()}`,
        name: name.trim(),
        email: generatedEmail,
        university: university.trim(),
        role: 'student',
        specialization: specialization.trim(),
        level: level.trim(),
        points: 500,
        completedQuizzesCount: 0,
        savedExperimentsCount: 0,
        createdProjectsCount: 0,
        certificates: [],
        createdAt: nowIso,
        subscription: subData,
      };

      const savedUser = updateUserProfile(newUser);
      setSuccessMsg(
        subData.status === 'active'
          ? '🎉 تم إنشاء حسابك وتفعيل الاشتراك السنوي الشامل (365 يوماً) بنجاح!'
          : '🎉 تم إنشاء حسابك ومنحك تجربة مجانية كاملة لمدة 24 ساعة!'
      );

      setTimeout(() => {
        onSuccess(savedUser);
        if (onClose) onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تفعيل الكود وإنشاء الحساب.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loginNameOrCode.trim() || !loginPassword.trim()) {
      setError('يرجى إدخال اسم الطالب أو كود التفعيل وكلمة المرور.');
      return;
    }

    setLoading(true);

    try {
      const currentStored = localStorage.getItem('dr_smart_user');
      let userObj: UserProfile | null = currentStored ? JSON.parse(currentStored) : null;

      if (!userObj || (userObj.name.toLowerCase() !== loginNameOrCode.trim().toLowerCase() && userObj.email !== loginNameOrCode.trim())) {
        if (activationCode.trim()) {
          const res = await fetch('/api/subscriptions/redeem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: activationCode.trim().toUpperCase(),
              studentName: loginNameOrCode.trim(),
              studentEmail: `student_${Date.now()}@mechatronics.dr-smart.edu`,
            }),
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'كود التفعيل المدخل غير صحيح.');
          }

          userObj = {
            id: `usr_${Date.now()}`,
            name: loginNameOrCode.trim(),
            email: `student_${Date.now()}@mechatronics.dr-smart.edu`,
            role: 'student',
            specialization: 'هندسة الميكاترونكس',
            level: 'المستوى الثالث',
            points: 300,
            completedQuizzesCount: 0,
            savedExperimentsCount: 0,
            createdProjectsCount: 0,
            certificates: [],
            subscription: data.subscription,
          };
        } else if (userObj) {
          // Continue with existing user
        } else {
          throw new Error('يرجى التأكد من اسم الحساب أو إدخال كود التفعيل.');
        }
      }

      const savedUser = updateUserProfile(userObj);
      onSuccess(savedUser);
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'بيانات الدخول غير صحيحة أو تتطلب كود تفعيل.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={() => { if (allowClose && onClose) onClose(); }}
    >
      <div className="min-h-full w-full flex items-center justify-center p-3 sm:p-6 text-center">
        <div 
          className="relative w-full max-w-lg bg-[#0F213E] border border-amber-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl text-slate-100 text-right overflow-hidden my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Ambient Glow Effects */}
          <div className="absolute -top-24 -left-24 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button when allowed */}
          {allowClose && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-full transition-colors z-20"
              title="إغلاق"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {/* Modal Header */}
          <div className="flex items-center gap-3.5 mb-5 border-b border-amber-500/20 pb-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl p-0.5 bg-gradient-to-tr from-amber-400 via-cyan-400 to-amber-500 shadow-md shrink-0">
              <img src={OFFICIAL_LOGO_URL} alt="Logo" className="w-full h-full object-cover rounded-xl" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0" />
                <h2 className="text-base sm:text-lg font-bold text-white truncate">بوابة دخول المنصة التعليمية للطلاب</h2>
              </div>
              <p className="text-[11px] sm:text-xs text-amber-300/90 font-medium mt-0.5 leading-snug">
                منصة دكتور الميكاترونكس الذكي · تجربة مجانية 24 ساعة أو تفعيل كود الاشتراك السنوي
              </p>
            </div>
          </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 mb-6 text-xs font-bold">
          <button
            onClick={() => {
              setAuthMode('signup');
              setError(null);
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all ${
              authMode === 'signup'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            إنشاء حساب طالب جديد
          </button>
          <button
            onClick={() => {
              setAuthMode('login');
              setError(null);
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all ${
              authMode === 'login'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            تسجيل دخول طالب
          </button>
        </div>

        {/* Banners & Messages */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3 font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Signup Form */}
        {authMode === 'signup' ? (
          <form onSubmit={handleSignUpSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">اسم الطالب الكامل</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="text"
                    placeholder="أدخل الاسم الكامل"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">اسم الجامعة / الكلية</label>
                <div className="relative">
                  <BookOpen className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="text"
                    placeholder="أدخل اسم الجامعة"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    required
                    className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">المستوى الدراسي</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="المستوى الأول">المستوى الأول (السنة الأولى)</option>
                  <option value="المستوى الثاني">المستوى الثاني (السنة الثانية)</option>
                  <option value="المستوى الثالث">المستوى الثالث (السنة الثالثة)</option>
                  <option value="المستوى الرابع">المستوى الرابع (السنة الرابعة)</option>
                  <option value="المستوى الخامس">المستوى الخامس (مشروع التخرج)</option>
                  <option value="مهندس خريج">مهندس خريج / دراسات عليا</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">التخصص الدراسي</label>
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="أدخل التخصص"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">كلمة المرور</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="password"
                  placeholder="أدخل كلمة المرور الخاصة بك"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Optional Activation Code Input */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 space-y-2">
              <label className="text-xs font-extrabold text-amber-300 flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span>كود التفعيل السنوي (اختياري - يمنحك 365 يوماً فورا)</span>
              </label>
              <input
                type="text"
                placeholder="أدخل كود التفعيل الخاص بك إن وجد"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-amber-500/50 text-amber-300 font-mono font-bold text-sm tracking-wider placeholder-slate-600 focus:outline-none focus:border-amber-400"
              />
              <p className="text-[11px] text-slate-400">
                ملاحظة: في حال عدم إدخال كود التفعيل، ستحصل تلقائياً على تجربة مجانية لمدة 24 ساعة.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-xl shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>جاري إنشاء الحساب...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>إنشاء حساب البدء بالتجربة المجانية</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* Login Form */
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">اسم الطالب أو كود التفعيل</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="text"
                  placeholder="أدخل الاسم الكامل أو كود التفعيل"
                  value={loginNameOrCode}
                  onChange={(e) => setLoginNameOrCode(e.target.value)}
                  required
                  className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">كلمة المرور</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="password"
                  placeholder="أدخل كلمة المرور"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>كود التفعيل السنوي:</span>
              </label>
              <input
                type="text"
                placeholder="أدخل كود التفعيل الخاص بك"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-amber-300 font-mono text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-xl shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              {loading ? 'جاري التحقق من بيانات الدخول...' : 'تسجيل الدخول للمنصة'}
            </button>
          </form>
        )}

        {/* Dismiss / Continue with Free Trial Button */}
        {allowClose && onClose && (
          <div className="mt-4 pt-3 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-amber-400 text-xs font-semibold underline underline-offset-4 transition-colors"
            >
              تخطي والاستمرار بالتجربة المجانية (24 ساعة) دون تسجيل ✕
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
