// =============================================================================
// reports/monthly-report.js
// 🌟 [جديد بالكامل] شاشة "تقرير الإنجاز الشهري" — تقرير جديد منفصل تمامًا عن
// تقرير التقييم الفردي في reports/report.js (لا يلمس هذا الملف أي سطر هناك).
// الفكرة: بدل تقرير جلسة اختبار واحدة، هذا تقرير يجمع كل ما تم مع الطالب خلال
// شهر ميلادي كامل (يختاره المعلم) من مصادر البيانات الموجودة فعليًا في المنصة،
// ليطبعه المعلم أو يحفظه صورة/PDF ويرسله يدويًا لولي الأمر (تنزيل يدوي فقط،
// بلا أي إرسال تلقائي — بالضبط كما طلب المعلم).
//
// 📌 راجع مستند المشروع "تصميم-تقرير-الإنجاز-الشهري-المقترح.md" لكل تفاصيل
// النقاش والقرارات قبل بناء هذا الملف.
//
// مصادر البيانات المُجمَّعة لهذا الشهر تحديدًا:
//   1) تقييمات غرفة اللعب الفردية (كبار/أطفال): من history_${studentId} المحلي —
//      🌟 [تحديث 2026-09-16]: كانت هذه التقييمات غير محفوظة إطلاقًا سابقًا (راجع
//      الملاحظة القديمة أسفل هذا القسم في نسخ سابقة من هذا الملف)؛ أُضيفت الآن دالة
//      persistEvaluationToHistory في كل من games/adultGame.js وgames/kidsGame.js تُسجِّل
//      كل جلسة عند انتهائها مباشرة (نفس معادلة احتساب الدرجة المستخدمة في report.js
//      بالحرف). ⚠️ [افتراض صريح]: لا رجعية — الجلسات التي لُعبت قبل هذا التحديث لن
//      تظهر أبداً هنا لأنها لم تُحفَظ وقتها. نُفرّق بينها وبين سجلات الواجبات (القسم
//      التالي) بغياب حقل hwId، وبين الكبار/الأطفال بحقل source الجديد
//      ('adult_game'/'kids_game'). الفلترة بالشهر تعتمد على حقل timestamp الجديد
//      (Date.now() عند الحفظ) — غير متاح في سجلات الواجبات القديمة، فلا تُفلتَر بهذا
//      القسم (تُقرأ من مصدر مختلف تمامًا، راجع البند التالي).
//   2) الواجبات المنزلية: من Firestore مباشرة (getAllSubmissionsFromCloud الجديدة
//      في core/firebase.js) — وليس من history_${studentId} المحلي. [افتراض صريح
//      ومهم]: history_ يخزّن الدرجة الأولية وقت التسليم فقط، ولا يُحدَّث أبدًا بعد
//      التصحيح اليدوي للمعلم (راجع saveManualGrades في settings/homework-prep.js —
//      يحدّث Firestore فقط). فالدرجة النهائية الصحيحة تُقرأ من السحابة دائمًا.
//   3) الاختبارات الثنائية: dual_matches (IndexedDB) المكتملة فعليًا (status
//      'completed') والتي طرفها هذا الطالب، بحسب تاريخ finishedAt.
//   4) الأخطاء المعالَجة: student.resolvedWeaknesses بحسب dateResolved.
//   5) حالة المراجعة المتباعدة (SRS): آخر حالة مسجَّلة فعليًا (ليست بيانات شهر
//      بعينه، بل "الحالة الآن") — تُعرض كما هي مع الإشارة هل آخر مراجعة وقعت
//      فعلًا داخل الشهر المختار أو لا.
//   6) نطاق الحفظ: القيمة الحالية المسجَّلة فقط (student.memoFrom/memoTo). ⚠️
//      [فجوة بيانات معروفة، مذكورة صراحة في مستند التصميم]: لا يوجد سجل تاريخي
//      لتغيّر هذا النطاق بمرور الوقت في الكود الحالي، فلا يمكن حساب "زاد كم سورة
//      هذا الشهر تحديدًا" — يُعرض النطاق الحالي فقط مع ملاحظة توضيحية داخل التقرير.
// =============================================================================

import { AppState, applyLanguage, t } from '../core/app.js';
import { REPORT_STYLES } from './report.styles.js';
import { MONTHLY_REPORT_STYLES } from './monthly-report.styles.js';
// 🌟 [جديد] هوية "منازل القمر" الخاصة بالتقرير الشهري (ملف مستقل معزول تحت .mr2 —
// راجع تعليق أعلى reports/monthly-report.identity.js). لا تمسّ REPORT_STYLES ولا أي CSS عام.
import { MONTHLY_REPORT_FONTS_IMPORT, MONTHLY_REPORT_IDENTITY_STYLES } from './monthly-report.identity.js';
import { BADGE_CATALOG, studentOutcomeInMatch } from '../engine/dualTestEngine.js';
// 🌟 [جديد] "رحلة الحفظ الشهرية" — تُقرأ من AppState.monthlyMemorizationManager
// (database/monthlyMemorizationDB.js) بدل نطاق student.memoFrom/memoTo الحالي فقط،
// ساداً بذلك فجوة البيانات الموثَّقة صراحةً في تعليق هذا الملف وفي مستند التصميم
// ("لا يوجد سجل تاريخي لتغيّر نطاق الحفظ"). getSurahInfo دالة خالصة لا تلمس أي DOM.
import { getSurahInfo } from '../engine/memorizationEngine.js';
// 🌟 [جديد] "رحلة المراجعة" — ملخص مراجعة الأجزاء الخمسة (دالة خالصة، راجع engine/reviewParts.js)
import { summarizeReview, juzLabel } from '../engine/reviewParts.js';
// 🌟 [تحديث] getAllSubmissionsFromCloud لم تعد تُستورد بشكل ثابت هنا فوق — راجع
// سبب ذلك بالتفصيل عند نقطة استخدامها الوحيدة داخل buildMonthlyReportData أدناه
// (قسم "2) الواجبات المنزلية").

// -----------------------------------------------------------------------------
// 0) القالب — بنفس نمط report.js بالحرف: نص مباشر يُحقن في #app-root (بلا fetch)،
// ونفس معرّف الحاوية الخارجية "report-screen" حتى تُطبَّق REPORT_STYLES مباشرة
// بلا أي تعديل عليها (الشاشتان لا تُعرَضان أبدًا في وقت واحد، فلا تعارض في
// إعادة استخدام نفس المعرّف).
// -----------------------------------------------------------------------------
const CORNER_ORN_INNER = `<path d="M2 20C2 9 9 2 20 2" stroke="#c9932f" stroke-width="1.3" opacity=".55"/><circle cx="2" cy="20" r="2" fill="#c9932f" opacity=".55"/><circle cx="20" cy="2" r="2" fill="#c9932f" opacity=".55"/>`;
const cornerOrnSvg = (cls) => `<svg class="corner-orn ${cls}" width="34" height="34" viewBox="0 0 40 40" fill="none">${CORNER_ORN_INNER}</svg>`;

// 🌟 [جديد] رموز هوية "منازل القمر" (SVG مضمَّنة، بلا أي ملف صورة خارجي): علامة الخاتم
// (مربعان متراكبان + هلال) ونجمة الفاصل. الهلال مرسوم كمسار (لا mask) حتى يلتقطه
// html2canvas بثبات في التصدير.
const MR2_MARK_PATHS = `<rect x="12" y="12" width="40" height="40" fill="none" stroke="#d4af37" stroke-width="2"/><rect x="12" y="12" width="40" height="40" fill="none" stroke="#d4af37" stroke-width="2" transform="rotate(45 32 32)"/><path transform="translate(4 0)" d="M38 20 A13.4 13.4 0 1 0 38 44 A12 12 0 0 1 38 20Z" fill="#f0d878"/>`;
const mr2MarkSvg = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">${MR2_MARK_PATHS}</svg>`;
const MR2_HERO_STAR_SVG = `<svg class="mr2-hero-star" viewBox="0 0 52 52" aria-hidden="true"><rect x="9" y="9" width="34" height="34" fill="#06231c" stroke="#d4af37" stroke-width="1.5"/><rect x="9" y="9" width="34" height="34" fill="#06231c" stroke="#d4af37" stroke-width="1.5" transform="rotate(45 26 26)"/><circle cx="26" cy="26" r="6" fill="#d4af37"/></svg>`;
const MR2_PLAN_CHIP_ICON = `<svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="8" width="32" height="32" fill="none" stroke="#d4af37" stroke-width="3.5"/><rect x="8" y="8" width="32" height="32" fill="none" stroke="#d4af37" stroke-width="3.5" transform="rotate(45 24 24)"/></svg>`;
// حلقة الهيرو: 8 علامات ذهبية زخرفية فقط (لا تمثّل أي بيان — المنصة لا تتتبّع الحضور/الغياب
// أصلًا، فلا نرسم حلقة حضور مزيّفة). القمر نفسه يمثّل الإنجاز العام (راجع renderMoonHero).
const MR2_RING_LINES = [0, 45, 90, 135, 180, 225, 270, 315]
  .map(a => `<line x1="150" y1="12" x2="150" y2="34" transform="rotate(${a} 150 150)"/>`).join('');

