// engine/tajweedEntry.js
//
// 🌟 [جديد] محرك بيانات خالص (بلا DOM ولا IndexedDB) لشاشة الدخول إلى «أبطال التجويد»: ملخص كل طالب
// (التقدّم، الحكم الحالي وخطوته، المراجعات المستحقة، المواظبة، آخر نشاط، عدّاد كل مرحلة)، ونظرة الصف
// للمعلم، وأوائل الفئات في معاينة لوحة الأبطال. الشاشة (tajweed/tajweed-entry.js) تجلب السجلات من
// قاعدة البيانات وتمرّرها هنا؛ لا شيء هنا يقرأ أو يكتب.
//
// قرارات موثَّقة:
// • «المواظبة» هنا هي السلسلة الحالية: أيام متتالية فيها جلسة نشاط على الأقل تنتهي اليوم أو أمس. تختلف عن «أطول
//   سلسلة» في شاشة لوحة الأبطال الكاملة (renderLeaderboardHTML) التي تحسب أفضل سلسلة في التاريخ كله. اليوم
//   يُحسَب بتوقيت UTC (toISOString) كما في اللوحة الكاملة، فيتطابق تعريف «اليوم» بين الشاشتين.
// • «بدأ الطالب» يعني أن لحكم واحد على الأقل محاولات (attemptsCount ≥ 1) أو تاريخ تعلّم (learnedAt)؛ نفس تعريف
//   بوّابة المراجعة في tajweed-map.js لاستحقاق المراجعة.
// • لا حقل «صغير/كبير» في سجل الطالب، فلا يُعرض ولا يُفلتَر به.
import { TAJWEED_STAGES, getAllRulesFlat } from './tajweedRulesCatalog.js';
import { computeAllStageProgress, isStageUnlocked } from './tajweedEngine.js';
import { ensureJourney, journeyStep, journeyPercent } from './tajweedJourney.js';

export const DAY_MS = 86400000;
export const IDLE_DAYS = 2;                 // من لم يدخل منذ يومين يُعدّ «غائباً» في نظرة الصف
export const PRESELECT_WITHIN_DAYS = 14;    // أحدث طالب نشط يُحدَّد مسبقاً (دون دخول صامت) إن كان نشاطه ضمن هذه المدة

const dayKey = (ts) => new Date(ts).toISOString().slice(0, 10);
const tsOf = (s) => new Date(s.timestamp).getTime();

// المواظبة الحالية: أيام متتالية فيها جلسة، تنتهي اليوم أو أمس (وإلا صفر)
export function currentStreak(sessions, now = Date.now()) {
    const days = new Set((sessions || []).map(s => dayKey(tsOf(s))));
    let cursor = days.has(dayKey(now)) ? now : (days.has(dayKey(now - DAY_MS)) ? now - DAY_MS : null);
    if (cursor === null) return 0;
    let n = 0;
    while (days.has(dayKey(cursor))) { n++; cursor -= DAY_MS; }
    return n;
}

// ملخص طالب واحد
// student: سجل الطالب | mastery: سجلات إتقانه | sessions: جلسات تجويده | dueRuleIds: أحكامه المستحقة للمراجعة
export function summarizeStudent({ student, mastery = [], sessions = [], dueRuleIds = [], now = Date.now() }) {
    const byRule = {};
    mastery.forEach(m => { byRule[m.ruleId] = m; });
    const stageProgress = computeAllStageProgress(mastery, (student && student.tajweedProgress && student.tajweedProgress.passedStages) || []);
    const flat = getAllRulesFlat();

    const done = flat.filter(({ rule }) => byRule[rule.id] && byRule[rule.id].status === 'mastered').length;
    const progressPct = flat.length
        ? Math.round(flat.reduce((sum, { rule }) => sum + (byRule[rule.id] ? journeyPercent(byRule[rule.id]) : 0), 0) / flat.length)
        : 0;
    const started = mastery.some(m => (m.attemptsCount || 0) > 0 || !!ensureJourney(m).learnedAt);

    // الحكم الحالي: أول حكم غير متقن في أول مرحلة مفتوحة (نفس منطق زر «أكمل رحلتك» في خريطة التقدّم)
    let current = null;
    for (const stage of TAJWEED_STAGES) {
        if (!isStageUnlocked(stage.id, stageProgress)) continue;
        const idx = stage.rules.findIndex(r => !(byRule[r.id] && byRule[r.id].status === 'mastered'));
        if (idx >= 0) {
            const rule = stage.rules[idx];
            current = { stageId: stage.id, ruleId: rule.id, ruleIndex: idx, ruleCount: stage.rules.length, step: journeyStep(ensureJourney(byRule[rule.id] || null)) };
            break;
        }
    }

    const stageCounts = TAJWEED_STAGES.map(stage => {
        const mastered = stage.rules.filter(r => byRule[r.id] && byRule[r.id].status === 'mastered').length;
        return {
            stageId: stage.id, mastered, total: stage.rules.length,
            complete: mastered === stage.rules.length,
            unlocked: isStageUnlocked(stage.id, stageProgress),
            active: !!current && current.stageId === stage.id
        };
    });

    const times = sessions.map(tsOf).filter(n => Number.isFinite(n));
    const lastTs = times.length ? Math.max(...times) : null;
    return {
        studentId: student.id, student, started, done, total: flat.length, progressPct, current, stageCounts,
        due: dueRuleIds.length, streak: currentStreak(sessions, now), lastTs,
        weekSessions: times.filter(t => t >= now - 7 * DAY_MS).length,
        allDone: started && current === null
    };
}

