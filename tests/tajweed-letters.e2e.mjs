// tests/tajweed-letters.e2e.mjs — ألعاب الحروف والأزواج وشجرة الحكم وبطاقات الحروف في المتصفح (إضافة لرحلة الحكم، لا تغيّر خطواتها).
// كل لعبة تُحَلّ حلاً صحيحاً من بيانات الكتالوج فتكون الدرجة 100%، وبطاقات الحروف تعرض نص المنصة بحرفها المظلَّل.
// الاستعمال: PLAYWRIGHT_MODULE_DIR=/opt/node-tools/node_modules [PW_CHROMIUM=/path/chrome] node tests/tajweed-letters.e2e.mjs [outDir]
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

// بيانات قديمة لطالب (النظام القديم): يجب أن تُحذف كلها عند أول فتح لركن التجويد، ثم لا تُحذف بيانات الجديد بعد ذلك

await page.goto(WEB + '/index.html'); await page.waitForSelector('#btn-my-students-main', { timeout: 30000 }); await sleep(2500);
await page.evaluate(() => document.querySelector('.dh-tour-skip')?.click());
await page.evaluate(async () => { const m = await import('/core/app.js'); window.__APP = m;
  window.__CAT = await import('/engine/tajweedRulesCatalog.js'); window.__G = await import('/engine/tajweedLetterGames.js'); window.__P = await import('/engine/tajweedLetterPairs.js'); window.__J = await import('/engine/tajweedJourney.js');
  await m.AppState.studentManager.addStudent({ name: 'أحمد', type: 'adult', memoFrom: m.AppState.surahsData.find(x => x.number === 114).name, memoTo: m.AppState.surahsData.find(x => x.number === 105).name }); });
await page.evaluate(() => window.__APP.openTajweedSection()); await page.waitForSelector('#tjw-student-search-input');
await page.fill('#tjw-student-search-input', 'أحمد'); await page.click('[data-action="pick-student-submit"]'); await page.waitForSelector('.tjw-rule-tile', { timeout: 15000 });
// نُتقن كل المراحل السابقة للمد الطبيعي (تقريباً كلها) مباشرة في قاعدة البيانات حتى تُفتح المراحل التي نختبرها
await page.evaluate(async () => { const m = window.__APP, J = window.__J, st = m.AppState.currentStudent;
  for (const { stageId, rule } of window.__CAT.getAllRulesFlat()) {
    let rec = await m.AppState.tajweedManager.getOrCreateMasteryRecord(st.id, stageId, rule.id);
    rec = J.applyLearned(rec); rec = J.applyPracticeResult(rec, 95); rec = J.applyExamResult(rec, 100).record; rec = J.applyTeacherResult(rec, 100).record; rec.status = J.statusFromJourney(rec, rec.status);
    await m.AppState.tajweedManager.saveMastery(rec); } });
const toMap = async () => { await page.evaluate(() => window.__APP.openTajweedSection()); await page.waitForSelector('#tjw-student-search-input'); await page.fill('#tjw-student-search-input', 'أحمد'); await page.click('[data-action="pick-student-submit"]'); await page.waitForSelector('.tjw-rule-tile'); };
const openRule = async (rid) => { await page.click(`[data-rule="${rid}"].tjw-rule-tile`); await page.waitForSelector('.tjw-stepper'); };

