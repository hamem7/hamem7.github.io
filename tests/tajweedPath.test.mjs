// tests/tajweedPath.test.mjs — node tests/tajweedPath.test.mjs
// مسار الحكم المتصل: نتائج الألعاب والمتوسط، اعتماد المعلم بضغطة، نقطة التوقف، تنويع الاختبار، وملخص الحصة الصادق.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cleanAyahText } from '../engine/quranEngine.js';
import { getAllRulesFlat, getTajweedRule } from '../engine/tajweedRulesCatalog.js';
import {
    ensureJourney, journeyStep, applyLearned, applyGameResult, nextGameKey, applyExamResult, applyTeacherApproval, applyAudioHeard, setResume, clearResume,
    GAMES_PASS_SCORE, EXAM_MIN_SIZE
} from '../engine/tajweedJourney.js';
import { gamesForRule, gamesForRuleId } from '../engine/tajweedPath.js';
import { buildVariedExamQuestions, examKindsOf } from '../engine/tajweedExamVariety.js';
import { RULE_FACTS } from '../engine/tajweedFacts.js';
import { buildLessonModel, formatLessonSummary } from '../engine/tajweedLessonSummary.js';
import { createEmptyMasteryRecord } from '../database/tajweedDB.js';

let pass = 0, fail = 0;
const test = (name, fn) => { try { fn(); pass++; console.log('✅ ' + name); } catch (e) { fail++; console.log('❌ ' + name + '\n   ' + e.message); } };
const fresh = (ruleId = 'qalqalah', stageId = 'qalqalah') => createEmptyMasteryRecord(1, stageId, ruleId);

test('ألعاب الحكم: تدرّب دائماً، والحروف لأحكام الحروف، والشجرة، والربط لمرحلة بأكثر من حكم', () => {
    assert.deepEqual(gamesForRuleId('qalqalah'), ['practice', 'letters', 'tree']);
    assert.ok(gamesForRuleId('izhar').includes('link'), 'مرحلة النون الساكنة بأحكام متعدّدة');
    assert.ok(gamesForRuleId('madd_tabii').includes('practice'));
    getAllRulesFlat().forEach(({ rule, stageId }) => assert.ok(gamesForRule(rule, stageId).length >= 1));
});

test('الألعاب: لا تُنجز الخطوة قبل لعب كلها، ثم متوسط ≥ 75% يُنجزها', () => {
    const req = ['practice', 'letters', 'tree'];
    let r = applyLearned(fresh());
    r = applyGameResult(r, 'practice', 100, req); assert.equal(journeyStep(r.journey), 'practice'); assert.equal(r.journey.gamesAvg, null);
    assert.equal(nextGameKey(r.journey, req), 'letters');
    r = applyGameResult(r, 'letters', 50, req); assert.equal(nextGameKey(r.journey, req), 'tree');
    r = applyGameResult(r, 'tree', 40, req);
    assert.equal(r.journey.gamesAvg, 63); assert.equal(journeyStep(r.journey), 'practice', 'المتوسط 63% أقل من الحد');
    assert.equal(nextGameKey(r.journey, req), 'tree', 'الأضعف يُعاد');
    r = applyGameResult(r, 'tree', 90, req);
    assert.equal(r.journey.gamesAvg, 80); assert.ok(r.journey.practicePassedAt); assert.equal(journeyStep(r.journey), 'exam'); assert.equal(nextGameKey(r.journey, req), null);
    assert.ok(GAMES_PASS_SCORE === 75);
});

test('لعبة مفردة (حكم بلعبة تدرّب وحدها) تُنجز الخطوة بنتيجتها', () => {
    const r = applyGameResult(applyLearned(fresh('madd_tabii', 'madd')), 'practice', 80, ['practice']);
    assert.equal(journeyStep(r.journey), 'exam');
});

test('بعد رسوب الاختبار: لا إعادة قبل لعبة ≥ 60%، ثم تُفتح الإعادة', () => {
    const req = ['practice'];
    let r = applyGameResult(applyLearned(fresh()), 'practice', 100, req);
    r = applyExamResult(r, 40).record; assert.equal(journeyStep(r.journey), 'practice');
    r = applyGameResult(r, 'practice', 50, req); assert.equal(journeyStep(r.journey), 'practice');
    r = applyGameResult(r, 'practice', 70, req); assert.equal(journeyStep(r.journey), 'exam');
});

test('اعتماد المعلم بضغطة: لا قبل اجتياز الاختبار، وبعده يصير متقناً', () => {
    let r = applyGameResult(applyLearned(fresh()), 'practice', 100, ['practice']);
    assert.equal(applyTeacherApproval(r).approved, false);
    r = applyExamResult(r, 100, new Date(), ['identify', 'tf']).record;
    assert.deepEqual(r.journey.examKinds, ['identify', 'tf']);
    assert.equal(journeyStep(r.journey), 'awaiting_teacher');
    const ap = applyTeacherApproval(r); assert.equal(ap.approved, true); assert.equal(journeyStep(ap.record.journey), 'mastered');
});

