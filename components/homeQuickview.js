// components/homeQuickview.js
// 🌟 كل منطق بطاقة "نظرة سريعة" الجديدة في الشاشة الرئيسية: تذكير يوم ميلاد
// طالب (اليوم فقط)، آية/حديث/دعاء يومي من مجموعة مختارة يدوياً، متوسط نسبة
// الإتقان العام (من بيانات الطلاب الفعلية إن وُجدت)، عدد التقييمات/التقارير
// الصادرة هذا الشهر (سجل بسيط في localStorage يكتبه reports/report.js عند كل
// تصدير ناجح). (أُزيل زر "نشر واجب جديد الآن" من البطاقة — الواجبات من الزر الرئيسي والشريط السفلي.)
// كل عنصر هنا اختياري بالكامل ويختفي بأدب لو لم تتوفر بياناته، بدل اختلاق أرقام.

import { AppState, openHomeworkPrep } from '../core/app.js';
import { esc } from '../core/escape.js';
import { t } from '../core/i18n.js';
// 🌟 [2026-10-07] «واجبات تنتظر التصحيح»: نفس مصدر بطاقة «يحتاج تصحيح» في شاشة الواجبات (خادم الواجبات)
import { getSubmissionsNeedingGrading } from '../core/homeworkApi.js';
import { isTeacherAuthed } from '../core/api.js';
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

// 🌟🌟 [2026-10-07 — «مهام اليوم»] علامة ✓ «تمّت»: تُخفي المهمة لبقية اليوم الحالي فقط (وتُحتسب منجزة في شريط
// التقدّم). افتراضات صريحة: (1) لا تغيّر أي بيانات — مراجعة الطالب تبقى مستحقة في جدولها، والتسليم يبقى في
// غرفة التصحيح، والمواجهة تبقى معلّقة؛ غداً تعود المهمة إن بقيت قائمة. (2) المفتاح لكل مهمة: نوعها + معرّفها
// (due:<طالب>، pm:<مواجهة>، grade:<تسليم>، bday:<طالب>). (3) المخزَّن في localStorage ويُصفَّر عند تغيّر اليوم؛
// لو تعذّر التخزين تُخفى المهمة حتى إعادة تحميل الشاشة فقط.
const TODAY_DONE_KEY = 'darham_today_tasks_done';
let todayDoneMemory = new Set();

function todayStamp() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function loadTodayDone() {
    try {
        const rec = JSON.parse(localStorage.getItem(TODAY_DONE_KEY) || 'null');
        if (rec && rec.day === todayStamp() && Array.isArray(rec.keys)) return new Set(rec.keys);
    } catch (e) { /* تجاهل */ }
    return new Set();
}

function isTaskDone(key) {
    return todayDoneMemory.has(key) || loadTodayDone().has(key);
}

function markTaskDone(key) {
    todayDoneMemory.add(key);
    const keys = loadTodayDone();
    keys.add(key);
    try { localStorage.setItem(TODAY_DONE_KEY, JSON.stringify({ day: todayStamp(), keys: Array.from(keys) })); } catch (e) { /* تجاهل */ }
}

function wireDoneButton(row, key, groupId) {
    row.dataset.taskKey = key;
    const btn = row.querySelector('.qc-row-done');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // لا تُفعّل نقرة الصف (فتح الشاشة)
        markTaskDone(key);
        afterTaskDone(groupId);
    });
}

// إعادة رسم المجموعة المتأثرة وحدها (حتى يظهر الصف التالي مكان المنجَز لو كان أكثر من 5) مع إبقاء قائمتها مفتوحة
async function afterTaskDone(groupId) {
    const wrap = document.getElementById(groupId);
    const keepOpen = !!wrap && wrap.classList.contains('is-expanded');
    const renderers = {
        'home-quickcard-due': renderDueForReview,
        'home-quickcard-pm': renderPendingDualMatchesReminder,
        'home-quickcard-grade': renderHomeworkAwaitingGrading,
        'home-quickcard-bday': renderStudentBirthdayReminder
    };
    try { if (renderers[groupId]) await renderers[groupId](); } catch (e) { /* كل دالة تعالج أخطاءها */ }
    if (keepOpen && wrap && wrap.style.display !== 'none') wrap.classList.add('is-expanded');
    updateTodayGroup();
}

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

