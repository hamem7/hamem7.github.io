// core/submitQueue.js
// ==========================================================
// 🌟🌟 [جديد] حفظ إجابات الطالب على جهازه + آلة حالات "تسليم صادق" لا تدّعي النجاح أبداً
// ==========================================================
// الضمانات:
//  * الإجابات تُحفظ على جهاز الطالب مع كل تغيير (مسودة)، وقبل أول محاولة إرسال للشبكة.
//  * سجل محاولة الإرسال يبقى بعد إغلاق الصفحة أو انقطاع الإنترنت أو إعادة تشغيل الموبايل.
//  * حالة "confirmed" لا تُضبط إلا لو ردّ الخادم {ok:true, persisted:true} (الخادم أعاد قراءة الصف).
//  * إعادة الإرسال آمنة دائماً: نفس clientSubmissionId في كل محاولة، والخادم لا يُنشئ نسخة ثانية.
//
// الحالات:  مسودة محفوظة محلياً ← pending (جاري الإرسال) ← confirmed (مؤكَّد)
//                                        └← failed (فشل، الإجابات محفوظة، إعادة المحاولة ممكنة) ← pending ...
//                                        └← rejected (الخادم رفض: واجب مغلق / تسليم سابق / رابط غير صحيح)
import { call, ApiError } from './api.js';

const mem = new Map();          // احتياطي لو منع المتصفح localStorage (وضع خاص / امتلاء)
let storageOk = true;
function read(k) {
    try { const v = localStorage.getItem(k); if (v !== null) return JSON.parse(v); } catch (e) { storageOk = false; }
    return mem.has(k) ? mem.get(k) : null;
}
function write(k, obj) {
    mem.set(k, obj);
    try { localStorage.setItem(k, JSON.stringify(obj)); return true; } catch (e) { storageOk = false; return false; }
}
function remove(k) { mem.delete(k); try { localStorage.removeItem(k); } catch (e) { /* لا شيء */ } }
export function isLocalStorageWorking() {
    try { localStorage.setItem('dh_hw_probe', '1'); localStorage.removeItem('dh_hw_probe'); return true; } catch (e) { return false; }
}

const DRAFT_PREFIX = 'dh_hw_draft_';
const ATTEMPT_PREFIX = 'dh_hw_attempt_';
const dKey = (hw) => DRAFT_PREFIX + hw;
const aKey = (hw) => ATTEMPT_PREFIX + hw;

export const saveDraft = (hwId, draft) => write(dKey(hwId), { ...draft, updatedAt: Date.now() });
export const loadDraft = (hwId) => read(dKey(hwId));
export const clearDraft = (hwId) => remove(dKey(hwId));
export const getAttempt = (hwId) => read(aKey(hwId));

function newClientId() {
    if (crypto && crypto.randomUUID) return 'c_' + crypto.randomUUID().replace(/-/g, '');
    return 'c_' + Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
}

// تجميد الإجابات في سجل محاولة (يُحفظ محلياً قبل أي نداء شبكة). يُرجع المحاولة.
export function startSubmission(hwId, studentName, answers) {
    const existing = getAttempt(hwId);
    if (existing && existing.state !== 'rejected') return existing;     // لا نُنشئ معرّفاً ثانياً لنفس الواجب أبداً
    const attempt = {
        v: 1, clientSubmissionId: newClientId(), hwId, studentName, answers, createdAt: Date.now(),
        state: 'pending', attempts: 0, lastError: null, lastAttemptAt: null, confirmedAt: null, receipt: null
    };
    write(aKey(hwId), attempt);
    return attempt;
}

const inFlight = new Set();
const timers = new Map();

// 🌟 مراقب واحد لكل واجب: شاشة الحل تسجّل دالة تحديثها هنا، فتُبلَّغ بأي تغيّر حالة حتى لو جاء من إرسال بدأه غيرها
// (مثل resumeAllPendingSubmissions عند الإقلاع) — كان هذا هو سبب بقاء الشاشة على "جاري الإرسال" رغم وصول التسليم.
const watchers = new Map();
export function watchAttempt(hwId, cb) { watchers.set(hwId, cb); }
function save(attempt, onChange) {
    write(aKey(attempt.hwId), attempt);
    if (onChange) onChange(attempt);
    const w = watchers.get(attempt.hwId);
    if (w && w !== onChange) { try { w(attempt); } catch (e) { /* لا شيء */ } }
    return attempt;
}

