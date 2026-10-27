// tests/theme-dark.e2e.mjs — المظهر الداكن/الفاتح/التلقائي: السلوك (الاختيار اليدوي مقابل إعداد الجهاز، الحفظ، التبديل الفوري، Focus/Hover)
// + تباين النصوص (WCAG AA) على شاشات كانت مكسورة: واجب الطالب، سؤال «استدعِ الآية» (نص قرآني ملوّن inline)، أزرار التقييم، ورقة تقرير التقدّم، وركن الأطفال.
// الاستعمال: PLAYWRIGHT_MODULE_DIR=/opt/node22/lib/node_modules node tests/theme-dark.e2e.mjs [outDir]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(process.env.PLAYWRIGHT_MODULE_DIR ? path.join(process.env.PLAYWRIGHT_MODULE_DIR, '/') : import.meta.url);
const { chromium } = require('playwright');
const outDir = process.argv[2] || null; if (outDir) fs.mkdirSync(outDir, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(REPO, p);
  if (!f.startsWith(REPO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }).listen(0);
await new Promise(r => srv.on('listening', r)); const WEB = `http://localhost:${srv.address().port}`;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let ok = 0, bad = 0; const check = (n, c, d = '') => { c ? ok++ : bad++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
const HDR = new Set();   // لا استثناءات: الترويسة وأزرارها ضمن الفحص أيضاً

const SCAN = () => {
  const parse = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
  const lin = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
  const L = c => .2126 * lin(c.r) + .7152 * lin(c.g) + .0722 * lin(c.b);
  const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const bgsOf = el => { // قائمة خلفيات محتملة (للتدرجات: كل محطة)
    let layers = [];
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e); const c = parse(cs.backgroundColor);
      const bi = cs.backgroundImage; let stops = null;
      if (bi && bi !== 'none') { if (/url\(/.test(bi) && !/gradient/.test(bi)) { layers.push({ img: true }); } const ms = bi.match(/rgba?\([^)]+\)/g); if (ms) stops = ms.map(parse); }
      if (stops) layers.push({ stops }); if (c && c.a > 0) layers.push({ c });
      if (c && c.a >= 1 && !stops) break;
      if (e === document.documentElement) break;
    }
    let results = [{ c: parse(getComputedStyle(document.documentElement).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 }, img: false }];
    if (results[0].c.a < 1) results[0].c = over(results[0].c, { r: 255, g: 255, b: 255, a: 1 });
    for (const l of layers.reverse()) {
      if (l.img) { results = results.map(r => ({ ...r, img: true })); continue; }
      if (l.c) results = results.map(r => ({ ...r, c: over(l.c, r.c) }));
      else { const nr = []; for (const r of results) for (const s of l.stops) nr.push({ ...r, c: over(s, r.c) }); results = nr; }
    }
    return results;
  };
  const vis = el => { const cs = getComputedStyle(el), r = el.getBoundingClientRect(); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0 || r.width < 1 || r.height < 1) return false; for (let e = el.parentElement; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || +s.opacity === 0) return false; } return r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; };
  const sel = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
  const out = []; const seen = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (['SCRIPT', 'STYLE', 'SVG', 'PATH', 'NOSCRIPT'].includes(el.tagName.toUpperCase())) continue;
    let txt = ''; for (const n of el.childNodes) if (n.nodeType === 3) txt += n.nodeValue; txt = txt.trim();
    const isInput = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) ; if (isInput) txt = (el.value || el.placeholder || '').toString().trim();
    if (!txt || !vis(el)) continue;
    const cs = getComputedStyle(el); const col = parse(cs.color); if (!col) continue;
    const fs = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700, large = fs >= 24 || (fs >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    let worst = 99, worstBg = null;
    for (const b of bgsOf(el)) { const fg = col.a < 1 ? over(col, b.c) : col; const v = cr(fg, b.c); if (v < worst) { worst = v; worstBg = b; } }
    const dis = el.disabled || el.getAttribute('aria-disabled') === 'true';
    if (worst < need && !dis) { const key = sel(el) + txt.slice(0, 20); if (seen.has(key)) continue; seen.add(key); out.push({ s: sel(el), t: txt.slice(0, 40), cr: +worst.toFixed(2), need, fs, fg: cs.color, bg: worstBg && `rgb(${worstBg.c.r | 0},${worstBg.c.g | 0},${worstBg.c.b | 0})`, img: worstBg && worstBg.img }); }
  }
  return out;
};


