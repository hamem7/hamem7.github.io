// core/badgeService.js
// =============================================================================
// 🏅 خدمة الأوسمة: تجمع بيانات الطالب (ألعاب، حفظ، مراجعة، تجويد، مواجهات، حضور، نجوم) وتغذّي engine/badgesEngine.js.
// • computeBadgesForMonth: أوسمة شهر بعينه (تعمل بأثر رجعي لكل شهر له بيانات مؤرَّخة).
// • awardNewBadges: يقارن الشهر الحالي بسجل student.badgeLedger ويُرجع الأوسمة/الدرجات الجديدة فقط (لتُعرض بالمشهد السينمائي).
// • badgeHistory: كل الأشهر + أعلى درجة لكل وسام + «الاستمرارية» (أشهر ذهبي فأعلى).
// ما لا يُحسب رجعيًا (لا تواريخ له): نجوم قديمة بلا starLog، وحضور قبل ضبط الجدول (schedule.since).
// =============================================================================
import { AppState } from './app.js';
import './i18n-badges.js';
import { computeMonthBadges, summarizeEarned, getBadgeDef, BADGE_DEFS, TIER_KEYS, RISER_MIN_GAMES } from '../engine/badgesEngine.js';
import { starsInMonth } from './goldStars.js';
import { ensureJourney } from '../engine/tajweedJourney.js';
import { summarizeReview } from '../engine/reviewParts.js';
import { studentOutcomeInMatch } from '../engine/dualTestEngine.js';
import { summarizeMonth, evidenceDays, hasSchedule, collectEvidenceTimestamps } from '../engine/attendanceEngine.js';

