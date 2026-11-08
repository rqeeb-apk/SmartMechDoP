import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, Users, BookOpen, Layers, Cpu, Key, Database, Download, Upload,
  Activity, CheckCircle, Trash2, Plus, Copy, Search, RefreshCw, Printer, AlertTriangle,
  CreditCard, DollarSign, Settings, Sliders, Lock, Zap, Eye, BarChart3, Bot, Check, FileText
} from 'lucide-react';
import { getStoredDoctors, getStoredBooks, getStoredProjects, OFFICIAL_LOGO_URL } from '../../services/storage';
import { ActivationCode, SecurityLog } from '../../types';

export const OwnerDashboardPage: React.FC = () => {
  const doctors = getStoredDoctors();
  const books = getStoredBooks();
  const projects = getStoredProjects();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'students' | 'pricing' | 'codes' | 'doctors' | 'content' | 'labs3d' | 'ai_quota' | 'avatar' | 'logs' | 'system' | 'finance'
  >('overview');

  // Codes state from server
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [stats, setStats] = useState<{
    totalCount: number;
    unusedCount: number;
    activeCount: number;
    expiredCount: number;
    revokedCount: number;
    pricePerYearYER: number;
    totalRevenueYER: number;
    totalPotentialRevenueYER: number;
  }>({
    totalCount: 300,
    unusedCount: 300,
    activeCount: 0,
    expiredCount: 0,
    revokedCount: 0,
    pricePerYearYER: 4000,
    totalRevenueYER: 0,
    totalPotentialRevenueYER: 1200000,
  });

  const [codeFilter, setCodeFilter] = useState<'all' | 'unused' | 'active' | 'expired' | 'revoked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [batchCopied, setBatchCopied] = useState(false);

  // Security logs state
  const [logs, setLogs] = useState<SecurityLog[]>([]);

  // Platform Config
  const [yearlyPrice, setYearlyPrice] = useState(4000);
  const [currency, setCurrency] = useState('ريال يمني (YER)');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [aiModel, setAiModel] = useState('gemini-3.8-flash');
  const [aiFallback, setAiFallback] = useState('gemini-3.1-flash-lite');

  const fetchCodes = async () => {
    setLoadingCodes(true);
    try {
      const res = await fetch(`/api/owner/codes?status=${codeFilter}&search=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) {
        setCodes(data.codes);
        if (data.stats) setStats(data.stats);
      }
    } catch (e) {
      console.error('Error fetching codes:', e);
    } finally {
      setLoadingCodes(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/owner/logs');
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.error('Error fetching logs:', e);
    }
  };

  useEffect(() => {
    fetchCodes();
    fetchLogs();
  }, [codeFilter, searchQuery]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleBatchCopyUnused = () => {
    const unusedList = codes.filter((c) => c.status === 'unused').map((c) => c.code).join('\n');
    navigator.clipboard.writeText(unusedList);
    setBatchCopied(true);
    setTimeout(() => setBatchCopied(false), 2500);
  };

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['الكود,الحالة,السعر,المدة_بالأيام,اسم_الطالب,تاريخ_التفعيل,تاريخ_الانتهاء']
        .concat(
          codes.map(
            (c) =>
              `${c.code},${c.status},${c.priceYER},${c.durationDays},${c.redeemedBy?.studentName || ''},${c.redeemedAt || ''},${c.expiresAt || ''}`
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

  const handleRevokeCode = async (code: string) => {
    if (!confirm(`هل أنت تأكد من إلغاء كود الاشتراك (${code})؟`)) return;
    try {
      const res = await fetch('/api/owner/codes/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.success) {
        fetchCodes();
        fetchLogs();
      }
    } catch (e) {
      alert('فشل إلغاء الكود');
    }
  };

  const handleResetCode = async (code: string) => {
    if (!confirm(`هل تريد إعادة الكود (${code}) إلى وضع غير مستخدم؟`)) return;
    try {
      const res = await fetch('/api/owner/codes/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.success) {
        fetchCodes();
        fetchLogs();
      }
    } catch (e) {
      alert('فشل إعادة ضبط الكود');
    }
  };

  const navTabs = [
    { id: 'overview', label: '1. النظرة العامة', icon: BarChart3 },
    { id: 'students', label: '2. إدارة الطلاب', icon: Users },
    { id: 'pricing', label: '3. الأسعار والاشتراكات', icon: DollarSign },
    { id: 'codes', label: '4. إدارة 300 كود', icon: Key },
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
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="bg-[#0D1B2A] border border-amber-500/30 rounded-3xl p-6 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl p-1 bg-gradient-to-tr from-amber-400 via-cyan-400 to-amber-500 shadow-lg shadow-amber-500/20 shrink-0">
            <img src={OFFICIAL_LOGO_URL} alt="Logo" className="w-full h-full object-cover rounded-xl" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                لوحة مالك منصة الدكتور الذكي (Owner Console)
              </h1>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border border-amber-500/40">
                VERIFIED SERVER BACKEND
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              إدارة شاملة لـ 300 كود تفعيل، الاشتراكات السنوية (4000 ريال يمني/365 يوماً)، سجل الأمان ومحرك الذكاء الاصطناعي
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>خادم الجلسات: مصادق</span>
          </div>
        </div>
      </div>

      {/* 12 Operational Tabs Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-[#0D1B2A] p-2 rounded-2xl border border-slate-800 text-xs font-bold">
        {navTabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap shrink-0 transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: OVERVIEW & METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0D1B2A] border border-amber-500/30 p-5 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-slate-400 block">إجمالي أكواد التفعيل المصدرة</span>
              <div className="text-3xl font-extrabold font-mono text-amber-400">{stats.totalCount} كود</div>
              <p className="text-[11px] text-slate-400">من DR-248G3C7X إلى DR-ZX2N4K8L</p>
            </div>

            <div className="bg-[#0D1B2A] border border-cyan-500/30 p-5 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-slate-400 block">الأكواد غير المستخدمة</span>
              <div className="text-3xl font-extrabold font-mono text-cyan-400">{stats.unusedCount} كود</div>
              <p className="text-[11px] text-cyan-300/80">جاهزة للتوزيع والتفعيل</p>
            </div>

            <div className="bg-[#0D1B2A] border border-emerald-500/30 p-5 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-slate-400 block">الاشتراكات المفعلة والمحصلة</span>
              <div className="text-3xl font-extrabold font-mono text-emerald-400">{stats.activeCount} طالب</div>
              <p className="text-[11px] text-emerald-300">سارية لمدة 365 يومًا</p>
            </div>

            <div className="bg-[#0D1B2A] border border-purple-500/30 p-5 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-slate-400 block">الإيرادات الفعلية (بالريال اليمني)</span>
              <div className="text-3xl font-extrabold font-mono text-purple-300">
                {stats.totalRevenueYER.toLocaleString()} YER
              </div>
              <p className="text-[11px] text-slate-400">سعر الاشتراك السنوي: 4000 ريال yemen</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0D1B2A] border border-slate-800 p-6 rounded-2xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <span>حالة محرك الذكاء الاصطناعي (Gemini 429 Prevention)</span>
              </h3>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">النموذج الرئيسي:</span>
                  <span className="text-amber-400 font-bold">{aiModel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">النموذج الاحتياطي عند الضغط:</span>
                  <span className="text-cyan-400 font-bold">{aiFallback}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">حد التوكن المقتطع:</span>
                  <span className="text-emerald-400 font-bold">1500 Tokens / Request</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">آلية تلافي الأخطاء:</span>
                  <span className="text-purple-300 font-bold">Exponential Backoff + Jitter</span>
                </div>
              </div>
            </div>

            <div className="bg-[#0D1B2A] border border-slate-800 p-6 rounded-2xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <span>حالة نظام الحماية وحظر الهجمات</span>
              </h3>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">أقصى محاولات خاطئة:</span>
                  <span className="text-rose-400 font-bold">5 محاولات</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">مدة حظر الإيبيهات:</span>
                  <span className="text-rose-400 font-bold">15 دقيقة (900 ثانية)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">طريقة تفعيل لوحة المالك:</span>
                  <span className="text-amber-300 font-bold">20 نقرة متتالية على الشعار</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: STUDENT MANAGEMENT */}
      {activeTab === 'students' && (
        <div className="bg-[#0D1B2A] border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-base font-bold text-white">إدارة الطلاب المسجلين والاشتراكات السنوية</h3>
          <p className="text-xs text-slate-400">عرض حالة الطلاب، الأكواد المفعلة، تواريخ الانتهاء، وإمكانية تجميد أو تمديد الحسابات</p>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 px-3">اسم الطالب</th>
                  <th className="pb-3 px-3">البريد الإلكتروني</th>
                  <th className="pb-3 px-3">كود الاشتراك المستعمل</th>
                  <th className="pb-3 px-3">حالة الاشتراك</th>
                  <th className="pb-3 px-3">مدة السريان</th>
                  <th className="pb-3 px-3">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {codes.filter((c) => c.status === 'active').length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                      لا يوجد طلاب مفعلين حالياً. قم بتسليم الأكواد غير المستخدمة للطلاب لتفعيل اشتراكاتهم.
                    </td>
                  </tr>
                ) : (
                  codes
                    .filter((c) => c.status === 'active')
                    .map((c) => (
                      <tr key={c.code} className="hover:bg-slate-900/50">
                        <td className="py-3 px-3 font-sans font-bold text-white">{c.redeemedBy?.studentName || 'طالب ميكاترونكس'}</td>
                        <td className="py-3 px-3 text-cyan-300">{c.redeemedBy?.studentEmail || 'student@dr-smart.edu'}</td>
                        <td className="py-3 px-3 font-bold text-amber-400">{c.code}</td>
                        <td className="py-3 px-3">
                          <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                            نشط (365 يوم)
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('ar-EG') : '365 يوم'}
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => handleResetCode(c.code)}
                            className="px-2 py-1 rounded bg-slate-800 text-amber-300 hover:bg-slate-700 text-[10px]"
                          >
                            إلغاء التفعيل
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
        <div className="bg-[#0D1B2A] border border-slate-800 p-6 rounded-2xl space-y-6">
          <h3 className="text-base font-bold text-white">إعدادات أسعار خطة الاشتراك السنوي الشاملة</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-300 block">سعر الاشتراك السنوي:</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={yearlyPrice}
                  onChange={(e) => setYearlyPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 font-mono text-amber-400 font-bold text-sm"
                />
                <span className="text-xs font-bold text-slate-300">YER</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-300 block">العملة الرسمية بالمنصة:</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 font-mono text-cyan-300 font-bold text-xs"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-300 block">مدة صلاحية الكود عند التفعيل:</label>
              <div className="px-3 py-2 rounded-lg bg-slate-800 font-mono text-emerald-400 font-bold text-xs">
                365 يومًا (سنة كاملة)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: 300 ACTIVATION CODES MANAGER */}
      {activeTab === 'codes' && (
        <div className="bg-[#0D1B2A] border border-amber-500/30 p-6 rounded-2xl space-y-6 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                <span>إدارة وحفظ 300 كود تفعيل للأنظمة السنوية</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                قيمة الكود: 4000 ريال يمني | صلاحية: 365 يوماً | الكود الأول: DR-248G3C7X - الكود الأخير: DR-ZX2N4K8L
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleBatchCopyUnused}
                className="px-3 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 text-xs font-bold flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                <span>{batchCopied ? 'تم نسخ الأكواد!' : 'نسخ الأكواد غير المستخدمة'}</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-xs font-bold flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>تصدير CSV</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 text-xs font-bold flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة</span>
              </button>
            </div>
          </div>

          {/* Controls & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                placeholder="بحث في الأكواد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-9 pl-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold overflow-x-auto no-scrollbar w-full sm:w-auto">
              {[
                { id: 'all', label: `الكل (${stats.totalCount})` },
                { id: 'unused', label: `غير مستخدم (${stats.unusedCount})` },
                { id: 'active', label: `مفعل (${stats.activeCount})` },
                { id: 'revoked', label: `ملغى (${stats.revokedCount})` },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setCodeFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                    codeFilter === f.id ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Activation Codes Grid / Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">كود التفعيل (Code)</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4">السعر</th>
                  <th className="py-3 px-4">مدة السريان</th>
                  <th className="py-3 px-4">الطالب المستفيد</th>
                  <th className="py-3 px-4">تاريخ التفعيل</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {codes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                      لا توجد أكواد مطابقة لمعايير البحث الحالية.
                    </td>
                  </tr>
                ) : (
                  codes.slice(0, 100).map((c, i) => (
                    <tr key={c.code} className="hover:bg-slate-800/50">
                      <td className="py-2.5 px-4 text-slate-500 text-[11px]">{i + 1}</td>
                      <td className="py-2.5 px-4 font-bold text-amber-300 font-mono tracking-wider">{c.code}</td>
                      <td className="py-2.5 px-4 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.status === 'unused'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : c.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {c.status === 'unused' ? 'غير مستخدم' : c.status === 'active' ? 'مفعل نشط' : 'ملغى'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-300">{c.priceYER} YER</td>
                      <td className="py-2.5 px-4 text-slate-300">{c.durationDays} يوم</td>
                      <td className="py-2.5 px-4 text-slate-400 font-sans">{c.redeemedBy?.studentName || '-'}</td>
                      <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                        {c.redeemedAt ? new Date(c.redeemedAt).toLocaleDateString('ar-EG') : '-'}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleCopyCode(c.code)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition-colors"
                            title="نسخ الكود"
                          >
                            {copiedCode === c.code ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          {c.status === 'active' && (
                            <button
                              onClick={() => handleResetCode(c.code)}
                              className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 hover:bg-slate-700 text-[10px] font-sans"
                            >
                              إعادة ضبط
                            </button>
                          )}
                          {c.status !== 'revoked' && (
                            <button
                              onClick={() => handleRevokeCode(c.code)}
                              className="p-1 rounded bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                              title="إلغاء الكود"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 5: DOCTORS AVATARS */}
      {activeTab === 'doctors' && (
        <div className="bg-[#0D1B2A] border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-base font-bold text-white">إدارة وإعدادات الدكاترة الافتراضيين</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {doctors.map((d) => (
              <div key={d.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <img src={d.avatarUrl || OFFICIAL_LOGO_URL} alt={d.name} className="w-12 h-12 rounded-xl object-cover" />
                  <div>
                    <h4 className="font-bold text-white text-xs">{d.name}</h4>
                    <span className="text-[10px] text-cyan-400 block">{d.subject}</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{d.description}</p>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-mono">السرعة: {d.voiceSpeed}x</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
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
        <div className="bg-[#0D1B2A] border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-base font-bold text-white">إدارة المحتوى والمكتبة الهندسية</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-cyan-400">كتب المكتبة الهندسية المعتمدة ({books.length}):</h4>
              {books.map((b) => (
                <div key={b.id} className="p-2.5 rounded-lg bg-slate-800/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white block">{b.title}</span>
                    <span className="text-[10px] text-slate-400">{b.category} • {b.pages} صفحة</span>
                  </div>
                  <span className="text-amber-400 font-mono text-[11px]">★ {b.rating}</span>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-cyan-400">المشاريع والمحاضرات المحفوظة ({projects.length}):</h4>
              {projects.map((p) => (
                <div key={p.id} className="p-2.5 rounded-lg bg-slate-800/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white block">{p.title}</span>
                    <span className="text-[10px] text-slate-400">بواسطة: {p.authorName}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px]">
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
        <div className="bg-[#0D1B2A] border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-base font-bold text-white">التحكم بالمختبر ثلاثي الأبعاد 3D Simulaton</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { title: 'مختبر الدوائر الكهربائية DC/AC', status: 'مفعل 100%' },
              { title: 'مختبر المحاكات Arduino & Sensors', status: 'مفعل 100%' },
              { title: 'مختبر حركة الذراع الروبوتية 3D', status: 'مفعل 100%' },
            ].map((lab, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <h4 className="font-bold text-white text-xs">{lab.title}</h4>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  {lab.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 8: AI QUOTA & ERROR 429 MANAGER */}
      {activeTab === 'ai_quota' && (
        <div className="bg-[#0D1B2A] border border-amber-500/30 p-6 rounded-2xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span>إدارة استهلاك محرك الذكاء الاصطناعي وحلول خطأ 429</span>
          </h3>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-cyan-400 border-b border-slate-800 pb-2">
              <span>اسم النموذج المستعمل: gemini-3.8-flash</span>
              <span className="text-emerald-400">الحالة: نشط ومحمي عبر الخادم</span>
            </div>
            <div className="space-y-1.5 text-slate-300">
              <div>• نظام التراجع الأسّي (Exponential Backoff + Jitter): مفعّل تلقائياً عند تلقي 429</div>
              <div>• قفل الطلبات المتزامنة (Request Lock Middleware): يمنع تكرار النقرات على زر الشرح</div>
              <div>• اقتطاع النصوص الطويلة (Token Budget Limit): بحد أقصى 1500 توكن لكل طلب لشرح المحاضرة</div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 9: AVATAR & WHITEBOARD */}
      {activeTab === 'avatar' && (
        <div className="bg-[#0D1B2A] border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-base font-bold text-white">إعدادات الشخصية الافتراضية والسبورة التفاعلية</h3>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">حساسية مزامنة الشفاه مع الصوت (Lip Sync):</span>
              <span className="font-mono text-amber-400 font-bold">عالية (100%)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">سرعة كتابة المعادلات على السبورة:</span>
              <span className="font-mono text-cyan-400 font-bold">1.2x</span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 10: SECURITY AUDIT & SYSTEM LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-[#0D1B2A] border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-400" />
              <span>سجل الأمان وتدقيق العمليات الحية (Audit Logs)</span>
            </h3>
            <button
              onClick={fetchLogs}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>تحديث السجل</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-3 px-4">التاريخ والوقت</th>
                  <th className="py-3 px-4">نوع الحدث</th>
                  <th className="py-3 px-4">الفئة</th>
                  <th className="py-3 px-4">عنوان IP</th>
                  <th className="py-3 px-4">تفاصيل العملية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">لا توجد سجلات أمان حالياً</td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-800/50">
                      <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                        {new Date(l.timestamp).toLocaleTimeString('ar-EG')}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-white font-sans">{l.event}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            l.severity === 'danger'
                              ? 'bg-rose-500/20 text-rose-300'
                              : l.severity === 'warning'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-cyan-500/20 text-cyan-300'
                          }`}
                        >
                          {l.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-cyan-300">{l.ip}</td>
                      <td className="py-2.5 px-4 text-slate-300 font-sans text-[11px]">{l.details}</td>
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
        <div className="bg-[#0D1B2A] border border-slate-800 p-6 rounded-2xl space-y-6">
          <h3 className="text-base font-bold text-white">إعدادات النظام وتخصيص الهوية</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-white text-xs block">وضع الصيانة العامة (Maintenance Mode)</span>
                <span className="text-[11px] text-slate-400">إيقاف استقبال تفعيل الأكواد مؤقتاً</span>
              </div>
              <button
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  maintenanceMode ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'
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
        <div className="bg-[#0D1B2A] border border-slate-800 p-6 rounded-2xl space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-400" />
            <span>التقارير المالية وإجمالي أرباح اشتراكات 300 كود</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 font-bold block">إجمالي القيمة الكلية لـ 300 كود:</span>
              <div className="text-2xl font-extrabold font-mono text-amber-400">
                {(300 * 4000).toLocaleString()} YER
              </div>
              <p className="text-[10px] text-slate-400">300 كود × 4000 ريال يمني</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 font-bold block">الإيرادات المحصلة فعلياً:</span>
              <div className="text-2xl font-extrabold font-mono text-emerald-400">
                {stats.totalRevenueYER.toLocaleString()} YER
              </div>
              <p className="text-[10px] text-emerald-300">من الطلاب الذين قاموا بتفعيل الأكواد</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 font-bold block">القيمة المتبقية من الأكواد غير المستخدمة:</span>
              <div className="text-2xl font-extrabold font-mono text-cyan-300">
                {(stats.unusedCount * 4000).toLocaleString()} YER
              </div>
              <p className="text-[10px] text-cyan-300/80">{stats.unusedCount} كود غير مستخدم</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
