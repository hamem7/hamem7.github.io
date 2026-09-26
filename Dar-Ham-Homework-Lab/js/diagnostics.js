// js/diagnostics.js — real-world backend checks. Run against the DEPLOYED /exec URL from a real device.
import { call, ApiError, getApiUrl, getTeacherKey } from './api.js';

const $ = (id) => document.getElementById(id);
const results = [];
const lat = [];
const rnd = () => Math.random().toString(36).slice(2, 10);
const LS = 'dhlab_diag_last';

// A tiny fixed homework (NOT Quran text) with one auto question of each kind + one manual.
const FIX = () => [
  { id: 'd1', type: 'mcq', title: 'diag mcq', text: 'DIAG-1', options: ['A', 'B', 'C'], correctAnswer: 'B', points: 1 },
  { id: 'd2', type: 'checkbox', title: 'diag checkbox', text: 'DIAG-2', options: ['x', 'y', 'z', 'w'], correctAnswer: ['x', 'z'], points: 2 },
  { id: 'd3', type: 'written_blank', title: 'diag manual', text: 'DIAG-3', correctAnswer: 'SECRET-ANSWER-DIAG', points: 2, needsManualGrading: true }
];
const PERFECT = { d1: 'B', d2: ['z', 'x'], d3: 'anything' };

async function timed(fn) { const t = performance.now(); try { const v = await fn(); const ms = Math.round(performance.now() - t); lat.push(ms); return { v, ms }; } catch (e) { e.ms = Math.round(performance.now() - t); throw e; } }
function paint() {
  const host = $('results'); host.textContent = '';
  results.forEach(r => {
    const row = document.createElement('div'); row.className = 'test-row';
    const ico = document.createElement('span'); ico.textContent = r.state === 'pass' ? '✅' : r.state === 'fail' ? '❌' : r.state === 'skip' ? '⏭️' : '⏳';
    const n = document.createElement('div'); n.className = 't-name'; n.textContent = r.name;
    const d = document.createElement('div'); d.className = 't-detail'; d.textContent = (r.ms !== undefined ? r.ms + 'ms ' : '') + (r.detail || '');
    const wrap = document.createElement('div'); wrap.style.flex = '1'; wrap.append(n, d); row.append(ico, wrap); host.append(row);
  });
}
async function run(name, fn, { essential = true } = {}) {
  const r = { name, state: 'run', essential }; results.push(r); paint();
  try { const out = await fn(); r.state = 'pass'; r.detail = (out && out.detail) || ''; r.ms = out && out.ms; }
  catch (e) { r.state = 'fail'; r.detail = (e instanceof ApiError ? `[${e.kind}/${e.code}] ` : '') + (e.message || e); r.ms = e.ms; }
  paint(); return r.state === 'pass';
}
const need = (c, m) => { if (!c) throw new Error(m); };