// 🌟 تذكير يوم ميلاد طالب داخل البطاقة — فحص مستقل للقراءة فقط، لا يرسل أي
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

        if (birthdayStudent && !isTaskDone(`bday:${birthdayStudent.id}`)) {
            const doneBtn = document.getElementById('home-quickcard-bday-done');
            if (doneBtn) doneBtn.onclick = () => { markTaskDone(`bday:${birthdayStudent.id}`); afterTaskDone('home-quickcard-bday'); };
            const template = t('home_bday_today') || '';
            textEl.textContent = template.replace('{name}', birthdayStudent.name || '');
            row.style.display = 'flex';
        } else {
            row.style.display = 'none';
        }
    } catch (e) {
        console.warn('تعذر التحقق من أيام ميلاد الطلاب لبطاقة النظرة السريعة:', e);
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

// 🌟🌟 [جديد] "مستحق اليوم" — نظام المراجعة المتباعدة على نمط Anki/Duolingo:
// يعرض الطلاب الذين حان أو فات موعد مراجعتهم بناءً على جدول
// AppState.reviewScheduleManager (يُحدَّث فقط عند اعتماد المعلم درجة نهائية
// يدوياً لواجب الطالب — انظر saveManualGrades في settings/homework-prep.js).
// الترتيب هنا بالأولوية (الأكثر تأخراً في المراجعة أولاً)، وليس ترتيباً
// زمنياً حسب تاريخ الحفظ. القائمة تظهر بحد أقصى 5 طلاب حتى لا تُطيل البطاقة.
// افتراض صريح: لا يظهر أي طالب هنا إطلاقاً قبل أن يُعتمَد له تصحيح يدوي واحد
// على الأقل لأي واجب (لا يوجد سجل مراجعة له بعد في قاعدة البيانات الجديدة).
//
// 🌟🌟 [تحديث] القائمة التفصيلية أصبحت مطوية افتراضياً خلف سطر ملخّص واحد قابل
// للنقر (بطلب صريح من المعلم لتقليل طول بطاقة "نظرة سريعة" عند تراكم عناصر
// كثيرة معلّقة)، بدل عرض كل الصفوف دائماً. افتراضات صريحة استُخدمت هنا:
// 1) حالة الطي/الفتح لا تُحفَظ بين الزيارات — تبدأ مطوية دائماً عند كل تحميل
//    للشاشة الرئيسية، حتى يظهر العدد المُحدَّث (الأقل بعد معالجة عنصر) واضحاً
//    فوراً بدل أن تبقى قائمة قديمة مفتوحة من زيارة سابقة.
// 2) نص الملخص "{n} مستحق المراجعة اليوم" لا يطبّق قواعد الجمع العربية الكاملة
//    (مثنى/جمع تكسير حسب العدد)، بنفس الأسلوب المبسّط المستخدَم أصلاً في باقي
//    عدّادات المنصة (مثال: "متأخر N يوم").
async function renderDueForReview() {
    const wrap = document.getElementById('home-quickcard-due');
    const summaryBtn = document.getElementById('home-quickcard-due-summary');
    const summaryTextEl = document.getElementById('home-quickcard-due-summary-text');
    const listEl = document.getElementById('home-quickcard-due-list');
    if (!wrap || !summaryBtn || !summaryTextEl || !listEl || !AppState.studentManager) return;
    const en = AppState.currentLang === 'en';
    const L = (ar, enText) => (en ? enText : ar);

    try {
        // 🌟 [جديد — تذكير الواجب الأسبوعي] لكل طالب جدول أيام أسبوعي يوزّعه النظام تلقائياً (core/hwScheduleService.js): يظهر الطالب يوم
        // موعده ثم متأخراً يوماً بيوم حتى يُنشر له واجب. يُدمج مع «مستحق المراجعة» القديم في صف واحد لكل طالب. أي فشل في جانب الجدول
        // يُتجاهل فتبقى القائمة القديمة كما كانت.
        let schedRows = [], capacity = 0;
        const svc = await import('../core/hwScheduleService.js').catch(() => null);
        if (svc) {
            try {
                const ens = await svc.ensureSchedules();
                if (ens.firstRun) {
                    alert(L(`وُزّع ${ens.assigned} طالباً تلقائياً على أيام الأسبوع (السبت إلى الخميس) بحيث لا تزدحم واجباتك، ولكل طالب يومان بينهما فاصل.\nراجع التوزيع وعدّله من زر «📅 جدول الأسبوع» في بطاقة مهام اليوم أو من شاشة الواجبات.`,
                        `${ens.assigned} students were distributed automatically over the week (Saturday to Thursday) so your homework load stays balanced, with two spaced days each.\nReview and adjust it from the "📅 Weekly schedule" button in Today's tasks or in the homework screen.`));
                }
                const due = await svc.listDueToday();
                schedRows = due.rows; capacity = due.capacity;
            } catch (e) { console.warn('تعذر حساب مواعيد الواجبات الأسبوعية:', e); }
        }

        const [students, schedules] = await Promise.all([
            AppState.studentManager.getAllStudents(),
            AppState.reviewScheduleManager ? AppState.reviewScheduleManager.getAllSchedules() : []
        ]);

        const now = Date.now();
        const byId = new Map();                       // صف واحد لكل طالب، تتّحد فيه الجهتان
        const rowOf = (student) => { if (!byId.has(student.id)) byId.set(student.id, { student, overdueDays: null, sched: null }); return byId.get(student.id); };

        (schedules || []).forEach(sched => {
            const nextDue = new Date(sched.nextDueAt).getTime();
            if (isNaN(nextDue) || nextDue > now) return; // لم يحن موعده بعد

            const student = (students || []).find(s => s.id === sched.studentId);
            if (!student || student.isHidden) return;
            if (isTaskDone(`due:${student.id}`)) return; // 🌟 [2026-10-07] عُلِّمت «تمّت» اليوم

            rowOf(student).overdueDays = Math.floor((now - nextDue) / 86400000);
        });
        schedRows.forEach(r => { rowOf(r.student).sched = r; });
        const dueRows = [...byId.values()];

        wrap.dataset.count = String(dueRows.length);   // 🌟 [2026-10-03] العدد الكامل لزر «مهام» في الشريط السفلي
        wrap.dataset.urgent = String(dueRows.filter(r => (r.sched && r.sched.lateDays > 0) || (r.overdueDays || 0) > 0).length);   // 🌟 [2026-10-07] المتأخر فعلاً لشارة «عاجلة»
        if (dueRows.length === 0) {
            wrap.style.display = 'none';
            return;
        }

        // الأولوية: موعد الواجب الأسبوعي (الأكثر تأخراً أولاً) ثم المراجعة المتباعدة الأكثر تأخراً
        const prio = (r) => (r.sched ? 1000 + r.sched.lateDays : (r.overdueDays || 0));
        dueRows.sort((a, b) => prio(b) - prio(a) || String(a.student.name).localeCompare(String(b.student.name), 'ar'));

        // 🌟🌟 [جديد] سطر الملخص المطوي — يُعاد ضبطه لحالة "مطوي" في كل رسم. .onclick بدل addEventListener عمداً:
        // هذا العنصر ثابت ولا يُعاد إنشاؤه بين الرسمات المتكررة، فالتعيين المباشر يستبدل أي معالج سابق
        summaryTextEl.textContent = schedRows.length
            ? L(`📚 ${dueRows.length} ينتظرون واجباً أو مراجعة اليوم`, `📚 ${dueRows.length} waiting for homework or review today`)
            : t('home_due_badge').replace('{n}', dueRows.length);
        wrap.classList.remove('is-expanded');
        summaryBtn.onclick = () => wrap.classList.toggle('is-expanded');

        // 🌟 [جديد — الواجب الذكي] الواجب الذكي يبني على موضع حفظ الطالب الشهري: نُنبّه في الصف نفسه لمن مضى على تحديث موضعه أكثر
        // من 30 يوماً (أو لا سجل شهري له). أي فشل هنا يُتجاهل بصمت.
        const shown = dueRows.slice(0, 12);
        let staleList = [];
        try {
            const tsvc = await import('../core/trackingService.js');
            staleList = await Promise.all(shown.map(r => tsvc.getMonthlyStaleness(r.student).catch(() => null)));
        } catch (e) { /* التنبيه إضافي فقط */ }
        const staleTag = L('موضع الحفظ قديم', 'Position outdated');

        listEl.innerHTML = '';
        shown.forEach(({ student, overdueDays, sched }, rowIdx) => {
            const stale = staleList[rowIdx] && staleList[rowIdx].stale && student.memoFrom && student.memoTo;
            const rangeText = (student.memoFrom && student.memoTo)
                ? `${student.memoFrom} ← ${student.memoTo}`
                : t('home_due_no_range');
            const isLate = (sched && sched.lateDays > 0) || (overdueDays || 0) > 0;
            const schedTag = sched
                ? (sched.lateDays === 0 ? L('موعد واجب اليوم', 'Homework due today')
                    : L(`متأخر ${sched.capped ? sched.lateDays + '+' : sched.lateDays} يوم عن موعد الواجب`, `${sched.lateDays}${sched.capped ? '+' : ''} day(s) late for homework`))
                : '';
            const reviewTag = overdueDays !== null
                ? `${L('مراجعة', 'Review')}: ${overdueDays > 0 ? `${t('home_due_overdue_by')} ${overdueDays} ${t('home_due_days_unit')}` : t('home_due_today')}`
                : '';

            // 🌟 [2026-10-07 — «مهام اليوم» الشكل أ] صف موحّد: نقطة حالة + اسم + شارة + نطاق + زر إجراء
            const row = document.createElement('div');
            row.className = 'home-quickcard-due-row';
            row.innerHTML = `
                <span class="qc-dot ${isLate ? 'late' : ''}" aria-hidden="true"></span>
                <span class="qc-row-main">
                    <span class="qc-row-name">${esc(student.name)}</span>
                    <span class="qc-row-sub">${schedTag ? `<span class="qc-tag ${sched.lateDays > 0 ? 'late' : ''}">${esc(schedTag)}</span>` : ''}${reviewTag ? `<span class="qc-tag ${overdueDays > 0 ? 'late' : ''}">${esc(reviewTag)}</span>` : ''}${stale ? `<span class="qc-tag late">${staleTag}</span>` : ''}<span>${esc(rangeText)}</span></span>
                </span>
                <span class="qc-row-btns">
                    <button type="button" class="qc-row-act">${t('home_act_review')}</button>
                    ${sched
                        ? `<button type="button" class="qc-row-done qc-row-snooze" aria-label="${esc(L('رحّل لغد', 'Postpone'))}" title="${esc(L('رحّل لغد (يعود متأخراً إن لم يُعدّ)', 'Postpone to the next work day'))}">⏭</button>`
                        : `<button type="button" class="qc-row-done" aria-label="${t('home_task_done')}" title="${t('home_task_done')}">✓</button>`}
                </span>
            `;
            if (sched) {
                // التذكير الأسبوعي ينتهي تلقائياً بنشر واجب للطالب؛ والزر الثانوي «رحّل لغد» فقط
                row.querySelector('.qc-row-snooze').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    try { await svc.snoozeStudent(student); } catch (err) { console.warn(err); }
                    afterTaskDone('home-quickcard-due');
                });
            } else {
                wireDoneButton(row, `due:${student.id}`, 'home-quickcard-due');
            }
            // 🌟 نقرة على أي صف تفتح شاشة إعداد الواجبات مع تجهيل الطالب مسبقاً
            // كـ"طالب مستهدف" مباشرة، توفيراً لخطوة اختياره يدوياً من القائمة
            row.addEventListener('click', () => {
                AppState.homeworkPrepPrefillStudentName = student.name;
                openHomeworkPrep();
            });
            listEl.appendChild(row);
        });

        // تذييل: تنبيه الازدحام (فوق الطاقة الموزَّعة) + زر «جدول الأسبوع»
        if (svc) {
            const foot = document.createElement('div');
            foot.className = 'qc-foot';
            const over = schedRows.length > capacity && capacity > 0;
            foot.innerHTML = `${over ? `<span class="qc-foot-warn">${esc(L(`اليوم ${schedRows.length} واجبات تنتظر الإعداد وطاقتك الموزَّعة ${capacity} — رحّل ما تشاء لغد (⏭).`, `${schedRows.length} homeworks are waiting today and your balanced capacity is ${capacity} — postpone some (⏭).`))}</span>` : ''}
                <button type="button" class="qc-foot-btn">📅 ${esc(L('جدول الأسبوع', 'Weekly schedule'))}</button>`;
            foot.querySelector('.qc-foot-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                const m = await import('./weekSchedule.js');
                m.openWeekSchedule({ onClose: () => afterTaskDone('home-quickcard-due') });
            });
            listEl.appendChild(foot);
        }

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

