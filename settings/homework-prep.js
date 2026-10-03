// settings/homework-prep.js
import { AppState, loadSplashScreen } from '../core/app.js';
import { HomeworkEngine } from '../engine/homeworkEngine.js';
// 🌟 استدعاء دالة التحديث الجديدة 🌟
// 🌟 استدعاء getSubmissionsNeedingGrading لتفعيل بطاقة "يحتاج تصحيح" الجديدة 🌟
// 🌟 [إصلاح] أضفنا queuePendingHomeworkSync لحفظ أي واجب يفشل رفعه للسحابة في طابور
// إعادة المحاولة (راجع الشرح الكامل في core/firebase.js بجانب هذه الدالة)
// 🌟🌟 [جديد] أضفنا flushPendingHomeworkSync (إعادة محاولة الرفع يدوياً وعند فتح هذه الشاشة)
// وisHomeworkPendingSync (لمعرفة هل واجب معيّن لا يزال عالقاً محلياً، لعرض علامة ⏳ في سجل
// الواجبات) — راجع الشرح الكامل بجانب الدالتين في core/firebase.js
// 🌟🌟 [جديد — المرحلة 2] أضفنا getPendingSubmissionsCountForHomework: تسليمات الطلاب التي
// فشل رفعها للسحابة ولا تزال عالقة محلياً على جهاز الطالب نفسه لا تظهر إطلاقاً في نتيجة
// getSubmissionsFromCloud (لأنها أصلاً لم تصل للسحابة) — فكان المعلم لا يرى أي أثر لها هنا،
// حتى لو كان الطالب قد حل الواجب فعلاً. راجع core/firebase.js للشرح الكامل.
// 🌟🌟 [محدَّث — دمج نظام الواجبات الجديد] كانت هذه الدوال تُستورد من core/firebase.js (Firestore + App Check).
// الآن من core/homeworkApi.js (خادم Google Apps Script) — أبقينا نفس أسماء دوال القراءة لتقليل التغيير هنا،
// وأضفنا publishHomeworkToServer/fetchPublicHomework/gradeSubmissionOnServer. الدوال القديمة الخاصة بطوابير
// إعادة الرفع (queuePendingHomeworkSync...) موجودة هناك كدوال فارغة آمنة ولم يعد لها دور فعلي.
import { getSubmissionsFromCloud, getSubmissionsNeedingGrading, queuePendingHomeworkSync, flushPendingHomeworkSync, isHomeworkPendingSync, getPendingSubmissionsCountForHomework, publishHomeworkToServer, fetchPublicHomework, gradeSubmissionOnServer, isServerHomeworkId, friendlyErrorText } from '../core/homeworkApi.js';
// 🌟 [جديد] كتابة النتيجة المعتمدة في سجل الطالب (history_<id>) على جهاز المعلم + إيجاد/إنشاء الطالب
import { findLocalStudentForSubmission, findAmbiguousNameMatches, createLocalStudent, recordApprovedResult, normalizeName } from '../core/homeworkRecords.js';
// 🌟 بوابة الدخول بجوجل لنظام الواجبات (لو انتهت صلاحية الجلسة المحفوظة أثناء العمل)
import { ensureHomeworkSignIn } from '../components/teacherAuthGate.js';
// 🌟🌟 [جديد — المرحلة 2] دالة واحدة مشتركة لتحديد "هل هذا التسليم بحاجة تصحيح يدوي؟" بدل تكرار
// نفس المقارنة هنا وفي core/firebase.js — راجع core/submissionStatus.js للشرح الكامل.
// 🌟🌟 [جديد — المرحلة 3] syncSubmissionScoreToLocalHistory: تُبقي نسخة history_<studentId>
// المحلية متزامنة مع الدرجة النهائية بعد التصحيح اليدوي — راجع الشرح الكامل بجانبها في
// core/submissionStatus.js.
import { submissionNeedsGrading } from '../core/submissionStatus.js';
import { t, applyLanguage, localizeHomeworkText, surahLabel } from '../core/i18n.js';
const hl = localizeHomeworkText; // 🌟 ترجمة نص السؤال المخزَّن بالعربية وقت العرض فقط
// 🌟 [جديد — إصلاح XSS] تنظيف أي نص قادم من الخادم (اسم الطالب/إجاباته) قبل حقنه في innerHTML
import { esc } from '../core/escape.js';
// 🌟🌟 [جديد] شهادة تقدير + "النتائج النهائية للطلاب" — راجع reports/hwCertificate.js
import { showHomeworkCertificate } from '../reports/hwCertificate.js';
// 🌟🌟 [جديد] كل التسليمات المعتمدة (بلا فلتر واجب معيّن) لنافذة "النتائج النهائية للطلاب"
import { getAllSubmissionsFromCloud } from '../core/homeworkApi.js';
// 🌟🌟 [جديد] كل التسليمات بلا فلتر حالة — نحتاجها هنا أيضاً لمعرفة "هل وصل أي تسليم من هذا
// الطالب لهذا الواجب؟" بغض النظر عن كونه مصحَّحاً أم لا بعد — راجع loadOverdueHomeworkStat
import { listAllSubmissionsForNotifications } from '../core/homeworkApi.js';
// 🌟 [جديد 2026-10-01] التنظيف التلقائي: التأكد من حذف الواجب من الخادم قبل إزالة نسخته المحلية
import { isHomeworkMissingOnServer, listServerHomeworkIds } from '../core/homeworkApi.js';
// 🌟 [جديد] نطاق الواجب الحقيقي المسجَّل في الخادم (meta.scope) — احتياط لو لم تتوفر النسخة المحلية للواجب
import { fetchHomeworkScope } from '../core/homeworkApi.js';
// 🌟🌟 [جديد] ترميز بيانات الواجب داخل رابط المشاركة نفسه — بدل ما يحمل الرابط معرّف الواجب
// فقط ويحتاج بحث محلي/سحابي عند فتحه، بيحمل الواجب كامل، فيفتح فوراً بلا أي اتصال إطلاقاً
// (راجع الشرح الكامل بجانب encodeHomeworkForLink في database/homeworkDB.js)
// 🌟 [محدَّث] لم يعد الرابط يحمل الواجب مُرمَّزاً داخله (كان يحمل الإجابات الصحيحة للطالب!) — الرابط الآن معرّف فقط

let currentGeneratedQuestions = [];
// 🌟 [جديد] نطاق الواجب الفعلي الذي وُلّدت منه الأسئلة الحالية (من إعدادات المعلم وقت التوليد) — يُحفظ مع الواجب
// ويظهر في شهادة التقدير. null = أسئلة بلا نطاق مسجَّل (مثل واجب بُني يدوياً بالكامل).
let currentHwScope = null;
let hwEngine = null;

// 🌟🌟 [جديد] آخر واجب فشل رفعه للسحابة في نافذة المشاركة الحالية — تحتفظ به saveHomeworkToDB
// ليستخدمه retryHomeworkCloudSync عند ضغط المعلم على زر "إعادة المحاولة الآن" (راجع الدالتين
// أسفل هذا الملف)
let lastFailedHomeworkForRetry = null;

// 🌟🌟 [محدَّث] رابط المشاركة = عنوان المنصة + ?hw=<معرّف الواجب>. المعرّف عشوائي غير قابل للتخمين (يولّده الخادم)،
// والرابط لا يحمل أي أسئلة أو إجابات؛ الطالب يجلب الواجب (بدون الإجابات الصحيحة) من الخادم عند فتحه.
function buildHomeworkShareLink(baseUrl, hwData) {
    return `${baseUrl}?hw=${hwData.id}`;
}

// 🌟🌟 [جديد] رسالة "نسخ رابط الواجب" الجاهزة كاملة للمشاركة عبر واتساب أو أي تطبيق مراسلة —
// بدل نسخ الرابط وحده كما كان سابقاً. تُستخدَم في كل مكان يوجد فيه زر "نسخ" (🔗/📋) لرابط
// الواجب: الصف المضمّن في سجل الواجبات (buildHomeworkList) وزر النسخ في نافذة المشاركة
// (copyHomeworkLink).
// 🌟 [محدَّث] بعد حذف زر "إرسال عبر واتساب" المباشر (btn-share-wa)، لم يعد هناك سوى طريقة
// واحدة للمشاركة عبر واتساب: نسخ هذه الرسالة الجاهزة ولصقها يدوياً.
function buildHomeworkShareMessage(link) {
    return `${t('hw_copy_msg_title')}\n${t('hw_copy_msg_link_label')}\n${link}\n${t('hw_copy_msg_footer')}`;
}

// 🌟🌟 [جديد] الحد الأقصى لعدد رقاقات "اقتراحات سريعة بناءً على حفظ الطالب" المعروضة دفعة
// واحدة — راجع suggestRangeFromStudentMemo أدناه. سهل التعديل لاحقاً من هنا فقط.
const MEMO_SUGGESTION_MAX_SURAHS = 5;

let currentSubmissionsList = [];
let currentHwIdForGrading = null;

// 🌟 معرّفات الواجبات (hwId) التي بها تسليم واحد على الأقل ينتظر تصحيح المعلم اليدوي — تُملأ من
// loadNeedsGradingStat وتُستخدم لوضع علامة تنبيه ⚠️ بجانب الواجب المتأثر في سجل الواجبات
let pendingGradingHwIds = new Set();

export async function initHomeworkPrep() {
    // 🌟 [2026-10-02] حلّت الجولة الإرشادية (components/guidedTour.js) محل تلميح 'homework_prep' القديم.
    // تنتظر ظهور عناصر الشاشة فعلياً قبل الإبراز، وbest-effort (أي فشل لا يمنع فتح الشاشة).
    import('../components/guidedTour.js').then(m => m.maybeStartTour('homework')).catch(() => {});

    if (AppState.quranEngine) {
        hwEngine = new HomeworkEngine(AppState.quranEngine);
    } else {
        console.error(t("محرك القرآن غير متوفر!"));
    }

    populateDropdowns();
    await populateTargetStudents();
    setupListeners();
    toggleHwType();

    await loadHomeworkDashboard();

    // 🌟🌟 [إصلاح جوهري] كان تحذير فشل الرفع (hw_cloud_sync_warning) يطلب من المعلم "إعادة فتح
    // هذه الشاشة لاحقاً للتأكد من نجاح الرفع" — لكن إعادة فتح الشاشة (قبل هذا الإصلاح) لم تكن
    // تُعيد المحاولة فعلياً على الإطلاق؛ إعادة المحاولة التلقائية الوحيدة كانت مرتبطة بإقلاع
    // كامل للمنصة (core/app.js). الآن نُعيد المحاولة فعلياً في كل مرة تُفتح فيها هذه الشاشة
    // تحديداً، فتصبح تعليمة التحذير صحيحة فعلاً. لا ننتظرها (fire-and-forget) حتى لا نُجمّد فتح
    // الشاشة على المعلم، ونعيد رسم سجل الواجبات فقط لو نجح رفع واجب واحد على الأقل (لإخفاء
    // علامة ⏳ الخاصة به فوراً).
    flushPendingHomeworkSync()
        .then(result => { if (result.sent > 0) loadHomeworkDashboard(); })
        .catch(err => console.error("خطأ أثناء إعادة محاولة رفع الواجبات المعلّقة عند فتح شاشة الواجبات:", err));
}

// 🌟 [جديد] أسماء الطلاب الظاهرين (غير المخفيين) المتاحين لقائمة "تخصيص الواجب لطالب محدد"
let targetStudentNames = [];

// 🌟 [جديد] تطبيع نص البحث العربي: يتجاهل التشكيل والتطويل والفروق بين (أ إ آ ا) و(ى ي) و(ة ه)
// حتى يجد المعلم الاسم مهما كانت طريقة كتابته (مثلاً "احمد" تجد "أحمد")
function normalizeSearchText(str) {
    return String(str || '')
        .toLowerCase()
        .replace(/[ً-ٰٟـ]/g, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .trim();
}

// 🌟🌟 [أُعيد تصميمه بطلب المعلم] واجهة "تخصيص الواجب" صارت: زر "رابط عام لكل الطلاب" + حقل بحث واحد.
//  - الوضع الافتراضي = رابط عام (الزر مفعَّل)، فيكتب الطالب اسمه بنفسه عند فتح الرابط.
//  - الكتابة في البحث تعرض النتائج؛ اختيار اسم منها يخصّص الواجب له ويُلغي تفعيل زر "رابط عام" تلقائياً.
//  - الضغط على زر "رابط عام" يمسح الطالب المختار والبحث ويرجع الواجب عاماً.
// القائمة الأصلية <select id="hw-target-student"> بقيت مخفية كمصدر الحقيقة الوحيد للقيمة، حتى لا يتغير
// أي كود آخر يقرؤها (اقتراح النطاق، الحفظ، التجهيل المسبق من "مستحق اليوم").
const TARGET_SEARCH_MAX_RESULTS = 8;

// يضبط الطالب المستهدف ("" = رابط عام) ويُطلق حدث change ليعمل اقتراح النطاق كما كان
function setTargetStudent(name) {
    const select = document.getElementById('hw-target-student');
    if (!select) return;
    select.value = name || '';
    select.dispatchEvent(new Event('change'));
    syncTargetStudentUI();
}

// يعكس القيمة الحالية على الواجهة: حالة زر "رابط عام"، شريط الطالب المختار، وسطر التوضيح
function syncTargetStudentUI() {
    const select = document.getElementById('hw-target-student');
    const generalBtn = document.getElementById('hw-general-btn');
    const chip = document.getElementById('hw-target-student-chip');
    const chipName = document.getElementById('hw-target-student-chip-name');
    const hint = document.getElementById('hw-target-mode-hint');
    const searchInput = document.getElementById('hw-target-student-search');
    const results = document.getElementById('hw-target-student-results');
    const noResult = document.getElementById('hw-target-student-noresult');
    if (!select) return;

    const name = select.value;
    if (generalBtn) {
        generalBtn.classList.toggle('is-active', !name);
        generalBtn.setAttribute('aria-pressed', String(!name));
    }
    if (chip) chip.style.display = name ? 'flex' : 'none';
    if (chipName) chipName.textContent = name;
    if (hint) hint.textContent = name ? t('hw_hint_student') : t('hw_hint_general');
    if (searchInput) searchInput.value = '';
    if (results) { results.innerHTML = ''; results.style.display = 'none'; }
    if (noResult) noResult.style.display = 'none';
}

// يعرض نتائج البحث (أول TARGET_SEARCH_MAX_RESULTS مطابقة) كأزرار قابلة للنقر تحت الحقل
function renderTargetStudentResults(query) {
    const results = document.getElementById('hw-target-student-results');
    const noResult = document.getElementById('hw-target-student-noresult');
    if (!results) return;

    const q = normalizeSearchText(query);
    results.innerHTML = '';
    if (!q) {
        results.style.display = 'none';
        if (noResult) noResult.style.display = 'none';
        return;
    }

    const matches = targetStudentNames.filter(name => normalizeSearchText(name).includes(q));
    matches.slice(0, TARGET_SEARCH_MAX_RESULTS).forEach(name => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'hwp2-student-result';
        btn.textContent = '👤 ' + name;
        btn.dataset.name = name;
        results.appendChild(btn);
    });
    results.style.display = matches.length ? 'flex' : 'none';
    if (noResult) noResult.style.display = matches.length ? 'none' : 'block';
}

function setupTargetStudentSearch() {
    const searchInput = document.getElementById('hw-target-student-search');
    const results = document.getElementById('hw-target-student-results');
    const generalBtn = document.getElementById('hw-general-btn');
    const clearBtn = document.getElementById('hw-target-student-clear');
    if (!searchInput || !results) return;

    searchInput.addEventListener('input', () => renderTargetStudentResults(searchInput.value));
    // Enter يختار أول نتيجة مباشرة (اختصار للمعلم)
    searchInput.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const first = results.querySelector('.hwp2-student-result');
        if (first) setTargetStudent(first.dataset.name);
    });
    results.addEventListener('click', (e) => {
        const btn = e.target.closest('.hwp2-student-result');
        if (btn) setTargetStudent(btn.dataset.name);
    });
    // زر "رابط عام لكل الطلاب": يمسح أي طالب مختار ويوقف البحث الجاري
    generalBtn?.addEventListener('click', () => setTargetStudent(''));
    clearBtn?.addEventListener('click', () => setTargetStudent(''));
}

