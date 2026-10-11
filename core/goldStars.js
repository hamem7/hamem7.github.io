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
export function addGoldStar(student) {
    student.goldStars = getGoldStars(student) + 1;
    if (!Array.isArray(student.starCertMilestones)) student.starCertMilestones = [];
    const hit = STAR_MILESTONES.find(m => m <= student.goldStars && !student.starCertMilestones.includes(m));
    if (hit != null) {
        // نسجّل كل العتبات الفائتة حتى لا تتكرر الشهادة لطالب قديم تخطّى عتبة
        STAR_MILESTONES.forEach(m => { if (m <= student.goldStars && !student.starCertMilestones.includes(m)) student.starCertMilestones.push(m); });
        return { count: student.goldStars, milestone: Math.max(...STAR_MILESTONES.filter(m => m <= student.goldStars)) };
    }
    return { count: student.goldStars, milestone: null };
}

// نص يُلحق باسم الطالب: '' أو ' ⭐' أو ' ⭐×3'
export function starsSuffix(student) {
    const n = getGoldStars(student);
    return n === 0 ? '' : n === 1 ? ' ⭐' : ` ⭐×${n}`;
}
