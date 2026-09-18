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

const KIDS_AUDIO_DB_NAME = "DarHamKidsAudio";
const KIDS_AUDIO_DB_VERSION = 1;
const KIDS_AUDIO_STORE = "ayahAudio";

// 🌟 بقرار المعلم: 64kbps بدل 192kbps الأصلية (راجع الشرح أعلى الملف). نفس القارئ "المرتل"
// (ar.abdulbasitmurattal) المُعتمَد أصلاً في engine/kidsEngine.js دون أي تغيير.
export const KIDS_AUDIO_BITRATE = 64;
const KIDS_AUDIO_RECITER = "ar.abdulbasitmurattal";

// 🌟 دالة بناء رابط صوت الآية — يستخدمها هذا الملف (التحميل المسبق + خط الرجوع المباشر)،
// ونفس القيمتين (bitrate/قارئ) مكرَّرتان يدويًا في engine/kidsEngine.js لبناء رابط <audio> src
// الأصلي (⚠️ [افتراض صريح]: لم نستورد هذه الدالة هناك عمدًا — kidsEngine.js لا يستورد من
// database/ في أي مكان حاليًا بالمشروع كله، فحافظنا على نفس الفصل القائم بين "محرك نقي" و"طبقة
// تخزين"، بدل كسر هذا الفصل لأجل توحيد سطر واحد فقط. لو غيّر المعلم الـbitrate مستقبلاً، يلزم
// تعديل الرقم في الملفين معًا).
export function buildAyahAudioUrl(ayahNumber) {
    return `https://cdn.islamic.network/quran/audio/${KIDS_AUDIO_BITRATE}/${KIDS_AUDIO_RECITER}/${ayahNumber}.mp3`;
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
        request.onsuccess = (e) => resolve(e.target.result);
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
                request.onsuccess = () => resolve(request.result ? request.result.blob : null);
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
                store.put({ number: ayahNumber, blob, bitrate: KIDS_AUDIO_BITRATE });
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            } catch (e) {
                console.warn("تعذر تخزين صوت الآية محليًا:", e);
                resolve(false);
            }
        });
    }

    // 🌟 جلب الصوت من رابط CDN (أو رابط جاهز مُمرَّر — مستخدَم من خط الرجوع المباشر في
    // kidsGame.js لتفادي بناء الرابط مرتين) وتخزينه محليًا كـBlob
    async cacheFromUrl(ayahNumber, url) {
        const response = await fetch(url || buildAyahAudioUrl(ayahNumber));
        if (!response.ok) throw new Error(`فشل تحميل صوت الآية رقم ${ayahNumber}: ${response.status}`);
        const blob = await response.blob();
        await this.saveAudio(ayahNumber, blob);
        return blob;
    }

    // 🌟 [جديد] التحميل المسبق لكل آيات نطاق الطالب دفعة واحدة (بقرار المعلم — راجع الشرح أعلى
    // الملف). يتخطى فورًا أي آية مخزَّنة مسبقًا (بلا إعادة تحميل غير ضرورية عند فتح الشاشة مرات
    // متكررة لنفس الطالب)، ويكمل بهدوء لو فشلت آية بعينها بلا توقف كامل العملية، وتسلسلية (وليست
    // متوازية بالكامل) عمدًا لتفادي إغراق اتصال إنترنت المعلم بمئات الطلبات دفعة واحدة عند طالب
    // بنطاق واسع.
    async prefetchAyahs(ayahNumbers, onProgress) {
        const uniqueNumbers = [...new Set(ayahNumbers)].filter(n => !!n);
        let done = 0;
        for (const number of uniqueNumbers) {
            try {
                const existing = await this.getAudio(number);
                if (!existing) await this.cacheFromUrl(number);
            } catch (e) {
                console.warn(`تعذر تحميل صوت الآية رقم ${number} مسبقًا (ستُعاد المحاولة تلقائيًا في المرة القادمة):`, e);
            }
            done++;
            if (typeof onProgress === 'function') onProgress(done, uniqueNumbers.length);
        }
    }
}
