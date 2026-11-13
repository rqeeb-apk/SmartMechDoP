import { readFileAsBase64OrText } from './explainLessonApi';

export interface ProcessedMediaResult {
  content: string;
  mimeType: string;
  fileName: string;
  mediaKind: 'image' | 'video' | 'file' | 'text';
  previewUrl?: string;
  videoFrames?: string[];
  durationSec?: number;
}

/**
 * Extracts evenly spaced JPEG keyframes from a video file using an offscreen <video> + <canvas>.
 * Ensures large lecture/lab videos (MP4/WEBM/MOV) can be analyzed smoothly on mobile & desktop
 * without triggering 413 Payload Too Large limits.
 */
async function extractVideoKeyframes(
  file: File,
  maxFrames: number = 5
): Promise<{ frames: string[]; durationSec: number; previewUrl: string }> {
  const objectUrl = URL.createObjectURL(file);

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    const cleanupFallback = () => {
      resolve({ frames: [], durationSec: 0, previewUrl: objectUrl });
    };

    const timeout = setTimeout(cleanupFallback, 12000);

    video.onloadedmetadata = async () => {
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 4;
      const frames: string[] = [];

      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 360;
      const maxDim = 720;
      let width = vw;
      let height = vh;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(160, width);
      canvas.height = Math.max(120, height);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        clearTimeout(timeout);
        resolve({ frames: [], durationSec: Math.round(duration), previewUrl: objectUrl });
        return;
      }

      const captureAt = (timeSec: number) =>
        new Promise<void>((res) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            try {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              frames.push(canvas.toDataURL('image/jpeg', 0.72));
            } catch {}
            res();
          };
          video.addEventListener('seeked', onSeeked);
          try {
            video.currentTime = Math.min(Math.max(0.05, timeSec), Math.max(0.1, duration - 0.1));
          } catch {
            video.removeEventListener('seeked', onSeeked);
            res();
          }
        });

      const count = duration < 3 ? 2 : maxFrames;
      for (let i = 0; i < count; i++) {
        const target = (duration * (i + 0.5)) / count;
        await captureAt(target);
      }

      clearTimeout(timeout);
      resolve({
        frames,
        durationSec: Math.round(duration),
        previewUrl: objectUrl,
      });
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanupFallback();
    };
  });
}

/**
 * Processes any student attachment (Image, Video, PDF, Document, TXT) cleanly
 */
export async function processUploadedMedia(file: File): Promise<ProcessedMediaResult> {
  const lowerName = file.name.toLowerCase();

  if (file.type.startsWith('image/')) {
    const res = await readFileAsBase64OrText(file);
    return {
      content: res.content,
      mimeType: res.mimeType || 'image/jpeg',
      fileName: file.name,
      mediaKind: 'image',
      previewUrl: URL.createObjectURL(file),
    };
  }

  if (file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|avi)$/i.test(lowerName)) {
    const extracted = await extractVideoKeyframes(file, 5);
    // If small video (< 4.5MB) and no keyframes or small enough, also keep raw data URL option
    if (extracted.frames.length > 0) {
      return {
        content: extracted.frames[0],
        mimeType: 'image/jpeg',
        fileName: file.name,
        mediaKind: 'video',
        previewUrl: extracted.previewUrl,
        videoFrames: extracted.frames,
        durationSec: extracted.durationSec,
      };
    }

    if (file.size <= 4.5 * 1024 * 1024) {
      const res = await readFileAsBase64OrText(file);
      return {
        content: res.content,
        mimeType: file.type || 'video/mp4',
        fileName: file.name,
        mediaKind: 'video',
        previewUrl: extracted.previewUrl,
        durationSec: extracted.durationSec,
      };
    }

    return {
      content: `ملف فيديو مرفوع: ${file.name} (المدة ~${extracted.durationSec || 0} ثانية)`,
      mimeType: 'text/plain',
      fileName: file.name,
      mediaKind: 'video',
      previewUrl: extracted.previewUrl,
      durationSec: extracted.durationSec,
    };
  }

  const res = await readFileAsBase64OrText(file);
  const isTextLike = !res.isBase64;
  return {
    content: res.content || `ملف مرفق: ${file.name}`,
    mimeType: res.mimeType || (lowerName.endsWith('.pdf') ? 'application/pdf' : 'text/plain'),
    fileName: file.name,
    mediaKind: isTextLike ? 'text' : 'file',
  };
}
