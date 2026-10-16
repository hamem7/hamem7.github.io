// core/cloudSync.js
// ⏸️ [2026-10-16 — معطَّلة من الواجهة] المزامنة بين الأجهزة أُخفيت وأُوقفت تلقائياً بقرار صاحب المنصة (النسخ الاحتياطي على Google Drive وإمكانية
// الاستعادة على جهاز جديد يغنيان عنها، وهي ترفع سجلات الطلاب بنص صريح إلى Sheet صاحب المنصة). لا يُستدعى هذا الملف من أي شاشة الآن.
// الشيفرة والخادم (Code.gs: syncManifest/syncPull/syncPush وورقة SyncData) باقيان كما هما للتراجع السهل؛ حذفهما نهائياً مرحلة لاحقة.
// ==========================================================
// 🌟 [جديد 2026-10-13 — مزامنة سجل الطالب بين أجهزة المعلم] تُبقي سجل كل طالب (سجل التقييمات history_<id> + أحداث التتبّع
// performance_events + ملف الطالب عند الإنشاء) متطابقاً على كل جهاز يدخل به المعلم بنفس حساب جوجل. الخادم الموجود (Apps Script +
// Sheets، ورقة SyncData) هو وسيط التخزين فقط؛ كل منطق الدمج هنا وفي engine/syncMerge.js (خالص ومُختبر).
//
// ضمانات (بقرار التصميم):
//  - الدمج اتحاد فقط: لا يُحذف شيء محلي بسبب المزامنة، وإعادة المزامنة لا تكرّر شيئاً، وفشلها لا يمس بيانات الجهاز.
//  - ملف الطالب (الاسم، النقاط…) يُنشأ من الخادم عند جهاز جديد فقط؛ الطالب الموجود محلياً لا يُعاد كتابة ملفه من الخادم.
//  - ربط الطالب بين الأجهزة بمعرّف ثابت syncUid يُضاف لملفه (لا بالرقم المحلي الذي يختلف بين الأجهزة).
//  - حذف طالب على جهاز لا يُحذفه من الأجهزة الأخرى ولا يعود إلى هذا الجهاز بعد المزامنة (قائمة محلية dh_sync_tomb).
//  - لا شيء يُرفع إلا بعد تسجيل دخول المعلم بجوجل (نفس بوابة الواجبات)، وكل كتابة تُثبَّت قراءةً في الخادم (persisted:true).
// خارج النطاق حالياً (لا تُزامَن): الحفظ الشهري، جداول المراجعة، التجويد، المتشابهات، الشهادات، صور الطلاب. للنسخ الشامل استعمل
// النسخة الاحتياطية (core/backupRestore.js).
// ==========================================================

import { AppState } from './app.js';
import { call, ApiError, clearTeacherAuth, getTeacherAuth, isTeacherAuthed } from './api.js';
import { readStudentHistory } from './homeworkRecords.js';
import {
    hashOf, mergeEvents, mergeHistory, profileOf, adoptByUniqueName, partitionItems, profileKey,
    uidOfKey, kindOfKey, newSyncUid
} from '../engine/syncMerge.js';

const STATE_KEY = (userId) => `dh_sync_state_${userId}`;
const TOMB_KEY = 'dh_sync_tomb';
const ENABLED_KEY = 'dh_sync_enabled';
const AUTO_EVERY_MS = 12 * 3600 * 1000;
const PULL_BATCH = 8;
const PUSH_BATCH_ITEMS = 20;
const PUSH_BATCH_CHARS = 250000;
const MAX_ATTEMPTS = 3;

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

function loadState(userId) {
    try {
        const s = JSON.parse(lsGet(STATE_KEY(userId)));
        if (s && typeof s === 'object') return { revs: s.revs || {}, hashes: s.hashes || {}, lastAt: s.lastAt || 0 };
    } catch (e) { /* حالة تالفة = ابدأ من الصفر (آمن: الدمج اتحاد) */ }
    return { revs: {}, hashes: {}, lastAt: 0 };
}
function saveState(userId, st) { lsSet(STATE_KEY(userId), JSON.stringify(st)); }

