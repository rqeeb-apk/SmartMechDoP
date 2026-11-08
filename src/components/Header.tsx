import React, { useState, useRef } from 'react';
import { User, ShieldAlert, Sparkles, Moon, Sun, BookOpen, Layers, Calculator, Award, Users, Bot, Cpu } from 'lucide-react';
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
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  user,
  toggleRole,
  isDark,
  setIsDark,
  onOwnerAuthSuccess,
}) => {
  const [logoClicks, setLogoClicks] = useState<number>(0);
  const [showClickToast, setShowClickToast] = useState<boolean>(false);
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState<boolean>(false);
  const clickTimerRef = useRef<any>(null);

  const navItems = [
    { id: 'home', label: 'الرئيسية', icon: Cpu },
    { id: 'doctor_hall', label: 'قاعة الدكتور الذكي', icon: Bot },
    { id: 'lab_3d', label: 'المختبر 3D', icon: Layers },
    { id: 'library', label: 'المكتبة الهندسية', icon: BookOpen },
    { id: 'assistant', label: 'المساعد الذكي', icon: Sparkles },
    { id: 'calculators', label: 'الحاسبات الهندسية', icon: Calculator },
    { id: 'projects', label: 'مركز المشاريع', icon: Cpu },
    { id: 'quizzes', label: 'الاختبارات', icon: Award },
    { id: 'community', label: 'مجتمع المهندسين', icon: Users },
  ];

  // 20-click tap counter handler with 3s reset timer
  const handleLogoClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    const nextCount = logoClicks + 1;
    setLogoClicks(nextCount);
    setShowClickToast(true);

    if (nextCount >= 20) {
      setLogoClicks(0);
      setShowClickToast(false);
      setIsOwnerModalOpen(true);
      return;
    }

    clickTimerRef.current = setTimeout(() => {
      setLogoClicks(0);
      setShowClickToast(false);
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
      <header className="sticky top-0 z-50 w-full bg-[#0A192F]/95 backdrop-blur-md border-b border-amber-500/20 text-slate-100 px-4 lg:px-8 py-2.5 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          
          {/* Zone 1: Brand Logo & Wordmark with 20-Click Trigger */}
          <div className="relative">
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-3 text-right hover:opacity-95 transition-opacity shrink-0 group focus:outline-none"
              title="انقر 20 نقرة متتالية لتفعيل لوحة المالك"
            >
              {/* Logo Frame matching emblem */}
              <div className="relative w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-cyan-400 to-amber-500 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform overflow-hidden">
                <img
                  src={OFFICIAL_LOGO_URL}
                  alt="شعار دكتور الميكاترونكس الذكي"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>

              <div>
                <span className="text-base sm:text-lg font-extrabold tracking-tight text-white whitespace-nowrap block font-sans">
                  دكتور <span className="gold-gradient-text">الميكاترونكس</span> الذكي
                </span>
                <span className="text-[9px] text-cyan-400 font-bold tracking-widest block font-mono">
                  DR. SMART MECHATRONICS
                </span>
              </div>
            </button>

            {/* Tap counter toast badge */}
            {showClickToast && logoClicks > 2 && (
              <div className="absolute top-12 right-0 z-50 bg-amber-500/90 text-slate-950 font-bold font-mono text-[11px] px-2.5 py-1 rounded-full shadow-lg border border-amber-300 animate-bounce">
                نقرات المالك: {logoClicks}/20
              </div>
            )}
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500/20 to-cyan-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action & Profile Switcher */}
          <div className="flex items-center gap-3 shrink-0">
            
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-amber-400 hover:bg-slate-700 transition-colors"
              title="تبديل المظهر"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
            </button>

            {/* User Profile / Role Toggle */}
            <button
              onClick={() => {
                if (user.role === 'owner') {
                  toggleRole();
                } else {
                  setIsOwnerModalOpen(true);
                }
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                user.role === 'owner'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-sm shadow-amber-500/15'
                  : 'bg-slate-800/80 text-cyan-400 border-slate-700 hover:border-cyan-500/40'
              }`}
            >
              {user.role === 'owner' ? (
                <>
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">لوحة المالك (نشطة)</span>
                </>
              ) : (
                <>
                  <User className="w-4 h-4 text-cyan-400" />
                  <span className="hidden sm:inline">حساب الطالب</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Strip */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto pt-2 border-t border-slate-800/60 mt-2 pb-1 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                  isActive ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
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

