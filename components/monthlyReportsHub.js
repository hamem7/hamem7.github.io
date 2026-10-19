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

let bulkQueue = null;                    // طابور التصدير الجماعي الحالي (يعيش ما دامت الوحدة محمّلة)
const STYLE_ID = 'mrh-styles';
const DONE_KEY = 'darham_reports_done';   // يكتبه reports/monthly-report.js عند كل تصدير
const MONTHS_BACK = 6;                    // الحالي + 5 سابقة
const REMINDER_DAYS = 10;                 // أول كم يوم من الشهر يظهر فيها شريط التذكير

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const st = document.createElement('style');
  st.id = STYLE_ID;
  st.textContent = `
.mrh-overlay{position:fixed;top:0;right:0;bottom:0;left:0;background-image:radial-gradient(circle at 20% 15%,rgba(255,255,255,.12),transparent 30%),radial-gradient(circle at 85% 85%,rgba(212,175,55,.16),transparent 30%),linear-gradient(135deg,#06231c,#0d5c46 55%,#147c5e);background-color:#0d5c46;background-attachment:fixed;z-index:10000;display:flex;align-items:flex-start;justify-content:center;padding:20px;box-sizing:border-box;font-family:'Tajawal',sans-serif;overflow-y:auto;}
.mrh-overlay *{text-shadow:none;-webkit-text-stroke:0;}
.mrh-card{background:#fffdf6;border-radius:28px;max-width:600px;width:100%;box-shadow:0 14px 40px rgba(6,35,28,.12);border:1px solid #e4dfcc;color:#10241c;direction:rtl;margin:auto 0;overflow:hidden;}
.mrh-card[dir="ltr"]{direction:ltr;}
.mrh-head{background:#fff;color:var(--dh-emerald-700,#0d5c46);padding:16px 22px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #e4dfcc;}
.mrh-ico{width:42px;height:42px;border-radius:12px;background:#e7f4ee;display:grid;place-items:center;font-size:1.3rem;flex:none;}
.mrh-title{margin:0;font-size:1.25rem;font-weight:800;color:var(--dh-emerald-700,#0d5c46);}
.mrh-x{margin-inline-start:auto;background:#f1efe4;border:none;color:#5a6b63;width:36px;height:36px;border-radius:50%;font-size:1rem;cursor:pointer;}
.mrh-steps{display:flex;align-items:center;gap:6px;padding:16px 22px 0;}
.mrh-st{display:flex;align-items:center;gap:8px;font-size:.82rem;font-weight:700;color:#5a6b63;}
.mrh-st b{width:26px;height:26px;border-radius:50%;background:#ece8d6;display:grid;place-items:center;font-size:.8rem;}
.mrh-st.on{color:#0d5c46;}.mrh-st.on b{background:#0d5c46;color:#fff;}.mrh-st.done b{background:#147c5e;color:#fff;}
.mrh-ln{flex:1;height:2px;background:#e6e1cf;}
.mrh-body{padding:16px 22px 10px;}
.mrh-banner{background:#fffbeb;border:2px solid #fcd34d;color:#92400e;border-radius:14px;padding:10px 14px;margin-bottom:16px;font-weight:700;font-size:.95rem;}
.mrh-banner button{background:none;border:none;color:#92400e;font-weight:800;cursor:pointer;font-family:inherit;text-decoration:underline;}
.mrh-banner-list{margin-top:8px;display:flex;flex-wrap:wrap;gap:8px;}
.mrh-chip-name{background:#fff;border:1px solid #fcd34d;border-radius:999px;padding:4px 12px;cursor:pointer;font-family:inherit;font-weight:700;color:#92400e;}
.mrh-toast{background:#ecfdf5;border:2px solid #6ee7b7;color:#065f46;border-radius:14px;padding:10px 14px;margin-bottom:16px;font-weight:800;}
.mrh-search{width:100%;box-sizing:border-box;padding:15px 18px;border-radius:18px;border:2px solid #147c5e;font-size:1.15rem;font-family:inherit;background:#fff;box-shadow:0 0 0 5px rgba(20,124,94,.1);}
.mrh-search:focus{outline:none;}
.mrh-list{margin-top:10px;display:flex;flex-direction:column;gap:8px;}
.mrh-item{display:flex;align-items:center;gap:12px;background:#fff;border:1.5px solid #e4dfcc;border-radius:16px;padding:10px 14px;cursor:pointer;font-family:inherit;text-align:start;}
.mrh-item:hover,.mrh-item.mrh-first{border-color:#147c5e;background:#f3faf6;}
.mrh-av{width:44px;height:44px;border-radius:50%;background:#e7f4ee;border:2px solid var(--dh-emerald-700,#0d5c46);display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:800;color:var(--dh-emerald-700,#0d5c46);overflow:hidden;flex:none;}
.mrh-av img{width:100%;height:100%;object-fit:cover;}
.mrh-nm{font-weight:800;color:#10241c;font-size:1.1rem;}
.mrh-gr{color:#5a6b63;font-size:.85rem;}
.mrh-empty{color:#5a6b63;text-align:center;padding:14px;}
.mrh-stu-row{display:flex;align-items:center;gap:14px;margin-bottom:14px;background:linear-gradient(135deg,#0d5c46,#0a4736);color:#fff;border-radius:20px;padding:14px 16px;}
.mrh-stu-row .mrh-av{width:52px;height:52px;background:rgba(255,255,255,.15);border-color:var(--dh-gold-500,#d4af37);color:#fff;}
.mrh-stu-row .mrh-nm{color:#fff;}.mrh-stu-row .mrh-gr{color:#cfe8dd;}
.mrh-link{background:none;border:none;color:var(--dh-emerald-700,#0d5c46);font-weight:800;cursor:pointer;font-family:inherit;text-decoration:underline;margin-inline-start:auto;}
.mrh-stu-row .mrh-link{background:rgba(255,255,255,.14);color:#fff;text-decoration:none;border-radius:10px;padding:6px 12px;font-size:.82rem;}
.mrh-months{display:flex;gap:6px;overflow-x:auto;margin-bottom:14px;padding-bottom:2px;}
.mrh-month{flex:none;border:1.5px solid #e4dfcc;background:#fff;border-radius:999px;padding:8px 16px;font-family:inherit;font-weight:700;color:#10241c;cursor:pointer;font-size:.9rem;}
.mrh-month.mrh-sel{background:var(--dh-gold-500,#d4af37);border-color:var(--dh-gold-500,#d4af37);color:#2b2208;}
.mrh-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px;}
.mrh-tile{background:#fff;border:1.5px solid #e4dfcc;border-radius:16px;padding:12px 8px;text-align:center;}
.mrh-tile b{display:block;font-size:1.5rem;font-weight:800;color:#0d5c46;line-height:1.2;}
.mrh-tile small{color:#5a6b63;font-size:.75rem;}
.mrh-panel{border-radius:16px;padding:14px 16px;margin-bottom:10px;}
.mrh-panel.ready{background:#f3faf6;border:1.5px solid #bfe3d2;}
.mrh-panel.missing{background:#fffbeb;border:1.5px solid #f5d98a;}
.mrh-panel.nodata{background:#f1f5f9;border:1.5px solid #cbd5e1;}
.mrh-status{font-size:1.08rem;font-weight:800;margin-bottom:6px;color:#92400e;}.mrh-panel.nodata .mrh-status{color:#475569;}
.mrh-panel.ready .mrh-status{color:#0d5c46;}
.mrh-line{color:#334155;font-size:.95rem;line-height:1.8;}
.mrh-fixrow{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px;}
.mrh-fix{background:#b45309;color:#fff;border:none;border-radius:10px;padding:8px 14px;font-family:inherit;font-weight:800;cursor:pointer;}
.mrh-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0 8px;}
.mrh-btn{padding:14px;border-radius:14px;border:1.5px solid #e4dfcc;font-family:inherit;font-weight:700;font-size:1rem;cursor:pointer;background:#fff;color:#10241c;}
.mrh-btn#mrh-wa{grid-column:1/-1;background:var(--dh-emerald-700,#0d5c46);border-color:var(--dh-emerald-700,#0d5c46);color:#fff;font-weight:800;font-size:1.05rem;padding:15px;box-shadow:0 8px 18px rgba(13,92,70,.3);}
.mrh-ov{background:linear-gradient(135deg,#0d5c46,#0a4736);color:#fff;border-radius:20px;padding:14px 16px;margin-bottom:12px;}
.mrh-ov-top{display:flex;align-items:baseline;gap:8px;font-weight:800;font-size:1.05rem;}
.mrh-ov-top b{font-size:1.7rem;color:#f0d878;}
.mrh-bar{height:8px;border-radius:99px;background:rgba(255,255,255,.18);margin:10px 0 8px;overflow:hidden;}
.mrh-bar i{display:block;height:100%;background:linear-gradient(90deg,#f0d878,#d4af37);border-radius:99px;}
.mrh-ov-chips{display:flex;gap:8px;flex-wrap:wrap;font-size:.8rem;font-weight:700;}
.mrh-ov-chips span{background:rgba(255,255,255,.14);border-radius:99px;padding:2px 10px;}
.mrh-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0 2px;}
.mrh-tool{background:#fff;border:1.5px solid #e4dfcc;border-radius:99px;padding:5px 12px;font-family:inherit;font-weight:700;font-size:.82rem;color:#0d5c46;cursor:pointer;}
.mrh-list{max-height:46vh;overflow-y:auto;padding:2px;}
.mrh-item{position:relative;}
.mrh-ck{width:22px;height:22px;border-radius:7px;border:2px solid #cfc8b0;background:#fff;display:grid;place-items:center;flex:none;color:#fff;font-size:.8rem;cursor:pointer;}
.mrh-item.sel .mrh-ck{background:#0d5c46;border-color:#0d5c46;}
.mrh-item.sel{border-color:#147c5e;background:#f3faf6;}
.mrh-chip{margin-inline-start:auto;border-radius:99px;font-size:.74rem;font-weight:800;padding:2px 10px;white-space:nowrap;}
.mrh-chip.done{background:#e7f4ee;color:#047857;}.mrh-chip.ready{background:#fbf3d5;color:#8a6612;}
.mrh-chip.missing{background:#fffbeb;color:#b45309;}.mrh-chip.nodata{background:#f1f5f9;color:#64748b;}
.mrh-bulkbar{position:sticky;bottom:0;background:#fffdf6;border-top:1px solid #e4dfcc;margin:10px -22px 0;padding:10px 22px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.mrh-bulkbar .mrh-btn{grid-column:auto;flex:1;padding:12px;font-size:.95rem;background:#0d5c46;border-color:#0d5c46;color:#fff;font-weight:800;}
.mrh-mode{display:flex;border:1.5px solid #e4dfcc;border-radius:12px;overflow:hidden;}
.mrh-mode button{padding:9px 12px;font-family:inherit;font-weight:700;font-size:.85rem;background:#fff;border:0;cursor:pointer;color:#5a6b63;}
.mrh-mode button.on{background:#0d5c46;color:#fff;}
.mrh-next{text-align:center;padding:10px 0 16px;}
.mrh-next .mrh-nm{font-size:1.4rem;margin:10px 0;}
.mrh-paper{background:#fff;border:1.5px solid #e4dfcc;border-radius:18px;padding:12px;margin-bottom:10px;box-shadow:0 4px 14px rgba(6,35,28,.06);}
.mrh-paper-h{font-size:.8rem;font-weight:800;color:#5a6b63;margin-bottom:10px;display:flex;gap:6px;align-items:center;border-bottom:1px dashed #e4dfcc;padding-bottom:8px;}
.mrh-paper .mrh-tiles{margin-bottom:8px;}
.mrh-paper .mrh-panel{margin-bottom:8px;}
.mrh-d{display:block;font-style:normal;font-size:.72rem;font-weight:800;margin-top:2px;}
.mrh-d.up{color:#047857;}.mrh-d.down{color:#b45309;}
.mrh-note{color:#92400e;font-size:.85rem;margin:2px 0 8px;}
.mrh-foot{padding:6px 22px 18px;color:#5a6b63;font-size:.9rem;text-align:center;}
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
        <span class="mrh-ico">📅</span>
        <h2 class="mrh-title">${esc(t('mrh_title'))}</h2>
        <button class="mrh-x" id="mrh-close" aria-label="${esc(t('mrh_close'))}">✕</button>
      </div>
      <div id="mrh-steps"></div>
      <div class="mrh-body" id="mrh-body"></div>
      <div class="mrh-foot" id="mrh-foot"></div>
    </div>`;
  document.body.appendChild(overlay);
  const body = overlay.querySelector('#mrh-body');
  const foot = overlay.querySelector('#mrh-foot');
  const stepsHost = overlay.querySelector('#mrh-steps');
  overlay.querySelector('#mrh-close').addEventListener('click', () => overlay.remove());

  function stepsHtml(n) {
    const st = (i, k) => `<div class="mrh-st ${i < n ? 'done' : i === n ? 'on' : ''}"><b>${i < n ? '✓' : i}</b>${esc(t(k))}</div>`;
    return `<div class="mrh-steps">${st(1, 'mrh_step_student')}<div class="mrh-ln"></div>${st(2, 'mrh_step_month')}<div class="mrh-ln"></div>${st(3, 'mrh_step_export')}</div>`;
  }
  function doneTodayCount() {
    const today = new Date().toDateString();
    return Object.values(readDone()).filter(ts => { const d = new Date(ts); return !isNaN(d) && d.toDateString() === today; }).length;
  }
  function renderFoot() {
    const n = doneTodayCount();
    foot.textContent = n ? t('mrh_done_today').replace('{n}', n) : '';
  }

  // ---- شاشة 1: نظرة شاملة + بحث + تحديد جماعي ----
  async function showSearch(toastText, presetMonth) {
    stepsHost.innerHTML = stepsHtml(1);
    const months = recentMonths();
    let sel = (presetMonth && months.find(m => m.year === presetMonth.year && m.month1 === presetMonth.month1))
      || (new Date().getDate() <= REMINDER_DAYS ? months[1] : months[0]);
    const selected = new Set();
    let rows = [];
    let mode = 'whatsapp';
    body.innerHTML = `
      ${toastText ? `<div class="mrh-toast">${esc(toastText)}</div>` : ''}
      <div id="mrh-ov"></div>
      <div class="mrh-months" id="mrh-ovm"></div>
      <input class="mrh-search" id="mrh-search" type="text" autocomplete="off" placeholder="${esc(t('mrh_search_ph'))}">
      <div class="mrh-tools"><button class="mrh-tool" id="mrh-selpend">☑ ${esc(t('mrh_select_pending'))}</button><button class="mrh-tool" id="mrh-selnone">${esc(t('mrh_select_none'))}</button></div>
      <div class="mrh-list" id="mrh-list"><div class="mrh-empty">…</div></div>
      <div class="mrh-bulkbar" id="mrh-bulkbar" style="display:none;"></div>`;
    renderFoot();
    const input = body.querySelector('#mrh-search');
    const list = body.querySelector('#mrh-list');
    const bar = body.querySelector('#mrh-bulkbar');
    const chipLabel = { done: t('mrh_chip_done'), ready: t('mrh_chip_ready'), missing: t('mrh_chip_missing'), nodata: t('mrh_chip_nodata') };
    const rank = { ready: 0, missing: 1, done: 2, nodata: 3 };

    function renderMonths() {
      body.querySelector('#mrh-ovm').innerHTML = months.map((m, i) => `<button class="mrh-month ${m === sel ? 'mrh-sel' : ''}" data-i="${i}">${esc(monthName(m.year, m.month1, m.year !== new Date().getFullYear()))}</button>`).join('');
      body.querySelectorAll('#mrh-ovm .mrh-month').forEach(b => b.addEventListener('click', () => { sel = months[parseInt(b.dataset.i, 10)]; selected.clear(); loadRows(); }));
    }
    function renderOv() {
      const total = rows.length, done = rows.filter(r => r.state === 'done').length;
      const ready = rows.filter(r => r.state === 'ready').length, missing = rows.filter(r => r.state === 'missing').length;
      const pct = total ? Math.round(done / total * 100) : 0;
      body.querySelector('#mrh-ov').innerHTML = `<div class="mrh-ov">
        <div class="mrh-ov-top"><b>${done}/${total}</b><span>${esc(t('mrh_ov_progress').replace('{month}', monthName(sel.year, sel.month1, false)))}</span></div>
        <div class="mrh-bar"><i style="width:${pct}%"></i></div>
        <div class="mrh-ov-chips"><span>✓ ${esc(t('mrh_ov_ready_n').replace('{n}', ready))}</span><span>! ${esc(t('mrh_ov_missing_n').replace('{n}', missing))}</span></div></div>`;
    }
    function renderBar() {
      if (!selected.size) { bar.style.display = 'none'; return; }
      bar.style.display = 'flex';
      bar.innerHTML = `<div class="mrh-mode"><button data-m="whatsapp" class="${mode === 'whatsapp' ? 'on' : ''}">${esc(t('mrh_bulk_mode_wa'))}</button><button data-m="pdf" class="${mode === 'pdf' ? 'on' : ''}">${esc(t('mrh_bulk_mode_pdf'))}</button></div>
        <button class="mrh-btn" id="mrh-bulk-go">${esc(t('mrh_bulk_start').replace('{n}', selected.size))}</button>`;
      bar.querySelectorAll('.mrh-mode button').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; renderBar(); }));
      bar.querySelector('#mrh-bulk-go').addEventListener('click', () => {
        bulkQueue = { ids: rows.filter(r => selected.has(String(r.s.id))).map(r => String(r.s.id)), i: 0, mode, year: sel.year, month1: sel.month1 };
        runBulk();
      });
    }
    function renderList() {
      const q = norm(input.value);
      const found = rows.filter(r => !q || norm(r.s.name).includes(q));
      if (!found.length) { list.innerHTML = `<div class="mrh-empty">${esc(q ? t('mrh_no_match') : t('mrh_empty_list'))}</div>`; return; }
      list.innerHTML = found.map((r, i) => `
        <div class="mrh-item ${q && i === 0 ? 'mrh-first' : ''} ${selected.has(String(r.s.id)) ? 'sel' : ''}" data-id="${esc(r.s.id)}" role="button" tabindex="0">
          <span class="mrh-ck">${selected.has(String(r.s.id)) ? '✓' : ''}</span>
          <span class="mrh-av">${avatarHtml(r.s)}</span>
          <span><div class="mrh-nm">${esc(r.s.name)}</div><div class="mrh-gr">${esc(r.s.grade || '')}</div></span>
          <span class="mrh-chip ${r.state}">${esc(chipLabel[r.state])}</span>
        </div>`).join('');
      list.querySelectorAll('.mrh-item').forEach(el => el.addEventListener('click', (e) => {
        const id = el.dataset.id;
        if (e.target.closest('.mrh-ck')) {
          if (selected.has(id)) selected.delete(id); else selected.add(id);
          renderList(); renderBar(); return;
        }
        const st = students.find(x => String(x.id) === id);
        if (st) showStudent(st, { year: sel.year, month1: sel.month1 });
      }));
    }
    async function loadRows() {
      renderMonths();
      list.innerHTML = '<div class="mrh-empty">…</div>';
      const doneMap = readDone();
      rows = await Promise.all(students.map(async s => {
        const info = await getMonthInfo(s, sel.year, sel.month1);
        const done = !!doneMap[doneKey(s.id, sel.year, sel.month1)];
        return { s, info, state: done ? 'done' : info.status };
      }));
      rows.sort((x, y) => (rank[x.state] - rank[y.state]) || String(x.s.name || '').localeCompare(String(y.s.name || ''), 'ar'));
      if (!body.isConnected) return;
      renderOv(); renderList(); renderBar();
    }
    input.addEventListener('input', renderList);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const first = list.querySelector('.mrh-item'); if (first) first.click(); }
    });
    body.querySelector('#mrh-selpend').addEventListener('click', () => {
      rows.forEach(r => { if (r.state === 'ready' || r.state === 'missing') selected.add(String(r.s.id)); });
      renderList(); renderBar();
    });
    body.querySelector('#mrh-selnone').addEventListener('click', () => { selected.clear(); renderList(); renderBar(); });
    await loadRows();
  }

  // ---- التصدير الجماعي: طابور يعبر شاشة التقرير طالبًا بعد طالب ----
  function runBulk() {
    const q = bulkQueue;
    const st = q && students.find(s => String(s.id) === q.ids[q.i]);
    if (!st) { bulkQueue = null; showSearch(); return; }
    overlay.remove();
    import('../reports/monthly-report.js').then(m => m.openMonthlyReportScreen({
      student: st, year: q.year, monthIndex0: q.month1 - 1, autoExport: q.mode, returnTo: 'hub'
    })).catch(err => { console.error('[monthlyReportsHub.js] تعذر فتح التقرير:', err); bulkQueue = null; alert(t('mr_export_error')); });
  }
  function showBulkNext() {
    const q = bulkQueue;
    const st = students.find(s => String(s.id) === q.ids[q.i]);
    stepsHost.innerHTML = stepsHtml(3);
    body.innerHTML = `<div class="mrh-next">
      <div class="mrh-gr">${esc(t('mrh_bulk_progress').replace('{i}', q.i + 1).replace('{n}', q.ids.length))}</div>
      <div class="mrh-bar" style="background:#e6e1cf"><i style="width:${Math.round(q.i / q.ids.length * 100)}%"></i></div>
      <span class="mrh-av" style="margin:6px auto 0;">${avatarHtml(st)}</span>
      <div class="mrh-nm">${esc(t('mrh_bulk_next').replace('{name}', st ? st.name : ''))}</div>
      <div class="mrh-actions"><button class="mrh-btn" id="mrh-bulk-next" style="grid-column:1/-1;background:#0d5c46;color:#fff;">▶ ${esc(t('mrh_bulk_go'))}</button>
      <button class="mrh-btn" id="mrh-bulk-stop" style="grid-column:1/-1;">${esc(t('mrh_bulk_stop'))}</button></div></div>`;
    renderFoot();
    body.querySelector('#mrh-bulk-next').addEventListener('click', runBulk);
    body.querySelector('#mrh-bulk-stop').addEventListener('click', () => { bulkQueue = null; showSearch(); });
  }

  // ---- شاشة 2: بطاقة الطالب ----
  async function showStudent(student, preset) {
    const months = recentMonths();
    let sel = (preset && months.find(m => m.year === preset.year && m.month1 === preset.month1)) || months[0];

    async function render() {
      const info = await getMonthInfo(student, sel.year, sel.month1);
      const pd = new Date(sel.year, sel.month1 - 2, 1);
      const prev = await getMonthInfo(student, pd.getFullYear(), pd.getMonth() + 1);
      const done = readDone()[doneKey(student.id, sel.year, sel.month1)];
      const mName = monthName(sel.year, sel.month1, sel.year !== new Date().getFullYear());
      // إشارات الأشهر (سريعة: تُحسب مرة واحدة لكل عرض)
      const infos = await Promise.all(months.map(m => (m.year === sel.year && m.month1 === sel.month1) ? info : getMonthInfo(student, m.year, m.month1)));
      const mark = (i) => infos[i].status === 'ready' ? '✅' : (infos[i].status === 'missing' ? '⚠️' : '⚪');

      const dl = (cur, old, suf) => (cur == null || old == null || cur === old) ? '' : `<em class="mrh-d ${cur > old ? 'up' : 'down'}" title="${esc(t('mrh_vs_prev'))}">${cur > old ? '▲' : '▼'} ${Math.abs(cur - old)}${suf || ''}</em>`;
      const tiles = info.status === 'nodata' ? '' : `<div class="mrh-tiles">
          <div class="mrh-tile"><b>${info.newAyahs != null ? info.newAyahs : '—'}</b><small>${esc(t('mrh_tile_ayahs'))}</small>${dl(info.newAyahs, prev.newAyahs)}</div>
          <div class="mrh-tile"><b>${info.games.n}</b><small>${esc(t('mrh_tile_sessions'))}</small>${dl(info.games.n, prev.games.n)}</div>
          <div class="mrh-tile"><b>${info.games.avg != null ? info.games.avg + '٪' : '—'}</b><small>${esc(t('mrh_tile_avg'))}</small>${dl(info.games.avg, prev.games.avg, '٪')}</div>
        </div>`;
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

      stepsHost.innerHTML = stepsHtml(2);
      body.innerHTML = `
        <div class="mrh-stu-row">
          <span class="mrh-av">${avatarHtml(student)}</span>
          <span><div class="mrh-nm">${esc(student.name)}</div><div class="mrh-gr">${esc(student.grade || '')}</div></span>
          <button class="mrh-link" id="mrh-change">${esc(t('mrh_change_student'))}</button>
        </div>
        <div class="mrh-months">
          ${months.map((m, i) => `<button class="mrh-month ${m === sel ? 'mrh-sel' : ''}" data-i="${i}">${mark(i)} ${esc(m.isCurrent ? t('mrh_current_month') + ' · ' : '')}${esc(monthName(m.year, m.month1, m.year !== new Date().getFullYear()))}</button>`).join('')}
        </div>
        <div class="mrh-paper">
          <div class="mrh-paper-h">📄 ${esc(t('mrh_preview_paper'))} · ${esc(mName)}</div>
          ${tiles}
          ${panel}
          ${reviewRow}
        </div>
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
  if (bulkQueue && back) {
    bulkQueue.i++;
    if (bulkQueue.i < bulkQueue.ids.length) { showBulkNext(); return; }
    const n = bulkQueue.ids.length;
    bulkQueue = null;
    await showSearch(t('mrh_bulk_done').replace('{n}', n));
    return;
  }
  bulkQueue = null;
  if (back) {
    const st = students.find(s => String(s.id) === String(back.studentId));
    const ts = readDone()[doneKey(back.studentId, back.year, back.month1)];
    const exportedNow = ts && new Date(ts).getTime() >= (back.openedAt || 0);
    if (st && exportedNow) { await showSearch(t('mrh_exported_ok').replace('{name}', st.name)); return; }
    if (st) { await showStudent(st, { year: back.year, month1: back.month1 }); return; }
  }
  await showSearch();
}
