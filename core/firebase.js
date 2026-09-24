// core/firebase.js
// استدعاء مكتبات فايربيس عبر CDN لدعم العمل المباشر على المتصفح و GitHub Pages
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
// 🌟 تم إضافة updateDoc لتحديث البيانات الموجودة (تصحيح المعلم) 🌟
import { getFirestore, collection, addDoc, getDocs, query, where, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
// ⚠️ ملحوظة مهمة: مكتبة Firebase Storage (الخاصة برفع الصوت) لا تُستورد هنا في الأعلى إطلاقاً.
// تم استيرادها سابقاً بشكل ثابت (import عادي) في أعلى الملف، وهذا هو ما تسبب في كسر التطبيق
// بالكامل ("Error loading screen") لأنه لو فشل تحميلها لأي سبب (شبكة، حظر، إعدادات Storage غير
// مفعّلة) فإن ملف firebase.js نفسه يفشل بالكامل في التحميل — وبما أن كل شاشات التطبيق تعتمد على
// هذا الملف، ينهار التطبيق كله فوراً حتى قبل عرض أي شاشة. الحل: نستورد Storage بشكل "كسول"
// (Dynamic Import) فقط داخل دالة uploadAudioAndGetUrl نفسها، ومغلّفة بالكامل بـ try/catch، بحيث
// أي فشل في هذا الجزء تحديداً لا يؤثر إطلاقاً على بقية التطبيق.

// مفاتيح الربط الخاصة بمشروعك (DarHam-Quran)
const firebaseConfig = {
    apiKey: "AIzaSyCbyVInjIEIYq51qoKBK-DZKbBLhhUAsfY",
    authDomain: "darham-quran.firebaseapp.com",
    projectId: "darham-quran",
    storageBucket: "darham-quran.firebasestorage.app",
    messagingSenderId: "52157264045",
    appId: "1:52157264045:web:dc79b3b881d1d7e392d624",
    // 🌟 معرّف Google Analytics (measurementId) — لازم تفعّل خدمة "Google Analytics" من
    // إعدادات مشروع Firebase (⚙️ Project settings → عام → أسفل الصفحة "تكامل Google
    // Analytics")، ثم تنسخ القيمة من هناك وتستبدل القيمة التالية بها. قبل ما تضيفها،
    // الإحصائيات لن تُجمَّع (الكود يتجاهل غيابها بأمان تام ولن يكسر المنصة إطلاقاً — شوف
    // التعليق تحت عند initAnalyticsSafely).
    measurementId: "PASTE_YOUR_MEASUREMENT_ID_HERE"
};

// تهيئة الاتصال بالسحابة وقاعدة البيانات
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// 🛡️🛡️ [جديد] تفعيل Firebase App Check — طبقة حماية إضافية قبل النشر العلني للمستودع
// ==========================================
// ليه ده مهم دلوقتي بالذات؟ قواعد الأمان الحالية (firestore.rules / storage.rules) مضطرة
// تسيب قراءة/سرد تسليمات الطلاب والتسجيلات الصوتية مفتوحة (allow ... if true) لأن شاشة
// المعلم نفسها بتعمل نفس الطلبات دي بدون أي تسجيل دخول حقيقي حاليًا (راجع القرار المعلّق في
// دليل-تطبيق-قواعد-الأمان.md). لو المستودع بقى Public، أي حد يقدر يشوف معرّف المشروع
// (darham-quran) في هذا الملف مباشرة، ويستخدمه لقراءة بيانات كل الطلاب من برا التطبيق تمامًا.
//
// App Check بيقفل التهديد ده تحديدًا: بيتأكد إن أي طلب واصل لـ Firestore/Storage جاي فعلاً من
// نسخة المنصة المنشورة (عبر reCAPTCHA يعمل تلقائيًا في الخلفية ولا يظهر للمستخدم إطلاقاً —
// مفيش أي "اختر كل الصور اللي فيها إشارة مرور" أو أي شيء مرئي)، مش من سكربت خارجي (زي curl)
// بيضرب الـ API مباشرة بمعرفة اسم المشروع بس. هذا لا يحل مشكلة "أي مستخدم للتطبيق الفعلي يقدر
// يشوف بيانات كل الطلاب" (دي محتاجة تسجيل دخول حقيقي للمعلم لاحقًا)، لكنه يقفل التهديد الأكبر:
// زائر عشوائي من الإنترنت لا يستخدم التطبيق إطلاقًا.
//
// 🌟🌟 [إصلاح جوهري — 2026-09-24] هذا كان السبب الحقيقي الأكبر وراء فشل رفع كل الواجبات
// وتسليمات الطلاب للسحابة بشكل شبه دائم (94% من الطلبات كانت "Unverified" في لوحة Firebase):
// الكود هنا كان يستخدم مزوّد reCAPTCHA v3 العادي (ReCaptchaV3Provider) بمفتاح v3 كلاسيكي، لكن
// تطبيق الويب في Firebase Console كان مسجَّلاً (App Check → Apps) تحت نوع مختلف تمامًا:
// reCAPTCHA Enterprise. لكل نوع بروتوكول تحقّق مختلف تمامًا عن التاني، فأي تذكرة (token) ينتجها
// الكود بطريقة v3 كانت تترفض تلقائيًا من Firebase لأنها مش من النوع المسجَّل (Enterprise).
// اكتشفنا كمان إن Firebase أوقف (deprecated) تسجيل reCAPTCHA v3 العادي كخيار جديد بالكامل —
// خانة إدخاله في لوحة التحكم بقت معطّلة تمامًا لأي تسجيل جديد — فالحل الوحيد المتاح فعلياً هو
// التوافق مع Enterprise (المسجَّل بالفعل)، مش الرجوع لـ v3. لذلك استبدلنا المزوّد بالكامل
// بـ ReCaptchaEnterpriseProvider، والمفتاح القديم بمفتاح الـ Enterprise site key الحقيقي الذي
// أنشأه Firebase تلقائيًا وقت تسجيل التطبيق تحت Enterprise (Firebase Console → App Check →
// Apps → DarHamWeb → reCAPTCHA Enterprise → يظهر فيه الـ site key). ملحوظة: استخدام Enterprise
// له حصة مجانية شهرية سخية (عادة عشرات الآلاف من التقييمات) كافية جداً لحجم استخدام معلم واحد،
// لكنه يحتاج تفعيل الفوترة (Billing) على مشروع Google Cloud المرتبط — راجع ذلك في Google Cloud
// Console لو ظهرت أي مشاكل رغم هذا الإصلاح.
const RECAPTCHA_ENTERPRISE_SITE_KEY = "6LeBbsAtAAAAAPISU_0KVYI3C41I3EtWtWoJPPf4";
// 🌟 استيراد كسول (Dynamic Import) ومغلّف بالكامل بـ try/catch — بنفس فلسفة Storage/Analytics
// أعلاه بالضبط. أي فشل في هذا الجزء (مفتاح غير صحيح، حظر إعلانات، لا يوجد إنترنت) لا يؤثر
// إطلاقًا على أي شاشة أو ميزة أخرى في المنصة، فقط لن تُضاف طبقة الحماية هذه لهذه الجلسة.
(async function initAppCheckSafely() {
    try {
        if (!RECAPTCHA_ENTERPRISE_SITE_KEY || RECAPTCHA_ENTERPRISE_SITE_KEY === "PASTE_YOUR_RECAPTCHA_SITE_KEY_HERE") {
            return; // لسه مفتاح reCAPTCHA مش متضاف — تجاهل صامت بدون أي خطأ في الـ console
        }
        // 🌟🌟 [إصلاح] ReCaptchaEnterpriseProvider بدل ReCaptchaV3Provider — راجع الشرح الكامل أعلاه
        const { initializeAppCheck, ReCaptchaEnterpriseProvider } =
            await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app-check.js");
        initializeAppCheck(app, {
            provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_ENTERPRISE_SITE_KEY),
            isTokenAutoRefreshEnabled: true
        });
    } catch (e) {
        console.warn("تعذر تفعيل طبقة الحماية الإضافية (App Check) — لن يؤثر هذا على عمل المنصة إطلاقاً، لكن راجع الإعداد في دليل-تفعيل-App-Check.md:", e);
    }
})();

