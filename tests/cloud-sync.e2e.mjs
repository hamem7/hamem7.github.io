// tests/cloud-sync.e2e.mjs — اختبار وظيفي لمزامنة سجل الطالب بين أجهزة المعلم ومراقبة الأخطاء (متصفح حقيقي + Code.gs عبر المحاكي).
// الاستعمال: PLAYWRIGHT_MODULE_DIR=$(dirname $(npm root -g)) PW_CHROMIUM=/opt/pw-browsers/chromium node tests/cloud-sync.e2e.mjs [siteRoot]
// كل سياق متصفح = جهاز معلم مستقل (IndexedDB/localStorage منفصلة)، وكلها تكلّم نفس الخادم (مثل الأجهزة الحقيقية بنفس حساب جوجل).
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

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(siteRoot, p);
  if (!f.startsWith(siteRoot) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
await new Promise(r => srv.on('listening', r));
const WEB = `http://localhost:${srv.address().port}`;

const FAKE_GSI = `window.google = { accounts: { id: { _cb: null, initialize(o) { this._cb = o.callback; }, renderButton() {}, prompt() {}, disableAutoSelect() {} } } };`;
const apiLog = [];
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });
const pageErrors = [];

async function newDevice(label) {
  const ctx = await browser.newContext({ locale: 'ar', viewport: { width: 1100, height: 900 } });
  await ctx.route('**/*', async (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === 'localhost') return route.continue();
    if (u.href.startsWith(API)) {
      const req = route.request();
      const out = req.method() === 'GET' ? be.get(Object.fromEntries(u.searchParams)) : be.post(req.postData() || '');
      const action = req.method() === 'GET' ? u.searchParams.get('action') : (() => { try { return JSON.parse(req.postData()).action; } catch { return '?'; } })();
      apiLog.push({ label, action, ok: out.ok, code: out.code });
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(out) });
    }
    if (u.href.startsWith('https://accounts.google.com/gsi/client')) return route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_GSI });
    return route.abort();
  });
  const page = await ctx.newPage();
  page.on('dialog', d => d.dismiss().catch(() => {}));
  page.on('pageerror', e => { pageErrors.push(`[${label}] ${e.message}`); console.log(`   [pageerror ${label}] ${e.message}`); });
  await page.goto(WEB + '/index.html');
  await page.waitForSelector('#btn-my-students-main', { timeout: 30000 });
  await new Promise(r => setTimeout(r, 800));
  return page;
}

const results = [];
function check(name, cond, detail = '') { results.push({ name, ok: !!cond }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); }

// أدوات داخل الصفحة
const signIn = (p) => p.evaluate(async () => { const { googleSignIn } = await import('/core/api.js'); await googleSignIn('tokT'); return true; });
const sync = (p) => p.evaluate(async () => { const m = await import('/core/cloudSync.js'); return m.syncNow({ signIn: false }); });
const addStudent = (p, name, hist, evs) => p.evaluate(async ({ name, hist, evs }) => {
  const { AppState } = await import('/core/app.js');
  const id = await AppState.studentManager.addStudent({ name, type: 'adult' });
  if (hist.length) localStorage.setItem('history_' + id, JSON.stringify(hist));
  if (evs.length) await AppState.trackingManager.addEvents(evs.map(e => ({ ...e, studentId: String(id) })));
  return id;
}, { name, hist, evs });
const snapshot = (p) => p.evaluate(async () => {
  const { AppState } = await import('/core/app.js');
  const students = await AppState.studentManager.getAllStudents();
  const out = {};
  for (const s of students) {
    const ev = await AppState.trackingManager.getEventsForStudent(s.id);
    let h = []; try { h = JSON.parse(localStorage.getItem('history_' + s.id)) || []; } catch (e) {}
    out[s.name] = { id: s.id, uid: s.syncUid, totalScore: s.totalScore, hist: h.map(x => x.submissionId || x.range).sort(), ev: ev.map(e => `${e.source}|${e.refId}|${e.qid}|${e.ts}`).sort() };
  }
  return out;
});
const H = (id, ts, score = 80) => ({ submissionId: id, hwId: 'HW_x', range: 'واجب منزلي: ' + id, score, timestamp: ts, source: 'homework', approved: true, details: [{ qid: 'q1', correct: true }] });
const E = (refId, qid, ts, extra = {}) => ({ ts, source: 'homework', refId, qid, surah: 114, ayah: 1, segment: '114:1', skill: 'recall', fmt: 'dropdown', score: 1, weight: 1, ...extra });
const T0 = Date.UTC(2026, 9, 5);

