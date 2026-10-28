// core/reminders.js
// ==========================================================
// 🌟 [جديد — «تذكيراتي» منبّه المعلم الشخصي] التخزين + المراقب الزمني (بلا واجهة؛ الواجهة في components/reminders.js).
// - التخزين: localStorage مفتاح dh_reminders (مصفوفة JSON). المفتاح مشمول في النسخة الاحتياطية والاستعادة (core/backupRestore.js).
// - المراقب: فحص كل 15 ثانية + عند عودة التبويب للواجهة/التركيز، بمقارنة الوقت الفعلي (لا setTimeout طويل لأن المتصفح يؤخّره
//   في التبويبات الخلفية). يبثّ dh:reminder-due لكل تذكير حان، وعند أول فحص بعد الفتح يجمع الفائت (أقدم من دقيقتين) في
//   حدث واحد dh:reminders-missed بدل إغراق المعلم بتنبيهات متتالية.
// - إشعار المتصفح (Notification API) يُعرض فقط والصفحة مخفية وبعد موافقة المعلم؛ الصوت بعد أول تفاعل (سياسة التشغيل التلقائي).
// ⚠️ قيد معروف: لا خادم Push، فلا تنبيه والمنصة/المتصفح مغلقان. يظهر «فاتتك» عند الفتح التالي.
// ==========================================================
import {
    sanitize, newReminderId, isDue, fireAt, complete, snooze, snoozeUntilTomorrow, sortReminders, pruneDone, summarize, dayStart, rollForward
} from '../engine/reminders.js';

const KEY = 'dh_reminders';
const POLL_MS = 15000;
const MISSED_AFTER_MS = 2 * 60 * 1000;
const NOTIF_ASKED_KEY = 'dh_rem_notif_asked';

let cache = null;

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

function read() {
    try {
        const arr = JSON.parse(lsGet(KEY) || '[]');
        return Array.isArray(arr) ? arr.map(x => sanitize(x)).filter(Boolean) : [];
    } catch (e) { return []; }
}
function changed() { document.dispatchEvent(new CustomEvent('dh:reminders-changed')); }
function write(list) {
    cache = list;
    lsSet(KEY, JSON.stringify(list));
    changed();
}

export function getReminders() {
    if (!cache) cache = read();
    return cache.slice();
}
export function getSorted() { return sortReminders(getReminders()); }
export function getReminder(id) { return getReminders().find(r => r.id === id) || null; }

export function addReminder(fields) {
    const r = sanitize({ ...fields, id: newReminderId(), createdAt: Date.now(), done: false, snoozeUntil: null });
    if (!r) return null;
    write(getReminders().concat(r));
    return r;
}
export function updateReminder(id, patch) {
    let out = null;
    const list = getReminders().map(r => {
        if (r.id !== id) return r;
        out = sanitize({ ...r, ...patch, id: r.id, createdAt: r.createdAt, snoozeUntil: patch && 'at' in patch ? null : r.snoozeUntil });
        return out || r;
    });
    if (out) write(list);
    return out;
}
export function removeReminder(id) { write(getReminders().filter(r => r.id !== id)); }
export function completeReminder(id) {
    write(getReminders().map(r => (r.id === id ? complete(r, Date.now()) : r)));
    firedAt.delete(id);
}
export function snoozeReminder(id, minutes) {
    write(getReminders().map(r => (r.id === id ? snooze(r, minutes, Date.now()) : r)));
    firedAt.delete(id);
}
export function snoozeReminderToTomorrow(id) {
    write(getReminders().map(r => (r.id === id ? snoozeUntilTomorrow(r, Date.now()) : r)));
    firedAt.delete(id);
}

/** عدد التذكيرات التي تنتظر المعلم الآن (متأخرة + اليوم) — للشارة على زر «مهام». */
export function actionableCount(now = Date.now()) { return summarize(getReminders(), now).actionable; }

