import React, { useState } from 'react';
import { EngineeringBook } from '../../types';
import { getStoredBooks } from '../../services/storage';
import { BookOpen, Search, Download, Star, ExternalLink, Bot, Filter, Eye, CheckCircle } from 'lucide-react';

interface EngineeringLibraryPageProps {
  onTakeToDoctorHall?: (book: EngineeringBook) => void;
}

export const EngineeringLibraryPage: React.FC<EngineeringLibraryPageProps> = ({ onTakeToDoctorHall }) => {
  const books = getStoredBooks();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [activePdfBook, setActivePdfBook] = useState<EngineeringBook | null>(null);

  const categories = ['الكل', 'ميكاترونكس', 'إلكترونيات', 'روبوتات', 'برمجة'];

  const filteredBooks = books.filter((book) => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) || book.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'الكل' || book.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div className="bg-[#0D1B2A] border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">المكتبة الهندسية الشاملة</h1>
            <p className="text-xs text-slate-400">مرجع شامل لكتب الميكاترونكس، الإلكترونيات، الفيزياء ومذكرات التجارب</p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              placeholder="البحث عن كتاب أو مؤلف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-cyan-500 text-black font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Book Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredBooks.map((book) => (
          <div
            key={book.id}
            className="bg-[#0D1B2A] border border-slate-800 hover:border-cyan-500/40 rounded-2xl overflow-hidden flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/10"
          >
            <div className="space-y-4 p-5">
              <div className="relative h-48 rounded-xl overflow-hidden bg-slate-900">
                <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                <span className="absolute top-2 right-2 text-[10px] font-bold px-2.5 py-1 rounded-full bg-black/60 text-cyan-400 backdrop-blur-sm border border-cyan-500/30">
                  {book.category}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-amber-400 font-semibold mb-1">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{book.rating}</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">{book.pages} صفحة</span>
                </div>

                <h3 className="text-base font-bold text-white leading-snug">{book.title}</h3>
                <p className="text-xs text-cyan-400 font-medium mt-0.5">{book.author}</p>
                <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">{book.description}</p>
              </div>
            </div>

            {/* Book Actions */}
            <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
              <button
                onClick={() => setActivePdfBook(book)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 font-bold hover:bg-cyan-500 hover:text-black transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>قراءة PDF</span>
              </button>

              {onTakeToDoctorHall && (
                <button
                  onClick={() => onTakeToDoctorHall(book)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 font-bold hover:bg-indigo-600 hover:text-white transition-colors"
                  title="استيراد الكتاب إلى قاعة الدكتور الذكي"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>للشرح</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* PDF Modal Viewer */}
      {activePdfBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#0D1B2A] border border-cyan-500/40 w-full max-w-3xl rounded-2xl p-6 space-y-4 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">{activePdfBook.title}</h3>
                <p className="text-xs text-cyan-400">المؤلف: {activePdfBook.author}</p>
              </div>
              <button onClick={() => setActivePdfBook(null)} className="text-slate-400 hover:text-white">✕ إغلاق</button>
            </div>

            {/* Simulated PDF Viewer */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 h-96 overflow-y-auto no-scrollbar font-mono text-xs leading-relaxed text-slate-300">
              <div className="text-center py-4 border-b border-slate-800 space-y-1">
                <h2 className="text-base font-bold text-cyan-400">{activePdfBook.title}</h2>
                <p className="text-slate-400">{activePdfBook.description}</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white">الفصل الأول: مفاهيم الميكاترونكس الأساسية</h4>
                <p>
                  تعد هندسة الميكاترونكس فرعاً تطبيقياً تجمع بين الهندسة الميكانيكية والإلكترونية ونظم التحكم المحوسبة والأنظمة المضمنة (Embedded Systems).
                </p>
                <h4 className="text-sm font-bold text-white">الفصل الثاني: الدوائر والمكونات</h4>
                <p>
                  تعتمد جميع النظم على التغذية المرتدة (Feedback Loops) من الحساسات (Sensors) لمعالجة البيانات وإرسال الأوامر للمشغلات الميكانيكية (Actuators).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                <span>تم إدراج الكتاب كمرجع مؤكد بالمكتبة</span>
              </span>

              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert(`تم بدء تنزيل الملف المرجعي: ${activePdfBook.pdfFileName}`);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs flex items-center gap-1.5 hover:bg-cyan-400"
              >
                <Download className="w-4 h-4" />
                <span>تحميل PDF المكتمل</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
