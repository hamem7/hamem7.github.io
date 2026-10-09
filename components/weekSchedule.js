// components/weekSchedule.js
// ==========================================================
// 🌟 [جديد — تذكير الواجب الأسبوعي] شاشة «جدول الأسبوع»: أيام العمل في أعمدة، وكل طالب صف بأزرار أيامه. فوق كل يوم عدد
// واجباته مقابل الطاقة المتوازنة (إجمالي الخانات ÷ أيام العمل)، ويتلوّن بالأحمر إن زاد. التعديل يُحفظ فوراً في ملف الطالب.
// «وزّع تلقائيًا» يعيد التوزيع المتوازن للجميع. أيام العمل قابلة للتعديل (الافتراضي السبت إلى الخميس).
// النصوص ثنائية اللغة عبر L(ar, en) (نصوص هذه الميزة فقط).
// ==========================================================

import { esc } from '../core/escape.js';
import { isEnglish } from '../core/i18n.js';
import { gapsOf, MIN_GAP_DAYS, WEEKDAY_AR, WEEKDAY_EN } from '../engine/hwSchedule.js';
import { getWeekModel, setStudentDays, rebalanceAllStudents, setWorkDays, ensureSchedules } from '../core/hwScheduleService.js';

const L = (ar, en) => (isEnglish() ? en : ar);
const dayName = (d, short = false) => (isEnglish() ? WEEKDAY_EN[d] : (short ? WEEKDAY_AR[d].replace('الأ', 'أ') : WEEKDAY_AR[d]));

function injectStyle() {
    if (document.getElementById('ws-style')) return;
    const st = document.createElement('style');
    st.id = 'ws-style';
    st.textContent = `
    .ws-ov{position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:100000;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:14px}
    .ws-box{background:#fff;color:#0f172a;border-radius:16px;max-width:860px;width:100%;padding:16px 16px 20px;box-shadow:0 20px 50px rgba(0,0,0,.3);text-align:right}
    .ws-head{display:flex;justify-content:space-between;align-items:center;gap:10px}
    .ws-head h2{margin:0;font-size:1.2rem}
    .ws-x{border:0;background:#f1f5f9;border-radius:10px;width:36px;height:36px;font-size:1.1rem;cursor:pointer}
    .ws-note{font-size:.88rem;color:#64748b;margin:6px 0 10px;line-height:1.7}
    .ws-bar{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;margin:8px 0 12px;font-size:.92rem}
    .ws-btn{border:0;border-radius:999px;padding:8px 16px;font-size:.92rem;font-weight:700;font-family:inherit;cursor:pointer;background:#047857;color:#fff}
    .ws-btn.alt{background:#e2e8f0;color:#334155}
    .ws-wd{display:inline-flex;gap:4px;align-items:center;cursor:pointer;background:#f1f5f9;border-radius:999px;padding:3px 10px}
    .ws-tbl{width:100%;border-collapse:separate;border-spacing:0 4px;font-size:.92rem}
    .ws-tbl th{font-weight:700;color:#334155;padding:4px 2px;text-align:center;white-space:nowrap}
    .ws-tbl th small{display:block;font-weight:700;font-size:.78rem;border-radius:999px;margin-top:2px;padding:1px 6px}
    .ws-ok{background:#dcfce7;color:#166534}.ws-over{background:#fee2e2;color:#b91c1c}
    .ws-tbl td{padding:3px 2px;text-align:center;background:#f8fafc}
    .ws-tbl td.ws-name{text-align:right;padding:6px 10px;border-radius:0 10px 10px 0;font-weight:600;background:#f8fafc;min-width:110px}
    .ws-tbl td.ws-st{border-radius:10px 0 0 10px;font-size:.78rem;color:#b45309;min-width:70px}
    .ws-d{width:36px;height:30px;border-radius:8px;border:2px solid #cbd5e1;background:#fff;cursor:pointer;font-family:inherit;font-size:.85rem;color:#94a3b8}
    .ws-d.on{background:#047857;border-color:#047857;color:#fff;font-weight:800}
    .ws-d.off{opacity:.5}
    `;
    document.head.appendChild(st);
}

