// =============================================================================
// reports/report.js
// شاشة تقرير التقييم — التصميم الجديد "تحليل الأداء" (يحل محل تصميمَي الرسالة
// اليومية/بطاقة الرحلة القديمَين بالكامل).
//
// الإضافات في هذه النسخة (بناءً على طلبكم):
//   1) مكان لسحب/رفع صورة الطالب (أو الضغط لاختيارها) داخل الدائرة الرمزية.
//   2) اسم المعلم وتوقيعه في نهاية التقرير (نص + إمكانية رفع صورة توقيع).
//   3) زر "العودة للرئيسية" في نهاية التقرير.
//   4) تصدير كصورة PNG عالية الجودة أو ملف PDF.
//   5) ملف PDF عالي الجودة ومقسّم على عدة صفحات A4 بدون قصّ أي عنصر منتصفه
//      وبدون ترك فراغات كبيرة — كل صفحة تُملأ بأكبر قدر ممكن من المحتوى قبل
//      الانتقال للتالية (تفصيل الخوارزمية في "طبقة تقسيم PDF" بالأسفل).
//
// ⚠️ نقطة تحتاج تأكيدك: اسم المعلم الحقيقي غير متوفر بعد كحقل مسجَّل (كما
// اتفقنا)، لذا نحاول أولًا قراءته من AppState (لو صار متاحًا لاحقًا)، وإلا
// نستخدم آخر اسم/توقيع أدخلهما المعلم يدويًا من شريط الأدوات (محفوظان في
// localStorage) — عدّل getTeacherIdentity() فور توفر نظام تسجيل دخول حقيقي.
// =============================================================================

import { AppState, applyLanguage, loadDashboardScreen } from '../core/app.js';
// التنسيق (CSS) منقول بالكامل إلى report.styles.js بدل تضخيم هذا الملف —
// نفس المحتوى تمامًا، منظَّم في ملف مستقل فقط.
import { REPORT_STYLES } from './report.styles.js';
// 🌟 [جديد] هذا الملف كان عربيًا بالكامل بنصوص مكتوبة مباشرة بلا أي ربط بنظام الترجمة.
// لم نغيّر ذلك في النصوص القديمة (حتى لا نمسّ شيئًا يعمل حاليًا)، لكن كل نص *جديد*
// أضفناه في صندوق "بحاجة إلى تركيز" يمرّ عبر t() وله مفتاحان (عربي/إنجليزي) في
// core/i18n.js — التزامًا بقاعدة "كل نص جديد في الواجهة يدعم اللغتين" 🌟
import { t } from '../core/i18n.js';

// 🌟 [إصلاح] كان هذا الملف يستورد GameState بشكل ثابت من games/adultGame.js فقط
// (راجع تعليق TODO القديم اللي كان هنا)، فلما كانت لعبة الأطفال (kidsGame.js) هي
// اللي انتهت فعليًا — ولها GameState خاص بها منفصل تمامًا عن adultGame.js — كان
// التقرير يقرأ GameState.reportDetails الفاضي بتاع adultGame.js دايمًا، فتطلع كل
// الأسئلة "غير موجودة" (totalMax = 0) ويرجع مسار احتياطي خاطئ تمامًا (راجع تعليق
// النسبة الاحتياطية بالأسفل) — وهو بالضبط سبب ظهور نسب غير منطقية زي 154%.
// الحل: لا نستورد GameState من أي ملف لعبة بعينه، بل نستقبله كمعامل من المستدعي
// نفسه (adultGame.js أو kidsGame.js، كل واحد بيمرر GameState بتاعه) عند فتح
// التقرير، ونخزّنه هنا في هذا المتغيّر لحين إعادة بناء بيانات التقرير 🌟
let activeGameState = null;

// -----------------------------------------------------------------------------
// 0) القالب الكامل لشاشة التقرير — مضمَّن هنا كنص مباشرة بدل تحميله من ملف
// HTML منفصل عبر fetch (نفس الحل الذي أصلح مشكلة "التقرير المبتور" سابقًا،
// لأن أداة الـ Live Reload عندكم كانت تتدخل في استجابات fetch لملفات HTML
// تحديدًا). REPORT_STYLES المستوردة أعلاه تُحقن هنا كوسم <style> عادي —
// نفس آلية الحقن المباشر تمامًا، فلا علاقة لها بمشكلة الـ fetch تلك.
// (لا يوجد بعد الآن ملف report.html منفصل يُطابق هذا القالب — كان نسخة
// مكررة غير مستخدمة فعليًا في التشغيل، وحذفه أزال خطر تعارض النسختين.)
// -----------------------------------------------------------------------------
// 🌟 زخارف الصفحة — صور حقيقية مقصوصة من التصميم المرجعي الذي اعتمده المعلم، لا رسوم
// SVG يدوية (المحاولة اليدوية لم تكن مقنعة بصريًا). الملفات في assets/report/ والمسار
// نسبي لجذر الموقع (index.html) بنفس أسلوب assets/kids_bg/ المستخدم فعلاً في core/app.js.
// ⚠️ مهم: html2canvas يلتقط الصور المحمَّلة فقط — راجع ensureArtReady() أسفل الملف،
// فهي تنتظر اكتمال تحميل هذه الصور قبل أي تصدير وإلا خرجت فارغة في PNG/PDF.
const ART_DIR = 'assets/report/';
const cornerOrnImg = (cls) => `<img class="corner-orn ${cls}" src="${ART_DIR}report-corner-orn.png" alt="">`;

