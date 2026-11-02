// engine/khatmPlan.js
// =============================================================================
// 🗺️ توقّع الختم والخطة المقترحة — دوال خالصة. التقدير من وتيرة الحفظ الفعلية (آيات/حصة) لآخر أشهر مسجَّلة،
// بلا هامش تباطؤ (المراجعة متناسبة مع الحفظ بترتيب المعلم). كل مخرج «تقدير» يُعرض بنطاق (متفائل/واقعي) ولا يُعرض رقم جامد.
// مسار الحفظ في المنصة من آخر المصحف إلى أوله (الناس ← الفاتحة): فهرس الحفظ يبدأ 1 عند الناس.
// الوحدة: آيات مرجّحة بالصفحات (pageWeights) إن توفرت لتقريب «الصفحات»، وإلا آيات خام.
// =============================================================================

export const DEFAULT_SESSIONS_PER_MONTH = 8;
export const TOTAL_AYAHS = 6236;
export const MILESTONES = [
    { key: 'juz', juz: 1 }, { key: 'five', juz: 5 }, { key: 'quarter', juz: 7.5 }, { key: 'half', juz: 15 }, { key: 'khatm', juz: 30 }
];

/**
 * pageWeights: مصفوفة طولها 6236 (مصحفية: الفاتحة:1 أول عنصر) وزن كل آية بالصفحات (مجموعها ≈ 604) — اختياري.
 * يحوّل آيات المسار [fromIdx, toIdx] (فهرس حفظ) إلى وحدات. بلا أوزان: العدد الخام.
 */
export function unitsBetween(memoFromIdx, memoToIdx, pageWeights = null) {
    const lo = Math.min(memoFromIdx, memoToIdx), hi = Math.max(memoFromIdx, memoToIdx);
    if (!pageWeights) return hi - lo;
    // فهرس الحفظ k ↔ فهرس مصحفي (TOTAL - k)
    let sum = 0;
    for (let k = lo + 1; k <= hi; k++) sum += pageWeights[TOTAL_AYAHS - k] || 0;
    return sum;
}

/**
 * وتيرة الطالب: months = [{newUnits, sessions}] (آخر أشهر مقفلة). المتوسط المرجّح = مجموع الوحدات ÷ مجموع الحصص.
 * يرجع {perSession, perMonth, basis:'actual'|'default'|'none', monthsUsed} — بلا بيانات كافية basis='none'.
 */
export function paceFrom(months, sessionsPerMonth = DEFAULT_SESSIONS_PER_MONTH) {
    const usable = (months || []).filter(m => m && m.newUnits > 0).slice(-3);
    if (!usable.length) return { perSession: 0, perMonth: 0, basis: 'none', monthsUsed: 0 };
    let units = 0, sess = 0;
    for (const m of usable) { units += m.newUnits; sess += (m.sessions > 0 ? m.sessions : sessionsPerMonth); }
    const perSession = sess > 0 ? units / sess : 0;
    return { perSession, perMonth: perSession * sessionsPerMonth, basis: 'actual', monthsUsed: usable.length };
}

/**
 * يقدّر لكل معلم: عدد الحصص والتاريخ المتوقع. remainingUnitsFor(milestone) تحسبها الطبقة المستدعية (تعرف حدود الأجزاء).
 * scenarios: full = التزام كامل بالجدول، avg = على نسبة الحضور الفعلية (attendancePct 0..100 أو null → نفس full).
 */
export function projectMilestones({ pace, remaining, sessionsPerMonth = DEFAULT_SESSIONS_PER_MONTH, attendancePct = null, now = new Date() }) {
    const out = [];
    if (!pace || !(pace.perSession > 0)) return out;
    const attFactor = attendancePct != null && attendancePct > 0 ? Math.min(attendancePct, 100) / 100 : 1;
    for (const m of MILESTONES) {
        const rem = remaining[m.key];
        if (rem == null) continue;
        const sessions = rem <= 0 ? 0 : Math.ceil(rem / pace.perSession);
        const monthsFull = sessions / sessionsPerMonth;
        const monthsAvg = attFactor > 0 ? monthsFull / attFactor : monthsFull;
        out.push({
            key: m.key, done: rem <= 0, sessions,
            dateFull: addMonths(now, monthsFull), dateAvg: addMonths(now, monthsAvg),
            monthsFull: round1(monthsFull), monthsAvg: round1(monthsAvg)
        });
    }
    return out;
}

const round1 = (x) => Math.round(x * 10) / 10;
export function addMonths(date, months) {
    const d = new Date(date.getTime());
    const whole = Math.floor(months), frac = months - whole;
    d.setMonth(d.getMonth() + whole);
    d.setDate(d.getDate() + Math.round(frac * 30));
    return d;
}

/** عدد حصص الجزء الحالي المتبقية (للعبارة «تحتاج ≈ N حلقة لإتمام هذا الجزء»). */
export function sessionsToFinish(remainingUnits, pace) {
    if (!pace || !(pace.perSession > 0)) return null;
    return remainingUnits <= 0 ? 0 : Math.ceil(remainingUnits / pace.perSession);
}

/**
 * خطة الشهر القادم (تصور مبدئي): الحفظ الجديد = وتيرة الطالب × حصص الشهر القادم (مقرّبة)، المراجعة القريبة = حفظ هذا الشهر،
 * البعيدة = أجزاء مستحقة حسب جدول المراجعة. تُرجع هيكلًا بلا نصوص؛ الطبقة العارضة تترجمه (ar/en).
 */
export function buildNextMonthPlan({ pace, sessionsNext, thisMonthNewAyahs, nearReviewRange = null, farReviewParts = [], nextTajweedRule = null, focusSkill = null, focusRule = null }) {
    const sessions = Math.max(sessionsNext || DEFAULT_SESSIONS_PER_MONTH, 1);
    const newUnits = pace && pace.perSession > 0 ? Math.round(pace.perSession * sessions) : null;
    const weekly = [1, 2, 3, 4].map(w => ({
        week: w,
        near: nearReviewRange ? { part: w } : null,
        far: farReviewParts[w - 1] || null
    }));
    return { sessions, newUnits, thisMonthNewAyahs: thisMonthNewAyahs == null ? null : thisMonthNewAyahs, nearReviewRange, farReviewParts, weekly, nextTajweedRule, focusSkill, focusRule, tentative: true };
}
