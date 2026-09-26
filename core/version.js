// core/version.js
// 🌟 مصدر واحد لرقم إصدار المنصة وسجل التحديثات (Changelog) — يستخدمه core/app.js
// لمعرفة هل المعلم فاته تحديثات على هذا الجهاز بالذات (المقارنة محلية عبر localStorage،
// مش سحابية، لأن المنصة لمعلم واحد بلا حسابات متعددة). لاحقاً، لما يتفعّل Service Worker
// تاني بعد انتهاء التطوير (شوف التعليق في index.html)، يُفضَّل يقرأ CACHE_NAME من نفس
// APP_VERSION هنا بدل رقم منفصل، حتى لا يُنسى رفعه يدوياً في مكانين مختلفين. 🌟

// 🌟 ارفع هذا الرقم مع كل تحديث فعلي تنزّله، وضيف عنصر جديد أول مصفوفة CHANGELOG تحته
// (الأحدث دائماً في الأعلى). النظام تلقائياً هيجمع كل الإصدارات اللي فاتت المعلم منذ آخر
// مرة فتح فيها المنصة على هذا الجهاز، مش بس آخر إصدار. 🌟
export const APP_VERSION = '1.0.5';

// كل عنصر تغيير: type من ('new' | 'improved' | 'fixed') + نص ثنائي اللغة {ar, en}.
// ⚠️ افتراض صريح: هذه ليست مفاتيح i18n.js عمداً — لأنها محتوى تاريخي متراكم يكبر مع كل
// إصدار (لو حُطّت في i18n.js هتتضخّم قائمة الترجمة للأبد بمفاتيح قديمة لن تُستخدم تاني).
// النصوص الثابتة فقط (عنوان الشاشة، زر الإغلاق، تسميات التصنيفات) موجودة في i18n.js كالمعتاد.
export const CHANGELOG = [
    // 🌟🌟 [أُضيف 2026-09-25] دمج نظام الواجبات الجديد (خادم Google Apps Script بدل Firebase/App Check) بعد اختباره
    // في "معمل الواجبات" على الخادم الحقيقي. راجع مستند "تدقيق نظام الواجبات — الأسباب الجذرية وخطة الدمج".
    {
        version: '1.0.5',
        date: '2026-09-25',
        items: [
            {
                type: 'new',
                ar: 'نظام الواجبات المنزلية الجديد: رابط الواجب لا يظهر إلا بعد تأكيد الخادم حفظه، ولا تظهر للطالب رسالة "وصل واجبك" إلا بعد تأكيد الخادم استلام إجاباته وحفظها. لو انقطع الإنترنت تبقى إجابات الطالب محفوظة على جهازه ويُعاد إرسالها دون تكرار.',
                en: 'New homework system: the share link only appears after the server confirms it saved the homework, and students only see "delivered" after the server confirms it received and stored their answers. If the internet drops, answers stay saved on the student\'s device and are re-sent without duplicates.'
            },
            {
                type: 'fixed',
                ar: 'نتيجة الواجب المعتمدة تُكتب الآن في سجل الطالب الحقيقي عند المعلم (كانت تُكتب على هاتف الطالب ولا تصل). ورابط الواجب لم يعد يحتوي الإجابات الصحيحة، وتصحيح الأسئلة الآلية يتم في الخادم. ملاحظة: التسجيل الصوتي في الواجبات غير متاح حالياً.',
                en: 'Approved homework results are now written to the real student record on the teacher\'s device (they used to be written on the student\'s phone and never arrived). The homework link no longer contains the correct answers, and auto-graded questions are graded on the server. Note: voice-recording questions are temporarily unavailable in homework.'
            }
        ]
    },
    // 🌟🌟 [أُضيف 2026-09-24] إصلاح جوهري لمشكلة كانت موجودة منذ إنشاء نظام الواجبات: تعارض
    // بين نوع حماية App Check المسجَّل في Firebase (Enterprise) والنوع المستخدم فعلياً في الكود
    // (v3 العادي)، كان يرفض تلقائياً أغلب طلبات الرفع للسحابة — بالإضافة لصورة الطالب الكاملة
    // كانت تُرسَل مع كل واجب مخصَّص من غير داعٍ فتزيد فرصة الرفض. راجع الشرح الكامل بجانب
    // RECAPTCHA_ENTERPRISE_SITE_KEY في core/firebase.js ودليل-تفعيل-App-Check.md المحدَّث. 🌟🌟
    {
        version: '1.0.4',
        date: '2026-09-24',
        items: [
            {
                type: 'fixed',
                ar: 'إصلاح مشكلة كانت تمنع وصول بعض الواجبات المنشورة وتسليمات الطلاب إلى السحابة بشكل دائم، فيظهر للطالب أن الواجب "غير موجود" رغم نشره فعلاً من المعلم.',
                en: 'Fixed an issue that permanently prevented some published homework and student submissions from reaching the cloud, causing students to see "homework not found" even though the teacher had published it.'
            },
            {
                type: 'improved',
                ar: 'إعادة محاولة تلقائية لرفع أي واجب أو نتيجة طالب فشل إرسالها للسحابة — عند عودة الاتصال بالإنترنت أو إعادة فتح شاشة الواجبات — بالإضافة لزر "إعادة المحاولة الآن" اليدوي، وعلامة تنبيه واضحة في سجل الواجبات لأي واجب لم يصل للسحابة بعد.',
                en: 'Added automatic retry for any homework or student result that failed to reach the cloud — once your connection returns or you reopen the homework screen — plus a manual "Retry Now" button and a clear warning badge in the homework log for anything still pending.'
            }
        ]
    },
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
