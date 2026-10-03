# PROJECT_MASTER.md — ملف تسليم منصة «حمٓ»

> **مرجع شامل لأي وكيل برمجي جديد.** أُنشئ في 2026-10-02 من فحص فعلي للمجلد `D:\المنصة\الاحتياطي\test-test` (قائمة المجلد: 427 ملفًا + 118 مجلدًا؛ قُرئ/فُحص نصيًا نحو 155 ملفًا حيًا). **لم يُعدَّل أي كود ولم يُحذف أي ملف.**
> الحالة الجارية القصيرة في `PROJECT_STATE.md` (تُحدَّث بعد كل مهمة). الهيكل التفصيلي في `PROJECT_MAP.md`، والجرد ببصمات SHA-256 في `PROJECT_INVENTORY.csv`، وما نُقل/لم يُنقل في `ORGANIZATION_LOG.md`.
> **قاعدة التوثيق:** كل معلومة هنا مثبتة من ملف في المشروع، أو مأخوذة من قرارات المعلم المحفوظة في ذاكرة المشروع (تُسمّى «قرار المعلم»). ما لم يثبت: `غير محدد في المشروع`. التعارضات مسجَّلة في §22.

---

## 1. هوية المشروع
| البند | القيمة |
|---|---|
| الاسم الرسمي | «حمٓ» (ميم بعلامة مد U+0653). الظاهر للمستخدم: «منصة حمٓ». كلمة «دار» حُذفت من النصوص الظاهرة (قرار المعلم) |
| الوصف المعتمد | «منصة حمٓ لتثبيت الحفظ و المراجعة» — الشارة «منصة تعليمية متكاملة» — عنوان الرئيسية الآية «حمٓ وَٱلۡكِتَٰبِ ٱلۡمُبِينِ» بخط Lateef |
| الهدف | تحفيظ ومراجعة وتقييم القرآن الكريم: ألعاب تقييم، سجلات طلاب، واجبات منزلية عن بُعد، تقارير PDF/PNG |
| الفئة | معلم/معلمة تحفيظ وطلابه (كبار وأطفال). الطلاب لا يسجلون حسابات |
| الطبيعة | تطبيق ويب SPA خام (HTML/CSS/JS ES Modules، بلا فريمورك ولا build)، Local-first (IndexedDB)، PWA، ثنائي اللغة (ar RTL / en LTR) |
| المنشور | `https://hamem7.github.io/` (GitHub Pages، حسب README و`core/api.js`) |
| كبار مقابل أطفال | **كبار:** `games/adultGame.*` — 12 نوع سؤال، مؤقت 30 دقيقة، ثيم `adult-theme`. **أطفال:** `games/kidsGame.*` — 12 نوع مبسَّط، صوت آيات، خلفيات `assets/kids_bg`، ثيم `kids-theme`، نطاق الأجزاء حتى الجزء 26 (من الأحقاف إلى الناس، قرار المعلم). الشاشة الرئيسية واحدة والتبديل بـ`switchTheme()` |

## 2. الحالة الحالية
- **الإصدار:** `APP_VERSION = '1.0.8'` (`core/version.js`، 2026-10-01). `CHANGELOG` فيه الإصدارات 1.0.0 و1.0.3–1.0.8. `CACHE_NAME = dar-ham-quran-v4`. خادم الواجبات `VERSION = '1.2.0'` (`Code.gs`).
- **مكتمل ويعمل (مثبت بالكود):** الرئيسية + «الدخول السريع» وشريط سفلي؛ إدارة الطلاب؛ ألعاب الكبار والأطفال؛ التقرير الفردي؛ التقرير الشهري + سجل الحفظ الشهري؛ نظام الواجبات الكامل (إنشاء/رابط/حل/تصحيح/شهادة/تنظيف)؛ «علاج الأخطاء»؛ «حفظ والعودة لاحقًا»؛ النسخ الاحتياطي والاستعادة؛ ركن المتشابهات (خريطة + لعبة)؛ الاختبارات الثنائية (إعداد + لعب مباشر + تقرير)؛ مسار التجويد (4 مراحل في الكتالوج + أنشطة + مراجعة).
- **ما زال موسومًا «قيد التطوير» في الواجهة:** بطاقتا «المتشابهات» و«التجويد» (`components/splash.html`). بطاقة «الاختبارات الثنائية» أُزيلت منها الشارة بطلب المعلم.
- **غير مفعّل / يتيم:** `recitation/` (قرار المعلم: ليست ميزة)؛ `core/firebase.js`، `core/supabase.js`، `firestore.rules`، `storage.rules` (Legacy بلا استيراد حي)؛ `dualtests/*-1.*`؛ `engine/masteryEngine.js` (لا يستورده أي ملف).
- **مخطط/غير منفذ:** أفكار عالمية/مسابقات (README)؛ نقل العناصر إلى `_archive/` (لم يُنفَّذ)؛ مشغّل التنظيف اليومي في Apps Script (لم يُتفق على تفعيله).
- **تجريبي:** `Dar-Ham-Homework-Lab/` (Sandbox لخلفية الواجبات، ليس جزءًا من التشغيل)؛ Service Worker «تجربة» منذ 2026-09-14 (`index.html`).
- **اختبارات (شُغّلت في هذا الفحص):** `tests/homeworkEngine.test.js` 14/14 ✅، `tests/memorizationEngine.test.js` 13/13 ✅، `Dar-Ham-Homework-Lab/tests/cleanup.test.mjs` 9/9 ✅. `backend.test.mjs` لم يُشغَّل (يحتاج `vendor/` ولم أنسخه). فحص صياغة `node --check` لكل ملفات JS خارج المعمل: بلا أخطاء. **لم يُشغَّل متصفح** (لا اختبار واجهة/PWA فعلي).