// يحلّ سؤالاً واحداً حلاً صحيحاً اعتماداً على الكتالوج (نقرأ نوع السؤال من شكل الواجهة)
async function solveCurrent(ruleId) {
  return page.evaluate(async ({ ruleId }) => {
    const cat = window.__CAT, G = window.__G, strip = s => s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
    const flat = cat.getAllRulesFlat().map(x => x.rule);
    const owners = (letter) => flat.filter(r => (G.getRuleLetters(r) || []).includes(letter)).map(r => r.id);
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const card = document.querySelector('.tjw-activity-card'); if (!card) return 'nocard';
    const tiles = [...card.querySelectorAll('[data-collect-tile]')];
    if (tiles.length) { // اجمع حروف الحكم: نضغط حروف الحكم المحدّد فقط
      const letters = G.getRuleLetters(flat.find(r => r.id === ruleId));
      for (const b of tiles) { if (letters.includes(b.textContent.trim())) { document.querySelector(`[data-collect-tile="${b.dataset.collectTile}"]`).click(); await wait(30); } }
      return 'collect';
    }
    const lopts = [...card.querySelectorAll('[data-letter-option]')];
    if (lopts.length) { // الدخيل أو اربط الحرفين
      const prompt = card.querySelector('.tjw-activity-prompt').textContent;
      const rule = flat.find(r => r.id === ruleId);
      const first = card.querySelector('.tjw-big-letter')?.textContent.trim();
      let pick;
      if (first) { const pairs = G.getRulePairs(rule); pick = lopts.find(b => pairs.some(p => p.a === first && p.b === b.dataset.letterOption)); }
      else { const L = G.getRuleLetters(rule); pick = prompt.includes('ليس') ? lopts.find(b => !L.includes(b.dataset.letterOption)) : lopts.find(b => L.includes(b.dataset.letterOption)); }
      if (!pick) return 'NOPICK:' + card.innerText.replace(/\\s+/g, ' ').slice(0, 200);
      pick.click(); return 'letter-option';
    }
    const choose = [...card.querySelectorAll('[data-choose-rule]')];
    if (choose.length) { // صنّف الحرف أو الزوج
      const big = card.querySelector('.tjw-big-letter'); const txt = big.textContent.replace(/\s+/g, '');
      const ruleOf = (b) => flat.find(r => r.id === b.dataset.chooseRule);
      let hit;
      if (txt.includes('+')) { const [a, c] = txt.split('+'); hit = choose.find(b => (G.getRulePairs(ruleOf(b)) || []).some(p => p.a === a && p.b === c)); }
      else hit = choose.find(b => (G.getRuleLetters(ruleOf(b)) || []).includes(txt));
      if (!hit) return 'NOHIT:' + txt;
      hit.click(); return 'classify';

    }
    return 'unknown';
  }, { ruleId });
}
async function playAll(ruleId, label) {
  const kinds = [];
  for (let i = 0; i < 12; i++) {
    if (await page.$('.tjw-result-card')) break;
    await page.waitForSelector('.tjw-activity-card, .tjw-result-card', { timeout: 10000 });
    if (await page.$('.tjw-result-card')) break;
    kinds.push(await solveCurrent(ruleId));
    await page.waitForSelector('[data-action="next-question"]', { timeout: 8000 });
    await page.click('[data-action="next-question"]'); await sleep(250);
  }
  await page.waitForSelector('.tjw-result-card', { timeout: 15000 });
  const score = await page.textContent('.tjw-result-score');
  check(`${label}: كل الإجابات صحيحة (100%)`, score === '100%', `${score} [${kinds.join(',')}]`);
  return kinds;
}

// ١) إظهار/إخفاء وبطاقات الحروف وشجرة الحكم في شاشة الحكم (الإخفاء: 15 حرفاً بكلمات من المنصة)
await toMap(); await openRule('ikhfa');
const lesson = await page.evaluate(() => ({
  cards: document.querySelectorAll('.tjw-flip').length,
  backs: [...document.querySelectorAll('.tjw-flip')].map(c => ({ front: c.querySelector('.tjw-flip-front b').textContent.trim(), mark: c.querySelector('.tjw-flip-mark')?.textContent.trim() || '', word: c.querySelector('.tjw-flip-word')?.textContent.trim() || '' })),
  tree: !!document.querySelector('.tjw-tree'), activeNode: document.querySelector('.tjw-tree-node.is-active .tjw-tree-node-name')?.textContent.trim(),
  treeNodes: document.querySelectorAll('.tjw-tree-node').length, group: document.querySelector('.tjw-tree-group-name')?.textContent.trim(),
  lettersBtn: !!document.querySelector('[data-action="start-letters"]'), noExamBtn: !document.querySelector('[data-action="start-exam"]') }));
