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
//
// ================================================================================ 🌟🌟 [جديد]
// تسجيل دخول المعلم بجوجل (بريد إلكتروني) — يحلّ محل "مفتاح المعلم" كواجهة أساسية بطلب من
// المعلم (راجع مستند "تحويل معمل الواجبات إلى نظام متعدد المعلمين" ومحادثة تفعيل Google Sign-In).
// تمت تجربته أولاً في "معمل الواجبات" المعزول ثم نُقل هنا حرفياً بنفس الأسلوب. مفتاح المعلم القديم
// (LS_KEY أعلاه) **لم يُحذف ولن يُحذف** — يبقى خط رجوع كامل (راجع components/teacherAuthGate.js)
// حتى لا تنكسر أي شاشة لو تعطّل تسجيل الدخول بجوجل لأي سبب (حجب سكربت، عدم توفر إنترنت لجوجل...).
// ================================================================================

// 🌟 Client ID من Google Cloud Console (Google Auth Platform → Clients). ليس سرّاً — كل Client ID
// علني بطبيعته، الأمان يعتمد على Authorised JavaScript origins المسجّلة له (hamem7.github.io) لا
// على إخفائه.
export const GOOGLE_CLIENT_ID = '52157264045-l30vua64vk6018jjv53j14qpf716rmr8.apps.googleusercontent.com';

// 🌟 رابط تطبيق الويب (ينتهي بـ /exec). ليس سرّاً: أي عملية خاصة بالمعلم تتطلب مفتاح المعلم.
export const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbzynu0klKsGI3W168LfxV6LVTDk8pRHVFvATpug4iJR0o_jwRDi128RwBMCgAg52Q7L/exec';

const LS_URL = 'dh_hw_api_url';
const LS_KEY = 'dh_hw_teacher_key';
const LS_USERID = 'dh_hw_teacher_userid';       // 🌟 [جديد] هوية المعلم بعد تسجيل الدخول بجوجل
const LS_SESSIONKEY = 'dh_hw_teacher_sessionkey'; // 🌟 [جديد] جلسة تُصدرها googleSignIn/migrateLegacyKey
const EXEC_RE = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_\-]+\/exec$/;
const LOCAL_RE = /^http:\/\/(localhost|127\.0\.0\.1):\d+\/macros\/s\/[A-Za-z0-9_\-]+\/exec$/;
const isLocalDev = () => ['localhost', '127.0.0.1'].includes(location.hostname);

// 🔒 نقبل فقط روابط Apps Script (أو محاكي محلي وقت التطوير على localhost) — حتى لا يستطيع رابط
// مُصطنع توجيه متصفح طالب إلى خادم عشوائي عبر باراميتر api في الرابط.
// 🌟 [إصلاح تدقيق ما قبل الإطلاق] كان أي رابط Apps Script (حتى سكربت مهاجم) مقبولاً عبر ?api= فيستطيع رابط مُصطنع تحويل طلبات
// المعلم/الطالب (وفيها مفتاح المعلم وجلسته) إلى سكربت غير سكربتك. الآن على الإنتاج لا يُقبل إلا DEFAULT_API_URL المكتوب في الكود
// نفسه؛ وعلى localhost فقط (وقت التطوير) يُسمح بأي سكربت أو المحاكي المحلي للاختبار.
// ⚠️ [افتراض صريح]: لو نشرت نسخة جديدة من Apps Script فغيّر DEFAULT_API_URL أعلاه ولا تعتمد على ?api= بعد اليوم.
export function isAllowedApiUrl(u) { return u === DEFAULT_API_URL || (isLocalDev() && (EXEC_RE.test(u) || LOCAL_RE.test(u))); }

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

// ---- مفتاح المعلم القديم (خط الرجوع — لا يزال يعمل بالكامل، راجع التعليق أعلاه) ----
export function getTeacherKey() { return lsGet(LS_KEY) || ''; }
export function setTeacherKey(k) { lsSet(LS_KEY, k); }
export function clearTeacherKey() { try { localStorage.removeItem(LS_KEY); } catch (e) { /* لا شيء */ } }

// ---- 🌟 [جديد] جلسة تسجيل الدخول بجوجل — تُقرأ/تُكتب بواسطة googleSignIn/migrateLegacyKey أدناه ----
export function getTeacherAuth() {
    const userId = lsGet(LS_USERID), sessionKey = lsGet(LS_SESSIONKEY);
    return (userId && sessionKey) ? { userId, sessionKey } : null;
}
export function setTeacherAuth(userId, sessionKey) { lsSet(LS_USERID, userId); lsSet(LS_SESSIONKEY, sessionKey); }
export function clearTeacherAuth() {
    try { localStorage.removeItem(LS_USERID); localStorage.removeItem(LS_SESSIONKEY); } catch (e) { /* لا شيء */ }
}
// 🌟 تُستخدم لمسح أي تفويض (جلسة جوجل أو المفتاح القديم) دفعة واحدة، مثلاً عند رفض الخادم UNAUTHORIZED.
export function clearAnyTeacherAuth() { clearTeacherAuth(); clearTeacherKey(); }
/** true لو المعلم مفوَّض بأي من الطريقتين (بلا حاجة لنداء شبكة) — تُستخدم لإخفاء بوابة الدخول. */
export function isTeacherAuthed() { return !!(getTeacherAuth() || getTeacherKey()); }

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
    if (opts.teacher) {
        // 🌟 [جديد] نفضّل جلسة جوجل لو موجودة، ولو مش موجودة نرجع لمفتاح المعلم القديم بلا أي تغيير
        // — هذا هو المكان الوحيد اللي بيقرر "مين المعلم" في كل نداء، فأي شاشة تستخدم {teacher:true}
        // تستفيد من الطريقتين تلقائياً بلا أي تعديل فيها.
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

// ============================================================================ 🌟🌟 [جديد]
/** يتحقق من idToken في الخادم، ويرجع userId + sessionKey دائمَين ويحفظهما (getTeacherAuth أعلاه)
 *  حتى يُفوَّض كل نداء {teacher:true} تالٍ تلقائياً بلا تسجيل دخول متكرر. */
export async function googleSignIn(idToken) {
    const r = await call('googleSignIn', { idToken });
    setTeacherAuth(r.userId, r.sessionKey);
    return r;
}

/** ربط الواجبات "القديمة" (المنشورة قبل تفعيل تعدّد المعلمين، بلا مالك محدَّد) بحساب جوجل الذي سجّل
 *  دخوله الآن — مرة واحدة تكفي. آمنة الاستدعاء أكثر من مرة (لا تُكرِّر الربط)، ولو رُبطت من قبل بحساب
 *  آخر ترجع claimed:false بدل أن تفشل. تحتاج teacherKey القديم لإثبات أن صاحب الطلب هو نفسه المعلم. */
export async function migrateLegacyKey(idToken, teacherKey) {
    const r = await call('migrateLegacyKey', { idToken, teacherKey });
    setTeacherAuth(r.userId, r.sessionKey);
    return r;
}
