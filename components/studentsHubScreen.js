// components/studentsHubScreen.js
// =============================================================================
// 🌟 [جديد] شاشة «تسجيل الحفظ الشهري» الموحّدة — قائمة الطلاب تحت بعض، وفي كل بطاقة:
//   • «أين توقف؟» (سورة + آية) يُحفظ تلقائيًا فور الاختيار (بلا زر حفظ، وبلا إلزام بإكمال بقية البيانات).
//   • زر «عرض التقرير» موجود دائمًا لكنه معطّل، ويُفعَّل فقط بعد تسجيل حفظ جديد للطالب.
//   • زر «ملف الطالب» لفتح بياناته، وزر «طالب جديد» يفتح نافذة الإضافة المعتادة.
// المعاينة المعتمدة: previews/students-hub-c.html.
//
// ⚠️ لا تغيير في نموذج البيانات: نفس سجل (طالب × شهر) في database/monthlyMemorizationDB.js ونفس منطق
// components/monthlyMemorizationBulkScreen.js (بداية الشهر = نهاية السابق تلقائيًا، النهاية تقفل الشهر،
// وسلسلة الأشهر تُحدَّث). الفرق أن «النهاية» هنا تُعدَّل بحرية: القفل يُفتح تلقائيًا ثم يُعاد بالحفظ التالي.
//   - طالب له شهر سابق غير مكتمل → الهدف ختام ذلك الشهر («بانتظارك»).
//   - طالب شهره الحالي جارٍ → الهدف ختام الشهر الحالي («هذا الشهر») ويمكن تسجيله مبكرًا.
//   - طالب بلا أي سجل → أول تسجيل = «نقطة البداية» (لا يُفعِّل التقرير).
// =============================================================================

import { AppState, t, tf, surahNameLocal } from '../core/app.js';
import { esc } from '../core/escape.js';
import {
  calcMemorizationProgress, isValidPosition, getSurahsInMemorizationOrder, getSurahInfo
} from '../engine/memorizationEngine.js';

const STYLE_ID = 'sh-styles';
const OVERLAY_ID = 'sh-overlay';

