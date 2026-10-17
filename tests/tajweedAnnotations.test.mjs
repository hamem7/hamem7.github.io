// tests/tajweedAnnotations.test.mjs — node tests/tajweedAnnotations.test.mjs
// جدول توسيم التجويد (database/data/tajweedAnnotations.json): سلامة البيانات، مطابقة أمثلة الكتالوج له،
// حقائق معروفة، مجموعة آيات الطالب من نطاق حفظه، وجودة الأسئلة المولَّدة منه.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cleanAyahText, cleanName, isWaqfMark } from '../engine/quranEngine.js';
import { findPhraseRanges, buildStrippedCharMap } from '../core/quranTextUtils.js';
import { TAJWEED_STAGES, getAllRulesFlat } from '../engine/tajweedRulesCatalog.js';
import { createAnnotationIndex, memorizedAyahsFromPath, findCandidateAyahs, CATALOG_TO_ANNOTATION } from '../engine/tajweedAnnotations.js';
import { generateAnnotatedQuestion, buildStageChallengeQuestions } from '../engine/tajweedEngine.js';
import { resolveRange, buildPath } from '../engine/trackingEngine.js';

let pass = 0, fail = 0;
const test = (name, fn) => { try { fn(); pass++; console.log('✅ ' + name); } catch (e) { fail++; console.log('❌ ' + name + '\n   ' + e.message); } };

const quran = JSON.parse(fs.readFileSync(new URL('../database/quran-uthmani.json', import.meta.url), 'utf8')).data.surahs;
const data = JSON.parse(fs.readFileSync(new URL('../database/data/tajweedAnnotations.json', import.meta.url), 'utf8'));
const index = createAnnotationIndex(data);

const wordsOf = (surah, ayah) => cleanAyahText(quran[surah - 1].ayahs[ayah - 1].text.replace(/^﻿/, '')).split(/\s+/).filter(w => w && !isWaqfMark(w));
const info = (surah, ayah) => ({ text: cleanAyahText(quran[surah - 1].ayahs[ayah - 1].text.replace(/^﻿/, '')), number: 1, surahName: quran[surah - 1].name });

test('سلامة الجدول: فهارس القواعد والكلمات صحيحة لكل آية', () => {
    const bad = [];
    for (const [key, flat] of Object.entries(data.ayahs)) {
        const [s, a] = key.split(':').map(Number);
        const n = wordsOf(s, a).length;
        if (flat.length % 3) { bad.push(key + ' طول'); continue; }
        for (let i = 0; i < flat.length; i += 3) {
            if (!(flat[i] >= 0 && flat[i] < data.rules.length) || !(flat[i + 1] <= flat[i + 2]) || flat[i + 2] >= n) { bad.push(`${key} [${flat.slice(i, i + 3)}] n=${n}`); break; }
        }
    }
    assert.deepEqual(bad.slice(0, 5), []);
});

test('أكثر من 6100 آية موسومة، وكل حكم من أحكام المتن ممثَّل في الجدول', () => {
    assert.ok(Object.keys(data.ayahs).length > 6100);
    const present = new Set(); Object.values(data.ayahs).forEach(f => { for (let i = 0; i < f.length; i += 3) present.add(data.rules[f[i]]); });
    const missing = [...new Set(Object.values(CATALOG_TO_ANNOTATION).flat())].filter(n => !present.has(n));
    assert.deepEqual(missing, []);
});

test('أمثلة الكتالوج كلها تؤكدها مواضع الجدول (مصدر مستقل عن اختياري اليدوي)', () => {
    const problems = [];
    getAllRulesFlat().forEach(({ rule }) => {
        if (!index.has(rule.id)) return;                       // لام الفعل والمد الطبيعي غير موسومين
        [['example', rule.example], ['practiceExample', rule.practiceExample], ...(rule.extraExamples || []).map((e, i) => ['extra' + i, e])].forEach(([f, ex]) => {
            const words = wordsOf(ex.surah, ex.ayah); const joined = words.join(' ');
            let ranges = findPhraseRanges(joined, ex.highlight); if (ex.firstOnly) ranges = ranges.slice(0, 1);
            let pos = 0; const hw = new Set();
            words.forEach((w, i) => { if (ranges.some(([x, y]) => pos < y && pos + w.length > x)) hw.add(i); pos += w.length + 1; });
            const occ = index.occurrences(ex.surah, ex.ayah, rule.id);
            const hit = occ.some(o => { for (let w = o.w1; w <= o.w2; w++) if (hw.has(w)) return true; return false; });
            if (!hit) problems.push(`${rule.id}.${f} ${ex.surah}:${ex.ayah}`);
        });
    });
    assert.deepEqual(problems, []);
});

