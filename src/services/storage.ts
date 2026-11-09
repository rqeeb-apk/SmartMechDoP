import { Doctor, SavedLecture, LabExperiment, EngineeringBook, VideoResource, StudentProject, CommunityPost, QuizTest, UserProfile } from '../types';

export const OFFICIAL_LOGO_URL = '/assets/aistudio/Meta_AI_896179206_2087651808526245_1938029499613582859_n_20261107_214439.webp_fa36f2e3.jpg';

const INITIAL_DOCTORS: Doctor[] = [
  {
    id: 'doc_1',
    name: 'دكتور الميكاترونكس الذكي',
    subject: 'التحكم الآلي والأنظمة المدمجة والروبوتات',
    specialization: 'دكتوراة في هندسة الميكاترونكس والنظم المدمجة والذكاء الاصطناعي',
    description: 'شرح أكاديمي تفاعلي يدمج التحليل الكهربائي، الميكانيكي، والبرمجة مع السبورة والمختبر 3D.',
    avatarUrl: OFFICIAL_LOGO_URL,
    style: 'real',
    boardColor: 'navy',
    language: 'ar',
    level: 'intermediate',
    voiceSpeed: 1.0,
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'doc_2',
    name: 'د. سارة المحمود',
    subject: 'الروبوتات والديناميكا الميكانيكية',
    specialization: 'أستاذة الروبوتات الطبية والنمذجة ثلاثية الأبعاد Kinematics',
    description: 'شرح مبسط وعميق لمفاهيم الحركة المباشرة والعكسية للروبوتات وتصميم التروس والمحركات.',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop',
    style: 'cartoon',
    boardColor: 'green',
    language: 'ar',
    level: 'advanced',
    voiceSpeed: 1.05,
    isDefault: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'doc_3',
    name: 'Prof. Mark Edison',
    subject: 'Power Electronics & Sensors',
    specialization: 'Senior Mechatronics Consultant & Embedded Hardware Designer',
    description: 'Mastering MOSFET switching, Op-Amps, Transducers, and Signal Processing step-by-step.',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop',
    style: 'illustration',
    boardColor: 'dark',
    language: 'en',
    level: 'intermediate',
    voiceSpeed: 1.0,
    isDefault: false,
    createdAt: new Date().toISOString(),
  }
];

const INITIAL_BOOKS: EngineeringBook[] = [
  {
    id: 'b1',
    title: 'أساسيات الميكاترونكس والنظم المدمجة',
    category: 'ميكاترونكس',
    author: 'د. محمد الكيلاني',
    level: 'مبتدئ - متوسط',
    description: 'مرجع شامل يغطي الحساسات، المشغلات الميكانيكية، متحكمات الأردوينو، ودوائر الواجهة.',
    pages: 340,
    coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop',
    pdfFileName: 'Mechatronics_Fundamentals.pdf',
    rating: 4.9,
    downloadCount: 1420
  },
  {
    id: 'b2',
    title: 'تحليل وتصميم الدوائر الإلكترونية والكهربائية',
    category: 'إلكترونيات',
    author: 'م. خالد الصالص',
    level: 'متوسط',
    description: 'شرح قوانين كيرشوف وشبكات الثنائيات والمعاملات الترانزستورية مع أمثلة حسابية محلولة.',
    pages: 280,
    coverImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop',
    pdfFileName: 'Circuit_Analysis_Guide.pdf',
    rating: 4.8,
    downloadCount: 980
  },
  {
    id: 'b3',
    title: 'حركية الروبوتات والتحكم الآلي Kinematics & Robotics',
    category: 'روبوتات',
    author: 'د. سارة المحمود',
    level: 'متقدم',
    description: 'رياضيات مصفوفات التحويل الدوارة، التحكم في محركات الخطوة والسيرفو وتخطيط المسارات.',
    pages: 410,
    coverImage: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500&auto=format&fit=crop',
    pdfFileName: 'Robotics_Kinematics.pdf',
    rating: 5.0,
    downloadCount: 2150
  },
  {
    id: 'b4',
    title: 'دليل مهندس البرمجة والأنظمة المضمنة ESP32 & Arduino',
    category: 'برمجة',
    author: 'دكتور الميكاترونكس الذكي',
    level: 'جميع المستويات',
    description: 'مشاريع عملية في الاتصال اللاسلكي Wi-Fi/Bluetooth ومعالجة الإشارات في الوقت الحقيقي.',
    pages: 310,
    coverImage: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=500&auto=format&fit=crop',
    pdfFileName: 'Embedded_Systems_ESP32.pdf',
    rating: 4.9,
    downloadCount: 3100
  }
];

