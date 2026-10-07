// components/juzAmmaCoverageNote.js
// 🌟 [جديد] تنبيه تغطية السور لجزء عمّ (الجزء 30): عند اختيار جزء عمّ بعدد أسئلة أقل من عدد سوره (37)، يظهر
// تحت حقل عدد الأسئلة: «النطاق فيه 37 سورة، وهذا الاختبار يغطي N منها. السور الباقية ستأتي في الاختبارات القادمة»
// مع زر «اجعلها 37 سؤالاً». التنبيه فقط — لا يُغيَّر العدد إلا بضغط المعلم على الزر (قراره في طول الاختبار).
// يُستعمل في شاشة الاختبار (settings/dashboard.js) وشاشة تجهيز الواجب (settings/homework-prep.js).
import { t, tf } from '../core/app.js';

const JUZ_AMMA_NUMBER = 30;
const JUZ_AMMA_SURAHS = 114 - 78 + 1; // النبأ (78) … الناس (114)

export function attachJuzAmmaCoverageNote(juzSelectId, countInputId) {
    const juzSel = document.getElementById(juzSelectId);
    const countInput = document.getElementById(countInputId);
    if (!juzSel || !countInput || document.getElementById(countInputId + '-coverage-note')) return;

    const note = document.createElement('div');
    note.id = countInputId + '-coverage-note';
    note.style.cssText = 'display:none; margin-top:8px; padding:10px 12px; border-radius:10px; background:#fef3c7; border:1px solid #fcd34d; color:#78350f; font-size:1rem; line-height:1.7; text-align:right;';
    const text = document.createElement('span');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.style.cssText = 'margin-inline-start:8px; padding:4px 12px; border:none; border-radius:8px; background:#f59e0b; color:#fff; font-family:inherit; font-size:1rem; font-weight:700; cursor:pointer;';
    btn.addEventListener('click', () => {
        countInput.value = String(JUZ_AMMA_SURAHS);
        refresh();
    });
    note.append(text, btn);
    countInput.parentNode.appendChild(note);

    function refresh() {
        const n = parseInt(countInput.value);
        const show = parseInt(juzSel.value) === JUZ_AMMA_NUMBER && n > 0 && n < JUZ_AMMA_SURAHS;
        note.style.display = show ? 'block' : 'none';
        if (!show) return;
        text.textContent = tf('juz_amma_coverage_note', { total: JUZ_AMMA_SURAHS, n });
        btn.textContent = tf('juz_amma_coverage_btn', { total: JUZ_AMMA_SURAHS });
    }

    juzSel.addEventListener('change', refresh);
    countInput.addEventListener('input', refresh);
    refresh();
}

// 🌟 [جديد] نفس التنبيه لوضع الصغار: النطاق عندهم «من سورة … إلى سورة …» (لا خيار جزء كامل)، فعدد السور =
// |إلى − من| + 1. الزر يرفع العدد لعدد السور بحد أقصى KIDS_MAX_QUESTIONS (37 = سور عمّ)، والقرار للمعلم.
export const KIDS_MAX_QUESTIONS = JUZ_AMMA_SURAHS;

export function attachKidsRangeCoverageNote(fromSelectId, toSelectId, countInputId) {
    const fromSel = document.getElementById(fromSelectId);
    const toSel = document.getElementById(toSelectId);
    const countInput = document.getElementById(countInputId);
    if (!fromSel || !toSel || !countInput || document.getElementById(countInputId + '-coverage-note')) return;

    const note = document.createElement('div');
    note.id = countInputId + '-coverage-note';
    note.style.cssText = 'display:none; margin-top:8px; padding:10px 12px; border-radius:10px; background:#fef3c7; border:1px solid #fcd34d; color:#78350f; font-size:1rem; line-height:1.7; text-align:right;';
    const text = document.createElement('span');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.style.cssText = 'margin-inline-start:8px; padding:4px 12px; border:none; border-radius:8px; background:#f59e0b; color:#fff; font-family:inherit; font-size:1rem; font-weight:700; cursor:pointer;';
    note.append(text, btn);
    countInput.parentNode.appendChild(note);

    let target = 0;
    btn.addEventListener('click', () => {
        countInput.value = String(target);
        refresh();
    });

    function refresh() {
        const from = parseInt(fromSel.value);
        const to = parseInt(toSel.value);
        const n = parseInt(countInput.value);
        const total = (from > 0 && to > 0) ? Math.abs(to - from) + 1 : 0;
        target = Math.min(total, KIDS_MAX_QUESTIONS);
        const show = total > 0 && n > 0 && n < target;
        note.style.display = show ? 'block' : 'none';
        if (!show) return;
        text.textContent = tf('juz_amma_coverage_note', { total, n });
        btn.textContent = tf('juz_amma_coverage_btn', { total: target });
    }

    fromSel.addEventListener('change', refresh);
    toSel.addEventListener('change', refresh);
    countInput.addEventListener('input', refresh);
    refresh();
}
