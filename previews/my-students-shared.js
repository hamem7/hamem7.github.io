/* =============================================================================
   معاينة «طلابي» — منطق مشترك للنموذجين (بيانات تجريبية فقط، لا تمس المنصة)
   الصفحة تضبط window.MSX_VARIANT = 'a' | 'b' قبل تحميل هذا الملف.
   كل نص هنا باللغتين (T.ar / T.en) والاتجاه يتبع اللغة.
   ============================================================================= */
(function () {
'use strict';
const V = window.MSX_VARIANT || 'a';

/* ---------- النصوص ---------- */
const T = {
ar: {
  header_title: '🏆 رحلة إتقان القرآن', header_sub: 'منصة حمٓ', h_home: 'الرئيسية',
  pv_note: 'معاينة لركن «طلابي» — بيانات تجريبية، لا تمس المنصة الحالية',
  pv_a: 'النموذج A: لوحة اليوم', pv_b: 'النموذج B: قائمة واحدة بأوضاع', pv_why: 'لماذا هذا التصميم؟', pv_close: 'إغلاق',
  title: 'طلابي', today_line: 'الخميس ١٢ نوفمبر', n_students: '{n} طلاب', add: 'طالب جديد',
  search: 'ابحث باسم الطالب…', eval: 'تقييم',
  /* A */
  j_today: 'اليوم', j_month: 'هذا الشهر', j_all: 'كل الطلاب',
  z_today_t: 'حصص اليوم', z_today_d: 'اضغط «حاضر» أو «غائب» — يُحفظ فورًا.',
  z_month_t: 'مهام نوفمبر', z_month_d: 'خطوتان بالترتيب، وكل شيء هنا بلا فتح شاشة أخرى.',
  z_all_t: 'كل الطلاب', z_all_d: 'اضغط على أي طالب لترى كل ما يمكنك فعله معه.',
  present: 'حاضر', absent: 'غائب', undo: 'تراجع', marked_p: 'حاضر ✓', marked_a: 'غائب',
  no_today: 'لا حصص اليوم 🌿',
  step1: 'أين توقف كل طالب؟', step1_d: 'اختر السورة واكتب الآية — يُحفظ تلقائيًا.',
  step2: 'أرسل تقرير الشهر', step2_d: 'يُفتح بعد تسجيل موضع الطالب.',
  done_n: 'تم: {names}', all_done: 'تم الجميع ✓', locked_n: '{n} بانتظار الخطوة ١',
  wa: 'واتساب', pdf: 'PDF', send_all: 'أرسل الجاهزة كلها ({n})', saved: '✓ حُفظ',
  hidden_n: 'طلاب مخفيون ({n})', tools: 'أدوات: تصدير واستيراد', exp: '📥 تصدير الطلاب', imp: '📤 استيراد الطلاب',
  /* B */
  m_roster: 'الطلاب', m_att: 'الحضور', m_memo: 'أين توقفوا؟', m_rep: 'التقارير',
  g_roster: 'اضغط على الطالب لكل إجراءاته، أو «تقييم» للبدء مباشرة.',
  g_att: 'طلاب حصص اليوم أولًا — ضغطة واحدة لكل طالب.',
  g_memo: 'لكل طالب: السورة ثم الآية. يُحفظ وينتقل للتالي تلقائيًا.',
  g_rep: 'التقرير جاهز لمن سُجّل موضعه — أرسله لولي الأمر.',
  prog: '{d} من {t}', grp_done: 'تم ({n})', grp_off: 'ليست لهم حصة اليوم ({n})', grp_locked: 'سجّل موضعهم أولًا ({n})',
  go_memo: 'سجّل موضعه', next_mode: 'أحسنت! الخطوة التالية: {m}', cancelled: 'أُلغيت',
  /* حالات */
  s_memo_ok: 'الموضع ✓', s_memo_wait: 'الموضع ⏳', s_rep_ok: 'التقرير ✓', s_rep_no: 'التقرير —', s_today: 'حصة {t}',
  s_weak: '{n} أخطاء للعلاج',
  /* الورقة */
  sh_pos: 'آخر موضع', sh_month: 'هذا الشهر', sh_points: 'النقاط', sh_eval: 'ابدأ التقييم الآن',
  sh_file: 'ملف الطالب', sh_file_d: 'التقدم والأوسمة والسجل', sh_edit: 'تعديل البيانات', sh_edit_d: 'الاسم والصف والحفظ',
  sh_memo: 'سجّل أين توقف', sh_memo_d: 'سورة وآية', sh_rep: 'تقرير الشهر', sh_rep_d: 'واتساب أو PDF',
  sh_sched: 'أيام الحصص', sh_sched_d: 'الأيام ومدة الحصة', sh_weak: 'علاج الأخطاء', sh_weak_d: '{n} أخطاء',
  sh_hide: '🙈 إخفاء', sh_del: '🗑️ حذف نهائي', close: 'إغلاق', ayah_ph: 'آية',
  real: 'في المنصة الفعلية: ', r_add: 'تُفتح نافذة «طالب جديد» كما هي', r_eval: 'يبدأ تقييم {n}', r_file: 'يُفتح ملف {n}',
  r_edit: 'تُفتح نافذة تعديل بيانات {n}', r_wa: 'يُفتح واتساب برسالة تقرير {n} لولي الأمر', r_pdf: 'يُنزَّل تقرير {n} PDF',
  r_sched: 'تُفتح أيام حصص {n}', r_weak: 'يبدأ علاج أخطاء {n}', r_hide: 'يُخفى {n}', r_del: 'يُطلب تأكيد حذف {n}', r_tool: 'تعمل الأداة كما هي اليوم',
  bad_ayah: 'رقم آية غير صحيح (1–{max})', sent_all: '✓ أُرسلت {n} تقارير (معاينة)'
},
en: {
  header_title: '🏆 Quran Mastery Journey', header_sub: 'Ham Platform', h_home: 'Home',
  pv_note: 'Preview of the "My Students" corner — sample data, does not touch the live platform',
  pv_a: 'Model A: Today board', pv_b: 'Model B: One list, task modes', pv_why: 'Why this design?', pv_close: 'Close',
  title: 'My Students', today_line: 'Thursday, 12 November', n_students: '{n} students', add: 'New student',
  search: 'Search by student name…', eval: 'Evaluate',
  j_today: 'Today', j_month: 'This month', j_all: 'All students',
  z_today_t: "Today's sessions", z_today_d: 'Tap "Present" or "Absent" — saved instantly.',
  z_month_t: 'November tasks', z_month_d: 'Two steps in order, all right here without opening another screen.',
  z_all_t: 'All students', z_all_d: 'Tap any student to see everything you can do with them.',
  present: 'Present', absent: 'Absent', undo: 'Undo', marked_p: 'Present ✓', marked_a: 'Absent',
  no_today: 'No sessions today 🌿',
  step1: 'Where did each student stop?', step1_d: 'Pick the surah and type the ayah — saved automatically.',
  step2: "Send this month's report", step2_d: "Unlocks once the student's position is recorded.",
  done_n: 'Done: {names}', all_done: 'Everyone done ✓', locked_n: '{n} waiting for step 1',
  wa: 'WhatsApp', pdf: 'PDF', send_all: 'Send all ready ({n})', saved: '✓ Saved',
  hidden_n: 'Hidden students ({n})', tools: 'Tools: export & import', exp: '📥 Export students', imp: '📤 Import students',
  m_roster: 'Students', m_att: 'Attendance', m_memo: 'Stop points', m_rep: 'Reports',
  g_roster: 'Tap a student for all their actions, or "Evaluate" to start right away.',
  g_att: "Today's students first — one tap each.",
  g_memo: 'For each student: surah, then ayah. Saves and moves to the next automatically.',
  g_rep: 'The report is ready for anyone whose position is recorded — send it to the parent.',
  prog: '{d} of {t}', grp_done: 'Done ({n})', grp_off: 'No session today ({n})', grp_locked: 'Record their position first ({n})',
  go_memo: 'Record position', next_mode: 'Well done! Next step: {m}', cancelled: 'Cancelled',
  s_memo_ok: 'Position ✓', s_memo_wait: 'Position ⏳', s_rep_ok: 'Report ✓', s_rep_no: 'Report —', s_today: 'Session {t}',
  s_weak: '{n} mistakes to fix',
  sh_pos: 'Last position', sh_month: 'This month', sh_points: 'Points', sh_eval: 'Start evaluation now',
  sh_file: 'Student file', sh_file_d: 'Progress, badges, history', sh_edit: 'Edit details', sh_edit_d: 'Name, grade, memorization',
  sh_memo: 'Record stop point', sh_memo_d: 'Surah and ayah', sh_rep: 'Monthly report', sh_rep_d: 'WhatsApp or PDF',
  sh_sched: 'Session days', sh_sched_d: 'Days and length', sh_weak: 'Fix mistakes', sh_weak_d: '{n} mistakes',
  sh_hide: '🙈 Hide', sh_del: '🗑️ Delete permanently', close: 'Close', ayah_ph: 'Ayah',
  real: 'In the live platform: ', r_add: 'the usual "New student" window opens', r_eval: 'starts evaluating {n}', r_file: "opens {n}'s file",
  r_edit: "opens {n}'s edit window", r_wa: "opens WhatsApp with {n}'s report for the parent", r_pdf: "downloads {n}'s report as PDF",
  r_sched: "opens {n}'s session days", r_weak: "starts fixing {n}'s mistakes", r_hide: 'hides {n}', r_del: 'asks to confirm deleting {n}', r_tool: 'the tool works as it does today',
  bad_ayah: 'Invalid ayah number (1–{max})', sent_all: '✓ {n} reports sent (preview)'
}};

/* ملاحظات الخبير لكل نموذج */
const NOTES = {
ar: {
  a: { t: 'النموذج A — «لوحة اليوم»: صفحة واحدة بلا تبويبات', l: [
    'لا شيء مخفي خلف تبويب: ثلاث مناطق واضحة بالترتيب الذي يحتاجه المعلم فعلًا — اليوم ← هذا الشهر ← كل الطلاب.',
    'شريط قفز ثابت أعلى الصفحة يبيّن العدّاد المتبقي لكل منطقة ويقفز إليها بضغطة.',
    'الحضور وموضع الحفظ والتقرير تُنجز في مكانها؛ لا تُفتح شاشة جديدة إلا للتقييم أو ملف الطالب.',
    'صف الطالب: الاسم + حالتان مختصرتان + زر «تقييم». أي ضغطة على الصف تفتح «ورقة الطالب» بكل إجراءاته (بدل ثلاث أزرار و⋯ في كل صف).',
    'ألغينا: عنوان «المطلوب الآن» المكرر، شريط الأرقام المكرر، زر الرجوع (الترويسة والشريط السفلي يكفيان).'
  ]},
  b: { t: 'النموذج B — «قائمة واحدة بأوضاع»: نفس الطلاب، والمهمة تتغير', l: [
    'قائمة الطلاب ثابتة دائمًا؛ يختار المعلم «ماذا أفعل الآن؟» من أربعة أوضاع: الطلاب · الحضور · أين توقفوا؟ · التقارير.',
    'كل وضع يغيّر أدوات البطاقة فقط، مع سطر إرشاد واحد وشريط تقدّم — فالمعلم يعرف دائمًا أين هو وكم بقي.',
    'المُنجَز ينزل تلقائيًا إلى مجموعة «تم»، وعند الانتهاء يقترح الوضع التالي (الحفظ ← التقارير).',
    'نقطة ذهبية على الوضع الذي فيه عمل متبقٍ، فلا يحتاج المعلم أن يبحث.',
    'الأفضل للمعلم الذي يعمل «دفعة واحدة» على كل الطلاب (مثلًا آخر الشهر).'
  ]},
  cmp: { h: ['المهمة', 'الحالي', 'A', 'B'], r: [
    ['حضور طالب اليوم', '٢–٣', '١', '٢'], ['تسجيل موضع طالب', '٤ + شاشة', '٢', '٣'],
    ['تقرير واتساب لطالب', '٤ + شاشة', '١', '٢'], ['بدء تقييم طالب', '١', '١', '١'], ['تعديل بيانات طالب', '١', '٢', '٢']
  ], cap: 'عدد الضغطات من لحظة فتح «طلابي»' }
},
en: {
  a: { t: 'Model A — "Today board": one page, no tabs', l: [
    'Nothing hidden behind tabs: three clear zones in the order a teacher actually needs — Today → This month → All students.',
    'A sticky jump bar shows what is left in each zone and jumps to it with one tap.',
    'Attendance, stop point and report are done in place; a new screen opens only for evaluation or the student file.',
    'Student row: name + two short statuses + an "Evaluate" button. Tapping the row opens the "student sheet" with every action (instead of three buttons and ⋯ on every row).',
    'Removed: the duplicated "Needed now" banner, the duplicated numbers strip and the back button (header and bottom bar are enough).'
  ]},
  b: { t: 'Model B — "One list, task modes": same students, the task changes', l: [
    'The student list never changes; the teacher picks "what am I doing now?" from four modes: Students · Attendance · Stop points · Reports.',
    'Each mode only changes the card tools, with one guide line and a progress bar — the teacher always knows where they are and what is left.',
    'Finished students drop into a "Done" group automatically, and when finished it suggests the next mode (stop points → reports).',
    'A gold dot marks modes with pending work, so there is nothing to search for.',
    'Best for teachers who work "in batches" across all students (e.g. at month end).'
  ]},
  cmp: { h: ['Task', 'Current', 'A', 'B'], r: [
    ["Mark today's attendance", '2–3', '1', '2'], ["Record a student's stop point", '4 + screen', '2', '3'],
    ["Send a student's WhatsApp report", '4 + screen', '1', '2'], ['Start an evaluation', '1', '1', '1'], ["Edit a student's details", '1', '2', '2']
  ], cap: 'Taps from the moment "My Students" opens' }
}};

/* ---------- البيانات التجريبية ---------- */
const SURAHS = [
  ['النبأ', 'An-Naba', 40], ['النازعات', 'An-Naziat', 46], ['عبس', 'Abasa', 42], ['التكوير', 'At-Takwir', 29],
  ['الملك', 'Al-Mulk', 30], ['القلم', 'Al-Qalam', 52], ['الحاقة', 'Al-Haqqah', 52], ['يس', 'Ya-Sin', 83],
  ['الجاثية', 'Al-Jathiyah', 37], ['الأحقاف', 'Al-Ahqaf', 35]
];
const ST = [
  { id: 1, n: ['أحمد محمد علي', 'Ahmed Mohamed Ali'], g: ['الرابع الابتدائي', 'Grade 4'], av: '👦🏻', pos: [0, 18], memo: null, rep: false, today: '4:00', att: null, pts: 120, weak: 0 },
  { id: 2, n: ['يوسف خالد', 'Youssef Khaled'], g: ['الأول الإعدادي', 'Grade 7'], av: '👨🏻‍🦱', pos: [4, 12], memo: [4, 30], rep: false, today: '5:00', att: 'p', pts: 340, weak: 3 },
  { id: 3, n: ['مريم سعيد', 'Maryam Saeed'], g: ['الثاني الابتدائي', 'Grade 2'], av: '👧🏻', pos: [3, 10], memo: null, rep: false, today: '6:00', att: null, pts: 80, weak: 0 },
  { id: 4, n: ['عمر حسن', 'Omar Hassan'], g: ['الخامس الابتدائي', 'Grade 5'], av: '👲🏻', pos: [6, 20], memo: [6, 52], rep: true, today: null, att: null, pts: 210, weak: 0 },
  { id: 5, n: ['فاطمة عادل', 'Fatima Adel'], g: ['الأول الثانوي', 'Grade 10'], av: '🧕🏻', pos: [9, 5], memo: [9, 15], rep: false, today: '7:30', att: null, pts: 460, weak: 1 },
  { id: 6, n: ['ليلى منصور', 'Layla Mansour'], g: ['الثالث الابتدائي', 'Grade 3'], av: '👩🏻', pos: [2, 1], memo: null, rep: false, today: null, att: null, pts: 60, weak: 0 }
];
const HIDDEN = 1;

const S = { lang: 'ar', q: '', sheet: null, mode: 'roster', notes: false, flash: null, jump: 'today' };
const LI = () => (S.lang === 'ar' ? 0 : 1);
const L = k => (T[S.lang][k] !== undefined ? T[S.lang][k] : k);
const F = (k, o) => L(k).replace(/\{(\w+)\}/g, (_, x) => (o[x] !== undefined ? o[x] : ''));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => (S.lang === 'ar' ? String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]) : String(n));
const nm = s => s.n[LI()];
const sName = i => SURAHS[i][LI()];
const posTxt = p => (p ? `${sName(p[0])} ${num(p[1])}` : '—');
const time = t => (t ? (S.lang === 'ar' ? num(t) + ' م' : t + ' pm') : '');
const byId = id => ST.find(s => s.id === id);

