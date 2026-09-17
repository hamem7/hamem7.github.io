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
import { BADGE_CATALOG, studentOutcomeInMatch } from '../engine/dualTestEngine.js';
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

const MONTHLY_REPORT_TEMPLATE = `
<style>${REPORT_STYLES}${MONTHLY_REPORT_STYLES}</style>

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
  </div>

  <div class="report-stage">
    <div id="mr-stage-inner" class="tier-good">
      <div>

      <div class="page" id="mreport-page" dir="rtl">
        ${cornerOrnSvg('tl')}
        ${cornerOrnSvg('tr')}
        ${cornerOrnSvg('bl')}
        ${cornerOrnSvg('br')}

        <div class="pdf-block" id="mr-intro-block">
          <div class="eyebrow" data-i18n="mr_eyebrow">دار حم · منصة تحفيظ القرآن الكريم</div>
          <div class="title-row">
            <h1 class="title" data-i18n="mr_title">تقرير إنجاز شهري</h1>
            <div class="title-sub" id="mr-title-period">--</div>
          </div>
          <div class="gold-rule"></div>

          <div class="meta-row">
            <div class="meta-student">
              <div class="avatar-wrap">
                <div class="avatar-circle" id="mr-avatar-circle">
                  <img id="mr-avatar-img" style="display:none;" alt="">
                </div>
              </div>
              <div>
                <div class="student-name" id="mr-student-name">--</div>
                <div class="student-scope" id="mr-student-scope">--</div>
              </div>
            </div>
            <div class="meta-right">
              <span data-i18n="mr_meta_teacher">المعلم:</span> <b id="mr-teacher-name-meta">--</b><br>
              <span data-i18n="mr_meta_generated">تاريخ الإصدار:</span> <b id="mr-generated-date">--</b>
            </div>
          </div>
        </div>

        <div class="pdf-block" id="mr-summary-block">
          <div class="section-title" data-i18n="mr_summary_title">ملخص الشهر</div>
          <div class="section-sub" data-i18n="mr_summary_sub">نظرة عامة سريعة على نشاط الطالب خلال هذا الشهر</div>
          <div class="mr-summary-grid" id="mr-summary-grid"></div>
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

        <div class="note-box pdf-block">
          <div class="note-label" data-i18n="mr_note_box_label">ملاحظة المعلم لولي الأمر — للمتابعة أولًا بأول</div>
          <p class="note-text" id="mr-note-text"></p>
        </div>

        <div class="closing pdf-block">
          <div class="footer-note">
            <span data-i18n="mr_footer_line1">دار حم · منصة مراجعة القرآن التفاعلية</span><br>
            <span dir="ltr" id="mr-footer-id">--</span> &nbsp;·&nbsp; <span dir="ltr" id="mr-footer-date">--</span>
          </div>
          <div class="teacher-sign">
            <div class="sig-img-wrap"><img id="mr-sign-img" style="display:none;" alt=""></div>
            <div class="teacher-line"></div>
            <div class="sig-name" id="mr-sign-name">المعلم</div>
            <div class="teacher-label" data-i18n="mr_teacher_sign_label">توقيع المعلم</div>
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
    const { getAllSubmissionsFromCloud } = await import('../core/firebase.js');
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

  const teacher = getTeacherIdentity();
  const memoScope = (student.memoFrom && student.memoTo)
    ? `${student.memoFrom} ← ${student.memoTo}`
    : t('mr_no_memo_range');

  return {
    student, year, monthIndex0,
    periodLabel: monthYearLabel(year, monthIndex0),
    generatedDate: formatDateArabicOrEn(new Date()),
    id: student.id != null ? ('#' + String(student.id).padStart(5, '0')) : '#00000',
    name: student.name || t('mr_default_student_label'),
    memoScope,
    avatar: getAvatarHtml(student),
    teacher,
    gameEvalEntries, gameEvalAvg,
    homeworkEntries, homeworkAvg, homeworkErrorMsg,
    dualEntries, dualWins, dualLosses, dualTies,
    achievementsThisMonth,
    resolvedThisMonth,
    reviewSchedule, reviewedWithinThisMonth
  };
}

// -----------------------------------------------------------------------------
// 3) العرض
// -----------------------------------------------------------------------------
let reportData = null;

function renderSummaryTiles(d) {
  const grid = $('mr-summary-grid');
  if (!grid) return;
  const tiles = [];

  tiles.push({
    label: t('mr_tile_gameeval_avg'),
    value: d.gameEvalAvg != null ? `${d.gameEvalAvg}%` : '—',
    sub: t('mr_tile_gameeval_count').replace('{n}', d.gameEvalEntries.length),
    color: d.gameEvalAvg != null ? scoreTierColor(d.gameEvalAvg) : '#a79a83'
  });

  tiles.push({
    label: t('mr_tile_homework_avg'),
    value: d.homeworkAvg != null ? `${d.homeworkAvg}%` : '—',
    sub: t('mr_tile_homework_count').replace('{n}', d.homeworkEntries.length),
    color: d.homeworkAvg != null ? scoreTierColor(d.homeworkAvg) : '#a79a83'
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

  grid.innerHTML = tiles.map(tile => `
    <div class="mr-tile">
      <div class="mr-tile-label">${tile.label}</div>
      <div class="mr-tile-value" style="color:${tile.color};">${tile.value}</div>
      <div class="mr-tile-sub">${tile.sub}</div>
    </div>
  `).join('');
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

function renderDualBlock(d) {
  const el = $('mr-dual-content');
  if (!el) return;
  if (!d.dualEntries.length) {
    el.innerHTML = `<div class="mr-empty-row">${t('mr_dual_empty')}</div>`;
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
  if (!d.achievementsThisMonth.length) {
    el.innerHTML = `<div class="mr-empty-row">${t('mr_achv_empty')}</div>`;
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
    el.innerHTML = `<div class="mr-note-inline">${t('mr_review_never')}</div>`;
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

function buildAutoNote(d) {
  const parts = [];
  if (d.gameEvalAvg != null) {
    parts.push(t('mr_auto_note_gameeval').replace('{name}', d.name).replace('{n}', d.gameEvalEntries.length).replace('{avg}', d.gameEvalAvg));
  }
  if (d.homeworkAvg != null) {
    parts.push(t('mr_auto_note_hw').replace('{name}', d.name).replace('{n}', d.homeworkEntries.length).replace('{avg}', d.homeworkAvg));
  }
  const dualTotal = d.dualWins + d.dualLosses + d.dualTies;
  if (dualTotal) {
    parts.push(t('mr_auto_note_dual').replace('{w}', d.dualWins).replace('{l}', d.dualLosses).replace('{t}', d.dualTies));
  }
  if (d.resolvedThisMonth.length) {
    parts.push(t('mr_auto_note_errors').replace('{n}', d.resolvedThisMonth.length));
  }
  if (!parts.length) {
    parts.push(t('mr_auto_note_empty').replace('{name}', d.name));
  }
  parts.push(t('mr_auto_note_memo').replace('{scope}', d.memoScope));
  return parts.join(' ');
}

function renderNoteBox() {
  const input = $('mr-custom-note-input');
  const custom = input ? input.value.trim() : '';
  setText('mr-note-text', custom || (reportData ? buildAutoNote(reportData) : ''));
}

function renderTeacherSign(d) {
  setText('mr-teacher-name-meta', d.teacher.name);
  setText('mr-sign-name', d.teacher.name);
  const img = $('mr-sign-img');
  if (img) {
    if (d.teacher.signature) { img.src = d.teacher.signature; img.style.display = 'block'; }
    else { img.style.display = 'none'; }
  }
}

function renderAll(d) {
  reportData = d;
  const stage = $('mr-stage-inner');
  if (stage) stage.className = 'tier-good';

  setText('mr-title-period', d.periodLabel);
  setText('mr-student-name', d.name);
  setText('mr-student-scope', d.memoScope);
  setText('mr-generated-date', d.generatedDate);
  setText('mr-footer-date', d.generatedDate);
  setText('mr-footer-id', d.id);
  applyAvatar(d.avatar);

  renderSummaryTiles(d);
  renderGameEvalBlock(d);
  renderHomeworkBlock(d);
  renderDualBlock(d);
  renderAchievementsBlock(d);
  renderErrorsBlock(d);
  renderReviewBlock(d);
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
        document.fonts.load('700 14px Cairo'), document.fonts.load('600 13px Cairo'), document.fonts.load('800 14px Cairo')
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
function buildFileName(ext) {
  const namePart = slugifyForFilename(reportData.name);
  const periodPart = slugifyForFilename(reportData.periodLabel);
  return `تقرير_شهري_${namePart}_${periodPart}.${ext}`;
}
const HQ_SCALE = 3;

// 🌟 نفس مفتاح تسجيل "عدد التقارير المُصدَّرة" المستخدم فعليًا في reports/report.js
// (بطاقة "نظرة سريعة" بالشاشة الرئيسية) — إعادة استخدام نفس اسم المفتاح مباشرة في
// localStorage (بلا أي استيراد كودي من report.js) يجعل التقارير الشهرية تُحتسب ضمن
// نفس العدّاد تلقائيًا، دون أي تغيير في report.js أو في مكان قراءة هذا العدّاد.
const REPORTS_LOG_KEY = 'darham_reports_log';
const REPORTS_LOG_MAX = 300;
function logReportGenerated() {
  try {
    const raw = localStorage.getItem(REPORTS_LOG_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(list) ? list : [];
    arr.push(new Date().toISOString());
    localStorage.setItem(REPORTS_LOG_KEY, JSON.stringify(arr.slice(-REPORTS_LOG_MAX)));
  } catch (e) { /* تجاهل */ }
}

async function exportPng() {
  await ensureHtml2Canvas();
  await ensureFontsReady();
  const target = currentTarget();
  const canvas = await window.html2canvas(target, {
    scale: HQ_SCALE, backgroundColor: '#f9f4ea', useCORS: true,
    ignoreElements: ignoreNoExport
  });
  const link = document.createElement('a');
  link.download = buildFileName('png');
  link.href = canvas.toDataURL('image/png');
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

async function exportPdf() {
  await ensureHtml2Canvas();
  await ensureJsPdf();
  await ensureFontsReady();
  const target = currentTarget();

  const domBlocks = collectPdfBlocks(target);

  const canvas = await window.html2canvas(target, {
    scale: HQ_SCALE, backgroundColor: '#f9f4ea', useCORS: true,
    ignoreElements: ignoreNoExport
  });

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const pageWidthPt = pdf.internal.pageSize.getWidth();
  const pageHeightPt = pdf.internal.pageSize.getHeight();
  // 🌟 إصلاح: نفس إصلاح reports/report.js — إلغاء الهامش الجانبي (كان يُظهر
  // حواف بيضاء واضحة حول محتوى التقرير الكريمي اللون) وتعبئة خلفية كل صفحة
  // بلون التقرير نفسه (#f9f4ea) قبل رسم الصورة، حتى لا تبدو آخر صفحة (لو
  // تبقّى فيها قسم صغير فقط) بها فراغ أبيض فجّ أسفلها.
  const REPORT_BG_RGB = [249, 244, 234]; // يقابل #f9f4ea
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
    ctx.fillStyle = '#f9f4ea';
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
// 5) نقطة الدخول
// -----------------------------------------------------------------------------
function goBackToProfile() {
  // 🌟 dynamic import عمدًا (بدل استيراد ثابت من student/student.js أعلى الملف) —
  // نفس نمط التنقل المستخدم فعليًا في core/app.js (openHomeworkPrep/openDualTestSetup)،
  // يتجنّب أي حلقة استيراد ثابتة بين هذا الملف وstudent.js.
  import('../student/student.js').then(m => m.loadStudentProfileScreen()).catch(err => {
    console.error('[monthly-report.js] تعذر العودة لملف الطالب:', err);
  });
}

function initMonthlyReportScreen() {
  populateMonthYearSelects();
  refreshReport();

  const noteInput = $('mr-custom-note-input');
  if (noteInput) noteInput.addEventListener('input', renderNoteBox);

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
        if (reportData) { reportData.teacher.signature = dataUrl; renderTeacherSign(reportData); }
      };
      reader.readAsDataURL(file);
    });
  }

  const pngBtn = $('btn-mr-png');
  const pdfBtn = $('btn-mr-pdf');
  if (pngBtn) pngBtn.addEventListener('click', withBusyLabel(pngBtn, t('mr_exporting'), exportPng));
  if (pdfBtn) pdfBtn.addEventListener('click', withBusyLabel(pdfBtn, t('mr_exporting'), exportPdf));

  const backBtn = $('btn-mr-back');
  const backBtn2 = $('btn-mr-back-2');
  if (backBtn) backBtn.addEventListener('click', goBackToProfile);
  if (backBtn2) backBtn2.addEventListener('click', goBackToProfile);
}

export function openMonthlyReportScreen() {
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
  try { applyLanguage(); } catch (e) { /* غير حرِج */ }
  initMonthlyReportScreen();
}
