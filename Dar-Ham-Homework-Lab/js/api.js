// js/api.js — the ONLY module that talks to the backend. The frontend never knows whether the
// backend is Apps Script, a Cloudflare Worker or Supabase: swap this file's transport and nothing else changes.
//
// Contract (see backend/Code.gs):  every response is JSON {ok:boolean, code?:string, message?:string, ...}
// Writes are only "confirmed" when the server says persisted:true (it re-read the stored row).

// After deploying the Lab to GitHub Pages and the backend as a web app, paste the /exec URL here
// (optional — otherwise each browser stores it via index.html). Shorter student links if set.
export const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbzynu0klKsGI3W168LfxV6LVTDk8pRHVFvATpug4iJR0o_jwRDi128RwBMCgAg52Q7L/exec';

// 🌟 multi-teacher: OAuth 2.0 Client ID (Web application) from Google Cloud Console, used only by
// Google Identity Services in the browser to render the Sign-In button and request an ID token.
// You must create this yourself — see "Google Cloud configuration" in README.md. It is not a secret
// (client IDs are public by design) but sign-in will not work until it is a real client id.
export const GOOGLE_CLIENT_ID = 'REPLACE_WITH_YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com';

const LS_URL = 'dhlab_api_url';
const LS_KEY = 'dhlab_teacher_key';
const LS_USERID = 'dhlab_teacher_userid';
const LS_SESSIONKEY = 'dhlab_teacher_sessionkey';
const EXEC_RE = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_\-]+\/exec$/;
const isLocalDev = () => ['localhost', '127.0.0.1'].includes(location.hostname);
const LOCAL_RE = /^http:\/\/(localhost|127\.0\.0\.1):\d+\/macros\/s\/[A-Za-z0-9_\-]+\/exec$/;

/** Only Apps Script /exec URLs (or localhost emulator on localhost pages) are accepted — a crafted link
 *  must not be able to point students' browsers at an arbitrary server. */
export function isAllowedApiUrl(u) { return EXEC_RE.test(u) || (isLocalDev() && LOCAL_RE.test(u)); }

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

export function getApiUrl() {
  const fromParam = new URLSearchParams(location.search).get('api');
  if (fromParam && isAllowedApiUrl(fromParam)) return fromParam;
  const stored = lsGet(LS_URL);
  if (stored && isAllowedApiUrl(stored)) return stored;
  return DEFAULT_API_URL || '';
}
export function setApiUrl(u) { if (!isAllowedApiUrl(u)) throw new Error('رابط الـ API غير صالح (يجب أن يكون رابط /exec من Google Apps Script)'); lsSet(LS_URL, u); }

// ---- legacy shared Teacher Key (kept working — see README "Old Teacher Key migration") ----
export function getTeacherKey() { return lsGet(LS_KEY) || ''; }
export function setTeacherKey(k) { lsSet(LS_KEY, k); }
export function clearTeacherKey() { try { localStorage.removeItem(LS_KEY); } catch (e) {} }

// 🌟 multi-teacher: Google-authenticated teacher identity {userId, sessionKey} — set once by
// googleSignIn() below and reused on every subsequent teacher-only call, so the teacher is not
// asked to sign in again on every action (only when this pair is missing or the server rejects it).
export function getTeacherAuth() {
  const userId = lsGet(LS_USERID), sessionKey = lsGet(LS_SESSIONKEY);
  return (userId && sessionKey) ? { userId, sessionKey } : null;
}
export function setTeacherAuth(userId, sessionKey) { lsSet(LS_USERID, userId); lsSet(LS_SESSIONKEY, sessionKey); }
export function clearTeacherAuth() { try { localStorage.removeItem(LS_USERID); localStorage.removeItem(LS_SESSIONKEY); } catch (e) {} }
/** True once the teacher has EITHER a Google session OR the legacy key — i.e. "no login prompt needed". */
export function isTeacherAuthed() { return !!(getTeacherAuth() || getTeacherKey()); }

/** Error thrown for anything that is NOT a confirmed success. `retryable` tells callers if trying again can help. */
export class ApiError extends Error {
  constructor(kind, code, message, extra = {}) { super(message); this.name = 'ApiError'; this.kind = kind; this.code = code; this.retryable = !!extra.retryable; this.extra = extra; }
}
const RETRYABLE_CODES = new Set(['BUSY', 'PERSIST_VERIFY_FAILED', 'SERVER_ERROR']);