// كاشف «المربعات الذائبة»: عنصر بحدّ/تعبئة لا يتمايزان عن سطحه (تباين الحدّ < 1.8 والتعبئة < 1.25)
// يكشف «مربعات ذائبة»: عنصر بحدّ/خلفية لا يتمايزان عن ما حوله (تباين الحدّ < 1.8 والتعبئة < 1.25) وله حجم بطاقة
const BOX = () => {
  const parse = s => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
  const lin = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
  const L = c => .2126 * lin(c.r) + .7152 * lin(c.g) + .0722 * lin(c.b);
  const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const effBg = el => { const chain = []; for (let e = el; e; e = e.parentElement) chain.push(e); let bg = { r: 10, g: 21, b: 18, a: 1 }; for (const e of chain.reverse()) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) bg = over(c, bg); } return bg; };
  const vis = el => { const cs = getComputedStyle(el), r = el.getBoundingClientRect(); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0 || r.width < 40 || r.height < 24) return false; return r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; };
  const sel = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
  const out = []; const seen = new Set();
  for (const el of document.querySelectorAll('#app-root *, .game-layout *, body > div *')) {
    if (!vis(el)) continue;
    const cs = getComputedStyle(el);
    const bw = parseFloat(cs.borderTopWidth) || 0; const bs = cs.borderTopStyle;
    const own = parse(cs.backgroundColor); const hasFill = own && own.a > .02;
    const hasBorder = bw >= 1 && bs !== 'none' && parse(cs.borderTopColor) && parse(cs.borderTopColor).a > .05;
    if (!hasFill && !hasBorder) continue;
    if (el.children.length === 0 && !el.textContent.trim()) continue;
    const parentBg = effBg(el.parentElement || document.body);
    const fillC = hasFill ? cr(over(own, parentBg), parentBg) : 1;
    const bc = hasBorder ? parse(cs.borderTopColor) : null; const borderC = bc ? cr(over(bc, hasFill ? over(own, parentBg) : parentBg), parentBg) : 1;
    // «مربع» مقصود: له إما حدّ أو تعبئة، ولا يتمايز
    if (fillC < 1.25 && borderC < 1.8) { const k = sel(el); if (seen.has(k)) continue; seen.add(k); out.push({ s: k, t: el.textContent.trim().slice(0, 18), fill: +fillC.toFixed(2), border: +borderC.toFixed(2), bw, bs }); }
  }
  return out;
};

async function open(colorScheme, pref, lang = 'ar', viewport = { width: 1200, height: 900 }) {
  const ctx = await browser.newContext({ locale: lang, viewport, colorScheme });
  await ctx.route('**/*', r => new URL(r.request().url()).hostname === 'localhost' ? r.continue() : r.abort());
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.dismiss().catch(() => {}));
  if (pref || lang) await page.addInitScript(([p, l]) => { try { if (p) localStorage.setItem('dh_theme', p); localStorage.setItem('app_lang', l); } catch (e) {} }, [pref, lang]);
  await page.goto(WEB + '/index.html'); await page.waitForSelector('#btn-my-students-main', { timeout: 30000 }); await sleep(1800);
  await page.evaluate(() => document.querySelector('.dh-tour-skip')?.click());
  return { ctx, page, errs };
}
const attr = (page) => page.evaluate(() => ({ t: document.documentElement.dataset.theme, p: document.documentElement.dataset.themePref, bg: getComputedStyle(document.body).backgroundColor }));
const lum = (rgb) => { const m = rgb.match(/\d+/g).map(Number); return (m[0] + m[1] + m[2]) / 3; };

const wantClean = (name, rows) => { const r = rows.filter(x => !HDR.has(x.t)); check(`${name}: لا نص دون AA`, r.length === 0, r.slice(0, 4).map(x => `${x.s} «${x.t}» ${x.cr}`).join(' | ')); };

