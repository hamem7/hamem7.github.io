// core/homeworkNotifier.js
// ==========================================================
// 🌟🌟 [جديد] إشعار المعلم صوتيًا وبصريًا عند وصول تسليم واجب جديد من أي طالب
// ==========================================================
// السياق: خادم الواجبات (Google Apps Script — راجع core/api.js) لا يدعم أي إشعار فوري
// حقيقي (Push/WebSocket) — اتصال دائم مفتوح غير ممكن معه إطلاقاً. الحل الوحيد الممكن ضمن
// هذه البنية هو "فحص دوري" (Polling): كل POLL_MS نطلب من core/homeworkApi.js
// (listAllSubmissionsForNotifications) قائمة كل التسليمات الحالية بلا فلتر حالة، ونقارنها
// بقائمة معرّفات "شُوهدت" محفوظة محلياً في localStorage — فأي معرّف تسليم جديد لم نره قبل
// = تسليم جديد فعلاً وصل الآن.
//
// لماذا localStorage لا الذاكرة فقط: لو أعاد المعلم تحميل الصفحة (أو أغلق التطبيق وفتحه بعد
// ذلك) يجب ألا يُعاد تنبيهه على تسليمات شاهدها/تعامل معها قبل الإغلاق. أول مرة يُشغَّل فيها
// هذا الكود على جهاز المعلم (لا توجد قائمة محفوظة أصلاً) نُسجّل كل التسليمات الموجودة حالياً
// كـ"مشاهَدة" بصمت بدل تنبيهه دفعة واحدة على كل تسليم قديم سبق ورآه في سجل الواجبات.
//
// قيود تشغيل الصوت في المتصفحات (Autoplay Policy): لا يمكن تشغيل أي صوت (حتى عبر Web Audio)
// قبل أول تفاعل حقيقي من المستخدم مع الصفحة (نقرة/لمسة/مفتاح) — هذا قيد أمان من المتصفح نفسه
// وليس خطأ بالكود، ولا يوجد "حل برمجي" يلتف حوله. المعالجة: نستمع لأول تفاعل من المعلم مع
// الصفحة (نقرة أو لوحة مفاتيح) ونُنشئ/نُفعّل AudioContext عندها، فيصبح التشغيل اللاحق من
// الفحص الدوري مسموحاً طوال بقية الجلسة. لو لم يتفاعل المعلم بعد إطلاقاً (نادر جداً — يفتح
// المنصة ويتركها بلا أي لمسة)، سيظل التنبيه البصري (Toast) يعمل دائماً بلا أي قيد، وسيُضاف
// الصوت تلقائياً بمجرد أول تفاعل منه.
//
// لماذا لا نطلب أي تسجيل دخول هنا: هذا الفحص يعمل في خلفية المنصة الأساسية، والمنصة الأساسية لا تطلب
// دخولاً أبداً. الفحص الدوري يعمل *فقط* لو سجّل المعلم الدخول بجوجل داخل نظام الواجبات على هذا الجهاز
// (isTeacherAuthed من core/api.js)، وإلا يتوقف بصمت. لو سجّل الدخول لأول مرة بعد إقلاع المنصة (من شاشة
// الواجبات)، يبدأ الفحص تلقائياً من أول محاولة تالية بلا حاجة لإعادة تحميل الصفحة.
import { isTeacherAuthed } from './api.js';
import { listAllSubmissionsForNotifications } from './homeworkApi.js';
import { t } from './i18n.js';
// 🌟 [جديد — إصلاح XSS] اسم الطالب في إشعار التسليم يأتي من الخادم، فيُنظَّف قبل الحقن في innerHTML
import { esc } from './escape.js';

const SEEN_IDS_KEY = 'dh_hw_notif_seen_ids';
const FIRST_RUN_DONE_KEY = 'dh_hw_notif_first_run_done';
const MAX_SEEN_IDS = 500; // 🌟 نُبقي فقط آخر 500 معرّف حتى لا يتضخم localStorage للأبد
const FIRST_RUN_NOTIFY_WINDOW_MS = 48 * 60 * 60 * 1000; // 🌟 نافذة التنبيه على تسليمات حديثة عند أول فحص ناجح
const POLL_MS = 20000;   // فحص كل 20 ثانية — أقرب للوقت الحقيقي الممكن ضمن خادم بلا Push

