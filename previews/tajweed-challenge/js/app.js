// js/app.js — الموجه والشاشات: الرئيسية، الحكم، الدرس، اللعب، النتيجة، المصادر.
import { POOL } from '../data/pool.js';
import { STAGES, RULES, SOURCES, stageOf } from '../data/rules.js';
import { lessonExamples, buildLevel, buildStageChallenge, buildMixed, stars as calcStars, whyOf, LEVELS } from './engine.js';
import { locate, initDecor } from './quran.js';
import { vizFor, VIZ_CAPTION, STAGE_ICONS } from './viz.js';
import { t, tx, num, getLang, setLang, applyDir } from './i18n.js';
import * as store from './store.js';
import { esc, badge, reviewNote, isReview, setReview, ayahHTML, spanHTML, legendHTML, chip, ruleName, starsHTML, audioBtn, ayahLabel } from './ui.js';
import { runQuiz, bindAudio } from './play.js';
import { stopAudio } from './audio.js';

const root = document.getElementById('app');
const ALL_RULES = STAGES.flatMap((s) => s.rules);

// ───────── المظهر (فاتح/داكن) ─────────
function applyTheme() {
  let pref = 'auto'; try { pref = localStorage.getItem('tjc.theme') || 'auto'; } catch { /* لا تخزين */ }
  const dark = pref === 'dark' || (pref === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const b = document.getElementById('btn-theme'); if (b) { b.textContent = dark ? '☀\uFE0F' : '🌙'; b.setAttribute('aria-pressed', String(dark)); }
}
function toggleTheme() {
  const cur = document.documentElement.dataset.theme;
  try { localStorage.setItem('tjc.theme', cur === 'dark' ? 'light' : 'dark'); } catch { /* لا تخزين */ }
  applyTheme();
}

// ───────── مساعدات ─────────
const go = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };
const stageIndex = (id) => STAGES.findIndex((s) => s.id === id);
const ruleProgress = (id) => { const r = store.getRule(id); return (r.lv[1] || 0) + (r.lv[2] || 0) + (r.lv[3] || 0); };

function nextStep() {
  for (const id of ALL_RULES) {
    const r = store.getRule(id);
    if (!r.learned) return { hash: `#/learn/${id}`, rule: id, label: t('step_learn') };
    for (const lv of [1, 2, 3]) if (!(r.lv[lv] >= 1)) return { hash: `#/play/${id}/${lv}`, rule: id, label: t(`lvl_${lv}`) };
  }
  return { hash: '#/mixed', rule: null, label: t('home_mixed') };
}

function shell(html, { cls = '' } = {}) {
  root.innerHTML = `<div class="page ${cls}">${html}</div><footer class="foot">${esc(t('app_title'))} · ${esc(t('preview_tag'))}</footer>`;
  window.scrollTo({ top: 0 });
}
const crumb = (items) => `<nav class="crumb" aria-label="breadcrumb">${items.map((it) => it.href ? `<a href="${it.href}">${it.label}</a>` : `<span aria-current="page">${it.label}</span>`).join('<i aria-hidden="true">›</i>')}</nav>`;
const stageStyle = (st) => `style="--hue:var(--h-${st.hue})"`;