// ===== 1) السلوك =====
{
  let { ctx, page, errs } = await open('dark', null);
  let a = await attr(page);
  check('تلقائي + جهاز داكن ⇒ داكن (والتفضيل auto)', a.t === 'dark' && a.p === 'auto', JSON.stringify(a));
  await page.emulateMedia({ colorScheme: 'light' }); await sleep(200); a = await attr(page);
  check('تلقائي: تغيّر إعداد الجهاز يُطبَّق فوراً دون إعادة تحميل', a.t === 'light', a.t);
  await page.emulateMedia({ colorScheme: 'dark' }); await sleep(200);
  let ev = await page.evaluate(() => new Promise(res => { document.addEventListener('app-theme-changed', e => res(e.detail), { once: true }); window.DHTheme.set('light'); }));
  a = await attr(page);
  check('اختيار «فاتح» يدوياً يتغلّب على جهاز داكن + يرسل الحدث', a.t === 'light' && a.p === 'light' && ev.theme === 'light', JSON.stringify(a) + JSON.stringify(ev));
  await page.reload(); await page.waitForSelector('#btn-my-students-main', { timeout: 30000 }); a = await attr(page);
  check('الاختيار اليدوي محفوظ بعد إعادة التحميل ولا يتعارض مع الجهاز', a.t === 'light' && a.p === 'light', JSON.stringify(a));
  const menuBg = () => page.evaluate(() => getComputedStyle(document.querySelector('.home-why-card')).backgroundColor);   // سطح يتبع الرموز (جسم الصفحة الرئيسية بهوية زمردية ثابتة)
  await page.evaluate(() => window.DHTheme.set('dark')); await sleep(300); const bgDark = lum(await menuBg());
  await page.evaluate(() => window.DHTheme.set('light')); await sleep(300); const bgLight = lum(await menuBg());
  check('أسطح الصفحة تتبدّل فورياً: داكنة في الداكن وفاتحة في الفاتح', bgDark < 60 && bgLight > 180, `${bgDark.toFixed(0)} / ${bgLight.toFixed(0)}`);
  const seq = []; for (let i = 0; i < 3; i++) { await page.evaluate(() => window.DHTheme.cycle()); seq.push((await attr(page)).p); }
  check('زر الدورة: light → auto … يعود للبداية بعد ثلاث نقرات', seq.length === 3 && new Set(seq).size === 3, seq.join('>'));
  await page.evaluate(() => window.DHTheme.set('dark')); await sleep(200);
  const btn = await page.evaluate(() => { const b = document.getElementById('theme-toggle-btn'); return b && { mode: b.getAttribute('data-mode'), label: b.getAttribute('aria-label') }; });
  check('زر المظهر يعكس الحالة (data-mode + aria-label)', btn && btn.mode === 'dark' && !!btn.label, JSON.stringify(btn));
  await page.evaluate(() => { localStorage.setItem('dh_theme', 'bogus'); }); await page.reload(); await page.waitForSelector('#btn-my-students-main', { timeout: 30000 });
  a = await attr(page); check('قيمة تخزين غير صالحة ⇒ تلقائي (لا انهيار)', a.p === 'auto', JSON.stringify(a));
  check('بلا أخطاء JS (سلوك)', errs.length === 0, errs.slice(0, 2).join(' | '));
  await ctx.close();
}

// ===== 2) Focus / Hover / Disabled في الداكن =====
{
  const { ctx, page } = await open('dark', 'dark');
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  const f = await page.evaluate(() => { const e = document.activeElement; const cs = e && getComputedStyle(e); return e && { tag: e.tagName, outline: cs.outlineStyle, w: parseFloat(cs.outlineWidth), c: cs.outlineColor }; });
  check('Focus بلوحة المفاتيح: حلقة تركيز مرئية على العنصر المفعَّل', f && f.outline !== 'none' && f.w >= 1, JSON.stringify(f));
  const hv = await page.evaluate(() => { const c = document.querySelector('.home-card:not(.home-card-adult):not(.home-card-kids)'); return c && getComputedStyle(c).borderColor; });
  await page.hover('.home-card:not(.home-card-adult):not(.home-card-kids)'); await sleep(400);
  const hv2 = await page.evaluate(() => getComputedStyle(document.querySelector('.home-card:not(.home-card-adult):not(.home-card-kids)')).borderColor);
  check('Hover على بطاقة الرئيسية يغيّر الحد (استجابة تفاعلية في الداكن)', hv && hv !== hv2, `${hv} → ${hv2}`);
  const dis = await page.evaluate(() => { const b = document.createElement('button'); b.className = 'dh-btn'; b.disabled = true; b.textContent = 'x'; document.querySelector('#app-root').appendChild(b); const cs = getComputedStyle(b); return { op: cs.opacity, cur: cs.cursor }; });
  check('Disabled: عنصر معطَّل يظهر خافتاً أو بمؤشر منع', +dis.op < 1 || dis.cur === 'not-allowed', JSON.stringify(dis));
  await ctx.close();
}

