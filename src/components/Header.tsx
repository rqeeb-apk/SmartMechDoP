import React, { useState, useRef } from 'react';
import { User, ShieldAlert, Sparkles, Moon, Sun, BookOpen, Layers, Calculator, Award, Users, Bot, Cpu, FileText, GraduationCap } from 'lucide-react';
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

  // Primary tabs matching the reference image top bar exactly
  const primaryTabs = [
    { id: 'home', label: 'الرئيسية', icon: '🏠' },
    { id: 'lecture_hall', label: 'قاعة المحاضرات', icon: '🎓' },
    { id: 'doctor_hall', label: 'قاعة الدكتور الذكي', icon: '🏛️' },
    { id: 'library', label: 'المكتبة الهندسية', icon: '📖' },
    { id: 'lab_3d', label: 'المختبر 3D', icon: '🛠️' },
    { id: 'calculators', label: 'الحاسبات الهندسية', icon: '🧮' },
    { id: 'profile', label: 'حسابي', icon: '👤' },
  ];

  // Secondary tabs preserved for full functionality
  const secondaryTabs = [
    { id: 'explain_lesson', label: 'اشرح لي الدرس', icon: '⚡' },
    { id: 'summarize', label: 'لخّص لي', icon: '📄' },
    { id: 'assistant', label: 'المساعد الذكي', icon: '🤖' },
    { id: 'projects', label: 'مركز المشاريع', icon: '⚙️' },
    { id: 'quizzes', label: 'مركز الاختبارات', icon: '🏆' },
    { id: 'community', label: 'مجتمع المهندسين', icon: '👥' },
  ];

  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // 20-click tap counter handler with 3s reset timer (100% silent, zero public UI/hints)
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

    // Default home click behavior if regular click
    if (nextCount === 1) {
      setCurrentTab('home');
    }
  };

  const handleOwnerSuccess = (token: string) => {
    if (onOwnerAuthSuccess) {
      onOwnerAuthSuccess();
    } else {
      toggleRole();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full max-w-full overflow-x-hidden bg-[#071326]/98 backdrop-blur-md border-b border-cyan-500/30 text-slate-100 shadow-2xl transition-colors">
        
        {/* ROW 1: Logo & Brand + Action Buttons (Mobile-first responsive) */}
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 w-full min-w-0">
          
          {/* Right: Circular Official Logo + Brand Wordmark */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-2 sm:gap-3 text-right hover:opacity-95 transition-opacity min-w-0 group focus:outline-none"
              title="دكتور الميكاترونكس الذكي"
            >
              <div className="relative w-9 h-9 sm:w-12 sm:h-12 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform overflow-hidden shrink-0">
                <img
                  src={OFFICIAL_LOGO_URL}
                  alt="شعار دكتور الميكاترونكس الذكي"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>

              <div className="min-w-0">
                <span className="text-xs sm:text-lg lg:text-xl font-black tracking-tight text-white block truncate font-sans">
                  دكتور <span className="text-amber-400 drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]">الميكاترونكس</span> الذكي
                </span>
                <span className="text-[8px] sm:text-[9px] text-cyan-400 font-bold tracking-widest hidden sm:block font-mono truncate">
                  DR MECHA SMART · DR-MECHASMART.ONLINE
                </span>
              </div>
            </button>
          </div>

          {/* Left: Top Actions [تجربة مجانية 24 ساعة] + [تسجيل الدخول / إنشاء حساب] */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            
            {/* 24-Hour Free Trial Pill */}
            {user.role !== 'owner' && (
              <div className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#091830] border border-amber-400/60 text-amber-300 text-[10px] sm:text-[11px] font-extrabold flex items-center gap-1 shadow-md whitespace-nowrap">
                <span className="text-xs">⏳</span>
                <span>{user.subscription?.status === 'active' ? '365 يوم' : 'تجربة 24 ساعة'}</span>
              </div>
            )}

            {/* Main Yellow Login / Create Account Button */}
            {user.role !== 'owner' && (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-[10px] sm:text-xs shadow-md shadow-amber-500/30 transition-transform active:scale-95 whitespace-nowrap shrink-0"
              >
                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-slate-950 shrink-0" />
                <span>{user.email !== 'student@mechatronics.dr-smart.edu' ? (user.name.split(' ')[0] || user.name) : 'دخول / حساب'}</span>
              </button>
            )}

            {/* Dark mode toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-1 sm:p-1.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-amber-400 transition-colors shrink-0"
              title="تبديل المظهر"
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-cyan-400" />}
            </button>

            {/* Owner badge */}
            {user.role === 'owner' && (
              <button
                onClick={toggleRole}
                className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border bg-amber-500/20 text-amber-400 border-amber-500/50 shrink-0"
              >
                المالك
              </button>
            )}
          </div>
        </div>

        {/* ROW 2: Navigation Tabs Bar (Exact Styling & Order from Screenshot, Smooth Horizontal Scroll on Mobile) */}
        <div className="border-t border-cyan-500/20 bg-[#051020]/90 px-2 sm:px-4 lg:px-8 py-1.5 w-full max-w-full overflow-hidden">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar w-full min-w-0">
            
            {/* Primary Navigation Tabs */}
            <nav className="flex items-center gap-1.5 shrink-0">
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
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all shadow-sm ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/25 ring-2 ring-amber-300/60'
                        : 'bg-[#091A33] border border-cyan-500/30 text-slate-200 hover:border-amber-400 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Secondary Services Dropdown so all 11 functionalities remain 100% accessible */}
            <div className="relative shrink-0">
              <button
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#091A33] border border-cyan-500/40 text-cyan-300 hover:text-white hover:border-cyan-400 transition-colors"
              >
                <span>المزيد من الخدمات</span>
                <span className="text-[10px]">▾</span>
              </button>

              {isMoreMenuOpen && (
                <div
                  className="absolute left-0 mt-2 w-56 rounded-2xl bg-[#081528] border-2 border-cyan-500/50 shadow-2xl p-2 z-50 space-y-1 animate-in fade-in"
                  onClick={() => setIsMoreMenuOpen(false)}
                >
                  {secondaryTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setCurrentTab(tab.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-right ${
                        currentTab === tab.id
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-200 hover:bg-slate-800'
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

      {/* Owner Login Modal Triggered by 20 clicks or button */}
      <OwnerLoginModal
        isOpen={isOwnerModalOpen}
        onClose={() => setIsOwnerModalOpen(false)}
        onSuccess={handleOwnerSuccess}
      />
    </>
  );
};

