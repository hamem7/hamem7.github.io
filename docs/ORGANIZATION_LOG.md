# ORGANIZATION_LOG.md — سجل تنظيم مشروع «حمٓ» (2026-10-02)

## 1) الخلاصة
- **تم:** إنشاء `Ham_GitHub_Clean/` والتحقق منها، وإنشاء هيكل `_archive/`، وتحديث الوثائق والجرد.
- **لم يتم:** نقل أي عنصر إلى `_archive/`، ونقل `Ham_GitHub_Clean` خارج `test-test`. **السبب:** الجلسة بلا shell على الجهاز؛ المستكشف بمستوى «نقر فقط» (لا لصق/سحب/اختصارات) وجرّبتُ القص/اللصق فلم يعمل (زر «لصق» بقي معطّلًا). لم أتحايل على القيد (لم أشغّل `organize_files.bat` ولا أي أمر). تحققتُ بعدها أن المجلدات الـ12 `_backup_*` وكل الملفات في أماكنها سليمة.
- لم يُحذف أو يُعدَّل أو يُعاد تسمية أي ملف قائم.

## 2) ما أُنشئ
| العنصر | المحتوى |
|---|---|
| `_archive/` + `_backups _old _duplicates _unused` | مجلدات فارغة + `README.txt` عربي في كل منها (ملاحظة: `_experimental` لم يُنشأ لعدم وجود ما يحتاجه). |
| `Ham_GitHub_Clean/` | 126 ملفًا: كل الملفات الحية + `backend/Code.gs` و`backend/appsscript.json` (مصدر الواجبات من Apps Script) + `docs/PROJECT_MAP.md` و`docs/PROJECT_STATE.md` + `README.md` الجذري كما هو. |
| الوثائق | `PROJECT_MAP.md` و`PROJECT_STATE.md` (محدَّثان)، `PROJECT_INVENTORY.csv` (أُعيد توليده)، وهذا الملف. |

### التحقق من `Ham_GitHub_Clean`
- الملفات الحية مطابقة بايت-ببايت للنسخة العاملة (فروق = 0؛ تُستثنى `backend/` و`docs/` المضافتان).
- فحص كل `import` و`src` و`href` و`templateUrl`: لا مسار غير محلول.
- لا استيراد حي لـ `firebase.js` أو `supabase.js` أو `recitation/` أو `*-1.js` (الأثر الوحيد تعليق).
- فحص الأسرار: لا شيء؛ `core/api.js` فيه فقط رابط Apps Script العام ومعرّف OAuth العام.
- PWA: `manifest.json` و`service-worker.js` والأيقونات (`icons/`) و`index.html` (التسجيل) موجودة. **لم يُشغَّل المتصفح** لاختبار التثبيت فعليًا — فحص ثابت فقط.
- مطابقة أحجام الملفات على الجهاز مع المصدر: متطابقة.

## 3) مخطط النقل (لم يُنفَّذ) — من → إلى، والسبب
| من | إلى `_archive/` | الدليل على أنه غير حي |
|---|---|---|
| `_backup_*` ×12 | `_backups/` | لقطات جزئية قديمة؛ لا استيراد حي إليها. (`organize_files.bat` يفعل هذا فقط) |
| `assets/_originals_before_optimize/` | `_old/` | أصول أصلية قبل الضغط؛ النسخ المضغوطة هي المستخدمة. |
| `Claude outputs/` | `_old/` | مخرجات مرجعية؛ لا استيراد. ⚠️ `تصميم-التقرير/*.png` مطابقة بكسليًا للصور المستخدمة في `assets/report` — النسخ الحية تبقى. `mutashabihatSeed.js` فيه (323,713 بايت) أقدم من الحي (299,702). |
| `dualtests/*-1.*` (3 ملفات) | `_duplicates/` | نسخ أقدم، لا مرجع لها. |
| `core/firebase.js` · `core/supabase.js` · `firestore.rules` · `storage.rules` | `_unused/` | Firebase/Supabase متروكان؛ لا استيراد. |
| `recitation/` · `database/recitationDB.js` · `css/recitation.css` | `_unused/` | ميزة غير مفعّلة بلا استيراد حي. |

## 4) أُبقي في مكانه عمدًا
- كل الملفات الحية (`core/ components/ css/ database/ engine/ games/ reports/ settings/ student/ assets/ icons/ dualtests/` غير `-1`، الجذر).
- `Dar-Ham-Homework-Lab/` بما فيه `vendor/`: كود المعمل يستورد من `vendor/`، فنقله يكسره. (ملف `vendor/engine/homeworkEngine.js` يفشل في CHECKSUMS؛ مُوثّق.)
- `kids-bg.jpg` و`assets/kids_bg/1.jpg` و`assets/report/*`: متطابقة بكسليًا لكنها مستخدمة معًا.
- `core/netUtils.js` و`engine/masteryEngine.js`: نُسخا للنظيفة احتياطًا (استيراد غير مثبت بالكامل).
- `README.md`: قديم لكنه لم يُعدَّل (بلا اختلاق).
- `organize_files.bat`: لم يُشغَّل، لم أحذفه.
- `lab-site.zip` وما شابه: لم يُنقل لعدم الحسم.

## 5) غير محسوم
1. تنفيذ النقل (§3): يدويًا من المستكشف أو بمنح shell.
2. نقل `Ham_GitHub_Clean` إلى `D:\المنصة\الاحتياطي\` قبل `git init`.
3. تحديث README.md (يذكر «أبطال القرآن» و«معلم واحد» و`supabase-migration.sql` غير الموجود).
4. تضمين `backend/Code.gs` في النشر العام أم لا (لا أسرار فيه حسب الفحص، لكن القرار لك).
5. بقية البنود في `PROJECT_STATE.md` §7.

## 6) قاعدة الحذف
لا يُحذف أي أرشيف قبل: اختبار الحي ← اختبار النظيفة ← عملها بالكامل ← رفعها إلى GitHub بنجاح.