## 3. بنية المشروع
```
test-test/
├─ index.html · manifest.json · service-worker.js · privacy.html · README.md · kids-bg.jpg   حيّ (الجذر)
├─ PROJECT_MASTER.md · PROJECT_STATE.md · PROJECT_MAP.md · PROJECT_INVENTORY.csv · ORGANIZATION_LOG.md   وثائق
├─ core/  components/  css/  database/(+data/)  engine/  games/  reports/  settings/          حيّ — قلب المنصة
├─ student/  similarities/  tajweed/  dualtests/  tests/  assets/  icons/                      حيّ
├─ recitation/                           غير مفعّل
├─ firestore.rules · storage.rules       Legacy (Firebase)
├─ Dar-Ham-Homework-Lab/                 معمل + الخادم المعتمد backend/Code.gs
├─ Ham_GitHub_Clean/                     نسخة نشر نظيفة (126 ملفًا) — لا تُعدَّل يدويًا بمعزل عن الحي
├─ _archive/                             هيكل فارغ (لم يُنقل إليه شيء)
├─ Claude outputs/ · assets/_originals_before_optimize/ · _backup_* (12)   مرجعي/أرشيفي — لا استيراد حي
└─ organize_files.bat                    سكربت لم يُشغَّل
```
| المجلد | وظيفته |
|---|---|
| `core/` | الإقلاع والتوجيه (`app.js`)، الترجمة (`i18n.js`)، التنقل (`navigation.js`)، الإصدار (`version.js`)، طبقة الخادم (`api.js`, `homeworkApi.js`)، طوابير الإرسال (`submitQueue.js`)، إشعار التسليمات (`homeworkNotifier.js`)، نسخ احتياطي (`backupRestore.js`)، `analytics.js`, `escape.js`, `langBridge.js`, `quranTextUtils.js`, `studentCleanup.js`, `homeworkRecords.js`, `submissionStatus.js` |
| `database/` | IndexedDB: مدير + تهيئة لكل كيان. `data/mutashabihatSeed.js` (~300KB) بيانات المتشابهات |
| `engine/` | منطق خالص بلا DOM غالبًا: `quranEngine` (توليد الأسئلة)، `kidsEngine`، `homeworkEngine`، `dualTestEngine`، `similarityEngine`، `tajweedEngine`+`tajweedRulesCatalog`، `memorizationEngine`، `reviewParts` |
| `components/` | شاشات/نوافذ مشتركة: `splash.html` (الرئيسية)، `homeFast`, `homeQuickview`, `teacherAuthGate`, `teacherProfile`, `pausedSession`, `fixErrorsPrompt`, الحفظ الشهري، `sectionHint`, `welcomeBanner`, `ui` |
| `games/` · `student/` · `settings/` · `reports/` | اللعب · الطلاب · لوحة المعلم والواجبات · التقارير |
| `similarities/` · `tajweed/` · `dualtests/` | الأقسام الثلاثة المستقلة (كل منها html+js، وCSS خاص) |

## 4. خريطة الملفات المهمة
| الملف | المسار | الوظيفة | يعتمد عليه/يعتمد على | ملاحظات |
|---|---|---|---|---|
| index.html | `/` | قالب وحيد: ترويسة، نوافذ ثابتة، `<script type=module src=core/app.js>`، تسجيل SW، GoatCounter، GSI | كل CSS الحي | عنوان الصفحة ما زال «أبطال القرآن» (§22) |
| app.js | `core/` | `AppState`، فتح 10 قواعد IndexedDB، الإقلاع `bootSystem`، مسار `?hw=` السريع، شاشة فشل الإقلاع، تذكير النسخ الاحتياطي | يستورد كل DBs/المحركات/المكونات | 53KB — نقطة الدخول |
| i18n.js | `core/` | `translations.ar/.en` + `t()/tf()/applyLanguage()/toggleLanguage()` + توطين الأسماء | الجميع يستورده | 318KB. كل نص واجهة جديد هنا |
| navigation.js | `core/` | `loadScreen({templateUrl,initFunction})` يجلب html ويحقنه في `#app-root` | app.js، analytics | `cache:'no-store'` |
| api.js | `core/` | **طبقة الاتصال الوحيدة بخادم الواجبات** + جلسة جوجل (لا مفتاح معلم منذ 2026-10-03) | homeworkApi، teacherAuthGate | يحوي `DEFAULT_API_URL` و`GOOGLE_CLIENT_ID` |
| homeworkApi.js | `core/` | واجهات عالية المستوى (نشر، تسليمات، تصحيح) | api.js | بعض الدوال stubs فارغة للتوافق |
| submitQueue.js | `core/` | طابور إرسال تسليم الطالب بإعادة محاولة ومعرّف ثابت | homework-play | نسخة أخرى مستقلة في المعمل |
| backupRestore.js | `core/` | تصدير/استيراد كل IndexedDB + مفاتيح localStorage الخاصة بالطلاب | — | صيغة `format: darham_backup` |
| version.js | `core/` | `APP_VERSION` + `CHANGELOG` ثنائي اللغة (ليس في i18n عمدًا) | app.js | يُرفع مع كل تحديث |
| quranEngine.js | `engine/` | نص الآيات، الصفحات، النطاقات، 13 دالة `generate*Game` | quranDB، i18n | 60KB؛ يشمل «Range Engine» |
| homeworkEngine.js | `engine/` | توليد أسئلة الواجب (11 مولِّد) | quranEngine | اختبار: `tests/homeworkEngine.test.js` |
| homework-prep.js/.html | `settings/` | إنشاء الواجب، السجل، غرفة التصحيح، النتائج النهائية، التنظيف | api، engine، hwCertificate | **أضخم ملف (125KB، 1851 سطرًا)** |
| Code.gs | `Dar-Ham-Homework-Lab/backend/` | الخادم المعتمد (Apps Script) | Sheets | المصدر الوحيد للخادم؛ نسخة منه في `Ham_GitHub_Clean/backend/` |
| report.js / monthly-report.js | `reports/` | التقرير الفردي (115KB) / الشهري (110KB) | html2canvas، jsPDF | تحميل كسول من cdnjs |
| splash.html + homeFast.js | `components/` | الرئيسية + الدخول السريع/الشريط السفلي/`?go=` | CSS home*, i18n | — |
| student.js | `student/` | إدارة الطلاب كاملة (78KB) | studentDB | — |

## 5. Architecture
| الطبقة | المحتوى | الاتصال |
|---|---|---|
| Frontend | SPA: `index.html` + `#app-root`؛ كل شاشة = `*.html` جزئي يُحقن + `init*()` | `loadScreen` |
| Core | `AppState` (كائن عام يحمل المديرين والمحركات والطالب الحالي ووضع الأطفال) | يُستورد من `core/app.js` |
| UI | CSS معزول لكل قسم (`home.css`, `homeFast.css`, `kids.css`, `adults.css`, `tajweed.css`, `similarities.css`, `teacherAuthGate.css`, `welcomeBanner.css`, `sectionHint.css`)؛ مكونات تحقن CSS خاصًا بادئته `dh-…` | — |
| Data/Database | 11 قاعدة IndexedDB (§15) + `localStorage` للسجل والإعدادات | `database/*Manager` |
| Engines | منطق خالص: توليد أسئلة، حساب نتائج/إتقان | تُنشأ في `bootSystem` |
| Storage الخارجي | Google Sheets (3 أوراق) خلف Apps Script | `core/api.js` فقط |
| APIs خارجية | alquran.cloud (نص)، islamic.network (صوت)، android.quran.com (صور صفحات)، Google Identity/tokeninfo، GoatCounter، Google Fonts، cdnjs | §18 |
| لا يوجد Backend آخر | لا Firebase/Supabase فعّال | §20 |
تدفق البيانات: الطالب/المعلم ⇄ IndexedDB محلي دائمًا؛ **الواجبات فقط** تُنشر وتُستلم عبر Apps Script، ثم يُنسخ المعتمَد محليًا إلى سجل الطالب (`core/homeworkRecords.js`).

