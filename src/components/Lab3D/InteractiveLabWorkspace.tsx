import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Zap, Play, Square, RotateCcw, Plus, Trash2, Eye,
  Sparkles, Layers, Sliders, Activity, Shield, Box, Bot,
  AlertTriangle, CheckCircle2, Move, Copy, RotateCw,
  ZoomIn, ZoomOut, MousePointer, Grid, Settings, X,
  Palette, Scissors, Wrench, Check, HelpCircle
} from 'lucide-react';
import { CircuitComponent, WireConnection } from '../../types';
import {
  renderRealisticInteractiveComponent,
  renderRealisticThumbnail,
  RealisticFlukeMultimeter,
  RealisticDCPowerSupply,
  RealisticRigolOscilloscope
} from './RealisticComponentRenders';

export interface LibraryItem {
  id: string;
  type: string;
  name: string;
  category: 'passives' | 'mcu' | 'motors' | 'sensors' | 'displays' | 'power';
  defaultVal: number;
  unit: string;
  color?: string;
  pins: { id: string; name: string; x: number; y: number }[];
  description: string;
}

const MECHATRONICS_LIBRARY: LibraryItem[] = [
  // ⚡ Passives & Basic Semiconductors
  {
    id: 'resistor',
    type: 'resistor',
    name: 'مقاومة كربونية Resistor 220Ω',
    category: 'passives',
    defaultVal: 220,
    unit: 'Ω',
    pins: [
      { id: 'p1', name: 'طرف 1 (Lead A)', x: 12, y: 22 },
      { id: 'p2', name: 'طرف 2 (Lead B)', x: 138, y: 22 },
    ],
    description: 'مقاومة كربونية بألوان قياسية EIA لحماية الليدات وتحديد التيار.',
  },
  {
    id: 'potentiometer',
    type: 'resistor',
    name: 'مقاومة متغيرة Potentiometer 10k',
    category: 'passives',
    defaultVal: 10,
    unit: 'kΩ',
    pins: [
      { id: 'vcc', name: 'طرف 1 (+5V)', x: 22, y: 95 },
      { id: 'wiper', name: 'المسّاح Wiper (Signal)', x: 45, y: 95 },
      { id: 'gnd', name: 'طرف 3 (GND)', x: 68, y: 95 },
    ],
    description: 'مقاومة دوارة لتغيير الجهد والمحاكاة التناظرية Analog.',
  },
  {
    id: 'capacitor',
    type: 'capacitor',
    name: 'مكثف كيميائي Electrolytic 100µF',
    category: 'passives',
    defaultVal: 100,
    unit: 'uF',
    pins: [
      { id: 'p1', name: '+ القطب الموجب (Anode)', x: 26, y: 82 },
      { id: 'p2', name: '- القطب السالب (Cathode)', x: 44, y: 76 },
    ],
    description: 'مكثف أسطواني بقطبية سالبة لتنعيم وتخزين الشحنات.',
  },
  {
    id: 'transistor_npn',
    type: 'transistor',
    name: 'ترانزستور NPN BJT 2N2222',
    category: 'passives',
    defaultVal: 1,
    unit: 'x',
    pins: [
      { id: 'e', name: 'باعث Emitter (E)', x: 25, y: 85 },
      { id: 'b', name: 'قاعدة Base (B)', x: 40, y: 85 },
      { id: 'c', name: 'مجمع Collector (C)', x: 55, y: 85 },
    ],
    description: 'ترانزستور في كبسولة TO-92 للتبديل والتكبير الإلكتروني.',
  },
  {
    id: 'led_red',
    type: 'led',
    name: 'دايود ضوئي LED أحمر 5mm',
    category: 'passives',
    defaultVal: 2.1,
    unit: 'V',
    color: '#ef4444',
    pins: [
      { id: 'p1', name: 'الموجب Anode (+)', x: 30, y: 88 },
      { id: 'p2', name: 'السالب Cathode (-)', x: 42, y: 80 },
    ],
    description: 'ليد أحمر عالي السطوع بعدسة دائرية وقاطع الكاثود المسطح.',
  },
  {
    id: 'led_green',
    type: 'led',
    name: 'دايود ضوئي LED أخضر 5mm',
    category: 'passives',
    defaultVal: 2.2,
    unit: 'V',
    color: '#22c55e',
    pins: [
      { id: 'p1', name: 'الموجب Anode (+)', x: 30, y: 88 },
      { id: 'p2', name: 'السالب Cathode (-)', x: 42, y: 80 },
    ],
    description: 'ليد أخضر للإشارات والبيانات الضوئية.',
  },
  {
    id: 'led_yellow',
    type: 'led',
    name: 'دايود ضوئي LED أصفر 5mm',
    category: 'passives',
    defaultVal: 2.0,
    unit: 'V',
    color: '#eab308',
    pins: [
      { id: 'p1', name: 'الموجب Anode (+)', x: 30, y: 88 },
      { id: 'p2', name: 'السالب Cathode (-)', x: 42, y: 80 },
    ],
    description: 'ليد أصفر للتنبيهات والمحاكاة التفاعلية.',
  },
  {
    id: 'led_blue',
    type: 'led',
    name: 'دايود ضوئي LED أزرق 5mm',
    category: 'passives',
    defaultVal: 3.0,
    unit: 'V',
    color: '#3b82f6',
    pins: [
      { id: 'p1', name: 'الموجب Anode (+)', x: 30, y: 88 },
      { id: 'p2', name: 'السالب Cathode (-)', x: 42, y: 80 },
    ],
    description: 'ليد أزرق نقي عالي الكفاءة الضوئية.',
  },
  {
    id: 'switch',
    type: 'switch',
    name: 'مفتاح ضاغط Tactile Pushbutton',
    category: 'passives',
    defaultVal: 1,
    unit: 'state',
    pins: [
      { id: 'sw1', name: 'منفذ A1', x: 8, y: 20 },
      { id: 'sw2', name: 'منفذ A2', x: 8, y: 60 },
      { id: 'sw3', name: 'منفذ B1', x: 72, y: 20 },
      { id: 'sw4', name: 'منفذ B2', x: 72, y: 60 },
    ],
    description: 'زر ضاغط مربع ذو غطاء معدني و 4 أرجل تثبيت.',
  },

  // 🧠 MCU Development Boards & Breadboards
  {
    id: 'breadboard',
    type: 'arduino',
    name: 'لوحة تجارب Breadboard 400-Point',
    category: 'mcu',
    defaultVal: 400,
    unit: 'pins',
    pins: [
      { id: 'rail_pos_1', name: 'خط الطاقة (+) العلوي [أحمر]', x: 26, y: 17 },
      { id: 'rail_neg_1', name: 'خط الأرضي (-) العلوي [أزرق]', x: 26, y: 33 },
      { id: 'rail_pos_mid', name: 'خط الطاقة (+) العلوي [منتصف]', x: 130, y: 17 },
      { id: 'rail_neg_mid', name: 'خط الأرضي (-) العلوي [منتصف]', x: 130, y: 33 },
      { id: 'rail_pos_end', name: 'خط الطاقة (+) العلوي [طرف]', x: 235, y: 17 },
      { id: 'rail_neg_end', name: 'خط الأرضي (-) العلوي [طرف]', x: 235, y: 33 },
      { id: 'rail_pos_2', name: 'خط الطاقة (+) السفلي [أحمر]', x: 26, y: 115 },
      { id: 'rail_neg_2', name: 'خط الأرضي (-) السفلي [أزرق]', x: 26, y: 131 },
      { id: 'rail_pos_2_mid', name: 'خط الطاقة (+) السفلي [منتصف]', x: 130, y: 115 },
      { id: 'rail_neg_2_mid', name: 'خط الأرضي (-) السفلي [منتصف]', x: 130, y: 131 },
      { id: 'tie_1', name: 'مقبس صف A-E (عمود 1)', x: 26, y: 55 },
      { id: 'tie_2', name: 'مقبس صف F-J (عمود 1)', x: 26, y: 92 },
      { id: 'tie_5', name: 'مقبس صف A-E (عمود 5)', x: 64, y: 55 },
      { id: 'tie_6', name: 'مقبس صف F-J (عمود 5)', x: 64, y: 92 },
      { id: 'tie_10', name: 'مقبس صف A-E (عمود 10)', x: 111, y: 55 },
      { id: 'tie_11', name: 'مقبس صف F-J (عمود 10)', x: 111, y: 92 },
      { id: 'tie_15', name: 'مقبس صف A-E (عمود 15)', x: 159, y: 55 },
      { id: 'tie_16', name: 'مقبس صف F-J (عمود 15)', x: 159, y: 92 },
      { id: 'tie_20', name: 'مقبس صف A-E (عمود 20)', x: 206, y: 55 },
      { id: 'tie_21', name: 'مقبس صف F-J (عمود 20)', x: 206, y: 92 },
    ],
    description: 'لوحة تجارب بيضاء واقعية مع ممرات الطاقة ومقابس الربط لتوصيل الدوائر دون لحام.',
  },
  {
    id: 'arduino',
    type: 'arduino',
    name: 'لوحة أردوينو Arduino UNO R3',
    category: 'mcu',
    defaultVal: 5,
    unit: 'V',
    pins: [
      { id: 'pin5v', name: 'منفذ الطاقة 5V Power', x: 76, y: 138 },
      { id: 'gnd_pwr', name: 'منفذ الأرضي GND Power', x: 92, y: 138 },
      { id: 'pinA0', name: 'مدخل تناظري A0 Analog', x: 142, y: 138 },
      { id: 'pinA1', name: 'مدخل تناظري A1 Analog', x: 152, y: 138 },
      { id: 'pin13', name: 'منفذ رقمي D13 (LED)', x: 110, y: 16 },
      { id: 'pin11', name: 'منفذ رقمي D11 (PWM)', x: 128, y: 16 },
      { id: 'pin9', name: 'منفذ رقمي D9 (PWM)', x: 145, y: 16 },
      { id: 'gnd_dig', name: 'أرضي GND Digital', x: 92, y: 16 },
    ],
    description: 'لوحة تحكم إلكترونية مبرمجة بلغة C++ مع مخرج USB ومتحكم ATmega328P.',
  },
  {
    id: 'esp32',
    type: 'arduino',
    name: 'لوحة واي فاي ESP32 NodeMCU',
    category: 'mcu',
    defaultVal: 3.3,
    unit: 'V',
    pins: [
      { id: 'v33', name: '3.3V Power Out', x: 24, y: 11 },
      { id: 'gnd', name: 'GND الأرضي', x: 44, y: 11 },
      { id: 'gpio2', name: 'GPIO 2 (LED)', x: 64, y: 11 },
      { id: 'gpio4', name: 'GPIO 4', x: 84, y: 11 },
      { id: 'gpio18', name: 'GPIO 18 (VSPI SCK)', x: 124, y: 11 },
    ],
    description: 'معالج ثنائي النواة عالي السرعة يدعم الاتصال اللاسلكي وتطبيقات IoT.',
  },

  // ⚙️ Actuators & Motors
  {
    id: 'servo',
    type: 'servo',
    name: 'محرك سيرفو دقيق SG90 9g',
    category: 'motors',
    defaultVal: 90,
    unit: '°',
    pins: [
      { id: 'gnd', name: 'بني (GND الأرضي)', x: 5, y: 95 },
      { id: 'vcc', name: 'أحمر (VCC +5V)', x: 5, y: 98 },
      { id: 'sig', name: 'برتقالي (Signal PWM)', x: 5, y: 101 },
    ],
    description: 'سيرفو محرك بغلاف بولي كربونات أزرق وذراع نايلون أبيض.',
  },
  {
    id: 'dc_motor',
    type: 'motor',
    name: 'محرك تيار مستمر DC Motor 12V',
    category: 'motors',
    defaultVal: 12,
    unit: 'V',
    pins: [
      { id: 'm_plus', name: 'الطرف الموجب (+ أحمر)', x: 8, y: 34 },
      { id: 'm_minus', name: 'الطرف السالب (- أسود)', x: 8, y: 56 },
    ],
    description: 'محرك أسطواني معدني لتوليد الحركة الميكانيكية الدورانية.',
  },

  // 📡 Sensors & Transducers
  {
    id: 'ultrasonic',
    type: 'sensor_ultrasonic',
    name: 'حساس المسافة بالموجات HC-SR04',
    category: 'sensors',
    defaultVal: 25,
    unit: 'cm',
    pins: [
      { id: 'vcc', name: 'VCC (+5V)', x: 68, y: 72 },
      { id: 'trig', name: 'Trig (إرسال النبضة)', x: 80, y: 72 },
      { id: 'echo', name: 'Echo (صدى الاستقبال)', x: 92, y: 72 },
      { id: 'gnd', name: 'GND (أرضي)', x: 102, y: 72 },
    ],
    description: 'حساس مزود بعينين أسطوانيتين من الألمنيوم لقياس المسافة بدقة.',
  },

  // 📺 Displays & Indicators
  {
    id: 'lcd',
    type: 'lcd',
    name: 'شاشة نصية LCD 16x2 مع I2C',
    category: 'displays',
    defaultVal: 16,
    unit: 'cols',
    pins: [
      { id: 'vcc', name: 'VCC (+5V)', x: 20, y: 45 },
      { id: 'gnd', name: 'GND (أرضي)', x: 20, y: 65 },
      { id: 'sda', name: 'SDA (بيانات)', x: 220, y: 45 },
      { id: 'scl', name: 'SCL (تزامن)', x: 220, y: 65 },
    ],
    description: 'شاشة كرستالية خلفية خضراء لعرض القيم والنصوص الهندسية.',
  },

  // 🔋 Power & Test Gear
  {
    id: 'battery9v',
    type: 'dc_source',
    name: 'بطارية جافة 9V Battery',
    category: 'power',
    defaultVal: 9,
    unit: 'V',
    pins: [
      { id: 'b_plus', name: '+ القطب الموجب (دائري)', x: 35, y: 10 },
      { id: 'b_minus', name: '- القطب السالب (سداسي)', x: 65, y: 10 },
    ],
    description: 'بطارية قلوية مستطيلة ذات أطراف كبس لتغذية المشاريع.',
  },
];

