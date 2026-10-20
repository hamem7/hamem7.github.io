// engine/tajweedBookImages.js
//
// 🌟 بيانات صور كتاب «التجويد المصور» للدكتور أيمن رشدي سويد (رسوم تشريحية لمخارج الحروف وغيرها) — بيانات خالصة بلا DOM.
// الصور مقتطعة من الكتاب (الرسم وحده دون صفحاته) ومرفوعة في assets/tajweed/book/ باسم رقم صفحة الكتاب_ترتيب الصورة في الصفحة
// (مثل p101_0 = الصورة الأولى في ص١٠١). الاستخدام تعليمي غير تجاري بإذن المعلم، ويُنسَب الكتاب لصاحبه في كل عرض.
export const BOOK_IMAGES_DIR = 'assets/tajweed/book/';
export const bookImageUrl = (id) => `${BOOK_IMAGES_DIR}${id}.webp`;

// عنوان كل صورة (كما في الكتاب) بالعربية والإنجليزية
export const BOOK_IMAGES = {
    p094_0: { ar: 'الجوف', en: 'The empty space (jawf)' },
    p089_0: { ar: 'الألف المدّية', en: 'The madd alif' },
    p090_0: { ar: 'الواو المدّية', en: 'The madd waw' },
    p091_0: { ar: 'الياء المدّية', en: 'The madd yaa' },
    p098_0: { ar: 'أقصى الحلق: الهمزة والهاء', en: 'Deepest throat: hamzah and haa' },
    p099_0: { ar: 'الحاء', en: 'Haa (ح)' },
    p099_1: { ar: 'العين', en: 'Ayn (ع)' },
    p100_0: { ar: 'الخاء', en: 'Khaa (خ)' },
    p100_1: { ar: 'الغين', en: 'Ghayn (غ)' },
    p101_0: { ar: 'القاف', en: 'Qaf (ق)' },
    p102_0: { ar: 'الكاف', en: 'Kaf (ك)' },
    p103_0: { ar: 'الجيم', en: 'Jeem (ج)' },
    p104_0: { ar: 'الشين', en: 'Sheen (ش)' },
    p105_0: { ar: 'الياء غير المدّية', en: 'The non-madd yaa (ي)' },
    p107_0: { ar: 'الضاد', en: 'Dad (ض)' },
    p109_1: { ar: 'اللام', en: 'Lam (ل)' },
    p112_0: { ar: 'النون', en: 'Noon (ن)' },
    p113_0: { ar: 'الراء', en: 'Raa (ر)' },
    p116_0: { ar: 'الدال والتاء', en: 'Dal and taa (د ت)' },
    p116_1: { ar: 'الطاء', en: 'Taa, emphatic (ط)' },
    p117_0: { ar: 'السين والزاي', en: 'Seen and zay (س ز)' },
    p117_1: { ar: 'الصاد', en: 'Sad (ص)' },
    p118_0: { ar: 'الذال والثاء', en: 'Dhal and thaa (ذ ث)' },
    p118_1: { ar: 'الظاء', en: 'Zaa (ظ)' },
    p119_0: { ar: 'الفاء', en: 'Faa (ف)' },
    p120_0: { ar: 'الواو غير المدّية', en: 'The non-madd waw (و)' },
    p121_0: { ar: 'الباء', en: 'Baa (ب)' },
    p122_0: { ar: 'الميم', en: 'Meem (م)' },
    p123_0: { ar: 'غنّة الميم من الخيشوم', en: 'The ghunna of meem, from the nasal passage' },
    p123_1: { ar: 'غنّة النون من الخيشوم', en: 'The ghunna of noon, from the nasal passage' },
    p185_0: { ar: 'باء ساكنة مقلقلة: تباعد الشفتين دون الفكّين', en: 'A silent qalqalah baa: the lips part, not the jaws' },
    p301_0: { ar: 'إخفاء النون عند التاء والدال', en: 'Ikhfa of noon before taa and dal' },
    p302_0: { ar: 'إخفاء النون عند الكاف: وضع اللسان', en: 'Ikhfa of noon before kaf: tongue position' },
    p302_1: { ar: 'إخفاء النون عند القاف: وضع اللسان', en: 'Ikhfa of noon before qaf: tongue position' }
};

// صور كل مخرج (برقم المخرج 1..17 كما في tajweed-illustrations-art.js)
export const MAKHARIJ_IMAGES = {
    1: ['p094_0', 'p089_0', 'p090_0', 'p091_0'],
    2: ['p098_0'],
    3: ['p099_0', 'p099_1'],
    4: ['p100_0', 'p100_1'],
    5: ['p101_0'],
    6: ['p102_0'],
    7: ['p103_0', 'p104_0', 'p105_0'],
    8: ['p107_0'],
    9: ['p109_1'],
    10: ['p112_0'],
    11: ['p113_0'],
    12: ['p116_0', 'p116_1'],
    13: ['p117_0', 'p117_1'],
    14: ['p118_0', 'p118_1'],
    15: ['p119_0'],
    16: ['p121_0', 'p122_0', 'p120_0'],
    17: ['p123_0', 'p123_1']
};

// صور الأحكام (بمعرّف الحكم في الكتالوج)
export const RULE_BOOK_IMAGES = {
    qalqalah: ['p185_0'],
    ghunna_wajiba: ['p123_0', 'p123_1'],
    izhar: ['p098_0', 'p099_0', 'p099_1', 'p100_0', 'p100_1'],
    ikhfa: ['p301_0', 'p302_0', 'p302_1'],
    madd_tabii: ['p089_0', 'p090_0', 'p091_0']
};
