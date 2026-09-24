// core/app.js
import { ensureQuranLoaded } from '../database/quranDB.js';
import { initStudentDB, StudentManager } from '../database/studentDB.js';
import { initHomeworkDB, HomeworkManager } from '../database/homeworkDB.js';
import { initTeacherDB, TeacherManager } from '../database/teacherDB.js';
// 🌟 [جديد] قاعدة بيانات تخزين أصوات آيات لعبة "استمع وخمّن الآية" (ركن الأطفال) محليًا —
// راجع تعليق database/kidsAudioDB.js لتفاصيل الفكرة والافتراضات
import { initKidsAudioDB, KidsAudioManager } from '../database/kidsAudioDB.js';
// 🌟 قاعدة بيانات نظام "المراجعة المتباعدة" (Anki/Duolingo) الجديدة 🌟
import { initReviewScheduleDB, ReviewScheduleManager } from '../database/reviewScheduleDB.js';
// 🌟 [جديد] قاعدة بيانات "الاختبارات الثنائية" — بنك الاختبارات المحفوظة + سجل المواجهات
// الفعلية. الميزة نفسها (شاشات الإعداد واللعب) معزولة بالكامل في مجلد dualtests/ الجديد
// بطلب صريح من المعلم، لا تلمس أي ملف من games/ أو settings/ الحالية.
import { initDualTestsDB, DualTestsManager } from '../database/dualTestsDB.js';
// 🌟 [جديد] قاعدة بيانات "ركن المتشابهات" — نفس نمط تهيئة بقية قواعد البيانات أعلاه
// بالضبط. شاشات التصفح الفعلية (السور/الكلمات) معزولة بالكامل في مجلد similarities/
// الجديد (بنفس فلسفة عزل dualtests/)، ولا تلمس أي ملف من games/ أو settings/ الحالية.
import { initSimilaritiesDB, ensureSimilaritiesLoaded, SimilaritiesManager } from '../database/similaritiesDB.js';
// 🌟 [جديد — المرحلة 3] قاعدة بيانات "أبطال التجويد" (DarHamTajweed) — إتقان الطالب لكل حكم +
// سجل الجلسات + الأوسمة. نفس نمط تهيئة بقية قواعد البيانات هنا بالضبط. راجع database/tajweedDB.js
import { initTajweedDB, TajweedManager } from '../database/tajweedDB.js';
import { QuranEngine } from '../engine/quranEngine.js';
import { KidsEngine } from '../engine/kidsEngine.js';
import { loadScreen, switchTheme } from './navigation.js';
import { setupLoginListeners, populateStudentsDropdown, loadMyStudentsScreen } from '../student/student.js';
import { setupDashboardListeners, populateDashboardData } from '../settings/dashboard.js';
import { initTeacherProfileUI, renderTeacherGreeting } from '../components/teacherProfile.js';
import { initHomeQuickview } from '../components/homeQuickview.js';
// 🌟 توست التنويه أسفل الشاشة — يُستخدم في شاشة "الاختبارات الثنائية" (بدل alert())
import { showToastEncouragement } from '../components/ui.js';
// 🌟 [جديد] نظام "تلميحات الأقسام عند أول دخول" — راجع components/sectionHint.js لتفاصيل الآلية
import { showSectionHintOnce } from '../components/sectionHint.js';
import { translations, t, applyLanguage, toggleLanguage } from './i18n.js';
// 🌟 رقم إصدار المنصة وسجل التحديثات — لشاشة "الجديد في هذا التحديث" 🌟
import { APP_VERSION, getUnseenChangelog } from './version.js';
// 🌟 [جديد] إعادة محاولة رفع أي واجب فشل رفعه للسحابة وقت النشر (راجع الشرح الكامل بجانب
// flushPendingHomeworkSync في core/firebase.js) — تُستدعى مرة عند كل إقلاع للمنصة
// 🌟🌟 [إصلاح] أضفنا هنا أيضاً flushPendingSubmissions (نفس الفكرة بالضبط، لكن لتسليمات
// الطلاب وليس الواجبات) — كانت هذه الدالة تُستدعى فقط عند فتح شاشة حل الواجب نفسها
// (games/homework-play.js)، رغم أن الرسالة التي تظهر للطالب عند فشل إرسال نتيجته تَعِد صراحةً
// بأنها "ستُعاد تلقائياً بمجرد توفر الاتصال" — وهذا الوعد لم يكن صحيحاً فعلياً لأنه لا يوجد أي
// استماع لعودة الاتصال. الآن تُستدعى هنا أيضاً (عند إقلاع المنصة وعند حدث 'online' أسفل)، فتصبح
// الرسالة صحيحة، وتُتاح فرصة أكبر لوصول نتيجة الطالب للمعلم حتى لو أغلق الطالب المتصفح فوراً
// بعد ظهور رسالة "تعذر الإرسال" ثم فتح المنصة لاحقاً على نفس الجهاز لأي سبب آخر.
import { flushPendingHomeworkSync, flushPendingSubmissions } from './firebase.js';
// 🌟 [جديد] نظام "النسخة الاحتياطية المحلية" — تصدير كل بيانات المنصة لملف على جهاز
// المعلم فقط (بلا رفع سحابي)، تُستخدم هنا فقط لتشغيل التنزيل من نافذة التذكير الشهري
// أدناه (checkMonthlyBackupReminder). راجع core/backupRestore.js للآلية الكاملة، وزرّي
// "نسخة احتياطية الآن"/"استرجاع" الفعليين في components/teacherProfile.js
import { exportFullBackup } from './backupRestore.js';

