// js/play.js — واجهة تشغيل الأسئلة (identify / spot / tapletter / sort / letters) مع التغذية الراجعة المفسرة.
import { RULES } from '../data/rules.js';
import { checkIdentify, checkSpot, checkTap, checkSortPlacement, checkLetters, whyOf } from './engine.js';
import { ayahHTML, spanHTML, legendHTML, ruleName, ayahLabel, audioBtn, chip, esc } from './ui.js';
import { t, tx, num } from './i18n.js';
import { playAyah, stopAudio } from './audio.js';

const FIND_KEY = { qalqalah: 'q_tap_qalqalah', ghunna: 'q_tap_ghunna', madd_tabii: 'q_tap_madd_tabii' };

export function bindAudio(scope) {
  scope.querySelectorAll('[data-audio]').forEach((b) => {
    b.addEventListener('click', () => {
      const lbl = b.querySelector('.lbl'); const old = lbl.textContent;
      playAyah(b.dataset.audio, (st) => {
        if (st === 'playing') { b.classList.add('on'); lbl.textContent = t('listening'); }
        else { b.classList.remove('on'); lbl.textContent = old; if (st === 'error') { b.classList.add('err'); b.setAttribute('title', t('audio_fail')); showToast(t('audio_fail')); } }
      });
    });
  });
}
export function showToast(msg) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('show'); clearTimeout(showToast._t); showToast._t = setTimeout(() => el.classList.remove('show'), 3500);
}

const fbHTML = (ok, title, lines, isLast) => `
  <div class="fb ${ok ? 'good' : 'bad'}" role="status">
    <div class="fb-title">${title}</div>
    ${lines.map((l) => `<p>${l}</p>`).join('')}
    <button type="button" class="btn primary fb-next">${isLast ? t('finish') : t('next')} <span aria-hidden="true" class="arr"></span></button>
  </div>`;

