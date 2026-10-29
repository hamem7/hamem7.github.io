#!/usr/bin/env node
// tools/verify.mjs — مراجعة المحتوى آليا (مستقلة عن اختبارات الألعاب). تفشل (exit 1) عند أي مخالفة.
// 1) النص القرآني في البنك مطابق حرفا حرفا لمصحف المنصة   2) كل مثال في الدروس موجود في البنك وموثق بمصدرين
// 3) البنك الحالي = ناتج إعادة الاستخراج (لا بيانات قديمة)   4) اكتمال العربية والإنجليزية   5) لا نص قرآني مكتوب يدويا في الشيفرة
// 6) حروف الأحكام في المحتوى تطابق حروف الكاشف المستقل   7) قاعدة الخط القرآني مطابقة للمنصة   8) كل الأحكام لها رسم وشرح وأمثلة
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { POOL, SURAHS } from '../data/pool.js';
import { RULES, STAGES, SOURCES, CONFUSABLES, L_IZHAR, L_IDGHAM_G, L_IDGHAM_N, L_IKHFA, L_QALQALAH, L_QAMARI, L_SHAMSI } from '../data/rules.js';
import { UI_DICT } from '../js/i18n.js';
import { VIZ, VIZ_CAPTION } from '../js/viz.js';
import { loadQuran, loadAnnotations, annotationOccurrences, ayahText, PLATFORM } from './lib/source.mjs';
import { detectAyah, IZHAR_LETTERS, IDGHAM_GHUNNA_LETTERS, IDGHAM_NO_GHUNNA_LETTERS, IKHFA_LETTERS, QALQALAH_LETTERS, QAMARI_LETTERS, SHAMSI_LETTERS } from './lib/detect.mjs';
import { tokenize, isWaqfToken } from '../js/arabic.js';

const HERE = path.dirname(fileURLToPath(import.meta.url)); const ROOT = path.join(HERE, '..');
const errors = [], notes = []; const fail = (m) => errors.push(m);
const Q = loadQuran(), A = loadAnnotations();

// 1 + 3
let nAyah = 0, nWords = 0;
for (const s of Q) for (const a of s.ayahs) {
  const key = `${s.number}:${a.numberInSurah}`; const v = POOL[key]; if (!v) continue; nAyah++;
  const toks = ayahText(s, a).trim().split(/\s+/); while (toks.length && isWaqfToken(toks[0])) toks.shift(); /* علامة الحزب \u06DE في أول الآية ليست كلمة */ const rebuilt = [];
  v.w.forEach((w, i) => { rebuilt.push(w); if (v.wq[i]) rebuilt.push(v.wq[i]); }); nWords += v.w.length;
  if (rebuilt.join(' ') !== toks.join(' ')) fail(`[نص] ${key}: النص في البنك يخالف المصحف`);
  const det = detectAyah(ayahText(s, a));
  const mine = det.occ.filter((o) => { const t = annotationOccurrences(A, key, o.rule); return t === null || t.some((x) => x[0] <= o.w2 && x[1] >= o.w1); }).length;
  if (mine !== v.o.length) fail(`[بنك] ${key}: البنك قديم (${v.o.length}) مقابل (${mine}) — أعد tools/build-data.mjs`);
}
notes.push(`آيات البنك: ${nAyah} — كلمات: ${nWords}`);

// 2
let nEx = 0;
for (const r of Object.values(RULES)) {
  if (r.examples.length < 3) fail(`[أمثلة] ${r.id}: أقل من ٣ أمثلة`);
  for (const [key, w1, w2, note] of r.examples) {
    nEx++; const v = POOL[key]; if (!v) { fail(`[أمثلة] ${r.id}: الآية ${key} غير موجودة`); continue; }
    const occ = v.o.find((o) => o[0] === r.id && o[1] === w1 && o[2] === w2);
    if (!occ) { fail(`[أمثلة] ${r.id}: ${key} (${w1}-${w2}) ليس موضع\u064Bا موث\u064E\u0651ق\u064Bا للحكم`); continue; }
    if (r.id !== 'madd_tabii' && occ[5] < 2) fail(`[أمثلة] ${r.id}: ${key} موث\u064E\u0651ق بمصدر واحد فقط`);
    if (note && occ[3] !== note) fail(`[أمثلة] ${r.id}: ${key} الحرف المؤث\u0651ر ${occ[3]} لا يطابق الملاحظة ${note}`);
    // حرف السبب مطابق لقاعدة الحكم نفسه (فحص مستقل عن الكاشف: من القوائم المكتوبة في المحتوى)
    const t = occ[3]; const sets = { noon_izhar: L_IZHAR, noon_idgham_ghunna: L_IDGHAM_G, noon_idgham_no_ghunna: L_IDGHAM_N, noon_iqlab: ['ب'], noon_ikhfa: L_IKHFA, qalqalah: L_QALQALAH, lam_qamari: L_QAMARI, lam_shamsi: L_SHAMSI, meem_ikhfa: ['ب'], meem_idgham: ['م'] };
    if (sets[r.id] && !sets[r.id].includes(t)) fail(`[أمثلة] ${r.id}: ${key} الحرف ${t} ليس من حروف الحكم في المحتوى`);
    if (r.id === 'meem_izhar' && (t === 'ب' || t === 'م')) fail(`[أمثلة] meem_izhar: ${key} الحرف ${t}`);
  }
}
notes.push(`أمثلة الدروس المفحوصة: ${nEx}`);

