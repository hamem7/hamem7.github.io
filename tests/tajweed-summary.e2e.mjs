// tests/tajweed-summary.e2e.mjs — «ملخص اليوم» في المتصفح ببيانات حقيقية في قاعدة التطبيق: نص الملخص (حصة/حكم)، النسخ الفعلي إلى الحافظة
// (بما فيه احتياطي execCommand وحالة تعذّر النسخ)، حماية تعديل المعلم، المواضع الأربعة للزر، الإنجليزية، الجوال.
// الاستعمال: PLAYWRIGHT_MODULE_DIR=/opt/node-tools/node_modules [PW_CHROMIUM=/path/chrome] node tests/tajweed-summary.e2e.mjs [outDir]
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


await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: WEB });
await page.goto(WEB + '/index.html'); await page.waitForSelector('#btn-my-students-main', { timeout: 30000 }); await sleep(2500);
await page.evaluate(() => document.querySelector('.dh-tour-skip')?.click());
await page.evaluate(async () => { window.__APP = await import('/core/app.js'); window.__J = await import('/engine/tajweedJourney.js'); window.__C = await import('/engine/tajweedRulesCatalog.js'); window.__S = await import('/engine/tajweedSummary.js'); });
// أول فتح لركن التجويد يحذف بياناته القديمة مرة واحدة: نفتحه قبل الزرع حتى لا تُمسح
await page.evaluate(() => window.__APP.openTajweedSection()); await page.waitForSelector('.tjw-entry'); await sleep(500);

const DAY = 86400000;
await page.evaluate(async (DAY) => {
  const m = window.__APP, J = window.__J, C = window.__C, now = Date.now(), flat = C.getAllRulesFlat();
  const add = (name) => m.AppState.studentManager.addStudent({ name, avatar: '👦🏻', isHidden: false, phone: '', dob: '', grade: '', country: '', gender: 'boy', memoFrom: '', memoTo: '', weaknesses: [], resolvedWeaknesses: [] });
  const master = async (id, ruleId, daysAgo) => { const r0 = flat.find(x => x.rule.id === ruleId); const d = new Date(now - daysAgo * DAY);
    let rec = await m.AppState.tajweedManager.getOrCreateMasteryRecord(id, r0.stageId, ruleId);
    rec = J.applyLearned(rec, d); rec = J.applyPracticeResult(rec, 90, d); rec = J.applyExamResult(rec, 90, d).record; rec = J.applyTeacherResult(rec, 90, d).record;
    rec.attemptsCount = 3; rec.status = J.statusFromJourney(rec, rec.status); await m.AppState.tajweedManager.saveMastery(rec); };
  const sess = (id, ruleId, mode, score, ts, extra = {}) => m.AppState.tajweedManager.addSession({ studentId: id, stageId: ruleId ? flat.find(x => x.rule.id === ruleId).stageId : 'noon_sakinah', ruleId, activityType: mode, totalQuestions: 4, correctCount: Math.round(score / 25), scorePercent: score, timestamp: new Date(ts).toISOString(), ...extra });
  // أحمد: المراحل الثلاث الأولى متقنة (قبل 10 أيام)، واليوم أتمّ «الإظهار الحلقي» كاملاً
  const a = await add('أحمد');
  for (const r of ['qalqalah', 'ghunna_wajiba', 'ikhfa_shafawi', 'idgham_shafawi', 'izhar_shafawi']) await master(a, r, 10);
  await sess(a, 'qalqalah', 'practice', 80, now - 10 * DAY);
  await master(a, 'izhar', 0);
  const base = now - 5 * 3600000;
  await sess(a, 'izhar', 'practice', 60, base); await sess(a, 'izhar', 'practice', 80, base + 600000); await sess(a, 'izhar', 'letters', 100, base + 1200000);
  await sess(a, 'izhar', 'exam', 90, base + 1800000); await sess(a, 'izhar', 'teacher_checkpoint', 85, base + 2400000, { teacherNote: 'مخارج الحروف ممتازة' });
  await m.AppState.tajweedManager.addAchievement({ studentId: a, badgeKey: 'first_mastery', meta: null });
  // سارة: آخر نشاط قبل يومين (لا «اليوم»)
  const s = await add('سارة'); await master(s, 'qalqalah', 2); await sess(s, 'qalqalah', 'practice', 70, now - 2 * DAY);
  // خالد: لم يبدأ (لا جلسات)
  await add('خالد');
}, DAY);
const txt = (sel) => page.evaluate((s) => document.querySelector(s)?.value ?? document.querySelector(s)?.textContent ?? '', sel);
const toEntry = async () => { await page.evaluate(() => window.__APP.openTajweedSection()); await page.waitForSelector('.tjw-entry'); await sleep(300); };
const clip = () => page.evaluate(() => navigator.clipboard.readText());
const clean = (s) => page.evaluate((x) => window.__S.cleanForCopy(x), s);