const CSS = `
.sh-overlay { position: fixed; inset: 0; z-index: 10000; background: var(--dh-surface-0); overflow-y: auto; font-family: var(--dh-font-ui); color: var(--dh-ink); }
.sh-wrap { max-width: 760px; margin: 0 auto; padding: 0 16px 40px; }
.sh-bar { position: sticky; top: 0; z-index: 2; background: var(--dh-surface-1); border-bottom: 1px solid var(--dh-border); }
.sh-bar .sh-wrap { display: flex; align-items: center; gap: 10px; padding-block: 10px; }
.sh-back { display: inline-flex; align-items: center; gap: 6px; border: 1.5px solid var(--dh-border-strong); background: var(--dh-surface-3); color: var(--dh-ink); border-radius: var(--dh-r-md); padding: 8px 12px; font: inherit; font-weight: 700; cursor: pointer; min-height: var(--dh-tap); }
html[dir="ltr"] .sh-back svg, .sh-overlay[dir="ltr"] .sh-back svg { transform: scaleX(-1); }
.sh-titles { flex: 1; min-width: 0; }
.sh-kicker { font-size: .78rem; font-weight: 700; color: var(--dh-warn); }
.sh-title { font-size: 1.2rem; margin: 0; line-height: 1.3; }
.sh-sub { color: var(--dh-ink-soft); font-size: .88rem; margin: 14px 0 10px; line-height: 1.6; }
.sh-prog { background: var(--dh-surface-2); border: 1px solid var(--dh-border); border-radius: var(--dh-r-lg); padding: 10px 14px; margin-bottom: 12px; }
.sh-prog-row { display: flex; justify-content: space-between; font-size: .9rem; font-weight: 600; margin-bottom: 6px; }
.sh-prog-bar { height: 8px; border-radius: 99px; background: var(--dh-border-soft); overflow: hidden; }
.sh-prog-bar i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, var(--dh-emerald-600), var(--dh-emerald-700)); transition: width .3s; }
.sh-tools { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
.sh-chip { border: 1.5px solid var(--dh-border-strong); background: var(--dh-surface-3); color: var(--dh-ink); border-radius: 99px; padding: 5px 14px; font: inherit; font-size: .85rem; font-weight: 600; cursor: pointer; min-height: 36px; }
.sh-chip.on { background: var(--dh-emerald-700); border-color: var(--dh-emerald-700); color: var(--dh-on-emerald); }
.sh-search { flex: 1; min-width: 140px; border: 1.5px solid var(--dh-border-strong); background: var(--dh-surface-3); color: var(--dh-ink); border-radius: 99px; padding: 6px 14px; font: inherit; min-height: 36px; }
.sh-new { border: 1.5px dashed var(--dh-emerald-600); background: transparent; color: var(--dh-ink); border-radius: var(--dh-r-md); padding: 8px 14px; font: inherit; font-weight: 700; cursor: pointer; min-height: var(--dh-tap); }
.sh-list { display: flex; flex-direction: column; gap: 10px; }
.sh-card { background: var(--dh-surface-2); border: 1px solid var(--dh-border); border-radius: var(--dh-r-lg); padding: 10px 12px; }
.sh-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.sh-ava { width: 40px; height: 40px; border-radius: 50%; background: var(--dh-ok-bg); color: var(--dh-ok-ink); display: grid; place-items: center; font-weight: 700; flex: none; overflow: hidden; }
.sh-ava img { width: 100%; height: 100%; object-fit: cover; }
.sh-nm { flex: 1; min-width: 0; font-weight: 700; }
.sh-nm small { display: block; font-weight: 400; color: var(--dh-ink-soft); font-size: .78rem; }
.sh-tag { font-size: .75rem; font-weight: 700; border-radius: 99px; padding: 2px 10px; white-space: nowrap; }
.sh-tag.wait { background: var(--dh-warn-bg); color: var(--dh-warn); }
.sh-tag.open { background: var(--dh-info-bg); color: var(--dh-info); }
.sh-tag.done { background: var(--dh-ok-bg); color: var(--dh-ok-ink); }
.sh-line { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.sh-line select, .sh-line input { border: 1.5px solid var(--dh-border-strong); background: var(--dh-surface-3); color: var(--dh-ink); border-radius: var(--dh-r-sm); padding: 8px 10px; min-height: 42px; font: inherit; }
.sh-line select { flex: 1; min-width: 140px; }
.sh-line input { width: 86px; }
.sh-max { font-size: .78rem; color: var(--dh-ink-soft); }
.sh-btn { border: 0; border-radius: var(--dh-r-md); padding: 8px 14px; min-height: 42px; font: inherit; font-weight: 700; font-size: .9rem; cursor: pointer; }
.sh-btn.rep { background: var(--dh-gold-500); color: var(--dh-on-gold); }
.sh-btn.file { background: var(--dh-surface-3); color: var(--dh-ink); border: 1.5px solid var(--dh-border-strong); }
.sh-btn:disabled { background: var(--dh-border-soft); color: var(--dh-ink-soft); border: 0; cursor: not-allowed; opacity: .75; }
.sh-msg { flex-basis: 100%; font-size: .8rem; font-weight: 600; min-height: 1.2em; }
.sh-msg.ok { color: var(--dh-ok); }
.sh-msg.err { color: var(--dh-danger); }
.sh-empty { text-align: center; color: var(--dh-ink-soft); padding: 30px 0; }
`;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

// الهيدر العلوي (#main-header) يبقى ظاهرًا: يبدأ الغطاء من أسفله (نفس placeBelowMainHeader في بقية الشاشات)
function placeBelowMainHeader(overlay) {
  const h = document.getElementById('main-header');
  if (h) overlay.style.top = Math.max(0, Math.round(h.getBoundingClientRect().bottom)) + 'px';
}

