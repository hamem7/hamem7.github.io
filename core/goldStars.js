// core/goldStars.js
// ==========================================
// ⭐ النجوم الذهبية: يكسبها الطالب بالإجابة الصحيحة على «السؤال المميز» (قبلها وبعدها).
// تُحفظ في سجل الطالب (goldStars = عدد النجوم، starCertMilestones = العتبات التي أُصدرت لها شهادة تلقائية)،
// وتظهر بجوار اسمه. عند بلوغ عتبة من STAR_MILESTONES تُصدَر له شهادة جاهزة من نظام الشهادات (certificates/).
// ملف خالص بلا DOM ولا استيراد من المنصة، فيُختبر بـNode مباشرة.
// ==========================================

// ⭐ الرُّتب: كل رتبة تبدأ من عدد نجوم (at). الرمز يظهر بجوار اسم الطالب بدل العدّاد وحده.
// ⚠️ افتراض صريح: العتبات 1 / 5 / 10 / 25 / 50 والأسماء والرموز — يعدّلها المعلم هنا فقط.
export const STAR_RANKS = [
    { id: 'star',    at: 1,  icon: '⭐', ar: 'نجمة',      en: 'Star' },
    { id: 'shining', at: 5,  icon: '🌟', ar: 'نجم لامع',  en: 'Shining Star' },
    { id: 'medal',   at: 10, icon: '🏅', ar: 'وسام التميّز', en: 'Medal of Excellence' },
    { id: 'trophy',  at: 25, icon: '🏆', ar: 'كأس التميّز', en: 'Trophy of Excellence' },
    { id: 'crown',   at: 50, icon: '👑', ar: 'تاج التميّز', en: 'Crown of Excellence' }
];
// بعد التاج: كل STAR_CROWN_STEP نجمة إضافية تُضاف نجمة صغيرة بجوار التاج (حتى STAR_CROWN_MAX_EXTRA) فلا يتوقف الطريق.
export const STAR_CROWN_STEP = 25;
export const STAR_CROWN_MAX_EXTRA = 5;
// عتبات الشهادة التلقائية = بدايات الرُّتب فوق الأولى (5 / 10 / 25 / 50)
export const STAR_MILESTONES = STAR_RANKS.filter(r => r.at > 1).map(r => r.at);

// رتبة عدد نجوم معيّن: null إن كان صفراً
export function getStarRank(count) {
    const n = Math.floor(Number(count));
    if (!Number.isFinite(n) || n < 1) return null;
    let cur = STAR_RANKS[0];
    for (const r of STAR_RANKS) if (n >= r.at) cur = r;
    return cur;
}
// نجوم التاج الصغيرة (0 لغير التاج)
export function crownExtras(count) {
    const n = Math.floor(Number(count));
    const r = getStarRank(n);
    if (!r || r.id !== 'crown') return 0;
    return Math.min(STAR_CROWN_MAX_EXTRA, Math.floor((n - r.at) / STAR_CROWN_STEP));
}
// الهدف التالي: { at, icon, ar, en, left, crownStep } أو null إن لم يبقَ هدف (بعد آخر نجمة تاج)
export function nextStarGoal(count) {
    const n = Math.max(0, Math.floor(Number(count)) || 0);
    const nxt = STAR_RANKS.find(r => r.at > n);
    if (nxt) return { at: nxt.at, icon: nxt.icon, ar: nxt.ar, en: nxt.en, left: nxt.at - n, crownStep: false };
    const crown = STAR_RANKS[STAR_RANKS.length - 1];
    const extra = crownExtras(n);
    if (extra >= STAR_CROWN_MAX_EXTRA) return null;
    const at = crown.at + (extra + 1) * STAR_CROWN_STEP;
    return { at, icon: crown.icon + '⭐'.repeat(extra + 1), ar: 'نجمة تاج جديدة', en: 'a new crown star', left: at - n, crownStep: true };
}

export function getGoldStars(student) {
    const n = Number(student && student.goldStars);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

// تضيف نجمة للطالب (تعدّل الكائن) وتُرجع { count, milestone }: milestone = العتبة التي بلغها الآن ولم تُصدَر لها شهادة بعد، وإلا null
export function addGoldStar(student, now = Date.now()) {
    const before = getStarRank(getGoldStars(student)), extraBefore = crownExtras(getGoldStars(student));
    student.goldStars = getGoldStars(student) + 1;
    const after = getStarRank(student.goldStars);
    // ترقية = انتقال لرتبة أعلى (أو نجمة تاج جديدة)؛ يستعملها الاحتفال في اللعبة
    const rankUp = !!after && (!before || after.id !== before.id || crownExtras(student.goldStars) > extraBefore);
    // سجل تواريخ النجوم (لوسام «النجم» الشهري): يبدأ من أول نجمة بعد هذا التحديث؛ نجوم ما قبله بلا تاريخ فلا تدخل حساب شهر بعينه
    if (!Array.isArray(student.starLog)) student.starLog = [];
    student.starLog.push(now);
    if (student.starLog.length > 1000) student.starLog = student.starLog.slice(-1000);
    if (!Array.isArray(student.starCertMilestones)) student.starCertMilestones = [];
    const hit = STAR_MILESTONES.find(m => m <= student.goldStars && !student.starCertMilestones.includes(m));
    if (hit != null) {
        // نسجّل كل العتبات الفائتة حتى لا تتكرر الشهادة لطالب قديم تخطّى عتبة
        STAR_MILESTONES.forEach(m => { if (m <= student.goldStars && !student.starCertMilestones.includes(m)) student.starCertMilestones.push(m); });
        return { count: student.goldStars, milestone: Math.max(...STAR_MILESTONES.filter(m => m <= student.goldStars)), rank: after, rankUp };
    }
    return { count: student.goldStars, milestone: null, rank: after, rankUp };
}

// نجوم شهر بعينه من starLog. null = لا يمكن الحساب (طالب له نجوم قديمة بلا تواريخ ولم يُسجَّل له سجل بعد) فلا يُمنح وسام بتخمين.
export function starsInMonth(student, year, monthIndex0) {
    const log = student && student.starLog;
    if (!Array.isArray(log)) return getGoldStars(student) > 0 ? null : 0;
    const a = new Date(year, monthIndex0, 1).getTime(), b = new Date(year, monthIndex0 + 1, 1).getTime();
    return log.filter(ts => typeof ts === 'number' && ts >= a && ts < b).length;
}

// نص يُلحق باسم الطالب: '' أو ' ⭐' أو ' ⭐×3' أو ' 🌟×7' أو ' 🏅×13' أو ' 👑⭐×80'
export function starsSuffix(student) {
    const n = getGoldStars(student);
    const r = getStarRank(n);
    if (!r) return '';
    if (n === 1) return ' ⭐';
    return ` ${r.icon}${'⭐'.repeat(crownExtras(n))}×${n}`;
}
