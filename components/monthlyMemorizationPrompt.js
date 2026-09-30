// components/monthlyMemorizationPrompt.js
// =============================================================================
// ⚠️ [مُستبدَل — 2026-09-28]: كانت نقطة الاستدعاء الوحيدة لهذا الملف
// (checkAndShowMonthlyMemorizationPrompts) في student/student.js عند فتح كل ملف
// طالب على حدة — أُزيلت من هناك بطلب صريح من المعلم لأنها كانت تظهر بإزعاج (نفس
// النافذة تتكرر لكل طالب في كل مرة يُفتح ملفه). حلّت محلها شاشة جامعة واحدة لكل
// الطلاب معًا: راجع components/monthlyMemorizationBulkScreen.js (مستقل تمامًا،
// لا يستورد من هذا الملف). تُرك هذا الملف كما هو بلا حذف (لا توجد وسيلة حذف ملفات
// فعلية متاحة حاليًا من هذه الجلسة) — دوال الحساب والتحقق التي يستخدمها منقولة
// أصلاً من engine/memorizationEngine.js المشترك، فلا يوجد أي تكرار خطير للمنطق،
// فقط واجهة عرض غير مستخدمة حاليًا. آمن إبقاؤه دون أي أثر على المنصة.
// =============================================================================
// 🌟 [الأصلي] "تسجيل موقع الحفظ الشهري" — نافذتان بسيطتان جدًا (بداية الشهر / نهاية
// الشهر) يختار فيهما المعلم فقط: السورة + آخر آية محفوظة، والنظام يحسب كل شيء آخر
// (راجع engine/memorizationEngine.js لمنطق الحساب، وdatabase/monthlyMemorizationDB.js
// لمكان التخزين). المعلم لا يُدخل عدد آيات إطلاقًا ولا يحسب أي شيء يدويًا — تحقيقًا
// لمبدأ "المعلم يسجّل الحقائق، والنظام يحسب النتائج" (القسم 24 من طلب الميزة).
//
// نقطة الاستدعاء الوحيدة حاليًا: student/student.js عند فتح ملف الطالب الشخصي —
// نافذة عائمة (Overlay) مُنشأة ديناميكيًا وتُضاف مباشرة لـ document.body (وليس
// #app-root الذي يُستبدل محتواه بالكامل عند كل تنقّل)، حتى تبقى مستقلة تمامًا عن
// أي شاشة معروضة خلفها ولا تتطلب أي تعديل على أي ملف HTML قالب موجود.
//
// ⚠️ [افتراض صريح 1]: نقطة فحص "هل بدأ شهر جديد؟" هي لحظة فتح ملف الطالب تحديدًا،
// وليست فحصًا مستمرًا في الخلفية طوال تشغيل المنصة — وهي أكثر نقطة طبيعية يلتقي
// فيها المعلم بملف طالب بعينه فعليًا للعمل عليه.
// ⚠️ [افتراض صريح 2]: لو تعدّدت الأشهر السابقة غير المكتملة (نهاية غير مسجَّلة)،
// تُعرض فقط أحدث حالة غير مكتملة (الأقرب زمنيًا) تلقائيًا؛ أي شهر أقدم منها يبقى
// بلا نهاية مسجَّلة إلى أن يعالجه المعلم يدويًا لاحقًا (لا يوجد حاليًا مسار تلقائي
// لعرض عدة أشهر متراكمة معًا) — تبسيط متعمَّد بدل تعقيد واجهة قائمة أشهر متعددة.
// =============================================================================

import { AppState, t } from '../core/app.js';
import {
  calcMemorizationProgress,
  isValidPosition,
  getSurahsInMemorizationOrder,
  getSurahInfo,
  defaultStartingPosition
} from '../engine/memorizationEngine.js';

const STYLE_ID = 'mmp-styles';

