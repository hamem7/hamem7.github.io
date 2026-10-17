// tools/tajweed-annotations/build.mjs
// يولّد database/data/tajweedAnnotations.json: مواضع أحكام التجويد في كل آية، مربوطة بنص تنزيل المحلي
// (database/quran-uthmani.json) على مستوى «فهرس الكلمة» — أي نفس فهرس كلمات cleanAyahText الذي تبني
// عليه أسئلة «اكتشف الحكم». المصدر: محرك ghunna (MIT) https://www.npmjs.com/package/ghunna الذي يشتق
// الأحكام بالقاعدة ويستشهد ببيت تحفة الأطفال لكل حكم. التفاصيل والمقارنة: docs/TAJWEED_DATA.md
//
// الاستعمال:  mkdir /tmp/g && cd /tmp/g && npm i ghunna@0.1.1
//             GHUNNA=/tmp/g/node_modules/ghunna/dist/index.js node tools/tajweed-annotations/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildStrippedCharMap, isArabicBaseLetterCode } from '../../core/quranTextUtils.js';
import { cleanAyahText, isWaqfMark } from '../../engine/quranEngine.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const GHUNNA = process.env.GHUNNA || path.join(process.cwd(), 'node_modules/ghunna/dist/index.js');
const { annotateVerse } = await import(pathToFileURL(GHUNNA).href);
const GHUNNA_VERSION = JSON.parse(fs.readFileSync(path.join(path.dirname(GHUNNA), '../package.json'), 'utf8')).version;

// قواعد ghunna التي نحتفظ بها (أحكام المتن + القلقلة). المد الطبيعي وهمزة الوصل والتفخيم... مستبعدة عمداً
// (ملايين المواضع بلا فائدة تعليمية هنا، وتُسقِط حجم الملف).
const KEEP_WASL = [
    'qalqalah-sughra', 'ghunnah-mushaddadah',
    'izhar-halqi', 'idgham-bighunnah', 'idgham-bila-ghunnah', 'iqlab', 'ikhfa-haqiqi',
    'izhar-shafawi', 'ikhfa-shafawi', 'idgham-shafawi',
    'lam-qamariyyah', 'lam-shamsiyyah',
    'idgham-mithlayn', 'idgham-mutajanisayn', 'idgham-mutaqaribayn',
    'madd-muttasil', 'madd-munfasil', 'madd-badal',
    'madd-lazim-kalimi-muthaqqal', 'madd-lazim-kalimi-mukhaffaf', 'madd-lazim-harfi-muthaqqal', 'madd-lazim-harfi-mukhaffaf'
];
// أحكام لا تظهر إلا عند الوقف على آخر الآية (وضع stop)
const KEEP_STOP = ['madd-arid-lissukun', 'madd-lin', 'qalqalah-kubra'];
const RULES = [...KEEP_WASL, ...KEEP_STOP];
const ruleIdx = new Map(RULES.map((r, i) => [r, i]));

const quran = JSON.parse(fs.readFileSync(path.join(ROOT, 'database/quran-uthmani.json'), 'utf8')).data.surahs;

