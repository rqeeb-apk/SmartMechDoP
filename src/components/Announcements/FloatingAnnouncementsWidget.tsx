import React, { useState, useEffect } from 'react';
import { X, Wifi, WifiOff, AlertTriangle, ChevronLeft } from 'lucide-react';
import { Announcement, fetchAnnouncements } from '../../services/announcementsService';
import { AnnouncementsModal } from './AnnouncementsModal';
import { UserProfile } from '../../types';

interface FloatingAnnouncementsWidgetProps {
  user: UserProfile;
}

export const FloatingAnnouncementsWidget: React.FC<FloatingAnnouncementsWidgetProps> = ({ user }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isCardVisible, setIsCardVisible] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [hasUnread, setHasUnread] = useState<boolean>(false);

  // Network status alerts
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [networkAlert, setNetworkAlert] = useState<{ type: 'offline' | 'online' | 'temp_error'; message: string } | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setNetworkAlert({ type: 'online', message: 'عاد الاتصال بالإنترنت، يمكنك متابعة استخدام المنصة' });
      setTimeout(() => setNetworkAlert(null), 4000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setNetworkAlert({ type: 'offline', message: 'لا يوجد اتصال بالإنترنت، يرجى التحقق من الشبكة والمحاولة مرة أخرى' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAnnouncements();
        setAnnouncements(data);

        // Check if there are active announcements that show automatically
        const activeAuto = data.filter((a) => a.is_active && a.show_automatically);
        if (activeAuto.length > 0) {
          try {
            const lastDismissedId = localStorage.getItem('dr_smart_dismissed_announcement');
            if (lastDismissedId !== String(activeAuto[0].id)) {
              setIsCardVisible(true);
              setHasUnread(true);
            }
          } catch {
            setIsCardVisible(true);
            setHasUnread(true);
          }
        }
      } catch (e) {
        console.error('Error loading announcements widget:', e);
      }
    }
    load();
  }, []);

  const handleDismissCard = () => {
    setIsCardVisible(false);
    setHasUnread(false);
    try {
      if (announcements.length > 0) {
        localStorage.setItem('dr_smart_dismissed_announcement', String(announcements[0].id));
      }
    } catch {}
  };

  const handleOpenDetails = () => {
    setIsModalOpen(true);
    setIsCardVisible(false);
    setHasUnread(false);
  };

  const latestAnnouncement = announcements.find((a) => a.is_active) || {
    title: 'تنويه مهم',
    content: 'نرحب بكم في منصة دكتور الميكاترونكس الذكي. يرجى مراجعة تفاصيل الاشتراك المجاني والمدفوع.',
  };

  return (
    <>
      {/* Network / Temp Error Banner Toast */}
      {networkAlert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-bounce">
          <div
            className={`p-3.5 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold ${
              networkAlert.type === 'offline'
                ? 'bg-rose-600 text-white'
                : networkAlert.type === 'online'
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-500 text-slate-950'
            }`}
          >
            {networkAlert.type === 'offline' ? <WifiOff className="w-4 h-4 shrink-0" /> : <Wifi className="w-4 h-4 shrink-0" />}
            <span className="flex-1 text-right">{networkAlert.message}</span>
          </div>
        </div>
      )}

      {/* Floating Card in Bottom-Right Corner */}
      {isCardVisible && (
        <div className="fixed bottom-20 right-4 z-40 max-w-xs sm:max-w-sm w-full animate-slide-up font-sans text-right">
          <div className="champagne-card p-4 sm:p-5 rounded-3xl shadow-2xl border border-[rgba(212,175,55,0.4)] dark:border-amber-500/40 bg-white/95 dark:bg-[#0A192F]/95 backdrop-blur-md space-y-3 relative">
            
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-base">
                  📢
                </span>
                <div>
                  <h4 className="text-xs font-black text-[#0F172A] dark:text-white">
                    {latestAnnouncement.title}
                  </h4>
                  <span className="text-[10px] text-[#0EA5E9] dark:text-cyan-400 font-bold">
                    منصة دكتور الميكاترونكس الذكي
                  </span>
                </div>
              </div>
              <button
                onClick={handleDismissCard}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-500/20 text-slate-500 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                title="إغلاق التنويه"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Short snippet */}
            <p className="text-xs text-[#334155] dark:text-slate-300 line-clamp-3 leading-relaxed">
              {latestAnnouncement.content}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleOpenDetails}
                className="w-full py-2 px-4 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-gradient-to-r dark:from-amber-400 dark:to-yellow-500 dark:text-slate-950 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <span>عرض التفاصيل والتعليمات</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Floating Icon in Bottom-Right Corner (when card is dismissed) */}
      {!isCardVisible && (
        <div className="fixed bottom-20 right-4 z-40">
          <button
            onClick={() => {
              setIsModalOpen(true);
              setHasUnread(false);
            }}
            className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0EA5E9] to-[#0284C7] dark:from-amber-400 dark:to-yellow-500 text-white dark:text-slate-950 shadow-xl flex items-center justify-center text-xl hover:scale-105 active:scale-95 transition-transform cursor-pointer group"
            title="التنويهات والتعليمات الأكاديمية"
          >
            <span>📢</span>
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 border-2 border-white dark:border-[#0A192F] animate-pulse" />
            )}
          </button>
        </div>
      )}

      {/* Detailed Side Panel / Modal */}
      <AnnouncementsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        announcements={announcements}
        user={user}
      />
    </>
  );
};
