// engine/tajweedRulesCatalog.js
//
// 🌟 [جديد بالكامل] كتالوج بيانات "مسار أبطال التجويد" — المرحلة 1 من خطة البناء المرحلية
// (راجع مستند المشروع "التصور-المعماري-الكامل-لمسار-التجويد.md" §16). نفس فلسفة الفصل
// المعماري المتّبعة في كل المنصة: هذا الملف "محرك بيانات خالص" (بلا أي لمس لـ DOM أو
// IndexedDB)، بنفس مبدأ engine/masteryEngine.js وBADGE_CATALOG في engine/dualTestEngine.js —
// بيانات وصفية بحتة تُستهلَك من شاشات tajweed/*.js لاحقاً.
//
// 🌟🌟 [تحديث ٢٨ سبتمبر — تعميق المحتوى من كتاب مرجعي] بناءً على طلب صريح من المعلم ("الشغل
// الحالي ضعيف والمادة العلمية ضعيفة جداً")، رُفع كتاب "فتوحات الرحمن في تيسير تجويد القرآن"
// (الجزء الأول، ٤٨ صفحة) وطُلب العمل حصرياً منه. راجع مستند المشروع
// "تعميق-مادة-وتقييم-أبطال-التجويد-المقترح.md" للتشخيص الكامل وقرارات المعلم. هذا الكتاب
// يغطي حصراً: (١) غنة الميم والنون المشدَّدتين، (٢) أحكام الميم الساكنة الثلاثة، (٣) أحكام
// النون الساكنة والتنوين الأربعة — ولا يذكر القلقلة إطلاقاً (الكتاب نفسه يشرح في مقدمته
// سبب بدئه بالميم الساكنة قبل النون الساكنة: سهولة التفريق بين الإدغام/الإخفاء/الإظهار
// بلا مصطلح، ثم يسهل فهم الإقلاب لاحقاً بعد معرفة أحكام الميم الساكنة أولاً).
//
// ⚠️ [قرار صريح من المعلم عند السؤال]: القلقلة (غير مذكورة بالكتاب) تبقى المرحلة الأولى كما
// كانت، ثم تُضاف مرحلتا "غنة الميم والنون المشدَّدتين" و"الميم الساكنة" الجديدتان من الكتاب،
// ثم "النون الساكنة" (المرحلة الموجودة أصلاً، مُعمَّقة الآن ومُقسَّمة الإدغام فيها لنوعين
// منفصلين بدل حكم واحد — راجع الملاحظة عند noon_sakinah أدناه). الترتيب الداخلي بين
// المرحلتين الجديدتين (مشدَّدتين ← ميم ساكنة) اتُّخذ افتراضاً صريحاً غير مسؤول عنه المعلم
// مباشرة: يطابق ترتيب الكتاب نفسه صفحة بصفحة (المشدَّدتين ص٤-٥ قبل الميم الساكنة ص٦)،
// وهو أيضاً الأبسط تدريجياً (غنة الحرف المشدَّد وحده، مفهوم واحد بلا تفريق بين حالات، قبل
// الانتقال لثلاث حالات مختلفة للميم الساكنة) — قابل للتغيير فوراً لو فضّل المعلم ترتيباً آخر.
//
// ⚠️ [أثر جانبي صريح يستحق انتباه المعلم]: إقحام مرحلتين جديدتين بين القلقلة والنون الساكنة
// يعني أن أي طالب كان بالفعل قد بدأ/أتقن مرحلة النون الساكنة سابقاً (تحت الترتيب القديم:
// قلقلة ← نون ساكنة مباشرة) سيجدها الآن "مُقفلة" مجدداً حتى يُتمّ المرحلتين الجديدتين أولاً —
// لأن isStageUnlocked (tajweedEngine.js) يعتمد على ترتيب المصفوفة لا على مؤشر محفوظ. بما أن
// الميزة لا تزال "قيد التطوير" (لم تُطلَق فعلياً لطلاب حقيقيين بعد حسب حالة الشارة على
// الشاشة الرئيسية)، هذا على الأرجح غير مؤثر عملياً الآن — لكن يستحق تنبيه المعلم صراحة.
//
// ⚠️ [افتراض صريح يستحق مراجعة المعلم — دقة الأمثلة القرآنية]: كل الأمثلة أدناه (سورة/آية)
// اختيرت يدوياً من الذاكرة بحرص شديد نظراً لحساسية دقة النص القرآني، مع تفضيل قوي للسور
// والآيات الأكثر شهرة وحفظاً (الفيل، الفاتحة، الكوثر، النبأ، أوائل البقرة، الملك) لرفع
// الثقة قدر الإمكان. أُشير صراحة بجانب كل مثال لمستوى الثقة (عالية جداً / عالية-متوسطة)،
// والأمثلة متوسطة الثقة تحديداً تستحق تأكيد المعلم عند أول تصفّح فعلي. بما أن نص الآية نفسه
// يُجلَب دائماً من محرك القرآن الفعلي (QuranEngine)، أي خطأ في رقم السورة/الآية سيظهر فوراً
// بصرياً (نص لا يطابق الحكم المطلوب أو تظليل لا يجد الكلمة) — لا حاجة لتعديل الكود لتصحيح
// أي مثال، فقط تغيير رقمي surah/ayah/highlight هنا مباشرة.
//
// 🌟 [جديد] حقلان إضافيان لكل حكم من حقول الكتاب (makhrajNote وcommonMistakes) — عمق تعليمي
// حقيقي غائب كلياً عن النسخة السابقة (كانت defKey جملة واحدة بلا وصف نطق ولا أخطاء شائعة).
// كلاهما نص عربي خام حالياً (لا مفتاح ترجمة بعد) — [افتراض صريح]: أُبقيا بالعربي فقط مؤقتاً
// لأنهما حقول عرض تفصيلي جديدة لم تُستهلَك من أي شاشة UI بعد (لا tajweed-activity.js ولا
// tajweed-map.js يقرآنهما حالياً)، فتأجيل ترجمتهما لحين ربطهما فعلياً بشاشة تستخدمهما أوفر
// من ترجمة نص قد يتغيّر شكله عند الربط الفعلي — يُرجى مراجعة المعلم لهذا الافتراض تحديداً.