const MONTHLY_REPORT_TEMPLATE = `
<style>${MONTHLY_REPORT_FONTS_IMPORT}</style>
<style>${REPORT_STYLES}${MONTHLY_REPORT_STYLES}${MONTHLY_REPORT_IDENTITY_STYLES}</style>

<div id="report-screen">

  <div class="report-toolbar">
    <div class="grp">
      <span class="grp-label" data-i18n="mr_teacher_group_label">بيانات المعلم</span>
      <input type="text" id="mr-teacher-name-input" class="teacher-name-input" data-i18n-placeholder="mr_teacher_name_ph" placeholder="اسم المعلم">
      <button class="rbtn ghost" id="mr-btn-teacher-sig">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        <span data-i18n="mr_upload_sig_btn">رفع توقيع</span>
      </button>
      <input type="file" id="mr-teacher-sig-input" accept="image/*" style="display:none;">
    </div>
    <div class="grp">
      <span class="grp-label" data-i18n="mr_export_group_label">تصدير</span>
      <button class="rbtn primary" id="btn-mr-png">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="M21 15l-5-5L5 21"></path></svg>
        <span data-i18n="mr_export_png">صورة عالية الجودة</span>
      </button>
      <button class="rbtn" id="btn-mr-pdf">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path></svg>
        <span data-i18n="mr_export_pdf">ملف PDF</span>
      </button>
      <!-- 🌟 [جديد] مقاس واتساب جاهز — راجع exportWhatsApp أدناه -->
      <button class="rbtn" id="btn-mr-whatsapp" data-i18n-title="mr_export_whatsapp_hint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
        <span data-i18n="mr_export_whatsapp">نسخة واتساب</span>
      </button>
    </div>
    <div class="grp">
      <button class="rbtn ghost" id="btn-mr-back">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7"/><path d="M9 22V12h6v10"/></svg>
        <span data-i18n="mr_back_btn">العودة لملف الطالب</span>
      </button>
    </div>
  </div>

  <div class="mr-month-bar">
    <label for="mr-select-month" data-i18n="mr_month_label">الشهر:</label>
    <select id="mr-select-month"></select>
    <label for="mr-select-year" data-i18n="mr_year_label">السنة:</label>
    <select id="mr-select-year"></select>
    <span class="hint" id="mr-refresh-hint" data-i18n="mr_auto_refresh_hint">يتحدّث التقرير تلقائيًا عند تغيير الشهر/السنة</span>
  </div>

  <div class="note-bar">
    <label for="mr-custom-note-input" data-i18n="mr_note_label_input">ملاحظة لولي الأمر (اختياري):</label>
    <textarea id="mr-custom-note-input" data-i18n-placeholder="mr_note_placeholder" placeholder="اكتب هنا ملاحظتك الخاصة لولي الأمر — إن تركتها فارغة سيظهر ملخص تلقائي مبني على نشاط الشهر."></textarea>
    <span class="hint" data-i18n="mr_note_hint">تظهر في صندوق "ملاحظة المعلم" بالأسفل</span>
    <!-- 🌟 [جديد] نبرة الملاحظة التلقائية — تؤثر فقط لو تُرك مربع النص أعلاه فارغًا
         (الملاحظة المكتوبة يدويًا لا تتأثر إطلاقًا). اختيار اختياري بحت، يُتذكَّر
         على هذا الجهاز فقط (localStorage)، وليس إجباريًا كأي بيانة اختيارية أخرى. -->
    <div class="mr-tone-toggle" id="mr-tone-toggle" role="group">
      <span class="hint" data-i18n="mr_note_tone_label">نبرة الملاحظة التلقائية:</span>
      <button type="button" class="mr-tone-btn" id="mr-tone-formal" data-tone="formal" data-i18n="mr_note_tone_formal">رسمية</button>
      <button type="button" class="mr-tone-btn" id="mr-tone-warm" data-tone="warm" data-i18n="mr_note_tone_warm">دافئة</button>
    </div>
  </div>

  <div class="report-stage">
    <div id="mr-stage-inner" class="tier-good">
      <div>

      <div class="page mr2" id="mreport-page" dir="rtl">
        <!-- 🌟 [هوية "منازل القمر"] الهيرو: علامة حمٓ + الفترة (ميلادي/هجري) + الطالب
             بصورته وصفّه ونطاق حفظه + قمر الشهر (الإنجاز العام). كل المعرّفات (mr-student-name،
             mr-avatar-circle...) محفوظة كما كانت حتى تعمل دوال العرض بلا تغيير. -->
        <div class="pdf-block mr2-hero" id="mr-intro-block">
          <svg class="mr2-hero-bg" viewBox="0 0 794 420" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <pattern id="mr2-khatam" width="64" height="64" patternUnits="userSpaceOnUse">
                <g fill="none" stroke="#d4af37" stroke-opacity=".15" stroke-width="1"><rect x="12" y="12" width="40" height="40"/><rect x="12" y="12" width="40" height="40" transform="rotate(45 32 32)"/></g>
              </pattern>
              <radialGradient id="mr2-glow" cx="24%" cy="55%" r="50%"><stop offset="0" stop-color="#147c5e" stop-opacity=".55"/><stop offset="1" stop-color="#06231c" stop-opacity="0"/></radialGradient>
            </defs>
            <rect width="794" height="420" fill="url(#mr2-glow)"/>
            <rect width="794" height="420" fill="url(#mr2-khatam)"/>
          </svg>
          <div class="mr2-hero-frame"></div>
          <div class="mr2-hero-inner">

            <div class="mr2-topbar">
              ${mr2MarkSvg(54)}
              <div>
                <div class="mr2-brand-name">حمٓ</div>
                <div class="mr2-brand-sub" data-i18n="mr2_brand_sub">أبطال القرآن</div>
              </div>
              <!-- 🌟 [ضغط الهيرو] الآية انتقلت للشريط العلوي (كانت سطرًا مستقلًا) لتقليل الارتفاع وحجم صورة واتساب -->
              <div class="mr2-verse">وَقُل رَّبِّ زِدْنِي عِلْمًا</div>
              <div class="mr2-period">
                <div class="mr2-period-month" id="mr-period-month">--</div>
                <div class="mr2-period-range" id="mr-period-range"></div>
                <div class="mr2-period-hijri" id="mr-period-hijri"></div>
              </div>
            </div>

            <div class="mr2-hero-main">
              <div class="mr2-hero-text">
                <div class="mr2-eyebrow" data-i18n="mr2_eyebrow">التقرير الشهري لولي الأمر</div>
                <div class="mr2-id-row">
                  <div class="mr2-avatar">
                    <div class="mr2-avatar-inner" id="mr-avatar-circle">
                      <img id="mr-avatar-img" style="display:none;" alt="">
                    </div>
                  </div>
                  <div class="mr2-id-text">
                    <div class="mr2-name" id="mr-student-name">--</div>
                    <div class="mr2-grade" id="mr-student-grade" style="display:none;"></div>
                    <div class="mr2-scope" id="mr-student-scope" style="display:none;"></div>
                  </div>
                </div>
                <div class="mr2-figures" id="mr-hero-figures">
                  <div id="mr-fig-overall">
                    <div class="mr2-fig-num" id="mr-fig-overall-num">--</div>
                    <div class="mr2-fig-lbl" data-i18n="mr2_hero_overall">الإنجاز العام هذا الشهر</div>
                  </div>
                  <div class="mr2-fig-sep" id="mr-fig-sep"></div>
                  <div id="mr-fig-memo">
                    <div class="mr2-fig-num" id="mr-fig-memo-num">--</div>
                    <div class="mr2-fig-lbl" data-i18n="mr2_hero_new_memo">آية جديدة هذا الشهر</div>
                  </div>
                </div>
              </div>

              <!-- قمر الشهر: الجزء المضيء يُرسَم من الإنجاز العام (renderMoonHero). الحلقة زخرفية. -->
              <svg class="mr2-moon" viewBox="0 0 300 300" role="img" id="mr-moon-svg" aria-label="">
                <g stroke="#d4af37" stroke-width="9" stroke-linecap="round">${MR2_RING_LINES}</g>
                <circle cx="150" cy="150" r="110" fill="none" stroke="#d4af37" stroke-opacity=".3"/>
                <circle cx="150" cy="150" r="84" fill="#164f40" stroke="#d4af37" stroke-opacity=".7" stroke-width="3"/>
                <path id="mr-moon-lit" d="" fill="#f0d878"/>
              </svg>
            </div>

          </div>
          ${MR2_HERO_STAR_SVG}
        </div>

        <!-- 🌟 "منازل هذا الشهر": بطاقات المؤشرات + دليل المنازل الأربعة (هلال/تربيع/أحدب/بدر) -->
        <div class="pdf-block mr2-body-top" id="mr-summary-block">
          <div class="section-title" data-i18n="mr2_summary_title">منازل هذا الشهر</div>
          <div class="section-sub" data-i18n="mr2_summary_sub">المنزل يدل على مستوى الإتقان في كل مؤشر</div>
          <div class="mr-summary-grid" id="mr-summary-grid"></div>
          <div class="mr2-legend" id="mr-legend"></div>
        </div>

        <!-- 🌟 [جديد] "رحلة الحفظ الشهرية" — من أين إلى أين وصل الطالب فعليًا هذا الشهر،
             مبنية على سجل حقيقي (بداية/نهاية الشهر) بدل نطاق الحفظ الحالي فقط. راجع
             renderJourneyBlock وbuildMonthlyReportData (قسم "رحلة الحفظ") أدناه. -->
        <div class="mr-block pdf-block" id="mr-journey-block">
          <div class="section-title" data-i18n="mr_journey_section_title">رحلة الحفظ هذا الشهر</div>
          <div class="section-sub" data-i18n="mr_journey_section_sub">من أين إلى أين وصل الطالب في حفظه خلال هذا الشهر</div>
          <div id="mr-journey-content"></div>
        </div>

        <!-- 🌟 [جديد] "رحلة المراجعة" — الأجزاء الخمسة (الأحقاف، الذاريات، المجادلة، تبارك، عمّ):
             من أي سورة بدأ مراجعته هذا الشهر وإلى أين وصل، وكم سورة راجع. تُسجَّل من
             components/monthlyReviewScreen.js في سجل الشهر (حقل review). -->
        <div class="mr-block pdf-block" id="mr-revparts-block">
          <div class="section-title" data-i18n="mr_revparts_title">رحلة المراجعة هذا الشهر</div>
          <div class="section-sub" data-i18n="mr_revparts_sub">من أين بدأ الطالب مراجعة كل جزء وإلى أين وصل</div>
          <div id="mr-revparts-content"></div>
        </div>

        <!-- 🌟 [جديد] تقييمات غرفة اللعب الفردية (الكبار/الأطفال) هذا الشهر — تُقرأ من
             history_\${studentId} المحلي (عبر games/adultGame.js وgames/kidsGame.js
             الجديد persistEvaluationToHistory). ⚠️ لا رجعية: فقط الجلسات المُسجَّلة بعد هذا
             التحديث ستظهر هنا (راجع renderGameEvalBlock أدناه لتفاصيل الفلترة). -->
        <div class="mr-block pdf-block" id="mr-gameeval-block">
          <div class="section-title" data-i18n="mr_gameeval_section_title">تقييمات غرفة اللعب هذا الشهر</div>
          <div class="section-sub" data-i18n="mr_gameeval_section_sub">كل جلسة تقييم فردية (كبار/أطفال) خاضها الطالب هذا الشهر</div>
          <div id="mr-gameeval-content"></div>
        </div>

        <div class="mr-block pdf-block" id="mr-homework-block">
          <div class="section-title" data-i18n="mr_homework_section_title">الواجبات المنزلية هذا الشهر</div>
          <div class="section-sub" data-i18n="mr_homework_section_sub">كل واجب سلَّمه الطالب هذا الشهر مع درجته النهائية المعتمدة</div>
          <div id="mr-homework-content"></div>
        </div>

        <div class="mr-block pdf-block" id="mr-dual-block">
          <div class="section-title" data-i18n="mr_dual_section_title">الاختبارات الثنائية هذا الشهر</div>
          <div class="section-sub" data-i18n="mr_dual_section_sub">كل مواجهة مكتملة خاض فيها الطالب هذا الشهر</div>
          <div id="mr-dual-content"></div>
        </div>

        <div class="mr-block pdf-block" id="mr-achv-block">
          <div class="section-title" data-i18n="mr_achv_section_title">إنجازات وأوسمة جديدة هذا الشهر</div>
          <div id="mr-achv-content"></div>
        </div>

        <div class="mr-block pdf-block" id="mr-errors-block">
          <div class="section-title" data-i18n="mr_errors_section_title">أخطاء عولجت هذا الشهر</div>
          <div id="mr-errors-content"></div>
        </div>

        <div class="mr-block pdf-block" id="mr-review-block">
          <div class="section-title" data-i18n="mr_review_section_title">انتظام المراجعة المتباعدة</div>
          <div id="mr-review-content"></div>
        </div>

        <!-- 🌟 [جديد] "المقارنة الشهرية" — مقارنة فعلية بمؤشرات الشهر السابق (لو توفرت
             بياناته)، بلا أي أحكام أو أوصاف مبالغ فيها (راجع القسم 15 من طلب الميزة) -->
        <div class="mr-block pdf-block" id="mr-compare-block">
          <div class="section-title" data-i18n="mr_compare_section_title">المقارنة الشهرية</div>
          <div class="section-sub" data-i18n="mr_compare_section_sub">مقارنة فعلية بين هذا الشهر والشهر السابق</div>
          <div id="mr-compare-content"></div>
        </div>

        <!-- 🌟 [جديد] "اتجاه الحفظ التراكمي" — يُخفى بالكامل (نفس نمط setBlockVisible
             المستخدم أعلاه لقسمي الاختبارات الثنائية والإنجازات) طالما لم تتوفر بيانات
             3 أشهر مقفولة على الأقل بعد (راجع TREND_MIN_MONTHS وتعليق القسم 9). -->
        <div class="mr-block pdf-block" id="mr-trend-block">
          <div class="section-title" data-i18n="mr_trend_section_title">اتجاه الحفظ عبر الأشهر</div>
          <div class="section-sub" data-i18n="mr_trend_section_sub">إجمالي الحفظ الجديد تراكميًا خلال آخر أشهر مسجَّلة</div>
          <div id="mr-trend-content"></div>
        </div>

        <!-- 🌟 رسالة المعلم لولي الأمر (نفس المعرّف mr-note-text ونفس منطق الملاحظة اليدوية/التلقائية) -->
        <div class="note-box pdf-block">
          <div class="note-label" data-i18n="mr_note_box_label">رسالة المعلم لولي الأمر</div>
          <p class="note-text" id="mr-note-text"></p>
        </div>

        <!-- 🌟 [جديد] خطة الشهر القادم — رسالة تحفيز ثابتة النص (ليست بيانات) تحثّ على المراجعة
             وحفظ آيات جديدة وإتقان التجويد. تُملأ من renderPlanBlock بالاسم الأول للطالب. -->
        <div class="mr-plan-block pdf-block" id="mr-plan-block">
          <div class="section-title" data-i18n="mr2_plan_title">خطة الشهر القادم</div>
          <div class="mr2-plan-card">
            <p class="mr2-plan-text" id="mr-plan-text"></p>
            <div class="mr2-plan-chips">
              <span class="mr2-plan-chip">${MR2_PLAN_CHIP_ICON}<span data-i18n="mr2_plan_chip_review">مراجعة أكثر</span></span>
              <span class="mr2-plan-chip">${MR2_PLAN_CHIP_ICON}<span data-i18n="mr2_plan_chip_new">آيات جديدة</span></span>
              <span class="mr2-plan-chip">${MR2_PLAN_CHIP_ICON}<span data-i18n="mr2_plan_chip_tajweed">إتقان التجويد</span></span>
            </div>
          </div>
        </div>

        <!-- 🌟 التوقيع (يمين) وختم المعلم الرسمي المرفوع في "ملف المعلم" (يسار). الختم يُخفى
             كليًا لو لم يرفع المعلم ختمًا — لا مكان فارغ يُطبع. المعرّفات كما كانت. -->
        <div class="closing pdf-block">
          <div class="teacher-sign">
            <div class="teacher-line"></div>
            <div class="sig-name" id="mr-sign-name">المعلم</div>
            <div class="teacher-label" data-i18n="mr_teacher_sign_label">توقيع المعلم</div>
          </div>
          <div class="mr2-stamp-wrap"><img id="mr-sign-img" style="display:none;" alt=""></div>
        </div>

        <div class="pdf-block mr2-footer">
          <div class="mr2-footer-bless" data-i18n="mr2_footer_bless">بارك الله في جهدكم · معًا نرعى الحفظ</div>
          <div class="mr2-footer-meta">
            <span data-i18n="mr_meta_teacher">المعلم:</span> <b id="mr-teacher-name-meta">--</b>
            &nbsp;·&nbsp; <span data-i18n="mr_meta_generated">تاريخ الإصدار:</span> <b id="mr-generated-date">--</b>
            &nbsp;·&nbsp; <span dir="ltr" id="mr-footer-id">--</span>
          </div>
        </div>
      </div>

      <div class="home-bar no-export">
        <button class="home-btn" id="btn-mr-back-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7"/><path d="M9 22V12h6v10"/></svg>
          <span data-i18n="mr_back_btn">العودة لملف الطالب</span>
        </button>
      </div>

      </div>
    </div>
  </div>
</div>
`;

// -----------------------------------------------------------------------------
// 1) أدوات مساعدة عامة (نسخ مصغّرة مطابقة لما في report.js — بلا استيراد من هناك
// عمدًا، حتى لا تتشابك الشاشتان في أي استيراد متبادل مستقبلًا، ولضمان عدم كسر
// report.js إطلاقًا مهما تغيّر هذا الملف)
// -----------------------------------------------------------------------------
function $(id) {
  const el = document.getElementById(id);
  if (!el) console.warn(`[monthly-report.js] تعذّر إيجاد العنصر #${id}.`);
  return el;
}
function setText(id, val) { const el = $(id); if (el) el.textContent = val; }

function slugifyForFilename(str) {
  return String(str || '').replace(/[،,()]/g, ' ').trim().replace(/\s+/g, '_');
}
function avatarStorageKey(student) {
  const s = student || AppState.currentStudent || {};
  return 'darham_avatar_' + (s.id != null ? s.id : slugifyForFilename(s.name || 'unknown'));
}
function getAvatarHtml(student) {
  let avatarVal = student.avatar || null;
  if (!avatarVal) {
    try { avatarVal = localStorage.getItem(avatarStorageKey(student)); } catch (e) { /* تجاهل */ }
  }
  if (avatarVal) {
    if (avatarVal.length < 10) return { type: 'emoji', value: avatarVal };
    return { type: 'image', value: avatarVal };
  }
  return { type: 'letter', value: (student.name || '؟').trim().charAt(0) };
}
function applyAvatar(avatarInfo) {
  const circle = $('mr-avatar-circle');
  const img = $('mr-avatar-img');
  if (!circle || !img) return;
  if (avatarInfo.type === 'image') {
    img.src = avatarInfo.value;
    img.style.display = 'block';
    Array.from(circle.childNodes).forEach(n => { if (n.nodeType === 3) n.remove(); });
  } else {
    img.style.display = 'none';
    Array.from(circle.childNodes).forEach(n => { if (n !== img) n.remove(); });
    circle.appendChild(document.createTextNode(avatarInfo.value));
  }
}

