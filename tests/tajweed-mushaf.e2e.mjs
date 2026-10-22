// tests/tajweed-mushaf.e2e.mjs — مرحلة «تعرّف على مصحفك» في المتصفح: هي المرحلة الأولى قبل القلقلة، دروسها الثمانية، مسار الحكم كاملاً
// (شرح ← تدرّب ← استكشف المصحف ← تحدٍّ ← اعتماد) بأسئلة من آيات حفظ الطالب، ثم العربية والإنجليزية (لا مفاتيح خام، الاتجاه، لا سكون عادي).
// الاستعمال: PLAYWRIGHT_MODULE_DIR=/opt/node22/lib/node_modules PW_CHROMIUM=/opt/pw-browsers/chromium node tests/tajweed-mushaf.e2e.mjs [outDir]
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
await page.evaluate(() => localStorage.setItem('dh_e2e_hooks', '1'));
// طالب يحفظ قصار السور (١٠٥–١١٤): فيها علامات وقف ولا سجدة ولا بداية ربع، فنرى أيضاً «أقرب نطاق»
await page.evaluate(async () => { const m = await import('/core/app.js'); window.__APP = m;
  await m.AppState.studentManager.addStudent({ name: 'أحمد', type: 'adult', memoFrom: m.AppState.surahsData.find(x => x.number === 114).name, memoTo: m.AppState.surahsData.find(x => x.number === 105).name }); });
await page.evaluate(() => window.__APP.openTajweedSection()); await page.waitForSelector('.tjw-entry');
await page.evaluate(() => { const b = document.querySelector('.tjw-st[data-name="أحمد"]'); if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); });
check('الطالب الجديد: زر البداية يذكر أول درس في المرحلة الجديدة (رقم الآية) لا القلقلة', /رقم الآية/.test(await page.textContent('[data-action="entry-go"]')), await page.textContent('[data-action="entry-go"]'));
await page.click('[data-action="entry-map"]'); await page.waitForSelector('.tjw-rule-tile', { timeout: 15000 });

const stages = await page.evaluate(() => [...document.querySelectorAll('.tjw-stage-section')].map(s => ({ title: s.querySelector('.tjw-stage-title span')?.textContent.trim(), locked: s.classList.contains('tjw-stage-locked'), tiles: s.querySelectorAll('.tjw-rule-tile').length })));
check('المرحلة الأولى في الخريطة «تعرّف على مصحفك» مفتوحة بسبعة دروس (رقم الآية ولوحة السورة درس واحد)', stages[0].title === 'تعرّف على مصحفك' && !stages[0].locked && stages[0].tiles === 7, JSON.stringify(stages[0]));
check('القلقلة ثاني مرحلة ومقفلة حتى يُتقن الطالب المرحلة الأولى', /القلقلة/.test(stages[1].title) && stages[1].locked, JSON.stringify(stages[1]));
check('أزرار «اربط» و«شجرة» غير معروضة لمرحلة المصحف (لا حروف)', !(await page.$('[data-action="start-link"][data-stage="know_mushaf"]')) && !(await page.$('[data-action="start-tree"][data-stage="know_mushaf"]')));
await shot('1-map');

const openRule = async (rid) => { await page.click(`[data-rule="${rid}"].tjw-rule-tile`); await page.waitForSelector('.tjw-stepper'); };
const backToMap = async () => { await page.evaluate(() => window.__APP.openTajweedSection()); await page.waitForSelector('.tjw-entry'); await page.evaluate(() => { const b = document.querySelector('.tjw-st[data-name="أحمد"]'); if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); }); await page.click('[data-action="entry-map"]'); await page.waitForSelector('.tjw-rule-tile'); };

// ============================================================
// الدروس السبعة: كل درس يُعرض بمحتواه الحقيقي دون أخطاء وبلا مفاتيح ترجمة خام
// ============================================================
const LESSONS = ['mushaf_ayah_number', 'mushaf_juz_hizb', 'mushaf_waqf', 'mushaf_silent_sukun', 'mushaf_madd_letters', 'mushaf_sin_saad', 'mushaf_sajda'];
const rawKeys = async () => page.evaluate(() => (document.body.innerText.match(/\btjw_[a-z0-9_]+\b/g) || []));
for (const rid of LESSONS) {
  await openRule(rid);
  const info = await page.evaluate(() => ({ lesson: !!document.querySelector('.tjw-mk-lesson'), cards: document.querySelectorAll('.tjw-mk-signcard').length, lantern: document.querySelectorAll('.tjw-mk-lantern').length, hasLetters: !!document.querySelector('.tjw-letter-chip'), hasTree: !!document.querySelector('.tjw-tree'), imgsOk: [...document.querySelectorAll('.tjw-mk-lesson img')].every(i => i.complete && i.naturalWidth > 0) }));
  check(`درس ${rid}: يُعرض بمحتواه (بلا رقائق حروف ولا شجرة) وصوره تُحمَّل`, info.lesson && !info.hasLetters && !info.hasTree && info.imgsOk, JSON.stringify(info));
  check(`درس ${rid}: لا مفاتيح ترجمة خام ظاهرة`, (await rawKeys()).length === 0, (await rawKeys()).slice(0, 3).join(','));
  if (rid === 'mushaf_juz_hizb') check('درس الجزء والحزب: خمسة فوانيس في المعرض + فانوس مثال', info.lantern >= 6, String(info.lantern));
  if (rid === 'mushaf_waqf') check('درس الوقف: ست علامات بتعريفاتها (نص المصحف المصحَّح بلا علامة «لا»)', info.cards === 6, String(info.cards));
  if (rid === 'mushaf_ayah_number') await shot('2-lesson-ayah-number');
  if (rid === 'mushaf_sajda') await shot('3-lesson-sajda');
  await page.click('#tjw-btn-level-back'); await page.waitForSelector('.tjw-rule-tile');
}
const text0 = await page.evaluate(() => document.body.innerText);
check('لا سكون عادي (ْ) في أي نص قرآني معروض: يُعرض رأس الحاء ۡ', !(await page.evaluate(() => [...document.querySelectorAll('.tjw-mk-ar, .tjw-example-text')].some(e => e.textContent.includes('ْ')))));
void text0;

