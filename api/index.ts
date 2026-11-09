import type { Request, Response } from 'express';
import app from '../src/serverApp.ts';

export default function handler(req: Request, res: Response) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Invocation Fatal Error]:', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      success: false,
      error: err?.message || 'تعذر تشغيل خدمة الذكاء الاصطناعي على Vercel.',
    });
  }
}
