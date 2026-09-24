// engine/tajweedRulesCatalog.js
//
// 🌟 [جديد بالكامل] كتالوج بيانات "مسار أبطال التجويد" — المرحلة 1 من خطة البناء المرحلية
// (راجع مستند المشروع "التصور-المعماري-الكامل-لمسار-التجويد.md" §16). نفس فلسفة الفصل
// المعماري المتّبعة في كل المنصة: هذا الملف "محرك بيانات خالص" (بلا أي لمس لـ DOM أو
// IndexedDB)، بنفس مبدأ engine/masteryEngine.js وBADGE_CATALOG في engine/dualTestEngine.js —
// بيانات وصفية بحتة تُستهلَك من شاشات tajweed/*.js لاحقاً.
//
// النطاق المعتمد للنسخة الأولى (٢ مرحلتين فقط): القلقلة، ثم النون الساكنة والتنوين —
// بترتيب "تحفة الأطفال" الكلاسيكي المعتمد (القسم 2 من المستند). باقي المراحل (الميم الساكنة،
// المشدَّدتين، لام أل/الفعل، المدود) مؤجَّلة لمرحلة لاحقة بعد تقييم هاتين المرحلتين.
//
// ⚠️ [افتراض صريح يستحق مراجعة المعلم]: أمثلة الآيات هنا (رقم السورة/رقم الآية) اختيرت من
// أمثلة كلاسيكية معروفة في كتب التجويد (سور قصيرة يحفظها معظم المبتدئين: الإخلاص، الفلق،
// قريش، الزلزلة، الفيل)، فيما عدا مثال الإقلاب (النساء ٤:١٣٤) الذي بُني من الذاكرة بثقة أقل.
// بما أن نص الآية نفسه يُجلَب دائماً من محرك القرآن الفعلي (QuranEngine)، أي خطأ في رقم
// السورة/الآية سيظهر فوراً بصرياً عند التصفح (نص لا يطابق الحكم المطلوب) — يُرجى من المعلم
// مراجعة الأمثلة الستة عند أول تصفح فعلي والتأكد من دقتها قبل الاعتماد عليها تعليمياً، خصوصاً
// مثال الإقلاب. لا حاجة لتعديل الكود لتصحيح أي مثال — فقط تغيير رقمي surah/ayah/highlight هنا.

// 🌟 [جديد — المرحلة 2] كل حكم أضفنا له practiceExample: مثال قرآني ثانٍ (غير مثال التصفّح
// الأساسي "example") يُستخدَم حصرياً في نشاط "تطبيق على آية جديدة" حتى لا يتكرر نفس مثال
// التصفّح الذي حفظه الطالب بالفعل. نفس منهجية الحذر بالمثال الأساسي: اختيرت آيات مشهورة
// جداً وعالية الثقة (سور قصيرة/آيات يحفظها كل مبتدئ)، ونص الآية نفسه يُجلَب دائماً من محرك
// القرآن الفعلي فلا يمكن أن يظهر نص خاطئ بصمت — فقط رقم سورة/آية خاطئ سيُنتج عدم تطابق
// واضح بصرياً عند أول استخدام. ⚠️ حالة خاصة: حكم الإقلاب لم يكن له مثال ثانٍ عالي الثقة
// بسهولة من سور قصيرة مشهورة، فأُعيد استخدام مثال التصفّح الأساسي نفسه مؤقتاً (نفس مثال
// النساء ٤:١٣٤ المُعلَّم أصلاً بثقة أقل) — يُرجى من المعلم تحديدًا مراجعة/استبدال مثال
// الإقلاب (الأساسي والتطبيقي معاً) بمثال يفضّله بمجرد أول استخدام فعلي.
// 🌟 حروف كل حكم — نص عربي خام (بلا مفتاح ترجمة) لأنها رسم عربي ثابت لا يُترجَم بذاته،
// بعكس التعريف والشرح المحيطين بها واللذين يحتاجان مفاتيح tjw_* ثنائية اللغة
export const TAJWEED_STAGES = [
    {
        id: 'qalqalah',
        nameKey: 'tjw_stage_qalqalah_name',
        icon: '💥',
        // 🌟 لكل مرحلة "عائلة لونية" من نفس اللوحة الثلاثية المعتمدة (القسم 10 من المستند) —
        // القلقلة تحديدًا تأخذ اللون المائز (العنّابي/الياقوتي --tjw-accent) بقرار موثَّق مسبقًا
        colorVar: '--tjw-accent',
        rules: [
            {
                id: 'qalqalah_sughra',
                nameKey: 'tjw_rule_qalqalah_sughra_name',
                defKey: 'tjw_rule_qalqalah_sughra_def',
                letters: 'ق ط ب ج د',
                noticeKey: 'tjw_rule_qalqalah_sughra_notice',
                example: { surah: 112, ayah: 1, highlight: 'قُلْ' },
                practiceExample: { surah: 112, ayah: 3, highlight: 'يَلِدْ' }
            },
            {
                id: 'qalqalah_kubra',
                nameKey: 'tjw_rule_qalqalah_kubra_name',
                defKey: 'tjw_rule_qalqalah_kubra_def',
                letters: 'ق ط ب ج د',
                noticeKey: 'tjw_rule_qalqalah_kubra_notice',
                example: { surah: 113, ayah: 1, highlight: 'الْفَلَقِ' },
                practiceExample: { surah: 112, ayah: 4, highlight: 'أَحَدٌ' }
            }
        ]
    },
    {
        id: 'noon_sakinah',
        nameKey: 'tjw_stage_noon_sakinah_name',
        icon: '🔵',
        // 🌟 مرحلة النون الساكنة تأخذ اللون الأساسي (اللازوردي --tjw-primary) بقرار موثَّق
        // مسبقًا في القسم 10 من المستند
        colorVar: '--tjw-primary',
        rules: [
            {
                id: 'izhar',
                nameKey: 'tjw_rule_izhar_name',
                defKey: 'tjw_rule_izhar_def',
                letters: 'ء ه ع ح غ خ',
                noticeKey: 'tjw_rule_izhar_notice',
                example: { surah: 106, ayah: 4, highlight: 'مِّنْ خَوْفٍ' },
                practiceExample: { surah: 1, ayah: 7, highlight: 'أَنْعَمْتَ' }
            },
            {
                id: 'idgham',
                nameKey: 'tjw_rule_idgham_name',
                defKey: 'tjw_rule_idgham_def',
                letters: 'ي ن م و',
                noticeKey: 'tjw_rule_idgham_notice',
                example: { surah: 99, ayah: 7, highlight: 'مَن يَعْمَلْ' },
                practiceExample: { surah: 99, ayah: 8, highlight: 'وَمَن يَعْمَلْ' }
            },
            {
                id: 'iqlab',
                nameKey: 'tjw_rule_iqlab_name',
                defKey: 'tjw_rule_iqlab_def',
                letters: 'ب',
                noticeKey: 'tjw_rule_iqlab_notice',
                example: { surah: 4, ayah: 134, highlight: 'سَمِيعًا بَصِيرًا' },
                // ⚠️ لا يوجد حاليًا مثال ثانٍ عالي الثقة — إعادة استخدام مثال التصفّح نفسه مؤقتًا (راجع الملاحظة أعلى الملف)
                practiceExample: { surah: 4, ayah: 134, highlight: 'سَمِيعًا بَصِيرًا' }
            },
            {
                id: 'ikhfa',
                nameKey: 'tjw_rule_ikhfa_name',
                defKey: 'tjw_rule_ikhfa_def',
                letters: 'ت ث ج د ذ ز س ش ص ض ط ظ ف ق ك',
                noticeKey: 'tjw_rule_ikhfa_notice',
                example: { surah: 105, ayah: 4, highlight: 'مِّن سِجِّيلٍ' },
                practiceExample: { surah: 114, ayah: 4, highlight: 'مِن شَرِّ' }
            }
        ]
    }
];