// 🛡️ إعادة تصدير دوال الترجمة لضمان عدم كسر أي ملف خارجي يستوردها من app.js
export { translations, t, applyLanguage, toggleLanguage };

export const AppState = {
    studentManager: null,
    quranEngine: null,
    kidsEngine: null,
    kidsAudioManager: null,
    homeworkManager: null,
    teacherManager: null,
    // 🌟 مدير جدول "المراجعة المتباعدة" (Anki/Duolingo) — يتتبع لكل طالب متى
    // موعد مراجعته القادمة بناءً على نطاق حفظه الحالي (memoFrom/memoTo)
    reviewScheduleManager: null,
    // 🌟 [جديد] مدير "الاختبارات الثنائية" — بنك الاختبارات المحفوظة + سجل المواجهات
    dualTestsManager: null,
    // 🌟 [جديد] معرّف المواجهة المطلوب فتحها في شاشة اللعب — نفس فكرة
    // homeworkPrepPrefillStudentName أدناه بالضبط: يُملأ لحظة الانتقال من شاشة الإعداد،
    // ثم يُقرأ مرة واحدة ويُفرَّغ فوراً في initDualTestPlay() حتى لا يؤثر على أي فتح لاحق
    dualTestPlayMatchId: null,
    // 🌟 [عدّل — 2026-09-16] كان هذا الحقل يحمل معرّف مجموعة واحدة فقط (similarityGamePlayGroupId)
    // لأن اللعبة كانت تُبنى لمجموعة واحدة دائماً. بعد توسيع نطاق اللعب لمستوى "السورة بالكامل"
    // أو "الجزء بالكامل" (بطلب صريح من المعلم — راجع similarities/similarities.js)، أصبح الحقل
    // يحمل كائن "نطاق" (scope) بدل معرّف مفرد: { type: 'surah', surahNumber } أو
    // { type: 'juz', juzId } (juzId قد تكون معرّف أحد الأجزاء الأربعة الداخلية، أو 'amma' لجزء
    // عمّ بالكامل). نفس فكرة dualTestPlayMatchId أعلاه بالضبط: يُملأ لحظة الانتقال من أحد أزرار
    // "🎮 العب..."، ثم يُقرأ مرة واحدة ويُفرَّغ فوراً في initSimilarityGamePlay() حتى لا يؤثر
    // على أي فتح لاحق.
    similarityGamePlayScope: null,
    // 🌟 اسم الطالب المطلوب تجهيله مسبقاً في قائمة "الطالب المستهدف" عند فتح
    // شاشة الواجبات قادماً من نقرة على أحد صفوف "مستحق اليوم" في نظرة سريعة —
    // تُقرأ مرة واحدة ثم تُفرَّغ فوراً حتى لا تؤثر على أي فتح لاحق عادي للشاشة
    homeworkPrepPrefillStudentName: null,
    currentStudent: null,
    // 🌟 ملف المعلم الشخصي (اسم/صورة/تاريخ ميلاد/ختم) — null حتى يُحمَّل من teacherDB،
    // وقد يبقى بلا اسم/صورة/تاريخ ميلاد إلى أن يُكملها المعلم بنفسه (كل شيء اختياري تماماً)
    currentTeacher: null,
    isKidsMode: false,
    surahsData: [],
    juzAmmaSurahs: [],
    // 🌟 [جديد] مدير قاعدة بيانات "ركن المتشابهات" — يُهيَّأ في bootSystem أسفل هذا الملف
    similaritiesManager: null,
    // 🌟 [جديد — المرحلة 3] مدير قاعدة بيانات "أبطال التجويد" (إتقان/جلسات/أوسمة) — يُهيَّأ
    // في bootSystem أسفل هذا الملف بنفس نمط بقية المديرين أعلاه
    tajweedManager: null,
    // 🌟 [جديد — المرحلة 2] معاملات فتح شاشة نشاط "أبطال التجويد" (تدرّب/تحدي مرحلة/مراجعة) —
    // نفس فكرة dualTestPlayMatchId أعلاه بالضبط: تُملأ لحظة الانتقال من tajweed-map.js، ثم
    // تُقرأ مرة واحدة وتُفرَّغ فوراً في initTajweedActivity() حتى لا تؤثر على أي فتح لاحق
    tajweedActivityParams: null,
    currentLang: localStorage.getItem('app_lang') || 'ar'
};

// 🎂 دالة التحقق من أعياد الميلاد وإرسال إشعار فوري لسطح المكتب
async function checkBirthdays() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    if (!AppState.studentManager) return;

    try {
        const students = await AppState.studentManager.getAllStudents();
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();

        students.forEach(student => {
            if (student.dob) {
                const dobParts = student.dob.split('-');
                if (dobParts.length === 3) {
                    const birthMonth = parseInt(dobParts[1], 10);
                    const birthDay = parseInt(dobParts[2], 10);

                    if (birthMonth === currentMonth && birthDay === currentDay) {
                        new Notification(t('bday_notification_title'), {
                            body: `${t('bday_notification_msg')}${student.name} 🎂`,
                            icon: "icons/icon-192.png"
                        });
                    }
                }
            }
        });
    } catch (e) {
        console.warn("تعذر التحقق من أعياد الميلاد:", e);
    }
}

