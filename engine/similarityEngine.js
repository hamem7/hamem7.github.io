// engine/similarityEngine.js
//
// 🌟 [إعادة كتابة كاملة] النسخة السابقة من هذا الملف افترضت شكل بيانات قديم غير متوافق
// ({text, surahs, details}) ولم تكن موصولة بأي شاشة فعلية إطلاقاً (راجع الملاحظة الموروثة
// في رأس database/similaritiesDB.js). أعيدت كتابته هنا بالكامل ليعمل فعلياً مع بنية مجموعة
// المتشابهات الحقيقية (المُوثَّقة في database/data/mutashabihatSeed.js): مجموعة واحدة =
// anchorPhrase + occurrences[] (كل موضع له surahNumber/surahName وإما ayahNumber مفرد أو
// ayahRange، وربما distinctiveTailWord).
//
// منطق بحت (Pure) بالكامل: لا يستورد أي شيء من core/app.js ولا يلمس DOM — يأخذ كائن
// "مجموعة" (group) فقط (بالإضافة لدالة findPhraseRanges النقية من core/quranTextUtils.js
// للتحقق من قابلية إخفاء الكلمة المميزة) ويُرجع بيانات الأسئلة جاهزة، فيمكن اختباره مباشرة
// بـ Node.js دون الحاجة لتحميل المتصفح كاملاً — بنفس انضباط الاختبار المتّبع طوال العمل على
// هذه الميزة (كل دالة هنا اختُبرت فعلياً ضد الـ 300 مجموعة/800 موضع الحقيقية قبل اعتمادها).
//
// 🌟 [عدّل — 2026-09-16] كانت اللعبة تُبنى لمجموعة واحدة فقط في كل مرة (زر "🎮 ابدأ لعبة" على
// كل بطاقة مجموعة على حدة). بطلب صريح من المعلم أصبح نطاق اللعب أوسع: "لعبة السورة بالكامل"
// (تجمع كل مجموعات السورة الواحدة) و"لعبة الجزء بالكامل" (تجمع كل مجموعات كل سور الجزء، أو كل
// مجموعات جزء عمّ الـ28 معاً). لذلك:
//   • buildGameRound() أصبحت تستقبل دائماً مصفوفة مجموعات (وليس مجموعة واحدة) وتجمع أسئلتها
//     كلها معاً قبل الخلط — راجع تعليقها أدناه.
//   • كل سؤال يحمل الآن groupId/anchorPhrase/scope/category الخاصين بمجموعته هو (وليس مجموعة
//     واحدة ثابتة للجولة كلها) — ضروري لأن شاشة اللعب (similarities-play.js) تعرض أسئلة من
//     مجموعات مختلفة مخلوطة معاً في نفس الجولة، فلازم كل سؤال يحمل بيانات مجموعته بنفسه بدل
//     الاعتماد على "المجموعة الحالية" الثابتة كما كان قبل هذا التحديث. 🌟
//
// 🎮 لعبتان مبنيتان هنا، بمنطق تصحيح تلقائي فوري (نفس فلسفة ألعاب الأطفال الحالية في
// engine/kidsEngine.js — إجابة فورية بلا تقييم يدوي من المعلم)، لأن الهدف صراحةً (بطلب
// المعلم) هو تعريف الطفل على المتشابهات وتسهيل حفظها، لا تقييمه رسمياً:
//
//   1) "من أي موضع؟" (sim_position) — اللعبة الأساسية المتاحة لأي مجموعة تملك موضعين على
//      الأقل. تعرض نص أحد المواضع وتسأل الطفل عن مكانه (رقم الآية للمتشابهات الداخلية، أو
//      اسم السورة لمتشابهات جزء عمّ)، مع بقية مواضع نفس المجموعة كمشتتات (Distractors) —
//      هذا بالضبط ما يُدرّب الطفل على التمييز بين الآيات المتشابهة بدل حفظها كوحدة واحدة
//      مبهمة.
//
//   2) "أكمل الآية الصحيحة" (sim_ending) — لعبة إضافية (Bonus) تُعرض فقط للمجموعات التي
//      يتوفر لموضعين مختلفين فيها على الأقل حقل distinctiveTailWord (الكلمة/العبارة المميزة
//      في نهاية كل موضع) وتُخفي هذه الكلمة وتطلب من الطفل اختيار الصحيحة من بين كلمات باقي
//      المواضع، لتدريب حفظ "الخاتمة" الدقيقة تحديداً (أكثر نقطة تختلط على الأطفال عادة في
//      هذا النوع من المتشابهات).
//
// ⚠️ تدهور رشيق (Graceful degradation) صريح في كل دالة هنا: أي مجموعة لا تملك بيانات كافية
// (موضع واحد فقط، أو كل المواضع بنفس رقم آية/نفس سورة، أو بلا distinctiveTailWord كافٍ، أو
// كلمة مميزة لا يمكن تحديد موضعها فعلياً داخل النص — راجع فلترة findPhraseRanges أسفل
// generateEndingQuestions) تُرجع مصفوفة أسئلة فارغة لذلك النوع بدل أي خطأ أو سؤال مكسور.
// الشاشة المستهلكة (similarities/similarities-play.js) تعرض رسالة ودّية "لا توجد بيانات
// كافية" لو buildGameRound() رجعت hasEnoughData: false، بدل أي افتراض صامت بأن كل مجموعة
// صالحة للعب دائماً (راجع قاعدة "التوضيح الصريح للافتراضات" في تعليمات المشروع).
import { findPhraseRanges, splitRangeFullTextIntoAyahs } from '../core/quranTextUtils.js';

