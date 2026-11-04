// engine/teacherReportEngine.js
// =============================================================================
// 📊 «تقرير المعلم الشهري» — إحصاء بسيط لما أنجزه المعلم مع طلابه في شهر. محرك خالص (لا DOM ولا تخزين)، يُختبر بـNode:
//   node tests/teacherReportEngine.test.mjs
//
// شكل حقائق الطالب (facts) لشهر واحد (يجمعها core/teacherReportService.js):
//   { id, name, hidden,
//     att:  { present } | null,                       // حلقات حضرها (null بلا جدول)
//     adult:{ games, seconds }, kids:{ games, seconds }, // ألعاب الكبار والصغار الفردية ووقت الإجابة بالثواني
//     duels:[{ id }],                                 // مواجهات ثنائية مكتملة
//     homework:{ submitted }, hwAssigned,             // واجبات سلّمها / صُنعت له
//     memo: { newAyahs } | null,
//     review:{ total, surahs:[رقم], juz:[رقم] },
//     similarity:{ rounds }, tajweed:{ sessions, challenge, learned }, stars }
// =============================================================================

// بداية كل جزء [سورة، آية] — نسخة هنا ليبقى المحرك خالصًا (يختبر tests مطابقتها لـengine/reviewParts.js)
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

/**
 * ثواني الألعاب الفردية في الشهر من أحداث الأداء، مقسومة: { adult, kids }.
 * سؤال الأطفال = حدث من جلسة فيها نوع سؤال يبدأ بـ kids_ (الجلسة كلها تُنسب للأطفال).
 * الأسئلة بلا زمن مسجَّل تُقدَّر بمتوسط المسجَّل (أو 20 ثانية إن لم يُسجَّل شيء).
 */
export function gameSecondsByKind(events, y, m) {
    const ev = (events || []).filter(e => e && e.source === 'game' && inMonthTs(e.ts, y, m));
    const kidsRefs = new Set(ev.filter(e => /^kids_/.test(e.fmt || '')).map(e => String(e.refId)));
    const known = ev.filter(e => typeof e.timeSec === 'number' && e.timeSec >= 0);
    const avg = known.length ? known.reduce((n, e) => n + e.timeSec, 0) / known.length : DEFAULT_QUESTION_SECONDS;
    const out = { adult: 0, kids: 0 };
    ev.forEach(e => {
        const sec = typeof e.timeSec === 'number' && e.timeSec >= 0 ? e.timeSec : avg;
        out[kidsRefs.has(String(e.refId)) ? 'kids' : 'adult'] += sec;
    });
    return { adult: Math.round(out.adult), kids: Math.round(out.kids) };
}

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const sum = (arr, f) => arr.reduce((n, x) => n + num(f(x)), 0);

/** مجاميع الشهر من حقائق كل الطلاب (بلا استثناء) + ما صنعه المعلم نفسه: teacher = { hwMade }. */
export function buildTeacherReport({ facts, teacher = null, year, monthIndex0 }) {
    const list = Array.isArray(facts) ? facts.filter(Boolean) : [];
    const matchIds = new Set();
    const surahSet = new Set(), juzSet = new Set();
    list.forEach(s => {
        (s.duels || []).forEach(d => { if (d && d.id != null) matchIds.add(String(d.id)); });
        ((s.review && s.review.surahs) || []).forEach(n => surahSet.add(Number(n)));
        ((s.review && s.review.juz) || []).forEach(n => juzSet.add(Number(n)));
    });
    const memoList = list.filter(s => s.memo && num(s.memo.newAyahs) > 0);
    const minutes = (sec) => Math.round(sec / 60);
    const adultSec = sum(list, s => s.adult && s.adult.seconds), kidsSec = sum(list, s => s.kids && s.kids.seconds);
    const rep = {
        year, monthIndex0,
        studentsTotal: list.length,
        circles: sum(list, s => s.att && s.att.present),
        memo: { students: memoList.length, ayahs: sum(memoList, s => s.memo.newAyahs) },
        review: { ayahs: sum(list, s => s.review && s.review.total), surahs: surahSet.size, juz: juzSet.size },
        adult: { games: sum(list, s => s.adult && s.adult.games), minutes: minutes(adultSec) },
        kids: { games: sum(list, s => s.kids && s.kids.games), minutes: minutes(kidsSec) },
        duels: matchIds.size,
        homework: { made: num(teacher && teacher.hwMade), submitted: sum(list, s => s.homework && s.homework.submitted) },
        similarity: sum(list, s => s.similarity && s.similarity.rounds),
        tajweed: { challenge: sum(list, s => s.tajweed && s.tajweed.challenge), sessions: sum(list, s => s.tajweed && s.tajweed.sessions), learned: sum(list, s => s.tajweed && s.tajweed.learned) },
        stars: sum(list, s => s.stars)
    };
    const isActive = (s) => num(s.att && s.att.present) || num(s.adult && s.adult.games) || num(s.kids && s.kids.games) || (s.duels || []).length
        || num(s.homework && s.homework.submitted) || num(s.memo && s.memo.newAyahs) || num(s.review && s.review.total) || num(s.similarity && s.similarity.rounds) || num(s.tajweed && s.tajweed.sessions);
    rep.studentsActive = list.filter(isActive).length;
    rep.gamesMinutes = rep.adult.minutes + rep.kids.minutes;
    rep.empty = !(rep.circles || rep.memo.ayahs || rep.review.ayahs || rep.adult.games || rep.kids.games || rep.duels
        || rep.homework.made || rep.homework.submitted || rep.similarity || rep.tajweed.sessions || rep.stars);
    // صفوف الطلاب: كل الطلاب، الأكثر نشاطًا أولًا
    rep.students = list.map(s => ({
        id: s.id, name: s.name, hidden: !!s.hidden,
        circles: num(s.att && s.att.present),
        adult: num(s.adult && s.adult.games), kids: num(s.kids && s.kids.games),
        duels: (s.duels || []).length,
        newAyahs: num(s.memo && s.memo.newAyahs), review: num(s.review && s.review.total),
        hwAssigned: num(s.hwAssigned), hwSubmitted: num(s.homework && s.homework.submitted),
        similarity: num(s.similarity && s.similarity.rounds), tajweed: num(s.tajweed && s.tajweed.sessions)
    })).sort((a, b) => (b.circles + b.adult + b.kids + b.newAyahs + b.review + b.similarity + b.tajweed) - (a.circles + a.adult + a.kids + a.newAyahs + a.review + a.similarity + a.tajweed));
    return rep;
}
