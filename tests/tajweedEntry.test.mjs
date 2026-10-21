// tests/tajweedEntry.test.mjs — node tests/tajweedEntry.test.mjs
// فحوص محرك شاشة الدخول (engine/tajweedEntry.js): ملخص الطالب، المواظبة، نظرة الصف، الترتيب، أوائل الفئات، «منذ كم».
import assert from 'node:assert/strict';
import { TAJWEED_STAGES, getAllRulesFlat } from '../engine/tajweedRulesCatalog.js';
import { applyLearned, applyPracticeResult, applyExamResult, applyTeacherResult, statusFromJourney } from '../engine/tajweedJourney.js';
import {
    DAY_MS, summarizeStudent, currentStreak, sortByRecency, pickPreselected, classOverview, sortForTeacher, topStudents, timeAgo
} from '../engine/tajweedEntry.js';

let pass = 0, fail = 0;
const test = (name, fn) => { try { fn(); pass++; console.log('✅ ' + name); } catch (e) { fail++; console.log('❌ ' + name + '\n   ' + e.message); } };

const NOW = new Date('2026-10-17T12:00:00Z').getTime();
const flat = getAllRulesFlat();
const stageOf = (ruleId) => flat.find(x => x.rule.id === ruleId).stageId;
const empty = (ruleId) => ({ studentId: 1, stageId: stageOf(ruleId), ruleId, dimensions: { knows: 0, distinguishes: 0, discovers: 0, applies: 0, recalls: 0, pronounces: 0 }, status: 'available', attemptsCount: 0, lastPracticedAt: null, masteredAt: null });
// سجل بخطوات الرحلة المطلوبة: 'learn' | 'practice' | 'exam' | 'mastered'
function rec(ruleId, upTo) {
    let r = empty(ruleId);
    const order = ['learn', 'practice', 'exam', 'mastered'];
    const n = order.indexOf(upTo);
    if (n >= 0) r = applyLearned(r);
    if (n >= 1) r = applyPracticeResult(r, 95);
    if (n >= 2) r = applyExamResult(r, 100).record;
    if (n >= 3) r = applyTeacherResult(r, 100).record;
    r.attemptsCount = n >= 0 ? 1 : 0;
    r.status = statusFromJourney(r, r.status);
    return r;
}
const masterAllIn = (stageIds) => flat.filter(x => stageIds.includes(x.stageId)).map(x => rec(x.rule.id, 'mastered'));
const sess = (daysAgo, hour = 10) => ({ timestamp: new Date(NOW - daysAgo * DAY_MS).toISOString().replace(/T\d\d/, `T${String(hour).padStart(2, '0')}`) });
const stu = (id, name) => ({ id, name });
const sum = (o = {}) => summarizeStudent({ student: stu(o.id || 1, o.name || 'أ'), mastery: o.mastery || [], sessions: o.sessions || [], dueRuleIds: o.due || [], now: NOW });

test('طالب جديد: لم يبدأ، صفر%، حكمه الحالي أول حكم بخطوة الشرح، والمرحلة الأولى نشطة', () => {
    const s = sum();
    assert.equal(s.started, false); assert.equal(s.progressPct, 0); assert.equal(s.done, 0);
    assert.deepEqual([s.current.stageId, s.current.ruleId, s.current.step], [TAJWEED_STAGES[0].id, TAJWEED_STAGES[0].rules[0].id, 'learn']);
    assert.equal(s.stageCounts[0].active, true); assert.equal(s.stageCounts[0].unlocked, true);
    assert.equal(s.stageCounts[1].unlocked, false);
    assert.equal(s.lastTs, null); assert.equal(s.streak, 0); assert.equal(s.allDone, false);
});

test('«فهمت» وحدها تجعل الطالب «بدأ» (بلا محاولات)', () => {
    const r = applyLearned(empty('qalqalah')); r.attemptsCount = 0;
    assert.equal(sum({ mastery: [r] }).started, true);
});

