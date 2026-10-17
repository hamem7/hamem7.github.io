// engine/tajweedSummary.js
//
// 🌟 [جديد] «ملخص جاهز للولي»: بعد أن يُنهي المعلم حكماً أو حصة يضغط زراً فيحصل على رسالة قصيرة منسَّقة لواتساب
// تلخّص ما تمّ، ينسخها ويلصقها بنفسه (لا إرسال تلقائي، ولا زر واتساب بطلب المعلم: النسخ هو الأساس). محرك خالص (بلا DOM ولا IndexedDB): الشاشة (tajweed/tajweed-summary.js) تجلب السجلات وتمرّرها هنا،
// وتمرّر دالة الترجمة وأسماء الأحكام، فتبقى الدوال قابلة للاختبار بنصوصها العربية الحقيقية.
//
// تعريفان موثَّقان:
// • «الحصة» = كل أنشطة التجويد المسجَّلة للطالب في **آخر يوم (بالتوقيت المحلي للجهاز) له جلسات** — وهو اليوم نفسه
//   غالباً. لا يوجد في التطبيق مفهوم «بداية حصة ونهايتها»، والمعلم هو من يضغط الزر عند انتهائها. إن كان آخر نشاط في
//   يوم سابق يُذكر تاريخه في الرسالة فلا يُظنّ أنه اليوم.
// • الإنجازات (تعلّم الشرح، اجتياز التطبيق/الاختبار، اعتماد المعلم) تؤخذ من تواريخ رحلة الحكم نفسها (journey) فتُنسب
//   لليوم الذي تحقّقت فيه فعلاً، لا من عدّ الجلسات.
import { summarizeStudent } from './tajweedEntry.js';
import { ensureJourney, journeyStep } from './tajweedJourney.js';

// ترتيب عرض أنواع الأنشطة داخل الحكم الواحد (منطق التعلّم: تطبيق وألعاب ثم اختبار ثم مراجعة ثم تسميع)
export const MODE_ORDER = ['practice', 'letters', 'tree', 'link', 'challenge', 'exam', 'review', 'teacher_checkpoint'];

const tsOf = (x) => new Date(x).getTime();
const pad = (n) => String(n).padStart(2, '0');
// اليوم المحلي YYYY-MM-DD (لا UTC: المعلم يفكّر بيوم حصته على ساعة جهازه)
export const localDayKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

// يجمع جلسات حكم/مرحلة حسب نوع النشاط: [{mode, count, best, last}] بترتيب MODE_ORDER
export function groupActivities(sessions) {
    const by = new Map();
    [...sessions].sort((a, b) => tsOf(a.timestamp) - tsOf(b.timestamp)).forEach(s => {
        const m = s.activityType;
        if (!MODE_ORDER.includes(m)) return;
        const g = by.get(m) || { mode: m, count: 0, best: 0, last: 0 };
        g.count++; g.best = Math.max(g.best, s.scorePercent || 0); g.last = s.scorePercent || 0;
        by.set(m, g);
    });
    return MODE_ORDER.filter(m => by.has(m)).map(m => by.get(m));
}

// ما يُقترح في البيت حسب الخطوة القادمة (مفتاح ترجمة)
export const homeKeyForStep = (step) => ({ learn: 'learn', practice: 'practice', exam: 'exam', awaiting_teacher: 'teacher', mastered: 'review' }[step] || 'review');

// الحكم القادم/المراجعات المعلّقة للطالب (نفس منطق «أكمل رحلتك» وشاشة الدخول)
function nextInfo({ student, mastery, sessions, dueRuleIds, now }) {
    const s = summarizeStudent({ student, mastery, sessions, dueRuleIds, now });
    return { next: s.current ? { stageId: s.current.stageId, ruleId: s.current.ruleId, step: s.current.step } : null, due: s.due, allDone: s.allDone };
}

