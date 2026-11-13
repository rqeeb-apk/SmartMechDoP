import React, { useState } from 'react';
import {
  Zap, Cpu, Layers, BookOpen, Calculator, Bot, Shield, Flame, Box,
  GraduationCap, ArrowLeft, Sparkles, Compass, Wrench
} from 'lucide-react';
import { AcademicYearId, EngineeringBook, LabType } from '../../types';
import { LabWorkspace3D } from '../Lab3D/LabWorkspace3D';
import { EngineeringLibraryPage } from '../EngineeringLibrary/EngineeringLibraryPage';
import { CalculatorsPage } from '../Calculators/CalculatorsPage';

interface SmartLabsHubPageProps {
  initialLabType?: LabType;
  onTakeBookToDoctorHall?: (book: EngineeringBook) => void;
  onNavigateTab?: (tab: string) => void;
}

interface YearCurriculumSpec {
  id: AcademicYearId;
  title: string;
  subtitle: string;
  colorClass: string;
  borderClass: string;
  libraries: {
    name: string;
    tool: string;
    desc: string;
    actionTab: 'circuit_wizard' | 'lab_3d' | 'library' | 'calculators' | 'assistant';
    labTarget?: LabType;
  }[];
  courses: string[];
}

const YEARS_CURRICULUM: YearCurriculumSpec[] = [
  {
    id: 'year1',
    title: 'السنة الأولى',
    subtitle: 'أساسيات الدوائر والفيزياء والبرمجة',
    colorClass: 'text-[#0F172A] dark:text-cyan-300',
    borderClass: 'dark:border-cyan-500/40',
    courses: ['تحليل الدوائر DC/AC', 'الفيزياء الهندسية', 'مبادئ البرمجة C++', 'الرسم الهندسي'],
    libraries: [
      {
        name: 'مختبر Circuit Wizard للدوائر الأساسية',
        tool: 'Circuit Wizard Studio',
        desc: 'بناء دوائر أوم وكيرشوف والمقاومات والمكثفات مع قياس مباشر بالملتميتر.',
        actionTab: 'circuit_wizard',
      },
      {
        name: 'حاسبة أوم والمقاومات المكافئة',
        tool: 'حاسبات السنة الأولى',
        desc: 'حساب الجهد والتيار والقدرة وتوصيل التوالي والتوازي بدقة فورية.',
        actionTab: 'calculators',
      },
      {
        name: 'مكتبة ومراجع السنة الأولى',
        tool: 'المكتبة التخصصية',
        desc: 'كتب تحليل الدوائر الكهربائية ومذكرات التجارب التأسيسية.',
        actionTab: 'library',
      },
    ],
  },
  {
    id: 'year2',
    title: 'السنة الثانية',
    subtitle: 'الإلكترونيات والمنطق الرقمي والميكانيكا',
    colorClass: 'text-[#0F172A] dark:text-amber-300',
    borderClass: 'dark:border-amber-500/40',
    courses: ['الإلكترونيات التناظرية Op-Amp & BJT', 'التصميم المنطقي الرقمي', 'الاستاتيكا والديناميكا', 'ميكانيكا الموائع'],
    libraries: [
      {
        name: 'Circuit Wizard للإلكترونيات والترانزستور',
        tool: 'Circuit Wizard + Rigol Oscilloscope',
        desc: 'محاكاة الترانزستورات BJT/MOSFET ومقومات الجسر مع راسم إشارة حي.',
        actionTab: 'circuit_wizard',
      },
      {
        name: 'معمل التروس والمحركات الميكانيكية 3D',
        tool: 'مختبر الميكانيكا 3D',
        desc: 'تجربة تعشيق التروس ونسب التخفيض وعزم الدوران بشكل ثلاثي الأبعاد.',
        actionTab: 'lab_3d',
        labTarget: 'mechanical',
      },
      {
        name: 'مكتبة الإلكترونيات والميكانيكا',
        tool: 'مكتبة السنة الثانية',
        desc: 'مراجع الدوائر الإلكترونية والمضخمات والمنطق الرقمي.',
        actionTab: 'library',
      },
    ],
  },
  {
    id: 'year3',
    title: 'السنة الثالثة',
    subtitle: 'المتحكمات الدقيقة والحساسات والمحركات',
    colorClass: 'text-[#0F172A] dark:text-emerald-300',
    borderClass: 'dark:border-emerald-500/40',
    courses: ['المتحكمات الدقيقة Arduino/PIC', 'المستشعرات والمشغلات', 'آلات التيار المستمر والمتردد', 'هيدروليك ونيوماتيك'],
    libraries: [
      {
        name: 'معمل الأردوينو والأنظمة المضمنة (Circuit Wizard + MCU)',
        tool: 'Arduino & Breadboard Bench',
        desc: 'توصيل Arduino UNO و ESP32 مع الحساسات والشاشات والسيرفو وتوليد الكود.',
        actionTab: 'circuit_wizard',
      },
      {
        name: 'حاسبة عزم وسرعة المحركات والـ RC',
        tool: 'حاسبات السنة الثالثة',
        desc: 'تحويل القدرة للـ Torque وحساب الترددات والزمن الثابت.',
        actionTab: 'calculators',
      },
      {
        name: 'فاحص كود الأردوينو واستكشاف الأعطال',
        tool: 'المساعد الهندسي',
        desc: 'مراجعة أكواد C++ وكشف أخطاء التوصيل والـ Pinouts.',
        actionTab: 'assistant',
      },
    ],
  },
  {
    id: 'year4',
    title: 'السنة الرابعة',
    subtitle: 'التحكم الآلي و PLC وهندسة الروبوتات',
    colorClass: 'text-[#0F172A] dark:text-purple-300',
    borderClass: 'dark:border-purple-500/40',
    courses: ['نظرية التحكم الآلي PID', 'برمجة المتحكمات المنطقية PLC', 'كينماتيكا الروبوتات الصناعية', 'إلكترونيات القوى'],
    libraries: [
      {
        name: 'مختبر الذراع الروبوتي 4-DOF 3D',
        tool: 'Robotics 3D Lab',
        desc: 'تحريك مفاصل الذراع الروبوتية ومراقبة الكينماتيكا الأمامية في الفضاء ثلاثي الأبعاد.',
        actionTab: 'lab_3d',
        labTarget: 'robotics',
      },
      {
        name: 'مختبر التحكم والأتمتة الصناعية PLC',
        tool: 'Control & PLC Workbench',
        desc: 'محاكاة أنظمة التحكم والسيور الآلية ومراقبة الاستجابة.',
        actionTab: 'lab_3d',
        labTarget: 'control',
      },
      {
        name: 'مكتبة التحكم والروبوتات (السنة الرابعة)',
        tool: 'مكتبة السنة الرابعة',
        desc: 'مراجع مصفوفات التحويل والـ PID والـ Ladder Logic.',
        actionTab: 'library',
      },
    ],
  },
  {
    id: 'year5',
    title: 'السنة الخامسة',
    subtitle: 'التخرج والدرونز والذكاء الاصطناعي و CNC',
    colorClass: 'text-[#0F172A] dark:text-rose-300',
    borderClass: 'dark:border-rose-500/40',
    courses: ['الطائرات بدون طيار UAV', 'الذكاء الاصطناعي والرؤية الحاسوبية', 'التصنيع الرقمي CNC & CAD/CAM', 'إنترنت الأشياء الصناعي IIoT'],
    libraries: [
      {
        name: 'مختبر الطائرات المسيرة UAV Drones 3D',
        tool: 'Drone Flight & PID Simulator',
        desc: 'التحكم في زوايا Pitch/Roll/Yaw وسرعة المراوح واستقرار الطيران ثلاثي الأبعاد.',
        actionTab: 'lab_3d',
        labTarget: 'drones',
      },
      {
        name: 'مختبر التصنيع والابتكار ومشاريع التخرج',
        tool: 'Circuit Wizard & Mechatronics Suite',
        desc: 'بيئة متكاملة لتصميم وتجربة الدوائر والأنظمة النهائية لمشروع التخرج.',
        actionTab: 'circuit_wizard',
      },
      {
        name: 'مكتبة مشاريع التخرج والـ AI',
        tool: 'مكتبة السنة الخامسة',
        desc: 'أدلة تصميم الروبوتات المتقدمة والـ ESP32 IoT وأنظمة الرؤية.',
        actionTab: 'library',
      },
    ],
  },
];

