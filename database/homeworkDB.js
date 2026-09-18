// database/homeworkDB.js

export function initHomeworkDB() {
    return new Promise((resolve, reject) => {
        // 🌟 رفعنا الإصدار إلى 2 لإجبار المتصفح على تحديث الهيكل وإصلاح الخطأ
        let request = indexedDB.open("DarHamHomeworks", 2); 
        
        request.onupgradeneeded = (e) => {
            let db = e.target.result;
            // إزالة autoIncrement لأننا نرسل الـ ID يدوياً كنص (مثال: HW_1234)
            if (!db.objectStoreNames.contains("homeworks")) {
                db.createObjectStore("homeworks", { keyPath: "id" }); 
            }
            if (!db.objectStoreNames.contains("submissions")) {
                db.createObjectStore("submissions", { keyPath: "id" });
            }
        };
        
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

export class HomeworkManager {
    constructor(db) {
        this.db = db;
    }

    getAllHomeworks() {
        return new Promise((resolve) => {
            const tx = this.db.transaction("homeworks", "readonly");
            const store = tx.objectStore("homeworks");
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
        });
    }

    addHomework(hwData) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("homeworks", "readwrite");
            const store = tx.objectStore("homeworks");
            const request = store.add(hwData);
            request.onsuccess = () => resolve(request.result);
            // 🌟 [إصلاح] قبل كده مفيش onerror هنا إطلاقاً — لو فشلت الكتابة (مثلاً تعارض
            // مفتاح ID مكرر) كان الـ Promise يفضل معلّق للأبد بصمت بدل ما يرفض بخطأ واضح
            request.onerror = () => reject(request.error);
        });
    }

    updateHomework(hwData) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("homeworks", "readwrite");
            const store = tx.objectStore("homeworks");
            const request = store.put(hwData);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error); // 🌟 [إصلاح] نفس السبب أعلاه بالضبط
        });
    }

    deleteHomework(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("homeworks", "readwrite");
            const store = tx.objectStore("homeworks");
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error); // 🌟 [إصلاح] نفس السبب أعلاه بالضبط
        });
    }

    // دالة إنشاء الواجب (التي تستدعيها الشاشة)
    createHomework(hwData) {
        return this.addHomework(hwData);
    }
}

// ==========================================
// 🌟🌟 [جديد] ترميز/فك ترميز بيانات الواجب داخل الرابط نفسه (روابط "مكتفية ذاتياً")
// ==========================================
// ليه ده مهم؟ الطريقة القديمة كانت الرابط يحمل معرّف الواجب فقط (?hw=HW_123)، وفتحه يتطلب
// البحث عنه إما محلياً (IndexedDB، يشتغل فقط على نفس جهاز المعلم) أو في السحابة (Firestore،
// يحتاج اتصال إنترنت سليم + قواعد أمان/App Check شغالة بلا أي عائق). أي عائق في أي طبقة من
// دول (لا يوجد إنترنت، قواعد أمان، App Check، إلخ) يظهر للطالب كرسالة "الواجب غير موجود" رغم
// إن الواجب موجود فعلاً وصحيح.
// الحل هنا: نُرمّز بيانات الواجب (الأسئلة وكل ما يلزم لحلّه) داخل الرابط ذاته بصيغة Base64
// آمنة لليونيكود (عبر TextEncoder/TextDecoder المدمجين في المتصفح — بدون أي مكتبة خارجية)،
// فيصبح فتح الرابط لا يحتاج أي بحث في IndexedDB ولا أي اتصال بالسحابة إطلاقاً: البيانات كلها
// موجودة في الرابط نفسه. لاحظ تعمّدنا استبعاد assignedStudentAvatar (ممكن يكون صورة Base64
// ضخمة) من الترميز حتى يبقى الرابط بحجم معقول — مش مستخدم أصلاً في شاشتي الترحيب/اللعب
// (student/homework-welcome.js و games/homework-play.js)، فاستبعاده لا يكسر أي شيء.
// 🔗 التوافق مع الروابط القديمة محفوظ بالكامل: student/homework-welcome.js يحاول فك الترميز
// أولاً، ولو فشل (يعني الرابط قديم ويحمل معرّفاً بسيطاً فقط) يرجع تلقائياً لنفس المسار القديم
// (بحث محلي ثم سحابي) بلا أي تغيير في سلوكه.

// تحويل نص (يدعم العربي) إلى Base64 آمن للاستخدام داخل رابط (بدون + / = المحجوزة في الروابط)
function utf8ToBase64Url(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    bytes.forEach(b => { binary += String.fromCharCode(b); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// عكس العملية أعلاه بالضبط
function base64UrlToUtf8(b64url) {
    let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) b64 += '=';
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
}

// دالة يستخدمها settings/homework-prep.js عند بناء رابط المشاركة
export function encodeHomeworkForLink(hwData) {
    // نستبعد assignedStudentAvatar فقط (راجع الشرح أعلاه) ونُبقي على باقي الحقول كما هي
    const { assignedStudentAvatar, ...compactData } = hwData;
    return utf8ToBase64Url(JSON.stringify(compactData));
}

// دالة يستخدمها student/homework-welcome.js عند فتح الرابط — ترجع null لو الفك فشل أو
// الناتج مش شكل واجب صحيح (يعني رابط قديم بمعرّف بسيط)، فيتعامل معها المستدعي كإشارة
// للرجوع للمسار القديم (بحث محلي/سحابي) بدل رمي استثناء يكسر الشاشة
export function decodeHomeworkFromLink(encoded) {
    try {
        const parsed = JSON.parse(base64UrlToUtf8(encoded));
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.questions) && parsed.id) {
            return parsed;
        }
        return null;
    } catch (e) {
        return null; // رابط قديم (معرّف بسيط) أو بيانات تالفة — نرجع null بهدوء بدل رمي خطأ
    }
}