// ===== 2b) الفاتح: نفس فحص التباين على الرئيسية (تشمل الترويسة) وسؤال «استدعِ الآية» وأزرار التقييم =====
{
  const { ctx, page } = await open('light', 'light', 'ar');
  const r0 = (await page.evaluate(SCAN)).filter(x => x.s !== 'h1#main-title.home-title');   // عنوان الهيرو نص متدرّج متحرّك: التقاط مؤقت لا تباين فعلي
  check('[فاتح] الشاشة الرئيسية والترويسة: لا نص دون AA', r0.length === 0, r0.slice(0, 4).map(x => `${x.s} «${x.t}» ${x.cr}`).join(' | '));
  await page.evaluate(async () => {
    const { AppState } = await import('/core/app.js'); const nm = n => (AppState.surahsData.find(x => x.number === n) || {}).name;
    const id = await AppState.studentManager.addStudent({ name: 'عبدالرحمن', type: 'adult', memoFrom: nm(114), memoTo: nm(78) });
    AppState.currentStudent = (await AppState.studentManager.getAllStudents()).find(x => x.id === id);
    const m = await import('/games/adultGame.js'); await m.openAdultGameScreen({ qCount: 20, isJuzMode: true, juzNum: 30, surahNum: 0 }); window.__GS = m.GameState;
  });
  await sleep(1500);
  await page.evaluate(() => { const GS = window.__GS; GS.queue = [{ type: 'catch' }, { type: 'catch', chunkIndex: 0 }, { type: 'catch' }]; GS.currentIndex = 0; });
  await page.evaluate(() => document.getElementById('btn-record-correct')?.click()); await sleep(3800);
  await page.evaluate(() => { document.getElementById('show-ans-btn')?.click(); }); await sleep(600);
  wantClean('[فاتح] لعبة الكبار (استدعِ الآية) وأزرار التقييم', await page.evaluate(SCAN));
  await ctx.close();
}

// ===== 2c) الداكن: مربعات الترتيب والربط وملاحظات المعلم واضحة (لا مربعات ذائبة) =====
{
  const { ctx, page } = await open('dark', 'dark', 'ar');
  await page.evaluate(async () => {
    const { AppState } = await import('/core/app.js'); const nm = n => (AppState.surahsData.find(x => x.number === n) || {}).name;
    const id = await AppState.studentManager.addStudent({ name: 'عبدالرحمن', type: 'adult', memoFrom: nm(114), memoTo: nm(78) });
    AppState.currentStudent = (await AppState.studentManager.getAllStudents()).find(x => x.id === id);
    const m = await import('/games/adultGame.js'); await m.openAdultGameScreen({ qCount: 20, isJuzMode: true, juzNum: 30, surahNum: 0 }); window.__GS = m.GameState;
  });
  await sleep(1500);
  for (const k of ['order', 'link_ends', 'link_word_surah']) {
    await page.evaluate((k) => { const GS = window.__GS; GS.queue = [{ type: 'catch' }, { type: k, chunkIndex: 0 }, { type: 'catch' }]; GS.currentIndex = 0; }, k);
    await page.evaluate(() => document.getElementById('btn-record-correct')?.click()); await sleep(3800);
    await page.evaluate(() => document.getElementById('btn-record-wrong')?.click()); await sleep(700);   // يفتح قائمة الملاحظات
    const bad = (await page.evaluate(BOX)).filter(x => /order-item|order-slot|link-item|note-chip|note-sheet-body|^span$/.test(x.s));
    check(`[داكن] مربعات «${k}» وأزرار الملاحظات واضحة الحدود`, bad.length === 0, bad.slice(0, 3).map(x => `${x.s} ${x.fill}/${x.border}`).join(' | '));
  }
  await ctx.close();
}

