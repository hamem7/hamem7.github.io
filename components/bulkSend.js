// components/bulkSend.js
// ==========================================================
// 🌟 [جديد — الإرسال الجماعي] شاشة اختيارية لتجهيز ونشر واجبات عدة طلاب دفعة واحدة (بنفس الواجب الذكي الحالي، لا بديل عنه).
// صف لكل طالب: تحديد + قائمة نطاق منسدلة (كل النطاق / اقترح لي / سور محددة / أحزاب محددة) + عدد الأسئلة + حالة.
// المراحل: ١) اختيار ← ٢) «جهّز» (يولّد الأسئلة لكل صف دون نشر) ← ٣) «انشر» (دخول جوجل مرة واحدة، ثم نشر متتابع) ← ٤) قائمة روابط ورسائل.
//
// قاعدة التصميم: لا منطق جديد للتوليد ولا للنشر — كلاهما نفس ما تستعمله شاشة الإعداد (planSmartHomework / publishHomeworkToServer
// + نسخة محلية في سجل الواجبات + saveLastScope)، فيختفي الطالب من «مهام اليوم» تلقائياً كما لو نُشر له من الشاشة العادية.
// الملف مستقل (يُحمَّل عند الطلب فقط كشاشة «جدول الأسبوع»)، وأي فشل هنا لا يمسّ شاشة الإعداد.
// النصوص ثنائية اللغة عبر L(ar, en) (نصوص هذه الميزة فقط).
// ==========================================================

import { AppState } from '../core/app.js';
import { esc } from '../core/escape.js';
import { isEnglish, t } from '../core/i18n.js';
import { HomeworkEngine } from '../engine/homeworkEngine.js';
import { loadContext, buildSelectionModel, planSmartHomework, suggestSelection, saveLastScope, getMonthlyStaleness } from '../core/trackingService.js';
import { listDueToday, markStudentPublished } from '../core/hwScheduleService.js';
import { publishHomeworkToServer, friendlyErrorText } from '../core/homeworkApi.js';
import { loadScreen, switchTheme } from '../core/navigation.js';
import { ensureHomeworkSignIn } from './teacherAuthGate.js';
import { catLabel } from './skillProfile.js';

const L = (ar, en) => (isEnglish() ? en : ar);
const nf = (n) => String(n);
const MIN_Q = 20, MAX_Q = 50, DEFAULT_Q = 20;
const clampQ = (v) => Math.max(MIN_Q, Math.min(MAX_Q, Math.round(Number(v)) || DEFAULT_Q));
const BATCH_OPTIONS = [5, 10, 15, 20];   // كم طالباً يظهرون في القائمة دفعة واحدة (الباقون المستحقون ينتظرون ويحلّون مكان من نُشر لهم)
const BATCH_KEY = 'dh_bulk_batch';
const readBatch = () => { try { const v = Number(localStorage.getItem(BATCH_KEY)); if (BATCH_OPTIONS.includes(v)) return v; } catch (e) { /* الافتراضي */ } return 10; };
const RECENT_MS = 12 * 3600 * 1000;   // واجب منشور لنفس الطالب خلال هذه المدة يُنبَّه عليه (منعاً للنشر المكرر بالخطأ)

