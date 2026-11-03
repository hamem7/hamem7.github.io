// js/story.js — «الدرس المصوَّر»: خطوة «تعلّم» لكل درس في الركن صارت حكاية للأطفال بشرائح قصيرة.
// الغلاف (العنوان والأهداف) ← شرائح الدرس (data/stories.js) ← «ماذا تعلّمنا؟» مع رسالة جاهزة لوليّ الأمر وزر «ابدأ التدريب».
// وضعان: «عرض الحصة» شريحة شريحة (للشاشة الكبيرة، تعمل أسهم لوحة المفاتيح) و«تصفّح الدرس» كاملًا. في كل شريحة فكرة للمعلم.
// الآيات تُعرض من بنك الركن كما هي (ayahHTML) وتلوين الحرف طبقة فوق النص (quran.js) مع صوت المنشاوي (audio.js).
import { STORIES, BOOK_CAPS } from '../data/stories.js';
import { RULES, LETTER_NAMES, SOURCES, stageOf } from '../data/rules.js';
import { SIGNS, signImg, A, quarterMarker, MARKER_NAMES } from '../data/mushaf.js';
import { POOL, SURAHS } from '../data/pool.js';
import { lessonExamples, whyOf } from './engine.js';
import { signExamples } from './mushaf-engine.js';
import { locate, wordClusters } from './quran.js';
import { vizFor, VIZ_CAPTION } from './viz.js';
import { art } from './art.js';
import { t, tx, num, getLang } from './i18n.js';
import { esc, ayahHTML, audioBtn, lanternHTML, mediaHTML, ayahLabel, ruleName, badge } from './ui.js';
import { exploreHTML, bindExplore } from './mushaf-explore.js';
import { AREAS, AREA_IDS, SIFAT, MAKHARIJ17, SIFA_PAIRS, SIFA_SINGLE } from '../data/know.js';
import { stopCandidates, STOP_LABEL, silahCandidates, waslCandidates, waqfExamples } from './know-engine.js';
import { bindAudio, showToast } from './play.js';
import { stopAudio } from './audio.js';
import * as store from './store.js';

export const hasStory = (id) => !!STORIES[id];

const MODE_KEY = 'tjc.story.mode';
const getMode = () => { try { return localStorage.getItem(MODE_KEY) === 'scroll' ? 'scroll' : 'slides'; } catch { return 'slides'; } };
const setMode = (m) => { try { localStorage.setItem(MODE_KEY, m); } catch { /* لا تخزين */ } };
const T2 = (ar, en) => ({ ar, en });
const nl = (s) => esc(s).replace(/\n/g, '<br>');
const COIN_HUES = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];

let S = null;   // حالة الدرس المفتوح
let H = null;   // أدوات الصفحة من app.js: { shell, crumb, stageStyle, root(), onDone, onExit }

// ───────── الكتل ─────────
const coin = (ch, i = 0, attrs = '') => `<span class="st-coin ${COIN_HUES[i % COIN_HUES.length]}" ${attrs}><span class="quran-text" lang="ar">${esc(ch)}</span></span>`;
const credit = (kind) => (kind ? `<small class="st-credit">${t(`st_cr_${kind}`)}</small>` : '');
const fig = (inner, cap, cr, cls = '') => `<figure class="st-fig ${cls}">${inner}${cap || cr ? `<figcaption>${cap ? esc(tx(cap)) : ''}${credit(cr)}</figcaption>` : ''}</figure>`;
const bookFig = (id) => fig(`<img src="${A(`book/${id}.webp`)}" alt="${esc(tx(BOOK_CAPS[id]))}" loading="lazy">`, BOOK_CAPS[id], 'book', 'book');
const deckFig = (d) => fig(`<img src="${A(`deck/${d.f}.webp`)}" alt="${esc(tx(d.cap))}" loading="lazy">`, d.cap, 'deck', 'deck');

