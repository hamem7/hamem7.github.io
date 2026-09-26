// js/student.js — student page. Truthful states only; answers never live only in memory.
import { callWithRetry, ApiError, friendlyError, getApiUrl } from './api.js';
import { renderQuestion, hasAnswer } from './render.js';
import { saveDraft, loadDraft, getAttempt, startSubmission, attemptSend, startAutoRetry, isLocalStorageWorking } from './submitQueue.js';

const $ = (id) => document.getElementById(id);
const show = (id) => { ['screen-loading', 'screen-error', 'screen-name', 'screen-quiz', 'screen-status'].forEach(s => $(s).classList.toggle('hidden', s !== id)); };
const params = new URLSearchParams(location.search);
const hwId = params.get('hw') || '';

let homework = null, answers = {}, idx = 0, studentName = '';

function updateNet() { $('offline-banner').classList.toggle('hidden', navigator.onLine !== false); }
window.addEventListener('online', updateNet); window.addEventListener('offline', updateNet); updateNet();
if (!isLocalStorageWorking()) $('storage-banner').classList.remove('hidden');

function showError(title, text, ico = '❌', retry = true) {
  $('error-ico').textContent = ico; $('error-title').textContent = title; $('error-text').textContent = text;
  $('btn-reload').classList.toggle('hidden', !retry);
  show('screen-error');
}
$('btn-reload').addEventListener('click', () => location.reload());

// ---------- submission status screen (the only place that can claim "received") ----------
function paintStatus(a) {
  show('screen-status');
  const badge = $('status-badge'); const retry = $('btn-retry');
  retry.classList.add('hidden');
  const meta = [];
  if (a.state === 'confirmed') {
    $('status-ico').textContent = '✅'; $('status-title').textContent = 'وصل واجبك إلى معلمك';
    $('status-text').textContent = 'تأكّد الخادم من استلام إجاباتك وحفظها. سيراجعها معلمك ويعتمد نتيجتك.';
    badge.className = 'badge b-ok'; badge.textContent = 'تم الاستلام والحفظ (مؤكَّد)';
    if (a.receipt) meta.push('رقم التسليم: ' + a.receipt.submissionId.slice(-8));
    if (a.confirmedAt) meta.push('وقت التأكيد: ' + new Date(a.confirmedAt).toLocaleString('ar-EG'));
  } else if (a.state === 'pending') {
    $('status-ico').textContent = '⏳'; $('status-title').textContent = 'جاري إرسال واجبك…';
    $('status-text').textContent = 'لم يصل بعد إلى معلمك. لا تُغلق الصفحة حتى يظهر التأكيد.';
    badge.className = 'badge b-info'; badge.textContent = 'قيد الإرسال (غير مؤكَّد)';
  } else if (a.state === 'failed') {
    $('status-ico').textContent = '⚠️'; $('status-title').textContent = 'لم يصل واجبك إلى المعلم بعد';
    $('status-text').textContent = 'إجاباتك محفوظة على هذا الجهاز ولن تضيع. سنُعيد المحاولة تلقائياً عند عودة الاتصال، ويمكنك الضغط على الزر.';
    badge.className = 'badge b-warn'; badge.textContent = 'محفوظ على الجهاز فقط — لم يُرسَل';
    retry.classList.remove('hidden');
    if (a.lastError) meta.push('السبب: ' + friendlyError(new ApiError('x', a.lastError.code, a.lastError.message)));
  } else if (a.state === 'rejected') {
    $('status-ico').textContent = '❌'; $('status-title').textContent = 'لم يُقبل التسليم';
    $('status-text').textContent = friendlyError(new ApiError('x', a.lastError.code, a.lastError.message));
    badge.className = 'badge b-bad'; badge.textContent = 'مرفوض من الخادم';
  }
  if (a.attempts) meta.push('عدد المحاولات: ' + a.attempts);
  $('status-meta').textContent = meta.join(' • ');
}
$('btn-retry').addEventListener('click', () => attemptSend(hwId, paintStatus));