// 🌟 ثلاث نجمات في قلب الدائرة: عدد الممتلئ منها يعبّر عن المستوى الفعلي (getTier)
// — ممتاز 3، جيد 2، متوسط 1، بحاجة إلى دعم 0 — والباقي يُرسم كحدٍّ باهت حتى يبقى
// عدد الأشكال ثابتًا فلا يتغيّر اتزان التصميم بتغيّر النتيجة.
const STAR_PATH = 'M10 1.6l2.5 5.3 5.6.7-4.1 4 1.1 5.6L10 14.5l-5.1 2.7 1.1-5.6-4.1-4 5.6-.7z';
function starSvg(filled, size){
  const s = size || 15;
  return filled
    ? `<svg width="${s}" height="${s}" viewBox="0 0 20 20" aria-hidden="true"><path d="${STAR_PATH}" fill="#d4af37"/></svg>`
    : `<svg width="${s}" height="${s}" viewBox="0 0 20 20" aria-hidden="true"><path d="${STAR_PATH}" fill="none" stroke="#e4d9c4" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
}
const STARS_BY_TIER = { excellent: 3, good: 2, average: 1, weak: 0 };

const REPORT_TEMPLATE = `
<style>${REPORT_STYLES}</style>

<div id="report-screen">

  <div class="report-toolbar">
    <div class="grp">
      <span class="grp-label" data-i18n="rep_tb_teacher_data">بيانات المعلم</span>
      <input type="text" id="report-teacher-name-input" class="teacher-name-input" data-i18n-placeholder="rep_tb_teacher_name_ph" placeholder="اسم المعلم">
      <button class="rbtn ghost" id="btn-teacher-sig">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        <span data-i18n="rep_tb_upload_stamp">رفع ختم المعلم</span>
      </button>
      <input type="file" id="report-teacher-sig-input" accept="image/*" style="display:none;">
    </div>
    <div class="grp">
      <span class="grp-label" data-i18n="rep_tb_export">تصدير</span>
      <button class="rbtn primary" id="btn-report-png">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="M21 15l-5-5L5 21"></path></svg>
        <span data-i18n="rep_tb_png">صورة مختصرة</span>
      </button>
      <button class="rbtn" id="btn-report-pdf">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path></svg>
        <span data-i18n="rep_tb_pdf">ملف PDF شامل</span>
      </button>
    </div>
    <div class="grp">
      <button class="rbtn ghost" id="btn-report-home">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7"/><path d="M9 22V12h6v10"/></svg>
        <span data-i18n="rep_tb_home">العودة للرئيسية</span>
      </button>
    </div>
  </div>
  <div class="note-bar">
    <label for="report-custom-note-input" data-i18n="rep_tb_note_label">ملاحظة لولي الأمر (اختياري):</label>
    <textarea id="report-custom-note-input" data-i18n-placeholder="rep_tb_note_ph" placeholder="اكتب هنا ملاحظتك الخاصة لولي الأمر — إن تركتها فارغة سيظهر تعليق تلقائي مبني على نتيجة الاختبار."></textarea>
    <span class="hint" data-i18n="rep_tb_note_hint">تظهر في صندوق "ملاحظة المعلم" بالأسفل</span>
  </div>
  <div class="note-bar">
    <label for="report-extra-note-input" data-i18n="rep_tb_extra_label">نص إضافي داخل التقرير (اختياري):</label>
    <textarea id="report-extra-note-input" data-i18n-placeholder="rep_tb_extra_ph" placeholder="أي نص إضافي تحب إضافته داخل التقرير — اتركه فارغًا إن لم تكن بحاجة إليه."></textarea>
    <span class="hint" data-i18n="rep_tb_extra_hint">يظهر كصندوق منفصل، ولا يظهر إطلاقًا لو تُرك فارغًا</span>
  </div>

  <div class="report-stage">
    <div id="report-stage-inner" class="tier-excellent">
      <div>

      <div class="page" id="report-page" dir="rtl">
        ${cornerOrnImg('tr')}
        ${cornerOrnImg('tl')}
        ${cornerOrnImg('br')}
        ${cornerOrnImg('bl')}

        <div class="pdf-block" id="report-intro-block">

          <div class="dh-head">
            <img class="head-art" src="${ART_DIR}report-quran-rehl.png" alt="">
            <img class="head-star" src="${ART_DIR}report-star-cluster.png" alt="">
            <div class="eyebrow" data-i18n="rep_eyebrow">دار حم · منصة تحفيظ القرآن الكريم</div>
            <h1 class="r-title" data-i18n="rep_title">تقرير تقدّم الطالب</h1>
            <div class="r-subtitle" data-i18n="rep_subtitle">في حفظ القرآن الكريم</div>
            <div class="r-tagline" data-i18n="rep_tagline">خطوة بخطوة ... نحو كتاب الله</div>
          </div>

          <div class="top-row">
            <div class="student-card">
              <div class="avatar-wrap">
                <div class="avatar-circle" id="report-avatar-circle" data-i18n-title="rep_avatar_hint" title="اضغط أو اسحب صورة لتغيير صورة الطالب">
                  <img id="report-avatar-img" style="display:none;" alt="">
                </div>
                <button type="button" class="avatar-edit-btn no-export" id="report-avatar-edit-btn" data-i18n-title="rep_avatar_change" title="تغيير صورة الطالب">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/></svg>
                </button>
                <input type="file" id="report-avatar-input" accept="image/*" style="display:none;">
              </div>
              <div class="student-body">
                <div class="student-name" id="report-student-name">--</div>

                <div class="fact" id="report-fact-grade" style="display:none;">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#147c5e" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg>
                  <span><span data-i18n="rep_fact_grade">الصف</span>: <b id="report-grade-val">--</b></span>
                </div>

                <div class="fact" id="report-fact-scope" style="display:none;">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#147c5e" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1"/></svg>
                  <span><span data-i18n="rep_fact_scope">نطاق التقييم</span>: <b id="report-scope-val">--</b></span>
                </div>

                <div class="fact" id="report-fact-time" style="display:none;">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#147c5e" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.4"/><path d="M12 7.6V12l2.9 1.7"/></svg>
                  <span><span data-i18n="rep_fact_duration">مدة التقييم</span>: <b id="report-time-val">--</b></span>
                </div>
              </div>
            </div>

            <div class="gauge-card">
              <div class="gauge-wrap">
                <svg width="158" height="158" viewBox="0 0 208 208">
                  <circle cx="104" cy="104" r="86" fill="none" stroke="#e4d9c4" stroke-width="17"></circle>
                  <circle class="gauge-arc" id="report-gauge-arc" cx="104" cy="104" r="86" fill="none" stroke-width="17"
                    stroke-linecap="round" stroke-dasharray="540.35" stroke-dashoffset="0"
                    transform="rotate(-90 104 104)"></circle>
                </svg>
                <div class="gauge-center">
                  <div class="gauge-stars" id="report-gauge-stars"></div>
                  <div class="gauge-pct" id="report-gauge-pct">--</div>
                  <div class="gauge-tier" id="report-gauge-tier">--</div>
                </div>
              </div>
              <div class="gauge-foot">
                <span class="gauge-label" data-i18n="rep_this_eval">نتيجة هذا التقييم</span>
                <span class="delta" id="report-delta" style="display:none;"></span>
              </div>
            </div>
          </div>

          <p class="honesty-line" id="report-honesty-line"></p>
        </div>

        <div class="ladder-card pdf-block">
          <div class="sec-head">
            <h3 class="section-title" data-i18n="rep_ladder_title">مستوى التقدّم العام</h3>
            <p class="section-sub" data-i18n="rep_ladder_sub">مقارنة هذا التقييم بآخر محاولات الطالب المسجَّلة</p>
          </div>
          <div id="report-ladder-wrap"></div>
        </div>

        <!-- 🌟 جدول الأسئلة — الجزء الوحيد الذي يختفي في الصورة المختصرة (class="pdf-only") -->
        <div class="qlist pdf-only">
          <div class="pdf-block" id="report-qhead-group">
            <div class="sec-head">
              <h3 class="section-title" data-i18n="rep_qtable_title">تفاصيل الاختبار — سؤالًا بسؤال</h3>
              <p class="section-sub" data-i18n="rep_qtable_sub">كل الأسئلة التي وردت في هذا الاختبار كما جرت بالفعل، دون حذف</p>
            </div>
            <div class="qgrid-head" id="report-qgrid-head">
              <div data-i18n="rep_col_num">م</div>
              <div data-i18n="rep_col_status">الاستجابة</div>
              <div data-i18n="rep_col_subject">السؤال / الموضوع</div>
              <div data-i18n="rep_col_score">الدرجة</div>
              <div data-i18n="rep_col_note">ملاحظة</div>
            </div>
            <div id="report-qrow-first"></div>
          </div>
          <div id="report-qrows-rest"></div>
        </div>

        <!-- ⚠️ شرائط العدّ خارج بطاقة الجدول عمدًا حتى تبقى ظاهرة في الصورة المختصرة -->
        <div class="chips-row pdf-block">
          <span class="chip-status chip-full">
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.2" stroke="currentColor" stroke-width="1.7"/><path d="M6.4 10.2l2.4 2.4 4.8-5.1" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
            <span data-i18n="rep_chip_full">صحيحة بالكامل</span>: <span id="report-count-full">0</span>
          </span>
          <span class="chip-status chip-partial">
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.2" stroke="currentColor" stroke-width="1.7"/><path d="M10 5.6V10l3 1.8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
            <span data-i18n="rep_chip_partial">صحيحة جزئيًا</span>: <span id="report-count-partial">0</span>
          </span>
          <span class="chip-status chip-wrong">
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.2" stroke="currentColor" stroke-width="1.7"/><path d="M7.4 7.4l5.2 5.2M12.6 7.4l-5.2 5.2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
            <span data-i18n="rep_chip_wrong">غير صحيحة</span>: <span id="report-count-wrong">0</span>
          </span>
        </div>

        <div class="stat-line pdf-block">
          <span class="stat-item">
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="#a79a83" stroke-width="1.6"/><path d="M10 6v4.3l3 1.7" stroke="#a79a83" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span data-i18n="rep_stat_avgtime">متوسط وقت الإجابة</span>: <b id="report-stat-avgtime">--</b>
          </span>
          <span class="stat-item">
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M10 3.5a4.5 4.5 0 0 0-2.4 8.3c.5.3.9.9.9 1.5v.4h3v-.4c0-.6.4-1.2.9-1.5A4.5 4.5 0 0 0 10 3.5z" stroke="#a79a83" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.7 16.3h2.6M9.1 17.8h1.8" stroke="#a79a83" stroke-width="1.6" stroke-linecap="round"/></svg>
            <span data-i18n="rep_stat_hints">تلميحات مستخدمة</span>: <b id="report-stat-hints">0</b>
          </span>
          <span class="stat-item">
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M4 10a6 6 0 0 1 10.2-4.2M16 10a6 6 0 0 1-10.2 4.2" stroke="#a79a83" stroke-width="1.6" stroke-linecap="round"/><path d="M14 3.5v2.6h-2.6M6 16.5v-2.6h2.6" stroke="#a79a83" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span data-i18n="rep_stat_reorders">محاولات ترتيب متكررة</span>: <b id="report-stat-reorders">0</b>
          </span>
        </div>

        <div class="insights pdf-block">
          <div class="insight-card good">
            <div class="insight-head">
              <svg width="19" height="19" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="#10694c"/><path d="M10 4.4l1.8 3.7 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6z" fill="#fffdf8"/></svg>
              <span class="insight-title" data-i18n="rep_strengths">نقاط القوة</span>
            </div>
            <ul class="insight-list" id="report-strengths-list"></ul>
          </div>
          <div class="insight-card focus">
            <div class="insight-head">
              <svg width="19" height="19" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.4" fill="#9e3b2d"/><circle cx="10" cy="10" r="4.6" stroke="#fffdf8" stroke-width="1.5" fill="none"/><circle cx="10" cy="10" r="1.2" fill="#fffdf8"/></svg>
              <span class="insight-title" data-i18n="rep_needs">بحاجة إلى تركيز</span>
            </div>
            <ul class="insight-list" id="report-needs-list"></ul>
          </div>
        </div>

        <div class="note-box pdf-block">
          <div class="note-head">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0b3d30" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2 2 0 0 1 6 4h4.5v16H6a2 2 0 0 1-2-2z"/><path d="M20 5.5A2 2 0 0 0 18 4h-4.5v16H18a2 2 0 0 0 2-2z"/></svg>
            <span class="note-label" data-i18n="rep_note_label">ملاحظة المعلم لولي الأمر</span>
          </div>
          <p class="note-text" id="report-note-text"></p>
        </div>

        <!-- صندوق اختياري: يظهر فقط لو المعلم كتب نصًا إضافيًا من شريط الأدوات
             أعلى الشاشة (report-extra-note-input) — يبقى مخفيًا تمامًا (display:none)
             ولا يأخذ أي مساحة في الصورة أو PDF إن تُرك فارغًا. -->
        <div class="note-box pdf-block" id="report-extra-note-block" style="display:none;">
          <div class="note-head">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0b3d30" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2 2 0 0 1 6 4h4.5v16H6a2 2 0 0 1-2-2z"/><path d="M20 5.5A2 2 0 0 0 18 4h-4.5v16H18a2 2 0 0 0 2-2z"/></svg>
            <span class="note-label" data-i18n="rep_extra_label">ملاحظة إضافية</span>
          </div>
          <p class="note-text" id="report-extra-note-text"></p>
        </div>

        <div class="closing pdf-block">
          <div class="footer-meta">
            <span data-i18n="rep_report_no">رقم التقرير</span>: <b id="report-footer-id" dir="ltr">--</b><br>
            <span data-i18n="rep_date">التاريخ</span>: <b id="report-footer-date">--</b><span id="report-footer-hijri"></span>
          </div>
          <div class="sign">
            <!-- 🌟 ختم المعلم الرسمي المرفوع في "ملف المعلم" (teacherDB.stamp) — فوق سطر
                 الاسم مباشرة كما في التقارير الرسمية، ومخفي تمامًا بحاويته إن لم يُرفع
                 فلا يترك أي فراغ أعلى الاسم -->
            <div class="stamp-wrap" id="report-stamp-wrap" style="display:none;">
              <img class="stamp-img" id="report-stamp-img" alt="">
            </div>
            <div class="sign-line"></div>
            <div class="sign-name" id="report-sign-name">المعلم</div>
            <div class="teacher-label" id="report-sign-label">المعلم</div>
          </div>
        </div>
      </div>

      <div class="home-bar no-export">
        <button class="home-btn" id="btn-report-home-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7"/><path d="M9 22V12h6v10"/></svg>
          <span data-i18n="rep_tb_home">العودة للرئيسية</span>
        </button>
      </div>

      </div>
    </div>
  </div>
</div>

`;

// -----------------------------------------------------------------------------
// 1) طبقة قراءة البيانات الحقيقية
// -----------------------------------------------------------------------------

function formatDateArabic(d){
  const dd = d.getDate(), mm = d.getMonth() + 1, yyyy = d.getFullYear();
  return `${yyyy} / ${String(mm).padStart(2,'0')} / ${String(dd).padStart(2,'0')}`;
}

// 🌟 [جديد] التاريخ الهجري بجانب الميلادي في تذييل التقرير — عبر Intl المدمج في
// المتصفح بلا أي مكتبة خارجية (نفس تفضيل المشروع المعلن). يرجع سلسلة فارغة لو لم
// يدعم المتصفح تقويم أم القرى، فيختفي السطر الهجري تمامًا بدل أن يظهر ناقصًا أو خطأ.
// ملاحظة: Intl يُلحق "هـ" بنفسه، فلا تُضاف يدويًا وإلا تكررت.
function formatDateHijri(d){
  try {
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'long', year: 'numeric'
    }).format(d);
  } catch (e) { return ''; }
}
// صيغة مختصرة (يوم / شهر) لمحطات سُلّم التقدّم حتى لا يتزاحم النص تحت كل نجمة
function shortDateLabel(dateStr){
  const parts = String(dateStr || '').split('/').map(s => s.trim());
  return parts.length >= 3 ? `${parts[2]} / ${parts[1]}` : String(dateStr || '');
}

const HISTORY_MAX = 7; // نقرأ ونحفظ آخر 7 محاولات فقط — نفس السقف الذي كان معمولاً به
function historyKey(studentId){ return `history_${studentId}`; }

function getHistory(studentId){
  try {
    const raw = localStorage.getItem(historyKey(studentId));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.slice(-HISTORY_MAX) : [];
  } catch (e) { return []; }
}

// 🌟 [جديد — مهم] كان `history_<id>` يُقرأ هنا فقط ولا يكتبه أي ملف في المنصة إطلاقًا
// (تحقّقنا: لا وجود لأي setItem على هذا المفتاح في أي ملف)، فكان رسم "الأداء عبر آخر
// التقييمات" يعود دائماً للمسار الاحتياطي بمحاولة واحدة فقط هي الحالية. بلا كتابة فعلية
// للسجل لا يمكن أن يوجد "سُلّم تقدّم" ولا "فرق عن المحاولة السابقة" أصلاً.
//
// 🌟 افتراض صريح غير محسوم: نعتبر أن كل فتح لشاشة التقرير = محاولة واحدة مكتملة جديرة
// بالتسجيل (لأن التقرير لا يُفتح إلا بعد انتهاء تقييم فعلي). لتفادي تسجيل مكرر لو أُعيد
// بناء الشاشة لأي سبب، نتجاهل الإضافة إن كان آخر سجل مطابقاً تماماً (نفس اليوم ونفس
// النتيجة ونفس النطاق). لو رغب المعلم لاحقاً في ربط التسجيل بحدث "إنهاء الاختبار" داخل
// adultGame.js/kidsGame.js بدل فتح التقرير، فهذا هو المكان الوحيد الذي يحتاج تعديلاً.
function appendHistoryEntry(studentId, entry){
  if (studentId == null) return;
  try {
    const arr = getHistory(studentId);
    const last = arr[arr.length - 1];
    if (last && last.date === entry.date && last.score === entry.score && last.range === entry.range) return;
    arr.push(entry);
    localStorage.setItem(historyKey(studentId), JSON.stringify(arr.slice(-HISTORY_MAX)));
  } catch (e) { /* تجاهل — لا نمنع عرض التقرير بسبب فشل حفظ السجل فقط */ }
}

// ✅ مطابقة فعلية لشكل GameState.reportDetails كما هو موجود بالحرف في
// games/adultGame.js (دالة recordAnswer):
//   { label, num, surahName, text, isCorrect, errors, usedHint, timeTaken, orderAttempts }
function computeQuestionScore(d){
  if (!d.isCorrect) return 0;
  if (d.orderAttempts === 1) return 8;
  if (d.orderAttempts >= 2) return 6;
  if (d.usedHint) return 8;
  return 10;
}
// تصنيف صادق لكل سؤال: صحيحة بالكامل / صحيحة بمساعدة تلميح / صحيحة بعد
// إعادة ترتيب / غير صحيحة — هذا التصنيف هو ما يبني عليه التقرير كل شيء
// (الأيقونة، اللون، النقاط، والملاحظة أسفل كل سؤال).
// ⚠️ الترتيب هنا مطابق بالحرف لأولوية computeQuestionScore بالأعلى (محاولات
// الترتيب أولًا، ثم التلميح)، حتى لا يظهر أبدًا سؤال بأيقونة "صحيحة بالكامل"
// بينما نقاطه الفعلية أقل من 10 — وهو بالضبط ما تعنيه "الصدق" في هذا التقرير.
function classifyQuestion(d){
  if (!d.isCorrect) return 'wrong';
  if (d.orderAttempts >= 1) return 'reorder';
  if (d.usedHint) return 'hint';
  return 'full';
}
function questionNoteText(d, status){
  if (status === 'hint') return 'استخدم تلميحًا للوصول إلى الإجابة';
  if (status === 'reorder') {
    return d.orderAttempts >= 2
      ? 'احتاج أكثر من محاولة لترتيب الكلمات بشكل صحيح'
      : 'احتاج محاولة إضافية لترتيب الكلمات بشكل صحيح';
  }
  if (status === 'wrong') {
    if (Array.isArray(d.errors) && d.errors.length) return 'خطأ: ' + d.errors.join('، ');
    return 'إجابة غير صحيحة';
  }
  return '';
}
function getQuestionResults(){
  const details = (activeGameState && Array.isArray(activeGameState.reportDetails)) ? activeGameState.reportDetails : [];
  if (!details.length) return [];
  return details.map((d, i) => {
    const status = classifyQuestion(d);
    return {
      num: i + 1,
      type: d.label || d.question || d.title || 'سؤال',
      location: d.surahName
        ? `سورة ${d.surahName}${d.num != null ? ' - آية ' + d.num : ''}`
        : (d.location || d.ayahRef || d.reference || ''),
      text: d.text || '',
      status,
      score: computeQuestionScore(d),
      max: 10,
      note: questionNoteText(d, status),
      timeTaken: typeof d.timeTaken === 'number' ? d.timeTaken : null,
      usedHint: !!d.usedHint,
      orderAttempts: d.orderAttempts || 0
    };
  });
}

function formatDuration(totalSeconds){
  if (!totalSeconds || totalSeconds <= 0) return '—';
  const m = Math.floor(totalSeconds / 60), s = Math.round(totalSeconds % 60);
  return m > 0 ? `${m} د ${s} ث` : `${s} ث`;
}
function buildStats(questionResults){
  const withTime = questionResults.filter(r => typeof r.timeTaken === 'number');
  const totalTime = withTime.reduce((s, r) => s + r.timeTaken, 0);
  const avgTime = withTime.length ? totalTime / withTime.length : 0;
  return {
    totalTime: withTime.length ? formatDuration(totalTime) : ((activeGameState && activeGameState.totalTimeLabel) || '—'),
    avgTime: withTime.length ? formatDuration(avgTime) : ((activeGameState && activeGameState.avgTimeLabel) || '—'),
    // 🌟 [جديد] القيمة الرقمية الخام لمتوسط الزمن (بالثواني) — تُحفظ في سجل الطالب
    // ليصبح من الممكن مقارنة سرعة هذه المحاولة بمتوسط محاولاته السابقة فعليًا.
    // null عند غياب أي قياس زمني، فلا تُحفظ قيمة وهمية ولا تُبنى عليها أي مقارنة.
    avgTimeSec: withTime.length ? Math.round(avgTime) : null,
    hints: questionResults.filter(r => r.usedHint).length,
    // 🌟 [إصلاح] كانت تحسب فقط الأسئلة التي احتاجت محاولتين خاطئتين فأكثر (orderAttempts >= 2)،
    // فأي سؤال ترتيب/ربط أُخطئ فيه مرة واحدة فقط (orderAttempts === 1) كان لا يُحتسب هنا إطلاقاً
    // رغم أنه بالفعل أُعيدت محاولته وظهر في تصنيف السؤال (classifyQuestion) كـ"reorder" وخُصمت من
    // درجته (8/10 بدل 10/10) — تناقض بين تصنيف كل سؤال على حدة والإحصائية الإجمالية. الصواب: أي
    // محاولة خاطئة واحدة على الأقل عند الترتيب/الربط تُحتسب "محاولة متكررة"، بنفس عتبة
    // classifyQuestion تمامًا (orderAttempts >= 1) 🌟
    reorders: questionResults.filter(r => r.orderAttempts >= 1).length
  };
}

// TODO: نظام المهارات الحقيقي عندكم (analyzeSkills()) يرجّع تفاصيل أدق —
// لو الدالة متاحة استوردها واستخدمها بدل هذا التبسيط. حاليًا نبني نقاط
// القوة/التركيز من نتائج الأسئلة الفعلية + currentStudent.weaknesses
// (عناصرها كائنات {text, num, surahName, errorTypes} كما في adultGame.js).
//
// 🌟 [إعادة تصميم كاملة لصندوق "بحاجة إلى تركيز"] 🌟
// السلوك القديم: كان الصندوق يأخذ أول 3 عناصر من student.weaknesses فقط، ولا
// ينزل لأخطاء الاختبار الحالي إلا إذا كان السجل فارغًا تمامًا. ولأن weaknesses
// سجل *تراكمي* عبر كل الجلسات (كبار + أطفال) ولا يُشطب منه بند إلا بعد نجاح
// الطالب فيه داخل "تحدي تصحيح الأخطاء"، كانت النتيجة أن:
//   1) بندًا قديمًا من جلسة سابقة يظهر لولي الأمر وكأنه خطأ ابنه في اختبار اليوم،
//   2) وأخطاء اليوم الحقيقية قد لا تظهر إطلاقًا لأن السجل القديم يحجبها،
//   3) والأسئلة التي حُلّت بتلميح أو بعد إعادة ترتيب (وخُصمت درجتها فعلًا 8/10)
//      لا تظهر أبدًا رغم أنها أصدق مؤشر على "حفظ غير مثبَّت".
//
// السلوك الجديد — ثلاث طبقات بترتيب صارم، كلٌّ منها بعنوان فرعي ظاهر في التقرير
// حتى يعرف ولي الأمر مصدر كل بند بالضبط:
//   الطبقة 1: أخطاء اختبار اليوم        (status === 'wrong')            حتى 3 بنود
//   الطبقة 2: ما يحتاج تثبيتًا اليوم      (status === 'hint' | 'reorder') حتى بندين
//   الطبقة 3: متابعة من جلسات سابقة      (student.weaknesses)            حتى بندين
//   وإن خلت الثلاث: السطر الثابت المعتاد كما كان تمامًا.
// بسقف إجمالي 4 بنود، مع ذكر عدد ما زاد صراحة ("+ن بندًا آخر") بدل إخفائه صامتًا.
//
// افتراضات صرّحنا بها بدل تنفيذها بصمت:
//   • "متابعة سابقة" = أي عنصر باقٍ في weaknesses لم يُعالَج بعد، أيًّا كان مصدره
//     (ركن الكبار أو ركن الأطفال) وأيًّا كان نطاق اختبار اليوم — لأن السجل نفسه
//     لا يحمل ما يربطه بنطاق بعينه.
//   • عمر البند يُحسب من w.dateRecorded المخزَّن فعلًا في errorObj، ويُعرض كما هو
//     دون تقريب؛ وأي سجل قديم بلا هذا الحقل يظهر بلا ذكر عمر بدل تخمينه.
//   • تطابق بند اليوم مع بند في السجل القديم يُعتبر "خطأ متكرر" ويُدمجان في بند
//     واحد، والمقارنة بنص السؤال (reportText) بعد تجريد التشكيل — نفس مفتاح
//     المقارنة المستخدم في adultGame.js/kidsGame.js بالحرف.
// -----------------------------------------------------------------------------
const FOCUS_MAX_TOTAL   = 4;  // سقف بنود الصندوق كله
const FOCUS_MAX_TODAY   = 3;  // سقف أخطاء اليوم
const FOCUS_MAX_PARTIAL = 2;  // سقف "يحتاج تثبيتًا"
const FOCUS_MAX_PAST    = 2;  // سقف المتابعة السابقة

// تجريد النص من التشكيل والتطويل وعلامات الآية قبل المقارنة — نفس فلسفة
// normalizeForCompare في ملفات الألعاب، منسوخة هنا محليًا فقط حتى يبقى التقرير
// غير مرتبط بأي ملف لعبة بعينه (وهو ما أصلح مشكلة GameState الموضّحة بأعلى).
function normalizeFocusKey(text){
  return String(text || '')
    .replace(/[ً-ْٰـۖ-ۭ]/g, '')
    // توحيد صور الهمزة والألف المقصورة والتاء المربوطة أيضًا — لأن البند القديم قد
    // يكون مخزَّنًا بصيغة إملائية مختلفة قليلًا عن نص اليوم، فلا يُكتشف التكرار.
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[﴿﴾()[\]:،.\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
// صياغة سطر الفائض بصيغة عربية سليمة (مفرد/مثنى/جمع قلة/جمع كثرة) بدل رقم ملصوق
// بصيغة واحدة تنتج "+ 1 بندًا آخر" وهو خطأ لغوي في تقرير يُطبع لولي الأمر.
function focusMoreLabel(n){
  if (AppState.currentLang === 'en') {
    return `+ ${n} ${n === 1 ? t('report_focus_more_one') : t('report_focus_more_many')}`;
  }
  if (n === 1) return `+ ${t('report_focus_more_one')}`;
  if (n === 2) return `+ ${t('report_focus_more_two')}`;
  return `+ ${n} ${n <= 10 ? t('report_focus_more_few') : t('report_focus_more_many')}`;
}
function focusKeyOfResult(r){
  return normalizeFocusKey(r.text || `${r.location || ''} ${r.type || ''}`);
}
// "سورة الشمس - آية 5" — نفس صيغة location المبنية في getQuestionResults تمامًا،
// حتى يظهر بند السجل القديم بنفس شكل بند اليوم بلا اختلاف بصري.
function weaknessLocation(w){
  if (!w.surahName) return '';
  return `سورة ${w.surahName}${w.num != null ? ' - آية ' + w.num : ''}`;
}
function joinFocusParts(location, type, reason){
  const head = [location, type].filter(Boolean).join(' · ');
  if (!head) return reason || '';
  return reason ? `${head} — ${reason}` : head;
}
function focusAgeLabel(dateRecorded){
  if (!dateRecorded) return '';
  const then = new Date(dateRecorded);
  if (isNaN(then.getTime())) return '';
  const days = Math.max(0, Math.floor((Date.now() - then.getTime()) / 86400000));
  if (days === 0) return t('report_focus_age_today');
  if (days === 1) return t('report_focus_age_day1');
  if (days === 2) return t('report_focus_age_day2');
  const unit = days <= 10 ? t('report_focus_age_unit_few') : t('report_focus_age_unit_many');
  // العربية: "منذ 5 أيام" | الإنجليزية: "5 days ago" — ترتيب الكلمات مختلف بين
  // اللغتين، لذا نركّب الجملة حسب اللغة بدل ربط المفاتيح بترتيب عربي ثابت.
  return AppState.currentLang === 'en' ? `${days} ${unit}` : `${t('report_focus_age_since')} ${days} ${unit}`;
}

function getSkillHighlights(student, questionResults, speedCompare){
  const correct = questionResults.filter(r => r.status === 'full');
  const wrong = questionResults.filter(r => r.status === 'wrong');

  const strengths = [];
  if (correct.length) {
    strengths.push(`حفظ صحيح ودقيق لعدد ${correct.length} من ${questionResults.length} سؤالًا دون أي مساعدة`);
  }
  // ⚠️ لا نضيف أي وصف غير مبني على بيانات فعلية (مثل "سريع" أو "واثق") ما لم
  // يكن مقيسًا فعليًا من timeTaken — هذا هو المقصود بـ"الصدق" في هذا التقرير:
  // لا يظهر أي مديح لا تدعمه بيانات حقيقية.
  // 🌟 [جديد] timeTaken كان مسجّلاً لكل سؤال لكن لا يُستخدم هنا إطلاقاً. الآن نستخدمه —
  // لكن **فقط كمقارنة بمتوسط محاولات الطالب السابقة المحفوظة في سجله**، لا كحكم مطلق
  // بأن الزمن "سريع" (لا يوجد في المنصة أي معيار مرجعي يبرر حكماً مطلقاً كهذا).
  // speedCompare يأتي null في أول محاولة مسجَّلة، فلا يظهر هذا السطر إطلاقاً وقتها.
  if (speedCompare && speedCompare.faster) {
    strengths.push(
      `متوسط زمن الإجابة ${speedCompare.nowLabel} — أسرع من متوسط محاولاته السابقة (${speedCompare.prevLabel})`
    );
  }
  if (correct.length >= 2) {
    strengths.push(`ثبات واضح في الحفظ عبر أكثر من سؤال في هذا النطاق دون الحاجة لأي مساعدة`);
  }

  // 🌟 [إعادة تصميم] بناء بنود "بحاجة إلى تركيز" على ثلاث طبقات معنونة بدل قائمة
  // مسطّحة كانت تخلط أخطاء اليوم بأخطاء قديمة بلا تمييز (راجع الشرح المطوّل أعلى
  // هذا القسم). الترتيب صارم: أخطاء اليوم ← ما يحتاج تثبيتًا اليوم ← متابعة سابقة.
  const partial = questionResults.filter(r => r.status === 'hint' || r.status === 'reorder');
  const weaknesses = Array.isArray(student.weaknesses) ? student.weaknesses : [];

  // الطبقة 3 (نُجهّزها أولًا لأن مفاتيحها لازمة لكشف "الخطأ المتكرر" في الطبقة 1)
  const pastAll = weaknesses.map(w => {
    if (typeof w === 'string') return { key: normalizeFocusKey(w), text: w };
    const head = joinFocusParts(weaknessLocation(w), w.questionTypeLabel || '', '');
    // خط الرجوع لأي سجل قديم محفوظ قبل إضافة surahName/questionTypeLabel: نعرض
    // نصه الخام كما كان يُعرض تمامًا قبل هذا التعديل، فلا يختفي أي بند مسجَّل.
    const label = head
      || w.text
      || (Array.isArray(w.errorTypes) ? w.errorTypes.join('، ') : w.errorTypes)
      || '';
    if (!label) return null;
    const age = focusAgeLabel(w.dateRecorded);
    const tail = t('report_focus_not_resolved') + (age ? ` (${age})` : '');
    return { key: normalizeFocusKey(w.text || label), text: `${label} — ${tail}` };
  }).filter(Boolean);

  const todayKeys = new Set(wrong.concat(partial).map(focusKeyOfResult));
  const pastKeys = new Set(pastAll.map(p => p.key));
  // البند الذي أخطأ فيه الطالب اليوم وهو مسجَّل أصلًا في سجله القديم = خطأ متكرر،
  // وهي أقوى إشارة يمكن إعطاؤها لولي الأمر، ومبنية على بيانات مسجَّلة 100%.
  const buildToday = (r, kind) => {
    const body = joinFocusParts(r.location, r.type, r.note || 'إجابة غير صحيحة');
    return {
      kind,
      text: pastKeys.has(focusKeyOfResult(r)) ? `${t('report_focus_repeated')}: ${body}` : body
    };
  };

  const pastPending = pastAll.filter(p => !todayKeys.has(p.key));
  const needsFocus = [];
  const pushCapped = (arr) => arr.forEach(it => { if (needsFocus.length < FOCUS_MAX_TOTAL) needsFocus.push(it); });
  pushCapped(wrong.slice(0, FOCUS_MAX_TODAY).map(r => buildToday(r, 'today')));
  pushCapped(partial.slice(0, FOCUS_MAX_PARTIAL).map(r => buildToday(r, 'partial')));
  pushCapped(pastPending.slice(0, FOCUS_MAX_PAST).map(p => ({ kind: 'past', text: p.text })));

  // ⚠️ لا نُخفي الفائض بصمت: نذكر عدده صراحة — الإخفاء الصامت يخالف مبدأ الصدق
  // الذي يقوم عليه هذا التقرير كله.
  const remaining = (wrong.length + partial.length + pastPending.length) - needsFocus.length;
  if (remaining > 0) needsFocus.push({ kind: 'more', text: focusMoreLabel(remaining) });

  if (!strengths.length) strengths.push('إكمال المحاولة كاملة رغم صعوبة بعض الأسئلة، وهذا بحد ذاته إنجاز يستحق التقدير');
  if (!needsFocus.length) needsFocus.push({ kind: 'none', text: 'الاستمرار في المراجعة اليومية المعتادة للحفاظ على هذا المستوى' });
  return { strengths, needsFocus };
}

function getAvatarValue(student){
  if (student.avatar) return student.avatar;
  try {
    const saved = localStorage.getItem(avatarStorageKey(student));
    if (saved) return saved;
  } catch (e) { /* تجاهل */ }
  return null;
}
function getAvatarHtml(student){
  // نفس منطق طريقة عرض الصورة الرمزية المستخدم في student.js بالحرف:
  // avatar.length < 10 => إيموجي نصي، غير ذلك => صورة base64، وإلا => حرف أول الاسم.
  const avatarVal = getAvatarValue(student);
  if (avatarVal) {
    if (avatarVal.length < 10) return { type: 'emoji', value: avatarVal };
    return { type: 'image', value: avatarVal };
  }
  return { type: 'letter', value: (student.name || '؟').trim().charAt(0) };
}

function applyAvatar(prefix, avatarInfo){
  const circle = $(`${prefix}-avatar-circle`);
  const img = $(`${prefix}-avatar-img`);
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

// تصنيف مستمر للدرجة على أربعة مستويات فعلية (ممتاز / جيد / متوسط / ضعيف)
// بدل ثلاثة فقط — هذا هو المطلوب لتقرير يشمل جميع مستويات الطلاب بإنصاف:
// طالب حصل على 70% مثلًا يستحق توصيفًا مختلفًا عن طالب حصل على 60%، ولا
// يصح أن يُحشرا معًا في نفس التصنيف.
function getTier(score){
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'average';
  return 'weak';
}
// 🌟 [عدّل] الألوان فقط — الحدود والتسميات كما هي بالحرف. الأعلى صار أخضر الهوية
// (--dh-emerald في css/home.css) بدل الذهبي البُني، بعد اعتماد التصميم المرجعي الجديد،
// والذهبي صار للنجوم والزخارف فقط. ⚠️ هذه الألوان مستخدمة أيضاً في ألوان محطات سُلّم
// التقدّم، فكل محطة تأخذ لون مستواها الفعلي لا لونًا يعبّر عن ترتيبها الزمني.
const TONE = {
  excellent: { color: '#0d5c46', label: 'ممتاز' },
  good:      { color: '#147c5e', label: 'جيد' },
  average:   { color: '#b8863b', label: 'متوسط' },
  weak:      { color: '#a15230', label: 'بحاجة إلى دعم إضافي' }
};
const GAUGE_R = 86;
const GAUGE_CIRC = 2 * Math.PI * GAUGE_R;

// نصوص كل مستوى: صادقة دون تجميل، لكن — خصوصًا في مستوى "ضعيف" — مصاغة
// بلغة تحترم أن القارئ ولي أمر طفل، فتُبرز المحاولة والأمل بدل الاكتفاء
// بوصف القصور فقط.
function getHonestyLine(tier){
  if (tier === 'excellent') return 'نتيجة تعكس إتقانًا حقيقيًا لمعظم أسئلة هذا الاختبار.';
  if (tier === 'good') return 'نتيجة جيدة تدل على حفظ متين لمعظم الأسئلة، مع بعض الجوانب التي تستحق مزيدًا من المراجعة والتثبيت.';
  if (tier === 'average') return 'نتيجة متوسطة تُظهر أساسًا موجودًا يمكن تقويته بمراجعة أكثر انتظامًا.';
  return 'الأداء في هذا الاختبار ما زال دون المستوى المطلوب، وهذه فرصة جيدة لتكثيف المراجعة معًا خطوة بخطوة.';
}
// أولوية اختيار البند الذي تذكره ملاحظة ولي الأمر: خطأ اليوم ← ما يحتاج تثبيتًا
// اليوم ← متابعة سابقة. وتُستبعد بنود العدّ ("+ن بندًا آخر") والسطر الافتراضي لأنها
// ليست نقاط تركيز فعلية يصح بناء توصية عليها.
function pickNoteFocus(items){
  const usable = (items || []).filter(it => it && (it.kind === 'today' || it.kind === 'partial' || it.kind === 'past'));
  if (!usable.length) return null;
  return usable.find(it => it.kind === 'today')
      || usable.find(it => it.kind === 'partial')
      || usable[0];
}
function getAutoParentNote(tier, name, needsFocus){
  const leadByTier = {
    excellent: `أداء ${name} في هذا الاختبار كان ممتازًا وعكس حفظًا متينًا لمعظم الأسئلة.`,
    good: `أداء ${name} كان جيدًا وتضمّن حفظًا صحيحًا لغالبية الأسئلة، مع بعض النقاط التي تحتاج مزيدًا من المراجعة والتثبيت.`,
    average: `أداء ${name} كان متوسطًا بشكل عام، وهناك نقاط محددة يمكن تحسينها بمراجعة منتظمة.`,
    weak: `بذل ${name} جهدًا في هذا الاختبار، لكنه ما زال بحاجة إلى دعم إضافي في بعض الجوانب.`
  };
  const lead = leadByTier[tier] || leadByTier.average;
  // 🌟 كانت الملاحظة تأخذ needsFocus[0] حرفيًا، وهو بعد إعادة تصميم الصندوق قد يكون
  // بندًا من "المتابعة السابقة" لا من اختبار اليوم. فنختار الآن بند اليوم أولًا، ولا
  // نلجأ لبند قديم إلا إذا خلا اليوم من أي ملاحظة — ونصرّح حينها أنه سابق، حتى لا
  // يفهم ولي الأمر أنه خطأ حدث اليوم 🌟
  const pick = pickNoteFocus(needsFocus);
  const focus = pick
    ? ` نوصي بالتركيز على: ${pick.kind === 'past' ? t('report_note_focus_past_prefix') + ' ' : ''}${pick.text}.`
    : '';
  const closing = tier === 'weak'
    ? ' ونثق أن متابعة قريبة معًا خلال الأيام القادمة ستُحدث فرقًا واضحًا بإذن الله.'
    : ' وسنتابع التقدم معًا أولًا بأول.';
  return lead + focus + closing;
}

// -----------------------------------------------------------------------------
// 1ب) هوية المعلم — اسم وختم في نهاية التقرير
// 🌟 صار لدينا الآن ملف معلم حقيقي (database/teacherDB.js) يُحمَّل في AppState.currentTeacher
// عند إقلاع النظام، وهو ما يُعتمد عليه أولاً. يبقى localStorage كخط رجوع فقط لأي جهاز/نسخة
// قديمة أدخل فيها المعلم اسمه/ختمه يدوياً من شريط الأدوات قبل وجود هذا الملف.
// -----------------------------------------------------------------------------
// 🌟 [عدّل] الحقل صار اسمه stamp بدل signature لأن ما يُعرض فعلاً في نهاية التقرير هو
// **ختم المعلم الرسمي** الذي يرفعه في "ملف المعلم" (teacherDB.stamp) — وهذا ما أكّده
// المعلم صراحة. المصدر لم يتغيّر (كان يقرأ teacher.stamp أصلاً)، لكن الاسم كان مضلِّلاً
// والتسمية في الواجهة كانت "توقيع".
// ⚠️ مفتاح localStorage القديم 'darham_teacher_signature' يبقى كخط رجوع كما هو — أي
// جهاز أو نسخة قديمة رفع فيها المعلم ختمه قبل وجود teacherDB لن يفقده.
function getTeacherIdentity(){
  const teacher = AppState.currentTeacher || {};
  const fromApp = teacher.name || AppState.teacherName || null;
  const fromAppStamp = teacher.stamp || null;
  let savedName = '';
  try { savedName = localStorage.getItem('darham_teacher_name') || ''; } catch (e) { /* تجاهل */ }
  let savedStamp = '';
  try { savedStamp = localStorage.getItem('darham_teacher_signature') || ''; } catch (e) { /* تجاهل */ }
  return { name: fromApp || savedName || 'المعلم', stamp: fromAppStamp || savedStamp || null };
}

// 🌟 يحفظ أي تعديل يدخله المعلم من شريط أدوات التقرير في ملفه الدائم (teacherDB) أيضاً،
// حتى تبقى بياناته موحّدة في كل مكان بالمنصة (الترحيب، الفوتر، والتقارير القادمة).
function persistTeacherIdentity(partial){
  try {
    if (AppState.teacherManager) {
      AppState.teacherManager.saveProfile(partial).then((saved) => {
        AppState.currentTeacher = saved;
        AppState.teacherName = saved.name || '';
      });
    }
  } catch (e) { console.warn("تعذر حفظ بيانات المعلم في الملف الدائم:", e); }
}

function buildReportData(){
  const student = AppState.currentStudent || {};
  const questionResults = getQuestionResults();
  const totalMax = questionResults.reduce((sum, r) => sum + (r.max || 0), 0);
  const totalEarned = questionResults.reduce((sum, r) => sum + (r.score || 0), 0);
  // 🌟 [إصلاح] student.totalScore حقل تراكمي مفتوح (بيزيد مع كل إجابة صحيحة عبر كل
  // جلسات الطالب، بدون أي حد أعلى — راجع AppState.currentStudent.totalScore += earnedScore
  // في adultGame.js/kidsGame.js)، وليس نسبة مئوية أصلًا. كان استخدامه هنا مباشرة كنسبة
  // (بدون تحديد سقف) هو سبب ظهور نسب غير منطقية زي 154%. الآن — بعد إصلاح تمرير
  // GameState الصحيح لكل لعبة أعلاه — هذا المسار الاحتياطي بقى حالة نادرة جدًا (تقرير
  // بلا أي أسئلة مسجَّلة إطلاقًا)، لكن نُبقي عليه كخط دفاع أخير مع تحديد سقف 0-100 حتى
  // لا يظهر رقم خارج النطاق المنطقي مهما كانت قيمة الحقل التراكمي 🌟
  const score = totalMax > 0
    ? Math.round((totalEarned / totalMax) * 100)
    : Math.max(0, Math.min(100, Math.round(student.totalScore || 0)));
  const tier = getTier(score);
  const tone = TONE[tier];
  const stats = buildStats(questionResults);
  const teacher = getTeacherIdentity();
  const now = new Date();
  const dateLabel = formatDateArabic(now);

  // 🌟 السجل السابق يُقرأ **قبل** تسجيل هذه المحاولة، فيبقى معناه "ما قبل هذا التقييم"
  // بدقة — وهو أساس كل من فرق النتيجة ومقارنة السرعة أدناه.
  const previous = getHistory(student.id);
  const lastPrev = previous.length ? previous[previous.length - 1] : null;
  const scope = (activeGameState && activeGameState.range)
    || (lastPrev && lastPrev.range)
    || '';

  // فرق النتيجة عن المحاولة السابقة — null تمامًا لو لم توجد محاولة سابقة مسجَّلة،
  // فتختفي الشارة بدل أن تعرض "+0" أو رقمًا لا معنى له في أول تقرير للطالب.
  const delta = lastPrev && typeof lastPrev.score === 'number' ? (score - lastPrev.score) : null;

  // مقارنة السرعة بمتوسط المحاولات السابقة — تحتاج قياسًا زمنيًا في الطرفين معًا
  const prevWithTime = previous.filter(h => typeof h.avgTimeSec === 'number' && h.avgTimeSec > 0);
  let speedCompare = null;
  if (stats.avgTimeSec && prevWithTime.length) {
    const prevAvg = prevWithTime.reduce((s, h) => s + h.avgTimeSec, 0) / prevWithTime.length;
    speedCompare = {
      faster: stats.avgTimeSec < prevAvg,
      nowLabel: formatDuration(stats.avgTimeSec),
      prevLabel: formatDuration(Math.round(prevAvg))
    };
  }

  const { strengths, needsFocus } = getSkillHighlights(student, questionResults, speedCompare);

  // 🌟 تسجيل هذه المحاولة في سجل الطالب ليبني سُلّم التقدّم في التقارير القادمة
  // (راجع تعليق appendHistoryEntry أعلاه للافتراض الصريح المستخدم هنا)
  appendHistoryEntry(student.id, { date: dateLabel, score, range: scope, avgTimeSec: stats.avgTimeSec });

  // محطات سُلّم التقدّم: هذه المحاولة أولاً (أقصى اليمين في RTL) ثم أحدث ثلاث محاولات
  // سابقة. لون كل محطة = لون مستواها الفعلي، لا تدرّج يعبّر عن ترتيبها الزمني.
  const ladder = [{
    isCurrent: true,
    whenLabel: t('rep_step_current'),
    dateShort: shortDateLabel(dateLabel),
    score, tier,
    tierLabel: tone.label,
    color: tone.color
  }];
  const PREV_LABELS = [t('rep_step_prev1'), t('rep_step_prev2'), t('rep_step_prev3')];
  previous.slice(-3).reverse().forEach((h, i) => {
    const hTier = getTier(h.score);
    ladder.push({
      isCurrent: false,
      whenLabel: PREV_LABELS[i] || t('rep_step_prev_generic'),
      dateShort: shortDateLabel(h.date),
      score: h.score,
      tier: hTier,
      tierLabel: TONE[hTier].label,
      color: TONE[hTier].color
    });
  });

  return {
    id: student.id != null ? ('#' + String(student.id).padStart(5, '0')) : '#00000',
    name: student.name || 'الطالب',
    // 🌟 بيانات اختيارية بالكامل: تُعرض فقط إن كانت مسجَّلة فعلاً في ملف الطالب،
    // ولا تُطلب منه إجباريًا في أي لحظة (نفس فلسفة بيانات المعلم والختم).
    grade: student.grade || '',
    scope: scope || '',
    date: dateLabel,
    dateHijri: formatDateHijri(now),
    score,
    tier,
    stars: STARS_BY_TIER[tier] != null ? STARS_BY_TIER[tier] : 0,
    toneColor: tone.color,
    tierLabel: tone.label,
    gaugeOffset: GAUGE_CIRC * (1 - Math.max(0, Math.min(100, score)) / 100),
    honestyLine: getHonestyLine(tier),
    avatar: getAvatarHtml(student),
    delta,
    ladder,
    counts: {
      full: questionResults.filter(r => r.status === 'full').length,
      partial: questionResults.filter(r => r.status === 'hint' || r.status === 'reorder').length,
      wrong: questionResults.filter(r => r.status === 'wrong').length
    },
    stats,
    ledger: questionResults,
    strengths,
    needsFocus,
    autoNote: getAutoParentNote(tier, student.name || 'الطالب', needsFocus),
    teacher
  };
}

// -----------------------------------------------------------------------------
// 2) العرض على الشاشة
// -----------------------------------------------------------------------------

let reportData = null;

// 🛡️ دوال آمنة للوصول للعناصر: بدل ما ينهار الكود لو عنصر مش موجود، بنكتفي
// بتحذير واضح في الـ console يوضح رقم العنصر الناقص بالظبط، ونكمل عرض الباقي.
function $(id){
  const el = document.getElementById(id);
  if (!el) {
    console.warn(
      `[report.js] تعذّر إيجاد العنصر #${id} داخل الصفحة. ` +
      `على الأغلب أن نسخة القالب المعروضة فعليًا مختلفة عن آخر نسخة — ` +
      `تأكد من استبدال الملف فعليًا وتفريغ كاش المتصفح (Hard Refresh).`
    );
  }
  return el;
}
function setText(id, val){ const el = $(id); if (el) el.textContent = val; }
function setHTML(id, val){ const el = $(id); if (el) el.innerHTML = val; }

