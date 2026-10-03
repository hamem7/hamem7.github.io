// components/monthlyMemorizationBulkScreen.js
// =============================================================================
// 🌟 [جديد — يستبدل الفحص لكل طالب على حدة] "تسجيل الحفظ الشهري لكل الطلاب" —
// شاشة كبيرة واحدة (وليست نافذة صغيرة متكررة) تستدعي كل طالب يحتاج تسجيل بداية
// شهر جديد أو نهاية شهر سابق غير مكتمل. 🌟 [2026-10-03] صارت جدولًا واحدًا لكل الطلاب معًا
// (openMemorizationTable أدناه) بدل طالب تلو الآخر — كما طلب المعلم صراحةً بعد أول تجربة لنافذة components/
// monthlyMemorizationPrompt.js (كانت تظهر عند فتح كل ملف طالب على حدة، فتكرّرت
// بإزعاج). هذا الملف الجديد **لا يحذف** monthlyMemorizationPrompt.js ولا يعدّل
// عليه — فقط يعيد استخدام دوال الحساب من engine/memorizationEngine.js وقاعدة
// database/monthlyMemorizationDB.js بنفس الطريقة، ببناء واجهة مستقلة تمامًا.
//
// 🌟🌟 [مُبسَّط — بطلب صريح من المعلم] "بداية الشهر" لم تعد تُطلب من المعلم يدويًا
// كل شهر — تُحسب تلقائيًا = نفس موضع "نهاية الشهر السابق" (راجع buildPendingQueue
// أدناه). المعلم الآن لا يُسأل إلا عن أمرين فقط:
//   (أ) "نقطة البداية الأولى" — مرة واحدة للأبد لكل طالب: إما عند أول استخدام
//       لهذه الميزة لطالب قديم (يظهر تلقائيًا كخطوة "first-time" في هذه الشاشة)،
//       أو عند تسجيل طالب جديد لأول مرة (راجع openInitialPositionForNewStudent
//       أدناه، المستدعاة من student/student.js بعد حفظ بطل جديد مباشرة).
//   (ب) "أين توقف؟" — في بداية كل شهر جديد، عن الشهر الذي انتهى للتو (خطوة
//       "ending" كما كانت بالضبط، بلا أي تغيير في شاشتها).
// أي حالة أخرى (طالب له نهاية شهر سابق مقفولة، ولا يوجد سجل بعد للشهر الحالي)
// تُحل بصمت داخل buildPendingQueue عبر استدعاء saveBeginning تلقائيًا بلا أي
// تفاعل من المعلم — تحقيقًا لمبدأ "المعلم يسجّل الحقائق فقط، والنظام يحسب الباقي".
//
// نقطتا الاستدعاء الرئيسيتان لهذه الشاشة الجماعية:
//   1) تلقائيًا مرة واحدة يوميًا كحد أقصى (وليس عند كل دخول) من الشاشة الرئيسية —
//      راجع maybeAutoOpenMonthlyMemorizationBulk في core/app.js.
//   2) يدويًا في أي وقت من زر "📋 تسجيل الحفظ الشهري لكل الطلاب" في شاشة
//      student/my-students.html — لمعالجة أي طالب تم تخطّيه سابقًا.
// (بالإضافة لنقطة استدعاء ثالثة أحادية الطالب: openInitialPositionForNewStudent)
//
// ⚠️ [افتراض صريح]: "مرة واحدة يوميًا" (وليس مرة واحدة فقط في الشهر كله) — حتى لو
// أنهى المعلم كل الطلاب أول يوم من الشهر، لن تُفتح الشاشة تلقائيًا مرة أخرى بلا
// داعٍ (القائمة ستكون فارغة أصلاً). السبب: لو أجّل المعلم بعض الطلاب (زر "تخطٍّ")،
// نذكّره تلقائيًا في اليوم التالي بدل تركه ينسى نهائيًا حتى الشهر القادم — توازن
// بين "لا تزعج" و"لا تنسَ" بدل عدم التذكير إطلاقًا بعد أول تأجيل.
// =============================================================================

import { AppState, t, tf, surahNameLocal } from '../core/app.js';
import { esc } from '../core/escape.js';
import {
  calcMemorizationProgress,
  isValidPosition,
  getSurahsInMemorizationOrder,
  getSurahInfo,
  defaultStartingPosition
} from '../engine/memorizationEngine.js';

const STYLE_ID = 'mmb-styles';
const AUTO_SHOWN_FLAG_KEY = 'darham_monthly_memo_bulk_last_auto_shown';

