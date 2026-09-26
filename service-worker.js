const CACHE_NAME = 'dar-ham-quran-v4'; // 🌟 رُفع من v3 إلى v4 مع دمج نظام الواجبات الجديد (2026-09-25) — أي تعديل جوهري لاحق في الملفات المخزّنة يستوجب رفعه مرة أخرى

// عند تثبيت التطبيق لأول مرة
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// عند تفعيل التطبيق
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// هذا الحد الأدنى المطلوب لكي يقبل المتصفح تثبيت التطبيق PWA
// 🌟🌟 [محدَّث] كان المعالج القديم يلتقط "كل" الطلبات (حتى طلبات الخادم الخارجي عبر النطاقات: Google Apps Script
// وFirestore وnص القرآن...) ويستدعي respondWith(fetch(...).catch(() => caches.match(...))). ولأن هذا الملف لا
// يخزّن أي شيء أبداً (لا يوجد cache.put)، فعند أي فشل شبكة كانت caches.match تُرجع undefined فيرمي المتصفح خطأ ثانياً
// "Failed to convert value to 'Response'" فوق الخطأ الحقيقي ويُخفي سببه. الآن: لا نتدخل إلا في طلبات GET من نفس
// النطاق (ملفات المنصة نفسها)، وأي طلب آخر (POST، أو نطاق خارجي مثل خادم الواجبات) يمرّ مباشرة بلا أي اعتراض.
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    let sameOrigin = false;
    try { sameOrigin = new URL(req.url).origin === self.location.origin; } catch (e) { /* رابط غير صالح: لا نتدخل */ }
    if (!sameOrigin) return;
    event.respondWith(
        fetch(req).catch(async () => {
            const cached = await caches.match(req);
            return cached || Response.error();     // 🌟 لا نُرجع undefined أبداً
        })
    );
});