// 🌟 [جديد — 2026-09-23] توسيع اختبار المتشابهات ليغطي 5 مهارات صريحة بطلب المعلم، بدل
// الاكتفاء بمهارتين (الربط بالموضع sim_position، والاستكمال sim_ending المعطّلة فعلياً بلا
// بيانات distinctiveTailWord): "لإثبات أن الطالب أتقن المتشابهات فعلًا، لا يكفي أن يجيب عن
// سؤال «اختر الإجابة الصحيحة». يجب أن تختبر عدة مهارات مختلفة: التعرّف، التمييز، الاستدعاء،
// الربط بالموضع، ومنع الخلط أثناء التسميع." الخريطة المعتمدة:
//   • الربط بالموضع  → sim_position (موجودة، بلا تعديل).
//   • التمييز        → sim_discrimination (جديد أدناه).
//   • منع الخلط أثناء التسميع → sim_recitation_check (جديد أدناه).
//   • التعرّف        → sim_recognition (جديد أدناه).
//   • الاستدعاء (موجّه) → sim_recall (جديد أدناه).
// sim_ending (الاستكمال بالكلمة المميزة اليدوية) أُبقيت بلا أي تعديل لأي بيانات مستقبلية
// يضيفها المعلم بحقل distinctiveTailWord — راجع تعليقها الأصلي أسفل هذا التعليق.
//
// ⚠️ افتراض صريح مهم: sim_discrimination وsim_recitation_check لا تعتمدان على
// distinctiveTailWord (شبه غائب من بيانات الـ Seed الحالية بالكامل — راجع
// claude/ركن-المتشابهات-بيانات-آخر-5-أجزاء.md). بدلاً منه، "المقطع المميِّز" يُشتق آلياً من
// fullText نفسه (آخر الكلمات بعد أول ورود لـ anchorPhrase في الآية) عبر
// deriveDistinguishingSegment أدناه — نفس فلسفة اشتقاق "بداية/نهاية الآية" المستخدمة فعلاً في
// generateLinkGame (engine/quranEngine.js) للعبة "ربط أول الآية بآخرها"، لكن هنا الاشتقاق من
// نقطة افتراق anchorPhrase تحديداً بدل منتصف الآية. هذا يُفعِّل اختبار "التمييز"/"منع الخلط"
// فعلياً على كل الـ 290 مجموعة الحالية بلا انتظار بيانات إضافية من المعلم.