// ==========================================
// 📈 [جديد] إحصائيات استخدام مجهولة الهوية (Firebase Analytics)
// ==========================================
// لماذا هذا مهم؟ عايزين نعرف كم شخص يستخدم المنصة فعلياً وفي أي مكان في العالم، من غير
// ما نجمع أي بيانات شخصية عن أي مستخدم (لا اسم، لا صورة، لا بيانات طالب). Firebase
// Analytics يجمّع هذه الأرقام تلقائياً (مستخدمين فريدين، جلسات، دول) في لوحة تحكم
// Firebase/Google Analytics، ولا يصل المعلم أبداً لأي بيانات فردية — فقط أرقام إجمالية
// مجمّعة تلقائياً من جوجل.
// 🌟🌟 حماية جوهرية: بنفس فلسفة استيراد Storage الكسول أعلاه بالضبط — نستورد مكتبة
// analytics بشكل ديناميكي (Dynamic Import) ومغلّف بالكامل بـ try/catch، حتى لو فشل
// التحميل تماماً (measurementId لسه مش متضاف، أو حاجب إعلانات في المتصفح، أو لا يوجد
// إنترنت) فإن ذلك لا يؤثر إطلاقاً على أي شاشة أو ميزة أخرى في المنصة — أسوأ ما يحدث هو
// ببساطة عدم تسجيل هذه الجلسة في الإحصائيات، ولا شيء غير ذلك.
(async function initAnalyticsSafely() {
    try {
        if (!firebaseConfig.measurementId || firebaseConfig.measurementId === "PASTE_YOUR_MEASUREMENT_ID_HERE") {
            return; // لسه معرّف الإحصائيات مش متضاف — تجاهل صامت بدون أي خطأ في الـ console
        }
        const { getAnalytics } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js");
        getAnalytics(app);
    } catch (e) {
        console.warn("تعذر تفعيل إحصائيات الاستخدام (لن يؤثر هذا على عمل المنصة إطلاقاً):", e);
    }
})();

