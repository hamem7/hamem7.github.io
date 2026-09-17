// components/homeQuickview.js
// 🌟 كل منطق بطاقة "نظرة سريعة" الجديدة في الشاشة الرئيسية: تذكير عيد ميلاد
// طالب (اليوم فقط)، آية/حديث/دعاء يومي من مجموعة مختارة يدوياً، متوسط نسبة
// الإتقان العام (من بيانات الطلاب الفعلية إن وُجدت)، عدد التقييمات/التقارير
// الصادرة هذا الشهر (سجل بسيط في localStorage يكتبه reports/report.js عند كل
// تصدير ناجح)، وربط زر "نشر واجب جديد الآن" بنفس مسار زر الواجبات الرئيسي.
// كل عنصر هنا اختياري بالكامل ويختفي بأدب لو لم تتوفر بياناته، بدل اختلاق أرقام.

import { AppState, openHomeworkPrep } from '../core/app.js';
import { t } from '../core/i18n.js';
// 🌟 [جديد] لفتح شاشة "طلابي" من زر بانر التذكير الشهري بتحديث بيانات الحفظ
import { loadMyStudentsScreen } from '../student/student.js';

// مفتاح تخزين سجل التقارير الصادرة — نفس أسلوب localStorage المستخدم أصلاً في
// reports/report.js (اسم المعلم، التوقيع، السجل التاريخي للطالب)
const REPORTS_LOG_KEY = 'darham_reports_log';

// 🌟 مجموعة صغيرة مختارة يدوياً (آيات + حديث + دعاء مأثور) وليست القرآن كله —
// مجرد تذكير لطيف يتغيّر يومياً عند فتح المنصة. النص الأصلي يبقى بالعربي دائماً
// (بنفس منطق النصوص القرآنية في باقي المنصة)، والمرجع فقط هو المترجم.
//
// 🌟 [تصحيح] نصوص الآيات الثلاث تحتها كانت مكتوبة يدوياً برسم إملائي عادي (مثلاً "الْقُرْآنَ")
// وليس بالرسم العثماني الدقيق المستخدم في باقي المنصة (مثلاً "ٱلْقُرْءَانَ" بالألف الصغيرة/وصلة
// فوق اللام وهمزة القرآن على نبرة الألف كما في مصحف المدينة). تم استبدالها بنص مطابق تماماً لنفس
// مصدر الرسم العثماني الذي تجلب منه المنصة كل آياتها (database/quranDB.js عبر alquran.cloud،
// إصدار quran-uthmani المبني على نص "تنزيل" الموثّق) حتى تكون آية اليوم مطابقة 100% لبقية آيات
// المنصة، بما في ذلك كل علامات الضبط الخاصة (كعلامة السكون المستديرة الخاصة بالحروف الساكنة).
// حديث البخاري ودعاء "اللهم اجعل القرآن ربيع قلبي" لم يُمسّا لأن الرسم العثماني خاص بنص القرآن
// فقط، وليس له وجود في الحديث الشريف أو الأدعية المأثورة.
const DAILY_QUOTES = [
    {
        text: 'وَلَقَدۡ يَسَّرۡنَا ٱلۡقُرۡءَانَ لِلذِّكۡرِ فَهَلۡ مِن مُّدَّكِرٍۢ',
        ref: { ar: 'آية — سورة القمر: 17', en: 'Ayah — Surah Al-Qamar: 17' }
    },
    {
        text: 'رَّبِّ زِدۡنِى عِلۡمًۭا',
        ref: { ar: 'آية — سورة طه: 114', en: 'Ayah — Surah Taha: 114' }
    },
    {
        text: 'إِنَّ مَعَ ٱلۡعُسۡرِ يُسۡرًۭا',
        ref: { ar: 'آية — سورة الشرح: 6', en: 'Ayah — Surah Ash-Sharh: 6' }
    },
    {
        text: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ',
        ref: { ar: 'حديث — رواه البخاري', en: 'Hadith — Sahih al-Bukhari' }
    },
    {
        text: 'اللَّهُمَّ اجْعَلِ الْقُرْآنَ رَبِيعَ قَلْبِي',
        ref: { ar: 'دعاء مأثور', en: 'A well-known supplication' }
    }
];

