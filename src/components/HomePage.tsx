import React from 'react';
import { Bot, Layers, BookOpen, Sparkles, Calculator, Award, Users, ArrowLeft, Zap, Shield, Flame, Activity, CheckCircle2, Code, Box, Cpu } from 'lucide-react';
import { OFFICIAL_LOGO_URL } from '../services/storage';

interface HomePageProps {
  setCurrentTab: (tab: string) => void;
  onSelectLab?: (labType: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ setCurrentTab, onSelectLab }) => {
  const mainServices = [
    {
      id: 'explain_lesson',
      title: 'اشرح لي الدرس',
      subtitle: 'الخدمة الذكية للدروس والمرفقات',
      description: 'ارفع نصاً أو صورة أو فيديو أو PDF وسيقوم المدرس الذكي بتحليل المحتوى وشرحه بدقة متناهية خطوة بخطوة وفق 14 مرحلة أكاديمية.',
      icon: Sparkles,
      color: 'from-amber-500 via-orange-500 to-amber-600',
      badge: 'جديد · شرح مطابق للمصدر 100%',
    },
    {
      id: 'summarize',
      title: 'لخّص لي',
      subtitle: 'ملخصات ذكية وأوراق مراجعة',
      description: 'ارفع محاضرتك أو ملفك وسأحوّله إلى ملخص واضح وسهل للمراجعة مع 5 طرق تلخيص ذكية واستخراج القوانين والتعريفات.',
      icon: BookOpen,
      color: 'from-amber-600 via-orange-500 to-amber-500',
      badge: 'جديد · مراجعة سريعة',
    },
    {
      id: 'doctor_hall',
      title: 'قاعة الدكتور الذكي',
      subtitle: 'القلب التعليمي للمنصة',
      description: 'استمع لشرح تفاعلي مباشر من دكتور الميكاترونكس الذكي مع سبورة إلكترونية تدمج الرسومات والمعادلات.',
      icon: Bot,
      color: 'from-cyan-500 via-blue-500 to-cyan-600',
      badge: 'مُعزز بالذكاء الاصطناعي',
    },
    {
      id: 'lab_3d',
      title: 'المختبر الواقعي 3D',
      subtitle: 'محاكي هندسي تفاعلي',
      description: 'بيئة ثلاثية الأبعاد لبناء الدوائر الإلكترونية، برمجة الأردوينو، محاكاة ذراع الروبوت، والطائرات بدون طيار.',
      icon: Layers,
      color: 'from-cyan-500 to-blue-600',
      badge: 'Three.js المحاكاة الواقعية',
    },
    {
      id: 'library',
      title: 'المكتبة الهندسية',
      subtitle: 'مراجع ومستندات متخصصة',
      description: 'مكتبة شاملة تحتوي على كتب الميكاترونكس، الإلكترونيات، الفيزياء، مذكرات التجارب والأكواد المصدريّة.',
      icon: BookOpen,
      color: 'from-indigo-600 to-purple-600',
      badge: 'تحميل وقراءة مباشرة',
    },
    {
      id: 'assistant',
      title: 'مساعد الميكاترونكس الذكي',
      subtitle: 'مهندس المحادثة الآلي',
      description: 'حل المسائل الهندسية، مراجعة أكواد Arduino/C++، تحليل أخطاء الدوائر الكهربائية، وتفسير المخططات.',
      icon: Sparkles,
      color: 'from-purple-600 to-pink-600',
      badge: 'دعم عاجل للحلول',
    },
    {
      id: 'calculators',
      title: 'الحاسبات الهندسية',
      subtitle: 'أدوات الحساب والدقة',
      description: 'حاسبات قانون أوم، المقاومة المكافئة، محاثة المكثفات، العزم، سرعة التروس، وتحويل الوحدات الهندسية.',
      icon: Calculator,
      color: 'from-emerald-500 to-teal-600',
      badge: 'دقة حسابية متقدمة',
    },
    {
      id: 'projects',
      title: 'مركز المشاريع والاختراعات',
      subtitle: 'من الفكرة إلى النموذج',
      description: 'بناء وحفظ مخططات مشروعك الهندسي، حصر قائمة المكونات BOM، توليد الأكواد ونشرها في المعرض.',
      icon: Cpu,
      color: 'from-amber-500 to-orange-600',
      badge: 'ابتكار ونشر المشاريع',
    },
    {
      id: 'quizzes',
      title: 'مركز الاختبارات',
      subtitle: 'تقييم ودعم المستوى',
      description: 'اختبارات تفاعلية في الكهرباء، الأردوينو، التحكم والميكانيكا مع تصحيح تلقائي وشهادات إنجاز.',
      icon: Award,
      color: 'from-rose-500 to-red-600',
      badge: 'شهادات تقييم فورية',
    },
    {
      id: 'community',
      title: 'مجتمع المهندسين',
      subtitle: 'تواصل وتبادل خبرات',
      description: 'منتديات هندسية للمناقشة، مشاركة المشاريع والأكواد، وطرح الأسئلة والإجابة عليها مع زملائك المهندسين.',
      icon: Users,
      color: 'from-cyan-600 to-teal-500',
      badge: 'شبكة مهندسين تفاعلية',
    },
  ];

  const specializedLabs = [
    { id: 'circuits', name: 'مختبر الكهرباء والدوائر', desc: 'قوانين كيرشوف، أوم، تحليل RLC والاستجابة العابرة', icon: Zap },
    { id: 'electronics', name: 'مختبر الإلكترونيات', desc: 'الدايود، LEDs، الترانزستور، MOSFET ودوائر المكبرات', icon: Activity },
    { id: 'arduino', name: 'مختبر الأردوينو والأنظمة', desc: 'لوحات Arduino UNO, ESP32, محرر كود C++ مع شاشة LCD', icon: Code },
    { id: 'robotics', name: 'مختبر الروبوتات 3D', desc: 'أذرع روبوتية ثلاثية الأبعاد، زوايا المفاصل، الكينماتك', icon: Bot },
    { id: 'mechanical', name: 'مختبر التصميم الميكانيكي', desc: 'محاكاة التروس، المحاور، حسابات العزم والقوة الدورانية', icon: Box },
    { id: 'control', name: 'مختبر التحكم والأتمتة', desc: 'محاكاة PLC بمخططات Ladder Logic وأنظمة PID المفتوحة والمغلقة', icon: Shield },
    { id: 'drones', name: 'مختبر الطائرات بدون طيار', desc: 'محاكاة الطيران والدوران والتوازن لطائرات Quadcopter', icon: Flame },
    { id: 'innovation', name: 'مختبر التصنيع والابتكار', desc: 'نمذجة القطع 3D، الطباعة ثلاثية الأبعاد واختبار الإجهاد', icon: Cpu },
  ];

  return (
    <div className="space-y-12 pb-16">
      
      {/* Hero Banner Section with Official Emblem Logo */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0D1B2A] via-[#0A192F] to-[#1a122e] border border-amber-500/30 p-8 lg:p-12 shadow-2xl logo-glow-card">
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          
          {/* Text Content */}
          <div className="space-y-6 max-w-2xl text-right">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/15 via-cyan-500/15 to-purple-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>جامعة ميكاترونكس وهندسة افتراضية متكاملة</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              منصة <span className="gold-gradient-text">دكتور الميكاترونكس</span> الذكي
            </h1>

            <p className="text-lg sm:text-xl text-slate-200 font-bold leading-relaxed">
              «تعلّم بذكاء، جرّب بواقعية، وابتكر بلا حدود»
            </p>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              البيئة الهندسة الشاملة لطلاب ومهندسي الميكاترونكس. ارفع المحاضرات والمستندات للشرح التفاعلي مع دكتور الميكاترونكس، وانتقل مباشرة للمختبرات ثلاثية الأبعاد لتطبيق الدوائر والروبوتات والأنظمة.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => setCurrentTab('explain_lesson')}
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] transition-all flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5 fill-slate-950" />
                <span>خدمة «اشرح لي الدرس»</span>
                <ArrowLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentTab('doctor_hall')}
                className="px-6 py-3.5 rounded-xl bg-slate-800/90 text-amber-300 border border-amber-500/40 font-bold text-sm hover:bg-slate-800 hover:border-amber-400 transition-all flex items-center gap-2"
              >
                <Bot className="w-5 h-5" />
                <span>قاعة الدكتور الذكي</span>
              </button>

              <button
                onClick={() => setCurrentTab('lab_3d')}
                className="px-6 py-3.5 rounded-xl bg-slate-800/90 text-cyan-300 border border-cyan-500/40 font-bold text-sm hover:bg-slate-800 hover:border-cyan-400 transition-all flex items-center gap-2"
              >
                <Layers className="w-5 h-5" />
                <span>المختبر 3D</span>
              </button>
            </div>
          </div>

          {/* Emblem Logo Badge Display */}
          <div className="shrink-0 relative group">
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-3xl p-1 bg-gradient-to-tr from-amber-400 via-cyan-400 to-purple-600 shadow-2xl shadow-cyan-500/30 group-hover:scale-105 transition-transform overflow-hidden">
              <img
                src={OFFICIAL_LOGO_URL}
                alt="شعار دكتور الميكاترونكس الذكي الرسمي"
                className="w-full h-full object-cover rounded-[22px] block shadow-inner"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Core Services Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">الخدمات الرئيسية للمنصة</h2>
            <p className="text-sm text-slate-400">8 أقسام هندسية متكاملة بخصائص حقيقية وتفاعلية</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {mainServices.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.id}
                onClick={() => setCurrentTab(service.id)}
                className="group relative bg-[#0D1B2A] border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                      {service.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-xs text-amber-500 font-medium mt-0.5">{service.subtitle}</p>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center text-xs font-bold text-amber-400 group-hover:translate-x-[-4px] transition-transform">
                  <span>انتقل للخدمة</span>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 8 Specialized Engineering 3D Labs Quick Access */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">المختبرات التخصصية الواقعية (3D & Simulation)</h2>
            <p className="text-sm text-slate-400">اختر المختبر الهندسي للبدء بتجربة تفاعلية مباشرة</p>
          </div>
          <button
            onClick={() => setCurrentTab('lab_3d')}
            className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1"
          >
            <span>جميع المختبرات</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {specializedLabs.map((lab) => {
            const Icon = lab.icon;
            return (
              <div
                key={lab.id}
                onClick={() => {
                  setCurrentTab('lab_3d');
                  if (onSelectLab) onSelectLab(lab.id);
                }}
                className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-800/80 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {lab.name}
                    </h4>
                    <p className="text-xs text-slate-400 leading-normal">
                      {lab.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Platform Features Highlight */}
      <section className="rounded-2xl bg-[#0D1B2A] border border-slate-800 p-8 space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-white">لماذا منصة دكتور الميكاترونكس الذكي؟</h2>
          <p className="text-xs sm:text-sm text-slate-400">تقنيات متقدمة تجمع بين الشرح النظري المحكم والمحاكاة التفاعلية دقيقة الحسابات</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <CheckCircle2 className="w-8 h-8 text-amber-400" />
            <h3 className="text-base font-bold text-white">دكتور افتراضي مخصص</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              إمكانية تصميم دكتورك التعليمي واختيار التخصص ولغة الشرح ولون السبورة واستيراد الملفات (PDF / Word) مع الشرح الصوتي المباشر.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <CheckCircle2 className="w-8 h-8 text-cyan-400" />
            <h3 className="text-base font-bold text-white">محاكاة 3D حقيقية وأكواد</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              مختبرات تفاعلية ثلاثية الأبعاد تحسب الجهد والتيار والقدرة وسرعة التروس، مع محرر كود C++ حقيقي ومحاكة إشارات الأردوينو ورسم الموجات.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <CheckCircle2 className="w-8 h-8 text-purple-400" />
            <h3 className="text-base font-bold text-white">نظام اكتشاف الأخطاء وتصحيحها</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              يقوم المحاكي بتحديد الأسلاك الخاطئة، القطبية المعكوسة، احتراق العناصر، أو الأخطاء البرمجية وإعطاء طريقة الإصلاح خطوة بخطوة.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
};
