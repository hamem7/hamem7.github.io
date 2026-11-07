# مصدر صور صفحات المصحف

- صفحات المصحف (604 صفحة) من https://android.quran.com/data/width_1024/ (مشروع quran_android).
- حُوّلت من PNG إلى WebP (جودة 80، عرض 800) بواسطة `.github/workflows/fetch-mushaf.yml`.
- تُستخدم في لعبة الذاكرة البصرية (`engine/quranEngine.js`) بدل الرابط الخارجي.

## مواضع الآيات (assets/mushaf/ayah/)
- من https://android.quran.com/data/databases/ayahinfo/ayahinfo_1024.zip (مشروع quran_android)، حُوّلت بـ `tools/build-ayah-rects.py` عبر `.github/workflows/fetch-ayah-rects.yml`.
- لكل صفحة ملف `pNNN.json` بنِسَب مئوية من الصورة الأصلية (1024×1656) فتصلح لأي حجم عرض. تُستعمل لتظليل الآية في سؤال الذاكرة البصرية.