async function populateTargetStudents() {
    const select = document.getElementById('hw-target-student');
    if (!select) return;

    const students = await AppState.studentManager.getAllStudents();
    // 🌟 [جديد] نحتفظ بأسماء الطلاب الظاهرين فقط (المخفي لا يظهر لا في القائمة ولا في البحث
    // إلا بعد إعادة تفعيله) لاستخدامها في التصفية عند البحث دون إعادة الاستعلام من قاعدة البيانات
    targetStudentNames = students.filter(s => !s.isHidden).map(s => s.name);

    // القائمة المخفية تحمل كل الطلاب الظاهرين ليعمل select.value (التجهيل المسبق والحفظ) كما كان
    select.innerHTML = `<option value="">${t('hw_general_link')}</option>`;
    targetStudentNames.forEach(name => select.appendChild(new Option(name, name)));

    // 🌟 [جديد] تجهيل مسبق للطالب المستهدف عند القدوم من نقرة "مستحق اليوم" في
    // بطاقة نظرة سريعة بالشاشة الرئيسية — تُقرأ القيمة مرة واحدة فقط ثم تُفرَّغ
    // فوراً حتى لا تؤثر على أي فتح عادي لاحق لهذه الشاشة
    if (AppState.homeworkPrepPrefillStudentName) {
        select.value = AppState.homeworkPrepPrefillStudentName;
        AppState.homeworkPrepPrefillStudentName = null;
    }
    syncTargetStudentUI(); // 🌟 عكس القيمة الحالية على الأزرار وسطر التوضيح

    // 🌟 [جديد] تطبيق اقتراح النطاق تلقائياً إن كان هناك طالب مختار بالفعل الآن
    // (سواء من التجهيل المسبق أعلاه، أو لو أُعيد تحميل هذه القائمة وطالب ما
    // كان مختاراً بالفعل من قبل) — انظر suggestRangeFromStudentMemo أدناه
    await suggestRangeFromStudentMemo();
}

// 🌟🌟 [محدَّث] اقتراحات سريعة للاختبارات بناءً على نطاق حفظ الطالب المسجَّل
// مسبقاً (student.memoFrom/memoTo) عند اختيار "طالب محدد". بناءً على توضيح
// صريح من المعلم: الاقتراح **سورة بسورة** (رقاقة/chip مستقلة لكل سورة ضمن
// النطاق) وليس نطاقاً واحداً يجمع عدة سور معاً — إلا في حالة خاصة واحدة: لو
// كان نطاق حفظ الطالب بالكامل داخل جزء عم (الجزء الثلاثون، من سورة النبأ 78
// إلى سورة الناس 114)، فالمعتاد اعتبار الجزء كاملاً كوحدة اختبار واحدة، فتظهر
// رقاقة واحدة فقط لـ"جزء عم كاملاً". النقر على أي رقاقة يملأ إعدادات الاختبار
// المناسبة (سورة محددة، أو بالأجزاء لحالة جزء عم) — مجرد اقتراح قابل للتعديل
// اليدوي الكامل دائماً، وليس فرضاً. لو كان الاقتراح المتاح رقاقة واحدة فقط
// (سورة واحدة في النطاق، أو حالة جزء عم)، تُطبَّق تلقائياً فور ظهورها توفيراً
// لخطوة الاختيار؛ أما الاقتراحات المتعددة فتبقى بانتظار اختيار المعلم لواحدة
// منها (قد يستخدمها لإنشاء عدة واجبات منفصلة، واجب لكل سورة، عبر أكثر من زيارة
// لهذه الشاشة). تُستدعى عند تحميل الشاشة (تغطي حالة التجهيل المسبق من "مستحق
// اليوم") وعند تغيير القائمة يدوياً.
async function suggestRangeFromStudentMemo() {
    const select = document.getElementById('hw-target-student');
    const box = document.getElementById('hw-memo-suggestion-box');
    const labelEl = document.getElementById('hw-memo-suggestion-label');
    const chipsEl = document.getElementById('hw-memo-suggestion-chips');
    if (!select) return;

    const studentName = select.value;
    if (box) box.style.display = 'none';
    if (chipsEl) chipsEl.innerHTML = '';
    if (!studentName) return; // رابط عام — لا يوجد طالب محدد لاقتراح شيء بناءً عليه

    const students = await AppState.studentManager.getAllStudents();
    const student = students.find(s => s.name === studentName);
    if (!student || !student.memoFrom || !student.memoTo) return;

    const fromSurah = AppState.surahsData.find(s => s.name === student.memoFrom);
    const toSurah = AppState.surahsData.find(s => s.name === student.memoTo);
    if (!fromSurah || !toSurah) return;

    const minNum = Math.min(fromSurah.number, toSurah.number);
    const maxNum = Math.max(fromSurah.number, toSurah.number);

    // 🌟 حدود جزء عم (الجزء الثلاثون): من سورة النبأ (78) إلى سورة الناس (114)
    const JUZ_AMMA_START = 78, JUZ_AMMA_END = 114;
    const isFullyJuzAmma = (minNum >= JUZ_AMMA_START && maxNum <= JUZ_AMMA_END);

    let suggestions = [];
    let wasTruncatedToRecent = false; // 🌟 يُستخدَم أدناه لتعديل نص التسمية فوق الرقاقات
    // 🌟🌟 [محدَّث — بطلب صريح من المعلم بعد التجربة الفعلية] كانت تُعرض رقاقة لكل سورة ضمن
    // نطاق حفظ الطالب بالكامل دفعة واحدة — لطالب حافظ نطاقاً واسعاً (مثلاً من الفاتحة إلى
    // النبأ = 78 سورة) كانت تتحول لكتلة رقاقات مزدحمة غير عملية إطلاقاً (هذا بالضبط ما رفضه
    // المعلم). الآن تُعرض فقط آخر MEMO_SUGGESTION_MAX_SURAHS سورة من النطاق.
    // ⚠️ افتراض صريح غير محسوم بتوضيح إضافي من المعلم: اعتبرنا memoTo هو آخر نقطة وصل إليها
    // حفظ الطالب فعلياً (لا مجرد الحد الأعلى رقمياً للنطاق)، فـ"آخر ما حفظ" = السور الأقرب
    // رقمياً من memoTo، سواء كان رقمها أكبر أو أصغر من memoFrom. لو كان المقصود عكس هذا
    // الاتجاه، التعديل سطر واحد فقط (قلب الشرط towardsTo أدناه).
    if (isFullyJuzAmma) {
        suggestions.push({
            label: `📖 ${t('hw_memo_suggestion_juz_amma')}`,
            apply: () => {
                const juzRadio = document.querySelector('input[name="hwType"][value="juz"]');
                if (juzRadio) { juzRadio.checked = true; toggleHwType(); }
                const juzSelect = document.getElementById('hw-juz-select');
                if (juzSelect) juzSelect.value = '30';
            }
        });
    } else {
        const fullRangeNums = [];
        for (let num = minNum; num <= maxNum; num++) fullRangeNums.push(num);

        wasTruncatedToRecent = fullRangeNums.length > MEMO_SUGGESTION_MAX_SURAHS;
        const towardsTo = toSurah.number >= fromSurah.number; // النطاق يتجه تصاعديًا نحو toSurah
        const recentNums = wasTruncatedToRecent
            ? (towardsTo
                ? fullRangeNums.slice(-MEMO_SUGGESTION_MAX_SURAHS)   // الأقرب لـ toSurah = الأعلى رقماً
                : fullRangeNums.slice(0, MEMO_SUGGESTION_MAX_SURAHS)) // الأقرب لـ toSurah = الأدنى رقماً
            : fullRangeNums;

        recentNums.forEach(num => {
            const surah = AppState.surahsData.find(s => s.number === num);
            if (!surah) return;
            suggestions.push({
                label: `${num}. ${surah.name}`,
                apply: () => {
                    const surahRadio = document.querySelector('input[name="hwType"][value="surah"]');
                    if (surahRadio) { surahRadio.checked = true; toggleHwType(); }
                    const surahSelect = document.getElementById('hw-surah-select');
                    if (surahSelect) { surahSelect.value = String(num); updateAyahRange(); }
                }
            });
        });
    }

    if (suggestions.length === 0) return;

    if (labelEl) {
        labelEl.textContent = wasTruncatedToRecent
            ? `${t('hw_memo_suggestion_recent_prefix').replace('{n}', MEMO_SUGGESTION_MAX_SURAHS)} (${student.memoFrom} ← ${student.memoTo})`
            : `${t('hw_memo_suggestion_prefix')} ${student.memoFrom} ← ${student.memoTo}`;
    }

    suggestions.forEach((sug) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'hw-memo-suggestion-chip';
        chip.textContent = sug.label;
        chip.addEventListener('click', () => {
            sug.apply();
            document.querySelectorAll('.hw-memo-suggestion-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        });
        if (chipsEl) chipsEl.appendChild(chip);

        // اقتراح وحيد فقط (سورة واحدة في النطاق، أو حالة جزء عم) → يُطبَّق تلقائياً
        if (suggestions.length === 1) {
            sug.apply();
            chip.classList.add('active');
        }
    });

    if (box) box.style.display = 'block';
}

// ==========================================
// 📊 دوال الإحصائيات وسجل الواجبات
// ==========================================
async function loadHomeworkDashboard() {
    const allHWs = await AppState.homeworkManager.getAllHomeworks() || [];

    let publishedCount = 0;
    let draftCount = 0;

    const tbody = document.getElementById('hw-history-tbody');
    tbody.innerHTML = '';

    if (allHWs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="padding: 20px; color: #94a3b8;">${t("لا توجد واجبات سابقة مسجلة.")}</td></tr>`;
    } else {
        allHWs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(hw => {
            if (hw.status === 'published') publishedCount++;
            else if (hw.status === 'draft') draftCount++;

            const dateStr = new Date(hw.createdAt).toLocaleDateString(AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US');
            const qCount = hw.questions ? hw.questions.length : 0;

            const publishedLabel = t('hw_published_now').replace(/[🚀📝]/g, '').trim();
            const draftLabel = t('hw_draft_status').replace(/[🚀📝]/g, '').trim();

            const statusBadge = hw.status === 'published'
                ? `<span style="background:#dcfce7; color:#166534; padding:5px 10px; border-radius:20px; font-size:0.9rem;">${publishedLabel}</span>`
                : `<span style="background:#fef3c7; color:#b45309; padding:5px 10px; border-radius:20px; font-size:0.9rem;">${draftLabel}</span>`;

            const generalLinkText = t('hw_general_link').replace(/[-]/g, '').trim();
            const targetInfo = hw.assignedStudentName
                ? `<div style="color:#059669; font-size:0.9rem; margin-top:5px;">👤 ${hw.assignedStudentName}</div>`
                : `<div style="color:#64748b; font-size:0.9rem; margin-top:5px;">🌍 ${generalLinkText}</div>`;

            const baseUrl = window.location.origin + window.location.pathname;
            // 🌟 [إصلاح] رابط مكتفي ذاتياً (يحمل الواجب كامل، بلا حاجة لأي اتصال عند فتحه)
            // بدل رابط بمعرّف بسيط فقط — راجع buildHomeworkShareLink أعلاه في هذا الملف
            const hwLink = buildHomeworkShareLink(baseUrl, hw);
            // 🌟 واجب منشور من النظام القديم (Firebase) لا يعمل رابطه مع الخادم الجديد — نُظهر شارة بدل رابط مضلِّل
            const isLegacyPublished = hw.status === 'published' && !isServerHomeworkId(hw.id);

            const tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid #e2e8f0";
            // 🌟 نحتاج معرّف الواجب على الصف نفسه حتى تقدر loadNeedsGradingStat لاحقاً (بعد وصول
            // رد السحابة) تحدد أي صف تضيف له علامة تنبيه "يحتاج تصحيح" بدون إعادة رسم الجدول كله
            tr.dataset.hwId = hw.id;
            // 🌟 [جديد 2026-10-01] حالة الواجب واسم الطالب على الصف نفسه لتعمل التصفية والبحث (applyHwFilter) بلا إعادة رسم
            tr.dataset.status = hw.status;
            tr.dataset.name = String(hw.assignedStudentName || '').toLowerCase();

            tr.innerHTML = `
                <td style="padding: 15px; color: #475569; font-weight: bold;">${dateStr}</td>
                <td style="padding: 15px; color: #0f172a;">${qCount} ${t("سؤال")} ${targetInfo}</td>
                <td style="padding: 15px;">
                    ${statusBadge}
                    <!-- 🌟🌟 [جديد] علامة "لم يُرفع للسحابة بعد" — تُحسَب مباشرة (بلا انتظار أي رد
                         شبكة) من طابور إعادة المحاولة المحلي عبر isHomeworkPendingSync، فتظهر فوراً
                         مع كل رسم لسجل الواجبات لأي واجب منشور لا يزال عالقاً محلياً فقط. هذا يجعل
                         مشكلة فشل الرفع مرئية دائماً للمعلم في سجل الواجبات نفسه، بدل الاعتماد فقط
                         على تحذير لحظي يظهر مرة واحدة في نافذة المشاركة ثم يختفي للأبد. -->
                    ${hw.status === 'published' && isHomeworkPendingSync(hw.id)
                        ? `<div style="margin-top:6px; background:#fef3c7; color:#92400e; font-size:0.8rem; padding:3px 10px; border-radius:12px; font-weight:bold;">⏳ ${t('hw_pending_sync_row_badge')}</div>`
                        : ''}
                    <!-- 🌟 مخفية افتراضياً؛ تظهرها loadNeedsGradingStat فقط لو فيه تسليم لهذا الواجب
                         بانتظار تصحيح المعلم اليدوي (نفس معيار needsManualGrading المستخدم أصلاً
                         في loadSubmissionsInline) -->
                    <div id="hw-alert-${hw.id}" style="display:none; margin-top:6px; background:#fee2e2; color:#b91c1c; font-size:0.8rem; padding:3px 10px; border-radius:12px; font-weight:bold;">⚠️ ${t('hw_needs_grading_row_badge')}</div>
                    <!-- 🌟🌟 [جديد] مخفية افتراضياً؛ تظهرها loadOverdueHomeworkStat فقط لو كان هذا
                         الواجب مخصَّصاً لطالب محدد، منشوراً منذ HW_OVERDUE_DAYS يوماً أو أكثر، ولم
                         يصل أي تسليم منه بعد لهذا الطالب — راجع الدالة أسفل هذا الملف -->
                    <div id="hw-overdue-${hw.id}" style="display:none; margin-top:6px; background:#ffedd5; color:#9a3412; font-size:0.85rem; padding:4px 12px; border-radius:12px; font-weight:bold;">⏰ ${hw.assignedStudentName ? t('hw_overdue_not_solved').replace('{name}', esc(hw.assignedStudentName)) : t('hw_overdue_row_badge')}</div>
                </td>
                <!-- 🌟🌟 [إعادة تصميم] أزرار الإجراءات أصبحت دائرية أكبر وأوضح (hwp2-action-btn
                     المعرَّفة في settings/homework-prep.html) بدل الأزرار المستطيلة الصغيرة
                     السابقة — كل إجراء محتفظ بلونه المميز (عرض/نسخ/حذف) لسهولة التمييز بصرياً 🌟🌟 -->
                <!-- 🌟🌟 [إعادة تصميم 2026-10-01] أزرار الإجراءات: زر أساسي واحد واضح يتغير حسب حالة الواجب
                     (نشر للمسودة / يحتاج تصحيح / النتائج / تذكير الطالب للمتأخر — تُضبط حالته في applyHwRowStates)،
                     ثم نسخ الرابط، و"حذف" داخل قائمة ⋯ حتى لا يُضغط بالخطأ. نفس أصناف الأزرار القديمة
                     (btn-view-results / btn-copy-hw-row-link / btn-delete-hw-record / btn-publish-draft-row)
                     محفوظة حتى تبقى كل المستمعات الموجودة تعمل بلا أي تغيير 🌟🌟 -->
                <td style="padding: 15px;">
                    <div class="hwp3-actions">
                        ${hw.status === 'draft' ? `
                        <button type="button" class="hwp3-btn hwp3-btn-publish btn-publish-draft-row" data-id="${hw.id}" title="${t('hw_act_publish')}"><span aria-hidden="true">🚀</span> <span class="hwp3-lbl">${t('hw_act_publish')}</span></button>` : `
                        <button type="button" class="hwp3-btn hwp3-btn-results btn-view-results" data-id="${hw.id}" title="${t('hw_subs_modal_title')}"><span class="hwp3-ic" aria-hidden="true">📊</span> <span class="hwp3-lbl">${t('hw_act_results')}</span></button>
                        ${isLegacyPublished
                            ? `<span style="background:#e5e7eb; color:#374151; font-size:0.8rem; padding:3px 10px; border-radius:12px; font-weight:bold;">${t('hw_legacy_row_badge')}</span>`
                            : `<button type="button" class="hwp3-btn hwp3-btn-link btn-copy-hw-row-link" data-hw-link="${encodeURIComponent(hwLink)}" title="${t('hw_act_link')}"><span aria-hidden="true">🔗</span> ${t('hw_act_link')}</button>`}`}
                        <!-- 🌟 [تعديل] "حذف" زر ظاهر مباشرة في الصف (بدل قائمة ⋯ المنسدلة)، وتأكيده في نافذة بوسط الشاشة -->
                        <button type="button" class="hwp3-btn hwp3-btn-delete btn-delete-hw-record" data-id="${hw.id}" title="${t('hw_act_delete')}"><span aria-hidden="true">🗑️</span> ${t('hw_act_delete')}</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);

            // 🌟 صف مضمّن (مخفي افتراضياً) سيعرض الطلاب المسلَّمين لهذا الواجب مباشرة داخل
            // نفس شاشة "سجل الواجبات"، بدل النافذة المنبثقة المنفصلة سابقاً.
            const subsRow = document.createElement('tr');
            subsRow.id = `hw-subs-row-${hw.id}`;
            subsRow.style.display = 'none';
            subsRow.innerHTML = `
                <td colspan="4" style="padding: 15px; background: #f8fafc;">
                    <div id="hw-subs-container-${hw.id}"></div>
                </td>
            `;
            tbody.appendChild(subsRow);
        });

        document.querySelectorAll('.btn-delete-hw-record').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (await confirmHwDelete()) {   // 🌟 نافذة تأكيد في وسط الصفحة بدل confirm() العلوي
                    await AppState.homeworkManager.deleteHomework(id);
                    await loadHomeworkDashboard();
                }
            });
        });

        // 🌟 [جديد 2026-10-01] نشر مسودة محفوظة مسبقاً من سجل الواجبات (كانت المسودة طريقاً مسدوداً: لا تعديل ولا نشر)
        document.querySelectorAll('.btn-publish-draft-row').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const b = e.currentTarget;
                b.disabled = true;
                try { await publishDraftFromHistory(b.getAttribute('data-id')); }
                finally { b.disabled = false; }
            });
        });

        document.querySelectorAll('.btn-view-results').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const hwId = e.currentTarget.getAttribute('data-id');
                await toggleInlineSubmissions(hwId);
            });
        });

        // 🌟🌟 [جديد] زر نسخ رابط الواجب في سجل الواجبات — ينسخ رسالة جاهزة كاملة للمشاركة
        // (buildHomeworkShareMessage) بدل الرابط وحده. عبر data-attribute + addEventListener
        // (لا onclick مباشر في الـ HTML) لتفادي أي تعارض بين علامات الاقتباس والنص العربي/الرابط.
        document.querySelectorAll('.btn-copy-hw-row-link').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const link = decodeURIComponent(e.currentTarget.getAttribute('data-hw-link'));
                navigator.clipboard.writeText(buildHomeworkShareMessage(link))
                    .then(() => alert(t('hw_link_copied')))
                    .catch(() => alert(t("يرجى نسخ الرابط يدوياً.")));
            });
        });

        bindHwRowExtras();
    }

    document.getElementById('stat-published').innerText = publishedCount;
    document.getElementById('stat-draft').innerText = draftCount;
    // 🌟 [جديد 2026-10-01] تطبيق حالة الأزرار والمرشِّح الحالي فوراً على الصفوف المرسومة (قبل وصول ردود السحابة)
    applyHwRowStates();
    applyHwFilter();
    // 🌟 [جديد 2026-10-01] إزالة نسخ الواجبات المحلية التي حذفها التنظيف التلقائي من الخادم (بلا انتظار — لا تحجب الجدول)
    reconcileServerDeletedHomeworks(allHWs);

    // 🌟🌟 [جديد] بطاقة "يحتاج تصحيح" تُحدَّث بشكل منفصل وغير محجوب (بدون await هنا عمداً):
    // الجدول أعلاه يظهر فوراً من البيانات المحلية (IndexedDB)، بينما هذه البطاقة تعتمد على
    // استعلام سحابي (Firestore) قد يستغرق ثانية أو أكثر — تشغيلها بدون انتظار يمنع تجميد
    // ظهور سجل الواجبات كله بسبب بطء الشبكة أو انقطاعها.
    loadNeedsGradingStat(allHWs);

    // 🌟🌟 [جديد] بطاقة "متأخر عن التسليم" — نفس فلسفة "يحتاج تصحيح" أعلاه بالضبط (استعلام
    // سحابي بلا await هنا حتى لا يُجمَّد ظهور الجدول). نمرّر allHWs (محلية بالفعل، بلا استعلام
    // إضافي) لأن هذه الدالة تحتاج معرفة أي الواجبات "مخصَّصة لطالب محدد" ومتى نُشرت.
    loadOverdueHomeworkStat(allHWs);
}

