import React, { useState, useRef } from 'react';
import {
  Lock, User, Phone, Building2, GraduationCap, Key, CheckCircle2,
  AlertTriangle, MessageCircle, X, ShieldCheck, Clock
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
  const [trialLoading, setTrialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Stealth 20-click counter on logo for owner portal access
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

  // Package options for pricing
  const PACKAGE_OPTIONS = [
    { label: 'الترم الأول (6000 ريال)', packageName: 'الترم الأول', price: '6000 ريال يمني' },
    { label: 'الترم الثاني (6000 ريال)', packageName: 'الترم الثاني', price: '6000 ريال يمني' },
    { label: 'الاشتراك السنوي (10000 ريال)', packageName: 'الاشتراك السنوي', price: '10000 ريال يمني' },
  ];
  const [selectedPkgIndex, setSelectedPkgIndex] = useState(2);
  const selectedPkg = PACKAGE_OPTIONS[selectedPkgIndex];

  // Feature 1: Build WhatsApp message dynamically from student fields and selected package
  const whatsappMessage = [
    'أريد الإشتراك في منصة دكتور الميكاترونكس الذكي',
    `الاسم: ${fullName.trim() || 'غير محدد'}`,
    `الرقم: ${phone.trim() || 'غير محدد'}`,
    `الجامعة: ${university.trim() || 'غير محدد'}`,
    `المستوى: ${level}`,
    `الباقة المطلوبة: ${selectedPkg.packageName} - السعر: ${selectedPkg.price}`,
  ].join('\n');

  const whatsappUrl = `https://wa.me/967785500075?text=${encodeURIComponent(whatsappMessage)}`;

  const handleWhatsAppClick = () => {
    setError(null);
    setShowActivationFields(true);
  };

  // Feature 2: 24-Hour Free Trial (without code)
  const handleFreeTrialSignUp = async () => {
    setError(null);
    setSuccessMsg(null);

    if (!fullName.trim() || !phone.trim() || !password.trim()) {
      setError('يرجى تعبئة الاسم الكامل، رقم الهاتف، وكلمة المرور للبدء بالتجربة المجانية.');
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

    setTrialLoading(true);
    const syntheticEmail = `${cleanPhone}@yma.app`;

    try {
      // 1. Create Supabase Auth account using synthetic email phone@yma.app
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
      const now = new Date();
      const nowIso = now.toISOString();
      // 4. Calculate trial_ends_at = current time + 24 hours
      const trialEndsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

      // 2 & 3. Insert row into `profiles` with is_subscribed = false and trial_ends_at
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: userId,
          full_name: fullName.trim(),
          phone: cleanPhone,
          university: university.trim(),
          level,
          is_subscribed: false,
          trial_ends_at: trialEndsAt,
        },
        { onConflict: 'id' }
      );

      if (profileError) {
        await supabase.auth.signOut();
        throw new Error(`تعذر حفظ بيانات التجربة المجانية: ${profileError.message}`);
      }

      const trialUser: UserProfile = {
        id: userId,
        name: fullName.trim(),
        email: syntheticEmail,
        phone: cleanPhone,
        university: university.trim(),
        role: 'student',
        specialization: 'هندسة الميكاترونكس والنظم المدمجة',
        level,
        isSubscribed: false,
        points: 300,
        completedQuizzesCount: 0,
        savedExperimentsCount: 0,
        createdProjectsCount: 0,
        certificates: [],
        createdAt: nowIso,
        subscription: {
          status: 'trial',
          trialStartedAt: nowIso,
          trialExpiresAt: trialEndsAt,
          priceYER: 4000,
          durationDays: 365,
        },
      };

      const savedUser = updateUserProfile(trialUser);
      setSuccessMsg('🎉 تم تفعيل التجربة المجانية لمدة 24 ساعة بنجاح! جاري نقلك للمنصة...');

      setTimeout(() => {
        onSuccess(savedUser);
        if (onClose) onClose();
      }, 500);
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء تفعيل التجربة المجانية.');
    } finally {
      setTrialLoading(false);
    }
  };

  // Sign Up with Activation Code
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

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

      const { data: redeemResult, error: rpcError } = await supabase.rpc('redeem_code', {
        user_id: userId,
        input_code: cleanCode,
      });

      const isCodeValid = !rpcError && redeemResult === true;

      if (!isCodeValid) {
        await supabase.auth.signOut();
        setError('عذراً، كود التفعيل غير صحيح أو مستخدم مسبقاً. يرجى التواصل مع الدعم عبر الواتساب.');
        return;
      }

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
      }, 500);
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء تفعيل الكود وإنشاء الحساب.');
    } finally {
      setLoading(false);
    }
  };

  // Login Handler (supports Subscribed, Active Trial, and Expired Trial)
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

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error('لم يتم العثور على بيانات الملف الشخصي لهذا الحساب.');
      }

      const isSubscribed = profile.is_subscribed === true;
      const trialEndsAt = profile.trial_ends_at || undefined;
      const isTrialStillActive =
        !isSubscribed && trialEndsAt && new Date(trialEndsAt).getTime() > Date.now();

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
        isSubscribed,
        points: 500,
        completedQuizzesCount: 0,
        savedExperimentsCount: 0,
        createdProjectsCount: 0,
        certificates: [],
        createdAt: profile.created_at || nowIso,
        subscription: isSubscribed
          ? {
              status: 'active',
              activatedAt: nowIso,
              expiresAt: expiresDate.toISOString(),
              priceYER: 4000,
              durationDays: 365,
            }
          : {
              status: isTrialStillActive ? 'trial' : 'trial_expired',
              trialExpiresAt: trialEndsAt,
              priceYER: 4000,
              durationDays: 365,
            },
      };

      const savedUser = updateUserProfile(userObj);
      setSuccessMsg('✅ تم تسجيل الدخول بنجاح!');
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
                اشترك بكود التفعيل السنوي أو ابدأ تجربة مجانية لمدة 24 ساعة
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

          {/* SIGN UP FORM */}
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

              {/* الباقة المطلوبة */}
              <div>
                <label className="block text-[#0F172A] dark:text-slate-200 font-bold mb-1">
                  الباقة المطلوبة
                </label>
                <select
                  value={selectedPkgIndex}
                  onChange={(e) => setSelectedPkgIndex(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-[#0F172A] dark:text-white focus:border-[#0EA5E9] dark:focus:border-amber-400 focus:outline-none font-bold text-amber-600 dark:text-amber-400"
                >
                  {PACKAGE_OPTIONS.map((opt, idx) => (
                    <option key={idx} value={idx}>
                      {opt.label}
                    </option>
                  ))}
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

              {/* 6. زر أخضر كبير: طلب كود التفعيل عبر واتساب + زر التجربة المجانية 24 ساعة */}
              <div className="pt-1 space-y-2.5">
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

                <button
                  type="button"
                  onClick={handleFreeTrialSignUp}
                  disabled={trialLoading || loading}
                  className="w-full py-3 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 border border-amber-400/70 dark:border-amber-400/50 text-amber-900 dark:text-amber-300 font-extrabold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Clock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    {trialLoading
                      ? 'جاري تجهيز التجربة المجانية...'
                      : 'تجربة مجانية لمدة 24 ساعة (بدون كود)'}
                  </span>
                </button>
              </div>

              {/* 7 & 8. Hidden initially until WhatsApp button is clicked */}
              {showActivationFields && (
                <div className="space-y-3.5 pt-2 animate-fade-in">
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

                  <button
                    type="submit"
                    disabled={loading || trialLoading}
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