function avatarHtml(student) {
  const name = (student.name || '؟').trim();
  const a = student.avatar || '';
  if (a && a.length >= 10) return `<img src="${esc(a)}" alt="">`;
  return esc(a || name.charAt(0) || '★');
}

function posLabel(pos) {
  const info = getSurahInfo(AppState.surahsData, pos.surahNumber);
  return `${info ? surahNameLocal(info.name) : '؟'} ${pos.ayahNumber}`;
}

/**
 * يبني صفًّا لكل طالب نشط، ويكمل بصمت بداية الشهر الحالي من نهاية الشهر السابق (كما تفعل buildPendingQueue).
 * row = { student, kind:'ending'|'first', year, month, begin:{surahNumber,ayahNumber}|null,
 *         pos:{surahNumber,ayahNumber}|null, status:'wait'|'open'|'done', fresh:false }
 */
async function loadRows() {
  const mgr = AppState.monthlyMemorizationManager;
  const students = (await AppState.studentManager.getAllStudents()).filter(s => !s.isHidden);
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const rows = [];
  for (const student of students) {
    const records = mgr ? await mgr.getAllForStudent(student.id) : [];
    const past = records
      .filter(r => (r.year < curYear || (r.year === curYear && r.month < curMonth)) && r.beginning && !r.ending)
      .sort((a, b) => (b.year - a.year) || (b.month - a.month))[0];
    const p = x => (x ? { surahNumber: x.surahNumber, ayahNumber: x.ayahNumber } : null);
    if (past) {
      rows.push({ student, kind: 'ending', year: past.year, month: past.month, begin: p(past.beginning), pos: null, status: 'wait', fresh: false });
      continue;
    }
    let cur = records.find(r => r.year === curYear && r.month === curMonth);
    if (!(cur && cur.beginning)) {
      const latest = [...records].reverse().find(r => r.locked && r.ending);
      if (latest && mgr) {
        await mgr.saveBeginning(student.id, curYear, curMonth, p(latest.ending));
        cur = await mgr.getRecord(student.id, curYear, curMonth);
      }
    }
    if (cur && cur.beginning) {
      rows.push({
        student, kind: 'ending', year: curYear, month: curMonth, begin: p(cur.beginning), pos: p(cur.ending),
        status: cur.ending ? 'done' : 'open', fresh: false
      });
    } else {
      rows.push({ student, kind: 'first', year: curYear, month: curMonth, begin: null, pos: null, status: 'wait', fresh: false });
    }
  }
  return rows;
}

function validate(row, pos) {
  const sd = AppState.surahsData;
  const info = getSurahInfo(sd, pos.surahNumber);
  if (!info || !isValidPosition(sd, pos.surahNumber, pos.ayahNumber)) {
    return { ok: false, msg: tf('sh_err_invalid', { max: info ? info.ayahsCount : 1 }) };
  }
  if (row.kind === 'ending') {
    const r = calcMemorizationProgress(sd, row.begin, pos);
    if (!r.valid) return { ok: false, msg: t('sh_err_range') };
    return { ok: true, newAyahs: r.newAyahs };
  }
  return { ok: true };
}

async function persist(row, pos, newAyahs) {
  const mgr = AppState.monthlyMemorizationManager;
  const sid = row.student.id;
  if (row.kind === 'first') {
    await mgr.saveBeginning(sid, row.year, row.month, pos);
    return;
  }
  const rec = await mgr.getRecord(sid, row.year, row.month);
  if (rec && rec.locked) await mgr.unlockRecordForEdit(sid, row.year, row.month);   // تعديل حفظ سابق
  await mgr.saveEnding(sid, row.year, row.month, pos, newAyahs);
  // سلسلة الأشهر: لو للشهر التالي سجل غير مقفول تُحدَّث بدايته لتساوي هذه النهاية
  const ny = row.month === 12 ? row.year + 1 : row.year;
  const nm = row.month === 12 ? 1 : row.month + 1;
  const next = await mgr.getRecord(sid, ny, nm);
  if (next && !next.locked) await mgr.saveBeginning(sid, ny, nm, pos);
}

