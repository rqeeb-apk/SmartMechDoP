import React from 'react';
import { X, AlertCircle, CheckCircle2, Wifi, WifiOff, HelpCircle, ShieldCheck, Zap, BookOpen } from 'lucide-react';
import { Announcement } from '../../services/announcementsService';
import { UserProfile } from '../../types';

interface AnnouncementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcements: Announcement[];
  user: UserProfile;
}

export const AnnouncementsModal: React.FC<AnnouncementsModalProps> = ({
  isOpen,
  onClose,
  announcements,
  user,
}) => {
  if (!isOpen) return null;

  const isSubscribedOrTrial = user.isSubscribed || user.role === 'owner';

  const filteredAnnouncements = announcements.filter((a) => {
    if (!a.is_active) return false;
    if (a.target_audience === 'free' && isSubscribedOrTrial) return false;
    if (a.target_audience === 'paid' && !isSubscribedOrTrial) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans text-right">
      <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-[#0B192E] border border-[rgba(212,175,55,0.3)] dark:border-amber-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-[#0F172A] dark:text-slate-100">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-l from-amber-500/10 via-[#0EA5E9]/15 to-transparent border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-xl">
              📢
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-white">
                تنويهات المنصة والتعليمات الأكاديمية
              </h2>
              <p className="text-[11px] text-[#475569] dark:text-slate-400">
                منصة دكتور الميكاترونكس الذكي — مركز المساعدة والدعم
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-500/20 text-slate-500 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs sm:text-sm leading-relaxed">
          
          {/* Active Announcements */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-[#0EA5E9] dark:text-amber-400 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <span>📌 أحدث التنويهات الرسمية</span>
            </h3>

            {filteredAnnouncements.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-4">لا توجد تنويهات جديدة حالياً.</p>
            ) : (
              filteredAnnouncements.map((ann) => (
                <div
                  key={ann.id}
                  className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2 relative"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-extrabold text-[#0F172A] dark:text-white text-sm">
                      {ann.title}
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                      {ann.type === 'subscription' && '💎 اشتراك'}
                      {ann.type === 'update' && '🚀 تحديث'}
                      {ann.type === 'warning' && '⚠️ تحذير'}
                      {ann.type === 'maintenance' && '🔧 صيانة'}
                      {ann.type === 'info' && '💡 معلومة'}
                    </span>
                  </div>
                  <p className="text-xs text-[#334155] dark:text-slate-300 whitespace-pre-line leading-relaxed">
                    {ann.content}
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono block pt-1">
                    {new Date(ann.created_at).toLocaleDateString('ar-EG')}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Subscription Tier Comparison */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-black text-[#0EA5E9] dark:text-amber-400 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <span>💎 مقارنة الاشتراكات (مجاني vs مدفوع)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-500/30 space-y-2">
                <div className="font-extrabold text-[#0284C7] dark:text-cyan-300 text-xs flex items-center gap-1.5">
                  <span>🆓 الاشتراك المجاني</span>
                </div>
                <p className="text-[11px] text-[#475569] dark:text-slate-300 leading-relaxed">
                  يتاح للمستخدمين استخدام الخدمات والأسئلة المحددة ضمن النطاق التجريبي. قد تكون بعض الأدوات والمختبرات المتقدمة محدودة.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/40 space-y-2">
                <div className="font-extrabold text-amber-700 dark:text-amber-300 text-xs flex items-center gap-1.5">
                  <span>💎 الاشتراك المدفوع والشامل</span>
                </div>
                <p className="text-[11px] text-[#475569] dark:text-slate-300 leading-relaxed">
                  يتيح الوصول الكامل وغير المحدود لجميع الخدمات، قاعة المحاضرات، حل الأسئلة غير المحدودة، المعامل الذكية ثلاثية الأبعاد Circuit Wizard، والمكتبة الهندسية.
                </p>
              </div>
            </div>
          </div>

          {/* Troubleshooting Guide: ماذا أفعل عند حدوث مشكلة؟ */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-black text-[#0EA5E9] dark:text-amber-400 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <HelpCircle className="w-4 h-4" />
              <span>ماذا أفعل عند حدوث مشكلة؟ (تعليمات الدعم الفني)</span>
            </h3>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <p className="text-xs text-[#334155] dark:text-slate-300 font-bold">
                إذا واجهتك أي مشكلة أثناء استخدام المنصة، يرجى اتباع الخطوات البسيطة التالية:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-[#475569] dark:text-slate-300 font-medium pr-1">
                <li>التأكد من اتصال الهاتف أو الكمبيوتر بالإنترنت.</li>
                <li>التأكد من أن شبكة Wi-Fi أو بيانات الهاتف تعمل بشكل جيد وسريع.</li>
                <li>تحديث الصفحة من زر التحديث في المتصفح (Refresh).</li>
                <li>الضغط على زر «إعادة المحاولة» إن كان متاحاً في الشاشة.</li>
                <li>الانتظار قليلًا ثم إعادة المحاولة للتأكد من استقرار الخادم.</li>
              </ol>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-[#071324] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">منصة دكتور الميكاترونكس الذكي © 2025</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950 text-white font-black transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
