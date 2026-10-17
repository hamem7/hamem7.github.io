// tests/tajweedJourney.test.mjs — node tests/tajweedJourney.test.mjs
// رحلة الحكم (شرح ← تطبيق ← اختبار ← اعتماد المعلم) + سؤال التمييز + منشئ اختبار الحكم لكل أحكام الكتالوج.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cleanAyahText } from '../engine/quranEngine.js';
import { getAllRulesFlat } from '../engine/tajweedRulesCatalog.js';
import {
    emptyJourney, ensureJourney, journeyStep, journeyPercent, canTakeExam, canTeacherCheck,
    applyLearned, applyPracticeResult, applyExamResult, applyTeacherResult, statusFromJourney,
    EXAM_PASS_SCORE, EXAM_SIZE, EXAM_MIN_SIZE
} from '../engine/tajweedJourney.js';
import { applySessionToMastery, generateIdentifyQuestion, buildExamQuestions, rulesConflict, computeStageProgress, isStageUnlocked } from '../engine/tajweedEngine.js';
import { createAnnotationIndex, memorizedAyahsFromPath, findCandidateAyahs } from '../engine/tajweedAnnotations.js';
import { resolveRange, buildPath } from '../engine/trackingEngine.js';
import { createEmptyMasteryRecord } from '../database/tajweedDB.js';

let pass = 0, fail = 0;
const test = (name, fn) => { try { fn(); pass++; console.log('✅ ' + name); } catch (e) { fail++; console.log('❌ ' + name + '\n   ' + e.message); } };

const quran = JSON.parse(fs.readFileSync(new URL('../database/quran-uthmani.json', import.meta.url), 'utf8')).data.surahs;
const index = createAnnotationIndex(JSON.parse(fs.readFileSync(new URL('../database/data/tajweedAnnotations.json', import.meta.url), 'utf8')));
const info = (s, a) => ({ text: cleanAyahText(quran[s - 1].ayahs[a - 1].text.replace(/^﻿/, '')), number: 1, surahName: quran[s - 1].name });
const fresh = (ruleId = 'izhar_qamari', stageId = 'lam_al') => createEmptyMasteryRecord(1, stageId, ruleId);

test('الرحلة الكاملة: شرح ← تطبيق ← اختبار ← المعلم ← متقن، والنسبة ٠/٢٥/٥٠/٧٥/١٠٠', () => {
    let r = fresh();
    assert.equal(journeyStep(ensureJourney(r)), 'learn'); assert.equal(journeyPercent(r), 0);
    r = applyLearned(r); assert.equal(journeyStep(r.journey), 'practice'); assert.equal(journeyPercent(r), 25);
    r = applyPracticeResult(r, 50); assert.equal(journeyStep(r.journey), 'practice', 'أقل من 60% لا يُنجز التطبيق');
    r = applyPracticeResult(r, 75); assert.equal(journeyStep(r.journey), 'exam'); assert.equal(journeyPercent(r), 50);
    const ex = applyExamResult(r, 88); r = ex.record; assert.ok(ex.passed);
    assert.equal(journeyStep(r.journey), 'awaiting_teacher'); assert.equal(journeyPercent(r), 75);
    const t1 = applyTeacherResult(r, 60); assert.ok(!t1.approved); assert.equal(journeyStep(t1.record.journey), 'awaiting_teacher');
    const t2 = applyTeacherResult(r, 70); assert.ok(t2.approved); assert.equal(journeyStep(t2.record.journey), 'mastered'); assert.equal(journeyPercent(t2.record), 100);
    assert.equal(statusFromJourney(t2.record, 'in_progress'), 'mastered');
});

test('رسوب الاختبار: لا إعادة قبل جلسة تطبيق ناجحة جديدة', () => {
    let r = applyPracticeResult(applyLearned(fresh()), 90);
    assert.ok(canTakeExam(r.journey));
    const fail1 = applyExamResult(r, 62); r = fail1.record; assert.ok(!fail1.passed);
    assert.ok(!canTakeExam(r.journey)); assert.equal(journeyStep(r.journey), 'practice');
    r = applyPracticeResult(r, 40); assert.ok(!canTakeExam(r.journey), 'تطبيق راسب لا يفكّ القفل');
    r = applyPracticeResult(r, 65); assert.ok(canTakeExam(r.journey));
    assert.equal(r.journey.examAttempts.length, 1); assert.equal(r.journey.examAttempts[0].passed, false);
});