// ============================================================
// ملخص الحصة
// ============================================================
export function buildSessionSummary({ student, sessions = [], mastery = [], achievements = [], dueRuleIds = [], day = null, now = Date.now() }) {
    const days = sessions.map(s => localDayKey(tsOf(s.timestamp)));
    const target = day || (days.length ? [...days].sort().pop() : null);
    const base = { kind: 'session', studentName: student.name, ...nextInfo({ student, mastery, sessions, dueRuleIds, now }) };
    if (!target) return { ...base, empty: true, day: null, isToday: false, rules: [], stages: [], totals: { activities: 0, avgScore: null }, masteredRuleIds: [], badgeKeys: [], notes: [] };

    const todays = sessions.filter(s => localDayKey(tsOf(s.timestamp)) === target);
    const isOnDay = (ts) => !!ts && localDayKey(tsOf(ts)) === target;

    // الأحكام: ما له جلسات اليوم، أو تحقّق فيه إنجاز في الرحلة (مثل «فهمت» بلا جلسة مسجَّلة)
    const ruleOrder = [];
    todays.filter(s => s.ruleId).forEach(s => { if (!ruleOrder.includes(s.ruleId)) ruleOrder.push(s.ruleId); });
    mastery.forEach(m => {
        const j = ensureJourney(m);
        if ([j.learnedAt, j.practicePassedAt, j.examPassedAt, j.teacherApprovedAt].some(isOnDay) && !ruleOrder.includes(m.ruleId)) ruleOrder.push(m.ruleId);
    });
    const rules = ruleOrder.map(ruleId => {
        const rec = mastery.find(m => m.ruleId === ruleId) || null, j = ensureJourney(rec);
        const examToday = (j.examAttempts || []).filter(a => a.passed && isOnDay(a.at)).map(a => a.score);
        const stageId = (rec && rec.stageId) || (todays.find(s => s.ruleId === ruleId) || {}).stageId || null;
        return {
            ruleId, stageId,
            activities: groupActivities(todays.filter(s => s.ruleId === ruleId)),
            milestones: {
                learned: isOnDay(j.learnedAt), practice: isOnDay(j.practicePassedAt),
                exam: isOnDay(j.examPassedAt) ? (examToday.length ? Math.max(...examToday) : null) : undefined,
                approved: isOnDay(j.teacherApprovedAt)
            }
        };
    });
    // أنشطة المرحلة بلا حكم محدد (الربط، شجرة الحكم، تحدي المرحلة)
    const stageIds = [];
    todays.filter(s => !s.ruleId && s.stageId).forEach(s => { if (!stageIds.includes(s.stageId)) stageIds.push(s.stageId); });
    const stages = stageIds.map(stageId => ({ stageId, activities: groupActivities(todays.filter(s => !s.ruleId && s.stageId === stageId)) }));

    const scores = todays.filter(s => MODE_ORDER.includes(s.activityType) && typeof s.scorePercent === 'number').map(s => s.scorePercent);
    const notes = [];
    todays.filter(s => s.activityType === 'teacher_checkpoint' && s.teacherNote && s.teacherNote.trim())
        .sort((a, b) => tsOf(a.timestamp) - tsOf(b.timestamp)).forEach(s => notes.push({ ruleId: s.ruleId, note: s.teacherNote.trim() }));
    return {
        ...base, empty: false, day: target, isToday: target === localDayKey(now), rules, stages,
        totals: { activities: todays.length, avgScore: avg(scores) },
        masteredRuleIds: rules.filter(r => r.milestones.approved).map(r => r.ruleId),
        badgeKeys: achievements.filter(a => isOnDay(a.earnedAt)).map(a => a.badgeKey),
        notes
    };
}

// ============================================================
// ملخص الحكم (من البداية حتى الآن)
// ============================================================
export function buildRuleSummary({ student, ruleId, stageId = null, sessions = [], mastery = [], dueRuleIds = [], now = Date.now() }) {
    const rec = mastery.find(m => m.ruleId === ruleId) || null, j = ensureJourney(rec);
    const mine = sessions.filter(s => s.ruleId === ruleId);
    const checkpoints = mine.filter(s => s.activityType === 'teacher_checkpoint').sort((a, b) => tsOf(a.timestamp) - tsOf(b.timestamp));
    const lastCp = checkpoints.length ? checkpoints[checkpoints.length - 1] : null;
    const withNote = [...checkpoints].reverse().find(s => s.teacherNote && s.teacherNote.trim());
    const attempts = j.examAttempts || [];
    const lastAttempt = attempts.length ? attempts[attempts.length - 1] : null;
    return {
        kind: 'rule', studentName: student.name, ruleId, stageId: stageId || (rec && rec.stageId) || null,
        step: journeyStep(j), status: rec ? rec.status : 'available',
        learned: { done: !!j.learnedAt, at: j.learnedAt },
        practice: { done: !!j.practicePassedAt, at: j.practicePassedAt, best: j.practiceBest || 0, count: j.practiceCount || 0 },
        exam: { done: !!j.examPassedAt, at: j.examPassedAt, attempts: attempts.length, last: lastAttempt ? lastAttempt.score : null, best: attempts.length ? Math.max(...attempts.map(a => a.score)) : null },
        teacher: { approved: !!j.teacherApprovedAt, at: j.teacherApprovedAt, score: lastCp ? lastCp.scorePercent : null, sessions: checkpoints.length },
        activities: groupActivities(mine),
        note: withNote ? withNote.teacherNote.trim() : '',
        lastAt: mine.length ? Math.max(...mine.map(s => tsOf(s.timestamp))) : null,
        ...nextInfo({ student, mastery, sessions, dueRuleIds, now })
    };
}

