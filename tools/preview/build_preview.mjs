// يبني «نسخة تجريبية خاصة» من المنصة في مجلد مستقل (لا يلمس المستودع ولا الموقع المنشور):
//   node tools/preview/build_preview.mjs <مجلد_المخرجات>
// المخرجات: <out>/app/** (نسخة المنصة بملفات التشغيل فقط) + <out>/files.json (قائمة الملفات للنشر).
// التعديلات على النسخة فقط (لا على المستودع):
//   1) INTERNAL_SIM_QUESTIONS_ENABLED = true  ← أسئلة المتشابهات الداخلية (القرآن كله) تعمل.
//   2) نزع GoatCounter وتسجيل الـservice worker (لا تلوّث التحليلات، ولا يعمل في إطار المعاينة أصلاً).
//   3) خادم الواجبات الحقيقي (script.google.com) يُستبدل برابط غير صالح: لا قراءة ولا كتابة على بيانات الإنتاج.
//   4) شريط «نسخة تجريبية» + طالبان تجريبيان (كبير/صغير) يُنشآن مرة واحدة + صفحة تصفح كل الأسئلة preview-questions.html.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(process.argv[2] || 'preview-site');
const appDir = path.join(out, 'app');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(appDir, { recursive: true });

const SKIP = /^(Dar-Ham-Homework-Lab|tests|docs|tools|reports\/similarity-questions|backend|\.github|assets\/mushaf|assets\/certificates)\/|\.md$|^LICENSE$/;
const files = execFileSync('git', ['ls-files', '-z'], { cwd: REPO }).toString('utf8').split('\0').filter(f => f && !SKIP.test(f));
for (const f of files) {
    const dst = path.join(appDir, f);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(path.join(REPO, f), dst);
}
const edit = (rel, fn) => { const p = path.join(appDir, rel); const s = fs.readFileSync(p, 'utf8'); const r = fn(s); if (r === s) throw new Error('لم يتغير: ' + rel); fs.writeFileSync(p, r); };

edit('engine/similarityEngine.js', s => s.replace('INTERNAL_SIM_QUESTIONS_ENABLED = false', 'INTERNAL_SIM_QUESTIONS_ENABLED = true'));
edit('core/api.js', s => s.replace(/export const DEFAULT_API_URL = '[^']+'/, "export const DEFAULT_API_URL = 'https://preview-disconnected.invalid/exec'"));
edit('index.html', s => s
    .replace(/<script data-goatcounter=[^>]*><\/script>/, '')
    .replace("if ('serviceWorker' in navigator) {", "if (false) {")
    .replace('<body class="adult-theme" id="main-body">', `<body class="adult-theme" id="main-body">
    <div id="preview-banner" style="position:fixed;bottom:0;inset-inline:0;z-index:99999;background:#7c2d12;color:#fff;font:600 13px/1.5 system-ui,sans-serif;padding:6px 12px;text-align:center;direction:rtl">
        نسخة تجريبية خاصة: بياناتها منفصلة عن المنصة الحقيقية والخادم غير متصل ·
        <a href="preview-questions.html" style="color:#fed7aa">تصفّح أسئلة القرآن كله</a>
    </div>
    <script type="module">
        // طالبان تجريبيان (مرة واحدة) لتجربة الألعاب: كبير ونطاقه من الناس إلى البقرة، وصغير نطاقه جزء عمّ
        try {
            if (!localStorage.getItem('dh_preview_seeded')) {
                const { AppState } = await import('./core/app.js');
                for (let i = 0; i < 100 && !(AppState.studentManager && AppState.surahsData && AppState.surahsData.length); i++) await new Promise(r => setTimeout(r, 300));
                const nm = (n) => AppState.surahsData.find(s => s.number === n).name;
                await AppState.studentManager.addStudent({ name: 'طالب تجريبي (كبار) — القرآن كله', type: 'adult', memoFrom: nm(114), memoTo: nm(2) });
                await AppState.studentManager.addStudent({ name: 'طفل تجريبي (صغار) — جزء عمّ', type: 'kids', memoFrom: nm(114), memoTo: nm(78) });
                localStorage.setItem('dh_preview_seeded', '1');
            }
        } catch (e) { console.warn('تعذّر إنشاء الطلاب التجريبيين', e); }
    </script>`));

// صفحة تصفّح كل الأسئلة (تولّد من المصحف والمجموعات في المتصفح نفسه)
fs.writeFileSync(path.join(appDir, 'preview-questions.html'), fs.readFileSync(path.join(REPO, 'tools/preview/questions-browser.html'), 'utf8'));

const all = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : all.push(path.relative(out, p).split(path.sep).join('/')); } })(appDir);
fs.writeFileSync(path.join(out, 'files.json'), JSON.stringify(all.sort(), null, 1));
const kb = all.reduce((n, f) => n + fs.statSync(path.join(out, f)).size, 0) / 1024;
console.log(`تم: ${all.length} ملفاً، ${(kb / 1024).toFixed(1)}MB →`, out);
