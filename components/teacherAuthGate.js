// components/teacherAuthGate.js
// ==========================================================
// 🌟🌟 [أُعيدت كتابته] بوابة "مفتاح المعلم" لنظام الواجبات
// ==========================================================
// كان هذا الملف مكتوباً لتسجيل دخول Supabase (بريد/كلمة سر) ولم يكن مربوطاً بأي شاشة ولا له مفاتيح ترجمة.
// بعد اعتماد خادم Google Apps Script لنظام الواجبات، صار الدخول بـ"مفتاح المعلم" (نص سري من 12 خانة يُنشأ مرة
// واحدة عند إعداد الخادم ويُحفظ في Script Properties لا في أي ملف). المنصة لمعلم واحد، فلا حاجة لحسابات.
//
// متى تظهر؟ فقط عند فتح شاشات المعلم التي تتعامل مع بيانات الطلاب الحقيقية على الخادم (إعداد الواجبات وتصحيحها،
// والتقرير الشهري). لا تظهر أبداً لأي شاشة يدخلها الطالب (الترحيب بالواجب وحله).
//
// ⚠️ افتراض صريح: لو كان المفتاح محفوظاً على هذا الجهاز نعتبره صالحاً فوراً بلا أي نداء شبكة (حتى يعمل فتح
// الشاشة والمسودات المحلية بلا إنترنت). لو كان خاطئاً/مغيَّراً، يرفضه الخادم عند أول نداء فتُمسح النسخة المحلية
// (راجع core/homeworkApi.js) ويُطلب منك إدخاله من جديد في المرة التالية.
import { call, ApiError, getTeacherKey, setTeacherKey, clearTeacherKey } from '../core/api.js';
import { t } from '../core/i18n.js';

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
        clearTeacherKey();
        chip.remove();
        location.reload();
    });
    document.body.appendChild(chip);
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
    sub.textContent = t('teacher_auth_subtitle');

    const form = document.createElement('form');
    form.noValidate = true;
    const label = document.createElement('label');
    label.className = 'dh-teacher-auth-label';
    label.htmlFor = 'teacher-auth-key';
    label.textContent = t('teacher_auth_key_label');
    const input = document.createElement('input');
    input.type = 'password';
    input.id = 'teacher-auth-key';
    input.className = 'dh-teacher-auth-input';
    input.autocomplete = 'off';
    input.dir = 'ltr';
    const err = document.createElement('div');
    err.className = 'dh-teacher-auth-error';
    err.style.display = 'none';
    const actions = document.createElement('div');
    actions.className = 'dh-teacher-auth-actions';
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'btn dh-teacher-auth-submit';
    submit.textContent = t('teacher_auth_submit_btn');
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn btn-outline dh-teacher-auth-cancel';
    cancel.textContent = t('teacher_auth_cancel_btn');
    actions.append(submit, cancel);
    form.append(label, input, err, actions);
    box.append(title, sub, form);
    overlay.append(box);
    return { overlay, form, input, err, submit, cancel };
}

// تُرجع true لو المعلم مفوَّض (المفتاح موجود أو أُدخل وتم التحقق منه)، و false لو ألغى.
export async function ensureTeacherAuth() {
    if (getTeacherKey()) {
        injectSignOutChip();
        return true;
    }
    return new Promise((resolve) => {
        const { overlay, form, input, err, submit, cancel } = buildModal();
        document.body.appendChild(overlay);
        input.focus();

        cancel.addEventListener('click', () => { overlay.remove(); resolve(false); });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const key = input.value.trim();
            if (!key) { input.focus(); return; }
            submit.disabled = true;
            submit.textContent = t('teacher_auth_loading');
            err.style.display = 'none';
            try {
                setTeacherKey(key);
                await call('authCheck', {}, { teacher: true });      // تحقق حقيقي من الخادم
                overlay.remove();
                injectSignOutChip();
                resolve(true);
            } catch (ex) {
                clearTeacherKey();
                const wrongKey = (ex instanceof ApiError) && (ex.code === 'UNAUTHORIZED' || ex.code === 'LOCKED');
                err.textContent = t(wrongKey ? 'teacher_auth_error' : 'teacher_auth_error_network');
                err.style.display = 'block';
                submit.disabled = false;
                submit.textContent = t('teacher_auth_submit_btn');
            }
        });
    });
}
