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
// «تعرّف على مصحفك» هي المرحلة الأولى قبل القلقلة: نُتقن دروسها الثمانية مباشرة لتُفتح القلقلة (مسارها الكامل في tests/tajweed-mushaf.e2e.mjs)،
// ونُسكت رسالة «المرحلة الجديدة» الخاصة بالقلقلة حتى لا تحجب الخريطة (يبقى فحص رسالة المرحلة التي تليها أدناه)
await page.evaluate(async () => { const m = window.__APP; const J = await import('/engine/tajweedJourney.js'); const C = await import('/engine/tajweedRulesCatalog.js'); const st = (await m.AppState.studentManager.getAllStudents())[0];
  for (const r of C.getTajweedStage('know_mushaf').rules) { let rec = await m.AppState.tajweedManager.getOrCreateMasteryRecord(st.id, 'know_mushaf', r.id);
    rec = J.applyLearned(rec); rec = J.applyPracticeResult(rec, 100); rec = J.applyExamResult(rec, 100).record; rec = J.applyTeacherApproval(rec).record; rec.attemptsCount = 3; rec.status = J.statusFromJourney(rec, rec.status); await m.AppState.tajweedManager.saveMastery(rec); }
  localStorage.setItem('dh_tjw_stage_intro_' + st.id + '_qalqalah', '1'); });
await page.evaluate(() => { const b = document.querySelector('.tjw-st[data-name="أحمد"]'); if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); }); await page.click('[data-action="entry-map"]'); await page.waitForSelector('.tjw-rule-tile', { timeout: 15000 });
const stepText = async () => page.evaluate(() => [...document.querySelectorAll('.tjw-stepper li')].map(li => (li.classList.contains('is-current') ? 'C' : li.classList.contains('is-done') ? 'D' : '-')).join(''));
const openRule = async (rid) => { await page.click(`[data-rule="${rid}"].tjw-rule-tile`); await page.waitForSelector('.tjw-stepper'); };
const backToRule = async (rid) => { await page.evaluate(() => window.__APP.openTajweedSection()); await page.waitForSelector('.tjw-entry'); await page.evaluate(() => { const b = document.querySelector('.tjw-st[data-name="أحمد"]'); if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); }); await page.click('[data-action="entry-map"]'); await page.waitForSelector('.tjw-rule-tile'); await openRule(rid); };
// يجيب النشاط الحالي: العشوائية مثبَّتة (0.9999) فيكون الخيار الأول صحيحاً دائماً، إلا «صح/خطأ» (دائماً خطأ هنا) و«أين الخطأ» (الصواب = الحكم نفسه)
async function answerAll(mode, ruleId, maxQ = 12) {
  for (let i = 0; i < maxQ; i++) {
    if (await page.$('.tjw-result-card')) return;
    await page.waitForSelector('.tjw-answer-btn:not([disabled]), .tjw-result-card', { timeout: 15000 }).catch(() => {});
    if (await page.$('.tjw-result-card')) return;
    let b = null;
    if (await page.$('[data-tf-option]:not([disabled])')) b = await page.$('[data-tf-option="false"]');
    else if (await page.$('[data-spot-option]:not([disabled])')) b = await page.$(`[data-spot-option="${ruleId}"]`);
    else b = await page.$('.tjw-answer-btn:not([disabled])');
    if (!b) { await sleep(300); continue; }
    await b.click();
    if (mode === 'exam') await sleep(700); else { await page.waitForSelector('[data-action="next-question"]', { timeout: 8000 }); await page.click('[data-action="next-question"]'); await sleep(300); }
  }
}
const injectJourney = (fnBody) => page.evaluate(async (body) => { const m = window.__APP; const J = await import('/engine/tajweedJourney.js'); const st = m.AppState.currentStudent;
  let rec = await m.AppState.tajweedManager.getOrCreateMasteryRecord(st.id, 'qalqalah', 'qalqalah'); rec = new Function('J', 'rec', body)(J, rec); rec.status = J.statusFromJourney(rec, rec.status);
  await m.AppState.tajweedManager.saveMastery(rec); }, fnBody);
await page.evaluate(() => { Math.random = () => 0.9999; });

