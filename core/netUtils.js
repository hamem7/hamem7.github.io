// core/netUtils.js
// ==========================================
// 🌟🌟 [جديد] طبقة حماية مشتركة لأي نداء شبكة/سحابة في المنصة كلها
// ==========================================
// السياق: راجعنا نظام الواجبات المنزلية بالكامل (المحرك، قاعدة البيانات، شاشتي الإعداد
// والحل، والمزامنة السحابية في core/firebase.js) بعد نقاش مع المعلم عن تكرار مشاكل معينة
// رغم إصلاحها أكثر من مرة. الخلاصة: المشاكل كانت تُكتشف وتُصلَح "مثالاً بمثال" في كل مرة
// تظهر في مكان جديد (مهلة زمنية خاصة بملف واحد فقط في games/homework-play.js، طابورا
// إعادة محاولة منفصلان تماماً لكن بنفس المنطق حرفياً في core/firebase.js لتسليمات الطلاب
// والواجبات، حقل صورة الطالب اكتُشف أنه يكسر الرفع للسحابة بعد وقوع المشكلة فعلياً...).
// هذا الملف يجمع الحلول الثلاثة المتكررة في مكان واحد مشترك، عشان أي إصلاح مستقبلي يُكتب
// مرة واحدة ويسري تلقائياً في كل مكان يستخدمه، بدل ما يتكرر اكتشاف نفس المشكلة في كل شاشة
// جديدة تتعامل مع السحابة.

// المهلة القصوى الافتراضية (بالمللي ثانية) لأي عملية شبكة واحدة قبل اعتبارها "عالقة" والتعامل
// معها كفشل. القيمة (20 ثانية) هي نفسها المستخدمة أصلاً في games/homework-play.js لإصلاح
// مشكلة "جاري الاعتماد..." التي لا تنتهي أبداً — نفس الفلسفة، موحّدة الآن لكل نداء سحابة.
export const DEFAULT_TIMEOUT_MS = 20000;

// 🌟 دالة حماية عامة (منقولة من games/homework-play.js لتصبح مصدراً واحداً مشتركاً): تُنفّذ
// أي Promise لكن لا تنتظره أبداً أكثر من مهلة محددة. إن لم يُنجز خلال المهلة، تُرجع القيمة
// الاحتياطية فوراً بدل تعليق الشاشة للأبد. تُستخدَم مع الدوال التي أصلاً لا ترمي استثناءً
// (بل تعيد true/false أو null عند الفشل) حتى لا يتغيّر شكل تعاملها مع المستدعي.
export function withTimeout(promise, ms = DEFAULT_TIMEOUT_MS, fallbackValue = null) {
    return new Promise((resolve) => {
        let settled = false;
        const timer = setTimeout(() => {
            if (!settled) { settled = true; resolve(fallbackValue); }
        }, ms);
        promise.then((val) => {
            if (!settled) { settled = true; clearTimeout(timer); resolve(val); }
        }).catch(() => {
            if (!settled) { settled = true; clearTimeout(timer); resolve(fallbackValue); }
        });
    });
}

// 🌟 [جديد] نفس فكرة withTimeout بالضبط، لكن لدوال تُصرّح عمداً بعدم إخفاء الأخطاء (ترمي
// استثناءً عند الفشل بدل إعادة قيمة فارغة بصمت — راجع التعليقات بجانب getSubmissionsFromCloud
// وأخواتها في core/firebase.js). هنا التعليق بعد المهلة يكون "رفض" (reject) بخطأ واضح، بنفس
// معنى أي فشل شبكة آخر تتعامل معه هذه الدوال أصلاً — حتى لا نُعيد بالخطأ مشكلة "فشل صامت
// يُفهم كأنه لا توجد بيانات" التي أُصلحت عمداً في هذه الدوال تحديداً.
export function withTimeoutOrThrow(promise, ms = DEFAULT_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                reject(new Error(`انتهت المهلة القصوى (${ms}ms) دون رد من السحابة`));
            }
        }, ms);
        promise.then((val) => {
            if (!settled) { settled = true; clearTimeout(timer); resolve(val); }
        }).catch((err) => {
            if (!settled) { settled = true; clearTimeout(timer); reject(err); }
        });
    });
}