// 🌟 خلط عشوائي (Fisher-Yates) — نسخة مستقلة بلا اعتماد على أي مكتبة خارجية، ولا تُعدّل
// المصفوفة الأصلية (تُرجع نسخة جديدة دائماً) حتى تبقى الدالة نقية بالكامل
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// 🌟 أقصى عدد مشتتات لكل سؤال (مع الإجابة الصحيحة = حتى 4 خيارات) — نفس حدود ألعاب الأطفال
// الحالية تقريباً (kids_mcq)، مناسب لعمر الطفل المستهدف بلا إرباك بخيارات كثيرة جداً
const MAX_DISTRACTORS = 3;

// ============================================================
// لعبة "من أي موضع؟"
// ============================================================
export function generatePositionQuestions(group) {
    const occs = (group && group.occurrences) || [];
    if (occs.length < 2) return []; // لا يوجد ما يكفي من المواضع للمقارنة (حالة المجموعات وحيدة الموضع)

    if (group.scope === 'internal') {
        // السؤال: في أي آية وردت هذه العبارة؟ (رقم الآية داخل نفس السورة)
        const uniqueAyahNumbers = [...new Set(occs.map(o => o.ayahNumber).filter(n => n != null))];
        if (uniqueAyahNumbers.length < 2) return []; // كل المواضع بنفس رقم الآية (لا يوجد مشتت حقيقي)

        return occs.filter(o => o.ayahNumber != null).map(o => {
            const distractorPool = uniqueAyahNumbers.filter(n => n !== o.ayahNumber);
            const distractors = shuffle(distractorPool).slice(0, MAX_DISTRACTORS);
            return {
                type: 'sim_position',
                promptKey: 'sim_game_q_position_ayah',
                occurrence: o,
                correctAnswer: o.ayahNumber,
                options: shuffle([o.ayahNumber, ...distractors]),
                // 🌟 [جديد] بيانات المجموعة الأصلية مرفقة بالسؤال نفسه (راجع تعليق رأس الملف) —
                // ضرورية لأن جولات "لعبة السورة/الجزء" تخلط أسئلة من عدة مجموعات مختلفة معاً
                groupId: group.groupId, anchorPhrase: group.anchorPhrase,
                scope: group.scope, category: group.category
            };
        });
    }

    // scope === 'juzAmma': السؤال عن اسم السورة بدل رقم الآية. بعض مجموعات جزء عمّ قد تتكرر
    // فيها نفس السورة لأكثر من موضع (حالة موثّقة فعلياً عبر distinctiveNote لبعض المجموعات) —
    // فحص uniqueSurahNames.length < 2 أدناه هو خط الدفاع الصريح لهذه الحالة بالذات.
    const uniqueSurahNames = [...new Set(occs.map(o => o.surahName).filter(Boolean))];
    if (uniqueSurahNames.length < 2) return [];

    return occs.filter(o => o.surahName).map(o => {
        const distractorPool = uniqueSurahNames.filter(n => n !== o.surahName);
        const distractors = shuffle(distractorPool).slice(0, MAX_DISTRACTORS);
        return {
            type: 'sim_position',
            promptKey: 'sim_game_q_position_surah',
            occurrence: o,
            correctAnswer: o.surahName,
            options: shuffle([o.surahName, ...distractors]),
            // 🌟 [جديد] راجع تعليق generatePositionQuestions أعلاه لسبب إرفاق بيانات المجموعة هنا
            groupId: group.groupId, anchorPhrase: group.anchorPhrase,
            scope: group.scope, category: group.category
        };
    });
}