// ١) من شاشة الدخول: أحمد محدَّد مسبقاً، وزر «ملخص الحصة» يفتح النافذة
await toEntry();
const hasBtn = await page.evaluate(() => ({ ahmad: !!document.querySelector('[data-action="entry-summary"]') }));
check('بطاقة «أكمل رحلتك» فيها زر «ملخص اليوم» لمن له نشاط', hasBtn.ahmad);
await page.click('[data-action="entry-summary"]'); await page.waitForSelector('#tjw-sum-overlay');
const ui = await page.evaluate(() => ({ dialog: document.getElementById('tjw-sum-overlay').getAttribute('role'), tabOn: document.querySelector('[data-sum="tab"].is-on')?.dataset.kind,
  wa: !!document.querySelector('.tjw-sum-wa, [data-sum="wa"]'), phone: !!document.querySelector('.tjw-sum-phone'), copyW: document.querySelector('#tjw-sum-copy').getBoundingClientRect().width, cardW: document.querySelector('.tjw-sum-card').getBoundingClientRect().width,
  rulePickHidden: document.getElementById('tjw-sum-rulepick').hidden }));
check('النافذة: تبويب الحصة نشط، لا زر واتساب ولا رقم ولي أمر (النسخ فقط)، وزر النسخ عريض', ui.dialog === 'dialog' && ui.tabOn === 'session' && !ui.wa && !ui.phone && ui.copyW > ui.cardW * 0.8 && ui.rulePickHidden, JSON.stringify(ui));
const text1 = await txt('#tjw-sum-text');
console.log(text1.split('\n').map(l => '      │ ' + l).join('\n'));
['السلام عليكم ورحمة الله وبركاته', 'ملخص حصة التجويد — أحمد', 'ما تعلّمناه', '*الإظهار الحلقي* (النون الساكنة والتنوين)', '🔹 التطبيق 80% ×2 · ألعاب الحروف 100% · الاختبار 90% · التسميع 85%',
  '✅ أنجز: الشرح · التطبيق · الاختبار (90%) · اعتماد المعلم', 'أتقن حكم «الإظهار الحلقي»', 'وسام «', '📊 5 أنشطة', 'القادم:', 'في البيت:', 'ملاحظة المعلم: مخارج الحروف ممتازة', 'جزاكم الله خيراً']
  .forEach(s => check('نص الحصة يحوي: ' + s.slice(0, 40), text1.includes(s)));
check('لا بقايا قالب ولا نشاط قبل 10 أيام (القلقلة) في ملخص اليوم', !/undefined|NaN|\{[a-z]+\}/.test(text1) && !text1.includes('القلقلة'));
const ta = await page.evaluate(() => { const e = document.getElementById('tjw-sum-text'); return { top: e.scrollTop, fits: e.clientHeight >= e.scrollHeight - 2, h: e.clientHeight, max: Math.round(innerHeight * 0.5), first: e.value.split('\\n')[0] }; });
check('المربع يبدأ من أول النص ويتّسع ليُظهر الرسالة كاملة (حتى نصف الشاشة)', ta.top === 0 && (ta.fits || ta.h >= ta.max - 6) && /السلام عليكم/.test(ta.first), JSON.stringify(ta));
await shot('1-summary-session');

// ٢) النسخ الفعلي إلى الحافظة
await page.click('#tjw-sum-copy'); await sleep(250);
const copied = await clip();
check('النسخ: محتوى الحافظة = نص المربع بعد التنظيف تماماً', copied === await clean(text1) && copied === text1, JSON.stringify(copied.slice(0, 40)));
const doneBtn = await page.evaluate(() => ({ cls: document.querySelector('#tjw-sum-copy').className, label: document.querySelector('#tjw-sum-copy').textContent.trim(), toast: document.getElementById('tjw-sum-toast').textContent }));
check('بعد النسخ: الزر يصير أخضر «تم النسخ — الصقها في واتساب» مع رسالة', /is-done/.test(doneBtn.cls) && /تم النسخ/.test(doneBtn.label) && /تم النسخ/.test(doneBtn.toast), JSON.stringify(doneBtn));
await sleep(2700);
check('الزر يعود لحالته بعد ثانيتين ونصف', await page.evaluate(() => /نسخ الرسالة/.test(document.querySelector('#tjw-sum-copy').textContent) && !document.querySelector('#tjw-sum-copy').classList.contains('is-done')));

