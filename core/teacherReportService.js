// core/teacherReportService.js
// =============================================================================
// 📊 جمع «حقائق» كل طلاب المعلم لشهر معيّن من مصادر المنصة المحلية (طبقة الربط بين البيانات وengine/teacherReportEngine.js):
//   • الحضور والحلقات: engine/attendanceEngine.js (جدول الطالب + أدلة النشاط) عبر core/badgeService.js (نفس مصدر التقرير الشهري للطالب)
//   • الألعاب الفردية: history_<id> (بلا الواجبات) + وقت الإجابة الفعلي من أحداث الأداء (timeSec) في DarHamTracking
//   • المواجهات الثنائية: DarHamDualTests (مواجهة مكتملة واحدة تُعدّ مرة واحدة للمعلم ولو شارك فيها طالبان)
//   • الحفظ: سجل الحفظ الشهري المؤكَّد (newAyahs) · المراجعة: «دفتر المراجعة» (ألعاب + واجب) + شاشة مراجعة الشهر
// كل مصدر محمي بـtry: غيابه لا يكسر التقرير، فقط يُحسب صفرًا. الطلاب المخفيون (isHidden) لا يدخلون التقرير.
// =============================================================================
import { AppState } from './app.js';
import { loadStudentContext, evidenceTimestamps } from './badgeService.js';
import { summarizeMonth, evidenceDays, hasSchedule, dateKey } from '../engine/attendanceEngine.js';
import { distinctReviewForMonth, reviewCountsForMonth } from '../engine/ayahCount.js';
import { normalizeReview } from '../engine/reviewParts.js';
import { studentOutcomeInMatch } from '../engine/dualTestEngine.js';
import { starsInMonth } from './goldStars.js';
import { normalizeName } from './homeworkRecords.js';
import { ensureJourney } from '../engine/tajweedJourney.js';
import { buildTeacherReport, juzOfAyah, gameSecondsFromEvents } from '../engine/teacherReportEngine.js';

const range = (y, m) => [new Date(y, m, 1).getTime(), new Date(y, m + 1, 1).getTime()];
const inMonth = (ts, y, m) => { const [a, b] = range(y, m); return Number.isFinite(ts) && ts >= a && ts < b; };
const prevOf = (y, m) => (m === 0 ? [y - 1, 11] : [y, m - 1]);

const CHALLENGE_TYPES = new Set(['identify_rule', 'discover_in_ayah', 'challenge']);   // جلسات «تحدي التجويد» (ركن التحدي + وضع challenge)
const tsOf = (v) => (typeof v === 'number' ? v : Date.parse(v));
const HW_SKIP = new Set(['draft', 'deleted', 'cancelled', 'canceled', 'rejected']);

/** الواجبات التي صنعها المعلم في الشهر: { made, questions, byName: Map(اسم مُطبَّع → عدد) }. */
export function homeworkMadeInMonth(homeworks, y, m) {
    const out = { made: 0, questions: 0, byName: new Map() };
    (homeworks || []).forEach(h => {
        if (!h || HW_SKIP.has(h.status) || !inMonth(Date.parse(h.createdAt), y, m)) return;
        out.made++;
        out.questions += Array.isArray(h.questions) ? h.questions.length : 0;
        const n = normalizeName(h.assignedStudentName);
        if (n) out.byName.set(n, (out.byName.get(n) || 0) + 1);
    });
    return out;
}

/** المتشابهات: جولات الطالب في الشهر من سجل جلساتها. */
export function similarityFacts(sessions, y, m) {
    const mine = (sessions || []).filter(x => x && inMonth(Number(x.at), y, m));
    return {
        rounds: mine.length,
        questions: mine.reduce((n, x) => n + (Number(x.total) || 0), 0),
        correct: mine.reduce((n, x) => n + (Number(x.correct) || 0), 0),
        days: mine.map(x => dateKey(Number(x.at)))
    };
}

async function similaritySessionsOf(student) {
    try {
        if (!AppState.similaritiesManager) return [];
        return (await AppState.similaritiesManager.getSessionsByStudent(student.id)) || [];
    } catch (e) { return []; }
}

async function trackingEventsOf(student) {
    try { return (AppState.trackingManager && await AppState.trackingManager.getEventsForStudent(student.id)) || []; }
    catch (e) { return []; }
}