const INITIAL_VIDEOS: VideoResource[] = [
  {
    id: 'v1',
    title: 'دورة كاملة في أساسيات الأردوينو والمحاكات ثلاثية الأبعاد',
    category: 'أنظمة مضمنة',
    author: 'قناة دكتور الميكاترونكس الذكي',
    level: 'مبتدئ',
    duration: '45:20',
    youtubeId: 'd8_xXNcGY8o',
    thumbnail: 'https://images.unsplash.com/photo-1553406830-ef2513450d76?w=500&auto=format&fit=crop',
    views: 12500
  },
  {
    id: 'v2',
    title: 'شرح مبسط لقوانين كيرشوف Ohm & Kirchhoff Laws',
    category: 'كهرباء',
    author: 'أكاديمية دكتور الميكاترونكس الذكي',
    level: 'مبتدئ',
    duration: '22:15',
    youtubeId: 'Vd2Uv0_AG7Q',
    thumbnail: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop',
    views: 8900
  },
  {
    id: 'v3',
    title: 'طريقة برمجة وتوجيه الذراع الروبوتية 6-DOF Robot Arm',
    category: 'روبوتات',
    author: 'مختبر دكتور الميكاترونكس 3D',
    level: 'متقدم',
    duration: '38:00',
    youtubeId: '3C8d4sQ9qL4',
    thumbnail: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?w=500&auto=format&fit=crop',
    views: 18400
  }
];

const INITIAL_QUIZZES: QuizTest[] = [
  {
    id: 'q_circuits_1',
    title: 'اختبار قوانين الكهرباء ودوائر التيار المستمر (DC)',
    category: 'كهرباء وإلكترونيات',
    level: 'beginner',
    questionsCount: 5,
    timeMinutes: 10,
    questions: [
      {
        question: 'إذا كان التوصيل على التوالي لمقاومتين R1 = 10 Ohm و R2 = 20 Ohm، فما المقاومة المكافئة Req؟',
        options: ['6.67 Ohm', '30 Ohm', '200 Ohm', '10 Ohm'],
        correctIndex: 1,
        explanation: 'في التوصيل على التوالي تُجمع المقاومات مباشرة: Req = R1 + R2 = 10 + 20 = 30 Ohm.'
      },
      {
        question: 'وفقاً لقانون أوم (Ohm Law)، ما هي المعادلة الصحيحة للتيار I؟',
        options: ['I = V * R', 'I = V / R', 'I = R / V', 'I = V^2 * R'],
        correctIndex: 1,
        explanation: 'قانون أوم ينص على أن V = I * R وبالتالي فإن I = V / R.'
      },
      {
        question: 'ما هو العنصر الإلكتروني الذي يتيح مرور التيار في اتجاه واحد فقط؟',
        options: ['المكثف (Capacitor)', 'الملف (Inductor)', 'الدايود (Diode)', 'المقاومة (Resistor)'],
        correctIndex: 2,
        explanation: 'الدايود (الثنائي) يسمح بالتيار عند التوصيل الأمامي ويمنعه عند التوصيل العكسي.'
      },
      {
        question: 'ما هي القدرة المستهلكة في مقاومة 5 Ohm يمر بها تيار قدره 2 Ampere؟',
        options: ['10 Watt', '20 Watt', '2.5 Watt', '5 Watt'],
        correctIndex: 1,
        explanation: 'قانون القدرة P = I^2 * R = (2)^2 * 5 = 4 * 5 = 20 Watt.'
      },
      {
        question: 'في قانون كيرشوف للتيارات (KCL) عند أي عقدة كهربائية:',
        options: ['مجموع التيار يزداد', 'مجموع التيارات الداخلة يساوي مجموع التيارات الخارجة', 'الجهد دائماً صفر', 'القدرة المفقودة صفر'],
        correctIndex: 1,
        explanation: 'KCL ينص على حفظ الشحنة الكهربائية: مجموع التيارات الداخلة إلى العقدة = مجموع التيارات الخارجة منها.'
      }
    ]
  },
  {
    id: 'q_arduino_1',
    title: 'اختبار الأردوينو والمنافذ الرقمية والتناظرية',
    category: 'أنظمة مضمنة',
    level: 'intermediate',
    questionsCount: 4,
    timeMinutes: 8,
    questions: [
      {
        question: 'ما هي الأوامر البرمجية لضبط المنفذ الرقمي رقم 13 كمخرج في Arduino؟',
        options: ['digitalWrite(13, OUTPUT);', 'pinMode(13, OUTPUT);', 'analogRead(13, OUTPUT);', 'setPin(13, OUT);'],
        correctIndex: 1,
        explanation: 'يتم تحديد اتجاه المنفذ في إعداد setup باستخدام الدالة pinMode(pin, mode).'
      },
      {
        question: 'ما هو النطاق القيمي المقروء بواسطة الدالة analogRead() في لوحة Arduino UNO؟',
        options: ['من 0 إلى 255', 'من 0 إلى 1023', 'من 0 إلى 5000', 'من -5V إلى +5V'],
        correctIndex: 1,
        explanation: 'المحول التناظري إلى رقمي (ADC) في UNO ذو دقة 10-bit، أي يحول الجهد من 0-5V إلى مدى رقمي من 0 إلى 1023.'
      },
      {
        question: 'تُستخدم إشارات التحكم PWM (Pulse Width Modulation) من أجل:',
        options: ['زيادة سعة الذاكرة', 'المحاكاة التناظرية لقيم الجهد والتحكم بشرعة المحركات', 'حساب التردد الرقمي', 'توفير الطاقة الشديد'],
        correctIndex: 1,
        explanation: 'تسمح تقنية PWM بتعديل عرض النبضة للتحكم في متوسط الجهد الخارج وبالتالي التحكم في إضاءة LED أو سرعة محرك DC.'
      },
      {
        question: 'ما هو نوع المحرك الذي يدور بزوايا دقيقة ومحددة (مثل 0 إلى 180 درجة)؟',
        options: ['DC Motor', 'Stepper Motor', 'Servo Motor', 'AC Induction Motor'],
        correctIndex: 2,
        explanation: 'محرك السيرفو يحتوي على تغذية مرتدة داخلياً تسمح بضبط زاوية الدوران بدقة عالية بواسطة نبضات PWM.'
      }
    ]
  }
];

