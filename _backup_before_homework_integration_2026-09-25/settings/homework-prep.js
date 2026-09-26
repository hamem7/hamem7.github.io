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
import { getSubmissionsFromCloud, getSubmissionsNeedingGrading, saveHomeworkToCloud, updateSubmissionInCloud, queuePendingHomeworkSync, flushPendingHomeworkSync, isHomeworkPendingSync, getPendingSubmissionsCountForHomework } from '../core/firebase.js';
// 🌟🌟 [جديد — المرحلة 2] دالة واحدة مشتركة لتحديد "هل هذا التسليم بحاجة تصحيح يدوي؟" بدل تكرار
// نفس المقارنة هنا وفي core/firebase.js — راجع core/submissionStatus.js للشرح الكامل.
// 🌟🌟 [جديد — المرحلة 3] syncSubmissionScoreToLocalHistory: تُبقي نسخة history_<studentId>
// المحلية متزامنة مع الدرجة النهائية بعد التصحيح اليدوي — راجع الشرح الكامل بجانبها في
// core/submissionStatus.js.
import { submissionNeedsGrading, syncSubmissionScoreToLocalHistory } from '../core/submissionStatus.js';
import { t } from '../core/i18n.js';
// 🌟🌟 [جديد] ترميز بيانات الواجب داخل رابط المشاركة نفسه — بدل ما يحمل الرابط معرّف الواجب
// فقط ويحتاج بحث محلي/سحابي عند فتحه، بيحمل الواجب كامل، فيفتح فوراً بلا أي اتصال إطلاقاً
// (راجع الشرح الكامل بجانب encodeHomeworkForLink في database/homeworkDB.js)
import { encodeHomeworkForLink } from '../database/homeworkDB.js';
// 🌟 [جديد] نظام "تلميحات الأقسام عند أول دخول" — راجع components/sectionHint.js
import { showSectionHintOnce } from '../components/sectionHint.js';

let currentGeneratedQuestions = [];
let hwEngine = null;

// 🌟🌟 [جديد] آخر واجب فشل رفعه للسحابة في نافذة المشاركة الحالية — تحتفظ به saveHomeworkToDB
// ليستخدمه retryHomeworkCloudSync عند ضغط المعلم على زر "إعادة المحاولة الآن" (راجع الدالتين
// أسفل هذا الملف)
let lastFailedHomeworkForRetry = null;

// 🌟🌟 [جديد] بناء رابط المشاركة: نفضّل دائماً الرابط "المكتفي ذاتياً" (يحمل الواجب كامل، بلا
// أي حاجة لاتصال عند فتحه — راجع database/homeworkDB.js). لكن لو الواجب كبير جداً (عدد أسئلة
// كثير + آيات طويلة)، الرابط الناتج ممكن يطول جداً (آلاف الأحرف)، وبعض الخوادم/الوسطاء
// (proxies) بترفض الروابط الطويلة جداً. لتفادي ده: لو تجاوز الرابط حد معقول (6000 حرف تقريباً)
// نرجع تلقائياً للرابط القديم بالمعرّف البسيط فقط (?hw=HW_xxx)، اللي يعتمد على البحث
// المحلي/السحابي كخط رجوع (زي ما كان قبل هذا التحديث تمامًا، ولسه شغّال بفضل إصلاحات
// core/firebase.js الأخيرة). كده نضمن أفضل حل ممكن للحالة الشائعة (واجب عادي) مع خط رجوع آمن
// للحالة النادرة (واجب ضخم جداً).
const SELF_CONTAINED_LINK_MAX_LENGTH = 6000;

function buildHomeworkShareLink(baseUrl, hwData) {
    const encodedLink = `${baseUrl}?hw=${encodeHomeworkForLink(hwData)}`;
    if (encodedLink.length <= SELF_CONTAINED_LINK_MAX_LENGTH) {
        return encodedLink;
    }
    console.warn(`رابط الواجب المكتفي ذاتياً طويل جداً (${encodedLink.length} حرف) — تم الرجوع للرابط بالمعرّف البسيط بدلاً منه (يعتمد على البحث المحلي/السحابي عند فتحه).`);
    return `${baseUrl}?hw=${hwData.id}`;
}

let currentSubmissionsList = [];
let currentHwIdForGrading = null;

// 🌟 معرّفات الواجبات (hwId) التي بها تسليم واحد على الأقل ينتظر تصحيح المعلم اليدوي — تُملأ من
// loadNeedsGradingStat وتُستخدم لوضع علامة تنبيه ⚠️ بجانب الواجب المتأثر في سجل الواجبات
let pendingGradingHwIds = new Set();

