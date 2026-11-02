// components/scheduleManager.js
// =============================================================================
// 📅 «جدول الحصص والحضور» من شاشة «طلابي»: قائمة كل الطلاب مع أيام حصصهم ومدتها (تعديل بنقرة)، وأعلاها وقت سؤال الحضور
// الذي يختاره المعلم (صباحًا أو مساءً، أو إيقافه). الجدول نفسه يُحفظ في student.schedule (components/studentSchedule.js).
// =============================================================================
import { AppState, t } from '../core/app.js';
import '../core/i18n-badges.js';
import { esc } from '../core/escape.js';
import { hasSchedule } from '../engine/attendanceEngine.js';
import { renderScheduleSection } from './studentSchedule.js';
import { askAttendanceTime, describePromptSettings } from './attendancePrompt.js';

const ID = 'dhSchedMgr';
const first = (s) => String(s || '').trim().split(/\s+/)[0] || '';

function daysSummary(s) {
  if (!hasSchedule(s)) return t('att_mgr_none');
  return s.schedule.days.map(d => t('att_day_' + d)).join(isEn() ? ', ' : '، ') + ' · ' + s.schedule.minutes + (isEn() ? ' min' : ' د');
}
const isEn = () => AppState.currentLang === 'en';

export async function openScheduleManager() {
  document.getElementById(ID)?.remove();
  const students = (await AppState.studentManager.getAllStudents()).sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar'));
  const root = document.createElement('div'); root.id = ID; root.setAttribute('role', 'dialog');
  root.style.cssText = 'position:fixed;inset:0;z-index:9050;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:14px';
  const draw = () => {
    root.innerHTML = `<div style="width:min(620px,100%);max-height:90vh;overflow:auto;background:var(--dh-surface-1,#fff);color:var(--dh-ink,#222);border:1.5px solid var(--dh-border-strong,#bbb);border-radius:18px;padding:16px;display:grid;gap:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h3 style="margin:0;font-size:1.15rem">${esc(t('att_mgr_title'))}</h3>
        <button type="button" id="dhSmClose" style="border:0;border-radius:10px;padding:7px 14px;font-weight:800;cursor:pointer;background:var(--dh-surface-3,#eee);color:var(--dh-ink,#222)">${esc(t('att_mgr_close'))}</button></div>
      <div style="background:var(--dh-surface-2,#f6f3e8);border:1.5px dashed var(--dh-border-strong,#bbb);border-radius:14px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <span>⏰ ${esc(describePromptSettings())}</span><button type="button" id="dhSmTime" style="border:0;border-radius:10px;padding:7px 14px;font-weight:800;cursor:pointer;background:var(--dh-gold-500,#e8b923);color:#2b2100">${esc(t('att_time_change'))}</button></div>
      ${students.length ? students.map((s, i) => `<div class="sm-row" data-i="${i}" style="background:var(--dh-surface-3,#fff);border:1.5px solid var(--dh-border,#ddd);border-radius:14px;padding:10px 12px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div><b>${esc(first(s.name))}</b><div style="font-size:.82rem;color:var(--dh-ink-soft,#666)">${esc(daysSummary(s))}</div></div>
        <button type="button" class="sm-edit" data-i="${i}" style="border:1.5px solid var(--dh-border-strong,#aaa);background:var(--dh-surface-2,#fff);color:var(--dh-ink,#222);border-radius:999px;padding:6px 14px;font-weight:700;cursor:pointer">${esc(t('att_mgr_edit'))}</button></div>
        <div class="sm-body" data-i="${i}" style="display:none;margin-top:10px"></div></div>`).join('') : `<p>${esc(t('att_mgr_empty'))}</p>`}</div>`;
  };
  draw(); document.body.appendChild(root);
  root.addEventListener('click', (e) => {
    if (e.target.closest('#dhSmClose') || e.target === root) { root.remove(); return; }
    if (e.target.closest('#dhSmTime')) { askAttendanceTime().then(() => { draw(); }); return; }
    if (e.target.closest('#sched-save')) {
      // بعد الحفظ نحدّث سطر الملخّص تحت اسم الطالب دون إعادة رسم النافذة
      const body = e.target.closest('.sm-body');
      setTimeout(() => { const row = body && body.closest('.sm-row'); if (row) row.querySelector('div > div > div').textContent = daysSummary(students[Number(body.dataset.i)]); }, 400);
      return;
    }
    const ed = e.target.closest('.sm-edit');
    if (ed) {
      const body = root.querySelector(`.sm-body[data-i="${ed.dataset.i}"]`), open = body.style.display !== 'none';
      if (open) { body.style.display = 'none'; return; }
      body.style.display = 'block';
      renderScheduleSection(students[Number(ed.dataset.i)], body);
    }
  });
}
