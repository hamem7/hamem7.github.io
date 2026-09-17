// similarities/similarities.js
//
// 🌟 [جديد] منطق شاشات "ركن المتشابهات" بالكامل — مجلد معزول تماماً عن games/ وsettings/
// (بنفس فلسفة عزل dualtests/ المعتمدة سابقاً بطلب صريح من المعلم). كل التنقل بين الشاشات
// الفرعية يتم داخل هذا الملف فقط عبر إعادة رسم #sim-container (راجع similarities-home.html)
// دون أي استدعاء إضافي لـ loadScreen، فالتنقل فوري وبلا أي طلب fetch متكرر.
//
// هيكل التصفح المطلوب من المعلم بالضبط:
//   الشاشة الرئيسية: 5 أزرار (4 أجزاء + جزء عمّ)
//     ├─ جزء الأحقاف/الذاريات/المجادلة/تبارك → قائمة سور الجزء → تفصيل السورة (متشابهات داخلية)
//     └─ جزء عمّ → قائمة كل الألفاظ المشتركة مباشرة (28 مجموعة) → تفصيل اللفظ (كل مواضعه)
// 🌟 [عدّل — طلب صريح من المعلم 2026-09-16] كان جزء عمّ يفتح شاشة اختيار وسيطة بزرّين
// (السور | الكلمات)، وطلب المعلم صراحة الاكتفاء بـ"الكلمات فقط" وحذف مسار "السور" تماماً.
// أصبح الضغط على بطاقة "جزء عمّ" في الشاشة الرئيسية يفتح قائمة الكلمات مباشرة بلا أي شاشة
// وسيطة. شاشة الاختيار (renderAmmaChoiceHTML) ومسار "قائمة سور جزء عمّ" (ammaSurahList) حُذفا
// من التنقل الفعلي؛ renderSurahListHTML وrenderSurahDetailHTML عامّتان وما زالتا تُستخدمان
// لباقي الأجزاء الأربعة (scope='internal') فلم تُحذفا. 🌟
//
// ⚠️ افتراض صريح يجب توضيحه للمعلم (بدل تنفيذه بصمت): تقسيم السور الأربعة والثلاثين
// (46-77) على الأجزاء الأربعة تم برقم السورة (وليس برقم الآية الدقيق لبداية كل جزء)، لأن
// حدود الأجزاء الفعلية تقع أحياناً داخل السورة نفسها لا في بدايتها. الحالة الوحيدة المؤثرة
// هنا: سورة "الذاريات" (51) — أول آياتها تقع فعلياً في نهاية جزء 26 (الأحقاف) وليس جزء 27
// بأكملها، لكننا وضعنا السورة كاملة تحت "جزء الذاريات" لتبسيط الواجهة (كل سورة تظهر مرة
// واحدة فقط ولا تتكرر بين جزأين). التقسيم الكامل المستخدم:
//   جزء الأحقاف  (26): 46-50   |  جزء الذاريات (27): 51-57
//   جزء المجادلة (28): 58-66   |  جزء تبارك    (29): 67-77
//   جزء عمّ      (30): 78-114 (فقط السور التي لها بيانات متشابهات فعلية من الـ 25 الموثّقة)
//
// 🌟 [عدّل — طلب صريح من المعلم 2026-09-16، الجولة الثانية] تعديلان جوهريان إضافيان:
//   1) الألعاب: كان زر "🎮 ابدأ لعبة" على كل بطاقة مجموعة (يلعب مجموعة واحدة بس). اتحذف
//      نهائياً، وبدل منه زرّان أوسع نطاقاً: "🎮 العب لعبة هذه السورة" (يجمع كل مجموعات
//      السورة المفتوحة في تفصيلها) و"🎮 العب لعبة هذا الجزء" (يجمع كل مجموعات كل سور
//      الجزء الواحد، أو كل مجموعات جزء عمّ الـ28 معاً). راجع buildGameRound الجديدة في
//      engine/similarityEngine.js وinitSimilarityGamePlay الجديدة في similarities-play.js.
//   2) الإضافة اليدوية: زر "➕ إضافة متشابهة يدويًا" انتقل بالكامل من شاشة تفصيل السورة
//      إلى الشاشة الرئيسية لركن المتشابهات (تحت الأزرار الخمسة). الفورم نفسه لم يتغيّر
//      (renderGroupFormHTML). [مسار الاختيار القديم — راجع تعديل الجولة الثالثة أسفل]
//
// 🌟 [عدّل — طلب صريح من المعلم 2026-09-16، الجولة الثالثة] مسار اختيار السورة لمسار
// الإضافة اليدوية كان مقيَّداً بخطوتين: اختيار جزء (من 4 أجزاء 46-77 فقط) ثم اختيار سورة
// داخل هذا الجزء تحديداً — أي إن المعلم ما كان يقدر يضيف متشابهة يدوية إلا لسورة من الـ32
// سورة (46-77) الموثّقة أصلاً بملف الـ Seed. طلب المعلم صراحة إمكانية اختيار "أي سورة من
// عموم سور القرآن" (زي سورة مش موجودة أصلاً ضمن آخر 5 أجزاء، مثال: البقرة أو آل عمران).
//   • حُذفت خطوة "اختيار الجزء" (addGroupPickJuz/renderJuzPickerForAddHTML) نهائياً من هذا
//     المسار — لا يوجد أي قيد تقني فعلي كان يمنع هذا أصلاً (addManualGroup/groupId/
//     renderSurahDetailHTML كلها تتعامل مع أي رقم سورة بشكل عام بلا أي افتراض عن نطاق
//     46-77)، القيد كان فقط بالواجهة (JUZ_BUCKETS). زر "➕ إضافة متشابهة يدويًا" في الشاشة
//     الرئيسية يفتح الآن مباشرة قائمة بكل الـ114 سورة (AppState.surahsData) + مربع بحث فوري
//     بالاسم أو الرقم (راجع renderSurahPickerForAddHTML/handleContainerInput أسفل الملف).
//   • اختيار أي سورة من هذه القائمة يفتح تفصيلها (surahDetail) بدل القفز المباشر للفورم
//     الفارغ كما كان سابقاً — تفصيل السورة يحمل الآن زر "➕ إضافة متشابهة يدويًا لهذه
//     السورة" (allowAdd=true) يظهر فقط عند الوصول عبر هذا المسار تحديداً (وليس عبر التصفح
//     العادي لأجزاء 46-77، الذي يبقى بلا هذا الزر بنفس قرار الجولة الثانية أعلاه بالضبط).
//     هذا يسمح للمعلم بالرجوع لاحقاً لنفس السورة (من نفس زر "➕ إضافة متشابهة يدويًا" ثم
//     البحث عنها من جديد) لعرض/تعديل/حذف ما أضافه، بدل أن يضيع الوصول إليه بعد أول حفظ.
//   ⚠️ افتراض صريح يجب معرفته: السور خارج نطاق 46-114 (أي 1-45) لسه معندهاش زر تصفح ثابت
//   في الشاشة الرئيسية لركن المتشابهات (الأزرار الخمسة تغطي فقط 46-114) — الوصول الوحيد
//   لمتابعة متشابهاتها اليدوية لاحقاً هو نفس مسار "➕ إضافة متشابهة يدويًا" ثم البحث عن
//   نفس السورة من جديد في القائمة، وليس عبر أزرار الأجزاء. لو المعلم احتاج زر تصفح دائم لهذه
//   السور لاحقاً، هذا يحتاج قرار/تصميم إضافي منفصل (مثلاً بطاقة سادسة "سور أخرى" في الشاشة
//   الرئيسية). 🌟
import { AppState, loadSplashScreen, openSimilarityGame, t } from '../core/app.js';
// 🌟 [عدّل] دوال المطابقة النصية العربية النقية (تظليل/تقسيم نطاقات الآيات) انتقلت لملف
// core/quranTextUtils.js المشترك عند بناء الألعاب التفاعلية، لتصبح قابلة لإعادة الاستخدام
// من engine/similarityEngine.js وsimilarities-play.js بلا ازدواجية — بلا أي تغيير في السلوك
// (نفس الدوال المُختبَرة فعلياً على الـ 800 موضع الحقيقية، فقط استيراد بدل تعريف محلي) 🌟
import { highlightAnchorInText, splitRangeFullTextIntoAyahs } from '../core/quranTextUtils.js';

