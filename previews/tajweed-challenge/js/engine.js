// js/engine.js — محرك الأسئلة (منطق خالص بلا DOM، قابل للاختبار ب Node).
// يبني الأسئلة من بنك الآيات الموثق (data/pool.js) ومن محتوى الأحكام (data/rules.js). لا يكتب نص قرآني في هذا الملف.
import { POOL, SURAHS } from '../data/pool.js';
import { RULES, STAGES, CONFUSABLES, LETTER_NAMES, L_IZHAR, L_IDGHAM_G, L_IDGHAM_N, L_IKHFA, L_QALQALAH, L_QAMARI, L_SHAMSI, stageOf } from '../data/rules.js';
import { locate, wordClusters } from './quran.js';

export const LEVELS = [
  { id: 1, key: 'recognize', size: 5 },
  { id: 2, key: 'distinguish', size: 5 },
  { id: 3, key: 'apply', size: 5 }
];

// ───────── أدوات عشوائية حتمية ─────────
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const shuffle = (arr, r) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
const sample = (arr, n, r) => shuffle(arr, r).slice(0, n);

// ───────── الوصول إلى البنك ─────────
export function ayahOf(key) {
  const v = POOL[key]; if (!v) return null;
  const [s, a] = key.split(':').map(Number);
  return { key, surah: s, ayah: a, words: v.w, wq: v.wq, occ: v.o, page: v.p, juz: v.j, surahName: SURAHS[s] };
}
export const occsOf = (key, rule, minV = 2) => (POOL[key]?.o || []).filter(o => o[0] === rule && o[5] >= minV);
export const spanText = (key, w1, w2) => POOL[key].w.slice(w1, w2 + 1).join(' ');

const byRule = {};
export function candidates(rule) {
  if (byRule[rule]) return byRule[rule];
  const minV = rule === 'madd_tabii' ? 1 : 2;
  const out = [];
  for (const key of Object.keys(POOL)) { const os = occsOf(key, rule, minV); if (os.length) out.push({ key, occ: os }); }
  return (byRule[rule] = out);
}

export function lessonExamples(ruleId) {
  return RULES[ruleId].examples.map(([key, w1, w2, note]) => {
    const occ = occsOf(key, ruleId, ruleId === 'madd_tabii' ? 1 : 2).find(o => o[1] === w1 && o[2] === w2);
    return { key, w1, w2, note: note || null, occ, ayah: ayahOf(key) };
  });
}
const lessonKeys = (ruleId) => new Set(RULES[ruleId].examples.map(e => e[0]));

// القواعد الأخرى التي تقع «سببها» في نفس المقطع المميز (لنستبعدها من الخيارات الخاطئة)
function rulesCoveringCause(key, occ) {
  const words = POOL[key].w; const mine = locate(occ, words); const out = new Set();
  const cause = Object.entries(mine).flatMap(([w, m]) => Object.entries(m).filter(([, k]) => k === 'cause').map(([c]) => `${w}:${c}`));
  for (const o of POOL[key].o) {
    if (o[5] < 2) continue;
    const loc = locate(o, words);
    for (const [w, m] of Object.entries(loc)) for (const [c, k] of Object.entries(m)) if (k === 'cause' && cause.includes(`${w}:${c}`)) out.add(o[0]);
  }
  return out;
}

// ───────── توليد الأسئلة ─────────
function pickOccurrence(ruleId, r, { maxWords = 99, exclude = new Set(), preferShort = false } = {}) {
  let pool = candidates(ruleId).filter(c => POOL[c.key].w.length <= maxWords && !exclude.has(c.key));
  if (!pool.length) pool = candidates(ruleId).filter(c => POOL[c.key].w.length <= maxWords + 3);
  if (!pool.length) pool = candidates(ruleId);
  if (preferShort) pool = pool.slice().sort((a, b) => POOL[a.key].w.length - POOL[b.key].w.length).slice(0, Math.max(8, Math.ceil(pool.length / 2)));
  const c = pick(pool, r);
  return { key: c.key, occ: pick(c.occ, r), all: c.occ };
}

