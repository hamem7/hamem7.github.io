// engine/ayahCount.js
//
// 🌟 «دفتر المراجعة»: كم آية ظهرت للطالب في كل سؤال (الألعاب الفردية والواجب المنزلي).
// السؤال الواحد قد يعرض أكثر من آية: «رتب الآيات» (٣–٤)، «اربط أول الآية بآخرها» (حتى ٦)، «ماذا بعدها/قبلها» (آيتان:
// المعروضة والمطلوبة)، «الآية بين آيتين» و«قبلها وبعدها» (٣)، «تسميع مقطع» (كل آيات المقطع)... فنعدّ آيات كل سؤال كاملة
// بدل آية واحدة. «اربط الكلمة بالسورة» و«رتب السور» تعرض كلمات وأسماء سور لا آيات = صفر.
// دوال خالصة بلا تخزين (يستعملها games/*.js وcore/trackingService.js وcore/homeworkAyahLedger.js والاختبارات).

const NO_AYAH_TYPES = new Set(['link_word_surah', 'kids_link_word_surah', 'order_surahs', 'kids_order_surahs']);
const TWO = new Set(['next', 'previous', 'listen_next']);
const THREE = new Set(['between', 'around']);

/** عدد الآيات التي عرضها سؤال لعبة فردية (currentData كما يولّده engine/quranEngine.js أو kidsEngine.js). */
export function gameQuestionAyahCount(data) {
    if (!data || typeof data !== 'object') return 0;
    const type = data.type || '';
    if (NO_AYAH_TYPES.has(type)) return 0;
    if (Number.isInteger(data.shownAyahs) && data.shownAyahs >= 0) return data.shownAyahs;
    if (Array.isArray(data.reciteAyahs) && data.reciteAyahs.length) return data.reciteAyahs.length;
    if (Array.isArray(data.original) && data.original.length) return data.original.length;
    if (!data.ayahObj) return 0;
    if (TWO.has(type)) return 2;
    if (THREE.has(type)) return 3;
    return 1;
}

/** تقدير لأحداث قديمة سُجّلت قبل حفظ العدد (حدث بنوع السؤال fmt وموضعه فقط) — للعدّ بأثر رجعي.
 *  kidsSession: الجلسة من ركن الأطفال (رتب الآيات ٣ بدل ٤). surahAyahs: عدد آيات سورة الحدث (للتسميع). */
export function estimateGameEventAyahs(ev, { kidsSession = false, surahAyahs = 0 } = {}) {
    if (!ev) return 0;
    const fmt = ev.fmt || '';
    if (NO_AYAH_TYPES.has(fmt)) return 0;
    if (TWO.has(fmt)) return 2;
    if (THREE.has(fmt)) return 3;
    if (fmt === 'order') return kidsSession ? 3 : 4;
    if (fmt === 'link_ends' || fmt === 'kids_link_ends') return 6;
    if (fmt === 'recite' || fmt === 'kids_recite') return surahAyahs > 0 && surahAyahs <= 10 ? surahAyahs : 8;   // مقطع ٧–١٠ آيات
    return (ev.ayah || ev.segment || ev.surah) ? 1 : 0;
}

const hasQuran = (s) => typeof s === 'string' && s.includes('﴿');
const countSep = (s) => (typeof s === 'string' ? (s.match(/۞/g) || []).length : 0);

/** عدد الآيات التي عرضها سؤال واجب منزلي (كائن السؤال المنشور كما يبنيه engine/homeworkEngine.js). fmt اختياري من meta التتبّع. */
export function homeworkQuestionAyahCount(q, fmt = null) {
    if (!q || typeof q !== 'object') return 0;
    const type = q.type || '';
    const title = String(q.title || q.question || '');
    const f = fmt || type;
    if (type === 'matrix_order') return Array.isArray(q.options) ? q.options.length : (Array.isArray(q.correctAnswer) ? q.correctAnswer.length : 4);
    if (type === 'matching') return Array.isArray(q.leftItems) ? q.leftItems.length : (Array.isArray(q.correctAnswer) ? q.correctAnswer.length : 0);
    if (type === 'checkbox') return Array.isArray(q.correctAnswer) ? q.correctAnswer.length : 2;
    if (type === 'write_3_ayahs') return countSep(q.correctAnswer) + 1 || 3;
    if (type === 'around_ayah') return 3;
    if (type === 'tajweed_extract') return hasQuran(q.text) ? countSep(q.text) + 1 : 0;
    if (f === 'mcq_next' || f === 'mcq_prev' || (type === 'mcq' && /تلي هذه|تَسبِق|تسبق/.test(title))) return 2;
    if (hasQuran(q.text) || hasQuran(q.question) || f === 'mcq_surah' || f === 'ayah_ending' || type === 'dropdown' || type === 'dual_dropdown' || type === 'written_blank') return 1;
    // أسئلة المتشابهات وغيرها: آية واحدة إن كان فيها نص قرآني أو مرجع آية
    if (q.ref || q.loc) return 1;
    return 0;
}

/** مجموع آيات واجب كامل (كل أسئلته تظهر للطالب). tracking = meta التتبّع {qid: {fmt}} اختياري. */
export function homeworkAyahTotal(questions, tracking = null) {
    return (questions || []).reduce((n, q) => n + homeworkQuestionAyahCount(q, tracking && q && tracking[q.id] ? tracking[q.id].fmt : null), 0);
}

/** جمع عناصر [{ts, n}] داخل شهر (monthIndex من 0). */
export function sumInMonth(items, year, monthIndex) {
    if (!Array.isArray(items)) return 0;
    const a = new Date(year, monthIndex, 1).getTime(), b = new Date(year, monthIndex + 1, 1).getTime();
    return items.reduce((n, x) => n + (x && x.ts >= a && x.ts < b ? (Number(x.n) || 0) : 0), 0);
}

/** { games, homework, total } لشهر من { games: [{ts,n}], homework: [{ts,n}] } — للتقرير الشهري ووسام «بطل المراجعة». */
export function reviewCountsForMonth(items, year, monthIndex) {
    const games = sumInMonth(items && items.games, year, monthIndex);
    const homework = sumInMonth(items && items.homework, year, monthIndex);
    return { games, homework, total: games + homework };
}
