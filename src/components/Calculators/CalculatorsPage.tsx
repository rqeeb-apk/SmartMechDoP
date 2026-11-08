import React, { useState } from 'react';
import { Calculator, Zap, Cpu, Activity, RefreshCw, ArrowLeftRight } from 'lucide-react';

export const CalculatorsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ohm' | 'resistors' | 'rc_time' | 'motor' | 'units'>('ohm');

  // Ohm's Law state
  const [voltage, setVoltage] = useState(12);
  const [current, setCurrent] = useState(2);
  const [resistance, setResistance] = useState(6);
  const [power, setPower] = useState(24);

  // Resistors Series/Parallel state
  const [r1, setR1] = useState(100);
  const [r2, setR2] = useState(200);
  const [r3, setR3] = useState(300);

  // RC Time Constant state
  const [capR, setCapR] = useState(10000); // 10k
  const [capC, setCapC] = useState(100); // 100uF

  // Motor Torque state
  const [motorPowerW, setMotorPowerW] = useState(500); // W
  const [motorRpmVal, setMotorRpmVal] = useState(1500); // RPM

  // Unit Converter state
  const [unitValue, setUnitValue] = useState(10);
  const [unitType, setUnitType] = useState<'torque' | 'pressure' | 'frequency'>('torque');

  // Calculations
  const calculateOhm = (v: number, i: number, r: number) => {
    // Ohm: V = I*R, P = V*I
    const calculatedP = v * i;
    return { v, i, r, p: calculatedP };
  };

  const reqSeries = r1 + r2 + r3;
  const reqParallel = 1 / (1 / r1 + 1 / r2 + 1 / r3);

  const rcTau = (capR * capC) / 1000000; // Tau = R*C seconds
  const cutoffFreq = 1 / (2 * Math.PI * capR * (capC / 1000000));

  // Torque T = (P * 9.5488) / RPM (N.m)
  const motorTorqueNm = (motorPowerW * 9.5488) / Math.max(1, motorRpmVal);

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div className="bg-[#0D1B2A] border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Calculator className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">الحاسبات الهندسية المتخصصة</h1>
            <p className="text-xs text-slate-400">حاسبات دقيقة لقوانين الكهرباء، المقاومة المكافئة، محاثة المكثفات والعزم وتحويل الوحدات</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar bg-slate-900 p-1.5 rounded-xl border border-slate-800 text-xs font-semibold">
          {[
            { id: 'ohm', label: 'قانون أوم والقدرة' },
            { id: 'resistors', label: 'المقاومة المكافئة' },
            { id: 'rc_time', label: 'المكثفات والزمن RC' },
            { id: 'motor', label: 'عزم وسرعة المحركات' },
            { id: 'units', label: 'تحويل الوحدات' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === t.id ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="bg-[#0D1B2A] border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-xl max-w-4xl mx-auto">
        
        {activeTab === 'ohm' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <span>حاسبة قانون أوم وقدرة الطاقة (Ohm & Power Calculator)</span>
              </h3>
              <p className="text-xs text-slate-400">المعادلة: V = I × R | P = V × I</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">الجهد الكهربائي V (فولت):</label>
                <input
                  type="number"
                  value={voltage}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    setVoltage(v);
                    setCurrent(parseFloat((v / Math.max(1, resistance)).toFixed(2)));
                    setPower(parseFloat((v * (v / Math.max(1, resistance))).toFixed(2)));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 text-sm font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">التيار الكهربائي I (أمبير):</label>
                <input
                  type="number"
                  value={current}
                  onChange={(e) => {
                    const i = parseFloat(e.target.value) || 0;
                    setCurrent(i);
                    setVoltage(parseFloat((i * resistance).toFixed(2)));
                    setPower(parseFloat((i * i * resistance).toFixed(2)));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 text-sm font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">المقاومة R (أوم Ω):</label>
                <input
                  type="number"
                  value={resistance}
                  onChange={(e) => {
                    const r = parseFloat(e.target.value) || 1;
                    setResistance(r);
                    setCurrent(parseFloat((voltage / r).toFixed(2)));
                    setPower(parseFloat(((voltage * voltage) / r).toFixed(2)));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 text-sm font-mono font-bold"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">القدرة الكهربائية المستهلكة (Power P):</span>
              <span className="text-xl font-bold font-mono text-cyan-300">{power} Watt (واط)</span>
            </div>
          </div>
        )}

        {activeTab === 'resistors' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                <span>حاسبة المقاومة المكافئة (Series & Parallel Equivalent)</span>
              </h3>
              <p className="text-xs text-slate-400">حساب قيم المقاومات الثلاث عند التوصيل على التوالي أو التوازي</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">المقاومة الأولى R1 (Ω):</label>
                <input
                  type="number"
                  value={r1}
                  onChange={(e) => setR1(parseFloat(e.target.value) || 1)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">المقاومة الثانية R2 (Ω):</label>
                <input
                  type="number"
                  value={r2}
                  onChange={(e) => setR2(parseFloat(e.target.value) || 1)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">المقاومة الثالثة R3 (Ω):</label>
                <input
                  type="number"
                  value={r3}
                  onChange={(e) => setR3(parseFloat(e.target.value) || 1)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400 font-semibold">التوصيل على التوالي (Series):</span>
                <div className="text-xl font-bold font-mono text-cyan-300">{reqSeries.toFixed(2)} Ω</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400 font-semibold">التوصيل على التوازي (Parallel):</span>
                <div className="text-xl font-bold font-mono text-emerald-300">{reqParallel.toFixed(2)} Ω</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rc_time' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                <span>حاسبة الثابت الزمني ترانزيت RC (Time Constant & Cutoff Frequency)</span>
              </h3>
              <p className="text-xs text-slate-400">حساب زمن شحن المكثف τ = R × C وتردد القطع</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">المقاومة R (Ω):</label>
                <input
                  type="number"
                  value={capR}
                  onChange={(e) => setCapR(parseFloat(e.target.value) || 1)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">سعة المكثف C (ميكروفاراد µF):</label>
                <input
                  type="number"
                  value={capC}
                  onChange={(e) => setCapC(parseFloat(e.target.value) || 1)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-1">
                <span className="text-xs text-purple-300 font-bold">الثابت الزمني τ (Time Constant):</span>
                <div className="text-xl font-bold font-mono text-white">{rcTau.toFixed(4)} ثانية (Sec)</div>
              </div>

              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-1">
                <span className="text-xs text-cyan-300 font-bold">تردد القطع fc (Cutoff Frequency):</span>
                <div className="text-xl font-bold font-mono text-white">{cutoffFreq.toFixed(2)} Hz (هيرتز)</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'motor' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-amber-400" />
                <span>حاسبة عزم المحرك والقدرة الدورانية (Motor Torque Calculator)</span>
              </h3>
              <p className="text-xs text-slate-400">المعادلة: Torque T = (P × 9.5488) / RPM</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">القدرة الكهربائية للمحرك (Watt):</label>
                <input
                  type="number"
                  value={motorPowerW}
                  onChange={(e) => setMotorPowerW(parseFloat(e.target.value) || 1)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">السرعة الدورانية RPM (دورة/دقيقة):</label>
                <input
                  type="number"
                  value={motorRpmVal}
                  onChange={(e) => setMotorRpmVal(parseFloat(e.target.value) || 1)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono"
                />
              </div>
            </div>

            <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300">العزم الناتج (Output Torque):</span>
              <span className="text-2xl font-bold font-mono text-amber-400">{motorTorqueNm.toFixed(3)} N.m (نيوتن.متر)</span>
            </div>
          </div>
        )}

        {activeTab === 'units' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
                <span>مُحول الوحدات الهندسية (Engineering Unit Converter)</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">نوع الكمية الهندسية:</label>
                <select
                  value={unitType}
                  onChange={(e) => setUnitType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold"
                >
                  <option value="torque">العزم (N.m ↔ Kg.cm)</option>
                  <option value="pressure">الضغط (Bar ↔ PSI ↔ Pascal)</option>
                  <option value="frequency">التردد والزمن (Hz ↔ ms)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">القيمة المدخلة:</label>
                <input
                  type="number"
                  value={unitValue}
                  onChange={(e) => setUnitValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <h4 className="font-bold text-cyan-400">نتائج التحويل الفوري:</h4>
              {unitType === 'torque' && (
                <div className="space-y-1 font-mono text-slate-300">
                  <div>• N.m ➔ Kg.cm = {(unitValue * 10.197).toFixed(2)} Kg.cm</div>
                  <div>• N.m ➔ lb.ft = {(unitValue * 0.7375).toFixed(2)} lb.ft</div>
                </div>
              )}
              {unitType === 'pressure' && (
                <div className="space-y-1 font-mono text-slate-300">
                  <div>• Bar ➔ PSI = {(unitValue * 14.5038).toFixed(2)} PSI</div>
                  <div>• Bar ➔ KPa = {(unitValue * 100).toFixed(2)} KPa</div>
                </div>
              )}
              {unitType === 'frequency' && (
                <div className="space-y-1 font-mono text-slate-300">
                  <div>• Period T (ms) = {((1 / Math.max(0.01, unitValue)) * 1000).toFixed(2)} ms</div>
                  <div>• Angular Frequency ω = {(2 * Math.PI * unitValue).toFixed(2)} rad/s</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