// ==========================================
// 📊 دوال نتائج الطلاب (Submissions)
// ==========================================

// دالة 1: رفع نتيجة الطالب إلى السحابة
export async function saveSubmissionToCloud(submissionData) {
    try {
        // 🌟🌟 حماية عامة نهائية: Firestore يرفض تمامًا أي حقل قيمته undefined في أي مكان
        // بالمستند (حتى لو كان متداخلاً جوه مصفوفة أو كائن فرعي) ويفشل الحفظ بالكامل برسالة
        // "Unsupported field value: undefined" — وهذا كان يمنع حفظ كل تسليمات الطلاب من الأساس.
        // الطريقة دي (تحويل لنص JSON ورجوع) بتحذف أي مفتاح قيمته undefined تلقائيًا وبأمان،
        // فتضمن عدم تكرار هذه المشكلة مستقبلاً من أي مكان في الكود، حتى لو ظهر undefined جديد
        // لم نتوقعه هنا.
        const cleanData = JSON.parse(JSON.stringify(submissionData));
        const docRef = await addDoc(collection(db, "submissions"), cleanData);
        console.log("تم رفع النتيجة بنجاح للسحابة برقم: ", docRef.id);
        return true;
    } catch (e) {
        // 🌟 مهم: هذا هو المكان الذي كانت تفشل فيه الرفعات بصمت (مثلاً بسبب تجاوز حجم المستند 1MB
        // عند وجود تسجيل صوتي Base64 ضخم، أو بسبب قواعد أمان Firestore). نطبع الخطأ كاملاً هنا
        // ليسهل تشخيصه من console المتصفح، ونعيد false حتى يتعامل معه المستدعي (تسجيل محلي وإعادة محاولة).
        console.error("حدث خطأ أثناء رفع النتيجة للسحابة: ", e);
        return false;
    }
}