function checkHTML(c, key) {
  const st = S.checks[key] || { picked: [], last: null };
  const okIdx = c.opts.map((o, i) => (o.ok ? i : -1)).filter((i) => i >= 0);
  const done = c.multi ? okIdx.every((i) => st.picked.includes(i)) : okIdx.some((i) => st.picked.includes(i));
  const fb = done ? `<p class="st-fb ok">⭐ ${esc(c.multi ? t('st_found_all') : tx(c.opts[st.last].fb || { ar: '', en: '' }))}</p>`
    : st.last === null ? `<p class="st-fb">${c.multi ? t('st_pick_all') : ''}</p>` : `<p class="st-fb ${c.opts[st.last].ok ? 'ok' : 'no'}">${esc(tx(c.opts[st.last].fb))}</p>`;
  const opt = (o, i) => {
    const cls = st.picked.includes(i) ? (o.ok ? 'ok' : 'no') : '';
    const inner = o.g ? `<span class="quran-text" lang="ar">${esc(o.g)}</span>` : o.sign ? `<img src="${esc(signImg(o.sign))}" alt="">` : esc(tx(o.t));
    return `<button type="button" class="st-opt ${o.g ? 'glyph' : ''} ${cls}" data-check="${key}" data-opt="${i}" ${done ? 'disabled' : ''}>${inner}</button>`;
  };
  return `<div class="st-check"><b class="st-q">❓ ${esc(tx(c.q))}</b><div class="st-opts ${c.opts.every((o) => o.g) ? 'glyphs' : ''}" ${c.opts.every((o) => o.g) ? 'dir="rtl"' : ''}>${c.opts.map(opt).join('')}</div>${fb}</div>`;
}

function ayahCard(key, hl, { marks = null, coinCh = null, coinI = 0, why = null } = {}) {
  return `<article class="st-ayah">${coinCh ? coin(coinCh, coinI) : ''}<div class="st-ayah-body"><div class="ayah-wrap">${ayahHTML(key, { hl, marks })}</div>
    <div class="ayah-meta"><span>${esc(ayahLabel(key))} · ${t('st_reciter')}</span>${audioBtn(key)}</div>${why ? `<p class="st-why">✔ ${esc(why)}</p>` : ''}</div></article>`;
}

function signAyahsHTML(b, key) {
  const ids = b.signAyahs; const cur = Math.min(S.tabs[key] || 0, ids.length - 1); const sid = ids[cur];
  const tabs = ids.length > 1 ? `<div class="tabs sign-tabs" role="tablist">${ids.map((x, i) => `<button type="button" role="tab" aria-selected="${i === cur}" class="${i === cur ? 'on' : ''}" data-tab="${key}" data-i="${i}"><img class="tab-img" src="${esc(signImg(x))}" alt=""> ${esc(tx(SIGNS[x].name))}</button>`).join('')}</div>` : '';
  const exs = signExamples(sid, b.n || 1);
  const body = exs.length ? exs.map((e) => ayahCard(e.key, e.hl, { marks: new Set(e.marks) })).join('') : `<p class="muted">${t('mk_no_example')}</p>`;
  return `<div class="st-signayahs">${tabs}<div class="st-signinfo"><img src="${esc(signImg(sid))}" alt=""><div><b>${esc(tx(SIGNS[sid].name))}</b><p>${esc(tx(SIGNS[sid].def))}</p></div></div>${body}</div>`;
}

function lettersHTML(b, key) {
  const r = RULES[b.letters]; const L = r.letters; const mk = b.makhraj; const sel = S.tabs[key] ?? 0;
  const coins = L.list.map((ch, i) => (mk ? `<button type="button" class="st-coin-btn" data-tab="${key}" data-i="${i}" aria-pressed="${i === sel}" aria-label="${esc(tx(LETTER_NAMES[ch]))}">${coin(ch, i)}</button>` : `<span class="st-coin-wrap">${coin(ch, i)}<small>${esc(tx(LETTER_NAMES[ch]) || '')}</small></span>`)).join('');
  const mn = L.mnemonic ? `<div class="st-mn"><small>${t('mnemonic_label')}</small><p class="quran-text" lang="ar" dir="rtl">${esc(L.mnemonic.ar)}</p></div>` : '';
  let detail = '';
  if (mk) { const ch = L.list[sel]; detail = `<div class="st-mkh"><div class="st-mkh-tx"><span class="st-big quran-text" lang="ar">${esc(ch)}</span><b>${esc(tx(LETTER_NAMES[ch]))}</b><p class="muted">${t('st_tap_letter')}</p></div>${bookFig(mk[ch])}</div>`; }
  return `<div class="st-letters"><div class="st-coins" dir="rtl">${coins}</div>${mn}${detail}</div>`;
}

