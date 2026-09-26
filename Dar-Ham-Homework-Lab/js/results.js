// js/results.js — teacher inbox, grading room, approval, and writing the approved result into the student's record.
import { call, callWithRetry, friendlyError, getApiUrl, getTeacherKey } from './api.js';
import { listStudents, addStudent, findStudentByName, findStudentById, recordApprovedResult, readHistory } from './studentRecords.js';

const $ = (id) => document.getElementById(id);
let subs = [], homeworks = [];

const STATUS = { submitted: ['b-info', 'مُسلَّم — بانتظار التصحيح'], graded: ['b-warn', 'مُصحَّح (غير معتمد)'], approved: ['b-ok', 'معتمد'] };
const badge = (st) => { const s = document.createElement('span'); s.className = 'badge ' + (STATUS[st] || ['b-grey'])[0]; s.textContent = (STATUS[st] || [0, st])[1]; return s; };

function conn(cls, text) { const c = $('conn'); c.className = 'banner ' + cls; c.textContent = text; }

async function loadHomeworks() {
  const r = await callWithRetry('listHomeworks', {}, { teacher: true }, 2);
  homeworks = r.homeworks;
  const sel = $('hw-select'); const cur = new URLSearchParams(location.search).get('hw') || sel.value;
  sel.innerHTML = '<option value="">— كل الواجبات —</option>';
  homeworks.forEach(h => { const o = document.createElement('option'); o.value = h.id; o.textContent = `${new Date(h.createdAt).toLocaleDateString('ar-EG')} — ${h.assignedStudentName || 'رابط عام'} (${h.counts.total} تسليم)`; sel.append(o); });
  if (cur) sel.value = cur;
}

async function loadSubs() {
  const host = $('list');
  if (!getApiUrl() || !getTeacherKey()) { host.textContent = 'أدخل رابط الخادم ومفتاح المعلم من الصفحة الرئيسية.'; return; }
  host.textContent = '⏳ جاري التحميل…';
  try {
    const hw = $('hw-select').value;
    const r = await callWithRetry('listSubmissions', hw ? { hwId: hw } : {}, { teacher: true }, 2);
    subs = r.submissions;
    if (!subs.length) { host.textContent = 'لا توجد تسليمات مستلمة بعد.'; return; }
    host.textContent = '';
    const t = document.createElement('table');
    t.innerHTML = '<thead><tr><th>الطالب</th><th>الحالة</th><th>الدرجة</th><th>وقت التسليم</th><th></th></tr></thead>';
    const tb = document.createElement('tbody');
    subs.forEach((s, i) => {
      const tr = document.createElement('tr');
      const shown = s.status === 'submitted' ? `${s.provisionalScore}% (أولية — تلقائي فقط)` : `${s.finalScore}%`;
      tr.innerHTML = '<td class="n"></td><td class="s"></td><td></td><td></td><td></td>';
      tr.querySelector('.n').textContent = s.studentName; tr.querySelector('.s').append(badge(s.status));
      tr.children[2].textContent = shown; tr.children[3].textContent = new Date(s.submittedAt).toLocaleString('ar-EG');
      const b = document.createElement('button'); b.className = 'btn small'; b.textContent = s.status === 'approved' ? '👁️ عرض' : '🔍 مراجعة وتصحيح'; b.addEventListener('click', () => openGrading(i)); tr.children[4].append(b);
      tb.append(tr);
    });
    t.append(tb); host.append(t);
  } catch (e) { host.textContent = '❌ ' + friendlyError(e); }
}

