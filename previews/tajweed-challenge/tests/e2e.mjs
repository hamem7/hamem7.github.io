// tests/e2e.mjs — اختبار شامل في متصفح حقيقي (Chromium عبر Playwright): كل الأزرار والألعاب والإجابات الصحيحة والخاطئة، وكل اللغات والمظاهر والشاشات.
// التشغيل: node tools/serve.mjs 8123 &  ثم  node tests/e2e.mjs [http://localhost:8123]
import { createRequire } from 'node:module';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8123'; const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(HERE, '..', 'docs', 'screenshots'); fs.mkdirSync(SHOTS, { recursive: true });
const { RULES, STAGES } = await import('../data/rules.js');
const { MUSHAF } = await import('../data/mushaf.js');
const errors = [], log = []; let checks = 0;
const ok = (c, m) => { checks++; if (!c) errors.push(m); };

const browser = await chromium.launch();
async function open(w, h, { lang = 'ar', dark = false, review = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: dark ? 'dark' : 'light', locale: lang });
  await ctx.addInitScript((l) => { try { localStorage.setItem('tjc.lang', l); } catch {} }, lang);
  const p = await ctx.newPage();
  p.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await p.goto(`${BASE}/index.html${review ? '?review=1' : ''}`); await p.waitForSelector('.hero'); return { ctx, p };
}
const noOverflow = async (p, tag) => { const o = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); ok(o <= 1, `${tag}: تمرير أفقي ${o}px`); };

