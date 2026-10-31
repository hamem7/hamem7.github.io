// games/homework-play.js
import { AppState } from '../core/app.js';
// 🌟🌟 [محدَّث] كان هذا الملف يستورد رفع النتيجة/الصوت من core/firebase.js ويحسب الدرجة على هاتف الطالب ويدّعي
// النجاح قبل أي رفع. الآن: الإجابات تُحفظ على الجهاز (مسودة) ثم تُرسل للخادم الذي يصحّحها ويؤكد حفظها، ولا تظهر
// أي رسالة "وصل" إلا بعد تأكيد الخادم — راجع core/submitQueue.js. (التسجيل الصوتي غير مدعوم حالياً في الواجبات)
import { t, tf, localizeHomeworkText, wrapQuranWordTitle } from '../core/i18n.js';
import { loadWordMeaningsEn } from '../engine/wordMeaningData.js';
const hl = localizeHomeworkText; // 🌟 اختصار: ترجمة نص السؤال وقت العرض فقط (الآيات لا تُمَسّ)
// 🌟 [إصلاح تدقيق ما قبل الإطلاق] escape للخيارات وإجابة الطالب المحفوظة داخل HTML/attributes: كان علامة " في خيار أو إجابة تكسر الـ attribute وتضيّع الإجابة عند إعادة الفتح
import { esc } from '../core/escape.js';
import { friendlyErrorText } from '../core/homeworkApi.js';
import { ApiError } from '../core/api.js';
import { decoratePlay, monthlyEncouragement, renderResultExtras } from '../core/homeworkMonthly.js';   // 🌙 ثيمة الواجب الشهرية (هجرية)
import { initErrorReporter } from '../core/errorReporter.js';   // 🌟 [2026-10-13] مراقبة الأخطاء
import { saveDraft, loadDraft, getAttempt, startSubmission, attemptSend, startAutoRetry, watchAttempt, isLocalStorageWorking } from '../core/submitQueue.js';

let confettiDone = false;
let hw = null;
let student = null;
let currentIndex = 0;
let answers = {};

// متغيرات خاصة بنظام تسجيل الصوت

export function initHomeworkPlay() {
    hw = AppState.currentHomework;
    student = AppState.currentStudent;

    if (!hw || !student) {
        alert(t('hw_st_incomplete_data'));
        window.location.href = window.location.pathname;
        return;
    }

    initErrorReporter({ getHwId: () => (hw && hw.id) || null });
    decoratePlay();
    document.getElementById('hp-student-name').textContent = `${t('hw_st_hero_prefix')} ${student.name}`;
    currentIndex = 0;
    answers = {};
    skipped = {}; orderState = {}; orderTouched = {}; encShown = {}; inReview = false;
    loadPrefs();

    // 🌟 شريط تنبيه عدم وجود اتصال + تنبيه لو منع المتصفح الحفظ المحلي (وضع التصفح الخاص)
    bindConnectivityBanner();
    const storageBanner = document.getElementById('hp-storage-banner');
    if (storageBanner && !isLocalStorageWorking()) storageBanner.style.display = 'block';

    setupListeners();

    // 🌟🌟 لو كان لهذا الواجب تسليم سابق على هذا الجهاز (مؤكَّد أو عالق) نعرض حالته الحقيقية فقط، ولا نسمح بإعادة
    // الحل. (سبب: إعادة فتح الرابط بعد "وصل واجبك" كانت تسمح بحل ثانٍ وتسليم مكرر)
    const prev = getAttempt(hw.id);
    if (prev && prev.state !== 'rejected') {
        watchAttempt(hw.id, renderSubmissionStatus);
        renderSubmissionStatus(prev);
        if (prev.state === 'pending' || prev.state === 'failed') {
            attemptSend(hw.id, renderSubmissionStatus).then(() => {
                const a = getAttempt(hw.id);
                // 🌟 pending أيضاً: قد يكون إرسال آخر جارياً (استئناف عند الإقلاع) فنتابعه حتى تُحدَّث الشاشة
                if (a && (a.state === 'failed' || a.state === 'pending')) startAutoRetry(hw.id, renderSubmissionStatus);
            });
        }
        return;
    }

    // 🌟 استعادة مسودة الإجابات المحفوظة على الجهاز (بعد تحديث الصفحة/إغلاق المتصفح/انقطاع الإنترنت)
    const draft = loadDraft(hw.id);
    if (draft && draft.answers) {
        answers = draft.answers;
        currentIndex = Math.min(draft.index || 0, hw.questions.length - 1);
    }
    startDraftAutosave();
    // معاني الكلمات بالإنجليزية: ننتظر تحميل ملف الترجمة (مرة واحدة) قبل أول عرض لو الواجهة إنجليزية وفي الواجب سؤال معنى
    const hasMeaningQ = AppState.currentLang === 'en' && hw.questions.some(q => q.type === 'mcq' && String(q.title || '').includes('ما معنى'));
    if (hasMeaningQ) loadWordMeaningsEn().then(renderQuestion, renderQuestion);
    else renderQuestion();
}

