// core/quranTextUtils.js
//
// 🌟 [جديد] دوال نصية عربية "نقية" (Pure) بلا أي اعتماد على DOM أو AppState — استُخرجت من
// similarities/similarities.js عند بناء ألعاب "ركن المتشابهات" التفاعلية، لتصبح قابلة
// للاستخدام مباشرة من engine/similarityEngine.js (المنطق البحت القابل للاختبار بـ Node.js
// بمعزل عن المتصفح) وأيضاً من شاشات العرض نفسها (similarities.js وsimilarities-play.js) دون
// ازدواجية. لا تغيير في أي سلوك هنا مقارنة بالنسخة الأصلية — نقل حرفي مع توضيح الاستخدام
// الجديد فقط. راجع التعليقات التفصيلية أدناه لفهم سبب كل قرار (خصوصاً اكتشاف الفرق بين
// الرسم العثماني الرسمي ورسم التفريغ اليدوي من الـ PDF أثناء بناء ركن المتشابهات).

// ============================================================
// تطبيع ومطابقة الحروف العربية (بلا تشكيل، بلا فروق رسم إملائي)
// ============================================================

// 🌟 نستخدم "قائمة سماح" (وايت ليست) تُبقي فقط الحروف العربية الأساسية بدل تعداد رموز
// التشكيل المراد استبعادها (بلاك ليست قد تفوت رموزاً لم نتوقعها) — اكتُشف هذا فعلياً بعد
// اختبار الدالة بنصوص عثمانية حقيقية (Node.js) ولقينا حالات إملائية شائعة لسه بتكسر
// المطابقة: الألف الوصلية ٱ (U+0671) والألف الخنجرية ٰ (U+0670) أُضيفتا صراحة للنطاق
// (بدل تركهما تُشالان بالكامل بالخطأ)، والهمزة المفردة ء (U+0621) استُبعدت عمداً من بداية
// النطاق (تُكتب منفصلة عن الألف أحياناً بالرسم العثماني بينما التفريغ اليدوي يكتبها مدموجة).
export function isArabicBaseLetterCode(code) {
    return (code >= 0x0622 && code <= 0x063A) || (code >= 0x0641 && code <= 0x064A) || code === 0x0671 || code === 0x0670;
}

// توحيد صيغ الألف (إ أ آ ٱ والألف الخنجرية ٰ) لحرف "ا"، وألف مقصورة "ى" لـ"ي"
export function normalizeArabicChar(ch) {
    if (ch === 'إ' || ch === 'أ' || ch === 'آ' || ch === 'ٱ' || ch === 'ٰ') return 'ا';
    if (ch === 'ى') return 'ي';
    return ch;
}

// 🌟 علامات تشكيل قد تلتصق بآخر حرف من المطابقة (فتحة/كسرة/ضمة/تنوين/سكون/شدة وعلامات
// قرآنية صغيرة) — بدونها تقف نهاية التظليل/الإخفاء عند الحرف الأخير بالظبط وتترك حركته خارج
// النطاق بصرياً (اكتُشف بالاختبار الفعلي). نمدّد النهاية لتشملها.
export function isTrailingMarkCode(code) {
    return (code >= 0x064B && code <= 0x065F) || (code >= 0x06D6 && code <= 0x06ED);
}

// يبني نسخة من النص مجرّدة (حروف أساسية موحّدة فقط) + خريطة تربط كل حرف في النسخة المجرّدة
// بموضعه الأصلي في النص الكامل، حتى نقدر نستخدم الجزء الصحيح من النص الأصلي (بتشكيله ورسمه
// الأصلي) بعد إيجاد المطابقة في النسخة المجرّدة.
export function buildStrippedCharMap(original) {
    let stripped = '';
    const map = [];
    for (let i = 0; i < original.length; i++) {
        const code = original.codePointAt(i);
        if (!isArabicBaseLetterCode(code)) continue;
        stripped += normalizeArabicChar(original[i]);
        map.push(i);
    }
    return { stripped, map };
}

