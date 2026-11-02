// js/know-engine.js — أسئلة «دروس المعرفة» (data/know.js): خالص بلا DOM، قابل للاختبار بـ Node.
// كل سؤال من نوع «choice» (نفس عارض قسم المصحف في js/play.js). الإجابة الصحيحة تُحسب بقاعدة ثابتة، لا بتقدير:
// مخرج الحرف من قائمة المخارج، وعضوية الحرف في مجموعة الصفات، وطريقة الوقف من رسم آخر كلمة في الآية (data/pool.js).
import { KNOW, AREAS, AREA_IDS, SIFAT, BANKS, STOP_KIND } from '../data/know.js';
import { POOL, SURAHS } from '../data/pool.js';
import { rng, shuffle } from './engine.js';
import { clusters, hasVowel } from './arabic.js';
import { genVerseJuz, genPageSurah, genAyahNum, genBannerName } from './mushaf-engine.js';

const T = (ar, en) => ({ ar, en });
const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
const AR = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
const letterOpt = (l) => ({ id: l, label: T(l, l), glyph: true });

export const isKnow = (id) => !!KNOW[id];

// ───────── بنك الأسئلة المكتوبة ─────────
export function genKnowBank(id, r, used = new Set()) {
  const items = BANKS[id].filter((b) => !used.has(b.id)); const b = pick(items.length ? items : BANKS[id], r);
  return { type: 'choice', lesson: id, kind: 'bank:' + b.id, stem: b.stem, media: null, layout: b.layout || 'text',
    options: shuffle(b.options.map((o, i) => ({ id: String(i), label: o })), r), answer: '0', explain: b.explain };
}

// ───────── سور القرآن وترتيبها (جزء عمّ والفاتحة) ─────────
const ORDER_SURAHS = Object.keys(SURAHS).map(Number).filter((s) => s === 1 || s >= 78);
const surahLabel = (s) => T(SURAHS[s].ar, SURAHS[s].en);
export function genSurahBefore(r) {
  const [a, b] = shuffle(ORDER_SURAHS, r).slice(0, 2); const first = Math.min(a, b);
  return { type: 'choice', lesson: 'mushaf_surahs', kind: 'before', stem: T('أيّ السورتين تأتي أولًا في المصحف؟', 'Which of the two surahs comes first in the mushaf?'), media: null, layout: 'text',
    options: shuffle([a, b], r).map((s) => ({ id: String(s), label: surahLabel(s) })), answer: String(first),
    explain: T(`سورة ${SURAHS[first].ar} رقمها ${AR(first)}، فهي قبل سورة ${SURAHS[Math.max(a, b)].ar} (رقمها ${AR(Math.max(a, b))}).`, `Surah ${SURAHS[first].en} is number ${first}, so it comes before Surah ${SURAHS[Math.max(a, b)].en} (number ${Math.max(a, b)}).`) };
}
export function genSurahNext(r) {
  const s = pick(ORDER_SURAHS.filter((x) => x >= 78 && x < 114), r); const ans = s + 1;
  const others = shuffle(ORDER_SURAHS.filter((x) => x !== ans && x !== s && x >= 78), r).slice(0, 3);
  return { type: 'choice', lesson: 'mushaf_surahs', kind: 'next', stem: T(`ما السورة التي تأتي بعد سورة ${SURAHS[s].ar}؟`, `Which surah comes after Surah ${SURAHS[s].en}?`), media: null, layout: 'text',
    options: shuffle([ans, ...others], r).map((x) => ({ id: String(x), label: surahLabel(x) })), answer: String(ans),
    explain: T(`بعد سورة ${SURAHS[s].ar} (${AR(s)}) تأتي سورة ${SURAHS[ans].ar} (${AR(ans)}).`, `After Surah ${SURAHS[s].en} (${s}) comes Surah ${SURAHS[ans].en} (${ans}).`) };
}

