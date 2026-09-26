/**
 * Dar Ham Homework Lab — Backend (Google Apps Script Web App + Google Sheets as storage only)
 * ============================================================================================
 * Version 1.0.0
 *
 * Setup (5 minutes, see README.md):
 *   1. Create a NEW Google Sheet (name it e.g. "DarHam Homework DB").
 *   2. Extensions -> Apps Script -> paste this whole file into Code.gs -> Save.
 *   3. Run the function `setup` once (authorize when asked). Open View -> Logs / Executions
 *      and copy the TEACHER KEY it prints (or set your own: Project Settings -> Script
 *      Properties -> TEACHER_KEY).
 *   4. Deploy -> New deployment -> type "Web app" -> Execute as: Me -> Who has access: Anyone
 *      -> Deploy -> copy the /exec URL into the Lab (index.html).
 *
 * Nobody (teacher or student) ever opens the Sheet. It is only the storage layer.
 *
 * API contract (all responses are JSON with {ok:boolean, ...}; errors carry a stable `code`):
 *   GET  ?action=ping
 *   GET  ?action=getHomework&id=HW_xxx            (public, student-safe: NO correct answers)
 *   POST {action:'submit', ...}                    (public, idempotent by clientSubmissionId)
 *   POST {action:'authCheck'|'createHomework'|'listHomeworks'|'getHomeworkFull'|
 *         'setHomeworkStatus'|'listSubmissions'|'gradeSubmission'|'voidSubmission',
 *         teacherKey:'...', ...}                   (teacher only)
 *
 * The client MUST send POST bodies as Content-Type: text/plain (a "simple request", so the
 * browser does not send a CORS preflight, which Apps Script cannot answer).
 */

// If you created the script from script.google.com (standalone, NOT from inside the sheet), paste the
// Google Sheet id here (the long text between /d/ and /edit in the sheet's URL). Otherwise leave ''.
var SPREADSHEET_ID = '';

