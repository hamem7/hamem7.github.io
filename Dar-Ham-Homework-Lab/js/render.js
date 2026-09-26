// js/render.js — renders one question and reports answers in the SAME shapes the Dar Ham platform uses
// (mcq/dropdown/written_blank/write_3_ayahs: string · checkbox: string[] · dual_dropdown: [w1,w2]
//  · matrix_order: string[] (index = position-1) · matching: {leftId: rightId}).
// Everything is inserted with textContent (never innerHTML) so question data can never inject markup.

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v !== null && v !== undefined) e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach(c => e.append(c));
  return e;
}
/** Question texts may contain <br> (engine convention). Split on it, keep everything else as plain text. */
function textWithBreaks(target, str) {
  String(str ?? '').split(/<br\s*\/?>/i).forEach((part, i) => { if (i) target.append(document.createElement('br')); target.append(document.createTextNode(part)); });
}

export function renderQuestion(host, q, answers, onAnswer) {
  host.textContent = '';
  const title = el('h3', {}); textWithBreaks(title, q.title);
  const box = el('div', { class: 'qbox quran' }); textWithBreaks(box, q.text);
  host.append(title, box);
  const saved = answers[q.id];
  const set = (val) => { answers[q.id] = val; onAnswer(q.id, val); };

  if (q.type === 'mcq' || q.type === 'checkbox') {
    const multi = q.type === 'checkbox';
    const cur = multi ? new Set(Array.isArray(saved) ? saved : []) : saved;
    (q.options || []).forEach((opt, i) => {
      const input = el('input', { type: multi ? 'checkbox' : 'radio', name: 'opt_' + q.id, value: opt });
      const label = el('label', { class: 'opt' }, input, el('span', { text: opt }));
      const isSel = multi ? cur.has(opt) : cur === opt;
      if (isSel) { input.checked = true; label.classList.add('sel'); }
      input.addEventListener('change', () => {
        if (multi) { input.checked ? cur.add(opt) : cur.delete(opt); label.classList.toggle('sel', input.checked); set([...cur]); }
        else { host.querySelectorAll('.opt').forEach(o => o.classList.remove('sel')); label.classList.add('sel'); set(opt); }
      });
      host.append(label);
    });
  } else if (q.type === 'dropdown') {
    const sel = el('select', {}, el('option', { value: '', text: '— اختر —', disabled: true, selected: !saved }), ...(q.options || []).map(o => el('option', { value: o, text: o, selected: saved === o })));
    sel.style.fontFamily = "'Amiri Quran', serif"; sel.style.fontSize = '1.3rem';
    sel.addEventListener('change', () => set(sel.value));
    host.append(sel);
  } else if (q.type === 'dual_dropdown') {
    const cur = Array.isArray(saved) ? [...saved] : ['', ''];
    [q.options1, q.options2].forEach((opts, idx) => {
      const sel = el('select', {}, el('option', { value: '', text: `— الكلمة (${idx + 1}) —`, disabled: true, selected: !cur[idx] }), ...(opts || []).map(o => el('option', { value: o, text: o, selected: cur[idx] === o })));
      sel.style.margin = '6px 0'; sel.style.fontFamily = "'Amiri Quran', serif"; sel.style.fontSize = '1.3rem';
      sel.addEventListener('change', () => { cur[idx] = sel.value; set([...cur]); });
      host.append(sel);
    });
  } else if (q.type === 'written_blank') {
    const inp = el('input', { type: 'text', value: typeof saved === 'string' ? saved : '', placeholder: 'اكتب الكلمة هنا…', autocomplete: 'off' });
    inp.style.fontFamily = "'Amiri Quran', serif"; inp.style.fontSize = '1.4rem';
    inp.addEventListener('input', () => set(inp.value));
    host.append(inp);
  } else if (q.type === 'write_3_ayahs') {
    const ta = el('textarea', { placeholder: 'اكتب الآيات هنا…' }); ta.value = typeof saved === 'string' ? saved : '';
    ta.style.fontFamily = "'Amiri Quran', serif"; ta.style.fontSize = '1.3rem';
    ta.addEventListener('input', () => set(ta.value));
    host.append(ta);
  } else if (q.type === 'matrix_order') {
    const n = (q.options || []).length;
    const order = Array.isArray(saved) ? [...saved] : new Array(n).fill('');
    const selects = [];
    (q.options || []).forEach((opt) => {
      const row = el('div', { class: 'qbox quran' }); row.style.fontSize = '1.25rem'; row.textContent = opt;
      const sel = el('select', {}, el('option', { value: '', text: '— الترتيب —' }), ...Array.from({ length: n }, (_, i) => el('option', { value: String(i + 1), text: String(i + 1), selected: order[i] === opt })));
      sel.addEventListener('change', () => {
        for (let i = 0; i < n; i++) if (order[i] === opt) order[i] = '';
        if (sel.value) order[parseInt(sel.value, 10) - 1] = opt;
        selects.forEach(({ s, o }) => { const idx = order.indexOf(o); s.value = idx >= 0 ? String(idx + 1) : ''; });
        set([...order]);
      });
      selects.push({ s: sel, o: opt });
      row.append(el('div', {}, sel));
      host.append(row);
    });
  } else if (q.type === 'matching') {
    const pairs = (saved && typeof saved === 'object' && !Array.isArray(saved)) ? { ...saved } : {};
    let activeLeft = null;
    const left = el('div', {}), right = el('div', {});
    const paint = () => {
      left.textContent = ''; right.textContent = '';
      const usedRights = new Set(Object.values(pairs));
      (q.leftItems || []).forEach(it => {
        const linked = pairs[it.id] !== undefined;
        const d = el('div', { class: 'pair' + (activeLeft === it.id ? ' active' : '') + (linked ? ' linked' : ''), text: it.text });
        d.addEventListener('click', () => { if (linked) { delete pairs[it.id]; set({ ...pairs }); activeLeft = null; } else activeLeft = it.id; paint(); });
        left.append(d);
      });
      (q.rightItems || []).forEach(it => {
        const linked = usedRights.has(it.id);
        const d = el('div', { class: 'pair' + (linked ? ' linked' : ''), text: it.text });
        d.addEventListener('click', () => {
          if (!activeLeft || linked) return;
          pairs[activeLeft] = it.id; activeLeft = null; set({ ...pairs }); paint();
        });
        right.append(d);
      });
    };
    paint();
    host.append(el('div', { class: 'row' }, left, right), el('p', { class: 'muted', text: 'اضغط بداية آية ثم نهايتها. اضغط على بداية مربوطة لفك الربط.' }));
  } else {
    host.append(el('div', { class: 'banner warn', text: 'هذا النوع من الأسئلة (تسجيل صوتي) غير مدعوم في المعمل التجريبي حالياً — يمكنك تخطيه.' }));
  }
}

/** True if the student has given any answer to this question (used only for the "unanswered" hint). */
export function hasAnswer(q, a) {
  if (a === undefined || a === null) return false;
  if (Array.isArray(a)) return a.some(x => x);
  if (typeof a === 'object') return Object.keys(a).length > 0;
  return String(a).trim() !== '';
}