check('بطاقات الإخفاء: 15 بطاقة', lesson.cards === 15, String(lesson.cards));
const strip = s => s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').replace(/[أإآٱ]/g, 'ا');
check('ظهر كل بطاقة كلمة قرآنية من المنصة حرفها المظلَّل هو حرف وجهها', lesson.backs.every(b => b.word.length > 2 && strip(b.mark)[0] === strip(b.front)[0]), JSON.stringify(lesson.backs.filter(b => !(b.word.length > 2 && strip(b.mark)[0] === strip(b.front)[0])).slice(0, 3)));
check('شجرة الحكم: الحكم الحالي مظلَّل، والإدغام مجمَّع، وخمسة أحكام', lesson.tree && lesson.activeNode === 'الإخفاء' && lesson.treeNodes === 5 && lesson.group === 'الإدغام', JSON.stringify({ a: lesson.activeNode, n: lesson.treeNodes, g: lesson.group }));
check('زر «العب بحروف هذا الحكم» موجود (إضافة)', lesson.lettersBtn);
await page.click('.tjw-flip'); await sleep(100);
check('الضغط على البطاقة يقلبها', await page.evaluate(() => document.querySelector('.tjw-flip').classList.contains('is-flipped')));
await shot('1-ikhfa-lesson');

// ٢) ألعاب الحروف للإخفاء (حروف): اجمع/الدخيل/صنّف
await page.click('[data-action="start-letters"]'); await page.waitForSelector('.tjw-activity-card');
check('عنوان الشاشة «ألعاب الحروف» و5 أسئلة', /ألعاب الحروف/.test(await page.textContent('#tjwa-title')) && /\/ 5/.test(await page.textContent('.tjw-progress-label')));
const kinds1 = await playAll('ikhfa', 'ألعاب حروف الإخفاء'); await shot('2-ikhfa-letters-result');
check('تنوّع الأسئلة: لوح جمع + دخيل + تصنيف', ['collect', 'letter-option', 'classify'].every(k => kinds1.includes(k)), kinds1.join(','));

// ٣) المثلان/المتجانسان (أزواج): بطاقات أزواج وألعاب صنّف الزوج/اربط الحرفين
await toMap(); await openRule('mutajanisain');
const pairs = await page.evaluate(() => ({ cards: document.querySelectorAll('.tjw-flip.is-pair').length, badges: [...document.querySelectorAll('.tjw-flip-badge')].length, words: [...document.querySelectorAll('.tjw-flip-word')].every(w => w.textContent.trim().length > 2) }));
check('بطاقات أزواج المتجانسين: 6 بطاقات بكلمات وشارة «يُدغم»', pairs.cards === 6 && pairs.badges === 6 && pairs.words, JSON.stringify(pairs));
await page.click('[data-action="start-letters"]'); await page.waitForSelector('.tjw-activity-card');
const kinds2 = await playAll('mutajanisain', 'ألعاب أزواج المتجانسين');
check('أسئلة الأزواج: صنّف الزوج واربط الحرفين', kinds2.includes('classify') && kinds2.includes('letter-option'), kinds2.join(','));

// ٤) حكم مواقف (المد اللازم): لا بطاقات ولا زر ألعاب حروف، والشجرة موجودة
await toMap(); await openRule('madd_lazim');
const sit = await page.evaluate(() => ({ cards: document.querySelectorAll('.tjw-flip').length, btn: !!document.querySelector('[data-action="start-letters"]'), tree: !!document.querySelector('.tjw-tree') }));
check('حكم المواقف: لا بطاقات حروف ولا لعبة حروف، لكن شجرة الحكم موجودة', sit.cards === 0 && !sit.btn && sit.tree, JSON.stringify(sit));

