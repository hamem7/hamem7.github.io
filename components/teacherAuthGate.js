// components/teacherAuthGate.js
// ==========================================================
// 🌟🌟 [أُعيدت كتابته 2026-10-03] بوابة دخول "نظام الواجبات المنزلية" — تسجيل الدخول بجوجل فقط
// ==========================================================
// 🔒 حدود هذا الملف (قاعدة ثابتة):
//   - يُستدعى فقط من نقاط نظام الواجبات: فتح شاشة الواجبات (openHomeworkPrep في core/app.js) ونشر واجب
//     (settings/homework-prep.js). لا تستدعِه أي شاشة من المنصة الأساسية (الطلاب، الحفظ، المراجعة، الألعاب،
//     الاختبارات، التجويد، التقارير...) — المنصة الأساسية مفتوحة لأي معلم بلا جوجل ولا بريد ولا مفتاح.
//   - الهدف من جوجل هنا ربط بيانات الواجبات بحساب المعلم حتى يصل إليها من الهاتف والكمبيوتر، لا "منع" الدخول.
//
// تاريخ: كان هنا "مفتاح المعلم" ثم مسار احتياطي له أسفل زر جوجل، وكان الخادم يرفض أي بريد خارج قائمة
// TEACHER_EMAILS برسالة "هذا البريد غير مسموح له بدخول شاشة المعلم...". حُذف الاثنان نهائياً (المفتاح هنا وفي
// core/api.js والخادم، والقائمة البيضاء من backend/Code.gs).
//
// ⚠️ افتراض صريح: لو كانت جلسة جوجل محفوظة على هذا الجهاز نعتبرها صالحة فوراً بلا نداء شبكة. لو رفضها الخادم
// عند أول نداء تُمسح النسخة المحلية (core/homeworkApi.js) ويُطلب الدخول بجوجل من جديد في المرة التالية.
import { ApiError, googleSignIn, GOOGLE_CLIENT_ID, isTeacherAuthed } from '../core/api.js';
import { t } from '../core/i18n.js';
import { AppState } from '../core/app.js';

// ينتظر تحميل سكربت Google Identity Services (مُحمَّل من index.html بوسم async).
function waitForGoogleIdentity(timeoutMs = 4000) {
    return new Promise((resolve) => {
        const start = Date.now();
        (function poll() {
            if (window.google && window.google.accounts && window.google.accounts.id) return resolve(true);
            if (Date.now() - start > timeoutMs) return resolve(false);
            setTimeout(poll, 100);
        })();
    });
}

function buildModal() {
    const overlay = document.createElement('div');
    overlay.id = 'teacher-auth-modal';
    overlay.className = 'dh-teacher-auth-overlay';

    const box = document.createElement('div');
    box.className = 'dh-teacher-auth-box';

    const title = document.createElement('h2');
    title.className = 'dh-teacher-auth-title';
    title.textContent = '🔐 ' + t('teacher_auth_title');
    const sub = document.createElement('p');
    sub.className = 'dh-teacher-auth-sub';
    sub.textContent = t('teacher_auth_subtitle_google');

    const googleBtnHost = document.createElement('div');
    googleBtnHost.className = 'dh-teacher-auth-google-btn';
    googleBtnHost.id = 'teacher-auth-google-btn';
    const googleErr = document.createElement('div');
    googleErr.className = 'dh-teacher-auth-error';
    googleErr.style.display = 'none';
    const googleLoading = document.createElement('p');
    googleLoading.className = 'dh-teacher-auth-hint';
    googleLoading.style.display = 'none';
    googleLoading.textContent = t('teacher_auth_loading');

    const cancelWrap = document.createElement('div');
    cancelWrap.className = 'dh-teacher-auth-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn btn-outline dh-teacher-auth-cancel';
    cancel.textContent = t('teacher_auth_cancel_btn');
    cancelWrap.append(cancel);

    box.append(title, sub, googleBtnHost, googleLoading, googleErr, cancelWrap);
    overlay.append(box);
    return { overlay, cancel, googleBtnHost, googleErr, googleLoading };
}

// يحوّل خطأ تسجيل الدخول بجوجل إلى مفتاح i18n دقيق.
// ⚠️ افتراض صريح: الخادم يردّ برسائل إنجليزية ثابتة (Code.gs → verifyGoogleIdToken_)، فنعتمد على الرمز code
// أولاً ثم على نص الرسالة للتفريق بين أسباب UNAUTHORIZED المختلفة.
function googleErrorKey(ex) {
    if (!(ex instanceof ApiError)) return 'teacher_auth_google_error';
    if (ex.kind === 'network' || ex.kind === 'timeout' || ex.kind === 'bad_response') return 'teacher_auth_error_network';
    const msg = String(ex.message || '');
    if (ex.code === 'BUSY') return 'teacher_auth_error_busy';
    if (ex.code === 'UNAUTHORIZED') {
        // 🌟 [2026-10-03] الخادم الجديد لا يرفض أي بريد موثَّق. هذه الرسالة لا تأتي إلا من نسخة قديمة من الخادم ما زالت
        // تطبّق قائمة TEACHER_EMAILS — فنقول ذلك صراحة بدل "اطلب إضافتك لقائمة المعلمين".
        if (/not allowed/i.test(msg)) return 'teacher_auth_error_server_outdated';
        if (/no verified email/i.test(msg)) return 'teacher_auth_error_unverified';
        if (/different app/i.test(msg)) return 'teacher_auth_error_wrong_app';
        if (/invalid or expired/i.test(msg)) return 'teacher_auth_error_expired';
        return 'teacher_auth_google_error';
    }
    return 'teacher_auth_error_server';
}

// تُرجع true لو المعلم مسجَّل بجوجل لنظام الواجبات، و false لو ألغى.
export async function ensureHomeworkSignIn() {
    if (isTeacherAuthed()) return true;
    return new Promise((resolve) => {
        const { overlay, cancel, googleBtnHost, googleErr, googleLoading } = buildModal();
        document.body.appendChild(overlay);

        let settled = false;
        const finish = (ok) => { if (settled) return; settled = true; overlay.remove(); resolve(ok); };
        cancel.addEventListener('click', () => finish(false));

        async function handleGoogleCredential(response) {
            googleErr.style.display = 'none';
            googleLoading.style.display = 'block';
            try {
                await googleSignIn(response.credential);
                finish(true);
            } catch (ex) {
                googleLoading.style.display = 'none';
                googleErr.textContent = t(googleErrorKey(ex));
                googleErr.style.display = 'block';
            }
        }

        const showGoogleUnavailable = () => {
            googleBtnHost.style.display = 'none';
            googleErr.textContent = t('teacher_auth_google_error');
            googleErr.style.display = 'block';
        };

        waitForGoogleIdentity().then((ready) => {
            if (!ready) return showGoogleUnavailable();
            try {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleCredential
                });
                window.google.accounts.id.renderButton(googleBtnHost, {
                    type: 'standard', theme: 'filled_blue', size: 'large', shape: 'pill',
                    text: 'signin_with', locale: AppState.currentLang === 'en' ? 'en' : 'ar'
                });
            } catch (ex) {
                showGoogleUnavailable();
            }
        });
    });
}
