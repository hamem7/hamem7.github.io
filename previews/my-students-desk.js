/* =============================================================================
   معاينة «طلابي» — للكمبيوتر أولًا (بيانات تجريبية فقط، لا تمس المنصة)
   الصفحة تضبط window.MSX_VARIANT = 'a' (المهام + مساحة عمل واحدة) | 'b' (جدول واحد).
   كل نص باللغتين (T.ar / T.en) والاتجاه يتبع اللغة.
   ============================================================================= */
(function () {
'use strict';
const V = window.MSX_VARIANT || 'a';

const T = {
ar: {
  header_title: '🏆 رحلة إتقان القرآن', header_sub: 'منصة حمٓ', h_home: 'الرئيسية',
  pv_note: 'معاينة «طلابي» للكمبيوتر أولًا — بيانات تجريبية', pv_a: 'A: المهام + مساحة واحدة', pv_b: 'B: جدول واحد',
  pv_why: 'فكرة التصميم', pv_close: 'إغلاق',
  title: 'طلابي', sub: 'الخميس ١٢ نوفمبر · {n} طالبًا', add: 'طالب جديد', search: 'ابحث باسم الطالب…', eval: 'تقييم',
  /* A */
  a_side: 'المطلوب منك', t_att: 'سجّل حضور اليوم', t_memo: 'سجّل أين توقفوا', t_rep: 'أرسل تقارير الشهر',
  t_left: 'بقي {n}', t_done: 'تم ✓', t_lock: 'بعد تسجيل المواضع', all_btn: 'كل الطلاب',
  v_all_d: 'اضغط على اسم الطالب لترى كل ما يخصه.', v_att_d: 'اضغط «حاضر» أو «غائب». يُحفظ فورًا.',
  v_memo_d: 'اختر السورة واكتب رقم الآية ثم Enter — ينتقل للطالب التالي.', v_rep_d: 'أرسل التقرير لولي الأمر بضغطة.',
  back_all: 'كل الطلاب', finished: 'انتهت هذه المهمة ✓', next: 'المهمة التالية: {t}', done_grp: 'تم ({n})',
  /* B */
  f_all: 'الكل', f_today: 'حصص اليوم', f_memo: 'لم يُسجَّل موضعه', f_rep: 'تقرير جاهز للإرسال',
  c_student: 'الطالب', c_att: 'حضور اليوم', c_memo: 'أين توقف (نوفمبر)', c_rep: 'تقرير الشهر',
  no_session: 'لا حصة', wa: 'واتساب', not_rec: 'لم يُسجَّل', rec: 'سجّل', send: 'أرسل', after_memo: 'بعد تسجيل الموضع', sent: 'أُرسل',
  /* حالات */
  present: 'حاضر', absent: 'غائب', undo: 'تراجع', save: 'حفظ', ayah: 'آية',
  s_need_memo: 'ينتظر تسجيل موضعه', s_need_rep: 'تقريره جاهز للإرسال', s_ok: 'كل شيء مكتمل', s_today: 'حصته اليوم {t}',
  /* اللوح */
  p_pos: 'آخر موضع', p_month: 'تقرير نوفمبر', p_pts: 'النقاط', p_eval: 'ابدأ التقييم الآن',
  p_file: 'ملف الطالب', p_file_d: 'التقدّم والأوسمة وسجل التقييمات', p_memo: 'سجّل أين توقف', p_memo_d: 'السورة والآية',
  p_rep: 'تقرير الشهر', p_rep_d: 'واتساب لولي الأمر أو PDF', p_edit: 'تعديل البيانات', p_edit_d: 'الاسم والصف ورقم ولي الأمر',
  p_sched: 'أيام الحصص', p_sched_d: 'الأيام ومدة الحصة', p_hide: 'إخفاء الطالب', p_del: 'حذف نهائي', close: 'إغلاق',
  hidden: 'المخفيون (١)', tools: 'تصدير / استيراد',
  real: 'في المنصة الفعلية: ', r_add: 'تُفتح نافذة «طالب جديد» كما هي', r_eval: 'يبدأ تقييم {n}', r_file: 'يُفتح ملف {n}',
  r_edit: 'تُفتح نافذة تعديل {n}', r_wa: 'يُفتح واتساب برسالة تقرير {n}', r_pdf: 'يُنزَّل تقرير {n} PDF',
  r_sched: 'تُفتح أيام حصص {n}', r_hide: 'يُخفى {n}', r_del: 'يُطلب تأكيد حذف {n}', r_tool: 'تعمل الأداة كما هي اليوم',
  bad_ayah: 'رقم آية غير صحيح (١–{max})', saved: '✓ حُفظ'
},
en: {
  header_title: '🏆 Quran Mastery Journey', header_sub: 'Ham Platform', h_home: 'Home',
  pv_note: '"My Students" preview, desktop first — sample data', pv_a: 'A: Tasks + one workspace', pv_b: 'B: One table',
  pv_why: 'Design idea', pv_close: 'Close',
  title: 'My Students', sub: 'Thursday, 12 November · {n} students', add: 'New student', search: 'Search by student name…', eval: 'Evaluate',
  a_side: 'Your to-do', t_att: "Record today's attendance", t_memo: 'Record where they stopped', t_rep: "Send this month's reports",
  t_left: '{n} left', t_done: 'Done ✓', t_lock: 'After stop points', all_btn: 'All students',
  v_all_d: "Click a student's name to see everything about them.", v_att_d: 'Click "Present" or "Absent". Saved instantly.',
  v_memo_d: 'Pick the surah, type the ayah, press Enter — moves to the next student.', v_rep_d: 'Send the report to the parent in one click.',
  back_all: 'All students', finished: 'This task is finished ✓', next: 'Next task: {t}', done_grp: 'Done ({n})',
  f_all: 'All', f_today: "Today's sessions", f_memo: 'Stop point missing', f_rep: 'Report ready to send',
  c_student: 'Student', c_att: "Today's attendance", c_memo: 'Stop point (November)', c_rep: 'Monthly report',
  no_session: 'No session', wa: 'WhatsApp', not_rec: 'Not recorded', rec: 'Record', send: 'Send', after_memo: 'After stop point', sent: 'Sent',
  present: 'Present', absent: 'Absent', undo: 'Undo', save: 'Save', ayah: 'Ayah',
  s_need_memo: 'Stop point not recorded', s_need_rep: 'Report ready to send', s_ok: 'All complete', s_today: 'Session today {t}',
  p_pos: 'Last position', p_month: 'November report', p_pts: 'Points', p_eval: 'Start evaluation now',
  p_file: 'Student file', p_file_d: 'Progress, badges and history', p_memo: 'Record stop point', p_memo_d: 'Surah and ayah',
  p_rep: 'Monthly report', p_rep_d: 'WhatsApp to the parent or PDF', p_edit: 'Edit details', p_edit_d: 'Name, grade, parent number',
  p_sched: 'Session days', p_sched_d: 'Days and length', p_hide: 'Hide student', p_del: 'Delete permanently', close: 'Close',
  hidden: 'Hidden (1)', tools: 'Export / import',
  real: 'In the live platform: ', r_add: 'the usual "New student" window opens', r_eval: 'starts evaluating {n}', r_file: "opens {n}'s file",
  r_edit: "opens {n}'s edit window", r_wa: "opens WhatsApp with {n}'s report", r_pdf: "downloads {n}'s report as PDF",
  r_sched: "opens {n}'s session days", r_hide: 'hides {n}', r_del: 'asks to confirm deleting {n}', r_tool: 'the tool works as it does today',
  bad_ayah: 'Invalid ayah number (1–{max})', saved: '✓ Saved'
}};

const NOTES = {
ar: {
  a: ['الشاشة قسمان فقط: يمينًا «المطلوب منك» (ثلاث مهام لا أكثر)، ويسارًا مساحة عمل واحدة.',
      'مساحة العمل تعرض شيئًا واحدًا في كل مرة: كل الطلاب، أو مهمة واحدة تختارها. لا تبويبات ولا أرقام مكررة.',
      'كل مهمة تقول ماذا تفعل بجملة واحدة، وعند انتهائها تقترح المهمة التالية.',
      'الضغط على اسم أي طالب يفتح لوحًا جانبيًا بكل ما يخصه، والقائمة تبقى خلفه.',
      'على الجوال: المهام فوق، والمساحة تحتها — نفس الترتيب.'],
  b: ['كل شيء في جدول واحد: صف لكل طالب، وثلاثة أعمدة فقط للحالة: حضور اليوم · أين توقف · تقرير الشهر.',
      'الخلية تعرض الحالة بكلمة، والإجراء يظهر في نفس الخلية فقط عند الحاجة (سجّل / أرسل).',
      'فوق الجدول أربعة مرشّحات بأعداد واضحة لمن يريد رؤية المطلوب فقط.',
      'الضغط على اسم أي طالب يفتح لوحًا جانبيًا بكل ما يخصه.',
      'على الجوال: يتحول كل صف إلى بطاقة بثلاثة أسطر بالعناوين نفسها.']
},
en: {
  a: ['Only two parts: "Your to-do" (three tasks, no more) and one workspace.',
      'The workspace shows one thing at a time: all students, or the one task you picked. No tabs, no repeated numbers.',
      'Each task says what to do in one sentence and suggests the next task when finished.',
      "Clicking a student's name opens a side panel with everything about them; the list stays behind it.",
      'On mobile: tasks on top, the workspace below — same order.'],
  b: ['Everything in one table: a row per student and just three status columns: today\'s attendance · stop point · monthly report.',
      'A cell shows the status in a word; its action appears in the same cell only when needed (Record / Send).',
      'Above the table, four filters with clear counts for when you only want what is pending.',
      "Clicking a student's name opens a side panel with everything about them.",
      'On mobile: each row becomes a card with the same three labelled lines.']
}};

const SURAHS = [
  ['النبأ', 'An-Naba', 40], ['النازعات', 'An-Naziat', 46], ['عبس', 'Abasa', 42], ['التكوير', 'At-Takwir', 29],
  ['الملك', 'Al-Mulk', 30], ['القلم', 'Al-Qalam', 52], ['الحاقة', 'Al-Haqqah', 52], ['يس', 'Ya-Sin', 83],
  ['الجاثية', 'Al-Jathiyah', 37], ['الأحقاف', 'Al-Ahqaf', 35]
];
const mk = (id, ar, en, gar, gen, av, pos, memo, rep, today, att, pts) => ({ id, n: [ar, en], g: [gar, gen], av, pos, memo, rep, today, att, pts });
const ST = [
  mk(1, 'أحمد محمد علي', 'Ahmed Mohamed Ali', 'الرابع الابتدائي', 'Grade 4', '👦🏻', [0, 18], null, false, '4:00', null, 120),
  mk(2, 'يوسف خالد', 'Youssef Khaled', 'الأول الإعدادي', 'Grade 7', '👨🏻‍🦱', [4, 12], [4, 30], false, '5:00', 'p', 340),
  mk(3, 'مريم سعيد', 'Maryam Saeed', 'الثاني الابتدائي', 'Grade 2', '👧🏻', [3, 10], null, false, '6:00', null, 80),
  mk(4, 'عمر حسن', 'Omar Hassan', 'الخامس الابتدائي', 'Grade 5', '👲🏻', [6, 20], [6, 52], true, null, null, 210),
  mk(5, 'فاطمة عادل', 'Fatima Adel', 'الأول الثانوي', 'Grade 10', '🧕🏻', [9, 5], [9, 15], false, '7:30', null, 460),
  mk(6, 'ليلى منصور', 'Layla Mansour', 'الثالث الابتدائي', 'Grade 3', '👩🏻', [2, 1], null, false, null, null, 60),
  mk(7, 'عبد الله سامي', 'Abdullah Sami', 'السادس الابتدائي', 'Grade 6', '👦🏻', [5, 30], [5, 52], true, null, null, 280),
  mk(8, 'سارة إبراهيم', 'Sara Ibrahim', 'الثاني الإعدادي', 'Grade 8', '🧕🏻', [7, 40], [7, 60], false, null, null, 390),
  mk(9, 'حمزة طارق', 'Hamza Tarek', 'الأول الابتدائي', 'Grade 1', '👲🏻', [0, 1], null, false, null, null, 30),
  mk(10, 'نور الهدى', 'Nour Al-Huda', 'الرابع الابتدائي', 'Grade 4', '👧🏻', [1, 22], [1, 46], true, null, null, 175),
  mk(11, 'محمود رضا', 'Mahmoud Reda', 'الثالث الإعدادي', 'Grade 9', '👨🏻‍🦱', [8, 10], [8, 37], true, null, null, 520),
  mk(12, 'هبة الله وليد', 'Hebatullah Walid', 'الخامس الابتدائي', 'Grade 5', '👩🏻', [3, 1], null, false, null, null, 95)
];

const S = { lang: 'ar', q: '', panel: null, view: 'all', filter: 'all', edit: null, notes: false, flash: null, pmemo: false };
const LI = () => (S.lang === 'ar' ? 0 : 1);
const L = k => (T[S.lang][k] !== undefined ? T[S.lang][k] : k);
const F = (k, o) => L(k).replace(/\{(\w+)\}/g, (_, x) => (o[x] !== undefined ? o[x] : ''));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => (S.lang === 'ar' ? String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]) : String(n));
const nm = s => s.n[LI()];
const posTxt = p => (p ? `${SURAHS[p[0]][LI()]} ${num(p[1])}` : '—');
const time = t => (t ? (S.lang === 'ar' ? num(t) + ' م' : t + ' pm') : '');
const byId = id => ST.find(s => s.id === id);
const match = s => { const q = S.q.trim().toLowerCase(); return !q || nm(s).toLowerCase().includes(q); };

