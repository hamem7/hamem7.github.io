// components/monthlyReviewScreen.js
// =============================================================================
// 🌟 [مُعمَّم] شاشة "مراجعة الشهر" — لكل طالب وشهر: يضيف المعلم الأجزاء التي راجعها الطالب
// فعلًا (من الجزء 1 إلى 30 — القرآن كله)، وأمام كل جزء موضع "بداية الشهر" وموضع "نهاية الشهر"
// (سورة + آية). يُحفظ الناتج في سجل الشهر نفسه (حقل review.entries — راجع engine/reviewParts.js
// وdatabase/monthlyMemorizationDB.js saveReview) ويظهر في التقرير كقسم "رحلة المراجعة".
//
// تسهيلات على المعلم (بلا تشتيت):
//   • لا يُطلب منه ملء ثلاثين جزءًا: يضيف فقط ما راجعه الطالب (زر "＋ أضف جزءًا").
//   • الشهر الجديد يبدأ بنفس الأجزاء التي راجعها الطالب الشهر الماضي، و"بداية" كل جزء = نهاية
//     مراجعته الشهر الماضي (سلسلة أشهر)؛ والمعلم يعدّل ما يشاء أو يحذف الصف (✕).
//   • مستوى الآية اختياري عمليًا: اختيار السورة وحده يملأ الآية الافتراضية (أول آية للبداية،
//     وآخر آية في الجزء لتلك السورة للنهاية)، ويكتب المعلم رقم الآية فقط عند الحاجة (السور الطويلة).
//   • كل صف يعرض فورًا العدد المحسوب ("راجع 128 آية — 27% من الجزء") ليتأكد المعلم.
// ⚠️ راجع افتراضات العدّ في engine/reviewParts.js (بلا التفاف ولا دورات، والاتجاه غير مؤثر).
// =============================================================================

import { AppState, t } from '../core/app.js';
import { JUZ_COUNT, juzLabel, juzBounds, juzSurahs, coveredAyahs, normalizeReview } from '../engine/reviewParts.js';

const STYLE_ID = 'mrv-styles';

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const st = document.createElement('style');
  st.id = STYLE_ID;
  st.textContent = `
.mrv-overlay{position:fixed;top:0;right:0;bottom:0;left:0;background:#0d1b16;z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;font-family:'Tajawal',sans-serif;}
.mrv-card{background:#fffdf6;border-radius:26px;max-width:760px;width:100%;box-shadow:0 30px 70px rgba(0,0,0,.45);border:3px solid var(--dh-gold-500,#d4af37);max-height:94vh;overflow-y:auto;direction:rtl;}
.mrv-card[dir="ltr"]{direction:ltr;}
.mrv-head{background:linear-gradient(135deg,var(--dh-emerald-700,#0d5c46),#0a4736);color:#fff;padding:18px 26px;border-radius:22px 22px 0 0;}
.mrv-title{margin:0 0 4px;font-size:1.35rem;font-weight:800;}
.mrv-sub{opacity:.9;font-size:.95rem;}
.mrv-body{padding:18px 22px 6px;}
.mrv-hint{color:#6b6252;font-size:.9rem;margin-bottom:12px;line-height:1.7;}
.mrv-row{background:#fff;border:2px solid #efe7d2;border-radius:14px;padding:12px;margin-bottom:12px;}
.mrv-top{display:flex;gap:10px;align-items:center;margin-bottom:10px;}
.mrv-top select{flex:1;font-weight:800;color:var(--dh-emerald-700,#0d5c46);}
.mrv-del{background:#fef2f2;border:none;color:#991b1b;width:38px;height:38px;border-radius:10px;cursor:pointer;font-size:1rem;flex:none;}
.mrv-pos{display:grid;grid-template-columns:54px 1fr 92px;gap:8px;align-items:center;margin-bottom:8px;}
.mrv-lbl{font-weight:800;color:#3a2c1f;font-size:.92rem;}
.mrv-row select,.mrv-row input{width:100%;box-sizing:border-box;padding:10px;border-radius:10px;border:2px solid #e2d9c4;font-family:inherit;font-size:1rem;background:#fff;}
.mrv-row select:focus,.mrv-row input:focus{outline:none;border-color:var(--dh-gold-500,#d4af37);}
.mrv-count{font-size:.9rem;color:#065f46;font-weight:700;min-height:1.2em;}
.mrv-count.warn{color:#991b1b;}
.mrv-add{width:100%;padding:12px;border-radius:12px;border:2px dashed var(--dh-gold-500,#d4af37);background:#fffbeb;color:#92400e;font-family:inherit;font-weight:800;font-size:1rem;cursor:pointer;margin-bottom:8px;}
.mrv-actions{display:flex;gap:10px;padding:8px 22px 20px;}
.mrv-btn{flex:1;padding:13px;border-radius:12px;border:none;font-family:inherit;font-weight:800;font-size:1.05rem;cursor:pointer;background:var(--dh-emerald-700,#0d5c46);color:#fff;}
.mrv-btn.ghost{background:#f1f5f9;color:#334155;}
`;
  document.head.appendChild(st);
}

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function surahName(n) {
  const s = (AppState.surahsData || []).find(x => x.number === n);
  return s ? s.name : String(n);
}

