// engine/skillMap.js
// ==========================================
// 🌟 [جديد — الواجب الذكي] خريطة المهارات: تربط كل نوع سؤال (في الواجبات والألعاب والاختبارات الفردية)
// بالمهارة التي يقيسها، وتعرّف أنواع الخطأ الخمسة التي يسجّلها المعلم يدوياً (errorTypes).
// ملف خالص: لا DOM ولا IndexedDB ولا استيراد من بقية المنصة، فيُختبر بـNode مباشرة.
//
// المهارات السبع (تجميع المعلم):
//   sequence  : التسلسل والترابط بين الآيات     (next / previous / between / around)
//   recall    : الاستدعاء الحر                 (catch / complete_ayah)
//   structure : بنية الآية وترتيبها            (order / kids_word_order)
//   precision : الدقة والتمييز بين المتشابه     (mistake / kids_extra_word / kids_tf)
//   context   : الربط بالسورة والسياق          (link_ends / link_word_surah / guess_surah)
//   visual    : الذاكرة البصرية                (visual_memory)
//   fluency   : الإتقان الكلي والطلاقة         (recite)
//   tajweed   : أحكام التجويد                  (tajweed_extract)
// ==========================================

export const SKILLS = ['sequence', 'recall', 'structure', 'precision', 'context', 'visual', 'fluency', 'tajweed'];

export const SKILL_LABELS = {
    sequence: 'التسلسل والترابط',
    recall: 'الاستدعاء الحر',
    structure: 'بنية الآية وترتيبها',
    precision: 'الدقة والتمييز بين المتشابه',
    context: 'الربط بالسورة والسياق',
    visual: 'الذاكرة البصرية',
    fluency: 'الإتقان والطلاقة',
    tajweed: 'أحكام التجويد'
};

// المهارتان اللتان لا يستطيع الواجب الإلكتروني تدريبهما بكثافة: الطلاقة تُقاس في الحصة فقط،
// والبصرية لها صيغة واحدة ضعيفة الدلالة (التخمين يعطي 50%)
export const SKILLS_NOT_TRAINABLE_BY_HOMEWORK = ['fluency'];

// ------------------------------------------
// أنواع الواجب المنزلي (مفاتيح HomeworkEngine) ← المهارة + مستوى الصعوبة
//   level: recognition (تعرّف) < recall (استحضار) < production (إنتاج)
//   manual: يحتاج تصحيح المعلم اليدوي (نقيّده بسقف حتى لا نثقل المعلم)
//   weight: وزن الدليل في حساب الإتقان (البصري 0.5 لأن التخمين يعطي 50%)
// ------------------------------------------
export const HW_FORMATS = {
    mcq_next:      { skill: 'sequence',  level: 'recognition', manual: false, weight: 1, diff: 'medium' },
    mcq_prev:      { skill: 'sequence',  level: 'recognition', manual: false, weight: 1, diff: 'hard' },
    // «الآية قبلها وبعدها»: تُعرض آية ويكتب الطالب بيده السابقة والتالية (تصحيح المعلم يدوياً، مرة واحدة فقط في الواجب)
    around_ayah:   { skill: 'sequence',  level: 'production',  manual: true,  weight: 1, diff: 'hard' },
    dropdown:      { skill: 'recall',    level: 'recognition', manual: false, weight: 1, diff: 'medium' },
    dual_dropdown: { skill: 'recall',    level: 'recall',      manual: false, weight: 1, diff: 'hard' },
    written_blank: { skill: 'recall',    level: 'recall',      manual: true,  weight: 1, diff: 'hard' },
    write_3_ayahs: { skill: 'recall',    level: 'production',  manual: true,  weight: 1, diff: 'hard' },
    matrix_order:  { skill: 'structure', level: 'recall',      manual: false, weight: 1, diff: 'hard' },
    intruder_word: { skill: 'precision', level: 'recognition', manual: false, weight: 1, diff: 'medium', retired: true },   // أُلغي من التوليد (سهل جداً)؛ يبقى للتاريخ القديم فقط
    mcq_surah:     { skill: 'context',   level: 'recognition', manual: false, weight: 1, diff: 'medium' },
    ayah_ending:   { skill: 'context',   level: 'recognition', manual: false, weight: 1, diff: 'hard' },
    checkbox:      { skill: 'context',   level: 'recognition', manual: false, weight: 1, diff: 'hard' },
    matching:      { skill: 'context',   level: 'recall',      manual: false, weight: 1, diff: 'medium' },
    visual_page:   { skill: 'visual',    level: 'recognition', manual: false, weight: 0.5, diff: 'medium', retired: true },   // أُلغي من التوليد (تخمين 50%)؛ يبقى للتاريخ القديم فقط
    // معاني الكلمات (السراج للخضيري أولاً، وكلمات القرآن لحسنين مخلوف احتياطاً): فهم لا حفظ، فوزنه نصف دليل الإتقان
    word_meaning:  { skill: 'context',   level: 'recognition', manual: false, weight: 0.5, diff: 'medium' },
    tajweed_extract: { skill: 'tajweed', level: 'production',  manual: true,  weight: 1, diff: 'medium' }
};

