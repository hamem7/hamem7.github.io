// js/know-engine.js — أسئلة «دروس المعرفة» (data/know.js): خالص بلا DOM، قابل للاختبار بـ Node.
// كل سؤال من نوع «choice» (نفس عارض قسم المصحف في js/play.js). الإجابة الصحيحة تُحسب بقاعدة ثابتة، لا بتقدير:
// مخرج الحرف من قائمة المخارج، وعضوية الحرف في مجموعة الصفات، وطريقة الوقف من رسم آخر كلمة في الآية (data/pool.js).
import { KNOW, AREAS, AREA_IDS, SIFAT, BANKS, STOP_KIND, MAKHARIJ17, SIFA_PAIRS, SIFA_SINGLE } from '../data/know.js';
import { POOL, SURAHS } from '../data/pool.js';
import { rng, shuffle } from './engine.js';
import { clusters, hasVowel, hasSukun, hasShadda } from './arabic.js';
import { wordClusters } from './quran.js';
import { genVerseJuz, genPageSurah, genAyahNum, genBannerName } from './mushaf-engine.js';

const T = (ar, en) => ({ ar, en });
const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
const AR = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
// الهاء المفردة بخط المصحف تشبه الرقم ٥، فتُعرض «هـ» (المعرّف يبقى الحرف نفسه)
const disp = (l) => (l === 'ه' ? 'هـ' : l);
const glyphOf = (l) => ({ kind: 'glyph', glyph: disp(l), letter: l });
const letterOpt = (l) => ({ id: l, label: T(disp(l), disp(l)), glyph: true });

export const isKnow = (id) => !!KNOW[id];

// ───────── بنك الأسئلة المكتوبة ─────────
export function genKnowBank(id, r, used = new Set(), lvs = null) {
  const all = lvs ? BANKS[id].filter((b) => lvs.includes(b.lv || 1)) : BANKS[id];
  const items = all.filter((b) => !used.has(b.id)); const b = pick(items.length ? items : all, r);
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
  return { type: 'choice', lesson: 'know_makharij', kind: 'area', stem: T(`من أين يخرج حرف «${l}»؟`, `Where does the letter «${l}» come from?`), media: glyphOf(l), layout: 'text',
    options: shuffle(['halq', 'lisan', 'shafatan', 'jawf'], r).map((a) => ({ id: a, label: AREAS[a].name })), answer: area,
    explain: T(`حرف «${l}» يخرج من ${AREAS[area].name.ar}. ${AREAS[area].kid.ar}`, `«${l}» comes from ${AREAS[area].name.en}. ${AREAS[area].kid.en}`) };
}
export function genAreaLetter(r) {
  const area = pick(['halq', 'lisan', 'shafatan'], r); const right = pick(AREAS[area].letters.filter((x) => !AMBIG.has(x)), r);
  const others = shuffle(['halq', 'lisan', 'shafatan'].filter((a) => a !== area).flatMap((a) => AREAS[a].letters).filter((x) => !AMBIG.has(x)), r).slice(0, 3);
  return { type: 'choice', lesson: 'know_makharij', kind: 'letter', stem: T(`أيّ هذه الحروف يخرج من ${AREAS[area].name.ar}؟`, `Which of these letters comes from ${AREAS[area].name.en}?`), media: null, layout: 'num',
    options: shuffle([right, ...others], r).map(letterOpt), answer: right, explain: T(`${AREAS[area].kid.ar}`, `${AREAS[area].kid.en}`) };
}

// المستوى الثالث: بلا ذكر اسم المخرج — «أيّ حرف من مخرج «X» نفسه؟» و«أيّ الحروف ليس من مخرج البقية؟»
const AREA3 = ['halq', 'lisan', 'shafatan'];
const lettersOf = (a) => AREAS[a].letters.filter((x) => !AMBIG.has(x));
export function genSameArea(r) {
  const area = pick(AREA3, r); const [given, right] = shuffle(lettersOf(area), r);
  const others = shuffle(AREA3.filter((a) => a !== area).flatMap(lettersOf), r).slice(0, 3);
  return { type: 'choice', lesson: 'know_makharij', kind: 'same', stem: T(`أيّ هذه الحروف يخرج من مخرج حرف «${given}» نفسه؟`, `Which of these letters comes from the same place as «${given}»?`), media: glyphOf(given), layout: 'num',
    options: shuffle([right, ...others], r).map(letterOpt), answer: right,
    explain: T(`«${given}» و«${right}» يخرجان من ${AREAS[area].name.ar}. ${AREAS[area].kid.ar}`, `«${given}» and «${right}» both come from ${AREAS[area].name.en}. ${AREAS[area].kid.en}`) };
}
export function genAreaOdd(r) {
  const area = pick(AREA3, r); const three = shuffle(lettersOf(area), r).slice(0, 3); const oddArea = pick(AREA3.filter((a) => a !== area), r); const odd = pick(lettersOf(oddArea), r);
  return { type: 'choice', lesson: 'know_makharij', kind: 'odd', stem: T('ثلاثة من هذه الحروف من مخرج واحد. أيّها ليس معها؟', 'Three of these letters share one place of articulation. Which one does not?'), media: null, layout: 'num',
    options: shuffle([odd, ...three], r).map(letterOpt), answer: odd,
    explain: T(`«${three.join(' ')}» من ${AREAS[area].name.ar}، أما «${odd}» فمن ${AREAS[oddArea].name.ar}.`, `«${three.join(' ')}» come from ${AREAS[area].name.en}, but «${odd}» comes from ${AREAS[oddArea].name.en}.`) };
}

