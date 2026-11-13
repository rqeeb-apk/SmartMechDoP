import React, { useState } from 'react';
import { askMechatronicsAssistant } from '../../services/ai';
import { Sparkles, Send, Code, Zap, HelpCircle, Upload, CheckCircle2, Bot } from 'lucide-react';

export const SmartAssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; time: string }>>([
    {
      sender: 'assistant',
      text: 'مرحباً بك! أنا مساعد الميكاترونكس الذكي. استطيع مساعدتك في حل مسألة كهربائية، فحص أخطاء كود Arduino C++، اختيار المحرك المناسب، أو استكشاف أعطال الدوائر الإلكترونية.',
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [mode, setMode] = useState<'general' | 'code_review' | 'circuit_troubleshoot'>('general');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputQuery.trim() && !codeSnippet.trim()) return;

    const userText = mode === 'code_review' ? `مراجعة الكود التالي:\n\`\`\`cpp\n${codeSnippet}\n\`\`\`` : inputQuery;

    const newMsgs = [
      ...messages,
      { sender: 'user' as const, text: userText, time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) },
    ];
    setMessages(newMsgs);
    setInputQuery('');
    setIsLoading(true);

    try {
      const answer = await askMechatronicsAssistant(inputQuery || 'فحص كود الأردوينو', mode, codeSnippet);
      setMessages([
        ...newMsgs,
        { sender: 'assistant' as const, text: answer, time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) },
      ]);
    } catch (err: any) {
      setMessages([
        ...newMsgs,
        { sender: 'assistant' as const, text: `عذراً، حدث خطأ أثناء الاتصال: ${err.message}`, time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="champagne-card rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sky-icon-box flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white">مساعد الميكاترونكس الذكي</h1>
            <p className="text-xs text-[#475569] dark:text-slate-400">تحليل وتفسير المسائل الهندسية، مراجعة الأكواد، واستكشاف أعطال الدوائر</p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-3 sm:flex items-center gap-1 sm:gap-2 bg-white dark:bg-slate-900/90 p-1 sm:p-1.5 rounded-xl border border-[rgba(212,175,55,0.3)] dark:border-slate-800 text-xs font-semibold w-full md:w-auto min-w-0">
          <button
            onClick={() => setMode('general')}
            className={`px-2 sm:px-3 py-1.5 rounded-lg truncate text-center text-[11px] sm:text-xs transition-colors ${
              mode === 'general'
                ? 'bg-[#0EA5E9] text-white dark:bg-cyan-500 dark:text-black font-bold shadow-sm'
                : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            استفسار عام
          </button>
          <button
            onClick={() => setMode('code_review')}
            className={`px-2 sm:px-3 py-1.5 rounded-lg truncate text-center text-[11px] sm:text-xs transition-colors ${
              mode === 'code_review'
                ? 'bg-[#0EA5E9] text-white dark:bg-cyan-500 dark:text-black font-bold shadow-sm'
                : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            فحص الكود
          </button>
          <button
            onClick={() => setMode('circuit_troubleshoot')}
            className={`px-2 sm:px-3 py-1.5 rounded-lg truncate text-center text-[11px] sm:text-xs transition-colors ${
              mode === 'circuit_troubleshoot'
                ? 'bg-[#0EA5E9] text-white dark:bg-cyan-500 dark:text-black font-bold shadow-sm'
                : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            أعطال الدوائر
          </button>
        </div>
      </div>

      {/* Chat Messages Feed */}
      <div className="champagne-card rounded-2xl p-6 space-y-4 min-h-[420px] max-h-[550px] overflow-y-auto no-scrollbar flex flex-col justify-between">
        <div className="space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 max-w-3xl ${m.sender === 'user' ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                  m.sender === 'user'
                    ? 'bg-[#0EA5E9] text-white dark:bg-cyan-500 dark:text-slate-950'
                    : 'bg-[#E0F2FE] text-[#0284C7] dark:bg-purple-600 dark:text-white border border-[#0EA5E9]/25 dark:border-transparent'
                }`}
              >
                {m.sender === 'user' ? 'أنت' : <Bot className="w-5 h-5" />}
              </div>

              <div
                className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-[#E0F2FE] dark:bg-cyan-500/15 border border-[#0EA5E9]/30 dark:border-cyan-500/30 text-[#0F172A] dark:text-white rounded-tr-none'
                    : 'bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.28)] dark:border-slate-800 text-[#0F172A] dark:text-slate-200 rounded-tl-none whitespace-pre-line shadow-sm'
                }`}
              >
                <div>{m.text}</div>
                <div className="text-[10px] text-[#64748B] dark:text-slate-400 mt-2 text-left font-mono">{m.time}</div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 max-w-xl">
              <div className="w-9 h-9 rounded-xl bg-[#E0F2FE] text-[#0EA5E9] dark:bg-purple-600 dark:text-white flex items-center justify-center">
                <Bot className="w-5 h-5 animate-spin" />
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.3)] dark:border-slate-800 text-xs text-[#0284C7] dark:text-cyan-400 font-mono">
                جاري التفكير الهندسية وتحليل البيانات...
              </div>
            </div>
          )}
        </div>

        {/* Input Controls Form */}
        <form onSubmit={handleSend} className="space-y-3 pt-4 border-t border-[rgba(212,175,55,0.22)] dark:border-slate-800 mt-6">
          {mode === 'code_review' && (
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-300 mb-1">الصق كود Arduino C++ هنا للمراجعة:</label>
              <textarea
                rows={4}
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
                placeholder="// Paste C++ code here..."
                className="w-full font-mono text-xs bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 rounded-xl p-3 text-[#0F172A] dark:text-cyan-300 focus:outline-none focus:border-[#0EA5E9] dark:focus:border-cyan-400"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="اكتب سؤالك الهندسية أو حدد استفسار الدائرة..."
              className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] text-xs sm:text-sm focus:border-[#0EA5E9] dark:focus:border-cyan-500 focus:outline-none"
            />

            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-gradient-to-r dark:from-purple-600 dark:to-indigo-600 text-white font-bold text-xs shadow-sm disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>إرسال</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