// 🌟🌟 [جديد] تذكير "مواجهات ثنائية تنتظر الاستكمال" — بنفس فلسفة بطاقة "مستحق اليوم" أعلاه:
// المعلم طلب صراحةً أنه لو مواجهة بين طالبَين انتهت جولتها الأخيرة المُلعَبة وبقيت "معلّقة"
// بلا استكمال لمدة أسبوع كامل، يظهر تذكير نصّي بسيط يذكر اسمَي الطالبَين — بلا أي تحديد أو
// حفظ موعد فعلي (بطلب صريح: "نص توضيحي فقط"). النقر على أي صف يفتح شاشة اللعب مباشرة
// لاستكمال هذه المواجهة بعينها من الجولة التالية (راجع openDualTestPlayScreen المُصدَّرة من
// dualtests/dual-test-setup.js).
//
// 🌟 افتراضات صريحة استُخدمت هنا (لا يوجد تعريف سابق "أسبوع بلا استكمال" في المنصة):
// 1) "أسبوع" = 7 أيام كاملة (168 ساعة)، محسوبة من match.pausedAt — الحقل الجديد الذي يُحدَّث
//    في finishRound() بـ dual-test-play.js عند نهاية كل جولة (يمثّل لحظة "توقف" المواجهة).
// 2) مواجهة قديمة محفوظة قبل هذا التحديث (بلا pausedAt)، أو مواجهة لم تُلعَب أي جولة منها
//    بعد (توقفت فور الإنشاء)، تُحسَب احتياطاً من match.startedAt بدل تجاهلها تماماً.
// 3) لا حد أقصى زمني علوي: مواجهة متوقفة منذ شهور تبقى تظهر (بلا "انتهاء صلاحية")، بنفس
//    فلسفة عدم انتهاء الصلاحية المعتمدة أصلاً لنافذة "المواجهات المعلقة" نفسها.
// 4) حد أقصى 5 مواجهات معروضة (الأقدم توقفاً أولاً) حتى لا تُطيل البطاقة، بنفس نمط "مستحق اليوم".
const PENDING_MATCH_REMINDER_DAYS = 7;