// ============================================================
// نص الرسالة (واتساب: *غامق*). ctx = { tr(key, vars), ruleName(id), stageName(id), badgeName(key), formatDate(ts|dayKey), note, includeHome }
// ============================================================
const fill = (tr, key, vars) => tr(key, vars || {});
// العدد في العربية: مفرد (١) ومثنى (٢) وجمع (٣-١٠) وتمييز مفرد (١١+)؛ فتُصاغ «جلسة واحدة/جلستان/٣ جلسات/١١ جلسة» لا «١ جلسات».
// الإنجليزية تستعمل نفس المفاتيح (المفرد ثم الجمع). base مثل tjw_sm_n_session ← tjw_sm_n_session_1 / _2 / _few / _many
export const pluralKey = (n) => n === 1 ? '1' : n === 2 ? '2' : n <= 10 ? 'few' : 'many';
const counted = (tr, base, n) => tr(`${base}_${pluralKey(n)}`, { n });
// أفضل نتيجة في هذا النوع (للولي: التقدّم لا التعثّر العابر)، وعدد المرات إن تكرّر
const actText = (tr, g) => `${tr('tjw_sm_act_' + g.mode)} ${g.best}%${g.count > 1 ? ` ×${g.count}` : ''}`;

function tailLines(model, ctx) {
    const { tr, ruleName } = ctx, out = [];
    if (model.next) {
        out.push(fill(tr, 'tjw_sm_next', { rule: ruleName(model.next.ruleId), step: tr('tjw_sm_step_' + model.next.step) }));
    } else if (model.allDone) out.push(tr('tjw_sm_all_done'));
    if (model.due > 0) out.push(counted(tr, 'tjw_sm_due', model.due));
    if (ctx.includeHome !== false) {
        const step = model.next ? model.next.step : 'mastered';
        out.push(fill(tr, 'tjw_sm_home', { text: tr('tjw_sm_home_' + homeKeyForStep(step)) }));
    }
    return out;
}

