import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { DoctorHallPage } from './components/DoctorHall/DoctorHallPage';
import { ExplainLessonPage } from './components/ExplainLesson/ExplainLessonPage';
import { SummarizePage } from './components/Summarize/SummarizePage';
import { SolveQuestionsPage } from './components/SolveQuestions/SolveQuestionsPage';
import { SmartLabsHubPage } from './components/SmartLabs/SmartLabsHubPage';
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
import { UploadAnalyzePage } from './components/UploadAnalyze/UploadAnalyzePage';
import { AskDoctorPage } from './components/DoctorQA/AskDoctorPage';
import { StudentQuestionsPage } from './components/DoctorQA/StudentQuestionsPage';
import { DoctorDashboardPage } from './components/DoctorQA/DoctorDashboardPage';
import { FloatingAnnouncementsWidget } from './components/Announcements/FloatingAnnouncementsWidget';
import { FloatingFeedbackWidget } from './components/Feedback/FloatingFeedbackWidget';
import { getStoredUser, updateUserProfile, resetStoredUser, checkUserAccessStatus } from './services/storage';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { UserProfile, LabType, EngineeringBook } from './types';
import { Cpu, ArrowRight, Home, GraduationCap, Bot, FileCheck2, Zap, Loader2, Clock } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [user, setUser] = useState<UserProfile>(getStoredUser());
  const [selectedLabType, setSelectedLabType] = useState<LabType>('circuits');
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('dr_smart_theme') === 'dark';
    } catch {
      return false;
    }
  });
  const [isSecretOwnerModalOpen, setIsSecretOwnerModalOpen] = useState<boolean>(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [hasSession, setHasSession] = useState<boolean>(false);
  const [, setTick] = useState<number>(0);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('dr_smart_theme', isDark ? 'dark' : 'light');
    } catch {
      // ignore storage errors
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#0A192F' : '#FFFFFF');
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

  // Auth Gate: Verify Supabase session + profiles (is_subscribed & trial_ends_at)
  const verifySupabaseSessionAndProfile = useCallback(async () => {
    const currentLocal = getStoredUser();
    if (currentLocal.role === 'owner') {
      setHasSession(true);
      setAuthChecking(false);
      return;
    }

    if (!supabase || !isSupabaseConfigured) {
      setHasSession(false);
      setAuthChecking(false);
      return;
    }

    setAuthChecking(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        const guest = resetStoredUser();
        setUser(guest);
        setHasSession(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !profile) {
        await supabase.auth.signOut();
        const guest = resetStoredUser();
        setUser(guest);
        setHasSession(false);
        return;
      }

      const isSubscribed = profile.is_subscribed === true;
      const trialEndsAt = profile.trial_ends_at || undefined;
      const isTrialStillActive =
        !isSubscribed && trialEndsAt && new Date(trialEndsAt).getTime() > Date.now();

      const syncedUser = updateUserProfile({
        id: session.user.id,
        name: profile.full_name || currentLocal.name || 'طالب ميكاترونكس',
        email: session.user.email || currentLocal.email,
        phone: profile.phone || currentLocal.phone,
        university: profile.university || currentLocal.university,
        level: profile.level || currentLocal.level,
        role: 'student',
        isSubscribed,
        subscription: isSubscribed
          ? {
              status: 'active',
              activatedAt: currentLocal.subscription?.activatedAt || new Date().toISOString(),
              expiresAt:
                currentLocal.subscription?.expiresAt ||
                new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
              priceYER: 10000,
              durationDays: 365,
            }
          : {
              status: isTrialStillActive ? 'trial' : 'trial_expired',
              trialExpiresAt: trialEndsAt,
              priceYER: 10000,
              durationDays: 365,
            },
      });
      setUser(syncedUser);
      setHasSession(true);
    } catch (err) {
      console.error('Auth verification error:', err);
      setHasSession(false);
    } finally {
      setAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    verifySupabaseSessionAndProfile();

    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        const stored = getStoredUser();
        if (stored.role !== 'owner') {
          const guest = resetStoredUser();
          setUser(guest);
          setHasSession(false);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [verifySupabaseSessionAndProfile]);

  // Live timer tick for active 24h free trial countdown (updates hours & minutes + auto-locks on expiry)
  useEffect(() => {
    if (!hasSession || user.role === 'owner' || user.isSubscribed) return;

    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 15000);

    return () => clearInterval(timer);
  }, [hasSession, user.role, user.isSubscribed]);

  const accessInfo = checkUserAccessStatus(user);

  const handleNavTabChange = (targetTab: string) => {
    setCurrentTab(targetTab);
  };

  const toggleRole = () => {
    const newRole = user.role === 'owner' ? 'student' : 'owner';
    const updated = updateUserProfile({ role: newRole });
    setUser(updated);
    if (newRole === 'owner') {
      setHasSession(true);
      setCurrentTab('owner');
    } else {
      setCurrentTab('home');
      verifySupabaseSessionAndProfile();
    }
  };

  const handleSelectLab = (labId: string) => {
    setSelectedLabType(labId as LabType);
    setCurrentTab('lab_3d');
  };

  const handleTakeBookToDoctorHall = (_book: EngineeringBook) => {
    setCurrentTab('doctor_hall');
  };

  const handleAuthSuccess = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    setHasSession(true);
    setAuthChecking(false);
    setIsUpgradeModalOpen(false);
    setCurrentTab('home');
  };

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    const guest = resetStoredUser();
    setUser(guest);
    setHasSession(false);
    setIsUpgradeModalOpen(false);
    setCurrentTab('home');
  };

  // Loading state while verifying session & profiles
  if (authChecking) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0A192F] text-[#0F172A] dark:text-slate-100 flex flex-col items-center justify-center p-6 gap-4">
        <Loader2 className="w-10 h-10 text-[#0EA5E9] dark:text-amber-400 animate-spin" />
        <p className="text-sm font-bold text-[#475569] dark:text-slate-300">
          جاري التحقق من حالة الاشتراك...
        </p>
      </div>
    );
  }

  // Unauthenticated Guest -> Show ONLY Login / Sign Up screen
  if (!hasSession && user.role !== 'owner') {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0A192F] text-[#0F172A] dark:text-slate-100 font-sans">
        <StudentAuthModal
          isOpen={true}
          allowClose={false}
          onSuccess={handleAuthSuccess}
          onOpenOwnerPortal={() => setIsSecretOwnerModalOpen(true)}
        />

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
            setHasSession(true);
            setCurrentTab('owner');
            setIsSecretOwnerModalOpen(false);
            if (window.location.hash) {
              window.history.replaceState(null, '', window.location.pathname);
            }
          }}
        />
      </div>
    );
  }

  // Case 3 (Expired Trial): is_subscribed == false AND trial_ends_at expired -> Block ALL content & show lock modal
  if (user.role !== 'owner' && !accessInfo.isAccessAllowed) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0A192F] text-[#0F172A] dark:text-slate-100 font-sans">
        <TrialExpiredLockModal
          isOpen={true}
          allowClose={false}
          user={user}
          onSuccess={handleAuthSuccess}
          onSignOut={handleSignOut}
        />

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
            setHasSession(true);
            setCurrentTab('owner');
            setIsSecretOwnerModalOpen(false);
            if (window.location.hash) {
              window.history.replaceState(null, '', window.location.pathname);
            }
          }}
        />
      </div>
    );
  }

  // Case 1 (Subscribed) or Case 2 (Active Trial)
  return (
    <div className="min-h-screen bg-white dark:bg-[#0A192F] text-[#0F172A] dark:text-slate-100 flex flex-col font-sans selection:bg-[#0EA5E9] selection:text-white dark:selection:bg-cyan-500 dark:selection:text-black w-full max-w-full overflow-x-hidden relative transition-colors duration-200">
      {/* Case 2: Yellow Free Trial Countdown Banner at Top */}
      {user.role !== 'owner' && accessInfo.statusType === 'trial' && (
        <div className="w-full bg-amber-300 dark:bg-amber-400 border-b border-amber-500/60 text-slate-950 px-3 sm:px-4 py-2 text-center text-xs sm:text-sm font-extrabold flex flex-wrap items-center justify-center gap-2 sm:gap-3 shadow-sm z-50">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-900 shrink-0" />
            <span>
              متبقي لك {accessInfo.remainingTrialHours} ساعة و {accessInfo.remainingTrialMinutes} دقيقة من التجربة المجانية.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsUpgradeModalOpen(true)}
            className="px-3 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-amber-300 text-xs font-black transition-all shadow cursor-pointer"
          >
            اشترك الآن!
          </button>
        </div>
      )}

      {/* Top Bar Navigation */}
      <Header
        currentTab={currentTab}
        setCurrentTab={handleNavTabChange}
        user={user}
        toggleRole={toggleRole}
        isDark={isDark}
        setIsDark={setIsDark}
        onSignOut={handleSignOut}
        onOwnerAuthSuccess={() => {
          const updated = updateUserProfile({ role: 'owner' });
          setUser(updated);
          setHasSession(true);
          setCurrentTab('owner');
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2 sm:px-4 lg:px-6 py-3 sm:py-4 min-w-0 overflow-x-hidden">
        {currentTab !== 'home' && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 champagne-card dark:bg-[#0D1B2A]/90 rounded-2xl px-4 py-3 backdrop-blur-md">
            <button
              onClick={() => setCurrentTab('home')}
              className="flex items-center gap-2 text-xs font-bold text-white bg-[#0EA5E9] hover:bg-[#0284C7] dark:text-slate-950 dark:bg-gradient-to-r dark:from-amber-400 dark:to-amber-500 dark:hover:from-amber-300 dark:hover:to-amber-400 px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 group"
            >
              <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>العودة للرئيسية (خروج) 🏠</span>
            </button>
            <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A] dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0EA5E9] dark:bg-cyan-400 animate-pulse" />
              <span>
                {currentTab === 'lecture_hall' && 'خدمة 1: قاعة المحاضرات وقسم اشرح لي 🎓'}
                {currentTab === 'doctor_hall' && 'خدمة 2: قاعة الدكتور (اسأل الدكتور) 🏛️'}
                {currentTab === 'solve_questions' && 'خدمة 3: حل أسئلتي (حتى 30+ سؤالاً) 📝'}
                {currentTab === 'smart_labs' && 'خدمة 4: مختبرات ومعامل ذكية (السنة 1 - 5 + Circuit Wizard) ⚡'}
                {currentTab === 'explain_lesson' && 'خدمة «اشرح لي الدرس»'}
                {currentTab === 'summarize' && 'خدمة «لخّص لي»'}
                {currentTab === 'lab_3d' && 'Circuit Wizard & المختبر الواقعي 3D'}
                {currentTab === 'library' && 'المكتبة الهندسية الشاملة (السنة 1 - 5)'}
                {currentTab === 'videos' && 'مركز الفيديوهات الهندسية'}
                {currentTab === 'assistant' && 'المساعد الذكي'}
                {currentTab === 'calculators' && 'الحاسبات الهندسية'}
                {currentTab === 'projects' && 'مركز المشاريع الهندسية'}
                {currentTab === 'quizzes' && 'مركز الاختبارات'}
                {currentTab === 'community' && 'مجتمع المهندسين'}
                {currentTab === 'upload_analyze' && '📚 ارفع محاضرتك وذاكر مع الدكتور (Upload & Analyze)'}
                {currentTab === 'ask_doctor' && '👨‍🏫 اسأل الدكتور'}
                {currentTab === 'student_questions' && '📨 أسئلتي للدكتور'}
                {currentTab === 'doctor_dashboard' && '👨‍🏫 لوحة الدكتور'}
                {currentTab === 'profile' && 'الملف الشخصي للطالب'}
                {currentTab === 'owner' && 'لوحة الإدارة المركزية'}
              </span>
            </div>
          </div>
        )}

        {currentTab === 'home' && (
          <HomePage setCurrentTab={setCurrentTab} onSelectLab={handleSelectLab} />
        )}

        {currentTab === 'upload_analyze' && <UploadAnalyzePage />}

        {currentTab === 'ask_doctor' && <AskDoctorPage user={user} setCurrentTab={setCurrentTab} />}

        {currentTab === 'student_questions' && <StudentQuestionsPage user={user} setCurrentTab={setCurrentTab} />}

        {currentTab === 'doctor_dashboard' && <DoctorDashboardPage onExit={() => setCurrentTab('home')} />}

        {currentTab === 'lecture_hall' && <LectureHallPage />}

        {currentTab === 'doctor_hall' && <DoctorHallPage />}

        {currentTab === 'solve_questions' && <SolveQuestionsPage />}

        {currentTab === 'smart_labs' && (
          <SmartLabsHubPage
            initialLabType={selectedLabType}
            onTakeBookToDoctorHall={handleTakeBookToDoctorHall}
            onNavigateTab={setCurrentTab}
          />
        )}

        {currentTab === 'explain_lesson' && <ExplainLessonPage />}

        {currentTab === 'summarize' && <SummarizePage />}

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

      {/* Mobile Bottom Navigation Bar — Home + 4 Flagship Services */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0A192F]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800/80 px-1 py-1.5 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setCurrentTab('home')}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-xl text-[10px] font-bold transition-all ${
            currentTab === 'home' ? 'text-[#0EA5E9] dark:text-amber-400' : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>الرئيسية</span>
        </button>

        <button
          onClick={() => setCurrentTab('lecture_hall')}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-xl text-[10px] font-bold transition-all ${
            currentTab === 'lecture_hall' ? 'text-[#0EA5E9] dark:text-cyan-400' : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>المحاضرات</span>
        </button>

        <button
          onClick={() => setCurrentTab('doctor_hall')}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-xl text-[10px] font-bold transition-all ${
            currentTab === 'doctor_hall' ? 'text-[#0EA5E9] dark:text-purple-400' : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>الدكتور</span>
        </button>

        <button
          onClick={() => setCurrentTab('solve_questions')}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-xl text-[10px] font-bold transition-all ${
            currentTab === 'solve_questions' ? 'text-[#0EA5E9] dark:text-amber-400' : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>حل أسئلتي</span>
        </button>

        <button
          onClick={() => setCurrentTab('smart_labs')}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-xl text-[10px] font-bold transition-all ${
            currentTab === 'smart_labs' ? 'text-[#0EA5E9] dark:text-emerald-400' : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>المختبرات</span>
        </button>
      </nav>

      {/* Voluntary Upgrade Modal from Yellow Trial Banner */}
      <TrialExpiredLockModal
        isOpen={isUpgradeModalOpen}
        allowClose={true}
        onClose={() => setIsUpgradeModalOpen(false)}
        user={user}
        onSuccess={handleAuthSuccess}
      />

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
          setHasSession(true);
          setCurrentTab('owner');
          setIsSecretOwnerModalOpen(false);
          if (window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }}
      />

      {/* Floating Announcements Widget */}
      <FloatingAnnouncementsWidget user={user} />

      {/* Floating Feedback Widget */}
      <FloatingFeedbackWidget user={user} />

      {/* Footer */}
      <footer className="w-full bg-[#F8FAFC] dark:bg-[#0D1B2A] border-t border-slate-200 dark:border-slate-800/80 py-6 pb-20 lg:pb-6 px-4 text-center text-xs text-[#475569] dark:text-slate-400">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-right">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#0EA5E9] dark:text-cyan-400" />
                <span className="font-bold text-[#0F172A] dark:text-slate-200">دكتور الميكاترونكس الذكي (Dr Mecha Smart)</span>
              </div>
              <a
                href="https://dr-mechasmart.online"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0EA5E9] hover:text-[#0284C7] dark:text-amber-400/90 dark:hover:text-amber-300 font-mono text-[11px] underline underline-offset-2"
              >
                dr-mechasmart.online
              </a>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-600">|</span>
              <span>تعلّم بذكاء، جرّب بواقعية، وابتكر بلا حدود</span>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-3 text-[11px]">
              <button onClick={() => setCurrentTab('home')} className="hover:text-[#0EA5E9] dark:hover:text-cyan-400 transition-colors">الرئيسية</button>
              <button onClick={() => setCurrentTab('lecture_hall')} className="hover:text-[#0EA5E9] dark:hover:text-cyan-400 transition-colors">قاعة المحاضرات</button>
              <button onClick={() => setCurrentTab('doctor_hall')} className="hover:text-[#0EA5E9] dark:hover:text-purple-400 transition-colors">قاعة الدكتور</button>
              <button onClick={() => setCurrentTab('solve_questions')} className="hover:text-[#0EA5E9] dark:hover:text-amber-400 transition-colors">حل أسئلتي</button>
              <button onClick={() => setCurrentTab('smart_labs')} className="hover:text-[#0EA5E9] dark:hover:text-emerald-400 transition-colors">مختبرات ومعامل ذكية</button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-center">
            <p className="text-xs sm:text-sm font-medium text-[#475569] dark:text-slate-300">
              جميع الحقوق محفوظة © 2025 لدى{' '}
              <a
                href="https://rqeebpro.online"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-[#0EA5E9] hover:text-[#0284C7] dark:text-amber-400 dark:hover:text-amber-300 underline decoration-[#0EA5E9]/40 hover:decoration-[#0284C7] dark:decoration-amber-400/50 dark:hover:decoration-amber-300 underline-offset-4 transition-all duration-200 hover:brightness-110"
              >
                رقيب للبرمجة والتسويق الرقمي
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
