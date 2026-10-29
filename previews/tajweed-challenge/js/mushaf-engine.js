// js/mushaf-engine.js — محرك أسئلة قسم «تعرف على مصحفك» (منطق خالص بلا DOM).
// أنواع الأسئلة: choice (اختيار عام مع وسيط: علامة/آية/فانوس/لوحة) · signtap (اضغط العلامة في الآية) · ayahnum (اضغط رقم الآية).
import { POOL, SURAHS } from '../data/pool.js';
import { SIGNS, MUSHAF, NO_TAP, AMBIGUOUS, MARKER_KINDS, MARKER_NAMES, quarterMarker, MUSHAF_FACTS } from '../data/mushaf.js';
import { wordClusters } from './quran.js';
import { rng, shuffle, ayahOf } from './engine.js';

const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
const T = (ar, en) => ({ ar, en });
export const isMushaf = (id) => !!MUSHAF[id];

// ───────── مواضع العلامات في البنك ─────────
const cand = {};
export function signCandidates(signId) {
  if (cand[signId]) return cand[signId];
  const s = SIGNS[signId]; const out = [];
  for (const [key, v] of Object.entries(POOL)) {
    const words = [], marks = [];
    if (s.where === 'wq') Object.entries(v.wq).forEach(([i, str]) => str.split(' ').forEach((t, k) => { if (t === s.code) marks.push(`${i}:${k}`); }));
    else if (s.where === 'word') v.w.forEach((w, i) => { if (w.includes(s.code)) words.push(i); });
    else if (s.where === 'lead') { if (v.rb) marks.push('lead'); }
    if (words.length || marks.length) out.push({ key, words, marks, n: v.w.length });
  }
  return (cand[signId] = out);
}
// مجموعات المقاطع الملونة لكلمات تحمل علامة (مقطع الحرف الذي يحمل العلامة)
export function hlForWords(key, signId, words) {
  const code = SIGNS[signId].code; const hl = {};
  for (const i of words) { const cs = wordClusters(POOL[key].w[i]); const ci = cs.findIndex((c) => c.raw.includes(code)); if (ci >= 0) (hl[i] ||= {})[ci] = 'cause'; }
  return hl;
}
export function signExamples(signId, n = 3, { exclude = new Set(), maxWords = 10 } = {}) {
  const s = SIGNS[signId]; const all = signCandidates(signId);
  const refs = (s.refs || []).map((k) => all.find((c) => c.key === k)).filter(Boolean);
  const pool = all.filter((c) => !refs.includes(c) && !exclude.has(c.key)).sort((a, b) => a.n - b.n);
  const rest = pool.filter((c) => c.n <= maxWords).concat(pool.filter((c) => c.n > maxWords)); // الأقصر أولا، ثم الأطول إن لم يتوفر غيرها
  const spread = []; const seenSurah = new Set();
  for (const c of rest) { const sn = c.key.split(':')[0]; if (!seenSurah.has(sn)) { seenSurah.add(sn); spread.push(c); } }
  return [...refs, ...spread].slice(0, n).map((c) => ({ ...c, signId, hl: hlForWords(c.key, signId, c.words) }));
}

// ───────── مولدات الأسئلة ─────────
const optSign = (id, field = 'name') => ({ id, label: SIGNS[id][field], glyph: SIGNS[id].glyph, abbr: SIGNS[id].abbr || null });
const explainSign = (id) => T(`${SIGNS[id].name.ar}: ${SIGNS[id].def.ar}`, `${SIGNS[id].name.en}: ${SIGNS[id].def.en}`);