export function formatSummaryText(model, ctx) {
    const { tr, ruleName, stageName, badgeName, formatDate } = ctx;
    const L = [tr('tjw_sm_greet')];
    if (model.kind === 'session') {
        L.push(fill(tr, 'tjw_sm_title_session', { student: model.studentName }));
        if (model.empty) { L.push(tr('tjw_sm_empty')); return L.join('\n'); }
        L.push(fill(tr, 'tjw_sm_date', { date: formatDate(model.day) }));
        L.push('', tr('tjw_sm_learned_head'));
        model.rules.forEach(r => {
            const ms = [];
            if (r.milestones.learned) ms.push(tr('tjw_sm_ms_learned'));
            if (r.milestones.practice) ms.push(tr('tjw_sm_ms_practice'));
            if (r.milestones.exam !== undefined) ms.push(r.milestones.exam === null ? tr('tjw_sm_ms_exam_plain') : fill(tr, 'tjw_sm_ms_exam', { score: r.milestones.exam }));
            if (r.milestones.approved) ms.push(tr('tjw_sm_ms_approved'));
            L.push(r.stageId ? fill(tr, 'tjw_sm_rule_bullet', { rule: ruleName(r.ruleId), stage: stageName(r.stageId) }) : fill(tr, 'tjw_sm_rule_bullet_plain', { rule: ruleName(r.ruleId) }));
            const acts = r.activities.map(g => actText(tr, g));
            if (acts.length) L.push('▫️ ' + acts.join(' · '));
            if (ms.length) L.push(ms.map(x => '✅ ' + x).join(' · '));
        });
        model.stages.forEach(s => L.push(fill(tr, 'tjw_sm_stage_bullet', { stage: stageName(s.stageId), acts: s.activities.map(g => actText(tr, g)).join(' · ') })));
        const wins = [
            ...model.masteredRuleIds.map(id => fill(tr, 'tjw_sm_win_mastered', { rule: ruleName(id) })),
            ...model.badgeKeys.map(k => fill(tr, 'tjw_sm_win_badge', { badge: badgeName(k) }))
        ];
        if (wins.length) { L.push('', tr('tjw_sm_wins_head')); wins.forEach(w => L.push('• ' + w)); }
        if (model.totals.avgScore !== null) L.push('', fill(tr, 'tjw_sm_totals', { activities: counted(tr, 'tjw_sm_n_activity', model.totals.activities), avg: model.totals.avgScore }));
        const notes = model.notes.map(n => n.note);
        if (ctx.note && ctx.note.trim()) notes.push(ctx.note.trim());
        const tail = tailLines(model, ctx);
        if (tail.length) L.push('', ...tail);
        [...new Set(notes)].forEach(n => L.push(fill(tr, 'tjw_sm_note', { note: n })));
    } else {
        const rn = ruleName(model.ruleId);
        L.push(fill(tr, 'tjw_sm_title_rule', { rule: rn, student: model.studentName }));
        if (model.stageId) L.push(fill(tr, 'tjw_sm_stage_line', { stage: stageName(model.stageId) }));
        L.push('');
        const d = (ts) => ts ? formatDate(ts) : '';
        L.push(model.learned.done ? fill(tr, 'tjw_sm_r_learned_done', { date: d(model.learned.at) }) : tr('tjw_sm_r_learned_todo'));
        L.push(model.practice.done ? fill(tr, 'tjw_sm_r_practice_done', { best: model.practice.best, sessions: counted(tr, 'tjw_sm_n_session', model.practice.count) })
            : model.practice.count ? fill(tr, 'tjw_sm_r_practice_part', { best: model.practice.best, sessions: counted(tr, 'tjw_sm_n_session', model.practice.count) }) : tr('tjw_sm_r_practice_todo'));
        L.push(model.exam.done ? fill(tr, 'tjw_sm_r_exam_done', { best: model.exam.best, attempts: counted(tr, 'tjw_sm_n_attempt', model.exam.attempts) })
            : model.exam.attempts ? fill(tr, 'tjw_sm_r_exam_part', { attempts: counted(tr, 'tjw_sm_n_attempt', model.exam.attempts), last: model.exam.last }) : tr('tjw_sm_r_exam_todo'));
        L.push(model.teacher.approved ? fill(tr, 'tjw_sm_r_teacher_done', { score: model.teacher.score === null ? '—' : model.teacher.score + '%', date: d(model.teacher.at) })
            : model.exam.done ? tr('tjw_sm_r_teacher_wait') : tr('tjw_sm_r_teacher_todo'));
        L.push('', tr(model.status === 'needs_review' ? 'tjw_sm_status_review' : model.teacher.approved ? 'tjw_sm_status_mastered' : 'tjw_sm_status_learning'));
        const notes = [];
        if (model.note) notes.push(model.note);
        if (ctx.note && ctx.note.trim()) notes.push(ctx.note.trim());
        const tail = tailLines(model, ctx);
        if (tail.length) L.push('', ...tail);
        [...new Set(notes)].forEach(n => L.push(fill(tr, 'tjw_sm_note', { note: n })));
    }
    L.push('', tr('tjw_sm_closing'));
    return L.join('\n');
}

// ============================================================
// تنظيف النص قبل النسخ (واتساب): أسطر \n موحّدة، بلا مسافات زائدة في نهاية الأسطر أو في الطرفين، وسطر فارغ واحد كحدّ أقصى بين
// الفقرات، وبلا رموز تحكّم خفية (مثل علامات الاتجاه الزائدة) قد تلصقها نسخة من مكان آخر — يطبَّق على ما يراه المعلم في
// المربع بعد تعديله، فيصل إلى واتساب كما يتوقعه تماماً.
// ============================================================
export function cleanForCopy(text) {
    return String(text == null ? '' : text)
        .replace(/\r\n?/g, '\n')
        .replace(/[\u200B-\u200D\u2060\uFEFF\u202A-\u202E\u2066-\u2069]/g, '')   // أصفار العرض وعلامات الاتجاه المضمَّنة (لا RLM/LRM العادية)
        .replace(/[ \t\u00A0]+$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
