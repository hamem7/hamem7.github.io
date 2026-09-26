#!/usr/bin/env python3
"""
tests/e2e.py — end-to-end test of the Lab through a REAL browser (Chromium via Playwright).

Each "device" is a separate browser context (separate localStorage / IndexedDB = a different phone).
The backend is dev/server.mjs: the real backend/Code.gs running in the Node emulator behind an
Apps-Script-shaped HTTP layer (302 redirect to another origin, text/plain POST, no preflight).

What this proves: the Lab's frontend+backend LOGIC works end to end, incl. offline/retry/duplicate.
What it does NOT prove: Google's real redirect/CORS/latency/quotas, or a physical phone.
"""
import json, os, re, subprocess, sys, time, traceback, urllib.request
from playwright.sync_api import sync_playwright, expect

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB, API = 'http://localhost:8080', 'http://localhost:8081/macros/s/DEV/exec'
FAKE = open(os.path.join(ROOT, 'tests', 'fake-quran.json'), encoding='utf8').read()

# ---------------------------------------------------------------- server helpers
def http(url, body=None):
    req = urllib.request.Request(url, data=(body.encode() if body else None), headers={'Content-Type': 'text/plain'})
    return json.loads(urllib.request.urlopen(req, timeout=30).read().decode())
def state(): return http('http://localhost:8081/__state')
def chaos(mode='none', count=-1, ms=0): return http('http://localhost:8081/__chaos', json.dumps({'mode': mode, 'count': count, 'ms': ms}))
def api(action, key=None, **kw):
    """Direct API call (bypasses the browser) — used only for INDEPENDENT verification of what the server holds."""
    if action in ('ping', 'getHomework'):
        qs = '&'.join(f'{k}={v}' for k, v in {'action': action, **kw}.items())
        return json.loads(urllib.request.urlopen(API + '?' + qs).read().decode())
    return http(API, json.dumps({'action': action, 'teacherKey': key, **kw}))

# ---------------------------------------------------------------- tiny harness
results = []
def scenario(fn):
    t = time.time()
    try:
        fn(); results.append((fn.__name__, True, '', time.time() - t)); print(f'✅ {fn.__name__}  ({time.time()-t:.1f}s)')
    except Exception as e:
        tb = traceback.format_exc().splitlines()[-6:]
        results.append((fn.__name__, False, str(e)[:600], time.time() - t)); print(f'❌ {fn.__name__}: {str(e)[:500]}'); print('   ' + '\n   '.join(tb))
    finally:
        chaos('none')

class Env:
    pass
env = Env()