function tombSet() { try { return new Set(JSON.parse(lsGet(TOMB_KEY)) || []); } catch (e) { return new Set(); } }

/** يُستدعى قبل حذف طالب: يمنع عودته من الخادم إلى هذا الجهاز. لا يحذف شيئاً من الخادم ولا من أجهزة أخرى. */
export function recordStudentDeletion(student) {
    try {
        if (!student || !student.syncUid) return;
        const s = tombSet(); s.add(student.syncUid);
        lsSet(TOMB_KEY, JSON.stringify([...s]));
    } catch (e) { /* لا شيء */ }
}

export function isSyncEnabled() { return lsGet(ENABLED_KEY) === '1'; }
export function getSyncStatus() {
    const auth = getTeacherAuth();
    return { enabled: isSyncEnabled(), signedIn: !!auth, lastAt: auth ? (loadState(auth.userId).lastAt || 0) : 0 };
}

async function api(action, params, opts = {}) {
    try { return await call(action, params, { teacher: true, ...opts }); }
    catch (e) { if (e instanceof ApiError && e.code === 'UNAUTHORIZED') clearTeacherAuth(); throw e; }
}

async function pullKeys(keys) {
    const out = [];
    for (let i = 0; i < keys.length; i += PULL_BATCH) {
        const r = await api('syncPull', { keys: keys.slice(i, i + PULL_BATCH) }, { timeoutMs: 40000 });
        out.push(...(r.items || []));
    }
    return out;
}

async function pushItems(items) {
    const written = [], conflicts = [];
    let batch = [], size = 0;
    const flush = async () => {
        if (!batch.length) return;
        const r = await api('syncPush', { items: batch }, { write: true, timeoutMs: 60000 });
        written.push(...(r.written || [])); conflicts.push(...(r.conflicts || []));
        batch = []; size = 0;
    };
    for (const it of items) {
        const len = JSON.stringify(it).length;
        if (batch.length && (batch.length >= PUSH_BATCH_ITEMS || size + len > PUSH_BATCH_CHARS)) await flush();
        batch.push(it); size += len;
    }
    await flush();
    return { written, conflicts };
}

const historyTs = (h) => Number(h && h.timestamp) || 0;

