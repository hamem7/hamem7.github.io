// core/api.js
// ==========================================================
// 🌟🌟 [جديد] طبقة الاتصال الوحيدة بخادم الواجبات (Google Apps Script + Google Sheets)
// ==========================================================
// السياق: نظام الواجبات القديم كان يعتمد على Firebase (Firestore + App Check + reCAPTCHA) وكان
// يفشل بشكل متكرر في الاختبار الحقيقي (راجع مستند "تدقيق نظام الواجبات — الأسباب الجذرية").
// تم بناء البديل في "معمل الواجبات" (مجلد Dar-Ham-Homework-Lab) واختباره على خادم Google الحقيقي
// ثم دمجه هنا. هذا الملف هو المكان الوحيد الذي يعرف "كيف" نكلّم الخادم؛ لو تغيّر الخادم لاحقاً
// (Cloudflare أو Supabase مثلاً) يتغيّر هذا الملف وملف الخادم فقط، وكل الشاشات تبقى كما هي.
//
// 🔒 قواعد ثابتة في هذا الملف:
//   - كل الطلبات ترسل بنوع text/plain (طلب "بسيط" بلا preflight — Apps Script لا يستطيع الرد على
//     OPTIONS)، والردود دائماً JSON بصيغة {ok, code?, message?, ...}.
//   - لا نعتبر أي عملية كتابة "ناجحة" إلا لو ردّ الخادم بـ persisted:true (الخادم يعيد قراءة الصف
//     بعد كتابته ويتحقق منه) — هذا ما يمنع رسائل النجاح الكاذبة التي كانت في النظام القديم.
//   - مفتاح المعلم لا يوجد في أي ملف: يُدخله المعلم مرة واحدة على جهازه ويُحفظ في localStorage.

// 🌟 رابط تطبيق الويب (ينتهي بـ /exec). ليس سرّاً: أي عملية خاصة بالمعلم تتطلب مفتاح المعلم.
export const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbzynu0klKsGI3W168LfxV6LVTDk8pRHVFvATpug4iJR0o_jwRDi128RwBMCgAg52Q7L/exec';

const LS_URL = 'dh_hw_api_url';
const LS_KEY = 'dh_hw_teacher_key';
const EXEC_RE = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_\-]+\/exec$/;
const LOCAL_RE = /^http:\/\/(localhost|127\.0\.0\.1):\d+\/macros\/s\/[A-Za-z0-9_\-]+\/exec$/;
const isLocalDev = () => ['localhost', '127.0.0.1'].includes(location.hostname);

// 🔒 نقبل فقط روابط Apps Script (أو محاكي محلي وقت التطوير على localhost) — حتى لا يستطيع رابط
// مُصطنع توجيه متصفح طالب إلى خادم عشوائي عبر باراميتر api في الرابط.
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
export function setApiUrl(u) { if (!isAllowedApiUrl(u)) throw new Error('invalid api url'); lsSet(LS_URL, u); }
export function getTeacherKey() { return lsGet(LS_KEY) || ''; }
export function setTeacherKey(k) { lsSet(LS_KEY, k); }
export function clearTeacherKey() { try { localStorage.removeItem(LS_KEY); } catch (e) { /* لا شيء */ } }

// 🌟 أي شيء غير "نجاح مؤكَّد" يُرمى كـ ApiError، وحقل retryable يخبر المستدعي هل إعادة المحاولة مفيدة.
export class ApiError extends Error {
    constructor(kind, code, message, extra = {}) {
        super(message); this.name = 'ApiError'; this.kind = kind; this.code = code;
        this.retryable = !!extra.retryable; this.extra = extra;
    }
}
const RETRYABLE_CODES = new Set(['BUSY', 'PERSIST_VERIFY_FAILED', 'SERVER_ERROR']);

async function transport(method, payload, timeoutMs) {
    const base = getApiUrl();
    if (!base) throw new ApiError('config', 'NO_API_URL', 'لم يتم ضبط رابط الخادم');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res, text;
    try {
        if (method === 'GET') {
            const qs = new URLSearchParams(payload).toString();
            res = await fetch(base + '?' + qs, { method: 'GET', redirect: 'follow', cache: 'no-store', signal: ctrl.signal });
        } else {
            res = await fetch(base, {
                method: 'POST', redirect: 'follow', cache: 'no-store', signal: ctrl.signal,
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload)
            });
        }
        text = await res.text();
    } catch (e) {
        clearTimeout(timer);
        if (e && e.name === 'AbortError') throw new ApiError('timeout', 'TIMEOUT', 'انتهت مهلة الاتصال بالخادم', { retryable: true });
        throw new ApiError('network', 'NETWORK', 'تعذّر الاتصال بالخادم', { retryable: true });
    }
    clearTimeout(timer);
    let json;
    try { json = JSON.parse(text); }
    catch (e) {
        // 🌟 Google أحياناً يردّ بصفحة HTML (خطأ مؤقت أو نشر غير صحيح) — لا نعتبرها نجاحاً أبداً
        throw new ApiError('bad_response', 'BAD_RESPONSE', 'ردّ غير متوقع من الخادم', { retryable: true, httpStatus: res.status });
    }
    return json;
}

// call('getHomework', {id}) => GET | call('submit', {...}, {method:'POST'}) => POST
// تُرجع فقط عند نجاح مؤكَّد (ok:true)، وأي حالة أخرى ترمي ApiError.
// opts.write = true: تتطلب كذلك persisted:true (إثبات الحفظ من الخادم).
export async function call(action, params = {}, opts = {}) {
    const method = opts.method || (['ping', 'getHomework'].includes(action) ? 'GET' : 'POST');
    const timeoutMs = opts.timeoutMs || 25000;
    const payload = { action, ...params };
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

// القراءات (GET) آمنة التكرار: إعادة محاولة تلقائية بتأخير متصاعد. الكتابات لا تُعاد تلقائياً هنا أبداً.
export async function callWithRetry(action, params, opts = {}, tries = 3) {
    let last;
    for (let i = 0; i < tries; i++) {
        try { return await call(action, params, opts); }
        catch (e) {
            last = e;
            if (!(e instanceof ApiError) || !e.retryable || i === tries - 1) throw e;
            await new Promise(r => setTimeout(r, 700 * (i + 1)));
        }
    }
    throw last;
}