## 6. تدفق التشغيل
1. `index.html` يحمّل CSS + `core/app.js` (module) + يسجّل `service-worker.js` عند `load`.
2. `bootSystem()` (app.js): ربط زر الرئيسية → **فرع الطالب السريع** إن وُجد `?hw=` (ثيم كبار، `resumeAllPendingSubmissions`، تحميل `student/homework-welcome` فورًا بلا تنزيل القرآن) ثم `return`.
3. إقلاع المعلم: طلب إذن الإشعارات → `ensureQuranLoaded()` (يجلب 114 سورة من alquran.cloud مرة واحدة ويخزنها) → إنشاء `QuranEngine/KidsEngine` → فتح `kidsAudio`, `students`, `homeworks`, `teacher`, `reviewSchedule`, `dualTests`, `similarities`(+seed), `tajweed`, `monthlyMemorization` → `startHomeworkSubmissionWatcher()`.
4. `loadSplashScreen()` (الرئيسية) ← `homeFast` (بحث طلاب، «تابع من حيث توقفت»، شريط سفلي، `?go=`) + `homeQuickview` («نظرة سريعة»).
5. بعدها: فحص الحفظ الشهري التلقائي، «الجديد في هذا التحديث»، تذكير النسخ الاحتياطي الشهري، تلميح الترحيب.
6. أي فشل إقلاع ← `showBootFailure` (رسالة + إعادة محاولة؛ `QURAN_LOAD_FAILED` لأول تشغيل بلا إنترنت).

## 7. نظام التنقل
- **لا Router بعناوين**: التنقل = `loadScreen(route)` + دوال `open*` في `core/app.js`. الشاشة الحالية في `document.body.dataset.dhScreen` وحدث `dh:screen`.
- **الشاشات (templateUrl):** `components/splash.html` (رئيسية) · `student/login.html` (اختيار الطالب) · `settings/dashboard.html` (إعداد التقييم) · `games/adultGame.html` / `games/kidsGame.html` · `reports/report.html` · `student/my-students.html` / `all-students.html` / `student-profile.html` · `settings/homework-prep.html` · `student/homework-welcome.html` → `games/homework-play.html` · `dualtests/dual-test-setup.html` → `dual-test-play.html` · `similarities/similarities-home.html` → `similarities-play.html` · `tajweed/tajweed-map.html` → `tajweed-activity.html`.
- **بطاقات الرئيسية (الترتيب المعتمد):** طلابي – الكبار – الأطفال | الواجبات المنزلية – الاختبارات الثنائية | المتشابهات – التجويد. «ابدأ هنا ➕ أضف أول طالب» عند صفر طلاب. «لماذا حمٓ؟» 4 بطاقات.
- **الشريط السفلي** (`homeFast.js`): الرئيسية · طلابي · اختبار (الوسط، يركّز البحث) · الواجبات (شارة جديد) · ثنائي.
- **روابط خاصة:** `?hw=<HW_id>` (واجب الطالب)؛ `?go=students|homework|dual|evaluate` (اختصارات PWA في `manifest.json`، تُستهلك مرة واحدة)؛ `?api=` مقبول على الإنتاج فقط إن طابق `DEFAULT_API_URL`.
- **صلاحيات المسارات:** لا يوجد حجب مسارات. شاشة الواجبات تستدعي `ensureHomeworkSignIn()` (بوابة جوجل). شاشات الطالب عبر `?hw=` لا تحتاج دخولًا. بقية الشاشات مفتوحة لمن يفتح المنصة على هذا الجهاز.

## 8. نظام الطلاب
| الجانب | الواقع في الكود |
|---|---|
| الإنشاء | نافذة إضافة (`student.js`): **الاسم وحده إلزامي** (قرار المعلم)، الباقي اختياري (منه `memoFrom/memoTo`). الاختيار للتقييم يقترح الأسماء أثناء الكتابة |
| التخزين | `DarHamStudents.students` (keyPath `id` autoIncrement)؛ عدّادات `totalScore/totalAttempts/totalCorrect`؛ حقول اختيارية: `isHidden`, `pausedEvaluation`, `resolvedWeaknesses`، نقاط الضعف |
| التعديل | نافذة تعديل؛ `updateStudent` |
| الإخفاء | `isHidden` (يظهر باهتًا في «كل الطلاب»، ويُستثنى من الاقتراحات) |
| الحذف | `deleteStudentAction` ← `studentManager.deleteStudent` + `purgeStudentRelatedData` (يحذف سجلات `studentId` من 8 مخازن) + `history_<id>` + صورة الطالب. **مباريات الثنائي تبقى** (تخص طالبين) |
| سجل الأداء | `localStorage['history_<studentId>']` (مصدر التقارير) + `darham_avatar_<id>` للصورة |
| استئناف التقدم | «تابع من حيث توقفت» (`dh_last_evaluation`، يُغلق بـ✕)؛ «حفظ والعودة لاحقًا» داخل `student.pausedEvaluation`؛ «علاج الأخطاء» مرة يوميًا لكل طالب |
| التقارير | فردي، شهري، ثنائي، شهادة واجب (§12) |

## 9. محرك القرآن والبيانات القرآنية
- **المصدر الفعلي:** `https://api.alquran.cloud/v1/quran/quran-uthmani` — يُجلب مرة واحدة، يُتحقق أنه 114 سورة، ويُخزَّن في `DarHamDatabase.quran` (keyPath `number`). **لا يوجد نص قرآن مضمَّن في المشروع** (باستثناء بيانات المتشابهات والأمثلة).
- **العرض:** `toQuranicSukun()` يحوّل السكون U+0652 إلى U+06E1؛ `cleanAyahText`, `normalizeForCompare`, `splitAyahWords/Tokens`, `isWaqfMark`, `realWordIndexes` (علامات الوقف ليست كلمات) في `quranEngine.js`.
- **الوصول للآيات:** `getSurah`, `getAllSurahsList`, `getAyahsByJuz`, `getAyahsInRange(surah,start,end)`, `getAyahsBySurahRange(from,to)`, `getAllAyahsOnPage`. **«Range Engine»** = هذه الدوال + وضع `range` في `settings/dashboard.js` (من سورة إلى سورة) و`pickTargetAyah(pool, chunkIndex, totalChunks)`.
- **صفحات المصحف:** لعبة `visual_memory` تعرض صورتي الصفحتين من `android.quran.com/data/width_1024/pageNNN.png` (604 صفحة؛ فردي=يمين).
- **الصوت:** `database/kidsAudioDB.js` + `engine/kidsEngine.js` — `cdn.islamic.network/quran/audio/<bitrate>/<reciter>/<ayahNumber>.mp3` (ترقيم alquran.cloud؛ `ar.abdulbasitmurattal` 64kbps في kidsEngine).
- **قواعد خاصة:** ربط عمودين: لا تقف إجابة صحيحة أمام أختها في نفس الصف (`arrangeEndsNotFacing`)؛ ركن الأطفال: أجزاء حتى 26؛ `core/quranTextUtils.js` للمتشابهات والتجويد.
- **لا يوجد ملف بيانات صفحات/مصحف محلي** — `غير محدد في المشروع` أي تخزين لصور الصفحات.