// 🌟 تُحمَّل مرة واحدة عند فتح "ركن المتشابهات" ثم يُعاد استخدامها في الذاكرة لكل عمليات
// الفلترة (بدل استدعاء SimilaritiesManager.getBySurah بشكل متكرر لكل سورة في القوائم) —
// أسرع، وبنفس منطق فلترة الدوال الجاهزة في database/similaritiesDB.js بالضبط.
let allSimilarities = [];

// 🌟 تخزين مؤقت لكل سورة تم جلبها من QuranEngine (لعرض النص الرسمي الموثّق للمتشابهات
// الداخلية بدل fullText المُفرَّغ يدوياً من الـ PDF — راجع الملاحظة في رأس ملف
// database/data/mutashabihatSeed.js حول أن fullText للمراجعة فقط).
const surahCache = new Map();

// 🌟 مكدّس تنقل بسيط بين شاشات "ركن المتشابهات" (بلا أي علاقة بـ loadScreen/navigation.js
// الخاص بالمنصة ككل — هذا تنقل داخلي فقط بين حالات العرض داخل #sim-container)
let navStack = [];
let currentView = { view: 'home', params: null };

// 🌟 [جديد — 2026-09-16] حالة نموذج "إضافة/تعديل متشابهة يدويًا" (راجع renderGroupFormHTML
// أسفل هذا الملف). عنصر واحد فقط دائماً (مفيش نماذج متداخلة)، يُبنى أول ما تُفتح الشاشة
// (groupForm) ويُصفَّر (null) عند الخروج منها (حفظ/إلغاء/حذف) حتى تُبنى من جديد نظيفة في
// المرة القادمة. الحقل _key يمنع إعادة تصفير البيانات المكتوبة فعلاً عند إعادة رسم الشاشة
// نفسها بعد إضافة/حذف صف موضع (راجع syncFormStateFromDOM).
let formState = null;

// 🌟 [عدّل] export بسيط بلا أي تغيير في المنطق — تُستخدم الآن أيضاً في شاشة اللعب الجديدة
// similarities/similarities-play.js لحل عنوان "الجزء" عند اللعب على مستوى الجزء بالكامل
// (راجع تعليق طلب المعلم 2026-09-16 الثاني أعلى الملف)
// 🌟 تقسيم الأجزاء الأربعة (بخلاف جزء عمّ الذي له مسار خاص) — راجع تعليق الافتراض أعلى الملف
export const JUZ_BUCKETS = [
    { id: 'ahqaf', titleKey: 'sim_juz_46', from: 46, to: 50 },
    { id: 'dhariyat', titleKey: 'sim_juz_51', from: 51, to: 57 },
    { id: 'mujadila', titleKey: 'sim_juz_58', from: 58, to: 66 },
    { id: 'tabarak', titleKey: 'sim_juz_67', from: 67, to: 77 }
];

// 🌟 ربط قيم حقل category الخام (كما فُرِّغت من الـ PDF) بمفاتيح ترجمة ثنائية اللغة
const CATEGORY_I18N_MAP = {
    'لفظ_مشترك': 'sim_cat_common',
    'اختلاف_الخاتمة': 'sim_cat_ending',
    'تكرار_لازمة': 'sim_cat_refrain',
    'اختلاف_صيغة': 'sim_cat_form',
    'ربط_موضوعي': 'sim_cat_thematic'
};
// 🌟 [عدّل] export بسيط بلا أي تغيير في المنطق — تُستخدم الآن أيضاً في شاشة اللعب الجديدة
// similarities/similarities-play.js لعرض نفس تسمية الفئة بنفس الترجمة بالضبط
export function categoryLabel(cat) {
    const key = CATEGORY_I18N_MAP[cat];
    return key ? t(key) : (cat || '');
}