// ---------- quiz ----------
function persistDraft() { saveDraft(hwId, { studentName, answers, index: idx }); $('save-indicator').textContent = '💾 محفوظ على جهازك'; }
function paintQuestion() {
  const q = homework.questions[idx]; const n = homework.questions.length;
  $('progress-text').textContent = `${idx + 1} / ${n}`;
  $('progress-bar').style.width = `${((idx + 1) / n) * 100}%`;
  renderQuestion($('question-host'), q, answers, () => { persistDraft(); });
  $('btn-prev').style.visibility = idx > 0 ? 'visible' : 'hidden';
  const last = idx === n - 1;
  $('btn-next').classList.toggle('hidden', last); $('btn-submit').classList.toggle('hidden', !last);
  const un = homework.questions.filter(x => x.type !== 'audio_record' && !hasAnswer(x, answers[x.id])).length;
  $('unanswered-hint').textContent = last && un ? `تنبيه: لديك ${un} سؤال بدون إجابة.` : '';
}
$('btn-next').addEventListener('click', () => { if (idx < homework.questions.length - 1) { idx++; persistDraft(); paintQuestion(); window.scrollTo(0, 0); } });
$('btn-prev').addEventListener('click', () => { if (idx > 0) { idx--; persistDraft(); paintQuestion(); window.scrollTo(0, 0); } });
$('btn-submit').addEventListener('click', async () => {
  const un = homework.questions.filter(x => x.type !== 'audio_record' && !hasAnswer(x, answers[x.id])).length;
  if (un && !confirm(`لديك ${un} سؤال بدون إجابة. هل تريد التسليم على أي حال؟`)) return;
  $('btn-submit').disabled = true;
  persistDraft();
  const attempt = startSubmission(hwId, studentName, answers);   // persisted locally BEFORE any network call
  paintStatus(attempt);
  await attemptSend(hwId, paintStatus);
  const a = getAttempt(hwId);
  if (a && a.state === 'failed') startAutoRetry(hwId, paintStatus);
});

// ---------- start ----------
$('btn-start').addEventListener('click', () => {
  if (!homework.assignedStudentName) {
    studentName = $('student-name').value.replace(/\s+/g, ' ').trim();
    if (studentName.length < 2) { $('student-name').focus(); return alert('اكتب اسمك (حرفان على الأقل)'); }
  } else studentName = homework.assignedStudentName;
  persistDraft(); show('screen-quiz'); paintQuestion();
});

async function init() {
  if (!/^HW_[0-9a-f]{32}$/.test(hwId)) return showError('رابط غير صحيح', 'تأكد من نسخ الرابط كاملاً كما أرسله المعلم.', '🔗', false);
  if (!getApiUrl()) return showError('الرابط ناقص', 'هذا الرابط لا يحتوي على عنوان الخادم. اطلب من المعلم رابطاً جديداً.', '🔗', false);

  // A previous attempt on this device? Show its TRUE status instead of letting the student redo it.
  const prev = getAttempt(hwId);
  if (prev && prev.state !== 'rejected') {
    paintStatus(prev);
    if (prev.state === 'pending' || prev.state === 'failed') { await attemptSend(hwId, paintStatus); const a = getAttempt(hwId); if (a && a.state === 'failed') startAutoRetry(hwId, paintStatus); }
    return;
  }

  try {
    const r = await callWithRetry('getHomework', { id: hwId }, {}, 3);
    homework = r.homework;
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NOT_FOUND') return showError('الواجب غير موجود', 'الرابط غير صحيح أو حُذف الواجب. اطلب رابطاً جديداً من المعلم.', '🔍', false);
    if (e instanceof ApiError && e.code === 'CLOSED') return showError('الواجب مغلق', 'أغلق المعلم هذا الواجب ولم يعد يقبل تسليمات.', '🔒', false);
    return showError('تعذّر تحميل الواجب', friendlyError(e) + ' — لم يتم تسليم أي شيء.', '📡', true);
  }
  $('q-count').textContent = homework.questions.length;
  const draft = loadDraft(hwId);
  if (draft) { answers = draft.answers || {}; idx = Math.min(draft.index || 0, homework.questions.length - 1); $('student-name').value = draft.studentName || ''; $('draft-note').classList.remove('hidden'); }
  if (homework.assignedStudentName) { $('assigned-box').classList.remove('hidden'); $('assigned-name').textContent = homework.assignedStudentName; $('name-box').classList.add('hidden'); }
  show('screen-name');
}
init();
window.__dhlab = { get answers() { return answers; }, get homework() { return homework; } };   // test hook (read-only)