// ------------------------------------------------------------
// الصوت: يُفعَّل بعد أول تفاعل من المعلم (قيد تشغيل الصوت التلقائي في المتصفحات)
// ------------------------------------------------------------
let audioCtx = null;
function armAudio() {
    const unlock = () => {
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC && !audioCtx) audioCtx = new AC();
            if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        } catch (e) { /* لا صوت: يبقى التنبيه البصري */ }
        window.removeEventListener('pointerdown', unlock, true);
        window.removeEventListener('keydown', unlock, true);
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
}
export function playReminderChime() {
    if (!audioCtx || audioCtx.state !== 'running') return;
    try {
        const t0 = audioCtx.currentTime;
        [[880, 0], [1175, 0.18]].forEach(([freq, delay]) => {
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = 'sine';
            o.frequency.value = freq;
            g.gain.setValueAtTime(0.0001, t0 + delay);
            g.gain.exponentialRampToValueAtTime(0.22, t0 + delay + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + 0.45);
            o.connect(g); g.connect(audioCtx.destination);
            o.start(t0 + delay); o.stop(t0 + delay + 0.5);
        });
    } catch (e) { /* لا شيء */ }
}

// ------------------------------------------------------------
// إشعار المتصفح (والصفحة مخفية فقط) + وميض عنوان التبويب
// ------------------------------------------------------------
const baseTitle = { value: null };
export function notifyHidden(title, body, tag) {
    if (!document.hidden) return;
    try {
        if ('Notification' in window && Notification.permission === 'granted') {
            const n = new Notification(title, { body, tag, icon: 'icons/icon-192.png?v=6' });
            n.onclick = () => { try { window.focus(); } catch (e) { /* لا شيء */ } n.close(); };
        }
    } catch (e) { /* بعض المتصفحات تمنع الإنشاء المباشر: يكفي وميض العنوان */ }
    if (baseTitle.value === null) baseTitle.value = document.title;
    document.title = '🔔 ' + title;
}
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && baseTitle.value !== null) { document.title = baseTitle.value; baseTitle.value = null; }
});

/** يُستدعى من حدث نقر (حفظ أول تذكير) — يطلب إذن الإشعارات مرة واحدة فقط. */
export function askNotificationPermissionOnce() {
    try {
        if (!('Notification' in window) || Notification.permission !== 'default' || lsGet(NOTIF_ASKED_KEY)) return;
        lsSet(NOTIF_ASKED_KEY, '1');
        Notification.requestPermission();
    } catch (e) { /* لا شيء */ }
}

// ------------------------------------------------------------
// المراقب
// ------------------------------------------------------------
const firedAt = new Map();   // id -> الموعد الفعلي الذي بُثّ تنبيهه (لا تكرار لنفس الموعد)
let started = false;
let firstTick = true;

function tick() {
    const now = Date.now();
    // المتكرر الذي لم يُنجَز ومرّ موعده التالي يقفز لآخر موعد حلّ (راجع rollForward) فيُنبّه من جديد
    const current = getReminders();
    const rolled = current.map(r => rollForward(r, now));
    if (rolled.some((r, i) => r !== current[i])) write(rolled);
    const due = getSorted().filter(r => isDue(r, now) && firedAt.get(r.id) !== fireAt(r));
    if (!due.length) { firstTick = false; return; }
    const missed = [];
    for (const r of due) {
        firedAt.set(r.id, fireAt(r));
        if (firstTick && now - fireAt(r) > MISSED_AFTER_MS) missed.push(r);
        else document.dispatchEvent(new CustomEvent('dh:reminder-due', { detail: { reminder: r } }));
    }
    if (missed.length) document.dispatchEvent(new CustomEvent('dh:reminders-missed', { detail: { reminders: missed } }));
    firstTick = false;
}

export function startReminderWatcher() {
    if (started) return;
    started = true;
    armAudio();
    const pruned = pruneDone(getReminders(), Date.now());
    if (pruned.length !== getReminders().length) write(pruned);
    window.addEventListener('storage', (e) => { if (e.key === KEY) { cache = null; changed(); } });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
    window.addEventListener('focus', tick);
    setInterval(tick, POLL_MS);
    tick();
}

export { dayStart };
