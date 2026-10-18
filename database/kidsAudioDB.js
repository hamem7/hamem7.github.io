// database/kidsAudioDB.js
// 🌟 [جديد بالكامل] قاعدة بيانات محلية (IndexedDB) لتخزين أصوات آيات لعبة "استمع وخمّن الآية"
// (ركن الأطفال فقط) بعد أول تحميل — بنفس نمط بقية ملفات database/*.js في المشروع (كل كيان
// بملف/قاعدة بيانات خاصة به)، وبنفس فلسفة "IndexedDB لأي بيانات كبيرة نسبيًا بدل localStorage"
// المتّبعة أصلاً في database/teacherDB.js لصورة/ختم المعلم — هنا ملفات صوت بدل صور.
//
// ⚠️ [افتراض صريح — بقرار المعلم عبر سؤال توضيحي قبل البناء]: عند فتح شاشة ألعاب الأطفال، تُحمَّل
// كل أصوات آيات نطاق الطالب المحدَّد (kidsFrom/kidsTo) دفعة واحدة في الخلفية (راجع الاستدعاء في
// games/kidsGame.js داخل openKidsGameScreen) — بدل التحميل التدريجي عند ظهور كل آية كسؤال لأول
// مرة. بعد اكتمال هذا التحميل مرة واحدة لكل طالب، تعمل اللعبة بالكامل بدون إنترنت لأي آية ضمن
// نطاقه. أي آية يفشل تحميلها (انقطاع إنترنت مؤقت أثناء التحميل المسبق) تبقى غير مخزَّنة بأمان
// ويُعاد تجربتها تلقائيًا في المرة القادمة (بلا توقف كامل عملية التحميل بسبب آية واحدة)، ولو
// احتاجها الطفل قبل اكتمال تحميلها فهناك خط رجوع تلقائي للتشغيل المباشر من الرابط (راجع
// window.playKidsListenAyahAudio في games/kidsGame.js).
//
// ⚠️ [افتراض صريح — بقرار المعلم]: جودة الصوت 64kbps بدل 192kbps التي كانت مستخدَمة عند أول
// بناء لهذه اللعبة — تصغّر حجم كل ملف تقريبًا للثلث (تحميل أسرع + مساحة تخزين أقل) بلا فرق
// محسوس في وضوح آية مفردة قصيرة لغرض تدريب استماع للأطفال. تحقّقنا فعليًا (طلب حقيقي لرابط
// 64kbps لقارئ "المرتل" قبل الاعتماد) أنه يرجع صوتًا فعليًا صحيحًا لا خطأ 404/403 — بنفس منهجية
// التحقق الفعلي المتّبعة عند اختيار القارئ نفسه أول مرة (راجع التعليق في kidsEngine.js).

// 🎧 [تحديث 2026-10-18 — بطلب صاحب المنصة] توحيد الصوت: صار القارئ الشيخ المنشاوي لكل ما يُسمع في المنصة، ويُستخدم هذا
// التخزين لسؤالَي «استمع وخمّن الآية» (الأطفال) و«استمع وكمّل» (الكبار والأطفال). الحجم الأصغر مقبول (بقرار صاحب المنصة)،
// فالمصادر مرتّبة من جودة 64 إلى 128 (راجع engine/ayahAudio.js). كل ملف مخزَّن يحمل اسم قارئه (reciter): ما سُجّل بقارئ آخر
// (عبد الباسط سابقاً) يُتجاهل ويُحذف عند أول تحميل مسبق، فلا يسمع الطفل صوتين مختلفين.
import { LISTEN_RECITER, ayahAudioSources } from '../engine/ayahAudio.js';

const KIDS_AUDIO_DB_NAME = "DarHamKidsAudio";
const KIDS_AUDIO_DB_VERSION = 1;
const KIDS_AUDIO_STORE = "ayahAudio";
const RECITER_ID = LISTEN_RECITER.id;
// أقل حجم مقبول لملف صوت صالح (يمنع تخزين صفحة خطأ HTML أو ملف فارغ على أنه صوت)
const MIN_AUDIO_BYTES = 2000;

// ⚠️ باقية كما كانت لقسم «أبطال التجويد» (tajweed/*): يشغّلها مباشرة بصوت عبد الباسط بلا تخزين. لم يُشملها توحيد الصوت (طُلب لألعاب
// الأطفال وسؤال «استمع وكمّل» فقط). الألعاب لا تستعملها أبداً.
export const KIDS_AUDIO_BITRATE = 64;
export function buildAyahAudioUrl(ayahNumber) {
    return `https://cdn.islamic.network/quran/audio/${KIDS_AUDIO_BITRATE}/ar.abdulbasitmurattal/${ayahNumber}.mp3`;
}