test('حقائق معروفة: متصل «جاء»، إخفاء شفوي «ترميهم بحجارة»، شمسية «الناس»، إقلاب «عليم بذات»', () => {
    const sk = (t) => buildStrippedCharMap(t).stripped;   // مقارنة بالهيكل الحرفي (تتجاهل التشكيل وفروق الرسم)
    const at = (s, a, rule) => index.occurrences(s, a, rule).map(o => sk(wordsOf(s, a).slice(o.w1, o.w2 + 1).join(' ')));
    assert.ok(at(110, 1, 'madd_wajib_muttasil').some(w => w.includes(sk('جَآءَ'))));
    assert.ok(at(105, 4, 'ikhfa_shafawi').length === 1);
    assert.ok(at(114, 1, 'idgham_shamsi').some(w => w.includes(sk('ٱلنَّاسِ'))));
    assert.ok(at(67, 13, 'iqlab').length === 1);
    assert.ok(at(1, 5, 'madd_arid_sukun').some(w => w.includes(sk('نَسۡتَعِينُ'))), 'عارض «نستعين» عند الوقف');
});

test('مجموعة آيات الطالب: نطاق الناس ← الفيل يشمل 114:1 و105:5 ولا يشمل سورة قبله (104)', () => {
    const surahsData = quran.map(s => ({ number: s.number, name: cleanName(s.name), ayahsCount: s.ayahs.length }));
    const range = resolveRange(surahsData, { memoFrom: surahsData[113].name, memoTo: surahsData[104].name }, [])   // نفس صيغة الأسماء في ملف الطالب (مُشكَّلة);
    assert.ok(range.ok, JSON.stringify(range));
    const pool = memorizedAyahsFromPath(buildPath(surahsData, range));
    const has = (s, a) => pool.some(x => x.surah === s && x.ayah === a);
    assert.ok(has(114, 1) && has(105, 5) && has(112, 3));
    assert.ok(!has(104, 1) && !has(1, 1));
    assert.equal(pool.length, 48, 'الناس 6 + الفلق 5 + الإخلاص 4 + المسد 5 + النصر 3 + الكافرون 6 + الكوثر 3 + الماعون 7 + قريش 4 + الفيل 5');
});

test('مرشَّحو حكم من حفظ الطالب: تُرجَع آيات فيها الحكم فعلاً، والترتيب عشوائي', () => {
    const pool = []; for (let a = 1; a <= 5; a++) pool.push({ surah: 105, ayah: a }); for (let a = 1; a <= 4; a++) pool.push({ surah: 106, ayah: a });
    const c = findCandidateAyahs(index, 'madd_badal', pool);
    assert.ok(c.length >= 1);
    c.forEach(x => assert.ok(index.occurrences(x.surah, x.ayah, 'madd_badal').length > 0));
    assert.deepEqual(findCandidateAyahs(index, 'iqlab', [{ surah: 112, ayah: 1 }]), []);
});

test('سؤال من الجدول: الجواب كلمة موسومة والمشتِّتات ليست من أي موضع للحكم في الآية', () => {
    const rule = getAllRulesFlat().find(x => x.rule.id === 'izhar_shafawi').rule;
    const problems = [];
    for (let s = 105; s <= 114; s++) for (let a = 1; a <= quran[s - 1].ayahs.length; a++) {
        const occ = index.occurrences(s, a, 'izhar_shafawi'); if (!occ.length) continue;
        for (let n = 0; n < 5; n++) {
            const q = generateAnnotatedQuestion('discover_in_ayah', rule, info(s, a), occ);
            if (!q) continue;
            const covered = new Set(); occ.forEach(o => { for (let w = o.w1; w <= o.w2; w++) covered.add(w); });
            if (!covered.has(q.correctIndex)) problems.push(`${s}:${a} الجواب غير موسوم`);
            const wrong = q.options.filter(o => o.index !== q.correctIndex && covered.has(o.index));
            if (wrong.length) problems.push(`${s}:${a} مشتِّت صحيح ${wrong[0].word}`);
            if (q.options.length < 3) problems.push(`${s}:${a} خيارات قليلة`);
        }
    }
    assert.deepEqual(problems, []);
});

test('تحدي المرحلة يقبل مدخل «آية من الحفظ» ({ayahInfo, occurrences}) ومدخل الكتالوج معاً', () => {
    const stage = TAJWEED_STAGES.find(s => s.id === 'meem_sakinah');
    const entries = {};
    stage.rules.forEach(r => {
        const ex = r.example; const occ = index.occurrences(ex.surah, ex.ayah, r.id);
        entries[r.id] = r.id === 'izhar_shafawi' ? { ayahInfo: info(ex.surah, ex.ayah), occurrences: occ } : info(ex.surah, ex.ayah);
    });
    const qs = buildStageChallengeQuestions('meem_sakinah', entries);
    assert.ok(qs.length >= 3);
    assert.ok(qs.some(q => q.type === 'choose_rule'));
});

console.log(`\n${pass} نجح، ${fail} فشل`);
if (fail) process.exit(1);