// ============================================================
// لعبة "أكمل الآية الصحيحة" (Bonus)
// ============================================================
export function generateEndingQuestions(group) {
    // 🛡️ نتحقق أولاً أن الكلمة المميزة فعلاً موجودة كنص متصل داخل fullText (عبر
    // findPhraseRanges النقية نفسها المستخدمة في الإخفاء الفعلي لاحقاً في شاشة اللعب) —
    // اكتُشف فعلياً أثناء الاختبار أن موضعين من بيانات الـ Seed يحملان ملاحظة توضيحية بين
    // قوسين داخل distinctiveTailWord نفسه (مثال: "خالدين فيها أبداً (الفوز)") تكسر التطابق
    // كنص متصل مع الآية الفعلية. بدل محاولة "تنظيف" بيانات الـ Seed هنا بصمت، نستبعد أي
    // موضع كهذا من هذه اللعبة تحديداً (لا يزال يظهر طبيعياً في شاشات التصفح العادية) — نفس
    // فلسفة "لا نفترض صحة البيانات صامتاً" المتبعة في هذا الملف بالكامل.
    const occs = ((group && group.occurrences) || []).filter(o =>
        o.distinctiveTailWord && findPhraseRanges(o.fullText, o.distinctiveTailWord).length > 0
    );
    if (occs.length < 2) return [];

    const uniqueTailWords = [...new Set(occs.map(o => o.distinctiveTailWord))];
    if (uniqueTailWords.length < 2) return []; // كل الكلمات المميزة المتوفرة متطابقة (لا فائدة من سؤال بلا مشتت حقيقي)

    return occs.map(o => {
        const distractorPool = uniqueTailWords.filter(w => w !== o.distinctiveTailWord);
        const distractors = shuffle(distractorPool).slice(0, MAX_DISTRACTORS);
        return {
            type: 'sim_ending',
            promptKey: 'sim_game_q_ending',
            occurrence: o,
            correctAnswer: o.distinctiveTailWord,
            options: shuffle([o.distinctiveTailWord, ...distractors]),
            // 🌟 [جديد] راجع تعليق generatePositionQuestions أعلاه لسبب إرفاق بيانات المجموعة هنا
            groupId: group.groupId, anchorPhrase: group.anchorPhrase,
            scope: group.scope, category: group.category
        };
    });
}

// ============================================================
// 🌟 [جديد] اشتقاق "المقطع المميِّز" آلياً من fullText (بديل distinctiveTailWord الغائب)
// ============================================================

// 🌟 عدد الكلمات المعروضة كمقطع مميِّز — نفس فلسفة حدّي 2-3 كلمة المستخدمين فعلياً في
// generateLinkGame (engine/quranEngine.js) لطرفي "البداية/النهاية"، هنا سقف أعلى قليلاً (5)
// لأن الهدف مقطع مائز مقروء بذاته لا مجرد كلمة مفردة قد تتكرر مصادفةً بين مجموعات مختلفة.
const MAX_TAIL_WORDS = 5;
const MIN_TAIL_WORDS = 2;

// لمواضع "جزء عمّ" (ayahRange)، نقطة الافتراق الفعلية غالباً تقع داخل آخر آية من النطاق (بعد
// أن تشترك بقية الآيات في نفس العبارة) — نستخدم splitRangeFullTextIntoAyahs الموجودة أصلاً
// (نفس الدالة المستخدمة لعرض شاشات التصفح) بدل التعامل مع نص المدى الكامل بفواصله ﴿رقم﴾.
function getTailSourceText(occurrence) {
    if (!occurrence || !occurrence.fullText) return '';
    if (occurrence.ayahNumber != null) return occurrence.fullText;
    const ayahs = splitRangeFullTextIntoAyahs(occurrence.fullText);
    return ayahs.length > 0 ? ayahs[ayahs.length - 1].text : occurrence.fullText;
}