## 10. الألعاب والأنشطة
| اللعبة | الهدف | العمل | مدخلات → مخرجات | الملفات |
|---|---|---|---|---|
| **كبار (12):** `catch` `next` `previous` `between` `guess_surah` `recite` `mistake` `complete_ayah` `order` `visual_memory` `link_ends` `link_word_surah` | تقييم حفظ ومراجعة | «كيس مخلوط» لأنواع تُفحَص بـ`probeGameType` قبل الإدراج؛ مؤقت 30 د | نطاق (سورة/جزء/مدى) + عدد أسئلة 5–50 → نتيجة + سجل `history_<id>` + نقاط ضعف | `games/adultGame.*`, `quranEngine.js`, `settings/dashboard.*` |
| **أطفال (12):** `kids_catch` `kids_next` `kids_tf` `kids_guess_surah` `kids_recite` `kids_word_order` `kids_start_surah` `kids_extra_word` `kids_previous` `kids_link_ends` `kids_link_word_surah` `kids_listen_ayah` | نفس الغرض بتبسيط وصوت | كما سبق؛ عدد 5–30 | نفس المخرجات | `games/kidsGame.*`, `kidsEngine.js` |
| الواجب المنزلي | حل واجب عن بُعد | أسئلة: `mcq`, `checkbox`, `dropdown`, `dual_dropdown`, `written_blank`, `write_3_ayahs`, `matrix_order`, `matching` (مولِّدات: `mcq_surah/next/prev`, `ayah_ending`, `intruder_word`…) | رابط `?hw=` → تسليم | `games/homework-play.*`, `homeworkEngine.js` |
| المتشابهات | مقارنة/لعب آيات متشابهة (آخر 5 أجزاء: 4 داخلية + عمّ) | تصفح بالجزء/السورة + لعبة على نطاق scope | seed → لعب | `similarities/*`, `similarityEngine.js`, `similaritiesDB.js` |
| التجويد | مسار مراحل: `qalqalah`, `meem_noon_mushaddadah`, `meem_sakinah`, `noon_sakinah` | خريطة بقفل/فتح مراحل، شارات إتقان، أنشطة مُقيَّمة (اكتشف الحكم، اربط الحكم بحروفه، تحدي المرحلة…)، بوابة مراجعة | اختيار طالب → إتقان/جلسات/أوسمة | `tajweed/*`, `tajweedEngine.js`, `tajweedRulesCatalog.js`, `tajweedDB.js` |
| الاختبارات الثنائية | مواجهة بين طالبين (Best of 3) | معالج 3 خطوات؛ كل سؤال 10 درجات، كل خطأ −0.5 (حد أدنى 0)، مساعدة مجانية لكل جولة، إيقاف مؤقت للمباراة | اختبار محفوظ + متسابقان → مباراة + تقرير | `dualtests/dual-test-{setup,play}.*`, `dualTestEngine.js`, `dualTestsDB.js` |
| علاج الأخطاء | إصلاح الأخطاء السابقة | بطاقة يومية؛ الخطأ يُثبَّت بإجابتين صحيحتين في زيارتين مختلفتين | نقاط الضعف → جلسة | `components/fixErrorsPrompt.js` |

## 11. نظام التسميع والأخطاء
- **التسميع:** سؤال `recite`/`kids_recite` (`generateReciteGame`) يعرض مقطعًا؛ المعلم يسجّل ملاحظة/خطأ يدويًا (`components/questionTextRecord.js`). **حُذف** صندوق «موضع الخطأ بالتحديد» (`reciteRangePicker.js` ما زال مستوردًا في adult/kids لكنه خارج الواجهة بقرار 10-01 — انظر §22) وحُذف `audio_record` من الواجب (09-30).
- **تسجيل الأخطاء:** أنواع الأخطاء + مؤقت لكل سؤال (`timeTaken`)؛ `localizeErrorTypes` للتوطين. النتائج ← `history_<id>` ونقاط ضعف ضمن سجل الطالب؛ المُصحَّحة تذهب لـ`resolvedWeaknesses`.
- **الإيقاف:** «⏸️ حفظ والعودة لاحقًا» (`pausedSession.js`): لقطة صغيرة في `student.pausedEvaluation` (config، طابور الأنواع، المؤشر، `reportDetails`)، اختبار معلّق واحد لكل طالب، بلا مدة صلاحية، يرتبط بالقسم (كبار/أطفال)، المؤقت يبدأ من جديد عند الاستكمال.
- **المراجعة المتباعدة:** `reviewScheduleDB.review_schedule` (مفتاح `studentId`) + `tajweed_rule_review` لكل (طالب×حكم).

## 12. التقارير
| التقرير | الملفات | البيانات | التصدير |
|---|---|---|---|
| تقييم فردي | `reports/report.{html,js,styles.js}` | نتيجة الجلسة + ملف المعلم (اسم/صورة/ختم) + صور `assets/report/*` | PNG/PDF عبر html2canvas + jsPDF |
| إنجاز شهري | `monthly-report.{js,identity.js,styles.js}` + مكوّنات الحفظ الشهري | `history_<id>` + `monthly_memorization` + الواجبات المعتمدة | PNG/PDF |
| مواجهة ثنائية | `dual-test-report.{js,styles.js}` | مباراة + اختبار | PNG/PDF |
| شهادة واجب | `hwCertificate.js` | تسليم معتمد + ملاحظة المعلم الاختيارية | صورة؛ واتساب عبر `wa.me/?text=` **نص فقط — المرفق يدوي** |
- المكتبات تُحمَّل عند الحاجة من cdnjs (`html2canvas 1.4.1`, `jspdf 2.5.1`). سجل التصدير `darham_reports_log`, `darham_reports_done`.
- قيود: يحتاج إنترنت لأول تحميل المكتبات؛ إصلاح تشوّه العربية/الختم عند التصدير موثّق في مستندات المشروع (`claude/إصلاح-الختم…`) — لم أتحقق منه في المتصفح.

