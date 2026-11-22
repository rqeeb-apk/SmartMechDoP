import React, { useState } from 'react';
import {
  Send,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Building2,
  GraduationCap,
  BookOpen,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { UserProfile } from '../../types';
import { createDoctorQuestion, sendDoctorMessage } from '../../services/doctorQaService';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';

interface AskDoctorPageProps {
  user: UserProfile;
  setCurrentTab: (tab: string) => void;
  onOpenQuestionDetail?: (questionId: string | number) => void;
}

export const AskDoctorPage: React.FC<AskDoctorPageProps> = ({ user, setCurrentTab, onOpenQuestionDetail }) => {
  const [studentName, setStudentName] = useState(user.name || '');
  const [level, setLevel] = useState(user.level || 'السنة الأولى');
  const [university, setUniversity] = useState(user.university || 'جامعة صنعاء');
  const [major, setMajor] = useState(user.specialization || 'هندسة الميكاترونكس والنظم المدمجة');
  const [subject, setSubject] = useState('');
  const [lecture, setLecture] = useState('');
  const [title, setTitle] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [priority, setPriority] = useState<'عادي' | 'مهم' | 'عاجل'>('عادي');

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ questionNumber: string; questionId: string | number } | null>(null);

  const handleUploadFileToStorage = async (file: File): Promise<string | null> => {
    if (!supabase || !isSupabaseConfigured) return null;
    try {
      const extMatch = file.name.match(/\.[a-z0-9]+$/i);
      const ext = extMatch ? extMatch[0].toLowerCase() : '.bin';
      const path = `qa_attachments/${user.id || 'guest'}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}${ext}`;
      const { error: upErr } = await supabase.storage.from('student_uploads').upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('student_uploads').getPublicUrl(path);
      return pub?.publicUrl || null;
    } catch (e) {
      console.warn('Storage upload error:', e);
      return null;
    }
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!studentName.trim() || !university.trim() || !subject.trim() || !title.trim() || !questionText.trim()) {
      setError('يرجى تعبئة الحقول الأساسية (اسم الطالب، الجامعة، المادة، عنوان السؤال، وتفاصيل السؤال).');
      return;
    }

    setLoading(true);
    try {
      let attachmentUrl: string | null = null;
      if (imageFile) {
        attachmentUrl = await handleUploadFileToStorage(imageFile);
      } else if (pdfFile) {
        attachmentUrl = await handleUploadFileToStorage(pdfFile);
      }

      const newQ = await createDoctorQuestion({
        student_id: user.id || 'guest_student',
        student_name: studentName.trim(),
        university: university.trim(),
        level,
        major: major.trim(),
        subject: subject.trim(),
        lecture: lecture.trim() || 'المحاضرة العامة',
        title: title.trim(),
        question_text: questionText.trim(),
        priority,
        attachment_url: attachmentUrl,
      });

      // Also create initial message entry
      await sendDoctorMessage({
        question_id: newQ.id,
        sender_id: user.id || 'guest_student',
        sender_type: 'student',
        message: questionText.trim(),
        attachment_url: attachmentUrl,
      });

      setSuccessResult({
        questionNumber: newQ.question_number,
        questionId: newQ.id,
      });
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء إرسال السؤال للدكتور.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 font-sans text-[#0F172A] dark:text-slate-100 max-w-4xl mx-auto">
      {/* Top Navigation & Header */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setCurrentTab('home')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-800 text-xs font-bold text-[#0F172A] dark:text-slate-200 hover:text-[#0EA5E9] dark:hover:text-cyan-400 transition-colors shadow-sm cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة للرئيسية</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('student_questions')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-gradient-to-r dark:from-amber-400 dark:to-yellow-500 dark:text-slate-950 text-white font-black text-xs shadow-md transition-all cursor-pointer"
        >
          <span>📨 أسئلتي المرسلة</span>
        </button>
      </div>

      <div className="rounded-3xl champagne-card dark:bg-gradient-to-br dark:from-[#07152B] dark:via-[#0A1F3D] dark:to-[#061224] dark:border-cyan-500/40 p-6 sm:p-8 shadow-xl text-right">
        <div className="flex items-center gap-3.5 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] dark:bg-amber-400/15 border border-[#0EA5E9]/40 dark:border-amber-400/50 flex items-center justify-center text-2xl shrink-0">
            👨‍🏫
          </div>
          <div>
            <span className="text-[11px] font-black text-[#0284C7] dark:text-amber-300 block">
              خدمة الاستشارات الأكاديمية والمتابعة المباشرة
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-white">
              اسأل الدكتور - تواصل مع دكتور الميكاترونكس
            </h1>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          أرسل استفسارك عن المحاضرات، الدروس، أو المسائل العلمية الصعبة. سيقوم الدكتور بمراجعة سؤالك والإجابة عليه خطوة بخطوة.
        </p>
      </div>

      {successResult ? (
        <div className="champagne-card p-8 rounded-3xl text-center space-y-6 shadow-2xl dark:border-emerald-500/40">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-3xl">
            ✅
          </div>
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-white">
              تم إرسال سؤالك بنجاح إلى الدكتور!
            </h2>
            <p className="text-xs text-[#475569] dark:text-slate-300">
              رقم السؤال المرجعي الفريد الخاص بك:
            </p>
            <div className="inline-block px-4 py-2 rounded-xl bg-amber-50 dark:bg-slate-900 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 font-mono font-black text-lg">
              {successResult.questionNumber}
            </div>
            <p className="text-xs text-[#475569] dark:text-slate-400">
              تم حفظ تاريخ ووقت الإرسال وسيتم إشعارك فور رد الدكتور على استفسارك.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                if (onOpenQuestionDetail) {
                  onOpenQuestionDetail(successResult.questionId);
                } else {
                  setCurrentTab('student_questions');
                }
              }}
              className="px-6 py-3 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-gradient-to-r dark:from-amber-400 dark:to-yellow-500 dark:text-slate-950 text-white font-black text-xs shadow-md cursor-pointer"
            >
              عرض السؤال والمحادثة
            </button>
            <button
              type="button"
              onClick={() => {
                setSuccessResult(null);
                setSubject('');
                setLecture('');
                setTitle('');
                setQuestionText('');
                setImageFile(null);
                setPdfFile(null);
              }}
              className="px-6 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[#0F172A] dark:text-slate-200 font-bold text-xs cursor-pointer"
            >
              طرح سؤال جديد
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmitQuestion} className="champagne-card p-6 sm:p-8 rounded-3xl space-y-5 shadow-xl text-right">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-200 text-xs font-bold flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. اسم الطالب */}
            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-200 mb-1.5">
                1. اسم الطالب
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
                placeholder="أدخل اسمك الكامل"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-[#0F172A] dark:text-white focus:border-[#0EA5E9] dark:focus:border-amber-400 focus:outline-none"
              />
            </div>

            {/* 2. المستوى الدراسي */}
            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-200 mb-1.5">
                2. المستوى الدراسي
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-[#0F172A] dark:text-white focus:border-[#0EA5E9] dark:focus:border-amber-400 focus:outline-none"
              >
                <option value="السنة الأولى">السنة الأولى</option>
                <option value="السنة الثانية">السنة الثانية</option>
                <option value="السنة الثالثة">السنة الثالثة</option>
                <option value="السنة الرابعة">السنة الرابعة</option>
                <option value="السنة الخامسة">السنة الخامسة</option>
              </select>
            </div>

            {/* 3. الجامعة */}
            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-200 mb-1.5">
                3. الجامعة
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="text"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  required
                  placeholder="مثال: جامعة صنعاء / جامعة العلوم والتكنولوجيا"
                  className="w-full pr-9 pl-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-[#0F172A] dark:text-white focus:border-[#0EA5E9] dark:focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* 4. التخصص */}
            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-200 mb-1.5">
                4. التخصص
              </label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="text"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  required
                  placeholder="مثال: هندسة الميكاترونكس والنظم المدمجة"
                  className="w-full pr-9 pl-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-[#0F172A] dark:text-white focus:border-[#0EA5E9] dark:focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* 5. المادة */}
            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-200 mb-1.5">
                5. المادة الهندسية
              </label>
              <div className="relative">
                <BookOpen className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  placeholder="مثال: التحكم الآلي Control Systems / دوائر كهربائية"
                  className="w-full pr-9 pl-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-[#0F172A] dark:text-white focus:border-[#0EA5E9] dark:focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* 6. اسم المحاضرة أو الدرس */}
            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-200 mb-1.5">
                6. اسم المحاضرة أو الدرس
              </label>
              <input
                type="text"
                value={lecture}
                onChange={(e) => setLecture(e.target.value)}
                placeholder="مثال: المحاضرة 3: تحويلات لابلاس وبلوك ديجرام"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-[#0F172A] dark:text-white focus:border-[#0EA5E9] dark:focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* 7. عنوان السؤال */}
          <div>
            <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-200 mb-1.5">
              7. عنوان السؤال أو الاستفسار
            </label>
            <div className="relative">
              <HelpCircle className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="مثال: كيف أوجد معادلة الانتقال Transfer Function لهذه الدائرة؟"
                className="w-full pr-9 pl-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-[#0F172A] dark:text-white focus:border-[#0EA5E9] dark:focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* 8. تفاصيل السؤال */}
          <div>
            <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-200 mb-1.5">
              8. تفاصيل السؤال أو المسألة العلمية
            </label>
            <textarea
              rows={5}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              required
              placeholder="اكتب تفاصيل سؤالك بوضوح، واذكر الخطوات التي حاولت حلها..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-[#0F172A] dark:text-white focus:border-[#0EA5E9] dark:focus:border-amber-400 focus:outline-none leading-relaxed"
            />
          </div>

          {/* 9 & 10. رفع صورة / ملف PDF */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-200">
                9. رفع صورة للسؤال (اختياري)
              </label>
              <div className="flex items-center gap-2">
                <label className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-[#475569] dark:text-slate-300 cursor-pointer flex items-center gap-2 hover:border-[#0EA5E9] transition-colors">
                  <ImageIcon className="w-4 h-4 text-[#0EA5E9]" />
                  <span className="truncate">{imageFile ? imageFile.name : 'اختر صورة السؤال (PNG/JPG)'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      setImageFile(e.target.files?.[0] || null);
                      if (e.target.files?.[0]) setPdfFile(null);
                    }}
                    className="hidden"
                  />
                </label>
                {imageFile && (
                  <button
                    type="button"
                    onClick={() => setImageFile(null)}
                    className="text-xs text-rose-500 font-bold px-2 py-1"
                  >
                    إزالة
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-200">
                10 & 11. رفع ملف PDF أو مستند (اختياري)
              </label>
              <div className="flex items-center gap-2">
                <label className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-[#475569] dark:text-slate-300 cursor-pointer flex items-center gap-2 hover:border-[#0EA5E9] transition-colors">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span className="truncate">{pdfFile ? pdfFile.name : 'اختر ملف PDF'}</span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => {
                      setPdfFile(e.target.files?.[0] || null);
                      if (e.target.files?.[0]) setImageFile(null);
                    }}
                    className="hidden"
                  />
                </label>
                {pdfFile && (
                  <button
                    type="button"
                    onClick={() => setPdfFile(null)}
                    className="text-xs text-rose-500 font-bold px-2 py-1"
                  >
                    إزالة
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 12. أهمية السؤال */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-200 mb-2">
              12. درجة أهمية السؤال:
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {[
                { id: 'عادي', label: '🟢 عادي', desc: 'استفسار عام' },
                { id: 'مهم', label: '🟡 مهم', desc: 'يخص محاضرة أو اختبار' },
                { id: 'عاجل', label: '🔴 عاجل', desc: 'مسألة حرجة أو امتحان قريب' },
              ].map((p) => (
                <label
                  key={p.id}
                  className={`flex-1 min-w-[120px] p-3 rounded-xl border cursor-pointer transition-all flex flex-col items-center text-center ${
                    priority === p.id
                      ? 'bg-[#E0F2FE] dark:bg-cyan-500/20 border-[#0EA5E9] dark:border-cyan-400 font-bold'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-[#475569] dark:text-slate-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="priority"
                    value={p.id}
                    checked={priority === p.id}
                    onChange={() => setPriority(p.id as any)}
                    className="hidden"
                  />
                  <span className="text-xs font-black text-[#0F172A] dark:text-white mb-0.5">{p.label}</span>
                  <span className="text-[10px] text-[#64748B] dark:text-slate-400">{p.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[50px] py-3.5 px-6 rounded-2xl bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-gradient-to-r dark:from-amber-400 dark:to-yellow-500 dark:text-slate-950 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري إرسال السؤال للدكتور...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>📨 إرسال السؤال للدكتور</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
