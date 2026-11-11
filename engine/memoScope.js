// engine/memoScope.js
// =============================================================================
// «السور الإضافية خارج المسار المتصل» (student.memoExtra) — منطق صافٍ بلا DOM ولا قاعدة بيانات.
//
// المسار المتصل = student.memoFrom ← student.memoTo (من الناس نحو الأصغر) كما هو دائمًا.
// السور الإضافية = مقاطع بترتيب المصحف تُخزَّن كقائمة {s1,a1,s2,a2} (من السورة s1 آية a1 إلى السورة s2 آية a2)، وتغطي:
//   سورة كاملة، عدة سور، جزءًا من سورة، أو مدى يمتد عبر أكثر من سورة.
// القاعدة: لا يُخزَّن أي شيء يقع داخل المسار المتصل ولا الفاتحة؛ تُطرح ثم تُدمج المقاطع المتجاورة (normalizeExtras).
// الحقل اختياري؛ غيابه = لا سور إضافية (الطلاب الحاليون لا يتأثرون).
// surahsData: [{ number, name, ayahsCount }] (AppState.surahsData).
// =============================================================================

function layout(surahsData) {
    const start = [], count = [], nums = [];
    let c = 0;
    (surahsData || []).slice().sort((a, b) => a.number - b.number).forEach(s => { start[s.number] = c; count[s.number] = s.ayahsCount; nums.push(s.number); c += s.ayahsCount; });
    return { start, count, nums, total: c };
}
const toIndex = (L, s, a) => L.start[s] + a - 1;
function fromIndex(L, i) {
    let lo = 0, hi = L.nums.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (L.start[L.nums[mid]] <= i) lo = mid; else hi = mid - 1; }
    const s = L.nums[lo];
    return { s, a: i - L.start[s] + 1 };
}

// مجال المسار المتصل بفهارس الآيات المطلقة [lo, hi] أو null عند غياب نطاق صالح (يتطابق مع resolveRange: «من» ≥ «إلى»)
export function mainInterval(surahsData, student) {
    const byName = (n) => (surahsData || []).find(s => s.name === n);
    const f = byName(student && student.memoFrom), t = byName(student && student.memoTo);
    if (!f || !t || f.number < t.number) return null;
    const L = layout(surahsData);
    return [toIndex(L, t.number, 1), toIndex(L, f.number, f.ayahsCount)];
}

function toIntervals(L, extras) {
    const out = [];
    (Array.isArray(extras) ? extras : []).forEach(e => {
        if (!e) return;
        const s1 = +e.s1, s2 = +e.s2;
        if (!(s1 >= 1 && s1 <= 114 && s2 >= 1 && s2 <= 114) || L.count[s1] == null || L.count[s2] == null) return;
        const a1 = Math.min(Math.max(1, Math.floor(+e.a1) || 1), L.count[s1]);
        const a2 = Math.min(Math.max(1, Math.floor(+e.a2) || L.count[s2]), L.count[s2]);
        const x = toIndex(L, s1, a1), y = toIndex(L, s2, a2);
        out.push(x <= y ? [x, y] : [y, x]);
    });
    return out;
}

// يطرح المسار المتصل والفاتحة ثم يدمج المتجاور/المتداخل ويرتّب بترتيب المصحف. المخرجات: [{s1,a1,s2,a2}]
export function normalizeExtras(surahsData, extras, student) {
    const L = layout(surahsData);
    if (!L.total) return [];
    let ivs = toIntervals(L, extras);
    const cut = L.count[1] != null ? [[0, L.count[1] - 1]] : [];   // الفاتحة لا تدخل أي نطاق
    const m = mainInterval(surahsData, student || {});
    if (m) cut.push(m);
    cut.forEach(([lo, hi]) => {
        const next = [];
        ivs.forEach(([a, b]) => {
            if (b < lo || a > hi) { next.push([a, b]); return; }
            if (a < lo) next.push([a, lo - 1]);
            if (b > hi) next.push([hi + 1, b]);
        });
        ivs = next;
    });
    ivs.sort((p, q) => p[0] - q[0]);
    const merged = [];
    ivs.forEach(iv => {
        const last = merged[merged.length - 1];
        if (last && iv[0] <= last[1] + 1) last[1] = Math.max(last[1], iv[1]); else merged.push([iv[0], iv[1]]);
    });
    return merged.map(([a, b]) => { const p = fromIndex(L, a), q = fromIndex(L, b); return { s1: p.s, a1: p.a, s2: q.s, a2: q.a }; });
}

