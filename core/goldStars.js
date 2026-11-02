// core/goldStars.js
// ==========================================
// ⭐ النجوم الذهبية: يكسبها الطالب بالإجابة الصحيحة على «السؤال المميز» (قبلها وبعدها).
// تُحفظ في سجل الطالب (goldStars = عدد النجوم، starCertMilestones = العتبات التي أُصدرت لها شهادة تلقائية)،
// وتظهر بجوار اسمه. عند بلوغ عتبة من STAR_MILESTONES تُصدَر له شهادة جاهزة من نظام الشهادات (certificates/).
// ملف خالص بلا DOM ولا استيراد من المنصة، فيُختبر بـNode مباشرة.
// ==========================================

// عتبات الشهادة التلقائية (عدد النجوم). ⚠️ افتراض صريح: 5 / 10 / 25 / 50 — يعدّلها المعلم هنا فقط.
export const STAR_MILESTONES = [5, 10, 25, 50];

export function getGoldStars(student) {
    const n = Number(student && student.goldStars);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

// تضيف نجمة للطالب (تعدّل الكائن) وتُرجع { count, milestone }: milestone = العتبة التي بلغها الآن ولم تُصدَر لها شهادة بعد، وإلا null
export function addGoldStar(student, now = Date.now()) {
    student.goldStars = getGoldStars(student) + 1;
    // سجل تواريخ النجوم (لوسام «النجم» الشهري): يبدأ من أول نجمة بعد هذا التحديث؛ نجوم ما قبله بلا تاريخ فلا تدخل حساب شهر بعينه
    if (!Array.isArray(student.starLog)) student.starLog = [];
    student.starLog.push(now);
    if (student.starLog.length > 1000) student.starLog = student.starLog.slice(-1000);
    if (!Array.isArray(student.starCertMilestones)) student.starCertMilestones = [];
    const hit = STAR_MILESTONES.find(m => m <= student.goldStars && !student.starCertMilestones.includes(m));
    if (hit != null) {
        // نسجّل كل العتبات الفائتة حتى لا تتكرر الشهادة لطالب قديم تخطّى عتبة
        STAR_MILESTONES.forEach(m => { if (m <= student.goldStars && !student.starCertMilestones.includes(m)) student.starCertMilestones.push(m); });
        return { count: student.goldStars, milestone: Math.max(...STAR_MILESTONES.filter(m => m <= student.goldStars)) };
    }
    return { count: student.goldStars, milestone: null };
}

// نجوم شهر بعينه من starLog. null = لا يمكن الحساب (طالب له نجوم قديمة بلا تواريخ ولم يُسجَّل له سجل بعد) فلا يُمنح وسام بتخمين.
export function starsInMonth(student, year, monthIndex0) {
    const log = student && student.starLog;
    if (!Array.isArray(log)) return getGoldStars(student) > 0 ? null : 0;
    const a = new Date(year, monthIndex0, 1).getTime(), b = new Date(year, monthIndex0 + 1, 1).getTime();
    return log.filter(ts => typeof ts === 'number' && ts >= a && ts < b).length;
}

// نص يُلحق باسم الطالب: '' أو ' ⭐' أو ' ⭐×3'
export function starsSuffix(student) {
    const n = getGoldStars(student);
    return n === 0 ? '' : n === 1 ? ' ⭐' : ` ⭐×${n}`;
}
