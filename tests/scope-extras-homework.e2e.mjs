// tests/scope-extras-homework.e2e.mjs — «السور الإضافية خارج المسار المتصل» في الواجب الذكي: المسار والتصنيف ونموذج الاختيار والأسئلة المبنية.
// الاستعمال: PLAYWRIGHT_MODULE_DIR=/path/to/node_modules node tests/scope-extras-homework.e2e.mjs [siteRoot]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(process.env.PLAYWRIGHT_MODULE_DIR ? path.join(process.env.PLAYWRIGHT_MODULE_DIR, '/') : import.meta.url);
const { chromium } = require('playwright');
const [siteRoot = REPO] = process.argv.slice(2);

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(siteRoot, p);
  if (!f.startsWith(siteRoot) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
await new Promise(r => srv.on('listening', r));
const WEB = `http://localhost:${srv.address().port}`;

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });
const ctx = await browser.newContext({ locale: 'ar', viewport: { width: 1100, height: 1000 } });
await ctx.route('**/*', (route) => { const u = new URL(route.request().url()); return u.hostname === 'localhost' ? route.continue() : route.abort(); });
const page = await ctx.newPage();
const pageErrors = [];
page.on('dialog', d => d.dismiss().catch(() => {}));
page.on('pageerror', e => { pageErrors.push(e.message); console.log(`   [pageerror] ${e.message}`); });
const results = [];
function check(name, cond, detail = '') { results.push({ name, ok: !!cond }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); }
// يختار سورة في قائمة «إلى» حسب رقمها (قيمة الخيار = اسم السورة)
const pickTo = (n) => page.evaluate((num) => { const sel = document.getElementById('stu-memo-to'); import('/core/app.js').then(({ AppState }) => { sel.value = AppState.surahsData.find(x => x.number === num).name; sel.dispatchEvent(new Event('change', { bubbles: true })); }); }, n);
// يفتح لوحة المحرّر المطلوبة فقط إن لم تكن مفتوحة (الضغط على زرها المفتوح يطويها)
const openPanel = async (ed, kind) => { if (!(await ed.locator(`[data-open="${kind}"].is-on`).count())) await ed.locator(`[data-open="${kind}"]`).click(); };
const norm = (x) => String(x || '').replace(/[\u064B-\u0652\u0670\u06D6-\u06ED]/g, '').replace(/[\u0671\u0622\u0623\u0625]/g, 'ا');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const shot = async (name) => { if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, name + '.png'), fullPage: true }); };