let seenIds = null;
let pollTimer = null;
let pollInFlight = false;
let audioCtx = null;

// ------------------------------------------------------------
// 1) تخزين معرّفات التسليمات "المشاهَدة" محلياً
// ------------------------------------------------------------
function loadSeenIds() {
    if (seenIds) return seenIds;
    try {
        const raw = localStorage.getItem(SEEN_IDS_KEY);
        seenIds = new Set(raw ? JSON.parse(raw) : []);
    } catch (e) { seenIds = new Set(); }
    return seenIds;
}

function persistSeenIds() {
    try {
        const arr = Array.from(seenIds);
        const trimmed = arr.length > MAX_SEEN_IDS ? arr.slice(arr.length - MAX_SEEN_IDS) : arr;
        localStorage.setItem(SEEN_IDS_KEY, JSON.stringify(trimmed));
    } catch (e) { /* التخزين تحسيني فقط — لا يوقف عمل الإشعار نفسه لو فشل */ }
}

// ------------------------------------------------------------
// 2) الصوت: نغمتان لطيفتان صاعدتان عبر Web Audio API — بلا أي ملف صوتي خارجي جديد
//    (يطابق فلسفة المشروع: حلول مدمجة في المتصفح بدل مكتبة/أصل خارجي جديد)
// ------------------------------------------------------------
function unlockAudioOnFirstGesture() {
    const unlock = () => {
        // 🌟 [إصلاح 2026-10-02] طلب إذن الإشعارات عند أول نقرة حقيقية: الطلب وقت الإقلاع (بلا تفاعل) يتجاهله كثير من المتصفحات
        // بصمت فلا يصل أي إشعار سطح مكتب. لا يُطلب إلا لو الحالة "default" (لا إزعاج لمن قرّر مسبقاً).
        try {
            if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
        } catch (e) { /* لا شيء */ }
        try {
            audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
        } catch (e) { /* Web Audio غير متاح على هذا المتصفح — يبقى التنبيه البصري فقط */ }
    };
    ['pointerdown', 'keydown'].forEach(evt => {
        document.addEventListener(evt, unlock, { once: true, passive: true, capture: true });
    });
}

function playNewSubmissionChime() {
    if (!audioCtx) return; // لم يتفاعل المعلم مع الصفحة بعد — التنبيه البصري يكفي حالياً
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const notes = [880, 1174.66]; // لا٥-صول٥ — نغمة "دينج" لطيفة صاعدة، لا صوت حاد مزعج
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const start = now + i * 0.16;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
            osc.connect(gain).connect(audioCtx.destination);
            osc.start(start);
            osc.stop(start + 0.4);
        });
    } catch (e) { console.warn('تعذر تشغيل صوت تنبيه التسليم الجديد:', e); }
}

// ------------------------------------------------------------
// 3) التنبيه البصري: بطاقة عائمة (Toast) تُبنى وتُنسَّق برمجياً بالكامل — عنصر واحد فقط
//    يُنشأ مرة عند أول استخدام ويُعاد استخدامه كحاوية (نفس نمط #toast-encouragement في
//    index.html، لكن معزول تماماً في هذا الملف بلا لمس أي عنصر ثابت موجود بالفعل)
// ------------------------------------------------------------
function ensureToastStyles() {
    if (document.getElementById('dh-hw-notif-style')) return;
    const style = document.createElement('style');
    style.id = 'dh-hw-notif-style';
    style.textContent = `
        #dh-hw-notif-container { position: fixed; top: 14px; left: 50%; transform: translateX(-50%);
            z-index: 99999; display: flex; flex-direction: column; gap: 10px; align-items: center;
            pointer-events: none; width: min(92vw, 420px); }
        .dh-hw-notif-toast { pointer-events: auto; width: 100%; box-sizing: border-box;
            background: linear-gradient(135deg, var(--dh-emerald-700, #0d5c46), var(--dh-emerald-900, #06231c));
            color: #fdf6e3; border: 1px solid var(--dh-gold-500, #d4af37); border-radius: 14px;
            padding: 12px 16px; box-shadow: 0 10px 28px rgba(0,0,0,0.28);
            display: flex; align-items: center; gap: 10px; font-family: inherit;
            opacity: 0; transform: translateY(-14px); transition: opacity .25s ease, transform .25s ease; }
        .dh-hw-notif-toast.dh-hw-notif-show { opacity: 1; transform: translateY(0); }
        .dh-hw-notif-icon { font-size: 1.6rem; flex-shrink: 0; }
        .dh-hw-notif-text { flex: 1; text-align: right; line-height: 1.4; }
        .dh-hw-notif-title { font-weight: bold; color: var(--dh-gold-300, #f0d878); font-size: 0.98rem; }
        .dh-hw-notif-body { font-size: 0.88rem; opacity: 0.92; margin-top: 2px; }
        .dh-hw-notif-close { pointer-events: auto; background: transparent; border: none; color: inherit;
            font-size: 1.1rem; cursor: pointer; opacity: 0.75; flex-shrink: 0; }
        .dh-hw-notif-close:hover { opacity: 1; }
        html[lang="en"] .dh-hw-notif-text { text-align: left; }
    `;
    document.head.appendChild(style);
}

