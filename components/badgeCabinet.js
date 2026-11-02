// components/badgeCabinet.js — «خزانة الأوسمة» في ملف الطالب: كل الأوسمة الـ14، المنال منها بأعلى درجة بلغها (بأثر رجعي من البيانات
// المؤرَّخة)، وغير المنال بظل مع شرط الحصول وعتباته. الضغط على وسام يشرح كيف يُنال أو يعيد مشهده.
import { AppState, t } from '../core/app.js';
import { tf } from '../core/i18n.js';
import '../core/i18n-badges.js';
import { esc } from '../core/escape.js';
import { BADGE_DEFS, TIER_KEYS } from '../engine/badgesEngine.js';
import { badgeHistory, consistencyTitle } from '../core/badgeService.js';
import { medalSVG, TIER_VARS, playBadge, showCeremony } from './badgeReveal.js';

const isEn = () => AppState.currentLang === 'en';
const num = (n) => (isEn() ? String(n) : Number(n).toLocaleString('ar-EG', { useGrouping: false }));

export async function renderBadgeCabinet(student, container) {
  if (!container) return;
  let hist;
  try { hist = await badgeHistory(student); } catch (e) { console.warn('[badgeCabinet]', e); container.innerHTML = ''; return; }
  const now = new Date();
  const thisMonth = hist.months.find(m => m.year === now.getFullYear() && m.month === now.getMonth());
  const bestBy = Object.fromEntries(hist.best.map(b => [b.key, b]));
  const cards = BADGE_DEFS.map(def => {
    const b = bestBy[def.key], earned = b && b.bestTier >= 0, tk = earned ? TIER_KEYS[b.bestTier] : null;
    const title = b ? consistencyTitle(b.goldMonths) : null;
    return `<button type="button" class="bdgc-card${earned ? '' : ' locked'}" data-k="${def.key}" style="${earned ? TIER_VARS[tk] : '--t1:#9aa0a6;--t2:#7b8086;--t3:#555a60'}">
      <span class="m">${medalSVG(def.icon, tk || 'bronze').replace('class="shine"', 'class="shine" style="display:none"')}</span>
      <b>${esc(t('bdg_' + def.key + '_name'))}</b>
      <small>${earned ? esc(tf('bdg_cabinet_best', { tier: t('bdg_tier_n_' + tk) })) : esc(t('bdg_cabinet_locked'))}</small>
      ${earned && b.months > 1 ? `<small>${esc(tf('bdg_cabinet_months', { n: num(b.months) }))}</small>` : ''}
      ${title ? `<small class="ttl">🔥 ${esc(t('bdg_title_' + title))}</small>` : ''}</button>`;
  }).join('');
  container.innerHTML = `<style>
    .bdgc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:10px}
    .bdgc-card{display:grid;justify-items:center;gap:2px;padding:10px 6px;border-radius:14px;border:1.5px solid var(--dh-border-strong);background:var(--dh-surface-3);color:var(--dh-ink);cursor:pointer;font:inherit}
    .bdgc-card .m svg{width:64px;filter:drop-shadow(0 4px 6px rgba(0,0,0,.35))} .bdgc-card.locked .m{opacity:.35;filter:grayscale(1)}
    .bdgc-card small{color:var(--dh-ink-soft);font-size:.74rem;text-align:center} .bdgc-card .ttl{color:var(--dh-warn,#b45309);font-weight:800}
    .bdgc-info{margin-top:10px;padding:12px;border-radius:14px;border:1.5px dashed var(--dh-border-strong);background:var(--dh-surface-2);display:none;line-height:1.8}
    .bdgc-act{margin:8px 0;border:0;border-radius:12px;padding:9px 16px;font-weight:800;cursor:pointer;background:var(--dh-gold-500,#e8b923);color:#2b2100}
  </style>
  <p style="margin:0 0 8px;color:var(--dh-ink-soft)">${esc(t('bdg_cabinet_sub'))}</p>
  ${thisMonth ? `<button type="button" class="bdgc-act" id="bdgc-ceremony">🎬 ${esc(t('bdg_cabinet_ceremony'))}</button>` : `<p>${esc(t('bdg_cabinet_empty'))}</p>`}
  <div class="bdgc-grid">${cards}</div><div class="bdgc-info" id="bdgc-info"></div><p style="color:var(--dh-ink-soft);font-size:.8rem">${esc(t('bdg_cabinet_tap'))}</p>`;
  container.querySelector('#bdgc-ceremony')?.addEventListener('click', () => showCeremony(thisMonth.earned, student));
  container.querySelector('.bdgc-grid').onclick = (e) => {
    const c = e.target.closest('.bdgc-card'); if (!c) return;
    const def = BADGE_DEFS.find(d => d.key === c.dataset.k), info = container.querySelector('#bdgc-info');
    const cur = thisMonth && thisMonth.earned.find(r => r.key === def.key);
    info.style.display = 'block';
    info.innerHTML = `<b>${esc(t('bdg_' + def.key + '_name'))}</b> — ${esc(t('bdg_' + def.key + '_desc'))}<br>
      ${esc(t('bdg_cabinet_thresholds'))}: ${esc(tf('bdg_rep_tiers_line', { a: num(def.th[0]), b: num(def.th[1]), c: num(def.th[2]), d: num(def.th[3]) }))}
      ${cur ? `<br><button type="button" class="bdgc-act" id="bdgc-replay">${esc(t('bdg_cabinet_replay'))}</button>` : ''}`;
    info.querySelector('#bdgc-replay')?.addEventListener('click', () => playBadge(cur, student));
  };
}
