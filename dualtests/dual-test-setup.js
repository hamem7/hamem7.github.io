// dualtests/dual-test-setup.js
//
// 🌟 [جديد بالكامل] منطق شاشة إعداد "الاختبارات الثنائية". ملف مستقل تماماً في مجلد
// dualtests/ الجديد المعزول عن games/ وsettings/ (بطلب صريح من المعلم)، يعتمد فقط على
// database/dualTestsDB.js وengine/dualTestEngine.js الجديدَين + الأدوات المشتركة العامة
// الموجودة أصلاً (core/app.js، components/ui.js). راجع مستند المشروع
// "تصميم-نظام-الاختبارات-الثنائية.md" لكل القرارات المعتمدة من المعلم المطبَّقة هنا.
//
// 🌟 [مُحدَّث] محرر الاختبار أصبح "معالج" (wizard) من 3 خطوات متتالية بدل صفحة واحدة طويلة
// تعرض الجولات الثلاث مع بعض دفعة واحدة — بطلب صريح من المعلم:
//   الخطوة 1: المتسابقان الافتراضيان + نطاق كل جولة من الثلاث (اسم سورة كاملة فقط، بلا رقم
//             آية — الطبيعي أن يختبر الطالب السورة كاملة وليس جزءاً منها).
//   الخطوة 2: 3 أزرار كبيرة (جولة 1 / 2 / 3) يختار منها المعلم أي جولة يريد تجهيزها الآن.
//   الخطوة 3: محرر أسئلة الجولة المختارة فقط (نفس نموذج الإدخال الحر "من"/"إلى" كما كان)،
//             وأزرار الحفظ (مسودة/جاهز) ظاهرة دائماً بغض النظر عن الخطوة الحالية — يقدر
//             المعلم يحفظ في أي لحظة، بلا أي شرط اكتمال (نفس الفلسفة المعتمدة سابقاً).
// التنقل بين الخطوات لا يحفظ شيئاً بنفسه — كل التعديلات تبقى في currentTest بالذاكرة حتى
// يضغط المعلم فعلياً أحد زرَي الحفظ، تماماً كسلوك المحرر القديم.

import { AppState, loadSplashScreen, t, surahNameLocal } from '../core/app.js';
import { esc } from '../core/escape.js';
import { loadScreen } from '../core/navigation.js';
import { showToastEncouragement, openModal, closeModal } from '../components/ui.js';
import { createEmptyDualTest } from '../database/dualTestsDB.js';
// 🌟 [جديد] computeSeriesResult — لعرض "عدد الجولات المكسوبة حتى الآن" لكل مواجهة معلّقة
// داخل نافذة "⏸️ المواجهات المعلقة" (نفس الدالة المستخدَمة في شاشة اللعب والنتيجة النهائية)
import { generateSwapCode, computeSeriesResult } from '../engine/dualTestEngine.js';
// 🌟 [جديد] شاشة "تقرير المواجهة" — تُستخدم هنا لفتح تقرير أي مباراة سابقة منتهية من نافذة
// "📜 المباريات السابقة" أسفل، بنفس الطريقة التي يفتحه بها زر "عرض التقرير" في شاشة اللعب
// نفسها مباشرة بعد انتهاء المباراة (راجع dual-test-play.js وreports/dual-test-report.js)
import { openDualTestReportScreen } from '../reports/dual-test-report.js';

// حالة الشاشة أثناء العمل عليها (تُعاد تهيئتها كل مرة تُفتَح فيها الشاشة عبر initDualTestSetup)
let currentTest = null;      // الاختبار قيد التحرير حالياً (null = طبقة القائمة معروضة)
let editingTestId = null;    // null = اختبار جديد لم يُحفَظ بعد
let allStudents = [];        // كل الطلاب غير المخفيين، لقوائم اختيار المتسابقَين
// 🌟 [جديد] الاختبار المفتوح حالياً في نافذة "بدء مواجهة جديدة" — يُستخدم عند تأكيد
// النافذة لمعرفة أي اختبار محفوظ نبني منه المواجهة الجديدة
let activeMatchTestId = null;
// 🌟 [جديد] الاختبار (بنك الأسئلة كاملاً) المفتوح حالياً في نافذة "📜 المباريات السابقة" —
// يُمرَّر كما هو لشاشة التقرير عند اختيار مباراة معينة (التقرير يحتاج بنك الأسئلة الأصلي
// لاسترجاع نص "من/إلى" الفعلي لكل سؤال — راجع reports/dual-test-report.js)
let historyTestCache = null;
// 🌟 [جديد] الاختبار المفتوح حالياً في نافذة "⏸️ المواجهات المعلقة" — تُستخدم لإعادة رسم
// النافذة بعد حذف مواجهة معلقة من داخلها بلا إغلاقها
let pendingTestIdCache = null;
// 🌟 [جديد] زوج الطلاب المحدَّد حالياً لنافذة "⏸️ المواجهات المعلقة" (أو null = بلا تصفية).
// بعد أن لاحظ المعلم أن نفس بنك الأسئلة (test) يُستخدم أحياناً مع أكثر من زوج طلاب مختلف
// (راجع newMatch في معالج "ابدأ مواجهة" — المواجهة مرتبطة بالاختبار فقط لا بزوج طلاب ثابت)،
// صار لكل زوج طلاب له مواجهات معلقة زرّه المستقل على صف الاختبار، والنافذة تُفتَح مُصفّاة على
// هذا الزوج تحديداً بدل عرض كل المواجهات المعلقة على الاختبار مجمّعة في رقم واحد مُضلِّل.
// مفتاح الزوج بنفس صيغة التطابق المستخدمة فعلاً في فحص "منع البدء من الصفر بالغلط" أدناه:
// [studentIdA, studentIdB] مُرتَّبين كنصوص ومفصولين بـ "|"، بصرف النظر عن ترتيبهما الأصلي.
let pendingPairKeyCache = null;
let pendingPairNamesCache = null; // {a, b} — لعرضهما في عنوان النافذة أثناء التصفية

// 🌟 [جديد] حالة معالج خطوات محرر الاختبار (1/2/3) + الجولة المختارة حالياً في الخطوة 3
let currentStep = 1;
let activeRoundIndex = 0;
// 🌟 [جديد] عدد الجولات المفتوحة للتجهيز في الاختبار قيد التحرير (1..3) — بطلب صريح من المعلم:
// الاختبار الجديد يُجهَّز جولة بجولة؛ تظهر الجولة الأولى فقط مفتوحة، والجولتان الأخريان ظاهرتان
// لكن مقفلتان، وتُفتح كل جولة تلقائياً بعد لعب الجولة التي قبلها. راجع computeUnlockedRoundCount
let unlockedRoundCount = 3;

const ROUND_TITLE_KEYS = ['dts_round1_title', 'dts_round2_title', 'dts_round3_title'];

// ===================== نقطة الدخول =====================

