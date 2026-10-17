// engine/tajweedLetterExamples.js
//
// 🌟 بيانات خالصة (بلا DOM): مثال قرآني لكل حرف من حروف الحكم، على نهج صفحات «الحرف ← الكلمة» في
// كتاب «فتوحات الرحمن في تيسير تجويد القرآن» (الإظهار الحلقي ص١٨، الإدغام ص٢٤ و٣٠، الإقلاب ص٣٦،
// الإخفاء ص٤٢، الميم الساكنة ص٦ و٩، الغنة ص٤).
//
// ⚠️ لا نصّ قرآنياً مكتوباً هنا: كل مثال مرجعٌ (s=السورة، a=الآية) + عبارة البحث h (بلا تشكيل) +
// w = ترتيب الكلمة (من صفر) داخل العبارة التي يبدأ بها الحرف المقصود. الكلمات المعروضة للطالب تُقتطَع
// وقت العرض من مصحف المنصة (database/quran-uthmani.json) بدالة splitLetterExample أدناه، فيطابق التشكيل
// والرسم ما يراه الطالب في بقية المنصة. اختبار tests/tajweedLetterData.test.mjs يتحقق أن كل مرجع
// يحتوي عبارته فعلاً في المصحف المحلي وأن الحرف المقصود صحيح.
//
// n (اختياري): الحرف المقصود في وسط الكلمة، ترتيبه من صفر بين حروف الكلمة (بحركاتها) بدل أول حرف فيها.
// whole:true ← الحرف المقصود مشدَّد (غنة المشدَّدتين) فتُظلَّل الكلمة كلها لا حرفها الأول فقط.
//
// المفتاح الأول: معرِّف الحكم في الكتالوج. المفتاح الثاني: الحرف (بلا تشكيل).

import { findPhraseRanges } from '../core/quranTextUtils.js';
import { isWaqfMark } from './quranEngine.js';

export const LETTER_EXAMPLES = {
    // القلقلة: الحرف ساكن في وسط الكلمة (قلقلة صغرى) فيُظلَّل الحرف نفسه بترتيبه n (من صفر) داخل الكلمة لا أولها
    qalqalah: {
        'ق': { s: 2, a: 27, h: 'ويقطعون', w: 0, n: 2 },
        'ط': { s: 2, a: 75, h: 'أفتطمعون', w: 0, n: 3 },
        'ب': { s: 4, a: 37, h: 'يبخلون', w: 0, n: 1 },
        'ج': { s: 2, a: 19, h: 'يجعلون', w: 0, n: 1 },
        'د': { s: 110, a: 2, h: 'يدخلون', w: 0, n: 1 }
    },
    izhar: {
        'ء': { s: 80, a: 34, h: 'من أخيه', w: 1 },
        'ه': { s: 6, a: 90, h: 'إن هو', w: 1 },
        'ع': { s: 96, a: 2, h: 'من علق', w: 1 },
        'ح': { s: 41, a: 42, h: 'من حكيم', w: 1 },
        'غ': { s: 7, a: 43, h: 'من غل', w: 1 },
        'خ': { s: 106, a: 4, h: 'من خوف', w: 1 }
    },
    idgham_bighunnah: {
        'ي': { s: 99, a: 7, h: 'من يعمل', w: 1 },
        'ن': { s: 92, a: 19, h: 'من نعمة', w: 1 },
        'م': { s: 86, a: 6, h: 'من ماء', w: 1 },
        'و': { s: 13, a: 11, h: 'من وال', w: 1 }
    },
    idgham_bila_ghunnah: {
        'ل': { s: 18, a: 2, h: 'من لدنه', w: 1 },
        'ر': { s: 2, a: 5, h: 'من ربهم', w: 1 }
    },
    iqlab: {
        'ب': { s: 2, a: 27, h: 'من بعد', w: 1 }
    },
    ikhfa: {
        'ص': { s: 15, a: 26, h: 'من صلصال', w: 1 },
        'ذ': { s: 49, a: 13, h: 'من ذكر', w: 1 },
        'ث': { s: 2, a: 25, h: 'من ثمرة', w: 1 },
        'ك': { s: 2, a: 164, h: 'من كل', w: 1 },
        'ج': { s: 106, a: 4, h: 'من جوع', w: 1 },
        'ش': { s: 113, a: 2, h: 'من شر', w: 1 },
        'ق': { s: 2, a: 4, h: 'من قبل', w: 1 },
        'س': { s: 105, a: 4, h: 'من سجيل', w: 1 },
        'د': { s: 2, a: 23, h: 'من دون', w: 1 },
        'ط': { s: 6, a: 2, h: 'من طين', w: 1 },
        'ز': { s: 14, a: 44, h: 'من زوال', w: 1 },
        'ف': { s: 2, a: 90, h: 'من فضله', w: 1 },
        'ت': { s: 2, a: 25, h: 'من تحتها', w: 1 },
        'ض': { s: 30, a: 54, h: 'من ضعف', w: 1 },
        'ظ': { s: 34, a: 22, h: 'من ظهير', w: 1 }
    },
    ghunna_wajiba: {
        'م': { s: 78, a: 1, h: 'عم يتساءلون', w: 0, whole: true },
        'ن': { s: 108, a: 1, h: 'إنا أعطيناك', w: 0, whole: true }
    },
    ikhfa_shafawi: {
        'ب': { s: 105, a: 4, h: 'ترميهم بحجارة', w: 1 }
    },
    idgham_shafawi: {
        'م': { s: 5, a: 9, h: 'لهم مغفرة', w: 1 }
    }
};

// علامات الوقف (ۚ ۖ …) كلمات مستقلة في النص فتفصل بين كلمتين متجاورتين؛ تُحذف قبل البحث عن العبارة
export const withoutWaqf = (text) => text.split(' ').filter(w => w && !isWaqfMark(w)).join(' ');

const MARKS = 'ً-ٰٟۖ-ۭ';
const CLUSTER_RE = new RegExp(`.[${MARKS}]*`, 'g');
const FIRST_LETTER_RE = new RegExp(`^(.[${MARKS}]*)`);

// 🌟 تقتطع العبارة من نص الآية (نص المنصة) وتقسمها: { before, mark, after } — mark هو الجزء المظلَّل
// (الحرف الأول من الكلمة w بحركاته، أو الكلمة كلها إن كان whole). ترجع null إن لم تُوجَد العبارة.
export function splitLetterExample(rawAyahText, entry) {
    const ayahText = withoutWaqf(rawAyahText);
    const ranges = findPhraseRanges(ayahText, entry.h);
    if (!ranges || !ranges.length) return null;
    const [from, to] = ranges[0];
    const words = ayahText.slice(from, to).split(' ');
    if (entry.w < 0 || entry.w >= words.length) return null;
    const target = words[entry.w];
    let m, inner = '';
    if (entry.n) {
        const clusters = target.match(CLUSTER_RE) || [];
        if (entry.n >= clusters.length) return null;
        m = [clusters[entry.n], clusters[entry.n]];
        inner = clusters.slice(0, entry.n).join('');
    } else {
        m = entry.whole ? [target, target] : target.match(FIRST_LETTER_RE);
    }
    if (!m) return null;
    const before = words.slice(0, entry.w).join(' ');
    const after = target.slice(inner.length + m[1].length) + (entry.w + 1 < words.length ? ' ' + words.slice(entry.w + 1).join(' ') : '');
    return { before: (before ? before + ' ' : '') + inner, mark: m[1], after };
}
