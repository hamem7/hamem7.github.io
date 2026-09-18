// recitation/recitation-play.js
// 🌟 [جديد بالكامل] منطق شاشة التسميع المباشر — قلب الميزة. كل ضغطة على أحد الأزرار
// الأربعة تُسجَّل فورًا في الذاكرة (بلا أي نافذة أو تأكيد)، والحفظ الفعلي في قاعدة
// البيانات (database/recitationDB.js) يحدث مرة واحدة فقط عند "إنهاء التسميع" — بعد
// عرض ملخص سريع يقدر المعلم يراجعه أو يضيف ملاحظة عامة عليه قبل الحفظ النهائي.
import { AppState, t } from '../core/app.js';
import { showToastEncouragement } from '../components/ui.js';

// 🌟 4 أنواع الملاحظات المتوقعة أثناء التسميع (بالضبط كما حدّدها المعلم) — أسماء الحقول
// الداخلية (type) مستقلة تمامًا عن أسماء checkbox الأخطاء المستخدمة في غرفة اللعب
// (err_word/err_haraka...) حتى لا يختلط سجل التسميع الجديد بسجل weaknesses القديم
const ERROR_TYPES = [
    { key: 'pronounce', btnId: 'rec-btn-pronounce', countId: 'rec-count-pronounce', labelKey: 'rec_err_pronounce' },
    { key: 'forgotVerse', btnId: 'rec-btn-verse', countId: 'rec-count-verse', labelKey: 'rec_err_verse' },
    { key: 'forgotWord', btnId: 'rec-btn-word', countId: 'rec-count-word', labelKey: 'rec_err_word' },
    { key: 'hesitation', btnId: 'rec-btn-hesitation', countId: 'rec-count-hesitation', labelKey: 'rec_err_hesitation' }
];

let sessionErrors = [];
let sessionConfig = null;
let startedAt = null;
let lastLoggedIndex = -1;

export function initRecitationPlay() {
    // 🌟 يُقرأ مرة واحدة ثم يُفرَّغ فورًا — نفس نمط similarityGamePlayScope/dualTestPlayMatchId
    // في core/app.js بالضبط، حتى لا يؤثر على أي فتح لاحق عادي لهذه الشاشة
    sessionConfig = AppState.recitationSessionConfig;
    AppState.recitationSessionConfig = null;

    if (!sessionConfig) {
        alert(t('rec_no_student_selected'));
        goBackToProfile();
        return;
    }

    sessionErrors = [];
    startedAt = new Date().toISOString();
    lastLoggedIndex = -1;

    const nameEl = document.getElementById('rec-play-student-name');
    if (nameEl) nameEl.innerText = sessionConfig.studentName;

    const typeBadge = document.getElementById('rec-play-type-badge');
    if (typeBadge) typeBadge.innerText = sessionConfig.sessionType === 'review' ? t('rec_type_review') : t('rec_type_new');

    const rangeEl = document.getElementById('rec-play-range');
    if (rangeEl) rangeEl.innerText = `${sessionConfig.rangeFrom} ← ${sessionConfig.rangeTo}`;

    ERROR_TYPES.forEach((type, idx) => {
        document.getElementById(type.btnId)?.addEventListener('click', () => logError(idx));
    });

    document.getElementById('rec-location-save-btn')?.addEventListener('click', saveLocationNote);
    document.getElementById('rec-location-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveLocationNote();
    });

    document.getElementById('rec-exit-btn')?.addEventListener('click', handleExit);
    document.getElementById('rec-finish-btn')?.addEventListener('click', openSummary);

    document.getElementById('rec-summary-cancel-btn')?.addEventListener('click', closeSummary);
    document.getElementById('rec-summary-save-btn')?.addEventListener('click', saveSession);

    renderCounts();
}

function renderCounts() {
    ERROR_TYPES.forEach(type => {
        const count = sessionErrors.filter(e => e.type === type.key).length;
        const el = document.getElementById(type.countId);
        if (el) el.innerText = String(count);
    });
    const totalEl = document.getElementById('rec-total-count');
    if (totalEl) totalEl.innerText = String(sessionErrors.length);
}

