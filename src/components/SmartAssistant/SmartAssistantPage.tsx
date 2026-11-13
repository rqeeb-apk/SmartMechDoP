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
      <div className="bg-[#0D1B2A] border border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">مساعد الميكاترونكس الذكي</h1>
            <p className="text-xs text-slate-400">تحليل وتفسير المسائل الهندسية، مراجعة الأكواد، واستكشاف أعطال الدوائر</p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-3 sm:flex items-center gap-1 sm:gap-2 bg-slate-900/90 p-1 sm:p-1.5 rounded-xl border border-slate-800 text-xs font-semibold w-full md:w-auto min-w-0">
          <button
            onClick={() => setMode('general')}
            className={`px-2 sm:px-3 py-1.5 rounded-lg truncate text-center text-[11px] sm:text-xs transition-colors ${mode === 'general' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            استفسار عام
          </button>
          <button
            onClick={() => setMode('code_review')}
            className={`px-2 sm:px-3 py-1.5 rounded-lg truncate text-center text-[11px] sm:text-xs transition-colors ${mode === 'code_review' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            فحص الكود
          </button>
          <button
            onClick={() => setMode('circuit_troubleshoot')}
            className={`px-2 sm:px-3 py-1.5 rounded-lg truncate text-center text-[11px] sm:text-xs transition-colors ${mode === 'circuit_troubleshoot' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            أعطال الدوائر
          </button>
        </div>
      </div>

      {/* Chat Messages Feed */}
      <div className="bg-[#0D1B2A] border border-slate-800 rounded-2xl p-6 space-y-4 min-h-[420px] max-h-[550px] overflow-y-auto no-scrollbar flex flex-col justify-between">
        <div className="space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 max-w-3xl ${m.sender === 'user' ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 ${
                  m.sender === 'user' ? 'bg-cyan-500' : 'bg-purple-600'
                }`}
              >
                {m.sender === 'user' ? 'أنت' : <Bot className="w-5 h-5" />}
              </div>

              <div
                className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-cyan-500/15 border border-cyan-500/30 text-white rounded-tr-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none whitespace-pre-line'
                }`}
              >
                <div>{m.text}</div>
                <div className="text-[10px] text-slate-400 mt-2 text-left font-mono">{m.time}</div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 max-w-xl">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                <Bot className="w-5 h-5 animate-spin" />
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-cyan-400 font-mono">
                جاري التفكير الهندسية وتحليل البيانات...
              </div>
            </div>
          )}
        </div>

        {/* Input Controls Form */}
        <form onSubmit={handleSend} className="space-y-3 pt-4 border-t border-slate-800 mt-6">
          {mode === 'code_review' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">الصق كود Arduino C++ هنا للمراجعة:</label>
              <textarea
                rows={4}
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
                placeholder="// Paste C++ code here..."
                className="w-full font-mono text-xs bg-slate-900 border border-slate-700 rounded-xl p-3 text-cyan-300 focus:outline-none focus:border-cyan-400"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="اكتب سؤالك الهندسية أو حدد استفسار الدائرة..."
              className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm focus:border-cyan-500 focus:outline-none"
            />

            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0"
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