// ---------------- grading room ----------------
function openGrading(i) {
  const s = subs[i]; const card = $('modal-card'); card.textContent = '';
  const h = document.createElement('h2'); h.textContent = '✍️ غرفة التصحيح: ' + s.studentName; card.append(h);
  const info = document.createElement('p'); info.className = 'muted'; info.append('الحالة: ', badge(s.status)); card.append(info);
  const inputs = {};
  s.details.forEach((d, n) => {
    const q = document.createElement('div'); q.className = 'qcard' + (d.needsManualGrading ? ' manual' : '');
    const t = document.createElement('h3'); t.textContent = `السؤال ${n + 1}`; q.append(t);
    const qt = document.createElement('div'); qt.className = 'quran'; qt.style.fontSize = '1.2rem'; qt.textContent = String(d.question).replace(/<br\s*\/?>/gi, ' ');
    const sa = document.createElement('p'); sa.append('إجابة الطالب: '); const b1 = document.createElement('b'); b1.textContent = d.studentAnswer; sa.append(b1);
    const ca = document.createElement('p'); ca.append('الإجابة النموذجية: '); const b2 = document.createElement('b'); b2.style.color = 'var(--ok)'; b2.textContent = d.correctAnswer; ca.append(b2);
    q.append(qt, sa, ca);
    if (d.needsManualGrading) {
      const row = document.createElement('div'); row.className = 'row'; row.style.alignItems = 'center';
      const lab = document.createElement('span'); lab.textContent = `الدرجة من (${d.points}):`;
      const inp = document.createElement('input'); inp.type = 'number'; inp.min = 0; inp.max = d.points; inp.style.maxWidth = '110px'; inp.dataset.qid = d.qid;
      inp.placeholder = '—'; if (d.manualScore !== undefined) inp.value = d.manualScore;
      if (s.status === 'approved') inp.disabled = true;
      inputs[d.qid] = inp; row.append(lab, inp); q.append(row);
    } else { const r = document.createElement('p'); r.textContent = d.isCorrect ? '✅ صحيح (تصحيح آلي من الخادم)' : '❌ خطأ (تصحيح آلي من الخادم)'; q.append(r); }
    card.append(q);
  });

  const msg = document.createElement('div'); msg.className = 'banner info hidden'; card.append(msg);
  const say = (cls, text) => { msg.className = 'banner ' + cls; msg.textContent = text; };

  // student mapping (general links: the teacher decides which record this belongs to)
  const mapBox = document.createElement('div'); card.append(mapBox);
  let mapSel = null;
  (async () => {
    const students = await listStudents();
    let preset = s.studentId !== null && s.studentId !== undefined && s.studentId !== '' ? await findStudentById(s.studentId) : null;
    if (!preset) preset = await findStudentByName(s.studentName);
    const lab = document.createElement('label'); lab.textContent = 'اربط النتيجة بسجل الطالب:'; mapSel = document.createElement('select');
    mapSel.innerHTML = '<option value="">— اختر طالباً —</option><option value="__new">➕ إنشاء طالب جديد باسم «' + s.studentName.replace(/[<>&"]/g, '') + '»</option>';
    students.forEach(st => { const o = document.createElement('option'); o.value = String(st.id); o.textContent = st.name; mapSel.append(o); });
    if (preset) mapSel.value = String(preset.id);
    mapBox.append(lab, mapSel);
  })();

  const actions = document.createElement('div'); actions.className = 'row'; actions.style.marginTop = '14px';
  const collect = () => { const o = {}; Object.entries(inputs).forEach(([qid, inp]) => { if (inp.value !== '') o[qid] = Number(inp.value); }); return o; };
  const save = (finalize) => async () => {
    btns.forEach(b => b.disabled = true);
    try {
      let studentRec = null;
      if (finalize) {
        const v = mapSel && mapSel.value;
        if (!v) { say('warn', 'اختر الطالب الذي ستُسجَّل له هذه النتيجة قبل الاعتماد.'); btns.forEach(b => b.disabled = false); return; }
        studentRec = v === '__new' ? await addStudent(s.studentName) : await findStudentById(v);
      }
      say('info', '⏳ جاري الحفظ في الخادم…');
      const r = await call('gradeSubmission', { submissionId: s.id, manualScores: collect(), finalize, expectedVersion: subs[i].version, ...(studentRec ? { studentId: studentRec.id } : {}) }, { teacher: true, write: true, timeoutMs: 30000 });
      subs[i] = r.submission;
      if (!finalize) { say('ok', `✅ تم حفظ الدرجات في الخادم (الحالة: مُصحَّح، الدرجة الحالية ${r.submission.finalScore}%). لم تُعتمد بعد.`); }
      else {
        say('info', '✅ اعتُمدت في الخادم. ⏳ جاري كتابتها في سجل الطالب…');
        try {
          const w = await recordApprovedResult(studentRec, r.submission);
          if (!w.verified) throw new Error('لم تتطابق القراءة الراجعة من السجل');
          say('ok', `✅ اعتُمدت النتيجة (${r.submission.finalScore}%) وحُفظت في سجل «${studentRec.name}» وتم التحقق منها.`);
        } catch (e) { say('warn', '⚠️ اعتُمدت في الخادم لكن كتابتها في سجل الطالب فشلت: ' + e.message + ' — اضغط «مزامنة المعتمَد إلى سجل الطلاب».'); }
      }
      loadSubs(); loadRecords(); loadHomeworks();
    } catch (e) { say('bad', '❌ ' + friendlyError(e)); }
    btns.forEach(b => { b.disabled = (subs[i].status === 'approved' && b === bSave); });
  };
  const mk = (txt, cls, k, fn) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = txt; b.dataset.k = k; b.addEventListener('click', fn); actions.append(b); return b; };
  const bSave = mk('💾 حفظ الدرجات (بدون اعتماد)', 'ghost', 'save', save(false));
  const bApprove = mk('✅ اعتماد وحفظ النتيجة', 'gold', 'approve', save(true));
  const bClose = mk('إغلاق', 'ghost', 'close', () => $('modal').classList.add('hidden'));
  const btns = [bSave, bApprove];
  if (s.status === 'approved') { bSave.disabled = true; bApprove.textContent = '✅ إعادة كتابة في سجل الطالب'; bApprove.dataset.k = 'approve'; }
  card.append(actions); $('modal').classList.remove('hidden');
}

// ---------------- student records view + reconcile ----------------
async function loadRecords() {
  const host = $('records'); host.textContent = '';
  const students = await listStudents();
  if (!students.length) { host.textContent = 'لا يوجد طلاب في السجل المحلي بعد.'; return; }
  const t = document.createElement('table'); t.innerHTML = '<thead><tr><th>الطالب</th><th>النقاط</th><th>الواجبات المعتمدة</th></tr></thead>'; const tb = document.createElement('tbody');
  students.forEach(st => {
    const hist = readHistory(st.id).filter(h => h.source === 'homework');
    const tr = document.createElement('tr'); tr.innerHTML = '<td></td><td></td><td></td>';
    tr.children[0].textContent = st.name; tr.children[1].textContent = st.totalScore || 0;
    tr.children[2].textContent = hist.length ? hist.map(h => `${h.score}% (${h.date})`).join(' ، ') : '—';
    tr.children[2].dataset.role = 'hist'; tr.dataset.student = st.name; tb.append(tr);
  });
  t.append(tb); host.append(t);
}
$('btn-add-student').addEventListener('click', async () => { const n = prompt('اسم الطالب'); if (n && n.trim().length > 1) { await addStudent(n); loadRecords(); } });

$('btn-sync').addEventListener('click', async () => {
  const btn = $('btn-sync'); btn.disabled = true;
  try {
    const r = await callWithRetry('listSubmissions', { statuses: ['approved'] }, { teacher: true }, 2);
    let done = 0, skipped = 0;
    for (const s of r.submissions) {
      let st = (s.studentId !== null && s.studentId !== undefined && s.studentId !== '') ? await findStudentById(s.studentId) : null;
      if (!st) st = await findStudentByName(s.studentName);
      if (!st) { skipped++; continue; }
      await recordApprovedResult(st, s); done++;
    }
    conn(skipped ? 'warn' : 'ok', `تمت المزامنة: ${done} نتيجة كُتبت/حُدّثت في سجل الطلاب` + (skipped ? `، و${skipped} بدون طالب مطابق (اعتمدها من غرفة التصحيح لاختيار الطالب)` : ''));
    $('conn').classList.remove('hidden'); loadRecords();
  } catch (e) { conn('bad', '❌ ' + friendlyError(e)); $('conn').classList.remove('hidden'); }
  btn.disabled = false;
});

$('hw-select').addEventListener('change', loadSubs);
$('btn-reload').addEventListener('click', () => { loadHomeworks().then(loadSubs); });
(async () => { try { await loadHomeworks(); } catch (e) { $('list').textContent = '❌ ' + friendlyError(e); return; } await loadSubs(); await loadRecords(); })();
