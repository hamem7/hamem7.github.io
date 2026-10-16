// engine/backupReminder.js — «تذكير ذكي بالنسخ الاحتياطي»: دالة خالصة بلا متصفح ولا شبكة.
// تكمّل engine/backupHealth.js (التي تنظر للزمن فقط) بالنظر إلى ما تغيّر منذ آخر نسخة: إن أضاف المعلم طلاباً كثيرين
// (≥ GROWTH_NOW) أو أضاف أي طالب ومرّت ≥ GROWTH_AFTER_DAYS أيام على آخر نسخة، فالنسخة الحالية لم تعد تحميه.
// المدخل: students = عدد الطلاب الآن، backedStudents = عدد طلاب أحدث نسخة (null لو غير معروف)، ageDays = عمر أحدث نسخة (null = لا نسخة).
// المخرج: { remind, reason: 'growth' | null, added }
export const GROWTH_NOW = 5;
export const GROWTH_AFTER_DAYS = 3;

export function backupReminder({ students = 0, backedStudents = null, ageDays = null } = {}) {
    const none = { remind: false, reason: null, added: 0 };
    if (!(students > 0) || ageDays === null || backedStudents === null || !Number.isFinite(backedStudents)) return none;   // بلا نسخة/بلا معلومة: يتكفّل بها backupHealth
    const added = students - backedStudents;
    if (added >= GROWTH_NOW || (added >= 1 && ageDays >= GROWTH_AFTER_DAYS)) return { remind: true, reason: 'growth', added };
    return { ...none, added: Math.max(0, added) };
}
