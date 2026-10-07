/**
 * Dar Ham Homework Lab — Backend (Google Apps Script Web App + Google Sheets as storage only)
 * ============================================================================================
 * Version 1.0.0
 *
 * Setup (5 minutes, see README.md):
 *   1. Create a NEW Google Sheet (name it e.g. "DarHam Homework DB").
 *   2. Extensions -> Apps Script -> paste this whole file into Code.gs -> Save.
 *   3. Run the function `setup` once (authorize when asked). It creates the sheets. There is NO
 *      teacher key any more: teachers identify themselves with Google Sign-In only (see below).
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
 *         userId:'...', sessionKey:'...', ...}     (teacher only — issued by googleSignIn)
 *   POST {action:'googleSignIn', idToken:'...'}    (public — the Google ID token is the proof)
 *
 * The client MUST send POST bodies as Content-Type: text/plain (a "simple request", so the
 * browser does not send a CORS preflight, which Apps Script cannot answer).
 */

// If you created the script from script.google.com (standalone, NOT from inside the sheet), paste the
// Google Sheet id here (the long text between /d/ and /edit in the sheet's URL). Otherwise leave ''.
// 🌟 [إصلاح 2026-09-29] معرّف شيت "قاعدة واجبات دار حم". كان فارغًا هنا فيُمسح المعرّف المضبوط في السكربت
// المنشور كلما لُصقت هذه النسخة، فيرجع getActiveSpreadsheet() بـ null ويظهر SERVER_ERROR في كل الطلبات.
var SPREADSHEET_ID = '1nuVzb4suJDIZaD2uk8Iex4qf9sLc15Iy3ogaoxP3aDs';

