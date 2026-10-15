# أسئلة المتشابهات — الأدوات والاختبارات

المولّد نفسه في `engine/similarityQuestions.js` (منطق بحت). الأنواع: `sim_surah` · `sim_complete` · `sim_next` · `sim_prev`.
نص الآيات يُقرأ من مصحف المنصة (`database/quran-uthmani.json` ← IndexedDB) ولا يُؤخذ من حقل `fullText` في بيانات المجموعات.

- `qa.mjs` — فحوص الجودة على القرآن كله (مستقلة عن المولّد).
- `build_sample.mjs [مجلد]` — عيّنة Word/JSON (5 مجموعات لكل جزء) + `QA_REPORT.md` + قائمة المجموعات الناقصة (الافتراضي `reports/similarity-questions/`).
- الاختبارات: `node tests/similarityQuestions.test.mjs` · `node tests/similarityInject.test.mjs` · e2e: `tests/similarity-play.e2e.mjs` و`tests/similar-in-games.e2e.mjs`.

تفعيل متشابهات «داخل السورة» في المنصة: `INTERNAL_SIM_QUESTIONS_ENABLED = true` في `engine/similarityEngine.js` (معطّل حتى اعتماد العيّنة).
