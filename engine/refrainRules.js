// engine/refrainRules.js
//
// قاعدة «الآيات المكررة حرفياً» (الرحمن: «فبأي آلاء ربكما تكذبان» ×31، المرسلات: «ويل يومئذ للمكذبين» ×10).
// أي سؤال هدفه آية من هذه الآيات بلا جواب وحيد: «ماذا بعدها؟»، «تسميع مقطع»، «الذاكرة البصرية» (أي صفحة؟)،
// «اربط أول الآية بآخرها»، «اذكر الآية قبلها وبعدها»... فتُستثنى من اختيار آية السؤال، وتبقى إجابة صحيحة
// حين تكون هي الآية التالية/السابقة لآية فريدة. (محرك خالص بلا DOM ليُختبر بـ Node.)
//
// ⚠️ سبب الإصلاح: الفلتر القديم كان يطابق «آلاء» بالألف الممدودة، بينما الرسم العثماني في قاعدة المصحف
// «ءالاء» (همزة ثم ألف) فلم يطابق أي آية من الـ٣١ (صفر مطابقة) وظهرت الآية في كل الأسئلة.

const MARKS = /[ؐ-ًؚ-ٰٟۖ-ࣰۭ-ࣿـ]/g;

// تجريد كامل: بلا تشكيل ولا تطويل، توحيد الألفات والياء، وحذف الهمزة المنفصلة (ء) وكل ما ليس حرفاً عربياً
export function refrainSkeleton(text) {
    return String(text || '')
        .replace(MARKS, '')
        .replace(/[ٱأإآ]/g, 'ا')
        .replace(/[ىیئ]/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/ء/g, '')
        .replace(/[^ء-ي]/g, '');
}

const REFRAINS = ['فبايالاربكماتكذبان', 'ويليومئذللمكذبين'].map(refrainSkeleton);

export const RAHMAN_SURAH = 55;

export function isRefrainAyah(ayah) {
    const sk = refrainSkeleton(ayah && ayah.text);
    return REFRAINS.some(r => sk.includes(r));
}

export function isRahmanPool(pool) {
    return Array.isArray(pool) && pool.length > 0 && pool.every(a => a && a.surahNumber === RAHMAN_SURAH);
}

// يستبعد آيات التكرار. إن لم يبقَ شيء (نطاق كله تكرار) يُرجَع الأصل كملاذ أخير كما كان السلوك.
export function excludeRefrainAyahs(pool) {
    const kept = (pool || []).filter(a => !isRefrainAyah(a));
    return kept.length > 0 ? kept : pool;
}

// نافذة آيات متتالية فيها نصان متطابقان تُربك أسئلة الترتيب (أيّ «الفبأي» هي؟)
export function hasDuplicateAyahTexts(ayahs) {
    const seen = new Set();
    for (const a of ayahs) { const k = refrainSkeleton(a && a.text); if (seen.has(k)) return true; seen.add(k); }
    return false;
}
