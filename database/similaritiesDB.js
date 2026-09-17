// database/similaritiesDB.js
//
// 🌟 [تحديث كامل] كان هذا الملف هيكلاً جزئياً فقط (مخزن "similarities" بلا أي تصميم بيانات
// فعلي، ودالتان فقط getAllSimilarities/saveSimilarity بلا أي محتوى مُحمَّل). تم بناء تصميم
// البيانات الكامل هنا اعتماداً على التفريغ اليدوي الكامل لملف الـ PDF (متشابهات آخر 5 أجزاء)
// الذي أرفقه المعلم — راجع مستند المشروع "ركن-المتشابهات-بيانات-آخر-5-أجزاء.md" لتفاصيل
// المنهجية والإحصائيات الكاملة.
//
// ⚠️ ملاحظة توافق مهمة: engine/similarityEngine.js (السابق) كان يفترض شكل بيانات ضيّق
// مختلف تماماً لكل سجل ({{ text, surahs, details أو surahsNames }}) ولم يكن مُفعَّلاً في أي
// شاشة فعلية بالمنصة (غير موصول). الشكل الجديد هنا أغنى بكثير (مجموعات occurrences متعددة،
// تصنيف category، تمييز scope داخلي/جزء عمّ...) ولم يعد متوافقاً مع ذلك الافتراض القديم.
// لم نُعدِّل similarityEngine.js في هذه الجلسة لأن بناء شاشات/ألعاب "ركن المتشابهات" الفعلية
// مرحلة لاحقة لم تُطلب بعد — لكن أي عمل قادم على تلك الشاشات يجب أن يعيد كتابة
// generateSimilarityChallenge() بالكامل ليتماشى مع بنية السجل الموضحة في
// database/data/mutashabihatSeed.js بدل الاعتماد على شكله القديم. 🌟
//
// 🌟 بنية موحّدة لكل سجل (تخدم متشابهات "داخل السورة" و"جزء عمّ" بنفس الشكل):
//   scope: 'internal' | 'juzAmma'
//   surahs: [أرقام كل السور المشاركة بالمجموعة] — فلترة بسورة واحدة تعمل بنفس المنطق للنوعين
//   occurrences: كل موضع يحمل surahNumber/surahName الخاصين به مباشرة (حتى مواضع "الداخلية")
// راجع التوثيق الكامل لبنية الحقول في رأس ملف database/data/mutashabihatSeed.js 🌟

import { MUTASHABIHAT_SEED, MUTASHABIHAT_SEED_VERSION } from "./data/mutashabihatSeed.js";

export const SIMILARITIES_DB_NAME = "DarHamSimilarities";
// 🌟 رُفع رقم الإصدار من 1 إلى 2 عند إعادة تصميم شكل البيانات (لا حاجة لتغيير هيكلي فعلي في
// المخزن نفسه — نفس الاسم keyPath "id" autoIncrement كما كان — لكن رفعناه للتوثيق وتحسباً
// لأي فحص مستقبلي يعتمد على رقم الإصدار.
export const SIMILARITIES_DB_VERSION = 2;
export const SIMILARITIES_STORE = "similarities";

// 🌟 معرّف ثابت لسجل "بيانات التحميل" (نفس فكرة PROFILE_ID الثابت في teacherDB.js) — نخزّنه
// في نفس المخزن (قيمة id نصية بدل رقم تلقائي، مسموح بها في مخزن autoIncrement عند تمرير id
// صراحة) لمعرفة إصدار البيانات المُحمَّلة حالياً دون الحاجة لمخزن IndexedDB منفصل.
const SEED_META_ID = "__seedMeta__";

