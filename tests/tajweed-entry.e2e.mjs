// tests/tajweed-entry.e2e.mjs — شاشة الدخول إلى «أبطال التجويد» في المتصفح ببيانات حقيقية في قاعدة التطبيق (12 طالباً):
// بطاقات الطلاب والبحث، التحديد المسبق و«أكمل»، بداية الطالب الجديد، المراجعة، لمحة الرحلة، لوحة الأبطال، نظرة المعلم، الجوال، حالة «لا طلاب».
// الاستعمال: PLAYWRIGHT_MODULE_DIR=/opt/node-tools/node_modules [PW_CHROMIUM=/path/chrome] node tests/tajweed-entry.e2e.mjs [outDir]
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


const BOOT = async (pg) => { await pg.goto(WEB + '/index.html'); await pg.waitForSelector('#btn-my-students-main', { timeout: 30000 }); await sleep(2500);
  await pg.evaluate(() => document.querySelector('.dh-tour-skip')?.click());
  await pg.evaluate(async () => { window.__APP = await import('/core/app.js'); window.__J = await import('/engine/tajweedJourney.js'); window.__C = await import('/engine/tajweedRulesCatalog.js'); }); };
await BOOT(page);
// أول فتح لركن التجويد على الجهاز يحذف بيانات التجويد القديمة مرة واحدة (قرار موثَّق)، فنفتحه قبل زرع البيانات حتى لا تُمسح
await page.evaluate(() => window.__APP.openTajweedSection()); await page.waitForSelector('.tjw-entry'); await sleep(500);

// بيانات تجريبية حقيقية: m = عدد الأحكام المتقنة في كل مرحلة (من القلقلة)، step = خطوة الحكم الحالي، days = أيام نشاطه (قبل كم يوم)، due = عدد أحكامه المستحقة
const SEED = [
  ['أحمد', '👦🏻', [1, 1, 3, 2, 0, 0, 0, 0], 'practice', [0, 1, 2], 2], ['سارة', '👧🏻', [1, 1, 2, 0, 0, 0, 0, 0], 'exam', [0, 1, 2, 3, 4], 0], ['يوسف', '👦🏻', [1, 0, 0, 0, 0, 0, 0, 0], 'learn', [5], 1],
  ['مريم', '👩🏻', [1, 1, 3, 5, 3, 1, 0, 0], 'teacher', [1, 2], 3], ['عمر', '👦🏻', [1, 1, 1, 0, 0, 0, 0, 0], 'practice', [9], 0], ['ليلى', '👩🏻', [1, 1, 3, 5, 3, 3, 7, 2], 'exam', [0], 0],
  ['خالد', '👦🏻', [0, 0, 0, 0, 0, 0, 0, 0], 'none', [], 0], ['نورة', '👩🏻', [1, 1, 3, 3, 0, 0, 0, 0], 'practice', [3], 0], ['حمزة', '👦🏻', [1, 1, 0, 0, 0, 0, 0, 0], 'learn', [20], 0],
  ['آية', '👧🏻', [1, 1, 3, 1, 0, 0, 0, 0], 'teacher', [0, 1], 2], ['زياد', '👦🏻', [1, 0, 0, 0, 0, 0, 0, 0], 'practice', [30], 0], ['رهف', '👧🏻', [1, 1, 3, 5, 2, 0, 0, 0], 'exam', [2, 3], 1]];