try {
  console.log('=== جهاز A: بيانات أولية ثم أول مزامنة ===');
  const A = await newDevice('A');
  check('0 زر المزامنة موجود في ملف المعلم برسالة «لم تُجرَ مزامنة»', await A.evaluate(() => !!document.getElementById('teacher-sync-btn') && !!document.getElementById('teacher-sync-info')));
  await signIn(A);
  const ahmadA = await addStudent(A, 'أحمد', [H('S1', T0), H('S2', T0 + 1000)], [E('S1', 'q1', T0), E('S1', 'q2', T0), E('S2', 'q1', T0 + 1000)]);
  await addStudent(A, 'سارة', [H('S3', T0 + 2000)], [E('S3', 'q1', T0 + 2000)]);
  const rA1 = await sync(A);
  check('1 أول مزامنة على A ناجحة وترفع أجزاء', rA1.ok && rA1.partsPushed >= 4 && rA1.errors.length === 0, JSON.stringify(rA1));
  const snapA1 = await snapshot(A);
  check('2 كل طالب في A نال معرّف مزامنة ثابت', Object.values(snapA1).every(s => /^S[0-9a-f]{16}$/.test(s.uid || '')));
  const rA2 = await sync(A);
  check('3 مزامنة ثانية بلا تغيير: لا رفع ولا سحب (idempotent)', rA2.ok && rA2.partsPushed === 0 && rA2.partsPulled === 0 && rA2.eventsAdded === 0, JSON.stringify(rA2));

  console.log('\n=== جهاز B جديد (تغيير الهاتف) ===');
  const B = await newDevice('B');
  await signIn(B);
  check('4 B فارغ قبل المزامنة', Object.keys(await snapshot(B)).length === 0);
  const rB1 = await sync(B);
  check('5 مزامنة B تُنشئ الطالبين وتسحب السجل والأحداث', rB1.ok && rB1.newStudents === 2 && rB1.historyAdded === 3 && rB1.eventsAdded === 4, JSON.stringify(rB1));
  const snapB1 = await snapshot(B);
  const same = (x, y) => JSON.stringify(x.hist) === JSON.stringify(y.hist) && JSON.stringify(x.ev) === JSON.stringify(y.ev) && x.uid === y.uid;
  check('6 سجل B مطابق لـ A تماماً (بلا تكرار) لأحمد وسارة', same(snapA1['أحمد'], snapB1['أحمد']) && same(snapA1['سارة'], snapB1['سارة']) &&
    snapB1['أحمد'].hist.length === 2 && snapB1['أحمد'].ev.length === 3);
  const rB2 = await sync(B);
  check('7 مزامنة B ثانية: لا رفع (لم يتغير شيء) ولا تضاعف', rB2.ok && rB2.partsPushed === 0 && rB2.eventsAdded === 0, JSON.stringify(rB2));

  console.log('\n=== تعديلات متزامنة على الجهازين ثم تقارب ===');
  await A.evaluate(async ({ id, h, e }) => {
    const { AppState } = await import('/core/app.js');
    const k = 'history_' + id; const l = JSON.parse(localStorage.getItem(k)); l.push(h); localStorage.setItem(k, JSON.stringify(l));
    await AppState.trackingManager.addEvents([{ ...e, studentId: String(id) }]);
  }, { id: ahmadA, h: H('S4-from-A', T0 + 5000), e: E('S4-from-A', 'q1', T0 + 5000) });
  const idB = snapB1['أحمد'].id;
  await B.evaluate(async ({ id, h, e }) => {
    const { AppState } = await import('/core/app.js');
    const k = 'history_' + id; const l = JSON.parse(localStorage.getItem(k)); l.push(h); localStorage.setItem(k, JSON.stringify(l));
    await AppState.trackingManager.addEvents([{ ...e, studentId: String(id) }]);
  }, { id: idB, h: H('S5-from-B', T0 + 6000), e: E('S5-from-B', 'q1', T0 + 6000) });
  const rA3 = await sync(A);       // A يرفع أولاً
  const rB3 = await sync(B);       // B يسحب جزء A ويدمج ويرفع (قد يمرّ بتعارض ويعيد المحاولة)
  const rA4 = await sync(A);       // A يسحب ما أضافه B
  check('8 المزامنات الثلاث نجحت بلا أخطاء ولا تعارض عالق', rA3.ok && rB3.ok && rA4.ok, JSON.stringify([rA3, rB3, rA4]));
  const sA = await snapshot(A), sB = await snapshot(B);
  check('9 الجهازان تقاربا: كل منهما فيه تقييم الآخر وحدث الآخر (اتحاد) بلا تكرار',
    same(sA['أحمد'], sB['أحمد']) && sA['أحمد'].hist.length === 4 && sA['أحمد'].ev.length === 5 &&
    sA['أحمد'].hist.includes('S4-from-A') && sA['أحمد'].hist.includes('S5-from-B'));

  console.log('\n=== إعادة اعتماد تسليم (أحدث نسخة فقط) ===');
  await A.evaluate(async ({ id }) => {
    const { AppState } = await import('/core/app.js');
    await AppState.trackingManager.replaceEventsForRef(String(id), 'homework', 'S1', [
      { ts: Date.UTC(2026, 9, 9), source: 'homework', refId: 'S1', qid: 'q1', surah: 114, ayah: 1, segment: '114:1', skill: 'recall', fmt: 'dropdown', score: 0, weight: 1 },
      { ts: Date.UTC(2026, 9, 9), source: 'homework', refId: 'S1', qid: 'q2', surah: 114, ayah: 1, segment: '114:1', skill: 'recall', fmt: 'dropdown', score: 0, weight: 1 }
    ].map(e => ({ ...e, studentId: String(id) })));
  }, { id: ahmadA });
  await sync(A); await sync(B);
  const sA2 = await snapshot(A), sB2 = await snapshot(B);
  const s1ev = (s) => s['أحمد'].ev.filter(x => x.startsWith('homework|S1|'));
  check('10 إعادة اعتماد S1 على A تصل إلى B دون تضاعف أحداث S1 (2 فقط، الأحدث)', s1ev(sA2).length === 2 && s1ev(sB2).length === 2 && s1ev(sB2).every(x => x.endsWith(String(Date.UTC(2026, 9, 9)))), JSON.stringify(s1ev(sB2)));

  console.log('\n=== جهاز C فيه طالب بنفس الاسم (تبنٍّ) وطالب محذوف (tombstone) ===');
  const C = await newDevice('C');
  await signIn(C);
  await addStudent(C, 'أحمد', [H('S-local-C', T0 + 9000)], [E('S-local-C', 'q1', T0 + 9000)]);
  const rC1 = await sync(C);
  const sC = await snapshot(C);
  check('11 C تبنّى «أحمد» المحلي (لم يُنشئ نسخة ثانية) ودمج سجله مع الخادم', rC1.ok && rC1.adopted === 1 && Object.keys(sC).filter(n => n === 'أحمد').length === 1 &&
    sC['أحمد'].hist.includes('S-local-C') && sC['أحمد'].hist.includes('S4-from-A') && sC['سارة'], JSON.stringify(rC1));
  await sync(A);
  check('12 A تلقّى سجل C المحلي (يرفعه C ثم يسحبه A)', (await snapshot(A))['أحمد'].hist.includes('S-local-C'));

  await C.evaluate(async () => {
    const { AppState } = await import('/core/app.js');
    const m = await import('/core/cloudSync.js');
    const s = (await AppState.studentManager.getAllStudents()).find(x => x.name === 'سارة');
    m.recordStudentDeletion(s);
    await AppState.studentManager.deleteStudent(s.id);
  });
  const rC2 = await sync(C);
  const sC2 = await snapshot(C), sB3 = await snapshot(B);
  check('13 الطالب المحذوف على C لا يعود إليه بالمزامنة، ويبقى عند B (الحذف لا ينتشر)', rC2.ok && !sC2['سارة'] && !!sB3['سارة'], JSON.stringify(rC2));

  console.log('\n=== مراقبة الأخطاء ===');
  const hw = be.post({ action: 'createHomework', ...(() => { const r = be.post({ action: 'googleSignIn', idToken: 'tokT' }); return { userId: r.userId, sessionKey: r.sessionKey }; })(), homework: { questions: [{ id: 'q1', type: 'mcq', title: 'x', options: ['a', 'b'], correctAnswer: 'a', points: 1 }] } });
  const S = await newDevice('Student');
  await S.evaluate(async (hwId) => {
    const m = await import('/core/errorReporter.js');
    m.initErrorReporter({ getHwId: () => hwId });
    m.reportSubmitFailure(hwId, 'NETWORK', 'تعذّر الاتصال بالخادم', 1, false);
    m.reportLoadFailure(hwId, 'NOT_FOUND', 'x');                         // متوقَّع: لا يُبلَّغ
    setTimeout(() => { throw new Error('boom from student page'); }, 10);
    m.reportClientError({ kind: 'js_error', message: 'ResizeObserver loop limit exceeded' });   // ضجيج: يُهمل
  }, hw.id);
  await new Promise(r => setTimeout(r, 1500));
  const auth = (() => { const r = be.post({ action: 'googleSignIn', idToken: 'tokT' }); return { userId: r.userId, sessionKey: r.sessionKey }; })();
  const errs = be.post({ action: 'listClientErrors', ...auth });
  check('14 أخطاء صفحة الطالب وصلت للمعلم: فشل الإرسال + عطل الصفحة (بلا ضجيج ولا NOT_FOUND)',
    errs.total === 2 && errs.items.some(i => i.kind === 'submit_failed' && i.hwId === hw.id) && errs.items.some(i => i.kind === 'js_error' && /boom/.test(i.message)), JSON.stringify(errs.items.map(i => i.kind + ':' + i.message)));
  // بلا اتصال: التقرير يُحفظ محلياً ثم يُرسل عند عودة الاتصال
  await S.context().setOffline(true);
  const queuedLen = await S.evaluate(async (hwId) => {
    const m = await import('/core/errorReporter.js');
    m.reportClientError({ kind: 'submit_failed', hwId, code: 'NETWORK', message: 'تعذّر الاتصال (بلا إنترنت)' });
    return JSON.parse(localStorage.getItem('dh_err_queue') || '[]').length;
  }, hw.id);
  await S.context().setOffline(false);
  await S.evaluate(() => window.dispatchEvent(new Event('online')));
  await new Promise(r => setTimeout(r, 1200));
  const errs2 = be.post({ action: 'listClientErrors', ...auth });
  const queueAfter = await S.evaluate(() => JSON.parse(localStorage.getItem('dh_err_queue') || '[]').length);
  check('15 تقرير فشل بلا إنترنت يُحفظ محلياً ثم يصل عند عودة الاتصال', queuedLen === 1 && queueAfter === 0 && errs2.total === 3, `queued=${queuedLen} after=${queueAfter} total=${errs2.total}`);
  const sheetText = JSON.stringify(be.ss.getSheetByName('ClientLogs').data);
  check('15b لا أسماء طلاب ولا إجابات في سجل الأخطاء', !/studentName|answers/.test(sheetText));

  check('16 لا أخطاء جافاسكربت غير متوقعة في الصفحات (عدا الخطأ المتعمَّد)', pageErrors.filter(e => !/boom from student page/.test(e)).length === 0, pageErrors.join(' | '));
  check('17 لم ينتج أي رد خادم فاشل غير متوقع أثناء المزامنة', apiLog.filter(x => /^sync/.test(x.action) && x.ok === false).length === 0, JSON.stringify(apiLog.filter(x => x.ok === false)));
} catch (e) {
  console.log('FATAL', e);
  results.push({ name: 'fatal', ok: false });
} finally {
  await browser.close(); srv.close();
}
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