// ───────── مخارج الحروف ─────────
const AMBIG = new Set(['ا', 'و', 'ي']);   // الواو والياء والألف: مخرجها بحسب كونها مدًّا — لا يُسأل عنها منفردة
export function areaOf(letter) { for (const a of ['halq', 'lisan', 'shafatan']) if (AREAS[a].letters.includes(letter)) return a; return null; }
export function genLetterArea(r) {
  const area = pick(['halq', 'lisan', 'shafatan'], r); const l = pick(AREAS[area].letters.filter((x) => !AMBIG.has(x)), r);
  return { type: 'choice', lesson: 'know_makharij', kind: 'area', stem: T(`من أين يخرج حرف «${l}»؟`, `Where does the letter «${l}» come from?`), media: { kind: 'glyph', glyph: l }, layout: 'text',
    options: shuffle(['halq', 'lisan', 'shafatan', 'jawf'], r).map((a) => ({ id: a, label: AREAS[a].name })), answer: area,
    explain: T(`حرف «${l}» يخرج من ${AREAS[area].name.ar}. ${AREAS[area].kid.ar}`, `«${l}» comes from ${AREAS[area].name.en}. ${AREAS[area].kid.en}`) };
}
export function genAreaLetter(r) {
  const area = pick(['halq', 'lisan', 'shafatan'], r); const right = pick(AREAS[area].letters.filter((x) => !AMBIG.has(x)), r);
  const others = shuffle(['halq', 'lisan', 'shafatan'].filter((a) => a !== area).flatMap((a) => AREAS[a].letters).filter((x) => !AMBIG.has(x)), r).slice(0, 3);
  return { type: 'choice', lesson: 'know_makharij', kind: 'letter', stem: T(`أيّ هذه الحروف يخرج من ${AREAS[area].name.ar}؟`, `Which of these letters comes from ${AREAS[area].name.en}?`), media: null, layout: 'num',
    options: shuffle([right, ...others], r).map(letterOpt), answer: right, explain: T(`${AREAS[area].kid.ar}`, `${AREAS[area].kid.en}`) };
}

