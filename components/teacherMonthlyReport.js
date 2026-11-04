// components/teacherMonthlyReport.js
// =============================================================================
// 📊 «تقرير المعلم الشهري» — إحصاء بسيط وواضح لما أنجزه المعلم مع طلابه في الشهر (بلا مستويات ولا أوسمة ولا تحفيز):
// الحلقات، الحفظ الجديد، المراجعة، ألعاب الكبار وألعاب الصغار (عددًا ووقتًا)، المواجهات الثنائية، الواجبات، المتشابهات،
// تحدي التجويد، وجدول بكل طالب بلا استثناء. الحسابات في engine/teacherReportEngine.js وجمع البيانات في core/teacherReportService.js.
// تُحقن الشاشة فوق المحتوى وتحت الترويسة الوحيدة #main-header. ثنائية اللغة والاتجاه، والمظهر الداكن بالرموز --dh-*.
// =============================================================================
import { AppState } from '../core/app.js';
import { t, tf } from '../core/i18n.js';
import '../core/i18n-teacherreport.js';
import { loadTeacherMonthReport } from '../core/teacherReportService.js';

const STYLE_ID = 'tmr-styles';
const MONTHS_BACK = 12;                // الحالي + 11 سابقة
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const locale = () => (AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US') + '-u-nu-latn';
const isAr = () => AppState.currentLang === 'ar';
const monthLabel = (y, m0) => { try { return new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' }).format(new Date(y, m0, 1)); } catch (e) { return `${m0 + 1}/${y}`; } };
const nf = (n) => { try { return new Intl.NumberFormat(locale()).format(n); } catch (e) { return String(n); } };

/** مدة نصية من دقائق: "3 ساعة و12 دقيقة" / "45 دقيقة"؛ الصفر "—". */
export function formatMinutes(totalMin) {
    const min = Math.max(0, Math.round(Number(totalMin) || 0));
    if (!min) return t('tr_dur_zero');
    const h = Math.floor(min / 60), m = min % 60;
    if (h && m) return tf('tr_dur_hm', { h: nf(h), m: nf(m) });
    if (h) return tf('tr_dur_h', { h: nf(h) });
    return tf('tr_dur_m', { m: nf(m) });
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = `
.tmr-overlay{position:fixed;top:0;right:0;bottom:0;left:0;z-index:10000;background:var(--dh-surface-0);overflow-y:auto;font-family:'IBM Plex Sans Arabic',sans-serif;color:var(--dh-ink);}
.tmr-wrap{max-width:900px;margin:0 auto;padding:14px 16px 40px;box-sizing:border-box;}
.tmr-wrap[dir="rtl"]{direction:rtl;}.tmr-wrap[dir="ltr"]{direction:ltr;}
.tmr-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;}
.tmr-bar h2{margin:0;font-size:1.35rem;font-weight:700;flex:1;min-width:160px;color:var(--dh-ink) !important;text-shadow:none !important;}
.tmr-btn{background:var(--dh-surface-3);border:1px solid var(--dh-border-strong);color:var(--dh-ink);min-height:44px;min-width:44px;border-radius:12px;padding:0 14px;cursor:pointer;font-family:inherit;font-weight:700;font-size:.92rem;display:inline-flex;align-items:center;justify-content:center;gap:6px;}
.tmr-btn:focus-visible{outline:3px solid var(--dh-focus);outline-offset:2px;}
.tmr-btn[disabled]{opacity:.4;cursor:default;}
.tmr-monthnav{display:flex;align-items:center;gap:8px;}
.tmr-month{font-weight:700;min-width:130px;text-align:center;}
.tmr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-bottom:16px;}
.tmr-card{background:var(--dh-surface-2);border:1px solid var(--dh-border);border-radius:16px;padding:14px;}
.tmr-card h3{margin:0 0 8px;font-size:1.05rem;font-weight:700;color:var(--dh-ok-ink) !important;text-shadow:none !important;}
.tmr-row{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:5px 0;border-top:1px solid var(--dh-border-soft);}
.tmr-row:first-of-type{border-top:0;}
.tmr-row span{color:var(--dh-ink-soft);font-size:.95rem;}
.tmr-row b{font-size:1.5rem;font-weight:700;color:var(--dh-ink);}
.tmr-list{columns:2 300px;column-gap:32px;background:var(--dh-surface-2);border:1px solid var(--dh-border);border-radius:16px;padding:6px 16px 10px;margin-bottom:16px;}
.tmr-row,.tmr-group{break-inside:avoid;}
.tmr-list .tmr-row b{font-size:1.2rem;}
.tmr-group{margin-top:12px;padding-bottom:2px;font-weight:700;color:var(--dh-ok-ink);border-bottom:2px solid var(--dh-border);}
.tmr-sec summary{cursor:pointer;font-weight:700;color:var(--dh-ok-ink);font-size:1.02rem;min-height:32px;}
.tmr-sec[open] summary{margin-bottom:10px;}
.tmr-total{background:var(--dh-surface-2);border:1px solid var(--dh-border);border-radius:16px;padding:12px 14px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;}
.tmr-total b{font-size:1.4rem;color:var(--dh-ok-ink);}
.tmr-sec{background:var(--dh-surface-2);border:1px solid var(--dh-border);border-radius:16px;padding:14px;margin-bottom:16px;}
.tmr-sec h3{margin:0 0 10px;font-size:1.05rem;font-weight:700;color:var(--dh-ok-ink) !important;text-shadow:none !important;}
.tmr-table{width:100%;border-collapse:collapse;font-size:.9rem;}
.tmr-table th,.tmr-table td{padding:8px 8px;border-bottom:1px solid var(--dh-border-soft);text-align:center;}
.tmr-table th:first-child,.tmr-table td:first-child{text-align:start;}
.tmr-table th{color:var(--dh-ink-soft);font-size:.78rem;}
.tmr-scroll{overflow-x:auto;}
.tmr-tag{color:var(--dh-ink-soft);font-size:.78rem;}
.tmr-note{color:var(--dh-ink-soft);font-size:.8rem;line-height:1.8;margin-top:6px;}
.tmr-center{text-align:center;padding:50px 16px;font-weight:700;color:var(--dh-ink-soft);}
.tmr-toast{position:fixed;bottom:22px;inset-inline:0;margin:auto;width:max-content;max-width:90vw;background:var(--dh-surface-3);color:var(--dh-ink);border:1px solid var(--dh-border-strong);padding:10px 18px;border-radius:99px;font-weight:700;z-index:10001;}
@media (max-width:600px){.tmr-wrap{padding:10px 12px 90px;}.tmr-bar h2{font-size:1.15rem;}}
@media print{
  body>*:not(.tmr-overlay){display:none !important;}
  .tmr-overlay{position:static !important;overflow:visible !important;background:transparent !important;}
  .tmr-noprint{display:none !important;}
  .tmr-card,.tmr-sec{break-inside:avoid;}
}
`;
    document.head.appendChild(st);
}

// الشاشة تبدأ من أسفل الترويسة الوحيدة (#main-header) — لا ترويسة خاصة بها
function placeBelowMainHeader(overlay) {
    const h = document.getElementById('main-header');
    if (h) overlay.style.top = Math.max(0, Math.round(h.getBoundingClientRect().bottom)) + 'px';
}


function reportHtml(r) {
    if (r.empty) return `<div class="tmr-center">${esc(t('tr_empty'))}</div>`;
    const L = (label, value) => `<div class="tmr-row"><span>${esc(label)}</span><b>${esc(value)}</b></div>`;
    const G = (title) => `<div class="tmr-group">${esc(title)}</div>`;
    const list = [
        L(t('tr_active'), tf('tr_active_v', { a: nf(r.studentsActive), n: nf(r.studentsTotal) })),
        L(t('tr_circles'), nf(r.circles)),
        G(t('tr_memo')), L(t('tr_memo_students'), nf(r.memo.students)), L(t('tr_memo_ayahs'), nf(r.memo.ayahs)),
        G(t('tr_review')), L(t('tr_review_ayahs'), nf(r.review.ayahs)), L(t('tr_review_surahs'), nf(r.review.surahs)), L(t('tr_review_juz'), nf(r.review.juz)),
        G(t('tr_games_group')), L(t('tr_adult') + ' — ' + t('tr_games_count'), nf(r.adult.games)), L(t('tr_adult') + ' — ' + t('tr_games_time'), formatMinutes(r.adult.minutes)),
        L(t('tr_kids') + ' — ' + t('tr_games_count'), nf(r.kids.games)), L(t('tr_kids') + ' — ' + t('tr_games_time'), formatMinutes(r.kids.minutes)),
        L(t('tr_games_total_time'), formatMinutes(r.gamesMinutes)),
        L(t('tr_duels'), nf(r.duels)),
        G(t('tr_hw')), L(t('tr_hw_made'), nf(r.homework.made)), L(t('tr_hw_submitted'), nf(r.homework.submitted)),
        G(t('tr_sim')), L(t('tr_sim_rounds'), nf(r.similarity)),
        G(t('tr_tj')), L(t('tr_tj_challenge'), nf(r.tajweed.challenge)), L(t('tr_tj_all'), nf(r.tajweed.sessions)), L(t('tr_tj_learned'), nf(r.tajweed.learned)),
        G(t('tr_other')), L(t('tr_stars'), nf(r.stars))
    ];
    return `<section class="tmr-list">${list.join('')}</section>${tableHtml(r)}<p class="tmr-note">${esc(t('tr_note'))}</p>`;
}

function tableHtml(r) {
    const rows = r.students || [];
    if (!rows.length) return '';
    const d = (n) => (n ? nf(n) : '—');
    const body = rows.map(s => `<tr><td>${esc(s.name)}${s.hidden ? ` <span class="tmr-tag">(${esc(t('tr_hidden_tag'))})</span>` : ''}</td><td>${d(s.circles)}</td><td>${d(s.adult)}</td><td>${d(s.kids)}</td><td>${d(s.duels)}</td><td>${d(s.newAyahs)}</td><td>${d(s.review)}</td><td>${d(s.hwAssigned)}</td><td>${d(s.hwSubmitted)}</td><td>${d(s.similarity)}</td><td>${d(s.tajweed)}</td></tr>`).join('');
    const cols = ['student', 'circles', 'adult', 'kids', 'duels', 'memo', 'review', 'hwmade', 'hwsub', 'sim', 'tj'].map(k => `<th>${esc(t('tr_col_' + k))}</th>`).join('');
    return `<details class="tmr-sec"><summary>${esc(t('tr_show_students'))} (${nf(rows.length)})</summary><div class="tmr-scroll"><table class="tmr-table"><thead><tr>${cols}</tr></thead><tbody>${body}</tbody></table></div></details>`;
}

/** نص ملخص قابل للنسخ (واتساب) بلغة الواجهة. */
export function shareText(r) {
    return [
        tf('tr_share_head', { month: monthLabel(r.year, r.monthIndex0) }),
        tf('tr_share_active', { a: nf(r.studentsActive), n: nf(r.studentsTotal) }),
        tf('tr_share_circles', { n: nf(r.circles) }),
        tf('tr_share_memo', { s: nf(r.memo.students), n: nf(r.memo.ayahs) }),
        tf('tr_share_review', { n: nf(r.review.ayahs), s: nf(r.review.surahs), j: nf(r.review.juz) }),
        tf('tr_share_adult', { n: nf(r.adult.games), t: formatMinutes(r.adult.minutes) }),
        tf('tr_share_kids', { n: nf(r.kids.games), t: formatMinutes(r.kids.minutes) }),
        tf('tr_share_duels', { n: nf(r.duels) }),
        tf('tr_share_hw', { m: nf(r.homework.made), s: nf(r.homework.submitted) }),
        tf('tr_share_sim', { n: nf(r.similarity) }),
        tf('tr_share_tj', { n: nf(r.tajweed.challenge) }),
        tf('tr_share_stars', { n: nf(r.stars) })
    ].join('\n');
}

function toast(text) {
    const el = document.createElement('div');
    el.className = 'tmr-toast tmr-noprint';
    el.setAttribute('role', 'status');
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
}

async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* احتياطي */ }
    try {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        const ok = document.execCommand('copy'); ta.remove(); return ok;
    } catch (e) { return false; }
}

/** يفتح شاشة تقرير المعلم لشهر (الافتراضي: الشهر الحالي). */
export function openTeacherMonthlyReport(opts = {}) {
  ensureStyles();
  document.getElementById('tmr-overlay')?.remove();
  const now = new Date();
  const base = { y: now.getFullYear(), m: now.getMonth() };
  let sel = { y: opts.year != null ? opts.year : base.y, m: opts.monthIndex0 != null ? opts.monthIndex0 : base.m };
  let current = null, token = 0;

  const overlay = document.createElement('div');
  overlay.className = 'tmr-overlay';
  overlay.id = 'tmr-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', t('tr_title'));
  placeBelowMainHeader(overlay);
  document.body.appendChild(overlay);
  const onResize = () => placeBelowMainHeader(overlay);
  window.addEventListener('resize', onResize);

  const monthsBack = (y, m) => (base.y - y) * 12 + (base.m - m);
  const close = () => {
    window.removeEventListener('resize', onResize);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('app-lang-changed', rerender);
    overlay.remove();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);

  const shell = (inner) => {
    const back = monthsBack(sel.y, sel.m);
    return `<div class="tmr-wrap" dir="${isAr() ? 'rtl' : 'ltr'}">
      <div class="tmr-bar">
        <button type="button" class="tmr-btn tmr-noprint" id="tmr-close" aria-label="${esc(t('tr_close'))}"><span aria-hidden="true">✕</span> ${esc(t('tr_close'))}</button>
        <h2>${esc(t('tr_title'))}</h2>
        <div class="tmr-monthnav tmr-noprint">
          <button type="button" class="tmr-btn" id="tmr-prev" aria-label="${esc(t('tr_prev_month'))}"${back >= MONTHS_BACK - 1 ? ' disabled' : ''}><span aria-hidden="true">${isAr() ? '▶' : '◀'}</span></button>
          <span class="tmr-month" aria-live="polite">${esc(monthLabel(sel.y, sel.m))}</span>
          <button type="button" class="tmr-btn" id="tmr-next" aria-label="${esc(t('tr_next_month'))}"${back <= 0 ? ' disabled' : ''}><span aria-hidden="true">${isAr() ? '◀' : '▶'}</span></button>
        </div>
        <button type="button" class="tmr-btn tmr-noprint" id="tmr-copy"${current && !current.empty ? '' : ' disabled'}>📋 ${esc(t('tr_copy'))}</button>
        <button type="button" class="tmr-btn tmr-noprint" id="tmr-print"${current && !current.empty ? '' : ' disabled'}>🖨️ ${esc(t('tr_print'))}</button>
      </div>${inner}</div>`;
  };

  const bind = () => {
    overlay.querySelector('#tmr-close').onclick = close;
    overlay.querySelector('#tmr-prev').onclick = () => go(-1);
    overlay.querySelector('#tmr-next').onclick = () => go(1);
    overlay.querySelector('#tmr-copy').onclick = async () => { if (current) toast(t((await copyText(shareText(current))) ? 'tr_copied' : 'tr_copy_fail')); };
    overlay.querySelector('#tmr-print').onclick = () => window.print();
    const retry = overlay.querySelector('#tmr-retry');
    if (retry) retry.onclick = () => load();
  };

  function go(dir) {
    const d = new Date(sel.y, sel.m + dir, 1);
    const nb = monthsBack(d.getFullYear(), d.getMonth());
    if (nb < 0 || nb > MONTHS_BACK - 1) return;
    sel = { y: d.getFullYear(), m: d.getMonth() };
    load();
  }

  function render() {
    if (!current) return;
    const r = current;
    const body = reportHtml(r);
    overlay.innerHTML = shell(body);
    bind();
    overlay.scrollTop = 0;
  }
  const rerender = () => { if (current) render(); else overlay.innerHTML = shell(`<div class="tmr-center">${esc(t('tr_loading'))}</div>`), bind(); };
  document.addEventListener('app-lang-changed', rerender);

  async function load() {
    const my = ++token;
    current = null;
    overlay.innerHTML = shell(`<div class="tmr-center" role="status">${esc(t('tr_loading'))}</div>`);
    bind();
    try {
      const rep = await loadTeacherMonthReport(sel.y, sel.m, { now: new Date() });
      if (my !== token) return;       // المعلم انتقل لشهر آخر أثناء الحساب
      current = rep;
      render();
    } catch (e) {
      if (my !== token) return;
      console.error('[teacherMonthlyReport] تعذر إعداد التقرير:', e);
      overlay.innerHTML = shell(`<div class="tmr-center">${esc(t('tr_load_error'))}<br><br><button type="button" class="tmr-btn" id="tmr-retry">${esc(t('tr_retry'))}</button></div>`);
      bind();
    }
  }
  load();
  return { close };
}