// 🌟 شاشة "الجديد في هذا التحديث" — تقارن رقم الإصدار الحالي (APP_VERSION من version.js)
// بآخر رقم شافه المعلم على هذا الجهاز بالذات (مخزّن محلياً في localStorage، بدون أي مزامنة
// سحابية لأن المنصة لمعلم واحد). أول مرة يُفتح فيها التطبيق على جهاز جديد (لا يوجد رقم
// محفوظ أصلاً) لا نعرض شيئاً — فقط نسجّل الإصدار الحالي بصمت، حتى لا نستقبل المعلم بشاشة
// "تحديثات" وهو لسه بيجرّب المنصة لأول مرة. 🌟
const WHATS_NEW_STORAGE_KEY = 'dh_last_seen_version';

function checkForUpdates() {
    const lastSeen = localStorage.getItem(WHATS_NEW_STORAGE_KEY);

    // أول تشغيل للمنصة على هذا الجهاز: لا داعي لإظهار "تحديثات" لمعلم يفتحها لأول مرة
    if (!lastSeen) {
        localStorage.setItem(WHATS_NEW_STORAGE_KEY, APP_VERSION);
        return;
    }

    if (lastSeen === APP_VERSION) return;

    // 🌟 يجمع كل الإصدارات الأحدث من آخر إصدار شافه المعلم، مش بس آخر واحد — لو فوّت
    // أكتر من تحديث (مثلاً ما فتحش المنصة لمدة أسبوعين) يشوفهم كلهم مرة واحدة 🌟
    const unseenEntries = getUnseenChangelog(lastSeen);
    if (unseenEntries.length === 0) {
        localStorage.setItem(WHATS_NEW_STORAGE_KEY, APP_VERSION);
        return;
    }

    renderWhatsNewModal(unseenEntries);
}