async function runAll() {
  results.length = 0; lat.length = 0; $('verdict').classList.add('hidden');
  const state = { hwId: null, subIds: [], names: [] };
  if (!getApiUrl()) { need(false, 'no api url'); }
  $('btn-run').disabled = true;

  await run('1. GET ping عبر redirect (الرد مقروء من المتصفح)', async () => { const { v, ms } = await timed(() => call('ping', {})); need(v.configured, 'الخادم يعمل لكن setup() لم يُشغَّل'); return { ms, detail: 'server v' + v.version }; });
  await run('2. POST بدون preflight (text/plain) + مفتاح المعلم', async () => { const { ms } = await timed(() => call('authCheck', {}, { teacher: true })); return { ms }; });
  await run('3. خطأ الخادم يصل مقروءاً (GET على أمر معلم → METHOD_NOT_ALLOWED)', async () => {
    try { await call('listSubmissions', {}, { method: 'GET' }); } catch (e) { need(e.code === 'METHOD_NOT_ALLOWED', 'code=' + e.code); return { detail: 'CORS/redirect يسمح بقراءة أخطاء الخادم' }; }
    need(false, 'كان يجب أن يفشل');
  });
  await run('4. مفتاح خاطئ يُرفض (UNAUTHORIZED)', async () => { try { await call('authCheck', { teacherKey: 'WRONG-' + rnd() }); } catch (e) { need(e.code === 'UNAUTHORIZED', 'code=' + e.code); return; } need(false, 'قُبل مفتاح خاطئ!'); });

  const created = await run('5. إنشاء واجب: الخادم يحفظ ويعيد قراءته (persisted)', async () => {
    const { v, ms } = await timed(() => call('createHomework', { homework: { questions: FIX(), meta: { diagnostic: true, at: new Date().toISOString() } } }, { teacher: true, write: true, timeoutMs: 30000 }));
    need(/^HW_[0-9a-f]{32}$/.test(v.id), 'id format'); state.hwId = v.id; return { ms, detail: 'id …' + v.id.slice(-6) };
  });
  if (!created) { finish(state); return; }

  await run('6. الرابط العام لا يحتوي أي إجابة صحيحة', async () => {
    const { v, ms } = await timed(() => call('getHomework', { id: state.hwId }));
    const wire = JSON.stringify(v); need(!wire.includes('correctAnswer') && !wire.includes('SECRET-ANSWER-DIAG'), 'تسريب إجابات!'); return { ms };
  });
  await run('7. رقم واجب غير صحيح → NOT_FOUND', async () => { try { await call('getHomework', { id: 'HW_' + '0'.repeat(32) }); } catch (e) { need(e.code === 'NOT_FOUND', 'code=' + e.code); return; } need(false, 'وُجد واجب وهمي'); });

  const cid = 'c_diag' + rnd() + rnd(); const nm1 = 'اختبار ' + rnd();
  await run('8. تسليم طالب: مؤكَّد persisted', async () => {
    const { v, ms } = await timed(() => call('submit', { hwId: state.hwId, clientSubmissionId: cid, studentName: nm1, answers: PERFECT }, { method: 'POST', write: true, timeoutMs: 30000 }));
    need(v.status === 'submitted', 'status=' + v.status); state.subIds.push(v.submissionId); state.names.push(nm1); return { ms };
  });
  await run('9. إعادة نفس التسليم (بعد انقطاع رد) لا تُنشئ تكراراً', async () => {
    const { v } = await timed(() => call('submit', { hwId: state.hwId, clientSubmissionId: cid, studentName: nm1, answers: PERFECT }, { method: 'POST', write: true }));
    need(v.duplicate === true && v.submissionId === state.subIds[0], 'لم يُتعرَّف على التكرار');
  });
  await run('10. نفس الاسم بمعرّف جديد → ALREADY_SUBMITTED', async () => { try { await call('submit', { hwId: state.hwId, clientSubmissionId: 'c_diag' + rnd() + rnd(), studentName: nm1, answers: {} }, { method: 'POST', write: true }); } catch (e) { need(e.code === 'ALREADY_SUBMITTED', 'code=' + e.code); return; } need(false, 'قُبل تسليم مكرر'); });

  await run('11. تزامن: 8 تسليمات في نفس اللحظة — لا ضياع ولا تكرار', async () => {
    const names = Array.from({ length: 8 }, (_, i) => `متزامن ${i + 1} ${rnd()}`);
    const t = performance.now();
    const rs = await Promise.allSettled(names.map((n) => call('submit', { hwId: state.hwId, clientSubmissionId: 'c_diag' + rnd() + rnd(), studentName: n, answers: PERFECT }, { method: 'POST', write: true, timeoutMs: 45000 })));
    const ms = Math.round(performance.now() - t);
    const okc = rs.filter(r => r.status === 'fulfilled').length;
    const fails = rs.filter(r => r.status === 'rejected').map(r => r.reason.code);
    rs.forEach((r, i) => { if (r.status === 'fulfilled') { state.subIds.push(r.value.submissionId); state.names.push(names[i]); } });
    need(okc === 8, `نجح ${okc}/8 — الأخطاء: ${fails.join(',')}`); return { ms, detail: '8/8 مؤكَّدة' };
  });
  await run('12. القراءة بعد الكتابة مباشرة: كل التسليمات ظاهرة ولا تكرار', async () => {
    const { v, ms } = await timed(() => call('listSubmissions', { hwId: state.hwId }, { teacher: true }));
    const ids = v.submissions.map(s => s.id); need(new Set(ids).size === ids.length, 'تكرار'); need(ids.length === state.subIds.length && state.subIds.every(i => ids.includes(i)), `متوقع ${state.subIds.length} وُجد ${ids.length}`); return { ms };
  });
  await run('13. الخادم صحّح آلياً (الدرجة الأولية = 100% للأسئلة الآلية)', async () => {
    const { v } = await timed(() => call('listSubmissions', { hwId: state.hwId }, { teacher: true }));
    need(v.submissions.every(s => s.provisionalScore === 100 && s.status === 'submitted'), 'الدرجات غير متوقعة');
  });
  await run('14. الاعتماد يُرفض ما دام سؤال يدوي بلا درجة، ثم ينجح بعدها', async () => {
    const id = state.subIds[0];
    try { await call('gradeSubmission', { submissionId: id, finalize: true }, { teacher: true, write: true }); need(false, 'اعتُمد بلا درجة'); } catch (e) { if (e.message === 'اعتُمد بلا درجة') throw e; need(e.code === 'UNGRADED_QUESTIONS', 'code=' + e.code); }
    const { v } = await timed(() => call('gradeSubmission', { submissionId: id, manualScores: { d3: 1 }, finalize: true }, { teacher: true, write: true, timeoutMs: 30000 }));
    need(v.submission.status === 'approved', 'not approved'); need(v.submission.finalScore === 80, 'final=' + v.submission.finalScore + ' (متوقع 80: 1+2+1 من 5)');
  });
  await run('15. الاستمرارية: القراءة من جديد بعد الاعتماد', async () => {
    const { v } = await timed(() => call('listSubmissions', { hwId: state.hwId, statuses: ['approved'] }, { teacher: true }));
    need(v.submissions.length === 1 && v.submissions[0].finalScore === 80, 'المعتمد لم يُقرأ');
  });
  await run('16. 10 نداءات ping متتالية: زمن الاستجابة والأخطاء', async () => {
    let errs = 0; const ls = [];
    for (let i = 0; i < 10; i++) { try { const { ms } = await timed(() => call('ping', {})); ls.push(ms); } catch (e) { errs++; } }
    ls.sort((a, b) => a - b); need(errs === 0, errs + ' أخطاء من 10'); return { detail: `min ${ls[0]} / p50 ${ls[5]} / max ${ls[9]} ms` };
  });
  await run('17. رابط نشر غير صحيح يعطي خطأ مُعالَجاً (وليس تعليقاً)', async () => {
    const t = performance.now(); const bad = 'https://script.google.com/macros/s/AKfycbINVALIDINVALIDINVALID/exec';
    try { const c = new AbortController(); setTimeout(() => c.abort(), 15000); const r = await fetch(bad + '?action=ping', { signal: c.signal }); const txt = await r.text(); try { JSON.parse(txt); need(false, 'ردّ JSON غير متوقع'); } catch (e) { if (e.message === 'ردّ JSON غير متوقع') throw e; } }
    catch (e) { if (e.message === 'ردّ JSON غير متوقع') throw e; }
    return { ms: Math.round(performance.now() - t), detail: 'النهاية سريعة ومعالَجة' };
  }, { essential: false });

  finish(state);
}

