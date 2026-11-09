import React from 'react';
import { CircuitComponent } from '../../types';

// Helper to calculate resistor color bands based on resistance value (Ohms)
export function getResistorColorBands(val: number): [string, string, string, string] {
  // Approximate standard 4-band EIA color code
  const colorMap: { [key: number]: string } = {
    0: '#000000', // Black
    1: '#8B4513', // Brown
    2: '#EF4444', // Red
    3: '#F97316', // Orange
    4: '#FACC15', // Yellow
    5: '#22C55E', // Green
    6: '#3B82F6', // Blue
    7: '#A855F7', // Violet
    8: '#6B7280', // Grey
    9: '#FFFFFF', // White
  };

  const str = Math.round(val).toString();
  const d1 = parseInt(str[0]) || 2;
  const d2 = parseInt(str[1]) || 2;
  const multiplier = Math.max(0, str.length - 2);

  const c1 = colorMap[d1] || '#8B4513';
  const c2 = colorMap[d2] || '#000000';
  const c3 = colorMap[multiplier] || '#EF4444';
  const c4 = '#D4AF37'; // Gold 5% tolerance

  return [c1, c2, c3, c4];
}

/* =========================================================================
   1. Realistic Component Interactive Models (SVG Vector Art with Exact Pins)
   ========================================================================= */

// Realistic Arduino UNO R3
export const RealisticArduinoUno: React.FC<{
  comp: CircuitComponent;
  isSimulating: boolean;
}> = ({ comp, isSimulating }) => {
  return (
    <svg width="220" height="155" viewBox="0 0 220 155" className="filter drop-shadow-xl select-none">
      <defs>
        <linearGradient id="pcbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="50%" stopColor="#0369a1" />
          <stop offset="100%" stopColor="#075985" />
        </linearGradient>
        <linearGradient id="metalUsb" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id="icGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="50%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      {/* PCB Board Outline with Rounded Corners & Mounting Holes */}
      <rect x="15" y="10" width="190" height="135" rx="10" fill="url(#pcbGrad)" stroke="#38bdf8" strokeWidth="1.5" />
      
      {/* Mounting screw holes */}
      <circle cx="28" cy="22" r="4.5" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5" />
      <circle cx="28" cy="133" r="4.5" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5" />
      <circle cx="193" cy="40" r="4.5" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5" />
      <circle cx="193" cy="115" r="4.5" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5" />

      {/* USB-B Port */}
      <rect x="0" y="24" width="34" height="26" rx="2" fill="url(#metalUsb)" stroke="#475569" strokeWidth="1" />
      <rect x="4" y="28" width="10" height="18" fill="#1e293b" rx="1" />

      {/* DC Barrel Jack */}
      <rect x="0" y="98" width="36" height="32" rx="3" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
      <circle cx="20" cy="114" r="5" fill="#0f172a" />
      <circle cx="20" cy="114" r="2.5" fill="#f59e0b" />

      {/* Silver Crystal Oscillator (16MHz) */}
      <rect x="62" y="38" width="18" height="10" rx="3" fill="url(#metalUsb)" stroke="#64748b" />
      <text x="71" y="45" fill="#0f172a" fontSize="5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">16.000</text>

      {/* ATmega328P DIP IC Chip */}
      <rect x="85" y="65" width="75" height="24" rx="2" fill="url(#icGrad)" stroke="#334155" strokeWidth="1" />
      {/* IC Pins */}
      {Array.from({ length: 14 }).map((_, i) => (
        <g key={i}>
          <rect x={90 + i * 5} y="60" width="2" height="5" fill="#cbd5e1" />
          <rect x={90 + i * 5} y="89" width="2" height="5" fill="#cbd5e1" />
        </g>
      ))}
      <circle cx="90" cy="77" r="2" fill="#475569" />
      <text x="122" y="79" fill="#e2e8f0" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">ATMEGA328P-PU</text>

      {/* Silkscreen text branding */}
      <text x="125" y="32" fill="#ffffff" fontSize="11" fontWeight="bold" fontFamily="sans-serif">ARDUINO</text>
      <text x="175" y="32" fill="#facc15" fontSize="10" fontWeight="extrabold" fontFamily="sans-serif">UNO</text>
      <text x="125" y="44" fill="#bae6fd" fontSize="6.5" fontFamily="sans-serif">Dr. Smart Mechatronics Edition</text>

      {/* Power & Status LEDs */}
      {/* ON LED (Green) */}
      <circle cx="165" cy="55" r="2.5" fill="#22c55e" filter={isSimulating ? 'drop-shadow(0 0 4px #22c55e)' : 'none'} />
      <text x="165" y="50" fill="#cbd5e1" fontSize="4.5" textAnchor="middle">ON</text>

      {/* L (Pin 13) LED (Orange) */}
      <circle cx="152" cy="55" r="2.5" fill={isSimulating ? '#f59e0b' : '#78350f'} filter={isSimulating ? 'drop-shadow(0 0 5px #f59e0b)' : 'none'} />
      <text x="152" y="50" fill="#cbd5e1" fontSize="4.5" textAnchor="middle">L</text>

      {/* Top Female Header (Digital 0-13, GND, AREF) */}
      <rect x="68" y="11" width="128" height="10" fill="#0f172a" rx="1" stroke="#334155" />
      {Array.from({ length: 14 }).map((_, i) => (
        <circle key={i} cx={75 + i * 8.8} cy="16" r="1.8" fill="#1e293b" stroke="#cbd5e1" strokeWidth="0.8" />
      ))}
      <text x="75" y="27" fill="#ffffff" fontSize="5" fontFamily="monospace">AREF</text>
      <text x="92" y="27" fill="#ffffff" fontSize="5" fontFamily="monospace">GND</text>
      <text x="110" y="27" fill="#38bdf8" fontSize="5" fontWeight="bold" fontFamily="monospace">13</text>
      <text x="128" y="27" fill="#ffffff" fontSize="5" fontFamily="monospace">11~</text>
      <text x="145" y="27" fill="#ffffff" fontSize="5" fontFamily="monospace">9~</text>
      <text x="180" y="27" fill="#ffffff" fontSize="5" fontFamily="monospace">0(RX)</text>

      {/* Bottom Female Header (Power, Analog In) */}
      <rect x="68" y="133" width="56" height="10" fill="#0f172a" rx="1" stroke="#334155" />
      <rect x="135" y="133" width="60" height="10" fill="#0f172a" rx="1" stroke="#334155" />
      <text x="76" y="130" fill="#ef4444" fontSize="5" fontWeight="bold" fontFamily="monospace">5V</text>
      <text x="92" y="130" fill="#94a3b8" fontSize="5" fontWeight="bold" fontFamily="monospace">GND</text>
      <text x="108" y="130" fill="#f59e0b" fontSize="5" fontFamily="monospace">Vin</text>
      <text x="142" y="130" fill="#22c55e" fontSize="5" fontWeight="bold" fontFamily="monospace">A0</text>
      <text x="160" y="130" fill="#22c55e" fontSize="5" fontFamily="monospace">A2</text>
      <text x="185" y="130" fill="#22c55e" fontSize="5" fontFamily="monospace">A5</text>
    </svg>
  );
};