// ==========================================================
// 🌟 [جديد] حفظ المسودة تلقائياً على الجهاز (الإجابات لا تعيش في الذاكرة فقط بعد اليوم)
// ==========================================================
let draftTimer = null;
function persistDraft() {
    if (!hw || !student) return;
    try { saveCurrentAnswer(); } catch (e) { /* الشاشة قد تكون أُغلقت */ }
    saveDraft(hw.id, { studentName: student.name, answers, index: currentIndex });
}
function startDraftAutosave() {
    if (draftTimer) clearInterval(draftTimer);
    draftTimer = setInterval(persistDraft, 2000);
    window.addEventListener('pagehide', persistDraft);
    const container = document.getElementById('hp-question-container');
    if (container) {
        container.addEventListener('input', persistDraft);
        container.addEventListener('change', persistDraft);
    }
}
function stopDraftAutosave() { if (draftTimer) { clearInterval(draftTimer); draftTimer = null; } }

function bindConnectivityBanner() {
    const banner = document.getElementById('hp-offline-banner');
    if (!banner) return;
    const update = () => { banner.style.display = (navigator.onLine === false) ? 'block' : 'none'; };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
}

// ==========================================================
// 🌟 [2026-10-26] واجهة «المصحف الهادئ»: حالة العرض + التنقّل + المراجعة + الأسئلة
// ==========================================================
let skipped = {};            // أسئلة تخطّاها الطالب (للعرض فقط، لا تُرسَل)
let orderState = {};         // سؤال الترتيب: الترتيب الحالي للخيارات (لا يُحسب إجابة قبل أن يحرّكه الطالب)
let orderTouched = {};
let encShown = {};
let fontScale = 1;
let focusMode = false;
let toastTimer = null;
const FONT_KEY = 'darham_hp_font';

const $ = (id) => document.getElementById(id);
const LETTERS_AR = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز'];
const LETTERS_EN = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const isAr = () => AppState.currentLang !== 'en';
const letterOf = (i) => (isAr() ? LETTERS_AR : LETTERS_EN)[i] || String(i + 1);

function isAnswered(q) {
    const a = answers[q.id];
    if (a === undefined || a === null) return false;
    if (Array.isArray(a)) return a.some(x => x);
    if (typeof a === 'object') return Object.keys(a).length > 0;
    return String(a).trim() !== '';
}
const answeredCount = () => hw.questions.filter(isAnswered).length;

function toast(msg) {
    const el = $('hp-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function confetti() {
    try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) { /* لا شيء */ }
    const box = document.createElement('div');
    box.className = 'hp-confetti';
    const colors = ['#d4af37', '#25a07a', '#f1dd8f', '#2f80ed', '#e0463c', '#8b5cf6'];
    for (let i = 0; i < 70; i++) {
        const p = document.createElement('i');
        p.style.cssText = `left:${Math.random() * 100}%;background:${colors[i % colors.length]};animation-delay:${Math.random() * .6}s;animation-duration:${2 + Math.random() * 1.6}s;transform:rotate(${Math.random() * 360}deg)`;
        box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 4200);
}

function applyFont() {
    const s = document.querySelector('.hp-screen');
    if (s) s.style.setProperty('--hp-fs', String(fontScale));
}
function loadPrefs() {
    try { const f = parseFloat(localStorage.getItem(FONT_KEY)); if (f >= 0.85 && f <= 1.5) fontScale = f; } catch (e) { /* التخزين قد يكون ممنوعاً */ }
    applyFont();
}
function savePref() { try { localStorage.setItem(FONT_KEY, String(fontScale)); } catch (e) { /* لا شيء */ } }

function flashSaved() {
    const el = $('hp-saved');
    if (!el) return;
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
}

// تشجيع خفيف عند كل إجابة جديدة (مرة لكل عدد مُجاب)
function onAnswerChanged() {
    flashSaved();
    const n = answeredCount();
    if (n >= 1 && !encShown[n]) {
        encShown[n] = 1;
        const frac = n / hw.questions.length;
        toast(monthlyEncouragement(n, hw.questions.length) || t('hw_pl_enc_' + (frac >= 1 ? 5 : frac >= .75 ? 4 : frac >= .5 ? 3 : n === 1 ? 1 : 2)));
    }
    paintSegments();
}

function paintSegments() {
    const total = hw.questions.length, n = answeredCount();
    const pct = Math.round(n / total * 100);
    const bar = $('hp-progress-bar');
    if (bar) { bar.style.width = `${pct}%`; if (bar.parentElement) bar.parentElement.setAttribute('aria-valuenow', String(pct)); }
    const ans = $('hp-answered-text');
    if (ans) ans.textContent = tf('hw_pl_answered_of', { n, total });
}