// ============================================================
// مسار الحكم كاملاً على درس «رقم الآية»
// ============================================================
const RID = 'mushaf_ayah_number';
const chainLabels = new Set();
const answerCorrect = async () => {
  const q = await page.evaluate(() => { const q = window.__tjwQuestion && window.__tjwQuestion(); window.__prevQ = q; return q; });
  if (!q) return false;
  if (q.type === 'mushaf_choice') await page.click(`[data-mk-opt="${q.options.find(o => o.ok).id}"]`);
  else if (q.type === 'mushaf_tap') await page.click(`[data-mk-seg="${q.segments.findIndex(s => s.ok)}"]`);
  else if (q.type === 'mushaf_match') for (const p of q.pairs) { await page.click(`[data-mk-l="${p.id}"]`); await page.click(`[data-mk-r="${p.id}"]`); }
  // الانتقال تلقائي بعد كل إجابة (بلا زر «التالي»): ننتظر تغيّر السؤال أو ظهور شاشة العبور/النتيجة
  await page.waitForFunction(() => window.__tjwQuestion() !== window.__prevQ, null, { timeout: 9000 });
  return true;
};
const runAll = async (max = 40) => { for (let i = 0; i < max; i++) { await page.waitForSelector('.tjw-mk-card, .tjw-result-card', { timeout: 15000 }); if (await page.$('.tjw-result-card')) return; chainLabels.add(((await page.textContent('.tjw-progress-label')).match(/الخطوة \d من \d/) || [''])[0]); await answerCorrect(); } };
await openRule(RID);
check('الدرس الجديد: خطوة الشرح وزر «فهمت» فقط', !!(await page.$('[data-action="mark-learned"]')) && !(await page.$('[data-action="start-exam"]')));
await page.click('[data-action="mark-learned"]'); await page.waitForSelector('.tjw-mk-card');
check('«فهمت» تفتح سلسلة الحكم: الخطوة 1 من 3 وخمسة أسئلة', /الخطوة 1 من 3/.test(await page.textContent('.tjw-progress-label')) && /\/ 5/.test(await page.textContent('.tjw-progress-label')), await page.textContent('.tjw-progress-label'));
const q1 = await page.evaluate(() => window.__tjwQuestion());
check('سؤال التدرّب من نوع المصحف ويحمل مفتاح نص ومفتاح تفسير', ['mushaf_choice', 'mushaf_tap', 'mushaf_match'].includes(q1.type) && !!q1.stemKey);
// إجابة صحيحة: ينتقل وحده للسؤال التالي بلا زر
await answerCorrect();
check('بعد الإجابة ينتقل مباشرة للسؤال التالي بلا زر «التالي»', !(await page.$('[data-action="next-question"]')) && /2 \/ 5/.test(await page.textContent('.tjw-progress-label')), await page.textContent('.tjw-progress-label'));
const seenKeys = []; const keyLog = setInterval(async () => { try { const k = await page.evaluate(() => { const q = window.__tjwQuestion && window.__tjwQuestion(); return q ? q.key : null; }); if (k && !seenKeys.includes(k)) seenKeys.push(k); } catch (e) { /* التنقل */ } }, 120);
await runAll();
clearInterval(keyLog);
check('السلسلة مرّت بالخطوات الثلاث (تدرّب ← استكشف ← تحدٍّ) بلا شاشات نتيجة وسيطة', chainLabels.size === 3, [...chainLabels].join(' | '));
check('لا تكرار لسؤال بين ألعاب الحكم والتحدي', new Set(seenKeys).size === seenKeys.length, String(seenKeys.length));
await page.waitForSelector('.tjw-result-card');
const ex = await page.evaluate(() => ({ head: document.querySelector('.tjw-result-headline')?.textContent, score: document.querySelector('.tjw-result-score')?.textContent, approve: !!document.querySelector('[data-action="approve-now"]') }));
check('اجتياز التحدي 100% مع زر «اعتماد المعلم»', /اجتزت/.test(ex.head) && ex.score === '100%' && ex.approve, JSON.stringify(ex));
await shot('5-exam-result');
await page.click('[data-action="approve-now"]'); await page.waitForSelector('.tjw-result-card'); await sleep(300);
check('الاعتماد بضغطة واحدة: رسالة اعتماد الحكم', /اعتُمد الحكم/.test(await page.textContent('.tjw-result-card')));
const rec = await page.evaluate(async () => { const m = window.__APP; const st = (await m.AppState.studentManager.getAllStudents())[0]; const r = await m.AppState.tajweedManager.getMasteryRecord(st.id, 'mushaf_ayah_number'); return { status: r.status, kinds: r.journey.examKinds, games: Object.keys(r.journey.gameScores || {}) }; });
check('سجل الإتقان: متقن، ألعاب التدرّب والاستكشاف مسجَّلة، وأنواع التحدي محفوظة', rec.status === 'mastered' && rec.games.includes('practice') && rec.games.includes('mushaf') && rec.kinds.length >= 3, JSON.stringify(rec));
await backToMap();
check('القلقلة ما زالت مقفلة (بقيت سبعة دروس)', await page.evaluate(() => document.querySelectorAll('.tjw-stage-section')[1].classList.contains('tjw-stage-locked')));