// Realistic ESP32 NodeMCU Module
export const RealisticESP32: React.FC<{
  comp: CircuitComponent;
  isSimulating: boolean;
}> = ({ isSimulating }) => {
  return (
    <svg width="200" height="130" viewBox="0 0 200 130" className="filter drop-shadow-xl select-none">
      <defs>
        <linearGradient id="metalShield" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>

      {/* Black PCB */}
      <rect x="10" y="10" width="180" height="110" rx="8" fill="#090d16" stroke="#f59e0b" strokeWidth="1.5" />

      {/* Micro USB Port */}
      <rect x="0" y="48" width="18" height="34" rx="2" fill="#cbd5e1" stroke="#475569" />
      <rect x="2" y="54" width="8" height="22" fill="#1e293b" />

      {/* Metal RF Shield Can */}
      <rect x="90" y="24" width="75" height="82" rx="4" fill="url(#metalShield)" stroke="#cbd5e1" strokeWidth="1" />
      <text x="127" y="45" fill="#0f172a" fontSize="8" fontWeight="extrabold" textAnchor="middle" fontFamily="sans-serif">ESP-WROOM-32</text>
      <text x="127" y="58" fill="#1e293b" fontSize="6.5" textAnchor="middle" fontFamily="monospace">Wi-Fi + BT Dual Core</text>

      {/* PCB Trace Antenna */}
      <path d="M 166 35 L 182 35 L 182 45 L 172 45 L 172 55 L 182 55 L 182 65 L 172 65 L 172 75 L 182 75 L 182 85 L 172 85 L 172 95 L 182 95" fill="none" stroke="#d97706" strokeWidth="2.5" />

      {/* Buttons (EN & BOOT) */}
      <rect x="30" y="24" width="10" height="12" rx="1" fill="#475569" />
      <circle cx="35" cy="30" r="3" fill="#cbd5e1" />
      <text x="35" y="43" fill="#cbd5e1" fontSize="5" textAnchor="middle">EN</text>

      <rect x="30" y="94" width="10" height="12" rx="1" fill="#475569" />
      <circle cx="35" cy="100" r="3" fill="#cbd5e1" />
      <text x="35" y="113" fill="#cbd5e1" fontSize="5" textAnchor="middle">BOOT</text>

      {/* Blue Status LED */}
      <circle cx="55" cy="65" r="3" fill={isSimulating ? '#38bdf8' : '#0369a1'} filter={isSimulating ? 'drop-shadow(0 0 5px #38bdf8)' : 'none'} />

      {/* Gold Pin Headers (Top and Bottom) */}
      {Array.from({ length: 15 }).map((_, i) => (
        <g key={i}>
          <rect x={22 + i * 10} y="8" width="4" height="6" fill="#facc15" stroke="#ca8a04" />
          <rect x={22 + i * 10} y="116" width="4" height="6" fill="#facc15" stroke="#ca8a04" />
        </g>
      ))}
      <text x="24" y="22" fill="#facc15" fontSize="5" fontFamily="monospace">3V3</text>
      <text x="44" y="22" fill="#94a3b8" fontSize="5" fontFamily="monospace">GND</text>
      <text x="64" y="22" fill="#38bdf8" fontSize="5" fontFamily="monospace">D2</text>
      <text x="84" y="22" fill="#38bdf8" fontSize="5" fontFamily="monospace">D4</text>
      <text x="124" y="22" fill="#38bdf8" fontSize="5" fontFamily="monospace">D18</text>
    </svg>
  );
};

// Realistic White 400-Point Breadboard
export const RealisticBreadboard: React.FC<{
  comp: CircuitComponent;
}> = () => {
  return (
    <svg width="260" height="150" viewBox="0 0 260 150" className="filter drop-shadow-xl select-none">
      <defs>
        <linearGradient id="bbWhite" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>
      </defs>

      {/* Plastic Breadboard Body */}
      <rect x="5" y="5" width="250" height="140" rx="8" fill="url(#bbWhite)" stroke="#cbd5e1" strokeWidth="2" />

      {/* Top Power Rails Lines */}
      <line x1="20" y1="18" x2="240" y2="18" stroke="#ef4444" strokeWidth="1.5" />
      <text x="14" y="20" fill="#ef4444" fontSize="8" fontWeight="bold">+</text>
      <line x1="20" y1="34" x2="240" y2="34" stroke="#3b82f6" strokeWidth="1.5" />
      <text x="14" y="36" fill="#3b82f6" fontSize="10" fontWeight="bold">-</text>

      {/* Bottom Power Rails Lines */}
      <line x1="20" y1="116" x2="240" y2="116" stroke="#ef4444" strokeWidth="1.5" />
      <text x="14" y="118" fill="#ef4444" fontSize="8" fontWeight="bold">+</text>
      <line x1="20" y1="132" x2="240" y2="132" stroke="#3b82f6" strokeWidth="1.5" />
      <text x="14" y="134" fill="#3b82f6" fontSize="10" fontWeight="bold">-</text>

      {/* Center Divider Trough */}
      <rect x="18" y="72" width="224" height="6" fill="#e2e8f0" rx="1" />

      {/* Matrix of Tie-Point Holes */}
      {Array.from({ length: 22 }).map((_, col) => (
        <g key={col}>
          {/* Top Power Rail Holes */}
          <rect x={26 + col * 9.5} y="15" width="4.5" height="4.5" rx="1" fill="#1e293b" />
          <rect x={26 + col * 9.5} y="31" width="4.5" height="4.5" rx="1" fill="#1e293b" />

          {/* Terminal Strip Upper (Rows A to E) */}
          <rect x={26 + col * 9.5} y="44" width="4.5" height="4.5" rx="1" fill="#0f172a" />
          <rect x={26 + col * 9.5} y="50" width="4.5" height="4.5" rx="1" fill="#0f172a" />
          <rect x={26 + col * 9.5} y="56" width="4.5" height="4.5" rx="1" fill="#0f172a" />
          <rect x={26 + col * 9.5} y="62" width="4.5" height="4.5" rx="1" fill="#0f172a" />

          {/* Terminal Strip Lower (Rows F to J) */}
          <rect x={26 + col * 9.5} y="82" width="4.5" height="4.5" rx="1" fill="#0f172a" />
          <rect x={26 + col * 9.5} y="88" width="4.5" height="4.5" rx="1" fill="#0f172a" />
          <rect x={26 + col * 9.5} y="94" width="4.5" height="4.5" rx="1" fill="#0f172a" />
          <rect x={26 + col * 9.5} y="100" width="4.5" height="4.5" rx="1" fill="#0f172a" />

          {/* Bottom Power Rail Holes */}
          <rect x={26 + col * 9.5} y="113" width="4.5" height="4.5" rx="1" fill="#1e293b" />
          <rect x={26 + col * 9.5} y="129" width="4.5" height="4.5" rx="1" fill="#1e293b" />
        </g>
      ))}

      {/* Row Labels (a-j) and Column Numbers (1-22) */}
      <text x="248" y="48" fill="#94a3b8" fontSize="5" fontFamily="monospace">A</text>
      <text x="248" y="66" fill="#94a3b8" fontSize="5" fontFamily="monospace">E</text>
      <text x="248" y="86" fill="#94a3b8" fontSize="5" fontFamily="monospace">F</text>
      <text x="248" y="104" fill="#94a3b8" fontSize="5" fontFamily="monospace">J</text>

      <text x="35" y="77" fill="#64748b" fontSize="6" fontWeight="bold" fontFamily="sans-serif">BREADBOARD 400 TIE-POINTS</text>
    </svg>
  );
};

