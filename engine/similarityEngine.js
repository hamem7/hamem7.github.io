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
import { findPhraseRanges } from '../core/quranTextUtils.js';

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

export function buildGameRound(groups) {
    const list = Array.isArray(groups) ? groups : (groups ? [groups] : []);
    let allQuestions = [];
    list.forEach(group => {
        allQuestions = allQuestions.concat(generatePositionQuestions(group), generateEndingQuestions(group));
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