// 🌟🌟 [تحديث] نفس تحويل "مستحق اليوم" أعلاه: القائمة التفصيلية مطوية افتراضياً
// خلف سطر ملخّص واحد قابل للنقر، وتبدأ مطوية في كل رسم (نفس الافتراضات الموثَّقة
// في renderDueForReview أعلاه تنطبق هنا بالحرف).
async function renderPendingDualMatchesReminder() {
    const wrap = document.getElementById('home-quickcard-pm');
    const summaryBtn = document.getElementById('home-quickcard-pm-summary');
    const summaryTextEl = document.getElementById('home-quickcard-pm-summary-text');
    const listEl = document.getElementById('home-quickcard-pm-list');
    if (!wrap || !summaryBtn || !summaryTextEl || !listEl || !AppState.dualTestsManager) return;

    try {
        // 🌟 [جديد] تنظيف أي مواجهات "يتيمة" (تشير لاختبار محذوف) قبل الحساب — كانت هذه
        // المواجهات تظهر هنا كتذكير مضلل رغم اختفاء اختبارها تماماً من شاشة الاختبارات
        // الثنائية (راجع cleanupOrphanedMatches الجديدة في database/dualTestsDB.js). best-effort:
        // لو فشل التنظيف لأي سبب، يكمل الحساب بالبيانات كما هي بلا توقف.
        await AppState.dualTestsManager.cleanupOrphanedMatches();

        const allMatches = await AppState.dualTestsManager.getAllMatches();
        const now = Date.now();
        const thresholdMs = PENDING_MATCH_REMINDER_DAYS * 86400000;

        const overdue = (allMatches || [])
            .filter(m => m.status !== 'completed' && !isTaskDone(`pm:${m.id}`)) // 🌟 [2026-10-07] «تمّت» اليوم تُخفي المواجهة
            .map(m => {
                const refIso = m.pausedAt || m.startedAt; // راجع الافتراض (2) أعلاه
                const refTime = refIso ? new Date(refIso).getTime() : NaN;
                return { match: m, refTime };
            })
            .filter(({ refTime }) => !isNaN(refTime) && (now - refTime) >= thresholdMs)
            .sort((a, b) => a.refTime - b.refTime); // الأقدم توقفاً أولاً = الأكثر إلحاحاً

        wrap.dataset.count = String(overdue.length);   // 🌟 [2026-10-03] العدد الكامل لزر «مهام» في الشريط السفلي
        wrap.dataset.urgent = String(overdue.length);  // 🌟 [2026-10-07] كل مواجهة معلّقة أسبوعاً فأكثر تُعدّ عاجلة
        if (overdue.length === 0) {
            wrap.style.display = 'none';
            return;
        }

        summaryTextEl.textContent = t('home_pm_badge').replace('{n}', overdue.length);
        wrap.classList.remove('is-expanded');
        summaryBtn.onclick = () => wrap.classList.toggle('is-expanded');

        listEl.innerHTML = '';
        overdue.slice(0, 5).forEach(({ match, refTime }) => {
            const overdueDays = Math.floor((now - refTime) / 86400000);
            const row = document.createElement('div');
            row.className = 'home-quickcard-pm-row';
            row.innerHTML = `
                <span class="qc-dot late" aria-hidden="true"></span>
                <span class="qc-row-main">
                    <span class="qc-row-name">${esc(match.studentNameA)} 🆚 ${esc(match.studentNameB)}</span>
                    <span class="qc-row-sub"><span class="qc-tag late">${t('home_pm_paused_since')} ${overdueDays} ${t('home_due_days_unit')}</span></span>
                </span>
                <span class="qc-row-btns">
                    <button type="button" class="qc-row-act">${t('home_act_resume')}</button>
                    <button type="button" class="qc-row-done" aria-label="${t('home_task_done')}" title="${t('home_task_done')}">✓</button>
                </span>
            `;
            wireDoneButton(row, `pm:${match.id}`, 'home-quickcard-pm');
            // 🌟 نقرة على أي صف تفتح شاشة اللعب مباشرة لاستكمال هذه المواجهة بعينها — نفس
            // مبدأ نقرة صف "مستحق اليوم" أعلاه، لكن هنا نستورد dual-test-setup.js ديناميكياً
            // (بدل استيراد ثابت أعلى الملف) حتى لا تُحمَّل شاشة الاختبارات الثنائية كاملة إلا
            // عند الحاجة الفعلية
            row.addEventListener('click', () => {
                import('../dualtests/dual-test-setup.js').then(module => {
                    module.openDualTestPlayScreen(match.id);
                }).catch(e => console.warn('تعذر فتح شاشة استكمال المواجهة المعلقة:', e));
            });
            listEl.appendChild(row);
        });

        wrap.style.display = 'block';
    } catch (e) {
        console.warn('تعذر التحقق من المواجهات الثنائية المعلقة منذ أكثر من أسبوع:', e);
        wrap.style.display = 'none';
    }
}

