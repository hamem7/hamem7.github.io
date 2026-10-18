// tests/listen-in-games.e2e.mjs — سؤال «استمع للشيخ… ثم كمّل» داخل ألعاب الكبار والأطفال (الصوت وهمي: WAV صامت).
// الاستعمال: PLAYWRIGHT_MODULE_DIR=/opt/node-tools/node_modules node tests/listen-in-games.e2e.mjs [outDir]
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
const wav = (() => { const n = 2400, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(8000, 24); b.writeUInt32LE(16000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); return b; })();
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'], ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });
const ctx = await browser.newContext({ locale: 'ar', viewport: { width: 1180, height: 900 } });
const audioHits = [];
await ctx.route('**/*', r => { const u = new URL(r.request().url());
  if (u.hostname === 'everyayah.com' || u.hostname === 'cdn.islamic.network') { audioHits.push(u.pathname); return r.fulfill({ status: 200, contentType: 'audio/wav', body: wav }); }
  return u.hostname === 'localhost' ? r.continue() : r.abort(); });
const page = await ctx.newPage(); const errs = [];
page.on('pageerror', e => { errs.push(e.message); console.log('   [pageerror]', e.message); }); page.on('dialog', d => d.dismiss().catch(() => {}));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let ok = 0, bad = 0; const check = (n, c, d = '') => { c ? ok++ : bad++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
await page.goto(WEB + '/index.html'); await page.waitForSelector('#btn-my-students-main', { timeout: 30000 }); await sleep(2500);
await page.evaluate(() => document.querySelector('.dh-tour-skip')?.click());

const SCEN = [
  { kids: false, name: 'الكبار — الجزء 30', cfg: { qCount: 6, isJuzMode: true, juzNum: 30, surahNum: 0 }, type: 'listen_next' },
  { kids: false, name: 'الكبار — الجزء 1 (خارج آخر خمسة أجزاء)', cfg: { qCount: 6, isJuzMode: true, juzNum: 1, surahNum: 0 }, type: 'listen_next', expectNone: true },
  { kids: true, name: 'الصغار — الأحقاف..النازعات', cfg: { qCount: 6, isKidsRange: true, kidsFrom: 46, kidsTo: 79, isJuzMode: false, surahNum: 0 }, type: 'kids_listen_next' },
];
for (const { kids, name, cfg, type, expectNone } of SCEN) {
  const tag = (kids ? 'الصغار' : 'الكبار') + ' | ' + name;
  console.log(`\n=== ${tag} ===`);
  await page.evaluate(async ({ kids, cfg, type }) => {
    const { AppState } = await import('/core/app.js');
    const id = await AppState.studentManager.addStudent({ name: 'تجربة ' + Math.random(), type: kids ? 'kids' : 'adult' });
    AppState.currentStudent = (await AppState.studentManager.getAllStudents()).find(x => x.id === id);
    if (kids) AppState.currentStudent.type = 'kids';
    const m = await import(kids ? '/games/kidsGame.js' : '/games/adultGame.js');
    await (kids ? m.openKidsGameScreen(cfg) : m.openAdultGameScreen(cfg));
    window.__GS = m.GameState;
    // نفرض نوع السؤال على الأسئلة 2..4 (الأول يُعرض فعلاً)
    m.GameState.queue.forEach((q, i) => { if (i >= 1 && i <= 3) q.type = type; if (kids && i === 4) q.type = 'kids_listen_ayah'; });
  }, { kids, cfg, type });
  await sleep(1500);
  await page.evaluate(() => { document.getElementById('mmt-close')?.click(); document.getElementById('whats-new-modal')?.remove(); }) ;
  const answer = async () => page.evaluate((kids) => {
    const g = window.__GS, d = g.currentData;
    if (kids) { const b = [...document.querySelectorAll('.kids-mcq-btn')]; if (d.type === 'kids_mcq' && b.length && d.correctAns && !d.surahOptions) b[d.options.findIndex(o => o.trim() === d.correctAns.trim())].click(); else window.recordKidsAnswer(true); }
    else document.getElementById('btn-record-correct')?.click();
  }, kids);
  const listens = [];
  for (let step = 0; step < 40 && listens.length < 3; step++) {
    await sleep(500);
    await page.evaluate(() => document.getElementById('whats-new-modal')?.remove());
    const cd = await page.evaluate(() => { const g = window.__GS; const d = g.currentData; return d ? { type: d.type, idx: g.currentIndex, done: !!d.__answered, title: d.questionTitle, dir: d.dir || d.listenDir, oldListen: Array.isArray(d.surahOptions) } : null; });
    if (!cd || cd.done) continue;
    if (cd.oldListen && !globalThis.__oldChecked) {
      globalThis.__oldChecked = true;
      const o = await page.evaluate(() => { const b = document.querySelector('#game-question audio + button'); return b ? { cls: b.className, n: b.dataset.n, s: b.dataset.s } : null; });
      check(`${tag}: «استمع وخمّن الآية» صار بالمشغّل الموحَّد (زر ببيانات الآية، بنفس كلاسه القديم)`, !!o && o.cls === 'kids-listen-play-btn' && +o.s >= 46 && !!o.n, JSON.stringify(o));
      await page.click('#game-question audio + button'); await sleep(400);
      check(`${tag}: ضغط الزر شغّل الصوت`, await page.evaluate(() => document.querySelector('#game-question audio').played.length > 0));
    }
    if (cd.type === 'listen_next' || (cd.type === 'kids_mcq' && cd.dir)) {
      const info = await page.evaluate((kids) => ({
        src: (() => { const b = document.querySelector('#game-question audio + button'); return b ? `${b.dataset.n}|${b.dataset.s}|${b.dataset.a}` : null; })(),
        btnClass: document.querySelector('#game-question audio + button')?.className,
        titleShown: document.getElementById('game-title').innerText,
        hintBtn: !kids && getComputedStyle(document.getElementById('hint-btn')).display !== 'none',
        opts: kids ? [...document.querySelectorAll('.kids-mcq-btn')].length : 0,
        textLeak: document.getElementById('game-question').innerText
      }), kids);
      listens.push({ ...cd, ...info });
      if (outDir && listens.length === 1) await page.screenshot({ path: path.join(outDir, `${kids ? 'kids' : 'adult'}-listen-question.png`) });
      await page.click('#game-question audio + button'); await sleep(500);
      listens[listens.length - 1].played = await page.evaluate(() => document.querySelector('#game-question audio').played.length > 0);
      if (!kids) { await page.click('#hint-btn'); listens[listens.length - 1].hint = await page.innerText('#hint-text'); await page.click('#show-ans-btn'); await sleep(200); listens[listens.length - 1].ans = await page.innerText('#game-answer'); if (outDir && listens.length === 1) await page.screenshot({ path: path.join(outDir, 'adult-listen-answer.png') }); }
    }
    if (cd.idx === (listens.length ? undefined : -1)) { /* لا شيء */ }
    await answer(); await sleep(700);
  }
  if (expectNone) { check(`${tag}: لا يظهر السؤال (النطاق خارج آخر خمسة أجزاء)`, listens.length === 0); }
  else {
    check(`${tag}: ظهر سؤال الاستماع (${listens.length})`, listens.length >= 1);
    listens.forEach((l, i) => {
      check(`${tag} [${i + 1}]: بيانات الآية على الزر وسورتها ≥ 46`, /^\d+\|(\d+)\|\d+$/.test(l.src || '') && +RegExp.$1 >= 46, l.src);
      check(`${tag} [${i + 1}]: الزر بكلاس اللعبة الموجود (${kids ? 'kids-listen-play-btn' : 'btn'})`, l.btnClass === (kids ? 'kids-listen-play-btn' : 'btn'), l.btnClass);
      check(`${tag} [${i + 1}]: نص الآية المسموعة غير معروض في السؤال`, !/﴿/.test(l.textLeak), l.textLeak.slice(0, 60));
      check(`${tag} [${i + 1}]: ضغط الزر شغّل الصوت فعلاً`, l.played);
      if (kids) check(`${tag} [${i + 1}]: ثلاثة خيارات`, l.opts === 3, String(l.opts));
      else check(`${tag} [${i + 1}]: التلميح والإجابة يظهران`, !!l.hint && l.hint.includes('﴿') && l.ans.includes('﴿'), `${l.hint} | ${l.ans.replace(/\n+/g, ' ').slice(0, 60)}`);
    });
  }
  await page.goto(WEB + '/index.html'); await page.waitForSelector('#btn-my-students-main', { timeout: 30000 }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.dh-tour-skip')?.click());
}
// التخزين المحلي: التحميل المسبق خزّن آيات بالمنشاوي، وبقايا قارئ آخر تُحذف، والتشغيل التالي من المخزَّن
const st = await page.evaluate(async () => {
  const { AppState } = await import('/core/app.js'); const m = AppState.kidsAudioManager;
  const all = () => new Promise(res => { const tx = m.db.transaction('ayahAudio', 'readonly'); const r = tx.objectStore('ayahAudio').getAll(); r.onsuccess = () => res(r.result); });
  const before = await all();
  await new Promise(res => { const tx = m.db.transaction('ayahAudio', 'readwrite'); tx.objectStore('ayahAudio').put({ number: 999999, blob: new Blob(['x']), reciter: 'abdulbasit' }); tx.oncomplete = res; });
  const staleHidden = (await m.getAudio(999999)) === null;
  await m.prefetchAyahs([]);
  const after = await all();
  return { minshawi: before.filter(r => r.reciter === 'minshawi').length, staleHidden, stalePurged: !after.some(r => r.number === 999999) };
});
check('التحميل المسبق خزّن آيات بالمنشاوي', st.minshawi > 20, String(st.minshawi));
check('ملف قارئ آخر يُتجاهل ثم يُحذف', st.staleHidden && st.stalePurged, JSON.stringify(st));
check('بلا أخطاء جافاسكربت', errs.length === 0, errs.join(' | ').slice(0, 200));
console.log(`\n${ok} PASS / ${bad} FAIL`);
await browser.close(); srv.close(); process.exit(bad ? 1 : 0);