export const SmartLabsHubPage: React.FC<SmartLabsHubPageProps> = ({
  initialLabType = 'circuits',
  onTakeBookToDoctorHall,
  onNavigateTab,
}) => {
  const [selectedYear, setSelectedYear] = useState<'all' | AcademicYearId>('all');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<
    'directory' | 'circuit_wizard' | 'lab_3d' | 'library' | 'calculators'
  >('directory');
  const [activeLabTarget, setActiveLabTarget] = useState<LabType>(initialLabType);

  const launchWorkbenchTool = (
    tab: 'circuit_wizard' | 'lab_3d' | 'library' | 'calculators' | 'assistant',
    labTarget?: LabType
  ) => {
    if (tab === 'assistant' && onNavigateTab) {
      onNavigateTab('assistant');
      return;
    }
    if (labTarget) setActiveLabTarget(labTarget);
    if (tab === 'circuit_wizard') {
      setActiveLabTarget('circuits');
      setActiveWorkspaceTab('circuit_wizard');
    } else if (tab !== 'assistant') {
      setActiveWorkspaceTab(tab);
    }
  };

  const visibleYears =
    selectedYear === 'all'
      ? YEARS_CURRICULUM
      : YEARS_CURRICULUM.filter((y) => y.id === selectedYear);

  return (
    <div className="space-y-6 pb-20 w-full max-w-full overflow-x-hidden min-w-0 font-sans text-[#0F172A] dark:text-slate-100">
      {/* Header */}
      <section className="champagne-card dark:bg-gradient-to-br dark:from-[#061D22] dark:via-[#0A192F] dark:to-[#0D1E38] dark:border-2 dark:border-cyan-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5 text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E0F2FE] dark:bg-cyan-500/15 border border-[#0EA5E9]/30 dark:border-cyan-400/40 text-[#0284C7] dark:text-cyan-300 text-xs font-black">
              <Zap className="w-4 h-4 text-[#0EA5E9] dark:text-amber-400" />
              <span>الخدمة 4 · مختبرات ومعامل ذكية (السنة الأولى ← الخامسة)</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-[#0F172A] dark:text-white">
              معامل الميكاترونكس و <span className="text-[#0EA5E9] dark:text-amber-400">Circuit Wizard</span> الشاملة
            </h1>
            <p className="text-xs sm:text-sm text-[#475569] dark:text-slate-300 max-w-3xl">
              مكاتب ومعامل تخصصية كاملة لطلاب هندسة الميكاترونكس من السنة الأولى إلى الخامسة — تشمل Circuit Wizard، مختبر 3D، المكتبات الهندسية، والحاسبات الدقيقة.
            </p>
          </div>

          <button
            type="button"
            onClick={() => launchWorkbenchTool('circuit_wizard')}
            className="w-full lg:w-auto px-6 py-3 rounded-2xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white dark:bg-gradient-to-r dark:from-amber-400 dark:to-yellow-500 dark:text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-sky-500/25 dark:shadow-amber-500/25 flex items-center justify-center gap-2 shrink-0 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>تشغيل Circuit Wizard مباشرة ⚡</span>
          </button>
        </div>

        {/* Workspace Mode Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-[rgba(212,175,55,0.25)] dark:border-slate-800">
          {[
            { id: 'directory', label: 'دليل المكاتب (السنة 1 - 5)', icon: GraduationCap },
            { id: 'circuit_wizard', label: 'Circuit Wizard Studio (2D/3D)', icon: Zap },
            { id: 'lab_3d', label: 'المختبرات التخصصية 3D', icon: Box },
            { id: 'library', label: 'المكتبة الهندسية الشاملة', icon: BookOpen },
            { id: 'calculators', label: 'الحاسبات الهندسية', icon: Calculator },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeWorkspaceTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveWorkspaceTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-[#0EA5E9] text-white dark:bg-cyan-500 dark:text-slate-950 shadow-md'
                    : 'bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-800 text-[#475569] dark:text-slate-300 hover:border-[#0EA5E9] dark:hover:border-amber-400'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white dark:text-slate-950' : 'text-[#0EA5E9] dark:text-slate-300'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* TAB 1: Years 1-5 Directory & Specialized Benches */}
      {activeWorkspaceTab === 'directory' && (
        <div className="space-y-6">
          {/* Year 1 -> Year 5 Filter Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedYear('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                selectedYear === 'all'
                  ? 'bg-[#0EA5E9] text-white dark:bg-amber-400 dark:text-slate-950 shadow'
                  : 'champagne-subcard dark:bg-[#0D1B2A] dark:border-slate-800 text-[#0F172A] dark:text-slate-300'
              }`}
            >
              جميع السنوات والمكاتب (1 – 5)
            </button>
            {YEARS_CURRICULUM.map((yr) => (
              <button
                key={yr.id}
                onClick={() => setSelectedYear(yr.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                  selectedYear === yr.id
                    ? 'bg-[#0EA5E9] text-white dark:bg-cyan-500 dark:text-slate-950 font-black shadow'
                    : 'champagne-subcard dark:bg-[#0D1B2A] dark:border-slate-800 text-[#475569] dark:text-slate-300 hover:border-[#0EA5E9] dark:hover:border-cyan-400'
                }`}
              >
                {yr.title}
              </button>
            ))}
          </div>

          {/* Highlighted Circuit Wizard & Labs Quick-Launch Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div
              onClick={() => launchWorkbenchTool('circuit_wizard')}
              className="p-4 rounded-2xl champagne-card dark:bg-gradient-to-br dark:from-[#0B2239] dark:to-[#081526] dark:border-2 dark:border-amber-400/50 hover:border-[#0EA5E9] dark:hover:border-amber-300 cursor-pointer transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-[#0F172A] dark:text-amber-300 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl sky-icon-box flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4" />
                  </span>
                  <span>Circuit Wizard Studio</span>
                </span>
                <span className="text-[10px] font-mono text-[#0284C7] dark:text-emerald-400 font-bold">● تفاعلي</span>
              </div>
              <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed">
                بناء ومحاكاة الدوائر الكهربائية والإلكترونية والأردوينو + راسم إشارة Rigol + ملتميتر Fluke.
              </p>
            </div>

            <div
              onClick={() => launchWorkbenchTool('lab_3d', 'robotics')}
              className="p-4 rounded-2xl champagne-card dark:bg-[#0D1B2A] dark:border-cyan-500/40 hover:border-[#0EA5E9] dark:hover:border-cyan-300 cursor-pointer transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-[#0F172A] dark:text-cyan-300 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl sky-icon-box flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </span>
                  <span>مختبرات الروبوتات والدرون والتروس 3D</span>
                </span>
              </div>
              <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed">
                تجربة ذراع روبوت 4-DOF وطائرة UAV وتروس ميكانيكية وأنظمة تحكم في الفضاء ثلاثي الأبعاد.
              </p>
            </div>

            <div
              onClick={() => setActiveWorkspaceTab('library')}
              className="p-4 rounded-2xl champagne-card dark:bg-[#0D1B2A] dark:border-purple-500/40 hover:border-[#0EA5E9] dark:hover:border-purple-300 cursor-pointer transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-[#0F172A] dark:text-purple-300 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl sky-icon-box flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </span>
                  <span>جميع المكاتب والكتب الهندسية</span>
                </span>
              </div>
              <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed">
                مراجع هندسة الميكاترونكس المصنفة من السنة الأولى حتى الخامسة مع قارئ فوري وشرح الدكتور.
              </p>
            </div>
          </div>

          {/* Year Cards Grid */}
          <div className="space-y-4">
            {visibleYears.map((yr) => (
              <section
                key={yr.id}
                className={`champagne-card dark:bg-[#0D1B2A] dark:border-2 ${yr.borderClass} rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-4`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[rgba(212,175,55,0.25)] dark:border-slate-800 pb-3">
                  <div>
                    <h2 className={`text-lg sm:text-xl font-black ${yr.colorClass}`}>{yr.title}</h2>
                    <p className="text-xs text-[#475569] dark:text-slate-300">{yr.subtitle}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {yr.courses.map((c) => (
                      <span
                        key={c}
                        className="px-2.5 py-1 rounded-lg bg-[#E0F2FE] dark:bg-slate-900 border border-[#0EA5E9]/25 dark:border-slate-800 text-[10px] font-bold text-[#0284C7] dark:text-slate-300"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {yr.libraries.map((lib) => (
                    <div
                      key={lib.name}
                      className="p-4 rounded-2xl champagne-subcard dark:bg-slate-900/90 dark:border-slate-800 hover:border-[#0EA5E9] dark:hover:border-amber-400/60 flex flex-col justify-between gap-3 transition-all"
                    >
                      <div className="space-y-1.5 text-right">
                        <div className="text-[11px] font-mono text-[#0284C7] dark:text-cyan-400 font-bold">{lib.tool}</div>
                        <h3 className="text-sm font-black text-[#0F172A] dark:text-white">{lib.name}</h3>
                        <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed">{lib.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => launchWorkbenchTool(lib.actionTab, lib.labTarget)}
                        className="w-full py-2.5 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white dark:bg-gradient-to-r dark:from-amber-400 dark:to-yellow-500 dark:text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 hover:opacity-95 cursor-pointer transition-colors"
                      >
                        <span>فتح المعمل / المكتب</span>
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2 & 3: Interactive Circuit Wizard Studio (2D Drag & Drop) + 3D Labs */}
      {(activeWorkspaceTab === 'circuit_wizard' || activeWorkspaceTab === 'lab_3d') && (
        <div className="space-y-4">
          {activeWorkspaceTab === 'circuit_wizard' && (
            <div className="p-3.5 rounded-2xl bg-[#E0F2FE] dark:bg-amber-500/10 border border-[#0EA5E9]/35 dark:border-amber-400/40 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 font-black text-[#0284C7] dark:text-amber-300">
                <Zap className="w-4 h-4" />
                <span>بيئة Circuit Wizard Studio النشطة · اسحب القطع ووصل الأسلاك وقس الجهد والتيار فوراً</span>
              </div>
              <span className="text-[#475569] dark:text-slate-300 font-mono text-[11px]">
                توصيل ذكي + راسم إشارة Rigol + ملتميتر Fluke
              </span>
            </div>
          )}
          <LabWorkspace3D
            initialLabType={activeLabTarget}
            initialViewMode={activeWorkspaceTab === 'circuit_wizard' ? 'drag_drop' : '3d_sim'}
          />
        </div>
      )}

      {/* TAB 4: Comprehensive Engineering Library (Years 1-5) */}
      {activeWorkspaceTab === 'library' && (
        <EngineeringLibraryPage onTakeToDoctorHall={onTakeBookToDoctorHall} />
      )}

      {/* TAB 5: Precision Engineering Calculators */}
      {activeWorkspaceTab === 'calculators' && <CalculatorsPage />}
    </div>
  );
};