// 🌟🌟 [2026-10-07 — «مهام اليوم»] «واجبات تنتظر التصحيح» — مربوطة بسجل الواجبات: تستعمل نفس استعلام بطاقة
// «يحتاج تصحيح» في شاشة الواجبات (getSubmissionsNeedingGrading: تسليم حالته submitted/graded وبه سؤال يدوي
// بلا درجة) وتُصفّيه بنفس القاعدة (تسليمات الواجبات الموجودة في سجلّك المحلي فقط، لأن حذف واجب محلياً يُبقي
// تسليماته في الخادم). افتراضات صريحة:
// 1) لا تظهر المجموعة إلا لمعلم مسجَّل الدخول بجوجل على هذا الجهاز (بلا جلسة لا يوجد استعلام ولا نافذة دخول).
// 2) أي فشل (شبكة/خادم/جلسة مرفوضة) يُخفي المجموعة بصمت ولا يعرض صفراً مضللاً؛ شاشة الواجبات تبقى المرجع.
// 3) العمر = من submittedAt (أو timestamp)، ويُعدّ التسليم «عاجلاً» إذا مضى عليه يوم كامل فأكثر.
// 4) نتيجة الاستعلام تُحفظ 30 ثانية في الذاكرة فقط حتى لا يُعاد النداء عند كل تنقل للرئيسية.
// 5) النقر يفتح شاشة الواجبات (فيها غرفة التصحيح)، لا غرفة تصحيح تسليم بعينه.
const GRADING_CACHE_MS = 30000;
let gradingCache = null;