// 🛡️ تدهور رشيق مقصود: لو anchorPhrase لم يُطابَق كنص متصل (فئة "ربط_موضوعي" مثلاً)، أو كان
// الباقي بعد آخر مطابقة قصيراً جداً (أقل من MIN_TAIL_WORDS، أي العبارة المشتركة قريبة جداً من
// نهاية الآية أو الآية نفسها كلها عبارة مشتركة تقريباً) — نرجع لآخر MAX_TAIL_WORDS كلمة من
// النص كاملاً بدل إرجاع مقطع فارغ أو بلا معنى. الدالة تُرجع null فقط لو النص نفسه غير موجود.
export function deriveDistinguishingSegment(occurrence, anchorPhrase) {
    const sourceText = getTailSourceText(occurrence);
    if (!sourceText) return null;

    let tail = '';
    const ranges = findPhraseRanges(sourceText, anchorPhrase);
    if (ranges.length > 0) {
        const [, end] = ranges[ranges.length - 1];
        tail = sourceText.slice(end).trim();
    }

    let words = tail.split(/\s+/).filter(Boolean);
    if (words.length < MIN_TAIL_WORDS) {
        words = sourceText.trim().split(/\s+/).filter(Boolean);
    }
    if (words.length === 0) return null;
    const segment = words.slice(-MAX_TAIL_WORDS).join(' ').trim();
    return segment || null;
}

// ============================================================
// لعبة "ما النهاية الصحيحة؟" — التمييز (مُشتقة آلياً، بلا حاجة لـ distinctiveTailWord)
// ============================================================
export function generateDiscriminationQuestions(group) {
    const occs = (group && group.occurrences) || [];
    const withSegments = occs
        .map(o => ({ o, segment: deriveDistinguishingSegment(o, group.anchorPhrase) }))
        .filter(x => x.segment);
    if (withSegments.length < 2) return [];

    const uniqueSegments = [...new Set(withSegments.map(x => x.segment))];
    if (uniqueSegments.length < 2) return []; // كل المقاطع المُشتقة متطابقة (لا مشتت حقيقي)

    return withSegments.map(({ o, segment }) => {
        const distractorPool = uniqueSegments.filter(s => s !== segment);
        const distractors = shuffle(distractorPool).slice(0, MAX_DISTRACTORS);
        return {
            type: 'sim_discrimination',
            promptKey: 'sim_game_q_discrimination',
            occurrence: o,
            correctAnswer: segment,
            options: shuffle([segment, ...distractors]),
            groupId: group.groupId, anchorPhrase: group.anchorPhrase,
            scope: group.scope, category: group.category
        };
    });
}

// ============================================================
// لعبة "وصلت هنا وأنت تُسمِّع... أكمل" — منع الخلط أثناء التسميع
// ============================================================
// 🌟 نفس بيانات المقاطع المُشتقة أعلاه بالضبط (نفس عدد الأسئلة الناتجة عن كل مجموعة تقريباً)،
// لكن بفارق جوهري في العرض (راجع similarities-play.js): بلا أي سياق مساعد — لا نص الآية
// الكامل، لا رقم آية، لا اسم سورة — فقط عبارة الالتقاء المشتركة (anchorPhrase، المعروضة أصلاً
// في صندوق العنوان أعلى الشاشة) ثم الخيارات مباشرة. هذا يحاكي فعلياً لحظة الالتباس الحقيقية
// أثناء التسميع الحي حين يصل الطالب لنفس نقطة الافتراق بين آيتين متشابهتين بلا أي مساعدة بصرية
// إضافية — بخلاف sim_discrimination (نفس البيانات، لكن بسياق كامل مرئي، تمرين أسهل تدريجياً).
export function generateRecitationCheckQuestions(group) {
    const occs = (group && group.occurrences) || [];
    const withSegments = occs
        .map(o => ({ o, segment: deriveDistinguishingSegment(o, group.anchorPhrase) }))
        .filter(x => x.segment);
    if (withSegments.length < 2) return [];

    const uniqueSegments = [...new Set(withSegments.map(x => x.segment))];
    if (uniqueSegments.length < 2) return [];

    return withSegments.map(({ o, segment }) => {
        const distractorPool = uniqueSegments.filter(s => s !== segment);
        const distractors = shuffle(distractorPool).slice(0, MAX_DISTRACTORS);
        return {
            type: 'sim_recitation_check',
            promptKey: 'sim_game_q_recitation_check',
            occurrence: o,
            correctAnswer: segment,
            options: shuffle([segment, ...distractors]),
            groupId: group.groupId, anchorPhrase: group.anchorPhrase,
            scope: group.scope, category: group.category
        };
    });
}