function injectStyle() {
    if (document.getElementById('bs-style')) return;
    const st = document.createElement('style');
    st.id = 'bs-style';
    st.textContent = `
    .bs-ov{position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:100000;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:12px}
    .bs-box{background:#f6f8f6;color:#10241c;border-radius:16px;max-width:1040px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.3);text-align:right;margin-bottom:96px;font-family:inherit}
    .bs-head{display:flex;align-items:center;gap:12px;padding:14px 16px;background:#fff;border-radius:16px 16px 0 0;border-bottom:3px solid #d4af37}
    .bs-head .ic{width:44px;height:44px;border-radius:13px;background:#e7f4ee;display:grid;place-items:center;font-size:1.4rem;flex:none}
    .bs-head h2{margin:0;font-size:1.2rem}.bs-head small{display:block;color:#4a6058;font-size:.82rem}
    .bs-head .sp{flex:1}
    .bs-x{border:0;background:#f1f5f9;border-radius:10px;padding:8px 14px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap}
    .bs-body{padding:14px 16px 8px}
    .bs-steps{display:flex;gap:6px;margin-bottom:12px;overflow-x:auto;scrollbar-width:none}
    .bs-st{flex:1;min-width:110px;background:#fff;border:1px solid #e3ebe6;border-radius:12px;padding:8px 10px;font-size:.85rem;font-weight:700;color:#4a6058;display:flex;gap:8px;align-items:center}
    .bs-st b{width:22px;height:22px;border-radius:50%;background:#e3ebe6;display:grid;place-items:center;font-size:.78rem;flex:none}
    .bs-st.on{border-color:#147c5e;color:#0d5c46;background:#f3faf6}.bs-st.on b{background:#0d5c46;color:#fff}
    .bs-st.done b{background:#147c5e;color:#fff}
    .bs-tools{background:#fff;border:1px solid #e3ebe6;border-radius:14px;padding:10px 12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
    .bs-tools .lbl{font-size:.84rem;color:#4a6058;font-weight:700}
    .bs-chip{border:1px solid #e3ebe6;background:#f6f8f6;border-radius:99px;padding:6px 13px;font-size:.84rem;font-weight:700;cursor:pointer;font-family:inherit;color:inherit}
    .bs-chip:hover{background:#e7f4ee}
    /* تنسيق select/input العام في المنصة يضخّمها: نثبّت مقاساتها داخل هذه الشاشة فقط */
    .bs-ov select,.bs-ov input[type=number]{box-sizing:border-box!important;height:auto!important;min-height:0!important;margin:0!important;font-family:inherit!important;color:#10241c!important;background:#fff!important;box-shadow:none!important}
    .bs-tools select,.bs-tools input[type=number]{border:1px solid #e3ebe6!important;border-radius:10px!important;padding:6px 10px!important;font-size:.88rem!important;line-height:1.4!important}
    .bs-tools select{width:auto!important;min-width:190px;max-width:100%}
    .bs-tools input[type=number]{width:64px!important;text-align:center}
    .bs-vr{width:1px;align-self:stretch;background:#e3ebe6}
    .bs-btn{background:#0d5c46;color:#fff;border:0;border-radius:12px;padding:9px 16px;font-weight:700;font-size:.9rem;cursor:pointer;font-family:inherit}
    .bs-btn:hover{background:#0a3d2f}.bs-btn.sec{background:#e7f4ee;color:#0d5c46}
    .bs-btn:disabled{opacity:.45;cursor:not-allowed}
    /* شريط البحث عن طالب (تصفية الصفوف فقط؛ المحدَّدون يبقون محدَّدين ولو أخفاهم البحث) */
    .bs-search{background:#fff;border:1px solid #e3ebe6;border-radius:14px;padding:8px 12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px}
    .bs-search .ic{font-size:1.05rem}
    .bs-ov input[type=search]{box-sizing:border-box!important;flex:1 1 220px;min-width:0;height:auto!important;margin:0!important;border:1px solid #cfdcd5!important;border-radius:10px!important;padding:8px 12px!important;font-size:.92rem!important;font-family:inherit!important;color:#10241c!important;background:#fff!important;box-shadow:none!important;line-height:1.4!important}
    .bs-ov input[type=search]:focus{outline:2px solid #147c5e;outline-offset:0}
    .bs-qinfo{font-size:.8rem;color:#4a6058;font-weight:700;white-space:nowrap}
    .bs-noresult{display:none;padding:22px;text-align:center;color:#4a6058;font-size:.92rem;line-height:1.8}
    .bs-noresult.on{display:block}
    /* نتائج البحث: بجوار كل اسم زر «＋ إضافة» يضيفه إلى القائمة */
    .bs-res{display:none;background:#fff;border:1px solid #cfdcd5;border-radius:14px;margin-bottom:8px;max-height:280px;overflow:auto;box-shadow:0 6px 18px rgba(6,35,28,.08)}
    .bs-res.on{display:block}
    .bs-res-h{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 12px;background:#f3faf6;border-bottom:1px solid #e3ebe6;font-size:.8rem;color:#4a6058;font-weight:700;position:sticky;top:0}
    .bs-res-i{display:flex;align-items:center;justify-content:flex-start;gap:14px;padding:8px 12px;border-bottom:1px solid #eef3f0}
    .bs-res-i:last-child{border:0}
    .bs-res-i .n{flex:0 1 auto;min-width:0;font-weight:700;overflow-wrap:anywhere}.bs-res-i .n small{display:block;font-weight:400;font-size:.74rem;color:#4a6058}
    .bs-res-empty{padding:16px;text-align:center;color:#4a6058;font-size:.9rem}
    .bs-add{background:#0d5c46;color:#fff;border:0;border-radius:10px;padding:7px 14px;font-weight:700;font-size:.85rem;cursor:pointer;font-family:inherit;white-space:nowrap}
    .bs-add:hover{background:#0a3d2f}
    .bs-add.no{background:#f1f5f9;color:#64748b;cursor:default}.bs-add.no.bad{background:#fef2f2;color:#dc2626}
    .bs-meta{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;justify-content:space-between;margin-top:12px;font-size:.84rem;color:#4a6058;font-weight:700}
    .bs-meta .w{color:#b45309}
    .bs-meta label{display:inline-flex;gap:6px;align-items:center;font-weight:700}
    .bs-meta select{width:auto!important;min-width:0!important;padding:4px 8px!important;font-size:.82rem!important;border:1px solid #cfdcd5!important;border-radius:8px!important}
    @keyframes bs-flash{from{background:#fff3bf}to{background:transparent}}
    .bs-rw.flash{animation:bs-flash 1.6s ease-out}
    .bs-tbl{margin-top:8px;background:#fff;border:1px solid #e3ebe6;border-radius:14px;overflow:hidden}
    .bs-hd,.bs-row{display:grid;grid-template-columns:40px minmax(140px,1.2fr) minmax(200px,1.4fr) 92px minmax(150px,1fr);gap:10px;align-items:center;padding:9px 14px}
    .bs-hd{background:#f3faf6;font-size:.78rem;font-weight:700;color:#4a6058;border-bottom:1px solid #e3ebe6}
    .bs-rw{border-bottom:1px solid #e3ebe6}.bs-rw:last-child{border:0}
    .bs-rw.off{opacity:.55;background:#fafafa}.bs-rw.ready{background:linear-gradient(270deg,transparent,rgba(20,124,94,.05))}
    .bs-nm{font-weight:700;overflow-wrap:anywhere}.bs-rg{font-size:.76rem;color:#4a6058;font-weight:400}
    .bs-tag{display:inline-block;border-radius:99px;font-size:.7rem;font-weight:700;padding:1px 9px;margin-inline-start:6px;white-space:nowrap}
    .bs-tag.late{background:#fef2f2;color:#dc2626}.bs-tag.today{background:#e7f4ee;color:#0d5c46}.bs-tag.recent{background:#e0f2fe;color:#0369a1}
    .bs-row input[type=checkbox]{width:20px;height:20px;accent-color:#0d5c46}
    .bs-ov select.bs-scope{width:100%!important;border:1px solid #cfdcd5!important;border-radius:10px!important;padding:8px 10px!important;font-weight:700!important;font-size:.88rem!important;line-height:1.4!important}
    .bs-qn{display:flex;align-items:center;justify-content:center;gap:4px}
    .bs-qn button{width:26px;height:26px;border-radius:8px;background:#e7f4ee;font-weight:700;color:#0d5c46;border:0;cursor:pointer;font-family:inherit}
    .bs-qn span{min-width:22px;text-align:center;font-weight:700}
    .bs-pill{display:inline-flex;gap:6px;align-items:center;border-radius:99px;padding:3px 11px;font-size:.78rem;font-weight:700}
    .bs-pill.wait{background:#f1f5f9;color:#64748b}.bs-pill.warn{background:#fffbeb;color:#b45309}
    .bs-pill.err{background:#fef2f2;color:#dc2626}.bs-pill.ok{background:#e7f4ee;color:#0d5c46}.bs-pill.pub{background:#e0f2fe;color:#0369a1}
    .bs-sum{font-size:.72rem;color:#4a6058;margin-top:3px;line-height:1.5}
    .bs-sub{grid-column:1/-1;background:#f3faf6;border:1px dashed #b8d8c8;border-radius:12px;padding:9px 12px;margin:2px 0 4px}
    .bs-sub .t{font-size:.8rem;color:#4a6058;margin-bottom:7px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
    .bs-sub .t a{color:#0d5c46;font-weight:700;cursor:pointer;text-decoration:underline}
    .bs-tiles{display:flex;flex-wrap:wrap;gap:6px;max-height:190px;overflow:auto}
    .bs-tile{border:1px solid #cfdcd5;background:#fff;border-radius:10px;padding:5px 10px;font-weight:700;font-size:.82rem;cursor:pointer;font-family:inherit;color:inherit;text-align:center}
    .bs-tile small{display:block;font-weight:500;font-size:.66rem;color:#4a6058}
    .bs-tile.on{background:#0d5c46;color:#fff;border-color:#0d5c46}.bs-tile.on small{color:#cfe8dc}
    .bs-sugg{font-size:.84rem;color:#0d5c46;font-weight:700;line-height:1.7}
    .bs-links{display:none;margin-top:12px;background:#fff;border:1px solid #e3ebe6;border-radius:14px;padding:12px 14px}
    .bs-links.on{display:block}
    .bs-lk{display:grid;grid-template-columns:1fr auto auto auto;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid #e3ebe6}
    .bs-lk:last-child{border:0}.bs-lk.sent{opacity:.6}
    .bs-lk .u{font-size:.72rem;color:#0369a1;direction:ltr;text-align:right;word-break:break-all}
    .bs-lk .cp,.bs-lk .wa,.bs-lk .tg{border:0;border-radius:10px;padding:7px 12px;font-weight:700;font-size:.82rem;cursor:pointer;font-family:inherit;white-space:nowrap}
    .bs-lk .cp{background:#e7f4ee;color:#0d5c46}.bs-lk .wa{background:#25d366;color:#fff}.bs-lk .tg{background:#229ed9;color:#fff}
    .bs-bar{position:fixed;inset-inline:0;bottom:0;background:#fff;border-top:3px solid #d4af37;box-shadow:0 -8px 24px rgba(6,35,28,.12);z-index:100001}
    .bs-bar>div{max-width:1040px;margin:0 auto;display:flex;gap:10px;align-items:center;padding:11px 16px;flex-wrap:wrap}
    .bs-cnt{font-weight:700}.bs-cnt small{display:block;color:#4a6058;font-weight:500;font-size:.74rem}
    .bs-prog{display:none;flex:1;min-width:140px}.bs-prog.on{display:block}
    .bs-prog div{height:9px;background:#e3ebe6;border-radius:99px;overflow:hidden}.bs-prog i{display:block;height:100%;width:0;background:#147c5e;transition:width .25s}
    .bs-prog small{font-size:.74rem;color:#4a6058}
    .bs-sp{flex:1}
    .bs-toast{position:fixed;bottom:92px;left:50%;transform:translateX(-50%);background:#0a3d2f;color:#fff;padding:9px 18px;border-radius:99px;font-size:.88rem;z-index:100002;pointer-events:none;max-width:90vw;text-align:center}
    .bs-empty{padding:26px;text-align:center;color:#4a6058}
    /* وضع «الصفحة المستقلة»: يملأ منطقة المحتوى داخل المنصة بدل التراكب العائم؛ وشريط الإجراءات لاصق أسفل الصفحة */
    .bs-ov.bs-pg{position:static;background:none;padding:12px;overflow:visible;display:block;z-index:auto}
    .bs-pg .bs-box{margin:0 auto;box-shadow:0 4px 18px rgba(6,35,28,.1)}
    .bs-pg .bs-bar{position:sticky;margin-top:10px;border-radius:14px 14px 0 0;z-index:5}
    .bs-pg .bs-toast{position:fixed}
    @media(max-width:760px){
      .bs-hd{display:none}
      .bs-row{grid-template-columns:34px 1fr auto;grid-template-areas:"c n q" "s s s" "t t t";row-gap:8px}
      .bs-row>.c{grid-area:c}.bs-row>.n{grid-area:n}.bs-row>.q{grid-area:q}.bs-row>.s{grid-area:s}.bs-row>.t{grid-area:t}
      .bs-vr{display:none}
      .bs-lk{grid-template-columns:1fr 1fr 1fr}.bs-lk>div:first-child{grid-column:1/-1}
      .bs-head small{display:none}
    }`;
    document.head.appendChild(st);
}