// 🛡️ أي نص مصدره بيانات (نص سؤال، ملاحظة خطأ، نقطة قوة/ضعف...) يُمرَّر عبر
// innerHTML يجب تنقيته أولًا، وإلا فأي محتوى يحتوي "<" أو "&" قد يكسر
// التنسيق أو يُحقن كعنصر HTML فعلي بدل أن يُعرض كنص عادي.
function escapeHtml(str){
  return String(str == null ? '' : str).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

// 🌟 [جديد] "سُلّم التقدّم" — يحل محل رسم الأعمدة السابق (renderTrend/trend-bars).
// كل محطة نجمة ملوّنة بلون **مستواها الفعلي** (getTier/TONE)، والمحطة الحالية تتميّز
// بحلقة ذهبية لا بلون مختلف.
// ⚠️ سبب هذا القرار: التدرّج اللوني التنازلي (أخضر ← ذهبي ← أحمر حسب الترتيب الزمني)
// يوحي لولي الأمر بأربعة مستويات مختلفة، بينما قد تكون ثلاث محاولات في نفس المستوى
// تمامًا. التمييز هنا زمني، والتلوين مستوائي — ولا يختلطان.
function renderLadder(d){
  const wrap = $('report-ladder-wrap');
  if (!wrap) return;

  const stepHtml = (s) => `
    <div class="step${s.isCurrent ? ' is-current' : ''}" style="color:${s.color};">
      <div class="step-dot" style="background:${s.color};">
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><path d="${STAR_PATH}" fill="#fffdf8"/></svg>
      </div>
      <div class="step-when">${escapeHtml(s.whenLabel)}<span dir="ltr">${escapeHtml(s.dateShort)} — ${s.score}%</span></div>
      <div class="step-tier" style="color:${s.color};">${escapeHtml(s.tierLabel)}</div>
    </div>`;

  const connector = '<div class="conn-cell"><i></i></div>';
  const ladderHtml = `<div class="ladder">${d.ladder.map(stepHtml).join(connector)}</div>`;

  // أول محاولة مسجَّلة للطالب: محطة واحدة فقط. نوضّح ذلك صراحةً بدل ترك السُلّم
  // يبدو ناقصًا أو موحيًا بأن بقية المحطات اختفت لسبب ما.
  const firstNote = d.ladder.length < 2
    ? `<p class="ladder-empty">${escapeHtml(t('rep_ladder_first_attempt'))}</p>`
    : '';

  wrap.innerHTML = ladderHtml + firstNote;
}

// 🌟 [جديد] شارة فرق النتيجة عن المحاولة السابقة — مخفية تمامًا في أول تقرير للطالب
function renderDelta(d){
  const el = $('report-delta');
  if (!el) return;
  if (d.delta == null) { el.style.display = 'none'; el.innerHTML = ''; return; }

  const up = d.delta > 0, flat = d.delta === 0;
  const cls = flat ? 'flat' : (up ? 'up' : 'down');
  const arrow = flat
    ? '<svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
    : (up
      ? '<svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5l4.2 6.4H1.8z" fill="currentColor"/></svg>'
      : '<svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 10.5L1.8 4.1h8.4z" fill="currentColor"/></svg>');

  // ⚠️ بلا علامة + أو − قبل الرقم عمدًا: هذه العلامات محايدة اتجاهيًا في خوارزمية
  // البايدي، فتقفز إلى الطرف الخطأ من الرقم داخل فقرة عربية (تظهر "5−" بدل "−5")
  // حتى مع dir="ltr". السهم واللون يحملان الاتجاه بوضوح أكبر من العلامة أصلاً.
  const suffix = flat ? t('rep_delta_same') : t('rep_delta_vs_prev');
  el.className = 'delta ' + cls;
  el.style.display = '';
  el.innerHTML = `${arrow}${flat ? '' : `<b>${Math.abs(d.delta)}</b> `}${escapeHtml(suffix)}`;
}

// أيقونة الدائرة الخضراء "صحيح" مستخدَمة في مكانين بمقاسين مختلفين (20px
// لكل سؤال في القائمة التفصيلية، 14px في بطاقة "نقاط القوة") — دالة واحدة
// بدل رسم نفس الـ SVG مرتين بشكل منفصل في الكود.
function checkCircleIcon(size){
  const r = size >= 18 ? 9 : 8;
  const strokeWidth = size >= 18 ? 1.8 : 1.7;
  return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="${r}" fill="#efe9e0" stroke="#d3c3ab"/><path d="M6.2 10.3l2.4 2.4 5-5.4" stroke="#8a6221" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
}
// 🌟 [عدّل] أيقونات حالة السؤال — ألوان ممتلئة عالية التباين لتُقرأ داخل خلية جدول
// ضيّقة، بدل الدوائر الباهتة السابقة التي كانت مناسبة لبطاقة عريضة لكل سؤال.
function statusIconSvg(status){
  if (status === 'full') {
    return `<svg width="19" height="19" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="#10694c"/><path d="M6 10.3l2.6 2.6 5.4-5.6" stroke="#fffdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
  }
  if (status === 'wrong') {
    return `<svg width="19" height="19" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="#9e3b2d"/><path d="M7.2 7.2l5.6 5.6M12.8 7.2l-5.6 5.6" stroke="#fffdf8" stroke-width="2" stroke-linecap="round"/></svg>`;
  }
  return `<svg width="19" height="19" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="#d4af37"/><path d="M10 5.4V10l3 1.8" stroke="#3a2f10" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
}

// 🌟 [عدّل] صف الجدول الجديد بخمسة أعمدة (م / الاستجابة / السؤال / الدرجة / ملاحظة).
// ⚠️ الدرجة تبقى بصيغة "8 / 10" لا نسبة مئوية: هذا هو المقياس الفعلي الذي يحسبه
// computeQuestionScore، وتحويله لنسبة يوحي بمقياس آخر غير الموجود في المنصة.
function qrowHtml(r, withBreakClass){
  const pointsColor = r.status === 'full' ? '#10694c' : (r.status === 'wrong' ? '#9e3b2d' : '#a07a1c');
  const rowState = r.status === 'wrong' ? ' is-wrong' : (r.status === 'full' ? '' : ' is-partial');
  return `<div class="qrow${rowState}${withBreakClass ? ' pdf-block' : ''}">
    <div class="qnum">${r.num}</div>
    <div class="qicon">${statusIconSvg(r.status)}</div>
    <div class="qsubject">
      <div class="qtype">${escapeHtml(r.type)}</div>
      ${r.location ? `<div class="qloc">${escapeHtml(r.location)}</div>` : ''}
      ${r.text ? `<div class="qtext">${escapeHtml(r.text)}</div>` : ''}
    </div>
    <div class="qscore" dir="ltr" style="color:${pointsColor}">${r.score} / ${r.max}</div>
    <div class="qnote">${r.note ? escapeHtml(r.note) : '—'}</div>
  </div>`;
}
function renderQuestions(d){
  const firstWrap = $('report-qrow-first');
  const restWrap = $('report-qrows-rest');
  const gridHead = $('report-qgrid-head');
  if (!firstWrap || !restWrap) return;
  if (!d.ledger.length) {
    // بلا أسئلة: نخفي ترويسة الجدول أيضًا حتى لا تظهر أعمدة فارغة بلا معنى
    if (gridHead) gridHead.style.display = 'none';
    firstWrap.innerHTML = `<p class="qempty">${escapeHtml(t('rep_no_questions'))}</p>`;
    restWrap.innerHTML = '';
    return;
  }
  if (gridHead) gridHead.style.display = '';
  firstWrap.innerHTML = qrowHtml(d.ledger[0], false);
  restWrap.innerHTML = d.ledger.slice(1).map(r => qrowHtml(r, true)).join('');
}

function renderInsights(d){
  const checkIcon = checkCircleIcon(14);
  const dotIcon = `<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" fill="#f2e7e2" stroke="#dbbdb0"/><path d="M10 6.3v4.4M10 13.2v.1" stroke="#a15230" stroke-width="1.7" stroke-linecap="round"/></svg>`;
  setHTML('report-strengths-list', d.strengths.map(s => `<li class="insight-item">${checkIcon}<span>${escapeHtml(s)}</span></li>`).join(''));
  setHTML('report-needs-list', needsFocusHtml(d.needsFocus, dotIcon));
}

// 🌟 [جديد] عرض بنود "بحاجة إلى تركيز" مجمَّعة تحت عناوين فرعية حسب مصدر كل بند
// (اليوم / يحتاج تثبيتًا / متابعة سابقة) — هذا العنوان هو جوهر التعديل كله: هو ما
// يمنع ولي الأمر من قراءة بند قديم على أنه خطأ اليوم 🌟
const FOCUS_GROUP_KEY = {
  today:   'report_focus_group_today',
  partial: 'report_focus_group_partial',
  past:    'report_focus_group_past'
};
function needsFocusHtml(items, dotIcon){
  let html = '';
  let lastKind = null;
  (items || []).forEach(it => {
    // خط رجوع: لو وصل بند كنص مجرد (نسخة قديمة من البيانات) نعرضه كبند عادي بلا عنوان.
    const item = (typeof it === 'string') ? { kind: 'none', text: it } : (it || { kind: 'none', text: '' });
    const kind = item.kind || 'none';
    if (FOCUS_GROUP_KEY[kind] && kind !== lastKind) {
      html += `<li class="insight-sub">${escapeHtml(t(FOCUS_GROUP_KEY[kind]))}</li>`;
    }
    lastKind = kind;
    html += (kind === 'more')
      ? `<li class="insight-more">${escapeHtml(item.text)}</li>`
      : `<li class="insight-item">${dotIcon}<span>${escapeHtml(item.text)}</span></li>`;
  });
  return html;
}

function renderNoteBox(){
  const input = $('report-custom-note-input');
  const custom = input ? input.value.trim() : '';
  const text = custom || (reportData ? reportData.autoNote : '');
  setText('report-note-text', text);
}

// صندوق "ملاحظة إضافية" اختياري بالكامل: يظهر فقط لو المعلم كتب فيه نصًا،
// ويختفي تمامًا (بلا أي مساحة فارغة في الصورة أو PDF) لو تُرك فارغًا.
function renderExtraNote(){
  const input = $('report-extra-note-input');
  const block = $('report-extra-note-block');
  if (!input || !block) return;
  const text = input.value.trim();
  setText('report-extra-note-text', text);
  block.style.display = text ? '' : 'none';
}

// -----------------------------------------------------------------------------
// 🌟 [جديد] تنظيف خلفية الختم قبل عرضه
//
// المشكلة كما ظهرت فعلاً في تقرير مطبوع: ختم المعلم خرج **مربعًا أسود صلبًا** حوله
// الخط بالأبيض. السبب ليس في كود التقرير: ملف الختم نفسه خطٌّ فاتح على خلفية داكنة
// صلبة (أو PNG شفاف فقد شفافيته في مرحلة سابقة)، ولا توجد طريقة لعرض ذلك على ورق
// كريمي اللون دون معالجة.
//
// المعالجة هنا **عند العرض لا عند الرفع**، لسببين: (1) تُصلح الختم المحفوظ فعلاً في
// ملف المعلم بلا أن يعيد المعلم رفعه، (2) لا تُعدّل البيانات المخزَّنة إطلاقًا — الأصل
// يبقى كما هو في teacherDB، والتنظيف يحدث في الذاكرة فقط في كل مرة يُفتح فيها التقرير.
//
// الخطوات، وكلها مشروطة فلا تُطبَّق على ختم سليم أصلاً:
//   1) ختم بخلفية شفافة فعلاً (أركانه alpha≈0) → يُترك كما هو بلا أي لمس.
//   2) أركان غير متجانسة اللون (صورة فيها تفاصيل تصل للحواف) → يُترك كما هو، لأن
//      أي إزالة خلفية هنا ستكون تخمينًا قد يأكل جزءًا من الختم.
//   3) خلفية داكنة متجانسة (الحالة التي ظهرت) → تُعكس الألوان، فيصير الخط داكنًا
//      والخلفية فاتحة، وهو ما يُقرأ فعلاً على ورق كريمي.
//   4) ثم تُزال الخلفية المتجانسة (الفاتحة الآن) بتدرّج شفافية حسب بُعد كل بكسل عن
//      لونها، فتبقى حواف الخط ناعمة بلا تسنين.
//
// ⚠️ افتراض صريح: نعتبر لون الأركان الأربعة هو لون الخلفية. هذا صحيح لأي ختم ممسوح
// ضوئيًا أو مصمَّم على خلفية واحدة، وقد لا يصح لختم صُمِّم بخلفية متدرّجة — ولهذا
// شرط التجانس في الخطوة (2) يترك تلك الحالة بلا تعديل بدل إفسادها.
// -----------------------------------------------------------------------------
const STAMP_KEY_SOFT = 60;   // أقل من هذا البُعد عن لون الخلفية = خلفية بحتة (شفاف تمامًا)
const STAMP_KEY_HARD = 115;  // أكثر من هذا = حبر بحت (معتم تمامًا)، وما بينهما تدرّج

function cleanStampImage(dataUrl){
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
        const span = STAMP_KEY_HARD - STAMP_KEY_SOFT;
        for (let i = 0; i < px.length; i += 4) {
          if (px[i + 3] === 0) continue;
          const d = Math.sqrt((px[i] - bg.r) ** 2 + (px[i + 1] - bg.g) ** 2 + (px[i + 2] - bg.b) ** 2);
          const k = d <= STAMP_KEY_SOFT ? 0 : (d >= STAMP_KEY_HARD ? 1 : (d - STAMP_KEY_SOFT) / span);
          px[i + 3] = Math.round(px[i + 3] * k);
        }

        ctx.putImageData(imgData, 0, 0);
        // PNG إلزامًا — أي صيغة بلا قناة شفافية تعيد المشكلة من أولها
        resolve(cv.toDataURL('image/png'));
      } catch (e) {
        // أي فشل (متصفح قديم، صورة ملوَّثة المصدر...) = نعرض الختم الأصلي كما هو
        console.warn('[report.js] تعذّر تنظيف خلفية الختم، سيُعرض كما هو:', e);
        resolve(dataUrl);
      }
    };
    img.src = dataUrl;
  });
}

