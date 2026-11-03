// tests/know.test.mjs — أسئلة «دروس المعرفة» (js/know-engine.js): كل مستوى ٥ أسئلة، إجابة واحدة صحيحة موجودة بين الخيارات،
// خيارات بلا تكرار، شرح بلغتين؛ وقواعد ثابتة: مخرج الحرف، عضوية الصفات، طريقة الوقف من رسم الكلمة.
import { KNOW, buildKnowLevel, areaOf, stopKind, SIFAT, AREAS, genSifaYesNo, genSifaWhich, genAreaLetter, genSameArea, genAreaOdd, genSifaBoth, genSifaCount, sifaCount } from '../js/know-engine.js';
import { BANKS, MAKHARIJ17 } from '../data/know.js';
import * as KE from '../js/know-engine.js';
import { POOL } from '../data/pool.js';
import { rng } from '../js/engine.js';

let n = 0, asserts = 0; const errors = [];
const ok = (c, m) => { asserts++; if (!c) errors.push(m); };
const both = (o) => o && typeof o.ar === 'string' && typeof o.en === 'string' && o.ar.trim() && o.en.trim();

for (const id of Object.keys(KNOW)) for (const lv of [1, 2, 3]) for (let seed = 1; seed <= 60; seed++) {
  const qs = buildKnowLevel(id, lv, seed * 7919 + lv);
  ok(qs.length === 5, `${id} L${lv}: ${qs.length} أسئلة`);
  for (const q of qs) {
    n++;
    if (q.type === 'ayahnum') { ok(q.keys.includes(q.target), `${id}: ayahnum`); continue; }
    ok(q.type === 'choice', `${id}: نوع ${q.type}`);
    const ids = q.options.map((o) => o.id); ok(new Set(ids).size === ids.length, `${id} ${q.kind}: خيارات مكررة ${ids}`);
    ok(ids.includes(q.answer), `${id} ${q.kind}: الإجابة ليست بين الخيارات`);
    ok(both(q.stem) && both(q.explain), `${id} ${q.kind}: نص ناقص`);
    q.options.forEach((o) => ok(both(o.label), `${id} ${q.kind}: خيار بلا لغتين`));
  }
}
// آداب التلاوة: كل مستوى من بنكه (lv)
for (let seed = 1; seed <= 40; seed++) for (const lv of [1, 3]) { const lvOf = Object.fromEntries(BANKS.mushaf_adab.map((b) => [b.id, b.lv])); const qs = buildKnowLevel('mushaf_adab', lv, seed); ok(qs.filter((q) => lvOf[q.kind.split(':')[1]] === lv).length >= (lv === 1 ? 5 : 4), `آداب L${lv}: أسئلة من مستوى آخر`); }
// الدروس الجديدة: قواعد ثابتة
{ const c = KE.silahCandidates(); ok(c.sughra.length > 20 && c.kubra.length >= 3 && c.stop.length >= 3, 'صلة: أمثلة قليلة');
  for (const x of c.kubra) ok(/^[\u0621\u0623\u0625\u0622]/.test(POOL[x.key].w[x.i + 1]), `صلة كبرى بلا همزة بعدها ${x.key}`);
  for (const x of c.sughra) ok(!/^[\u0621\u0623\u0625\u0622]/.test(POOL[x.key].w[x.i + 1]), `صلة صغرى بعدها همزة ${x.key}`);
  for (const x of c.stop) ok(x.i === POOL[x.key].w.length - 1, 'صلة الوقف ليست آخر الآية');
  for (const x of c.none) ok(!/[\u06E5\u06E6]/.test(POOL[x.key].w[x.i]) && POOL[x.key].w[x.i + 1].startsWith('\u0671'), `لا صلة ${x.key}`); }
{ const w = KE.waslCandidates(); ok(w.fatha.length && w.kasra.length, 'همزة وصل: أمثلة');
  for (const x of w.fatha) ok(POOL[x.key].w[x.i].startsWith('\u0671\u0644'), 'فتح بلا «ال»');
  ok(KE.waslKind('ٱسۡجُدُوا۟').v === 'damma' && KE.waslKind('ٱهۡدِنَا').v === 'kasra' && KE.waslKind('ٱسۡمَ').v === 'kasra' && KE.waslKind('ٱلۡحَمۡدُ').v === 'fatha' && KE.waslKind('ٱمۡشُوا۟').v === 'kasra', 'همزة وصل: القاعدة'); }