export function formatsOfSkill(skill) {
    return Object.keys(HW_FORMATS).filter(k => HW_FORMATS[k].skill === skill);
}

// استنتاج نوع الواجب من كائن سؤال محفوظ (واجبات قديمة بلا meta تتبّع): type + عنوان السؤال
export function inferHwFormat(q) {
    if (!q) return null;
    const type = q.type;
    const title = String(q.title || q.question || '');
    if (type === 'mcq') {
        if (title.includes('اليمنى أم اليسرى')) return 'visual_page';
        if (title.includes('ما معنى')) return 'word_meaning';
        if (title.includes('في أي سورة')) return 'mcq_surah';
        if (title.includes('تلي هذه')) return 'mcq_next';
        if (title.includes('تَسبِق') || title.includes('تسبق')) return 'mcq_prev';
        return null;
    }
    if (type === 'visual_page') return 'visual_page';
    return HW_FORMATS[type] ? type : null;
}

export function skillOfHwFormat(fmt) {
    return HW_FORMATS[fmt] ? HW_FORMATS[fmt].skill : null;
}

// ------------------------------------------
// أنواع أسئلة الألعاب والاختبارات الفردية ← المهارة
// ------------------------------------------
const GAME_TYPE_SKILL = {
    next: 'sequence', previous: 'sequence', between: 'sequence', around: 'sequence',
    catch: 'recall', complete_ayah: 'recall',
    word_meaning: 'context',
    order: 'structure', word_order: 'structure',
    mistake: 'precision', extra_word: 'precision', tf: 'precision',
    link_ends: 'context', link_word_surah: 'context', guess_surah: 'context', start_surah: 'context',
    visual_memory: 'visual',
    recite: 'fluency',
    similar: 'precision'
};

// kids_mcq سؤال متعدد الأشكال يميّزه العنوان
const KIDS_MCQ_TITLE_HINTS = [
    ['الكلمة الناقصة', 'recall'],
    ['الكلمات الناقصة', 'recall'],
    ['ماذا بعد', 'sequence'],
    ['ماذا قبل', 'sequence'],
    ['خمن السورة', 'context'],
    ['بأي آية تبدأ', 'context'],
    ['الكلمة الزائدة', 'precision'],
    ['من المتشابهات', 'precision']
];

export function skillOfGameType(type, title) {
    if (!type) return null;
    let key = String(type);
    if (key === 'kids_mcq') {
        const t = String(title || '');
        const hit = KIDS_MCQ_TITLE_HINTS.find(([frag]) => t.includes(frag));
        return hit ? hit[1] : null;
    }
    if (key.startsWith('kids_')) key = key.slice(5);
    return GAME_TYPE_SKILL[key] || null;
}

// ------------------------------------------
// أنواع الخطأ الخمسة التي يسجّلها المعلم يدوياً (قيم خانات الاختيار كما تُخزَّن في errorTypes)
//   wrongWeight: كم "خطأ" يُحسب (0.5 = نصف خطأ، لأن الحركة غالباً ضبط تلاوة لا حفظ)
//   forceFix   : يدفع المقطع مباشرة إلى حالة "يحتاج علاج"
//   scope      : segment = إشارة موضع (لا مهارة)
// ------------------------------------------
export const QUALITY = {
    dont_know: { label: 'لم يعرف الإجابة',          wrongWeight: 1.5, forceFix: true,  scope: 'segment' },
    forget:    { label: 'نسيان آية',                wrongWeight: 1.2, forceFix: true,  scope: 'segment' },
    multi:     { label: 'أكثر من نقطة',             wrongWeight: 1.5, forceFix: true,  scope: 'segment' },
    word:      { label: 'كلمة تحتاج مراجعة',        wrongWeight: 1,   forceFix: false, scope: 'segment' },
    haraka:    { label: 'حركة تحتاج تصحيح',         wrongWeight: 0.5, forceFix: false, scope: 'tajweed' }
};

// نص الخطأ المخزَّن (قائمة مفصولة بـ"|" أو "،" أو مصفوفة) ← رموز موحّدة
export function parseQualityCodes(input) {
    if (input == null) return [];
    const parts = Array.isArray(input) ? input : String(input).split(/\s*[|،,]\s*/);
    const out = new Set();
    parts.forEach(p => {
        const s = String(p || '');
        if (!s) return;
        if (s.includes('لم يعرف')) out.add('dont_know');
        else if (s.includes('نسيان')) out.add('forget');
        else if (s.includes('أكتر من نقطة') || s.includes('أكثر من نقطة') || s.includes('اكتر من نقطة')) out.add('multi');
        else if (s.includes('حركة')) out.add('haraka');
        else if (s.includes('كلمة تحتاج')) out.add('word');
    });
    return [...out];
}