// مزامنة طالب واحد (له syncUid). يرجع ملخصاً. يعيد المحاولة عند تعارض الكتابة (جهاز آخر كتب أثناء ذلك).
async function syncStudent(student, state, manifestRef, summary) {
    const uid = student.syncUid;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const remote = manifestRef.map;
        const remoteKeys = Object.keys(remote).filter(k => uidOfKey(k) === uid);

        // 1) سحب الأجزاء التي تغيّرت على الخادم منذ آخر مزامنة
        const changedKeys = remoteKeys.filter(k => state.revs[k] !== remote[k]);
        const pulled = changedKeys.length ? await pullKeys(changedKeys) : [];
        let remoteEvents = [], remoteHistory = [];
        pulled.forEach(it => {
            const kind = kindOfKey(it.key);
            if (kind === 'e' && Array.isArray(it.data)) remoteEvents = remoteEvents.concat(it.data);
            else if (kind === 'h' && Array.isArray(it.data)) remoteHistory = remoteHistory.concat(it.data);
        });

        // 2) دمج محلي (اتحاد فقط)
        const localHistory = readStudentHistory(student.id);
        const localEvents = AppState.trackingManager ? await AppState.trackingManager.getEventsForStudent(student.id) : [];
        const mh = mergeHistory(localHistory, remoteHistory);
        if (mh.added || mh.changed) {
            if (!lsSet('history_' + student.id, JSON.stringify(mh.merged))) throw new Error('تعذر حفظ سجل التقييمات محلياً (التخزين ممتلئ؟)');
            summary.historyAdded += mh.added;
        }
        let eventsMerged = localEvents.map(e => { const { id, studentId, ...rest } = e; return rest; });
        if (AppState.trackingManager && remoteEvents.length) {
            const me = mergeEvents(localEvents, remoteEvents);
            for (const g of me.supersededGroups) {
                for (const src of g.sources) await AppState.trackingManager.replaceEventsForRef(student.id, src, g.refId, []);
            }
            if (me.toAdd.length) await AppState.trackingManager.addEvents(me.toAdd.map(e => ({ ...e, studentId: String(student.id) })));
            summary.eventsAdded += me.toAdd.length;
            eventsMerged = me.merged;
        } else if (AppState.trackingManager) {
            eventsMerged = mergeEvents(localEvents, []).merged;
        }
        // ما سُحب صار محلياً: نسجّل نسخته وبصمته حتى لا يُسحب ولا يُرفع ثانيةً بلا داعٍ
        pulled.forEach(it => { state.revs[it.key] = it.rev; state.hashes[it.key] = hashOf(it.data); });
        summary.partsPulled += pulled.length;

        // 3) الأجزاء المحلية بعد الدمج، ورفع ما اختلف عمّا يعرفه الخادم
        const parts = new Map();
        partitionItems(uid, 'e', eventsMerged, e => e.ts).forEach((v, k) => parts.set(k, v));
        partitionItems(uid, 'h', mh.merged, historyTs).forEach((v, k) => parts.set(k, v));
        parts.set(profileKey(uid), profileOf(student));
        const toPush = [];
        parts.forEach((data, key) => {
            const h = hashOf(data);
            if (state.hashes[key] !== h) toPush.push({ key, expectedRev: remote[key] || 0, data, _hash: h });
        });
        if (!toPush.length) return;
        const { written, conflicts } = await pushItems(toPush.map(({ _hash, ...it }) => it));
        const hashByKey = new Map(toPush.map(x => [x.key, x._hash]));
        written.forEach(w => { state.revs[w.key] = w.rev; state.hashes[w.key] = hashByKey.get(w.key); remote[w.key] = w.rev; });
        summary.partsPushed += written.length;
        if (!conflicts.length) return;

        // تعارض: جهاز آخر كتب هذه الأجزاء بعد قراءتنا — نحدّث الفهرس ونعيد السحب والدمج ثم الرفع
        if (attempt === MAX_ATTEMPTS) { summary.conflicts += conflicts.length; return; }
        const fresh = await api('syncManifest', {});
        manifestRef.map = Object.fromEntries((fresh.items || []).map(x => [x.key, x.rev]));
        conflicts.forEach(c => { delete state.revs[c.key]; delete state.hashes[c.key]; });
    }
}

let running = null;

/**
 * يزامن كل الطلاب. options.signIn=false: لا يفتح نافذة الدخول (للمزامنة الصامتة). يرجع ملخصاً ولا يرمي للأخطاء المتوقعة.
 * { ok, skipped?, newStudents, adopted, partsPulled, partsPushed, historyAdded, eventsAdded, conflicts, errors:[] }
 */
