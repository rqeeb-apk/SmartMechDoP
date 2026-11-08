import React, { useState } from 'react';
import { StudentProject } from '../../types';
import { getStoredProjects, saveProject } from '../../services/storage';
import { generateArduinoProjectCode } from '../../services/ai';
import { Cpu, Plus, Heart, MessageSquare, Sparkles, CheckCircle2, Code, Layers, FileText } from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<StudentProject[]>(getStoredProjects());
  const [showWizard, setShowWizard] = useState(false);

  // New Project Form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('روبوتات وميكاترونكس');
  const [description, setDescription] = useState('');
  const [bomText, setBomText] = useState('ESP32, Servo MG996R, MPU6050');
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newProj: StudentProject = {
      id: `proj_${Date.now()}`,
      title,
      authorName: 'مهندس الميكاترونكس',
      category,
      description,
      objectives: ['تصميم وتجميع النموذج الأولية', 'كتابة واختبار كود التحكم', 'محاكاة الأداء والتحكم'],
      bom: bomText.split(',').map((item) => ({ item: item.trim(), quantity: 1, estimatedCost: '$10' })),
      schematicsDescription: 'توصيل المكونات مع منافذ GPIO على متحكم الأردوينو/ESP32.',
      codeSnippet: generatedCode || '// Doctor Smart Generated Project Code\nvoid setup() {\n  Serial.begin(115200);\n}',
      status: 'prototype',
      progress: 60,
      likes: 1,
      commentsCount: 0,
      createdAt: new Date().toISOString(),
    };

    const updated = saveProject(newProj);
    setProjects(updated);
    setShowWizard(false);
    resetForm();
  };

  const handleGenerateAiCode = async () => {
    if (!title) return;
    setIsLoadingCode(true);
    try {
      const res = await generateArduinoProjectCode(title, bomText.split(','));
      setGeneratedCode(res.code);
    } catch (e: any) {
      alert('حدث خطأ في التوليد');
    } finally {
      setIsLoadingCode(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setBomText('');
    setGeneratedCode('');
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div className="bg-[#0D1B2A] border border-slate-800 rounded-2xl p-6 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
            <Cpu className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">مركز المشاريع والاختراعات الهندسية</h1>
            <p className="text-xs text-slate-400">تطوير المشاريع من الفكرة إلى حصر المكونات BOM والأكواد وتوليد التقرير</p>
          </div>
        </div>

        <button
          onClick={() => setShowWizard(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40"
        >
          <Plus className="w-4 h-4" />
          <span>إبتكار مشروع جديد</span>
        </button>
      </div>

      {/* Projects Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((proj) => (
          <div
            key={proj.id}
            className="bg-[#0D1B2A] border border-slate-800 hover:border-amber-500/40 rounded-2xl p-6 space-y-4 transition-all hover:shadow-xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                  {proj.category}
                </span>
                <h3 className="text-lg font-bold text-white mt-2">{proj.title}</h3>
                <p className="text-xs text-slate-400 mt-1">بواسطة: {proj.authorName}</p>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold text-cyan-400">{proj.progress}% مكتمل</span>
                <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
                  <div className="bg-cyan-500 h-full" style={{ width: `${proj.progress}%` }} />
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{proj.description}</p>

            {/* BOM Table Summary */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
              <span className="font-bold text-slate-300">قائمة المكونات الأساسية (BOM):</span>
              <div className="flex flex-wrap gap-1.5">
                {proj.bom.map((b, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-cyan-300 font-mono">
                    {b.item} ({b.quantity}x)
                  </span>
                ))}
              </div>
            </div>

            {/* Footer details */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-rose-400">
                  <Heart className="w-3.5 h-3.5 fill-current" /> {proj.likes}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" /> {proj.commentsCount}
                </span>
              </div>

              <button
                onClick={() => alert(`كود المشروع المولد:\n\n${proj.codeSnippet}`)}
                className="text-cyan-400 hover:underline flex items-center gap-1 font-bold text-[11px]"
              >
                <Code className="w-3.5 h-3.5" />
                <span>عرض الكود المصدري</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* New Project Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#0D1B2A] border border-amber-500/30 w-full max-w-2xl rounded-2xl p-6 sm:p-8 space-y-6 text-slate-100 my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-amber-400" />
                <span>إبتكار مشروع اختراع ميكاترونكس جديد</span>
              </h3>
              <button onClick={() => setShowWizard(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">اسم المشروع أو الاختراع:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: نظام تتبع الشمس الذكي للدرون"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">وصف فكرة وآلية عمل المشروع:</label>
                <textarea
                  rows={3}
                  placeholder="شرح أهداف الفكرة وآلية التحكم..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-amber-400 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">قائمة القطع والمكونات المتوقعة (مفصولة بفاصلة):</label>
                <input
                  type="text"
                  placeholder="Arduino UNO, Servo Motor, LDR Sensor, LCD"
                  value={bomText}
                  onChange={(e) => setBomText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* AI Code Generator button */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleGenerateAiCode}
                  disabled={isLoadingCode || !title}
                  className="px-4 py-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600 hover:text-white font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>{isLoadingCode ? 'جاري كتابة الكود بالذكاء الاصطناعي...' : 'توليد كود التحكم تلقائياً (AI)'}</span>
                </button>

                {generatedCode && (
                  <textarea
                    rows={4}
                    value={generatedCode}
                    onChange={(e) => setGeneratedCode(e.target.value)}
                    className="w-full font-mono text-[11px] bg-slate-900 border border-slate-700 rounded-xl p-3 text-cyan-300"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowWizard(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold shadow-lg"
                >
                  حفظ ونشر المشروع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