// Realistic Axial Resistor with EIA Color Bands
export const RealisticResistor: React.FC<{
  comp: CircuitComponent;
}> = ({ comp }) => {
  const [b1, b2, b3, b4] = getResistorColorBands(comp.value || 220);

  return (
    <svg width="150" height="45" viewBox="0 0 150 45" className="filter drop-shadow-md select-none">
      <defs>
        <linearGradient id="leadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="bodyBeige" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>
      </defs>

      {/* Metal Axial Leads */}
      <line x1="5" y1="22.5" x2="40" y2="22.5" stroke="url(#leadGrad)" strokeWidth="3" strokeLinecap="round" />
      <line x1="110" y1="22.5" x2="145" y2="22.5" stroke="url(#leadGrad)" strokeWidth="3" strokeLinecap="round" />

      {/* Ceramic Dog-Bone Resistor Body */}
      <path
        d="M 40 16 C 45 10 50 14 55 14 L 95 14 C 100 14 105 10 110 16 L 110 29 C 105 35 100 31 95 31 L 55 31 C 50 31 45 35 40 29 Z"
        fill="url(#bodyBeige)"
        stroke="#a16207"
        strokeWidth="1"
      />

      {/* Standard Color Bands */}
      <rect x="52" y="14" width="5" height="17" fill={b1} />
      <rect x="65" y="14" width="5" height="17" fill={b2} />
      <rect x="78" y="14" width="5" height="17" fill={b3} />
      <rect x="94" y="14" width="5" height="17" fill={b4} />

      {/* Resistance value text badge */}
      <rect x="55" y="34" width="40" height="10" rx="3" fill="#0f172a" opacity="0.8" />
      <text x="75" y="41.5" fill="#fef08a" fontSize="6.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
        {comp.value} {comp.unit || 'Ω'}
      </text>
    </svg>
  );
};

// Realistic 5mm Diffused LED (Bulb + Leads + Specular Glow)
export const RealisticLED: React.FC<{
  comp: CircuitComponent;
  isSimulating: boolean;
}> = ({ comp, isSimulating }) => {
  const isPowered = isSimulating && comp.state?.isOn !== false;
  const bulbColor = comp.color || (comp.label.includes('Green') ? '#22c55e' : comp.label.includes('Yellow') ? '#eab308' : '#ef4444');

  return (
    <svg width="70" height="95" viewBox="0 0 70 95" className="filter drop-shadow-xl select-none">
      <defs>
        <radialGradient id={`ledGlow_${comp.id}`} cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="35%" stopColor={bulbColor} stopOpacity="0.95" />
          <stop offset="100%" stopColor={bulbColor} stopOpacity="0.75" />
        </radialGradient>
      </defs>

      {/* Metal Lead Wires */}
      {/* Long Anode Lead (+) */}
      <line x1="30" y1="52" x2="30" y2="92" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
      {/* Short Cathode Lead (-) */}
      <line x1="42" y1="52" x2="42" y2="82" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />

      {/* Simulation Radial Bloom Glow when energized */}
      {isPowered && (
        <circle cx="36" cy="30" r="32" fill={bulbColor} opacity="0.3" filter="blur(8px)" />
      )}

      {/* LED Plastic Rim Collar */}
      <rect x="22" y="47" width="28" height="6" rx="2" fill={bulbColor} stroke="#ffffff" strokeOpacity="0.3" strokeWidth="0.8" />
      {/* Flat notch on cathode side */}
      <line x1="48" y1="47" x2="48" y2="53" stroke="#000000" strokeWidth="1.5" />

      {/* LED Dome Capsule Lens */}
      <path
        d="M 23 48 L 23 30 C 23 15 49 15 49 30 L 49 48 Z"
        fill={`url(#ledGlow_${comp.id})`}
        stroke="#ffffff"
        strokeOpacity="0.5"
        strokeWidth="1"
      />

      {/* Internal Anode Anvil & Cathode Post Structure */}
      <path d="M 30 45 L 30 36 L 36 34 L 36 38 Z" fill="#ffffff" opacity="0.5" />
      <path d="M 42 45 L 42 37 L 39 37 Z" fill="#ffffff" opacity="0.5" />

      {/* Specular Highlight Sheen */}
      <ellipse cx="28" cy="24" rx="4" ry="7" fill="#ffffff" opacity="0.6" transform="rotate(-20 28 24)" />
    </svg>
  );
};