export function syncNow({ signIn = true } = {}) {
    if (running) return running;
    running = (async () => {
        const summary = { ok: true, newStudents: 0, adopted: 0, partsPulled: 0, partsPushed: 0, historyAdded: 0, eventsAdded: 0, conflicts: 0, errors: [] };
        try {
            if (!AppState.studentManager) return { ...summary, ok: false, skipped: 'not_ready' };
            if (!isTeacherAuthed()) {
                if (!signIn) return { ...summary, ok: false, skipped: 'no_auth' };
                const { ensureHomeworkSignIn } = await import('../components/teacherAuthGate.js');
                if (!(await ensureHomeworkSignIn())) return { ...summary, ok: false, skipped: 'cancelled' };
            }
            const userId = getTeacherAuth().userId;
            const state = loadState(userId);

            const man = await api('syncManifest', {});
            const manifestRef = { map: Object.fromEntries((man.items || []).map(x => [x.key, x.rev])) };
            const tomb = tombSet();

            let students = await AppState.studentManager.getAllStudents();
            const knownUids = new Set(students.filter(s => s.syncUid).map(s => s.syncUid));
            const remoteUids = [...new Set(Object.keys(manifestRef.map).filter(k => kindOfKey(k) === 's').map(uidOfKey))];

            // ملفات الطلاب الغريبة عن هذا الجهاز: نسحبها لنتبنّى الأسماء المتطابقة أو ننشئ طلاباً جدداً
            const unknownUids = remoteUids.filter(u => !knownUids.has(u) && !tomb.has(u));
            const remoteProfiles = (await pullKeys(unknownUids.map(profileKey))).map(it => ({ uid: uidOfKey(it.key), rev: it.rev, data: it.data || {} }));
            remoteProfiles.forEach(p => { p.name = p.data.name; });

            // أ) تبنّي الاسم الفريد (طالب محلي بلا معرّف مزامنة يقابله ملف بعيد واحد بنفس الاسم)
            const adopt = adoptByUniqueName(remoteProfiles, students);
            for (const s of students) {
                if (adopt.has(s.id)) { s.syncUid = adopt.get(s.id); await AppState.studentManager.updateStudent(s); summary.adopted++; }
            }
            // ب) معرّف لكل طالب محلي بلا معرّف
            for (const s of students) {
                if (!s.syncUid) { s.syncUid = newSyncUid(); await AppState.studentManager.updateStudent(s); }
            }
            // ج) طلاب بعيدون غير موجودين محلياً → ينشَؤون هنا (جهاز جديد)
            const haveUids = new Set(students.map(s => s.syncUid));
            for (const p of remoteProfiles) {
                if (haveUids.has(p.uid)) continue;
                const base = { ...p.data, syncUid: p.uid };
                delete base.id;
                const newId = await AppState.studentManager.addStudent({ ...base });   // addStudent يصفّر النقاط…
                const created = { ...base, id: newId };                                 // …فنعيدها من الملف البعيد
                await AppState.studentManager.updateStudent(created);
                students.push(created); summary.newStudents++;
            }
            students = students.filter(s => !tomb.has(s.syncUid));

            // د) مزامنة كل طالب (فشل طالب لا يوقف الباقين)
            for (const s of students) {
                try { await syncStudent(s, state, manifestRef, summary); }
                catch (e) {
                    if (e instanceof ApiError && e.code === 'UNAUTHORIZED') throw e;
                    summary.errors.push(`${s.name || s.id}: ${e && e.message || e}`);
                }
            }
            state.lastAt = Date.now();
            saveState(userId, state);
            if (!summary.errors.length && !summary.conflicts) lsSet(ENABLED_KEY, '1');
            summary.ok = summary.errors.length === 0 && summary.conflicts === 0;
            try { document.dispatchEvent(new CustomEvent('dh:sync-done', { detail: summary })); } catch (e) { /* لا شيء */ }
            return summary;
        } catch (e) {
            summary.ok = false;
            summary.errors.push(e instanceof ApiError ? `${e.code}: ${e.message}` : String(e && e.message || e));
            summary.code = e instanceof ApiError ? e.code : 'ERROR';
            return summary;
        } finally { running = null; }
    })();
    return running;
}

/** مزامنة صامتة مرة كل 12 ساعة لمن فعّلها (بعد أول مزامنة ناجحة) — لا تفتح أي نافذة ولا تُزعج المعلم. */
export function maybeAutoSync() {
    try {
        if (!isSyncEnabled() || !isTeacherAuthed() || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
        const auth = getTeacherAuth();
        if (Date.now() - (loadState(auth.userId).lastAt || 0) < AUTO_EVERY_MS) return;
        setTimeout(() => { syncNow({ signIn: false }).catch(() => {}); }, 15000);
    } catch (e) { /* لا شيء */ }
}