// 🌟🌟 [جديد] تجلب من السحابة (عبر getSubmissionsNeedingGrading) عدد كل التسليمات التي تحتاج
// تصحيح المعلم اليدوي عبر كل الواجبات دفعة واحدة، وتُحدّث بطاقة "يحتاج تصحيح" في الأعلى + تضع
// علامة تنبيه ⚠️ بجانب كل واجب متأثر في سجل الواجبات (الصفوف مبنية مسبقاً بمعرّف hw-alert-<id>
// مخفي افتراضياً في loadHomeworkDashboard أعلاه).
// 🌟 [إصلاح 2026-10-03] حذف الواجب من السجل يحذف نسخته المحلية فقط، وتسليماته تبقى في الخادم —
// فكانت البطاقة تعدّ تسليمات واجبات محذوفة ("يحتاج تصحيح 1" والقائمة فارغة). نعدّ الآن فقط تسليمات
// الواجبات الموجودة في سجلك (allHWs)، فتطابق البطاقة القائمة دائماً.
async function loadNeedsGradingStat(allHWs) {
    const statEl = document.getElementById('stat-needs-grading');
    if (!statEl) return;
    statEl.innerText = '⏳';

    try {
        if (!allHWs) allHWs = await AppState.homeworkManager.getAllHomeworks() || [];   // نداء بلا معامل (بعد حفظ التصحيح)
        const localIds = new Set(allHWs.map(hw => String(hw.id)));
        const pending = (await getSubmissionsNeedingGrading()).filter(sub => localIds.has(String(sub.hwId)));
        pendingGradingHwIds = new Set(pending.map(sub => sub.hwId));
        statEl.innerText = pending.length;

        pendingGradingHwIds.forEach(hwId => {
            const alertEl = document.getElementById(`hw-alert-${hwId}`);
            if (alertEl) alertEl.style.display = 'inline-block';
        });
        applyHwRowStates();   // 🌟 زر الصف يتحول إلى "يحتاج تصحيح" أو يعود "النتائج" بعد التصحيح
        applyHwFilter();
        showStaleGradingAlert(pending);
    } catch (e) {
        // 🌟 نعرض ⚠️ بدل رقم (وليس "0") حتى لا نوهم المعلم بعدم وجود أي تسليم محتاج تصحيح بينما
        // السبب الحقيقي هو تعذّر الاتصال بالسحابة — نفس فلسفة معالجة الخطأ في loadSubmissionsInline
        console.error("تعذر جلب عدد التسليمات التي تحتاج تصحيح:", e);
        statEl.innerText = '⚠️';
    }
}

// 🌟🌟 [جديد] الحد الأدنى بالأيام قبل اعتبار واجب "مخصَّص لطالب محدد" متأخراً عن التسليم —
// بناءً على طلب صريح من المعلم ("تنبيه بعد يومين تقريباً إن الطالب لم يرسل الواجب"). رقم
// واحد هنا فقط، سهل التعديل لاحقاً لو أراد المعلم مهلة مختلفة.
const HW_OVERDUE_DAYS = 2;

// 🌟🌟 [جديد] معرّفات الواجبات المتأخرة عن التسليم حالياً — تُملأ من loadOverdueHomeworkStat
// أدناه، وتُستخدَم فقط لإخفاء علامات الصفوف السابقة عند إعادة التحميل.
let overdueHwIds = new Set();

// 🌟🌟 [جديد] بطاقة "متأخر عن التسليم" — تفحص كل واجب "مخصَّص لطالب محدد" (hw.assignedStudentName)
// منشور منذ HW_OVERDUE_DAYS يوماً أو أكثر (حسب hw.createdAt)، وتتأكد هل وصل أي تسليم من نفس
// الطالب لهذا الواجب بعينه — عبر listAllSubmissionsForNotifications (بلا فلتر حالة، حتى
// تسليم لم يُصحَّح بعد يُعتبر "وصل" ولا يُعَد متأخراً؛ المطلوب فقط معرفة هل أرسل الطالب شيئاً
// أصلاً). لا نفحص "الرابط العام" (بلا طالب محدد) لأنه غير موجَّه لطالب بعينه فلا معنى لتذكير
// أحد بعينه به، ولا الواجبات القديمة (Firebase) التي لا يصل لها تسليم عبر الخادم الجديد أصلاً.
// ⚠️ افتراض صريح غير محسوم بتوضيح إضافي من المعلم: المطابقة بين طالب الواجب وطالب التسليم
// بالاسم (عبر normalizeName)، لأن الواجب لا يخزّن معرّف طالب دائماً — نفس أسلوب المطابقة
// المستخدم أصلاً في findLocalStudentForSubmission (core/homeworkRecords.js).
async function loadOverdueHomeworkStat(allHWs) {
    const statEl = document.getElementById('stat-overdue');
    if (!statEl) return;
    statEl.innerText = '⏳';

    // نُخفي علامات الصفوف من الدورة السابقة أولاً (تحسباً لإعادة تحميل بعد تعديل بيانات)
    overdueHwIds.forEach(hwId => {
        const el = document.getElementById(`hw-overdue-${hwId}`);
        if (el) el.style.display = 'none';
    });

    const cutoffMs = Date.now() - HW_OVERDUE_DAYS * 24 * 60 * 60 * 1000;
    const candidates = (allHWs || []).filter(hw =>
        hw.status === 'published' &&
        hw.assignedStudentName &&
        isServerHomeworkId(hw.id) &&
        new Date(hw.createdAt).getTime() <= cutoffMs
    );

    if (!candidates.length) {
        statEl.innerText = '0';
        overdueHwIds = new Set();
        applyHwRowStates();
        applyHwFilter();
        return;
    }

    try {
        const allSubs = await listAllSubmissionsForNotifications();
        const submittedKeys = new Set(allSubs.map(s => `${s.hwId}::${normalizeName(s.studentName)}`));

        overdueHwIds = new Set(
            candidates
                .filter(hw => !submittedKeys.has(`${hw.id}::${normalizeName(hw.assignedStudentName)}`))
                .map(hw => hw.id)
        );

        statEl.innerText = overdueHwIds.size;
        overdueHwIds.forEach(hwId => {
            const el = document.getElementById(`hw-overdue-${hwId}`);
            if (el) el.style.display = 'inline-block';
        });
        applyHwRowStates();
        applyHwFilter();
    } catch (e) {
        // 🌟 نفس فلسفة loadNeedsGradingStat أعلاه بالضبط: ⚠️ بدل "0" حتى لا نوهم المعلم بعدم
        // وجود أي واجب متأخر بينما السبب الحقيقي تعذّر الاتصال بالسحابة
        console.error("تعذر جلب قائمة الواجبات المتأخرة عن التسليم:", e);
        statEl.innerText = '⚠️';
    }
}

// ==========================================================================================
// 🌟🌟 [جديد 2026-10-01 — إعادة تصميم سجل الواجبات لتسهيل عمل المعلم]
// كل ما يلي إضافات فقط: لا يغيّر مصدر البيانات ولا الاستعلامات السحابية، بل يعمل على الصفوف المرسومة أصلاً.
// ⚠️ افتراض صريح: "متأخر" هو نفس تعريف loadOverdueHomeworkStat (واجب مخصَّص لطالب، منشور منذ HW_OVERDUE_DAYS
// أو أكثر، ولم يصل منه أي تسليم)، و"يحتاج تصحيح" هو نفس تعريف loadNeedsGradingStat — لم أغيّر أياً منهما.
// ==========================================================================================
let activeHwFilter = 'all';   // all | published | draft | grading | overdue
let hwSearchText = '';

// مقارنة المعرّفات كنصوص لأن بعض المعرّفات قد تكون أرقاماً (محلية) وبعضها نصوصاً (من الخادم)
function hwSetHas(set, id) {
    for (const x of set) { if (String(x) === String(id)) return true; }
    return false;
}

// الزر الأساسي في كل صف يتبع حالة الواجب: يحتاج تصحيح (أحمر) → بعد التصحيح يعود "النتائج"؛
// متأخر عن التسليم → "تذكير الطالب" مكان "النتائج" (لا نتائج أصلاً ليعرضها).
function applyHwRowStates() {
    document.querySelectorAll('#hw-history-tbody tr[data-hw-id]').forEach(tr => {
        if (tr.dataset.status !== 'published') return;
        const id = tr.dataset.hwId;
        const resBtn = tr.querySelector('.btn-view-results');
        const needsGrading = hwSetHas(pendingGradingHwIds, id);
        if (resBtn) {
            resBtn.classList.toggle('is-grading', needsGrading);
            const ic = resBtn.querySelector('.hwp3-ic');
            const lbl = resBtn.querySelector('.hwp3-lbl');
            if (ic) ic.textContent = needsGrading ? '✍️' : '📊';
            if (lbl) lbl.textContent = needsGrading ? t('hw_act_grade_now') : t('hw_act_results');
        }
        // 🌟 [تعديل] لا زر "تذكير الطالب" ولا أي إرسال تلقائي: الواجب المتأخر يظهر للمعلم كتنبيه فقط (شارة ⏰ + بطاقة المتأخر)،
        // والمعلم هو من يتواصل مع الطالب بنفسه (واتساب مثلاً).
    });
}

function hwRowMatches(tr) {
    const id = tr.dataset.hwId;
    let ok = true;
    switch (activeHwFilter) {
        case 'published': ok = tr.dataset.status === 'published'; break;
        case 'draft': ok = tr.dataset.status === 'draft'; break;
        case 'grading': ok = hwSetHas(pendingGradingHwIds, id); break;
        case 'overdue': ok = hwSetHas(overdueHwIds, id); break;
        default: ok = true;
    }
    if (ok && hwSearchText) ok = (tr.dataset.name || '').includes(hwSearchText);
    return ok;
}

