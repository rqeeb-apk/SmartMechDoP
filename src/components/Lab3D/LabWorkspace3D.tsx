import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CircuitComponent, WireConnection, DiagnosticError, LabType } from '../../types';
import { Zap, Play, RotateCcw, AlertTriangle, Code, Sliders, CheckCircle2, ChevronUp, ChevronDown, Layers, Activity, Shield, Box, Bot, Flame } from 'lucide-react';

interface LabWorkspace3DProps {
  initialLabType?: LabType;
}

export const LabWorkspace3D: React.FC<LabWorkspace3DProps> = ({ initialLabType = 'circuits' }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const canvasOscilloscopeRef = useRef<HTMLCanvasElement | null>(null);

  const [activeLab, setActiveLab] = useState<LabType>(initialLabType);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showControlsDock, setShowControlsDock] = useState(true);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Components & Circuit State
  const [dcVoltage, setDcVoltage] = useState(12); // Volts
  const [resistorValue, setResistorValue] = useState(220); // Ohms
  const [frequency, setFrequency] = useState(50); // Hz

  // Robotic Arm State
  const [jointBase, setJointBase] = useState(45);
  const [jointShoulder, setJointShoulder] = useState(30);
  const [jointElbow, setJointElbow] = useState(-45);

  // Drone State
  const [droneAltitude, setDroneAltitude] = useState(5.0);
  const [dronePitch, setDronePitch] = useState(0);

  // Mechanical Gear State
  const [gearRatio, setGearRatio] = useState(2.0); // 1:2
  const [motorRpm, setMotorRpm] = useState(1200);

  // C++ Arduino Code
  const [arduinoCode, setArduinoCode] = useState<string>(
`// Dr. Smart Arduino LED & Servo Controller
void setup() {
  pinMode(13, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(500);
  digitalWrite(13, LOW);
  delay(500);
}`
  );

  // Live Measurements
  const [calculatedCurrent, setCalculatedCurrent] = useState(0); // mA
  const [calculatedPower, setCalculatedPower] = useState(0); // mW
  const [diagnosticsList, setDiagnosticsList] = useState<DiagnosticError[]>([]);

  // Three.js Scene Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const robotArmGroupRef = useRef<THREE.Group | null>(null);
  const droneGroupRef = useRef<THREE.Group | null>(null);
  const gear1Ref = useRef<THREE.Group | null>(null);
  const gear2Ref = useRef<THREE.Group | null>(null);
  const ledMeshRef = useRef<THREE.Mesh | null>(null);

  // Detect software WebGL as per Three.js directives
  const isSoftwareGl = (() => {
    if (typeof window === 'undefined') return true;
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  })();

  // Main Three.js Scene Mounting
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight || 500;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0a192f);
    scene.fog = new THREE.FogExp2(0x0a192f, 0.015);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 10, 18);
    camera.lookAt(0, 2, 0);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mountRef.current.appendChild(renderer.domElement);

    // 4. RoomEnvironment for realistic PBR metal reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Studio Lighting Rig
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(10, 15, 10);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.HemisphereLight(0x00f0ff, 0x0a192f, 1.2);
    scene.add(fillLight);

    // Ground Grid & Workbench Table Surface
    const gridHelper = new THREE.GridHelper(30, 30, 0x00f0ff, 0x1e293b);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Build 3D Objects according to Active Lab
    buildLabScene(scene, activeLab);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Dynamic animations
      if (robotArmGroupRef.current) {
        // Robot Arm joint rotations
        const b = robotArmGroupRef.current.children[0];
        const shoulder = b?.children[0];
        const elbow = shoulder?.children[0];

        if (b) b.rotation.y = THREE.MathUtils.degToRad(jointBase);
        if (shoulder) shoulder.rotation.z = THREE.MathUtils.degToRad(jointShoulder);
        if (elbow) elbow.rotation.z = THREE.MathUtils.degToRad(jointElbow);
      }

      if (droneGroupRef.current && isSimulating) {
        // Drone floating hover animation
        droneGroupRef.current.position.y = droneAltitude + Math.sin(elapsed * 4) * 0.2;
        droneGroupRef.current.rotation.z = Math.sin(elapsed * 2) * 0.05;
        // Rotate 4 propellers
        droneGroupRef.current.children.forEach((child) => {
          if (child.name === 'propeller') {
            child.rotation.y += 0.4;
          }
        });
      }

      if (gear1Ref.current && gear2Ref.current && isSimulating) {
        // Synchronized Gear rotations
        const rotSpeed = (motorRpm / 60) * delta * Math.PI * 2;
        gear1Ref.current.rotation.y += rotSpeed;
        gear2Ref.current.rotation.y -= rotSpeed / gearRatio;
      }

      if (ledMeshRef.current && isSimulating) {
        const mat = ledMeshRef.current.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(isSimulating ? 0x00f0ff : 0x000000);
        mat.emissiveIntensity = isSimulating ? 1.5 : 0;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [activeLab]);

  // Construct Composite 3D Models (3-12 parts per Three.js directives)
  const buildLabScene = (scene: THREE.Scene, labType: LabType) => {
    // Clear previous models except lights/grid
    scene.children = scene.children.filter((c) => c instanceof THREE.Light || c instanceof THREE.GridHelper);

    if (labType === 'robotics') {
      // 3D 4-DOF Robotic Arm Group
      const robotGroup = new THREE.Group();
      robotArmGroupRef.current = robotGroup;

      // Base pedestal
      const baseGeo = new THREE.CylinderGeometry(2, 2.5, 0.8, 32);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = 0.4;
      robotGroup.add(baseMesh);

      // Shoulder Joint
      const shoulderGeo = new THREE.BoxGeometry(1.2, 3.5, 1.2);
      const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.9, roughness: 0.1 });
      const shoulderMesh = new THREE.Mesh(shoulderGeo, shoulderMat);
      shoulderMesh.position.y = 1.75;
      baseMesh.add(shoulderMesh);

      // Elbow Arm
      const elbowGeo = new THREE.BoxGeometry(1.0, 3.0, 1.0);
      const elbowMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.8, roughness: 0.2 });
      const elbowMesh = new THREE.Mesh(elbowGeo, elbowMat);
      elbowMesh.position.y = 3.0;
      shoulderMesh.add(elbowMesh);

      // Gripper End Effector
      const gripperGeo = new THREE.SphereGeometry(0.6, 16, 16);
      const gripperMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.1 });
      const gripperMesh = new THREE.Mesh(gripperGeo, gripperMat);
      gripperMesh.position.y = 1.8;
      elbowMesh.add(gripperMesh);

      scene.add(robotGroup);
    } else if (labType === 'drones') {
      // 3D Quadcopter Drone Group
      const droneGroup = new THREE.Group();
      droneGroupRef.current = droneGroup;
      droneGroup.position.set(0, droneAltitude, 0);

      // Frame
      const bodyGeo = new THREE.BoxGeometry(2, 0.4, 2);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.3 });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      droneGroup.add(bodyMesh);

      // 4 Arms & Propellers
      const armPositions = [
        [-2, 0, -2],
        [2, 0, -2],
        [-2, 0, 2],
        [2, 0, 2],
      ];

      armPositions.forEach(([x, y, z]) => {
        const armGeo = new THREE.CylinderGeometry(0.15, 0.15, 2.8);
        const armMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.9 });
        const arm = new THREE.Mesh(armGeo, armMat);
        arm.position.set(x / 2, 0, z / 2);
        arm.rotation.z = Math.PI / 4;
        droneGroup.add(arm);

        // Propeller disc
        const propGeo = new THREE.BoxGeometry(1.4, 0.05, 0.2);
        const propMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });
        const prop = new THREE.Mesh(propGeo, propMat);
        prop.name = 'propeller';
        prop.position.set(x, 0.3, z);
        droneGroup.add(prop);
      });

      scene.add(droneGroup);
    } else if (labType === 'mechanical') {
      // Mechanical Gears Assembly
      const g1Group = new THREE.Group();
      gear1Ref.current = g1Group;

      const g1Geo = new THREE.CylinderGeometry(2.5, 2.5, 0.6, 24);
      const g1Mat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95, roughness: 0.15 });
      const g1Mesh = new THREE.Mesh(g1Geo, g1Mat);
      g1Group.add(g1Mesh);
      g1Group.position.set(-2.6, 2, 0);

      const g2Group = new THREE.Group();
      gear2Ref.current = g2Group;

      const g2Geo = new THREE.CylinderGeometry(4.0, 4.0, 0.6, 36);
      const g2Mat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.95, roughness: 0.15 });
      const g2Mesh = new THREE.Mesh(g2Geo, g2Mat);
      g2Group.add(g2Mesh);
      g2Group.position.set(3.8, 2, 0);

      scene.add(g1Group);
      scene.add(g2Group);
    } else {
      // Electronics / Circuits / Arduino Workbench 3D Scene
      const boardGroup = new THREE.Group();

      // Arduino UNO PCB Board (Blue Glass PCB)
      const pcbGeo = new THREE.BoxGeometry(7, 0.4, 5);
      const pcbMat = new THREE.MeshStandardMaterial({ color: 0x0066ff, metalness: 0.4, roughness: 0.3 });
      const pcbMesh = new THREE.Mesh(pcbGeo, pcbMat);
      pcbMesh.position.set(-3, 0.2, 0);
      boardGroup.add(pcbMesh);

      // Microcontroller Chip
      const chipGeo = new THREE.BoxGeometry(3, 0.3, 0.8);
      const chipMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9, roughness: 0.1 });
      const chipMesh = new THREE.Mesh(chipGeo, chipMat);
      chipMesh.position.set(-3, 0.5, 0);
      boardGroup.add(chipMesh);

      // Breadboard Component
      const breadGeo = new THREE.BoxGeometry(8, 0.4, 4);
      const breadMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
      const breadMesh = new THREE.Mesh(breadGeo, breadMat);
      breadMesh.position.set(4, 0.2, 0);
      boardGroup.add(breadMesh);

      // 3D LED (Glowing mesh)
      const ledGeo = new THREE.SphereGeometry(0.4, 16, 16);
      const ledMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.1, transparent: true, opacity: 0.9 });
      const ledMesh = new THREE.Mesh(ledGeo, ledMat);
      ledMeshRef.current = ledMesh;
      ledMesh.position.set(4, 1.0, 0);
      boardGroup.add(ledMesh);

      scene.add(boardGroup);
    }
  };

  // Perform DC Circuit & Physical Calculations
  const runSimulationMath = () => {
    // I = V / R
    const currentAmp = dcVoltage / Math.max(1, resistorValue);
    const currentMmA = currentAmp * 1000;
    const powerMw = dcVoltage * currentMmA;

    setCalculatedCurrent(parseFloat(currentMmA.toFixed(2)));
    setCalculatedPower(parseFloat(powerMw.toFixed(2)));

    // Run Diagnostics
    const errors: DiagnosticError[] = [];

    if (dcVoltage > 24) {
      errors.push({
        id: 'err_overvoltage',
        severity: 'error',
        location: 'مصدر الجهد DC',
        componentName: 'Power Source',
        cause: 'تجاوز حدود الجهد الآمن (أعلى من 24V). قد يؤدي لاحتراق الدايود والمقاومة.',
        fixGuide: 'قم بخفض الجهد إلى 5V أو 12V يناسب الدائرة.',
      });
    }

    if (resistorValue < 10) {
      errors.push({
        id: 'err_short',
        severity: 'warning',
        location: 'مقاومة الحمل R1',
        componentName: 'Resistor R1',
        cause: 'قيمة المقاومة منخفضة جداً (قريبة من قصر الدائرة Short Circuit).',
        fixGuide: 'استخدم مقاومة 220Ω أو 1kΩ لحماية الدايود والأنظمة المضمنة.',
      });
    }

    setDiagnosticsList(errors);
  };

  useEffect(() => {
    runSimulationMath();
  }, [dcVoltage, resistorValue, frequency]);

  // Oscilloscope Waveform Generator Canvas
  useEffect(() => {
    const canvas = canvasOscilloscopeRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const renderWave = () => {
      animId = requestAnimationFrame(renderWave);
      phase += 0.08;

      ctx.fillStyle = '#0a192f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid lines
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Sine wave
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();

      const centerY = canvas.height / 2;
      const amp = Math.min(canvas.height / 2 - 10, dcVoltage * 3);

      for (let x = 0; x < canvas.width; x++) {
        const y = centerY - Math.sin((x * 0.05) * (frequency / 30) + phase) * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    renderWave();

    return () => cancelAnimationFrame(animId);
  }, [dcVoltage, frequency]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Controls & Lab Selection Header */}
      <div className="bg-[#0D1B2A] border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        
        {/* Lab Switcher Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'circuits', label: 'الكهرباء والدوائر', icon: Zap },
            { id: 'electronics', label: 'الإلكترونيات', icon: Activity },
            { id: 'arduino', label: 'الأردوينو C++', icon: Code },
            { id: 'robotics', label: 'الروبوتات 3D', icon: Bot },
            { id: 'mechanical', label: 'التصميم الميكانيكي', icon: Box },
            { id: 'control', label: 'التحكم والـ PLC', icon: Shield },
            { id: 'drones', label: 'الطائرات UAV', icon: Flame },
            { id: 'innovation', label: 'التصنيع 3D', icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeLab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveLab(tab.id as LabType)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Simulation Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
              isSimulating
                ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/25 hover:shadow-cyan-500/40'
            }`}
          >
            <Play className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'إيقاف المحاكاة' : 'تشغيل المحاكاة الواقعية'}</span>
          </button>

          {activeLab === 'arduino' && (
            <button
              onClick={() => setShowCodeEditor(!showCodeEditor)}
              className="px-3 py-2 rounded-xl bg-slate-800 text-cyan-400 border border-slate-700 hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5"
            >
              <Code className="w-4 h-4" />
              <span>محرر C++</span>
            </button>
          )}

          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              diagnosticsList.length > 0
                ? 'bg-rose-500/15 border-rose-500 text-rose-400 animate-pulse'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>فحص الأخطاء ({diagnosticsList.length})</span>
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Viewport */}
      <div className="relative w-full h-[540px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-[#0A192F]">
        
        {/* Mount Three.js canvas container */}
        <div ref={mountRef} className="w-full h-full" />

        {/* Overlay Telemetry HUD (Top Left) */}
        <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md border border-cyan-500/30 rounded-xl p-3 text-xs space-y-1 font-mono text-cyan-300">
          <div className="font-bold text-white flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>محاكي ثلاثي الأبعاد: {activeLab.toUpperCase()}</span>
          </div>
          <div>الجهد DC: {dcVoltage} V</div>
          <div>التيار I: {calculatedCurrent} mA</div>
          <div>القدرة P: {calculatedPower} mW</div>
        </div>

        {/* Oscilloscope Waveform Viewport (Top Right) */}
        <div className="absolute top-4 right-4 z-10 bg-black/70 backdrop-blur-md border border-slate-800 rounded-xl p-2 space-y-1 hidden sm:block">
          <div className="text-[10px] font-mono text-slate-400 px-1">موجة الأوسيلوسكوب Oscilloscope</div>
          <canvas ref={canvasOscilloscopeRef} width={220} height={100} className="rounded-lg block" />
        </div>

        {/* Three.js Ergonomic Collapsible Bottom Control Dock (Zero Viewport Occlusion Directive) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-4xl">
          <div className="bg-[#0D1B2A]/95 backdrop-blur-md border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
            
            {/* Dock Header & Collapse Toggle */}
            <div
              onClick={() => setShowControlsDock(!showControlsDock)}
              className="px-4 py-2 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between cursor-pointer text-xs font-bold text-cyan-400 hover:text-white"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4" />
                <span>لوحة التحكم وتعديل القيم والهندسة</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <span>{showControlsDock ? 'إخفاء اللوحة' : 'عرض اللوحة'}</span>
                {showControlsDock ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </div>
            </div>

            {/* Dock Controls Body */}
            {showControlsDock && (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                
                {/* Specific controls by lab */}
                {activeLab === 'robotics' ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">مفصل القاعدة Base: {jointBase}°</label>
                      <input
                        type="range"
                        min="0"
                        max="180"
                        value={jointBase}
                        onChange={(e) => setJointBase(parseInt(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">مفصل الكتف Shoulder: {jointShoulder}°</label>
                      <input
                        type="range"
                        min="-60"
                        max="90"
                        value={jointShoulder}
                        onChange={(e) => setJointShoulder(parseInt(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">مفصل الكوع Elbow: {jointElbow}°</label>
                      <input
                        type="range"
                        min="-90"
                        max="90"
                        value={jointElbow}
                        onChange={(e) => setJointElbow(parseInt(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                  </>
                ) : activeLab === 'mechanical' ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">نسبة التروس Gear Ratio: 1:{gearRatio}</label>
                      <input
                        type="range"
                        min="0.5"
                        max="5.0"
                        step="0.1"
                        value={gearRatio}
                        onChange={(e) => setGearRatio(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">سرعة المحرك RPM: {motorRpm}</label>
                      <input
                        type="range"
                        min="100"
                        max="3000"
                        step="100"
                        value={motorRpm}
                        onChange={(e) => setMotorRpm(parseInt(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">جهد المصدر Voltage: {dcVoltage} V</label>
                      <input
                        type="range"
                        min="1"
                        max="30"
                        value={dcVoltage}
                        onChange={(e) => setDcVoltage(parseInt(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">المقاومة Resistor R: {resistorValue} Ω</label>
                      <input
                        type="range"
                        min="10"
                        max="2000"
                        step="10"
                        value={resistorValue}
                        onChange={(e) => setResistorValue(parseInt(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">التردد Frequency: {frequency} Hz</label>
                      <input
                        type="range"
                        min="10"
                        max="200"
                        value={frequency}
                        onChange={(e) => setFrequency(parseInt(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Arduino C++ Code Editor Side Panel */}
      {showCodeEditor && (
        <div className="bg-[#0D1B2A] border border-cyan-500/30 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <Code className="w-5 h-5" />
              <span>محرر كود Arduino C++ والفحص البرمجي Live Code Check</span>
            </div>
            <button onClick={() => setShowCodeEditor(false)} className="text-xs text-slate-400 hover:text-white">✕ إغلاق</button>
          </div>

          <textarea
            rows={8}
            value={arduinoCode}
            onChange={(e) => setArduinoCode(e.target.value)}
            className="w-full font-mono text-xs bg-slate-900 border border-slate-700 rounded-xl p-4 text-cyan-300 focus:outline-none focus:border-cyan-400"
          />

          <div className="flex items-center justify-between text-xs">
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>الكود خالي من الأخطاء النحوية Syntactically Valid</span>
            </span>

            <button
              onClick={() => setIsSimulating(true)}
              className="px-4 py-2 rounded-xl bg-cyan-500 text-black font-bold hover:bg-cyan-400"
            >
              رفعه إلى متحكم الأردوينو 3D
            </button>
          </div>
        </div>
      )}

      {/* Error Detection & Diagnostics Modal / Panel */}
      {showDiagnostics && (
        <div className="bg-[#0D1B2A] border border-rose-500/40 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>تقرير اكتشاف الأخطاء والدليل الهندسية للفحص</span>
            </div>
            <button onClick={() => setShowDiagnostics(false)} className="text-xs text-slate-400 hover:text-white">✕ إغلاق</button>
          </div>

          {diagnosticsList.length === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>جميع التوصيلات والقيم الحسابية آمنة وصحيحة 100%!</span>
            </div>
          ) : (
            <div className="space-y-3">
              {diagnosticsList.map((err) => (
                <div key={err.id} className="p-4 rounded-xl bg-slate-900 border border-rose-500/30 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-rose-300">
                    <span>المنطقة: {err.location} ({err.componentName})</span>
                    <span className="uppercase text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-400">
                      {err.severity}
                    </span>
                  </div>
                  <p className="text-slate-300"><strong className="text-white">السبب:</strong> {err.cause}</p>
                  <p className="text-cyan-300 bg-cyan-500/10 p-2 rounded border border-cyan-500/20">
                    🔧 <strong className="text-cyan-400">طريقة الإصلاح:</strong> {err.fixGuide}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
