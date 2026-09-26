// js/api.js — the ONLY module that talks to the backend. The frontend never knows whether the
// backend is Apps Script, a Cloudflare Worker or Supabase: swap this file's transport and nothing else changes.
//
// Contract (see backend/Code.gs):  every response is JSON {ok:boolean, code?:string, message?:string, ...}
// Writes are only "confirmed" when the server says persisted:true (it re-read the stored row).

// After deploying the Lab to GitHub Pages and the backend as a web app, paste the /exec URL here
// (optional — otherwise each browser stores it via index.html). Shorter student links if set.
export const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbzynu0klKsGI3W168LfxV6LVTDk8pRHVFvATpug4iJR0o_jwRDi128RwBMCgAg52Q7L/exec';

const LS_URL = 'dhlab_api_url';
const LS_KEY = 'dhlab_teacher_key';
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
export function getTeacherKey() { return lsGet(LS_KEY) || ''; }
export function setTeacherKey(k) { lsSet(LS_KEY, k); }
export function clearTeacherKey() { try { localStorage.removeItem(LS_KEY); } catch (e) {} }

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
  if (opts.teacher) payload.teacherKey = getTeacherKey();
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
    UNAUTHORIZED: 'مفتاح المعلم غير صحيح.', LOCKED: 'محاولات كثيرة خاطئة. انتظر 10 دقائق.',
    NOT_FOUND: 'الواجب غير موجود (الرابط غير صحيح).', CLOSED: 'هذا الواجب مغلق من المعلم.',
    ALREADY_SUBMITTED: 'تم تسليم هذا الواجب مسبقاً بهذا الاسم.', BUSY: 'الخادم مشغول، سيُعاد المحاولة.',
    NOT_PERSISTED: 'لم يتأكد الخادم من حفظ البيانات.', PERSIST_VERIFY_FAILED: 'فشل التحقق من الحفظ في الخادم.',
    UNGRADED_QUESTIONS: 'ما زالت هناك أسئلة تحتاج درجة من المعلم قبل الاعتماد.', VERSION_CONFLICT: 'تغيّرت النتيجة من مكان آخر، أعد التحميل.',
    NOT_CONFIGURED: 'لم يتم تشغيل setup() في الخادم بعد.', NOT_SET_UP: 'لم يتم تشغيل setup() في الخادم بعد.', TOO_LARGE: 'حجم البيانات أكبر من المسموح.'
  };
  return map[e.code] || (e.message + (e.code ? ` (${e.code})` : ''));
}