function applyHwFilter() {
    const tbody = document.getElementById('hw-history-tbody');
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr[data-hw-id]'));
    const counts = { all: rows.length, published: 0, draft: 0, grading: 0, overdue: 0 };
    let visible = 0;
    rows.forEach(tr => {
        const id = tr.dataset.hwId;
        if (tr.dataset.status === 'published') counts.published++;
        else if (tr.dataset.status === 'draft') counts.draft++;
        if (hwSetHas(pendingGradingHwIds, id)) counts.grading++;
        if (hwSetHas(overdueHwIds, id)) counts.overdue++;
        const show = hwRowMatches(tr);
        tr.style.display = show ? '' : 'none';
        if (!show) {
            const subsRow = document.getElementById(`hw-subs-row-${id}`);
            if (subsRow) subsRow.style.display = 'none';
        } else {
            visible++;
        }
    });
    document.querySelectorAll('#hw-history-chips [data-count]').forEach(el => {
        el.textContent = ' ' + (counts[el.getAttribute('data-count')] ?? 0);
    });
    const oldEmpty = document.getElementById('hw-filter-empty');
    if (oldEmpty) oldEmpty.remove();
    if (rows.length && visible === 0) {
        const tr = document.createElement('tr');
        tr.id = 'hw-filter-empty';
        tr.className = 'hwp3-empty-row';
        tr.innerHTML = `<td colspan="4">${t('hw_filter_empty')}</td>`;
        tbody.appendChild(tr);
    }
    document.querySelectorAll('#hw-history-chips .hwp3-chip').forEach(c => {
        c.classList.toggle('is-on', c.getAttribute('data-filter') === activeHwFilter);
    });
    const cardMap = { published: 'stat-published-card', draft: 'stat-draft-card', grading: 'stat-needs-grading-card', overdue: 'stat-overdue-card' };
    Object.keys(cardMap).forEach(k => {
        document.getElementById(cardMap[k])?.classList.toggle('is-on', activeHwFilter === k);
    });
}

// toggle=true: الضغط مرة ثانية على نفس البطاقة يلغي التصفية ويرجع "الكل"
function setHwFilter(f, toggle) {
    activeHwFilter = (toggle && activeHwFilter === f) ? 'all' : f;
    applyHwFilter();
}

// 🌟 [جديد] نافذة تأكيد حذف الواجب في وسط الصفحة (بدل confirm() الذي يظهر من أعلى المتصفح).
// تُرجع Promise<boolean>: true = المعلم أكّد الحذف، false = إلغاء/إغلاق/Esc/نقر على الخلفية. لا تحذف شيئاً بنفسها.
// 🌟 [2026-10-03] titleKey/bodyKey اختياريان لاستعمال نفس النافذة لحذف سؤال من المعاينة (بدل confirm() العلوي هناك أيضاً)
function confirmHwDelete({ titleKey = 'hw_delete_confirm_title', bodyKey = 'hw_delete_confirm_body' } = {}) {
    return new Promise((resolve) => {
        // 🌟 [إصلاح 2026-10-02] منع تكرار النافذة: إن كانت نافذة تأكيد مفتوحة أصلاً لا نفتح ثانية (ولا نحذف شيئاً)
        if (document.querySelector('.hwp3-confirm-overlay')) { resolve(false); return; }
        const prevFocus = document.activeElement;
        const overlay = document.createElement('div');
        overlay.className = 'hwp3-confirm-overlay';
        overlay.innerHTML = `
            <div class="hwp3-confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="hwp3-confirm-title" aria-describedby="hwp3-confirm-body">
                <div class="hwp3-confirm-icon" aria-hidden="true">🗑️</div>
                <h3 id="hwp3-confirm-title" class="hwp3-confirm-title">${t(titleKey)}</h3>
                <p id="hwp3-confirm-body" class="hwp3-confirm-body">${t(bodyKey)}</p>
                <div class="hwp3-confirm-actions">
                    <button type="button" class="hwp3-confirm-btn hwp3-confirm-cancel">${t('hw_delete_cancel_btn')}</button>
                    <button type="button" class="hwp3-confirm-btn hwp3-confirm-ok">${t('hw_delete_confirm_btn')}</button>
                </div>
            </div>`;
        let done = false;
        const finish = (val) => {
            if (done) return;
            done = true;
            document.removeEventListener('keydown', onKey, true);
            overlay.remove();
            try { prevFocus && prevFocus.focus && prevFocus.focus(); } catch (e) { /* لا شيء */ }
            resolve(val);
        };
        const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); } };
        document.addEventListener('keydown', onKey, true);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(false); });
        overlay.querySelector('.hwp3-confirm-cancel').addEventListener('click', () => finish(false));
        overlay.querySelector('.hwp3-confirm-ok').addEventListener('click', () => finish(true));
        document.body.appendChild(overlay);
        overlay.querySelector('.hwp3-confirm-cancel').focus();   // الافتراضي الآمن: "إلغاء"
    });
}

// مستمعات الأزرار الإضافية داخل صفوف الجدول (لا يوجد الآن أي زر إضافي — أُزيل "تذكير الطالب" وقائمة ⋯)
function bindHwRowExtras() { /* لا شيء — أُبقيت الدالة فارغة حتى لا ينكسر استدعاؤها في loadHomeworkDashboard */ }

// ==========================================================================================
// 🌟🌟 [جديد 2026-10-01] ربط الواجهة بالتنظيف التلقائي في الخادم
// ==========================================================================================
// الحد الأدنى لعمر الواجب قبل أن نفحص هل حذفه الخادم: 14 يوماً (أقصر مهلة حذف في الخادم)، فلا نسأل عن الواجبات الحديثة.
const HW_CLEANUP_MIN_AGE_DAYS = 14;
const HW_STALE_GRADING_DAYS = 14;               // قرار المعلم: تنبيه واحد بعد 14 يوماً بلا تصحيح
const HW_STALE_NOTIFIED_KEY = 'hw_stale_notified';   // localStorage: معرّفات الواجبات التي نُبِّه عنها مرة (قيمة صغيرة جداً)
let reconcileRunning = false;

// يحذف من IndexedDB (نسختك المحلية فقط) كل واجب منشور حذفه الخادم. الحذف لا يتم إلا بعد تأكيد صريح NOT_FOUND من القراءة
// العامة؛ أي فشل/عدم يقين (لا إنترنت، حساب آخر، خادم مشغول) = لا يُحذف شيء.
async function reconcileServerDeletedHomeworks(allHWs) {
    if (reconcileRunning) return;
    reconcileRunning = true;
    try {
        const cutoff = Date.now() - HW_CLEANUP_MIN_AGE_DAYS * 24 * 60 * 60 * 1000;
        let candidates = (allHWs || []).filter(hw =>
            hw.status === 'published' && isServerHomeworkId(hw.id) && new Date(hw.createdAt).getTime() <= cutoff);
        if (!candidates.length) return;
        // تصفية مسبقة بقائمة الخادم (نداء واحد): الموجود فيها بالتأكيد لم يُحذف. إن فشل النداء نكمل بلا تصفية (محدودة العدد أدناه)
        try {
            const serverIds = new Set((await listServerHomeworkIds()).map(String));
            candidates = candidates.filter(hw => !serverIds.has(String(hw.id)));
        } catch (e) { /* غير مؤكَّد → نتابع بالفحص الفردي المحدود */ }
        let removed = 0;
        for (const hw of candidates.slice(0, 15)) {
            if (await isHomeworkMissingOnServer(hw.id)) {
                await AppState.homeworkManager.deleteHomework(hw.id);
                removed++;
            }
        }
        if (removed > 0) await loadHomeworkDashboard();
    } catch (e) {
        console.error("تعذرت مزامنة الواجبات المحذوفة من الخادم:", e);
    } finally {
        reconcileRunning = false;
    }
}

function readStaleNotified() {
    try { return new Set(JSON.parse(localStorage.getItem(HW_STALE_NOTIFIED_KEY) || '[]')); } catch (e) { return new Set(); }
}
function writeStaleNotified(set) {
    try { localStorage.setItem(HW_STALE_NOTIFIED_KEY, JSON.stringify(Array.from(set).slice(-300))); } catch (e) { /* التخزين غير متاح → قد يتكرر التنبيه فقط */ }
}

// تنبيه واحد لكل واجب ينتظر تصحيح المعلم منذ 14 يوماً أو أكثر (العمر = من أقدم تسليم ما زال ينتظر). بعد الضغط على "حسناً" لا يتكرر لنفس الواجب.
// ⚠️ افتراض صريح: "ينتظر تصحيحك منذ ١٤ يوماً" تُحسب من تاريخ أقدم تسليم لم يُصحَّح بعد (submittedAt)، لا من تاريخ إنشاء الواجب.
async function showStaleGradingAlert(pending) {
    const box = document.getElementById('hw-stale-alert');
    if (!box) return;
    const now = Date.now();
    const oldestByHw = new Map();
    (pending || []).forEach(sub => {
        const ms = Date.parse(sub.submittedAt);
        if (isNaN(ms)) return;
        if (!oldestByHw.has(sub.hwId) || ms < oldestByHw.get(sub.hwId)) oldestByHw.set(sub.hwId, ms);
    });
    const notified = readStaleNotified();
    const stale = [];
    oldestByHw.forEach((ms, hwId) => {
        const days = Math.floor((now - ms) / (24 * 60 * 60 * 1000));
        if (days >= HW_STALE_GRADING_DAYS && !notified.has(String(hwId))) stale.push({ hwId: String(hwId), days });
    });
    if (!stale.length) { box.style.display = 'none'; box.innerHTML = ''; return; }
    let all = [];
    try { all = await AppState.homeworkManager.getAllHomeworks() || []; } catch (e) { /* نعرض التنبيه بلا اسم الهدف */ }
    const lines = stale.slice(0, 5).map(s => {
        const hw = all.find(h => String(h.id) === s.hwId);
        const target = hw ? (hw.assignedStudentName || t('hw_general_link').replace(/[-]/g, '').trim()) : '';
        return `<div class="hwp3-stale-line">⏰ ${t('hw_stale_alert').replace('{days}', s.days)}${target ? ` — ${esc(target)}` : ''}</div>`;
    });
    box.innerHTML = lines.join('') + `<button type="button" id="btn-stale-ok">${t('hw_stale_ok')}</button>`;
    box.style.display = 'block';
    box.querySelector('#btn-stale-ok')?.addEventListener('click', () => {
        const n = readStaleNotified();
        stale.forEach(s => n.add(s.hwId));
        writeStaleNotified(n);
        box.style.display = 'none';
    });
}

// 🌟 تبديل عرض صف التسليمات المضمّن أسفل الواجب مباشرة (بدل النافذة المنبثقة سابقاً)،
// مع إغلاق أي صف آخر مفتوح أولاً لتفادي تداخل currentSubmissionsList بين صفين مفتوحين.
async function toggleInlineSubmissions(hwId) {
    const row = document.getElementById(`hw-subs-row-${hwId}`);
    if (!row) return;

    const isCurrentlyOpen = row.style.display !== 'none';

    document.querySelectorAll('tr[id^="hw-subs-row-"]').forEach(r => { r.style.display = 'none'; });

    if (isCurrentlyOpen) return;

    currentHwIdForGrading = hwId;
    row.style.display = 'table-row';
    await loadSubmissionsInline(hwId);
}

// 🌟🌟 إصلاح جوهري: فتح نافذة النتائج كان يعتمد على أن getSubmissionsFromCloud لا تفشل أبداً
// (كانت "تبتلع" كل خطأ وتعيد []). الآن الدالة قد ترمي استثناءً حقيقياً، ففصلنا منطق الجلب
// هنا حتى نستطيع أيضاً إضافة زر "إعادة المحاولة" دون تكرار الكود.
async function loadSubmissionsInline(hwId) {
    const container = document.getElementById(`hw-subs-container-${hwId}`);
    if (!container) return;
    container.innerHTML = `<div style="padding: 15px; color: #0ea5e9;">⏳ ${t('hw_submitting')}</div>`;

    try {
        const fetchPromise = getSubmissionsFromCloud(hwId);
        // 🌟 رفعنا مهلة الانتظار من 5 إلى 15 ثانية: كانت 5 ثوانٍ قصيرة جداً على اتصال بطيء أو
        // عند إقلاع Firestore لأول مرة، فتُسجَّل كـ"خطأ اتصال" رغم أن الطلب كان سينجح لو انتظرنا قليلاً.
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000));

        currentSubmissionsList = await Promise.race([fetchPromise, timeoutPromise]);

        // 🌟🌟 [جديد — المرحلة 2] تسليمات فشل رفعها للسحابة ولا تزال عالقة محلياً على جهاز
        // الطالب نفسه — لن تظهر أبداً في currentSubmissionsList (جاءت من السحابة فقط)، فبدون
        // هذا التنبيه يظن المعلم أن الطالب لم يحل الواجب إطلاقاً رغم أنه حله فعلاً. راجع
        // core/firebase.js (getPendingSubmissionsCountForHomework) للشرح الكامل.
        const pendingLocalCount = getPendingSubmissionsCountForHomework(hwId);
        const pendingBanner = pendingLocalCount > 0
            ? `<div style="padding: 10px 15px; margin-bottom: 10px; background:#fef3c7; color:#92400e; border-radius:10px; font-size:0.9rem; font-weight:bold;">⏳ ${t('hw_pending_submissions_banner').replace('{n}', pendingLocalCount)}</div>`
            : '';

        if (currentSubmissionsList.length === 0) {
            container.innerHTML = pendingBanner + `<div style="padding: 15px; color: #64748b;">${t("لم يقم أي طالب بتسليم هذا الواجب حتى الآن.")}</div>`;
        } else {
            let tableHtml = `<table style="width: 100%; border-collapse: collapse; text-align: center;"><tbody>`;
            currentSubmissionsList.forEach((sub, index) => {
                // 🌟🌟 [عدّل] نفس الفحص بالضبط، عبر الدالة المشتركة submissionNeedsGrading — راجع core/submissionStatus.js
                let needsGrading = submissionNeedsGrading(sub);
                let badge = needsGrading ? `<span style="background: #fef08a; color: #854d0e; font-size: 0.8rem; padding: 2px 5px; border-radius: 5px;">${t('يحتاج تصحيح')}</span>` : "";

                // 🌟🌟 [جديد] لا نعرض أي رقم/نسبة مئوية قبل اكتمال التصحيح اليدوي: sub.score قبل الاعتماد
                // (provisionalScore من الخادم) محسوب من الأسئلة الآلية فقط ويتجاهل الأسئلة اليدوية المعلّقة
                // تماماً من البسط والمقام معاً — عرضه كأنه "الدرجة" يضلّل المعلم (قد تبدو 93% ثم تصبح 83%
                // فعلياً بعد التصحيح رغم عدم وجود أي خطأ حسابي). فالنسبة تُعرض فقط بعد اكتمال كل الأسئلة
                // اليدوية (حينها sub.score = finalScore الحقيقي = كل نقاط الواجب مجتمعة، حساب عادل بلا استثناء أي سؤال).
                let scoreCellHtml = needsGrading
                    ? `<span style="color:#b45309; font-size:0.95rem; font-weight:bold;">${t('⏳ بانتظار التصحيح')}</span>`
                    : `<span style="color:${sub.score >= 90 ? '#10b981' : (sub.score >= 70 ? '#f59e0b' : '#ef4444')};">${sub.score}%</span>`;

                tableHtml += `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 15px; font-weight: bold; color: #1e293b; text-align: right;">
                            ${esc(sub.studentName)} ${badge}
                            <button class="btn btn-open-grading" data-idx="${index}" style="background: #8b5cf6; padding: 4px 12px; font-size: 0.95rem; margin-right: 10px;">🔍 ${t('مراجعة وتصحيح')}</button>
                        </td>
                        <td style="padding: 15px; color: #64748b;">${sub.date}</td>
                        <td style="padding: 15px; font-weight: bold; font-size: 1.3rem;" id="score-cell-${index}">${scoreCellHtml}</td>
                    </tr>
                `;
            });
            tableHtml += `</tbody></table>`;
            container.innerHTML = pendingBanner + tableHtml;

            document.querySelectorAll('.btn-open-grading').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = e.currentTarget.getAttribute('data-idx');
                    openGradingRoom(idx);
                });
            });
        }
    } catch (e) {
        // 🌟 الآن يظهر هنا فقط عند وجود خطأ فعلي (صلاحيات/اتصال)، وليس كحالة افتراضية دائمة
        console.error("خطأ فعلي أثناء جلب نتائج الواجب من السحابة:", e);
        container.innerHTML = `<div style="padding: 20px; color: #ef4444;">
            ${t('hw_results_load_error')} ${friendlyErrorText(e)}
            <br><button class="btn" id="btn-retry-submissions" style="margin-top:10px; background:#0ea5e9;">🔄 ${t('إعادة المحاولة')}</button>
        </div>`;
        document.getElementById('btn-retry-submissions')?.addEventListener('click', () => loadSubmissionsInline(hwId));
    }
}