// 🌟 استخراج الرقم اللاحق من معرّف المجموعة (مثال: "46-3" أو "amma-7") لترتيب القوائم
// ترتيباً منطقياً بدل الترتيب الأبجدي الافتراضي
function groupOrderNum(groupId) {
    const m = String(groupId).match(/(\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
}

// 🌟 جلب النص الرسمي الموثّق لآية مفردة من QuranEngine (للمتشابهات الداخلية فقط، حيث كل
// موضع يحمل ayahNumber مفرداً). عند أي فشل (سورة غير موجودة، رقم آية خارج النطاق...) نرجع
// null، ويتكفّل الاستدعاء بالرجوع تلقائياً لنص fullText المُفرَّغ كخط احتياطي — بنفس فلسفة
// الحفاظ على التوافق بدل الانكسار المفاجئ.
// 🌟 [عدّل] export بسيط بلا أي تغيير في المنطق — تُستخدم الآن أيضاً في شاشة اللعب الجديدة
// لعرض نفس النص الرسمي الموثّق المستخدم في شاشات التصفح بالضبط
export async function getOfficialAyahText(surahNumber, ayahNumber) {
    if (!ayahNumber) return null;
    try {
        let surah = surahCache.get(surahNumber);
        if (!surah) {
            surah = await AppState.quranEngine.getSurah(surahNumber);
            surahCache.set(surahNumber, surah);
        }
        if (!surah || !surah.ayahs || !surah.ayahs[ayahNumber - 1]) return null;
        return surah.ayahs[ayahNumber - 1].text || null;
    } catch (err) {
        console.error('تعذر جلب النص الرسمي للآية:', err);
        return null;
    }
}

// ============================================================
// نقطة الدخول — تُستدعى من core/app.js عبر openSimilaritiesBrowser()
// ============================================================
export async function initSimilaritiesHome() {
    // 🌟 خط دفاع احتياطي: لو حدث خطأ صامت أثناء تهيئة bootSystem() ولم يُنشأ
    // AppState.similaritiesManager بعد، نهيّئه هنا مباشرة بدل ترك الشاشة معطوبة
    if (!AppState.similaritiesManager) {
        try {
            const { initSimilaritiesDB, ensureSimilaritiesLoaded, SimilaritiesManager } = await import('../database/similaritiesDB.js');
            const db = await initSimilaritiesDB();
            await ensureSimilaritiesLoaded(db);
            AppState.similaritiesManager = new SimilaritiesManager(db);
        } catch (err) {
            console.error('تعذر تهيئة قاعدة بيانات المتشابهات:', err);
        }
    }

    allSimilarities = AppState.similaritiesManager ? await AppState.similaritiesManager.getAllSimilarities() : [];
    navStack = [];
    currentView = { view: 'home', params: null };

    const exitBtn = document.getElementById('sim-btn-exit');
    if (exitBtn) exitBtn.addEventListener('click', handleExitClick);

    const levelBackBtn = document.getElementById('sim-btn-level-back');
    if (levelBackBtn) levelBackBtn.addEventListener('click', goBackLevel);

    // 🌟 تفويض حدث نقر واحد على الحاوية (بدل إعادة ربط مستمعين بعد كل إعادة رسم) — الحاوية
    // نفسها لا تُستبدل أبداً، فقط محتواها الداخلي (innerHTML) يتغيّر مع كل تنقل
    const container = document.getElementById('sim-container');
    if (container) container.addEventListener('click', handleContainerClick);
    // 🌟 [جديد — الجولة الثالثة] مستمع 'input' مفوَّض واحد على الحاوية (بنفس فلسفة تفويض
    // 'click' أعلاه) — يخدم مربع بحث قائمة السور الكاملة في مسار "➕ إضافة متشابهة يدويًا"
    // (راجع handleContainerInput أسفل الملف). فلترة مباشرة على الـ DOM بلا إعادة رسم كاملة
    // لتجنّب فقدان تركيز/مكان الكتابة في مربع البحث نفسه مع كل حرف يكتبه المعلم.
    if (container) container.addEventListener('input', handleContainerInput);

    render();
}

// 🌟 [عدّل — 2026-09-16] أصبحت async بسبب استدعاءات إضافة/تعديل/حذف المتشابهات اليدوية
// (قراءة/كتابة IndexedDB). لا حاجة لـ await على استدعاء الدالة نفسها من مستمع الحدث —
// نفس النمط المعتاد في أي معالج نقر غير متزامن.
async function handleContainerClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'open-juz') pushView('juzSurahList', { juzId: btn.dataset.juz });
    // 🌟 [عدّل] جزء عمّ يفتح قائمة "الكلمات" مباشرة الآن (بدل شاشة اختيار وسيطة سور/كلمات) —
    // راجع تعليق طلب المعلم أعلى هذا الملف
    else if (action === 'open-amma') pushView('ammaWordsList', null);
    else if (action === 'open-surah') pushView('surahDetail', { surah: Number(btn.dataset.surah), scope: btn.dataset.scope });
    else if (action === 'open-word') pushView('wordDetail', { groupId: btn.dataset.group });
    // 🌟 [جديد — 2026-09-16، الجولة الثانية] "🎮 العب لعبة هذه السورة" — يجمع كل مجموعات
    // السورة المفتوحة (داخلية فقط) في جولة لعب واحدة، بدل مجموعة مفردة كما كان قبلاً. راجع
    // renderSurahDetailHTML أسفل هذا الملف لمكان الزر، وopenSimilarityGame في core/app.js.
    else if (action === 'start-game-surah') {
        openSimilarityGame({ type: 'surah', surahNumber: Number(btn.dataset.surah) });
    }
    // 🌟 [جديد — 2026-09-16، الجولة الثانية] "🎮 العب لعبة هذا الجزء" — يجمع كل مجموعات كل
    // سور الجزء الواحد (أو كل مجموعات جزء عمّ الـ28 لو juzId === 'amma') في جولة لعب واحدة.
    // راجع renderSurahListHTML/renderWordsListHTML أسفل هذا الملف لمكان الزر.
    else if (action === 'start-game-juz') {
        openSimilarityGame({ type: 'juz', juzId: btn.dataset.juz });
    }
    // 🌟 [عدّل — الجولة الثالثة] بداية مسار "➕ إضافة متشابهة يدويًا" من الشاشة الرئيسية —
    // كانت تعرض أولاً اختيار الجزء (4 أجزاء 46-77 فقط)، وأصبحت الآن تفتح مباشرة قائمة كل
    // الـ114 سورة (addGroupPickSurah — راجع تعليق الجولة الثالثة أعلى الملف للسبب الكامل).
    else if (action === 'add-group-start') {
        pushView('addGroupPickSurah', null);
    }
    // 🌟 [جديد — الجولة الثالثة] اختيار سورة من قائمة "كل السور" لمسار الإضافة اليدوية —
    // بدل القفز مباشرة لفورم فارغ (السلوك القديم لـ action='add-group')، نفتح تفصيل السورة
    // نفسها (allowAdd=true) حتى يقدر المعلم يشوف/يعدّل/يحذف أي متشابهة يدوية أضافها لهذه
    // السورة من قبل، مع زر "➕" ظاهر فيها يفتح نفس الفورم الفارغ (action='add-group' أسفل،
    // بلا أي تغيير في منطقه). راجع renderSurahDetailHTML للتفاصيل.
    else if (action === 'add-group-pick-surah') {
        pushView('surahDetail', { surah: Number(btn.dataset.surah), scope: 'internal', allowAdd: true });
    }
    // 🌟 فتح نموذج "إضافة متشابهة يدويًا" فارغاً للسورة المختارة — يُستدعى الآن من زر
    // "➕ إضافة متشابهة يدويًا لهذه السورة" داخل تفصيل السورة (يظهر فقط لو allowAdd=true،
    // راجع renderSurahDetailHTML) بدل القفز المباشر من قائمة السور القديم. منطق الدالة نفسه
    // لم يتغيّر إطلاقاً منذ الجولة الثانية.
    else if (action === 'add-group') {
        formState = null;
        pushView('groupForm', { surahNumber: Number(btn.dataset.surah), surahName: btn.dataset.surahName || '', editGroupId: null });
    }
    // 🌟 [جديد — 2026-09-16، الجولة الثانية] اختصار سريع على بطاقة مجموعة يدوية موجودة: يفتح
    // نفس فورم التعديل لكن مع صف موضع فارغ إضافي مُضاف مسبقاً (بدل خطوتين منفصلتين: فتح
    // التعديل، ثم الضغط على "➕ إضافة موضع آخر" — أصبحتا خطوة واحدة). نبني formState هنا
    // يدوياً بنفس الشكل الذي تبنيه renderGroupFormHTML تماماً (بما فيها _key) حتى لا تُعيد
    // الدالة بناءه من الصفر وتفقد الصف الفارغ المُضاف هنا عند أول رسم للفورم.
    else if (action === 'quick-add-occurrence') {
        const group = allSimilarities.find(r => r.groupId === btn.dataset.group);
        if (!group) return;
        const surahNumber = group.surahs[0];
        const surahName = (group.occurrences[0] && group.occurrences[0].surahName) || '';
        formState = {
            _key: `${surahNumber}:${group.groupId}`,
            surahNumber, surahName,
            editGroupId: group.groupId,
            editDbId: group.id,
            category: group.category,
            anchorPhrase: group.anchorPhrase,
            distinctiveNote: group.distinctiveNote || '',
            occurrences: [
                ...group.occurrences.map(o => ({
                    ayahNumber: o.ayahNumber || '', fullText: o.fullText || '', distinctiveTailWord: o.distinctiveTailWord || ''
                })),
                { ayahNumber: '', fullText: '', distinctiveTailWord: '' } // 🌟 الصف الجديد الجاهز فوراً
            ]
        };
        pushView('groupForm', { surahNumber, surahName, editGroupId: group.groupId });
    }
    // 🌟 [جديد] فتح نفس النموذج لكن مُعبّأً ببيانات مجموعة يدوية موجودة بالفعل للتعديل —
    // الزر ده مايظهرش إلا على بطاقات source:'manual' فقط (راجع renderGroupCardHTML)
    else if (action === 'edit-group') {
        const group = allSimilarities.find(r => r.groupId === btn.dataset.group);
        if (!group) return;
        formState = null;
        pushView('groupForm', {
            surahNumber: group.surahs[0],
            surahName: (group.occurrences[0] && group.occurrences[0].surahName) || '',
            editGroupId: group.groupId
        });
    }
    // 🌟 [جديد] حذف مباشر لمجموعة يدوية من بطاقتها (بلا فتح النموذج) — بتأكيد confirm() أولاً
    // بنفس أسلوب dts_delete_confirm الموجود مسبقاً في dualtests. لا يعمل إطلاقاً على مجموعات
    // source:'seed' لأن الزر أصلاً مايُرسَمش إلا لبطاقات source==='manual' فقط.
    else if (action === 'delete-group') {
        const group = allSimilarities.find(r => r.groupId === btn.dataset.group);
        if (!group || group.source !== 'manual') return;
        if (!window.confirm(t('sim_form_delete_confirm'))) return;
        await AppState.similaritiesManager.deleteGroup(group.id);
        allSimilarities = await AppState.similaritiesManager.getAllSimilarities();
        render();
    }
    // 🌟 [جديد] أزرار داخل نموذج الإضافة/التعديل نفسه — راجع renderGroupFormHTML أسفل هذا
    // الملف لشرح آلية formState/syncFormStateFromDOM الكاملة
    else if (action === 'form-add-occurrence') {
        syncFormStateFromDOM();
        formState.occurrences.push({ ayahNumber: '', fullText: '', distinctiveTailWord: '' });
        render();
    } else if (action === 'form-remove-occurrence') {
        syncFormStateFromDOM();
        const idx = Number(btn.dataset.index);
        if (formState.occurrences.length > 1) formState.occurrences.splice(idx, 1);
        render();
    } else if (action === 'form-cancel') {
        formState = null;
        goBackLevel();
    } else if (action === 'form-delete') {
        if (!formState || !formState.editDbId) return;
        if (!window.confirm(t('sim_form_delete_confirm'))) return;
        await AppState.similaritiesManager.deleteGroup(formState.editDbId);
        allSimilarities = await AppState.similaritiesManager.getAllSimilarities();
        formState = null;
        goBackLevel();
    } else if (action === 'form-save') {
        syncFormStateFromDOM();
        await handleFormSave();
    }
}

