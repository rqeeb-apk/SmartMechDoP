import { LectureData } from '../../types';

export type DoctorPose = 
  | 'PRESENTING'       // Facing student, gesturing with both hands
  | 'WALKING_TO_BOARD' // Moving towards whiteboard position
  | 'WRITING_FORMULA'  // Right hand raised to board writing formula
  | 'DRAWING_CIRCUIT'  // Moving pen along board drawing schematic
  | 'POINTING_GESTURE' // Pointing with hand/laser to written text
  | 'PAUSE_LISTEN';    // Standing attentively waiting

export interface TimelineEvent {
  id: string;
  timestampSec: number;
  durationSec: number;
  pose: DoctorPose;
  speechChunk: string;
  whiteboardTextToReveal?: string;
  whiteboardDiagramCommand?: string;
  handTargetX?: number; // Target X on whiteboard canvas
  handTargetY?: number; // Target Y on whiteboard canvas
  statusLabel: string;
}

export interface VisemeFrame {
  mouthShape: 'NEUTRAL' | 'A' | 'E' | 'O' | 'M' | 'S';
  mouthOpen: number; // 0.0 (closed) to 1.0 (fully open)
}

/**
 * Builds an explicit, synchronized timeline of events for the Virtual Doctor from LectureData
 */
export function generateLectureTimeline(lectureData: LectureData): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  let currentTime = 0;

  // 1. Introduction Event
  const introSpeech = `${lectureData.title}. مرحباً بكم في المحاضرة. الأهداف التعليمية: ${lectureData.objectives.join('، ')}.`;
  events.push({
    id: 'evt_intro',
    timestampSec: currentTime,
    durationSec: 6.0,
    pose: 'PRESENTING',
    speechChunk: introSpeech,
    statusLabel: '🗣️ الدكتور يتحدث ويشرح أهداف الدرس للطلاب',
  });
  currentTime += 6.0;

  // 2. Sections Breakdown Events
  lectureData.sections.forEach((sec, idx) => {
    // Transition to board
    events.push({
      id: `evt_sec_${idx}_walk`,
      timestampSec: currentTime,
      durationSec: 2.5,
      pose: 'WALKING_TO_BOARD',
      speechChunk: `نبدأ مع الفصل الأول: ${sec.heading}.`,
      statusLabel: '🚶 الدكتور يتوجه نحو السبورة للتوضيح',
    });
    currentTime += 2.5;

    // Writing Notes on Board
    if (sec.whiteboardNotes) {
      events.push({
        id: `evt_sec_${idx}_write`,
        timestampSec: currentTime,
        durationSec: 7.0,
        pose: 'WRITING_FORMULA',
        speechChunk: `نكتب القانون الأساسي على السبورة: ${sec.whiteboardNotes}`,
        whiteboardTextToReveal: sec.whiteboardNotes,
        handTargetX: 120,
        handTargetY: 80 + idx * 60,
        statusLabel: '✍️ الدكتور يكتب المعادلات والقوانين على السبورة مباشرة باليد',
      });
      currentTime += 7.0;
    }

    // Drawing Diagram on Board if present
    if (sec.diagramCommands && sec.diagramCommands.length > 0) {
      events.push({
        id: `evt_sec_${idx}_draw`,
        timestampSec: currentTime,
        durationSec: 6.0,
        pose: 'DRAWING_CIRCUIT',
        speechChunk: 'نقوم الآن برسم مخطط الدائرة والتوصيلات الكهربائية على السبورة.',
        whiteboardDiagramCommand: sec.diagramCommands.join(';'),
        handTargetX: 250,
        handTargetY: 220,
        statusLabel: '🎨 الدكتور يرسم مخطط الدائرة الكهربائية بالتزامن مع الشرح',
      });
      currentTime += 6.0;
    }

    // Pointing and Explaining Section
    events.push({
      id: `evt_sec_${idx}_explain`,
      timestampSec: currentTime,
      durationSec: 8.0,
      pose: 'POINTING_GESTURE',
      speechChunk: sec.content.slice(0, 180),
      handTargetX: 160,
      handTargetY: 100 + idx * 50,
      statusLabel: '👈 الدكتور يشير إلى المخطط على السبورة ويشرح بالتفصيل',
    });
    currentTime += 8.0;
  });

  // 3. Solved Example Event
  if (lectureData.solvedExample) {
    events.push({
      id: 'evt_example_write',
      timestampSec: currentTime,
      durationSec: 8.0,
      pose: 'WRITING_FORMULA',
      speechChunk: `ننتقل لحل المثال التطبيقي: ${lectureData.solvedExample.problem}. والنتيجة النهائية هي ${lectureData.solvedExample.finalAnswer}.`,
      whiteboardTextToReveal: `مثال محلول:\n${lectureData.solvedExample.problem}\nالنتيجة = ${lectureData.solvedExample.finalAnswer}`,
      handTargetX: 120,
      handTargetY: 340,
      statusLabel: '✍️ الدكتور يحل المثال خطوة بخطوة ويكتب النتيجة باليد',
    });
    currentTime += 8.0;
  }

  // 4. Summary & Pause Event
  events.push({
    id: 'evt_summary',
    timestampSec: currentTime,
    durationSec: 5.0,
    pose: 'PRESENTING',
    speechChunk: `ملخص المحاضرة: ${lectureData.summary}`,
    statusLabel: '🗣️ الدكتور يلخص النقاط الرئسية للمحاضرة',
  });
  currentTime += 5.0;

  events.push({
    id: 'evt_pause',
    timestampSec: currentTime,
    durationSec: 10.0,
    pose: 'PAUSE_LISTEN',
    speechChunk: '',
    statusLabel: '🤝 الدكتور يتوقف لانتظار استفسارات وأسئلة الطلاب',
  });

  return events;
}

/**
 * Calculates current lip-sync Viseme shape based on audio speech time and text
 */
export function calculateVisemeFrame(audioTimeSec: number, isSpeaking: boolean): VisemeFrame {
  if (!isSpeaking) {
    return { mouthShape: 'NEUTRAL', mouthOpen: 0.05 };
  }

  // Oscillate mouth open shape rapidly to simulate natural speech cadence
  const cycle = (audioTimeSec * 14) % Math.PI;
  const mouthOpen = Math.abs(Math.sin(cycle)) * 0.85 + 0.1;

  const shapes: VisemeFrame['mouthShape'][] = ['A', 'E', 'O', 'M', 'S'];
  const shapeIndex = Math.floor((audioTimeSec * 8) % shapes.length);

  return {
    mouthShape: shapes[shapeIndex],
    mouthOpen,
  };
}