// 4
const needBoth = (o, where) => { if (!o || !o.ar || !o.en || !String(o.ar).trim() || !String(o.en).trim()) fail(`[لغات] ناقص عربي/إنجليزي: ${where}`); };
for (const r of Object.values(RULES)) {
  for (const k of ['name', 'short', 'tagline', 'def', 'kid', 'needs', 'find', 'why', 'watch', 'length']) needBoth(r[k], `${r.id}.${k}`);
  r.how.forEach((h, i) => needBoth(h, `${r.id}.how[${i}]`)); r.vs.forEach((v, i) => { needBoth(v.tip, `${r.id}.vs[${i}]`); if (!RULES[v.with]) fail(`[vs] ${r.id}→${v.with}`); });
  needBoth(r.letters.label, `${r.id}.letters.label`); needBoth(r.poem.ref, `${r.id}.poem.ref`); if (!SOURCES[r.poem.src]) fail(`[مصدر] ${r.id}`);
  if (!r.why.ar.includes('{t}') || !r.why.en.includes('{t}')) fail(`[why] ${r.id}: ينقص {t}`);
  if (!VIZ[r.viz] || !VIZ_CAPTION[r.viz]) fail(`[رسم] ${r.id}`); needBoth(VIZ_CAPTION[r.viz], `viz.${r.viz}`);
  if (!CONFUSABLES[r.id] || CONFUSABLES[r.id].length < 3) fail(`[confusables] ${r.id}`);
}
for (const s of STAGES) { needBoth(s.name, `stage.${s.id}`); needBoth(s.blurb, `stage.${s.id}.blurb`); }
for (const s of Object.values(SOURCES)) { needBoth(s.title, `src.${s.id}.title`); needBoth(s.ref, `src.${s.id}.ref`); needBoth(s.note, `src.${s.id}.note`); }
for (const [k, v] of Object.entries(UI_DICT)) needBoth(v, `ui.${k}`);
// مفاتيح t('...') المستعملة في الشيفرة موجودة
for (const f of fs.readdirSync(path.join(ROOT, 'js')).filter((x) => x.endsWith('.js'))) {
  const src = fs.readFileSync(path.join(ROOT, 'js', f), 'utf8');
  for (const m of src.matchAll(/\bt\('([a-z_0-9]+)'/g)) if (!UI_DICT[m[1]]) fail(`[ui] مفتاح غير معر\u064E\u0651ف في ${f}: ${m[1]}`);
  for (const m of src.matchAll(/t\(`(lvl_|lvl_)\$\{/g)) void m;
}
for (const k of ['lvl_1', 'lvl_2', 'lvl_3', 'lvl_1_d', 'lvl_2_d', 'lvl_3_d']) if (!UI_DICT[k]) fail(`[ui] ${k}`);

// 5: لا آية مكتوبة يدويا خارج البنك (نبحث عن كلمات البنك المشكلة داخل ملفات الشيفرة والمحتوى)
const marked = new Set(); for (const v of Object.values(POOL)) for (const w of v.w) if (/[\u064B-\u0652\u0670\u06E1]/.test(w) && w.length >= 5) marked.add(w);
const scan = [...fs.readdirSync(path.join(ROOT, 'js')).filter((x) => x.endsWith('.js')).map((x) => path.join(ROOT, 'js', x)), path.join(ROOT, 'data/rules.js'), path.join(ROOT, 'index.html')];
const bigrams = new Set(); for (const v of Object.values(POOL)) for (let i = 0; i + 1 < v.w.length; i++) bigrams.add(v.w[i] + ' ' + v.w[i + 1]);
for (const f of scan) {
  const src = fs.readFileSync(f, 'utf8');
  if (path.basename(f) === 'rules.js') { for (const g of bigrams) if (src.includes(g)) fail(`[قرآن] عبارة من البنك مكتوبة يدوي\u064Bا في rules.js: ${g}`); }
  else for (const w of marked) if (src.includes(w)) fail(`[قرآن] كلمة من البنك مكتوبة يدوي\u064Bا في ${path.basename(f)}: ${w}`);
}
notes.push(`فحص النص المكتوب يدوي\u064Bا: ${marked.size} كلمة م\u064Fشك\u064E\u0651لة × ${scan.length} ملف`);

// 6
const eq = (a, b, n) => { const x = [...a].sort().join(''), y = [...b].sort().join(''); if (x !== y) fail(`[حروف] ${n}: ${x} ≠ ${y}`); };
eq(L_IZHAR, IZHAR_LETTERS, 'izhar'); eq(L_IDGHAM_G, IDGHAM_GHUNNA_LETTERS, 'idgham_g'); eq(L_IDGHAM_N, IDGHAM_NO_GHUNNA_LETTERS, 'idgham_n'); eq(L_IKHFA, IKHFA_LETTERS, 'ikhfa'); eq(L_QALQALAH, QALQALAH_LETTERS, 'qalqalah');
eq(L_QAMARI.concat(['ء']).filter((x, i, a) => a.indexOf(x) === i), QAMARI_LETTERS, 'qamari(+ء كألف)'); eq(L_SHAMSI, SHAMSI_LETTERS, 'shamsi');
if (L_IZHAR.length + L_IDGHAM_G.length + L_IDGHAM_N.length + L_IKHFA.length + 1 !== 28) fail('[حروف] مجموع حروف النون ≠ ٢٨');
if (L_QAMARI.length !== 14 || L_SHAMSI.length !== 14 || new Set([...L_QAMARI, ...L_SHAMSI]).size !== 28) fail('[حروف] القمرية/الشمسية ≠ ١٤+١٤ بلا تداخل');

// 7
const css = fs.readFileSync(path.join(ROOT, 'css/challenge.css'), 'utf8'); const plat = fs.readFileSync(path.join(PLATFORM, 'css/global.css'), 'utf8');
if (!/\.quran-text \{[^}]*'Amiri Quran'|--font-quran: 'Amiri Quran'/.test(css) || !/\.quran-text \{[^}]*font-family: var\(--font-quran\) !important; font-weight: 400 !important; line-height: 2\.2 !important/.test(css)) fail('[خط] قاعدة .quran-text تخالف المنصة');
if (!/\.quran-text \{\s*font-family: 'Amiri Quran', serif !important;\s*font-weight: 400 !important;\s*line-height: 2\.2 !important;/.test(plat)) fail('[خط] تغي\u0651رت قاعدة المنصة — راجع');
const fontsCss = fs.readFileSync(path.join(ROOT, 'css/fonts.css'), 'utf8'); const platFonts = fs.readFileSync(path.join(PLATFORM, 'css/fonts.css'), 'utf8');
for (const l of fontsCss.split('\n').filter((x) => x.startsWith('@font-face') && x.includes('Amiri Quran'))) if (!platFonts.includes(l)) fail('[خط] تعريف خط قرآني يخالف المنصة');
for (const f of fs.readdirSync(path.join(ROOT, 'assets/fonts'))) if (!fs.readFileSync(path.join(ROOT, 'assets/fonts', f)).equals(fs.readFileSync(path.join(PLATFORM, 'assets/fonts', f)))) fail(`[خط] ${f} يخالف المنصة`);
if (/letter-spacing\s*:\s*[^n]/.test(css.split('.quran-text')[1] || '') && /quran[^{]*\{[^}]*letter-spacing:\s*[0-9]/.test(css)) fail('[خط] letter-spacing على النص القرآني');

console.log(notes.join('\n'));
if (errors.length) { console.error(`\n✗ ${errors.length} مخالفة:\n` + errors.join('\n')); process.exit(1); }
console.log('✓ المحتوى سليم: نص مطابق، أمثلة موث\u064E\u0651قة بمصدرين، لغتان كاملتان، حروف مطابقة، خط قرآني سليم');
