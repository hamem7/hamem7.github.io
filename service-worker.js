const CACHE_NAME = 'dar-ham-quran-v2'; // 🌟 رُفع من v1 إلى v2 عند إعادة تفعيل التسجيل الطبيعي بتاريخ 2026-09-14 — أي تعديل جوهري لاحق في الملفات المخزّنة يستوجب رفعه مرة أخرى

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