export async function initDualTestSetup() {
    // 🌟 [2026-10-02] حلّت الجولة الإرشادية (components/guidedTour.js) محل تلميح 'dual_test_setup' القديم.
    // best-effort: أي فشل لا يمنع فتح الشاشة.
    import('../components/guidedTour.js').then(m => m.maybeStartTour('dual')).catch(() => {});

    currentTest = null;
    editingTestId = null;

    const students = await AppState.studentManager.getAllStudents();
    allStudents = students.filter(s => !s.isHidden);

    await renderTestsList();
    wireStaticListeners();

    // 🌟 [جديد] فتح مباشر لتجهيز جولة محددة — يُضبط من شاشة اللعب عند محاولة لعب جولة لم تُجهَّز
    // أسئلتها بعد (راجع renderRoundNotReady في dual-test-play.js). يُقرأ مرة واحدة ثم يُفرَّغ
    const deepLink = AppState.dualTestSetupOpenRound;
    AppState.dualTestSetupOpenRound = null;
    if (deepLink && deepLink.testId != null) {
        const test = await AppState.dualTestsManager.getTestById(deepLink.testId);
        if (test) await openEditor(test, deepLink.testId, deepLink.roundIndex);
    }
}

// ===================== أدوات بناء قوائم السور المنسدلة =====================
// 🌟 نفس فكرة تعبئة القوائم المستخدمة فعلاً في settings/dashboard.js (surah-select) لكن
// كدالة قابلة لإعادة الاستخدام هنا لكل صفوف نطاق الجولات الثلاث

function surahOptionsHTML(selectedSurah) {
    let html = `<option value="" ${!selectedSurah ? 'selected' : ''}>--</option>`;
    (AppState.surahsData || []).forEach(s => {
        html += `<option value="${s.number}" ${selectedSurah === s.number ? 'selected' : ''}>${s.number}. ${surahNameLocal(s.name)}</option>`;
    });
    return html;
}

// 🌟 [جديد] اسم سورة من رقمها — يُستخدَم لعرض ملخص نطاق الجولة (للقراءة فقط) في الخطوتين 2 و3
function surahNameByNumber(num) {
    if (!num) return '';
    const surah = (AppState.surahsData || []).find(s => s.number === num);
    return surah ? `${surah.number}. ${surah.name}` : '';
}

function populateCompetitorSelect(selectEl, selectedId) {
    if (!selectEl) return;
    let html = `<option value="">${t('dts_choose_student')}</option>`;
    allStudents.forEach(s => {
        html += `<option value="${s.id}" ${String(s.id) === String(selectedId) ? 'selected' : ''}>${esc(s.name)}</option>`;
    });
    selectEl.innerHTML = html;
}

// ===================== طبقة القائمة =====================

async function renderTestsList() {
    const container = document.getElementById('dts-tests-container');
    if (!container) return;

    const tests = await AppState.dualTestsManager.getAllTests();

    if (!tests.length) {
        container.innerHTML = `<div class="dts-empty-msg">${t('dts_no_tests')}</div>`;
        return;
    }

    // 🌟 [مُحدَّث] "المواجهات المعلقة" لكل اختبار — كانت تُجمَّع في رقم واحد لكل testId فقط،
    // لكن نفس بنك الأسئلة (test) يمكن استخدامه مع أكثر من زوج طلاب مختلف عبر الوقت (راجع
    // newMatch في معالج "ابدأ مواجهة": المواجهة مرتبطة بالاختبار فقط، لا بزوج طلاب ثابت).
    // فرقم مجمّع مثل "(3)" فوق صف اختبار واحد قد يخص فعلياً ثلاثة أزواج طلاب مختلفين تماماً —
    // وهو ما لاحظه المعلم وطلب تصحيحه صراحةً. الآن تُجمَّع المواجهات المعلقة لكل اختبار حسب
    // زوج الطلاب الفعلي (بصرف النظر عن ترتيبهما، بنفس مفتاح المطابقة المستخدم في فحص "منع
    // البدء من الصفر بالغلط" أسفل الملف)، فيظهر زر مستقل باسمَي الطالبَين الحقيقيَّين لكل زوج.
    // تُجلَب كل المواجهات مرة واحدة هنا ثم تُجمَّع بالذاكرة، بدل استعلام منفصل لكل صف اختبار.
    let pendingGroupsByTest = {};
    let playedByTest = {}; // 🌟 [جديد] أقصى عدد جولات لُعبت لكل اختبار (لشارة "بانتظار التجهيز")
    try {
        const allMatches = await AppState.dualTestsManager.getAllMatches();
        allMatches.forEach(m => {
            const n = Array.isArray(m.rounds) ? m.rounds.length : 0;
            playedByTest[m.testId] = Math.max(playedByTest[m.testId] || 0, n);
        });
        allMatches.filter(m => m.status !== 'completed').forEach(m => {
            const pairKey = [String(m.studentIdA), String(m.studentIdB)].sort().join('|');
            if (!pendingGroupsByTest[m.testId]) pendingGroupsByTest[m.testId] = {};
            const testGroups = pendingGroupsByTest[m.testId];
            if (!testGroups[pairKey]) {
                testGroups[pairKey] = { pairKey, nameA: m.studentNameA, nameB: m.studentNameB, count: 0 };
            }
            testGroups[pairKey].count++;
        });
    } catch (e) { pendingGroupsByTest = {}; /* best-effort — لا يمنع عرض القائمة */ }

    tests.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    container.innerHTML = tests.map(tst => {
        const groups = Object.values(pendingGroupsByTest[tst.id] || {});
        return buildTestRowHTML(tst, groups, playedByTest[tst.id] || 0);
    }).join('');
}

// ===================== 🌟 [جديد] تجهيز الجولات تدريجياً (جولة بجولة) =====================
// قاعدة الفتح: الجولة رقم (i+1) مفتوحة إذا كانت الأولى، أو لُعبت الجولة التي قبلها في أي مواجهة
// على هذا الاختبار (أقصى match.rounds.length)، أو كان فيها محتوى محفوظ مسبقاً (نطاق أو أسئلة) —
// الشرط الأخير يُبقي الاختبارات القديمة التي جُهّزت جولاتها الثلاث دفعة واحدة كما هي بلا قفل.

function roundHasContent(round) {
    if (!round) return false;
    return (round.mainQuestions || []).length > 0
        || (round.swapQuestions || []).length > 0
        || !!(round.rangeFrom && round.rangeFrom.surah)
        || !!(round.rangeTo && round.rangeTo.surah);
}

function maxRoundsPlayed(matches) {
    return (matches || []).reduce((max, m) => Math.max(max, Array.isArray(m.rounds) ? m.rounds.length : 0), 0);
}

function unlockedCountFor(test, playedRounds) {
    let count = Math.min(3, Math.max(1, playedRounds + 1));
    (test.rounds || []).forEach((round, i) => { if (roundHasContent(round)) count = Math.max(count, i + 1); });
    return Math.min(3, count);
}

async function computeUnlockedRoundCount(test, testId) {
    let played = 0;
    if (testId != null) {
        try { played = maxRoundsPlayed(await AppState.dualTestsManager.getMatchesByTestId(testId)); }
        catch (e) { played = 0; /* best-effort — أسوأ حالة: الجولة الأولى فقط + ما فيه محتوى */ }
    }
    return unlockedCountFor(test, played);
}

// أول جولة مفتوحة لم تُضَف لها أي أسئلة أساسية بعد (أو -1) — لشارة "بانتظار التجهيز" على صف الاختبار
function nextRoundToPrepare(test, playedRounds) {
    const unlocked = unlockedCountFor(test, playedRounds);
    for (let i = 0; i < unlocked; i++) {
        if (!((test.rounds[i] || {}).mainQuestions || []).length) return i;
    }
    return -1;
}

const DTS_LOCK_ICON = '<svg class="dts-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