async function renderHomeworkAwaitingGrading() {
    const wrap = document.getElementById('home-quickcard-grade');
    const summaryBtn = document.getElementById('home-quickcard-grade-summary');
    const summaryTextEl = document.getElementById('home-quickcard-grade-summary-text');
    const listEl = document.getElementById('home-quickcard-grade-list');
    if (!wrap || !summaryBtn || !summaryTextEl || !listEl) return;

    const hide = () => { wrap.dataset.count = '0'; wrap.dataset.urgent = '0'; wrap.style.display = 'none'; };
    if (!AppState.homeworkManager || !isTeacherAuthed()) { hide(); return; }

    try {
        let pending;
        if (gradingCache && (Date.now() - gradingCache.at) < GRADING_CACHE_MS) {
            pending = gradingCache.pending;
        } else {
            const [subs, localHws] = await Promise.all([
                getSubmissionsNeedingGrading(),
                AppState.homeworkManager.getAllHomeworks()
            ]);
            const localIds = new Set((localHws || []).map(hw => String(hw.id)));
            pending = (subs || []).filter(sub => localIds.has(String(sub.hwId)));
            gradingCache = { at: Date.now(), pending };
        }
        if (!wrap.isConnected) return; // الشاشة الرئيسية استُبدلت أثناء الانتظار

        const now = Date.now();
        const rows = pending.filter(sub => !isTaskDone(`grade:${sub.docId || sub.id}`)).map(sub => {
            const ms = Date.parse(sub.submittedAt) || Number(sub.timestamp) || NaN;
            const days = isNaN(ms) ? 0 : Math.max(0, Math.floor((now - ms) / 86400000));
            return { sub, days };
        }).sort((a, b) => b.days - a.days); // الأقدم انتظاراً أولاً

        wrap.dataset.count = String(rows.length);
        wrap.dataset.urgent = String(rows.filter(r => r.days > 0).length);
        if (rows.length === 0) { wrap.style.display = 'none'; return; }

        summaryTextEl.textContent = t('home_grade_badge').replace('{n}', rows.length);
        wrap.classList.remove('is-expanded');
        summaryBtn.onclick = () => wrap.classList.toggle('is-expanded');

        listEl.innerHTML = '';
        rows.slice(0, 5).forEach(({ sub, days }) => {
            const isLate = days > 0;
            const tagText = isLate ? `${t('home_grade_waiting')} ${days} ${t('home_due_days_unit')}` : t('home_grade_today');
            const row = document.createElement('div');
            row.className = 'home-quickcard-grade-row';
            row.innerHTML = `
                <span class="qc-dot ${isLate ? 'late' : ''}" aria-hidden="true"></span>
                <span class="qc-row-main">
                    <span class="qc-row-name">${esc(sub.studentName || '')}</span>
                    <span class="qc-row-sub"><span class="qc-tag ${isLate ? 'late' : ''}">${tagText}</span></span>
                </span>
                <span class="qc-row-btns">
                    <button type="button" class="qc-row-act">${t('home_act_grade')}</button>
                    <button type="button" class="qc-row-done" aria-label="${t('home_task_done')}" title="${t('home_task_done')}">✓</button>
                </span>
            `;
            wireDoneButton(row, `grade:${sub.docId || sub.id}`, 'home-quickcard-grade');
            row.addEventListener('click', () => openHomeworkPrep());
            listEl.appendChild(row);
        });
        wrap.style.display = 'block';
    } catch (e) {
        console.warn('تعذر جلب «واجبات تنتظر التصحيح» للشاشة الرئيسية:', e);
        hide();
    }
}

