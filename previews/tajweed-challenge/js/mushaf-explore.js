// js/mushaf-explore.js — «استكشف الصفحة»: صفحة مصحف مصغرة حقيقية (آيات من البنك + صور الفانوس واللوحة) عليها دبابيس ذهبية مرقمة.
// يضغط الطفل على الدبوس (أو على بند الفهرس) فتظهر بطاقة العلامة: شكلها واسمها وتعريفها. النص القرآني يبقى سليما، والدبابيس طبقة فوقه (انظر decorate في quran.js).
import { POOL, SURAHS } from '../data/pool.js';
import { SIGNS, MUSHAF, quarterMarker, JUZ_ORDINALS_AR } from '../data/mushaf.js';
import { signExamples, signCandidates } from './mushaf-engine.js';
import { wordClusters } from './quran.js';
import { esc, lanternHTML, bannerHTML, ayahLabel } from './ui.js';
import { t, tx, num } from './i18n.js';

const T = (ar, en) => ({ ar, en });
const wordHTMLPlain = (w) => esc(w);

// بطاقات الدبابيس غير الموجودة في جدول العلامات (أجزاء الصفحة)
const PART = {
  juz_name: { glyph: 'الجزء', name: T('اسم الجزء', 'The juz name'), def: T('في أعلى الصفحة اسم الجزء على اليمين واسم السورة على اليسار.', 'At the top of the page: the juz name on the right and the surah name on the left.') },
  surah_name: { glyph: 'السورة', name: T('اسم السورة', 'The surah name'), def: T('في أعلى الصفحة اسم الجزء على اليمين واسم السورة على اليسار.', 'At the top of the page: the juz name on the right and the surah name on the left.') },
  banner: { glyph: '❖', name: T('لوحة اسم السورة', 'The surah title panel'), def: T('قبل أول آية في كل سورة لوحة مزخرفة فيها اسمها.', 'Before the first ayah of every surah there is an ornamental panel with its name.') },
  basmala: { glyph: '﷽', name: T('البسملة', 'The basmala'), def: T('بعد لوحة اسم السورة تأتي البسملة (إلا في سورة التوبة)، ثم أول آية.', 'After the title panel comes the basmala (except in Surah At-Tawbah), then the first ayah.') },
  lantern: { glyph: '🏮', name: T('فانوس الهامش', 'The margin lantern'), def: T('الفانوس على الهامش يبي\u0651ن أين يبدأ جزء أو حزب أو نصف أو ربع. وبداية الحزب والجزء بقب\u0651تين، والربع والنصف وثلاثة الأرباع بقب\u0651ة واحدة.', 'The lantern in the margin shows where a juz, hizb, half or quarter begins. The start of a hizb or a juz has two domes; a quarter, a half and three quarters have one dome.') }
};
const infoOf = (id) => (SIGNS[id] ? { glyph: SIGNS[id].glyph, name: SIGNS[id].name, def: SIGNS[id].def, abbr: SIGNS[id].abbr } : PART[id]);

function rosette(k, pin) {
  const n = Number(k.split(':')[1]);
  return `<span class="rosette quran-text static"${pin ? ` data-pin="${pin}"` : ''}>${num(n)}</span>`;
}
// آية داخل الصفحة. pins: [{n, id, word?, mark?}] — word: فهرس كلمة (يركب الدبوس على مقطع العلامة)، mark: 'i:k' علامة مستقلة، lead: علامة الربع
function verseHTML(key, { pins = [], rose = null, lead = null } = {}) {
  const v = POOL[key]; const parts = [];
  const pinAt = (pred) => pins.find(pred);
  if (v.rb) { const p = pinAt((x) => x.lead); parts.push(`<span class="waqf quran-text rub"${p ? ` data-pin="${p.n}"` : ''}>${esc('\u06DE')}</span>`); }
  v.w.forEach((w, i) => {
    const p = pinAt((x) => x.word === i);
    let attr = ''; if (p) { const code = SIGNS[p.id].code; const ci = wordClusters(w).findIndex((c) => c.raw.includes(code)); attr = ` data-pin="${p.n}" data-pinc="${ci}"`; }
    parts.push(`<span class="w quran-text"${attr}>${wordHTMLPlain(w)}</span>`);
    if (v.wq[i]) v.wq[i].split(' ').forEach((tok, k) => { const p2 = pinAt((x) => x.mark === `${i}:${k}`); parts.push(`<span class="waqf quran-text"${p2 ? ` data-pin="${p2.n}"` : ''}>${esc(tok)}</span>`); });
  });
  const r = rose ? ` ${rosette(key, rose.pin)}` : '';
  return `<p class="mp-verse" dir="rtl" lang="ar">${parts.join(' ')}${r}</p>`;
}

