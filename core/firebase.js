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

// 🌟🌟 [جديد] طبقة حماية مشتركة لكل نداءات السحابة في هذا الملف (مهلة زمنية قصوى موحّدة،
// حارس ضد الحقول الضخمة، ومصنع طابور إعادة محاولة موحّد) — راجع core/netUtils.js للشرح
// الكامل لسبب توحيدها في ملف واحد بدل تكرارها. هذا التعديل جزء من "المرحلة 1" من خطة تصليب
// نظام الواجبات المتفَق عليها مع المعلم — راجع
// claude/توحيد-طبقة-مزامنة-الواجبات-ومهلات-الشبكة-المرحلة-1.md في مشروع المنصة للتفاصيل الكاملة.
import { withTimeout, withTimeoutOrThrow, stripOversizedFields, createPendingQueue, DEFAULT_TIMEOUT_MS } from './netUtils.js';
// 🌟🌟 [جديد — المرحلة 2] دالة واحدة مشتركة لتحديد "هل هذا التسليم بحاجة تصحيح يدوي؟" بدل تكرار
// نفس المقارنة هنا وفي settings/homework-prep.js — راجع core/submissionStatus.js للشرح الكامل.
import { submissionNeedsGrading } from './submissionStatus.js';

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

// ==========================================
// 🌟🌟 [جديد] تفعيل تلقائي وآمن لوضع تصحيح App Check أثناء الاختبار المحلي (Live Server) فقط
// ==========================================
// ⚠️ [افتراض صريح]: App Check فوق مفعَّل وواقف (Enforce) على الدومين الحقيقي المنشور فقط —
// أي اختبار محلي (Live Server على localhost أو 127.0.0.1) هيترفض تلقائيًا من Firestore/Storage
// لأن الدومين المحلي مش مسجَّل في reCAPTCHA Enterprise أصلاً، حتى لو كل الكود سليم 100%. هذا على
// الأرجح تحديدًا سبب أي "مشكلة" ظهرت عند تجربة حفظ/رفع واجب محليًا. الحل الرسمي الموثَّق من
// Firebase: "وضع التصحيح" (Debug Mode) يتجاوز مزوّد الحماية الفعلي (Enterprise) بمزوّد اختباري
// خاص — يعمل تلقائيًا هنا فقط لو الدومين localhost/127.0.0.1 (بالضبط زي Live Server)، وأبداً لا
// يعمل على الموقع الحقيقي المنشور، فلا داعي لحذف هذا الجزء يدويًا قبل أي رفع مستقبلي.
// خطوة يدوية واحدة مطلوبة من المعلم (مرة واحدة فقط): افتح المنصة محلياً بـLive Server، افتح
// أدوات المطور (F12) → Console، هتلاقي رسالة فيها "Debug Token" (نص عشوائي طويل) — انسخه، وأضِفه
// من Firebase Console → App Check → التطبيق (DarHamWeb) → Manage debug tokens. بعدها كل حفظ/رفع
// واجب من الجهاز ده تحديداً هيشتغل محلياً بالضبط زي الموقع الحقيقي، طول ما التطوير مستمر.
if (typeof self !== 'undefined' && self.location &&
    (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1')) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

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
// 🌟 [محدَّث] الآن مُغلَّفة بمهلة قصوى موحّدة (DEFAULT_TIMEOUT_MS) عبر withTimeout — لو
// تعلّق addDoc لأي سبب (شبكة متذبذبة، Storage...)، تُعاد false بعد المهلة بدل تعليق أي
// شاشة تستدعي هذه الدالة للأبد. الدالة أصلاً لا ترمي استثناءً (تُعيد true/false فقط)، فهذا
// التغيير لا يُغيّر شكل تعاملها مع أي مستدعٍ حالي إطلاقاً.
export async function saveSubmissionToCloud(submissionData) {
    return withTimeout((async () => {
        try {
            // 🌟🌟 حماية عامة نهائية: Firestore يرفض تمامًا أي حقل قيمته undefined في أي مكان
            // بالمستند (حتى لو كان متداخلاً جوه مصفوفة أو كائن فرعي) ويفشل الحفظ بالكامل برسالة
            // "Unsupported field value: undefined" — وهذا كان يمنع حفظ كل تسليمات الطلاب من الأساس.
            // الطريقة دي (تحويل لنص JSON ورجوع) بتحذف أي مفتاح قيمته undefined تلقائيًا وبأمان،
            // فتضمن عدم تكرار هذه المشكلة مستقبلاً من أي مكان في الكود، حتى لو ظهر undefined جديد
            // لم نتوقعه هنا.
            let cleanData = JSON.parse(JSON.stringify(submissionData));
            // 🌟 [جديد] حارس إضافي ضد أي حقل ضخم غير متوقع (راجع core/netUtils.js) — نفس سبب
            // استبعاد الصور الكبيرة من الواجبات نفسها أدناه في saveHomeworkToCloud.
            cleanData = stripOversizedFields(cleanData);
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
    })(), DEFAULT_TIMEOUT_MS, false);
}

// دالة 2: جلب نتائج الطلاب لمعلم معين أو لواجب معين من السحابة
// 🌟🌟 إصلاح جوهري: كانت هذه الدالة "تبتلع" أي خطأ (صلاحيات، اتصال، Firestore غير مفعّل...)
// وتعيد مصفوفة فارغة [] كأن لا أحد قد سلّم الواجب، فتظهر رسالة "لم يقم أي طالب بحل الاختبار"
// حتى لو كانت المشكلة الحقيقية "تعذر الاتصال/الصلاحيات". الآن نرفع الخطأ (throw) ليستطيع
// المستدعي (homework-prep.js) التفريق بين الحالتين وعرض رسالة الخطأ الصحيحة.
// 🌟 [محدَّث] مُغلَّفة الآن بـ withTimeoutOrThrow: لو تعلّقت للأبد، تُرفض (reject) بخطأ واضح
// بعد المهلة القصوى بدل التعليق الصامت — بنفس فلسفة "لا نُخفي الخطأ" المذكورة أعلاه بالضبط،
// فالمهلة المنتهية تُعامَل كأي فشل شبكة آخر تتعامل معه هذه الدالة أصلاً.
export async function getSubmissionsFromCloud(hwId) {
    return withTimeoutOrThrow((async () => {
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
    })());
}

// 🌟🌟 [جديد] دالة: جلب كل التسليمات (عبر كل الواجبات دفعة واحدة) التي بها سؤال واحد على الأقل
// يحتاج تصحيح المعلم يدوياً ولم يُصحَّح بعد — نفس معيار "يحتاج تصحيح" المستخدم أصلاً في
// loadSubmissionsInline بالضبط (details[].needsManualGrading === true و manualScore لسه undefined).
// [افتراض صريح] بما إن هذه المنصة لمعلم واحد فقط (مش نظام متعدد المعلمين)، فكل مستندات مجموعة
// "submissions" في Firestore تخصه هو وحده، فاستعلام واحد على المجموعة كاملة (بدون where) كافٍ
// وأرخص من تكرار الاستعلام لكل واجب على حدة (getSubmissionsFromCloud) بعدد الواجبات. الحجم
// المتوقع (تسليمات معلم واحد) صغير بما يكفي لتحميله دفعة واحدة؛ لو تضخّم العدد كثيرًا مستقبلاً
// قد نحتاج تحويلها لعدّاد مجمَّع على الخادم (getCountFromServer) بدل تنزيل كل المستندات.
// 🌟 [محدَّث] نفس تغليف withTimeoutOrThrow المطبَّق على getSubmissionsFromCloud أعلاه، ولنفس السبب.
export async function getSubmissionsNeedingGrading() {
    return withTimeoutOrThrow((async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "submissions"));
            let results = [];
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                // 🌟 [محدَّث — المرحلة 2] نفس الفحص بالضبط، لكن الآن عبر الدالة المشتركة
                // submissionNeedsGrading بدل تكرار المقارنة هنا محلياً — راجع core/submissionStatus.js
                if (submissionNeedsGrading(data)) {
                    data.docId = docSnap.id;
                    results.push(data);
                }
            });
            return results;
        } catch (e) {
            console.error("حدث خطأ أثناء جلب التسليمات التي تحتاج تصحيح: ", e);
            throw e; // نفس فلسفة getSubmissionsFromCloud: لا نُخفي الخطأ، المستدعي يقرر كيف يعرضه
        }
    })());
}