function vsHTML(id) {
  const r = RULES[id];
  return `<div class="st-vs-list">${r.vs.map((v) => { const o = RULES[v.with]; return `<div class="st-vs"><div class="st-vs-grid"><figure><b>${esc(tx(r.name))}</b>${vizFor(r.viz)}</figure><figure><b>${esc(tx(o.name))}</b>${vizFor(o.viz)}</figure></div><p>💡 ${esc(tx(v.tip))}</p></div>`; }).join('')}</div>`;
}

function poemHTML(id) {
  const r = RULES[id]; const src = SOURCES[r.poem.src]; const review = r.poem.review || src.status !== 'verified';
  return `<div class="st-poem"><div class="quran-text poem" dir="rtl" lang="ar">${r.poem.ar.map((l) => `<p class="poem-line">${esc(l)}</p>`).join('')}</div><small>${esc(tx(r.poem.ref))} ${review ? badge(r.poem.review || tx(src.note)) : ''}</small></div>`;
}

function customHTML(name) {
  if (name === 'ayah_compare') {
    const k = '78:1'; const words = POOL[k].w.map((w) => `<span class="w quran-text">${esc(w)}</span>`).join(' '); const ros = `<span class="rosette quran-text static">${num(1)}</span>`;
    return `<div class="cmp"><div class="cmp-card bad"><b>❌ ${t('st_num_wrong')}</b><div class="ayah rosettes cmp-verse" dir="rtl" lang="ar">${ros} ${words}</div></div><div class="cmp-card good"><b>✅ ${t('st_num_right')}</b><div class="ayah rosettes cmp-verse" dir="rtl" lang="ar">${words} ${ros}</div></div></div>`;
  }
  return '';
}

