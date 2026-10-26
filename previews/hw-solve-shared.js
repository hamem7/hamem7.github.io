/* معاينة شاشة حل الواجب المنزلي — منطق مشترك بين النموذجين (أ) و(ب). للمعاينة فقط: لا شبكة ولا حفظ حقيقي. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const THEME = document.body.dataset.theme; // 'mushaf' | 'heroes'

  /* ---------- النصوص (عربي / إنجليزي) ---------- */
  const T = {
    ar: {
      brand: 'حمٓ', home: 'الرئيسية', settings: 'الإعدادات', homework: 'الواجب المنزلي',
      hi: 'مرحباً بك يا بطل 👑', hwOf: 'واجب سورة الإخلاص', teacher: 'من معلمك أ. محمد',
      chipQ: 'أسئلة', chipMin: 'دقائق تقريباً', chipStars: 'نجوم تنتظرك',
      assigned: 'هذا الواجب مخصّص لـ', draft: 'وجدنا إجابات محفوظة على هذا الجهاز — سنكمل من حيث توقفت.',
      how: 'كيف يعمل؟', h1: 'اقرأ السؤال بهدوء', h2: 'اختر أو اكتب إجابتك — تُحفظ تلقائياً', h3: 'راجع ثم سلّم الواجب',
      start: 'ابدأ الحل ▶', resume: 'أكمل من حيث توقفت ▶',
      q: 'سؤال', of: 'من', saved: '💾 تم الحفظ على جهازك', stars: 'نجوم',
      skip: 'تخطَّ وارجع لاحقاً', prev: '◀ السابق', next: 'التالي ▶', review: 'مراجعة وتسليم ✔',
      listen: '🔊 استمع', listenNo: 'الصوت التجريبي غير متاح في هذا المتصفح',
      pickOne: 'اختر إجابة واحدة', pickMany: 'اختر كل ما ينطبق', typeHere: 'اكتب الكلمة هنا…',
      orderHelp: 'اسحب البطاقة أو استخدم الأسهم لترتيب الآيات', matchHelp: 'اضغط على بداية الآية ثم على نهايتها. اضغط مرة أخرى على المربوط لفكّ الربط.',
      reviewT: 'مراجعة قبل التسليم', reviewSub: 'اضغط على أي سؤال للرجوع إليه.', answered: 'مجاب', unanswered: 'بدون إجابة', skipped: 'تم تخطّيه',
      warnUn: 'لديك أسئلة لم تُجب عنها. يمكنك الرجوع إليها أو التسليم كما هي.', allDone: 'سجّلنا إجاباتك على كل الأسئلة. راجعها ثم سلّم (النتيجة تظهر بعد التسليم) 📝',
      back: 'العودة للأسئلة', submit: '📨 تسليم الواجب', submitAnyway: '📨 سلّم على أي حال',
      pendT: 'جاري إرسال واجبك…', pendX: 'لم يصل بعد إلى معلمك. لا تُغلق الصفحة حتى يظهر التأكيد.', pendB: 'قيد الإرسال (غير مؤكَّد)',
      okT: 'وصل واجبك إلى معلمك', okX: 'تأكّد الخادم من استلام إجاباتك وحفظها. سيراجعها معلمك ويعتمد نتيجتك.', okB: 'تم الاستلام والحفظ (مؤكَّد)',
      failT: 'لم يصل واجبك إلى المعلم بعد', failX: 'إجاباتك محفوظة على هذا الجهاز ولن تضيع. سنعيد المحاولة تلقائياً عند عودة الاتصال.', failB: 'محفوظ على الجهاز فقط — لم يُرسَل',
      retry: '🔄 إعادة الإرسال الآن', receipt: 'رقم التسليم', again: '↺ إعادة تشغيل المعاينة',
      offlineB: '📴 لا يوجد اتصال بالإنترنت الآن. إجاباتك تُحفظ على جهازك ولن تضيع.',
      set: { title: 'إعدادات الشاشة', font: 'حجم الخط', dark: 'الوضع الليلي', focus: 'وضع التركيز (إخفاء المشتتات)', lang: 'English', offline: 'محاكاة انقطاع الاتصال', close: 'إغلاق' },
      enc: ['تم حفظ إجابتك 📝', 'تم حفظ إجابتك، واصل 💪', 'تم حفظ إجابتك، أنت في منتصف الطريق 🚀', 'تم حفظ إجابتك، قاربت على النهاية ✨', 'تم حفظ كل إجاباتك، راجعها ثم سلّم 📝'],
      leave: 'لديك إجابات لم تُسلَّم بعد. هل تريد المغادرة؟',
      preview: 'معاينة تصميم', model: THEME === 'mushaf' ? 'نموذج (أ) — المصحف الهادئ' : 'نموذج (ب) — رحلة الأبطال'
    },
    en: {
      brand: 'Ham', home: 'Home', settings: 'Settings', homework: 'Homework',
      hi: 'Welcome, champion 👑', hwOf: 'Surat Al-Ikhlas homework', teacher: 'From your teacher, Mr. Mohammed',
      chipQ: 'questions', chipMin: 'minutes approx.', chipStars: 'stars waiting',
      assigned: 'This homework is assigned to', draft: 'We found saved answers on this device — you will continue where you stopped.',
      how: 'How does it work?', h1: 'Read the question calmly', h2: 'Choose or type — answers save automatically', h3: 'Review, then submit',
      start: 'Start ▶', resume: 'Continue where I stopped ▶',
      q: 'Question', of: 'of', saved: '💾 Saved on your device', stars: 'stars',
      skip: 'Skip and come back', prev: '◀ Back', next: 'Next ▶', review: 'Review & submit ✔',
      listen: '🔊 Listen', listenNo: 'Demo audio is not available in this browser',
      pickOne: 'Choose one answer', pickMany: 'Select all that apply', typeHere: 'Type the word here…',
      orderHelp: 'Drag a card or use the arrows to order the verses', matchHelp: 'Tap the start of a verse, then its ending. Tap a linked one again to unlink.',
      reviewT: 'Review before submitting', reviewSub: 'Tap any question to go back to it.', answered: 'Answered', unanswered: 'Unanswered', skipped: 'Skipped',
      warnUn: 'Some questions have no answer. You can go back or submit as is.', allDone: 'All questions have an answer. Review them, then submit (your score appears after submitting) 📝',
      back: 'Back to questions', submit: '📨 Submit homework', submitAnyway: '📨 Submit anyway',
      pendT: 'Sending your homework…', pendX: 'It has not reached your teacher yet. Do not close the page until confirmed.', pendB: 'Sending (not confirmed)',
      okT: 'Your homework reached your teacher', okX: 'The server confirmed it received and saved your answers. Your teacher will review and approve your result.', okB: 'Received and saved (confirmed)',
      failT: 'Your homework has not reached the teacher yet', failX: 'Your answers are saved on this device and will not be lost. We will retry automatically when you are back online.', failB: 'Saved on device only — not sent',
      retry: '🔄 Resend now', receipt: 'Submission no.', again: '↺ Restart preview',
      offlineB: '📴 No internet connection. Your answers are saved on your device and will not be lost.',
      set: { title: 'Screen settings', font: 'Text size', dark: 'Dark mode', focus: 'Focus mode (hide distractions)', lang: 'العربية', offline: 'Simulate going offline', close: 'Close' },
      enc: ['Answer saved 📝', 'Answer saved, keep going 💪', 'Answer saved, you are halfway 🚀', 'Answer saved, almost there ✨', 'All answers saved. Review, then submit 📝'],
      leave: 'You have answers that were not submitted. Leave anyway?',
      preview: 'Design preview', model: THEME === 'mushaf' ? 'Model A — Calm Mushaf' : 'Model B — Heroes Journey'
    }
  };

  /* ---------- الأسئلة التجريبية (سورة الإخلاص) ---------- */
  const Q = [
    { id: 1, type: 'mcq', title: { ar: 'أكمل الآية', en: 'Complete the verse' }, ayah: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ ﴿١﴾ ٱللَّهُ ______',
      options: ['ٱلصَّمَدُ', 'ٱلْعَظِيمُ', 'ٱلْغَفُورُ'] },
    { id: 2, type: 'order', title: { ar: 'رتّب آيات سورة الإخلاص', en: 'Order the verses of Al-Ikhlas' }, ayah: '﴿ سُورَةُ ٱلْإِخْلَاصِ ﴾',
      options: ['وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ', 'قُلْ هُوَ ٱللَّهُ أَحَدٌ', 'لَمْ يَلِدْ وَلَمْ يُولَدْ', 'ٱللَّهُ ٱلصَّمَدُ'], },
    { id: 3, type: 'match', title: { ar: 'صِل بداية الآية بنهايتها', en: 'Match each verse start to its ending' }, ayah: '﴿ ٱلْإِخْلَاصِ ﴾',
      left: ['قُلْ هُوَ ٱللَّهُ', 'لَمْ يَلِدْ', 'وَلَمْ يَكُن لَّهُۥ'], right: ['كُفُوًا أَحَدٌۢ', 'وَلَمْ يُولَدْ', 'أَحَدٌ'], },
    { id: 4, type: 'blank', title: { ar: 'اكتب الكلمة الناقصة', en: 'Type the missing word' }, ayah: 'لَمْ يَلِدْ وَلَمْ ______', },
    { id: 5, type: 'multi', title: { ar: 'اختر الكلمات الواردة في السورة', en: 'Choose the words found in the surah' }, ayah: '﴿ ٱللَّهُ ٱلصَّمَدُ ﴾',
      options: ['ٱلصَّمَدُ', 'أَحَدٌ', 'ٱلرَّحْمَٰنِ', 'كُفُوًا'] }
  ];

  /* ---------- الحالة ---------- */
  const S = { lang: 'ar', view: 'welcome', idx: 0, ans: {}, touched: {}, skipped: {}, font: 1, dark: false, focus: false, offline: false, sub: null, active: null, started: false, encShown: {} };
  const t = () => T[S.lang];
  const total = Q.length;
  const isAns = (q) => {
    const a = S.ans[q.id];
    if (q.type === 'mcq' || q.type === 'blank') return a !== undefined && String(a).trim() !== '';
    if (q.type === 'multi') return Array.isArray(a) && a.length > 0;
    if (q.type === 'order') return !!S.touched[q.id];
    if (q.type === 'match') return a && Object.keys(a).length > 0;
    return false;
  };
  const answeredCount = () => Q.filter(isAns).length;
  const starsLeft = () => answeredCount();

  /* ---------- أدوات واجهة ---------- */
  const app = $('#app');
  function toast(msg) {
    let el = $('#toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.append(el); }
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), 2200);
  }
  function flashSaved() { const el = $('#saved'); if (!el) return; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  function onAnswered() {
    flashSaved();
    const n = answeredCount();
    if (n >= 1 && !S.encShown[n]) { S.encShown[n] = 1; toast(t().enc[Math.min(n, total) - 1]); }
    updateChrome();
  }
  function applyGlobals() {
    document.documentElement.lang = S.lang; document.documentElement.dir = S.lang === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('dark', S.dark); document.body.classList.toggle('focus', S.focus);
    document.documentElement.style.setProperty('--fs', S.font);
  }
  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = document.createElement('div'); box.className = 'confetti'; document.body.append(box);
    const colors = ['#d4af37', '#25a07a', '#f1dd8f', '#2f80ed', '#e0463c', '#8b5cf6'];
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('i');
      p.style.cssText = `left:${Math.random() * 100}%;background:${colors[i % colors.length]};animation-delay:${Math.random() * .6}s;animation-duration:${2 + Math.random() * 1.6}s;transform:rotate(${Math.random() * 360}deg)`;
      box.append(p);
    }
    setTimeout(() => box.remove(), 4200);
  }

  /* ---------- الهيكل العام ---------- */
  function shell() {
    const L = t();
    app.innerHTML = `
      <div class="pv-note"><b>${esc(L.preview)}</b> · ${esc(L.model)} <a href="hw-solve-${THEME === 'mushaf' ? 'b-heroes' : 'a-mushaf'}.html">${S.lang === 'ar' ? 'شاهد النموذج الآخر ⇄' : 'See the other model ⇄'}</a></div>
      <header class="tb"><div class="tb-brand"><span class="logo">📖</span><b>${esc(L.brand)}</b><span class="tb-sub">${esc(L.homework)}</span></div>
        <div class="tb-act"><button class="ib" id="b-set" aria-label="${esc(L.settings)}">⚙️</button></div></header>
      <div id="offline" class="banner warn" ${S.offline ? '' : 'hidden'}>${esc(L.offlineB)}</div>
      <main id="view"></main><div id="bar-host"></div><div id="sheet-host"></div>`;
    $('#b-set').onclick = openSettings;
    render();
  }
  function updateChrome() {
    const seg = document.querySelectorAll('.seg'); seg.forEach((b, i) => { const q = Q[i]; b.classList.toggle('done', isAns(q)); b.classList.toggle('skip', !!S.skipped[q.id] && !isAns(q)); b.classList.toggle('cur', i === S.idx); });
    const st = $('#stars'); if (st) st.innerHTML = `⭐ <b>${starsLeft()}</b> <span>${esc(t().stars)}</span>`;
    const pb = $('#pbar'); if (pb) pb.style.width = Math.round(answeredCount() / total * 100) + '%';
  }

  function render() {
    const v = $('#view'); const bar = $('#bar-host'); bar.innerHTML = '';
    if (S.view === 'welcome') viewWelcome(v);
    else if (S.view === 'quiz') { viewQuiz(v); drawBar(bar); }
    else if (S.view === 'review') viewReview(v);
    else viewDone(v);
    const off = $('#offline'); if (off) off.hidden = !S.offline;
    window.scrollTo(0, 0);
  }

  /* ---------- 1) الترحيب ---------- */
  function viewWelcome(v) {
    const L = t();
    v.innerHTML = `<section class="card welcome">
      <div class="hero"><div class="avatar" aria-hidden="true">👨‍🏫</div>
        <div><h1>${esc(L.hi)}</h1><p class="muted">${esc(L.hwOf)} · ${esc(L.teacher)}</p></div></div>
      <div class="chips"><span class="chip">📝 <b>${total}</b> ${esc(L.chipQ)}</span><span class="chip">⏱️ <b>~5</b> ${esc(L.chipMin)}</span><span class="chip">⭐ <b>${total}</b> ${esc(L.chipStars)}</span></div>
      <div class="banner info">${esc(L.assigned)}: <b>${S.lang === 'ar' ? 'أحمد محمد' : 'Ahmed Mohammed'}</b></div>
      ${S.started ? `<div class="banner info">${esc(L.draft)}</div>` : ''}
      <h3 class="how-t">${esc(L.how)}</h3>
      <ol class="how"><li><span>1</span>${esc(L.h1)}</li><li><span>2</span>${esc(L.h2)}</li><li><span>3</span>${esc(L.h3)}</li></ol>
      <button class="btn gold big" id="go">${esc(S.started ? L.resume : L.start)}</button></section>`;
    $('#go').onclick = () => { S.started = true; S.view = 'quiz'; render(); };
  }

  /* ---------- 2) الأسئلة ---------- */
  function drawBar(host) {
    const L = t(); const last = S.idx === total - 1;
    host.innerHTML = `<nav class="bar" aria-label="navigation"><div class="bar-in">
      <button class="btn ghost" id="pv" ${S.idx === 0 ? 'disabled' : ''}>${esc(L.prev)}</button>
      <button class="btn link" id="sk">${esc(L.skip)}</button>
      ${last ? `<button class="btn gold" id="nx">${esc(L.review)}</button>` : `<button class="btn" id="nx">${esc(L.next)}</button>`}</div></nav>`;
    $('#pv').onclick = () => go(S.idx - 1);
    $('#sk').onclick = () => { if (!isAns(Q[S.idx])) S.skipped[Q[S.idx].id] = 1; last ? (S.view = 'review', render()) : go(S.idx + 1); };
    $('#nx').onclick = () => last ? (S.view = 'review', render()) : go(S.idx + 1);
  }
  function go(i) {
    if (i < 0 || i >= total) return;
    const old = $('#qwrap'); const dir = i > S.idx ? 1 : -1; S.idx = i; S.active = null;
    if (old && !matchMedia('(prefers-reduced-motion: reduce)').matches) { old.style.setProperty('--dx', dir * (S.lang === 'ar' ? -1 : 1) * 30 + 'px'); }
    render();
  }
  function viewQuiz(v) {
    const L = t(); const q = Q[S.idx];
    const segs = Q.map((x, i) => `<button class="seg${isAns(x) ? ' done' : ''}${S.skipped[x.id] && !isAns(x) ? ' skip' : ''}${i === S.idx ? ' cur' : ''}" data-i="${i}" aria-label="${esc(L.q)} ${i + 1}" ${i === S.idx ? 'aria-current="step"' : ''}><span>${i + 1}</span></button>`).join('');
    v.innerHTML = `<section class="quiz">
      <div class="head card"><div class="meta"><b>${esc(L.q)} ${S.idx + 1} ${esc(L.of)} ${total}</b>
        <span id="stars" class="stars">⭐ <b>${starsLeft()}</b> <span>${esc(L.stars)}</span></span><span id="saved" class="saved">${esc(L.saved)}</span></div>
        <div class="segs" role="group">${segs}</div><div class="pbar"><div id="pbar" style="width:${Math.round(answeredCount() / total * 100)}%"></div></div></div>
      <div id="qwrap" class="card qcard"><div class="qtop"><span class="qtype">${esc(typeName(q.type))}</span><h2>${esc(q.title[S.lang])}</h2></div>
        <div class="mushaf"><div class="orn" aria-hidden="true">❁</div><p class="ayah" id="ayah">${esc(q.ayah)}</p>
          <button class="ib sm" id="lis">${esc(L.listen)}</button></div>
        <div id="ans"></div>
        </div></section>`;
    v.querySelectorAll('.seg').forEach((b) => (b.onclick = () => go(+b.dataset.i)));
    $('#lis').onclick = () => { try { const u = new SpeechSynthesisUtterance(q.ayah.replace(/[﴿﴾_]/g, '')); u.lang = 'ar-SA'; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { toast(t().listenNo); } };
    renderAnswer(q, $('#ans'));
  }
  function typeName(ty) {
    const m = { mcq: ['اختيار من متعدد', 'Multiple choice'], order: ['ترتيب الآيات', 'Ordering'], match: ['مطابقة', 'Matching'], blank: ['فراغ كتابي', 'Fill in the blank'], multi: ['تحديد متعدد', 'Multi-select'] };
    return m[ty][S.lang === 'ar' ? 0 : 1];
  }

  function renderAnswer(q, host) {
    const L = t(); host.innerHTML = '';
    const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
    if (q.type === 'mcq' || q.type === 'multi') {
      const multi = q.type === 'multi'; const cur = multi ? new Set(S.ans[q.id] || []) : S.ans[q.id];
      host.append(mk('p', 'help', esc(multi ? L.pickMany : L.pickOne)));
      q.options.forEach((o, i) => {
        const sel = multi ? cur.has(i) : cur === i;
        const b = mk('button', 'opt' + (sel ? ' sel' : ''), `<span class="lt">${'أبجد'.split('')[i] && S.lang === 'ar' ? 'أبجد'.split('')[i] : 'ABCD'[i]}</span><span class="ot">${esc(o)}</span><span class="ck" aria-hidden="true">${multi ? '☑' : '●'}</span>`);
        b.setAttribute(multi ? 'role' : 'role', multi ? 'checkbox' : 'radio'); b.setAttribute('aria-checked', sel);
        b.onclick = () => {
          if (multi) { cur.has(i) ? cur.delete(i) : cur.add(i); S.ans[q.id] = [...cur]; } else S.ans[q.id] = i;
          delete S.skipped[q.id]; renderAnswer(q, host); onAnswered();
        };
        host.append(b);
      });
    } else if (q.type === 'blank') {
      const inp = mk('input', 'blank'); inp.type = 'text'; inp.placeholder = L.typeHere; inp.value = S.ans[q.id] || ''; inp.autocomplete = 'off';
      inp.oninput = () => { S.ans[q.id] = inp.value; delete S.skipped[q.id]; onAnswered(); };
      host.append(inp);
    } else if (q.type === 'order') {
      const order = S.ans[q.id] || (S.ans[q.id] = q.options.map((_, i) => i));
      host.append(mk('p', 'help', esc(L.orderHelp)));
      const list = mk('div', 'olist');
      const move = (from, to) => { if (to < 0 || to >= order.length) return; order.splice(to, 0, order.splice(from, 1)[0]); S.touched[q.id] = 1; delete S.skipped[q.id]; renderAnswer(q, host); onAnswered(); };
      order.forEach((oi, pos) => {
        const row = mk('div', 'orow', `<span class="num">${pos + 1}</span><span class="ot">${esc(q.options[oi])}</span>
          <span class="arrows"><button class="ib sm" aria-label="up" ${pos === 0 ? 'disabled' : ''}>▲</button><button class="ib sm" aria-label="down" ${pos === order.length - 1 ? 'disabled' : ''}>▼</button></span>`);
        row.draggable = true;
        const [up, dn] = row.querySelectorAll('button'); up.onclick = () => move(pos, pos - 1); dn.onclick = () => move(pos, pos + 1);
        row.ondragstart = (e) => { e.dataTransfer.setData('text/plain', pos); row.classList.add('drag'); };
        row.ondragend = () => row.classList.remove('drag');
        row.ondragover = (e) => e.preventDefault();
        row.ondrop = (e) => { e.preventDefault(); move(+e.dataTransfer.getData('text/plain'), pos); };
        list.append(row);
      });
      host.append(list);
    } else if (q.type === 'match') {
      const pairs = S.ans[q.id] || (S.ans[q.id] = {});
      host.append(mk('p', 'help', esc(L.matchHelp)));
      const grid = mk('div', 'mgrid'); const lc = mk('div', 'mcol'); const rc = mk('div', 'mcol');
      const colorOfLeft = (li) => Object.keys(pairs).sort().indexOf(String(li));
      q.left.forEach((txt, li) => {
        const linked = pairs[li] !== undefined; const c = linked ? colorOfLeft(li) : -1;
        const d = mk('button', 'pair' + (S.active === li ? ' active' : '') + (linked ? ' linked pc' + (li % 3) : ''), `<span>${esc(txt)}</span>${linked ? `<em>${li + 1}</em>` : ''}`);
        d.onclick = () => { if (linked) { delete pairs[li]; S.active = null; } else S.active = li; renderAnswer(q, host); onAnswered(); };
        lc.append(d);
      });
      const usedBy = {}; Object.entries(pairs).forEach(([l, r]) => (usedBy[r] = +l));
      q.right.forEach((txt, ri) => {
        const linked = usedBy[ri] !== undefined;
        const d = mk('button', 'pair' + (linked ? ' linked pc' + (usedBy[ri] % 3) : ''), `<span>${esc(txt)}</span>${linked ? `<em>${usedBy[ri] + 1}</em>` : ''}`);
        d.onclick = () => { if (S.active === null || linked) return; pairs[S.active] = ri; S.active = null; delete S.skipped[q.id]; renderAnswer(q, host); onAnswered(); };
        rc.append(d);
      });
      grid.append(lc, rc); host.append(grid);
    }
  }

  /* ---------- 3) مراجعة قبل التسليم ---------- */
  function viewReview(v) {
    const L = t(); const un = Q.filter((q) => !isAns(q));
    const tiles = Q.map((q, i) => {
      const a = isAns(q); const sk = !a && S.skipped[q.id];
      return `<button class="tile ${a ? 'ok' : sk ? 'sk' : 'no'}" data-i="${i}"><span class="tn">${i + 1}</span><span class="tt">${esc(q.title[S.lang])}</span><span class="ts">${a ? '✔ ' + esc(L.answered) : sk ? '↷ ' + esc(L.skipped) : '○ ' + esc(L.unanswered)}</span></button>`;
    }).join('');
    v.innerHTML = `<section class="card review"><h2>${esc(L.reviewT)}</h2><p class="muted">${esc(L.reviewSub)}</p>
      <div class="banner ${un.length ? 'warn' : 'ok'}">${esc(un.length ? L.warnUn : L.allDone)}</div>
      <div class="tiles">${tiles}</div>
      <div class="row"><button class="btn ghost" id="bk">${esc(L.back)}</button><button class="btn gold" id="sb">${esc(un.length ? L.submitAnyway : L.submit)}</button></div></section>`;
    v.querySelectorAll('.tile').forEach((b) => (b.onclick = () => { S.idx = +b.dataset.i; S.view = 'quiz'; render(); }));
    $('#bk').onclick = () => { S.view = 'quiz'; render(); };
    $('#sb').onclick = submit;
  }

  /* ---------- 4) حالة التسليم الصادقة ---------- */
  function submit() { S.view = 'done'; S.sub = 'pending'; render(); setTimeout(() => { S.sub = S.offline ? 'failed' : 'confirmed'; if (S.view === 'done') { render(); if (S.sub === 'confirmed') confetti(); } }, 1500); }
  function viewDone(v) {
    const L = t(); const s = S.sub;
    const map = { pending: ['⏳', L.pendT, L.pendX, L.pendB, 'b-info'], confirmed: ['✅', L.okT, L.okX, L.okB, 'b-ok'], failed: ['⚠️', L.failT, L.failX, L.failB, 'b-warn'] }[s];
    v.innerHTML = `<section class="card status"><div class="ico ${s}">${map[0]}</div><h2>${esc(map[1])}</h2><p class="muted">${esc(map[2])}</p>
      <p><span class="badge ${map[4]}">${esc(map[3])}</span></p>
      ${s === 'confirmed' ? `<div class="result"><div class="stars-big">${'⭐'.repeat(Math.max(1, starsLeft()))}</div><p class="muted">${esc(L.receipt)}: <b>…A7F3C9</b></p></div>` : ''}
      ${s === 'failed' ? `<button class="btn" id="rt">${esc(L.retry)}</button>` : ''}
      <p><button class="btn ghost" id="rs">${esc(L.again)}</button></p></section>`;
    if ($('#rt')) $('#rt').onclick = () => { S.offline = false; S.sub = 'pending'; render(); setTimeout(() => { S.sub = 'confirmed'; render(); confetti(); }, 1200); };
    $('#rs').onclick = () => { Object.assign(S, { view: 'welcome', idx: 0, ans: {}, touched: {}, skipped: {}, sub: null, active: null, started: false, encShown: {} }); render(); };
  }

  /* ---------- الإعدادات: خط، ليلي، تركيز، لغة، محاكاة الانقطاع ---------- */
  function openSettings() {
    const L = t().set; const host = $('#sheet-host');
    host.innerHTML = `<div class="sheet-bg" id="sbg"><div class="sheet" role="dialog" aria-modal="true"><h3>${esc(L.title)}</h3>
      <div class="srow"><span>${esc(L.font)}</span><span class="fz"><button class="ib" id="f-" aria-label="A-">A−</button><button class="ib" id="f+" aria-label="A+">A+</button></span></div>
      <label class="srow"><span>${esc(L.dark)}</span><input type="checkbox" id="s-d" ${S.dark ? 'checked' : ''}></label>
      <label class="srow"><span>${esc(L.focus)}</span><input type="checkbox" id="s-f" ${S.focus ? 'checked' : ''}></label>
      <label class="srow"><span>${esc(L.offline)}</span><input type="checkbox" id="s-o" ${S.offline ? 'checked' : ''}></label>
      <div class="srow"><span></span><button class="btn soft" id="s-l">${esc(L.lang)}</button></div>
      <button class="btn" id="s-c">${esc(L.close)}</button></div></div>`;
    const close = () => (host.innerHTML = '');
    $('#sbg').onclick = (e) => { if (e.target.id === 'sbg') close(); };
    $('#s-c').onclick = close;
    $('#f-').onclick = () => { S.font = Math.max(.85, +(S.font - .1).toFixed(2)); applyGlobals(); };
    $('#f+').onclick = () => { S.font = Math.min(1.5, +(S.font + .1).toFixed(2)); applyGlobals(); };
    $('#s-d').onchange = (e) => { S.dark = e.target.checked; applyGlobals(); };
    $('#s-f').onchange = (e) => { S.focus = e.target.checked; applyGlobals(); };
    $('#s-o').onchange = (e) => { S.offline = e.target.checked; const o = $('#offline'); if (o) o.hidden = !S.offline; };
    $('#s-l').onclick = () => { S.lang = S.lang === 'ar' ? 'en' : 'ar'; applyGlobals(); shell(); };
  }

  /* تنبيه عند مغادرة الصفحة قبل التسليم */
  window.addEventListener('beforeunload', (e) => { if (answeredCount() > 0 && S.view !== 'done') { e.preventDefault(); e.returnValue = t().leave; } });

  applyGlobals(); shell();
})();
