// database/trackingDB.js
// =============================================================================
// 🌟 [جديد — الواجب الذكي] قاعدة بيانات "سجل أداء الطالب": مخزن واحد performance_events، سجل لكل "حدث أداء"
// (إجابة عن سؤال في واجب/لعبة/اختبار فردي/قائمة أخطاء). راجع engine/trackingEngine.js لشكل الحدث وكيف تُحسب منه
// كل الإحصاءات (مستوى المقطع، دقة المهارة، التشخيص). لا نحفظ أي إحصاءات مشتقّة هنا عمداً: الأحداث وحدها هي الحقيقة.
//
// نفس نمط بقية قواعد المنصة (database/reviewScheduleDB.js كمرجع): مفتاح تلقائي + إغلاق الاتصال عند ترقية تبويب آخر.
// الاستثناء الوحيد: فهرس byStudent، لأن الأحداث تتراكم (آلاف السجلات) فلا نقرأها كلها لحساب طالب واحد.
// المعرّف يُخزَّن نصاً دائماً (String) ليتطابق مع core/studentCleanup.js الذي يقارن بـString.
// =============================================================================

export const TRACKING_DB_NAME = 'DarHamTracking';
export const TRACKING_STORE = 'performance_events';

export function initTrackingDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(TRACKING_DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(TRACKING_STORE)) {
                const store = db.createObjectStore(TRACKING_STORE, { keyPath: 'id', autoIncrement: true });
                store.createIndex('byStudent', 'studentId', { unique: false });
            }
        };
        request.onsuccess = (e) => {
            const openedDb = e.target.result;
            openedDb.onversionchange = () => { try { openedDb.close(); } catch (err) { /* لا شيء */ } };
            resolve(openedDb);
        };
        request.onblocked = () => console.warn('ترقية قاعدة التتبّع محجوبة بتبويب آخر للمنصة — أغلق التبويبات الأخرى.');
        request.onerror = (e) => reject(e.target.error);
    });
}

export class TrackingManager {
    constructor(db) {
        this.db = db;
    }

    _norm(ev) {
        return { ...ev, studentId: String(ev.studentId) };
    }

    // إضافة دفعة أحداث في معاملة واحدة (كلها أو لا شيء)
    addEvents(events) {
        const list = (events || []).filter(Boolean).map(ev => this._norm(ev));
        if (!list.length) return Promise.resolve(0);
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(TRACKING_STORE, 'readwrite');
            const store = tx.objectStore(TRACKING_STORE);
            list.forEach(ev => store.add(ev));
            tx.oncomplete = () => resolve(list.length);
            tx.onerror = tx.onabort = () => reject(tx.error);
        });
    }

    getEventsForStudent(studentId) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(TRACKING_STORE, 'readonly');
            const req = tx.objectStore(TRACKING_STORE).index('byStudent').getAll(String(studentId));
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });
    }

    // يستبدل أحداث مصدر معيّن (تسليم واجب/جلسة) بنسخة جديدة في معاملة واحدة — يمنع تكرار الأحداث عند إعادة التصحيح
    replaceEventsForRef(studentId, source, refId, events) {
        const sid = String(studentId);
        const list = (events || []).filter(Boolean).map(ev => this._norm({ ...ev, studentId: sid }));
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(TRACKING_STORE, 'readwrite');
            const store = tx.objectStore(TRACKING_STORE);
            const cur = store.index('byStudent').openCursor(IDBKeyRange.only(sid));
            cur.onsuccess = () => {
                const c = cur.result;
                if (c) {
                    const v = c.value;
                    if (v.source === source && String(v.refId) === String(refId)) c.delete();
                    c.continue();
                } else {
                    list.forEach(ev => store.add(ev));
                }
            };
            tx.oncomplete = () => resolve(list.length);
            tx.onerror = tx.onabort = () => reject(tx.error);
        });
    }

    // يحذف كل أحداث مصدر محدّد لطالب (يُستخدم قبل إعادة بناء الملف من البيانات الحالية)
    deleteBySource(studentId, sources) {
        const sid = String(studentId);
        const set = new Set(sources);
        return new Promise((resolve, reject) => {
            let removed = 0;
            const tx = this.db.transaction(TRACKING_STORE, 'readwrite');
            const cur = tx.objectStore(TRACKING_STORE).index('byStudent').openCursor(IDBKeyRange.only(sid));
            cur.onsuccess = () => {
                const c = cur.result;
                if (!c) return;
                if (set.has(c.value.source)) { c.delete(); removed++; }
                c.continue();
            };
            tx.oncomplete = () => resolve(removed);
            tx.onerror = tx.onabort = () => reject(tx.error);
        });
    }

    deleteStudent(studentId) {
        const sid = String(studentId);
        return new Promise((resolve, reject) => {
            let removed = 0;
            const tx = this.db.transaction(TRACKING_STORE, 'readwrite');
            const cur = tx.objectStore(TRACKING_STORE).index('byStudent').openCursor(IDBKeyRange.only(sid));
            cur.onsuccess = () => { const c = cur.result; if (c) { c.delete(); removed++; c.continue(); } };
            tx.oncomplete = () => resolve(removed);
            tx.onerror = tx.onabort = () => reject(tx.error);
        });
    }

    countForStudent(studentId) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(TRACKING_STORE, 'readonly');
            const req = tx.objectStore(TRACKING_STORE).index('byStudent').count(String(studentId));
            req.onsuccess = () => resolve(req.result || 0);
            req.onerror = () => reject(req.error);
        });
    }
}