// ===== 3) تباين النص (WCAG AA) — الداكن بالعربية والإنجليزية =====
for (const lang of ['ar', 'en']) {
  const { ctx, page, errs } = await open('dark', 'dark', lang);
  wantClean(`[${lang}] الشاشة الرئيسية`, await page.evaluate(SCAN));
  // واجب الطالب
  await page.evaluate(async () => {
    const { AppState } = await import('/core/app.js'); const { loadScreen } = await import('/core/navigation.js');
    AppState.currentStudent = { id: 's1', name: 'عبدالرحمن', type: 'adult' };
    AppState.currentHomework = { id: 'hw1', title: 't', questions: [
      { id: 'q1', type: 'mcq', title: 'ما معنى كلمة؟', text: 'بِسۡمِ ٱللَّهِ', options: ['أ', 'ب', 'ج'] },
      { id: 'q2', type: 'written_blank', title: 'اكتب', text: 'بِسۡمِ ٱللَّهِ' }] };
    const m = await import('/games/homework-play.js'); await loadScreen({ templateUrl: 'games/homework-play.html', initFunction: () => m.initHomeworkPlay() });
  });
  await sleep(1200);
  wantClean(`[${lang}] واجب الطالب (سؤال اختيار)`, await page.evaluate(SCAN));
  await page.evaluate(() => { document.querySelector('.hp-opt input')?.click(); }); await sleep(250);
  wantClean(`[${lang}] واجب الطالب (خيار محدَّد)`, await page.evaluate(SCAN));
  await page.evaluate(() => document.getElementById('btn-hp-next')?.click()); await sleep(400);
  wantClean(`[${lang}] واجب الطالب (فراغ كتابي)`, await page.evaluate(SCAN));
  if (outDir) await page.screenshot({ path: path.join(outDir, `hw-dark-${lang}.png`) });
  check(`[${lang}] بلا أخطاء JS`, errs.length === 0, errs.slice(0, 2).join(' | '));
  await ctx.close();
}
{
  const { ctx, page } = await open('dark', 'dark', 'ar');
  await page.evaluate(async () => {
    const { AppState } = await import('/core/app.js'); const nm = n => (AppState.surahsData.find(x => x.number === n) || {}).name;
    const id = await AppState.studentManager.addStudent({ name: 'عبدالرحمن', type: 'adult', memoFrom: nm(114), memoTo: nm(78) });
    AppState.currentStudent = (await AppState.studentManager.getAllStudents()).find(x => x.id === id);
    const m = await import('/games/adultGame.js'); await m.openAdultGameScreen({ qCount: 20, isJuzMode: true, juzNum: 30, surahNum: 0 }); window.__GS = m.GameState;
  });
  await sleep(1500);
  for (const k of ['catch', 'recite', 'around']) {
    await page.evaluate((k) => { const GS = window.__GS; GS.queue = [{ type: 'catch' }, { type: k, chunkIndex: 0 }, { type: 'catch' }]; GS.currentIndex = 0; }, k);
    await page.evaluate(() => document.getElementById('btn-record-correct')?.click());
    for (let i = 0; i < 24; i++) { await sleep(250); if (await page.evaluate((k) => (window.__GS.currentData || {}).type === k, k)) break; }
    await sleep(3200);   // انتظار اختفاء توست التشجيع (يتحرّك بين الشفافية)
    await page.evaluate(() => { document.getElementById('hint-btn')?.click(); document.getElementById('show-ans-btn')?.click(); }); await sleep(700);
    wantClean(`لعبة الكبار (${k}) + الإجابة`, await page.evaluate(SCAN));
    if (outDir) await page.screenshot({ path: path.join(outDir, `adult-dark-${k}.png`) });
  }
  await ctx.close();
}
{
  const { ctx, page } = await open('dark', 'dark', 'ar');
  await page.evaluate(async () => {
    const { AppState } = await import('/core/app.js'); const m = await import('/reports/report.js');
    AppState.currentStudent = { id: 's1', name: 'عبدالرحمن', type: 'adult' };
    m.openReportScreen({ results: [], studentName: 'عبدالرحمن', pool: [], history: [], queue: [] });
  });
  await sleep(1500);
  const t = await page.evaluate(() => { const e = document.querySelector('#report-screen .r-title'); return e && getComputedStyle(e).color; });
  check('ورقة تقرير التقدّم (فاتحة دائماً): العنوان داكن على الورق في الوضع الداكن', t && lum(t) < 90, t);
  await ctx.close();
}

