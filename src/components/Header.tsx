import React, { useState, useRef } from 'react';
import { User, Moon, Sun } from 'lucide-react';
import { UserProfile } from '../types';
import { OFFICIAL_LOGO_URL } from '../services/storage';
import { OwnerLoginModal } from './OwnerDashboard/OwnerLoginModal';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: UserProfile;
  toggleRole: () => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  onOwnerAuthSuccess?: () => void;
  onOpenAuthModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  user,
  toggleRole,
  isDark,
  setIsDark,
  onOwnerAuthSuccess,
  onOpenAuthModal,
}) => {
  const [logoClicks, setLogoClicks] = useState<number>(0);
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState<boolean>(false);
  const clickTimerRef = useRef<any>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Flagship 4 Services + Home & Profile
  const primaryTabs = [
    { id: 'home', label: 'الرئيسية', icon: '🏠' },
    { id: 'lecture_hall', label: 'قاعة المحاضرات', icon: '🎓' },
    { id: 'doctor_hall', label: 'قاعة الدكتور', icon: '🏛️' },
    { id: 'solve_questions', label: 'حل أسئلتي', icon: '📝' },
    { id: 'smart_labs', label: 'مختبرات ومعامل ذكية', icon: '⚡' },
    { id: 'profile', label: 'حسابي', icon: '👤' },
  ];

  // Supporting tools & community modules preserved in the More dropdown
  const secondaryTabs = [
    { id: 'lab_3d', label: 'Circuit Wizard والمختبر 3D', icon: '🛠️' },
    { id: 'library', label: 'المكتبة الهندسية (1-5)', icon: '📖' },
    { id: 'calculators', label: 'الحاسبات الهندسية', icon: '🧮' },
    { id: 'assistant', label: 'مساعد الميكاترونكس الذكي', icon: '🤖' },
    { id: 'summarize', label: 'لخّص لي', icon: '📄' },
    { id: 'projects', label: 'مركز المشاريع', icon: '⚙️' },
    { id: 'quizzes', label: 'مركز الاختبارات', icon: '🏆' },
    { id: 'community', label: 'مجتمع المهندسين', icon: '👥' },
    { id: 'videos', label: 'مكتبة الفيديوهات', icon: '🎬' },
  ];

  // 20-click tap counter handler with 3s reset timer (silent owner access)
  const handleLogoClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    const nextCount = logoClicks + 1;
    setLogoClicks(nextCount);

    if (nextCount >= 20) {
      setLogoClicks(0);
      setIsOwnerModalOpen(true);
      return;
    }

    clickTimerRef.current = setTimeout(() => {
      setLogoClicks(0);
    }, 3000);

    if (nextCount === 1) {
      setCurrentTab('home');
    }
  };

  const handleOwnerSuccess = () => {
    if (onOwnerAuthSuccess) {
      onOwnerAuthSuccess();
    } else {
      toggleRole();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full max-w-full overflow-x-clip bg-white/95 dark:bg-[#071326]/98 backdrop-blur-md border-b border-[rgba(212,175,55,0.35)] dark:border-cyan-500/30 text-[#0F172A] dark:text-slate-100 shadow-sm dark:shadow-2xl transition-colors">
        {/* ROW 1: Logo & Brand + Action Buttons */}
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 w-full min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-2 sm:gap-3 text-right hover:opacity-95 transition-opacity min-w-0 group focus:outline-none"
              title="دكتور الميكاترونكس الذكي"
            >
              <div className="relative w-9 h-9 sm:w-12 sm:h-12 rounded-full p-0.5 bg-gradient-to-tr from-[#D4AF37] via-[#0EA5E9] to-[#0284C7] dark:from-amber-400 dark:via-cyan-400 dark:to-blue-600 shadow-md shadow-sky-500/20 dark:shadow-cyan-500/25 group-hover:scale-105 transition-transform overflow-hidden shrink-0">
                <img
                  src={OFFICIAL_LOGO_URL}
                  alt="شعار دكتور الميكاترونكس الذكي"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>

              <div className="min-w-0">
                <span className="text-xs sm:text-lg lg:text-xl font-black tracking-tight text-[#0F172A] dark:text-white block truncate font-sans">
                  دكتور <span className="text-[#0EA5E9] dark:text-amber-400 dark:drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]">الميكاترونكس</span> الذكي
                </span>
                <span className="text-[8px] sm:text-[9px] text-[#0284C7] dark:text-cyan-400 font-bold tracking-widest hidden sm:block font-mono truncate">
                  DR MECHA SMART · DR-MECHASMART.ONLINE
                </span>
              </div>
            </button>
          </div>

          {/* Left: Top Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {user.role !== 'owner' && (
              <div className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#FAF5E8] dark:bg-[#091830] border border-[rgba(212,175,55,0.45)] dark:border-amber-400/60 text-[#0F172A] dark:text-amber-300 text-[10px] sm:text-[11px] font-extrabold flex items-center gap-1 shadow-sm whitespace-nowrap">
                <span className="text-xs">⏳</span>
                <span>{user.subscription?.status === 'active' ? '365 يوم' : 'تجربة 24 ساعة'}</span>
              </div>
            )}

            {user.role !== 'owner' && (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-[#0EA5E9] hover:bg-[#0284C7] text-white dark:bg-gradient-to-r dark:from-amber-400 dark:to-yellow-500 dark:hover:from-amber-300 dark:hover:to-yellow-400 dark:text-slate-950 font-black text-[10px] sm:text-xs shadow-md shadow-sky-500/20 dark:shadow-amber-500/30 transition-all active:scale-95 whitespace-nowrap shrink-0"
              >
                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>{user.email !== 'student@mechatronics.dr-smart.edu' ? (user.name.split(' ')[0] || user.name) : 'دخول / حساب'}</span>
              </button>
            )}

            <button
              onClick={() => setIsDark(!isDark)}
              aria-label={isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
              title={isDark ? 'الوضع النهاري (Light Mode)' : 'الوضع الليلي (Dark Mode)'}
              className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full bg-[#E0F2FE] hover:bg-sky-200/80 dark:bg-slate-900 dark:hover:bg-slate-800 border border-[#0EA5E9]/30 dark:border-slate-700 text-[#0284C7] dark:text-amber-400 transition-all shrink-0 shadow-sm cursor-pointer"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline text-[10px] font-bold text-slate-200">نهاري</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#0EA5E9]" />
                  <span className="hidden md:inline text-[10px] font-bold text-[#0F172A]">ليلي</span>
                </>
              )}
            </button>

            {user.role === 'owner' && (
              <button
                onClick={toggleRole}
                className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border bg-[#E0F2FE] text-[#0284C7] border-[#0EA5E9]/40 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/50 shrink-0"
              >
                المالك
              </button>
            )}
          </div>
        </div>

        {/* ROW 2: Primary 4 Services Navigation Bar */}
        <div className="border-t border-slate-200/80 dark:border-cyan-500/20 bg-[#F8FAFC] dark:bg-[#051020]/90 px-2 sm:px-4 lg:px-8 py-1.5 w-full max-w-full">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2 w-full min-w-0">
            <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar min-w-0 flex-1">
              {primaryTabs.map((tab) => {
                const isActive = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.id === 'profile' && user.email === 'student@mechatronics.dr-smart.edu') {
                        if (onOpenAuthModal) onOpenAuthModal();
                      } else {
                        setCurrentTab(tab.id);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all shadow-sm shrink-0 ${
                      isActive
                        ? 'bg-[#0EA5E9] hover:bg-[#0284C7] text-white shadow-md shadow-sky-500/25 ring-1 ring-[#0EA5E9]/40 dark:bg-gradient-to-r dark:from-amber-400 dark:to-yellow-500 dark:text-slate-950 dark:shadow-amber-500/25 dark:ring-2 dark:ring-amber-300/60'
                        : 'bg-[#FDFBF7] dark:bg-[#091A33] border border-[rgba(212,175,55,0.35)] dark:border-cyan-500/30 text-[#0F172A] dark:text-slate-200 hover:border-[#0EA5E9] hover:text-[#0284C7] dark:hover:border-amber-400 dark:hover:text-white'
                    }`}
                  >
                    <span className="text-sm">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Supporting Tools Dropdown */}
            <div className="relative shrink-0">
              <button
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#E0F2FE] dark:bg-[#091A33] border border-[#0EA5E9]/30 dark:border-cyan-500/40 text-[#0284C7] dark:text-cyan-300 hover:bg-[#0EA5E9] hover:text-white dark:hover:text-white dark:hover:border-cyan-400 transition-colors whitespace-nowrap"
              >
                <span>أدوات مساندة</span>
                <span className="text-[10px]">▾</span>
              </button>

              {isMoreMenuOpen && (
                <div
                  className="absolute left-0 mt-2 w-60 rounded-2xl bg-white dark:bg-[#081528] border border-[rgba(212,175,55,0.45)] dark:border-2 dark:border-cyan-500/50 shadow-2xl p-2 z-50 space-y-1 animate-in fade-in"
                  onClick={() => setIsMoreMenuOpen(false)}
                >
                  {secondaryTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setCurrentTab(tab.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-right ${
                        currentTab === tab.id
                          ? 'bg-[#0EA5E9] text-white dark:bg-amber-500 dark:text-slate-950'
                          : 'text-[#0F172A] dark:text-slate-200 hover:bg-[#E0F2FE] hover:text-[#0284C7] dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <OwnerLoginModal
        isOpen={isOwnerModalOpen}
        onClose={() => setIsOwnerModalOpen(false)}
        onSuccess={handleOwnerSuccess}
      />
    </>
  );
};