function renderDailyQuote() {
    const textEl = document.getElementById('home-quote-text');
    const refEl = document.getElementById('home-quote-ref');
    if (!textEl || !refEl) return;
    // ثابتة طوال اليوم نفسه (بعدد الأيام منذ Epoch)، وتتغيّر يومياً تلقائياً
    const dayIndex = Math.floor(Date.now() / 86400000);
    const quote = DAILY_QUOTES[dayIndex % DAILY_QUOTES.length];
    textEl.textContent = `"${quote.text}"`;
    refEl.textContent = quote.ref[AppState.currentLang] || quote.ref.ar;
}

// 🌟 تذكير عيد ميلاد طالب داخل البطاقة — فحص مستقل للقراءة فقط، لا يرسل أي
// إشعار ولا يُعدّل دالة checkBirthdays() الخاصة بالإشعارات في core/app.js حتى
// لا نجازف بميزة شغالة فعلاً؛ فقط عرض بصري إضافي داخل البطاقة.
async function renderStudentBirthdayReminder() {
    const row = document.getElementById('home-quickcard-bday');
    const textEl = document.getElementById('home-quickcard-bday-text');
    if (!row || !textEl || !AppState.studentManager) return;

    try {
        const students = await AppState.studentManager.getAllStudents();
        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();

        const birthdayStudent = (students || []).find(s => {
            if (!s.dob) return false;
            const parts = String(s.dob).split('-');
            if (parts.length !== 3) return false;
            return parseInt(parts[1], 10) === month && parseInt(parts[2], 10) === day;
        });

        if (birthdayStudent) {
            const template = t('home_bday_today') || '';
            textEl.textContent = template.replace('{name}', birthdayStudent.name || '');
            row.style.display = 'flex';
        } else {
            row.style.display = 'none';
        }
    } catch (e) {
        console.warn('تعذر التحقق من أعياد ميلاد الطلاب لبطاقة النظرة السريعة:', e);
        row.style.display = 'none';
    }
}

// 🌟 متوسط نسبة الإتقان العام — نسبة حقيقية من 0-100% (وليست نقاط totalScore
// التراكمية بلا سقف كما كانت في أول نسخة من هذه البطاقة). لكل طالب نسبة دقة
// خاصة به = totalCorrect / totalAttempts × 100، والبطاقة تعرض متوسط هذه النسب
// عبر كل الطلاب الذين لديهم محاولة واحدة على الأقل. عدّادا totalAttempts و
// totalCorrect يُحدَّثان الآن فعلياً من games/adultGame.js و games/kidsGame.js
// عند كل سؤال (انظر التعليق هناك). ملاحظة صريحة مهمة: نسخ النسخة الاحتياطية
// القديمة (قبل هذا التحديث) لا تحتوي هذين الحقلين إطلاقاً — فاستيراد نسخة
// احتياطية قديمة عبر "طلابي" لن يُظهر نسبة فعلية بمفرده، وسيبقى الوضع
// "لا توجد بيانات كافية بعد" لأي طالب مستورَد إلى أن يلعب جلسات جديدة بعد
// التحديث، لأن النسخة القديمة لم تكن تسجّل عدد المحاولات أصلاً.
async function renderMasteryAverage() {
    const ring = document.getElementById('home-mastery-ring');
    const valueEl = document.getElementById('home-mastery-value');
    const subEl = document.getElementById('home-mastery-sub');
    if (!ring || !valueEl || !subEl || !AppState.studentManager) return;

    try {
        const students = await AppState.studentManager.getAllStudents();
        const withAttempts = (students || []).filter(s => typeof s.totalAttempts === 'number' && s.totalAttempts > 0);

        if (withAttempts.length === 0) {
            valueEl.textContent = '—';
            ring.style.background = 'conic-gradient(rgba(255,253,246,0.18) 0% 100%)';
            subEl.textContent = t('home_mastery_no_data');
            return;
        }

        const accuracyPercentages = withAttempts.map(s => ((s.totalCorrect || 0) / s.totalAttempts) * 100);
        const avg = Math.round(accuracyPercentages.reduce((sum, p) => sum + p, 0) / accuracyPercentages.length);
        valueEl.textContent = `${avg}%`;
        ring.style.background = `conic-gradient(var(--dh-gold-500) 0% ${avg}%, rgba(255,253,246,0.18) ${avg}% 100%)`;
        subEl.textContent = t('home_mastery_avg_sub');
    } catch (e) {
        console.warn('تعذر حساب متوسط الإتقان العام:', e);
        subEl.textContent = t('home_mastery_no_data');
    }
}