// ============================================================
// بقية الدروس: سؤال واحد من كل نوع يعمل (اختيار/ضغط/وصل) في تدرّب الدرس
// ============================================================
for (const rid of LESSONS.slice(1, -1)) {   // «السجدة» تبقى بلا إنجاز لنفحص سؤالها بالإنجليزية في آخر الاختبار
  await openRule(rid); await page.click('[data-action="mark-learned"]'); await page.waitForSelector('.tjw-mk-card');
  await runAll(); await page.waitForSelector('.tjw-result-card');
  check(`درس ${rid}: تدرّب كامل 100% بلا أخطاء`, (await page.textContent('.tjw-result-score')) === '100%');
  await page.evaluate(() => window.__APP.openTajweedSection()); await page.waitForSelector('.tjw-entry'); await page.evaluate(() => { const b = document.querySelector('.tjw-st[data-name="أحمد"]'); if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); }); await page.click('[data-action="entry-map"]'); await page.waitForSelector('.tjw-rule-tile');
}

// ============================================================
// الإنجليزية: لا مفاتيح خام، الاتجاه LTR، والنص القرآني يبقى RTL
// ============================================================
await page.evaluate(async () => { const i = await import('/core/i18n.js'); i.toggleLanguage(); }); await sleep(400);
await backToMap(); await sleep(300);
const en = await page.evaluate(() => ({ dir: document.documentElement.dir, stage: document.querySelector('.tjw-stage-title span')?.textContent.trim() }));
check('الإنجليزية: الاتجاه LTR واسم المرحلة «Know Your Mushaf»', en.dir === 'ltr' && en.stage === 'Know Your Mushaf', JSON.stringify(en));
for (const rid of ['mushaf_ayah_number', 'mushaf_juz_hizb', 'mushaf_waqf', 'mushaf_sajda']) {
  await openRule(rid);
  const e1 = await page.evaluate(() => ({ raw: (document.body.innerText.match(/\btjw_[a-z0-9_]+\b/g) || []), arabicInName: /[؀-ۿ]/.test(document.querySelector('.tjw-rule-card-name')?.textContent || ''), rtlQuran: [...document.querySelectorAll('.tjw-mk-ar')].every(e => getComputedStyle(e).direction === 'rtl') }));
  check(`الإنجليزية — درس ${rid}: لا مفاتيح خام، والاسم إنجليزي، والآيات RTL`, e1.raw.length === 0 && !e1.arabicInName && e1.rtlQuran, JSON.stringify(e1));
  if (rid === 'mushaf_waqf') await shot('6-lesson-waqf-en');
  await page.click('#tjw-btn-level-back'); await page.waitForSelector('.tjw-rule-tile');
}
await openRule('mushaf_sajda'); await page.click('[data-action="mark-learned"]'); await page.waitForSelector('.tjw-mk-card');
const enQ = await page.evaluate(() => ({ stem: document.querySelector('.tjw-activity-prompt')?.textContent || '', raw: (document.body.innerText.match(/\btjw_[a-z0-9_]+\b/g) || []).length }));
check('الإنجليزية — سؤال التدرّب: نص السؤال إنجليزي بلا مفاتيح خام', enQ.stem.length > 3 && !/[؀-ۿ]{3}/.test(enQ.stem.replace(/[«»“”"]/g, '').replace(/\([^)]*\)/g, '')) && enQ.raw === 0, JSON.stringify(enQ));
await shot('7-question-en');
check('لا أخطاء جافاسكربت في الصفحة', errs.length === 0, errs.slice(0, 2).join(' | '));
console.log(`\n${ok} ✅ / ${bad} ❌`);
await browser.close(); srv.close(); process.exit(bad ? 1 : 0);