const INITIAL_PROJECTS: StudentProject[] = [
  {
    id: 'p1',
    title: 'ذراع روبوتية ثلاثية الأبعاد متحكمة عبر الإيماءات Gesture Robot Arm',
    authorName: 'م. يوسف العتيبي',
    category: 'روبوتات وميكاترونكس',
    description: 'مشروع متكامل يستخدم حساسات التسارع MPU6050 ولوحة ESP32 للتحكم في 4 محركات سيرفو عن بعد.',
    objectives: [
      'قراءة زوايا إيماءات اليد بواسطة MPU6050',
      'إرسال البيانات عبر ESP-NOW اللاسلكي',
      'حساب زوايا المفاصل وإدارة الحركة بنعومة'
    ],
    bom: [
      { item: 'ESP32 Development Board', quantity: 2, estimatedCost: '$12' },
      { item: 'Servo Motor MG996R', quantity: 4, estimatedCost: '$28' },
      { item: 'MPU6050 Gyro Sensor', quantity: 1, estimatedCost: '$3' },
      { item: 'Battery Pack 7.4V Li-Po', quantity: 1, estimatedCost: '$15' }
    ],
    schematicsDescription: 'توصيل MPU6050 عبر I2C مع ESP32 Transmitter. وتوصيل منافذ PWM مع محركات السيرفو على ESP32 Receiver.',
    codeSnippet: `#include <WiFi.h>\n#include <esp_now.h>\n\n// Doctor Smart Gesture Robot Control Code\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(13, OUTPUT);\n}`,
    status: 'prototype',
    progress: 85,
    likes: 42,
    commentsCount: 9,
    createdAt: new Date().toISOString()
  }
];