// نفس عتبات التصنيف الأربعة المستخدمة في report.js بالحرف — للحفاظ على نفس
// "لغة الألوان" في كل تقارير المنصة (تقرير فردي أو شهري).
function scoreTierColor(score) {
  if (score >= 90) return '#8a6221';
  if (score >= 75) return '#a97b2e';
  if (score >= 60) return '#b8863b';
  return '#a15230';
}

// -----------------------------------------------------------------------------
// 🌟 [جديد] هوية "منازل القمر" — أدوات مساعدة (كلها دوال خالصة، لا تلمس أي بيانات)
// -----------------------------------------------------------------------------
// المنزل (Phase) من الدرجة — بنفس عتبات scoreTierColor أعلاه بالحرف (90/75/60)، فلا تتغير
// "لغة التصنيف" بين التقرير الفردي والشهري: بدر ≥90 (ممتاز)، أحدب ≥75 (متقدّم)،
// تربيع ≥60 (في تقدّم)، هلال (بداية الطريق).
const MR2_PHASES = [
  { key: 'full',     min: 90, range: '90–100%' },
  { key: 'gibbous',  min: 75, range: '75–89%'  },
  { key: 'quarter',  min: 60, range: '60–74%'  },
  { key: 'crescent', min: 0,  range: '0–59%'   }
];
function moonPhaseOf(score) {
  return MR2_PHASES.find(p => score >= p.min) || MR2_PHASES[MR2_PHASES.length - 1];
}
// مسار الجزء المضيء من القمر (يمين القرص) لنسبة f=score/100: نصف دائرة يمنى + قوس
// الفاصل (terminator) بنصف قطر أفقي |1-2f|·r؛ يبرز يسارًا (أحدب) لو f>0.5، ويمينًا
// (هلال) لو f<0.5، ويصير خطًا مستقيمًا عند 50% (تربيع). عند 100% دائرة كاملة (بدر).
function moonLitPath(score, cx, cy, r) {
  const f = Math.max(0, Math.min(100, Number(score) || 0)) / 100;
  if (f <= 0) return '';
  if (f >= 1) return `M${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx} ${cy + r} A${r} ${r} 0 1 1 ${cx} ${cy - r}Z`;
  const rx = (Math.abs(1 - 2 * f) * r).toFixed(2);
  return `M${cx} ${cy - r} A${r} ${r} 0 0 1 ${cx} ${cy + r} A${rx} ${r} 0 0 ${f > 0.5 ? 1 : 0} ${cx} ${cy - r}Z`;
}
// أيقونة القمر الصغيرة لبطاقة المؤشر (تظهر فقط للمؤشرات المئوية)
function moonGlyphSvg(score) {
  const lit = moonLitPath(score, 26, 26, 17);
  return `<svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="26" fill="#06231c"/><circle cx="26" cy="26" r="17" fill="#0b3d30" stroke="#d4af37" stroke-opacity=".4"/>${lit ? `<path d="${lit}" fill="#f0d878"/>` : ''}</svg>`;
}
// أيقونة "الخاتم" لبطاقات العدّ (حفظ جديد، اختبارات، أخطاء، أوسمة) التي ليست نسبًا مئوية
function khatamGlyphSvg() {
  return `<svg width="52" height="52" viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="10" width="44" height="44" fill="#0b3d30" stroke="#d4af37" stroke-width="1.6"/><rect x="10" y="10" width="44" height="44" fill="#0b3d30" stroke="#d4af37" stroke-width="1.6" transform="rotate(45 32 32)"/><circle cx="32" cy="32" r="6" fill="#f0d878"/></svg>`;
}
// ⚠️ [افتراض صريح] "الإنجاز العام" الذي يرسم قمر الهيرو = متوسط المؤشرين المئويين الموجودين
// فعليًا في المنصة لهذا الشهر فقط (متوسط تقييمات غرفة اللعب + متوسط الواجبات)، ويُحسَب مما
// وُجد منهما. لا اختبارات ثنائية (نتيجتها فوز/خسارة لا نسبة) ولا حضور (غير متتبَّع) ولا
// أي رقم مُختلَق. لو لم يوجد أي منهما يبقى القمر بلا جزء مضيء ويُخفى الرقم.
function computeOverallScore(d) {
  const vals = [d.gameEvalAvg, d.homeworkAvg].filter(v => typeof v === 'number');
  return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
}

