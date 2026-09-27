// core/analytics.js
// 🌟🌟 [جديد] نظام تحليلات خصوصي بسيط عبر GoatCounter (مجاني بالكامل ومفتوح المصدر، بدون أي
// إعلانات، وبدون خادم/قاعدة بيانات جديدة، وبدون أي بصمة متصفح Fingerprinting) — الهدف الوحيد:
// عدد الزوار الفريدين، عدد الزيارات، الأجهزة/الأنظمة، الشاشات الأكثر زيارة، الدولة التقريبية،
// وتقدير "تثبيتات PWA المرصودة". كل هذه الأرقام تظهر فقط في لوحة GoatCounter الخاصة (خارج
// المنصة تماماً) — لا توجد أي شاشة تحليلات داخل المنصة نفسها، ولا يُرسَل أي شيء يخص الطلاب أو
// المعلم (لا أسماء، لا درجات، لا تقدّم حفظ، لا بيانات ملف المعلم).
//
// سكربت GoatCounter نفسه (data-goatcounter + src) موضوع في <head> بملف index.html مع
// no_onload:true — نفس الطريقة الرسمية الموصى بها من توثيق GoatCounter لمواقع الـ SPA. لأن
// المنصة SPA حقيقية بالكامل (كل الشاشات تُحمَّل داخل index.html عبر core/navigation.js →
// loadScreen، بدون أي تحميل صفحة فعلي جديد من المتصفح)، no_onload يوقف الإرسال الأوتوماتيكي
// لأول تحميل، ونستدعي trackPageview() هنا يدوياً من loadScreen() نفسها عند كل تغيير شاشة.
//
// ⚠️ فشل أي جزء هنا (لا إنترنت، سكربت GoatCounter محجوب بمانع إعلانات...) لا يجب أن يوقف
// المنصة أبداً أو يطبع خطأ في الـ Console يخيف المعلم — كل نداء محاط بـ try/catch صامت.

// 🌟 مفتاح localStorage لمنع تكرار إرسال حدث "تثبيت PWA" في كل مرة يُفتح فيها التطبيق
// المثبَّت فعلاً (بعكس أول تثبيت فقط) — تخزين محلي بسيط بلا أي مزامنة سحابية، بنفس فلسفة
// بقية مفاتيح localStorage الموجودة في core/app.js (WHATS_NEW_STORAGE_KEY وغيره)
const PWA_INSTALL_TRACKED_KEY = 'dh_pwa_install_event_sent';

// 🌟 إرسال pageview يدوي إلى GoatCounter — يُستدعى من core/navigation.js عند كل تغيير شاشة
// داخل الـ SPA (كل templateUrl يُعتبر "صفحة" من منظور الزائر). templateUrl مثل
// 'settings/homework-prep.html' يتحول لمسار قابل للقراءة في لوحة GoatCounter.
export function trackPageview(templateUrl) {
    try {
        if (!window.goatcounter || typeof window.goatcounter.count !== 'function') return; // السكربت لم يتحمّل/محجوب — تجاهل بصمت
        let path = '/';
        if (templateUrl) {
            path = '/' + String(templateUrl).replace(/\.html$/i, '');
        }
        window.goatcounter.count({ path, title: document.title });
    } catch (e) {
        // تجاهل بصمت — التحليلات اختيارية ولا يجب أن تكسر أي شاشة
    }
}

// 🌟 إرسال حدث مخصّص عام (مثل pwa_installed) — دالة عامة قابلة لإعادة الاستخدام لاحقاً
// لأي حدث آخر (homework_opened، quiz_started...) بدون تكرار منطق try/catch في كل مرة.
// event:true هي علامة GoatCounter الخاصة بالأحداث المخصصة (بعكس pageview العادي)، وeventName
// نفسه يُستخدم كاسم الحدث الظاهر في لوحة "Events" (لا يجوز أن يبدأ بـ / حسب توثيق GoatCounter).
export function trackEvent(eventName, title) {
    try {
        if (!window.goatcounter || typeof window.goatcounter.count !== 'function') return;
        window.goatcounter.count({ path: eventName, title: title || eventName, event: true });
    } catch (e) {
        // تجاهل بصمت
    }
}

function sendInstallEventOnce() {
    try {
        if (localStorage.getItem(PWA_INSTALL_TRACKED_KEY)) return; // أُرسل من قبل على هذا الجهاز — لا تكرار
        localStorage.setItem(PWA_INSTALL_TRACKED_KEY, '1');
        trackEvent('pwa_installed', 'PWA installed');
    } catch (e) {
        // تجاهل بصمت
    }
}

// 🌟🌟 تتبّع "تثبيتات PWA المرصودة" (Observed PWA installations) — تسمية متعمدة وليست
// "العدد الدقيق لكل التثبيتات"، لأنه لا توجد طريقة موحّدة 100% تعمل على كل المتصفحات/الأنظمة:
//
// • Chrome/Edge/Android: حدث المتصفح الرسمي appinstalled يُطلَق لحظة التثبيت الفعلية — الأدق.
// • iOS/iPadOS (Safari): لا يوجد حدث appinstalled ولا أي API رسمي لرصد لحظة التثبيت. البديل
//   الوحيد المتاح هو ملاحظة إن كان التطبيق يعمل الآن في standalone mode (يعني أُضيف للشاشة
//   الرئيسية وفُتح منها) — وهذا يُحتسب عند أول فتح بعد التثبيت لا لحظة التثبيت نفسها بالضبط،
//   وقد يفوت تثبيتات لم تُفتح بعد من الشاشة الرئيسية. راجع البند 5 في طلب المعلم الأصلي.
function setupPwaInstallTracking() {
    try {
        window.addEventListener('appinstalled', sendInstallEventOnce);

        const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
            || window.navigator.standalone === true; // iOS Safari القديم لا يدعم matchMedia لهذا
        if (isStandalone) sendInstallEventOnce();
    } catch (e) {
        // تجاهل بصمت
    }
}

// يُنفَّذ مرة واحدة فقط عند تحميل هذا الملف (يُستورَد مرة واحدة من core/navigation.js)
setupPwaInstallTracking();