// بيانات الصفحة لكل درس
export function exploreModel(lessonId) {
  const m = MUSHAF[lessonId]; const pins = []; let n = 0; const add = (id, extra = {}) => { const p = { n: ++n, id, ...extra }; pins.push(p); return p; };
  let html = '';
  const head = (key, pj = null, ps = null) => { const v = POOL[key]; const sn = Number(key.split(':')[0]); return `<div class="mp-head quran-text" dir="rtl"><span${pj ? ` data-pin="${pj.n}"` : ''}>الجزء ${JUZ_ORDINALS_AR[v.j - 1]}</span><span${ps ? ` data-pin="${ps.n}"` : ''}>س\u064Fور\u064Eة\u064F ${esc(SURAHS[sn].ar)}</span></div>`; };
  if (m.lesson === 'ayah_number') {
    const pj = add('juz_name'), ps = add('surah_name'), pb = add('banner'), pm = add('basmala'), pr = add('ayah_end');
    const k1 = '78:1', k2 = '78:2';
    html = head(k1, pj, ps)
      + `<div class="mp-banner" data-pin="${pb.n}">${bannerHTML(78)}</div>`
      + `<p class="mp-verse basmala" dir="rtl" lang="ar" data-pinwrap="1"><span class="w quran-text" data-pin="${pm.n}">${POOL['1:1'].w.map(wordHTMLPlain).join(' ')}</span></p>`
      + verseHTML(k1, { rose: { pin: pr.n } }) + verseHTML(k2, { rose: { pin: null } }) + verseHTML('78:3', { rose: { pin: null } });
    return { m, pins, html, margin: '' };
  }
  if (m.lesson === 'juz_hizb') {
    const k = Object.keys(POOL).find((x) => POOL[x].rb) || '100:9'; const [s, a] = k.split(':').map(Number); const prev = `${s}:${a - 1}`;
    const pl = add('lantern'), pr = add('rub_mark', { lead: true });
    html = head(k)
      + (POOL[prev] ? verseHTML(prev, { rose: { pin: null } }) : '') + verseHTML(k, { pins: [pins[1]], rose: { pin: null } });
    const lant = `<div class="mp-lantern" data-pin="${pl.n}">${lanternHTML(POOL[k].q)}</div>`;
    return { m, pins, html, margin: lant };
  }
  // دروس العلامات: مثال لكل علامة (آيات مختلفة قدر الإمكان)، مع الدبابيس على موضع العلامة نفسه
  const used = new Set(); const verses = [];
  const waqfExtra = lessonId === 'mushaf_waqf' ? ['2:2'] : [];
  for (const sid of m.signs) {
    const exs = signExamples(sid, 3, { maxWords: 12 }); const e = exs.find((x) => !used.has(x.key)) || exs[0]; if (!e) continue;
    used.add(e.key);
    let vv = verses.find((x) => x.key === e.key); if (!vv) { vv = { key: e.key, pins: [] }; verses.push(vv); }
    if (e.words.length) vv.pins.push(add(sid, { word: e.words[0] })); else if (e.marks.length && e.marks[0] !== 'lead') vv.pins.push(add(sid, { mark: e.marks[0] }));
  }
  for (const k of waqfExtra) if (!used.has(k) && POOL[k]) { used.add(k); const vv = { key: k, pins: [] }; for (const sid of m.signs) { const c = signCandidates(sid).find((x) => x.key === k); if (c && c.marks.length) vv.pins.push(add(sid, { mark: c.marks[0] })); } verses.push(vv); }
  // علامات وقف أخرى تظهر في الآيات المختارة ترقم أيضا (لتعرف عند الضغط)
  for (const vv of verses) {
    const v = POOL[vv.key];
    Object.entries(v.wq).forEach(([i, str]) => str.split(' ').forEach((tok, k) => {
      const sid = m.signs.find((x) => SIGNS[x].where === 'wq' && SIGNS[x].code === tok); const id = `${i}:${k}`;
      if (sid && !vv.pins.some((p) => p.mark === id)) vv.pins.push(add(sid, { mark: id }));
    }));
  }
  html = verses.map((vv) => verseHTML(vv.key, { pins: vv.pins })).join('');
  const k0 = verses[0] ? verses[0].key : null;
  return { m, pins, html: (k0 ? head(k0) : '') + html, margin: '' };
}

export function exploreHTML(lessonId) {
  const { pins, html, margin } = exploreModel(lessonId);
  const legend = pins.map((p) => { const inf = infoOf(p.id); return `<li><button type="button" class="pin-leg" data-pinsel="${p.n}"><b class="pn">${num(p.n)}</b><span class="pg quran-text" dir="rtl">${esc(inf.glyph.length > 6 ? '' : inf.glyph)}</span><span>${esc(tx(inf.name))}</span></button></li>`; }).join('');
  return `<div class="explore" data-lesson="${lessonId}" data-pins='${JSON.stringify(pins.map((p) => ({ n: p.n, id: p.id })))}'>
    <div class="mpage decor" data-explore="1">${margin}<div class="mp-body">${html}</div></div>
    <p class="explore-hint" role="note">${t('mk_explore_hint')}</p>
    <ol class="pin-legend">${legend}</ol>
    <div class="pin-info" aria-live="polite"></div>
  </div>`;
}

export function bindExplore(scope, lang) {
  const root = scope.querySelector('.explore'); if (!root) return;
  const pins = JSON.parse(root.dataset.pins);
  const info = root.querySelector('.pin-info');
  const pick = (n) => {
    const p = pins.find((x) => x.n === Number(n)); if (!p) return; const inf = infoOf(p.id);
    root.querySelectorAll('.pin').forEach((b) => b.classList.toggle('sel', b.dataset.n === String(n)));
    root.querySelectorAll('.pin-leg').forEach((b) => b.classList.toggle('sel', b.dataset.pinsel === String(n)));
    info.innerHTML = `<div class="info-card"><div class="info-glyph quran-text" dir="rtl">${inf.glyph.length > 6 ? '❖' : esc(inf.glyph)}</div><div><b>${esc(tx(inf.name))}${inf.abbr ? ` <span class="tag">${esc(inf.abbr)}</span>` : ''}</b><p>${esc(tx(inf.def))}</p></div></div>`;
    info.classList.remove('flash'); void info.offsetWidth; info.classList.add('flash');
  };
  root.addEventListener('click', (e) => { const b = e.target.closest('.pin, .pin-leg'); if (b) pick(b.dataset.n || b.dataset.pinsel); });
  void lang;
}
