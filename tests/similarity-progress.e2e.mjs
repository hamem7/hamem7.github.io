// tests/similarity-progress.e2e.mjs — شاشة تقدّم الطالب (ملف الطالب) تعرض سجلات المتشابهات القديمة (الأنواع الخمسة) والجديدة (الأربعة) معاً.
// الاستعمال: PLAYWRIGHT_MODULE_DIR=/opt/node-tools/node_modules node tests/similar-in-games.e2e.mjs [outDir]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(process.env.PLAYWRIGHT_MODULE_DIR ? path.join(process.env.PLAYWRIGHT_MODULE_DIR, '/') : import.meta.url);
const { chromium } = require('playwright');
const outDir = process.argv[2] || null; if (outDir) fs.mkdirSync(outDir, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(REPO, p);
  if (!f.startsWith(REPO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }).listen(0);
await new Promise(r => srv.on('listening', r)); const WEB = `http://localhost:${srv.address().port}`;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });
const ctx = await browser.newContext({ locale: 'ar', viewport: { width: 1180, height: 900 } });
await ctx.route('**/*', r => new URL(r.request().url()).hostname === 'localhost' ? r.continue() : r.abort());
const page = await ctx.newPage(); const errs = [];
page.on('pageerror', e => { errs.push(e.message); console.log('   [pageerror]', e.message); }); page.on('dialog', d => d.dismiss().catch(() => {}));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let ok = 0, bad = 0; const check = (n, c, d = '') => { c ? ok++ : bad++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
await page.goto(WEB + '/index.html'); await page.waitForSelector('#btn-my-students-main', { timeout: 30000 }); await sleep(2500);
await page.evaluate(() => document.querySelector('.dh-tour-skip')?.click());



const R = await page.evaluate(async () => {
  const { AppState } = await import('/core/app.js');
  const id = await AppState.studentManager.addStudent({ name: 'طالب سجلات مختلطة', type: 'adult' });
  const M = AppState.similaritiesManager; if (AppState.similaritiesReady) await AppState.similaritiesReady;
  const T0 = Date.now() - 5 * 86400000;
  // ① جولة قديمة (الأنواع الخمسة القديمة) — عبارة بها ۞ كما حُفظت سابقاً
  await M.recordRound(id, [
    { sig: '2:3,27', groupId: '2-1', anchorPhrase: '۞ ٱلَّذِينَ', surahs: [2], scope: 'internal', results: [{ isCorrect: true, type: 'sim_position' }, { isCorrect: false, type: 'sim_recall' }, { isCorrect: false, type: 'sim_discrimination' }] },
    { sig: 'amma:79-15,85-17,88-1', groupId: 'amma-1', anchorPhrase: 'هَلْ أَتَاكَ', surahs: [79, 85, 88], scope: 'juzAmma', results: [{ isCorrect: true, type: 'sim_recognition' }, { isCorrect: true, type: 'sim_recitation_check' }] }
  ], { scopeTitle: 'قديمة', total: 5, correct: 3, byType: { sim_position: { n: 1, c: 1 }, sim_recall: { n: 1, c: 0 }, sim_discrimination: { n: 1, c: 0 }, sim_recognition: { n: 1, c: 1 }, sim_recitation_check: { n: 1, c: 1 } }, groupsCount: 2 }, T0);
  // ② جولة جديدة (الأنواع الأربعة) على المجموعتين نفسيهما (التوقيع ثابت) + مجموعة جديدة
  await M.recordRound(id, [
    { sig: '2:3,27', groupId: '2-1', anchorPhrase: 'ٱلَّذِينَ', surahs: [2], scope: 'internal', results: [{ isCorrect: false, type: 'sim_complete' }, { isCorrect: false, type: 'sim_next' }] },
    { sig: 'amma:79-15,85-17,88-1', groupId: 'amma-1', anchorPhrase: 'هَلْ أَتَاكَ', surahs: [79, 85, 88], scope: 'juzAmma', results: [{ isCorrect: true, type: 'sim_surah' }, { isCorrect: true, type: 'sim_prev' }] },
    { sig: '46:9,10', groupId: '46-3', anchorPhrase: 'قُلْ أَرَأَيْتُم', surahs: [46], scope: 'internal', results: [{ isCorrect: true, type: 'sim_next' }] }
  ], { scopeTitle: 'جديدة', total: 5, correct: 3, byType: { sim_complete: { n: 1, c: 0 }, sim_next: { n: 2, c: 1 }, sim_surah: { n: 1, c: 1 }, sim_prev: { n: 1, c: 1 } }, groupsCount: 3 }, T0 + 86400000);
  const progress = await M.getProgressByStudent(id), sessions = await M.getSessionsByStudent(id);
  const student = (await AppState.studentManager.getAllStudents()).find(s => s.id === id);
  AppState.currentStudent = student;
  const mod = await import('/student/student.js');
  await mod.loadStudentProfileScreen();
  return { progress: progress.map(p => ({ sig: p.sig, attempts: p.attempts, correct: p.correct, box: p.box, rounds: p.rounds })), sessions: sessions.length, types: sessions.flatMap(s => Object.keys(s.byType || {})) };
});
await page.waitForSelector('#simp-content .simp-summary', { timeout: 20000 });
const ui = await page.evaluate(() => ({ text: document.getElementById('simp-content').innerText, items: [...document.querySelectorAll('#simp-content .simp-summary-item strong')].map(x => x.innerText), hard: [...document.querySelectorAll('#simp-content .simp-hard li')].map(x => x.innerText) }));
console.log(JSON.stringify(R), JSON.stringify(ui));
const rec = (sig) => R.progress.find(p => p.sig === sig);
check('سجلات المجموعتين القديمتين حُدِّثت بالجولة الجديدة (نفس التوقيع): محاولات 3+2 و2+2', rec('2:3,27').attempts === 5 && rec('amma:79-15,85-17,88-1').attempts === 4 && R.progress.length === 3, JSON.stringify(R.progress));
check('سجل الجلسات يضم الأنواع القديمة والجديدة معاً', R.sessions === 2 && ['sim_position', 'sim_recognition', 'sim_recitation_check', 'sim_complete', 'sim_surah', 'sim_prev'].every(k => R.types.includes(k)), R.types.join());
check('ملف الطالب يعرض ملخص الإتقان بلا خلل (3 مجموعات)', ui.items.length === 4 && ui.items[0].endsWith('/3'), ui.items.join(' | '));
check('قائمة «الأصعب» تعرض المجموعة القديمة بلا رمز ۞', ui.hard.length >= 1 && ui.hard.every(h => !h.includes('\u06DE')) && ui.hard.some(h => h.includes('ٱلَّذِينَ')), ui.hard.join(' | '));
check('بلا أخطاء جافاسكربت', errs.length === 0, errs.join(' | '));
console.log(`${ok} PASS / ${bad} FAIL`); await browser.close(); srv.close(); process.exit(bad ? 1 : 0);