function goTo(i) {
    saveCurrentAnswer();
    if (i < 0 || i >= hw.questions.length) return;
    if (inReview) showPlay();
    currentIndex = i;
    persistDraft();
    renderQuestion();
}
let inReview = false;
function showPlay() {
    inReview = false;
    $('hp-review').hidden = true;
    $('hp-play-view').style.display = '';
    $('hp-bar').style.display = '';
}
function showReview() {
    saveCurrentAnswer();
    persistDraft();
    inReview = true;
    $('hp-play-view').style.display = 'none';
    $('hp-bar').style.display = 'none';
    const un = hw.questions.filter(q => !isAnswered(q));
    const note = $('hp-review-note');
    note.className = 'hp-note ' + (un.length ? 'warn' : 'ok');
    note.textContent = un.length ? t('hw_pl_warn_unanswered') : t('hw_pl_all_answered');
    $('btn-hp-submit').textContent = un.length ? t('hw_pl_submit_anyway') : t('hw_pl_submit');
    const tiles = $('hp-review-tiles');
    tiles.textContent = '';
    hw.questions.forEach((q, i) => {
        const a = isAnswered(q), sk = !a && skipped[q.id];
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'hp-tile ' + (a ? 'ok' : sk ? 'sk' : 'no');
        const tn = document.createElement('span'); tn.className = 'tn'; tn.textContent = String(i + 1);
        const tt = document.createElement('span'); tt.className = 'tt'; tt.textContent = plain(hl(q.title));
        const ts = document.createElement('span'); ts.className = 'ts'; ts.textContent = a ? '✔ ' + t('hw_pl_answered') : sk ? '↷ ' + t('hw_pl_skipped') : '○ ' + t('hw_pl_unanswered');
        b.append(tn, tt, ts);
        b.addEventListener('click', () => goTo(i));
        tiles.appendChild(b);
    });
    $('hp-review').hidden = false;
    try { window.scrollTo(0, 0); } catch (e) { /* لا شيء */ }
}
// نص عادي من عنوان قد يحوي <br>: يُعرض بـ textContent فقط
function plain(s) { return String(s == null ? '' : s).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').trim(); }

function setupListeners() {
    $('btn-hp-next').addEventListener('click', () => { if (currentIndex < hw.questions.length - 1) goTo(currentIndex + 1); });
    $('btn-hp-prev').addEventListener('click', () => { if (currentIndex > 0) goTo(currentIndex - 1); });
    $('btn-hp-skip').addEventListener('click', () => {
        saveCurrentAnswer();
        const q = hw.questions[currentIndex];
        if (!isAnswered(q)) skipped[q.id] = 1;
        if (currentIndex < hw.questions.length - 1) goTo(currentIndex + 1); else showReview();
    });
    $('btn-hp-review').addEventListener('click', showReview);
    $('btn-hp-list').addEventListener('click', showReview);
    $('btn-hp-back').addEventListener('click', () => { showPlay(); renderQuestion(); });

    $('btn-hp-submit').addEventListener('click', () => {
        saveCurrentAnswer();
        submitHomework();
    });

    $('btn-hp-font-minus').addEventListener('click', () => { fontScale = Math.max(.85, +(fontScale - .1).toFixed(2)); applyFont(); savePref(); });
    $('btn-hp-font-plus').addEventListener('click', () => { fontScale = Math.min(1.5, +(fontScale + .1).toFixed(2)); applyFont(); savePref(); });
    $('btn-hp-focus').addEventListener('click', (e) => {
        focusMode = !focusMode;
        document.body.classList.toggle('hp-focus', focusMode);
        e.currentTarget.setAttribute('aria-pressed', String(focusMode));
    });

    // تنبيه عند مغادرة الصفحة قبل التسليم (لا يظهر بعد وجود محاولة تسليم)
    window.addEventListener('beforeunload', (e) => {
        if (!hw || getAttempt(hw.id)) return;
        if (answeredCount() > 0) { e.preventDefault(); e.returnValue = ''; }
    });

    $('btn-hp-finish').addEventListener('click', () => {
        window.close();
        document.body.textContent = '';
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex; justify-content:center; align-items:center; height:100vh; background:var(--dh-surface-alt,#f3eedd); text-align:center; padding:20px;';
        const inner = document.createElement('div');
        const e1 = document.createElement('div'); e1.style.cssText = 'font-size:5rem; margin-bottom:20px;'; e1.textContent = '👋';
        const h = document.createElement('h1'); h.style.cssText = 'color:#0d5c46; font-size:2.2rem; margin-bottom:10px;'; h.textContent = t('تم إرسال التقييم!');
        const p = document.createElement('p'); p.style.cssText = 'color:#4a6058; font-size:1.4rem;'; p.textContent = t('يمكنك إغلاق هذه الصفحة (النافذة) الآن بأمان يا بطل.');
        inner.append(e1, h, p); wrap.append(inner); document.body.append(wrap);
    });
}

function typeName(type) {
    const k = { mcq: 'mcq', checkbox: 'multi', dropdown: 'dropdown', written_blank: 'blank', write_3_ayahs: 'write', around_ayah: 'write', tajweed_extract: 'write', dual_dropdown: 'dual', matrix_order: 'order', matching: 'match' }[type];
    return k ? t('hw_pl_type_' + k) : '';
}

function renderQuestion() {
    const q = hw.questions[currentIndex];
    const container = $('hp-question-container');
    const total = hw.questions.length;

    $('hp-progress-text').textContent = tf('hw_pl_q_of', { n: currentIndex + 1, total });
    paintSegments();

    $('btn-hp-prev').style.visibility = currentIndex > 0 ? 'visible' : 'hidden';
    const last = currentIndex === total - 1;
    $('btn-hp-next').style.display = last ? 'none' : '';
    $('btn-hp-review').style.display = last ? '' : 'none';

    // السؤال الجديد يبدأ من أعلى الصفحة
    try { window.scrollTo(0, 0); } catch (e) {}

    const savedAns = answers[q.id] === undefined ? '' : answers[q.id];
    const qc = $('hp-qcard');
    if (qc) { qc.style.animation = 'none'; void qc.offsetWidth; qc.style.animation = ''; }

    let html = `
        <span class="hp-qtype">${esc(typeName(q.type))}</span>
        <h3 class="hp-qtitle">${(q.type === 'mcq' && String(q.title || '').includes('ما معنى')) ? wrapQuranWordTitle(hl(q.title)) : hl(q.title)}</h3>
        ${(q.type === 'mcq' && String(q.title || '').includes('ما معنى')) ? `<div class="hp-parent">👨‍👩‍👧 ${t('بإمكانك سؤال أحد الوالدين في هذا السؤال')}</div>` : ''}
        ${q.text ? `<!-- class="dh-verse" (css/global.css) يثبّت اتجاه الآية RTL فلا تنقلب أقواسها ﴿ ﴾ في الإنجليزية -->
        <div class="hp-mushaf"><div class="hp-ayah dh-verse">${hl(q.text)}</div></div>` : ''}
        <div id="hp-options-container">
    `;

    if (q.type === 'mcq' || q.type === 'checkbox') {
        const multi = q.type === 'checkbox';
        const savedArr = Array.isArray(savedAns) ? savedAns : [];
        html += `<p class="hp-help">${t(multi ? 'hw_pl_pick_many' : 'hw_pl_pick_one')}</p><div class="hp-opts">`;
        q.options.forEach((opt, i) => {
            const on = multi ? savedArr.includes(opt) : savedAns === opt;
            html += `
                <label class="hp-opt${on ? ' sel' : ''}">
                    <input type="${multi ? 'checkbox' : 'radio'}" name="hp_q_${q.id}" value="${esc(opt)}" ${on ? 'checked' : ''}>
                    <span class="hp-lt">${esc(letterOf(i))}</span><span class="hp-ot dh-verse">${esc(hl(opt))}</span><span class="hp-ck" aria-hidden="true">${multi ? '☑' : '●'}</span>
                </label>`;
        });
        html += `</div>`;
    } else if (q.type === 'dropdown') {
        html += `<select class="hp-select" id="hp_q_${q.id}_select">
            <option value="" disabled ${!savedAns ? 'selected' : ''}>${t('-- اختر الكلمة الصحيحة --')}</option>`;
        q.options.forEach(opt => { html += `<option value="${esc(opt)}" ${savedAns === opt ? 'selected' : ''}>${esc(opt)}</option>`; });
        html += `</select>`;
    } else if (q.type === 'written_blank') {
        html += `<input type="text" class="hp-field" id="hp_q_${q.id}_text" value="${esc(savedAns)}" placeholder="${t('اكتب الكلمة الناقصة هنا...')}" autocomplete="off">`;
    } else if (q.type === 'write_3_ayahs') {
        html += `<textarea class="hp-field" id="hp_q_${q.id}_textarea" rows="4" placeholder="${t('اكتب الآيات الثلاث هنا بتركيز...')}">${esc(savedAns || '')}</textarea>`;
    } else if (q.type === 'around_ayah') {
        html += `<textarea class="hp-field" id="hp_q_${q.id}_textarea" rows="5" placeholder="${t('اكتب الآية التي قبلها ثم الآية التي بعدها...')}">${esc(savedAns || '')}</textarea>`;
    } else if (q.type === 'tajweed_extract') {
        html += `<textarea class="hp-field" id="hp_q_${q.id}_textarea" rows="4" placeholder="${t('اكتب الحكمين مع الكلمة التي ظهر فيها كل حكم...')}">${esc(savedAns || '')}</textarea>`;
    } else if (q.type === 'dual_dropdown') {
        const savedArr = Array.isArray(savedAns) ? savedAns : ['', ''];
        const sel = (n, label, ph, opts) => `<div><label for="hp_q_${q.id}_select${n}">${t(label)}</label>
            <select class="hp-select" id="hp_q_${q.id}_select${n}"><option value="" disabled ${!savedArr[n - 1] ? 'selected' : ''}>${t(ph)}</option>
            ${opts.map(opt => `<option value="${esc(opt)}" ${savedArr[n - 1] === opt ? 'selected' : ''}>${esc(opt)}</option>`).join('')}</select></div>`;
        html += `<div class="hp-dual">${sel(1, 'اختر الفراغ الأول [ 1 ]:', '-- اختر الكلمة الأولى --', q.options1)}${sel(2, 'اختر الفراغ الثاني [ 2 ]:', '-- اختر الكلمة الثانية --', q.options2)}</div>`;
    } else if (q.type === 'matrix_order') {
        html += `<p class="hp-help">${t('hw_pl_order_help')}</p><div id="hp-olist-${q.id}" class="hp-olist"></div>`;
    } else if (q.type === 'matching') {
        // نمط المطابقة: عمودان (بدايات / نهايات)، نقر-للربط؛ التفاعل يُبنى بعد حقن الـ HTML في renderMatchingColumns
        html += `
            <div class="hp-mgrid">
                <div id="hp-match-left-${q.id}" class="hp-mcol"><div class="hp-mtitle">${t(q.leftTitle || 'البدايات')}</div></div>
                <div id="hp-match-right-${q.id}" class="hp-mcol"><div class="hp-mtitle">${t(q.rightTitle || 'النهايات')}</div></div>
            </div>
            <p class="hp-help" style="text-align:center; margin-top:14px;">${t(q.matchHint || 'اضغط على بداية، ثم على نهايتها المطابقة لها. اضغط على أي بطاقة مربوطة لفك ربطها.')}</p>`;
    }

    html += `</div>`;
    container.innerHTML = html;

    // تفعيل أحداث الأسئلة
    container.querySelectorAll('input:not([type="file"]), select, textarea').forEach(input => {
        input.addEventListener('change', () => {
            if (q.type === 'mcq') {
                container.querySelectorAll('.hp-opt').forEach(l => l.classList.remove('sel'));
                input.closest('.hp-opt').classList.add('sel');
            } else if (q.type === 'checkbox') {
                input.closest('.hp-opt').classList.toggle('sel', input.checked);
            }
            delete skipped[q.id];
            saveCurrentAnswer();
            onAnswerChanged();
        });
        if (input.matches('input[type="text"], textarea')) input.addEventListener('input', () => { delete skipped[q.id]; saveCurrentAnswer(); onAnswerChanged(); });
    });

    if (q.type === 'matrix_order') renderOrderList(q);
    if (q.type === 'matching') {
        const initialPairs = (answers[q.id] && typeof answers[q.id] === 'object') ? answers[q.id] : {};
        renderMatchingColumns(q, initialPairs);
    }
}

// 🌟 سؤال الترتيب: قائمة بطاقات تُرتَّب بالسحب أو بالأسهم (بدل جدول أزرار الراديو). صيغة الإجابة المحفوظة كما كانت:
// مصفوفة الخيارات بترتيب الطالب. لا تُحتسب إجابة إلا بعد أن يحرّك الطالب بطاقة (فالترتيب الأوّلي مبعثر عمداً).
function renderOrderList(q) {
    const list = $(`hp-olist-${q.id}`);
    if (!list) return;
    if (!orderState[q.id]) {
        const saved = Array.isArray(answers[q.id]) ? answers[q.id].filter(x => q.options.includes(x)) : [];
        orderState[q.id] = saved.length ? [...saved, ...q.options.filter(o => !saved.includes(o))] : [...q.options];
        orderTouched[q.id] = saved.length > 0;
    }
    const order = orderState[q.id];
    const move = (from, to) => {
        if (to < 0 || to >= order.length || from === to) return;
        order.splice(to, 0, order.splice(from, 1)[0]);
        orderTouched[q.id] = true;
        delete skipped[q.id];
        saveCurrentAnswer();
        renderOrderList(q);
        onAnswerChanged();
    };
    list.textContent = '';
    order.forEach((opt, pos) => {
        const row = document.createElement('div');
        row.className = 'hp-orow' + (orderTouched[q.id] ? ' touched' : '');
        row.draggable = true;
        const num = document.createElement('span'); num.className = 'hp-num'; num.textContent = String(pos + 1);
        const txt = document.createElement('span'); txt.className = 'hp-ot dh-verse'; txt.textContent = hl(opt);
        const arrows = document.createElement('span'); arrows.className = 'hp-arrows';
        const mk = (sym, label, disabled, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'hp-ib sm'; b.textContent = sym; b.setAttribute('aria-label', label); b.disabled = disabled; b.addEventListener('click', fn); return b; };
        arrows.append(mk('▲', 'up', pos === 0, () => move(pos, pos - 1)), mk('▼', 'down', pos === order.length - 1, () => move(pos, pos + 1)));
        row.append(num, txt, arrows);
        row.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', String(pos)); row.classList.add('drag'); });
        row.addEventListener('dragend', () => row.classList.remove('drag'));
        row.addEventListener('dragover', (e) => e.preventDefault());
        row.addEventListener('drop', (e) => { e.preventDefault(); move(parseInt(e.dataTransfer.getData('text/plain'), 10), pos); });
        list.appendChild(row);
    });
}

// 🌟🌟 بناء وتفعيل عمودي المطابقة (بدايات/نهايات) عبر الـ DOM مباشرة لأن كل بطاقة تحتاج مستمع نقر يعرف حالتها
function renderMatchingColumns(q, initialPairs) {
    const leftContainer = $(`hp-match-left-${q.id}`);
    const rightContainer = $(`hp-match-right-${q.id}`);
    if (!leftContainer || !rightContainer) return;

    let pairs = { ...initialPairs };
    let selectedLeftId = null;
    const pairColors = ['#2f80ed', '#e8a317', '#8b5cf6', '#14b8a6', '#ec4899', '#0ea5e9'];
    const idxOfLeft = (leftId) => Math.max(0, q.leftItems.findIndex(it => it.id === leftId));
    const colorForLeft = (leftId) => pairColors[idxOfLeft(leftId) % pairColors.length];

    function persistAnswer() {
        // نحفظ نسخة جديدة في answers[q.id] مباشرة (تفاعل المطابقة لحظي بطبيعته)
        answers[q.id] = { ...pairs };
        if (Object.keys(pairs).length) delete skipped[q.id];
    }
    function makeCard(text, pairedLeftId, selected, onClick) {
        const card = document.createElement('div');
        card.className = 'hp-match-card' + (selected ? ' active' : '');
        card.setAttribute('role', 'button'); card.tabIndex = 0;
        if (pairedLeftId) card.style.borderColor = colorForLeft(pairedLeftId);
        const span = document.createElement('span'); span.textContent = text; card.appendChild(span);
        if (pairedLeftId) { const em = document.createElement('em'); em.style.background = colorForLeft(pairedLeftId); em.textContent = String(idxOfLeft(pairedLeftId) + 1); card.appendChild(em); }
        card.addEventListener('click', onClick);
        card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } });
        return card;
    }
    function renderCards() {
        leftContainer.querySelectorAll('.hp-match-card').forEach(el => el.remove());
        rightContainer.querySelectorAll('.hp-match-card').forEach(el => el.remove());

        q.leftItems.forEach(item => {
            const isPaired = !!pairs[item.id];
            leftContainer.appendChild(makeCard(item.text, isPaired ? item.id : null, selectedLeftId === item.id, () => {
                if (isPaired) { delete pairs[item.id]; selectedLeftId = null; }   // فك الربط عند الضغط على بطاقة مربوطة
                else selectedLeftId = (selectedLeftId === item.id) ? null : item.id;
                persistAnswer(); renderCards(); onAnswerChanged();
            }));
        });
        q.rightItems.forEach(item => {
            const pairedLeftId = Object.keys(pairs).find(l => pairs[l] === item.id);
            rightContainer.appendChild(makeCard(item.text, pairedLeftId || null, false, () => {
                if (pairedLeftId) { delete pairs[pairedLeftId]; persistAnswer(); renderCards(); onAnswerChanged(); return; }
                if (!selectedLeftId) return;   // لازم يختار بداية أولاً قبل الربط
                Object.keys(pairs).forEach(l => { if (pairs[l] === item.id) delete pairs[l]; });
                pairs[selectedLeftId] = item.id;
                selectedLeftId = null;
                persistAnswer(); renderCards(); onAnswerChanged();
            }));
        });
    }

    persistAnswer(); // حفظ الحالة الابتدائية (فارغة أو محفوظة سابقاً) فور الدخول للسؤال
    renderCards();
}