const monthKey = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`;
const range = (y, m) => [new Date(y, m, 1).getTime(), new Date(y, m + 1, 1).getTime()];
const inRange = (ts, y, m) => { const [a, b] = range(y, m); return typeof ts === 'number' && ts >= a && ts < b; };
const prevMonth = (y, m) => (m === 0 ? [y - 1, 11] : [y, m - 1]);

// تاريخ سجل قديم بلا timestamp: يُقبل فقط نمط «yyyy / mm / dd» الذي تكتبه المنصة؛ غيره لا يُخمَّن.
export function entryTimestamp(e) {
    if (e && typeof e.timestamp === 'number') return e.timestamp;
    const m = e && typeof e.date === 'string' ? e.date.match(/^\s*(\d{4})\s*\/\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*$/) : null;
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12).getTime() : null;
}

export function readHistory(studentId) {
    try { const a = JSON.parse(localStorage.getItem(`history_${studentId}`)); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}

/** الألعاب الفردية (كبار/أطفال) فقط — بلا واجبات (hwId). */
export function individualGames(history) {
    const out = [];
    for (const e of history || []) {
        if (!e || e.hwId || e.source === 'homework') continue;
        const ts = entryTimestamp(e);
        if (ts == null || typeof e.score !== 'number') continue;
        out.push({ timestamp: ts, score: e.score, mode: e.mode === 'weakness' ? 'weakness' : 'eval' });
    }
    return out;
}

/** يحمّل كل مصادر طالب مرة واحدة (للاستعمال عبر عدة أشهر). كل مصدر محمي بـtry فلا يكسر البقية. */
export async function loadStudentContext(student) {
    const ctx = { student, games: individualGames(readHistory(student.id)), matches: [], allMatches: [], mastery: [], tjSessions: [], ruleReviews: [], records: [], surahsData: AppState.surahsData || [] };
    try { if (AppState.dualTestsManager) { ctx.allMatches = (await AppState.dualTestsManager.getAllMatches()).filter(m => String(m.studentIdA) === String(student.id) || String(m.studentIdB) === String(student.id)); ctx.matches = ctx.allMatches.filter(m => m.status === 'completed' && m.finishedAt); } } catch (e) { /* اختياري */ }
    try { if (AppState.reviewScheduleManager) ctx.ruleReviews = await AppState.reviewScheduleManager.getRuleSchedulesByStudent(student.id); } catch (e) { /* اختياري */ }
    try { if (AppState.tajweedManager) { ctx.mastery = await AppState.tajweedManager.getMasteryByStudent(student.id); ctx.tjSessions = await AppState.tajweedManager.getSessionsByStudent(student.id); } } catch (e) { /* اختياري */ }
    try { if (AppState.monthlyMemorizationManager) ctx.records = await AppState.monthlyMemorizationManager.getAllForStudent(student.id); } catch (e) { /* اختياري */ }
    // «دفتر المراجعة»: أسئلة الألعاب الفردية (سؤال = آية) — مصدر وسام «بطل المراجعة»
    try { ctx.gameQuestionTimes = await (await import('./trackingService.js')).gameQuestionTimes(student); } catch (e) { ctx.gameQuestionTimes = null; }
    return ctx;
}

/** أدلة الحضور: أي أثر للطالب في الألعاب الفردية/المواجهات/التجويد ولو لم يكتمل (engine/attendanceEngine.js). */
export function evidenceTimestamps(ctx) {
    return collectEvidenceTimestamps(ctx.student, { games: ctx.games, matches: ctx.allMatches, tjSessions: ctx.tjSessions, mastery: ctx.mastery, ruleReviews: ctx.ruleReviews });
}

function tajweedCounts(ctx, y, m) {
    if (!ctx.mastery.length) return null;
    const c = { learned: 0, practiced: 0, examFirstTry: 0, approved: 0 };
    const at = (iso) => iso ? Date.parse(iso) : NaN;
    for (const rec of ctx.mastery) {
        const j = ensureJourney(rec);
        if (inRange(at(j.learnedAt), y, m)) c.learned++;
        if (inRange(at(j.practicePassedAt), y, m)) c.practiced++;
        const first = (j.examAttempts || [])[0];
        if (first && first.passed && inRange(at(first.at), y, m)) c.examFirstTry++;
        if (inRange(at(j.teacherApprovedAt), y, m)) c.approved++;
    }
    return c;
}

// جلسات التجويد التي ليست «ألعابًا» (اختبار الحكم واعتماد المعلم) لا تُعدّ في «مطبّق التجويد»
const NON_GAME_TJ = new Set(['exam', 'teacher_checkpoint']);
function tajweedCorrectInMonth(ctx, y, m) {
    if (!ctx.tjSessions.length) return null;
    let n = 0;
    for (const s of ctx.tjSessions) {
        if (!s || NON_GAME_TJ.has(s.activityType)) continue;
        const ts = typeof s.timestamp === 'number' ? s.timestamp : Date.parse(s.timestamp);
        if (inRange(ts, y, m) && Number.isFinite(s.correctCount)) n += Math.max(0, s.correctCount);
    }
    return n;
}

/** متوسط نتائج الألعاب لهذا الشهر وما قبله (حتى ٦ أشهر)؛ null لشهر بلا عدد كافٍ من الألعاب. */
function monthAverages(ctx, y, m, back = 6) {
    const out = [];
    let yy = y, mm = m;
    for (let i = 0; i <= back; i++) {
        const gs = ctx.games.filter(g => inRange(g.timestamp, yy, mm));
        out.push(gs.length >= RISER_MIN_GAMES ? gs.reduce((a, g) => a + g.score, 0) / gs.length : null);
        [yy, mm] = prevMonth(yy, mm);
    }
    return out;
}

/** مدخلات محرّك الأوسمة لشهر (y, m0). now يحدّد «حتى اليوم» للشهر الجاري في حساب الحضور. */
export function inputsForMonth(ctx, y, m, now = new Date()) {
    const s = ctx.student;
    const games = ctx.games.filter(g => inRange(g.timestamp, y, m));
    const [py, pm] = prevMonth(y, m);
    const prevGames = ctx.games.filter(g => inRange(g.timestamp, py, pm));
    const rec = ctx.records.find(r => r.year === y && r.month === m + 1) || null;
    const hasEnding = !!(rec && rec.ending && typeof rec.newAyahs === 'number');
    let reviewParts = null;
    // مراجعة الشهر المسجَّلة في ملف الطالب (شاشة مراجعة الشهر): عدد الأجزاء المُراجَعة (وسام الراسخ)
    if (rec) { const sum = rec.review ? summarizeReview(rec.review, ctx.surahsData) : null; reviewParts = sum ? sum.juzCount : 0; }
    const reviewQuestions = Array.isArray(ctx.gameQuestionTimes) ? ctx.gameQuestionTimes.filter(ts => inRange(ts, y, m)).length : null;
    const monthMatches = ctx.matches.filter(mm => inRange(new Date(mm.finishedAt).getTime(), y, m));
    let attendance = null;
    if (hasSchedule(s)) {
        const since = s.schedule.since || 0, [, end] = range(y, m);
        if (end > since) {
            const upTo = (now.getFullYear() === y && now.getMonth() === m) ? now : null;
            const sm = summarizeMonth(s, y, m, evidenceDays(evidenceTimestamps(ctx)), upTo);
            // الأيام غير المؤكَّدة لا تُحتسب غيابًا؛ نقيس النسبة على (حاضر + غائب مؤكَّد) فقط حتى لا يُظلَم الطالب بنقص تسجيل
            const decided = sm.present + sm.absent;
            if (decided > 0) attendance = { expected: decided, present: sm.present };
        }
    }
    return {
        games: games.length || ctx.games.length ? games : null,
        prevGames: prevGames.length ? prevGames : null,
        monthAvgs: monthAverages(ctx, y, m),
        stars: starsInMonth(s, y, m),
        newAyahs: hasEnding ? rec.newAyahs : null,
        reviewParts,
        reviewQuestions,
        tajweedCorrect: tajweedCorrectInMonth(ctx, y, m),
        duelWins: monthMatches.length ? monthMatches.filter(mm => studentOutcomeInMatch(mm, s.id) === 'win').length : null,
        attendance,
        tajweed: tajweedCounts(ctx, y, m)
    };
}

export async function computeBadgesForMonth(student, y, m, ctx = null, now = new Date()) {
    const c = ctx || await loadStudentContext(student);
    const results = computeMonthBadges(inputsForMonth(c, y, m, now));
    return { results, summary: summarizeEarned(results), ctx: c };
}

/** يقارن بالسجل ويحفظ الجديد. يُرجع [{key, icon, tier, tierKey, value, next, prevTier}] للأوسمة التي ارتفعت درجتها فقط. */
// groups (اختياري): مجموعات تُقيَّم/تُعرض الآن فقط (games|memorize|engage|tajweed|duels)؛ غيرها لا يُسجَّل في السجل فيُعرض في مكانه لاحقًا.
export async function awardNewBadges(student, now = new Date(), groups = null) {
    try {
        const y = now.getFullYear(), m = now.getMonth();
        const { results } = await computeBadgesForMonth(student, y, m, null, now);
        const ledger = student.badgeLedger && typeof student.badgeLedger === 'object' ? student.badgeLedger : (student.badgeLedger = {});
        const cur = ledger[monthKey(y, m)] || (ledger[monthKey(y, m)] = {});
        const fresh = [];
        for (const r of results) {
            if (r.tier < 0) continue;
            if (groups) { const d = getBadgeDef(r.key); if (!d || !groups.includes(d.group)) continue; }
            const had = typeof cur[r.key] === 'number' ? cur[r.key] : -1;
            if (r.tier > had) { cur[r.key] = r.tier; fresh.push({ ...r, prevTier: had }); }
        }
        if (fresh.length && AppState.studentManager) await AppState.studentManager.updateStudent(student);
        return fresh;
    } catch (e) {
        console.warn('[badgeService] تعذّر تقييم الأوسمة:', e);
        return [];
    }
}

/** كل الأشهر التي فيها وسام + أعلى درجة لكل وسام + أشهر ذهبي فأعلى (الاستمرارية). */
export async function badgeHistory(student, now = new Date(), maxMonths = 24, groups = null) {
    const ctx = await loadStudentContext(student);
    const months = [];
    let y = now.getFullYear(), m = now.getMonth();
    for (let i = 0; i < maxMonths; i++) {
        const results = computeMonthBadges(inputsForMonth(ctx, y, m, now));
        const earned = results.filter(r => r.tier >= 0);
        if (earned.length) months.push({ year: y, month: m, results, earned });
        [y, m] = prevMonth(y, m);
    }
    const best = {};
    BADGE_DEFS.filter(d => !groups || groups.includes(d.group)).forEach(d => { best[d.key] = { key: d.key, bestTier: -1, months: 0, goldMonths: 0 }; });
    months.forEach(mo => mo.earned.forEach(r => {
        const b = best[r.key]; if (!b) return;
        b.bestTier = Math.max(b.bestTier, r.tier); b.months++;
        if (r.tier >= 2) b.goldMonths++;
    }));
    return { months, best: Object.values(best), ctx, tierKeys: TIER_KEYS };
}

/** لقب الاستمرارية بحسب عدد أشهر الذهبي فأعلى: 3 ← ثابت، 6 ← متألق، 12 ← أسطورة. */
export function consistencyTitle(goldMonths) {
    return goldMonths >= 12 ? 'legend' : goldMonths >= 6 ? 'radiant' : goldMonths >= 3 ? 'steady' : null;
}
