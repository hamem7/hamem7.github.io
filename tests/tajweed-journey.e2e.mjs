// tests/tajweed-journey.e2e.mjs — رحلة الحكم في المتصفح: شرح ← تطبيق ← اختبار (رسوب ثم إعادة بعد تطبيق) ← اعتماد المعلم ← فتح المرحلة التالية.
// الاستعمال: PLAYWRIGHT_MODULE_DIR=/opt/node-tools/node_modules [PW_CHROMIUM=/path/chrome] node tests/tajweed-journey.e2e.mjs [outDir]
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
const ctx = await browser.newContext({ locale: 'ar', viewport: { width: 1100, height: 900 } });
await ctx.route('**/*', r => new URL(r.request().url()).hostname === 'localhost' ? r.continue() : r.abort());
const page = await ctx.newPage(); const errs = [];
page.on('pageerror', e => { errs.push(e.message); console.log('   [pageerror]', e.message); }); page.on('dialog', d => d.dismiss().catch(() => {}));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let ok = 0, bad = 0; const check = (n, c, d = '') => { c ? ok++ : bad++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
const shot = async (n) => { if (outDir) await page.screenshot({ path: path.join(outDir, n + '.png'), fullPage: true }); };

await page.goto(WEB + '/index.html'); await page.waitForSelector('#btn-my-students-main', { timeout: 30000 }); await sleep(2500);
await page.evaluate(() => document.querySelector('.dh-tour-skip')?.click());
await page.evaluate(async () => { const m = await import('/core/app.js'); window.__APP = m;
  await m.AppState.studentManager.addStudent({ name: 'أحمد', type: 'adult', memoFrom: m.AppState.surahsData.find(x => x.number === 114).name, memoTo: m.AppState.surahsData.find(x => x.number === 105).name }); });
// بيانات قديمة لطالب (النظام القديم): يجب أن تُحذف كلها عند أول فتح لركن التجويد، ثم لا تُحذف بيانات الجديد بعد ذلك
const legacy = await page.evaluate(async () => { const m = window.__APP; const st = (await m.AppState.studentManager.getAllStudents())[0];
  await m.AppState.tajweedManager.saveMastery({ studentId: st.id, stageId: 'qalqalah', ruleId: 'qalqalah', dimensions: { knows: 100, distinguishes: 100, discovers: 100, applies: 100, recalls: 100, pronounces: 100 }, status: 'mastered', attemptsCount: 9, masteredAt: new Date().toISOString() });
  await m.AppState.tajweedManager.addSession({ studentId: st.id, stageId: 'qalqalah', ruleId: 'qalqalah', activityType: 'practice', totalQuestions: 3, correctCount: 3, scorePercent: 100 });
  await m.AppState.tajweedManager.addAchievement({ studentId: st.id, badgeKey: 'first_step', meta: null });
  await m.AppState.reviewScheduleManager.recordRuleReviewResult(st.id, 'qalqalah', 90);
  st.tajweedProgress = { currentStageId: 'qalqalah', stageProgress: {} }; await m.AppState.studentManager.updateStudent(st);
  return { mastery: (await m.AppState.tajweedManager.getAllMastery()).length }; });
check('بذرة بيانات قديمة لطالب موجودة قبل الفتح', legacy.mastery === 1);
await page.evaluate(() => window.__APP.openTajweedSection()); await page.waitForSelector('.tjw-entry');
const after = await page.evaluate(async () => { const m = window.__APP; const st = (await m.AppState.studentManager.getAllStudents())[0];
  return { mastery: (await m.AppState.tajweedManager.getAllMastery()).length, sessions: (await m.AppState.tajweedManager.getAllSessions()).length,
    ach: (await m.AppState.tajweedManager.getAchievementsByStudent(st.id)).length, review: (await m.AppState.reviewScheduleManager.getAllRuleSchedules()).length,
    progress: st.tajweedProgress, studentStillThere: !!st && st.name === 'أحمد' }; });
check('أول فتح لركن التجويد يحذف كل بيانات التجويد القديمة (إتقان، جلسات، أوسمة، مراجعة، تقدّم الطالب) ويُبقي الطالب', after.mastery === 0 && after.sessions === 0 && after.ach === 0 && after.review === 0 && after.progress === undefined && after.studentStillThere, JSON.stringify(after));
await page.evaluate(() => { const b = document.querySelector('.tjw-st[data-name="أحمد"]'); if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); }); await page.click('[data-action="entry-map"]'); await page.waitForSelector('.tjw-rule-tile', { timeout: 15000 });
const stepText = async () => page.evaluate(() => [...document.querySelectorAll('.tjw-stepper li')].map(li => (li.classList.contains('is-current') ? 'C' : li.classList.contains('is-done') ? 'D' : '-')).join(''));
const openRule = async (rid) => { await page.click(`[data-rule="${rid}"].tjw-rule-tile`); await page.waitForSelector('.tjw-stepper'); };
const backToRule = async (rid) => { await page.evaluate(() => window.__APP.openTajweedSection()); await page.waitForSelector('.tjw-entry'); await page.evaluate(() => { const b = document.querySelector('.tjw-st[data-name="أحمد"]'); if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); }); await page.click('[data-action="entry-map"]'); await page.waitForSelector('.tjw-rule-tile'); await openRule(rid); };
// يجيب أسئلة النشاط الحالي بأول خيار؛ في الاختبار تتقدّم الأسئلة آلياً، وفي التطبيق بزر «التالي»
async function answerAll(mode) {
  for (let i = 0; i < 12; i++) {
    if (await page.$('.tjw-result-card')) return;
    await page.waitForSelector('.tjw-answer-btn:not([disabled]), .tjw-result-card', { timeout: 15000 }).catch(() => {});
    if (await page.$('.tjw-result-card')) return;
    const b = await page.$('.tjw-answer-btn:not([disabled])'); if (!b) { await sleep(300); continue; }
    await b.click();
    if (mode === 'exam') await sleep(700); else { await page.waitForSelector('[data-action="next-question"]', { timeout: 8000 }); await page.click('[data-action="next-question"]'); await sleep(300); }
  }
}

