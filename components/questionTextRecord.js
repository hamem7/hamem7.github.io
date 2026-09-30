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

// 🌟 [جديد] ترويسة "ما هو السؤال؟" في شاشة "علاج الخطأ السابق" — الطالب (والمعلم) أول ما يسأله: "كان إيه السؤال؟".
// كان العرض يكتفي بنص الآية (questionBody) بينما صيغة السؤال نفسها ("ماذا بعدها؟"، "أكمل الجزء الناقص...")
// تعيش في questionTitle ولا تُخزَّن، وسطر "نوع السؤال" صغير تحت النص فلا يلفت النظر. هنا نعرض صيغة السؤال
// بخط كبير فوق نصه مباشرة:
//   • خطأ جديد: questionTitle المحفوظ (أو التسمية questionTypeLabel لو كان السجل وسطيًا بلا عنوان).
//   • خطأ قديم جدًا (سُجِّل قبل حفظ تفاصيل السؤال، ولا يملك أيًّا من الحقلين): لا يمكن استرجاع السؤال
//     الأصلي أبدًا، فنعرض تنبيهًا صريحًا بدل الصمت حتى لا يبدو للمعلم أن الشاشة معطّلة.
// tFn: دالة الترجمة t (تُمرَّر من اللعبة لتجنب استيراد دائري)، accent: لون العنوان (كبار/أطفال).
export function buildWeaknessQuestionHeader(wItem, tFn, accent) {
    const tr = (k) => (typeof tFn === 'function' ? tFn(k) : k);
    const title = wItem && (wItem.questionTitle || wItem.questionTypeLabel);
    if (title) {
        const label = wItem.questionTitle ? tr('weak_q_label') : tr('hw_q_type_label');
        return `<div class="dh-wq-head" style="margin-bottom:14px;">` +
            `<div style="font-size:1.1rem; color:#64748b; font-weight:bold;">${label}</div>` +
            `<div style="font-size:2rem; font-weight:bold; color:${accent || 'var(--primary)'}; line-height:1.5;">${tr(title)}</div>` +
            `</div>`;
    }
    return `<div class="dh-wq-head dh-wq-legacy" style="margin-bottom:14px; padding:10px 16px; border-radius:14px; background:#fffbeb; border:2px dashed #d4a017; color:#92400e; font-size:1.15rem; font-weight:bold; line-height:1.7;">` +
        `⚠️ ${tr('weak_q_legacy')}</div>`;
}
