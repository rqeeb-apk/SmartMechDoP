import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DiagnosticError, LabType } from '../../types';
import {
  Zap, Play, RotateCcw, AlertTriangle, Code, Sliders, CheckCircle2, ChevronUp, ChevronDown,
  Layers, Activity, Shield, Box, Bot, Flame, Move, Eye, Plus, Trash2, Copy, RotateCw,
  Camera, Maximize2, Compass, Radio, Disc, Sparkles, SlidersHorizontal
} from 'lucide-react';

import { InteractiveLabWorkspace } from './InteractiveLabWorkspace';

interface LabWorkspace3DProps {
  initialLabType?: LabType;
}

// Interactive 3D item placed on the workbench table
export interface Interactive3DItem {
  id: string;
  name: string;
  type: 'arduino' | 'breadboard' | 'servo' | 'dc_motor' | 'ultrasonic' | 'led' | 'resistor' | 'battery9v' | 'relay';
  label: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  scale: number;
  value: number;
  unit: string;
  color?: string;
}

export const LabWorkspace3D: React.FC<LabWorkspace3DProps> = ({ initialLabType = 'circuits' }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const canvasOscilloscopeRef = useRef<HTMLCanvasElement | null>(null);

  // Lab Type & View Mode
  const [activeLab, setActiveLab] = useState<LabType>(initialLabType);
  const [viewMode, setViewMode] = useState<'3d_sim' | 'drag_drop'>('drag_drop');
  const [isSimulating, setIsSimulating] = useState(true);
  const [showControlsDock, setShowControlsDock] = useState(true);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [interactionMode, setInteractionMode] = useState<'drag' | 'orbit'>('drag');

  // Interactive 3D Objects on Table
  const [placedItems, setPlacedItems] = useState<Interactive3DItem[]>([
    {
      id: 'item_arduino_1',
      name: 'لوحة Arduino UNO R3',
      type: 'arduino',
      label: 'Arduino-1',
      x: -3.5,
      y: 0,
      z: 0.5,
      rotationY: 0,
      scale: 1.0,
      value: 5,
      unit: 'V',
    },
    {
      id: 'item_breadboard_1',
      name: 'لوحة تجارب Breadboard',
      type: 'breadboard',
      label: 'Breadboard-1',
      x: 3.5,
      y: 0,
      z: 0.5,
      rotationY: 0,
      scale: 1.0,
      value: 400,
      unit: 'pins',
    },
    {
      id: 'item_servo_1',
      name: 'محرك سيرفو SG90',
      type: 'servo',
      label: 'Servo-1',
      x: 3.5,
      y: 0.25,
      z: -2.8,
      rotationY: 45,
      scale: 1.0,
      value: 90,
      unit: '°',
    },
    {
      id: 'item_led_1',
      name: 'دايود ضوئي LED متوهج',
      type: 'led',
      label: 'LED-Red',
      x: 1.5,
      y: 0.2,
      z: 0.5,
      rotationY: 0,
      scale: 1.0,
      value: 2.1,
      unit: 'V',
      color: '#ef4444',
    },
    {
      id: 'item_ultrasonic_1',
      name: 'حساس المسافة HC-SR04',
      type: 'ultrasonic',
      label: 'Sonar-1',
      x: -3.5,
      y: 0.2,
      z: -2.8,
      rotationY: 0,
      scale: 1.0,
      value: 25,
      unit: 'cm',
    },
  ]);

  const [selectedItemId, setSelectedItemId] = useState<string | null>('item_arduino_1');

  // Robotic Arm 4-DOF Angles
  const [jointBase, setJointBase] = useState(45);
  const [jointShoulder, setJointShoulder] = useState(30);
  const [jointElbow, setJointElbow] = useState(-45);
  const [jointGripper, setJointGripper] = useState(25);
  const [robotPosX, setRobotPosX] = useState(0);
  const [robotPosZ, setRobotPosZ] = useState(0);

  // Drone 3D Flight State
  const [dronePos, setDronePos] = useState({ x: 0, y: 4.5, z: 0 });
  const [dronePitch, setDronePitch] = useState(0);
  const [droneRoll, setDroneRoll] = useState(0);
  const [droneYaw, setDroneYaw] = useState(0);
  const [propellerSpeed, setPropellerSpeed] = useState(1.0);

  // Mechanical Gear Assembly State
  const [gearRatio, setGearRatio] = useState(2.0); // 1:2
  const [motorRpm, setMotorRpm] = useState(1200);
  const [gear1PosX, setGear1PosX] = useState(-2.6);
  const [gear2PosX, setGear2PosX] = useState(3.8);

  // Conveyor & Automated Sorting State
  const [conveyorSpeed, setConveyorSpeed] = useState(1.5);
  const [sensorPosition, setSensorPosition] = useState(-2.0);
  const [sorterAngle, setSorterAngle] = useState(0);

  // Circuit Electrical Telemetry
  const [dcVoltage, setDcVoltage] = useState(12);
  const [resistorValue, setResistorValue] = useState(220);
  const [frequency, setFrequency] = useState(50);
  const [calculatedCurrent, setCalculatedCurrent] = useState(0);
  const [calculatedPower, setCalculatedPower] = useState(0);
  const [diagnosticsList, setDiagnosticsList] = useState<DiagnosticError[]>([]);

  // Three.js Scene References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // 3D Object Group References
  const itemsGroupsMap = useRef<Map<string, THREE.Group>>(new Map());
  const robotArmGroupRef = useRef<THREE.Group | null>(null);
  const droneGroupRef = useRef<THREE.Group | null>(null);
  const gear1Ref = useRef<THREE.Group | null>(null);
  const gear2Ref = useRef<THREE.Group | null>(null);
  const conveyorGroupRef = useRef<THREE.Group | null>(null);
  const selectionBoxRef = useRef<THREE.BoxHelper | null>(null);

  // Dragging in 3D space refs
  const isDragging3DRef = useRef(false);
  const dragPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseVecRef = useRef(new THREE.Vector2());
  const dragOffsetRef = useRef(new THREE.Vector3());

  // Software WebGL Detection Directive
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

  // Main Three.js Scene Mounting & Setup
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight || 560;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0a192f);
    scene.fog = new THREE.FogExp2(0x0a192f, 0.012);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 11, 18);
    camera.lookAt(0, 1.5, 0);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // 4. RoomEnvironment for realistic PBR metal reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Studio Lighting Rig
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.8);
    keyLight.position.set(12, 16, 12);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const fillLight = new THREE.HemisphereLight(0x00f0ff, 0x0a192f, 1.4);
    scene.add(fillLight);

    // 6. Workbench Table Surface & Technical Grid
    const tableGeo = new THREE.BoxGeometry(26, 0.6, 18);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x0c1b30,
      metalness: 0.3,
      roughness: 0.5,
    });
    const tableMesh = new THREE.Mesh(tableGeo, tableMat);
    tableMesh.position.y = -0.3;
    tableMesh.receiveShadow = !isSoftwareGl;
    scene.add(tableMesh);

    const gridHelper = new THREE.GridHelper(26, 26, 0x00f0ff, 0x1e3a5f);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // 7. OrbitControls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't go below workbench
    controls.minDistance = 4;
    controls.maxDistance = 40;
    controlsRef.current = controls;

    // 8. Visual Selection Box Helper
    const dummyBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    const selectionBox = new THREE.BoxHelper(dummyBox, 0xf59e0b);
    selectionBox.visible = false;
    scene.add(selectionBox);
    selectionBoxRef.current = selectionBox;

    // Build Current Lab 3D Scene
    rebuild3DScene(scene, activeLab, placedItems);

    // Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      controls.update();

      // Dynamic animations per active project
      if (activeLab === 'robotics' && robotArmGroupRef.current) {
        const base = robotArmGroupRef.current.children[0];
        const shoulder = base?.children[0];
        const elbow = shoulder?.children[0];
        const gripper = elbow?.children[0];

        robotArmGroupRef.current.position.set(robotPosX, 0, robotPosZ);
        if (base) base.rotation.y = THREE.MathUtils.degToRad(jointBase);
        if (shoulder) shoulder.rotation.z = THREE.MathUtils.degToRad(jointShoulder);
        if (elbow) elbow.rotation.z = THREE.MathUtils.degToRad(jointElbow);
      }

      if (activeLab === 'drones' && droneGroupRef.current) {
        if (isSimulating) {
          droneGroupRef.current.position.y = dronePos.y + Math.sin(elapsed * 3.5) * 0.15;
          droneGroupRef.current.rotation.x = THREE.MathUtils.degToRad(dronePitch) + Math.sin(elapsed * 2) * 0.02;
          droneGroupRef.current.rotation.z = THREE.MathUtils.degToRad(droneRoll) + Math.cos(elapsed * 2) * 0.02;
          droneGroupRef.current.rotation.y = THREE.MathUtils.degToRad(droneYaw);

          // Spin propellers
          droneGroupRef.current.children.forEach((child) => {
            if (child.name === 'propeller') {
              child.rotation.y += 0.5 * propellerSpeed;
            }
          });
        }
      }

      if (activeLab === 'mechanical' && gear1Ref.current && gear2Ref.current) {
        if (isSimulating) {
          const rotSpeed = (motorRpm / 60) * delta * Math.PI * 2;
          gear1Ref.current.rotation.y += rotSpeed;
          gear2Ref.current.rotation.y -= rotSpeed / Math.max(0.2, gearRatio);
        }
      }

      // Animate active LED glows or motors on table
      if (isSimulating) {
        itemsGroupsMap.current.forEach((grp, id) => {
          const itemData = placedItems.find((p) => p.id === id);
          if (itemData?.type === 'servo') {
            const horn = grp.getObjectByName('servo_horn');
            if (horn) {
              horn.rotation.y = THREE.MathUtils.degToRad(itemData.value);
            }
          }
          if (itemData?.type === 'dc_motor') {
            const shaft = grp.getObjectByName('motor_shaft');
            if (shaft) {
              shaft.rotation.y += 0.2;
            }
          }
        });
      }

      // Update Selection Box Position
      if (selectionBoxRef.current && selectionBoxRef.current.visible && selectedItemId) {
        const selectedGroup = itemsGroupsMap.current.get(selectedItemId);
        if (selectedGroup) {
          selectionBoxRef.current.update();
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight || 560;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [activeLab]);

  // Rebuild 3D scene whenever items or lab type change
  const rebuild3DScene = (scene: THREE.Scene, labType: LabType, items: Interactive3DItem[]) => {
    // Clean old groups
    itemsGroupsMap.current.forEach((grp) => scene.remove(grp));
    itemsGroupsMap.current.clear();

    if (robotArmGroupRef.current) scene.remove(robotArmGroupRef.current);
    if (droneGroupRef.current) scene.remove(droneGroupRef.current);
    if (gear1Ref.current) scene.remove(gear1Ref.current);
    if (gear2Ref.current) scene.remove(gear2Ref.current);
    if (conveyorGroupRef.current) scene.remove(conveyorGroupRef.current);

    if (labType === 'robotics') {
      // 3D 4-DOF Robotic Arm Group
      const robotGroup = createRoboticArm3D();
      robotArmGroupRef.current = robotGroup;
      scene.add(robotGroup);
    } else if (labType === 'drones') {
      // 3D Quadcopter Drone Group
      const droneGroup = createQuadcopterDrone3D();
      droneGroupRef.current = droneGroup;
      scene.add(droneGroup);
    } else if (labType === 'mechanical') {
      // 3D Mechanical Gears Assembly
      const [g1, g2] = createMechanicalGears3D();
      gear1Ref.current = g1;
      gear2Ref.current = g2;
      scene.add(g1);
      scene.add(g2);
    }

    // Always render placed interactive tools and boards on workbench
    items.forEach((item) => {
      const itemGroup = create3DComponentMesh(item);
      itemGroup.position.set(item.x, item.y, item.z);
      itemGroup.rotation.y = THREE.MathUtils.degToRad(item.rotationY);
      itemGroup.scale.set(item.scale, item.scale, item.scale);
      itemGroup.userData = { itemId: item.id };

      scene.add(itemGroup);
      itemsGroupsMap.current.set(item.id, itemGroup);
    });

    updateSelectionHighlight(selectedItemId);
  };

  // Update selection box on target object
  const updateSelectionHighlight = (itemId: string | null) => {
    if (!selectionBoxRef.current) return;
    if (!itemId) {
      selectionBoxRef.current.visible = false;
      return;
    }

    const targetGroup = itemsGroupsMap.current.get(itemId);
    if (targetGroup) {
      selectionBoxRef.current.setFromObject(targetGroup);
      selectionBoxRef.current.visible = true;
    } else {
      selectionBoxRef.current.visible = false;
    }
  };

  useEffect(() => {
    if (!sceneRef.current) return;
    rebuild3DScene(sceneRef.current, activeLab, placedItems);
  }, [placedItems]);

  useEffect(() => {
    updateSelectionHighlight(selectedItemId);
  }, [selectedItemId]);

  // Procedural 3D Model Builders (Three.js Directives)
  const create3DComponentMesh = (item: Interactive3DItem): THREE.Group => {
    const group = new THREE.Group();
    group.name = item.id;

    if (item.type === 'arduino') {
      // Arduino UNO PCB Body
      const pcbGeo = new THREE.BoxGeometry(6.8, 0.35, 5.3);
      const pcbMat = new THREE.MeshStandardMaterial({ color: 0x0055bb, metalness: 0.3, roughness: 0.4 });
      const pcb = new THREE.Mesh(pcbGeo, pcbMat);
      pcb.position.y = 0.18;
      pcb.castShadow = !isSoftwareGl;
      group.add(pcb);

      // Microcontroller IC
      const chipGeo = new THREE.BoxGeometry(3.2, 0.25, 0.85);
      const chipMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8, roughness: 0.2 });
      const chip = new THREE.Mesh(chipGeo, chipMat);
      chip.position.set(0, 0.45, 0.2);
      group.add(chip);

      // USB Port
      const usbGeo = new THREE.BoxGeometry(1.4, 0.9, 1.2);
      const usbMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.95, roughness: 0.1 });
      const usb = new THREE.Mesh(usbGeo, usbMat);
      usb.position.set(-2.8, 0.7, -1.5);
      group.add(usb);

      // DC Barrel Jack
      const jackGeo = new THREE.CylinderGeometry(0.6, 0.6, 1.4, 16);
      const jackMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.5, roughness: 0.3 });
      const jack = new THREE.Mesh(jackGeo, jackMat);
      jack.rotation.z = Math.PI / 2;
      jack.position.set(-2.8, 0.7, 1.6);
      group.add(jack);
    } else if (item.type === 'breadboard') {
      // Breadboard Body
      const bbGeo = new THREE.BoxGeometry(8.2, 0.4, 5.5);
      const bbMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });
      const bb = new THREE.Mesh(bbGeo, bbMat);
      bb.position.y = 0.2;
      bb.castShadow = !isSoftwareGl;
      group.add(bb);

      // Power rails red/blue stripes
      const railGeo = new THREE.BoxGeometry(7.8, 0.05, 0.4);
      const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
      const blueMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });

      const r1 = new THREE.Mesh(railGeo, redMat);
      r1.position.set(0, 0.41, -2.3);
      group.add(r1);

      const r2 = new THREE.Mesh(railGeo, blueMat);
      r2.position.set(0, 0.41, 2.3);
      group.add(r2);
    } else if (item.type === 'servo') {
      // SG90 Blue Casing
      const bodyGeo = new THREE.BoxGeometry(2.3, 2.2, 1.2);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.4, roughness: 0.3 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 1.1;
      group.add(body);

      // Servo Gear Horn (Rotatable)
      const hornGroup = new THREE.Group();
      hornGroup.name = 'servo_horn';
      hornGroup.position.set(0.6, 2.3, 0);

      const hornGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.25, 16);
      const hornArmGeo = new THREE.BoxGeometry(1.6, 0.15, 0.35);
      const hornMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
      const hornMesh = new THREE.Mesh(hornGeo, hornMat);
      const armMesh = new THREE.Mesh(hornArmGeo, hornMat);
      hornGroup.add(hornMesh);
      hornGroup.add(armMesh);
      group.add(hornGroup);
    } else if (item.type === 'dc_motor') {
      // DC Motor Cylindrical Canister
      const motorGeo = new THREE.CylinderGeometry(1.0, 1.0, 2.6, 24);
      const motorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
      const motor = new THREE.Mesh(motorGeo, motorMat);
      motor.rotation.z = Math.PI / 2;
      motor.position.y = 1.0;
      group.add(motor);

      // Rotating Shaft
      const shaftGeo = new THREE.CylinderGeometry(0.18, 0.18, 1.2, 16);
      const shaftMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95 });
      const shaft = new THREE.Mesh(shaftGeo, shaftMat);
      shaft.name = 'motor_shaft';
      shaft.rotation.z = Math.PI / 2;
      shaft.position.set(1.6, 1.0, 0);
      group.add(shaft);
    } else if (item.type === 'led') {
      // LED Glowing Bulb
      const ledGeo = new THREE.SphereGeometry(0.45, 20, 20);
      const ledMat = new THREE.MeshStandardMaterial({
        color: item.color ? parseInt(item.color.replace('#', '0x')) : 0xef4444,
        emissive: item.color ? parseInt(item.color.replace('#', '0x')) : 0xef4444,
        emissiveIntensity: isSimulating ? 1.6 : 0.2,
        roughness: 0.1,
      });
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.y = 1.0;
      group.add(led);

      // LED Legs
      const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8);
      const legMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.9 });
      const l1 = new THREE.Mesh(legGeo, legMat);
      l1.position.set(-0.15, 0.4, 0);
      const l2 = new THREE.Mesh(legGeo, legMat);
      l2.position.set(0.15, 0.4, 0);
      group.add(l1);
      group.add(l2);
    } else if (item.type === 'ultrasonic') {
      // HC-SR04 PCB
      const boardGeo = new THREE.BoxGeometry(4.2, 1.8, 0.25);
      const boardMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.4 });
      const board = new THREE.Mesh(boardGeo, boardMat);
      board.position.y = 1.0;
      group.add(board);

      // Dual Ultrasonic Transducers
      const eyeGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.7, 20);
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85 });
      const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
      eye1.rotation.x = Math.PI / 2;
      eye1.position.set(-1.1, 1.0, 0.4);
      const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
      eye2.rotation.x = Math.PI / 2;
      eye2.position.set(1.1, 1.0, 0.4);
      group.add(eye1);
      group.add(eye2);
    } else if (item.type === 'resistor') {
      // Resistor Ceramic Body
      const rGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.8, 16);
      const rMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });
      const r = new THREE.Mesh(rGeo, rMat);
      r.rotation.z = Math.PI / 2;
      r.position.y = 0.5;
      group.add(r);

      // Color bands
      const bandGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.15, 16);
      const b1 = new THREE.Mesh(bandGeo, new THREE.MeshStandardMaterial({ color: 0xef4444 }));
      b1.rotation.z = Math.PI / 2;
      b1.position.set(-0.4, 0.5, 0);
      const b2 = new THREE.Mesh(bandGeo, new THREE.MeshStandardMaterial({ color: 0x000000 }));
      b2.rotation.z = Math.PI / 2;
      b2.position.set(0.1, 0.5, 0);
      group.add(b1);
      group.add(b2);
    } else {
      // Generic component block
      const defGeo = new THREE.BoxGeometry(2, 1, 1.5);
      const defMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.6 });
      const def = new THREE.Mesh(defGeo, defMat);
      def.position.y = 0.5;
      group.add(def);
    }

    return group;
  };

  // 3D Robotic Arm
  const createRoboticArm3D = (): THREE.Group => {
    const robotGroup = new THREE.Group();
    robotGroup.position.set(robotPosX, 0, robotPosZ);

    // Base pedestal
    const baseGeo = new THREE.CylinderGeometry(2, 2.5, 0.8, 32);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.2 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.4;
    robotGroup.add(baseMesh);

    // Shoulder Link
    const shoulderGeo = new THREE.BoxGeometry(1.2, 3.8, 1.2);
    const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.9, roughness: 0.15 });
    const shoulderMesh = new THREE.Mesh(shoulderGeo, shoulderMat);
    shoulderMesh.position.y = 1.9;
    baseMesh.add(shoulderMesh);

    // Elbow Link
    const elbowGeo = new THREE.BoxGeometry(1.0, 3.2, 1.0);
    const elbowMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.8, roughness: 0.2 });
    const elbowMesh = new THREE.Mesh(elbowGeo, elbowMat);
    elbowMesh.position.y = 3.2;
    shoulderMesh.add(elbowMesh);

    // Gripper Effector
    const gripperGeo = new THREE.SphereGeometry(0.7, 16, 16);
    const gripperMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95 });
    const gripperMesh = new THREE.Mesh(gripperGeo, gripperMat);
    gripperMesh.position.y = 1.8;
    elbowMesh.add(gripperMesh);

    return robotGroup;
  };

  // 3D Quadcopter Drone
  const createQuadcopterDrone3D = (): THREE.Group => {
    const droneGroup = new THREE.Group();
    droneGroup.position.set(dronePos.x, dronePos.y, dronePos.z);

    // Center body
    const bodyGeo = new THREE.BoxGeometry(2.4, 0.5, 2.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.2 });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    droneGroup.add(bodyMesh);

    // 4 Arms and Propellers
    const armOffsets = [
      [-2.4, 0, -2.4],
      [2.4, 0, -2.4],
      [-2.4, 0, 2.4],
      [2.4, 0, 2.4],
    ];

    armOffsets.forEach(([x, y, z]) => {
      const armGeo = new THREE.CylinderGeometry(0.18, 0.18, 3.2);
      const armMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.9 });
      const arm = new THREE.Mesh(armGeo, armMat);
      arm.position.set(x / 2, 0, z / 2);
      arm.rotation.z = Math.PI / 4;
      droneGroup.add(arm);

      // Propeller Blades
      const propGeo = new THREE.BoxGeometry(1.6, 0.06, 0.25);
      const propMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });
      const prop = new THREE.Mesh(propGeo, propMat);
      prop.name = 'propeller';
      prop.position.set(x, 0.35, z);
      droneGroup.add(prop);
    });

    return droneGroup;
  };

  // 3D Mechanical Gears
  const createMechanicalGears3D = (): [THREE.Group, THREE.Group] => {
    const g1 = new THREE.Group();
    const g1Geo = new THREE.CylinderGeometry(2.5, 2.5, 0.6, 24);
    const g1Mat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95, roughness: 0.15 });
    g1.add(new THREE.Mesh(g1Geo, g1Mat));
    g1.position.set(gear1PosX, 1.5, 0);

    const g2 = new THREE.Group();
    const g2Geo = new THREE.CylinderGeometry(4.0, 4.0, 0.6, 36);
    const g2Mat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.95, roughness: 0.15 });
    g2.add(new THREE.Mesh(g2Geo, g2Mat));
    g2.position.set(gear2PosX, 1.5, 0);

    return [g1, g2];
  };

  // Direct 3D Mouse Dragging on Workbench Surface
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;

    const rect = rendererRef.current.domElement.getBoundingClientRect();
    mouseVecRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseVecRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseVecRef.current, cameraRef.current);

    // Collect all selectable meshes
    const selectableMeshes: THREE.Object3D[] = [];
    itemsGroupsMap.current.forEach((grp) => {
      grp.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) selectableMeshes.push(child);
      });
    });

    const intersects = raycasterRef.current.intersectObjects(selectableMeshes, false);

    if (intersects.length > 0) {
      // Find parent group with itemId
      let curr: THREE.Object3D | null = intersects[0].object;
      let foundId: string | null = null;
      while (curr && curr !== sceneRef.current) {
        if (curr.userData && curr.userData.itemId) {
          foundId = curr.userData.itemId;
          break;
        }
        curr = curr.parent;
      }

      if (foundId) {
        setSelectedItemId(foundId);

        if (interactionMode === 'drag') {
          // Temporarily disable OrbitControls while dragging the 3D tool
          if (controlsRef.current) controlsRef.current.enabled = false;
          isDragging3DRef.current = true;

          const intersectPoint = new THREE.Vector3();
          raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, intersectPoint);

          const group = itemsGroupsMap.current.get(foundId);
          if (group) {
            dragOffsetRef.current.copy(group.position).sub(intersectPoint);
          }
        }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging3DRef.current || !selectedItemId || !cameraRef.current) return;

    const rect = rendererRef.current!.domElement.getBoundingClientRect();
    mouseVecRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseVecRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseVecRef.current, cameraRef.current);
    const intersectPoint = new THREE.Vector3();
    const hit = raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, intersectPoint);

    if (hit) {
      const targetPos = intersectPoint.add(dragOffsetRef.current);
      // Clamp to workbench table boundaries
      const clampedX = Math.max(-11.5, Math.min(11.5, targetPos.x));
      const clampedZ = Math.max(-7.5, Math.min(7.5, targetPos.z));

      // Update 3D group position immediately
      const grp = itemsGroupsMap.current.get(selectedItemId);
      if (grp) {
        grp.position.x = clampedX;
        grp.position.z = clampedZ;
      }

      // Sync React state
      setPlacedItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId ? { ...item, x: clampedX, z: clampedZ } : item
        )
      );
    }
  };

  const handlePointerUp = () => {
    isDragging3DRef.current = false;
    if (controlsRef.current) controlsRef.current.enabled = true;
  };

  // Add 3D Tool to Scene
  const handleAdd3DTool = (type: Interactive3DItem['type'], name: string, unit: string, val: number, color?: string) => {
    const newItem: Interactive3DItem = {
      id: `item_${Date.now()}`,
      name,
      type,
      label: `${type.toUpperCase()}-${placedItems.length + 1}`,
      x: (Math.random() - 0.5) * 8,
      y: 0,
      z: (Math.random() - 0.5) * 6,
      rotationY: 0,
      scale: 1.0,
      value: val,
      unit,
      color,
    };

    setPlacedItems([...placedItems, newItem]);
    setSelectedItemId(newItem.id);
    setShowAddMenu(false);
  };

  // Delete Selected 3D Object
  const handleDeleteSelected3D = () => {
    if (!selectedItemId) return;
    setPlacedItems(placedItems.filter((i) => i.id !== selectedItemId));
    setSelectedItemId(null);
  };

  // Duplicate Selected 3D Object
  const handleDuplicateSelected3D = () => {
    const item = placedItems.find((i) => i.id === selectedItemId);
    if (!item) return;

    const cloned: Interactive3DItem = {
      ...item,
      id: `item_${Date.now()}`,
      label: `${item.label}_Copy`,
      x: item.x + 1.5,
      z: item.z + 1.5,
    };

    setPlacedItems([...placedItems, cloned]);
    setSelectedItemId(cloned.id);
  };

  // Camera Presets
  const setCameraPreset = (preset: 'isometric' | 'top' | 'front' | 'closeup' | 'reset') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;

    if (preset === 'isometric') {
      cam.position.set(12, 12, 14);
      ctrl.target.set(0, 1.5, 0);
    } else if (preset === 'top') {
      cam.position.set(0, 22, 0.1);
      ctrl.target.set(0, 0, 0);
    } else if (preset === 'front') {
      cam.position.set(0, 4, 18);
      ctrl.target.set(0, 2, 0);
    } else if (preset === 'closeup') {
      cam.position.set(0, 5, 8);
      ctrl.target.set(0, 1, 0);
    } else {
      cam.position.set(0, 11, 18);
      ctrl.target.set(0, 1.5, 0);
    }
    ctrl.update();
  };

  const selectedItem = placedItems.find((i) => i.id === selectedItemId);

  return (
    <div className="space-y-6 pb-12 font-sans select-none">
      
      {/* Top Header & Lab Mode Navigation */}
      <div className="bg-[#0D1B2A] border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        
        {/* Lab Switcher Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'circuits', label: 'طاولة الدوائر والقطع 3D', icon: Zap },
            { id: 'robotics', label: 'الذراع الروبوتي 4-DOF', icon: Bot },
            { id: 'drones', label: 'طائرة الدرون UAV', icon: Flame },
            { id: 'mechanical', label: 'ميكانيكا التروس والمحركات', icon: Box },
            { id: 'control', label: 'أنظمة التحكم والأتمتة', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeLab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveLab(tab.id as LabType)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold'
                    : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* View Mode & Simulation Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setViewMode('3d_sim')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === '3d_sim'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>المحاكاة ثلاثية الأبعاد 3D</span>
            </button>
            <button
              onClick={() => setViewMode('drag_drop')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'drag_drop'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>مختبر السحب والإفلات (2D Studio)</span>
            </button>
          </div>

          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
              isSimulating
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/20'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/25'
            }`}
          >
            <Play className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'إيقاف المحاكاة' : 'تشغيل المحاكاة'}</span>
          </button>
        </div>
      </div>

      {/* Conditionally Render 2D Studio or Main 3D Viewport */}
      {viewMode === 'drag_drop' ? (
        <InteractiveLabWorkspace />
      ) : (
        /* 3D Viewport with Object Dragging, Gizmo Controls & Telemetry */
        <div className="space-y-4">
          <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl bg-[#0A192F]">
            
            {/* 3D Canvas Mount */}
            <div
              ref={mountRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className={`w-full h-full touch-none ${interactionMode === 'drag' ? 'cursor-grab active:cursor-grabbing' : 'cursor-all-scroll'}`}
            />

            {/* Top-Left: Mode Switcher (Drag Tools vs Orbit Camera) */}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
              <div className="bg-[#0D1B2A]/90 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-1.5 flex items-center gap-1 shadow-2xl">
                <button
                  onClick={() => setInteractionMode('drag')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    interactionMode === 'drag'
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="سحب وتحريك الأدوات واللوحات بحرية على الطاولة"
                >
                  <Move className="w-3.5 h-3.5" />
                  <span>🖐️ سحب الأدوات 3D</span>
                </button>
                <button
                  onClick={() => setInteractionMode('orbit')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    interactionMode === 'orbit'
                      ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="تدوير الكاميرا والتكبير حول الطاولة"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>🔄 تدوير الكاميرا</span>
                </button>
              </div>

              {/* Camera Angle Presets */}
              <div className="bg-[#0D1B2A]/90 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 flex items-center gap-1 text-[11px] font-bold text-slate-300">
                <span className="text-[10px] text-slate-400 font-mono px-1">المنظور:</span>
                <button onClick={() => setCameraPreset('isometric')} className="px-2 py-1 rounded-lg hover:bg-slate-800 text-cyan-300">أيزومتري</button>
                <button onClick={() => setCameraPreset('top')} className="px-2 py-1 rounded-lg hover:bg-slate-800">علوي</button>
                <button onClick={() => setCameraPreset('front')} className="px-2 py-1 rounded-lg hover:bg-slate-800">أمامي</button>
                <button onClick={() => setCameraPreset('closeup')} className="px-2 py-1 rounded-lg hover:bg-slate-800">قريب</button>
                <button onClick={() => setCameraPreset('reset')} className="p-1 rounded-lg hover:bg-slate-800 text-amber-400" title="إعادة ضبط"><RotateCcw className="w-3 h-3" /></button>
              </div>
            </div>

            {/* Top-Right: Add 3D Tool & Board Action Palette */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 hover:scale-105 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ إضافة أداة / لوحة للمشهد 3D</span>
              </button>

              {/* Dropdown Menu of 3D Components */}
              {showAddMenu && (
                <div className="absolute top-12 right-0 w-64 bg-[#0D1B2A] border border-cyan-500/40 rounded-2xl p-2 shadow-2xl space-y-1 text-xs font-bold text-white z-50">
                  <div className="px-2 py-1 text-[10px] text-slate-400 font-mono border-b border-slate-800">
                    اختر المكون لإضافته لفضاء 3D:
                  </div>
                  {[
                    { type: 'arduino', name: 'لوحة Arduino UNO', unit: 'V', val: 5 },
                    { type: 'breadboard', name: 'لوحة تجارب Breadboard', unit: 'pins', val: 400 },
                    { type: 'servo', name: 'محرك سيرفو SG90', unit: '°', val: 90 },
                    { type: 'dc_motor', name: 'محرك DC Motor 12V', unit: 'V', val: 12 },
                    { type: 'ultrasonic', name: 'حساس المسافة HC-SR04', unit: 'cm', val: 25 },
                    { type: 'led', name: 'دايود ضوئي متوهج LED', unit: 'V', val: 2.1, color: '#ef4444' },
                    { type: 'resistor', name: 'مقاومة كهربائية 220Ω', unit: 'Ω', val: 220 },
                  ].map((comp) => (
                    <button
                      key={comp.name}
                      onClick={() => handleAdd3DTool(comp.type as any, comp.name, comp.unit, comp.val, comp.color)}
                      className="w-full text-right px-3 py-2 rounded-xl hover:bg-slate-800 hover:text-cyan-300 transition-colors flex items-center justify-between"
                    >
                      <span>{comp.name}</span>
                      <span className="text-[10px] text-amber-400 font-mono">+ إضافة</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Three.js Ergonomic Collapsible Bottom Control Dock (Directives Compliant) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-4xl">
              <div className="bg-[#0D1B2A]/95 backdrop-blur-md border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
                
                {/* Dock Header Bar */}
                <div
                  onClick={() => setShowControlsDock(!showControlsDock)}
                  className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between cursor-pointer text-xs font-bold text-cyan-400 hover:text-white"
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span>لوحة التحكم وتعديل وتحريك أدوات المختبر والمشاريع 3D</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span>{showControlsDock ? 'إخفاء لوحة التحكم' : 'عرض لوحة التحكم'}</span>
                    {showControlsDock ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </div>
                </div>

                {/* Dock Body */}
                {showControlsDock && (
                  <div className="p-4 space-y-4 max-h-56 overflow-y-auto no-scrollbar text-xs">
                    
                    {/* Specialized Project Controls */}
                    {activeLab === 'robotics' && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                        <div className="space-y-1">
                          <label className="text-slate-300 font-bold block">مفصل القاعدة Base: {jointBase}°</label>
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
                          <label className="text-slate-300 font-bold block">مفصل الكتف Shoulder: {jointShoulder}°</label>
                          <input
                            type="range"
                            min="-45"
                            max="90"
                            value={jointShoulder}
                            onChange={(e) => setJointShoulder(parseInt(e.target.value))}
                            className="w-full accent-cyan-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-slate-300 font-bold block">مفصل الكوع Elbow: {jointElbow}°</label>
                          <input
                            type="range"
                            min="-90"
                            max="60"
                            value={jointElbow}
                            onChange={(e) => setJointElbow(parseInt(e.target.value))}
                            className="w-full accent-cyan-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-slate-300 font-bold block">موقع الروبوت X: {robotPosX.toFixed(1)}</label>
                          <input
                            type="range"
                            min="-8"
                            max="8"
                            step="0.2"
                            value={robotPosX}
                            onChange={(e) => setRobotPosX(parseFloat(e.target.value))}
                            className="w-full accent-amber-400"
                          />
                        </div>
                      </div>
                    )}

                    {activeLab === 'drones' && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                        <div className="space-y-1">
                          <label className="text-slate-300 font-bold block">ارتفاع الدرون Y: {dronePos.y.toFixed(1)}m</label>
                          <input
                            type="range"
                            min="1.0"
                            max="10.0"
                            step="0.2"
                            value={dronePos.y}
                            onChange={(e) => setDronePos({ ...dronePos, y: parseFloat(e.target.value) })}
                            className="w-full accent-cyan-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-slate-300 font-bold block">موقع الدرون X: {dronePos.x.toFixed(1)}</label>
                          <input
                            type="range"
                            min="-8"
                            max="8"
                            step="0.2"
                            value={dronePos.x}
                            onChange={(e) => setDronePos({ ...dronePos, x: parseFloat(e.target.value) })}
                            className="w-full accent-cyan-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-slate-300 font-bold block">زاوية الميلان Pitch: {dronePitch}°</label>
                          <input
                            type="range"
                            min="-30"
                            max="30"
                            value={dronePitch}
                            onChange={(e) => setDronePitch(parseInt(e.target.value))}
                            className="w-full accent-amber-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-slate-300 font-bold block">دوران Yaw: {droneYaw}°</label>
                          <input
                            type="range"
                            min="-180"
                            max="180"
                            value={droneYaw}
                            onChange={(e) => setDroneYaw(parseInt(e.target.value))}
                            className="w-full accent-amber-400"
                          />
                        </div>
                      </div>
                    )}

                    {activeLab === 'mechanical' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                        <div className="space-y-1">
                          <label className="text-slate-300 font-bold block">نسبة التروس Gear Ratio: 1:{gearRatio}</label>
                          <input
                            type="range"
                            min="0.5"
                            max="4.0"
                            step="0.1"
                            value={gearRatio}
                            onChange={(e) => setGearRatio(parseFloat(e.target.value))}
                            className="w-full accent-cyan-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-slate-300 font-bold block">سرعة المحرك RPM: {motorRpm}</label>
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
                        <div className="space-y-1">
                          <label className="text-slate-300 font-bold block">موضع الترس الثاني X: {gear2PosX.toFixed(1)}</label>
                          <input
                            type="range"
                            min="2.0"
                            max="6.0"
                            step="0.2"
                            value={gear2PosX}
                            onChange={(e) => setGear2PosX(parseFloat(e.target.value))}
                            className="w-full accent-amber-400"
                          />
                        </div>
                      </div>
                    )}

                    {/* Selected 3D Object Move, Position & Parameter Controls */}
                    {selectedItem ? (
                      <div className="bg-[#0A192F] p-3 rounded-xl border border-cyan-500/40 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                            <span className="font-extrabold text-white text-xs">
                              الأداة المحددة حالياً: {selectedItem.name} ({selectedItem.label})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleDuplicateSelected3D}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold flex items-center gap-1 border border-slate-700"
                            >
                              <Copy className="w-3 h-3" />
                              <span>نسخ ومضاعفة</span>
                            </button>
                            <button
                              onClick={handleDeleteSelected3D}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-300 font-bold flex items-center gap-1 border border-rose-500/30"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>حذف من المشهد</span>
                            </button>
                          </div>
                        </div>

                        {/* Position & Angle Controls */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <label className="text-slate-300 font-bold block mb-1">الموقع الأفقي X: {selectedItem.x.toFixed(1)}</label>
                            <input
                              type="range"
                              min="-10"
                              max="10"
                              step="0.2"
                              value={selectedItem.x}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setPlacedItems(placedItems.map((i) => (i.id === selectedItem.id ? { ...i, x: val } : i)));
                              }}
                              className="w-full accent-cyan-400"
                            />
                          </div>

                          <div>
                            <label className="text-slate-300 font-bold block mb-1">الموقع العميق Z: {selectedItem.z.toFixed(1)}</label>
                            <input
                              type="range"
                              min="-6"
                              max="6"
                              step="0.2"
                              value={selectedItem.z}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setPlacedItems(placedItems.map((i) => (i.id === selectedItem.id ? { ...i, z: val } : i)));
                              }}
                              className="w-full accent-cyan-400"
                            />
                          </div>

                          <div>
                            <label className="text-slate-300 font-bold block mb-1">زاوية الدوران: {selectedItem.rotationY}°</label>
                            <input
                              type="range"
                              min="0"
                              max="360"
                              step="5"
                              value={selectedItem.rotationY}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setPlacedItems(placedItems.map((i) => (i.id === selectedItem.id ? { ...i, rotationY: val } : i)));
                              }}
                              className="w-full accent-amber-400"
                            />
                          </div>

                          <div>
                            <label className="text-slate-300 font-bold block mb-1">القيمة ({selectedItem.unit}):</label>
                            <input
                              type="number"
                              value={selectedItem.value}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setPlacedItems(placedItems.map((i) => (i.id === selectedItem.id ? { ...i, value: val } : i)));
                              }}
                              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-2 text-slate-400 text-xs">
                        💡 انقر على أي لوحة أو أداة في الفضاء 3D لتحديدها وسحبها وتعديل زاويتها وموقعها
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