ok(MAKHARIJ17.length === 17 && MAKHARIJ17.reduce((n, m) => n + (m.area === 'lisan' ? 1 : 0), 0) === 10, '١٧ مخرجًا، ١٠ في اللسان');
{ const r2 = rng(9); for (let i = 0; i < 300; i++) {
  const a = KE.genM17Area(r2, { hard: i % 2 === 0 }); ok(MAKHARIJ17.find((m) => String(m.n) === a.answer).letters.includes(a.media.letter) && a.options.filter((o) => MAKHARIJ17.find((m) => String(m.n) === o.id).letters.includes(a.media.letter)).length === 1, 'مخرج تفصيلي: إجابة واحدة');
  const b = KE.genM17Letter(r2); const m = MAKHARIJ17.find((x) => String(x.n) === b.kind.split(':')[1]); ok(b.options.filter((o) => m.letters.includes(o.id)).length === 1, 'حرف المخرج: إجابة واحدة');
  const p = KE.genSifaPairOf(r2); ok(KE.sifatOf(p.media.letter).includes(p.answer) && p.options.filter((o) => KE.sifatOf(p.media.letter).includes(o.id)).length === 1, 'زوج الصفات: إجابة واحدة');
  const h = KE.genSifaHas(r2); ok(h.options.filter((o) => KE.sifatOf(h.media.letter).includes(o.id)).length === 1, 'صفة الحرف: إجابة واحدة');
  const s1 = KE.genSifaSingle(r2); ok(s1.options.filter((o) => KE.sifatOf(o.id).includes(s1.kind.split(':')[1])).length === 1, 'صفة مميّزة: إجابة واحدة'); } }
// قواعد ثابتة
ok(areaOf('ع') === 'halq' && areaOf('ق') === 'lisan' && areaOf('ب') === 'shafatan' && areaOf('ف') === 'shafatan', 'مخارج');
const r = rng(5);
for (let i = 0; i < 300; i++) {
  const a = genSifaYesNo(r); const g = a.kind.split(':')[1]; ok((a.answer === 'yes') === SIFAT[g].letters.includes(a.media.letter), 'صفة نعم/لا');
  const w = genSifaWhich(r); const g2 = w.kind.split(':')[1]; ok(w.options.filter((o) => SIFAT[g2].letters.includes(o.id)).length === 1, 'صفة: إجابة واحدة');
  // المستوى الثالث: إجابة واحدة صحيحة بقاعدة ثابتة
  const sa = genSameArea(r); ok(sa.options.filter((o) => areaOf(o.id) === areaOf(sa.media.letter)).length === 1 && areaOf(sa.answer) === areaOf(sa.media.letter), 'نفس المخرج: إجابة واحدة');
  const od = genAreaOdd(r); const areas = od.options.map((o) => areaOf(o.id)); ok(areas.filter((a) => a === areaOf(od.answer)).length === 1 && new Set(areas).size === 2, 'الحرف المختلف');
  const bo = genSifaBoth(r); const [ga, gb] = bo.kind.split(':')[1].split('+'); ok(bo.options.filter((o) => SIFAT[ga].letters.includes(o.id) && SIFAT[gb].letters.includes(o.id)).length === 1, 'صفتان: إجابة واحدة');
  const co = genSifaCount(r); ok(String(sifaCount(co.media.letter)) === co.answer, 'عدد الصفات');
  const l = genAreaLetter(r); ok(l.options.filter((o) => ['halq', 'lisan', 'shafatan'].some((x) => AREAS[x].letters.includes(o.id) && l.stem.ar.includes(AREAS[x].name.ar))).length === 1, 'مخرج: إجابة واحدة');
}
// الوقف من الرسم (رموز تعليمية لا آيات)
ok(stopKind('بُ') === 'sukun' && stopKind('بࣰا') === 'alif' && stopKind('ـةٌ') === 'ha' && stopKind('سَمَا') === 'asis', 'طريقة الوقف');

// ورقة العمل والخريطة الذهنية لكل محطة
const { worksheetHTML, mindMapSVG } = await import('../js/review.js');
const { STAGES, META } = await import('../data/rules.js');
for (const st of STAGES) {
  const html = worksheetHTML(st.id); ok(!/⟦|undefined|NaN/.test(html), `ورقة ${st.id}: نص معطوب`);
  for (const id of st.rules) ok(html.includes(META[id].name.ar), `ورقة ${st.id}: ينقص ${id}`);
  ok((mindMapSVG(st).match(/mm-node/g) || []).length === st.rules.length, `خريطة ${st.id}`);
}
console.log(`أسئلة المعرفة: ${n} — تأكيدات: ${asserts}`);
if (errors.length) { console.error(`✗ ${errors.length}:\n` + [...new Set(errors)].slice(0, 30).join('\n')); process.exit(1); }
console.log('✓ دروس المعرفة سليمة');