function ss_() {
  return SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

var VERSION = '1.0.0';
var SHEET_HW = 'Homeworks';
var SHEET_SUB = 'Submissions';
var CHUNK_SIZE = 45000;            // Sheets cell limit is 50,000 chars
var MAX_CHUNKS = 8;                // => max ~360 KB per record
var MAX_BODY_CHARS = 300000;
var MAX_QUESTIONS = 60;
var MAX_SUBMISSIONS_PER_HW = 500;
var LOCK_WAIT_MS = 25000;

// Fixed (indexed) columns before the JSON chunks. Column numbers are 1-based.
var HW_FIXED = ['id', 'createdAt', 'status', 'assignedStudentName', 'assignedStudentId', 'questionCount'];
var SUB_FIXED = ['id', 'hwId', 'clientSubmissionId', 'studentName', 'studentNameNorm', 'studentId',
  'status', 'provisionalScore', 'finalScore', 'earnedPoints', 'totalPoints',
  'submittedAt', 'gradedAt', 'approvedAt', 'version'];

// =====================================================================================
// Entry points
// =====================================================================================

function doGet(e) {
  return handle_((e && e.parameter) || {}, 'GET');
}

function doPost(e) {
  var raw = (e && e.postData && e.postData.contents) || '';
  if (raw.length > MAX_BODY_CHARS) return out_({ ok: false, code: 'TOO_LARGE', message: 'Request body too large' });
  var body;
  try { body = JSON.parse(raw); } catch (err) { return out_({ ok: false, code: 'BAD_JSON', message: 'Body is not valid JSON' }); }
  return handle_(body || {}, 'POST');
}

function handle_(req, method) {
  try {
    var action = String(req.action || '');
    var isPublicGet = (action === 'ping' || action === 'getHomework');
    if (method === 'GET' && !isPublicGet) throw err_('METHOD_NOT_ALLOWED', 'This action requires POST');

    switch (action) {
      case 'ping':             return out_(ok_({ version: VERSION, serverTime: nowIso_(), configured: isConfigured_() }));
      case 'getHomework':      return out_(getHomeworkPublic_(req));
      case 'submit':           return out_(withLock_(function () { return submit_(req); }));

      case 'authCheck':        requireTeacher_(req); return out_(ok_({ teacher: true }));
      case 'createHomework':   requireTeacher_(req); return out_(withLock_(function () { return createHomework_(req); }));
      case 'listHomeworks':    requireTeacher_(req); return out_(listHomeworks_());
      case 'getHomeworkFull':  requireTeacher_(req); return out_(getHomeworkFull_(req));
      case 'setHomeworkStatus':requireTeacher_(req); return out_(withLock_(function () { return setHomeworkStatus_(req); }));
      case 'listSubmissions':  requireTeacher_(req); return out_(listSubmissions_(req));
      case 'gradeSubmission':  requireTeacher_(req); return out_(withLock_(function () { return gradeSubmission_(req); }));
      case 'voidSubmission':   requireTeacher_(req); return out_(withLock_(function () { return voidSubmission_(req); }));
      default: throw err_('UNKNOWN_ACTION', 'Unknown action: ' + action);
    }
  } catch (e) {
    var res = { ok: false, code: e.code || 'SERVER_ERROR', message: String(e.message || e) };
    if (e.extra) for (var k in e.extra) res[k] = e.extra[k];
    return out_(res);
  }
}

// =====================================================================================
// Setup / config / auth
// =====================================================================================

/** Run once from the Apps Script editor. Idempotent. */
function setup() {
  var ss = ss_();
  ensureSheet_(ss, SHEET_HW, HW_FIXED, MAX_CHUNKS);
  ensureSheet_(ss, SHEET_SUB, SUB_FIXED, MAX_CHUNKS);
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('TEACHER_KEY');
  if (!key) {
    key = randomKey_(12);
    props.setProperty('TEACHER_KEY', key);
  }
  Logger.log('DarHam Homework Lab is ready. TEACHER KEY = ' + key);
  return key;
}

function isConfigured_() {
  return !!PropertiesService.getScriptProperties().getProperty('TEACHER_KEY');
}

function ensureSheet_(ss, name, fixedCols, chunks) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  var header = fixedCols.slice();
  for (var i = 1; i <= chunks; i++) header.push('json' + i);
  sh.getRange(1, 1, 1, header.length).setValues([header]);
  // Plain-text format for every column: prevents Sheets from turning ids/ISO dates/numbers into
  // other types, from evaluating "=..." as formulas, and from corrupting numeric-looking JSON chunks.
  sh.getRange(1, 1, sh.getMaxRows(), header.length).setNumberFormat('@');
  sh.setFrozenRows(1);
  return sh;
}

function getSheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) throw err_('NOT_SET_UP', 'Run setup() once in the Apps Script editor');
  return sh;
}

function requireTeacher_(req) {
  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get('auth_fails') || 0);
  if (fails >= 20) throw err_('LOCKED', 'Too many wrong keys. Try again in 10 minutes.');
  var expected = PropertiesService.getScriptProperties().getProperty('TEACHER_KEY');
  if (!expected) throw err_('NOT_CONFIGURED', 'Run setup() once in the Apps Script editor');
  var given = String(req.teacherKey || '');
  if (!safeEqual_(given, expected)) {
    cache.put('auth_fails', String(fails + 1), 600);
    Utilities.sleep(400);
    throw err_('UNAUTHORIZED', 'Wrong teacher key');
  }
}

function safeEqual_(a, b) {
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= (a.charCodeAt(i) ^ b.charCodeAt(i));
  return diff === 0;
}

// =====================================================================================
// Small helpers
// =====================================================================================

function ok_(obj) { obj.ok = true; return obj; }
function err_(code, message) { var e = new Error(message); e.code = code; return e; }
function nowIso_() { return new Date().toISOString(); }
function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(LOCK_WAIT_MS); } catch (e) { throw err_('BUSY', 'Server busy, retry shortly'); }
  try { return fn(); } finally { lock.releaseLock(); }
}