// يضيف مقطعًا (أو يحذفه) من قائمة المقاطع: addToExtras / removeFromExtras — كلاهما يعيد القائمة منظَّمة
export function addToExtras(surahsData, extras, seg, student) {
    return normalizeExtras(surahsData, (Array.isArray(extras) ? extras : []).concat([seg]), student);
}
export function removeFromExtras(surahsData, extras, seg, student) {
    const L = layout(surahsData);
    const [rm] = toIntervals(L, [seg]);
    if (!rm) return normalizeExtras(surahsData, extras, student);
    const kept = [];
    toIntervals(L, extras).forEach(([a, b]) => {
        if (b < rm[0] || a > rm[1]) { kept.push([a, b]); return; }
        if (a < rm[0]) kept.push([a, rm[0] - 1]);
        if (b > rm[1]) kept.push([rm[1] + 1, b]);
    });
    const segs = kept.map(([a, b]) => { const p = fromIndex(L, a), q = fromIndex(L, b); return { s1: p.s, a1: p.a, s2: q.s, a2: q.a }; });
    return normalizeExtras(surahsData, segs, student);
}

// حالة سورة داخل النطاق لواجهة الاختيار: 'main' (داخل المتصل بالكامل) | 'extra' (كلها إضافية) | 'part' | ''
export function surahState(surahsData, student, extras, n) {
    const L = layout(surahsData);
    if (L.count[n] == null) return '';
    const m = mainInterval(surahsData, student || {});
    const lo = toIndex(L, n, 1), hi = toIndex(L, n, L.count[n]);
    if (n === 1) return 'main';
    if (m && lo >= m[0] && hi <= m[1]) return 'main';
    let covered = 0;
    toIntervals(L, extras).forEach(([a, b]) => { covered += Math.max(0, Math.min(hi, b) - Math.max(lo, a) + 1); });
    return covered === 0 ? '' : covered >= L.count[n] ? 'extra' : 'part';
}

// مقاطع السور الإضافية للطالب بعد التنظيف
export function studentExtras(surahsData, student) {
    return normalizeExtras(surahsData, student && student.memoExtra, student);
}

// تفصيل الإضافي حسب السورة: [{ surah, from, to, count, full }]
export function extraSurahSlices(surahsData, extras) {
    const L = layout(surahsData), out = [];
    (extras || []).forEach(e => {
        for (let s = e.s1; s <= e.s2; s++) {
            const from = s === e.s1 ? e.a1 : 1, to = s === e.s2 ? e.a2 : L.count[s];
            out.push({ surah: s, from, to, count: to - from + 1, full: from === 1 && to === L.count[s] });
        }
    });
    return out;
}

export function extraAyahCount(surahsData, extras) {
    return extraSurahSlices(surahsData, extras).reduce((n, x) => n + x.count, 0);
}

// إحصاءات الحفظ الإجمالية: { main, extra, total, mainSurahs, extraSurahs }
export function memoStats(surahsData, student) {
    const L = layout(surahsData);
    const m = mainInterval(surahsData, student || {});
    let main = 0, mainSurahs = 0;
    if (m) {
        main = m[1] - m[0] + 1;
        const lo = fromIndex(L, m[0]).s, hi = fromIndex(L, m[1]).s;
        mainSurahs = hi - lo + 1;
        if (lo <= 1 && L.count[1] != null) { main -= L.count[1]; mainSurahs -= 1; }
    }
    const ex = studentExtras(surahsData, student);
    const slices = extraSurahSlices(surahsData, ex);
    const extra = slices.reduce((n, x) => n + x.count, 0);
    return { main, extra, total: main + extra, mainSurahs, extraSurahs: slices.length, totalAyahs: L.total };
}