// الأحدث نشاطاً أولاً؛ من لم يدخل قط في الآخر، وتعادل بالاسم
export function sortByRecency(summaries) {
    return [...summaries].sort((a, b) => (b.lastTs ?? -1) - (a.lastTs ?? -1) || String(a.student.name).localeCompare(String(b.student.name), 'ar'));
}

// الطالب الذي يُحدَّد مسبقاً عند فتح الشاشة (دون دخول): أحدث نشاطاً إن كان ضمن المدة، وإلا لا أحد
export function pickPreselected(summaries, now = Date.now()) {
    const top = sortByRecency(summaries)[0];
    return top && top.lastTs !== null && now - top.lastTs <= PRESELECT_WITHIN_DAYS * DAY_MS ? top : null;
}

// نظرة الصف للمعلم
export function classOverview(summaries, now = Date.now()) {
    return {
        total: summaries.length,
        withDue: summaries.filter(s => s.due > 0).length,
        idle: summaries.filter(s => s.started && s.lastTs !== null && now - s.lastTs > IDLE_DAYS * DAY_MS).length,
        notStarted: summaries.filter(s => !s.started).length,
        allDone: summaries.filter(s => s.allDone).length
    };
}

// ترتيب جدول المعلم: بالتقدّم، أو بالاسم، أو بمن يحتاج انتباهاً (مراجعات ثم غياب ثم عدم بدء)
export function sortForTeacher(summaries, by = 'progress', now = Date.now()) {
    const attention = (s) => (s.due > 0 ? 3 : 0) + (s.started && s.lastTs !== null && now - s.lastTs > IDLE_DAYS * DAY_MS ? 2 : 0) + (!s.started ? 1 : 0);
    const cmp = {
        progress: (a, b) => b.progressPct - a.progressPct,
        name: (a, b) => String(a.student.name).localeCompare(String(b.student.name), 'ar'),
        attention: (a, b) => attention(b) - attention(a) || b.due - a.due
    }[by] || (() => 0);
    return [...summaries].sort((a, b) => cmp(a, b) || String(a.student.name).localeCompare(String(b.student.name), 'ar'));
}

// أوائل ثلاث فئات لمعاينة لوحة الأبطال (فئات متعددة؛ كل طالب بطل في شيء — بلا ترتيب تراكمي كلي)
export function topStudents(summaries, n = 3) {
    const top = (filter, key) => summaries.filter(filter).sort((a, b) => b[key] - a[key]).slice(0, n);
    return {
        streak: top(s => s.streak > 1, 'streak'),
        mastered: top(s => s.done > 0, 'done'),
        weekly: top(s => s.weekSessions > 0, 'weekSessions')
    };
}

// «منذ كم»: {key, n} تحوّله الواجهة إلى نص مترجَم
export function timeAgo(ts, now = Date.now()) {
    if (ts === null || ts === undefined) return { key: 'never', n: 0 };
    const ms = Math.max(0, now - ts);
    if (ms < 2 * 60000) return { key: 'now', n: 0 };
    if (ms < 3600000) return { key: 'min', n: Math.round(ms / 60000) };
    if (ms < DAY_MS) return { key: 'hour', n: Math.round(ms / 3600000) };
    return { key: 'day', n: Math.round(ms / DAY_MS) };
}