// 🌟 [جديد — الجولة الثالثة] مستمع 'input' مفوَّض لمربع بحث قائمة "كل السور" (مسار الإضافة
// اليدوية). فلترة مباشرة على عناصر الـ DOM الموجودة فعلاً (إخفاء/إظهار بـ style.display) بدل
// إعادة render() الكاملة — لو أعدنا الرسم مع كل حرف يكتبه المعلم، كان التركيز (focus) ومكان
// المؤشر في مربع البحث نفسه هيضيع لأن innerHTML بيُستبدل بالكامل.
function handleContainerInput(e) {
    if (e.target.id !== 'sim-add-surah-search') return;
    const query = normalizeSearchText(e.target.value);
    const grid = document.getElementById('sim-add-surah-grid');
    if (!grid) return;
    grid.querySelectorAll('.sim-surah-card').forEach(card => {
        const haystack = normalizeSearchText(card.textContent);
        card.style.display = (!query || haystack.includes(query)) ? '' : 'none';
    });
}

// 🌟 [جديد — الجولة الثالثة] توحيد بسيط لنص البحث/أسماء السور قبل المقارنة — يزيل التشكيل
// ويوحّد صيغ الألف/الهمزة/الياء الشائعة (نفس فكرة normalizeArabicChar في core/quranTextUtils.js
// لكن أبسط بكثير، لأن الهدف هنا مطابقة بحث تقريبية لا مطابقة حرفية دقيقة لنص قرآني) حتى يلاقي
// المعلم السورة سواء كتب "الاحقاف" أو "الأحقاف" مثلاً، بالإضافة لدعم البحث برقم السورة مباشرة.
function normalizeSearchText(str) {
    return String(str ?? '')
        .replace(/[ً-ْٰ]/g, '') // إزالة التشكيل (الفتحة/الضمة/الكسرة/السكون...)
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .trim()
        .toLowerCase();
}

// 🌟 [جديد] يقرأ القيم المكتوبة فعلياً في حقول نموذج المتشابهة الحالية من الـ DOM ويحدّث بيها
// formState — لازم يُستدعى قبل أي عملية تسبب إعادة رسم الشاشة (إضافة/حذف صف موضع، أو الحفظ
// النهائي) حتى مانفقدش أي بيانات كتبها المعلم فعلاً في الحقول التانية (الفئة/اللفظ المشترك/
// الملاحظة/باقي صفوف المواضع) قبل الضغط على الزر.
function syncFormStateFromDOM() {
    if (!formState) return;
    const container = document.getElementById('sim-container');
    if (!container) return;

    const categoryEl = container.querySelector('#sim-form-category');
    const anchorEl = container.querySelector('#sim-form-anchor');
    const noteEl = container.querySelector('#sim-form-note');
    if (categoryEl) formState.category = categoryEl.value;
    if (anchorEl) formState.anchorPhrase = anchorEl.value;
    if (noteEl) formState.distinctiveNote = noteEl.value;

    container.querySelectorAll('.sim-form-occ-row').forEach(row => {
        const idx = Number(row.dataset.index);
        if (!formState.occurrences[idx]) return;
        const ayahNumEl = row.querySelector('.sim-form-ayah-number');
        const textEl = row.querySelector('.sim-form-ayah-text');
        const tailEl = row.querySelector('.sim-form-tail-word');
        formState.occurrences[idx].ayahNumber = ayahNumEl ? ayahNumEl.value : '';
        formState.occurrences[idx].fullText = textEl ? textEl.value : '';
        formState.occurrences[idx].distinctiveTailWord = tailEl ? tailEl.value : '';
    });
}

// 🌟 [جديد] حفظ نهائي لنموذج الإضافة/التعديل — تحقق بسيط من صحة البيانات (لفظ مشترك مطلوب،
// وكل صف موضع يحتاج رقم آية + نص، وآيتان على الأقل — بنفس منطق أن أي "تشابه" لازم يقارن بين
// موضعين فأكثر، مطابق لكل بيانات الـ Seed الحالية بلا استثناء) قبل الكتابة الفعلية في
// IndexedDB عبر addManualGroup/updateManualGroup (database/similaritiesDB.js).
async function handleFormSave() {
    if (!formState || !AppState.similaritiesManager) return;

    const anchorPhrase = (formState.anchorPhrase || '').trim();
    const distinctiveNote = (formState.distinctiveNote || '').trim();
    const totalRows = formState.occurrences.length;
    const cleanOccurrences = formState.occurrences
        .map(o => ({
            ayahNumber: parseInt(o.ayahNumber, 10),
            fullText: (o.fullText || '').trim(),
            distinctiveTailWord: (o.distinctiveTailWord || '').trim()
        }))
        .filter(o => o.ayahNumber > 0 && o.fullText);

    if (!anchorPhrase || cleanOccurrences.length < totalRows) {
        window.alert(t('sim_form_error_required'));
        return;
    }
    if (cleanOccurrences.length < 2) {
        window.alert(t('sim_form_error_min_occurrences'));
        return;
    }

    const occurrences = cleanOccurrences.map(o => {
        const occ = {
            surahNumber: formState.surahNumber,
            surahName: formState.surahName,
            ayahNumber: o.ayahNumber,
            fullText: o.fullText
        };
        if (o.distinctiveTailWord) occ.distinctiveTailWord = o.distinctiveTailWord;
        return occ;
    });

    // 🌟 groupId لمجموعة يدوية جديدة: "<رقم السورة>-m<طابع زمني>" — الحرف m يمنع أي تعارض
    // مستقبلي مع معرّفات ملف الـ Seed (تستخدم أرقاماً صرفة بعد الشرطة دائماً، بلا استثناء
    // موثّق في كل نسخ البيانات لحد الآن). راجع تعليق addManualGroup في similaritiesDB.js.
    const groupData = {
        groupId: formState.editGroupId || `${formState.surahNumber}-m${Date.now()}`,
        scope: 'internal',
        surahs: [formState.surahNumber],
        anchorPhrase,
        category: formState.category,
        occurrences
    };
    if (distinctiveNote) groupData.distinctiveNote = distinctiveNote;

    if (formState.editDbId) {
        await AppState.similaritiesManager.updateManualGroup(formState.editDbId, groupData);
    } else {
        await AppState.similaritiesManager.addManualGroup(groupData);
    }

    allSimilarities = await AppState.similaritiesManager.getAllSimilarities();
    formState = null;
    goBackLevel();
}

