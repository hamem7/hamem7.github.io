// components/scopeExtrasEditor.js
// =============================================================================
// محرّر «سور إضافية خارج المسار المتصل» — يُركَّب تحت حقلَي المسار المتصل (من سورة / إلى سورة) في:
//   إضافة طالب (الخطوة 3) • تعديل بيانات الطالب • تعديل سريع من ملف الطالب.
// القيمة المخزَّنة: student.memoExtra = [{s1,a1,s2,a2}] (راجع engine/memoScope.js: تُطرح السور داخل المتصل وتُدمج المتجاورة).
// الاستعمال: const ed = mountScopeExtras(hostEl, { fromId, toId }); ed.setValue(student.memoExtra); ed.getValue();
// كل الألوان برموز الهوية (--dh-*) فتنقلب تلقائيًا في المظهر الداكن، والنصوص عبر t()/tf() بالعربية والإنجليزية.
// =============================================================================
import { AppState, t, tf, surahNameLocal } from '../core/app.js';
import '../core/i18n-memoscope.js';
import { normalizeExtras, addToExtras, removeFromExtras, surahState, memoStats, extraSurahSlices, describeExtra } from '../engine/memoScope.js';

const STYLE_ID = 'dhx-scope-extras-style';
function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = `
.dhx-box{display:flex;flex-direction:column;gap:10px;margin-top:12px;padding:12px;border:1.5px dashed var(--dh-border-strong);border-radius:14px;background:var(--dh-surface-0);text-align:start}
.dhx-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-weight:700;color:var(--dh-ink)}
.dhx-opt{font-weight:500;font-size:.85rem;color:var(--dh-ink-soft)}
.dhx-help{margin:0;font-size:.84rem;line-height:1.7;color:var(--dh-ink-soft)}
.dhx-list{display:flex;flex-direction:column;gap:6px}
.dhx-row{display:flex;align-items:center;gap:8px;padding:6px 10px;border:1.5px solid var(--dh-border-strong);border-radius:12px;background:var(--dh-surface-3);color:var(--dh-ink)}
.dhx-row .tx{flex:1;min-width:0;font-weight:700}
.dhx-tag{display:inline-flex;border-radius:99px;padding:2px 10px;font-size:.78rem;font-weight:700;background:var(--dh-warn-bg);color:var(--dh-warn);white-space:nowrap}
.dhx-x{border:0;border-radius:10px;width:34px;height:34px;min-width:0;padding:0;margin:0;cursor:pointer;background:var(--dh-danger-bg);color:var(--dh-danger);box-shadow:none}
.dhx-empty{margin:0;font-size:.85rem;color:var(--dh-ink-soft)}
.dhx-btns{display:flex;gap:8px;flex-wrap:wrap}
.dhx-btn{border:1.5px solid var(--dh-border-strong);border-radius:12px;padding:8px 14px;min-height:42px;min-width:0;margin:0;cursor:pointer;font-weight:700;font-size:.92rem;font-family:inherit;box-shadow:none;background:var(--dh-surface-3);color:var(--dh-ink)}
.dhx-btn.is-on{background:var(--dh-emerald-700);color:var(--dh-on-emerald);border-color:var(--dh-emerald-700)}
.dhx-btn.pri{background:var(--dh-emerald-700);color:var(--dh-on-emerald);border-color:var(--dh-emerald-700)}
.dhx-panel{display:flex;flex-direction:column;gap:8px;padding-top:8px;border-top:1.5px dashed var(--dh-border-strong)}
.dhx-panel[hidden]{display:none}
.dhx-line{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.dhx-line label{font-size:.85rem;font-weight:700;color:var(--dh-ink-soft)}
.dhx-box select,.dhx-box input[type=search],.dhx-box input[type=number]{min-height:42px;border-radius:10px;border:1.5px solid var(--dh-border-strong);background:var(--dh-surface-3);color:var(--dh-ink);padding:4px 8px;font-family:inherit;font-size:.95rem;margin:0;width:auto;min-width:0;max-width:100%}
.dhx-box input[type=search]{flex:1}
.dhx-box input[type=number]{width:84px;text-align:center}
.dhx-chips{display:flex;flex-wrap:wrap;gap:6px;max-height:230px;overflow:auto;padding:2px}
.dhx-chip{border:1.5px solid var(--dh-border-strong);background:var(--dh-surface-3);color:var(--dh-ink);border-radius:99px;padding:5px 12px;min-height:34px;min-width:0;margin:0;cursor:pointer;font-size:.85rem;font-weight:600;font-family:inherit;box-shadow:none}
.dhx-chip.extra{background:var(--dh-gold-500);color:var(--dh-on-gold);border-color:var(--dh-gold-500)}
.dhx-chip.part{border-color:var(--dh-gold-500);border-width:2px}
.dhx-chip.main{opacity:.55;cursor:not-allowed;border-style:dashed}
.dhx-note{margin:0;font-size:.8rem;color:var(--dh-ink-soft);line-height:1.6}
.dhx-stat{display:flex;flex-direction:column;gap:2px;padding:8px 12px;border-radius:12px;background:var(--dh-ok-bg);color:var(--dh-ok);font-weight:700;font-size:.92rem}
.dhx-stat small{font-weight:500;opacity:.9}
.dhx-msg{font-size:.82rem;font-weight:700;color:var(--dh-warn)}
`;
    document.head.appendChild(st);
}