/** حقائق طالب لشهر (y, m0) من سياقه المحمَّل مسبقًا (ctx) وأحداث أدائه. now يقصّ حضور الشهر الجاري «حتى اليوم». */
export function factsForMonth(ctx, events, y, m, now = new Date(), extra = {}) {
    const s = ctx.student;
    const surahsData = ctx.surahsData || [];
    const [a, b] = range(y, m);

    // الحضور: حصص الحضور (المجدولة + الإضافية) ومدتها المسجَّلة في ملف الطالب
    let att = null;
    const ev = evidenceDays(evidenceTimestamps(ctx));
    if (hasSchedule(s)) {
        const upTo = (now.getFullYear() === y && now.getMonth() === m) ? now : null;
        const sm = summarizeMonth(s, y, m, ev, upTo);
        att = { present: sm.present + sm.extra, absent: sm.absent, expected: sm.expected, minutes: sm.totalMinutes };
    }

    // الألعاب الفردية
    const games = ctx.games.filter(g => inMonth(g.timestamp, y, m));

    // المواجهات الثنائية المكتملة
    const duels = ctx.matches.filter(mm => inMonth(new Date(mm.finishedAt).getTime(), y, m)).map(mm => {
        const o = studentOutcomeInMatch(mm, s.id);
        return { id: mm.id, won: o === 'win' ? true : o === 'loss' ? false : null };
    });

    // الواجبات المسلَّمة (من دفتر المراجعة) والحفظ والمراجعة
    const rv = ctx.reviewAyahs || { games: [], homework: [] };
    const hwSubs = (rv.homework || []).filter(x => x && inMonth(x.ts, y, m));
    const rec = (ctx.records || []).find(r => r.year === y && r.month === m + 1) || null;
    const memo = rec && typeof rec.newAyahs === 'number' && rec.newAyahs > 0 ? { newAyahs: rec.newAyahs } : null;

    const dist = distinctReviewForMonth(rv, y, m);
    const surahs = new Set(), juz = new Set();
    dist.keys.forEach(k => {
        const [sn, an] = String(k).split(':').map(Number);
        if (sn >= 1 && sn <= 114) surahs.add(sn);
        const j = juzOfAyah(sn, an); if (j) juz.add(j);
    });
    // شاشة «مراجعة الشهر» التي يسجّلها المعلم: كل سور وأجزاء المقاطع المختارة
    if (rec && rec.review) {
        normalizeReview(rec.review, surahsData).forEach(e => {
            juz.add(Number(e.juz));
            const lo = Math.min(e.from.surah, e.to.surah), hi = Math.max(e.from.surah, e.to.surah);
            for (let n = lo; n <= hi; n++) surahs.add(n);
        });
    }
    const counts = reviewCountsForMonth(rv, y, m);

    // التجويد
    const tjMonth = (ctx.tjSessions || []).filter(x => x && inMonth(tsOf(x.timestamp), y, m));
    const tjChallenge = tjMonth.filter(x => CHALLENGE_TYPES.has(x.activityType));
    const at = (iso) => (iso ? Date.parse(iso) : NaN);
    const tj = { sessions: tjMonth.length, challenge: tjChallenge.length,
        questions: tjMonth.reduce((n, x) => n + (Number(x.totalQuestions) || 0), 0), correct: tjMonth.reduce((n, x) => n + (Number(x.correctCount) || 0), 0),
        learned: 0, examPassed: 0, approved: 0 };
    (ctx.mastery || []).forEach(rec => {
        const j = ensureJourney(rec);
        if (inMonth(at(j.learnedAt), y, m)) tj.learned++;
        if (inMonth(at(j.examPassedAt), y, m)) tj.examPassed++;
        if (inMonth(at(j.teacherApprovedAt), y, m)) tj.approved++;
    });
    const sim = similarityFacts(extra.similaritySessions, y, m);

    // أيام النشاط (أي أثر): ألعاب، مواجهات، تجويد، حضور مؤكَّد
    const days = new Set();
    ev.forEach(k => { const [yy, mm] = k.split('-').map(Number); if (yy === y && mm === m + 1) days.add(k); });
    if (s.attendance) Object.keys(s.attendance).forEach(k => { if (s.attendance[k] === 'present') { const [yy, mm] = k.split('-').map(Number); if (yy === y && mm === m + 1) days.add(k); } });
    games.forEach(g => days.add(dateKey(g.timestamp)));
    sim.days.forEach(k => days.add(k));
    tjMonth.forEach(x => days.add(dateKey(tsOf(x.timestamp))));

    return {
        id: s.id, name: s.name || '',
        att,
        games: { total: games.length, weakness: games.filter(g => g.mode === 'weakness').length, seconds: gameSecondsFromEvents(events, y, m) },
        duels,
        homework: { count: hwSubs.length },
        memo,
        review: { total: counts.total, distinct: dist.total, surahs: [...surahs], juz: [...juz] },
        tajweed: tj,
        similarity: { rounds: sim.rounds, questions: sim.questions, correct: sim.correct },
        hwAssigned: (extra.hwByName && extra.hwByName.get(normalizeName(s.name))) || 0,
        stars: starsInMonth(s, y, m) || 0,
        days: [...days].filter(k => { const t = new Date(k + 'T12:00:00').getTime(); return t >= a && t < b; })
    };
}

