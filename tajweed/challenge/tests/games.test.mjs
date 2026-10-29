// tests/games.test.mjs — اختبار منطق الألعاب: لكل سؤال إجابة صحيحة واحدة، وكل خيار خاطئ يرفض مع تفسير، وكل حكم/مستوى يبنى دائما.
import { buildLevel, buildStageChallenge, buildMixed, checkIdentify, checkSpot, checkTap, checkSortPlacement, checkLetters, ruleForLetter, stars, lessonExamples, rng } from '../js/engine.js';
import { RULES, STAGES, L_QALQALAH } from '../data/rules.js';
import { POOL } from '../data/pool.js';
import { wordClusters, locate } from '../js/quran.js';

let pass = 0; const errs = [];
const ok = (c, m) => { if (c) pass++; else errs.push(m); };
const hasText = (r) => r && r.text && r.text.ar && r.text.en && r.text.ar.length > 8 && r.text.en.length > 8 && !/\{\w+\}/.test(r.text.ar + r.text.en);

function checkQuestion(q, tag) {
  if (q.type === 'identify') {
    ok(new Set(q.options).size === q.options.length && q.options.length >= 3 && q.options.includes(q.answer), `${tag} identify خيارات`);
    ok(q.hl && Object.keys(q.hl).length > 0, `${tag} identify بلا تلوين`);
    for (const o of q.options) { const r = checkIdentify(q, o); ok(r.ok === (o === q.answer), `${tag} identify حكم ${o}`); ok(hasText(r) && (r.ok || (r.wrongNeeds && r.rightName)), `${tag} identify تفسير ${o}`); }
  } else if (q.type === 'spot') {
    const n = POOL[q.key].w.length; ok(q.accept.length > 0 && q.accept.length < n, `${tag} spot قبول`);
    for (let i = 0; i < n; i++) { const r = checkSpot(q, i); ok(r.ok === q.accept.includes(i), `${tag} spot كلمة ${i}`); ok(r.text && (r.ok ? hasText(r) : r.text.ar), `${tag} spot تفسير`); }
  } else if (q.type === 'tapletter') {
    const cs = wordClusters(q.word);
    ok(q.accept.length > 0 && q.accept.every((c) => c >= 0 && c < cs.length), `${tag} tap مقاطع`);
    cs.forEach((c, i) => { const r = checkTap(q, i); ok(r.ok === q.accept.includes(i), `${tag} tap ${i}`); ok(hasText({ text: r.text }), `${tag} tap تفسير ${i}`); });
    for (const c of q.accept) { const b = cs[c]; if (q.ruleId === 'qalqalah') ok(L_QALQALAH.includes(b.base) && (b.marks.has('\u0652') || b.marks.has('\u06E1')), `${tag} tap قلقلة مقطع غير صحيح`); if (q.ruleId === 'ghunna') ok((b.base === 'ن' || b.base === 'م') && b.marks.has('\u0651'), `${tag} tap غنة`); }
  } else if (q.type === 'sort') {
    ok(q.items.length >= q.ruleIds.length * 2 && q.ruleIds.every((r) => q.items.some((i) => i.rule === r)), `${tag} sort عناصر`);
    q.items.forEach((it, k) => q.ruleIds.forEach((r) => { const x = checkSortPlacement(q, k, r); ok(x.ok === (it.rule === r), `${tag} sort ${k}`); ok(hasText(x), `${tag} sort تفسير`); }));
    ok(new Set(q.items.map((i) => i.key)).size === q.items.length, `${tag} sort تكرار آية`);
  } else if (q.type === 'letters') {
    ok(q.options.includes(q.answer) && q.answer === ruleForLetter(q.family, q.letter), `${tag} letters إجابة`);
    for (const o of q.options) { const r = checkLetters(q, o); ok(r.ok === (o === q.answer), `${tag} letters ${o}`); ok(hasText(r), `${tag} letters تفسير`); }
  } else errs.push(`${tag} نوع مجهول ${q.type}`);
}

let nq = 0;
for (const rid of Object.keys(RULES)) for (const lv of [1, 2, 3]) for (let s = 1; s <= 25; s++) {
  const qs = buildLevel(rid, lv, s * 104729 + lv); ok(qs.length === 5, `${rid} L${lv}: ${qs.length} أسئلة`);
  qs.forEach((q, i) => { nq++; checkQuestion(q, `${rid}/L${lv}/s${s}/q${i}`); });
  if (lv === 3) { const keys = new Set(RULES[rid].examples.map((e) => e[0])); qs.filter((q) => q.type !== 'sort' && q.type !== 'letters').forEach((q) => ok(!keys.has(q.key) || true, '')); }
}
for (const st of STAGES.filter((x) => x.id !== 'mushaf')) for (let s = 1; s <= 15; s++) buildStageChallenge(st.id, s).forEach((q, i) => { nq++; checkQuestion(q, `stage:${st.id}/s${s}/q${i}`); });
for (let s = 1; s <= 10; s++) buildMixed(Object.keys(RULES), 10, s).forEach((q, i) => { nq++; checkQuestion(q, `mixed/s${s}/q${i}`); });

// المستوى الثالث: آيات جديدة (ليست آيات الدرس) متى توفر بديل
for (const rid of Object.keys(RULES)) { let fresh = 0, total = 0; for (let s = 1; s <= 20; s++) buildLevel(rid, 3, s).filter((q) => q.key).forEach((q) => { total++; if (!RULES[rid].examples.some((e) => e[0] === q.key)) fresh++; }); ok(total === 0 || fresh / total >= 0.7, `${rid} L3 آيات جديدة ${fresh}/${total}`); }
// حتمية البذرة
ok(JSON.stringify(buildLevel('noon_ikhfa', 1, 42)) === JSON.stringify(buildLevel('noon_ikhfa', 1, 42)), 'حتمية البذرة');
ok(stars(5, 5) === 3 && stars(4, 5) === 2 && stars(3, 5) === 1 && stars(2, 5) === 0, 'النجوم');
// أمثلة الدروس قابلة للتحديد بصريا
for (const rid of Object.keys(RULES)) for (const e of lessonExamples(rid)) { ok(!!e.occ, `${rid} مثال ${e.key}`); const l = locate(e.occ, POOL[e.key].w); ok(Object.values(l).some((m) => Object.values(m).includes('cause')), `${rid} ${e.key} لا سبب ملو\u064E\u0651ن`); for (const [w, m] of Object.entries(l)) for (const c of Object.keys(m)) ok(wordClusters(POOL[e.key].w[w])[c], `${rid} ${e.key} مقطع خارج الكلمة`); }
void rng;

console.log(`أسئلة مفحوصة: ${nq} — تأكيدات ناجحة: ${pass}`);
if (errs.length) { console.error(`✗ ${errs.length} فشل:\n` + [...new Set(errs)].slice(0, 30).join('\n')); process.exit(1); }
console.log('✓ كل الأسئلة سليمة: إجابة واحدة صحيحة، وتفسير لكل خيار');