await page.evaluate(async (SEED) => {
  const m = window.__APP, J = window.__J, C = window.__C, DAY = 86400000, now = Date.now();
  const flat = C.getAllRulesFlat(), stages = C.TAJWEED_STAGES;
  for (const [name, avatar, vec, step, days, due] of SEED) {
    const id = await m.AppState.studentManager.addStudent({ name, avatar, isHidden: false, dob: '', grade: '', country: '', phone: '', gender: 'boy', memoFrom: '', memoTo: '', weaknesses: [], resolvedWeaknesses: [] });
    const masteredIds = [];
    for (let si = 0; si < stages.length; si++) for (let ri = 0; ri < vec[si]; ri++) {
      const rule = stages[si].rules[ri]; masteredIds.push(rule.id);
      let rec = await m.AppState.tajweedManager.getOrCreateMasteryRecord(id, stages[si].id, rule.id);
      rec = J.applyLearned(rec); rec = J.applyPracticeResult(rec, 95); rec = J.applyExamResult(rec, 100).record; rec = J.applyTeacherResult(rec, 100).record;
      rec.attemptsCount = 3; rec.status = J.statusFromJourney(rec, rec.status); await m.AppState.tajweedManager.saveMastery(rec); }
    // الحكم الحالي بخطوته
    const si = vec.findIndex((v, i) => v < stages[i].rules.length);
    if (si >= 0 && step !== 'none') {
      const rule = stages[si].rules[vec[si]]; let rec = await m.AppState.tajweedManager.getOrCreateMasteryRecord(id, stages[si].id, rule.id);
      rec = J.applyLearned(rec);
      if (step !== 'learn') rec = J.applyPracticeResult(rec, 95);
      if (step === 'exam' || step === 'teacher') rec = J.applyExamResult(rec, 100).record;
      rec.attemptsCount = 1; rec.status = J.statusFromJourney(rec, rec.status); await m.AppState.tajweedManager.saveMastery(rec);
    }
    for (const d of days) await m.AppState.tajweedManager.addSession({ studentId: id, stageId: stages[0].id, ruleId: stages[0].rules[0].id, activityType: 'practice', totalQuestions: 4, correctCount: 3, scorePercent: 75, timestamp: new Date(now - d * DAY - 3600000 * (1 + (id % 5))).toISOString() });
    for (const rid of masteredIds.slice(0, due)) await m.AppState.reviewScheduleManager.saveRuleSchedule({ studentId: id, ruleId: rid, lastReviewedAt: new Date(now - 9 * DAY).toISOString(), nextDueAt: new Date(now - DAY).toISOString(), intervalDays: 3, lastScore: 80 });
  }
}, SEED);
const toEntry = async () => { await page.evaluate(() => window.__APP.openTajweedSection()); await page.waitForSelector('.tjw-entry'); await sleep(300); };
// يضغط بطاقة الطالب؛ ومن كانت بطاقته خلف «عرض كل الطلاب» (الأقدم نشاطاً) نفتح القائمة كاملة أولاً
const pickCard = async (name) => { if (!(await page.$(`.tjw-st[data-name="${name}"]`))) { await page.click('[data-action="entry-all"]'); await sleep(150); } await page.click(`.tjw-st[data-name="${name}"]`); await sleep(150); };
const txt = (sel) => page.evaluate((s) => document.querySelector(s)?.textContent.replace(/\s+/g, ' ').trim() || '', sel);
const count = (sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel);

// ١) الشاشة: ترويسة، إحصاءات، 6 بطاقات + «عرض الكل»، بحث، لا شريط علوي مكرر ولا حقل datalist
await toEntry(); await shot('1-entry-many');
const first = await page.evaluate(() => ({ h1: document.querySelector('.tjw-e-hero h1')?.textContent, stats: [...document.querySelectorAll('.tjw-e-stats .tjw-e-stat b')].map(b => b.textContent),
  cards: document.querySelectorAll('.tjw-st').length, showAll: document.querySelector('[data-action="entry-all"]')?.textContent.trim(), search: !!document.querySelector('#tjw-student-search-input'),
  topbarHidden: getComputedStyle(document.querySelector('.tjw-topbar')).display === 'none', datalist: !!document.querySelector('datalist'), oldBack: [...document.querySelectorAll('button')].some(b => b.id === 'tjw-btn-exit' && b.offsetParent !== null) }));
check('الترويسة والإحصاءات: أبطال التجويد، 8 مراحل، 27 حكماً، 4 خطوات', first.h1 === 'أبطال التجويد' && first.stats.slice(0, 3).join(',') === '8,27,4', JSON.stringify(first.stats));
check('12 طالباً: تظهر 6 بطاقات وزر «عرض كل الطلاب (12)» وحقل البحث', first.cards === 6 && /12/.test(first.showAll || '') && first.search, JSON.stringify({ c: first.cards, s: first.showAll }));
check('لا شريط علوي ولا زر «العودة» مكرر ولا قائمة datalist قديمة', first.topbarHidden && !first.datalist && !first.oldBack);

