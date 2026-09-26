// js/teacher.js — create homework, get a link ONLY after the server confirmed persistence + a student-view check.
import { call, callWithRetry, friendlyError, getApiUrl, getTeacherKey, ApiError } from './api.js';
import { listSurahs, generateQuestions, typeSummary, typeLabel, studentLink, whatsappUrl, saveLocalCopy } from './homework.js';
import { listStudents } from './studentRecords.js';

const $ = (id) => document.getElementById(id);
let surahs = [], questions = [], lastCfg = null;

function setConn(cls, text) { const c = $('conn'); c.className = 'banner ' + cls; c.textContent = text; }

async function checkConnection() {
  if (!getApiUrl()) return setConn('bad', '⚠️ لم يتم ضبط رابط الخادم. افتح "الرئيسية" وأدخله أولاً.');
  if (!getTeacherKey()) return setConn('warn', '🔑 لم تُدخل مفتاح المعلم بعد. افتح "الرئيسية" وأدخله.');
  try {
    const r = await call('authCheck', {}, { teacher: true });
    setConn('ok', `✅ متصل بالخادم ومفتاح المعلم صحيح (${r._ms}ms)`);
    return true;
  } catch (e) { setConn('bad', '❌ ' + friendlyError(e)); return false; }
}

async function loadSurahs() {
  try {
    surahs = await listSurahs();
    $('surah').innerHTML = surahs.map(s => `<option value="${s.number}">${s.number}. ${s.name} (${s.ayahsCount} آية)</option>`).join('');
    onSurahChange(); $('btn-generate').disabled = false;
  } catch (e) { $('surah').innerHTML = '<option>تعذّر تحميل نص القرآن (يحتاج إنترنت أول مرة)</option>'; console.error(e); }
}
function onSurahChange() { const s = surahs.find(x => x.number === +$('surah').value); if (s) { $('from').value = 1; $('to').value = s.ayahsCount; $('to').max = s.ayahsCount; } }
$('surah').addEventListener('change', onSurahChange);

async function loadStudents() {
  try { (await listStudents()).filter(s => !s.isHidden).forEach(s => { const o = document.createElement('option'); o.value = String(s.id); o.textContent = s.name; $('assign').append(o); }); } catch (e) { console.error(e); }
}

$('btn-generate').addEventListener('click', async () => {
  $('gen-status').textContent = '⏳ جاري التوليد…';
  try {
    const surahNum = +$('surah').value, startAyah = +$('from').value, endAyah = +$('to').value, qCount = +$('qcount').value;
    if (!(startAyah >= 1 && endAyah >= startAyah)) throw new Error('نطاق الآيات غير صحيح');
    questions = await generateQuestions({ surahNum, startAyah, endAyah, qCount });
    if (!questions.length) throw new Error('لم يتم توليد أي سؤال لهذا النطاق');
    lastCfg = { mode: 'surah', surahNum, startAyah, endAyah, qCount };
    const sum = typeSummary(questions);
    $('preview').classList.remove('hidden');
    $('preview').innerHTML = `<div class="banner ok">تم توليد ${questions.length} سؤالاً — سورة ${surahs.find(s => s.number === surahNum).name} (الآيات ${startAyah}–${endAyah}) — موزّعة على النطاق بنفس منطق دار حم.</div>
      <p>${Object.entries(sum).map(([t, n]) => `<span class="badge b-info">${typeLabel(t)} × ${n}</span>`).join(' ')}</p>`;
    const list = document.createElement('ol');
    questions.forEach(q => { const li = document.createElement('li'); li.textContent = q.title.replace(/[*🔽☑️✍️🎤🔗]/g, '').trim() + (q.needsManualGrading ? '  [تصحيح يدوي]' : ''); list.append(li); });
    $('preview').append(list);
    $('publish-card').classList.remove('hidden'); $('link-box').classList.add('hidden'); $('publish-steps').innerHTML = '';
    $('gen-status').textContent = '';
  } catch (e) { $('gen-status').textContent = '❌ ' + e.message; }
});

function step(text, state) { const li = document.createElement('li'); li.textContent = ({ run: '⏳ ', ok: '✅ ', bad: '❌ ' })[state] + text; $('publish-steps').append(li); return li; }
function setStep(li, text, state) { li.textContent = ({ run: '⏳ ', ok: '✅ ', bad: '❌ ' })[state] + text; }