// ===== 4) ركن الأطفال: يتبع المظهر (داكن/فاتح) + تباين الأسئلة =====
async function openKids(pref) {
  const { ctx, page, errs } = await open(pref === 'dark' ? 'dark' : 'light', pref, 'ar');
  await page.evaluate(async () => {
    const { AppState, setEvaluationMode } = await import('/core/app.js'); setEvaluationMode(true);
    const id = await AppState.studentManager.addStudent({ name: 'يوسف', type: 'kids', memoFrom: 'الناس', memoTo: 'النبأ' });
    AppState.currentStudent = (await AppState.studentManager.getAllStudents()).find(x => x.id === id); AppState.currentStudent.type = 'kids';
    const m = await import('/games/kidsGame.js');
    await m.openKidsGameScreen({ qCount: 30, isKidsRange: true, kidsFrom: 78, kidsTo: 114, isJuzMode: false, surahNum: 0 }); window.__GS = m.GameState;
  });
  await sleep(1500);
  return { ctx, page, errs };
}
{
  const k = await openKids('dark');
  const dk = await k.page.evaluate(() => ({ cls: document.body.className, blend: getComputedStyle(document.body).backgroundBlendMode, side: getComputedStyle(document.querySelector('.game-sidebar')).backgroundColor, ink: getComputedStyle(document.querySelector('.in-game-student h3, #in-game-name') || document.body).color }));
  check('ركن الأطفال في الداكن: صنف kids-theme + تعتيم صورة الخلفية + شريط جانبي داكن + نص فاتح', dk.cls.includes('kids-theme') && dk.blend.includes('multiply') && lum(dk.side) < 80, JSON.stringify(dk));
  const seen = new Set(); let bad = [];
  for (let i = 0; i < 14; i++) {
    await sleep(1200);
    const t = await k.page.evaluate(() => (window.__GS.currentData || {}).type);
    const rows = (await k.page.evaluate(SCAN)).filter(x => !HDR.has(x.t)); if (rows.length) bad.push(`${t}: ${rows.slice(0, 2).map(x => `${x.s} «${x.t}» ${x.cr}`).join(' ; ')}`);
    if (!seen.has(t) && outDir) { seen.add(t); await k.page.screenshot({ path: path.join(outDir, `kids-dark-${t}.png`) }); } seen.add(t);
    await k.page.evaluate(() => window.recordKidsAnswer && window.recordKidsAnswer(true));
  }
  check(`ألعاب الأطفال في الداكن (${[...seen].join('،')}): لا نص دون AA`, bad.length === 0, bad.slice(0, 3).join(' | '));
  check('بلا أخطاء JS (أطفال داكن)', k.errs.length === 0, k.errs.slice(0, 2).join(' | '));
  await k.ctx.close();
  const l = await openKids('light');
  const lrows = []; for (let i = 0; i < 6; i++) { await sleep(1200); const t = await l.page.evaluate(() => (window.__GS.currentData || {}).type); const rows = await l.page.evaluate(SCAN); if (rows.length) lrows.push(`${t}: ${rows.slice(0, 2).map(x => `${x.s} «${x.t}» ${x.cr}`).join(' ; ')}`); await l.page.evaluate(() => window.recordKidsAnswer && window.recordKidsAnswer(true)); }
  check('[فاتح] ألعاب الأطفال ومسار الأسئلة: لا نص دون AA', lrows.length === 0, lrows.slice(0, 3).join(' | '));
  const lt = await l.page.evaluate(() => ({ blend: getComputedStyle(document.body).backgroundBlendMode, side: getComputedStyle(document.querySelector('.game-sidebar')).backgroundColor }));
  check('ركن الأطفال في الفاتح لم يتغيّر: بلا دمج وشريط جانبي فاتح', !lt.blend.includes('multiply') && lum(lt.side) > 200, JSON.stringify(lt));
  await l.ctx.close();
}

console.log(`\nالنتيجة: ${ok} نجاح / ${bad} فشل`);
await browser.close(); srv.close(); process.exit(bad ? 1 : 0);
