// engine/teacherReportEngine.js
// =============================================================================
// 📊 «تقرير المعلم الشهري» — محرك خالص (لا DOM ولا IndexedDB ولا localStorage)، يُختبر بـNode:
//   node tests/teacherReportEngine.test.mjs
//
// يأخذ «حقائق» كل طالب لشهر واحد (يجمعها core/teacherReportService.js من مصادر المنصة) ويُرجع تجميعًا للمعلم:
// الحلقات (حصص الحضور) وساعاتها، الألعاب الفردية ووقتها، المواجهات الثنائية، الحفظ الجديد، المراجعة (آيات/سور/أجزاء)،
// أيام العطاء والاستمرارية، مقارنة بالشهر السابق، نجوم الطلاب، والإنجازات (برونزي/فضي/ذهبي) ومستوى المعلم والهدف التالي.
// لا نصوص هنا إطلاقًا: كل ما يُرجع رموز وأرقام، والواجهة تترجمها (عربي/English) من core/i18n-teacherreport.js.
//
// شكل حقائق الطالب (facts):
//   { id, name,
//     att:  { present, absent, expected, minutes } | null,      // حضور الشهر (null بلا جدول)
//     games:{ total, weakness, seconds },                       // الألعاب الفردية (بلا الواجبات)
//     duels:[{ id, won }],                                      // مواجهات مكتملة في الشهر (won: true|false|null)
//     homework:{ count },                                       // واجبات سلّمها في الشهر
//     hwAssigned: عدد الواجبات التي صنعها المعلم لهذا الطالب في الشهر
//     similarity:{ rounds, questions, correct },                // جولات المتشابهات
//     memo: { newAyahs } | null,                                // حفظ الشهر المؤكَّد (null = لم يُسجَّل)
//     review:{ total, distinct, surahs:[رقم], juz:[رقم] },      // مراجعة الشهر
//     tajweed:{ sessions, challenge, questions, correct, learned, examPassed, approved }, // challenge = جلسات «تحدي التجويد»
//     stars, days:['YYYY-MM-DD'] }                              // أيام فيها أي نشاط
// =============================================================================

export const QURAN_AYAHS = 6236;
export const QURAN_PAGES = 604;

/** سلالم الإنجازات: [برونزي، فضي، ذهبي] لكل مقياس. */
export const LADDERS = {
    sessions:     [8, 20, 40],
    hours:        [8, 25, 60],
    memoStudents: [3, 8, 15],
    memoAyahs:    [50, 200, 500],
    reviewAyahs:  [300, 1500, 5000],
    reviewSurahs: [10, 30, 60],
    games:        [30, 120, 400],
    duels:        [3, 10, 30],
    activeDays:   [8, 15, 22],
    homeworkMade: [4, 12, 30],
    similarity:   [5, 20, 60],
    tajweedChallenge: [5, 20, 60]
};
export const LADDER_KEYS = Object.keys(LADDERS);

/** حدود النقاط الدنيا لمستويات المعلم (النقاط = مجموع الدرجات المنالة، أقصاها 27). */
export const LEVEL_MIN_POINTS = [0, 3, 8, 14, 22, 30];
export const LEVEL_KEYS = ['starter', 'steady', 'shining', 'star', 'diamond', 'legend'];

// بداية كل جزء [سورة، آية] — نسخة هنا ليبقى المحرك خالصًا (مطابقة لـengine/reviewParts.js → JUZ_STARTS ويختبرها tests)
const JUZ_STARTS = [
  [1, 1], [2, 142], [2, 253], [3, 93], [4, 24], [4, 148], [5, 82], [6, 111], [7, 88], [8, 41],
  [9, 93], [11, 6], [12, 53], [15, 1], [17, 1], [18, 75], [21, 1], [23, 1], [25, 21], [27, 56],
  [29, 46], [33, 31], [36, 28], [39, 32], [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1]
];
const DEFAULT_QUESTION_SECONDS = 20;   // تقدير سؤال لعبة قديم بلا زمن مسجَّل
const inMonthTs = (ts, y, m) => Number.isFinite(ts) && ts >= new Date(y, m, 1).getTime() && ts < new Date(y, m + 1, 1).getTime();

/** رقم الجزء (1..30) لآية، أو null. */
export function juzOfAyah(surah, ayah) {
    if (!Number.isInteger(surah) || !Number.isInteger(ayah)) return null;
    let juz = null;
    JUZ_STARTS.forEach(([s, a], i) => { if (surah > s || (surah === s && ayah >= a)) juz = i + 1; });
    return juz;
}

/** ثواني الألعاب الفردية في الشهر من أحداث الأداء: المسجَّل فعلاً + تقدير الأسئلة التي لا زمن لها بمتوسط ما سُجّل. */
export function gameSecondsFromEvents(events, y, m) {
    const ev = (events || []).filter(e => e && e.source === 'game' && inMonthTs(e.ts, y, m));
    const known = ev.filter(e => typeof e.timeSec === 'number' && e.timeSec >= 0);
    const knownSum = known.reduce((n, e) => n + e.timeSec, 0);
    const avg = known.length ? knownSum / known.length : DEFAULT_QUESTION_SECONDS;
    return Math.round(knownSum + (ev.length - known.length) * avg);
}

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const sum = (arr, f) => arr.reduce((n, x) => n + num(f(x)), 0);
const round1 = (n) => Math.round(n * 10) / 10;

