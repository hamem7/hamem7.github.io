// components/newStudentChoice.js
//
// 🌟 [جديد 2026-10-03] شاشة "ماذا تريد أن تبدأ معه؟" التي تظهر مباشرة بعد نجاح تسجيل أي طالب جديد
// (من «أبدأ من هنا» أو من «طلابي» — كلاهما يمر على نفس زر الحفظ في student/student.js).
// الخيارات: 🧒 ألعاب الصغار / 🧑 ألعاب الكبار → يفتح ألعاب الطالب نفسه عبر onChoose(kids)،
// و«العودة إلى طلابي» (ثانوي) → يغلق الشاشة فقط ويبقى المعلم في «طلابي».
//
// لا تغيّر أي بيانات ولا تلمس قاعدة البيانات: مجرد بطاقة تُنشأ ديناميكياً وتُحذف بعد الاستخدام.
// العزل: كل قواعد CSS ببادئة dh-nsc- ومحقونة من هذا الملف (لا لمس لأي CSS عام)، بألوان الهوية
// --dh-emerald/--dh-gold مع قيم احتياطية (نفس نمط components/pausedSession.js).

import { t, tf } from '../core/i18n.js';

const STYLE_ID = 'dh-nsc-style';
const OVERLAY_ID = 'dh-nsc-overlay';

function injectStyleOnce() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
    #${OVERLAY_ID} { position: fixed; inset: 0; z-index: 10070; display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; background: rgba(15, 23, 42, 0.55); }
    #${OVERLAY_ID} .dh-nsc-card { width: min(92vw, 420px); box-sizing: border-box; background: #fff; border-radius: 22px; padding: 26px 22px 20px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.3); border-top: 6px solid var(--dh-gold-500, #d4a017); font-family: 'Tajawal', sans-serif; }
    #${OVERLAY_ID} .dh-nsc-title { margin: 0 0 6px; font-size: 1.4rem; line-height: 1.5; color: var(--dh-emerald-700, #047857); word-break: break-word; }
    #${OVERLAY_ID} .dh-nsc-question { margin: 0 0 18px; font-size: 1.1rem; color: #475569; font-weight: bold; }
    #${OVERLAY_ID} .dh-nsc-actions { display: flex; flex-direction: column; gap: 10px; }
    #${OVERLAY_ID} .dh-nsc-btn { border: 0; border-radius: 14px; padding: 13px 16px; font-size: 1.15rem; font-weight: bold; cursor: pointer; font-family: inherit; }
    #${OVERLAY_ID} .dh-nsc-btn-kids { background: var(--dh-emerald-700, #047857); color: #fff; }
    #${OVERLAY_ID} .dh-nsc-btn-adults { background: var(--dh-gold-500, #d4a017); color: #3a2c1f; }
    #${OVERLAY_ID} .dh-nsc-btn-back { background: none; color: #64748b; font-size: 0.95rem; font-weight: normal; text-decoration: underline; padding: 8px; margin-top: 4px; }
    `;
    document.head.appendChild(style);
}

function escapeText(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
}

/**
 * يعرض شاشة اختيار المسار للطالب الذي سُجِّل للتو.
 * @param {Object} student - سجل الطالب المحفوظ (يُستعمل اسمه فقط للعرض)
 * @param {{onChoose: function(boolean): void}} opts
 *   onChoose(kids): يُستدعى بعد إغلاق الشاشة — true = ألعاب الصغار، false = ألعاب الكبار.
 *   «العودة إلى طلابي» تغلق الشاشة بلا أي استدعاء.
 */
export function showNewStudentChoice(student, opts = {}) {
    injectStyleOnce();
    document.getElementById(OVERLAY_ID)?.remove();

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = `
        <div class="dh-nsc-card" role="dialog" aria-modal="true">
            <h3 class="dh-nsc-title">${escapeText(tf('nsc_title', { name: student && student.name ? student.name : '' }))}</h3>
            <p class="dh-nsc-question">${escapeText(t('nsc_question'))}</p>
            <div class="dh-nsc-actions">
                <button type="button" class="dh-nsc-btn dh-nsc-btn-kids" data-act="kids">${escapeText(t('nsc_kids_btn'))}</button>
                <button type="button" class="dh-nsc-btn dh-nsc-btn-adults" data-act="adults">${escapeText(t('nsc_adults_btn'))}</button>
                <button type="button" class="dh-nsc-btn dh-nsc-btn-back" data-act="back">${escapeText(t('nsc_back_btn'))}</button>
            </div>
        </div>`;

    const close = () => overlay.remove();
    const choose = (kids) => {
        close();
        if (typeof opts.onChoose === 'function') opts.onChoose(kids);
    };
    overlay.querySelector('[data-act="kids"]').addEventListener('click', () => choose(true));
    overlay.querySelector('[data-act="adults"]').addEventListener('click', () => choose(false));
    overlay.querySelector('[data-act="back"]').addEventListener('click', close);

    document.body.appendChild(overlay);
}