export function initSimilaritiesDB() {
    return new Promise((resolve, reject) => {
        let request = indexedDB.open(SIMILARITIES_DB_NAME, SIMILARITIES_DB_VERSION);
        request.onupgradeneeded = (e) => {
            let db = e.target.result;
            if (!db.objectStoreNames.contains(SIMILARITIES_STORE)) {
                db.createObjectStore(SIMILARITIES_STORE, { keyPath: "id", autoIncrement: true });
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

// 🌟 [جديد] تحميل بيانات المتشابهات المُفرَّغة من ملف الـ PDF/Word عند أول تشغيل، أو إعادة
// تحميلها تلقائياً عند رفع MUTASHABIHAT_SEED_VERSION مستقبلاً — بنفس فلسفة ensureQuranLoaded
// في quranDB.js (فحص قبل التحميل)، لكن بدل fetch من API خارجي نستورد البيانات من ملف JS
// مُرفَق بالمنصة مباشرة (لا يحتاج اتصال إنترنت).
//
// 🌟 [عدّل — 2026-09-16] بعد إضافة شاشة "إضافة متشابهة يدويًا" (راجع similarities.js)، لم يعد
// آمناً مسح المخزن بالكامل (`store.clear()`) عند كل تحديث لبيانات الـ Seed — كان هذا سيمسح
// أيضاً أي متشابهات أضافها المعلم يدوياً من الواجهة. الحل: كل سجل يُخزَّن الآن بحقل `source`
// ('seed' لبيانات الملف الثابت، 'manual' لإضافات المعلم — راجع addManualGroup/updateManualGroup
// أدناه). عند إعادة التحميل، نحذف فقط السجلات اللي `source` بتاعها **مش** 'manual' (بما فيها
// أي سجل قديم بلا حقل source إطلاقاً — بيانات محمّلة قبل هذا التعديل، تُعامَل كـ seed ضمنياً
// لأنها كانت كلها من نفس المصدر وقتها)، ثم نعيد إدراج بيانات الـ Seed الحالية بعلامة
// source:'seed' — فتبقى أي إضافة يدوية سليمة تماماً مهما تكرّر تحديث بيانات الملف الثابت.
export async function ensureSimilaritiesLoaded(db) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(SIMILARITIES_STORE, "readonly");
        const store = tx.objectStore(SIMILARITIES_STORE);
        const metaReq = store.get(SEED_META_ID);
        metaReq.onsuccess = () => {
            const meta = metaReq.result;
            if (meta && meta.seedVersion === MUTASHABIHAT_SEED_VERSION) {
                resolve(db);
                return;
            }
            try {
                const writeTx = db.transaction(SIMILARITIES_STORE, "readwrite");
                const writeStore = writeTx.objectStore(SIMILARITIES_STORE);
                const getAllReq = writeStore.getAll();
                getAllReq.onsuccess = () => {
                    const existing = getAllReq.result || [];
                    existing.forEach(record => {
                        if (record.id !== SEED_META_ID && record.source !== 'manual') {
                            writeStore.delete(record.id);
                        }
                    });
                    MUTASHABIHAT_SEED.forEach(record => writeStore.add({ ...record, source: 'seed' }));
                    writeStore.put({
                        id: SEED_META_ID,
                        seedVersion: MUTASHABIHAT_SEED_VERSION,
                        loadedAt: new Date().toISOString(),
                        recordsCount: MUTASHABIHAT_SEED.length
                    });
                };
                writeTx.oncomplete = () => resolve(db);
                writeTx.onerror = (e) => reject(e.target.error);
            } catch (error) {
                reject(error);
            }
        };
        metaReq.onerror = (e) => reject(e.target.error);
    });
}

export class SimilaritiesManager {
    constructor(db) {
        this.db = db;
    }

    // 🌟 كل المجموعات (داخلية + جزء عمّ) — سجل بيانات التحميل الداخلي (__seedMeta__) مُستبعَد
    // دائماً هنا حتى لا يظهر كأنه مجموعة متشابهات فعلية لمستهلكي هذه الدالة.
    getAllSimilarities() {
        return new Promise((resolve) => {
            const tx = this.db.transaction(SIMILARITIES_STORE, "readonly");
            const store = tx.objectStore(SIMILARITIES_STORE);
            const request = store.getAll();
            request.onsuccess = () => resolve((request.result || []).filter(r => r.id !== SEED_META_ID));
        });
    }

    // 🌟 [جديد] كل مجموعات المتشابهات (بنوعيها) التي تخص سورة معيّنة — بلا فهرس مخصص (getAll
    // ثم فلترة بالذاكرة)، بنفس أسلوب بقية قواعد بيانات المنصة (راجع dualTestsDB.js مثلاً).
    // يعمل بشكل موحّد للسور الداخلية (46-77) وسور جزء عمّ (78-114) معاً.
    async getBySurah(surahNumber) {
        const all = await this.getAllSimilarities();
        return all.filter(r => r.surahs && r.surahs.includes(surahNumber));
    }

    // 🌟 [جديد] فقط متشابهات "داخل السورة نفسها" لسورة معيّنة
    async getInternalBySurah(surahNumber) {
        return (await this.getBySurah(surahNumber)).filter(r => r.scope === 'internal');
    }

    // 🌟 [جديد] فقط متشابهات "جزء عمّ" (المتقاطعة بين السور) التي تشارك فيها سورة معيّنة —
    // هذا يحقق فعلياً تجميع "بيانات كل سورة مع بعض" لقسم جزء عمّ: كل مجموعة تُعاد هنا تحمل
    // occurrences لكل السور المشاركة معها (وليس فقط موضع السورة المطلوبة)، فيسهل عرض "هذا
    // اللفظ ورد أيضاً في سورة كذا" من داخل شاشة السورة نفسها.
    async getJuzAmmaBySurah(surahNumber) {
        return (await this.getBySurah(surahNumber)).filter(r => r.scope === 'juzAmma');
    }

    // 🌟 [جديد] جلب مجموعة متشابهات واحدة بمعرّفها النصي (groupId، مثال "46-3" أو "amma-7")
    // — يُستخدم لفتح شاشة لعب مجموعة محددة (راجع similarities/similarities-play.js). لا يوجد
    // فهرس مخصص لهذا الحقل في IndexedDB (groupId ليس keyPath المخزن، الذي يبقى id تلقائي)،
    // فنعتمد getAll ثم فلترة بالذاكرة بنفس أسلوب بقية دوال هذا الملف بالضبط.
    async getByGroupId(groupId) {
        const all = await this.getAllSimilarities();
        return all.find(r => r.groupId === groupId) || null;
    }

    saveSimilarity(data) {
        return new Promise((resolve) => {
            const tx = this.db.transaction(SIMILARITIES_STORE, "readwrite");
            const store = tx.objectStore(SIMILARITIES_STORE);
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
        });
    }

    // 🌟 [جديد — 2026-09-16] إضافة/تعديل/حذف متشابهة "يدوية" من شاشة similarities.js. أي سجل
    // يُحفظ هنا بعلامة source:'manual' فلا يُمسح أبداً عند إعادة تحميل بيانات الـ Seed مستقبلاً
    // (راجع ensureSimilaritiesLoaded أعلاه). groupId لهذه السجلات يُبنى بصيغة "<رقم السورة>-m<طابع
    // زمني>" (راجع similarities.js) — الحرف m يضمن عدم تعارضه أبداً مع أي groupId مستقبلي من
    // ملف Seed جديد (الذي يستخدم أرقاماً صرفة بعد الشرطة دائماً، بلا استثناء موثّق).
    addManualGroup(groupData) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(SIMILARITIES_STORE, "readwrite");
            const store = tx.objectStore(SIMILARITIES_STORE);
            const request = store.add({ ...groupData, source: 'manual' });
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    updateManualGroup(dbId, groupData) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(SIMILARITIES_STORE, "readwrite");
            const store = tx.objectStore(SIMILARITIES_STORE);
            const request = store.put({ ...groupData, id: dbId, source: 'manual' });
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    deleteGroup(dbId) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(SIMILARITIES_STORE, "readwrite");
            const store = tx.objectStore(SIMILARITIES_STORE);
            const request = store.delete(dbId);
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    }
}