function openGradingRoom(subIndex) {
    const sub = currentSubmissionsList[subIndex];
    if (!sub || !sub.details) return;

    let modalHtml = `
        <div id="grading-room-modal" class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.85); z-index: 10000; display: flex; justify-content: center; align-items: center;">
            <div class="modal-content" style="background: white; padding: 30px; border-radius: 20px; max-width: 800px; width: 95%; max-height: 90vh; overflow-y: auto; text-align: right; box-shadow: 0 25px 50px rgba(0,0,0,0.25);">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px;">
                    <h2 style="color: #0369a1; margin: 0; font-size: 1.8rem;">✍️ ${t('غرفة التصحيح:')} ${esc(sub.studentName)}</h2>
                    <div id="grading-room-score-badge" style="background: #f1f5f9; padding: 5px 15px; border-radius: 10px; font-weight: bold; color: #475569;">${
                        submissionNeedsGrading(sub)
                            ? t('⏳ الدرجة النهائية ستظهر بعد اعتماد كل الأسئلة اليدوية')
                            : `${t('النتيجة:')} ${sub.score}%`
                    }</div>
                </div>

                <!-- 🌟 أنماط أزرار الدرجة اليدوية — محصورة داخل #grading-room-modal فقط حتى لا تؤثر على أي شاشة أخرى -->
                <style>
                    #grading-room-modal .hw-score-group { display: flex; flex-wrap: wrap; gap: 10px; }
                    #grading-room-modal .hw-score-btn {
                        flex: 1 1 80px; min-height: 52px; padding: 10px 14px; font-size: 1.15rem; font-weight: bold;
                        font-family: inherit; color: #475569; background: #fff; border: 2px solid #cbd5e1;
                        border-radius: 12px; cursor: pointer; touch-action: manipulation;
                        -webkit-tap-highlight-color: transparent; transition: background .15s, border-color .15s, color .15s;
                    }
                    #grading-room-modal .hw-score-btn.hw-score-selected { background: var(--dh-emerald, #10b981); border-color: var(--dh-emerald, #10b981); color: #fff; box-shadow: 0 0 0 3px rgba(16,185,129,.25); }
                    #grading-room-modal .hw-score-btn.hw-score-selected::after { content: ' ✓'; }
                    #grading-room-modal .hw-score-btn.hw-score-zero.hw-score-selected { background: #ef4444; border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,.25); }
                </style>
                <div id="grading-questions-container" style="display: flex; flex-direction: column; gap: 20px;">
    `;

    sub.details.forEach((d, qIdx) => {
        let isManual = d.needsManualGrading;
        let isMatching = d.type === 'matching';

        let cardBg = isManual ? '#fefce8' : '#f8fafc';
        let cardBorder = isManual ? '#fde047' : '#e2e8f0';

        modalHtml += `
            <div style="background: ${cardBg}; border: 2px solid ${cardBorder}; padding: 20px; border-radius: 15px;">
                <h3 style="color: #1e293b; font-size: 1.3rem; margin-top: 0;">${t('السؤال')} ${qIdx + 1}: ${esc(hl(d.question))}</h3>
        `;

        if (isMatching && d.matchingData) {
            // 🌟🌟 [عُدّل — أصبح تصحيحاً آلياً] عرض تفاعلي لأزواج المطابقة: ربط الطالب الفعلي بجانب
            // الأزواج الصحيحة الفعلية (من بيانات توليد السؤال، لا تخميناً). ✅/❌ هنا هو بالضبط ما
            // يحتسبه الخادم درجة (كل ✅ = نقطة من points) — لم يعد مجرد اقتراح مرجعي، بل هو الأساس
            // الفعلي للدرجة الآلية المعروضة أسفل هذه البطاقة (راجع autoGradeQuestion_ في Code.gs).
            // تسليمات قديمة (قبل هذا التعديل) قد تظهر هنا حقل "أعطِ الطالب درجة" اليدوي بدل ذلك،
            // لأنها ما زالت تحمل needsManualGrading:true المحفوظ وقت إنشائها — راجع الملاحظة عن
            // عدم الأثر الرجعي في نهاية هذا الملف.
            const { leftItems, rightItems, studentPairs, correctPairs } = d.matchingData;
            modalHtml += `<div style="margin: 15px 0; padding: 15px; background: white; border-radius: 10px; border: 1px solid #cbd5e1;">`;
            leftItems.forEach(leftItem => {
                const studentRightId = studentPairs[leftItem.id];
                const studentRightItem = rightItems.find(r => r.id === studentRightId);
                const correctPair = correctPairs.find(p => p.left === leftItem.id);
                const correctRightItem = rightItems.find(r => r.id === (correctPair ? correctPair.right : null));
                const isPairMatchingSuggestion = !!(studentRightId && correctPair && studentRightId === correctPair.right);

                modalHtml += `
                    <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:8px; padding:8px 0; border-bottom:1px dashed #e2e8f0; font-family:'Amiri Quran', serif; font-size:1.1rem;">
                        <span style="color:#0369a1; font-weight:bold;">${esc(leftItem.text)}</span>
                        <span style="color:${isPairMatchingSuggestion ? '#10b981' : '#ef4444'};">
                            ${studentRightItem ? esc(studentRightItem.text) : t('— لم يربطها —')} ${isPairMatchingSuggestion ? '✅' : '❌'}
                        </span>
                        <span style="color:#94a3b8; font-size:0.9rem;">(${t('(الاقتراح:').replace(/^\(/, '')} ${correctRightItem ? esc(correctRightItem.text) : '-'})</span>
                    </div>
                `;
            });
            modalHtml += `</div>`;
        } else {
            modalHtml += `
                <div style="margin: 10px 0; font-size: 1.2rem;">
                    <span style="color: #64748b;">${t('إجابة الطالب:')}</span>
                    <strong style="color: ${d.isCorrect || d.manualScore > 0 ? '#10b981' : '#ef4444'};">${esc(d.studentAnswer)}</strong>
                </div>
                <div style="margin: 10px 0; font-size: 1.2rem;">
                    <span style="color: #64748b;">${t('الإجابة النموذجية:')}</span>
                    <strong style="color: #10b981;">${esc(d.correctAnswer)}</strong>
                </div>
            `;
        }

        if (isManual) {
            // 🌟 نعتمد على d.points المحفوظة مباشرة مع كل سؤال إن وُجدت (تسليمات جديدة)،
            // ونستخدم الجدول القديم فقط كخطة بديلة للتسليمات القديمة السابقة لهذا التحديث.
            let maxPoints = d.points || ((d.type === 'write_3_ayahs') ? 3 : 2);
            let currentScore = d.manualScore !== undefined ? d.manualScore : 0;

            // 🌟🌟 [عُدّل — منع تغيّر الدرجة بالخطأ أثناء Scroll] كان هنا حقل <input type="number">
            // يتغيّر رقمه بعجلة الماوس/السحب أثناء تمرير الصفحة. استُبدل بأزرار درجات مستقلة (0..النقاط القصوى)،
            // ولا يتغيّر شيء إلا بنقرة/لمسة مقصودة على زر. الحقل الأصلي بقي كـ <input type="hidden">
            // بنفس الصنف (manual-grade-input) والمعرّف (data-qidx) حتى تبقى saveManualGrades وكل منطق
            // الحفظ والحساب في الخادم كما هي بلا أي تعديل. الحقل المخفي غير قابل للتمرير أو الكتابة أصلاً.
            // ⚠️ افتراض صريح: "تُحفظ مباشرة" = تُسجَّل فوراً كاختيار لهذا السؤال في غرفة التصحيح، ويبقى
            // زر "حفظ الدرجات وإعادة الحساب" هو ما يرسلها للخادم (لم نغيّر مسار الحفظ/الـAPI).
            // سؤال لم يُقيَّم بعد (manualScore غير موجودة) = لا زر مضاء والقيمة المخفية فارغة (تُحتسب 0 كما كان سابقاً).
            const hasScore = d.manualScore !== undefined;
            let scoreBtns = '';
            for (let p = 0; p <= maxPoints; p++) {
                const stars = p === 0 ? '❌' : '⭐'.repeat(Math.min(p, 3));
                const label = p === 0 ? t('hw_grade_wrong') : String(p);
                const isSel = hasScore && Number(currentScore) === p;
                scoreBtns += `<button type="button" class="hw-score-btn${p === 0 ? ' hw-score-zero' : ''}${isSel ? ' hw-score-selected' : ''}" data-qidx="${qIdx}" data-score="${p}" aria-pressed="${isSel}">${stars} ${label}</button>`;
            }
            modalHtml += `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #cbd5e1;">
                    <label style="display:block; font-weight: bold; color: #b45309; margin-bottom: 10px;">${t('أعطِ الطالب درجة من')} (${maxPoints}):</label>
                    <div class="hw-score-group" data-qidx="${qIdx}" role="group">${scoreBtns}</div>
                    <input type="hidden" class="manual-grade-input" data-qidx="${qIdx}" value="${hasScore ? currentScore : ''}">
                </div>
            `;
        } else {
            // 🌟🌟 [عُدّل] بعض الأسئلة الآلية (matrix_order، dual_dropdown، matching) درجتها جزئية —
            // d.isCorrect وحده ثنائي (صح/خطأ فقط لو كل النقاط اكتملت)، فنعرض النقاط الفعلية
            // (d.earnedPoints) لو موجودة بدل حكم ثنائي مضلل ("❌ خاطئ" رغم كسب 3 من 4 نقاط مثلاً).
            let partialLabel = (typeof d.earnedPoints === 'number' && d.earnedPoints !== d.points)
                ? ` — ${d.earnedPoints} / ${d.points}`
                : '';
            modalHtml += `
                <div style="margin-top: 10px; font-size: 1rem; color: #64748b;">
                    ${d.isCorrect ? t('✅ تم التصحيح آلياً (صحيح)') : (partialLabel ? t('🟡 تم التصحيح آلياً (جزئي)') : t('❌ تم التصحيح آلياً (خاطئ)'))}${partialLabel}
                </div>
            `;
        }

        modalHtml += `</div>`;
    });

    // 🌟🌟 [جديد] مربع اختياري في آخر غرفة التصحيح: كلمة من المعلم تظهر في شهادة التقدير. غير إلزامي
    // إطلاقاً (لا يمنع الاعتماد لو تُرك فارغاً)، ويُملأ مسبقاً بالنص المحفوظ لو أعاد المعلم فتح تسليم معتمد.
    // الحد 300 حرف حتى تبقى الشهادة متناسقة (راجع TEACHER_NOTE_MAX في Code.gs وreports/hwCertificate.js).
    modalHtml += `
                </div>
                <div style="margin-top: 25px; padding: 16px; background: #f0fdf4; border: 2px dashed #86efac; border-radius: 15px;">
                    <label for="grading-teacher-note" style="display:block; font-weight: bold; color: #166534; margin-bottom: 8px; font-size: 1.1rem;">💬 ${t('hw_teacher_note_label')}</label>
                    <textarea id="grading-teacher-note" maxlength="300" rows="3" placeholder="${esc(t('hw_teacher_note_placeholder'))}" style="width: 100%; box-sizing: border-box; padding: 10px; font-size: 1.05rem; border: 2px solid #bbf7d0; border-radius: 10px; font-family: inherit; resize: vertical; outline: none;">${esc(sub.teacherNote || '')}</textarea>
                    <div style="font-size: 0.85rem; color: #64748b; margin-top: 6px;">${t('hw_teacher_note_hint')}</div>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 30px;">
                    <button class="btn" id="btn-save-grading" style="flex: 2; background: #10b981; font-size: 1.4rem;">💾 ${t('حفظ الدرجات وإعادة الحساب')}</button>
                    <button class="btn btn-outline" id="btn-close-grading" style="flex: 1; border-color: #ef4444; color: #ef4444; font-size: 1.4rem;">${t('إغلاق')}</button>
                </div>
            </div>
        </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = modalHtml;
    document.body.appendChild(wrapper.firstElementChild);

    document.getElementById('btn-close-grading').addEventListener('click', () => {
        document.getElementById('grading-room-modal').remove();
    });

    // 🌟🌟 [جديد] اختيار درجة السؤال اليدوي: حدث click فقط (لا wheel/touchmove/pointermove)، فلا تتغيّر
    // الدرجة إلا بنقرة/لمسة مقصودة. السحب أو التمرير على الشاشة لا يُنتج click في المتصفحات.
    document.querySelectorAll('#grading-room-modal .hw-score-btn').forEach(btnEl => {
        btnEl.addEventListener('click', () => {
            const qIdx = btnEl.dataset.qidx;
            const hidden = document.querySelector(`#grading-room-modal .manual-grade-input[data-qidx="${qIdx}"]`);
            if (hidden) hidden.value = btnEl.dataset.score;
            document.querySelectorAll(`#grading-room-modal .hw-score-btn[data-qidx="${qIdx}"]`).forEach(b => {
                const on = b === btnEl;
                b.classList.toggle('hw-score-selected', on);
                b.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
        });
    });

    // 🌟 تحويل زر الحفظ ليكون Async لانتظار رفع البيانات للسحابة 🌟
    document.getElementById('btn-save-grading').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.innerHTML = t("⏳ جاري الحفظ في السحابة...");
        btn.disabled = true;
        await saveManualGrades(subIndex);
    });
}

