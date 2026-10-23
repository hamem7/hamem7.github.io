// engine/seenLedger.js
//
// 🌟 دفتر «ما رآه الطالب»: يتذكّر الآيات التي ظهرت للطالب في اختباراته الفردية (الكبار والأطفال) كي يفضّل
// pickTargetAyah (engine/quranEngine.js) الآيات التي لم يرها أو رآها منذ أطول وقت، فلا تتكرر المواضع بين اختباراته.
//  • المفتاح هو الآية في المصحف كله ("سورة:آية") لا موضعها في النطاق، فيعمل عبر اختلاف النطاق (سورة ← جزء ← عدة سور).
//  • لكل طالب دفتر مستقل في localStorage (qseen_<id>)، ويُقتصر على آخر MAX_ENTRIES آية. بلا طالب أو بلا تخزين = لا أثر
//    (يعمل الاختيار العشوائي القديم كما كان). كل قراءة/كتابة داخل try/catch.
//  • القراءة بلا أثر جانبي؛ الكتابة تتم عند عرض السؤال فعلاً (لا أثناء فحص الجاهزية probeGameType الذي يولّد ويرمي).
const KEY_PREFIX = 'qseen_';
export const MAX_ENTRIES = 1000;
const KEEP_AFTER_PRUNE = 800;

let currentId = null;
let cache = null; // { id, data: { s: seq, m: { "surah:ayah": seq } } }

export const ayahKey = (a) => (a && a.surahNumber != null && a.numberInSurah != null) ? `${a.surahNumber}:${a.numberInSurah}` : null;

function load(id) {
    if (cache && cache.id === id) return cache.data;
    let data = { s: 0, m: {} };
    try {
        const raw = JSON.parse(localStorage.getItem(KEY_PREFIX + id) || 'null');
        if (raw && typeof raw.s === 'number' && raw.m && typeof raw.m === 'object') data = raw;
    } catch (e) { /* تالف أو تخزين غير متاح: دفتر فارغ */ }
    cache = { id, data };
    return data;
}

// يُستدعى عند بدء كل اختبار بمعرّف الطالب (null/undefined = تعطيل الدفتر)
export function setSeenStudent(id) {
    currentId = (id === undefined || id === null || id === '') ? null : String(id);
    cache = null;
}

// ترتيب الآية: 0 = لم تُرَ، وكلما كبر الرقم كانت أحدث
export function seenRank(ayah) {
    if (currentId === null) return 0;
    const k = ayahKey(ayah);
    if (!k) return 0;
    return load(currentId).m[k] || 0;
}

export function recordSeen(ayah) {
    try {
        if (currentId === null) return;
        const k = ayahKey(ayah);
        if (!k) return;
        const data = load(currentId);
        data.m[k] = ++data.s;
        const keys = Object.keys(data.m);
        if (keys.length > MAX_ENTRIES) {
            keys.sort((x, y) => data.m[y] - data.m[x]);
            const m = {};
            for (const kk of keys.slice(0, KEEP_AFTER_PRUNE)) m[kk] = data.m[kk];
            data.m = m;
        }
        localStorage.setItem(KEY_PREFIX + currentId, JSON.stringify(data));
    } catch (e) { /* التخزين ممتلئ أو غير متاح: لا مشكلة */ }
}

// من قائمة آيات: الأقل رؤيةً (الأقدم)، وعند التعادل عشوائياً
export function pickLeastSeen(list, rng = Math.random) {
    if (!list || !list.length) return null;
    let best = [], min = Infinity;
    for (const a of list) {
        const r = seenRank(a);
        if (r < min) { min = r; best = [a]; } else if (r === min) best.push(a);
    }
    return best[Math.floor(rng() * best.length)];
}
