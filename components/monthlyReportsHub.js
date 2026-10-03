// components/monthlyReportsHub.js
// =============================================================================
// 🌟 [جديد] "مركز التقارير الشهرية" — شاشة مستقلة لإصدار تقرير الشهر لأي طالب في
// ثوانٍ آخر كل شهر، بلا الدخول إلى ملف الطالب (الزر داخل ملف الطالب باقٍ كما هو
// بلا أي تغيير). التسلسل: اكتب اسم الطالب ← اختر الشهر ← ✅ جاهز أو ⚠️ ينقص "آخر
// سورة وآية" (مع زر إصلاح بجانبه مباشرة) ← "نسخة واتساب" أو "طباعة PDF".
//
// مبادئ التصميم (طلب المعلم: "بلا تشتيت"):
//   • خطوة واحدة في كل مرة: بحث فقط ← ثم بطاقة الطالب فقط. لا أرقام ولا جداول قبل الاختيار.
//   • كل قرار له افتراض جاهز: الشهر الحالي محدَّد تلقائيًا، وواتساب = مختصر، وPDF = شامل.
//   • بعد التصدير يعود المركز فارغًا وجاهزًا للطالب التالي مع رسالة "✅ تم تصدير تقرير …".
//   • أشهر سابقة (آخر 6 أشهر): لو نسي المعلم حتى بدأ الشهر الجديد يجد الشهر الماضي بإشارته.
//   • شريط تذكير في أول 10 أيام من الشهر: "تقارير الشهر الماضي لم تُصدَّر لـ N طالب".
//
// لا يكرّر أي منطق: التسجيل يستدعي openMonthEndingForStudent من شاشة الحفظ الشهري
// الجماعية، والتقرير والتصدير كله من reports/monthly-report.js كما هو.
//
// ⚠️ [افتراضات صريحة]
//   1) "جاهز" = للشهر سجل نهاية حفظ (آخر سورة وآية). غيابه لا يمنع التصدير، فقط ينبّه.
//   2) "نطاق الأشهر" آخر 6 أشهر (الحالي + 5 سابقة).
//   3) ملخص الشهر هنا محلي فقط (الحفظ + جلسات غرفة اللعب)؛ الواجبات والاختبارات
//      الثنائية تُجلب عند فتح التقرير نفسه (الواجبات تظهر فقط لو سجّل المعلم الدخول بجوجل داخل نظام الواجبات على هذا الجهاز — التقرير نفسه لا يطلب أي دخول).
//   4) الطلاب المخفيون (isHidden) لا يظهرون في البحث.
// =============================================================================

import { AppState, t, surahNameLocal } from '../core/app.js';
import { getSurahInfo } from '../engine/memorizationEngine.js';
import { summarizeReview } from '../engine/reviewParts.js';