// Realistic Micro Servo Motor SG90 (Blue Case + Nylon Horn + 3-Pin Ribbon)
export const RealisticServoMotor: React.FC<{
  comp: CircuitComponent;
  isSimulating: boolean;
}> = ({ comp }) => {
  const angle = comp.value || 90;

  return (
    <svg width="150" height="110" viewBox="0 0 150 110" className="filter drop-shadow-xl select-none">
      <defs>
        <linearGradient id="servoBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
      </defs>

      {/* 3-Wire Ribbon Cable (Brown GND, Red 5V, Orange Signal) */}
      <path d="M 25 80 C 15 90 10 95 0 95" stroke="#78350f" strokeWidth="3" fill="none" />
      <path d="M 25 83 C 15 93 10 98 0 98" stroke="#ef4444" strokeWidth="3" fill="none" />
      <path d="M 25 86 C 15 96 10 101 0 101" stroke="#f97316" strokeWidth="3" fill="none" />

      {/* Mounting Flanges */}
      <rect x="20" y="48" width="85" height="8" rx="2" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="0.8" />
      <circle cx="26" cy="52" r="3" fill="#0f172a" />
      <circle cx="99" cy="52" r="3" fill="#0f172a" />

      {/* Translucent Blue Housing */}
      <rect x="32" y="28" width="60" height="52" rx="4" fill="url(#servoBlue)" stroke="#60a5fa" strokeWidth="1" />
      <text x="62" y="58" fill="#ffffff" fontSize="8" fontWeight="extrabold" textAnchor="middle" fontFamily="sans-serif">Micro Servo</text>
      <text x="62" y="68" fill="#fde047" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="monospace">SG90 9g</text>

      {/* Output Spline Gear Axis */}
      <circle cx="48" cy="22" r="9" fill="#1e3a8a" stroke="#60a5fa" />

      {/* Rotatable White Nylon Double-Arm Horn */}
      <g transform={`rotate(${angle - 90} 48 22)`}>
        <rect x="22" y="19" width="52" height="6" rx="3" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8" />
        <circle cx="48" cy="22" r="5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
        <circle cx="48" cy="22" r="2" fill="#475569" />
        {/* Horn mounting holes */}
        <circle cx="28" cy="22" r="1.5" fill="#64748b" />
        <circle cx="36" cy="22" r="1.5" fill="#64748b" />
        <circle cx="60" cy="22" r="1.5" fill="#64748b" />
        <circle cx="68" cy="22" r="1.5" fill="#64748b" />
      </g>
    </svg>
  );
};

// Realistic Ultrasonic Sensor HC-SR04
export const RealisticHCSR04: React.FC<{
  comp: CircuitComponent;
}> = () => {
  return (
    <svg width="170" height="85" viewBox="0 0 170 85" className="filter drop-shadow-xl select-none">
      <defs>
        <linearGradient id="transducerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>

      {/* Blue PCB */}
      <rect x="10" y="10" width="150" height="65" rx="6" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
      <text x="85" y="24" fill="#ffffff" fontSize="7.5" fontWeight="extrabold" textAnchor="middle" fontFamily="sans-serif">HC-SR04</text>
      <text x="85" y="32" fill="#bae6fd" fontSize="5.5" textAnchor="middle" fontFamily="sans-serif">Ultrasonic Sensor</text>

      {/* Transmitter Can (T) */}
      <circle cx="45" cy="42" r="22" fill="url(#transducerGrad)" stroke="#475569" strokeWidth="1.5" />
      <circle cx="45" cy="42" r="17" fill="#0f172a" />
      {/* Mesh Pattern */}
      <circle cx="45" cy="42" r="12" fill="#334155" opacity="0.6" />
      <text x="45" y="45" fill="#e2e8f0" fontSize="9" fontWeight="bold" textAnchor="middle">T</text>

      {/* Receiver Can (R) */}
      <circle cx="125" cy="42" r="22" fill="url(#transducerGrad)" stroke="#475569" strokeWidth="1.5" />
      <circle cx="125" cy="42" r="17" fill="#0f172a" />
      <circle cx="125" cy="42" r="12" fill="#334155" opacity="0.6" />
      <text x="125" y="45" fill="#e2e8f0" fontSize="9" fontWeight="bold" textAnchor="middle">R</text>

      {/* Quartz Crystal in Center */}
      <rect x="79" y="42" width="12" height="6" rx="2" fill="#cbd5e1" stroke="#475569" />

      {/* 4-Pin Connection Header at Bottom */}
      <rect x="62" y="68" width="46" height="8" rx="1" fill="#0f172a" />
      <circle cx="68" cy="72" r="1.8" fill="#facc15" />
      <circle cx="80" cy="72" r="1.8" fill="#facc15" />
      <circle cx="92" cy="72" r="1.8" fill="#facc15" />
      <circle cx="102" cy="72" r="1.8" fill="#facc15" />

      <text x="68" y="65" fill="#f8fafc" fontSize="4.5" textAnchor="middle" fontFamily="monospace">VCC</text>
      <text x="80" y="65" fill="#f8fafc" fontSize="4.5" textAnchor="middle" fontFamily="monospace">Trig</text>
      <text x="92" y="65" fill="#f8fafc" fontSize="4.5" textAnchor="middle" fontFamily="monospace">Echo</text>
      <text x="102" y="65" fill="#f8fafc" fontSize="4.5" textAnchor="middle" fontFamily="monospace">GND</text>
    </svg>
  );
};

// Realistic Radial Electrolytic Capacitor
export const RealisticCapacitor: React.FC<{
  comp: CircuitComponent;
}> = ({ comp }) => {
  return (
    <svg width="70" height="90" viewBox="0 0 70 90" className="filter drop-shadow-lg select-none">
      <defs>
        <linearGradient id="capBlue" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="50%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>

      {/* Wire Leads */}
      <line x1="26" y1="58" x2="26" y2="86" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="44" y1="58" x2="44" y2="78" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />

      {/* Cylindrical Aluminum Can Body */}
      <rect x="15" y="10" width="40" height="50" rx="6" fill="url(#capBlue)" stroke="#1e40af" strokeWidth="1" />

      {/* Top Metallic Safety Vent */}
      <ellipse cx="35" cy="12" rx="18" ry="4" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" />
      <line x1="31" y1="12" x2="39" y2="12" stroke="#475569" strokeWidth="0.8" />
      <line x1="35" y1="9" x2="35" y2="15" stroke="#475569" strokeWidth="0.8" />

      {/* Negative Polarity White Stripe */}
      <rect x="42" y="12" width="10" height="48" fill="#f8fafc" opacity="0.85" />
      <text x="47" y="26" fill="#000000" fontSize="8" fontWeight="bold" textAnchor="middle">-</text>
      <text x="47" y="42" fill="#000000" fontSize="8" fontWeight="bold" textAnchor="middle">-</text>

      {/* Printed Rating */}
      <text x="28" y="32" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
        {comp.value || 100}µF
      </text>
      <text x="28" y="44" fill="#fde047" fontSize="5.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">25V</text>
    </svg>
  );
};

