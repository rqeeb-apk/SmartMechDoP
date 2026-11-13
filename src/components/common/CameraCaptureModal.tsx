import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Check, X, Upload, SwitchCamera } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string, fileName: string) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedDataUrl, setCapturedDataUrl] = useState<string>('');
  const [cameraError, setCameraError] = useState<string>('');
  const [isStarting, setIsStarting] = useState<boolean>(false);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async (mode: 'environment' | 'user') => {
    stopStream();
    setCameraError('');
    setIsStarting(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('المتصفح لا يدعم تشغيل الكاميرا المباشرة هنا. يمكنك استخدام التقاط الكاميرا عبر الزر البديل بالأسفل.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setCameraError(
        err?.message ||
          'تعذر فتح الكاميرا (تأكد من منح الإذن للمتصفح أو استخدم زر التقاط من الهاتف).'
      );
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedDataUrl('');
      startCamera(facingMode);
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [isOpen, facingMode]);

  if (!isOpen) return null;

  const handleSnap = () => {
    const video = videoRef.current;
    if (!video) return;

    const vw = video.videoWidth || 1024;
    const vh = video.videoHeight || 768;
    const maxDim = 1200;
    let w = vw;
    let h = vh;
    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedDataUrl(dataUrl);
      stopStream();
    }
  };

  const handleConfirm = () => {
    if (!capturedDataUrl) return;
    onCapture(capturedDataUrl, `camera_snap_${Date.now()}.jpg`);
    onClose();
  };

  const handleFallbackInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          onCapture(canvas.toDataURL('image/jpeg', 0.85), file.name || 'camera_photo.jpg');
          onClose();
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 dark:bg-black/85 backdrop-blur-md p-3 sm:p-4">
      <div className="champagne-card rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl text-[#0F172A] dark:text-slate-100">
        {/* Header */}
        <div className="px-4 py-3 bg-white/80 dark:bg-[#061222] border-b border-[rgba(212,175,55,0.25)] dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#0EA5E9] dark:text-cyan-400" />
            <h3 className="text-sm sm:text-base font-black text-[#0F172A] dark:text-white">تصوير السؤال أو المسألة مباشرة</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              stopStream();
              onClose();
            }}
            className="p-1.5 rounded-lg text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Stage */}
        <div className="p-4 space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-black border border-[rgba(212,175,55,0.3)] dark:border-slate-800 aspect-video flex items-center justify-center">
            {capturedDataUrl ? (
              <img src={capturedDataUrl} alt="الصورة الملتقطة" className="w-full h-full object-contain" />
            ) : cameraError ? (
              <div className="p-6 text-center space-y-3">
                <p className="text-xs text-amber-300 font-bold leading-relaxed">{cameraError}</p>
                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0EA5E9] dark:bg-amber-500 text-white dark:text-slate-950 font-black text-xs cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>فتح كاميرا الهاتف / اختيار صورة</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFallbackInput}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {isStarting && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-xs font-bold text-cyan-300">
                    جاري تشغيل الكاميرا...
                  </div>
                )}
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {!capturedDataUrl ? (
              <>
                <button
                  type="button"
                  onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
                  className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-[#F8FAFC] dark:hover:bg-slate-700 border border-[rgba(212,175,55,0.3)] dark:border-transparent text-[#0F172A] dark:text-slate-200 text-xs font-bold flex items-center gap-1.5"
                >
                  <SwitchCamera className="w-4 h-4 text-[#0EA5E9] dark:text-cyan-400" />
                  <span>تبديل الكاميرا</span>
                </button>

                <label className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-[#F8FAFC] dark:hover:bg-slate-700 border border-[rgba(212,175,55,0.3)] dark:border-transparent text-[#0284C7] dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>كاميرا النظام</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFallbackInput}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleSnap}
                  disabled={!!cameraError || isStarting}
                  className="flex-1 min-w-[120px] py-2.5 px-4 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-gradient-to-r dark:from-cyan-500 dark:to-blue-600 text-white font-black text-xs shadow-md disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>التقاط الصورة</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setCapturedDataUrl('');
                    startCamera(facingMode);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-[#F8FAFC] dark:hover:bg-slate-700 border border-[rgba(212,175,55,0.3)] dark:border-transparent text-[#0F172A] dark:text-slate-200 text-xs font-bold flex items-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span>إعادة التصوير</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 py-2.5 px-5 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-gradient-to-r dark:from-emerald-500 dark:to-teal-500 text-white dark:text-slate-950 font-black text-xs shadow-md flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>اعتماد وإرفاق الصورة</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