## 13. نظام الواجبات المنزلية
| الخطوة | التنفيذ |
|---|---|
| إنشاء | `settings/homework-prep.*`: نوع (تلقائي/يدوي)، طالب مستهدف اختياري، نطاق آيات، `generateQuestions` أو `openQuestionBuilderModal`، مسودة/نشر. الحد الأقصى 60 سؤالًا، 300 واجب لكل معلم، 3000 إجمالًا |
| رابط الطالب | `<origin+pathname>?hw=<id>`؛ المعرّف عشوائي (`HW_` + UUID بلا شرطات)؛ مشاركة عبر `wa.me/?text=` |
| عرض الواجب | `getHomework` عام **بلا الإجابات الصحيحة** (`safeQuestion_`) |
| الإجابات/الإرسال | `games/homework-play.js`: مسودة تلقائية محلية، `core/submitQueue.js` (معرّف `clientSubmissionId` ثابت، إعادة محاولة، `online` event)؛ الخادم **idempotent** ولا يعتبر النجاح إلا بـ`persisted:true` |
| التصحيح | إلكتروني تلقائي لما عدا النص الحر؛ **أي نص يكتبه الطالب = تصحيح يدوي** (قرار المعلم) في «غرفة التصحيح» (`openGradingRoom`) ثم `gradeSubmission` (مع `expectedVersion` وملاحظة معلم اختيارية تظهر في الشهادة) |
| حفظ النتيجة | `recordApprovedResult` ← `history_<id>` (ويُنشئ طالبًا محليًا عند عدم التطابق `createLocalStudent`) |
| التنبيه | `homeworkNotifier.js` يفحص دوريًا التسليمات الجديدة (صوت + شارة) |
| Backend | **Google Apps Script Web App + Google Sheets (تخزين فقط)**: `Dar-Ham-Homework-Lab/backend/Code.gs`. أوراق: `Homeworks`, `Submissions`, `Teachers`. سجل JSON مقسّم chunks (45000 حرف × 8). إجراءات: `ping`, `getHomework`, `submit` (عامة) · `googleSignIn` · `authCheck`, `createHomework`, `listHomeworks`, `getHomeworkFull`, `setHomeworkStatus`, `listSubmissions`, `gradeSubmission`, `voidSubmission` (معلم). الطلبات `POST text/plain` بلا preflight |
| التنظيف | `computeCleanup_`: معتمَد بالكامل → حذف بعد **20 يومًا**؛ لا تسليمات → بعد 14 يومًا؛ غير مصحّح → لا يُحذف + تنبيه للمعلم بعد 14 يومًا (`hw_stale_notified`). الدوال `previewCleanup`, `dailyCleanup`, `installCleanupTrigger`, `removeCleanupTrigger` **موجودة في الكود**؛ هل المشغّل مفعّل فعليًا على الخادم: `غير محدد في المشروع` (القرار: لم يُتفق على آلية التشغيل اليومي، ولا يُفعَّل إلا بطلب صريح) |
| المصادقة | §14 |
- الخدمة الفعلية = Sheets عبر Apps Script (Firebase كانت الفكرة الأولى ثم تُركت — قرار المعلم). `Dar-Ham-Homework-Lab/` معمل التجربة، ونتائجه مدموجة عبر `core/api.js`.

## 14. المصادقة والصلاحيات
| الجهة | الطريقة |
|---|---|
| المعلم (أساسية) | **Google Sign-In** (GSI من `index.html`) عبر `components/teacherAuthGate.js` ← `googleSignIn` ← الخادم يتحقق من `id_token` عبر `oauth2.googleapis.com/tokeninfo` (iss، aud = Client ID، `email_verified`) ← يُصدر `{userId, sessionKey}` (عشوائي 24 خانة) يُحفظ في localStorage (`dh_hw_teacher_userid`, `dh_hw_teacher_sessionkey`) |
| النطاق | **جوجل لنظام الواجبات فقط** (قرار 2026-10-03): البوابة تُستدعى من `openHomeworkPrep` ونشر واجب في `settings/homework-prep.js` فقط. المنصة الأساسية (الطلاب، الحفظ، المراجعة، الألعاب، الاختبارات، التجويد، التقارير ومنها التقرير الشهري) لا تطلب أي دخول؛ التقرير الشهري يعرض نتائج الواجبات فقط لو وُجدت جلسة، وإلا يتخطاها بملاحظة |
| قرار التسجيل | **مفتوح**: أي حساب جوجل بريده موثَّق يُسجَّل معلمًا تلقائيًا. **لا قائمة بيضاء** — حُذفت `TEACHER_EMAILS` من الكود (2026-10-03، كانت مصدر رسالة «هذا البريد غير مسموح له بدخول شاشة المعلم») و`setup()` يمسح الخاصية لو بقيت. كل معلم يرى واجباته فقط (`ownerId` داخل JSON السجل) |
| مفتاح المعلم | **أُلغي نهائيًا (2026-10-03)**: لا `TEACHER_KEY` ولا `teacherKey` ولا `migrateLegacyKey` ولا قفل محاولات؛ الواجهة تمسح `dh_hw_teacher_key` القديم من localStorage. الواجبات القديمة بلا `ownerId` **لم تُحذف**: تبقى لمالك `LEGACY_OWNER_USERID` (لو ضُبط سابقًا)، أو يضبطه مالك السكربت من المحرّر بـ`assignLegacyHomeworksToEmail('email')` |
| الطالب | **بلا حساب**؛ يكفي الرابط. الاسم يُدخله بنفسه |
| الإعدادات الأخرى | `dh_hw_api_url`؛ `?api=` مرفوض إلا لـ`DEFAULT_API_URL` (على localhost يُسمح بأي Apps Script/محاكٍ) |
| الحماية المحلية | لا قفل على المنصة نفسها (لا PIN)؛ البيانات على جهاز المعلم |
- **نقاط أمنية (لم تُغيَّر):** (1) `SPREADSHEET_ID` و`DEFAULT_API_URL` و`GOOGLE_CLIENT_ID` مكتوبة في الكود (علنية بطبيعتها؛ السلامة تعتمد على بقاء الشيت خاصًا وعلى Authorized origins). (2) `submit` عام بلا مصادقة (حد 500 تسليم لكل واجب، 300000 حرف للطلب). (3) نص القرآن/الأسماء تُحقن عبر `esc()` من `core/escape.js` — حافظ على استخدامه. (4) `firestore.rules` مغلقة بالكامل (`if false`). (5) رقم واتساب شخصي ظاهر في فوتر `splash.html`.

## 15. التخزين وقواعد البيانات
| Storage | ماذا يخزن | أين | مفتاح/معرّف | الوصول |
|---|---|---|---|---|
| IDB `DarHamStudents` v1 | الطلاب | store `students` | `id` auto | `StudentManager` |
| IDB `DarHamHomeworks` v2 | واجبات محلية + تسليمات | `homeworks`, `submissions` | `id` | `HomeworkManager` |
| IDB `DarHamTeacher` v1 | ملف المعلم (اسم/صورة/ميلاد/ختم) | `profile` | `'main'` | `TeacherManager` |
| IDB `DarHamDatabase` v1 | نص القرآن | `quran` | `number` | `ensureQuranLoaded` |
| IDB `DarHamKidsAudio` v1 | صوت آيات الأطفال | `KIDS_AUDIO_STORE` | `number` | `KidsAudioManager` |
| IDB `DarHamReviewSchedule` v2 | مراجعة متباعدة | `review_schedule`(studentId), `tajweed_rule_review`(auto) | — | `ReviewScheduleManager` |
| IDB `DarHamDualTests` v3 | اختبارات/مباريات/أوسمة | 3 مخازن | `id` auto | `DualTestsManager` |
| IDB `DarHamSimilarities` v2 | المتشابهات + meta للـseed | `SIMILARITIES_STORE` | `id` auto | `SimilaritiesManager` |
| IDB `DarHamTajweed` v1 | إتقان/جلسات/أوسمة | `tajweed_rule_mastery`, `tajweed_sessions`, `tajweed_achievements` | `id` auto | `TajweedManager` |
| IDB `DarHamMonthlyMemorization` v1 | سجل الحفظ الشهري (طالب×شهر 1–12، `locked`) | `monthly_memorization` | `id` auto | `MonthlyMemorizationManager` |
| IDB `DarHamRecitation` v1 | جلسات تسميع (**غير مفعّلة**) | `recitation_sessions` | `id` auto | `recitationDB.js` (لا يستورده app.js) |
| localStorage | `history_<studentId>`، `darham_avatar_<id>`، `darham_teacher_name/_signature` (قديم)، `app_lang`، `dh_last_seen_version`، `dh_last_backup_at`، `dh_last_backup_reminder_month`، `dh_hw_teacher_userid/_sessionkey` (و`dh_hw_teacher_key` يُمسح تلقائيًا)، `dh_hw_api_url`، `dh_hw_notif_seen_ids`، `dh_hw_new_count`، `hw_stale_notified`، `dh_last_evaluation(_dismissed)`، `dh_fixp_last_handled`، `dh_seen_section_hints`، `darham_reports_log/_done`، `darham_mr_note_tone`، `darham_memo_reminder_last_month`، `darham_monthly_memo_bulk_last_auto_shown`، `dh_pwa_install_event_sent`، `dh_hw_probe` + مسودات/طوابير الإرسال | المتصفح | مفاتيح نصية | مباشر |
| Google Sheets | `Homeworks`, `Submissions`, `Teachers` | حساب المعلم (Apps Script) | `HW_…`, `clientSubmissionId`, `userId/googleSub` | `core/api.js` |
- النسخ الاحتياطي (`backupRestore.js`) يشمل كل IDB + مفاتيح localStorage الخاصة بالطلاب فقط (لا اللغة ولا التلميحات).

