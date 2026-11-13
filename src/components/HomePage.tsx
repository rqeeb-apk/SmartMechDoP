import React from 'react';
import {
  ArrowLeft, GraduationCap, Bot, FileCheck2, Zap, CheckCircle2,
  BookOpen, Calculator, Wrench, Trophy, Users, Sparkles
} from 'lucide-react';

interface HomePageProps {
  setCurrentTab: (tab: string) => void;
  onSelectLab?: (labType: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ setCurrentTab, onSelectLab }) => {
  const flagshipServices = [
    {
      id: 'lecture_hall',
      number: '01',
      title: 'خدمة قاعة المحاضرات',
      subtitle: 'قسم «اشرح لي» + السبورة الذكية',
      image: '/assets/theme/card_lecture_hall.png',
      accentBorder: 'hover:border-[#0EA5E9] dark:border-cyan-500/40 dark:hover:border-cyan-400',
      accentText: 'dark:text-cyan-300',
      ctaGradient: 'dark:from-cyan-400 dark:to-blue-500 dark:text-slate-950',
      ctaText: 'ادخل قاعة المحاضرات',
      summary:
        'اكتب نص المحاضرة أو ارفع صورة أو فيديو أو ملف أو رابط سوشيال ميديا مع مربع تفاصيل إضافية، واضغط «اشرح» ليعرض الدكتور الشرح كاملاً على سبورة بورد ذكية باللهجة اليمنية.',
      features: [
        'استقبال نص، صورة، فيديو، ملف PDF/DOCX، أو رابط فيديو سوشيال ميديا',
        'مربع تفاصيل إضافية لتحديد مستوى الشرح والتركيز المطلوب',
        'أنيميشن ذكي ورسومات توضيحية متحركة على السبورة الذكية بصوت دكتور يمني',
      ],
    },
    {
      id: 'doctor_hall',
      number: '02',
      title: 'خدمة قاعة الدكتور',
      subtitle: 'اسأل الدكتور مباشرة بأي وسيلة',
      image: '/assets/theme/card_doctor_hall.png',
      accentBorder: 'hover:border-[#0EA5E9] dark:border-purple-500/40 dark:hover:border-purple-400',
      accentText: 'dark:text-purple-300',
      ctaGradient: 'dark:from-amber-400 dark:to-yellow-500 dark:text-slate-950',
      ctaText: 'اسأل الدكتور الآن',
      summary:
        'تواصل مباشرة مع دكتور الميكاترونكس عبر نص أو صورة أو فيديو أو ملف أو رابط فيديو أو تصوير صورة بالكاميرا، ليتم الرد بشرح تفاعلي على السبورة الذكية.',
      features: [
        '6 طرق طرح للسؤال تشمل التصوير المباشر بالكاميرا وروابط الفيديو',
        'أمثلة واقعية من الحياة والهندسة اليمنية لترسيخ الفهم العملي',
        'رسومات توضيحية وتفاعلات خطوة بخطوة مع صوت الأستاذ الجامعي',
      ],
    },
    {
      id: 'solve_questions',
      number: '03',
      title: 'خدمة حل أسئلتي',
      subtitle: 'حل حتى 30+ سؤالاً دفعة واحدة',
      image: '/assets/theme/card_summarize.png',
      accentBorder: 'hover:border-[#0EA5E9] dark:border-amber-500/40 dark:hover:border-amber-400',
      accentText: 'dark:text-amber-300',
      ctaGradient: 'dark:from-amber-400 dark:via-orange-400 dark:to-yellow-500 dark:text-slate-950',
      ctaText: 'ابدأ حل الأسئلة',
      summary:
        'اطرح سؤالك أو ارفع ورقة الأسئلة كاملة أو فيديو أو ملف واضغط «حل» لاستخراج الإجابات الدقيقة لجميع الأسئلة مهما بلغت (حتى 30 سؤالاً وأكثر).',
      features: [
        'يدعم كل الأنماط: أتمتة، اختيارات متعددة، صح وخطأ، مقالي، ومباشر',
        'تلخيص الحل النهائي لكل سؤال مع توضيح السبب العلمي للوصول إلى هذا الحل',
        'إمكانية القراءة الصوتية وعرض الملخص على السبورة وتصدير الحلول',
      ],
    },
    {
      id: 'smart_labs',
      number: '04',
      title: 'مختبرات ومعامل ذكية',
      subtitle: 'مكاتب السنة 1 – 5 + Circuit Wizard',
      image: '/assets/theme/card_lab_3d.png',
      accentBorder: 'hover:border-[#0EA5E9] dark:border-emerald-500/40 dark:hover:border-emerald-400',
      accentText: 'dark:text-emerald-300',
      ctaGradient: 'dark:from-emerald-400 dark:to-teal-500 dark:text-slate-950',
      ctaText: 'افتح المعامل والمكاتب',
      summary:
        'مختبرات ومعامل تخصصية شاملة لطلاب الميكاترونكس من السنة الأولى إلى الخامسة، تضم بيئة Circuit Wizard وجميع المكاتب والكتب والحاسبات والمحاكاة 3D.',
      features: [
        'Circuit Wizard Studio التفاعلي مع الملتميتر وراسم الإشارة ومزود القدرة',
        'تصنيف أكاديمي متكامل من السنة الأولى إلى السنة الخامسة',
        'مختبرات 3D للروبوتات، الدرونز، التروس الميكانيكية، وأنظمة التحكم PLC',
      ],
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 pb-20 select-none font-sans text-[#0F172A] dark:text-slate-100 w-full max-w-full overflow-x-hidden min-w-0">
      {/* =====================================================================
          HERO BANNER: Clean Typography + Robot Visual + 4 Flagship Service CTAs
         ===================================================================== */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl champagne-card dark:bg-gradient-to-br dark:from-[#061426] dark:via-[#081B38] dark:to-[#040C1A] dark:border-cyan-500/40 p-4 sm:p-6 lg:p-8 w-full max-w-full min-w-0">
        <div className="relative z-10 flex flex-col-reverse lg:flex-row items-center justify-between gap-5 sm:gap-8 w-full min-w-0">
          {/* Hero Visual */}
          <div className="w-full lg:w-5/12 flex justify-center min-w-0">
            <div className="relative max-w-sm sm:max-w-md w-full rounded-2xl overflow-hidden border border-[rgba(212,175,55,0.4)] dark:border-cyan-400/40 shadow-lg max-h-56 sm:max-h-72 bg-white dark:bg-[#061426]">
              <img
                src="/assets/theme/hero_robot.png"
                alt="منصة دكتور الميكاترونكس الذكي"
                className="w-full h-full object-cover block"
              />
              <div className="hidden dark:block absolute inset-0 bg-gradient-to-t from-[#061426]/65 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Hero Copy & Direct 4-Service Actions */}
          <div className="w-full lg:w-7/12 space-y-3 sm:space-y-4 text-center lg:text-right min-w-0">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-[#E0F2FE] dark:bg-cyan-500/15 text-[#0284C7] dark:text-cyan-300 text-xs sm:text-sm font-black mb-1.5 border border-[#0EA5E9]/25 dark:border-cyan-500/30">
                البيئة التعليمية التفاعلية لطلاب الميكاترونكس (السنة 1 – 5)
              </span>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] dark:text-white tracking-tight leading-tight mt-1">
                منصة دكتور <span className="text-[#0EA5E9] dark:text-amber-400">الميكاترونكس</span> الذكي
              </h1>
            </div>

            <p className="text-xs sm:text-sm text-[#475569] dark:text-slate-200 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
              افهم محاضراتك باللهجة اليمنية على سبورة ذكية متحركة، اسأل الدكتور مباشرة بالصورة أو الفيديو أو الكاميرا، حل أوراق الأسئلة حتى 30+ سؤالاً مع التعليل، وطبق عملياً داخل Circuit Wizard ومعامل 3D.
            </p>

            {/* 4 Flagship Quick Action Buttons (>=44px height) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 max-w-2xl mx-auto lg:mx-0 w-full min-w-0">
              <button
                onClick={() => setCurrentTab('lecture_hall')}
                className="min-h-[44px] px-2.5 py-2.5 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white dark:bg-gradient-to-r dark:from-cyan-500 dark:to-blue-600 font-black text-xs shadow-md shadow-sky-500/20 flex items-center justify-center gap-1.5 active:scale-95 transition-all min-w-0 cursor-pointer"
              >
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span className="truncate">قاعة المحاضرات</span>
              </button>

              <button
                onClick={() => setCurrentTab('doctor_hall')}
                className="min-h-[44px] px-2.5 py-2.5 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white dark:bg-gradient-to-r dark:from-indigo-600 dark:to-purple-600 font-black text-xs shadow-md shadow-sky-500/20 flex items-center justify-center gap-1.5 active:scale-95 transition-all min-w-0 cursor-pointer"
              >
                <Bot className="w-4 h-4 shrink-0" />
                <span className="truncate">قاعة الدكتور</span>
              </button>

              <button
                onClick={() => setCurrentTab('solve_questions')}
                className="min-h-[44px] px-2.5 py-2.5 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white dark:bg-gradient-to-r dark:from-amber-500 dark:to-orange-500 dark:text-slate-950 font-black text-xs shadow-md shadow-sky-500/20 flex items-center justify-center gap-1.5 active:scale-95 transition-all min-w-0 cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4 shrink-0" />
                <span className="truncate">حل أسئلتي</span>
              </button>

              <button
                onClick={() => setCurrentTab('smart_labs')}
                className="min-h-[44px] px-2.5 py-2.5 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white dark:bg-gradient-to-r dark:from-emerald-500 dark:to-teal-500 dark:text-slate-950 font-black text-xs shadow-md shadow-sky-500/20 flex items-center justify-center gap-1.5 active:scale-95 transition-all min-w-0 cursor-pointer"
              >
                <Zap className="w-4 h-4 shrink-0" />
                <span className="truncate">مختبرات ومعامل</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: The 4 Core Services (Clean 2x2 Architectural Grid)
         ===================================================================== */}
      <section className="space-y-4 w-full max-w-full min-w-0 rounded-2xl sm:rounded-3xl bg-[#F8FAFC] dark:bg-transparent border border-slate-200/70 dark:border-transparent p-3 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 px-1">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-[#0F172A] dark:text-white">الخدمات الأساسية الأربعة في المنصة</h2>
            <p className="text-xs sm:text-sm text-[#475569] dark:text-slate-400">
              صُممت كل خدمة خصيصاً لتجعل الفهم أسرع والتطبيق أقرب للواقع الهندسي
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 w-full min-w-0">
          {flagshipServices.map((srv) => (
            <article
              key={srv.id}
              className={`rounded-2xl sm:rounded-3xl champagne-card dark:bg-[#0B192E] dark:border-2 ${srv.accentBorder} p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all min-w-0`}
            >
              <div className="space-y-3.5 min-w-0">
                {/* Card Header + Thumbnail */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden sky-icon-box dark:bg-slate-900 dark:border-slate-700/80 p-0.5 shrink-0 shadow-sm">
                    <img
                      src={srv.image}
                      alt={srv.title}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-right space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-block px-2 py-0.5 rounded-md bg-[#E0F2FE] text-[#0284C7] dark:bg-transparent ${srv.accentText} text-[11px] font-black`}>
                        {srv.subtitle}
                      </span>
                      <span className="text-xs font-mono font-black text-[#0EA5E9] dark:text-slate-500">#{srv.number}</span>
                    </div>
                    <h3 className="text-base sm:text-xl font-black text-[#0F172A] dark:text-white leading-snug">{srv.title}</h3>
                    <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed line-clamp-3">{srv.summary}</p>
                  </div>
                </div>

                {/* Clear Capability Checklist */}
                <ul className="space-y-1.5 pt-2.5 border-t border-[rgba(212,175,55,0.25)] dark:border-slate-800/80 text-xs text-[#475569] dark:text-slate-200">
                  {srv.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0EA5E9] dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => setCurrentTab(srv.id)}
                className={`w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white dark:bg-gradient-to-r ${srv.ctaGradient} font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-sky-500/20 dark:shadow-lg hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer`}
              >
                <span>{srv.ctaText}</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* =====================================================================
          SECTION 3: Specialized Years 1-5 + Circuit Wizard & 3D Labs Strip
         ===================================================================== */}
      <section className="rounded-2xl sm:rounded-3xl champagne-card dark:bg-[#07152B] dark:border-cyan-500/35 p-4 sm:p-5 space-y-4 w-full max-w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-white">
              المختبرات التخصصية الواقعية (3D & Circuit Wizard)
            </h2>
            <p className="text-xs text-[#475569] dark:text-slate-400">
              اختر أي معمل للانتقال مباشرة إلى بيئة التجربة والمحاكاة الواقعية
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentTab('smart_labs')}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white dark:bg-amber-400/15 dark:border dark:border-amber-400/40 dark:text-amber-300 text-xs font-black dark:hover:bg-amber-400 dark:hover:text-slate-950 transition-colors cursor-pointer shadow-sm"
          >
            استعراض مكاتب السنة 1 – 5 ←
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-2.5 w-full min-w-0">
          {[
            { id: 'circuits', name: 'Circuit Wizard', img: '/assets/theme/lab_circuits.png' },
            { id: 'electronics', name: 'الإلكترونيات', img: '/assets/theme/lab_electronics.png' },
            { id: 'arduino', name: 'الأردوينو والأنظمة', img: '/assets/theme/lab_arduino.png' },
            { id: 'robotics', name: 'الروبوتات 3D', img: '/assets/theme/lab_robotics.png' },
            { id: 'mechanical', name: 'التروس والميكانيكا', img: '/assets/theme/lab_mechanical.png' },
            { id: 'control', name: 'التحكم و PLC', img: '/assets/theme/lab_control.png' },
            { id: 'drones', name: 'طائرات الدرون UAV', img: '/assets/theme/lab_drones.png' },
            { id: 'innovation', name: 'التصنيع والابتكار', img: '/assets/theme/lab_manufacturing.png' },
          ].map((lab) => (
            <button
              key={lab.id}
              type="button"
              onClick={() => {
                if (onSelectLab) {
                  onSelectLab(lab.id);
                } else {
                  setCurrentTab('smart_labs');
                }
              }}
              className="rounded-xl champagne-subcard dark:bg-[#081E3B] dark:border-cyan-500/30 hover:border-[#0EA5E9] dark:hover:border-amber-400 p-2 text-center transition-all cursor-pointer group min-w-0 flex flex-col justify-between"
            >
              <div className="w-full h-14 sm:h-16 rounded-lg overflow-hidden bg-[#E0F2FE] dark:bg-black/40 border border-sky-200 dark:border-slate-700/60 mb-1.5">
                <img
                  src={lab.img}
                  alt={lab.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <span className="text-[11px] font-black text-[#0F172A] dark:text-slate-100 group-hover:text-[#0EA5E9] dark:group-hover:text-amber-300 truncate block">
                {lab.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* =====================================================================
          SECTION 4: Compact Student Journey & Engineering Utilities
         ===================================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full min-w-0 bg-[#F8FAFC] dark:bg-transparent border border-slate-200/70 dark:border-transparent rounded-2xl p-3 sm:p-4">
        {/* Student Journey */}
        <div className="lg:col-span-7 rounded-2xl champagne-card dark:bg-[#061426] dark:border-cyan-500/30 p-4 space-y-3 min-w-0">
          <h3 className="text-sm font-black text-[#0F172A] dark:text-amber-300">رحلة الطالب في منصة دكتور الميكاترونكس</h3>
          <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'lecture_hall', label: 'تعلّم', icon: '🎓' },
              { id: 'doctor_hall', label: 'اسأل', icon: '🏛️' },
              { id: 'solve_questions', label: 'حل أسئلتك', icon: '📝' },
              { id: 'smart_labs', label: 'جرّب عملياً', icon: '⚡' },
              { id: 'quizzes', label: 'اختبر نفسك', icon: '🏆' },
            ].map((step, idx, arr) => (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => setCurrentTab(step.id)}
                  className="flex flex-col items-center gap-1 shrink-0 min-w-[58px] group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full sky-icon-box dark:bg-slate-900 dark:border-cyan-500/40 group-hover:border-[#0EA5E9] dark:group-hover:border-amber-400 flex items-center justify-center text-base shadow-sm">
                    {step.icon}
                  </div>
                  <span className="text-[11px] font-bold text-[#0F172A] dark:text-slate-200 group-hover:text-[#0EA5E9] dark:group-hover:text-amber-300 whitespace-nowrap">
                    {step.label}
                  </span>
                </button>
                {idx < arr.length - 1 && <span className="text-[#0EA5E9] dark:text-amber-400 text-xs font-bold shrink-0">←</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Supporting Engineering Tools Strip */}
        <div className="lg:col-span-5 rounded-2xl champagne-card dark:bg-[#061426] dark:border-slate-800 p-4 space-y-3 min-w-0">
          <h3 className="text-sm font-black text-[#0F172A] dark:text-white">أدوات مساندة للمهندسين</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'library', label: 'المكتبة (1-5)', icon: BookOpen },
              { id: 'calculators', label: 'الحاسبات', icon: Calculator },
              { id: 'assistant', label: 'المساعد الذكي', icon: Sparkles },
              { id: 'projects', label: 'المشاريع', icon: Wrench },
              { id: 'quizzes', label: 'الاختبارات', icon: Trophy },
              { id: 'community', label: 'المجتمع', icon: Users },
            ].map((util) => {
              const Icon = util.icon;
              return (
                <button
                  key={util.id}
                  type="button"
                  onClick={() => setCurrentTab(util.id)}
                  className="min-h-[42px] px-2 py-2 rounded-xl champagne-subcard dark:bg-slate-900 dark:border-slate-800 hover:border-[#0EA5E9] dark:hover:border-cyan-400 text-[#0F172A] dark:text-slate-200 hover:text-[#0284C7] dark:hover:text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="w-5 h-5 rounded-md sky-icon-box flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                  </span>
                  <span className="truncate">{util.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
