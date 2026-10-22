# أسئلة المتشابهات — الأدوات والاختبارات

المولّد نفسه في `engine/similarityQuestions.js` (منطق بحت). الأنواع: `sim_pair` (في أي سورتين؟ للأجزاء 26–30) · `sim_complete` (حُذف «ماذا بعدها؟/ما قبلها؟» لأنه ترتيب مكرر لأسئلة السابقة واللاحقة، والهدف تمييز الآية عن شبيهتها في سورة أخرى).
نص الآيات يُقرأ من مصحف المنصة (`database/quran-uthmani.json` ← IndexedDB) ولا يُؤخذ من حقل `fullText` في بيانات المجموعات.

- `qa.mjs` — فحوص الجودة على القرآن كله (مستقلة عن المولّد).
- `build_sample.mjs [مجلد]` — عيّنة Word/JSON (5 مجموعات لكل جزء) + `QA_REPORT.md` + قائمة المجموعات الناقصة (الافتراضي `reports/similarity-questions/`).
- الاختبارات: `node tests/similarityQuestions.test.mjs` · `node tests/similarityInject.test.mjs` · e2e: `tests/similarity-play.e2e.mjs` و`tests/similar-in-games.e2e.mjs`.

تفعيل متشابهات «داخل السورة» في المنصة: `INTERNAL_SIM_QUESTIONS_ENABLED = true` في `engine/similarityEngine.js` (معطّل حتى اعتماد العيّنة).

## النسخة التجريبية الخاصة
`node tools/preview/build_preview.mjs <مجلد>` يبني نسخة من المنصة (INTERNAL مفعّل، الخادم الحقيقي مفصول، طالبان تجريبيان، وصفحة تصفّح كل الأسئلة) دون لمس المستودع ولا الموقع المنشور. تُنشر كـ Artifact خاص.