const nameOf = (n) => surahNameLocal(n);
const fmt = (n) => Number(n).toLocaleString('en-US');

export function mountScopeExtras(host, opts) {
    ensureStyle();
    const o = opts || {};
    const sd = () => AppState.surahsData || [];
    let extras = [];
    let panel = null;          // null | 'one' | 'many'
    let search = '';
    let msg = '';

    const student = () => {
        const f = o.fromId && document.getElementById(o.fromId), to = o.toId && document.getElementById(o.toId);
        return { memoFrom: f ? f.value : '', memoTo: to ? to.value : '' };
    };
    const norm = () => { extras = normalizeExtras(sd(), extras, student()); return extras; };
    const words = () => ({ ayah: t('sx_ayah_word'), to: '←' });
    const optSurahs = (selected, skipMain) => {
        const stu = student();
        return sd().filter(s => s.number !== 1 && !(skipMain && surahState(sd(), stu, extras, s.number) === 'main'))
            .map(s => `<option value="${s.number}"${s.number === selected ? ' selected' : ''}>${s.number}. ${nameOf(s.number)}</option>`).join('');
    };

    function paint() {
        const stu = student(); norm();
        const s = sd();
        const ms = memoStats(s, Object.assign({}, stu, { memoExtra: extras }));
        const rows = extras.length ? extras.map((e, i) => {
            const cnt = extraSurahSlices(s, [e]).reduce((n, x) => n + x.count, 0);
            return `<div class="dhx-row"><span class="tx">${describeExtra(e, s, nameOf, words())}</span><span class="dhx-tag">${tf('sx_ayahs_n', { n: fmt(cnt) })}</span>
                <button type="button" class="dhx-x" data-rm="${i}" aria-label="${t('sx_remove')}" title="${t('sx_remove')}">✕</button></div>`;
        }).join('') : `<p class="dhx-empty">${t('sx_none')}</p>`;

        let pHtml = '';
        if (panel === 'one') {
            const first = (sd().find(x => x.number !== 1 && surahState(s, stu, extras, x.number) !== 'main' && surahState(s, stu, extras, x.number) !== 'extra') || {}).number;
            pHtml = `<div class="dhx-line"><label for="dhx-one">${t('sx_one_surah')}</label><select data-one-surah>${optSurahs(first, true)}</select></div>
              <label class="dhx-line" style="font-weight:600"><input type="checkbox" data-one-part> ${t('sx_part_only')}</label>
              <div class="dhx-line" data-one-ayahs hidden><label>${t('sx_from_ayah')}</label><input type="number" min="1" value="1" data-one-a1><label>${t('sx_to_ayah')}</label><input type="number" min="1" data-one-a2></div>
              <div class="dhx-line"><button type="button" class="dhx-btn pri" data-add-one>${t('sx_add')}</button><button type="button" class="dhx-btn" data-close>${t('sx_done')}</button></div>`;
        } else if (panel === 'many') {
            const q = search.trim().toLowerCase();
            const chips = s.filter(x => x.number !== 1).filter(x => !q || nameOf(x.number).toLowerCase().includes(q) || String(x.number) === q).map(x => {
                const st = surahState(s, stu, extras, x.number);
                return `<button type="button" class="dhx-chip ${st}" data-chip="${x.number}"${st === 'main' ? ' disabled' : ''}>${st === 'main' ? '🔒 ' : ''}${nameOf(x.number)}</button>`;
            }).join('');
            pHtml = `<div class="dhx-line"><input type="search" data-search placeholder="${t('sx_search')}" value="${search.replace(/"/g, '&quot;')}"><button type="button" class="dhx-btn" data-close>${t('sx_done')}</button></div>
              <div class="dhx-chips">${chips}</div><p class="dhx-note">${t('sx_pick_note')}</p>
              <div class="dhx-line"><label>${t('sx_range_title')}</label></div>
              <div class="dhx-line"><label>${t('sx_from_surah')}</label><select data-rg-from>${optSurahs(2, false)}</select><label>${t('sx_to_surah')}</label><select data-rg-to>${optSurahs(2, false)}</select>
              <button type="button" class="dhx-btn pri" data-add-range>${t('sx_add_range')}</button></div>`;
        }
        host.innerHTML = `<div class="dhx-box">
          <div class="dhx-head">${t('sx_title')} <span class="dhx-opt">${t('sx_opt')}</span></div>
          <p class="dhx-help">${t('sx_help')}</p>
          <div class="dhx-list">${rows}</div>
          <div class="dhx-btns"><button type="button" class="dhx-btn${panel === 'one' ? ' is-on' : ''}" data-open="one">${t('sx_btn_one')}</button><button type="button" class="dhx-btn${panel === 'many' ? ' is-on' : ''}" data-open="many">${t('sx_btn_many')}</button></div>
          ${msg ? `<span class="dhx-msg" role="status">${msg}</span>` : ''}
          ${pHtml ? `<div class="dhx-panel">${pHtml}</div>` : ''}
          <div class="dhx-stat"><span>${tf('sx_stat_total', { n: fmt(ms.total), p: (ms.total / (ms.totalAyahs || 6236) * 100).toFixed(1) })}</span>
            <small>${tf('sx_stat_split', { a: fmt(ms.main), b: fmt(ms.extra) })}</small></div></div>`;
        msg = '';
        const part = host.querySelector('[data-one-part]');
        if (part) syncOne();
    }

    function syncOne() {
        const sel = host.querySelector('[data-one-surah]'); if (!sel) return;
        const n = +sel.value, cnt = (sd().find(x => x.number === n) || {}).ayahsCount || 1;
        const part = host.querySelector('[data-one-part]').checked;
        host.querySelector('[data-one-ayahs]').hidden = !part;
        const a1 = host.querySelector('[data-one-a1]'), a2 = host.querySelector('[data-one-a2]');
        a1.max = a2.max = cnt;
        if (!a2.value || +a2.value > cnt) a2.value = cnt;
        if (+a1.value > cnt) a1.value = 1;
    }

    function add(seg) {
        const before = JSON.stringify(extras);
        extras = addToExtras(sd(), extras, seg, student());
        if (JSON.stringify(extras) === before) msg = t('sx_nothing_new');
    }
    const cntOf = (n) => (sd().find(x => x.number === n) || {}).ayahsCount;

    host.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b || !host.contains(b)) return;
        if (b.dataset.rm !== undefined) { const seg = extras[+b.dataset.rm]; if (seg) extras = removeFromExtras(sd(), extras, seg, student()); return paint(); }
        if (b.dataset.open) { panel = panel === b.dataset.open ? null : b.dataset.open; search = ''; return paint(); }
        if (b.dataset.close !== undefined) { panel = null; return paint(); }
        if (b.dataset.chip) {
            const n = +b.dataset.chip, st = surahState(sd(), student(), extras, n), seg = { s1: n, a1: 1, s2: n, a2: cntOf(n) };
            extras = st === 'extra' ? removeFromExtras(sd(), extras, seg, student()) : addToExtras(sd(), extras, seg, student());
            const keep = host.querySelector('.dhx-chips'), top = keep ? keep.scrollTop : 0;
            paint(); const k2 = host.querySelector('.dhx-chips'); if (k2) k2.scrollTop = top; return;
        }
        if (b.dataset.addOne !== undefined) {
            const n = +host.querySelector('[data-one-surah]').value;
            if (!n) return;
            const partial = host.querySelector('[data-one-part]').checked, c = cntOf(n);
            const a1 = partial ? Math.max(1, Math.min(c, +host.querySelector('[data-one-a1]').value || 1)) : 1;
            const a2 = partial ? Math.max(1, Math.min(c, +host.querySelector('[data-one-a2]').value || c)) : c;
            add({ s1: n, a1: Math.min(a1, a2), s2: n, a2: Math.max(a1, a2) });
            return paint();
        }
        if (b.dataset.addRange !== undefined) {
            const f = +host.querySelector('[data-rg-from]').value, to = +host.querySelector('[data-rg-to]').value;
            const lo = Math.min(f, to), hi = Math.max(f, to);
            add({ s1: lo, a1: 1, s2: hi, a2: cntOf(hi) });
            return paint();
        }
    });
    host.addEventListener('change', (e) => {
        if (e.target.matches('[data-one-surah],[data-one-part]')) { if (e.target.matches('[data-one-surah]')) { const a2 = host.querySelector('[data-one-a2]'); if (a2) a2.value = ''; const a1 = host.querySelector('[data-one-a1]'); if (a1) a1.value = 1; } syncOne(); }
    });
    host.addEventListener('input', (e) => {
        if (e.target.matches('[data-search]')) { search = e.target.value; const pos = e.target.selectionStart; paint(); const s = host.querySelector('[data-search]'); if (s) { s.focus(); s.setSelectionRange(pos, pos); } }
    });
    // تغيّر المسار المتصل → إعادة التنظيم (ما صار داخله يُطرح تلقائيًا) وتحديث الإحصاء
    [o.fromId, o.toId].forEach(id => { const el = id && document.getElementById(id); if (el) el.addEventListener('change', paint); });
    const onLang = () => { if (!host.isConnected) { document.removeEventListener('app-lang-changed', onLang); return; } paint(); };
    document.addEventListener('app-lang-changed', onLang);

    paint();
    return {
        getValue() { return norm().map(e => ({ s1: e.s1, a1: e.a1, s2: e.s2, a2: e.a2 })); },
        setValue(v) { extras = Array.isArray(v) ? v.slice() : []; panel = null; search = ''; paint(); },
        refresh: paint
    };
}
