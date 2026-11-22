import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Send,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Paperclip,
  CheckCircle2,
  Clock,
  AlertCircle,
  Lock,
  LogOut,
  ShieldCheck,
  Building2,
  BookOpen,
  HelpCircle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  DoctorQuestion,
  DoctorMessage,
  fetchDoctorQuestions,
  fetchDoctorMessages,
  sendDoctorMessage,
  updateQuestionStatus,
} from '../../services/doctorQaService';

interface QuickTemplate {
  id: string;
  title: string;
  content: string;
}

const DEFAULT_TEMPLATES: QuickTemplate[] = [
  { id: '1', title: 'ترحيب وشرح مفصل', content: 'أهلاً بك يا مهندس، لقد تم مراجعة سؤالك بعناية وإليك الشرح التفصيلي:' },
  { id: '2', title: 'طلب توضيح', content: 'يرجى توضيح الخطوة الرياضية أو الرسم الهندسي أكثر في ردك القادم.' },
  { id: '3', title: 'إرفاق ملف الحل', content: 'تم إرفاق الشرح الكامل والحل النموذجي في المرفق أدناه، طالع التفاصيل.' },
  { id: '4', title: 'ثناء وتشجيع', content: 'أحسنت طرح السؤال، هذه النقطة أساسية ومهمة جداً في تطبيقات الميكاترونكس وأنظمة التحكم.' },
  { id: '5', title: 'إغلاق المسألة', content: 'تم بحمد الله توضيح المسألة وحلها بالكامل. لا تتردد في طرح أي استفسار آخر.' },
];

interface DoctorDashboardPageProps {
  onExit?: () => void;
}