export const InteractiveLabWorkspace: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Electrical Bench Instrument Measurements (matching user reference image)
  const [benchVoltage, setBenchVoltage] = useState(12.0);
  const [benchCurrent, setBenchCurrent] = useState(0.50);
  const [benchResistance, setBenchResistance] = useState(24.0);

  // Placed Realistic Components on the Workbench
  const [components, setComponents] = useState<CircuitComponent[]>([
    {
      id: 'comp_bb_1',
      name: 'لوحة تجارب Breadboard 400-Point',
      type: 'arduino',
      label: 'Breadboard-1',
      value: 400,
      unit: 'pins',
      x: 320,
      y: 120,
      rotation: 0,
      pins: [
        { id: 'rail_pos_1', name: 'خط الطاقة (+) العلوي', x: 26, y: 17 },
        { id: 'rail_neg_1', name: 'خط الأرضي (-) العلوي', x: 26, y: 33 },
        { id: 'rail_pos_2', name: 'خط الطاقة (+) السفلي', x: 26, y: 115 },
        { id: 'rail_neg_2', name: 'خط الأرضي (-) السفلي', x: 26, y: 131 },
        { id: 'tie_1', name: 'Node 1 (A-E)', x: 95, y: 55 },
        { id: 'tie_2', name: 'Node 2 (A-E)', x: 125, y: 55 },
        { id: 'tie_3', name: 'Node 3 (A-E)', x: 155, y: 55 },
        { id: 'tie_sw', name: 'Node SW (F-J)', x: 185, y: 92 },
      ],
    },
    {
      id: 'comp_led_red',
      name: 'دايود ضوئي LED أحمر 5mm',
      type: 'led',
      label: 'LED-Red',
      value: 2.1,
      unit: 'V',
      color: '#ef4444',
      x: 385,
      y: 70,
      rotation: 0,
      pins: [
        { id: 'p1', name: 'Anode (+)', x: 30, y: 88 },
        { id: 'p2', name: 'Cathode (-)', x: 42, y: 80 },
      ],
      state: { isOn: true },
    },
    {
      id: 'comp_led_green',
      name: 'دايود ضوئي LED أخضر 5mm',
      type: 'led',
      label: 'LED-Green',
      value: 2.2,
      unit: 'V',
      color: '#22c55e',
      x: 440,
      y: 70,
      rotation: 0,
      pins: [
        { id: 'p1', name: 'Anode (+)', x: 30, y: 88 },
        { id: 'p2', name: 'Cathode (-)', x: 42, y: 80 },
      ],
      state: { isOn: true },
    },
    {
      id: 'comp_led_yellow',
      name: 'دايود ضوئي LED أصفر 5mm',
      type: 'led',
      label: 'LED-Yellow',
      value: 2.0,
      unit: 'V',
      color: '#eab308',
      x: 495,
      y: 70,
      rotation: 0,
      pins: [
        { id: 'p1', name: 'Anode (+)', x: 30, y: 88 },
        { id: 'p2', name: 'Cathode (-)', x: 42, y: 80 },
      ],
      state: { isOn: true },
    },
    {
      id: 'comp_res_1',
      name: 'مقاومة كربونية Resistor 220Ω',
      type: 'resistor',
      label: 'R1',
      value: 220,
      unit: 'Ω',
      x: 380,
      y: 160,
      rotation: 0,
      pins: [
        { id: 'p1', name: 'Lead 1', x: 12, y: 22 },
        { id: 'p2', name: 'Lead 2', x: 138, y: 22 },
      ],
    },
    {
      id: 'comp_sw_1',
      name: 'مفتاح ضاغط Tactile Pushbutton',
      type: 'switch',
      label: 'Push-SW',
      value: 1,
      unit: 'state',
      x: 520,
      y: 175,
      rotation: 0,
      pins: [
        { id: 'sw1', name: 'Terminal A', x: 8, y: 20 },
        { id: 'sw2', name: 'Terminal B', x: 72, y: 60 },
      ],
      state: { isOn: true },
    },
  ]);

  // Jumper Wires connecting components (matching user reference image)
  const [wires, setWires] = useState<WireConnection[]>([
    {
      id: 'w_blue_1',
      fromCompId: 'comp_bb_1',
      fromPinId: 'rail_pos_1',
      toCompId: 'comp_res_1',
      toPinId: 'p1',
      color: '#3b82f6',
    },
    {
      id: 'w_green_1',
      fromCompId: 'comp_res_1',
      fromPinId: 'p2',
      toCompId: 'comp_led_green',
      toPinId: 'p1',
      color: '#22c55e',
    },
    {
      id: 'w_black_1',
      fromCompId: 'comp_led_yellow',
      fromPinId: 'p2',
      toCompId: 'comp_sw_1',
      toPinId: 'sw1',
      color: '#0f172a',
    },
    {
      id: 'w_red_1',
      fromCompId: 'comp_sw_1',
      fromPinId: 'sw2',
      toCompId: 'comp_bb_1',
      toPinId: 'rail_neg_1',
      color: '#ef4444',
    },
  ]);

  // UI Selection & Wiring States
  const [selectedCompId, setSelectedCompId] = useState<string | null>('comp_led_red');
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [wiringStart, setWiringStart] = useState<{ compId: string; pinId: string } | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredPin, setHoveredPin] = useState<{ compId: string; pinId: string } | null>(null);

  // Settings & Navigation
  const [wireColor, setWireColor] = useState('#3b82f6');
  const [isSimulating, setIsSimulating] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'all' | 'passives' | 'mcu' | 'motors' | 'sensors' | 'displays' | 'power'>('all');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [activeTemplate, setActiveTemplate] = useState<string>('led_circuit');
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [showGridLines, setShowGridLines] = useState<boolean>(true);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState<boolean>(false);

  // Dragging state on canvas
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Update electrical math calculations
  useEffect(() => {
    if (!isSimulating) {
      setBenchCurrent(0);
      setBenchResistance(0);
      return;
    }

    // Check if any switch in circuit is open
    const switches = components.filter((c) => c.type === 'switch');
    const isAnySwitchOpen = switches.some((s) => s.state && s.state.isOn === false);

    if (isAnySwitchOpen) {
      setBenchCurrent(0);
      setBenchResistance(9999);
      return;
    }

    const totalResistance = components
      .filter((c) => c.type === 'resistor')
      .reduce((sum, r) => sum + (r.value || 0), 24);

    const calculatedR = Math.max(1, totalResistance);
    const calculatedI = benchVoltage / calculatedR;

    setBenchResistance(parseFloat(calculatedR.toFixed(2)));
    setBenchCurrent(parseFloat(calculatedI.toFixed(2)));
  }, [benchVoltage, components, isSimulating]);

  // Global Keyboard Shortcuts (Delete, Backspace, Esc, R to rotate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedWireId) {
          handleDeleteWire(selectedWireId);
        } else if (selectedCompId) {
          handleDeleteSelectedComp();
        }
      } else if (e.key === 'Escape') {
        setWiringStart(null);
        setSelectedWireId(null);
      } else if ((e.key === 'r' || e.key === 'R') && selectedCompId) {
        handleRotateComponent(selectedCompId, 90);
      } else if ((e.key === 'd' || e.key === 'D') && selectedCompId) {
        handleDuplicateComponent(selectedCompId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCompId, selectedWireId, components, wires]);

  // Add Component to Workbench (Click or Drop)
  const addComponentToCanvas = useCallback(
    (item: LibraryItem, dropX?: number, dropY?: number) => {
      const count = components.filter((c) => c.name === item.name).length + 1;

      let targetX = dropX ?? (350 + (components.length % 4) * 45);
      let targetY = dropY ?? (130 + (components.length % 3) * 35);

      if (snapToGrid) {
        targetX = Math.round(targetX / 15) * 15;
        targetY = Math.round(targetY / 15) * 15;
      }

      const newComp: CircuitComponent = {
        id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: item.name,
        type: item.type as any,
        label: `${item.id.toUpperCase()}-${count}`,
        value: item.defaultVal,
        unit: item.unit,
        color: item.color,
        x: targetX,
        y: targetY,
        rotation: 0,
        pins: item.pins.map((p) => ({ ...p })),
        state: { isOn: true, angle: 90 },
      };

      setComponents((prev) => [...prev, newComp]);
      setSelectedCompId(newComp.id);
      setSelectedWireId(null);
    },
    [components, snapToGrid]
  );

  // HTML5 Drag and Drop Handlers
  const handleDragStartSidebar = (e: React.DragEvent, item: LibraryItem) => {
    e.dataTransfer.setData('application/mechatronics-comp', item.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOverCanvas = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOverCanvas) setIsDragOverCanvas(true);
  };

  const handleDragLeaveCanvas = () => {
    setIsDragOverCanvas(false);
  };

  const handleDropCanvas = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverCanvas(false);
    const itemId = e.dataTransfer.getData('application/mechatronics-comp');
    if (!itemId || !canvasRef.current) return;

    const targetItem = MECHATRONICS_LIBRARY.find((it) => it.id === itemId);
    if (!targetItem) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left) / zoomLevel;
    const rawY = (e.clientY - rect.top) / zoomLevel;

    addComponentToCanvas(targetItem, Math.max(20, rawX - 60), Math.max(20, rawY - 40));
  };

  // Rotate component
  const handleRotateComponent = (compId: string, deltaAngle: number = 90) => {
    setComponents((prev) =>
      prev.map((c) =>
        c.id === compId ? { ...c, rotation: (c.rotation + deltaAngle + 360) % 360 } : c
      )
    );
  };

  // Set precise rotation angle
  const handleSetComponentRotation = (compId: string, exactAngle: number) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === compId ? { ...c, rotation: exactAngle % 360 } : c))
    );
  };

  // Duplicate component
  const handleDuplicateComponent = (compId: string) => {
    const comp = components.find((c) => c.id === compId);
    if (!comp) return;

    const cloned: CircuitComponent = {
      ...comp,
      id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: `${comp.label}_نسخة`,
      x: comp.x + 40,
      y: comp.y + 30,
    };

    setComponents((prev) => [...prev, cloned]);
    setSelectedCompId(cloned.id);
    setSelectedWireId(null);
  };

  // Toggle switch/pushbutton state
  const handleToggleComponentState = (compId: string) => {
    setComponents((prev) =>
      prev.map((c) => {
        if (c.id === compId) {
          const currentIsOn = c.state?.isOn ?? true;
          return {
            ...c,
            state: { ...c.state, isOn: !currentIsOn },
          };
        }
        return c;
      })
    );
  };

  // Update component color (e.g. for LEDs)
  const handleUpdateComponentColor = (compId: string, newColor: string) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === compId ? { ...c, color: newColor } : c))
    );
  };

  // Update component value
  const handleUpdateComponentValue = (compId: string, newVal: number) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === compId ? { ...c, value: newVal } : c))
    );
  };

  // Pin Wiring handler
  const handlePinClick = (compId: string, pinId: string) => {
    if (!wiringStart) {
      setWiringStart({ compId, pinId });
    } else {
      if (wiringStart.compId === compId && wiringStart.pinId === pinId) {
        // Cancel wiring if clicked on same pin
        setWiringStart(null);
        return;
      }

      // Check if wire between these two already exists
      const wireExists = wires.some(
        (w) =>
          (w.fromCompId === wiringStart.compId &&
            w.fromPinId === wiringStart.pinId &&
            w.toCompId === compId &&
            w.toPinId === pinId) ||
          (w.fromCompId === compId &&
            w.fromPinId === pinId &&
            w.toCompId === wiringStart.compId &&
            w.toPinId === wiringStart.pinId)
      );

      if (!wireExists) {
        const newWire: WireConnection = {
          id: `wire_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          fromCompId: wiringStart.compId,
          fromPinId: wiringStart.pinId,
          toCompId: compId,
          toPinId: pinId,
          color: wireColor,
        };
        setWires((prev) => [...prev, newWire]);
        setSelectedWireId(newWire.id);
      }

      setWiringStart(null);
    }
  };

  // Mouse / Pointer Move on Canvas
  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();

    const canvasX = (e.clientX - rect.left) / zoomLevel;
    const canvasY = (e.clientY - rect.top) / zoomLevel;
    setCursorPos({ x: canvasX, y: canvasY });

    if (!draggingCompId) return;

    let newX = canvasX - dragOffset.x;
    let newY = canvasY - dragOffset.y;

    if (snapToGrid) {
      newX = Math.round(newX / 15) * 15;
      newY = Math.round(newY / 15) * 15;
    }

    newX = Math.max(10, Math.min(1800, newX));
    newY = Math.max(10, Math.min(1100, newY));

    setComponents((prev) =>
      prev.map((c) => (c.id === draggingCompId ? { ...c, x: newX, y: newY } : c))
    );
  };

  // Mouse Down on Component for Dragging
  const handleMouseDownComp = (e: React.MouseEvent, compId: string) => {
    e.stopPropagation();
    setSelectedCompId(compId);
    setSelectedWireId(null);
    setDraggingCompId(compId);

    const comp = components.find((c) => c.id === compId);
    if (comp && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setDragOffset({
        x: (e.clientX - rect.left) / zoomLevel - comp.x,
        y: (e.clientY - rect.top) / zoomLevel - comp.y,
      });
    }
  };

  const handleMouseUpCanvas = () => {
    setDraggingCompId(null);
  };

  // Deletions
  const handleDeleteSelectedComp = () => {
    if (!selectedCompId) return;
    setComponents((prev) => prev.filter((c) => c.id !== selectedCompId));
    setWires((prev) =>
      prev.filter((w) => w.fromCompId !== selectedCompId && w.toCompId !== selectedCompId)
    );
    setSelectedCompId(null);
  };

  const handleDeleteWire = (wireId: string) => {
    setWires((prev) => prev.filter((w) => w.id !== wireId));
    if (selectedWireId === wireId) setSelectedWireId(null);
  };

  // Update Wire Color
  const handleUpdateWireColor = (wireId: string, newColor: string) => {
    setWires((prev) =>
      prev.map((w) => (w.id === wireId ? { ...w, color: newColor } : w))
    );
  };

  // Load Experiment Templates
  const handleLoadTemplate = (templateKey: string) => {
    setActiveTemplate(templateKey);
    setSelectedCompId(null);
    setSelectedWireId(null);
    setWiringStart(null);

    if (templateKey === 'led_circuit') {
      setBenchVoltage(12.0);
      setComponents([
        {
          id: 'bb_led',
          name: 'لوحة تجارب Breadboard 400-Point',
          type: 'arduino',
          label: 'Breadboard',
          value: 400,
          unit: 'pins',
          x: 320,
          y: 120,
          rotation: 0,
          pins: [
            { id: 'p_rail', name: '+ Rail', x: 26, y: 17 },
            { id: 'n_rail', name: '- Rail', x: 26, y: 33 },
          ],
        },
        {
          id: 'led_1',
          name: 'دايود ضوئي LED أحمر 5mm',
          type: 'led',
          label: 'LED-Red',
          value: 2.1,
          unit: 'V',
          color: '#ef4444',
          x: 390,
          y: 70,
          rotation: 0,
          pins: [
            { id: 'p1', name: 'Anode', x: 30, y: 88 },
            { id: 'p2', name: 'Cathode', x: 42, y: 80 },
          ],
          state: { isOn: true },
        },
        {
          id: 'res_1',
          name: 'مقاومة كربونية Resistor 220Ω',
          type: 'resistor',
          label: 'R1',
          value: 220,
          unit: 'Ω',
          x: 380,
          y: 160,
          rotation: 0,
          pins: [
            { id: 'p1', name: 'Lead 1', x: 12, y: 22 },
            { id: 'p2', name: 'Lead 2', x: 138, y: 22 },
          ],
        },
      ]);
      setWires([
        { id: 'w1', fromCompId: 'bb_led', fromPinId: 'p_rail', toCompId: 'res_1', toPinId: 'p1', color: '#3b82f6' },
        { id: 'w2', fromCompId: 'res_1', fromPinId: 'p2', toCompId: 'led_1', toPinId: 'p1', color: '#22c55e' },
      ]);
    } else if (templateKey === 'resistor_circuit') {
      setBenchVoltage(12.0);
      setComponents([
        {
          id: 'bb_res',
          name: 'لوحة تجارب Breadboard 400-Point',
          type: 'arduino',
          label: 'Breadboard',
          value: 400,
          unit: 'pins',
          x: 320,
          y: 120,
          rotation: 0,
          pins: [{ id: 'p_rail', name: '+ Rail', x: 26, y: 17 }],
        },
        {
          id: 'r_series_1',
          name: 'مقاومة كربونية Resistor 220Ω',
          type: 'resistor',
          label: 'R1 (220Ω)',
          value: 220,
          unit: 'Ω',
          x: 360,
          y: 120,
          rotation: 0,
          pins: [
            { id: 'p1', name: 'Lead 1', x: 12, y: 22 },
            { id: 'p2', name: 'Lead 2', x: 138, y: 22 },
          ],
        },
        {
          id: 'r_series_2',
          name: 'مقاومة كربونية Resistor 220Ω',
          type: 'resistor',
          label: 'R2 (1kΩ)',
          value: 1000,
          unit: 'Ω',
          x: 520,
          y: 120,
          rotation: 0,
          pins: [
            { id: 'p1', name: 'Lead 1', x: 12, y: 22 },
            { id: 'p2', name: 'Lead 2', x: 138, y: 22 },
          ],
        },
      ]);
      setWires([
        { id: 'rw1', fromCompId: 'r_series_1', fromPinId: 'p2', toCompId: 'r_series_2', toPinId: 'p1', color: '#f59e0b' },
      ]);
    } else if (templateKey === 'transistor_circuit') {
      setBenchVoltage(9.0);
      setComponents([
        {
          id: 'bb_tr',
          name: 'لوحة تجارب Breadboard 400-Point',
          type: 'arduino',
          label: 'Breadboard',
          value: 400,
          unit: 'pins',
          x: 320,
          y: 120,
          rotation: 0,
          pins: [{ id: 'p_rail', name: '+ Rail', x: 26, y: 17 }],
        },
        {
          id: 'tr_1',
          name: 'ترانزستور NPN BJT 2N2222',
          type: 'transistor',
          label: 'Q1 (2N2222)',
          value: 1,
          unit: 'x',
          x: 440,
          y: 110,
          rotation: 0,
          pins: [
            { id: 'e', name: 'Emitter', x: 25, y: 85 },
            { id: 'b', name: 'Base', x: 40, y: 85 },
            { id: 'c', name: 'Collector', x: 55, y: 85 },
          ],
        },
        {
          id: 'tr_led',
          name: 'دايود ضوئي LED أخضر 5mm',
          type: 'led',
          label: 'Load LED',
          value: 2.2,
          unit: 'V',
          color: '#22c55e',
          x: 450,
          y: 30,
          rotation: 0,
          pins: [
            { id: 'p1', name: 'Anode', x: 30, y: 88 },
            { id: 'p2', name: 'Cathode', x: 42, y: 80 },
          ],
          state: { isOn: true },
        },
      ]);
      setWires([
        { id: 'tw1', fromCompId: 'tr_led', fromPinId: 'p2', toCompId: 'tr_1', toPinId: 'c', color: '#ef4444' },
      ]);
    }
  };

  const selectedComp = components.find((c) => c.id === selectedCompId);
  const selectedWire = wires.find((w) => w.id === selectedWireId);

  // Helper to compute pin absolute canvas coordinates
  const getPinAbsolutePos = (compId: string, pinId: string) => {
    const comp = components.find((c) => c.id === compId);
    if (!comp) return null;
    const pin = comp.pins.find((p) => p.id === pinId);
    if (!pin) return null;

    // Apply component rotation if rotated
    if (comp.rotation === 0) {
      return { x: comp.x + pin.x, y: comp.y + pin.y };
    }

    // SVG renders with transform-origin center
    // Approximate component visual center (default ~80x60)
    const cx = comp.x + 40;
    const cy = comp.y + 40;
    const rad = (comp.rotation * Math.PI) / 180;
    const px = comp.x + pin.x - cx;
    const py = comp.y + pin.y - cy;

    return {
      x: cx + px * Math.cos(rad) - py * Math.sin(rad),
      y: cy + px * Math.sin(rad) + py * Math.cos(rad),
    };
  };

  const startPinPos = wiringStart
    ? getPinAbsolutePos(wiringStart.compId, wiringStart.pinId)
    : null;

  return (
    <div className="space-y-6 pb-12 select-none font-sans text-slate-100">
      
      {/* =========================================================================
          ZONE 1: Laboratory Benchtop Instruments Rack (Fluke, Power Supply, Rigol)
          ========================================================================= */}
      <section className="bg-gradient-to-b from-[#0F1D33] to-[#0A1628] border-2 border-cyan-500/30 rounded-3xl p-5 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 overflow-x-auto no-scrollbar">
          
          {/* Instrument 1: Fluke 115 True RMS Digital Multimeter */}
          <div className="shrink-0 flex flex-col items-center">
            <RealisticFlukeMultimeter voltage={benchVoltage} />
          </div>

          {/* Instrument 2: Dual Display DC Power Supply (Adjustable) */}
          <div className="shrink-0 flex flex-col items-center">
            <RealisticDCPowerSupply voltage={benchVoltage} current={benchCurrent} />
          </div>

          {/* Instrument 3: Rigol DS1104Z Digital Storage Oscilloscope */}
          <div className="shrink-0 flex flex-col items-center">
            <RealisticRigolOscilloscope frequency={50} isSimulating={isSimulating} />
          </div>

        </div>
      </section>

      {/* =========================================================================
          ZONE 2: Main Workbench Area (Sidebar Tools, Breadboard Canvas & Telemetry)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Sidebar: "أدوات المختبر" (Realistic Photorealistic Components Library) */}
        <div className="lg:col-span-3 bg-[#0D1B2A] border border-cyan-500/30 rounded-2xl p-4 space-y-3 shadow-xl flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                🛠️
              </div>
              <h3 className="text-sm font-bold text-white">مكتبة العناصر الهندسية</h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-800/40">
              اسحب أو انقر
            </span>
          </div>

          {/* Filter Categories */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 text-[11px] font-bold">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'passives', label: 'العناصر' },
              { id: 'mcu', label: 'اللوحات' },
              { id: 'motors', label: 'المحركات' },
              { id: 'sensors', label: 'الحساسات' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Drag & Drop Hint */}
          <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-[10px] text-slate-300 flex items-center gap-2">
            <Move className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>اسحب أي قطعة بالفأرة وأفلتها مباشرة على مساحة العمل أو انقر (+ سحب).</span>
          </div>

          {/* Realistic Component Cards List with HTML5 Drag & Drop */}
          <div className="space-y-2.5 max-h-[580px] overflow-y-auto no-scrollbar pr-1 flex-1">
            {MECHATRONICS_LIBRARY.filter(
              (item) => activeCategory === 'all' || item.category === activeCategory
            ).map((item) => (
              <div
                key={item.id}
                draggable={true}
                onDragStart={(e) => handleDragStartSidebar(e, item)}
                onClick={() => addComponentToCanvas(item)}
                className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-400 cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] flex items-center justify-between group shadow-sm hover:shadow-cyan-500/15"
                title="اسحب العنصر إلى الطاولة أو انقر لإضافته"
              >
                <div className="flex items-center gap-3">
                  {/* Realistic 3D Photorealistic Thumbnail */}
                  <div className="w-16 h-12 bg-[#091527] rounded-lg border border-slate-800 p-0.5 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-cyan-500/50">
                    {renderRealisticThumbnail(item.type, item.name)}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {item.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{item.description}</p>
                    <span className="text-[9px] font-mono text-amber-400/90 font-bold">
                      {item.defaultVal} {item.unit}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    addComponentToCanvas(item);
                  }}
                  className="px-2 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-extrabold group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors shrink-0"
                >
                  + سحب
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Real Breadboard & Component Interactive Workbench */}
        <div className="lg:col-span-7 space-y-3">
          
          {/* Action Toolbar above Canvas */}
          <div className="bg-[#0D1B2A] border border-cyan-500/30 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg">
            
            <div className="flex items-center gap-3">
              <span className="font-bold text-white flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>طاولة التوصيل والتركيب الواقعي</span>
              </span>
              <span className="text-slate-400 text-[11px] font-mono">
                {components.length} قطع | {wires.length} أسلاك
              </span>
            </div>

            {/* Wire Color Palette Picker */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg">
              <span className="text-[10px] text-slate-400 font-bold">لون السلك:</span>
              {[
                { color: '#3b82f6', label: 'أزرق (إشارة)' },
                { color: '#ef4444', label: 'أحمر (تغذية +V)' },
                { color: '#0f172a', label: 'أسود (أرضي GND)' },
                { color: '#22c55e', label: 'أخضر (بيانات)' },
                { color: '#eab308', label: 'أصفر (تزامن)' },
                { color: '#f97316', label: 'برتقالي (تحكم)' },
                { color: '#f8fafc', label: 'أبيض' },
              ].map(({ color, label }) => (
                <button
                  key={color}
                  onClick={() => setWireColor(color)}
                  title={label}
                  className={`w-4 h-4 rounded-full border transition-all ${
                    wireColor === color ? 'scale-125 border-white ring-2 ring-cyan-400 shadow-md' : 'border-slate-700 hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            {/* Grid & Alignment Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all ${
                  snapToGrid
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-slate-900 text-slate-400 border-slate-700'
                }`}
                title="محاذاة القطع إلى شبكة نقاط التوصيل المغناطيسية"
              >
                <Grid className="w-3 h-3" />
                <span>محاذاة Snap</span>
              </button>

              <button
                onClick={() => setShowGridLines(!showGridLines)}
                className={`p-1 rounded-lg border ${
                  showGridLines ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-slate-900 text-slate-400 border-slate-700'
                }`}
                title="إظهار / إخفاء خطوط الشبكة"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>

              {/* Zoom Controls */}
              <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                <button onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))} className="p-1 text-slate-400 hover:text-white" title="تصغير">
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono font-bold text-cyan-400 px-1">{Math.round(zoomLevel * 100)}%</span>
                <button onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))} className="p-1 text-slate-400 hover:text-white" title="تكبير">
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

          {/* Interactive Workspace Canvas */}
          <div
            ref={canvasRef}
            onDragOver={handleDragOverCanvas}
            onDragLeave={handleDragLeaveCanvas}
            onDrop={handleDropCanvas}
            onMouseMove={handleMouseMoveCanvas}
            onMouseUp={handleMouseUpCanvas}
            onMouseLeave={handleMouseUpCanvas}
            onClick={() => {
              // Click on empty space cancels wiring or wire selection
              if (wiringStart) setWiringStart(null);
              setSelectedWireId(null);
            }}
            className={`relative w-full h-[600px] rounded-2xl bg-[#091527] border-2 transition-colors overflow-hidden shadow-2xl cursor-default select-none ${
              isDragOverCanvas
                ? 'border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.3)] bg-[#0c1f38]'
                : 'border-slate-800'
            }`}
            style={{
              backgroundImage: showGridLines
                ? 'radial-gradient(rgba(0, 240, 255, 0.12) 1.5px, transparent 1.5px)'
                : 'none',
              backgroundSize: `${24 * zoomLevel}px ${24 * zoomLevel}px`,
            }}
          >
            {/* Overlay Banner when dragging a component from sidebar */}
            {isDragOverCanvas && (
              <div className="absolute inset-0 z-40 bg-cyan-950/40 backdrop-blur-[2px] border-4 border-dashed border-amber-400 rounded-2xl flex flex-col items-center justify-center pointer-events-none">
                <div className="p-4 rounded-2xl bg-[#0D1B2A]/90 border border-amber-400 shadow-2xl flex items-center gap-3 text-amber-300 font-extrabold text-sm">
                  <Plus className="w-6 h-6 animate-spin" />
                  <span>أفلت القطعة هنا لتثبيتها مباشرة على طاولة التوصيل!</span>
                </div>
              </div>
            )}

            {/* Prompt when active wiring mode is engaged */}
            {wiringStart && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-5 py-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs shadow-2xl flex items-center gap-2 border border-white/50 animate-pulse">
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>انقر على منفذ الطرف الآخر لإتمام التوصيل بالسلك (أو اضغط Esc للإلغاء)</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setWiringStart(null);
                  }}
                  className="w-4 h-4 rounded-full bg-slate-950/30 text-white flex items-center justify-center hover:bg-slate-950"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Zoom Transform Container */}
            <div
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top left',
                width: '100%',
                height: '100%',
              }}
              className="relative w-full h-full"
            >
              {/* Connecting Jumper Wires SVG Layer */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
                <defs>
                  {/* Subtle drop shadow for wires */}
                  <filter id="wireShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.45" />
                  </filter>
                </defs>

                {/* Render Existing Placed Wires */}
                {wires.map((w) => {
                  const p1 = getPinAbsolutePos(w.fromCompId, w.fromPinId);
                  const p2 = getPinAbsolutePos(w.toCompId, w.toPinId);
                  if (!p1 || !p2) return null;

                  const x1 = p1.x;
                  const y1 = p1.y;
                  const x2 = p2.x;
                  const y2 = p2.y;

                  // Compute natural droop / catenary Bezier curve
                  const dx = x2 - x1;
                  const dy = y2 - y1;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  const sag = Math.max(30, Math.min(85, dist * 0.28));

                  const controlX = (x1 + x2) / 2;
                  const controlY = (y1 + y2) / 2 + sag;
                  const isWireSelected = selectedWireId === w.id;

                  return (
                    <g
                      key={w.id}
                      className="pointer-events-auto cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWireId(w.id);
                        setSelectedCompId(null);
                      }}
                    >
                      {/* Wire Drop Shadow */}
                      <path
                        d={`M ${x1} ${y1} Q ${controlX} ${controlY + 5} ${x2} ${y2}`}
                        fill="none"
                        stroke="#000000"
                        strokeWidth={7}
                        opacity={0.35}
                        filter="url(#wireShadow)"
                      />

                      {/* Wide invisible path for easy clicking / hovering */}
                      <path
                        d={`M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={18}
                      />

                      {/* Glowing outline when selected */}
                      {isWireSelected && (
                        <path
                          d={`M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth={8}
                          strokeLinecap="round"
                          opacity={0.8}
                          className="animate-pulse"
                        />
                      )}

                      {/* Insulated PVC Jumper Wire */}
                      <path
                        d={`M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`}
                        fill="none"
                        stroke={w.color || '#3b82f6'}
                        strokeWidth={isWireSelected ? 5.5 : 4}
                        strokeLinecap="round"
                        className="transition-all group-hover:brightness-125"
                      />

                      {/* Pin Terminals / Dupont Connector Housings at endpoints */}
                      <circle cx={x1} cy={y1} r={4.5} fill="#1e293b" stroke="#ffffff" strokeWidth={1.5} />
                      <circle cx={x2} cy={y2} r={4.5} fill="#1e293b" stroke="#ffffff" strokeWidth={1.5} />

                      {/* Wire Midpoint Badge (Click to delete or inspect) */}
                      {isWireSelected && (
                        <g
                          transform={`translate(${controlX}, ${controlY})`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWire(w.id);
                          }}
                          className="cursor-pointer"
                        >
                          <circle r={11} fill="#ef4444" stroke="#ffffff" strokeWidth={2} />
                          <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">✕</text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Live Rubber-Band Wire Preview while user is dragging wire to target pin */}
                {wiringStart && startPinPos && (
                  <g className="pointer-events-none">
                    {/* Shadow for preview wire */}
                    <path
                      d={`M ${startPinPos.x} ${startPinPos.y} Q ${(startPinPos.x + cursorPos.x) / 2} ${(startPinPos.y + cursorPos.y) / 2 + 25} ${cursorPos.x} ${cursorPos.y}`}
                      fill="none"
                      stroke="#000000"
                      strokeWidth={5}
                      opacity={0.3}
                    />
                    {/* Dashed animated stretching wire */}
                    <path
                      d={`M ${startPinPos.x} ${startPinPos.y} Q ${(startPinPos.x + cursorPos.x) / 2} ${(startPinPos.y + cursorPos.y) / 2 + 25} ${cursorPos.x} ${cursorPos.y}`}
                      fill="none"
                      stroke={wireColor}
                      strokeWidth={4.5}
                      strokeDasharray="6 4"
                      strokeLinecap="round"
                      className="animate-pulse"
                    />
                    {/* Cursor tip target indicator */}
                    <circle cx={cursorPos.x} cy={cursorPos.y} r={6} fill={wireColor} stroke="#ffffff" strokeWidth={2} />
                  </g>
                )}
              </svg>

              {/* Render Placed Draggable Components */}
              {components.map((comp) => {
                const isSelected = selectedCompId === comp.id;
                const isDraggingThis = draggingCompId === comp.id;

                return (
                  <div
                    key={comp.id}
                    onMouseDown={(e) => handleMouseDownComp(e, comp.id)}
                    style={{
                      left: `${comp.x}px`,
                      top: `${comp.y}px`,
                      transform: `rotate(${comp.rotation}deg)`,
                      transformOrigin: 'center center',
                      zIndex: isDraggingThis ? 40 : isSelected ? 30 : 20,
                    }}
                    className={`absolute transition-shadow select-none group cursor-grab active:cursor-grabbing ${
                      isDraggingThis
                        ? 'scale-105 shadow-[0_20px_35px_rgba(0,0,0,0.6)] ring-4 ring-amber-400'
                        : isSelected
                        ? 'ring-4 ring-amber-400/70 rounded-2xl drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                        : 'hover:drop-shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                    }`}
                  >
                    {/* Realistic SVG Rendering */}
                    <div className="relative pointer-events-none">
                      {renderRealisticInteractiveComponent(comp, isSimulating)}
                    </div>

                    {/* Interactive Actuation Overlay (e.g. Tactile Pushbutton Click) */}
                    {comp.type === 'switch' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleComponentState(comp.id);
                        }}
                        className={`absolute top-4 left-4 w-12 h-12 rounded-full cursor-pointer transition-transform active:scale-90 ${
                          comp.state?.isOn
                            ? 'bg-amber-400/20 ring-2 ring-amber-400/50'
                            : 'bg-black/30'
                        }`}
                        title="انقر لضغط الزر وتشغيل/قطع الدائرة"
                      />
                    )}

                    {/* Electrical Pin Terminals for Live Wiring */}
                    {comp.pins.map((pin) => {
                      const isWiringStartPin =
                        wiringStart?.compId === comp.id && wiringStart?.pinId === pin.id;
                      const isHovered =
                        hoveredPin?.compId === comp.id && hoveredPin?.pinId === pin.id;
                      const isPotentialTarget =
                        wiringStart !== null && wiringStart.compId !== comp.id;

                      return (
                        <button
                          key={pin.id}
                          type="button"
                          onMouseEnter={() => setHoveredPin({ compId: comp.id, pinId: pin.id })}
                          onMouseLeave={() => setHoveredPin(null)}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePinClick(comp.id, pin.id);
                          }}
                          style={{
                            left: `${pin.x}px`,
                            top: `${pin.y}px`,
                            transform: 'translate(-50%, -50%)',
                          }}
                          className={`absolute z-30 w-4 h-4 rounded-full border-2 transition-all ${
                            isWiringStartPin
                              ? 'bg-amber-400 border-white scale-150 ring-4 ring-amber-500/80 animate-bounce'
                              : isPotentialTarget
                              ? 'bg-emerald-500 border-white scale-125 ring-4 ring-emerald-500/50 animate-pulse'
                              : isHovered
                              ? 'bg-cyan-400 border-white scale-150 ring-2 ring-cyan-300'
                              : 'bg-slate-900 border-cyan-400 hover:scale-150 hover:bg-cyan-400'
                          }`}
                          title={`منفذ: ${pin.name}`}
                        >
                          {/* Rich Pin Tooltip */}
                          <span
                            className={`absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/95 text-cyan-300 font-mono text-[9px] px-2.5 py-1 rounded-lg whitespace-nowrap z-50 border border-cyan-500/50 shadow-2xl pointer-events-none ${
                              isHovered || isWiringStartPin ? 'block' : 'hidden'
                            }`}
                          >
                            <span className="font-bold text-amber-300 block">{comp.label}</span>
                            {pin.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {/* Floating Quick Action Bar for the Currently Selected Component */}
              {selectedComp && (
                <div
                  style={{
                    left: `${Math.max(10, selectedComp.x - 20)}px`,
                    top: `${Math.max(10, selectedComp.y - 48)}px`,
                    transform: 'none',
                    zIndex: 50,
                  }}
                  className="absolute bg-[#0D1B2A]/95 backdrop-blur-md border border-cyan-400/60 rounded-xl px-2 py-1 shadow-2xl flex items-center gap-1 text-[11px] font-bold text-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[10px] text-amber-400 font-mono font-bold px-1 border-r border-slate-700/80">
                    {selectedComp.label}
                  </span>

                  {/* Rotate +90 */}
                  <button
                    onClick={() => handleRotateComponent(selectedComp.id, 90)}
                    className="p-1 rounded-lg hover:bg-slate-800 text-amber-400 hover:text-white transition-colors"
                    title="تدوير مع عقارب الساعة +90° (مفتاح R)"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  {/* Rotate -90 */}
                  <button
                    onClick={() => handleRotateComponent(selectedComp.id, -90)}
                    className="p-1 rounded-lg hover:bg-slate-800 text-amber-400 hover:text-white transition-colors"
                    title="تدوير عكس عقارب الساعة -90°"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  {/* Duplicate */}
                  <button
                    onClick={() => handleDuplicateComponent(selectedComp.id)}
                    className="p-1 rounded-lg hover:bg-slate-800 text-cyan-300 hover:text-white transition-colors"
                    title="مضاعفة القطعة (مفتاح D)"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {/* Toggle state if switch */}
                  {selectedComp.type === 'switch' && (
                    <button
                      onClick={() => handleToggleComponentState(selectedComp.id)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                        selectedComp.state?.isOn
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {selectedComp.state?.isOn ? 'تشغيل' : 'إيقاف'}
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    onClick={handleDeleteSelectedComp}
                    className="p-1 rounded-lg hover:bg-rose-500 text-rose-400 hover:text-white transition-colors"
                    title="حذف القطعة (مفتاح Delete أو Backspace)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Floating Quick Action Bar for the Currently Selected Wire */}
              {selectedWire && (
                <div
                  style={{
                    left: `${cursorPos.x}px`,
                    top: `${cursorPos.y - 40}px`,
                    zIndex: 50,
                  }}
                  className="absolute bg-[#0D1B2A]/95 backdrop-blur-md border border-amber-400/60 rounded-xl px-2.5 py-1.5 shadow-2xl flex items-center gap-2 text-xs font-bold text-white pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[10px] text-amber-400 font-mono">سلك محدد:</span>

                  {/* Wire Color Chooser */}
                  <div className="flex items-center gap-1">
                    {['#3b82f6', '#ef4444', '#0f172a', '#22c55e', '#eab308', '#f8fafc'].map((c) => (
                      <button
                        key={c}
                        onClick={() => handleUpdateWireColor(selectedWire.id, c)}
                        className={`w-3.5 h-3.5 rounded-full border ${
                          selectedWire.color === c ? 'scale-125 border-white ring-1 ring-amber-400' : 'border-slate-700'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => handleDeleteWire(selectedWire.id)}
                    className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white text-[10px] font-bold flex items-center gap-1 border border-rose-500/40"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>حذف السلك</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Component Parameter Inspector Panel (Below Canvas) */}
          {selectedComp ? (
            <div className="bg-[#0D1B2A] border border-cyan-500/30 rounded-2xl p-4 space-y-3 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-lg">
                    ⚙️
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-sm">
                      تعديل وتحكم: {selectedComp.name} ({selectedComp.label})
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      الموقع: X={Math.round(selectedComp.x)}, Y={Math.round(selectedComp.y)} | زاوية التدوير: {selectedComp.rotation}°
                    </span>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRotateComponent(selectedComp.id, 90)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                    <span>تدوير +90°</span>
                  </button>

                  <button
                    onClick={() => handleDuplicateComponent(selectedComp.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700"
                  >
                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                    <span>مضاعفة</span>
                  </button>

                  <button
                    onClick={handleDeleteSelectedComp}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-300 text-xs font-bold flex items-center gap-1.5 border border-rose-500/40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Value and Property Modifiers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                
                {/* 1. Value Modifier */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-bold">القيمة الكهربائية ({selectedComp.unit}):</label>
                    <span className="text-amber-400 font-mono font-bold">
                      {selectedComp.value} {selectedComp.unit}
                    </span>
                  </div>
                  <input
                    type="number"
                    value={selectedComp.value}
                    onChange={(e) =>
                      handleUpdateComponentValue(selectedComp.id, parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-amber-400 font-mono font-bold text-sm focus:border-cyan-400 outline-none"
                  />
                  {/* Resistor Standard Presets */}
                  {selectedComp.type === 'resistor' && (
                    <div className="flex items-center gap-1 pt-1 flex-wrap">
                      <span className="text-[10px] text-slate-400">قيم قياسية:</span>
                      {[220, 330, 1000, 4700, 10000].map((val) => (
                        <button
                          key={val}
                          onClick={() => handleUpdateComponentValue(selectedComp.id, val)}
                          className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-cyan-300 hover:bg-slate-700"
                        >
                          {val >= 1000 ? `${val / 1000}k` : val}Ω
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Rotation Angle Slider */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-bold">الزاوية (0° - 360°):</label>
                    <span className="text-cyan-400 font-mono font-bold">{selectedComp.rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    value={selectedComp.rotation}
                    onChange={(e) =>
                      handleSetComponentRotation(selectedComp.id, parseInt(e.target.value))
                    }
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>0°</span>
                    <span>90°</span>
                    <span>180°</span>
                    <span>270°</span>
                    <span>360°</span>
                  </div>
                </div>

                {/* 3. Color Chooser (For LEDs) or State */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  {selectedComp.type === 'led' ? (
                    <>
                      <label className="text-slate-300 font-bold block">لون إضاءة الدايود:</label>
                      <div className="flex items-center gap-2 pt-1">
                        {[
                          { color: '#ef4444', label: 'أحمر' },
                          { color: '#22c55e', label: 'أخضر' },
                          { color: '#eab308', label: 'أصفر' },
                          { color: '#3b82f6', label: 'أزرق' },
                          { color: '#f8fafc', label: 'أبيض' },
                        ].map((c) => (
                          <button
                            key={c.color}
                            onClick={() => handleUpdateComponentColor(selectedComp.id, c.color)}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${
                              selectedComp.color === c.color
                                ? 'scale-125 border-white ring-2 ring-cyan-400'
                                : 'border-slate-700 hover:scale-110'
                            }`}
                            style={{ backgroundColor: c.color }}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="text-slate-300 font-bold block">تسمية المكون في المخطط:</label>
                      <input
                        type="text"
                        value={selectedComp.label}
                        onChange={(e) => {
                          const val = e.target.value;
                          setComponents((prev) =>
                            prev.map((c) => (c.id === selectedComp.id ? { ...c, label: val } : c))
                          );
                        }}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:border-cyan-400 outline-none"
                      />
                    </>
                  )}
                </div>

              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-[#0D1B2A]/60 border border-slate-800/80 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <MousePointer className="w-4 h-4 text-cyan-400" />
              <span>انقر على أي عنصر أو سلك في الطاولة للتحكم والتعديل والتدوير.</span>
            </div>
          )}
        </div>

        {/* Right Sidebar: "القياسات" (Real-time Circuit Telemetry HUD) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#0D1B2A] border border-cyan-500/30 rounded-2xl p-4 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">القياسات الحية</h3>
            </div>

            {/* Voltage Card */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <span>⚡ الجهد الكهربائي</span>
              </div>
              <div className="text-2xl font-black font-mono text-amber-300">
                {benchVoltage.toFixed(2)} <span className="text-sm">V</span>
              </div>
              <div className="text-[10px] text-slate-400">فرق الجهد عبر الدائرة</div>
            </div>

            {/* Current Card */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <span>🔋 شدة التيار</span>
              </div>
              <div className="text-2xl font-black font-mono text-emerald-300">
                {benchCurrent.toFixed(2)} <span className="text-sm">A</span>
              </div>
              <div className="text-[10px] text-slate-400">معدل تدفق الشحنات</div>
            </div>

            {/* Resistance Card */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                <span>Ω المقاومة المكافئة</span>
              </div>
              <div className="text-2xl font-black font-mono text-cyan-300">
                {benchResistance.toFixed(2)} <span className="text-sm">Ω</span>
              </div>
              <div className="text-[10px] text-slate-400">المقاومة الكلية للدائرة</div>
            </div>

            {/* Live Status indicator */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
              <span className="text-[11px] font-bold text-slate-300">حالة المختبر:</span>
              <div className="text-xs font-bold font-mono text-emerald-400 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isSimulating ? 'المحاكاة نشطة ومستقرة' : 'المحاكاة متوقفة'}</span>
              </div>
            </div>

            {/* Reset to Default */}
            <button
              onClick={() => handleLoadTemplate('led_circuit')}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>إعادة تهيئة الطاولة</span>
            </button>
          </div>
        </div>

      </div>

      {/* =========================================================================
          ZONE 3: Bottom "نماذج التجارب" (Experiment Circuit Templates) & Big Play Button
          ========================================================================= */}
      <section className="bg-[#0D1B2A] border-2 border-cyan-500/30 rounded-3xl p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Templates Selector */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <span className="text-base">📦</span>
            <span className="text-sm font-extrabold text-white">نماذج التجارب الهندسية الجاهزة:</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { id: 'led_circuit', label: 'دائرة LED', symbol: 'R ── ▷|' },
              { id: 'resistor_circuit', label: 'دائرة مقاومة', symbol: 'R1 ── R2' },
              { id: 'capacitor_circuit', label: 'دائرة مكثف', symbol: 'R ── || C' },
              { id: 'transistor_circuit', label: 'دائرة الترانزستور', symbol: 'BJT Switch' },
              { id: 'bridge_circuit', label: 'دائرة الجسر', symbol: 'Bridge ~' },
            ].map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => handleLoadTemplate(tmpl.id)}
                className={`p-3 rounded-2xl border transition-all text-center group cursor-pointer ${
                  activeTemplate === tmpl.id
                    ? 'bg-cyan-500/20 border-cyan-400 shadow-md shadow-cyan-500/20 text-white'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className="text-xs font-mono font-bold text-amber-400 mb-1">{tmpl.symbol}</div>
                <div className="text-xs font-extrabold">{tmpl.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Big Glowing Play/Pause Simulation Button (matching user reference image) */}
        <div className="shrink-0 flex flex-col items-center gap-2">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`w-24 h-24 rounded-full border-4 shadow-2xl flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer ${
              isSimulating
                ? 'bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 border-white text-slate-950 shadow-emerald-500/50 drop-shadow-[0_0_20px_rgba(34,197,94,0.6)]'
                : 'bg-gradient-to-tr from-slate-800 to-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            <Play className={`w-10 h-10 ${isSimulating ? 'animate-pulse' : ''}`} />
          </button>
          <span className="text-xs font-black text-white">
            {isSimulating ? 'إيقاف المحاكاة' : 'تشغيل المحاكاة'}
          </span>
        </div>

      </section>

    </div>
  );
};