// دالة 2: جلب نتائج الطلاب لمعلم معين أو لواجب معين من السحابة
// 🌟🌟 إصلاح جوهري: كانت هذه الدالة "تبتلع" أي خطأ (صلاحيات، اتصال، Firestore غير مفعّل...)
// وتعيد مصفوفة فارغة [] كأن لا أحد قد سلّم الواجب، فتظهر رسالة "لم يقم أي طالب بحل الاختبار"
// حتى لو كانت المشكلة الحقيقية "تعذر الاتصال/الصلاحيات". الآن نرفع الخطأ (throw) ليستطيع
// المستدعي (homework-prep.js) التفريق بين الحالتين وعرض رسالة الخطأ الصحيحة.
export async function getSubmissionsFromCloud(hwId) {
    try {
        const q = query(collection(db, "submissions"), where("hwId", "==", hwId));
        const querySnapshot = await getDocs(q);
        let results = [];
        querySnapshot.forEach((doc) => {
            // 🌟 التعديل الذكي هنا: جلب المعرف السري للملف (docId) لكي نستطيع تحديثه لاحقاً
            let data = doc.data();
            data.docId = doc.id;
            results.push(data);
        });

        // ترتيب النتائج من الأحدث للأقدم
        results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        return results;
    } catch (e) {
        console.error("حدث خطأ أثناء جلب النتائج من السحابة: ", e);
        throw e; // لا نُخفي الخطأ عن الواجهة
    }
}

// 🌟🌟 [جديد] دالة: جلب كل التسليمات (عبر كل الواجبات دفعة واحدة) التي بها سؤال واحد على الأقل
// يحتاج تصحيح المعلم يدوياً ولم يُصحَّح بعد — نفس معيار "يحتاج تصحيح" المستخدم أصلاً في
// loadSubmissionsInline بالضبط (details[].needsManualGrading === true و manualScore لسه undefined).
// [افتراض صريح] بما إن هذه المنصة لمعلم واحد فقط (مش نظام متعدد المعلمين)، فكل مستندات مجموعة
// "submissions" في Firestore تخصه هو وحده، فاستعلام واحد على المجموعة كاملة (بدون where) كافٍ
// وأرخص من تكرار الاستعلام لكل واجب على حدة (getSubmissionsFromCloud) بعدد الواجبات. الحجم
// المتوقع (تسليمات معلم واحد) صغير بما يكفي لتحميله دفعة واحدة؛ لو تضخّم العدد كثيرًا مستقبلاً
// قد نحتاج تحويلها لعدّاد مجمَّع على الخادم (getCountFromServer) بدل تنزيل كل المستندات.
export async function getSubmissionsNeedingGrading() {
    try {
        const querySnapshot = await getDocs(collection(db, "submissions"));
        let results = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const needsGrading = data.details && data.details.some(
                d => d.needsManualGrading && d.manualScore === undefined
            );
            if (needsGrading) {
                data.docId = docSnap.id;
                results.push(data);
            }
        });
        return results;
    } catch (e) {
        console.error("حدث خطأ أثناء جلب التسليمات التي تحتاج تصحيح: ", e);
        throw e; // نفس فلسفة getSubmissionsFromCloud: لا نُخفي الخطأ، المستدعي يقرر كيف يعرضه
    }
}

// 🌟 [جديد] دالة: جلب كل تسليمات كل الواجبات دفعة واحدة، بلا أي فلترة — تُستخدَم في
// reports/monthly-report.js لتجميع درجات الواجبات المنزلية عبر شهر كامل لكل طالب (بدل
// استدعاء getSubmissionsFromCloud لكل واجب على حدة، الذي يتطلب معرفة hwId مسبقاً).
// نفس [الافتراض الصريح] المستخدم أعلاه بالضبط في getSubmissionsNeedingGrading: منصة لمعلم
// واحد، فاستعلام واحد على المجموعة كاملة كافٍ وأرخص، والفلترة بالطالب/التاريخ تتم بالذاكرة
// في المستدعي (نفس فلسفة بقية قواعد بيانات المنصة: بلا فهارس مخصصة لحجم استخدام معلم واحد).
export async function getAllSubmissionsFromCloud() {
    try {
        const querySnapshot = await getDocs(collection(db, "submissions"));
        let results = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            data.docId = docSnap.id;
            results.push(data);
        });
        return results;
    } catch (e) {
        // نفس فلسفة getSubmissionsFromCloud/getSubmissionsNeedingGrading: لا نُخفي الخطأ
        // (لا نعيد [] بصمت)، حتى يستطيع المستدعي (monthly-report.js) التفريق بين "لا توجد
        // تسليمات" الحقيقية و"تعذر الاتصال بالسحابة" ويعرض رسالة الخطأ الصحيحة للمعلم.
        console.error("حدث خطأ أثناء جلب كل التسليمات من السحابة: ", e);
        throw e;
    }
}