// 🌟 عدد التقييمات/التقارير الصادرة هذا الشهر — من سجل بسيط في localStorage
// (نفس أسلوب localStorage المستخدم أصلاً في reports/report.js) يُكتب فيه سطر
// جديد عند كل تصدير PDF/PNG ناجح من شاشة التقرير (انظر logReportGenerated في
// reports/report.js). لا يحسب أي تقارير صدرت قبل هذا التحديث لأنها لم تُسجَّل.
function renderReportsCount() {
    const countEl = document.getElementById('home-reports-count');
    if (!countEl) return;
    try {
        const raw = localStorage.getItem(REPORTS_LOG_KEY);
        const list = raw ? JSON.parse(raw) : [];
        const now = new Date();
        const count = (Array.isArray(list) ? list : []).filter(iso => {
            const d = new Date(iso);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        }).length;
        countEl.textContent = String(count);
    } catch (e) {
        countEl.textContent = '0';
    }
}

function wireQuickPublishButton() {
    const btn = document.getElementById('home-quick-publish-btn');
    if (!btn) return;
    btn.addEventListener('click', openHomeworkPrep);
}

// 🌟🌟 [جديد] "مستحق اليوم" — نظام المراجعة المتباعدة على نمط Anki/Duolingo:
// يعرض الطلاب الذين حان أو فات موعد مراجعتهم بناءً على جدول
// AppState.reviewScheduleManager (يُحدَّث فقط عند اعتماد المعلم درجة نهائية
// يدوياً لواجب الطالب — انظر saveManualGrades في settings/homework-prep.js).
// الترتيب هنا بالأولوية (الأكثر تأخراً في المراجعة أولاً)، وليس ترتيباً
// زمنياً حسب تاريخ الحفظ. القائمة تظهر بحد أقصى 5 طلاب حتى لا تُطيل البطاقة.
// افتراض صريح: لا يظهر أي طالب هنا إطلاقاً قبل أن يُعتمَد له تصحيح يدوي واحد
// على الأقل لأي واجب (لا يوجد سجل مراجعة له بعد في قاعدة البيانات الجديدة).
async function renderDueForReview() {
    const wrap = document.getElementById('home-quickcard-due');
    const listEl = document.getElementById('home-quickcard-due-list');
    if (!wrap || !listEl || !AppState.studentManager || !AppState.reviewScheduleManager) return;

    try {
        const [students, schedules] = await Promise.all([
            AppState.studentManager.getAllStudents(),
            AppState.reviewScheduleManager.getAllSchedules()
        ]);

        const now = Date.now();
        const dueRows = [];

        (schedules || []).forEach(sched => {
            const nextDue = new Date(sched.nextDueAt).getTime();
            if (isNaN(nextDue) || nextDue > now) return; // لم يحن موعده بعد

            const student = (students || []).find(s => s.id === sched.studentId);
            if (!student || student.isHidden) return;

            const overdueDays = Math.floor((now - nextDue) / 86400000);
            dueRows.push({ student, overdueDays });
        });

        if (dueRows.length === 0) {
            wrap.style.display = 'none';
            return;
        }

        // 🌟 الأولوية للأكثر تأخراً في المراجعة أولاً (نظام أولوية/إلحاح، وليس
        // ترتيباً زمنياً لتسلسل الحفظ) — هذا هو الفرق الجوهري عن الفرز الزمني البسيط
        dueRows.sort((a, b) => b.overdueDays - a.overdueDays);

        listEl.innerHTML = '';
        dueRows.slice(0, 5).forEach(({ student, overdueDays }) => {
            const rangeText = (student.memoFrom && student.memoTo)
                ? `${student.memoFrom} ← ${student.memoTo}`
                : t('home_due_no_range');
            const whenText = overdueDays <= 0
                ? t('home_due_today')
                : `${t('home_due_overdue_by')} ${overdueDays} ${t('home_due_days_unit')}`;

            const row = document.createElement('div');
            row.className = 'home-quickcard-due-row';
            row.innerHTML = `
                <span class="home-quickcard-due-name">${student.name}</span>
                <span class="home-quickcard-due-range">${rangeText}</span>
                <span class="home-quickcard-due-when">${whenText}</span>
            `;
            // 🌟 نقرة على أي صف تفتح شاشة إعداد الواجبات مع تجهيل الطالب مسبقاً
            // كـ"طالب مستهدف" مباشرة، توفيراً لخطوة اختياره يدوياً من القائمة
            row.addEventListener('click', () => {
                AppState.homeworkPrepPrefillStudentName = student.name;
                openHomeworkPrep();
            });
            listEl.appendChild(row);
        });

        wrap.style.display = 'block';
    } catch (e) {
        console.warn('تعذر حساب قائمة "مستحق اليوم" للمراجعة المتباعدة:', e);
        wrap.style.display = 'none';
    }
}

