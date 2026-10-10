// core/version.js
// 🌟 مصدر واحد لرقم إصدار المنصة وسجل التحديثات (Changelog) — يستخدمه core/app.js
// لمعرفة هل المعلم فاته تحديثات على هذا الجهاز بالذات (المقارنة محلية عبر localStorage،
// مش سحابية، لأن المنصة لمعلم واحد بلا حسابات متعددة). لاحقاً، لما يتفعّل Service Worker
// تاني بعد انتهاء التطوير (شوف التعليق في index.html)، يُفضَّل يقرأ CACHE_NAME من نفس
// APP_VERSION هنا بدل رقم منفصل، حتى لا يُنسى رفعه يدوياً في مكانين مختلفين. 🌟

// 🌟 ارفع هذا الرقم مع كل تحديث فعلي تنزّله، وضيف عنصر جديد أول مصفوفة CHANGELOG تحته
// (الأحدث دائماً في الأعلى). النظام تلقائياً هيجمع كل الإصدارات اللي فاتت المعلم منذ آخر
// مرة فتح فيها المنصة على هذا الجهاز، مش بس آخر إصدار. 🌟
export const APP_VERSION = '1.0.14';

// كل عنصر تغيير: type من ('new' | 'improved' | 'fixed') + نص ثنائي اللغة {ar, en}.
// ⚠️ افتراض صريح: هذه ليست مفاتيح i18n.js عمداً — لأنها محتوى تاريخي متراكم يكبر مع كل
// إصدار (لو حُطّت في i18n.js هتتضخّم قائمة الترجمة للأبد بمفاتيح قديمة لن تُستخدم تاني).
// النصوص الثابتة فقط (عنوان الشاشة، زر الإغلاق، تسميات التصنيفات) موجودة في i18n.js كالمعتاد.
export const CHANGELOG = [
    // 📅 [أُضيف 2026-10-10] أسئلة المتشابهات في الواجب الذكي
    {
        version: '1.0.14',
        date: '2026-10-10',
        items: [
            {
                type: 'new',
                ar: 'الواجب الذكي يضم الآن أسئلة من «المتشابهات» المرفوعة على المنصة بواقع سؤال لكل 10 أسئلة (10 → 1، 20 → 2...) وتُضاف فوق عدد الأسئلة المطلوب: يُختاران من مجموعات متشابهات محفوظة بالكامل عند الطالب وداخل النطاق المحدد للواجب، بصيغة اختيار من متعدد تُصحَّح آلياً.',
                en: 'Smart homework now includes questions from the platform\'s similar-verses (mutashabihat) data, one per 10 questions (10 → 1, 20 → 2...), added on top of the requested count: they come from groups the student has fully memorized within the homework scope, as auto-graded multiple choice.'
            }
        ]
    },
    // 📅 [أُضيف 2026-10-08] تذكير الواجب الأسبوعي وجدول الأسبوع
    {
        version: '1.0.13',
        date: '2026-10-08',
        items: [
            {
                type: 'new',
                ar: 'تذكير الواجب الأسبوعي في «مهام اليوم»: لكل طالب يومان في الأسبوع يوزّعهما النظام تلقائياً (السبت إلى الخميس) بفاصل يومين على الأقل وبلا ازدحام على المعلم. يظهر الطالب يوم موعده ثم متأخراً يوماً بيوم حتى تنشر له واجباً فيختفي تلقائياً، وزر «⏭ رحّل لغد» لتأجيله.',
                en: 'Weekly homework reminders in "Today\'s tasks": each student gets two days a week assigned automatically (Saturday to Thursday), at least two days apart and without crowding your days. A student shows up on their day, then late day by day until you publish their homework, and it disappears by itself; "⏭ Postpone" delays it.'
            },
            {
                type: 'new',
                ar: 'شاشة «📅 جدول الأسبوع»: أيام العمل في أعمدة وطلابها في صفوف، وفوق كل يوم عدد واجباته مقابل الطاقة المتوازنة (إجمالي الخانات ÷ أيام العمل)؛ عدّل يوم أي طالب بنقرة، أو أوقف تذكيره، أو اضغط «وزّع تلقائياً». وعند أول تشغيل يُوزَّع طلابك الحاليون تلقائياً، والطالب الجديد يُضاف لأقل الأيام ازدحاماً.',
                en: 'A "📅 Weekly schedule" screen: work days as columns and students as rows, with each day\'s load against the balanced capacity (total slots ÷ work days). Change any student\'s day with a tap, pause their reminders, or press "Auto-distribute". Your current students are distributed automatically on first run and a new student is placed on the least busy days.'
            },
            {
                type: 'improved',
                ar: 'تنبيه الازدحام: إذا زاد عدد الواجبات المنتظرة اليوم عن طاقتك الموزَّعة يظهر تنبيه لترحّل ما تشاء لغد. وحساب دورة المراجعة صار يعتمد على عدد مرات كل طالب الفعلي بدل رقم ثابت.',
                en: 'Crowding warning: if more homeworks are waiting today than your balanced capacity, a warning lets you postpone some. The review-cycle maths now uses each student\'s actual weekly count instead of a fixed number.'
            }
        ]
    },
    // 🗺️ [أُضيف 2026-10-08] خريطة الحفظ بالأحزاب وتغطية النطاق في الواجب الذكي
    {
        version: '1.0.12',
        date: '2026-10-08',
        items: [
            {
                type: 'new',
                ar: 'خريطة حفظ الطالب عند إعداد الواجب: أحزاب (أو أرباع لحفظ صغير) من الناس صعوداً بلون وآخر فحص وأخطاء كل منها. اختر «كل النطاق» أو أحزاباً محددة أو عدة سور، أو اضغط «اقترح لي» ليختار الأحوج للفحص.',
                en: 'A memorization map when preparing homework: hizbs (or quarters for a small range) from An-Nas upward, each with its status, last check and mistakes. Choose the whole range, chosen hizbs or several surahs, or press "Suggest" to pick what needs checking most.'
            },
            {
                type: 'new',
                ar: 'سطر تغطية ذكي تحت عدد الأسئلة: كم يغطي الواجب من المختار، وكم سؤالاً يلزم لتغطيته كله، وفي المرة القادمة يقترح «أكمل» لما تبقّى من الواجب السابق. مدة دورة المراجعة قابلة للتعديل (افتراضياً 6 أسابيع).',
                en: 'A smart coverage line under the question count: how much of the selection the homework covers and how many questions would cover it all; next time it suggests "Continue" for what is left of the last homework. The review cycle length is editable (6 weeks by default).'
            },
            {
                type: 'improved',
                ar: 'الاختيار المحدد يغطي مقاطع مختلفة بدل تكرار المقطع نفسه، وما أُسند في واجب لم يُسلَّم بعد يتأخر في الواجب التالي.',
                en: 'A chosen range now spreads over different segments instead of repeating the same one, and what was assigned in a not-yet-submitted homework is postponed in the next one.'
            }
        ]
    },
    // 🧠 [أُضيف 2026-10-08] الواجب الذكي: واجب لكل طالب يُبنى على نطاق حفظه وأخطائه + ملف مهارات متتبَّع
    {
        version: '1.0.11',
        date: '2026-10-08',
        items: [
            {
                type: 'new',
                ar: 'الواجب الذكي: كل واجب يُبنى لطالب محدد على نطاق حفظه (من الناس إلى موضع توقّفه): حفظ جديد، مراجعة قريبة وبعيدة، وأسئلة علاجية من أخطائه السابقة بصيغة مختلفة — والأسئلة مخلوطة وليست بترتيب المصحف. لم يعد هناك اختيار سورة/جزء عام ولا رابط عام.',
                en: 'Smart homework: every homework is built for one student on their memorization range (from An-Nas to where they stopped): new memorization, recent and older review, and remedial questions from past mistakes in a different format — shuffled, not in Mushaf order. The generic surah/juz choice and the public link are gone.'
            },
            {
                type: 'new',
                ar: 'ملف مهارات الطالب (من ملفه الشخصي أو شاشة الواجب): دقة 7 مهارات، تشخيص تلقائي (ضعف مهارة أم ضعف موضع)، جودة الأداء من تسجيلاتك، خريطة إتقان المقاطع. ويظهر ملخصه في التقرير الشهري.',
                en: 'Student skills profile (from their profile or the homework screen): accuracy in 7 skills, automatic diagnosis (a weak skill or a weak spot), performance quality from your notes, and a segment mastery map. A summary also appears in the monthly report.'
            },
            {
                type: 'new',
                ar: 'سؤال جديد: «هذه الآية في الصفحة اليمنى أم اليسرى؟» (الذاكرة البصرية) مع تنبيه الطالب بعدم فتح المصحف.',
                en: 'New question: "Is this ayah on the right or left page?" (visual memory) with a reminder not to open the Mushaf.'
            },
            {
                type: 'improved',
                ar: 'تنبيه تحديث موضع الحفظ الشهري عند إنشاء الواجب وفي «مهام اليوم» لمن مضى على موضعه أكثر من 30 يوماً. ويُبنى ملف التتبّع تلقائياً من بيانات كل طالب الحالية (الواجبات المعتمدة وقائمة الأخطاء وأرشيفها).',
                en: 'A reminder to update the monthly memorization position when creating homework and in "Today\'s tasks" when it is over 30 days old. The tracking file is built automatically from each student\'s existing data (approved homework, mistakes list and archive).'
            }
        ]
    },
    // 🏅 [أُضيف 2026-10-06] الشهادات والتقارير: 40 قالباً + نصوص ثنائية اللغة + أرشيف التقارير + جولة إرشادية
    {
        version: '1.0.10',
        date: '2026-10-06',
        items: [
            {
                type: 'new',
                ar: 'زر «الشهادات والتقارير» في الشاشة الرئيسية: 40 قالباً احترافياً و9 أنواع شهادات جاهزة (إتمام سورة/جزء/نصف جزء، التميز في المراجعة، ختم القرآن، التجويد، طالب الشهر...) بصيغ تراعي المذكر والمؤنث، ومعاينة حية، وحفظ كصورة أو PDF أو مشاركة واتساب.',
                en: 'A new "Certificates & Reports" button on the home screen: 40 professional templates and 9 ready-made certificate types (surah/juz/half-juz completion, review excellence, Qur\'an completion, Tajweed, student of the month...) with gender-aware wording, live preview, and saving as image/PDF or sharing on WhatsApp.'
            },
            {
                type: 'new',
                ar: 'الشهادة تُصدَر بالعربية أو الإنجليزية (تختارها بشكل مستقل عن لغة المنصة)، وبقية الشاشة مترجمة بالكامل.',
                en: 'Certificates can be issued in Arabic or English (chosen independently of the platform language), and the whole screen is fully translated.'
            },
            {
                type: 'new',
                ar: 'التقارير السابقة: كل تقرير تصدّره (تقييم فردي، اختبار ثنائي، تقرير شهري) يُحفظ تلقائياً لتعرضه أو تعيد تنزيله أو مشاركته لاحقاً. وسجل للشهادات الصادرة قابل للبحث والتعديل.',
                en: 'Past reports: every report you export (individual, dual test, monthly) is saved automatically so you can view, re-download or share it later. Plus a searchable, editable log of issued certificates.'
            },
            {
                type: 'new',
                ar: 'جولة إرشادية جديدة تشرح شاشة الشهادات والتقارير خطوة بخطوة.',
                en: 'A new guided tour walks you through the Certificates & Reports screen step by step.'
            }
        ]
    },
    // 🌟🌟 [أُضيف 2026-10-01] ترتيب الرئيسية + توحيد المصطلحات + تحسينات سجل الواجبات
    {
        version: '1.0.8',
        date: '2026-10-01',
        items: [
            {
                type: 'improved',
                ar: 'الشاشة الرئيسية: صف أول بثلاث بطاقات متساوية (طلابي — الكبار — الأطفال)، ثم الواجبات والاختبارات الثنائية، وفي الأخير المتشابهات والتجويد. وتظهر بطاقة "ابدأ من هنا" للمعلم الجديد فقط حتى يضيف أول طالب.',
                en: 'Home screen: a first row of three equal cards (My Students — Adults — Kids), then Homework and Dual Tests, with Similarities and Tajweed last. A "Start here" card shows only for a new teacher until the first student is added.'
            },
            {
                type: 'improved',
                ar: 'سجل الواجبات: زر "نشر" للمسودات، ونص تحت كل أيقونة (النتائج / نسخ الرابط / حذف)، وزر الحذف منفصل. ورسالة نسخ الرابط صارت "تم نسخ الرابط".',
                en: 'Homework history: a "Publish" button for drafts, a short label under each icon (Results / Copy link / Delete), and the delete button set apart. Copying a link now says "Link copied".'
            },
            {
                type: 'improved',
                ar: 'توحيد المصطلحات: "طالب" بدل "بطل" في الإدارة والسجلات، و"علاج الأخطاء" لكل ما يخص معالجة الأخطاء السابقة. وزر التقرير صار "العودة للوحة التقييم" لأنه يفتحها فعلاً.',
                en: 'Consistent wording: "Student" instead of "Champion" in management screens, and "Fix mistakes" for everything about previous mistakes. The report button now reads "Back to evaluation panel", which is where it goes.'
            }
        ]
    },
    // 🌟🌟 [أُضيف 2026-10-01] تحسينات سهولة الاستخدام بعد فحص رحلة المعلم
    {
        version: '1.0.7',
        date: '2026-10-01',
        items: [
            {
                type: 'improved',
                ar: 'اختيار الطالب للتقييم: اكتب أي حرف من اسمه فتظهر الأسماء المطابقة وتضيق مع كل حرف، ثم اضغط على الاسم المطلوب.',
                en: 'Choosing a student for evaluation: type any letter of the name to see matching names, narrowing with every letter, then tap the one you want.'
            },
            {
                type: 'new',
                ar: 'زر "ابدأ تقييم" في سجل الطلاب وفي ملف الطالب، وزر "تقييم طالب آخر" في شريط التقرير.',
                en: 'A "Start evaluation" button in the students list and student profile, and an "Evaluate another student" button in the report toolbar.'
            },
            {
                type: 'improved',
                ar: 'إضافة طالب: الاسم وحده هو المطلوب، وباقي الحقول موسومة "اختياري". وعلى الهاتف تظهر بطاقات الأقسام قبل "نظرة سريعة"، وتظهر بوابة المعلم بزر جوجل وحده.',
                en: 'Adding a student: only the name is required, other fields are marked "optional". On phones the section cards now appear before "Quick view", and the teacher gate shows the Google button alone.'
            }
        ]
    },
    // 🌟🌟 [أُضيف 2026-09-27] نظام تحليلات خصوصي (Plausible) — راجع core/analytics.js
    {
        version: '1.0.6',
        date: '2026-09-27',
        items: [
            {
                type: 'new',
                ar: 'تحليلات زوار خصوصية بسيطة (عدد الزوار، الأجهزة، الصفحات الأكثر زيارة، وتقدير تثبيتات PWA) عبر لوحة Plausible الخاصة بك فقط — لا تظهر أي أرقام داخل المنصة نفسها، ولا يُرسَل أي اسم أو درجة أو بيانات طالب.',
                en: 'Simple, privacy-friendly visitor analytics (visitor counts, devices, top pages, and estimated PWA installs) via your own private Plausible dashboard only — no numbers appear inside the platform itself, and no names, scores, or student data are ever sent.'
            }
        ]
    },
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