// ───────── الرئيسية ─────────
function renderHome() {
  const tot = store.totals(ALL_RULES);
  const pct = Math.round((tot.got / tot.max) * 100);
  const nxt = nextStep();
  const started = tot.got > 0 || ALL_RULES.some((id) => store.getRule(id).learned);
  const R = 52, C = 2 * Math.PI * R;
  const stagesHTML = STAGES.map((st, si) => {
    const got = st.rules.reduce((a, id) => a + ruleProgress(id), 0), max = st.rules.length * 9;
    const mastered = st.rules.filter((id) => store.getRule(id).lv[3] >= 1).length;
    const unlockedChallenge = isReview() || st.rules.some((id) => store.getRule(id).lv[1] >= 1);
    const stStars = store.getStageStars(st.id);
    return `
    <article class="stage" ${stageStyle(st)}>
      <header class="stage-head">
        <span class="stage-ico" aria-hidden="true">${STAGE_ICONS[st.icon]}</span>
        <div class="stage-title"><small>${t('stage_n', { n: num(si + 1) })}</small><h3>${esc(tx(st.name))}</h3><p>${esc(tx(st.blurb))}</p></div>
        <div class="stage-prog" aria-label="${got}/${max}"><b>${num(mastered)}/${num(st.rules.length)}</b><small>${t('home_mastered')}</small><div class="pbar"><i style="width:${Math.round((got / max) * 100)}%"></i></div></div>
      </header>
      <ul class="rule-list">${st.rules.map((id) => {
        const r = store.getRule(id);
        return `<li><a class="rule-row" href="#/rule/${id}"><span class="rr-main"><b>${esc(ruleName(id))}</b><small class="quran-text rr-short">${esc(tx(RULES[id].short))}</small></span><span class="rr-state">${r.learned ? '' : '<em class="new">●</em>'}${starsHTML(Math.max(...[r.lv[1] || 0, r.lv[2] || 0, r.lv[3] || 0]))}</span></a></li>`;
      }).join('')}</ul>
      <footer class="stage-foot">
        <button type="button" class="btn ${unlockedChallenge ? 'accent' : 'disabled'}" data-stage="${st.id}" ${unlockedChallenge ? '' : 'disabled'}>🏁 ${t('stage_challenge')} ${starsHTML(stStars)}</button>
        ${unlockedChallenge ? '' : `<small>${t('stage_challenge_locked')}</small>`}
      </footer>
    </article>`;
  }).join('');
  shell(`
    <section class="hero">
      <div class="hero-text">
        <h1>${t('home_hello')}</h1>
        <p class="lead">${t('home_lead')}</p>
        <div class="hero-cta">
          <a class="btn primary big" href="${nxt.hash}">${started ? t('home_continue') : t('home_start')} <span class="arr" aria-hidden="true"></span></a>
          ${nxt.rule ? `<small class="muted">${esc(ruleName(nxt.rule))} · ${esc(nxt.label)}</small>` : ''}
        </div>
      </div>
      <div class="hero-ring" role="img" aria-label="${t('home_progress')} ${pct}%">
        <svg viewBox="0 0 130 130"><circle class="ring-bg" cx="65" cy="65" r="${R}"/><circle class="ring-fg" cx="65" cy="65" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}"/></svg>
        <div class="ring-txt"><b>${num(tot.got)}</b><small>${t('home_progress')} ★</small><small>${num(tot.mastered)} / ${num(ALL_RULES.length)} ${t('home_mastered')}</small></div>
      </div>
    </section>
    ${isReview() ? `<p class="review-banner">${t('review_mode_on')}</p>` : ''}
    <h2 class="sec-title">${t('path_title')}</h2>
    <div class="stages">${stagesHTML}</div>
    <section class="mixed">
      <div><h3>🎯 ${t('home_mixed')}</h3><p>${t('home_mixed_desc')}</p></div>
      <a class="btn accent" href="#/mixed">${t('start')} ${starsHTML(store.getMixed())}</a>
    </section>
    <p class="muted center small">${t('data_version', { n: num(Object.keys(POOL).length) })}</p>`);
  root.querySelectorAll('[data-stage]').forEach((b) => b.addEventListener('click', () => go(`#/stage/${b.dataset.stage}`)));
}