async function transport(method, payload, timeoutMs) {
  const base = getApiUrl();
  if (!base) throw new ApiError('config', 'NO_API_URL', 'لم يتم ضبط رابط الخادم بعد');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res, text;
  try {
    if (method === 'GET') {
      const qs = new URLSearchParams(payload).toString();
      res = await fetch(base + '?' + qs, { method: 'GET', redirect: 'follow', cache: 'no-store', signal: ctrl.signal });
    } else {
      // text/plain => "simple request": no CORS preflight (Apps Script cannot answer OPTIONS).
      res = await fetch(base, { method: 'POST', redirect: 'follow', cache: 'no-store', signal: ctrl.signal,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
    }
    text = await res.text();
  } catch (e) {
    clearTimeout(timer);
    if (e && e.name === 'AbortError') throw new ApiError('timeout', 'TIMEOUT', 'انتهت مهلة الاتصال بالخادم', { retryable: true });
    throw new ApiError('network', 'NETWORK', 'تعذّر الاتصال بالخادم (تحقق من الإنترنت)', { retryable: true });
  }
  clearTimeout(timer);
  let json;
  try { json = JSON.parse(text); }
  catch (e) { throw new ApiError('bad_response', 'BAD_RESPONSE', 'ردّ غير متوقع من الخادم (ليس JSON)', { retryable: true, httpStatus: res.status, snippet: String(text).slice(0, 120) }); }
  if (!res.ok && !json) throw new ApiError('server', 'HTTP_' + res.status, 'خطأ من الخادم', { retryable: res.status >= 500 });
  return json;
}

/**
 * call('getHomework', {id})  -> GET   |   call('submit', {...}, {method:'POST'}) -> POST
 * Resolves ONLY with a successful (ok:true) response; anything else throws ApiError.
 * For writes pass {write:true}: additionally requires persisted:true (server-side read-back proof).
 */
export async function call(action, params = {}, opts = {}) {
  const method = opts.method || (['ping', 'getHomework'].includes(action) ? 'GET' : 'POST');
  const timeoutMs = opts.timeoutMs || 25000;
  const payload = method === 'GET' ? { action, ...params } : { action, ...params };
  if (opts.teacher) {
    // 🌟 multi-teacher: prefer the Google session; fall back to the legacy shared key untouched.
    const auth = getTeacherAuth();
    if (auth) { payload.userId = auth.userId; payload.sessionKey = auth.sessionKey; }
    else payload.teacherKey = getTeacherKey();
  }
  const t0 = performance.now();
  const json = await transport(method, payload, timeoutMs);
  const ms = Math.round(performance.now() - t0);
  if (!json || json.ok !== true) {
    const code = (json && json.code) || 'SERVER_ERROR';
    throw new ApiError('server', code, (json && json.message) || 'خطأ من الخادم', { retryable: RETRYABLE_CODES.has(code), ms, ...(json || {}) });
  }
  if (opts.write && json.persisted !== true) {
    throw new ApiError('unconfirmed', 'NOT_PERSISTED', 'الخادم لم يؤكّد حفظ البيانات', { retryable: true, ms });
  }
  json._ms = ms;
  return json;
}

/** Reads (GET) are safe to repeat: small automatic retry with backoff. Writes are NEVER auto-retried here. */
export async function callWithRetry(action, params, opts = {}, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { return await call(action, params, opts); }
    catch (e) { last = e; if (!(e instanceof ApiError) || !e.retryable || i === tries - 1) throw e; await new Promise(r => setTimeout(r, 700 * (i + 1))); }
  }
  throw last;
}

export function friendlyError(e) {
  if (!(e instanceof ApiError)) return String(e && e.message || e);
  const map = {
    NO_API_URL: 'لم يتم ضبط رابط الخادم. افتح الصفحة الرئيسية للمعمل وأدخله.',
    NETWORK: 'لا يوجد اتصال بالإنترنت أو الخادم لا يستجيب.', TIMEOUT: 'الخادم تأخّر في الرد. حاول مرة أخرى.',
    BAD_RESPONSE: 'رد غير مفهوم من الخادم (ربما لم يُنشر الـ Web App بشكل صحيح).',
    UNAUTHORIZED: 'الجلسة غير صحيحة أو مفتاح المعلم خاطئ. سجّل الدخول مرة أخرى.', LOCKED: 'محاولات كثيرة خاطئة. انتظر 10 دقائق.',
    NOT_FOUND: 'الواجب غير موجود (الرابط غير صحيح).', CLOSED: 'هذا الواجب مغلق من المعلم.',
    ALREADY_SUBMITTED: 'تم تسليم هذا الواجب مسبقاً بهذا الاسم.', BUSY: 'الخادم مشغول، سيُعاد المحاولة.',
    NOT_PERSISTED: 'لم يتأكد الخادم من حفظ البيانات.', PERSIST_VERIFY_FAILED: 'فشل التحقق من الحفظ في الخادم.',
    UNGRADED_QUESTIONS: 'ما زالت هناك أسئلة تحتاج درجة من المعلم قبل الاعتماد.', VERSION_CONFLICT: 'تغيّرت النتيجة من مكان آخر، أعد التحميل.',
    NOT_CONFIGURED: 'لم يتم تشغيل setup() في الخادم بعد.', NOT_SET_UP: 'لم يتم تشغيل setup() في الخادم بعد.', TOO_LARGE: 'حجم البيانات أكبر من المسموح.'
  };
  return map[e.code] || (e.message + (e.code ? ` (${e.code})` : ''));
}

// ============================================================================ 🌟 multi-teacher
/** Verifies idToken server-side, gets back the permanent userId + sessionKey, and stores them
 *  (getTeacherAuth() above) so every subsequent {teacher:true} call is authenticated automatically. */
export async function googleSignIn(idToken) {
  const r = await call('googleSignIn', { idToken });
  setTeacherAuth(r.userId, r.sessionKey);
  return r;
}
/** One-time claim of pre-existing unowned ("legacy") homeworks for the signed-in Google account.
 *  Safe to call even if already claimed (idempotent) or claimed by someone else (returns claimed:false). */
export async function migrateLegacyKey(idToken, teacherKey) {
  const r = await call('migrateLegacyKey', { idToken, teacherKey });
  setTeacherAuth(r.userId, r.sessionKey);
  return r;
}
