// core/teacherReportService.js
// =============================================================================
// 📊 جمع حقائق كل طلاب المعلم لشهر من مصادر المنصة المحلية (طبقة الربط بين البيانات وengine/teacherReportEngine.js). قراءة فقط.
//   • الحلقات: أيام حضور الطالب (engine/attendanceEngine.js) • ألعاب الكبار/الصغار: history_<id> (source: adult_game | kids_game)
//   • وقت الألعاب: زمن الإجابة timeSec من أحداث DarHamTracking (يُقسَّم كبار/صغار) • المواجهات الثنائية المكتملة
//   • الحفظ: سجل الحفظ الشهري المؤكَّد • المراجعة: دفتر المراجعة + شاشة مراجعة الشهر • الواجبات المصنوعة: DarHamHomeworks
//   • المتشابهات: similarity_sessions • التجويد: tajweed_sessions (تحدي التجويد = identify_rule/discover_in_ayah/challenge)
// كل مصدر محمي بـtry. كل الطلاب يدخلون (حتى المخفيون ومن بلا نشاط).
// =============================================================================
import { AppState } from './app.js';
import { loadStudentContext, evidenceTimestamps, readHistory, entryTimestamp } from './badgeService.js';
import { summarizeMonth, evidenceDays, hasSchedule } from '../engine/attendanceEngine.js';
import { distinctReviewForMonth, reviewCountsForMonth } from '../engine/ayahCount.js';
import { normalizeReview } from '../engine/reviewParts.js';
import { normalizeName } from './homeworkRecords.js';
import { ensureJourney } from '../engine/tajweedJourney.js';
import { starsInMonth } from './goldStars.js';
import { buildTeacherReport, juzOfAyah, gameSecondsByKind } from '../engine/teacherReportEngine.js';

const inMonth = (ts, y, m) => Number.isFinite(ts) && ts >= new Date(y, m, 1).getTime() && ts < new Date(y, m + 1, 1).getTime();
const tsOf = (v) => (typeof v === 'number' ? v : Date.parse(v));
const CHALLENGE_TYPES = new Set(['identify_rule', 'discover_in_ayah', 'challenge']);
const HW_SKIP = new Set(['draft', 'deleted', 'cancelled', 'canceled', 'rejected']);

/** الواجبات التي صنعها المعلم في الشهر: { made, byName: Map(اسم مُطبَّع → عدد) }. */
export function homeworkMadeInMonth(homeworks, y, m) {
    const out = { made: 0, byName: new Map() };
    (homeworks || []).forEach(h => {
        if (!h || HW_SKIP.has(h.status) || !inMonth(Date.parse(h.createdAt), y, m)) return;
        out.made++;
        const n = normalizeName(h.assignedStudentName);
        if (n) out.byName.set(n, (out.byName.get(n) || 0) + 1);
    });
    return out;
}

/** الألعاب الفردية للشهر من سجل الطالب، مقسومة: { adult, kids } بعدد الجلسات. */
export function gameCountsFromHistory(history, y, m) {
    const out = { adult: 0, kids: 0 };
    (history || []).forEach(e => {
        if (!e || e.hwId || e.source === 'homework' || typeof e.score !== 'number') return;
        if (!inMonth(entryTimestamp(e), y, m)) return;
        out[e.source === 'kids_game' ? 'kids' : 'adult']++;
    });
    return out;
}

async function safe(fn, fallback) { try { const v = await fn(); return v == null ? fallback : v; } catch (e) { return fallback; } }

