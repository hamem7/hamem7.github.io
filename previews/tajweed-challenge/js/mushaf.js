// js/mushaf.js — شاشات قسم «تعرف على مصحفك»: صفحة الدرس والدرس بخمس خطوات (بنفس هوية بقية التجربة).
import { POOL } from '../data/pool.js';
import { MUSHAF, SIGNS, quarterMarker, MARKER_KINDS, MARKER_NAMES, signImg, partImg } from '../data/mushaf.js';
import { STAGES, stageOf } from '../data/rules.js';
import { signExamples } from './mushaf-engine.js';
import { t, tx, num } from './i18n.js';
import * as store from './store.js';
import { esc, badge, reviewNote, isReview, ayahHTML, lanternHTML, bannerHTML, ayahLabel, starsHTML, ruleName, legendHTML } from './ui.js';
import { audioBtn } from './ui.js';
import { bindAudio } from './play.js';
import { exploreHTML, bindExplore } from './mushaf-explore.js';

const glyphChip = (id) => { const g = SIGNS[id]; return `<span class="lchip sign-chip" title="${esc(tx(g.name))}"><img class="chip-img" src="${esc(signImg(id))}" alt=""><small>${esc(tx(g.name))}</small></span>`; };

// وسائط الصفحة: صور حقيقية من المصحف المطبوع بحسب الدرس
function lessonVisual(m) {
  if (m.lesson === 'ayah_number') return `<div class="vis-row"><img class="media-img sm" src="assets/mushaf/ayah-number.webp" alt=""><img class="media-img banner-photo" src="${partImg('banner')}" alt=""></div>`;
  if (m.lesson === 'juz_hizb') return `<div class="vis-row">${lanternHTML(2)}${lanternHTML(5)}${lanternHTML(9)}</div>`;
  if (m.lesson === 'sajda') return `<div class="vis-row"><img class="media-img sm" src="assets/mushaf/sajda-mark.webp" alt=""><img class="media-img" src="${partImg('overline')}" alt=""></div>`;
  return `<div class="vis-row glyphs">${m.signs.slice(0, 4).map(glyphChip).join('')}</div>`;
}