## 16. PWA والتثبيت
- **manifest.json:** standalone، `theme_color #064e3b`، أيقونتان 192/512، 4 shortcuts (`?go=`). الاسم: «منصة حمٓ - ألعاب القرآن».
- **service-worker.js:** `install`→`skipWaiting`، `activate`→`clients.claim`، `fetch`: يتدخل فقط في GET من نفس النطاق (`fetch` ثم `caches.match` ثم `Response.error()`). **لا يوجد أي `cache.put/caches.open`** — أي لا تخزين مسبق ولا Offline حقيقي للملفات (§22). `CACHE_NAME` غير مستعمل فعليًا للتخزين.
- **التسجيل:** `index.html` عند `load`. تجربة بطلب المعلم منذ 2026-09-14؛ إن ظهرت نسخ قديمة أثناء التطوير: ارفع `CACHE_NAME` أو عطّل التسجيل مؤقتًا (تعليمات داخل index.html). `navigation.js` يجلب الشاشات بـ`cache:'no-store'`.
- **التحديث:** لا آلية تحديث للـSW؛ «الجديد في هذا التحديث» يقارن `APP_VERSION` بآخر نسخة رآها المعلم (localStorage).
- **Offline فعليًا:** نص القرآن المخزَّن محليًا بعد أول تحميل يعمل دون إنترنت للألعاب، لكن صفحات الواجهة نفسها تعتمد على الشبكة/كاش المتصفح العادي.

## 17. التصميم وواجهة المستخدم
- **الألوان:** رموز في `css/home.css :root`: `--dh-emerald-900 #06231c`, `-800 #0b3d30`, `-700 #0d5c46`, `-600 #147c5e`, `--dh-gold-500 #d4af37`, `--dh-gold-300 #f0d878`, `--dh-surface #fffdf6`, `--dh-ink #10241c`. **لا يوجد رمز باسم `--dh-emerald` أو `--dh-gold` بلا لاحقة** (تعليمات المشروع تذكرها بهذا الاسم؛ المكونات تستعملها كـ`var(--dh-emerald, #047857)` مع قيمة احتياطية) — راجع §22. `theme-color` الـPWA `#064e3b`.
- **الخطوط:** IBM Plex Sans Arabic (الواجهة)، Amiri / Amiri Quran (نص الآيات)، Lateef (عنوان الرئيسية)؛ كلها من Google Fonts.
- **CSS الرئيسي:** `global.css` (عام) · `home.css` (الرئيسية/الترويسة) · `homeFast.css` (الدخول السريع) · `kids.css` / `adults.css` (الثيمان) · وملفات معزولة لكل قسم. المكونات الديناميكية تحقن CSS ببادئة `dh-…` (مثل `dh-pause-`).
- **قواعد يجب عدم كسرها:** لا تعدّل قواعد مشتركة؛ اعزل بادئة جديدة. كل نص جديد في `core/i18n.js` بلغتين (`data-i18n`؛ لا تضع `data-i18n` على زر يحوي SVG — ضعه على `<span>` داخله لأن `applyLanguage` يستبدل innerHTML). تعليقات عربية مفصلة وعلامة 🌟 للإضافات. بيانات اختيارية لا تُطلب إلا عند الاستخدام.
- **Responsive:** `viewport` مضبوط؛ الشريط السفلي والترويسة المنزلقة للشاشات الأساسية؛ جداول `data-label` للهاتف. لم أختبر على جهاز فعلي.

## 18. التكاملات الخارجية
| الخدمة | الغرض | أين | الملف | الحالة |
|---|---|---|---|---|
| Google Apps Script `/exec` | خادم الواجبات | الواجبات | `core/api.js` (`DEFAULT_API_URL`) | **فعّال** (منشور 2026-09-25 حسب README المعمل) |
| Google Sheets | تخزين الواجبات | الخادم | `Code.gs` (`SPREADSHEET_ID`) | فعّال |
| Google Identity Services + tokeninfo | دخول المعلم | البوابة والخادم | `index.html`, `teacherAuthGate.js`, `Code.gs` | فعّال |
| alquran.cloud | نص القرآن العثماني | أول إقلاع | `database/quranDB.js` | فعّال (حرج لأول تشغيل) |
| cdn.islamic.network | صوت الآيات | الأطفال/التجويد | `kidsAudioDB.js`, `kidsEngine.js` | فعّال |
| android.quran.com | صور صفحات المصحف | `visual_memory` | `quranEngine.js` | فعّال |
| GoatCounter (`dar-ham.goatcounter.com`) | تحليلات زيارات بلا بيانات شخصية | كل شاشة | `index.html`, `core/analytics.js` | فعّال |
| Google Fonts | الخطوط | CSS/تقارير | `index.html`, `home.css`, `monthly-report.identity.js` | فعّال |
| cdnjs | html2canvas, jsPDF | التقارير | `reports/*.js` | فعّال عند التصدير |
| WhatsApp `wa.me` | مشاركة رابط/شهادة (نص فقط) | الواجبات/الفوتر | `homework-prep.js`, `hwCertificate.js`, `splash.html` | فعّال |
| Firebase (Firestore/Storage/App Check/reCAPTCHA) | نظام واجبات قديم | — | `core/firebase.js`, rules | **متروك، بلا استيراد** |
| Supabase | تجربة بديلة | — | `core/supabase.js` | **متروك** (مفتاح placeholder) |