// 🌟 [جديد] دالة: جلب كل تسليمات كل الواجبات دفعة واحدة، بلا أي فلترة — تُستخدَم في
// reports/monthly-report.js لتجميع درجات الواجبات المنزلية عبر شهر كامل لكل طالب (بدل
// استدعاء getSubmissionsFromCloud لكل واجب على حدة، الذي يتطلب معرفة hwId مسبقاً).
// نفس [الافتراض الصريح] المستخدم أعلاه بالضبط في getSubmissionsNeedingGrading: منصة لمعلم
// واحد، فاستعلام واحد على المجموعة كاملة كافٍ وأرخص، والفلترة بالطالب/التاريخ تتم بالذاكرة
// في المستدعي (نفس فلسفة بقية قواعد بيانات المنصة: بلا فهارس مخصصة لحجم استخدام معلم واحد).
// 🌟 [محدَّث] نفس تغليف withTimeoutOrThrow، ولنفس السبب بالضبط.
export async function getAllSubmissionsFromCloud() {
    return withTimeoutOrThrow((async () => {
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
    })());
}

// 🌟 [دالة جديدة] دالة 5: تحديث نتيجة الطالب بعد التصحيح اليدوي للمعلم 🌟
// 🌟 [محدَّث] مُغلَّفة بـ withTimeout (تُعيد false عند التعليق، بنفس شكلها الأصلي — لا ترمي
// استثناءً أصلاً)، حتى لا تتجمد غرفة التصحيح للأبد عند "حفظ الدرجات" لو الشبكة متذبذبة.
export async function updateSubmissionInCloud(docId, updatedFields) {
    return withTimeout((async () => {
        try {
            const docRef = doc(db, "submissions", docId);
            await updateDoc(docRef, updatedFields);
            console.log("تم تحديث النتيجة بعد التصحيح في السحابة بنجاح!");
            return true;
        } catch (e) {
            console.error("حدث خطأ أثناء تحديث النتيجة بعد التصحيح: ", e);
            return false;
        }
    })(), DEFAULT_TIMEOUT_MS, false);
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
// 🌟 [محدَّث] مُغلَّفة الآن بـ withTimeout أيضاً — كانت هذه الدالة تحديداً سبب "جاري الاعتماد..."
// المعلّق للأبد قبل أن يُعالَج محلياً في games/homework-play.js عبر withTimeout خاصة بذلك
// الملف؛ الآن الحماية موجودة في المصدر نفسه فتسري تلقائياً لأي شاشة تستخدم هذه الدالة مستقبلاً.
export async function uploadAudioAndGetUrl(base64AudioDataUrl, submissionId, questionId) {
    return withTimeout((async () => {
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
    })(), DEFAULT_TIMEOUT_MS, null);
}

// ==========================================
// 📦 طابورا احتياطيان محليان لإعادة إرسال أي تسليم/واجب فشل رفعه للسحابة
// ==========================================
// لماذا هذا ضروري؟ عمليات الرفع للسحابة تُنفَّذ في الخلفية دون انتظار (fire-and-forget) من
// نقاط استدعاء متعددة. إن فشلت (لا يوجد إنترنت، صلاحيات، حجم مستند، مهلة منتهية...) كان
// المستخدم لا يرى أي أثر دائم، والبيانات تختفي من عالم المعلم. أي رفع فاشل يُحفظ في طابور
// محلي (localStorage) ويُعاد إرساله تلقائياً في أقرب فرصة (فتح الشاشة، رجوع الاتصال، إقلاع
// المنصة — راجع core/app.js وsettings/homework-prep.js لنقاط الاستدعاء الفعلية).
// 🌟🌟 [محدَّث] كان هذا القسم يحتوي نسختين مكررتين حرفياً من نفس منطق get/set/queue/flush
// (واحدة للتسليمات، وواحدة للواجبات) — الآن كلاهما يُبنى من مصنع واحد مشترك
// (createPendingQueue في core/netUtils.js)، بنفس التوقيعات والسلوك والأسماء المُصدَّرة
// تماماً، فلا يتغيّر أي شيء بالنسبة لأي ملف آخر يستدعي هذه الدوال.
// 🌟 [محدَّث — المرحلة 2] أضفنا idField='id' لطابور التسليمات (لم يكن موجوداً في المرحلة 1،
// بخلاف طابور الواجبات) — الآن كل تسليم يحمل حقل id ثابت (راجع games/homework-play.js حيث
// أصبح submissionId يُخزَّن كحقل id داخل البيانات نفسها، لا يُستخدم فقط لمسار رفع الصوت كما كان
// سابقاً). هذا يُمكّن isSubmissionPendingSync وgetPendingSubmissionsCountForHomework أدناه.
const submissionsQueue = createPendingQueue('pendingHwSubmissions', saveSubmissionToCloud, 'id');
export function queuePendingSubmission(submissionData) {
    submissionsQueue.queue(submissionData);
}
export function flushPendingSubmissions() {
    return submissionsQueue.flush();
}
// 🌟🌟 [جديد — المرحلة 2] هل تسليم معيّن (بمعرّفه) لا يزال عالقاً محلياً ولم يصل للسحابة بعد؟
// نفس فكرة isHomeworkPendingSync تماماً، لكن للتسليمات — كانت غائبة تماماً قبل هذا التحديث،
// فلا توجد أي وسيلة للمعلم يعرف بيها إن تسليم طالب معيّن فشل رفعه ولا يزال عالقاً على جهاز
// الطالب فقط.
export function isSubmissionPendingSync(submissionId) {
    return submissionsQueue.isPending(submissionId);
}
// 🌟🌟 [جديد — المرحلة 2] كم تسليماً معلّقاً محلياً (لم يصل للسحابة بعد) يخص واجباً معيناً بالذات؟
// تُستخدَم في settings/homework-prep.js لعرض تنبيه في شاشة نتائج الواجب نفسه — بدون هذا، كان
// أي تسليم فشل رفعه يختفي تماماً من رؤية المعلم (شاشة النتائج تجلب من السحابة فقط، فتسليم لم
// يصل للسحابة لا يظهر فيها إطلاقاً، لا حتى كعلامة "معلّق").
export function getPendingSubmissionsCountForHomework(hwId) {
    return submissionsQueue.list().filter(item => item.hwId === hwId).length;
}

// ==========================================
// 📚 دوال الواجبات (Homeworks)
// ==========================================

// دالة 3: رفع الواجب إلى السحابة عند نشره (للمعلم)
// 🌟 [محدَّث] مُغلَّفة الآن بـ withTimeout أيضاً — نفس سبب saveSubmissionToCloud أعلاه بالضبط.
export async function saveHomeworkToCloud(hwData) {
    return withTimeout((async () => {
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
            let cleanData = JSON.parse(JSON.stringify(dataWithoutAvatar));
            // 🌟 [جديد] حارس عام إضافي (راجع core/netUtils.js): يمسك أي حقل ضخم آخر غير
            // assignedStudentAvatar لم نكتشفه بعد بنفس الطريقة، بدل انتظار فشل جديد في الإنتاج.
            cleanData = stripOversizedFields(cleanData);
            // نستخدم setDoc مع مسار (homeworks/hw_id) لكي نضمن أن الآي دي في السحابة هو نفس الآي دي المحلي
            const hwRef = doc(db, "homeworks", cleanData.id);
            await setDoc(hwRef, cleanData);
            console.log("تم رفع الواجب للسحابة بنجاح!");
            return true;
        } catch (e) {
            console.error("حدث خطأ أثناء رفع الواجب للسحابة: ", e);
            return false;
        }
    })(), DEFAULT_TIMEOUT_MS, false);
}

