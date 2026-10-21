// tests/similar-in-games.e2e.mjs — أسئلة المتشابهات داخل ألعاب الصغار والكبار (سؤال لكل 10).
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

const SCEN = [
  { kids: true, name: 'الصغار — الأحقاف..النازعات', cfg: { qCount: 20, isKidsRange: true, kidsFrom: 46, kidsTo: 79, isJuzMode: false, surahNum: 0 } },
  { kids: true, name: 'الصغار — البقرة وآل عمران (متشابهات داخلية)', cfg: { qCount: 20, isKidsRange: true, kidsFrom: 2, kidsTo: 3, isJuzMode: false, surahNum: 0 } },
  { kids: false, name: 'الكبار — الجزء 1 (متشابهات داخلية)', cfg: { qCount: 20, isJuzMode: true, juzNum: 1, surahNum: 0 } },
  { kids: false, name: 'الكبار — الجزء 26 (متشابهات داخلية)', cfg: { qCount: 20, isJuzMode: true, juzNum: 26, surahNum: 0 } },
  { kids: false, name: 'الكبار — الجزء 30 (جزء عمّ)', cfg: { qCount: 20, isJuzMode: true, juzNum: 30, surahNum: 0 } },
];
for (const { kids, name, cfg: scenCfg } of SCEN) {
  const tag = (kids ? 'الصغار' : 'الكبار') + ' | ' + name;
  console.log(`\n=== ${tag} ===`);
  const info = await page.evaluate(async ({ kids, scenCfg }) => {
    const { AppState } = await import('/core/app.js');
    const id = await AppState.studentManager.addStudent({ name: 'تجربة ' + (kids ? 'صغير' : 'كبير'), type: kids ? 'kids' : 'adult' });
    AppState.currentStudent = (await AppState.studentManager.getAllStudents()).find(x => x.id === id);
    if (kids) { AppState.currentStudent.type = 'kids'; }
    const m = await import(kids ? '/games/kidsGame.js' : '/games/adultGame.js');
    const cfg = scenCfg;
    await (kids ? m.openKidsGameScreen(cfg) : m.openAdultGameScreen(cfg));
    window.__GS = m.GameState;
    return { n: m.GameState.queue.length, sims: m.GameState.queue.filter(q => q.type === 'similar').length };
  }, { kids, scenCfg });
  await sleep(1500);
  await page.evaluate(() => document.getElementById('mmt-close')?.click());
  check(`${tag}: طول الطابور 20 وفيه سؤالان من المتشابهات`, info.n === 20 && info.sims === 2, JSON.stringify(info));
  const seen = []; let lastIdx = -1, idle = 0;
  for (let step = 0; step < 120 && idle < 12; step++) {
    await sleep(500);
    await page.evaluate(() => document.getElementById('mmt-close')?.click());
    const cd = await page.evaluate(() => { const g = window.__GS; const d = g.currentData; return d ? { type: d.type, simKind: d.simKind, title: d.questionTitle, idx: g.currentIndex, done: !!d.__answered } : null; });
    if (!cd || cd.done || cd.idx === lastIdx) { idle++; continue; }
    idle = 0; lastIdx = cd.idx;
    if (cd.simKind) {
      const q = await page.evaluate(() => document.getElementById('game-question').innerText);
      const btns = kids ? await page.$$eval('.kids-mcq-btn', b => b.map(x => x.innerText.trim())) : [];
      seen.push({ ...cd, q, btns });
      if (outDir) await page.screenshot({ path: path.join(outDir, `${kids ? 'kids' : 'adult'}-${seen.length}.png`) });
      if (!kids) { await page.evaluate(() => document.getElementById('show-ans-btn').click()); await sleep(200); seen[seen.length - 1].ans = await page.evaluate(() => document.getElementById('game-answer').innerText); }
    }
    if (kids) {
      await page.evaluate(() => { const d = window.__GS.currentData; const b = [...document.querySelectorAll('.kids-mcq-btn')];
        if (d.type === 'kids_mcq' && b.length && d.correctAns && !d.surahOptions) b[d.options.findIndex(o => o.trim() === d.correctAns.trim())].click(); else window.recordKidsAnswer && window.recordKidsAnswer(true); });
    } else await page.evaluate(() => document.getElementById('btn-record-correct')?.click());
  }
  check(`${tag}: ظهر سؤالا متشابهات أثناء اللعب`, seen.length === 2, `ظهر ${seen.length}`);
  seen.forEach(s => check(`${tag}: النص بالسكون القرآني (لا سكون دائري U+0652)`, !(s.q + (s.ans || '')).includes('\u0652')));
  seen.forEach((s, i) => console.log(`   [${i + 1}] ${s.simKind} | ${s.title}\n       سؤال: ${s.q.replace(/\n+/g, ' ⏎ ').slice(0, 220)}\n       ${kids ? 'أزرار: ' + s.btns.join(' | ') : 'إجابة: ' + (s.ans || '').replace(/\n+/g, ' ⏎ ').slice(0, 140)}`));
  if (kids) seen.forEach(s => check(`${tag}: ثلاثة خيارات على الأقل (أسماء السور بلا ﴿﴾، والآيات بداخلها)`, s.btns.length >= 3 && (s.simKind === 'sim_pair' ? s.btns.every(b => !b.includes('﴿')) : s.btns.every(b => b.includes('﴿'))), s.btns.join('|')));
  await page.evaluate(() => { const b = document.querySelector('#btn-home, .btn-home'); });
  await page.goto(WEB + '/index.html'); await page.waitForSelector('#btn-my-students-main', { timeout: 30000 }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.dh-tour-skip')?.click());
}
check('بلا أخطاء جافاسكربت', errs.length === 0, errs.join(' | ').slice(0, 200));
console.log(`\n${ok} PASS / ${bad} FAIL`);
await browser.close(); srv.close(); process.exit(bad ? 1 : 0);