function ensureStylesInjected() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.mmb-overlay {
  position: fixed; inset: 0; background: #0d1b16; z-index: 10000;
  display: flex; align-items: center; justify-content: center; padding: 24px;
  box-sizing: border-box; font-family: 'Tajawal', sans-serif;
}
.mmb-screen {
  background: #fffdf6; border-radius: 26px; max-width: 620px; width: 100%;
  padding: 0; box-shadow: 0 30px 70px rgba(0,0,0,0.45);
  border: 3px solid var(--dh-gold-500, #d4af37);
  max-height: 92vh; overflow-y: auto; direction: rtl;
}
.mmb-screen[dir="ltr"] { direction: ltr; }
.mmb-header {
  background: linear-gradient(135deg, var(--dh-emerald-700, #0d5c46), #0a4736);
  color: #fff; padding: 22px 30px; text-align: center;
  border-radius: 22px 22px 0 0;
}
.mmb-header-title { margin: 0 0 6px 0; font-size: 1.5rem; font-weight: 800; }
.mmb-progress-track { background: rgba(255,255,255,0.2); border-radius: 999px; height: 8px; margin-top: 14px; overflow: hidden; }
.mmb-progress-fill { background: var(--dh-gold-500, #d4af37); height: 100%; border-radius: 999px; transition: width .3s ease; }
.mmb-progress-text { margin-top: 8px; font-size: 0.9rem; opacity: 0.9; }
.mmb-body { padding: 28px 30px; }
.mmb-student-row { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
.mmb-avatar {
  width: 58px; height: 58px; border-radius: 50%; background: #f0fdf4;
  border: 3px solid var(--dh-emerald-700, #0d5c46); display: flex; align-items: center;
  justify-content: center; font-size: 1.6rem; font-weight: 800; color: var(--dh-emerald-700, #0d5c46);
  overflow: hidden; flex-shrink: 0;
}
.mmb-avatar img { width: 100%; height: 100%; object-fit: cover; }
.mmb-student-name { font-size: 1.35rem; font-weight: 800; color: #1e293b; margin: 0; }
.mmb-student-kind { font-size: 0.9rem; color: #92400e; font-weight: 700; margin: 2px 0 0 0; }
.mmb-field { margin-bottom: 16px; }
.mmb-field label { display: block; font-weight: 700; color: #3a2c1f; margin-bottom: 6px; font-size: 1rem; }
.mmb-field select, .mmb-field input[type="number"] {
  width: 100%; box-sizing: border-box; padding: 12px 14px; border-radius: 12px;
  border: 2px solid #e2d9c4; font-size: 1.1rem; font-family: inherit; background: #fff;
}
.mmb-field select:focus, .mmb-field input:focus { outline: none; border-color: var(--dh-gold-500, #d4af37); }
.mmb-hint { font-size: 0.85rem; color: #92400e; margin-top: 4px; }
.mmb-warning {
  background: #fef2f2; border: 2px solid #fca5a5; color: #991b1b; border-radius: 12px;
  padding: 12px 14px; font-size: 0.92rem; margin-bottom: 16px; line-height: 1.7;
}
.mmb-journey { background: #f0fdf4; border: 2px dashed var(--dh-emerald-700, #0d5c46); border-radius: 14px; padding: 16px; margin-bottom: 16px; text-align: center; }
.mmb-journey-row { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; font-size: 1.1rem; font-weight: 700; color: #1e293b; }
.mmb-journey-arrow { color: var(--dh-gold-500, #d4af37); font-size: 1.3rem; }
.mmb-journey-new { margin-top: 10px; font-size: 1.35rem; font-weight: 800; color: var(--dh-emerald-700, #0d5c46); }
.mmb-actions { display: flex; gap: 10px; margin-top: 22px; }
.mmb-btn {
  flex: 1; padding: 13px 14px; border-radius: 12px; border: none; font-size: 1.02rem;
  font-weight: 800; cursor: pointer; font-family: inherit; transition: transform .1s ease;
}
.mmb-btn:active { transform: scale(0.98); }
.mmb-btn-primary { background: var(--dh-emerald-700, #0d5c46); color: #fff; }
.mmb-btn-primary:disabled { background: #cbd5e1; cursor: not-allowed; }
.mmb-btn-ghost { background: #f1f5f9; color: #334155; }
.mmb-btn-skip { background: #fff7ed; color: #9a3412; }
.mmb-done-wrap { text-align: center; padding: 20px 10px; }
.mmb-done-emoji { font-size: 3.2rem; margin-bottom: 10px; }
.mmb-done-title { font-size: 1.4rem; font-weight: 800; color: var(--dh-emerald-700, #0d5c46); margin-bottom: 8px; }
.mmb-done-desc { color: #6b6252; font-size: 1rem; margin-bottom: 22px; }
`;
  document.head.appendChild(style);
}

function surahOptionsHtml(surahsData, selectedNumber) {
  return getSurahsInMemorizationOrder(surahsData)
    .map(s => `<option value="${s.number}" ${s.number === selectedNumber ? 'selected' : ''}>${surahNameLocal(s.name)}</option>`)
    .join('');
}

function studentAvatarHtml(student) {
  const name = (student.name || '؟').trim();
  const avatar = student.avatar || '';
  if (avatar && avatar.length >= 10) return `<img src="${avatar}" alt="${name}">`;
  if (avatar) return avatar;
  return name.charAt(0) || '★';
}

// 🌟 نفس خط الرجوع المستخدم في monthlyMemorizationPrompt.js بالحرف — راجع هناك
// للتوثيق الكامل لسبب استخدام آية 1 كافتراض عند غياب أي بيانة دقيقة سابقة.
function guessPositionFromLegacyMemoField(surahsData, surahName) {
  if (!surahName) return null;
  const match = (surahsData || []).find(s => s.name === surahName || s.name.includes(surahName) || surahName.includes(s.name));
  if (!match) return null;
  return { surahNumber: match.number, ayahNumber: 1 };
}

/**
 * يبني قائمة الإجراءات المطلوبة لكل الطلاب النشطين حاليًا. ثلاث حالات فقط:
 *   1) "نهاية شهر سابق غير مكتمل" (أولوية أعلى لو وُجدت) — خطوة "ending" تُعرض
 *      للمعلم كما هي بالضبط.
 *   2) لا يوجد أي سجل إطلاقًا لهذا الطالب من قبل (أول استخدام للميزة) — خطوة
 *      "first-time" تُعرض للمعلم مرة واحدة فقط في حياة الطالب مع هذه الميزة.
 *   3) لا يوجد سجل للشهر الحالي، لكن يوجد سجل سابق مقفول (نهاية شهر معروفة) —
 *      🌟 [مُبسَّط] لا نسأل المعلم شيئًا هنا إطلاقًا؛ نحفظ "بداية الشهر الحالي"
 *      تلقائيًا بنفس موضع "نهاية الشهر السابق" بصمت (saveBeginning)، ولا نضيف
 *      أي عنصر لقائمة الانتظار — ستظهر "نهاية" هذا الشهر تلقائيًا كحالة (1) في
 *      بداية الشهر التالي، وهكذا تُبنى السلسلة شهرًا بعد شهر بلا أي تكرار سؤال.
 * طالب واحد ← إجراء واحد فقط (تفاعلي) في كل بناء (بعد إتمامه، لو احتاج إجراءً
 * آخر، يظهر في المرة التالية التي تُبنى فيها القائمة — راجع save في openMemorizationTable أدناه).
 */
async function buildPendingQueue() {
  const mgr = AppState.monthlyMemorizationManager;
  if (!mgr || !AppState.surahsData || !AppState.surahsData.length) return [];
  const students = await AppState.studentManager.getAllStudents();
  const activeStudents = students.filter(s => !s.isHidden);

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;

  const queue = [];
  for (const student of activeStudents) {
    const records = await mgr.getAllForStudent(student.id);

    const pastUnfinished = records
      .filter(r => (r.year < curYear || (r.year === curYear && r.month < curMonth)) && r.beginning && !r.ending)
      .sort((a, b) => (b.year - a.year) || (b.month - a.month));
    if (pastUnfinished.length) {
      const rec = pastUnfinished[0];
      // «الشهر الماضي» في الجدول = حفظ آخر شهر مقفول قبل هذا الشهر (للمقارنة فقط)
      const prevLocked = records
        .filter(r => r.locked && r.ending && typeof r.newAyahs === 'number' && (r.year < rec.year || (r.year === rec.year && r.month < rec.month)))
        .pop();
      queue.push({
        type: 'ending', student, year: rec.year, month: rec.month,
        beginningPosition: { surahNumber: rec.beginning.surahNumber, ayahNumber: rec.beginning.ayahNumber },
        lastNew: prevLocked ? prevLocked.newAyahs : null
      });
      continue;
    }

    const currentRecord = records.find(r => r.year === curYear && r.month === curMonth);
    if (currentRecord && currentRecord.beginning) continue; // هذا الشهر جاهز فعلاً، لا شيء مطلوب الآن

    const latestLocked = [...records].reverse().find(r => r.locked && r.ending);
    if (latestLocked) {
      // 🌟 بداية الشهر الحالي = نهاية الشهر السابق، بلا سؤال المعلم (راجع تعليق الدالة أعلاه)
      await mgr.saveBeginning(student.id, curYear, curMonth, {
        surahNumber: latestLocked.ending.surahNumber, ayahNumber: latestLocked.ending.ayahNumber
      });
      continue;
    }

    // 🌟 [تحديث] سجل يحمل "مراجعة" فقط (بلا بداية ولا نهاية) لا يُعدّ سجل حفظ — راجع saveReview
    if (!records.some(r => r.beginning || r.ending)) {
      // أول استخدام إطلاقًا لهذا الطالب مع الميزة — نطلب نقطة البداية الأولى مرة واحدة فقط
      const prefill = guessPositionFromLegacyMemoField(AppState.surahsData, student.memoFrom) || defaultStartingPosition();
      queue.push({ type: 'first-time', student, year: curYear, month: curMonth, prefill });
    }
    // records.length > 0 بلا أي سجل مقفول: حالة نادرة (بداية مسجّلة سابقًا بلا أي
    // نهاية بعد لأي شهر) — مغطاة بالفعل عبر pastUnfinished أعلاه لأقرب شهر سابق.
  }
  return queue;
}

/**
 * 🌟 [جديد 2026-10-03] عدد الطلاب الذين ينتظرون إجراءً من المعلم في هذه الشاشة — للقراءة فقط
 * (شارة «بانتظارك» في student/my-students.html). نفس شروط buildPendingQueue أعلاه بالضبط لكن
 * بلا أي كتابة: الحالة التي تُحل بصمت هناك (saveBeginning من نهاية الشهر السابق) لا تُحتسب هنا
 * لأنها لا تحتاج المعلم أصلاً.
 */
export async function countPendingMonthlyMemorization() {
  const mgr = AppState.monthlyMemorizationManager;
  if (!mgr || !AppState.studentManager) return null;   // القواعد لم تجهز: «غير معروف» لا «صفر»
  const students = (await AppState.studentManager.getAllStudents()).filter(s => !s.isHidden);
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  let n = 0;
  for (const student of students) {
    const records = await mgr.getAllForStudent(student.id);
    const pastUnfinished = records.some(r => (r.year < curYear || (r.year === curYear && r.month < curMonth)) && r.beginning && !r.ending);
    if (pastUnfinished || !records.some(r => r.beginning || r.ending)) n++;
  }
  return n;
}

function closeOverlay(overlay) {
  if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
}

function renderHeader(overlay, index, total) {
  const pct = total ? Math.round((index / total) * 100) : 0;
  overlay.querySelector('#mmb-progress-fill').style.width = pct + '%';
  overlay.querySelector('#mmb-progress-text').textContent = t('mmb_progress').replace('{i}', index + 1).replace('{n}', total);
}

/**
 * يعرض خطوة واحدة (لطالب واحد) داخل الشاشة الكبيرة نفسها — بلا فتح أي نافذة
 * منفصلة، فقط تحديث محتوى #mmb-body. يرجع Promise تُحل بـ:
 *   {action:'saved'} بعد الحفظ بنجاح، {action:'skipped'} لو ضغط المعلم "تخطٍّ".
 */
// 🌟 [بُنية] خطوة واحدة (طالب واحد) قد تحتاج شاشتين فرعيتين متتاليتين لنوع
// "نهاية الشهر" (اختيار الموضع ← ثم تأكيد الحساب)، أو شاشة واحدة فقط لنوع "بداية
// الشهر". بُنيت كدالة داخلية قابلة للاستدعاء الذاتي (showPicker) بدل تكرار كود
// بناء نموذج الاختيار مرتين (مرة أول ظهور، ومرة عند الضغط على "رجوع للتعديل")،
// تجنبًا لأي تكرار أو تضارب في ربط الأحداث (event listeners).
function runStep(overlay, item) {
  const surahsData = AppState.surahsData || [];
  const body = overlay.querySelector('#mmb-body');
  const isEnding = item.type === 'ending';
  const initialPosition = isEnding ? item.beginningPosition : item.prefill;

  return new Promise((resolve) => {
    function showPicker(prefill) {
      body.innerHTML = `
        <div class="mmb-student-row">
          <div class="mmb-avatar">${studentAvatarHtml(item.student)}</div>
          <div>
            <p class="mmb-student-name">${esc(item.student.name || '')}</p>
            <p class="mmb-student-kind">${isEnding ? t('mmp_ending_title') : t('mmb_firsttime_title')} — ${item.month}/${item.year}</p>
          </div>
        </div>
        ${item.lateHint ? `<div class="mmb-warning" style="background:#fffbeb;border-color:#fcd34d;color:#92400e;">📌 ${item.lateHint}</div>` : ''}
        <div class="mmb-field">
          <label>${t('mmp_surah_label')}</label>
          <select id="mmb-surah-select">${surahOptionsHtml(surahsData, prefill.surahNumber)}</select>
        </div>
        <div class="mmb-field">
          <label>${t('mmp_ayah_label')}</label>
          <input type="number" id="mmb-ayah-input" min="1" value="${prefill.ayahNumber}">
          <div class="mmb-hint" id="mmb-ayah-hint"></div>
        </div>
        <div class="mmb-actions">
          <button class="mmb-btn mmb-btn-skip" id="mmb-btn-skip">${t('mmb_skip_btn')}</button>
          <button class="mmb-btn mmb-btn-primary" id="mmb-btn-next">${isEnding ? t('mmp_next_btn') : t('mmp_confirm_btn')}</button>
        </div>
      `;
      const surahSelect = body.querySelector('#mmb-surah-select');
      const ayahInput = body.querySelector('#mmb-ayah-input');
      const ayahHint = body.querySelector('#mmb-ayah-hint');

      function updateBounds() {
        const surahNumber = parseInt(surahSelect.value, 10);
        const info = getSurahInfo(surahsData, surahNumber);
        const max = info ? info.ayahsCount : 1;
        ayahInput.max = String(max);
        ayahHint.textContent = t('mmp_ayah_range_hint').replace('{max}', max);
        if (parseInt(ayahInput.value, 10) > max) ayahInput.value = String(max);
      }
      surahSelect.addEventListener('change', updateBounds);
      updateBounds();

      body.querySelector('#mmb-btn-skip').addEventListener('click', () => resolve({ action: 'skipped' }));
      body.querySelector('#mmb-btn-next').addEventListener('click', async () => {
        const surahNumber = parseInt(surahSelect.value, 10);
        const ayahNumber = parseInt(ayahInput.value, 10);
        if (!isValidPosition(surahsData, surahNumber, ayahNumber)) {
          alert(t('mmp_invalid_ayah'));
          return;
        }
        const position = { surahNumber, ayahNumber };

        if (!isEnding) {
          // بداية الشهر: حفظ مباشر بلا شاشة تأكيد إضافية
          await AppState.monthlyMemorizationManager.saveBeginning(item.student.id, item.year, item.month, position);
          resolve({ action: 'saved' });
          return;
        }
        showEndConfirm(position);
      });
    }

    function showEndConfirm(position) {
      const result = calcMemorizationProgress(surahsData, item.beginningPosition, position);
      const beginInfo = getSurahInfo(surahsData, item.beginningPosition.surahNumber);
      const endInfo = getSurahInfo(surahsData, position.surahNumber);
      const beginLabel = `${beginInfo ? beginInfo.name : '؟'} — ${item.beginningPosition.ayahNumber}`;
      const endLabel = `${endInfo ? endInfo.name : '؟'} — ${position.ayahNumber}`;

      body.innerHTML = `
        <div class="mmb-student-row">
          <div class="mmb-avatar">${studentAvatarHtml(item.student)}</div>
          <div>
            <p class="mmb-student-name">${esc(item.student.name || '')}</p>
            <p class="mmb-student-kind">${t('mmp_confirm_screen_title')} — ${item.month}/${item.year}</p>
          </div>
        </div>
        ${!result.valid ? `<div class="mmb-warning">⚠️ ${t('mmp_warning_backward')}</div>` : ''}
        <div class="mmb-journey">
          <div class="mmb-journey-row">
            <span>${beginLabel}</span><span class="mmb-journey-arrow">${AppState.currentLang === 'ar' ? '⬅️' : '➡️'}</span><span>${endLabel}</span>
          </div>
          ${result.valid ? `<div class="mmb-journey-new">${t('mmp_new_ayahs_label')}: ${result.newAyahs} ${t('mmp_ayahs_unit')}</div>` : ''}
        </div>
        <div class="mmb-actions">
          <button class="mmb-btn mmb-btn-ghost" id="mmb-btn-back">${t('mmp_back_btn')}</button>
          <button class="mmb-btn mmb-btn-primary" id="mmb-btn-save" ${!result.valid ? 'disabled' : ''}>${t('mmp_confirm_save_btn')}</button>
        </div>
      `;
      body.querySelector('#mmb-btn-back').addEventListener('click', () => showPicker(position));
      if (result.valid) {
        body.querySelector('#mmb-btn-save').addEventListener('click', async () => {
          await AppState.monthlyMemorizationManager.saveEnding(item.student.id, item.year, item.month, position, result.newAyahs);
          resolve({ action: 'saved' });
        });
      }
    }

    showPicker(initialPosition);
  });
}

// =============================================================================
// 🌟 [2026-10-03] جدول الحفظ الجماعي — بطلب المعلم بعد مقارنة معاينتين: بدل "طالب طالب" (runQueue)
// صار كل الطلاب المطلوبين في جدول واحد بلون أزرق مميز (المعلم طلب صراحةً لونًا غير الأخضر) وعنوان
// «الحفظ» أعلى الشاشة. نفس buildPendingQueue ونفس saveBeginning/saveEnding بلا أي تغيير في البيانات:
//   • صف "ending": الموضع يبدأ = بداية الشهر، فلو لم يغيّره المعلم يُسجَّل 0 آية («لم يتقدّم»).
//   • صف "first-time": يُحفظ كنقطة البداية الأولى (saveBeginning) بلا حساب.
//   • خانة «لاحقًا» تستثني الطالب من الحفظ فيبقى في قائمة الانتظار كما كان زر "تخطٍّ".
//   • صف موضعه قبل بداية الشهر (backward) يتلوّن بالأحمر ويمنع الحفظ حتى يُصحَّح.
// بعد الحفظ تُعاد قراءة القائمة: لو بقي أحد (مؤجَّل أو شهر سابق آخر غير مكتمل) يُعاد عرض الجدول له.
// runStep أعلاه ما زالت تخدم شاشات الطالب الواحد (طالب جديد، مركز التقارير) كما هي؛ حُذفت runQueue.
// =============================================================================
const TBL_STYLE_ID = 'mmt-styles';

function ensureTableStylesInjected() {
  if (document.getElementById(TBL_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = TBL_STYLE_ID;
  style.textContent = `
.mmt-overlay { position: fixed; inset: 0; background: rgba(10, 18, 40, .82); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; font-family: 'Tajawal', sans-serif; }
.mmt-screen { --mmt-blue: #1e3a8a; --mmt-deep: #172554; --mmt-tint: #e8eefc; --mmt-soft: #c7d4f5; --mmt-ink: #10203f; --mmt-mute: #55627a; --mmt-line: #e3e7ef;
  background: #fbfcff; color: var(--mmt-ink); border-radius: 22px; width: 100%; max-width: 1000px; max-height: 94vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 30px 70px rgba(0,0,0,.45); direction: rtl; }
.mmt-screen[dir="ltr"] { direction: ltr; }
.mmt-head { background: linear-gradient(135deg, var(--mmt-blue), var(--mmt-deep)); color: #fff; padding: 16px 22px; display: grid; gap: 8px; flex-shrink: 0; }
.mmt-head-row { display: flex; align-items: flex-start; gap: 12px; }
.mmt-kicker { font-size: .8rem; font-weight: 700; opacity: .85; }
.mmt-title { margin: 0; font-size: 1.7rem; font-weight: 800; line-height: 1.2; }
.mmt-sub { font-size: .9rem; opacity: .9; }
.mmt-close { margin-inline-start: auto; width: 40px; height: 40px; border-radius: 10px; border: 1px solid rgba(255,255,255,.3); background: rgba(255,255,255,.1); color: #fff; font-size: 1.1rem; cursor: pointer; flex-shrink: 0; }
.mmt-close:hover { background: rgba(255,255,255,.2); }
.mmt-stats { display: flex; flex-wrap: wrap; gap: 8px; }
.mmt-stat { background: rgba(255,255,255,.14); border-radius: 10px; padding: 4px 12px; font-size: .85rem; }
.mmt-stat b { font-size: 1.05rem; direction: ltr; unicode-bidi: isolate; }
.mmt-tools { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; padding: 10px 18px; background: var(--mmt-tint); border-bottom: 1px solid var(--mmt-soft); flex-shrink: 0; }
.mmt-tools input { padding: 9px 12px; border-radius: 10px; border: 1px solid var(--mmt-soft); background: #fff; font-family: inherit; font-size: .95rem; width: 230px; max-width: 100%; box-sizing: border-box; }
.mmt-banner { width: 100%; font-weight: 700; color: #166534; font-size: .9rem; }
.mmt-scroll { overflow: auto; flex: 1; min-height: 0; }
.mmt-table { width: 100%; border-collapse: collapse; font-size: .95rem; font-variant-numeric: tabular-nums; }
.mmt-table th { position: sticky; top: 0; z-index: 1; background: #f3f5fa; color: var(--mmt-mute); font-size: .78rem; font-weight: 700; text-align: start; padding: 9px 10px; border-bottom: 1px solid var(--mmt-line); white-space: nowrap; }
.mmt-table td { padding: 9px 10px; border-bottom: 1px solid var(--mmt-line); vertical-align: middle; }
.mmt-table tr.is-dirty td { background: var(--mmt-tint); }
.mmt-table tr.is-err td { background: #fee2e2; }
.mmt-table tr.is-later td { opacity: .45; }
.mmt-table tr.is-later td.mmt-c-later { opacity: 1; }
.mmt-who { display: flex; align-items: center; gap: 10px; font-weight: 800; }
.mmt-av { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--mmt-tint); color: var(--mmt-blue); border: 2px solid var(--mmt-blue); font-weight: 800; overflow: hidden; flex-shrink: 0; }
.mmt-av img { width: 100%; height: 100%; object-fit: cover; }
.mmt-start { white-space: nowrap; }
.mmt-month-tag { display: inline-block; font-size: .72rem; color: var(--mmt-mute); margin-inline-start: 4px; }
.mmt-table select, .mmt-table input[type="number"] { padding: 7px 8px; border-radius: 9px; border: 1px solid #cfd6e4; background: #fff; font-family: inherit; font-size: 1rem; box-sizing: border-box; }
.mmt-table select { max-width: 170px; }
.mmt-table input[type="number"] { width: 72px; text-align: center; font-weight: 700; }
.mmt-table select:focus, .mmt-table input:focus { outline: none; border-color: var(--dh-gold-500, #d4af37); box-shadow: 0 0 0 2px rgba(212,175,55,.35); }
.mmt-max { font-size: .78rem; color: var(--mmt-mute); margin-inline-start: 4px; }
.mmt-delta { font-weight: 800; direction: ltr; unicode-bidi: isolate; display: inline-block; }
.mmt-delta.ok { color: var(--mmt-blue); }
.mmt-delta.zero { color: #92400e; }
.mmt-delta.bad { color: #b91c1c; direction: inherit; }
.mmt-pill { font-size: .75rem; font-weight: 800; padding: 2px 9px; border-radius: 999px; background: #fef3c7; color: #92400e; white-space: nowrap; }
.mmt-c-later { text-align: center; }
.mmt-c-later input { width: 20px; height: 20px; accent-color: var(--mmt-blue); cursor: pointer; }
.mmt-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; padding: 12px 18px; border-top: 1px solid var(--mmt-line); background: #fff; flex-shrink: 0; }
.mmt-hint { font-size: .85rem; color: var(--mmt-mute); }
.mmt-hint.err { color: #b91c1c; font-weight: 700; }
.mmt-btn { border: none; border-radius: 12px; padding: 12px 22px; font-family: inherit; font-weight: 800; font-size: 1rem; cursor: pointer; background: var(--mmt-blue); color: #fff; }
.mmt-btn:disabled { background: #cbd5e1; cursor: not-allowed; }
.mmt-done { padding: 34px 24px; text-align: center; display: grid; gap: 10px; justify-items: center; }
.mmt-done-emoji { font-size: 3rem; }
.mmt-done-title { font-size: 1.4rem; font-weight: 800; color: var(--mmt-blue); }
.mmt-done-desc { color: var(--mmt-mute); }
.mmt-screen button:focus-visible, .mmt-screen input:focus-visible { outline: 3px solid var(--dh-gold-500, #d4af37); outline-offset: 2px; }
@media (max-width: 720px) {
  .mmt-overlay { padding: 0; }
  .mmt-screen { max-height: 100%; height: 100%; border-radius: 0; }
  .mmt-title { font-size: 1.4rem; }
  .mmt-table thead { display: none; }
  .mmt-table, .mmt-table tbody { display: block; }
  .mmt-table tr { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; padding: 12px 14px; border-bottom: 1px solid var(--mmt-line); }
  .mmt-table td { display: flex; flex-direction: column; gap: 3px; padding: 0; border: 0; background: transparent !important; }
  .mmt-table tr.is-dirty { background: var(--mmt-tint); }
  .mmt-table tr.is-err { background: #fee2e2; }
  .mmt-table td::before { content: attr(data-label); font-size: .72rem; color: var(--mmt-mute); font-weight: 700; }
  .mmt-table td.mmt-c-who { grid-column: 1 / -1; flex-direction: row; align-items: center; justify-content: space-between; }
  .mmt-table td.mmt-c-who::before, .mmt-table td.mmt-c-later::before { content: none; }
  .mmt-table td.mmt-c-later { position: absolute; }
  .mmt-table tr { position: relative; }
  .mmt-table td.mmt-c-later { top: 14px; inset-inline-end: 14px; flex-direction: row; align-items: center; gap: 6px; font-size: .8rem; color: var(--mmt-mute); }
  .mmt-table td.mmt-c-later::after { content: attr(data-label); }
  .mmt-table select { max-width: 100%; width: 100%; }
}
`;
  document.head.appendChild(style);
}

function posLabel(surahsData, pos) {
  const info = getSurahInfo(surahsData, pos.surahNumber);
  return `${esc(info ? surahNameLocal(info.name) : '؟')} ${pos.ayahNumber}`;
}

function rowResult(surahsData, row) {
  if (row.item.type !== 'ending') return { kind: 'first' };
  const r = calcMemorizationProgress(surahsData, row.item.beginningPosition, row.end);
  if (r.valid) return { kind: r.newAyahs > 0 ? 'ok' : 'zero', n: r.newAyahs };
  return { kind: 'bad' };
}

function deltaHtml(res) {
  if (res.kind === 'first') return `<span class="mmt-pill">${t('mmt_first_badge')}</span>`;
  if (res.kind === 'bad') return `<span class="mmt-delta bad">${t('mmt_backward')}</span>`;
  return `<span class="mmt-delta ${res.kind}">${res.n > 0 ? '+' + res.n : '0'}</span>`;
}

/**
 * يعرض الجدول ويرجع Promise تُحل عند إغلاق الشاشة (بعد الحفظ أو بزر الإغلاق).
 */
function openMemorizationTable(initialQueue) {
  ensureTableStylesInjected();
  const surahsData = AppState.surahsData || [];
  const isRtl = AppState.currentLang === 'ar';
  const overlay = document.createElement('div');
  overlay.className = 'mmt-overlay';
  document.body.appendChild(overlay);

  return new Promise((resolve) => {
    let rows = [];
    let banner = '';
    let saving = false;
    let savedCount = 0;
    let savedAyahs = 0;

    const setQueue = (queue) => {
      rows = queue.map(item => {
        const start = item.type === 'ending' ? item.beginningPosition : item.prefill;
        return { item, start: { ...start }, end: { ...start }, later: false };
      });
    };
    const isDirty = row => row.later || row.end.surahNumber !== row.start.surahNumber || row.end.ayahNumber !== row.start.ayahNumber;

    function close() {
      document.removeEventListener('keydown', onKey);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      resolve();
    }
    function tryClose() {
      if (!saving && rows.some(isDirty) && !confirm(t('mmt_unsaved_confirm'))) return;
      close();
    }
    function onKey(e) { if (e.key === 'Escape') tryClose(); }
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('click', e => { if (e.target === overlay) tryClose(); });

    function shell(inner) {
      const months = [...new Set(rows.filter(r => r.item.type === 'ending').map(r => `${r.item.month}/${r.item.year}`))];
      const kicker = months.length === 1
        ? tf('mmt_month_fmt', { m: months[0].split('/')[0], y: months[0].split('/')[1] })
        : t('mmb_title');
      return `<div class="mmt-screen" dir="${isRtl ? 'rtl' : 'ltr'}" role="dialog" aria-modal="true" aria-labelledby="mmt-title">
        <div class="mmt-head">
          <div class="mmt-head-row">
            <div><div class="mmt-kicker">${kicker}</div><h2 class="mmt-title" id="mmt-title">${t('mmt_heading')}</h2></div>
            <button class="mmt-close" id="mmt-close" aria-label="${t('mmb_close_btn')}" title="${t('mmb_close_btn')}">✕</button>
          </div>
          ${inner.head || ''}
        </div>
        ${inner.body}
      </div>`;
    }

    function renderTable() {
      overlay.innerHTML = shell({
        head: `<div class="mmt-sub">${t('mmt_sub')}</div><div class="mmt-stats" id="mmt-stats"></div>`,
        body: `
          <div class="mmt-tools">
            ${banner ? `<div class="mmt-banner">${banner}</div>` : ''}
            <input type="search" id="mmt-search" placeholder="${t('mmt_search_ph')}" aria-label="${t('mmt_search_ph')}">
          </div>
          <div class="mmt-scroll"><table class="mmt-table">
            <thead><tr>
              <th>${t('mmt_col_student')}</th><th>${t('mmt_col_start')}</th><th>${t('mmt_col_surah')}</th>
              <th>${t('mmt_col_ayah')}</th><th>${t('mmt_col_new')}</th><th>${t('mmt_col_last')}</th><th>${t('mmt_col_later')}</th>
            </tr></thead>
            <tbody>${rows.map((row, i) => {
              const it = row.item;
              const isEnding = it.type === 'ending';
              const info = getSurahInfo(surahsData, row.end.surahNumber);
              const max = info ? info.ayahsCount : 1;
              const name = esc(it.student.name || '');
              return `<tr data-i="${i}" data-name="${name}">
                <td class="mmt-c-who"><span class="mmt-who"><span class="mmt-av">${studentAvatarHtml(it.student)}</span>${name}</span></td>
                <td class="mmt-start" data-label="${t('mmt_col_start')}">${isEnding ? `${posLabel(surahsData, it.beginningPosition)}<span class="mmt-month-tag">${it.month}/${it.year}</span>` : `<span class="mmt-pill">${t('mmt_first_start')}</span>`}</td>
                <td data-label="${t('mmt_col_surah')}"><select data-k="s" aria-label="${t('mmt_col_surah')} — ${name}">${surahOptionsHtml(surahsData, row.end.surahNumber)}</select></td>
                <td data-label="${t('mmt_col_ayah')}"><span><input type="number" inputmode="numeric" data-k="a" min="1" max="${max}" value="${row.end.ayahNumber}" aria-label="${t('mmt_col_ayah')} — ${name}"><span class="mmt-max">/ ${max}</span></span></td>
                <td data-label="${t('mmt_col_new')}" class="mmt-c-new"></td>
                <td data-label="${t('mmt_col_last')}">${isEnding && typeof it.lastNew === 'number' ? it.lastNew : '—'}</td>
                <td class="mmt-c-later" data-label="${t('mmt_col_later')}"><input type="checkbox" data-k="later" title="${t('mmt_later_title')}" aria-label="${t('mmt_col_later')} — ${name}"></td>
              </tr>`;
            }).join('')}</tbody>
          </table></div>
          <div class="mmt-bar"><span class="mmt-hint" id="mmt-hint"></span><button class="mmt-btn" id="mmt-save"></button></div>`
      });

      overlay.querySelector('#mmt-close').addEventListener('click', tryClose);
      overlay.querySelectorAll('tbody tr').forEach(tr => {
        const row = rows[+tr.dataset.i];
        const sel = tr.querySelector('[data-k="s"]');
        const inp = tr.querySelector('[data-k="a"]');
        const maxEl = tr.querySelector('.mmt-max');
        sel.addEventListener('change', () => {
          row.end.surahNumber = parseInt(sel.value, 10);
          const info = getSurahInfo(surahsData, row.end.surahNumber);
          const max = info ? info.ayahsCount : 1;
          inp.max = String(max);
          maxEl.textContent = '/ ' + max;
          if (row.end.ayahNumber > max) { row.end.ayahNumber = max; inp.value = String(max); }
          refresh();
        });
        inp.addEventListener('input', () => {
          const v = parseInt(inp.value, 10);
          if (Number.isInteger(v)) { row.end.ayahNumber = v; refresh(); }
        });
        inp.addEventListener('change', () => {
          const max = parseInt(inp.max, 10) || 1;
          const v = Math.min(Math.max(1, parseInt(inp.value, 10) || 1), max);
          row.end.ayahNumber = v;
          inp.value = String(v);
          refresh();
        });
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
        tr.querySelector('[data-k="later"]').addEventListener('change', e => { row.later = e.target.checked; refresh(); });
      });
      const search = overlay.querySelector('#mmt-search');
      search.addEventListener('input', () => {
        const q = search.value.trim();
        overlay.querySelectorAll('tbody tr').forEach(tr => { tr.hidden = !!q && !tr.dataset.name.includes(q); });
      });
      overlay.querySelector('#mmt-save').addEventListener('click', save);
      refresh();
    }

    // تحديث الخلايا المحسوبة والأرقام بلا إعادة بناء الجدول (حتى لا يضيع المؤشر من الحقل)
    function refresh() {
      let errs = 0, zero = 0, moved = 0, total = 0, toSave = 0;
      overlay.querySelectorAll('tbody tr').forEach(tr => {
        const row = rows[+tr.dataset.i];
        const res = rowResult(surahsData, row);
        tr.querySelector('.mmt-c-new').innerHTML = deltaHtml(res);
        const valid = isValidPosition(surahsData, row.end.surahNumber, row.end.ayahNumber);
        const bad = !row.later && (res.kind === 'bad' || !valid);
        tr.classList.toggle('is-err', bad);
        tr.classList.toggle('is-later', row.later);
        tr.classList.toggle('is-dirty', !bad && !row.later && isDirty(row));
        if (row.later) return;
        toSave++;
        if (bad) errs++;
        else if (res.kind === 'zero') zero++;
        else if (res.kind === 'ok') { moved++; total += res.n; }
      });
      overlay.querySelector('#mmt-stats').innerHTML =
        `<span class="mmt-stat">${t('mmt_stat_students')} <b>${rows.length}</b></span>` +
        `<span class="mmt-stat">${t('mmt_stat_moved')} <b>${moved}</b></span>` +
        `<span class="mmt-stat">${t('mmt_stat_total')} <b>${total}</b></span>`;
      const hint = overlay.querySelector('#mmt-hint');
      hint.className = 'mmt-hint' + (errs ? ' err' : '');
      hint.textContent = errs ? tf('mmt_hint_err', { n: errs }) : zero ? tf('mmt_hint_zero', { n: zero }) : t('mmt_hint_ok');
      const btn = overlay.querySelector('#mmt-save');
      btn.textContent = saving ? t('mmt_saving') : tf('mmt_save_btn', { n: toSave });
      btn.disabled = saving || errs > 0 || toSave === 0;
    }

    async function save() {
      if (saving) return;
      saving = true;
      refresh();
      const mgr = AppState.monthlyMemorizationManager;
      let n = 0, failed = false;
      for (const row of rows) {
        if (row.later) continue;
        const it = row.item;
        const position = { surahNumber: row.end.surahNumber, ayahNumber: row.end.ayahNumber };
        try {
          if (it.type === 'ending') {
            const r = calcMemorizationProgress(surahsData, it.beginningPosition, position);
            if (!r.valid) continue;
            // eslint-disable-next-line no-await-in-loop
            await mgr.saveEnding(it.student.id, it.year, it.month, position, r.newAyahs);
            savedAyahs += r.newAyahs;
          } else {
            if (!isValidPosition(surahsData, position.surahNumber, position.ayahNumber)) continue;
            // eslint-disable-next-line no-await-in-loop
            await mgr.saveBeginning(it.student.id, it.year, it.month, position);
          }
          n++;
        } catch (e) {
          console.error('[monthlyMemorizationBulkScreen.js] تعذر حفظ صف في جدول الحفظ:', e);
          failed = true;
        }
      }
      savedCount += n;
      saving = false;
      if (failed) { alert(t('mmt_save_error')); }

      // إعادة القراءة: المؤجَّلون وأي شهر سابق آخر غير مكتمل يبقون بانتظار المعلم
      let next = [];
      try { next = await buildPendingQueue(); } catch (e) { console.error(e); }
      const laterIds = new Set(rows.filter(r => r.later).map(r => String(r.item.student.id)));
      const fresh = next.filter(it => !laterIds.has(String(it.student.id)));
      if (fresh.length) {
        banner = tf('mmt_saved_banner', { n });
        setQueue(next);
        rows.forEach(r => { if (laterIds.has(String(r.item.student.id))) r.later = true; });
        renderTable();
        rows.forEach((r, i) => { if (r.later) { const cb = overlay.querySelector(`tr[data-i="${i}"] [data-k="later"]`); if (cb) cb.checked = true; } });
        refresh();
        return;
      }
      renderDone(laterIds.size);
    }

    function renderDone(laterCount) {
      overlay.innerHTML = shell({
        body: `<div class="mmt-done">
          <div class="mmt-done-emoji">${savedCount ? '🎉' : '✅'}</div>
          <div class="mmt-done-title">${savedCount ? t('mmb_done_title') : ''}</div>
          <div class="mmt-done-desc">${savedCount ? tf('mmt_done_desc', { n: savedCount, k: savedAyahs }) : t('mmb_nothing_pending')}</div>
          ${laterCount ? `<div class="mmt-done-desc">${tf('mmt_done_later', { n: laterCount })}</div>` : ''}
          <button class="mmt-btn" id="mmt-done-close">${t('mmb_close_btn')}</button>
        </div>`
      });
      rows = [];
      overlay.querySelector('#mmt-close').addEventListener('click', close);
      overlay.querySelector('#mmt-done-close').addEventListener('click', close);
      overlay.querySelector('#mmt-done-close').focus();
    }

    setQueue(initialQueue);
    if (rows.length) renderTable(); else renderDone(0);
  });
}

function buildOverlayShell() {
  ensureStylesInjected();
  const overlay = document.createElement('div');
  overlay.className = 'mmb-overlay';
  overlay.innerHTML = `
    <div class="mmb-screen" dir="${AppState.currentLang === 'ar' ? 'rtl' : 'ltr'}">
      <div class="mmb-header">
        <h2 class="mmb-header-title">${t('mmb_title')}</h2>
        <div class="mmb-progress-track"><div class="mmb-progress-fill" id="mmb-progress-fill" style="width:0%"></div></div>
        <div class="mmb-progress-text" id="mmb-progress-text"></div>
      </div>
      <div class="mmb-body" id="mmb-body"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

/**
 * فتح الشاشة يدويًا — يُستخدم من زر "📋 تسجيل الحفظ الشهري لكل الطلاب" في
 * student/my-students.html. يعرض دائمًا (حتى لو القائمة فارغة، برسالة واضحة).
 */
export async function openMonthlyMemorizationBulkScreen() {
  try {
    const queue = await buildPendingQueue();
    await openMemorizationTable(queue); // قائمة فارغة ← رسالة «كل شيء محدَّث» داخل نفس الشاشة
  } catch (e) {
    console.error('[monthlyMemorizationBulkScreen.js] تعذر فتح شاشة الحفظ الشهري الجماعية:', e);
  }
}

/**
 * 🌟 [جديد] "نقطة البداية الأولى" لطالب جديد فقط — تُستدعى مرة واحدة مباشرة بعد
 * حفظ بطل جديد بنجاح في student/student.js (راجع setupMyStudentsListeners هناك).
 * خطوة واحدة فقط، قابلة للتخطي ("لاحقًا")، ولا تُجبر المعلم على إدخالها فورًا —
 * لو تخطّاها الآن، ستظهر له تلقائيًا لاحقًا كخطوة "first-time" في الشاشة الجماعية
 * (buildPendingQueue أعلاه، طالما لم يُسجَّل للطالب أي شيء إطلاقًا بعد).
 */
export async function openInitialPositionForNewStudent(student) {
  try {
    if (!AppState.monthlyMemorizationManager || !AppState.surahsData || !AppState.surahsData.length) return;
    const now = new Date();
    const prefill = guessPositionFromLegacyMemoField(AppState.surahsData, student.memoFrom) || defaultStartingPosition();
    const item = { type: 'first-time', student, year: now.getFullYear(), month: now.getMonth() + 1, prefill };
    const overlay = buildOverlayShell();
    renderHeader(overlay, 0, 1);
    await runStep(overlay, item);
    closeOverlay(overlay);
  } catch (e) {
    console.error('[monthlyMemorizationBulkScreen.js] تعذر عرض شاشة نقطة البداية الأولى للطالب الجديد:', e);
  }
}

/**
 * الفحص التلقائي — يُستدعى مرة واحدة عند إقلاع المنصة (راجع core/app.js). لا يعرض
 * شيئًا إطلاقًا لو: (أ) لا يوجد أي طالب معلَّق، أو (ب) سبق العرض تلقائيًا اليوم
 * بالفعل (راجع تعليق أعلى الملف لسبب "يوميًا" تحديدًا بدل "مرة كل الشهر").
 */
export async function maybeAutoOpenMonthlyMemorizationBulk() {
  try {
    const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    let lastShown = null;
    try { lastShown = localStorage.getItem(AUTO_SHOWN_FLAG_KEY); } catch (e) { /* تجاهل */ }
    if (lastShown === todayKey) return;

    const queue = await buildPendingQueue();
    if (!queue.length) return;

    try { localStorage.setItem(AUTO_SHOWN_FLAG_KEY, todayKey); } catch (e) { /* تجاهل */ }

    await openMemorizationTable(queue);
  } catch (e) {
    console.error('[monthlyMemorizationBulkScreen.js] تعذر الفحص التلقائي للحفظ الشهري:', e);
  }
}


/**
 * 🌟 [جديد] تسجيل/تعديل "آخر سورة وآية" لشهر محدَّد لطالب واحد — تُستدعى من مركز
 * التقارير الشهرية (components/monthlyReportsHub.js) بزر "سجّل الآن"/"تعديل". تعيد استخدام
 * runStep نفسها بلا أي تغيير في منطقها، فتُحسب الآيات الجديدة وتُقفل الشهر بنفس الطريقة.
 * ترجع true لو حُفظت النهاية فعلًا، وfalse لو تخطّى المعلم أو تعذّر السجل.
 *  • لو الشهر مسجَّل النهاية سابقًا (تعديل): يُفتح القفل مؤقتًا، وإن تخطّى المعلم تُعاد
 *    النهاية القديمة كما كانت بالضبط (لا يبقى الشهر مفتوحًا بصمت فيتعطّل ربط الأشهر).
 *  • لو لا بداية مسجَّلة: تؤخذ من نهاية أقرب شهر سابق مقفول (بصمت)، وإلا تُطلب "نقطة
 *    البداية الأولى" أولًا (الخطوة first-time المعتادة) ثم خطوة النهاية.
 *  • بعد الحفظ: لو للشهر التالي سجل غير مقفول تُحدَّث بدايته لتساوي هذه النهاية (سلسلة الأشهر).
 * ⚠️ [افتراض صريح] لو كان الشهر ماضيًا يظهر تنبيه "هذا موضعه عند نهاية ذلك الشهر لا اليوم".
 */
export async function openMonthEndingForStudent(student, year, month) {
  const mgr = AppState.monthlyMemorizationManager;
  const surahsData = AppState.surahsData;
  if (!mgr || !student || !Array.isArray(surahsData) || !surahsData.length) return false;
  let overlay = null;
  let oldEnding = null;
  let oldNew = null;
  try {
    let rec = await mgr.getRecord(student.id, year, month);
    if (rec && rec.ending) {
      oldEnding = { surahNumber: rec.ending.surahNumber, ayahNumber: rec.ending.ayahNumber };
      oldNew = rec.newAyahs;
      await mgr.unlockRecordForEdit(student.id, year, month);
      rec = await mgr.getRecord(student.id, year, month);
    }

    const now = new Date();
    const isPast = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
    const lateHint = isPast ? t('mmb_late_hint').replace('{month}', month).replace('{year}', year) : '';

    let beginPos = rec && rec.beginning ? { surahNumber: rec.beginning.surahNumber, ayahNumber: rec.beginning.ayahNumber } : null;
    if (!beginPos) {
      const all = await mgr.getAllForStudent(student.id);
      const before = all
        .filter(r => r.locked && r.ending && (r.year < year || (r.year === year && r.month < month)))
        .sort((a, b) => (b.year - a.year) || (b.month - a.month))[0];
      if (before) {
        beginPos = { surahNumber: before.ending.surahNumber, ayahNumber: before.ending.ayahNumber };
        await mgr.saveBeginning(student.id, year, month, beginPos);
      }
    }

    overlay = buildOverlayShell();
    renderHeader(overlay, 0, 1);

    if (!beginPos) {
      const prefill = guessPositionFromLegacyMemoField(surahsData, student.memoFrom) || defaultStartingPosition();
      const first = await runStep(overlay, { type: 'first-time', student, year, month, prefill, lateHint });
      if (!first || first.action !== 'saved') { closeOverlay(overlay); return false; }
      const r2 = await mgr.getRecord(student.id, year, month);
      beginPos = r2 && r2.beginning ? { surahNumber: r2.beginning.surahNumber, ayahNumber: r2.beginning.ayahNumber } : prefill;
    }

    const result = await runStep(overlay, { type: 'ending', student, year, month, beginningPosition: beginPos, lateHint });
    closeOverlay(overlay);
    overlay = null;
    if (!result || result.action !== 'saved') {
      if (oldEnding) await mgr.saveEnding(student.id, year, month, oldEnding, oldNew); // إعادة القفل كما كان
      return false;
    }

    // سلسلة الأشهر: بداية الشهر التالي (لو سجله غير مقفول) = هذه النهاية الجديدة
    const saved = await mgr.getRecord(student.id, year, month);
    const ny = month === 12 ? year + 1 : year;
    const nm = month === 12 ? 1 : month + 1;
    const nextRec = await mgr.getRecord(student.id, ny, nm);
    if (saved && saved.ending && nextRec && !nextRec.locked) {
      await mgr.saveBeginning(student.id, ny, nm, { surahNumber: saved.ending.surahNumber, ayahNumber: saved.ending.ayahNumber });
    }
    return true;
  } catch (e) {
    console.error('[monthlyMemorizationBulkScreen.js] تعذر تسجيل نهاية الشهر لطالب واحد:', e);
    if (overlay) closeOverlay(overlay);
    try { if (oldEnding) await mgr.saveEnding(student.id, year, month, oldEnding, oldNew); } catch (e2) { /* تجاهل */ }
    return false;
  }
}