// 🌟🌟 [توسيع أكتوبر ٢٠٢٦ — أحكام متن تحفة الأطفال كاملة] أُضيفت أربع مراحل بعد مراحل الكتاب الأول
// لتغطّي كل أبواب المتن (docs/تحفة الاطفال.pdf، فهرسه: النون الساكنة والتنوين، الميم والنون المشددتان،
// الميم الساكنة، لام «ال» ولام الفعل، المثلان والمتقاربان والمتجانسان، أقسام المد، أحكام المد، أقسام
// المد اللازم): «لام ال ولام الفعل» ← «المثلان والمتقاربان والمتجانسان» ← «أقسام المد وأحكامه»
// ← «أقسام المد اللازم». القلقلة ليست من المتن وتبقى مرحلة إضافية بقرار المعلم. الأبواب الأربعة الأولى
// من الكتاب المرجعي (فتوحات الرحمن)، والأربعة الجديدة من المتن نفسه + معرفة تجويد عامة — فنصوص
// تعريفاتها ومقادير المد (خصوصاً المنفصل والعارض) تستحق مراجعة المعلم قبل الاعتماد.
// أمثلة المراحل الجديدة نُسخت كلماتها من مصحف تنزيل المحلي (database/quran-uthmani.json) ويفحصها
// tests/tajweedCatalog.test.mjs آلياً (وجود الكلمة، وتوليد سؤال «اكتشف» لكل مثال).
// حقول اختيارية جديدة: glyph (رمز بطاقة الحكم بدل أول حرف)، promptLetters (نص بديل في سؤال «اختر
// الحكم» لفكّ التباس حكمين لهما الحروف نفسها)، وفي المثال: firstOnly (تظليل أول مطابقة فقط، لحروف
// الفواتح المفردة) وskipQuestion (للعرض فقط، حين تحوي الآية كلمات أخرى تصلح جواباً).

// 🌟 [جديد — المرحلة 2] كل حكم أضفنا له practiceExample: مثال قرآني ثانٍ (غير مثال التصفّح
// الأساسي "example") يُستخدَم حصرياً في نشاط "تطبيق على آية جديدة" حتى لا يتكرر نفس مثال
// التصفّح الذي حفظه الطالب بالفعل.
// 🌟 حروف كل حكم — نص عربي خام (بلا مفتاح ترجمة) لأنها رسم عربي ثابت لا يُترجَم بذاته،
// بعكس التعريف والشرح المحيطين بها واللذين يحتاجان مفاتيح tjw_* ثنائية اللغة
// 🌟🌟 [مرحلة جديدة — 2026-10-21] «تعرّف على مصحفك» هي المرحلة الأولى قبل القلقلة (بطلب المعلم): يتعرّف الطالب على كل ما في المصحف
// خلاف الآيات: رقم الآية (في نهايتها لا في أولها)، لوحة اسم السورة ورأس الصفحة، فانوس الجزء والحزب والربع، علامات الوقف، السكون
// والحروف الصامتة، المدّ والحروف الصغيرة، السين مكان الصاد، علامات السجدة. أحكامها «دروس» بلا حروف ولا أمثلة آيات ثابتة (الحقل mushaf):
// أسئلتها تُولَّد من آيات حفظ الطالب (أو أقرب نطاق إليه) في engine/tajweedMushaf.js، وتعريفاتها من «علامات الوقف ومصطلحات الضبط» في
// المصحف المطبوع. لا حقول example/letters لها: كل كود يمرّ بالأحكام يتخطّاها عبر isMushafRule.
const MUSHAF_STAGE = {
    id: 'know_mushaf',
    nameKey: 'tjw_stage_know_mushaf_name',
    icon: '📖',
    colorVar: '--tjw-mushaf',
    mushaf: true,
    rules: [
        { id: 'mushaf_ayah_number', nameKey: 'tjw_rule_mushaf_ayah_number_name', defKey: 'tjw_rule_mushaf_ayah_number_def', noticeKey: 'tjw_rule_mushaf_ayah_number_notice', letters: '', glyph: '١', mushaf: { lesson: 'ayah_number' } },
        { id: 'mushaf_juz_hizb', nameKey: 'tjw_rule_mushaf_juz_hizb_name', defKey: 'tjw_rule_mushaf_juz_hizb_def', noticeKey: 'tjw_rule_mushaf_juz_hizb_notice', letters: '', glyph: '۞', mushaf: { lesson: 'juz_hizb' } },
        { id: 'mushaf_waqf', nameKey: 'tjw_rule_mushaf_waqf_name', defKey: 'tjw_rule_mushaf_waqf_def', noticeKey: 'tjw_rule_mushaf_waqf_notice', letters: '', glyph: 'ـۚـ', mushaf: { lesson: 'waqf' } },
        { id: 'mushaf_silent_sukun', nameKey: 'tjw_rule_mushaf_silent_sukun_name', defKey: 'tjw_rule_mushaf_silent_sukun_def', noticeKey: 'tjw_rule_mushaf_silent_sukun_notice', letters: '', glyph: 'ـۡـ', mushaf: { lesson: 'silent_sukun' } },
        { id: 'mushaf_madd_letters', nameKey: 'tjw_rule_mushaf_madd_letters_name', defKey: 'tjw_rule_mushaf_madd_letters_def', noticeKey: 'tjw_rule_mushaf_madd_letters_notice', letters: '', glyph: 'ـٰـ', mushaf: { lesson: 'madd_letters' } },
        { id: 'mushaf_sin_saad', nameKey: 'tjw_rule_mushaf_sin_saad_name', defKey: 'tjw_rule_mushaf_sin_saad_def', noticeKey: 'tjw_rule_mushaf_sin_saad_notice', letters: '', glyph: 'ـۜـ', mushaf: { lesson: 'sin_saad' } },
        { id: 'mushaf_sajda', nameKey: 'tjw_rule_mushaf_sajda_name', defKey: 'tjw_rule_mushaf_sajda_def', noticeKey: 'tjw_rule_mushaf_sajda_notice', letters: '', glyph: '۩', mushaf: { lesson: 'sajda' } }
    ]
};