// ─── إجابة سؤال بشكل صحيح أو خاطئ عبر الواجهة ───
async function answer(p, correct) {
  const q = await p.evaluate(() => { const q = window.__tjcQ; return JSON.parse(JSON.stringify(q)); });
  if (q.type === 'identify') {
    const pick = correct ? q.answer : q.options.find((o) => o !== q.answer);
    await p.click(`.opt[data-o="${pick}"]`);
  } else if (q.type === 'choice') {
    const pick = correct ? q.answer : q.options.find((o) => o.id !== q.answer).id;
    await p.click(`.opt[data-o="${pick}"]`);
  } else if (q.type === 'signtap') {
    const v = q.accept; const sel = (w) => `.tapw[data-w="${w}"]`;
    if (correct) await p.click(v.words.length ? sel(v.words[0]) : `.tapm[data-m="${v.marks[0]}"]`);
    else { const bad = []; for (let i = 0; i < 40 && bad.length < 2; i++) if (!v.words.includes(i) && (await p.$(sel(i)))) bad.push(i); await p.click(sel(bad[0])); await p.waitForSelector('.hint.bad'); await p.click(sel(bad[1])); }
  } else if (q.type === 'ayahnum') {
    if (correct) await p.click(`.rosette[data-k="${q.target}"]`);
    else { await p.click(`.rosette[data-k="${q.keys[0]}"]`); await p.waitForSelector('.hint.bad'); await p.click(`.rosette[data-k="${q.keys[0]}"]`); }
  } else if (q.type === 'letters') {
    const pick = correct ? q.answer : q.options.find((o) => o !== q.answer);
    await p.click(`.opt[data-o="${pick}"]`);
  } else if (q.type === 'spot') {
    if (correct) await p.click(`.tapw[data-w="${q.accept[0]}"]`);
    else { const bad = []; for (let i = 0; i < 12; i++) if (!q.accept.includes(i) && (await p.$(`.tapw[data-w="${i}"]`))) bad.push(i); await p.click(`.tapw[data-w="${bad[0]}"]`); await p.waitForSelector('.hint.bad'); await p.click(`.tapw[data-w="${bad[1]}"]`); }
  } else if (q.type === 'tapletter') {
    await p.waitForSelector('.lt-hit');
    const n = await p.$$eval('.lt-hit', (a) => a.length);
    if (correct) await p.click(`.lt-hit[data-ci="${q.accept[0]}"]`, { force: true });
    else { let bad = 0; while (q.accept.includes(bad) && bad < n) bad++; await p.click(`.lt-hit[data-ci="${bad}"]`, { force: true }); await p.waitForSelector('.hint.bad'); let bad2 = bad + 1; while (q.accept.includes(bad2) && bad2 < n) bad2++; if (bad2 >= n) { bad2 = 0; while (q.accept.includes(bad2)) bad2++; if (bad2 === bad) bad2 = (bad + 1) % n; } await p.click(`.lt-hit[data-ci="${bad2}"]`, { force: true }); }
  } else if (q.type === 'sort') {
    for (let k = 0; k < q.items.length; k++) {
      const it = q.items[k]; const wrongRule = q.ruleIds.find((r) => r !== it.rule);
      await p.click(`.chip-item[data-k="${k}"]`);
      if (!correct && k === 0) { await p.click(`.bucket[data-r="${wrongRule}"] .bucket-btn`); await p.waitForSelector('.hint.bad'); await p.click(`.chip-item[data-k="${k}"]`); }
      await p.click(`.bucket[data-r="${it.rule}"] .bucket-btn`);
    }
  }
  try { await p.waitForSelector('.fb', { timeout: 4000 }); } catch (e) { await p.screenshot({ path: '/tmp/claude-0/work/shots/fail.png' }); throw new Error('لا تغذية راجعة لسؤال ' + JSON.stringify({ t: q.type, r: q.ruleId, k: q.key, a: q.accept, ans: q.answer }) + ' url=' + p.url()); }
  const cls = await p.$eval('.fb', (e) => e.className); const txt = await p.$eval('.fb', (e) => e.innerText.trim());
  ok(cls.includes(correct ? 'good' : 'bad'), `${q.type}: التغذية الراجعة ${cls} بدل ${correct ? 'good' : 'bad'}`);
  ok(txt.length > 30, `${q.type}: تفسير قصير جد\u064Bا`);
  if (!correct) ok(!/undefined|\{|NaN/.test(txt), `${q.type}: نص تغذية راجعة معطوب: ${txt}`);
  await p.click('.fb-next');
  return q.type;
}

// ═══ 1) الرئيسية والتنقل على ٣ أحجام ═══
const sizes = [['phone', 390, 844], ['tablet', 820, 1180], ['desktop', 1366, 800]];
for (const [name, w, h] of sizes) {
  const { ctx, p } = await open(w, h);
  ok((await p.$$('.stage')).length === STAGES.length, `${name}: عدد المحطات`); await noOverflow(p, `${name}/home`);
  await p.screenshot({ path: path.join(SHOTS, `home-${name}.png`), fullPage: true });
  await p.goto(`${BASE}/index.html?review=1#/rule/noon_ikhfa`); await p.waitForSelector('.rule-hero'); await noOverflow(p, `${name}/rule`);
  await p.screenshot({ path: path.join(SHOTS, `rule-${name}.png`), fullPage: true });
  await p.goto(`${BASE}/index.html?review=1#/learn/madd_munfasil`); await p.waitForSelector('.lesson');
  for (let i = 0; i < 4; i++) { await noOverflow(p, `${name}/learn${i}`); if (i === 2) await p.screenshot({ path: path.join(SHOTS, `lesson-${name}.png`), fullPage: true }); await p.click('#l-next'); await p.waitForTimeout(120); }
  await noOverflow(p, `${name}/learn4`);
  await p.goto(`${BASE}/index.html?review=1#/play/qalqalah/1`); await p.waitForSelector('.quiz'); await noOverflow(p, `${name}/play`);
  await p.screenshot({ path: path.join(SHOTS, `quiz-${name}.png`), fullPage: true });
  await ctx.close();
}

// ═══ 2) كل حكم: الدرس (٥ خطوات) ثم ٣ مستويات بإجابات صحيحة، مع فحص أزرار الدرس والأمثلة ═══
const { ctx, p } = await open(1100, 900, { review: false });
const types = new Set();
for (const rid of [...Object.keys(RULES), ...Object.keys(MUSHAF)]) {
  const isM = !!MUSHAF[rid];
  await p.goto(`${BASE}/index.html#/rule/${rid}`); await p.waitForSelector('.rule-hero');
  ok(await p.$eval('.steps .step:nth-child(2) .btn', (e) => e.classList.contains('disabled')), `${rid}: المستوى ١ يجب أن يكون مقفل\u064Bا قبل الدرس`);
  await p.click('.steps .step:first-child .btn'); await p.waitForSelector('.lesson');
  for (let step = 0; step < 4; step++) {
    if (step === 2 && isM) { await p.waitForSelector('.ayah'); ok(await p.$eval('.lesson-body', (e) => e.innerText.length > 40), `${rid}: خطوة المثال فارغة`); const tabs = await p.$$('[data-sign]'); if (tabs.length > 1) { await tabs[1].click(); await p.waitForSelector('.ayah'); } }
    if (step === 2 && !isM) { const n = RULES[rid].examples.length; for (let e = 0; e < n - 1; e++) { await p.click('[data-ex="1"]'); await p.waitForSelector('.lesson-ayah'); } for (let e = 0; e < n - 1; e++) await p.click('[data-ex="-1"]'); ok(await p.$eval('.lesson-ayah .ayah', (a) => a.innerText.length > 5), `${rid}: آية المثال فارغة`); await p.waitForSelector('.hlbox', { state: 'attached', timeout: 3000 }).catch(() => {}); ok((await p.$$('.hlbox')).length >= 1, `${rid}: لا تلوين في المثال`); }
    await p.click('#l-next'); await p.waitForTimeout(80);
  }
  if (!isM) ok(await p.$eval('.poem', (e) => e.innerText.length > 10), `${rid}: لا أبيات`);
  await p.click('#l-done'); await p.waitForSelector('.quiz');
  for (const lv of [1, 2, 3]) {
    if (lv > 1) { await p.goto(`${BASE}/index.html#/play/${rid}/${lv}`); await p.waitForSelector('.quiz'); }
    for (let i = 0; i < 5; i++) { types.add(await answer(p, true)); }
    await p.waitForSelector('.result'); ok((await p.$$eval('.big-stars .on', (a) => a.length)) === 3, `${rid} L${lv}: لم تظهر ٣ نجوم بإجابات صحيحة كاملة`);
  }
}
ok(['identify', 'spot', 'tapletter', 'sort', 'letters', 'choice', 'signtap', 'ayahnum'].every((t) => types.has(t)), `أنواع الألعاب الم\u064Fختب\u064Eرة: ${[...types]}`);
// التقدم محفوظ ومفتوح الآن
await p.goto(`${BASE}/index.html#/`); await p.waitForSelector('.hero');
ok(await p.$eval('.ring-txt b', (e) => e.innerText !== '٠'), 'النجوم لا ت\u064Fحفظ');
// مستوى باجابات خاطئة
await p.goto(`${BASE}/index.html#/play/noon_ikhfa/1`); await p.waitForSelector('.quiz');
for (let i = 0; i < 5; i++) await answer(p, false);
await p.waitForSelector('.result'); ok((await p.$$eval('.big-stars .on', (a) => a.length)) === 0, 'إجابات خاطئة كلها يجب ألا تمنح نجوم\u064Bا'); ok((await p.$('.verdict.no')) !== null, 'رسالة عدم الاجتياز');
// تحدي المحطة والتحدي الكبير
for (const st of STAGES) { await p.goto(`${BASE}/index.html#/stage/${st.id}`); await p.waitForSelector('.quiz'); const n = await p.$$eval('.q-progress i', (a) => a.length); for (let i = 0; i < n; i++) await answer(p, i % 2 === 0); await p.waitForSelector('.result'); }
await p.goto(`${BASE}/index.html#/mixed`); await p.waitForSelector('.quiz'); for (let i = 0; i < 10; i++) await answer(p, true); await p.waitForSelector('.result');
// شاشة المصادر + مسح التقدم
await p.goto(`${BASE}/index.html#/about`); await p.waitForSelector('.src-list'); ok((await p.$$('.src-list .card')).length === Object.keys((await import('../data/rules.js')).SOURCES).length, 'عدد المصادر'); ok((await p.$$('.review-list li')).length >= 3, 'قائمة المراجعة');
await p.click('#btn-reset'); ok((await p.textContent('#reset-msg')).length > 3, 'رسالة المسح');
await ctx.close();

// ═══ 3) اللغتان والاتجاه والمظهر الداكن وتخطيط الجوال ═══
for (const lang of ['ar', 'en']) {
  const { ctx: c, p: pg } = await open(390, 844, { lang, dark: lang === 'en' });
  ok((await pg.evaluate(() => document.documentElement.dir)) === (lang === 'ar' ? 'rtl' : 'ltr'), `${lang}: الاتجاه`);
  const txt = await pg.evaluate(() => document.body.innerText); ok(!/⟦/.test(txt), `${lang}: مفتاح ترجمة مفقود`);
  if (lang === 'en') ok(!/[\u0600-ۿ]{4,}.*[\u0600-ۿ]{4,}.*[\u0600-ۿ]{4,}/.test(await pg.$eval('.hero-text', (e) => e.innerText)), 'en: عربي في الواجهة');
  await pg.goto(`${BASE}/index.html?review=1#/learn/noon_iqlab`); await pg.waitForSelector('.lesson');
  for (let i = 0; i < 4; i++) { const t = await pg.evaluate(() => document.querySelector('.lesson-body').innerText); ok(!/⟦|undefined/.test(t), `${lang}: نص معطوب في الدرس ${i}`); await pg.click('#l-next'); await pg.waitForTimeout(100); }
  await pg.screenshot({ path: path.join(SHOTS, `lesson-source-${lang}.png`), fullPage: true });
  await pg.goto(`${BASE}/index.html?review=1#/play/lam_shamsi/2`); await pg.waitForSelector('.quiz'); await pg.screenshot({ path: path.join(SHOTS, `quiz-${lang}${lang === 'en' ? '-dark' : ''}.png`), fullPage: true });
  for (let i = 0; i < 5; i++) await answer(pg, i !== 1);
  await noOverflow(pg, `${lang}/result`);
  await pg.click('#btn-lang'); ok((await pg.evaluate(() => document.documentElement.lang)) !== lang, `${lang}: زر اللغة`);
  await pg.click('#btn-theme'); await pg.waitForTimeout(100);
  await c.close();
}
await browser.close();
console.log(`فحوص: ${checks} — أنواع الألعاب: ${[...types].join(', ')}`);
if (errors.length) { console.error(`✗ ${errors.length} مشكلة:\n` + [...new Set(errors)].slice(0, 40).join('\n')); process.exit(1); }
console.log('✓ كل شاشات التجربة وأزرارها وألعابها تعمل');