function block(b, key) {
  if (b.row) return `<div class="st-row n${b.row.length}">${b.row.map((x, i) => `<div class="st-col">${block(x, `${key}.${i}`)}</div>`).join('')}</div>`;
  if (b.kid) return `<div class="st-kid"><span class="st-owl" aria-hidden="true">🦉</span><div><b>${t('st_kid')}</b><p>${nl(tx(b.kid))}</p></div></div>`;
  if (b.p) return `<p class="st-p">${nl(tx(b.p))}</p>`;
  if (b.def) return `<div class="st-def"><small>📘 ${t('st_def')}</small><p>${nl(tx(b.def))}</p></div>`;
  if (b.warn) return `<div class="st-warn"><small>⚠️ ${t('watch_label')}</small><p>${nl(tx(b.warn))}</p></div>`;
  if (b.art) return fig(art(b.art), b.cap, null, 'art');
  if (b.viz) return fig(vizFor(b.viz), VIZ_CAPTION[b.viz], null, 'viz');
  if (b.img) return fig(`<img src="${A(b.img)}" alt="${esc(tx(b.cap || { ar: '', en: '' }))}" loading="lazy">`, b.cap, b.credit, `photo${b.small ? ' small' : ''}`);
  if (b.media) return fig(`<div class="st-media">${mediaHTML(b.media)}</div>`, b.cap, 'mushaf', 'photo');
  if (b.signs) return `<div class="st-signs">${b.signs.map((s) => { const g = SIGNS[s.id]; return `<div class="st-sign"><div class="st-sign-img"><img src="${esc(signImg(s.id))}" alt="${esc(tx(g.name))}"></div>${g.abbr ? `<span class="tag">${esc(g.abbr)}</span>` : ''}<b>${esc(tx(g.name))}</b><p>${esc(tx(s.kid || g.def))}</p></div>`; }).join('')}</div>`;
  if (b.dodont) return `<div class="st-dd"><div class="st-dd-no"><b>❌ ${t('st_dont')}</b>${b.dodont.no.map((x) => `<p>${esc(tx(x))}</p>`).join('')}</div><div class="st-dd-yes"><b>✅ ${t('st_do')}</b>${b.dodont.yes.map((x) => `<p>${esc(tx(x))}</p>`).join('')}</div></div>`;
  if (b.check) return checkHTML(b.check, key);
  if (b.ayahs) return `<div class="st-ayahs">${lessonExamples(b.ayahs).map((e, i) => ayahCard(e.key, locate(e.occ, POOL[e.key].w), { coinCh: e.occ[3] || null, coinI: i, why: tx(whyOf(b.ayahs, e.occ[3])) })).join('')}</div>`;
  if (b.signAyahs) return signAyahsHTML(b, key);
  if (b.ayah) return `${ayahCard(b.ayah, b.hl || null)}${b.note ? `<p class="st-note">👆 ${esc(tx(b.note))}</p>` : ''}`;
  if (b.explore) return `<div class="st-explore" ${H.stageStyle(stageOf(b.explore))}>${exploreHTML(b.explore)}</div>`;
  if (b.lanterns) return `<div class="lantern-gallery">${b.lanterns.map((q) => `<figure>${lanternHTML(q)}<figcaption><b>${esc(tx(MARKER_NAMES[quarterMarker(q).kind]))}</b></figcaption></figure>`).join('')}</div>`;
  if (b.letters) return lettersHTML(b, key);
  if (b.book) return `<div class="st-gallery">${b.book.map(bookFig).join('')}</div>`;
  if (b.deck) return `${b.adv ? `<span class="st-adv">⭐ ${t('st_adv')}</span>` : ''}<div class="st-gallery ${b.deck.length === 1 ? 'one' : ''}">${b.deck.map(deckFig).join('')}</div>`;
  if (b.levels) return `<div class="st-levels">${b.levels.map((l) => `<div class="st-level">${deckFig({ f: l.f, cap: l.t })}<p>${esc(tx(l.d))}</p></div>`).join('')}</div>`;
  if (b.steps) return `<ol class="st-steps">${RULES[b.steps].how.map((h, i) => `<li><span class="n">${num(i + 1)}</span><p>${esc(tx(h))}</p></li>`).join('')}</ol>`;
  if (b.vs) return vsHTML(b.vs);
  if (b.poem) return poemHTML(b.poem);
  if (b.custom) return customHTML(b.custom);
  if (b.stepsT) return `<ol class="st-steps">${b.stepsT.map((h, i) => `<li><span class="n">${num(i + 1)}</span><p>${esc(tx(h))}</p></li>`).join('')}</ol>`;
  if (b.areas) return `<div class="st-areas">${AREA_IDS.map((a, i) => { const A2 = AREAS[a]; return `<div class="st-area"><div class="st-area-h"><b>${esc(tx(A2.name))}</b><small>${esc(tx(A2.kid))}</small></div><div class="st-coins small" dir="rtl">${A2.letters.map((ch, k) => coin(ch, i + k)).join('') || '<span class="st-hum">〰️ 〰️</span>'}</div>${bookFig(A2.book)}</div>`; }).join('')}</div>`;
  if (b.sifat) return `<div class="st-sifat">${Object.values(SIFAT).map((g, i) => `<div class="st-sifa"><b>${esc(tx(g.name))}</b><p class="quran-text st-mn-line" lang="ar" dir="rtl">${esc(g.mn)}</p><div class="st-coins small" dir="rtl">${g.letters.map((ch, k) => coin(ch, i * 2 + k)).join('')}</div><p class="muted">${esc(tx(g.kid))}</p></div>`).join('')}</div>`;
  // أمثلة من بنك الآيات للدروس الجديدة (الكلمة المعنية مظلّلة، والوسم يشرح الحكم)
  const tagged = (tag, key, hl) => `<div class="st-stop"><span class="st-stop-tag">${esc(tag)}</span>${ayahCard(key, hl)}</div>`;
  if (b.silahEx) { const c = silahCandidates(); const short = (arr) => arr.slice().sort((a, b2) => POOL[a.key].w.length - POOL[b2.key].w.length)[0]; return `<div class="st-ayahs">${[['sughra', T2('صلة صغرى: حركتان', 'Lesser silah: 2 counts')], ['kubra', T2('صلة كبرى قبل همزة: ٤ أو ٥', 'Greater silah before a hamza: 4–5')], ['stop', T2('في آخر الآية: نقف بهاء ساكنة', 'At the ayah end: stop with a silent haa')]].map(([k, lab]) => { const x = short(c[k]); return x ? tagged(tx(lab), x.key, { [x.i]: { [x.c]: 'cause' } }) : ''; }).join('')}</div>`; }
  if (b.waslEx) { const c = waslCandidates(); const first = (arr) => arr.find((x) => POOL[x.key].w.length <= 7) || arr[0]; return `<div class="st-ayahs">${[['fatha', T2('«ال»: نبدأ بالفتح', '“al”: start with fatha')], ['kasra', T2('ثالثه مفتوح أو مكسور: نبدأ بالكسر', 'Third letter fatha or kasra: start with kasra')], ['damma', T2('ثالثه مضموم: نبدأ بالضمّ', 'Third letter damma: start with damma')]].map(([k, lab]) => { const x = first(c[k]); return x ? tagged(tx(lab), x.key, { [x.i]: { 0: 'cause' } }) : ''; }).join('')}</div>`; }
  if (b.waqfEx) return `<div class="st-ayahs">${waqfExamples().map((e) => tagged(`🛑 ${tx(e.label)}`, e.key, e.hl)).join('')}</div>`;
  if (b.makharij17) return `<ol class="st-m17">${MAKHARIJ17.map((m, i) => `<li class="st-sifa"><b>${num(m.n)} · ${esc(tx(m.name))}</b><div class="st-coins small" dir="rtl">${m.letters.map((ch, k) => coin(ch === 'ه' ? 'هـ' : ch, i + k)).join('') || '<span class="st-hum">〰️ 〰️</span>'}</div><p class="muted">${esc(tx(m.kid))}</p></li>`).join('')}</ol>`;
  if (b.sifaPairs) return `<div class="st-sifat">${SIFA_PAIRS.map((p, i) => `<div class="st-sifa">${p.parts.map((x) => `<b>${esc(tx(x.name))}</b>${x.mn ? `<p class="quran-text st-mn-line" lang="ar" dir="rtl">${esc(x.mn)}</p>` : `<p class="muted">${esc(t('st_rest_letters'))}</p>`}<p class="muted">${esc(tx(x.kid))}</p>`).join('<hr class="st-vs">')}</div>`).join('')}</div>`;
  if (b.sifaSingle) return `<div class="st-sifat">${SIFA_SINGLE.map((g, i) => `<div class="st-sifa"><b>${esc(tx(g.name))}</b><div class="st-coins small" dir="rtl">${g.letters.map((ch, k) => coin(ch, i + k)).join('')}</div><p class="muted">${esc(tx(g.kid))}</p></div>`).join('')}</div>`;
  if (b.stops) { const c = stopCandidates(); return `<div class="st-ayahs">${['sukun', 'alif', 'ha', 'asis'].map((k) => { const key = c[k].find((x) => POOL[x].w.length <= 6) || c[k][0]; const w = POOL[key].w.length - 1; return `<div class="st-stop"><span class="st-stop-tag">🛑 ${esc(tx(STOP_LABEL[k]))}</span>${ayahCard(key, { [w]: { [wordClusters(POOL[key].w[w]).length - 1]: 'cause' } })}</div>`; }).join('')}</div>`; }
  return '';
}