export async function initHomeworkPrep() {
    // 🌟 [جديد] تلميح ما قبل إعداد أول واجب — راجع مستند "تصميم نظام تلميحات الأقسام عند
    // أول دخول المقترح"
    showSectionHintOnce('homework_prep', {
        type: 'tip',
        titleKey: 'hint_homework_title',
        bodyKey: 'hint_homework_body'
    });

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

async function populateTargetStudents() {
    const select = document.getElementById('hw-target-student');
    if (!select) return;

    select.innerHTML = `<option value="">${t('hw_general_link')}</option>`;

    const students = await AppState.studentManager.getAllStudents();
    students.filter(s => !s.isHidden).forEach(s => {
        select.appendChild(new Option(s.name, s.name));
    });

    // 🌟 [جديد] تجهيل مسبق للطالب المستهدف عند القدوم من نقرة "مستحق اليوم" في
    // بطاقة نظرة سريعة بالشاشة الرئيسية — تُقرأ القيمة مرة واحدة فقط ثم تُفرَّغ
    // فوراً حتى لا تؤثر على أي فتح عادي لاحق لهذه الشاشة
    if (AppState.homeworkPrepPrefillStudentName) {
        select.value = AppState.homeworkPrepPrefillStudentName;
        AppState.homeworkPrepPrefillStudentName = null;
    }

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
        for (let num = minNum; num <= maxNum; num++) {
            const surah = AppState.surahsData.find(s => s.number === num);
            if (!surah) continue;
            suggestions.push({
                label: `${num}. ${surah.name}`,
                apply: () => {
                    const surahRadio = document.querySelector('input[name="hwType"][value="surah"]');
                    if (surahRadio) { surahRadio.checked = true; toggleHwType(); }
                    const surahSelect = document.getElementById('hw-surah-select');
                    if (surahSelect) { surahSelect.value = String(num); updateAyahRange(); }
                }
            });
        }
    }

    if (suggestions.length === 0) return;

    if (labelEl) labelEl.textContent = `${t('hw_memo_suggestion_prefix')} ${student.memoFrom} ← ${student.memoTo}`;

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

            const tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid #e2e8f0";
            // 🌟 نحتاج معرّف الواجب على الصف نفسه حتى تقدر loadNeedsGradingStat لاحقاً (بعد وصول
            // رد السحابة) تحدد أي صف تضيف له علامة تنبيه "يحتاج تصحيح" بدون إعادة رسم الجدول كله
            tr.dataset.hwId = hw.id;

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
                </td>
                <td style="padding: 15px; display: flex; gap: 5px; justify-content: center;">
                    <button class="btn btn-view-results" data-id="${hw.id}" style="padding: 5px 10px; background: #0ea5e9; font-size:1rem; min-width:unset;" title="${t('hw_subs_modal_title')}">📊</button>
                    <button class="btn" onclick="navigator.clipboard.writeText('${hwLink}').then(()=>alert(t('hw_share_success')))" style="padding: 5px 10px; background: #8b5cf6; font-size:1rem; min-width:unset;" title="${t('hw_copy_btn')}">🔗</button>
                    <button class="btn btn-delete-hw-record" data-id="${hw.id}" style="padding: 5px 10px; background: #ef4444; font-size:1rem; min-width:unset;" title="${t('حذف')}">🗑️</button>
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
                if (confirm(t("هل أنت متأكد من حذف هذا الواجب نهائياً؟"))) {
                    await AppState.homeworkManager.deleteHomework(id);
                    await loadHomeworkDashboard();
                }
            });
        });

        document.querySelectorAll('.btn-view-results').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const hwId = e.currentTarget.getAttribute('data-id');
                await toggleInlineSubmissions(hwId);
            });
        });
    }

    document.getElementById('stat-published').innerText = publishedCount;
    document.getElementById('stat-draft').innerText = draftCount;

    // 🌟🌟 [جديد] بطاقة "يحتاج تصحيح" تُحدَّث بشكل منفصل وغير محجوب (بدون await هنا عمداً):
    // الجدول أعلاه يظهر فوراً من البيانات المحلية (IndexedDB)، بينما هذه البطاقة تعتمد على
    // استعلام سحابي (Firestore) قد يستغرق ثانية أو أكثر — تشغيلها بدون انتظار يمنع تجميد
    // ظهور سجل الواجبات كله بسبب بطء الشبكة أو انقطاعها.
    loadNeedsGradingStat();
}