// 🌟 دوال مساعدة خالصة (بلا DOM) — بنفس فلسفة الدوال المساعدة في masteryEngine.js
export function getTajweedStage(stageId) {
    return TAJWEED_STAGES.find(s => s.id === stageId) || null;
}

export function getTajweedRule(stageId, ruleId) {
    const stage = getTajweedStage(stageId);
    if (!stage) return null;
    return stage.rules.find(r => r.id === ruleId) || null;
}

// 🌟 يُرجع الحكم التالي مباشرة بعد حكم معيّن (داخل نفس المرحلة، أو أول حكم بالمرحلة التالية) —
// ستُستخدَم لاحقًا في المرحلة 3 (الخريطة والتقدّم) لتحديد "أين نكمل" تلقائيًا
export function getNextRule(stageId, ruleId) {
    const stageIdx = TAJWEED_STAGES.findIndex(s => s.id === stageId);
    if (stageIdx === -1) return null;
    const stage = TAJWEED_STAGES[stageIdx];
    const ruleIdx = stage.rules.findIndex(r => r.id === ruleId);
    if (ruleIdx === -1) return null;

    if (ruleIdx + 1 < stage.rules.length) {
        return { stageId: stage.id, ruleId: stage.rules[ruleIdx + 1].id };
    }
    const nextStage = TAJWEED_STAGES[stageIdx + 1];
    if (nextStage && nextStage.rules.length > 0) {
        return { stageId: nextStage.id, ruleId: nextStage.rules[0].id };
    }
    return null; // آخر حكم في آخر مرحلة متاحة حاليًا
}

// 🌟 [جديد — المرحلة 3] كل الأحكام مسطّحة في مصفوفة واحدة {stageId, rule} — يُستخدَم في
// حساب تقدّم الطالب الإجمالي وبوابة المراجعة بدل تكرار حلقتين متداخلتين في كل مكان
export function getAllRulesFlat() {
    const flat = [];
    TAJWEED_STAGES.forEach(stage => {
        stage.rules.forEach(rule => flat.push({ stageId: stage.id, rule }));
    });
    return flat;
}

// 🌟 [جديد — المرحلة 3] مصفوفة معرّفات أحكام مرحلة معيّنة فقط — تسهّل حساب "هل اكتملت
// هذه المرحلة؟" في tajweedEngine.js
export function getStageRuleIds(stageId) {
    const stage = getTajweedStage(stageId);
    return stage ? stage.rules.map(r => r.id) : [];
}

// 🌟 [جديد — المرحلة 3] أول مرحلة في الكتالوج (بوابة الدخول دائماً غير مقفلة) — يُستخدَم
// كنقطة بداية افتراضية عند إنشاء تقدّم جديد لطالب لم يبدأ بعد
export function getFirstStageId() {
    return TAJWEED_STAGES.length > 0 ? TAJWEED_STAGES[0].id : null;
}
