// core/leaveGuard.js
//
// 🌟 حارس الخروج من الشاشة: زرّا الترويسة «الرئيسية» و«حسابي» يغادران الشاشة الحالية فوراً، فكان الضغط عليهما
// بالخطأ أثناء اختبار جارٍ يُنهيه بلا أي تنبيه. شاشات الاختبار تسجّل هنا دالة تُقرِّر هل يُسمَح بالمغادرة
// (وتحفظ التقدّم تلقائياً عند الحاجة). الدالة تفحص حالة الشاشة بنفسها (وجود عناصرها في الصفحة)، فلا يلزم
// إلغاء تسجيلها: خارج شاشة الاختبار ترجع true مباشرة.

let guard = null;

/** يسجّل الحارس (يحلّ محل السابق). fn: async () => boolean — true = مسموح بالمغادرة */
export function setLeaveGuard(fn) { guard = typeof fn === 'function' ? fn : null; }

/** يُستدعى قبل أي مغادرة من الترويسة؛ أي خطأ داخل الحارس لا يحبس المستخدم في الشاشة */
export async function canLeave() {
    if (!guard) return true;
    try { return (await guard()) !== false; }
    catch (err) { console.error('leaveGuard:', err); return true; }
}
