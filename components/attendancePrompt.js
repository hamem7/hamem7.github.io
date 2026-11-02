// components/attendancePrompt.js
// =============================================================================
// 📅 سؤال الحضور: لا يُسأل المعلم إلا عن طالب لديه حصة مجدولة ولم يُسجَّل له أي نشاط في ذلك اليوم (لعبة فردية، مواجهة،
// جلسة تجويد). يظهر مرة يوميًا بعد ساعة الإغلاق (الافتراضي 17:00، localStorage.dh_att_prompt_hour) ويلتقط الأيام المفوَّتة (آخر 7 أيام).
// الإجابات تُحفظ في student.attendance عبر engine/attendanceEngine.js (حاضر، غائب بعذر، غائب، لم تُعقد).
// ⚠️ قيد: المنصة تعمل في المتصفح فلا إشعار والتطبيق مغلق؛ السؤال يظهر عند الفتح بعد الساعة المحددة.
// =============================================================================
import { AppState, t } from '../core/app.js';
import { tf } from '../core/i18n.js';
import '../core/i18n-badges.js';
import { esc } from '../core/escape.js';
import { needsConfirmation, setDayStatus, evidenceDays, dateKey, hasSchedule } from '../engine/attendanceEngine.js';
import { individualGames, readHistory } from '../core/badgeService.js';

const DAY_KEY = 'dh_att_prompt_day', HOUR_KEY = 'dh_att_prompt_hour', STYLE = 'dh-att-prompt-style';
const isEn = () => AppState.currentLang === 'en';
const first = (s) => String(s || '').trim().split(/\s+/)[0] || '';
const safeGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* اختياري */ } };

const CSS = `
#dhAttPrompt{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px}
#dhAttPrompt .box{width:min(560px,100%);max-height:86vh;overflow:auto;background:var(--dh-surface-1,#fff);color:var(--dh-ink,#222);border:1.5px solid var(--dh-border-strong,#bbb);border-radius:18px;padding:18px;display:grid;gap:12px}
#dhAttPrompt h3{margin:0;font-size:1.15rem} #dhAttPrompt p{margin:0;color:var(--dh-ink-soft,#666);font-size:.9rem;line-height:1.7}
#dhAttPrompt .row{background:var(--dh-surface-3,#fff);border:1.5px solid var(--dh-border,#ddd);border-radius:14px;padding:10px 12px;display:grid;gap:8px}
#dhAttPrompt .row.done{opacity:.55}
#dhAttPrompt .who{font-weight:800} #dhAttPrompt .day{font-size:.82rem;color:var(--dh-ink-soft,#666)}
#dhAttPrompt .opts{display:flex;flex-wrap:wrap;gap:6px}
#dhAttPrompt .opts button{border:1.5px solid var(--dh-border-strong,#aaa);background:var(--dh-surface-2,#fff);color:var(--dh-ink,#222);border-radius:999px;padding:6px 12px;font-weight:700;cursor:pointer}
#dhAttPrompt .opts button.ok{background:var(--dh-ok-bg,#e7f4ee);border-color:var(--dh-ok,#15803d)}
#dhAttPrompt .foot{display:flex;justify-content:flex-end}
#dhAttPrompt .foot button{border:0;border-radius:12px;padding:9px 18px;font-weight:800;cursor:pointer;background:var(--dh-primary,#0f5b3f);color:#fff}
`;