// 🌟 قلب الميزة: تسجيل فوري بضغطة واحدة، بلا أي نافذة منبثقة أو تأكيد
function logError(typeIdx) {
    const type = ERROR_TYPES[typeIdx];
    sessionErrors.push({ type: type.key, note: '', at: new Date().toISOString() });
    lastLoggedIndex = sessionErrors.length - 1;
    renderCounts();

    // 🌟 [قرار صريح من المعلم]: حقل "أين؟" اختياري يظهر بعد الضغط فقط، بلا أي إجبار
    const panel = document.getElementById('rec-location-panel');
    const label = document.getElementById('rec-location-last-label');
    const input = document.getElementById('rec-location-input');
    if (panel && label && input) {
        label.innerText = `${t('rec_last_logged')} ${t(type.labelKey)}`;
        input.value = '';
        panel.style.display = 'flex';
        input.focus();
    }
}

function saveLocationNote() {
    const input = document.getElementById('rec-location-input');
    if (!input || lastLoggedIndex < 0 || !sessionErrors[lastLoggedIndex]) return;
    sessionErrors[lastLoggedIndex].note = input.value.trim();
    const panel = document.getElementById('rec-location-panel');
    if (panel) panel.style.display = 'none';
}

function handleExit() {
    // 🌟 نفس منطق exit_game_confirm_msg في adultGame.js/kidsGame.js بالضبط: لا يظهر
    // تأكيد الخروج إلا لو فيه ملاحظة واحدة على الأقل غير محفوظة بعد في هذه الجلسة
    if (sessionErrors.length > 0) {
        if (!confirm(t('rec_exit_confirm_msg'))) return;
    }
    goBackToProfile();
}

function openSummary() {
    const panel = document.getElementById('rec-location-panel');
    if (panel) panel.style.display = 'none';

    const body = document.getElementById('rec-summary-body');
    if (body) {
        if (sessionErrors.length === 0) {
            body.innerHTML = `<p class="rec-summary-empty">${t('rec_no_errors_note')}</p>`;
        } else {
            body.innerHTML = ERROR_TYPES.map(type => {
                const count = sessionErrors.filter(e => e.type === type.key).length;
                if (!count) return '';
                return `<div class="rec-summary-row"><span>${t(type.labelKey)}</span><b>${count}</b></div>`;
            }).join('');
        }
    }
    const totalEl = document.getElementById('rec-summary-total');
    if (totalEl) totalEl.innerText = String(sessionErrors.length);

    const modal = document.getElementById('rec-summary-modal');
    if (modal) modal.style.display = 'flex';
}

function closeSummary() {
    const modal = document.getElementById('rec-summary-modal');
    if (modal) modal.style.display = 'none';
}

async function saveSession() {
    const noteInput = document.getElementById('rec-summary-note');
    const generalNote = noteInput ? noteInput.value.trim() : '';

    const session = {
        studentId: sessionConfig.studentId,
        studentName: sessionConfig.studentName,
        sessionType: sessionConfig.sessionType,
        rangeFrom: sessionConfig.rangeFrom,
        rangeTo: sessionConfig.rangeTo,
        errors: sessionErrors,
        generalNote,
        startedAt,
        finishedAt: new Date().toISOString(),
        // 🌟 نفس فكرة حقل timestamp الرقمي في history_${studentId} بالضبط — أساس فلترة
        // الشهر في التقرير الشهري (راجع reports/monthly-report.js)
        timestamp: Date.now(),
        // 🌟 لغرض العرض فقط (أي واجهة كان المعلم فيها وقت التسميع) — لا يغيّر أي منطق،
        // الميزة نفسها موحّدة تمامًا بلا فروقات بين واجهة الكبار وركن الأطفال
        sourceSection: AppState.isKidsMode ? 'kids' : 'adult'
    };

    try {
        if (AppState.recitationManager) {
            await AppState.recitationManager.addSession(session);
        }
    } catch (e) {
        console.error('تعذر حفظ جلسة التسميع:', e);
    }

    closeSummary();
    showToastEncouragement('toast-encouragement', t('rec_saved_toast'));
    goBackToProfile();
}

function goBackToProfile() {
    // 🌟 dynamic import عمدًا لتفادي أي حلقة استيراد ثابتة مع student/student.js —
    // نفس نمط التنقل المستخدم فعليًا في reports/monthly-report.js (goBackToProfile)
    import('../student/student.js').then(m => m.loadStudentProfileScreen()).catch(err => {
        console.error('[recitation-play.js] تعذر العودة لملف الطالب:', err);
    });
}
