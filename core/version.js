// core/version.js
// 🌟 مصدر واحد لرقم إصدار المنصة وسجل التحديثات (Changelog) — يستخدمه core/app.js
// لمعرفة هل المعلم فاته تحديثات على هذا الجهاز بالذات (المقارنة محلية عبر localStorage،
// مش سحابية، لأن المنصة لمعلم واحد بلا حسابات متعددة). لاحقاً، لما يتفعّل Service Worker
// تاني بعد انتهاء التطوير (شوف التعليق في index.html)، يُفضَّل يقرأ CACHE_NAME من نفس
// APP_VERSION هنا بدل رقم منفصل، حتى لا يُنسى رفعه يدوياً في مكانين مختلفين. 🌟

// 🌟 ارفع هذا الرقم مع كل تحديث فعلي تنزّله، وضيف عنصر جديد أول مصفوفة CHANGELOG تحته
// (الأحدث دائماً في الأعلى). النظام تلقائياً هيجمع كل الإصدارات اللي فاتت المعلم منذ آخر
// مرة فتح فيها المنصة على هذا الجهاز، مش بس آخر إصدار. 🌟
export const APP_VERSION = '1.0.3';

// كل عنصر تغيير: type من ('new' | 'improved' | 'fixed') + نص ثنائي اللغة {ar, en}.
// ⚠️ افتراض صريح: هذه ليست مفاتيح i18n.js عمداً — لأنها محتوى تاريخي متراكم يكبر مع كل
// إصدار (لو حُطّت في i18n.js هتتضخّم قائمة الترجمة للأبد بمفاتيح قديمة لن تُستخدم تاني).
// النصوص الثابتة فقط (عنوان الشاشة، زر الإغلاق، تسميات التصنيفات) موجودة في i18n.js كالمعتاد.
export const CHANGELOG = [
    // 🌟 [أُضيف 2026-09-18] الإصدار 1.0.3 يجمع كل التعديلات المتراكمة منذ 1.0.0 (كانت
    // موزّعة على أكثر من رفعة سابقة بلا ترقيم مستقل لكل واحدة) 🌟
    {
        version: '1.0.3',
        date: '2026-09-18',
        items: [
            {
                type: 'new',
                ar: 'تلميحات وتنبيهات تظهر تلقائياً مرة واحدة عند أول دخول لكل قسم (تسجيل الدخول، واجهة الكبار، ركن الأطفال، الواجبات، الاختبارات الثنائية، ركن المتشابهات) لتوضيح طريقة الاستخدام.',
                en: 'One-time hints and notices that appear automatically the first time you open each section (login, adult interface, kids corner, homework, dual tests, similarities corner) to explain how it works.'
            },
            {
                type: 'new',
                ar: 'تقرير مواجهة كامل ومفصّل للاختبارات الثنائية — يعرض كل سؤال أُجيب عنه فعلياً لكل طالب بدرجته وأخطائه، مع سجل جديد للرجوع إلى تقارير المباريات السابقة.',
                en: 'A full, detailed match report for dual tests — showing every question each student actually answered with their score and mistakes, plus a new log to look back at previous match reports.'
            },
            {
                type: 'improved',
                ar: 'إعادة تصميم بصري لشاشة لعب الاختبارات الثنائية (ملء الشاشة الفعلي وإضافات تمييز)، وإزالة إشارة "قيد التطوير" من بطاقة الاختبارات الثنائية بعد اكتمال أساسياتها.',
                en: 'Visual redesign of the dual test play screen (true fullscreen plus highlighting additions), and removal of the "in development" badge from the dual tests card now that its core features are complete.'
            }
        ]
    },
    {
        version: '1.0.0',
        date: '2026-09-14',
        items: [
            {
                type: 'new',
                ar: 'شاشة "الجديد في هذا التحديث" — تظهر تلقائياً مرة واحدة بعد كل تحديث فعلي لتعرّفك بآخر التطويرات.',
                en: 'New "What\'s New" screen — appears automatically once after each real update to keep you informed.'
            }
        ]
    }
    // 🌟 أضِف هنا عنصر { version, date, items } جديد فوق هذا السطر مع كل تحديث قادم 🌟
];

// مقارنة رقمين إصدار بصيغة x.y.z بدون أي مكتبة خارجية — ترجع رقم موجب لو a أحدث من b،
// سالب لو أقدم، وصفر لو متطابقين
export function compareVersions(a, b) {
    const partsA = String(a).split('.').map(n => parseInt(n, 10) || 0);
    const partsB = String(b).split('.').map(n => parseInt(n, 10) || 0);
    const len = Math.max(partsA.length, partsB.length);

    for (let i = 0; i < len; i++) {
        const diff = (partsA[i] || 0) - (partsB[i] || 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

// 🌟 يرجع كل عناصر CHANGELOG الأحدث من lastSeenVersion (الأحدث أولاً) — لو lastSeenVersion
// فارغ يرجع كل السجل. تُستخدم من core/app.js لمعرفة إيه اللي يستاهل يتعرض للمعلم 🌟
export function getUnseenChangelog(lastSeenVersion) {
    if (!lastSeenVersion) return CHANGELOG.slice();
    return CHANGELOG.filter(entry => compareVersions(entry.version, lastSeenVersion) > 0);
}
