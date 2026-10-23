// components/noteSheet.js
// 🌟 [جديد] القائمة السفلية لتسجيل الملاحظات أثناء الاختبار (بديل نافذة «تسجيل ملاحظة مؤقتة»).
// مشتركة بين ركن الكبار (games/adultGame.js) وركن الأطفال (games/kidsGame.js).
//
// السلوك: زر «📝 ملاحظة» ينزلق تحته قائمة (#note-sheet) فيها أنواع الملاحظات وحقل نص، ويتحوّل نفس
// الزر إلى «↩ تراجع» (يغلق القائمة ويمسح اختيارها). يظهر زر «⏭ حفظ والتالي» (#btn-submit-all-errors)
// في نفس صف الأزرار ما إن يُختار نوع أو يُكتب نص. القيم المخزَّنة هي نفسها قيم checkbox القديمة،
// فلا تتأثر التقارير ولا engine/skillMap.js.

import { t } from '../core/app.js';

const $ = id => document.getElementById(id);

export function isNoteSheetOpen() {
    return !!$('note-sheet')?.classList.contains('open');
}

function setNoteLabel(open) {
    const btn = $('btn-record-wrong');
    if (!btn) return;
    const key = open ? 'note_undo_btn' : 'note_btn';
    btn.dataset.i18n = key;
    btn.innerHTML = t(key);
    btn.classList.toggle('note-undo', open);
}

function clearSheet() {
    document.querySelectorAll('#note-sheet input[type="checkbox"]').forEach(cb => { cb.checked = false; });
    const note = $('custom-note');
    if (note) note.value = '';
}

// يُظهر/يُخفي زر «حفظ والتالي» حسب وجود اختيار أو نص
export function syncNoteSave() {
    const save = $('btn-submit-all-errors');
    if (!save) return;
    const has = !!document.querySelector('#note-sheet input[type="checkbox"]:checked') || !!$('custom-note')?.value.trim();
    save.style.display = (isNoteSheetOpen() && has) ? 'inline-block' : 'none';
}

export function openNoteSheet() {
    const sheet = $('note-sheet');
    if (!sheet) return;
    clearSheet();
    sheet.classList.add('open');
    setNoteLabel(true);
    // لا تُفتح الإجابة تلقائياً: تظهر فقط بزر «إظهار الإجابة» نفسه
    syncNoteSave();
    // بعد انتهاء الانزلاق: نُبقي القائمة ظاهرة على الشاشات القصيرة
    setTimeout(() => { if (isNoteSheetOpen()) sheet.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 320);
}

export function closeNoteSheet() {
    const sheet = $('note-sheet');
    if (!sheet) return;
    sheet.classList.remove('open');
    clearSheet();
    setNoteLabel(false);
    syncNoteSave();
}

export function toggleNoteSheet() {
    if (isNoteSheetOpen()) closeNoteSheet(); else openNoteSheet();
}

// الأنواع المخزَّنة (قيم checkbox) من القائمة + نص المعلم يؤخذ من #custom-note في الملف المستدعي
export function readNoteChips() {
    return [...document.querySelectorAll('#note-sheet input[type="checkbox"]:checked')].map(cb => cb.value);
}

export function bindNoteSheet() {
    const sheet = $('note-sheet');
    if (!sheet) return;
    sheet.addEventListener('change', e => {
        const cb = e.target;
        if (!(cb instanceof HTMLInputElement) || cb.type !== 'checkbox') return;
        // «لم يعرف الإجابة» حالة مستقلة: تلغي بقية الأنواع، وأي نوع آخر يلغيها
        if (cb.checked) {
            sheet.querySelectorAll('input[type="checkbox"]').forEach(o => {
                if (o !== cb && (cb.dataset.exclusive || o.dataset.exclusive)) o.checked = false;
            });
        }
        syncNoteSave();
    });
    $('custom-note')?.addEventListener('input', syncNoteSave);
    $('custom-note')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); const s = $('btn-submit-all-errors'); if (s && s.style.display !== 'none') s.click(); }
    });
}