## 19. الاعتماديات
لا `package.json` للمنصة (المعمل فقط: `{"type":"module"}`). لا npm. المكتبات الخارجية: html2canvas 1.4.1 وjsPDF 2.5.1 (cdnjs، كسول)، GSI (Google)، GoatCounter (`gc.zgo.at`)، Google Fonts. اختبارات: Node (بلا مكتبات)؛ `e2e.py` للمعمل يحتاج Python (+ متصفح) — لم يُشغَّل.

## 20. القرارات الهندسية (لا تُغيَّر دون الرجوع للمعلم)
1. HTML/CSS/JS خام + ES Modules، بلا فريمورك ولا مكتبة جديدة؛ حلول المتصفح المدمجة أولًا (مثل `Intl` للتقويم الهجري).
2. Local-first: IndexedDB لكل كيان؛ البيانات الكبيرة (صور) في IDB لا localStorage؛ **localStorage القديم يبقى خط رجوع** عند استبدال نظام أحدث.
3. الواجبات: Apps Script + Sheets بدل Firebase (Firestore مغلقة). كل طلب `text/plain`. لا نجاح بلا `persisted:true`. مفتاح المعلم **أُلغي نهائيًا** (2026-10-03) — الدخول لنظام الواجبات بجوجل فقط، والمنصة الأساسية بلا أي دخول.
4. تسجيل المعلمين مفتوح ببريد جوجل موثّق؛ الطالب بلا حساب.
5. تصحيح الواجب: نص يكتبه الطالب = يدوي، غيره إلكتروني. `audio_record` محذوف من التوليد.
6. «علاج الأخطاء»: بطاقة مرة يوميًا لكل طالب؛ التثبيت بإجابتين صحيحتين في زيارتين مختلفتين؛ خطأ الترتيب/التلميح يُعالَج.
7. تنظيف الواجبات: 20 يومًا (معتمَد) / 14 (فارغ) / تنبيه بعد 14 لغير المصحّح؛ **لا تفعيل مشغّل ولا أي إجراء مؤثر إلا بطلب صريح من المعلم**.
8. الرئيسية: ترتيب البطاقات وبطاقة «ابدأ هنا» و4 بطاقات «لماذا حمٓ؟»؛ «طالب» بدل «بطل»؛ «علاج الأخطاء» مصطلح موحَّد؛ «الاختبار» = اختبار الطالب (غير «الاختبارات الثنائية»).
9. لوحة الواجبات: زر «إعداد واجب جديد» كبير ووحيد، تفتح على السجل، «النتائج النهائية» بجوار «سجل الواجبات»، «حذف» في قائمة ⋯، «يحتاج تصحيح» ثم «النتائج». مبدأ «التسهيل على المعلم دائمًا».
10. لا صندوق «موضع الخطأ بالتحديد». ركن الأطفال حتى الجزء 26. `recitation/` ليس ميزة.
11. أسماء قواعد IndexedDB (`DarHam…`) ومفاتيح التخزين والمجلدات (`Dar-Ham-Homework-Lab`, `dar-ham-quran-v4`) **تبقى كما هي** رغم تغيير الاسم الظاهر.
12. «الاختبارات الثنائية»: خصم الخطأ 0.5 ثابت، سؤال = 10 درجات، ملفات dualtests/ معزولة عن games/ بطلب المعلم.

## 21. DO NOT BREAK
- **أسماء/إصدارات قواعد IDB** (§15) وأسماء المخازن وأنواع `keyPath`؛ رفع الإصدار يتطلب `onupgradeneeded` يتحقق من كل مخزن (لا يفقد بيانات).
- **مفاتيح localStorage** (§15)، خصوصًا `history_<id>` (مصدر التقارير) و`dh_hw_teacher_*`.
- **واجهة خادم الواجبات:** أسماء `action`, أكواد الأخطاء (`UNAUTHORIZED`, `LOCKED`, `NOT_CONFIGURED`, `TOO_LARGE`…)، شكل `{ok, code, message}`، `text/plain`، `clientSubmissionId`، `persisted`, `expectedVersion`. الأعمدة الثابتة `HW_FIXED/SUB_FIXED/TEACHERS_FIXED` — لا تغيّر ترتيبها (ملفات الشيت الحية).
- **`DEFAULT_API_URL`**: إن نُشرت نسخة Apps Script جديدة غيّره في `core/api.js` فقط (لا `?api=`). نشر `Code.gs` يتطلب «New version» (الحفظ وحده لا يحدّث). **لا تلصق `Code.gs` فيمسح معرّف الشيت** (الحل: `SPREADSHEET_ID` المكتوب فيه).
- **`?hw=` و`?go=`** وروابط `manifest.json shortcuts`.
- **المسارات النسبية** لـ`templateUrl` (`dualtests/dual-test-play.html`…) وكل `import` — لا تعيد تسمية/نقل مجلدات حية.
- **IDs العناصر** المرتبطة بـ`getElementById` في `splash.html`, `dashboard.html`, `adultGame.html`/`kidsGame.html` (مثل `btn-adult-main`, `btn-start-mission`, `app-root`, `main-body`, `header-title`).
- **`data-i18n`** على `<span>` لا على أزرار فيها SVG؛ مفاتيح i18n القديمة غير المستخدمة تُترك (مثل `dual_in_progress_badge`).
- **ترتيب الإقلاع** في `bootSystem` (القرآن قبل المحركات، المسار السريع `?hw=` أولًا).
- **`esc()`** لكل نص مُحقن في innerHTML.
- **التوافق مع الهاتف** (الطلاب يفتحون الروابط من هواتفهم عبر واتساب).
- **رفع `APP_VERSION` + `CHANGELOG` و`CACHE_NAME`** مع كل تعديل جوهري.
- لا تعتمد على `Dar-Ham-Homework-Lab/vendor/` (نسخ مقتطعة قديمة).