// وعد واحد لكل ختم: التنظيف يحدث مرة واحدة لا عند كل إعادة رسم، والتصدير ينتظره
// قبل الالتقاط حتى لا تخرج الصورة أو الـ PDF بالختم غير المنظَّف.
let stampCleanPromise = null;
function ensureStampCleaned(){
  if (stampCleanPromise) return stampCleanPromise;
  const raw = reportData && reportData.teacher ? reportData.teacher.stamp : null;
  if (!raw) { stampCleanPromise = Promise.resolve(null); return stampCleanPromise; }
  stampCleanPromise = cleanStampImage(raw).then(clean => {
    if (reportData && reportData.teacher) reportData.teacher.stampClean = clean;
    const el = $('report-stamp-img');
    if (el && clean) el.src = clean;
    return clean;
  }).catch(() => null);
  return stampCleanPromise;
}

// 🌟 [عدّل] ما يُعرض هنا هو **ختم المعلم الرسمي** المرفوع في ملف المعلم
// (teacherDB.stamp)، لا توقيعًا مرسومًا. لذلك:
//   - الختم فوق سطر الاسم مباشرة (مكانه المعتاد في التقارير الرسمية).
//   - التسمية أسفل الاسم تتغيّر حسب وجود الختم فعلاً: "ختم المعلم" عند وجوده،
//     و"المعلم" فقط عند غيابه — فلا نَعِد القارئ بختم غير موجود في الورقة.
//   - عند غياب الختم تُخفى حاويته كلها (display:none) فلا يظهر فراغ أعلى الاسم.
function renderTeacherSign(d){
  setText('report-sign-name', d.teacher.name);

  const wrap = $('report-stamp-wrap');
  const stampImg = $('report-stamp-img');
  const hasStamp = !!d.teacher.stamp;
  if (wrap) wrap.style.display = hasStamp ? '' : 'none';
  if (stampImg) {
    if (hasStamp) stampImg.src = d.teacher.stampClean || d.teacher.stamp;
    else stampImg.removeAttribute('src');
  }
  setText('report-sign-label', hasStamp ? t('rep_sign_label_stamp') : t('rep_sign_label_plain'));
  if (hasStamp) ensureStampCleaned();
}