// 🌟🌟 [أُعيدت كتابتها — دمج نظام الواجبات الجديد] دالة "حفظ الدرجات وإعادة الحساب" = اعتماد النتيجة النهائية.
// ما تغيّر (راجع مستند "تدقيق نظام الواجبات"):
//  - الدرجة النهائية تُحسب في الخادم من الإجابات المخزّنة + درجات المعلم اليدوية (لا نثق بأي حساب على العميل).
//  - لا نقول "تم الحفظ" إلا بعد أن يؤكد الخادم الحفظ (persisted). كانت الرسالة القديمة تُعرض حتى لو فشل التحديث.
//  - النتيجة المعتمدة تُكتب في سجل الطالب الحقيقي على جهاز المعلم (history_<id>) وتُضاف نقاطه مرة واحدة (بالفرق).
//  - الخادم يرفض الاعتماد لو بقي سؤال يدوي بلا درجة (حقل الدرجة يبدأ بصفر فلا يحدث هذا عادةً).
// ⚠️ افتراض صريح: الطالب يُربط بسجل المعلم بالمعرّف المُخزَّن مع الواجب المخصَّص، وإلا بالاسم المطابق؛ ولو لم
// يوجد يُسأل المعلم هل يُنشئ طالباً جديداً باسمه. لو رفض، تُعتمد النتيجة على الخادم بدون كتابتها في سجل طالب.
async function saveManualGrades(subIndex) {
    const sub = currentSubmissionsList[subIndex];
    const btn = document.getElementById('btn-save-grading');
    const restoreBtn = () => { if (btn) { btn.disabled = false; btn.innerHTML = t('hw_grade_save_btn'); } };

    // 1) درجات الأسئلة اليدوية بمعرّف السؤال (qid) — مقيّدة بين 0 والنقاط القصوى
    const manualScores = {};
    sub.details.forEach((d, qIdx) => {
        if (!d.needsManualGrading) return;
        const inputEl = document.querySelector(`.manual-grade-input[data-qidx="${qIdx}"]`);
        const maxP = d.points || 1;
        const raw = inputEl ? (parseInt(inputEl.value) || 0) : (d.manualScore || 0);
        manualScores[d.qid] = Math.max(0, Math.min(maxP, raw));
    });

    // 2) تحديد الطالب في سجل المعلم قبل الاعتماد (يُخزَّن معرّفه مع التسليم ليقرأه التقرير الشهري)
    let localStudent = null;
    let ambiguousHandled = false;
    try {
        localStudent = await findLocalStudentForSubmission(sub);
        // 🌟 [إصلاح تدقيق] اسم مكرر بين أكثر من طالب: نسأل المعلم بدل التخمين الصامت (موافق = ربط بأول طالب، إلغاء = بلا ربط)
        if (!localStudent) {
            const dupes = await findAmbiguousNameMatches(sub);
            if (dupes.length > 1) {
                if (confirm(t('hw_ambiguous_student_confirm').replace('{name}', sub.studentName).replace('{n}', dupes.length))) localStudent = dupes[0];
                ambiguousHandled = true;
            }
        }
        if (!localStudent && !ambiguousHandled && confirm(t('hw_create_student_confirm').replace('{name}', sub.studentName))) {
            localStudent = await createLocalStudent(sub.studentName);
        }
    } catch (err) {
        console.error("تعذر تحديد/إنشاء الطالب في سجل المعلم:", err);
    }

    // 3) الاعتماد في الخادم (مصدر الحقيقة) — لا نُكمل بأي "نجاح" قبل تأكيده
    const wasApprovedBefore = sub.status === 'approved';
    let updated;
    try {
        // 🌟 [جديد] نص المعلم الاختياري للشهادة (قد يكون فارغاً = لا ملاحظة / مسح ملاحظة سابقة)
        const teacherNote = (document.getElementById('grading-teacher-note')?.value || '').trim();
        updated = await gradeSubmissionOnServer(sub.docId, manualScores, localStudent ? localStudent.id : undefined, sub.version, teacherNote);
    } catch (err) {
        console.error("فشل اعتماد النتيجة في الخادم:", err);
        alert(t('hw_grade_failed') + '\n' + friendlyErrorText(err));
        restoreBtn();
        return;
    }
    currentSubmissionsList[subIndex] = updated;
    const scoreCell = document.getElementById(`score-cell-${subIndex}`);
    if (scoreCell) scoreCell.innerText = `${updated.finalScore}%`;
    document.getElementById('grading-room-modal')?.remove();

    // 4) كتابة النتيجة في سجل الطالب + المراجعة المتباعدة (best-effort لا توقف الاعتماد لو فشلت)
    let recordNote = '';
    if (localStudent) {
        try {
            const w = await recordApprovedResult(localStudent, updated);
            if (!w.verified) throw new Error('read-back mismatch');
            recordNote = t('hw_grade_record_saved').replace('{name}', localStudent.name);
        } catch (err) {
            console.error("تعذر كتابة النتيجة في سجل الطالب:", err);
            recordNote = t('hw_grade_record_failed');
        }
        // 🌟 نظام "المراجعة المتباعدة" (Anki/Duolingo): يُحدَّث عند أول اعتماد فقط لتجنب احتساب نفس الواجب مرتين
        if (!wasApprovedBefore && AppState.reviewScheduleManager) {
            try { await AppState.reviewScheduleManager.recordReviewResult(localStudent.id, updated.finalScore); }
            catch (err) { console.error("تعذر تحديث جدول المراجعة المتباعدة لهذا الطالب:", err); }
        }
    } else {
        recordNote = t('hw_grade_record_skipped');
    }

    alert(t('hw_grade_saved').replace('{score}', updated.finalScore) + '\n\n' + recordNote);
    // إعادة رسم بطاقة "يحتاج تصحيح" وعلامات التنبيه بعد الاعتماد
    loadNeedsGradingStat();

    // 🌟🌟 [جديد] شهادة تقدير فور اعتماد النتيجة النهائية — راجع reports/hwCertificate.js.
    // تُعرض بعد alert النجاح أعلاه (لا تحجب رسالة تأكيد الحفظ نفسها) وتُبنى من نفس بيانات
    // الاعتماد المؤكَّدة من الخادم (updated)، وسجل الطالب المحلي إن وُجد (لعرض صورته).
    try { showHomeworkCertificate(updated, localStudent, await resolveHomeworkScope(updated.hwId)); }
    catch (err) { console.error("تعذّر عرض شهادة التقدير (لا يؤثر على اعتماد النتيجة نفسها):", err); }
}

// 🌟🌟 [جديد] نافذة "النتائج النهائية للطلاب" — تسرد كل تسليمات الواجبات المعتمدة (عبر كل
// الواجبات دفعة واحدة، عبر getAllSubmissionsFromCloud التي تجلب statuses:['approved'] فقط —
// راجع core/homeworkApi.js) مع الدرجة النهائية لكل طالب، وزر لإعادة فتح شهادة تقديره من هنا
// في أي وقت لاحق (بلا الحاجة لتصحيح جديد لإظهارها مرة أخرى).
async function openFinalResultsModal() {
    // 🌟🌟 [إعادة تصميم] كانت هذه الدالة تبني طبقة overlay مستقلة فوق الصفحة كاملة (document.body).
    // المعلم فضّل ظهور النتائج بنفس طريقة تبويبَي "إعداد واجب جديد" و"سجل الواجبات" تماماً —
    // أي داخل نفس منطقة المحتوى أسفل شريط التبويبات، لا في صفحة/طبقة منفصلة. التبويب نفسه
    // (إظهاره/إخفاؤه وتفعيل شكل زرّه) تديره switchHwTab في setupListeners؛ هذه الدالة الآن
    // مسؤولة فقط عن تعبئة #hw-final-results-body داخل #tab-final-results الثابت في
    // settings/homework-prep.html 🌟🌟
    const body = document.getElementById('hw-final-results-body');
    if (!body) return;
    body.innerHTML = `<div style="padding:15px; color:#0ea5e9;">⏳</div>`;
    try {
        const approved = await getAllSubmissionsFromCloud();
        approved.sort((a, b) => (b.approvedAt ? Date.parse(b.approvedAt) : 0) - (a.approvedAt ? Date.parse(a.approvedAt) : 0));

        if (!approved.length) {
            body.innerHTML = `<div style="padding:20px; text-align:center; color:#64748b;" data-i18n="hw_final_results_empty">لا توجد نتائج معتمدة بعد.</div>`;
            applyLanguage();
            return;
        }

        body.innerHTML = `<table style="width:100%; border-collapse:collapse; text-align:center;"><tbody>` +
            approved.map((sub, idx) => {
                const scoreColor = sub.finalScore >= 90 ? '#10b981' : (sub.finalScore >= 75 ? '#147c5e' : (sub.finalScore >= 60 ? '#b8863b' : '#ef4444'));
                const dateStr = sub.approvedAt ? new Date(sub.approvedAt).toLocaleDateString('ar-EG') : '';
                return `
                    <tr style="border-bottom:1px solid #e2e8f0;">
                        <td style="padding:12px; font-weight:bold; color:#1e293b; text-align:right;">${esc(sub.studentName)}</td>
                        <td style="padding:12px; color:#64748b; font-size:0.9rem;">${dateStr}</td>
                        <td style="padding:12px; font-weight:bold; font-size:1.2rem; color:${scoreColor};">${sub.finalScore}%</td>
                        <td style="padding:12px;"><button type="button" class="btn btn-view-final-cert" data-idx="${idx}" data-i18n="hw_final_results_view_cert_btn" style="padding:6px 14px; background:#8b5cf6; font-size:0.95rem; min-width:unset;">🏅 عرض الشهادة</button></td>
                    </tr>
                `;
            }).join('') + `</tbody></table>`;

        body.querySelectorAll('.btn-view-final-cert').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
                const sub = approved[idx];
                let localStudent = null;
                try { localStudent = await findLocalStudentForSubmission(sub); } catch (err) { /* تجاهل — الشهادة تعمل بلا صورة */ }
                showHomeworkCertificate(sub, localStudent, await resolveHomeworkScope(sub.hwId));
            });
        });
        applyLanguage();
    } catch (e) {
        console.error("تعذر تحميل النتائج النهائية:", e);
        body.innerHTML = `<div style="padding:20px; color:#ef4444;">${t('hw_final_results_load_error')} ${friendlyErrorText(e)}
            <br><button type="button" class="btn" id="btn-retry-final-results" style="margin-top:10px; background:#0ea5e9;">🔄</button></div>`;
        body.querySelector('#btn-retry-final-results')?.addEventListener('click', openFinalResultsModal);
    }
}

// ==========================================
// ⚙️ دوال الإعداد والتنقل
// ==========================================
function populateDropdowns() {
    const selSurah = document.getElementById('hw-surah-select');
    const rangeFrom = document.getElementById('hw-range-from');
    const rangeTo = document.getElementById('hw-range-to');

    if (selSurah && rangeFrom && rangeTo) {
        selSurah.innerHTML = `<option value="" disabled selected>-- ${t('surah_label')} --</option>`;
        rangeFrom.innerHTML = '';
        rangeTo.innerHTML = '';

        AppState.surahsData.forEach(s => {
            let optStr = AppState.currentLang === 'en' ? `${s.number}. ${surahLabel(s.number)}` : `${s.number}. ${t("سورة")} ${s.name}`; // 🌟 الاسم الإنجليزي للعرض فقط
            selSurah.appendChild(new Option(optStr, s.number));
            rangeFrom.appendChild(new Option(optStr, s.number));
            rangeTo.appendChild(new Option(optStr, s.number));
        });
    }

    const juzSel = document.getElementById('hw-juz-select');
    if (juzSel) {
        juzSel.innerHTML = '';
        for (let i = 30; i >= 1; i--) {
            juzSel.appendChild(new Option(`${t("الجزء")} ${i}`, i));
        }
    }
}

