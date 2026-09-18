const CACHE_NAME = 'dar-ham-quran-v3'; // 🌟 رُفع من v2 إلى v3 مع إصدار 1.0.3 بتاريخ 2026-09-18 (تلميحات الأقسام + تقرير الاختبارات الثنائية) — أي تعديل جوهري لاحق في الملفات المخزّنة يستوجب رفعه مرة أخرى

// عند تثبيت التطبيق لأول مرة
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// عند تفعيل التطبيق
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// هذا الحد الأدنى المطلوب لكي يقبل المتصفح تثبيت التطبيق PWA
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});