def new_ctx(browser, mobile=False, storage=None):
    kw = {'locale': 'ar-EG', 'timezone_id': 'Asia/Muscat'}
    if mobile: kw.update(viewport={'width': 393, 'height': 851}, user_agent='Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36', is_mobile=True, has_touch=True)
    if storage: kw['storage_state'] = storage
    ctx = browser.new_context(**kw)
    ctx.console_errors = []
    def watch(page):
        page.on('pageerror', lambda e: ctx.console_errors.append('pageerror: ' + str(e)))
        page.on('console', lambda m: ctx.console_errors.append('console.error: ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    ctx.on('page', watch)
    return ctx

def seed_quran(page):
    page.goto(WEB + '/index.html')
    page.evaluate("""async (fake) => {
      await new Promise((res, rej) => { const r = indexedDB.open('DarHamDatabase', 1); r.onupgradeneeded = e => { if (!e.target.result.objectStoreNames.contains('quran')) e.target.result.createObjectStore('quran', {keyPath:'number'}); };
        r.onsuccess = e => { const db = e.target.result; const tx = db.transaction('quran','readwrite'); JSON.parse(fake).forEach(s => tx.objectStore('quran').put(s)); tx.oncomplete = () => { db.close(); res(); }; }; r.onerror = rej; });
    }""", FAKE)

def teacher_setup(ctx):
    p = ctx.new_page(); seed_quran(p)
    p.fill('#api-url', API); p.fill('#teacher-key', env.key); p.click('#btn-save')
    expect(p.locator('#conn')).to_contain_text('✅', timeout=15000)
    return p

def add_student(p, name):
    return p.evaluate("(n) => import('/js/studentRecords.js').then(m => m.addStudent(n))", name)

def publish_homework(tp, qcount=10, assign_name=None):
    tp.goto(WEB + '/teacher.html')
    expect(tp.locator('#conn')).to_contain_text('✅', timeout=15000)
    expect(tp.locator('#btn-generate')).to_be_enabled(timeout=15000)
    tp.select_option('#surah', '101'); tp.fill('#qcount', str(qcount))
    if assign_name: tp.select_option('#assign', label=assign_name)
    tp.click('#btn-generate'); expect(tp.locator('#publish-card')).to_be_visible(timeout=15000)
    tp.click('#btn-publish')
    expect(tp.locator('#link-box')).to_be_visible(timeout=20000)
    steps = tp.locator('#publish-steps').inner_text()
    assert '❌' not in steps, steps
    link = tp.input_value('#link')
    return link, link.split('hw=')[1].split('&')[0]

# ---------------------------------------------------------------- answering through the real UI
def full_hw(hw_id): return api('getHomeworkFull', env.key, id=hw_id)['homework']

def answer_ui(page, q, correct):
    """Answer one question via the real UI. correct=None => pick something arbitrary but valid."""
    host = page.locator('#question-host')
    t = q['type']
    if t in ('mcq', 'checkbox'):
        want = [correct] if t == 'mcq' else (correct or [])
        if correct is None: want = [q['options'][0]]
        for opt in want:
            host.locator('label.opt').filter(has=page.locator('span', has_text=re.compile('^' + re.escape(opt) + '$'))).first.click()
    elif t == 'dropdown':
        host.locator('select').select_option(label=(correct if correct is not None else q['options'][0]))
    elif t == 'dual_dropdown':
        sels = host.locator('select'); c = correct or [q['options1'][0], q['options2'][0]]
        sels.nth(0).select_option(label=c[0]); sels.nth(1).select_option(label=c[1])
    elif t == 'written_blank':
        host.locator('input[type=text]').fill(correct if correct is not None else 'كلمة')
    elif t == 'write_3_ayahs':
        host.locator('textarea').fill(correct if correct is not None else 'نص')
    elif t == 'matrix_order':
        rows = host.locator('.qbox.quran').filter(has=page.locator('select'))
        for i in range(rows.count()):
            row = rows.nth(i); txt = row.evaluate("e => e.firstChild.textContent")
            pos = (correct.index(txt) + 1) if correct is not None and txt in correct else (i + 1)
            row.locator('select').select_option(value=str(pos))
    elif t == 'matching':
        pairs = correct if correct is not None else [{'left': l['id'], 'right': r['id']} for l, r in zip(q['leftItems'], q['rightItems'])]
        for p in pairs:
            ltxt = next(x['text'] for x in q['leftItems'] if x['id'] == p['left']); rtxt = next(x['text'] for x in q['rightItems'] if x['id'] == p['right'])
            cols = host.locator('.row > div'); cols.nth(0).locator('.pair', has_text=re.compile('^' + re.escape(ltxt) + '$')).first.click()
            cols.nth(1).locator('.pair', has_text=re.compile('^' + re.escape(rtxt) + '$')).first.click()

def solve(page, hw_id, perfect=True, stop_before_submit=False, upto=None):
    hw = full_hw(hw_id); qs = hw['questions']
    for i, q in enumerate(qs):
        if upto is not None and i >= upto: return
        answer_ui(page, q, q['correctAnswer'] if perfect else None)
        if i < len(qs) - 1: page.click('#btn-next')
    if not stop_before_submit:
        page.once('dialog', lambda d: d.accept()); page.click('#btn-submit')

def student_open(ctx, link, name=None):
    p = ctx.new_page(); p.goto(link)
    expect(p.locator('#screen-name')).to_be_visible(timeout=20000)
    if name and p.locator('#name-box').is_visible(): p.fill('#student-name', name)
    p.click('#btn-start'); expect(p.locator('#screen-quiz')).to_be_visible()
    return p

def status_text(p): return p.locator('#screen-status').inner_text()

def expected_final(qs, manual):
    tot = sum(q.get('points', 1) for q in qs)
    earned = sum(q.get('points', 1) for q in qs if not q.get('needsManualGrading')) + sum(manual.values())
    return round(earned / tot * 100)

# ================================================================= SCENARIOS
def s01_full_workflow_two_devices():
    """Teacher creates -> link -> DIFFERENT device solves+submits -> teacher receives, grades, approves -> record saved & survives reload."""
    n0 = state()['submissions']; tctx = new_ctx(env.browser); sctx = new_ctx(env.browser, mobile=True)
    tp = teacher_setup(tctx)
    student = add_student(tp, 'أحمد الطالب'); assert student['name'] == 'أحمد الطالب'
    link, hw_id = publish_homework(tp, qcount=12)
    assert 'HW_' in link and 'api=' in link
    assert state()['homeworks'] == 1, 'server must hold the homework'
    pub_wire = json.dumps(api('getHomework', id=hw_id), ensure_ascii=False)
    assert 'correctAnswer' not in pub_wire
    qs = full_hw(hw_id)['questions']
    for q in qs:                               # the link itself must not contain any answer text
        ans = q['correctAnswer']
        if isinstance(ans, str) and len(ans) > 6: assert ans not in link and ans not in tp.input_value('#link')

    # ---- student on another "phone"
    sp = student_open(sctx, link, 'أحمد الطالب')
    wire = []
    sp.on('response', lambda r: wire.append(r.url))
    solve(sp, hw_id, perfect=True)
    expect(sp.locator('#screen-status')).to_contain_text('وصل واجبك إلى معلمك', timeout=20000)
    assert 'مؤكَّد' in status_text(sp)
    assert state()['submissions'] == n0 + 1, 'independent check: server sheet must contain the submission'
    subs = api('listSubmissions', env.key, hwId=hw_id)['submissions']
    assert len(subs) == 1 and subs[0]['studentName'] == 'أحمد الطالب' and subs[0]['status'] == 'submitted'
    assert subs[0]['provisionalScore'] == 100, subs[0]['provisionalScore']
    # student device holds NO teacher record:
    assert sp.evaluate("Object.keys(localStorage).filter(k => k.startsWith('history_')).length") == 0
    # reload student page => still truthful (confirmed), not a fresh form
    sp.reload(); expect(sp.locator('#screen-status')).to_contain_text('وصل واجبك إلى معلمك', timeout=15000)

    # ---- teacher receives, grades, approves
    tp.goto(WEB + '/results.html?hw=' + hw_id)
    expect(tp.locator('#list')).to_contain_text('أحمد الطالب', timeout=15000)
    expect(tp.locator('#list')).to_contain_text('مُسلَّم')
    tp.locator('#list button', has_text='مراجعة').click()
    expect(tp.locator('#modal-card')).to_contain_text('غرفة التصحيح')
    manual_inputs = tp.locator('#modal-card input[type=number]')
    manual_qs = [q for q in qs if q.get('needsManualGrading')]
    assert manual_inputs.count() == len(manual_qs) and len(manual_qs) >= 1, (manual_inputs.count(), len(manual_qs))
    # approving with ungraded manual questions is refused by the server (truthful)
    tp.locator('#modal-card button[data-k=approve]').click()
    expect(tp.locator('#modal-card .banner')).to_contain_text('درجة من المعلم', timeout=15000)
    scores = {}
    for i, q in enumerate(manual_qs):
        v = max(0, q['points'] - 1) if i % 2 else q['points']; scores[q['id']] = v
        manual_inputs.nth(i).fill(str(v))
    tp.locator('#modal-card button[data-k=approve]').click()
    expect(tp.locator('#modal-card .banner')).to_contain_text('حُفظت في سجل', timeout=20000)
    want = expected_final(qs, scores)
    srv = api('listSubmissions', env.key, hwId=hw_id, statuses=['approved'])['submissions']
    assert len(srv) == 1 and srv[0]['finalScore'] == want and srv[0]['status'] == 'approved', (srv[0]['finalScore'], want)
    hist = tp.evaluate("(id) => JSON.parse(localStorage.getItem('history_' + id))", student['id'])
    assert len(hist) == 1 and hist[0]['score'] == want and hist[0]['hwId'] == hw_id and hist[0]['source'] == 'homework', hist

    # ---- persistence: reload teacher pages, data still there (server + student record)
    tp.reload(); expect(tp.locator('#records')).to_contain_text('%', timeout=15000)
    expect(tp.locator('#records')).to_contain_text(f'{want}%')
    tp.goto(WEB + '/results.html?hw=' + hw_id); expect(tp.locator('#list')).to_contain_text('معتمد', timeout=15000)
    # re-approving is idempotent (no duplicate history entry, no double points)
    before = tp.evaluate("(id) => (JSON.parse(localStorage.getItem('history_'+id))||[]).length", student['id'])
    tp.locator('#list button', has_text='عرض').click(); tp.locator('#modal-card button[data-k=approve]').click()
    expect(tp.locator('#modal-card .banner')).to_contain_text('حُفظت في سجل', timeout=20000)
    after = tp.evaluate("(id) => (JSON.parse(localStorage.getItem('history_'+id))||[]).length", student['id'])
    assert before == after == 1
    pts = tp.evaluate("async () => (await import('/js/studentRecords.js').then(m => m.listStudents()))[0].totalScore")
    assert pts == srv[0]['earnedPoints'], (pts, srv[0]['earnedPoints'])
    for c in (tctx, sctx): assert not c.console_errors, c.console_errors
    tctx.close(); sctx.close()

def s02_reconcile_after_teacher_data_loss():
    """Teacher browser data wiped => 'sync approved' rebuilds the record from the server (results are not only local)."""
    tctx = new_ctx(env.browser); tp = teacher_setup(tctx)
    student = add_student(tp, 'مريم الطالبة')
    link, hw_id = publish_homework(tp, qcount=8, assign_name='مريم الطالبة')
    sctx = new_ctx(env.browser, mobile=True)
    sp = sctx.new_page(); sp.goto(link); expect(sp.locator('#screen-name')).to_be_visible(timeout=20000)
    expect(sp.locator('#assigned-name')).to_have_text('مريم الطالبة'); assert not sp.locator('#student-name').is_visible()
    sp.click('#btn-start'); solve(sp, hw_id, perfect=True)
    expect(sp.locator('#screen-status')).to_contain_text('وصل واجبك', timeout=20000)
    qs = full_hw(hw_id)['questions']; manual = {q['id']: q['points'] for q in qs if q.get('needsManualGrading')}
    sub = api('listSubmissions', env.key, hwId=hw_id)['submissions'][0]
    assert sub['studentId'] == student['id'], 'assigned homework must bind the teacher-side student id server-side'
    api('gradeSubmission', env.key, submissionId=sub['id'], manualScores=manual, finalize=True)
    tp.goto(WEB + '/results.html'); tp.evaluate("(id) => localStorage.removeItem('history_' + id)", student['id'])
    tp.click('#btn-sync'); expect(tp.locator('#conn')).to_contain_text('1 نتيجة', timeout=15000)
    hist = tp.evaluate("(id) => JSON.parse(localStorage.getItem('history_' + id))", student['id'])
    assert len(hist) == 1 and hist[0]['score'] == 100, hist
    tctx.close(); sctx.close()

def s03_network_down_answers_preserved_then_retry():
    tctx = new_ctx(env.browser); tp = teacher_setup(tctx); link, hw_id = publish_homework(tp, 6)
    sctx = new_ctx(env.browser, mobile=True); sp = student_open(sctx, link, 'سارة')
    n0 = state()['submissions']
    solve(sp, hw_id, perfect=True, stop_before_submit=True)
    chaos('down')                                                # backend unreachable from now on
    sp.once('dialog', lambda d: d.accept()); sp.click('#btn-submit')
    expect(sp.locator('#screen-status')).to_contain_text('لم يصل واجبك إلى المعلم بعد', timeout=40000)
    txt = status_text(sp)
    assert 'وصل واجبك إلى معلمك' not in txt and 'مؤكَّد' not in txt.replace('غير مؤكَّد', ''), 'FAKE SUCCESS shown while offline: ' + txt
    assert state()['submissions'] == n0
    att = sp.evaluate("JSON.parse(localStorage.getItem('dhlab_attempt_' + new URLSearchParams(location.search).get('hw')))")
    assert att['state'] == 'failed' and len(att['answers']) >= 5, att['state']          # answers preserved
    # restart the "browser": save storage, close, reopen the link
    st = sctx.storage_state(); sctx.close()
    sctx2 = new_ctx(env.browser, mobile=True, storage=st); sp2 = sctx2.new_page(); sp2.goto(link)
    expect(sp2.locator('#screen-status')).to_contain_text('لم يصل واجبك', timeout=40000)   # still truthful after restart, answers not lost
    assert 'وصل واجبك إلى معلمك' not in status_text(sp2)
    chaos('none'); sp2.click('#btn-retry')
    expect(sp2.locator('#screen-status')).to_contain_text('وصل واجبك إلى معلمك', timeout=40000)
    assert state()['submissions'] == n0 + 1
    subs = api('listSubmissions', env.key, hwId=hw_id)['submissions']; assert len(subs) == 1 and subs[0]['provisionalScore'] == 100
    tctx.close(); sctx2.close()

def s04_browser_offline_event_auto_retry():
    n0 = state()['submissions']; tctx = new_ctx(env.browser); tp = teacher_setup(tctx); link, hw_id = publish_homework(tp, 5)
    sctx = new_ctx(env.browser, mobile=True); sp = student_open(sctx, link, 'خالد')
    solve(sp, hw_id, perfect=True, stop_before_submit=True)
    sctx.set_offline(True); sp.evaluate("window.dispatchEvent(new Event('offline'))")
    expect(sp.locator('#offline-banner')).to_be_visible()
    sp.once('dialog', lambda d: d.accept()); sp.click('#btn-submit')
    expect(sp.locator('#screen-status')).to_contain_text('لم يصل واجبك إلى المعلم بعد', timeout=40000)
    assert state()['submissions'] == n0
    sctx.set_offline(False); sp.evaluate("window.dispatchEvent(new Event('online'))")       # connectivity returns: NO click
    expect(sp.locator('#screen-status')).to_contain_text('وصل واجبك إلى معلمك', timeout=40000)
    assert state()['submissions'] == n0 + 1
    tctx.close(); sctx.close()

def s05_response_lost_after_server_saved_no_duplicate():
    """The nastiest real case: server persisted, but the phone never got the reply.
    (count=2 because Chromium itself silently re-sends once after a reset on a reused socket —
    and that automatic re-send is ALSO safe thanks to idempotency, see s05b.)"""
    n0 = state()['submissions']; tctx = new_ctx(env.browser); tp = teacher_setup(tctx); link, hw_id = publish_homework(tp, 5)
    sctx = new_ctx(env.browser, mobile=True); sp = student_open(sctx, link, 'ليلى')
    solve(sp, hw_id, perfect=True, stop_before_submit=True)
    chaos('drop_response', count=2)
    sp.once('dialog', lambda d: d.accept()); sp.click('#btn-submit')
    expect(sp.locator('#screen-status')).to_contain_text('لم يصل واجبك إلى المعلم بعد', timeout=40000)   # client honestly does not know
    assert state()['submissions'] == n0 + 1, 'server DID persist the first attempt'
    sp.click('#btn-retry')
    expect(sp.locator('#screen-status')).to_contain_text('وصل واجبك إلى معلمك', timeout=40000)
    assert state()['submissions'] == n0 + 1, 'retry must not create a duplicate'
    att = sp.evaluate("JSON.parse(localStorage.getItem('dhlab_attempt_' + new URLSearchParams(location.search).get('hw')))")
    assert att['receipt']['duplicate'] is True and att['attempts'] == 2
    tctx.close(); sctx.close()

def s05b_single_dropped_response_browser_auto_resend_is_safe():
    n0 = state()['submissions']; tctx = new_ctx(env.browser); tp = teacher_setup(tctx); link, hw_id = publish_homework(tp, 4)
    sctx = new_ctx(env.browser, mobile=True); sp = student_open(sctx, link, 'رنا')
    solve(sp, hw_id, perfect=True, stop_before_submit=True)
    chaos('drop_response', count=1)
    sp.once('dialog', lambda d: d.accept()); sp.click('#btn-submit')
    expect(sp.locator('#screen-status')).to_contain_text('وصل واجبك', timeout=40000)     # either path ends confirmed
    time.sleep(1); assert state()['submissions'] == n0 + 1, 'exactly one row'
    tctx.close(); sctx.close()

def s06_google_html_error_page_is_not_success():
    n0 = state()['submissions']; tctx = new_ctx(env.browser); tp = teacher_setup(tctx); link, hw_id = publish_homework(tp, 4)
    sctx = new_ctx(env.browser, mobile=True); sp = student_open(sctx, link, 'يوسف')
    solve(sp, hw_id, perfect=True, stop_before_submit=True)
    chaos('html', count=1)
    sp.once('dialog', lambda d: d.accept()); sp.click('#btn-submit')
    expect(sp.locator('#screen-status')).to_contain_text('لم يصل واجبك إلى المعلم بعد', timeout=40000)
    assert 'وصل واجبك إلى معلمك' not in status_text(sp) and state()['submissions'] == n0
    sp.click('#btn-retry'); expect(sp.locator('#screen-status')).to_contain_text('وصل واجبك إلى معلمك', timeout=30000)
    tctx.close(); sctx.close()

def s07_bad_ids_closed_and_duplicate_devices():
    n0 = state()['submissions']; tctx = new_ctx(env.browser); tp = teacher_setup(tctx); link, hw_id = publish_homework(tp, 4)
    c = new_ctx(env.browser, mobile=True)
    p = c.new_page(); p.goto(WEB + '/student.html?hw=HW_bad&api=' + API); expect(p.locator('#screen-error')).to_contain_text('رابط غير صحيح')
    p.goto(WEB + '/student.html?hw=HW_' + '0' * 32 + '&api=' + API); expect(p.locator('#screen-error')).to_contain_text('غير موجود', timeout=20000)
    p.goto(WEB + '/student.html?hw=' + hw_id); expect(p.locator('#screen-error')).to_be_visible(timeout=60000)      # no api param => falls back to DEFAULT_API_URL (real Google, unreachable/unknown here): must be an error screen, never the homework
    p.goto(WEB + '/student.html?hw=' + hw_id + '&api=https://evil.example/macros/s/x/exec'); expect(p.locator('#screen-error')).to_be_visible(timeout=60000); assert not p.locator('#screen-name').is_visible()  # foreign API URL is ignored (never used)
    # duplicate submission from a second device with the same name
    d1 = new_ctx(env.browser, mobile=True); p1 = student_open(d1, link, 'هدى'); solve(p1, hw_id, True)
    expect(p1.locator('#screen-status')).to_contain_text('وصل واجبك', timeout=20000)
    d2 = new_ctx(env.browser, mobile=True); p2 = student_open(d2, link, 'هدى'); solve(p2, hw_id, True)
    expect(p2.locator('#screen-status')).to_contain_text('لم يُقبل التسليم', timeout=20000); assert 'تم تسليم هذا الواجب مسبقاً' in status_text(p2)
    assert state()['submissions'] == n0 + 1
    # teacher closes the homework: old link now refuses
    tp.goto(WEB + '/teacher.html'); expect(tp.locator('#hw-list')).to_contain_text('التسليمات', timeout=15000)
    tp.locator('#hw-list button', has_text='إغلاق').first.click(); expect(tp.locator('#hw-list')).to_contain_text('مغلق', timeout=15000)
    d3 = new_ctx(env.browser, mobile=True); p3 = d3.new_page(); p3.goto(link); expect(p3.locator('#screen-error')).to_contain_text('مغلق', timeout=20000)
    for x in (tctx, c, d1, d2, d3): x.close()

def s08_many_students_many_homeworks_concurrent():
    tctx = new_ctx(env.browser); tp = teacher_setup(tctx)
    l1, h1 = publish_homework(tp, 5); l2, h2 = publish_homework(tp, 5)
    assert h1 != h2
    names = ['طالب ١', 'طالب ٢', 'طالب ٣', 'طالب ٤']
    ctxs = [new_ctx(env.browser, mobile=True) for _ in names]
    pages = [student_open(c, (l1 if i % 2 == 0 else l2), n) for i, (c, n) in enumerate(zip(ctxs, names))]
    for i, p in enumerate(pages): solve(p, h1 if i % 2 == 0 else h2, perfect=(i != 3), stop_before_submit=True)
    for p in pages: p.once('dialog', lambda d: d.accept())
    for p in pages: p.click('#btn-submit')                                  # (near) simultaneous
    for p in pages: expect(p.locator('#screen-status')).to_contain_text('وصل واجبك', timeout=40000)
    s1 = api('listSubmissions', env.key, hwId=h1)['submissions']; s2 = api('listSubmissions', env.key, hwId=h2)['submissions']
    assert sorted(s['studentName'] for s in s1) == ['طالب ١', 'طالب ٣'] and sorted(s['studentName'] for s in s2) == ['طالب ٢', 'طالب ٤']
    assert next(s for s in s2 if s['studentName'] == 'طالب ٤')['provisionalScore'] < 100          # imperfect answers scored lower by the SERVER
    for c in ctxs + [tctx]: c.close()

def s09_xss_in_student_name_is_inert():
    tctx = new_ctx(env.browser); tp = teacher_setup(tctx); link, hw_id = publish_homework(tp, 3)
    sctx = new_ctx(env.browser, mobile=True); evil = '<img src=x onerror="window.__pwn=1">'
    sp = student_open(sctx, link, evil); solve(sp, hw_id, True); expect(sp.locator('#screen-status')).to_contain_text('وصل واجبك', timeout=20000)
    tp.goto(WEB + '/results.html?hw=' + hw_id); expect(tp.locator('#list')).to_contain_text('<img', timeout=15000)
    assert tp.evaluate("window.__pwn") is None and tp.locator('#list img').count() == 0
    tp.locator('#list button', has_text='مراجعة').click(); expect(tp.locator('#modal-card')).to_contain_text('<img'); assert tp.evaluate("window.__pwn") is None
    tctx.close(); sctx.close()

def s10_teacher_auth_and_timeouts():
    tctx = new_ctx(env.browser); tp = tctx.new_page(); tp.goto(WEB + '/index.html')
    tp.fill('#api-url', API); tp.fill('#teacher-key', 'WRONGKEY'); tp.click('#btn-save')
    expect(tp.locator('#conn')).to_contain_text('غير صحيح', timeout=15000)
    tp.fill('#api-url', 'https://evil.example/exec'); tp.click('#btn-save'); expect(tp.locator('#conn')).to_contain_text('غير صالح')
    # client-side timeout classification (server deliberately slow)
    tp.goto(WEB + '/index.html'); tp.evaluate(f"localStorage.setItem('dhlab_api_url', '{API}')")
    chaos('slow', count=1, ms=3000)
    r = tp.evaluate("""() => import('/js/api.js').then(async m => { try { await m.call('ping', {}, {timeoutMs: 800}); return 'ok'; } catch (e) { return e.kind + '/' + e.code + '/' + e.retryable; } })""")
    assert r == 'timeout/TIMEOUT/true', r
    tctx.close()

# ================================================================= runner
def main():
    server = subprocess.Popen(['node', os.path.join(ROOT, 'dev', 'server.mjs')], stdout=subprocess.PIPE, text=True, cwd=ROOT)
    try:
        banner = ''
        for _ in range(3 * 20):
            line = server.stdout.readline(); banner += line
            if 'Teacher key' in line: break
        env.key = re.search(r'Teacher key: (\w+)', banner).group(1)
        with sync_playwright() as pw:
            env.browser = pw.chromium.launch(headless=True, args=['--no-sandbox'])
            only = sys.argv[1:]
            for fn in [v for k, v in globals().items() if k.startswith('s') and k[1:3].isdigit() and callable(v)]:
                if only and not any(o in fn.__name__ for o in only): continue
                scenario(fn)
            env.browser.close()
    finally:
        server.terminate()
    ok = sum(1 for r in results if r[1]); print(f'\n{ok}/{len(results)} scenarios passed')
    sys.exit(0 if ok == len(results) else 1)

if __name__ == '__main__':
    main()