// ١) الخطوة الأولى: الشرح
await openRule('qalqalah');
check('الحكم الجديد يبدأ بخطوة الشرح، وزر «فهمت»، ولا زر اختبار ولا تسميع', (await stepText()) === 'C---' && !!(await page.$('[data-action="mark-learned"]')) && !(await page.$('[data-action="start-exam"]')) && !(await page.$('[data-action="start-checkpoint"]')));
await shot('1-learn');
// ٢) فهمت ← تطبيق
await page.click('[data-action="mark-learned"]'); await page.waitForSelector('.tjw-activity-card');
const practiceTotal = await page.evaluate(() => document.querySelector('.tjw-progress-label')?.textContent);
check('«فهمت» تفتح التطبيق مباشرة (4 أسئلة: اختر، تمييز، اكتشف، طبّق)', /\/ 4/.test(practiceTotal || ''), practiceTotal);
await answerAll('practice');
await page.waitForSelector('.tjw-result-card'); await shot('2-practice-result');
const practiceRes = await page.evaluate(() => ({ goExam: !!document.querySelector('[data-action="go-exam"]'), score: document.querySelector('.tjw-result-score')?.textContent }));
console.log('   نتيجة التطبيق:', JSON.stringify(practiceRes));
// ٣) لو نجح التطبيق (≥60%) يظهر زر الاختبار؛ وإلا نكرره حتى ينجح (إجابات أول خيار عشوائية)
for (let k = 0; k < 6 && !(await page.$('[data-action="go-exam"]')); k++) { await page.click('[data-action="retry-activity"]'); await page.waitForSelector('.tjw-activity-card'); await answerAll('practice'); await page.waitForSelector('.tjw-result-card'); }
if (!(await page.$('[data-action="go-exam"]'))) {
  // أول خيار قد لا يكون صحيحاً أبداً: نُنجز التطبيق ببيانات مباشرة حتى لا يتعطل باقي الاختبار (ونكتفي بتسجيل ذلك)
  await page.evaluate(async () => { const m = window.__APP; const J = await import('/engine/tajweedJourney.js'); const st = m.AppState.currentStudent;
    const rec = await m.AppState.tajweedManager.getOrCreateMasteryRecord(st.id, 'qalqalah', 'qalqalah'); await m.AppState.tajweedManager.saveMastery(J.applyPracticeResult(rec, 90)); });
  console.log('   (إنجاز التطبيق مباشرة لأن الإجابات الآلية لم تبلغ 60%)');
  await backToRule('qalqalah');
} else {
  check('نجاح التطبيق يعرض زر «ابدأ اختبار الحكم»', true);
  await page.click('[data-action="go-exam"]'); await page.waitForSelector('.tjw-activity-card');
}
if (!(await page.$('.tjw-activity-card'))) { await page.click('[data-action="start-exam"]'); await page.waitForSelector('.tjw-activity-card'); }
// ٤) الاختبار: رسالة العنوان، لا تفسير أثناءه، عدد الأسئلة 5-8
const examInfo = await page.evaluate(() => ({ title: document.getElementById('tjwa-title')?.textContent, label: document.querySelector('.tjw-progress-label')?.textContent }));
const nQ = Number((examInfo.label || '').split('/')[1]);
check('شاشة الاختبار: عنوانها «اختبار الحكم» وعدد الأسئلة 5-8', /اختبار/.test(examInfo.title) && nQ >= 5 && nQ <= 8, JSON.stringify(examInfo));
await shot('3-exam-q1');
const b0 = await page.$('.tjw-answer-btn'); await b0.click(); await sleep(150);
check('لا تفسير ولا ألوان صح/خطأ أثناء الاختبار', !(await page.$('.tjw-feedback')) && !(await page.$('.tjw-answer-correct')) && !(await page.$('.tjw-answer-wrong')));
await sleep(700); await answerAll('exam'); await page.waitForSelector('.tjw-result-card'); await shot('4-exam-result');
const exam = await page.evaluate(() => ({ head: document.querySelector('.tjw-result-headline')?.textContent, hasReview: !!document.querySelector('.tjw-exam-review'), goPractice: !!document.querySelector('[data-action="go-practice"]'), score: document.querySelector('.tjw-result-score')?.textContent }));
console.log('   نتيجة الاختبار:', JSON.stringify(exam));
check('نتيجة الاختبار تعرض الحكم (نجاح/رسوب) ومراجعة الأخطاء أو زر التدرّب', !!exam.head && (exam.hasReview || !exam.goPractice));
if (exam.goPractice) {
  // رسب: لا إعادة قبل تطبيق جديد
  await backToRule('qalqalah');
  check('بعد الرسوب: خطوة التطبيق من جديد وبلا زر اختبار', (await stepText()) === 'DC--' && !(await page.$('[data-action="start-exam"]')) && !!(await page.$('.tjw-checkpoint-banner')));
  await shot('5-after-fail');
}
// ٥) نُنجز الاختبار مباشرة (إجاباتنا آلية) لنختبر الاعتماد من المعلم
await page.evaluate(async () => { const m = window.__APP; const J = await import('/engine/tajweedJourney.js'); const st = m.AppState.currentStudent;
  let rec = await m.AppState.tajweedManager.getOrCreateMasteryRecord(st.id, 'qalqalah', 'qalqalah'); rec = J.applyPracticeResult(rec, 95); rec = J.applyExamResult(rec, 100).record; rec.status = J.statusFromJourney(rec, rec.status);
  await m.AppState.tajweedManager.saveMastery(rec); });