const P = d => `<svg class="msx-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC = {
  users: P('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.4c2.3 0 4 1.3 4.5 3.8"/>'),
  plus: P('<path d="M12 5v14M5 12h14"/>'), search: P('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/>'),
  cal: P('<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/><path d="m9 15 2 2 4-4"/>'),
  book: P('<path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5z"/>'),
  send: P('<path d="M21 3 10 14"/><path d="m21 3-7 18-4-7-7-4z"/>'), play: P('<path d="M7 5v14l11-7z"/>'),
  check: P('<path d="m5 12.5 4.5 4.5L19 7.5"/>'), x: P('<path d="M6 6l12 12M18 6 6 18"/>'),
  file: P('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>'),
  edit: P('<path d="M4 20h4L19 9l-4-4L4 16z"/>'), chev: P('<path d="m9 6 6 6-6 6"/>'),
  back: P('<path d="M15 6 9 12l6 6"/>'),
  wa: P('<path d="M4 20l1.3-3.8A8 8 0 1 1 8 19z"/><path d="M9 9.5c.3 2 2.3 4.2 4.5 4.6l1-1.2 2 .9c-.2 1.2-1.2 1.9-2.5 1.7C10.8 15 8.6 12.6 8.3 10.3 8.2 9 9 8 10 7.8l1 2-1 1"/>')
};

/* ---------- حالات مشتقة ---------- */
const today = () => ST.filter(s => s.today);
const left = { att: () => today().filter(s => !s.att).length, memo: () => ST.filter(s => !s.memo).length, rep: () => ST.filter(s => s.memo && !s.rep).length };
function mainState(s) {
  if (s.today && !s.att) return `<span class="st wait">${F('s_today', { t: time(s.today) })}</span>`;
  if (!s.memo) return `<span class="st wait">${L('s_need_memo')}</span>`;
  if (!s.rep) return `<span class="st wait">${L('s_need_rep')}</span>`;
  return `<span class="st ok">${L('s_ok')}</span>`;
}
function posEditor(s, scope) {
  const cur = s.memo || s.pos;
  return `<div class="pos" data-scope="${scope}"><select data-ps="${s.id}" aria-label="surah">${SURAHS.map((x, i) => `<option value="${i}"${i === cur[0] ? ' selected' : ''}>${esc(x[LI()])}</option>`).join('')}</select>
    <input type="number" inputmode="numeric" min="1" data-pa="${s.id}" placeholder="${L('ayah')}" aria-label="${L('ayah')}">
    <button type="button" class="b em" data-psave="${s.id}">${L('save')}</button></div>`;
}
const whoBtn = (s, extra = '') => `<button type="button" class="who" data-panel="${s.id}"><span class="ava">${s.av}</span><span class="who-t"><b>${esc(nm(s))}</b><small>${extra || esc(s.g[LI()])}</small></span></button>`;
const topHtml = () => `<div class="card top">
    <span class="top-badge">${IC.users}</span>
    <div class="top-t"><h1>${L('title')}</h1><p>${F('sub', { n: num(ST.length) })}</p></div>
    <label class="search">${IC.search}<input type="search" id="q" value="${esc(S.q)}" placeholder="${L('search')}"></label>
    <button type="button" class="btn-add" data-real="r_add">${IC.plus}<span>${L('add')}</span></button>
  </div>`;
const footLinks = () => `<div class="foot-links"><button type="button" data-real="r_tool">${L('hidden')}</button><button type="button" data-real="r_tool">${L('tools')}</button></div>`;

/* ---------- A: المهام + مساحة عمل واحدة ---------- */
const TASKS = [['att', 'cal', 't_att'], ['memo', 'book', 't_memo'], ['rep', 'send', 't_rep']];
function renderA() {
  const v = S.view;
  const side = `<aside class="card a-side">
    <h2>${L('a_side')}</h2>
    ${TASKS.map(([k, ic, t]) => {
      const n = left[k](), lock = k === 'rep' && !n && left.memo();
      return `<button type="button" class="task${v === k ? ' on' : ''}${!n ? ' done' : ''}" data-view="${k}">
        <span class="t-ic">${IC[ic]}</span><span class="t-tx"><b>${L(t)}</b><small>${n ? F('t_left', { n: num(n) }) : lock ? L('t_lock') : L('t_done')}</small></span>${n ? `<em>${num(n)}</em>` : ''}</button>`;
    }).join('')}
    <hr>
    <button type="button" class="task all${v === 'all' ? ' on' : ''}" data-view="all"><span class="t-ic">${IC.users}</span><span class="t-tx"><b>${L('all_btn')}</b><small>${num(ST.length)}</small></span></button>
  </aside>`;
  let head, body = '', after = '';
  if (v === 'all') {
    head = [L('all_btn'), L('v_all_d')];
    body = ST.filter(match).map(s => `<div class="w-row${S.flash === s.id ? ' flash' : ''}">${whoBtn(s)}<div class="w-mid">${mainState(s)}</div>
      <div class="w-act"><button type="button" class="b line" data-real="r_eval" data-who="${s.id}">${IC.play}${L('eval')}</button><button type="button" class="icon-b flip" data-panel="${s.id}" aria-label="more">${IC.chev}</button></div></div>`).join('');
  } else {
    const t = TASKS.find(x => x[0] === v);
    head = [L(t[2]), L('v_' + v + '_d')];
    let pend = [], done = [];
    if (v === 'att') { pend = today().filter(s => !s.att); done = today().filter(s => s.att); }
    if (v === 'memo') { pend = ST.filter(s => !s.memo); done = ST.filter(s => s.memo); }
    if (v === 'rep') { pend = ST.filter(s => s.memo && !s.rep); done = ST.filter(s => s.rep); }
    pend = pend.filter(match);
    body = pend.map(s => {
      let act = '', sub = '';
      if (v === 'att') { sub = time(s.today); act = `<button type="button" class="b ok" data-att="${s.id}:p">${IC.check}${L('present')}</button><button type="button" class="b no" data-att="${s.id}:a">${IC.x}${L('absent')}</button>`; }
      if (v === 'memo') { sub = `${L('p_pos')}: ${posTxt(s.pos)}`; act = posEditor(s, 'w'); }
      if (v === 'rep') { sub = `${posTxt(s.pos)} ${S.lang === 'ar' ? '←' : '→'} ${posTxt(s.memo)}`; act = `<button type="button" class="b em" data-rep="${s.id}:wa">${IC.wa}${L('wa')}</button><button type="button" class="b line" data-rep="${s.id}:pdf">PDF</button>`; }
      return `<div class="w-row">${whoBtn(s, sub)}<div class="w-act">${act}</div></div>`;
    }).join('');
    if (!pend.length) {
      const nx = TASKS.find(x => left[x[0]]() > 0);
      body = `<div class="w-done"><span>${IC.check}</span><b>${L('finished')}</b>${nx ? `<button type="button" class="b gold" data-view="${nx[0]}">${F('next', { t: L(nx[2]) })}</button>` : ''}</div>`;
    }
    if (done.length) after = `<details class="w-grp"><summary>${F('done_grp', { n: num(done.length) })}</summary>${done.map(s => `<div class="w-row quiet">${whoBtn(s, v === 'memo' ? posTxt(s.memo) : '')}<div class="w-act">${v === 'att' ? `<span class="st ${s.att === 'p' ? 'ok' : 'bad'}">${s.att === 'p' ? L('present') : L('absent')}</span><button type="button" class="b ghost" data-att="${s.id}:">${L('undo')}</button>` : `<span class="st ok">${v === 'rep' ? L('sent') : L('saved').replace('✓ ', '')}</span>`}</div></div>`).join('')}</details>`;
  }
  return `${topHtml()}<div class="a-layout">${side}<section class="card a-work">
    <header class="w-head">${v !== 'all' ? `<button type="button" class="icon-b flip back" data-view="all" aria-label="${L('back_all')}">${IC.back}</button>` : ''}<div><h2>${head[0]}</h2><p>${head[1]}</p></div></header>
    <div class="w-list">${body}</div>${after}</section></div>${footLinks()}`;
}

/* ---------- B: جدول واحد ---------- */
function renderB() {
  const fl = { all: ST.length, today: today().length, memo: left.memo(), rep: left.rep() };
  const pass = s => S.filter === 'all' || (S.filter === 'today' && s.today) || (S.filter === 'memo' && !s.memo) || (S.filter === 'rep' && s.memo && !s.rep);
  const rows = ST.filter(s => match(s) && pass(s)).map(s => {
    const att = !s.today ? `<span class="st mute">${L('no_session')}</span>`
      : s.att ? `<span class="st ${s.att === 'p' ? 'ok' : 'bad'}">${s.att === 'p' ? L('present') : L('absent')}</span><button type="button" class="b ghost hov" data-att="${s.id}:">${L('undo')}</button>`
      : `<span class="t-time">${time(s.today)}</span><button type="button" class="b ok sm" data-att="${s.id}:p" title="${L('present')}">${IC.check}${L('present')}</button><button type="button" class="b no sm" data-att="${s.id}:a" title="${L('absent')}">${IC.x}</button>`;
    const memo = S.edit === s.id ? posEditor(s, 't')
      : s.memo ? `<span class="st ok">${posTxt(s.memo)}</span><button type="button" class="b ghost hov" data-edit="${s.id}">${IC.edit}</button>`
      : `<span class="st wait">${L('not_rec')}</span><button type="button" class="b link" data-edit="${s.id}">${L('rec')}</button>`;
    const rep = s.rep ? `<span class="st ok">${L('sent')}</span>`
      : s.memo ? `<button type="button" class="b em sm" data-rep="${s.id}:wa">${IC.wa}${L('send')}</button><button type="button" class="b ghost" data-rep="${s.id}:pdf">PDF</button>`
      : `<span class="st mute">${L('after_memo')}</span>`;
    return `<tr class="${S.flash === s.id ? 'flash' : ''}">
      <td class="c-who">${whoBtn(s)}</td>
      <td data-l="${L('c_att')}"><div class="cell">${att}</div></td>
      <td data-l="${L('c_memo')}"><div class="cell">${memo}</div></td>
      <td data-l="${L('c_rep')}"><div class="cell">${rep}</div></td>
      <td class="c-act"><div class="acts"><button type="button" class="b line" data-real="r_eval" data-who="${s.id}">${IC.play}${L('eval')}</button><button type="button" class="icon-b flip" data-panel="${s.id}" aria-label="more">${IC.chev}</button></div></td></tr>`;
  }).join('');
  return `${topHtml()}
  <div class="b-filters" role="tablist">${[['all', 'f_all'], ['today', 'f_today'], ['memo', 'f_memo'], ['rep', 'f_rep']].map(([k, l]) =>
    `<button type="button" role="tab" aria-selected="${S.filter === k}" class="${S.filter === k ? 'on' : ''}${k !== 'all' && fl[k] ? ' has' : ''}" data-filter="${k}">${L(l)}<em>${num(fl[k])}</em></button>`).join('')}</div>
  <div class="card b-wrap"><table class="b-table">
    <thead><tr><th>${L('c_student')}</th><th>${L('c_att')}</th><th>${L('c_memo')}</th><th>${L('c_rep')}</th><th></th></tr></thead>
    <tbody>${rows || `<tr><td colspan="5" class="muted" style="text-align:center;padding:30px">—</td></tr>`}</tbody></table></div>${footLinks()}`;
}

/* ---------- لوح الطالب ---------- */
function panelHtml(s) {
  const items = [['file', 'p_file', 'p_file_d', 'r_file'], ['book', 'p_memo', 'p_memo_d', 'memo'], ['wa', 'p_rep', 'p_rep_d', s.memo ? 'r_wa' : 'memo'],
                 ['edit', 'p_edit', 'p_edit_d', 'r_edit'], ['cal', 'p_sched', 'p_sched_d', 'r_sched']];
  return `<div class="msx-panel" role="dialog" aria-modal="true" aria-label="${esc(nm(s))}">
    <div class="p-head"><span class="ava">${s.av}</span><div><b>${esc(nm(s))}</b><small>${esc(s.g[LI()])}</small></div><button type="button" class="p-close" data-close="1" aria-label="${L('close')}">${IC.x}</button></div>
    <div class="p-facts"><div><span>${L('p_pos')}</span><b>${posTxt(s.memo || s.pos)}</b></div><div><span>${L('p_month')}</span>${s.rep ? `<b>${L('sent')} ✓</b>` : s.memo ? `<b>${L('s_need_rep')}</b>` : `<b>${L('s_need_memo')}</b>`}</div><div><span>${L('p_pts')}</span><b>${num(s.pts)} ★</b></div></div>
    <button type="button" class="p-main" data-real="r_eval" data-who="${s.id}">${IC.play}${L('p_eval')}</button>
    ${S.pmemo ? `<div class="p-memo">${posEditor(s, 'p').replace('class="pos"', 'class="pos" style="display:contents"')}</div>` : ''}
    <div class="p-list">${items.map(([ic, t, d, act]) => `<button type="button" ${act === 'memo' ? `data-pmemo="1"` : `data-real="${act}" data-who="${s.id}"`}>${IC[ic]}<span>${L(t)}<small>${L(d)}</small></span>${IC.chev.replace('msx-ic', 'msx-ic ch')}</button>`).join('')}</div>
    <div class="p-foot"><button type="button" data-real="r_hide" data-who="${s.id}">${L('p_hide')}</button><button type="button" class="del" data-real="r_del" data-who="${s.id}">${L('p_del')}</button></div>
  </div>`;
}

/* ---------- الإطار ---------- */
const root = document.getElementById('app-root');
let toastT;
function toast(msg) { const el = document.getElementById('toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2600); }
function syncChrome() {
  const h = document.documentElement; h.lang = S.lang; h.dir = S.lang === 'ar' ? 'rtl' : 'ltr';
  document.getElementById('header-title').textContent = L('header_title');
  document.getElementById('top-student-name').textContent = L('header_sub');
  document.getElementById('hdr-home').textContent = L('h_home');
  document.querySelectorAll('#lang-toggle-btn .lb-opt').forEach((e, i) => e.classList.toggle('is-on', (i === 0) === (S.lang === 'ar')));
  document.getElementById('pvBar').innerHTML = `<span>${esc(L('pv_note'))}</span><span class="pv-sw">
    <a href="my-students-a-tasks.html" class="${V === 'a' ? 'on' : ''}">${L('pv_a')}</a><a href="my-students-b-table.html" class="${V === 'b' ? 'on' : ''}">${L('pv_b')}</a>
    <button type="button" data-notes="1">${S.notes ? L('pv_close') : L('pv_why')}</button></span>`;
  const nb = document.getElementById('pvNotes');
  nb.hidden = !S.notes;
  if (S.notes) nb.innerHTML = `<h4>${esc(V === 'a' ? L('pv_a') : L('pv_b'))}</h4><ul>${NOTES[S.lang][V].map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
}
function render(keepFocus) {
  syncChrome();
  const y = window.scrollY;
  root.innerHTML = `<div id="msx" class="msx-${V}">${V === 'a' ? renderA() : renderB()}</div>`;
  window.scrollTo(0, y);
  if (keepFocus) { const i = document.getElementById('q'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
  const bg = document.getElementById('panelBg');
  if (S.panel) { bg.hidden = false; bg.innerHTML = panelHtml(byId(S.panel)); } else { bg.hidden = true; bg.innerHTML = ''; }
  S.flash = null;
}
function saveMemo(id, scope) {
  const sc = document.querySelector(`.pos[data-scope="${scope}"] [data-pa="${id}"]`) ? document.querySelector(`.pos[data-scope="${scope}"]`) : null;
  const box = scope === 'p' ? document.getElementById('panelBg') : (sc || document);
  const sel = box.querySelector(`[data-ps="${id}"]`), inp = box.querySelector(`[data-pa="${id}"]`);
  if (!sel || !inp) return;
  const si = +sel.value, a = +inp.value, max = SURAHS[si][2];
  if (!a || a < 1 || a > max) { toast(F('bad_ayah', { max: num(max) })); inp.focus(); return; }
  byId(id).memo = [si, a]; S.edit = null; S.pmemo = false; S.flash = id; toast(L('saved'));
  render();
  if (scope === 'w') { const next = document.querySelector('.w-list [data-pa]'); if (next) next.focus(); }
}
const scopeOf = el => (el.closest('.pos') && el.closest('.pos').dataset.scope) || 'w';

document.addEventListener('click', e => {
  if (e.target.id === 'panelBg') { S.panel = null; S.pmemo = false; return render(); }
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset;
  if (t.id === 'lang-toggle-btn') { S.lang = S.lang === 'ar' ? 'en' : 'ar'; return render(); }
  if (t.id === 'theme-toggle-btn') { window.DHTheme && window.DHTheme.cycle(); return paintTheme(); }
  if (t.id === 'header-home-btn' || t.id === 'header-account-btn') return toast(L('real') + t.title);
  if (d.notes) { S.notes = !S.notes; return syncChrome(); }
  if (d.close) { S.panel = null; S.pmemo = false; return render(); }
  if (d.panel) { S.panel = +d.panel; S.pmemo = false; return render(); }
  if (d.pmemo) { S.pmemo = true; render(); const i = document.querySelector('#panelBg [data-pa]'); if (i) i.focus(); return; }
  if (d.real) { const s = d.who ? byId(+d.who) : null; return toast(L('real') + F(d.real, { n: s ? nm(s) : '' })); }
  if (d.view) { S.view = d.view; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  if (d.filter) { S.filter = d.filter; S.edit = null; return render(); }
  if (d.edit) { S.edit = +d.edit; render(); const i = document.querySelector('.b-table [data-pa]'); if (i) i.focus(); return; }
  if (d.att !== undefined) { const [id, v] = d.att.split(':'); byId(+id).att = v || null; S.flash = +id; return render(); }
  if (d.psave) return saveMemo(+d.psave, scopeOf(t));
  if (d.rep) { const [id, k] = d.rep.split(':'); const s = byId(+id); s.rep = true; S.flash = +id; toast(L('real') + F(k === 'wa' ? 'r_wa' : 'r_pdf', { n: nm(s) })); return render(); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.pa) saveMemo(+e.target.dataset.pa, scopeOf(e.target));
  if (e.key === 'Escape') { if (S.panel) { S.panel = null; S.pmemo = false; render(); } else if (S.edit) { S.edit = null; render(); } }
});
document.addEventListener('input', e => { if (e.target.id === 'q') { S.q = e.target.value; render(true); } });

const TI = { auto: '<path d="M12 3a9 9 0 1 0 0 18V3z" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="9"/>', light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', dark: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>' };
function paintTheme() { const p = window.DHTheme ? window.DHTheme.get() : 'auto'; const s = document.querySelector('#theme-toggle-btn svg'); if (s) s.innerHTML = TI[p] || TI.auto; }
document.addEventListener('app-theme-changed', paintTheme);
try { const u = new URLSearchParams(location.search); if (u.get('lang') === 'en') S.lang = 'en'; if (u.get('view')) S.view = u.get('view'); if (u.get('filter')) S.filter = u.get('filter'); if (u.get('panel')) S.panel = +u.get('panel'); } catch (e) { /* */ }
paintTheme(); render();
})();
