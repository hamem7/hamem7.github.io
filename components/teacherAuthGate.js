// components/teacherAuthGate.js
// ==========================================================
// 🌟🌟 [أُعيدت كتابته] بوابة دخول المعلم — تسجيل الدخول بجوجل (بريد إلكتروني) بدل "مفتاح المعلم"
// ==========================================================
// تاريخ الملف: كان "مفتاح المعلم" (نص سري من 12 خانة يُنشأ مرة واحدة عند إعداد الخادم) هو طريقة
// الدخول الوحيدة (راجع النسخة القديمة من هذا الملف في تاريخ Git لو احتجتها). بعد تفعيل نظام تعدّد
// المعلمين على الخادم (Google Apps Script + Google Sign-In، مُختبَر ومنشور فعلياً) صار بإمكان
// المعلم الدخول ببريده مباشرة بدل حفظ/تذكّر مفتاح.
//
// 🔒 قرار متعمَّد: مفتاح المعلم القديم **لم يُحذف** من core/api.js ولا من هذا الملف — يبقى خط رجوع
// كامل خلف رابط "الدخول بمفتاح المعلم القديم" أسفل زر جوجل، حتى لا تنكسر المنصة لو تعطّل تحميل
// سكربت جوجل (حجب إعلانات، عدم توفر الخدمة في شبكة معيّنة...). أي معلم يدخل بالمفتاح القديم يرى كل
// البيانات كما كان يحصل دائماً (المسار isLegacy في الخادم).
//
// 🌟 ربط الواجبات القديمة بحساب جوجل: الواجبات المنشورة قبل تفعيل هذا النظام لا مالك محدَّد لها.
// حقل "مفتاح المعلم القديم (اختياري)" فوق زر جوجل مباشرة — لو مُلئ، يُستخدم مع تسجيل الدخول بجوجل
// لربط هذه الواجبات بالحساب دفعة واحدة (migrateLegacyKey في core/api.js)، ولو تُرك فارغاً يسجّل
// الدخول بجوجل فقط بلا أي عملية ربط. هذا افتراض صريح مني (Claude) لحلّ غموض "هل الربط إجباري؟" —
// اخترت جعله اختيارياً حتى لا يُطلب من المعلم أي بيانات إضافية إلا عند نقطة استخدام فعلية (نفس مبدأ
// بيانات المعلم/الختم في المنصة).
//
// ⚠️ افتراض صريح آخر: لو كانت جلسة جوجل أو المفتاح القديم محفوظَين على هذا الجهاز نعتبرهما صالحين
// فوراً بلا أي نداء شبكة (حتى يعمل فتح الشاشة بلا إنترنت). لو أصبحا خاطئَين، يرفضهما الخادم عند أول
// نداء فتُمسح النسخة المحلية (راجع core/homeworkApi.js) ويُطلب الدخول من جديد في المرة التالية.
import {
    call, ApiError, googleSignIn, migrateLegacyKey, GOOGLE_CLIENT_ID,
    clearAnyTeacherAuth, setTeacherKey, clearTeacherKey, isTeacherAuthed
} from '../core/api.js';
import { t } from '../core/i18n.js';
import { AppState } from '../core/app.js';

function injectSignOutChip() {
    if (document.getElementById('teacher-auth-chip')) return;
    const chip = document.createElement('button');
    chip.id = 'teacher-auth-chip';
    chip.type = 'button';
    chip.className = 'dh-teacher-auth-chip';
    chip.title = t('teacher_auth_signed_in_as');
    chip.textContent = '🔓 ' + t('teacher_auth_signout_btn');
    chip.addEventListener('click', () => {
        if (!confirm(t('teacher_auth_signout_confirm'))) return;
        clearAnyTeacherAuth();          // 🌟 [عدّل] يمسح جلسة جوجل والمفتاح القديم معاً أياً كان الفعّال
        chip.remove();
        location.reload();
    });
    document.body.appendChild(chip);
}

