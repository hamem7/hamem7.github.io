// components/reviewLogCard.js — «دفتر المراجعة» في ملف الطالب:
//  • مربع الإحصاء العلوي (بدل «إجمالي النقاط»): آيات هذا الشهر + تفصيل الألعاب/الواجب.
//  • قسم «دفتر المراجعة» : رسم أعمدة لآخر ١٢ شهراً (ألعاب/واجب) + جدول كل شهر (الإجمالي والتفصيل) + الإجمالي منذ البداية.
// المصدر: core/reviewLog.js (ألعاب من سجل الأداء، وواجب عند التسليم). الألوان برموز الهوية فتنقلب مع المظهر الداكن.
import { AppState, t } from '../core/app.js';
import { esc } from '../core/escape.js';
import { reviewCountsForMonth } from '../engine/ayahCount.js';

const MONTHS_CHART = 12;
const fmt = (n) => Number(n || 0).toLocaleString(AppState.currentLang === 'en' ? 'en-US' : 'ar-EG');
const fill = (k, o) => Object.keys(o).reduce((s, key) => s.replace(`{${key}}`, o[key]), t(k));
const monthLabel = (y, m, short) => new Intl.DateTimeFormat(AppState.currentLang === 'en' ? 'en-US' : 'ar-EG', { month: short ? 'short' : 'long', year: short ? '2-digit' : 'numeric' }).format(new Date(y, m, 1));

// الأشهر من أقدم شهر فيه بيانات (أو آخر ١٢) إلى الشهر الحالي، من الأحدث للأقدم
function monthsList(items, now = new Date()) {
    const all = [...(items.games || []), ...(items.homework || [])].filter(x => x && x.ts && x.n);
    let y = now.getFullYear(), m = now.getMonth();
    const out = [];
    const first = all.length ? new Date(Math.min(...all.map(x => x.ts))) : null;
    while (true) {
        out.push({ y, m, ...reviewCountsForMonth(items, y, m) });
        if (out.length >= 60) break;
        if (out.length >= MONTHS_CHART && (!first || (y < first.getFullYear() || (y === first.getFullYear() && m <= first.getMonth())))) break;
        if (first && y === first.getFullYear() && m === first.getMonth()) break;
        m--; if (m < 0) { m = 11; y--; }
    }
    return out;
}

function topStat(box, cur) {
    const v = document.getElementById('prof-review-ayahs'), sub = document.getElementById('prof-review-sub'), l = document.getElementById('prof-review-lbl');
    if (v) v.textContent = fmt(cur.total);
    if (l) l.textContent = t('rvl_stat_label');
    if (sub) sub.textContent = fill('rvl_stat_sub', { g: fmt(cur.games), h: fmt(cur.homework) });
}