test('درجة النجاح 80% بالضبط: 79 رسوب و80 نجاح', () => {
    const base = applyPracticeResult(applyLearned(fresh()), 100);
    assert.ok(!applyExamResult(base, 79).passed); assert.ok(applyExamResult(base, 80).passed); assert.equal(EXAM_PASS_SCORE, 80);
});

test('المعلم لا يعتمد قبل اجتياز الاختبار حتى لو بدرجة كاملة', () => {
    const r = applyPracticeResult(applyLearned(fresh()), 100);
    const out = applyTeacherResult(r, 100); assert.ok(!out.approved); assert.ok(!canTeacherCheck(out.record.journey));
});

test('الدوال لا تعدّل السجل الأصلي (نسخ)', () => {
    const r = fresh(); const before = JSON.stringify(r);
    applyLearned(r); applyPracticeResult(r, 90); applyExamResult(r, 90); applyTeacherResult(r, 90);
    assert.equal(JSON.stringify(r), before);
});

test('ترحيل السجلات القديمة: متقن سابقاً ← معتمد كاملاً؛ بدأ التدرّب ← خطوة التطبيق؛ جديد ← الشرح', () => {
    assert.equal(journeyStep(ensureJourney({ status: 'mastered', masteredAt: '2026-01-01' })), 'mastered');
    assert.equal(journeyStep(ensureJourney({ status: 'in_progress', attemptsCount: 4 })), 'practice');
    assert.equal(journeyStep(ensureJourney({ status: 'available', attemptsCount: 0 })), 'learn');
    assert.equal(journeyStep(ensureJourney(null)), 'learn');
});

test('«متقن» لا يأتي من الأبعاد الست وحدها: أبعاد 100 بلا اعتماد المعلم = قيد التقدّم', () => {
    let r = fresh(); r.dimensions = { knows: 100, distinguishes: 100, discovers: 100, applies: 100, recalls: 100, pronounces: 100 };
    const out = applySessionToMastery(r, 'choose_rule', 100);
    assert.notEqual(out.status, 'mastered'); assert.equal(out.status, 'in_progress');
    const approved = applyTeacherResult(applyExamResult(applyPracticeResult(applyLearned(fresh()), 100), 100).record, 90).record;
    assert.equal(applySessionToMastery(approved, 'review', 100).status, 'mastered');
});

test('قفل المراحل: المرحلة تكتمل (وتُفتح التالية) فقط حين تُعتمد كل أحكامها من المعلم', () => {
    const stageRules = ['qalqalah'];
    const approved = applyTeacherResult(applyExamResult(applyPracticeResult(applyLearned(fresh('qalqalah', 'qalqalah')), 100), 100).record, 90).record;
    approved.status = statusFromJourney(approved, approved.status);
    const notYet = applyPracticeResult(applyLearned(fresh('qalqalah', 'qalqalah')), 100); notYet.status = statusFromJourney(notYet, 'available');
    assert.equal(computeStageProgress('qalqalah', [notYet]).status, 'in_progress');
    const p1 = computeStageProgress('qalqalah', [approved]); assert.equal(p1.status, 'completed');
    assert.ok(isStageUnlocked('meem_noon_mushaddadah', { qalqalah: p1 }));
    assert.ok(!isStageUnlocked('meem_noon_mushaddadah', { qalqalah: computeStageProgress('qalqalah', [notYet]) }));
});

test('rulesConflict: اللازم العام مع أنواعه الأربعة، والغنة مع الإدغامات', () => {
    assert.ok(rulesConflict('madd_lazim', 'lazim_kalami_muthaqqal') && rulesConflict('lazim_harfi_mukhaffaf', 'madd_lazim'));
    assert.ok(rulesConflict('ghunna_wajiba', 'idgham_shafawi') && rulesConflict('idgham_shafawi', 'mithlain'));
    assert.ok(!rulesConflict('izhar_qamari', 'idgham_shamsi') && !rulesConflict('madd_tabii', 'madd_tabii'));
});

