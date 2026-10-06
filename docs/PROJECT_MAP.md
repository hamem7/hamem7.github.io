# PROJECT_MAP.md — خريطة مشروع منصة «حمٓ»

> أُنشئت: 2026-10-02 من فحص فعلي للمجلد `D:\المنصة\الاحتياطي\test-test` (291 ملفًا، 12 مجلد `_backup_*`). الحالة الحالية والقرارات في `PROJECT_STATE.md`؛ الجرد الكامل (مسار، حجم، تاريخ، نوع، SHA-256، تصنيف) في `PROJECT_INVENTORY.csv`.
> **تحديث 2026-10-02 (التنظيم):** أُضيف مجلدان جديدان فقط: `Ham_GitHub_Clean/` (نسخة نشر نظيفة، 126 ملفًا) و`_archive/` (هيكل فارغ). لم يُنقل أو يُعاد تسمية أو يُحذف أو يُعدَّل أي ملف قائم؛ النقل لم يُنفَّذ لتعذّره من الجلسة — انظر `ORGANIZATION_LOG.md`. الأقسام أدناه تصف الحي كما هو.
> **مهم:** لم يُنقل أو يُعاد تسمية أو يُحذف أو يُعدَّل أي ملف قائم في هذه المهمة. الهيكل أدناه هو **الهيكل الفعلي كما هو**، مع تصنيف لما هو حي وما هو أرشيف.

## 1) الهيكل الفعلي (مصنَّف)
```
test-test/
├─ index.html · manifest.json · service-worker.js · privacy.html · README.md · kids-bg.jpg      ← حيّ (الجذر)
├─ firestore.rules · storage.rules                                                               ← Legacy (Firebase) بلا استخدام حي
├─ organize_files.bat                                                                            ← سكربت مساعد لم يُشغَّل
├─ core/  components/  css/  database/  engine/  games/  reports/  settings/                     ← حيّ (قلب المنصة)
├─ student/  similarities/  tajweed/  dualtests/  tests/  assets/  icons/                        ← حيّ
├─ recitation/                                                                                   ← غير مفعّل (ليس ميزة)
├─ Dar-Ham-Homework-Lab/                                                                         ← معمل تجريبي (Sandbox)
├─ Claude outputs/                                                                               ← مخرجات مرجعية
├─ assets/_originals_before_optimize/                                                            ← أرشيف صور أصلية (≈24MB)
└─ _backup_*  (12 مجلدًا)                                                                        ← لقطات احتياطية جزئية
```

## 2) وظيفة كل مجلد رئيسي
| المجلد | الوظيفة |
|---|---|
| `core/` | المنطق الأساسي: `app.js` (الإقلاع والتوجيه)، `i18n.js` (الترجمة ثنائية اللغة)، `navigation.js`، `version.js` (رقم الإصدار + سجل التحديثات)، `api.js` + `homeworkApi.js` (خادم الواجبات Google Apps Script)، `submitQueue.js` (إعادة محاولة الإرسال)، `homeworkNotifier.js`، `backupRestore.js` (نسخ احتياطي للبيانات)، `quranTextUtils.js`، `netUtils.js`، `analytics.js`… |
| `database/` | طبقة IndexedDB لكل كيان: طلاب، واجبات، معلم، متشابهات، تجويد، اختبارات ثنائية، حفظ شهري، جدول مراجعة، صوت الأطفال، نص القرآن. `data/mutashabihatSeed.js` = بيانات المتشابهات الحيّة. |
| `engine/` | منطق الألعاب والتقييم: `quranEngine` (أكبرها)، `kidsEngine`، `masteryEngine`، `homeworkEngine`، `dualTestEngine`، `similarityEngine`، `tajweedEngine` + `tajweedRulesCatalog`، `memorizationEngine`، `reviewParts`. |
| `components/` | شاشات ومكوّنات مشتركة: الرئيسية (`splash.html`، `homeFast.js`، `homeQuickview.js`)، `teacherProfile`/`teacherAuthGate`، `pausedSession`، `fixErrorsPrompt`، التقارير الشهرية/الحفظ الشهري، `sectionHint`، `welcomeBanner`، `ui`. |
| `css/` | الأنماط (`global`، `home`، `homeFast`، `kids`، `adults`، `tajweed`، `similarities`…). ألوان الهوية `--dh-emerald` و`--dh-gold` معرَّفة في `home.css`. |
| `games/` | لعب الكبار (`adultGame`) والأطفال (`kidsGame`) وحل الواجب (`homework-play`). |
| `student/` | دخول الطالب، «طلابي»، كل الطلاب، ملف الطالب، ترحيب الواجب، و`student.js` (منطق الإدارة). |
| `settings/` | لوحة المعلم `dashboard.*` و**معمل إعداد الواجبات `homework-prep.*`** (أضخم ملف JS في المنصة). |
| `reports/` | تقارير PDF/PNG: التقييم الفردي، الشهري، الاختبارات الثنائية، شهادة الواجب (`hwCertificate.js`). |
| `certificates/` | شاشة الشهادات: `certificates.js` (الواجهة والمعاينة والتصدير)، `templates.js` (16 قالباً: مناطق الكتابة والألوان)، `texts.js` (أنواع الشهادات والصيغ والآيات)، `certificatesDB.js` (سجل ما صدر، IndexedDB). خلفياتها في `assets/certificates/`. |
| `similarities/` · `tajweed/` · `dualtests/` | ركن المتشابهات؛ مسار التجويد (المرحلة الأولى فقط حسب README)؛ الاختبارات الثنائية (قيد التطوير). |
| `tests/` | اختباران منطقيان يدويان بـ node: `homeworkEngine.test.js`، `memorizationEngine.test.js`. |
| `assets/` `icons/` | صور خلفية الأطفال، زخارف التقرير، أيقونات PWA. |
| `Dar-Ham-Homework-Lab/` | معمل تجربة خلفية الواجبات (Apps Script `backend/Code.gs` + محاكي + واجهة تجريبية + اختبارات + `vendor/` نسخ مقتطعة). مرجع مهم لفهم الخادم، **وليس جزءًا من التشغيل**. |

