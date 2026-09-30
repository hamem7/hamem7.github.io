// components/questionTextRecord.js
// 🌟 [جديد] حفظ نص السؤال نفسه لأسئلة "الربط" عند تسجيل الخطأ.
//
// أغلب أنواع الأسئلة تملك questionBody جاهزاً يُخزَّن مع الخطأ (راجع recordAnswer في
// games/adultGame.js وkidsGame.js). أسئلة الربط ("اربط أول الآية بآخرها" و"اربط الكلمة
// بالسورة") تفاعلية بلا questionBody، فكان يُخزَّن لها عنوان عام فقط (مثل "ربط أوائل الآيات
// بأواخرها: 3، 5") بلا نصوص الآيات نفسها. هنا نبني من عمودي السؤال (starts/ends) نص السؤال
// (البدايات المطلوب استكمالها) وإجابته (كل بداية مع نهايتها الصحيحة) حسب المعرّف id المشترك.

export function buildLinkQuestionRecord(cd) {
    if (!cd || !Array.isArray(cd.starts) || !Array.isArray(cd.ends) || cd.starts.length === 0) return null;
    const endById = new Map(cd.ends.map(e => [e.id, e.text]));
    const rows = cd.starts.filter(s => endById.has(s.id));
    if (rows.length === 0) return null;
    const isWordSurah = cd.type === 'link_word_surah' || cd.type === 'kids_link_word_surah';
    const sep = isWordSurah ? ' ⟷ ' : ' … ';
    const qRows = rows.map(s => `<div class="quran-text" style="font-size:2.2rem; margin-bottom:8px;">${s.text} ${isWordSurah ? '⟷ ؟' : '…'}</div>`).join('');
    const aRows = rows.map(s => `${s.text}${sep}${endById.get(s.id)}`).join('<br>');
    return {
        questionBody: `<div style="margin-top:10px;">${qRows}</div>`,
        fullAnswer: aRows
    };
}