// يحوّل مواضع ghunna (نقاط ترميز في نص ghunna) إلى فهارس كلمات في نصنا عبر فهرس الحروف الأساسية
function mapRanges(ourClean, gText, annotations) {
    const ours = buildStrippedCharMap(ourClean);          // stripped + map[k] = موضع الحرف k في نصنا
    const g = buildStrippedCharMap(gText);
    // نص ghunna قد يبدأ بالبسملة (أول آية من كل سورة عدا الفاتحة والتوبة) فيكون أطول بعدد حروفها
    const shift = g.stripped.length - ours.stripped.length;
    if (shift < 0 || g.stripped.slice(shift) !== ours.stripped) return null;
    // أرقام الحروف الأساسية قبل كل موضع في نص ghunna
    const baseBefore = new Array(gText.length + 1);
    let n = 0;
    const cps = [...gText];                                // نقاط ترميز (ranges بنقاط الترميز لا وحدات UTF-16)
    const offsets = []; let u = 0;
    cps.forEach(ch => { offsets.push(u); u += ch.length; });
    // word spans في نصنا (مع تجاهل رموز الوقف)
    const tokens = []; const re = /\S+/g; let m;
    while ((m = re.exec(ourClean))) tokens.push({ s: m.index, e: m.index + m[0].length, real: !isWaqfMark(m[0]) });
    let wi = 0; tokens.forEach(t => { t.word = t.real ? wi++ : -1; });
    const wordAtChar = (pos) => { const t = tokens.find(t => pos >= t.s && pos < t.e); return t ? t.word : -1; };

    const baseIdxOfCp = (cpIndex) => { // عدد الحروف الأساسية قبل نقطة الترميز cpIndex
        let c = 0; for (let i = 0; i < cpIndex && i < cps.length; i++) if (isArabicBaseLetterCode(cps[i].codePointAt(0))) c++; return c;
    };
    const out = [];
    for (const a of annotations) {
        const [s, e] = a.range;
        const kStart = baseIdxOfCp(s) - shift, kEnd = baseIdxOfCp(e) - 1 - shift;   // أول حرف أساسي وآخره داخل المدى
        if (kEnd < 0) continue;                                // يقع داخل البسملة
        const ks = Math.max(0, kStart);
        const w1 = wordAtChar(ours.map[Math.min(ks, ours.map.length - 1)]);
        const w2 = wordAtChar(ours.map[Math.min(Math.max(kEnd, ks), ours.map.length - 1)]);
        if (w1 < 0 || w2 < 0) continue;
        out.push({ rule: a.rule, w1, w2: Math.max(w1, w2) });
    }
    return out;
}

const ayahs = {}; let total = 0, skipped = 0, mism = 0;
const perRule = {};
for (const s of quran) for (const a of s.ayahs) {
    const ourClean = cleanAyahText(a.text.replace(/^﻿/, ''));
    const keyName = `${s.number}:${a.numberInSurah}`;
    const wasl = annotateVerse(s.number, a.numberInSurah);
    const stop = annotateVerse(s.number, a.numberInSurah, { mode: 'stop' });
    const picked = [
        ...wasl.annotations.filter(x => ruleIdx.has(x.rule) && KEEP_WASL.includes(x.rule)),
        ...stop.annotations.filter(x => KEEP_STOP.includes(x.rule))
    ];
    const mapped = mapRanges(ourClean, wasl.text, picked);
    if (mapped === null) { mism++; continue; }
    const flat = [];
    mapped.sort((x, y) => x.w1 - y.w1 || ruleIdx.get(x.rule) - ruleIdx.get(y.rule));
    const seen = new Set();
    for (const x of mapped) {
        const k = `${x.rule}|${x.w1}|${x.w2}`; if (seen.has(k)) continue; seen.add(k);
        flat.push(ruleIdx.get(x.rule), x.w1, x.w2); total++; perRule[x.rule] = (perRule[x.rule] || 0) + 1;
    }
    if (flat.length) ayahs[keyName] = flat;
}
const outFile = path.join(ROOT, 'database/data/tajweedAnnotations.json');
fs.writeFileSync(outFile, JSON.stringify({
    v: 1,
    source: `ghunna ${GHUNNA_VERSION} (MIT) — https://github.com/mwiederrecht/ghunna ؛ مواضع مربوطة بفهرس كلمات cleanAyahText لنص تنزيل المحلي`,
    format: 'ayahs["s:a"] = [قاعدة, كلمة1, كلمة2, ...] ثلاثيات؛ rules[فهرس] اسم قاعدة ghunna؛ الكلمات فهارس بعد حذف رموز الوقف',
    rules: RULES,
    ayahs
}));
console.log({ totalAnnotations: total, ayahsWithAnnotations: Object.keys(ayahs).length, alignmentMismatchAyahs: mism, bytes: fs.statSync(outFile).size });
console.log(perRule);