// ٢) التحديد المسبق: أحدث طالب نشاطاً (بلا دخول) وبطاقة «أكمل رحلتك»
const pre = await page.evaluate(() => ({ pressed: [...document.querySelectorAll('.tjw-st[aria-pressed="true"]')].map(b => b.dataset.name), title: document.querySelector('.tjw-e-cont h2')?.textContent, stepper: document.querySelectorAll('.tjw-e-stepper i').length, cur: document.querySelector('.tjw-e-stepper i.is-cur')?.textContent.trim(), inEntry: !!document.querySelector('.tjw-entry') }));
check('أحدث الطلاب نشاطاً محدَّد مسبقاً (بلا دخول صامت) وتظهر بطاقة «أكمل رحلتك»', pre.pressed.length === 1 && /أكمل رحلتك/.test(pre.title) && pre.stepper === 4 && !!pre.cur && pre.inEntry, JSON.stringify(pre));
const firstSorted = await page.evaluate(() => document.querySelector('.tjw-st').dataset.name);
check('الأحدث دخولاً أولاً (الطالب المحدَّد مسبقاً هو أول بطاقة)', firstSorted === pre.pressed[0], firstSorted);

// ٣) البحث يصفّي ويحافظ على التركيز
await page.fill('#tjw-student-search-input', 'مري'); await sleep(200);
const srch = await page.evaluate(() => ({ names: [...document.querySelectorAll('.tjw-st')].map(b => b.dataset.name), focused: document.activeElement?.id, showAll: !!document.querySelector('[data-action="entry-all"]') }));
check('البحث «مري» يظهر مريم فقط، يبقى التركيز في الحقل، ولا زر «عرض الكل»', srch.names.length === 1 && srch.names[0] === 'مريم' && srch.focused === 'tjw-student-search-input' && !srch.showAll, JSON.stringify(srch));
await page.fill('#tjw-student-search-input', 'ؤؤؤ'); await sleep(150);
check('بحث بلا نتيجة: رسالة واضحة', /لا يوجد طالب/.test(await txt('.tjw-e-students')));
await page.fill('#tjw-student-search-input', ''); await sleep(150);
await page.click('[data-action="entry-all"]'); await sleep(150);
check('«عرض كل الطلاب» يظهر الـ12 بطاقة', (await count('.tjw-st')) === 12);

// ٤) طالب لديه مراجعات: تنبيه + زر «راجع» يدخل ويبدأ المراجعة
await page.click('.tjw-st[data-name="مريم"]'); await sleep(150);
const rev = await page.evaluate(() => ({ alert: document.querySelector('.tjw-e-alert')?.textContent.replace(/\s+/g, ' ').trim(), btn: !!document.querySelector('[data-action="entry-review"]'), badge: document.querySelector('.tjw-st[data-name="مريم"] .tjw-e-bd.is-due')?.textContent.trim() }));
check('مريم: تنبيه «3 من الأحكام تحتاج مراجعة» وزر «راجع» وشارة 🔁 3', /3 من الأحكام تحتاج مراجعة/.test(rev.alert) && rev.btn && /3/.test(rev.badge), JSON.stringify(rev));
await shot('2-entry-review');
await page.click('[data-action="entry-review"]'); await page.waitForSelector('.tjw-activity-card', { timeout: 15000 });
check('«راجع» يدخل الطالب ويبدأ جولة المراجعة مباشرة', !!(await page.$('.tjw-progress-label')) && (await page.evaluate(() => window.__APP.AppState.currentStudent?.name)) === 'مريم');

// ٥) «أكمل ▶»: يفتح الحكم الحالي نفسه المعروض في البطاقة (بشرط ألا تكون عليه مراجعة معلّقة لحكم جديد)
await toEntry(); await pickCard('ليلى');
const lay = await page.evaluate(() => ({ chip: document.querySelector('.tjw-e-rulechip')?.textContent.replace(/\s+/g, ' ').trim(), cur: document.querySelector('.tjw-e-stepper i.is-cur')?.textContent.trim() }));
await page.click('[data-action="entry-go"]'); await page.waitForSelector('.tjw-stepper', { timeout: 15000 });
const opened = await page.evaluate(() => ({ name: document.querySelector('.tjw-rule-card-name')?.textContent.trim(), cur: document.querySelector('.tjw-stepper li.is-current .tjw-step-name')?.textContent.trim() }));
check('«أكمل» عند ليلى يفتح حكمها الحالي نفسه وبنفس الخطوة', lay.chip.includes(opened.name) && lay.cur.includes(opened.cur), JSON.stringify({ lay, opened }));
await shot('3-opened-current-rule');