function ensureStylesInjected() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.mmp-overlay {
  position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999; padding: 20px; box-sizing: border-box;
  font-family: 'Tajawal', sans-serif;
}
.mmp-card {
  background: #fffdf6; border-radius: 20px; max-width: 480px; width: 100%;
  padding: 28px 26px; box-shadow: 0 20px 50px rgba(0,0,0,0.25);
  border: 2px solid var(--dh-gold-500, #d4af37);
  direction: rtl; max-height: 88vh; overflow-y: auto;
}
.mmp-card[dir="ltr"] { direction: ltr; }
.mmp-title { margin: 0 0 6px 0; color: var(--dh-emerald-700, #0d5c46); font-size: 1.4rem; font-weight: 800; }
.mmp-sub { margin: 0 0 18px 0; color: #6b6252; font-size: 0.95rem; line-height: 1.6; }
.mmp-meta { background: #f7f0e1; border-radius: 12px; padding: 10px 14px; font-size: 0.9rem; color: #4a3f2c; margin-bottom: 16px; }
.mmp-field { margin-bottom: 14px; }
.mmp-field label { display: block; font-weight: 700; color: #3a2c1f; margin-bottom: 6px; font-size: 0.95rem; }
.mmp-field select, .mmp-field input[type="number"] {
  width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 10px;
  border: 2px solid #e2d9c4; font-size: 1.05rem; font-family: inherit; background: #fff;
}
.mmp-field select:focus, .mmp-field input:focus { outline: none; border-color: var(--dh-gold-500, #d4af37); }
.mmp-hint { font-size: 0.82rem; color: #92400e; margin-top: 4px; }
.mmp-warning {
  background: #fef2f2; border: 2px solid #fca5a5; color: #991b1b; border-radius: 12px;
  padding: 12px 14px; font-size: 0.92rem; margin-bottom: 16px; line-height: 1.7;
}
.mmp-journey { background: #f0fdf4; border: 2px dashed var(--dh-emerald-700, #0d5c46); border-radius: 14px; padding: 14px 16px; margin-bottom: 16px; text-align: center; }
.mmp-journey-row { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; font-size: 1.05rem; font-weight: 700; color: #1e293b; }
.mmp-journey-arrow { color: var(--dh-gold-500, #d4af37); font-size: 1.3rem; }
.mmp-journey-new { margin-top: 10px; font-size: 1.3rem; font-weight: 800; color: var(--dh-emerald-700, #0d5c46); }
.mmp-actions { display: flex; gap: 10px; margin-top: 20px; }
.mmp-btn {
  flex: 1; padding: 12px 14px; border-radius: 12px; border: none; font-size: 1rem;
  font-weight: 800; cursor: pointer; font-family: inherit; transition: transform .1s ease;
}
.mmp-btn:active { transform: scale(0.98); }
.mmp-btn-primary { background: var(--dh-emerald-700, #0d5c46); color: #fff; }
.mmp-btn-primary:disabled { background: #cbd5e1; cursor: not-allowed; }
.mmp-btn-ghost { background: #f1f5f9; color: #334155; }
`;
  document.head.appendChild(style);
}

function closeOverlay(overlay) {
  if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
}

function surahOptionsHtml(surahsData, selectedNumber) {
  return getSurahsInMemorizationOrder(surahsData)
    .map(s => `<option value="${s.number}" ${s.number === selectedNumber ? 'selected' : ''}>${s.name}</option>`)
    .join('');
}

/**
 * يبني ويعرض نافذة اختيار موضع (سورة + آية) عامة، تُستخدم لكل من نافذتي بداية
 * ونهاية الشهر (نفس الشكل بالضبط، يختلف فقط العنوان والنص والخطوة التالية).
 * يرجع Promise تُحل بموضع {surahNumber, ayahNumber} عند التأكيد، أو null عند الإلغاء.
 */
function openPositionPicker({ titleKey, descKey, periodLabel, studentName, initialPosition, confirmLabelKey }) {
  ensureStylesInjected();
  return new Promise((resolve) => {
    const surahsData = AppState.surahsData || [];
    const initial = initialPosition || defaultStartingPosition();

    const overlay = document.createElement('div');
    overlay.className = 'mmp-overlay';
    overlay.innerHTML = `
      <div class="mmp-card" dir="${AppState.currentLang === 'ar' ? 'rtl' : 'ltr'}">
        <h3 class="mmp-title">${t(titleKey)}</h3>
        <p class="mmp-sub">${t(descKey)}</p>
        <div class="mmp-meta">${t('mmp_student_label').replace('{name}', studentName)} — ${periodLabel}</div>
        <div class="mmp-field">
          <label>${t('mmp_surah_label')}</label>
          <select id="mmp-surah-select">${surahOptionsHtml(surahsData, initial.surahNumber)}</select>
        </div>
        <div class="mmp-field">
          <label>${t('mmp_ayah_label')}</label>
          <input type="number" id="mmp-ayah-input" min="1" value="${initial.ayahNumber}">
          <div class="mmp-hint" id="mmp-ayah-hint"></div>
        </div>
        <div class="mmp-actions">
          <button class="mmp-btn mmp-btn-ghost" id="mmp-btn-cancel">${t('mmp_cancel_btn')}</button>
          <button class="mmp-btn mmp-btn-primary" id="mmp-btn-confirm">${t(confirmLabelKey)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const surahSelect = overlay.querySelector('#mmp-surah-select');
    const ayahInput = overlay.querySelector('#mmp-ayah-input');
    const ayahHint = overlay.querySelector('#mmp-ayah-hint');
    const confirmBtn = overlay.querySelector('#mmp-btn-confirm');

    function updateAyahBounds() {
      const surahNumber = parseInt(surahSelect.value, 10);
      const info = getSurahInfo(surahsData, surahNumber);
      const max = info ? info.ayahsCount : 1;
      ayahInput.max = String(max);
      ayahHint.textContent = t('mmp_ayah_range_hint').replace('{max}', max);
      if (parseInt(ayahInput.value, 10) > max) ayahInput.value = String(max);
    }
    surahSelect.addEventListener('change', updateAyahBounds);
    updateAyahBounds();

    confirmBtn.addEventListener('click', () => {
      const surahNumber = parseInt(surahSelect.value, 10);
      const ayahNumber = parseInt(ayahInput.value, 10);
      if (!isValidPosition(surahsData, surahNumber, ayahNumber)) {
        alert(t('mmp_invalid_ayah'));
        return;
      }
      closeOverlay(overlay);
      resolve({ surahNumber, ayahNumber });
    });
    overlay.querySelector('#mmp-btn-cancel').addEventListener('click', () => {
      closeOverlay(overlay);
      resolve(null);
    });
  });
}

/**
 * شاشة تأكيد نهاية الشهر: تعرض الحساب الآلي الناتج (من أين إلى أين، وكم آية جديدة)
 * قبل الحفظ الفعلي، مع تحذير واضح لو كانت الحركة رجوعية (القسم 8 من طلب الميزة).
 */
function openEndConfirmScreen({ beginning, ending, surahsData, periodLabel, studentName }) {
  ensureStylesInjected();
  return new Promise((resolve) => {
    const result = calcMemorizationProgress(surahsData, beginning, ending);
    const beginInfo = getSurahInfo(surahsData, beginning.surahNumber);
    const endInfo = getSurahInfo(surahsData, ending.surahNumber);
    const beginLabel = `${beginInfo ? beginInfo.name : '؟'} — ${beginning.ayahNumber}`;
    const endLabel = `${endInfo ? endInfo.name : '؟'} — ${ending.ayahNumber}`;

    const overlay = document.createElement('div');
    overlay.className = 'mmp-overlay';
    const warningHtml = !result.valid
      ? `<div class="mmp-warning">⚠️ ${t('mmp_warning_backward')}</div>`
      : '';
    const journeyHtml = `
      <div class="mmp-journey">
        <div class="mmp-journey-row">
          <span>${beginLabel}</span>
          <span class="mmp-journey-arrow">${AppState.currentLang === 'ar' ? '⬅️' : '➡️'}</span>
          <span>${endLabel}</span>
        </div>
        ${result.valid ? `<div class="mmp-journey-new">${t('mmp_new_ayahs_label')}: ${result.newAyahs} ${t('mmp_ayahs_unit')}</div>` : ''}
      </div>
    `;
    overlay.innerHTML = `
      <div class="mmp-card" dir="${AppState.currentLang === 'ar' ? 'rtl' : 'ltr'}">
        <h3 class="mmp-title">${t('mmp_confirm_screen_title')}</h3>
        <div class="mmp-meta">${t('mmp_student_label').replace('{name}', studentName)} — ${periodLabel}</div>
        ${warningHtml}
        ${journeyHtml}
        <div class="mmp-actions">
          <button class="mmp-btn mmp-btn-ghost" id="mmp-btn-back">${t('mmp_back_btn')}</button>
          <button class="mmp-btn mmp-btn-primary" id="mmp-btn-save" ${!result.valid ? 'disabled' : ''}>${t('mmp_confirm_save_btn')}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#mmp-btn-back').addEventListener('click', () => {
      closeOverlay(overlay);
      resolve({ confirmed: false });
    });
    const saveBtn = overlay.querySelector('#mmp-btn-save');
    if (result.valid) {
      saveBtn.addEventListener('click', () => {
        closeOverlay(overlay);
        resolve({ confirmed: true, newAyahs: result.newAyahs });
      });
    }
  });
}

// 🌟 محاولة إيجاد رقم السورة المطابق لاسم نطاق الحفظ الحالي القديم (student.memoFrom/
// memoTo، نصّ اسم سورة بلا رقم آية) — تُستخدم فقط كخط رجوع أول مرة تُستخدم فيها هذه
// الميزة مع طالب قديم، وليست مصدر بيانات دائم. راجع القسم 6 في تعليق أعلى
// reports/monthly-report.js لنفس فجوة البيانات هذه الموثَّقة سابقًا.
function guessPositionFromLegacyMemoField(surahsData, surahName) {
  if (!surahName) return null;
  const match = (surahsData || []).find(s => s.name === surahName || s.name.includes(surahName) || surahName.includes(s.name));
  if (!match) return null;
  // ⚠️ [افتراض صريح]: لا يوجد رقم آية محفوظ في البيانات القديمة إطلاقًا، فنفترض بداية
  // السورة (آية 1) ونطلب من المعلم تأكيدها أو تصحيحها بنفسه في نفس النافذة المعروضة.
  return { surahNumber: match.number, ayahNumber: 1 };
}

async function runBeginningFlow(student, year, month, prefill) {
  const mgr = AppState.monthlyMemorizationManager;
  const periodLabel = `${month}/${year}`;
  const position = await openPositionPicker({
    titleKey: 'mmp_beginning_title',
    descKey: 'mmp_beginning_desc',
    periodLabel, studentName: student.name,
    initialPosition: prefill,
    confirmLabelKey: 'mmp_confirm_btn'
  });
  if (!position) return false;
  await mgr.saveBeginning(student.id, year, month, position);
  return true;
}

async function runEndingFlow(student, year, month, beginningPosition) {
  const mgr = AppState.monthlyMemorizationManager;
  const periodLabel = `${month}/${year}`;
  while (true) {
    const ending = await openPositionPicker({
      titleKey: 'mmp_ending_title',
      descKey: 'mmp_ending_desc',
      periodLabel, studentName: student.name,
      initialPosition: beginningPosition,
      confirmLabelKey: 'mmp_next_btn'
    });
    if (!ending) return false;
    const confirmResult = await openEndConfirmScreen({
      beginning: beginningPosition, ending,
      surahsData: AppState.surahsData || [],
      periodLabel, studentName: student.name
    });
    if (confirmResult.confirmed) {
      await mgr.saveEnding(student.id, year, month, ending, confirmResult.newAyahs);
      return true;
    }
    // "رجوع للتعديل" — نعيد فتح نافذة الاختيار بنفس القيم الأخيرة
  }
}

/**
 * نقطة الدخول الوحيدة — تُستدعى من student.js عند فتح ملف الطالب. تفحص بصمت هل
 * يحتاج هذا الطالب لتسجيل بداية شهر جديد و/أو نهاية شهر سابق غير مكتمل، وتعرض
 * النافذة المناسبة تلقائيًا إن لزم (وإلا لا تفعل شيئًا إطلاقًا — best-effort بالكامل).
 */
export async function checkAndShowMonthlyMemorizationPrompts(student) {
  try {
    if (!student || student.id == null) return;
    const mgr = AppState.monthlyMemorizationManager;
    if (!mgr || !AppState.surahsData || !AppState.surahsData.length) return;

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1; // 1-12

    const records = await mgr.getAllForStudent(student.id);

    // 1) هل يوجد شهر سابق (قبل الشهر الحالي) له بداية مسجَّلة لكن بلا نهاية؟
    const pastUnfinished = records
      .filter(r => (r.year < curYear || (r.year === curYear && r.month < curMonth)) && r.beginning && !r.ending)
      .sort((a, b) => (b.year - a.year) || (b.month - a.month)); // الأحدث أولًا
    if (pastUnfinished.length) {
      const rec = pastUnfinished[0];
      const done = await runEndingFlow(student, rec.year, rec.month, {
        surahNumber: rec.beginning.surahNumber, ayahNumber: rec.beginning.ayahNumber
      });
      if (!done) return; // المعلم اختار التأجيل — لا نُلحّ بفتح نافذة بداية الشهر فوق هذا الاختيار
    }

    // 2) هل للشهر الحالي سجل "بداية" أصلًا؟ لو لا — نعرضه (مرة واحدة فقط لكل شهر،
    // لأن وجود السجل بعدها يمنع ظهورها ثانيةً — القسم 5 من طلب الميزة).
    const currentRecord = await mgr.getRecord(student.id, curYear, curMonth);
    if (currentRecord && currentRecord.beginning) return;

    const latestLocked = await mgr.getLatestLockedRecord(student.id);
    let prefill = null;
    if (latestLocked && latestLocked.ending) {
      prefill = { surahNumber: latestLocked.ending.surahNumber, ayahNumber: latestLocked.ending.ayahNumber };
    } else {
      prefill = guessPositionFromLegacyMemoField(AppState.surahsData, student.memoFrom) || defaultStartingPosition();
    }
    await runBeginningFlow(student, curYear, curMonth, prefill);
  } catch (e) {
    // best-effort بالكامل — أي خطأ هنا لا يجب أن يمنع فتح ملف الطالب نفسه إطلاقًا
    console.error('[monthlyMemorizationPrompt.js] تعذر فحص/عرض نافذة تسجيل الحفظ الشهري:', e);
  }
}