// ============================================================
// لعبة "أي هذه الآيات هي المقصودة؟" — التعرّف
// ============================================================
// 🌟 [جديد] بخلاف كل الألعاب الأخرى في هذا الملف (مشتتاتها كلها من نفس المجموعة)، هذه اللعبة
// تحتاج مشتتات "دخيلة" فعلاً من مجموعات مختلفة تماماً (anchorPhrase مختلف) حتى تختبر قدرة
// الطفل على تمييز "هل هذه الآية من نفس عائلة المتشابهة المعروضة أم لا" — لذلك تستقبل معامل
// ثانٍ allGroupsPool (كل مجموعات المتشابهات المتاحة، وليس فقط مجموعات النطاق الحالي/جولة
// اللعب) حتى تعمل بمشتتات حقيقية متنوعة حتى لو كان نطاق اللعب نفسه ضيقاً (لعبة سورة واحدة بها
// مجموعة أو مجموعتان فقط مثلاً). راجع buildGameRound أدناه لكيفية تمرير هذا المجمّع الكامل.
export function generateRecognitionQuestions(group, allGroupsPool) {
    const occs = (group && group.occurrences) || [];
    if (occs.length === 0) return [];
    // 🛡️ [اكتُشف فعلياً بالاختبار ضد البيانات الحقيقية] نفس الآية القرآنية قد تنتمي فعلياً
    // لأكثر من مجموعة متشابهات مختلفة معاً (مثال حقيقي موثّق: الآية 51:22 عضو في كل من
    // المجموعتين "51-4" و"51-5" لاشتراكها في لفظين مختلفين تماماً). أي موضع "دخيل" مرشَّح من
    // مجموعة أخرى لكنه يحمل نفس نص أحد مواضع المجموعة الحالية ليس دخيلاً حقيقياً (لو اختاره
    // الطفل، فهو فعلياً محقّ) — نستبعده صراحة قبل الاختيار العشوائي بدل السماح بمشتت "صحيح
    // خطأً" يكسر منطق السؤال بالكامل.
    const ownTexts = new Set(occs.map(o => o.fullText));

    const pool = Array.isArray(allGroupsPool) ? allGroupsPool : [];
    const others = pool.filter(g =>
        g && g.groupId !== group.groupId && g.anchorPhrase !== group.anchorPhrase && (g.occurrences || []).length > 0
    );
    if (others.length === 0) return []; // لا توجد مجموعات أخرى كافية لبناء مشتتات دخيلة حقيقية

    return occs.map(o => {
        // 🛡️ [اكتُشف فعلياً بالاختبار — جولة ثانية] نفس المشكلة أعلاه لكن بين مجموعتين "أخريين"
        // مختلفتين معاً: ممكن يشترك موضع واحد (نفس نص الآية حرفياً) بين مجموعتين مختلفتين من
        // مجموعات "others"، فيُختار نفس النص مرتين كمشتتين من مجموعتين مختلفتين (خياران بنص
        // واحد مكرر). usedTexts يتراكم مع كل مشتت يُختار (وليس فقط نصوص المجموعة الحالية) حتى
        // نضمن عدم تكرار أي نص بين كل الخيارات الأربعة النهائية إطلاقاً.
        const candidateGroups = shuffle(others);
        const usedTexts = new Set(ownTexts);
        const distractorOccs = [];
        for (const g of candidateGroups) {
            if (distractorOccs.length >= MAX_DISTRACTORS) break;
            const validOccs = (g.occurrences || []).filter(gOcc => !usedTexts.has(gOcc.fullText));
            if (validOccs.length === 0) continue; // كل مواضع هذه المجموعة الأخرى مُستخدَمة/متقاطعة بالفعل — تخطَّها
            const picked = validOccs[Math.floor(Math.random() * validOccs.length)];
            distractorOccs.push(picked);
            usedTexts.add(picked.fullText);
        }
        if (distractorOccs.length === 0) return null;

        const shuffledChoices = shuffle([o, ...distractorOccs]);
        return {
            type: 'sim_recognition',
            promptKey: 'sim_game_q_recognition',
            occurrence: o,
            correctAnswer: o.fullText,
            options: shuffledChoices.map(x => x.fullText),
            groupId: group.groupId, anchorPhrase: group.anchorPhrase,
            scope: group.scope, category: group.category
        };
    }).filter(Boolean);
}