// -----------------------------------------------------------------------------
// 🌟 [جديد] احتفال صوتي بسيط عند نتيجة "ممتاز" (النسبة ≥ 90%، نفس عتبة getTier أعلاه —
// بطلب صريح من المعلم: "لما نسبة التقرير 90% يصدر صوت تصفيق"). نفس أسلوب التخليق الصوتي
// المستخدم فعلاً في dualtests/dual-test-sounds.js (Web Audio API مدمج بالكامل، بلا أي
// ملف صوتي خارجي)، لكن نسخة مستقلة هنا بدل الاستيراد من dualtests/ — حفاظاً على عزل كل
// ميزة عن غيرها (نفس فلسفة العزل المتبعة بالفعل بين report.js وmonthly-report.js). لاحظ:
// الملاحظة نفسها الموجودة في dual-test-sounds.js تنطبق هنا — هذا تصفيق "مُصطنَع" (نبضات
// ضوضاء قصيرة) وليس تسجيلاً بشرياً حقيقياً.
// يُستدعى مرة واحدة فقط من renderReport أدناه، وهي بدورها تُستدعى مرة واحدة فقط عند فتح
// التقرير (initReportScreen → renderAll، راجع تعليقهما)، فلا يتكرر الصوت عند أي إعادة رسم.
// -----------------------------------------------------------------------------
let reportAudioCtx = null;
function getReportAudioCtx() {
  try {
    if (!reportAudioCtx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      reportAudioCtx = new Ctor();
    }
    if (reportAudioCtx.state === 'suspended') reportAudioCtx.resume().catch(() => { /* best-effort */ });
    return reportAudioCtx;
  } catch (e) { return null; } // 🌟 لا نكسر عرض التقرير بسبب فشل الصوت في متصفح قديم
}
function playReportTone(freq, duration, when, gainPeak) {
  const ctx = getReportAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const startAt = ctx.currentTime + when;
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(gainPeak, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.05);
  } catch (e) { /* best-effort */ }
}
function playReportClapBurst(when, gainPeak) {
  const ctx = getReportAudioCtx();
  if (!ctx) return;
  try {
    const duration = 0.09;
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    const gain = ctx.createGain();
    const startAt = ctx.currentTime + when;
    gain.gain.setValueAtTime(gainPeak, startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start(startAt);
  } catch (e) { /* best-effort */ }
}
function playExcellentReportSound() {
  for (let i = 0; i < 4; i++) playReportClapBurst(i * 0.09 + Math.random() * 0.02, 0.28);
  [659.25, 783.99, 987.77].forEach((f, i) => playReportTone(f, 0.2, 0.4 + i * 0.13, 0.18));
}

// 🌟 [جديد] أسطر بطاقة الطالب الثلاثة (الصف / نطاق التقييم / مدة التقييم) اختيارية
// بالكامل: كل سطر يظهر فقط إن كانت قيمته مسجَّلة فعلاً، ولا يُطلب من المعلم إدخال أي
// منها إجباريًا (نفس فلسفة بيانات المعلم والختم المعتمدة في المشروع).
// بما أن أي سطر قد يكون مخفيًا، لا يصلح :first-of-type في CSS لإزالة الخط العلوي —
// نضع الكلاس is-first على أول سطر ظاهر فعليًا هنا.
function renderStudentFacts(d){
  const rows = [
    { box: 'report-fact-grade', val: 'report-grade-val', value: d.grade },
    { box: 'report-fact-scope', val: 'report-scope-val', value: d.scope },
    { box: 'report-fact-time',  val: 'report-time-val',  value: d.stats.totalTime && d.stats.totalTime !== '—' ? d.stats.totalTime : '' }
  ];
  let firstShown = true;
  rows.forEach(row => {
    const box = $(row.box);
    if (!box) return;
    const has = !!(row.value && String(row.value).trim());
    box.style.display = has ? '' : 'none';
    box.classList.toggle('is-first', has && firstShown);
    if (has) { setText(row.val, row.value); firstShown = false; }
  });
}

function renderReport(d){
  const stage = $('report-stage-inner');
  if (stage) stage.className = 'tier-' + d.tier;

  setText('report-footer-date', d.date);
  // التاريخ الهجري بجانب الميلادي — يختفي تمامًا لو لم يدعمه المتصفح
  const hijriEl = $('report-footer-hijri');
  if (hijriEl) hijriEl.textContent = d.dateHijri ? ('  ·  ' + d.dateHijri) : '';
  setText('report-footer-id', d.id);
  setText('report-student-name', d.name);
  renderStudentFacts(d);
  applyAvatar('report', d.avatar);

  const arc = $('report-gauge-arc');
  if (arc) { arc.style.stroke = d.toneColor; arc.style.strokeDashoffset = String(d.gaugeOffset); }
  const pctEl = $('report-gauge-pct'); if (pctEl) pctEl.textContent = d.score + '%';
  const tierEl = $('report-gauge-tier'); if (tierEl) tierEl.textContent = d.tierLabel;
  // النجمات الثلاث: الممتلئ منها بعدد مستوى النتيجة، والباقي حدٌّ باهت
  setHTML('report-gauge-stars', [0, 1, 2].map(i => starSvg(i < d.stars)).join(''));
  setText('report-honesty-line', d.honestyLine);

  // 🌟 [جديد] صوت تصفيق احتفالي عند نتيجة "ممتاز" (راجع تعليق playExcellentReportSound أعلاه)
  if (d.tier === 'excellent') playExcellentReportSound();

  setText('report-count-full', d.counts.full);
  setText('report-count-partial', d.counts.partial);
  setText('report-count-wrong', d.counts.wrong);
  setText('report-stat-avgtime', d.stats.avgTime);
  setText('report-stat-hints', d.stats.hints);
  setText('report-stat-reorders', d.stats.reorders);

  renderLadder(d);
  renderDelta(d);
  renderQuestions(d);
  renderInsights(d);
  renderNoteBox();
  renderTeacherSign(d);
}

function renderAll(){
  reportData = buildReportData();
  renderReport(reportData);
}

// -----------------------------------------------------------------------------
// 2ب) رفع صورة الطالب — سحب وإفلات أو ضغط لاختيار ملف
// -----------------------------------------------------------------------------
function slugifyForFilename(str){
  return String(str || '').replace(/[،,()]/g, ' ').trim().replace(/\s+/g, '_');
}
function avatarStorageKey(student){
  const s = student || AppState.currentStudent || {};
  return 'darham_avatar_' + (s.id != null ? s.id : slugifyForFilename(s.name || 'unknown'));
}
// 🌟 [إصلاح] أضفنا معامل format اختياري (افتراضيًا jpeg كما كان — لا تغيير على صورة
// الطالب الرمزية). سبب الإصلاح: JPEG لا يدعم الشفافية، فأي صورة ختم/توقيع بخلفية شفافة
// (PNG) تتحول خلفيتها الشفافة إلى مربع أسود صلب عند التحويل لـ JPEG بدل أن تختفي — وهذا
// كان سبب المربع الأسود حول التوقيع في نهاية التقرير. نستخدم PNG عند نداء الدالة لرفع
// الختم تحديدًا (أسفل) للحفاظ على الشفافية.
function resizeImageToDataUrl(file, maxSize, quality, format){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذّرت قراءة الملف'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('الملف ليس صورة صالحة'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(format || 'image/jpeg', quality || 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
async function handleAvatarFile(file){
  if (!file || !file.type || !file.type.startsWith('image/')) {
    alert('يرجى اختيار ملف صورة صالح (JPG أو PNG).');
    return;
  }
  try {
    const dataUrl = await resizeImageToDataUrl(file, 320, 0.85);
    if (AppState.currentStudent) AppState.currentStudent.avatar = dataUrl;
    try { localStorage.setItem(avatarStorageKey(), dataUrl); } catch (e) { /* تجاهل */ }
    if (reportData) {
      reportData.avatar = { type: 'image', value: dataUrl };
      applyAvatar('report', reportData.avatar);
    }
  } catch (e) {
    console.error(e);
    alert('تعذّر تحميل الصورة، حاول مرة أخرى بصورة أخرى.');
  }
}

// -----------------------------------------------------------------------------
// 3) التصدير: صورة PNG عالية الجودة، أو ملف PDF متعدد الصفحات
// -----------------------------------------------------------------------------

function loadScript(src){
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const el = document.createElement('script');
    el.src = src;
    el.onload = resolve;
    el.onerror = () => reject(new Error('تعذّر تحميل المكتبة: ' + src));
    document.head.appendChild(el);
  });
}
async function ensureHtml2Canvas(){
  if (!window.html2canvas) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
}
async function ensureJsPdf(){
  if (!(window.jspdf && window.jspdf.jsPDF)) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
}
// 🌟 [عدّل] كانت تُحمِّل وزن Amiri 700 فقط وتتجاهل Amiri Quran تمامًا.
// ⚠️ document.fonts.load يحمّل **الوجه المطلوب بعينه** لا العائلة كلها، فأي وزن لم
// يُطلب هنا قد لا يكون جاهزًا لحظة الالتقاط فيستبدله html2canvas بخط احتياطي — وهو
// سبب خروج نص عربي بخط مختلف تمامًا في الصورة/الـPDF رغم ظهوره سليمًا على الشاشة.
// الأوزان أدناه مطابقة لما تستخدمه report.styles.js فعليًا:
//   Amiri 400 (نص ملاحظة المعلم) · Amiri 700 (العنوان، العنوان الفرعي، اسم المعلم)
//   Amiri Quran 400 (نصوص الآيات في جدول الأسئلة) · Cairo 600/700/800 (بقية الواجهة)
async function ensureFontsReady(){
  if (document.fonts && document.fonts.ready) {
    try {
      await Promise.all([
        document.fonts.load('400 18px Amiri'),
        document.fonts.load('700 38px Amiri'),
        document.fonts.load('italic 700 16px Amiri'),
        document.fonts.load('400 15px "Amiri Quran"'),
        document.fonts.load('600 13px Cairo'),
        document.fonts.load('700 14px Cairo'),
        document.fonts.load('800 14px Cairo')
      ]);
      await document.fonts.ready;
    } catch (e) { /* تجاهل — لن نمنع التصدير بسبب هذا فقط */ }
  }
}