// 🌟🌟 [جديد] تذكير شهري بتحديث بيانات حفظ الطلاب — بنفس فلسفة سجل التقارير
// أعلاه: localStorage بسيط، لا سيرفر ولا إشعار إجباري. يظهر مرة واحدة فقط عند
// أول فتح للمنصة بعد تغيّر الشهر الميلادي، وفقط إن وُجد طالب واحد مسجَّل على
// الأقل (لا فائدة من تذكير قبل وجود أي طالب). افتراضات صريحة استخدمناها:
// 1) "الشهر" هنا ميلادي (Date.getMonth())، ويُقارَن بمجرد فتح المنصة (وليس
//    مربوطاً بيوم أول الشهر بالتحديد) حتى لا يُفوَّت التذكير إن لم تُفتح
//    المنصة في اليوم الأول.
// 2) التذكير أحادي الاتجاه: يفتح شاشة "طلابي" ليحدّث المعلم يدوياً من يراه
//    مناسباً، دون أي محاولة لتخمين مَن تقدّم فعلياً في الحفظ، لأن هذه معلومة
//    غير متوفرة حالياً في الكود (لا يوجد سجل تلقائي لتقدّم الحفظ بعد).
const MEMO_REMINDER_KEY = 'darham_memo_reminder_last_month';

async function checkMonthlyMemoReminder() {
    const banner = document.getElementById('monthly-memo-banner');
    if (!banner || !AppState.studentManager) return;

    try {
        const students = await AppState.studentManager.getAllStudents();
        if (!students || students.length === 0) return; // لا فائدة من تذكير بلا طلاب مسجَّلين أصلاً

        const now = new Date();
        const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const lastShownYM = localStorage.getItem(MEMO_REMINDER_KEY);

        if (lastShownYM === currentYM) return; // عُرض بالفعل هذا الشهر، لا تكرار

        banner.style.display = 'flex';
        localStorage.setItem(MEMO_REMINDER_KEY, currentYM);

        // 🌟 إشعار مكتبي اختياري إضافي إن كان الإذن ممنوحاً فعلاً مسبقاً (بدون
        // طلب إذن جديد هنا — الطلب يحدث فقط في core/app.js عند إقلاع النظام)
        if ("Notification" in window && Notification.permission === "granted") {
            try {
                new Notification(t('home_memo_reminder_notif_title'), {
                    body: t('home_memo_reminder_notif_body'),
                    icon: "icons/icon-192.png"
                });
            } catch (e) { /* تجاهل أي فشل في الإشعار، البانر داخل الصفحة كافٍ بمفرده */ }
        }
    } catch (e) {
        console.warn('تعذر التحقق من التذكير الشهري بتحديث بيانات الحفظ:', e);
    }
}

function wireMonthlyMemoBanner() {
    const banner = document.getElementById('monthly-memo-banner');
    const closeBtn = document.getElementById('monthly-memo-banner-close');
    const goBtn = document.getElementById('monthly-memo-banner-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => { if (banner) banner.style.display = 'none'; });
    if (goBtn) goBtn.addEventListener('click', () => { loadMyStudentsScreen(); });
}

// يُستدعى مرة واحدة من setupSplashListeners() في core/app.js عند تحميل الشاشة الرئيسية
export function initHomeQuickview() {
    renderDailyQuote();
    renderStudentBirthdayReminder();
    renderMasteryAverage();
    renderReportsCount();
    renderDueForReview();
    wireQuickPublishButton();
    wireMonthlyMemoBanner();
    checkMonthlyMemoReminder();
}