// ============================================================
// لعبة "ما نص المتشابهة في هذا الموضع؟" — الاستدعاء (موجّه)
// ============================================================
// 🌟 [جديد] عكس اتجاه sim_position تماماً بقصد: sim_position يعرض النص ويسأل عن "أين"،
// وهذه تعرض "أين" (رقم الآية أو اسم السورة فقط، بلا أي نص) وتسأل عن "ماذا" — يفرض على الطفل
// استدعاء الصياغة الفعلية من الذاكرة بدل مجرد التعرف عليها لما تُعرض أمامه، وهو بالضبط الفرق
// بين "الاستدعاء" و"التعرّف" في تصنيف مهارات الحفظ. المشتتات هنا مقصودة من نفس المجموعة (وليس
// دخيلة كالتعرّف) لأن الهدف تمييز الصياغة الدقيقة بين مواضع شديدة التشابه فعلاً، لا استبعاد
// نص غريب تماماً.
export function generateGuidedRecallQuestions(group) {
    const occs = (group && group.occurrences) || [];
    if (occs.length < 2) return [];

    const uniqueTexts = [...new Set(occs.map(o => o.fullText))];
    if (uniqueTexts.length < 2) return [];

    return occs.map(o => {
        // 🛡️ [اكتُشف فعلياً بالاختبار] بعض المجموعات (مثال حقيقي: "56-7") تحتوي موضعين مختلفين
        // (رقمي آية مختلفين) لكن بنفس النص الحرفي بالضبط — آية "فَسَبِّحْ بِاسْمِ رَبِّكَ
        // الْعَظِيمِ" تتكرر فعلياً بنفس اللفظ في سورة الواقعة (74 و96). الاختيار العشوائي من
        // occurrences مباشرة كان قد يسحب كلا الموضعين المتطابقين نصياً كمشتتين مختلفين فينتج
        // خياران بنص واحد مكرر — نبني مجمّع المشتتات من uniqueTexts (نصوص مفردة لا تتكرر) بدل
        // occurrences الخام لضمان عدم تكرار أي نص بين الخيارات إطلاقاً.
        const distractorTextPool = uniqueTexts.filter(txt => txt !== o.fullText);
        const distractorTexts = shuffle(distractorTextPool).slice(0, MAX_DISTRACTORS);
        const promptKey = group.scope === 'internal' ? 'sim_game_q_recall_ayah' : 'sim_game_q_recall_surah';
        return {
            type: 'sim_recall',
            promptKey,
            occurrence: o,
            correctAnswer: o.fullText,
            options: shuffle([o.fullText, ...distractorTexts]),
            groupId: group.groupId, anchorPhrase: group.anchorPhrase,
            scope: group.scope, category: group.category
        };
    });
}