// ---------- أدوات النطاق والرسائل (نصوص فقط، لا منطق توليد) ----------
const surahName = (n) => { const s = (AppState.surahsData || []).find(x => x.number === n); return s ? s.name : String(n); };
const groupTitle = (g) => (g.unit === 'quarter' ? `${L('الحزب', 'Hizb')} ${g.hizb} · ${L('ربع', 'Q')} ${g.quarter}` : `${L('الحزب', 'Hizb')} ${g.hizb}`);
const groupLabel = (g) => (g.unit === 'quarter' ? `${L('ح', 'H')}${g.hizb}·${g.quarter}` : `${L('ح', 'H')}${g.hizb}`);

// نص النطاق لرسالة ولي الأمر: كل النطاق، أو «من X إلى Y» إن كان المختار متصلاً بترتيب المصحف، وإلا تُسرد العناصر.
function scopeLabelOf(row, selection, model) {
    if (!selection || selection.mode === 'all' || !model) return L('كل النطاق', 'Whole range');
    if (selection.mode === 'surah') {
        const items = model.surahs.filter(s => selection.ids.includes(s.number));
        const names = items.map(s => `${L('سورة', 'Surah')} ${s.name}`);
        const idx = items.map(s => model.surahs.findIndex(x => x.number === s.number));
        const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
        return names.length > 1 && contiguous ? `${L('من', 'From')} ${names[0]} ${L('إلى', 'to')} ${names[names.length - 1]}` : names.join(L('، ', ', '));
    }
    const items = model.groups.filter(g => selection.ids.includes(g.id));
    const titles = items.map(groupTitle);
    const idx = items.map(g => model.groups.findIndex(x => x.id === g.id));
    const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
    return titles.length > 1 && contiguous ? `${L('من', 'From')} ${titles[0]} ${L('إلى', 'to')} ${titles[titles.length - 1]}` : titles.join(L('، ', ', '));
}

// نطاق الواجب المخزَّن (للشهادة وسجل الطالب): من أول سورة في مسار حفظه إلى موضع توقّفه + نص النطاق المختار
function buildScope(ctx, label) {
    if (!ctx || !ctx.path || !ctx.path.segments.length) return null;
    const segs = ctx.path.segments;
    const fromNum = segs[0].surah, toNum = segs[segs.length - 1].surah;
    const fromName = surahName(fromNum), toName = surahName(toNum);
    if (!fromName || !toName) return null;
    return { mode: 'range', fromNum, fromName, toNum, toName, smart: true, label };
}

// نفس صيغة رسالة شاشة الإعداد تماماً (مفاتيح i18n نفسها)
function buildMessage(link, studentName, scope) {
    const studentLine = studentName ? `${t('hw_copy_msg_student_label')} ${studentName}\n` : '';
    const scopeText = (scope && typeof scope === 'object' && scope.label) ? String(scope.label) : '';
    const scopeLine = scopeText ? `${t('hw_copy_msg_scope_label')} ${scopeText}\n` : '';
    return `${t('hw_copy_msg_title')}\n${studentLine}${scopeLine}${t('hw_copy_msg_link_label')}\n${link}\n${t('hw_copy_msg_footer')}`;
}

async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* احتياطي أدناه */ }
    try {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
        document.body.appendChild(ta); ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
    } catch (e) { return false; }
}

