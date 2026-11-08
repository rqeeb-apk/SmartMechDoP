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

// 300 Deterministic Activation Codes for Dr. Smart Mechatronics Platform
// Price: 4000 YER | Duration: 365 Days
const SEED_CODE_BASE = [
  'DR-248G3C7X', 'DR-2499FTS5', 'DR-27ZDT5GL', 'DR-28C3K9LX', 'DR-29M4X7PR',
  'DR-2B5V8W1Z', 'DR-2C6X9Y2A', 'DR-2D7Y0Z3B', 'DR-2E8Z1A4C', 'DR-2F9A2B5D',
  'DR-30AB3C6E', 'DR-31BC4D7F', 'DR-32CD5E8G', 'DR-33DE6F9H', 'DR-34EF7G0J',
  'DR-35FG8H1K', 'DR-36GH9J2L', 'DR-37HJ0K3M', 'DR-38JK1L4N', 'DR-39KL2M5P',
  'DR-3AMN3N6Q', 'DR-3BNP4P7R', 'DR-3CPQ5Q8S', 'DR-3DQR6R9T', 'DR-3ERS7S0U',
  'DR-3FST8T1V', 'DR-40TU9U2W', 'DR-41UV0V3X', 'DR-42VW1W4Y', 'DR-43WX2X5Z',
  'DR-44XY3Y6A', 'DR-45YZ4Z7B', 'DR-46ZA5A8C', 'DR-47AB6B9D', 'DR-48BC7C0E',
  'DR-49CD8D1F', 'DR-4ADE9E2G', 'DR-4BEF0F3H', 'DR-4CFG1G4J', 'DR-4DGH2H5K',
  'DR-4EHJ3J6L', 'DR-4FJK4K7M', 'DR-50KL5L8N', 'DR-51LM6M9P', 'DR-52MN7N0Q',
  'DR-53NP8P1R', 'DR-54PQ9Q2S', 'DR-55QR0R3T', 'DR-56RS1S4U', 'DR-57ST2T5V',
  'DR-58TU3U6W', 'DR-59UV4V7X', 'DR-5AWV5W8Y', 'DR-5BWX6X9Z', 'DR-5CXY7Y0A',
  'DR-5DYZ8Z1B', 'DR-5EZA9A2C', 'DR-5FAB0B3D', 'DR-60BC1C4E', 'DR-61CD2D5F'
];

function generate300Codes(): ActivationCode[] {
  const codes: ActivationCode[] = [];
  const createdAt = new Date('2026-11-08T00:00:00Z').toISOString();
  
  // Use base seeds and generate up to 300 unique structured codes
  for (let i = 0; i < 300; i++) {
    let codeStr = '';
    if (i < SEED_CODE_BASE.length) {
      codeStr = SEED_CODE_BASE[i];
    } else {
      const idxStr = (i + 100).toString(36).toUpperCase().padStart(4, 'X');
      const hashStr = Math.abs((i * 1664525 + 1013904223) % 4294967296)
        .toString(36)
        .toUpperCase()
        .padStart(4, 'K');
      codeStr = `DR-${idxStr}${hashStr}`.slice(0, 11);
    }

    codes.push({
      code: codeStr,
      status: 'unused',
      priceYER: 4000,
      durationDays: 365,
      createdAt
    });
  }

  // Ensure last code is DR-ZX2N4K8L
  codes[299].code = 'DR-ZX2N4K8L';

  return codes;
}

export const SEEDED_ACTIVATION_CODES: ActivationCode[] = generate300Codes();
