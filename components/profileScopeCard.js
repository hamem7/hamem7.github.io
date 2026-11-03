// components/profileScopeCard.js
// بطاقة «نطاق الحفظ» في ملف الطالب: المسار المتصل + السور الإضافية خارجه (student.memoExtra) + إحصاء الآيات.
// ألوانها برموز الهوية فتنقلب في المظهر الداكن، والنصوص عبر t()/tf() بالعربية والإنجليزية.
import { AppState, t, tf, surahNameLocal } from '../core/app.js';
import '../core/i18n-memoscope.js';
import { studentExtras, memoStats, extraSurahSlices, describeExtra } from '../engine/memoScope.js';

const STYLE_ID = 'dhx-profile-scope-style';
function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = `
.dhp-card{display:flex;flex-direction:column;gap:10px;padding:14px 16px;margin-bottom:14px;border-radius:var(--dh-r-lg,16px);background:var(--dh-surface);border:1px solid var(--dh-line);box-shadow:var(--dh-sh-soft);text-align:start}
.dhp-card h3{margin:0;font-size:1.05rem;color:var(--dh-ink)}
.dhp-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.dhp-lbl{font-size:.82rem;font-weight:700;color:var(--dh-ink-soft)}
.dhp-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:99px;font-weight:700;font-size:.9rem;border:1.5px solid var(--dh-border-strong);background:var(--dh-surface-3);color:var(--dh-ink)}
.dhp-chip.main{background:var(--dh-emerald-700);color:var(--dh-on-emerald);border-color:var(--dh-emerald-700)}
.dhp-chip.extra{background:var(--dh-gold-500);color:var(--dh-on-gold);border-color:var(--dh-gold-500)}
.dhp-chip small{font-weight:600;opacity:.9}
.dhp-total{font-weight:700;color:var(--dh-ok);background:var(--dh-ok-bg);border-radius:12px;padding:8px 12px;font-size:.92rem}
.dhp-total small{display:block;font-weight:500;opacity:.9}
`;
    document.head.appendChild(st);
}
const fmt = (n) => Number(n).toLocaleString('en-US');

export function renderProfileScope(host, student) {
    if (!host) return;
    const sd = AppState.surahsData || [];
    const s = student || {};
    const ex = studentExtras(sd, s);
    if (!sd.length || ((!s.memoFrom || !s.memoTo) && !ex.length)) { host.innerHTML = ''; host.hidden = true; return; }
    ensureStyle();
    const nm = (n) => surahNameLocal(n);
    const st = memoStats(sd, s);
    const words = { ayah: t('sx_ayah_word'), to: '←' };
    const main = (s.memoFrom && s.memoTo)
        ? `<span class="dhp-chip main">${surahNameLocal(s.memoFrom)} ← ${surahNameLocal(s.memoTo)} <small>${tf('sx_ayahs_n', { n: fmt(st.main) })}</small></span>`
        : '';
    const chips = ex.map(e => {
        const c = extraSurahSlices(sd, [e]).reduce((n, x) => n + x.count, 0);
        return `<span class="dhp-chip extra">${describeExtra(e, sd, nm, words)} <small>${tf('sx_ayahs_n', { n: fmt(c) })}</small></span>`;
    }).join('');
    host.hidden = false;
    host.innerHTML = `<div class="dhp-card"><h3>${t('sx_profile_title')}</h3>
      <div class="dhp-row">${main}</div>
      ${ex.length ? `<div class="dhp-row"><span class="dhp-lbl">${t('sx_profile_extra')}:</span>${chips}</div>` : ''}
      <div class="dhp-total">${tf('sx_stat_total', { n: fmt(st.total), p: (st.total / (st.totalAyahs || 6236) * 100).toFixed(1) })}
        ${ex.length ? `<small>${tf('sx_stat_split', { a: fmt(st.main), b: fmt(st.extra) })}</small>` : ''}</div></div>`;
}
