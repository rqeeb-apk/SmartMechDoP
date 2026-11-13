import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { DoctorHallPage } from './components/DoctorHall/DoctorHallPage';
import { ExplainLessonPage } from './components/ExplainLesson/ExplainLessonPage';
import { SummarizePage } from './components/Summarize/SummarizePage';
import { LabWorkspace3D } from './components/Lab3D/LabWorkspace3D';
import { EngineeringLibraryPage } from './components/EngineeringLibrary/EngineeringLibraryPage';
import { VideoCenterPage } from './components/VideoCenter/VideoCenterPage';
import { SmartAssistantPage } from './components/SmartAssistant/SmartAssistantPage';
import { CalculatorsPage } from './components/Calculators/CalculatorsPage';
import { ProjectsPage } from './components/Projects/ProjectsPage';
import { QuizCenterPage } from './components/QuizCenter/QuizCenterPage';
import { CommunityPage } from './components/Community/CommunityPage';
import { StudentProfilePage } from './components/StudentProfile/StudentProfilePage';
import { StudentAuthModal } from './components/StudentProfile/StudentAuthModal';
import { TrialExpiredLockModal } from './components/StudentProfile/TrialExpiredLockModal';
import { OwnerDashboardPage } from './components/OwnerDashboard/OwnerDashboardPage';
import { OwnerLoginModal } from './components/OwnerDashboard/OwnerLoginModal';
import { LectureHallPage } from './components/LectureHall/LectureHallPage';
import { getStoredUser, updateUserProfile, checkUserAccessStatus, syncServerSubscriptionStatus } from './services/storage';
import { UserProfile, LabType, EngineeringBook } from './types';
import { Cpu, Heart, ShieldAlert, KeyRound, Clock, ArrowRight, Home, GraduationCap, Layers, Sparkles, User as UserIcon } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [user, setUser] = useState<UserProfile>(getStoredUser());
  const [selectedLabType, setSelectedLabType] = useState<LabType>('circuits');
  const [isDark, setIsDark] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSecretOwnerModalOpen, setIsSecretOwnerModalOpen] = useState<boolean>(false);
  const [, setTick] = useState<number>(0);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Stealth hash listener for platform owner (#admin or #owner-portal)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#admin' || hash === '#owner' || hash === '#owner-portal') {
        setIsSecretOwnerModalOpen(true);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Sync user subscription state with server-side middleware on startup
  useEffect(() => {
    syncServerSubscriptionStatus(user).then((synced: UserProfile) => {
      setUser(synced);
    });
  }, []);


  // Real-time subsecond countdown tick for trial timer
  useEffect(() => {
    if (user.role === 'owner' || user.subscription?.status === 'active') return;

    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [user]);

  // Check student access status & 24-Hour Free Trial precision
  const accessInfo = checkUserAccessStatus(user);

  // Smooth unhindered tab switching (24-hour free trial active for all students)
  const handleNavTabChange = (targetTab: string) => {
    setCurrentTab(targetTab);
  };

  const toggleRole = () => {
    const newRole = user.role === 'owner' ? 'student' : 'owner';
    const updated = updateUserProfile({ role: newRole });
    setUser(updated);
    if (newRole === 'owner') {
      setCurrentTab('owner');
    } else {
      setCurrentTab('home');
    }
  };

  const handleSelectLab = (labId: string) => {
    setSelectedLabType(labId as LabType);
    setCurrentTab('lab_3d');
  };

  const handleTakeBookToDoctorHall = (book: EngineeringBook) => {
    setCurrentTab('doctor_hall');
  };

  const handleAuthSuccess = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    setIsAuthModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0A192F] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black w-full max-w-full overflow-x-hidden relative">
      
      {/* Top Bar Navigation */}
      <Header
        currentTab={currentTab}
        setCurrentTab={handleNavTabChange}
        user={user}
        toggleRole={toggleRole}
        isDark={isDark}
        setIsDark={setIsDark}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOwnerAuthSuccess={() => {
          const updated = updateUserProfile({ role: 'owner' });
          setUser(updated);
          setCurrentTab('owner');
        }}
      />

      {/* 2-Day Free Trial Banner for Active Trial Students */}
      {user.role !== 'owner' && accessInfo.statusType === 'trial' && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 text-slate-950 px-2 sm:px-4 py-1.5 sm:py-2 text-center text-[11px] sm:text-xs font-bold flex flex-wrap items-center justify-center gap-2 sm:gap-3 shadow-md w-full max-w-full overflow-hidden">
          <div className="flex items-center gap-1.5 shrink-0">
            <Clock className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span className="truncate">منصة دكتور الميكاترونكس الذكي · {accessInfo.formattedCountdown}</span>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="px-2.5 py-0.5 sm:py-1 rounded-lg bg-slate-950 text-amber-400 hover:bg-slate-900 text-[10px] sm:text-[11px] font-bold transition-all shadow shrink-0"
          >
            تفعيل الاشتراك السنوي بالكود (365 يوم)
          </button>
        </div>
      )}

      {/* Main Content Area - Optimized Margins for Mobile & Desktop */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-1.5 sm:px-3 lg:px-6 py-2 sm:py-4 min-w-0 overflow-x-hidden">
        {/* Universal Subpage Navigation & Exit Header */}
        {currentTab !== 'home' && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 bg-[#0D1B2A]/90 border border-slate-800 rounded-2xl px-4 py-3 backdrop-blur-md shadow-xl">
            <button
              onClick={() => setCurrentTab('home')}
              className="flex items-center gap-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 group"
            >
              <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>العودة للرئيسية (خروج) 🏠</span>
            </button>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>
                {currentTab === 'lecture_hall' && 'قاعة المحاضرات والسبورة الذكية 🎓'}
                {currentTab === 'explain_lesson' && 'خدمة «اشرح لي الدرس»'}
                {currentTab === 'summarize' && 'خدمة «لخّص لي»'}
                {currentTab === 'doctor_hall' && 'قاعة الدكتور الذكي'}
                {currentTab === 'lab_3d' && 'طاولة التوصيل والتركيب (المختبر 3D)'}
                {currentTab === 'library' && 'المكتبة الهندسية'}
                {currentTab === 'videos' && 'مركز الفيديوهات الهندسية'}
                {currentTab === 'assistant' && 'المساعد الذكي'}
                {currentTab === 'calculators' && 'الحاسبات الهندسية'}
                {currentTab === 'projects' && 'مركز المشاريع الهندسية'}
                {currentTab === 'quizzes' && 'مركز الاختبارات'}
                {currentTab === 'community' && 'مجتمع المهندسين'}
                {currentTab === 'profile' && 'الملف الشخصي للطالب'}
                {currentTab === 'owner' && 'لوحة الإدارة المركزية'}
              </span>
            </div>
          </div>
        )}

        {currentTab === 'home' && (
          <HomePage setCurrentTab={setCurrentTab} onSelectLab={handleSelectLab} />
        )}

        {currentTab === 'lecture_hall' && <LectureHallPage />}

        {currentTab === 'explain_lesson' && <ExplainLessonPage />}

        {currentTab === 'summarize' && <SummarizePage />}

        {currentTab === 'doctor_hall' && <DoctorHallPage />}

        {currentTab === 'lab_3d' && <LabWorkspace3D initialLabType={selectedLabType} />}

        {currentTab === 'library' && (
          <EngineeringLibraryPage onTakeToDoctorHall={handleTakeBookToDoctorHall} />
        )}

        {currentTab === 'videos' && <VideoCenterPage />}

        {currentTab === 'assistant' && <SmartAssistantPage />}

        {currentTab === 'calculators' && <CalculatorsPage />}

        {currentTab === 'projects' && <ProjectsPage />}

        {currentTab === 'quizzes' && <QuizCenterPage />}

        {currentTab === 'community' && <CommunityPage />}

        {currentTab === 'profile' && <StudentProfilePage user={user} setUser={setUser} />}

        {currentTab === 'owner' && <OwnerDashboardPage />}
      </main>

      {/* Sleek Mobile Bottom Navigation Bar (Non-intrusive, zero overlap with inputs) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A192F]/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setCurrentTab('home')}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-xl text-[10px] font-bold transition-all ${
            currentTab === 'home' ? 'text-amber-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>الرئيسية</span>
        </button>

        <button
          onClick={() => setCurrentTab('lecture_hall')}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-xl text-[10px] font-bold transition-all ${
            currentTab === 'lecture_hall' ? 'text-amber-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>المحاضرات</span>
        </button>

        <button
          onClick={() => setCurrentTab('lab_3d')}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-xl text-[10px] font-bold transition-all ${
            currentTab === 'lab_3d' ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>المختبر 3D</span>
        </button>

        <button
          onClick={() => setCurrentTab('explain_lesson')}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-xl text-[10px] font-bold transition-all ${
            currentTab === 'explain_lesson' ? 'text-amber-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>اشرح لي</span>
        </button>

        <button
          onClick={() => setCurrentTab('profile')}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-xl text-[10px] font-bold transition-all ${
            currentTab === 'profile' ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>حسابي</span>
        </button>
      </nav>

      {/* Student Registration / Login Modal */}
      <StudentAuthModal
        isOpen={isAuthModalOpen}
        onSuccess={handleAuthSuccess}
        onClose={() => setIsAuthModalOpen(false)}
        allowClose={true}
      />

      {/* Mandatory Blocking Lock Screen when 2-Day Trial Expires */}
      <TrialExpiredLockModal
        isOpen={!accessInfo.isAccessAllowed && user.role !== 'owner'}
        user={user}
        onSuccess={handleAuthSuccess}
        onGoHome={() => setCurrentTab('home')}
      />

      {/* Stealth Owner Auth Modal (Triggered ONLY via secret #admin hash or 20 silent logo taps) */}
      <OwnerLoginModal
        isOpen={isSecretOwnerModalOpen}
        onClose={() => {
          setIsSecretOwnerModalOpen(false);
          if (window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }}
        onSuccess={() => {
          const updated = updateUserProfile({ role: 'owner' });
          setUser(updated);
          setCurrentTab('owner');
          setIsSecretOwnerModalOpen(false);
          if (window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }}
      />

      {/* Footer */}
      <footer className="w-full bg-[#0D1B2A] border-t border-slate-800/80 py-6 px-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-right">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-slate-200">دكتور الميكاترونكس الذكي (Dr Mecha Smart)</span>
            </div>
            <a
              href="https://dr-mechasmart.online"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400/90 hover:text-amber-300 font-mono text-[11px] underline underline-offset-2"
            >
              dr-mechasmart.online
            </a>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span>تعلّم بذكاء، جرّب بواقعية، وابتكر بلا حدود</span>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-3 text-[11px]">
            <button onClick={() => setCurrentTab('home')} className="hover:text-cyan-400 transition-colors">الرئيسية</button>
            <button onClick={() => setCurrentTab('explain_lesson')} className="hover:text-amber-400 transition-colors">اشرح لي الدرس</button>
            <button onClick={() => setCurrentTab('summarize')} className="hover:text-purple-400 transition-colors">لخّص لي</button>
            <button onClick={() => setCurrentTab('doctor_hall')} className="hover:text-cyan-400 transition-colors">قاعة الدكتور</button>
            <button onClick={() => setCurrentTab('lab_3d')} className="hover:text-cyan-400 transition-colors">المختبر 3D</button>
            <button onClick={() => setCurrentTab('library')} className="hover:text-cyan-400 transition-colors">المكتبة</button>
          </div>
        </div>
      </footer>
    </div>
  );
}