// Realistic Transistor TO-92 Package
export const RealisticTransistor: React.FC<{
  comp: CircuitComponent;
}> = () => {
  return (
    <svg width="80" height="95" viewBox="0 0 80 95" className="filter drop-shadow-md select-none">
      <defs>
        <linearGradient id="to92Grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="40%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      {/* 3 Staggered Metal Leads (E, B, C) */}
      <line x1="25" y1="42" x2="25" y2="88" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="40" y1="42" x2="40" y2="88" stroke="#cbd5e1" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="55" y1="42" x2="55" y2="88" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" />

      {/* D-Shaped TO-92 Epoxy Casing */}
      <path
        d="M 18 38 C 18 12 62 12 62 38 Z"
        fill="url(#to92Grad)"
        stroke="#475569"
        strokeWidth="1"
      />
      <rect x="18" y="38" width="44" height="6" rx="1" fill="#0f172a" />

      {/* Printed Part Number */}
      <text x="40" y="30" fill="#cbd5e1" fontSize="6.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">2N2222</text>
      <text x="40" y="37" fill="#64748b" fontSize="4.5" textAnchor="middle" fontFamily="monospace">NPN BJT</text>

      {/* Pin labels */}
      <text x="25" y="82" fill="#facc15" fontSize="5" fontWeight="bold" textAnchor="middle">E</text>
      <text x="40" y="82" fill="#38bdf8" fontSize="5" fontWeight="bold" textAnchor="middle">B</text>
      <text x="55" y="82" fill="#facc15" fontSize="5" fontWeight="bold" textAnchor="middle">C</text>
    </svg>
  );
};

// Realistic Tactile Pushbutton Switch (4-Pin)
export const RealisticPushbutton: React.FC<{
  comp: CircuitComponent;
  isSimulating: boolean;
}> = () => {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" className="filter drop-shadow-md select-none">
      {/* 4 Curved Terminal Leads */}
      <line x1="12" y1="20" x2="4" y2="20" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
      <line x1="12" y1="60" x2="4" y2="60" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
      <line x1="68" y1="20" x2="76" y2="20" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
      <line x1="68" y1="60" x2="76" y2="60" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />

      {/* Silver Top Plate */}
      <rect x="12" y="12" width="56" height="56" rx="6" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
      {/* 4 Corner Metal Rivets */}
      <circle cx="18" cy="18" r="2" fill="#94a3b8" />
      <circle cx="62" cy="18" r="2" fill="#94a3b8" />
      <circle cx="18" cy="62" r="2" fill="#94a3b8" />
      <circle cx="62" cy="62" r="2" fill="#94a3b8" />

      {/* Black Round Button Actuator */}
      <circle cx="40" cy="40" r="16" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
      <circle cx="40" cy="40" r="12" fill="#1e293b" />
    </svg>
  );
};

// Realistic DC Brushed Motor 12V
export const RealisticDCMotor: React.FC<{
  comp: CircuitComponent;
  isSimulating: boolean;
}> = ({ isSimulating }) => {
  return (
    <svg width="150" height="90" viewBox="0 0 150 90" className="filter drop-shadow-xl select-none">
      <defs>
        <linearGradient id="motorSteel" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>

      {/* Metal Output Shaft (Spinning indicator) */}
      <rect x="105" y="41" width="38" height="8" rx="2" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
      <line x1="125" y1="41" x2="125" y2="49" stroke="#000000" strokeWidth="1.5" strokeDasharray={isSimulating ? '2 2' : 'none'} />

      {/* Cylindrical Motor Body */}
      <rect x="25" y="15" width="85" height="60" rx="12" fill="url(#motorSteel)" stroke="#475569" strokeWidth="1.5" />
      
      {/* Black Plastic Rear Cap */}
      <rect x="12" y="24" width="16" height="42" rx="4" fill="#0f172a" stroke="#334155" />
      {/* Solder Tabs (+ Red dot / - Black dot) */}
      <circle cx="8" cy="34" r="3" fill="#ef4444" />
      <circle cx="8" cy="56" r="3" fill="#0f172a" stroke="#cbd5e1" />

      <text x="65" y="46" fill="#0f172a" fontSize="10" fontWeight="extrabold" textAnchor="middle" fontFamily="sans-serif">DC MOTOR</text>
      <text x="65" y="58" fill="#1e3a8a" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">12V 3000 RPM</text>
    </svg>
  );
};

// Realistic Potentiometer (Rotary Volume / Analog Knob)
export const RealisticPotentiometer: React.FC<{
  comp: CircuitComponent;
}> = () => {
  return (
    <svg width="90" height="110" viewBox="0 0 90 110" className="filter drop-shadow-xl select-none">
      {/* 3 Solder Lugs (Pins) at bottom */}
      <line x1="22" y1="80" x2="22" y2="105" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
      <line x1="45" y1="80" x2="45" y2="105" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
      <line x1="68" y1="80" x2="68" y2="105" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />

      {/* Blue Metal Pot Body */}
      <circle cx="45" cy="45" r="38" fill="#1d4ed8" stroke="#3b82f6" strokeWidth="2" />
      
      {/* Metal Bushing Collar */}
      <circle cx="45" cy="45" r="22" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />

      {/* Fluted Serrated Metal Shaft */}
      <circle cx="45" cy="45" r="14" fill="#94a3b8" />
      {/* Indicator line pointer */}
      <line x1="45" y1="45" x2="45" y2="33" stroke="#000000" strokeWidth="2.5" />

      <text x="45" y="94" fill="#facc15" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="monospace">10KΩ B</text>
    </svg>
  );
};

