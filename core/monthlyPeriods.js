// core/monthlyPeriods.js
// =============================================================================
// تحديث موضع الحفظ مرتين في الشهر: «منتصف الشهر» (من اليوم 15) و«نهاية الشهر» (آخر 3 أيام).
// التحديثان نفسهما مصدر التقرير الشهري، فلا يُدخل المعلم البيانات مرة ثانية.
//   • منتصف الشهر  → نقطة تحقق record.mid (لا تقفل الشهر)  — saveMidCheckpoint في database/monthlyMemorizationDB.js
//   • نهاية الشهر → record.ending (تقفل الشهر وتبني بداية الشهر التالي) — saveEnding
// دالة خالصة بلا اعتماد على المنصة (قابلة للاختبار).
// =============================================================================
export const MID_MONTH_DAY = 15;
export const END_WINDOW_DAYS = 3;

/** { mid, end }: هل حلّ موعد تحديث منتصف الشهر / نهايته في التاريخ now؟ */
export function periodicDue(now = new Date()) {
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const day = now.getDate();
  return { mid: day >= MID_MONTH_DAY, end: day > dim - END_WINDOW_DAYS };
}

/** آخر موضع مسجَّل في سجل الشهر (النهاية أو نقطة المنتصف، الأحدث تسجيلاً) أو null. */
export function latestRecordedPosition(rec) {
  if (!rec) return null;
  const ts = (x) => (x && Date.parse(x.recordedAt)) || 0;
  const best = rec.ending && rec.mid ? (ts(rec.mid) > ts(rec.ending) ? rec.mid : rec.ending) : (rec.ending || rec.mid || null);
  return best ? { surahNumber: best.surahNumber, ayahNumber: best.ayahNumber } : null;
}