// ٦) الطالب الجديد: خطوات الرحلة وزر أول حكم يفتح القلقلة بخطوة الشرح
await toEntry(); await pickCard('خالد');
const onb = await page.evaluate(() => ({ title: document.querySelector('.tjw-e-onb h2')?.textContent, steps: document.querySelectorAll('.tjw-e-ob').length, btn: document.querySelector('[data-action="entry-go"]')?.textContent.trim(), alert: !!document.querySelector('.tjw-e-alert') }));
check('الطالب الجديد: ترحيب بالخطوات الأربع وزر «ابدأ أول حكم: القلقلة» ولا تنبيه مراجعة', /أهلاً خالد/.test(onb.title) && onb.steps === 4 && /القلقلة/.test(onb.btn) && !onb.alert, JSON.stringify(onb));
await shot('4-entry-new-student');
await page.click('[data-action="entry-go"]'); await page.waitForSelector('.tjw-stepper');
check('زر أول حكم يفتح القلقلة بخطوة الشرح', (await txt('.tjw-rule-card-name')) === 'القلقلة' && !!(await page.$('[data-action="mark-learned"]')));

// ٧) لمحة الرحلة للطالب المحدَّد: مراحل 8، مكتملة ومغلقة ونشطة
await toEntry(); await pickCard('نورة');
const jr = await page.evaluate(() => ({ nodes: document.querySelectorAll('.tjw-e-sg').length, done: document.querySelectorAll('.tjw-e-sg.is-done').length, active: document.querySelectorAll('.tjw-e-sg.is-active').length, locked: document.querySelectorAll('.tjw-e-sg.is-locked').length,
  activeName: document.querySelector('.tjw-e-sg.is-active .tjw-e-nm')?.textContent.trim(), activeCt: document.querySelector('.tjw-e-sg.is-active .tjw-e-ct')?.textContent.trim() }));
check('نورة: 8 مراحل (3 مكتملة، 1 نشطة هي «النون الساكنة والتنوين» بـ3 من 5، و4 مغلقة)', jr.nodes === 8 && jr.done === 3 && jr.active === 1 && jr.locked === 4 && /النون الساكنة/.test(jr.activeName) && /3 من 5/.test(jr.activeCt), JSON.stringify(jr));

// ٨) معاينة لوحة الأبطال ثم فتح اللوحة الكاملة
const lb = await page.evaluate(() => ({ rows: document.querySelectorAll('.tjw-e-lbrow').length, pills: document.querySelectorAll('.tjw-e-pill').length, title: document.querySelector('.tjw-e-lbrow')?.parentElement.parentElement.querySelector('h2')?.textContent.trim() }));
check('معاينة لوحة الأبطال: ثلاث فئات بأسماء أوائل الطلاب', lb.rows === 3 && lb.pills >= 3 && /لوحة الأبطال/.test(lb.title), JSON.stringify(lb));
await page.click('[data-action="open-leaderboard"]'); await page.waitForSelector('.tjw-leaderboard');
check('«عرض اللوحة كاملة» يفتح لوحة الأبطال الكاملة', !!(await page.$('.tjw-leaderboard-section')));