// 🌟 [دالة جديدة] دالة 5: تحديث نتيجة الطالب بعد التصحيح اليدوي للمعلم 🌟
export async function updateSubmissionInCloud(docId, updatedFields) {
    try {
        const docRef = doc(db, "submissions", docId);
        await updateDoc(docRef, updatedFields);
        console.log("تم تحديث النتيجة بعد التصحيح في السحابة بنجاح!");
        return true;
    } catch (e) {
        console.error("حدث خطأ أثناء تحديث النتيجة بعد التصحيح: ", e);
        return false;
    }
}

// ==========================================
// 🎤 [جديد] رفع التسجيلات الصوتية إلى Firebase Storage
// ==========================================
// لماذا هذا التعديل ضروري؟
// كانت التسجيلات الصوتية (وحتى الملفات المرفوعة) تُحفظ كنص Base64 ضخم مباشرة داخل حقل
// "audioData" في مستند Firestore. مستندات Firestore محدودة بحجم 1 ميجابايت فقط لكل مستند،
// وأي تسجيل صوتي حقيقي (حتى لبضع ثوانٍ) يتجاوز هذا الحجم بسهولة بصيغة Base64، فتفشل عملية
// الرفع بالكامل بصمت (لأن الاستدعاء كان .catch(err => console.log(...)) فقط) ويختفي تسليم
// الطالب بأكمله من لوحة المعلم — ولو كان الواجب يحتوي سؤالاً صوتياً واحداً فقط ضمن أسئلته.
// الحل: نرفع الصوت إلى Firebase Storage ونخزّن فقط رابط التحميل (سطر نص قصير) في Firestore.
export async function uploadAudioAndGetUrl(base64AudioDataUrl, submissionId, questionId) {
    try {
        // 🌟 استيراد كسول (Dynamic Import) — يحدث فقط عند استدعاء هذه الدالة فعلياً (أي عند وجود
        // سؤال صوتي فقط)، وليس عند تحميل التطبيق. هذا يضمن أن أي مشكلة في Storage (غير مفعّل،
        // شبكة، حظر) لا يمكن أن تكسر بقية التطبيق أبداً — أسوأ ما يحدث هو فشل رفع هذا الصوت تحديداً.
        const { getStorage, ref, uploadString, getDownloadURL } =
            await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js");

        const storage = getStorage(app);
        const path = `homework_audio/${submissionId}/${questionId}.webm`;
        const storageRef = ref(storage, path);
        // base64AudioDataUrl على شكل: "data:audio/webm;base64,....."
        await uploadString(storageRef, base64AudioDataUrl, 'data_url');
        const url = await getDownloadURL(storageRef);
        return url;
    } catch (e) {
        console.error("حدث خطأ أثناء رفع الملف الصوتي إلى Storage (تأكد من تفعيل Firebase Storage في لوحة التحكم): ", e);
        return null; // في حال الفشل، الدالة المستدعية تتعامل مع الأمر بأمان دون التأثير على بقية النظام
    }
}

// ==========================================
// 📦 [جديد] طابور احتياطي محلي لإعادة إرسال أي تسليم فشل رفعه للسحابة
// ==========================================
// لماذا هذا ضروري؟
// عملية رفع نتيجة الطالب للسحابة كانت (ولا تزال) تُنفَّذ في الخلفية دون انتظار (fire-and-forget).
// إن فشلت (لا يوجد إنترنت، صلاحيات، حجم مستند...) كان الطالب لا يرى أي تنبيه، والنتيجة تختفي
// نهائياً من عالم المعلم. الآن: أي تسليم يفشل يُحفظ في طابور محلي (localStorage) ويُعاد إرساله
// تلقائياً في أقرب فرصة (مثلاً عند فتح صفحة حل الواجب مرة أخرى على نفس الجهاز).
const PENDING_KEY = 'pendingHwSubmissions';

function getPendingSubmissions() {
    try {
        return JSON.parse(localStorage.getItem(PENDING_KEY)) || [];
    } catch (e) {
        return [];
    }
}

