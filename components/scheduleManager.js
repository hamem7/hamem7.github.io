// components/scheduleManager.js
// =============================================================================
// 📅 تبويب «الحصص والحضور» داخل «طلابي» (student/my-students.html): قائمة كل الطلاب باسمهم كاملًا، وبالضغط على اسم
// الطالب تنزل تحته قائمة بأيام الحصص ومدتها (٣٠ / ٤٥ / ٦٠ دقيقة). كل اختيار يُحفظ تلقائيًا فور الضغط (بلا زر حفظ).
// أعلاها وقت سؤال الحضور الذي يختاره المعلم (صباحًا أو مساءً، أو إيقافه). الجدول يُحفظ في student.schedule
// ({days, minutes, since}) — نفس النموذج الذي يعرضه ملف الطالب (components/studentSchedule.js) فلا تغيير في البيانات.
// ⚠️ لو كان لطالب قديم مدة غير الثلاث (مثلًا ٩٠) تبقى ظاهرة له ولا تُفقد؛ الخيارات الجديدة للتعديل فقط ٣٠/٤٥/٦٠.
// =============================================================================
import { AppState, t } from '../core/app.js';
import '../core/i18n-badges.js';
import { esc } from '../core/escape.js';
import { hasSchedule } from '../engine/attendanceEngine.js';
import { askAttendanceTime, describePromptSettings } from './attendancePrompt.js';

export const SCHEDULE_MINUTES = [30, 45, 60];
const isEn = () => AppState.currentLang === 'en';

function daysSummary(s) {
  if (!hasSchedule(s)) return t('ms_sched_none');
  const days = [...s.schedule.days].map(Number).sort((a, b) => a - b).map(d => t('att_day_' + d)).join(isEn() ? ', ' : '، ');
  return `${days} · ${s.schedule.minutes} ${t('ms_min_unit')}`;
}

function minutesOptions(current) {
  const list = SCHEDULE_MINUTES.includes(current) ? SCHEDULE_MINUTES : [...SCHEDULE_MINUTES, current].sort((a, b) => a - b);
  return list;
}

export async function renderScheduleTab(container) {
  if (!container) return;
  const students = (await AppState.studentManager.getAllStudents())
    .filter(s => !s.isHidden)
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar'));
  if (!container.isConnected) return;
  let openId = null;        // الطالب المفتوح (واحد في كل مرة)
  let savedId = null;       // آخر طالب حُفظ له (لإظهار «حُفظ تلقائيًا»)
  let query = '';           // نص مربع البحث فوق الأسماء

  // الهيكل يُرسم مرة واحدة فيبقى مربع البحث ثابتًا (لا يفقد التركيز أثناء الكتابة)؛ draw يحدّث الوقت والقائمة فقط
  container.innerHTML = `<div class="ms-sched"><span data-sm-when></span><button type="button" class="ms-btn line" data-sm-time>${esc(t('ms_sched_time_btn'))}</button></div>
      <p class="ms-hint">${esc(t('ms_sched_hint'))}</p>
      <input type="search" class="ms-search" data-sm-search placeholder="${esc(t('as_search_ph'))}" aria-label="${esc(t('as_search_ph'))}">
      <div class="as-list" data-sm-list></div>`;
  const whenEl = container.querySelector('[data-sm-when]');
  const listEl = container.querySelector('[data-sm-list]');
  const searchEl = container.querySelector('[data-sm-search]');
  const norm = (v) => String(v || '').toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();

  const draw = () => {
    whenEl.textContent = `⏰ ${describePromptSettings()}`;
    const q = norm(query);
    const shown = q ? students.filter(s => norm(s.name).includes(q)) : students;
    listEl.innerHTML = !students.length ? `<div class="as-empty">${esc(t('att_mgr_empty'))}</div>`
      : !shown.length ? `<div class="as-empty">${esc(t('as_no_match'))}</div>`
      : shown.map(s => {
        const open = openId === s.id, cur = hasSchedule(s) ? s.schedule : { days: [], minutes: 60 };
        const days = new Set((cur.days || []).map(Number)), mins = Number(cur.minutes) || 60;
        return `<div class="ms-acc${open ? ' open' : ''}" data-id="${esc(s.id)}">
          <button type="button" class="ms-acc-h" data-sm-open="${esc(s.id)}" aria-expanded="${open}">
            <span class="nm"><b>${esc(s.name)}</b><small>${esc(daysSummary(s))}</small></span>
            <svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="ms-acc-b">
            <label>${esc(t('att_sched_days'))}</label>
            <div class="ms-dayp">${[0, 1, 2, 3, 4, 5, 6].map(d => `<button type="button" class="${days.has(d) ? 'on' : ''}" data-sm-day="${d}" aria-pressed="${days.has(d)}">${esc(t('att_day_' + d))}</button>`).join('')}</div>
            <label>${esc(t('att_sched_minutes'))}</label>
            <div class="ms-minp">${minutesOptions(mins).map(m => `<button type="button" class="${m === mins ? 'on' : ''}" data-sm-min="${m}" aria-pressed="${m === mins}">${m}</button>`).join('')}</div>
            <div class="ms-saved" role="status">${savedId === s.id ? esc(t('att_sched_saved')) : ''}</div>
          </div>
        </div>`;
      }).join('');
  };
  searchEl.addEventListener('input', () => { query = searchEl.value; draw(); });

  // حفظ تلقائي: كل ضغطة على يوم أو مدة تُكتب فورًا في سجل الطالب
  async function save(student, days, minutes) {
    if (days.length) student.schedule = { days: [...days].sort((a, b) => a - b), minutes, since: (student.schedule && student.schedule.since) || Date.now() };
    else delete student.schedule;
    try {
      await AppState.studentManager.updateStudent(student);
      savedId = student.id;
      // أول جدول يُحفظ: نسأل المعلم متى يحب ظهور سؤال الحضور (مرة واحدة)
      if (student.schedule) import('./attendancePrompt.js').then(m => { if (!m.getPromptSettings().configured) m.askAttendanceTime().then(draw); }).catch(() => {});
    } catch (err) { console.warn('[scheduleManager] تعذر الحفظ التلقائي:', err); savedId = null; }
  }

  container.onclick = async (e) => {
    if (e.target.closest('[data-sm-search]')) return;
    if (e.target.closest('[data-sm-time]')) { askAttendanceTime().then(draw); return; }
    const head = e.target.closest('[data-sm-open]');
    if (head) { const id = head.dataset.smOpen; openId = String(openId) === id ? null : students.find(s => String(s.id) === id)?.id; savedId = null; draw(); return; }
    const box = e.target.closest('.ms-acc'); if (!box) return;
    const student = students.find(s => String(s.id) === box.dataset.id); if (!student) return;
    const cur = hasSchedule(student) ? student.schedule : { days: [], minutes: 60 };
    const days = new Set((cur.days || []).map(Number));
    let minutes = Number(cur.minutes) || 60;
    const day = e.target.closest('[data-sm-day]'), min = e.target.closest('[data-sm-min]');
    if (day) { const n = Number(day.dataset.smDay); days.has(n) ? days.delete(n) : days.add(n); }
    else if (min) { minutes = Number(min.dataset.smMin); }
    else return;
    await save(student, [...days], minutes);
    draw();
  };
  draw();
}