// ٩) وضع المعلم: نظرة الصف وجدول المراحل والترتيب وفتح رحلة طالب من صفه
await toEntry(); await page.click('[data-action="entry-mode"][data-mode="teacher"]'); await sleep(200);
const tch = await page.evaluate(() => ({ stats: [...document.querySelectorAll('.tjw-e-tsum .tjw-e-stat b')].map(b => Number(b.textContent)), rows: document.querySelectorAll('tr[data-action="entry-row"]').length, cols: document.querySelectorAll('.tjw-e-tbl thead th').length }));
check('نظرة الصف: 12 طالباً، 6 عندهم مراجعات (أحمد ويوسف ومريم وآية ورهف + لا)، جدول 12 صفاً و10 أعمدة', tch.stats[0] === 12 && tch.rows === 12 && tch.cols === 10, JSON.stringify(tch));
check('عدّاد «عندهم مراجعات» = 5 (أحمد، يوسف، مريم، آية، رهف)', tch.stats[1] === 5, String(tch.stats[1]));
check('عدّاد «لم يبدؤوا» = 1 (خالد)', tch.stats[3] === 1, String(tch.stats[3]));
await shot('5-entry-teacher');
await page.click('[data-action="entry-sort"][data-sort="attention"]'); await sleep(150);
check('الترتيب «يحتاج انتباهاً»: من عنده مراجعات أولاً', await page.evaluate(() => /🔁/.test(document.querySelector('tr[data-action="entry-row"]').textContent)));
await page.click('tr[data-action="entry-row"][data-id]:nth-of-type(1)'); await sleep(200);
check('الضغط على صف طالب يفتح رحلته في وضع الطالب مع تحديده', !!(await page.$('.tjw-e-cont')) && (await count('.tjw-st[aria-pressed="true"]')) === 1);

// ١٠) «طالب آخر» من الخريطة: عودة بلا تحديد مسبق
await page.click('.tjw-st[aria-pressed="true"]'); await sleep(100);
await page.click('[data-action="entry-map"]'); await page.waitForSelector('.tjw-stage-section');
await page.click('[data-action="change-student"]'); await page.waitForSelector('.tjw-entry'); await sleep(200);
check('«طالب آخر» من الخريطة يعيد الشاشة بلا تحديد مسبق', (await count('.tjw-st[aria-pressed="true"]')) === 0 && !!(await page.$('.tjw-e-cont.is-hint')));

// ١١) الجوال: عمود واحد بلا تمرير أفقي
await page.setViewportSize({ width: 390, height: 844 }); await toEntry(); await sleep(300);
const mob = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, cols: new Set([...document.querySelectorAll('.tjw-e-col')].map(c => Math.round(c.getBoundingClientRect().left))).size }));
check('الجوال: عمود واحد وبلا تمرير أفقي', mob.cols === 1 && mob.overflow <= 1, JSON.stringify(mob)); await shot('6-entry-mobile');
await page.setViewportSize({ width: 1100, height: 900 });
const desk = await page.evaluate(() => new Set([...document.querySelectorAll('.tjw-e-col')].map(c => Math.round(c.getBoundingClientRect().left))).size);
check('الحاسوب: عمودان (الطلاب | الرحلة)', desk === 2, String(desk));

// ١٢) لا طلاب
const ctx2 = await browser.newContext({ locale: 'ar', viewport: { width: 1100, height: 900 } }); await ctx2.route('**/*', r => new URL(r.request().url()).hostname === 'localhost' ? r.continue() : r.abort());
const p2 = await ctx2.newPage(); p2.on('pageerror', e => { errs.push(e.message); console.log('   [pageerror2]', e.message); });
await BOOT(p2); await p2.evaluate(() => window.__APP.openTajweedSection()); await p2.waitForSelector('.tjw-entry'); await sleep(300);
const none = await p2.evaluate(() => ({ msg: document.querySelector('.tjw-e-empty')?.textContent.trim(), nodes: document.querySelectorAll('.tjw-e-sg').length, seg: !!document.querySelector('.tjw-e-seg'), cards: document.querySelectorAll('.tjw-st').length }));
check('لا طلاب: رسالة واضحة ولمحة الرحلة 8 مراحل وبلا زر الطالب/المعلم', /لا يوجد طلاب|لا طلاب/.test(none.msg) && none.nodes === 8 && !none.seg && none.cards === 0, JSON.stringify(none));
await p2.screenshot({ path: outDir ? path.join(outDir, '7-entry-none.png') : '/dev/null' }).catch(() => {});

check('لا أخطاء جافاسكربت في الصفحة', errs.length === 0, errs.slice(0, 3).join(' | '));
console.log(`\n${ok} ✅ / ${bad} ❌`);
await browser.close(); srv.close(); process.exit(bad ? 1 : 0);