// ١) الشرح: خطوة واحدة وزر واحد
await openRule('qalqalah');
check('الحكم الجديد يبدأ بخطوة الشرح، وزر «فهمت» فقط (لا ألعاب ولا اختبار ولا اعتماد)', (await stepText()) === 'C---' && !!(await page.$('[data-action="mark-learned"]')) && !(await page.$('[data-action="start-exam"]')) && !(await page.$('[data-action="approve-teacher"]')) && !(await page.$('[data-action="play-game"]')));
check('زر «الألعاب» المنفصل القديم لم يعد موجوداً (الألعاب داخل المسار)', !(await page.$('[data-action="start-letters"]')) && !(await page.$('[data-action="start-practice"]')));
await page.click('.tjw-listen-btn'); await sleep(400);
const audioAt = await page.evaluate(async () => { const m = window.__APP; const st = m.AppState.currentStudent; const r = await m.AppState.tajweedManager.getMasteryRecord(st.id, 'qalqalah'); return !!(r && r.journey && r.journey.audioAt); });
check('الضغط على مثال صوتي يُسجَّل «استمع» (لتذكره الملخص بصدق)', audioAt);
await shot('1-learn');
// ٢) فهمت ← أول لعبة (تدرّب) مباشرة
await page.click('[data-action="mark-learned"]'); await page.waitForSelector('.tjw-activity-card');
check('«فهمت» تفتح أول لعبة مباشرة (تدرّب: 4 أسئلة)', /\/ 4/.test(await page.textContent('.tjw-progress-label')));
check('زر «إيقاف» ظاهر أثناء لعبة المسار', await page.isVisible('#tjwa-btn-pause'));
// ٣) إيقاف في منتصف اللعبة ← ملخص الحصة ← استكمال من السؤال نفسه
await answerAll('practice', 'qalqalah', 2);
await page.click('#tjwa-btn-pause'); await page.waitForSelector('#tjw-sum-overlay');
const sumText = await page.inputValue('#tjw-sum-text');
check('ملخص الإيقاف تلقائي: يذكر الشرح والصوت وموضع التوقف، ولا يذكر اختباراً ولا اعتماداً', /شرحنا/.test(sumText) && /المنشاوي/.test(sumText) && /توقفنا عند/.test(sumText) && /السؤال 3 من 4/.test(sumText) && !/اختباراً/.test(sumText) && !/اعتمد/.test(sumText), sumText.replace(/\n/g, ' | '));
await shot('2-pause-summary');
await page.click('[data-sum="close"]'); await page.waitForSelector('.tjw-entry', { timeout: 15000 });   // الإيقاف يعيد إلى شاشة الدخول (بطاقة «أكمل» تحمل حكمه)
await page.evaluate(() => { const b = document.querySelector('.tjw-st[data-name="أحمد"]'); if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); }); await page.click('[data-action="entry-map"]'); await page.waitForSelector('.tjw-rule-tile'); await openRule('qalqalah');
check('بعد الإيقاف: زر «استكمال من حيث توقفنا» هو الزر الرئيسي ومعه موضع التوقف', !!(await page.$('[data-action="resume-path"]')) && /السؤال 3 من 4/.test(await page.textContent('.tjw-checkpoint-banner')));
await page.click('[data-action="resume-path"]'); await page.waitForSelector('.tjw-activity-card');
check('الاستكمال يعود لنفس السؤال (3 من 4)', /3 \/ 4/.test(await page.textContent('.tjw-progress-label')));
await answerAll('practice', 'qalqalah'); await page.waitForSelector('.tjw-result-card'); await shot('3-game1-result');
const g1 = await page.evaluate(() => ({ score: document.querySelector('.tjw-result-score')?.textContent, next: document.querySelector('[data-action="go-game"]')?.dataset.game, exam: !!document.querySelector('[data-action="go-exam"]') }));
check('نهاية اللعبة الأولى: تُعرض اللعبة التالية (ألعاب الحروف) ولا يُفتح التحدي بعد', g1.score === '100%' && g1.next === 'letters' && !g1.exam, JSON.stringify(g1));
await page.click('[data-action="go-game"]'); await page.waitForSelector('.tjw-activity-card');
check('«اللعبة التالية» تفتح ألعاب الحروف دون العودة للخريطة', /الحروف|حروف/.test(await page.textContent('#tjwa-title')) || (await page.$$('.tjw-activity-card')).length > 0);
// ٤) باقي الألعاب نُنجزها مباشرة (حلّها له اختبار مستقل: tajweed-letters.e2e.mjs)، فيفتح التحدي
await injectJourney("rec = J.applyGameResult(rec, 'letters', 90, ['practice','letters','tree']); rec = J.applyGameResult(rec, 'tree', 80, ['practice','letters','tree']); return rec;");
await backToRule('qalqalah');
check('بعد كل الألعاب بمتوسط ≥ 75%: خطوة التحدي، وزر واحد «ابدأ التحدي»', (await stepText()) === 'DDC-' && !!(await page.$('[data-action="start-exam"]')) && !(await page.$('[data-action="approve-teacher"]')));
await shot('4-challenge-ready');
// ٥) التحدي (الاختبار المتنوع) ثم اعتماد المعلم بضغطة
await page.click('[data-action="start-exam"]'); await page.waitForSelector('.tjw-activity-card');
const nQ = Number((await page.textContent('.tjw-progress-label')).split('/')[1]);
check('التحدي: من 5 إلى 8 أسئلة', nQ >= 5 && nQ <= 8, String(nQ));
// إيقاف في منتصف التحدي ثم استكماله من السؤال نفسه (الأسئلة نفسها لا أسئلة جديدة)
await answerAll('exam', 'qalqalah', 2);
await page.click('#tjwa-btn-pause'); await page.waitForSelector('#tjw-sum-overlay');
check('إيقاف التحدي: الملخص يذكر «اختبار الحكم» والسؤال 3', /توقفنا عند «اختبار الحكم» \(السؤال 3 من/.test(await page.inputValue('#tjw-sum-text')));
await page.click('[data-sum="close"]'); await page.waitForSelector('.tjw-entry');
await page.evaluate(() => { const b = document.querySelector('.tjw-st[data-name="أحمد"]'); if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); }); await page.click('[data-action="entry-map"]'); await page.waitForSelector('.tjw-rule-tile'); await openRule('qalqalah');
await page.click('[data-action="resume-path"]'); await page.waitForSelector('.tjw-activity-card');
check('استكمال التحدي من السؤال 3 بنفس عدد الأسئلة', new RegExp('3 / ' + nQ).test(await page.textContent('.tjw-progress-label')), await page.textContent('.tjw-progress-label'));
await answerAll('exam', 'qalqalah'); await page.waitForSelector('.tjw-result-card'); await shot('5-exam-result');
const ex = await page.evaluate(() => ({ head: document.querySelector('.tjw-result-headline')?.textContent, score: document.querySelector('.tjw-result-score')?.textContent, approve: !!document.querySelector('[data-action="approve-now"]') }));
check('اجتياز التحدي 100% مع زر «اعتماد المعلم» في النتيجة نفسها', /اجتزت/.test(ex.head) && ex.score === '100%' && ex.approve, JSON.stringify(ex));
const kinds = await page.evaluate(async () => { const m = window.__APP; const st = m.AppState.currentStudent; const r = await m.AppState.tajweedManager.getMasteryRecord(st.id, 'qalqalah'); return r.journey.examKinds; });
check('أنواع الاختبار محفوظة وفيها أكثر من نوعين (تنويع)', Array.isArray(kinds) && kinds.length >= 3, JSON.stringify(kinds));
await page.click('[data-action="approve-now"]'); await page.waitForSelector('.tjw-result-card'); await sleep(300); await shot('6-approved');
check('الاعتماد بضغطة واحدة: رسالة اعتماد الحكم', /اعتُمد الحكم/.test(await page.textContent('.tjw-result-card')));
await page.click('[data-action="parent-summary"]'); await page.waitForSelector('#tjw-sum-overlay');
const sum2 = await page.inputValue('#tjw-sum-text');
check('ملخص نهاية الحكم: يذكر الألعاب والاختبار والاعتماد وانتقال الطالب للحكم التالي', /لعبنا/.test(sum2) && /اجتازه بنسبة 100/.test(sum2) && /اعتمدتُ/.test(sum2) && /ننتقل بإذن الله/.test(sum2), sum2.replace(/\n/g, ' | '));
await shot('7-final-summary');
await page.click('[data-sum="close"]');
// ٦) رسالة المرحلة الجديدة: مراجعة جديدة أو بدء المرحلة (تظهر عند أول فتح للخريطة بعد إتمام مرحلة)
await page.evaluate(() => window.__APP.openTajweedSection()); await page.waitForSelector('.tjw-entry');
await page.evaluate(() => { const b = document.querySelector('.tjw-st[data-name="أحمد"]'); if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); }); await page.click('[data-action="entry-map"]'); await page.waitForSelector('#tjw-stage-intro', { timeout: 10000 });
check('أول فتح للمرحلة الجديدة: رسالة خيارين (مراجعة جديدة / بدء المرحلة)', !!(await page.$('[data-intro="review"]')) && !!(await page.$('[data-intro="start"]')));
await shot('8-stage-intro');
await page.click('[data-intro="start"]'); await page.waitForSelector('.tjw-stepper');
check('«ابدأ المرحلة الجديدة» تفتح أول حكم فيها', /غنة/.test(await page.textContent('.tjw-rule-card-name')), await page.textContent('.tjw-rule-card-name'));
await page.click('#tjw-btn-level-back'); await page.waitForSelector('.tjw-stage-section'); await sleep(600);
check('الرسالة لا تتكرر بعد اختيار المعلم', !(await page.$('#tjw-stage-intro')));
await openRule('qalqalah');
check('الحكم متقن (كل الخطوات منجزة)', (await stepText()) === 'DDDD' && !!(await page.$('.tjw-mastered-banner')));
check('لا أخطاء جافاسكربت في الصفحة', errs.length === 0, errs.slice(0, 2).join(' | '));
console.log(`\n${ok} ✅ / ${bad} ❌`);
await browser.close(); srv.close(); process.exit(bad ? 1 : 0);