function signPool(lessonId, { noZero = false, noAmb = true } = {}) {
  let ids = MUSHAF[lessonId].signs.slice();
  if (noZero && lessonId === 'mushaf_silent_sukun') ids = ids.filter((x) => !x.startsWith('zero_'));
  if (noAmb) ids = ids.filter((x) => !AMBIGUOUS.has(x));
  return ids;
}
function optionIds(correct, lessonId, r, n = 4) {
  const lesson = MUSHAF[lessonId].signs.filter((x) => x !== correct && !AMBIGUOUS.has(x) && !(lessonId === 'mushaf_silent_sukun' && x.startsWith('zero_')));
  const kind = SIGNS[correct].where;
  const others = Object.keys(SIGNS).filter((x) => x !== correct && !lesson.includes(x) && !AMBIGUOUS.has(x) && !['ayah_end', 'sajda_sign', 'rub_mark'].includes(x) && SIGNS[x].where === kind && !x.startsWith('zero_'));
  const extra = shuffle(others, r);
  const ids = [correct, ...shuffle(lesson, r).slice(0, n - 1)];
  for (const e of extra) { if (ids.length >= n) break; ids.push(e); }
  return shuffle(ids, r);
}

export function genSignName(lessonId, r) {
  const id = pick(signPool(lessonId, { noZero: true }), r);
  return { type: 'choice', lesson: lessonId, kind: 'name', stem: T('ما اسم هذه العلامة؟', 'What is the name of this sign?'), media: { kind: 'glyph', glyph: SIGNS[id].glyph }, layout: 'text',
    options: optionIds(id, lessonId, r).map((x) => optSign(x)), answer: id, explain: explainSign(id) };
}
export function genSignMeaning(lessonId, r) {
  const id = pick(signPool(lessonId, { noZero: true }), r);
  return { type: 'choice', lesson: lessonId, kind: 'meaning', stem: T('ما معنى هذه العلامة؟', 'What does this sign mean?'), media: { kind: 'glyph', glyph: SIGNS[id].glyph }, layout: 'text',
    options: optionIds(id, lessonId, r).map((x) => optSign(x, 'def')), answer: id, explain: explainSign(id) };
}
export function genSignReverse(lessonId, r) {
  const id = pick(signPool(lessonId, { noZero: true }), r);
  return { type: 'choice', lesson: lessonId, kind: 'reverse', stem: T(`أي علامة تقابل هذا التعريف؟ «${SIGNS[id].def.ar}»`, `Which sign matches this definition? “${SIGNS[id].def.en}”`), media: null, layout: 'glyphs',
    options: optionIds(id, lessonId, r).map((x) => optSign(x)), answer: id, explain: explainSign(id) };
}

export function genSignTap(lessonId, r, { exclude = new Set(), onlyIds = null, maxWords = 8 } = {}) {
  const ids = MUSHAF[lessonId].signs.filter((x) => !NO_TAP.has(x) && (!onlyIds || onlyIds.includes(x)) && signCandidates(x).length);
  for (let t = 0; t < 40; t++) {
    const id = pick(ids, r); const cs = signCandidates(id).filter((c) => !exclude.has(c.key) && c.n <= maxWords + (t > 20 ? 4 : 0));
    if (!cs.length) continue; const c = pick(cs, r); const n = POOL[c.key].w.length;
    if (n - c.words.length < 2) continue;
    return { type: 'signtap', lesson: lessonId, signId: id, key: c.key, accept: { words: c.words, marks: c.marks }, stem: T(`اضغط على ${SIGNS[id].name.ar} في الآية`, `Tap the ${SIGNS[id].name.en} in the verse`), explain: explainSign(id), hl: hlForWords(c.key, id, c.words) };
  }
  return null;
}

// رقم الآية: الآية k مظللة، والخطأ الشائع رقم الآية السابقة (التي قبلها)
export function genAyahNum(r, { maxWords = 6 } = {}) {
  const keys = Object.keys(POOL).filter((k) => { const [s, a] = k.split(':').map(Number); return a >= 2 && s >= 78 && POOL[k].w.length <= maxWords && POOL[`${s}:${a - 1}`] && POOL[`${s}:${a - 1}`].w.length <= maxWords + 2; });
  const key = pick(keys, r); const [s, a] = key.split(':').map(Number);
  return { type: 'ayahnum', lesson: 'mushaf_ayah_number', keys: [`${s}:${a - 1}`, key], target: key, number: a,
    stem: T('اضغط على رقم الآية المظل\u064E\u0651لة', 'Tap the number of the highlighted ayah'),
    explain: T('رقم الآية يأتي بعد نهايتها لا قبلها: الرقم الذي يلي الآية المظل\u064E\u0651لة هو رقمها، والذي قبلها هو رقم الآية السابقة.', 'The ayah number comes after the ayah, not before it: the number that follows the highlighted ayah is its own; the one before it belongs to the previous ayah.') };
}