function dayLabel(key) {
  return new Date(key + 'T12:00:00').toLocaleDateString(isEn() ? 'en-GB' : 'ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** الأيام المعلّقة: [{student, key}] مرتبة من الأحدث. opts.studentId / opts.reportMonth تضيّق النطاق. */
export async function collectPending(opts = {}) {
  const mgr = AppState.studentManager;
  if (!mgr) return [];
  const students = (await mgr.getAllStudents()).filter(s => hasSchedule(s) && (opts.studentId == null || String(s.id) === String(opts.studentId)));
  if (!students.length) return [];
  let matches = [], sessions = [];
  try { if (AppState.dualTestsManager) matches = (await AppState.dualTestsManager.getAllMatches()).filter(m => m.status === 'completed' && m.finishedAt); } catch (e) { /* اختياري */ }
  try { if (AppState.tajweedManager) sessions = await AppState.tajweedManager.getAllSessions(); } catch (e) { /* اختياري */ }
  const today = new Date(), todayKey = dateKey(today), out = [];
  for (const s of students) {
    const ts = individualGames(readHistory(s.id)).map(g => g.timestamp);
    matches.forEach(m => { if (String(m.studentIdA) === String(s.id) || String(m.studentIdB) === String(s.id)) ts.push(new Date(m.finishedAt).getTime()); });
    sessions.forEach(x => { if (String(x.studentId) === String(s.id)) ts.push(typeof x.timestamp === 'number' ? x.timestamp : Date.parse(x.timestamp)); });
    const ev = evidenceDays(ts.filter(Number.isFinite));
    const sinceKey = s.schedule.since ? dateKey(s.schedule.since) : '0000-00-00';
    const keys = [];
    if (opts.reportMonth) {
      const last = new Date(opts.reportMonth.year, opts.reportMonth.monthIndex0 + 1, 0).getDate();
      for (let d = 1; d <= last; d++) keys.push(dateKey(new Date(opts.reportMonth.year, opts.reportMonth.monthIndex0, d)));
    } else {
      for (let i = 0; i < 7; i++) keys.push(dateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)));
    }
    keys.filter(k => k <= todayKey && k >= sinceKey && needsConfirmation(s, k, ev)).forEach(k => out.push({ student: s, key: k }));
  }
  return out.sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
}

export async function openAttendancePrompt(opts = {}) {
  const pending = await collectPending(opts);
  if (!pending.length) return false;
  if (!document.getElementById(STYLE)) { const st = document.createElement('style'); st.id = STYLE; st.textContent = CSS; document.head.appendChild(st); }
  document.getElementById('dhAttPrompt')?.remove();
  const root = document.createElement('div'); root.id = 'dhAttPrompt'; root.setAttribute('role', 'dialog');
  const choices = [['present', 'att_prompt_present'], ['absent_excused', 'att_prompt_absent_ex'], ['absent', 'att_prompt_absent'], ['cancelled', 'att_prompt_cancelled']];
  root.innerHTML = `<div class="box"><h3>${esc(t('att_prompt_title'))}</h3><p>${esc(t('att_prompt_sub'))}</p>
    ${pending.map((p, i) => `<div class="row" data-i="${i}"><div><span class="who">${esc(first(p.student.name))}</span> <span class="day">· ${esc(tf('att_prompt_day', { d: dayLabel(p.key) }))}</span></div>
      <div class="opts">${choices.map(([v, k]) => `<button type="button" data-v="${v}">${esc(t(k))}</button>`).join('')}</div></div>`).join('')}
    <div class="foot"><button type="button" id="dhAttClose">${esc(t('att_prompt_later'))}</button></div></div>`;
  document.body.appendChild(root);
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('.opts button');
    if (!b) return;
    const row = b.closest('.row'), p = pending[Number(row.dataset.i)];
    setDayStatus(p.student, p.key, b.dataset.v);
    try { await AppState.studentManager.updateStudent(p.student); } catch (err) { console.warn(err); return; }
    row.classList.add('done'); row.querySelectorAll('button').forEach(x => { x.disabled = true; x.classList.toggle('ok', x === b); });
    if (!root.querySelector('.row:not(.done)')) root.querySelector('#dhAttClose').textContent = t('att_prompt_done');
  });
  root.querySelector('#dhAttClose').onclick = () => root.remove();
  return true;
}

/** يُستدعى عند الإقلاع وكل 10 دقائق: يفتح السؤال مرة واحدة يوميًا بعد ساعة الإغلاق إن وُجد معلّق. */
export function startAttendancePromptWatcher() {
  const check = async () => {
    try {
      if (AppState.isKidsMode || document.getElementById('dhAttPrompt')) return;
      const now = new Date(), hour = Number(safeGet(HOUR_KEY)) || 17;
      if (now.getHours() < hour || safeGet(DAY_KEY) === dateKey(now)) return;
      if (await openAttendancePrompt()) safeSet(DAY_KEY, dateKey(now));
      else safeSet(DAY_KEY, dateKey(now));
    } catch (e) { console.warn('[attendancePrompt]', e); }
  };
  setTimeout(check, 4000);
  setInterval(check, 10 * 60 * 1000);
}