test('إتقان «تعرّف على مصحفك» ثم القلقلة ينقل الحكم الحالي إلى المرحلة التالية ويفتحها، ويزيد المتقن والنسبة', () => {
    const s = sum({ mastery: [...masterAllIn(['know_mushaf']), rec('qalqalah', 'mastered'), rec('ghunna_wajiba', 'practice')] });
    assert.equal(s.done, 9);   // 8 دروس مصحف + القلقلة
    assert.equal(s.current.ruleId, 'ghunna_wajiba'); assert.equal(s.current.step, 'exam');
    assert.equal(s.stageCounts[0].complete, true); assert.equal(s.stageCounts[1].complete, true); assert.equal(s.stageCounts[2].unlocked, true); assert.equal(s.stageCounts[2].active, true);
    assert.ok(s.progressPct > 0 && s.progressPct < 100);
});

test('الحكم الحالي داخل مرحلة متعددة الأحكام: أول غير متقن، مع موضعه وعدد أحكام مرحلته', () => {
    const early = TAJWEED_STAGES.slice(0, 3).map(s => s.id);
    const meem = TAJWEED_STAGES[3];
    const s = sum({ mastery: [...masterAllIn(early), rec(meem.rules[0].id, 'mastered'), rec(meem.rules[1].id, 'learn')] });
    assert.equal(s.current.ruleId, meem.rules[1].id); assert.equal(s.current.ruleIndex, 1); assert.equal(s.current.ruleCount, meem.rules.length);
    assert.equal(s.current.step, 'practice');
});

test('إتقان كل الأحكام: لا حكم حالياً و allDone و100%', () => {
    const s = sum({ mastery: masterAllIn(TAJWEED_STAGES.map(x => x.id)) });
    assert.equal(s.current, null); assert.equal(s.allDone, true); assert.equal(s.done, flat.length); assert.equal(s.progressPct, 100);
    assert.ok(s.stageCounts.every(c => c.complete && !c.active));
});

test('المواظبة الحالية: متتالية تنتهي اليوم أو أمس، وتنقطع بغياب يوم كامل', () => {
    assert.equal(currentStreak([sess(0), sess(1), sess(2)], NOW), 3);
    assert.equal(currentStreak([sess(1), sess(2)], NOW), 2);          // آخر نشاط أمس: السلسلة قائمة
    assert.equal(currentStreak([sess(2), sess(3)], NOW), 0);          // آخر نشاط قبل يومين: انقطعت
    assert.equal(currentStreak([sess(0), sess(2), sess(3)], NOW), 1); // ثغرة أمس
    assert.equal(currentStreak([sess(0, 8), sess(0, 22)], NOW), 1);   // أكثر من جلسة في اليوم = يوم واحد
    assert.equal(currentStreak([], NOW), 0);
});

test('آخر نشاط وجلسات الأسبوع', () => {
    const s = sum({ sessions: [sess(0), sess(3), sess(10)] });
    assert.equal(new Date(s.lastTs).toISOString().slice(0, 10), '2026-10-17'); assert.equal(s.weekSessions, 2);
});

test('المراجعات المستحقة تُحسب من القائمة الممرَّرة', () => { assert.equal(sum({ due: ['qalqalah', 'izhar'] }).due, 2); });

test('الأحدث نشاطاً أولاً، ومن لم يدخل في الآخر، والتعادل بالاسم', () => {
    const a = sum({ id: 1, name: 'ب', sessions: [sess(5)] }), b = sum({ id: 2, name: 'أ', sessions: [sess(1)] }), c = sum({ id: 3, name: 'ج' }), d = sum({ id: 4, name: 'ت', sessions: [sess(5)] });
    assert.deepEqual(sortByRecency([a, c, b, d]).map(s => s.student.name), ['أ', 'ب', 'ت', 'ج']);
});