export const DoctorDashboardPage: React.FC<DoctorDashboardPageProps> = ({ onExit }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('dr_smart_doctor_auth') === 'true';
    } catch {
      return false;
    }
  });
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<DoctorQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'جديد' | 'قيد المراجعة' | 'تمت الإجابة' | 'عاجل' | 'مغلق'>('all');

  const [selectedQuestion, setSelectedQuestion] = useState<DoctorQuestion | null>(null);
  const [messages, setMessages] = useState<DoctorMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [doctorReply, setDoctorReply] = useState('');
  const [replyAttachmentUrl, setReplyAttachmentUrl] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const [quickTemplates, setQuickTemplates] = useState<QuickTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('dr_smart_quick_templates');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_TEMPLATES;
  });
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');

  const handleAddTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateTitle.trim() || !newTemplateContent.trim()) return;
    const newItem: QuickTemplate = {
      id: Date.now().toString(),
      title: newTemplateTitle.trim(),
      content: newTemplateContent.trim(),
    };
    const updated = [...quickTemplates, newItem];
    setQuickTemplates(updated);
    try {
      localStorage.setItem('dr_smart_quick_templates', JSON.stringify(updated));
    } catch {}
    setNewTemplateTitle('');
    setNewTemplateContent('');
    setShowNewTemplateModal(false);
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = quickTemplates.filter((t) => t.id !== id);
    setQuickTemplates(updated);
    try {
      localStorage.setItem('dr_smart_quick_templates', JSON.stringify(updated));
    } catch {}
  };

  const handleDoctorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    // Doctor passcode: "doctor2025" or owner password
    if (passcode.trim() === 'doctor2025' || passcode.trim() === 'admin123' || passcode.trim() === '123456') {
      setIsAuthenticated(true);
      try {
        localStorage.setItem('dr_smart_doctor_auth', 'true');
      } catch {}
    } else {
      setAuthError('كلمة مرور الدكتور غير صحيحة. (جرب: doctor2025)');
    }
  };

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDoctorQuestions();
      setQuestions(data);
      if (selectedQuestion) {
        const updatedSelected = data.find((q) => String(q.id) === String(selectedQuestion.id));
        if (updatedSelected) setSelectedQuestion(updatedSelected);
      }
    } catch (e) {
      console.error('Error loading doctor questions:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedQuestion]);

  useEffect(() => {
    if (isAuthenticated) {
      loadQuestions();
    }
  }, [isAuthenticated, loadQuestions]);

  const loadMessages = useCallback(async (qId: string | number) => {
    setLoadingMessages(true);
    try {
      const msgs = await fetchDoctorMessages(qId);
      setMessages(msgs);
    } catch (e) {
      console.error('Error loading doctor messages:', e);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedQuestion) {
      loadMessages(selectedQuestion.id);
      // If status is 'جديد', update to 'قيد المراجعة'
      if (selectedQuestion.status === 'جديد') {
        updateQuestionStatus(selectedQuestion.id, 'قيد المراجعة');
      }
    }
  }, [selectedQuestion, loadMessages]);

  const stats = useMemo(() => {
    const totalCount = questions.length;
    const newCount = questions.filter((q) => q.status === 'جديد').length;
    const inReviewCount = questions.filter((q) => q.status === 'قيد المراجعة').length;
    const answeredCount = questions.filter((q) => q.status === 'تمت الإجابة').length;
    const urgentCount = questions.filter((q) => q.priority === 'عاجل').length;
    return { totalCount, newCount, inReviewCount, answeredCount, urgentCount };
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return questions.filter((item) => {
      if (filterTab === 'جديد' && item.status !== 'جديد') return false;
      if (filterTab === 'قيد المراجعة' && item.status !== 'قيد المراجعة') return false;
      if (filterTab === 'تمت الإجابة' && item.status !== 'تمت الإجابة') return false;
      if (filterTab === 'مغلق' && item.status !== 'مغلق') return false;
      if (filterTab === 'عاجل' && item.priority !== 'عاجل') return false;

      if (!q) return true;
      const studentName = String(item.student_name || '').toLowerCase();
      const qNum = String(item.question_number || '').toLowerCase();
      const subject = String(item.subject || '').toLowerCase();
      const lecture = String(item.lecture || '').toLowerCase();
      const university = String(item.university || '').toLowerCase();
      const title = String(item.title || '').toLowerCase();

      return (
        studentName.includes(q) ||
        qNum.includes(q) ||
        subject.includes(q) ||
        lecture.includes(q) ||
        university.includes(q) ||
        title.includes(q)
      );
    });
  }, [questions, filterTab, searchQuery]);

  const handleSendDoctorAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorReply.trim() || !selectedQuestion) return;

    setSendingReply(true);
    try {
      const newMsg = await sendDoctorMessage({
        question_id: selectedQuestion.id,
        sender_id: 'dr_mechatronics_main',
        sender_type: 'doctor',
        message: doctorReply.trim(),
        attachment_url: replyAttachmentUrl.trim() || null,
        studentUserId: selectedQuestion.student_id,
        questionTitle: selectedQuestion.title,
      });

      setMessages((prev) => [...prev, newMsg]);
      setDoctorReply('');
      setReplyAttachmentUrl('');
      await loadQuestions();
    } catch (e) {
      console.error('Error sending doctor answer:', e);
    } finally {
      setSendingReply(false);
    }
  };

  const handleStatusChange = async (newStatus: 'جديد' | 'قيد المراجعة' | 'تمت الإجابة' | 'مغلق') => {
    if (!selectedQuestion) return;
    await updateQuestionStatus(selectedQuestion.id, newStatus, newStatus === 'تمت الإجابة');
    await loadQuestions();
    setSelectedQuestion((prev) => (prev ? { ...prev, status: newStatus } : null));
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md champagne-card p-8 rounded-3xl shadow-2xl space-y-6 text-right">
          <div className="flex items-center gap-3.5 border-b border-[rgba(212,175,55,0.25)] dark:border-amber-500/20 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-2xl">
              👨‍🏫
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0F172A] dark:text-white">تسجيل دخول لوحة الدكتور</h2>
              <p className="text-xs text-[#475569] dark:text-slate-400">خاص بأستاذ المادة والدكتور المسؤول</p>
            </div>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 text-rose-700 dark:text-rose-200 text-xs font-bold">
              {authError}
            </div>
          )}

          <form onSubmit={handleDoctorLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-200 mb-1.5">
                كلمة مرور الدكتور (Passcode)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  required
                  placeholder="أدخل كلمة مرور الدكتور"
                  className="w-full pr-9 pl-3.5 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-[#0F172A] dark:text-white focus:border-[#0EA5E9] focus:outline-none font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">تجريبي: <code className="font-mono text-amber-500">doctor2025</code></p>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-gradient-to-r dark:from-amber-400 dark:to-yellow-500 dark:text-slate-950 text-white font-black text-xs shadow-md transition-all cursor-pointer"
            >
              تسجيل الدخول للوحة الدكتور
            </button>
          </form>

          {onExit && (
            <div className="pt-2 text-center">
              <button type="button" onClick={onExit} className="text-xs text-[#0284C7] dark:text-cyan-400 underline cursor-pointer">
                العودة للمنصة الرئيسية
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 font-sans text-[#0F172A] dark:text-slate-100 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 champagne-card p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3.5 text-right">
          <div className="w-14 h-14 rounded-2xl bg-[#E0F2FE] dark:bg-amber-400/15 border border-[#0EA5E9]/40 dark:border-amber-400/50 flex items-center justify-center text-3xl">
            👨‍🏫
          </div>
          <div>
            <span className="text-[11px] font-black text-[#0284C7] dark:text-amber-300 block">
              لوحة التحكم والإدارة الأكاديمية
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-white">
              لوحة الدكتور - صندوق أسئلة الطلاب
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadQuestions}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث البيانات</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAuthenticated(false);
              try {
                localStorage.removeItem('dr_smart_doctor_auth');
              } catch {}
              if (onExit) onExit();
            }}
            className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>خروج</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="champagne-card p-4 rounded-2xl space-y-1 text-right">
          <span className="text-[11px] font-bold text-[#475569] dark:text-slate-400">📨 إجمالي الأسئلة</span>
          <div className="text-2xl font-black font-mono text-[#0F172A] dark:text-white">{stats.totalCount}</div>
        </div>
        <div className="champagne-card p-4 rounded-2xl space-y-1 text-right border-amber-400/40">
          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">🆕 الأسئلة الجديدة</span>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-300">{stats.newCount}</div>
        </div>
        <div className="champagne-card p-4 rounded-2xl space-y-1 text-right border-blue-400/40">
          <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400">⏳ قيد المراجعة</span>
          <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-300">{stats.inReviewCount}</div>
        </div>
        <div className="champagne-card p-4 rounded-2xl space-y-1 text-right border-emerald-400/40">
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">✅ تمت الإجابة</span>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-300">{stats.answeredCount}</div>
        </div>
        <div className="champagne-card p-4 rounded-2xl space-y-1 text-right col-span-2 sm:col-span-1 border-rose-400/40">
          <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400">🔴 العاجلة</span>
          <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-300">{stats.urgentCount}</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 champagne-card p-4 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم، رقم السؤال، المادة، الجامعة..."
            className="w-full pr-9 pl-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-[#0F172A] dark:text-white placeholder:text-slate-400 focus:border-[#0EA5E9] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs w-full sm:w-auto">
          {[
            { id: 'all', label: 'جميع الأسئلة' },
            { id: 'جديد', label: '🆕 الجديدة' },
            { id: 'قيد المراجعة', label: '⏳ قيد المراجعة' },
            { id: 'تمت الإجابة', label: '✅ تمت الإجابة' },
            { id: 'عاجل', label: '🔴 العاجلة' },
            { id: 'مغلق', label: '⚫ المغلقة' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                filterTab === tab.id
                  ? 'bg-[#0EA5E9] text-white dark:bg-amber-500 dark:text-slate-950'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#475569] dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inbox Grid & Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List of Student Questions */}
        <div className="lg:col-span-5 space-y-3 max-h-[650px] overflow-y-auto pr-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">جاري جلب أسئلة الطلاب...</div>
          ) : filteredQuestions.length === 0 ? (
            <div className="py-16 text-center champagne-card p-6 rounded-2xl space-y-2">
              <div className="text-3xl">📭</div>
              <p className="text-xs font-bold text-[#475569] dark:text-slate-400">
                لا توجد أسئلة جديدة حاليًا.
              </p>
            </div>
          ) : (
            filteredQuestions.map((q) => {
              const isSelected = selectedQuestion?.id === q.id;
              const isNew = q.status === 'جديد';
              return (
                <div
                  key={q.id}
                  onClick={() => setSelectedQuestion(q)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer text-right space-y-2.5 ${
                    isSelected
                      ? 'bg-[#E0F2FE]/70 dark:bg-cyan-500/15 border-[#0EA5E9] dark:border-amber-400 shadow-md'
                      : 'bg-white dark:bg-[#07152B] border-slate-200 dark:border-slate-800 hover:border-[#0EA5E9]/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#0EA5E9] dark:text-amber-400">
                        {q.question_number}
                      </span>
                      {isNew && (
                        <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-[10px] font-black animate-pulse">
                          🔴 جديد
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {q.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-black text-[#0F172A] dark:text-white">
                    <span>{q.student_name}</span>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-mono">
                      {q.priority}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-[#334155] dark:text-slate-300 line-clamp-1">
                    {q.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#64748B] dark:text-slate-400">
                    <span>📚 {q.subject}</span>
                    <span>🏛️ {q.university}</span>
                    <span>⏰ {new Date(q.created_at).toLocaleDateString('ar-EG')}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Detail & Reply View */}
        <div className="lg:col-span-7">
          {selectedQuestion ? (
            <div className="champagne-card p-6 sm:p-7 rounded-3xl space-y-5 shadow-xl text-right">
              {/* Question Header & Status Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(212,175,55,0.25)] dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black text-[#0EA5E9] dark:text-amber-400">
                      {selectedQuestion.question_number}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 font-bold text-[10px]">
                      {selectedQuestion.status}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 font-bold text-[10px]">
                      {selectedQuestion.priority}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-white mt-1">
                    {selectedQuestion.title}
                  </h2>
                </div>

                {/* Change status buttons */}
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedQuestion.status}
                    onChange={(e) => handleStatusChange(e.target.value as any)}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-[#0F172A] dark:text-white"
                  >
                    <option value="جديد">جديد</option>
                    <option value="قيد المراجعة">قيد المراجعة</option>
                    <option value="تمت الإجابة">تمت الإجابة</option>
                    <option value="مغلق">مغلق</option>
                  </select>
                </div>
              </div>

              {/* Student info card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 text-xs">
                <div>
                  <span className="text-[#64748B] block text-[10px]">اسم الطالب:</span>
                  <strong className="text-[#0F172A] dark:text-white">{selectedQuestion.student_name}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[10px]">المستوى:</span>
                  <strong className="text-[#0F172A] dark:text-white">{selectedQuestion.level}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[10px]">الجامعة:</span>
                  <strong className="text-[#0F172A] dark:text-white">{selectedQuestion.university}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[10px]">المادة:</span>
                  <strong className="text-[#0F172A] dark:text-white">{selectedQuestion.subject}</strong>
                </div>
              </div>

              {/* Conversation Messages */}
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2">
                {loadingMessages ? (
                  <div className="py-6 text-center text-xs text-slate-400">جاري تحميل المحادثة...</div>
                ) : (
                  messages.map((msg) => {
                    const isDoctor = msg.sender_type === 'doctor';
                    return (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-2xl space-y-2 border ${
                          isDoctor
                            ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-500/40 text-right mr-6'
                            : 'bg-[#F8FAFC] dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-right ml-6'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs font-bold">
                          <span className={isDoctor ? 'text-amber-700 dark:text-amber-400' : 'text-[#0EA5E9] dark:text-cyan-400'}>
                            {isDoctor ? '👨‍🏫 رد الأستاذ الدكتور' : `👨‍🎓 ${selectedQuestion.student_name}`}
                          </span>
                          <span className="text-[10px] text-[#64748B] dark:text-slate-500 font-mono">
                            {new Date(msg.created_at).toLocaleString('ar-EG')}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-[#0F172A] dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {msg.message}
                        </p>

                        {msg.attachment_url && (
                          <div className="pt-2">
                            <a
                              href={msg.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-[#0284C7] dark:text-cyan-300 hover:underline"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                              <span>عرض المرفق</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Doctor Reply Form */}
              <form onSubmit={handleSendDoctorAnswer} className="pt-4 border-t border-[rgba(212,175,55,0.25)] dark:border-slate-800 space-y-3">
                {/* Quick Reply Templates Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#0F172A] dark:text-amber-300 flex items-center gap-1.5">
                      <span>⚡ قوالب الرد السريع:</span>
                      <span className="text-[10px] text-slate-400 font-normal">(انقر لإدراج الجملة فوراً)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNewTemplateModal(!showNewTemplateModal)}
                      className="text-[11px] text-[#0EA5E9] dark:text-cyan-400 font-bold hover:underline cursor-pointer"
                    >
                      {showNewTemplateModal ? 'إغلاق ✕' : '+ إضافة قالب جديد'}
                    </button>
                  </div>

                  {showNewTemplateModal && (
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 text-right">
                      <div className="text-xs font-bold text-[#0F172A] dark:text-white">إضافة قالب رد جديد</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={newTemplateTitle}
                          onChange={(e) => setNewTemplateTitle(e.target.value)}
                          placeholder="عنوان القالب (مثلاً: تنبيه مهم)..."
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-[#0F172A] dark:text-white"
                        />
                        <input
                          type="text"
                          value={newTemplateContent}
                          onChange={(e) => setNewTemplateContent(e.target.value)}
                          placeholder="نص الجملة أو الرد..."
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-[#0F172A] dark:text-white"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleAddTemplate}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow cursor-pointer"
                        >
                          حفظ القالب
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar py-1">
                    {quickTemplates.map((tpl) => (
                      <div
                        key={tpl.id}
                        onClick={() => {
                          setDoctorReply((prev) => (prev ? prev + '\n' + tpl.content : tpl.content));
                        }}
                        className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300/60 dark:border-amber-500/30 text-xs font-bold text-[#0F172A] dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all cursor-pointer shadow-xs"
                        title={tpl.content}
                      >
                        <span>⚡ {tpl.title}</span>
                        {quickTemplates.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                            className="text-slate-400 hover:text-rose-600 text-[10px] ml-0.5"
                            title="حذف القالب"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <label className="block text-xs font-bold text-[#0F172A] dark:text-amber-300 pt-2">
                  ✍️ رد الدكتور (كتابة الإجابة والشرح العلمي):
                </label>
                <textarea
                  rows={4}
                  value={doctorReply}
                  onChange={(e) => setDoctorReply(e.target.value)}
                  required
                  placeholder="اكتب الإجابة المفصلة والشرح الخطي أو الرياضي هنا..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-[#0F172A] dark:text-white focus:border-[#0EA5E9] dark:focus:border-amber-400 focus:outline-none leading-relaxed"
                />

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="url"
                    value={replyAttachmentUrl}
                    onChange={(e) => setReplyAttachmentUrl(e.target.value)}
                    placeholder="رابط مرفق إضافي أو فيديو شرح (اختياري)..."
                    className="w-full sm:flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-[#0F172A] dark:text-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sendingReply || !doctorReply.trim()}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-gradient-to-r dark:from-amber-400 dark:to-yellow-500 dark:text-slate-950 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>📨 إرسال الإجابة للطالب</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="champagne-card p-12 rounded-3xl text-center space-y-3 shadow-xl">
              <div className="text-3xl">👈</div>
              <h3 className="text-base font-black text-[#0F172A] dark:text-white">اختر سؤالاً من صندوق الوارد</h3>
              <p className="text-xs text-[#475569] dark:text-slate-400">
                لعرض تفاصيل سؤال الطالب، المرفقات، وكتابة الرد العلمي الشامل.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
