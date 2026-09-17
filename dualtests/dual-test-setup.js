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

import { AppState, loadSplashScreen, t } from '../core/app.js';
import { loadScreen } from '../core/navigation.js';
import { showToastEncouragement, openModal, closeModal } from '../components/ui.js';
import { createEmptyDualTest } from '../database/dualTestsDB.js';
import { generateSwapCode } from '../engine/dualTestEngine.js';

// حالة الشاشة أثناء العمل عليها (تُعاد تهيئتها كل مرة تُفتَح فيها الشاشة عبر initDualTestSetup)
let currentTest = null;      // الاختبار قيد التحرير حالياً (null = طبقة القائمة معروضة)
let editingTestId = null;    // null = اختبار جديد لم يُحفَظ بعد
let allStudents = [];        // كل الطلاب غير المخفيين، لقوائم اختيار المتسابقَين
// 🌟 [جديد] الاختبار المفتوح حالياً في نافذة "بدء مواجهة جديدة" — يُستخدم عند تأكيد
// النافذة لمعرفة أي اختبار محفوظ نبني منه المواجهة الجديدة
let activeMatchTestId = null;

// 🌟 [جديد] حالة معالج خطوات محرر الاختبار (1/2/3) + الجولة المختارة حالياً في الخطوة 3
let currentStep = 1;
let activeRoundIndex = 0;

const ROUND_TITLE_KEYS = ['dts_round1_title', 'dts_round2_title', 'dts_round3_title'];

// ===================== نقطة الدخول =====================

export async function initDualTestSetup() {
    currentTest = null;
    editingTestId = null;

    const students = await AppState.studentManager.getAllStudents();
    allStudents = students.filter(s => !s.isHidden);

    await renderTestsList();
    wireStaticListeners();
}

// ===================== أدوات بناء قوائم السور المنسدلة =====================
// 🌟 نفس فكرة تعبئة القوائم المستخدمة فعلاً في settings/dashboard.js (surah-select) لكن
// كدالة قابلة لإعادة الاستخدام هنا لكل صفوف نطاق الجولات الثلاث

function surahOptionsHTML(selectedSurah) {
    let html = `<option value="" ${!selectedSurah ? 'selected' : ''}>--</option>`;
    (AppState.surahsData || []).forEach(s => {
        html += `<option value="${s.number}" ${selectedSurah === s.number ? 'selected' : ''}>${s.number}. ${s.name}</option>`;
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
        html += `<option value="${s.id}" ${String(s.id) === String(selectedId) ? 'selected' : ''}>${s.name}</option>`;
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

    tests.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    container.innerHTML = tests.map(buildTestRowHTML).join('');
}

function buildTestRowHTML(test) {
    const namesLabel = `${test.defaultStudentNameA || '—'} 🆚 ${test.defaultStudentNameB || '—'}`;
    const isReady = test.status === 'ready';
    const badgeClass = isReady ? 'dts-badge-ready' : 'dts-badge-draft';
    const badgeText = isReady ? t('dts_status_ready') : t('dts_status_draft');
    const dateLabel = test.updatedAt
        ? new Date(test.updatedAt).toLocaleDateString(AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US')
        : '';
    const startBtn = isReady
        ? `<button type="button" data-action="start" data-id="${test.id}">${t('dts_start_match_btn')}</button>`
        : '';

    return `
    <div class="dts-test-row">
        <div class="dts-test-row-info">
            <span class="dts-test-row-vs-icon">🆚</span>
            <div class="dts-test-row-text">
                <span class="dts-test-row-names">${namesLabel}</span>
                <span class="dts-test-row-meta"><span class="dts-badge ${badgeClass}">${badgeText}</span> · ${dateLabel}</span>
            </div>
        </div>
        <div class="dts-test-row-actions">
            ${startBtn}
            <button type="button" data-action="edit" data-id="${test.id}">${t('dts_edit_btn')}</button>
            <button type="button" class="dts-btn-danger" data-action="delete" data-id="${test.id}">${t('dts_delete_btn')}</button>
        </div>
    </div>`;
}

// ===================== طبقة المحرر (إنشاء/تعديل اختبار) — معالج 3 خطوات =====================

function openEditor(test, id) {
    currentTest = test;
    editingTestId = id;
    activeRoundIndex = 0;

    document.getElementById('dts-list-view').style.display = 'none';
    document.getElementById('dts-editor-view').style.display = 'block';

    populateCompetitorSelect(document.getElementById('dts-student-a'), currentTest.defaultStudentIdA);
    populateCompetitorSelect(document.getElementById('dts-student-b'), currentTest.defaultStudentIdB);

    goToStep(1);
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
    return `
    <div class="dts-range-card">
        <div class="dts-range-card-title">
            <span class="dts-round-badge">${roundIndex + 1}</span>
            <span>${t(ROUND_TITLE_KEYS[roundIndex])}</span>
        </div>
        <div class="dts-round-range-row">
            <span>${t('from_surah')}</span>
            <select data-round="${roundIndex}" data-round-range="from" data-field="surah">${surahOptionsHTML(round.rangeFrom.surah)}</select>
            <span>${t('to_surah')}</span>
            <select data-round="${roundIndex}" data-round-range="to" data-field="surah">${surahOptionsHTML(round.rangeTo.surah)}</select>
        </div>
    </div>`;
}

function renderRoundsRangeContainer() {
    const container = document.getElementById('dts-rounds-range-container');
    if (!container || !currentTest) return;
    container.innerHTML = currentTest.rounds.map((r, i) => buildRoundRangeCardHTML(r, i)).join('');
}

// ----- الخطوة 2: اختيار الجولة المراد تجهيزها -----

function renderRoundPickGrid() {
    const container = document.getElementById('dts-roundpick-grid');
    if (!container || !currentTest) return;

    container.innerHTML = currentTest.rounds.map((round, i) => {
        const mains = round.mainQuestions.length;
        const swaps = round.swapQuestions.length;
        const progress = t('dts_round_progress_label').replace('{main}', mains).replace('{swap}', swaps);
        const fromName = surahNameByNumber(round.rangeFrom.surah) || t('dts_range_not_set');
        const toName = surahNameByNumber(round.rangeTo.surah) || t('dts_range_not_set');
        return `
        <button type="button" class="dts-roundpick-btn" data-round-index="${i}">
            <span class="dts-roundpick-badge">${i + 1}</span>
            <span class="dts-roundpick-title">${t(ROUND_TITLE_KEYS[i])}</span>
            <span class="dts-roundpick-range">${fromName} — ${toName}</span>
            <span class="dts-roundpick-progress">${progress}</span>
        </button>`;
    }).join('');

    container.querySelectorAll('.dts-roundpick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            activeRoundIndex = parseInt(btn.dataset.roundIndex, 10);
            goToStep(3);
        });
    });
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
            <strong>${escapeHtml(fromName)}</strong> — <strong>${escapeHtml(toName)}</strong>
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
        } else if (action === 'start') {
            openStartMatchModal(id);
        }
    });

    // ----- المعالج: التنقل بين الخطوات الثلاث -----
    document.getElementById('dts-step1-next-btn')?.addEventListener('click', () => goToStep(2));
    document.getElementById('dts-step2-back-btn')?.addEventListener('click', () => goToStep(1));
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
    });
}