## 3) الملفات المهمة ووظيفتها
- `index.html`: صفحة الدخول؛ يحمّل `core/app.js` ويسجّل `service-worker.js` ويفعّل GoatCounter.
- `core/app.js` (≈53KB): الإقلاع، يستورد كل DBs والمحركات، ويقرأ `?hw=` لروابط الواجبات.
- `core/i18n.js` (≈318KB): كل نصوص الواجهة (ar/en). **أي نص جديد يُضاف هنا.**
- `core/version.js`: `APP_VERSION=1.0.8` + `CHANGELOG` (يُرفع مع كل تحديث فعلي).
- `core/api.js` / `core/homeworkApi.js`: واجهة الاتصال بخادم الواجبات (Apps Script + Sheets).
- `settings/homework-prep.js/.html`: إنشاء الواجب، السجل، غرفة التصحيح، النتائج، التنظيف التلقائي.
- `Dar-Ham-Homework-Lab/backend/Code.gs`: كود الخادم (53KB؛ نسخته قبل التنظيف 45KB في `_backup_before_cleanup`).
- `reports/report.js` (115KB) و`reports/monthly-report.js` (110KB): أكبر ملفات التقارير.
- `core/backupRestore.js`: تصدير/استيراد كل البيانات.

## 4) الملفات الحالية المعتمدة
122 ملفًا مصنَّفة `current` في الجرد (كل ما في المجلدات الحية أعلاه + ملفات الجذر الحية). المصدر المعتمد لكل ملف: **المسار الأصلي خارج أي `_backup_*`**.

## 5) القديمة / الأرشيفية / المتكررة (ما صُنِّف)
| العنصر | الحالة | ملاحظة |
|---|---|---|
| `core/firebase.js`, `core/supabase.js`, `firestore.rules`, `storage.rules` | Legacy، بلا استيراد حي | README يصفها بقايا لنظام سابق. |
| `dualtests/dual-test-play-1.html/.js`, `dual-test-setup-1.js` | نسخة أقدم مكررة (يتيمة) | الحي: الأسماء بلا `-1`. |
| `recitation/*`, `database/recitationDB.js`, `css/recitation.css` | غير مفعّلة | ليست ميزة (قرار المعلم). |
| `Claude outputs/` (15) | مرجعي | `mutashabihatSeed.js` فيه أقدم من الحي؛ صور التقرير مطابقة بصريًا لـ`assets/report`. |
| `assets/_originals_before_optimize/` | أرشيف أصول | 7 صور أصلية ≈ 24MB. |
| `Dar-Ham-Homework-Lab/lab-site.zip` | لقطة 09-25 للمعمل | أقدم من المجلد. |
| `Dar-Ham-Homework-Lab/vendor/*` | نسخ مقتطعة قديمة | `homeworkEngine.js` فيه يفشل checksum. |
| `organize_files.bat` | لم يُشغَّل | انظر PROJECT_STATE §3. |

