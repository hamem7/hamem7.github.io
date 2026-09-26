// student/homework-welcome.js
// ==========================================================
// 🌟🌟 [أُعيدت كتابته] شاشة ترحيب الطالب بالواجب — تعمل الآن مع خادم Google الجديد
// ==========================================================
// التغييرات الجوهرية (راجع مستند "تدقيق نظام الواجبات"):
//  - الرابط يحمل معرّف الواجب فقط (HW_ + 32 خانة عشوائية) ولا يحمل أي أسئلة أو إجابات؛ الواجب يُجلب من الخادم
//    بنسخة "آمنة للطالب" (بلا الإجابات الصحيحة). كان الرابط القديم يحمل كل الإجابات الصحيحة داخله.
//  - لم يعد يُنشأ ملف طالب على هاتف الطالب ولا تُعرض قائمة طلاب محلية؛ الطالب يكتب اسمه (أو يأتي مخصَّصاً من
//    الخادم). ربط الاسم بسجل الطالب الحقيقي يتم عند المعلم وقت اعتماد النتيجة.
//  - أي خطأ (رابط غير صحيح، واجب مغلق، لا إنترنت...) يظهر بصدق بدل التلميح بأن الواجب "غير موجود" دائماً.
//  - لو كان على هذا الجهاز تسليم سابق لنفس الواجب (مؤكَّد/معلَّق) نذهب مباشرة لشاشة حالته الحقيقية بدل
//    السماح بإعادة الحل (حتى بلا إنترنت، لأننا لا نحتاج جلب الواجب من جديد لعرض حالة تسليم موجود).
import { AppState } from '../core/app.js';
import { loadScreen } from '../core/navigation.js';
import { t } from '../core/i18n.js';
import { ApiError } from '../core/api.js';
import { fetchPublicHomework, isServerHomeworkId, friendlyErrorText } from '../core/homeworkApi.js';
import { getAttempt } from '../core/submitQueue.js';

let currentHwId = null;

function showMsg(text, kind) {
    const box = document.getElementById('hw-welcome-msg');
    if (!box) return;
    const styles = {
        error: 'background:#fee2e2; color:#b91c1c;',
        info: 'background:#e0f2fe; color:#0369a1;'
    };
    box.style.cssText = 'display:block; margin-bottom:20px; padding:15px; border-radius:12px; font-size:1.15rem; line-height:1.7; font-weight:bold; ' + (styles[kind] || styles.info);
    box.textContent = text;
}
function hideMsg() { const b = document.getElementById('hw-welcome-msg'); if (b) b.style.display = 'none'; }

function goHome() {
    // 🌟 نرجع للمنصة بدون باراميتر الرابط (إقلاع كامل عادي)
    window.location.href = window.location.pathname;
}

function goToPlay() {
    import('../games/homework-play.js').then(module => {
        loadScreen({
            templateUrl: 'games/homework-play.html',
            initFunction: () => module.initHomeworkPlay()
        });
    }).catch(err => {
        console.error("شاشة اللعب غير متوفرة:", err);
        showMsg(t('hw_st_play_load_error'), 'error');
    });
}

export async function initHomeworkWelcome(hwId) {
    currentHwId = hwId;
    setupCommonListeners();

    // 1) رابط قديم من نظام Firebase (معرّف بشكل مختلف أو رابط مُرمَّز فيه الواجب كاملاً)
    if (!isServerHomeworkId(hwId)) {
        document.getElementById('btn-enter-hw').style.display = 'none';
        document.getElementById('hw-dropdown-section').style.display = 'none';
        showMsg(t('hw_st_legacy_link'), 'error');
        return;
    }

    // 2) تسليم سابق على هذا الجهاز؟ نعرض حالته الحقيقية مباشرة
    const prev = getAttempt(hwId);
    if (prev && prev.state !== 'rejected') {
        AppState.currentHomework = { id: hwId, questions: [] };
        AppState.currentStudent = { id: null, name: prev.studentName };
        goToPlay();
        return;
    }

    // 3) جلب الواجب (نسخة الطالب الآمنة) من الخادم
    await loadHomework(hwId);
}

async function loadHomework(hwId) {
    const retryBtn = document.getElementById('btn-retry-load-hw');
    const enterBtn = document.getElementById('btn-enter-hw');
    retryBtn.style.display = 'none';
    enterBtn.disabled = true;
    showMsg(t('hw_st_loading'), 'info');

    let homework;
    try {
        homework = await fetchPublicHomework(hwId);
    } catch (e) {
        enterBtn.disabled = false;
        const final = (e instanceof ApiError) && (e.code === 'NOT_FOUND' || e.code === 'CLOSED');
        showMsg(friendlyErrorText(e) + (final ? '' : ' — ' + t('hw_st_nothing_submitted')), 'error');
        if (final) {
            enterBtn.style.display = 'none';
            document.getElementById('hw-dropdown-section').style.display = 'none';
        } else {
            retryBtn.style.display = 'block';
            retryBtn.onclick = () => loadHomework(hwId);
            enterBtn.style.display = 'none';
        }
        return;
    }

    enterBtn.style.display = '';
    enterBtn.disabled = false;
    hideMsg();
    AppState.currentHomework = homework;
    currentHwId = homework.id;

    if (homework.assignedStudentName) {
        // واجب مخصَّص: الاسم يأتي من الخادم ولا يستطيع الطالب تغييره
        AppState.currentStudent = { id: null, name: homework.assignedStudentName };
        document.getElementById('hw-dropdown-section').style.display = 'none';
        document.getElementById('hw-personalized-welcome').style.display = 'block';
        const nameEl = document.getElementById('hw-welcome-name');
        nameEl.textContent = '';
        nameEl.append(t('hw_st_welcome_prefix'), document.createElement('br'));
        const span = document.createElement('span');
        span.style.color = '#0f766e';
        span.textContent = '👑 ' + homework.assignedStudentName + ' 🚀';
        nameEl.append(span);
    } else {
        AppState.currentStudent = null;
        document.getElementById('hw-dropdown-section').style.display = '';
    }
}

function setupCommonListeners() {
    document.getElementById('btn-cancel-hw')?.addEventListener('click', goHome);

    document.getElementById('btn-enter-hw')?.addEventListener('click', () => {
        if (!AppState.currentHomework || !AppState.currentHomework.questions || !AppState.currentHomework.questions.length) return;
        if (!AppState.currentStudent) {
            const input = document.getElementById('hw-student-name-input');
            const name = (input.value || '').replace(/\s+/g, ' ').trim();
            if (name.length < 2) {
                input.focus();
                showMsg(t('hw_st_name_required'), 'error');
                return;
            }
            AppState.currentStudent = { id: null, name };
        }
        goToPlay();
    });
}