const BANK = {
  mushaf_ayah_number: [
    { id: 'where', media: { kind: 'img', src: 'assets/mushaf/ayah-number.webp', alt: T('وردة رقم الآية', 'Ayah-number rosette') }, stem: T('أين ي\u064Fكتب رقم الآية؟', 'Where is the ayah number written?'),
      options: [T('في نهاية الآية داخل وردة', 'At the end of the ayah, inside a rosette'), T('في بداية الآية', 'At the start of the ayah'), T('في أعلى الصفحة', 'At the top of the page'), T('على هامش الصفحة', 'In the page margin')], answer: 0, explain: SIGNS_EXPLAIN('ayah_end') },
    { id: 'banner', media: { kind: 'banner' }, stem: T('ما هذه اللوحة المزخرفة؟', 'What is this ornamental panel?'),
      options: [T('لوحة اسم السورة', 'The surah title panel'), T('علامة بداية الجزء', 'The start-of-juz mark'), T('علامة السجدة', 'The sajdah mark'), T('رقم الآية', 'The ayah number')], answer: 0, explain: T('قبل أول آية في كل سورة لوحة مزخرفة فيها اسمها.', 'Before the first ayah of every surah there is an ornamental panel with its name.') },
    { id: 'basmala', media: { kind: 'banner' }, stem: T('ما الذي يأتي بعد لوحة اسم السورة؟', 'What comes after the surah title panel?'),
      options: [T('البسملة ثم أول آية', 'The basmala, then the first ayah'), T('علامة الربع', 'The quarter mark'), T('علامة السجدة', 'The sajdah mark'), T('رقم الصفحة', 'The page number')], answer: 0, explain: T('بعد لوحة اسم السورة تأتي البسملة (إلا في سورة التوبة)، ثم أول آية.', 'After the title panel comes the basmala (except in Surah At-Tawbah), then the first ayah.') },
    { id: 'pagehead', media: null, stem: T('في أعلى صفحة المصحف: ما الذي على اليمين وما الذي على اليسار؟', 'At the top of a mushaf page: what is on the right and what is on the left?'),
      options: [T('اسم الجزء على اليمين واسم السورة على اليسار', 'The juz name on the right, the surah name on the left'), T('اسم السورة على اليمين واسم الجزء على اليسار', 'The surah name on the right, the juz name on the left'), T('رقم الآية على اليمين ورقم الصفحة على اليسار', 'The ayah number on the right, the page number on the left'), T('علامة الوقف على اليمين والسجدة على اليسار', 'A stop sign on the right, a sajdah on the left')], answer: 0, explain: T('في أعلى الصفحة اسم الجزء على اليمين واسم السورة على اليسار.', 'At the top of the page: the juz name on the right and the surah name on the left.') }
  ],
  mushaf_sajda: [
    { id: 'margin', media: null, stem: T('ما معنى كلمة «سجدة» المكتوبة على هامش الصفحة؟', 'What does the word “سجدة” written in the page margin mean?'),
      options: [T('هنا موضع سجود التلاوة', 'Here is a place of prostration'), T('هنا بداية جزء جديد', 'Here a new juz begins'), T('هنا تنتهي السورة', 'Here the surah ends'), T('هنا وقف لازم', 'Here is a compulsory stop')], answer: 0, explain: SIGNS_EXPLAIN('sajda_sign'), review: 'خيارات هذا السؤال صياغتي (التعريف نفسه من المنصة)' },
    { id: 'overline', media: { kind: 'img', src: 'assets/mushaf/sajda-overline.webp', alt: T('خط فوق كلمات السجود', 'A line above the words of prostration') }, stem: T('ما معنى هذا الخط فوق الكلمات؟', 'What does this line above the words mean?'),
      options: [T('هذه كلمات السجود', 'These are the words at which you prostrate'), T('هذه كلمات ت\u064Fقرأ بسرعة', 'These words are read quickly'), T('هذه كلمات ت\u064Fكر\u064E\u0651ر', 'These words are repeated'), T('هذه كلمات لا ت\u064Fقرأ', 'These words are not read')], answer: 0, explain: SIGNS_EXPLAIN('sajda_sign'), review: 'خيارات هذا السؤال صياغتي' },
    { id: 'mark', media: { kind: 'img', src: 'assets/mushaf/sajda-mark.webp', alt: T('علامة السجدة', 'Sajdah mark') }, stem: T('ما هذه العلامة التي تشبه قبة المسجد؟', 'What is this sign that looks like a mosque dome?'),
      options: [T('علامة السجدة', 'The sajdah sign'), T('علامة الربع', 'The quarter mark'), T('رقم الآية', 'The ayah number'), T('وقف جائز', 'A permissible stop')], answer: 0, explain: SIGNS_EXPLAIN('sajda_sign') }
  ]
};
function SIGNS_EXPLAIN(id) { return T(`${SIGNS[id].name.ar}: ${SIGNS[id].def.ar}`, `${SIGNS[id].name.en}: ${SIGNS[id].def.en}`); }