function ensureToastContainer() {
    ensureToastStyles();
    let container = document.getElementById('dh-hw-notif-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'dh-hw-notif-container';
        document.body.appendChild(container);
    }
    return container;
}

function showNewSubmissionToast(sub) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = 'dh-hw-notif-toast';
    const studentName = sub.studentName || t('hw_notif_unknown_student');
    toast.innerHTML = `
        <span class="dh-hw-notif-icon" aria-hidden="true">🔔</span>
        <span class="dh-hw-notif-text">
            <span class="dh-hw-notif-title">${t('hw_notif_new_submission_title')}</span>
            <span class="dh-hw-notif-body">${t('hw_notif_new_submission_body').replace('{name}', esc(studentName))}</span>
        </span>
        <button type="button" class="dh-hw-notif-close" aria-label="✕">✕</button>
    `;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('dh-hw-notif-show'));

    const remove = () => {
        toast.classList.remove('dh-hw-notif-show');
        setTimeout(() => toast.remove(), 250);
    };
    toast.querySelector('.dh-hw-notif-close').addEventListener('click', remove);
    setTimeout(remove, 7000); // 🌟 يختفي تلقائياً — لا يبقى متراكماً للأبد لو تجاهله المعلم
}

// ------------------------------------------------------------
// 3-ب) 🌟 [جديد] إشعار سطح المكتب (نظام التشغيل) عند وصول تسليم جديد
//    كان التنبيه صوتاً + Toast داخل الصفحة فقط، فلا يراه المعلم لو كانت المنصة في تبويب خلفي أو
//    نافذة مصغّرة. إذن الإشعارات يُطلب أصلاً عند إقلاع المنصة (core/app.js) — هنا نستخدمه فقط لو كان
//    "granted" ولا نطلبه ثانيةً (لا إزعاج جديد).
//    ⚠️ افتراضات صريحة:
//      1) يظهر الإشعار فقط حين لا تكون صفحة المنصة أمام المعلم (مخفية أو بلا تركيز)، لأن الـToast
//         كافٍ ومرئي وقت التركيز، وتفادياً لتكرار التنبيه على الشاشة نفسها.
//      2) الإشعار يعمل فقط والمنصة مفتوحة في المتصفح (الفحص الدوري يتطلب ذلك؛ لا Push حقيقي من
//         الخادم). وللإبقاء عليه يلزم ترك تبويب المنصة مفتوحاً.
//      3) لو وصل أكثر من 3 تسليمات دفعة واحدة يُعرض إشعار واحد مجمَّع بدل إغراق الشاشة.
// ------------------------------------------------------------
function showDesktopNotifications(subs) {
    try {
        if (!subs.length || !('Notification' in window) || Notification.permission !== 'granted') return;
        const pageInFront = document.visibilityState === 'visible' && document.hasFocus();
        if (pageInFront) return;
        const title = t('hw_notif_new_submission_title');
        const open = (n) => { n.onclick = () => { try { window.focus(); } catch (e) { /* */ } n.close(); }; };
        if (subs.length > 3) {
            open(new Notification(title, {
                body: t('hw_notif_many_body').replace('{n}', String(subs.length)),
                icon: 'icons/icon-192.png', tag: 'dh-hw-many'
            }));
            return;
        }
        subs.forEach(sub => {
            const name = sub.studentName || t('hw_notif_unknown_student');
            open(new Notification(title, {
                body: t('hw_notif_new_submission_body').replace('{name}', name),
                icon: 'icons/icon-192.png', tag: 'dh-hw-' + (sub.docId || sub.id || name)
            }));
        });
    } catch (e) { console.warn('تعذر عرض إشعار سطح المكتب للتسليم الجديد:', e); }
}