export function distractors(ruleId, n, r, { sameFamily = false, avoid = new Set() } = {}) {
  const fam = stageOf(ruleId).id;
  let list = (CONFUSABLES[ruleId] || []).filter(x => !avoid.has(x));
  if (sameFamily) { const f = list.filter(x => stageOf(x).id === fam || fam === 'noon' || fam === 'meem'); if (f.length >= n) list = f; }
  let out = sample(list, n, r);
  if (out.length < n) {
    const rest = Object.keys(RULES).filter(x => x !== ruleId && !out.includes(x) && !avoid.has(x));
    out = out.concat(sample(rest, n - out.length, r));
  }
  return out;
}

export function genIdentify(ruleId, r, { nOptions = 3, sameFamily = false, maxWords = 8, exclude } = {}) {
  const { key, occ } = pickOccurrence(ruleId, r, { maxWords, exclude });
  const bad = rulesCoveringCause(key, occ); bad.delete(ruleId);
  const opts = shuffle([ruleId, ...distractors(ruleId, nOptions - 1, r, { sameFamily, avoid: bad })], r);
  return { type: 'identify', ruleId, key, occ, options: opts, answer: ruleId, hl: locate(occ, POOL[key].w) };
}

export function genSpot(ruleId, r, { maxWords = 8, exclude, audio = false } = {}) {
  // نريد آية فيها موضع أو موضعان، وكلمتان خاطئتان على الأقل (وإلا لا يوجد ما يميز عنه)
  const spare = (c) => { const acc = new Set(); for (const o of c.all) for (let i = o[1]; i <= o[2]; i++) acc.add(i); return POOL[c.key].w.length - acc.size; };
  let tries = 0, chosen;
  do { chosen = pickOccurrence(ruleId, r, { maxWords, exclude }); tries++; } while ((chosen.all.length > 2 || spare(chosen) < 2) && tries < 60);
  if (spare(chosen) < 2) { const alt = candidates(ruleId).map((c) => ({ key: c.key, occ: c.occ[0], all: c.occ })).filter((c) => spare(c) >= 2 && POOL[c.key].w.length <= maxWords + 3); if (alt.length) chosen = pick(alt, r); }
  const { key, all } = chosen; const words = POOL[key].w;
  const accept = new Set(); for (const o of all) for (let i = o[1]; i <= o[2]; i++) accept.add(i);
  const trig = {}; for (const o of all) trig[`${o[1]}-${o[2]}`] = o;
  return { type: 'spot', ruleId, key, accept: [...accept].sort((a, b) => a - b), occs: all, hl: Object.assign({}, ...all.map(o => locate(o, words))), audio };
}

const TAP_RULES = new Set(['qalqalah', 'ghunna', 'madd_tabii']);
export function genTapLetter(ruleId, r, { exclude } = {}) {
  const minV = ruleId === 'madd_tabii' ? 1 : 2;
  let pool = candidates(ruleId).filter(c => !exclude || !exclude.has(c.key));
  if (!pool.length) pool = candidates(ruleId);
  const c = pick(pool, r); const o = pick(c.occ, r);
  const words = POOL[c.key].w; const wi = o[1];
  const accept = occsOf(c.key, ruleId, minV).filter(x => x[1] === wi).map(x => x[4]);
  return { type: 'tapletter', ruleId, key: c.key, wordIdx: wi, word: words[wi], accept: [...new Set(accept)], hl: locate(o, words) };
}

// عناصر الفرز: كل عنصر موضع حكم (عبارة: كلمة أو كلمتان)
export function genSort(ruleIds, r, { perRule = 2, exclude = new Set(), maxWords = 12 } = {}) {
  const items = [];
  for (const rid of ruleIds) {
    let pool = candidates(rid).filter(c => POOL[c.key].w.length <= maxWords && !exclude.has(c.key));
    pool = shuffle(pool, r);
    let n = 0;
    for (const c of pool) {
      if (n >= perRule) break;
      if (items.some(it => it.key === c.key)) continue;
      const occ = pick(c.occ, r);
      const bad = rulesCoveringCause(c.key, occ);
      if (ruleIds.some(x => x !== rid && bad.has(x))) continue;
      items.push({ key: c.key, occ, rule: rid, text: spanText(c.key, occ[1], occ[2]), hl: locate(occ, POOL[c.key].w) });
      n++;
    }
  }
  return { type: 'sort', ruleIds: ruleIds.slice(), items: shuffle(items, r) };
}

