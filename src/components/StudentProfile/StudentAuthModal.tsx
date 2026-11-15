import React, { useState, useRef } from 'react';
import {
  Lock, User, Phone, Building2, GraduationCap, Key, CheckCircle2,
  AlertTriangle, MessageCircle, X, ShieldCheck
} from 'lucide-react';
import { UserProfile } from '../../types';
import { updateUserProfile, OFFICIAL_LOGO_URL } from '../../services/storage';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';

interface StudentAuthModalProps {
  isOpen: boolean;
  onSuccess: (updatedUser: UserProfile) => void;
  onClose?: () => void;
  allowClose?: boolean;
  onOpenOwnerPortal?: () => void;
}

const normalizePhoneDigits = (raw: string): string => {
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  return raw
    .split('')
    .map((ch) => {
      const arIdx = arabicDigits.indexOf(ch);
      if (arIdx !== -1) return String(arIdx);
      const faIdx = persianDigits.indexOf(ch);
      if (faIdx !== -1) return String(faIdx);
      return ch;
    })
    .join('')
    .replace(/[^\d]/g, '');
};

export const StudentAuthModal: React.FC<StudentAuthModalProps> = ({
  isOpen,
  onSuccess,
  onClose,
  allowClose = false,
  onOpenOwnerPortal,
}) => {
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('login');

  // Sign Up states (exact requested order)
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [university, setUniversity] = useState('');
  const [level, setLevel] = useState('السنة الأولى');
  const [password, setPassword] = useState('');
  const [showActivationFields, setShowActivationFields] = useState(false);
  const [activationCode, setActivationCode] = useState('');

  // Login states
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Stealth 20-click counter on logo for owner portal access even behind auth wall
  const [logoClicks, setLogoClicks] = useState(0);
  const clickTimerRef = useRef<any>(null);

  if (!isOpen) return null;

  const handleStealthLogoClick = () => {
    if (!onOpenOwnerPortal) return;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    const next = logoClicks + 1;
    setLogoClicks(next);
    if (next >= 20) {
      setLogoClicks(0);
      onOpenOwnerPortal();
      return;
    }
    clickTimerRef.current = setTimeout(() => setLogoClicks(0), 3000);
  };

  // Build WhatsApp URL with exact requested format
  const studentDisplayName = fullName.trim().replace(/\s+/g, '_') || 'طالب';
  const whatsappText = encodeURIComponent(
    `السلام_عليكم_أريد_كود_تفعيل_في_المنصة_اسمي_${studentDisplayName}`
  );
  const whatsappUrl = `https://wa.me/967785500075?text=${whatsappText}`;

  const handleWhatsAppClick = () => {
    setError(null);
    setShowActivationFields(true);
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // 1. Ensure all fields are filled
    if (
      !fullName.trim() ||
      !phone.trim() ||
      !university.trim() ||
      !level.trim() ||
      !password.trim() ||
      !activationCode.trim()
    ) {
      setError('يرجى تعبئة جميع الحقول المطلوبة (الاسم، الهاتف، الجامعة، المستوى، كلمة المرور، وكود التفعيل).');
      return;
    }

    const cleanPhone = normalizePhoneDigits(phone);
    if (cleanPhone.length < 6) {
      setError('يرجى إدخال رقم هاتف صحيح (أرقام فقط).');
      return;
    }

    if (password.trim().length < 6) {
      setError('يجب أن تتكون كلمة المرور من 6 أحرف أو أرقام على الأقل.');
      return;
    }

    if (!supabase || !isSupabaseConfigured) {
      setError('لم يتم إعداد مفاتيح الربط مع Supabase (VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY).');
      return;
    }

    setLoading(true);
    const syntheticEmail = `${cleanPhone}@yma.app`;
    const cleanCode = activationCode.trim();

    try {
      // 2. Create account in Supabase Auth using synthetic email phone@yma.app
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: syntheticEmail,
        password: password.trim(),
      });

      if (signUpError) {
        const msg = signUpError.message || '';
        if (msg.toLowerCase().includes('already registered')) {
          throw new Error('رقم الهاتف هذا مسجل مسبقاً. يرجى استخدام تبويب "تسجيل الدخول".');
        }
        throw new Error(msg || 'تعذر إنشاء الحساب في نظام المصادقة.');
      }

      if (!authData.user?.id) {
        throw new Error('تعذر إنشاء معرف المستخدم في Supabase Auth.');
      }

      const userId = authData.user.id;

      // 3. Call Supabase RPC function `redeem_code(user_id, input_code)`
      const { data: redeemResult, error: rpcError } = await supabase.rpc('redeem_code', {
        user_id: userId,
        input_code: cleanCode,
      });

      const isCodeValid = !rpcError && redeemResult === true;

      if (!isCodeValid) {
        // 5. Invalid/used code -> immediately sign out so no dangling session/data remains
        await supabase.auth.signOut();
        setError('عذراً، كود التفعيل غير صحيح أو مستخدم مسبقاً. يرجى التواصل مع الدعم عبر الواتساب.');
        return;
      }

      // 4. Code redeemed === true -> save profile row with is_subscribed = true
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: userId,
            full_name: fullName.trim(),
            phone: cleanPhone,
            university: university.trim(),
            level,
            is_subscribed: true,
          },
          { onConflict: 'id' }
        );

      if (profileError) {
        await supabase.auth.signOut();
        throw new Error(`تم التحقق من الكود ولكن تعذر حفظ بيانات الملف الشخصي: ${profileError.message}`);
      }

      const now = new Date();
      const nowIso = now.toISOString();
      const expiresDate = new Date();
      expiresDate.setDate(expiresDate.getDate() + 365);

      const newUser: UserProfile = {
        id: userId,
        name: fullName.trim(),
        email: syntheticEmail,
        phone: cleanPhone,
        university: university.trim(),
        role: 'student',
        specialization: 'هندسة الميكاترونكس والنظم المدمجة',
        level,
        isSubscribed: true,
        points: 500,
        completedQuizzesCount: 0,
        savedExperimentsCount: 0,
        createdProjectsCount: 0,
        certificates: [],
        createdAt: nowIso,
        subscription: {
          status: 'active',
          codeUsed: cleanCode,
          activatedAt: nowIso,
          expiresAt: expiresDate.toISOString(),
          priceYER: 4000,
          durationDays: 365,
        },
      };

      const savedUser = updateUserProfile(newUser);
      setSuccessMsg('🎉 تم تفعيل كود الاشتراك وإنشاء حسابك بنجاح! جاري نقلك للمنصة...');

      setTimeout(() => {
        onSuccess(savedUser);
        if (onClose) onClose();
      }, 600);
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء تفعيل الكود وإنشاء الحساب.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!loginPhone.trim() || !loginPassword.trim()) {
      setError('يرجى إدخال رقم الهاتف وكلمة المرور.');
      return;
    }

    if (!supabase || !isSupabaseConfigured) {
      setError('لم يتم إعداد مفاتيح الربط مع Supabase (VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY).');
      return;
    }

    setLoading(true);
    const trimmedInput = loginPhone.trim();
    const loginEmail = trimmedInput.includes('@')
      ? trimmedInput
      : `${normalizePhoneDigits(trimmedInput)}@yma.app`;

    if (!trimmedInput.includes('@') && normalizePhoneDigits(trimmedInput).length < 6) {
      setError('يرجى إدخال رقم هاتف صحيح.');
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword.trim(),
      });

      if (signInError || !authData.user) {
        throw new Error('رقم الهاتف أو كلمة المرور غير صحيحة.');
      }

      // Check is_subscribed in `profiles` table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile || profile.is_subscribed !== true) {
        await supabase.auth.signOut();
        throw new Error('عذراً، هذا الحساب غير مشترك أو غير مفعل. يرجى التواصل مع الدعم عبر الواتساب.');
      }

      const nowIso = new Date().toISOString();
      const expiresDate = new Date();
      expiresDate.setDate(expiresDate.getDate() + 365);

      const userObj: UserProfile = {
        id: authData.user.id,
        name: profile.full_name || 'طالب ميكاترونكس',
        email: authData.user.email || loginEmail,
        phone: profile.phone || normalizePhoneDigits(trimmedInput),
        university: profile.university || '',
        role: 'student',
        specialization: 'هندسة الميكاترونكس والنظم المدمجة',
        level: profile.level || 'السنة الأولى',
        isSubscribed: true,
        points: 500,
        completedQuizzesCount: 0,
        savedExperimentsCount: 0,
        createdProjectsCount: 0,
        certificates: [],
        createdAt: profile.created_at || nowIso,
        subscription: {
          status: 'active',
          activatedAt: nowIso,
          expiresAt: expiresDate.toISOString(),
          priceYER: 4000,
          durationDays: 365,
        },
      };

      const savedUser = updateUserProfile(userObj);
      setSuccessMsg('✅ تم تسجيل الدخول بنجاح! مرحباً بك في منصة دكتور الميكاترونكس الذكي.');
      onSuccess(savedUser);
      if (onClose) onClose();
    } catch (err: any) {
      setError(err?.message || 'تعذر تسجيل الدخول، يرجى المحاولة مجدداً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-slate-900/75 dark:bg-black/90 backdrop-blur-md animate-fade-in"
      onClick={() => {
        if (allowClose && onClose) onClose();
      }}
    >
      <div className="min-h-full w-full flex items-center justify-center p-3 sm:p-6 text-center">
        <div
          className="relative w-full max-w-lg champagne-card dark:bg-[#0F213E] rounded-3xl p-5 sm:p-7 shadow-2xl text-[#0F172A] dark:text-slate-100 text-right overflow-hidden my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ambient Glow Effects */}
          <div className="hidden dark:block absolute -top-24 -left-24 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="hidden dark:block absolute -bottom-24 -right-24 w-56 h-56 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button when allowed */}
          {allowClose && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 left-4 p-2 text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white bg-white dark:bg-slate-800/80 border border-[rgba(212,175,55,0.3)] dark:border-transparent hover:bg-[#F8FAFC] dark:hover:bg-slate-700 rounded-full transition-colors z-20"
              title="إغلاق"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {/* Modal Header */}
          <div className="flex items-center gap-3.5 mb-5 border-b border-[rgba(212,175,55,0.25)] dark:border-amber-500/20 pb-4">
            <button
              type="button"
              onClick={handleStealthLogoClick}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl p-0.5 bg-gradient-to-tr from-[#0EA5E9] via-amber-400 to-[#0284C7] shadow-md shrink-0 focus:outline-none"
              title="دكتور الميكاترونكس الذكي"
            >
              <img src={OFFICIAL_LOGO_URL} alt="Logo" className="w-full h-full object-cover rounded-xl" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-[#0EA5E9] dark:text-amber-400 shrink-0" />
                <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-white truncate">
                  بوابة دخول منصة الدكتور الذكي
                </h2>
              </div>
              <p className="text-[11px] sm:text-xs text-[#475569] dark:text-amber-300/90 font-medium mt-0.5 leading-snug">
                الدخول مخصص للمشتركين فقط · يتطلب تفعيل الحساب بكود اشتراك ساري
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900/90 p-1.5 rounded-2xl border border-[rgba(212,175,55,0.3)] dark:border-slate-800 mb-6 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2.5 rounded-xl transition-all ${
                authMode === 'login'
                  ? 'bg-[#0EA5E9] text-white dark:bg-gradient-to-r dark:from-amber-500 dark:to-amber-600 dark:text-slate-950 font-extrabold shadow-sm'
                  : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2.5 rounded-xl transition-all ${
                authMode === 'signup'
                  ? 'bg-[#0EA5E9] text-white dark:bg-gradient-to-r dark:from-amber-500 dark:to-amber-600 dark:text-slate-950 font-extrabold shadow-sm'
                  : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              إنشاء حساب
            </button>
          </div>

          {/* Error & Success Banners */}
          {error && (
            <div className="mb-5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/15 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-3 font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* SIGN UP FORM (Exact ordered fields 1 -> 8) */}
          {authMode === 'signup' ? (
            <form onSubmit={handleSignUpSubmit} className="space-y-3.5 text-xs">
              {/* 1. الاسم الكامل */}
              <div>
                <label className="block text-[#0F172A] dark:text-slate-200 font-bold mb-1">
                  1. الاسم الكامل
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#64748B] dark:text-slate-400 absolute right-3 top-3" />
                  <input
                    type="text"
                    placeholder="أدخل اسمك الكامل"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] focus:border-[#0EA5E9] dark:focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* 2. رقم الهاتف */}
              <div>
                <label className="block text-[#0F172A] dark:text-slate-200 font-bold mb-1">
                  2. رقم الهاتف
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#64748B] dark:text-slate-400 absolute right-3 top-3" />
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="مثال: 777123456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] focus:border-[#0EA5E9] dark:focus:border-amber-400 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* 3. الجامعة */}
              <div>
                <label className="block text-[#0F172A] dark:text-slate-200 font-bold mb-1">
                  3. الجامعة
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-[#64748B] dark:text-slate-400 absolute right-3 top-3" />
                  <input
                    type="text"
                    placeholder="أدخل اسم الجامعة"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    required
                    className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] focus:border-[#0EA5E9] dark:focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* 4. المستوى الدراسي */}
              <div>
                <label className="block text-[#0F172A] dark:text-slate-200 font-bold mb-1">
                  4. المستوى الدراسي
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-[#0F172A] dark:text-white focus:border-[#0EA5E9] dark:focus:border-amber-400 focus:outline-none"
                >
                  <option value="السنة الأولى">السنة الأولى</option>
                  <option value="السنة الثانية">السنة الثانية</option>
                  <option value="السنة الثالثة">السنة الثالثة</option>
                  <option value="السنة الرابعة">السنة الرابعة</option>
                  <option value="السنة الخامسة">السنة الخامسة</option>
                </select>
              </div>

              {/* 5. كلمة المرور */}
              <div>
                <label className="block text-[#0F172A] dark:text-slate-200 font-bold mb-1">
                  5. كلمة المرور
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64748B] dark:text-slate-400 absolute right-3 top-3" />
                  <input
                    type="password"
                    placeholder="أدخل كلمة المرور (6 أحرف على الأقل)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] focus:border-[#0EA5E9] dark:focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* 6. زر أخضر كبير: طلب كود التفعيل عبر واتساب */}
              <div className="pt-1">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleWhatsAppClick}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2.5 no-underline"
                >
                  <MessageCircle className="w-5 h-5 shrink-0" />
                  <span>طلب كود التفعيل عبر واتساب</span>
                </a>
              </div>

              {/* 7 & 8. Hidden initially until WhatsApp button is clicked */}
              {showActivationFields && (
                <div className="space-y-3.5 pt-2 animate-fade-in">
                  {/* 7. حقل إدخال كود التفعيل */}
                  <div className="p-4 rounded-2xl bg-[#E0F2FE]/70 dark:bg-amber-500/10 border border-[#0EA5E9]/35 dark:border-amber-500/40 space-y-2">
                    <label className="text-xs font-extrabold text-[#0284C7] dark:text-amber-300 flex items-center gap-2">
                      <Key className="w-4 h-4 text-[#0EA5E9] dark:text-amber-400" />
                      <span>أدخل كود التفعيل</span>
                    </label>
                    <input
                      type="text"
                      placeholder="أدخل كود التفعيل الذي حصلت عليه"
                      value={activationCode}
                      onChange={(e) => setActivationCode(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.45)] dark:border-amber-500/50 text-[#0F172A] dark:text-amber-300 font-mono font-bold text-sm tracking-wider placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0EA5E9] dark:focus:border-amber-400 text-center"
                    />
                  </div>

                  {/* 8. زر تفعيل وإنشاء الحساب */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-gradient-to-r dark:from-amber-500 dark:to-amber-600 text-white dark:text-slate-950 font-extrabold text-sm shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    <span>{loading ? 'جاري التحقق وتفعيل الحساب...' : 'تفعيل وإنشاء الحساب'}</span>
                  </button>
                </div>
              )}
            </form>
          ) : (
            /* LOGIN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#0F172A] dark:text-slate-200 font-bold mb-1">رقم الهاتف</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#64748B] dark:text-slate-400 absolute right-3 top-3" />
                  <input
                    type="text"
                    placeholder="أدخل رقم الهاتف المسجل"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    required
                    className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] focus:border-[#0EA5E9] dark:focus:border-amber-400 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#0F172A] dark:text-slate-200 font-bold mb-1">كلمة المرور</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64748B] dark:text-slate-400 absolute right-3 top-3" />
                  <input
                    type="password"
                    placeholder="أدخل كلمة المرور"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] focus:border-[#0EA5E9] dark:focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-gradient-to-r dark:from-amber-500 dark:to-amber-600 text-white dark:text-slate-950 font-extrabold text-sm shadow-md transition-all disabled:opacity-50"
              >
                {loading ? 'جاري التحقق من الاشتراك...' : 'تسجيل الدخول للمنصة'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