// 🌟🌟 [جديد 2026-10-01] مجموعة "يحتاج منك اليوم" — تُرتِّب بطاقة "نظرة سريعة" بحسب ما ينتظر
// إجراءً فعلياً من المعلم اليوم، لا بحسب نوع المعلومة. لا تحسب شيئاً بنفسها: تقرأ فقط حالة
// الظهور التي ضبطتها الدوال الثلاث أعلاه (renderStudentBirthdayReminder / renderDueForReview /
// renderPendingDualMatchesReminder) على عناصرها الأصلية، فلا تتعارض مع أي منطق موجود.
//
// 🌟 افتراضات صريحة:
// 1) "يحتاج منك اليوم" = يوم ميلاد طالب اليوم + طلاب حان موعد مراجعتهم + مواجهات ثنائية معلّقة
//    أسبوعاً فأكثر. لا يدخل فيه بانر "التذكير الشهري بتحديث الحفظ" (يبقى بانراً مستقلاً خارج
//    البطاقة). [2026-10-07] الواجبات المنتظِرة للتصحيح صارت جزءاً منها (renderHomeworkAwaitingGrading).
// 2) رسالة "لا شيء معلّق اليوم" تظهر فقط عند وجود طالب واحد مسجَّل على الأقل؛ قبل ذلك تبقى
//    المجموعة مخفية بالكامل (حتى لا تُوحي بأن "كل شيء تمام" والمنصة فارغة أصلاً — الإرشاد لهذه
//    الحالة هو بطاقة "ابدأ من هنا" الموجودة في الشاشة الرئيسية).
// 🌟 [2026-10-03 — زر «مهام» في الشريط السفلي للهاتف] عدد المهام المعلّقة الظاهرة في «يحتاج منك اليوم»: يوم ميلاد طالب (1)
// + الطلاب المستحقة مراجعتهم + المواجهات الثنائية المعلّقة. الإحصاءات والآية لا تُحسب. يُبثّ بحدث dh:tasks-count فيعرضه
// components/homeFast.js رقمًا على الزر. لا يغيّر أي حساب: يقرأ ما رسمته الدوال أعلاه فقط.
// 🌟 [2026-10-07] قراءة موحّدة لأعداد المهام الظاهرة (يستعملها العدّاد وزر «مهام» والرأس الملخّص)
function getTaskCounts() {
    const shown = (id) => { const el = document.getElementById(id); return !!el && el.style.display !== 'none'; };
    const num = (id, key) => parseInt(document.getElementById(id)?.dataset[key] || '0', 10) || 0;
    const bday = shown('home-quickcard-bday') ? 1 : 0;
    const due = shown('home-quickcard-due') ? num('home-quickcard-due', 'count') : 0;
    const pm = shown('home-quickcard-pm') ? num('home-quickcard-pm', 'count') : 0;
    const grade = shown('home-quickcard-grade') ? num('home-quickcard-grade', 'count') : 0;
    const urgent = (shown('home-quickcard-due') ? num('home-quickcard-due', 'urgent') : 0)
        + (shown('home-quickcard-pm') ? num('home-quickcard-pm', 'urgent') : 0)
        + (shown('home-quickcard-grade') ? num('home-quickcard-grade', 'urgent') : 0);
    return { bday, due, pm, grade, urgent, total: bday + due + pm + grade };
}

function announceTasksCount() {
    const { total } = getTaskCounts();
    document.dispatchEvent(new CustomEvent('dh:tasks-count', { detail: { n: total } }));
}

// 🌟🌟 [2026-10-07 — «مهام اليوم» الشكل أ] شريط التقدّم: لا يوجد في المنصة سجل لمهمة «أُنجزت» (تختفي المهمة
// من القائمة حين يعالجها المعلم). فنحتفظ في localStorage بأعلى عدد مهام رُئي اليوم (الذروة)، والمُنجَز =
// الذروة − المتبقي الآن. افتراضات صريحة: (1) يبدأ يوم جديد عند منتصف الليل بتوقيت الجهاز. (2) لو ظهرت
// مهمة جديدة بعد معالجة أخرى في اليوم نفسه، فالمُنجَز قد يظهر أقل من الواقع. (3) لو تعذّر localStorage
// فالذروة هي العدد الحالي (المُنجَز صفر) ولا يتعطّل شيء.
const TODAY_PEAK_KEY = 'darham_today_tasks_peak';

function trackTodayProgress(total) {
    const d = new Date();
    const day = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    let peak = 0;
    try {
        const rec = JSON.parse(localStorage.getItem(TODAY_PEAK_KEY) || 'null');
        if (rec && rec.day === day && typeof rec.peak === 'number') peak = rec.peak;
    } catch (e) { /* تجاهل: نكمل بلا ذاكرة */ }
    if (total > peak) peak = total;
    try { localStorage.setItem(TODAY_PEAK_KEY, JSON.stringify({ day, peak })); } catch (e) { /* تجاهل */ }
    return { peak, done: Math.max(0, peak - total) };
}

// الشريحة المحدّدة حالياً في رأس «مهام اليوم» (all | due | pm | grade). لا تُحفَظ بين الزيارات.
let todayFilter = 'all';