function saveCurrentAnswer() {
    const q = hw.questions[currentIndex];
    if (q.type === 'mcq') {
        const checked = document.querySelector(`input[name="hp_q_${q.id}"]:checked`);
        if (checked) answers[q.id] = checked.value;
    } else if (q.type === 'checkbox') {
        const checked = Array.from(document.querySelectorAll(`input[name="hp_q_${q.id}"]:checked`)).map(cb => cb.value);
        answers[q.id] = checked;
    } else if (q.type === 'dropdown') {
        const sel = document.getElementById(`hp_q_${q.id}_select`);
        if (sel && sel.value) answers[q.id] = sel.value;
    } else if (q.type === 'written_blank') {
        const textIn = document.getElementById(`hp_q_${q.id}_text`);
        if (textIn) { if (textIn.value.trim()) answers[q.id] = textIn.value.trim(); else delete answers[q.id]; }
    } else if (q.type === 'write_3_ayahs' || q.type === 'tajweed_extract' || q.type === 'around_ayah') {
        const textareaIn = document.getElementById(`hp_q_${q.id}_textarea`);
        if (textareaIn) { if (textareaIn.value.trim()) answers[q.id] = textareaIn.value.trim(); else delete answers[q.id]; }
    } else if (q.type === 'dual_dropdown') {
        const sel1 = document.getElementById(`hp_q_${q.id}_select1`);
        const sel2 = document.getElementById(`hp_q_${q.id}_select2`);
        const val1 = (sel1 && sel1.value) ? sel1.value : "";
        const val2 = (sel2 && sel2.value) ? sel2.value : "";
        if (val1 || val2) answers[q.id] = [val1, val2];
    } else if (q.type === 'matrix_order') {
        // الترتيب يُحسب إجابة فقط بعد أن يحرّك الطالب بطاقة (الترتيب الأوّلي مبعثر عمداً)
        if (orderTouched[q.id] && orderState[q.id]) answers[q.id] = [...orderState[q.id]];
    }
    // ملاحظة: matching يُحفظ أيضاً تلقائياً فور كل ضغطة ربط/فك ربط (renderMatchingColumns)، لنفس سبب الصوت
}