## 22. المشاكل المعروفة والتعارضات
### المشاكل
| المشكلة | مكانها | تأثيرها | الحالة |
|---|---|---|---|
| Service Worker لا يخزّن شيئًا → لا Offline حقيقي، `CACHE_NAME` بلا أثر | `service-worker.js` | README يعد بعمل «دون اتصال»؛ صفحات الواجهة تحتاج الشبكة | مفتوح (غير مصحّح) |
| الإقلاع يفشل أول مرة بلا إنترنت | `quranDB.js` | شاشة فشل + إعادة محاولة | مُعالَج بشاشة فشل |
| `vendor/engine/homeworkEngine.js` يفشل فحص `CHECKSUMS.md5.txt` | `Dar-Ham-Homework-Lab/vendor/` | يخص المعمل فقط | نقلًا عن PROJECT_STATE السابق، لم أُعد التحقق |
| `reciteRangePicker.js` ما زال مستوردًا في adult/kids رغم حذف الصندوق من الواجهة | `games/*.js` | كود ميت محتمل | لم أتتبّع الاستدعاءات؛ غير محسوم |
| `Code.gs` ما زال يعالج `audio_record` (يدويًا) رغم حذفه من المولّد | `Code.gs:583,626,679` | توافق خلفي مقبول | غير محسوم |
| تعليقات قديمة داخل `verifyGoogleIdToken_` تصف قيدًا ألغاه قرار 10-01 (والسلوك الفعلي: تسجيل مفتوح) | `Code.gs` | التباس عند القراءة | مفتوح |
| مشغّل التنظيف اليومي لم يُتفق عليه، ومع ذلك الدوال جاهزة | `Code.gs` | الحذف التلقائي لا يعمل حتى يُفعَّل يدويًا (حالة الخادم الحي: غير محدد) | بانتظار قرار المعلم |
| `index.html` ما زال يحوي سنيبت Firebase App Check debug-token (يعمل على localhost فقط) | `index.html` | بلا أثر؛ بقايا | مفتوح |
| نقل الأرشيف و`Ham_GitHub_Clean` خارج المجلد لم يُنفَّذا | — | `git init` داخل `test-test` سيرفع كل شيء | بانتظار تنفيذ المعلم |
| `core/app.js` يكرر معالجة `?hw=` (المسار المبكر يكفي ويعمل `return`) | `app.js:301,391` | الثاني لا يُنفَّذ أبدًا | كود ميت |
### تعارضات بين ملفات/مصادر (لم أختر أحد الطرفين)
| # | الطرف أ | الطرف ب |
|---|---|---|
| 1 | ~~`README.md`: «الحماية الوحيدة مفتاح المعلم»~~ (حُلّ 2026-10-03: README يقول الآن إن جوجل لنظام الواجبات فقط) | `core/api.js` + `Code.gs`: Google Sign-In وتسجيل مفتوح لأي معلم (جدول `Teachers`) |
| 2 | `README.md` يذكر `supabase-migration.sql` | الملف غير موجود في المجلد |
| 3 | `README.md`: `engine/masteryEngine.js` جزء من محرك التقييم | لا ملف يستورده |
| 4 | الاسم: `index.html <title>` «منصة حمٓ - أبطال القرآن»، README «أبطال القرآن»، `header_title` «🏆 رحلة إتقان القرآن» | `manifest.json` «منصة حمٓ - ألعاب القرآن»؛ القرار: «منصة حمٓ» |
| 5 | `README.md`: الثنائي «قيد التطوير» والتجويد «المرحلة الأولى فقط» | `splash.html`: شارة الثنائي أُزيلت؛ `tajweedRulesCatalog.js` 4 مراحل و`tajweed-map.js` يصف المراحل 1+2+3+5 + بوابة مراجعة |
| 6 | `README.md` وتعليمات المشروع: ألوان `--dh-emerald` و`--dh-gold` في `home.css` | `home.css` يعرّف `--dh-emerald-900…600` و`--dh-gold-500/300` فقط |
| 7 | `README.md`: قواعد IDB عشر | الفعلي 11 (تضيف `DarHamMonthlyMemorization`) |
| 8 | `Code.gs` رأس الملف «Version 1.0.0» | `var VERSION = '1.2.0'` في الملف نفسه |
| 9 | `README.md`: يعمل «دون اتصال» (SW) | `service-worker.js` لا يخزّن (§16) |
**مسألة معلّقة بيد المعلم:** تحديث `README.md` (قديم) قبل النشر. ملاحظة: لم أستطع التحقق من الإعدادات الحية على Google (Script Properties، المشغّلات، نسخة النشر) — `غير محدد في المشروع`.

## 23. سجل العمل (من الملفات والـ CHANGELOG؛ بلا تواريخ مخترعة)
- **قبل 2026-09-25:** نظام واجبات على Firebase (Firestore + App Check) ← توقف المزامنة بسبب App Check.
- **2026-09-14:** تفعيل Service Worker تجريبيًا (`index.html`). **2026-09-16:** توسيع لعب المتشابهات لمستوى السورة/الجزء (تعليق في `core/app.js`).
- **2026-09-25:** معمل الواجبات + نشر Apps Script حقيقي ← دمجه في المنصة (`api.js`, `homeworkApi.js`)؛ اللقطة `_backup_before_homework_integration`.
- **2026-09-29:** تدقيق ما قبل الإطلاق (قواعد Firestore مغلقة، تحصين الإقلاع، Client ID/`?api=`، حدود الواجبات).
- **2026-09-30:** رأس السؤال ونص التسجيل؛ حذف `audio_record`.
- **2026-10-01 (v1.0.8):** إصلاح ترجمات؛ فحص سهولة الاستخدام؛ إعادة ترتيب الرئيسية؛ «ابدأ هنا»؛ «لماذا حمٓ؟»؛ الدخول السريع `homeFast`؛ «حفظ والعودة لاحقًا»؛ إعادة تصميم سجل الواجبات؛ تنظيف الواجبات (20/14)؛ زر الواجب الواحد؛ توحيد الاسم (آخر تعديل 22:36 +04). 12 لقطة `_backup_*` تؤرّخ هذه المراحل (PROJECT_MAP §6).
- **2026-10-02:** جرد وتوثيق (`PROJECT_MAP/STATE/INVENTORY`)، إنشاء `Ham_GitHub_Clean` و`_archive` (فارغ)، ثم هذه الوثيقة.

## 24. BEFORE MODIFYING ANYTHING
1. اقرأ `PROJECT_MASTER.md` ثم `PROJECT_STATE.md` (والمستندات في مشروع claude.ai «منصة دار حم» للتفاصيل التاريخية).
2. حدّد الملفات المرتبطة بالمهمة، **واقرأ الكود الفعلي** (غالبًا يوجد أساس جزئي أو TODO سابق).
3. افحص الاعتماديات: `grep` عن كل `import` للملف، وعن `getElementById` للعناصر، وعن مفاتيح `localStorage`/IDB المتأثرة.
4. لا تعدّل ملفات غير مرتبطة؛ لا CSS مشترك (اعزل بادئة جديدة)؛ لا تعيد تسمية مجلدات حية.
5. كل نص واجهة جديد في `core/i18n.js` (ar + en)؛ تعليقات عربية مفصلة بعلامة 🌟؛ وضّح أي افتراض صراحةً.
6. أي ميزة استبدلت تخزينًا قديمًا: أبقِ خط الرجوع القديم.
7. **لا تنفّذ إجراءً مؤثرًا (تفعيل مشغّل، حذف، نشر Apps Script، نقل/حذف ملفات) دون طلب صريح من المعلم.**
8. اختبر: `node tests/homeworkEngine.test.js` و`node tests/memorizationEngine.test.js` (+ اختبارات المعمل عند لمس الخادم)، ثم جرّب الشاشة في المتصفح على موبايل وعرض عادي، بالعربية والإنجليزية.
9. ارفع `APP_VERSION` وأضف عنصرًا لـ`CHANGELOG`، وارفع `CACHE_NAME` عند التعديل الجوهري.
10. حدّث `PROJECT_STATE.md` (سطر في سجل المهام + الأقسام المتأثرة)، و`PROJECT_MASTER.md` عند تغيير بنيوي، وأعد توليد `PROJECT_INVENTORY.csv` عند تغيّر الملفات، وانسخ التغييرات إلى `Ham_GitHub_Clean/` عند الحاجة.
