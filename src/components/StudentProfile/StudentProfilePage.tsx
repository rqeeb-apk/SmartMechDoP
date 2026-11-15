import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { updateUserProfile } from '../../services/storage';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { User, Award, BookOpen, Layers, Cpu, CheckCircle2, Shield, Edit3 } from 'lucide-react';

interface StudentProfilePageProps {
  user: UserProfile;
  setUser: (u: UserProfile) => void;
}

export const StudentProfilePage: React.FC<StudentProfilePageProps> = ({ user, setUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [specialization, setSpecialization] = useState(user.specialization);
  const [level, setLevel] = useState(user.level);
  const [redeemNotice, setRedeemNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = updateUserProfile({ name, specialization, level });
    setUser(updated);
    setIsEditing(false);
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      
      {/* Profile Card */}
      <div className="champagne-card rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-2xl bg-[#0EA5E9] dark:bg-gradient-to-tr dark:from-cyan-500 dark:to-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg border border-white/30 dark:border-cyan-400/40 shrink-0">
            <User className="w-12 h-12" />
          </div>

          <div className="space-y-2 text-center sm:text-right flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white">{user.name}</h1>
                <p className="text-xs text-[#0284C7] dark:text-cyan-400 font-mono mt-0.5">{user.email}</p>
              </div>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-[#0284C7] dark:text-cyan-400 text-xs font-bold hover:bg-[#E0F2FE] dark:hover:bg-slate-800 flex items-center gap-1.5 self-center sm:self-start"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'إلغاء التعديل' : 'تعديل الملف الشخصي'}</span>
              </button>
            </div>

            <p className="text-xs text-[#475569] dark:text-slate-300">
              {user.university ? `${user.university} · ` : ''}{user.level} · {user.specialization}
              {user.phone ? ` · ${user.phone}` : ''}
            </p>
          </div>
        </div>

        {/* Form Edit */}
        {isEditing && (
          <form onSubmit={handleSave} className="p-4 rounded-xl champagne-subcard space-y-4 text-xs pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[#0F172A] dark:text-slate-300 font-semibold mb-1">الاسم الكامل:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-[#0F172A] dark:text-white focus:border-[#0EA5E9] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[#0F172A] dark:text-slate-300 font-semibold mb-1">التخصص:</label>
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-[#0F172A] dark:text-white focus:border-[#0EA5E9] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[#0F172A] dark:text-slate-300 font-semibold mb-1">المستوى الدراسي:</label>
                <input
                  type="text"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-[#0F172A] dark:text-white focus:border-[#0EA5E9] focus:outline-none"
                />
              </div>
            </div>

            <button type="submit" className="px-5 py-2 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-cyan-500 text-white dark:text-black font-bold text-xs">
              حفظ البيانات
            </button>
          </form>
        )}
      </div>

      {/* Progress & Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl champagne-card space-y-1">
          <span className="text-xs text-[#475569] dark:text-slate-400">نقاط الإنجاز</span>
          <div className="text-2xl font-bold font-mono text-[#0EA5E9] dark:text-cyan-400">{user.points} pt</div>
        </div>

        <div className="p-5 rounded-2xl champagne-card space-y-1">
          <span className="text-xs text-[#475569] dark:text-slate-400">الاختبارات المجتازة</span>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{user.completedQuizzesCount}</div>
        </div>

        <div className="p-5 rounded-2xl champagne-card space-y-1">
          <span className="text-xs text-[#475569] dark:text-slate-400">تجارب المختبر المحفوظة</span>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">{user.savedExperimentsCount}</div>
        </div>

        <div className="p-5 rounded-2xl champagne-card space-y-1">
          <span className="text-xs text-[#475569] dark:text-slate-400">المشاريع المنشورة</span>
          <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">{user.createdProjectsCount}</div>
        </div>
      </div>

      {/* Subscription & Code Redemption Card */}
      <div className="champagne-card rounded-2xl p-6 space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-[rgba(212,175,55,0.25)] dark:border-amber-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl sky-icon-box flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F172A] dark:text-white">تفعيل الاشتراك السنوي الشامل (4000 ريال يمني)</h3>
              <p className="text-xs text-[#475569] dark:text-slate-400">أدخل كود الاشتراك الرقمي للحصول على تفعيل لمدة 365 يوماً</p>
            </div>
          </div>

          {user.subscription?.status === 'active' ? (
            <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/40 font-bold text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>الاشتراك السنوي نشط</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-[#E0F2FE] dark:bg-amber-500/20 text-[#0284C7] dark:text-amber-300 border border-[#0EA5E9]/30 dark:border-amber-500/40 font-bold text-xs">
              الحساب الأساسي
            </span>
          )}
        </div>

        {/* Subscription details if active */}
        {user.subscription?.status === 'active' && (
          <div className="p-4 rounded-xl champagne-subcard text-xs space-y-2 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[#475569] dark:text-slate-400 font-sans">كود التفعيل المستخدم:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{user.subscription.codeUsed}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#475569] dark:text-slate-400 font-sans">تاريخ التفعيل:</span>
              <span className="text-[#0284C7] dark:text-cyan-300">{user.subscription.activatedAt ? new Date(user.subscription.activatedAt).toLocaleDateString('ar-EG') : 'اليوم'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#475569] dark:text-slate-400 font-sans">ينتهي الاشتراك في:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{user.subscription.expiresAt ? new Date(user.subscription.expiresAt).toLocaleDateString('ar-EG') : 'بعد 365 يوماً'}</span>
            </div>
          </div>
        )}

        {redeemNotice && (
          <div
            className={`p-3 rounded-xl text-xs font-bold border ${
              redeemNotice.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300'
            }`}
          >
            {redeemNotice.text}
          </div>
        )}

        {/* Redemption Input Form */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setRedeemNotice(null);
            const inputEl = e.currentTarget.elements.namedItem('redemptionCode') as HTMLInputElement;
            const codeVal = inputEl ? inputEl.value.trim() : '';
            if (!codeVal) return;

            if (!supabase || !isSupabaseConfigured) {
              setRedeemNotice({
                type: 'error',
                text: 'لم يتم إعداد مفاتيح الربط مع Supabase (VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY).',
              });
              return;
            }

            try {
              const {
                data: { session },
              } = await supabase.auth.getSession();
              const targetUserId = session?.user?.id || user.id;

              const { data: redeemResult, error: rpcError } = await supabase.rpc('redeem_code', {
                user_id: targetUserId,
                input_code: codeVal,
              });

              if (rpcError || redeemResult !== true) {
                setRedeemNotice({
                  type: 'error',
                  text: 'عذراً، كود التفعيل غير صحيح أو مستخدم مسبقاً. يرجى التواصل مع الدعم عبر الواتساب.',
                });
                return;
              }

              const { error: profileError } = await supabase
                .from('profiles')
                .update({ is_subscribed: true })
                .eq('id', targetUserId);

              if (profileError) {
                setRedeemNotice({ type: 'error', text: `تعذر تحديث الاشتراك: ${profileError.message}` });
                return;
              }

              const nowIso = new Date().toISOString();
              const expiresDate = new Date();
              expiresDate.setDate(expiresDate.getDate() + 365);

              setRedeemNotice({ type: 'success', text: '🎉 تم تفعيل الاشتراك السنوي بنجاح!' });
              const updated = updateUserProfile({
                isSubscribed: true,
                subscription: {
                  status: 'active',
                  codeUsed: codeVal,
                  activatedAt: nowIso,
                  expiresAt: expiresDate.toISOString(),
                  priceYER: 4000,
                  durationDays: 365,
                },
              });
              setUser(updated);
              inputEl.value = '';
            } catch (err: any) {
              setRedeemNotice({ type: 'error', text: 'حدث خطأ أثناء تفعيل الكود' });
            }
          }}
          className="flex flex-col sm:flex-row items-center gap-3 pt-2"
        >
          <input
            name="redemptionCode"
            type="text"
            placeholder="أدخل كود التفعيل الخاص بك"
            className="w-full sm:flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.4)] dark:border-slate-700 text-[#0F172A] dark:text-amber-300 font-mono font-bold text-sm tracking-wider placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0EA5E9] dark:focus:border-amber-400"
            required
          />
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-gradient-to-r dark:from-amber-500 dark:to-amber-600 text-white dark:text-slate-950 font-bold text-xs shadow-sm whitespace-nowrap"
          >
            تفعيل الكود (365 يوم)
          </button>
        </form>
      </div>

      {/* Certificates List */}
      <div className="champagne-card rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500 dark:text-amber-400" />
          <span>الشهادات وسجل التقييم المعتمد</span>
        </h3>

        <div className="space-y-3">
          {user.certificates.map((cert, idx) => (
            <div key={idx} className="p-4 rounded-xl champagne-subcard flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                <div>
                  <h4 className="font-bold text-[#0F172A] dark:text-white">{cert.title}</h4>
                  <p className="text-[11px] text-[#475569] dark:text-slate-400">التاريخ: {cert.date}</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#E0F2FE] dark:bg-cyan-500/10 text-[#0284C7] dark:text-cyan-300 font-mono font-bold border border-[#0EA5E9]/25 dark:border-cyan-500/30">
                درجة النجاح: {cert.score}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