// ٣) تعديل المعلم بيده ثم النسخ: يُنسخ المنظَّف كما يراه
const edited = text1 + '\n\n\n\n   سطر إضافي من المعلم   \n\n';
await page.fill('#tjw-sum-text', edited); await page.click('#tjw-sum-copy'); await sleep(250);
const c2 = await clip();
check('بعد التعديل اليدوي: يُنسخ النص المعدَّل منظَّفاً (بلا أسطر فارغة متتالية ولا مسافات زائدة ولا فراغ في الطرفين)', c2.includes('سطر إضافي من المعلم') && !/\n\n\n/.test(c2) && !/[ \t]+$/m.test(c2) && c2 === c2.trim() && c2 === await clean(edited), JSON.stringify(c2.slice(-60)));

// ٤) حماية تعديل المعلم: تغيير خيار بعد التعديل يسأل أولاً
let dlg = null, dlgMode = 'dismiss';
page.removeAllListeners('dialog');   // مستمع الترويسة يرفض كل حوار؛ هنا نتحكّم بالقبول والرفض
page.on('dialog', async d => { dlg = d.message(); await (dlgMode === 'accept' ? d.accept() : d.dismiss()); });
await page.click('#tjw-sum-home'); await sleep(200);
const keep = await page.evaluate(() => ({ text: document.getElementById('tjw-sum-text').value.includes('سطر إضافي من المعلم'), checked: document.getElementById('tjw-sum-home').checked }));
check('الرفض يُبقي نص المعلم المعدَّل ويُرجع خيار «في البيت» كما كان', !!dlg && /سيُستبدل نصّك المعدَّل/.test(dlg) && keep.text && keep.checked === true, JSON.stringify({ dlg, keep }));
dlgMode = 'accept'; await page.click('#tjw-sum-home'); await sleep(200);
const regen = await txt('#tjw-sum-text');
check('القبول يستبدل بنص جديد بلا سطر «في البيت» وبلا إضافة المعلم', !regen.includes('سطر إضافي') && !regen.includes('في البيت:') && regen.includes('ملاحظة المعلم: مخارج الحروف ممتازة'));
await page.click('#tjw-sum-home'); await sleep(200);   // نعيده (النص غير معدَّل الآن فلا سؤال)
check('إعادة تفعيل «في البيت» تعيد السطر', (await txt('#tjw-sum-text')).includes('في البيت:'));

// ٥) ملاحظة المعلم تُدرج حيّةً
await page.fill('#tjw-sum-note', 'ما شاء الله تبارك الله'); await sleep(150);
check('الملاحظة المكتوبة تُدرج في النص مباشرة', (await txt('#tjw-sum-text')).includes('ملاحظة المعلم: ما شاء الله تبارك الله'));

// ٦) تبويب الحكم
await page.click('[data-sum="tab"][data-kind="rule"]'); await sleep(200);
const ruleTab = await page.evaluate(() => ({ hidden: document.getElementById('tjw-sum-rulepick').hidden, val: document.getElementById('tjw-sum-rule').value, opts: [...document.querySelectorAll('#tjw-sum-rule option')].map(o => o.value) }));
const rt = await txt('#tjw-sum-text');
check('تبويب الحكم: يظهر اختيار الحكم (أحكام لها نشاط فقط)، والحكم المحدَّد الإظهار الحلقي', !ruleTab.hidden && ruleTab.val === 'izhar' && ruleTab.opts.includes('izhar') && ruleTab.opts.includes('qalqalah') && !ruleTab.opts.includes('madd_lazim'), JSON.stringify(ruleTab));
['ملخص حكم «الإظهار الحلقي» — أحمد', 'المرحلة: النون الساكنة والتنوين', 'الشرح: تمّ', 'التطبيق: اجتاز — أفضل نتيجة 90% (', 'الاختبار: اجتاز', 'التسميع: معتمد من المعلم — 85%', 'الحالة: متقن ما شاء الله', 'ملاحظة المعلم: مخارج الحروف ممتازة', 'ملاحظة المعلم: ما شاء الله تبارك الله']
  .forEach(s => check('نص الحكم يحوي: ' + s.slice(0, 40), rt.includes(s)));
await page.selectOption('#tjw-sum-rule', 'qalqalah'); await sleep(200);
check('تغيير الحكم المختار يبدّل النص إلى القلقلة', (await txt('#tjw-sum-text')).includes('ملخص حكم «القلقلة»'));

