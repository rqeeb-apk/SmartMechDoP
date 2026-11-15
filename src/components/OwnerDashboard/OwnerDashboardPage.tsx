import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert, Users, BookOpen, Layers, Cpu, Key, Database, Download, Upload,
  Activity, CheckCircle, Trash2, Plus, Copy, Search, RefreshCw, Printer, AlertTriangle,
  CreditCard, DollarSign, Settings, Sliders, Lock, Zap, Eye, BarChart3, Bot, Check, FileText
} from 'lucide-react';
import { getStoredDoctors, getStoredBooks, getStoredProjects, OFFICIAL_LOGO_URL } from '../../services/storage';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { SecurityLog, SupabaseActivationCode } from '../../types';

export const OwnerDashboardPage: React.FC = () => {
  const doctors = getStoredDoctors();
  const books = getStoredBooks();
  const projects = getStoredProjects();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'students' | 'pricing' | 'codes' | 'doctors' | 'content' | 'labs3d' | 'ai_quota' | 'avatar' | 'logs' | 'system' | 'finance'
  >('overview');

  // Activation codes state from Supabase (`activation_codes` table)
  const [codes, setCodes] = useState<SupabaseActivationCode[]>([]);
  const [codeFilter, setCodeFilter] = useState<'all' | 'unused' | 'used'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [codesError, setCodesError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [batchCopied, setBatchCopied] = useState(false);
  const [pendingActionCode, setPendingActionCode] = useState<SupabaseActivationCode | null>(null);
  const [updatingCodeId, setUpdatingCodeId] = useState<number | string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Security logs state
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Platform Config
  const [yearlyPrice, setYearlyPrice] = useState(4000);
  const [currency, setCurrency] = useState('ريال يمني (YER)');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [aiModel, setAiModel] = useState('gemini-3.8-flash');
  const [aiFallback, setAiFallback] = useState('gemini-3.1-flash-lite');

  const fetchActivationCodes = async () => {
    if (!supabase || !isSupabaseConfigured) {
      setCodes([]);
      setCodesError(
        'لم يتم إعداد مفاتيح Supabase في البيئة (VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY). أضف مفاتيح مشروعك لعرض الأكواد الحية.'
      );
      return;
    }

    setLoadingCodes(true);
    setCodesError(null);
    try {
      const { data, error } = await supabase
        .from('activation_codes')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        throw error;
      }

      setCodes((data as SupabaseActivationCode[]) || []);
      setLastUpdatedAt(new Date().toISOString());
    } catch (e: any) {
      console.error('Error fetching activation_codes from Supabase:', e);
      setCodesError(
        e?.message
          ? `فشل جلب الأكواد من Supabase: ${e.message}`
          : 'فشل جلب الأكواد من Supabase. تأكد من صلاحيات الجدول (RLS) واتصالك بالإنترنت.'
      );
    } finally {
      setLoadingCodes(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/owner/logs');
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.error('Error fetching logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchActivationCodes();
    fetchLogs();
  }, []);

  // Compute real-time statistics dynamically from Supabase data (no hardcoded totals)
  const stats = useMemo(() => {
    const totalCount = codes.length;
    const usedCount = codes.filter((c) => Boolean(c.is_used)).length;
    const unusedCount = totalCount - usedCount;
    const totalRevenueYER = usedCount * yearlyPrice;
    const unusedValueYER = unusedCount * yearlyPrice;
    const totalPotentialRevenueYER = totalCount * yearlyPrice;

    return {
      totalCount,
      unusedCount,
      usedCount,
      pricePerYearYER: yearlyPrice,
      totalRevenueYER,
      unusedValueYER,
      totalPotentialRevenueYER,
    };
  }, [codes, yearlyPrice]);

  // Filtered codes for table view
  const filteredCodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return codes.filter((item) => {
      const isUsed = Boolean(item.is_used);
      if (codeFilter === 'unused' && isUsed) return false;
      if (codeFilter === 'used' && !isUsed) return false;

      if (!q) return true;
      const codeStr = String(item.code || '').toLowerCase();
      const idStr = String(item.id || '').toLowerCase();
      const studentStr = String(item.student_name || item.used_by || item.student_email || '').toLowerCase();
      return codeStr.includes(q) || idStr.includes(q) || studentStr.includes(q);
    });
  }, [codes, codeFilter, searchQuery]);

  const firstCodeLabel = codes.length > 0 ? codes[0].code : null;
  const lastCodeLabel = codes.length > 0 ? codes[codes.length - 1].code : null;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleBatchCopyUnused = () => {
    const unusedList = codes.filter((c) => !c.is_used).map((c) => c.code).join('\n');
    if (!unusedList) {
      setActionMessage({ type: 'error', text: 'لا توجد أكواد غير مستخدمة للنسخ حالياً.' });
      setTimeout(() => setActionMessage(null), 3000);
      return;
    }
    navigator.clipboard.writeText(unusedList);
    setBatchCopied(true);
    setTimeout(() => setBatchCopied(false), 2500);
  };

  const handleExportCSV = () => {
    if (codes.length === 0) {
      setActionMessage({ type: 'error', text: 'لا توجد أكواد متاحة للتصدير.' });
      setTimeout(() => setActionMessage(null), 3000);
      return;
    }
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['ID,الكود,الحالة,مستخدم_is_used,اسم_الطالب,تاريخ_الإنشاء']
        .concat(
          codes.map(
            (c) =>
              `${c.id},${c.code},${c.is_used ? 'مستخدم' : 'غير مستخدم'},${Boolean(c.is_used)},${c.student_name || c.used_by || ''},${c.created_at || ''}`
          )
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dr_smart_activation_codes_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmToggleUsage = async (row: SupabaseActivationCode) => {
    if (!supabase) return;
    setUpdatingCodeId(row.id);
    setActionMessage(null);
    const nextIsUsed = !Boolean(row.is_used);
    try {
      const { error } = await supabase
        .from('activation_codes')
        .update({ is_used: nextIsUsed })
        .eq('id', row.id);

      if (error) throw error;

      setCodes((prev) =>
        prev.map((item) => (item.id === row.id ? { ...item, is_used: nextIsUsed } : item))
      );
      setActionMessage({
        type: 'success',
        text: `تم تحديث حالة الكود (${row.code}) إلى "${nextIsUsed ? 'مستخدم' : 'غير مستخدم'}" في Supabase.`,
      });
      setPendingActionCode(null);
    } catch (e: any) {
      setActionMessage({
        type: 'error',
        text: e?.message ? `تعذر تحديث الكود: ${e.message}` : 'تعذر تحديث حالة الكود في Supabase.',
      });
    } finally {
      setUpdatingCodeId(null);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const navTabs = [
    { id: 'overview', label: '1. النظرة العامة', icon: BarChart3 },
    { id: 'students', label: '2. إدارة الطلاب', icon: Users },
    { id: 'pricing', label: '3. الأسعار والاشتراكات', icon: DollarSign },
    { id: 'codes', label: `4. إدارة الأكواد (${stats.totalCount})`, icon: Key },
    { id: 'doctors', label: '5. الدكاترة الافتراضيون', icon: Bot },
    { id: 'content', label: '6. المحتوى والكتب', icon: BookOpen },
    { id: 'labs3d', label: '7. المختبر 3D', icon: Layers },
    { id: 'ai_quota', label: '8. الذكاء الاصطناعي API', icon: Zap },
    { id: 'avatar', label: '9. الشخصية والسبورة', icon: Sliders },
    { id: 'logs', label: '10. سجل الأمان والتدقيق', icon: Activity },
    { id: 'system', label: '11. إعدادات النظام', icon: Settings },
    { id: 'finance', label: '12. التقارير المالية', icon: CreditCard },
  ];

  return (
    <div className="space-y-6 pb-12 text-[#0F172A] dark:text-slate-100">
      {/* Top Banner Header */}
      <div className="champagne-card rounded-3xl p-6 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden dark:border-amber-500/30">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl p-1 bg-gradient-to-tr from-amber-400 via-[#0EA5E9] to-amber-500 shadow-lg shadow-amber-500/20 shrink-0">
            <img src={OFFICIAL_LOGO_URL} alt="Logo" className="w-full h-full object-cover rounded-xl" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <ShieldAlert className="w-6 h-6 text-[#0EA5E9] dark:text-amber-400" />
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] dark:text-white">
                لوحة مالك منصة الدكتور الذكي (Owner Console)
              </h1>
              <span className="bg-[#E0F2FE] dark:bg-amber-500/20 text-[#0284C7] dark:text-amber-300 text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border border-[#0EA5E9]/30 dark:border-amber-500/40">
                SUPABASE LIVE SYNC
              </span>
            </div>
            <p className="text-xs text-[#475569] dark:text-slate-400 mt-1">
              إدارة حية لـ {stats.totalCount} كود تفعيل من قاعدة بيانات Supabase، الاشتراكات السنوية ({yearlyPrice.toLocaleString()} ريال يمني/365 يوماً)، وسجل الأمان
            </p>
          </div>
        </div>

        {/* Status Indicator & Exit Button */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-bold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            <span>خادم الجلسات: مصادق</span>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('owner_token');
              window.location.reload();
            }}
            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 dark:border-rose-500/40 dark:text-rose-300 text-xs font-bold transition-colors"
          >
            تسجيل الخروج والعودة للمنصة
          </button>
        </div>
      </div>

      {/* 12 Operational Tabs Strip */}
      <div className="champagne-card flex items-center gap-1.5 overflow-x-auto no-scrollbar p-2 rounded-2xl text-xs font-bold">
        {navTabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap shrink-0 transition-all ${
                isActive
                  ? 'bg-[#0EA5E9] hover:bg-[#0284C7] text-white dark:bg-gradient-to-r dark:from-amber-500 dark:to-amber-600 dark:text-slate-950 font-bold shadow-md'
                  : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#E0F2FE]/50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white dark:text-slate-950' : 'text-[#475569] dark:text-slate-400'}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: OVERVIEW & METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-[#475569] dark:text-slate-400 font-medium">
              {lastUpdatedAt
                ? `آخر مزامنة من Supabase: ${new Date(lastUpdatedAt).toLocaleTimeString('ar-EG')}`
                : 'مزامنة مباشرة مع جدول activation_codes في Supabase'}
            </div>
            <button
              onClick={fetchActivationCodes}
              disabled={loadingCodes}
              className="px-3.5 py-2 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] disabled:opacity-60 text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingCodes ? 'animate-spin' : ''}`} />
              <span>{loadingCodes ? 'جاري التحديث...' : 'تحديث'}</span>
            </button>
          </div>

          {codesError && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{codesError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="champagne-card dark:border-amber-500/30 p-5 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-[#475569] dark:text-slate-400 block">الكل (إجمالي الأكواد)</span>
              <div className="text-3xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
                {loadingCodes ? '...' : `${stats.totalCount} كود`}
              </div>
              <p className="text-[11px] text-[#475569] dark:text-slate-400 font-mono truncate">
                {firstCodeLabel && lastCodeLabel ? `${firstCodeLabel} — ${lastCodeLabel}` : 'جدول activation_codes'}
              </p>
            </div>

            <div className="champagne-card dark:border-cyan-500/30 p-5 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-[#475569] dark:text-slate-400 block">غير مستخدم</span>
              <div className="text-3xl font-extrabold font-mono text-[#0EA5E9] dark:text-cyan-400">
                {loadingCodes ? '...' : `${stats.unusedCount} كود`}
              </div>
              <p className="text-[11px] text-[#0284C7] dark:text-cyan-300/80">جاهزة للتوزيع والتفعيل</p>
            </div>

            <div className="champagne-card dark:border-emerald-500/30 p-5 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-[#475569] dark:text-slate-400 block">مستخدم (المفعلة)</span>
              <div className="text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                {loadingCodes ? '...' : `${stats.usedCount} كود`}
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">أكواد تم استخدامها فعلياً</p>
            </div>

            <div className="champagne-card dark:border-purple-500/30 p-5 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-[#475569] dark:text-slate-400 block">الإيرادات الفعلية (بالريال اليمني)</span>
              <div className="text-3xl font-extrabold font-mono text-purple-700 dark:text-purple-300">
                {stats.totalRevenueYER.toLocaleString()} YER
              </div>
              <p className="text-[11px] text-[#475569] dark:text-slate-400">سعر الاشتراك السنوي: {yearlyPrice.toLocaleString()} ريال يمني</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="champagne-card p-6 rounded-2xl space-y-4">
              <h3 className="text-base font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#0EA5E9] dark:text-amber-400" />
                <span>حالة محرك الذكاء الاصطناعي (Gemini 429 Prevention)</span>
              </h3>
              <div className="champagne-subcard p-4 rounded-xl space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[#475569] dark:text-slate-400">النموذج الرئيسي:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">{aiModel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#475569] dark:text-slate-400">النموذج الاحتياطي عند الضغط:</span>
                  <span className="text-[#0284C7] dark:text-cyan-400 font-bold">{aiFallback}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#475569] dark:text-slate-400">حد التوكن المقتطع:</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">1500 Tokens / Request</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#475569] dark:text-slate-400">آلية تلافي الأخطاء:</span>
                  <span className="text-purple-700 dark:text-purple-300 font-bold">Exponential Backoff + Jitter</span>
                </div>
              </div>
            </div>

            <div className="champagne-card p-6 rounded-2xl space-y-4">
              <h3 className="text-base font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#0EA5E9] dark:text-amber-400" />
                <span>حالة نظام الحماية وحظر الهجمات</span>
              </h3>
              <div className="champagne-subcard p-4 rounded-xl space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[#475569] dark:text-slate-400">أقصى محاولات خاطئة:</span>
                  <span className="text-rose-600 dark:text-rose-400 font-bold">5 محاولات</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#475569] dark:text-slate-400">مدة حظر الإيبيهات:</span>
                  <span className="text-rose-600 dark:text-rose-400 font-bold">15 دقيقة (900 ثانية)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#475569] dark:text-slate-400">طريقة تفعيل لوحة المالك:</span>
                  <span className="text-amber-600 dark:text-amber-300 font-bold">20 نقرة متتالية على الشعار</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: STUDENT MANAGEMENT */}
      {activeTab === 'students' && (
        <div className="champagne-card p-6 rounded-2xl space-y-4">
          <h3 className="text-base font-bold text-[#0F172A] dark:text-white">إدارة الطلاب المسجلين والاشتراكات السنوية</h3>
          <p className="text-xs text-[#475569] dark:text-slate-400">عرض حالة الطلاب، الأكواد المفعلة، تواريخ الانتهاء، وإمكانية تجميد أو تمديد الحسابات</p>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-[rgba(212,175,55,0.25)] dark:border-slate-800 text-[#475569] dark:text-slate-400">
                  <th className="pb-3 px-3">اسم الطالب</th>
                  <th className="pb-3 px-3">البريد الإلكتروني</th>
                  <th className="pb-3 px-3">كود الاشتراك المستعمل</th>
                  <th className="pb-3 px-3">حالة الاشتراك</th>
                  <th className="pb-3 px-3">مدة السريان</th>
                  <th className="pb-3 px-3">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(212,175,55,0.15)] dark:divide-slate-800/60 font-mono">
                {codes.filter((c) => Boolean(c.is_used)).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#64748B] dark:text-slate-500 font-sans">
                      لا توجد أكواد مستخدمة حالياً في قاعدة البيانات.
                    </td>
                  </tr>
                ) : (
                  codes
                    .filter((c) => Boolean(c.is_used))
                    .map((c) => (
                      <tr key={String(c.id)} className="hover:bg-[#F8FAFC] dark:hover:bg-slate-900/50">
                        <td className="py-3 px-3 font-sans font-bold text-[#0F172A] dark:text-white">{c.student_name || c.used_by || 'طالب ميكاترونكس'}</td>
                        <td className="py-3 px-3 text-[#0284C7] dark:text-cyan-300">{c.student_email || '-'}</td>
                        <td className="py-3 px-3 font-bold text-amber-600 dark:text-amber-400">{c.code}</td>
                        <td className="py-3 px-3">
                          <span className="px-2.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">
                            مستخدم
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[#475569] dark:text-slate-400">
                          {c.expires_at ? new Date(c.expires_at).toLocaleDateString('ar-EG') : `${c.duration_days || 365} يوم`}
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => handleConfirmToggleUsage(c)}
                            disabled={updatingCodeId === c.id}
                            className="px-2 py-1 rounded bg-[#E0F2FE] text-[#0284C7] hover:bg-[#0EA5E9] hover:text-white dark:bg-slate-800 dark:text-amber-300 dark:hover:bg-slate-700 text-[10px] transition-colors disabled:opacity-50"
                          >
                            إعادة لغير مستخدم
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 3: SUBSCRIPTION & PRICING */}
      {activeTab === 'pricing' && (
        <div className="champagne-card p-6 rounded-2xl space-y-6">
          <h3 className="text-base font-bold text-[#0F172A] dark:text-white">إعدادات أسعار خطة الاشتراك السنوي الشاملة</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="champagne-subcard p-4 rounded-xl space-y-2">
              <label className="text-xs font-bold text-[#0F172A] dark:text-slate-300 block">سعر الاشتراك السنوي:</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={yearlyPrice}
                  onChange={(e) => setYearlyPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 font-mono text-amber-600 dark:text-amber-400 font-bold text-sm focus:border-[#0EA5E9] focus:outline-none"
                />
                <span className="text-xs font-bold text-[#475569] dark:text-slate-300">YER</span>
              </div>
            </div>

            <div className="champagne-subcard p-4 rounded-xl space-y-2">
              <label className="text-xs font-bold text-[#0F172A] dark:text-slate-300 block">العملة الرسمية بالمنصة:</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 font-mono text-[#0284C7] dark:text-cyan-300 font-bold text-xs focus:border-[#0EA5E9] focus:outline-none"
              />
            </div>

            <div className="champagne-subcard p-4 rounded-xl space-y-2">
              <label className="text-xs font-bold text-[#0F172A] dark:text-slate-300 block">مدة صلاحية الكود عند التفعيل:</label>
              <div className="px-3 py-2 rounded-lg bg-emerald-50 dark:bg-slate-800 border border-emerald-200 dark:border-transparent font-mono text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                365 يومًا (سنة كاملة)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: SUPABASE ACTIVATION CODES MANAGER */}
      {activeTab === 'codes' && (
        <div className="champagne-card dark:border-amber-500/30 p-6 rounded-2xl space-y-6 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-[rgba(212,175,55,0.25)] dark:border-amber-500/20 pb-4">
            <div>
              <h3 className="text-lg font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-[#0EA5E9] dark:text-amber-400" />
                <span>إدارة أكواد التفعيل من Supabase ({stats.totalCount} كود)</span>
              </h3>
              <p className="text-xs text-[#475569] dark:text-slate-400 mt-0.5">
                {firstCodeLabel && lastCodeLabel
                  ? `عرض مباشر من جدول activation_codes | أول كود: ${firstCodeLabel} | آخر كود: ${lastCodeLabel}`
                  : 'عرض مباشر من جدول activation_codes في قاعدة بيانات Supabase'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={fetchActivationCodes}
                disabled={loadingCodes}
                className="px-3.5 py-2 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] disabled:opacity-60 text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 ${loadingCodes ? 'animate-spin' : ''}`} />
                <span>{loadingCodes ? 'جاري التحديث...' : 'تحديث'}</span>
              </button>

              <button
                onClick={handleBatchCopyUnused}
                className="px-3 py-2 rounded-xl bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#0284C7] dark:bg-cyan-500/20 dark:border dark:border-cyan-500/40 dark:text-cyan-300 dark:hover:bg-cyan-500/30 text-xs font-bold flex items-center gap-2 transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span>{batchCopied ? 'تم نسخ الأكواد!' : 'نسخ غير المستخدم'}</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/20 dark:border-amber-500/40 dark:text-amber-300 dark:hover:bg-amber-500/30 text-xs font-bold flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>تصدير CSV</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-3 py-2 rounded-xl bg-white border border-[rgba(212,175,55,0.35)] text-[#475569] hover:text-[#0F172A] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-2 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة</span>
              </button>
            </div>
          </div>

          {/* Live Dynamic Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="champagne-subcard p-4 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-[#475569] dark:text-slate-300">الكل</span>
              <span className="text-xl font-extrabold font-mono text-[#0F172A] dark:text-amber-400">{stats.totalCount}</span>
            </div>
            <div className="champagne-subcard p-4 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-[#0284C7] dark:text-cyan-300">غير مستخدم</span>
              <span className="text-xl font-extrabold font-mono text-[#0EA5E9] dark:text-cyan-400">{stats.unusedCount}</span>
            </div>
            <div className="champagne-subcard p-4 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">مستخدم</span>
              <span className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">{stats.usedCount}</span>
            </div>
          </div>

          {/* Feedback / Error / Inline Confirmation Banners */}
          {codesError && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{codesError}</span>
            </div>
          )}

          {actionMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between border ${
                actionMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300'
              }`}
            >
              <span>{actionMessage.text}</span>
              <button onClick={() => setActionMessage(null)} className="text-[11px] underline">
                إغلاق
              </button>
            </div>
          )}

          {pendingActionCode && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <span>
                هل تريد تغيير حالة الكود <strong className="font-mono">{pendingActionCode.code}</strong> إلى{' '}
                <strong>{pendingActionCode.is_used ? 'غير مستخدم' : 'مستخدم'}</strong>؟
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleConfirmToggleUsage(pendingActionCode)}
                  disabled={updatingCodeId === pendingActionCode.id}
                  className="px-3 py-1.5 rounded-lg bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-bold transition-colors disabled:opacity-50"
                >
                  {updatingCodeId === pendingActionCode.id ? 'جاري الحفظ...' : 'تأكيد التحديث'}
                </button>
                <button
                  onClick={() => setPendingActionCode(null)}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[#475569] dark:text-slate-300 font-bold"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {/* Controls & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#64748B] dark:text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                placeholder="بحث في الأكواد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-9 pl-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-xs text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] dark:placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9] dark:focus:border-amber-400 font-mono"
              />
            </div>

            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-[rgba(212,175,55,0.3)] dark:border-slate-800 text-xs font-bold overflow-x-auto no-scrollbar w-full sm:w-auto">
              {[
                { id: 'all', label: `الكل (${stats.totalCount})` },
                { id: 'unused', label: `غير مستخدم (${stats.unusedCount})` },
                { id: 'used', label: `مستخدم (${stats.usedCount})` },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setCodeFilter(f.id as 'all' | 'unused' | 'used')}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                    codeFilter === f.id
                      ? 'bg-[#0EA5E9] text-white dark:bg-amber-500 dark:text-slate-950 font-bold'
                      : 'text-[#475569] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Activation Codes Grid / Table */}
          <div className="overflow-x-auto rounded-xl border border-[rgba(212,175,55,0.3)] dark:border-slate-800 bg-white dark:bg-slate-900/60 max-h-[600px] overflow-y-auto">
            <table className="w-full text-right text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-[rgba(212,175,55,0.25)] dark:border-slate-800 text-[#475569] dark:text-slate-400 bg-[#F8FAFC] dark:bg-slate-900">
                  <th className="py-3 px-4"># (ID)</th>
                  <th className="py-3 px-4">الكود (code)</th>
                  <th className="py-3 px-4">الحالة (is_used)</th>
                  <th className="py-3 px-4">السعر</th>
                  <th className="py-3 px-4">المستفيد</th>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(212,175,55,0.15)] dark:divide-slate-800/80 font-mono">
                {loadingCodes ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[#0284C7] dark:text-cyan-400 font-sans font-bold">
                      جاري جلب الأكواد الحقيقية من Supabase...
                    </td>
                  </tr>
                ) : filteredCodes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#64748B] dark:text-slate-500 font-sans">
                      {codesError
                        ? 'تعذر عرض الأكواد بسبب خطأ في الاتصال بـ Supabase.'
                        : 'لا توجد أكواد مطابقة لمعايير البحث الحالية.'}
                    </td>
                  </tr>
                ) : (
                  filteredCodes.map((c) => {
                    const isUsed = Boolean(c.is_used);
                    const dateVal = c.used_at || c.redeemed_at || c.created_at;
                    return (
                      <tr key={String(c.id)} className="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/50">
                        <td className="py-2.5 px-4 text-[#64748B] dark:text-slate-500 text-[11px]">{c.id}</td>
                        <td className="py-2.5 px-4 font-bold text-amber-600 dark:text-amber-300 font-mono tracking-wider">{c.code}</td>
                        <td className="py-2.5 px-4 font-sans">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[11px] font-bold inline-block ${
                              !isUsed
                                ? 'bg-[#E0F2FE] text-[#0284C7] border border-[#0EA5E9]/30 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                            }`}
                          >
                            {isUsed ? 'مستخدم' : 'غير مستخدم'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-[#334155] dark:text-slate-300">
                          {(c.price_yer ?? yearlyPrice).toLocaleString()} YER
                        </td>
                        <td className="py-2.5 px-4 text-[#475569] dark:text-slate-400 font-sans">
                          {c.student_name || c.used_by || '-'}
                        </td>
                        <td className="py-2.5 px-4 text-[#475569] dark:text-slate-400 text-[11px]">
                          {dateVal ? new Date(dateVal).toLocaleDateString('ar-EG') : '-'}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleCopyCode(c.code)}
                              className="p-1.5 rounded bg-[#F8FAFC] hover:bg-[#E0F2FE] text-[#475569] hover:text-[#0284C7] dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-amber-400 transition-colors"
                              title="نسخ الكود"
                            >
                              {copiedCode === c.code ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => setPendingActionCode(c)}
                              className="px-2.5 py-1 rounded bg-[#E0F2FE] text-[#0284C7] hover:bg-[#0EA5E9] hover:text-white dark:bg-slate-800 dark:text-amber-400 dark:hover:bg-slate-700 text-[10px] font-sans font-bold transition-colors"
                            >
                              {isUsed ? 'تعيين كغير مستخدم' : 'تعيين كمستخدم'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 5: DOCTORS AVATARS */}
      {activeTab === 'doctors' && (
        <div className="champagne-card p-6 rounded-2xl space-y-4">
          <h3 className="text-base font-bold text-[#0F172A] dark:text-white">إدارة وإعدادات الدكاترة الافتراضيين</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {doctors.map((d) => (
              <div key={d.id} className="p-4 rounded-xl champagne-subcard space-y-3">
                <div className="flex items-center gap-3">
                  <img src={d.avatarUrl || OFFICIAL_LOGO_URL} alt={d.name} className="w-12 h-12 rounded-xl object-cover border border-[rgba(212,175,55,0.3)] dark:border-slate-700" />
                  <div>
                    <h4 className="font-bold text-[#0F172A] dark:text-white text-xs">{d.name}</h4>
                    <span className="text-[10px] text-[#0EA5E9] dark:text-cyan-400 font-bold block">{d.subject}</span>
                  </div>
                </div>
                <p className="text-[11px] text-[#475569] dark:text-slate-400 leading-relaxed">{d.description}</p>
                <div className="pt-2 border-t border-[rgba(212,175,55,0.25)] dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-[#475569] dark:text-slate-400 font-mono">السرعة: {d.voiceSpeed}x</span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 font-bold text-[10px]">
                    {d.isDefault ? 'الرئيسي' : d.style}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 6: CONTENT & BOOKS */}
      {activeTab === 'content' && (
        <div className="champagne-card p-6 rounded-2xl space-y-4">
          <h3 className="text-base font-bold text-[#0F172A] dark:text-white">إدارة المحتوى والمكتبة الهندسية</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl champagne-subcard space-y-2">
              <h4 className="text-xs font-bold text-[#0EA5E9] dark:text-cyan-400">كتب المكتبة الهندسية المعتمدة ({books.length}):</h4>
              {books.map((b) => (
                <div key={b.id} className="p-2.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#0F172A] dark:text-white block">{b.title}</span>
                    <span className="text-[10px] text-[#475569] dark:text-slate-400">{b.category} • {b.pages} صفحة</span>
                  </div>
                  <span className="text-amber-600 dark:text-amber-400 font-mono font-bold text-[11px]">★ {b.rating}</span>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-xl champagne-subcard space-y-2">
              <h4 className="text-xs font-bold text-[#0EA5E9] dark:text-cyan-400">المشاريع والمحاضرات المحفوظة ({projects.length}):</h4>
              {projects.map((p) => (
                <div key={p.id} className="p-2.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#0F172A] dark:text-white block">{p.title}</span>
                    <span className="text-[10px] text-[#475569] dark:text-slate-400">بواسطة: {p.authorName}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#E0F2FE] text-[#0284C7] dark:bg-cyan-500/20 dark:text-cyan-300 font-bold text-[10px]">
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 7: 3D LABS CONTROL */}
      {activeTab === 'labs3d' && (
        <div className="champagne-card p-6 rounded-2xl space-y-4">
          <h3 className="text-base font-bold text-[#0F172A] dark:text-white">التحكم بالمختبر ثلاثي الأبعاد 3D Simulaton</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { title: 'مختبر الدوائر الكهربائية DC/AC', status: 'مفعل 100%' },
              { title: 'مختبر المحاكات Arduino & Sensors', status: 'مفعل 100%' },
              { title: 'مختبر حركة الذراع الروبوتية 3D', status: 'مفعل 100%' },
            ].map((lab, idx) => (
              <div key={idx} className="p-4 rounded-xl champagne-subcard space-y-2">
                <h4 className="font-bold text-[#0F172A] dark:text-white text-xs">{lab.title}</h4>
                <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-[10px] font-bold">
                  {lab.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 8: AI QUOTA & ERROR 429 MANAGER */}
      {activeTab === 'ai_quota' && (
        <div className="champagne-card dark:border-amber-500/30 p-6 rounded-2xl space-y-4">
          <h3 className="text-base font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>إدارة استهلاك محرك الذكاء الاصطناعي وحلول خطأ 429</span>
          </h3>

          <div className="p-4 rounded-xl champagne-subcard space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-[#0EA5E9] dark:text-cyan-400 border-b border-[rgba(212,175,55,0.25)] dark:border-slate-800 pb-2 font-bold">
              <span>اسم النموذج المستعمل: gemini-3.8-flash</span>
              <span className="text-emerald-600 dark:text-emerald-400">الحالة: نشط ومحمي عبر الخادم</span>
            </div>
            <div className="space-y-1.5 text-[#334155] dark:text-slate-300">
              <div>• نظام التراجع الأسّي (Exponential Backoff + Jitter): مفعّل تلقائياً عند تلقي 429</div>
              <div>• قفل الطلبات المتزامنة (Request Lock Middleware): يمنع تكرار النقرات على زر الشرح</div>
              <div>• اقتطاع النصوص الطويلة (Token Budget Limit): بحد أقصى 1500 توكن لكل طلب لشرح المحاضرة</div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 9: AVATAR & WHITEBOARD */}
      {activeTab === 'avatar' && (
        <div className="champagne-card p-6 rounded-2xl space-y-4">
          <h3 className="text-base font-bold text-[#0F172A] dark:text-white">إعدادات الشخصية الافتراضية والسبورة التفاعلية</h3>
          <div className="p-4 rounded-xl champagne-subcard space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#334155] dark:text-slate-300 font-medium">حساسية مزامنة الشفاه مع الصوت (Lip Sync):</span>
              <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">عالية (100%)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#334155] dark:text-slate-300 font-medium">سرعة كتابة المعادلات على السبورة:</span>
              <span className="font-mono text-[#0EA5E9] dark:text-cyan-400 font-bold">1.2x</span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 10: SECURITY AUDIT & SYSTEM LOGS */}
      {activeTab === 'logs' && (
        <div className="champagne-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>سجل الأمان وتدقيق العمليات الحية (Audit Logs)</span>
            </h3>
            <button
              onClick={fetchLogs}
              disabled={loadingLogs}
              className="px-3 py-1.5 rounded-lg bg-[#0EA5E9] hover:bg-[#0284C7] text-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              <span>تحديث السجل</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[rgba(212,175,55,0.3)] dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[#475569] dark:text-slate-400 bg-[#F8FAFC] dark:bg-slate-900">
                  <th className="py-3 px-4">التاريخ والوقت</th>
                  <th className="py-3 px-4">نوع الحدث</th>
                  <th className="py-3 px-4">الفئة</th>
                  <th className="py-3 px-4">عنوان IP</th>
                  <th className="py-3 px-4">تفاصيل العملية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 font-mono">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#64748B] dark:text-slate-500">لا توجد سجلات أمان حالياً</td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id} className="hover:bg-[#FDFBF7] dark:hover:bg-slate-800/50">
                      <td className="py-2.5 px-4 text-[#475569] dark:text-slate-400 text-[11px]">
                        {new Date(l.timestamp).toLocaleTimeString('ar-EG')}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-[#0F172A] dark:text-white font-sans">{l.event}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            l.severity === 'danger'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                              : l.severity === 'warning'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                              : 'bg-[#E0F2FE] text-[#0284C7] dark:bg-cyan-500/20 dark:text-cyan-300'
                          }`}
                        >
                          {l.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-[#0284C7] dark:text-cyan-300">{l.ip}</td>
                      <td className="py-2.5 px-4 text-[#334155] dark:text-slate-300 font-sans text-[11px]">{l.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 11: SYSTEM SETTINGS */}
      {activeTab === 'system' && (
        <div className="champagne-card p-6 rounded-2xl space-y-6">
          <h3 className="text-base font-bold text-[#0F172A] dark:text-white">إعدادات النظام وتخصيص الهوية</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl champagne-subcard flex items-center justify-between">
              <div>
                <span className="font-bold text-[#0F172A] dark:text-white text-xs block">وضع الصيانة العامة (Maintenance Mode)</span>
                <span className="text-[11px] text-[#475569] dark:text-slate-400">إيقاف استقبال تفعيل الأكواد مؤقتاً</span>
              </div>
              <button
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  maintenanceMode
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-100 text-[#475569] border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                }`}
              >
                {maintenanceMode ? 'مفعل' : 'معطل'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 12: FINANCIAL ANALYTICS */}
      {activeTab === 'finance' && (
        <div className="champagne-card p-6 rounded-2xl space-y-6">
          <h3 className="text-base font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>التقارير المالية وإجمالي أرباح اشتراكات ({stats.totalCount} كود)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl champagne-subcard space-y-2">
              <span className="text-xs text-[#475569] dark:text-slate-400 font-bold block">إجمالي القيمة الكلية ({stats.totalCount} كود):</span>
              <div className="text-2xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
                {stats.totalPotentialRevenueYER.toLocaleString()} YER
              </div>
              <p className="text-[10px] text-[#475569] dark:text-slate-400">{stats.totalCount} كود × {yearlyPrice.toLocaleString()} ريال يمني</p>
            </div>

            <div className="p-5 rounded-2xl champagne-subcard space-y-2">
              <span className="text-xs text-[#475569] dark:text-slate-400 font-bold block">الإيرادات المحصلة فعلياً:</span>
              <div className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                {stats.totalRevenueYER.toLocaleString()} YER
              </div>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-300">من {stats.usedCount} كود مستخدم</p>
            </div>

            <div className="p-5 rounded-2xl champagne-subcard space-y-2">
              <span className="text-xs text-[#475569] dark:text-slate-400 font-bold block">القيمة المتبقية من الأكواد غير المستخدمة:</span>
              <div className="text-2xl font-extrabold font-mono text-[#0284C7] dark:text-cyan-300">
                {stats.unusedValueYER.toLocaleString()} YER
              </div>
              <p className="text-[10px] text-[#0EA5E9] dark:text-cyan-300/80">{stats.unusedCount} كود غير مستخدم</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