// محاولة إرسال واحدة. لا ترمي أبداً؛ تحدّث الحالة وتحفظها وتبلّغ onChange.
export async function attemptSend(hwId, onChange) {
    const attempt = getAttempt(hwId);
    if (!attempt || attempt.state === 'confirmed' || attempt.state === 'rejected') return attempt;
    if (inFlight.has(hwId)) return attempt;
    inFlight.add(hwId);
    attempt.state = 'pending'; attempt.attempts++; attempt.lastAttemptAt = Date.now();
    save(attempt, onChange);
    try {
        const r = await call('submit', {
            hwId, clientSubmissionId: attempt.clientSubmissionId, studentName: attempt.studentName, answers: attempt.answers,
            clientMeta: { ua: navigator.userAgent.slice(0, 120), attempts: attempt.attempts, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }
        }, { method: 'POST', write: true, timeoutMs: 30000 });
        attempt.state = 'confirmed'; attempt.confirmedAt = Date.now(); attempt.lastError = null;
        attempt.receipt = { submissionId: r.submissionId, submittedAt: r.submittedAt, duplicate: !!r.duplicate };
        clearDraft(hwId);
        stopAutoRetry(hwId);
        return save(attempt, onChange);
    } catch (e) {
        const code = (e instanceof ApiError) ? e.code : 'UNKNOWN';
        const retryable = (e instanceof ApiError) ? e.retryable : true;
        attempt.lastError = { code, message: e.message };
        if (!retryable) {            // الخادم فهم الطلب ورفضه: إعادة المحاولة لن تفيد
            attempt.state = 'rejected'; attempt.rejectReason = code;
            stopAutoRetry(hwId);
        } else {
            attempt.state = 'failed';
        }
        return save(attempt, onChange);
    } finally {
        inFlight.delete(hwId);
    }
}

// إعادة محاولة تلقائية (بتأخير متصاعد) طالما الصفحة مفتوحة + فوراً عند عودة الاتصال.
export function startAutoRetry(hwId, onChange) {
    stopAutoRetry(hwId);
    let delay = 4000;
    const tick = async () => {
        const a = getAttempt(hwId);
        // 🌟 لو انتهى التسليم (أكّده/رفضه إرسال آخر جارٍ، مثل resumeAllPendingSubmissions) نُبلّغ الشاشة بالحالة النهائية قبل التوقف
        if (!a || a.state === 'confirmed' || a.state === 'rejected') { if (a && onChange) onChange(a); return stopAutoRetry(hwId); }
        if (navigator.onLine !== false) await attemptSend(hwId, onChange);
        const b = getAttempt(hwId);
        if (b && (b.state === 'confirmed' || b.state === 'rejected') && onChange) onChange(b);
        if (b && (b.state === 'failed' || b.state === 'pending')) {
            delay = Math.min(delay * 2, 60000);
            timers.set(hwId, setTimeout(tick, delay));
        }
    };
    timers.set(hwId, setTimeout(tick, delay));
    if (!startAutoRetry._bound) {
        startAutoRetry._bound = true;
        window.addEventListener('online', () => {
            for (const id of [...timers.keys()]) {
                clearTimeout(timers.get(id)); timers.delete(id);
                attemptSend(id, onChange).then(() => { const a = getAttempt(id); if (a && a.state === 'failed') startAutoRetry(id, onChange); });
            }
        });
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') { const a = getAttempt(hwId); if (a && a.state === 'failed') attemptSend(hwId, onChange); }
        });
    }
}
export function stopAutoRetry(hwId) { if (timers.has(hwId)) { clearTimeout(timers.get(hwId)); timers.delete(hwId); } }
export function isStorageOk() { return storageOk; }

// 🌟 [جديد] استئناف أي تسليم عالق (pending/failed) على هذا الجهاز — تُستدعى من core/app.js عند إقلاع
// المنصة وعند عودة الاتصال، فلو أغلق الطالب الصفحة قبل تأكيد الاستلام ثم فتح المنصة لاحقاً (بأي رابط)
// يُعاد الإرسال تلقائياً بنفس المعرّف (آمن بلا تكرار). لا ترمي ولا تُجمّد أي شيء.
export function resumeAllPendingSubmissions() {
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k || !k.startsWith(ATTEMPT_PREFIX)) continue;
            const hwId = k.slice(ATTEMPT_PREFIX.length);
            const a = getAttempt(hwId);
            if (a && (a.state === 'pending' || a.state === 'failed')) attemptSend(hwId).catch(() => {});
        }
    } catch (e) { /* لا شيء: ميزة مساعدة فقط */ }
}