function ss_() {
  return SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

var VERSION = '1.3.0';   // 🌟 1.3.0: Google Sign-In is the ONLY teacher auth (Teacher Key + email allowlist removed)
// 🌟 [جديد 2026-10-01] Client ID العلني للواجهة (نفس GOOGLE_CLIENT_ID في core/api.js) — احتياطي لو لم تُضبط الخاصية في Script Properties
var DEFAULT_GOOGLE_CLIENT_ID = '52157264045-l30vua64vk6018jjv53j14qpf716rmr8.apps.googleusercontent.com';
var SHEET_HW = 'Homeworks';
var SHEET_SUB = 'Submissions';
var SHEET_TEACHERS = 'Teachers';    // 🌟 multi-teacher: Google-authenticated teacher accounts
var CHUNK_SIZE = 45000;            // Sheets cell limit is 50,000 chars
var MAX_CHUNKS = 8;                // => max ~360 KB per record
var MAX_BODY_CHARS = 300000;
var MAX_QUESTIONS = 60;
var MAX_SUBMISSIONS_PER_HW = 500;
var LOCK_WAIT_MS = 25000;
// 🌟 [جديد — تدقيق 2026-09-29] حدّ أقصى لعدد الواجبات لكل معلم (وإجمالي عام) حتى لا يملأ حسابٌ واحد الشيت
var MAX_HOMEWORKS_PER_TEACHER = 300;
var MAX_HOMEWORKS_TOTAL = 3000;

// Fixed (indexed) columns before the JSON chunks. Column numbers are 1-based.
var HW_FIXED = ['id', 'createdAt', 'status', 'assignedStudentName', 'assignedStudentId', 'questionCount'];
var SUB_FIXED = ['id', 'hwId', 'clientSubmissionId', 'studentName', 'studentNameNorm', 'studentId',
  'status', 'provisionalScore', 'finalScore', 'earnedPoints', 'totalPoints',
  'submittedAt', 'gradedAt', 'approvedAt', 'version'];
// 🌟 multi-teacher: indexed by both userId (our internal id) and googleSub (Google's stable id).
// `ownerId` on Homeworks is NOT a new physical column (see createHomework_) — it lives inside the
// existing JSON blob, exactly like `meta`/`assignedStudentId` already do. That means zero changes
// to the Homeworks/Submissions sheet schema, so no migration of already-deployed rows is needed.
var TEACHERS_FIXED = ['userId', 'googleSub'];

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
      case 'ping':             return out_(ok_({ version: VERSION, serverTime: nowIso_(), configured: true }));
      case 'getHomework':      return out_(getHomeworkPublic_(req));
      case 'submit':           return out_(withLock_(function () { return submit_(req); }));

      // 🌟 multi-teacher: public (no prior auth needed) — the Google ID token IS the proof of identity.
      // 🌟🌟 [2026-10-03] حُذف إجراء migrateLegacyKey مع حذف مفتاح المعلم — ربط الواجبات القديمة صار من محرّر
      // Apps Script فقط بواسطة مالك السكربت (assignLegacyHomeworksToEmail أدناه)، بلا أي مفتاح في الواجهة.
      case 'googleSignIn':     return out_(withLock_(function () { return googleSignIn_(req); }));

      case 'authCheck': {
        var authA = authenticateTeacher_(req);
        return out_(ok_({ teacher: true, userId: authA.userId }));
      }
      case 'createHomework': {
        var authC = authenticateTeacher_(req);
        return out_(withLock_(function () { return createHomework_(req, authC); }));
      }
      case 'listHomeworks': {
        var authL = authenticateTeacher_(req);
        return out_(listHomeworks_(authL));
      }
      case 'getHomeworkFull': {
        var authF = authenticateTeacher_(req);
        return out_(getHomeworkFull_(req, authF));
      }
      case 'setHomeworkStatus': {
        var authS = authenticateTeacher_(req);
        return out_(withLock_(function () { return setHomeworkStatus_(req, authS); }));
      }
      case 'listSubmissions': {
        var authLS = authenticateTeacher_(req);
        return out_(listSubmissions_(req, authLS));
      }
      case 'gradeSubmission': {
        var authG = authenticateTeacher_(req);
        return out_(withLock_(function () { return gradeSubmission_(req, authG); }));
      }
      case 'voidSubmission': {
        var authV = authenticateTeacher_(req);
        return out_(withLock_(function () { return voidSubmission_(req, authV); }));
      }
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

/** Run once from the Apps Script editor. Idempotent.
 *  🌟🌟 [2026-10-03] لم يعد يُنشئ مفتاح معلم (TEACHER_KEY) — الدخول لنظام الواجبات بجوجل فقط. ويمسح خاصيتَي
 *  TEACHER_KEY و TEACHER_EMAILS القديمتين لو وُجدتا (لم يعد أي كود يقرؤهما، فمسحهما لا يمس أي بيانات). */
function setup() {
  var ss = ss_();
  ensureSheet_(ss, SHEET_HW, HW_FIXED, MAX_CHUNKS);
  ensureSheet_(ss, SHEET_SUB, SUB_FIXED, MAX_CHUNKS);
  ensureSheet_(ss, SHEET_TEACHERS, TEACHERS_FIXED, MAX_CHUNKS);
  var removed = removeObsoleteAuthProperties_();
  Logger.log('DarHam Homework is ready (Google Sign-In only).' + (removed.length ? ' Removed obsolete properties: ' + removed.join(', ') : ''));
  return true;
}

/** 🌟 [2026-10-03] خصائص المصادقة القديمة: مفتاح المعلم المشترك وقائمة البريد البيضاء. لا يقرؤها أي كود بعد الآن. */
function removeObsoleteAuthProperties_() {
  var props = PropertiesService.getScriptProperties();
  var removed = [];
  ['TEACHER_KEY', 'TEACHER_EMAILS'].forEach(function (k) {
    if (props.getProperty(k) !== null) { props.deleteProperty(k); removed.push(k); }
  });
  return removed;
}

// =====================================================================================
// 🌟 multi-teacher: Google Sign-In identity (backend/js/teacherAuth.js on the frontend)
// =====================================================================================
//
// Design (documented explicitly, per project convention, since the brief left this open):
//   - Each teacher gets a permanent internal `userId` (never their email) the first time they sign
//     in with Google, plus a random `sessionKey` (kept in the Teachers sheet). The frontend stores
//     {userId, sessionKey} and sends BOTH on every teacher-only call.
//     The server never trusts a client-supplied ownerId/userId by itself — it always re-derives the
//     caller's identity from a value (sessionKey) it alone issued and can look up.
//   - 🌟🌟 [2026-10-03] Google Sign-In is the ONLY way in. The old shared TEACHER_KEY (and its admin
//     bypass, lockout counter and `migrateLegacyKey` action) and the TEACHER_EMAILS allowlist were
//     removed: any teacher with a verified Google email gets their own isolated account. Isolation
//     between teachers comes from ownerId (below), not from an allowlist.
//   - `ownerId` is stored INSIDE each homework's JSON record (like `meta`/`assignedStudentId`
//     already are), not as a new physical sheet column — so no destructive migration of the already
//     deployed Homeworks/Submissions sheets is needed. Homeworks created before multi-teacher, or
//     created with the old shared key, have no ownerId ("legacy / unowned") — they are NOT deleted.
//   - Those unowned homeworks belong to the teacher recorded in Script Property LEGACY_OWNER_USERID
//     (set once — either earlier by the old migrateLegacyKey flow, or now by the script owner running
//     assignLegacyHomeworksToEmail('teacher@gmail.com') from the Apps Script editor). No other Google
//     account is ever guessed into owning them.

function verifyGoogleIdToken_(idToken) {
  if (!idToken || typeof idToken !== 'string') throw err_('BAD_REQUEST', 'idToken required');
  var resp;
  try {
    resp = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  } catch (e) { throw err_('SERVER_ERROR', 'Could not reach Google to verify sign-in'); }
  var data = null;
  try { data = JSON.parse(resp.getContentText()); } catch (e) { data = null; }
  if (resp.getResponseCode() !== 200 || !data || !data.sub) throw err_('UNAUTHORIZED', 'Invalid or expired Google sign-in');
  if (String(data.iss) !== 'accounts.google.com' && String(data.iss) !== 'https://accounts.google.com') {
    throw err_('UNAUTHORIZED', 'Untrusted token issuer');
  }
  // 🌟🌟 [عُدّل 2026-10-03] التسجيل مفتوح لأي معلم: أي حساب جوجل ببريد موثَّق يُسجَّل تلقائيًا ويحصل على حسابه المعزول.
  //   • حُذفت قائمة البريد البيضاء TEACHER_EMAILS نهائيًا — كانت هي مصدر رسالة "هذا البريد غير مسموح له..." على
  //     الأجهزة الجديدة (لم تكن تظهر على جهاز قديم لأن جلسته/مفتاحه محفوظ محليًا فلا يُستدعى googleSignIn أصلًا).
  //   • GOOGLE_CLIENT_ID (Script Property) اختياري: لو لم يُضبط نستخدم DEFAULT_GOOGLE_CLIENT_ID الثابت (ليس سرًّا). فحص aud يبقى إجباريًا.
  //   • الحماية من إساءة الاستخدام باقية: لكل معلم حد MAX_HOMEWORKS_PER_TEACHER وإجمالي MAX_HOMEWORKS_TOTAL، وكل معلم لا يرى إلا واجباته.
  var props = PropertiesService.getScriptProperties();
  var clientId = props.getProperty('GOOGLE_CLIENT_ID') || DEFAULT_GOOGLE_CLIENT_ID;
  if (String(data.aud) !== clientId) throw err_('UNAUTHORIZED', 'Token was issued for a different app');
  var mail = data.email ? String(data.email).toLowerCase() : '';
  if (!mail || String(data.email_verified) === 'false') throw err_('UNAUTHORIZED', 'This Google account has no verified email');
  return { sub: String(data.sub), email: data.email ? String(data.email) : null, name: data.name ? String(data.name) : null };
}

function getTeachersSheet_() {
  var ss = ss_();
  var sh = ss.getSheetByName(SHEET_TEACHERS);
  if (!sh) sh = ensureSheet_(ss, SHEET_TEACHERS, TEACHERS_FIXED, MAX_CHUNKS);
  return sh;
}
function findTeacherBySub_(sub) {
  var rows = readAllRows_(getTeachersSheet_(), TEACHERS_FIXED);
  for (var i = 0; i < rows.length; i++) if (rows[i].rec && rows[i].rec.googleSub === sub) return { sh: getTeachersSheet_(), row: rows[i] };
  return null;
}
function findTeacherByUserId_(userId) {
  var rows = readAllRows_(getTeachersSheet_(), TEACHERS_FIXED);
  for (var i = 0; i < rows.length; i++) if (rows[i].rec && rows[i].rec.userId === userId) return { sh: getTeachersSheet_(), row: rows[i] };
  return null;
}
function createTeacher_(sub, email, name) {
  var sh = getTeachersSheet_();
  var userId = newId_('T_');
  var rec = { userId: userId, googleSub: sub, email: email || null, name: name || null,
    sessionKey: randomKey_(24), createdAt: nowIso_(), lastLoginAt: nowIso_() };
  var rowIndex = nextRow_(sh, TEACHERS_FIXED);
  var hash = writeRow_(sh, TEACHERS_FIXED, rowIndex, [userId, sub], rec);
  verifyRow_(sh, TEACHERS_FIXED, rowIndex, userId, hash);
  return rec;
}
function touchTeacherLogin_(found) {
  var rec = found.row.rec;
  rec.lastLoginAt = nowIso_();
  var hash = writeRow_(found.sh, TEACHERS_FIXED, found.row.rowIndex, [rec.userId, rec.googleSub], rec);
  verifyRow_(found.sh, TEACHERS_FIXED, found.row.rowIndex, rec.userId, hash);
  return rec;
}

/** googleSignIn: {idToken} -> permanent userId + sessionKey the frontend stores for every future call. */
function googleSignIn_(req) {
  var info = verifyGoogleIdToken_(req.idToken);
  var found = findTeacherBySub_(info.sub);
  var isNew = !found;
  var rec = found ? touchTeacherLogin_(found) : createTeacher_(info.sub, info.email, info.name);
  return ok_({ userId: rec.userId, sessionKey: rec.sessionKey, email: rec.email, isNewTeacher: isNew });
}

/** 🌟🌟 [جديد 2026-10-03 — بديل migrateLegacyKey بلا مفتاح] تشغَّل يدويًا من محرّر Apps Script فقط (ليست إجراء ويب،
 *  فلا يستطيع أي زائر استدعاءها): تربط الواجبات القديمة بلا مالك (المنشورة قبل تعدّد المعلمين أو بالمفتاح القديم)
 *  بحساب المعلم صاحب هذا البريد. يجب أن يكون المعلم قد سجّل الدخول بجوجل مرة واحدة على الأقل (حتى يوجد له صف في
 *  شيت Teachers). لا تحذف ولا تعدّل أي واجب — تكتب فقط LEGACY_OWNER_USERID. لا تستبدل مالكًا مضبوطًا مسبقًا إلا بـ force.
 *  مثال: assignLegacyHomeworksToEmail('teacher@gmail.com') */
function assignLegacyHomeworksToEmail(email, force) {
  var mail = String(email || '').trim().toLowerCase();
  if (!mail) throw new Error('email required');
  var rows = readAllRows_(getTeachersSheet_(), TEACHERS_FIXED);
  var rec = null;
  for (var i = 0; i < rows.length; i++) if (rows[i].rec && String(rows[i].rec.email || '').toLowerCase() === mail) { rec = rows[i].rec; break; }
  if (!rec) throw new Error('No teacher with this email has signed in with Google yet: ' + mail);
  var props = PropertiesService.getScriptProperties();
  var current = props.getProperty('LEGACY_OWNER_USERID');
  if (current && current !== rec.userId && !force) {
    throw new Error('Legacy homeworks already belong to userId ' + current + '. Call assignLegacyHomeworksToEmail(email, true) to change it.');
  }
  props.setProperty('LEGACY_OWNER_USERID', rec.userId);
  Logger.log('Legacy (unowned) homeworks now belong to ' + mail + ' (userId ' + rec.userId + ')');
  return rec.userId;
}

function isLegacyOwnerUserId_(userId) {
  var v = PropertiesService.getScriptProperties().getProperty('LEGACY_OWNER_USERID');
  return !!v && !!userId && v === userId;
}
/** Access rule for a homework record, shared by every teacher-only read/write below. */
function canAccessHw_(rec, auth) {
  if (rec.ownerId) return rec.ownerId === auth.userId;      // owned record: only its owner
  return isLegacyOwnerUserId_(auth.userId);                 // unowned/legacy record: only the migrated owner
}

/** Resolves the caller's identity from the Google-issued session (userId+sessionKey) — the ONLY teacher auth.
 *  🌟🌟 [2026-10-03] حُذف مسار مفتاح المعلم المشترك (teacherKey) وعدّاد القفل الخاص به نهائيًا: أي طلب بلا جلسة
 *  جوجل صالحة يُرفض UNAUTHORIZED (حتى لو أرسل teacherKey قديمًا). sessionKey عشوائي 24 خانة فلا حاجة لقفل تخمين. */
function authenticateTeacher_(req) {
  if (req.userId && req.sessionKey) {
    var found = findTeacherByUserId_(String(req.userId));
    if (found && found.row.rec && safeEqual_(String(req.sessionKey), String(found.row.rec.sessionKey))) {
      return { userId: found.row.rec.userId };
    }
    Utilities.sleep(400);
    throw err_('UNAUTHORIZED', 'Sign-in session is invalid, please sign in again');
  }
  throw err_('UNAUTHORIZED', 'Sign in with Google to use the homework system');
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

function createHomework_(req, auth) {
  var hw = req.homework || {};
  validateQuestions_(hw.questions);
  // 🌟 [جديد — تدقيق 2026-09-29] حدّ الحصة: لا يستطيع حساب واحد ولا الإجمالي ملء الشيت
  var existing = readAllRows_(getSheet_(SHEET_HW), HW_FIXED);
  if (existing.length >= MAX_HOMEWORKS_TOTAL) throw err_('LIMIT', 'Homework storage is full');
  var mine = 0;
  existing.forEach(function (r) { if (r.rec && r.rec.ownerId === auth.userId) mine++; });
  if (mine >= MAX_HOMEWORKS_PER_TEACHER) throw err_('LIMIT', 'Homework limit reached for this account');
  var id = newId_('HW_');
  var record = {
    id: id,
    createdAt: nowIso_(),
    status: 'published',
    ownerId: auth.userId, // 🌟 multi-teacher: never trust a client-supplied ownerId
    assignedStudentName: hw.assignedStudentName ? String(hw.assignedStudentName).replace(/[<>"'`\u0000-\u001f]/g, '').slice(0, 80) : null,
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

function getHomeworkFull_(req, auth) {
  var found = findHomework_(String(req.id || ''));
  if (!found || !found.row.rec || !canAccessHw_(found.row.rec, auth)) throw err_('NOT_FOUND', 'Homework not found');
  return ok_({ homework: found.row.rec });
}

function listHomeworks_(auth) {
  var hwRows = readAllRows_(getSheet_(SHEET_HW), HW_FIXED).filter(function (r) { return r.rec && canAccessHw_(r.rec, auth); });
  var subRows = readAllRows_(getSheet_(SHEET_SUB), SUB_FIXED);
  var allowedIds = {};
  hwRows.forEach(function (r) { allowedIds[r.rec.id] = true; });
  var counts = {};
  subRows.forEach(function (r) {
    var hwId = String(r.fixed[1]);
    if (!allowedIds[hwId]) return;
    var st = String(r.fixed[6]);
    if (st === 'void') return;
    counts[hwId] = counts[hwId] || { total: 0, submitted: 0, graded: 0, approved: 0 };
    counts[hwId].total++;
    if (counts[hwId][st] !== undefined) counts[hwId][st]++;
  });
  var list = hwRows.map(function (r) {
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

function setHomeworkStatus_(req, auth) {
  var status = String(req.status || '');
  if (status !== 'published' && status !== 'closed') throw err_('BAD_REQUEST', 'status must be published|closed');
  var found = findHomework_(String(req.id || ''));
  if (!found || !found.row.rec || !canAccessHw_(found.row.rec, auth)) throw err_('NOT_FOUND', 'Homework not found');
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
function maxPoints_(q) {
  // سؤال الفراغ الكتابي (كلمة واحدة) درجته 1 دائماً، حتى للواجبات المحفوظة سابقاً بدرجتين.
  if (q.type === 'written_blank') return 1;
  return (typeof q.points === 'number' && q.points > 0) ? q.points : 1; }

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
  } else if (q.type === 'matching') {
    // 🌟🌟 [جديد] تصحيح آلي لسؤال المطابقة — كل زوج (بداية/نهاية) صحيح = نقطة واحدة من points.
    // ans = {leftId: rightId, ...} كما يحفظها الطالب في homework-play.js. correctAnswer = الأزواج
    // الصحيحة الفعلية من بيانات التوليد (لا تخميناً)، فمطابقة ans[p.left] === p.right دقيقة 100%.
    var pairsCorrect = 0;
    if (ans && typeof ans === 'object' && Array.isArray(q.correctAnswer)) {
      q.correctAnswer.forEach(function (p) { if (ans[p.left] === p.right) pairsCorrect++; });
    }
    earned = pairsCorrect; isCorrect = (pts > 0 && pairsCorrect === pts);
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
      // 🌟🌟 [جديد] نُرجع الدرجة الفعلية المكتسبة لكل سؤال آلي (لا فقط صح/خطأ ثنائي) — أسئلة الدرجة
      // الجزئية (matrix_order، dual_dropdown، matching) قد تكسب بعض النقاط دون كل النقاط، وعرضها
      // كـ"خطأ" مطلق يضلّل المعلم. راجع settings/homework-prep.js (openGradingRoom) لمكان الاستخدام.
      d.earnedPoints = g.earned;
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
      // 🌟 [إصلاح] المعرّف يجب أن يخص نفس الواجب؛ كان يعيد إيصال تسليم واجب آخر
      if (String(loaded.rows[i].fixed[1]) !== hwId) throw err_('BAD_REQUEST', 'clientSubmissionId already used for another homework');
      return publicReceipt_(loaded.rows[i].rec, { duplicate: true });
    }
  }
  if (hw.status === 'closed') throw err_('CLOSED', 'This homework is closed');

  // 2) Identity: assigned homework forces the assigned name; otherwise a name is required.
  // 🌟🌟 [جديد — إصلاح XSS في الخادم أيضًا] نحذف <>"'` والرموز التحكمية من اسم الطالب المكتوب يدويًا (دفاع متعدد الطبقات؛
  // الواجهة تنظّف عند العرض كذلك). الأسماء العربية/الإنجليزية العادية لا تتأثر.
  var studentName = hw.assignedStudentName ? String(hw.assignedStudentName) : String(req.studentName || '').replace(/[<>"'`\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim();
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

function listSubmissions_(req, auth) {
  var hwRows = readAllRows_(getSheet_(SHEET_HW), HW_FIXED);
  var allowedIds = {};
  hwRows.forEach(function (r) { if (r.rec && canAccessHw_(r.rec, auth)) allowedIds[r.rec.id] = true; });
  var loaded = loadSubmissionRows_();
  var hwId = req.hwId ? String(req.hwId) : null;
  var statuses = Array.isArray(req.statuses) ? req.statuses : null;
  var list = [];
  loaded.rows.forEach(function (r) {
    if (!r.rec) return;
    if (!allowedIds[r.rec.hwId]) return;
    if (hwId && r.rec.hwId !== hwId) return;
    if (r.rec.status === 'void') return;
    if (statuses && statuses.indexOf(r.rec.status) === -1) return;
    list.push(r.rec);
  });
  list.sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });
  return ok_({ submissions: list, serverTime: nowIso_() });
}

function gradeSubmission_(req, auth) {
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
  if (!hwFound || !hwFound.row.rec || !canAccessHw_(hwFound.row.rec, auth)) throw err_('NOT_FOUND', 'Homework definition missing');

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
  // 🌟 [جديد] ملاحظة المعلم الاختيارية لشهادة التقدير — تُخزَّن داخل JSON التسليم (بلا أي عمود جديد في الشيت).
  // undefined = لا تغيير، نص فارغ = مسح الملاحظة. نص عادي فقط (يُنظَّف في العرض بـ esc) ومقصوص على 300 حرف.
  if (typeof req.teacherNote === 'string') {
    var tn = req.teacherNote.replace(/\s+/g, ' ').trim().slice(0, 300);
    if (tn) rec.teacherNote = tn; else delete rec.teacherNote;
  }
  rec.version = (rec.version || 1) + 1;

  var hash = writeRow_(loaded.sh, SUB_FIXED, target.rowIndex, fixedForSub_(rec), rec);
  verifyRow_(loaded.sh, SUB_FIXED, target.rowIndex, rec.id, hash);
  return ok_({ persisted: true, submission: rec });
}

function voidSubmission_(req, auth) {
  var loaded = loadSubmissionRows_();
  var target = null, i;
  for (i = 0; i < loaded.rows.length; i++) if (String(loaded.rows[i].fixed[0]) === String(req.submissionId)) target = loaded.rows[i];
  if (!target || !target.rec) throw err_('NOT_FOUND', 'Submission not found');
  var hwFound = findHomework_(target.rec.hwId);
  if (!hwFound || !hwFound.row.rec || !canAccessHw_(hwFound.row.rec, auth)) throw err_('NOT_FOUND', 'Submission not found');
  var rec = target.rec;
  rec.status = 'void';
  rec.version = (rec.version || 1) + 1;
  var hash = writeRow_(loaded.sh, SUB_FIXED, target.rowIndex, fixedForSub_(rec), rec);
  verifyRow_(loaded.sh, SUB_FIXED, target.rowIndex, rec.id, hash);
  return ok_({ persisted: true, submissionId: rec.id, status: 'void' });
}

// =====================================================================================
// 🌟🌟 [جديد 2026-10-01] التنظيف التلقائي للواجبات القديمة
// =====================================================================================
// قرارات المعلم (صريحة، وليست افتراضات):
//   1) واجب تم تصحيحه واعتماده: يُحذف هو وكل تسليماته (وبالتالي شهاداته) بعد CLEANUP_APPROVED_DAYS يوماً
//      تُحسب من تاريخ اعتماد آخر تسليم فيه، بلا تنبيه مسبق، ولا يُحذف إلا إذا كانت كل تسليماته معتمدة.
//   2) واجب لم يسلّمه أحد: يُحذف بعد CLEANUP_EMPTY_DAYS يوماً من إنشائه.
//   3) واجب ينتظر تصحيحاً (فيه تسليم submitted/graded): لا يُحذف أبداً.
// ⚠️ افتراضات صريحة من عندي (لم يحسمها المعلم): (أ) تسليم status='void' (ألغاه المعلم) لا يمنع الحذف ولا
// يُحسب كتسليم، لكنه يُحذف مع الواجب؛ (ب) واجب فيه تسليمات ملغاة فقط (لا غيرها) لا يُحذف تلقائياً (متحفّظ)؛
// (ج) إن غاب تاريخ الاعتماد أو كان غير صالح لتسليم معتمد، يُترك الواجب ولا يُحذف.
// الدالة لا تقرأ JSON الأسطر إطلاقاً (الأعمدة الثابتة فقط) فهي سريعة وآمنة حتى مع جدول كبير.
var CLEANUP_APPROVED_DAYS = 20;
var CLEANUP_EMPTY_DAYS = 14;
var CLEANUP_MAX_HW_PER_RUN = 100;   // حد أمان لكل تشغيل حتى لا يتجاوز مهلة Apps Script
var DAY_MS_ = 24 * 60 * 60 * 1000;

function readFixedRows_(sh, fixedCount) {
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(2, 1, last - 1, fixedCount).getValues();
  var rows = [];
  for (var i = 0; i < values.length; i++) if (values[i][0]) rows.push({ rowIndex: i + 2, fixed: values[i] });
  return rows;
}

/**
 * دالة نقية (بلا أي وصول للشيت) تحدد ما سيُحذف. hwFixed/subFixed = [{rowIndex, fixed:[...]}] من readFixedRows_.
 * ترجع { items: [{ id, rowIndex, reason: 'approved'|'empty', subRows: [rowIndex...] }], skippedWaitingGrading: n }.
 */
function computeCleanup_(hwFixed, subFixed, nowMs) {
  var bySub = {};
  subFixed.forEach(function (r) {
    var hwId = String(r.fixed[1]);
    (bySub[hwId] = bySub[hwId] || []).push(r);
  });
  var items = [];
  var waiting = 0;
  hwFixed.forEach(function (h) {
    var id = String(h.fixed[0]);
    var createdMs = Date.parse(String(h.fixed[1]));
    var subs = bySub[id] || [];
    var active = subs.filter(function (s) { return String(s.fixed[6]) !== 'void'; });
    var subRows = subs.map(function (s) { return s.rowIndex; });
    if (subs.length === 0) {
      if (!isNaN(createdMs) && createdMs <= nowMs - CLEANUP_EMPTY_DAYS * DAY_MS_) {
        items.push({ id: id, rowIndex: h.rowIndex, reason: 'empty', subRows: [] });
      }
      return;
    }
    if (active.length === 0) return;                                    // (ب) ملغاة فقط → لا نلمسه
    var allApproved = active.every(function (s) { return String(s.fixed[6]) === 'approved'; });
    if (!allApproved) { waiting++; return; }                            // ينتظر تصحيحاً → لا يُحذف أبداً
    var latest = 0, valid = true;
    active.forEach(function (s) {
      var ms = Date.parse(String(s.fixed[13]));
      if (isNaN(ms)) valid = false; else if (ms > latest) latest = ms;
    });
    if (!valid) return;                                                 // (ج) تاريخ اعتماد غير صالح → لا نحذف
    if (latest <= nowMs - CLEANUP_APPROVED_DAYS * DAY_MS_) {
      items.push({ id: id, rowIndex: h.rowIndex, reason: 'approved', subRows: subRows });
    }
  });
  return { items: items, skippedWaitingGrading: waiting };
}

/** يحذف الأسطر بتجميع المتجاورة منها في نداء deleteRows واحد (من الأسفل للأعلى حتى لا تتزحزح الفهارس). */
function deleteRowsDesc_(sh, indices) {
  var sorted = indices.slice().sort(function (a, b) { return b - a; });
  var deleted = 0, i = 0;
  while (i < sorted.length) {
    var start = sorted[i], count = 1;
    while (i + count < sorted.length && sorted[i + count] === start - count) count++;
    var first = start - count + 1;
    sh.deleteRows(first, count);
    deleted += count;
    i += count;
  }
  return deleted;
}

/** dryRun=true يحسب الخطة فقط بلا أي حذف. يجب استدعاؤها داخل withLock_ عند dryRun=false. */
function runCleanup_(dryRun) {
  var hwSh = getSheet_(SHEET_HW), subSh = getSheet_(SHEET_SUB);
  var plan = computeCleanup_(readFixedRows_(hwSh, HW_FIXED.length), readFixedRows_(subSh, SUB_FIXED.length), Date.now());
  var items = plan.items.slice(0, CLEANUP_MAX_HW_PER_RUN);
  var result = {
    dryRun: !!dryRun,
    homeworks: items.length,
    approved: items.filter(function (x) { return x.reason === 'approved'; }).length,
    empty: items.filter(function (x) { return x.reason === 'empty'; }).length,
    submissions: items.reduce(function (n, x) { return n + x.subRows.length; }, 0),
    skippedWaitingGrading: plan.skippedWaitingGrading,
    ids: items.map(function (x) { return x.id; }),
    errors: []
  };
  if (dryRun || !items.length) return result;
  // التسليمات أولاً ثم الواجبات: لو انقطع التنفيذ بينهما يبقى واجب بلا تسليمات فيُحذف في التشغيل التالي (قاعدة "لم يسلّمه أحد")
  var subIdx = [], hwIdx = [];
  items.forEach(function (x) { x.subRows.forEach(function (r) { subIdx.push(r); }); hwIdx.push(x.rowIndex); });
  try { if (subIdx.length) deleteRowsDesc_(subSh, subIdx); } catch (e) { result.errors.push('submissions: ' + e.message); return result; }
  try { deleteRowsDesc_(hwSh, hwIdx); } catch (e) { result.errors.push('homeworks: ' + e.message); }
  return result;
}

/** شغّلها يدوياً من محرر Apps Script أولاً: تعرض في السجل (Logs) ما سيُحذف بلا حذف فعلي. */
function previewCleanup() {
  var r = withLock_(function () { return runCleanup_(true); });
  Logger.log('PREVIEW (no deletion): ' + JSON.stringify(r));
  return r;
}

/** هذه هي الدالة التي يستدعيها المشغِّل اليومي. */
function dailyCleanup() {
  var r = withLock_(function () { return runCleanup_(false); });
  Logger.log('CLEANUP: ' + JSON.stringify(r));
  return r;
}

/** شغّلها مرة واحدة من محرر Apps Script لتفعيل التنظيف اليومي (الساعة 3 صباحاً تقريباً). تمنع تكرار المشغِّل. */
function installCleanupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'dailyCleanup') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('dailyCleanup').timeBased().everyDays(1).atHour(3).create();
  Logger.log('Daily cleanup trigger installed.');
}

/** لإيقاف التنظيف التلقائي في أي وقت. */
function removeCleanupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'dailyCleanup') ScriptApp.deleteTrigger(t);
  });
  Logger.log('Daily cleanup trigger removed.');
}
