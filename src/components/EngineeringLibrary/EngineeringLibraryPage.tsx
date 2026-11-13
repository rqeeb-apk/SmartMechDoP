import React, { useState } from 'react';
import { AcademicYearId, EngineeringBook } from '../../types';
import { getStoredBooks } from '../../services/storage';
import { BookOpen, Search, Download, Star, Bot, Eye, CheckCircle, GraduationCap } from 'lucide-react';

interface EngineeringLibraryPageProps {
  onTakeToDoctorHall?: (book: EngineeringBook) => void;
}

const YEAR_FILTERS: { id: 'all' | AcademicYearId; label: string }[] = [
  { id: 'all', label: 'كل السنوات (1-5)' },
  { id: 'year1', label: 'السنة 1' },
  { id: 'year2', label: 'السنة 2' },
  { id: 'year3', label: 'السنة 3' },
  { id: 'year4', label: 'السنة 4' },
  { id: 'year5', label: 'السنة 5' },
];

export const EngineeringLibraryPage: React.FC<EngineeringLibraryPageProps> = ({ onTakeToDoctorHall }) => {
  const books = getStoredBooks();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [selectedYear, setSelectedYear] = useState<'all' | AcademicYearId>('all');
  const [activePdfBook, setActivePdfBook] = useState<EngineeringBook | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  const categories = ['الكل', 'ميكاترونكس', 'إلكترونيات', 'روبوتات', 'برمجة'];

  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'الكل' || book.category === selectedCategory;
    const matchesYear = selectedYear === 'all' || book.year === selectedYear;
    return matchesSearch && matchesCat && matchesYear;
  });

  const handleDownloadBookSummary = (book: EngineeringBook) => {
    const summaryText = `${book.title}\nالمؤلف: ${book.author}\nالمستوى: ${book.level}\nالتخصص: ${book.category}\n\nملخص المرجع:\n${book.description}\n\nتم التصدير من منصة دكتور الميكاترونكس الذكي`;
    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.pdfFileName.replace('.pdf', '')}_Summary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadStatus(`تم تنزيل ملخص المرجع: ${book.title}`);
    setTimeout(() => setDownloadStatus(null), 4000);
  };

  return (
    <div className="space-y-6 pb-12 w-full max-w-full overflow-x-hidden min-w-0">
      {/* Header */}
      <div className="champagne-card rounded-2xl p-4 sm:p-6 space-y-4 w-full min-w-0">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 min-w-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sky-icon-box flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-black text-[#0F172A] dark:text-white">المكتبة الهندسية الشاملة (السنة 1 - 5)</h1>
              <p className="text-xs text-[#475569] dark:text-slate-400">
                مراجع الميكاترونكس، Circuit Wizard، الإلكترونيات، التحكم الآلي، ومذكرات السنوات الخمس
              </p>
            </div>
          </div>

          <div className="relative w-full md:w-72 shrink-0">
            <Search className="w-4 h-4 text-[#64748B] dark:text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              placeholder="البحث عن كتاب أو مؤلف أو Circuit Wizard..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] text-xs focus:border-[#0EA5E9] dark:focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Academic Year + Category Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[rgba(212,175,55,0.22)] dark:border-slate-800/80 min-w-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
            <GraduationCap className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 ml-1" />
            {YEAR_FILTERS.map((yr) => (
              <button
                key={yr.id}
                onClick={() => setSelectedYear(yr.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedYear === yr.id
                    ? 'bg-[#0EA5E9] text-white dark:bg-amber-400 dark:text-slate-950 font-black shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-[#475569] dark:text-slate-300 border border-[rgba(212,175,55,0.3)] dark:border-slate-800 hover:border-[#0EA5E9] dark:hover:border-amber-400/50'
                }`}
              >
                {yr.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#0EA5E9] text-white dark:bg-cyan-500 dark:text-black font-bold shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-[#475569] dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredBooks.length === 0 ? (
        <div className="p-8 rounded-2xl champagne-card text-center text-sm text-[#475569] dark:text-slate-400">
          لا توجد مراجع مطابقة لخيار البحث الحالي — جرّب اختيار «كل السنوات (1-5)».
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full min-w-0">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              className="champagne-card hover:border-[#0EA5E9] dark:hover:border-cyan-500/40 rounded-2xl overflow-hidden flex flex-col justify-between transition-all hover:-translate-y-1 min-w-0"
            >
              <div className="space-y-4 p-4 sm:p-5">
                <div className="relative h-44 rounded-xl overflow-hidden bg-[#F8FAFC] dark:bg-slate-900 border border-[rgba(212,175,55,0.2)] dark:border-slate-800">
                  <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                  <span className="absolute top-2 right-2 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#0EA5E9] text-white dark:bg-black/75 dark:text-cyan-300 border border-white/20 dark:border-cyan-500/30 shadow-sm">
                    {book.category}
                  </span>
                  <span className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 shadow-sm">
                    {book.level}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-semibold mb-1">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{book.rating}</span>
                    </div>
                    <span className="text-[#475569] dark:text-slate-400 text-[11px]">{book.pages} صفحة</span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-white leading-snug">{book.title}</h3>
                  <p className="text-xs text-[#0284C7] dark:text-cyan-400 font-semibold mt-0.5">{book.author}</p>
                  <p className="text-xs text-[#475569] dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">{book.description}</p>
                </div>
              </div>

              {/* Book Actions */}
              <div className="p-3.5 bg-white/80 dark:bg-slate-900/60 border-t border-[rgba(212,175,55,0.22)] dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                <button
                  onClick={() => setActivePdfBook(book)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#E0F2FE] dark:bg-cyan-500/15 text-[#0284C7] dark:text-cyan-400 font-bold hover:bg-[#0EA5E9] hover:text-white dark:hover:bg-cyan-500 dark:hover:text-black transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>قراءة المرجع</span>
                </button>

                {onTakeToDoctorHall && (
                  <button
                    onClick={() => onTakeToDoctorHall(book)}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#0EA5E9] text-white dark:bg-indigo-600/20 dark:text-indigo-300 font-bold hover:bg-[#0284C7] dark:hover:bg-indigo-600 dark:hover:text-white transition-colors shadow-sm"
                    title="استيراد الكتاب إلى قاعة الدكتور الذكي"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>شرح الدكتور</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Book Reader Modal */}
      {activePdfBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-md p-4">
          <div className="champagne-card w-full max-w-3xl rounded-2xl p-5 sm:p-6 space-y-4 text-[#0F172A] dark:text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[rgba(212,175,55,0.25)] dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-white">{activePdfBook.title}</h3>
                <p className="text-xs text-[#0284C7] dark:text-cyan-400 font-semibold">
                  المؤلف: {activePdfBook.author} · {activePdfBook.level}
                </p>
              </div>
              <button
                onClick={() => setActivePdfBook(null)}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.3)] dark:border-slate-700 text-[#475569] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white text-xs font-bold"
              >
                ✕ إغلاق
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.25)] dark:border-slate-800 rounded-xl p-5 space-y-4 h-80 sm:h-96 overflow-y-auto no-scrollbar text-xs leading-relaxed text-[#475569] dark:text-slate-300">
              <div className="text-center py-3 border-b border-[rgba(212,175,55,0.2)] dark:border-slate-800 space-y-1">
                <h2 className="text-base font-bold text-[#0EA5E9] dark:text-cyan-400">{activePdfBook.title}</h2>
                <p className="text-[#475569] dark:text-slate-400">{activePdfBook.description}</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-[#0F172A] dark:text-white">الفصل الأول: مفاهيم الميكاترونكس الأساسية</h4>
                <p>
                  تعد هندسة الميكاترونكس فرعاً تطبيقياً يجمع بين الهندسة الميكانيكية والإلكترونية ونظم التحكم المحوسبة والأنظمة المضمنة (Embedded Systems).
                </p>
                <h4 className="text-sm font-bold text-[#0F172A] dark:text-white">الفصل الثاني: التطبيق العملي والربط المخبري</h4>
                <p>
                  تعتمد جميع النظم على التغذية المرتدة (Feedback Loops) من الحساسات (Sensors) لمعالجة البيانات وإرسال الأوامر للمشغلات الميكانيكية (Actuators)، ويمكنك تطبيق التجارب مباشرة في قسم المختبرات و Circuit Wizard.
                </p>
              </div>
            </div>

            {downloadStatus && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                {downloadStatus}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle className="w-4 h-4" />
                <span>مرجع معتمد في مكتبة الميكاترونكس</span>
              </span>

              <button
                type="button"
                onClick={() => handleDownloadBookSummary(activePdfBook)}
                className="px-4 py-2 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>تصدير ملخص المرجع (.txt)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