function stats() { const a = [...lat].sort((x, y) => x - y); if (!a.length) return null; const q = (p) => a[Math.min(a.length - 1, Math.floor(a.length * p))]; return { n: a.length, min: a[0], p50: q(0.5), p95: q(0.95), max: a[a.length - 1] }; }
function finish(state) {
  try { localStorage.setItem(LS, JSON.stringify({ ...state, at: Date.now() })); } catch (e) {}
  const failed = results.filter(r => r.state === 'fail' && r.essential);
  const v = $('verdict'); v.classList.remove('hidden');
  if (failed.length) { v.className = 'banner bad'; v.textContent = `❌ فشل ${failed.length} اختبار أساسي — الخلفية الحالية غير مقبولة بعد. أرسل التقرير.`; }
  else { v.className = 'banner ok'; v.textContent = '✅ اجتازت كل الاختبارات الأساسية على هذا الجهاز/الشبكة. (كرّر على بيانات الجوال، ثم اضغط «إعادة فحص» بعد ساعات.)'; }
  const url = getApiUrl();
  const report = { lab: 'DarHamHomeworkLab', version: '1.0.0', at: new Date().toISOString(), page: location.origin, backendHost: url ? new URL(url).host : null,
    device: { ua: navigator.userAgent, online: navigator.onLine, net: navigator.connection ? { type: navigator.connection.effectiveType, rtt: navigator.connection.rtt, downlink: navigator.connection.downlink } : null, lang: navigator.language, tz: Intl.DateTimeFormat().resolvedOptions().timeZone },
    verdict: failed.length ? 'FAIL' : 'PASS', latency: stats(), results: results.map(r => ({ name: r.name, state: r.state, ms: r.ms, detail: r.detail, essential: r.essential })) };
  $('report').textContent = JSON.stringify(report, null, 2);
  $('btn-run').disabled = false;
}