// ============================================================
// بناء جولة لعب كاملة من مجموعة أو أكثر
// ============================================================
// 🌟 [عدّل — 2026-09-16] كانت هذه الدالة تبني الجولة لمجموعة واحدة فقط. أصبحت الآن تستقبل
// دائماً مصفوفة مجموعات (حتى لو عنصر واحد) — بطلب صريح من المعلم لتوسيع نطاق اللعب لمستوى
// "السورة بالكامل" أو "الجزء بالكامل" بدل مجموعة واحدة معزولة، فتصبح الألعاب أشمل وأكثر تنوعاً
// (راجع تعليق رأس الملف). تجمع أسئلة كل المجموعات المُمرَّرة معاً، تخلطها، ثم تُطبّق سقفاً
// أقصى على عدد الأسئلة في الجولة الواحدة (MAX_ROUND_QUESTIONS أدناه).
//
// ⚠️ سبب وجود السقف: جزء واحد كامل (مثلاً جزء الأحقاف بسوره الخمسة) قد يحتوي عشرات المجموعات،
// وكل مجموعة قد تولّد عدة أسئلة — لو جُمعت كلها بلا سقف، الجولة الواحدة ممكن تتجاوز 50-60
// سؤالاً، وهو طويل جداً لجلسة لعب واحدة مع طفل. اخترنا 18 سؤالاً كسقف معقول (بطلب صريح من
// المعلم "سقف بعدد معقول")، والأسئلة تُختار عشوائياً من بين كل الأسئلة المتاحة (بعد الخلط)
// في كل جولة، فتتغيّر المجموعة الفرعية المعروضة من جولة لأخرى ("العب مرة أخرى" يعيد البناء من
// الصفر ويُعيد الاختيار العشوائي أيضاً — راجع similarities-play.js).
const MAX_ROUND_QUESTIONS = 18;

// 🌟 [عدّل — 2026-09-23] معامل ثانٍ جديد allGroupsPool: كل مجموعات المتشابهات المتاحة (وليس
// فقط مجموعات نطاق الجولة الحالية) — تحتاجه generateRecognitionQuestions لبناء مشتتات دخيلة
// حقيقية من مجموعات خارج النطاق (راجع تعليقها أعلاه). اختياري وبتوافق رجعي كامل: لو لم يُمرَّر
// (استدعاء قديم بمعامل واحد فقط)، نستخدم list نفسها كبديل — يبقى كل شيء يعمل كالسابق تماماً،
// فقط قد لا تظهر أسئلة "تعرّف" لو كان النطاق نفسه ضيقاً جداً (أقل من مجموعة واحدة أخرى).
export function buildGameRound(groups, allGroupsPool) {
    const list = Array.isArray(groups) ? groups : (groups ? [groups] : []);
    const pool = Array.isArray(allGroupsPool) && allGroupsPool.length > 0 ? allGroupsPool : list;
    let allQuestions = [];
    list.forEach(group => {
        allQuestions = allQuestions.concat(
            generatePositionQuestions(group),        // الربط بالموضع
            generateEndingQuestions(group),           // استكمال يدوي (distinctiveTailWord، حالياً بلا بيانات)
            generateDiscriminationQuestions(group),   // التمييز
            generateRecitationCheckQuestions(group),  // منع الخلط أثناء التسميع
            generateRecognitionQuestions(group, pool),// التعرّف
            generateGuidedRecallQuestions(group)      // الاستدعاء (موجّه)
        );
    });
    const shuffled = shuffle(allQuestions);
    const totalAvailable = shuffled.length;
    const questions = shuffled.slice(0, MAX_ROUND_QUESTIONS);
    return {
        groupIds: list.map(g => g && g.groupId).filter(Boolean),
        questions,
        hasEnoughData: questions.length > 0,
        // 🌟 [جديد] العدد الكلي للأسئلة المتاحة قبل تطبيق السقف — مفيد لو احتجنا مستقبلاً نعرض
        // للمعلم/الطفل "فيه كذا سؤال تاني متاح" أو ما شابه، بلا أي استخدام فعلي حالياً
        totalAvailable
    };
}