// شرائح «نطاق الطالب كله» (المتصل كاملًا + الإضافي) لكل سورة: [{ surah, from, to }]
export function scopeSlices(surahsData, student) {
    const L = layout(surahsData), out = [];
    const m = mainInterval(surahsData, student || {});
    if (m) {
        const lo = fromIndex(L, m[0]).s, hi = fromIndex(L, m[1]).s;
        for (let s = Math.max(lo, 2); s <= hi; s++) out.push({ surah: s, from: 1, to: L.count[s] });
    }
    extraSurahSlices(surahsData, studentExtras(surahsData, student)).forEach(x => out.push({ surah: x.surah, from: x.from, to: x.to }));
    return out.sort((a, b) => a.surah - b.surah || a.from - b.from);
}

// 🌟 شرائح نطاق الطالب كما يحدّده resolveRange (trackingEngine): كل سور المسار من fromSurah إلى toSurah كاملةً
// عدا سورة التوقف (toSurah) فتنتهي عند frontierAyah (مثل الملك: ١–١٥ لا كل آياتها)، + السور الإضافية.
// minSurah: أدنى سورة تدخل (٢ للكبار لاستبعاد الفاتحة، ٤٦ للصغار). maxSurah: أعلى سورة (١١٤).
export function rangeSlices(surahsData, range, extraSegs, minSurah = 2, maxSurah = 114) {
    const L = layout(surahsData), out = [];
    if (range && range.ok !== false && range.fromSurah != null) {
        for (let s = Math.max(range.toSurah, minSurah, 2); s <= Math.min(range.fromSurah, maxSurah); s++) {
            if (L.count[s] == null) continue;
            out.push({ surah: s, from: 1, to: s === range.toSurah ? Math.min(range.frontierAyah || L.count[s], L.count[s]) : L.count[s] });
        }
    }
    if (minSurah <= 2) extraSurahSlices(surahsData, extraSegs || []).forEach(x => out.push({ surah: x.surah, from: x.from, to: x.to }));
    return out.sort((a, b) => a.surah - b.surah || a.from - b.from);
}

export function inSlices(slices, surah, ayah) {
    return slices.some(x => x.surah === surah && ayah >= x.from && ayah <= x.to);
}

// يصفّي مجموعة آيات ({surahNumber, numberInSurah}) بما يقع داخل الشرائح
export function filterPoolBySlices(pool, slices) {
    const by = new Map();
    slices.forEach(x => { if (!by.has(x.surah)) by.set(x.surah, []); by.get(x.surah).push(x); });
    return (pool || []).filter(a => { const l = by.get(a.surahNumber); return l && l.some(x => a.numberInSurah >= x.from && a.numberInSurah <= x.to); });
}

// نص وصف مقطع: يُمرَّر اسم السورة بواسطة المستدعي (للغتين). tf(key, params) اختياري؛ الافتراضي عربي.
export function describeExtra(e, surahsData, nameOf, words) {
    const w = Object.assign({ ayah: 'آية', to: '←' }, words || {});
    const cnt = (n) => ((surahsData || []).find(s => s.number === n) || {}).ayahsCount;
    const fullA = e.a1 === 1, fullB = e.a2 === cnt(e.s2);
    if (e.s1 === e.s2) return fullA && fullB ? nameOf(e.s1) : `${nameOf(e.s1)} (${e.a1}–${e.a2})`;
    const A = fullA ? nameOf(e.s1) : `${nameOf(e.s1)} ${w.ayah} ${e.a1}`;
    const B = fullB ? nameOf(e.s2) : `${nameOf(e.s2)} ${w.ayah} ${e.a2}`;
    return `${A} ${w.to} ${B}`;
}