/** أطول سلسلة أيام متتالية من مفاتيح 'YYYY-MM-DD'. */
export function longestStreak(dayKeys) {
    const days = [...new Set(dayKeys || [])].filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
    let best = 0, run = 0, prev = null;
    for (const k of days) {
        const [y, m, d] = k.split('-').map(Number);
        const ord = Math.round(Date.UTC(y, m - 1, d) / 864e5);
        run = prev !== null && ord === prev + 1 ? run + 1 : 1;
        if (run > best) best = run;
        prev = ord;
    }
    return best;
}

/** أعلى طالب في مقياس (القيمة > 0 فقط)، وعند التعادل الأسبق في الترتيب. */
function topBy(list, f) {
    let best = null;
    for (const s of list) {
        const v = num(f(s));
        if (v > 0 && (!best || v > best.value)) best = { id: s.id, name: s.name, value: v };
    }
    return best;
}

/** مجاميع شهر واحد من حقائق الطلاب. */
export function aggregateMonth(facts, teacher = null) {
    const list = Array.isArray(facts) ? facts.filter(Boolean) : [];
    const att = list.filter(s => s.att);
    const sessions = sum(att, s => s.att.present);
    const sessionMinutes = sum(att, s => s.att.minutes);
    const gameSeconds = sum(list, s => s.games && s.games.seconds);
    const matchIds = new Set();
    let duelParticipants = 0;
    list.forEach(s => (s.duels || []).forEach(d => { if (d && d.id != null) matchIds.add(String(d.id)); duelParticipants++; }));
    const memoList = list.filter(s => s.memo && num(s.memo.newAyahs) > 0);
    const memoAyahs = sum(memoList, s => s.memo.newAyahs);
    const surahSet = new Set(), juzSet = new Set();
    list.forEach(s => { (s.review && s.review.surahs || []).forEach(n => surahSet.add(Number(n))); (s.review && s.review.juz || []).forEach(n => juzSet.add(Number(n))); });
    const days = new Set();
    list.forEach(s => (s.days || []).forEach(k => days.add(k)));
    const activeIds = new Set();
    list.forEach(s => {
        const touched = (s.att && num(s.att.present) > 0) || num(s.games && s.games.total) > 0 || (s.duels && s.duels.length)
            || num(s.homework && s.homework.count) > 0 || (s.memo && num(s.memo.newAyahs) > 0) || num(s.review && s.review.total) > 0
            || num(s.tajweed && s.tajweed.sessions) > 0 || num(s.similarity && s.similarity.rounds) > 0 || num(s.hwAssigned) > 0;
        if (touched) activeIds.add(s.id);
    });
    return {
        studentsTotal: list.length,
        studentsActive: activeIds.size,
        sessions: { count: sessions, minutes: sessionMinutes, hours: round1(sessionMinutes / 60), students: att.filter(s => num(s.att.present) > 0).length },
        games: {
            total: sum(list, s => s.games && s.games.total),
            weakness: sum(list, s => s.games && s.games.weakness),
            seconds: gameSeconds,
            minutes: Math.round(gameSeconds / 60),
            hours: round1(gameSeconds / 3600),
            players: list.filter(s => num(s.games && s.games.total) > 0).length
        },
        duels: { matches: matchIds.size, participants: duelParticipants, wins: sum(list, s => (s.duels || []).filter(d => d && d.won === true).length) },
        homework: {
            submitted: sum(list, s => s.homework && s.homework.count),
            made: num(teacher && teacher.hwMade),                         // واجبات صنعها المعلم
            madeQuestions: num(teacher && teacher.hwQuestions),
            assignedStudents: list.filter(s => num(s.hwAssigned) > 0).length
        },
        similarity: {
            rounds: sum(list, s => s.similarity && s.similarity.rounds),
            questions: sum(list, s => s.similarity && s.similarity.questions),
            correct: sum(list, s => s.similarity && s.similarity.correct),
            players: list.filter(s => num(s.similarity && s.similarity.rounds) > 0).length
        },
        memo: {
            students: memoList.length,
            ayahs: memoAyahs,
            pages: round1((memoAyahs / QURAN_AYAHS) * QURAN_PAGES),
            pctQuran: round1((memoAyahs / QURAN_AYAHS) * 100)
        },
        review: {
            ayahs: sum(list, s => s.review && s.review.total),
            distinct: sum(list, s => s.review && s.review.distinct),
            surahs: surahSet.size,
            surahNumbers: [...surahSet].sort((a, b) => a - b),
            juz: juzSet.size,
            students: list.filter(s => num(s.review && s.review.total) > 0).length
        },
        tajweed: {
            sessions: sum(list, s => s.tajweed && s.tajweed.sessions),
            challenge: sum(list, s => s.tajweed && s.tajweed.challenge),
            questions: sum(list, s => s.tajweed && s.tajweed.questions),
            correct: sum(list, s => s.tajweed && s.tajweed.correct),
            learned: sum(list, s => s.tajweed && s.tajweed.learned),
            examPassed: sum(list, s => s.tajweed && s.tajweed.examPassed),
            approved: sum(list, s => s.tajweed && s.tajweed.approved),
            players: list.filter(s => num(s.tajweed && s.tajweed.sessions) > 0).length
        },
        stars: sum(list, s => s.stars),
        activeDays: days.size,
        longestStreak: longestStreak([...days]),
        spotlight: {
            memorizer: topBy(list, s => s.memo && s.memo.newAyahs),
            reviewer: topBy(list, s => s.review && s.review.total),
            gamer: topBy(list, s => s.games && s.games.total),
            devoted: topBy(list, s => s.att && s.att.present)
        }
    };
}