// ───────── الغلاف والختام ─────────
function coverSlide(L) {
  const hasAyahs = L.rule || L.slides.some((s) => s.b.some((b) => b.ayahs || b.signAyahs || b.ayah));
  const nChecks = L.slides.reduce((a, s) => a + JSON.stringify(s.b).split('"check"').length - 1, 0);
  const chips = [`⏱ ${t('st_mins', { n: num(L.mins || 8) })}`, `🎯 ${t('st_goals_n', { n: num(L.goals.length) })}`, hasAyahs ? `🎧 ${t('st_audio_chip')}` : '', nChecks ? `❓ ${t('st_checks_n', { n: num(nChecks) })}` : '', `🎮 ${t('st_game_chip')}`].filter(Boolean);
  return { icon: '✨', k: { ar: 'درس مصوّر', en: 'Picture lesson' }, cover: true, html: `<div class="st-cover"><div class="st-cover-tx"><h1>${esc(tx(L.title))}</h1><p class="lead">${esc(tx(L.hook))}</p>
    <div class="st-chips">${chips.map((c) => `<span>${esc(c)}</span>`).join('')}</div>
    <div class="st-goals"><b>${t('st_goals_t')}</b><ol>${L.goals.map((g, i) => `<li><i>${num(i + 1)}</i><span>${esc(tx(g))}</span></li>`).join('')}</ol></div></div>
    <div class="st-cover-art">${L.cover.art ? art(L.cover.art) : ''}</div></div>`, tip: { ar: 'اعرض الأهداف الثلاثة على الأطفال في البداية، وارجع إليها في الختام لتسألهم: «هل حققناها؟»', en: 'Show the three goals at the start and come back to them at the end: “Did we reach them?”' } };
}
function parentMessage(L) {
  const first = L.rule ? lessonExamples(L.rule)[0] : null;
  const ask = first ? (() => { const [s, a] = first.key.split(':').map(Number); return t('st_ask_rule', { a: num(a), s: getLang() === 'ar' ? SURAHS[s].ar : SURAHS[s].en }); })() : t('st_ask_mushaf');
  return `${t('st_msg_hi')}\n${t('st_msg_learned', { title: tx(L.title) })}\n${L.recap.map((r) => `• ${tx(r)}`).join('\n')}\n${ask}\n${t('st_msg_end')}`;
}
function endSlide(L) {
  return { icon: '🏁', k: { ar: 'ماذا تعلّمنا؟', en: 'What did we learn?' }, end: true, html: `<h2>${t('st_recap_t')}</h2>
    <ol class="st-recap">${L.recap.map((r, i) => `<li><i>${num(i + 1)}</i><span>${esc(tx(r))}</span></li>`).join('')}</ol>
    <div class="st-parent"><b>💌 ${t('st_parent_t')}</b><div class="st-msg">${esc(parentMessage(L))}</div><button type="button" class="btn ghost" data-st="copy">📋 ${t('st_copy')}</button></div>
    <div class="st-final"><button type="button" class="btn primary big" data-st="train">🎮 ${t('start_training')}</button><button type="button" class="btn ghost" data-st="rule">${t('st_back_rule')}</button></div>`, tip: { ar: 'أرسل الرسالة لأولياء الأمور بعد الحصة ليُراجعوا مع أبنائهم في البيت.', en: 'Send the message to parents after class so they can review at home.' } };
}

