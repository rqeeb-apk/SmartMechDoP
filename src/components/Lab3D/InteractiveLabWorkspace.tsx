import React, { useState, useRef, useEffect } from 'react';
import {
  Zap, Cpu, Play, Square, RotateCcw, Plus, Trash2, Code, Download, Upload, Eye,
  Sparkles, Layers, Sliders, Activity, Shield, Box, Bot, AlertTriangle, CheckCircle2,
  Move, Radio, Disc, Maximize2, Minimize2, Copy, FileText, RotateCw, ZoomIn, ZoomOut,
  MousePointer, Grid, Settings
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
    description: 'مقاومة كربونية بألوان قياسية لحماية الليدات وتحديد التيار.',
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
      { id: 'rail_pos_1', name: 'خط الطاقة (+) العلوي', x: 26, y: 17 },
      { id: 'rail_neg_1', name: 'خط الأرضي (-) العلوي', x: 26, y: 33 },
      { id: 'rail_pos_2', name: 'خط الطاقة (+) السفلي', x: 26, y: 115 },
      { id: 'rail_neg_2', name: 'خط الأرضي (-) السفلي', x: 26, y: 131 },
      { id: 'tie_1', name: 'مقبس صف A-E (عمود 1)', x: 60, y: 55 },
      { id: 'tie_2', name: 'مقبس صف F-J (عمود 1)', x: 60, y: 92 },
      { id: 'tie_3', name: 'مقبس صف A-E (عمود 10)', x: 140, y: 55 },
      { id: 'tie_4', name: 'مقبس صف F-J (عمود 10)', x: 140, y: 92 },
    ],
    description: 'لوحة تجارب بيضاء واقعية مع ممرات الطاقة لتوصيل الدوائر دون لحام.',
  },
  {
    id: 'arduino',
    type: 'arduino',
    name: 'لوحة أردوينو Arduino UNO R3',
    category: 'mcu',
    defaultVal: 5,
    unit: 'V',
    pins: [
      { id: 'pin5v', name: 'منفذ الطاقة 5V', x: 76, y: 138 },
      { id: 'gnd_pwr', name: 'منفذ الأرضي GND', x: 92, y: 138 },
      { id: 'pinA0', name: 'مدخل تناظري A0', x: 142, y: 138 },
      { id: 'pinA1', name: 'مدخل تناظري A1', x: 152, y: 138 },
      { id: 'pin13', name: 'منفذ رقمي 13 (LED)', x: 110, y: 16 },
      { id: 'pin11', name: 'منفذ رقمي 11 (PWM)', x: 128, y: 16 },
      { id: 'pin9', name: 'منفذ رقمي 9 (PWM)', x: 145, y: 16 },
      { id: 'gnd_dig', name: 'أرضي GND العلوي', x: 92, y: 16 },
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
      { id: 'v33', name: '3.3V Power', x: 24, y: 11 },
      { id: 'gnd', name: 'GND الأرضي', x: 44, y: 11 },
      { id: 'gpio2', name: 'GPIO 2 (LED)', x: 64, y: 11 },
      { id: 'gpio4', name: 'GPIO 4', x: 84, y: 11 },
      { id: 'gpio18', name: 'GPIO 18', x: 124, y: 11 },
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
        { id: 'rail_pos_1', name: '+ Rail', x: 26, y: 17 },
        { id: 'rail_neg_1', name: '- Rail', x: 26, y: 33 },
        { id: 'tie_1', name: 'Node 1', x: 95, y: 55 },
        { id: 'tie_2', name: 'Node 2', x: 125, y: 55 },
        { id: 'tie_3', name: 'Node 3', x: 155, y: 55 },
        { id: 'tie_sw', name: 'Node SW', x: 185, y: 92 },
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

  // UI States
  const [selectedCompId, setSelectedCompId] = useState<string | null>('comp_led_red');
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [wiringStart, setWiringStart] = useState<{ compId: string; pinId: string } | null>(null);
  const [wireColor, setWireColor] = useState('#3b82f6');
  const [isSimulating, setIsSimulating] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'all' | 'passives' | 'mcu' | 'motors' | 'sensors' | 'displays' | 'power'>('all');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [activeTemplate, setActiveTemplate] = useState<string>('led_circuit');

  // Dragging state
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Update electrical math calculations
  useEffect(() => {
    if (!isSimulating) {
      setBenchCurrent(0);
      setBenchResistance(0);
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

  // Add Component to Workbench
  const handleAddComponent = (item: LibraryItem) => {
    const count = components.filter((c) => c.name === item.name).length + 1;
    const newComp: CircuitComponent = {
      id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: item.name,
      type: item.type as any,
      label: `${item.id.toUpperCase()}-${count}`,
      value: item.defaultVal,
      unit: item.unit,
      color: item.color,
      x: 350 + (components.length % 4) * 35,
      y: 130 + (components.length % 3) * 30,
      rotation: 0,
      pins: item.pins.map((p) => ({ ...p })),
      state: { isOn: true, angle: 90 },
    };

    setComponents([...components, newComp]);
    setSelectedCompId(newComp.id);
  };

  // Rotate component
  const handleRotateComponent = (compId: string) => {
    setComponents(
      components.map((c) => (c.id === compId ? { ...c, rotation: (c.rotation + 90) % 360 } : c))
    );
  };

  // Duplicate component
  const handleDuplicateComponent = (compId: string) => {
    const comp = components.find((c) => c.id === compId);
    if (!comp) return;

    const cloned: CircuitComponent = {
      ...comp,
      id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: `${comp.label}_Copy`,
      x: comp.x + 35,
      y: comp.y + 35,
    };

    setComponents([...components, cloned]);
    setSelectedCompId(cloned.id);
  };

  // Pin Wiring handler
  const handlePinClick = (compId: string, pinId: string) => {
    if (!wiringStart) {
      setWiringStart({ compId, pinId });
    } else {
      if (wiringStart.compId === compId && wiringStart.pinId === pinId) {
        setWiringStart(null);
        return;
      }

      const newWire: WireConnection = {
        id: `wire_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        fromCompId: wiringStart.compId,
        fromPinId: wiringStart.pinId,
        toCompId: compId,
        toPinId: pinId,
        color: wireColor,
      };

      setWires([...wires, newWire]);
      setWiringStart(null);
    }
  };

  // Mouse Drag handlers
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

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (!draggingCompId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();

    const rawX = (e.clientX - rect.left) / zoomLevel - dragOffset.x;
    const rawY = (e.clientY - rect.top) / zoomLevel - dragOffset.y;

    const newX = Math.max(10, Math.min(1600, rawX));
    const newY = Math.max(10, Math.min(1000, rawY));

    setComponents(
      components.map((c) => (c.id === draggingCompId ? { ...c, x: newX, y: newY } : c))
    );
  };

  const handleMouseUpCanvas = () => {
    setDraggingCompId(null);
  };

  // Deletions
  const handleDeleteSelectedComp = () => {
    if (!selectedCompId) return;
    setComponents(components.filter((c) => c.id !== selectedCompId));
    setWires(wires.filter((w) => w.fromCompId !== selectedCompId && w.toCompId !== selectedCompId));
    setSelectedCompId(null);
  };

  const handleDeleteWire = (wireId: string) => {
    setWires(wires.filter((w) => w.id !== wireId));
    if (selectedWireId === wireId) setSelectedWireId(null);
  };

  // Load Experiment Templates (matching user reference image)
  const handleLoadTemplate = (templateKey: string) => {
    setActiveTemplate(templateKey);

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
        <div className="lg:col-span-3 bg-[#0D1B2A] border border-cyan-500/30 rounded-2xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                🛠️
              </div>
              <h3 className="text-sm font-bold text-white">أدوات المختبر الواقعي</h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 font-bold">اسحب أو انقر للإضافة</span>
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

          {/* Realistic Component Cards List */}
          <div className="space-y-2.5 max-h-[580px] overflow-y-auto no-scrollbar pr-1">
            {MECHATRONICS_LIBRARY.filter(
              (item) => activeCategory === 'all' || item.category === activeCategory
            ).map((item) => (
              <div
                key={item.id}
                onClick={() => handleAddComponent(item)}
                className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-400 cursor-pointer transition-all hover:scale-[1.02] flex items-center justify-between group shadow-sm hover:shadow-cyan-500/10"
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

                <button className="px-2 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-extrabold group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors shrink-0">
                  + سحب
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Real Breadboard & Component Interactive Workbench */}
        <div className="lg:col-span-7 space-y-3">
          
          {/* Action Toolbar above Canvas */}
          <div className="bg-[#0D1B2A] border border-cyan-500/30 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>طاولة التوصيل والتركيب الواقعي</span>
              </span>
              <span className="text-slate-400 text-[11px] font-mono">
                {components.length} قطع | {wires.length} أسلاك
              </span>
            </div>

            {/* Wire Color Picker */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg">
              <span className="text-[10px] text-slate-400 font-bold">لون السلك:</span>
              {['#3b82f6', '#ef4444', '#0f172a', '#22c55e', '#f59e0b', '#f8fafc'].map((c) => (
                <button
                  key={c}
                  onClick={() => setWireColor(c)}
                  className={`w-4 h-4 rounded-full border transition-transform ${
                    wireColor === c ? 'scale-125 border-white ring-2 ring-cyan-400' : 'border-slate-700'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-0.5">
              <button onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))} className="p-1 text-slate-400 hover:text-white"><ZoomOut className="w-3.5 h-3.5" /></button>
              <span className="text-[10px] font-mono font-bold text-cyan-400 px-1">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))} className="p-1 text-slate-400 hover:text-white"><ZoomIn className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          {/* Interactive Workspace Canvas */}
          <div
            ref={canvasRef}
            onMouseMove={handleMouseMoveCanvas}
            onMouseUp={handleMouseUpCanvas}
            onMouseLeave={handleMouseUpCanvas}
            className="relative w-full h-[580px] rounded-2xl bg-[#091527] border-2 border-slate-800 overflow-hidden shadow-2xl cursor-default"
            style={{
              backgroundImage: 'radial-gradient(rgba(0, 240, 255, 0.08) 1.5px, transparent 1.5px)',
              backgroundSize: `${24 * zoomLevel}px ${24 * zoomLevel}px`,
            }}
          >
            {/* Prompt when wiring */}
            {wiringStart && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs shadow-xl animate-bounce">
                ⚡ انقر على الطرف الآخر لإكمال التوصيل بالسلك...
              </div>
            )}

            {/* Transform Container with Zoom */}
            <div
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top left',
                width: '100%',
                height: '100%',
              }}
              className="relative w-full h-full"
            >
              {/* Render Connecting Jumper Wires with Realistic Curves */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                {wires.map((w) => {
                  const fromComp = components.find((c) => c.id === w.fromCompId);
                  const toComp = components.find((c) => c.id === w.toCompId);
                  if (!fromComp || !toComp) return null;

                  const fromPin = fromComp.pins.find((p) => p.id === w.fromPinId);
                  const toPin = toComp.pins.find((p) => p.id === w.toPinId);

                  const x1 = fromComp.x + (fromPin?.x || 20);
                  const y1 = fromComp.y + (fromPin?.y || 20);
                  const x2 = toComp.x + (toPin?.x || 20);
                  const y2 = toComp.y + (toPin?.y || 20);

                  const controlX = (x1 + x2) / 2;
                  const controlY = (y1 + y2) / 2 + 35;
                  const isWireSelected = selectedWireId === w.id;

                  return (
                    <g key={w.id} className="pointer-events-auto cursor-pointer" onClick={() => setSelectedWireId(w.id)}>
                      {/* Wire Outer Shadow */}
                      <path
                        d={`M ${x1} ${y1} Q ${controlX} ${controlY + 4} ${x2} ${y2}`}
                        fill="none"
                        stroke="#000000"
                        strokeWidth={6}
                        opacity={0.35}
                      />
                      {/* Realistic Insulated Copper Wire */}
                      <path
                        d={`M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`}
                        fill="none"
                        stroke={isWireSelected ? '#ffffff' : w.color || '#3b82f6'}
                        strokeWidth={isWireSelected ? 5 : 3.8}
                        strokeLinecap="round"
                        className="transition-all hover:stroke-white"
                      />
                      {/* Wire Midpoint Delete Button */}
                      {isWireSelected && (
                        <circle
                          cx={controlX}
                          cy={controlY}
                          r={10}
                          fill="#ef4444"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWire(w.id);
                          }}
                          className="cursor-pointer"
                        />
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Render Realistic Draggable Components on Workbench */}
              {components.map((comp) => {
                const isSelected = selectedCompId === comp.id;

                return (
                  <div
                    key={comp.id}
                    onMouseDown={(e) => handleMouseDownComp(e, comp.id)}
                    style={{
                      left: `${comp.x}px`,
                      top: `${comp.y}px`,
                      transform: `rotate(${comp.rotation}deg)`,
                      transformOrigin: 'center center',
                    }}
                    className={`absolute z-20 cursor-grab active:cursor-grabbing transition-shadow select-none group ${
                      isSelected
                        ? 'ring-4 ring-amber-400/50 rounded-2xl drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                        : 'hover:drop-shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                    }`}
                  >
                    {/* Realistic SVG Rendering */}
                    <div className="relative pointer-events-none">
                      {renderRealisticInteractiveComponent(comp, isSimulating)}
                    </div>

                    {/* Exact Electrical Pin Terminals for Live Wiring */}
                    {comp.pins.map((pin) => {
                      const isWiringTarget = wiringStart?.compId === comp.id && wiringStart?.pinId === pin.id;

                      return (
                        <button
                          key={pin.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePinClick(comp.id, pin.id);
                          }}
                          style={{
                            left: `${pin.x}px`,
                            top: `${pin.y}px`,
                            transform: 'translate(-50%, -50%)',
                          }}
                          className={`absolute z-30 w-3.5 h-3.5 rounded-full border-2 transition-transform ${
                            isWiringTarget
                              ? 'bg-amber-400 border-white scale-150 ring-4 ring-amber-500/60'
                              : 'bg-slate-900 border-cyan-400 hover:scale-150 hover:bg-cyan-400'
                          }`}
                          title={`منفذ كهربائي: ${pin.name}`}
                        >
                          {/* Tooltip on pin hover */}
                          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-black/95 text-cyan-300 font-mono text-[9px] px-2 py-0.5 rounded whitespace-nowrap z-50 border border-cyan-500/40 shadow-lg">
                            {pin.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Component Parameter Inspector */}
          {selectedComp && (
            <div className="bg-[#0D1B2A] border border-cyan-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                  ⚙️
                </div>
                <div>
                  <span className="font-extrabold text-white block">
                    التحكم وتعديل القطعة: {selectedComp.name}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    الموقع: X={Math.round(selectedComp.x)}, Y={Math.round(selectedComp.y)} | الزاوية: {selectedComp.rotation}°
                  </span>
                </div>
              </div>

              {/* Action Buttons: Rotate, Duplicate, Delete, Value */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-slate-300 font-bold">القيمة ({selectedComp.unit}):</label>
                  <input
                    type="number"
                    value={selectedComp.value}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setComponents(
                        components.map((c) => (c.id === selectedComp.id ? { ...c, value: val } : c))
                      );
                    }}
                    className="w-24 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-400 font-mono font-bold"
                  />
                </div>

                <button
                  onClick={() => handleRotateComponent(selectedComp.id)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1.5 border border-slate-700"
                >
                  <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>تدوير +90°</span>
                </button>

                <button
                  onClick={() => handleDuplicateComponent(selectedComp.id)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold flex items-center gap-1.5 border border-slate-700"
                >
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>مضاعفة</span>
                </button>

                <button
                  onClick={handleDeleteSelectedComp}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-300 font-bold flex items-center gap-1.5 border border-rose-500/40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف القطعة</span>
                </button>
              </div>
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
            className={`w-24 h-24 rounded-full border-4 shadow-2xl flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 ${
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
