import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, User, Key, CheckCircle2, AlertTriangle, Sparkles, Cpu, BookOpen, GraduationCap } from 'lucide-react';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [specialization, setSpecialization] = useState('هندسة الميكاترونكس والنظم المدمجة');
  const [level, setLevel] = useState('السنة الثالثة الجامعية');
  const [activationCode, setActivationCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!name.trim() || !email.trim() || !password.trim() || !activationCode.trim()) {
      setError('جميع الحقول مطلوبة، بما في ذلك كود التفعيل السنوي.');
      return;
    }

    setLoading(true);

    try {
      // Validate & Redeem Activation Code via Server API
      const res = await fetch('/api/subscriptions/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: activationCode.trim().toUpperCase(),
          studentName: name.trim(),
          studentEmail: email.trim().toLowerCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'كود التفعيل الذي أدخلته غير صحيح أو تم استخدامه سابقاً.');
      }

      // Code Validated & Activated -> Create Student Profile
      const newUser: UserProfile = {
        id: `usr_${Date.now()}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: 'student',
        specialization: specialization.trim(),
        level: level.trim(),
        points: 500,
        completedQuizzesCount: 0,
        savedExperimentsCount: 0,
        createdProjectsCount: 0,
        certificates: [],
        subscription: data.subscription,
      };

      const savedUser = updateUserProfile(newUser);
      setSuccessMsg('🎉 تم إنشاء حسابك وتفعيل الاشتراك السنوي الشامل بنجاح!');

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

    if (!email.trim() || !password.trim()) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }

    setLoading(true);

    try {
      // Existing User verification check
      const currentStored = localStorage.getItem('dr_smart_user');
      let userObj: UserProfile | null = currentStored ? JSON.parse(currentStored) : null;

      if (!userObj || userObj.email.toLowerCase() !== email.trim().toLowerCase()) {
        // Create student account on login if email provided, but enforce subscription code
        if (!activationCode.trim()) {
          throw new Error('حسابك يتطلب إدخال كود تفعيل سنوي للوصول للمنصة.');
        }

        const res = await fetch('/api/subscriptions/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: activationCode.trim().toUpperCase(),
            studentName: email.split('@')[0],
            studentEmail: email.trim().toLowerCase(),
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'كود التفعيل المدخل غير صحيح.');
        }

        userObj = {
          id: `usr_${Date.now()}`,
          name: email.split('@')[0],
          email: email.trim().toLowerCase(),
          role: 'student',
          specialization: 'هندسة الميكاترونكس',
          level: 'طالب جامعي',
          points: 300,
          completedQuizzesCount: 0,
          savedExperimentsCount: 0,
          createdProjectsCount: 0,
          certificates: [],
          subscription: data.subscription,
        };
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#0F213E] border border-amber-500/40 rounded-3xl p-6 md:p-8 shadow-2xl text-slate-100 overflow-hidden my-8">
        
        {/* Ambient Glow Effects */}
        <div className="absolute -top-24 -left-24 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center gap-4 mb-6 border-b border-amber-500/20 pb-4">
          <div className="w-14 h-14 rounded-2xl p-0.5 bg-gradient-to-tr from-amber-400 via-cyan-400 to-amber-500 shadow-md shrink-0">
            <img src={OFFICIAL_LOGO_URL} alt="Logo" className="w-full h-full object-cover rounded-xl" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-amber-400" />
              <h2 className="text-xl font-bold text-white">بوابة دخول المنصة التعليمية للطلاب</h2>
            </div>
            <p className="text-xs text-amber-300/90 font-medium mt-0.5">
              الدخول والوصول للمنصة مشروط بكود تفعيل سنوي ساري (4000 ريال يمني / 365 يوم)
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
            إنشاء حساب طالب جديد بكود التفعيل
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
                    placeholder="مثال: أحمد عبد الله الشمري"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="email"
                    placeholder="student@mechatronics.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">كلمة المرور</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">التخصص الدراسي</label>
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Mandatory Activation Code Input */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 space-y-2">
              <label className="text-xs font-extrabold text-amber-300 flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span>كود التفعيل السنوي الإجباري (Mandatory Activation Code)</span>
              </label>
              <input
                type="text"
                placeholder="أدخل كودك مثل: DR-248G3C7X"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-amber-500/50 text-amber-300 font-mono font-bold text-sm tracking-wider placeholder-slate-600 focus:outline-none focus:border-amber-400"
              />
              <p className="text-[11px] text-slate-400">
                ملاحظة: لا يمكن إنشاء أي حساب طالب بدون كود تفعيل صادر ومسجل من المالك.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-xl shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>جاري تفعيل الكود وإنشاء الحساب...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>تفعيل كود الاشتراك وإنشاء الحساب</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* Login Form */
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">البريد الإلكتروني للطالب</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="email"
                  placeholder="student@mechatronics.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-amber-400 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">كلمة المرور</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-amber-400 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>كود التفعيل (في حال انتهاء أو تفعيل حساب جديد):</span>
              </label>
              <input
                type="text"
                placeholder="DR-248G3C7X (اختياري عند تسجيل الدخول)"
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
      </div>
    </div>
  );
};