// 🌟 [جديد] تهريب بسيط للنصوص اللي بيكتبها المعلم قبل حقنها في innerHTML — يمنع أي كسر في
// بنية الصفحة لو النص يحتوي على "<" أو "&" أو غيرها، بلا الحاجة لمكتبة خارجية
function escapeHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, '&quot;');
}

function pushView(view, params) {
    navStack.push(currentView);
    currentView = { view, params };
    render();
}

function goBackLevel() {
    if (navStack.length === 0) return;
    currentView = navStack.pop();
    render();
}

// 🌟 [عدّل] كان زر "🔙 العودة للقائمة الرئيسية" يستدعي loadDashboardScreen() دائماً بصرف
// النظر عن الشاشة الحالية — أي أنه كان يفتح "لوحة التقييم" (settings/dashboard.html) حتى
// لو كنا لسه داخل شاشات ركن المتشابهات، رغم أن نص الزر نفسه يقول "القائمة الرئيسية" لا
// "لوحة التقييم". أصبح الآن يتصرف حسب المستوى الحالي بالضبط كما طلب المعلم:
//   • لو لسه داخل أي شاشة فرعية من ركن المتشابهات (قائمة سور/تفصيل سورة/قائمة كلمات/تفصيل
//     لفظ...): يرجع لشاشة "ركن المتشابهات" الرئيسية نفسها (الأزرار الخمسة) بدل الخروج تماماً.
//   • لو كنا بالفعل على الشاشة الرئيسية لركن المتشابهات: يخرج فعلياً للواجهة الرئيسية
//     للمنصة (نفس loadSplashScreen المستخدمة في زر خروج "الاختبارات الثنائية" المشابه).
function handleExitClick() {
    if (currentView.view !== 'home') {
        navStack = [];
        currentView = { view: 'home', params: null };
        render();
    } else {
        loadSplashScreen();
    }
}

// ============================================================
// الرسم الرئيسي
// ============================================================
async function render() {
    const container = document.getElementById('sim-container');
    const titleEl = document.getElementById('sim-title');
    const subtitleEl = document.getElementById('sim-subtitle');
    const backBtn = document.getElementById('sim-btn-level-back');
    if (!container) return;

    if (backBtn) backBtn.style.display = navStack.length > 0 ? 'inline-block' : 'none';
    container.innerHTML = `<div class="sim-loading">${t('sim_loading')}</div>`;

    const { view, params } = currentView;
    let titleText = t('sim_home_title');
    let subtitleText = t('sim_home_subtitle');
    let html = '';

    if (view === 'home') {
        html = renderHomeHTML();
    } else if (view === 'juzSurahList') {
        const bucket = JUZ_BUCKETS.find(b => b.id === params.juzId);
        titleText = bucket ? t(bucket.titleKey) : '';
        subtitleText = t('sim_choose_surah_hint');
        const list = bucket ? AppState.surahsData.filter(s => s.number >= bucket.from && s.number <= bucket.to) : [];
        // 🌟 [جديد — 2026-09-16، الجولة الثانية] "🎮 العب لعبة هذا الجزء" — يظهر فوق قائمة
        // السور مباشرة (نفس مستوى "اختيار نطاق اللعب" المنطقي)، ومتاح فقط لو فيه مجموعات
        // فعلية مسجّلة لسور هذا الجزء (وإلا فلا فائدة من زر يفتح لعبة بلا بيانات)
        const juzHasGroups = allSimilarities.some(r => r.scope === 'internal' && (r.surahs || []).some(sn => bucket && sn >= bucket.from && sn <= bucket.to));
        const juzGameBtnHTML = juzHasGroups
            ? `<div class="sim-game-scope-wrap"><button class="btn sim-game-scope-btn" data-action="start-game-juz" data-juz="${params.juzId}">${t('sim_start_game_juz_btn')}</button></div>`
            : '';
        html = juzGameBtnHTML + renderSurahListHTML(list, 'internal');
    } else if (view === 'ammaWordsList') {
        titleText = t('sim_words_list_title');
        subtitleText = t('sim_words_list_subtitle');
        // 🌟 [جديد — 2026-09-16، الجولة الثانية] "🎮 العب لعبة هذا الجزء" لجزء عمّ بالكامل —
        // لا يوجد مستوى "سورة" منفصل هنا أصلاً (كل مجموعة تربط أكثر من سورة)، فالجزء بالكامل
        // هو النطاق الوحيد المنطقي للعب المُوسَّع في هذا القسم تحديداً
        const ammaHasGroups = allSimilarities.some(r => r.scope === 'juzAmma');
        const ammaGameBtnHTML = ammaHasGroups
            ? `<div class="sim-game-scope-wrap"><button class="btn sim-game-scope-btn" data-action="start-game-juz" data-juz="amma">${t('sim_start_game_juz_btn')}</button></div>`
            : '';
        html = ammaGameBtnHTML + renderWordsListHTML();
    } else if (view === 'addGroupPickSurah') {
        // 🌟 [عدّل — الجولة الثالثة] كانت هذه الشاشة تعرض فقط سور الجزء المختار في خطوة
        // addGroupPickJuz المحذوفة (46-77 فقط). أصبحت الآن تعرض مباشرة كل الـ114 سورة —
        // راجع تعليق الجولة الثالثة أعلى الملف للسبب الكامل والافتراض الصريح المرتبط به.
        titleText = t('sim_add_group_btn');
        subtitleText = t('sim_add_pick_surah_hint');
        const list = (AppState.surahsData || []).slice().sort((a, b) => a.number - b.number);
        html = renderSurahPickerForAddHTML(list);
    } else if (view === 'surahDetail') {
        const result = await renderSurahDetailHTML(params.surah, params.scope, params.allowAdd);
        titleText = result.title;
        subtitleText = result.subtitle;
        html = result.html;
    } else if (view === 'wordDetail') {
        const group = allSimilarities.find(r => r.groupId === params.groupId);
        if (group) {
            titleText = categoryLabel(group.category);
            subtitleText = '';
            html = await renderGroupCardHTML(group, null);
        } else {
            titleText = t('sim_words_list_title');
            html = `<div class="sim-empty">${t('sim_no_data')}</div>`;
        }
    } else if (view === 'groupForm') {
        // 🌟 [جديد] نموذج "إضافة/تعديل متشابهة يدويًا" — رسم متزامن بالكامل (بلا await) تماماً
        // زي renderHomeHTML، فحماية السباق أسفل الدالة مش مؤثرة هنا لكن بتبقى شغالة بأمان
        titleText = params.editGroupId ? t('sim_form_title_edit') : t('sim_form_title_add');
        subtitleText = params.surahName || '';
        html = renderGroupFormHTML(params);
    }

    // 🌟 حماية من حالة سباق نادرة: لو تغيّرت الشاشة الحالية أثناء انتظار رسم غير متزامن
    // (مثلاً المعلم ضغط "رجوع" بسرعة قبل انتهاء جلب تفصيل السورة)، لا نكتب فوق الشاشة
    // الجديدة بنتيجة الشاشة القديمة المتأخرة
    if (currentView.view !== view || currentView.params !== params) return;

    if (titleEl) titleEl.textContent = titleText;
    if (subtitleEl) subtitleEl.textContent = subtitleText;
    container.innerHTML = html;
}