export const TAJWEED_STAGES = [
    MUSHAF_STAGE,
    {
        id: 'qalqalah',
        nameKey: 'tjw_stage_qalqalah_name',
        icon: '💥',
        // 🌟 لكل مرحلة "عائلة لونية" من نفس اللوحة الثلاثية المعتمدة (القسم 10 من المستند) —
        // القلقلة تحديدًا تأخذ اللون المائز (العنّابي/الياقوتي --tjw-accent) بقرار موثَّق مسبقًا
        colorVar: '--tjw-accent',
        // 🌟🌟 [تعديل ٢٨ سبتمبر — بطلب صريح من المعلم] القلقلة الصغرى والكبرى كانتا حكمين
        // منفصلين لهما نفس حروف "قطب جد" بالضبط — وهذا كان يكسر نوعي نشاط "اختر الحكم"
        // و"اربط الحكم بحروفه" (كلاهما يُميِّز بين الأحكام عبر حروفها فقط)، لأن الحكمين
        // بحروف متطابقة تماماً يجعل أي سؤال "أي حكم له هذه الحروف؟" بلا إجابة صحيحة واحدة
        // فعلياً. الفرق الحقيقي بين الصغرى والكبرى ليس الحروف بل الموضع (وسط الكلمة مقابل
        // الوقف على آخرها) — لذا دُمجا في حكم واحد "قلقلة"، مع الحفاظ على شرح الحالتين معاً
        // داخل نص التعريف/الملاحظة (tjw_rule_qalqalah_def / notice) حتى لا يُفقَد أي محتوى
        // تعليمي. مثال التصفّح (example) يوضّح حالة الصغرى (وسط الكلمة، بلا وقف)، ومثال
        // التطبيق (practiceExample) يوضّح حالة الكبرى (نهاية الكلمة عند الوقف) — فيبقى
        // الطالب معرَّضاً للحالتين معاً عبر نشاطي "اكتشف الحكم" و"طبّق على آية جديدة".
        rules: [
            {
                id: 'qalqalah',
                nameKey: 'tjw_rule_qalqalah_name',
                defKey: 'tjw_rule_qalqalah_def',
                letters: 'ق ط ب ج د',
                noticeKey: 'tjw_rule_qalqalah_notice',
                // 🌟 [افتراض صريح — معرفة تجويد عامة راسخة، ليست من الكتاب المرجعي (القلقلة
                // غير مذكورة به إطلاقاً)]: مخرج القلقلة وأشهر خطأ شائع عند الأطفال، تُستخدَم
                // كمعايير جاهزة لبوّابة "سمّع لي" — يُرجى مراجعة المعلم لدقتها تحديداً.
                makhrajNote: 'حرف القلقلة الساكن يُنطق بضغط ثم انفتاح مفاجئ يُحدِث "نبرة" أو ارتداداً صوتياً خفيفاً — وليس حركة كاملة (ليس فتحة ولا ضمة ولا كسرة)',
                commonMistakes: 'الخطأ الأشيع عند الأطفال: تحويل القلقلة لحركة كاملة (مثلاً نطق الساكن كأنه مفتوح)، أو العكس: إهمال الارتداد تماماً والوقوف على الحرف ساكناً بلا أي نبرة، خصوصاً في القلقلة الكبرى عند الوقف',
                // 🌟 [إصلاح تدقيق ما قبل الإطلاق] المثال القديم (112:1 «قُلْ») لا قلقلة فيه أصلاً (اللام ليست من حروف قطب جد)، واستُبدل بـ«يَلِدْ» في
                // 112:3 «لَمْ يَلِدْ وَلَمْ يُولَدْ»: الدال ساكنة في وسط الكلام بلا وقف = قلقلة صغرى، وهو ما يصفه التعليق أعلاه لهذا المثال 🌟
                example: { surah: 112, ayah: 3, highlight: 'يَلِدْ' },
                practiceExample: { surah: 113, ayah: 1, highlight: 'الْفَلَقِ' }
            }
        ]
    },
    {
        // 🌟🌟 [مرحلة جديدة بالكامل — من كتاب "فتوحات الرحمن"، أول موضوع فعلياً في الكتاب ص٤-٥]
        // غنة الميم والنون المشدَّدتين: حكم واحد بسيط (بلا تفريق حالات) يمهّد لفهم "الغنة"
        // نفسها قبل أحكام الإدغام/الإخفاء الأكثر تعقيداً — بالضبط كما رتّبه الكتاب.
        id: 'meem_noon_mushaddadah',
        nameKey: 'tjw_stage_meem_noon_mushaddadah_name',
        icon: '🎵',
        // 🌟 [افتراض صريح]: لا لون مخصَّص لهذه المرحلة في مقترح الهوية البصرية الأصلي (القسم 10
        // من المستند المعماري — خصّص فقط القلقلة/النون الساكنة/الميم الساكنة). استُخدم
        // --tjw-primary-light (نفس عائلة اللازوردي، درجة أفتح) بدل ابتكار لون جديد تماماً،
        // بما أن الغنة مفهوم "تأسيسي" يخدم فهم أحكام النون الساكنة لاحقاً — قابل للتغيير.
        colorVar: '--tjw-primary-light',
        rules: [
            {
                id: 'ghunna_wajiba',
                nameKey: 'tjw_rule_ghunna_wajiba_name',
                defKey: 'tjw_rule_ghunna_wajiba_def',
                // 🌟 هنا "letters" تمثّل الحرف المشدَّد نفسه (الميم/النون) وليس حروفاً تُسبِّب
                // الحكم — نفس المفهوم لكن بمعنى مختلف قليلاً عن بقية الأحكام، توضيحاً للمعلم
                letters: 'مّ نّ',
                noticeKey: 'tjw_rule_ghunna_wajiba_notice',
                makhrajNote: 'الغنة صوت يخرج من الخيشوم (الأنف) لا من الفم، بمقدار حركتين (زمن قبض إصبعين أو بسطهما تقريباً) — استمر بصوت الميم أو النون المشدَّدة حتى تحس بالرنين في أنفك لا في فمك.',
                commonMistakes: 'أشيع خطأ عند الأطفال: تقصير الغنة لأقل من حركتين (نطق سريع يشبه الحرف العادي غير المشدَّد)، أو العكس: مطّها أطول من اللازم فتشبه المد.',
                // مثال أساسي: عالي الثقة جداً — سورة النبأ (جزء عمّ، مشهورة جداً)
                example: { surah: 78, ayah: 1, highlight: 'عَمَّ' },
                // مثال تطبيقي: عالي الثقة جداً — سورة الكوثر (من أقصر وأشهر سور القرآن)
                practiceExample: { surah: 108, ayah: 1, highlight: 'إِنَّا' }
            }
        ]
    },
    {
        // 🌟🌟 [مرحلة جديدة بالكامل — من كتاب "فتوحات الرحمن" ص٦-١٥] أحكام الميم الساكنة
        // الثلاثة — الكتاب يبدأ بها قبل النون الساكنة صراحة (راجع مقدمة الكتاب ص٣: أسهل على
        // الطفل لأنها بلا تعقيد "الإدغام بغنة/بغير غنة" الموجود بالنون الساكنة، وتُسهّل فهم
        // الإقلاب لاحقاً).
        id: 'meem_sakinah',
        nameKey: 'tjw_stage_meem_sakinah_name',
        icon: '🟠',
        // 🌟 عائلة الأحكام الشفوية (الميم الساكنة) تأخذ اللون الثانوي (النحاسي الدافئ
        // --tjw-secondary) بقرار موثَّق مسبقًا في القسم 10 من المستند المعماري
        colorVar: '--tjw-secondary',
        rules: [
            {
                id: 'ikhfa_shafawi',
                nameKey: 'tjw_rule_ikhfa_shafawi_name',
                defKey: 'tjw_rule_ikhfa_shafawi_def',
                letters: 'ب',
                promptLetters: 'م ساكنة + ب',
                noticeKey: 'tjw_rule_ikhfa_shafawi_notice',
                makhrajNote: 'الشفتان تُخفيان انطباقهما التام (لا إظهار كامل ولا إدغام كامل) مع غنة بمقدار حركتين — حالة وسط تماماً بين الإظهار والإدغام.',
                commonMistakes: 'أشيع خطأ: تحويلها لإدغام كامل (دمج الميم في الباء تماماً)، أو العكس: إظهار الميم بوضوح تام بلا أي غنة مخفاة.',
                // مثال أساسي: عالي الثقة جداً — سورة الفيل (قصيرة، محفوظة لكل مبتدئ)
                example: { surah: 105, ayah: 4, highlight: 'تَرْمِيهِم بِحِجَارَةٍ' },
                // مثال تطبيقي: ثقة عالية-متوسطة (سورة الملك، مشهورة ومتداولة لكن أطول من سور جزء عمّ) — يُستحسن تأكيد المعلم
                practiceExample: { surah: 67, ayah: 12, highlight: 'رَبَّهُم بِالْغَيْبِ' },
                // أمثلة إضافية من كتب «فتوحات الرحمن» و«التجويد بشكل جديد» لتنويع أسئلة الاختبار — تفحصها آلياً اختبارات الكتالوج وجدول التوسيم
                extraExamples: [
                    { surah: 57, ayah: 12, highlight: 'نُورُهُم بَيْنَ' },
                    { surah: 43, ayah: 8, highlight: 'مِنْهُم بَطْشًۭا' },
                    { surah: 39, ayah: 10, highlight: 'أَجْرَهُم بِغَيْرِ' },
                    { surah: 21, ayah: 40, highlight: 'تَأْتِيهِم بَغْتَةًۭ' },
                    { surah: 24, ayah: 61, highlight: 'دَخَلْتُم بُيُوتًۭا' }
                ]
            },
            {
                id: 'idgham_shafawi',
                nameKey: 'tjw_rule_idgham_shafawi_name',
                defKey: 'tjw_rule_idgham_shafawi_def',
                letters: 'م',
                noticeKey: 'tjw_rule_idgham_shafawi_notice',
                makhrajNote: 'الميمان تندمجان في ميم واحدة مشدَّدة بغنة كاملة بمقدار حركتين — نفس حكم الغنة الواجبة (المرحلة السابقة) لكن سببها هنا التقاء ميمين لا التشديد المكتوب.',
                commonMistakes: 'أشيع خطأ: نطق الميمين منفصلتين بدل دمجهما في ميم واحدة، أو تقصير مدة الغنة عن حركتين.',
                // مثال أساسي: ثقة عالية-متوسطة — سورة الملك، نفس آية ikhfa_shafawi أعلاه لكن بموضع مختلف ("لَهُم مَّغْفِرَةٌ") — يُستحسن تأكيد المعلم
                example: { surah: 67, ayah: 12, highlight: 'لَهُم مَّغْفِرَةٌ' },
                // مثال تطبيقي: ثقة متوسطة (سورة البقرة، آية مشهورة جداً لكنها ليست من قصار السور) — يُستحسن تأكيد المعلم بعناية خاصة هنا
                practiceExample: { surah: 2, ayah: 29, highlight: 'لَكُم مَّا' },
                // أمثلة إضافية من كتب «فتوحات الرحمن» و«التجويد بشكل جديد» لتنويع أسئلة الاختبار — تفحصها آلياً اختبارات الكتالوج وجدول التوسيم
                extraExamples: [
                    { surah: 106, ayah: 4, highlight: 'أَطْعَمَهُم مِّن' },
                    { surah: 2, ayah: 10, highlight: 'قُلُوبِهِم مَّرَضٌۭ' },
                    { surah: 76, ayah: 22, highlight: 'سَعْيُكُم مَّشْكُورًا' },
                    { surah: 83, ayah: 4, highlight: 'أَنَّهُم مَّبْعُوثُونَ' },
                    { surah: 5, ayah: 9, highlight: 'لَهُم مَّغْفِرَةٌۭ' }
                ]
            },
            {
                id: 'izhar_shafawi',
                nameKey: 'tjw_rule_izhar_shafawi_name',
                defKey: 'tjw_rule_izhar_shafawi_def',
                letters: 'كل الحروف عدا الباء والميم',
                noticeKey: 'tjw_rule_izhar_shafawi_notice',
                makhrajNote: 'إطباق الشفتين على الميم الساكنة بوضوح تام من مخرجها من غير أي غنة زائدة — أوضح أحكام الميم الساكنة الثلاثة نطقاً.',
                commonMistakes: 'أشيع خطأ عند الأطفال تحديداً قبل حرفي الفاء والواو (قريبَي مخرج من الباء): إضافة غنة خفيفة بالخطأ وكأنها إخفاء شفوي رغم أن الحكم إظهار تام.',
                // مثال أساسي: عالي الثقة جداً — سورة الفاتحة (أشهر آية في القرآن على الإطلاق)
                example: { surah: 105, ayah: 1, highlight: 'أَلَمۡ تَرَ' },
                // مثال تطبيقي: عالي الثقة جداً — سورة الفيل، نفس السورة المستخدمة أعلاه بموضع مختلف
                practiceExample: { surah: 106, ayah: 2, highlight: 'إِۦلَٰفِهِمۡ رِحۡلَةَ' },
                // أمثلة إضافية من كتب «فتوحات الرحمن» و«التجويد بشكل جديد» لتنويع أسئلة الاختبار — تفحصها آلياً اختبارات الكتالوج وجدول التوسيم
                extraExamples: [
                    { surah: 105, ayah: 2, highlight: 'أَلَمْ يَجْعَلْ' },
                    { surah: 112, ayah: 3, highlight: 'لَمْ يَلِدْ' },
                    { surah: 2, ayah: 38, highlight: 'هُمْ يَحْزَنُونَ' },
                    { surah: 23, ayah: 2, highlight: 'هُمْ فِى صَلَاتِهِمْ' },
                    { surah: 18, ayah: 21, highlight: 'رَّبُّهُمْ أَعْلَمُ' },
                    { surah: 10, ayah: 105, highlight: 'أَقِمْ وَجْهَكَ' }
                ]
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
                makhrajNote: 'النون الساكنة تُنطق من مخرجها الطبيعي (طرف اللسان) واضحة تماماً بلا غنة زائدة عن غنتها الطبيعية الخفيفة — لأن حروف الحلق الستة بعيدة المخرج عن النون فلا تؤثر فيها.',
                commonMistakes: 'أشيع خطأ: إضافة غنة زائدة بالخطأ (كأنها إخفاء) خصوصاً قبل حرفي الغين والخاء تحديداً لقربهما نسبياً من وسط الفم.',
                example: { surah: 106, ayah: 4, highlight: 'مِّنْ خَوْفٍ' },
                practiceExample: { surah: 1, ayah: 7, highlight: 'أَنْعَمْتَ' },
                // أمثلة إضافية من كتب «فتوحات الرحمن» و«التجويد بشكل جديد» لتنويع أسئلة الاختبار — تفحصها آلياً اختبارات الكتالوج وجدول التوسيم
                extraExamples: [
                    { surah: 20, ayah: 124, highlight: 'وَمَنْ أَعْرَضَ' },
                    { surah: 10, ayah: 27, highlight: 'مِنْ عَاصِمٍۢ' },
                    { surah: 69, ayah: 36, highlight: 'مِنْ غِسْلِينٍۢ' },
                    { surah: 108, ayah: 2, highlight: 'وَٱنْحَرْ' },
                    { surah: 87, ayah: 5, highlight: 'غُثَآءً أَحْوَىٰ' },
                    { surah: 13, ayah: 7, highlight: 'قَوْمٍ هَادٍ' },
                    { surah: 57, ayah: 3, highlight: 'شَىْءٍ عَلِيمٌ' },
                    { surah: 99, ayah: 7, highlight: 'ذَرَّةٍ خَيْرًۭا' },
                    { surah: 106, ayah: 4, highlight: 'مِّنْ خَوْفٍۭ' },
                    { surah: 102, ayah: 8, highlight: 'يَوْمَئِذٍ عَنِ' }
                ]
            },
            {
                // 🌟🌟 [تقسيم صريح] الكتاب (ص٢٤-٢٩ مقابل ص٣٠-٣٥) يُفرِد للإدغام بغنة والإدغام
                // بغير غنة درسين منفصلين تماماً (علامة ضبط مختلفة، حروف مختلفة، تدريبات
                // منفصلة) بدل حكم "إدغام" واحد كما كانت النسخة السابقة من هذا الكتالوج —
                // اتُّبع تقسيم الكتاب حرفياً هنا لأنه أدق تعليمياً (الفرق بين النوعين جوهري:
                // وجود الغنة أو غيابها، لا مجرد تفصيل ثانوي). مُعرِّف 'idgham' القديم لم يعد
                // موجوداً — [افتراض صريح آمن]: لا بيانات طلاب حقيقية تشير إليه بعد (الميزة لا
                // تزال بشارة "قيد التطوير" على الشاشة الرئيسية)، فلا حاجة لحفظ توافق رجعي هنا.
                id: 'idgham_bighunnah',
                nameKey: 'tjw_rule_idgham_bighunnah_name',
                defKey: 'tjw_rule_idgham_bighunnah_def',
                letters: 'ي ن م و',
                noticeKey: 'tjw_rule_idgham_bighunnah_notice',
                makhrajNote: 'النون الساكنة أو التنوين يندمجان تماماً في الحرف التالي (من حروف "ينمو") مع بقاء غنة كاملة بمقدار حركتين أثناء الاندماج.',
                commonMistakes: 'أشيع خطأ: إسقاط الغنة تماماً وكأنه إدغام بغير غنة، أو نطق النون منفصلة قبل الحرف التالي بدل اندماجها الكامل فيه.',
                example: { surah: 99, ayah: 7, highlight: 'مَن يَعْمَلْ' },
                practiceExample: { surah: 99, ayah: 8, highlight: 'وَمَن يَعْمَلْ' }
            },
            {
                id: 'idgham_bila_ghunnah',
                nameKey: 'tjw_rule_idgham_bila_ghunnah_name',
                defKey: 'tjw_rule_idgham_bila_ghunnah_def',
                letters: 'ل ر',
                noticeKey: 'tjw_rule_idgham_bila_ghunnah_notice',
                makhrajNote: 'النون الساكنة أو التنوين يندمجان تماماً في اللام أو الراء التالية بلا أي غنة إطلاقاً — اندماج كامل وسريع، على عكس النوع السابق.',
                commonMistakes: 'أشيع خطأ: إبقاء أثر غنة خفيف بالخطأ (خلط مع الإدغام بغنة)، وهذا هو الفارق الجوهري الذي يجب أن يميّزه الطالب بوضوح بين الحكمين.',
                // مثال أساسي: عالي الثقة جداً — أول آيتين من سورة البقرة بعد الحروف المقطّعة، من أشهر آيات القرآن على الإطلاق
                example: { surah: 2, ayah: 2, highlight: 'هُدًى لِّلْمُتَّقِينَ' },
                practiceExample: { surah: 2, ayah: 5, highlight: 'مِّن رَّبِّهِمْ' }
            },
            {
                id: 'iqlab',
                nameKey: 'tjw_rule_iqlab_name',
                defKey: 'tjw_rule_iqlab_def',
                letters: 'ب',
                promptLetters: 'ن ساكنة أو تنوين + ب',
                noticeKey: 'tjw_rule_iqlab_notice',
                makhrajNote: 'النون الساكنة أو التنوين يتحوّلان فعلياً لصوت ميم مخفاة (بغنة) قبل نطق الباء — تحوّل حقيقي في الصوت وليس مجرد إخفاء.',
                commonMistakes: 'أشيع خطأ: نطق النون الأصلية دون تحويلها لميم، أو نسيان علامة الميم الصغيرة فوق النون عند الكتابة بخط اليد.',
                // مثال أساسي وتطبيقي معاً: ثقة عالية-متوسطة (سورة الملك، آية متتالية لأمثلة الميم الساكنة أعلاه) — [افتراض صريح
                // مُبقًى من النسخة السابقة] لا يوجد بعد مثال ثانٍ منفصل عالي الثقة من سورة مختلفة، يُستحسن أن يضيف المعلم واحداً لاحقاً
                example: { surah: 67, ayah: 13, highlight: 'عَلِيمٌۢ بِذَاتِ' },
                practiceExample: { surah: 67, ayah: 13, highlight: 'عَلِيمٌۢ بِذَاتِ' }
            },
            {
                id: 'ikhfa',
                nameKey: 'tjw_rule_ikhfa_name',
                defKey: 'tjw_rule_ikhfa_def',
                makhrajNote: 'حالة وسط تماماً بين الإظهار والإدغام: النون الساكنة أو التنوين تُخفَيان بغنة بمقدار حركتين بلا إدغام كامل وبلا إظهار كامل — أدق أحكام النون الساكنة نطقاً ويحتاج تدريباً أطول من الطفل.',
                commonMistakes: 'أشيع خطأ: الميل لأحد طرفَي الحكم بالكامل (إظهار واضح جداً أو إدغام كامل) بدل الحالة الوسطى الدقيقة، خصوصاً مع الحروف الخمسة عشر الكثيرة.',
                letters: 'ت ث ج د ذ ز س ش ص ض ط ظ ف ق ك',
                noticeKey: 'tjw_rule_ikhfa_notice',
                example: { surah: 105, ayah: 4, highlight: 'مِّن سِجِّيلٍ' },
                practiceExample: { surah: 114, ayah: 4, highlight: 'مِن شَرِّ' }
            }
        ]
    },
    {
        id: 'lam_al',
        nameKey: 'tjw_stage_lam_al_name',
        icon: '🌙',
        colorVar: '--tjw-lam',
        rules: [
            {
                id: 'izhar_qamari',
                nameKey: 'tjw_rule_izhar_qamari_name',
                defKey: 'tjw_rule_izhar_qamari_def',
                letters: 'ا ب غ ح ج ك و خ ف ع ق ي م ه',
                glyph: 'ق',
                noticeKey: 'tjw_rule_izhar_qamari_notice',
                makhrajNote: 'اللام الساكنة تخرج من طرف اللسان مع ما يحاذيه من اللثة العليا، وتُنطق واضحة كاملة قبل الحروف الأربعة عشر.',
                commonMistakes: 'أشيع خطأ: إدغام اللام في الحرف التالي كأنها شمسية، أو إسقاطها عند الوصل.',
                example: { surah: 108, ayah: 1, highlight: 'ٱلۡكَوۡثَرَ' },
                practiceExample: { surah: 101, ayah: 3, highlight: 'ٱلۡقَارِعَةُ' }
            },
            {
                id: 'idgham_shamsi',
                nameKey: 'tjw_rule_idgham_shamsi_name',
                defKey: 'tjw_rule_idgham_shamsi_def',
                letters: 'ط ث ص ر ت ض ذ ن د س ظ ز ش ل',
                glyph: 'ش',
                noticeKey: 'tjw_rule_idgham_shamsi_notice',
                makhrajNote: 'لا تُنطق اللام، ويُنطق الحرف بعدها مشدَّداً كأنه حرف واحد (الشين المشددة في «الشَّمْس»).',
                commonMistakes: 'أشيع خطأ: نطق اللام واضحة قبل الحرف الشمسي كأنها قمرية (مثل «ألشمس» بدل «الشَّمس»).',
                example: { surah: 91, ayah: 1, highlight: 'وَٱلشَّمۡسِ' },
                practiceExample: { surah: 114, ayah: 1, highlight: 'ٱلنَّاسِ' }
            },
            {
                id: 'izhar_lam_fil',
                nameKey: 'tjw_rule_izhar_lam_fil_name',
                defKey: 'tjw_rule_izhar_lam_fil_def',
                letters: 'لام في الفعل',
                glyph: 'لف',
                noticeKey: 'tjw_rule_izhar_lam_fil_notice',
                makhrajNote: 'اللام الأصلية في الفعل تُنطق واضحة دائماً مهما جاء بعدها، حتى عند التقائها بحرف من حروف الإدغام كالنون في «قُلْ نَعَمْ» والتاء في «الْتَقَى».',
                commonMistakes: 'أشيع خطأ: إدغام اللام فيما بعدها كأنها لام «ال» الشمسية.',
                example: { surah: 112, ayah: 1, highlight: 'قُلۡ' },
                practiceExample: { surah: 54, ayah: 12, highlight: 'فَٱلۡتَقَى' },
                // أمثلة إضافية لاختبار الحكم (آياتها قليلة فلا تكفي مثالان لـ5 أسئلة) — مفحوصة آلياً
                extraExamples: [
                    { surah: 114, ayah: 1, highlight: 'قُلۡ' },
                    { surah: 113, ayah: 1, highlight: 'قُلۡ' },
                    { surah: 109, ayah: 1, highlight: 'قُلۡ' }
                ]
            }
        ]
    },
    {
        id: 'mithlain',
        nameKey: 'tjw_stage_mithlain_name',
        icon: '🔗',
        colorVar: '--tjw-mithlain',
        rules: [
            {
                id: 'mithlain',
                nameKey: 'tjw_rule_mithlain_name',
                defKey: 'tjw_rule_mithlain_def',
                letters: 'حرفان متفقان في المخرج والصفة',
                glyph: 'مث',
                noticeKey: 'tjw_rule_mithlain_notice',
                makhrajNote: 'يُنطق الحرفان حرفاً واحداً مشدَّداً، فتلتقي الشفتان (أو اللسان) التقاءً واحداً بدل التقاءين.',
                commonMistakes: 'أشيع خطأ: نطق الحرفين منفصلين (باء ثم باء) بدل إدغام الأول في الثاني.',
                example: { surah: 2, ayah: 60, highlight: 'ٱضۡرِب بِّعَصَاكَ' },
                practiceExample: { surah: 2, ayah: 16, highlight: 'رَبِحَت تِّجَٰرَتُهُمۡ' }
            },
            {
                id: 'mutaqaribain',
                nameKey: 'tjw_rule_mutaqaribain_name',
                defKey: 'tjw_rule_mutaqaribain_def',
                letters: 'حرفان متقاربان في المخرج مختلفان في الصفة',
                glyph: 'مق',
                noticeKey: 'tjw_rule_mutaqaribain_notice',
                makhrajNote: 'يُدغم الحرف الأول الساكن في الثاني المتحرك فيصيران حرفاً مشدَّداً من جنس الثاني (اللام تنقلب راءً في «قُل رَّبِّ»).',
                commonMistakes: 'أشيع خطأ: إظهار الحرف الأول وعدم إدغامه في الثاني.',
                example: { surah: 23, ayah: 93, highlight: 'قُل رَّبِّ' },
                practiceExample: { surah: 77, ayah: 20, highlight: 'نَخۡلُقكُّم' }
            },
            {
                id: 'mutajanisain',
                nameKey: 'tjw_rule_mutajanisain_name',
                defKey: 'tjw_rule_mutajanisain_def',
                letters: 'حرفان متفقان في المخرج مختلفان في الصفة',
                glyph: 'مج',
                noticeKey: 'tjw_rule_mutajanisain_notice',
                makhrajNote: 'يُدغم الحرف الأول الساكن في الثاني المتحرك (الدال في التاء من «قَد تَّبَيَّنَ») فيصيران حرفاً مشدَّداً.',
                commonMistakes: 'أشيع خطأ: إظهار الحرف الأول، أو الخلط بينه وبين المتقاربين لاختلاف الصفة فقط.',
                example: { surah: 2, ayah: 256, highlight: 'قَد تَّبَيَّنَ' },
                practiceExample: { surah: 3, ayah: 69, highlight: 'وَدَّت طَّآئِفَةٌۭ' }
            }
        ]
    },
    {
        id: 'madd',
        nameKey: 'tjw_stage_madd_name',
        icon: '🌊',
        colorVar: '--tjw-madd',
        rules: [
            {
                id: 'madd_tabii',
                nameKey: 'tjw_rule_madd_tabii_name',
                defKey: 'tjw_rule_madd_tabii_def',
                letters: 'و ا ي',
                glyph: 'طب',
                noticeKey: 'tjw_rule_madd_tabii_notice',
                makhrajNote: 'يُمدّ الصوت بمقدار حركتين فقط (قدر قبض إصبعين أو بسطهما) ثم يُتوقّف.',
                commonMistakes: 'أشيع خطأ: قصر المد أقل من حركتين، أو مدّه أكثر من اللازم فيشبه المدود الفرعية.',
                example: { surah: 114, ayah: 2, highlight: 'ٱلنَّاسِ' },
                practiceExample: { surah: 1, ayah: 4, highlight: 'مَٰلِكِ', skipQuestion: true },
                // أمثلة إضافية لاختبار الحكم (آياتها قليلة فلا تكفي مثالان لـ5 أسئلة) — مفحوصة آلياً
                extraExamples: [
                    { surah: 110, ayah: 1, highlight: 'إِذَا', skipQuestion: true },
                    { surah: 103, ayah: 2, highlight: 'ٱلۡإِنسَٰنَ', skipQuestion: true },
                    { surah: 114, ayah: 3, highlight: 'إِلَٰهِ', skipQuestion: true }
                ]
            },
            {
                id: 'madd_wajib_muttasil',
                nameKey: 'tjw_rule_madd_wajib_muttasil_name',
                defKey: 'tjw_rule_madd_wajib_muttasil_def',
                letters: 'مد + همزة في كلمة واحدة',
                glyph: 'مت',
                noticeKey: 'tjw_rule_madd_wajib_muttasil_notice',
                makhrajNote: 'يُمدّ الصوت أكثر من الطبيعي (٤ أو ٥ حركات) وجوباً لا يجوز قصره، مع الثبات على مقدار واحد في التلاوة.',
                commonMistakes: 'أشيع خطأ: قصره كالمد الطبيعي، أو الاختلاف في مقداره بين المواضع في التلاوة الواحدة.',
                example: { surah: 110, ayah: 1, highlight: 'جَآءَ' },
                practiceExample: { surah: 89, ayah: 23, highlight: 'وَجِا۟ىٓءَ' }
            },
            {
                id: 'madd_jaiz_munfasil',
                nameKey: 'tjw_rule_madd_jaiz_munfasil_name',
                defKey: 'tjw_rule_madd_jaiz_munfasil_def',
                letters: 'مد في آخر كلمة + همزة في أول التي بعدها',
                glyph: 'من',
                noticeKey: 'tjw_rule_madd_jaiz_munfasil_notice',
                makhrajNote: 'يجوز مدّه (٤ أو ٥ حركات) أو قصره (حركتان) وفق ما يُقرئ به معلمك، مع الالتزام بمقدار واحد في الموضع الواحد.',
                commonMistakes: 'أشيع خطأ: الخلط بينه وبين المتصل (الهمزة هنا في كلمة مستقلة بعد المد) فيُظن أنه واجب.',
                example: { surah: 108, ayah: 1, highlight: 'إِنَّآ أَعۡطَيۡنَٰكَ' },
                practiceExample: { surah: 101, ayah: 3, highlight: 'وَمَآ أَدۡرَىٰكَ' }
            },
            {
                id: 'madd_arid_sukun',
                nameKey: 'tjw_rule_madd_arid_sukun_name',
                defKey: 'tjw_rule_madd_arid_sukun_def',
                letters: 'مد + سكون عارض للوقف',
                glyph: 'عا',
                noticeKey: 'tjw_rule_madd_arid_sukun_notice',
                makhrajNote: 'عند الوقف على آخر الكلمة يجوز مدّ حرف المد ٢ أو ٤ أو ٦ حركات، ويزول المد عند الوصل.',
                commonMistakes: 'أشيع خطأ: مدّه عند الوصل بلا وقف، أو الخلط بينه وبين اللازم (السكون هنا عارض للوقف فقط).',
                example: { surah: 1, ayah: 5, highlight: 'نَسۡتَعِينُ' },
                practiceExample: { surah: 1, ayah: 2, highlight: 'ٱلۡعَٰلَمِينَ' }
            },
            {
                id: 'madd_leen',
                nameKey: 'tjw_rule_madd_leen_name',
                defKey: 'tjw_rule_madd_leen_def',
                letters: 'واو أو ياء ساكنة بعد فتح (عند الوقف)',
                glyph: 'لي',
                noticeKey: 'tjw_rule_madd_leen_notice',
                makhrajNote: 'عند الوقف على كلمة آخرها حرف متحرك قبله واو أو ياء ساكنة مفتوح ما قبلها، يجوز مدّ الصوت بلين ٢ أو ٤ أو ٦ حركات.',
                commonMistakes: 'أشيع خطأ: مدّه عند الوصل، أو الخلط بين الواو والياء الساكنتين بعد فتح وبين حرفي المد بعد ضمة أو كسرة.',
                example: { surah: 106, ayah: 3, highlight: 'ٱلۡبَيۡتِ' },
                practiceExample: { surah: 106, ayah: 1, highlight: 'قُرَيۡشٍ' }
            },
            {
                id: 'madd_badal',
                nameKey: 'tjw_rule_madd_badal_name',
                defKey: 'tjw_rule_madd_badal_def',
                letters: 'همزة قبل حرف مد',
                glyph: 'بد',
                noticeKey: 'tjw_rule_madd_badal_notice',
                makhrajNote: 'يُمدّ بمقدار حركتين فقط، وقد تقدّمت الهمزة على حرف المد (عكس المتصل).',
                commonMistakes: 'أشيع خطأ: مدّه كالمتصل لمجرد وجود الهمزة، مع أنها قبل حرف المد لا بعده.',
                example: { surah: 103, ayah: 3, highlight: 'ءَامَنُوا۟' },
                practiceExample: { surah: 106, ayah: 4, highlight: 'وَءَامَنَهُم' }
            },
            {
                id: 'madd_lazim',
                nameKey: 'tjw_rule_madd_lazim_name',
                defKey: 'tjw_rule_madd_lazim_def',
                letters: 'مد + سكون أصلي لازم',
                glyph: 'لز',
                noticeKey: 'tjw_rule_madd_lazim_notice',
                makhrajNote: 'يُمدّ الصوت ست حركات وجوباً، وصلاً ووقفاً، لأن السكون بعد حرف المد أصلي ثابت لا يزول.',
                commonMistakes: 'أشيع خطأ: تقصيره عند الوصل، أو الخلط بينه وبين العارض للسكون.',
                example: { surah: 1, ayah: 7, highlight: 'ٱلضَّآلِّينَ' },
                practiceExample: { surah: 80, ayah: 33, highlight: 'ٱلصَّآخَّةُ' }
            }
        ]
    },
    {
        id: 'madd_lazim',
        nameKey: 'tjw_stage_madd_lazim_name',
        icon: '📏',
        colorVar: '--tjw-lazim',
        rules: [
            {
                id: 'lazim_kalami_muthaqqal',
                nameKey: 'tjw_rule_lazim_kalami_muthaqqal_name',
                defKey: 'tjw_rule_lazim_kalami_muthaqqal_def',
                letters: 'مد + حرف مشدد في كلمة',
                glyph: 'كث',
                noticeKey: 'tjw_rule_lazim_kalami_muthaqqal_notice',
                makhrajNote: 'يُمدّ ست حركات ثم يُنطق الحرف المشدَّد بتشديد واضح.',
                commonMistakes: 'أشيع خطأ: تقصير المد، أو إهمال التشديد بعده.',
                example: { surah: 79, ayah: 34, highlight: 'ٱلطَّآمَّةُ' },
                practiceExample: { surah: 69, ayah: 3, highlight: 'ٱلۡحَآقَّةُ' }
            },
            {
                id: 'lazim_kalami_mukhaffaf',
                nameKey: 'tjw_rule_lazim_kalami_mukhaffaf_name',
                defKey: 'tjw_rule_lazim_kalami_mukhaffaf_def',
                letters: 'مد + سكون بلا تشديد في كلمة',
                glyph: 'كخ',
                noticeKey: 'tjw_rule_lazim_kalami_mukhaffaf_notice',
                makhrajNote: 'يُمدّ ست حركات ثم يُنطق اللام ساكنة بلا تشديد؛ ولا يأتي إلا في كلمة «آلْآنَ» (موضعان في سورة يونس).',
                commonMistakes: 'أشيع خطأ: تقصير المد، أو تشديد اللام فيُخلط بينه وبين المثقل.',
                example: { surah: 10, ayah: 51, highlight: 'ءَآلۡـَٰٔنَ' },
                practiceExample: { surah: 10, ayah: 91, highlight: 'ءَآلۡـَٰٔنَ' }
            },
            {
                id: 'lazim_harfi_muthaqqal',
                nameKey: 'tjw_rule_lazim_harfi_muthaqqal_name',
                defKey: 'tjw_rule_lazim_harfi_muthaqqal_def',
                letters: 'حرف في فاتحة سورة مدغم فيما بعده',
                glyph: 'حث',
                noticeKey: 'tjw_rule_lazim_harfi_muthaqqal_notice',
                makhrajNote: 'يُمدّ وسط اسم الحرف ست حركات ثم يُدغم آخره في الحرف الذي بعده فيصير مشدَّداً (اللام مع الميم في «الم»).',
                commonMistakes: 'أشيع خطأ: تقصير المد، أو إظهار آخر الحرف بدل إدغامه.',
                example: { surah: 2, ayah: 1, highlight: 'الٓمٓ', skipQuestion: true },
                practiceExample: { surah: 3, ayah: 1, highlight: 'الٓمٓ', skipQuestion: true },
                // أمثلة إضافية لاختبار الحكم (آياتها قليلة فلا تكفي مثالان لـ5 أسئلة) — مفحوصة آلياً
                extraExamples: [
                    { surah: 29, ayah: 1, highlight: 'الٓمٓ', skipQuestion: true },
                    { surah: 30, ayah: 1, highlight: 'الٓمٓ', skipQuestion: true },
                    { surah: 31, ayah: 1, highlight: 'الٓمٓ', skipQuestion: true }
                ]
            },
            {
                id: 'lazim_harfi_mukhaffaf',
                nameKey: 'tjw_rule_lazim_harfi_mukhaffaf_name',
                defKey: 'tjw_rule_lazim_harfi_mukhaffaf_def',
                letters: 'حرف في فاتحة سورة غير مدغم فيما بعده',
                glyph: 'حخ',
                noticeKey: 'tjw_rule_lazim_harfi_mukhaffaf_notice',
                makhrajNote: 'يُمدّ وسط اسم الحرف ست حركات ثم يُنطق آخره واضحاً بلا إدغام؛ وحروفه ثمانية يجمعها «كَمْ عَسَلْ نَقَصْ».',
                commonMistakes: 'أشيع خطأ: تقصير المد، أو إدغام آخر الحرف فيما بعده.',
                example: { surah: 68, ayah: 1, highlight: 'نٓ', firstOnly: true },
                practiceExample: { surah: 50, ayah: 1, highlight: 'قٓ', firstOnly: true },
                // أمثلة إضافية لاختبار الحكم (آياتها قليلة فلا تكفي مثالان لـ5 أسئلة) — مفحوصة آلياً
                extraExamples: [
                    { surah: 38, ayah: 1, highlight: 'صٓ', firstOnly: true },
                    { surah: 42, ayah: 2, highlight: 'عٓسٓقٓ', skipQuestion: true }
                ]
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
// حكم/مرحلة «تعرّف على مصحفك»: دروس بلا حروف ولا آيات مثال (أسئلتها في engine/tajweedMushaf.js)
export const isMushafRule = (rule) => !!(rule && rule.mushaf);
export const isMushafStageId = (stageId) => { const st = TAJWEED_STAGES.find((x) => x.id === stageId); return !!(st && st.mushaf); };

export function getFirstStageId() {
    return TAJWEED_STAGES.length > 0 ? TAJWEED_STAGES[0].id : null;
}
