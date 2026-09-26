// core/supabase.js
// ==========================================================
// 🌟🌟 [جديد] بديل كامل لـ core/firebase.js — الانتقال من Firebase (Firestore + Storage +
// App Check) إلى Supabase (Postgres + Storage + Auth)
// ==========================================================
// السياق: بعد تكرار مشاكل إعداد Firebase App Check/reCAPTCHA Enterprise (يحتاج تفعيل فوترة
// Google Cloud لا علاقة لها بالكود إطلاقاً — راجع مستند "تشخيص حاسم: تعطل مزامنة الواجبات"
// في مشروع المنصة)، طلب المعلم صراحةً الانتقال لخدمة سحابية أبسط. الاختيار: Supabase (قاعدة
// بيانات Postgres + تخزين ملفات + تسجيل دخول)، لأنه أقرب بديل من ناحية القدرة (نفس فكرة
// "قاعدة بيانات + Storage" بالضبط) وأبسط من ناحية الإعداد (باقة مجانية سخية بدون أي حاجة
// لفوترة أو مزوّد تحقق خارجي معقّد زي reCAPTCHA Enterprise).
//
// 🌟 كل الدوال المُصدَّرة هنا (رفع/جلب الواجبات والتسليمات) لها نفس الاسم والتوقيع والسلوك
// الظاهري تماماً كنظيراتها القديمة في core/firebase.js — أي شاشة تستوردها
// (settings/homework-prep.js، student/homework-welcome.js، games/homework-play.js،
// reports/monthly-report.js، core/app.js) لم تحتَج أي تعديل في منطقها الداخلي، فقط تغيير
// مسار الاستيراد من './firebase.js' إلى './supabase.js'.
//
// 🌟🌟 [جديد] بالإضافة لذلك، أضفنا هنا تسجيل دخول حقيقي للمعلم (بريد/كلمة سر عبر
// Supabase Auth) — كان "قراراً معلّقاً" منذ فترة طويلة وموثَّقاً صراحة في
// دليل-تطبيق-قواعد-الأمان.md (قراءة أسماء ودرجات وتسجيلات صوت كل الطلاب كانت مفتوحة لأي
// حد يعرف اسم مشروع Firebase). الآن: قراءة/تعديل تسليمات الطلاب، ونشر/تعديل الواجبات،
// وتشغيل التسجيلات الصوتية — كل ده محمي فعلياً خلف تسجيل دخول حقيقي (راجع ملف
// firestore-migration.sql في جذر المشروع لقواعد RLS الكاملة). الشيء الوحيد المتبقي مفتوحاً
// بدون تسجيل دخول (بنفس فلسفة Firestore القديمة تماماً، وبنفس السبب): الطالب يقدر يرسل
// تسليمه (create فقط)، ويقدر يقرأ واجباً بمعرفه (get فقط، خط رجوع نادر — الرابط الحديث
// المكتفي ذاتياً في database/homeworkDB.js لا يحتاج هذا إطلاقاً في الحالة الشائعة).

import { withTimeout, withTimeoutOrThrow, stripOversizedFields, createPendingQueue, DEFAULT_TIMEOUT_MS } from './netUtils.js';
import { submissionNeedsGrading } from './submissionStatus.js';

// 🌟 استدعاء مكتبة Supabase عبر CDN (jsdelivr)، بنفس فلسفة استدعاء Firebase من gstatic.com
// سابقاً بالضبط — بدون أي أداة بناء (build step)، متوافقة تماماً مع ES Modules الخام
// المستخدمة في كل المنصة.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ==========================================
// 🔑 بيانات الاتصال بمشروعك على Supabase
// ==========================================
// من لوحة تحكم Supabase (supabase.com) → مشروعك → Project Settings → API:
// - "Project URL" يُلصَق في SUPABASE_URL
// - "anon public" key يُلصَق في SUPABASE_ANON_KEY
// 🌟 هذا المفتاح آمن تماماً للاستخدام في كود الواجهة الأمامية المرئي للجميع — بالضبط مثل
// apiKey في Firebase سابقاً. الحماية الحقيقية تأتي من قواعد RLS في قاعدة البيانات (راجع
// firestore-migration.sql)، وليس من إخفاء هذا المفتاح.
const SUPABASE_URL = "PASTE_YOUR_SUPABASE_URL_HERE";
const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 🔐 تسجيل دخول المعلم (Supabase Auth)
// ==========================================
// 🌟 لا يوجد "إنشاء حساب جديد" من داخل التطبيق عمداً — المنصة لمعلم واحد فقط (فلسفة
// المشروع بالكامل)، فحساب المعلم يُنشأ مرة واحدة يدوياً من لوحة تحكم Supabase
// (Authentication → Users → Add user)، وليس عبر نموذج عام قد يستخدمه أي زائر لإنشاء حساب.

