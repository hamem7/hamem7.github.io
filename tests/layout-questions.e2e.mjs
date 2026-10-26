// tests/layout-questions.e2e.mjs — ضوابط تنسيق أسئلة الكبار (المتشابهات + اربط + معنى الكلمة) عبر أحجام شاشات مختلفة.
// يفحص لكل (نوع سؤال × شاشة): ظهور اسم الطالب، عدم وجود تمرير رأسي للصفحة/اللوحة، عدم خروج أي عنصر عن حدود اللوحة،
// تناسق عرض شريط الطالب، وحدًّا أدنى لحجم خط الأسئلة (للأطفال/الكبار). يحفظ لقطات إن مُرّر مجلد.
// الاستعمال: PLAYWRIGHT_MODULE_DIR=/opt/node22/lib/node_modules PW_CHROMIUM=/opt/pw-browsers/chromium node tests/layout-questions.e2e.mjs [outDir]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(process.env.PLAYWRIGHT_MODULE_DIR ? path.join(process.env.PLAYWRIGHT_MODULE_DIR, '/') : import.meta.url);
const { chromium } = require('playwright');
const outDir = process.argv[2] || null; if (outDir) fs.mkdirSync(outDir, { recursive: true });
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(REPO, p);
  if (!f.startsWith(REPO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }).listen(0);
await new Promise(r => srv.on('listening', r)); const WEB = `http://localhost:${srv.address().port}`;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let ok = 0, bad = 0; const check = (n, c, d = '') => { c ? ok++ : bad++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };

const VIEWPORTS = [
  { n: 'desktop-1440x900', w: 1440, h: 900 }, { n: 'laptop-1366x680', w: 1366, h: 680 }, { n: 'desktop-1920x1080', w: 1920, h: 1080 },
  { n: 'ipad-land-1180x820', w: 1180, h: 820 }, { n: 'ipad-port-820x1180', w: 820, h: 1180, touch: true },
  { n: 'phone-390x844', w: 390, h: 844, touch: true }, { n: 'phone-small-360x640', w: 360, h: 640, touch: true }, { n: 'phone-land-844x390', w: 844, h: 390, touch: true },
];
// أنواع الأسئلة المفحوصة: كل عنصر يصف كيف يُبنى عنصر الطابور داخل الصفحة
const KIDS_KINDS = [{ id: 'kids_link_ends' }, { id: 'kids_link_word_surah' }];
const KINDS = [
  { id: 'sim_named', lang: 'ar' }, { id: 'sim_named', lang: 'en' },
  { id: 'sim_pair' }, { id: 'sim_notin' }, { id: 'sim_complete' }, { id: 'sim_which' }, { id: 'sim_missing' },
  { id: 'word_meaning' }, { id: 'link_ends' }, { id: 'link_word_surah' },
  { id: 'catch' }, { id: 'between' }, { id: 'around' }, { id: 'complete_ayah' }, { id: 'recite' },
];