// 🌟 [جديد] ينتظر تحميل سكربت Google Identity Services (مُحمَّل من index.html بوسم async) — لا يُفترض
// أنه جاهز فوراً لحظة فتح المودال، لكنه عملياً يكون جاهزاً دائماً تقريباً لأنه في <head>.
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

    // ---- 🌟 [جديد] حقل اختياري لربط الواجبات القديمة قبل الضغط على زر جوجل ----
    const migrateToggle = document.createElement('button');
    migrateToggle.type = 'button';
    migrateToggle.className = 'dh-teacher-auth-linklike';
    migrateToggle.textContent = t('teacher_auth_migrate_toggle');
    const migrateWrap = document.createElement('div');
    migrateWrap.className = 'dh-teacher-auth-migrate-wrap';
    migrateWrap.style.display = 'none';
    const migrateLabel = document.createElement('label');
    migrateLabel.className = 'dh-teacher-auth-label';
    migrateLabel.htmlFor = 'teacher-auth-migrate-key';
    migrateLabel.textContent = t('teacher_auth_key_label');
    const migrateInput = document.createElement('input');
    migrateInput.type = 'password';
    migrateInput.id = 'teacher-auth-migrate-key';
    migrateInput.className = 'dh-teacher-auth-input';
    migrateInput.autocomplete = 'off';
    migrateInput.dir = 'ltr';
    const migrateHint = document.createElement('p');
    migrateHint.className = 'dh-teacher-auth-hint';
    migrateHint.textContent = t('teacher_auth_migrate_hint');
    migrateWrap.append(migrateLabel, migrateInput, migrateHint);
    migrateToggle.addEventListener('click', () => {
        const showing = migrateWrap.style.display !== 'none';
        migrateWrap.style.display = showing ? 'none' : 'block';
        if (!showing) migrateInput.focus();
    });

    // ---- زر جوجل ----
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

    // ---- فاصل + رابط الدخول بالمفتاح القديم فقط ----
    const divider = document.createElement('div');
    divider.className = 'dh-teacher-auth-divider';
    divider.textContent = t('teacher_auth_or');
    const legacyToggle = document.createElement('button');
    legacyToggle.type = 'button';
    legacyToggle.className = 'dh-teacher-auth-linklike';
    legacyToggle.textContent = t('teacher_auth_legacy_toggle');

    // ---- نموذج المفتاح القديم (كما كان بالضبط، مسار احتياطي كامل) ----
    const legacyForm = document.createElement('form');
    legacyForm.noValidate = true;
    legacyForm.className = 'dh-teacher-auth-legacy-form';
    legacyForm.style.display = 'none';
    const legacyLabel = document.createElement('label');
    legacyLabel.className = 'dh-teacher-auth-label';
    legacyLabel.htmlFor = 'teacher-auth-key';
    legacyLabel.textContent = t('teacher_auth_key_label');
    const legacyInput = document.createElement('input');
    legacyInput.type = 'password';
    legacyInput.id = 'teacher-auth-key';
    legacyInput.className = 'dh-teacher-auth-input';
    legacyInput.autocomplete = 'off';
    legacyInput.dir = 'ltr';
    const legacyErr = document.createElement('div');
    legacyErr.className = 'dh-teacher-auth-error';
    legacyErr.style.display = 'none';
    const legacyActions = document.createElement('div');
    legacyActions.className = 'dh-teacher-auth-actions';
    const legacySubmit = document.createElement('button');
    legacySubmit.type = 'submit';
    legacySubmit.className = 'btn dh-teacher-auth-submit';
    legacySubmit.textContent = t('teacher_auth_submit_btn');
    legacyActions.append(legacySubmit);
    legacyForm.append(legacyLabel, legacyInput, legacyErr, legacyActions);

    legacyToggle.addEventListener('click', () => {
        const showing = legacyForm.style.display !== 'none';
        legacyForm.style.display = showing ? 'none' : 'block';
        if (!showing) legacyInput.focus();
    });

    const cancelWrap = document.createElement('div');
    cancelWrap.className = 'dh-teacher-auth-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn btn-outline dh-teacher-auth-cancel';
    cancel.textContent = t('teacher_auth_cancel_btn');
    cancelWrap.append(cancel);

    box.append(
        title, sub,
        migrateToggle, migrateWrap,
        googleBtnHost, googleLoading, googleErr,
        divider, legacyToggle, legacyForm,
        cancelWrap
    );
    overlay.append(box);
    return {
        overlay, cancel,
        googleBtnHost, googleErr, googleLoading, migrateInput,
        legacyForm, legacyInput, legacyErr, legacySubmit
    };
}

