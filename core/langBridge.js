// core/langBridge.js
// 🌟 [جديد — إصلاح شامل لنظام الترجمة] جسر ترجمة خفيف بلا أي اعتماد على DOM أو localStorage أو app.js —
// ليستورده المحرّكات النقية (engine/quranEngine.js ...) بدل core/i18n.js مباشرة. السبب: هذه المحرّكات
// تُستورَد أيضاً في اختبارات Node (tests/*.test.js) خارج المتصفح، واستيراد i18n.js يسحب معه AppState
// الذي يقرأ localStorage عند التحميل فيكسر الاختبارات.
//
// الآلية: core/i18n.js يستدعي registerTranslator() مرة واحدة عند تحميله في المتصفح. أي استدعاء لـ tl()
// قبل التسجيل (مثل اختبارات Node) يرجع النص العربي الاحتياطي كما هو — أي نفس السلوك القديم تماماً.
let _impl = null;

export function registerTranslator(impl) { _impl = impl; }

function _fill(s, params) {
    if (params) Object.keys(params).forEach(k => { s = s.split('{' + k + '}').join(String(params[k])); });
    return s;
}

// tl(key, arFallback, params): ترجمة بمفتاح + نص عربي احتياطي (يُستخدم لو لا يوجد مترجم مسجَّل)
export function tl(key, arFallback, params) {
    if (_impl) return _impl.tf(key, params);
    return _fill(arFallback, params);
}

// tt(arabicText): ترجمة نص عربي-مفتاح (الأسلوب القديم t("نص عربي")) — يرجع النص نفسه لو لا مترجم
export function tt(arabicText) { return _impl ? _impl.t(arabicText) : arabicText; }

// nameL(surahName): اسم السورة بلغة الواجهة (بدون كلمة "سورة") — يرجع الاسم كما هو لو لا مترجم
export function nameL(surahName) { return _impl ? _impl.surahNameLocal(surahName) : surahName; }

// labelL(surahName): "سورة X" / "Surah X"
export function labelL(surahName) { return _impl ? _impl.surahLabel(surahName) : 'سورة ' + surahName; }

// sepL(): فاصل القوائم (، في العربية و , في الإنجليزية)
export function sepL() { return _impl ? _impl.tf('list_sep') : '، '; }
