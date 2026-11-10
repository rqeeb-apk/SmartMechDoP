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
import { getStoredUser, updateUserProfile, checkUserAccessStatus, syncServerSubscriptionStatus } from './services/storage';
import { UserProfile, LabType, EngineeringBook } from './types';
import { Cpu, Heart, ShieldAlert, KeyRound, Clock } from 'lucide-react';

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

  // Check student access status & 2-Day Trial precision
  const accessInfo = checkUserAccessStatus(user);


  // Check if student has registered / logged in
  const isUserAuthed = user.role === 'owner' || (user.email !== 'student@mechatronics.dr-smart.edu' && localStorage.getItem('dr_smart_user_authed') === 'true');

  const handleNavTabChange = (targetTab: string) => {
    if (targetTab === 'home') {
      setCurrentTab('home');
      return;
    }
    if (!isUserAuthed) {
      setIsAuthModalOpen(true);
      return;
    }
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
    if (!isUserAuthed) {
      setIsAuthModalOpen(true);
      return;
    }
    setSelectedLabType(labId as LabType);
    setCurrentTab('lab_3d');
  };

  const handleTakeBookToDoctorHall = (book: EngineeringBook) => {
    if (!isUserAuthed) {
      setIsAuthModalOpen(true);
      return;
    }
    setCurrentTab('doctor_hall');
  };

  const handleAuthSuccess = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    setIsAuthModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0A192F] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      
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
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 text-slate-950 px-4 py-2 text-center text-xs font-bold flex flex-wrap items-center justify-center gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 animate-spin" />
            <span>منصة دكتور الميكاترونكس الذكي · {accessInfo.formattedCountdown}</span>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="px-3 py-1 rounded-lg bg-slate-950 text-amber-400 hover:bg-slate-900 text-[11px] font-bold transition-all shadow"
          >
            تفعيل الاشتراك السنوي بالكود (365 يوم)
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {currentTab === 'home' && (
          <HomePage setCurrentTab={setCurrentTab} onSelectLab={handleSelectLab} />
        )}

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