// 🌟 [جديد] انتظار اكتمال تحميل كل صور الصفحة (زخارف assets/report/ + صورة الطالب
// + ختم المعلم) قبل أي تصدير.
// ⚠️ ضروري لا تحسيني: html2canvas يلتقط ما هو محمَّل في لحظة النداء فقط — أي صورة
// لم يكتمل تحميلها بعد تخرج فارغة تمامًا في الـ PNG أو الـ PDF بلا أي رسالة خطأ.
// الزخارف ملفات على القرص تُحمَّل بسرعة عادةً، لكن أول فتح للتقرير (أو كاش بارد) قد
// يسبق اكتمالَها ضغطُ زر التصدير مباشرةً.
async function ensureArtReady(){
  const target = currentTarget();
  if (!target) return;
  const imgs = Array.from(target.querySelectorAll('img'))
    .filter(img => img.getAttribute('src') && img.style.display !== 'none');
  await Promise.all(imgs.map(img => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    if (typeof img.decode === 'function') return img.decode().catch(() => {});
    return new Promise(resolve => { img.addEventListener('load', resolve, { once: true }); img.addEventListener('error', resolve, { once: true }); });
  }));
}

// إطارا رسم متتاليان — يضمنان أن المتصفح أعاد التخطيط فعليًا بعد إضافة/إزالة
// كلاس dh-brief قبل أن يبدأ html2canvas القياس
function nextFrames(){
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}function withBusyLabel(btn, busyText, fn){
  return async function () {
    const original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = busyText;
    try { await fn(); }
    catch (err) { console.error(err); alert('حدث خطأ أثناء التصدير: ' + err.message); }
    finally { btn.disabled = false; btn.innerHTML = original; }
  };
}
function currentTarget(){ return $('report-page'); }
function ignoreNoExport(el){ return !!(el.classList && el.classList.contains('no-export')); }
function buildFileName(ext){
  const namePart = slugifyForFilename(reportData.name);
  const datePart = reportData.date.replace(/\s+/g, '').replace(/\//g, '-');
  const scopePart = slugifyForFilename(reportData.scope);
  return `تقرير_${namePart}_${datePart}_${scopePart}.${ext}`;
}
const HQ_SCALE = 3; // جودة عالية جدًا للتصدير

// 🌟 سجل بسيط لعدد التقارير المُصدَّرة فعلياً (PDF أو PNG) — يُستخدم في بطاقة
// "نظرة سريعة" بالشاشة الرئيسية الجديدة (عدد التقييمات/التقارير هذا الشهر).
// نفس أسلوب localStorage المستخدم أصلاً في هذا الملف (اسم المعلم، التوقيع،
// السجل التاريخي)، بدل إضافة قاعدة بيانات جديدة كاملة لعدّاد بسيط كهذا.
// ملاحظة: يحسب فقط التقارير المُصدَّرة بعد إضافة هذا السطر، ولا يمكنه معرفة
// تقارير صُدِّرت قبل ذلك لأنها لم تُسجَّل وقتها.
const REPORTS_LOG_KEY = 'darham_reports_log';
const REPORTS_LOG_MAX = 300; // حد أقصى لحجم السجل حتى لا ينمو بلا نهاية
function logReportGenerated(){
  try {
    const raw = localStorage.getItem(REPORTS_LOG_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(list) ? list : [];
    arr.push(new Date().toISOString());
    localStorage.setItem(REPORTS_LOG_KEY, JSON.stringify(arr.slice(-REPORTS_LOG_MAX)));
  } catch (e) { /* تجاهل — لا نمنع التصدير بسبب فشل تسجيل العدّاد فقط */ }
}

// 🌟 [جديد] الصورة صارت **مختصرة**: نفس الورقة تمامًا بعد إخفاء كتلة واحدة فقط هي
// جدول "تفاصيل الاختبار — سؤالًا بسؤال" (كل ما هو class="pdf-only")، بينما يبقى ملف
// الـ PDF شاملاً كل شيء. بطلب صريح من المعلم: صورة واضحة ومختصرة تُرسَل لولي الأمر،
// وملف شامل للأرشيف والمتابعة التفصيلية.
//
// ⚠️ لماذا كلاس على الـ DOM الحقيقي ولا نستخدم ignoreElements الموجودة أصلاً؟
// html2canvas يحسب أبعاد الكانفس من العنصر **الأصلي** ثم يرسم نسخة مستنسخة منه بعد
// حذف العناصر المتجاهَلة، فإخفاء كتلة كبيرة بهذه الطريقة يترك فراغًا أبيض ضخمًا أسفل
// الصورة بمقدار ارتفاع الجدول المحذوف. إضافة الكلاس على الصفحة الحقيقية تجعل المتصفح
// يعيد التخطيط فعليًا أولاً، فيخرج ارتفاع الكانفس مطابقًا للمحتوى الظاهر بالضبط.
// ignoreElements تبقى كما هي لعناصر .no-export الصغيرة (أزرار مطلقة الموضع لا تؤثر
// على التخطيط أصلاً).
//
// الكلاس يُزال في finally مهما حدث، حتى لا تبقى الشاشة ناقصة الجدول أمام المعلم لو
// فشل الالتقاط لأي سبب.
const BRIEF_CLASS = 'dh-brief';

async function exportPng(){
  await ensureHtml2Canvas();
  await ensureFontsReady();
  await ensureStampCleaned();
  await ensureArtReady();
  const target = currentTarget();

  let canvas;
  target.classList.add(BRIEF_CLASS);
  try {
    await nextFrames();
    canvas = await window.html2canvas(target, {
      scale: HQ_SCALE, backgroundColor: '#f9f4ea', useCORS: true,
      ignoreElements: ignoreNoExport
    });
  } finally {
    target.classList.remove(BRIEF_CLASS);
  }

  const link = document.createElement('a');
  link.download = buildFileName('png');
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  logReportGenerated();
}

// ---------------------------------------------------------------------------
// طبقة تقسيم PDF على صفحات A4 بدون قصّ أي قسم من منتصفه وبدون فراغات كبيرة:
// 1) نجمع حدود كل "قسم آمن للقطع" (عناصر .pdf-block) من الصفحة الحقيقية —
//    المقدمة، بطاقة المقياس، رسم الأداء، (عنوان الأسئلة + أول سؤال معًا حتى لا
//    يظهر العنوان وحيدًا آخر صفحة)، كل سؤال بعدها فرديًا، بطاقتا "نقاط
//    القوة/بحاجة إلى تركيز"، صندوق الملاحظة، وأخيرًا شريط التوقيع.
// 2) نلتقط الصفحة بالكامل كصورة واحدة عالية الجودة بـ html2canvas.
// 3) نملأ كل صفحة PDF بأكبر عدد ممكن من هذه الأقسام الكاملة (بدون قصّ أي
//    قسم منتصفه)، فتُستغل كل المساحة المتاحة في الصفحة قبل الانتقال للتالية،
//    بدل صفحة واحدة بحجم المحتوى الكامل أو صفحات ثابتة الحجم تترك فراغًا.
// ---------------------------------------------------------------------------
function collectPdfBlocks(target){
  const targetRect = target.getBoundingClientRect();
  return Array.from(target.querySelectorAll('.pdf-block')).map(el => {
    const rect = el.getBoundingClientRect();
    return { top: rect.top - targetRect.top, height: rect.height };
  }).filter(b => b.height > 0);
}
// يقسّم أي قسم أطول من صفحة كاملة (حالة نادرة، مثل ملاحظة طويلة جدًا) إلى
// أجزاء بحجم صفحة كاملة بدل أن يفيض عن حدود الصفحة في ملف PDF.
function splitOversizedRange(top, height, maxPageHeight){
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
function packBlocksIntoPages(blocks, maxPageHeight){
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

// 🌟 ملف الـ PDF يبقى **شاملاً** كل أقسام التقرير بما فيها جدول الأسئلة — لا يُضاف
// هنا كلاس dh-brief إطلاقًا. هذا هو الفرق الوحيد بينه وبين تصدير الصورة أعلاه.
async function exportPdf(){
  await ensureHtml2Canvas();
  await ensureJsPdf();
  await ensureFontsReady();
  await ensureStampCleaned();
  await ensureArtReady();
  const target = currentTarget();

  // نقيس حدود الأقسام قبل الالتقاط (بوحدات بكسل DOM الفعلية).
  const domBlocks = collectPdfBlocks(target);

  const canvas = await window.html2canvas(target, {
    scale: HQ_SCALE, backgroundColor: '#f9f4ea', useCORS: true,
    ignoreElements: ignoreNoExport
  });

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const pageWidthPt = pdf.internal.pageSize.getWidth();
  const pageHeightPt = pdf.internal.pageSize.getHeight();
  // 🌟 إصلاح: كان هامش 24pt يُطبَّق على الجوانب الأربعة فوق صفحة PDF بيضاء
  // افتراضيًا، فتظهر حواف بيضاء واضحة حول محتوى التقرير الكريمي اللون —
  // خصوصًا على الجانبين. كمان آخر صفحة (لو تبقّى فيها قسم صغير زي شريط
  // التوقيع فقط) كانت تترك مساحة بيضاء كبيرة تحتها فتبدو "ناقصة". الحل:
  // نلغي الهامش الجانبي بالكامل (يمتلئ عرض الصفحة)، ونملأ خلفية كل صفحة PDF
  // بنفس لون خلفية التقرير (#f9f4ea) — نفس اللون المُستخدم أصلًا في التقاط
  // html2canvas أعلاه — قبل رسم الصورة، فتختفي أي حواف بيضاء وتبدو نهاية
  // آخر صفحة متّسقة مع باقي التقرير بدل فراغ أبيض فجّ.
  const REPORT_BG_RGB = [249, 244, 234]; // يقابل #f9f4ea
  const marginXPt = 0;
  const marginYPt = 20;
  const contentWidthPt = pageWidthPt - marginXPt * 2;
  const contentHeightPt = pageHeightPt - marginYPt * 2;

  const domToCanvasScale = canvas.width / target.offsetWidth; // = HQ_SCALE عمليًا
  const domToPtScale = contentWidthPt / target.offsetWidth;
  const maxPageDomHeight = contentHeightPt / domToPtScale;
  const maxPageCanvasHeight = maxPageDomHeight * domToCanvasScale;

  const canvasBlocks = domBlocks.map(b => ({ top: b.top * domToCanvasScale, height: b.height * domToCanvasScale }));
  let pages = packBlocksIntoPages(canvasBlocks, maxPageCanvasHeight);
  // لو لم نعثر على أي أقسام (مثلًا لو تغيّرت بنية الصفحة يومًا)، نُرجع لتقسيم
  // ثابت الارتفاع بدل تعطّل التصدير بالكامل.
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
// 4) نقطة الدخول — تحقن قالب الشاشة (REPORT_TEMPLATE) مباشرة في #app-root.
// -----------------------------------------------------------------------------

function goHome(){
  try {
    if (typeof loadDashboardScreen === 'function') { loadDashboardScreen(); return; }
  } catch (e) { console.error(e); }
  if (typeof window.loadDashboardScreen === 'function') { window.loadDashboardScreen(); return; }
  console.warn(
    '[report.js] لم يتم العثور على loadDashboardScreen — عدّل الاستيراد أعلى ' +
    'الملف (من core/app.js) ليطابق دالة العودة للرئيسية الفعلية عندكم.'
  );
}

function initReportScreen(){
  renderAll();
  renderNoteBox();
  renderExtraNote();

  const noteInput = $('report-custom-note-input');
  if (noteInput) noteInput.addEventListener('input', renderNoteBox);

  const extraNoteInput = $('report-extra-note-input');
  if (extraNoteInput) extraNoteInput.addEventListener('input', renderExtraNote);

  // -- رفع صورة الطالب (سحب وإفلات أو ضغط) --
  const avatarZone = $('report-avatar-circle');
  const avatarInput = $('report-avatar-input');
  const avatarEditBtn = $('report-avatar-edit-btn');
  if (avatarZone && avatarInput) {
    const openPicker = () => avatarInput.click();
    avatarZone.addEventListener('click', openPicker);
    if (avatarEditBtn) avatarEditBtn.addEventListener('click', (e) => { e.stopPropagation(); openPicker(); });
    avatarZone.addEventListener('dragover', (e) => { e.preventDefault(); avatarZone.classList.add('drag-over'); });
    avatarZone.addEventListener('dragleave', () => avatarZone.classList.remove('drag-over'));
    avatarZone.addEventListener('drop', (e) => {
      e.preventDefault();
      avatarZone.classList.remove('drag-over');
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleAvatarFile(file);
    });
    avatarInput.addEventListener('change', () => {
      const file = avatarInput.files && avatarInput.files[0];
      if (file) handleAvatarFile(file);
      avatarInput.value = '';
    });
  }

  // -- اسم المعلم وختمه --
  // 🌟 نملأ الحقل أولاً من الملف الدائم (teacherDB)، وإلا من localStorage كخط رجوع قديم
  const teacherNameInput = $('report-teacher-name-input');
  if (teacherNameInput) {
    let initialName = (AppState.currentTeacher && AppState.currentTeacher.name) || '';
    if (!initialName) { try { initialName = localStorage.getItem('darham_teacher_name') || ''; } catch (e) { /* تجاهل */ } }
    teacherNameInput.value = initialName;
    teacherNameInput.addEventListener('input', () => {
      const val = teacherNameInput.value.trim();
      try { localStorage.setItem('darham_teacher_name', val); } catch (e) { /* تجاهل */ }
      persistTeacherIdentity({ name: val });
      if (reportData) { reportData.teacher.name = val || 'المعلم'; renderTeacherSign(reportData); }
    });
  }
  const teacherSigBtn = $('btn-teacher-sig');
  const teacherSigInput = $('report-teacher-sig-input');
  if (teacherSigBtn && teacherSigInput) {
    teacherSigBtn.addEventListener('click', () => teacherSigInput.click());
    teacherSigInput.addEventListener('change', async () => {
      const file = teacherSigInput.files && teacherSigInput.files[0];
      teacherSigInput.value = '';
      if (!file) return;
      if (!file.type || !file.type.startsWith('image/')) { alert('يرجى اختيار ملف صورة صالح للختم.'); return; }
      try {
        // 🌟 [إصلاح] PNG بدل JPEG هنا تحديدًا حتى تبقى خلفية الختم الشفافة شفافة
        // فعليًا (راجع تعليق resizeImageToDataUrl أعلى الملف لتفاصيل السبب)
        const dataUrl = await resizeImageToDataUrl(file, 260, 0.9, 'image/png');
        // مفتاح localStorage يحتفظ باسمه القديم عمدًا حفاظًا على التوافق مع أي جهاز
        // رفع فيه المعلم ختمه قبل وجود teacherDB — راجع getTeacherIdentity أعلاه
        try { localStorage.setItem('darham_teacher_signature', dataUrl); } catch (e) { /* تجاهل */ }
        persistTeacherIdentity({ stamp: dataUrl });
        // إبطال نتيجة التنظيف السابقة حتى يُنظَّف الختم الجديد من أول مرة
        stampCleanPromise = null;
        if (reportData) {
          reportData.teacher.stamp = dataUrl;
          reportData.teacher.stampClean = null;
          renderTeacherSign(reportData);
        }
      } catch (e) { console.error(e); alert('تعذّر تحميل صورة الختم، حاول مرة أخرى.'); }
    });
  }

  // -- التصدير --
  const pngBtn = $('btn-report-png');
  const pdfBtn = $('btn-report-pdf');
  if (pngBtn) pngBtn.addEventListener('click', withBusyLabel(pngBtn, 'جارِ التجهيز…', exportPng));
  if (pdfBtn) pdfBtn.addEventListener('click', withBusyLabel(pdfBtn, 'جارِ التجهيز…', exportPdf));

  // -- العودة للرئيسية (زر في الشريط العلوي وآخر في نهاية التقرير) --
  const homeBtn = $('btn-report-home');
  const homeBtn2 = $('btn-report-home-2');
  if (homeBtn) homeBtn.addEventListener('click', goHome);
  if (homeBtn2) homeBtn2.addEventListener('click', goHome);
}

// 🌟 [إصلاح] openReportScreen بقت تستقبل GameState بتاع اللعبة اللي فتحت التقرير
// فعليًا (kidsGame.js أو adultGame.js يمرران GameState بتاعهما عند النداء)، بدل ما
// كان الملف يستورد نسخة واحدة ثابتة من adultGame.js فقط — راجع تعليق activeGameState
// في أول الملف لتفاصيل السبب. لو اتنادت بدون معامل (مثلاً عبر window.openReportScreen
// من مكان قديم)، نكمل بآخر GameState معروف بدل ما نفضي activeGameState بغلط 🌟
export function openReportScreen(gameState){
  if (gameState) activeGameState = gameState;
  const root = document.getElementById('app-root');
  if (!root) {
    console.error(
      '[report.js] لم يتم العثور على الحاوية الرئيسية #app-root في الصفحة. ' +
      'تأكد من معرّف حاوية الشاشات الرئيسية في تطبيقكم وعدّله في report.js.'
    );
    return;
  }
  root.innerHTML = REPORT_TEMPLATE;
  try { applyLanguage(); } catch (e) { /* غير حرِج — نكمل حتى لو لم تتوفر */ }
  initReportScreen();
}

window.openReportScreen = openReportScreen;