await backToRule('qalqalah');
check('بعد اجتياز الاختبار: بانتظار المعلم، وزر «سمّع لي» فقط', (await stepText()) === 'DDDC' && !!(await page.$('[data-action="start-checkpoint"]')) && !(await page.$('[data-action="start-exam"]')));
await shot('6-awaiting-teacher');
// ٦) تسميع المعلم: درجة كاملة ← اعتماد ← متقن
await page.click('[data-action="start-checkpoint"]'); await page.waitForSelector('.tjw-checkpoint-card');
// الأزرار تُعاد رسمها بعد كل نقرة: نكرر على أول معيار غير مقيَّم حتى تكتمل كل المعايير
for (let i = 0; i < 8; i++) { const sel = '.tjw-checkpoint-criterion:not(:has(.tjw-rate-selected)) [data-rate-value="yes"]'; if (!(await page.$(sel))) break; await page.click(sel); await sleep(150); }
await page.click('[data-action="submit-checkpoint"]'); await page.waitForSelector('.tjw-result-card', { timeout: 15000 }); await shot('7-approved');
check('اعتماد المعلم يظهر في النتيجة', /اعتمد المعلم/.test(await page.textContent('.tjw-result-card')));
await backToRule('qalqalah');
check('الحكم متقن (كل الخطوات منجزة) وتظهر رسالة الإتقان', (await stepText()) === 'DDDD' && !!(await page.$('.tjw-mastered-banner')));
await page.click('#tjw-btn-level-back'); await page.waitForSelector('.tjw-stage-section');
const unlocked = await page.evaluate(() => { const secs = [...document.querySelectorAll('.tjw-stage-section')]; return { first: secs[0].querySelector('.tjw-stage-node')?.classList.contains('is-done'), secondLocked: secs[1].classList.contains('tjw-stage-locked') }; });
check('إتقان حكم القلقلة الوحيد يُكمل مرحلته ويفتح المرحلة التالية', unlocked.first && !unlocked.secondLocked, JSON.stringify(unlocked));
await shot('8-map-unlocked');
// ٧) مسار النجاح الحقيقي عبر الواجهة: نثبّت العشوائية (Math.random ≈ 1) فيبقى الخيار الصحيح أول خيار دائماً
await page.evaluate(() => { Math.random = () => 0.9999; });
await page.evaluate(() => window.__APP.openTajweedSection()); await page.waitForSelector('.tjw-entry');
await page.evaluate(() => { const b = document.querySelector('.tjw-st[data-name="أحمد"]'); if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); }); await page.click('[data-action="entry-map"]'); await page.waitForSelector('.tjw-rule-tile');
await openRule('ghunna_wajiba');
await page.click('[data-action="mark-learned"]'); await page.waitForSelector('.tjw-activity-card');
await answerAll('practice'); await page.waitForSelector('.tjw-result-card');
check('تطبيق صحيح كله: 100% ويظهر زر «ابدأ اختبار الحكم»', (await page.textContent('.tjw-result-score')) === '100%' && !!(await page.$('[data-action="go-exam"]')), await page.textContent('.tjw-result-score'));
await shot('9-practice-pass');
await page.click('[data-action="go-exam"]'); await page.waitForSelector('.tjw-activity-card'); await answerAll('exam'); await page.waitForSelector('.tjw-result-card');
const passed = await page.evaluate(() => ({ head: document.querySelector('.tjw-result-headline')?.textContent, score: document.querySelector('.tjw-result-score')?.textContent, teacher: /المعلم/.test(document.querySelector('.tjw-result-card').textContent) }));
check('اختبار صحيح كله: اجتياز 100% مع رسالة «بانتظار تسميع المعلم»', /اجتزت/.test(passed.head) && passed.score === '100%' && passed.teacher, JSON.stringify(passed));
await shot('10-exam-pass');
await backToRule('ghunna_wajiba');
check('بعد النجاح: خطوة المعلم (DDDC)', (await stepText()) === 'DDDC');
check('لا أخطاء جافاسكربت في الصفحة', errs.length === 0, errs.slice(0, 2).join(' | '));
console.log(`\n${ok} ✅ / ${bad} ❌`);
await browser.close(); srv.close(); process.exit(bad ? 1 : 0);