function setPendingSubmissions(list) {
    try {
        localStorage.setItem(PENDING_KEY, JSON.stringify(list));
    } catch (e) {
        console.error("تعذر حفظ طابور التسليمات المعلّقة محلياً:", e);
    }
}

export function queuePendingSubmission(submissionData) {
    const list = getPendingSubmissions();
    list.push(submissionData);
    setPendingSubmissions(list);
}

export async function flushPendingSubmissions() {
    const list = getPendingSubmissions();
    if (list.length === 0) return { sent: 0, remaining: 0 };

    const stillPending = [];
    let sentCount = 0;
    for (const item of list) {
        const ok = await saveSubmissionToCloud(item);
        if (ok) sentCount++;
        else stillPending.push(item);
    }
    setPendingSubmissions(stillPending);
    if (sentCount > 0) console.log(`تم إرسال ${sentCount} تسليم(ات) كانت معلّقة محلياً بنجاح.`);
    return { sent: sentCount, remaining: stillPending.length };
}

// ==========================================
// 📚 دوال الواجبات (Homeworks)
// ==========================================

// دالة 3: رفع الواجب إلى السحابة عند نشره (للمعلم)
export async function saveHomeworkToCloud(hwData) {
    try {
        // 🌟🌟 [إصلاح جوهري] السبب الحقيقي الذي كان يمنع نظام الواجبات من الرفع للسحابة بشكل
        // دائم (وليس مؤقتاً) عند إسناد الواجب لطالب معين: حقل assignedStudentAvatar قد يكون
        // صورة الطالب الحقيقية كاملة بصيغة Base64 (لو رفع المعلم صورة له من شاشة الملف الشخصي —
        // راجع student/student.js، دالة uploadAvatar وما شابهها)، وحجمها يمكن أن يكون كبيراً
        // بما يكفي لتجاوز الحد الأقصى لحجم أي مستند Firestore (1 ميجابايت)، فيفشل setDoc
        // بالكامل. والأخطر: بما أن flushPendingHomeworkSync (أسفل) يعيد إرسال نفس البيانات
        // كما هي عند كل إقلاع للمنصة، فإن هذا الفشل لم يكن مؤقتاً بل دائماً — نفس الواجب يبقى
        // عالقاً للأبد في طابور إعادة المحاولة ولا يصل للسحابة أبداً، فيفشل رابط الطالب برسالة
        // "هذا الواجب غير موجود" إلى الأبد. هذا الحقل غير مستخدم أصلاً في شاشتي الطالب
        // (student/homework-welcome.js و games/homework-play.js) — نفس السبب والاستبعاد
        // المطبّق أصلاً في encodeHomeworkForLink (database/homeworkDB.js)، وننقله هنا أيضاً
        // لأن الرفع للسحابة كان قد فاته هذا الاستبعاد تحديداً.
        const { assignedStudentAvatar, ...dataWithoutAvatar } = hwData;
        // 🌟🌟 [إصلاح] نفس حماية saveSubmissionToCloud أعلاه بالضبط: Firestore يرفض تمامًا أي
        // حقل قيمته undefined (حتى لو متداخل)، فيفشل setDoc بالكامل بصمت (كان يُطبع في الـ
        // console فقط دون أي أثر آخر). التحويل لنص JSON ورجوع يحذف أي undefined تلقائيًا.
        const cleanData = JSON.parse(JSON.stringify(dataWithoutAvatar));
        // نستخدم setDoc مع مسار (homeworks/hw_id) لكي نضمن أن الآي دي في السحابة هو نفس الآي دي المحلي
        const hwRef = doc(db, "homeworks", cleanData.id);
        await setDoc(hwRef, cleanData);
        console.log("تم رفع الواجب للسحابة بنجاح!");
        return true;
    } catch (e) {
        console.error("حدث خطأ أثناء رفع الواجب للسحابة: ", e);
        return false;
    }
}