const STYLE_ID = 'mrh-styles';
const DONE_KEY = 'darham_reports_done';   // يكتبه reports/monthly-report.js عند كل تصدير
const MONTHS_BACK = 6;                    // الحالي + 5 سابقة
const REMINDER_DAYS = 10;                 // أول كم يوم من الشهر يظهر فيها شريط التذكير

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const st = document.createElement('style');
  st.id = STYLE_ID;
  st.textContent = `
.mrh-overlay{position:fixed;top:0;right:0;bottom:0;left:0;background:#0d1b16;z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;font-family:'Tajawal',sans-serif;}
.mrh-card{background:#fffdf6;border-radius:26px;max-width:640px;width:100%;box-shadow:0 30px 70px rgba(0,0,0,.45);border:3px solid var(--dh-gold-500,#d4af37);max-height:94vh;overflow-y:auto;direction:rtl;}
.mrh-card[dir="ltr"]{direction:ltr;}
.mrh-head{background:linear-gradient(135deg,var(--dh-emerald-700,#0d5c46),#0a4736);color:#fff;padding:18px 26px;display:flex;align-items:center;justify-content:space-between;border-radius:22px 22px 0 0;}
.mrh-title{margin:0;font-size:1.4rem;font-weight:800;}
.mrh-x{background:rgba(255,255,255,.15);border:none;color:#fff;width:36px;height:36px;border-radius:50%;font-size:1.1rem;cursor:pointer;}
.mrh-body{padding:22px 26px 10px;}
.mrh-banner{background:#fffbeb;border:2px solid #fcd34d;color:#92400e;border-radius:14px;padding:10px 14px;margin-bottom:16px;font-weight:700;font-size:.95rem;}
.mrh-banner button{background:none;border:none;color:#92400e;font-weight:800;cursor:pointer;font-family:inherit;text-decoration:underline;}
.mrh-banner-list{margin-top:8px;display:flex;flex-wrap:wrap;gap:8px;}
.mrh-chip-name{background:#fff;border:1px solid #fcd34d;border-radius:999px;padding:4px 12px;cursor:pointer;font-family:inherit;font-weight:700;color:#92400e;}
.mrh-toast{background:#ecfdf5;border:2px solid #6ee7b7;color:#065f46;border-radius:14px;padding:10px 14px;margin-bottom:16px;font-weight:800;}
.mrh-search{width:100%;box-sizing:border-box;padding:16px 18px;border-radius:16px;border:2px solid #e2d9c4;font-size:1.25rem;font-family:inherit;background:#fff;}
.mrh-search:focus{outline:none;border-color:var(--dh-gold-500,#d4af37);}
.mrh-list{margin-top:10px;display:flex;flex-direction:column;gap:8px;}
.mrh-item{display:flex;align-items:center;gap:12px;background:#fff;border:2px solid #efe7d2;border-radius:14px;padding:10px 14px;cursor:pointer;font-family:inherit;text-align:start;}
.mrh-item:hover,.mrh-item.mrh-first{border-color:var(--dh-gold-500,#d4af37);background:#fffbeb;}
.mrh-av{width:44px;height:44px;border-radius:50%;background:#f0fdf4;border:2px solid var(--dh-emerald-700,#0d5c46);display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:800;color:var(--dh-emerald-700,#0d5c46);overflow:hidden;flex:none;}
.mrh-av img{width:100%;height:100%;object-fit:cover;}
.mrh-nm{font-weight:800;color:#1e293b;font-size:1.1rem;}
.mrh-gr{color:#6b6252;font-size:.85rem;}
.mrh-empty{color:#6b6252;text-align:center;padding:14px;}
.mrh-stu-row{display:flex;align-items:center;gap:14px;margin-bottom:16px;}
.mrh-link{background:none;border:none;color:var(--dh-emerald-700,#0d5c46);font-weight:800;cursor:pointer;font-family:inherit;text-decoration:underline;margin-inline-start:auto;}
.mrh-months{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;}
.mrh-month{border:2px solid #e2d9c4;background:#fff;border-radius:999px;padding:8px 14px;font-family:inherit;font-weight:800;color:#3a2c1f;cursor:pointer;font-size:.95rem;}
.mrh-month.mrh-sel{background:var(--dh-emerald-700,#0d5c46);border-color:var(--dh-emerald-700,#0d5c46);color:#fff;}
.mrh-panel{border-radius:16px;padding:16px 18px;margin-bottom:16px;}
.mrh-panel.ready{background:#f0fdf4;border:2px solid #86efac;}
.mrh-panel.missing{background:#fffbeb;border:2px solid #fcd34d;}
.mrh-panel.nodata{background:#f1f5f9;border:2px solid #cbd5e1;}
.mrh-status{font-size:1.15rem;font-weight:800;margin-bottom:6px;}
.mrh-line{color:#334155;font-size:.98rem;line-height:1.8;}
.mrh-fixrow{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px;}
.mrh-fix{background:#f59e0b;color:#fff;border:none;border-radius:12px;padding:9px 16px;font-family:inherit;font-weight:800;cursor:pointer;}
.mrh-actions{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px;}
.mrh-btn{flex:1;min-width:150px;padding:14px;border-radius:14px;border:none;font-family:inherit;font-weight:800;font-size:1.05rem;cursor:pointer;background:var(--dh-emerald-700,#0d5c46);color:#fff;}
.mrh-btn.gold{background:var(--dh-gold-500,#d4af37);color:#2b2620;}
.mrh-btn.ghost{background:#f1f5f9;color:#334155;}
.mrh-note{color:#92400e;font-size:.85rem;margin:2px 0 8px;}
.mrh-foot{padding:10px 26px 18px;color:#6b6252;font-size:.9rem;text-align:center;}
`;
  document.head.appendChild(st);
}