// ٧) احتياطي النسخ: الحافظة الحديثة مرفوضة ← execCommand من المربع الظاهر بعد تحديده كله
await page.evaluate(() => { window.__calls = []; navigator.clipboard.writeText = () => Promise.reject(new Error('blocked'));
  document.execCommand = (cmd) => { const ta = document.getElementById('tjw-sum-text'); window.__calls.push({ cmd, start: ta.selectionStart, end: ta.selectionEnd, len: ta.value.length, active: document.activeElement === ta }); return true; }; });
await page.click('#tjw-sum-copy'); await sleep(250);
const fb = await page.evaluate(() => ({ calls: window.__calls, toast: document.getElementById('tjw-sum-toast').textContent }));
check('رفض الحافظة: يُنسخ بـ execCommand من المربع الظاهر محدَّداً كله', fb.calls.length === 1 && fb.calls[0].cmd === 'copy' && fb.calls[0].start === 0 && fb.calls[0].end === fb.calls[0].len && fb.calls[0].active && /تم النسخ/.test(fb.toast), JSON.stringify(fb));
await page.evaluate(() => { document.execCommand = () => false; });
await page.click('#tjw-sum-copy'); await sleep(250);
const fail = await page.evaluate(() => { const ta = document.getElementById('tjw-sum-text'); return { sel: ta.selectionStart === 0 && ta.selectionEnd === ta.value.length, toast: document.getElementById('tjw-sum-toast').textContent, done: document.querySelector('#tjw-sum-copy').classList.contains('is-done') }; });
check('تعذّر النسخ كلياً: يبقى النص محدَّداً كله ورسالة «اضغط Ctrl+C» والزر ليس أخضر', fail.sel && /Ctrl\+C/.test(fail.toast) && !fail.done, JSON.stringify(fail));

// ٨) الإغلاق: Escape ثم النقر على الخلفية، وعودة التركيز
await page.keyboard.press('Escape'); await sleep(150);
check('Escape يغلق النافذة', !(await page.$('#tjw-sum-overlay')));
await page.click('[data-action="entry-summary"]'); await page.waitForSelector('#tjw-sum-overlay');
await page.mouse.click(5, 5); await sleep(150);
check('النقر على الخلفية يغلق النافذة', !(await page.$('#tjw-sum-overlay')));

// ٩) حصة قديمة: سارة (آخر نشاط قبل يومين) ← تنبيه التاريخ
await page.click('.tjw-st[data-name="سارة"]'); await sleep(150);
await page.click('[data-action="entry-summary"]'); await page.waitForSelector('#tjw-sum-overlay');
const old = await page.evaluate(() => ({ note: document.getElementById('tjw-sum-dayold')?.hidden === false ? document.getElementById('tjw-sum-dayold').textContent : '', text: document.getElementById('tjw-sum-text').value }));
check('آخر حصة في يوم سابق: تنبيه بتاريخها، والنص يذكر ذلك التاريخ لا اليوم', /آخر حصة مسجَّلة كانت بتاريخ/.test(old.note) && old.text.includes('📅') && old.text.includes('القلقلة'), JSON.stringify(old.note));
await page.keyboard.press('Escape');

// ١٠) طالب لم يبدأ: لا زر في الدخول، لكن من الخريطة تظهر رسالة فارغة مهذّبة
await page.click('.tjw-st[data-name="خالد"]').catch(async () => { await page.click('[data-action="entry-all"]'); await page.click('.tjw-st[data-name="خالد"]'); }); await sleep(150);
check('لا زر «ملخص اليوم» لطالب لم يبدأ', !(await page.$('[data-action="entry-summary"]')));
await page.click('[data-action="entry-map"]'); await page.waitForSelector('.tjw-hero');
await page.click('.tjw-hero [data-action="parent-summary"]'); await page.waitForSelector('#tjw-sum-overlay');
check('من هيرو الخريطة: لطالب بلا نشاط تظهر رسالة «لا توجد أنشطة» وتبويب الحكم معطّل منطقياً', (await txt('#tjw-sum-text')).includes('لا توجد أنشطة تجويد مسجَّلة') && await page.evaluate(() => document.getElementById('tjw-sum-rule').options.length === 1 && !document.getElementById('tjw-sum-rule').value));
await page.keyboard.press('Escape');

