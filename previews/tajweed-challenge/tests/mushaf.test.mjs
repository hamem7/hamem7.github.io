// tests/mushaf.test.mjs — اختبار منطق قسم «تعرف على مصحفك»: بنية الأسئلة، إجابة صحيحة واحدة، وتغطية أمثلة العلامات في البنك.
import { buildMushafLevel, buildMushafStage, signExamples, signCandidates, checkChoice, checkSignTap, checkAyahNum, checkMatch } from '../js/mushaf-engine.js';
import { MUSHAF, SIGNS, NO_TAP, IMG_ONLY, quarterMarker } from '../data/mushaf.js';
import { POOL, SURAHS } from '../data/pool.js';

let pass = 0; const errs = []; const ok = (c, m) => { if (c) pass++; else errs.push(m); };
const bi = (o) => o && o.ar && o.en && o.ar.length > 1 && o.en.length > 1;

function check(q, tag) {
  ok(!!q, `${tag} سؤال فارغ`); if (!q) return;
  ok(bi(q.explain) && bi(q.stem), `${tag} نص ناقص`);
  if (q.type === 'choice') {
    ok(q.options.length >= 2 && new Set(q.options.map((o) => o.id)).size === q.options.length && q.options.some((o) => o.id === q.answer), `${tag} choice خيارات`);
    q.options.forEach((o) => { ok((o.label && o.label.ar && o.label.en) || o.glyph, `${tag} خيار بلا نص`); const r = checkChoice(q, o.id); ok(r.ok === (o.id === q.answer), `${tag} choice ${o.id}`); });
    if (q.layout === 'text' || q.layout === 'glyphs') ok(new Set(q.options.map((o) => JSON.stringify(o.label))).size === q.options.length, `${tag} خيارات مكر\u0651رة النص`);
    if (q.media?.kind === 'verse') ok(!!POOL[q.media.key], `${tag} آية الوسيط`);
    if (q.media?.kind === 'lantern') ok(q.media.q >= 1 && q.media.q <= 240, `${tag} فانوس`);
    if (q.media?.kind === 'pagepin') ok(q.media.page > 0 && q.media.x > 0 && q.media.y > 0, `${tag} دبوس`);
    if (q.media?.kind === 'banner' || q.media?.kind === 'pagehead') ok(!!SURAHS[q.media.surah], `${tag} سورة الوسيط`);
  } else if (q.type === 'signtap') {
    const v = POOL[q.key]; ok(q.accept.words.length + q.accept.marks.length > 0, `${tag} signtap بلا مقبول`);
    ok(v.w.length - q.accept.words.length >= 2, `${tag} signtap كلمات خاطئة قليلة`);
    q.accept.words.forEach((w) => { ok(v.w[w].includes(SIGNS[q.signId].code), `${tag} كلمة لا تحمل العلامة`); ok(checkSignTap(q, { w }).ok, `${tag} قبول كلمة`); });
    v.w.forEach((w, i) => ok(checkSignTap(q, { w: i }).ok === q.accept.words.includes(i), `${tag} حكم الكلمة ${i}`));
    q.accept.marks.forEach((m) => { if (m === 'lead') { ok(!!v.rb && q.signId === 'rub_mark', `${tag} علامة الربع`); return; } const [i, k] = m.split(':').map(Number); ok((q.codes || [SIGNS[q.signId].code]).includes(v.wq[i]?.split(' ')[k]), `${tag} علامة وقف غير صحيحة`); });
    if (q.codes) { const all = []; Object.entries(v.wq).forEach(([i, str]) => str.split(' ').forEach((tk, k) => { if (q.codes.includes(tk)) all.push(`${i}:${k}`); })); ok(all.length === q.accept.marks.length, `${tag} أي علامة وقف: ناقصة`); }
  } else if (q.type === 'ayahnum') {
    ok(!!POOL[q.keys[0]] && !!POOL[q.keys[1]] && q.target === q.keys[1], `${tag} ayahnum`);
    ok(checkAyahNum(q, q.target).ok && !checkAyahNum(q, q.keys[0]).ok && checkAyahNum(q, q.keys[0]).previous, `${tag} ayahnum حكم`);
  } else if (q.type === 'match') {
    ok(q.pairs.length >= 3 && q.right.length === q.pairs.length && new Set(q.pairs.map((p) => p.id)).size === q.pairs.length, `${tag} match بنية`);
    q.pairs.forEach((p) => { ok(!!p.img && bi(p.label), `${tag} match عنصر`); q.right.forEach((o) => ok(checkMatch(q, p.id, o.id).ok === (p.id === o.id), `${tag} match حكم`)); });
    ok(new Set(q.right.map((o) => JSON.stringify(o.label))).size === q.right.length, `${tag} match أسماء مكرّرة`);
  } else errs.push(`${tag} نوع ${q.type}`);
}
let n = 0;
for (const id of Object.keys(MUSHAF)) for (const lv of [1, 2, 3]) for (let s = 1; s <= 25; s++) {
  const qs = buildMushafLevel(id, lv, s * 7919 + lv); ok(qs.length === 5, `${id} L${lv} s${s}: ${qs.length}`); qs.forEach((q, i) => { n++; check(q, `${id}/L${lv}/s${s}/q${i}`); });
}
for (let s = 1; s <= 15; s++) buildMushafStage(s).forEach((q, i) => { n++; check(q, `stage/s${s}/q${i}`); });
// كل علامة تسأل عنها لها أمثلة في البنك (وإلا تسقط أسئلة التطبيق)
for (const [id, s] of Object.entries(SIGNS)) {
  if (['ayah_end'].includes(id) || IMG_ONLY.has(id)) continue; const n2 = signCandidates(id).length;
  ok(n2 >= 1, `العلامة ${id} بلا أي مثال في البنك`); if (!NO_TAP.has(id) || id === 'rub_mark') ok(signExamples(id, 1).length >= 1, `${id} لا أمثلة للدرس`);
  for (const k of s.refs || []) ok(!!POOL[k], `${id} ref ${k} غير موجود`);
}
// نصوص الدروس ثنائية اللغة
for (const m of Object.values(MUSHAF)) { for (const f of ['name', 'tagline', 'def', 'notice', 'watch']) ok(bi(m[f]), `${m.id}.${f}`); ok(m.short && m.short.ar && m.short.en, `${m.id}.short`); m.signs.forEach((s) => { ok(bi(SIGNS[s].name) && bi(SIGNS[s].def), `sign ${s}`); }); }
// الفانوس: ٢٤٠ ربعا ← جزء/حزب صحيحان
for (let q = 1; q <= 240; q++) { const m = quarterMarker(q); ok(m.juz === Math.ceil(q / 8) && m.hizb === Math.ceil(q / 4), `فانوس ${q}`); }
ok(quarterMarker(1).kind === 'juz' && quarterMarker(5).kind === 'hizb' && quarterMarker(2).kind === 'rub' && quarterMarker(3).kind === 'nisf' && quarterMarker(4).kind === 'thalatha', 'أنواع الفانوس');
// علامة الربع والسجدة في البنك
ok(Object.values(POOL).filter((v) => v.sj).length === 15, 'السجدات الخمس عشرة'); ok(Object.values(POOL).some((v) => v.rb), 'علامة الربع');
console.log(`أسئلة المصحف: ${n} — تأكيدات: ${pass}`);
if (errs.length) { console.error(`✗ ${errs.length} فشل:\n` + [...new Set(errs)].slice(0, 25).join('\n')); process.exit(1); }
console.log('✓ قسم المصحف سليم');