// 🌟🌟 [جديد] تجلب من السحابة (عبر getSubmissionsNeedingGrading) عدد كل التسليمات التي تحتاج
// تصحيح المعلم اليدوي عبر كل الواجبات دفعة واحدة، وتُحدّث بطاقة "يحتاج تصحيح" في الأعلى + تضع
// علامة تنبيه ⚠️ بجانب كل واجب متأثر في سجل الواجبات (الصفوف مبنية مسبقاً بمعرّف hw-alert-<id>
// مخفي افتراضياً في loadHomeworkDashboard أعلاه).
async function loadNeedsGradingStat() {
    const statEl = document.getElementById('stat-needs-grading');
    if (!statEl) return;
    statEl.innerText = '⏳';

    try {
        const pending = await getSubmissionsNeedingGrading();
        pendingGradingHwIds = new Set(pending.map(sub => sub.hwId));
        statEl.innerText = pending.length;

        pendingGradingHwIds.forEach(hwId => {
            const alertEl = document.getElementById(`hw-alert-${hwId}`);
            if (alertEl) alertEl.style.display = 'inline-block';
        });
    } catch (e) {
        // 🌟 نعرض ⚠️ بدل رقم (وليس "0") حتى لا نوهم المعلم بعدم وجود أي تسليم محتاج تصحيح بينما
        // السبب الحقيقي هو تعذّر الاتصال بالسحابة — نفس فلسفة معالجة الخطأ في loadSubmissionsInline
        console.error("تعذر جلب عدد التسليمات التي تحتاج تصحيح:", e);
        statEl.innerText = '⚠️';
    }
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
                let scoreColor = sub.score >= 90 ? '#10b981' : (sub.score >= 70 ? '#f59e0b' : '#ef4444');
                // 🌟 [محدَّث — المرحلة 2] نفس الفحص بالضبط، عبر الدالة المشتركة submissionNeedsGrading
                // بدل تكرار المقارنة هنا محلياً — راجع core/submissionStatus.js
                let needsGrading = submissionNeedsGrading(sub);
                let badge = needsGrading ? `<span style="background: #fef08a; color: #854d0e; font-size: 0.8rem; padding: 2px 5px; border-radius: 5px;">يحتاج تصحيح</span>` : "";

                tableHtml += `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 15px; font-weight: bold; color: #1e293b; text-align: right;">
                            ${sub.studentName} ${badge}
                            <button class="btn btn-open-grading" data-idx="${index}" style="background: #8b5cf6; padding: 4px 12px; font-size: 0.95rem; margin-right: 10px;">🔍 مراجعة وتصحيح</button>
                        </td>
                        <td style="padding: 15px; color: #64748b;">${sub.date}</td>
                        <td style="padding: 15px; font-weight: bold; font-size: 1.3rem; color: ${scoreColor};" id="score-cell-${index}">${sub.score}%</td>
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
            ${t("تعذر الاتصال بالسحابة. تأكد من تفعيل Firestore وضبط قواعد الأمان (Security Rules) في لوحة تحكم Firebase.")}
            <br><button class="btn" id="btn-retry-submissions" style="margin-top:10px; background:#0ea5e9;">🔄 إعادة المحاولة</button>
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
                    <h2 style="color: #0369a1; margin: 0; font-size: 1.8rem;">✍️ غرفة التصحيح: ${sub.studentName}</h2>
                    <div style="background: #f1f5f9; padding: 5px 15px; border-radius: 10px; font-weight: bold; color: #475569;">النتيجة الحالية: ${sub.score}%</div>
                </div>

                <div id="grading-questions-container" style="display: flex; flex-direction: column; gap: 20px;">
    `;

    sub.details.forEach((d, qIdx) => {
        let isManual = d.needsManualGrading;
        let isAudio = d.type === 'audio_record';
        let isMatching = d.type === 'matching';

        let cardBg = isManual ? '#fefce8' : '#f8fafc';
        let cardBorder = isManual ? '#fde047' : '#e2e8f0';

        modalHtml += `
            <div style="background: ${cardBg}; border: 2px solid ${cardBorder}; padding: 20px; border-radius: 15px;">
                <h3 style="color: #1e293b; font-size: 1.3rem; margin-top: 0;">السؤال ${qIdx + 1}: ${d.question}</h3>
        `;

        if (isAudio && d.audioData) {
            modalHtml += `
                <div style="margin: 15px 0; padding: 15px; background: white; border-radius: 10px; border: 1px solid #cbd5e1;">
                    <strong style="color:#0ea5e9;">🎤 تلاوة الطالب:</strong><br>
                    <audio controls src="${d.audioData}" style="width: 100%; margin-top: 10px;"></audio>
                </div>
            `;
        } else if (isMatching && d.matchingData) {
            // 🌟🌟 [جديد] عرض تفاعلي لأزواج المطابقة: ربط الطالب الفعلي بجانب "الاقتراح" (الأزواج
            // الصحيحة المعروفة أصلاً من بيانات توليد السؤال، وليس تخميناً) — بحسب الاتفاق مع المعلم،
            // هذا مجرد عرض مرجعي مساعد؛ لا يُحتسب منه أي درجة تلقائياً، والدرجة النهائية يُدخلها
            // المعلم بنفسه في حقل "أعطِ الطالب درجة" أدناه تماماً كباقي أسئلة التصحيح اليدوي.
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
                        <span style="color:#0369a1; font-weight:bold;">${leftItem.text}</span>
                        <span style="color:${isPairMatchingSuggestion ? '#10b981' : '#ef4444'};">
                            ${studentRightItem ? studentRightItem.text : '— لم يربطها —'} ${isPairMatchingSuggestion ? '✅' : '❌'}
                        </span>
                        <span style="color:#94a3b8; font-size:0.9rem;">(الاقتراح: ${correctRightItem ? correctRightItem.text : '-'})</span>
                    </div>
                `;
            });
            modalHtml += `</div>`;
        } else {
            modalHtml += `
                <div style="margin: 10px 0; font-size: 1.2rem;">
                    <span style="color: #64748b;">إجابة الطالب:</span>
                    <strong style="color: ${d.isCorrect || d.manualScore > 0 ? '#10b981' : '#ef4444'};">${d.studentAnswer}</strong>
                </div>
                <div style="margin: 10px 0; font-size: 1.2rem;">
                    <span style="color: #64748b;">الإجابة النموذجية:</span>
                    <strong style="color: #10b981;">${d.correctAnswer}</strong>
                </div>
            `;
        }

        if (isManual) {
            // 🌟 نعتمد على d.points المحفوظة مباشرة مع كل سؤال إن وُجدت (تسليمات جديدة)،
            // ونستخدم الجدول القديم فقط كخطة بديلة للتسليمات القديمة السابقة لهذا التحديث.
            let maxPoints = d.points || ((d.type === 'write_3_ayahs') ? 3 : 2);
            let currentScore = d.manualScore !== undefined ? d.manualScore : 0;

            modalHtml += `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #cbd5e1; display: flex; align-items: center; gap: 10px;">
                    <label style="font-weight: bold; color: #b45309;">أعطِ الطالب درجة من (${maxPoints}):</label>
                    <input type="number" class="manual-grade-input" data-qidx="${qIdx}" min="0" max="${maxPoints}" value="${currentScore}" style="width: 80px; padding: 10px; font-size: 1.2rem; border: 2px solid #f59e0b; border-radius: 8px; text-align: center; outline: none;">
                </div>
            `;
        } else {
            modalHtml += `
                <div style="margin-top: 10px; font-size: 1rem; color: #64748b;">
                    ${d.isCorrect ? '✅ تم التصحيح آلياً (صحيح)' : '❌ تم التصحيح آلياً (خاطئ)'}
                </div>
            `;
        }

        modalHtml += `</div>`;
    });

    modalHtml += `
                </div>
                <div style="display: flex; gap: 10px; margin-top: 30px;">
                    <button class="btn" id="btn-save-grading" style="flex: 2; background: #10b981; font-size: 1.4rem;">💾 حفظ الدرجات وإعادة الحساب</button>
                    <button class="btn btn-outline" id="btn-close-grading" style="flex: 1; border-color: #ef4444; color: #ef4444; font-size: 1.4rem;">إغلاق</button>
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

    // 🌟 تحويل زر الحفظ ليكون Async لانتظار رفع البيانات للسحابة 🌟
    document.getElementById('btn-save-grading').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.innerHTML = "⏳ جاري الحفظ في السحابة...";
        btn.disabled = true;
        await saveManualGrades(subIndex);
    });
}

// 🌟 دالة رصد الدرجات وإعادة حساب النتيجة (مع تحديث السحابة ورصيد نقاط الطالب) 🌟
async function saveManualGrades(subIndex) {
    const sub = currentSubmissionsList[subIndex];
    let totalPoints = 0;
    let earnedPoints = 0;
    // 🌟 [جديد] فرق نقاط التصحيح اليدوي فقط (وليس كل نقاط الواجب) لإضافته لرصيد الطالب،
    // بحيث لو أعاد المعلم تصحيح نفس الواجب مرة ثانية لا تُحتسب النقاط مرتين.
    let manualPointsDelta = 0;

    sub.details.forEach((d, qIdx) => {
        let maxP = d.points || (d.type === 'matrix_order' ? d.correctAnswer.length : (d.type === 'checkbox' || d.type === 'dual_dropdown' || d.type === 'written_blank' || d.type === 'audio_record' ? 2 : (d.type === 'write_3_ayahs' ? 3 : 1)));
        totalPoints += maxP;

        if (d.needsManualGrading) {
            const inputEl = document.querySelector(`.manual-grade-input[data-qidx="${qIdx}"]`);
            if (inputEl) {
                let score = Math.max(0, Math.min(maxP, parseInt(inputEl.value) || 0));
                const previousScore = d.manualScore || 0;
                manualPointsDelta += (score - previousScore);
                d.manualScore = score;
                earnedPoints += score;
            } else {
                earnedPoints += (d.manualScore || 0);
            }
        } else {
            if (d.isCorrect) earnedPoints += maxP;
        }
    });

    const newScore = Math.round((earnedPoints / totalPoints) * 100);
    sub.score = newScore;

    document.getElementById(`score-cell-${subIndex}`).innerText = `${newScore}%`;
    document.getElementById('grading-room-modal').remove();

    // 🌟🌟 إصلاح جوهري: كانت درجات التصحيح اليدوي (الفراغ الكتابي، تسميع 3 آيات، التسجيل
    // الصوتي) تُحفظ فقط داخل مستند التسليم في السحابة، دون أن تُضاف أبداً إلى رصيد نقاط
    // الطالب (student.totalScore) المستخدم في التطبيق. الآن نضيف الفرق الفعلي لرصيد الطالب.
    if (manualPointsDelta !== 0) {
        try {
            const students = await AppState.studentManager.getAllStudents();
            const std = students.find(s => s.id === sub.studentId) || students.find(s => s.name === sub.studentName);
            if (std) {
                std.totalScore = (std.totalScore || 0) + manualPointsDelta;
                await AppState.studentManager.updateStudent(std);
            }
        } catch (err) {
            console.error("تعذر تحديث رصيد نقاط الطالب بعد التصحيح اليدوي:", err);
        }
    }

    // 🌟 [محدَّث — المرحلة 3] استخراج معرّف الطالب صار مشتركًا الآن بين ميزتين (جدول المراجعة
    // المتباعدة تحت، ومزامنة السجل المحلي بعده) بدل ما يتكرر داخل كل واحدة منهما — ونقلناه خارج
    // شرط "AppState.reviewScheduleManager" لأنه لازم يشتغل حتى لو الميزة دي مش مفعّلة.
    let studentIdForGradingSync = sub.studentId;
    if (!studentIdForGradingSync) {
        try {
            const students = await AppState.studentManager.getAllStudents();
            const std = students.find(s => s.name === sub.studentName);
            studentIdForGradingSync = std ? std.id : null;
        } catch (err) {
            console.error("تعذر تحديد معرّف الطالب لتحديث جدول المراجعة/السجل المحلي:", err);
        }
    }

    // 🌟🌟 [جديد] نظام "المراجعة المتباعدة" (على نمط Anki/Duolingo): نقطة
    // التحديث المتفق عليها هي هنا بالضبط — بعد اعتماد المعلم للدرجة النهائية
    // يدوياً — وليس عند كل واجب تلقائي التصحيح لا يفتحه المعلم أبداً للمراجعة.
    // نجاح كبير (≥90%) يُبعد موعد المراجعة القادمة، وضعف (<50%) يُعيدها لليوم
    // التالي مباشرة. محاولة best-effort لا توقف حفظ الدرجات لو فشلت لأي سبب.
    if (AppState.reviewScheduleManager && studentIdForGradingSync) {
        try {
            await AppState.reviewScheduleManager.recordReviewResult(studentIdForGradingSync, newScore);
        } catch (err) {
            console.error("تعذر تحديث جدول المراجعة المتباعدة لهذا الطالب:", err);
        }
    }

    // 🌟🌟 [جديد — المرحلة 3] نُبقي نسخة history_ المحلية متزامنة مع الدرجة النهائية بعد
    // التصحيح اليدوي — بدون هذا، جدول "سجل التقييمات السابقة" في ملف الطالب ورسم "الأداء عبر
    // آخر التقييمات" في تقرير التقييم الفردي كانا سيظلان يعرضان الدرجة الأولية التلقائية للأبد،
    // حتى بعد تصحيح المعلم يدويًا (تأكّدنا من هذا بقراءة student/student.js وreports/report.js
    // فعليًا). راجع core/submissionStatus.js للشرح الكامل. محاولة best-effort مستقلة تمامًا عن
    // جدول المراجعة أعلاه — تعمل حتى لو reviewScheduleManager غير مفعّل.
    if (studentIdForGradingSync && sub.hwId) {
        syncSubmissionScoreToLocalHistory(studentIdForGradingSync, sub.hwId, newScore);
    }

    // 🌟 رفع النتيجة المحدثة إلى السحابة للأبد 🌟
    if (sub.docId) {
        await updateSubmissionInCloud(sub.docId, {
            score: sub.score,
            details: sub.details
        });
        alert(`✅ تم رصد الدرجات! النتيجة الجديدة للطالب أصبحت: ${newScore}%\n\nتم حفظ النتيجة وتحديثها في السحابة بنجاح! ☁️`);
    } else {
        alert(`✅ تم رصد الدرجات! النتيجة الجديدة للطالب أصبحت: ${newScore}%\n\n(ملاحظة: تم الحفظ محلياً فقط لعدم العثور على معرّف سحابي).`);
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
            let optStr = `${s.number}. ${t("سورة")} ${s.name}`;
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
    const btnNew = document.getElementById('btn-tab-new');
    const btnHistory = document.getElementById('btn-tab-history');
    const tabNew = document.getElementById('tab-new-hw');
    const tabHistory = document.getElementById('tab-history');

    // 🌟🌟 [جديد] بطاقة "يحتاج تصحيح" أصبحت فعّالة: النقر عليها ينقل المعلم مباشرة لتبويب
    // "سجل الواجبات" (نفس زر btn-tab-history) حيث تظهر علامات ⚠️ بجانب الواجبات المتأثرة.
    // التلميح (title) يُضبط هنا ديناميكياً بدل كتابته ثابتاً في HTML لأن data-i18n لا يدعم
    // خاصية title، فهذا يضمن تطابقه مع اللغة الحالية دائماً.
    const statNeedsGradingCard = document.getElementById('stat-needs-grading-card');
    if (statNeedsGradingCard) {
        statNeedsGradingCard.title = t('hw_needs_grading_tooltip');
        statNeedsGradingCard.addEventListener('click', () => btnHistory?.click());
        // 🌟 [جديد] العنصر أصبح له role="button" و tabindex في HTML (بدل div عادية بلا أي
        // دلالة تفاعلية)، فلازم يستجيب أيضاً لـ Enter/Space من لوحة المفاتيح مثل أي زر حقيقي
        statNeedsGradingCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btnHistory?.click(); }
        });
    }

    btnNew?.addEventListener('click', () => {
        tabNew.style.display = 'block'; tabHistory.style.display = 'none';
        btnNew.style.background = '#0ea5e9'; btnNew.style.color = 'white'; btnNew.classList.remove('btn-outline');
        btnHistory.style.background = 'white'; btnHistory.style.color = '#0ea5e9'; btnHistory.classList.add('btn-outline');
    });

    btnHistory?.addEventListener('click', () => {
        tabHistory.style.display = 'block'; tabNew.style.display = 'none';
        btnHistory.style.background = '#0ea5e9'; btnHistory.style.color = 'white'; btnHistory.classList.remove('btn-outline');
        btnNew.style.background = 'white'; btnNew.style.color = '#0ea5e9'; btnNew.classList.add('btn-outline');
        loadHomeworkDashboard();
    });

    document.querySelectorAll('input[name="hwType"]').forEach(r => r.addEventListener('change', toggleHwType));
    document.getElementById('hw-surah-select')?.addEventListener('change', updateAyahRange);
    document.getElementById('btn-back-home')?.addEventListener('click', loadSplashScreen);

    // 🌟 [جديد] إعادة تطبيق اقتراح النطاق كل مرة يغيّر فيها المعلم الطالب المستهدف يدوياً
    document.getElementById('hw-target-student')?.addEventListener('change', suggestRangeFromStudentMemo);

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

    renderPreview();
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
                    <th style="padding:10px;">الآية المبعثرة</th>
                    <th style="padding:10px;">الترتيب الصحيح لها</th>
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
                <div style="margin-bottom: 8px;"><strong style="color:#0369a1;">إجابة الفراغ الأول [ 1 ]:</strong> <span style="color:#10b981; font-weight:bold; font-size: 1.2rem;">${q.correctAnswer[0]}</span></div>
                <div><strong style="color:#0369a1;">إجابة الفراغ الثاني [ 2 ]:</strong> <span style="color:#10b981; font-weight:bold; font-size: 1.2rem;">${q.correctAnswer[1]}</span></div>
            </div>`;
        } else if (q.type === 'written_blank') {
            optionsHTML = `<div style="margin-top: 10px; font-size: 1.2rem; color: #10b981;">✍️ <strong style="color:#0369a1;">الكلمة المطلوبة:</strong> ${q.correctAnswer}</div>`;
        } else if (q.type === 'write_3_ayahs') {
            optionsHTML = `<div style="margin-top: 10px; font-size: 1.2rem; color: #10b981; background: #f0fdf4; padding: 10px; border-radius: 8px;">✍️ <strong style="color:#0369a1;">الآيات الثلاث المطلوبة:</strong><br>${q.correctAnswer}</div>`;
        } else if (q.type === 'audio_record') {
            optionsHTML = `<div style="margin-top: 10px; font-size: 1.2rem; color: #0ea5e9; background: #e0f2fe; padding: 10px; border-radius: 8px;">🎤 <strong>سيقوم الطالب بتسجيل هذا المقطع صوتياً.</strong></div>`;
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

        let manualBadge = q.needsManualGrading ? `<span style="font-size:0.8rem; background:#fef08a; color:#854d0e; padding:3px 8px; border-radius:10px; margin-right:10px;">يحتاج تقييم يدوي ✍️</span>` : "";

        qCard.innerHTML = actionsHtml + `
            <div style="font-weight: bold; color: #0f172a; font-size: 1.2rem; width: 70%;">${t("السؤال")} ${index + 1}: ${q.title} <span style="font-size:0.9rem; color:#64748b; font-weight:normal;">(${q.points || 1} نقاط)</span> ${manualBadge}</div>
            <div class="quran-text" style="font-size: 1.6rem; color: #047857; margin-top: 10px;">${q.text}</div>
            ${optionsHTML}
        `;
        listDiv.appendChild(qCard);
    });

    document.querySelectorAll('.btn-edit-q').forEach(btn => btn.addEventListener('click', (e) => openQuestionBuilderModal(parseInt(e.target.dataset.idx))));
    document.querySelectorAll('.btn-delete-q').forEach(btn => btn.addEventListener('click', (e) => {
        if(confirm(t("هل أنت متأكد من حذف هذا السؤال؟"))) {
            currentGeneratedQuestions.splice(parseInt(e.target.dataset.idx), 1);
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
            <option value="mcq">اختيار من متعدد (إجابة واحدة)</option>
            <option value="checkbox">مربعات اختيار (عدة إجابات)</option>
            <option value="dropdown">قائمة منسدلة (فراغات)</option>
            <option value="written_blank">أكمل الفراغ (كتابة يدوية)</option>
            <option value="write_3_ayahs">تسميع مقطع (كتابة يدوية)</option>
            <option value="audio_record">تسميع (تسجيل صوتي)</option>
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

    let needsManual = (type === 'written_blank' || type === 'write_3_ayahs' || type === 'audio_record');

    const newQ = {
        id: editIndex >= 0 ? currentGeneratedQuestions[editIndex].id : 'q_manual_' + Date.now(),
        type: type,
        title: title,
        text: text,
        options: optionsRaw,
        correctAnswer: type === 'checkbox' ? correctRaw.split(',').map(s=>s.trim()) : correctRaw,
        points: (type === 'checkbox' || type === 'written_blank' || type === 'audio_record') ? 2 : (type === 'write_3_ayahs' ? 3 : 1),
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

async function saveHomeworkToDB(statusType) {
    if (currentGeneratedQuestions.length === 0) return alert(t("لا يوجد أسئلة لحفظها!"));

    const targetStudentName = document.getElementById('hw-target-student').value;
    const saveBtn = document.getElementById('btn-save-hw-publish');
    if(saveBtn) saveBtn.innerHTML = `⏳ ${t('hw_submitting')}`;

    let targetStudentAvatar = null;
    if (targetStudentName) {
        const students = await AppState.studentManager.getAllStudents();
        const std = students.find(s => s.name === targetStudentName);
        if (std) {
            targetStudentAvatar = std.avatar || std.image || std.photo || std.profilePic || std.picture || std.icon || null;
        }
    }

    try {
        const homeworkObj = {
            id: 'HW_' + Date.now(),
            createdAt: new Date().toISOString(),
            questions: currentGeneratedQuestions,
            status: statusType,
            assignedStudentName: targetStudentName || null,
            assignedStudentAvatar: targetStudentAvatar || null
        };

        await AppState.homeworkManager.createHomework(homeworkObj);

        if (statusType === 'published') {
            if(saveBtn) saveBtn.innerHTML = `🚀 ${t('hw_publish_btn')}`;
            document.getElementById('share-modal-title').innerText = t('hw_share_success');
            const baseUrl = window.location.origin + window.location.pathname;
            // 🌟🌟 [إصلاح جوهري] رابط مكتفي ذاتياً يحمل الواجب كامل داخله بدل معرّف بسيط —
            // يفتح فوراً عند الطالب بلا أي حاجة لاتصال بالسحابة (وبالتالي بلا أي تأثر بمشاكل
            // App Check/الصلاحيات/انقطاع الشبكة). راجع buildHomeworkShareLink أعلاه في هذا
            // الملف (وخط الرجوع للرابط بالمعرّف البسيط لو الواجب كبير جداً).
            document.getElementById('hw-link-input').value = buildHomeworkShareLink(baseUrl, homeworkObj);
            // 🌟 نُظهر النافذة فوراً (الحفظ المحلي في IndexedDB تم بالفعل أعلاه) دون انتظار
            // رفع السحابة، حتى لا نُجمّد الواجهة على المعلم بلا داعٍ — لكن نتابع نتيجة الرفع
            // بعدها مباشرة (راجع الشرح تحت) بدل تركها fire-and-forget كما كانت سابقاً
            const syncWarningEl = document.getElementById('hw-cloud-sync-warning');
            const retryBtn = document.getElementById('btn-retry-hw-sync');
            if (syncWarningEl) syncWarningEl.style.display = 'none';
            if (retryBtn) retryBtn.style.display = 'none';
            document.getElementById('hw-share-modal').style.display = 'flex';

            // 🌟🌟 [إصلاح جوهري] كانت هذه الاستدعاء "fire-and-forget" (بدون await): لو فشل الرفع
            // للسحابة (لا يوجد إنترنت، خطأ مؤقت، حقل undefined...) كان المعلم يرى رابطاً "جاهزاً"
            // رغم أن الواجب لم يصل فعلياً للسحابة، فيعمل الرابط فقط على نفس جهاز المعلم (عبر
            // IndexedDB المحلي) ويفشل بصمت برسالة "هذا الواجب غير موجود" لأي طالب حقيقي يفتحه من
            // جهازه — وهذا بالضبط ما كان يحدث. الآن ننتظر النتيجة الحقيقية ونحذّر المعلم صراحةً
            // لو فشل الرفع، بدل الادعاء الصامت بالنجاح، ونحفظه في طابور لإعادة المحاولة تلقائياً
            // لاحقاً (راجع core/firebase.js).
            const cloudSaved = await saveHomeworkToCloud(homeworkObj);
            if (!cloudSaved) {
                console.warn("فشل رفع الواجب للسحابة عند النشر — تم حفظه في طابور إعادة المحاولة.");
                queuePendingHomeworkSync(homeworkObj);
                // 🌟🌟 [جديد] نحتفظ بالواجب الذي فشل رفعه ليستخدمه زر "إعادة المحاولة الآن"
                lastFailedHomeworkForRetry = homeworkObj;
                if (syncWarningEl) {
                    syncWarningEl.textContent = t('hw_cloud_sync_warning');
                    syncWarningEl.style.display = 'block';
                }
                // 🌟🌟 [جديد] نُظهر زر "إعادة المحاولة الآن" بدل ترك المعلم يعتمد فقط على إعادة
                // المحاولة الصامتة التلقائية (عند الاتصال أو فتح الشاشة لاحقاً — راجع
                // core/app.js وinitHomeworkPrep أعلاه) — راجع retryHomeworkCloudSync أسفل
                if (retryBtn) {
                    retryBtn.disabled = false;
                    retryBtn.innerHTML = `🔄 ${t('hw_retry_sync_btn')}`;
                    retryBtn.style.display = 'block';
                }
            }
            // 🌟🌟 [جديد] الواجب المنشور (سواء وصل للسحابة فوراً أو كان لا يزال معلّقاً) قد يُغيّر
            // علامة ⏳ في سجل الواجبات، فنعيد رسمه ليعكس الحالة الحقيقية فوراً
            await loadHomeworkDashboard();
        } else {
            if(saveBtn) saveBtn.innerHTML = `📝 ${t('hw_draft_btn')}`;
            alert(t("✅ تم حفظ الواجب كمسودة محلياً بنجاح."));
            document.getElementById('btn-tab-history').click();
            currentGeneratedQuestions = [];
            document.getElementById('hw-preview-section').style.display = 'none';
        }

    } catch (error) {
        console.error("خطأ عام في حفظ الواجب:", error);
        alert(t("حدث خطأ أثناء الحفظ. يرجى تحديث الصفحة."));
        if(saveBtn) saveBtn.innerHTML = `🚀 ${t('hw_publish_btn')}`;
    }
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

function copyHomeworkLink() {
    const linkInput = document.getElementById('hw-link-input');
    const copyBtn = document.getElementById('btn-copy-hw-link');

    linkInput.select();
    linkInput.setSelectionRange(0, 99999);

    navigator.clipboard.writeText(linkInput.value).then(() => {
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