// ==========================================================
// 📨 التسليم — صادق بالكامل (بديل submitHomework القديمة التي كانت تدّعي النجاح قبل أي رفع)
// ==========================================================
async function submitHomework() {
    const submitBtn = document.getElementById('btn-hp-submit');
    submitBtn.disabled = true;
    stopDraftAutosave();

    const cleanAnswers = {};
    hw.questions.forEach(q => {
        let a = answers[q.id];
        if (a !== undefined) cleanAnswers[q.id] = a;
    });

    saveDraft(hw.id, { studentName: student.name, answers, index: currentIndex });
    // تجميد الإجابات في سجل محاولة يُحفظ محلياً "قبل" أي نداء للشبكة
    const attempt = startSubmission(hw.id, student.name, cleanAnswers);
    renderSubmissionStatus(attempt);
    await attemptSend(hw.id, renderSubmissionStatus);
    const after = getAttempt(hw.id);
    if (after && after.state === 'failed') startAutoRetry(hw.id, renderSubmissionStatus);
}

// 🌟 [جديد 2026-10-02] إعادة إرسال نفس الإجابات المحفوظة باسم جديد بعد رفض "الاسم مكرَّر".
// startSubmission تُنشئ محاولة جديدة (بمعرّف جديد) لأن المحاولة السابقة بحالة rejected؛ الإجابات تُؤخذ من المحاولة المرفوضة نفسها.
async function resubmitWithNewName(prev) {
    const inp = document.getElementById('hp-dup-name');
    const errEl = document.getElementById('hp-dup-err');
    const sendBtn = document.getElementById('btn-hp-dup-send');
    const name = ((inp && inp.value) || '').replace(/[<>"'`]/g, '').replace(/\s+/g, ' ').trim();
    const showErr = (txt) => { if (errEl) { errEl.textContent = txt; errEl.style.display = 'block'; } if (inp) inp.focus(); };
    if (name.length < 2) { showErr(t('hw_st_name_required')); return; }
    if (name.toLowerCase() === String(prev.studentName || '').replace(/\s+/g, ' ').trim().toLowerCase()) { showErr(t('hw_st_dup_same')); return; }
    if (sendBtn) sendBtn.disabled = true;
    try {
        student = { ...(student || {}), name };
        AppState.currentStudent = student;
        const attempt = startSubmission(hw.id, name, prev.answers || {});
        renderSubmissionStatus(attempt);
        watchAttempt(hw.id, renderSubmissionStatus);
        await attemptSend(hw.id, renderSubmissionStatus);
        const after = getAttempt(hw.id);
        if (after && after.state === 'failed') startAutoRetry(hw.id, renderSubmissionStatus);
    } finally {
        if (sendBtn) sendBtn.disabled = false;
    }
}

// 🌟 [جديد 2026-10-15] مراجعة فورية بعد التسليم: حالة كل سؤال مُصحَّح آلياً والإجابة الصحيحة للخاطئ، بلا أي درجة أو نسبة أو عدّاد
// (الدرجة تظهر بعد أن يُنهي المعلم التصحيح اليدوي). الأسئلة اليدوية تُعرض «بانتظار المعلم» دون أي حكم.
function renderFeedback(items) {
    const box = document.getElementById('hp-feedback');
    if (!box) return;
    box.style.display = 'none';
    box.textContent = '';
    if (!Array.isArray(items) || !items.length || !hw || !Array.isArray(hw.questions)) return;
    const meta = {
        correct: { icon: '✅', key: 'hw_fb_correct', color: 'var(--dh-ok, #15803d)', bg: 'var(--dh-ok-bg, #e7f4ee)' },
        partial: { icon: '🟡', key: 'hw_fb_partial', color: '#92400e', bg: '#fffbeb' },
        wrong:   { icon: '❌', key: 'hw_fb_wrong',   color: 'var(--dh-danger, #b91c1c)', bg: 'var(--dh-danger-bg, #fde8e8)' },
        manual:  { icon: '⏳', key: 'hw_fb_manual',  color: '#475569', bg: '#f1f5f9' }
    };
    const answerEl = (c) => {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'margin-top:6px; font-family:"Amiri Quran","Amiri",serif; font-size:1.15rem; line-height:1.9; color:#334155;';
        if (Array.isArray(c)) {
            const ol = document.createElement('ol');
            ol.style.cssText = 'margin:0; padding-inline-start:22px;';
            c.forEach(x => { const li = document.createElement('li'); li.textContent = String(x); ol.appendChild(li); });
            wrap.appendChild(ol);
        } else {
            wrap.textContent = String(c);
        }
        return wrap;
    };
    const head = document.createElement('div');
    head.style.cssText = 'font-weight:bold; color:#0f766e; font-size:1.2rem; margin-bottom:6px;';
    head.textContent = t('hw_fb_title');
    box.appendChild(head);
    const note = document.createElement('div');
    note.style.cssText = 'color:#64748b; font-size:1rem; margin-bottom:10px; line-height:1.6;';
    note.textContent = t('hw_fb_nograde');
    box.appendChild(note);
    items.forEach(f => {
        const idx = hw.questions.findIndex(q => q.id === f.qid);
        const m = meta[f.state];
        if (idx < 0 || !m) return;
        const row = document.createElement('div');
        row.style.cssText = `background:${m.bg}; border-radius:12px; padding:8px 12px; margin-bottom:6px;`;
        const line = document.createElement('div');
        line.style.cssText = `font-weight:bold; color:${m.color};`;
        line.textContent = `${m.icon} ${t('hw_fb_q')} ${idx + 1} — ${t(m.key)}`;
        row.appendChild(line);
        if ((f.state === 'wrong' || f.state === 'partial') && f.correct !== undefined && f.correct !== null && f.correct !== '') {
            const lab = document.createElement('div');
            lab.style.cssText = 'margin-top:4px; color:#64748b; font-size:0.95rem;';
            lab.textContent = t('hw_fb_right_answer');
            row.appendChild(lab);
            row.appendChild(answerEl(f.correct));
        }
        box.appendChild(row);
    });
    box.style.display = 'block';
}

// شاشة الحالة الحقيقية للتسليم — الوحيدة التي يمكنها القول إن الواجب "وصل" (فقط عند state=confirmed)
function renderSubmissionStatus(a) {
    const modal = document.getElementById('hp-result-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    const icon = document.getElementById('hp-result-icon');
    const badge = document.getElementById('hp-result-badge');
    const retry = document.getElementById('btn-hp-retry');
    const finish = document.getElementById('btn-hp-finish');
    retry.style.display = 'none';
    finish.style.display = 'none';
    const dupBox = document.getElementById('hp-dup-box');
    if (dupBox) dupBox.style.display = 'none';
    renderFeedback(a.state === 'confirmed' && a.receipt ? a.receipt.feedback : null);

    const badgeStyles = {
        ok: 'background:var(--dh-ok-bg, #e7f4ee); color:var(--dh-ok, #15803d);', info: 'background:#e0f2fe; color:#0369a1;',
        warn: 'background:#fef3c7; color:#92400e;', bad: 'background:var(--dh-danger-bg, #fde8e8); color:var(--dh-danger, #b91c1c);'
    };
    const setBadge = (kind, key) => {
        badge.style.cssText = 'display:inline-block; padding:5px 16px; border-radius:20px; font-size:1.05rem; font-weight:bold; ' + badgeStyles[kind];
        badge.textContent = t(key);
    };
    const meta = [];

    if (a.state === 'confirmed') {
        icon.textContent = '✅';
        set('hp-result-title', t('hw_st_confirmed_title'));
        set('hp-result-score', t('hw_st_confirmed_text'));
        set('hp-result-note', t('hw_st_confirmed_note'));
        setBadge('ok', 'hw_st_badge_confirmed');
        if (!confettiDone) { confettiDone = true; confetti(); }   // احتفال مرة واحدة عند التأكيد الحقيقي من الخادم
        if (a.receipt && a.receipt.submissionId) meta.push(t('hw_st_receipt') + ' ' + String(a.receipt.submissionId).slice(-8));
        if (a.confirmedAt) meta.push(t('hw_st_confirmed_at') + ' ' + new Date(a.confirmedAt).toLocaleString(AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US'));
        finish.style.display = 'block';
    } else if (a.state === 'pending') {
        icon.textContent = '⏳';
        set('hp-result-title', t('hw_st_pending_title'));
        set('hp-result-score', t('hw_st_pending_text'));
        set('hp-result-note', '');
        setBadge('info', 'hw_st_badge_pending');
    } else if (a.state === 'failed') {
        icon.textContent = '⚠️';
        set('hp-result-title', t('hw_st_failed_title'));
        set('hp-result-score', t('hw_st_failed_text'));
        set('hp-result-note', t('hw_st_failed_note'));
        setBadge('warn', 'hw_st_badge_failed');
        retry.style.display = 'block';
        retry.onclick = () => attemptSend(hw.id, renderSubmissionStatus);
        if (a.lastError) meta.push(t('hw_st_reason') + ' ' + friendlyErrorText(new ApiError('x', a.lastError.code, a.lastError.message)));
    } else if (a.state === 'rejected' && a.rejectReason === 'ALREADY_SUBMITTED' && !(hw && hw.assignedStudentName)) {
        // 🌟 [جديد 2026-10-02] الاسم مكرَّر في واجب عام (طالب آخر بنفس الاسم): لا نُلغي الإجابات، بل نطلب اسماً مختلفاً ونعيد الإرسال
        // ملاحظة: الخادم لا يميّز بين "طالب آخر بنفس الاسم" و"نفس الطالب يعيد التسليم"؛ في الحالتين الحل هو اسم أوضح، والمعلم يراجع التسليمات.
        icon.textContent = '✏️';
        set('hp-result-title', t('hw_st_dup_title'));
        set('hp-result-score', t('hw_st_dup_text'));
        set('hp-result-note', '');
        setBadge('warn', 'hw_st_badge_failed');
        if (dupBox) {
            dupBox.style.display = 'block';
            const inp = document.getElementById('hp-dup-name');
            const errEl = document.getElementById('hp-dup-err');
            const sendBtn = document.getElementById('btn-hp-dup-send');
            if (errEl) errEl.style.display = 'none';
            if (inp && !inp.dataset.bound) {
                inp.dataset.bound = '1';
                inp.value = a.studentName || '';
                inp.focus();
            }
            if (sendBtn) sendBtn.onclick = () => resubmitWithNewName(a);
        }
    } else {
        icon.textContent = '❌';
        set('hp-result-title', t('hw_st_rejected_title'));
        set('hp-result-score', a.lastError ? friendlyErrorText(new ApiError('x', a.lastError.code, a.lastError.message)) : '');
        set('hp-result-note', '');
        setBadge('bad', 'hw_st_badge_rejected');
        finish.style.display = 'block';
    }
    if (a.attempts) meta.push(t('hw_st_attempts') + ' ' + a.attempts);
    set('hp-result-meta', meta.join(' • '));
    renderResultExtras(a.state === 'confirmed');   // 🌙 مكافأة الشهر (وسام/عبارة/شعار) عند التأكيد الحقيقي فقط
}
