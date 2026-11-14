import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './src/serverApp.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = await vite.transformIndexHtml(
          url,
          `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
    <script>
      try {
        if (localStorage.getItem('dr_smart_theme') === 'dark') {
          document.documentElement.classList.add('dark');
        }
      } catch (e) {}
    </script>
    <title>دكتور الميكاترونكس الذكي | Dr Mecha Smart</title>
    <link rel="canonical" href="https://dr-mechasmart.online/" />
    <meta name="description" content="دكتور الميكاترونكس الذكي (Dr Mecha Smart) - المنصة الهندسية والتعليمية المتكاملة لطلاب ومهندسي الميكاترونكس: المختبر الواقعي 3D، خدمة اشرح لي الدرس، لخص لي، قاعة الدكتور الذكي، وحاسبات هندسية متقدمة." />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/roughjs@4.6.6/bundled/rough.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.2/anime.min.js"></script>
  </head>
  <body class="bg-white dark:bg-[#0A192F] text-[#0F172A] dark:text-slate-100 antialiased selection:bg-[#0EA5E9] selection:text-white dark:selection:bg-cyan-500 dark:selection:text-black">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
        );
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

// Start server locally when not running in Vercel Serverless environment
if (!process.env.VERCEL) {
  startServer();
}

export default app;
