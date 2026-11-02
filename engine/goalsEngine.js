// engine/goalsEngine.js
// =============================================================================
// 🎯 الأهداف الدائمة (أوسمة رحلة الحفظ): وسام لكل جزء يُتمّ حفظه (30)، ووسام عند ٣ أجزاء، ٥، ربع القرآن، ١٠، نصف القرآن، ٢٠، وختم القرآن.
// دوال خالصة. الأساس: مسار الحفظ في المنصة من الناس إلى الفاتحة (السور تنازليًا والآيات تصاعديًا داخل السورة)؛ المحفوظ = كل آيات المسار
// من بداية نطاق الطالب (startIdx) إلى آخر موضع مسجَّل (posIdx). الجزء «محفوظ» حين تقع كل آياته داخل هذا المدى (حدود الأجزاء تقطع السور،
// فالمعيار آية بآية لا سورة بسورة). ربع/نصف القرآن بحجم الصفحات إن توفرت أوزانها وإلا بعدد الآيات.
// ⚠️ افتراض صريح: ما بين بداية النطاق وآخر موضع مسجَّل يُعدّ محفوظًا (هذا مبدأ مسار الحفظ في المنصة).
// =============================================================================
import { JUZ_COUNT, juzBounds, ayahIndex } from './reviewParts.js';

export const MILESTONES = [
    { id: 'ms_3', kind: 'juz', n: 3, tierKey: 'silver' },
    { id: 'ms_5', kind: 'juz', n: 5, tierKey: 'silver' },
    { id: 'ms_quarter', kind: 'vol', frac: 0.25, tierKey: 'gold' },
    { id: 'ms_10', kind: 'juz', n: 10, tierKey: 'gold' },
    { id: 'ms_half', kind: 'vol', frac: 0.5, tierKey: 'diamond' },
    { id: 'ms_20', kind: 'juz', n: 20, tierKey: 'diamond' },
    { id: 'ms_khatm', kind: 'juz', n: 30, tierKey: 'diamond' }
];
export const juzTierKey = (n) => (n <= 10 ? 'bronze' : n <= 20 ? 'silver' : 'gold');

const sortedAsc = (surahsData) => [...surahsData].sort((a, b) => a.number - b.number);

/** فهرس مسار الحفظ (1-based) لكل آية بترتيب المصحف (0-based). */
export function buildPathOfMushaf(surahsData) {
    const asc = sortedAsc(surahsData), start = {};
    let acc = 0;
    asc.forEach(s => { start[s.number] = acc; acc += s.ayahsCount; });
    const out = new Int32Array(acc);
    let k = 0;
    for (let i = asc.length - 1; i >= 0; i--) for (let a = 0; a < asc[i].ayahsCount; a++) out[start[asc[i].number] + a] = ++k;
    return out;
}

/** فهرس مسار الحفظ لموضع (سورة، آية). */
export function pathIndexOf(surahsData, surah, ayah) {
    let sum = 0;
    for (const s of surahsData) if (s.number > surah) sum += s.ayahsCount;
    return sum + ayah;
}

/** تغطية كل جزء: [{juz, total, covered, full, pct}]. */
export function juzCoverage(surahsData, startIdx, posIdx, pathOf = buildPathOfMushaf(surahsData)) {
    const out = [];
    for (let j = 1; j <= JUZ_COUNT; j++) {
        const b = juzBounds(surahsData, j);
        const lo = ayahIndex(surahsData, b.start.surah, b.start.ayah) - 1, hi = ayahIndex(surahsData, b.end.surah, b.end.ayah);
        let covered = 0;
        for (let i = lo; i < hi; i++) { const p = pathOf[i]; if (p >= startIdx && p <= posIdx) covered++; }
        const total = hi - lo;
        out.push({ juz: j, total, covered, full: covered === total, pct: total ? covered / total : 0 });
    }
    return out;
}

/** نسبة المحفوظ من المصحف (بالأوزان الصفحية إن مُرّرت: مصفوفة طولها 6236 بترتيب المصحف). */
export function volumeFraction(surahsData, startIdx, posIdx, pathOf = buildPathOfMushaf(surahsData), weights = null) {
    let cov = 0, tot = 0;
    for (let i = 0; i < pathOf.length; i++) { const w = weights ? weights[i] : 1; tot += w; const p = pathOf[i]; if (p >= startIdx && p <= posIdx) cov += w; }
    return tot ? cov / tot : 0;
}

/**
 * يقيّم الأهداف كلها. المخرج: {earned: [{id, kind:'juz'|'milestone', juz?, n?, tierKey}], fullJuz, volume, juz:[...], next:{juz, milestone}}.
 * next.juz = أقرب جزء لم يكتمل (الأعلى تقدمًا وإلا الأول على المسار)؛ next.milestone = أول هدف كبير لم يُنَل مع نسبة التقدم نحوه (0..1).
 */
export function evaluateGoals({ surahsData, startIdx = 1, posIdx = 0, weights = null }) {
    const pathOf = buildPathOfMushaf(surahsData);
    const cov = posIdx >= startIdx ? juzCoverage(surahsData, startIdx, posIdx, pathOf) : juzCoverage(surahsData, 1, 0, pathOf);
    const volume = posIdx >= startIdx ? volumeFraction(surahsData, startIdx, posIdx, pathOf, weights) : 0;
    const fullJuz = cov.filter(c => c.full).length;
    const earned = [];
    cov.filter(c => c.full).forEach(c => earned.push({ id: 'juz_' + c.juz, kind: 'juz', juz: c.juz, tierKey: juzTierKey(c.juz) }));
    for (const m of MILESTONES) {
        const ok = m.kind === 'juz' ? fullJuz >= m.n : volume >= m.frac;
        if (ok) earned.push({ id: m.id, kind: 'milestone', n: m.n, frac: m.frac, tierKey: m.tierKey });
    }
    // الجزء التالي: بين غير المكتملة، أعلاها نسبة (>0) وإلا أول جزء على المسار (30 فنازلًا)
    const open = cov.filter(c => !c.full);
    let nextJuz = null;
    if (open.length) {
        const partial = open.filter(c => c.pct > 0).sort((a, b) => b.pct - a.pct)[0];
        const c = partial || [...open].sort((a, b) => b.juz - a.juz)[0];
        nextJuz = { id: 'juz_' + c.juz, juz: c.juz, pct: c.pct, covered: c.covered, total: c.total };
    }
    const nm = MILESTONES.find(m => !(m.kind === 'juz' ? fullJuz >= m.n : volume >= m.frac));
    let nextMs = null;
    if (nm) {
        const partial = nextJuz ? nextJuz.pct : 0;
        const prog = nm.kind === 'juz' ? Math.min((fullJuz + partial) / nm.n, 0.999) : Math.min(volume / nm.frac, 0.999);
        nextMs = { id: nm.id, kind: nm.kind, n: nm.n, frac: nm.frac, tierKey: nm.tierKey, progress: prog };
    }
    return { earned, fullJuz, volume, juz: cov, next: { juz: nextJuz, milestone: nextMs } };
}

/** أعلى هدف في قائمة (لعرض واحد فقط عند أول احتساب رجعي): الأكبر في المراحل، وإلا أعلى جزء. */
export function topGoal(earned) {
    const ms = earned.filter(e => e.kind === 'milestone');
    if (ms.length) return ms.sort((a, b) => MILESTONES.findIndex(m => m.id === b.id) - MILESTONES.findIndex(m => m.id === a.id))[0];
    return [...earned].sort((a, b) => b.juz - a.juz)[0] || null;
}
