// engine/tajweedLessonSummary.js
//
// 🌟 [2026-10-21 — بطلب المعلم] «ملخص الحصة» التلقائي لولي الأمر: نص دافئ يحكي بصدق ما تمّ فعلاً في حصة اليوم لحكم واحد (الشرح،
// الاستماع لأمثلة بصوت المنشاوي، الألعاب بنتائجها، الاختبار، الاعتماد)، وإن أُوقف الدرس يذكر نقطة التوقف ليكمل المعلم منها المرة القادمة.
// لا يذكر شيئاً لم يحدث: كل بند يُؤخذ من تاريخ في رحلة الحكم أو جلسة مسجَّلة في اليوم المحلي نفسه. خالص بلا DOM ولا قاعدة بيانات
// (دالة الترجمة وأسماء الأحكام تُمرَّر، فيُختبر بنصوصه العربية الحقيقية).
import { ensureJourney, journeyStep } from './tajweedJourney.js';
import { localDayKey, groupActivities } from './tajweedSummary.js';

const tsOf = (x) => new Date(x).getTime();
export const GAME_MODES = ['practice', 'letters', 'tree', 'link', 'mushaf'];

export function buildLessonModel({ student, ruleId, stageId = null, mastery = [], sessions = [], now = Date.now(), day = null }) {
    const rec = mastery.find(m => m.ruleId === ruleId) || null, j = ensureJourney(rec);
    const target = day || localDayKey(now);
    const onDay = (ts) => !!ts && localDayKey(tsOf(ts)) === target;
    const todays = sessions.filter(s => s.ruleId === ruleId && onDay(s.timestamp));
    const games = groupActivities(todays.filter(s => GAME_MODES.includes(s.activityType)));
    const attemptsToday = (j.examAttempts || []).filter(a => onDay(a.at));
    const step = journeyStep(j);
    return {
        studentName: student.name, ruleId, stageId: stageId || (rec && rec.stageId) || null, step,
        learned: onDay(j.learnedAt), audio: onDay(j.audioAt), games,
        exam: attemptsToday.length ? { score: Math.max(...attemptsToday.map(a => a.score)), passed: attemptsToday.some(a => a.passed), count: attemptsToday.length } : null,
        approved: onDay(j.teacherApprovedAt),
        isMastered: !!j.teacherApprovedAt,
        resume: j.resume ? { mode: j.resume.mode, qIndex: j.resume.qIndex || 0, total: (j.resume.questions || []).length } : null,
        anything: onDay(j.learnedAt) || onDay(j.audioAt) || todays.length > 0 || attemptsToday.length > 0 || onDay(j.teacherApprovedAt)
    };
}

// ctx = { tr(key, vars), ruleName(id), nextRuleName? (حكم قادم بعد الاعتماد)، note? (ملاحظة المعلم) }
export function formatLessonSummary(model, ctx) {
    const { tr, ruleName } = ctx;
    const L = [tr('tjw_ls_greet'), tr('tjw_ls_intro', { student: model.studentName, rule: ruleName(model.ruleId) }), ''];
    const items = [];
    if (model.learned) items.push(tr('tjw_ls_learned'));
    if (model.audio) items.push(tr('tjw_ls_audio'));
    if (model.games.length) items.push(tr('tjw_ls_games', { items: model.games.map(g => `${tr('tjw_game_' + g.mode)} ${g.best}%`).join('، ') }));
    if (model.exam) items.push(tr(model.exam.passed ? 'tjw_ls_exam_pass' : 'tjw_ls_exam_try', { score: model.exam.score }));
    if (model.approved) items.push(tr('tjw_ls_approved'));
    if (!items.length) L.push(tr('tjw_ls_nothing'));
    else items.forEach(i => L.push('• ' + i));
    L.push('');
    if (model.approved || model.isMastered && model.step === 'mastered' && !model.resume) {
        L.push(ctx.nextRuleName ? tr('tjw_ls_done_next', { student: model.studentName, next: ctx.nextRuleName }) : tr('tjw_ls_done'));
    } else if (model.resume) {
        L.push(tr('tjw_ls_paused_at', { what: tr('tjw_ls_at_' + model.resume.mode), n: model.resume.qIndex + 1, total: model.resume.total }));
    } else {
        L.push(tr('tjw_ls_continue_' + (model.step === 'awaiting_teacher' ? 'approve' : model.step === 'exam' ? 'exam' : model.step === 'practice' ? 'games' : 'learn')));
    }
    if (ctx.note && ctx.note.trim()) L.push(tr('tjw_sm_note', { note: ctx.note.trim() }));
    L.push('', tr('tjw_ls_closing'));
    return L.join('\n');
}