// 🌟 [جديد] حارس عام: يستبعد أي حقل نصي ضخم بشكل غير متوقع (صورة/صوت Base64 مثلاً) قبل
// إرساله لـ Firestore، بدل اكتشاف كل حقل كبير بالمصادفة بعد فشل صامت في الإنتاج (كما حدث
// فعلياً مع assignedStudentAvatar الذي كان يمنع رفع الواجب للسحابة بشكل دائم). الحد
// الافتراضي (700 ألف حرف) أقل من حد المستند الكامل في Firestore (1 ميجابايت) بهامش أمان،
// لأن المستند قد يحتوي حقولاً أخرى فوق هذا الحقل. الحقل المستبعد يُطبع تحذيراً واضحاً باسمه
// في الـ console بدل الاختفاء الصامت، حتى يسهل تشخيص أي حالة مشابهة مستقبلاً فوراً.
export function stripOversizedFields(data, maxFieldChars = 700000) {
    const result = { ...data };
    for (const key of Object.keys(result)) {
        const value = result[key];
        if (typeof value === 'string' && value.length > maxFieldChars) {
            console.warn(`⚠️ تم استبعاد الحقل "${key}" قبل الرفع للسحابة (حجمه ${value.length} حرفاً يتجاوز الحد الآمن لمستند Firestore).`);
            delete result[key];
        }
    }
    return result;
}

// ==========================================
// 🌟🌟 [جديد] مصنع طابور إعادة محاولة محلي موحّد
// ==========================================
// يحل محل نسختين مكررتين حرفياً كانتا موجودتين في core/firebase.js: واحدة لتسليمات الطلاب
// (pendingHwSubmissions) وواحدة للواجبات نفسها (pendingHwCloudSync)، بنفس السلوك بالضبط
// لكل منهما بما فيها الفروق الدقيقة (منع تكرار العنصر بمعرّفه، والاستعلام "هل لسه معلّق؟").
// أي تحسين مستقبلي على منطق إعادة المحاولة (حد أقصى لعدد المحاولات، تأخير متصاعد بين كل
// محاولة...) يُكتب هنا مرة واحدة فقط ويسري تلقائياً على كل الطوابير الحالية والمستقبلية.
//
// idField: اسم الحقل المُعرِّف للعنصر (مثلاً 'id')، اختياري. لو تُرك فارغاً، لا يوجد منع تكرار
// ولا استعلام "هل معلّق" (بالضبط بنفس سلوك طابور التسليمات الأصلي، الذي لم يكن يدعم أياً منهما).
export function createPendingQueue(storageKey, uploadFn, idField = null) {
    function getList() {
        try {
            return JSON.parse(localStorage.getItem(storageKey)) || [];
        } catch (e) {
            return [];
        }
    }
    function setList(list) {
        try {
            localStorage.setItem(storageKey, JSON.stringify(list));
        } catch (e) {
            console.error(`تعذر حفظ طابور "${storageKey}" محلياً:`, e);
        }
    }
    function queue(item) {
        let list = getList();
        if (idField) {
            list = list.filter(existing => existing[idField] !== item[idField]);
        }
        list.push(item);
        setList(list);
    }
    async function flush() {
        const list = getList();
        if (list.length === 0) return { sent: 0, remaining: 0 };
        const stillPending = [];
        let sentCount = 0;
        for (const item of list) {
            const ok = await uploadFn(item);
            if (ok) sentCount++;
            else stillPending.push(item);
        }
        setList(stillPending);
        if (sentCount > 0) console.log(`طابور "${storageKey}": تم إرسال ${sentCount} عنصر(اً) كان معلّقاً محلياً بنجاح.`);
        return { sent: sentCount, remaining: stillPending.length };
    }
    function isPending(id) {
        if (!idField) return false;
        return getList().some(item => item[idField] === id);
    }
    // 🌟 [جديد] إتاحة القائمة الحالية كاملة (نسخة، لا مرجع مباشر) — تُستخدَم مثلاً لمعرفة كم
    // عنصراً معلّقاً يخص واجباً معيناً بالذات (راجع getPendingSubmissionsCountForHomework في
    // core/firebase.js)، بدل الاكتفاء بسؤال "هل معرّف واحد بعينه معلّق؟" فقط.
    function list() {
        return getList();
    }
    return { queue, flush, isPending, list };
}