// Realistic 9V Alkaline Battery
export const RealisticBattery9V: React.FC<{
  comp: CircuitComponent;
}> = () => {
  return (
    <svg width="100" height="150" viewBox="0 0 100 150" className="filter drop-shadow-xl select-none">
      <defs>
        <linearGradient id="batteryGold" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="40%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      {/* Snap Terminals on Top */}
      {/* Circular Positive Terminal (+) */}
      <circle cx="35" cy="10" r="7" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
      <text x="35" y="13" fill="#ef4444" fontSize="9" fontWeight="extrabold" textAnchor="middle">+</text>

      {/* Hexagonal Negative Terminal (-) */}
      <polygon points="65,3 72,7 72,15 65,19 58,15 58,7" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
      <text x="65" y="13" fill="#0f172a" fontSize="10" fontWeight="extrabold" textAnchor="middle">-</text>

      {/* Rectangular Battery Body */}
      <rect x="12" y="20" width="76" height="122" rx="6" fill="#0f172a" stroke="#d97706" strokeWidth="1.5" />
      
      {/* Gold Upper Label Foil */}
      <path d="M 12 26 C 12 22 16 20 20 20 L 80 20 C 84 20 88 22 88 26 L 88 65 L 12 65 Z" fill="url(#batteryGold)" />
      <text x="50" y="44" fill="#0f172a" fontSize="14" fontWeight="black" textAnchor="middle" fontFamily="sans-serif">9V</text>
      <text x="50" y="56" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">ALKALINE</text>

      <text x="50" y="90" fill="#f59e0b" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">6F22 HEAVY DUTY</text>
      <text x="50" y="125" fill="#94a3b8" fontSize="6.5" textAnchor="middle" fontFamily="monospace">POWER SOURCE</text>
    </svg>
  );
};

// Realistic 16x2 Character LCD Display (with I2C Backpack)
export const RealisticLCD1602: React.FC<{
  comp: CircuitComponent;
  isSimulating: boolean;
}> = ({ isSimulating }) => {
  return (
    <svg width="240" height="90" viewBox="0 0 240 90" className="filter drop-shadow-xl select-none">
      <rect x="8" y="8" width="224" height="74" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
      <rect x="22" y="18" width="196" height="54" rx="2" fill="#065f46" stroke="#047857" strokeWidth="1" />
      {isSimulating ? (
        <>
          <text x="32" y="38" fill="#6ee7b7" fontSize="12" fontWeight="bold" fontFamily="monospace">
            Dr.Smart Mechatronics
          </text>
          <text x="32" y="56" fill="#6ee7b7" fontSize="11" fontWeight="bold" fontFamily="monospace">
            Lab OK: V=12.00V
          </text>
        </>
      ) : (
        <text x="120" y="48" fill="#047857" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
          [STANDBY MODE]
        </text>
      )}
      <circle cx="14" cy="14" r="2.5" fill="#022c22" stroke="#10b981" />
      <circle cx="226" cy="14" r="2.5" fill="#022c22" stroke="#10b981" />
      <circle cx="14" cy="76" r="2.5" fill="#022c22" stroke="#10b981" />
      <circle cx="226" cy="76" r="2.5" fill="#022c22" stroke="#10b981" />
    </svg>
  );
};

// Realistic Benchtop Fluke 115 Multimeter
export const RealisticFlukeMultimeter: React.FC<{
  voltage: number;
  mode?: string;
}> = ({ voltage }) => {
  return (
    <svg width="150" height="210" viewBox="0 0 150 210" className="filter drop-shadow-2xl select-none">
      <defs>
        <linearGradient id="flukeYellow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#facc15" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>
        <linearGradient id="flukeLcd" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#d1d5db" />
          <stop offset="100%" stopColor="#9ca3af" />
        </linearGradient>
      </defs>

      {/* Ergonomic Yellow Rubber Holster Body */}
      <rect x="10" y="8" width="130" height="194" rx="20" fill="url(#flukeYellow)" stroke="#a16207" strokeWidth="2" />
      <rect x="18" y="14" width="114" height="182" rx="14" fill="#1e293b" />

      {/* Brand Header */}
      <text x="32" y="28" fill="#facc15" fontSize="8" fontWeight="black" fontFamily="sans-serif">FLUKE</text>
      <text x="65" y="28" fill="#f8fafc" fontSize="6.5" fontWeight="bold" fontFamily="monospace">115 TRUE RMS</text>

      {/* Digital LCD Display with Green-Grey Backlight */}
      <rect x="24" y="34" width="102" height="48" rx="4" fill="url(#flukeLcd)" stroke="#475569" strokeWidth="1" />
      <text x="30" y="46" fill="#111827" fontSize="7" fontWeight="bold" fontFamily="monospace">DC</text>
      {/* Big Digits Display */}
      <text x="75" y="68" fill="#0f172a" fontSize="24" fontWeight="black" textAnchor="middle" fontFamily="monospace">
        {voltage.toFixed(2)}
      </text>
      <text x="116" y="68" fill="#0f172a" fontSize="14" fontWeight="bold" textAnchor="end" fontFamily="sans-serif">V</text>

      {/* Rotary Selector Dial */}
      <circle cx="75" cy="120" r="28" fill="#0f172a" stroke="#475569" strokeWidth="2" />
      <circle cx="75" cy="120" r="22" fill="#1e293b" />
      {/* Knob Pointer */}
      <rect x="73" y="98" width="4" height="18" fill="#facc15" rx="1" />

      {/* Function Labels around Dial */}
      <text x="75" y="89" fill="#facc15" fontSize="6" fontWeight="bold" textAnchor="middle">OFF</text>
      <text x="108" y="105" fill="#f8fafc" fontSize="6" fontWeight="bold">V~</text>
      <text x="112" y="124" fill="#f8fafc" fontSize="6" fontWeight="bold">V=</text>
      <text x="105" y="142" fill="#facc15" fontSize="6" fontWeight="bold">Ω</text>
      <text x="42" y="138" fill="#f8fafc" fontSize="6" fontWeight="bold">A</text>

      {/* Input Jack Terminals at Bottom */}
      <circle cx="42" cy="172" r="7" fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />
      <circle cx="42" cy="172" r="3.5" fill="#0f172a" />
      <text x="42" y="162" fill="#f8fafc" fontSize="5" fontWeight="bold" textAnchor="middle">A</text>

      <circle cx="75" cy="172" r="7" fill="#1e293b" stroke="#000000" strokeWidth="2" />
      <circle cx="75" cy="172" r="3.5" fill="#000000" />
      <text x="75" y="162" fill="#f8fafc" fontSize="5" fontWeight="bold" textAnchor="middle">COM</text>

      <circle cx="108" cy="172" r="7" fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />
      <circle cx="108" cy="172" r="3.5" fill="#0f172a" />
      <text x="108" y="162" fill="#f8fafc" fontSize="5" fontWeight="bold" textAnchor="middle">VΩ</text>
    </svg>
  );
};

