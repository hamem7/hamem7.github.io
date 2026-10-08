// tests/smart-homework.e2e.mjs — اختبار وظيفي كامل للواجب الذكي (من الواجهة إلى الخادم ثم سجل الأداء).
// الاستعمال: node tests/smart-homework.e2e.mjs [siteRoot]
//   يحتاج Playwright + Chromium (PW_CHROMIUM=/path/to/chrome، وPLAYWRIGHT_MODULE_DIR لتثبيت عام).
// يشغّل Code.gs الحقيقي داخل محاكي Apps Script الخاص بالمختبر (Dar-Ham-Homework-Lab/dev/gas-emulator.mjs) خلف رابط /exec الحقيقي،
// وزرّ جوجل مزيّف، وبيانات المصحف الحقيقية (database/quran-uthmani.json). كل سياق متصفح يبدأ فارغاً = جهاز جديد.
// يغطي: واجهة الإنشاء (لا خيارات سورة/جزء عامة)، التوليد والمعاينة و«لماذا»، النشر وخريطة التتبّع في الخادم دون تسريبها للطالب،
// تسليم الطالب واعتماد المعلم وتسجيل الأحداث (ومنع تكرارها)، التكرار العلاجي في الواجب التالي، بناء الملف من البيانات الحالية،
// جلسات اللعب، موضع الحفظ الشهري، ملف المهارات، وتنظيف بيانات الطالب المحذوف.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(process.env.PLAYWRIGHT_MODULE_DIR ? path.join(process.env.PLAYWRIGHT_MODULE_DIR, '/') : import.meta.url);
const { chromium } = require('playwright');

const [siteRoot = REPO] = process.argv.slice(2);
const { createBackend, googleTokenMock } = await import(pathToFileURL(path.join(REPO, 'Dar-Ham-Homework-Lab/dev/gas-emulator.mjs')).href);
const CLIENT_ID = '52157264045-l30vua64vk6018jjv53j14qpf716rmr8.apps.googleusercontent.com';
const API = 'https://script.google.com/macros/s/AKfycbzynu0klKsGI3W168LfxV6LVTDk8pRHVFvATpug4iJR0o_jwRDi128RwBMCgAg52Q7L/exec';

const be = createBackend({ codePath: path.join(REPO, 'backend/Code.gs'), urlFetch: googleTokenMock({ tokT: { sub: 'sub-teacher', email: 't@example.com', aud: CLIENT_ID } }) });
be.setup();

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(siteRoot, p);
  if (!f.startsWith(siteRoot) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
await new Promise(r => srv.on('listening', r));
const WEB = `http://localhost:${srv.address().port}`;

const FAKE_GSI = `window.google = { accounts: { id: { _cb: null, initialize(o) { this._cb = o.callback; },
  renderButton(el) { const b = document.createElement('button'); b.id = 'fake-gsi-btn'; b.type = 'button'; b.textContent = 'Sign in'; b.onclick = () => this._cb({ credential: 'tokT' }); el.appendChild(b); },
  prompt() {}, disableAutoSelect() {} } } };`;

const apiLog = [];
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });
const ctx = await browser.newContext({ locale: 'ar', viewport: { width: 1100, height: 900 } });
await ctx.route('**/*', async (route) => {
  const u = new URL(route.request().url());
  if (u.hostname === 'localhost') return route.continue();
  if (u.href.startsWith(API)) {
    const req = route.request();
    const out = req.method() === 'GET' ? be.get(Object.fromEntries(u.searchParams)) : be.post(req.postData() || '');
    const action = req.method() === 'GET' ? u.searchParams.get('action') : (() => { try { return JSON.parse(req.postData()).action; } catch { return '?'; } })();
    apiLog.push({ action, ok: out.ok, code: out.code });
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(out) });
  }
  if (u.href.startsWith('https://accounts.google.com/gsi/client')) return route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_GSI });
  return route.abort();
});
const page = await ctx.newPage();
const pageErrors = [];
page.on('dialog', d => d.dismiss().catch(() => {}));
page.on('pageerror', e => { pageErrors.push(e.message); console.log(`   [pageerror] ${e.message}`); });