// ============================================================
// شاشات الرسم الفرعية
// ============================================================
function renderHomeHTML() {
    let html = `<div class="sim-grid sim-grid-juz">`;
    JUZ_BUCKETS.forEach(b => {
        html += `<button class="sim-card sim-juz-card" data-action="open-juz" data-juz="${b.id}">
            <span class="sim-juz-icon" aria-hidden="true">📖</span>
            <span class="sim-juz-title">${t(b.titleKey)}</span>
        </button>`;
    });
    html += `<button class="sim-card sim-juz-card sim-juz-amma-card" data-action="open-amma">
        <span class="sim-juz-icon" aria-hidden="true">✨</span>
        <span class="sim-juz-title">${t('sim_juz_amma')}</span>
    </button>`;
    html += `</div>`;
    // 🌟 [جديد — 2026-09-16، الجولة الثانية] زر "➕ إضافة متشابهة يدويًا" انتقل هنا من شاشة
    // تفصيل السورة (بطلب صريح من المعلم) — يبدأ مسار اختيار الجزء ثم السورة (راجع تعليق
    // action='add-group-start' في handleContainerClick أعلى الملف)
    html += `<button class="btn btn-outline sim-add-group-btn" data-action="add-group-start">${t('sim_add_group_btn')}</button>`;
    return html;
}

// 🌟 [محذوف — الجولة الثالثة] renderJuzPickerForAddHTML حُذفت — خطوة "اختيار الجزء" (46-77
// فقط) لمسار الإضافة اليدوية اتحذفت نهائياً (راجع تعليق الجولة الثالثة أعلى الملف)، بنفس
// أسلوب حذف renderAmmaChoiceHTML سابقاً: الدالة اتشالت فعلياً (مش شاشة تصفح عادية هيحتاجها
// حد تاني)، ومفتاح i18n المرتبط بيها (sim_add_pick_juz_hint) أُبقي بلا حذف في core/i18n.js.

// 🌟 [عدّل — الجولة الثالثة] شاشة اختيار السورة لمسار الإضافة اليدوية — كانت تعرض فقط سور
// الجزء المختار في خطوة سابقة محذوفة الآن، وأصبحت تستقبل قائمة كل الـ114 سورة مباشرة (راجع
// استدعاءها في render() أعلى الملف). أُضيف مربع بحث فوري أعلى القائمة (id="sim-add-surah-
// search"، مفلتَر عبر handleContainerInput بلا إعادة رسم — 114 بطاقة كتير للتصفح بالعين بس)،
// والبطاقات نفسها أصبحت تعرض رقم السورة مع اسمها (بنفس أسلوب "رقم. اسم" المستخدم فعلاً في
// dualtests/dual-test-setup.js لقوائم السور المنسدلة هناك، لسهولة تمييز السور المتشابهة
// الاسم). action الضغط تغيّر من 'add-group' المباشر إلى 'add-group-pick-surah' الجديد —
// يفتح تفصيل السورة أولاً بدل القفز لفورم فارغ (راجع renderSurahDetailHTML).
function renderSurahPickerForAddHTML(surahList) {
    if (!surahList || surahList.length === 0) {
        return `<div class="sim-empty">${t('sim_no_data')}</div>`;
    }
    const cards = surahList.map(s => `
        <button class="sim-card sim-surah-card" data-action="add-group-pick-surah" data-surah="${s.number}">
            <span class="sim-surah-name">${s.number}. ${s.name}</span>
        </button>`).join('');
    return `
        <div class="sim-add-search-wrap">
            <input type="text" id="sim-add-surah-search" class="sim-form-input" placeholder="${escapeAttr(t('sim_add_surah_search_placeholder'))}" autocomplete="off">
        </div>
        <div class="sim-grid sim-grid-surahs" id="sim-add-surah-grid">${cards}</div>`;
}

// 🌟 [محذوف] renderAmmaChoiceHTML حُذفت — لم تعد شاشة اختيار "السور/الكلمات" لجزء عمّ موجودة
// في التنقل الفعلي (راجع تعليق طلب المعلم أعلى هذا الملف). مفاتيح i18n المرتبطة بها
// (sim_amma_choice_subtitle, sim_amma_btn_surahs, sim_amma_btn_words) أُبقيت بلا حذف في
// core/i18n.js بنفس فلسفة الإبقاء على sim_game_toast_soon سابقاً — غير مستخدمة حالياً فقط. 🌟

function renderSurahListHTML(surahList, scope) {
    if (!surahList || surahList.length === 0) {
        return `<div class="sim-empty">${t('sim_no_data')}</div>`;
    }
    const cards = surahList.map(s => {
        const count = allSimilarities.filter(r => r.scope === scope && (r.surahs || []).includes(s.number)).length;
        return `<button class="sim-card sim-surah-card" data-action="open-surah" data-surah="${s.number}" data-scope="${scope}">
            <span class="sim-surah-name">${s.name}</span>
            <span class="sim-surah-count">${count} ${t('sim_groups_count_suffix')}</span>
        </button>`;
    }).join('');
    return `<div class="sim-grid sim-grid-surahs">${cards}</div>`;
}

function renderWordsListHTML() {
    const groups = allSimilarities
        .filter(r => r.scope === 'juzAmma')
        .sort((a, b) => groupOrderNum(a.groupId) - groupOrderNum(b.groupId));

    if (groups.length === 0) return `<div class="sim-empty">${t('sim_no_data')}</div>`;

    const cards = groups.map(g => `
        <button class="sim-card sim-word-card" data-action="open-word" data-group="${g.groupId}">
            <span class="sim-word-anchor quran-text">﴿ ${g.anchorPhrase} ﴾</span>
            <span class="sim-word-meta">${categoryLabel(g.category)} · ${(g.surahs || []).length} ${t('sim_surahs_count_suffix')}</span>
        </button>`).join('');
    return `<div class="sim-grid sim-grid-words">${cards}</div>`;
}