/* ---------- الأيقونات ---------- */
const P = d => `<svg class="msx-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC = {
  users: P('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.4c2.3 0 4 1.3 4.5 3.8"/>'),
  plus: P('<path d="M12 5v14M5 12h14"/>'),
  search: P('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/>'),
  cal: P('<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/><path d="m9 15 2 2 4-4"/>'),
  book: P('<path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5z"/>'),
  send: P('<path d="M21 3 10 14"/><path d="m21 3-7 18-4-7-7-4z"/>'),
  play: P('<path d="M7 5v14l11-7z"/>'),
  check: P('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  x: P('<path d="M6 6l12 12M18 6 6 18"/>'),
  file: P('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>'),
  edit: P('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
  clock: P('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  lock: P('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  chev: P('<path d="m9 6 6 6-6 6"/>'),
  wa: P('<path d="M4 20l1.3-3.8A8 8 0 1 1 8 19z"/><path d="M9 9.5c.3 2 2.3 4.2 4.5 4.6l1-1.2 2 .9c-.2 1.2-1.2 1.9-2.5 1.7C10.8 15 8.6 12.6 8.3 10.3 8.2 9 9 8 10 7.8l1 2-1 1"/>'),
  heal: P('<path d="M12 20s-7-4.4-7-9.6A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7 2.4C19 15.6 12 20 12 20z"/>')
};
window.MSX = { S, T, L, F, esc, num, nm, sName, posTxt, time, byId, ST, SURAHS, HIDDEN, IC, LI };

/* ---------- الحالات المشتقة ---------- */
const todayList = () => ST.filter(s => s.today);
const attDone = () => todayList().filter(s => s.att).length;
const memoDone = () => ST.filter(s => s.memo).length;
const repDone = () => ST.filter(s => s.rep).length;
const repReady = () => ST.filter(s => s.memo && !s.rep);

function statusChips(s, withToday) {
  const c = [];
  if (withToday && s.today) c.push(`<span class="chip ${s.att === 'p' ? 'ok' : s.att === 'a' ? 'bad' : 'info'}">${s.att === 'p' ? L('marked_p') : s.att === 'a' ? L('marked_a') : F('s_today', { t: time(s.today) })}</span>`);
  c.push(`<span class="chip ${s.memo ? 'ok' : 'wait'}">${s.memo ? L('s_memo_ok') : L('s_memo_wait')}</span>`);
  c.push(`<span class="chip ${s.rep ? 'ok' : 'mute'}">${s.rep ? L('s_rep_ok') : L('s_rep_no')}</span>`);
  if (s.weak) c.push(`<span class="chip bad">${F('s_weak', { n: num(s.weak) })}</span>`);
  return `<div class="chips">${c.join('')}</div>`;
}
function posEditor(s) {
  const cur = s.memo || s.pos;
  return `<div class="pos"><select data-ps="${s.id}" aria-label="surah">${SURAHS.map((x, i) => `<option value="${i}"${i === cur[0] ? ' selected' : ''}>${esc(x[LI()])}</option>`).join('')}</select>
    <input type="number" inputmode="numeric" min="1" data-pa="${s.id}" placeholder="${L('ayah_ph')}" value="${s.memo ? s.memo[1] : ''}" aria-label="${L('ayah_ph')}">
    <button type="button" class="b em" data-psave="${s.id}">${IC.check}</button></div>`;
}

/* ---------- النموذج A: لوحة اليوم ---------- */
function renderA() {
  const td = todayList(), q = S.q.trim().toLowerCase();
  const memoPend = ST.filter(s => !s.memo), memoOk = ST.filter(s => s.memo);
  const ready = repReady(), locked = ST.filter(s => !s.memo).length;
  const left = { today: td.length - attDone(), month: (ST.length - memoDone()) + ready.length, all: ST.length };
  const rowsAll = ST.filter(s => !q || nm(s).toLowerCase().includes(q));
  return `
  <div class="top">
    <span class="top-badge">${IC.users}</span>
    <div class="top-t"><h1>${L('title')}</h1><p>${L('today_line')} · ${F('n_students', { n: num(ST.length) })}</p></div>
    <button type="button" class="btn-add" data-real="r_add">${IC.plus}<span>${L('add')}</span></button>
  </div>
  <nav class="a-jump" aria-label="sections">
    ${[['today', 'cal', 'j_today', left.today], ['month', 'book', 'j_month', left.month], ['all', 'users', 'j_all', null]].map(([k, ic, lb, n]) =>
      `<button type="button" class="${S.jump === k ? 'on' : ''}" data-jump="${k}">${IC[ic]}<span>${L(lb)}</span>${n === null ? `<em class="n mute">${num(left.all)}</em>` : n ? `<em class="n">${num(n)}</em>` : `<em class="n ok">✓</em>`}</button>`).join('')}
  </nav>
  <div class="a-grid">
  <div class="a-col">
  <section class="zone z-today" id="z-today">
    <header class="zone-h"><span class="zi">${IC.cal}</span><div><h2>${L('z_today_t')}</h2><p>${L('z_today_d')}</p></div><span class="zc">${num(attDone())}/${num(td.length)}</span></header>
    ${td.length ? td.map(s => `<div class="a-row${S.flash === 'att' + s.id ? ' flash' : ''}">
        <button type="button" class="who" data-sheet="${s.id}"><span class="ava">${s.av}</span><span class="who-t"><b>${esc(nm(s))}</b><small>${IC.clock.replace('msx-ic', 'msx-ic tiny')} ${time(s.today)}</small></span></button>
        ${s.att ? `<span class="chip ${s.att === 'p' ? 'ok' : 'bad'}">${s.att === 'p' ? L('marked_p') : L('marked_a')}</span><button type="button" class="b ghost" data-att="${s.id}:">${L('undo')}</button>`
               : `<div class="att"><button type="button" class="b ok" data-att="${s.id}:p">${IC.check}${L('present')}</button><button type="button" class="b no" data-att="${s.id}:a">${IC.x}${L('absent')}</button></div>`}
      </div>`).join('') : `<p class="muted">${L('no_today')}</p>`}
  </section>
  <section class="zone z-month" id="z-month">
    <header class="zone-h"><span class="zi gold">${IC.book}</span><div><h2>${L('z_month_t')}</h2><p>${L('z_month_d')}</p></div></header>
    <div class="step${memoPend.length ? ' cur' : ' fin'}">
      <div class="step-h"><span class="no">${memoPend.length ? num(1) : '✓'}</span><div><h3>${L('step1')}</h3><small>${L('step1_d')}</small></div><span class="zc">${num(memoDone())}/${num(ST.length)}</span></div>
      <div class="bar"><i style="width:${memoDone() / ST.length * 100}%"></i></div>
      ${memoPend.map(s => `<div class="a-row col"><div class="who"><span class="ava sm">${s.av}</span><span class="who-t"><b>${esc(nm(s))}</b><small>${L('sh_pos')}: ${posTxt(s.pos)}</small></span></div>${posEditor(s)}</div>`).join('')}
      ${memoOk.length ? `<p class="done-line">${IC.check}${F('done_n', { names: memoOk.map(s => esc(nm(s).split(' ')[0])).join('، ') })}</p>` : ''}
    </div>
    <div class="step${!ready.length && !locked ? ' fin' : ready.length ? ' cur' : ''}">
      <div class="step-h"><span class="no">${num(2)}</span><div><h3>${L('step2')}</h3><small>${L('step2_d')}</small></div><span class="zc">${num(repDone())}/${num(ST.length)}</span></div>
      <div class="bar"><i style="width:${repDone() / ST.length * 100}%"></i></div>
      ${ready.map(s => `<div class="a-row${S.flash === 'rep' + s.id ? ' flash' : ''}"><div class="who"><span class="ava sm">${s.av}</span><span class="who-t"><b>${esc(nm(s))}</b><small style="white-space:nowrap">${posTxt(s.pos)} ${S.lang === 'ar' ? '←' : '→'} ${posTxt(s.memo)}</small></span></div>
        <div class="att"><button type="button" class="b em" data-rep="${s.id}:wa">${IC.wa}${L('wa')}</button><button type="button" class="b line" data-rep="${s.id}:pdf">${L('pdf')}</button></div></div>`).join('')}
      ${ready.length > 1 ? `<button type="button" class="b gold wide" data-repall="1">${IC.send}${F('send_all', { n: num(ready.length) })}</button>` : ''}
      ${locked ? `<p class="locked">${IC.lock}${F('locked_n', { n: num(locked) })}</p>` : ''}
    </div>
  </section>
  </div>
  <div class="a-col">
  <section class="zone z-all" id="z-all">
    <header class="zone-h"><span class="zi">${IC.users}</span><div><h2>${L('z_all_t')}</h2><p>${L('z_all_d')}</p></div></header>
    <label class="search">${IC.search}<input type="search" id="q" value="${esc(S.q)}" placeholder="${L('search')}"></label>
    <div class="a-list">${rowsAll.map(s => `<div class="a-row st">
      <button type="button" class="who" data-sheet="${s.id}"><span class="ava">${s.av}</span><span class="who-t"><b>${esc(nm(s))}</b><small>${esc(s.g[LI()])} · ${num(s.pts)} ★</small>${statusChips(s, false)}</span></button>
      <div class="st-act"><button type="button" class="b em" data-real="r_eval" data-who="${s.id}">${IC.play}<span>${L('eval')}</span></button><button type="button" class="icon-b" data-sheet="${s.id}" aria-label="more">${IC.chev}</button></div>
    </div>`).join('')}</div>
    <details class="more"><summary>${F('hidden_n', { n: num(HIDDEN) })}</summary><p class="muted">…</p></details>
    <details class="more"><summary>${L('tools')}</summary><div class="row-tools"><button type="button" class="b line" data-real="r_tool">${L('exp')}</button><button type="button" class="b line" data-real="r_tool">${L('imp')}</button></div></details>
  </section>
  </div>
  </div>`;
}

/* ---------- النموذج B: قائمة واحدة بأوضاع ---------- */
const MODES = [['roster', 'users', 'm_roster'], ['att', 'cal', 'm_att'], ['memo', 'book', 'm_memo'], ['rep', 'send', 'm_rep']];
function modeLeft(m) {
  if (m === 'att') return todayList().length - attDone();
  if (m === 'memo') return ST.length - memoDone();
  if (m === 'rep') return repReady().length;
  return 0;
}
function renderB() {
  const m = S.mode, q = S.q.trim().toLowerCase();
  const list = ST.filter(s => !q || nm(s).toLowerCase().includes(q));
  let pend = [], done = [], other = [], otherLbl = '', total = 0, d = 0;
  const card = (s, body, cls = '') => `<div class="b-card ${cls}${S.flash === m + s.id ? ' flash' : ''}">
      <button type="button" class="who" data-sheet="${s.id}"><span class="ava">${s.av}</span><span class="who-t"><b>${esc(nm(s))}</b><small>${esc(s.g[LI()])}${m === 'att' && s.today ? ' · ' + time(s.today) : ''}${m !== 'roster' ? ' · ' + L('sh_pos') + ': ' + posTxt(s.memo || s.pos) : ''}</small>${m === 'roster' ? statusChips(s, true) : ''}</span></button>
      <div class="b-tools">${body}</div></div>`;
  if (m === 'roster') {
    pend = list.map(s => card(s, `<button type="button" class="b em" data-real="r_eval" data-who="${s.id}">${IC.play}<span>${L('eval')}</span></button><button type="button" class="icon-b" data-sheet="${s.id}" aria-label="more">${IC.chev}</button>`, 'row'));
  } else if (m === 'att') {
    const td = list.filter(s => s.today); total = td.length; d = td.filter(s => s.att).length;
    pend = td.filter(s => !s.att).map(s => card(s, `<button type="button" class="b ok" data-att="${s.id}:p">${IC.check}${L('present')}</button><button type="button" class="b no" data-att="${s.id}:a">${IC.x}${L('absent')}</button><button type="button" class="b line" data-att="${s.id}:c">${L('cancelled')}</button>`));
    done = td.filter(s => s.att).map(s => card(s, `<span class="chip ${s.att === 'p' ? 'ok' : s.att === 'a' ? 'bad' : 'mute'}">${s.att === 'p' ? L('marked_p') : s.att === 'a' ? L('marked_a') : L('cancelled')}</span><button type="button" class="b ghost" data-att="${s.id}:">${L('undo')}</button>`, 'row done'));
    other = list.filter(s => !s.today).map(s => card(s, '', 'row off')); otherLbl = F('grp_off', { n: num(other.length) });
  } else if (m === 'memo') {
    total = list.length; d = list.filter(s => s.memo).length;
    pend = list.filter(s => !s.memo).map(s => card(s, posEditor(s), 'col'));
    done = list.filter(s => s.memo).map(s => card(s, `<span class="chip ok">${posTxt(s.memo)}</span><button type="button" class="b ghost" data-reopen="${s.id}">${IC.edit}</button>`, 'row done'));
  } else {
    total = list.length; d = list.filter(s => s.rep).length;
    pend = list.filter(s => s.memo && !s.rep).map(s => card(s, `<button type="button" class="b em" data-rep="${s.id}:wa">${IC.wa}${L('wa')}</button><button type="button" class="b line" data-rep="${s.id}:pdf">${L('pdf')}</button>`, 'row'));
    done = list.filter(s => s.rep).map(s => card(s, `<span class="chip ok">${L('s_rep_ok')}</span>`, 'row done'));
    other = list.filter(s => !s.memo).map(s => card(s, `<button type="button" class="b line" data-mode="memo">${IC.lock}${L('go_memo')}</button>`, 'row off')); otherLbl = F('grp_locked', { n: num(other.length) });
  }
  const nextM = m === 'memo' && !pend.length ? 'rep' : m === 'att' && !pend.length ? 'memo' : null;
  return `
  <div class="top">
    <span class="top-badge">${IC.users}</span>
    <div class="top-t"><h1>${L('title')}</h1><p>${L('today_line')} · ${F('n_students', { n: num(ST.length) })}</p></div>
    <button type="button" class="btn-add" data-real="r_add">${IC.plus}<span>${L('add')}</span></button>
  </div>
  <div class="b-modes" role="tablist">
    ${MODES.map(([k, ic, lb]) => { const n = modeLeft(k); return `<button type="button" role="tab" aria-selected="${m === k}" class="${m === k ? 'on' : ''}" data-mode="${k}">
      <span class="mi">${IC[ic]}${n ? `<em>${num(n)}</em>` : ''}</span><span class="ml">${L(lb)}</span></button>`; }).join('')}
  </div>
  <div class="b-guide">
    <p>${L('g_' + m)}</p>
    ${m !== 'roster' ? `<div class="b-prog"><div class="bar"><i style="width:${total ? d / total * 100 : 0}%"></i></div><b>${F('prog', { d: num(d), t: num(total) })}</b></div>` : ''}
  </div>
  <label class="search">${IC.search}<input type="search" id="q" value="${esc(S.q)}" placeholder="${L('search')}"></label>
  ${nextM ? `<button type="button" class="b-next" data-mode="${nextM}">${IC.check}<span>${F('next_mode', { m: L(MODES.find(x => x[0] === nextM)[2]) })}</span>${IC.chev}</button>` : ''}
  ${m === 'rep' && pend.length > 1 ? `<button type="button" class="b gold wide" data-repall="1">${IC.send}${F('send_all', { n: num(pend.length) })}</button>` : ''}
  <div class="b-list">${pend.join('')}</div>
  ${other.length ? `<h4 class="grp">${otherLbl}</h4><div class="b-list">${other.join('')}</div>` : ''}
  ${done.length ? `<h4 class="grp ok">${F('grp_done', { n: num(done.length) })}</h4><div class="b-list">${done.join('')}</div>` : ''}
  ${m === 'roster' ? `<details class="more"><summary>${F('hidden_n', { n: num(HIDDEN) })}</summary><p class="muted">…</p></details>
    <details class="more"><summary>${L('tools')}</summary><div class="row-tools"><button type="button" class="b line" data-real="r_tool">${L('exp')}</button><button type="button" class="b line" data-real="r_tool">${L('imp')}</button></div></details>` : ''}`;
}

/* ---------- ورقة الطالب ---------- */
function sheetHtml(s) {
  const g = [
    ['file', 'sh_file', 'sh_file_d', 'r_file', ''], ['edit', 'sh_edit', 'sh_edit_d', 'r_edit', ''],
    ['book', 'sh_memo', 'sh_memo_d', 'memo', s.memo ? '' : 'warn'], ['wa', 'sh_rep', 'sh_rep_d', s.memo ? 'r_wa' : 'memo', ''],
    ['cal', 'sh_sched', 'sh_sched_d', 'r_sched', '']
  ];
  if (s.weak) g.push(['heal', 'sh_weak', 'sh_weak_d', 'r_weak', 'warn']);
  return `<div class="msx-sheet" role="dialog" aria-modal="true">
    <div class="grab"></div>
    <div class="sh-head"><span class="ava">${s.av}</span><div><b>${esc(nm(s))}</b><small>${esc(s.g[LI()])}</small></div><button type="button" class="sh-close" data-close="1" aria-label="${L('close')}">${IC.x}</button></div>
    <div class="sh-state"><div><small>${L('sh_pos')}</small><b>${posTxt(s.memo || s.pos)}</b></div><div><small>${L('sh_month')}</small><b>${s.memo ? L('s_memo_ok') : L('s_memo_wait')}</b></div><div><small>${L('sh_points')}</small><b>${num(s.pts)} ★</b></div></div>
    <div id="sh-memo-box"></div>
    <button type="button" class="sh-main" data-real="r_eval" data-who="${s.id}">${IC.play}${L('sh_eval')}</button>
    <div class="sh-grid">${g.map(([ic, t, d, act, cls]) => `<button type="button" class="${cls}" ${act === 'memo' ? `data-shmemo="${s.id}"` : `data-real="${act}" data-who="${s.id}"`}><i>${IC[ic]}</i><span>${L(t)}<small>${F(d, { n: num(s.weak) })}</small></span></button>`).join('')}</div>
    <div class="sh-foot"><button type="button" data-real="r_hide" data-who="${s.id}">${L('sh_hide')}</button><button type="button" class="del" data-real="r_del" data-who="${s.id}">${L('sh_del')}</button></div>
  </div>`;
}

/* ---------- الإطار العام ---------- */
const root = document.getElementById('app-root');
let toastT;
function toast(msg) { const el = document.getElementById('toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2600); }
function syncChrome() {
  const h = document.documentElement; h.lang = S.lang; h.dir = S.lang === 'ar' ? 'rtl' : 'ltr';
  document.getElementById('header-title').textContent = L('header_title');
  document.getElementById('top-student-name').textContent = L('header_sub');
  document.getElementById('hdr-home').textContent = L('h_home');
  document.querySelectorAll('#lang-toggle-btn .lb-opt').forEach((e, i) => e.classList.toggle('is-on', (i === 0) === (S.lang === 'ar')));
  document.getElementById('pvBar').innerHTML = `<div>${esc(L('pv_note'))}</div><div class="pv-sw">
    <a href="my-students-a-today.html" class="${V === 'a' ? 'on' : ''}">${L('pv_a')}</a><a href="my-students-b-modes.html" class="${V === 'b' ? 'on' : ''}">${L('pv_b')}</a>
    <button type="button" data-notes="1">${S.notes ? L('pv_close') : L('pv_why')}</button></div>`;
  const nb = document.getElementById('pvNotes');
  if (S.notes) {
    const N = NOTES[S.lang], c = N.cmp;
    nb.hidden = false;
    nb.innerHTML = `<h4>${esc(N[V].t)}</h4><ul>${N[V].l.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <table><caption style="caption-side:top;font-weight:700;padding:6px 0">${esc(c.cap)}</caption><tr>${c.h.map(x => `<th>${esc(x)}</th>`).join('')}</tr>${c.r.map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</table>`;
  } else nb.hidden = true;
}
function render(keepFocus) {
  syncChrome();
  const y = window.scrollY;
  root.innerHTML = `<div id="msx" class="msx-${V}">${V === 'a' ? renderA() : renderB()}</div>`;
  window.scrollTo(0, y);
  if (keepFocus) { const i = document.getElementById('q'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
  const bg = document.getElementById('sheetBg');
  if (S.sheet) { bg.hidden = false; bg.innerHTML = sheetHtml(byId(S.sheet)); } else { bg.hidden = true; bg.innerHTML = ''; }
  S.flash = null;
}
function saveMemo(id, fromSheet) {
  const sc = document.getElementById(fromSheet ? 'sheetBg' : 'msx'), s = byId(id), sel = sc.querySelector(`[data-ps="${id}"]`), inp = sc.querySelector(`[data-pa="${id}"]`);
  if (!sel || !inp) return;
  const si = +sel.value, a = +inp.value, max = SURAHS[si][2];
  if (!a || a < 1 || a > max) { toast(F('bad_ayah', { max: num(max) })); inp.focus(); return; }
  s.memo = [si, a]; S.flash = 'memo' + id;
  toast(L('saved'));
  if (fromSheet) S.sheet = id;
  render();
  // الانتقال التلقائي للطالب التالي (حقل الآية)
  const next = document.querySelector('[data-pa]'); if (next && !fromSheet) next.focus({ preventScroll: false });
}

document.addEventListener('click', e => {
  const t = e.target.closest('button,a,[data-close]');
  if (!t) { if (e.target.id === 'sheetBg') { S.sheet = null; render(); } return; }
  if (t.tagName === 'A') return;
  const d = t.dataset;
  if (t.id === 'lang-toggle-btn') { S.lang = S.lang === 'ar' ? 'en' : 'ar'; return render(); }
  if (t.id === 'theme-toggle-btn') { window.DHTheme && window.DHTheme.cycle(); return paintTheme(); }
  if (t.id === 'header-home-btn' || t.id === 'header-account-btn') return toast(L('real') + t.title);
  if (d.notes) { S.notes = !S.notes; return syncChrome(); }
  if (d.close) { S.sheet = null; return render(); }
  if (d.sheet) { S.sheet = +d.sheet; return render(); }
  if (d.real) { const s = d.who ? byId(+d.who) : null; return toast(L('real') + F(d.real, { n: s ? nm(s) : '' })); }
  if (d.jump) { S.jump = d.jump; render(); const zz = document.getElementById('z-' + d.jump); if (zz) window.scrollTo({ top: zz.getBoundingClientRect().top + window.scrollY - 140, behavior: 'smooth' }); return; }
  if (d.mode) { S.mode = d.mode; S.sheet = null; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  if (d.att !== undefined) { const [id, v] = d.att.split(':'); byId(+id).att = v || null; S.flash = 'att' + id; return render(); }
  if (d.psave) return saveMemo(+d.psave, !!S.sheet);
  if (d.reopen) { byId(+d.reopen).memo = null; byId(+d.reopen).rep = false; return render(); }
  if (d.rep) { const [id, k] = d.rep.split(':'); const s = byId(+id); s.rep = true; S.flash = 'rep' + id; toast(L('real') + F(k === 'wa' ? 'r_wa' : 'r_pdf', { n: nm(s) })); return render(); }
  if (d.repall) { const r = repReady(); r.forEach(s => (s.rep = true)); toast(F('sent_all', { n: num(r.length) })); return render(); }
  if (d.shmemo) { const s = byId(+d.shmemo); const box = document.getElementById('sh-memo-box'); box.innerHTML = `<div class="sh-memo">${posEditor(s)}</div>`; box.querySelector('input').focus(); return; }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.pa) saveMemo(+e.target.dataset.pa, !!S.sheet);
  if (e.key === 'Escape' && S.sheet) { S.sheet = null; render(); }
});
document.addEventListener('input', e => { if (e.target.id === 'q') { S.q = e.target.value; render(true); } });
document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.pa && e.target.value) saveMemo(+e.target.dataset.pa, !!S.sheet); });

const TI = { auto: '<path d="M12 3a9 9 0 1 0 0 18V3z" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="9"/>', light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', dark: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>' };
function paintTheme() { const p = window.DHTheme ? window.DHTheme.get() : 'auto'; const s = document.querySelector('#theme-toggle-btn svg'); if (s) s.innerHTML = TI[p] || TI.auto; }
document.addEventListener('app-theme-changed', paintTheme);
try { const u = new URLSearchParams(location.search); if (u.get('lang') === 'en') S.lang = 'en'; if (u.get('mode')) S.mode = u.get('mode'); } catch (e) { /* */ }
paintTheme(); render();
})();