function setupListeners() {
    // 🌟 [2026-10-01] حُذف زر btn-tab-new الصغير؛ الدخول لتبويب الإعداد صار من الزر الكبير #btn-hero-new فقط
    const btnHistory = document.getElementById('btn-tab-history');
    const btnFinalResults = document.getElementById('btn-final-results');
    const tabNew = document.getElementById('tab-new-hw');
    const tabHistory = document.getElementById('tab-history');
    const tabFinalResults = document.getElementById('tab-final-results');

    // 🌟🌟 [جديد] بطاقة "يحتاج تصحيح" أصبحت فعّالة: النقر عليها ينقل المعلم مباشرة لتبويب
    // "سجل الواجبات" (نفس زر btn-tab-history) حيث تظهر علامات ⚠️ بجانب الواجبات المتأثرة.
    // التلميح (title) يُضبط هنا ديناميكياً بدل كتابته ثابتاً في HTML لأن data-i18n لا يدعم
    // خاصية title، فهذا يضمن تطابقه مع اللغة الحالية دائماً.
    // 🌟 [جديد 2026-10-01] نقر بطاقة الأعداد = تصفية السجل بحالتها (وينتقل المعلم لتبويب السجل إن لم يكن فيه).
    // إن كان في السجل أصلاً فالنقر المتكرر على نفس البطاقة يلغي التصفية.
    function filterFromCard(f) {
        const wasOnHistory = tabHistory.style.display === 'block';
        if (!wasOnHistory) btnHistory?.click();
        setHwFilter(f, wasOnHistory);
    }

    const statNeedsGradingCard = document.getElementById('stat-needs-grading-card');
    if (statNeedsGradingCard) {
        statNeedsGradingCard.title = t('hw_needs_grading_tooltip');
        statNeedsGradingCard.addEventListener('click', () => filterFromCard('grading'));
        // 🌟 [جديد] العنصر أصبح له role="button" و tabindex في HTML (بدل div عادية بلا أي
        // دلالة تفاعلية)، فلازم يستجيب أيضاً لـ Enter/Space من لوحة المفاتيح مثل أي زر حقيقي
        statNeedsGradingCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); filterFromCard('grading'); }
        });
    }

    // 🌟🌟 [جديد] بطاقة "متأخر عن التسليم" — نفس سلوك بطاقة "يحتاج تصحيح" أعلاه بالضبط (بما
    // فيها الاستجابة للوحة المفاتيح)، وتنقل المعلم لنفس تبويب "سجل الواجبات" حيث تظهر علامة
    // ⏰ بجانب كل واجب متأخر بعينه.
    const statOverdueCard = document.getElementById('stat-overdue-card');
    if (statOverdueCard) {
        statOverdueCard.title = t('hw_overdue_tooltip');
        statOverdueCard.addEventListener('click', () => filterFromCard('overdue'));
        statOverdueCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); filterFromCard('overdue'); }
        });
    }

    // 🌟🌟 [جديد 2026-10-01] بطاقتا "منشور الآن" و"مسودة" تعملان كمرشِّحات أيضاً
    ['published', 'draft'].forEach(k => {
        const card = document.getElementById(`stat-${k}-card`);
        if (!card) return;
        card.addEventListener('click', () => filterFromCard(k));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); filterFromCard(k); }
        });
    });
    document.querySelectorAll('#hw-history-chips .hwp3-chip').forEach(c => {
        c.addEventListener('click', () => setHwFilter(c.getAttribute('data-filter'), false));
    });
    document.getElementById('hw-history-search')?.addEventListener('input', (e) => {
        hwSearchText = e.target.value.trim().toLowerCase();
        applyHwFilter();
    });
    // إغلاق قائمة ⋯ بالنقر خارجها أو بمفتاح Escape

    // 🌟🌟 [إعادة تصميم] التبويبات الثلاثة ("إعداد واجب جديد"، "سجل الواجبات"، "النتائج النهائية
    // للطلاب") أصبحت تُدار بدالة واحدة موحَّدة switchHwTab بدل معالِجين منفصلين مكرَّرين — كل
    // نقرة تُظهر محتوى تبويبها فقط (أسفل شريط التبويبات نفسه، بلا أي طبقة عائمة منفصلة) وتُخفي
    // البقية، وتُحدِّث شكل الأزرار الثلاثة معاً حتى يبقى واضحاً أيّها المفعَّل حالياً. النتائج
    // النهائية كانت سابقاً نافذة/صفحة منفصلة تُفتح فوق كل شيء عبر openFinalResultsModal — الآن
    // openFinalResultsModal تملأ #tab-final-results في مكانها بدل بناء طبقة overlay مستقلة 🌟🌟
    function setActiveTabBtn(activeBtn) {
        [btnHistory].forEach(b => {
            if (!b) return;
            const isActive = b === activeBtn;
            b.style.background = isActive ? '#0ea5e9' : 'white';
            b.style.color = isActive ? 'white' : '#0ea5e9';
            b.classList.toggle('btn-outline', !isActive);
        });
        if (btnFinalResults) {
            // 🌟 نفس فلسفة زرّي الجدول أعلاه، لكن بألوان الهوية الذهبية الخاصة بهذا الزر تحديداً
            // (hwp2-seg-gold) بدل الأزرق، حتى يبقى متسقاً بصرياً مع باقي الصفحة
            const isActive = btnFinalResults === activeBtn;
            btnFinalResults.classList.toggle('btn-outline', !isActive);
            btnFinalResults.style.background = isActive ? 'var(--dh-gold-500)' : '';
            btnFinalResults.style.color = isActive ? '#2b2100' : '';
        }
    }

    function switchHwTab(tab) {
        tabNew.style.display = (tab === 'new') ? 'block' : 'none';
        tabHistory.style.display = (tab === 'history') ? 'block' : 'none';
        tabFinalResults.style.display = (tab === 'final') ? 'block' : 'none';
        setActiveTabBtn(tab === 'new' ? null : (tab === 'history' ? btnHistory : btnFinalResults));
        // 🌟 [جديد 2026-10-01] الزر الكبير "إعداد واجب جديد" يختفي داخل تبويب الإعداد نفسه ويظهر في بقية التبويبات
        const heroBar = document.getElementById('hwp3-hero-bar');
        if (heroBar) heroBar.style.display = (tab === 'new') ? 'none' : '';
        if (tab === 'history') loadHomeworkDashboard();
        if (tab === 'final') openFinalResultsModal();
    }

    document.getElementById('btn-hero-new')?.addEventListener('click', () => {
        switchHwTab('new');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    btnHistory?.addEventListener('click', () => switchHwTab('history'));
    btnFinalResults?.addEventListener('click', () => switchHwTab('final'));

    document.querySelectorAll('input[name="hwType"]').forEach(r => r.addEventListener('change', toggleHwType));
    document.getElementById('hw-surah-select')?.addEventListener('change', updateAyahRange);
    // 🌟 [إصلاح] زر "العودة للرئيسية" الخاص بهذه الشاشة اتحذف من settings/homework-prep.html
    // (كان مكرِّراً لزر "الرئيسية" الثابت في الهيدر العلوي العام) — المستمع هنا يبقى بأمان بفضل
    // ?. رغم عدم وجود العنصر، لكن نتركه معلَّقاً هنا فقط لو رجع id="btn-back-home" مستقبلاً
    document.getElementById('btn-back-home')?.addEventListener('click', loadSplashScreen);

    // 🌟 [جديد] إعادة تطبيق اقتراح النطاق كل مرة يغيّر فيها المعلم الطالب المستهدف يدوياً
    document.getElementById('hw-target-student')?.addEventListener('change', suggestRangeFromStudentMemo);
    // 🌟 [جديد] البحث بالاسم داخل قائمة الطلاب المستهدفين
    setupTargetStudentSearch();

    document.getElementById('btn-generate-hw')?.addEventListener('click', generateQuestions);
    document.getElementById('btn-re-generate')?.addEventListener('click', generateQuestions);

    document.getElementById('btn-save-hw-publish')?.addEventListener('click', () => saveHomeworkToDB('published'));
    document.getElementById('btn-save-hw-draft')?.addEventListener('click', () => saveHomeworkToDB('draft'));

    document.getElementById('btn-add-manual-q')?.addEventListener('click', () => openQuestionBuilderModal(-1));
    document.getElementById('btn-close-qb')?.addEventListener('click', () => document.getElementById('hw-question-builder-modal').style.display = 'none');
    document.getElementById('btn-save-qb')?.addEventListener('click', saveManualQuestion);

    document.getElementById('btn-copy-hw-link')?.addEventListener('click', copyHomeworkLink);
    // 🌟🌟 [جديد] زر "إعادة المحاولة الآن" — راجع retryHomeworkCloudSync أسفل هذا الملف
    document.getElementById('btn-retry-hw-sync')?.addEventListener('click', retryHomeworkCloudSync);
    document.getElementById('btn-close-hw-modal')?.addEventListener('click', () => {
        document.getElementById('hw-share-modal').style.display = 'none';
        currentGeneratedQuestions = [];
        currentHwScope = null;
        document.getElementById('hw-preview-section').style.display = 'none';
        btnHistory.click();
    });
}

function toggleHwType() {
    const mode = document.querySelector('input[name="hwType"]:checked')?.value;
    document.getElementById('hw-surah-settings').style.display = (mode === 'surah') ? 'grid' : 'none';
    document.getElementById('hw-range-settings').style.display = (mode === 'range') ? 'grid' : 'none';
    document.getElementById('hw-juz-settings').style.display = (mode === 'juz') ? 'grid' : 'none';
    document.getElementById('hw-preview-section').style.display = 'none';
}

function updateAyahRange() {
    const surahNum = parseInt(document.getElementById('hw-surah-select').value);
    if (isNaN(surahNum)) return;
    const surah = AppState.surahsData.find(s => s.number === surahNum);
    const fromSelect = document.getElementById('hw-ayah-from');
    const toSelect = document.getElementById('hw-ayah-to');

    fromSelect.innerHTML = ""; toSelect.innerHTML = "";
    for (let i = 1; i <= surah.ayahsCount; i++) {
        fromSelect.appendChild(new Option(`${t("آية")} ${i}`, i));
        toSelect.appendChild(new Option(`${t("آية")} ${i}`, i));
    }
    toSelect.value = surah.ayahsCount;
}

// ==========================================
// 🧠 توليد وعرض الأسئلة
// ==========================================
async function generateQuestions() {
    if (!hwEngine) return alert(t("خطأ في تحميل المحرك!"));

    const mode = document.querySelector('input[name="hwType"]:checked').value;
    let qCountVal = 10;
    if (mode === 'juz') qCountVal = document.getElementById('hw-q-count-juz').value;
    else if (mode === 'range') qCountVal = document.getElementById('hw-q-count-range').value;
    else qCountVal = document.getElementById('hw-q-count-surah').value;

    const config = {
        mode: mode, qCount: parseInt(qCountVal),
        surahNum: parseInt(document.getElementById('hw-surah-select')?.value),
        startAyah: parseInt(document.getElementById('hw-ayah-from')?.value), endAyah: parseInt(document.getElementById('hw-ayah-to')?.value),
        rangeFrom: parseInt(document.getElementById('hw-range-from')?.value), rangeTo: parseInt(document.getElementById('hw-range-to')?.value),
        juzNum: parseInt(document.getElementById('hw-juz-select')?.value)
    };

    if (mode === 'surah' && isNaN(config.surahNum)) return alert(t("الرجاء اختيار السورة أولاً!"));
    // 🌟 تحقق بسيط إضافي: عدد الأسئلة المطلوب يجب أن يكون رقماً موجباً، وإلا فالمحرك
    // كان يتوقف بصمت بدون توليد أي سؤال ويظهر رسالة مضللة ("لم يتم العثور على آيات كافية")
    if (isNaN(config.qCount) || config.qCount <= 0) return alert(t("الرجاء اختيار عدد صحيح وموجب للأسئلة!"));

    currentGeneratedQuestions = await hwEngine.generateAutoQuestions(config);
    if (!currentGeneratedQuestions || currentGeneratedQuestions.length === 0) return alert(t("لم يتم العثور على آيات كافية."));

    currentHwScope = buildHwScope(config);   // 🌟 النطاق الحقيقي كما اختاره المعلم (لا نص ثابت)
    renderPreview();
}

// 🌟 [جديد] يحوّل إعدادات التوليد إلى نطاق مُخزَّن بأسماء السور (نص عربي صريح) ليُعرض في شهادة التقدير كما هو.
// surah: سورة + من آية إلى آية | range: من سورة إلى سورة | juz: الجزء. أي بيانات ناقصة/غير صالحة → null (لا تخمين).
function buildHwScope(config) {
    const nameOf = (num) => { const s = AppState.surahsData.find(x => x.number === num); return s ? s.name : null; };
    if (config.mode === 'surah') {
        const name = nameOf(config.surahNum);
        if (!name || isNaN(config.startAyah) || isNaN(config.endAyah)) return null;
        return { mode: 'surah', surahNum: config.surahNum, surahName: name, startAyah: config.startAyah, endAyah: config.endAyah };
    }
    if (config.mode === 'range') {
        const fromName = nameOf(config.rangeFrom), toName = nameOf(config.rangeTo);
        if (!fromName || !toName) return null;
        return { mode: 'range', fromNum: config.rangeFrom, fromName, toNum: config.rangeTo, toName };
    }
    if (config.mode === 'juz') {
        if (isNaN(config.juzNum)) return null;
        return { mode: 'juz', juzNum: config.juzNum };
    }
    return null;
}

// 🌟 [جديد] نطاق واجب معيّن للشهادة: النسخة المحلية أولاً (سجّلناها وقت النشر)، ثم الخادم (meta.scope) إن لم توجد محلياً.
// واجب قديم نُشر قبل هذا التعديل لا نطاق له → null، والشهادة حينها لا تعرض سطر النطاق (بدل تخمين نطاق خاطئ).
async function resolveHomeworkScope(hwId) {
    if (!hwId) return null;
    try {
        const all = await AppState.homeworkManager.getAllHomeworks() || [];
        const local = all.find(h => String(h.id) === String(hwId));
        if (local && local.scope) return local.scope;
    } catch (e) { /* ننتقل للخادم */ }
    return await fetchHomeworkScope(hwId);
}

function renderPreview() {
    const listDiv = document.getElementById('hw-questions-list');
    listDiv.innerHTML = '';

    currentGeneratedQuestions.forEach((q, index) => {
        const qCard = document.createElement('div');
        qCard.style.cssText = "background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; margin-bottom: 15px; position: relative;";

        const actionsHtml = `
            <div style="position: absolute; top: 15px; left: 15px; display: flex; gap: 5px;">
                <button class="btn btn-edit-q" data-idx="${index}" style="padding: 5px 10px; background: #f59e0b; font-size:1rem; min-width:unset;">✏️ ${t("تعديل")}</button>
                <button class="btn btn-delete-q" data-idx="${index}" style="padding: 5px 10px; background: #ef4444; font-size:1rem; min-width:unset;">🗑️ ${t("حذف")}</button>
            </div>
        `;

        let optionsHTML = '';

        if (q.type === 'matrix_order') {
            optionsHTML = `<table style="width:100%; text-align:center; border-collapse: collapse; margin-top:10px;">
                <tr style="background:#f1f5f9; color: #475569;">
                    <th style="padding:10px;">${t('الآية المبعثرة')}</th>
                    <th style="padding:10px;">${t('الترتيب الصحيح لها')}</th>
                </tr>`;
            q.options.forEach(opt => {
                let correctIndex = q.correctAnswer.indexOf(opt) + 1;
                optionsHTML += `<tr>
                    <td style="text-align:right; padding:10px; border-bottom:1px solid #e2e8f0; font-family: 'Amiri Quran', serif; font-size:1.3rem;">${opt}</td>
                    <td style="padding:10px; border-bottom:1px solid #e2e8f0; font-weight:bold; color:#10b981; font-size:1.2rem;">${correctIndex}</td>
                </tr>`;
            });
            optionsHTML += `</table>`;
        } else if (q.type === 'dual_dropdown') {
            optionsHTML = `<div style="margin-top: 10px; background: #f1f5f9; padding: 10px; border-radius: 8px; border: 1px dashed #cbd5e1;">
                <div style="margin-bottom: 8px;"><strong style="color:#0369a1;">${t('إجابة الفراغ الأول [ 1 ]:')}</strong> <span style="color:#10b981; font-weight:bold; font-size: 1.2rem;">${q.correctAnswer[0]}</span></div>
                <div><strong style="color:#0369a1;">${t('إجابة الفراغ الثاني [ 2 ]:')}</strong> <span style="color:#10b981; font-weight:bold; font-size: 1.2rem;">${q.correctAnswer[1]}</span></div>
            </div>`;
        } else if (q.type === 'written_blank') {
            optionsHTML = `<div style="margin-top: 10px; font-size: 1.2rem; color: #10b981;">✍️ <strong style="color:#0369a1;">${t('الكلمة المطلوبة:')}</strong> ${q.correctAnswer}</div>`;
        } else if (q.type === 'write_3_ayahs') {
            optionsHTML = `<div style="margin-top: 10px; font-size: 1.2rem; color: #10b981; background: #f0fdf4; padding: 10px; border-radius: 8px;">✍️ <strong style="color:#0369a1;">${t('الآيات الثلاث المطلوبة:')}</strong><br>${q.correctAnswer}</div>`;
        } else if (q.type === 'matching') {
            // 🌟 [جديد] معاينة أزواج المطابقة الصحيحة للمعلم قبل النشر (بدايات ↔ نهايات)
            optionsHTML = `<div style="margin-top: 10px; background: #f1f5f9; padding: 10px; border-radius: 8px; border: 1px dashed #cbd5e1;">`;
            q.correctAnswer.forEach(pair => {
                const leftItem = q.leftItems.find(it => it.id === pair.left);
                const rightItem = q.rightItems.find(it => it.id === pair.right);
                optionsHTML += `<div style="margin-bottom: 6px; font-family: 'Amiri Quran', serif; font-size: 1.1rem;">
                    <strong style="color:#0369a1;">${leftItem ? leftItem.text : ''}</strong>
                    <span style="color:#10b981; font-weight:bold;"> ⇄ </span>
                    <strong style="color:#10b981;">${rightItem ? rightItem.text : ''}</strong>
                </div>`;
            });
            optionsHTML += `</div>`;
        } else if (q.options && q.options.length > 0) {
            optionsHTML = `<ul style="list-style:none; padding:0; margin-top:10px; color:#334155;">`;
            q.options.forEach(opt => {
                let isCorrect = Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(opt) : (opt === q.correctAnswer);
                let icon = q.type === 'checkbox' ? (isCorrect ? '☑️' : '🔲') : (isCorrect ? '✔️' : '⚪');
                optionsHTML += `<li style="padding: 5px; background: ${isCorrect ? '#dcfce7' : '#f1f5f9'}; margin-bottom: 5px; border-radius: 5px; font-weight: ${isCorrect ? 'bold' : 'normal'};">${icon} ${opt}</li>`;
            });
            optionsHTML += `</ul>`;
        }

        let manualBadge = q.needsManualGrading ? `<span style="font-size:0.8rem; background:#fef08a; color:#854d0e; padding:3px 8px; border-radius:10px; margin-right:10px;">${t('يحتاج تقييم يدوي ✍️')}</span>` : "";

        qCard.innerHTML = actionsHtml + `
            <div style="font-weight: bold; color: #0f172a; font-size: 1.2rem; width: 70%;">${t("السؤال")} ${index + 1}: ${hl(q.title)} <span style="font-size:0.9rem; color:#64748b; font-weight:normal;">(${q.points || 1} ${t('نقاط')})</span> ${manualBadge}</div>
            <div class="quran-text" style="font-size: 1.6rem; color: #047857; margin-top: 10px;">${hl(q.text)}</div>
            ${optionsHTML}
        `;
        listDiv.appendChild(qCard);
    });

    document.querySelectorAll('.btn-edit-q').forEach(btn => btn.addEventListener('click', (e) => openQuestionBuilderModal(parseInt(e.target.dataset.idx))));
    document.querySelectorAll('.btn-delete-q').forEach(btn => btn.addEventListener('click', async (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx);
        if (await confirmHwDelete({ titleKey: 'hw_delete_q_title', bodyKey: 'hw_delete_q_body' })) {   // 🌟 نافذة وسط الصفحة بدل confirm() العلوي
            currentGeneratedQuestions.splice(idx, 1);
            renderPreview();
        }
    }));

    document.getElementById('hw-preview-section').style.display = 'block';
    if(currentGeneratedQuestions.length > 0) document.getElementById('hw-preview-section').scrollIntoView({ behavior: "smooth" });
}

function openQuestionBuilderModal(index = -1) {
    document.getElementById('qb-edit-index').value = index;

    const selectEl = document.getElementById('qb-type');
    if (!selectEl.querySelector('option[value="written_blank"]')) {
        selectEl.innerHTML = `
            <option value="mcq">${t('اختيار من متعدد (إجابة واحدة)')}</option>
            <option value="checkbox">${t('مربعات اختيار (عدة إجابات)')}</option>
            <option value="dropdown">${t('قائمة منسدلة (فراغات)')}</option>
            <option value="written_blank">${t('أكمل الفراغ (كتابة يدوية)')}</option>
            <option value="write_3_ayahs">${t('تسميع مقطع (كتابة يدوية)')}</option>
        `;
    }

    if (index >= 0) {
        const q = currentGeneratedQuestions[index];
        document.getElementById('qb-modal-title').innerText = `${t('hw_modal_q_title')} ${index + 1}`;
        document.getElementById('qb-type').value = (q.type === 'mcq_next' || q.type === 'mcq_prev' || q.type === 'ayah_ending' || q.type === 'intruder_word') ? 'mcq' : (q.type === 'dual_dropdown' ? 'dropdown' : q.type);
        document.getElementById('qb-title').value = q.title;
        document.getElementById('qb-text').value = q.text;
        document.getElementById('qb-options').value = q.options ? q.options.join('\n') : '';
        document.getElementById('qb-correct').value = Array.isArray(q.correctAnswer) ? q.correctAnswer.join(',') : q.correctAnswer;
    } else {
        document.getElementById('qb-modal-title').innerText = t('hw_modal_q_title');
        document.getElementById('qb-type').value = 'mcq';
        document.getElementById('qb-title').value = '';
        document.getElementById('qb-text').value = '';
        document.getElementById('qb-options').value = '';
        document.getElementById('qb-correct').value = '';
    }

    document.getElementById('hw-question-builder-modal').style.display = 'flex';
}

