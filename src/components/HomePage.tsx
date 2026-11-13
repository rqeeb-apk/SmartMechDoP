import React from 'react';
import { ArrowLeft, Play, BookOpen, Bot, Layers } from 'lucide-react';

interface HomePageProps {
  setCurrentTab: (tab: string) => void;
  onSelectLab?: (labType: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ setCurrentTab, onSelectLab }) => {
  return (
    <div className="space-y-4 sm:space-y-6 pb-20 select-none font-sans text-slate-100 w-full max-w-full overflow-x-hidden min-w-0">
      
      {/* =========================================================================
          ZONE 1: Hero Banner Section (Compact & Zero Margin Overhead)
          ========================================================================= */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#061426] via-[#081B38] to-[#040C1A] border border-cyan-500/40 p-3 sm:p-6 lg:p-8 shadow-[0_0_25px_rgba(6,182,212,0.2)] w-full max-w-full min-w-0">
        {/* Cyber Ambient Glows */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-5 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col-reverse lg:flex-row items-center justify-between gap-4 sm:gap-6 w-full min-w-0">
          
          {/* Left: Futuristic Robot with Hologram Tablet */}
          <div className="w-full lg:w-1/2 flex justify-center lg:justify-start min-w-0">
            <div className="relative group max-w-sm sm:max-w-md w-full min-w-0">
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border border-cyan-400/40 shadow-xl shadow-cyan-500/20 group-hover:border-cyan-300 transition-all max-h-56 sm:max-h-72">
                <img
                  src="/assets/theme/hero_robot.png"
                  alt="دكتور الميكاترونكس الذكي - الروبوت التفاعلي"
                  className="w-full h-full object-cover block group-hover:scale-102 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#061426]/60 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Right: Headlines & 4 Compact Action Buttons */}
          <div className="w-full lg:w-1/2 space-y-2 sm:space-y-3.5 text-center lg:text-right min-w-0">
            
            <div>
              <span className="text-base sm:text-xl font-black text-white block">
                منصة دكتور
              </span>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-amber-400 drop-shadow-[0_4px_20px_rgba(245,158,11,0.4)] tracking-tight">
                الميكاترونكس الذكي
              </h1>
            </div>

            {/* Glowing Cyan Capsule Tag */}
            <div className="inline-block px-3 sm:px-4 py-1 rounded-full bg-cyan-500/15 border border-cyan-400 text-cyan-300 font-black text-[10px] sm:text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] max-w-full truncate">
              تعلّم بذكاء، جرّب بواقعية، وابتكر بلا حدود
            </div>

            <p className="text-[11px] sm:text-xs text-slate-200 font-medium leading-relaxed max-w-lg mx-auto lg:mx-0">
              البيئة الهندسية الشاملة لطلاب ومهندسي الميكاترونكس. ارفع المحاضرات والمستندات للشرح التفاعلي، وانتقل مباشرة إلى المختبرات 3D لتطبيق الدوائر والروبوتات.
            </p>

            {/* 4 Glowing Action Buttons (Proportional on Mobile) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 pt-1 max-w-lg mx-auto lg:mx-0 w-full min-w-0">
              <button
                onClick={() => setCurrentTab('explain_lesson')}
                className="px-1.5 sm:px-2 py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white font-black text-[10px] sm:text-xs shadow-md shadow-orange-500/25 flex items-center justify-center gap-1 transition-all active:scale-95 min-w-0"
              >
                <Play className="w-3 h-3 fill-white shrink-0" />
                <span className="truncate">اشرح لي الدرس</span>
              </button>

              <button
                onClick={() => setCurrentTab('summarize')}
                className="px-1.5 sm:px-2 py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black text-[10px] sm:text-xs shadow-md shadow-blue-500/25 flex items-center justify-center gap-1 transition-all active:scale-95 min-w-0"
              >
                <BookOpen className="w-3 h-3 shrink-0" />
                <span className="truncate">لخص لي</span>
              </button>

              <button
                onClick={() => setCurrentTab('doctor_hall')}
                className="px-1.5 sm:px-2 py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-[10px] sm:text-xs shadow-md shadow-purple-500/25 flex items-center justify-center gap-1 transition-all active:scale-95 min-w-0"
              >
                <Bot className="w-3 h-3 shrink-0" />
                <span className="truncate">قاعة الدكتور</span>
              </button>

              <button
                onClick={() => setCurrentTab('lab_3d')}
                className="px-1.5 sm:px-2 py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-black text-[10px] sm:text-xs shadow-md shadow-emerald-500/25 flex items-center justify-center gap-1 transition-all active:scale-95 min-w-0"
              >
                <Layers className="w-3 h-3 shrink-0" />
                <span className="truncate">المختبر 3D</span>
              </button>
            </div>

          </div>

        </div>
      </section>


      {/* =========================================================================
          ZONE 2: Section Header Banner "الخدمات الرئيسية للمنصة - 11 خدمة هندسية متكاملة"
          ========================================================================= */}
      <div className="flex flex-col items-center justify-center pt-1 w-full max-w-full">
        <div className="relative flex flex-col items-center">
          <div className="relative px-5 sm:px-7 py-1.5 rounded-xl bg-[#091B33] border border-cyan-400 text-white font-black text-sm sm:text-xl shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            الخدمات الرئيسية للمنصة
          </div>
          <div className="-mt-1 px-4 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-[10px] sm:text-xs shadow">
            11 خدمة هندسية متكاملة
          </div>
        </div>
      </div>


      {/* =========================================================================
          GROUP 1: "أولاً: التعلم والشرح 🎓" (2x2 on Mobile, 4x1 on Desktop)
          ========================================================================= */}
      <section className="relative rounded-2xl bg-[#07152B]/95 border border-cyan-500/40 p-2.5 sm:p-4 shadow-[0_0_20px_rgba(6,182,212,0.15)] w-full max-w-full min-w-0 overflow-hidden">
        {/* Floating Category Tag */}
        <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black text-[10px] sm:text-xs shadow border border-cyan-300/40">
          أولاً: التعلم والشرح 🎓
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 pt-1.5 w-full min-w-0">
          
          {/* Card 1: قاعة الدكتور الذكي */}
          <div className="rounded-xl bg-[#0A1D38] border border-cyan-500/30 p-2 flex flex-col justify-between hover:border-amber-400 transition-all group shadow min-w-0">
            <div className="space-y-1.5">
              <div className="w-full h-16 sm:h-24 rounded-lg overflow-hidden bg-black/40 border border-slate-700/60">
                <img
                  src="/assets/theme/card_doctor_hall.png"
                  alt="قاعة الدكتور الذكي"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="text-center space-y-0.5">
                <h3 className="text-[11px] sm:text-xs font-black text-white group-hover:text-amber-300 transition-colors truncate">
                  قاعة الدكتور الذكي
                </h3>
                <p className="text-[9px] sm:text-[10px] text-slate-300 line-clamp-1">
                  شرح تفاعلي مع سبورة إلكترونية
                </p>
              </div>
            </div>
            <button
              onClick={() => setCurrentTab('doctor_hall')}
              className="mt-2 w-full py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-[10px] sm:text-xs flex items-center justify-center gap-1 shadow active:scale-95"
            >
              <span>انتقل للخدمة</span>
              <ArrowLeft className="w-3 h-3" />
            </button>
          </div>

          {/* Card 2: لخص لي */}
          <div className="rounded-xl bg-[#0A1D38] border border-cyan-500/30 p-2 flex flex-col justify-between hover:border-amber-400 transition-all group shadow min-w-0">
            <div className="space-y-1.5">
              <div className="w-full h-16 sm:h-24 rounded-lg overflow-hidden bg-black/40 border border-slate-700/60">
                <img
                  src="/assets/theme/card_summarize.png"
                  alt="لخص لي"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="text-center space-y-0.5 min-w-0">
                <h3 className="text-[11px] sm:text-xs font-black text-white group-hover:text-amber-300 transition-colors truncate">
                  لخص لي
                </h3>
                <p className="text-[9px] sm:text-[10px] text-slate-300 truncate">
                  ملخصات ذكية ومراجعة سريعة
                </p>
              </div>
            </div>
            <button
              onClick={() => setCurrentTab('summarize')}
              className="mt-2 w-full py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-[10px] sm:text-xs flex items-center justify-center gap-1 shadow active:scale-95"
            >
              <span>انتقل للخدمة</span>
              <ArrowLeft className="w-3 h-3" />
            </button>
          </div>

          {/* Card 3: اشرح لي الدرس */}
          <div className="rounded-xl bg-[#0A1D38] border border-cyan-500/30 p-2 flex flex-col justify-between hover:border-amber-400 transition-all group shadow min-w-0">
            <div className="space-y-1.5">
              <div className="w-full h-16 sm:h-24 rounded-lg overflow-hidden bg-black/40 border border-slate-700/60">
                <img
                  src="/assets/theme/card_explain_lesson.png"
                  alt="اشرح لي الدرس"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="text-center space-y-0.5 min-w-0">
                <h3 className="text-[11px] sm:text-xs font-black text-white group-hover:text-amber-300 transition-colors truncate">
                  اشرح لي الدرس
                </h3>
                <p className="text-[9px] sm:text-[10px] text-slate-300 truncate">
                  رفع نص أو صورة أو فيديو والشرح
                </p>
              </div>
            </div>
            <button
              onClick={() => setCurrentTab('explain_lesson')}
              className="mt-2 w-full py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-[10px] sm:text-xs flex items-center justify-center gap-1 shadow active:scale-95"
            >
              <span>انتقل للخدمة</span>
              <ArrowLeft className="w-3 h-3" />
            </button>
          </div>

          {/* Card 4: قاعة المحاضرات 🎓 */}
          <div className="rounded-xl bg-[#0A1D38] border border-cyan-500/30 p-2 flex flex-col justify-between hover:border-amber-400 transition-all group shadow min-w-0">
            <div className="space-y-1.5">
              <div className="w-full h-16 sm:h-24 rounded-lg overflow-hidden bg-black/40 border border-slate-700/60">
                <img
                  src="/assets/theme/card_lecture_hall.png"
                  alt="قاعة المحاضرات"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="text-center space-y-0.5 min-w-0">
                <h3 className="text-[11px] sm:text-xs font-black text-white group-hover:text-amber-300 transition-colors truncate">
                  قاعة المحاضرات
                </h3>
                <p className="text-[9px] sm:text-[10px] text-slate-300 truncate">
                  سبورة ذكية تفاعلية وأنيميشن حي
                </p>
              </div>
            </div>
            <button
              onClick={() => setCurrentTab('lecture_hall')}
              className="mt-2 w-full py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-[10px] sm:text-xs flex items-center justify-center gap-1 shadow active:scale-95"
            >
              <span>انتقل للخدمة</span>
              <ArrowLeft className="w-3 h-3" />
            </button>
          </div>

        </div>
      </section>


      {/* =========================================================================
          ROW 2: GROUP 2 (جرّب وحاكي) & GROUP 3 (المعرفة والأدوات)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 w-full max-w-full min-w-0">
        
        {/* GROUP 2: ثانياً: جرّب وحاكي 🎓 (Emerald Green Container) */}
        <section className="lg:col-span-5 relative rounded-2xl bg-[#041D1E]/95 border border-emerald-500/60 p-3 sm:p-4 shadow-[0_0_20px_rgba(16,185,129,0.15)] flex flex-col justify-between w-full min-w-0 overflow-hidden">
          <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[10px] sm:text-xs shadow border border-emerald-300/40">
            ثانياً: جرّب وحاكي 🎓
          </div>

          <div className="pt-1.5 flex items-center gap-2.5 sm:gap-4 min-w-0">
            <div className="w-20 sm:w-36 h-20 sm:h-28 rounded-xl overflow-hidden bg-black/40 border border-emerald-500/40 shrink-0">
              <img
                src="/assets/theme/card_lab_3d.png"
                alt="المختبر الواقعي 3D"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-1 text-right flex-1 min-w-0">
              <h3 className="text-xs sm:text-sm font-black text-white truncate">
                المختبر الواقعي 3D
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                محاكاة عملية لمختبرات الهندسة وتركيب الدوائر والروبوتات.
              </p>
              <button
                onClick={() => setCurrentTab('lab_3d')}
                className="mt-1 w-full sm:w-auto px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-[10px] sm:text-xs flex items-center justify-center gap-1 shadow"
              >
                <span>انتقل للخدمة</span>
                <ArrowLeft className="w-3 h-3" />
              </button>
            </div>
          </div>
        </section>

        {/* GROUP 3: ثالثاً: المعرفة والأدوات 🧰 (Purple Container) */}
        <section className="lg:col-span-7 relative rounded-2xl bg-[#120B2B]/95 border border-purple-500/60 p-3 sm:p-4 shadow-[0_0_20px_rgba(168,85,247,0.15)] w-full min-w-0 overflow-hidden">
          <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-purple-600 text-white font-black text-[10px] sm:text-xs shadow border border-purple-300/40">
            ثالثاً: المعرفة والأدوات 🧰
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 pt-1.5 w-full min-w-0">
            
            {/* Tool 1: الحاسبات الهندسية */}
            <div className="rounded-xl bg-[#1C123D] border border-purple-400/30 p-1.5 sm:p-2 flex flex-col justify-between hover:border-amber-400 transition-all group min-w-0">
              <div className="space-y-1 text-center min-w-0">
                <div className="w-full h-14 sm:h-20 rounded-lg overflow-hidden bg-black/40 border border-slate-700/60">
                  <img
                    src="/assets/theme/card_calculators.png"
                    alt="الحاسبات الهندسية"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <h4 className="text-[10px] sm:text-xs font-black text-white group-hover:text-amber-300 truncate">
                  الحاسبات
                </h4>
                <p className="text-[9px] text-slate-300 hidden sm:block truncate">أدوات الحساب والدقة</p>
              </div>
              <button
                onClick={() => setCurrentTab('calculators')}
                className="mt-1.5 w-full py-0.5 sm:py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-[9px] sm:text-[11px] flex items-center justify-center gap-0.5 shadow"
              >
                <span>دخول</span>
                <ArrowLeft className="w-2.5 h-2.5" />
              </button>
            </div>

            {/* Tool 2: مساعد الميكاترونكس الذكي */}
            <div className="rounded-xl bg-[#1C123D] border border-purple-400/30 p-1.5 sm:p-2 flex flex-col justify-between hover:border-amber-400 transition-all group min-w-0">
              <div className="space-y-1 text-center min-w-0">
                <div className="w-full h-14 sm:h-20 rounded-lg overflow-hidden bg-black/40 border border-slate-700/60">
                  <img
                    src="/assets/theme/card_assistant.png"
                    alt="مساعد الميكاترونكس الذكي"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <h4 className="text-[10px] sm:text-xs font-black text-white group-hover:text-amber-300 truncate">
                  المساعد الذكي
                </h4>
                <p className="text-[9px] text-slate-300 hidden sm:block truncate">حل المسائل الهندسية</p>
              </div>
              <button
                onClick={() => setCurrentTab('assistant')}
                className="mt-1.5 w-full py-0.5 sm:py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-[9px] sm:text-[11px] flex items-center justify-center gap-0.5 shadow"
              >
                <span>دخول</span>
                <ArrowLeft className="w-2.5 h-2.5" />
              </button>
            </div>

            {/* Tool 3: المكتبة الهندسية */}
            <div className="rounded-xl bg-[#1C123D] border border-purple-400/30 p-1.5 sm:p-2 flex flex-col justify-between hover:border-amber-400 transition-all group min-w-0">
              <div className="space-y-1 text-center min-w-0">
                <div className="w-full h-14 sm:h-20 rounded-lg overflow-hidden bg-black/40 border border-slate-700/60">
                  <img
                    src="/assets/theme/card_library.png"
                    alt="المكتبة الهندسية"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <h4 className="text-[10px] sm:text-xs font-black text-white group-hover:text-amber-300 truncate">
                  المكتبة
                </h4>
                <p className="text-[9px] text-slate-300 hidden sm:block truncate">كتب ومراجع مخصصة</p>
              </div>
              <button
                onClick={() => setCurrentTab('library')}
                className="mt-1.5 w-full py-0.5 sm:py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-[9px] sm:text-[11px] flex items-center justify-center gap-0.5 shadow"
              >
                <span>دخول</span>
                <ArrowLeft className="w-2.5 h-2.5" />
              </button>
            </div>

          </div>
        </section>

      </div>


      {/* =========================================================================
          ROW 3: GROUP 4 (التطبيق والتقييم) & GROUP 5 (المجتمع)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 w-full max-w-full min-w-0">
        
        {/* GROUP 4: رابعاً: التطبيق والتقييم 🌐 (Teal/Cyan Container) */}
        <section className="lg:col-span-7 relative rounded-2xl bg-[#051C20]/95 border border-teal-500/60 p-3 sm:p-4 shadow-[0_0_20px_rgba(20,184,166,0.15)] w-full min-w-0 overflow-hidden">
          <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-teal-600 text-white font-black text-[10px] sm:text-xs shadow border border-teal-300/40">
            رابعاً: التطبيق والتقييم 🌐
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-1.5 w-full min-w-0">
            
            {/* Card 1: مركز الاختبارات */}
            <div className="rounded-xl bg-[#08292E] border border-teal-400/30 p-2 flex flex-col justify-between hover:border-amber-400 transition-all group min-w-0">
              <div className="space-y-1 min-w-0">
                <div className="w-full h-16 sm:h-22 rounded-lg overflow-hidden bg-black/40 border border-teal-400/30">
                  <img
                    src="/assets/theme/card_quizzes.png"
                    alt="مركز الاختبارات"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="text-right space-y-0.5 min-w-0">
                  <h4 className="text-[11px] sm:text-xs font-black text-white group-hover:text-amber-300 truncate">
                    مركز الاختبارات
                  </h4>
                  <p className="text-[9px] sm:text-[10px] text-slate-300 truncate">اختبارات وتصحيح</p>
                </div>
              </div>
              <button
                onClick={() => setCurrentTab('quizzes')}
                className="mt-1.5 w-full py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-[10px] sm:text-xs flex items-center justify-center gap-1 shadow"
              >
                <span>انتقل للخدمة</span>
                <ArrowLeft className="w-3 h-3" />
              </button>
            </div>

            {/* Card 2: مركز المشاريع والاختراعات */}
            <div className="rounded-xl bg-[#08292E] border border-teal-400/30 p-2 flex flex-col justify-between hover:border-amber-400 transition-all group min-w-0">
              <div className="space-y-1 min-w-0">
                <div className="w-full h-16 sm:h-22 rounded-lg overflow-hidden bg-black/40 border border-teal-400/30">
                  <img
                    src="/assets/theme/card_projects.png"
                    alt="مركز المشاريع والاختراعات"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="text-right space-y-0.5 min-w-0">
                  <h4 className="text-[11px] sm:text-xs font-black text-white group-hover:text-amber-300 truncate">
                    مركز المشاريع
                  </h4>
                  <p className="text-[9px] sm:text-[10px] text-slate-300 truncate">من الفكرة للنموذج</p>
                </div>
              </div>
              <button
                onClick={() => setCurrentTab('projects')}
                className="mt-1.5 w-full py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-[10px] sm:text-xs flex items-center justify-center gap-1 shadow"
              >
                <span>انتقل للخدمة</span>
                <ArrowLeft className="w-3 h-3" />
              </button>
            </div>

          </div>
        </section>

        {/* GROUP 5: خامساً: المجتمع 👥 (Amber Container) */}
        <section className="lg:col-span-5 relative rounded-2xl bg-[#211406]/95 border border-amber-500/60 p-3 sm:p-4 shadow-[0_0_20px_rgba(245,158,11,0.15)] flex flex-col justify-between w-full min-w-0 overflow-hidden">
          <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-amber-600 text-white font-black text-[10px] sm:text-xs shadow border border-amber-300/40">
            خامساً: المجتمع 👥
          </div>

          <div className="pt-1.5 flex items-center gap-2.5 sm:gap-4 min-w-0">
            <div className="w-20 sm:w-32 h-18 sm:h-24 rounded-xl overflow-hidden bg-black/40 border border-amber-500/40 shrink-0">
              <img
                src="/assets/theme/card_community.png"
                alt="مجتمع المهندسين"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-1 text-right flex-1 min-w-0">
              <h3 className="text-xs sm:text-sm font-black text-white truncate">
                مجتمع المهندسين
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                تواصل ومناقشة ومشاركة المشاريع مع زملائك.
              </p>
              <button
                onClick={() => setCurrentTab('community')}
                className="mt-1 w-full sm:w-auto px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-[10px] sm:text-xs flex items-center justify-center gap-1 shadow"
              >
                <span>انتقل للخدمة</span>
                <ArrowLeft className="w-3 h-3" />
              </button>
            </div>
          </div>
        </section>

      </div>


      {/* =========================================================================
          ZONE 4: Specialized Engineering Labs (3D & Simulation) 🧪 (2 cols on mobile, 4 on sm, 8 on lg)
          ========================================================================= */}
      <section className="relative rounded-2xl bg-[#06152B]/95 border border-cyan-500/40 p-3 sm:p-5 shadow-xl w-full max-w-full min-w-0 overflow-hidden">
        
        {/* Header Badge */}
        <div className="flex flex-col items-center text-center space-y-0.5 mb-3 sm:mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1 rounded-full bg-[#092244] border border-cyan-400 text-cyan-300 font-black text-xs sm:text-sm shadow max-w-full truncate">
            <span>🧪</span>
            <span className="truncate">المختبرات التخصصية الواقعية (3D & Simulation)</span>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-400">اختر المختبر للبدء بتجربة تفاعلية مباشرة</p>
        </div>

        {/* 8 Labs Grid: 2 columns on mobile for perfect fit, 4 on sm, 8 on lg */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-2.5 w-full min-w-0">
          {[
            { id: 'circuits', name: 'الكهرباء والدوائر', img: '/assets/theme/lab_circuits.png' },
            { id: 'electronics', name: 'الإلكترونيات', img: '/assets/theme/lab_electronics.png' },
            { id: 'arduino', name: 'الأردوينو والأنظمة', img: '/assets/theme/lab_arduino.png' },
            { id: 'robotics', name: 'الروبوتات 3D', img: '/assets/theme/lab_robotics.png' },
            { id: 'mechanical', name: 'التصميم الميكانيكي', img: '/assets/theme/lab_mechanical.png' },
            { id: 'control', name: 'التحكم والأتمتة', img: '/assets/theme/lab_control.png' },
            { id: 'drones', name: 'طائرات بدون طيار', img: '/assets/theme/lab_drones.png' },
            { id: 'innovation', name: 'التصنيع والإبتكار', img: '/assets/theme/lab_manufacturing.png' },
          ].map((lab) => (
            <div
              key={lab.id}
              onClick={() => {
                setCurrentTab('lab_3d');
                if (onSelectLab) onSelectLab(lab.id);
              }}
              className="rounded-xl bg-[#081E3B] border border-cyan-500/30 hover:border-amber-400 p-1.5 sm:p-2 text-center transition-all hover:scale-102 cursor-pointer group shadow min-w-0 flex flex-col justify-between"
            >
              <div className="w-full h-14 sm:h-16 rounded-lg overflow-hidden bg-black/40 border border-slate-700/60 mb-1">
                <img
                  src={lab.img}
                  alt={lab.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <h4 className="text-[10px] sm:text-[11px] font-black text-slate-100 group-hover:text-amber-300 truncate leading-tight">
                {lab.name}
              </h4>
            </div>
          ))}
        </div>
      </section>


      {/* =========================================================================
          ZONE 5: Student Journey Stepper Workflow
          ========================================================================= */}
      <section className="relative rounded-2xl bg-[#061426]/95 border border-cyan-500/30 p-3 sm:p-5 shadow-xl overflow-hidden w-full max-w-full min-w-0">
        
        {/* Curved Golden Header Banner */}
        <div className="flex justify-center mb-3 sm:mb-5">
          <div className="px-4 sm:px-5 py-1 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow text-center max-w-full truncate">
            رحلة الطالب في منصة دكتور الميكاترونكس الذكي
          </div>
        </div>

        {/* Stepper Nodes & Connecting Arrows - Smooth Horizontal Scroll */}
        <div className="flex items-center justify-start sm:justify-between gap-1.5 overflow-x-auto no-scrollbar py-2 max-w-4xl mx-auto w-full min-w-0 scroll-smooth px-1">
          {[
            { id: 'lecture_hall', label: 'تعلّم', icon: '🎓', color: 'from-cyan-400 to-blue-600' },
            { id: 'doctor_hall', label: 'افهم', icon: '🧠', color: 'from-purple-500 to-indigo-600' },
            { id: 'lab_3d', label: 'جرّب', icon: '🧪', color: 'from-teal-400 to-emerald-600' },
            { id: 'calculators', label: 'احسب', icon: '🧮', color: 'from-blue-500 to-cyan-500' },
            { id: 'projects', label: 'طبّق', icon: '🛠️', color: 'from-indigo-500 to-blue-700' },
            { id: 'quizzes', label: 'اختبر', icon: '📝', color: 'from-cyan-400 to-teal-600' },
            { id: 'community', label: 'طوّر نفسك', icon: '🏆', color: 'from-amber-400 to-yellow-500' },
          ].map((step, idx, arr) => (
            <React.Fragment key={step.id}>
              <div
                onClick={() => setCurrentTab(step.id)}
                className="flex flex-col items-center gap-1 cursor-pointer group shrink-0 min-w-[48px]"
              >
                <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full p-0.5 bg-gradient-to-tr ${step.color} shadow-md group-hover:scale-105 transition-transform flex items-center justify-center text-sm sm:text-lg`}>
                  {step.icon}
                </div>
                <span className="text-[10px] sm:text-xs font-black text-white group-hover:text-amber-300 whitespace-nowrap">
                  {step.label}
                </span>
              </div>
              {idx < arr.length - 1 && (
                <span className="text-amber-400 text-xs sm:text-sm font-bold shrink-0 opacity-80">➔</span>
              )}
            </React.Fragment>
          ))}
        </div>

      </section>

    </div>
  );
};
