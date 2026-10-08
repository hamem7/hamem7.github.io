// tests/hw-schedule.e2e.mjs — اختبار وظيفي لتذكير الواجب الأسبوعي في «مهام اليوم» وشاشة «جدول الأسبوع».
// الاستعمال: node tests/hw-schedule.e2e.mjs [siteRoot]   (يحتاج Playwright + Chromium: PW_CHROMIUM وPLAYWRIGHT_MODULE_DIR)
// يغطي: التوزيع التلقائي عند أول تشغيل (عشرة طلاب)، ظهور الطالب يوم موعده ثم متأخراً يوماً بيوم، اختفاؤه بنشر واجب له، «رحّل لغد»،
// تنبيه الازدحام فوق الطاقة، شاشة جدول الأسبوع (تعديل يوم، إعادة توزيع، أيام العمل)، الطالب الجديد والمخفي والموقوف.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(process.env.PLAYWRIGHT_MODULE_DIR ? path.join(process.env.PLAYWRIGHT_MODULE_DIR, '/') : import.meta.url);
const { chromium } = require('playwright');
const [siteRoot = REPO] = process.argv.slice(2);

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(siteRoot, p);
  if (!f.startsWith(siteRoot) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
await new Promise(r => srv.on('listening', r));
const WEB = `http://localhost:${srv.address().port}`;

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });
const ctx = await browser.newContext({ locale: 'ar', viewport: { width: 420, height: 900 } });
await ctx.route('**/*', (route) => new URL(route.request().url()).hostname === 'localhost' ? route.continue() : route.abort());
const page = await ctx.newPage();
const dialogs = [];
page.on('dialog', d => { dialogs.push({ type: d.type(), msg: d.message() }); (d.type() === 'confirm' ? d.accept() : d.dismiss()).catch(() => {}); });
const pageErrors = [];
page.on('pageerror', e => { pageErrors.push(e.message); console.log(`   [pageerror] ${e.message}`); });

const results = [];
function check(name, cond, detail = '') { results.push({ name, ok: !!cond }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const shot = async (name) => { if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, name + '.png'), fullPage: true }); };

async function boot() {
  await page.goto(WEB + '/index.html');
  await page.waitForSelector('#btn-my-students-main', { timeout: 30000 });
  await sleep(2500);
}
const readStudents = () => page.evaluate(async () => {
  const { AppState } = await import('/core/app.js');
  return (await AppState.studentManager.getAllStudents()).map(s => ({ id: s.id, name: s.name, hidden: !!s.isHidden, sched: s.hwSchedule || null }));
});
const dueRows = () => page.evaluate(() => [...document.querySelectorAll('#home-quickcard-due-list .home-quickcard-due-row')].map(r => ({
  name: r.querySelector('.qc-row-name').textContent, tags: [...r.querySelectorAll('.qc-tag')].map(t => t.textContent), snooze: !!r.querySelector('.qc-row-snooze') })));
const rerender = async () => { await page.evaluate(async () => { (await import('/components/homeQuickview.js')).initHomeQuickview(); }); await sleep(1800); };