## 6) اللقطات الاحتياطية (من الأقدم إلى الأحدث، بتوقيت +04)
اللقطات **جزئية** (تحوي فقط الملفات التي كان سيُعدَّل عليها) لا نسخًا كاملة. الفرق = عدد الأسطر المختلفة مقارنةً بالملف الحالي.

| # | المجلد | وقت النسخ | ما احتوته | أبرز الفرق عن الحالي |
|---|---|---|---|---|
| 1 | `_backup_before_homework_integration_2026-09-25` | 09-25 15:35 | app, firebase, i18n, submissionStatus, homework-play, monthly-report, homework-prep, homework-welcome, service-worker | أقدم حالة (عهد Firebase): i18n 167KB مقابل 318KB، homework-prep.js 73KB مقابل 124KB. `firebase.js` و`submissionStatus.js` **مطابقان للحالي** (لم يتغيرا). |
| 2 | `_backup_before_question_header_2026-09-30` | 09-30 20:40 | questionTextRecord, i18n, adultGame, kidsGame | i18n 239KB؛ questionTextRecord 1.7KB→3.9KB. |
| 3 | `_backup_i18n_fix` | 10-01 07:15 | 31 ملفًا (إصلاح ترجمات عبر المنصة) | أكبر لقطة؛ i18n 242KB. فروق dualtests صغيرة (4–8 أسطر). |
| 4 | `_backup_before_usability_2026-10-01` | 10-01 15:37 | teacherAuthGate, app, i18n, version, home.css, report.js, student/* | قبل «فحص سهولة الاستخدام». |
| 5 | `_backup_before_home_2026-10-01` | 10-01 16:11 | splash, app, i18n, version, home.css, homework-prep, student/* | قبل إعادة ترتيب الرئيسية. |
| 6 | `_backup_before_why_quickcard_2026-10-01` | 10-01 16:22 | homeQuickview, splash, i18n, home.css | قبل «لماذا حمٓ؟/نظرة سريعة». `core/i18n.js` فيه **مطابق** لنسخة pause_resume. |
| 7 | `_backup_before_brackets_2026-10-01` | 10-01 17:13 | global.css, home.css, adultGame, homework-play | فروق صغيرة (5–76 سطرًا). |
| 8 | `_backup_before_fast_home_2026-10-01` | 10-01 17:25 | index.html, manifest.json, app, navigation, student.js | `student.js` **مطابق** لنسخة before_home. manifest 533→1059 بايت. |
| 9 | `_backup_before_pause_resume_2026-10-01` | 10-01 18:15 | i18n, adult/kids Game (+html), student.js | قبل زر «حفظ والعودة لاحقًا». |
| 10 | `_backup_before_hw_redesign_2026-10-01` | 10-01 19:44 | i18n, homework-prep.* | قبل إعادة تصميم سجل الواجبات. |
| 11 | `_backup_before_cleanup_2026-10-01` | 10-01 20:45 | homeworkApi, i18n, homework-prep.*, Lab/Code.gs, Lab/gas-emulator | قبل التنظيف التلقائي للواجبات (Code.gs 45KB→53KB). |
| 12 | `_backup_before_one_hero_2026-10-01` | 10-01 22:36 | i18n, homework-prep.* | **الأحدث**: فروقه عن الحالي صغيرة (7–20 سطرًا) ← الأقرب للحالي، قبل زر الواجب الواحد. |

ملاحظة: `_backup_before_one_hero/core/i18n.js` أكبر من الحالي بـ28 بايت (318,116 مقابل 318,088) — أي أن تعديلات 22:36 **حذفت** نصوصًا (متسقة مع تصحيح «دار حمٓ»→«منصة حمٓ»).

## 7) الفروق المهمة بين الإصدارات (من changelog ومقارنة الملفات)
- **قبل 09-25:** نظام الواجبات على Firebase (Firestore + App Check) → توقف المزامنة بسبب App Check/reCAPTCHA (موثَّق في مستندات المشروع).
- **09-25:** دمج نظام الواجبات الجديد (Apps Script + Sheets)؛ `core/api.js`/`homeworkApi.js` يحلّان محل `firebase.js`.
- **09-30:** رأس السؤال ونص التسجيل؛ حذف التسميع الصوتي.
- **10-01 (v1.0.8):** إصلاح ترجمات؛ فحص سهولة؛ إعادة ترتيب الرئيسية؛ «ابدأ هنا»؛ «لماذا حمٓ؟»؛ الصفحة السريعة `homeFast`؛ «حفظ والعودة لاحقًا»؛ إعادة تصميم سجل الواجبات؛ تنظيف الواجبات تلقائيًا (20/14 يومًا)؛ زر الواجب الواحد؛ توحيد الاسم «منصة حمٓ».

## 8) آخر التعديلات المنفذة على الملفات الحية (بتوقيت +04، من تواريخ الملفات)
10-01 22:36: `core/i18n.js`، `settings/homework-prep.html/.js` · ≈22:10: `organize_files.bat` · ≈21:51: `core/homeworkNotifier.js` · ≈20:47: `core/homeworkApi.js`، `reports/hwCertificate.js`، `Dar-Ham-Homework-Lab/backend/Code.gs` · ≈19:31: `games/adultGame.js`، `games/kidsGame.js` · ≈18:15: `student/student.js`.

## 9) القرارات والمشاكل المحلولة
القرارات المعتمدة كلها في `PROJECT_STATE.md` §5. أبرز المشاكل المحلولة: تعطل مزامنة الواجبات (استُبدل Firebase بـApps Script)؛ تشوه النص العربي/الختم عند التصدير (مستند «إصلاح الختم…»)؛ انهيار التحميل بسبب استيراد Storage ثابتًا (حُلّ بالاستيراد الكسول في firebase.js قبل إهماله)؛ خطأ Service Worker «Failed to convert value to 'Response'» (حُدِّثت معالجة fetch).

## 10) ملاحظات يجب معرفتها مستقبلًا
- كل تعليق جديد بالعربية مع 🌟؛ كل نص واجهة في `i18n.js`.
- ارفع `APP_VERSION` و`CACHE_NAME` عند أي تعديل جوهري.
- لا تعتمد على `Dar-Ham-Homework-Lab/vendor/` كمصدر (مقتطع/قديم).
- الاختبارات: `node tests/homeworkEngine.test.js` يدويًا بعد تعديل المحرك؛ اختبارات المعمل: `node tests/backend.test.mjs` داخله.

## 11) الهيكل النظيف المقترح (**لم يُنفَّذ بعد** — مخطط النقل الفعلي وأسبابه في `ORGANIZATION_LOG.md` §3؛ الموجود الآن: `_archive/` فارغ و`Ham_GitHub_Clean/`)
لا يمكن النقل من هذه الجلسة، وتغيير مسارات الحي قد يكسر الاستيراد. المقترح الآمن (يمسّ فقط ما ليس له استيراد حي):
```
_archive/
  backups/            ← نقل 12 مجلد _backup_*  (هذا بالضبط ما يفعله organize_files.bat الموجود، بلا حذف)
  legacy-firebase/    ← firebase.js · supabase.js · firestore.rules · storage.rules   (لا استيراد حي لها)
  duplicates/         ← dualtests/*-1.*
  inactive/           ← recitation/ (+ recitationDB.js وrecitation.css بعد التأكد)
  reference-outputs/  ← Claude outputs/
  original-images/    ← assets/_originals_before_optimize/
labs/Dar-Ham-Homework-Lab/   ← (كان في الجذر)
```
**لا يُعاد تسمية أي مجلد حي** (`core, database, engine…`) لأن كل `import` ومسارات `templateUrl`/`href` تعتمد عليها (مثلًا `dualtests/dual-test-play.html`). مجلد `Claude outputs` (مسافة) هو الوحيد ذو الاسم غير الوصفي ويمكن تسميته `reference-outputs` بأمان لعدم وجود استيراد له.

## 12) المجلدان المضافان (2026-10-02)
- `Ham_GitHub_Clean/` — نسخة نشر: كل الملفات الحية (بايت-ببايت) + `backend/` (Code.gs وappsscript.json من المعمل) + `docs/` (هذان الملفان). بلا أرشيف/نسخ احتياطية/Firebase/Supabase/recitation/dualtests -1/المعمل/Claude outputs/الصور الأصلية.
- `_archive/` — `_backups` · `_old` · `_duplicates` · `_unused` (+ README في كل منها)؛ **فارغة** لحين تنفيذ النقل. لا يُحذف أي منها قبل اختبار الحي والنظيفة ورفعها إلى GitHub.