export async function openWeekSchedule({ onClose } = {}) {
    injectStyle();
    try { await ensureSchedules(); } catch (e) { console.warn(e); }
    const ov = document.createElement('div');
    ov.className = 'ws-ov';
    ov.innerHTML = `<div class="ws-box" role="dialog" aria-modal="true">
        <div class="ws-head"><h2>📅 ${esc(L('جدول الواجبات الأسبوعي', 'Weekly homework schedule'))}</h2><button class="ws-x" aria-label="${esc(L('إغلاق', 'Close'))}">✕</button></div>
        <div id="ws-body"></div></div>`;
    document.body.appendChild(ov);
    const close = () => { ov.remove(); if (onClose) onClose(); };
    ov.querySelector('.ws-x').addEventListener('click', close);
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    const body = ov.querySelector('#ws-body');

    async function render() {
        const m = await getWeekModel();
        const allDays = [...m.workDays];
        m.students.forEach(s => ((s.hwSchedule && s.hwSchedule.days) || []).forEach(d => { if (!allDays.includes(d)) allDays.push(d); }));   // يوم مُسنَد خارج أيام العمل لا يختفي
        const order = [6, 0, 1, 2, 3, 4, 5];
        allDays.sort((a, b) => order.indexOf(a) - order.indexOf(b));
        const sum = new Map(m.summary.perDay.map(x => [x.day, x]));
        const head = allDays.map(d => {
            const x = sum.get(d);
            const cnt = x ? x.count : m.students.filter(s => ((s.hwSchedule && s.hwSchedule.days) || []).includes(d)).length;
            const over = x ? x.over : cnt > 0;
            return `<th>${esc(dayName(d, true))}<small class="${over ? 'ws-over' : 'ws-ok'}">${cnt}/${m.summary.capacity}</small></th>`;
        }).join('');
        const rows = m.students.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar')).map(s => {
            const days = (s.hwSchedule && s.hwSchedule.days) || [];
            const gap = days.length > 1 && Math.min(...gapsOf(days)) < MIN_GAP_DAYS;
            const status = days.length === 0 ? L('موقوف', 'Paused') : (gap ? L('أيام متلاصقة', 'Adjacent days') : '');
            return `<tr data-id="${esc(s.id)}"><td class="ws-name">${esc(s.name)}</td>${allDays.map(d => `<td><button type="button" class="ws-d${days.includes(d) ? ' on' : ''}${m.workDays.includes(d) ? '' : ' off'}" data-d="${d}" aria-pressed="${days.includes(d)}">${days.includes(d) ? '✓' : ''}</button></td>`).join('')}<td class="ws-st">${esc(status)}</td></tr>`;
        }).join('');
        const wdBoxes = [6, 0, 1, 2, 3, 4, 5].map(d => `<label class="ws-wd"><input type="checkbox" data-wd="${d}" ${m.workDays.includes(d) ? 'checked' : ''}> ${esc(dayName(d))}</label>`).join('');
        body.innerHTML = `
            <div class="ws-note">${esc(L(`كل طالب له يومان أسبوعياً يوزّعهما النظام بفاصل يومين على الأقل حتى لا تزدحم أيامك. الطاقة المتوازنة لليوم الواحد: ${m.summary.capacity} (إجمالي ${m.summary.totalSlots} خانة ÷ ${m.workDays.length} أيام عمل). اضغط على يوم لإضافته أو إزالته، وإزالة كل أيام طالب توقف تذكيره.`,
                `Each student has two spaced days a week assigned by the system so your days stay balanced. Balanced capacity per day: ${m.summary.capacity} (${m.summary.totalSlots} slots ÷ ${m.workDays.length} work days). Tap a day to add or remove it; removing all days pauses the student's reminders.`))}</div>
            <div class="ws-bar"><b>${esc(L('أيام العمل:', 'Work days:'))}</b>${wdBoxes}<button type="button" class="ws-btn" id="ws-rebalance">⚖️ ${esc(L('وزّع تلقائياً', 'Auto-distribute'))}</button></div>
            ${m.students.length ? `<div style="overflow-x:auto"><table class="ws-tbl"><thead><tr><th></th>${head}<th></th></tr></thead><tbody>${rows}</tbody></table></div>`
                : `<div class="ws-note">${esc(L('لا طلاب مسجَّلون بعد.', 'No students yet.'))}</div>`}`;

        body.querySelectorAll('.ws-d').forEach(btn => btn.addEventListener('click', async () => {
            const id = btn.closest('tr').dataset.id;
            const student = m.students.find(s => String(s.id) === String(id));
            const d = Number(btn.dataset.d);
            const cur = (student.hwSchedule && student.hwSchedule.days) || [];
            await setStudentDays(student, cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d]);
            await render();
        }));
        body.querySelectorAll('input[data-wd]').forEach(cb => cb.addEventListener('change', async () => {
            const days = [...body.querySelectorAll('input[data-wd]:checked')].map(x => Number(x.dataset.wd));
            if (!days.length) { cb.checked = true; return; }
            setWorkDays(days);
            await render();
        }));
        body.querySelector('#ws-rebalance')?.addEventListener('click', async () => {
            if (!confirm(L('سيُعاد توزيع كل الطلاب (عدا الموقوفين) توزيعاً متوازناً جديداً وتتغيّر أيامهم الحالية. متابعة؟', 'All students (except paused ones) will be redistributed in a new balanced way and their current days will change. Continue?'))) return;
            await rebalanceAllStudents();
            await render();
        });
    }
    await render();
    return ov;
}