test('نقطة التوقف والاستماع تُحفظ وتُمسح بلا مساس ببقية الرحلة', () => {
    let r = applyLearned(fresh());
    r = applyAudioHeard(r); assert.ok(r.journey.audioAt);
    r = setResume(r, { mode: 'practice', questions: [{ type: 'x' }], qIndex: 2 }); assert.equal(r.journey.resume.qIndex, 2); assert.ok(r.journey.resume.savedAt);
    assert.ok(r.journey.learnedAt);
    r = clearResume(r); assert.equal(r.journey.resume, null); assert.ok(r.journey.audioAt);
    assert.equal(ensureJourney({}).resume, null);
});

test('الحقائق المكتوبة: كل حكم له صواب وخطأ، بلا تكرار، وبلا آيات', () => {
    Object.entries(RULE_FACTS).forEach(([id, list]) => {
        assert.ok(getAllRulesFlat().some(x => x.rule.id === id), id + ' غير موجود في الكتالوج');
        assert.ok(list.some(f => f.truth) && list.some(f => !f.truth), id + ' يحتاج صواباً وخطأ');
        assert.equal(new Set(list.map(f => f.text)).size, list.length, id + ' عبارة مكرّرة');
        list.forEach(f => assert.ok(!/[﴿﴾۞]/.test(f.text), 'نص قرآني في ' + f.text));
    });
});

// مصادر اختبار حقيقية من الكتالوج (آية + عبارة) كما تفعل buildExamSources
const quran = JSON.parse(fs.readFileSync(new URL('../database/quran-uthmani.json', import.meta.url), 'utf8')).data.surahs;
const sourcesOf = (rule) => [rule.example, rule.practiceExample, ...(rule.extraExamples || [])].map(ex => {
    const a = quran[ex.surah - 1].ayahs[ex.ayah - 1];
    return { ayahInfo: { text: cleanAyahText(a.text.replace(/^﻿/, '')), number: a.number, surahName: quran[ex.surah - 1].name }, surah: ex.surah, ayah: ex.ayah, highlight: ex.highlight, firstOnly: ex.firstOnly };
});

function checkQuestion(q, ruleId) {
    assert.equal(q.ruleId, ruleId); assert.ok(q.kind, 'نوع السؤال');
    if (q.type === 'choose_rule' || q.type === 'identify_rule') { assert.ok(q.options.some(o => o.ruleId === q.correctRuleId)); assert.equal(new Set(q.options.map(o => o.ruleId)).size, q.options.length); }
    else if (q.type === 'tf_statement') { assert.equal(typeof q.truth, 'boolean'); assert.ok(q.text || (q.letter && q.ruleNameKey)); }
    else if (q.type === 'spot_rule') { assert.ok(q.options.some(o => o.value === q.correctValue)); assert.equal(new Set(q.options.map(o => o.value)).size, q.options.length); assert.ok(q.options.length >= 3); }
    else if (q.type === 'apply_new_ayah') { assert.ok(q.options.some(o => o.index === q.correctIndex)); }
    else assert.fail('نوع غير متوقع ' + q.type);
}

test('اختبار متنوع لكل حكم في الكتالوج: حجم مقبول وأسئلة سليمة وأنواع متعدّدة', () => {
    const problems = [];
    getAllRulesFlat().filter(x => !x.rule.mushaf).forEach(({ rule }) => {   // دروس المصحف: tests/tajweedMushaf.test.mjs
        for (let n = 0; n < 10; n++) {
            const qs = buildVariedExamQuestions(rule, sourcesOf(rule), { prevKinds: [] });
            try {
                qs.forEach(q => checkQuestion(q, rule.id));
                if (qs.length < EXAM_MIN_SIZE) problems.push(`${rule.id}: ${qs.length} أسئلة فقط`);
                if (examKindsOf(qs).length < 3) problems.push(`${rule.id}: أنواع قليلة ${examKindsOf(qs)}`);
            } catch (e) { problems.push(`${rule.id}: ${e.message}`); break; }
        }
    });
    assert.deepEqual(problems, []);
});

test('التنويع: الأنواع التي لم تظهر في آخر اختبار تُقدَّم، ويبقى الاختبار بالحجم المطلوب', () => {
    const rule = getTajweedRule('noon_sakinah', 'izhar'), srcs = sourcesOf(rule);
    let moved = 0;
    for (let n = 0; n < 30; n++) {
        const a = buildVariedExamQuestions(rule, srcs, { prevKinds: [] });
        const prev = examKindsOf(a);
        const b = buildVariedExamQuestions(rule, srcs, { prevKinds: prev.filter(k => k !== 'choose').slice(0, 3) });
        assert.equal(b.length, 8);
        const bKinds = examKindsOf(b);
        if (prev.filter(k => k !== 'choose').slice(0, 3).some(k => !bKinds.includes(k)) || bKinds.length >= prev.length - 1) moved++;
    }
    assert.ok(moved >= 24, 'التشكيلة تتغيّر غالباً: ' + moved);
});