// ==========================================
// 📦 [جديد] طابور احتياطي محلي لإعادة رفع أي واجب فشل رفعه للسحابة عند النشر
// ==========================================
// لماذا هذا ضروري؟ رفع الواجب للسحابة عند النشر كان (قبل هذا الإصلاح) يُنفَّذ في الخلفية دون
// انتظار (fire-and-forget) داخل settings/homework-prep.js، فلو فشل الرفع (لا يوجد إنترنت،
// خطأ مؤقت، حقل undefined...) كان المعلم يرى نافذة "تم الحفظ بنجاح" ورابطاً جاهزاً للمشاركة
// رغم أن الواجب لم يصل فعلياً للسحابة — فيعمل الرابط فقط على نفس جهاز المعلم (عبر IndexedDB
// المحلي) ويفشل فوراً برسالة "هذا الواجب غير موجود" على أي جهاز آخر (جهاز الطالب الفعلي، أو
// حتى نافذة متصفح مختلفة على نفس الجهاز يستخدمها المعلم للتجربة). الآن: أي رفع فاشل يُحفظ في
// طابور محلي (localStorage، بنفس نمط PENDING_KEY لتسليمات الطلاب أعلاه) ويُعاد رفعه تلقائياً
// في أقرب فرصة — راجع flushPendingHomeworkSync المستدعاة من core/app.js في 3 لحظات مختلفة
// (عند إقلاع المنصة، عند عودة الاتصال بالإنترنت أثناء الجلسة عبر حدث 'online'، وعند فتح شاشة
// إعداد الواجبات نفسها كل مرة) بدل الاعتماد على إقلاع كامل للمنصة فقط — راجع الشرح الكامل
// بجانب كل استدعاء منها في core/app.js وsettings/homework-prep.js.
const PENDING_HW_KEY = 'pendingHwCloudSync';

function getPendingHomeworks() {
    try {
        return JSON.parse(localStorage.getItem(PENDING_HW_KEY)) || [];
    } catch (e) {
        return [];
    }
}

function setPendingHomeworks(list) {
    try {
        localStorage.setItem(PENDING_HW_KEY, JSON.stringify(list));
    } catch (e) {
        console.error("تعذر حفظ طابور الواجبات المعلّقة محلياً:", e);
    }
}

export function queuePendingHomeworkSync(hwData) {
    const list = getPendingHomeworks();
    // 🌟 تفادي تكرار نفس الواجب في الطابور لو استدعيت الدالة أكثر من مرة له (مثلاً بعد تعديله)
    const filtered = list.filter(item => item.id !== hwData.id);
    filtered.push(hwData);
    setPendingHomeworks(filtered);
}

export async function flushPendingHomeworkSync() {
    const list = getPendingHomeworks();
    if (list.length === 0) return { sent: 0, remaining: 0 };

    const stillPending = [];
    let sentCount = 0;
    for (const item of list) {
        const ok = await saveHomeworkToCloud(item);
        if (ok) sentCount++;
        else stillPending.push(item);
    }
    setPendingHomeworks(stillPending);
    if (sentCount > 0) console.log(`تم رفع ${sentCount} واجب(ات) كانت معلّقة محلياً للسحابة بنجاح.`);
    return { sent: sentCount, remaining: stillPending.length };
}

// 🌟🌟 [جديد] هل واجب معيّن (بمعرّفه) لا يزال عالقاً في طابور إعادة المحاولة ولم يصل للسحابة
// بعد؟ تُستخدَم في settings/homework-prep.js لعرض علامة تنبيه ⏳ بجانب أي واجب في سجل
// الواجبات لم يُرفع بعد (بدل الاكتفاء بتحذير لحظي يختفي بمجرد إغلاق نافذة المشاركة، والاعتماد
// على أن يتذكر المعلم فتح الشاشة لاحقاً)، وأيضاً لتحديد نجاح/فشل زر "إعادة المحاولة الآن" اليدوي.
export function isHomeworkPendingSync(hwId) {
    return getPendingHomeworks().some(item => item.id === hwId);
}

// دالة 4: البحث عن واجب وجلبه من السحابة (للطالب)
export async function getHomeworkFromCloud(hwId) {
    try {
        const hwRef = doc(db, "homeworks", hwId);
        const docSnap = await getDoc(hwRef);

        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            console.warn("الواجب غير موجود في السحابة!");
            return null;
        }
    } catch (e) {
        console.error("حدث خطأ أثناء جلب الواجب من السحابة: ", e);
        return null;
    }
}
