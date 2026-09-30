// engine/memorizationEngine.js
// =============================================================================
// 🌟 [جديد] محرك حساب "الحفظ الشهري" — دوال خالصة (Pure Functions) بلا أي DOM أو
// IndexedDB أو fetch، بنفس فلسفة عزل engine/homeworkEngine.js عن أي تخزين مباشر.
// الهدف الوحيد لهذا الملف: تحويل "موضع بداية" و"موضع نهاية" (سورة + رقم آية) إلى
// عدد الآيات المحفوظة حديثًا بينهما، باحترام **اتجاه حفظ الطلاب الفعلي في هذه
// المنصة**: من آخر القرآن إلى أوله (سورة الناس ← الفلق ← الإخلاص ← ... ← البقرة ←
// الفاتحة). أي "بعد سورة N تأتي السورة N-1" — عكس الترتيب المصحفي المعتاد تمامًا،
// وليس مجرد طرح بسيط لأرقام الآيات.
//
// ⚠️ [افتراض صريح]: مصدر الحقيقة الوحيد لعدد آيات كل سورة هو AppState.surahsData
// (مبني فعليًا من QuranEngine.getAllSurahsList() في core/app.js) — لا يُعاد هنا
// تحميل أو تعريف أي بيانات قرآنية جديدة، فقط استقبالها كمعامل (surahsData) حتى يبقى
// هذا الملف قابلاً للاختبار بمعزل تام عن قاعدة البيانات الفعلية (راجع
// tests/memorizationEngine.test.js).
// =============================================================================

/**
 * يرجع كائن السورة {number, name, ayahsCount} من قائمة السور، أو null لو رقم
 * السورة غير موجود إطلاقًا (بيانات تالفة/غير محمَّلة).
 */
export function getSurahInfo(surahsData, surahNumber) {
  if (!Array.isArray(surahsData)) return null;
  const s = surahsData.find(s => s.number === surahNumber);
  return s || null;
}

export function getSurahAyahCount(surahsData, surahNumber) {
  const s = getSurahInfo(surahsData, surahNumber);
  return s ? s.ayahsCount : null;
}

/**
 * هل (رقم السورة + رقم الآية) موضع صحيح فعليًا ضمن القرآن الكريم؟
 */
export function isValidPosition(surahsData, surahNumber, ayahNumber) {
  const count = getSurahAyahCount(surahsData, surahNumber);
  if (count == null) return false;
  return Number.isInteger(ayahNumber) && ayahNumber >= 1 && ayahNumber <= count;
}

// 🌟 [جوهر الحساب] "فهرس الحفظ" (Memorization Index): رقم تسلسلي متزايد يمثّل
// ترتيب أي آية على مسار الحفظ الفعلي لطلاب هذه المنصة (من الناس إلى الفاتحة)،
// بحيث: أول آية على المسار (الناس:1) فهرسها 1، وآخر آية عليه (الفاتحة: آخر آياتها)
// فهرسها = مجموع كل آيات القرآن (6236 تقريبًا). فهرس أي موضع (سورة S، آية A) =
// [مجموع عدد آيات كل سورة رقمها أكبر من S] + A. حساب الفرق بين فهرسي موضعين يعطي
// عدد الآيات المحفوظة بينهما مباشرة وبدقة، مهما كان عدد السور التي تخللت المسار،
// بدل أي طرح ساذج لأرقام الآيات أو أرقام السور.
function memorizationIndex(surahsData, surahNumber, ayahNumber) {
  let sum = 0;
  for (const s of surahsData) {
    if (s.number > surahNumber) sum += s.ayahsCount;
  }
  return sum + ayahNumber;
}

/**
 * الدالة الرئيسية: تحسب تقدّم الحفظ بين موضعي بداية ونهاية.
 * beginning/ending: { surahNumber, ayahNumber }
 * ترجع:
 *   { valid: true,  newAyahs: number }                      — حساب صحيح
 *   { valid: false, reason: 'invalid_position' }             — سورة/آية غير موجودة
 *   { valid: false, reason: 'backward', newAyahs: <سالب> }   — النهاية قبل البداية
 *     على مسار الحفظ (يتطلب تنبيه المعلم ومراجعة الإدخال، راجع القسم 8 من طلب
 *     "التقرير الشهري")
 */
export function calcMemorizationProgress(surahsData, beginning, ending) {
  if (!Array.isArray(surahsData) || !surahsData.length) {
    return { valid: false, reason: 'no_quran_data' };
  }
  if (
    !beginning || !ending ||
    !isValidPosition(surahsData, beginning.surahNumber, beginning.ayahNumber) ||
    !isValidPosition(surahsData, ending.surahNumber, ending.ayahNumber)
  ) {
    return { valid: false, reason: 'invalid_position' };
  }

  const beginIndex = memorizationIndex(surahsData, beginning.surahNumber, beginning.ayahNumber);
  const endIndex = memorizationIndex(surahsData, ending.surahNumber, ending.ayahNumber);
  const newAyahs = endIndex - beginIndex;

  if (newAyahs < 0) {
    return { valid: false, reason: 'backward', newAyahs };
  }
  return { valid: true, newAyahs, reason: null };
}

/**
 * موضع البداية الافتراضي حين لا يوجد أي سجل سابق إطلاقًا لهذا الطالب: أول نقطة
 * على مسار الحفظ (سورة الناس، الآية 1) — وليس افتراضًا عشوائيًا آخر.
 */
export function defaultStartingPosition() {
  return { surahNumber: 114, ayahNumber: 1 };
}

/**
 * قائمة السور مرتّبة بترتيب الحفظ الفعلي (الناس أولًا ← الفاتحة أخيرًا) — تُستخدم
 * فقط لتعبئة قوائم الاختيار في واجهة تسجيل الموضع، حتى تظهر بنفس ترتيب حفظ الطالب
 * الفعلي بدل الترتيب المصحفي (الذي يبدو معكوسًا تمامًا من منظور الطالب).
 */
export function getSurahsInMemorizationOrder(surahsData) {
  if (!Array.isArray(surahsData)) return [];
  return [...surahsData].sort((a, b) => b.number - a.number);
}
