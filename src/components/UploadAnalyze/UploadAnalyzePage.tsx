import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Download,
  BookOpen,
  FileUp,
  Trash2,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { StudentFileRecord } from '../../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB limit
const INLINE_FALLBACK_LIMIT = 8 * 1024 * 1024; // 8 MB fallback threshold

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isSafeHttpUrl(rawUrl?: string | null): boolean {
  if (!rawUrl) return false;
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isSupportedLectureFile(file: File): boolean {
  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return true;
  if (
    mime === 'image/png' ||
    mime === 'image/jpeg' ||
    mime === 'image/jpg' ||
    mime === 'image/webp' ||
    /\.(png|jpe?g|webp)$/i.test(name)
  ) {
    return true;
  }
  return false;
}

function normalizeStudentFileRow(row: any): StudentFileRecord {
  return {
    id: row.id ?? `${Date.now()}_${Math.random()}`,
    user_id: row.user_id ?? null,
    file_name: row.file_name || row.name || 'ملف محاضرة',
    file_url: row.file_url || row.url || row.public_url || '',
    file_type: row.file_type || row.type || row.mime_type || 'application/pdf',
    file_size: row.file_size ?? row.size ?? null,
    created_at: row.created_at ?? null,
  };
}

async function extractPdfPreviewWithPdfJs(
  file: File
): Promise<{ text: string; pageCount: number }> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages || 0;
    const pagesToRead = Math.min(totalPages, 25);
    const chunks: string[] = [];
    let totalChars = 0;

    for (let pageNum = 1; pageNum <= pagesToRead; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => (typeof item?.str === 'string' ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (pageText) {
        const entry = `[صفحة ${pageNum}]: ${pageText}`;
        chunks.push(entry);
        totalChars += entry.length;
      }
      if (totalChars >= 24000) break;
    }

    return {
      text: chunks.join('\n\n').slice(0, 24000),
      pageCount: totalPages,
    };
  } catch (err) {
    console.warn('[pdfjs-dist] Preview extraction skipped:', err);
    return { text: '', pageCount: 0 };
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('تعذر قراءة الملف محلياً.'));
    reader.readAsDataURL(file);
  });
}

