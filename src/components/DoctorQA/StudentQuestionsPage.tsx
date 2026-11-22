import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  ArrowRight,
  ExternalLink,
  Paperclip,
  RefreshCw,
  Building2,
  BookOpen,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { UserProfile } from '../../types';
import {
  DoctorQuestion,
  DoctorMessage,
  fetchDoctorQuestions,
  fetchDoctorMessages,
  sendDoctorMessage,
} from '../../services/doctorQaService';

interface StudentQuestionsPageProps {
  user: UserProfile;
  setCurrentTab: (tab: string) => void;
  initialSelectedQuestionId?: string | number | null;
}

export const StudentQuestionsPage: React.FC<StudentQuestionsPageProps> = ({
  user,
  setCurrentTab,
  initialSelectedQuestionId,
}) => {
  const [questions, setQuestions] = useState<DoctorQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<DoctorQuestion | null>(null);
  const [messages, setMessages] = useState<DoctorMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [followupText, setFollowupText] = useState('');
  const [sendingFollowup, setSendingFollowup] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const allQ = await fetchDoctorQuestions();
      // Filter for current student (or all if owner/admin)
      const myQ =
        user.role === 'owner'
          ? allQ
          : allQ.filter((q) => String(q.student_id) === String(user.id));
      setQuestions(myQ);

      if (initialSelectedQuestionId) {
        const found = myQ.find((q) => String(q.id) === String(initialSelectedQuestionId));
        if (found) {
          setSelectedQuestion(found);
        }
      } else if (myQ.length > 0 && !selectedQuestion) {
        // default select first
      }
    } catch (e) {
      console.error('Error loading questions:', e);
    } finally {
      setLoading(false);
    }
  }, [user.id, user.role, initialSelectedQuestionId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const loadMessagesForQuestion = useCallback(async (qId: string | number) => {
    setLoadingMessages(true);
    try {
      const msgs = await fetchDoctorMessages(qId);
      setMessages(msgs);
    } catch (e) {
      console.error('Error loading messages:', e);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedQuestion) {
      loadMessagesForQuestion(selectedQuestion.id);
    }
  }, [selectedQuestion, loadMessagesForQuestion]);

  const handleSendFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupText.trim() || !selectedQuestion) return;

    setSendingFollowup(true);
    try {
      const newMsg = await sendDoctorMessage({
        question_id: selectedQuestion.id,
        sender_id: user.id || 'guest_student',
        sender_type: 'student',
        message: followupText.trim(),
      });
      setMessages((prev) => [...prev, newMsg]);
      setFollowupText('');
      // Refresh questions list status
      loadQuestions();
    } catch (e) {
      console.error('Error sending followup:', e);
    } finally {
      setSendingFollowup(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'جديد':
        return <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 font-bold text-[10px]">🟠 جديد</span>;
      case 'قيد المراجعة':
        return <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 font-bold text-[10px]">🔵 قيد المراجعة</span>;
      case 'تمت الإجابة':
        return <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 font-bold text-[10px]">🟢 تمت الإجابة</span>;
      case 'مغلق':
        return <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 font-bold text-[10px]">⚫ مغلق</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px]">{status}</span>;
    }
  };

  const filteredQuestions = questions.filter((q) => {
    if (filterStatus === 'all') return true;
    return q.status === filterStatus;
  });

  return (
    <div className="space-y-6 pb-16 font-sans text-[#0F172A] dark:text-slate-100 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentTab('home')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-800 text-xs font-bold text-[#0F172A] dark:text-slate-200 hover:text-[#0EA5E9] dark:hover:text-cyan-400 transition-colors shadow-sm cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>الرئيسية</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-white flex items-center gap-2">
            <span>📨 أسئلتي للدكتور والاستفسارات</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadQuestions}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentTab('ask_doctor')}
            className="px-4 py-2 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-gradient-to-r dark:from-amber-400 dark:to-yellow-500 dark:text-slate-950 text-white font-black text-xs shadow-md cursor-pointer"
          >
            + طرح سؤال جديد
          </button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Right List of Questions */}
        <div className="lg:col-span-5 space-y-3">
          {/* Status Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
            {[
              { id: 'all', label: `الكل (${questions.length})` },
              { id: 'جديد', label: '🟠 جديد' },
              { id: 'قيد المراجعة', label: '🔵 قيد المراجعة' },
              { id: 'تمت الإجابة', label: '🟢 تمت الإجابة' },
              { id: 'مغلق', label: '⚫ مغلق' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                  filterStatus === f.id
                    ? 'bg-[#0EA5E9] text-white dark:bg-amber-500 dark:text-slate-950'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#475569] dark:text-slate-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">جاري تحميل الأسئلة...</div>
            ) : filteredQuestions.length === 0 ? (
              <div className="py-16 text-center champagne-card p-6 rounded-2xl space-y-3">
                <div className="text-3xl">📭</div>
                <p className="text-xs font-bold text-[#475569] dark:text-slate-400">
                  لا توجد أسئلة حالياً. اطرح سؤالك الأول الآن!
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentTab('ask_doctor')}
                  className="px-4 py-2 rounded-xl bg-[#0EA5E9] text-white text-xs font-bold cursor-pointer"
                >
                  اسأل الدكتور
                </button>
              </div>
            ) : (
              filteredQuestions.map((q) => {
                const isSelected = selectedQuestion?.id === q.id;
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
                      <span className="text-xs font-mono font-bold text-[#0EA5E9] dark:text-amber-400">
                        {q.question_number}
                      </span>
                      {getStatusBadge(q.status)}
                    </div>

                    <h3 className="text-sm font-black text-[#0F172A] dark:text-white line-clamp-1">
                      {q.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#475569] dark:text-slate-400">
                      <span className="flex items-center gap-1 font-bold text-[#0284C7] dark:text-cyan-300">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{q.subject}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(q.created_at).toLocaleDateString('ar-EG')}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Details & Conversation Thread */}
        <div className="lg:col-span-7">
          {selectedQuestion ? (
            <div className="champagne-card p-6 rounded-3xl space-y-5 shadow-xl text-right">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(212,175,55,0.25)] dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black text-[#0EA5E9] dark:text-amber-400">
                      {selectedQuestion.question_number}
                    </span>
                    {getStatusBadge(selectedQuestion.status)}
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                      أهمية: {selectedQuestion.priority}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-white mt-1">
                    {selectedQuestion.title}
                  </h2>
                </div>

                <div className="text-xs text-[#475569] dark:text-slate-400 font-mono">
                  {new Date(selectedQuestion.created_at).toLocaleString('ar-EG')}
                </div>
              </div>

              {/* Question Metadata bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-xs">
                <div>
                  <span className="text-[#64748B] block text-[10px]">المادة:</span>
                  <strong className="text-[#0F172A] dark:text-slate-200">{selectedQuestion.subject}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[10px]">المحاضرة:</span>
                  <strong className="text-[#0F172A] dark:text-slate-200">{selectedQuestion.lecture}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[10px]">المستوى:</span>
                  <strong className="text-[#0F172A] dark:text-slate-200">{selectedQuestion.level}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[10px]">الجامعة:</span>
                  <strong className="text-[#0F172A] dark:text-slate-200">{selectedQuestion.university}</strong>
                </div>
              </div>

              {/* Chat Thread Messages */}
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
                {loadingMessages ? (
                  <div className="py-8 text-center text-xs text-slate-400">جاري تحميل المحادثة...</div>
                ) : messages.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 text-center">
                    {selectedQuestion.question_text}
                  </div>
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
                            {isDoctor ? '👨‍🏫 رد الأستاذ الدكتور' : `👨‍🎓 ${selectedQuestion.student_name} (أنت)`}
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
                              <span>عرض المرفق / المستند</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Follow-up / Reply Input for Student */}
              <form onSubmit={handleSendFollowup} className="pt-3 border-t border-[rgba(212,175,55,0.25)] dark:border-slate-800 space-y-3">
                <div className="relative">
                  <textarea
                    rows={2}
                    value={followupText}
                    onChange={(e) => setFollowupText(e.target.value)}
                    placeholder="أرسل رسالة متابعة أو توضيح إضافي للدكتور..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-[#0F172A] dark:text-white focus:border-[#0EA5E9] dark:focus:border-amber-400 focus:outline-none leading-relaxed"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#64748B] dark:text-slate-400">
                    يمكنك إرسال متابعة إذا احتجت إلى توضيح إضافي.
                  </span>
                  <button
                    type="submit"
                    disabled={sendingFollowup || !followupText.trim()}
                    className="px-5 py-2.5 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-gradient-to-r dark:from-amber-400 dark:to-yellow-500 dark:text-slate-950 text-white font-black text-xs flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>إرسال متابعة</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="champagne-card p-12 rounded-3xl text-center space-y-3 shadow-xl">
              <div className="text-3xl">👈</div>
              <h3 className="text-base font-black text-[#0F172A] dark:text-white">اختر سؤالاً من القائمة الجانبية</h3>
              <p className="text-xs text-[#475569] dark:text-slate-400">
                لعرض تفاصيل السؤال، ردود الدكتور، ومتابعة المحادثة.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
