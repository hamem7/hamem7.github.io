// core/reviewLog.js
//
// 🌟 «دفتر المراجعة»: كم آية راجعها الطالب في الشهر = آيات الألعاب الفردية + آيات الواجب المنزلي.
//  • الألعاب: من سجل الأداء (core/trackingService.js → gameAyahItems)، حدث لكل سؤال بعدد آياته.
//  • الواجب: يُحسب «عند تسليم الطالب» (لا عند الاعتماد): كل تسليم على الخادم بتاريخ تسليمه × مجموع آيات أسئلة واجبه
//    (engine/ayahCount.js → homeworkAyahTotal). ولأن التسليمات على الخادم، نحفظ نسخة محلية صغيرة (localStorage
//    dh_review_hw_v1) تُحدَّث مع فحص التسليمات الدوري (core/homeworkNotifier.js) وعند فتح التقرير الشهري، فتعمل الأوسمة
//    بلا اتصال. التسليمات القديمة كلها موجودة على الخادم، فالعدّ بأثر رجعي.
import { AppState } from './app.js';
import { normalizeName } from './homeworkRecords.js';
import { homeworkAyahTotal } from '../engine/ayahCount.js';

const KEY = 'dh_review_hw_v1';
const SKIP_STATUS = new Set(['cancelled', 'canceled', 'deleted', 'rejected']);

function load() {
    try {
        const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (raw && raw.hw && raw.subs) return raw;
    } catch (e) { /* تالف: نبدأ من جديد */ }
    return { hw: {}, subs: {} };
}
function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* التخزين ممتلئ: نكتفي بما في الذاكرة */ }
}

const subTs = (s) => Number(s && s.timestamp) || Date.parse((s && s.submittedAt) || '') || 0;

// مجموع آيات واجب (من النسخة المحلية للواجب، وإلا من الخادم). null = تعذّر معرفته الآن (يُعاد لاحقاً).
async function hwAyahTotal(hwId, localHws, cache) {
    const id = String(hwId || '');
    if (!id) return null;
    if (Number.isInteger(cache[id])) return cache[id];
    let hw = localHws.find(h => String(h.id) === id) || null;
    let questions = hw && Array.isArray(hw.questions) ? hw.questions : null;
    let tracking = (hw && hw.tracking) || null;
    if (!questions) {
        try {
            const { fetchHomeworkFull } = await import('./homeworkApi.js');
            const full = await fetchHomeworkFull(id);
            if (full) { questions = full.questions || null; tracking = tracking || (full.meta && full.meta.tracking) || null; }
        } catch (e) { /* بلا اتصال */ }
    }
    if (!Array.isArray(questions)) return null;
    cache[id] = homeworkAyahTotal(questions, tracking);
    return cache[id];
}

let inFlight = null;

/** يحدّث النسخة المحلية من قائمة تسليمات (كل الحالات). بلا قائمة يجلبها من الخادم. لا يرمي أبداً. */
export function refreshHomeworkReview(list = null) {
    if (inFlight) return inFlight;
    inFlight = (async () => {
        try {
            if (!list) {
                const { isTeacherAuthed } = await import('./api.js');
                if (!isTeacherAuthed()) return false;   // لا جلسة لنظام الواجبات على هذا الجهاز: نكتفي بالنسخة المحلية
                const { listAllSubmissionsForNotifications } = await import('./homeworkApi.js');
                list = await listAllSubmissionsForNotifications();
            }
            if (!Array.isArray(list) || !AppState.studentManager) return false;
            const data = load();
            const students = (await AppState.studentManager.getAllStudents()) || [];
            let localHws = [];
            try { localHws = (AppState.homeworkManager && (await AppState.homeworkManager.getAllHomeworks())) || []; } catch (e) { /* اختياري */ }
            const byId = new Map(students.map(s => [String(s.id), s]));
            const findStudent = (sub) => {
                if (sub.studentId !== undefined && sub.studentId !== null && sub.studentId !== '' && byId.has(String(sub.studentId))) return byId.get(String(sub.studentId));
                const n = normalizeName(sub.studentName);
                const m = students.filter(s => normalizeName(s.name) === n);
                return m.length === 1 ? m[0] : null;
            };
            const live = new Set();
            for (const sub of list) {
                const id = String(sub.id || sub.docId || '');
                if (!id || SKIP_STATUS.has(sub.status)) continue;
                live.add(id);
                const st = findStudent(sub);
                const ts = subTs(sub);
                if (!st || !ts) continue;
                const n = await hwAyahTotal(sub.hwId, localHws, data.hw);
                if (n === null) continue;
                data.subs[id] = { sid: String(st.id), ts, n };
            }
            // تسليم أُلغي/حُذف من الخادم لا يُحسب
            Object.keys(data.subs).forEach(id => { if (!live.has(id)) delete data.subs[id]; });
            save(data);
            return true;
        } catch (e) {
            console.warn('[reviewLog] تعذر تحديث آيات الواجبات:', e);
            return false;
        } finally { inFlight = null; }
    })();
    return inFlight;
}

/** آيات الواجبات المسلَّمة لطالب [{ts, n}] من النسخة المحلية. */
export function homeworkAyahItems(student) {
    if (!student) return [];
    const sid = String(student.id);
    return Object.values(load().subs).filter(x => x && x.sid === sid).map(x => ({ ts: x.ts, n: x.n }));
}

/** كل آيات المراجعة لطالب: { games: [{ts,n}] | null, homework: [{ts,n}] }. */
export async function reviewAyahItems(student) {
    let games = null;
    try { games = await (await import('./trackingService.js')).gameAyahItems(student); } catch (e) { games = null; }
    return { games, homework: homeworkAyahItems(student) };
}

// العدّ الشهري دالة خالصة في engine/ayahCount.js
export { sumInMonth, reviewCountsForMonth } from '../engine/ayahCount.js';
