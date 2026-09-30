// engine/reviewParts.js
// =============================================================================
// 🌟 [جديد — مُعمَّم على القرآن كله] منطق "مراجعة الشهر" على الأجزاء الثلاثين وبمستوى
// الآية. دوال خالصة (بلا DOM ولا قاعدة بيانات) تُستعمل في شاشة الإدخال
// (components/monthlyReviewScreen.js) وفي التقرير ومركز التقارير.
//
// نموذج البيانات المحفوظ في سجل الشهر (حقل review):
//   { entries: [ { juz: 26, from: {surah: 46, ayah: 1}, to: {surah: 49, ayah: 18} }, ... ], recordedAt }
// كل عنصر = "جزء" راجع فيه الطالب هذا الشهر من موضع إلى موضع (سورة + آية). المعلم يضيف
// فقط الأجزاء التي راجعها الطالب فعلًا (لا يُطلب منه ملء ثلاثين جزءًا).
// 🌟 [توافق قديم] الصيغة السابقة { parts: { "26": {fromSurah, toSurah} } } (الأجزاء الخمسة بمستوى
// السورة) ما زالت تُقرأ عبر normalizeReview وتُحوَّل تلقائيًا لعناصر بمستوى السورة كاملة.
//
// ⚠️ [افتراضات صريحة]
//  1) حدود الأجزاء الثلاثين هي حدود المصحف المتداول (مصحف المدينة): بداية كل جزء (سورة:آية)
//     في JUZ_STARTS أدناه. (لو أردت حدودًا مختلفة عدّل هذا الجدول فقط.)
//  2) عدد الآيات المُراجَعة = |فهرس نهاية − فهرس بداية| + 1 على تسلسل آيات المصحف، فلا يهم
//     اتجاه المراجعة (من أول الجزء لآخره أو العكس)، ولا يوجد "التفاف" ولا عدّ دورات.
//  3) الموضعان يجب أن يقعا داخل نفس الجزء المختار؛ ما خرج عنه يُرفض في الإدخال.
//  4) أسماء الأجزاء 26–30 كما سمّاها المعلم (الأحقاف، الذاريات، المجادلة، تبارك، عمّ)، وبقية
//     الأجزاء "الجزء N".
// =============================================================================

// بداية كل جزء [رقم السورة، رقم الآية] — الجزء 1 ... 30
export const JUZ_STARTS = [
  [1, 1], [2, 142], [2, 253], [3, 93], [4, 24], [4, 148], [5, 82], [6, 111], [7, 88], [8, 41],
  [9, 93], [11, 6], [12, 53], [15, 1], [17, 1], [18, 75], [21, 1], [23, 1], [25, 21], [27, 56],
  [29, 46], [33, 31], [36, 28], [39, 32], [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1]
];
export const JUZ_COUNT = 30;

const JUZ_SPECIAL = { 26: 'ahqaf', 27: 'dhariyat', 28: 'mujadila', 29: 'tabarak', 30: 'amma' };

/** اسم الجزء للعرض. t = دالة الترجمة (تُمرَّر حتى يبقى هذا الملف خالصًا بلا استيراد). */
export function juzLabel(n, t) {
  const k = JUZ_SPECIAL[n];
  return k ? t('mrv_part_' + k) : t('mrv_juz_n').replace('{n}', n);
}

function ayahCountOf(surahsData, s) {
  const x = Array.isArray(surahsData) ? surahsData.find(z => z.number === s) : null;
  return x ? x.ayahsCount : null;
}

// فهرس الآية على تسلسل المصحف (الفاتحة:1 = 1)
export function ayahIndex(surahsData, surah, ayah) {
  let sum = 0;
  for (const x of surahsData) if (x.number < surah) sum += x.ayahsCount;
  return sum + ayah;
}

/** حدود الجزء: { start:{surah,ayah}, end:{surah,ayah} } أو null لو بيانات السور غير جاهزة. */
export function juzBounds(surahsData, n) {
  if (!Array.isArray(surahsData) || !surahsData.length || n < 1 || n > JUZ_COUNT) return null;
  const st = JUZ_STARTS[n - 1];
  const start = { surah: st[0], ayah: st[1] };
  let end;
  if (n < JUZ_COUNT) {
    const nx = JUZ_STARTS[n];
    if (nx[1] > 1) end = { surah: nx[0], ayah: nx[1] - 1 };
    else { const ps = nx[0] - 1; end = { surah: ps, ayah: ayahCountOf(surahsData, ps) }; }
  } else {
    end = { surah: 114, ayah: ayahCountOf(surahsData, 114) };
  }
  if (end.ayah == null) return null;
  return { start, end };
}