// 🌟 [عدّل — الجولة الثالثة] أُضيف بارامتر ثالث اختياري allowAdd — لا يؤثر إطلاقاً على مسار
// التصفح العادي (قوائم سور الأجزاء 46-77/جزء عمّ، اللي بتستدعي الدالة بلا هذا البارامتر
// فيبقى undefined/false تلقائياً، فيبقى بلا أي زر إضافة بالضبط زي قرار الجولة الثانية
// الموثّق أعلى الملف). يُمرَّر true فقط من مسار "➕ إضافة متشابهة يدويًا" الجديد (اختيار سورة
// من قائمة كل الـ114 سورة)، فيظهر زر "➕ إضافة متشابهة يدويًا لهذه السورة" — هذا هو ما يسمح
// للمعلم لاحقاً بالرجوع لنفس السورة (حتى لو خارج نطاق 46-114) لعرض/تعديل/حذف ما أضافه.
async function renderSurahDetailHTML(surahNumber, scope, allowAdd) {
    const surahInfo = (AppState.surahsData || []).find(s => s.number === surahNumber);

    const groups = allSimilarities
        .filter(r => r.scope === scope && (r.surahs || []).includes(surahNumber))
        .sort((a, b) => groupOrderNum(a.groupId) - groupOrderNum(b.groupId));

    // 🌟 [جديد — 2026-09-16، الجولة الثانية] زر "🎮 العب لعبة هذه السورة" — يحل محل زر اللعب
    // الفردي القديم على كل بطاقة (راجع تعليق طلب المعلم أعلى الملف). يظهر فقط لو فيه مجموعات
    // فعلاً (لا فائدة من زر لعبة بلا بيانات على الإطلاق).
    const gameBtnHTML = groups.length > 0
        ? `<div class="sim-game-scope-wrap"><button class="btn sim-game-scope-btn" data-action="start-game-surah" data-surah="${surahNumber}">${t('sim_start_game_surah_btn')}</button></div>`
        : '';

    // 🌟 [جديد — الجولة الثالثة] زر "➕ إضافة متشابهة يدويًا لهذه السورة" — يعيد استخدام نفس
    // action='add-group' وشكل الزر (.sim-add-group-btn) الموجودين أصلاً في renderHomeHTML
    // بلا أي تغيير في منطقهما، فقط مكان ظهور إضافي مشروط بـ allowAdd.
    const addBtnHTML = (allowAdd && scope === 'internal')
        ? `<button class="btn btn-outline sim-add-group-btn" data-action="add-group" data-surah="${surahNumber}" data-surah-name="${escapeAttr(surahInfo ? surahInfo.name : '')}">${t('sim_add_group_btn')}</button>`
        : '';

    if (groups.length === 0) {
        return {
            title: surahInfo ? surahInfo.name : '',
            subtitle: t('sim_no_data'),
            html: `<div class="sim-empty">${t('sim_no_data')}</div>${addBtnHTML}`
        };
    }

    let cardsHTML = '';
    // 🌟 عمداً بحلقة for عادية (وليس Promise.all) حتى نستفيد من التخزين المؤقت surahCache
    // بالترتيب الصحيح بلا طلبات متزامنة زائدة لنفس السورة
    for (const group of groups) {
        cardsHTML += await renderGroupCardHTML(group, scope === 'juzAmma' ? surahNumber : null);
    }

    return {
        title: surahInfo ? surahInfo.name : '',
        subtitle: `${groups.length} ${t('sim_groups_count_suffix')}`,
        html: `${gameBtnHTML}${addBtnHTML}<div class="sim-groups-list">${cardsHTML}</div>`
    };
}

// 🌟 بطاقة مجموعة متشابهات واحدة — تُستخدم في 3 أماكن: تفصيل سورة (متشابهات داخلية)،
// تفصيل سورة جزء عمّ (مع فصل "موضعها هنا" عن "وردت أيضاً في")، وتفصيل لفظ واحد من قائمة
// "الكلمات" (highlightSurah = null فيعرض كل المواضع بلا تمييز).
async function renderGroupCardHTML(group, highlightSurah) {
    let occHTML = '';

    if (highlightSurah) {
        const ownOccs = group.occurrences.filter(o => o.surahNumber === highlightSurah);
        const otherOccs = group.occurrences.filter(o => o.surahNumber !== highlightSurah);

        occHTML += `<div class="sim-own-block"><div class="sim-block-label">${t('sim_own_position_label')}</div>`;
        for (const o of ownOccs) occHTML += await renderOccurrenceHTML(o, group.scope, group.anchorPhrase);
        occHTML += `</div>`;

        if (otherOccs.length > 0) {
            occHTML += `<div class="sim-other-block"><div class="sim-block-label">${t('sim_other_surahs_label')}</div>`;
            for (const o of otherOccs) occHTML += await renderOccurrenceHTML(o, group.scope, group.anchorPhrase);
            occHTML += `</div>`;
        }
    } else {
        for (const o of group.occurrences) occHTML += await renderOccurrenceHTML(o, group.scope, group.anchorPhrase);
    }

    const noteHTML = group.distinctiveNote
        ? `<div class="sim-note">${t('sim_note_label')} ${group.distinctiveNote}</div>`
        : '';

    // 🌟 [عدّل — 2026-09-16، الجولة الثانية] بطاقات المتشابهات "اليدوية" (source==='manual')
    // تحمل شارة مميِّزة + 3 أزرار: إضافة موضع سريع (جديد)، تعديل، حذف — بطاقات بيانات الملف
    // الثابت (source==='seed') تبقى للقراءة فقط تماماً زي الأول، بلا أي تغيير في شكلها.
    // زر "➕" الجديد (quick-add-occurrence) يفتح نفس فورم التعديل مباشرة لكن مع صف موضع فارغ
    // مُضاف مسبقاً — اختصار لخطوتين كانتا منفصلتين (فتح التعديل، ثم الضغط "إضافة موضع آخر").
    const manualControlsHTML = group.source === 'manual'
        ? `<div class="sim-manual-controls">
                <span class="sim-manual-badge">${t('sim_manual_badge')}</span>
                <button type="button" class="sim-icon-btn" data-action="quick-add-occurrence" data-group="${group.groupId}" title="${t('sim_quick_add_occ_title')}">➕</button>
                <button type="button" class="sim-icon-btn" data-action="edit-group" data-group="${group.groupId}" title="${t('sim_edit_btn_title')}">✏️</button>
                <button type="button" class="sim-icon-btn sim-icon-btn-danger" data-action="delete-group" data-group="${group.groupId}" title="${t('sim_delete_btn_title')}">🗑️</button>
           </div>`
        : '';

    // 🌟 [عدّل] عنوان المجموعة (anchorPhrase) أصبح "صندوق عنوان" ذهبي مميّز بدل نص عادي
    // بين قوسين ﴿ ﴾ — بطلب صريح من المعلم ليطابق شكل عرض العبارة في مصدر الـ PDF نفسه
    // (راجع .sim-anchor-box في css/similarities.css لتفاصيل التنسيق)
    // 🌟 [محذوف — 2026-09-16، الجولة الثانية] زر "🎮 ابدأ لعبة" الفردي على كل بطاقة حُذف —
    // اللعب أصبح على مستوى السورة/الجزء بالكامل بدل مجموعة واحدة (راجع تعليق طلب المعلم أعلى
    // الملف، وزرّي sim_start_game_surah_btn/sim_start_game_juz_btn الجديدين في الشاشات
    // الأعلى مستوى: renderSurahDetailHTML وrenderSurahListHTML/renderWordsListHTML).
    return `<div class="sim-group-card">
        ${manualControlsHTML}
        <div class="sim-group-header">
            <span class="sim-anchor-box quran-text">« ${group.anchorPhrase} »</span>
            <span class="sim-cat-badge">${categoryLabel(group.category)}</span>
        </div>
        ${noteHTML}
        <div class="sim-occ-list">${occHTML}</div>
    </div>`;
}

