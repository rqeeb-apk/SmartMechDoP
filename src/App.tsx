import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { DoctorHallPage } from './components/DoctorHall/DoctorHallPage';
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
import { OwnerDashboardPage } from './components/OwnerDashboard/OwnerDashboardPage';
import { getStoredUser, updateUserProfile } from './services/storage';
import { UserProfile, LabType, EngineeringBook } from './types';
import { Cpu, Heart, ShieldAlert, KeyRound } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [user, setUser] = useState<UserProfile>(getStoredUser());
  const [selectedLabType, setSelectedLabType] = useState<LabType>('circuits');
  const [isDark, setIsDark] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Check if student has active subscription
  const isSubscribedStudent = user.role === 'owner' || user.subscription?.status === 'active';

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
    <div className="min-h-screen bg-[#0A192F] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* Top Bar Contract Navigation */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        user={user}
        toggleRole={toggleRole}
        isDark={isDark}
        setIsDark={setIsDark}
        onOwnerAuthSuccess={() => {
          const updated = updateUserProfile({ role: 'owner' });
          setUser(updated);
          setCurrentTab('owner');
        }}
      />

      {/* Mandatory Student Subscription Gate Banner */}
      {!isSubscribedStudent && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 text-slate-950 px-4 py-2.5 text-center text-xs font-bold flex flex-wrap items-center justify-center gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            <span>تنبيـه: أنت متصفح بصفة طالب غير مفعل. يتطلب استخدام المنصة والدروس تفعيل كود الاشتراك السنوي (4000 ريال يمني).</span>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="px-3.5 py-1 rounded-lg bg-slate-950 text-amber-400 hover:bg-slate-900 text-xs font-bold transition-all shadow"
          >
            تفعيل الكود وإنشاء حساب طالب
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {currentTab === 'home' && (
          <HomePage setCurrentTab={setCurrentTab} onSelectLab={handleSelectLab} />
        )}

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

      {/* Mandatory Student Auth & Code Redemption Modal */}
      <StudentAuthModal
        isOpen={isAuthModalOpen || (!isSubscribedStudent && currentTab === 'profile')}
        onSuccess={handleAuthSuccess}
        onClose={() => setIsAuthModalOpen(false)}
        allowClose={isSubscribedStudent}
      />

      {/* Clean Footer */}
      <footer className="w-full bg-[#0D1B2A] border-t border-slate-800/80 py-6 px-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-200">منصة الدكتور الذكي للميكاترونكس</span>
            <span>· تعلّم بذكاء، جرّب بواقعية، وابتكر بلا حدود</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button onClick={() => setCurrentTab('home')} className="hover:text-cyan-400">الرئيسية</button>
            <button onClick={() => setCurrentTab('doctor_hall')} className="hover:text-cyan-400">قاعة الدكتور</button>
            <button onClick={() => setCurrentTab('lab_3d')} className="hover:text-cyan-400">المختبر 3D</button>
            <button onClick={() => setCurrentTab('library')} className="hover:text-cyan-400">المكتبة</button>
            <button onClick={toggleRole} className="hover:text-amber-400 font-mono">
              {user.role === 'owner' ? '[وضع المالك]' : '[وضع الطالب]'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