const results = [];
function check(name, cond, detail = '') { results.push({ name, ok: !!cond }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
// SHOTS=/path يحفظ لقطات الشاشات الرئيسية للمراجعة البصرية
const shot = async (pg, name) => { if (process.env.SHOTS) await pg.screenshot({ path: path.join(process.env.SHOTS, name + '.png'), fullPage: true }); };

try {
  await page.goto(WEB + '/index.html');
  await page.waitForSelector('#btn-my-students-main', { timeout: 30000 });
  await sleep(800);

  // ---- طالب بنطاق حفظ: من الناس إلى النازعات (جزء عمّ تقريباً)
  const seeded = await page.evaluate(async () => {
    const { AppState } = await import('/core/app.js');
    const by = (n) => AppState.surahsData.find(s => s.number === n).name;
    const id = await AppState.studentManager.addStudent({ name: 'محمد التجريبي', type: 'adult', memoFrom: by(114), memoTo: by(79) });
    const id2 = await AppState.studentManager.addStudent({ name: 'طالب بلا نطاق', type: 'adult' });
    return { id, id2, from: by(114), to: by(79), surahsCount: AppState.surahsData.length };
  });
  check('0 المنصة أقلعت ببيانات المصحف الحقيقية (114 سورة) وأُنشئت قاعدة التتبّع', seeded.surahsCount === 114 &&
    await page.evaluate(async () => (await indexedDB.databases()).some(d => d.name === 'DarHamTracking')));

  // ---- فتح شاشة الواجبات (دخول جوجل)
  await page.evaluate(() => document.getElementById('btn-homework-main').click());
  await page.waitForSelector('#fake-gsi-btn', { timeout: 10000 });
  await page.click('#fake-gsi-btn');
  await page.waitForSelector('#btn-hero-new', { timeout: 20000 });
  await sleep(1500);
  await page.evaluate(() => document.querySelector('.dh-tour-skip')?.click());   // الجولة الإرشادية لأول مرة
  await sleep(300);
  await page.evaluate(() => document.getElementById('btn-hero-new').click());
  await sleep(800);

  console.log('\n=== واجهة الإنشاء ===');
  check('A1 لا خيارات سورة/عدة سور/جزء عامة ولا رابط عام',
    await page.evaluate(() => !document.querySelector('input[name="hwType"]') && !document.getElementById('hw-surah-select') && !document.getElementById('hw-general-btn')));
  check('A2 عدد الأسئلة وخيار التركيز وزر التوليد ظاهرة', await page.isVisible('#hw-q-count-smart') && await page.isVisible('#hw-focus-select') && await page.isVisible('#btn-generate-hw'));

  // توليد بلا طالب → تنبيه ولا أسئلة
  let dialogMsg = '';
  page.once('dialog', d => { dialogMsg = d.message(); d.dismiss().catch(() => {}); });
  await page.click('#btn-generate-hw'); await sleep(600);
  check('A3 التوليد بلا طالب مرفوض برسالة واضحة', dialogMsg.includes('اختر الطالب') && !(await page.isVisible('#hw-preview-section')), dialogMsg);

  // اختيار طالب بلا نطاق
  await page.fill('#hw-target-student-search', 'بلا نطاق'); await sleep(300);
  await page.click('.hwp2-student-result'); await sleep(1200);
  const noRangeInfo = await page.evaluate(() => document.getElementById('hw-smart-info').innerText);
  check('A4 طالب بلا نطاق: تنبيه صريح وزر تسجيل الموضع', noRangeInfo.includes('لا يوجد نطاق حفظ') && noRangeInfo.includes('تسجيل موضع'), noRangeInfo.replace(/\s+/g, ' ').slice(0, 80));
  page.once('dialog', d => { dialogMsg = d.message(); d.dismiss().catch(() => {}); });
  await page.click('#btn-generate-hw'); await sleep(800);
  check('A5 لا يُولَّد واجب لطالب بلا نطاق', !(await page.isVisible('#hw-preview-section')) && /حدّد نطاق حفظ/.test(dialogMsg), dialogMsg);

  // اختيار الطالب صاحب النطاق
  await page.click('#hw-target-student-clear'); await sleep(300);
  await page.fill('#hw-target-student-search', 'محمد'); await sleep(300);
  await page.click('.hwp2-student-result'); await sleep(1800);
  const info = await page.evaluate(() => document.getElementById('hw-smart-info').innerText);
  const plain = (x) => x.replace(/[\u064B-\u065F\u0670]/g, '');
  check('A6 بطاقة النطاق: من الناس إلى النازعات + حالة تعلّم النظام', info.includes('نطاق الحفظ المعتمد') && plain(info).includes('الناس') && plain(info).includes('النازعات') && info.includes('لا بيانات بعد'), info.replace(/\s+/g, ' ').slice(0, 140));
  check('A7 تنبيه: لا سجل شهري فاعتُمد نطاق الملف + زر التحديث', info.includes('لا يوجد سجل حفظ شهري') && info.includes('سجّل موضعه'));
  await shot(page, '1-create-info');
  const focusOpts = await page.evaluate(() => [...document.querySelectorAll('#hw-focus-select option')].map(o => o.value));
  check('A8 خيارات التركيز من داخل حفظه فقط (الجزء 30، سورة الناس…النازعات، لا البقرة)', focusOpts.includes('juz:30') && focusOpts.includes('surah:114') && focusOpts.includes('surah:79') && !focusOpts.includes('surah:2') && !focusOpts.includes('surah:78'), focusOpts.slice(0, 6).join(','));

  console.log('\n=== التوليد والمعاينة ===');
  await page.fill('#hw-q-count-smart', '12');
  await page.click('#btn-generate-hw');
  await page.waitForSelector('#hw-questions-list .quran-text', { timeout: 30000 });
  await sleep(500);
  const preview = await page.evaluate(() => ({
    cards: document.querySelectorAll('#hw-questions-list > div').length,
    why: [...document.querySelectorAll('#hw-questions-list > div')].filter(d => d.innerText.includes('لماذا؟')).length,
    summary: document.getElementById('hw-smart-summary')?.innerText || '',
    text: document.getElementById('hw-questions-list').innerText
  }));
  check('B1 12 سؤالاً في المعاينة', preview.cards === 12, String(preview.cards));
  check('B2 كل سؤال تحته «لماذا؟» وشارة الفئة والمهارة', preview.why === 12);
  check('B3 شريط التوزيع يعرض الفئات (جديد/قريب/بعيد)', /حفظ جديد/.test(preview.summary) && /مراجعة/.test(preview.summary), preview.summary.replace(/\s+/g, ' '));
  check('B4 لا أسئلة علاجية لطالب بلا أخطاء', !/من أخطائه السابقة/.test(preview.summary));

  await shot(page, '2-preview');
  console.log('\n=== النشر وخريطة التتبّع ===');
  await page.click('#btn-save-hw-publish');
  await page.waitForSelector('#hw-share-modal', { state: 'visible', timeout: 30000 });
  await sleep(1500);
  const hw1 = await page.evaluate(async () => {
    const { AppState } = await import('/core/app.js');
    const all = await AppState.homeworkManager.getAllHomeworks();
    const h = all.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
    return { id: h.id, studentName: h.assignedStudentName, nq: h.questions.length, tracking: h.tracking, scope: h.scope, qids: h.questions.map(q => q.id),
      questions: h.questions };
  });
  check('C1 الواجب مخصَّص للطالب ومحفوظ محلياً مع خريطة تتبّع لكل سؤال', hw1.studentName === 'محمد التجريبي' && Object.keys(hw1.tracking || {}).length === 12 && hw1.qids.every(q => hw1.tracking[q]));
  check('C2 النطاق المخزَّن: من الناس إلى النازعات (للشهادة)', hw1.scope && hw1.scope.mode === 'range' && hw1.scope.smart === true && hw1.scope.toNum === 79 && hw1.scope.fromNum === 114, JSON.stringify(hw1.scope));
  const metas = Object.values(hw1.tracking);
  check('C3 كل الأسئلة داخل نطاق حفظه (السور 79..114 فقط)', metas.every(m => m.surah >= 79 && m.surah <= 114));
  check('C4 كل سؤال له مهارة وصيغة ومقطع صالح', metas.every(m => m.skill && m.fmt && /^\d+:\d+-\d+$/.test(m.segment)));
  check('C5 الأسئلة مخلوطة وليست بترتيب المصحف أو الحفظ', (() => { const s = hw1.qids.map(q => hw1.tracking[q].surah); const a = [...s].sort((x, y) => x - y), d = [...s].sort((x, y) => y - x); return JSON.stringify(s) !== JSON.stringify(a) && JSON.stringify(s) !== JSON.stringify(d); })());

  // الخادم: meta.tracking محفوظ، والرابط العام لا يكشفه ولا يكشف الإجابات
  const auth = await page.evaluate(() => ({ userId: localStorage.getItem('dh_hw_teacher_userid'), sessionKey: localStorage.getItem('dh_hw_teacher_sessionkey') }));
  const full = be.post({ action: 'getHomeworkFull', userId: auth.userId, sessionKey: auth.sessionKey, id: hw1.id });
  check('C6 الخادم يحفظ meta.tracking (12 سؤالاً) مع الواجب', full.ok && full.homework.meta && Object.keys(full.homework.meta.tracking || {}).length === 12);
  const pub = JSON.stringify(be.get({ action: 'getHomework', id: hw1.id }));
  check('C7 الرابط العام لا يكشف الإجابات الصحيحة ولا خريطة التتبّع', !pub.includes('correctAnswer') && !pub.includes('tracking') && !pub.includes('"segment"'));

  // واجهة الطالب (جهاز جديد): يفتح الرابط ويرى كل الأسئلة (بما فيها البصرية) بلا أي أثر لخريطة التتبّع
  {
    const sctx = await browser.newContext({ locale: 'ar', viewport: { width: 420, height: 900 } });
    await sctx.route('**/*', async (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === 'localhost') return route.continue();
      if (u.href.startsWith(API)) {
        const req = route.request();
        const out = req.method() === 'GET' ? be.get(Object.fromEntries(u.searchParams)) : be.post(req.postData() || '');
        return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(out) });
      }
      return route.abort();
    });
    const sp = await sctx.newPage();
    const stuErrors = [];
    sp.on('pageerror', e => stuErrors.push(e.message));
    await sp.goto(`${WEB}/index.html?hw=${hw1.id}`);
    await sp.waitForSelector('#btn-enter-hw', { state: 'visible', timeout: 30000 });
    await sleep(1200);
    await sp.evaluate(() => document.getElementById('btn-enter-hw').click());
    await sp.waitForSelector('#hp-question-container', { timeout: 30000 });
    await sleep(800);
    const seen = [];
    for (let i = 0; i < hw1.nq; i++) {
      seen.push(await sp.evaluate(() => document.getElementById('hp-question-container').innerText));
      if (i < hw1.nq - 1) { await sp.evaluate(() => document.getElementById('btn-hp-next').click()); await sleep(250); }
    }
    const html = await sp.evaluate(() => document.documentElement.outerHTML);
    check('C9 الطالب يرى الواجب كاملاً (12 سؤالاً) بلا أخطاء جافاسكربت', seen.length === 12 && seen.every(x => x.trim().length > 10) && stuErrors.length === 0, stuErrors.join('|'));
    check('C10 صفحة الطالب لا تحوي خريطة التتبّع ولا مقاطع الأسئلة', !html.includes('"segment"') && !html.includes('lastWrongTs') && !html.includes('skillFocus'));
    const hasVisual = hw1.questions.some(q => hw1.tracking[q.id].fmt === 'visual_page');
    check('C11 سؤال الذاكرة البصرية (إن وُجد) يظهر للطالب بتنبيه «لا تفتح المصحف» وخيارين', !hasVisual || seen.some(x => x.includes('لا تفتح المصحف') && x.includes('الصفحة اليمنى') && x.includes('الصفحة اليسرى')));
    await sctx.close();
  }

  // سؤال الذاكرة البصرية (إن وُجد) صحيح الإجابة بحسب رقم الصفحة الحقيقي
  const visual = await page.evaluate(async (hw) => {
    const { AppState } = await import('/core/app.js');
    const out = [];
    for (const q of hw.questions) {
      const m = hw.tracking[q.id];
      if (m.fmt !== 'visual_page') continue;
      const surah = await AppState.quranEngine.getSurah(m.surah);
      const ay = surah.ayahs[m.ayah - 1], next = surah.ayahs[m.ayah];
      out.push({ ok: q.correctAnswer === (ay.page % 2 === 1 ? 'الصفحة اليمنى' : 'الصفحة اليسرى') && next.page === ay.page, title: q.title });
    }
    return out;
  }, hw1);
  check('C8 أسئلة الذاكرة البصرية (إن ظهرت) إجابتها وفق رقم الصفحة الحقيقي وتحمل تنبيه عدم فتح المصحف', visual.every(v => v.ok && v.title.includes('لا تفتح المصحف')), `${visual.length} سؤالاً`);

  console.log('\n=== تسليم الطالب واعتماد المعلم ===');
  const answers = {};
  hw1.questions.forEach((q, i) => {
    if (q.needsManualGrading) answers[q.id] = 'إجابة كتابية';
    else if (i % 3 === 0) answers[q.id] = q.type === 'mcq' ? '__خطأ__' : (Array.isArray(q.correctAnswer) ? [] : '__خطأ__');
    else answers[q.id] = q.correctAnswer;
  });
  const sub = be.post({ action: 'submit', hwId: hw1.id, clientSubmissionId: 'c_' + 'a1b2c3d4e5f60718293a4b5c6d7e8f90', studentName: 'محمد التجريبي', answers });
  check('D1 الخادم قبل تسليم الطالب', sub.ok === true, JSON.stringify(sub).slice(0, 100));

  const approved = await page.evaluate(async ({ hwId, studentName }) => {
    const { AppState } = await import('/core/app.js');
    const api = await import('/core/homeworkApi.js');
    const rec = await import('/core/homeworkRecords.js');
    const students = await AppState.studentManager.getAllStudents();
    const student = students.find(s => s.name === studentName);
    const subs = await api.getSubmissionsFromCloud(hwId);
    const s = subs[0];
    const manual = {};
    (s.details || []).filter(d => d.needsManualGrading).forEach(d => { manual[d.qid] = 0; });   // المعلم يصحّح اليدوي: خطأ
    const updated = await api.gradeSubmissionOnServer(s.id, manual, student.id, s.version, '');
    const res = await rec.recordApprovedResult(student, updated, null);
    return { subId: updated.id, status: updated.status, score: updated.finalScore, nDetails: updated.details.length, wrong: updated.details.filter(d => !d.isCorrect && !d.needsManualGrading).length,
      manualWrong: updated.details.filter(d => d.needsManualGrading).length, verified: res.verified, studentId: student.id };
  }, { hwId: hw1.id, studentName: 'محمد التجريبي' });
  await sleep(1500);
  check('D2 المعلم اعتمد التسليم (approved)', approved.status === 'approved', JSON.stringify({ s: approved.status, score: approved.score }));

  const readEvents = () => page.evaluate(async (sid) => (await (await import('/core/app.js')).AppState.trackingManager.getEventsForStudent(sid)), approved.studentId);
  let events = await readEvents();
  const hwEvents = events.filter(e => e.source === 'homework');
  check('D3 أُنشئت أحداث أداء لكل سؤال مصحَّح (12)', hwEvents.length === 12, String(hwEvents.length));
  check('D4 كل حدث يحمل المهارة والموضع والصيغة من خريطة التتبّع', hwEvents.every(e => e.skill && e.segment && e.fmt && e.surah >= 79 && e.refId === approved.subId));
  const wrongEv = hwEvents.filter(e => e.score < 0.5).length;
  check('D5 عدد الأحداث الخاطئة = الأخطاء الفعلية (آلي + يدوي)', wrongEv === approved.wrong + approved.manualWrong, `${wrongEv} = ${approved.wrong}+${approved.manualWrong}`);
  await page.evaluate(async ({ hwId, studentName }) => {
    const { AppState } = await import('/core/app.js');
    const rec = await import('/core/homeworkRecords.js'), api = await import('/core/homeworkApi.js');
    const student = (await AppState.studentManager.getAllStudents()).find(s => s.name === studentName);
    const subs = await api.getSubmissionsFromCloud(hwId);
    await rec.recordApprovedResult(student, subs[0], null);
  }, { hwId: hw1.id, studentName: 'محمد التجريبي' });
  await sleep(1200);
  events = await readEvents();
  check('D6 إعادة الاعتماد لا تكرّر الأحداث', events.filter(e => e.source === 'homework').length === hwEvents.length);

  console.log('\n=== الواجب التالي: التكرار العلاجي والتخطيط ===');
  const next = await page.evaluate(async (sid) => {
    const { AppState } = await import('/core/app.js');
    const svc = await import('/core/trackingService.js');
    const { HomeworkEngine } = await import('/engine/homeworkEngine.js');
    const student = (await AppState.studentManager.getAllStudents()).find(s => s.id === sid);
    const eng = new HomeworkEngine(AppState.quranEngine);
    const res = await svc.planSmartHomework(student, 12, { hwEngine: eng });
    const ctx = res.ctx;
    const wrongSegs = {};
    (await AppState.trackingManager.getEventsForStudent(sid)).filter(e => e.score < 0.5).forEach(e => { wrongSegs[e.segment] = (wrongSegs[e.segment] || []).concat(e.fmt); });
    return { ok: res.ok, n: res.questions.length, why: res.why, wrongSegs, levels: ctx.levels, status: svc && null };
  }, approved.studentId);
  const errItems = next.why.filter(m => m.cat === 'err');
  check('E1 الواجب الثاني يُولَّد (12 سؤالاً)', next.ok && next.n === 12);
  check('E2 أسئلة علاجية موجودة وبحدّ أقصى 25% (≤3 من 12)', errItems.length >= 1 && errItems.length <= 3, String(errItems.length));
  check('E3 كل سؤال علاجي من مقطع أخطأ فيه الطالب فعلاً', errItems.every(m => next.wrongSegs[m.segment]));
  check('E4 السؤال العلاجي بصيغة مختلفة عن التي أخطأ فيها', errItems.every(m => !(next.wrongSegs[m.segment] || []).includes(m.fmt)), errItems.map(m => m.fmt).join(','));
  check('E5 مستويات المقاطع محسوبة (يوجد «يحتاج علاجاً»)', next.levels.needs_fix >= 1, JSON.stringify(next.levels));

  console.log('\n=== بناء الملف من البيانات الحالية ===');
  const bf = await page.evaluate(async (sid) => {
    const { AppState } = await import('/core/app.js');
    const svc = await import('/core/trackingService.js');
    const student = (await AppState.studentManager.getAllStudents()).find(s => s.id === sid);
    const surah112 = await AppState.quranEngine.getSurah(112);
    const nameOf = (n) => AppState.surahsData.find(s => s.number === n).name;
    // أخطاء قديمة في قائمة الطالب (مثل ما تُسجّل الألعاب اليوم)
    student.weaknesses = [{ text: 't1', num: 3, surahName: nameOf(79), questionType: 'mistake', errorTypesList: ['كلمة تحتاج مراجعة'], errorTypes: 'كلمة تحتاج مراجعة', dateRecorded: '2026-08-01T10:00:00Z' }];
    student.resolvedWeaknesses = [{ text: 't2', num: 2, surahName: nameOf(112), questionType: 'catch', errorTypes: 'نسيان آية', dateRecorded: '2026-07-01T10:00:00Z', dateResolved: '2026-07-10T10:00:00Z' }];
    await AppState.studentManager.updateStudent(student);
    // سجل واجب قديم بلا meta تتبّع (قبل هذا التحديث): سؤال «ماذا بعدها» عن الآية 2 من الإخلاص
    const key = 'history_' + student.id;
    const hist = JSON.parse(localStorage.getItem(key) || '[]');
    hist.push({ date: '2026 / 08 / 15', range: 'واجب منزلي', score: 50, hwId: 'HW_legacy_none', timestamp: Date.parse('2026-08-15T10:00:00Z'),
      details: [{ qid: 'z1', type: 'mcq', question: '﴿ ' + surah112.ayahs[1].text + ' ﴾', isCorrect: false, points: 1, earnedPoints: 0 }] });
    hist.push({ date: '2026 / 08 / 20', range: 'تقييم', score: 80, source: 'adult_game', mode: 'eval', timestamp: Date.parse('2026-08-20T10:00:00Z') });
    localStorage.setItem(key, JSON.stringify(hist));
    localStorage.removeItem('dh_tracking_bf_' + student.id);
    const stats = await svc.rebuildFromExisting(student);
    const events = await AppState.trackingManager.getEventsForStudent(sid);
    const again = await svc.rebuildFromExisting(student);
    const events2 = await AppState.trackingManager.getEventsForStudent(sid);
    return { stats, again, by: events.reduce((m, e) => (m[e.source] = (m[e.source] || 0) + 1, m), {}), total: events.length, total2: events2.length,
      legacy: events.find(e => e.source === 'backfill_homework') };
  }, approved.studentId);
  check('F1 الواجب القديم بلا meta دخل بموضعه من نص الآية', bf.stats.homeworkEvents === 1 && bf.legacy && bf.legacy.segment === '112:1-4' && bf.legacy.surah === 112 && bf.legacy.ayah === 2, JSON.stringify(bf.stats));
  check('F2 قائمة الأخطاء وأرشيفها دخلت (خطأ نشط + خطأ ثم صواب = 3 أحداث)', bf.stats.weaknessEvents === 3, String(bf.stats.weaknessEvents));
  check('F3 جلسة اللعب القديمة (بلا تفاصيل) مُبلَّغ عنها ولا تدخل المهارات', bf.stats.gameSessionsNoDetail === 1);
  check('F4 الواجب المعتمد حيّاً لم يُحتسب مرتين من السجل', bf.by.homework === hwEvents.length && bf.stats.homeworkEntries === 1, JSON.stringify(bf.by));
  check('F5 إعادة البناء آمنة للتكرار (العدد ثابت)', bf.total === bf.total2 && bf.again.homeworkEvents === 1);

  console.log('\n=== جلسات اللعب والموضع الشهري والملف ===');
  const g = await page.evaluate(async (sid) => {
    const { AppState } = await import('/core/app.js');
    const svc = await import('/core/trackingService.js');
    const student = (await AppState.studentManager.getAllStudents()).find(s => s.id === sid);
    const nameOf = (n) => AppState.surahsData.find(s => s.number === n).name;
    const n = await svc.recordGameSession(student, [
      { type: 'next', title: 'ماذا بعدها؟', surahName: nameOf(80), num: 12, isCorrect: false, errors: ['نسيان آية'], usedHint: false, timeTaken: 8.2 },
      { type: 'kids_word_order', surahName: nameOf(80), num: 5, isCorrect: true, errors: [], usedHint: false, timeTaken: 5 },
      { type: 'recite', surahName: nameOf(81), num: 3, isCorrect: true, errors: [], usedHint: false, timeTaken: 30 }
    ]);
    const events = (await AppState.trackingManager.getEventsForStudent(sid)).filter(e => e.source === 'game');
    return { n, skills: events.map(e => e.skill).sort(), quality: events.find(e => e.skill === 'sequence').quality };
  }, approved.studentId);
  check('G1 جلسة لعب سُجّلت أحداثها بالمهارة والجودة (التسلسل/البنية/الطلاقة)', g.n === 3 && g.skills.join() === 'fluency,sequence,structure' && g.quality.join() === 'forget', JSON.stringify(g));

  const mm = await page.evaluate(async (sid) => {
    const { AppState } = await import('/core/app.js');
    const svc = await import('/core/trackingService.js');
    const student = (await AppState.studentManager.getAllStudents()).find(s => s.id === sid);
    const before = await svc.loadContext(student, { ensureBackfill: false });
    const now = new Date();
    await AppState.monthlyMemorizationManager.saveBeginning(sid, now.getFullYear(), now.getMonth() + 1, { surahNumber: 79, ayahNumber: 1 });
    await AppState.monthlyMemorizationManager.saveEnding(sid, now.getFullYear(), now.getMonth() + 1, { surahNumber: 78, ayahNumber: 12 }, 58);
    const after = await svc.loadContext(student, { ensureBackfill: false });
    const stale = await svc.listStaleMonthlyStudents();
    return { before: { stale: before.stale.stale, hasRecords: before.stale.hasRecords, src: before.range.source, total: before.path.total },
      after: { stale: after.stale.stale, src: after.range.source, toSurah: after.range.toSurah, ayah: after.range.frontierAyah, total: after.path.total },
      staleNames: stale.map(x => x.student.name) };
  }, approved.studentId);
  check('H1 قبل التسجيل الشهري: تنبيه تقادم ومصدر النطاق = ملف الطالب', mm.before.stale && !mm.before.hasRecords && mm.before.src === 'student', JSON.stringify(mm.before));
  check('H2 بعد تسجيل نهاية الشهر (النبأ:12): النطاق يمتد للموضع الدقيق ويزول التنبيه', !mm.after.stale && mm.after.src === 'monthly' && mm.after.toSurah === 78 && mm.after.ayah === 12 && mm.after.total === mm.before.total + 12, JSON.stringify(mm.after));
  check('H3 قائمة «موضع قديم» تضم الطالب بلا سجل لا المحدَّث', !mm.staleNames.includes('محمد التجريبي'));

  await page.evaluate(async (sid) => {
    const { AppState } = await import('/core/app.js');
    const student = (await AppState.studentManager.getAllStudents()).find(s => s.id === sid);
    const m = await import('/components/skillProfile.js');
    m.openSkillProfileModal(student);
  }, approved.studentId);
  await page.waitForSelector('.sk-box .sk-sec', { timeout: 15000 });
  await sleep(800);
  const prof = await page.evaluate(() => document.querySelector('.sk-box').innerText);
  check('I1 ملف المهارات: المهارات السبع والتشخيص وجودة الأداء والمصفوفة والخريطة', ['التسلسل والترابط', 'الاستدعاء الحر', 'بنية الآية', 'الدقة والتمييز', 'الربط بالسورة', 'الذاكرة البصرية', 'الإتقان والطلاقة', 'التشخيص التلقائي', 'جودة الأداء', 'خريطة إتقان المقاطع'].every(x => prof.includes(x)));
  check('I2 ملف المهارات يعرض نسباً فعلية ونطاق الحفظ', /\d+٪/.test(prof) && prof.includes('نطاق الحفظ المعتمد'));
  await shot(page, '3-skill-profile');
  await page.evaluate(() => document.querySelector('.sk-x').click());

  console.log('\n=== التقرير الشهري ===');
  await page.evaluate(async (sid) => {
    const { AppState } = await import('/core/app.js');
    const student = (await AppState.studentManager.getAllStudents()).find(s => s.id === sid);
    const m = await import('/reports/monthly-report.js');
    m.openMonthlyReportScreen({ student });
  }, approved.studentId);
  await page.waitForSelector('#mr-skills-block', { state: 'attached', timeout: 20000 });
  await sleep(3500);
  const mr = await page.evaluate(() => { const b = document.getElementById('mr-skills-block'); return { shown: b && b.style.display !== 'none', text: b ? b.innerText : '' }; });
  check('L1 التقرير الشهري يعرض قسم «مهارات الطالب هذا الشهر» بنسب وسطور ملخّص', mr.shown && mr.text.includes('مهارات الطالب هذا الشهر') && /\d+%/.test(mr.text) && mr.text.includes('استند التقييم إلى'), mr.text.replace(/\s+/g, ' ').slice(0, 120));
  await shot(page, '4-monthly-report');
  await page.evaluate(() => document.getElementById('header-home-btn')?.click());
  await sleep(800);

  console.log('\n=== سؤال الذاكرة البصرية من طرف الطالب (واجب مخصّص لهذا السؤال) ===');
  const vis = await page.evaluate(async (sid) => {
    const { AppState } = await import('/core/app.js');
    const api = await import('/core/homeworkApi.js');
    const { HomeworkEngine } = await import('/engine/homeworkEngine.js');
    const eng = new HomeworkEngine(AppState.quranEngine);
    const surah = await AppState.quranEngine.getSurah(100);
    let i = surah.ayahs.findIndex((a, k) => k < surah.ayahs.length - 1 && a.page === surah.ayahs[k + 1].page);
    const ayah = { ...surah.ayahs[i], surahNumber: 100, surahName: surah.name };
    const built = await eng.buildQuestionForPlan('visual_page', ayah, [ayah], { allowFallback: false });
    const created = await api.publishHomeworkToServer({ questions: [built.question], assignedStudentName: 'محمد التجريبي', assignedStudentId: sid,
      meta: { app: 'darham', tracking: { [built.question.id]: { surah: 100, ayah: ayah.numberInSurah, segment: '100:1-11', skill: 'visual', fmt: 'visual_page', cat: 'near' } } } });
    return { id: created.id, qid: built.question.id, correct: built.question.correctAnswer, page: ayah.page };
  }, approved.studentId);
  {
    const sctx = await browser.newContext({ locale: 'ar', viewport: { width: 420, height: 900 } });
    await sctx.route('**/*', async (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === 'localhost') return route.continue();
      if (u.href.startsWith(API)) {
        const req = route.request();
        const out = req.method() === 'GET' ? be.get(Object.fromEntries(u.searchParams)) : be.post(req.postData() || '');
        return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(out) });
      }
      return route.abort();
    });
    const sp = await sctx.newPage();
    await sp.goto(`${WEB}/index.html?hw=${vis.id}`);
    await sp.waitForSelector('#btn-enter-hw', { state: 'visible', timeout: 30000 });
    await sleep(1200);
    await sp.evaluate(() => document.getElementById('btn-enter-hw').click());
    await sp.waitForSelector('#hp-question-container', { timeout: 30000 });
    await sleep(600);
    const qtxt = await sp.evaluate(() => document.getElementById('hp-question-container').innerText);
    check('K1 الطالب يرى تنبيه «لا تفتح المصحف» وخياري اليمنى/اليسرى', qtxt.includes('لا تفتح المصحف') && qtxt.includes('الصفحة اليمنى') && qtxt.includes('الصفحة اليسرى'));
    check('K2 الإجابة الصحيحة تطابق رقم الصفحة الحقيقية (' + vis.page + ')', vis.correct === (vis.page % 2 === 1 ? 'الصفحة اليمنى' : 'الصفحة اليسرى'));
    await sp.evaluate((c) => { [...document.querySelectorAll('#hp-question-container input[type="radio"]')].find(r => r.value === c).click(); }, vis.correct);
    await sleep(300);
    await sp.evaluate(() => document.getElementById('btn-hp-submit').click());
    await sleep(3500);
    const subs = be.post({ action: 'listSubmissions', userId: auth.userId, sessionKey: auth.sessionKey, hwId: vis.id });
    check('K3 الإجابة الصحيحة تُصحَّح آلياً في الخادم بلا أي تعديل عليه', subs.ok && subs.submissions.length === 1 && subs.submissions[0].details[0].isCorrect === true, JSON.stringify((subs.submissions || []).map(x => x.finalScore)));
    await sctx.close();
  }

  console.log('\n=== حذف الطالب ===');
  const purged = await page.evaluate(async (sid) => {
    const { AppState } = await import('/core/app.js');
    const { purgeStudentRelatedData } = await import('/core/studentCleanup.js');
    const before = await AppState.trackingManager.countForStudent(sid);
    await purgeStudentRelatedData(sid);
    return { before, after: await AppState.trackingManager.countForStudent(sid) };
  }, approved.studentId);
  check('J1 حذف الطالب يمسح سجل أدائه بالكامل', purged.before > 0 && purged.after === 0, JSON.stringify(purged));

  check('Z لا أخطاء جافاسكربت غير ملتقطة أثناء الاختبار كله', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
} catch (e) {
  console.log('اختبار توقف بخطأ:', e && e.stack || e);
  results.push({ name: 'اكتمال الاختبار', ok: false });
}
await browser.close(); srv.close();
const passed = results.filter(r => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