// ───────── الرسم ─────────
function slidesOf(L) { return [coverSlide(L), ...L.slides, endSlide(L)]; }
// الرسم الذي ظهر على الغلاف لا يتكرر في الشريحة الأولى
const dropArt = (bs, id) => bs.map((b) => (b.row ? { ...b, row: dropArt(b.row, id) } : b)).filter((b) => !(b.art && b.art === id)).map((b) => (b.row && b.row.length === 1 ? b.row[0] : b));
function slideHTML(sl, si) {
  const cov = STORIES[S.id].cover.art; const bs = sl.b ? (si === 1 && cov ? dropArt(sl.b, cov) : sl.b) : null;
  const body = sl.html || bs.map((b, bi) => block(b, `${si}:${bi}`)).join('');
  return `<section class="st-slide ${sl.cover ? 'is-cover' : ''}" data-si="${si}">
    ${sl.cover || sl.end ? `<span class="st-kick">${sl.icon} ${esc(tx(sl.k))}</span>` : `<span class="st-kick">${sl.icon} ${t('st_step_n', { n: num(si) })} · ${esc(tx(sl.k))}</span><h2>${esc(tx(sl.t))}</h2>`}
    ${body}${sl.tip ? `<details class="st-tip"><summary>💡 ${t('st_tip')}</summary><p>${esc(tx(sl.tip))}</p></details>` : ''}</section>`;
}
function draw({ top = false } = {}) {
  stopAudio();
  const L = STORIES[S.id]; const all = slidesOf(L); const n = all.length; S.i = Math.max(0, Math.min(S.i, n - 1));
  const st = stageOf(S.id);
  const head = `<div class="st-head"><div class="st-mode" role="group" aria-label="${t('st_mode_aria')}"><button type="button" data-st="mode" data-m="slides" aria-pressed="${S.mode === 'slides'}">📽 ${t('st_mode_slides')}</button><button type="button" data-st="mode" data-m="scroll" aria-pressed="${S.mode === 'scroll'}">📜 ${t('st_mode_scroll')}</button></div>
    ${S.mode === 'slides' ? `<div class="st-prog" aria-label="${esc(t('learn_step', { i: num(S.i + 1), n: num(n) }))}">${all.map((_, k) => `<button type="button" data-st="go" data-k="${k}" class="${k < S.i ? 'done' : k === S.i ? 'cur' : ''}" aria-label="${num(k + 1)}"></button>`).join('')}</div>` : ''}</div>`;
  // حفظ الموضع (وضع العرض): يمكن التوقف عند أي شريحة والاستكمال لاحقًا
  if (S.mode === 'slides') store.setPos(S.id, S.i, n);
  const resumeBar = S.resumed && S.mode === 'slides' ? `<div class="st-resume" role="status"><span>▶️ ${t('st_resumed', { i: num(S.resumed + 1), n: num(n) })}</span><button type="button" class="btn ghost sm" data-st="restart">↺ ${t('st_restart')}</button></div>` : '';
  const body = resumeBar + (S.mode === 'slides' ? slideHTML(all[S.i], S.i) : all.map(slideHTML).join(''));
  const nav = S.mode === 'slides' ? `<nav class="st-nav"><button type="button" class="btn ghost" data-st="step" data-d="-1" ${S.i === 0 ? 'disabled' : ''}>${t('prev')}</button><small>${t('learn_step', { i: num(S.i + 1), n: num(n) })}</small>${S.i === n - 1 ? `<button type="button" class="btn primary" data-st="train">🎮 ${t('start_training')}</button>` : `<button type="button" class="btn primary" data-st="step" data-d="1">${S.i === 0 ? t('st_begin') : t('next')}</button>`}</nav>` : '';
  const html = `${H.crumb([{ href: '#/', label: esc(t('app_title')) }, { href: `#/rule/${S.id}`, label: esc(ruleName(S.id)) }, { label: esc(t('step_learn')) }])}
    <section class="story ${S.mode === 'scroll' ? 'is-scroll' : ''}" ${H.stageStyle(st)}>${head}<div class="st-slides">${body}</div>${nav}</section>`;
  const root = H.root();
  if (top) H.shell(html, { cls: 'lesson-page story-page' }); else { const pg = root.querySelector('.page'); if (pg) pg.innerHTML = html; else H.shell(html, { cls: 'lesson-page story-page' }); }
  const story = root.querySelector('.story');
  bindAudio(story);
  story.querySelectorAll('.st-explore').forEach((el) => bindExplore(el));
  story.addEventListener('click', onClick);
}

function onClick(e) {
  const b = e.target.closest('button'); if (!b || !S) return; const d = b.dataset;
  const keep = () => { const y = window.scrollY; draw(); window.scrollTo({ top: y }); };
  if (d.st === 'mode') { S.mode = d.m; setMode(d.m); return draw({ top: true }); }
  if (d.st === 'go') { S.i = Number(d.k); S.resumed = 0; return draw({ top: true }); }
  if (d.st === 'step') { S.i += Number(d.d); S.resumed = 0; return draw({ top: true }); }
  if (d.st === 'restart') { S.i = 0; S.resumed = 0; return draw({ top: true }); }
  if (d.st === 'train') { store.clearPos(S.id); return H.onDone(); }
  if (d.st === 'rule') return H.onExit();
  if (d.st === 'copy') { try { navigator.clipboard.writeText(parentMessage(STORIES[S.id])); } catch { /* لا حافظة */ } return showToast(t('st_copied')); }
  if (d.check !== undefined) { const c = S.checks[d.check] || (S.checks[d.check] = { picked: [], last: null }); const i = Number(d.opt); if (!c.picked.includes(i)) c.picked.push(i); c.last = i; return keep(); }
  if (d.tab !== undefined) { S.tabs[d.tab] = Number(d.i); return keep(); }
}

document.addEventListener('keydown', (e) => {
  if (!S || S.mode !== 'slides' || !H || !H.root().isConnected || !H.root().querySelector('.story')) return;
  if (e.target && e.target.closest && e.target.closest('input,textarea,select')) return;
  const n = slidesOf(STORIES[S.id]).length; const fwd = getLang() === 'ar' ? 'ArrowLeft' : 'ArrowRight'; const back = getLang() === 'ar' ? 'ArrowRight' : 'ArrowLeft';
  if (e.key === fwd && S.i < n - 1) { S.i++; S.resumed = 0; draw({ top: true }); } else if (e.key === back && S.i > 0) { S.i--; S.resumed = 0; draw({ top: true }); }
});

/** يفتح الدرس المصوَّر للدرس id. tools: { shell, crumb, stageStyle, root(), onDone(), onExit() } */
export function renderStory(id, tools) {
  H = tools;
  if (!S || S.id !== id) {
    // نستكمل من موضع التوقّف المحفوظ لهذا الطالب في هذا الدرس (إن وُجد)
    const pos = store.getPos(id);
    S = { id, i: pos ? pos.i : 0, mode: getMode(), checks: {}, tabs: {}, resumed: pos ? pos.i : 0 };
  }
  draw({ top: true });
}
/** يُستدعى عند مغادرة الدرس (تغيّر المسار) */
export function leaveStory() { S = null; }