export const UploadAnalyzePage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfMeta, setPdfMeta] = useState<{ pageCount: number; extractedText: string } | null>(null);
  const [studentNote, setStudentNote] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const [studentFiles, setStudentFiles] = useState<StudentFileRecord[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const [analyzingFileId, setAnalyzingFileId] = useState<string | number | null>(null);
  const [activeAnalyzedFile, setActiveAnalyzedFile] = useState<StudentFileRecord | null>(null);
  const [analysisMarkdown, setAnalysisMarkdown] = useState<string>('');
  const [analysisMethod, setAnalysisMethod] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const fetchStudentFiles = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setStudentFiles([]);
      return;
    }
    setLoadingFiles(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      let query = supabase
        .from('student_files')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (session?.user?.id) {
        query = query.eq('user_id', session.user.id);
      }

      const { data, error } = await query;
      if (error) {
        // Retry without user_id filter if table schema doesn't define user_id
        if (error.message?.toLowerCase().includes('user_id')) {
          const fallbackRes = await supabase
            .from('student_files')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
          if (fallbackRes.error) throw fallbackRes.error;
          setStudentFiles((fallbackRes.data || []).map(normalizeStudentFileRow));
          return;
        }
        throw error;
      }

      setStudentFiles((data || []).map(normalizeStudentFileRow));
    } catch (err: any) {
      console.error('Error loading student_files:', err);
      setErrorMessage(
        err?.message
          ? `تعذر جلب قائمة الملفات السابقة من Supabase: ${err.message}`
          : 'تعذر جلب قائمة الملفات السابقة من جدول student_files.'
      );
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    fetchStudentFiles();
  }, [fetchStudentFiles]);

  const handleFileSelection = async (file: File | null | undefined) => {
    setErrorMessage(null);
    setUploadStatus(null);
    if (!file) return;

    if (!isSupportedLectureFile(file)) {
      setSelectedFile(null);
      setPdfMeta(null);
      setErrorMessage(
        'نوع الملف غير مدعوم. يرجى اختيار ملف PDF فقط أو صورة واضحة للمحاضرة (PNG / JPG / WEBP).'
      );
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setSelectedFile(null);
      setPdfMeta(null);
      setErrorMessage(
        `حجم الملف كبير جداً (${formatBytes(file.size)}). الحد الأقصى المسموح هو 20 ميجابايت لتسريع التحليل.`
      );
      return;
    }

    setSelectedFile(file);
    setPdfMeta(null);

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const info = await extractPdfPreviewWithPdfJs(file);
      setPdfMeta({ pageCount: info.pageCount, extractedText: info.text });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = e.dataTransfer?.files?.[0];
    handleFileSelection(dropped);
  };

  const analyzeFileWithGemini = async (
    fileRecord: StudentFileRecord,
    options?: { extractedText?: string; inlineBase64?: string }
  ) => {
    setErrorMessage(null);
    setAnalyzingFileId(fileRecord.id);
    setActiveAnalyzedFile(fileRecord);
    setAnalysisMarkdown('');
    setAnalysisMethod(null);

    try {
      let supabaseAccessToken: string | undefined;
      if (supabase && isSupabaseConfigured) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        supabaseAccessToken = session?.access_token;
      }

      const res = await fetch('/api/gemini/analyze-student-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUrl: fileRecord.file_url,
          fileName: fileRecord.file_name,
          fileType: fileRecord.file_type,
          extractedText: options?.extractedText || '',
          studentNote: studentNote.trim(),
          inlineBase64: options?.inlineBase64,
          supabaseAccessToken,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'فشل تحليل الملف عبر الذكاء الاصطناعي.');
      }

      setAnalysisMarkdown(data.analysis || '');
      setAnalysisMethod(data.method || null);
    } catch (err: any) {
      console.error('Analyze file error:', err);
      setErrorMessage(
        err?.message || 'حدث خطأ غير متوقع أثناء قراءة الملف وتحليله. يرجى المحاولة مجدداً.'
      );
    } finally {
      setAnalyzingFileId(null);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) {
      setErrorMessage('الرجاء اختيار ملف PDF أو صورة محاضرة أولاً.');
      return;
    }

    if (!supabase || !isSupabaseConfigured) {
      setErrorMessage(
        'لم يتم إعداد مفاتيح Supabase (VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY). يرجى تهيئتها لتفعيل الرفع السحابي.'
      );
      return;
    }

    setErrorMessage(null);
    setUploading(true);
    setUploadStatus('جاري رفع الملف إلى التخزين السحابي...');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const ownerFolder = session?.user?.id || 'guest_student';
      const extMatch = selectedFile.name.match(/\.[a-z0-9]+$/i);
      const ext = extMatch ? extMatch[0].toLowerCase() : '.pdf';
      const safeBase = selectedFile.name
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 40) || 'lecture';
      const storagePath = `${ownerFolder}/${Date.now()}_${safeBase}${ext}`;
      const mimeType =
        selectedFile.type || (ext === '.pdf' ? 'application/pdf' : 'image/jpeg');

      const { error: uploadError } = await supabase.storage
        .from('student_uploads')
        .upload(storagePath, selectedFile, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(
          `فشل رفع الملف إلى Bucket (student_uploads): ${uploadError.message}`
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from('student_uploads')
        .getPublicUrl(storagePath);

      const publicUrl = publicUrlData?.publicUrl || '';
      if (!publicUrl) {
        throw new Error('تم رفع الملف لكن تعذر توليد الرابط العام (Public URL).');
      }

      setUploadStatus('جاري حفظ بيانات الملف في سجل الطالب...');

      const basePayload: Record<string, any> = {
        file_name: selectedFile.name,
        file_url: publicUrl,
        file_type: mimeType,
      };
      if (session?.user?.id) {
        basePayload.user_id = session.user.id;
      }

      let insertedRow: any = null;
      const attemptWithSize = await supabase
        .from('student_files')
        .insert({ ...basePayload, file_size: selectedFile.size })
        .select('*')
        .single();

      if (attemptWithSize.error) {
        // Fallback if student_files doesn't have file_size column
        const attemptMinimal = await supabase
          .from('student_files')
          .insert(basePayload)
          .select('*')
          .single();

        if (attemptMinimal.error) {
          throw new Error(
            `تم رفع الملف لكن تعذر حفظ السجل في جدول student_files: ${attemptMinimal.error.message}`
          );
        }
        insertedRow = attemptMinimal.data;
      } else {
        insertedRow = attemptWithSize.data;
      }

      const savedRecord = normalizeStudentFileRow(
        insertedRow || {
          ...basePayload,
          id: Date.now(),
          file_size: selectedFile.size,
          created_at: new Date().toISOString(),
        }
      );

      let inlineFallback: string | undefined;
      if (selectedFile.size <= INLINE_FALLBACK_LIMIT) {
        try {
          inlineFallback = await fileToBase64(selectedFile);
        } catch {
          inlineFallback = undefined;
        }
      }

      const extractedPreviewText = pdfMeta?.extractedText || '';

      setSelectedFile(null);
      setPdfMeta(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setUploadStatus('تم رفع الملف بنجاح! جاري التحليل والشرح مع الدكتور...');

      await fetchStudentFiles();
      await analyzeFileWithGemini(savedRecord, {
        extractedText: extractedPreviewText,
        inlineBase64: inlineFallback,
      });

      setUploadStatus('تم تحليل الملف وتلخيصه بنجاح!');
    } catch (err: any) {
      console.error('Upload & Analyze failed:', err);
      setErrorMessage(err?.message || 'حدث خطأ أثناء رفع الملف.');
      setUploadStatus(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (record: StudentFileRecord) => {
    if (!supabase || !isSupabaseConfigured) return;
    setDeletingId(record.id);
    setErrorMessage(null);
    try {
      const { error } = await supabase
        .from('student_files')
        .delete()
        .eq('id', record.id);
      if (error) throw error;
      setStudentFiles((prev) => prev.filter((item) => item.id !== record.id));
      if (activeAnalyzedFile?.id === record.id) {
        setActiveAnalyzedFile(null);
        setAnalysisMarkdown('');
      }
    } catch (err: any) {
      setErrorMessage(err?.message ? `تعذر حذف الملف: ${err.message}` : 'تعذر حذف السجل.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyMarkdown = () => {
    if (!analysisMarkdown) return;
    navigator.clipboard.writeText(analysisMarkdown);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!analysisMarkdown) return;
    const blob = new Blob([analysisMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const baseName = (activeAnalyzedFile?.file_name || 'lecture_summary').replace(/\.[^.]+$/, '');
    link.download = `${baseName}_شرح_الدكتور.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isBusyAnalyzing = analyzingFileId !== null;

  return (
    <div className="space-y-6 pb-10 font-sans text-[#0F172A] dark:text-slate-100">
      {/* Header Banner */}
      <div className="rounded-2xl sm:rounded-3xl champagne-card dark:bg-gradient-to-br dark:from-[#07152B] dark:via-[#0A1F3D] dark:to-[#061224] dark:border-cyan-500/40 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E0F2FE] dark:bg-amber-500/15 border border-[#0EA5E9]/30 dark:border-amber-400/40 text-[#0284C7] dark:text-amber-300 text-xs font-black">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Upload & Analyze · تحليل المحاضرات والكتب بالذكاء الاصطناعي</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-[#0F172A] dark:text-white">
              📚 ارفع محاضرتك وذاكر مع الدكتور
            </h1>
            <p className="text-xs sm:text-sm text-[#475569] dark:text-slate-300 max-w-2xl leading-relaxed">
              ارفع ملف PDF (محاضرة، كتاب، أو ملخص) أو صورة سبورة، وسيقوم دكتور الميكاترونكس بقراءته بدقة وتلخيصه وشرح المفاهيم الصعبة بلهجة يمنية مبسطة مع حل المسائل والدوائر خطوة بخطوة.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              type="button"
              onClick={fetchStudentFiles}
              disabled={loadingFiles}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.4)] dark:border-cyan-500/40 text-xs font-bold text-[#0F172A] dark:text-cyan-300 hover:border-[#0EA5E9] flex items-center gap-2 transition-colors shadow-sm cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${loadingFiles ? 'animate-spin' : ''}`} />
              <span>تحديث ملفاتي ({studentFiles.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error / Status Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-500/50 text-rose-700 dark:text-rose-200 text-xs sm:text-sm font-bold flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs underline shrink-0 cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {uploadStatus && !errorMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{uploadStatus}</span>
        </div>
      )}

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Right Column: Upload Box + Previous Files */}
        <div className="lg:col-span-5 space-y-6">
          {/* Drag & Drop Upload Box */}
          <div className="rounded-2xl champagne-card dark:bg-[#08172E] dark:border-cyan-500/35 p-5 space-y-4 shadow-lg">
            <h2 className="text-base font-black text-[#0F172A] dark:text-white flex items-center gap-2">
              <FileUp className="w-5 h-5 text-[#0EA5E9] dark:text-amber-400" />
              <span>رفع ملف جديد للمذاكرة</span>
            </h2>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#0EA5E9] bg-[#E0F2FE]/60 dark:border-amber-400 dark:bg-amber-400/10 scale-[1.01]'
                  : 'border-slate-300 dark:border-cyan-500/40 hover:border-[#0EA5E9] dark:hover:border-amber-400 bg-slate-50/70 dark:bg-[#061224]/70'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => handleFileSelection(e.target.files?.[0])}
                className="hidden"
              />

              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#E0F2FE] dark:bg-cyan-500/15 border border-[#0EA5E9]/30 dark:border-cyan-400/40 flex items-center justify-center text-[#0EA5E9] dark:text-cyan-300">
                <Upload className="w-7 h-7" />
              </div>

              <p className="text-sm font-black text-[#0F172A] dark:text-white mb-1">
                اسحب ملف المحاضرة وأفلته هنا
              </p>
              <p className="text-xs text-[#475569] dark:text-slate-400 mb-3">
                يدعم ملفات PDF أو صور المحاضرات (PNG / JPG / WEBP) حتى 20 ميجابايت
              </p>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-[#0EA5E9]/50 dark:border-amber-400/50 text-[#0284C7] dark:text-amber-300 text-xs font-black hover:bg-[#E0F2FE] dark:hover:bg-slate-700 transition-colors shadow-sm cursor-pointer"
              >
                اختر ملف
              </button>
            </div>

            {selectedFile && (
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-slate-900/90 border border-[#0EA5E9]/30 dark:border-cyan-500/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] dark:bg-amber-500/15 flex items-center justify-center shrink-0 text-[#0EA5E9] dark:text-amber-400">
                    {selectedFile.type.startsWith('image/') ? (
                      <ImageIcon className="w-5 h-5" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[#0F172A] dark:text-white truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-[#475569] dark:text-slate-400">
                      {formatBytes(selectedFile.size)}
                      {pdfMeta?.pageCount ? ` • ${pdfMeta.pageCount} صفحة` : ''}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPdfMeta(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline shrink-0 cursor-pointer"
                >
                  إزالة
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#475569] dark:text-slate-300 mb-1.5">
                تركيز أو سؤال خاص حول الملف (اختياري):
              </label>
              <input
                type="text"
                value={studentNote}
                onChange={(e) => setStudentNote(e.target.value)}
                placeholder="مثال: ركّز على حل مسائل الدوائر الكهربائية أو تلخيص القوانين..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-[#0F172A] dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0EA5E9] dark:focus:border-amber-400"
              />
            </div>

            <button
              type="button"
              onClick={handleUploadAndAnalyze}
              disabled={!selectedFile || uploading || isBusyAnalyzing}
              className="w-full min-h-[46px] py-3 px-4 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-gradient-to-r dark:from-amber-400 dark:to-yellow-500 dark:text-slate-950 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري رفع الملف وتحليله...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>رفع وتحليل الملف</span>
                </>
              )}
            </button>
          </div>

          {/* Previous Student Files List */}
          <div className="rounded-2xl champagne-card dark:bg-[#08172E] dark:border-cyan-500/35 p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-[#0F172A] dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0EA5E9] dark:text-cyan-400" />
                <span>ملفاتي المرفوعة سابقاً</span>
              </h2>
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[#475569] dark:text-slate-300">
                {studentFiles.length} ملف
              </span>
            </div>

            {loadingFiles ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-[#475569] dark:text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-[#0EA5E9] dark:text-amber-400" />
                <span>جاري تحميل ملفاتك من Supabase...</span>
              </div>
            ) : studentFiles.length === 0 ? (
              <div className="py-8 text-center rounded-xl bg-slate-50/70 dark:bg-[#061224]/70 border border-slate-200 dark:border-slate-800 px-4">
                <p className="text-xs font-bold text-[#475569] dark:text-slate-400">
                  لا توجد ملفات مرفوعة بعد. ارفع أول محاضرة PDF أو صورة لبدء المذاكرة مع الدكتور!
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {studentFiles.map((fileItem) => {
                  const isPdf =
                    fileItem.file_type.toLowerCase().includes('pdf') ||
                    fileItem.file_name.toLowerCase().endsWith('.pdf');
                  const isCurrentlyAnalyzing = analyzingFileId === fileItem.id;
                  const isSelectedResult = activeAnalyzedFile?.id === fileItem.id;

                  return (
                    <div
                      key={fileItem.id}
                      className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                        isSelectedResult
                          ? 'bg-[#E0F2FE]/50 dark:bg-cyan-500/10 border-[#0EA5E9] dark:border-amber-400'
                          : 'bg-white dark:bg-[#061224] border-slate-200 dark:border-slate-800 hover:border-[#0EA5E9]/60 dark:hover:border-cyan-500/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-[#E0F2FE] dark:bg-slate-800 flex items-center justify-center shrink-0 text-[#0284C7] dark:text-amber-400">
                            {isPdf ? (
                              <FileText className="w-4 h-4" />
                            ) : (
                              <ImageIcon className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-[#0F172A] dark:text-white truncate">
                              {fileItem.file_name}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] text-[#475569] dark:text-slate-400">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold">
                                {isPdf ? 'PDF' : 'صورة'}
                              </span>
                              {fileItem.file_size ? (
                                <span>{formatBytes(fileItem.file_size)}</span>
                              ) : null}
                              {fileItem.created_at ? (
                                <span>
                                  {new Date(fileItem.created_at).toLocaleDateString('ar-YE')}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {isSafeHttpUrl(fileItem.file_url) && (
                            <a
                              href={fileItem.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="فتح الملف"
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#475569] dark:text-slate-300 hover:text-[#0EA5E9] dark:hover:text-cyan-400 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(fileItem)}
                            disabled={deletingId === fileItem.id}
                            title="حذف من القائمة"
                            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => analyzeFileWithGemini(fileItem)}
                        disabled={isBusyAnalyzing || uploading}
                        className="w-full py-2 px-3 rounded-lg bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-gradient-to-r dark:from-cyan-500 dark:to-blue-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isCurrentlyAnalyzing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>الدكتور يقرأ الملف الآن...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>اشرح لي هذا الملف</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Left Column: Formatted Markdown Analysis Screen */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl champagne-card dark:bg-[#08172E] dark:border-cyan-500/35 p-5 sm:p-6 min-h-[540px] flex flex-col shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(212,175,55,0.25)] dark:border-slate-800 pb-4 mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#0EA5E9] dark:text-amber-400" />
                  <span>
                    {activeAnalyzedFile
                      ? `شرح الدكتور: ${activeAnalyzedFile.file_name}`
                      : 'شاشة الشرح والتلخيص التفاعلي'}
                  </span>
                </h2>
                {analysisMethod && (
                  <p className="text-[11px] text-[#475569] dark:text-slate-400 mt-0.5">
                    تم التحليل المباشر بواسطة Gemini ({analysisMethod === 'file_api' ? 'File API' : 'Direct Multimodal'})
                  </p>
                )}
              </div>

              {analysisMarkdown && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyMarkdown}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-[#0F172A] dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedMarkdown ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadMarkdown}
                    className="px-3 py-1.5 rounded-lg bg-[#E0F2FE] dark:bg-amber-500/20 text-[#0284C7] dark:text-amber-300 border border-[#0EA5E9]/30 dark:border-amber-400/40 text-xs font-bold flex items-center gap-1.5 hover:brightness-105 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>حفظ الملخص</span>
                  </button>
                </div>
              )}
            </div>

            {isBusyAnalyzing ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#E0F2FE] dark:bg-amber-500/15 border border-[#0EA5E9]/30 dark:border-amber-400/40 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[#0EA5E9] dark:text-amber-400 animate-spin" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-sm sm:text-base font-black text-[#0F172A] dark:text-white">
                    الدكتور يقرأ الملف ويلخصه لك الآن...
                  </h3>
                  <p className="text-xs text-[#475569] dark:text-slate-400">
                    جاري استخراج النقاط الرئيسية، تبسيط المفاهيم باللهجة اليمنية، وحل أي معادلات أو دوائر خطوة بخطوة.
                  </p>
                </div>
              </div>
            ) : analysisMarkdown ? (
              <div className="flex-1 overflow-y-auto pr-1 text-right leading-relaxed text-sm sm:text-[15px] text-[#0F172A] dark:text-slate-100 space-y-3">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-lg sm:text-xl font-black text-[#0284C7] dark:text-amber-400 border-b border-slate-200 dark:border-slate-800 pb-2 mt-4 mb-3">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-cyan-300 mt-5 mb-2 flex items-center gap-2">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm sm:text-base font-extrabold text-[#0284C7] dark:text-amber-300 mt-4 mb-1.5">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-xs sm:text-sm text-[#334155] dark:text-slate-200 leading-7 mb-2.5">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside space-y-1.5 my-2.5 pr-2 text-xs sm:text-sm text-[#334155] dark:text-slate-200">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside space-y-1.5 my-2.5 pr-2 text-xs sm:text-sm text-[#334155] dark:text-slate-200">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => <li className="leading-7">{children}</li>,
                    strong: ({ children }) => (
                      <strong className="font-black text-[#0F172A] dark:text-amber-300">
                        {children}
                      </strong>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-r-4 border-[#0EA5E9] dark:border-amber-400 bg-[#F8FAFC] dark:bg-slate-900/70 px-4 py-2.5 rounded-l-xl my-3 text-xs sm:text-sm text-[#475569] dark:text-slate-300">
                        {children}
                      </blockquote>
                    ),
                    pre: ({ children }) => (
                      <pre
                        dir="ltr"
                        className="bg-slate-900 text-cyan-300 p-3.5 rounded-xl overflow-x-auto text-xs font-mono my-3 border border-slate-700 text-left"
                      >
                        {children}
                      </pre>
                    ),
                    code: ({ className, children, ...props }) => {
                      const isBlock = Boolean(className);
                      if (isBlock) {
                        return (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      }
                      return (
                        <code
                          dir="ltr"
                          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[#0284C7] dark:text-cyan-300 font-mono text-xs"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-3 rounded-xl border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-xs text-right border-collapse">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="bg-slate-100 dark:bg-slate-800 px-3 py-2 font-black border-b border-slate-200 dark:border-slate-700">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                        {children}
                      </td>
                    ),
                  }}
                >
                  {analysisMarkdown}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-3xl">
                  📚
                </div>
                <h3 className="text-sm sm:text-base font-black text-[#0F172A] dark:text-white">
                  جاهز لقراءة محاضرتك وشرحها لك!
                </h3>
                <p className="text-xs text-[#475569] dark:text-slate-400 max-w-md leading-relaxed">
                  ارفع ملف PDF أو صورة من الصندوق الجانبي واضغط <strong>«رفع وتحليل الملف»</strong>، أو اختر أي ملف من قائمتك السابقة واضغط <strong>«اشرح لي هذا الملف»</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
