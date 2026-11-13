export type Language = 'ar' | 'en';

export type DoctorStyle = 'real' | 'cartoon' | 'illustration' | 'icon';
export type BoardColor = 'green' | 'navy' | 'dark' | 'white';
export type ExplanationLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface Doctor {
  id: string;
  name: string;
  subject: string;
  specialization: string;
  description: string;
  avatarUrl?: string;
  style: DoctorStyle;
  boardColor: BoardColor;
  language: Language;
  level: ExplanationLevel;
  voiceSpeed: number; // 0.8 to 1.5
  isDefault?: boolean;
  createdAt: string;
}

export interface LectureSection {
  heading: string;
  content: string;
  whiteboardNotes?: string;
  whiteboardDiagramType?: 'circuit' | 'formula' | 'mechanism' | 'block_diagram';
  diagramCommands?: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LectureData {
  title: string;
  objectives: string[];
  sections: LectureSection[];
  solvedExample?: {
    problem: string;
    steps: string[];
    finalAnswer: string;
  };
  summary: string;
  quiz?: QuizQuestion[];
  realWorldExamples?: DoctorRealWorldExample[];
  visualDiagram?: {
    diagramType?: 'circuit' | 'gears' | 'plc' | 'arduino' | 'servo' | 'graph' | 'mindmap';
    diagramTitle?: string;
    equation?: string;
    nodes?: { label: string; value?: string; role?: string }[];
  };
}

export interface SavedLecture {
  id: string;
  doctorId: string;
  doctorName: string;
  title: string;
  subject: string;
  userPrompt: string;
  uploadedFileName?: string;
  data: LectureData;
  createdAt: string;
}

export type LabType = 
  | 'circuits' 
  | 'electronics' 
  | 'arduino' 
  | 'robotics' 
  | 'mechanical' 
  | 'control' 
  | 'drones' 
  | 'innovation';

export interface CircuitComponent {
  id: string;
  name: string;
  type: 'resistor' | 'capacitor' | 'inductor' | 'dc_source' | 'ac_source' | 'led' | 'diode' | 'transistor' | 'switch' | 'meter' | 'arduino' | 'servo' | 'motor' | 'sensor_ultrasonic' | 'lcd';
  label: string;
  value: number; // e.g. resistance in ohms, voltage in volts, capacity in uF
  unit: string;
  color?: string;
  x: number;
  y: number;
  rotation: number;
  pins: { id: string; name: string; x: number; y: number }[];
  state?: any; // voltage, current, pin state, angle, text
}

export interface WireConnection {
  id: string;
  fromCompId: string;
  fromPinId: string;
  toCompId: string;
  toPinId: string;
  color: string;
}

export interface LabExperiment {
  id: string;
  title: string;
  labType: LabType;
  description: string;
  components: CircuitComponent[];
  wires: WireConnection[];
  code?: string;
  createdAt: string;
}

export interface DiagnosticError {
  id: string;
  severity: 'error' | 'warning' | 'info';
  location: string;
  componentName?: string;
  cause: string;
  fixGuide: string;
}

export interface EngineeringBook {
  id: string;
  title: string;
  category: string;
  author: string;
  level: string;
  description: string;
  pages: number;
  coverImage: string;
  pdfFileName: string;
  rating: number;
  downloadCount: number;
  year?: AcademicYearId;
}

export interface VideoResource {
  id: string;
  title: string;
  category: string;
  author: string;
  level: string;
  duration: string;
  youtubeId: string;
  thumbnail: string;
  views: number;
}

export interface StudentProject {
  id: string;
  title: string;
  authorName: string;
  category: string;
  description: string;
  objectives: string[];
  bom: { item: string; quantity: number; estimatedCost: string }[];
  schematicsDescription: string;
  codeSnippet: string;
  status: 'idea' | 'design' | 'simulation' | 'prototype' | 'completed';
  progress: number;
  likes: number;
  commentsCount: number;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  authorName: string;
  authorRole: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  likes: number;
  comments: { id: string; author: string; text: string; date: string }[];
  createdAt: string;
}

export interface QuizTest {
  id: string;
  title: string;
  category: string;
  level: ExplanationLevel;
  questionsCount: number;
  timeMinutes: number;
  questions: QuizQuestion[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  university?: string;
  role: 'student' | 'engineer' | 'owner';
  specialization: string;
  level: string;
  points: number;
  completedQuizzesCount: number;
  savedExperimentsCount: number;
  createdProjectsCount: number;
  certificates: { title: string; date: string; score: number }[];
  createdAt?: string;
  subscription?: {
    status: 'active' | 'trial' | 'trial_expired' | 'inactive' | 'expired' | 'frozen';
    codeUsed?: string;
    trialStartedAt?: string;
    trialExpiresAt?: string;
    activatedAt?: string;
    expiresAt?: string;
    priceYER: number;
    durationDays: number;
  };
}


export interface ActivationCode {
  code: string;
  status: 'unused' | 'active' | 'expired' | 'revoked';
  priceYER: number;
  durationDays: number;
  createdAt: string;
  redeemedBy?: {
    studentName: string;
    studentEmail: string;
  };
  redeemedAt?: string;
  expiresAt?: string;
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  event: string;
  category: 'auth' | 'redemption' | 'security' | 'system' | 'ai_quota';
  ip: string;
  details: string;
  severity: 'info' | 'warning' | 'danger';
}

export interface PlatformSystemConfig {
  maintenanceMode: boolean;
  platformTitle: string;
  platformSubtitle: string;
  logoUrl: string;
  yearlyPriceYER: number;
  yearlyDurationDays: number;
  aiPrimaryModel: string;
  aiFallbackModel: string;
  aiMaxTokensPerReq: number;
  avatarLipSyncSensitivity: number;
  whiteboardSpeed: number;
  currency: string;
}

export type StudentLevel = 'beginner' | 'intermediate' | 'advanced' | 'specialized';
export type LessonSourceType = 'text' | 'image' | 'pdf' | 'document' | 'video';

export interface LessonExplanationData {
  lessonTitle: string;
  studentLevel?: StudentLevel;
  sourceType?: LessonSourceType;
  objectives: string[];
  coreIdea: string;
  sourceAnalysis: {
    detectedType: string;
    sourceQuality: 'clear' | 'partially_clear' | 'unclear';
    unclearNotice?: string;
    scientificErrorsFound?: { sourceText: string; correction: string; explanation: string }[];
    visualElements?: { element: string; description: string; connection: string }[];
    timelineParts?: { timeRange: string; title: string; content: string }[];
  };
  concepts: { title: string; explanation: string; engineeringNotes?: string }[];
  terminology: { termArabic: string; termEnglish: string; simpleDefinition: string }[];
  equations: {
    formula: string;
    name: string;
    description: string;
    symbols: { symbol: string; name: string; unit: string; valueFromSource?: string }[];
    stepByStepSolution?: string[];
  }[];
  solutionSteps?: { stepNumber: number; title: string; description: string; calculation?: string }[];
  practicalApplication: string;
  diagramsExplanation?: string;
  mechatronicsConnection: string;
  summary: string[];
  quizQuestions: { question: string; options: string[]; correctIndex: number; explanation: string }[];
  quickOptions?: string[];
}

export interface LessonFollowupMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isOutOfLessonContext?: boolean;
}

export type SummaryType = 'quick' | 'medium' | 'comprehensive' | 'study' | 'cheatsheet';

export interface LectureSummaryData {
  id?: string;
  title: string;
  summaryType: SummaryType;
  generalIdea: string;
  keyPoints: string[];
  conceptsAndDefinitions: {
    termArabic: string;
    termEnglish?: string;
    definition: string;
  }[];
  equations: {
    formula: string;
    name?: string;
    symbolMeanings: { symbol: string; meaning: string; unit: string }[];
    usageContext: string;
  }[];
  examples: {
    problem: string;
    solutionOutline: string;
    result?: string;
  }[];
  importantNotes: string[];
  conclusion: string;
  diagramsSummary?: {
    diagramName: string;
    description: string;
    keyTakeaway: string;
  }[];
  chaptersOrSections?: {
    sectionTitle: string;
    summary: string;
  }[];
  fileName?: string;
  createdAt?: string;
}

export interface SavedSummaryItem {
  id: string;
  fileName: string;
  title: string;
  summaryType: SummaryType;
  createdAt: string;
  data: LectureSummaryData;
}

export type QuestionFormatType = 'automation' | 'mcq' | 'true_false' | 'essay' | 'direct';

export interface SolvedQuestionItem {
  questionNumber: number;
  questionText: string;
  questionType: QuestionFormatType;
  options?: string[];
  finalAnswerSummary: string;
  reasonAndExplanation: string;
  steps?: string[];
  keyFormula?: string;
}

export interface SolveQuestionsResponse {
  examTitle: string;
  subjectArea: string;
  totalQuestionsFound: number;
  doctorOverviewSpeech: string;
  boardSummaryNotes: string[];
  boardKeyFormula?: string;
  diagramType: 'circuit' | 'gears' | 'plc' | 'arduino' | 'servo' | 'graph' | 'mindmap';
  questions: SolvedQuestionItem[];
}

export type AcademicYearId = 'year1' | 'year2' | 'year3' | 'year4' | 'year5';

export interface DoctorRealWorldExample {
  title: string;
  yemeniAnalogy: string;
  engineeringApplication: string;
}