const INITIAL_POSTS: CommunityPost[] = [
  {
    id: 'post_1',
    authorName: 'م. عبد العزيز الشمري',
    authorRole: 'مهندس ميكاترونكس - خريج حديث',
    title: 'كيف تختار محرك الخطوة (Stepper) أم السيرفو (Servo) لمشروعك الهندسية؟',
    content: 'كثيراً ما يسأل الطلاب والمبتكرون عن الفرق بين Stepper Motor و Servo Motor في مشاريع الطابعات 3D والأذرع الروبوتية. في هذا المنشور نلخص الفرق في العزم، السرعة، التغذية المرتدة، والتكلفة...',
    category: 'نصائح هندسية',
    tags: ['محركات', 'سيرفو', 'ستبر', 'روبوتات'],
    likes: 28,
    comments: [
      { id: 'c1', author: 'م. سارة', text: 'شرح ممتاز ومفيد جداً! شكراً لك.', date: 'قبل يومين' },
      { id: 'c2', author: 'أحمد علي', text: 'هل ينصح باستخدام السيرفو للـ CNC الصغير؟', date: 'قبل يوم' }
    ],
    createdAt: new Date().toISOString()
  }
];

const nowIso = new Date().toISOString();
const trialExpiresIso = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

const INITIAL_USER: UserProfile = {
  id: 'usr_student_1',
  name: 'طالب ميكاترونكس',
  email: 'student@mechatronics.dr-smart.edu',
  role: 'student',
  specialization: 'هندسة الميكاترونكس والروبوتات',
  level: 'السنة الثالثة الجامعية',
  points: 350,
  completedQuizzesCount: 3,
  savedExperimentsCount: 5,
  createdProjectsCount: 1,
  certificates: [
    { title: 'شهادة إتمام دوائر الكهرباء والإلكترونيات ثلاثية الأبعاد', date: '2026-11-01', score: 95 }
  ],
  createdAt: nowIso,
  subscription: {
    status: 'trial',
    trialStartedAt: nowIso,
    trialExpiresAt: trialExpiresIso,
    priceYER: 4000,
    durationDays: 365,
  }
};

export function checkUserAccessStatus(user: UserProfile): {
  isAccessAllowed: boolean;
  statusType: 'owner' | 'active' | 'trial' | 'trial_expired' | 'expired';
  remainingTrialHours: number;
  remainingTrialMinutes: number;
  remainingTrialSec: number;
  formattedCountdown: string;
} {
  if (!user || user.role === 'owner') {
    return {
      isAccessAllowed: true,
      statusType: 'owner',
      remainingTrialHours: 999,
      remainingTrialMinutes: 999,
      remainingTrialSec: 99999,
      formattedCountdown: 'مالك المنصة الإدارية',
    };
  }

  if (user.subscription?.status === 'active') {
    return {
      isAccessAllowed: true,
      statusType: 'active',
      remainingTrialHours: 365 * 24,
      remainingTrialMinutes: 365 * 24 * 60,
      remainingTrialSec: 365 * 24 * 3600,
      formattedCountdown: 'اشتراك سنوي نشط (365 يومًا)',
    };
  }

  // Calculate 2-Day Trial Precision (48 Hours = 172,800 seconds starting at registration)
  let trialExpiresAt = 0;
  if (user.subscription?.trialExpiresAt) {
    trialExpiresAt = new Date(user.subscription.trialExpiresAt).getTime();
  } else if (user.createdAt) {
    trialExpiresAt = new Date(user.createdAt).getTime() + 48 * 3600 * 1000;
  } else {
    trialExpiresAt = Date.now() + 48 * 3600 * 1000;
  }

  const diffMs = trialExpiresAt - Date.now();

  if (diffMs > 0) {
    const totalSec = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return {
      isAccessAllowed: true,
      statusType: 'trial',
      remainingTrialHours: hours,
      remainingTrialMinutes: Math.floor(totalSec / 60),
      remainingTrialSec: totalSec,
      formattedCountdown: `تجربة مجانية متبقية: ${hours} ساعة و ${mins} دقيقة و ${secs} ثانية`,
    };
  }

  return {
    isAccessAllowed: false,
    statusType: 'trial_expired',
    remainingTrialHours: 0,
    remainingTrialMinutes: 0,
    remainingTrialSec: 0,
    formattedCountdown: 'انتهت التجربة المجانية (48 ساعة)',
  };
}

export async function syncServerSubscriptionStatus(user: UserProfile): Promise<UserProfile> {
  try {
    const res = await fetch('/api/subscriptions/check-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        role: user.role,
        subscription: user.subscription,
      }),
    });
    const data = await res.json();
    if (data.success && data.subscription) {
      return updateUserProfile({ subscription: data.subscription });
    }
  } catch (e) {
    console.error('Error syncing server subscription:', e);
  }
  return user;
}