// ───────── صفحة الحكم ─────────
function renderRule(id) {
  const rule = RULES[id]; const st = stageOf(id); const r = store.getRule(id);
  const lvls = [1, 2, 3].map((lv) => {
    const open = store.isUnlocked(id, lv, isReview());
    const why = lv === 1 ? t('locked_learn') : t('locked_prev');
    return `
      <li class="step ${open ? '' : 'locked'}">
        <span class="step-n">${num(lv + 1)}</span>
        <div class="step-body"><b>${t(`lvl_${lv}`)}</b><small>${t(`lvl_${lv}_d`)}</small>${open ? '' : `<small class="lock">🔒 ${why}</small>`}</div>
        ${starsHTML(r.lv[lv] || 0)}
        ${open ? `<a class="btn ${r.lv[lv] ? 'ghost' : 'primary'}" href="#/play/${id}/${lv}">${r.lv[lv] ? t('play_again') : t('start')}</a>` : '<span class="btn disabled" aria-disabled="true">🔒</span>'}
      </li>`;
  }).join('');
  const exs = lessonExamples(id);
  const L = rule.letters;
  shell(`
    ${crumb([{ href: '#/', label: esc(t('app_title')) }, { label: esc(tx(st.name)) }])}
    <article class="rule-hero" ${stageStyle(st)}>
      <div class="rh-text">
        <small class="kicker">${esc(tx(st.name))}</small>
        <h1>${esc(tx(rule.name))}</h1>
        <p class="tagline">${esc(tx(rule.tagline))}</p>
        <p class="kid">${esc(tx(rule.kid))}</p>
      </div>
      <figure class="rh-viz">${vizFor(rule.viz)}<figcaption>${esc(tx(VIZ_CAPTION[rule.viz]))}</figcaption></figure>
    </article>
    <section class="panel">
      <h2>${t('rule_steps')}</h2>
      <ol class="steps" ${stageStyle(st)}>
        <li class="step">
          <span class="step-n">1</span>
          <div class="step-body"><b>${t('step_learn')}</b><small>${t('step_learn_d')}</small></div>
          ${r.learned ? '<span class="done-tick" aria-label="done">✔</span>' : ''}
          <a class="btn ${r.learned ? 'ghost' : 'primary'}" href="#/learn/${id}">${r.learned ? t('review_lesson') : t('start')}</a>
        </li>${lvls}
      </ol>
    </section>
    <section class="panel two">
      <div>
        <h2>${t('rule_letters')}</h2>
        <p class="muted">${esc(tx(L.label))}</p>
        <div class="chips">${L.list.length ? L.list.map((c) => chip(c)).join('') : `<span class="muted">${esc(tx(L.label))}</span>`}</div>
        <p class="meta"><b>${t('rule_length')}:</b> ${esc(tx(rule.length))} ${badge(rule.review)}</p>
        ${reviewNote(rule.review)}
      </div>
      <div>
        <h2>${t('rule_examples')}</h2>
        <ul class="ex-list">${exs.map((e) => `<li>${spanHTML(e.key, e.w1, e.w2, locate(e.occ, POOL[e.key].w))}<small>${esc(ayahLabel(e.key))}</small></li>`).join('')}</ul>
      </div>
    </section>`, { cls: 'rule-page' });
}