// ───────── لعبة الحرف ← الحكم ─────────
const NOON_MAP = () => ({ noon_izhar: L_IZHAR, noon_idgham_ghunna: L_IDGHAM_G, noon_idgham_no_ghunna: L_IDGHAM_N, noon_iqlab: ['ب'], noon_ikhfa: L_IKHFA });
const MEEM_ALL = ['ء', 'ا', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'ن', 'ه', 'و', 'ي'];
export const letterFamilyOf = (ruleId) => {
  if (ruleId.startsWith('noon_')) return 'noon';
  if (ruleId.startsWith('meem_')) return 'meem';
  if (ruleId.startsWith('lam_')) return 'lam';
  if (ruleId === 'qalqalah') return 'qalqalah';
  return null;
};
export function ruleForLetter(family, letter) {
  if (family === 'noon') { for (const [rid, ls] of Object.entries(NOON_MAP())) if (ls.includes(letter)) return rid; return null; }
  if (family === 'meem') return letter === 'ب' ? 'meem_ikhfa' : letter === 'م' ? 'meem_idgham' : MEEM_ALL.includes(letter) ? 'meem_izhar' : null;
  if (family === 'lam') return L_QAMARI.includes(letter) ? 'lam_qamari' : L_SHAMSI.includes(letter) ? 'lam_shamsi' : null;
  if (family === 'qalqalah') return L_QALQALAH.includes(letter) ? 'yes' : 'no';
  return null;
}
export function genLetters(ruleId, r) {
  const family = letterFamilyOf(ruleId); if (!family) return null;
  let letter, options;
  if (family === 'noon') {
    const mine = NOON_MAP()[ruleId]; letter = pick(mine, r);
    options = shuffle(Object.keys(NOON_MAP()), r);
  } else if (family === 'meem') {
    const pool = ruleId === 'meem_ikhfa' ? ['ب'] : ruleId === 'meem_idgham' ? ['م'] : MEEM_ALL.filter(x => x !== 'ب' && x !== 'م');
    letter = pick(pool, r); options = shuffle(['meem_ikhfa', 'meem_idgham', 'meem_izhar'], r);
  } else if (family === 'lam') {
    const pool = ruleId === 'lam_qamari' ? L_QAMARI : L_SHAMSI; letter = pick(pool, r); options = shuffle(['lam_qamari', 'lam_shamsi'], r);
  } else {
    const yes = r() < 0.55;
    letter = pick(yes ? L_QALQALAH : ['ك', 'ل', 'م', 'ن', 'ر', 'س', 'ت', 'ف', 'ع', 'ه', 'و', 'ي', 'ص', 'ز', 'خ', 'ح', 'غ', 'ش', 'ظ', 'ث', 'ض', 'ذ', 'ء', 'ا'], r);
    options = ['yes', 'no'];
  }
  return { type: 'letters', ruleId, family, letter, options, answer: ruleForLetter(family, letter) };
}