// ------------------------------------------------------------
// 4) الفحص الدوري نفسه
// ------------------------------------------------------------
async function pollOnce() {
    if (pollInFlight) return; // 🌟 منع تراكب فحصين لو تأخر ردّ الخادم أكثر من POLL_MS
    if (!isTeacherAuthed()) return; // لا جلسة جوجل لنظام الواجبات على هذا الجهاز — لا شيء نفعله
    pollInFlight = true;
    try {
        const list = await listAllSubmissionsForNotifications();
        const seen = loadSeenIds();

        let firstRun = false;
        try { firstRun = !localStorage.getItem(FIRST_RUN_DONE_KEY); } catch (e) { /* تجاهل */ }

        const freshOnes = [];
        list.forEach(sub => {
            const id = sub.docId || sub.id;
            if (!id || seen.has(id)) return;
            seen.add(id);
            if (!firstRun) { freshOnes.push(sub); return; }
            // 🌟 [إصلاح 2026-10-02] أول فحص ناجح: كنا نُسكت كل التسليمات الموجودة، فيضيع تسليم وصل قبل نجاح أول فحص (وهذا ما حدث
            // لأن الفحص لم يكن يعمل أصلاً). الآن ننبّه فقط على التسليمات الحديثة (آخر 48 ساعة) غير المصحَّحة؛ الأقدم تُسجَّل بصمت.
            const ts = Number(sub.timestamp) || Date.parse(sub.submittedAt || '') || 0;
            if (sub.status === 'submitted' && ts && (Date.now() - ts) <= FIRST_RUN_NOTIFY_WINDOW_MS) freshOnes.push(sub);
        });

        if (firstRun) { try { localStorage.setItem(FIRST_RUN_DONE_KEY, '1'); } catch (e) { /* تجاهل */ } }
        if (seen.size) persistSeenIds();

        if (freshOnes.length) {
            playNewSubmissionChime();
            freshOnes
                .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
                .forEach(sub => showNewSubmissionToast(sub));
            showDesktopNotifications(freshOnes); // 🌟 [جديد] إشعار سطح المكتب لو المنصة ليست أمام المعلم
            // 🌟 لو كانت شاشة "نظام إدارة الواجبات" مفتوحة حالياً، تسمعها لتُحدّث بطاقاتها فوراً
            // بلا أي ربط مباشر بينها وبين هذا الملف (فصل كامل — راجع settings/homework-prep.js)
            document.dispatchEvent(new CustomEvent('dh:new-homework-submissions', { detail: { submissions: freshOnes } }));
        }
    } catch (e) {
        // 🌟 فشل شبكة/خادم عابر لا يُعرض للمعلم كخطأ (سيُعاد المحاولة تلقائياً بعد POLL_MS) — نفس
        // فلسفة "لا نُقاطع المعلم بتنبيهات فشل صامتة غير جوهرية" المتبعة في بقية أجزاء المنصة
        console.warn('تعذر فحص التسليمات الجديدة (سيُعاد المحاولة تلقائياً):', e);
    } finally {
        pollInFlight = false;
    }
}

// ------------------------------------------------------------
// 5) نقطة التشغيل الوحيدة — تُستدعى مرة واحدة من core/app.js (bootSystem)
// ------------------------------------------------------------
export function startHomeworkSubmissionWatcher() {
    if (pollTimer) return; // منع تشغيل أكثر من مؤقّت واحد لو استُدعيت الدالة أكثر من مرة بالخطأ
    unlockAudioOnFirstGesture();
    pollOnce();
    pollTimer = setInterval(pollOnce, POLL_MS);
    // 🌟 فحص فوري إضافي عند عودة المعلم لتبويب المنصة (بعد تصغيرها/تركها فترة) — بلا انتظار
    // دورة الفحص التالية، فتصله تنبيهات ما فاته أثناء غيابه أقرب لحظة عودته
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') pollOnce();
    });
}