function draw(container, items) {
    const months = monthsList(items);
    const cur = months[0];
    topStat(null, cur);
    if (!container) return;
    const totalAll = months.reduce((s, x) => ({ g: s.g + x.games, h: s.h + x.homework }), { g: 0, h: 0 });
    if (totalAll.g + totalAll.h === 0) { container.innerHTML = `<p class="pf-note" style="margin:0;color:var(--dh-ink-soft)">${esc(t('rvl_empty'))}</p>`; return; }
    const chart = months.slice(0, MONTHS_CHART).reverse();
    const max = Math.max(1, ...chart.map(x => x.total));
    const bars = chart.map(x => {
        const hg = Math.round(x.games / max * 100), hh = Math.round(x.homework / max * 100);
        const tip = `${monthLabel(x.y, x.m)}: ${fill('rvl_tip', { t: fmt(x.total), g: fmt(x.games), h: fmt(x.homework) })}`;
        return `<div class="rvl-col" title="${esc(tip)}" aria-label="${esc(tip)}">
          <div class="rvl-num">${x.total ? fmt(x.total) : ''}</div>
          <div class="rvl-stack"><i class="rvl-seg rvl-h" style="height:${hh}%"></i><i class="rvl-seg rvl-g" style="height:${hg}%"></i></div>
          <div class="rvl-mon">${esc(monthLabel(x.y, x.m, true))}</div></div>`;
    }).join('');
    const rows = months.filter(x => x.total > 0 || x === cur).map(x => `<tr${x === cur ? ' class="rvl-cur"' : ''}>
        <th scope="row">${esc(monthLabel(x.y, x.m))}</th><td class="rvl-t">${fmt(x.total)}</td><td>${fmt(x.games)}</td><td>${fmt(x.homework)}</td></tr>`).join('');
    container.innerHTML = `
      <style>
        .rvl-sum{font-weight:800;margin:0 0 10px;color:var(--dh-ink)}
        .rvl-sum small{display:block;font-weight:600;color:var(--dh-ink-soft);margin-top:2px}
        .rvl-chart{display:flex;align-items:flex-end;gap:6px;height:170px;padding:8px 6px;border:1.5px solid var(--dh-border-strong);border-radius:14px;background:var(--dh-surface-3)}
        .rvl-col{flex:1;min-width:0;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:3px}
        .rvl-num{font-size:.7rem;font-weight:700;color:var(--dh-ink-soft);height:1em;line-height:1}
        .rvl-stack{width:100%;max-width:34px;flex:1;display:flex;flex-direction:column;justify-content:flex-end}
        .rvl-seg{display:block;width:100%}
        .rvl-g{background:var(--dh-info);border-radius:0 0 4px 4px}
        .rvl-h{background:var(--dh-ok);border-radius:4px 4px 0 0}
        .rvl-mon{font-size:.68rem;color:var(--dh-ink-soft);white-space:nowrap}
        .rvl-legend{display:flex;gap:14px;flex-wrap:wrap;margin:8px 0 12px;font-size:.88rem;color:var(--dh-ink)}
        .rvl-legend i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-inline-end:5px;vertical-align:-1px}
        .rvl-tbl{width:100%;border-collapse:collapse;font-size:.95rem}
        .rvl-tbl th,.rvl-tbl td{padding:8px 6px;border-bottom:1px solid var(--dh-border-soft);text-align:center;color:var(--dh-ink)}
        .rvl-tbl thead th{font-size:.82rem;color:var(--dh-ink-soft);border-bottom:2px solid var(--dh-border)}
        .rvl-tbl tbody th{text-align:start;font-weight:700}
        .rvl-t{font-weight:800}
        .rvl-cur{background:var(--dh-surface-2)}
      </style>
      <p class="rvl-sum">${esc(fill('rvl_total_all', { n: fmt(totalAll.g + totalAll.h) }))}<small>${esc(fill('rvl_stat_sub', { g: fmt(totalAll.g), h: fmt(totalAll.h) }))}</small></p>
      <div class="rvl-chart" role="img" aria-label="${esc(t('rvl_chart_label'))}">${bars}</div>
      <div class="rvl-legend"><span><i style="background:var(--dh-info)"></i>${esc(t('rvl_games'))}</span><span><i style="background:var(--dh-ok)"></i>${esc(t('rvl_hw'))}</span></div>
      <table class="rvl-tbl"><thead><tr><th scope="col">${esc(t('rvl_col_month'))}</th><th scope="col">${esc(t('rvl_col_total'))}</th><th scope="col">${esc(t('rvl_games'))}</th><th scope="col">${esc(t('rvl_hw'))}</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="pf-note" style="margin:10px 0 0;color:var(--dh-ink-soft);font-size:.85rem">${esc(t('rvl_note'))}</p>`;
}

export async function renderReviewLogCard(student, container) {
    if (!student) return;
    const rl = await import('../core/reviewLog.js');
    const load = async () => rl.reviewAyahItems(student);
    let items = await load();
    draw(container, items);
    const redraw = async () => { if (container && !container.isConnected) { document.removeEventListener('app-lang-changed', redraw); return; } draw(container, items); };
    document.addEventListener('app-lang-changed', redraw);
    // تحديث آيات الواجبات من الخادم ثم إعادة الرسم (بلا حجز للشاشة؛ بلا جلسة معلم نكتفي بالمحلي)
    try {
        if (await rl.refreshHomeworkReview()) { items = await load(); if (!container || container.isConnected) draw(container, items); }
    } catch (e) { /* اختياري */ }
}