// ───────── بناء المستويات ─────────
export function buildLevel(ruleId, level, seed = Date.now()) {
  const r = rng(seed); const rule = RULES[ruleId]; const qs = [];
  const fam = letterFamilyOf(ruleId); const lk = lessonKeys(ruleId);
  const canSpot = ruleId !== 'madd_tabii';
  const canTap = TAP_RULES.has(ruleId);
  const siblings = stageOf(ruleId).rules;
  const sortSet = (() => { const c = (CONFUSABLES[ruleId] || []).filter(x => stageOf(x).id === stageOf(ruleId).id); const others = c.length ? c : (CONFUSABLES[ruleId] || []); return [ruleId, others[0] || distractors(ruleId, 1, r)[0]]; })();
  const add = (q) => qs.push(q);

  if (level === 1) {
    add(genIdentify(ruleId, r, { nOptions: 3, maxWords: 6 }));
    add(canSpot ? genSpot(ruleId, r, { maxWords: 6 }) : genTapLetter(ruleId, r));
    add(genIdentify(ruleId, r, { nOptions: 3, maxWords: 6 }));
    add(fam ? genLetters(ruleId, r) : (canTap ? genTapLetter(ruleId, r) : genIdentify(ruleId, r, { nOptions: 3, maxWords: 6 })));
    add(canSpot ? genSpot(ruleId, r, { maxWords: 7 }) : genIdentify(ruleId, r, { nOptions: 3, maxWords: 6 }));
  } else if (level === 2) {
    add(genIdentify(ruleId, r, { nOptions: 4, sameFamily: true, maxWords: 8 }));
    add(genSort(sortSet, r, { perRule: 3, exclude: new Set() }));
    add(fam ? genLetters(ruleId, r) : genIdentify(ruleId, r, { nOptions: 4, sameFamily: true, maxWords: 8 }));
    add(genIdentify(ruleId, r, { nOptions: 4, sameFamily: true, maxWords: 8 }));
    add(canTap ? genTapLetter(ruleId, r) : (canSpot ? genSpot(ruleId, r, { maxWords: 8 }) : genIdentify(ruleId, r, { nOptions: 4, sameFamily: true })));
  } else {
    add(canSpot ? genSpot(ruleId, r, { maxWords: 11, exclude: lk, audio: true }) : genTapLetter(ruleId, r, { exclude: lk }));
    add(genIdentify(ruleId, r, { nOptions: 4, sameFamily: true, maxWords: 11, exclude: lk }));
    add(canSpot ? genSpot(ruleId, r, { maxWords: 11, exclude: lk, audio: true }) : genIdentify(ruleId, r, { nOptions: 4, sameFamily: true, maxWords: 11, exclude: lk }));
    add(genSort(sortSet, r, { perRule: 3, exclude: lk, maxWords: 14 }));
    add(canTap ? genTapLetter(ruleId, r, { exclude: lk }) : genIdentify(ruleId, r, { nOptions: 4, sameFamily: true, maxWords: 11, exclude: lk }));
  }
  void siblings; void rule;
  return qs.filter(Boolean);
}

export function buildStageChallenge(stageId, seed = Date.now()) {
  const r = rng(seed); const st = STAGES.find(s => s.id === stageId); const qs = [];
  for (const rid of st.rules) {
    qs.push(genIdentify(rid, r, { nOptions: 4, sameFamily: true, maxWords: 9 }));
    qs.push(rid !== 'madd_tabii' ? genSpot(rid, r, { maxWords: 9 }) : genTapLetter(rid, r));
  }
  const sortSet = st.rules.length >= 2 ? shuffle(st.rules, r).slice(0, Math.min(3, st.rules.length)) : [st.rules[0]];
  if (sortSet.length >= 2) qs.push(genSort(sortSet, r, { perRule: 2 }));
  return shuffle(qs, r).slice(0, 8);
}

export function buildMixed(ruleIds, n, seed = Date.now()) {
  const r = rng(seed); const qs = [];
  for (let i = 0; i < n; i++) {
    const rid = ruleIds[i % ruleIds.length]; const t = r();
    if (t < 0.5) qs.push(genIdentify(rid, r, { nOptions: 4, sameFamily: true, maxWords: 9 }));
    else if (rid !== 'madd_tabii') qs.push(genSpot(rid, r, { maxWords: 9 }));
    else qs.push(genTapLetter(rid, r));
  }
  return shuffle(qs, r);
}

// ───────── فحص الإجابات والتغذية الراجعة ─────────
const fill = (tpl, vars) => ({ ar: tpl.ar.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? ''), en: tpl.en.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '') });
export const whyOf = (ruleId, trigger) => fill(RULES[ruleId].why, { t: trigger });
const triggerOf = (q) => (q.occ ? q.occ[3] : null);

export function checkIdentify(q, chosen) {
  const ok = chosen === q.answer;
  const target = RULES[q.answer];
  if (ok) return { ok, kind: 'good', text: whyOf(q.answer, triggerOf(q)) };
  const wrong = RULES[chosen];
  return {
    ok, kind: 'wrong',
    needs: { chosen: wrong.name, req: wrong.needs },
    text: whyOf(q.answer, triggerOf(q)),
    wrongName: wrong.name, wrongNeeds: wrong.needs, rightName: target.name
  };
}