export function factsForMonth(ctx, extra, y, m, now = new Date()) {
    const s = ctx.student;
    const surahsData = ctx.surahsData || [];

    let att = null;
    if (hasSchedule(s)) {
        const upTo = (now.getFullYear() === y && now.getMonth() === m) ? now : null;
        const sm = summarizeMonth(s, y, m, evidenceDays(evidenceTimestamps(ctx)), upTo);
        att = { present: sm.present + sm.extra };
    }

    const counts = gameCountsFromHistory(extra.history, y, m);
    const secs = gameSecondsByKind(extra.events, y, m);

    const rv = ctx.reviewAyahs || { games: [], homework: [] };
    const hwSubs = (rv.homework || []).filter(x => x && inMonth(x.ts, y, m)).length;
    const rec = (ctx.records || []).find(r => r.year === y && r.month === m + 1) || null;
    const memo = rec && typeof rec.newAyahs === 'number' && rec.newAyahs > 0 ? { newAyahs: rec.newAyahs } : null;

    const dist = distinctReviewForMonth(rv, y, m);
    const surahs = new Set(), juz = new Set();
    dist.keys.forEach(k => {
        const [sn, an] = String(k).split(':').map(Number);
        if (sn >= 1 && sn <= 114) surahs.add(sn);
        const j = juzOfAyah(sn, an); if (j) juz.add(j);
    });
    if (rec && rec.review) {   // شاشة «مراجعة الشهر» التي يسجّلها المعلم
        normalizeReview(rec.review, surahsData).forEach(e => {
            juz.add(Number(e.juz));
            const lo = Math.min(e.from.surah, e.to.surah), hi = Math.max(e.from.surah, e.to.surah);
            for (let n = lo; n <= hi; n++) surahs.add(n);
        });
    }

    const tjMonth = (ctx.tjSessions || []).filter(x => x && inMonth(tsOf(x.timestamp), y, m));
    const at = (iso) => (iso ? Date.parse(iso) : NaN);
    const learned = (ctx.mastery || []).filter(rec => inMonth(at(ensureJourney(rec).learnedAt), y, m)).length;
    const sims = (extra.similaritySessions || []).filter(x => x && inMonth(Number(x.at), y, m)).length;
    const duels = ctx.matches.filter(mm => inMonth(new Date(mm.finishedAt).getTime(), y, m)).map(mm => ({ id: mm.id }));

    return {
        id: s.id, name: s.name || '', hidden: !!s.isHidden, att,
        adult: { games: counts.adult, seconds: secs.adult }, kids: { games: counts.kids, seconds: secs.kids },
        duels, homework: { submitted: hwSubs }, memo,
        review: { total: reviewCountsForMonth(rv, y, m).total, surahs: [...surahs], juz: [...juz] },
        similarity: { rounds: sims },
        tajweed: { sessions: tjMonth.length, challenge: tjMonth.filter(x => CHALLENGE_TYPES.has(x.activityType)).length, learned },
        stars: starsInMonth(s, y, m) || 0,
        hwAssigned: (extra.hwByName && extra.hwByName.get(normalizeName(s.name))) || 0
    };
}

const emptyFacts = (s) => ({ id: s.id, name: s.name || '', hidden: !!s.isHidden, att: null, adult: { games: 0, seconds: 0 }, kids: { games: 0, seconds: 0 }, duels: [],
    homework: { submitted: 0 }, memo: null, review: { total: 0, surahs: [], juz: [] }, similarity: { rounds: 0 }, tajweed: { sessions: 0, challenge: 0, learned: 0 }, stars: 0, hwAssigned: 0 });

/** تقرير الشهر (y, m0) لكل الطلاب بلا استثناء. */
export async function loadTeacherMonthReport(year, monthIndex0, { now = new Date() } = {}) {
    const mgr = AppState.studentManager;
    const students = mgr ? ((await mgr.getAllStudents()) || []).filter(Boolean) : [];
    const homeworks = await safe(() => AppState.homeworkManager.getAllHomeworks(), []);
    const hw = homeworkMadeInMonth(homeworks, year, monthIndex0);
    const facts = [];
    for (const s of students) {
        try {
            const ctx = await loadStudentContext(s);
            const events = await safe(() => AppState.trackingManager.getEventsForStudent(s.id), []);
            const similaritySessions = await safe(() => AppState.similaritiesManager.getSessionsByStudent(s.id), []);
            facts.push(factsForMonth(ctx, { history: readHistory(s.id), events, similaritySessions, hwByName: hw.byName }, year, monthIndex0, now));
        } catch (e) {
            console.warn('[teacherReport] تعذر قراءة بيانات طالب:', s && s.id, e);
            facts.push(emptyFacts(s));
        }
    }
    return buildTeacherReport({ facts, teacher: { hwMade: hw.made }, year, monthIndex0 });
}