// 🌟 [جديد — التصميم الاحترافي] أيقونات SVG خطّية موحّدة لأزرار صف الاختبار، بدل الإيموجي
// (يختلف شكله بين الأجهزة). شكلية بحتة: كل زر يحتفظ بنفس data-action ونفس النص المترجم
const DTS_ICONS = {
    start: '<svg class="dts-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l12 8-12 8z"/></svg>',
    edit: '<svg class="dts-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    history: '<svg class="dts-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 3"/></svg>',
    delete: '<svg class="dts-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>'
};

function buildTestRowHTML(test, pendingGroups = [], playedRounds = 0) {
    const namesLabel = `${test.defaultStudentNameA || '—'} <span class="dts-names-vs">VS</span> ${test.defaultStudentNameB || '—'}`;
    const isReady = test.status === 'ready';
    const badgeClass = isReady ? 'dts-badge-ready' : 'dts-badge-draft';
    const badgeText = isReady ? t('dts_status_ready') : t('dts_status_draft');
    const dateLabel = test.updatedAt
        ? new Date(test.updatedAt).toLocaleDateString(AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US')
        : '';
    const startBtn = isReady
        ? `<button type="button" class="dts-btn-start" data-action="start" data-id="${test.id}">${DTS_ICONS.start}${t('dts_start_match_btn')}</button>`
        : '';
    // 🌟 [مُحدَّث] زر مستقل لكل زوج طلاب له مواجهات معلقة على هذا الاختبار (بدل زر واحد
    // مجمّع) — كل زر يحمل اسمَي الطالبَين الفعليَّين وعدد مواجهاتهما المعلقة تحديداً، ويفتح
    // النافذة مُصفّاة على هذا الزوج فقط (data-pair + اسمان يُمرَّران عبر data attributes
    // لتجنّب إعادة البحث عنهما وقت الفتح). لا يظهر أي زر إطلاقاً لو لا توجد مواجهات معلقة.
    const pendingBtns = pendingGroups.map(g => `
        <button type="button" class="dts-btn-pending" data-action="pending" data-id="${test.id}"
                data-pair="${escapeHtml(g.pairKey)}" data-name-a="${escapeHtml(g.nameA)}" data-name-b="${escapeHtml(g.nameB)}">
            ${t('dts_pending_pair_btn').replace('{a}', escapeHtml(g.nameA)).replace('{b}', escapeHtml(g.nameB)).replace('{n}', g.count)}
        </button>`).join('');

    // 🌟 [جديد] شارة "الجولة N بانتظار التجهيز" — تفتح المحرر مباشرة على أسئلة تلك الجولة
    const prepIndex = nextRoundToPrepare(test, playedRounds);
    const prepBtn = prepIndex >= 0
        ? `<button type="button" class="dts-btn-prep" data-action="prep" data-id="${test.id}" data-round="${prepIndex}">${DTS_ICONS.edit}${t('dts_round_needs_prep').replace('{n}', prepIndex + 1)}</button>`
        : '';

    return `
    <div class="dts-test-row">
        <div class="dts-test-row-info">
            <span class="dts-test-row-vs-icon">VS</span>
            <div class="dts-test-row-text">
                <span class="dts-test-row-names">${namesLabel}</span>
                <span class="dts-test-row-meta"><span class="dts-badge ${badgeClass}">${badgeText}</span> · ${dateLabel}</span>
            </div>
        </div>
        <div class="dts-test-row-actions">
            ${startBtn}
            ${prepBtn}
            ${pendingBtns}
            <button type="button" class="dts-btn-quiet" data-action="edit" data-id="${test.id}">${DTS_ICONS.edit}${t('dts_edit_btn')}</button>
            <!-- 🌟 [جديد] "📜 المباريات السابقة" — يظهر دائماً بغض النظر عن حالة الاختبار
                 (مسودة/جاهز)، لأن المباريات المُلعَبة سابقاً محفوظة بشكل مستقل عن حالة بنك
                 الأسئلة نفسه وتبقى موجودة حتى لو عُدِّل الاختبار لاحقاً. لو لا توجد مباريات
                 منتهية بعد، النافذة نفسها تعرض رسالة "لا توجد مباريات" بدل إخفاء الزر شرطياً
                 (بيحتاج استعلام إضافي لكل صف بلا داعٍ حقيقي) -->
            <button type="button" class="dts-btn-quiet" data-action="history" data-id="${test.id}">${DTS_ICONS.history}${t('dts_history_btn')}</button>
            <button type="button" class="dts-btn-danger dts-btn-quiet" data-action="delete" data-id="${test.id}">${DTS_ICONS.delete}${t('dts_delete_btn')}</button>
        </div>
    </div>`;
}

// ===================== طبقة المحرر (إنشاء/تعديل اختبار) — معالج 3 خطوات =====================

// 🌟 [مُحدَّث] openRoundIndex (اختياري): فتح المحرر مباشرة على أسئلة جولة محددة (الخطوة 3) —
// من شارة "بانتظار التجهيز" أو من زر "جهّز الجولة الآن" في شاشة اللعب
async function openEditor(test, id, openRoundIndex = null) {
    currentTest = test;
    editingTestId = id;
    activeRoundIndex = 0;
    unlockedRoundCount = await computeUnlockedRoundCount(test, id);

    document.getElementById('dts-list-view').style.display = 'none';
    document.getElementById('dts-editor-view').style.display = 'block';

    populateCompetitorSelect(document.getElementById('dts-student-a'), currentTest.defaultStudentIdA);
    populateCompetitorSelect(document.getElementById('dts-student-b'), currentTest.defaultStudentIdB);

    if (Number.isInteger(openRoundIndex) && openRoundIndex >= 0 && openRoundIndex < unlockedRoundCount) {
        activeRoundIndex = openRoundIndex;
        goToStep(3);
    } else {
        goToStep(1);
    }
}

function closeEditor() {
    currentTest = null;
    editingTestId = null;
    currentStep = 1;
    activeRoundIndex = 0;
    document.getElementById('dts-editor-view').style.display = 'none';
    document.getElementById('dts-list-view').style.display = 'block';
}

// 🌟 [جديد] التنقل بين خطوات المعالج الثلاث — لا يحفظ أي شيء بنفسه، فقط يُظهر/يُخفي حاوية
// الخطوة المطلوبة، ويعيد رسم محتواها من currentTest المحفوظ بالذاكرة (نفس مصدر الحقيقة دائماً)
function goToStep(n) {
    currentStep = n;

    document.getElementById('dts-step-1').style.display = n === 1 ? 'block' : 'none';
    document.getElementById('dts-step-2').style.display = n === 2 ? 'block' : 'none';
    document.getElementById('dts-step-3').style.display = n === 3 ? 'block' : 'none';

    document.querySelectorAll('.dts-step-dot').forEach(dot => {
        dot.classList.toggle('dts-step-dot-active', parseInt(dot.dataset.step, 10) === n);
        dot.classList.toggle('dts-step-dot-done', parseInt(dot.dataset.step, 10) < n);
    });

    if (n === 1) renderRoundsRangeContainer();
    else if (n === 2) renderRoundPickGrid();
    else if (n === 3) renderActiveRoundContainer();
}

// ----- الخطوة 1: المتسابقان (مربوطة أصلاً بمستمعين ثابتين) + نطاق كل جولة -----

function buildRoundRangeCardHTML(round, roundIndex) {
    // 🌟 [جديد] جولة مقفلة: بطاقة باهتة بلا قوائم اختيار، مع سبب القفل
    if (roundIndex >= unlockedRoundCount) {
        return `
    <div class="dts-range-card dts-round-locked">
        <div class="dts-range-card-title">
            <span class="dts-round-badge">${roundIndex + 1}</span>
            <span>${t(ROUND_TITLE_KEYS[roundIndex])}</span>
        </div>
        <div class="dts-locked-note">${DTS_LOCK_ICON}${t('dts_round_locked_note').replace('{n}', roundIndex)}</div>
    </div>`;
    }
    return `
    <div class="dts-range-card">
        <div class="dts-range-card-title">
            <span class="dts-round-badge">${roundIndex + 1}</span>
            <span>${t(ROUND_TITLE_KEYS[roundIndex])}</span>
        </div>
        <!-- 🌟 [مُحدَّث] بطلب صريح من المعلم: "من سورة" و"إلى سورة" في سطرين واضحين تحت بعض
             (عنوان + قائمة لكل سطر) بدل صف واحد ملتف بشكل غير مرتب -->
        <div class="dts-round-range-fields">
            <label class="dts-range-field" for="dts-range-${roundIndex}-from">
                <span class="dts-range-field-label">${t('from_surah')}</span>
                <select id="dts-range-${roundIndex}-from" data-round="${roundIndex}" data-round-range="from" data-field="surah">${surahOptionsHTML(round.rangeFrom.surah)}</select>
            </label>
            <label class="dts-range-field" for="dts-range-${roundIndex}-to">
                <span class="dts-range-field-label">${t('to_surah')}</span>
                <select id="dts-range-${roundIndex}-to" data-round="${roundIndex}" data-round-range="to" data-field="surah">${surahOptionsHTML(round.rangeTo.surah)}</select>
            </label>
        </div>
    </div>`;
}

function renderRoundsRangeContainer() {
    const container = document.getElementById('dts-rounds-range-container');
    if (!container || !currentTest) return;
    // 🌟 [مُحدَّث] بطلب المعلم: الخطوة الأولى = المتسابقان + نطاق الجولات المفتوحة فقط. الجولات
    // المقفلة لا تظهر هنا (تظهر مقفلة في الخطوة 2 "اختيار الجولة" وحدها)
    container.innerHTML = currentTest.rounds
        .map((r, i) => (i < unlockedRoundCount ? buildRoundRangeCardHTML(r, i) : ''))
        .join('');
}

// ----- الخطوة 2: اختيار الجولة المراد تجهيزها -----

// 🌟 [جديد] الجولة المختارة افتراضياً عند دخول الخطوة 2: أول جولة مفتوحة بلا أسئلة أساسية بعد،
// وإلا الجولة المختارة سابقاً (لو ما زالت مفتوحة)، وإلا آخر جولة مفتوحة
function defaultPickedRoundIndex() {
    for (let i = 0; i < unlockedRoundCount; i++) {
        if (!(currentTest.rounds[i].mainQuestions || []).length) return i;
    }
    if (activeRoundIndex < unlockedRoundCount) return activeRoundIndex;
    return unlockedRoundCount - 1;
}

function updateRoundPickSelection() {
    document.querySelectorAll('#dts-roundpick-grid .dts-roundpick-btn:not(.dts-round-locked)').forEach(btn => {
        const selected = parseInt(btn.dataset.roundIndex, 10) === activeRoundIndex;
        btn.classList.toggle('dts-roundpick-selected', selected);
        btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
}

function renderRoundPickGrid() {
    const container = document.getElementById('dts-roundpick-grid');
    if (!container || !currentTest) return;
    activeRoundIndex = defaultPickedRoundIndex();

    container.innerHTML = currentTest.rounds.map((round, i) => {
        const mains = round.mainQuestions.length;
        const swaps = round.swapQuestions.length;
        const progress = t('dts_round_progress_label').replace('{main}', mains).replace('{swap}', swaps);
        const fromName = surahNameByNumber(round.rangeFrom.surah) || t('dts_range_not_set');
        const toName = surahNameByNumber(round.rangeTo.surah) || t('dts_range_not_set');
        if (i >= unlockedRoundCount) {
            return `
        <button type="button" class="dts-roundpick-btn dts-round-locked" disabled aria-disabled="true">
            <span class="dts-roundpick-badge">${i + 1}</span>
            <span class="dts-roundpick-title">${t(ROUND_TITLE_KEYS[i])}</span>
            <span class="dts-roundpick-progress">${DTS_LOCK_ICON}${t('dts_round_locked_note').replace('{n}', i)}</span>
        </button>`;
        }
        return `
        <button type="button" class="dts-roundpick-btn" data-round-index="${i}" aria-pressed="false">
            <span class="dts-roundpick-check"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg></span>
            <span class="dts-roundpick-badge">${i + 1}</span>
            <span class="dts-roundpick-title">${t(ROUND_TITLE_KEYS[i])}</span>
            <span class="dts-roundpick-range">
                <span class="dts-roundpick-range-line"><span class="dts-roundpick-range-label">${t('from_surah')}</span> ${fromName}</span>
                <span class="dts-roundpick-range-line"><span class="dts-roundpick-range-label">${t('to_surah')}</span> ${toName}</span>
            </span>
            <span class="dts-roundpick-progress">${progress}</span>
        </button>`;
    }).join('');

    // 🌟 [مُحدَّث] بطلب المعلم: الضغط على الجولة يختارها فقط (تتميّز بإطار ذهبي وعلامة ✓)،
    // والانتقال للأسئلة بزر «التالي: وضع الأسئلة» — تقدّم طبيعي خطوة بخطوة
    container.querySelectorAll('.dts-roundpick-btn:not(.dts-round-locked)').forEach(btn => {
        btn.addEventListener('click', () => {
            activeRoundIndex = parseInt(btn.dataset.roundIndex, 10);
            updateRoundPickSelection();
        });
    });
    updateRoundPickSelection();
}

// ----- الخطوة 3: محرر أسئلة الجولة المختارة فقط -----

function renderActiveRoundContainer() {
    const container = document.getElementById('dts-active-round-container');
    if (!container || !currentTest) return;
    container.innerHTML = buildRoundHTML(currentTest.rounds[activeRoundIndex], activeRoundIndex);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildRoundHTML(round, roundIndex) {
    // 🌟 الحاوية الخارجية ثابتة بمعرّف ثابت — buildRoundInnerHTML وحده يُعاد بناؤه عند أي
    // إضافة/حذف سؤال (renderSingleRound)، بدل إعادة بناء الشاشة كاملة في كل مرة
    return `<div class="dts-round-block" id="dts-round-block-${roundIndex}">${buildRoundInnerHTML(round, roundIndex)}</div>`;
}

function buildRoundInnerHTML(round, roundIndex) {
    const mains = round.mainQuestions || [];
    const swaps = round.swapQuestions || [];

    const mainRows = mains.map((q, i) =>
        buildQuestionRowHTML(q, i, roundIndex, 'main', `${t('dts_question_number_prefix')} ${i + 1}`)
    ).join('');

    const swapRows = swaps.map((q, i) =>
        buildQuestionRowHTML(q, i, roundIndex, 'swap', q.code)
    ).join('');

    // 🌟 [جديد] رأس الجولة: شارة رقم + عنوان + عدّاد "عدد الأسئلة المضافة الآن" — يعطي المعلم
    // صورة واضحة لموضع كل جولة بلمحة، مفيد خصوصاً بعد إلغاء شرط إكمال كل الأسئلة دفعة واحدة
    const progressLabel = t('dts_round_progress_label')
        .replace('{main}', mains.length)
        .replace('{swap}', swaps.length);

    // 🌟 [مُحدَّث] نطاق الجولة أصبح يُحرَّر فقط في الخطوة 1 من المعالج (اسم سورة كاملة، بلا
    // رقم آية) — هنا في الخطوة 3 يُعرَض ملخصه للقراءة فقط + رابط "✏️ تعديل" يرجع للخطوة 1،
    // بدل تكرار قوائم منسدلة قابلة للتعديل في مكانين مختلفين من نفس الاختبار
    const fromName = surahNameByNumber(round.rangeFrom.surah) || t('dts_range_not_set');
    const toName = surahNameByNumber(round.rangeTo.surah) || t('dts_range_not_set');

    return `
        <div class="dts-round-header">
            <span class="dts-round-badge">${roundIndex + 1}</span>
            <h3 class="dts-round-title">${t(ROUND_TITLE_KEYS[roundIndex])}</h3>
            <span class="dts-round-progress">${progressLabel}</span>
        </div>

        <div class="dts-range-summary">
            <span>${t('dts_round_range_summary_label')}</span>
            ${t('from_surah')} <strong>${escapeHtml(fromName)}</strong>
            <span class="dts-range-summary-sep">·</span>
            ${t('to_surah')} <strong>${escapeHtml(toName)}</strong>
            <button type="button" class="dts-edit-range-link" data-action="edit-range">${t('dts_edit_range_btn')}</button>
        </div>

        <h4 style="color:var(--dh-emerald-700); margin-bottom:8px;">${t('dts_main_questions_title')}</h4>
        <div class="dts-q-list">${mainRows}</div>
        ${buildEntryFormHTML(roundIndex, 'main')}

        <div class="dts-swap-section">
            <h4>${t('dts_swap_questions_title')}</h4>
            <p>${t('dts_swap_questions_desc')}</p>
            <div class="dts-q-list">${swapRows}</div>
            ${buildEntryFormHTML(roundIndex, 'swap')}
        </div>`;
}

// 🌟 [جديد] نموذج إضافة سؤال واحد بطلب صريح من المعلم: مربعا نص حر ("من" ثم "إلى" تحته
// مباشرة) يكتب فيهما المعلم وصف السؤال بيده بالكامل (مش اختيار من قوائم سور/آيات منسدلة)،
// وزر "إضافة سؤال" يضيفه لقائمة الأسئلة أسفله ويُفرّغ المربعين تلقائياً للسؤال التالي.
function buildEntryFormHTML(roundIndex, kind) {
    const addBtnClass = kind === 'swap' ? 'dts-add-swap-btn' : 'dts-add-q-btn';
    const addBtnLabel = kind === 'swap' ? t('dts_add_swap_btn') : t('dts_add_question_btn');
    return `
        <div class="dts-entry-form">
            <label>📖 ${t('dts_from_label')}</label>
            <textarea rows="2" id="dts-entry-from-${kind}-${roundIndex}" placeholder="${t('dts_from_placeholder')}"></textarea>
            <label>🏁 ${t('dts_to_label')}</label>
            <textarea rows="2" id="dts-entry-to-${kind}-${roundIndex}" placeholder="${t('dts_to_placeholder')}"></textarea>
            <button type="button" class="${addBtnClass}" data-round="${roundIndex}" data-add-kind="${kind}">${addBtnLabel}</button>
        </div>`;
}

// 🌟 [مُحدَّث] صف عرض سؤال مُضاف بالفعل — للعرض فقط (نص "من"/"إلى" كما كتبه المعلم بالضبط)،
// بلا أي قوائم قابلة للتعديل — التعديل يكون بالحذف وإعادة الإضافة من نموذج الإدخال أعلاه
function buildQuestionRowHTML(q, index, roundIndex, kind, labelText) {
    const rowClass = kind === 'swap' ? 'dts-q-row dts-swap-row' : 'dts-q-row';
    return `
    <div class="${rowClass}">
        <span class="dts-q-number">${labelText}</span>
        <span class="dts-q-display">${t('dts_from_label')}: ${escapeHtml(q.fromText)} — ${t('dts_to_label')}: ${escapeHtml(q.toText)}</span>
        <button type="button" class="dts-q-remove" data-round="${roundIndex}" data-kind="${kind}" data-index="${index}" aria-label="${t('dts_remove_btn')}" title="${t('dts_remove_btn')}">✖️</button>
    </div>`;
}

// 🌟 إعادة بناء جولة واحدة فقط (بعد إضافة/حذف سؤال فيها) بدل الشاشة كاملة
function renderSingleRound(roundIndex) {
    const block = document.getElementById(`dts-round-block-${roundIndex}`);
    if (!block || !currentTest) return;
    block.innerHTML = buildRoundInnerHTML(currentTest.rounds[roundIndex], roundIndex);
}

// ===================== حفظ الاختبار =====================

async function saveCurrentTest(status) {
    if (!currentTest) return;

    // 🌟 [مُحدَّث] لا يوجد أي شرط اكتمال لحفظ الاختبار كـ"جاهز" — المعلم صرَّح أنه قد يضيف
    // أسئلة الجولات على دفعات متباعدة (أسبوع أو شهر بين كل إضافة)، فالحفظ كـ"جاهز" متاح في
    // أي وقت بغض النظر عن عدد الأسئلة المكتملة حالياً في كل جولة، وبغض النظر عن الخطوة
    // الحالية في المعالج (أزرار الحفظ ظاهرة دائماً بصرف النظر عن الخطوة 1/2/3)
    currentTest.status = status;
    if (editingTestId) currentTest.id = editingTestId;

    const savedId = await AppState.dualTestsManager.saveTest(currentTest);
    editingTestId = savedId;

    closeEditor();
    await renderTestsList();
    showToastEncouragement('toast-encouragement', t(status === 'ready' ? 'dts_saved_ready_toast' : 'dts_saved_draft_toast'));
}

// ===================== نافذة بدء مواجهة جديدة =====================

async function openStartMatchModal(testId) {
    const test = await AppState.dualTestsManager.getTestById(testId);
    if (!test) return;

    activeMatchTestId = testId;
    populateCompetitorSelect(document.getElementById('dts-match-student-a'), test.defaultStudentIdA);
    populateCompetitorSelect(document.getElementById('dts-match-student-b'), test.defaultStudentIdB);

    openModal('dts-start-match-modal');
}

// ===================== 🌟 [جديد] نافذة سجل المباريات السابقة =====================
// راجع مستند المشروع "تصميم-تقرير-الاختبارات-الثنائية-المقترح.md" — أُضيفت هذه النافذة بعد أن
// لاحظ المعلم أن المسار الوحيد لفتح تقرير مواجهة كان زر "عرض التقرير" في شاشة النتيجة النهائية
// مباشرة بعد انتهاء المباراة، بلا أي طريقة للرجوع لمباراة قديمة لاحقاً رغم أن بياناتها تبقى
// محفوظة فعلياً في dual_matches. هنا يفتح المعلم سجل كل مباريات اختبار معيّن ويختار أي واحدة
// منها لفتح تقريرها الكامل وطباعته/تصديره وقتما يحب.
//
// ⚠️ الافتراض المتّبع: تُعرَض فقط المباريات المنتهية فعلياً (match.status === 'completed').
// مباراة لسه "قيد التقدّم" ليس لها نتيجة نهائية محسومة (match.result لا يزال null) ولا أوسمة
// منحت بعد، فعرضها هنا كصف قابل لفتح "تقرير" قبل انتهائها الفعلي كان سيكون تقريراً غير مكتمل،
// يخالف فلسفة "الصدق" نفسها التي بُني عليها التقرير أصلاً.

async function openMatchesHistoryModal(testId) {
    const test = await AppState.dualTestsManager.getTestById(testId);
    if (!test) return;
    historyTestCache = test;

    const allMatches = await AppState.dualTestsManager.getMatchesByTestId(testId);
    const finishedMatches = allMatches
        .filter(m => m.status === 'completed')
        .sort((a, b) => new Date(b.finishedAt || 0) - new Date(a.finishedAt || 0));

    const container = document.getElementById('dts-history-list');
    if (container) {
        container.innerHTML = finishedMatches.length
            ? finishedMatches.map(buildHistoryRowHTML).join('')
            : `<div class="dts-empty-msg">${t('dts_history_empty')}</div>`;
    }

    openModal('dts-matches-history-modal');
}

function buildHistoryRowHTML(match) {
    const dateLabel = match.finishedAt
        ? new Date(match.finishedAt).toLocaleDateString(AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US')
        : '';
    // 🌟 نفس صياغة شريط الفوز/التعادل المستخدمة بالضبط في شاشة اللعب وفي رأس التقرير نفسه
    // (dtp_final_tie_label / dtp_final_winner_label) — استمرارية بصرية ولفظية كاملة
    const resultLabel = match.result === 'tie'
        ? t('dtp_final_tie_label')
        : t('dtp_final_winner_label').replace('{name}', match.result === 'A_win' ? match.studentNameA : match.studentNameB);

    return `
    <div class="dts-history-row">
        <div class="dts-history-row-info">
            <span class="dts-history-row-names">${escapeHtml(match.studentNameA)} 🆚 ${escapeHtml(match.studentNameB)}</span>
            <span class="dts-history-row-meta">${resultLabel} · ${dateLabel}</span>
        </div>
        <button type="button" class="btn" data-history-match-id="${match.id}">${t('dtp_view_report_btn')}</button>
    </div>`;
}

// ===================== 🌟 [جديد] نافذة "المواجهات المعلقة" (استكمال مواجهة) =====================
// بطلب صريح من المعلم: المواجهة لم تعد تُلعَب بجولاتها الثلاث في جلسة واحدة. تنتهي الجولة
// فتنتهي الجلسة (راجع finishRound في dual-test-play.js)، وتبقى المواجهة محفوظة "معلّقة"
// بنفس الطالبَين ونفس النتائج، ويُستكمَل منها هنا لاحقاً من الجولة التالية مباشرة بلا إعادة
// أي شيء من الصفر.
//
// ⚠️ افتراض صريح: "المواجهة المعلقة" = أي مواجهة في dual_matches حالتها ليست 'completed'
// (أي 'in_progress')، سواء توقفت بنهاية جولة كاملة أو في منتصف جولة (خروج/إغلاق مفاجئ —
// تقدّمها الجزئي محفوظ في match.inProgressRound ويُستأنَف تلقائياً). لا يوجد حالياً "انتهاء
// صلاحية" زمني لأي مواجهة معلقة: تبقى معروضة هنا حتى تكتمل أو يحذفها المعلم يدوياً.

// 🌟 [مُحدَّث] تفتح الآن مُصفّاة على زوج طلاب محدَّد (pairKey + اسماهما، ممرَّرَين من الزر
// نفسه في صف الاختبار) بدل عرض كل المواجهات المعلقة على الاختبار مجمّعة معاً — راجع تعليق
// pendingPairKeyCache أعلى الملف لسبب هذا التغيير.
async function openPendingMatchesModal(testId, pairKey = null, nameA = '', nameB = '') {
    pendingTestIdCache = testId;
    pendingPairKeyCache = pairKey;
    pendingPairNamesCache = pairKey ? { a: nameA, b: nameB } : null;
    await renderPendingMatchesList();
    updatePendingModalPairLabel();
    openModal('dts-pending-matches-modal');
}

// 🌟 [جديد] يعرض/يخفي سطر "مواجهات فلان 🆚 علان فقط" أعلى نافذة المواجهات المعلقة، حتى يكون
// واضحاً للمعلم أن القائمة مُصفّاة على زوج معيّن وليست كل مواجهات الاختبار
function updatePendingModalPairLabel() {
    const el = document.getElementById('dts-pending-pair-label');
    if (!el) return;
    if (pendingPairNamesCache) {
        el.textContent = t('dts_pending_pair_label')
            .replace('{a}', pendingPairNamesCache.a).replace('{b}', pendingPairNamesCache.b);
        el.style.display = '';
    } else {
        el.style.display = 'none';
    }
}

async function renderPendingMatchesList() {
    const container = document.getElementById('dts-pending-list');
    if (!container || !pendingTestIdCache) return;

    const allMatches = await AppState.dualTestsManager.getMatchesByTestId(pendingTestIdCache);
    const pending = allMatches
        .filter(m => m.status !== 'completed')
        // 🌟 [جديد] تصفية على زوج الطلاب المحدَّد (pendingPairKeyCache) لو النافذة فُتحت من
        // زر زوج معيّن — نفس مفتاح المطابقة [studentIdA, studentIdB] مُرتَّبين المستخدم في
        // فحص "منع البدء من الصفر بالغلط"
        .filter(m => !pendingPairKeyCache || [String(m.studentIdA), String(m.studentIdB)].sort().join('|') === pendingPairKeyCache)
        .sort((a, b) => new Date(b.startedAt || 0) - new Date(a.startedAt || 0));

    container.innerHTML = pending.length
        ? pending.map(buildPendingRowHTML).join('')
        : `<div class="dts-empty-msg">${t('dts_pending_empty')}</div>`;
}

function buildPendingRowHTML(match) {
    const roundsDone = Array.isArray(match.rounds) ? match.rounds.length : 0;
    // الجولة التي سيُستكمَل منها = currentRoundIndex المحفوظ (يُثبَّت بنهاية كل جولة في
    // finishRound)، ومع ذلك نحسب احتياطاً من عدد الجولات المنتهية لأي مواجهة قديمة محفوظة
    // قبل هذا التحديث بلا currentRoundIndex محدَّث
    const nextRound = Math.min(3, (Number.isInteger(match.currentRoundIndex) ? match.currentRoundIndex : roundsDone) + 1);
    const series = computeSeriesResult(match.rounds || []);
    const dateLabel = match.startedAt
        ? new Date(match.startedAt).toLocaleDateString(AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US')
        : '';

    return `
    <div class="dts-history-row dts-pending-row">
        <div class="dts-history-row-info">
            <span class="dts-history-row-names">${escapeHtml(match.studentNameA)} 🆚 ${escapeHtml(match.studentNameB)}</span>
            <span class="dts-history-row-meta">
                <span class="dts-badge dts-badge-pending">${t('dts_pending_next_round').replace('{n}', nextRound)}</span>
                · ${t('dts_pending_rounds_tally').replace('{a}', series.roundsWonA).replace('{b}', series.roundsWonB)}
                · ${dateLabel}
            </span>
        </div>
        <div class="dts-pending-row-actions">
            <button type="button" class="btn" data-pending-resume-id="${match.id}">${t('dts_pending_resume_btn')}</button>
            <button type="button" class="btn btn-outline dts-btn-danger" data-pending-delete-id="${match.id}">${t('dts_pending_delete_btn')}</button>
        </div>
    </div>`;
}

// 🌟 [جديد] فتح شاشة اللعب لمواجهة موجودة (جديدة كانت أو معلّقة) — استُخرجت من معالج زر
// "🚀 ابدأ" حتى يستخدمها الاستكمال أيضاً بنفس الطريقة بالضبط بلا تكرار الكود
// 🌟 [مُصدَّرة] بعد إضافة تذكير "مواجهات تنتظر الاستكمال" على الشاشة الرئيسية — النقر على أي
// صف في التذكير يستدعي هذه الدالة مباشرة عبر استيراد ديناميكي لهذا الملف (راجع
// renderPendingDualMatchesReminder في components/homeQuickview.js)، بلا أي تكرار للمنطق
export function openDualTestPlayScreen(matchId) {
    // 🌟 تمرير معرّف المواجهة لشاشة اللعب بنفس نمط homeworkPrepPrefillStudentName
    // الموجود أصلاً — يُقرأ مرة واحدة هناك ثم يُفرَّغ فوراً
    AppState.dualTestPlayMatchId = matchId;

    import('./dual-test-play.js').then(module => {
        loadScreen({
            templateUrl: 'dualtests/dual-test-play.html',
            initFunction: () => module.initDualTestPlay()
        });
    }).catch(err => {
        console.error("تعذر تحميل شاشة اللعب الفعلية:", err);
        showToastEncouragement('toast-encouragement', t('dts_play_screen_soon'));
    });
}

// ===================== ربط كل مستمعي الأحداث (مرة واحدة عند فتح الشاشة) =====================

function wireStaticListeners() {
    document.getElementById('dts-back-btn')?.addEventListener('click', () => {
        loadSplashScreen();
    });

    document.getElementById('dts-new-test-btn')?.addEventListener('click', () => {
        openEditor(createEmptyDualTest(), null);
    });

    document.getElementById('dts-cancel-edit-btn')?.addEventListener('click', closeEditor);
    document.getElementById('dts-save-draft-btn')?.addEventListener('click', () => saveCurrentTest('draft'));
    document.getElementById('dts-save-ready-btn')?.addEventListener('click', () => saveCurrentTest('ready'));

    document.getElementById('dts-student-a')?.addEventListener('change', (e) => {
        if (!currentTest) return;
        const val = e.target.value;
        currentTest.defaultStudentIdA = val || null;
        currentTest.defaultStudentNameA = val ? (allStudents.find(s => String(s.id) === val)?.name || '') : '';
    });
    document.getElementById('dts-student-b')?.addEventListener('change', (e) => {
        if (!currentTest) return;
        const val = e.target.value;
        currentTest.defaultStudentIdB = val || null;
        currentTest.defaultStudentNameB = val ? (allStudents.find(s => String(s.id) === val)?.name || '') : '';
    });

    // ----- قائمة الاختبارات المحفوظة: تفويض حدث واحد لكل الأزرار (تعديل/بدء/حذف) -----
    document.getElementById('dts-tests-container')?.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const id = parseInt(btn.dataset.id, 10);
        const action = btn.dataset.action;

        if (action === 'edit') {
            const test = await AppState.dualTestsManager.getTestById(id);
            if (test) openEditor(test, id);
        } else if (action === 'delete') {
            if (confirm(t('dts_delete_confirm'))) {
                await AppState.dualTestsManager.deleteTest(id);
                await renderTestsList();
            }
        } else if (action === 'prep') {
            const test = await AppState.dualTestsManager.getTestById(id);
            if (test) await openEditor(test, id, parseInt(btn.dataset.round, 10));
        } else if (action === 'start') {
            openStartMatchModal(id);
        } else if (action === 'history') {
            openMatchesHistoryModal(id);
        } else if (action === 'pending') {
            // 🌟 [مُحدَّث] استكمال مواجهة معلّقة (توقفت بنهاية جولة سابقة) — كل زر الآن خاص
            // بزوج طلاب محدَّد (data-pair + data-name-a/b مأخوذة من الزر نفسه)، فتُفتَح
            // النافذة مُصفّاة على هذا الزوج فقط. راجع openPendingMatchesModal أعلاه
            openPendingMatchesModal(id, btn.dataset.pair || null, btn.dataset.nameA || '', btn.dataset.nameB || '');
        }
    });

    // ----- 🌟 [جديد] نافذة "المواجهات المعلقة": إغلاق + استكمال/حذف مواجهة -----
    document.getElementById('dts-pending-close-btn')?.addEventListener('click', () => {
        closeModal('dts-pending-matches-modal');
        pendingPairKeyCache = null;
        pendingPairNamesCache = null;
    });

    document.getElementById('dts-pending-list')?.addEventListener('click', async (e) => {
        const resumeBtn = e.target.closest('button[data-pending-resume-id]');
        if (resumeBtn) {
            const matchId = parseInt(resumeBtn.dataset.pendingResumeId, 10);
            const match = await AppState.dualTestsManager.getMatchById(matchId);
            if (!match) return;
            closeModal('dts-pending-matches-modal');
            // شاشة اللعب نفسها تقرأ match.currentRoundIndex وتبدأ من الجولة الصحيحة تلقائياً
            // (راجع initDualTestPlay/startRoundFlow في dual-test-play.js) — لا حاجة لأي
            // معامل إضافي هنا
            openDualTestPlayScreen(matchId);
            return;
        }

        const deleteBtn = e.target.closest('button[data-pending-delete-id]');
        if (deleteBtn) {
            const matchId = parseInt(deleteBtn.dataset.pendingDeleteId, 10);
            if (!confirm(t('dts_pending_delete_confirm'))) return;
            await AppState.dualTestsManager.deleteMatch(matchId);
            await renderPendingMatchesList(); // إعادة رسم النافذة بلا إغلاقها
            await renderTestsList();          // تحديث عدّاد "مواجهات معلقة" على صف الاختبار
        }
    });

    // ----- 🌟 [جديد] نافذة "المباريات السابقة": إغلاق + فتح تقرير مباراة مختارة -----
    document.getElementById('dts-history-close-btn')?.addEventListener('click', () => {
        closeModal('dts-matches-history-modal');
    });

    document.getElementById('dts-history-list')?.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-history-match-id]');
        if (!btn || !historyTestCache) return;
        const matchId = parseInt(btn.dataset.historyMatchId, 10);
        const match = await AppState.dualTestsManager.getMatchById(matchId);
        if (!match) return;
        closeModal('dts-matches-history-modal');
        // 🌟 نفس نقطة الدخول بالضبط المستخدمة في dual-test-play.js — تستبدل محتوى #app-root
        // كاملاً بشاشة التقرير، فلا حاجة لأي تنقّل إضافي عبر loadScreen هنا
        openDualTestReportScreen(match, historyTestCache);
    });

    // ----- المعالج: التنقل بين الخطوات الثلاث -----
    document.getElementById('dts-step1-next-btn')?.addEventListener('click', () => goToStep(2));
    document.getElementById('dts-step2-back-btn')?.addEventListener('click', () => goToStep(1));
    document.getElementById('dts-step2-next-btn')?.addEventListener('click', () => {
        if (activeRoundIndex >= 0 && activeRoundIndex < unlockedRoundCount) goToStep(3);
    });
    document.getElementById('dts-step3-back-btn')?.addEventListener('click', () => goToStep(2));

    // ----- الخطوة 1: قوائم نطاق كل جولة (اسم سورة فقط) -----
    document.getElementById('dts-rounds-range-container')?.addEventListener('change', (e) => {
        const sel = e.target;
        if (sel.tagName !== 'SELECT' || !currentTest || !sel.dataset.roundRange) return;
        const roundIdx = parseInt(sel.dataset.round, 10);
        const val = sel.value === '' ? null : parseInt(sel.value, 10);
        const round = currentTest.rounds[roundIdx];
        if (!round) return;

        const targetObj = sel.dataset.roundRange === 'from' ? round.rangeFrom : round.rangeTo;
        targetObj.surah = val;
    });

    // ----- الخطوة 3: محرر أسئلة الجولة المختارة (إضافة/حذف سؤال + رابط تعديل النطاق) -----
    const activeRoundContainer = document.getElementById('dts-active-round-container');

    activeRoundContainer?.addEventListener('click', (e) => {
        if (!currentTest) return;

        // 🌟 [جديد] رابط "✏️ تعديل" بجانب ملخص نطاق الجولة يرجع مباشرة للخطوة 1 (مصدر
        // التعديل الوحيد للنطاق الآن)، مع الحفاظ على أي أسئلة أُضيفت بالفعل في هذه الجولة
        if (e.target.closest('[data-action="edit-range"]')) {
            goToStep(1);
            return;
        }

        // 🌟 إضافة سؤال جديد تُقرأ من مربعي النص الحر ("من"/"إلى") — بطلب صريح من المعلم أنه
        // يكتب نص السؤال بيده بالكامل
        const addBtn = e.target.closest('button[data-add-kind]');
        if (addBtn) {
            const roundIdx = parseInt(addBtn.dataset.round, 10);
            const round = currentTest.rounds[roundIdx];
            if (!round) return;
            const kind = addBtn.dataset.addKind;
            const fromEl = document.getElementById(`dts-entry-from-${kind}-${roundIdx}`);
            const toEl = document.getElementById(`dts-entry-to-${kind}-${roundIdx}`);
            const fromText = (fromEl?.value || '').trim();
            const toText = (toEl?.value || '').trim();
            if (!fromText || !toText) {
                alert(t('dts_fill_both_fields_alert'));
                return;
            }

            if (kind === 'main') {
                round.mainQuestions.push({ fromText, toText, points: 1, number: round.mainQuestions.length + 1 });
            } else {
                round.swapQuestions.push({ fromText, toText, points: 1, code: generateSwapCode(round.swapQuestions) });
            }
            renderSingleRound(roundIdx);
            return;
        }

        const removeBtn = e.target.closest('.dts-q-remove');
        if (removeBtn) {
            const roundIdx = parseInt(removeBtn.dataset.round, 10);
            const round = currentTest.rounds[roundIdx];
            if (!round) return;
            const qIdx = parseInt(removeBtn.dataset.index, 10);
            if (removeBtn.dataset.kind === 'main') {
                round.mainQuestions.splice(qIdx, 1);
                // 🌟 إعادة ترقيم الأسئلة الأساسية بعد الحذف حتى تبقى الأرقام متتالية بلا فجوات
                round.mainQuestions.forEach((q, i) => { q.number = i + 1; });
            } else {
                round.swapQuestions.splice(qIdx, 1);
            }
            renderSingleRound(roundIdx);
        }
    });

    // ----- نافذة بدء مواجهة جديدة -----
    document.getElementById('dts-match-cancel-btn')?.addEventListener('click', () => {
        closeModal('dts-start-match-modal');
    });

    document.getElementById('dts-match-confirm-btn')?.addEventListener('click', async () => {
        const aSel = document.getElementById('dts-match-student-a');
        const bSel = document.getElementById('dts-match-student-b');
        if (!aSel.value || !bSel.value) { alert(t('dts_choose_both_students_alert')); return; }
        if (aSel.value === bSel.value) { alert(t('dts_same_student_alert')); return; }
        if (!activeMatchTestId) return;

        const studentA = allStudents.find(s => String(s.id) === aSel.value);
        const studentB = allStudents.find(s => String(s.id) === bSel.value);
        if (!studentA || !studentB) return;

        // 🌟 [جديد] منع البدء من الصفر بالغلط: لو فيه مواجهة معلّقة بالفعل بين نفس الطالبَين
        // في نفس الاختبار (بصرف النظر عن ترتيبهما أول/ثاني)، نسأل المعلم صراحةً قبل إنشاء
        // مواجهة جديدة. هذا هو الخطأ المتوقّع بعد تحويل المواجهة إلى "جولة واحدة لكل جلسة":
        // يفتح المعلم "بدء مواجهة" بالعادة القديمة فيضيع تقدّم الجولة الأولى بلا قصد.
        try {
            const existing = (await AppState.dualTestsManager.getMatchesByTestId(activeMatchTestId))
                .filter(m => m.status !== 'completed')
                .filter(m => {
                    const pair = [String(m.studentIdA), String(m.studentIdB)].sort().join('|');
                    const chosen = [String(studentA.id), String(studentB.id)].sort().join('|');
                    return pair === chosen;
                })
                .sort((x, y) => new Date(y.startedAt || 0) - new Date(x.startedAt || 0))[0];

            if (existing) {
                const roundsDone = Array.isArray(existing.rounds) ? existing.rounds.length : 0;
                const nextRound = Math.min(3, (Number.isInteger(existing.currentRoundIndex) ? existing.currentRoundIndex : roundsDone) + 1);
                // موافق = استكمال المعلّقة، إلغاء = بدء مواجهة جديدة من الصفر (المعلّقة تبقى
                // كما هي بلا حذف). النص نفسه يشرح الخيارين حرفياً حتى لا يلتبس معنى "إلغاء"
                if (confirm(t('dts_pending_conflict_confirm').replace('{n}', nextRound))) {
                    closeModal('dts-start-match-modal');
                    openDualTestPlayScreen(existing.id);
                    return;
                }
            }
        } catch (e) { /* best-effort — أي فشل في الفحص لا يمنع بدء مواجهة جديدة */ }

        // 🌟 [جديد] بناء سجل "مواجهة" جديد مرتبط بالاختبار المحفوظ (testId) — يسمح
        // بإعادة استخدام نفس بنك الأسئلة مع أي زوج طلاب لاحقاً بلا أي تكرار لكتابة الأسئلة
        const newMatch = {
            testId: activeMatchTestId,
            studentIdA: studentA.id, studentNameA: studentA.name,
            studentIdB: studentB.id, studentNameB: studentB.name,
            currentRoundIndex: 0,
            rounds: [],
            roundsWonA: 0, roundsWonB: 0, roundsTied: 0,
            totalPointsA: 0, totalPointsB: 0,
            result: null,
            lastRoundStarter: null,
            status: 'in_progress',
            startedAt: new Date().toISOString(),
            finishedAt: null
        };

        const matchId = await AppState.dualTestsManager.saveMatch(newMatch);
        closeModal('dts-start-match-modal');

        // 🌟 [مُحدَّث] فتح شاشة اللعب عبر الدالة المشتركة openDualTestPlayScreen (نفسها
        // المستخدَمة لاستكمال مواجهة معلّقة) بدل تكرار نفس الكود هنا
        openDualTestPlayScreen(matchId);
    });
}