// ٥) نشاط «شجرة الحكم» للمرحلة (النون الساكنة): 8 تصنيفات
await toMap(); await page.waitForSelector('[data-action="start-tree"][data-stage="noon_sakinah"]');
check('زر شجرة الحكم يظهر لمراحل الحروف ولا يظهر لمرحلة المواقف', !!(await page.$('[data-action="start-tree"][data-stage="noon_sakinah"]')) && !(await page.$('[data-action="start-tree"][data-stage="madd_lazim"]')));
await page.click('[data-action="start-tree"][data-stage="noon_sakinah"]'); await page.waitForSelector('.tjw-activity-card');
check('شجرة الحكم: 8 أسئلة وعنوانها صحيح', /\/ 8/.test(await page.textContent('.tjw-progress-label')) && /شجرة الحكم/.test(await page.textContent('#tjwa-title')));
// أسئلة التصنيف في الشجرة من عدة أحكام: نحلّها بحسب مالك الحرف
for (let i = 0; i < 9; i++) {
  if (await page.$('.tjw-result-card')) break;
  await page.waitForSelector('.tjw-activity-card, .tjw-result-card'); if (await page.$('.tjw-result-card')) break;
  await page.evaluate(() => { const G = window.__G, flat = window.__CAT.getAllRulesFlat().map(x => x.rule); const L = document.querySelector('.tjw-big-letter').textContent.trim();
    const id = flat.find(r => (G.getRuleLetters(r) || []).includes(L) && r.id !== 'izhar_shafawi' && ['izhar', 'idgham_bighunnah', 'idgham_bila_ghunnah', 'iqlab', 'ikhfa'].includes(r.id)).id;
    document.querySelector(`[data-choose-rule="${id}"]`).click(); });
  await page.waitForSelector('[data-action="next-question"]'); await page.click('[data-action="next-question"]'); await sleep(200);
}
await page.waitForSelector('.tjw-result-card'); check('شجرة الحكم للنون الساكنة: 100%', (await page.textContent('.tjw-result-score')) === '100%', await page.textContent('.tjw-result-score')); await shot('3-tree-result');

// ٦) نشاط الربط: سؤالان (اسم↔حروف) ثم (مثال قرآني↔حكم)
await toMap(); await page.click('[data-action="start-link"][data-stage="noon_sakinah"]'); await page.waitForSelector('.tjw-link-item');
check('نشاط الربط صار سؤالين (حروف ثم أمثلة)', /\/ 2/.test(await page.textContent('.tjw-progress-label')), await page.textContent('.tjw-progress-label'));
for (let q = 0; q < 2; q++) {
  await page.waitForSelector('.tjw-link-item');
  const exHTML = await page.evaluate(() => !!document.querySelector('.tjw-link-example'));
  if (q === 1) check('السؤال الثاني: أمثلة قرآنية من المنصة بحرف مظلَّل', exHTML && !!(await page.$('.tjw-flip-mark')));
  const ids = await page.$$eval('[data-link-name]', els => els.map(e => e.dataset.linkName));
  for (const id of ids) { await page.click(`[data-link-name="${id}"]:not([disabled])`); await page.click(`[data-link-letter="${id}"]:not([disabled])`); await sleep(80); }
  await page.waitForSelector('[data-action="next-question"]'); await page.click('[data-action="next-question"]'); await sleep(300);
}
await page.waitForSelector('.tjw-result-card'); check('نشاط الربط بسؤاليه: 100%', (await page.textContent('.tjw-result-score')) === '100%', await page.textContent('.tjw-result-score'));

check('لا أخطاء جافاسكربت في الصفحة', errs.length === 0, errs.slice(0, 3).join(' | '));
console.log(`\n${ok} ✅ / ${bad} ❌`);
await browser.close(); srv.close(); process.exit(bad ? 1 : 0);