// 🌟 [جديد] دالة مشتركة تُرجع كل نطاقات (بدايات/نهايات) تطابق أي صيغة من صيغ phrase داخل
// text (النص الأصلي، بتشكيله كاملاً) — استُخرجت من داخل highlightAnchorInText القديمة بلا
// أي تغيير في منطق المطابقة نفسه (نفس buildStrippedCharMap/isTrailingMarkCode المُختبَرة
// فعلياً على الـ 800 موضع الحقيقية في مجموعات المتشابهات)، لإعادة استخدامها الآن في كل من
// التظليل (highlightAnchorInText) والإخفاء (blankPhraseInText، للعبة "أكمل الآية الصحيحة")
// بلا ازدواجية.
export function findPhraseRanges(text, phrase) {
    if (!text || !phrase) return [];
    // phrase أحياناً يحمل أكثر من صيغة مفصولة بـ " / " (مثال: "الذين كفروا / الذين كفروا
    // وصدوا عن سبيل الله") — نبحث عن كل الصيغ، الأطول أولاً حتى لا تُقتطع صيغة أطول تحتوي
    // على صيغة أقصر منها بالخطأ.
    const variants = phrase.split('/').map(v => v.trim()).filter(Boolean)
        .sort((a, b) => b.length - a.length);
    if (variants.length === 0) return [];

    const { stripped, map } = buildStrippedCharMap(text);
    const ranges = []; // [بداية، نهاية] في النص الأصلي (غير المجرّد من التشكيل)

    variants.forEach(variant => {
        const strippedVariant = buildStrippedCharMap(variant).stripped;
        if (!strippedVariant) return;
        let searchFrom = 0;
        let idx;
        while ((idx = stripped.indexOf(strippedVariant, searchFrom)) !== -1) {
            const origStart = map[idx];
            let origEnd = map[idx + strippedVariant.length - 1] + 1;
            while (origEnd < text.length && isTrailingMarkCode(text.codePointAt(origEnd))) origEnd++;
            // تفادي تظليل/إخفاء نفس الجزء مرتين لو صيغة قصيرة وقعت داخل صيغة أطول طُوبقت فعلاً
            const overlaps = ranges.some(r => origStart < r[1] && origEnd > r[0]);
            if (!overlaps) ranges.push([origStart, origEnd]);
            searchFrom = idx + strippedVariant.length;
        }
    });

    ranges.sort((a, b) => a[0] - b[0]);
    return ranges;
}

// تظليل كل مطابقات anchorPhrase داخل text بـ <mark class="sim-highlight"> — نفس السلوك
// الأصلي بالضبط، لكن الآن مبني فوق findPhraseRanges المشتركة أعلاه.
export function highlightAnchorInText(text, anchorPhrase) {
    if (!text || !anchorPhrase) return text || '';
    const ranges = findPhraseRanges(text, anchorPhrase);
    if (ranges.length === 0) return text;

    let html = '';
    let cursor = 0;
    ranges.forEach(([start, end]) => {
        html += text.slice(cursor, start);
        html += `<mark class="sim-highlight">${text.slice(start, end)}</mark>`;
        cursor = end;
    });
    html += text.slice(cursor);
    return html;
}

// 🌟 [جديد] بلعبة "أكمل الآية الصحيحة" نحتاج إخفاء الكلمة/العبارة المميزة
// (distinctiveTailWord) بدل تظليلها فقط — نفس منطق المطابقة (findPhraseRanges) بالضبط، لكن
// بدل <mark> نضع فراغاً قابلاً للتعبئة (span.sim-blank-slot). نخفي آخر مطابقة تحديداً
// (وليس الأولى) لأن الكلمة المميزة غالباً تقع قرب نهاية الآية، وقد تتكرر كلمة قصيرة مصادفةً
// قبلها في بداية الآية أو وسطها.
export function blankPhraseInText(text, phrase) {
    if (!text || !phrase) return { html: text || '', found: false, removedText: '' };
    const ranges = findPhraseRanges(text, phrase);
    if (ranges.length === 0) return { html: text, found: false, removedText: '' };
    const [start, end] = ranges[ranges.length - 1];
    const removedText = text.slice(start, end);
    const html = `${text.slice(0, start)}<span class="sim-blank-slot">......</span>${text.slice(end)}`;
    return { html, found: true, removedText };
}

// ============================================================
// الأرقام الهندية وتقسيم نطاقات الآيات (جزء عمّ)
// ============================================================

// 🌟 نص fullText لمواضع "جزء عمّ" (ayahRange) يحتوي فعلياً فواصل نهاية كل آية مضمّنة بصيغة
// "﴿١٥﴾" (قوس مزخرف مطابق لرسم القرآن + رقم بالأرقام الهندية) — نفس رمز نهاية الآية
// القياسي. هذا يسمح بتقسيم كل موضع نطاق لآيات مفردة، وعرض كل واحدة بنفس شكل الدائرة الخضراء
// المستخدم للمتشابهات الداخلية.
export const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function arabicIndicToNumber(str) {
    let out = '';
    for (const ch of str) {
        const idx = ARABIC_INDIC_DIGITS.indexOf(ch);
        out += idx === -1 ? ch : String(idx);
    }
    return parseInt(out, 10);
}

export function splitRangeFullTextIntoAyahs(fullText) {
    const regex = /([\s\S]*?)﴿([٠-٩]+)﴾/g;
    const parts = [];
    let match;
    while ((match = regex.exec(fullText)) !== null) {
        const ayahText = match[1].trim();
        if (ayahText) parts.push({ text: ayahText, ayahNumber: arabicIndicToNumber(match[2]) });
    }
    // 🛡️ خط دفاع احتياطي: لو نص قديم/استثنائي بلا أي علامة ﴿رقم﴾ مضمّنة، نرجّع الكتلة
    // كاملة بلا رقم بدل ما نفقد النص بالكامل
    return parts.length > 0 ? parts : [{ text: fullText, ayahNumber: null }];
}
