// tests/tajweedSummary.test.mjs — node tests/tajweedSummary.test.mjs
// فحوص «ملخص الولي» (engine/tajweedSummary.js): نموذج الحصة والحكم، النص العربي الفعلي (من ترجمة i18n.js الحقيقية)،
// حالات الحدود (لا جلسات، آخر نشاط أمس، نشاط مرحلة بلا حكم، كل الأحكام متقنة)، ورابط واتساب.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TAJWEED_STAGES, getAllRulesFlat } from '../engine/tajweedRulesCatalog.js';
import { TAJWEED_BADGE_CATALOG } from '../engine/tajweedEngine.js';
import { MUSHAF_I18N } from '../core/i18nMushaf.js';   // ترجمات مرحلة «تعرّف على مصحفك» (تُدمج في القاموس في i18n.js)
import { applyLearned, applyPracticeResult, applyExamResult, applyTeacherResult, statusFromJourney } from '../engine/tajweedJourney.js';
import {
    MODE_ORDER, pluralKey, localDayKey, groupActivities, buildSessionSummary, buildRuleSummary, formatSummaryText, homeKeyForStep,
    cleanForCopy
} from '../engine/tajweedSummary.js';

let pass = 0, fail = 0;
const test = (name, fn) => { try { fn(); pass++; console.log('✅ ' + name); } catch (e) { fail++; console.log('❌ ' + name + '\n   ' + e.message); } };

