// tests/auth-separation.e2e.mjs — functional test: the CORE platform needs no login; Google Sign-In is for homework only.
// Usage: node tests/auth-separation.e2e.mjs [siteRoot] [codeGsPath] [mode]
//   defaults: this repo, backend/Code.gs, mode "new". mode "old" = assertions that reproduce the pre-2026-10-03 bug
//   (run it against an old checkout to see «هذا البريد غير مسموح له بدخول شاشة المعلم» come back).
//   Needs Playwright + Chromium (PW_CHROMIUM=/path/to/chrome to pick a binary; PLAYWRIGHT_MODULE_DIR for a global install).
// Runs the REAL backend Code.gs (in the Lab's Apps Script emulator) behind the production /exec URL, a fake Google
// Identity Services button (returns a fake ID token the emulated tokeninfo resolves), and a synthetic Quran payload.
// Every browser context starts EMPTY (no localStorage / IndexedDB / cookies) = a brand-new device.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(process.env.PLAYWRIGHT_MODULE_DIR ? path.join(process.env.PLAYWRIGHT_MODULE_DIR, '/') : import.meta.url);
const { chromium } = require('playwright');

const [siteRoot = REPO, codePath = path.join(REPO, 'backend/Code.gs'), mode = 'new'] = process.argv.slice(2);
const { createBackend, googleTokenMock } = await import(pathToFileURL(path.join(REPO, 'Dar-Ham-Homework-Lab/dev/gas-emulator.mjs')).href);
const CLIENT_ID = '52157264045-l30vua64vk6018jjv53j14qpf716rmr8.apps.googleusercontent.com';
const API = 'https://script.google.com/macros/s/AKfycbzynu0klKsGI3W168LfxV6LVTDk8pRHVFvATpug4iJR0o_jwRDi128RwBMCgAg52Q7L/exec';

// ---- backend: the deployed state that produced the bug = TEACHER_EMAILS set to an email list without this teacher
const tokens = {
  tokPhone: { sub: 'sub-teacher', email: 'teacher@example.com', aud: CLIENT_ID },   // same Google account …
  tokPC: { sub: 'sub-teacher', email: 'teacher@example.com', aud: CLIENT_ID },      // … on another device
  tokOther: { sub: 'sub-other', email: 'other@example.com', aud: CLIENT_ID }
};
const be = createBackend({ codePath, urlFetch: googleTokenMock(tokens) });
be.setup();
be.props.TEACHER_EMAILS = 'owner-only@example.com';
be.props.TEACHER_KEY = be.props.TEACHER_KEY || 'OLDKEY123456';
const apiLog = [];

// ---- static site
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(siteRoot, p);
  if (!f.startsWith(siteRoot) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
await new Promise(r => srv.on('listening', r));
const WEB = `http://localhost:${srv.address().port}`;

// ---- synthetic 114-surah Quran (only so the platform can boot offline; NOT teacher data)
const words = ['علم', 'نور', 'صبر', 'هدى', 'رحمة', 'يسر', 'شكر', 'حمد', 'فرقان', 'بشرى'];
const surahs = Array.from({ length: 114 }, (_, i) => ({ number: i + 1, name: 'سورة ' + (i + 1), englishName: 'S' + (i + 1), englishNameTranslation: '', revelationType: 'Meccan', numberOfAyahs: 8,
  ayahs: Array.from({ length: 8 }, (_, j) => ({ number: i * 8 + j + 1, numberInSurah: j + 1, juz: Math.min(30, Math.floor(i / 4) + 1), page: i * 5 + j + 1, hizbQuarter: 1, text: Array.from({ length: 6 }, (_, k) => words[(i + j + k) % 10]).join(' ') })) }));
const QURAN = JSON.stringify({ code: 200, data: { surahs } });

const FAKE_GSI = `window.__gsi = { rendered: 0 };
window.google = { accounts: { id: {
  _cb: null,
  initialize(o) { this._cb = o.callback; },
  renderButton(el) { window.__gsi.rendered++; const b = document.createElement('button'); b.id = 'fake-gsi-btn'; b.type = 'button';
    b.textContent = 'Sign in with Google (test)'; b.onclick = () => this._cb({ credential: window.__gsiToken || 'tokPhone' }); el.appendChild(b); },
  prompt() {}, disableAutoSelect() {} } } };`;

async function newDevice(browser, label) {
  const ctx = await browser.newContext({ locale: 'ar' });  // fresh profile: empty storage
  await ctx.route('**/*', async (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === 'localhost') return route.continue();
    if (u.href.startsWith(API)) {
      const req = route.request();
      const out = req.method() === 'GET' ? be.get(Object.fromEntries(u.searchParams)) : be.post(req.postData() || '');
      let action = req.method() === 'GET' ? u.searchParams.get('action') : (() => { try { return JSON.parse(req.postData()).action; } catch { return '?'; } })();
      apiLog.push({ device: label, action, ok: out.ok, code: out.code, message: out.message });
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(out) });
    }
    if (u.href.startsWith('https://accounts.google.com/gsi/client')) return route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_GSI });
    if (u.hostname === 'api.alquran.cloud') return route.fulfill({ status: 200, contentType: 'application/json', body: QURAN });
    return route.abort();
  });
  const page = await ctx.newPage();
  page.on('dialog', d => d.dismiss().catch(() => {}));
  page.on('pageerror', e => console.log(`   [${label} pageerror] ${e.message}`));
  return { ctx, page };
}