export async function signInTeacher(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

export async function signOutTeacher() {
    await supabase.auth.signOut();
}

// 🌟 هل يوجد حالياً جلسة معلم مسجّل دخوله على هذا الجهاز؟ Supabase يحتفظ بالجلسة تلقائياً
// في localStorage ويجدّدها بصمت (isTokenAutoRefreshEnabled مفعّلة افتراضياً)، فبعد أول
// تسجيل دخول ناجح على جهاز المعلم، لن يُطلب منه الدخول تاني على نفس الجهاز/المتصفح إلا لو
// سجّل خروجه صراحة أو مسح بيانات الموقع يدوياً.
export async function isTeacherSignedIn() {
    try {
        const { data } = await supabase.auth.getSession();
        return !!(data && data.session);
    } catch (e) {
        console.error("تعذر التحقق من جلسة تسجيل دخول المعلم:", e);
        return false;
    }
}

// ==========================================
// 📊 دوال نتائج الطلاب (Submissions)
// ==========================================

// دالة 1: رفع نتيجة الطالب إلى السحابة
// 🌟 upsert بدل insert عمداً: لو فشل الرفع الأول بسبب انقطاع الشبكة بعد وصول الطلب فعلاً
// للخادم (نادر لكن ممكن)، وأعاد طابور إعادة المحاولة نفس التسليم بنفس id لاحقاً، upsert
// يحدّث نفس الصف بدل رفض العملية بخطأ "تكرار مفتاح أساسي" — بنفس روح addDoc في Firestore
// (كانت تنشئ مستنداً جديداً دائماً بمعرّف مختلف، فلا يوجد أصلاً احتمال تعارض).
export async function saveSubmissionToCloud(submissionData) {
    return withTimeout((async () => {
        try {
            let cleanData = JSON.parse(JSON.stringify(submissionData));
            cleanData = stripOversizedFields(cleanData);
            const { error } = await supabase
                .from('submissions')
                .upsert({ id: cleanData.id, data: cleanData }, { onConflict: 'id' });
            if (error) throw error;
            console.log("تم رفع النتيجة بنجاح للسحابة برقم: ", cleanData.id);
            return true;
        } catch (e) {
            console.error("حدث خطأ أثناء رفع النتيجة للسحابة: ", e);
            return false;
        }
    })(), DEFAULT_TIMEOUT_MS, false);
}

// دالة 2: جلب نتائج الطلاب لواجب معين من السحابة
// 🌟 الفلترة على data->>hwId تتم مباشرة في قاعدة البيانات (عبر PostgREST) بلا حاجة لعمود
// مستقل لـ hwId — نفس فكرة where("hwId", "==", hwId) في Firestore تماماً.
export async function getSubmissionsFromCloud(hwId) {
    return withTimeoutOrThrow((async () => {
        try {
            const { data: rows, error } = await supabase
                .from('submissions')
                .select('id, data')
                .filter('data->>hwId', 'eq', hwId);
            if (error) throw error;

            let results = (rows || []).map(row => ({ ...row.data, docId: row.id }));
            results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            return results;
        } catch (e) {
            console.error("حدث خطأ أثناء جلب النتائج من السحابة: ", e);
            throw e;
        }
    })());
}

// 🌟 دالة: جلب كل التسليمات (عبر كل الواجبات دفعة واحدة) التي بها سؤال واحد على الأقل
// يحتاج تصحيح المعلم يدوياً ولم يُصحَّح بعد.
export async function getSubmissionsNeedingGrading() {
    return withTimeoutOrThrow((async () => {
        try {
            const { data: rows, error } = await supabase.from('submissions').select('id, data');
            if (error) throw error;

            let results = [];
            (rows || []).forEach(row => {
                if (submissionNeedsGrading(row.data)) {
                    results.push({ ...row.data, docId: row.id });
                }
            });
            return results;
        } catch (e) {
            console.error("حدث خطأ أثناء جلب التسليمات التي تحتاج تصحيح: ", e);
            throw e;
        }
    })());
}

// 🌟 دالة: جلب كل تسليمات كل الواجبات دفعة واحدة، بلا أي فلترة — تُستخدَم في
// reports/monthly-report.js لتجميع درجات الواجبات المنزلية عبر شهر كامل لكل طالب.
export async function getAllSubmissionsFromCloud() {
    return withTimeoutOrThrow((async () => {
        try {
            const { data: rows, error } = await supabase.from('submissions').select('id, data');
            if (error) throw error;
            return (rows || []).map(row => ({ ...row.data, docId: row.id }));
        } catch (e) {
            console.error("حدث خطأ أثناء جلب كل التسليمات من السحابة: ", e);
            throw e;
        }
    })());
}

// دالة: تحديث نتيجة الطالب بعد التصحيح اليدوي للمعلم (score/details فقط، بنفس الحقلين
// اللي بيبعتهم saveManualGrades في homework-prep.js بالضبط) — نقرأ الصف الحالي أولاً
// وندمج الحقول الجديدة فيه (Postgres/Supabase لا يدعم "تحديث حقل جوّه jsonb" مباشرة من
// طرف العميل بنفس بساطة updateDoc في Firestore).
export async function updateSubmissionInCloud(docId, updatedFields) {
    return withTimeout((async () => {
        try {
            const { data: row, error: fetchError } = await supabase
                .from('submissions').select('data').eq('id', docId).single();
            if (fetchError) throw fetchError;

            const mergedData = { ...row.data, ...updatedFields };
            const { error: updateError } = await supabase
                .from('submissions').update({ data: mergedData }).eq('id', docId);
            if (updateError) throw updateError;

            console.log("تم تحديث النتيجة بعد التصحيح في السحابة بنجاح!");
            return true;
        } catch (e) {
            console.error("حدث خطأ أثناء تحديث النتيجة بعد التصحيح: ", e);
            return false;
        }
    })(), DEFAULT_TIMEOUT_MS, false);
}

// ==========================================
// 🎤 رفع/تشغيل التسجيلات الصوتية (Supabase Storage)
// ==========================================
// 🌟🌟 [تغيير أمني عن Firebase] كانت uploadAudioAndGetUrl تُعيد رابطاً عاماً دائماً (Public
// Download URL) يُخزَّن كما هو في بيانات التسليم — أي حد يعرف أو يخمّن هذا الرابط يقدر يسمع
// تسجيل الطفل الصوتي للأبد، بلا أي تسجيل دخول (كان هذا موثّقاً كخطر خصوصية حقيقي في
// storage.rules القديم). الآن bucket التسجيلات الصوتية "homework_audio" غير عام (private)،
// وuploadAudioAndGetUrl تُعيد مسار التخزين فقط (وليس رابطاً)، ثم getSignedAudioUrl (تُستدعى
// من settings/homework-prep.js وقت فتح غرفة التصحيح فقط، وهي شاشة محمية أصلاً خلف تسجيل
// دخول المعلم) تُنشئ رابط تشغيل مؤقت صالح لساعة واحدة فقط. النتيجة: التسجيل الصوتي لا يمكن
// سماعه إطلاقاً بدون تسجيل دخول المعلم أولاً.
export async function uploadAudioAndGetUrl(base64AudioDataUrl, submissionId, questionId) {
    return withTimeout((async () => {
        try {
            // 🌟 fetch() المدمجة في المتصفح تقرأ أي data: URL وتحوّلها لـ Blob مباشرة —
            // بدون أي حاجة لفك ترميز Base64 يدوياً.
            const blob = await (await fetch(base64AudioDataUrl)).blob();
            const path = `${submissionId}/${questionId}.webm`;

            const { error } = await supabase.storage
                .from('homework_audio')
                .upload(path, blob, { contentType: 'audio/webm', upsert: true });
            if (error) throw error;

            return path; // 🌟 مسار وليس رابطاً — راجع الشرح أعلاه
        } catch (e) {
            console.error("حدث خطأ أثناء رفع الملف الصوتي إلى Storage: ", e);
            return null;
        }
    })(), DEFAULT_TIMEOUT_MS, null);
}

// 🌟🌟 [جديد] إنشاء رابط تشغيل مؤقت وآمن لتسجيل صوتي محفوظ، تُستدعى فقط من غرفة التصحيح
// (settings/homework-prep.js، محمية خلف تسجيل دخول المعلم). صالح لمدة ساعة واحدة فقط، ثم
// يجب طلب رابط جديد (لو أعاد المعلم فتح نفس التسليم لاحقاً).
export async function getSignedAudioUrl(path) {
    if (!path) return null;
    // 🌟 توافق أمان: لو كانت القيمة رابطاً كاملاً بالفعل لأي سبب (مثلاً تسليم قديم جداً من
    // فترة Firebase قبل هذا التحديث)، نستخدمه كما هو بدل محاولة معاملته كمسار تخزين.
    if (/^https?:\/\//.test(path)) return path;

    try {
        const { data, error } = await supabase.storage
            .from('homework_audio')
            .createSignedUrl(path, 3600); // ساعة واحدة
        if (error) throw error;
        return (data && data.signedUrl) || null;
    } catch (e) {
        console.error("تعذر إنشاء رابط تشغيل مؤقت للتسجيل الصوتي:", e);
        return null;
    }
}

// ==========================================
// 📦 طابورا احتياطيان محليان لإعادة إرسال أي تسليم/واجب فشل رفعه للسحابة
// ==========================================
// 🌟 نفس core/netUtils.js (createPendingQueue) المستخدَم مع Firebase تماماً بلا أي تغيير —
// الطابور مستقل تماماً عن نوع الخدمة السحابية خلفه (يستقبل فقط دالة الرفع نفسها). نفس
// أسماء مفاتيح localStorage المستخدَمة سابقاً ('pendingHwSubmissions'، 'pendingHwCloudSync')
// عمداً، حتى لو كان فيها عناصر معلّقة محلياً على جهاز طالب/معلم من قبل هذا التحديث، تُرفع
// تلقائياً للسحابة الجديدة (Supabase) في أول فرصة بدل أن تضيع.
const submissionsQueue = createPendingQueue('pendingHwSubmissions', saveSubmissionToCloud, 'id');
export function queuePendingSubmission(submissionData) {
    submissionsQueue.queue(submissionData);
}
export function flushPendingSubmissions() {
    return submissionsQueue.flush();
}
export function isSubmissionPendingSync(submissionId) {
    return submissionsQueue.isPending(submissionId);
}
export function getPendingSubmissionsCountForHomework(hwId) {
    return submissionsQueue.list().filter(item => item.hwId === hwId).length;
}

// ==========================================
// 📚 دوال الواجبات (Homeworks)
// ==========================================

// دالة 3: رفع الواجب إلى السحابة عند نشره (للمعلم)
export async function saveHomeworkToCloud(hwData) {
    return withTimeout((async () => {
        try {
            // 🌟 نفس استبعاد assignedStudentAvatar المطبّق أصلاً في encodeHomeworkForLink
            // (database/homeworkDB.js) — صورة الطالب الكاملة بصيغة Base64 غير مستخدمة إطلاقاً
            // في شاشتي الطالب، ولا داعي لتخزينها في قاعدة البيانات السحابية.
            const { assignedStudentAvatar, ...dataWithoutAvatar } = hwData;
            let cleanData = JSON.parse(JSON.stringify(dataWithoutAvatar));
            cleanData = stripOversizedFields(cleanData);

            const { error } = await supabase
                .from('homeworks')
                .upsert({ id: cleanData.id, data: cleanData }, { onConflict: 'id' });
            if (error) throw error;

            console.log("تم رفع الواجب للسحابة بنجاح!");
            return true;
        } catch (e) {
            console.error("حدث خطأ أثناء رفع الواجب للسحابة: ", e);
            return false;
        }
    })(), DEFAULT_TIMEOUT_MS, false);
}

const homeworkQueue = createPendingQueue('pendingHwCloudSync', saveHomeworkToCloud, 'id');
export function queuePendingHomeworkSync(hwData) {
    homeworkQueue.queue(hwData);
}
export function flushPendingHomeworkSync() {
    return homeworkQueue.flush();
}
export function isHomeworkPendingSync(hwId) {
    return homeworkQueue.isPending(hwId);
}

// دالة 4: البحث عن واجب وجلبه من السحابة (للطالب) — خط رجوع نادر فقط، راجع الشرح في رأس
// الملف. لا يحتاج تسجيل دخول (نفس "allow get: if true" في Firestore القديم بالضبط).
export async function getHomeworkFromCloud(hwId) {
    return withTimeout((async () => {
        try {
            const { data: row, error } = await supabase
                .from('homeworks').select('data').eq('id', hwId).maybeSingle();
            if (error) throw error;

            if (row) return row.data;
            console.warn("الواجب غير موجود في السحابة!");
            return null;
        } catch (e) {
            console.error("حدث خطأ أثناء جلب الواجب من السحابة: ", e);
            return null;
        }
    })(), DEFAULT_TIMEOUT_MS, null);
}