function randomKey_(n) {
  var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var s = '';
  var uuid = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  for (var i = 0; i < n; i++) s += alphabet.charAt(parseInt(uuid.substr(i * 2, 2), 16) % alphabet.length);
  return s;
}

/** 122 bits of randomness (UUIDv4) — unguessable id. */
function newId_(prefix) { return prefix + Utilities.getUuid().replace(/-/g, ''); }

function md5hex_(str) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, str, Utilities.Charset.UTF_8);
  var hex = '';
  for (var i = 0; i < bytes.length; i++) { var b = (bytes[i] < 0 ? bytes[i] + 256 : bytes[i]); hex += (b < 16 ? '0' : '') + b.toString(16); }
  return hex;
}

function normName_(s) {
  return String(s || '').replace(/[ً-ٰٟـ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Prevents a cell that starts with = + - @ being treated as a formula by Sheets. Display-only. */
function safeCell_(v) {
  if (typeof v === 'string' && /^[=+\-@]/.test(v)) return ' ' + v;
  return v;
}

function splitChunks_(str) {
  var chunks = [];
  for (var i = 0; i < str.length; i += CHUNK_SIZE) chunks.push(str.substr(i, CHUNK_SIZE));
  if (chunks.length > MAX_CHUNKS) throw err_('TOO_LARGE', 'Record exceeds storage limit');
  while (chunks.length < MAX_CHUNKS) chunks.push('');
  return chunks;
}

// ---- generic row storage (fixed columns + json chunks) ----

function readAllRows_(sh, fixedCols) {
  var last = sh.getLastRow();
  if (last < 2) return [];
  var width = fixedCols.length + MAX_CHUNKS;
  var values = sh.getRange(2, 1, last - 1, width).getValues();
  var rows = [];
  for (var i = 0; i < values.length; i++) {
    var v = values[i];
    if (!v[0]) continue;
    var json = '';
    for (var c = fixedCols.length; c < width; c++) json += (v[c] || '');
    var rec = null;
    try { rec = JSON.parse(json); } catch (e) { rec = null; }
    rows.push({ rowIndex: i + 2, fixed: v.slice(0, fixedCols.length), rec: rec });
  }
  return rows;
}

function writeRow_(sh, fixedCols, rowIndex, fixedValues, rec) {
  var json = JSON.stringify(rec);
  var chunks = splitChunks_(json);
  var row = fixedValues.map(safeCell_).concat(chunks);
  sh.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  return md5hex_(json);
}

/** Re-reads the row from the sheet and checks it is byte-identical. This is the persistence proof. */
function verifyRow_(sh, fixedCols, rowIndex, expectedId, expectedHash) {
  SpreadsheetApp.flush();
  var width = fixedCols.length + MAX_CHUNKS;
  var v = sh.getRange(rowIndex, 1, 1, width).getValues()[0];
  var json = '';
  for (var c = fixedCols.length; c < width; c++) json += (v[c] || '');
  if (String(v[0]) !== String(expectedId) || md5hex_(json) !== expectedHash) {
    throw err_('PERSIST_VERIFY_FAILED', 'Row was written but read-back did not match');
  }
  return true;
}

/**
 * Next free row. Sheets has a hard row cap (default 1000): writing beyond it throws
 * "coordinates outside the dimensions of the sheet", so grow the sheet first and re-apply the
 * plain-text format to the new rows (inserted rows are not guaranteed to inherit it).
 */
function nextRow_(sh, fixedCols) {
  var rowIndex = Math.max(sh.getLastRow(), 1) + 1;
  var maxRows = sh.getMaxRows();
  if (rowIndex > maxRows) {
    var add = Math.max(200, rowIndex - maxRows);
    sh.insertRowsAfter(maxRows, add);
    sh.getRange(maxRows + 1, 1, add, fixedCols.length + MAX_CHUNKS).setNumberFormat('@');
  }
  return rowIndex;
}

// =====================================================================================
// Homework
// =====================================================================================

function findHomework_(id) {
  var sh = getSheet_(SHEET_HW);
  var rows = readAllRows_(sh, HW_FIXED);
  for (var i = 0; i < rows.length; i++) if (String(rows[i].fixed[0]) === String(id)) return { sh: sh, row: rows[i] };
  return null;
}

function validateQuestions_(qs) {
  if (!Array.isArray(qs) || qs.length < 1) throw err_('BAD_REQUEST', 'questions must be a non-empty array');
  if (qs.length > MAX_QUESTIONS) throw err_('BAD_REQUEST', 'too many questions');
  var seen = {};
  for (var i = 0; i < qs.length; i++) {
    var q = qs[i];
    if (!q || typeof q !== 'object') throw err_('BAD_REQUEST', 'question ' + i + ' invalid');
    if (!q.id || typeof q.id !== 'string') throw err_('BAD_REQUEST', 'question ' + i + ' has no id');
    if (seen[q.id]) throw err_('BAD_REQUEST', 'duplicate question id ' + q.id);
    seen[q.id] = true;
    if (!q.type) throw err_('BAD_REQUEST', 'question ' + i + ' has no type');
    if (q.correctAnswer === undefined) throw err_('BAD_REQUEST', 'question ' + i + ' has no correctAnswer');
  }
}

function createHomework_(req) {
  var hw = req.homework || {};
  validateQuestions_(hw.questions);
  var id = newId_('HW_');
  var record = {
    id: id,
    createdAt: nowIso_(),
    status: 'published',
    assignedStudentName: hw.assignedStudentName ? String(hw.assignedStudentName).slice(0, 80) : null,
    assignedStudentId: (hw.assignedStudentId !== undefined && hw.assignedStudentId !== null) ? hw.assignedStudentId : null,
    questions: hw.questions,
    meta: hw.meta || null
  };
  var sh = getSheet_(SHEET_HW);
  var rowIndex = nextRow_(sh, HW_FIXED);
  var hash = writeRow_(sh, HW_FIXED, rowIndex,
    [id, record.createdAt, record.status, record.assignedStudentName || '', record.assignedStudentId === null ? '' : String(record.assignedStudentId), record.questions.length],
    record);
  verifyRow_(sh, HW_FIXED, rowIndex, id, hash);
  return ok_({ id: id, createdAt: record.createdAt, status: record.status, questionCount: record.questions.length, persisted: true, receipt: { row: rowIndex, hash: hash } });
}

function safeQuestion_(q) {
  var copy = {};
  for (var k in q) if (Object.prototype.hasOwnProperty.call(q, k) && k !== 'correctAnswer') copy[k] = q[k];
  return copy;
}

function getHomeworkPublic_(req) {
  var id = String(req.id || '');
  if (!/^HW_[0-9a-f]{32}$/.test(id)) throw err_('NOT_FOUND', 'Homework not found');
  var found = findHomework_(id);
  if (!found || !found.row.rec) throw err_('NOT_FOUND', 'Homework not found');
  var rec = found.row.rec;
  if (rec.status === 'closed') throw err_('CLOSED', 'This homework is closed');
  return ok_({
    serverTime: nowIso_(),
    homework: {
      id: rec.id, createdAt: rec.createdAt, status: rec.status,
      assignedStudentName: rec.assignedStudentName || null,
      questions: rec.questions.map(safeQuestion_)
    }
  });
}

function getHomeworkFull_(req) {
  var found = findHomework_(String(req.id || ''));
  if (!found) throw err_('NOT_FOUND', 'Homework not found');
  return ok_({ homework: found.row.rec });
}

function listHomeworks_() {
  var hwRows = readAllRows_(getSheet_(SHEET_HW), HW_FIXED);
  var subRows = readAllRows_(getSheet_(SHEET_SUB), SUB_FIXED);
  var counts = {};
  subRows.forEach(function (r) {
    var hwId = String(r.fixed[1]);
    var st = String(r.fixed[6]);
    if (st === 'void') return;
    counts[hwId] = counts[hwId] || { total: 0, submitted: 0, graded: 0, approved: 0 };
    counts[hwId].total++;
    if (counts[hwId][st] !== undefined) counts[hwId][st]++;
  });
  var list = hwRows.filter(function (r) { return r.rec; }).map(function (r) {
    var rec = r.rec;
    return {
      id: rec.id, createdAt: rec.createdAt, status: rec.status,
      assignedStudentName: rec.assignedStudentName || null,
      assignedStudentId: rec.assignedStudentId === undefined ? null : rec.assignedStudentId,
      questionCount: rec.questions.length,
      counts: counts[rec.id] || { total: 0, submitted: 0, graded: 0, approved: 0 }
    };
  });
  list.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  return ok_({ homeworks: list, serverTime: nowIso_() });
}

function setHomeworkStatus_(req) {
  var status = String(req.status || '');
  if (status !== 'published' && status !== 'closed') throw err_('BAD_REQUEST', 'status must be published|closed');
  var found = findHomework_(String(req.id || ''));
  if (!found) throw err_('NOT_FOUND', 'Homework not found');
  var rec = found.row.rec;
  rec.status = status;
  var f = found.row.fixed;
  var hash = writeRow_(found.sh, HW_FIXED, found.row.rowIndex, [f[0], f[1], status, f[3], f[4], f[5]], rec);
  verifyRow_(found.sh, HW_FIXED, found.row.rowIndex, rec.id, hash);
  return ok_({ id: rec.id, status: status, persisted: true });
}

// =====================================================================================
// Grading (pure functions — no Sheets access; unit-tested in tests/)
// =====================================================================================

function isManualQ_(q) { return q.needsManualGrading === true || q.type === 'audio_record'; }
function maxPoints_(q) { return (typeof q.points === 'number' && q.points > 0) ? q.points : 1; }

/** Returns {earned, isCorrect} for an auto-graded question. Mirrors games/homework-play.js exactly. */
function autoGradeQuestion_(q, ans) {
  var pts = maxPoints_(q);
  var earned = 0, isCorrect = false, i;
  if (q.type === 'matrix_order') {
    var rows = 0;
    if (Array.isArray(ans) && Array.isArray(q.correctAnswer)) {
      for (i = 0; i < q.correctAnswer.length; i++) if (ans[i] === q.correctAnswer[i]) rows++;
    }
    earned = rows; isCorrect = (rows === pts);
  } else if (q.type === 'dual_dropdown') {
    var parts = 0;
    if (Array.isArray(ans) && Array.isArray(q.correctAnswer)) {
      if (ans[0] === q.correctAnswer[0]) parts++;
      if (ans[1] === q.correctAnswer[1]) parts++;
    }
    earned = parts; isCorrect = (parts === pts);
  } else if (q.type === 'checkbox') {
    if (Array.isArray(ans) && Array.isArray(q.correctAnswer) && ans.length === q.correctAnswer.length) {
      var a = ans.slice().sort(), b = q.correctAnswer.slice().sort();
      isCorrect = a.every(function (v, idx) { return v === b[idx]; });
    }
    earned = isCorrect ? pts : 0;
  } else {
    isCorrect = (ans === q.correctAnswer);
    earned = isCorrect ? pts : 0;
  }
  return { earned: Math.min(earned, pts), isCorrect: isCorrect };
}

function displayAnswer_(q, ans) {
  if (q.type === 'audio_record') return ans ? '[audio recorded]' : 'no recording';
  if (q.type === 'matching') {
    var obj = (ans && typeof ans === 'object') ? ans : {};
    var keys = Object.keys(obj);
    if (!keys.length) return 'no answer';
    return keys.map(function (l) {
      var L = (q.leftItems || []).filter(function (x) { return x.id === l; })[0];
      var R = (q.rightItems || []).filter(function (x) { return x.id === obj[l]; })[0];
      return '(' + (L ? L.text : l) + ' ⇄ ' + (R ? R.text : obj[l]) + ')';
    }).join(' ، ');
  }
  if (Array.isArray(ans)) return ans.map(function (x) { return x || 'blank'; }).join(' ، ');
  if (ans === undefined || ans === null || ans === '') return 'no answer';
  return String(ans);
}

function displayCorrect_(q) {
  if (q.type === 'matching') {
    return (q.correctAnswer || []).map(function (p) {
      var L = (q.leftItems || []).filter(function (x) { return x.id === p.left; })[0];
      var R = (q.rightItems || []).filter(function (x) { return x.id === p.right; })[0];
      return '(' + (L ? L.text : p.left) + ' ⇄ ' + (R ? R.text : p.right) + ')';
    }).join(' ، ');
  }
  return Array.isArray(q.correctAnswer) ? q.correctAnswer.join(' ، ') : (q.correctAnswer === undefined ? '' : q.correctAnswer);
}

/**
 * Grades a full submission from the STORED homework definition (never trusts client scores).
 * details[] keeps the same field names the existing Dar Ham grading room uses, plus qid/rawAnswer.
 */
function gradeSubmissionData_(questions, answers, manualScores) {
  answers = answers || {};
  manualScores = manualScores || {};
  var details = [];
  var autoEarned = 0, autoTotal = 0;      // provisional (auto-only) — same formula as existing system
  var earnedAll = 0, totalAll = 0;        // final (auto + manual)
  var ungraded = 0;

  questions.forEach(function (q) {
    var ans = answers[q.id];
    var pts = maxPoints_(q);
    var manual = isManualQ_(q);
    var d = {
      qid: q.id,
      question: q.text,
      type: q.type,
      studentAnswer: displayAnswer_(q, ans) + (manual ? ' (awaiting teacher grading)' : ''),
      correctAnswer: displayCorrect_(q),
      isCorrect: false,
      needsManualGrading: manual,
      points: pts,
      rawAnswer: ans === undefined ? null : ans,
      audioData: q.type === 'audio_record' ? (ans || null) : null,
      matchingData: q.type === 'matching' ? {
        leftItems: q.leftItems, rightItems: q.rightItems,
        studentPairs: (ans && typeof ans === 'object') ? ans : {}, correctPairs: q.correctAnswer
      } : null
    };
    totalAll += pts;
    if (manual) {
      var ms = manualScores[q.id];
      if (typeof ms === 'number' && !isNaN(ms)) {
        d.manualScore = Math.max(0, Math.min(pts, Math.round(ms)));
        earnedAll += d.manualScore;
      } else {
        ungraded++;
      }
    } else {
      var g = autoGradeQuestion_(q, ans);
      d.isCorrect = g.isCorrect;
      autoTotal += pts; autoEarned += g.earned;
      earnedAll += g.earned;
    }
    details.push(d);
  });

  return {
    details: details,
    provisionalScore: autoTotal > 0 ? Math.round((autoEarned / autoTotal) * 100) : 100,
    finalScore: totalAll > 0 ? Math.round((earnedAll / totalAll) * 100) : 0,
    earnedPoints: earnedAll,
    totalPoints: totalAll,
    ungradedManual: ungraded
  };
}

// =====================================================================================
// Submissions
// =====================================================================================

function loadSubmissionRows_() {
  var sh = getSheet_(SHEET_SUB);
  return { sh: sh, rows: readAllRows_(sh, SUB_FIXED) };
}

function fixedForSub_(rec) {
  return [rec.id, rec.hwId, rec.clientSubmissionId, rec.studentName, normName_(rec.studentName),
    (rec.studentId === undefined || rec.studentId === null) ? '' : String(rec.studentId),
    rec.status, rec.provisionalScore, rec.finalScore === null ? '' : rec.finalScore, rec.earnedPoints, rec.totalPoints,
    rec.submittedAt, rec.gradedAt || '', rec.approvedAt || '', rec.version];
}

function publicReceipt_(rec, extra) {
  var r = { ok: true, persisted: true, submissionId: rec.id, clientSubmissionId: rec.clientSubmissionId,
    status: rec.status, submittedAt: rec.submittedAt, needsGrading: rec.status === 'submitted' };
  if (extra) for (var k in extra) r[k] = extra[k];
  return r;
}

function submit_(req) {
  var hwId = String(req.hwId || '');
  var clientId = String(req.clientSubmissionId || '');
  if (!/^HW_[0-9a-f]{32}$/.test(hwId)) throw err_('NOT_FOUND', 'Homework not found');
  if (!/^[A-Za-z0-9_\-]{8,80}$/.test(clientId)) throw err_('BAD_REQUEST', 'clientSubmissionId invalid');
  if (typeof req.answers !== 'object' || req.answers === null || Array.isArray(req.answers)) throw err_('BAD_REQUEST', 'answers must be an object');

  var found = findHomework_(hwId);
  if (!found || !found.row.rec) throw err_('NOT_FOUND', 'Homework not found');
  var hw = found.row.rec;

  var loaded = loadSubmissionRows_();
  var i;
  // 1) Idempotency: same clientSubmissionId => return the stored one, never create a duplicate.
  for (i = 0; i < loaded.rows.length; i++) {
    if (String(loaded.rows[i].fixed[2]) === clientId && loaded.rows[i].rec) {
      return publicReceipt_(loaded.rows[i].rec, { duplicate: true });
    }
  }
  if (hw.status === 'closed') throw err_('CLOSED', 'This homework is closed');

  // 2) Identity: assigned homework forces the assigned name; otherwise a name is required.
  var studentName = hw.assignedStudentName ? String(hw.assignedStudentName) : String(req.studentName || '').replace(/\s+/g, ' ').trim();
  if (studentName.length < 2 || studentName.length > 80) throw err_('BAD_REQUEST', 'A student name (2-80 characters) is required');
  var norm = normName_(studentName);

  // 3) One active submission per student per homework (teacher can void to allow a re-submit).
  var countForHw = 0;
  for (i = 0; i < loaded.rows.length; i++) {
    var f = loaded.rows[i].fixed;
    if (String(f[1]) !== hwId || String(f[6]) === 'void') continue;
    countForHw++;
    if (String(f[4]) === norm) {
      var dupErr = err_('ALREADY_SUBMITTED', 'This student already submitted this homework');
      dupErr.extra = { submittedAt: String(f[11] || '') };
      throw dupErr;
    }
  }
  if (countForHw >= MAX_SUBMISSIONS_PER_HW) throw err_('LIMIT', 'Submission limit reached for this homework');

  // 4) Grade on the server from the stored definition.
  var g = gradeSubmissionData_(hw.questions, req.answers, null);
  var rec = {
    id: newId_('SUB_'),
    hwId: hwId,
    clientSubmissionId: clientId,
    studentName: studentName,
    studentId: (hw.assignedStudentId === undefined || hw.assignedStudentId === null) ? null : hw.assignedStudentId,
    status: 'submitted',
    score: g.provisionalScore,           // existing contract: `score` = percentage (0-100)
    provisionalScore: g.provisionalScore,
    finalScore: null,
    earnedPoints: null,
    totalPoints: g.totalPoints,
    date: nowIso_().slice(0, 10),
    timestamp: Date.now(),               // server clock (fixes the old phone-clock-skew rejection)
    submittedAt: nowIso_(),
    gradedAt: null,
    approvedAt: null,
    version: 1,
    clientMeta: req.clientMeta ? JSON.stringify(req.clientMeta).slice(0, 500) : null,
    answers: req.answers,
    details: g.details
  };
  var rowIndex = nextRow_(loaded.sh, SUB_FIXED);
  var hash = writeRow_(loaded.sh, SUB_FIXED, rowIndex, fixedForSub_(rec), rec);
  verifyRow_(loaded.sh, SUB_FIXED, rowIndex, rec.id, hash);
  return publicReceipt_(rec, { receipt: { row: rowIndex, hash: hash } });
}

function listSubmissions_(req) {
  var loaded = loadSubmissionRows_();
  var hwId = req.hwId ? String(req.hwId) : null;
  var statuses = Array.isArray(req.statuses) ? req.statuses : null;
  var list = [];
  loaded.rows.forEach(function (r) {
    if (!r.rec) return;
    if (hwId && r.rec.hwId !== hwId) return;
    if (r.rec.status === 'void') return;
    if (statuses && statuses.indexOf(r.rec.status) === -1) return;
    list.push(r.rec);
  });
  list.sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });
  return ok_({ submissions: list, serverTime: nowIso_() });
}

function gradeSubmission_(req) {
  var loaded = loadSubmissionRows_();
  var target = null, i;
  for (i = 0; i < loaded.rows.length; i++) if (String(loaded.rows[i].fixed[0]) === String(req.submissionId)) target = loaded.rows[i];
  if (!target || !target.rec) throw err_('NOT_FOUND', 'Submission not found');
  var rec = target.rec;
  if (rec.status === 'void') throw err_('NOT_FOUND', 'Submission was voided');
  if (req.expectedVersion !== undefined && Number(req.expectedVersion) !== rec.version) {
    throw err_('VERSION_CONFLICT', 'Submission changed since you loaded it; reload and retry');
  }
  var hwFound = findHomework_(rec.hwId);
  if (!hwFound || !hwFound.row.rec) throw err_('NOT_FOUND', 'Homework definition missing');

  // Merge previously saved manual scores with new ones (new wins).
  var merged = {};
  (rec.details || []).forEach(function (d) { if (d.manualScore !== undefined) merged[d.qid] = d.manualScore; });
  var incoming = req.manualScores || {};
  for (var k in incoming) if (Object.prototype.hasOwnProperty.call(incoming, k)) merged[k] = Number(incoming[k]);

  var g = gradeSubmissionData_(hwFound.row.rec.questions, rec.answers, merged);
  var finalize = req.finalize === true;
  if (finalize && g.ungradedManual > 0) throw err_('UNGRADED_QUESTIONS', g.ungradedManual + ' question(s) still need a teacher score');

  rec.details = g.details;
  rec.finalScore = g.finalScore;
  rec.earnedPoints = g.earnedPoints;
  rec.totalPoints = g.totalPoints;
  rec.score = g.finalScore;
  rec.gradedAt = nowIso_();
  rec.status = finalize ? 'approved' : 'graded';
  if (finalize) rec.approvedAt = nowIso_();
  if (req.studentId !== undefined && req.studentId !== null) rec.studentId = req.studentId;
  rec.version = (rec.version || 1) + 1;

  var hash = writeRow_(loaded.sh, SUB_FIXED, target.rowIndex, fixedForSub_(rec), rec);
  verifyRow_(loaded.sh, SUB_FIXED, target.rowIndex, rec.id, hash);
  return ok_({ persisted: true, submission: rec });
}

function voidSubmission_(req) {
  var loaded = loadSubmissionRows_();
  var target = null, i;
  for (i = 0; i < loaded.rows.length; i++) if (String(loaded.rows[i].fixed[0]) === String(req.submissionId)) target = loaded.rows[i];
  if (!target || !target.rec) throw err_('NOT_FOUND', 'Submission not found');
  var rec = target.rec;
  rec.status = 'void';
  rec.version = (rec.version || 1) + 1;
  var hash = writeRow_(loaded.sh, SUB_FIXED, target.rowIndex, fixedForSub_(rec), rec);
  verifyRow_(loaded.sh, SUB_FIXED, target.rowIndex, rec.id, hash);
  return ok_({ persisted: true, submissionId: rec.id, status: 'void' });
}