export function genBank(lessonId, r, avoid = new Set()) {
  const items = BANK[lessonId].filter((b) => !avoid.has(b.id)); const b = pick(items.length ? items : BANK[lessonId], r);
  const order = shuffle(b.options.map((o, i) => ({ id: String(i), label: o })), r);
  const q = { type: 'choice', lesson: lessonId, kind: 'bank:' + b.id, stem: b.stem, media: b.media ? { ...b.media } : null, layout: 'text', options: order, answer: '0', explain: b.explain };
  if (q.media && q.media.kind === 'banner') { const sn = pick([78, 80, 87, 93, 96, 97, 99, 101, 105, 108, 110, 112, 114], r); q.media.surah = sn; }
  return q;
}

// حقائق: الأجزاء والأحزاب والأرباع
const FACTS = [
  { id: 'hizb_in_juz', stem: T('كم حزبا\u064B في الجزء الواحد؟', 'How many hizb are in one juz?'), ans: 2, set: [1, 2, 3, 4] },
  { id: 'quarter_in_hizb', stem: T('كم ربعا\u064B في الحزب الواحد؟', 'How many quarters are in one hizb?'), ans: 4, set: [2, 3, 4, 8] },
  { id: 'quarter_in_juz', stem: T('كم ربعا\u064B في الجزء الواحد؟', 'How many quarters are in one juz?'), ans: 8, set: [4, 6, 8, 12] },
  { id: 'juz_in_quran', stem: T('كم جزءا\u064B في القرآن الكريم؟', 'How many juz are in the Holy Quran?'), ans: 30, set: [20, 30, 40, 60] },
  { id: 'hizb_in_quran', stem: T('كم حزبا\u064B في القرآن الكريم؟', 'How many hizb are in the Holy Quran?'), ans: 60, set: [30, 40, 60, 120] }
];
const FACT_EXPLAIN = T('ثلاثون جزءا\u064B، وستون حزبا\u064B، ومئتان وأربعون ربعا\u064B. الجزء حزبان، والحزب أربعة أرباع، والجزء ثمانية أرباع. وفي القرآن خمس عشرة سجدة.', 'Thirty juz, sixty hizb and 240 quarters. A juz is 2 hizb, a hizb is 4 quarters, a juz is 8 quarters. And the Quran has fifteen places of prostration.');
export function genFact(r, avoid = new Set()) {
  const f = pick(FACTS.filter((x) => !avoid.has(x.id)), r) || pick(FACTS, r);
  return { type: 'choice', lesson: 'mushaf_juz_hizb', kind: 'fact:' + f.id, stem: f.stem, media: null, layout: 'num', options: shuffle(f.set, r).map((n) => ({ id: String(n), label: T(String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]), String(n)) })), answer: String(f.ans), explain: FACT_EXPLAIN };
}
export function genSajdaCount(r) {
  return { type: 'choice', lesson: 'mushaf_sajda', kind: 'count', stem: T('كم سجدة في المصحف؟', 'How many places of prostration are in the mushaf?'), media: null, layout: 'num',
    options: shuffle([10, 14, 15, 20], r).map((n) => ({ id: String(n), label: T(String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]), String(n)) })), answer: '15', explain: FACT_EXPLAIN };
}
export function genLantern(r) {
  const qs = Object.values(POOL).map((v) => v.q).filter(Boolean);
  const kinds = {}; for (const q of qs) { const k = quarterMarker(q).kind; (kinds[k] ||= []).push(q); }
  const kind = pick(Object.keys(kinds), r); const q = pick(kinds[kind], r);
  const opts = shuffle([kind, ...shuffle(MARKER_KINDS.filter((k) => k !== kind), r).slice(0, 3)], r);
  return { type: 'choice', lesson: 'mushaf_juz_hizb', kind: 'lantern', stem: T('ماذا يدل\u0651 هذا الفانوس على هامش الصفحة؟', 'What does this lantern in the page margin show?'), media: { kind: 'lantern', q }, layout: 'text',
    options: opts.map((k) => ({ id: k, label: MARKER_NAMES[k] })), answer: kind, explain: MUSHAF.mushaf_juz_hizb.ex[0] };
}
export function genVerseJuz(r) {
  const all = Object.keys(POOL).filter((k) => POOL[k].w.length <= 9);
  const varied = all.filter((k) => POOL[k].j !== 30); const key = pick(r() < 0.7 && varied.length ? varied : all, r); const j = POOL[key].j;
  const set = new Set([j]); while (set.size < 4) set.add(Math.max(1, Math.min(30, j + Math.floor(r() * 9) - 4)));
  return { type: 'choice', lesson: 'mushaf_juz_hizb', kind: 'verse_juz', stem: T('في أي جزء تقع هذه الآية؟', 'In which juz does this ayah fall?'), media: { kind: 'verse', key }, layout: 'num',
    options: shuffle([...set], r).map((n) => ({ id: String(n), label: T(String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]), String(n)) })), answer: String(j),
    explain: T(`هذه الآية في الجزء ${j} (صفحة ${POOL[key].p}). اسم الجزء مكتوب في أعلى الصفحة على اليمين.`, `This ayah is in juz ${j} (page ${POOL[key].p}). The juz name is written at the top of the page on the right.`) };
}
export function genSajdaHas(r, { maxWords = 14 } = {}) {
  const yes = r() < 0.5;
  const keys = Object.keys(POOL).filter((k) => !!POOL[k].sj === yes && POOL[k].w.length <= maxWords && (yes || POOL[k].w.length >= 3));
  const key = pick(keys, r);
  return { type: 'choice', lesson: 'mushaf_sajda', kind: 'has', stem: T('هل في هذه الآية سجدة؟', 'Does this ayah contain a sajdah?'), media: { kind: 'verse', key }, layout: 'yn',
    options: [{ id: 'yes', label: T('نعم', 'Yes') }, { id: 'no', label: T('لا', 'No') }], answer: yes ? 'yes' : 'no',
    explain: yes ? MUSHAF.mushaf_sajda.ex[0] : MUSHAF.mushaf_sajda.ex[1] };
}