// Realistic Benchtop DC Power Supply with Dual 7-Segment Displays
export const RealisticDCPowerSupply: React.FC<{
  voltage: number;
  current: number;
}> = ({ voltage, current }) => {
  return (
    <svg width="220" height="210" viewBox="0 0 220 210" className="filter drop-shadow-2xl select-none">
      <defs>
        <linearGradient id="caseMetal" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
      </defs>

      {/* Metal Enclosure Chassis */}
      <rect x="8" y="8" width="204" height="194" rx="10" fill="url(#caseMetal)" stroke="#64748b" strokeWidth="2" />
      <rect x="16" y="16" width="188" height="178" rx="6" fill="#1e293b" />

      {/* Model Title */}
      <text x="110" y="34" fill="#f8fafc" fontSize="10" fontWeight="extrabold" textAnchor="middle" fontFamily="sans-serif">
        DC POWER SUPPLY
      </text>

      {/* Dual Red 7-Segment Displays */}
      {/* Voltage Display */}
      <rect x="28" y="44" width="76" height="42" rx="3" fill="#000000" stroke="#334155" strokeWidth="1.5" />
      <text x="66" y="75" fill="#ef4444" fontSize="22" fontWeight="black" textAnchor="middle" fontFamily="monospace" filter="drop-shadow(0 0 4px #ef4444)">
        {voltage.toFixed(1)} <tspan fontSize="12">V</tspan>
      </text>
      <text x="66" y="98" fill="#94a3b8" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">VOLTAGE</text>

      {/* Current Display */}
      <rect x="116" y="44" width="76" height="42" rx="3" fill="#000000" stroke="#334155" strokeWidth="1.5" />
      <text x="154" y="75" fill="#ef4444" fontSize="22" fontWeight="black" textAnchor="middle" fontFamily="monospace" filter="drop-shadow(0 0 4px #ef4444)">
        {current.toFixed(2)} <tspan fontSize="12">A</tspan>
      </text>
      <text x="154" y="98" fill="#94a3b8" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">CURRENT</text>

      {/* Voltage & Current Knobs */}
      <circle cx="66" cy="130" r="15" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
      <circle cx="66" cy="130" r="10" fill="#94a3b8" />
      <line x1="66" y1="130" x2="66" y2="118" stroke="#000000" strokeWidth="2" />
      <text x="45" y="152" fill="#64748b" fontSize="6">MIN</text>
      <text x="80" y="152" fill="#64748b" fontSize="6">MAX</text>

      <circle cx="154" cy="130" r="15" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
      <circle cx="154" cy="130" r="10" fill="#94a3b8" />
      <line x1="154" y1="130" x2="154" y2="118" stroke="#000000" strokeWidth="2" />
      <text x="133" y="152" fill="#64748b" fontSize="6">MIN</text>
      <text x="168" y="152" fill="#64748b" fontSize="6">MAX</text>

      {/* Power Button (Green illuminated) */}
      <circle cx="42" cy="176" r="9" fill="#15803d" stroke="#22c55e" strokeWidth="2" filter="drop-shadow(0 0 3px #22c55e)" />
      <circle cx="42" cy="176" r="4" fill="#22c55e" />

      {/* Output Banana Binding Posts (+ Red, GND Green, - Black) */}
      {/* Red Post (+) */}
      <circle cx="110" cy="176" r="8" fill="#dc2626" stroke="#f87171" strokeWidth="1.5" />
      <circle cx="110" cy="176" r="3.5" fill="#000000" />
      <text x="110" y="164" fill="#ef4444" fontSize="8" fontWeight="bold" textAnchor="middle">+</text>

      {/* Black Post (-) */}
      <circle cx="158" cy="176" r="8" fill="#0f172a" stroke="#475569" strokeWidth="2" />
      <circle cx="158" cy="176" r="3.5" fill="#000000" />
      <text x="158" y="164" fill="#cbd5e1" fontSize="9" fontWeight="bold" textAnchor="middle">-</text>
    </svg>
  );
};