function saveManualQuestion() {
    const type = document.getElementById('qb-type').value;
    const title = document.getElementById('qb-title').value.trim();
    const text = document.getElementById('qb-text').value.trim();
    const optionsRaw = document.getElementById('qb-options').value.split('\n').map(o => o.trim()).filter(o => o !== '');
    const correctRaw = document.getElementById('qb-correct').value.trim();

    if (!title || !text) return alert(t("الرجاء كتابة عنوان ونص السؤال!"));

    const editIndex = parseInt(document.getElementById('qb-edit-index').value);

    let needsManual = (type === 'written_blank' || type === 'write_3_ayahs');

    const newQ = {
        id: editIndex >= 0 ? currentGeneratedQuestions[editIndex].id : 'q_manual_' + Date.now(),
        type: type,
        title: title,
        text: text,
        options: optionsRaw,
        correctAnswer: type === 'checkbox' ? correctRaw.split(',').map(s=>s.trim()) : correctRaw,
        points: (type === 'checkbox' || type === 'written_blank') ? 2 : (type === 'write_3_ayahs' ? 3 : 1),
        needsManualGrading: needsManual
    };

    if (editIndex >= 0) {
        currentGeneratedQuestions[editIndex] = newQ;
    } else {
        currentGeneratedQuestions.push(newQ);
        document.getElementById('hw-preview-section').style.display = 'block';
    }

    document.getElementById('hw-question-builder-modal').style.display = 'none';
    renderPreview();
}

// 🌟 [جديد 2026-10-01 — تسريع ظهور رابط المشاركة] فحص الرابط العام (نسخة الطالب بلا إجابات صحيحة) صار يجري في
// الخلفية بعد ظهور الرابط، بدل الانتظار له قبل العرض (كان يضيف نداءً كاملاً للخادم + حتى 3 محاولات). الرابط لا يظهر
// أصلاً إلا بعد أن أكّد الخادم حفظ الواجب (persisted) فالفحص هنا شبكة أمان فقط.
// ⚠️ افتراض صريح: لو فشل الفحص المتأخر نعرض تحذيراً داخل نافذة المشاركة نفسها (لا نُلغي الرابط ولا الواجب المنشور)،
// ونتجاهل النتيجة لو أُغلقت النافذة أو تغيّر الرابط المعروض قبل وصولها (حتى لا يظهر تحذير واجب قديم على واجب جديد).
function verifyPublicLinkInBackground(hwId) {
    fetchPublicHomework(hwId).then(pub => {
        if (JSON.stringify(pub).includes('correctAnswer')) throw new Error('answers leaked in public homework');
    }).catch(err => {
        console.error("تم نشر الواجب لكن فحص الرابط العام (في الخلفية) فشل:", err);
        const input = document.getElementById('hw-link-input');
        const modal = document.getElementById('hw-share-modal');
        const warnEl = document.getElementById('hw-cloud-sync-warning');
        if (!input || !modal || !warnEl) return;
        if (modal.style.display === 'none' || !String(input.value || '').includes(hwId)) return;
        warnEl.textContent = t('hw_link_check_late_failed') + ' ' + friendlyErrorText(err);
        warnEl.style.display = 'block';
    });
}

// 🌟🌟 [أُعيدت كتابتها — دمج نظام الواجبات الجديد] حفظ/نشر الواجب.
// - "مسودة": تُحفظ محلياً فقط (بلا أي اتصال) كما كانت تماماً.
// - "نشر": يُرسَل للخادم أولاً، ولا يظهر أي رابط للمشاركة إلا بعد أن يؤكد الخادم أنه حفظ الواجب وأعاد قراءته
//   (persisted)، ثم نتحقق أن الرابط يفتح فعلاً كما سيراه الطالب (وأنه لا يحتوي الإجابات الصحيحة). كان النظام
//   القديم يعرض الرابط فوراً حتى لو لم يصل الواجب للسحابة، فيفشل عند أي طالب بـ"الواجب غير موجود".
//   معرّف الواجب يولّده الخادم (عشوائي غير قابل للتخمين) وتُحفظ نسخة محلية بنفس المعرّف بنفس بنية السجل القديمة.
async function saveHomeworkToDB(statusType) {
    if (currentGeneratedQuestions.length === 0) return alert(t("لا يوجد أسئلة لحفظها!"));

    const targetStudentName = document.getElementById('hw-target-student').value;
    const saveBtn = document.getElementById('btn-save-hw-publish');
    const restorePublishBtn = () => { if (saveBtn) saveBtn.innerHTML = `🚀 ${t('hw_publish_btn')}`; };

    // النشر يحتاج جلسة جوجل لنظام الواجبات (المسودة المحلية لا تحتاجها)
    if (statusType === 'published' && !(await ensureHomeworkSignIn())) return;

    if (saveBtn) saveBtn.innerHTML = `⏳ ${t('hw_submitting')}`;

    let targetStudentAvatar = null;
    let targetStudentId = null;
    if (targetStudentName) {
        const students = await AppState.studentManager.getAllStudents();
        const std = students.find(s => s.name === targetStudentName);
        if (std) {
            targetStudentAvatar = std.avatar || std.image || std.photo || std.profilePic || std.picture || std.icon || null;
            targetStudentId = std.id;
        }
    }

    try {
        if (statusType !== 'published') {
            // ---- مسودة محلية فقط ----
            const draftObj = {
                id: 'HW_' + Date.now(),
                createdAt: new Date().toISOString(),
                questions: currentGeneratedQuestions,
                status: statusType,
                assignedStudentName: targetStudentName || null,
                assignedStudentAvatar: targetStudentAvatar || null,
                scope: currentHwScope || null   // 🌟 نطاق الواجب الحقيقي (للشهادة)
            };
            await AppState.homeworkManager.createHomework(draftObj);
            if(saveBtn) saveBtn.innerHTML = `📝 ${t('hw_draft_btn')}`;
            alert(t("✅ تم حفظ الواجب كمسودة محلياً بنجاح."));
            document.getElementById('btn-tab-history').click();
            currentGeneratedQuestions = [];
            currentHwScope = null;
            document.getElementById('hw-preview-section').style.display = 'none';
            return;
        }

        // ---- نشر: الخادم أولاً ----
        let created;
        try {
            created = await publishHomeworkToServer({
                questions: currentGeneratedQuestions,
                assignedStudentName: targetStudentName || null,
                assignedStudentId: targetStudentId,
                meta: { app: 'darham', createdFrom: 'homework-prep', scope: currentHwScope || null }   // 🌟 النطاق يُخزَّن في الخادم مع الواجب
            });
        } catch (err) {
            console.error("فشل نشر الواجب في الخادم:", err);
            alert(t('hw_publish_failed') + '\n' + friendlyErrorText(err));
            restorePublishBtn();
            return;
        }

        // 🌟 [عدّل 2026-10-01] فحص الرابط العام انتقل للخلفية (verifyPublicLinkInBackground) ويبدأ بعد عرض الرابط أدناه.

        // نسخة محلية في سجل الواجبات (نفس البنية القديمة) بنفس معرّف الخادم
        const homeworkObj = {
            id: created.id,
            createdAt: created.createdAt,
            questions: currentGeneratedQuestions,
            status: 'published',
            assignedStudentName: targetStudentName || null,
            assignedStudentAvatar: targetStudentAvatar || null,
            scope: currentHwScope || null,   // 🌟 نطاق الواجب الحقيقي (للشهادة)
            cloudConfirmed: true
        };
        try { await AppState.homeworkManager.createHomework(homeworkObj); }
        catch (err) { console.error("تعذر حفظ النسخة المحلية (لا يؤثر على الواجب المنشور):", err); }

        restorePublishBtn();
        document.getElementById('share-modal-title').innerText = t('hw_share_success');
        const baseUrl = window.location.origin + window.location.pathname;
        const link = buildHomeworkShareLink(baseUrl, homeworkObj);
        document.getElementById('hw-link-input').value = link;
        // لا يوجد تحذير "لم يُرفع للسحابة" بعد الآن: الرابط لا يظهر أصلاً إلا بعد تأكيد الخادم
        const syncWarningEl = document.getElementById('hw-cloud-sync-warning');
        const retryBtn = document.getElementById('btn-retry-hw-sync');
        if (syncWarningEl) syncWarningEl.style.display = 'none';
        if (retryBtn) retryBtn.style.display = 'none';
        document.getElementById('hw-share-modal').style.display = 'flex';
        verifyPublicLinkInBackground(created.id);   // 🌟 فحص متأخر غير حاجز (راجع التعليق أعلاه)
        await loadHomeworkDashboard();
    } catch (error) {
        console.error("خطأ عام في حفظ الواجب:", error);
        alert(t("حدث خطأ أثناء الحفظ. يرجى تحديث الصفحة."));
        restorePublishBtn();
    }
}

// 🌟 [جديد 2026-10-01 — فحص سهولة الاستخدام] نشر مسودة محلية موجودة في سجل الواجبات. نفس خطوات "النشر" في
// saveHomeworkToDB بالضبط (الخادم أولاً ثم فحص الرابط العام ثم نسخة محلية بمعرّف الخادم)، ثم تُحذف المسودة
// القديمة حتى لا يظهر الواجب مرتين. ⚠️ افتراض صريح: المسودة تُنشر بنفس أسئلتها وطالبها المخصَّص كما حُفظت.
async function publishDraftFromHistory(draftId) {
    const all = await AppState.homeworkManager.getAllHomeworks() || [];
    const draft = all.find(h => String(h.id) === String(draftId));
    if (!draft || !Array.isArray(draft.questions) || draft.questions.length === 0) return alert(t('hw_draft_publish_empty'));
    if (!(await ensureHomeworkSignIn())) return;

    let studentId = null;
    if (draft.assignedStudentName) {
        const students = await AppState.studentManager.getAllStudents();
        const std = students.find(s => s.name === draft.assignedStudentName);
        if (std) studentId = std.id;
    }

    let created;
    try {
        created = await publishHomeworkToServer({
            questions: draft.questions,
            assignedStudentName: draft.assignedStudentName || null,
            assignedStudentId: studentId,
            meta: { app: 'darham', createdFrom: 'homework-prep-draft', scope: draft.scope || null }   // 🌟 نطاق المسودة المحفوظ
        });
    } catch (err) {
        console.error("فشل نشر المسودة في الخادم:", err);
        return alert(t('hw_publish_failed') + '\n' + friendlyErrorText(err));
    }

    // 🌟 [عدّل 2026-10-01] فحص الرابط العام انتقل للخلفية (verifyPublicLinkInBackground) ويبدأ بعد عرض الرابط أدناه.

    const homeworkObj = {
        id: created.id,
        createdAt: created.createdAt,
        questions: draft.questions,
        status: 'published',
        assignedStudentName: draft.assignedStudentName || null,
        assignedStudentAvatar: draft.assignedStudentAvatar || null,
        scope: draft.scope || null,
        cloudConfirmed: true
    };
    try {
        await AppState.homeworkManager.createHomework(homeworkObj);
        await AppState.homeworkManager.deleteHomework(draft.id);   // لا يُحذف إلا بعد نجاح حفظ النسخة المنشورة
    } catch (err) { console.error("تعذر تحديث النسخة المحلية بعد نشر المسودة (لا يؤثر على الواجب المنشور):", err); }

    document.getElementById('share-modal-title').innerText = t('hw_share_success');
    const baseUrl = window.location.origin + window.location.pathname;
    document.getElementById('hw-link-input').value = buildHomeworkShareLink(baseUrl, homeworkObj);
    const syncWarningEl = document.getElementById('hw-cloud-sync-warning');
    const retryBtn = document.getElementById('btn-retry-hw-sync');
    if (syncWarningEl) syncWarningEl.style.display = 'none';
    if (retryBtn) retryBtn.style.display = 'none';
    document.getElementById('hw-share-modal').style.display = 'flex';
    verifyPublicLinkInBackground(created.id);   // 🌟 فحص متأخر غير حاجز (راجع التعليق أعلاه)
    await loadHomeworkDashboard();
}

// 🌟🌟 [جديد] معالج زر "إعادة المحاولة الآن" في نافذة المشاركة — يتيح للمعلم إعادة محاولة رفع
// الواجب الذي فشل رفعه فوراً بضغطة واحدة، بدل الانتظار السلبي لإعادة المحاولة التلقائية
// (عودة الاتصال، أو فتح الشاشة لاحقاً — راجع core/app.js وinitHomeworkPrep أعلاه). نستدعي
// flushPendingHomeworkSync (تعيد رفع كل الواجبات المعلّقة، وليس هذا الواجب فقط — لا ضرر في ذلك
// وأبسط من دالة منفصلة)، ثم نتحقق من isHomeworkPendingSync لمعرفة هل هذا الواجب تحديداً نجح
// رفعه فعلاً أم لا يزال عالقاً، ونعرض نتيجة حقيقية للمعلم بدل افتراض النجاح.
async function retryHomeworkCloudSync() {
    const retryBtn = document.getElementById('btn-retry-hw-sync');
    const syncWarningEl = document.getElementById('hw-cloud-sync-warning');
    if (!lastFailedHomeworkForRetry) return;

    if (retryBtn) {
        retryBtn.disabled = true;
        retryBtn.innerHTML = `⏳ ${t('hw_submitting')}`;
    }

    await flushPendingHomeworkSync().catch(err => console.error("خطأ أثناء إعادة المحاولة اليدوية لرفع الواجب:", err));

    const stillPending = isHomeworkPendingSync(lastFailedHomeworkForRetry.id);
    if (!stillPending) {
        // 🌟 نجحت إعادة المحاولة: نُخفي التحذير والزر تماماً، الرابط المعروض بالفعل صحيح الآن
        if (syncWarningEl) syncWarningEl.style.display = 'none';
        if (retryBtn) retryBtn.style.display = 'none';
        lastFailedHomeworkForRetry = null;
    } else {
        // 🌟 لا تزال المحاولة فاشلة: نُبقي التحذير ظاهراً ونعيد الزر لحالته الطبيعية ليحاول المعلم
        // مرة أخرى لاحقاً (غالباً بسبب استمرار انقطاع الإنترنت)
        if (retryBtn) {
            retryBtn.disabled = false;
            retryBtn.innerHTML = `🔄 ${t('hw_retry_sync_btn')}`;
        }
    }

    // 🌟 نعكس النتيجة فوراً على علامة ⏳ في سجل الواجبات أيضاً
    await loadHomeworkDashboard();
}

// 🌟🌟 [محدَّث] كان يُنسَخ الرابط وحده — الآن يُنسَخ رسالة جاهزة كاملة للمشاركة عبر واتساب أو
// أي تطبيق مراسلة (buildHomeworkShareMessage)، والرابط المكتوب في حقل الإدخال المرئي نفسه
// (hw-link-input) لا يتغيّر — يبقى الرابط الخام وحده، حتى يظل قابلاً للنسخ اليدوي/التحديد
// كما هو تماماً لو احتاج المعلم الرابط فقط بلا النص المحيط به.
function copyHomeworkLink() {
    const linkInput = document.getElementById('hw-link-input');
    const copyBtn = document.getElementById('btn-copy-hw-link');

    linkInput.select();
    linkInput.setSelectionRange(0, 99999);

    navigator.clipboard.writeText(buildHomeworkShareMessage(linkInput.value)).then(() => {
        const originalText = copyBtn.innerHTML;
        const originalBg = copyBtn.style.background;
        copyBtn.innerHTML = `✔️ ${t('hw_copy_btn')}`;
        copyBtn.style.background = '#10b981';

        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.style.background = originalBg;
        }, 2000);
    }).catch(err => alert(t("يرجى نسخ الرابط يدوياً.")));
}