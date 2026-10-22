// tests/note-sheet.e2e.mjs — القائمة السفلية للملاحظات (ملاحظة ⇄ تراجع، أنواع الملاحظات، حفظ والتالي) في ألعاب الكبار والأطفال.
// الاستعمال: PLAYWRIGHT_MODULE_DIR=/opt/node-tools/node_modules node tests/note-sheet.e2e.mjs [outDir]
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


// القائمة السفلية للملاحظات (components/noteSheet.js) في ألعاب الكبار والأطفال
const SCEN = [
  { kids: false, name: 'الكبار', cfg: { qCount: 6, isJuzMode: true, juzNum: 30, surahNum: 0 } },
  { kids: true, name: 'الصغار', cfg: { qCount: 6, isKidsRange: true, kidsFrom: 46, kidsTo: 79, isJuzMode: false, surahNum: 0 } }
];
for (const { kids, name, cfg } of SCEN) {
  console.log(`\n=== ${name} ===`);
  await page.evaluate(async ({ kids, cfg }) => {
    const { AppState } = await import('/core/app.js');
    const id = await AppState.studentManager.addStudent({ name: 'تجربة ' + Math.random(), type: kids ? 'kids' : 'adult' });
    AppState.currentStudent = (await AppState.studentManager.getAllStudents()).find(x => x.id === id);
    if (kids) AppState.currentStudent.type = 'kids';
    const m = await import(kids ? '/games/kidsGame.js' : '/games/adultGame.js');
    await (kids ? m.openKidsGameScreen(cfg) : m.openAdultGameScreen(cfg));
    window.__GS = m.GameState;
    // نفرض أسئلة تسميع (يُقيّمها المعلم) على الأسئلة 2..5 لثبات الاختبار؛ الأول يُعرض فعلاً
    m.GameState.queue.forEach((q, i) => { if (i >= 1 && i <= 4) q.type = kids ? 'kids_recite' : 'recite'; });
  }, { kids, cfg });
  await sleep(1500);
  await page.evaluate(() => { document.getElementById('mmt-close')?.click(); document.getElementById('whats-new-modal')?.remove(); });
  const evalVisible = () => page.evaluate(() => { const e = document.getElementById('teacher-eval-buttons'); return !!e && getComputedStyle(e).display !== 'none'; });
  // نصل لسؤال يظهر فيه صف التقييم (سؤال المعلم)؛ الأسئلة التفاعلية نجيبها بالمسار المعتاد
  let found = false;
  for (let step = 0; step < 40 && !found; step++) {
    await sleep(400);
    await page.evaluate(() => { document.getElementById('whats-new-modal')?.remove(); const d = document.querySelector('.ham-dialog-overlay'); if (d) { window.__dlg = d.innerText; d.querySelector('button')?.click(); } });
    if (await evalVisible()) { found = true; break; }
    // أسئلة المعلم: يظهر صف التقييم بعد «إظهار الإجابة للمطابقة»
    if (await page.evaluate(() => { const b = document.getElementById('show-ans-btn'); return !!b && getComputedStyle(b).display !== 'none' && getComputedStyle(document.getElementById('game-answer')).display === 'none'; })) { await page.click('#show-ans-btn'); await sleep(300); if (await evalVisible()) { found = true; break; } }
    await page.evaluate((kids) => { const g = window.__GS, d = g.currentData; if (!d || d.__answered) return; if (kids) window.recordKidsAnswer?.(true); else document.getElementById('btn-record-correct')?.click(); }, kids);
  }
  check(`${name}: ظهر صف التقييم`, found, found ? '' : String(await page.evaluate(() => window.__dlg)));
  if (process.env.DBG) console.log('DLG:', await page.evaluate(() => document.querySelector('.ham-dialog-overlay')?.innerText));
  if (!found) continue;
  const S = () => page.evaluate(() => ({
    open: document.getElementById('note-sheet').classList.contains('open'),
    label: document.getElementById('btn-record-wrong').textContent.trim(),
    save: getComputedStyle(document.getElementById('btn-submit-all-errors')).display,
    checked: [...document.querySelectorAll('#note-sheet input:checked')].map(c => c.value),
    ans: getComputedStyle(document.getElementById('game-answer')).display,
    correct: document.getElementById('btn-record-correct').textContent.trim(),
    modal: !!document.getElementById('error-modal')
  }));
  let s = await S();
  check(`${name}: لا نافذة قديمة والقائمة مغلقة والزر «ملاحظة»`, !s.modal && !s.open && s.label.includes('ملاحظة') && !s.label.includes('تراجع') && s.save === 'none', JSON.stringify(s));
  check(`${name}: نص زر الإجابة الصحيحة`, kids ? s.correct.includes('أحسنت') : s.correct.includes('إجابة صحيحة تامة'), s.correct);
  await page.click('#btn-record-wrong'); await sleep(350); s = await S();
  check(`${name}: «ملاحظة» تفتح القائمة وتتحول إلى «تراجع» وتظهر الإجابة`, s.open && s.label.includes('تراجع') && s.ans === 'block' && s.save === 'none', JSON.stringify(s));
  if (outDir) await page.screenshot({ path: path.join(outDir, `${kids ? 'kids' : 'adult'}-note-sheet-open.png`) });
  await page.click('.note-chip:nth-child(1)'); await sleep(100); s = await S();
  check(`${name}: اختيار نوع يُظهر «حفظ والتالي»`, s.checked.length === 1 && s.save !== 'none', JSON.stringify(s));
  await page.click('#btn-record-wrong'); await sleep(350); s = await S();
  check(`${name}: «تراجع» يغلق القائمة ويمسح الاختيار ويعيد «ملاحظة»`, !s.open && s.checked.length === 0 && s.save === 'none' && s.label.includes('ملاحظة'), JSON.stringify(s));
  await page.click('#btn-record-wrong'); await sleep(300);
  await page.click('.note-chip.is-dont'); await page.click('.note-chip:nth-child(3)'); await sleep(100); s = await S();
  check(`${name}: «لم يعرف» حالة مستقلة (اختيار نوع آخر يلغيها)`, s.checked.length === 1 && s.checked[0] === 'نسيان آية', JSON.stringify(s));
  await page.fill('#custom-note', 'تلعثم'); await sleep(100);
  const before = await page.evaluate(() => window.__GS.reportDetails.length);
  await page.click('#btn-submit-all-errors'); await sleep(600);
  const rec = await page.evaluate(() => { const r = window.__GS.reportDetails; return { n: r.length, last: r[r.length - 1] }; });
  check(`${name}: «حفظ والتالي» سجّل السؤال بنفس القيم المخزَّنة + النص`, rec.n === before + 1 && rec.last.isCorrect === false && rec.last.errors.includes('نسيان آية') && rec.last.errors.some(e => e.includes('تلعثم')), JSON.stringify(rec.last?.errors));
  await sleep(2500);
  s = await S().catch(() => null);
  if (s) check(`${name}: السؤال التالي يبدأ بقائمة مغلقة`, !s.open && s.save === 'none' && s.checked.length === 0, JSON.stringify(s));
  await page.evaluate(() => { document.getElementById('btn-exit-game')?.click(); }); await sleep(400);
  await page.evaluate(() => { document.querySelector('.ham-dialog-overlay button')?.click(); }); await sleep(800);
}
check('بلا أخطاء جافاسكربت', errs.length === 0, errs.join(' | '));
console.log(`\n${ok} passed, ${bad} failed`); await browser.close(); srv.close(); process.exit(bad ? 1 : 0);