// ترجمة حقيقية: كل مفاتيح tjw_ بقيم نصية مزدوجة التنصيص من كتلة العربية ثم الإنجليزية في i18n.js
const src = fs.readFileSync(new URL('../core/i18n.js', import.meta.url), 'utf8');
const enAt = src.indexOf('\n    en: {');
const dict = (text) => { const d = {}; for (const m of text.matchAll(/^\s*(tjw_[a-z0-9_]+):\s*("(?:[^"\\]|\\.)*")/gm)) if (!(m[1] in d)) d[m[1]] = JSON.parse(m[2]); return d; };
const AR = { ...dict(src.slice(0, enAt)), ...MUSHAF_I18N.ar }, EN = { ...dict(src.slice(enAt)), ...MUSHAF_I18N.en };
const mkTr = (D) => (key, vars = {}) => {
    if (!(key in D)) throw new Error('مفتاح ترجمة ناقص: ' + key);
    return Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(v), D[key]);
};
const flat = getAllRulesFlat();
const rule = (id) => flat.find(x => x.rule.id === id).rule;
const stageOf = (id) => flat.find(x => x.rule.id === id).stageId;
const ctxFor = (D, extra = {}) => {
    const tr = mkTr(D);
    return { tr, ruleName: id => tr(rule(id).nameKey), stageName: id => tr(TAJWEED_STAGES.find(s => s.id === id).nameKey), badgeName: k => tr(TAJWEED_BADGE_CATALOG[k].nameKey), formatDate: d => `DATE(${d})`, ...extra };
};
const ctx = ctxFor(AR);

const NOW = new Date('2026-10-17T15:00:00Z').getTime(), DAY = 86400000;
const at = (daysAgo, hourUtc = 9) => new Date(Date.UTC(2026, 9, 17 - daysAgo, hourUtc)).toISOString();
const sess = (daysAgo, ruleId, mode, score, extra = {}) => ({ studentId: 1, stageId: ruleId ? stageOf(ruleId) : extra.stageId || null, ruleId, activityType: mode, totalQuestions: 4, correctCount: Math.round(score / 25), scorePercent: score, timestamp: at(daysAgo, extra.hour || 9), ...extra });
const empty = (ruleId) => ({ studentId: 1, stageId: stageOf(ruleId), ruleId, dimensions: {}, status: 'available', attemptsCount: 0, lastPracticedAt: null, masteredAt: null });
// سجل بإنجازات الرحلة بتواريخها: steps = { learn, practice, exam, teacher } أيام مضت (أو null)
function rec(ruleId, steps = {}) {
    let r = empty(ruleId);
    const d = (n) => new Date(Date.UTC(2026, 9, 17 - n, 9));
    if (steps.learn !== undefined) r = applyLearned(r, d(steps.learn));
    if (steps.practice !== undefined) r = applyPracticeResult(r, 90, d(steps.practice));
    if (steps.exam !== undefined) r = applyExamResult(r, steps.examScore || 90, d(steps.exam)).record;
    if (steps.teacher !== undefined) r = applyTeacherResult(r, 90, d(steps.teacher)).record;
    r.attemptsCount = 1; r.status = statusFromJourney(r, r.status); return r;
}
const student = { id: 1, name: 'أحمد' };
const session = (o = {}) => buildSessionSummary({ student, sessions: [], mastery: [], achievements: [], dueRuleIds: [], now: NOW, ...o });
const noBad = (text) => { assert.ok(!/undefined|NaN|\{[a-z]+\}|null/.test(text), 'بقايا قالب في النص:\n' + text); };

// ===== حصة كاملة اليوم =====
const todaySessions = [
    sess(0, 'izhar', 'practice', 60, { hour: 8 }), sess(0, 'izhar', 'practice', 80, { hour: 9 }), sess(0, 'izhar', 'letters', 100, { hour: 10 }),
    sess(0, 'izhar', 'exam', 90, { hour: 11 }), sess(0, 'izhar', 'teacher_checkpoint', 85, { hour: 12, teacherNote: 'مخارج الحروف ممتازة' }),
    sess(2, 'iqlab', 'practice', 40)
];
const masteryToday = [rec('izhar', { learn: 0, practice: 0, exam: 0, teacher: 0 }), rec('iqlab', { learn: 2 })];
const ach = [{ studentId: 1, badgeKey: 'first_mastery', earnedAt: at(0, 12) }, { studentId: 1, badgeKey: 'first_step', earnedAt: at(5) }];

test('ملخص الحصة: آخر يوم له جلسات، أحكامه وأنشطته وإنجازاته من تواريخ الرحلة', () => {
    const m = session({ sessions: todaySessions, mastery: masteryToday, achievements: ach });
    assert.equal(m.empty, false); assert.equal(m.isToday, true); assert.equal(m.day, localDayKey(NOW));
    assert.deepEqual(m.rules.map(r => r.ruleId), ['izhar']);              // جلسة أول من أمس لا تدخل
    const r = m.rules[0];
    assert.deepEqual(r.activities.map(a => [a.mode, a.count, a.best]), [['practice', 2, 80], ['letters', 1, 100], ['exam', 1, 90], ['teacher_checkpoint', 1, 85]]);
    assert.deepEqual(r.milestones, { learned: true, practice: true, exam: 90, approved: true });
    assert.deepEqual(m.masteredRuleIds, ['izhar']);
    assert.deepEqual(m.badgeKeys, ['first_mastery']);                       // وسام اليوم فقط
    assert.deepEqual(m.totals, { activities: 5, avgScore: 83 });
    assert.deepEqual(m.notes, [{ ruleId: 'izhar', note: 'مخارج الحروف ممتازة' }]);
});

test('نص ملخص الحصة بالعربية: كل العناصر موجودة بترتيب مقروء وبلا بقايا قالب', () => {
    const text = formatSummaryText(session({ sessions: todaySessions, mastery: masteryToday, achievements: ach }), ctx);
    console.log('\n' + text.split('\n').map(l => '      │ ' + l).join('\n') + '\n');
    noBad(text);
    const order = ['السلام عليكم', 'ملخص حصة التجويد — أحمد', 'DATE(', 'ما تعلّمناه', '*الإظهار الحلقي*', 'التطبيق 80% ×2', 'ألعاب الحروف 100%', 'الاختبار 90%', 'التسميع 85%',
        '✅ أنجز: الشرح · التطبيق · الاختبار (90%) · اعتماد المعلم', 'إنجازات الحصة', 'أتقن حكم «الإظهار الحلقي»', 'وسام «', 'متوسط', 'القادم:', 'في البيت:', 'ملاحظة المعلم: مخارج الحروف ممتازة', 'جزاكم الله خيراً'];
    let pos = -1; order.forEach(s => { const i = text.indexOf(s, pos + 1); assert.ok(i > pos, `«${s}» غير موجود أو في غير ترتيبه`); pos = i; });
    assert.ok(!text.includes('الإقلاب'), 'حكم جلسته قبل يومين لا يدخل');
});

test('لا جلسات: رسالة فارغة مهذّبة، ولا خطأ', () => {
    const m = session(); assert.equal(m.empty, true);
    const text = formatSummaryText(m, ctx); noBad(text);
    assert.ok(text.includes('لا توجد أنشطة تجويد مسجَّلة'));
});

test('آخر نشاط أمس: يُنسب ليوم أمس (isToday=false) ويحمل تاريخه', () => {
    const m = session({ sessions: [sess(1, 'izhar', 'practice', 70), sess(3, 'ikhfa', 'practice', 90)], mastery: [rec('izhar', { learn: 1 })] });
    assert.equal(m.isToday, false); assert.equal(m.day, localDayKey(NOW - DAY)); assert.deepEqual(m.rules.map(r => r.ruleId), ['izhar']);
    assert.ok(formatSummaryText(m, ctx).includes('DATE(' + m.day + ')'));
});

test('يوم محدَّد صراحةً يُلخَّص بدل الأحدث', () => {
    const m = session({ sessions: [sess(0, 'izhar', 'practice', 70), sess(2, 'iqlab', 'practice', 90)], day: localDayKey(NOW - 2 * DAY) });
    assert.deepEqual(m.rules.map(r => r.ruleId), ['iqlab']);
});

test('«فهمت» بلا جلسة مسجَّلة تُحسب إنجازاً في ذلك اليوم', () => {
    const m = session({ sessions: [sess(0, 'izhar', 'practice', 70)], mastery: [rec('izhar', { learn: 0 }), rec('ikhfa', { learn: 0 })] });
    assert.deepEqual(m.rules.map(r => r.ruleId).sort(), ['ikhfa', 'izhar']);
    assert.equal(m.rules.find(r => r.ruleId === 'ikhfa').milestones.learned, true);
    assert.deepEqual(m.rules.find(r => r.ruleId === 'ikhfa').activities, []);
});

test('أنشطة المرحلة بلا حكم (الربط، شجرة الحكم) تظهر تحت اسم المرحلة', () => {
    const m = session({ sessions: [sess(0, null, 'link', 85, { stageId: 'noon_sakinah' }), sess(0, null, 'tree', 100, { stageId: 'noon_sakinah' })] });
    assert.deepEqual(m.stages, [{ stageId: 'noon_sakinah', activities: groupActivities([sess(0, null, 'tree', 100), sess(0, null, 'link', 85)]) }]);
    const text = formatSummaryText(m, ctx); noBad(text);
    assert.ok(text.includes('*النون الساكنة والتنوين*: شجرة الحكم 100% · ربط الأحكام 85%'), text);
});

test('تسميع لم يُعتمد: لا «اعتمد المعلم» ولا إنجاز إتقان', () => {
    const s = [sess(0, 'izhar', 'teacher_checkpoint', 50, { teacherNote: 'يحتاج تدريباً على الغنة' })];
    const m = session({ sessions: s, mastery: [rec('izhar', { learn: 0, practice: 0, exam: 0 })] });
    assert.deepEqual(m.masteredRuleIds, []);
    const text = formatSummaryText(m, ctx);
    assert.ok(!text.includes('اعتماد المعلم') && !text.includes('إنجازات الحصة') && text.includes('يحتاج تدريباً على الغنة'));
});

test('كل الأحكام متقنة: «أتمّ كل أحكام المتن» ولا «القادم»', () => {
    const all = flat.map(x => rec(x.rule.id, { learn: 5, practice: 5, exam: 5, teacher: 5 }));
    const m = session({ sessions: [sess(0, 'izhar', 'review', 100)], mastery: all });
    assert.equal(m.allDone, true); assert.equal(m.next, null);
    const text = formatSummaryText(m, ctx); noBad(text);
    assert.ok(text.includes('أتمّ كل أحكام المتن') && !text.includes('القادم:'));
});

test('المراجعات المعلّقة، وملاحظة المعلم المضافة (بلا تكرار)، وإيقاف سطر «في البيت»', () => {
    const base = { sessions: [sess(0, 'izhar', 'teacher_checkpoint', 80, { teacherNote: 'ممتاز' })], mastery: [rec('qalqalah', { learn: 9, practice: 9, exam: 9, teacher: 9 })], dueRuleIds: ['qalqalah'] };
    const m = session(base);
    assert.equal(m.due, 1);
    const t1 = formatSummaryText(m, ctxFor(AR, { note: 'ممتاز' })); noBad(t1);
    assert.ok(t1.includes('عليه حكم واحد يحتاج مراجعة'));
    assert.equal(t1.split('ملاحظة المعلم: ممتاز').length - 1, 1, 'الملاحظة المكررة تُدمج');
    const t2 = formatSummaryText(m, ctxFor(AR, { note: 'أحسنت يا بطل', includeHome: false }));
    assert.ok(t2.includes('ملاحظة المعلم: ممتاز') && t2.includes('ملاحظة المعلم: أحسنت يا بطل') && !t2.includes('في البيت:'));
});

test('اقتراح «في البيت» يتبع الخطوة القادمة', () => {
    assert.deepEqual(['learn', 'practice', 'exam', 'awaiting_teacher', 'mastered'].map(homeKeyForStep), ['learn', 'practice', 'exam', 'teacher', 'review']);
    const mushafDone = flat.filter(x => x.stageId === 'know_mushaf').map(x => rec(x.rule.id, { learn: 9, practice: 9, exam: 9, teacher: 9 }));   // المرحلة الأولى متقنة فتصير القلقلة هي الحالية
    const m = session({ sessions: [sess(0, 'qalqalah', 'practice', 70)], mastery: [...mushafDone, rec('qalqalah', { learn: 0, practice: 0 })] });
    assert.equal(m.next.step, 'exam');
    assert.ok(formatSummaryText(m, ctx).includes('مراجعة الحكم استعداداً لاختباره'));
});

// ===== ملخص الحكم =====
const ruleSessions = [sess(3, 'izhar', 'practice', 55), sess(2, 'izhar', 'practice', 85), sess(1, 'izhar', 'exam', 60), sess(0, 'izhar', 'exam', 90), sess(0, 'izhar', 'teacher_checkpoint', 75, { teacherNote: 'غنة زائدة قليلاً' }), sess(0, 'iqlab', 'practice', 99)];
const ruleSum = (o = {}) => buildRuleSummary({ student, ruleId: 'izhar', sessions: ruleSessions, mastery: [rec('izhar', { learn: 4, practice: 2, exam: 0, teacher: 0, examScore: 90 })], now: NOW, ...o });

test('ملخص الحكم المعتمد: الخطوات الأربع بنتائجها والحالة «متقن» وملاحظة المعلم', () => {
    const m = ruleSum();
    assert.equal(m.step, 'mastered'); assert.equal(m.status, 'mastered');
    assert.equal(m.learned.done, true); assert.equal(m.practice.done, true); assert.equal(m.exam.done, true); assert.equal(m.teacher.approved, true); assert.equal(m.teacher.score, 75);
    assert.equal(m.note, 'غنة زائدة قليلاً');
    const text = formatSummaryText(m, ctx); noBad(text);
    ['ملخص حكم «الإظهار الحلقي» — أحمد', 'المرحلة: النون الساكنة والتنوين', 'الشرح: تمّ', 'التطبيق: اجتاز', 'الاختبار: اجتاز', 'التسميع: معتمد من المعلم — 75%', 'الحالة: متقن ما شاء الله', 'ملاحظة المعلم: غنة زائدة قليلاً'].forEach(s => assert.ok(text.includes(s), s + '\n' + text));
    assert.ok(!text.includes('الإقلاب') && !text.includes('99'), 'جلسات حكم آخر لا تدخل');
    console.log('\n' + text.split('\n').map(l => '      │ ' + l).join('\n') + '\n');
});

test('ملخص حكم لم يكتمل: «بانتظار التسميع»، «لم يجتز بعد»، «لم يبدأ»، وبلا اعتماد', () => {
    const waiting = formatSummaryText(ruleSum({ mastery: [rec('izhar', { learn: 4, practice: 2, exam: 0 })] }), ctx);
    assert.ok(waiting.includes('التسميع: بانتظار تسميع المعلم') && waiting.includes('الحالة: قيد التعلّم') && !waiting.includes('معتمد من المعلم'));
    const failing = formatSummaryText(ruleSum({ sessions: [sess(0, 'izhar', 'practice', 40)], mastery: [{ ...rec('izhar', { learn: 0 }), journey: { ...rec('izhar', { learn: 0 }).journey, practiceBest: 40, practiceCount: 1 } }] }), ctx);
    assert.ok(failing.includes('التطبيق: لم يجتز بعد — أفضل نتيجة 40%') && failing.includes('الاختبار: لم يحن بعد') && failing.includes('التسميع: بعد اجتياز الاختبار'));
    const fresh = formatSummaryText(ruleSum({ sessions: [], mastery: [] }), ctx); noBad(fresh);
    assert.ok(fresh.includes('الشرح: لم يبدأ بعد') && fresh.includes('التطبيق: لم يبدأ بعد'));
    const examFail = buildRuleSummary({ student, ruleId: 'izhar', sessions: [], mastery: [{ ...rec('izhar', { learn: 3, practice: 3 }), journey: { ...rec('izhar', { learn: 3, practice: 3 }).journey, examAttempts: [{ at: at(1), score: 50, passed: false }], practiceSinceFail: false } }], now: NOW });
    assert.ok(formatSummaryText(examFail, ctx).includes('الاختبار: لم يجتز بعد — آخر نتيجة 50% (محاولة واحدة)'));
});

test('حكم يحتاج مراجعة: الحالة «يحتاج مراجعة»', () => {
    const r = { ...rec('izhar', { learn: 9, practice: 9, exam: 9, teacher: 9 }), status: 'needs_review' };
    assert.ok(formatSummaryText(ruleSum({ mastery: [r] }), ctx).includes('الحالة: يحتاج مراجعة'));
});

// ===== الإنجليزية والمفاتيح =====
test('النص الإنجليزي كامل أيضاً وبلا بقايا قالب', () => {
    const e = ctxFor(EN);
    const a = formatSummaryText(session({ sessions: todaySessions, mastery: masteryToday, achievements: ach }), e); noBad(a);
    const noUserData = (x) => x.replace(/«[^»]*»/g, '').replace(/أحمد/g, '').replace(/مخارج الحروف ممتازة|غنة زائدة قليلاً/g, '');
    assert.ok(/lesson summary/i.test(a) && !/[؀-ۿ]/.test(noUserData(a)), a);
    const b = formatSummaryText(ruleSum(), e); noBad(b);
    assert.ok(!/[؀-ۿ]/.test(noUserData(b)), b);
});

test('كل مفاتيح الترجمة المستعملة موجودة بالعربية والإنجليزية (مع تمديد أنواع النشاط والخطوات)', () => {
    const code = fs.readFileSync(new URL('../engine/tajweedSummary.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('../tajweed/tajweed-summary.js', import.meta.url), 'utf8');
    const keys = new Set([...code.matchAll(/'(tjw_(?:sm|sum)_[a-z_]+)'/g)].map(m => m[1]).filter(k => !k.endsWith('_') && !['tjw_sm_due', 'tjw_sm_n_session', 'tjw_sm_n_activity', 'tjw_sm_n_attempt'].includes(k)));  // الأسماء الأساسية للجمع تُمدَّد أدناه
    MODE_ORDER.forEach(m => keys.add('tjw_sm_act_' + m));
    ['learn', 'practice', 'exam', 'awaiting_teacher', 'mastered'].forEach(s => keys.add('tjw_sm_step_' + s));
    ['learn', 'practice', 'exam', 'teacher', 'review'].forEach(s => keys.add('tjw_sm_home_' + s));
    ['1', '2', 'few', 'many'].forEach(p => ['tjw_sm_n_session_', 'tjw_sm_n_activity_', 'tjw_sm_n_attempt_', 'tjw_sm_due_'].forEach(b => keys.add(b + p)));
    assert.ok(keys.size > 50, 'عدد المفاتيح المكتشفة ' + keys.size);
    [...keys].forEach(k => { assert.ok(k in AR, 'ناقص بالعربية: ' + k); assert.ok(k in EN, 'ناقص بالإنجليزية: ' + k); });
});

// ===== العدد في العربية =====
test('العدد: مفرد ومثنى وجمع وتمييز (جلسة واحدة، جلستان، 3 جلسات، 11 جلسة) في كل المواضع', () => {
    assert.deepEqual([1, 2, 3, 10, 11, 25].map(pluralKey), ['1', '2', 'few', 'few', 'many', 'many']);
    const tr = mkTr(AR);
    const f = (base, n) => tr(`${base}_${pluralKey(n)}`, { n });
    assert.deepEqual([1, 2, 3, 11].map(n => f('tjw_sm_n_session', n)), ['جلسة واحدة', 'جلستان', '3 جلسات', '11 جلسة']);
    assert.deepEqual([1, 2, 3, 11].map(n => f('tjw_sm_n_activity', n)), ['نشاط واحد', 'نشاطان', '3 أنشطة', '11 نشاطاً']);
    assert.deepEqual([1, 2, 3, 11].map(n => f('tjw_sm_n_attempt', n)), ['محاولة واحدة', 'محاولتان', '3 محاولات', '11 محاولة']);
    assert.deepEqual([1, 2, 3, 11].map(n => f('tjw_sm_due', n)), ['🔔 عليه حكم واحد يحتاج مراجعة', '🔔 عليه حكمان يحتاجان مراجعة', '🔔 عليه 3 أحكام تحتاج مراجعة', '🔔 عليه 11 حكماً يحتاج مراجعة']);
});

test('لا «1 جلسات» ولا «2 أنشطة» في النص الفعلي (يتحقق من المخرجات لا من القوالب فقط)', () => {
    const j = (o) => ({ ...rec('izhar', o), journey: { ...rec('izhar', o).journey, practiceCount: 1 } });
    const one = formatSummaryText(ruleSum({ sessions: [sess(0, 'izhar', 'practice', 90)], mastery: [j({ learn: 0, practice: 0, exam: 0 })] }), ctx);
    assert.ok(one.includes('(جلسة واحدة)') && !/\b1 (جلسات|جلسة)/.test(one), one);
    const two = formatSummaryText(session({ sessions: [sess(0, 'izhar', 'practice', 70), sess(0, 'izhar', 'letters', 90)], mastery: [rec('izhar', { learn: 0 })] }), ctx);
    assert.ok(two.includes('📊 نشاطان — المتوسط 80%'), two);
    const many = formatSummaryText(session({ sessions: Array.from({ length: 11 }, (_, i) => sess(0, 'izhar', 'practice', 80, { hour: 1 + i })), mastery: [rec('izhar', { learn: 0 })] }), ctx);
    assert.ok(many.includes('📊 11 نشاطاً — المتوسط 80%'), many);
    const base3 = rec('izhar', { learn: 3, practice: 3 });
    const exam3 = buildRuleSummary({ student, ruleId: 'izhar', sessions: [], mastery: [{ ...base3, journey: { ...base3.journey, examAttempts: [1, 2, 3].map(i => ({ at: at(i), score: 40 + i, passed: false })), practiceSinceFail: false } }], now: NOW });
    assert.ok(formatSummaryText(exam3, ctx).includes('آخر نتيجة 43% (3 محاولات)'));
});

// ===== النسخ =====
test('تنظيف النص قبل النسخ: أسطر موحّدة، بلا مسافات زائدة، وسطر فارغ واحد كحدّ أقصى، وبلا رموز خفية', () => {
    assert.equal(cleanForCopy('  أ  \r\nب\t \r\n\r\n\r\n\r\nج\u200B   \n\n'), 'أ\nب\n\nج');
    assert.equal(cleanForCopy('x\u202Ey\u2066z\uFEFF'), 'xyz');
    assert.equal(cleanForCopy('\u200Fسطر'), '\u200Fسطر', 'علامة الاتجاه العادية RLM تبقى');
    assert.equal(cleanForCopy(null), ''); assert.equal(cleanForCopy(undefined), '');
    const t1 = 'سطر 1\n\nسطر 2\n🔹 التطبيق 80%';
    assert.equal(cleanForCopy(t1), t1, 'نص نظيف لا يتغيّر');
});

test('النص الناتج جاهز للصق أصلاً: لا مسافات بادئة (واتساب لا يحفظها)، ولا أسطر فارغة متتالية، وتنظيفه لا يغيّره', () => {
    const texts = [
        formatSummaryText(session({ sessions: todaySessions, mastery: masteryToday, achievements: ach }), ctx),
        formatSummaryText(ruleSum(), ctx),
        formatSummaryText(session(), ctx)
    ];
    texts.forEach(x => {
        assert.equal(cleanForCopy(x), x, 'النص الأصلي يحوي مسافات/أسطراً زائدة:\n' + JSON.stringify(x));
        assert.ok(!/^[ \t]+\S/m.test(x), 'مسافة بادئة في سطر:\n' + x);
        assert.ok(!/\n\n\n/.test(x));
    });
    assert.ok(texts[0].includes('🔹 التطبيق 80% ×2 · ألعاب الحروف 100%'));
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