// تُرجع true لو المعلم مفوَّض (بجلسة جوجل أو المفتاح القديم)، و false لو ألغى.
export async function ensureTeacherAuth() {
    if (isTeacherAuthed()) {
        injectSignOutChip();
        return true;
    }
    return new Promise((resolve) => {
        const {
            overlay, cancel,
            googleBtnHost, googleErr, googleLoading, migrateInput,
            legacyForm, legacyInput, legacyErr, legacySubmit
        } = buildModal();
        document.body.appendChild(overlay);

        let settled = false;
        const finish = (ok) => { if (settled) return; settled = true; overlay.remove(); resolve(ok); };

        cancel.addEventListener('click', () => finish(false));

        // ---- مسار جوجل (الطريقة الأساسية الجديدة) ----
        async function handleGoogleCredential(response) {
            googleErr.style.display = 'none';
            googleLoading.style.display = 'block';
            try {
                const legacyKey = migrateInput.value.trim();
                if (legacyKey) await migrateLegacyKey(response.credential, legacyKey);
                else await googleSignIn(response.credential);
                injectSignOutChip();
                finish(true);
            } catch (ex) {
                googleLoading.style.display = 'none';
                googleErr.textContent = (ex instanceof ApiError) ? t('teacher_auth_error_network') : t('teacher_auth_google_error');
                googleErr.style.display = 'block';
            }
        }

        waitForGoogleIdentity().then((ready) => {
            if (!ready) {
                // 🌟 تعذّر تحميل سكربت جوجل (حجب/إنترنت) — لا نكسر شيئاً، نُظهر المفتاح القديم مباشرة
                googleBtnHost.style.display = 'none';
                googleErr.textContent = t('teacher_auth_google_error');
                googleErr.style.display = 'block';
                legacyForm.style.display = 'block';
                legacyInput.focus();
                return;
            }
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
                googleBtnHost.style.display = 'none';
                googleErr.textContent = t('teacher_auth_google_error');
                googleErr.style.display = 'block';
                legacyForm.style.display = 'block';
            }
        });

        // ---- مسار المفتاح القديم (خط رجوع كامل — نفس منطق النسخة السابقة من هذا الملف) ----
        legacyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const key = legacyInput.value.trim();
            if (!key) { legacyInput.focus(); return; }
            legacySubmit.disabled = true;
            legacySubmit.textContent = t('teacher_auth_loading');
            legacyErr.style.display = 'none';
            try {
                setTeacherKey(key);
                await call('authCheck', {}, { teacher: true });      // تحقق حقيقي من الخادم
                injectSignOutChip();
                finish(true);
            } catch (ex) {
                clearTeacherKey();
                const wrongKey = (ex instanceof ApiError) && (ex.code === 'UNAUTHORIZED' || ex.code === 'LOCKED');
                legacyErr.textContent = t(wrongKey ? 'teacher_auth_error' : 'teacher_auth_error_network');
                legacyErr.style.display = 'block';
                legacySubmit.disabled = false;
                legacySubmit.textContent = t('teacher_auth_submit_btn');
            }
        });
    });
}