// مصادر اختبار حكم من الكتالوج (بلا حفظ طالب) أو من مجموعة آيات طالب نطاقه الناس ← الفيل
function catalogSources(rule) {
    return [rule.example, rule.practiceExample, ...(rule.extraExamples || [])].map(ex => ({ ayahInfo: info(ex.surah, ex.ayah), surah: ex.surah, ayah: ex.ayah, highlight: ex.highlight, firstOnly: ex.firstOnly, skipQuestion: ex.skipQuestion }));
}
const conflicts = (ruleId, source, covered) => index.has(ruleId) && index.occurrences(source.surah, source.ayah, ruleId).some(o => { for (let w = o.w1; w <= o.w2; w++) if (covered.has(w)) return true; return false; });

test('اختبار كل حكم من أمثلة الكتالوج: من 5 إلى 8 أسئلة، فيها «اختر الحكم» و«ما حكم المظلَّل»', () => {
    const bad = [];
    getAllRulesFlat().forEach(({ rule }) => {
        const qs = buildExamQuestions(rule, catalogSources(rule), { conflicts });
        if (qs.length < EXAM_MIN_SIZE || qs.length > EXAM_SIZE) bad.push(`${rule.id}: ${qs.length} سؤالاً`);
        if (!qs.some(q => q.type === 'choose_rule')) bad.push(`${rule.id}: لا اختر الحكم`);
        if (!qs.some(q => q.type === 'identify_rule')) bad.push(`${rule.id}: لا تمييز`);
    });
    assert.deepEqual(bad, []);
});

test('سؤال «ما حكم المظلَّل»: الصحيح بين الخيارات، 3-4 خيارات فريدة، ولا مشتِّت متعارض مع الحكم', () => {
    const bad = [];
    getAllRulesFlat().forEach(({ rule }) => {
        catalogSources(rule).forEach(src => {
            for (let n = 0; n < 6; n++) {
                const q = generateIdentifyQuestion(rule, src, { conflicts });
                if (!q) continue;
                const ids = q.options.map(o => o.ruleId);
                if (!ids.includes(rule.id)) bad.push(`${rule.id}: الصحيح غائب`);
                if (new Set(ids).size !== ids.length || ids.length < 3 || ids.length > 4) bad.push(`${rule.id}: خيارات ${ids.length}`);
                ids.filter(i => i !== rule.id).forEach(i => { if (rulesConflict(rule.id, i)) bad.push(`${rule.id} ⟷ ${i} متعارضان`); });
            }
        });
    });
    assert.deepEqual([...new Set(bad)], []);
});

test('اختبار من آيات حفظ طالب (الناس ← الفيل): أسئلة موسومة «من الحفظ» وتتجاوز الحد الأدنى', () => {
    const surahsData = quran.map(s => ({ number: s.number, name: s.name.replace(/سُورَةُ\s*/, '').trim(), ayahsCount: s.ayahs.length }));
    const range = resolveRange(surahsData, { memoFrom: surahsData[113].name, memoTo: surahsData[104].name }, []);
    const pool = memorizedAyahsFromPath(buildPath(surahsData, range));
    const rule = getAllRulesFlat().find(x => x.rule.id === 'izhar_qamari').rule;
    const cands = findCandidateAyahs(index, rule.id, pool).slice(0, 7);
    assert.ok(cands.length >= 2);
    const sources = cands.map(c => ({ ayahInfo: info(c.surah, c.ayah), occurrences: c.occurrences, surah: c.surah, ayah: c.ayah }));
    const qs = buildExamQuestions(rule, sources, { conflicts });
    assert.ok(qs.length >= EXAM_MIN_SIZE && qs.length <= EXAM_SIZE, 'عدد ' + qs.length);
    assert.ok(qs.filter(q => q.fromHifz).length >= 2);
});

console.log(`\n${pass} نجح، ${fail} فشل`);
if (fail) process.exit(1);