$('btn-run').addEventListener('click', () => { runAll().catch(e => { $('results').textContent = '❌ ' + e.message; $('btn-run').disabled = false; }); });
$('btn-copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('report').textContent); $('btn-copy').textContent = '✔️ تم النسخ'; } catch (e) { alert('حدّد النص يدوياً وانسخه'); } });

$('btn-recheck').addEventListener('click', async () => {
  results.length = 0; $('verdict').classList.add('hidden'); lat.length = 0;
  let last; try { last = JSON.parse(localStorage.getItem(LS)); } catch (e) {}
  if (!last || !last.hwId) { results.push({ name: 'لا توجد بيانات اختبار سابقة على هذا الجهاز', state: 'fail', essential: true }); paint(); return; }
  const ageH = ((Date.now() - last.at) / 3600000).toFixed(1);
  await run(`إعادة فحص بعد ${ageH} ساعة: الواجب التجريبي ما زال محفوظاً`, async () => { const { v } = await timed(() => call('getHomeworkFull', { id: last.hwId }, { teacher: true })); need(v.homework && v.homework.id === last.hwId, 'مفقود'); });
  await run(`إعادة فحص: كل التسليمات (${last.subIds.length}) ما زالت محفوظة`, async () => { const { v } = await timed(() => call('listSubmissions', { hwId: last.hwId }, { teacher: true })); const ids = v.submissions.map(s => s.id); const miss = last.subIds.filter(i => !ids.includes(i)); need(!miss.length, `مفقود ${miss.length}`); return { detail: `${ids.length} موجودة` }; });
  finish({});
});

$('btn-clean').addEventListener('click', async () => {
  let last; try { last = JSON.parse(localStorage.getItem(LS)); } catch (e) {}
  if (!last || !last.hwId) return alert('لا توجد بيانات اختبار سابقة.');
  try {
    await call('setHomeworkStatus', { id: last.hwId, status: 'closed' }, { teacher: true, write: true });
    for (const id of last.subIds) await call('voidSubmission', { submissionId: id }, { teacher: true, write: true });
    localStorage.removeItem(LS); alert('تم إغلاق الواجب التجريبي وإلغاء تسليماته.');
  } catch (e) { alert('فشل التنظيف: ' + e.message); }
});