test('الإنجليزية: لا حقائق عربية في الاختبار', () => {
    const rule = getTajweedRule('noon_sakinah', 'izhar');
    for (let n = 0; n < 20; n++) assert.ok(!buildVariedExamQuestions(rule, sourcesOf(rule), { lang: 'en' }).some(q => q.kind === 'fact'));
});

// ملخص الحصة بنصوصه العربية الحقيقية من الترجمة
const i18nSrc = fs.readFileSync(new URL('../core/i18n.js', import.meta.url), 'utf8');
const ar = (() => { const m = {}; const block = i18nSrc.slice(0, i18nSrc.indexOf('tjw_stage_locked_note: "أكمل')); const re = /(tjw_(?:ls|game|sm)_[A-Za-z_0-9]+): "((?:[^"\\]|\\.)*)"/g; let x; while ((x = re.exec(block))) m[x[1]] = JSON.parse('"' + x[2] + '"'); return m; })();
const tr = (k, v = {}) => Object.entries(v).reduce((s, [a, b]) => s.split(`{${a}}`).join(b), ar[k] || k);
const ctx = (extra = {}) => ({ tr, ruleName: () => 'القلقلة', ...extra });
const NOW = new Date(2026, 9, 21, 12).getTime();
const student = { id: 1, name: 'أحمد' };

test('ملخص الحصة: لا يذكر إلا ما تمّ اليوم فعلاً', () => {
    let r = applyLearned(fresh(), new Date(NOW));
    const m0 = buildLessonModel({ student, ruleId: 'qalqalah', mastery: [r], sessions: [], now: NOW });
    const t0 = formatLessonSummary(m0, ctx());
    assert.ok(t0.includes('شرحنا الحكم') && !t0.includes('المنشاوي') && !t0.includes('لعبنا') && !t0.includes('اختبار') && !t0.includes('اعتمدتُ'), t0);
    assert.ok(t0.includes('نكمل المرة القادمة'));
    r = applyAudioHeard(r, new Date(NOW));
    const sessions = [{ ruleId: 'qalqalah', activityType: 'practice', scorePercent: 100, timestamp: new Date(NOW).toISOString() }, { ruleId: 'qalqalah', activityType: 'letters', scorePercent: 80, timestamp: new Date(NOW).toISOString() }];
    const t1 = formatLessonSummary(buildLessonModel({ student, ruleId: 'qalqalah', mastery: [r], sessions, now: NOW }), ctx());
    assert.ok(t1.includes('المنشاوي') && t1.includes('لعبنا ألعاباً') && t1.includes('تدرّب على الحكم 100%') && t1.includes('ألعاب الحروف 80%'), t1);
});

test('ملخص الحصة: الإيقاف يذكر نقطة التوقف، والاعتماد يذكر الانتقال للحكم التالي', () => {
    let r = applyLearned(fresh(), new Date(NOW));
    r = setResume(r, { mode: 'exam', questions: [1, 2, 3, 4, 5, 6, 7, 8], qIndex: 4 });
    const t = formatLessonSummary(buildLessonModel({ student, ruleId: 'qalqalah', mastery: [r], sessions: [], now: NOW }), ctx());
    assert.ok(t.includes('توقفنا عند «اختبار الحكم» (السؤال 5 من 8)'), t);
    let d = applyGameResult(applyLearned(fresh(), new Date(NOW)), 'practice', 100, ['practice'], new Date(NOW));
    d = applyExamResult(d, 100, new Date(NOW)).record; d = applyTeacherApproval(d, new Date(NOW)).record;
    const model = buildLessonModel({ student, ruleId: 'qalqalah', mastery: [d], sessions: [], now: NOW });
    assert.equal(model.approved, true); assert.equal(model.exam.passed, true);
    const t2 = formatLessonSummary(model, ctx({ nextRuleName: 'الغنة' }));
    assert.ok(t2.includes('اجتازه بنسبة 100') && t2.includes('اعتمدتُ الحكم') && t2.includes('ننتقل بإذن الله مع أحمد إلى «الغنة»') && !t2.includes('توقفنا'), t2);
});

test('ملخص الحصة: نشاط يوم سابق لا يُنسب لليوم', () => {
    const r = applyLearned(fresh(), new Date(NOW - 3 * 86400000));
    const m = buildLessonModel({ student, ruleId: 'qalqalah', mastery: [r], sessions: [], now: NOW });
    assert.equal(m.learned, false); assert.equal(m.anything, false);
    assert.ok(formatLessonSummary(m, ctx()).includes('لم نبدأ نشاطاً جديداً'));
});

console.log(`\n${pass} نجح، ${fail} فشل`);
if (fail) process.exit(1);