try {
  await boot();
  const names = Array.from({ length: 10 }, (_, i) => `طالب ${i + 1}`);
  await page.evaluate(async (names) => {
    const { AppState } = await import('/core/app.js');
    for (const n of names) await AppState.studentManager.addStudent({ name: n, type: 'adult', memoFrom: 'الناس', memoTo: 'النازعات' });
    await AppState.studentManager.addStudent({ name: 'طالب مخفي', type: 'adult', isHidden: true });
  }, names);

  console.log('\n=== التوزيع التلقائي عند أول تشغيل ===');
  dialogs.length = 0;
  await boot();
  const st1 = await readStudents();
  const vis = st1.filter(s => !s.hidden);
  const workdays = [6, 0, 1, 2, 3, 4];
  const gapsOk = vis.every(s => { const d = [...s.sched.days].sort((a, b) => a - b); const g = d.map((x, i) => i === d.length - 1 ? d[0] + 7 - x : d[i + 1] - x); return d.length === 2 && Math.min(...g) >= 2; });
  const load = Object.fromEntries(workdays.map(d => [d, vis.filter(s => s.sched.days.includes(d)).length]));
  check('A1 كل طالب ظاهر وُزّع عليه يومان بفاصل ≥ يومين، من أيام السبت..الخميس فقط', vis.length === 10 && vis.every(s => s.sched && s.sched.days.every(d => workdays.includes(d))) && gapsOk, JSON.stringify(load));
  check('A2 الحمل متوازن (3–4 طلاب في اليوم، لا أكثر من الطاقة = 4) وكل أيام العمل مستعملة', Math.max(...Object.values(load)) <= 4 && Math.min(...Object.values(load)) >= 3, JSON.stringify(load));
  check('A3 الطالب المخفي لا يُجدوَل', st1.find(s => s.hidden).sched === null);
  check('A4 تنبيه أول تشغيل يخبر بتوزيع 10 طلاب وبمكان المراجعة', dialogs.some(d => d.msg.includes('وُزّع 10') && d.msg.includes('جدول الأسبوع')), dialogs.map(d => d.msg.slice(0, 40)).join('|'));

  console.log('\n=== ظهور الطالب يوم موعده ثم متأخراً ===');
  const today = await page.evaluate(() => new Date().getDay());
  const wd = (back) => (today - back + 7) % 7;
  await page.evaluate(async ({ today }) => {
    const { AppState } = await import('/core/app.js');
    const all = await AppState.studentManager.getAllStudents();
    const day = 86400000, now = Date.now();
    const set = async (name, days, startBack) => {
      const s = all.find(x => x.name === name);
      s.hwSchedule = { days, startTs: now - startBack * day, auto: false };
      await AppState.studentManager.updateStudent(s);
    };
    const wd = (back) => (today - back + 7) % 7;
    await set('طالب 1', [wd(0), wd(0) === 6 ? 2 : 6], 0);                  // موعده اليوم
    await set('طالب 2', [wd(1), (wd(1) + 3) % 7], 3);                        // موعده أمس → متأخر 1
    await set('طالب 3', [wd(2), (wd(2) + 3) % 7], 5);                        // موعده قبل يومين → متأخر 2
    for (let i = 4; i <= 10; i++) await set('طالب ' + i, [], 0);             // الباقي موقوفون لعزل الاختبار
  }, { today });
  await rerender();
  let rows = await dueRows();
  const r = (n) => rows.find(x => x.name === n);
  check('B1 الطلاب الثلاثة الحاضرون في «مستحق اليوم» والموقوفون لا', ['طالب 1', 'طالب 2', 'طالب 3'].every(n => r(n)) && !rows.some(x => ['طالب 4', 'طالب 7', 'طالب مخفي'].includes(x.name)), rows.map(x => x.name).join());
  check('B2 الوسوم: «موعد واجب اليوم» / «متأخر 1 يوم» / «متأخر 2 يوم»', r('طالب 1').tags.some(t => t.includes('موعد واجب اليوم')) && r('طالب 2').tags.some(t => t.includes('متأخر 1 يوم')) && r('طالب 3').tags.some(t => t.includes('متأخر 2 يوم')), rows.map(x => x.tags.join('/')).join(' | '));
  check('B3 الأكثر تأخراً أولاً (طالب 3 ثم 2 ثم 1) ولكل صف زر «رحّل لغد»', rows.map(x => x.name).slice(0, 3).join() === 'طالب 3,طالب 2,طالب 1' && rows.slice(0, 3).every(x => x.snooze), rows.map(x => x.name).join());
  const sum = await page.evaluate(() => document.getElementById('home-quickcard-due-summary-text').textContent);
  check('B4 ملخص البطاقة يعدّ المنتظرين (3)', sum.includes('3') && sum.includes('ينتظرون'), sum);

  console.log('\n=== نشر واجب يُنهي التذكير، و«رحّل لغد» يؤجّله ===');
  await page.evaluate(async () => {
    const { AppState } = await import('/core/app.js');
    await AppState.homeworkManager.createHomework({ id: 'HW_test_pub', createdAt: new Date().toISOString(), status: 'published', assignedStudentName: 'طالب 2', questions: [{ id: 'q', type: 'mcq', text: 'x', options: ['a'], correctAnswer: 'a' }] });
    await AppState.homeworkManager.createHomework({ id: 'HW_test_draft', createdAt: new Date().toISOString(), status: 'draft', assignedStudentName: 'طالب 3', questions: [{ id: 'q', type: 'mcq', text: 'x', options: ['a'], correctAnswer: 'a' }] });
  });
  await rerender();
  rows = await dueRows();
  check('C1 نشر واجب لطالب 2 أزاله تلقائياً (بلا زر «تمّت»)، والمسودة لا تُحتسب (طالب 3 باقٍ)', !rows.some(x => x.name === 'طالب 2') && rows.some(x => x.name === 'طالب 3'), rows.map(x => x.name).join());
  await page.evaluate(() => [...document.querySelectorAll('#home-quickcard-due-list .home-quickcard-due-row')].find(r => r.querySelector('.qc-row-name').textContent === 'طالب 3').querySelector('.qc-row-snooze').click());
  await sleep(1800);
  rows = await dueRows();
  const s3 = (await readStudents()).find(s => s.name === 'طالب 3');
  check('C2 «رحّل لغد» يخفي الصف ويحفظ يوم العودة (أول يوم عمل لاحق)', !rows.some(x => x.name === 'طالب 3') && /^\d{4}-\d{2}-\d{2}$/.test(s3.sched.snoozeUntil), s3.sched.snoozeUntil);
  const back = await page.evaluate(async (key) => {
    const svc = await import('/core/hwScheduleService.js');
    const r = await svc.listDueToday(Date.parse(key + 'T12:00:00'));
    const x = r.rows.find(z => z.student.name === 'طالب 3');
    return x ? { late: x.lateDays } : null;
  }, s3.sched.snoozeUntil);
  check('C3 في يوم العودة يظهر طالب 3 من جديد متأخراً (لم يُعدّ له واجب)', back && back.late >= 2, JSON.stringify(back));

  console.log('\n=== تنبيه الازدحام فوق الطاقة ===');
  await page.evaluate(async ({ today }) => {
    const { AppState } = await import('/core/app.js');
    const all = await AppState.studentManager.getAllStudents();
    const now = Date.now();
    for (const n of ['طالب 4', 'طالب 5', 'طالب 6', 'طالب 7', 'طالب 8']) {
      const s = all.find(x => x.name === n);
      s.hwSchedule = { days: [today], startTs: now, auto: false };
      await AppState.studentManager.updateStudent(s);
    }
  }, { today });
  await rerender();
  const foot = await page.evaluate(() => document.querySelector('#home-quickcard-due-list .qc-foot')?.innerText || '');
  rows = await dueRows();
  check('D1 عند ازدحام اليوم (واجبات أكثر من الطاقة الموزَّعة) يظهر تنبيه برقم الطاقة', rows.length >= 6 && foot.includes('طاقتك الموزَّعة') && foot.includes('جدول الأسبوع'), foot.replace(/\s+/g, ' ').slice(0, 130));
  await shot('week-due-card');

  console.log('\n=== شاشة جدول الأسبوع ===');
  await page.evaluate(() => { document.getElementById('home-quickcard-due').classList.add('is-expanded'); document.querySelector('#home-quickcard-due-list .qc-foot-btn').click(); });
  await page.waitForSelector('.ws-box .ws-tbl', { timeout: 15000 }); await sleep(500);
  const head = await page.evaluate(() => [...document.querySelectorAll('.ws-tbl thead th small')].map(x => x.textContent));
  const rowsN = await page.evaluate(() => document.querySelectorAll('.ws-tbl tbody tr').length);
  const offDays = new Set((await readStudents()).flatMap(s => (s.sched && s.sched.days) || []).filter(d => !workdays.includes(d)));
  const extraCol = offDays.size;   // يوم مُسنَد خارج أيام العمل (كالجمعة) يظهر عموداً إضافياً بدل أن يختفي
  check('E1 الشاشة تعرض أيام العمل الستة بعدّاد لكل يوم/الطاقة وصفاً لكل طالب ظاهر (10 لا المخفي)', head.length === 6 + extraCol && head.every(x => /^\d+\/\d+$/.test(x)) && rowsN === 10, head.join(' '));
  await shot('week-schedule-modal');
  const before = (await readStudents()).find(s => s.name === 'طالب 9').sched.days;
  await page.evaluate(() => { const tr = [...document.querySelectorAll('.ws-tbl tbody tr')].find(t => t.querySelector('.ws-name').textContent === 'طالب 9'); tr.querySelector('.ws-d[data-d="6"]').click(); });
  await sleep(1200);
  const after = (await readStudents()).find(s => s.name === 'طالب 9').sched;
  check('E2 تبديل يوم لطالب يُحفظ فوراً في ملفه (إضافة السبت لطالب موقوف)', before.length === 0 && after.days.join() === '6' && after.auto === false, JSON.stringify(after.days));
  const pausedBefore = (await readStudents()).filter(s => !s.hidden && s.sched.days.length === 0).map(s => s.name);
  await page.evaluate(() => document.querySelector('#ws-rebalance').click());
  await sleep(2000);
  const st2 = (await readStudents()).filter(s => !s.hidden);
  const active2 = st2.filter(s => !pausedBefore.includes(s.name));
  const load2 = Object.fromEntries(workdays.map(d => [d, active2.filter(s => s.sched.days.includes(d)).length]));
  check('E3 «وزّع تلقائياً» يعيد توازناً للنشطين (فرق ≤ 1 بين الأيام، ويومان لكل طالب) ويُبقي الموقوفين موقوفين', pausedBefore.length >= 1 && active2.every(s => s.sched.days.length === 2) && st2.filter(s => pausedBefore.includes(s.name)).every(s => s.sched.days.length === 0)
    && Math.max(...Object.values(load2)) - Math.min(...Object.values(load2)) <= 1, JSON.stringify(load2) + ' موقوف: ' + pausedBefore.join());
  await page.evaluate(() => { const cb = document.querySelector('input[data-wd="5"]'); cb.click(); });
  await sleep(800);
  check('E4 أيام العمل قابلة للتعديل وتُحفظ (إضافة الجمعة)', (await page.evaluate(() => JSON.parse(localStorage.getItem('dh_hw_workdays')))).includes(5) && await page.evaluate(() => document.querySelectorAll('.ws-tbl thead th small').length) === 7);
  await page.evaluate(() => document.querySelector('input[data-wd="5"]').click()); await sleep(600);
  await page.evaluate(() => document.querySelector('.ws-x').click()); await sleep(500);

  console.log('\n=== طالب جديد ومدخل الواجب ===');
  const newRes = await page.evaluate(async () => {
    const { AppState } = await import('/core/app.js');
    const svc = await import('/core/hwScheduleService.js');
    await AppState.studentManager.addStudent({ name: 'طالب جديد', type: 'adult' });
    const r = await svc.ensureSchedules();
    const m = await svc.getWeekModel();
    const s = m.students.find(x => x.name === 'طالب جديد');
    const own = ((s.hwSchedule || {}).days || []).length;
    const pw = svc.perWeekOf(s);
    s.hwSchedule = { ...s.hwSchedule, days: [6, 1, 3] };
    return { assigned: r.assigned, firstRun: r.firstRun, days: m.summary.perDay.map(x => x.count), cap: m.summary.capacity, own, pw, pw3: svc.perWeekOf(s) };
  });
  check('F1 الطالب الجديد يُجدوَل تلقائياً دون إعادة أول تشغيل وبلا تجاوز الطاقة', newRes.assigned === 1 && newRes.firstRun === false && newRes.own === 2 && Math.max(...newRes.days) <= newRes.cap, JSON.stringify(newRes));
  check('F2 عدد مرات الطالب الفعلي يدخل في حساب الدورة (2 افتراضي، و3 لمن لديه 3 أيام)', newRes.pw === 2 && newRes.pw3 === 3);

  console.log('\n=== واجهة الواجب: زر الجدول ===');
  await page.evaluate(() => document.getElementById('header-home-btn')?.click()); await sleep(500);
  check('G1 لا أخطاء جافاسكربت غير ملتقطة أثناء الاختبار كله', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
} catch (e) {
  console.log('اختبار توقف بخطأ:', e && e.stack || e);
  results.push({ name: 'اكتمال الاختبار', ok: false });
}
await browser.close(); srv.close();
const passed = results.filter(r => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