// ١١) شاشة الحكم: زر «ملخص هذا الحكم» يفتح تبويب الحكم على ذلك الحكم
await toEntry(); await page.click('[data-action="entry-map"]'); await page.waitForSelector('.tjw-rule-tile');
await page.click('[data-rule="izhar"].tjw-rule-tile'); await page.waitForSelector('.tjw-stepper');
check('شاشة الحكم فيها زر «ملخص هذا الحكم»', !!(await page.$('[data-action="parent-summary"][data-rule="izhar"]')));
await page.click('[data-action="parent-summary"][data-rule="izhar"]'); await page.waitForSelector('#tjw-sum-overlay');
check('يفتح على تبويب الحكم والإظهار الحلقي', await page.evaluate(() => document.querySelector('[data-sum="tab"].is-on').dataset.kind === 'rule' && document.getElementById('tjw-sum-rule').value === 'izhar') && (await txt('#tjw-sum-text')).includes('ملخص حكم «الإظهار الحلقي»'));
await page.keyboard.press('Escape');

// ١٢) شاشة النتيجة: بعد جلسة تطبيق حقيقية يظهر الزر ويشمل ملخص الحصة نشاطها الجديد
await page.click('[data-action="start-practice"]'); await page.waitForSelector('.tjw-activity-card');
for (let i = 0; i < 6; i++) { if (await page.$('.tjw-result-card')) break; await page.waitForSelector('.tjw-answer-btn:not([disabled]), .tjw-result-card'); const b = await page.$('.tjw-answer-btn:not([disabled])'); if (!b) continue; await b.click(); await page.waitForSelector('[data-action="next-question"]'); await page.click('[data-action="next-question"]'); await sleep(250); }
await page.waitForSelector('.tjw-result-card');
check('شاشة نتيجة التطبيق فيها زر «ملخص اليوم»', !!(await page.$('.tjw-result-card [data-action="parent-summary"]')));
await page.click('.tjw-result-card [data-action="parent-summary"]'); await page.waitForSelector('#tjw-sum-overlay');
const afterPractice = await txt('#tjw-sum-text');
check('ملخص الحصة بعد التطبيق يشمل التطبيق الجديد (×3 للإظهار الحلقي) ويبقى اعتماد اليوم', /التطبيق \d+% ×3/.test(afterPractice) && afterPractice.includes('أتقن حكم «الإظهار الحلقي»'), afterPractice.split('\n').filter(l => l.includes('🔹')).join(' | '));
await page.keyboard.press('Escape');

// ١٣) الإنجليزية
await page.evaluate(() => { window.__APP.AppState.currentLang = 'en'; });
await page.click('.tjw-result-card [data-action="parent-summary"]'); await page.waitForSelector('#tjw-sum-overlay');
const en = await txt('#tjw-sum-text');
check('الإنجليزية: النص بالإنجليزية (عدا الاسم)', /^Peace be upon you/.test(en) && /lesson summary/i.test(en) && !/[\u0600-\u06FF]/.test(en.replace(/«[^»]*»/g, '').replace(/أحمد/g, '').replace(/مخارج الحروف ممتازة/g, '')), en.slice(0, 160));
check('الإنجليزية: زر النسخ مترجم', /Copy the message/.test(await page.textContent('#tjw-sum-copy')));
check('الإنجليزية: لا «&amp;» ظاهرة في النص الملصوق (أسماء الأحكام تُفكّ ترميزها)', !/&amp;|&lt;|&gt;|&quot;/.test(en) && /Noon Sakinah & Tanween/.test(en), en.slice(0, 220));
await page.keyboard.press('Escape'); await page.evaluate(() => { window.__APP.AppState.currentLang = 'ar'; });

// ١٤) الجوال
await page.setViewportSize({ width: 390, height: 844 });
await page.click('.tjw-result-card [data-action="parent-summary"]'); await page.waitForSelector('#tjw-sum-overlay'); await sleep(200);
const mob = await page.evaluate(() => { const c = document.querySelector('.tjw-sum-card'), b = document.querySelector('#tjw-sum-copy').getBoundingClientRect(); return { fitsW: c.scrollWidth <= c.clientWidth + 1 && c.getBoundingClientRect().width <= 390, copyVisible: b.left >= 0 && b.right <= 390, docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
check('الجوال: النافذة داخل العرض بلا تمرير أفقي وزر النسخ ظاهر بعرضه', mob.fitsW && mob.copyVisible && mob.docOverflow <= 1, JSON.stringify(mob)); await shot('2-summary-mobile');

check('لا أخطاء جافاسكربت في الصفحة', errs.length === 0, errs.slice(0, 3).join(' | '));
console.log(`\n${ok} ✅ / ${bad} ❌`);
await browser.close(); srv.close(); process.exit(bad ? 1 : 0);