/** حقائق صفرية لطالب تعذّرت قراءة بياناته: يبقى في التقرير (كل الطلاب بلا استثناء). */
const emptyFacts = (s) => ({ id: s.id, name: s.name || '', att: null, games: { total: 0, weakness: 0, seconds: 0 }, duels: [], homework: { count: 0 }, memo: null,
    review: { total: 0, distinct: 0, surahs: [], juz: [] }, tajweed: { sessions: 0, challenge: 0, questions: 0, correct: 0, learned: 0, examPassed: 0, approved: 0 },
    similarity: { rounds: 0, questions: 0, correct: 0 }, hwAssigned: 0, stars: 0, days: [] });

/** التقرير الكامل للمعلم لشهر (y, m0): كل الطلاب بلا استثناء (حتى المخفيون ومن بلا نشاط). */
export async function loadTeacherMonthReport(year, monthIndex0, { now = new Date(), onProgress = null } = {}) {
    const mgr = AppState.studentManager;
    const students = mgr ? ((await mgr.getAllStudents()) || []).filter(Boolean) : [];
    const [py, pm] = prevOf(year, monthIndex0);
    let homeworks = [];
    try { homeworks = (AppState.homeworkManager && await AppState.homeworkManager.getAllHomeworks()) || []; } catch (e) { /* اختياري */ }
    const hwCur = homeworkMadeInMonth(homeworks, year, monthIndex0), hwPrev = homeworkMadeInMonth(homeworks, py, pm);
    const curFacts = [], prevFacts = [];
    let done = 0;
    for (const s of students) {
        try {
            const ctx = await loadStudentContext(s);
            const events = await trackingEventsOf(s);
            const similaritySessions = await similaritySessionsOf(s);
            curFacts.push(factsForMonth(ctx, events, year, monthIndex0, now, { similaritySessions, hwByName: hwCur.byName }));
            prevFacts.push(factsForMonth(ctx, events, py, pm, now, { similaritySessions, hwByName: hwPrev.byName }));
        } catch (e) {
            console.warn('[teacherReport] تعذر قراءة بيانات طالب:', s && s.id, e);
            curFacts.push(emptyFacts(s)); prevFacts.push(emptyFacts(s));
        }
        done++;
        if (onProgress) onProgress(done, students.length);
    }
    const report = buildTeacherReport({
        curFacts, prevFacts, year, monthIndex0,
        curTeacher: { hwMade: hwCur.made, hwQuestions: hwCur.questions }, prevTeacher: { hwMade: hwPrev.made, hwQuestions: hwPrev.questions }
    });
    const hidden = new Map(students.map(s => [String(s.id), !!s.isHidden]));
    // الأكثر نشاطًا أولًا؛ كل الطلاب يظهرون ولو بلا نشاط
    report.students = curFacts.map(f => ({
        id: f.id, name: f.name, hidden: !!hidden.get(String(f.id)),
        sessions: f.att ? f.att.present : 0,
        minutes: f.att ? f.att.minutes : 0,
        games: f.games.total, gameMinutes: Math.round(f.games.seconds / 60),
        duels: f.duels.length,
        newAyahs: f.memo ? f.memo.newAyahs : 0,
        reviewAyahs: f.review.total,
        hwSubmitted: f.homework.count, hwAssigned: f.hwAssigned,
        similarity: f.similarity.rounds,
        tajweed: f.tajweed.sessions,
        stars: f.stars
    })).sort((x, y) => (y.sessions + y.games + y.newAyahs + y.reviewAyahs + y.similarity + y.tajweed) - (x.sessions + x.games + x.newAyahs + x.reviewAyahs + x.similarity + x.tajweed));
    return report;
}