// ───────── بناء المستويات ─────────
function fillUntil(list, n, make) { const out = list.filter(Boolean); let g = 0; while (out.length < n && g++ < 20) { const q = make(); if (q) out.push(q); } return out.slice(0, n); }

export function buildMushafLevel(id, level, seed = Date.now()) {
  const r = rng(seed); const L = MUSHAF[id].lesson; const qs = [];
  const sign = () => genSignTap(id, r, { exclude: level === 3 ? lessonKeysOf(id) : new Set(), maxWords: level === 3 ? 11 : level === 1 ? 6 : 8 });
  const name = () => genSignName(id, r), mean = () => genSignMeaning(id, r), rev = () => genSignReverse(id, r);
  if (L === 'ayah_number') {
    const used = new Set(); const bank = () => { const q = genBank(id, r, used); used.add(q.kind.split(':')[1]); return q; };
    const plan = level === 1 ? [() => genAyahNum(r), bank, () => genAyahNum(r), bank, bank] : level === 2 ? [bank, () => genAyahNum(r), bank, () => genAyahNum(r), bank] : [() => genAyahNum(r, { maxWords: 8 }), () => genAyahNum(r, { maxWords: 8 }), bank, () => genAyahNum(r, { maxWords: 8 }), bank];
    plan.forEach((f) => qs.push(f()));
  } else if (L === 'juz_hizb') {
    const used = new Set(); const fact = () => { const q = genFact(r, used); used.add(q.kind.split(':')[1]); return q; };
    const plan = level === 1 ? [fact, fact, () => genLantern(r), fact, () => genLantern(r)] : level === 2 ? [() => genLantern(r), () => genVerseJuz(r), fact, () => genLantern(r), () => genVerseJuz(r)] : [() => genVerseJuz(r), () => genLantern(r), () => genVerseJuz(r), () => genLantern(r), fact];
    plan.forEach((f) => qs.push(f()));
  } else if (L === 'sajda') {
    const used = new Set(); const bank = () => { const q = genBank(id, r, used); used.add(q.kind.split(':')[1]); return q; };
    const plan = level === 1 ? [bank, () => genSajdaHas(r), bank, () => genSajdaCount(r), () => genSajdaHas(r)] : level === 2 ? [() => genSajdaHas(r), bank, () => genSajdaHas(r), () => genSajdaCount(r), () => genSajdaHas(r)] : [() => genSajdaHas(r, { maxWords: 20 }), () => genSajdaHas(r, { maxWords: 20 }), bank, () => genSajdaHas(r, { maxWords: 20 }), () => genSajdaHas(r, { maxWords: 20 })];
    plan.forEach((f) => qs.push(f()));
  } else {
    const plan = level === 1 ? [name, mean, sign, name, sign] : level === 2 ? [rev, name, sign, mean, rev] : [sign, sign, name, rev, sign];
    plan.forEach((f) => qs.push(f()));
    const out = fillUntil(qs, 5, () => [name, mean, rev][Math.floor(r() * 3)]()); return out;
  }
  return qs;
}
function lessonKeysOf(id) { const s = new Set(); for (const sid of MUSHAF[id].signs) signExamples(sid, 3).forEach((e) => s.add(e.key)); return s; }

export function buildMushafStage(seed = Date.now()) {
  const r = rng(seed); const ids = Object.keys(MUSHAF); const out = [];
  for (const id of ids) { const qs = buildMushafLevel(id, 2, Math.floor(r() * 1e9)); out.push(pick(qs, r)); }
  return shuffle(out, r).slice(0, 8);
}
export function mushafMixedQuestion(id, r) { return pick(buildMushafLevel(id, 2, Math.floor(r() * 1e9)), r); }

// ───────── فحص الإجابات ─────────
export function checkChoice(q, chosen) { return { ok: chosen === q.answer, explain: q.explain }; }
export function checkSignTap(q, target) {
  // target: {w:index} أو {m:'i:k'}
  const ok = target.w !== undefined ? q.accept.words.includes(target.w) : q.accept.marks.includes(target.m);
  return { ok, explain: q.explain };
}
export function checkAyahNum(q, k) { return { ok: k === q.target, explain: q.explain, previous: k === q.keys[0] }; }

export { SURAHS, ayahOf, MUSHAF_FACTS };