// -----------------------------------------------------------------------------
// أدوات مساعدة
// -----------------------------------------------------------------------------
function norm(s) {
  return String(s || '')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .toLowerCase().trim();
}
function pad2(n) { return String(n).padStart(2, '0'); }
function doneKey(studentId, year, month1) { return `${studentId}_${year}-${pad2(month1)}`; }
function readDone() {
  try { const raw = localStorage.getItem(DONE_KEY); const o = raw ? JSON.parse(raw) : {}; return (o && typeof o === 'object') ? o : {}; }
  catch (e) { return {}; }
}
function locale() { return (AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US') + '-u-nu-latn'; }
function monthName(year, month1, withYear) {
  try {
    return new Intl.DateTimeFormat(locale(), withYear ? { month: 'long', year: 'numeric' } : { month: 'long' }).format(new Date(year, month1 - 1, 1));
  } catch (e) { return `${month1}/${year}`; }
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function avatarHtml(st) {
  const name = (st.name || '؟').trim();
  const a = st.avatar || '';
  if (a && a.length >= 10) return `<img src="${esc(a)}" alt="">`;
  if (a) return esc(a);
  return esc(name.charAt(0) || '★');
}
function recentMonths() {
  const now = new Date();
  const list = [];
  for (let i = 0; i < MONTHS_BACK; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    list.push({ year: d.getFullYear(), month1: d.getMonth() + 1, isCurrent: i === 0 });
  }
  return list;
}

// حالة شهر واحد لطالب: ready | missing | nodata (راجع الافتراض 1 أعلى الملف)
async function getMonthInfo(student, year, month1) {
  const mgr = AppState.monthlyMemorizationManager;
  const info = { status: 'missing', record: null, beginLabel: '', endLabel: '', newAyahs: null, review: null, games: { n: 0, avg: null } };
  try {
    if (mgr) {
      const all = await mgr.getAllForStudent(student.id);
      const rec = all.find(r => r.year === year && r.month === month1) || null;
      info.record = rec;
      info.review = rec ? summarizeReview(rec.review, AppState.surahsData) : null; // 🌟 مراجعة الأجزاء الخمسة
      if (rec && rec.ending) {
        info.status = 'ready';
        const sd = AppState.surahsData || [];
        const b = rec.beginning ? getSurahInfo(sd, rec.beginning.surahNumber) : null;
        const e = getSurahInfo(sd, rec.ending.surahNumber);
        info.beginLabel = rec.beginning ? `${b ? surahNameLocal(b.name) : '؟'} ${rec.beginning.ayahNumber}` : '';
        info.endLabel = `${e ? surahNameLocal(e.name) : '؟'} ${rec.ending.ayahNumber}`;
        info.newAyahs = typeof rec.newAyahs === 'number' ? rec.newAyahs : null;
      } else if (!rec && all.length) {
        const earliest = all.reduce((m, r) => Math.min(m, r.year * 12 + r.month), Infinity);
        if (year * 12 + month1 < earliest) info.status = 'nodata'; // قبل بدء تسجيل الطالب
      }
    }
  } catch (e) { console.warn('[monthlyReportsHub.js] تعذر قراءة سجل الحفظ:', e); }

  // جلسات غرفة اللعب (محلية) — نفس شرط الفلترة في التقرير نفسه (timestamp رقمي وبلا hwId)
  try {
    const raw = localStorage.getItem(`history_${student.id}`);
    const arr = raw ? JSON.parse(raw) : [];
    const start = new Date(year, month1 - 1, 1).getTime();
    const end = new Date(year, month1, 1).getTime();
    const mine = (Array.isArray(arr) ? arr : []).filter(e => !e.hwId && typeof e.timestamp === 'number' && e.timestamp >= start && e.timestamp < end);
    info.games.n = mine.length;
    info.games.avg = mine.length ? Math.round(mine.reduce((s, e) => s + (typeof e.score === 'number' ? e.score : 0), 0) / mine.length) : null;
  } catch (e) { /* تجاهل */ }
  return info;
}

async function loadActiveStudents() {
  if (!AppState.studentManager) return [];
  const all = await AppState.studentManager.getAllStudents();
  return all.filter(s => !s.isHidden).sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'));
}

/**
 * 🌟 [جديد 2026-10-03] ملخص تصدير تقارير الشهر لبطاقة «تقارير الشهر» في student/my-students.html —
 * للقراءة فقط. «شهر التقارير» = الشهر الماضي في أول REMINDER_DAYS أيام (نفس نافذة شريط التذكير أعلاه)،
 * وإلا الشهر الحالي. season = هل نحن في موسم التقارير (آخر 7 أيام من الشهر أو أول REMINDER_DAYS أيام)
 * — خارجه لا تظهر شارة «متبقية» حتى لا تزعج المعلم في منتصف الشهر.
 * @returns {Promise<{year:number, month1:number, monthLabel:string, done:number, total:number, season:boolean}|null>}
 */
export async function getReportsExportSummary() {
  if (!AppState.studentManager) return null;   // القاعدة لم تجهز: «غير معروف» لا «0 من 0»
  const now = new Date();
  const inPrevWindow = now.getDate() <= REMINDER_DAYS;
  const ref = inPrevWindow ? new Date(now.getFullYear(), now.getMonth() - 1, 1) : now;
  const year = ref.getFullYear(), month1 = ref.getMonth() + 1;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const season = inPrevWindow || now.getDate() > daysInMonth - 7;
  const students = await loadActiveStudents();
  const doneMap = readDone();
  const done = students.filter(s => doneMap[doneKey(s.id, year, month1)]).length;
  return { year, month1, monthLabel: monthName(year, month1, false), done, total: students.length, season };
}

// -----------------------------------------------------------------------------
// الشاشة
// -----------------------------------------------------------------------------
/**
 * @param {object} [opts]
 * @param {object} [opts.returnedFrom] {studentId, year, month1, openedAt} — عند الرجوع من شاشة التقرير:
 *   لو صُدِّر التقرير فعلًا أثناء غيابنا تظهر رسالة نجاح ويفرغ البحث، وإلا تُستعاد بطاقة الطالب كما كانت.
 */
export async function openMonthlyReportsHub(opts = {}) {
  ensureStyles();
  const existing = document.getElementById('mrh-overlay');
  if (existing) existing.remove();

  const students = await loadActiveStudents();
  const overlay = document.createElement('div');
  overlay.className = 'mrh-overlay';
  overlay.id = 'mrh-overlay';
  overlay.innerHTML = `
    <div class="mrh-card" dir="${AppState.currentLang === 'ar' ? 'rtl' : 'ltr'}">
      <div class="mrh-head">
        <h2 class="mrh-title">📅 ${esc(t('mrh_title'))}</h2>
        <button class="mrh-x" id="mrh-close" aria-label="${esc(t('mrh_close'))}">✕</button>
      </div>
      <div class="mrh-body" id="mrh-body"></div>
      <div class="mrh-foot" id="mrh-foot"></div>
    </div>`;
  document.body.appendChild(overlay);
  const body = overlay.querySelector('#mrh-body');
  const foot = overlay.querySelector('#mrh-foot');
  overlay.querySelector('#mrh-close').addEventListener('click', () => overlay.remove());

  function doneTodayCount() {
    const today = new Date().toDateString();
    return Object.values(readDone()).filter(ts => { const d = new Date(ts); return !isNaN(d) && d.toDateString() === today; }).length;
  }
  function renderFoot() {
    const n = doneTodayCount();
    foot.textContent = n ? t('mrh_done_today').replace('{n}', n) : '';
  }

  // ---- شاشة 1: البحث ----
  async function showSearch(toastText, presetMonth) {
    body.innerHTML = `
      ${toastText ? `<div class="mrh-toast">${esc(toastText)}</div>` : ''}
      <div id="mrh-banner"></div>
      <input class="mrh-search" id="mrh-search" type="text" autocomplete="off" placeholder="${esc(t('mrh_search_ph'))}">
      <div class="mrh-list" id="mrh-list"></div>`;
    renderFoot();
    const input = body.querySelector('#mrh-search');
    const list = body.querySelector('#mrh-list');

    function renderList() {
      const q = norm(input.value);
      if (!q) { list.innerHTML = ''; return; }
      const found = students.filter(s => norm(s.name).includes(q)).slice(0, 8);
      if (!found.length) { list.innerHTML = `<div class="mrh-empty">${esc(t('mrh_no_match'))}</div>`; return; }
      list.innerHTML = found.map((s, i) => `
        <button class="mrh-item ${i === 0 ? 'mrh-first' : ''}" data-id="${esc(s.id)}">
          <span class="mrh-av">${avatarHtml(s)}</span>
          <span><div class="mrh-nm">${esc(s.name)}</div><div class="mrh-gr">${esc(s.grade || '')}</div></span>
        </button>`).join('');
      list.querySelectorAll('.mrh-item').forEach(b => b.addEventListener('click', () => {
        const st = students.find(s => String(s.id) === b.dataset.id);
        if (st) showStudent(st, presetMonth);
      }));
    }
    input.addEventListener('input', renderList);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const first = list.querySelector('.mrh-item'); if (first) first.click(); }
    });
    setTimeout(() => input.focus(), 50);
    renderPrevMonthBanner(body.querySelector('#mrh-banner'));
  }

  // ---- شريط تذكير أول الشهر ----
  async function renderPrevMonthBanner(host) {
    if (!host || new Date().getDate() > REMINDER_DAYS) return;
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const py = prev.getFullYear(), pm = prev.getMonth() + 1;
    const done = readDone();
    const mgr = AppState.monthlyMemorizationManager;
    if (!mgr) return;
    const pending = [];
    for (const s of students) {
      if (done[doneKey(s.id, py, pm)]) continue;
      // نذكّر فقط بمن كان له نشاط/سجل في ذلك الشهر (لا الطلاب الجدد كليًا)
      const info = await getMonthInfo(s, py, pm);
      if (info.status !== 'nodata' && (info.record || info.games.n)) pending.push(s);
    }
    if (!pending.length || !host.isConnected) return;
    host.innerHTML = `<div class="mrh-banner">
      📌 ${esc(t('mrh_prev_banner').replace('{month}', monthName(py, pm, false)).replace('{n}', pending.length))}
      <button id="mrh-banner-toggle">${esc(t('mrh_banner_show'))}</button>
      <div class="mrh-banner-list" id="mrh-banner-list" style="display:none;">
        ${pending.map(s => `<button class="mrh-chip-name" data-id="${esc(s.id)}">${esc(s.name)}</button>`).join('')}
      </div></div>`;
    host.querySelector('#mrh-banner-toggle').addEventListener('click', () => {
      const l = host.querySelector('#mrh-banner-list'); l.style.display = l.style.display === 'none' ? 'flex' : 'none';
    });
    host.querySelectorAll('.mrh-chip-name').forEach(b => b.addEventListener('click', () => {
      const st = students.find(s => String(s.id) === b.dataset.id);
      if (st) showStudent(st, { year: py, month1: pm });
    }));
  }

  // ---- شاشة 2: بطاقة الطالب ----
  async function showStudent(student, preset) {
    const months = recentMonths();
    let sel = (preset && months.find(m => m.year === preset.year && m.month1 === preset.month1)) || months[0];

    async function render() {
      const info = await getMonthInfo(student, sel.year, sel.month1);
      const done = readDone()[doneKey(student.id, sel.year, sel.month1)];
      const mName = monthName(sel.year, sel.month1, sel.year !== new Date().getFullYear());
      // إشارات الأشهر (سريعة: تُحسب مرة واحدة لكل عرض)
      const infos = await Promise.all(months.map(m => (m.year === sel.year && m.month1 === sel.month1) ? info : getMonthInfo(student, m.year, m.month1)));
      const mark = (i) => infos[i].status === 'ready' ? '✅' : (infos[i].status === 'missing' ? '⚠️' : '⚪');

      let panel = '';
      if (info.status === 'ready') {
        const memoLine = info.beginLabel
          ? t('mrh_summary_memo').replace('{from}', info.beginLabel).replace('{to}', info.endLabel).replace('{n}', info.newAyahs != null ? info.newAyahs : '—')
          : `${t('mrh_summary_end_only')} ${info.endLabel}`;
        panel = `<div class="mrh-panel ready">
          <div class="mrh-status">${esc(t('mrh_status_ready'))}</div>
          <div class="mrh-line">${esc(memoLine)}</div>
          <div class="mrh-line">${esc(info.games.n ? t('mrh_summary_games').replace('{n}', info.games.n).replace('{avg}', info.games.avg) : t('mrh_summary_games_none'))}</div>
          <div class="mrh-note">${esc(t('mrh_summary_hw_note'))}</div>
          <div class="mrh-fixrow"><button class="mrh-link" id="mrh-edit" style="margin:0;">${esc(t('mrh_edit_btn'))}</button></div>
        </div>`;
      } else if (info.status === 'missing') {
        panel = `<div class="mrh-panel missing">
          <div class="mrh-status">${esc(t('mrh_status_missing'))}: ${esc(t('mrh_missing_msg').replace('{month}', mName))}</div>
          <div class="mrh-line">${esc(info.games.n ? t('mrh_summary_games').replace('{n}', info.games.n).replace('{avg}', info.games.avg) : t('mrh_summary_games_none'))}</div>
          <div class="mrh-fixrow"><button class="mrh-fix" id="mrh-fix">✍️ ${esc(t('mrh_fix_btn'))}</button>
            <span class="mrh-note">${esc(t('mrh_missing_export_hint'))}</span></div>
        </div>`;
      } else {
        panel = `<div class="mrh-panel nodata"><div class="mrh-status">⚪ ${esc(t('mrh_nodata'))}</div></div>`;
      }

      // 🌟 [جديد] سطر "مراجعة الشهر" (الأجزاء الخمسة) — اختياري ولا يمنع التصدير
      const reviewRow = info.status === 'nodata' ? '' : `<div class="mrh-panel ${info.review ? 'ready' : 'missing'}" style="padding:12px 16px;">
          <div class="mrh-status" style="font-size:1.02rem;">🔁 ${esc(info.review ? t('mrh_review_done').replace('{k}', info.review.juzCount).replace('{n}', info.review.totalAyahs) : t('mrh_review_missing'))}</div>
          <div class="mrh-fixrow"><button class="mrh-fix" id="mrh-review" style="background:#0d5c46;">${esc(info.review ? t('mrh_review_edit') : t('mrh_review_add'))}</button></div>
        </div>`;

      body.innerHTML = `
        <div class="mrh-stu-row">
          <span class="mrh-av">${avatarHtml(student)}</span>
          <span><div class="mrh-nm">${esc(student.name)}</div><div class="mrh-gr">${esc(student.grade || '')}</div></span>
          <button class="mrh-link" id="mrh-change">${esc(t('mrh_change_student'))}</button>
        </div>
        <div class="mrh-months">
          ${months.map((m, i) => `<button class="mrh-month ${m === sel ? 'mrh-sel' : ''}" data-i="${i}">${mark(i)} ${esc(m.isCurrent ? t('mrh_current_month') + ' · ' : '')}${esc(monthName(m.year, m.month1, m.year !== new Date().getFullYear()))}</button>`).join('')}
        </div>
        ${panel}
        ${reviewRow}
        ${done ? `<div class="mrh-note">${esc(t('mrh_exported_before').replace('{date}', new Date(done).toLocaleDateString(locale())))}</div>` : ''}
        <div class="mrh-actions">
          <button class="mrh-btn" id="mrh-wa">${esc(t('mrh_btn_whatsapp'))}</button>
          <button class="mrh-btn gold" id="mrh-pdf">${esc(t('mrh_btn_pdf'))}</button>
          <button class="mrh-btn ghost" id="mrh-preview">${esc(t('mrh_btn_preview'))}</button>
        </div>`;
      renderFoot();

      body.querySelector('#mrh-change').addEventListener('click', () => showSearch());
      body.querySelectorAll('.mrh-month').forEach(b => b.addEventListener('click', () => { sel = months[parseInt(b.dataset.i, 10)]; render(); }));
      const fixBtn = body.querySelector('#mrh-fix') || body.querySelector('#mrh-edit');
      if (fixBtn) fixBtn.addEventListener('click', async () => {
        overlay.style.display = 'none'; // نخفي المركز مؤقتًا خلف شاشة التسجيل (هي بدورها overlay)
        try {
          const { openMonthEndingForStudent } = await import('./monthlyMemorizationBulkScreen.js');
          await openMonthEndingForStudent(student, sel.year, sel.month1);
        } finally { overlay.style.display = ''; }
        render();
      });

      const revBtn = body.querySelector('#mrh-review');
      if (revBtn) revBtn.addEventListener('click', async () => {
        overlay.style.display = 'none';
        try {
          const { openMonthReviewForStudent } = await import('./monthlyReviewScreen.js');
          await openMonthReviewForStudent(student, sel.year, sel.month1);
        } finally { overlay.style.display = ''; }
        render();
      });

      const go = (autoExport) => {
        overlay.remove();
        import('../reports/monthly-report.js').then(m => m.openMonthlyReportScreen({
          student, year: sel.year, monthIndex0: sel.month1 - 1, autoExport, returnTo: 'hub'
        })).catch(err => { console.error('[monthlyReportsHub.js] تعذر فتح التقرير:', err); alert(t('mr_export_error')); });
      };
      body.querySelector('#mrh-wa').addEventListener('click', () => go('whatsapp'));
      body.querySelector('#mrh-pdf').addEventListener('click', () => go('pdf'));
      body.querySelector('#mrh-preview').addEventListener('click', () => go(null));
    }
    await render();
  }

  // ---- البداية: عودة من التقرير أم فتح جديد ----
  const back = opts.returnedFrom;
  if (back) {
    const st = students.find(s => String(s.id) === String(back.studentId));
    const ts = readDone()[doneKey(back.studentId, back.year, back.month1)];
    const exportedNow = ts && new Date(ts).getTime() >= (back.openedAt || 0);
    if (st && exportedNow) { await showSearch(t('mrh_exported_ok').replace('{name}', st.name)); return; }
    if (st) { await showStudent(st, { year: back.year, month1: back.month1 }); return; }
  }
  await showSearch();
}