// ───────── الدرس ─────────
function renderLearn(id, step = 0, exIdx = 0) {
  const rule = RULES[id]; const st = stageOf(id); const exs = lessonExamples(id);
  const N = 5; const L = rule.letters; const src = SOURCES[rule.poem.src];
  let body = '';
  if (step === 0) {
    body = `
      <h2>${t('learn_1')}</h2>
      <h3 class="rule-name">${esc(tx(rule.name))}</h3>
      <figure class="viz-fig">${vizFor(rule.viz)}<figcaption>${esc(tx(VIZ_CAPTION[rule.viz]))}</figcaption></figure>
      <div class="card kid-card"><small>${t('kid_label')}</small><p>${esc(tx(rule.kid))}</p></div>
      <div class="card def-card"><small>${t('def_label')} ${badge(tx(SOURCES.teaching.note))}</small><p>${esc(tx(rule.def))}</p></div>`;
  } else if (step === 1) {
    body = `
      <h2>${t('learn_2')}</h2>
      <ol class="how">${rule.how.map((h, i) => `<li><span class="hn">${num(i + 1)}</span><p>${esc(tx(h))}</p></li>`).join('')}</ol>
      <div class="card"><small>${esc(tx(L.label))}</small>
        <div class="chips">${L.list.length ? L.list.map((c) => chip(c)).join('') : `<p>${esc(tx(rule.needs))}</p>`}</div>
        ${L.mnemonic ? `<div class="mnemonic"><small>${t('mnemonic_label')} ${badge(L.mnemonic.review || (L.mnemonic.src ? '' : 'review'))}</small><p class="quran-text poem-line" dir="rtl" lang="ar">${esc(L.mnemonic.ar)}</p><p class="muted">${esc(L.mnemonic.en)} — ${esc(tx(L.mnemonic.note))}</p></div>` : ''}
      </div>`;
  } else if (step === 2) {
    const e = exs[exIdx];
    body = `
      <h2>${t('learn_3')}</h2>
      <div class="ex-head"><span>${t('ex_of', { i: num(exIdx + 1), n: num(exs.length) })}</span>${e.note ? `<span class="pill">${chip(e.note, { small: true })}</span>` : ''}</div>
      <div class="ayah-wrap lesson-ayah">${ayahHTML(e.key, { hl: locate(e.occ, POOL[e.key].w) })}<div class="ayah-meta"><span>${esc(ayahLabel(e.key))}</span>${audioBtn(e.key)}</div></div>
      ${legendHTML(id)}<p class="muted small">${t('legend_hint')}</p>
      <p class="card why-card">${esc(tx(whyOf(id, e.occ[3])))}</p>
      <div class="row between"><button class="btn ghost" data-ex="-1" ${exIdx === 0 ? 'disabled' : ''}>${t('prev')}</button><button class="btn ghost" data-ex="1" ${exIdx === exs.length - 1 ? 'disabled' : ''}>${t('next')}</button></div>`;
  } else if (step === 3) {
    const vs = rule.vs.map((v) => {
      const other = RULES[v.with]; const oe = lessonExamples(v.with)[0]; const me = exs[0];
      return `
        <div class="card vs-card"><h4>${esc(tx(other.name))}</h4><p>${esc(tx(v.tip))}</p>
          <div class="vs-grid">
            <div><small>${esc(ruleName(id))}</small>${spanHTML(me.key, me.w1, me.w2, locate(me.occ, POOL[me.key].w))}</div>
            <div><small>${esc(ruleName(v.with))}</small>${spanHTML(oe.key, oe.w1, oe.w2, locate(oe.occ, POOL[oe.key].w))}</div>
          </div></div>`;
    }).join('');
    body = `
      <h2>${t('learn_4')}</h2>
      <div class="card warn-card"><small>⚠\uFE0F ${t('watch_label')}</small><p>${esc(tx(rule.watch))}</p></div>
      <h3 class="sub">${t('vs_label')}</h3>${vs}`;
  } else {
    const verified = src.status === 'verified';
    body = `
      <h2>${t('learn_5')}</h2>
      <div class="card poem-card"><small>${t('poem_label')} — ${esc(tx(rule.poem.ref))} ${verified ? '' : badge('review')}</small>
        <div class="poem quran-text" dir="rtl" lang="ar">${rule.poem.ar.map((l) => `<p class="poem-line">${esc(l)}</p>`).join('')}</div>
        ${reviewNote(rule.poem.review)}</div>
      <div class="card src-card"><small>${t('source_label')}</small><p><b>${esc(tx(src.title))}</b></p><p class="muted">${esc(tx(src.ref))}</p><p class="muted">${esc(tx(src.note))}</p></div>
      <div class="card src-card"><small>${t('def_label')} · ${t('kid_label')}</small><p class="muted">${esc(tx(SOURCES.teaching.note))}</p></div>
      ${reviewNote(rule.review)}`;
  }
  const last = step === N - 1;
  shell(`
    ${crumb([{ href: '#/', label: esc(t('app_title')) }, { href: `#/rule/${id}`, label: esc(ruleName(id)) }, { label: esc(t('step_learn')) }])}
    <section class="lesson" ${stageStyle(st)}>
      <div class="lesson-top"><span class="muted">${t('learn_step', { i: num(step + 1), n: num(N) })}</span><div class="q-progress">${Array.from({ length: N }, (_, k) => `<i class="${k < step ? 'done' : k === step ? 'cur' : ''}"></i>`).join('')}</div></div>
      <div class="lesson-body">${body}</div>
      <div class="lesson-nav">
        <button class="btn ghost" id="l-prev" ${step === 0 ? 'disabled' : ''}>${t('prev')}</button>
        ${last ? `<button class="btn primary" id="l-done">${t('start_training')}</button>` : `<button class="btn primary" id="l-next">${t('next')}</button>`}
      </div>
    </section>`, { cls: 'lesson-page' });
  bindAudio(root);
  root.querySelector('#l-prev')?.addEventListener('click', () => renderLearn(id, step - 1));
  root.querySelector('#l-next')?.addEventListener('click', () => renderLearn(id, step + 1));
  root.querySelector('#l-done')?.addEventListener('click', () => { store.setLearned(id); go(`#/play/${id}/1`); });
  root.querySelectorAll('[data-ex]').forEach((b) => b.addEventListener('click', () => renderLearn(id, 2, exIdx + Number(b.dataset.ex))));
}

// ───────── اللعب والنتيجة ─────────
function playRun(kind, ruleId, level, stageId) {
  let qs, head;
  if (kind === 'level') { qs = buildLevel(ruleId, level); head = `<b>${esc(ruleName(ruleId))}</b> · ${t(`lvl_${level}`)}`; }
  else if (kind === 'stage') { qs = buildStageChallenge(stageId); head = `<b>${esc(tx(STAGES.find((s) => s.id === stageId).name))}</b> · ${t('stage_challenge')}`; }
  else { const learned = ALL_RULES.filter((id) => store.getRule(id).learned); qs = buildMixed(learned.length >= 2 ? learned : ALL_RULES, 10); head = `<b>${t('home_mixed')}</b>`; }
  const st = ruleId ? stageOf(ruleId) : stageId ? STAGES.find((s) => s.id === stageId) : null;
  root.classList.toggle('in-quiz', true);
  runQuiz(root, {
    qs, head,
    onExit: () => { root.classList.remove('in-quiz'); go(ruleId ? `#/rule/${ruleId}` : '#/'); },
    onDone: ({ correct, total }) => { root.classList.remove('in-quiz'); finish(kind, ruleId, level, stageId, correct, total, st); }
  });
  if (st) root.dataset.hue = st.hue; else delete root.dataset.hue;
}

function finish(kind, ruleId, level, stageId, correct, total, st) {
  const s = calcStars(correct, total); const pass = s >= 1;
  if (kind === 'level') store.setStars(ruleId, level, s); else if (kind === 'stage') store.setStageStars(stageId, s); else store.setMixed(s);
  const nextLevel = kind === 'level' && pass && level < 3;
  const again = kind === 'level' ? `#/play/${ruleId}/${level}` : kind === 'stage' ? `#/stage/${stageId}` : '#/mixed';
  shell(`
    <section class="result" ${st ? stageStyle(st) : ''}>
      <div class="confetti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
      <h1>${t('res_title')}</h1>
      <div class="big-stars">${starsHTML(s)}</div>
      <p class="score">${t('res_score', { c: num(correct), n: num(total) })}</p>
      <p class="verdict ${pass ? 'ok' : 'no'}">${pass ? t('res_pass') : t('res_fail')}</p>
      <div class="result-actions">
        ${nextLevel ? `<a class="btn primary big" href="#/play/${ruleId}/${level + 1}">${t('res_next_level')}</a>` : ''}
        ${!pass && kind === 'level' ? `<a class="btn ghost" href="#/learn/${ruleId}">${t('review_lesson')}</a>` : ''}
        <a class="btn ${nextLevel ? 'ghost' : 'primary'}" href="${again}">${t('retry')}</a>
        ${ruleId ? `<a class="btn ghost" href="#/rule/${ruleId}">${t('res_to_rule')}</a>` : ''}
        <a class="btn ghost" href="#/">${t('res_home')}</a>
      </div>
    </section>`, { cls: 'result-page' });
  if (ruleId) root.dataset.hue = stageOf(ruleId).hue;
}

// ───────── المصادر والمراجعة ─────────
function reviewItems() {
  const items = [];
  for (const id of ALL_RULES) {
    const r = RULES[id];
    if (r.review) items.push({ where: ruleName(id), what: tx(r.length), why: r.review });
    if (r.poem.review) items.push({ where: ruleName(id), what: r.poem.ar.join(' / '), why: r.poem.review });
    if (r.letters.mnemonic?.review) items.push({ where: ruleName(id), what: r.letters.mnemonic.ar, why: r.letters.mnemonic.review });
    if (SOURCES[r.poem.src].status === 'review' && !r.poem.review) items.push({ where: ruleName(id), what: r.poem.ar.join(' / '), why: tx(SOURCES[r.poem.src].note) });
  }
  return items;
}
function renderAbout() {
  const stat = { verified: t('about_status_verified'), review: t('about_status_review'), 'cross-check': t('about_status_cross') };
  const items = reviewItems();
  shell(`
    ${crumb([{ href: '#/', label: esc(t('app_title')) }, { label: esc(t('about_title')) }])}
    <h1>${t('about_title')}</h1><p class="lead">${t('about_lead')}</p>
    <h2>${t('about_sources')}</h2>
    <div class="src-list">${Object.values(SOURCES).map((s) => `<article class="card src ${s.status}"><span class="pill ${s.status}">${stat[s.status]}</span><h3>${esc(tx(s.title))}</h3><p class="muted">${esc(tx(s.ref))}</p><p>${esc(tx(s.note))}</p></article>`).join('')}</div>
    <h2>${t('about_review')} (${num(items.length)})</h2>
    <ul class="review-list">${items.map((it) => `<li><b>${esc(it.where)}</b> — <span class="quran-text-line">${esc(it.what)}</span><br><small>⚑ ${esc(it.why)}</small></li>`).join('')}</ul>
    <p class="muted">${t('about_integration')}</p>
    <div class="row"><button class="btn ghost" id="btn-reset">${t('about_reset')}</button><span id="reset-msg" class="muted" role="status"></span></div>`);
  root.querySelector('#btn-reset').addEventListener('click', () => { store.reset(); root.querySelector('#reset-msg').textContent = t('about_reset_done'); });
}

// ───────── الموجه ─────────
function render() {
  stopAudio();
  root.classList.remove('in-quiz'); delete root.dataset.hue;
  const h = location.hash.replace(/^#/, '') || '/';
  const p = h.split('/').filter(Boolean);
  const bad = () => { go('#/'); };
  try {
    if (!p.length) return renderHome();
    if (p[0] === 'rule' && RULES[p[1]]) return renderRule(p[1]);
    if (p[0] === 'learn' && RULES[p[1]]) return renderLearn(p[1]);
    if (p[0] === 'play' && RULES[p[1]] && LEVELS.some((l) => l.id === Number(p[2]))) return playRun('level', p[1], Number(p[2]));
    if (p[0] === 'stage' && STAGES.some((s) => s.id === p[1])) return playRun('stage', null, null, p[1]);
    if (p[0] === 'mixed') return playRun('mixed');
    if (p[0] === 'about') return renderAbout();
    return bad();
  } catch (e) {
    console.error(e);
    root.innerHTML = `<div class="page"><p class="review-banner">⚠\uFE0F ${esc(e.message)}</p><a class="btn primary" href="#/">${t('res_home')}</a></div>`;
  }
}

function chrome() {
  const L = document.getElementById('btn-lang'), H = document.getElementById('btn-home'), A = document.getElementById('btn-about'), R = document.getElementById('btn-review');
  const label = () => {
    document.querySelectorAll('[data-i]').forEach((el) => { el.textContent = t(el.dataset.i); });
    document.querySelectorAll('[data-it]').forEach((el) => { el.title = t(el.dataset.it); el.setAttribute('aria-label', t(el.dataset.it)); });
    R.setAttribute('aria-pressed', String(isReview())); R.classList.toggle('on', isReview());
    document.getElementById('brand-title').textContent = t('app_title');
  };
  L.addEventListener('click', () => { setLang(getLang() === 'ar' ? 'en' : 'ar'); label(); render(); });
  H.addEventListener('click', () => go('#/'));
  A.addEventListener('click', () => go('#/about'));
  R.addEventListener('click', () => { setReview(!isReview()); label(); render(); });
  document.getElementById('btn-theme').addEventListener('click', toggleTheme);
  label();
}


applyDir(); applyTheme(); chrome(); initDecor(root);
window.addEventListener('hashchange', render);
if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
render();
