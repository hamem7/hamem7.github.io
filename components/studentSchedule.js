// components/studentSchedule.js — جدول حصص الطالب (أيام + مدة) في ملفه الشخصي. منه يُحسب الحضور المتوقع والساعات.
import { AppState, t } from '../core/app.js';
import '../core/i18n-badges.js';
import { esc } from '../core/escape.js';
import { hasSchedule, WEEK_ORDER } from '../engine/attendanceEngine.js';

const MINUTES = [30, 45, 60];   // [2026-11] الخيارات الثلاثة فقط (مدة قديمة مخزنة مثل ٩٠ تبقى ظاهرة لصاحبها)

export function renderScheduleSection(student, container) {
  if (!container) return;
  const cur = hasSchedule(student) ? student.schedule : { days: [], minutes: 60 };
  const days = new Set((cur.days || []).map(Number));
  let minutes = Number(cur.minutes) || 60;
  const draw = () => {
    const MIN_LIST = MINUTES.includes(minutes) ? MINUTES : [...MINUTES, minutes].sort((a, b) => a - b);
    container.innerHTML = `<p class="pf-note" style="margin:0 0 8px;color:var(--dh-ink-soft)">${esc(t('att_sched_hint'))}</p>
      <div style="font-weight:700;margin:6px 0">${esc(t('att_sched_days'))}</div>
      <div class="sched-days" style="display:flex;flex-wrap:wrap;gap:6px">${WEEK_ORDER.map(d => `<button type="button" class="sched-day" data-d="${d}" aria-pressed="${days.has(d)}" style="border:1.5px solid var(--dh-border-strong);border-radius:999px;padding:6px 12px;font-weight:700;cursor:pointer;background:${days.has(d) ? 'var(--dh-primary,#0f5b3f)' : 'var(--dh-surface-3)'};color:${days.has(d) ? '#fff' : 'var(--dh-ink)'}">${esc(t('att_day_' + d))}</button>`).join('')}</div>
      <div style="font-weight:700;margin:10px 0 6px">${esc(t('att_sched_minutes'))}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${MIN_LIST.map(m => `<button type="button" class="sched-min" data-m="${m}" aria-pressed="${m === minutes}" style="border:1.5px solid var(--dh-border-strong);border-radius:999px;padding:6px 12px;font-weight:700;cursor:pointer;background:${m === minutes ? 'var(--dh-primary,#0f5b3f)' : 'var(--dh-surface-3)'};color:${m === minutes ? '#fff' : 'var(--dh-ink)'}">${m}</button>`).join('')}</div>
      <button type="button" id="sched-save" style="margin-top:12px;border:0;border-radius:12px;padding:9px 18px;font-weight:800;cursor:pointer;background:var(--dh-gold-500,#e8b923);color:#2b2100">${esc(t('att_sched_save'))}</button>`;
  };
  draw();
  container.onclick = async (e) => {
    const d = e.target.closest('.sched-day'), m = e.target.closest('.sched-min'), s = e.target.closest('#sched-save');
    if (d) { const n = Number(d.dataset.d); days.has(n) ? days.delete(n) : days.add(n); draw(); }
    else if (m) { minutes = Number(m.dataset.m); draw(); }
    else if (s) {
      if (days.size) student.schedule = { days: [...days].sort(), minutes, since: (student.schedule && student.schedule.since) || Date.now() };
      else delete student.schedule;
      try { await AppState.studentManager.updateStudent(student); s.textContent = t('att_sched_saved');
        // أول مرة يُحفظ فيها جدول: نسأل المعلم متى يحب ظهور سؤال الحضور (صباحًا أم مساءً)
        if (student.schedule) import('./attendancePrompt.js').then(m => { if (!m.getPromptSettings().configured) m.askAttendanceTime(); }).catch(() => {}); setTimeout(() => { const b = container.querySelector('#sched-save'); if (b) b.textContent = t('att_sched_save'); }, 1600); }
      catch (err) { console.warn(err); }
    }
  };
}