/** سور الجزء بترتيب المصحف مع أول وآخر آية داخل الجزء: [{number, firstAyah, lastAyah}]. */
export function juzSurahs(surahsData, n) {
  const b = juzBounds(surahsData, n);
  if (!b) return [];
  const list = [];
  for (let s = b.start.surah; s <= b.end.surah; s++) {
    const count = ayahCountOf(surahsData, s);
    if (count == null) continue;
    list.push({
      number: s,
      firstAyah: s === b.start.surah ? b.start.ayah : 1,
      lastAyah: s === b.end.surah ? b.end.ayah : count
    });
  }
  return list;
}

/** هل (سورة، آية) داخل الجزء n؟ */
export function positionInJuz(surahsData, n, surah, ayah) {
  const list = juzSurahs(surahsData, n);
  const s = list.find(x => x.number === Number(surah));
  return !!s && Number.isInteger(ayah) && ayah >= s.firstAyah && ayah <= s.lastAyah;
}

/**
 * عدد الآيات المُراجَعة بين موضعين داخل جزء (شاملًا الطرفين، باتجاه أيًّا كان) + نسبتها من الجزء.
 * ترجع null لو أي موضع خارج الجزء.
 */
export function coveredAyahs(surahsData, n, from, to) {
  const b = juzBounds(surahsData, n);
  if (!b || !from || !to) return null;
  if (!positionInJuz(surahsData, n, from.surah, from.ayah) || !positionInJuz(surahsData, n, to.surah, to.ayah)) return null;
  const a = ayahIndex(surahsData, from.surah, from.ayah);
  const z = ayahIndex(surahsData, to.surah, to.ayah);
  const total = ayahIndex(surahsData, b.end.surah, b.end.ayah) - ayahIndex(surahsData, b.start.surah, b.start.ayah) + 1;
  const count = Math.abs(z - a) + 1;
  return { count, total, pct: Math.min(100, Math.round((count / total) * 100)) };
}

/**
 * يحوّل أي صيغة محفوظة لـ review إلى قائمة عناصر موحّدة [{juz, from, to}]:
 *   • الصيغة الجديدة: review.entries كما هي.
 *   • الصيغة القديمة review.parts (الأجزاء 26–30 بمستوى السورة): من أصغر سورة إلى أكبر سورة
 *     مختارتين، كل منهما كاملة (أول آية في الأولى وآخر آية في الثانية داخل الجزء).
 */
export function normalizeReview(review, surahsData) {
  if (!review) return [];
  if (Array.isArray(review.entries)) {
    return review.entries.filter(e => e && e.juz && e.from && e.to);
  }
  if (review.parts && typeof review.parts === 'object') {
    const out = [];
    for (const key of Object.keys(review.parts)) {
      const r = review.parts[key];
      const juz = Number(key);
      if (!r || r.toSurah == null || r.fromSurah == null) continue;
      const list = juzSurahs(surahsData, juz);
      const lo = Math.min(r.fromSurah, r.toSurah);
      const hi = Math.max(r.fromSurah, r.toSurah);
      const sLo = list.find(x => x.number === lo);
      const sHi = list.find(x => x.number === hi);
      if (!sLo || !sHi) continue;
      out.push({ juz, from: { surah: lo, ayah: sLo.firstAyah }, to: { surah: hi, ayah: sHi.lastAyah } });
    }
    return out;
  }
  return [];
}

/**
 * ملخّص جاهز للعرض: { entries: [{juz, fromName, fromAyah, toName, toAyah, count, total, pct}],
 *                    totalAyahs, juzCount } أو null لو لا شيء صالح.
 */
export function summarizeReview(review, surahsData) {
  const nameOf = (n) => {
    const s = Array.isArray(surahsData) ? surahsData.find(x => x.number === n) : null;
    return s ? s.name : String(n);
  };
  const entries = [];
  let totalAyahs = 0;
  for (const e of normalizeReview(review, surahsData)) {
    const cov = coveredAyahs(surahsData, e.juz, e.from, e.to);
    if (!cov) continue;
    totalAyahs += cov.count;
    entries.push({
      juz: e.juz,
      fromName: nameOf(e.from.surah), fromAyah: e.from.ayah,
      toName: nameOf(e.to.surah), toAyah: e.to.ayah,
      count: cov.count, total: cov.total, pct: cov.pct
    });
  }
  entries.sort((a, b) => a.juz - b.juz);
  const juzCount = new Set(entries.map(x => x.juz)).size;
  return entries.length ? { entries, totalAyahs, juzCount } : null;
}