// ============================================================
// نموذج "إضافة/تعديل متشابهة يدويًا" [جديد — 2026-09-16]
// ============================================================
// 🌟 يبني/يعيد استخدام formState (راجع تعريفه أعلى الملف) حسب params.editGroupId: أول فتح
// للنموذج (أو تغيير السورة/المجموعة المستهدَفة) يبني formState من الصفر (فارغاً للإضافة،
// أو معبّأً من بيانات المجموعة الموجودة فعلياً للتعديل)، وأي إعادة رسم لاحقة لنفس النموذج
// (بعد إضافة/حذف صف موضع) تحافظ عليه كما هو (الحقل _key هو مفتاح التفرقة بين الحالتين).
function renderGroupFormHTML(params) {
    const formKey = `${params.surahNumber}:${params.editGroupId || 'new'}`;
    if (!formState || formState._key !== formKey) {
        const existing = params.editGroupId
            ? allSimilarities.find(r => r.groupId === params.editGroupId)
            : null;
        formState = {
            _key: formKey,
            surahNumber: params.surahNumber,
            surahName: params.surahName,
            editGroupId: params.editGroupId || null,
            editDbId: existing ? existing.id : null,
            category: existing ? existing.category : 'لفظ_مشترك',
            anchorPhrase: existing ? existing.anchorPhrase : '',
            distinctiveNote: existing ? (existing.distinctiveNote || '') : '',
            occurrences: existing && existing.occurrences && existing.occurrences.length > 0
                ? existing.occurrences.map(o => ({
                    ayahNumber: o.ayahNumber || '',
                    fullText: o.fullText || '',
                    distinctiveTailWord: o.distinctiveTailWord || ''
                }))
                : [
                    { ayahNumber: '', fullText: '', distinctiveTailWord: '' },
                    { ayahNumber: '', fullText: '', distinctiveTailWord: '' }
                ]
        };
    }

    const categoryOptionsHTML = Object.keys(CATEGORY_I18N_MAP).map(cat =>
        `<option value="${cat}" ${formState.category === cat ? 'selected' : ''}>${categoryLabel(cat)}</option>`
    ).join('');

    const occurrencesHTML = formState.occurrences.map((o, idx) => `
        <div class="sim-form-occ-row" data-index="${idx}">
            <div class="sim-form-occ-row-header">
                <span class="sim-form-occ-row-title">${t('sim_ayah_word')} ${idx + 1}</span>
                ${formState.occurrences.length > 1
                    ? `<button type="button" class="sim-form-remove-occ-btn" data-action="form-remove-occurrence" data-index="${idx}">${t('sim_form_remove_occurrence_btn')}</button>`
                    : ''}
            </div>
            <label class="sim-form-label">${t('sim_form_ayah_number_label')}</label>
            <input type="number" min="1" step="1" class="sim-form-input sim-form-ayah-number" value="${escapeAttr(o.ayahNumber)}">
            <label class="sim-form-label">${t('sim_form_ayah_text_label')}</label>
            <textarea class="sim-form-input sim-form-textarea quran-text sim-form-ayah-text" dir="rtl" rows="2">${escapeHtml(o.fullText)}</textarea>
            <label class="sim-form-label">${t('sim_form_tail_word_label')}</label>
            <input type="text" class="sim-form-input quran-text sim-form-tail-word" dir="rtl" value="${escapeAttr(o.distinctiveTailWord)}">
        </div>`).join('');

    return `<div class="sim-form">
        <label class="sim-form-label">${t('sim_form_category_label')}</label>
        <select id="sim-form-category" class="sim-form-input">${categoryOptionsHTML}</select>

        <label class="sim-form-label">${t('sim_form_anchor_label')}</label>
        <input type="text" id="sim-form-anchor" class="sim-form-input quran-text" dir="rtl" placeholder="${escapeAttr(t('sim_form_anchor_placeholder'))}" value="${escapeAttr(formState.anchorPhrase)}">

        <label class="sim-form-label">${t('sim_form_note_label')}</label>
        <input type="text" id="sim-form-note" class="sim-form-input" value="${escapeAttr(formState.distinctiveNote)}">

        <div class="sim-form-occurrences">
            <div class="sim-form-occurrences-label">${t('sim_form_occurrences_label')}</div>
            ${occurrencesHTML}
        </div>
        <button type="button" class="btn btn-outline sim-form-add-occ-btn" data-action="form-add-occurrence">${t('sim_form_add_occurrence_btn')}</button>

        <div class="sim-form-actions">
            <button type="button" class="btn sim-form-save-btn" data-action="form-save">${t('sim_form_save_btn')}</button>
            <button type="button" class="btn btn-outline sim-form-cancel-btn" data-action="form-cancel">${t('sim_form_cancel_btn')}</button>
            ${formState.editDbId ? `<button type="button" class="btn btn-wrong sim-form-delete-btn" data-action="form-delete">${t('sim_form_delete_group_btn')}</button>` : ''}
        </div>
    </div>`;
}

// 🌟 موضع واحد داخل مجموعة متشابهات. للمتشابهات الداخلية (ayahNumber مفرد) نحاول جلب
// النص الرسمي من QuranEngine أولاً (أدق من fullText المُفرَّغ يدوياً)، ونرجع لـ fullText
// تلقائياً لو تعذّر ذلك.
async function renderOccurrenceHTML(o, scope, anchorPhrase) {
    let text = o.fullText;
    if (scope === 'internal' && o.ayahNumber) {
        const officialText = await getOfficialAyahText(o.surahNumber, o.ayahNumber);
        if (officialText) text = officialText;
    }
    const tailHTML = o.distinctiveTailWord
        ? `<div class="sim-tail-diff">${t('sim_tail_diff_label')} ${o.distinctiveTailWord}</div>`
        : '';

    // 🌟 [عدّل] شكل عرض الآية أصبح موحّداً بالكامل على كل المتشابهات (داخلية وجزء عمّ) —
    // بطلب صريح من المعلم "يجب تطبيق مثل هذا على كل المتشابهات": كل آية تُعرض بدون قوسين
    // ﴿ ﴾، ودائرة خضراء برقمها **قبل** نصها (تظهر بصرياً يمين السطر، اتجاه RTL)، ونص العبارة
    // المشتركة داخلها مُظلَّل بالأصفر (highlightAnchorInText).
    //   • موضع برقم آية مفرد (ayahNumber — أغلب المتشابهات الداخلية): آية واحدة، دائرة واحدة.
    //   • موضع بنطاق آيات (ayahRange — قسم جزء عمّ فقط): يُقسَّم عبر splitRangeFullTextIntoAyahs
    //     أعلاه لعدة آيات، كل واحدة بدائرتها الخاصة — بنفس شكل الآية المفردة بالضبط، فيبقى
    //     شكل رقم الآية موحّداً في كل شاشات ركن المتشابهات بلا استثناء.
    if (o.ayahNumber) {
        const highlightedText = highlightAnchorInText(text, anchorPhrase);
        return `<div class="sim-occ sim-occ-single">
            <div class="sim-occ-text quran-text"><span class="sim-ayah-badge">${o.ayahNumber}</span>${highlightedText}</div>
            <div class="sim-occ-meta">${o.surahName || ''}</div>
            ${tailHTML}
        </div>`;
    }

    const ayahs = splitRangeFullTextIntoAyahs(text);
    const ayahsHTML = ayahs.map(a => {
        const highlighted = highlightAnchorInText(a.text, anchorPhrase);
        const badgeHTML = a.ayahNumber ? `<span class="sim-ayah-badge">${a.ayahNumber}</span>` : '';
        return `<div class="sim-occ-text quran-text">${badgeHTML}${highlighted}</div>`;
    }).join('');

    return `<div class="sim-occ sim-occ-single sim-occ-multi">
        <div class="sim-occ-ayah-group">${ayahsHTML}</div>
        <div class="sim-occ-meta">${o.surahName || ''} — ${o.ayahRange || ''}</div>
        ${tailHTML}
    </div>`;
}