export function checkSpot(q, wordIdx) {
  const ok = q.accept.includes(wordIdx);
  const o = q.occs.find(x => wordIdx >= x[1] && wordIdx <= x[2]);
  return { ok, text: ok ? whyOf(q.ruleId, o ? o[3] : q.occs[0][3]) : RULES[q.ruleId].find, word: POOL[q.key].w[wordIdx] };
}

export function checkTap(q, ci) {
  const ok = q.accept.includes(ci);
  const c = wordClusters(q.word)[ci];
  let hint = RULES[q.ruleId].find;
  if (!ok && c) {
    if (q.ruleId === 'qalqalah') {
      if (L_QALQALAH.includes(c.base)) hint = { ar: 'هذا الحرف من «قطب جد» لكنه ليس ساكن\u064Bا هنا، فلا قلقلة عليه.', en: 'This is a “qutb jad” letter but it is not sakin here, so it has no qalqalah.' };
      else hint = { ar: 'هذا الحرف ليس من «قطب جد» (ق ط ب ج د).', en: 'This letter is not one of “qutb jad” (ق ط ب ج د).' };
    } else if (q.ruleId === 'ghunna') {
      hint = { ar: 'ابحث عن النون أو الميم التي عليها شد\u0651ة (\u0651).', en: 'Look for the noon or meem that carries a shadda (\u0651).' };
    } else hint = { ar: 'ابحث عن الألف أو الواو أو الياء التي ت\u064Fمد\u0651 بلا همزة ولا سكون بعدها.', en: 'Look for the stretched alif, waw or yaa with no hamza or sukun after it.' };
  }
  const why = whyOf(q.ruleId, triggerForTap(q));
  return { ok, text: ok ? why : hint, why };
}
function triggerForTap(q) {
  const c = wordClusters(q.word)[q.accept[0]];
  return c ? ({ 'ي': 'ي', 'ی': 'ي' }[c.base] || c.base) : '';
}

export function checkSortPlacement(q, itemIdx, ruleId) {
  const it = q.items[itemIdx]; const ok = it.rule === ruleId;
  return { ok, text: whyOf(it.rule, it.occ[3]), rightName: RULES[it.rule].name, wrongName: RULES[ruleId].name, wrongNeeds: RULES[ruleId].needs };
}

export function checkLetters(q, chosen) {
  const ok = chosen === q.answer; const fam = q.family;
  let text;
  if (fam === 'qalqalah') text = q.answer === 'yes'
    ? { ar: `الحرف «${q.letter}» من «قطب جد»: ي\u064Fقلقل إذا كان ساكن\u064Bا.`, en: `The letter “${q.letter}” is one of “qutb jad”: it gets qalqalah when sakin.` }
    : { ar: `الحرف «${q.letter}» ليس من «قطب جد» (ق ط ب ج د).`, en: `The letter “${q.letter}” is not one of “qutb jad” (ق ط ب ج د).` };
  else {
    const rn = RULES[q.answer]; const list = rn.letters.list.length ? rn.letters.list.join(' ') : (fam === 'meem' ? 'باقي الحروف' : '');
    text = { ar: `الحرف «${q.letter}» من حروف ${rn.name.ar}${list ? ': ' + list : ''}.`, en: `The letter “${q.letter}” belongs to ${rn.name.en}${list ? ': ' + list : ''}.` };
    if (fam === 'meem' && q.answer === 'meem_izhar') text = { ar: `الحرف «${q.letter}» ليس باء\u064B ولا ميم\u064Bا، فالحكم الإظهار الشفوي.`, en: `The letter “${q.letter}” is neither baa nor meem, so the rule is izhar shafawi.` };
  }
  return { ok, text, answerId: q.answer };
}

export function stars(correct, total) { const miss = total - correct; return miss <= 0 ? 3 : miss === 1 ? 2 : miss === 2 ? 1 : 0; }
export { LETTER_NAMES };