$('btn-publish').addEventListener('click', async () => {
  const btn = $('btn-publish'); btn.disabled = true; $('publish-steps').innerHTML = ''; $('link-box').classList.add('hidden');
  const assignId = $('assign').value;
  const assignName = assignId ? $('assign').selectedOptions[0].textContent : null;
  const s1 = step('حفظ الواجب في الخادم…', 'run');
  let created;
  try {
    created = await call('createHomework', { homework: { questions, assignedStudentName: assignName, assignedStudentId: assignId || null, meta: lastCfg } }, { teacher: true, write: true, timeoutMs: 30000 });
    setStep(s1, `الخادم حفظ الواجب وتحقّق من قراءته (${created.questionCount} سؤالاً، ${created._ms}ms)`, 'ok');
  } catch (e) {
    setStep(s1, 'فشل الحفظ في الخادم: ' + friendlyError(e) + ' — لم يُنشأ أي رابط.', 'bad'); btn.disabled = false; return;
  }
  const s2 = step('التحقق من أن الرابط يفتح كما سيراه الطالب…', 'run');
  try {
    const pub = await callWithRetry('getHomework', { id: created.id }, {}, 3);
    if (JSON.stringify(pub).includes('correctAnswer')) throw new Error('تسريب إجابات في الرابط العام!');
    setStep(s2, 'الرابط يعمل ولا يحتوي على الإجابات الصحيحة', 'ok');
  } catch (e) { setStep(s2, 'تم الحفظ لكن فحص الرابط فشل: ' + friendlyError(e) + ' — لا ترسل الرابط قبل نجاح الفحص.', 'bad'); btn.disabled = false; return; }
  const s3 = step('حفظ نسخة محلية في سجلّك…', 'run');
  try {
    await saveLocalCopy({ id: created.id, createdAt: created.createdAt, questions, status: 'published', assignedStudentName: assignName, assignedStudentId: assignId || null });
    setStep(s3, 'نسخة محلية محفوظة', 'ok');
  } catch (e) { setStep(s3, 'تعذّر حفظ النسخة المحلية (لا يؤثر على الواجب): ' + e.message, 'bad'); }

  const link = studentLink(created.id);
  $('link').value = link; $('link-box').classList.remove('hidden');
  $('btn-wa').href = whatsappUrl(link, assignName ? `واجب ${assignName} من منصة دار حم:` : 'واجب من منصة دار حم:');
  btn.disabled = false; loadList();
});
$('btn-copy').addEventListener('click', async () => {
  const v = $('link').value;
  try { await navigator.clipboard.writeText(v); $('btn-copy').textContent = '✔️ تم النسخ'; } catch (e) { $('link').select(); document.execCommand && document.execCommand('copy'); $('btn-copy').textContent = 'حدّد الرابط وانسخه يدوياً'; }
  setTimeout(() => { $('btn-copy').textContent = '📋 نسخ الرابط'; }, 2000);
});

async function loadList() {
  const host = $('hw-list');
  if (!getApiUrl() || !getTeacherKey()) { host.textContent = 'أدخل رابط الخادم ومفتاح المعلم من الصفحة الرئيسية.'; return; }
  try {
    const r = await callWithRetry('listHomeworks', {}, { teacher: true }, 2);
    if (!r.homeworks.length) { host.textContent = 'لا توجد واجبات بعد.'; return; }
    host.textContent = '';
    const t = document.createElement('table'); t.innerHTML = '<thead><tr><th>التاريخ</th><th>الطالب</th><th>الأسئلة</th><th>التسليمات</th><th></th></tr></thead>';
    const tb = document.createElement('tbody');
    r.homeworks.forEach(h => {
      const tr = document.createElement('tr');
      const c = h.counts;
      tr.innerHTML = `<td>${new Date(h.createdAt).toLocaleDateString('ar-EG')}${h.status === 'closed' ? ' <span class="badge b-grey">مغلق</span>' : ''}</td><td></td><td>${h.questionCount}</td>
        <td><span class="badge b-info">مُسلَّم ${c.submitted}</span> <span class="badge b-warn">مُصحَّح ${c.graded}</span> <span class="badge b-ok">معتمد ${c.approved}</span></td><td></td>`;
      tr.children[1].textContent = h.assignedStudentName || 'رابط عام';
      const acts = tr.children[4];
      const mk = (txt, cls, fn) => { const b = document.createElement('button'); b.className = 'btn small ' + cls; b.textContent = txt; b.addEventListener('click', fn); acts.append(b, ' '); };
      mk('📊 النتائج', '', () => { location.href = 'results.html?hw=' + h.id; });
      mk('🔗 نسخ', 'ghost', async () => { await navigator.clipboard.writeText(studentLink(h.id)).catch(() => {}); });
      mk(h.status === 'closed' ? '🔓 فتح' : '🔒 إغلاق', 'ghost', async () => { await call('setHomeworkStatus', { id: h.id, status: h.status === 'closed' ? 'published' : 'closed' }, { teacher: true, write: true }); loadList(); });
      tb.append(tr);
    });
    t.append(tb); host.append(t);
  } catch (e) { host.textContent = '❌ ' + friendlyError(e); }
}
$('btn-refresh').addEventListener('click', loadList);

(async () => { await checkConnection(); await Promise.all([loadSurahs(), loadStudents()]); loadList(); })();