// ───────── الصفات ─────────
export function genSifaYesNo(r) {
  const g = pick(Object.keys(SIFAT), r); const inG = r() < 0.5;
  const all = ['ء', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه'];
  const l = pick(inG ? SIFAT[g].letters : all.filter((x) => !SIFAT[g].letters.includes(x)), r);
  return { type: 'choice', lesson: 'know_sifat', kind: 'yn:' + g, stem: T(`هل حرف «${l}» من حروف «${SIFAT[g].mn}»؟`, `Is «${l}» one of the letters «${SIFAT[g].mn}»?`), media: glyphOf(l), layout: 'yn',
    options: [{ id: 'yes', label: T('نعم', 'Yes') }, { id: 'no', label: T('لا', 'No') }], answer: inG ? 'yes' : 'no',
    explain: T(`حروف ${SIFAT[g].name.ar}: «${SIFAT[g].mn}». ${SIFAT[g].kid.ar}`, `The ${SIFAT[g].name.en} letters: «${SIFAT[g].mn}». ${SIFAT[g].kid.en}`) };
}
export function genSifaWhich(r) {
  const g = pick(Object.keys(SIFAT), r); const right = pick(SIFAT[g].letters, r);
  const outside = ['ء', 'ب', 'ج', 'د', 'ذ', 'ر', 'ز', 'ع', 'ل', 'م', 'ن', 'ض', 'غ', 'ظ', 'ث', 'ف', 'ك'].filter((x) => !SIFAT[g].letters.includes(x));
  return { type: 'choice', lesson: 'know_sifat', kind: 'which:' + g, stem: T(`أيّ هذه الحروف من حروف ${SIFAT[g].name.ar} «${SIFAT[g].mn}»؟`, `Which of these is a ${SIFAT[g].name.en} letter «${SIFAT[g].mn}»?`), media: null, layout: 'num',
    options: shuffle([right, ...shuffle(outside, r).slice(0, 3)], r).map(letterOpt), answer: right, explain: T(SIFAT[g].kid.ar, SIFAT[g].kid.en) };
}

// المستوى الثالث: حرف يجمع صفتين، وعدد صفات الحرف من المجموعات الثلاث
const BOTH = [['hams', 'istila'], ['istila', 'qalqalah']];
export function genSifaBoth(r) {
  const [a, b] = pick(BOTH, r); const A = SIFAT[a].letters, B = SIFAT[b].letters;
  const right = pick(A.filter((x) => B.includes(x)), r);
  const onlyOne = shuffle([...A, ...B].filter((x) => !(A.includes(x) && B.includes(x))), r).filter((x, i, arr) => arr.indexOf(x) === i).slice(0, 3);
  return { type: 'choice', lesson: 'know_sifat', kind: `both:${a}+${b}`, stem: T(`أيّ هذه الحروف يجمع ${SIFAT[a].name.ar} و${SIFAT[b].name.ar} معًا؟`, `Which of these letters has both ${SIFAT[a].name.en} and ${SIFAT[b].name.en}?`), media: null, layout: 'num',
    options: shuffle([right, ...onlyOne], r).map(letterOpt), answer: right,
    explain: T(`«${right}» من «${SIFAT[a].mn}» ومن «${SIFAT[b].mn}». أما البقية ففي مجموعة واحدة فقط.`, `«${right}» is in «${SIFAT[a].mn}» and in «${SIFAT[b].mn}»; the others are in only one of them.`) };
}
const ALL_L = ['ء', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه'];
export const sifaCount = (l) => Object.values(SIFAT).filter((g) => g.letters.includes(l)).length;
export function genSifaCount(r) {
  const want = pick([0, 1, 1, 2, 2], r); const l = pick(ALL_L.filter((x) => sifaCount(x) === want), r);
  const has = Object.values(SIFAT).filter((g) => g.letters.includes(l));
  return { type: 'choice', lesson: 'know_sifat', kind: 'count', stem: T(`في كم مجموعة من الثلاث («فحثه شخص سكت» و«خص ضغط قظ» و«قطب جد») يقع حرف «${l}»؟`, `In how many of the three groups («فحثه شخص سكت», «خص ضغط قظ», «قطب جد») is the letter «${l}»?`), media: glyphOf(l), layout: 'num',
    options: [0, 1, 2, 3].map((n) => ({ id: String(n), label: T(AR(n), String(n)) })), answer: String(want),
    explain: has.length ? T(`«${l}» في: ${has.map((g) => g.name.ar).join(' و')}.`, `«${l}» is in: ${has.map((g) => g.name.en).join(' and ')}.`) : T(`«${l}» ليس في أيّ من المجموعات الثلاث.`, `«${l}» is in none of the three groups.`) };
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

const DIAC = /[ً-ٰٟۖ-ࣰۭ-ࣲ]/g;
const skel = (w) => w.replace(DIAC, '');

// ───────── مدّ الصلة: من علامة المصحف نفسها في بنك الآيات ─────────
// ـهُۥ / ـهِۦ = صلة؛ ومعها علامة المد (ۤ) = صلة كبرى (بعدها همزة)؛ والكلمة في آخر الآية = لا صلة عند الوقف.
const SILAH_RE = /ه[ُِ][ۥۦ]/;
const hamzaStart = (w) => /^[ءأإآ]/.test(w);
const haCluster = (w) => { const cs = wordClusters(w); for (let i = cs.length - 1; i >= 0; i--) if (cs[i].base === 'ه') return i; return -1; };
// هاء من أصل الكلمة لا ضمير (إله، وجه، الله) — لا تُعرض مثالًا على «لا صلة»
const NOT_PRONOUN = ['إله', 'اله', 'وجه', 'لله'];
let SIL = null;
export function silahCandidates() {
  if (SIL) return SIL; SIL = { sughra: [], kubra: [], stop: [], none: [] };
  for (const [key, v] of Object.entries(POOL)) v.w.forEach((w, i) => {
    const last = i === v.w.length - 1; const hc = haCluster(w);
    if (SILAH_RE.test(w) && hc >= 0) {
      if (last) SIL.stop.push({ key, i, c: hc });
      else if (/[ۤٓ]/.test(w) && hamzaStart(v.w[i + 1])) SIL.kubra.push({ key, i, c: hc });
      else if (!/[ۤٓ]/.test(w) && !hamzaStart(v.w[i + 1])) SIL.sughra.push({ key, i, c: hc });
    } else if (!last && /ه[ُِ]$/.test(w) && v.w[i + 1].startsWith('ٱ') && hc > 0 && !NOT_PRONOUN.some((k) => skel(w).endsWith(k)) && !(wordClusters(w)[hc - 1].base === 'ل' && hasShadda(wordClusters(w)[hc - 1]))) SIL.none.push({ key, i, c: hc });
  });
  return SIL;
}
const SIL_LABEL = { sughra: T('صلة صغرى (حركتان)', 'Lesser silah (2 counts)'), kubra: T('صلة كبرى (٤ أو ٥ حركات)', 'Greater silah (4 or 5 counts)'), none: T('لا صلة (لا مدّ)', 'No silah (no madd)') };
const SIL_WHY = {
  sughra: T('بعد الهاء واو أو ياء صغيرة، ولم يأتِ بعدها همزة: صلة صغرى تُمدّ حركتين.', 'A small waw or yaa follows the haa and no hamza comes next: lesser silah, two counts.'),
  kubra: T('بعد الهاء واو أو ياء صغيرة عليها مدّة، وبعدها همزة: صلة كبرى تُمدّ أربعًا أو خمسًا.', 'A small waw or yaa with a madd sign follows the haa, then a hamza: greater silah, four or five counts.'),
  none: T('لم تُكتب بعد الهاء واو ولا ياء صغيرة لأن بعدها ساكنًا: لا صلة.', 'No small waw or yaa is written after the haa because a silent letter follows: no silah.')
};
const verseMedia = (key, i, c) => ({ kind: 'verse', key, hl: { [i]: { [c]: 'cause' } } });
export function genSilahKind(r, { withNone = false } = {}) {
  const c = silahCandidates(); const kinds = ['sughra', 'kubra', ...(withNone && c.none.length ? ['none'] : [])].filter((k) => c[k].length); const kind = pick(kinds, r); const x = pick(c[kind], r);
  return { type: 'choice', lesson: 'know_silah', kind: 'silah:' + kind, stem: T('ما حكم هاء الضمير المظلّلة إذا وصلنا القراءة؟', 'What is the ruling on the highlighted pronoun haa when reading on?'), media: verseMedia(x.key, x.i, x.c), layout: 'text',
    options: shuffle(['sughra', 'kubra', 'none'], r).map((k) => ({ id: k, label: SIL_LABEL[k] })), answer: kind, explain: SIL_WHY[kind] };
}
export function genSilahStop(r) {
  const c = silahCandidates(); const x = pick(c.stop, r);
  return { type: 'choice', lesson: 'know_silah', kind: 'silah_stop', stem: T('الهاء المظلّلة في آخر الآية. إذا وقفنا عليها، كيف ننطقها؟', 'The highlighted haa ends the ayah. If we stop on it, how do we say it?'), media: verseMedia(x.key, x.i, x.c), layout: 'text',
    options: shuffle([{ id: 'sukun', label: T('هاء ساكنة بلا مدّ', 'A silent haa, no madd') }, { id: 'two', label: T('نمدّها حركتين', 'Stretch it two counts') }, { id: 'four', label: T('نمدّها أربع حركات', 'Stretch it four counts') }], r), answer: 'sukun',
    explain: T('الصلة في الوصل فقط؛ عند الوقف تسكن الهاء ولا نمدّ.', 'Silah is only when reading on; when stopping the haa is silent with no madd.') };
}
export function genSilahCount(r) {
  const c = silahCandidates(); const kind = pick(['sughra', 'kubra'], r); const x = pick(c[kind], r);
  return { type: 'choice', lesson: 'know_silah', kind: 'silah_n:' + kind, stem: T('كم حركة نمدّ الصلة في الكلمة المظلّلة (في الوصل)؟', 'How many counts is the silah in the highlighted word (when reading on)?'), media: verseMedia(x.key, x.i, x.c), layout: 'text',
    options: shuffle([{ id: '2', label: T('حركتان', 'Two counts') }, { id: '45', label: T('أربع أو خمس حركات', 'Four or five counts') }, { id: '6', label: T('ست حركات', 'Six counts') }], r), answer: kind === 'kubra' ? '45' : '2', explain: SIL_WHY[kind] };
}

// ───────── البدء بهمزة الوصل: تصنيف بالقاعدة ─────────
const WASL_NOUNS = ['ٱسم', 'ٱبن', 'ٱمرئ', 'ٱمرؤ', 'ٱمرأ', 'ٱثن'];       // الأسماء التي همزتها همزة وصل: تُكسر
const WASL_TEMP = ['ٱمشوا', 'ٱقضوا', 'ٱبنوا', 'ٱئتوا'];                 // ضمّ الثالث عارض: تُكسر
const vowelOf = (c) => (c.marks.has('ُ') ? 'damma' : c.marks.has('ِ') ? 'kasra' : c.marks.has('َ') ? 'fatha' : null);
export function waslKind(w) {
  if (!w.startsWith('ٱ')) return null; const cs = wordClusters(w); const k = skel(w);
  if (k.startsWith('ٱل')) return cs[2] && cs[2].base === 'ت' && hasSukun(cs[1]) ? null : { v: 'fatha', why: 'al' };
  if (WASL_NOUNS.some((n) => k.startsWith(n))) return { v: 'kasra', why: 'noun' };
  if (WASL_TEMP.some((n) => k.startsWith(n))) return { v: 'kasra', why: 'temp' };
  if (!cs[1] || !cs[2]) return null; const third = hasShadda(cs[1]) ? vowelOf(cs[1]) : vowelOf(cs[2]); if (!third) return null;
  return third === 'damma' ? { v: 'damma', why: 'third_d' } : { v: 'kasra', why: 'third_fk' };
}
let WSL = null;
export function waslCandidates() {
  if (WSL) return WSL; WSL = { fatha: [], kasra: [], damma: [], mid: [] };
  for (const [key, v] of Object.entries(POOL)) v.w.forEach((w, i) => { const k = waslKind(w); if (!k) return; WSL[k.v].push({ key, i, why: k.why }); if (i > 0) WSL.mid.push({ key, i }); });
  return WSL;
}
const V_LABEL = { fatha: T('بالفتح (أَ)', 'With fatha (a)'), kasra: T('بالكسر (إِ)', 'With kasra (i)'), damma: T('بالضمّ (أُ)', 'With damma (u)') };
const WHY = {
  al: T('همزة «ال» تُفتح عند البدء.', 'The hamza of “al” takes fatha when starting.'),
  noun: T('اسم من الأسماء التي أولها همزة وصل: تُكسر عند البدء.', 'One of the nouns starting with hamzat al-wasl: it takes kasra.'),
  temp: T('ضمّ الحرف الثالث هنا عارض، فنبدأ بالكسر.', 'The third letter’s damma here is temporary, so we start with kasra.'),
  third_d: T('فعل ثالثه مضموم ضمًّا لازمًا: نبدأ بالضمّ.', 'A verb whose third letter has a permanent damma: start with damma.'),
  third_fk: T('ثالث الكلمة مفتوح أو مكسور: نبدأ بالكسر.', 'The third letter has fatha or kasra: start with kasra.')
};
export function genWaslVowel(r) {
  const c = waslCandidates(); const rv = r(); const v = c.damma.length && rv < 0.15 ? 'damma' : rv < 0.55 ? 'fatha' : 'kasra'; const x = pick(c[v], r); // أمثلة الضمّ قليلة في البنك فلا تتكرر
  return { type: 'choice', lesson: 'know_wasl', kind: 'wasl:' + v, stem: T('لو بدأت القراءة بالكلمة المظلّلة، بأيّ حركة تنطق همزة الوصل؟', 'If you start reading at the highlighted word, which vowel do you give hamzat al-wasl?'), media: verseMedia(x.key, x.i, 0), layout: 'text',
    options: shuffle(['fatha', 'kasra', 'damma'], r).map((k) => ({ id: k, label: V_LABEL[k] })), answer: v, explain: WHY[x.why] };
}
const WHY_OPT = { al: T('لأنها همزة «ال»', 'Because it is the hamza of “al”'), third_d: T('لأن ثالث الفعل مضموم', 'Because the third letter has damma'), third_fk: T('لأن ثالث الكلمة مفتوح أو مكسور', 'Because the third letter has fatha or kasra'), noun: T('لأنها من الأسماء التي تُكسر همزتها', 'Because it is one of the nouns whose hamza takes kasra') };
export function genWaslWhy(r) {
  const c = waslCandidates(); const all = [...c.fatha, ...c.kasra, ...c.damma].filter((x) => WHY_OPT[x.why]); const x = pick(all, r); const k = waslKind(POOL[x.key].w[x.i]);
  return { type: 'choice', lesson: 'know_wasl', kind: 'wasl_why:' + x.why, stem: T(`نبدأ همزة الوصل في الكلمة المظلّلة ${k.v === 'fatha' ? 'بالفتح' : k.v === 'damma' ? 'بالضمّ' : 'بالكسر'}. لماذا؟`, `We start hamzat al-wasl in the highlighted word ${k.v === 'fatha' ? 'with fatha' : k.v === 'damma' ? 'with damma' : 'with kasra'}. Why?`), media: verseMedia(x.key, x.i, 0), layout: 'text',
    options: shuffle(Object.keys(WHY_OPT), r).map((id) => ({ id, label: WHY_OPT[id] })), answer: x.why, explain: WHY[x.why] };
}
export function genWaslDrop(r) {
  const c = waslCandidates(); const x = pick(c.mid, r);
  return { type: 'choice', lesson: 'know_wasl', kind: 'wasl_drop', stem: T('نقرأ الآية متصلة. هل ننطق همزة الوصل في الكلمة المظلّلة؟', 'We read the ayah continuously. Do we pronounce hamzat al-wasl in the highlighted word?'), media: verseMedia(x.key, x.i, 0), layout: 'yn',
    options: [{ id: 'yes', label: T('نعم', 'Yes') }, { id: 'no', label: T('لا، تسقط', 'No, it drops') }], answer: 'no', explain: T('همزة الوصل تسقط في وسط الكلام، ولا تُنطق إلا إذا بدأنا بها.', 'Hamzat al-wasl drops mid-speech; it is only said when we start with it.') };
}

// ───────── أنواع الوقف: أمثلة مشهورة في كتب الوقف + آخر كل سورة (تامّ) ─────────
const WT = { tamm: T('تامّ', 'Complete (tamm)'), kafi: T('كافٍ', 'Sufficient (kafi)'), hasan: T('حسن', 'Good (hasan)'), qabih: T('قبيح', 'Bad (qabih)') };
const WT_WHY = {
  tamm: T('تمّ المعنى ولا يتعلّق ما بعده به لفظًا ولا معنى: وقف تامّ، نقف ونبدأ بما بعده.', 'The meaning is complete and what follows is not linked at all: a complete stop.'),
  kafi: T('تمّ المعنى، وما بعده متعلّق به في المعنى فقط: وقف كافٍ، نقف ونبدأ بما بعده.', 'The meaning is complete and what follows is linked in meaning only: a sufficient stop.'),
  hasan: T('تمّ المعنى، لكن ما بعده متعلّق به في اللفظ: وقف حسن، وإن كان في وسط الآية رجعنا عند الابتداء.', 'The meaning is complete but what follows is linked in wording: a good stop; mid-ayah we go back when starting again.'),
  qabih: T('لم يتمّ المعنى: وقف قبيح، لا نقف هنا إلا لضرورة ثم نرجع.', 'The meaning is not complete: a bad stop, only out of need, then go back.')
};
const WT_EX = [{ key: '1:1', i: 0, t: 'qabih' }, { key: '1:4', i: 0, t: 'qabih' }, { key: '1:2', i: 1, t: 'hasan' }, { key: '1:5', i: 3, t: 'kafi' }, { key: '1:4', i: 2, t: 'tamm' }].filter((e) => POOL[e.key] && POOL[e.key].w[e.i]);
const surahEnds = () => Object.keys(POOL).filter((k) => { const [s, a] = k.split(':').map(Number); return SURAHS[s] && SURAHS[s].n === a; });
const lastHl = (key, i) => { const w = POOL[key].w[i]; return { [i]: { [wordClusters(w).length - 1]: 'cause' } }; };
export function genWaqfType(r, { famous = true } = {}) {
  const ends = surahEnds(); const useEnd = !famous || (ends.length && r() < 0.35);
  const e = useEnd ? (() => { const key = pick(ends, r); return { key, i: POOL[key].w.length - 1, t: 'tamm', end: true }; })() : pick(WT_EX, r);
  return { type: 'choice', lesson: 'know_waqf_types', kind: 'wtype:' + e.t + (e.end ? ':end' : ''), stem: T('إذا وقفنا بعد الكلمة المظلّلة، ما نوع الوقف؟', 'If we stop after the highlighted word, what kind of stop is it?'), media: { kind: 'verse', key: e.key, hl: lastHl(e.key, e.i) }, layout: 'text',
    options: shuffle(Object.keys(WT), r).map((k) => ({ id: k, label: WT[k] })), answer: e.t,
    explain: e.end ? T('هذه آخر آية في السورة: الوقف على آخر السورة تامّ دائمًا.', 'This is the last ayah of the surah: stopping at the end of a surah is always complete.') : WT_WHY[e.t] };
}
// أمثلة الدرس المصوَّر لأنواع الوقف (نفس أمثلة الأسئلة)
export function waqfExamples() {
  const end = surahEnds().sort((a, b) => POOL[a].w.length - POOL[b].w.length)[0];
  return [...WT_EX.map((e) => ({ key: e.key, hl: lastHl(e.key, e.i), label: WT[e.t] })), ...(end ? [{ key: end, hl: lastHl(end, POOL[end].w.length - 1), label: T('آخر السورة: تامّ', 'End of a surah: complete') }] : [])];
}
export function genWaqfStart(r) {
  const e = pick(WT_EX.filter((x) => x.t === 'qabih' || x.t === 'hasan'), r);
  return { type: 'choice', lesson: 'know_waqf_types', kind: 'wstart:' + e.key + ':' + e.i, stem: T('وقفت بعد الكلمة المظلّلة وتريد أن تكمل. من أين تبدأ؟', 'You stopped after the highlighted word and want to continue. Where do you start?'), media: { kind: 'verse', key: e.key, hl: lastHl(e.key, e.i) }, layout: 'text',
    options: shuffle([{ id: 'back', label: T('أرجع إلى أول الآية وأصل', 'I go back to the start of the ayah and read on') }, { id: 'next', label: T('أبدأ بالكلمة التالية مباشرة', 'I start straight with the next word') }], r), answer: 'back',
    explain: T('ما بعد هذه الكلمة متعلّق بما قبلها، فلا نبتدئ به؛ نرجع إلى كلام يستقيم به المعنى.', 'What follows is linked to what came before, so we do not start there; we go back to words whose meaning is sound.') };
}

// ───────── المخارج السبعة عشر ─────────
const M17 = MAKHARIJ17.filter((m) => m.letters.length);
// اسم المخرج في الأسئلة بلا الحرف بين القوسين «(الضاد)» حتى لا يكشف الإجابة
const place = (m) => ({ ar: m.name.ar.replace(/\s*\([^)]*\)/, ''), en: m.name.en.replace(/\s*\([^)]*\)/, '') });
const m17Of = (l) => M17.find((m) => m.letters.includes(l) && !(['ا', 'و', 'ي'].includes(l)));
const M17_LETTERS = M17.flatMap((m) => m.letters).filter((l) => !['ا', 'و', 'ي'].includes(l));
export function genM17Area(r, { hard = false } = {}) {
  const l = pick(M17_LETTERS, r); const m = m17Of(l);
  const pool = M17.filter((x) => x !== m && (hard ? x.area === m.area : true) && !x.letters.includes(l)); const others = shuffle(pool.length >= 3 ? pool : M17.filter((x) => x !== m), r).slice(0, 3);
  return { type: 'choice', lesson: 'know_makharij2', kind: 'm17:' + m.n, stem: T(`من أيّ مخرج يخرج حرف «${l}»؟`, `From which point does «${l}» come?`), media: glyphOf(l), layout: 'text',
    options: shuffle([m, ...others], r).map((x) => ({ id: String(x.n), label: place(x) })), answer: String(m.n), explain: T(`«${l}» من ${m.name.ar}: ${m.kid.ar}`, `«${l}»: ${m.name.en} — ${m.kid.en}`) };
}
export function genM17Letter(r) {
  const m = pick(M17.filter((x) => x.n > 1), r); const right = pick(m.letters.filter((l) => !['و', 'ي'].includes(l)), r);
  const near = M17.filter((x) => x !== m && x.area === m.area).flatMap((x) => x.letters); const far = M17_LETTERS.filter((l) => !m.letters.includes(l));
  const others = shuffle([...new Set([...shuffle(near, r), ...shuffle(far, r)])].filter((l) => !m.letters.includes(l) && !['ا', 'و', 'ي'].includes(l)), r).slice(0, 3);
  return { type: 'choice', lesson: 'know_makharij2', kind: 'm17l:' + m.n, stem: T(`أيّ هذه الحروف مخرجه: ${place(m).ar}؟`, `Which of these letters comes from ${place(m).en}?`), media: null, layout: 'num',
    options: shuffle([right, ...others], r).map(letterOpt), answer: right, explain: T(`${m.name.ar}: ${m.letters.map(disp).join(' ')}. ${m.kid.ar}`, `${m.name.en}: ${m.letters.map(disp).join(' ')}. ${m.kid.en}`) };
}
export function genM17Same(r) {
  const m = pick(M17.filter((x) => x.letters.filter((l) => !['و', 'ي', 'ا'].includes(l)).length >= 2), r); const [given, right] = shuffle(m.letters.filter((l) => !['و', 'ي', 'ا'].includes(l)), r);
  const others = shuffle(M17_LETTERS.filter((l) => !m.letters.includes(l)), r).slice(0, 3);
  return { type: 'choice', lesson: 'know_makharij2', kind: 'm17s:' + m.n, stem: T(`أيّ حرف يخرج مع «${disp(given)}» من المخرج نفسه بالضبط؟`, `Which letter comes from exactly the same point as «${disp(given)}»?`), media: glyphOf(given), layout: 'num',
    options: shuffle([right, ...others], r).map(letterOpt), answer: right, explain: T(`«${disp(given)}» و«${disp(right)}» من ${m.name.ar}.`, `«${disp(given)}» and «${disp(right)}» both come from ${m.name.en}.`) };
}

// ───────── الصفات كلها ─────────
const ALL_PARTS = SIFA_PAIRS.flatMap((p) => p.parts.map((x) => ({ ...x, pair: p.id })));
const LETTERS28 = SIFA_PAIRS[0].parts.flatMap((x) => x.letters);
export function genSifaPairOf(r) {
  const p = pick(SIFA_PAIRS, r); const l = pick(LETTERS28, r); const right = p.parts.find((x) => x.letters.includes(l));
  return { type: 'choice', lesson: 'know_sifat2', kind: 'pair:' + p.id, stem: T(`حرف «${disp(l)}»: أيّ صفة من هذه فيه؟`, `The letter «${disp(l)}»: which of these qualities does it have?`), media: glyphOf(l), layout: p.parts.length === 2 ? 'yn' : 'text',
    options: p.parts.map((x) => ({ id: x.id, label: x.name })), answer: right.id,
    explain: T(`«${disp(l)}» من حروف ${right.name.ar}${right.mn ? ` «${right.mn}»` : ''}. ${right.kid.ar}`, `«${disp(l)}» is ${right.name.en}${right.mn ? ` «${right.mn}»` : ''}. ${right.kid.en}`) };
}
export function genSifaOpposite(r) {
  const p = pick(SIFA_PAIRS.filter((x) => x.parts.length === 2), r); const [a, b] = shuffle(p.parts, r);
  const others = shuffle(ALL_PARTS.filter((x) => x.pair !== p.id), r).slice(0, 2);
  return { type: 'choice', lesson: 'know_sifat2', kind: 'opp:' + a.id, stem: T(`ما ضدّ صفة ${a.name.ar}؟`, `What is the opposite of ${a.name.en}?`), media: null, layout: 'text',
    options: shuffle([b, ...others], r).map((x) => ({ id: x.id, label: x.name })), answer: b.id, explain: T(`${a.name.ar} و${b.name.ar} زوج متضاد: لكل حرف واحدة منهما.`, `${a.name.en} and ${b.name.en} are an opposite pair: every letter has one of them.`) };
}
export function genSifaSingle(r) {
  const g = pick(SIFA_SINGLE, r); const right = pick(g.letters, r); const others = shuffle(LETTERS28.filter((l) => !g.letters.includes(l)), r).slice(0, 3);
  return { type: 'choice', lesson: 'know_sifat2', kind: 'single:' + g.id, stem: T(`أيّ هذه الحروف فيه صفة ${g.name.ar}؟`, `Which of these letters has ${g.name.en}?`), media: null, layout: 'num',
    options: shuffle([right, ...others], r).map(letterOpt), answer: right, explain: T(`${g.name.ar}: ${g.letters.map(disp).join(' ')}. ${g.kid.ar}`, `${g.name.en}: ${g.letters.map(disp).join(' ')}. ${g.kid.en}`) };
}
export const sifatOf = (l) => [...ALL_PARTS.filter((x) => x.letters.includes(l)), ...SIFA_SINGLE.filter((g) => g.letters.includes(l))].map((x) => x.id);
export function genSifaHas(r) {
  const l = pick(LETTERS28.filter((x) => !['و', 'ي'].includes(x)), r); const has = sifatOf(l); const all = [...ALL_PARTS, ...SIFA_SINGLE];
  const right = pick(all.filter((x) => has.includes(x.id)), r); const others = shuffle(all.filter((x) => !has.includes(x.id)), r).slice(0, 3);
  return { type: 'choice', lesson: 'know_sifat2', kind: 'has:' + right.id, stem: T(`أيّ هذه الصفات في حرف «${disp(l)}»؟`, `Which of these qualities does «${disp(l)}» have?`), media: glyphOf(l), layout: 'text',
    options: shuffle([right, ...others], r).map((x) => ({ id: x.id, label: x.name })), answer: right.id,
    explain: T(`صفات «${disp(l)}»: ${all.filter((x) => has.includes(x.id)).map((x) => x.name.ar).join('، ')}.`, `«${disp(l)}»: ${all.filter((x) => has.includes(x.id)).map((x) => x.name.en).join(', ')}.`) };
}

// ───────── بناء المستويات ─────────
export function buildKnowLevel(id, level, seed = Date.now()) {
  const r = rng(seed); const used = new Set();
  const bank = () => { const q = genKnowBank(id, r, used); used.add(q.kind.split(':')[1]); return q; };
  const lvb = (lvs) => () => { const q = genKnowBank(id, r, used, lvs); used.add(q.kind.split(':')[1]); return q; };
  const P = {
    // آداب التلاوة: المستوى ١ أساسيات، ٢ معرفة، ٣ مواقف عملية (lv في data/know.js)
    mushaf_adab: level === 1 ? [lvb([1]), lvb([1]), lvb([1]), lvb([1]), lvb([1])] : level === 2 ? [lvb([2]), lvb([1]), lvb([2]), lvb([2]), lvb([1, 2])] : [lvb([3]), lvb([3]), lvb([2]), lvb([3]), lvb([3])],
    mushaf_surahs: level === 1 ? [bank, () => genSurahBefore(r), bank, () => genBannerName(r), () => genSurahNext(r)] : [() => genSurahBefore(r), () => genSurahNext(r), bank, () => genSurahNext(r), () => genSurahBefore(r)],
    mushaf_find: level === 1 ? [bank, () => genAyahNum(r), bank, () => genPageSurah(r), bank] : [() => genVerseJuz(r), () => genAyahNum(r, level === 3 ? { maxWords: 8 } : {}), bank, () => genPageSurah(r), () => genVerseJuz(r)],
    know_makharij: level === 1 ? [bank, () => genLetterArea(r), bank, () => genAreaLetter(r), () => genLetterArea(r)] : level === 2 ? [() => genLetterArea(r), () => genAreaLetter(r), bank, () => genSameArea(r), () => genAreaLetter(r)] : [() => genSameArea(r), () => genAreaOdd(r), () => genLetterArea(r), () => genAreaOdd(r), () => genSameArea(r)],
    know_sifat: level === 1 ? [bank, () => genSifaYesNo(r), () => genSifaWhich(r), bank, () => genSifaYesNo(r)] : level === 2 ? [() => genSifaWhich(r), () => genSifaYesNo(r), bank, () => genSifaBoth(r), () => genSifaYesNo(r)] : [() => genSifaBoth(r), () => genSifaCount(r), () => genSifaWhich(r), () => genSifaCount(r), () => genSifaBoth(r)],
    know_silah: level === 1 ? [lvb([1]), () => genSilahKind(r), () => genSilahCount(r), lvb([1]), () => genSilahKind(r)] : level === 2 ? [() => genSilahKind(r), lvb([2]), () => genSilahCount(r), () => genSilahStop(r), () => genSilahKind(r)] : [() => genSilahKind(r, { withNone: true }), () => genSilahStop(r), lvb([3]), () => genSilahKind(r, { withNone: true }), () => genSilahCount(r)],
    know_wasl: level === 1 ? [lvb([1]), () => genWaslDrop(r), () => genWaslVowel(r), lvb([1]), () => genWaslVowel(r)] : level === 2 ? [() => genWaslVowel(r), lvb([2]), () => genWaslVowel(r), () => genWaslDrop(r), lvb([2])] : [() => genWaslVowel(r), () => genWaslWhy(r), lvb([3]), () => genWaslWhy(r), () => genWaslVowel(r)],
    know_waqf_types: level === 1 ? [lvb([1]), lvb([1]), () => genWaqfType(r, { famous: false }), lvb([1]), () => genWaqfType(r)] : level === 2 ? [lvb([2]), () => genWaqfType(r), lvb([2]), () => genWaqfStart(r), () => genWaqfType(r)] : [() => genWaqfType(r), lvb([3]), () => genWaqfStart(r), () => genWaqfType(r), lvb([3])],
    know_makharij2: level === 1 ? [lvb([1]), () => genM17Letter(r), () => genM17Area(r), lvb([1]), () => genM17Area(r)] : level === 2 ? [() => genM17Area(r), () => genM17Same(r), lvb([2]), () => genM17Letter(r), () => genM17Area(r)] : [() => genM17Area(r, { hard: true }), () => genM17Same(r), lvb([3]), () => genM17Area(r, { hard: true }), () => genM17Letter(r)],
    know_sifat2: level === 1 ? [lvb([1]), () => genSifaPairOf(r), () => genSifaSingle(r), lvb([1]), () => genSifaPairOf(r)] : level === 2 ? [() => genSifaOpposite(r), () => genSifaPairOf(r), lvb([2]), () => genSifaSingle(r), () => genSifaPairOf(r)] : [() => genSifaHas(r), () => genSifaPairOf(r), lvb([3]), () => genSifaHas(r), () => genSifaOpposite(r)],
    know_waqf: level === 1 ? [bank, () => genStopWord(r), () => genStopWord(r), bank, () => genStopWord(r)] : [() => genStopWord(r), () => genStopWord(r), bank, () => genStopWord(r), () => genStopWord(r)]
  }[id];
  return P.map((f) => f()).filter(Boolean);
}
export function knowQuestion(id, r) { return pick(buildKnowLevel(id, 2, Math.floor(r() * 1e9)), r); }
export { KNOW, AREAS, AREA_IDS, SIFAT };
export const STOP_LABEL = Object.fromEntries(Object.entries(STOP_KIND).map(([k, v]) => [k, v.label]));