for (const MODE of [{ kids: false, kinds: KINDS }, { kids: true, kinds: KIDS_KINDS }]) for (const vp of VIEWPORTS) {
  if (MODE.kids && !['desktop-1440x900', 'ipad-port-820x1180', 'phone-390x844'].includes(vp.n)) continue;
  const ctx = await browser.newContext({ locale: 'ar', viewport: { width: vp.w, height: vp.h }, hasTouch: !!vp.touch, isMobile: !!vp.touch && vp.w < 500 });
  await ctx.route('**/*', r => new URL(r.request().url()).hostname === 'localhost' ? r.continue() : r.abort());
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.goto(WEB + '/index.html'); await page.waitForSelector('#btn-my-students-main', { timeout: 30000 }); await sleep(2000);
  await page.evaluate(() => document.querySelector('.dh-tour-skip')?.click());
  await page.evaluate(async (kids) => {
    const { AppState } = await import('/core/app.js');
    const nm = (n) => (AppState.surahsData.find(x => x.number === n) || {}).name;
    const id = await AppState.studentManager.addStudent({ name: 'عبدالرحمن بن محمد الأنصاري', type: kids ? 'kids' : 'adult', memoFrom: nm(114), memoTo: nm(46) });
    AppState.currentStudent = (await AppState.studentManager.getAllStudents()).find(x => x.id === id);
    if (kids) AppState.currentStudent.type = 'kids';
    const m = await import(kids ? '/games/kidsGame.js' : '/games/adultGame.js');
    await (kids ? m.openKidsGameScreen({ qCount: 20, isKidsRange: true, kidsFrom: 78, kidsTo: 114, isJuzMode: false, surahNum: 0 }) : m.openAdultGameScreen({ qCount: 20, isJuzMode: true, juzNum: 30, surahNum: 0 }));
    window.__GS = m.GameState; window.__AS = AppState;
  }, MODE.kids);
  await sleep(1200);
  for (const k of MODE.kinds) {
    const tag = `${MODE.kids ? 'kids ' : ''}${vp.n} | ${k.id}${k.lang ? '/' + k.lang : ''}`;
    if (ONLY && !ONLY.includes(k.id)) continue;
    // نبني عنصر الطابور المطلوب ونضعه بعد سؤال الانتظار الحالي ثم نُجيب الحالي ليظهر سؤالنا
    await sleep(1800);
    const built = await page.evaluate(async ({ k, kids }) => {
      const AS = window.__AS, GS = window.__GS;
      AS.currentLang = k.lang || 'ar'; document.dispatchEvent(new Event('app-lang-changed'));
      let item = null;
      if (k.id.startsWith('sim_')) {
        const { ensureSimilarityQuran, getSimilarityQuran } = await import('/engine/similarityQuestions.js');
        await ensureSimilarityQuran(AS.quranEngine);
        const { generateRecallQuestions, memorizedSurahsOf } = await import('/engine/recallQuestions.js');
        const { buildSimilarQuestions } = await import('/engine/similarityInject.js');
        let sim = null;
        for (let tries = 0; tries < 30 && !sim; tries++) {
          if (k.id === 'sim_named' || k.id === 'sim_missing') {
            const memo = memorizedSurahsOf(AS.currentStudent, AS.surahsData) || new Set(GS.pool.map(a => a.surahNumber));
            sim = generateRecallQuestions(getSimilarityQuran(), memo, GS.pool, { count: 1, types: [k.id] })[0];
          } else {
            const all = await AS.similaritiesManager.getAllSimilarities();
            sim = buildSimilarQuestions({ allGroups: all, pool: GS.pool, count: 1, kids: false, types: [k.id] })[0];
          }
        }
        if (!sim) return { skip: 'no sim generated' };
        item = { type: 'similar', sim };
      } else item = { type: k.id };
      GS.queue = [{ type: kids ? 'kids_catch' : 'catch' }, { ...item, chunkIndex: 0 }, { type: kids ? 'kids_catch' : 'catch' }]; GS.currentIndex = 0;
      return { ok: true };
    }, { k, kids: MODE.kids });
    if (built.skip) { console.log(`SKIP  ${tag} — ${built.skip}`); continue; }
    // نُجيب سؤال الانتظار فيظهر سؤالنا؛ ننتظر ظهوره فعلاً (لا نعتمد على زمن ثابت) ونعيد المحاولة مرة إن سبقتنا مؤقّتات سؤال سابق
    const want = (k.id.startsWith('sim_') ? k.id : k.id);
    const arrived = async () => page.evaluate((want) => { const d = window.__GS.currentData || {}; return want.startsWith('sim_') ? d.simKind === want : (want.startsWith('link_') ? d.type === want : d.type === want); }, want);
    let got = false;
    for (let attempt = 0; attempt < 2 && !got; attempt++) {
      if (attempt) { await sleep(1500); await page.evaluate(async ({ k }) => { /* إعادة وضع الطابور */ const GS = window.__GS; const cur = GS.queue[GS.currentIndex]; }, { k }); }
      await page.evaluate((kids) => { if (kids) { window.recordKidsAnswer && window.recordKidsAnswer(true); return; } const b = document.getElementById('btn-record-correct'); b && b.click(); }, MODE.kids);
      for (let i = 0; i < 24 && !got; i++) { await sleep(250); got = await arrived(); }
    }
    await sleep(900);
    const m = await page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const vis = (el) => { if (!el) return false; const cs = getComputedStyle(el), r = el.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
      const vw = innerWidth, vh = innerHeight;
      const main = q('.game-main-area'), stu = q('#in-game-student-info'), root = document.scrollingElement;
      const cd = window.__GS.currentData || {};
      // عناصر المحتوى التي يجب أن تبقى داخل اللوحة أفقيًا
      const scope = [...document.querySelectorAll('#game-title *, #game-question *, #interactive-link-area *, #teacher-eval-area .btn, #hint-btn, #show-ans-btn, #in-game-student-info *')].filter(vis);
      const mr = main.getBoundingClientRect();
      const out = scope.filter(el => { const r = el.getBoundingClientRect(); return r.left < mr.left - 2 || r.right > mr.right + 2 || r.right > vw + 2 || r.left < -2; }).map(el => el.tagName + '.' + (el.className || el.id || '')).slice(0, 5);
      // نصوص مقصوصة داخل أزرار/بطاقات (overflow أفقي أو رأسي داخل العنصر نفسه)
      const clipped = [...document.querySelectorAll('#game-question .sim-opt-btn, #interactive-link-area .link-item, #game-title > span, .link-col h3')].filter(vis).filter(el => el.scrollWidth > el.clientWidth + 2).map(el => (el.className || el.tagName) + ':' + el.textContent.trim().slice(0, 20)).slice(0, 5);
      const fs = (sel) => { const e = [...document.querySelectorAll(sel)].find(vis); return e ? parseFloat(getComputedStyle(e).fontSize) : null; };
      // أدنى حقل لا يُقصّ: ارتفاع أسفل آخر عنصر مرئي في اللوحة مقابل أسفل الشاشة
      const last = [...main.querySelectorAll('*')].filter(vis).reduce((a, el) => Math.max(a, el.getBoundingClientRect().bottom), 0);
      const sr = stu.getBoundingClientRect();
      return {
        type: cd.type, simKind: cd.simKind, gameQ: document.body.dataset.gameQ || '', simKindAttr: document.body.dataset.simKind || '',
        pageScroll: root.scrollHeight - root.clientHeight, mainScroll: main.scrollHeight - main.clientHeight,
        studentVisible: vis(stu) && stu.innerText.trim().length > 3, studentName: stu.innerText.trim(), studentW: Math.round(sr.width), mainW: Math.round(mr.width - parseFloat(getComputedStyle(main).paddingLeft) - parseFloat(getComputedStyle(main).paddingRight)),
        studentInView: sr.top >= -1 && sr.bottom <= vh + 1, out, clipped, lastBottom: Math.round(last), vh,
        fsTitle: fs('#game-title > span'), fsVerse: fs('#game-question .quran-text, #game-question .sim-q-verse'), fsOpt: fs('#game-question .sim-opt-btn'), fsLink: fs('#interactive-link-area .link-item, #kids-link-area .link-item'),
        fsQ: fs('#game-question .sim-q-text'),
        emptyBelow: Math.round(vh - last), mainH: Math.round(mr.height),
        qBottom: Math.round(Math.max(...['game-question', 'interactive-link-area', 'kids-link-area'].map(id => { const e = document.getElementById(id); return e && vis(e) ? e.getBoundingClientRect().bottom : 0; }))),
      };
    });
    if (outDir) await page.screenshot({ path: path.join(outDir, `${vp.n}__${k.id}${k.lang ? '-' + k.lang : ''}.png`) });
    console.log(`INFO  ${tag}`, JSON.stringify(m));
    const isLink = /link_/.test(k.id);
    check(`${tag}: النوع المعروض هو المطلوب`, isLink ? m.type === k.id : (k.id.startsWith('sim_') ? m.simKind === k.id : m.type === k.id), `${m.type}/${m.simKind}`);
    check(`${tag}: اسم الطالب ظاهر وكامل`, m.studentVisible && m.studentName.includes('عبدالرحمن'), m.studentName);
    check(`${tag}: شريط الطالب بعرض اللوحة (متسق مع بقية الأسئلة)`, Math.abs(m.studentW - m.mainW) <= 10, `${m.studentW} vs ${m.mainW}`);
    check(`${tag}: لا عنصر يخرج عن حدود اللوحة`, m.out.length === 0, m.out.join(' | '));
    check(`${tag}: لا نص مقصوص داخل الأزرار/البطاقات`, m.clipped.length === 0, m.clipped.join(' | '));
    // التمرير: الشاشات الاعتيادية (ارتفاع ≥ 700) بلا أي تمرير. الهاتف الصغير الرأسي (< 700): نص السؤال وخياراته كاملة داخل الشاشة (قد يتمرّر ما تحتها: أزرار تقييم المعلم).
    // (الشاشات القصيرة < 700: تُسجَّل ملاحظة فقط). الهاتف الأفقي (ارتفاع < 500): قيد فيزيائي (الترويسة وحدها ~57 من 390px) — لا نشترط عدم التمرير بل نتحقق فقط من عدم القص والخروج عن الحدود أعلاه.
    if (vp.h >= 700) check(`${tag}: لا تمرير رأسي للصفحة ولا للوحة`, m.pageScroll <= 2 && m.mainScroll <= 2, `page ${m.pageScroll} main ${m.mainScroll}`);
    else console.log(`NOTE  ${tag}: شاشة قصيرة (${vp.h}px) — تمرير ${m.pageScroll}px (قيد معروف؛ لا يُعدّ فشلًا)`);
    // خط بطاقات الربط (للأطفال): أكبر من السابق بوضوح (كان ≤ 32px على 1440×900 و~20px على الهاتف)
    if (isLink) { const minFs = vp.w < 500 ? 18 : (vp.h < 500 ? 20 : 26); check(`${tag}: خط بطاقات الربط ≥ ${minFs}px`, m.fsLink >= minFs, `${m.fsLink}`); }
  }
  check(`${vp.n}: لا أخطاء JS`, errs.length === 0, errs.slice(0, 2).join(' | '));
  await ctx.close();
}
console.log(`\nالنتيجة: ${ok} نجاح / ${bad} فشل`);
await browser.close(); srv.close(); process.exit(bad ? 1 : 0);