function renderWhatsNewModal(entries) {
    const modal = document.getElementById('whats-new-modal');
    const list = document.getElementById('whats-new-list');
    const closeBtn = document.getElementById('whats-new-close');
    if (!modal || !list || !closeBtn) return;

    const typeLabels = {
        new: t('whats_new_cat_new'),
        improved: t('whats_new_cat_improved'),
        fixed: t('whats_new_cat_fixed')
    };

    list.innerHTML = entries.map(entry => `
        <div class="whats-new-entry">
            <div class="whats-new-entry-header">${t('whats_new_version_prefix')} ${entry.version} — ${entry.date}</div>
            <ul class="whats-new-entry-items">
                ${entry.items.map(item => `
                    <li>
                        <span class="whats-new-badge whats-new-badge-${item.type}">${typeLabels[item.type] || ''}</span>
                        <span>${item[AppState.currentLang] || item.ar}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    `).join('');

    modal.style.display = 'flex';

    // 🌟 نحدّث "آخر إصدار مرئي" فقط لما المعلم يضغط "فهمت" (أو يغلق من الخلفية)، مش لمجرد
    // ظهور الشاشة — لو قفل التطبيق بسرعة قبل ما يقرأ، تفضل تظهر له تاني المرة الجاية 🌟
    const dismiss = () => {
        modal.style.display = 'none';
        localStorage.setItem(WHATS_NEW_STORAGE_KEY, APP_VERSION);
    };

    closeBtn.addEventListener('click', dismiss, { once: true });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) dismiss();
    }, { once: true });
}

// 🌟🌟 [جديد] تذكير شهري بأخذ نسخة احتياطية محلية للبيانات — بناءً على طلب صريح من المعلم
// بعد سؤاله عن مصير بيانات الطلاب عند تحديث الكود (كل البيانات محلية في IndexedDB بلا
// مزامنة سحابية إلا الواجبات وتسليماتها، راجع core/backupRestore.js لتفاصيل الآلية).
// نفس فلسفة checkForUpdates()/WHATS_NEW_STORAGE_KEY أعلاه بالضبط: مقارنة محلية عبر
// localStorage فقط (لا مزامنة سحابية، المنصة لمعلم واحد)، وتسجيل صامت لأول تشغيل على هذا
// الجهاز حتى لا نستقبل المعلم بتذكير نسخة احتياطية وهو لسه بيجرّب المنصة لأول مرة بلا
// بيانات فعلية تستحق النسخ بعد. 🌟🌟
const BACKUP_REMINDER_STORAGE_KEY = 'dh_last_backup_reminder_month';

function currentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function checkMonthlyBackupReminder() {
    const lastShownMonth = localStorage.getItem(BACKUP_REMINDER_STORAGE_KEY);
    const thisMonth = currentMonthKey();

    if (!lastShownMonth) {
        localStorage.setItem(BACKUP_REMINDER_STORAGE_KEY, thisMonth);
        return;
    }

    if (lastShownMonth === thisMonth) return;

    renderBackupReminderModal(thisMonth);
}

function renderBackupReminderModal(thisMonth) {
    const modal = document.getElementById('backup-reminder-modal');
    const downloadBtn = document.getElementById('backup-reminder-download-btn');
    const laterBtn = document.getElementById('backup-reminder-later-btn');
    if (!modal || !downloadBtn || !laterBtn) return;

    modal.style.display = 'flex';

    // 🌟 نحدّث "آخر شهر ظهر فيه التذكير" فور الظهور (بعكس whats-new-modal التي تنتظر
    // ضغط "فهمت") لأن التذكير هنا مجرد تنبيه دوري لا معلومة قد يفوّتها المعلم لو أغلق
    // النافذة بسرعة — سيظهر تلقائياً تاني الشهر الجاي على أي حال بغض النظر عن رده الآن
    localStorage.setItem(BACKUP_REMINDER_STORAGE_KEY, thisMonth);

    const dismiss = () => { modal.style.display = 'none'; };

    downloadBtn.addEventListener('click', async () => {
        try {
            await exportFullBackup();
        } catch (e) {
            console.error('تعذر إنشاء النسخة الاحتياطية من نافذة التذكير الشهري:', e);
            alert(t('backup_export_error'));
        }
        dismiss();
    }, { once: true });

    laterBtn.addEventListener('click', dismiss, { once: true });
    modal.addEventListener('click', (e) => { if (e.target === modal) dismiss(); }, { once: true });
}

async function bootSystem() {
    try {
        applyLanguage();

        const langBtn = document.getElementById('lang-toggle-btn');
        if (langBtn) {
            langBtn.addEventListener('click', () => {
                toggleLanguage();
                // 🌟 إعادة رسم شريط التاريخ والترحيب بلغتهما الجديدة إن كنا في الشاشة الرئيسية حالياً
                if (document.getElementById('home-date-bar')) updateHomeDateBar();
                if (document.getElementById('home-greeting')) renderTeacherGreeting();
            });
        }

        // 🔔 طلب إذن الإشعارات المكتبية عند فتح المنصة
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }

        const quranDB = await ensureQuranLoaded();
        AppState.quranEngine = new QuranEngine(quranDB);
        AppState.kidsEngine = new KidsEngine(AppState.quranEngine);

        // 🌟 [جديد] تهيئة قاعدة بيانات تخزين أصوات آيات ركن الأطفال محليًا — نفس نمط تهيئة
        // بقية قواعد البيانات هنا بالضبط (راجع database/kidsAudioDB.js للتفاصيل الكاملة)
        const kidsAudioDB = await initKidsAudioDB();
        AppState.kidsAudioManager = new KidsAudioManager(kidsAudioDB);

        const studentDB = await initStudentDB();
        AppState.studentManager = new StudentManager(studentDB);

        // 📚 تهيئة قاعدة بيانات الواجبات المستقلة
        const hwDB = await initHomeworkDB();
        AppState.homeworkManager = new HomeworkManager(hwDB);

        // 🌟🌟 [إصلاح] إعادة محاولة رفع أي واجب فشل رفعه للسحابة في جلسة سابقة (طابور
        // pendingHwCloudSync في core/firebase.js) — بدون انتظار (لا نُجمّد إقلاع المنصة
        // بسببها) وبصمت تام لو نجحت أو لو كان الطابور فارغاً أصلاً (الحالة الشائعة)
        flushPendingHomeworkSync().catch(err => console.error("خطأ أثناء إعادة محاولة رفع الواجبات المعلّقة:", err));

        // 🌟🌟 [إصلاح] نفس الفكرة بالضبط، لكن لتسليمات الطلاب (طابور pendingHwSubmissions في
        // core/firebase.js) بدل الواجبات. كانت هذه الدالة تُستدعى فقط داخل
        // games/homework-play.js عند فتح شاشة حل الواجب تحديداً — فلو الطالب سلّم واجبه وفشل
        // إرسال نتيجته (رسالة "سيُعاد إرسالها تلقائياً بمجرد توفر الاتصال")، ثم أغلق المتصفح
        // فوراً بدل إعادة فتح نفس الرابط، كانت نتيجته تبقى عالقة على جهازه للأبد بلا أي محاولة
        // أخرى إطلاقاً — رغم أن نفس المنصة (index.html) قد تُفتح لاحقاً على جهازه لأي سبب آخر
        // (مثلاً لحل واجب تالٍ). نستدعيها هنا أيضاً ليصبح الوعد في تلك الرسالة صحيحاً فعلاً.
        flushPendingSubmissions().catch(err => console.error("خطأ أثناء إعادة محاولة رفع تسليمات الطلاب المعلّقة:", err));

        // 🌟🌟 [إصلاح] كانت كل عمليات إعادة المحاولة أعلاه تحدث مرة واحدة فقط عند إقلاع المنصة.
        // المشكلة: المنصة تعمل كتطبيق صفحة واحدة (SPA) — بمجرد تحميلها، التنقل بين الشاشات
        // (زي فتح "إعداد الواجبات"، أو حل واجب) لا يُعيد تحميل هذا الملف ولا يُشغّل هذا الكود
        // مرة أخرى. فلو فشل الرفع بسبب انقطاع مؤقت في الإنترنت، وعاد الاتصال بعدها بدقائق أثناء
        // إن المستخدم (معلم أو طالب) لسه شغّال بنفس الجلسة (بدون إغلاق المنصة وإعادة فتحها من
        // الصفر)، كانت إعادة المحاولة التلقائية لا تحدث أبداً طوال هذه الجلسة رغم عودة الاتصال
        // فعلاً. الحل: نستمع لحدث 'online' القياسي في المتصفح (يُطلَق تلقائياً بمجرد عودة
        // الاتصال) ونعيد نفس محاولتَي الرفع فوراً عند حدوثه — بالإضافة لإعادة المحاولة الثالثة
        // للواجبات تحديداً عند فتح شاشة إعداد الواجبات نفسها (راجع initHomeworkPrep في
        // settings/homework-prep.js) — دون أي حاجة لتدخل يدوي في الحالة الشائعة (انقطاع مؤقت).
        window.addEventListener('online', () => {
            flushPendingHomeworkSync().catch(err => console.error("خطأ أثناء إعادة محاولة رفع الواجبات المعلّقة بعد عودة الاتصال:", err));
            flushPendingSubmissions().catch(err => console.error("خطأ أثناء إعادة محاولة رفع تسليمات الطلاب المعلّقة بعد عودة الاتصال:", err));
        });

        // 🧑‍🏫 تهيئة ملف المعلم الشخصي (اسم/صورة/تاريخ ميلاد/ختم) — تحميل ما هو محفوظ
        // فعلاً إن وجد، وإلا يبقى currentTeacher فارغاً بلا أي إجبار على إكماله الآن
        const teacherDB = await initTeacherDB();
        AppState.teacherManager = new TeacherManager(teacherDB);
        AppState.currentTeacher = await AppState.teacherManager.getProfile();
        // 🔗 توافق خلفي: reports/report.js يقرأ اسم المعلم من AppState.teacherName مباشرة
        AppState.teacherName = (AppState.currentTeacher && AppState.currentTeacher.name) || '';

        // 🌟 تهيئة قاعدة بيانات جدول "المراجعة المتباعدة" (Anki/Duolingo) — نفس
        // نمط تهيئة بقية قواعد البيانات أعلاه بالضبط
        const reviewScheduleDB = await initReviewScheduleDB();
        AppState.reviewScheduleManager = new ReviewScheduleManager(reviewScheduleDB);

        // 🌟 [جديد] تهيئة قاعدة بيانات "الاختبارات الثنائية" — نفس نمط تهيئة بقية
        // قواعد البيانات أعلاه بالضبط
        const dualTestsDB = await initDualTestsDB();
        AppState.dualTestsManager = new DualTestsManager(dualTestsDB);

        // 🌟 [جديد] تهيئة قاعدة بيانات "ركن المتشابهات" + تحميل بيانات الـ Seed المُفرَّغة
        // من الـ PDF عند أول تشغيل (أو عند رفع رقم إصدار الـ Seed مستقبلاً) — راجع
        // database/similaritiesDB.js لتفاصيل ensureSimilaritiesLoaded
        const similaritiesDB = await initSimilaritiesDB();
        await ensureSimilaritiesLoaded(similaritiesDB);
        AppState.similaritiesManager = new SimilaritiesManager(similaritiesDB);

        // 🌟 [جديد — المرحلة 3] تهيئة قاعدة بيانات "أبطال التجويد" — نفس نمط تهيئة بقية
        // قواعد البيانات أعلاه بالضبط
        const tajweedDB = await initTajweedDB();
        AppState.tajweedManager = new TajweedManager(tajweedDB);

        AppState.surahsData = await AppState.quranEngine.getAllSurahsList();
        AppState.juzAmmaSurahs = AppState.surahsData.filter(s => s.number >= 78 && s.number <= 114);

        if ("Notification" in window && Notification.permission === "granted") {
            await checkBirthdays();
        }

        // 🌟 السحر هنا: فحص الرابط المباشر (Direct Link) قبل إقلاع المنصة 🌟
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('hw')) {
            const hwData = urlParams.get('hw');

            // توجيه الطالب فوراً إلى شاشة الترحيب الخاصة بالواجب
            import('../student/homework-welcome.js').then(module => {
                loadScreen({
                    templateUrl: 'student/homework-welcome.html',
                    initFunction: () => module.initHomeworkWelcome(hwData)
                });
            }).catch(err => {
                console.error("شاشة الترحيب قيد البرمجة:", err);
                alert("جاري تجهيز شاشة ترحيب الطالب 🛠️ (انتقل للخطوة التالية من فضلك!)");
                loadSplashScreen(); // العودة للرئيسية في حال عدم وجود الملف بعد
            });
            return; // إيقاف إقلاع الشاشة الرئيسية للمعلم
        }

        // إذا لم يكن هناك رابط مباشر، افتح شاشة المعلم الرئيسية
        await loadSplashScreen();

        // 🌟 فحص "الجديد في هذا التحديث" — بعد فتح الشاشة الرئيسية للمعلم فقط، وليس في
        // مسار دخول الطالب عبر رابط واجب مباشر أعلاه (لأن التحديثات غالباً خاصة بأدوات
        // إدارة المعلم وليست جزءاً من تجربة الطالب) 🌟
        checkForUpdates();

        // 🌟 [جديد] تذكير النسخة الاحتياطية الشهري — مؤجَّل لحين إغلاق شاشة "الجديد في هذا
        // التحديث" أعلاه إن ظهرت في نفس اللحظة (كلتاهما نافذة حاجبة كاملة الشاشة)، حتى لا
        // تتراكب شاشتان حاجبتان دفعة واحدة على المعلم. لا حاجة لتعديل checkForUpdates أو
        // renderWhatsNewModal أعلاه لتحقيق هذا التسلسل — نكتفي بفحص هل ظهرت شاشتهما فعلاً
        // (display=='flex') ثم نعلّق تذكيرنا على نفس أزرار إغلاقها الموجودة بالفعل 🌟
        const whatsNewModalEl = document.getElementById('whats-new-modal');
        if (whatsNewModalEl && whatsNewModalEl.style.display === 'flex') {
            document.getElementById('whats-new-close')?.addEventListener('click', () => checkMonthlyBackupReminder(), { once: true });
            whatsNewModalEl.addEventListener('click', (e) => {
                if (e.target === whatsNewModalEl) checkMonthlyBackupReminder();
            }, { once: true });
        } else {
            checkMonthlyBackupReminder();
        }

        // 🌟 [جديد] تلميح الترحيب العام بالمنصة — يظهر مرة واحدة فقط على هذا الجهاز عند أول
        // فتح للشاشة الرئيسية للمعلم (بعد whats-new-modal مباشرة لتفادي ظهور بطاقتين دفعة
        // واحدة في نفس اللحظة، رغم أن الأولى فقط تظهر عملياً غالباً لأن whats-new تتطلب وجود
        // نسخة سابقة محفوظة أصلاً، بعكس هذا التلميح الذي يظهر تحديداً في أول مرة لا يوجد فيها
        // ذلك). راجع مستند "تصميم نظام تلميحات الأقسام عند أول دخول المقترح" 🌟
        showSectionHintOnce('general', {
            type: 'tip',
            titleKey: 'hint_general_title',
            bodyKey: 'hint_general_body'
        });
    } catch (error) {
        console.error("خطأ قاتل أثناء إقلاع النظام:", error);
    }
}

export async function loadSplashScreen() {
    await loadScreen({
        templateUrl: 'components/splash.html',
        initFunction: setupSplashListeners
    });
}

const kidsBackgrounds = [
    'assets/kids_bg/1.jpg',
    'assets/kids_bg/2.jpg',
    'assets/kids_bg/3.jpg',
    'assets/kids_bg/4.jpg',
    'assets/kids_bg/5.jpg'
];

// 🌟 شريط التاريخ الهجري/الميلادي واليوم في الشاشة الرئيسية — يعتمد على Intl المدمجة
// في المتصفح (calendar: islamic-umalqura) فلا يحتاج أي مكتبة خارجية إضافية 🌟
function updateHomeDateBar() {
    // 🌟 النص أصبح يُكتب داخل span فرعي #home-date-bar-text بدل شريط التاريخ نفسه،
    // لأن أيقونة SVG ثابتة أصبحت موجودة بجانبه في splash.html (بدل إيموجي 📅 السابق)
    const bar = document.getElementById('home-date-bar');
    const textEl = document.getElementById('home-date-bar-text');
    if (!bar || !textEl) return;

    const now = new Date();
    const lang = AppState.currentLang;
    const gregLocale = lang === 'ar' ? 'ar-EG' : 'en-US';
    const hijriLocale = lang === 'ar' ? 'ar-SA-u-ca-islamic-umalqura' : 'en-u-ca-islamic-umalqura';

    try {
        const weekday = new Intl.DateTimeFormat(gregLocale, { weekday: 'long' }).format(now);
        const gregDate = new Intl.DateTimeFormat(gregLocale, { day: 'numeric', month: 'long', year: 'numeric' }).format(now);
        const hijriDate = new Intl.DateTimeFormat(hijriLocale, { day: 'numeric', month: 'long', year: 'numeric' }).format(now);
        const gregSuffix = lang === 'ar' ? 'م' : '';
        const hijriSuffix = lang === 'ar' ? 'هـ' : 'AH';

        textEl.textContent = `${weekday} • ${gregDate}${gregSuffix ? ' ' + gregSuffix : ''} • ${hijriDate} ${hijriSuffix}`;
    } catch (e) {
        console.warn("تعذر حساب التاريخ الهجري في هذا المتصفح:", e);
        bar.style.display = 'none';
    }
}

function setupSplashListeners() {
    updateHomeDateBar();
    // 🧑‍🏫 الترحيب الشخصي، شارة إكمال البيانات، ملخص الواجبات، وتنبيه عيد ميلاد المعلم
    initTeacherProfileUI();

    const btnAdult = document.getElementById('btn-adult-main');
    const btnKids = document.getElementById('btn-kids-main');
    const btnHomework = document.getElementById('btn-homework-main');
    const btnMyStudents = document.getElementById('btn-my-students-main');
    // 🌟 [عدّل] بطاقة "تحدي المتشابهات" — أصبح لها الآن شاشات تصفح فعلية كاملة (مجلد
    // similarities/ الجديد): 5 أزرار أجزاء (الأحقاف/الذاريات/المجادلة/تبارك/عمّ)، قوائم
    // سور، وشاشة تفصيل تعرض كل مجموعات المتشابهات للسورة المختارة. جزء عمّ يتفرّع لزرين
    // إضافيين (السور / الكلمات) حسب طلب المعلم. [عدّل] زر "ابدأ لعبة" في شاشة التفصيل أصبح
    // يفتح فعلياً شاشة لعب تفاعلية حقيقية (openSimilarityGame أسفل هذا الملف) بدل توست
    // التنويه المؤقت السابق — راجع engine/similarityEngine.js وsimilarities/similarities-play.js
    const btnSimilarities = document.getElementById('btn-similarities-main');
    // 🌟 [جديد] بطاقة "الاختبارات الثنائية" — أصبحت تفتح شاشة الإعداد الحقيقية الآن
    const btnDual = document.getElementById('btn-dual-main');
    // 🌟 [جديد] بطاقة الدخول لمسار "أبطال التجويد" — لا توجد بعد شاشات تجويد فعلية (قيد
    // البناء على مراحل)، فحالياً الضغط عليها يعرض رسالة ودّية فقط (راجع تعليق الزر في
    // core/i18n.js لتفاصيل سبب استخدام alert() هنا تحديداً)
    const btnTajweed = document.getElementById('btn-tajweed-main');

    if (btnAdult) btnAdult.addEventListener('click', () => {
        AppState.isKidsMode = false;
        switchTheme('adult');
        document.body.style.backgroundImage = '';
        loadLoginScreen();
    });

    if (btnKids) btnKids.addEventListener('click', () => {
        AppState.isKidsMode = true;
        switchTheme('kids');

        const randomBg = kidsBackgrounds[Math.floor(Math.random() * kidsBackgrounds.length)];
        const img = new Image();
        img.src = randomBg;
        img.onload = () => {
            document.body.style.backgroundImage = `url('${randomBg}')`;
        };
        img.onerror = () => {
            console.log("لم يتم العثور على الصور العشوائية، تم استخدام الخلفية الافتراضية.");
        };

        loadLoginScreen();
    });

    if (btnMyStudents) btnMyStudents.addEventListener('click', () => {
        switchTheme('adult');
        document.body.style.backgroundImage = '';
        loadMyStudentsScreen();
    });

    if (btnHomework) btnHomework.addEventListener('click', openHomeworkPrep);

    // 🌟 [عدّل] كانت تعرض توست "قيد التطوير" فقط (لا يوجد شاشة فعلية بعد). الآن تفتح شاشات
    // تصفح "ركن المتشابهات" الحقيقية عبر openSimilaritiesBrowser أسفل هذا الملف — بنفس
    // نمط openHomeworkPrep/openDualTestSetup بالضبط
    if (btnSimilarities) btnSimilarities.addEventListener('click', openSimilaritiesBrowser);

    if (btnDual) btnDual.addEventListener('click', openDualTestSetup);

    // 🌟 [عدّل] بعد بناء المرحلة 1 (كتالوج القلقلة والنون الساكنة + شاشات تصفّح فعلية في
    // مجلد tajweed/)، أصبحت البطاقة تفتح شاشات "أبطال التجويد" الحقيقية عبر
    // openTajweedSection أسفل هذا الملف — بنفس نمط openHomeworkPrep/openSimilaritiesBrowser
    // بالضبط. كانت تعرض توست "قيد التطوير" فقط (لا شاشة فعلية بعد) قبل هذه المرحلة.
    if (btnTajweed) btnTajweed.addEventListener('click', openTajweedSection);

    // 🌟 منطق البيانات الحية لبطاقة "نظرة سريعة" الجديدة (متوسط الإتقان، عدد
    // التقارير، تذكير عيد ميلاد طالب، آية/حديث اليوم، زر النشر السريع) —
    // كل شيء في components/homeQuickview.js حتى لا يتضخم هذا الملف
    initHomeQuickview();
}

// 🌟 استُخرجت من داخل مستمع زر "نظام الواجبات المنزلية" لتكون قابلة لإعادة
// الاستخدام من زر "نشر واجب جديد الآن" الجديد في بطاقة "نظرة سريعة" أيضاً —
// نفس السلوك بالضبط، بدون أي تغيير في المنطق.
export function openHomeworkPrep() {
    switchTheme('adult');
    document.body.style.backgroundImage = '';

    import('../settings/homework-prep.js').then(module => {
        loadScreen({
            templateUrl: 'settings/homework-prep.html',
            initFunction: () => module.initHomeworkPrep()
        });
    }).catch(err => {
        console.error("سيتم بناء ملف الواجبات في الخطوة القادمة:", err);
        alert("جاري تجهيز شاشة إعداد الواجبات 🛠️ (انتقل للخطوة التالية من فضلك)");
    });
}

// 🌟 [جديد] فتح شاشة إعداد "الاختبارات الثنائية" — نفس نمط openHomeworkPrep() أعلاه
// بالضبط، لكن يستورد من مجلد dualtests/ الجديد المعزول تماماً عن games/ وsettings/
export function openDualTestSetup() {
    switchTheme('adult');
    document.body.style.backgroundImage = '';

    import('../dualtests/dual-test-setup.js').then(module => {
        loadScreen({
            templateUrl: 'dualtests/dual-test-setup.html',
            initFunction: () => module.initDualTestSetup()
        });
    }).catch(err => {
        console.error("تعذر تحميل شاشة إعداد الاختبارات الثنائية:", err);
        alert("جاري تجهيز شاشة الاختبارات الثنائية 🛠️");
    });
}

// 🌟 [جديد] فتح شاشات "ركن المتشابهات" — نفس نمط openDualTestSetup/openHomeworkPrep
// أعلاه بالضبط، لكن يستورد من مجلد similarities/ الجديد المعزول تماماً عن games/
// وsettings/ (نفس فلسفة عزل dualtests/). initSimilaritiesHome() بداخل الملف هي
// المسؤولة عن كل منطق التصفح (القائمة الرئيسية، قوائم السور، شاشات التفصيل...).
export function openSimilaritiesBrowser() {
    switchTheme('adult');
    document.body.style.backgroundImage = '';

    import('../similarities/similarities.js').then(module => {
        loadScreen({
            templateUrl: 'similarities/similarities-home.html',
            initFunction: () => module.initSimilaritiesHome()
        });
    }).catch(err => {
        console.error("تعذر تحميل شاشات ركن المتشابهات:", err);
        alert("جاري تجهيز شاشات ركن المتشابهات 🛠️");
    });
}

// 🌟 [جديد] فتح شاشات "أبطال التجويد" — نفس نمط openSimilaritiesBrowser/openDualTestSetup
// أعلاه بالضبط، لكن يستورد من مجلد tajweed/ الجديد المعزول تماماً (نفس فلسفة عزل
// dualtests/وsimilarities/). المرحلة 1 فقط حالياً: كتالوج القلقلة والنون الساكنة + بطاقات
// ثابتة للتصفّح (راجع tajweed/tajweed-map.js ومستند "التصور-المعماري-الكامل-لمسار-التجويد.md").
export function openTajweedSection() {
    switchTheme('adult');
    document.body.style.backgroundImage = '';

    import('../tajweed/tajweed-map.js').then(module => {
        loadScreen({
            templateUrl: 'tajweed/tajweed-map.html',
            initFunction: () => module.initTajweedMap()
        });
    }).catch(err => {
        console.error("تعذر تحميل شاشات أبطال التجويد:", err);
        alert("جاري تجهيز شاشات أبطال التجويد 🛠️");
    });
}

// 🌟 [جديد — المرحلة 2] فتح شاشة نشاط "أبطال التجويد" (تدرّب على حكم / اربط أحكام المرحلة /
// تحدي المرحلة / جولة مراجعة) — نفس نمط openTajweedSection أعلاه بالضبط، ويُستدعى من أزرار
// النشاط داخل tajweed/tajweed-map.js بعد تعبئة AppState.tajweedActivityParams. لا يغيّر الثيم
// (البقاء على نفس هوية "أبطال التجويد" المستقلة من الشاشة التي فُتح منها).
export function openTajweedActivityScreen(params) {
    AppState.tajweedActivityParams = params;
    import('../tajweed/tajweed-activity.js').then(module => {
        loadScreen({
            templateUrl: 'tajweed/tajweed-activity.html',
            initFunction: () => module.initTajweedActivity()
        });
    }).catch(err => {
        console.error("تعذر تحميل شاشة نشاط أبطال التجويد:", err);
        alert("جاري تجهيز شاشة النشاط 🛠️");
    });
}

// 🌟 [عدّل — 2026-09-16] فتح شاشة لعب "ركن المتشابهات" التفاعلية — نفس نمط
// openSimilaritiesBrowser/openDualTestSetup أعلاه بالضبط، لكن يمرّر "نطاق" اللعب المطلوب
// عبر AppState.similarityGamePlayScope (راجع تعليق الحقل في AppState أعلاه) بدل مجرد فتح شاشة
// تصفح عامة. كان يستقبل معرّف مجموعة واحدة مباشرة قبل توسيع نطاق اللعب لمستوى السورة/الجزء —
// أصبح يستقبل كائن scope كاملاً ({type:'surah', surahNumber} أو {type:'juz', juzId}) ويمرّره
// كما هو. يُستدعى من أزرار "🎮 العب..." في similarities/similarities.js.
export function openSimilarityGame(scope) {
    switchTheme('adult');
    document.body.style.backgroundImage = '';
    AppState.similarityGamePlayScope = scope;

    import('../similarities/similarities-play.js').then(module => {
        loadScreen({
            templateUrl: 'similarities/similarities-play.html',
            initFunction: () => module.initSimilarityGamePlay()
        });
    }).catch(err => {
        console.error('تعذر تحميل شاشة لعب ركن المتشابهات:', err);
        alert('جاري تجهيز شاشة اللعب 🛠️');
    });
}

export async function loadLoginScreen() {
    await loadScreen({
        templateUrl: 'student/login.html',
        initFunction: async () => {
            const title = document.getElementById('login-title');
            if (title) {
                title.innerText = AppState.isKidsMode ? translations[AppState.currentLang]['login_kids_title'] : translations[AppState.currentLang]['login_adults_title'];
            }
            await populateStudentsDropdown();
            setupLoginListeners();
        }
    });
}

export async function loadDashboardScreen() {
    await loadScreen({
        templateUrl: 'settings/dashboard.html',
        initFunction: () => {
            populateDashboardData();
            setupDashboardListeners();
        }
    });
}

window.addEventListener('DOMContentLoaded', bootSystem);