/**
 * يفتح شاشة مراجعة شهر لطالب. يرجع Promise تُحل بـ true لو حُفظت المراجعة، وإلا false.
 */
export async function openMonthReviewForStudent(student, year, month) {
  const mgr = AppState.monthlyMemorizationManager;
  const sd = AppState.surahsData;
  if (!mgr || !student || !Array.isArray(sd) || !sd.length) return false;
  ensureStyles();

  const all = await mgr.getAllForStudent(student.id);
  const current = all.find(r => r.year === year && r.month === month) || null;
  const currentEntries = current ? normalizeReview(current.review, sd) : [];
  const earlier = all
    .filter(r => r.review && (r.year < year || (r.year === year && r.month < month)))
    .sort((a, b) => (b.year - a.year) || (b.month - a.month));

  // آخر موضع نهاية سُجِّل لهذا الجزء في شهر سابق (يصير بداية هذا الشهر المقترحة)
  const prevEndOf = (juz) => {
    for (const r of earlier) {
      const e = normalizeReview(r.review, sd).find(x => x.juz === juz);
      if (e) return e.to;
    }
    return null;
  };

  // الصفوف الابتدائية: هذا الشهر لو سُجِّل، وإلا أجزاء الشهر السابق (النهاية فارغة)، وإلا صف واحد فارغ
  let initial;
  if (currentEntries.length) {
    initial = currentEntries.map(e => ({ juz: e.juz, from: e.from, to: e.to }));
  } else if (earlier.length) {
    const prevJuz = [...new Set(normalizeReview(earlier[0].review, sd).map(e => e.juz))];
    initial = prevJuz.map(j => ({ juz: j, from: prevEndOf(j), to: null }));
  }
  if (!initial || !initial.length) initial = [{ juz: JUZ_COUNT, from: null, to: null }];

  const monthLabel = (() => {
    try { return new Intl.DateTimeFormat((AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US') + '-u-nu-latn', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1)); }
    catch (e) { return `${month}/${year}`; }
  })();

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'mrv-overlay';
    overlay.innerHTML = `
      <div class="mrv-card" dir="${AppState.currentLang === 'ar' ? 'rtl' : 'ltr'}">
        <div class="mrv-head">
          <h2 class="mrv-title">🔁 ${esc(t('mrv_title'))}</h2>
          <div class="mrv-sub">${esc(student.name || '')} — ${esc(monthLabel)}</div>
        </div>
        <div class="mrv-body">
          <div class="mrv-hint">${esc(t('mrv_hint'))}</div>
          <div id="mrv-rows"></div>
          <button class="mrv-add" id="mrv-add">＋ ${esc(t('mrv_add'))}</button>
        </div>
        <div class="mrv-actions">
          <button class="mrv-btn ghost" id="mrv-cancel">${esc(t('mrv_cancel'))}</button>
          <button class="mrv-btn" id="mrv-save">${esc(t('mrv_save'))}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const rowsHost = overlay.querySelector('#mrv-rows');

    const surahOptions = (juz, selected, withEmpty) => {
      const list = juzSurahs(sd, juz);
      return (withEmpty ? `<option value="">${esc(t('mrv_not_reached'))}</option>` : '') +
        list.map(s => `<option value="${s.number}" ${s.number === selected ? 'selected' : ''}>${esc(surahName(s.number))}</option>`).join('');
    };
    const surahLimits = (juz, surah) => juzSurahs(sd, juz).find(s => s.number === Number(surah)) || null;

    function readRow(row) {
      const juz = parseInt(row.querySelector('.mrv-juz').value, 10);
      const fs = parseInt(row.querySelector('.mrv-fs').value, 10);
      const fa = parseInt(row.querySelector('.mrv-fa').value, 10);
      const tsRaw = row.querySelector('.mrv-ts').value;
      const ta = parseInt(row.querySelector('.mrv-ta').value, 10);
      return { juz, from: { surah: fs, ayah: fa }, to: tsRaw ? { surah: parseInt(tsRaw, 10), ayah: ta } : null };
    }

    function refreshCount(row) {
      const c = row.querySelector('.mrv-count');
      const r = readRow(row);
      if (!r.to) { c.textContent = ''; c.className = 'mrv-count'; return; }
      const cov = coveredAyahs(sd, r.juz, r.from, r.to);
      if (!cov) { c.textContent = '⚠️ ' + t('mrv_out_of_range'); c.className = 'mrv-count warn'; return; }
      c.textContent = t('mrv_count_fmt').replace('{n}', cov.count).replace('{pct}', cov.pct);
      c.className = 'mrv-count';
    }

    // تعبئة رقم الآية الافتراضي عند تغيير السورة: أول آية للبداية، وآخر آية (داخل الجزء) للنهاية
    function syncAyah(row, which, keepValue) {
      const juz = parseInt(row.querySelector('.mrv-juz').value, 10);
      const surahSel = row.querySelector(which === 'from' ? '.mrv-fs' : '.mrv-ts');
      const input = row.querySelector(which === 'from' ? '.mrv-fa' : '.mrv-ta');
      const lim = surahLimits(juz, surahSel.value);
      if (!lim) { input.value = ''; input.disabled = true; input.placeholder = ''; return; }
      input.disabled = false;
      input.min = String(lim.firstAyah); input.max = String(lim.lastAyah);
      input.placeholder = `${lim.firstAyah}–${lim.lastAyah}`;
      if (!keepValue) input.value = String(which === 'from' ? lim.firstAyah : lim.lastAyah);
    }

    function addRow(data) {
      const row = document.createElement('div');
      row.className = 'mrv-row';
      const b = juzBounds(sd, data.juz);
      const from = data.from || (b ? { surah: b.start.surah, ayah: b.start.ayah } : { surah: 1, ayah: 1 });
      row.innerHTML = `
        <div class="mrv-top">
          <select class="mrv-juz">${Array.from({ length: JUZ_COUNT }, (_, i) => i + 1).map(n => `<option value="${n}" ${n === data.juz ? 'selected' : ''}>${esc(juzLabel(n, t))}</option>`).join('')}</select>
          <button class="mrv-del" title="${esc(t('mrv_remove'))}">✕</button>
        </div>
        <div class="mrv-pos"><span class="mrv-lbl">${esc(t('mrv_from'))}</span><select class="mrv-fs">${surahOptions(data.juz, from.surah, false)}</select><input class="mrv-fa" type="number" inputmode="numeric"></div>
        <div class="mrv-pos"><span class="mrv-lbl">${esc(t('mrv_to'))}</span><select class="mrv-ts">${surahOptions(data.juz, data.to ? data.to.surah : null, true)}</select><input class="mrv-ta" type="number" inputmode="numeric"></div>
        <div class="mrv-count"></div>`;
      rowsHost.appendChild(row);

      syncAyah(row, 'from', false); row.querySelector('.mrv-fa').value = String(from.ayah);
      syncAyah(row, 'to', false);
      if (data.to) row.querySelector('.mrv-ta').value = String(data.to.ayah); else { row.querySelector('.mrv-ta').value = ''; row.querySelector('.mrv-ta').disabled = true; }
      refreshCount(row);

      row.querySelector('.mrv-juz').addEventListener('change', () => {
        const j = parseInt(row.querySelector('.mrv-juz').value, 10);
        const bb = juzBounds(sd, j);
        const pe = prevEndOf(j);
        const fr = pe || (bb ? { surah: bb.start.surah, ayah: bb.start.ayah } : { surah: 1, ayah: 1 });
        row.querySelector('.mrv-fs').innerHTML = surahOptions(j, fr.surah, false);
        row.querySelector('.mrv-ts').innerHTML = surahOptions(j, null, true);
        syncAyah(row, 'from', false); row.querySelector('.mrv-fa').value = String(fr.ayah);
        syncAyah(row, 'to', false); row.querySelector('.mrv-ta').value = ''; row.querySelector('.mrv-ta').disabled = true;
        refreshCount(row);
      });
      row.querySelector('.mrv-fs').addEventListener('change', () => { syncAyah(row, 'from', false); refreshCount(row); });
      row.querySelector('.mrv-ts').addEventListener('change', () => {
        if (!row.querySelector('.mrv-ts').value) { row.querySelector('.mrv-ta').value = ''; row.querySelector('.mrv-ta').disabled = true; }
        else syncAyah(row, 'to', false);
        refreshCount(row);
      });
      row.querySelectorAll('input').forEach(i => i.addEventListener('input', () => refreshCount(row)));
      row.querySelector('.mrv-del').addEventListener('click', () => row.remove());
    }

    initial.forEach(addRow);
    overlay.querySelector('#mrv-add').addEventListener('click', () => {
      const used = new Set(Array.from(rowsHost.querySelectorAll('.mrv-juz')).map(s => parseInt(s.value, 10)));
      let j = JUZ_COUNT; while (j > 1 && used.has(j)) j--;
      addRow({ juz: j, from: prevEndOf(j), to: null });
    });

    const close = (val) => { overlay.remove(); resolve(val); };
    overlay.querySelector('#mrv-cancel').addEventListener('click', () => close(false));
    overlay.querySelector('#mrv-save').addEventListener('click', async () => {
      const entries = [];
      for (const row of rowsHost.querySelectorAll('.mrv-row')) {
        const r = readRow(row);
        if (!r.to) continue; // لم يصل/لم يراجع — لا يُحفظ
        if (!coveredAyahs(sd, r.juz, r.from, r.to)) { alert(t('mrv_out_of_range')); return; }
        entries.push({ juz: r.juz, from: r.from, to: r.to });
      }
      try { await mgr.saveReview(student.id, year, month, { entries }); close(true); }
      catch (e) { console.error('[monthlyReviewScreen.js] تعذر حفظ مراجعة الشهر:', e); alert(t('mr_export_error')); }
    });
  });
}