// ==========================================================
// asPage=true: يُفتح كصفحة مستقلة داخل المنصة (تستبدل الشاشة الحالية في #app-root) بدل نافذة عائمة؛ وonClose يتولّى العودة للشاشة السابقة.
export async function openBulkSend({ onClose, asPage = false } = {}) {
    injectStyle();
    let ov;
    if (asPage) {
        switchTheme('adult');
        document.body.style.backgroundImage = '';
        await loadScreen({ templateUrl: 'settings/bulk-send.html' });
        ov = document.getElementById('bs-page');
        if (!ov) return;
        ov.className = 'bs-ov bs-pg';
    } else {
        ov = document.createElement('div');
        ov.className = 'bs-ov';
    }
    ov.innerHTML = `<div class="bs-box" role="dialog" aria-modal="true">
        <div class="bs-head"><div class="ic">📤</div><div><h2>${esc(L('الإرسال الجماعي', 'Bulk send'))}</h2><small>${esc(L('جهّز واجبات عدة طلاب دفعة واحدة — اختياري، والشاشة العادية كما هي', 'Prepare several students\' homework at once — optional; the normal screen is unchanged'))}</small></div><div class="sp"></div>
            <button type="button" class="bs-x" data-act="close">${asPage ? '→' : '✕'} ${esc(asPage ? L('رجوع', 'Back') : L('إغلاق', 'Close'))}</button></div>
        <div class="bs-body" id="bs-body"><div class="bs-empty">${esc(L('جارٍ التحميل…', 'Loading…'))}</div></div></div>
        <div class="bs-bar"><div>
            <div class="bs-cnt" id="bs-cnt"></div>
            <div class="bs-prog" id="bs-prog"><div><i id="bs-prog-i"></i></div><small id="bs-prog-t"></small></div>
            <div class="bs-sp"></div>
            <button type="button" class="bs-btn sec" id="bs-prep" disabled>⚙️ ${esc(L('جهّز المحدَّدين', 'Prepare selected'))}</button>
            <button type="button" class="bs-btn" id="bs-pub" disabled>🚀 ${esc(L('انشر المجهَّزين', 'Publish prepared'))}</button>
        </div></div>`;
    if (!asPage) document.body.appendChild(ov);

    let closed = false, busy = false;
    const $ = (s) => ov.querySelector(s);
    let toastTimer = null;
    const toast = (m) => {
        ov.querySelector('.bs-toast')?.remove();
        const el = document.createElement('div'); el.className = 'bs-toast'; el.textContent = m; ov.appendChild(el);
        clearTimeout(toastTimer); toastTimer = setTimeout(() => el.remove(), 2600);
    };
    const hwEngine = AppState.quranEngine ? new HomeworkEngine(AppState.quranEngine) : null;

    const close = async () => {
        if (busy) return toast(L('انتظر حتى تنتهي العملية الجارية.', 'Please wait for the current operation to finish.'));
        const pending = rows.filter(r => r.state === 'ready').length;
        if (pending && !await hamConfirm(L(`هناك ${pending} واجباً مجهَّزاً لم يُنشر بعد، وسيضيع عند الإغلاق. إغلاق؟`, `${pending} prepared homework(s) are not published and will be lost. Close anyway?`))) return;
        closed = true; document.removeEventListener('keydown', onKey); if (!asPage) ov.remove(); if (onClose) onClose();
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);

    // ---------- تحميل الطلاب ----------
    let rows = [];
    try {
        const all = ((await AppState.studentManager.getAllStudents()) || []).filter(s => !s.isHidden);
        let due = [];
        try { due = (await listDueToday()).rows; } catch (e) { console.warn('تعذر قراءة المستحقين اليوم:', e); }
        const dueBy = new Map(due.map(r => [r.student.id, r]));
        const lastPub = new Map();
        try {
            ((await AppState.homeworkManager.getAllHomeworks()) || []).forEach(h => {
                if (h.status !== 'published' || !h.assignedStudentName) return;
                const ts = Date.parse(h.createdAt) || 0;
                if (ts > (lastPub.get(h.assignedStudentName) || 0)) lastPub.set(h.assignedStudentName, ts);
            });
        } catch (e) { /* بلا سجل محلي: لا تنبيه */ }
        rows = all.map(s => ({
            student: s, due: dueBy.get(s.id) || null, recent: (Date.now() - (lastPub.get(s.name) || 0)) < RECENT_MS,
            listed: false, auto: false, sel: false, scope: 'all', pick: new Set(), q: DEFAULT_Q, status: 'checking', ctx: null, model: null, sugg: null,
            state: 'idle', res: null, selection: null, scopeLabel: '', err: '', hwId: null, link: '', sent: false
        }));
        rows.sort((a, b) => ((b.due ? 1000 + (b.due.lateDays || 0) : 0) - (a.due ? 1000 + (a.due.lateDays || 0) : 0)) || String(a.student.name).localeCompare(String(b.student.name), 'ar'));
    } catch (e) {
        console.error('تعذر تحميل الطلاب للإرسال الجماعي:', e);
        $('#bs-body').innerHTML = `<div class="bs-empty">${esc(L('تعذر تحميل الطلاب. أغلق الشاشة وحاول مرة أخرى.', 'Could not load students. Close and try again.'))}</div>`;
        ov.querySelector('[data-act="close"]').onclick = close;
        return;
    }
    if (!rows.length) {
        $('#bs-body').innerHTML = `<div class="bs-empty">${esc(L('لا يوجد طلاب بعد. أضف طلابك أولاً من «طلابي».', 'No students yet. Add students first from "My students".'))}</div>`;
        ov.querySelector('[data-act="close"]').onclick = close;
        return;
    }
    const byId = (id) => rows.find(r => String(r.student.id) === String(id));

    // ---------- الهيكل ----------
    $('#bs-body').innerHTML = `
        <div class="bs-steps" id="bs-steps">
            <div class="bs-st on"><b>1</b>${esc(L('اختيار الطلاب والنطاق', 'Pick students & range'))}</div>
            <div class="bs-st"><b>2</b>${esc(L('التجهيز والمراجعة', 'Prepare & review'))}</div>
            <div class="bs-st"><b>3</b>${esc(L('النشر', 'Publish'))}</div>
            <div class="bs-st"><b>4</b>${esc(L('الروابط والإرسال', 'Links & sending'))}</div>
        </div>
        <div class="bs-search">
            <span class="ic" aria-hidden="true">🔍</span>
            <input type="search" id="bs-q" autocomplete="off" placeholder="${esc(L('ابحث عن طالب بالاسم ثم اضغط «＋ إضافة» بجواره… (Enter يضيف أول نتيجة)', 'Search a student by name then press "＋ Add" next to them… (Enter adds the first result)'))}" aria-label="${esc(L('بحث عن طالب', 'Search a student'))}">
            <button type="button" class="bs-chip" id="bs-qx" style="display:none" aria-label="${esc(L('مسح البحث', 'Clear search'))}">✕</button>
        </div>
        <div class="bs-res" id="bs-res"></div>
        <div class="bs-tools">
            <span class="lbl">${esc(L('تحديد:', 'Select:'))}</span>
            <button type="button" class="bs-chip" data-sel="all">${esc(L('الكل', 'All'))}</button>
            <button type="button" class="bs-chip" data-sel="due">${esc(L('المستحقون اليوم', 'Due today'))}</button>
            <button type="button" class="bs-chip" data-sel="late">${esc(L('المتأخرون فقط', 'Late only'))}</button>
            <button type="button" class="bs-chip" data-sel="none">${esc(L('مسح', 'Clear'))}</button>
            <span class="bs-vr"></span>
            <span class="lbl">${esc(L('للمحدَّدين:', 'For selected:'))}</span>
            <select id="bs-bulk-scope"><option value="all">${esc(L('كل النطاق', 'Whole range'))}</option><option value="suggest">✨ ${esc(L('اقترح لي (الأحوج للمراجعة)', 'Suggest (needs review most)'))}</option></select>
            <input type="number" id="bs-bulk-q" value="${DEFAULT_Q}" min="${MIN_Q}" max="${MAX_Q}" aria-label="${esc(L('عدد الأسئلة', 'Number of questions'))}">
            <button type="button" class="bs-btn sec" data-act="apply">${esc(L('تطبيق', 'Apply'))}</button>
        </div>
        <div class="bs-meta"><span id="bs-meta-t"></span>
            <label>${esc(L('حجم الدفعة:', 'Batch size:'))} <select id="bs-batch">${BATCH_OPTIONS.map(n => `<option value="${n}"${n === readBatch() ? ' selected' : ''}>${n}</option>`).join('')}</select></label></div>
        <div class="bs-tbl">
            <div class="bs-hd"><span></span><span>${esc(L('الطالب', 'Student'))}</span><span>${esc(L('نطاق الواجب', 'Homework range'))}</span><span style="text-align:center">${esc(L('الأسئلة', 'Questions'))}</span><span>${esc(L('الحالة', 'Status'))}</span></div>
            <div id="bs-rows"></div>
            <div class="bs-noresult" id="bs-noresult"></div>
        </div>
        <div class="bs-links" id="bs-links"></div>`;
    const rowsEl = $('#bs-rows');

    // ---------- الرسم ----------
    const tag = (r) => {
        let h = '';
        if (r.due && r.state !== 'pub') h += r.due.lateDays > 0 ? `<span class="bs-tag late">${esc(L(`متأخر ${r.due.lateDays}${r.due.capped ? '+' : ''} يوم`, `${r.due.lateDays}d late`))}</span>` : `<span class="bs-tag today">${esc(L('موعده اليوم', 'Due today'))}</span>`;
        if (r.recent && r.state !== 'pub') h += `<span class="bs-tag recent" title="${esc(L('نُشر له واجب خلال آخر 12 ساعة', 'Homework was published for them in the last 12 hours'))}">${esc(L('نُشر له حديثاً', 'Published recently'))}</span>`;
        return h;
    };
    const rangeText = (r) => (r.student.memoFrom && r.student.memoTo) ? `${r.student.memoFrom} ← ${r.student.memoTo}` : '—';
    const mixText = (res) => {
        const c = {};
        (res.why || []).forEach(m => { c[m.cat] = (c[m.cat] || 0) + 1; });
        const parts = ['new', 'near', 'far', 'err'].filter(k => c[k]).map(k => `${catLabel(k)} ${nf(c[k])}`);
        return parts.join(' · ');
    };
    const statusHtml = (r) => {
        if (r.state === 'pub') return `<span class="bs-pill pub">✓ ${esc(L('نُشر', 'Published'))}</span>`;
        if (r.state === 'publishing') return `<span class="bs-pill wait">⏳ ${esc(L('جارٍ النشر…', 'Publishing…'))}</span>`;
        if (r.state === 'planning') return `<span class="bs-pill wait">⏳ ${esc(L('جارٍ التجهيز…', 'Preparing…'))}</span>`;
        if (r.state === 'fail') return `<span class="bs-pill err">❌ ${esc(L('تعذّر', 'Failed'))}</span><div class="bs-sum">${esc(r.err)}</div>`;
        if (r.state === 'ready' && r.err) return `<span class="bs-pill err">❌ ${esc(L('تعذّر النشر — اضغط «انشر» لإعادة المحاولة', 'Publish failed — press Publish to retry'))}</span><div class="bs-sum">${esc(r.err)}</div>`;
        if (r.state === 'ready') return `<span class="bs-pill ok">✓ ${esc(L('جُهّز', 'Prepared'))}</span><div class="bs-sum">${esc(`${nf(r.res.questions.length)} ${L('سؤالاً', 'questions')}`)}${mixText(r.res) ? ' — ' + esc(mixText(r.res)) : ''}</div>`;
        if (r.status === 'norange') return `<span class="bs-pill err">❌ ${esc(L('بلا نطاق حفظ', 'No memorization range'))}</span>`;
        if (r.status === 'stale') return `<span class="bs-pill warn">⚠️ ${esc(L('موضع الحفظ قديم', 'Position outdated'))}</span>`;
        if (r.status === 'checking') return `<span class="bs-pill wait">… ${esc(L('جارٍ الفحص', 'Checking'))}</span>`;
        return `<span class="bs-pill wait">⏳ ${esc(L('ينتظر', 'Waiting'))}</span>`;
    };
    const subHtml = (r) => {
        if (r.scope === 'suggest') {
            if (!r.model) return `<div class="bs-sub"><div class="bs-sugg">${esc(L('جارٍ تحليل نطاقه…', 'Analysing their range…'))}</div></div>`;
            if (!r.sugg || !r.sugg.length) return `<div class="bs-sub"><div class="bs-sugg">${esc(L('كل نطاقه مغطّى حديثاً — سيُبنى الواجب على كل النطاق.', 'Their whole range is recently covered — the homework will use the whole range.'))}</div></div>`;
            const names = r.model.groups.filter(g => r.sugg.includes(g.id)).map(g => `${groupTitle(g)}${g.name ? ` «${g.name}»` : ''}`);
            return `<div class="bs-sub"><div class="bs-sugg">✨ ${esc(L('يقترح النظام: ', 'Suggested: '))}${esc(names.join(L('، ', ', ')))} — ${esc(L('الأحوج للمراجعة', 'needs review most'))}</div></div>`;
        }
        if (r.scope !== 'surah' && r.scope !== 'hizb') return '';
        if (!r.model) return `<div class="bs-sub"><div class="bs-sugg">${esc(L('جارٍ التحميل…', 'Loading…'))}</div></div>`;
        const isS = r.scope === 'surah', list = isS ? r.model.surahs : r.model.groups;
        const key = (x) => (isS ? x.number : x.id);
        const unitW = isS ? L('السور', 'surahs') : (r.model.unit === 'hizb' ? L('الأحزاب', 'hizbs') : L('الأرباع', 'quarters'));
        return `<div class="bs-sub"><div class="t"><span>${esc(L('اضغط ما تريده من ', 'Tap the ') + unitW)} <small>(${nf(r.pick.size)} / ${nf(list.length)})</small></span><span><a data-a="all">${esc(L('تحديد الكل', 'Select all'))}</a> · <a data-a="clear">${esc(L('مسح', 'Clear'))}</a></span></div>
            <div class="bs-tiles">${list.map(x => `<button type="button" class="bs-tile${r.pick.has(key(x)) ? ' on' : ''}" data-k="${esc(String(key(x)))}" title="${esc(isS ? x.name : groupTitle(x))}">${isS ? esc(x.name) : `${esc(groupLabel(x))}${x.name ? `<small>${esc(x.name)}</small>` : ''}`}</button>`).join('')}</div></div>`;
    };
    const rowInner = (r) => {
        const dis = r.status === 'norange' || r.state === 'pub' || r.state === 'publishing' || r.state === 'planning';
        const lock = r.state === 'pub' || r.state === 'publishing' || r.state === 'planning';
        return `<div class="bs-row">
            <span class="c"><input type="checkbox" data-f="sel" ${r.sel ? 'checked' : ''} ${dis ? 'disabled' : ''} aria-label="${esc(r.student.name)}"></span>
            <span class="n"><span class="bs-nm">${esc(r.student.name)}</span>${tag(r)}<div class="bs-rg">${esc(rangeText(r))}</div></span>
            <span class="s"><select class="bs-scope" data-f="scope" ${dis || lock ? 'disabled' : ''}>
                <option value="all"${r.scope === 'all' ? ' selected' : ''}>${esc(L('كل النطاق', 'Whole range'))}</option>
                <option value="suggest"${r.scope === 'suggest' ? ' selected' : ''}>✨ ${esc(L('اقترح لي (الأحوج للمراجعة)', 'Suggest (needs review most)'))}</option>
                <option value="surah"${r.scope === 'surah' ? ' selected' : ''}>${esc(L('سور محددة', 'Chosen surahs'))}</option>
                <option value="hizb"${r.scope === 'hizb' ? ' selected' : ''}>${esc(L('أحزاب محددة', 'Chosen hizbs'))}</option>
            </select></span>
            <span class="q bs-qn"><button type="button" data-q="-1" ${dis || lock ? 'disabled' : ''} aria-label="-">−</button><span>${nf(r.q)}</span><button type="button" data-q="1" ${dis || lock ? 'disabled' : ''} aria-label="+">+</button></span>
            <span class="t">${statusHtml(r)}</span>
            ${lock ? '' : subHtml(r)}
        </div>`;
    };
    // ---- قائمة العمل ----
    // لا يُعرض في الجدول إلا «دفعة» قصيرة من الطلاب المستحقين (الأكثر تأخراً أولاً) + من تضيفهم بالبحث. من يُنشر لهم يغادرون الجدول
    // (يبقون في قائمة الروابط) ويحلّ مكانهم تلقائياً مستحقون آخرون. الطالب بلا نطاق حفظ لا يُدرج تلقائياً في القائمة.
    let batch = readBatch(), skippedNoRange = 0;
    const visible = () => rows.filter(r => r.listed && r.state !== 'pub');
    const pool = () => rows.filter(r => !r.listed && r.state !== 'pub' && r.due && r.status !== 'norange');
    const rowCls = (r) => `bs-rw${r.status === 'norange' ? ' off' : ''}${r.state === 'ready' ? ' ready' : ''}`;
    const rowWrap = (r) => `<div class="${rowCls(r)}" data-id="${esc(String(r.student.id))}">${rowInner(r)}</div>`;
    const rowEl = (r) => rowsEl.querySelector(`.bs-rw[data-id="${CSS.escape(String(r.student.id))}"]`);
    const renderRow = (r) => {
        const el = rowEl(r);
        if (!el) return;
        el.className = rowCls(r);
        el.innerHTML = rowInner(r);
    };
    const selectable = (r) => r.status !== 'norange' && r.state !== 'pub' && r.state !== 'publishing' && r.state !== 'planning';
    const renderMeta = () => {
        const n = visible().length, waiting = pool().length;
        $('#bs-meta-t').innerHTML = `📋 ${esc(L(`${n} طالب في القائمة`, `${n} in the list`))}`
            + (waiting ? ` · <span class="w">${esc(L(`${waiting} مستحقاً آخرين ينتظرون — يظهرون تلقائياً بعد النشر`, `${waiting} more due students waiting — they appear automatically after publishing`))}</span>` : '')
            + (skippedNoRange ? ` · <span class="w">${esc(L(`تخطّينا ${skippedNoRange} مستحقاً بلا نطاق حفظ`, `skipped ${skippedNoRange} due student(s) with no memorization range`))}</span>` : '');
        const empty = $('#bs-noresult');
        const donePub = rows.some(r => r.state === 'pub');
        empty.textContent = n ? '' : (donePub && !waiting ? L('🎉 انتهيت من كل المستحقين اليوم. ابحث بالاسم لإضافة طلاب آخرين.', '🎉 You are done with everyone due today. Search by name to add other students.')
            : L('لا طلاب مستحقون الآن. ابحث بالاسم لإضافة من تريد.', 'No students are due right now. Search by name to add the ones you want.'));
        empty.classList.toggle('on', !n);
    };
    const renderFoot = () => {
        const vis = visible();
        const n = vis.filter(r => r.sel).length, ready = vis.filter(r => r.state === 'ready').length, pub = rows.filter(r => r.state === 'pub').length;
        const fail = vis.filter(r => r.state === 'fail').length;
        $('#bs-cnt').innerHTML = `${esc(L(`${n} محدَّد`, `${n} selected`))}<small>${esc(pub ? L(`نُشر ${pub}${ready ? ` · جُهّز ${ready}` : ''}${fail ? ` · تعذّر ${fail}` : ''}`, `Published ${pub}${ready ? ` · prepared ${ready}` : ''}${fail ? ` · failed ${fail}` : ''}`) : ready ? L(`جُهّز ${ready} — راجعهم ثم انشر`, `${ready} prepared — review then publish`) : L('لم يُجهَّز شيء بعد', 'Nothing prepared yet'))}</small>`;
        $('#bs-prep').disabled = busy || !n;
        $('#bs-pub').disabled = busy || !ready;
    };
    const renderAll = () => { rowsEl.innerHTML = visible().map(rowWrap).join(''); renderMeta(); renderFoot(); };
    const listRow = (r, { top = false, flash = false } = {}) => {
        rowsEl.insertAdjacentHTML(top ? 'afterbegin' : 'beforeend', rowWrap(r));
        if (flash) { const el = rowEl(r); if (el) { el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1800); } }
    };
    const unlistRow = (r) => { r.listed = false; r.sel = false; rowEl(r)?.remove(); };
    // يملأ القائمة من المستحقين المنتظرين حتى حجم الدفعة؛ يرجع عدد من أُضيفوا
    const refill = () => {
        let added = 0;
        for (const r of pool()) {
            if (visible().length >= batch) break;
            r.listed = true; r.auto = true; r.sel = true;
            listRow(r); added++;
        }
        renderMeta(); renderFoot();
        return added;
    };
    const setStep = (n) => ov.querySelectorAll('.bs-st').forEach((e, i) => { e.classList.toggle('on', i === n - 1); e.classList.toggle('done', i < n - 1); });
    refill();   // أول عرض: دفعة المستحقين الأكثر تأخراً (محدَّدة افتراضياً، ولا يُنشر شيء قبل أن تضغط «جهّز» ثم «انشر»)
    renderAll();

    $('#bs-batch').addEventListener('change', (e) => {
        batch = Number(e.target.value) || 10;
        try { localStorage.setItem(BATCH_KEY, String(batch)); } catch (err) { /* لا شيء */ }
        refill();
    });

    // ---- البحث عن طالب وإضافته: نفس تطبيع بحث شاشة الإعداد (يتجاهل التشكيل والفروق بين أ إ آ ا / ى ي / ة ه) ----
    let query = '';
    const normQ = (str) => String(str || '').toLowerCase().replace(/[ً-ْٰـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').trim();
    const nameMatches = (r) => { const n = normQ(r.student.name); return query.split(/\s+/).every(w => n.includes(w)); };
    const canAdd = (r) => !r.listed && r.state !== 'pub' && r.status !== 'norange';
    const addStudent = (r) => {
        if (!canAdd(r)) return false;
        r.listed = true; r.auto = false; r.sel = true;
        listRow(r, { top: true, flash: true });
        return true;
    };
    const renderResults = () => {
        const box = $('#bs-res');
        $('#bs-qx').style.display = query ? '' : 'none';
        if (!query) { box.classList.remove('on'); box.innerHTML = ''; return; }
        const hit = rows.filter(nameMatches);
        box.classList.add('on');
        if (!hit.length) { box.innerHTML = `<div class="bs-res-empty">${esc(L('لا يوجد طالب بهذا الاسم.', 'No student with that name.'))}</div>`; return; }
        const addable = hit.filter(canAdd).length;
        const btn = (r) => {
            if (r.state === 'pub') return `<button type="button" class="bs-add no" disabled>✓ ${esc(L('نُشر له الآن', 'Published now'))}</button>`;
            if (r.listed) return `<button type="button" class="bs-add no" disabled>✓ ${esc(L('في القائمة', 'In the list'))}</button>`;
            if (r.status === 'norange') return `<button type="button" class="bs-add no bad" disabled>❌ ${esc(L('بلا نطاق حفظ', 'No range'))}</button>`;
            return `<button type="button" class="bs-add" data-add="${esc(String(r.student.id))}">＋ ${esc(L('إضافة', 'Add'))}</button>`;
        };
        box.innerHTML = `<div class="bs-res-h"><span>${esc(L(`${hit.length} نتيجة`, `${hit.length} result(s)`))}</span>${addable >= 2 ? `<button type="button" class="bs-chip" id="bs-addall">＋ ${esc(L(`إضافة الكل (${addable})`, `Add all (${addable})`))}</button>` : ''}</div>`
            + hit.slice(0, 12).map(r => `<div class="bs-res-i"><span class="n">${esc(r.student.name)}${tag(r)}<small>${esc(rangeText(r))}</small></span>${btn(r)}</div>`).join('');
    };
    const afterAdd = (names) => {
        renderMeta(); renderFoot(); renderResults();
        toast(L(`أُضيف: ${names.join('، ')}`, `Added: ${names.join(', ')}`));
    };
    const qInput = $('#bs-q');
    qInput.addEventListener('input', () => { query = normQ(qInput.value); renderResults(); });
    qInput.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const first = query && rows.find(r => nameMatches(r) && canAdd(r));
        if (!first) return toast(L('لا نتيجة يمكن إضافتها.', 'No result can be added.'));
        addStudent(first);
        qInput.value = ''; query = '';
        afterAdd([first.student.name]); qInput.focus();   // جاهز لاسم التالي
    });
    $('#bs-qx').addEventListener('click', () => { qInput.value = ''; query = ''; renderResults(); qInput.focus(); });
    $('#bs-res').addEventListener('click', (e) => {
        if (busy) return;
        const one = e.target.closest('[data-add]');
        if (one) { const r = byId(one.dataset.add); if (r && addStudent(r)) afterAdd([r.student.name]); return; }
        if (e.target.closest('#bs-addall')) {
            const added = rows.filter(r => nameMatches(r) && canAdd(r)).filter(addStudent);
            if (added.length) afterAdd(added.map(r => r.student.name));
        }
    });

    // ---------- فحص جاهزية الطلاب في الخلفية (نطاق الحفظ + قِدم الموضع) ----------
    const ensureModel = async (r) => {
        if (r.model) return r.model;
        if (!r.ctx) r.ctx = await loadContext(r.student);
        if (!r.ctx || !r.ctx.range.ok) throw new Error('no_range');
        r.model = await buildSelectionModel(r.student, r.ctx);
        return r.model;
    };
    (async () => {
        for (const r of rows) {
            if (closed) return;
            try {
                r.ctx = await loadContext(r.student);
                if (!r.ctx || !r.ctx.range.ok) { r.status = 'norange'; r.sel = false; }
                else {
                    let stale = false;
                    try { stale = !!(await getMonthlyStaleness(r.student)).stale; } catch (e) { /* التنبيه إضافي */ }
                    r.status = stale ? 'stale' : 'ok';
                }
            } catch (e) { console.warn('تعذر فحص الطالب:', r.student.name, e); r.status = 'ok'; }
            if (closed) return;
            if (r.status === 'norange' && r.auto && r.listed && r.state === 'idle') { skippedNoRange++; unlistRow(r); refill(); }
            else if (r.state === 'idle') { renderRow(r); renderFoot(); }
            if (query) renderResults();   // تحديث أزرار النتائج (مثلاً «بلا نطاق حفظ»)
        }
        if (!closed) ov.dataset.checked = '1';   // انتهى فحص كل الطلاب (للاختبارات ولمن يحتاج إشارة جاهزية)
    })();

    // ---------- التفاعل ----------
    ov.addEventListener('click', async (e) => {
        if (e.target === ov && !asPage) return close();
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (act === 'close') return close();
        if (act === 'apply') {
            if (busy) return;
            const scope = $('#bs-bulk-scope').value, q = clampQ($('#bs-bulk-q').value);
            const sel = rows.filter(r => r.sel && r.state !== 'pub' && r.state !== 'publishing');
            if (!sel.length) return toast(L('حدّد طلاباً أولاً.', 'Select students first.'));
            for (const r of sel) { r.scope = scope; r.pick = new Set(); r.q = q; if (r.state === 'ready' || r.state === 'fail') { r.state = 'idle'; r.res = null; } }
            sel.forEach(renderRow); renderFoot();
            if (scope === 'suggest') for (const r of sel) loadSuggestion(r);
            return toast(L('طُبّق على المحدَّدين', 'Applied to the selected'));
        }
        const chip = e.target.closest('[data-sel]');
        if (chip) {
            if (busy) return;
            const m = chip.dataset.sel;
            visible().forEach(r => {
                if (r.status === 'norange') return;
                r.sel = m === 'all' || (m === 'due' && !!r.due) || (m === 'late' && !!r.due && r.due.lateDays > 0);
            });
            return renderAll();
        }
        const rw = e.target.closest('.bs-rw');
        if (rw) {
            const r = byId(rw.dataset.id); if (!r || busy) return;
            const qb = e.target.closest('[data-q]');
            if (qb) { r.q = clampQ(r.q + Number(qb.dataset.q)); if (r.state === 'ready' || r.state === 'fail') { r.state = 'idle'; r.res = null; } renderRow(r); renderFoot(); return; }
            const tile = e.target.closest('.bs-tile');
            if (tile) {
                const k = r.scope === 'surah' ? Number(tile.dataset.k) : tile.dataset.k;
                if (r.pick.has(k)) r.pick.delete(k); else r.pick.add(k);
                r.sel = true; if (r.state === 'ready' || r.state === 'fail') { r.state = 'idle'; r.res = null; }
                renderRow(r); renderFoot(); return;
            }
            const a = e.target.closest('[data-a]');
            if (a) {
                if (a.dataset.a === 'all' && r.model) r.pick = new Set((r.scope === 'surah' ? r.model.surahs.map(s => s.number) : r.model.groups.map(g => g.id)));
                else r.pick = new Set();
                if (r.state === 'ready' || r.state === 'fail') { r.state = 'idle'; r.res = null; }
                renderRow(r); renderFoot(); return;
            }
        }
        const lk = e.target.closest('.bs-lk');
        if (lk) {
            const r = byId(lk.dataset.id); if (!r) return;
            const msg = buildMessage(r.link, r.student.name, r.res && r.res.scopeObj);
            const btn = e.target.closest('button'); if (!btn) return;
            if (btn.classList.contains('cp')) { toast((await copyText(msg)) ? L('نُسخت الرسالة', 'Message copied') : L('تعذّر النسخ — انسخ الرابط يدوياً', 'Copy failed — copy the link manually')); }
            else if (btn.classList.contains('wa')) window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener');
            else if (btn.classList.contains('tg')) window.open('https://t.me/share/url?url=' + encodeURIComponent(r.link) + '&text=' + encodeURIComponent(msg.replace(r.link, '').replace(/\n{2,}/g, '\n')), '_blank', 'noopener');
            r.sent = true; lk.classList.add('sent');
            return;
        }
        if (e.target.closest('#bs-copy-all')) {
            const done = rows.filter(r => r.state === 'pub');
            const txt = done.map(r => buildMessage(r.link, r.student.name, r.res && r.res.scopeObj)).join('\n\n――――――――\n\n');
            return toast((await copyText(txt)) ? L('نُسخت كل الرسائل', 'All messages copied') : L('تعذّر النسخ', 'Copy failed'));
        }
    });
    ov.addEventListener('change', async (e) => {
        const rw = e.target.closest('.bs-rw'); if (!rw || busy) return;
        const r = byId(rw.dataset.id); if (!r) return;
        if (e.target.dataset.f === 'sel') { r.sel = e.target.checked; renderFoot(); return; }
        if (e.target.dataset.f === 'scope') {
            r.scope = e.target.value; r.pick = new Set(); r.sugg = null; r.sel = true;
            if (r.state === 'ready' || r.state === 'fail') { r.state = 'idle'; r.res = null; }
            renderRow(r); renderFoot();
            if (r.scope === 'suggest') await loadSuggestion(r);
            else if (r.scope === 'surah' || r.scope === 'hizb') await loadModelFor(r);
        }
    });
    async function loadModelFor(r) {
        try { await ensureModel(r); }
        catch (e) { r.status = 'norange'; r.sel = false; r.scope = 'all'; toast(L(`لا نطاق حفظ لـ ${r.student.name}.`, `${r.student.name} has no memorization range.`)); }
        if (!closed) { renderRow(r); renderFoot(); }
    }
    async function loadSuggestion(r) {
        try {
            await ensureModel(r);
            r.sugg = suggestSelection(r.model, r.ctx, r.q);
        } catch (e) { r.status = 'norange'; r.sel = false; r.scope = 'all'; toast(L(`لا نطاق حفظ لـ ${r.student.name}.`, `${r.student.name} has no memorization range.`)); }
        if (!closed && r.scope === 'suggest') { renderRow(r); renderFoot(); }
    }

    // ---------- شريط التقدم ----------
    const progress = (k, total, label) => {
        $('#bs-prog').classList.add('on');
        $('#bs-prog-i').style.width = `${total ? (k / total * 100) : 0}%`;
        $('#bs-prog-t').textContent = label;
    };
    const progressDone = () => $('#bs-prog').classList.remove('on');

    // ---------- ٢) التجهيز ----------
    $('#bs-prep').addEventListener('click', async () => {
        if (busy) return;
        if (!hwEngine) return toast(L('محرك القرآن غير متوفر.', 'Quran engine unavailable.'));
        const sel = visible().filter(r => r.sel && r.status !== 'norange');
        const list = sel.filter(r => r.state !== 'ready');   // المجهَّز لا يُعاد توليده (يتغيّر نطاقه/عدده فيعود «ينتظر» تلقائياً)
        if (!sel.length) return toast(L('حدّد طلاباً أولاً.', 'Select students first.'));
        if (!list.length) return toast(L('كل المحدَّدين مجهَّزون — اضغط «انشر».', 'Everyone selected is already prepared — press Publish.'));
        const bad = list.find(r => (r.scope === 'surah' || r.scope === 'hizb') && !r.pick.size);
        if (bad) return toast(L(`اختر ${bad.scope === 'surah' ? 'سورة' : 'حزباً'} واحداً على الأقل لـ ${bad.student.name}، أو غيّر نطاقه إلى «كل النطاق».`, `Pick at least one ${bad.scope === 'surah' ? 'surah' : 'hizb'} for ${bad.student.name}, or switch to "Whole range".`));
        busy = true; setStep(2); renderFoot();
        let k = 0, fails = 0;
        for (const r of list) {
            if (closed) return;
            progress(k, list.length, L(`جارٍ التجهيز ${k + 1} / ${list.length} — ${r.student.name}`, `Preparing ${k + 1} / ${list.length} — ${r.student.name}`));
            r.state = 'planning'; renderRow(r);
            try {
                let selection = { mode: 'all' };
                if (r.scope === 'surah') selection = { mode: 'surah', ids: [...r.pick].map(Number) };
                else if (r.scope === 'hizb') selection = { mode: 'hizb', ids: [...r.pick], unit: r.model ? r.model.unit : undefined };
                else if (r.scope === 'suggest') {
                    await ensureModel(r);
                    const ids = suggestSelection(r.model, r.ctx, r.q);
                    r.sugg = ids;
                    if (ids.length) selection = { mode: 'hizb', ids, unit: r.model.unit };
                }
                const res = await planSmartHomework(r.student, r.q, { selection, hwEngine });
                if (!res.ok) {
                    r.state = 'fail'; fails++;
                    r.err = res.reason === 'no_range' ? L('لا نطاق حفظ مسجَّل', 'No memorization range')
                        : res.reason === 'empty_selection' ? L('لا مقاطع في هذا الاختيار — اختر نطاقاً آخر', 'No segments in this selection — pick another range')
                        : L('لم يتم العثور على آيات كافية', 'Not enough ayahs found');
                } else {
                    const model = res.model;
                    const label = scopeLabelOf(r, selection, model);
                    res.scopeObj = buildScope(res.ctx, label);
                    res.selection = selection; res.label = label;
                    r.res = res; r.selection = selection; r.state = 'ready'; r.err = ''; r.sel = true;
                }
            } catch (err) {
                console.error('خطأ في تجهيز واجب', r.student.name, err);
                r.state = 'fail'; fails++; r.err = L('تعذّر بناء الواجب — حاول مرة أخرى', 'Could not build the homework — try again');
            }
            renderRow(r); k++;
            await new Promise(res => setTimeout(res, 0));   // نترك المتصفح يرسم بين طالب وآخر
        }
        progress(k, list.length, L('اكتمل التجهيز', 'Preparation complete'));
        setTimeout(progressDone, 700);
        busy = false; renderFoot();
        const ready = rows.filter(r => r.state === 'ready').length;
        toast(fails ? L(`جُهّز ${ready}، وتعذّر ${fails} — راجع الصفوف الحمراء`, `${ready} prepared, ${fails} failed — check the red rows`) : L('جُهّز الجميع — راجع الصفوف ثم انشر', 'All prepared — review the rows then publish'));
    });

    // ---------- ٣) النشر ----------
    $('#bs-pub').addEventListener('click', async () => {
        if (busy) return;
        const list = visible().filter(r => r.state === 'ready' && r.res);
        if (!list.length) return;
        busy = true; renderFoot();
        let signed = false;
        try { signed = await ensureHomeworkSignIn(); } catch (e) { console.warn(e); }
        if (!signed) { busy = false; renderFoot(); return toast(L('يلزم تسجيل الدخول بجوجل لنشر الواجبات.', 'Google sign-in is required to publish.')); }
        setStep(3);
        let k = 0, okN = 0, consecutiveFails = 0;
        for (const r of list) {
            if (closed) return;
            progress(k, list.length, L(`جارٍ النشر ${k + 1} / ${list.length} — ${r.student.name}`, `Publishing ${k + 1} / ${list.length} — ${r.student.name}`));
            r.state = 'publishing'; renderRow(r);
            try {
                const res = r.res;
                const std = r.student;
                const avatar = std.avatar || std.image || std.photo || std.profilePic || std.picture || std.icon || null;
                const tracking = {};
                res.questions.forEach(q => { if (res.tracking[q.id]) tracking[q.id] = res.tracking[q.id]; });
                const created = await publishHomeworkToServer({
                    questions: res.questions, assignedStudentName: std.name, assignedStudentId: std.id,
                    meta: { app: 'darham', createdFrom: 'bulk-send', scope: res.scopeObj || null, tracking }
                });
                await markStudentPublished(std);
                const baseUrl = window.location.origin + window.location.pathname;
                r.hwId = created.id; r.link = `${baseUrl}?hw=${created.id}`;
                try {
                    await AppState.homeworkManager.createHomework({
                        id: created.id, createdAt: created.createdAt, questions: res.questions, status: 'published',
                        assignedStudentName: std.name, assignedStudentAvatar: avatar, scope: res.scopeObj || null, tracking, cloudConfirmed: true
                    });
                } catch (err) { console.error('تعذر حفظ النسخة المحلية (لا يؤثر على الواجب المنشور):', err); }
                try { saveLastScope(std, { mode: res.selection.mode, ids: res.selection.ids || [], unit: res.model.unit, label: res.label, segIds: res.scopeSegIds }); } catch (err) { /* لا شيء */ }
                r.state = 'pub'; r.sel = false; r.err = ''; okN++; consecutiveFails = 0;
            } catch (err) {
                console.error('فشل نشر واجب', r.student.name, err);
                r.state = 'ready'; r.err = friendlyErrorText(err); consecutiveFails++;
            }
            renderRow(r); k++;
            if (consecutiveFails >= 3) {   // الشبكة أو الجلسة معطّلة غالباً: لا نواصل الطرق على الخادم
                toast(L('توقف النشر بعد 3 إخفاقات متتالية — الباقي ما زال مجهَّزاً، اضغط «انشر» للمحاولة من جديد.', 'Publishing stopped after 3 failures in a row — the rest is still prepared; press Publish to retry.'));
                break;
            }
        }
        progress(k, list.length, L('انتهى النشر', 'Publishing finished'));
        setTimeout(progressDone, 700);
        busy = false;
        // من نُشر لهم يغادرون الجدول (روابطهم في القائمة أدناه) ويحلّ مكانهم مستحقون آخرون
        rows.filter(r => r.state === 'pub' && r.listed).forEach(unlistRow);
        const added = refill();
        renderLinks();
        if (query) renderResults();
        if (okN) setStep(added ? 1 : 4);
        const failedN = visible().filter(r => r.state === 'ready' && r.err).length;
        toast(okN ? L(`نُشر ${okN} واجباً${failedN ? ` — وتعذّر ${failedN} (ما زالت مجهَّزة)` : ''}${added ? ` — وأُضيف ${added} مستحقاً جديداً للقائمة` : ''}`, `${okN} published${failedN ? ` — ${failedN} failed (still prepared)` : ''}${added ? ` — ${added} new due student(s) added to the list` : ''}`) : L('لم يُنشر شيء — راجع الاتصال وحاول مجدداً', 'Nothing was published — check the connection and try again'));
    });

    // ---------- ٤) الروابط ----------
    function renderLinks() {
        const done = rows.filter(r => r.state === 'pub');
        const box = $('#bs-links');
        if (!done.length) { box.classList.remove('on'); box.innerHTML = ''; return; }
        box.classList.add('on');
        box.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
            <b>🔗 ${esc(L('الروابط جاهزة — أرسلها للطلاب أو أولياء الأمور', 'Links ready — send them to students or parents'))}</b>
            <button type="button" class="bs-btn" id="bs-copy-all">📋 ${esc(L('نسخ الكل', 'Copy all'))}</button></div>`
            + done.map(r => `<div class="bs-lk${r.sent ? ' sent' : ''}" data-id="${esc(String(r.student.id))}"><div><b>${esc(r.student.name)}</b><div class="u">${esc(r.link)}</div></div>
                <button type="button" class="cp">📋 ${esc(L('نسخ', 'Copy'))}</button><button type="button" class="wa">💬 ${esc(L('واتساب', 'WhatsApp'))}</button><button type="button" class="tg">✈️ ${esc(L('تيليجرام', 'Telegram'))}</button></div>`).join('');
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