export function initKidsAudioDB() {
    return new Promise((resolve, reject) => {
        let request = indexedDB.open(KIDS_AUDIO_DB_NAME, KIDS_AUDIO_DB_VERSION);
        request.onupgradeneeded = (e) => {
            let db = e.target.result;
            if (!db.objectStoreNames.contains(KIDS_AUDIO_STORE)) {
                db.createObjectStore(KIDS_AUDIO_STORE, { keyPath: "number" });
            }
        };
        request.onsuccess = (e) => {
            const openedDb = e.target.result;
            // 🌟 [إصلاح تدقيق ما قبل الإطلاق] لو فُتحت المنصة في تبويبين وترقّى أحدهما هيكل القاعدة، كان الآخر يحجب الترقية بصمت
            // (تعليق/فشل الإقلاع). الآن يغلق التبويب القديم اتصاله عند طلب الترقية فتكمل الترقية في التبويب الجديد.
            openedDb.onversionchange = () => { try { openedDb.close(); } catch (err) { /* لا شيء */ } };
            resolve(openedDb);
        };
        // 🌟 ترقية محجوبة بتبويب آخر مفتوح: نُنبّه في الكونسول بدل الصمت (الفتح يكتمل تلقائياً بعد إغلاقه)
        request.onblocked = () => console.warn('ترقية قاعدة البيانات محجوبة بتبويب آخر للمنصة — أغلق التبويبات الأخرى.');
        request.onerror = (e) => reject(e.target.error);
    });
}

export class KidsAudioManager {
    constructor(db) {
        this.db = db;
    }

    // يُعيد Blob الصوت المخزَّن محليًا لهذه الآية، أو null لو غير مخزَّن بعد (حالة طبيعية —
    // إما لم يكتمل التحميل المسبق بعد، أو انضمت هذه الآية لنطاق الطالب حديثًا)
    getAudio(ayahNumber) {
        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction(KIDS_AUDIO_STORE, "readonly");
                const store = tx.objectStore(KIDS_AUDIO_STORE);
                const request = store.get(ayahNumber);
                request.onsuccess = () => resolve(request.result && request.result.reciter === RECITER_ID ? request.result.blob : null);
                request.onerror = () => resolve(null);
            } catch (e) {
                console.warn("تعذر قراءة صوت الآية المخزَّن محليًا:", e);
                resolve(null);
            }
        });
    }

    saveAudio(ayahNumber, blob) {
        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction(KIDS_AUDIO_STORE, "readwrite");
                const store = tx.objectStore(KIDS_AUDIO_STORE);
                store.put({ number: ayahNumber, blob, reciter: RECITER_ID });
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            } catch (e) {
                console.warn("تعذر تخزين صوت الآية محليًا:", e);
                resolve(false);
            }
        });
    }

    // 🌟 جلب صوت الآية وتخزينه محلياً كـBlob: يجرّب مصادرها بالترتيب (الأخف أولاً) إلى أن ينجح أحدها بملف صوت صالح.
    // ayah: { number, surahNumber, numberInSurah }. يرمي خطأ لو فشلت كل المصادر (يبقى التشغيل المباشر ممكناً).
    async cacheAyah(ayah) {
        let lastErr = null;
        for (const url of ayahAudioSources(ayah.number, ayah.surahNumber, ayah.numberInSurah)) {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const blob = await response.blob();
                if (blob.size < MIN_AUDIO_BYTES) throw new Error('ملف صوت غير صالح');
                await this.saveAudio(ayah.number, blob);
                return blob;
            } catch (e) { lastErr = e; }
        }
        throw new Error(`فشل تحميل صوت الآية رقم ${ayah.number}: ${lastErr && lastErr.message}`);
    }

    // 🌟 يحذف أي ملفات صوت مخزَّنة بقارئ غير المعتمد (بقايا عبد الباسط قبل التوحيد) لتوفير المساحة. صامت عند الفشل.
    purgeOtherReciters() {
        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction(KIDS_AUDIO_STORE, "readwrite");
                const store = tx.objectStore(KIDS_AUDIO_STORE);
                const cur = store.openCursor();
                cur.onsuccess = () => { const c = cur.result; if (!c) return; if (c.value.reciter !== RECITER_ID) c.delete(); c.continue(); };
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            } catch (e) { resolve(false); }
        });
    }

    // 🌟 التحميل المسبق لآيات نطاق الطالب في الخلفية (بقرار صاحب المنصة). ayahs = كائنات آيات المنصة (number, surahNumber, numberInSurah).
    // يتخطى المخزَّن، ويكمل بهدوء لو فشلت آية (تُعاد المحاولة في المرة القادمة)، وتسلسلي لئلا نُغرق الاتصال. عند تفعيل «توفير البيانات» لا يبدأ.
    async prefetchAyahs(ayahs, onProgress) {
        try { if (navigator.connection && navigator.connection.saveData) return; } catch (e) { /* لا شيء */ }
        await this.purgeOtherReciters();
        const seen = new Set();
        const unique = (ayahs || []).filter(a => a && a.number && !seen.has(a.number) && seen.add(a.number));
        let done = 0;
        for (const ayah of unique) {
            try {
                if (!(await this.getAudio(ayah.number))) await this.cacheAyah(ayah);
            } catch (e) {
                console.warn(`تعذر تحميل صوت الآية رقم ${ayah.number} مسبقًا (ستُعاد المحاولة في المرة القادمة):`, e);
            }
            done++;
            if (typeof onProgress === 'function') onProgress(done, unique.length);
        }
    }
}