const results = [];
function check(name, cond, detail = '') { results.push({ name, ok: !!cond }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); }
const modalVisible = (page) => page.evaluate(() => !!document.getElementById('teacher-auth-modal'));
const bodyText = (page) => page.evaluate(() => document.body.innerText);
const lsAuthKeys = (page) => page.evaluate(() => Object.keys(localStorage).filter(k => /teacher_(key|userid|sessionkey)/.test(k)));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function bootHome(page) {
  await page.goto(WEB + '/index.html');
  await page.waitForSelector('#btn-my-students-main', { timeout: 30000 });
  await sleep(800);
}
async function clickId(page, id) { await page.evaluate((i) => document.getElementById(i).click(), id); await sleep(900); }
async function backHome(page) { await page.evaluate(() => document.getElementById('header-home-btn').click()); await page.waitForSelector('#btn-my-students-main', { timeout: 15000 }); await sleep(400); }

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });
try {
  if (mode === 'old') {
    console.log('\n=== REPRODUCTION on the code BEFORE the fix (HEAD) ===');
    // (a) old phone: a key/session already in localStorage -> isTeacherAuthed() true -> no prompt, no server sign-in
    const old = await newDevice(browser, 'old-phone');
    await old.page.goto(WEB + '/index.html');
    await old.page.evaluate((k) => localStorage.setItem('dh_hw_teacher_key', k), be.props.TEACHER_KEY);
    await bootHome(old.page);
    await clickId(old.page, 'btn-homework-main');
    check('[old code] old phone with saved key: homework opens with NO prompt', !(await modalVisible(old.page)));
    check('[old code] old phone never calls googleSignIn (allowlist never evaluated)', !apiLog.some(l => l.device === 'old-phone' && l.action === 'googleSignIn'));
    await old.ctx.close();

    // (b) new device, core monthly report -> homework login popped inside a CORE screen
    const nd = await newDevice(browser, 'new-device');
    await bootHome(nd.page);
    await nd.page.evaluate(async () => {
      const { AppState } = await import('/core/app.js');
      const id = await AppState.studentManager.addStudent({ name: 'طالب تجربة', type: 'adult' });
      const s = (await AppState.studentManager.getAllStudents()).find(x => x.id === id);
      const m = await import('/reports/monthly-report.js'); m.openMonthlyReportScreen({ student: s });
    });
    await sleep(2500);
    check('[old code] CORE monthly report pops the teacher login modal on a new device', await modalVisible(nd.page));
    await nd.page.evaluate(() => document.querySelector('.dh-teacher-auth-cancel')?.click());
    await backHome(nd.page);
    // (c) new device, homework -> Google OK -> server allowlist rejects -> the exact message
    await clickId(nd.page, 'btn-homework-main');
    await nd.page.waitForSelector('#fake-gsi-btn', { timeout: 10000 });
    await nd.page.click('#fake-gsi-btn'); await sleep(1500);
    const txt = await bodyText(nd.page);
    const signIn = apiLog.filter(l => l.action === 'googleSignIn').pop();
    check('[old code] Google token verified, then backend rejects: "' + (signIn && signIn.message) + '"', signIn && signIn.code === 'UNAUTHORIZED' && /not allowed/.test(signIn.message));
    check('[old code] UI shows «هذا البريد غير مسموح له بدخول شاشة المعلم…»', txt.includes('هذا البريد غير مسموح له بدخول شاشة المعلم'));
    check('[old code] UI offers the legacy Teacher Key', txt.includes('مفتاح المعلم'));
    await nd.ctx.close();
  } else {
    // seed server-side data that belongs to this Google account and to someone else (isolation check)
    const seedT = be.post({ action: 'googleSignIn', idToken: 'tokPhone' });
    const seedO = be.post({ action: 'googleSignIn', idToken: 'tokOther' });
    const Q = [{ id: 'q1', type: 'mcq', text: 't', options: ['A', 'B'], correctAnswer: 'A', points: 1 }];
    const hwMine = be.post({ action: 'createHomework', userId: seedT.userId, sessionKey: seedT.sessionKey, homework: { questions: Q } }).id;
    const hwOther = be.post({ action: 'createHomework', userId: seedO.userId, sessionKey: seedO.sessionKey, homework: { questions: Q } }).id;
    apiLog.length = 0;

    console.log('\n=== TEST A — brand-new device, CORE platform (no Google / email / key) ===');
    const A = await newDevice(browser, 'deviceA');
    await bootHome(A.page);
    check('A1 home screen opens directly', await A.page.isVisible('#btn-my-students-main'));
    const screens = [['btn-my-students-main', 'الطلاب'], ['btn-adult-main', 'الكبار (تقييم)'], ['btn-kids-main', 'ركن الأطفال (ألعاب)'],
      ['btn-dual-main', 'الاختبارات الثنائية'], ['btn-similarities-main', 'المتشابهات'], ['btn-tajweed-main', 'التجويد']];
    for (const [id, label] of screens) {
      await clickId(A.page, id);
      const stillHome = await A.page.isVisible('#btn-my-students-main');
      check(`A2 ${label}: opens with no login prompt`, !(await modalVisible(A.page)) && !stillHome);
      await backHome(A.page);
    }
    // monthly report (core report) — used to pop the homework login
    await A.page.evaluate(async () => {
      const { AppState } = await import('/core/app.js');
      const id = await AppState.studentManager.addStudent({ name: 'طالب تجربة', type: 'adult' });
      const s = (await AppState.studentManager.getAllStudents()).find(x => x.id === id);
      const m = await import('/reports/monthly-report.js'); m.openMonthlyReportScreen({ student: s });
    });
    await A.page.waitForSelector('#mr-homework-content', { timeout: 15000 }); await sleep(2500);
    const hwBlock = await A.page.evaluate(() => document.getElementById('mr-homework-content').innerText);
    check('A3 monthly report opens with NO login prompt', !(await modalVisible(A.page)));
    check('A3 monthly report homework section shows a calm note instead', hwBlock.includes('بعد تسجيل الدخول بجوجل داخل نظام الواجبات'), hwBlock.trim().slice(0, 90));
    await backHome(A.page);
    const tA = await bodyText(A.page);
    check('A4 no «غير مسموح» / no Teacher Key text anywhere', !tA.includes('غير مسموح') && !tA.includes('مفتاح المعلم'));
    check('A5 Google button never rendered in core flows', (await A.page.evaluate(() => window.__gsi ? window.__gsi.rendered : 0)) === 0);
    check('A6 zero teacher calls to the homework server from core flows', apiLog.filter(l => l.device === 'deviceA').length === 0, JSON.stringify(apiLog.filter(l => l.device === 'deviceA').map(l => l.action)));
    check('A7 no auth data stored by core platform', (await lsAuthKeys(A.page)).length === 0);

    console.log('\n=== TEST B — same new device, HOMEWORK system (Google only) ===');
    await A.page.evaluate(() => localStorage.setItem('dh_hw_teacher_key', 'OLDKEY123456'));   // a stale key left from the old system
    await A.page.reload(); await A.page.waitForSelector('#btn-my-students-main', { timeout: 30000 }); await sleep(600);
    check('B0 stale dh_hw_teacher_key is wiped and grants nothing', (await lsAuthKeys(A.page)).length === 0);
    await clickId(A.page, 'btn-homework-main');
    await A.page.waitForSelector('#fake-gsi-btn', { timeout: 10000 });
    const modalTxt = await A.page.evaluate(() => document.getElementById('teacher-auth-modal').innerText);
    check('B1 homework asks for Google sign-in (only here)', await modalVisible(A.page), modalTxt.split('\n')[0]);
    check('B2 modal has no Teacher Key field/option', !(await A.page.evaluate(() => !!document.querySelector('#teacher-auth-modal input'))) && !modalTxt.includes('مفتاح'));
    await A.page.evaluate(() => { window.__gsiToken = 'tokPhone'; });
    await A.page.click('#fake-gsi-btn');
    await A.page.waitForFunction(() => !document.getElementById('teacher-auth-modal'), null, { timeout: 15000 }); await sleep(2500);
    const signA = apiLog.filter(l => l.device === 'deviceA' && l.action === 'googleSignIn').pop();
    check('B3 Google sign-in accepted although TEACHER_EMAILS excludes this email', signA && signA.ok === true, JSON.stringify(signA));
    check('B4 teacher identified: session stored', (await lsAuthKeys(A.page)).sort().join(',') === 'dh_hw_teacher_sessionkey,dh_hw_teacher_userid');
    check('B5 homework screen opened', await A.page.evaluate(() => !document.getElementById('btn-my-students-main')));
    const idsA = await A.page.evaluate(async () => (await import('/core/homeworkApi.js')).listServerHomeworkIds());
    check('B6 loads THIS account\'s homework only', idsA.includes(hwMine) && !idsA.includes(hwOther), JSON.stringify(idsA));
    const pub = await A.page.evaluate(async () => (await import('/core/homeworkApi.js')).publishHomeworkToServer({ questions: [{ id: 'q1', type: 'mcq', text: 'x', options: ['A', 'B'], correctAnswer: 'B', points: 1 }] }));
    check('B7 publishing from device A works (persisted)', pub && pub.persisted === true);
    check('B8 old Teacher Key sent directly to server is rejected', be.post({ action: 'listHomeworks', teacherKey: 'OLDKEY123456' }).code === 'UNAUTHORIZED');
    await backHome(A.page);
    await clickId(A.page, 'btn-adult-main');
    check('B9 core platform unaffected after homework sign-in', !(await modalVisible(A.page)));
    await A.ctx.close();

    console.log('\n=== TEST C — a DIFFERENT device, fresh browser, no local data ===');
    const C = await newDevice(browser, 'deviceC');
    await bootHome(C.page);
    check('C1 core platform opens directly (no Google/email/key)', !(await modalVisible(C.page)) && (await lsAuthKeys(C.page)).length === 0);
    await clickId(C.page, 'btn-my-students-main');
    check('C1b students screen opens with no prompt', !(await modalVisible(C.page)));
    await backHome(C.page);
    check('C1c no homework-server calls before opening homework', apiLog.filter(l => l.device === 'deviceC').length === 0);
    await clickId(C.page, 'btn-homework-main');
    await C.page.waitForSelector('#fake-gsi-btn', { timeout: 10000 });
    check('C2 homework asks for Google only here', await modalVisible(C.page));
    await C.page.evaluate(() => { window.__gsiToken = 'tokPC'; });
    await C.page.click('#fake-gsi-btn');
    await C.page.waitForFunction(() => !document.getElementById('teacher-auth-modal'), null, { timeout: 15000 }); await sleep(2000);
    const idsC = await C.page.evaluate(async () => (await import('/core/homeworkApi.js')).listServerHomeworkIds());
    check('C3 same Google account on device C sees its homework (incl. the one published on device A)', idsC.includes(hwMine) && idsC.includes(pub.id) && !idsC.includes(hwOther), JSON.stringify(idsC));
    check('C4 no «غير مسموح» anywhere', !(await bodyText(C.page)).includes('غير مسموح'));
    await C.ctx.close();
  }
} finally {
  await browser.close(); srv.close();
}
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