// 🌟 تسمية الفترة في الهيرو: أرقام لاتينية (متّسقة مع تصميم الهوية المعتمد) وأسماء أشهر
// بلغة الواجهة. النطاق الميلادي "من 1 إلى 30 سبتمبر"، والهجري "ربيع الأول – ربيع الآخر 1448 هـ"
// (شهر أو شهران بحسب ما يقع فيه الشهر الميلادي فعلًا) بواجهة Intl المدمجة في المتصفح
// (تقويم أم القرى) بلا أي مكتبة خارجية.
function heroLocale() { return (AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US') + '-u-nu-latn'; }
function heroPeriodLabel(year, monthIndex0) {
  try { return new Intl.DateTimeFormat(heroLocale(), { month: 'long', year: 'numeric' }).format(new Date(year, monthIndex0, 1)); }
  catch (e) { return monthYearLabel(year, monthIndex0); }
}
function gregorianRangeLabel(year, monthIndex0) {
  try {
    const monthName = new Intl.DateTimeFormat(heroLocale(), { month: 'long' }).format(new Date(year, monthIndex0, 1));
    const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
    return t('mr2_period_range').replace('{a}', '1').replace('{b}', String(lastDay)).replace('{m}', monthName);
  } catch (e) { return ''; }
}
function hijriPeriodLabel(year, monthIndex0) {
  try {
    const loc = (AppState.currentLang === 'ar' ? 'ar-SA' : 'en-US') + '-u-ca-islamic-umalqura-nu-latn';
    const fmt = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', year: 'numeric' });
    const partsOf = (date) => { const o = {}; fmt.formatToParts(date).forEach(p => { o[p.type] = p.value; }); return o; };
    const a = partsOf(new Date(year, monthIndex0, 1));
    const b = partsOf(new Date(year, monthIndex0 + 1, 0));
    if (!a.month || !a.year || !b.month || !b.year) return '';
    const sfx = t('mr2_hijri_suffix');
    if (a.year === b.year) {
      return a.month === b.month ? `${a.month} ${a.year} ${sfx}` : `${a.month} – ${b.month} ${a.year} ${sfx}`;
    }
    return `${a.month} ${a.year} – ${b.month} ${b.year} ${sfx}`;
  } catch (e) { return ''; }
}

function formatDateArabicOrEn(d) {
  const lang = AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US';
  try { return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long', year: 'numeric' }).format(d); }
  catch (e) { return d.toLocaleDateString(); }
}
function monthYearLabel(year, monthIndex0) {
  const lang = AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US';
  try { return new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' }).format(new Date(year, monthIndex0, 1)); }
  catch (e) { return `${monthIndex0 + 1}/${year}`; }
}

// -----------------------------------------------------------------------------
// 1ب) هوية المعلم — نفس منطق report.js بالحرف (نسخة مصغّرة مستقلة، بنفس أسباب
// عدم الاستيراد المتبادل المذكورة أعلاه)
// -----------------------------------------------------------------------------
function getTeacherIdentity() {
  const teacher = AppState.currentTeacher || {};
  const fromApp = teacher.name || AppState.teacherName || null;
  const fromAppStamp = teacher.stamp || null;
  let savedName = '';
  try { savedName = localStorage.getItem('darham_teacher_name') || ''; } catch (e) { /* تجاهل */ }
  let savedSig = '';
  try { savedSig = localStorage.getItem('darham_teacher_signature') || ''; } catch (e) { /* تجاهل */ }
  return { name: fromApp || savedName || t('mr_default_teacher_label'), signature: fromAppStamp || savedSig || null };
}
function persistTeacherIdentity(partial) {
  try {
    if (AppState.teacherManager) {
      AppState.teacherManager.saveProfile(partial).then((saved) => {
        AppState.currentTeacher = saved;
        AppState.teacherName = saved.name || '';
      });
    }
  } catch (e) { console.warn('تعذر حفظ بيانات المعلم في الملف الدائم:', e); }
}

// 🌟 [جديد] عتبتا "اتجاه الحفظ التراكمي" — راجع القسم (9) داخل buildMonthlyReportData
// أدناه للتفصيل الكامل لسبب اختيار 3 كحد أدنى.
const TREND_MIN_MONTHS = 3;
const TREND_MAX_MONTHS = 6;

// -----------------------------------------------------------------------------
// 2) تجميع بيانات الشهر من كل المصادر (راجع تنويهات الافتراضات أعلى الملف)
// -----------------------------------------------------------------------------
async function buildMonthlyReportData(year, monthIndex0) {
  const student = AppState.currentStudent || {};
  const monthStart = new Date(year, monthIndex0, 1).getTime();
  const monthEnd = new Date(year, monthIndex0 + 1, 1).getTime(); // نهاية حصرية

  // --- 1) تقييمات غرفة اللعب الفردية (كبار/أطفال) — من history_${studentId} المحلي،
  // فقط العناصر التي أضافتها persistEvaluationToHistory الجديدة (بلا hwId، ومعها
  // timestamp رقمي). لا رجعية — راجع تعليق أعلى الملف.
  let gameEvalEntries = [];
  try {
    const raw = localStorage.getItem(`history_${student.id}`);
    const historyArray = raw ? JSON.parse(raw) : [];
    if (Array.isArray(historyArray)) {
      gameEvalEntries = historyArray
        .filter(e => !e.hwId && typeof e.timestamp === 'number' && e.timestamp >= monthStart && e.timestamp < monthEnd)
        .map(e => ({
          timestamp: e.timestamp,
          date: e.date || '',
          range: e.range || t('hist_eval_default_range'),
          score: typeof e.score === 'number' ? e.score : 0,
          source: e.source || 'adult_game'
        }))
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    }
  } catch (e) {
    console.error('[monthly-report.js] تعذر قراءة سجل تقييمات غرفة اللعب المحلي:', e);
  }
  const gameEvalAvg = gameEvalEntries.length
    ? Math.round(gameEvalEntries.reduce((s, e) => s + e.score, 0) / gameEvalEntries.length)
    : null;

  // --- 2) الواجبات المنزلية (من السحابة — الدرجة النهائية بعد أي تصحيح يدوي) ---
  // 🌟 [تحديث] استيراد core/firebase.js أصبح ديناميكيًا (await import) هنا داخل
  // نفس try/catch الموجود أصلاً لهذا القسم، بدل استيراد ثابت أعلى الملف. السبب:
  // core/firebase.js بيحمّل مكتبة Firebase SDK نفسها من CDN خارجي (gstatic.com)
  // بشكل ثابت أول ما يُفتَح. لو الاستيراد ده ثابت في أعلى monthly-report.js، فأي
  // فشل في الوصول لهذا الـCDN (مفيش إنترنت مثلًا) كان بيكسر تحميل الملف بالكامل —
  // يعني الشاشة كلها كانت بترفض تفتح حتى لو باقي بيانات الشهر (تقييمات غرفة
  // اللعب، الاختبارات الثنائية، الأخطاء المعالَجة، انتظام المراجعة...) كلها محلية
  // وموجودة عندك 100% بلا أي حاجة للإنترنت. بجعل الاستيراد كسولًا ومحصورًا هنا،
  // فشل الاتصال بالسحابة بقى يمنع قسم "الواجبات" بس (وده أصلًا كان له معالجة
  // جاهزة تحت بـhomeworkErrorMsg)، وباقي التقرير بيفتح ويشتغل طبيعي زي ما هو
  // بالظبط من غير إنترنت.
  let homeworkEntries = [];
  let homeworkErrorMsg = null;
  try {
    // 🌟🌟 [محدَّث — دمج نظام الواجبات الجديد] كان هنا استيراد ديناميكي من core/firebase.js (Firestore). الآن من
    // core/homeworkApi.js: نتائج الواجبات "المعتمدة" فقط من الخادم (درجات نهائية اعتمدها المعلم)، وتُطابَق مع الطالب
    // بمعرّف الطالب المُخزَّن مع التسليم وقت الاعتماد. تتطلب مفتاح المعلم؛ لو لم يكن مُدخلاً على هذا الجهاز نطلبه هنا
    // (أو تظهر رسالة "تعذّر الاتصال بالسحابة" في قسم الواجبات فقط لو ألغى المعلم، وباقي التقرير يعمل كالمعتاد).
    const { ensureTeacherAuth } = await import('../components/teacherAuthGate.js');
    if (!(await ensureTeacherAuth())) throw new Error('teacher key required');
    const { getAllSubmissionsFromCloud } = await import('../core/homeworkApi.js');
    const allSubs = await getAllSubmissionsFromCloud();
    const mineThisMonth = allSubs.filter(s =>
      String(s.studentId) === String(student.id) &&
      typeof s.timestamp === 'number' && s.timestamp >= monthStart && s.timestamp < monthEnd
    );
    let hwTitleById = {};
    try {
      const allHw = AppState.homeworkManager ? await AppState.homeworkManager.getAllHomeworks() : [];
      allHw.forEach(h => { hwTitleById[h.id] = h.title || ''; });
    } catch (e) { /* لو تعذّر جلب عناوين الواجبات نكتفي بمعرّف الواجب كنص بديل */ }
    homeworkEntries = mineThisMonth
      .map(s => ({
        timestamp: s.timestamp,
        date: s.date || '',
        title: hwTitleById[s.hwId] || s.hwId || t('mr_hw_untitled'),
        score: typeof s.score === 'number' ? s.score : 0
      }))
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  } catch (e) {
    console.error('[monthly-report.js] تعذر جلب تسليمات الواجبات من السحابة:', e);
    homeworkErrorMsg = t('mr_cloud_error');
  }
  const homeworkAvg = homeworkEntries.length
    ? Math.round(homeworkEntries.reduce((s, e) => s + e.score, 0) / homeworkEntries.length)
    : null;

  // --- 3) الاختبارات الثنائية المكتملة هذا الشهر ---
  let dualEntries = [];
  let dualWins = 0, dualLosses = 0, dualTies = 0;
  try {
    if (AppState.dualTestsManager) {
      const allMatches = await AppState.dualTestsManager.getAllMatches();
      const mine = allMatches.filter(m =>
        m.status === 'completed' && m.finishedAt &&
        (String(m.studentIdA) === String(student.id) || String(m.studentIdB) === String(student.id))
      );
      dualEntries = mine
        .filter(m => { const ts = new Date(m.finishedAt).getTime(); return ts >= monthStart && ts < monthEnd; })
        .map(m => {
          const side = String(m.studentIdA) === String(student.id) ? 'A' : 'B';
          const opponentName = side === 'A' ? m.studentNameB : m.studentNameA;
          const roundsWon = side === 'A' ? (m.roundsWonA || 0) : (m.roundsWonB || 0);
          const roundsLost = side === 'A' ? (m.roundsWonB || 0) : (m.roundsWonA || 0);
          const outcome = studentOutcomeInMatch(m, student.id); // 'win' | 'loss' | 'tie'
          if (outcome === 'win') dualWins++; else if (outcome === 'loss') dualLosses++; else if (outcome === 'tie') dualTies++;
          return { finishedAt: m.finishedAt, opponentName: opponentName || '—', outcome, roundsWon, roundsLost };
        })
        .sort((a, b) => new Date(a.finishedAt) - new Date(b.finishedAt));
    }
  } catch (e) {
    console.error('[monthly-report.js] تعذر جلب المواجهات الثنائية:', e);
  }

  // --- 4) الأوسمة/الإنجازات المكتسَبة هذا الشهر ---
  let achievementsThisMonth = [];
  try {
    if (AppState.dualTestsManager) {
      const mine = await AppState.dualTestsManager.getAchievementsByStudent(student.id);
      achievementsThisMonth = mine.filter(a => {
        if (!a.earnedAt) return false;
        const ts = new Date(a.earnedAt).getTime();
        return ts >= monthStart && ts < monthEnd;
      });
    }
  } catch (e) {
    console.error('[monthly-report.js] تعذر جلب الأوسمة:', e);
  }

  // --- 5) الأخطاء المعالَجة هذا الشهر ---
  const resolvedAll = Array.isArray(student.resolvedWeaknesses) ? student.resolvedWeaknesses : [];
  const resolvedThisMonth = resolvedAll.filter(w => {
    if (!w.dateResolved) return false;
    const ts = new Date(w.dateResolved).getTime();
    return !isNaN(ts) && ts >= monthStart && ts < monthEnd;
  });

  // --- 6) حالة المراجعة المتباعدة (الحالة الآن، وليست بيانات شهر بعينه) ---
  let reviewSchedule = null;
  try {
    if (AppState.reviewScheduleManager) reviewSchedule = await AppState.reviewScheduleManager.getSchedule(student.id);
  } catch (e) {
    console.error('[monthly-report.js] تعذر جلب جدول المراجعة المتباعدة:', e);
  }
  let reviewedWithinThisMonth = false;
  if (reviewSchedule && reviewSchedule.lastReviewedAt) {
    const ts = new Date(reviewSchedule.lastReviewedAt).getTime();
    reviewedWithinThisMonth = !isNaN(ts) && ts >= monthStart && ts < monthEnd;
  }

  // --- 7) 🌟 [جديد] رحلة الحفظ الشهرية — من database/monthlyMemorizationDB.js
  // (سجل حقيقي بموضع بداية/نهاية الشهر + عدد آيات جديدة محسوب آليًا)، بدل نطاق
  // student.memoFrom/memoTo النصي وحده. لو لم يُسجَّل هذا الشهر بعد إطلاقًا (المعلم
  // لم يستخدم نافذة "تسجيل موقع الحفظ" بعد لهذا الطالب/الشهر)، تُعرض رسالة صريحة
  // بدل اختلاق أي رقم — بلا أي فبركة (القسم 9 من طلب الميزة).
  let journey = null;
  try {
    if (AppState.monthlyMemorizationManager) {
      const record = await AppState.monthlyMemorizationManager.getRecord(student.id, year, monthIndex0 + 1);
      if (record && record.beginning) {
        const beginInfo = getSurahInfo(AppState.surahsData, record.beginning.surahNumber);
        journey = {
          beginLabel: `${beginInfo ? beginInfo.name : '؟'} — ${record.beginning.ayahNumber}`,
          hasEnding: !!record.ending,
          endLabel: null,
          newAyahs: typeof record.newAyahs === 'number' ? record.newAyahs : null
        };
        if (record.ending) {
          const endInfo = getSurahInfo(AppState.surahsData, record.ending.surahNumber);
          journey.endLabel = `${endInfo ? endInfo.name : '؟'} — ${record.ending.ayahNumber}`;
        }
      }
    }
  } catch (e) {
    console.error('[monthly-report.js] تعذر جلب سجل الحفظ الشهري:', e);
  }

  // --- 8) 🌟 [جديد] المقارنة الشهرية — الشهر السابق مباشرة فقط، وبمؤشرات خفيفة
  // التكلفة محليًا فقط (حفظ جديد + تقييمات فردية) بدل إعادة تنفيذ كل استعلامات
  // الشهر الحالي (الواجبات/الاختبارات الثنائية) مرة ثانية على الشهر السابق — تلك
  // تتطلب اتصالاً بالسحابة ومصادقة معلم لكل استدعاء، فتكلفتها غير مبرَّرة هنا فقط
  // لعرض مقارنة. ⚠️ [افتراض صريح]: المقارنة الشهرية في هذا التقرير تقتصر على
  // المؤشرات المحلية الرخيصة فقط لهذا السبب، وليس نقصًا في البيانات نفسها.
  let previousMonthStats = null;
  try {
    const prevMonthIndex0 = monthIndex0 === 0 ? 11 : monthIndex0 - 1;
    const prevYear = monthIndex0 === 0 ? year - 1 : year;
    previousMonthStats = await getLightMonthStats(student.id, prevYear, prevMonthIndex0);
  } catch (e) {
    console.error('[monthly-report.js] تعذر جلب مؤشرات الشهر السابق للمقارنة:', e);
  }
  const comparison = {
    previous: previousMonthStats,
    current: {
      newAyahs: journey ? journey.newAyahs : null,
      gameEvalCount: gameEvalEntries.length,
      gameEvalAvg
    }
  };

  // --- 9) 🌟 [جديد] "اتجاه الحفظ التراكمي" عبر عدّة أشهر — يُبنى فقط من سجلات
  // شهرية مقفولة فعليًا (locked && newAyahs رقم حقيقي)، حتى الشهر المختار حاليًا،
  // مرتبة زمنيًا. القيمة المرسومة تراكمية (مجموع الحفظ الجديد شهرًا بعد شهر) لا
  // شهرية منفردة — هذا ما يُظهر "الاتجاه" الفعلي بدل قفزات متفرقة.
  // ⚠️ [افتراض صريح — بالرد على سؤال المعلم "بعد كام شهر؟"]: هذا القسم لا يظهر
  // إطلاقًا إلا بعد توفر 3 أشهر مسجَّلة (مقفولة) على الأقل — أقل من ذلك لا يُشكِّل
  // "اتجاهًا" يمكن قراءته (نقطتان فقط = خط مستقيم بلا دلالة)، ويطابق ملاحظة
  // المعلم نفسه أن أول شهر غير مناسب لهذا الرسم. الرقم 3 قابل للتعديل لاحقًا لو
  // طلب المعلم عتبة مختلفة — عرّفناه كثابت واحد (TREND_MIN_MONTHS) أدناه بدل رقم
  // متكرر بالكود، بالضبط لتسهيل ذلك.
  let trend = null;
  try {
    if (AppState.monthlyMemorizationManager) {
      const allRecords = await AppState.monthlyMemorizationManager.getAllForStudent(student.id);
      const cutoff = year * 12 + monthIndex0;
      const withData = allRecords
        .filter(r => r.locked && typeof r.newAyahs === 'number' && (r.year * 12 + (r.month - 1)) <= cutoff)
        .slice(-TREND_MAX_MONTHS);
      if (withData.length >= TREND_MIN_MONTHS) {
        let running = 0;
        const points = withData.map(r => {
          running += r.newAyahs;
          return {
            label: monthYearLabel(r.year, r.month - 1).split(' ')[0], // اسم الشهر فقط، بلا السنة (توفيرًا للمساحة)
            newAyahs: r.newAyahs,
            cumulative: running
          };
        });
        trend = { points, totalNewAyahs: running };
      }
    }
  } catch (e) {
    console.error('[monthly-report.js] تعذر بناء اتجاه الحفظ التراكمي:', e);
  }

  const teacher = getTeacherIdentity();
  // 🌟 [تحديث] صياغة النطاق صارت "من الناس إلى عبس" (بدل "الناس ← عبس") — تُستخدم في شارة
  // الهيرو وفي الملاحظة التلقائية. hasMemoRange يُخفي الشارة كلها لو لم يُسجَّل نطاق (بيانة
  // اختيارية لا تُطلب إجباريًا).
  const hasMemoRange = !!(student.memoFrom && student.memoTo);
  const memoScope = hasMemoRange
    ? t('mr2_memo_scope_fmt').replace('{from}', student.memoFrom).replace('{to}', student.memoTo)
    : t('mr_no_memo_range');

  // 🌟 [جديد] ملخص مراجعة الأجزاء الخمسة لهذا الشهر (null لو لم تُسجَّل)
  let reviewSummary = null;
  try {
    if (AppState.monthlyMemorizationManager) {
      const revRec = await AppState.monthlyMemorizationManager.getRecord(student.id, year, monthIndex0 + 1);
      reviewSummary = summarizeReview(revRec && revRec.review, AppState.surahsData);
    }
  } catch (e) {
    console.error('[monthly-report.js] تعذر جلب مراجعة الشهر:', e);
  }

  return {
    student, year, monthIndex0,
    periodLabel: monthYearLabel(year, monthIndex0),
    // 🌟 [جديد] تسميات هوية "منازل القمر" في الهيرو (periodLabel أعلاه يبقى لاسم الملف)
    periodHero: heroPeriodLabel(year, monthIndex0),
    periodRange: gregorianRangeLabel(year, monthIndex0),
    periodHijri: hijriPeriodLabel(year, monthIndex0),
    generatedDate: formatDateArabicOrEn(new Date()),
    id: student.id != null ? ('#' + String(student.id).padStart(5, '0')) : '#00000',
    name: student.name || t('mr_default_student_label'),
    // الصف من ملف الطالب (student.grade) — اختياري، يُخفى لو فارغ
    grade: student.grade || '',
    memoScope, hasMemoRange,
    avatar: getAvatarHtml(student),
    teacher,
    gameEvalEntries, gameEvalAvg,
    homeworkEntries, homeworkAvg, homeworkErrorMsg,
    dualEntries, dualWins, dualLosses, dualTies,
    achievementsThisMonth,
    resolvedThisMonth,
    reviewSchedule, reviewedWithinThisMonth,
    journey, reviewSummary, comparison, trend
  };
}

// 🌟 [جديد] مؤشرات خفيفة محليًا فقط لشهر بعينه (بلا أي اتصال بالسحابة) — تُستخدم
// حصرًا لبناء "المقارنة الشهرية" بالشهر السابق (راجع تعليق القسم 8 أعلاه للسبب).
async function getLightMonthStats(studentId, year, monthIndex0) {
  const monthStart = new Date(year, monthIndex0, 1).getTime();
  const monthEnd = new Date(year, monthIndex0 + 1, 1).getTime();
  let gameEvalCount = 0, gameEvalAvg = null;
  try {
    const raw = localStorage.getItem(`history_${studentId}`);
    const historyArray = raw ? JSON.parse(raw) : [];
    if (Array.isArray(historyArray)) {
      const entries = historyArray.filter(e => !e.hwId && typeof e.timestamp === 'number' && e.timestamp >= monthStart && e.timestamp < monthEnd);
      gameEvalCount = entries.length;
      gameEvalAvg = entries.length ? Math.round(entries.reduce((s, e) => s + (e.score || 0), 0) / entries.length) : null;
    }
  } catch (e) { /* تجاهل — أفضل من كسر المقارنة كلها */ }

  let newAyahs = null;
  try {
    if (AppState.monthlyMemorizationManager) {
      const rec = await AppState.monthlyMemorizationManager.getRecord(studentId, year, monthIndex0 + 1);
      if (rec && typeof rec.newAyahs === 'number') newAyahs = rec.newAyahs;
    }
  } catch (e) { /* تجاهل */ }

  const hasAnyData = gameEvalCount > 0 || newAyahs != null;
  return { gameEvalCount, gameEvalAvg, newAyahs, hasAnyData };
}

// -----------------------------------------------------------------------------
// 3) العرض
// -----------------------------------------------------------------------------
let reportData = null;

function renderSummaryTiles(d) {
  const grid = $('mr-summary-grid');
  if (!grid) return;
  const tiles = [];

  // 🌟 [جديد] بطاقة "حفظ جديد" — من رحلة الحفظ الشهرية الحقيقية (راجع journey في
  // buildMonthlyReportData)، تظهر فقط لو كانت نهاية الشهر مسجَّلة فعلًا (وإلا لا يوجد
  // رقم نهائي يمكن الوثوق به بعد)
  tiles.push({
    label: t('mr_tile_new_memo'),
    value: (d.journey && d.journey.hasEnding && d.journey.newAyahs != null) ? String(d.journey.newAyahs) : '—',
    sub: t('mr_tile_new_memo_sub'),
    color: (d.journey && d.journey.hasEnding) ? '#8a6221' : '#a79a83'
  });

  tiles.push({
    label: t('mr_tile_gameeval_avg'),
    value: d.gameEvalAvg != null ? `${d.gameEvalAvg}%` : '—',
    sub: t('mr_tile_gameeval_count').replace('{n}', d.gameEvalEntries.length),
    color: d.gameEvalAvg != null ? scoreTierColor(d.gameEvalAvg) : '#a79a83',
    pct: d.gameEvalAvg // 🌟 نسبة → تُرسَم بمنزل القمر مع شارة المستوى
  });

  tiles.push({
    label: t('mr_tile_homework_avg'),
    value: d.homeworkAvg != null ? `${d.homeworkAvg}%` : '—',
    sub: t('mr_tile_homework_count').replace('{n}', d.homeworkEntries.length),
    color: d.homeworkAvg != null ? scoreTierColor(d.homeworkAvg) : '#a79a83',
    pct: d.homeworkAvg
  });

  const dualTotal = d.dualWins + d.dualLosses + d.dualTies;
  tiles.push({
    label: t('mr_tile_dual_results'),
    value: dualTotal ? `${d.dualWins}–${d.dualLosses}–${d.dualTies}` : '—',
    sub: t('mr_tile_dual_sub'),
    color: '#8a6221'
  });

  tiles.push({
    label: t('mr_tile_errors_resolved'),
    value: String(d.resolvedThisMonth.length),
    sub: t('mr_tile_errors_sub'),
    color: '#8a6221'
  });

  tiles.push({
    label: t('mr_tile_achievements'),
    value: String(d.achievementsThisMonth.length),
    sub: t('mr_tile_achievements_sub'),
    color: '#8a6221'
  });

  // 🌟 [هوية "منازل القمر"] البطاقات المئوية (غرفة اللعب، الواجبات) تحمل قمرًا بمنزلها +
  // شارة المستوى (ممتاز/متقدّم/في تقدّم/بداية الطريق)؛ بطاقات العدّ تحمل أيقونة الخاتم بلا
  // شارة (لا يوجد "مستوى" لعدد آيات أو أوسمة). اللون صار من CSS الهوية لا من inline.
  grid.innerHTML = tiles.map(tile => {
    const hasPct = typeof tile.pct === 'number';
    const phase = hasPct ? moonPhaseOf(tile.pct) : null;
    return `
    <div class="mr-tile${(tile.value === '—' || tile.value === '0') ? ' mr-tile-empty' : ''}">
      <div class="mr-tile-top">
        ${hasPct ? moonGlyphSvg(tile.pct) : khatamGlyphSvg()}
        ${phase ? `<span class="mr2-chip ${phase.key}">${t('mr2_lvl_' + phase.key)}</span>` : ''}
      </div>
      <div class="mr-tile-value">${tile.value}</div>
      <div class="mr-tile-label">${tile.label}</div>
      <div class="mr-tile-sub">${tile.sub}</div>
    </div>`;
  }).join('');
}

// 🌟 [جديد] دليل المنازل الأربعة أسفل بطاقات الملخص — يوضّح لولي الأمر معنى كل منزل
// والنسب التي يقابلها (نفس MR2_PHASES المستخدمة في رسم البطاقات، فلا يختلفان أبدًا).
function renderLegend() {
  const el = $('mr-legend');
  if (!el) return;
  const sampleScore = { full: 100, gibbous: 80, quarter: 50, crescent: 20 };
  const small = (key) => {
    const lit = moonLitPath(sampleScore[key], 20, 20, 13);
    return `<svg width="34" height="34" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="20" fill="#06231c"/><circle cx="20" cy="20" r="13" fill="#0b3d30" stroke="#d4af37" stroke-opacity=".4"/>${lit ? `<path d="${lit}" fill="#f0d878"/>` : ''}</svg>`;
  };
  el.innerHTML = `
    <div class="mr2-legend-title">${t('mr2_legend_title')}</div>
    <div class="mr2-legend-items">
      ${MR2_PHASES.slice().reverse().map(p => `
        <div class="mr2-legend-item">
          ${small(p.key)}
          <div>
            <div class="mr2-legend-name">${t('mr2_moon_' + p.key)} · <bdi dir="ltr">${p.range}</bdi></div>
            <div class="mr2-legend-lvl">${t('mr2_lvl_' + p.key)}</div>
          </div>
        </div>`).join('')}
    </div>`;
}

// 🌟 [جديد] قمر الهيرو + رقمه: الجزء المضيء من الإنجاز العام (computeOverallScore أعلاه —
// راجع الافتراض الصريح هناك). رقم "الآيات الجديدة" لا يظهر إلا لو سُجِّلت نهاية الشهر فعليًا.
function renderMoonHero(d) {
  const overall = computeOverallScore(d);
  const lit = $('mr-moon-lit');
  if (lit) lit.setAttribute('d', overall != null ? moonLitPath(overall, 150, 150, 84) : '');
  const svg = $('mr-moon-svg');
  if (svg) svg.setAttribute('aria-label', overall != null ? `${t('mr2_hero_overall')}: ${overall}%` : t('mr2_hero_overall'));

  const overallWrap = $('mr-fig-overall');
  const overallNum = $('mr-fig-overall-num');
  if (overallWrap) overallWrap.style.display = overall != null ? '' : 'none';
  if (overallNum && overall != null) overallNum.innerHTML = `${overall}<small>%</small>`;

  const hasMemo = !!(d.journey && d.journey.hasEnding && d.journey.newAyahs != null);
  const memoWrap = $('mr-fig-memo');
  const memoNum = $('mr-fig-memo-num');
  if (memoWrap) memoWrap.style.display = hasMemo ? '' : 'none';
  if (memoNum && hasMemo) memoNum.textContent = String(d.journey.newAyahs);

  const sep = $('mr-fig-sep');
  if (sep) sep.style.display = (overall != null && hasMemo) ? '' : 'none';
  const figs = $('mr-hero-figures');
  if (figs) figs.style.display = (overall != null || hasMemo) ? '' : 'none';
}

// 🌟 [جديد] خطة الشهر القادم — نص تحفيزي ثابت بالاسم الأول للطالب (ليس بيانات، فلا يُفلتَر ولا
// يُخفى)، يحثّ على: أكبر قدر من المراجعة، وحفظ آيات جديدة، وإتقان أحكام التجويد.
function renderPlanBlock(d) {
  const firstName = String(d.name || '').trim().split(/\s+/)[0] || d.name;
  setText('mr-plan-text', t('mr2_plan_text').replace('{name}', firstName));
}

// 🌟 [جديد] "رحلة الحفظ الشهرية" — ثلاث حالات فقط، كلها صريحة وبلا أي اختلاق:
// (1) لا يوجد سجل إطلاقًا لهذا الشهر بعد، (2) بداية الشهر مسجَّلة والنهاية لم تُسجَّل
// بعد (شهر جارٍ)، (3) السجل مكتمل بنهايته وعدد الآيات الجديدة محسوب.
function renderJourneyBlock(d) {
  const el = $('mr-journey-content');
  if (!el) return;
  if (!d.journey) {
    el.innerHTML = `<div class="mr-empty-row">${t('mr_journey_no_data')}</div>`;
    return;
  }
  if (!d.journey.hasEnding) {
    el.innerHTML = `
      <div class="mr-journey-box">
        <div class="mr-journey-row"><span class="mr-journey-label">${t('mr_journey_begin_label')}</span><span class="mr-journey-pos">${d.journey.beginLabel}</span></div>
      </div>
      <div class="mr-empty-row">${t('mr_journey_no_ending_yet')}</div>
    `;
    return;
  }
  el.innerHTML = `
    <div class="mr-journey-box">
      <div class="mr-journey-row"><span class="mr-journey-label">${t('mr_journey_begin_label')}</span><span class="mr-journey-pos">${d.journey.beginLabel}</span></div>
      <div class="mr-journey-arrow">↓</div>
      <div class="mr-journey-row"><span class="mr-journey-label">${t('mr_journey_end_label')}</span><span class="mr-journey-pos">${d.journey.endLabel}</span></div>
      <div class="mr-journey-new">${d.journey.newAyahs != null ? t('mr_journey_sentence').replace('{name}', String(d.name || '').trim().split(/\s+/)[0] || d.name).replace('{n}', '<b>' + d.journey.newAyahs + '</b>') : ''}</div>
    </div>
  `;
}

// 🌟 [جديد] "رحلة المراجعة": صف لكل جزء تمّت مراجعته (من سورة إلى سورة + العدد + شريط تقدّم)،
// وسطر إجمالي. الأجزاء التي لم تُراجَع لا تُعرض (لا نُظهر "صفرًا" لجزء لم يُسجَّل). بلا أي بيانة =
// رسالة صريحة (تُخفى تلقائيًا في تصدير واتساب/PDF لأنها صف فارغ — راجع mrIsEmptyBlock).
function renderReviewPartsBlock(d) {
  const el = $('mr-revparts-content');
  if (!el) return;
  const rs = d.reviewSummary;
  if (!rs) { el.innerHTML = `<div class="mr-empty-row">${t('mr_revparts_none')}</div>`; return; }
  const arrow = AppState.currentLang === 'ar' ? '←' : '→';
  const rows = rs.entries.map(p => `
    <div class="mr-rev-row">
      <div class="mr-rev-name">${juzLabel(p.juz, t)}</div>
      <div class="mr-rev-range">${p.fromName} ${p.fromAyah} <span class="mr-rev-arrow">${arrow}</span> ${p.toName} ${p.toAyah}</div>
      <div class="mr-rev-count">${t('mr_revparts_count_fmt').replace('{n}', p.count)}</div>
      <div class="mr-rev-bar"><div class="mr-rev-fill" style="width:${Math.min(100, p.pct)}%;"></div></div>
    </div>`).join('');
  el.innerHTML = `${rows}<div class="mr-rev-total">${t('mr_revparts_total_fmt').replace('{n}', rs.totalAyahs).replace('{k}', rs.juzCount)}</div>`;
}

// 🌟 [جديد] "المقارنة الشهرية" — تُعرض فقط لو توفرت أي بيانة فعلية للشهر السابق
// (وإلا نعرض رسالة صريحة بدل جدول فارغ يوحي بصفر إنجاز، راجع القسم 15 من طلب
// الميزة: "لا نعرض صفراً إلا لو كان صفراً موثَّقاً فعليًا")
function renderComparisonBlock(d) {
  const el = $('mr-compare-content');
  if (!el) return;
  const prev = d.comparison && d.comparison.previous;
  if (!prev || !prev.hasAnyData) {
    el.innerHTML = `<div class="mr-empty-row">${t('mr_compare_no_data')}</div>`;
    return;
  }
  const cur = d.comparison.current;
  const fmt = (v, unit) => (v == null ? '—' : `${v}${unit || ''}`);
  const delta = (curV, prevV) => {
    if (curV == null || prevV == null) return '';
    const diff = curV - prevV;
    if (diff === 0) return '';
    return `<span class="mr-badge ${diff > 0 ? 'mr-badge-win' : 'mr-badge-loss'}">${diff > 0 ? '+' : ''}${diff}</span>`;
  };
  const rows = [
    { label: t('mr_compare_row_memo'), prevV: fmt(prev.newAyahs), curV: fmt(cur.newAyahs), d: delta(cur.newAyahs, prev.newAyahs) },
    { label: t('mr_compare_row_gameeval'), prevV: fmt(prev.gameEvalCount), curV: fmt(cur.gameEvalCount), d: delta(cur.gameEvalCount, prev.gameEvalCount) },
    { label: t('mr_compare_row_gameeval_avg'), prevV: fmt(prev.gameEvalAvg, '%'), curV: fmt(cur.gameEvalAvg, '%'), d: delta(cur.gameEvalAvg, prev.gameEvalAvg) }
  ];
  el.innerHTML = `
    <table class="mr-table">
      <thead><tr>
        <th>${t('mr_compare_col_indicator')}</th>
        <th>${t('mr_compare_col_prev')}</th>
        <th>${t('mr_compare_col_current')}</th>
        <th>${t('mr_compare_col_change')}</th>
      </tr></thead>
      <tbody>
        ${rows.map(r => `<tr><td>${r.label}</td><td>${r.prevV}</td><td>${r.curV}</td><td>${r.d}</td></tr>`).join('')}
      </tbody>
    </table>
  `;
}

// 🌟 [جديد] "اتجاه الحفظ التراكمي" — رسم SVG بسيط مبني يدويًا (بلا أي مكتبة رسم
// بياني خارجية، تماشيًا مع تفضيل حلول المتصفح المدمجة) بخط متصل بين نقاط تراكمية،
// بنفس لوحة ألوان التقرير (أخضر زمردي للخط، ذهبي للنقاط). القسم بالكامل مخفي لو
// d.trend فارغ (أقل من TREND_MIN_MONTHS أشهر مسجَّلة — راجع buildMonthlyReportData).
function renderTrendBlock(d) {
  const el = $('mr-trend-content');
  if (!el) return;
  setBlockVisible('mr-trend-block', !!d.trend);
  if (!d.trend) return;

  const points = d.trend.points;
  const W = 640, H = 180, padX = 36, padY = 26;
  const maxVal = Math.max(...points.map(p => p.cumulative), 1);
  const stepX = points.length > 1 ? (W - padX * 2) / (points.length - 1) : 0;
  const xOf = (i) => padX + stepX * i;
  const yOf = (v) => H - padY - (v / maxVal) * (H - padY * 2);

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)} ${yOf(p.cumulative).toFixed(1)}`).join(' ');
  const dots = points.map((p, i) => `
    <circle cx="${xOf(i).toFixed(1)}" cy="${yOf(p.cumulative).toFixed(1)}" r="4.5" fill="#c9932f" stroke="#fffdf8" stroke-width="2"></circle>
    <text x="${xOf(i).toFixed(1)}" y="${(yOf(p.cumulative) - 12).toFixed(1)}" text-anchor="middle" class="mr-trend-val">${p.cumulative}</text>
    <text x="${xOf(i).toFixed(1)}" y="${(H - 6).toFixed(1)}" text-anchor="middle" class="mr-trend-lbl">${p.label}</text>
  `).join('');

  el.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="mr-trend-svg" preserveAspectRatio="xMidYMid meet">
      <path d="${linePath}" fill="none" stroke="#0d5c46" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></path>
      ${dots}
    </svg>
    <div class="mr-trend-total">${t('mr_trend_total_label')}: <b>${d.trend.totalNewAyahs}</b> ${t('mmp_ayahs_unit')}</div>
  `;
}

function renderGameEvalBlock(d) {
  const el = $('mr-gameeval-content');
  if (!el) return;
  if (!d.gameEvalEntries.length) {
    el.innerHTML = `<div class="mr-empty-row">${t('mr_gameeval_empty')}</div>`;
    return;
  }
  const sourceLabel = { adult_game: t('mr_source_adult'), kids_game: t('mr_source_kids') };
  el.innerHTML = `
    <table class="mr-table">
      <thead><tr>
        <th>${t('mr_table_col_date')}</th>
        <th>${t('mr_table_col_range')}</th>
        <th>${t('mr_table_col_section')}</th>
        <th>${t('mr_table_col_score')}</th>
      </tr></thead>
      <tbody>
        ${d.gameEvalEntries.map(e => `
          <tr>
            <td>${e.date}</td>
            <td>${e.range}</td>
            <td>${sourceLabel[e.source] || '—'}</td>
            <td style="color:${scoreTierColor(e.score)}; font-weight:800;">${e.score}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderHomeworkBlock(d) {
  const el = $('mr-homework-content');
  if (!el) return;
  if (d.homeworkErrorMsg) {
    el.innerHTML = `<div class="mr-empty-row">⚠️ ${d.homeworkErrorMsg}</div>`;
    return;
  }
  if (!d.homeworkEntries.length) {
    el.innerHTML = `<div class="mr-empty-row">${t('mr_homework_empty')}</div>`;
    return;
  }
  el.innerHTML = `
    <table class="mr-table">
      <thead><tr>
        <th>${t('mr_table_col_date')}</th>
        <th>${t('mr_table_col_homework')}</th>
        <th>${t('mr_table_col_score')}</th>
      </tr></thead>
      <tbody>
        ${d.homeworkEntries.map(e => `
          <tr>
            <td>${e.date}</td>
            <td>${e.title}</td>
            <td style="color:${scoreTierColor(e.score)}; font-weight:800;">${e.score}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// 🌟 [مُعدَّل — بطلب صريح من المعلم] هذان القسمان تحديدًا (الاختبارات الثنائية
// والإنجازات/الأوسمة) يُخفيان بالكامل (العنوان والمحتوى معًا) لو لا يوجد أي بيانة
// فعلية لهذا الشهر، بدل عرض عنوان القسم + سطر "لا يوجد" الذي كان يشغل مساحة
// فارغة في التقرير المطبوع/المصدَّر بلا أي فائدة للوالد. باقي الأقسام (الواجبات،
// التقييمات الفردية، أخطاء عولجت، المراجعة المتباعدة) بقيت كما هي بعرض رسالة
// صريحة عند غياب البيانات — لم يُطلَب إخفاؤها، وهي أقرب لصلب التقرير الشهري.
function setBlockVisible(blockId, visible) {
  const el = $(blockId);
  if (el) el.style.display = visible ? '' : 'none';
}

function renderDualBlock(d) {
  const el = $('mr-dual-content');
  if (!el) return;
  setBlockVisible('mr-dual-block', !!d.dualEntries.length);
  if (!d.dualEntries.length) {
    return;
  }
  const badgeClass = { win: 'mr-badge-win', loss: 'mr-badge-loss', tie: 'mr-badge-tie' };
  const badgeLabel = { win: t('mr_win'), loss: t('mr_loss'), tie: t('mr_tie') };
  el.innerHTML = `
    <table class="mr-table">
      <thead><tr>
        <th>${t('mr_table_col_date')}</th>
        <th>${t('mr_table_col_opponent')}</th>
        <th>${t('mr_table_col_rounds')}</th>
        <th>${t('mr_table_col_result')}</th>
      </tr></thead>
      <tbody>
        ${d.dualEntries.map(e => `
          <tr>
            <td>${formatDateArabicOrEn(new Date(e.finishedAt))}</td>
            <td>${e.opponentName}</td>
            <td>${e.roundsWon} - ${e.roundsLost}</td>
            <td><span class="mr-badge ${badgeClass[e.outcome] || ''}">${badgeLabel[e.outcome] || '—'}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderAchievementsBlock(d) {
  const el = $('mr-achv-content');
  if (!el) return;
  setBlockVisible('mr-achv-block', !!d.achievementsThisMonth.length);
  if (!d.achievementsThisMonth.length) {
    return;
  }
  el.innerHTML = `<div class="mr-achv-list">${d.achievementsThisMonth.map(a => {
    const def = BADGE_CATALOG[a.badgeKey];
    if (!def) return '';
    return `<span class="mr-achv-chip">${def.icon} ${t(def.nameKey)}</span>`;
  }).join('')}</div>`;
}

function renderErrorsBlock(d) {
  const el = $('mr-errors-content');
  if (!el) return;
  if (!d.resolvedThisMonth.length) {
    el.innerHTML = `<div class="mr-empty-row">${t('mr_errors_empty')}</div>`;
    return;
  }
  el.innerHTML = `
    <table class="mr-table">
      <thead><tr>
        <th>${t('mr_table_col_date')}</th>
        <th>${t('mr_table_col_location')}</th>
      </tr></thead>
      <tbody>
        ${d.resolvedThisMonth.map(w => `
          <tr>
            <td>${new Date(w.dateResolved).toLocaleDateString(AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US')}</td>
            <td>${w.surahName ? `${t('mr_surah_prefix')} ${w.surahName}${w.num ? ' - ' + w.num : ''}` : (w.text || '—')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderReviewBlock(d) {
  const el = $('mr-review-content');
  if (!el) return;
  if (!d.reviewSchedule) {
    el.innerHTML = `<div class="mr-empty-row">${t('mr_review_never')}</div>`;
    return;
  }
  const lang = AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US';
  const lastDate = new Date(d.reviewSchedule.lastReviewedAt).toLocaleDateString(lang);
  const nextDate = new Date(d.reviewSchedule.nextDueAt).toLocaleDateString(lang);
  const badge = d.reviewedWithinThisMonth
    ? `<span class="mr-badge mr-badge-win">${t('mr_reviewed_this_month')}</span>`
    : `<span class="mr-badge mr-badge-tie">${t('mr_not_reviewed_this_month')}</span>`;
  el.innerHTML = `
    <div class="mr-note-inline">
      ${t('mr_review_last')} <b>${lastDate}</b> (${t('mr_review_last_score')} ${d.reviewSchedule.lastScore}%) —
      ${t('mr_review_next')} <b>${nextDate}</b> — ${badge}
    </div>
  `;
}

// 🌟 [جديد] نبرة الملاحظة التلقائية — "رسمية" (الافتراضية، كما كانت دائمًا) أو
// "دافئة" (صياغة أكثر تشجيعًا لولي الأمر). تؤثر فقط على الجملة التلقائية المبنية
// هنا؛ أي ملاحظة كتبها المعلم يدويًا في مربع النص لا تتأثر بها إطلاقًا (راجع
// renderNoteBox أدناه). الاختيار يُحفَظ محليًا على هذا الجهاز فقط، وهو اختياري
// بحت (زر بسيط بلا أي إجبار)، بنفس فلسفة أي بيانة اختيارية أخرى في المنصة.
const NOTE_TONE_KEY = 'darham_mr_note_tone';
function getNoteTone() {
  // 🌟 [تحديث] الافتراضي صار "دافئة" (طلب المعلم: رسالة أدفأ لولي الأمر)؛ من اختار "رسمية"
  // صراحةً سابقًا يبقى اختياره المحفوظ كما هو (توافق مع التخزين القديم).
  try { return localStorage.getItem(NOTE_TONE_KEY) === 'formal' ? 'formal' : 'warm'; }
  catch (e) { return 'warm'; }
}
function setNoteTone(tone) {
  try { localStorage.setItem(NOTE_TONE_KEY, tone === 'warm' ? 'warm' : 'formal'); } catch (e) { /* تجاهل */ }
}
function toneKey(baseKey, tone) { return tone === 'warm' ? baseKey + '_warm' : baseKey; }

function buildAutoNote(d) {
  const tone = getNoteTone();
  const tk = (k) => toneKey(k, tone);
  const parts = [];
  // 🌟 [جديد] افتتاحية دافئة بالاسم الأول للطالب (للنبرة الدافئة فقط)
  if (tone === 'warm') {
    const first = String(d.name || '').trim().split(/\s+/)[0] || d.name;
    parts.push(t('mr_auto_note_open_warm').replace('{name}', first));
  }
  // 🌟 [جديد] جملة الحفظ الجديد أولًا لو تم تسجيل نهاية الشهر فعليًا — أدق وأصدق
  // من جملة "النطاق الحالي" وحدها لأنها تعكس تحرّكًا فعليًا خلال هذا الشهر تحديدًا
  if (d.journey && d.journey.hasEnding && d.journey.newAyahs != null) {
    parts.push(t(tk('mr_auto_note_memo_journey')).replace('{name}', d.name).replace('{n}', d.journey.newAyahs));
  }
  if (d.gameEvalAvg != null) {
    parts.push(t(tk('mr_auto_note_gameeval')).replace('{name}', d.name).replace('{n}', d.gameEvalEntries.length).replace('{avg}', d.gameEvalAvg));
  }
  if (d.homeworkAvg != null) {
    parts.push(t(tk('mr_auto_note_hw')).replace('{name}', d.name).replace('{n}', d.homeworkEntries.length).replace('{avg}', d.homeworkAvg));
  }
  const dualTotal = d.dualWins + d.dualLosses + d.dualTies;
  if (dualTotal) {
    parts.push(t(tk('mr_auto_note_dual')).replace('{w}', d.dualWins).replace('{l}', d.dualLosses).replace('{t}', d.dualTies));
  }
  if (d.resolvedThisMonth.length) {
    parts.push(t(tk('mr_auto_note_errors')).replace('{n}', d.resolvedThisMonth.length));
  }
  if (!parts.length) {
    parts.push(t(tk('mr_auto_note_empty')).replace('{name}', d.name));
  }
  // 🌟 [إصلاح] جملة النطاق لا تُضاف إلا لو سُجِّل نطاق فعلًا (وإلا تظهر "النطاق الحالي: غير مسجَّل" بلا فائدة)
  if (d.hasMemoRange) parts.push(t(tk('mr_auto_note_memo')).replace('{scope}', d.memoScope));
  if (tone === 'warm') parts.push(t('mr_auto_note_close_warm').replace('{name}', String(d.name || '').trim().split(/\s+/)[0] || d.name));
  return parts.join(' ');
}

function renderNoteBox() {
  const input = $('mr-custom-note-input');
  const custom = input ? input.value.trim() : '';
  setText('mr-note-text', custom || (reportData ? buildAutoNote(reportData) : ''));
}

function syncToneToggleUi() {
  const tone = getNoteTone();
  const formalBtn = $('mr-tone-formal');
  const warmBtn = $('mr-tone-warm');
  if (formalBtn) formalBtn.classList.toggle('active', tone === 'formal');
  if (warmBtn) warmBtn.classList.toggle('active', tone === 'warm');
}

// 🌟 [جديد] تنظيف خلفية ختم المعلم قبل عرضه هنا — نفس إصلاح "الختم يخرج مربعًا أسود"
// المطبَّق أصلاً في reports/report.js (راجع cleanStampImage هناك)، منسوخ بالحرف هنا
// بلا استيراد متبادل (نفس فلسفة عزل الملفين المتّبعة في كل هذا الملف). كان هذا القسم
// من report.js نُسخ منه قسم عرض التقرير الفردي فقط، وتُرك تنظيف الختم وقتها بالخطأ —
// فبقي التقرير الشهري يعرض `teacher.signature` الخام مباشرة، ومنه ظهور المربع الأسود
// لأي ختم ممسوح ضوئيًا بخلفية داكنة (حبر فاتح على خلفية داكنة).
const MR_STAMP_KEY_SOFT = 60;   // أقل من هذا البُعد عن لون الخلفية = خلفية بحتة (شفاف تمامًا)
const MR_STAMP_KEY_HARD = 115;  // أكثر من هذا = حبر بحت (معتم تمامًا)، وما بينهما تدرّج

function cleanStampImage(dataUrl) {
  return new Promise(resolve => {
    const img = new Image();
    img.onerror = () => resolve(dataUrl);
    img.onload = () => {
      try {
        const w = img.naturalWidth, h = img.naturalHeight;
        if (!w || !h) return resolve(dataUrl);

        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, w, h);
        const px = imgData.data;

        const cornerAt = (x, y) => {
          const i = (y * w + x) * 4;
          return { r: px[i], g: px[i + 1], b: px[i + 2], a: px[i + 3] };
        };
        const corners = [cornerAt(0, 0), cornerAt(w - 1, 0), cornerAt(0, h - 1), cornerAt(w - 1, h - 1)];

        // (1) خلفية شفافة أصلاً — الختم سليم، لا نلمسه
        if (corners.every(c => c.a < 16)) return resolve(dataUrl);

        // (2) الأركان غير متجانسة — لا نخمّن، نترك الصورة كما هي
        const dist = (a, b) => Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
        const maxSpread = Math.max(...corners.map(c => dist(c, corners[0])));
        if (maxSpread > 45) return resolve(dataUrl);

        let bg = {
          r: Math.round(corners.reduce((s, c) => s + c.r, 0) / 4),
          g: Math.round(corners.reduce((s, c) => s + c.g, 0) / 4),
          b: Math.round(corners.reduce((s, c) => s + c.b, 0) / 4)
        };

        // (3) خلفية داكنة ⇒ نعكس الصورة كلها ليصير الحبر داكنًا على ورق فاتح
        const luma = 0.2126 * bg.r + 0.7152 * bg.g + 0.0722 * bg.b;
        if (luma < 110) {
          for (let i = 0; i < px.length; i += 4) {
            px[i] = 255 - px[i]; px[i + 1] = 255 - px[i + 1]; px[i + 2] = 255 - px[i + 2];
          }
          bg = { r: 255 - bg.r, g: 255 - bg.g, b: 255 - bg.b };
        }

        // (4) إزالة الخلفية بتدرّج شفافية حسب بُعد كل بكسل عن لونها
        const span = MR_STAMP_KEY_HARD - MR_STAMP_KEY_SOFT;
        for (let i = 0; i < px.length; i += 4) {
          if (px[i + 3] === 0) continue;
          const d = Math.sqrt((px[i] - bg.r) ** 2 + (px[i + 1] - bg.g) ** 2 + (px[i + 2] - bg.b) ** 2);
          const k = d <= MR_STAMP_KEY_SOFT ? 0 : (d >= MR_STAMP_KEY_HARD ? 1 : (d - MR_STAMP_KEY_SOFT) / span);
          px[i + 3] = Math.round(px[i + 3] * k);
        }

        ctx.putImageData(imgData, 0, 0);
        // PNG إلزامًا — أي صيغة بلا قناة شفافية تعيد المشكلة من أولها
        resolve(cv.toDataURL('image/png'));
      } catch (e) {
        // أي فشل (متصفح قديم، صورة ملوَّثة المصدر...) = نعرض الختم الأصلي كما هو
        console.warn('[monthly-report.js] تعذّر تنظيف خلفية الختم، سيُعرض كما هو:', e);
        resolve(dataUrl);
      }
    };
    img.src = dataUrl;
  });
}

// وعد واحد لكل ختم: التنظيف يحدث مرة واحدة لا عند كل إعادة رسم، والتصدير ينتظره
// قبل الالتقاط حتى لا يخرج الملف بالختم غير المنظَّف (نفس منطق report.js بالحرف).
let stampCleanPromise = null;
function ensureStampCleaned() {
  if (stampCleanPromise) return stampCleanPromise;
  const raw = reportData && reportData.teacher ? reportData.teacher.signature : null;
  if (!raw) { stampCleanPromise = Promise.resolve(null); return stampCleanPromise; }
  stampCleanPromise = cleanStampImage(raw).then(clean => {
    if (reportData && reportData.teacher) reportData.teacher.signatureClean = clean;
    const el = $('mr-sign-img');
    if (el && clean) el.src = clean;
    return clean;
  }).catch(() => null);
  return stampCleanPromise;
}

function renderTeacherSign(d) {
  setText('mr-teacher-name-meta', d.teacher.name);
  setText('mr-sign-name', d.teacher.name);
  const img = $('mr-sign-img');
  if (img) {
    if (d.teacher.signature) {
      img.src = d.teacher.signatureClean || d.teacher.signature;
      img.style.display = 'block';
      ensureStampCleaned();
    } else {
      img.style.display = 'none';
    }
  }
}

function renderAll(d) {
  reportData = d;
  const stage = $('mr-stage-inner');
  if (stage) stage.className = 'tier-good';

  // 🌟 [هوية "منازل القمر"] ترويسة الفترة: الشهر + النطاق الميلادي + الهجري ("… 1448 هـ")
  setText('mr-period-month', d.periodHero || d.periodLabel);
  setText('mr-period-range', d.periodRange || '');
  setText('mr-period-hijri', d.periodHijri || '');
  setText('mr-student-name', d.name);
  // الصف ونطاق الحفظ اختياريان — يُخفيان كليًا لو لم يُسجَّلا في ملف الطالب (لا يُطلبان إجباريًا)
  const gradeEl = $('mr-student-grade');
  if (gradeEl) { gradeEl.textContent = d.grade || ''; gradeEl.style.display = d.grade ? '' : 'none'; }
  const scopeEl = $('mr-student-scope');
  if (scopeEl) {
    scopeEl.textContent = d.hasMemoRange ? `${t('mr2_scope_label')} ${d.memoScope}` : '';
    scopeEl.style.display = d.hasMemoRange ? '' : 'none';
  }
  setText('mr-generated-date', d.generatedDate);
  setText('mr-footer-id', d.id);
  applyAvatar(d.avatar);

  renderMoonHero(d);
  renderSummaryTiles(d);
  renderLegend();
  renderPlanBlock(d);
  renderJourneyBlock(d);
  renderReviewPartsBlock(d);
  renderGameEvalBlock(d);
  renderHomeworkBlock(d);
  renderDualBlock(d);
  renderAchievementsBlock(d);
  renderErrorsBlock(d);
  renderReviewBlock(d);
  renderComparisonBlock(d);
  renderTrendBlock(d);
  renderNoteBox();
  renderTeacherSign(d);
}

async function refreshReport() {
  const monthSel = $('mr-select-month');
  const yearSel = $('mr-select-year');
  if (!monthSel || !yearSel) return;
  const year = parseInt(yearSel.value, 10);
  const monthIndex0 = parseInt(monthSel.value, 10);
  const grid = $('mr-summary-grid');
  if (grid) grid.innerHTML = `<div class="mr-empty-row">${t('mr_loading')}</div>`;
  const d = await buildMonthlyReportData(year, monthIndex0);
  renderAll(d);
}

// -----------------------------------------------------------------------------
// 3ب) منتقي الشهر/السنة
// -----------------------------------------------------------------------------
function populateMonthYearSelects() {
  const monthSel = $('mr-select-month');
  const yearSel = $('mr-select-year');
  if (!monthSel || !yearSel) return;
  const now = new Date();
  const lang = AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US';

  monthSel.innerHTML = '';
  for (let m = 0; m < 12; m++) {
    const label = new Intl.DateTimeFormat(lang, { month: 'long' }).format(new Date(2000, m, 1));
    monthSel.appendChild(new Option(label, String(m)));
  }
  monthSel.value = String(now.getMonth());

  yearSel.innerHTML = '';
  const curYear = now.getFullYear();
  for (let y = curYear - 3; y <= curYear; y++) {
    yearSel.appendChild(new Option(String(y), String(y)));
  }
  yearSel.value = String(curYear);

  monthSel.addEventListener('change', refreshReport);
  yearSel.addEventListener('change', refreshReport);
}

// -----------------------------------------------------------------------------
// 4) التصدير: صورة PNG عالية الجودة، أو ملف PDF متعدد الصفحات
// نسخة مستقلة مطابقة لمنطق report.js (نفس الخوارزمية بالحرف) — مكررة عمدًا لا
// مستوردة، حتى لا نجازف بأي تغيير في report.js الشغّال حاليًا (راجع تعليق القسم 1).
// -----------------------------------------------------------------------------
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const el = document.createElement('script');
    el.src = src;
    el.onload = resolve;
    el.onerror = () => reject(new Error('تعذّر تحميل المكتبة: ' + src));
    document.head.appendChild(el);
  });
}
async function ensureHtml2Canvas() {
  if (!window.html2canvas) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
}
async function ensureJsPdf() {
  if (!(window.jspdf && window.jspdf.jsPDF)) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
}
async function ensureFontsReady() {
  if (document.fonts && document.fonts.ready) {
    try {
      await Promise.all([
        document.fonts.load('700 32px Amiri'), document.fonts.load('italic 700 16px Amiri'),
        document.fonts.load('700 14px Cairo'), document.fonts.load('600 13px Cairo'), document.fonts.load('800 14px Cairo'),
        // 🌟 خطوط هوية "منازل القمر" (نفس العائلات المعتمدة سابقًا)
        document.fonts.load('700 32px "Reem Kufi"'), document.fonts.load('600 14px "IBM Plex Sans Arabic"'),
        document.fonts.load('700 14px "IBM Plex Sans Arabic"'), document.fonts.load('400 20px "Amiri Quran"')
      ]);
      await document.fonts.ready;
    } catch (e) { /* تجاهل */ }
  }
}
function withBusyLabel(btn, busyText, fn) {
  return async function () {
    const original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = busyText;
    try { await fn(); }
    catch (err) { console.error(err); alert(t('mr_export_error') + ': ' + err.message); }
    finally { btn.disabled = false; btn.innerHTML = original; }
  };
}
function currentTarget() { return $('mreport-page'); }
function ignoreNoExport(el) { return !!(el.classList && el.classList.contains('no-export')); }
// 🌟 [جديد] suffix اختياري لاسم الملف (يُستخدم لنسخة واتساب أدناه)، بلا أي تغيير
// على تسمية PNG/PDF الحاليين (استدعاؤهما بلا الوسيط الثاني يبقيهما كما هما بالحرف)
function buildFileName(ext, suffix) {
  const namePart = slugifyForFilename(reportData.name);
  const periodPart = slugifyForFilename(reportData.periodLabel);
  return `تقرير_شهري_${namePart}_${periodPart}${suffix ? '_' + suffix : ''}.${ext}`;
}
const HQ_SCALE = 3;
// 🌟 [جديد — مقاس واتساب جاهز، القسم 1 من طلب المعلم] عرض مستهدف بالبكسل لصورة
// "نسخة واتساب" — 1080px يعطي وضوحًا ممتازًا على شاشة الهاتف، وهو أقل بكثير من
// حجم HQ_SCALE=3 الكامل (المخصَّص للطباعة/الأرشفة)، فيقلل حجم الملف ويتجنب أي
// ضغط إضافي عدواني من واتساب نفسه للصور الكبيرة جدًا عند الإرسال كـ"صورة" عادية
// (وليس كـ"ملف"). ⚠️ [افتراض صريح]: 1080px عرضًا هو المقياس الشائع لصور واتساب
// الواضحة على الهاتف؛ رقم ثابت واحد يناسب كل الطلاب لأن التقرير بنفس العرض دائمًا.
const WHATSAPP_TARGET_WIDTH_PX = 1080;

// 🌟 نفس مفتاح تسجيل "عدد التقارير المُصدَّرة" المستخدم فعليًا في reports/report.js
// (بطاقة "نظرة سريعة" بالشاشة الرئيسية) — إعادة استخدام نفس اسم المفتاح مباشرة في
// localStorage (بلا أي استيراد كودي من report.js) يجعل التقارير الشهرية تُحتسب ضمن
// نفس العدّاد تلقائيًا، دون أي تغيير في report.js أو في مكان قراءة هذا العدّاد.
const REPORTS_LOG_KEY = 'darham_reports_log';
const REPORTS_LOG_MAX = 300;
const REPORTS_DONE_KEY = 'darham_reports_done';
function logReportGenerated() {
  try {
    const raw = localStorage.getItem(REPORTS_LOG_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(list) ? list : [];
    arr.push(new Date().toISOString());
    localStorage.setItem(REPORTS_LOG_KEY, JSON.stringify(arr.slice(-REPORTS_LOG_MAX)));
  } catch (e) { /* تجاهل */ }
  // 🌟 [جديد] سجل إضافي لكل (طالب × شهر): آخر وقت تصدير — يقرؤه مركز التقارير الشهرية
  // (components/monthlyReportsHub.js) لعرض "سبق تصديره" و"تم اليوم" وتذكير أول الشهر.
  // مفتاح مستقل عن السجل القديم أعلاه (الذي يبقى كما هو بالحرف).
  try {
    if (reportData && reportData.student && reportData.student.id != null) {
      const key = `${reportData.student.id}_${reportData.year}-${String(reportData.monthIndex0 + 1).padStart(2, '0')}`;
      const rawDone = localStorage.getItem(REPORTS_DONE_KEY);
      const done = rawDone ? JSON.parse(rawDone) : {};
      done[key] = new Date().toISOString();
      localStorage.setItem(REPORTS_DONE_KEY, JSON.stringify(done));
    }
  } catch (e) { /* تجاهل */ }
}

async function exportPng() {
  await ensureHtml2Canvas();
  await ensureFontsReady();
  await ensureStampCleaned(); // 🌟 [جديد] لا يخرج الملف بالختم غير المنظَّف
  const target = currentTarget();
  const canvas = await window.html2canvas(target, {
    scale: HQ_SCALE, backgroundColor: '#fffdf6', useCORS: true,
    ignoreElements: ignoreNoExport
  });
  const link = document.createElement('a');
  link.download = buildFileName('png');
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  logReportGenerated();
}

// 🌟 [جديد] "نسخة واتساب" — نفس فكرة exportPng بالحرف، لكن بعرض مضبوط على
// WHATSAPP_TARGET_WIDTH_PX (بدل HQ_SCALE الكامل) وبصيغة JPEG (أخف حجمًا من PNG
// لصورة طويلة كهذه، ووضوحها كافٍ تمامًا لصورة تُشاهَد على شاشة هاتف). لا تُغيّر
// أي شيء في exportPng/exportPdf أعلاه — زر منفصل تمامًا يستدعيها.
async function exportWhatsAppRaw() {
  await ensureHtml2Canvas();
  await ensureFontsReady();
  await ensureStampCleaned(); // 🌟 [جديد] لا يخرج الملف بالختم غير المنظَّف
  const target = currentTarget();
  const scale = Math.min(HQ_SCALE, Math.max(1, WHATSAPP_TARGET_WIDTH_PX / target.offsetWidth));
  const canvas = await window.html2canvas(target, {
    scale, backgroundColor: '#fffdf6', useCORS: true,
    ignoreElements: ignoreNoExport
  });
  const link = document.createElement('a');
  link.download = buildFileName('jpg', t('mr_export_whatsapp_suffix'));
  link.href = canvas.toDataURL('image/jpeg', 0.92);
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  logReportGenerated();
}

function collectPdfBlocks(target) {
  const targetRect = target.getBoundingClientRect();
  return Array.from(target.querySelectorAll('.pdf-block')).map(el => {
    const rect = el.getBoundingClientRect();
    return { top: rect.top - targetRect.top, height: rect.height };
  }).filter(b => b.height > 0);
}
function splitOversizedRange(top, height, maxPageHeight) {
  const parts = [];
  let pos = top;
  const end = top + height;
  while (pos < end) {
    const partEnd = Math.min(pos + maxPageHeight, end);
    parts.push({ start: pos, end: partEnd });
    pos = partEnd;
  }
  return parts;
}
function packBlocksIntoPages(blocks, maxPageHeight) {
  const pages = [];
  let curStart = null, curEnd = null;
  for (const b of blocks) {
    const blockBottom = b.top + b.height;
    if (b.height > maxPageHeight) {
      if (curStart !== null) { pages.push({ start: curStart, end: curEnd }); curStart = null; curEnd = null; }
      splitOversizedRange(b.top, b.height, maxPageHeight).forEach(p => pages.push(p));
      continue;
    }
    if (curStart === null) { curStart = b.top; curEnd = blockBottom; continue; }
    if (blockBottom - curStart <= maxPageHeight) { curEnd = blockBottom; }
    else { pages.push({ start: curStart, end: curEnd }); curStart = b.top; curEnd = blockBottom; }
  }
  if (curStart !== null) pages.push({ start: curStart, end: curEnd });
  return pages;
}

async function exportPdfRaw() {
  await ensureHtml2Canvas();
  await ensureJsPdf();
  await ensureFontsReady();
  await ensureStampCleaned(); // 🌟 [جديد] لا يخرج الملف بالختم غير المنظَّف
  const target = currentTarget();

  const domBlocks = collectPdfBlocks(target);

  const canvas = await window.html2canvas(target, {
    scale: HQ_SCALE, backgroundColor: '#fffdf6', useCORS: true,
    ignoreElements: ignoreNoExport
  });

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const pageWidthPt = pdf.internal.pageSize.getWidth();
  const pageHeightPt = pdf.internal.pageSize.getHeight();
  // 🌟 إصلاح: نفس إصلاح reports/report.js — إلغاء الهامش الجانبي (كان يُظهر
  // حواف بيضاء واضحة حول محتوى التقرير الكريمي اللون) وتعبئة خلفية كل صفحة
  // بلون التقرير نفسه (#fffdf6) قبل رسم الصورة، حتى لا تبدو آخر صفحة (لو
  // تبقّى فيها قسم صغير فقط) بها فراغ أبيض فجّ أسفلها.
  const REPORT_BG_RGB = [255, 253, 246]; // يقابل #fffdf6
  const marginXPt = 0;
  const marginYPt = 20;
  const contentWidthPt = pageWidthPt - marginXPt * 2;
  const contentHeightPt = pageHeightPt - marginYPt * 2;

  const domToCanvasScale = canvas.width / target.offsetWidth;
  const domToPtScale = contentWidthPt / target.offsetWidth;
  const maxPageDomHeight = contentHeightPt / domToPtScale;
  const maxPageCanvasHeight = maxPageDomHeight * domToCanvasScale;

  const canvasBlocks = domBlocks.map(b => ({ top: b.top * domToCanvasScale, height: b.height * domToCanvasScale }));
  let pages = packBlocksIntoPages(canvasBlocks, maxPageCanvasHeight);
  if (!pages.length) {
    pages = [];
    for (let y = 0; y < canvas.height; y += maxPageCanvasHeight) {
      pages.push({ start: y, end: Math.min(y + maxPageCanvasHeight, canvas.height) });
    }
  }

  pages.forEach((p, idx) => {
    if (idx > 0) pdf.addPage();
    // 🌟 تعبئة خلفية الصفحة كاملة بلون التقرير قبل رسم الصورة — يمنع ظهور
    // أي إطار أبيض حول المحتوى أو تحت آخر قسم في آخر صفحة.
    pdf.setFillColor(REPORT_BG_RGB[0], REPORT_BG_RGB[1], REPORT_BG_RGB[2]);
    pdf.rect(0, 0, pageWidthPt, pageHeightPt, 'F');
    const sliceHeightCanvasPx = Math.max(1, Math.round(p.end - p.start));
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeightCanvasPx;
    const ctx = sliceCanvas.getContext('2d');
    ctx.fillStyle = '#fffdf6';
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(canvas, 0, p.start, canvas.width, sliceHeightCanvasPx, 0, 0, canvas.width, sliceHeightCanvasPx);
    const sliceImg = sliceCanvas.toDataURL('image/png');
    const sliceHeightPt = (sliceHeightCanvasPx / domToCanvasScale) * domToPtScale;
    pdf.addImage(sliceImg, 'PNG', marginXPt, marginYPt, contentWidthPt, sliceHeightPt, undefined, 'FAST');
  });

  pdf.save(buildFileName('pdf'));
  logReportGenerated();
}


// -----------------------------------------------------------------------------
// 🌟 [جديد] "عرض التصدير": نسخة واتساب مختصرة ونسخة PDF شاملة (طلب المعلم).
// يُطبَّق مؤقتًا على الصفحة أثناء الالتقاط فقط ثم يُعاد كل شيء كما كان في finally —
// فالشاشة على المنصة تبقى كاملة دائمًا، ولا يتغيّر أي منطق داخل exportPng/PDF/WhatsApp.
//  • compact (واتساب): الترويسة + البطاقات ذات القيمة الفعلية فقط + رحلة الحفظ + رسالة
//    المعلم + خطة الشهر + التوقيع. تُحذف التفاصيل (جداول/مقارنة/اتجاه/دليل القمر).
//  • full (PDF): كل شيء، عدا الأقسام الفارغة كليًا (صندوق "لا توجد بيانات" لا يفيد ولي الأمر).
// ⚠️ [افتراض صريح] بطاقة "بلا قيمة فعلية" = قيمتها "—" أو "0".
// -----------------------------------------------------------------------------
const MR_COMPACT_HIDE_IDS = ['mr-legend', 'mr-gameeval-block', 'mr-homework-block', 'mr-dual-block',
  'mr-achv-block', 'mr-errors-block', 'mr-review-block', 'mr-compare-block', 'mr-trend-block'];
function mrIsEmptyBlock(el) {
  return !!el.querySelector('.mr-empty-row') &&
    !el.querySelector('table, .mr-journey-box, svg, .mr-achv-chip, .mr-tile');
}
async function withExportView(mode, fn) {
  const page = currentTarget();
  const hidden = [];
  const hide = (el) => {
    if (!el || el.style.display === 'none') return;
    hidden.push([el, el.style.display]);
    el.style.display = 'none';
  };
  let gridBackup = null;
  try {
    if (page) {
      if (mode === 'compact') {
        MR_COMPACT_HIDE_IDS.forEach(id => hide($(id)));
        page.querySelectorAll('.mr-tile.mr-tile-empty').forEach(hide);
        const grid = $('mr-summary-grid');
        const shown = grid ? Array.from(grid.querySelectorAll('.mr-tile')).filter(el => el.style.display !== 'none').length : 0;
        if (grid && shown > 0 && shown < 3) { gridBackup = grid.style.gridTemplateColumns; grid.style.gridTemplateColumns = `repeat(${shown}, 1fr)`; }
        if (grid && shown === 0) hide($('mr-summary-block'));
      }
      page.querySelectorAll('.mr-block').forEach(el => { if (mrIsEmptyBlock(el)) hide(el); });
    }
    return await fn();
  } finally {
    hidden.forEach(([el, old]) => { el.style.display = old; });
    const grid = $('mr-summary-grid');
    if (grid && gridBackup !== null) grid.style.gridTemplateColumns = gridBackup;
  }
}
const exportWhatsApp = () => withExportView('compact', exportWhatsAppRaw);
const exportPdf = () => withExportView('full', exportPdfRaw);

// -----------------------------------------------------------------------------
// 5) نقطة الدخول
// -----------------------------------------------------------------------------
// 🌟 [جديد] خيارات فتح الشاشة القادمة من مركز التقارير (الشهر المطلوب، التصدير التلقائي،
// والرجوع لمركز التقارير بدل ملف الطالب). null = الفتح المعتاد من ملف الطالب بلا أي تغيير.
let mrOpenOptions = null;

function goBackToProfile() {
  if (mrOpenOptions && mrOpenOptions.returnTo === 'hub' && reportData && reportData.student) {
    const back = { studentId: reportData.student.id, year: reportData.year, month1: reportData.monthIndex0 + 1, openedAt: mrOpenOptions.openedAt };
    mrOpenOptions = null;
    import('../components/monthlyReportsHub.js').then(m => m.openMonthlyReportsHub({ returnedFrom: back })).catch(err => {
      console.error('[monthly-report.js] تعذر العودة لمركز التقارير:', err);
    });
    return;
  }
  mrOpenOptions = null;
  // 🌟 dynamic import عمدًا (بدل استيراد ثابت من student/student.js أعلى الملف) —
  // نفس نمط التنقل المستخدم فعليًا في core/app.js (openHomeworkPrep/openDualTestSetup)،
  // يتجنّب أي حلقة استيراد ثابتة بين هذا الملف وstudent.js.
  import('../student/student.js').then(m => m.loadStudentProfileScreen()).catch(err => {
    console.error('[monthly-report.js] تعذر العودة لملف الطالب:', err);
  });
}

function initMonthlyReportScreen() {
  populateMonthYearSelects();
  // 🌟 [جديد] لو فُتحت من مركز التقارير: اختر الشهر المطلوب ثم (اختياريًا) صدِّر تلقائيًا بعد اكتمال الرسم
  const opts = mrOpenOptions;
  if (opts && typeof opts.year === 'number' && typeof opts.monthIndex0 === 'number') {
    const ySel = $('mr-select-year'), mSel = $('mr-select-month');
    if (ySel) {
      if (!Array.from(ySel.options).some(o => o.value === String(opts.year))) ySel.appendChild(new Option(String(opts.year), String(opts.year)));
      ySel.value = String(opts.year);
    }
    if (mSel) mSel.value = String(opts.monthIndex0);
  }
  refreshReport().then(() => {
    if (opts && opts.autoExport) {
      const btn = $(opts.autoExport === 'pdf' ? 'btn-mr-pdf' : 'btn-mr-whatsapp');
      if (btn) btn.click();
    }
  });

  const noteInput = $('mr-custom-note-input');
  if (noteInput) noteInput.addEventListener('input', renderNoteBox);

  // 🌟 [جديد] مفتاح "نبرة الملاحظة التلقائية" — يُحدِّث المعاينة فورًا فقط لو مربع
  // النص المخصص فارغ (نفس شرط renderNoteBox نفسه، بلا أي تكرار للمنطق هنا)
  syncToneToggleUi();
  const toneFormalBtn = $('mr-tone-formal');
  const toneWarmBtn = $('mr-tone-warm');
  [toneFormalBtn, toneWarmBtn].forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      setNoteTone(btn.dataset.tone);
      syncToneToggleUi();
      renderNoteBox();
    });
  });

  const teacherNameInput = $('mr-teacher-name-input');
  if (teacherNameInput) {
    let initialName = (AppState.currentTeacher && AppState.currentTeacher.name) || '';
    if (!initialName) { try { initialName = localStorage.getItem('darham_teacher_name') || ''; } catch (e) { /* تجاهل */ } }
    teacherNameInput.value = initialName;
    teacherNameInput.addEventListener('input', () => {
      const val = teacherNameInput.value.trim();
      try { localStorage.setItem('darham_teacher_name', val); } catch (e) { /* تجاهل */ }
      persistTeacherIdentity({ name: val });
      if (reportData) { reportData.teacher.name = val || t('mr_default_teacher_label'); renderTeacherSign(reportData); }
    });
  }
  const teacherSigBtn = $('mr-btn-teacher-sig');
  const teacherSigInput = $('mr-teacher-sig-input');
  if (teacherSigBtn && teacherSigInput) {
    teacherSigBtn.addEventListener('click', () => teacherSigInput.click());
    teacherSigInput.addEventListener('change', async () => {
      const file = teacherSigInput.files && teacherSigInput.files[0];
      teacherSigInput.value = '';
      if (!file) return;
      if (!file.type || !file.type.startsWith('image/')) { alert(t('mr_invalid_image')); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        try { localStorage.setItem('darham_teacher_signature', dataUrl); } catch (e) { /* تجاهل */ }
        persistTeacherIdentity({ stamp: dataUrl });
        // 🌟 [جديد] إبطال نتيجة التنظيف السابقة حتى يُنظَّف الختم الجديد من أول مرة
        stampCleanPromise = null;
        if (reportData) {
          reportData.teacher.signature = dataUrl;
          reportData.teacher.signatureClean = null;
          renderTeacherSign(reportData);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  const pngBtn = $('btn-mr-png');
  const pdfBtn = $('btn-mr-pdf');
  const whatsappBtn = $('btn-mr-whatsapp');
  if (pngBtn) pngBtn.addEventListener('click', withBusyLabel(pngBtn, t('mr_exporting'), exportPng));
  if (pdfBtn) pdfBtn.addEventListener('click', withBusyLabel(pdfBtn, t('mr_exporting'), exportPdf));
  if (whatsappBtn) whatsappBtn.addEventListener('click', withBusyLabel(whatsappBtn, t('mr_exporting'), exportWhatsApp));

  const backBtn = $('btn-mr-back');
  const backBtn2 = $('btn-mr-back-2');
  if (backBtn) backBtn.addEventListener('click', goBackToProfile);
  if (backBtn2) backBtn2.addEventListener('click', goBackToProfile);
}

// 🌟 [تحديث] وسيط اختياري options: { student, year, monthIndex0, autoExport: 'pdf'|'whatsapp'|null,
// returnTo: 'hub' } — للاستدعاء من مركز التقارير. بلا وسيط = السلوك القديم بالحرف.
export function openMonthlyReportScreen(options) {
  mrOpenOptions = options ? { ...options, openedAt: Date.now() } : null;
  if (options && options.student) AppState.currentStudent = options.student;
  if (!AppState.currentStudent) {
    alert(t('mr_no_student_selected'));
    return;
  }
  const root = document.getElementById('app-root');
  if (!root) {
    console.error('[monthly-report.js] لم يتم العثور على #app-root.');
    return;
  }
  root.innerHTML = MONTHLY_REPORT_TEMPLATE;
  // 🌟 [إصلاح] اتجاه صفحة التقرير يتبع لغة الواجهة (كان rtl ثابتًا فيتشوّه ترتيب الإنجليزية وعلامات الترقيم)
  const mrPage = document.getElementById('mreport-page');
  if (mrPage) mrPage.setAttribute('dir', AppState.currentLang === 'ar' ? 'rtl' : 'ltr');
  try { applyLanguage(); } catch (e) { /* غير حرِج */ }
  initMonthlyReportScreen();
}