// ───────── الصفات ─────────
export function genSifaYesNo(r) {
  const g = pick(Object.keys(SIFAT), r); const inG = r() < 0.5;
  const all = ['ء', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه'];
  const l = pick(inG ? SIFAT[g].letters : all.filter((x) => !SIFAT[g].letters.includes(x)), r);
  return { type: 'choice', lesson: 'know_sifat', kind: 'yn:' + g, stem: T(`هل حرف «${l}» من حروف «${SIFAT[g].mn}»؟`, `Is «${l}» one of the letters «${SIFAT[g].mn}»?`), media: { kind: 'glyph', glyph: l }, layout: 'yn',
    options: [{ id: 'yes', label: T('نعم', 'Yes') }, { id: 'no', label: T('لا', 'No') }], answer: inG ? 'yes' : 'no',
    explain: T(`حروف ${SIFAT[g].name.ar}: «${SIFAT[g].mn}». ${SIFAT[g].kid.ar}`, `The ${SIFAT[g].name.en} letters: «${SIFAT[g].mn}». ${SIFAT[g].kid.en}`) };
}
export function genSifaWhich(r) {
  const g = pick(Object.keys(SIFAT), r); const right = pick(SIFAT[g].letters, r);
  const outside = ['ء', 'ب', 'ج', 'د', 'ذ', 'ر', 'ز', 'ع', 'ل', 'م', 'ن', 'ض', 'غ', 'ظ', 'ث', 'ف', 'ك'].filter((x) => !SIFAT[g].letters.includes(x));
  return { type: 'choice', lesson: 'know_sifat', kind: 'which:' + g, stem: T(`أيّ هذه الحروف من حروف ${SIFAT[g].name.ar} «${SIFAT[g].mn}»؟`, `Which of these is a ${SIFAT[g].name.en} letter «${SIFAT[g].mn}»?`), media: null, layout: 'num',
    options: shuffle([right, ...shuffle(outside, r).slice(0, 3)], r).map(letterOpt), answer: right, explain: T(SIFAT[g].kid.ar, SIFAT[g].kid.en) };
}

// ───────── الوقف على آخر الكلمة: من رسم آخر كلمة في الآية ─────────
const FATHATAN = ['ً', 'ࣰ'];
export function stopKind(word) {
  const cs = clusters(word); const last = cs[cs.length - 1], prev = cs[cs.length - 2]; if (!last) return null;
  if (last.base === 'ة') return 'ha';
  if (FATHATAN.some((m) => last.marks.has(m))) return 'alif';
  if (last.base === 'ا' && last.marks.size === 0 && prev && FATHATAN.some((m) => prev.marks.has(m))) return prev.base === 'ة' ? 'ha' : 'alif';
  if (hasVowel(last)) return 'sukun';
  if (['ا', 'ى', 'ی', 'و', 'ي'].includes(last.base) && !hasVowel(last)) return 'asis';
  return null;
}
let STOPS = null;
export function stopCandidates() {
  if (STOPS) return STOPS; STOPS = { sukun: [], alif: [], ha: [], asis: [] };
  for (const [k, v] of Object.entries(POOL)) { const w = v.w[v.w.length - 1]; const s = stopKind(w); if (s) STOPS[s].push(k); }
  return STOPS;
}
export function genStopWord(r) {
  const c = stopCandidates(); const kind = pick(Object.keys(c).filter((x) => c[x].length), r); const key = pick(c[kind], r);
  const word = POOL[key].w[POOL[key].w.length - 1]; const [s, a] = key.split(':').map(Number);
  return { type: 'choice', lesson: 'know_waqf', kind: 'stop:' + kind, stem: T('هذه آخر كلمة في آية. كيف نقف عليها؟', 'This is the last word of an ayah. How do we stop on it?'), media: { kind: 'glyph', glyph: word }, layout: 'text',
    options: shuffle(Object.keys(STOP_KIND), r).map((x) => ({ id: x, label: STOP_KIND[x].label })), answer: kind,
    explain: T(`${STOP_KIND[kind].explain.ar} (سورة ${SURAHS[s].ar}، الآية ${AR(a)})`, `${STOP_KIND[kind].explain.en} (Surah ${SURAHS[s].en}, ayah ${a})`) };
}

// ───────── بناء المستويات ─────────
export function buildKnowLevel(id, level, seed = Date.now()) {
  const r = rng(seed); const used = new Set();
  const bank = () => { const q = genKnowBank(id, r, used); used.add(q.kind.split(':')[1]); return q; };
  const P = {
    mushaf_adab: [bank, bank, bank, bank, bank],
    mushaf_surahs: level === 1 ? [bank, () => genSurahBefore(r), bank, () => genBannerName(r), () => genSurahNext(r)] : [() => genSurahBefore(r), () => genSurahNext(r), bank, () => genSurahNext(r), () => genSurahBefore(r)],
    mushaf_find: level === 1 ? [bank, () => genAyahNum(r), bank, () => genPageSurah(r), bank] : [() => genVerseJuz(r), () => genAyahNum(r, level === 3 ? { maxWords: 8 } : {}), bank, () => genPageSurah(r), () => genVerseJuz(r)],
    know_makharij: level === 1 ? [bank, () => genLetterArea(r), bank, () => genAreaLetter(r), () => genLetterArea(r)] : [() => genLetterArea(r), () => genAreaLetter(r), bank, () => genLetterArea(r), () => genAreaLetter(r)],
    know_sifat: level === 1 ? [bank, () => genSifaYesNo(r), () => genSifaWhich(r), bank, () => genSifaYesNo(r)] : [() => genSifaWhich(r), () => genSifaYesNo(r), bank, () => genSifaWhich(r), () => genSifaYesNo(r)],
    know_waqf: level === 1 ? [bank, () => genStopWord(r), () => genStopWord(r), bank, () => genStopWord(r)] : [() => genStopWord(r), () => genStopWord(r), bank, () => genStopWord(r), () => genStopWord(r)]
  }[id];
  return P.map((f) => f()).filter(Boolean);
}
export function knowQuestion(id, r) { return pick(buildKnowLevel(id, 2, Math.floor(r() * 1e9)), r); }
export { KNOW, AREAS, AREA_IDS, SIFAT };
export const STOP_LABEL = Object.fromEntries(Object.entries(STOP_KIND).map(([k, v]) => [k, v.label]));