export function initMushaf(H) {
  const { shell, crumb, stageStyle, renderHub, bindNav } = H;

  function renderMushafRule(id) {
    const m = MUSHAF[id]; const st = stageOf(id); const r = store.getRule(id);
    const lvls = [1, 2, 3].map((lv) => {
      const open = store.isUnlocked(id, lv, isReview());
      return `<li class="step ${open ? '' : 'locked'}"><span class="step-n">${num(lv + 1)}</span><div class="step-body"><b>${t(`lvl_${lv}`)}</b><small>${t(`lvl_${lv}_d`)}</small>${open ? '' : `<small class="lock">🔒 ${lv === 1 ? t('locked_learn') : t('locked_prev')}</small>`}</div>${starsHTML(r.lv[lv] || 0)}${open ? `<a class="btn ${r.lv[lv] ? 'ghost' : 'primary'}" href="#/play/${id}/${lv}">${r.lv[lv] ? t('play_again') : t('start')}</a>` : '<span class="btn disabled" aria-disabled="true">🔒</span>'}</li>`;
    }).join('');
    const exs = m.signs.slice(0, 3).map((sid) => signExamples(sid, 1)[0]).filter(Boolean);
    shell(`
      ${crumb([{ href: '#/', label: esc(t('app_title')) }, { label: esc(tx(st.name)) }])}
      <article class="rule-hero mushaf-hero" ${stageStyle(st)}>
        <div class="rh-text"><small class="kicker">${esc(tx(st.name))}</small><h1>${esc(tx(m.name))}</h1><p class="tagline">${esc(tx(m.tagline))}</p><p class="kid">${esc(tx(m.def))}</p></div>
        <figure class="rh-viz mushaf-vis">${lessonVisual(m)}</figure>
      </article>
      <section class="panel"><h2>${t('rule_steps')}</h2><ol class="steps journey" ${stageStyle(st)}>
        <li class="step"><span class="step-n">1</span><div class="step-body"><b>${t('step_learn')}</b><small>${t('step_learn_d')}</small></div>${r.learned ? '<span class="done-tick" aria-label="done">✔</span>' : ''}<a class="btn ${r.learned ? 'ghost' : 'primary'}" href="#/learn/${id}">${r.learned ? t('review_lesson') : t('start')}</a></li>${lvls}
      </ol></section>
      <section class="panel" ${stageStyle(st)}><h2>${t('mk_explore')}</h2><div class="ornament" aria-hidden="true"><i></i><b>❖</b><i></i></div>${exploreHTML(id)}${m.review ? `<p class="meta">${badge(m.review)}</p>${reviewNote(m.review)}` : ''}      </section>`, { cls: 'rule-page mushaf-page' });
    bindExplore(document.getElementById('app'));
  }

  function renderMushafLearn(id, step = 0, sIdx = 0, eIdx = 0) {
    const m = MUSHAF[id]; const st = stageOf(id); const N = 5; let body = ''; const key = ['intro', 'explore', 'cards', 'examples', 'watch'][step];
    if (key === 'intro') {
      body = `<h2>${t('mk_l1')}</h2><h3 class="rule-name">${esc(tx(m.name))}</h3>
        <figure class="viz-fig mushaf-vis">${lessonVisual(m)}</figure>
        <div class="card kid-card"><small>${t('mk_notice')}</small><p>${esc(tx(m.notice))}</p></div>
        <div class="card def-card"><small>${t('def_label')}</small><p>${esc(tx(m.def))}</p></div>`;
    } else if (key === 'explore') {
      body = `<h2>${t('mk_explore')}</h2><div class="ornament" aria-hidden="true"><i></i><b>❖</b><i></i></div>${exploreHTML(id)}`;
    } else if (key === 'cards') {
      let inner;
      if (m.lesson === 'ayah_number') {
        inner = `<div class="sign-grid">
          <div class="sign-card"><div class="sc-glyph"><img class="sc-img" src="assets/mushaf/ayah-number.webp" alt=""></div><b>${esc(tx(SIGNS.ayah_end.name))}</b><p>${esc(tx(SIGNS.ayah_end.def))}</p></div>
          <div class="sign-card"><div class="sc-glyph"><img class="sc-img wide" src="${partImg('banner')}" alt=""></div><b>${esc(tx(m.ex[0]))}</b><p>${esc(tx(m.ex[1]))}</p></div>
          <div class="sign-card"><div class="sc-glyph"><img class="sc-img wide" src="${partImg('basmala')}" alt=""></div><b>${esc(tx(m.ex[2]))}</b></div></div>`;
      } else if (m.lesson === 'juz_hizb') {
        inner = `<h3 class="sub">${t('mk_lantern_title')}</h3><div class="lantern-gallery">${[2, 3, 4, 5, 9].map((q) => { const mk = quarterMarker(q); return `<figure>${lanternHTML(q)}<figcaption><b>${esc(tx(MARKER_NAMES[mk.kind]))}</b></figcaption></figure>`; }).join('')}</div>
          <div class="card"><p>${esc(tx(m.ex[0]))}</p></div><div class="card kid-card"><p>${esc(tx(m.ex[1]))}</p></div>
          <div class="sign-grid"><div class="sign-card"><div class="sc-glyph"><img class="sc-img" src="${signImg('rub_mark')}" alt=""></div><b>${esc(tx(SIGNS.rub_mark.name))}</b><p>${esc(tx(SIGNS.rub_mark.def))}</p></div></div>`;
      } else {
        inner = `<div class="sign-grid">${m.signs.map((sid) => { const s = SIGNS[sid]; return `<div class="sign-card"><div class="sc-glyph"><img class="sc-img" src="${esc(signImg(sid))}" alt="${esc(tx(s.name))}"></div>${s.abbr ? `<span class="tag">${esc(s.abbr)}</span>` : ''}<b>${esc(tx(s.name))}</b><p>${esc(tx(s.def))}</p></div>`; }).join('')}</div>${m.lesson === 'waqf' ? `<div class="card"><p>${esc(tx(m.ex[1]))}</p></div>` : ''}`;
      }
      body = `<h2>${t('mk_l2')}</h2>${inner}`;
    } else if (key === 'examples') {
      let pane;
      if (m.lesson === 'ayah_number') {
        const keys = ['78:1', '78:2', '78:3'];
        pane = `<p class="muted">${t('mk_sample_ayahs')}</p><div class="ayah-wrap"><div class="ayah rosettes" dir="rtl" lang="ar">${keys.map((k) => { const n = Number(k.split(':')[1]); return `<span class="vseg">${POOL[k].w.map((w) => `<span class="w quran-text">${esc(w)}</span>`).join(' ')} <span class="rosette quran-text static">${num(n)}</span></span>`; }).join(' ')}</div></div>`;
      } else {
        const sid = m.signs[Math.min(sIdx, m.signs.length - 1)]; const exs = signExamples(sid, 3);
        const e = exs[Math.min(eIdx, exs.length - 1)];
        const tabs = m.signs.length > 1 ? `<div class="tabs sign-tabs" role="tablist" aria-label="${t('mk_pick')}">${m.signs.map((x, i) => `<button type="button" role="tab" aria-selected="${i === sIdx}" class="${i === sIdx ? 'on' : ''}" data-sign="${i}"><img class="tab-img" src="${esc(signImg(x))}" alt=""> ${esc(tx(SIGNS[x].name))}</button>`).join('')}</div>` : '';
        pane = `${tabs}<div class="card sign-info"><img class="info-img" src="${esc(signImg(sid))}" alt=""><div><b>${esc(tx(SIGNS[sid].name))}</b><p>${esc(tx(SIGNS[sid].def))}</p></div></div>${e ? `<div class="ex-head"><span>${t('ex_of', { i: num(Math.min(eIdx, exs.length - 1) + 1), n: num(exs.length) })}</span></div><div class="ayah-wrap lesson-ayah">${ayahHTML(e.key, { hl: e.hl, marks: new Set(e.marks) })}<div class="ayah-meta"><span>${esc(ayahLabel(e.key))}</span>${audioBtn(e.key)}</div></div><div class="legend" aria-hidden="true"><span><i class="dot cause"></i>${esc(tx(SIGNS[sid].name))}</span></div><div class="row between"><button class="btn ghost" data-ex="-1" ${eIdx === 0 ? 'disabled' : ''}>${t('ex_prev')}</button><button class="btn ghost" data-ex="1" ${eIdx >= exs.length - 1 ? 'disabled' : ''}>${t('ex_next')}</button></div>` : `<p class="muted">${t('mk_no_example')}</p>`}`;
      }
      body = `<h2>${t('mk_l3')}</h2>${pane}`;
    } else {
      body = `<h2>${t('mk_l4')}</h2><div class="card warn-card"><small>⚠\uFE0F ${t('watch_label')}</small><p>${esc(tx(m.watch))}</p></div>${m.lesson === 'juz_hizb' ? `<div class="card"><p>${MARKER_KINDS.map((k) => esc(tx(MARKER_NAMES[k]))).join(' · ')}</p></div>` : ''}${m.review ? `<p>${badge(m.review)}</p>${reviewNote(m.review)}` : ''}
        <div class="card src-card"><small>${t('source_label')}</small><p>${esc(t('mk_source'))}</p><p class="muted">assets/mushaf/SOURCE.md · docs/review/tajweed-mushaf-stage-preview.html</p></div>`;
    }
    const last = step === N - 1;
    shell(`
      ${crumb([{ href: '#/', label: esc(t('app_title')) }, { href: `#/rule/${id}`, label: esc(ruleName(id)) }, { label: esc(t('step_learn')) }])}
      <section class="lesson mushaf-lesson" ${stageStyle(st)}>
        <div class="lesson-top"><span class="muted">${t('learn_step', { i: num(step + 1), n: num(N) })}</span><div class="q-progress">${Array.from({ length: N }, (_, k) => `<i class="${k < step ? 'done' : k === step ? 'cur' : ''}"></i>`).join('')}</div></div>
        <div class="lesson-body">${body}</div>
        <div class="lesson-nav"><button class="btn ghost" id="l-prev" ${step === 0 ? 'disabled' : ''}>${t('prev')}</button>${last ? `<button class="btn primary" id="l-done">${t('start_training')}</button>` : `<button class="btn primary" id="l-next">${t('next')}</button>`}</div>
      </section>`, { cls: 'lesson-page mushaf-page' });
    bindAudio(document.getElementById('app'));
    const app = document.getElementById('app');
    app.querySelector('#l-prev')?.addEventListener('click', () => renderMushafLearn(id, step - 1));
    app.querySelector('#l-next')?.addEventListener('click', () => renderMushafLearn(id, step + 1));
    app.querySelector('#l-done')?.addEventListener('click', () => { store.setLearned(id); H.go(`#/play/${id}/1`); });
    bindExplore(app);
    app.querySelectorAll('[data-sign]').forEach((b) => b.addEventListener('click', () => renderMushafLearn(id, 3, Number(b.dataset.sign), 0)));
    app.querySelectorAll('[data-ex]').forEach((b) => b.addEventListener('click', () => renderMushafLearn(id, 3, sIdx, Math.max(0, eIdx + Number(b.dataset.ex)))));
  }
  void renderHub; void bindNav; void STAGES; void legendHTML;
  return { renderMushafRule, renderMushafLearn };
}
