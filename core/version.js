// core/version.js
// 🌟 مصدر واحد لرقم إصدار المنصة وسجل التحديثات (Changelog) — يستخدمه core/app.js
// لمعرفة هل المعلم فاته تحديثات على هذا الجهاز بالذات (المقارنة محلية عبر localStorage،
// مش سحابية، لأن المنصة لمعلم واحد بلا حسابات متعددة). لاحقاً، لما يتفعّل Service Worker
// تاني بعد انتهاء التطوير (شوف التعليق في index.html)، يُفضَّل يقرأ CACHE_NAME من نفس
// APP_VERSION هنا بدل رقم منفصل، حتى لا يُنسى رفعه يدوياً في مكانين مختلفين. 🌟

// 🌟 ارفع هذا الرقم مع كل تحديث فعلي تنزّله، وضيف عنصر جديد أول مصفوفة CHANGELOG تحته
// (الأحدث دائماً في الأعلى). النظام تلقائياً هيجمع كل الإصدارات اللي فاتت المعلم منذ آخر
// مرة فتح فيها المنصة على هذا الجهاز، مش بس آخر إصدار. 🌟
export const APP_VERSION = '1.0.33';

// كل عنصر تغيير: type من ('new' | 'improved' | 'fixed') + نص ثنائي اللغة {ar, en}.
// ⚠️ افتراض صريح: هذه ليست مفاتيح i18n.js عمداً — لأنها محتوى تاريخي متراكم يكبر مع كل
// إصدار (لو حُطّت في i18n.js هتتضخّم قائمة الترجمة للأبد بمفاتيح قديمة لن تُستخدم تاني).
// النصوص الثابتة فقط (عنوان الشاشة، زر الإغلاق، تسميات التصنيفات) موجودة في i18n.js كالمعتاد.
export const CHANGELOG = [
    {
        version: '1.0.33',
        date: '2026-10-17',
        items: [
            { type: 'fixed', text: { ar: 'الواجب الصعب: خيارات «الخاتمة الدقيقة» صارت كلها خواتيم آيات حقيقية بلا أي تعديل في نصها، ولا تتكرر.', en: 'Hard homework: ending options are now all real, unmodified ayah endings, with no near-duplicates.' } },
            { type: 'improved', text: { ar: 'سؤال الترتيب: عدّاد وتلوين يبيّنان للطالب كم آية رتّبها وهل أتمّ الكل.', en: 'Ordering question: a counter and row highlights show the student how many ayahs are ordered.' } },
            { type: 'fixed', text: { ar: 'التسليمات المعتمدة التي لم تُكتب في سجل الطالب تظهر بعلامة ⚠️ وزر «سجّل الآن».', en: 'Approved submissions missing from the student record now show a warning and a "record now" button.' } }
        ]
    },
    // 📅 [أُضيف 2026-10-16] إيقاف مزامنة الأجهزة
    {
        version: '1.0.32',
        date: '2026-10-16',
        items: [
            {
                type: 'improved',
                ar: 'أُوقفت «مزامنة الأجهزة» وأُخفي زرها: النسخ الاحتياطي على Google Drive مع الاستعادة على أي جهاز جديد يؤدي الغرض نفسه بحماية أقوى. بياناتك على جهازك كما هي ولم تتأثر.',
                en: 'Device sync was turned off and its button hidden: Google Drive backup with restore on any new device serves the same purpose with stronger protection. Your data on this device is unchanged.'
            }
        ]
    },
    // 📅 [أُضيف 2026-10-16] شاشة «حسابي والنسخ الاحتياطي»
    {
        version: '1.0.31',
        date: '2026-10-16',
        items: [
            {
                type: 'new',
                ar: 'شاشة جديدة «حسابي والنسخ الاحتياطي» تجمع كل شيء في مكان واحد: بطاقة «سلامة بياناتك» (محمية / تحتاج نسخة / لا توجد نسخة)، ونسخ Google Drive، ونسخة الجهاز والاستعادة الآمنة والتراجع، ومزامنة الأجهزة وحساب الواجبات. تفتحها من زر «حسابي والنسخ» في الرئيسية أو أيقونة الحساب في الترويسة أو لوحة «المزيد»، وتظهر نقطة تنبيه حين تحتاج بياناتك نسخة جديدة.',
                en: 'New "My account & backup" screen with everything in one place: a data-safety card (protected / needs a backup / no backup), Google Drive backup, device backup with safe restore and undo, and device sync & homework account. Open it from the "Account & backup" button on the home screen, the account icon in the header, or the "More" panel; a dot appears when your data needs a fresh backup.'
            },
            {
                type: 'improved',
                ar: 'حساب Google واحد: عند ربط Drive تُقترح عليك Google حساب الواجبات نفسه، ويمكنك تغيير حساب Drive عند الحاجة (نسخك القديمة تبقى في الحساب السابق).',
                en: 'One Google account: when you connect Drive, Google is asked to use your homework account; you can change the Drive account if needed (your old backups stay in the previous account).'
            }
        ]
    },
    // 📅 [أُضيف 2026-10-16] النسخ الاحتياطي على Google Drive (تجريبي)
    {
        version: '1.0.30',
        date: '2026-10-16',
        items: [
            {
                type: 'new',
                ar: 'نسخة احتياطية على Google Drive الخاص بك (من نافذة ملف المعلم): تُحفظ مضغوطة في مساحة مخفية خاصة بالمنصة داخل حسابك، ويُتحقق منها قبل حذف أي نسخة قديمة، مع الاحتفاظ بآخر النسخ تلقائياً، واختيار نسخ تلقائي مرة كل يوم، واسترجاع من أي نسخة (حتى على جهاز جديد). ما زالت تجريبية لحسابات التجربة فقط.',
                en: 'Backup to your own Google Drive (from the teacher profile window): saved compressed in a hidden space reserved for the platform inside your account, verified before any old backup is removed, with recent backups kept automatically, an optional once-a-day automatic backup, and restore from any backup (even on a new device). Still experimental, for test accounts only.'
            }
        ]
    },
    // 📅 [أُضيف 2026-10-16] الاستعادة الآمنة للنسخة الاحتياطية
    {
        version: '1.0.29',
        date: '2026-10-16',
        items: [
            {
                type: 'improved',
                ar: 'استرجاع النسخة الاحتياطية صار آمناً: تُحفظ تلقائياً لقطة من بياناتك الحالية قبل الاستعادة، ويظهر لك تاريخ النسخة وعدد طلابها مقابل الحاليين قبل التأكيد، وإن فشلت الاستعادة تعود بياناتك لوضعها السابق. وزر جديد «التراجع عن آخر استعادة» في نافذة ملف المعلم.',
                en: 'Restoring a backup is now safe: a snapshot of your current data is saved automatically first, you see the backup date and student count versus your current ones before confirming, and a failed restore returns your data to its previous state. New "Undo last restore" button in the teacher profile window.'
            }
        ]
    },
    // 📅 [أُضيف 2026-10-15] زر كتم المؤثرات الصوتية في شاشتي الألعاب
    {
        version: '1.0.28',
        date: '2026-10-15',
        items: [
            {
                type: 'new',
                ar: 'شاشة الألعاب (الصغار والكبار): زر 🔊/🔇 في الشريط الجانبي لكتم المؤثرات الصوتية (نجاح/خطأ) أو تشغيلها، ويُحفظ اختيارك على الجهاز. تلاوة الآيات لا تتأثر بالكتم.',
                en: 'Games screen (kids & adults): a 🔊/🔇 button in the sidebar to mute or enable sound effects (success/error); your choice is remembered on this device. Ayah recitation is not affected by mute.'
            }
        ]
    },
    // 📅 [أُضيف 2026-10-15] سؤال «الآية قبلها وبعدها» في الواجب
    {
        version: '1.0.27',
        date: '2026-10-15',
        items: [
            {
                type: 'new',
                ar: 'الواجب المنزلي: سؤال جديد تُعرض فيه آية ويكتب الطالب بيده الآية التي قبلها والآية التي بعدها (نقطتان، تصحيح المعلم يدوياً)، ويظهر مرة واحدة فقط في الواجب.',
                en: 'Homework: new question showing an ayah where the student writes by hand the ayah before it and the ayah after it (two points, graded manually by the teacher); it appears once per homework.'
            }
        ]
    },
    // 📅 [أُضيف 2026-10-15] إعادة بناء أسئلة المتشابهات (أربعة أنواع بنص المصحف)
    {
        version: '1.0.26',
        date: '2026-10-15',
        items: [
            {
                type: 'improved',
                ar: 'أسئلة المتشابهات أُعيد بناؤها: أربعة أنواع (من أي سورة؟ · أكمل الآية · ماذا بعدها؟ · ما الآية التي قبلها؟) بلا أرقام آيات، ونصوصها من المصحف نفسه، وجوابها واحد في السياق المعروض، والخيارات الطويلة تُعرض أول 12 كلمة تقريباً. وعادت متشابهات «داخل السورة» للعمل في كل المنصة (الألعاب، الواجب الذكي، ركن المتشابهات) بعد مراجعتها على القرآن كله.',
                en: 'Similar-verse questions were rebuilt: four types (Which surah? · Complete the verse · What comes next? · What comes before?) with no verse numbers, text taken from the Quran itself, a single correct answer in the shown context, and long options shortened to about 12 words. In-surah similar verses are back across the platform (games, smart homework, the Similar Verses corner) after review against the whole Quran.'
            }
        ]
    },
    // 📅 [أُضيف 2026-10-15] توليد أسئلة الاختبارات الثنائية تلقائياً بميزان واحد
    {
        version: '1.0.25',
        date: '2026-10-15',
        items: [
            {
                type: 'new',
                ar: 'الاختبارات الثنائية: خيار «⚡ توليد تلقائي» بجانب الإدخال اليدوي. حدّد عدد الأسئلة الأساسية والاستبدال وحجم السؤال، فيولّد النظام أسئلة بعدد كلمات متقارب (±10%) لتكون كلها بميزان واحد، وتراجعها وتعتمدها أو تعدّل حدودها بآية آية أو تستبدلها بسؤال آخر.',
                en: 'Dual tests: new "Auto-generate" option next to manual entry. Choose the number of main and swap questions and the question size; the system generates questions with a similar word count (±10%) so all share one scale, then you review, approve, adjust or replace each one.'
            }
        ]
    },
    // 📅 [أُضيف 2026-10-15] إلغاء اختيار الصعوبة: نصف الأسئلة صعب ونصفها متوسط
    {
        version: '1.0.24',
        date: '2026-10-15',
        items: [
            {
                type: 'improved',
                ar: 'أُلغي اختيار «متوسط/صعب» من إعداد الواجب والإرسال الجماعي: صعوبة كل سؤال تحددها صيغته، ويخرج الواجب نصفه صعباً ونصفه متوسطاً تقريباً. الصعب: الآية السابقة، الفراغين، الخاتمة، ترتيب الآيات، كتابة الكلمة الناقصة، كتابة ٣ آيات، تحديد آيات السورة.',
                en: 'The Medium/Hard selector was removed from homework setup and bulk send: each question type has its own level, so a homework is roughly half hard and half medium.'
            },
            {
                type: 'fixed',
                ar: 'حُذف سؤالا «الصفحة اليمنى أم اليسرى» (تخمين 50%) و«الكلمة الغلط» (سهل جداً).',
                en: 'Removed the "right or left page" (50% guess) and "wrong word" (too easy) questions.'
            }
        ]
    },
    // 📅 [أُضيف 2026-10-15] تبسيط صياغة أسئلة الواجب وتقليل الخيارات
    {
        version: '1.0.23',
        date: '2026-10-15',
        items: [
            {
                type: 'improved',
                ar: 'صياغة أبسط لسؤال «الكلمة الغلط» وإلغاء سؤال «الآية بعد/قبل هذه بآيتين»، والسؤال الجديد يبدأ من أعلى الصفحة بلا حاجة للتمرير للأعلى.',
                en: 'Simpler wording for the "two verses before/after" and "wrong word" questions, and each new question now opens scrolled to the top.'
            },
            {
                type: 'improved',
                ar: 'الخيارات في الواجب الصعب أربعة كحد أقصى بدل خمسة، وتنويع أكبر لأنواع الأسئلة داخل الواجب الواحد.',
                en: 'Hard homework now has at most four options (was five), and question types vary more within one homework.'
            }
        ]
    },
    // 📅 [أُضيف 2026-10-15] مراجعة فورية للطالب بعد تسليم الواجب (بلا درجة)
    {
        version: '1.0.22',
        date: '2026-10-15',
        items: [
            {
                type: 'new',
                ar: 'بعد تسليم الواجب يرى الطالب فوراً أي أسئلته المصحَّحة آلياً صحيحة وأيها خاطئة مع الإجابة الصحيحة، بلا أي درجة؛ والأسئلة الكتابية تظهر «بانتظار تصحيح المعلم»، والدرجة لا تصله إلا بعد انتهاء التصحيح اليدوي. يلزم نشر نسخة الخادم الجديدة (Code.gs 1.4.1) لتظهر المراجعة.',
                en: 'After submitting, students instantly see which auto-checked questions were right or wrong with the correct answer, with no grade; written questions show "waiting for your teacher" and the grade only comes after manual grading. Deploy the new server version (Code.gs 1.4.1) for the review to appear.'
            }
        ]
    },
    // 📅 [أُضيف 2026-10-13] مستوى صعوبة الواجب (متوسط / صعب) والحد الأدنى 20 سؤالاً
    {
        version: '1.0.21',
        date: '2026-10-13',
        items: [
            {
                type: 'new',
                ar: 'مستوى صعوبة الواجب: اختر «متوسط» أو «صعب» من شاشة الإعداد وفي الإرسال الجماعي (الصعب هو الافتراضي). في الصعب يُعرض من الآية أقل (نصفها فقط في التالية/السابقة، وربما يُسأل عن الآية الثانية بعدها)، والخيارات خمسة شديدة التشابه، وتُخفى كلمتان بدل كلمة، وترتيب ست آيات، وخواتيم بنصف الآية مع خيارات «شبه صحيحة»، وكلمة مستبدَلة بدل المضافة، وأسئلة كتابة أكثر، ولا تظهر أسئلة الصفحة اليمنى/اليسرى (التخمين 50%).',
                en: 'Homework difficulty: pick "Medium" or "Hard" on the prep screen and in bulk send (Hard is the default). Hard shows less of the ayah (only half in next/previous, sometimes asking for the second one after), uses five near-identical choices, hides two words instead of one, orders six ayahs, hides half of the ending with near-correct decoys, swaps a word instead of adding one, includes more written questions, and drops right/left-page questions (50% guessable).'
            },
            {
                type: 'improved',
                ar: 'الحد الأدنى لعدد أسئلة الواجب صار 20 بدل 15.',
                en: 'The minimum number of homework questions is now 20 instead of 15.'
            }
        ]
    },
    // 📅 [أُضيف 2026-10-13] مزامنة سجل الطلاب بين أجهزة المعلم + مراقبة أخطاء الطلاب
    {
        version: '1.0.20',
        date: '2026-10-13',
        items: [
            {
                type: 'new',
                ar: 'مزامنة سجل الطلاب بين أجهزتك: من «ملف المعلم» اضغط «زامن الآن» بعد الدخول بجوجل، فيظهر سجل التقييمات وأداء كل طالب على أي هاتف أو حاسوب تدخل منه بنفس الحساب (دمج فقط، لا يحذف شيئاً من أي جهاز). تتطلب تحديث خادم الواجبات.',
                en: 'Sync student records across your devices: from "Teacher profile" tap "Sync now" after Google sign-in, and every student\'s assessment history and performance appears on any phone or computer you use with the same account (merge only, never deletes anything from any device). Requires updating the homework server.'
            },
            {
                type: 'new',
                ar: 'مراقبة الأخطاء: لو فشل إرسال طالب أو تعطلت صفحته يظهر لك تنبيه في شاشة الواجبات بدل أن تعرف من شكواه. لا يُرسل اسم الطالب ولا إجاباته.',
                en: 'Error monitoring: if a student\'s submission fails or their page breaks, an alert appears on the homework screen so you no longer depend on their complaint. Student names and answers are never sent.'
            }
        ]
    },
    // 📅 [أُضيف 2026-10-12] إصلاحات الواجبات: المتشابهات والمشتتات ومعاني الكلمات
    {
        version: '1.0.19',
        date: '2026-10-12',
        items: [
            {
                type: 'fixed',
                ar: 'سؤال المتشابهات «اختر نص الآية»: لم يعد يعرض العبارة المشتركة في نص السؤال (كانت موجودة في كل الخيارات فلا تفيد)، بل يسأل عن الموضع فقط ليكون استحضاراً حقيقياً.',
                en: 'Similar-verses "choose the verse text" question no longer shows the shared phrase in the prompt (it appeared in every option and added nothing); it now asks by position only, making it true recall.'
            },
            {
                type: 'improved',
                ar: 'سؤال «حدد كل الآيات التي تنتمي إلى سورة…»: الخيارات الخاطئة صارت من سور قريبة وبأطوال مقاربة بدل اختيارها عشوائياً من أي سورة.',
                en: '"Select all verses from surah…" question: wrong options now come from nearby surahs with similar lengths instead of random ones.'
            },
            {
                type: 'improved',
                ar: 'كل أسئلة الاختيارات في الواجبات (إكمال الفراغ، الفراغين، الخاتمة، الكلمة الدخيلة، الآية التالية/السابقة، في أي سورة): الخيارات الخاطئة صارت مشتتة فعلاً — قريبة من الصحيحة في الرسم والطول والقافية بدل اختيارها عشوائياً. وأُصلح تكرار نفس الخيار في سؤال الكلمة الدخيلة.',
                en: 'All multiple-choice homework questions (fill-in, double fill-in, ending, intruder word, next/previous verse, which surah): wrong options are now genuinely distracting — close to the right answer in spelling, length and rhyme instead of random. Also fixed duplicate options in the intruder-word question.'
            },
            {
                type: 'fixed',
                ar: 'سؤال معاني الكلمات صار يظهر أيضاً في الواجب الذكي (كان يظهر في الواجب التلقائي فقط).',
                en: 'The word-meaning question now also appears in smart homework (previously only in auto homework).'
            }
        ]
    },
    // 📅 [أُضيف 2026-10-12] سؤال معاني الكلمات
    {
        version: '1.0.18',
        date: '2026-10-12',
        items: [
            {
                type: 'new',
                ar: 'نوع سؤال جديد في الواجبات التلقائية: «ما معنى كلمة ... في هذه الآية؟» (اختيار من متعدد يُصحَّح آلياً)، من كتاب «كلمات القرآن: تفسير وبيان» للشيخ حسنين محمد مخلوف، ويغطي معظم السور (ما عدا النجم والتكوير حالياً).',
                en: 'A new question type in auto-generated homework: "What is the meaning of the word ... in this verse?" (auto-graded multiple choice), based on "Kalimat al-Qur\'an: Tafsir wa Bayan" by Sheikh Hasanayn Muhammad Makhluf, covering most surahs (except An-Najm and At-Takwir for now).'
            }
        ]
    },
    // 📅 [أُضيف 2026-10-11] الإرسال الجماعي صفحة مستقلة
    {
        version: '1.0.17',
        date: '2026-10-11',
        items: [
            {
                type: 'improved',
                ar: 'الإرسال الجماعي صار صفحة مستقلة داخل المنصة (بدل النافذة العائمة)، وزر «رجوع» يعيدك للشاشة التي جئت منها.',
                en: 'Bulk send is now a standalone page inside the platform (instead of a floating window); the "Back" button returns you to where you came from.'
            },
            {
                type: 'fixed',
                ar: 'من نُشر له واجب لا يبقى اسمه في «مهام اليوم» حتى لو تعذّر حفظ النسخة المحلية أو اختلف اسمه: يُسجَّل وقت النشر على الطالب نفسه.',
                en: 'A student you published homework for no longer stays in "Today\'s tasks" even if the local copy failed to save or the name differs: the publish time is now recorded on the student.'
            }
        ]
    },
    // 📅 [أُضيف 2026-10-11] أسئلة المتشابهات داخل ألعاب الصغار والكبار
    {
        version: '1.0.16',
        date: '2026-10-11',
        items: [
            {
                type: 'new',
                ar: 'أسئلة المتشابهات داخل ألعاب الصغار والكبار: سؤال لكل 10 أسئلة، من مجموعات المتشابهات الواقعة في نطاق الطالب (الأجزاء 26-30 حالياً). الصغار: «في أي سورة/آية؟» بأزرار اختيار. الكبار: «في أي سورة/آية؟» و«ما خاتمة الآية؟» و«اختر نص الآية» بخيارات مكتوبة يكشف المعلم إجابتها ويقيّمها كباقي أسئلة الكبار.',
                en: 'Similar-verse questions inside the kids and adults games: one per 10 questions, from similar-verse groups that fall in the student\'s range (juz 26-30 for now). Kids: "Which surah/ayah?" with answer buttons. Adults: "Which surah/ayah?", "What is the ending?" and "Choose the ayah text" with written options that the teacher reveals and grades like other adult questions.'
            }
        ]
    },
    // 📅 [أُضيف 2026-10-11] الإرسال الجماعي
    {
        version: '1.0.15',
        date: '2026-10-11',
        items: [
            {
                type: 'new',
                ar: 'زر «📤 الإرسال الجماعي» (اختياري) في شاشة الواجبات وفي بطاقة «مهام اليوم»: شاشة واحدة بصف لكل طالب، تحدّد من تريد (الكل / المستحقون اليوم / المتأخرون)، وتختار لكل طالب نطاقه من قائمة منسدلة (كل النطاق · ✨ اقترح لي · سور محددة · أحزاب محددة) وعدد أسئلته، ثم «جهّز» لتوليد الواجبات دون نشر، وتراجعها، ثم «انشر» دفعة واحدة بدخول جوجل مرة واحدة. بعد النشر تظهر قائمة روابط برسالة جاهزة لكل طالب (نسخ · واتساب · تيليجرام) و«نسخ الكل». الواجب نفسه هو الواجب الذكي المعتاد، ويختفي الطالب من «مهام اليوم» تلقائياً، والشاشة العادية كما هي.',
                en: 'An optional "📤 Bulk send" button on the homework screen and in the "Today\'s tasks" card: one screen with a row per student. Pick who you want (All / Due today / Late), choose each student\'s range from a dropdown (Whole range · ✨ Suggest · Chosen surahs · Chosen hizbs) and number of questions, press "Prepare" to generate the homework without publishing, review it, then "Publish" in one go with a single Google sign-in. Afterwards you get a list of links with a ready message per student (Copy · WhatsApp · Telegram) and "Copy all". It is the same smart homework as usual, the student leaves "Today\'s tasks" automatically, and the normal screen is unchanged.'
            },
            {
                type: 'improved',
                ar: 'الإرسال الجماعي صار «قائمة عمل» قصيرة: تظهر دفعة من الطلاب المستحقين (الأكثر تأخراً أولاً، والدفعة 5 أو 10 أو 15 أو 20 من خيار «حجم الدفعة»)، ومن نُشر لهم واجب يغادرون الجدول (وتبقى روابطهم في القائمة أسفله) ويحلّ مكانهم تلقائياً مستحقون آخرون، فتنتهي من الجميع دفعة بعد دفعة. وللمزيد: مربع بحث بالاسم (يتجاهل التشكيل والهمزات) تظهر نتائجه وبجوار كل اسم زر «＋ إضافة» يضيفه إلى القائمة، وزر «إضافة الكل» وEnter لإضافة أول نتيجة. والمستحق بلا نطاق حفظ لا يُدرج تلقائياً، ولا يُعاد توليد الواجب المجهَّز عند الضغط على «جهّز» مرة أخرى.',
                en: 'Bulk send is now a short work list: a batch of due students is shown (most late first; batch size 5, 10, 15 or 20 from "Batch size"), students you published for leave the table (their links stay in the list below) and other due students take their place automatically, so you finish everyone batch by batch. Also: a name search box (ignores diacritics and hamza variants) whose results show a "＋ Add" button next to each name to add them to the list, an "Add all" button, and Enter to add the first result. A due student with no memorization range is not listed automatically, and a prepared homework is not regenerated if you press "Prepare" again.'
            },
            {
                type: 'improved',
                ar: 'عند نشر واجب لطالب يختفي اسمه فوراً من «مهام اليوم» (بطاقة الرئيسية وعمود «مستحق اليوم» في شاشة الواجبات) دون إعادة فتح الشاشة، سواء نُشر من الشاشة العادية أو من الإرسال الجماعي. وحفظ «مسودة» لا يُخفيه لأنه لم يُنشر له شيء بعد.',
                en: 'When you publish a homework for a student, their name disappears from "Today\'s tasks" immediately (the Home card and the "Due today" column in the homework screen) without reopening the screen, whether published from the normal screen or from Bulk send. Saving a draft does not hide them since nothing was published yet.'
            }
        ]
    },
    // 📅 [أُضيف 2026-10-10] أسئلة المتشابهات في الواجب الذكي
    {
        version: '1.0.14',
        date: '2026-10-10',
        items: [
            {
                type: 'fixed',
                ar: 'تعديل سؤال «اختيار من متعدد» في معاينة الواجب: لو عدّلتَ نص الخيارات ولم تطابق «الإجابة الصحيحة» أحدها حرفياً لم يعد يُحفظ بصمت (كان يُحتسب كل جواب خطأً)؛ يُعتمد الخيار المقابل تلقائياً إن لم تلمس خانة الإجابة، وإلا تظهر رسالة. وأسئلة المتشابهات صارت تسأل عن «خاتمة الآية» بدل مطابقة العبارة التي كانت تكشف الإجابة.',
                en: 'Editing a multiple-choice question in the homework preview: if you changed the options and the "Correct answer" no longer matches one exactly, it is no longer saved silently (every answer was being marked wrong); the matching option is picked automatically if you did not touch the answer box, otherwise you get a message. Similar-verse questions now ask for the ayah ending instead of a phrase match that gave the answer away.'
            },
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