export async function openStudentsHubScreen() {
  if (!AppState.monthlyMemorizationManager || !AppState.studentManager || !AppState.surahsData || !AppState.surahsData.length) {
    alert(t('stu_screen_preparing'));
    return;
  }
  ensureStyles();
  const old = document.getElementById(OVERLAY_ID);
  if (old) old.remove();

  const isRtl = AppState.currentLang === 'ar';
  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.className = 'sh-overlay';
  overlay.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
  document.body.appendChild(overlay);
  placeBelowMainHeader(overlay);

  const surahs = getSurahsInMemorizationOrder(AppState.surahsData);
  const backLabel = t(document.getElementById('btn-monthly-memo-bulk') ? 'my_students_title' : 'header_home_btn');
  const now = new Date();
  const monthName = new Date(now.getFullYear(), now.getMonth(), 1)
    .toLocaleDateString(isRtl ? 'ar' : 'en', { month: 'long' });

  let rows = [];
  let filter = 'all';
  let query = '';

  function close() {
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    if (headerHome) headerHome.removeEventListener('click', close);
    overlay.remove();
  }
  function onKey(e) { if (e.key === 'Escape') close(); }
  function onResize() { placeBelowMainHeader(overlay); }
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);
  const headerHome = document.getElementById('header-home-btn');
  if (headerHome) headerHome.addEventListener('click', close);

  const arrow = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
  overlay.innerHTML = `
    <div class="sh-bar"><div class="sh-wrap">
      <button type="button" class="sh-back" id="sh-close">${arrow}<span>${esc(backLabel)}</span></button>
      <div class="sh-titles"><div class="sh-kicker">${esc(monthName)}</div><h2 class="sh-title">${esc(t('sh_title'))}</h2></div>
    </div></div>
    <div class="sh-wrap">
      <p class="sh-sub">${esc(t('sh_sub'))}</p>
      <div class="sh-prog"><div class="sh-prog-row"><span id="sh-pt"></span><span id="sh-pp"></span></div><div class="sh-prog-bar"><i id="sh-pb"></i></div></div>
      <div class="sh-tools">
        <button type="button" class="sh-new" id="sh-new">${esc(t('sh_new_student'))}</button>
        <span id="sh-chips" style="display:flex;gap:6px;flex-wrap:wrap"></span>
        <input type="search" class="sh-search" id="sh-search" placeholder="${esc(t('sh_search_ph'))}" aria-label="${esc(t('sh_search_ph'))}">
      </div>
      <div class="sh-list" id="sh-list"></div>
    </div>`;

  const $ = id => overlay.querySelector('#' + id);
  const isRecorded = r => r.status === 'done';

  function subLine(r) {
    if (r.kind === 'first') return t('sh_first');
    const tag = r.status === 'wait' ? ' · ' + tf('mmt_month_fmt', { m: r.month, y: r.year }) : '';
    const from = tf('sh_start_from', { pos: posLabel(r.begin) });
    return r.pos ? `${tf('sh_stopped', { pos: posLabel(r.pos) })}${tag}` : `${from}${tag}`;
  }

  function renderProgress() {
    const d = rows.filter(isRecorded).length;
    $('sh-pt').textContent = tf('sh_progress', { a: d, b: rows.length });
    $('sh-pp').textContent = rows.length ? Math.round(d / rows.length * 100) + '%' : '';
    $('sh-pb').style.width = (rows.length ? d / rows.length * 100 : 0) + '%';
    const w = rows.length - d;
    $('sh-chips').innerHTML = [['all', `${t('sh_f_all')} (${rows.length})`], ['wait', `${t('sh_f_wait')} (${w})`]]
      .map(([k, v]) => `<button type="button" class="sh-chip ${filter === k ? 'on' : ''}" data-f="${k}">${esc(v)}</button>`).join('');
  }

  function cardHtml(r, i) {
    const sel = r.pos ? r.pos.surahNumber : '';
    const info = r.pos ? getSurahInfo(AppState.surahsData, r.pos.surahNumber) : null;
    const opts = `<option value="">${esc(t('sh_pick_surah'))}</option>` + surahs
      .map(s => `<option value="${s.number}" ${s.number === sel ? 'selected' : ''}>${esc(surahNameLocal(s.name))}</option>`).join('');
    const name = esc(r.student.name || '');
    return `<div class="sh-card" data-i="${i}" data-name="${name}">
      <div class="sh-head">
        <div class="sh-ava">${avatarHtml(r.student)}</div>
        <div class="sh-nm">${name}<small data-sub>${esc(subLine(r))}</small></div>
        <span class="sh-tag ${r.status}" data-tag>${esc(t('sh_tag_' + r.status))}</span>
      </div>
      <div class="sh-line">
        <select data-k="s" aria-label="${esc(t('sh_pick_surah'))} — ${name}">${opts}</select>
        <input type="number" inputmode="numeric" min="1" ${info ? `max="${info.ayahsCount}"` : ''} data-k="a" placeholder="${esc(t('sh_ayah_ph'))}" value="${r.pos ? r.pos.ayahNumber : ''}" aria-label="${esc(t('sh_ayah_ph'))} — ${name}">
        <span class="sh-max" data-max>${info ? '/ ' + info.ayahsCount : ''}</span>
        <button type="button" class="sh-btn rep" data-act="rep" ${r.fresh ? '' : 'disabled'} title="${r.fresh ? '' : esc(t('sh_btn_report_hint'))}">${esc(t('sh_btn_report'))}</button>
        <button type="button" class="sh-btn file" data-act="file">${esc(t('sh_btn_file'))}</button>
        <span class="sh-msg" data-msg aria-live="polite"></span>
      </div>
    </div>`;
  }

  function renderList() {
    const q = query.trim();
    const shown = rows.map((r, i) => ({ r, i }))
      .filter(({ r }) => (filter === 'all' || !isRecorded(r)) && (!q || (r.student.name || '').includes(q)));
    $('sh-list').innerHTML = shown.length
      ? shown.map(({ r, i }) => cardHtml(r, i)).join('')
      : `<p class="sh-empty">${esc(t(rows.length ? 'sh_empty' : 'sh_no_students'))}</p>`;
    renderProgress();
  }

  function setMsg(card, text, kind) {
    const m = card.querySelector('[data-msg]');
    m.textContent = text || '';
    m.className = 'sh-msg' + (kind ? ' ' + kind : '');
  }

  // الحفظ التلقائي: يُستدعى عند تغيّر السورة أو الآية
  const saving = new Set();
  async function autoSave(card) {
    const r = rows[+card.dataset.i];
    const sSel = card.querySelector('[data-k="s"]');
    const aInp = card.querySelector('[data-k="a"]');
    const maxEl = card.querySelector('[data-max]');
    const surahNo = parseInt(sSel.value, 10);
    if (!Number.isInteger(surahNo)) { setMsg(card, ''); return; }
    const info = getSurahInfo(AppState.surahsData, surahNo);
    aInp.max = String(info.ayahsCount);
    maxEl.textContent = '/ ' + info.ayahsCount;
    const ayah = parseInt(aInp.value, 10);
    if (!Number.isInteger(ayah)) { setMsg(card, ''); aInp.focus(); return; }     // ننتظر رقم الآية
    const pos = { surahNumber: surahNo, ayahNumber: ayah };
    const v = validate(r, pos);
    if (!v.ok) { setMsg(card, v.msg, 'err'); return; }
    if (saving.has(r.student.id)) return;
    saving.add(r.student.id);
    try {
      await persist(r, pos, v.newAyahs);
    } catch (e) {
      console.error('[studentsHubScreen.js] تعذر الحفظ التلقائي:', e);
      setMsg(card, t('sh_err_save'), 'err');
      return;
    } finally { saving.delete(r.student.id); }
    r.pos = pos;
    if (r.kind === 'first') {
      // نقطة البداية فقط: تتحول البطاقة إلى «هذا الشهر» ويُسجَّل الختام لاحقًا (لا يُفعَّل التقرير)
      r.kind = 'ending'; r.begin = pos; r.pos = null; r.status = 'open';
      sSel.value = ''; aInp.value = '';
      card.querySelector('[data-sub]').textContent = subLine(r);
      card.querySelector('[data-tag]').className = 'sh-tag open';
      card.querySelector('[data-tag]').textContent = t('sh_tag_open');
      setMsg(card, t('sh_saved_start'), 'ok');
      renderProgress();
      return;
    }
    r.status = 'done';
    r.fresh = true;                                      // حفظ جديد ← يُفعَّل زر التقرير
    card.querySelector('[data-sub]').textContent = subLine(r);
    card.querySelector('[data-tag]').className = 'sh-tag done';
    card.querySelector('[data-tag]').textContent = t('sh_tag_done');
    const btn = card.querySelector('[data-act="rep"]');
    btn.disabled = false; btn.title = '';
    setMsg(card, t('sh_saved'), 'ok');
    renderProgress();
  }

  $('sh-list').addEventListener('change', e => {
    const card = e.target.closest('.sh-card');
    if (!card || !e.target.dataset.k) return;
    if (e.target.dataset.k === 's') {                    // سورة جديدة: نُقيّد الآية بحدّها
      const info = getSurahInfo(AppState.surahsData, parseInt(e.target.value, 10));
      const aInp = card.querySelector('[data-k="a"]');
      if (info && parseInt(aInp.value, 10) > info.ayahsCount) aInp.value = String(info.ayahsCount);
    }
    autoSave(card);
  });
  $('sh-list').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.dataset && e.target.dataset.k === 'a') { e.preventDefault(); e.target.blur(); }
  });
  $('sh-list').addEventListener('click', async e => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const r = rows[+b.closest('.sh-card').dataset.i];
    if (b.dataset.act === 'rep') {
      close();
      try {
        const m = await import('../reports/monthly-report.js');
        m.openMonthlyReportScreen({ student: r.student, year: r.year, monthIndex0: r.month - 1, returnTo: 'shub' });
      } catch (err) { console.error('[studentsHubScreen.js] تعذر فتح التقرير:', err); alert(t('mr_export_error')); }
    } else if (b.dataset.act === 'file') {
      close();
      try {
        AppState.currentStudent = r.student;
        const m = await import('../student/student.js');
        m.loadStudentProfileScreen();
      } catch (err) { console.error('[studentsHubScreen.js] تعذر فتح ملف الطالب:', err); }
    }
  });
  $('sh-chips').addEventListener('click', e => {
    const b = e.target.closest('[data-f]');
    if (b) { filter = b.dataset.f; renderList(); }
  });
  $('sh-search').addEventListener('input', e => { query = e.target.value; renderList(); });
  $('sh-close').addEventListener('click', close);
  $('sh-new').addEventListener('click', () => {
    // نافذة «طالب جديد» الحالية موجودة في شاشة «طلابي»؛ نغلق هذه الشاشة ونفتحها (بعد الحفظ يُعاد فتح الشاشة من زر الحفظ الشهري)
    const addBtn = document.getElementById('btn-add-student');
    close();
    if (addBtn) addBtn.click();
  });

  try {
    rows = await loadRows();
  } catch (e) {
    console.error('[studentsHubScreen.js] تعذر تحميل الطلاب:', e);
    rows = [];
  }
  // الأولوية: من ينتظرك أولًا ثم بقية الطلاب (ترتيب ثابت داخل كل مجموعة)
  rows.sort((a, b) => (isRecorded(a) - isRecorded(b)));
  renderList();
}
