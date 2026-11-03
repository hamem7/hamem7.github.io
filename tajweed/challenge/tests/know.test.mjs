// tests/know.test.mjs — أسئلة «دروس المعرفة» (js/know-engine.js): كل مستوى ٥ أسئلة، إجابة واحدة صحيحة موجودة بين الخيارات،
// خيارات بلا تكرار، شرح بلغتين؛ وقواعد ثابتة: مخرج الحرف، عضوية الصفات، طريقة الوقف من رسم الكلمة.
import { KNOW, buildKnowLevel, areaOf, stopKind, SIFAT, AREAS, genSifaYesNo, genSifaWhich, genAreaLetter, genSameArea, genAreaOdd, genSifaBoth, genSifaCount, sifaCount } from '../js/know-engine.js';
import { BANKS } from '../data/know.js';
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