try {
  await page.goto(WEB + '/index.html');
  await page.waitForSelector('#btn-my-students-main', { timeout: 30000 });
  await sleep(800);
  await page.evaluate(() => setInterval(() => document.querySelectorAll('.dh-tour-root,.mmt-overlay,.mmb-overlay,.ham-dialog-overlay').forEach(e => e.remove()), 150));

  // طالب: الناس ← النبأ (جزء عمّ) + البقرة ← يونس آية 55 + الكهف
  const out = await page.evaluate(async () => {
    const { AppState } = await import('/core/app.js');
    const ts = await import('/core/trackingService.js');
    const { HomeworkEngine } = await import('/engine/homeworkEngine.js');
    const { describeScope } = await import('/engine/scopeWording.js');
    const by = (n) => AppState.surahsData.find(s => s.number === n).name;
    await AppState.studentManager.addStudent({ name: 'طالب الواجب', type: 'adult', gender: 'boy', memoFrom: by(114), memoTo: by(78),
      memoExtra: [{ s1: 2, a1: 1, s2: 10, a2: 55 }, { s1: 18, a1: 1, s2: 18, a2: 110 }] });
    const student = (await AppState.studentManager.getAllStudents()).find(s => s.name === 'طالب الواجب');
    const ctx = await ts.loadContext(student);
    const model = await ts.buildSelectionModel(student, ctx);
    const info = {
      ok: ctx.range.ok, extras: ctx.range.extras.length,
      segs: ctx.path.segments.length, extraSegs: ctx.path.segments.filter(s => s.extra).length,
      classesExtra: [...new Set(ctx.path.segments.filter(s => s.extra).map(s => ctx.classes.get(s.id)))],
      classesMain: [...new Set(ctx.path.segments.filter(s => !s.extra).map(s => ctx.classes.get(s.id)))].sort(),
      modelSurahs: model.surahs.map(s => s.number),
      groups: model.groups.length
    };
    // وصف النطاق لرسالة ولي الأمر (يعمل مع مقاطع غير متصلة)
    let wording = null, wordingErr = null;
    try { wording = describeScope({ model, selection: { mode: 'all' }, L: (a) => a, surahName: (n) => (AppState.surahsData.find(s => s.number === n) || {}).name }); } catch (e) { wordingErr = e.message; }
    info.wording = wording; info.wordingErr = wordingErr;
    // خطط الواجب
    const eng = new HomeworkEngine(AppState.quranEngine);
    const why = [];
    for (let i = 0; i < 6; i++) {
      const res = await ts.planSmartHomework(student, 20, { selection: { mode: 'all' }, hwEngine: eng });
      if (res.ok) why.push(...res.why.map(w => ({ s: w.surah, a: w.ayah, cat: w.cat })));
    }
    info.n = why.length;
    info.surahs = [...new Set(why.map(w => w.s))].sort((a, b) => a - b);
    info.bad = why.filter(w => !(w.s >= 78 && w.s <= 114) && !(w.s >= 2 && w.s <= 9) && !(w.s === 10 && w.a <= 55) && w.s !== 18);
    info.extraQs = why.filter(w => (w.s >= 2 && w.s <= 10) || w.s === 18);
    info.extraCats = [...new Set(info.extraQs.map(w => w.cat))];
    // اختيار سورة إضافية وحدها
    const only = ts.resolveAllowedSegIds(student, ctx, model, { mode: 'surah', ids: [18] });
    info.onlySurah18 = only ? [...only].every(id => id.startsWith('18:')) && only.size > 0 : null;
    return info;
  });
  console.log('   ', JSON.stringify(out).slice(0, 900));
  check('H1 النطاق صالح ويحمل مقطعين إضافيين', out.ok && out.extras === 2);
  check('H2 المسار يضم مقاطع إضافية (extra) أولاً', out.extraSegs > 0 && out.segs > out.extraSegs, `${out.extraSegs}/${out.segs}`);
  check('H3 المقاطع الإضافية «بعيد» دائماً', out.classesExtra.length === 1 && out.classesExtra[0] === 'far', out.classesExtra.join(','));
  check('H4 المسار المتصل ما زال فيه جديد/قريب', out.classesMain.includes('new') || out.classesMain.includes('near'), out.classesMain.join(','));
  check('H5 نموذج الاختيار يعرض السور الإضافية بأسمائها', [2, 5, 10, 18].every(n => out.modelSurahs.includes(n)), out.modelSurahs.slice(0, 12).join(','));
  const wd = norm(out.wording || '').replace(/ى/g, 'ي');
  check('H6 وصف النطاق لرسالة ولي الأمر يذكر المتصل والإضافي على حدة (لا «من البقرة إلى النبأ»)',
    !out.wordingErr && wd.includes('من سورة الناس الي سورة النبا') && wd.includes('من سورة البقرة الي سورة يونس') && wd.includes('سورة الكهف') && !wd.includes('البقرة الي سورة النبا'), out.wordingErr || out.wording);
  check('H7 الواجب الذكي يبني أسئلة', out.n >= 60, 'n=' + out.n);
  check('H8 لا سؤال من خارج نطاق الطالب (لا هود/مريم/الأنفال ولا يونس بعد 55)', out.bad.length === 0, JSON.stringify(out.bad.slice(0, 4)));
  check('H9 تدخل السور الإضافية في الأسئلة', out.extraQs.length > 0, 'extra=' + out.extraQs.length + ' surahs=' + out.surahs.join(','));
  check('H10 أسئلة الإضافي تصنَّف «بعيد» أو «علاج»', out.extraCats.every(c => c === 'far' || c === 'err'), out.extraCats.join(','));
  check('H11 اختيار «سورة» إضافية يقصر المقاطع عليها', out.onlySurah18 === true);

  console.log('\nأخطاء الصفحة:', pageErrors.length);
  check('Z1 لا أخطاء جافاسكربت', pageErrors.length === 0, pageErrors.join(' | '));
} catch (e) {
  await shot('failure-hw').catch(() => {});
  console.log('EXCEPTION', e.message); check('X لا استثناء', false, e.message);
}
await browser.close(); srv.close();
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} نجح`);
process.exit(failed ? 1 : 0);