// 🌟 [محدَّث] طابور الواجبات المعلّقة أصبح الآن مبنياً من نفس المصنع المشترك أعلاه
// (createPendingQueue)، بدل نسخة منفصلة مكررة — راجع الشرح الكامل بجانب submissionsQueue
// أعلاه، ونفس الملاحظة: الأسماء المُصدَّرة وسلوكها الظاهر للمستدعي لم يتغيّر إطلاقاً.
// idField: 'id' — يحافظ بالضبط على سلوك منع تكرار نفس الواجب في الطابور لو استدعيت
// queuePendingHomeworkSync أكثر من مرة له (مثلاً بعد تعديله)، تماماً كالنسخة الأصلية.
const homeworkQueue = createPendingQueue('pendingHwCloudSync', saveHomeworkToCloud, 'id');
export function queuePendingHomeworkSync(hwData) {
    homeworkQueue.queue(hwData);
}
export function flushPendingHomeworkSync() {
    return homeworkQueue.flush();
}

// 🌟🌟 [جديد] هل واجب معيّن (بمعرّفه) لا يزال عالقاً في طابور إعادة المحاولة ولم يصل للسحابة
// بعد؟ تُستخدَم في settings/homework-prep.js لعرض علامة تنبيه ⏳ بجانب أي واجب في سجل
// الواجبات لم يُرفع بعد (بدل الاكتفاء بتحذير لحظي يختفي بمجرد إغلاق نافذة المشاركة، والاعتماد
// على أن يتذكر المعلم فتح الشاشة لاحقاً)، وأيضاً لتحديد نجاح/فشل زر "إعادة المحاولة الآن" اليدوي.
export function isHomeworkPendingSync(hwId) {
    return homeworkQueue.isPending(hwId);
}

// دالة 4: البحث عن واجب وجلبه من السحابة (للطالب)
// 🌟 [محدَّث] مُغلَّفة بـ withTimeout — نفس سبب باقي الدوال أعلاه، بدل ترك شاشة الترحيب
// (student/homework-welcome.js) معلّقة للأبد لو تعذّر الاتصال بالسحابة أثناء البحث عن الواجب.
export async function getHomeworkFromCloud(hwId) {
    return withTimeout((async () => {
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
    })(), DEFAULT_TIMEOUT_MS, null);
}
