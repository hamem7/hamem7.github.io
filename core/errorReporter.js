// core/errorReporter.js
// ==========================================================
// 🌟 [جديد 2026-10-13 — مراقبة الأخطاء] يبلّغ الخادم بمشاكل صفحة الطالب (فشل إرسال، فشل تحميل الواجب، خطأ جافاسكربت) ليعرف المعلم
// بها دون أن يشتكي الطالب. الخادم يسجّلها في ورقة ClientLogs مرتبطة بالواجب، ويقرؤها المعلم وحده (listClientErrors).
//
// قواعد ثابتة:
//  - لا يرمي أبداً ولا يعطّل مسار الطالب (كل شيء try/catch وfire-and-forget).
//  - لا يرسل اسم الطالب ولا إجاباته ولا أي بيانات شخصية: نوع الخطأ، رمزه، رسالة قصيرة، المتصفح، الاتصال، رقم الواجب فقط.
//  - ما يفشل بسبب انقطاع الإنترنت (وهو بالذات ما نريد معرفته) يُحفظ محلياً (حد 8) ويُرسل عند عودة الاتصال أو في الزيارة التالية.
//  - حدّ لكل صفحة (6 تقارير) وإسقاط التكرار؛ والخادم يطبّق حدّاً إضافياً للمعدل.
// ==========================================================

import { call } from './api.js';
import { APP_VERSION } from './version.js';

const QUEUE_KEY = 'dh_err_queue';
const MAX_QUEUE = 8;
const MAX_PER_PAGE = 6;
const NOISE = [/ResizeObserver loop/i, /^Script error\.?$/i, /Non-Error promise rejection/i, /extension:\/\//i, /chrome-extension/i];

let sentThisPage = 0;
const seen = new Set();
let bound = false;
let ctx = { getHwId: () => null, page: 'student' };

function qRead() { try { return JSON.parse(localStorage.getItem(QUEUE_KEY)) || []; } catch (e) { return []; } }
function qWrite(list) { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(list.slice(-MAX_QUEUE))); } catch (e) { /* لا شيء */ } }

async function send(rep) {
    await call('logClientError', rep, { method: 'POST', timeoutMs: 8000 });
}

async function flushQueue() {
    const list = qRead();
    if (!list.length || navigator.onLine === false) return;
    qWrite([]);
    const failed = [];
    for (const rep of list) { try { await send(rep); } catch (e) { failed.push(rep); } }
    if (failed.length) qWrite(failed.concat(qRead()));
}

/** تقرير خطأ. report = { kind, message, code?, hwId?, where? } — لا يرمي. */
export function reportClientError(report) {
    try {
        const message = String((report && report.message) || '').slice(0, 240);
        if (!message || NOISE.some(rx => rx.test(message))) return;
        const hwId = report.hwId || (ctx.getHwId && ctx.getHwId()) || '';
        const key = `${hwId}|${report.kind}|${message}`;
        if (seen.has(key) || sentThisPage >= MAX_PER_PAGE) return;
        seen.add(key); sentThisPage++;
        const rep = {
            kind: report.kind || 'other', message, code: report.code ? String(report.code).slice(0, 40) : '', hwId,
            where: report.where ? String(report.where).slice(0, 80) : '', page: ctx.page,
            app: APP_VERSION, ua: (navigator.userAgent || '').slice(0, 120),
            online: navigator.onLine !== false
        };
        if (navigator.onLine === false) { qWrite(qRead().concat(rep)); return; }
        send(rep).catch(() => { qWrite(qRead().concat(rep)); });
    } catch (e) { /* لا يعطّل أبداً */ }
}

/** فشل إرسال التسليم (من core/submitQueue.js). يُبلَّغ في أول فشل وكل 3 محاولات، ودائماً عند الرفض. */
export function reportSubmitFailure(hwId, code, message, attempts, rejected) {
    if (!rejected && attempts > 1 && attempts % 3 !== 0) return;
    reportClientError({ kind: 'submit_failed', hwId, code, message: `${code || 'ERROR'}${message ? ': ' + message : ''} (محاولة ${attempts}${rejected ? '، مرفوض' : ''})` });
}

/** فشل تحميل الواجب عند فتح الرابط (لا يُبلَّغ NOT_FOUND/CLOSED: رابط خاطئ أو واجب مغلق = متوقَّع). */
export function reportLoadFailure(hwId, code, message) {
    if (code === 'NOT_FOUND' || code === 'CLOSED' || code === 'DELETED') return;
    reportClientError({ kind: 'load_failed', hwId, code, message: `${code || 'ERROR'}${message ? ': ' + message : ''}` });
}

/** يلتقط أخطاء الصفحة غير المعالَجة ويفرغ طابور التقارير المؤجَّلة. آمن للاستدعاء أكثر من مرة. */
export function initErrorReporter({ getHwId, page = 'student' } = {}) {
    try {
        ctx = { getHwId: getHwId || ctx.getHwId, page };
        if (bound) return;
        bound = true;
        window.addEventListener('error', (e) => {
            const where = e && e.filename ? `${String(e.filename).split('/').pop()}:${e.lineno || 0}` : '';
            reportClientError({ kind: 'js_error', message: (e && e.message) || '', where });
        });
        window.addEventListener('unhandledrejection', (e) => {
            const r = e && e.reason;
            reportClientError({ kind: 'unhandled_rejection', message: (r && (r.message || r.code)) || String(r || '') });
        });
        window.addEventListener('online', () => { flushQueue().catch(() => {}); });
        setTimeout(() => { flushQueue().catch(() => {}); }, 3000);
    } catch (e) { /* لا شيء */ }
}