// Storage Utilities
export const getStoredDoctors = (): Doctor[] => {
  const data = localStorage.getItem('dr_smart_doctors');
  if (!data) {
    localStorage.setItem('dr_smart_doctors', JSON.stringify(INITIAL_DOCTORS));
    return INITIAL_DOCTORS;
  }
  try {
    const docs = JSON.parse(data);
    // Ensure default doctor uses the official logo URL
    if (docs.length > 0 && docs[0].isDefault) {
      docs[0].avatarUrl = OFFICIAL_LOGO_URL;
      docs[0].name = 'دكتور الميكاترونكس الذكي';
    }
    return docs;
  } catch {
    return INITIAL_DOCTORS;
  }
};

export const saveDoctor = (doc: Doctor): Doctor[] => {
  const current = getStoredDoctors();
  const index = current.findIndex(d => d.id === doc.id);
  let updated: Doctor[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = doc;
  } else {
    updated = [doc, ...current];
  }
  localStorage.setItem('dr_smart_doctors', JSON.stringify(updated));
  return updated;
};

export const deleteDoctor = (id: string): Doctor[] => {
  const current = getStoredDoctors();
  const updated = current.filter(d => d.id !== id && !d.isDefault);
  localStorage.setItem('dr_smart_doctors', JSON.stringify(updated));
  return updated;
};

export const getStoredLectures = (): SavedLecture[] => {
  const data = localStorage.getItem('dr_smart_lectures');
  return data ? JSON.parse(data) : [];
};

export const saveLecture = (lecture: SavedLecture): SavedLecture[] => {
  const current = getStoredLectures();
  const updated = [lecture, ...current];
  localStorage.setItem('dr_smart_lectures', JSON.stringify(updated));
  return updated;
};

export const getStoredBooks = (): EngineeringBook[] => {
  const data = localStorage.getItem('dr_smart_books');
  if (!data) {
    localStorage.setItem('dr_smart_books', JSON.stringify(INITIAL_BOOKS));
    return INITIAL_BOOKS;
  }
  return JSON.parse(data);
};

export const getStoredVideos = (): VideoResource[] => {
  const data = localStorage.getItem('dr_smart_videos');
  if (!data) {
    localStorage.setItem('dr_smart_videos', JSON.stringify(INITIAL_VIDEOS));
    return INITIAL_VIDEOS;
  }
  return JSON.parse(data);
};

export const getStoredQuizzes = (): QuizTest[] => {
  const data = localStorage.getItem('dr_smart_quizzes');
  if (!data) {
    localStorage.setItem('dr_smart_quizzes', JSON.stringify(INITIAL_QUIZZES));
    return INITIAL_QUIZZES;
  }
  return JSON.parse(data);
};

export const getStoredProjects = (): StudentProject[] => {
  const data = localStorage.getItem('dr_smart_projects');
  if (!data) {
    localStorage.setItem('dr_smart_projects', JSON.stringify(INITIAL_PROJECTS));
    return INITIAL_PROJECTS;
  }
  return JSON.parse(data);
};

export const saveProject = (proj: StudentProject): StudentProject[] => {
  const current = getStoredProjects();
  const updated = [proj, ...current];
  localStorage.setItem('dr_smart_projects', JSON.stringify(updated));
  return updated;
};

export const getStoredPosts = (): CommunityPost[] => {
  const data = localStorage.getItem('dr_smart_posts');
  if (!data) {
    localStorage.setItem('dr_smart_posts', JSON.stringify(INITIAL_POSTS));
    return INITIAL_POSTS;
  }
  return JSON.parse(data);
};

export const savePost = (post: CommunityPost): CommunityPost[] => {
  const current = getStoredPosts();
  const updated = [post, ...current];
  localStorage.setItem('dr_smart_posts', JSON.stringify(updated));
  return updated;
};

export const getStoredUser = (): UserProfile => {
  const data = localStorage.getItem('dr_smart_user');
  if (!data) {
    localStorage.setItem('dr_smart_user', JSON.stringify(INITIAL_USER));
    return INITIAL_USER;
  }
  return JSON.parse(data);
};

export const updateUserProfile = (profile: Partial<UserProfile>): UserProfile => {
  const current = getStoredUser();
  const updated = { ...current, ...profile };
  localStorage.setItem('dr_smart_user', JSON.stringify(updated));
  return updated;
};