/** القيمة التي يقيسها كل سلّم من المجاميع. */
export function ladderValue(key, agg) {
    switch (key) {
        case 'sessions': return agg.sessions.count;
        case 'hours': return agg.sessions.hours;
        case 'memoStudents': return agg.memo.students;
        case 'memoAyahs': return agg.memo.ayahs;
        case 'reviewAyahs': return agg.review.ayahs;
        case 'reviewSurahs': return agg.review.surahs;
        case 'games': return agg.games.total;
        case 'duels': return agg.duels.matches;
        case 'activeDays': return agg.activeDays;
        case 'homeworkMade': return agg.homework.made;
        case 'similarity': return agg.similarity.rounds;
        case 'tajweedChallenge': return agg.tajweed.challenge;
        default: return 0;
    }
}

/** درجة (0..3) لقيمة على سلّم. */
export function tierOf(value, ladder) {
    let tier = 0;
    ladder.forEach((min, i) => { if (value >= min) tier = i + 1; });
    return tier;
}

/** الإنجازات المنالة + نقاط المستوى + الهدف الأقرب (أقل نسبة نقص من الدرجة التالية). */
export function achievementsOf(agg) {
    const earned = [];
    let points = 0;
    let next = null;
    for (const key of LADDER_KEYS) {
        const ladder = LADDERS[key], value = ladderValue(key, agg), tier = tierOf(value, ladder);
        points += tier;
        if (tier > 0) earned.push({ key, tier, value });
        if (tier < ladder.length) {
            const target = ladder[tier];
            const ratio = value / target;      // الأقرب إلى 1 هو الأقرب تحقيقًا
            if (!next || ratio > next.ratio) next = { key, tier: tier + 1, target, value, remaining: round1(target - value), ratio };
        }
    }
    if (next) delete next.ratio;
    let level = 0;
    LEVEL_MIN_POINTS.forEach((min, i) => { if (points >= min) level = i; });
    const nextLevelPoints = LEVEL_MIN_POINTS[level + 1] != null ? LEVEL_MIN_POINTS[level + 1] : null;
    return {
        earned, points, maxPoints: LADDER_KEYS.length * 3,
        level: { index: level, key: LEVEL_KEYS[level], nextAt: nextLevelPoints, toNext: nextLevelPoints != null ? nextLevelPoints - points : 0 },
        nextGoal: next
    };
}

/** فرق الشهر عن السابق (null لو لا شهر سابق فيه بيانات فعلية فلا نقارن بصفر مضلِّل). */
export function deltaOf(cur, prev) {
    if (!prev || (!prev.studentsActive && !prev.homework.made)) return null;
    return {
        sessions: cur.sessions.count - prev.sessions.count,
        games: cur.games.total - prev.games.total,
        duels: cur.duels.matches - prev.duels.matches,
        memoAyahs: cur.memo.ayahs - prev.memo.ayahs,
        reviewAyahs: cur.review.ayahs - prev.review.ayahs,
        gameMinutes: cur.games.minutes - prev.games.minutes,
        homeworkMade: cur.homework.made - prev.homework.made,
        similarity: cur.similarity.rounds - prev.similarity.rounds,
        tajweed: cur.tajweed.sessions - prev.tajweed.sessions
    };
}

/** التقرير الكامل: curFacts (الشهر المطلوب) و prevFacts (الشهر السابق، اختياري). */
export function buildTeacherReport({ curFacts, prevFacts = null, curTeacher = null, prevTeacher = null, year, monthIndex0 }) {
    const cur = aggregateMonth(curFacts, curTeacher);
    const prev = prevFacts ? aggregateMonth(prevFacts, prevTeacher) : null;
    return {
        year, monthIndex0,
        ...cur,
        ...achievementsOf(cur),
        delta: deltaOf(cur, prev),
        empty: cur.studentsActive === 0 && cur.homework.made === 0
    };
}