test('التحديد المسبق: الأحدث نشاطاً إن كان ضمن 14 يوماً، وإلا لا أحد (لا دخول صامت)', () => {
    const recent = sum({ id: 1, name: 'أ', sessions: [sess(3)] }), old = sum({ id: 2, name: 'ب', sessions: [sess(30)] }), never = sum({ id: 3, name: 'ج' });
    assert.equal(pickPreselected([old, recent, never], NOW).student.name, 'أ');
    assert.equal(pickPreselected([old, never], NOW), null);
    assert.equal(pickPreselected([], NOW), null);
});

test('نظرة الصف: مراجعات، غائبون (بدأوا ولم يدخلوا منذ يومين)، لم يبدؤوا، أتمّوا', () => {
    const active = sum({ id: 1, mastery: [rec('qalqalah', 'practice')], sessions: [sess(0)] });
    const idle = sum({ id: 2, mastery: [rec('qalqalah', 'practice')], sessions: [sess(5)], due: ['qalqalah'] });
    const fresh = sum({ id: 3 });
    const done = sum({ id: 4, mastery: masterAllIn(TAJWEED_STAGES.map(x => x.id)), sessions: [sess(1)] });
    assert.deepEqual(classOverview([active, idle, fresh, done], NOW), { total: 4, withDue: 1, idle: 1, notStarted: 1, allDone: 1 });
    assert.equal(classOverview([], NOW).total, 0);
});

test('ترتيب المعلم: بالتقدّم، بالاسم، وبمن يحتاج انتباهاً (مراجعات ثم غياب ثم لم يبدأ)', () => {
    const a = sum({ id: 1, name: 'ب', mastery: [rec('qalqalah', 'mastered')], sessions: [sess(0)] });
    const b = sum({ id: 2, name: 'أ', mastery: [rec('qalqalah', 'practice')], sessions: [sess(0)], due: ['qalqalah'] });
    const c = sum({ id: 3, name: 'ج' });
    const d = sum({ id: 4, name: 'د', mastery: [rec('qalqalah', 'learn')], sessions: [sess(6)] });
    const names = (by) => sortForTeacher([a, b, c, d], by, NOW).map(s => s.student.name);
    assert.deepEqual(names('progress'), ['ب', 'أ', 'د', 'ج']);
    assert.deepEqual(names('name'), ['ب', 'أ', 'ج', 'د'].sort((x, y) => x.localeCompare(y, 'ar')));
    assert.deepEqual(names('attention'), ['أ', 'د', 'ج', 'ب']);
});

test('أوائل الفئات: لا يظهر من ليس له شيء في الفئة، والحد الأقصى ثلاثة', () => {
    const mk = (id, n, streak, done, week) => ({ ...sum({ id, name: n }), streak, done, weekSessions: week });
    const L = [mk(1, 'أ', 5, 3, 7), mk(2, 'ب', 1, 0, 0), mk(3, 'ج', 3, 8, 2), mk(4, 'د', 9, 1, 4), mk(5, 'هـ', 2, 2, 1)];
    const t = topStudents(L);
    assert.deepEqual(t.streak.map(s => s.student.name), ['د', 'أ', 'ج']);
    assert.deepEqual(t.mastered.map(s => s.student.name), ['ج', 'أ', 'هـ']);
    assert.deepEqual(t.weekly.map(s => s.student.name), ['أ', 'د', 'ج']);
    assert.ok(!t.streak.some(s => s.student.name === 'ب') && !t.weekly.some(s => s.student.name === 'ب'));
});

test('«منذ كم»', () => {
    assert.deepEqual(timeAgo(NOW - 30000, NOW), { key: 'now', n: 0 });
    assert.deepEqual(timeAgo(NOW - 20 * 60000, NOW), { key: 'min', n: 20 });
    assert.deepEqual(timeAgo(NOW - 5 * 3600000, NOW), { key: 'hour', n: 5 });
    assert.deepEqual(timeAgo(NOW - 3 * DAY_MS, NOW), { key: 'day', n: 3 });
    assert.deepEqual(timeAgo(null, NOW), { key: 'never', n: 0 });
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