// Realistic Rigol DS1104Z Digital Storage Oscilloscope
export const RealisticRigolOscilloscope: React.FC<{
  frequency?: number;
  isSimulating: boolean;
}> = ({ frequency = 50, isSimulating }) => {
  return (
    <svg width="340" height="210" viewBox="0 0 340 210" className="filter drop-shadow-2xl select-none">
      <defs>
        <linearGradient id="scopeBezel" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="60%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>

      {/* Laboratory Instrument Case */}
      <rect x="8" y="8" width="324" height="194" rx="12" fill="url(#scopeBezel)" stroke="#64748b" strokeWidth="2" />
      <rect x="14" y="14" width="312" height="182" rx="8" fill="#f1f5f9" />

      {/* Branding */}
      <rect x="22" y="20" width="34" height="12" fill="#eab308" rx="2" />
      <text x="39" y="29" fill="#000000" fontSize="7.5" fontWeight="black" textAnchor="middle">RIGOL</text>
      <text x="96" y="29" fill="#0f172a" fontSize="8" fontWeight="extrabold" fontFamily="sans-serif">DS1104Z</text>
      <text x="155" y="29" fill="#475569" fontSize="6.5" fontStyle="italic">UltraVision</text>

      {/* Color LCD Scope Display */}
      <rect x="22" y="36" width="180" height="126" rx="4" fill="#090d16" stroke="#334155" strokeWidth="1.5" />
      
      {/* Graticule 8x10 Grid */}
      {Array.from({ length: 9 }).map((_, i) => (
        <line key={`v_${i}`} x1={22 + (i + 1) * 18} y1="36" x2={22 + (i + 1) * 18} y2="162" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="2 2" />
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <line key={`h_${i}`} x1="22" y1={36 + (i + 1) * 15.7} x2="202" y2={36 + (i + 1) * 15.7} stroke="#1e293b" strokeWidth="0.8" strokeDasharray="2 2" />
      ))}

      {/* Channel Waveforms */}
      {isSimulating ? (
        <>
          {/* CH1 (Yellow Sine Wave) */}
          <path
            d="M 24 99 Q 45 45 65 99 T 105 99 T 145 99 T 185 99 T 202 99"
            fill="none"
            stroke="#facc15"
            strokeWidth="2.5"
            filter="drop-shadow(0 0 3px #facc15)"
          />
          {/* CH2 (Cyan Pulse/Square Wave) */}
          <path
            d="M 24 135 L 45 135 L 45 115 L 75 115 L 75 135 L 105 135 L 105 115 L 135 115 L 135 135 L 165 135 L 165 115 L 195 115 L 195 135 L 202 135"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            filter="drop-shadow(0 0 3px #38bdf8)"
          />
        </>
      ) : (
        <line x1="24" y1="99" x2="200" y2="99" stroke="#64748b" strokeWidth="1.5" />
      )}

      {/* Scope Onscreen OSD Status */}
      <rect x="26" y="40" width="30" height="10" rx="2" fill="#ca8a04" />
      <text x="41" y="47" fill="#000000" fontSize="6" fontWeight="bold" textAnchor="middle">CH1 2.00V</text>
      <rect x="60" y="40" width="30" height="10" rx="2" fill="#0284c7" />
      <text x="75" y="47" fill="#ffffff" fontSize="6" fontWeight="bold" textAnchor="middle">CH2 5.00V</text>
      <text x="180" y="47" fill="#22c55e" fontSize="6.5" fontWeight="bold" textAnchor="middle">T: 10.0ms</text>

      {/* Run/Stop Button */}
      <rect x="285" y="24" width="32" height="16" rx="4" fill={isSimulating ? '#22c55e' : '#ef4444'} stroke="#15803d" />
      <text x="301" y="35" fill="#ffffff" fontSize="6.5" fontWeight="extrabold" textAnchor="middle">RUN/STOP</text>

      {/* Auto Button */}
      <rect x="285" y="45" width="32" height="15" rx="3" fill="#e2e8f0" stroke="#94a3b8" />
      <text x="301" y="55" fill="#0f172a" fontSize="6.5" fontWeight="bold" textAnchor="middle">AUTO</text>

      {/* Control Encoders (Horizontal / Vertical / Trigger) */}
      <circle cx="235" cy="50" r="10" fill="#94a3b8" stroke="#475569" />
      <circle cx="265" cy="50" r="10" fill="#94a3b8" stroke="#475569" />

      {/* Channel Selector Buttons CH1 (Yellow), CH2 (Cyan) */}
      <circle cx="235" cy="85" r="7" fill="#facc15" stroke="#ca8a04" />
      <text x="235" y="88" fill="#000000" fontSize="5.5" fontWeight="bold" textAnchor="middle">CH1</text>
      <circle cx="265" cy="85" r="7" fill="#38bdf8" stroke="#0284c7" />
      <text x="265" y="88" fill="#000000" fontSize="5.5" fontWeight="bold" textAnchor="middle">CH2</text>

      {/* BNC Inputs at Bottom */}
      <circle cx="235" cy="155" r="9" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
      <circle cx="235" cy="155" r="4.5" fill="#0f172a" />
      <text x="235" y="172" fill="#ca8a04" fontSize="5.5" fontWeight="bold" textAnchor="middle">CH1</text>

      <circle cx="265" cy="155" r="9" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
      <circle cx="265" cy="155" r="4.5" fill="#0f172a" />
      <text x="265" y="172" fill="#0284c7" fontSize="5.5" fontWeight="bold" textAnchor="middle">CH2</text>

      <circle cx="295" cy="155" r="9" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
      <circle cx="295" cy="155" r="4.5" fill="#0f172a" />
      <text x="295" y="172" fill="#64748b" fontSize="5.5" fontWeight="bold" textAnchor="middle">EXT TRIG</text>
    </svg>
  );
};

/* =========================================================================
   2. Master Dispatchers (Interactive Model & Library Preview)
   ========================================================================= */

// Renders the realistic interactive component on the canvas
export const renderRealisticInteractiveComponent = (
  comp: CircuitComponent,
  isSimulating: boolean
): React.ReactNode => {
  switch (comp.type) {
    case 'arduino':
      if (comp.name.includes('ESP32')) {
        return <RealisticESP32 comp={comp} isSimulating={isSimulating} />;
      }
      if (comp.name.includes('Breadboard')) {
        return <RealisticBreadboard comp={comp} />;
      }
      return <RealisticArduinoUno comp={comp} isSimulating={isSimulating} />;

    case 'resistor':
      if (comp.name.includes('Potentiometer')) {
        return <RealisticPotentiometer comp={comp} />;
      }
      return <RealisticResistor comp={comp} />;

    case 'capacitor':
      return <RealisticCapacitor comp={comp} />;

    case 'transistor':
      return <RealisticTransistor comp={comp} />;

    case 'led':
      if (comp.name.includes('Buzzer')) {
        return <RealisticLED comp={comp} isSimulating={isSimulating} />;
      }
      return <RealisticLED comp={comp} isSimulating={isSimulating} />;

    case 'servo':
      return <RealisticServoMotor comp={comp} isSimulating={isSimulating} />;

    case 'motor':
      return <RealisticDCMotor comp={comp} isSimulating={isSimulating} />;

    case 'sensor_ultrasonic':
      return <RealisticHCSR04 comp={comp} />;

    case 'switch':
      return <RealisticPushbutton comp={comp} isSimulating={isSimulating} />;

    case 'lcd':
      return <RealisticLCD1602 comp={comp} isSimulating={isSimulating} />;

    case 'dc_source':
      if (comp.name.includes('Battery')) {
        return <RealisticBattery9V comp={comp} />;
      }
      return <RealisticDCPowerSupply voltage={comp.value || 12} current={0.5} />;

    case 'meter':
      return <RealisticFlukeMultimeter voltage={comp.value || 12.0} />;

    default:
      return <RealisticResistor comp={comp} />;
  }
};

// Renders realistic 3D thumbnail for the library picking sidebar
export const renderRealisticThumbnail = (type: string, name: string): React.ReactNode => {
  const dummyComp: CircuitComponent = {
    id: 'thumb',
    name,
    type: type as any,
    label: '',
    value: 220,
    unit: 'Ω',
    x: 0,
    y: 0,
    rotation: 0,
    pins: [],
  };

  return (
    <div className="w-16 h-12 flex items-center justify-center overflow-hidden shrink-0">
      <div className="scale-[0.38] origin-center">
        {renderRealisticInteractiveComponent(dummyComp, true)}
      </div>
    </div>
  );
};

