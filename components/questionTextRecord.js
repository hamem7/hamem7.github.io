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
        fullAnswer: aRows,
        // 🌟 [جديد] الأزواج الخام (id/بداية/نهاية) لإعادة بناء لعبة الربط التفاعلية في "علاج الخطأ"
        linkPairs: rows.map(s => ({ id: s.id, start: s.text, end: endById.get(s.id) }))
    };
}

// 🌟 [جديد] إعادة بناء لعبة الربط (starts/ends) من سجل خطأ محفوظ لعرضها في "علاج الخطأ السابق"
// بنفس طريقة ظهورها للطالب (تفاعلية بدل نص ثابت). المصدر الأول: linkPairs (السجلات الجديدة).
// احتياط للسجلات القديمة التي لا تملكه: تحليل fullAnswer (صفوف مفصولة بـ <br>، وكل صف
// "بداية … نهاية" أو "كلمة ⟷ سورة" — أول فاصل في الصف). ⚠️ افتراض: لا يظهر الفاصل داخل نص
// البداية نفسها؛ ولو تعذّر تحليل أي صف نرجع null فيبقى العرض الثابت القديم بلا كسر.
// عمود النهايات يُخلط مستقلًا عن البدايات (يختلف عن الترتيب الأصلي قدر الإمكان).
export function rebuildLinkFromRecord(wItem) {
    if (!wItem) return null;
    let pairs = null;
    if (Array.isArray(wItem.linkPairs) && wItem.linkPairs.length > 1 &&
        wItem.linkPairs.every(p => p && p.id != null && p.start && p.end)) {
        pairs = wItem.linkPairs.map(p => ({ id: p.id, start: p.start, end: p.end }));
    } else if (typeof wItem.fullAnswer === 'string' && wItem.fullAnswer.includes('<br>')) {
        const isWS = wItem.questionType === 'link_word_surah' || wItem.questionType === 'kids_link_word_surah';
        const sep = isWS ? ' ⟷ ' : ' … ';
        const parsed = wItem.fullAnswer.split('<br>').map((row, i) => {
            const k = row.indexOf(sep);
            return k > 0 ? { id: 'p' + i, start: row.slice(0, k), end: row.slice(k + sep.length) } : null;
        });
        if (parsed.length > 1 && parsed.every(p => p && p.start && p.end)) pairs = parsed;
    }
    if (!pairs) return null;
    const starts = pairs.map(p => ({ id: p.id, text: p.start }));
    let ends = pairs.map(p => ({ id: p.id, text: p.end }));
    const sameOrder = (a) => a.every((e, i) => e.id === starts[i].id);
    for (let attempt = 0; attempt < 20; attempt++) {
        const s = ends.slice();
        for (let i = s.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [s[i], s[j]] = [s[j], s[i]];
        }
        ends = s;
        if (!sameOrder(ends)) break;
    }
    return { starts, ends, answerHTML: pairs.map(p => `${p.start} ${(wItem.questionType || '').includes('word_surah') ? '⟷' : '…'} ${p.end}`).join('<br>') };
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