function applyTodayFilter(expand) {
    const wrap = document.getElementById('home-quickcard-today');
    const chips = document.getElementById('home-quickcard-today-chips');
    if (!wrap) return;
    wrap.dataset.filter = todayFilter;
    if (chips) chips.querySelectorAll('[data-f]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === todayFilter)));
    // اختيار فئة يعني أن المعلم يريد تفاصيلها: نفتح قائمتها مباشرة
    if (expand && todayFilter !== 'all') {
        document.getElementById({ due: 'home-quickcard-due', pm: 'home-quickcard-pm', grade: 'home-quickcard-grade' }[todayFilter])?.classList.add('is-expanded');
    }
}

function renderTodaySummary(c) {
    const sum = document.getElementById('home-quickcard-today-sum');
    if (!sum) return;
    const { peak, done } = trackTodayProgress(c.total);
    const pct = peak > 0 ? Math.round((done / peak) * 100) : 0;

    document.getElementById('qts-count').textContent = String(c.total);
    const urgentEl = document.getElementById('qts-urgent');
    urgentEl.textContent = t('home_sum_urgent').replace('{n}', c.urgent);
    urgentEl.style.display = c.urgent > 0 ? '' : 'none';

    document.getElementById('qts-bar').setAttribute('aria-valuenow', String(pct));
    document.getElementById('qts-bar-fill').style.width = `${pct}%`;
    document.getElementById('qts-cap-text').textContent = t('home_progress_text').replace('{d}', done).replace('{t}', peak);
    document.getElementById('qts-cap-pct').textContent = `${pct}%`;

    // الشرائح لا تفيد إلا مع فئتين فأكثر؛ وفئة فارغة لا تُعرض
    const chips = document.getElementById('home-quickcard-today-chips');
    if (chips) {
        document.getElementById('qts-n-all').textContent = String(c.total);
        document.getElementById('qts-n-due').textContent = String(c.due);
        document.getElementById('qts-n-pm').textContent = String(c.pm);
        document.getElementById('qts-n-grade').textContent = String(c.grade);
        chips.querySelector('[data-f="due"]').style.display = c.due > 0 ? '' : 'none';
        chips.querySelector('[data-f="pm"]').style.display = c.pm > 0 ? '' : 'none';
        chips.querySelector('[data-f="grade"]').style.display = c.grade > 0 ? '' : 'none';
        chips.style.display = ((c.due > 0 ? 1 : 0) + (c.pm > 0 ? 1 : 0) + (c.grade > 0 ? 1 : 0)) >= 2 ? 'flex' : 'none';
        if (chips.style.display === 'none' || c[todayFilter] === 0) todayFilter = 'all';
        chips.onclick = (e) => {
            const btn = e.target.closest('[data-f]');
            if (!btn) return;
            todayFilter = btn.dataset.f;
            applyTodayFilter(true);
        };
    }
    applyTodayFilter(false);
    sum.style.display = 'block';
}

async function updateTodayGroup() {
    announceTasksCount();
    const wrap = document.getElementById('home-quickcard-today');
    const sum = document.getElementById('home-quickcard-today-sum');
    const clear = document.getElementById('home-quickcard-today-clear');
    if (!wrap || !sum || !clear) return;

    const ids = ['home-quickcard-bday', 'home-quickcard-due', 'home-quickcard-pm', 'home-quickcard-grade'];
    const anyVisible = ids.some(id => {
        const el = document.getElementById(id);
        return el && el.style.display !== 'none';
    });

    if (anyVisible) {
        renderTodaySummary(getTaskCounts());
        clear.style.display = 'none';
        wrap.style.display = 'block';
        return;
    }

    sum.style.display = 'none';
    try {
        const students = AppState.studentManager ? await AppState.studentManager.getAllStudents() : [];
        const hasStudents = !!(students && students.length > 0);
        if (!wrap.isConnected) return; // الشاشة الرئيسية استُبدلت أثناء القراءة
        clear.style.display = hasStudents ? 'flex' : 'none';
        wrap.style.display = hasStudents ? 'block' : 'none';
    } catch (e) {
        wrap.style.display = 'none';
    }
}

// يُستدعى مرة واحدة من setupSplashListeners() في core/app.js عند تحميل الشاشة الرئيسية
export function initHomeQuickview() {
    renderDailyQuote();
    renderMasteryAverage();
    renderReportsCount();
    // 🌟 [تعديل] الدوال الثلاث الخاصة بمجموعة "يحتاج منك اليوم" تُنفَّذ معاً ثم نحدّث المجموعة
    // بعد اكتمالها كلها (allSettled: فشل إحداها لا يمنع تحديث المجموعة). كانت تُستدعى سابقاً
    // منفصلة بلا انتظار، بنفس الترتيب والنتيجة لكل واحدة منها.
    Promise.allSettled([
        renderStudentBirthdayReminder(),
        renderDueForReview(),
        renderPendingDualMatchesReminder()
    ]).then(updateTodayGroup);
    // 🌟 [2026-10-07] نداء الخادم أبطأ من القراءات المحلية: يُرسم مستقلاً ثم تُحدَّث المجموعة مرة ثانية
    // (لا يؤخّر ظهور باقي المهام، وأي فشل فيه لا يمنع تحديث المجموعة)
    renderHomeworkAwaitingGrading().then(updateTodayGroup, updateTodayGroup);
    wireMonthlyMemoBanner();
    checkMonthlyMemoReminder();
}