export function runQuiz(root, { qs, head = '', onDone, onExit }) {
  let i = 0, correct = 0;
  const total = qs.length;

  function frame(q, bodyHTML) {
    window.__tjcQ = q; // خطاف للاختبارات الآلية (لا أثر له على السلوك)
    root.innerHTML = `
      <div class="page"><section class="quiz" aria-live="off">
        <div class="quiz-top">
          <button type="button" class="btn-ghost q-exit">✕ <span>${t('back')}</span></button>
          <div class="q-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${i + 1}">${qs.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'cur' : ''}"></i>`).join('')}</div>
          <span class="q-count">${t('q_n', { i: num(i + 1), n: num(total) })}</span>
        </div>
        ${head ? `<div class="quiz-head">${head}</div>` : ''}
        <div class="q-card type-${q.type}">${bodyHTML}</div>
      </section></div>`;
    root.querySelector('.q-exit').addEventListener('click', () => { stopAudio(); onExit && onExit(); });
    bindAudio(root);
    window.scrollTo({ top: 0 });
  }

  function finishQuestion(ok, fbEl, lines, title) {
    if (ok) correct++;
    const last = i === total - 1;
    const slot = root.querySelector('.fb-slot');
    slot.innerHTML = fbHTML(ok, title, lines, last);
    const btn = slot.querySelector('.fb-next');
    btn.addEventListener('click', () => { stopAudio(); if (last) onDone({ correct, total }); else { i++; render(); } });
    slot.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    btn.focus({ preventScroll: true });
  }
  const goodTitle = () => t('good_title');
  const badTitle = () => t('bad_title');

  // ─────────── identify ───────────
  function renderIdentify(q) {
    frame(q, `
      <p class="q-prompt">${t('q_identify')}</p>
      <div class="ayah-wrap">${ayahHTML(q.key, { hl: q.hl })}<div class="ayah-meta"><span>${esc(ayahLabel(q.key))}</span></div></div>
      ${legendHTML(q.answer)}
      <div class="opts cols-${q.options.length > 3 ? 2 : 1}" role="group">${q.options.map((o) => `<button type="button" class="opt" data-o="${o}"><b>${esc(ruleName(o))}</b><small>${esc(tx(RULES[o].short))}</small></button>`).join('')}</div>
      <div class="fb-slot"></div>`);
    root.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => {
      const res = checkIdentify(q, b.dataset.o);
      root.querySelectorAll('.opt').forEach((x) => { x.disabled = true; if (x.dataset.o === q.answer) x.classList.add('right'); });
      if (!res.ok) b.classList.add('wrong');
      const lines = res.ok ? [esc(tx(res.text))] : [
        esc(t('wrong_pick', { w: tx(res.wrongName), n: tx(res.wrongNeeds) })),
        esc(t('right_is', { r: tx(res.rightName) })) + ' ' + esc(tx(res.text))
      ];
      finishQuestion(res.ok, null, lines, res.ok ? goodTitle() : badTitle());
    }));
  }

  // ─────────── spot ───────────
  function renderSpot(q) {
    let attempts = 0; let done = false;
    frame(q, `
      <p class="q-prompt">${t('q_spot', { r: esc(ruleName(q.ruleId)) })}</p>
      <div class="ayah-wrap">${ayahHTML(q.key, { mode: 'tap' })}<div class="ayah-meta"><span>${esc(ayahLabel(q.key))}</span>${q.audio ? audioBtn(q.key) : ''}</div></div>
      <div class="row"><button type="button" class="btn-ghost hint-btn">💡 ${t('hint')}</button></div>
      <div class="hint-slot" aria-live="polite"></div>
      <div class="fb-slot"></div>`);
    bindAudio(root);
    const wrap = root.querySelector('.ayah-wrap');
    root.querySelector('.hint-btn').addEventListener('click', () => { root.querySelector('.hint-slot').innerHTML = `<p class="hint">${esc(tx(RULES[q.ruleId].find))}</p>`; });
    const reveal = () => {
      wrap.querySelector('.ayah').outerHTML = ayahHTML(q.key, { hl: q.hl, accepted: q.accept });
    };
    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('.tapw'); if (!b || done) return;
      const wi = Number(b.dataset.w); const res = checkSpot(q, wi);
      if (res.ok) {
        done = true; reveal();
        finishQuestion(attempts === 0, null, [esc(tx(res.text)), legendHTML(q.ruleId)], attempts === 0 ? goodTitle() : badTitle());
      } else {
        attempts++; b.classList.add('shake', 'miss'); setTimeout(() => b.classList.remove('shake'), 500);
        if (attempts >= 2) {
          done = true; reveal();
          const o = q.occs[0];
          finishQuestion(false, null, [esc(t('spot_wrong_word', { w: res.word })), esc(tx(whyOf(q.ruleId, o[3]))), legendHTML(q.ruleId)], badTitle());
        } else root.querySelector('.hint-slot').innerHTML = `<p class="hint bad">${esc(t('spot_wrong_word', { w: res.word }))} ${esc(tx(res.text))} <em>${t('try_again')}</em></p>`;
      }
    });
  }

  // ─────────── tapletter ───────────
  function renderTap(q) {
    let attempts = 0; let done = false;
    frame(q, `
      <p class="q-prompt">${t(FIND_KEY[q.ruleId])}</p>
      <div class="tapword-wrap"><div class="tapword quran-text decor" dir="rtl" lang="ar" data-taps="1">${esc(q.word)}</div><div class="ayah-meta"><span>${esc(ayahLabel(q.key))}</span></div></div>
      <div class="hint-slot" aria-live="polite"></div>
      <div class="fb-slot"></div>`);
    const word = root.querySelector('.tapword');
    word.addEventListener('click', (e) => {
      const s = e.target.closest('.lt-hit'); if (!s || done) return;
      const ci = Number(s.dataset.ci); const res = checkTap(q, ci);
      if (res.ok) {
        done = true; word.querySelectorAll('.lt-hit').forEach((x) => x.classList.remove('miss')); s.classList.add('hl-cause', 'pop');
        finishQuestion(attempts === 0, null, [esc(tx(res.text))], attempts === 0 ? goodTitle() : badTitle());
      } else {
        attempts++; s.classList.add('miss', 'shake'); setTimeout(() => s.classList.remove('shake'), 500);
        if (attempts >= 2) {
          done = true; q.accept.forEach((c) => word.querySelector(`.lt-hit[data-ci="${c}"]`)?.classList.add('hl-cause'));
          finishQuestion(false, null, [esc(tx(res.text)), esc(tx(res.why))], badTitle());
        } else root.querySelector('.hint-slot').innerHTML = `<p class="hint bad">${esc(tx(res.text))} <em>${t('try_again')}</em></p>`;
      }
    });
  }

  // ─────────── sort ───────────
  function renderSort(q) {
    let selected = -1, mistakes = 0, placed = 0; const lines = [];
    frame(q, `
      <p class="q-prompt">${t('q_sort')}</p><p class="q-sub">${t('q_sort_pick')}</p>
      <div class="tray" role="group">${q.items.map((it, k) => `<button type="button" class="chip-item" data-k="${k}"><span class="quran-text-wrap">${spanHTML(it.key, it.occ[1], it.occ[2])}</span></button>`).join('')}</div>
      <div class="buckets cols-${q.ruleIds.length}">${q.ruleIds.map((r) => `<div class="bucket" data-r="${r}"><button type="button" class="bucket-btn"><b>${esc(ruleName(r))}</b><small>${esc(tx(RULES[r].short))}</small></button><div class="bucket-list"></div></div>`).join('')}</div>
      <div class="hint-slot" aria-live="polite"></div>
      <div class="fb-slot"></div>`);
    const tray = root.querySelector('.tray');
    tray.addEventListener('click', (e) => {
      const b = e.target.closest('.chip-item'); if (!b || b.disabled) return;
      tray.querySelectorAll('.chip-item').forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); selected = Number(b.dataset.k);
    });
    root.querySelectorAll('.bucket').forEach((bk) => bk.querySelector('.bucket-btn').addEventListener('click', () => {
      if (selected < 0) { root.querySelector('.hint-slot').innerHTML = `<p class="hint">${t('q_sort_pick')}</p>`; return; }
      const it = q.items[selected]; const res = checkSortPlacement(q, selected, bk.dataset.r);
      const chipEl = tray.querySelector(`.chip-item[data-k="${selected}"]`);
      if (res.ok) {
        chipEl.disabled = true; chipEl.classList.remove('sel');
        bk.querySelector('.bucket-list').insertAdjacentHTML('beforeend', `<div class="placed pop">${spanHTML(it.key, it.occ[1], it.occ[2], it.hl)}<small>${esc(tx(res.text))}</small></div>`);
        chipEl.remove(); placed++; selected = -1; root.querySelector('.hint-slot').innerHTML = '';
        if (placed === q.items.length) finishQuestion(mistakes === 0, null, [esc(t('placed_all')), legendHTML(q.ruleIds[0])], mistakes === 0 ? goodTitle() : badTitle());
      } else {
        mistakes++; chipEl.classList.add('shake'); setTimeout(() => chipEl.classList.remove('shake'), 500);
        root.querySelector('.hint-slot').innerHTML = `<p class="hint bad">${esc(t('wrong_sort', { w: tx(res.wrongName), n: tx(res.wrongNeeds) }))} ${esc(tx(res.text))}</p>`;
      }
    }));
    void lines;
  }

  // ─────────── letters ───────────
  function renderLetters(q) {
    const prompt = { noon: 'q_letters_noon', meem: 'q_letters_meem', lam: 'q_letters_lam', qalqalah: 'q_letters_qalqalah' }[q.family];
    const label = (o) => (o === 'yes' ? t('yes') : o === 'no' ? t('no') : ruleName(o));
    frame(q, `
      <p class="q-prompt">${t(prompt)}</p>
      <div class="big-letter">${chip(q.letter)}</div>
      <div class="opts cols-${q.options.length > 3 ? 2 : q.options.length}" role="group">${q.options.map((o) => `<button type="button" class="opt" data-o="${o}"><b>${esc(label(o))}</b>${RULES[o] ? `<small>${esc(tx(RULES[o].short))}</small>` : ''}</button>`).join('')}</div>
      <div class="fb-slot"></div>`);
    root.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => {
      const res = checkLetters(q, b.dataset.o);
      root.querySelectorAll('.opt').forEach((x) => { x.disabled = true; if (x.dataset.o === q.answer) x.classList.add('right'); });
      if (!res.ok) b.classList.add('wrong');
      finishQuestion(res.ok, null, [esc(tx(res.text))], res.ok ? goodTitle() : badTitle());
    }));
  }

  function render() {
    const q = qs[i];
    ({ identify: renderIdentify, spot: renderSpot, tapletter: renderTap, sort: renderSort, letters: renderLetters })[q.type](q);
  }
  render();
}

