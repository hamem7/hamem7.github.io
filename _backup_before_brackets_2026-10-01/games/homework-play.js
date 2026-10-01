// games/homework-play.js
import { AppState } from '../core/app.js';
// 🌟🌟 [محدَّث] كان هذا الملف يستورد رفع النتيجة/الصوت من core/firebase.js ويحسب الدرجة على هاتف الطالب ويدّعي
// النجاح قبل أي رفع. الآن: الإجابات تُحفظ على الجهاز (مسودة) ثم تُرسل للخادم الذي يصحّحها ويؤكد حفظها، ولا تظهر
// أي رسالة "وصل" إلا بعد تأكيد الخادم — راجع core/submitQueue.js. (التسجيل الصوتي غير مدعوم حالياً في الواجبات)
import { t, localizeHomeworkText } from '../core/i18n.js';
const hl = localizeHomeworkText; // 🌟 اختصار: ترجمة نص السؤال وقت العرض فقط (الآيات لا تُمَسّ)
// 🌟 [إصلاح تدقيق ما قبل الإطلاق] escape للخيارات وإجابة الطالب المحفوظة داخل HTML/attributes: كان علامة " في خيار أو إجابة تكسر الـ attribute وتضيّع الإجابة عند إعادة الفتح
import { esc } from '../core/escape.js';
import { friendlyErrorText } from '../core/homeworkApi.js';
import { ApiError } from '../core/api.js';
import { saveDraft, loadDraft, getAttempt, startSubmission, attemptSend, startAutoRetry, watchAttempt, isLocalStorageWorking } from '../core/submitQueue.js';

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

    document.getElementById('hp-student-name').innerText = `${t('hw_st_hero_prefix')} ${student.name}`;
    currentIndex = 0;
    answers = {};

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
    renderQuestion();
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

function setupListeners() {
    document.getElementById('btn-hp-next').addEventListener('click', () => {
        saveCurrentAnswer();
        if (currentIndex < hw.questions.length - 1) {
            currentIndex++;
            renderQuestion();
        }
    });

    document.getElementById('btn-hp-prev').addEventListener('click', () => {
        saveCurrentAnswer();
        if (currentIndex > 0) {
            currentIndex--;
            renderQuestion();
        }
    });

    document.getElementById('btn-hp-submit').addEventListener('click', () => {
        saveCurrentAnswer();
        submitHomework();
    });

    document.getElementById('btn-hp-finish').addEventListener('click', () => {
        window.close();
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #f8fafc; text-align: center; padding: 20px;">
                <div>
                    <div style="font-size: 5rem; margin-bottom: 20px;">👋</div>
                    <h1 style="color: #10b981; font-size: 2.5rem; margin-bottom: 10px;">${t('تم إرسال التقييم!')}</h1>
                    <p style="color: #475569; font-size: 1.5rem;">${t('يمكنك إغلاق هذه الصفحة (النافذة) الآن بأمان يا بطل.')}</p>
                </div>
            </div>
        `;
    });
}

function renderQuestion() {
    const q = hw.questions[currentIndex];
    const container = document.getElementById('hp-question-container');
    const total = hw.questions.length;

    document.getElementById('hp-progress-text').innerText = `${currentIndex + 1} / ${total}`;
    document.getElementById('hp-progress-bar').style.width = `${((currentIndex + 1) / total) * 100}%`;

    document.getElementById('btn-hp-prev').style.visibility = currentIndex > 0 ? 'visible' : 'hidden';
    if (currentIndex === total - 1) {
        document.getElementById('btn-hp-next').style.display = 'none';
        document.getElementById('btn-hp-submit').style.display = 'inline-block';
    } else {
        document.getElementById('btn-hp-next').style.display = 'inline-block';
        document.getElementById('btn-hp-submit').style.display = 'none';
    }

    let html = `
        <h3 style="color: #1e293b; font-size: 1.5rem; margin-bottom: 15px;">${hl(q.title)}</h3>
        <!-- 🌟 الخط كان 'Amiri' العادي — تم تغييره لـ 'Amiri Quran' لأن هذا الصندوق يعرض نص
             الآية الفعلي (نفس خط class="quran-text" المستخدم بباقي المنصة) حتى يظهر برسم عثماني
             دقيق يشمل كل علامات الضبط الخاصة بالقرآن 🌟 -->
        <div style="background: #f8fafc; padding: 20px; border-radius: 10px; border: 2px solid #e2e8f0; font-size: 1.8rem; color: #047857; margin-bottom: 25px; line-height: 1.6; font-family: 'Amiri Quran', serif;">
            ${hl(q.text)}
        </div>
        <div id="hp-options-container" style="display: flex; flex-direction: column; gap: 10px;">
    `;

    const savedAns = answers[q.id] || "";

    if (q.type === 'mcq') {
        // 🌟 خيارات هذه الأسئلة غالباً آيات/كلمات قرآنية كاملة بالتشكيل (مثلاً "ما هي الآية
        // التالية؟") وكانت بلا أي خط مخصص أصلاً (ترث الخط العام IBM Plex Sans Arabic الذي لا
        // يدعم رموز الرسم العثماني إطلاقاً) — أضفنا font-family: 'Amiri Quran' هنا 🌟
        q.options.forEach(opt => {
            const isChecked = savedAns === opt ? 'checked' : '';
            html += `
                <label style="display: flex; align-items: center; padding: 15px; background: white; border: 2px solid ${isChecked ? '#10b981' : '#cbd5e1'}; border-radius: 10px; cursor: pointer; transition: 0.3s; font-size: 1.3rem; color: #334155; font-weight: ${isChecked ? 'bold' : 'normal'}; font-family: 'Amiri Quran', serif;">
                    <input type="radio" name="hp_q_${q.id}" value="${esc(opt)}" ${isChecked} style="margin-left: 15px; transform: scale(1.5);">
                    ${esc(hl(opt))}
                </label>
            `;
        });
    } else if (q.type === 'checkbox') {
        const savedArr = Array.isArray(savedAns) ? savedAns : [];
        q.options.forEach(opt => {
            const isChecked = savedArr.includes(opt) ? 'checked' : '';
            html += `
                <label style="display: flex; align-items: center; padding: 15px; background: white; border: 2px solid ${isChecked ? '#10b981' : '#cbd5e1'}; border-radius: 10px; cursor: pointer; transition: 0.3s; font-size: 1.3rem; color: #334155; font-weight: ${isChecked ? 'bold' : 'normal'}; font-family: 'Amiri Quran', serif;">
                    <input type="checkbox" name="hp_q_${q.id}" value="${esc(opt)}" ${isChecked} style="margin-left: 15px; transform: scale(1.5);">
                    ${esc(hl(opt))}
                </label>
            `;
        });
    } else if (q.type === 'dropdown') {
        // 🌟 خيارات القائمة المنسدلة هنا كلمات قرآنية (إكمال الفراغ) — الخط تغيّر لـ 'Amiri Quran'
        // بدل 'Tajawal' حتى تظهر الكلمة بنفس رسمها العثماني الصحيح 🌟
        html += `<select id="hp_q_${q.id}_select" style="padding: 15px; font-size: 1.4rem; border: 2px solid #cbd5e1; border-radius: 10px; font-family: 'Amiri Quran', serif; outline: none;">
            <option value="" disabled ${!savedAns ? 'selected' : ''}>${t('-- اختر الكلمة الصحيحة --')}</option>
        `;
        q.options.forEach(opt => {
            const isSelected = savedAns === opt ? 'selected' : '';
            html += `<option value="${esc(opt)}" ${isSelected}>${esc(opt)}</option>`;
        });
        html += `</select>`;
    } else if (q.type === 'written_blank') {
        // 🌟 حقول كتابة الطالب هنا أيضاً تغيّرت لـ 'Amiri Quran' (بدل 'Amiri' العادي) حتى يرى
        // الطالب أثناء الكتابة نفس رسم الحروف والتشكيل المستخدم في بقية المنصة 🌟
        html += `<input type="text" id="hp_q_${q.id}_text" value="${esc(savedAns)}" placeholder="${t('اكتب الكلمة الناقصة هنا...')}" style="width: 100%; padding: 15px; font-size: 1.5rem; border: 2px solid #cbd5e1; border-radius: 10px; font-family: 'Amiri Quran', serif; outline: none;">`;
    } else if (q.type === 'write_3_ayahs') {
        html += `<textarea id="hp_q_${q.id}_textarea" rows="4" placeholder="${t('اكتب الآيات الثلاث هنا بتركيز...')}" style="width: 100%; padding: 15px; font-size: 1.5rem; border: 2px solid #cbd5e1; border-radius: 10px; font-family: 'Amiri Quran', serif; outline: none; resize: vertical;">${esc(savedAns)}</textarea>`;
    } else if (q.type === 'dual_dropdown') {
        const savedArr = Array.isArray(savedAns) ? savedAns : ["", ""];
        html += `<div style="display: flex; gap: 15px; flex-wrap: wrap;">`;
        html += `<div style="flex: 1; min-width: 200px;">
            <label style="display: block; margin-bottom: 5px; color: #475569; font-weight: bold;">${t('اختر الفراغ الأول [ 1 ]:')}</label>
            <select id="hp_q_${q.id}_select1" style="width: 100%; padding: 15px; font-size: 1.4rem; border: 2px solid #cbd5e1; border-radius: 10px; font-family: 'Amiri Quran', serif; outline: none;">
            <option value="" disabled ${!savedArr[0] ? 'selected' : ''}>${t('-- اختر الكلمة الأولى --')}</option>`;
        q.options1.forEach(opt => {
            const isSelected = savedArr[0] === opt ? 'selected' : '';
            html += `<option value="${esc(opt)}" ${isSelected}>${esc(opt)}</option>`;
        });
        html += `</select></div>`;
        html += `<div style="flex: 1; min-width: 200px;">
            <label style="display: block; margin-bottom: 5px; color: #475569; font-weight: bold;">${t('اختر الفراغ الثاني [ 2 ]:')}</label>
            <select id="hp_q_${q.id}_select2" style="width: 100%; padding: 15px; font-size: 1.4rem; border: 2px solid #cbd5e1; border-radius: 10px; font-family: 'Amiri Quran', serif; outline: none;">
            <option value="" disabled ${!savedArr[1] ? 'selected' : ''}>${t('-- اختر الكلمة الثانية --')}</option>`;
        q.options2.forEach(opt => {
            const isSelected = savedArr[1] === opt ? 'selected' : '';
            html += `<option value="${esc(opt)}" ${isSelected}>${esc(opt)}</option>`;
        });
        html += `</select></div>`;
        html += `</div>`;
    } else if (q.type === 'matrix_order') {
        const savedArr = Array.isArray(savedAns) ? savedAns : [];
        const colsCount = q.options.length;
        html += `<div style="overflow-x: auto; background: white; border-radius: 10px; border: 1px solid #cbd5e1; direction: rtl;">
            <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 1.2rem;">
                <tr style="background: #f1f5f9; color: #334155;">
                    <th style="padding: 15px; text-align: right;">${t('الآية المبعثرة')}</th>`;
        for (let c = 1; c <= colsCount; c++) { html += `<th style="padding: 15px;">${c}</th>`; }
        html += `</tr>`;
        q.options.forEach((opt, rIdx) => {
            html += `<tr><td style="text-align: right; padding: 15px; border-bottom: 1px solid #e2e8f0; font-family: 'Amiri Quran', serif; font-size: 1.5rem; color: #047857; line-height: 1.6; min-width: 250px;">${esc(opt)}</td>`;
            let selectedCol = savedArr.indexOf(opt) + 1;
            for (let c = 1; c <= colsCount; c++) {
                const isChecked = (selectedCol === c) ? 'checked' : '';
                html += `<td style="border-bottom: 1px solid #e2e8f0; padding: 10px;">
                    <input type="radio" name="hp_q_${q.id}_r${rIdx}" value="${c}" ${isChecked} style="transform: scale(1.6); cursor: pointer;">
                </td>`;
            }
            html += `</tr>`;
        });
        html += `</table></div>`;
    } else if (q.type === 'matching') {
        // 🌟🌟 [جديد] نمط المطابقة: عمودان (بدايات / نهايات)، نقر-للربط بدل سحب-وإفلات (أبسط
        // وأكثر ثباتاً على شاشات اللمس بجافاسكريبت خام). العرض التفاعلي الفعلي يُبنى لاحقاً في
        // renderMatchingColumns بعد حقن الـ HTML، لأنه يحتاج مستمعي أحداث بمراجع مغلقة (closures)
        // لكل بطاقة، وهذا أصعب بكثير عبر نص HTML خام كباقي الأنواع.
        html += `
            <div style="display: flex; gap: 20px; flex-wrap: wrap; justify-content: center;">
                <div id="hp-match-left-${q.id}" style="flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: 10px;">
                    <div style="font-weight: bold; color: #475569; text-align: center; margin-bottom: 5px;">${t('البدايات')}</div>
                </div>
                <div id="hp-match-right-${q.id}" style="flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: 10px;">
                    <div style="font-weight: bold; color: #475569; text-align: center; margin-bottom: 5px;">${t('النهايات')}</div>
                </div>
            </div>
            <div style="margin-top: 15px; text-align: center; color: #64748b; font-size: 1rem;">${t('اضغط على بداية، ثم على نهايتها المطابقة لها. اضغط على أي بطاقة مربوطة لفك ربطها.')}</div>
        `;
    }

    html += `</div>`;
    container.innerHTML = html;

    // تفعيل أحداث الأسئلة
    const inputs = container.querySelectorAll('input:not([type="file"]), select');
    inputs.forEach(input => {
        input.addEventListener('change', (e) => {
            if (q.type === 'mcq') {
                container.querySelectorAll('label').forEach(l => {
                    l.style.borderColor = '#cbd5e1'; l.style.fontWeight = 'normal';
                });
                input.parentElement.style.borderColor = '#10b981';
                input.parentElement.style.fontWeight = 'bold';
            } else if (q.type === 'checkbox') {
                input.parentElement.style.borderColor = input.checked ? '#10b981' : '#cbd5e1';
                input.parentElement.style.fontWeight = input.checked ? 'bold' : 'normal';
            } else if (q.type === 'matrix_order') {
                const val = e.target.value;
                const name = e.target.name;
                container.querySelectorAll(`input[type="radio"][value="${val}"]`).forEach(r => {
                    if (r.name !== name) r.checked = false;
                });
            }
        });
    });

    // 🌟 تفعيل تفاعل المطابقة (نقر-للربط) بعد حقن أعمدتها الفارغة في الـ HTML أعلاه 🌟
    if (q.type === 'matching') {
        const initialPairs = (answers[q.id] && typeof answers[q.id] === 'object') ? answers[q.id] : {};
        renderMatchingColumns(q, initialPairs);
    }
}

// 🌟🌟 [جديد] بناء وتفعيل عمودي المطابقة (بدايات/نهايات) بالكامل عبر الـ DOM مباشرة (لا نص HTML خام)
// لأن كل بطاقة تحتاج مستمع نقر خاصاً بها يعرف حالتها الحالية (مربوطة/غير مربوطة) — أسهل وأضمن
// بالإنشاء البرمجي المباشر من محاولة كتابة onclick داخل نص الـ HTML لكل بطاقة.
function renderMatchingColumns(q, initialPairs) {
    const leftContainer = document.getElementById(`hp-match-left-${q.id}`);
    const rightContainer = document.getElementById(`hp-match-right-${q.id}`);
    if (!leftContainer || !rightContainer) return;

    // نسخة قابلة للتعديل من الأزواج (خريطة: معرف البداية -> معرف النهاية)، منسوخة من الإجابة
    // المحفوظة سابقاً (لو الطالب رجع لهذا السؤال بعد التنقل بين الأسئلة)
    let pairs = { ...initialPairs };
    let selectedLeftId = null;
    const pairColors = ['#0ea5e9', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6'];

    function colorForLeft(leftId) {
        const idx = q.leftItems.findIndex(it => it.id === leftId);
        return pairColors[idx % pairColors.length];
    }

    function persistAnswer() {
        // 🌟 نحفظ نسخة جديدة في answers[q.id] مباشرة (لا داعي لانتظار saveCurrentAnswer عند
        // الانتقال بين الأسئلة، لأن تفاعل المطابقة لحظي بطبيعته)
        answers[q.id] = { ...pairs };
    }

    function renderCards() {
        leftContainer.querySelectorAll('.hp-match-card').forEach(el => el.remove());
        rightContainer.querySelectorAll('.hp-match-card').forEach(el => el.remove());

        q.leftItems.forEach(item => {
            const isPaired = !!pairs[item.id];
            const isSelected = selectedLeftId === item.id;
            const borderColor = isPaired ? colorForLeft(item.id) : (isSelected ? '#0f172a' : '#cbd5e1');

            const card = document.createElement('div');
            card.className = 'hp-match-card';
            card.style.cssText = `padding: 14px; background: white; border: 3px solid ${borderColor}; border-radius: 10px; cursor: pointer; font-family: 'Amiri Quran', serif; font-size: 1.3rem; color: #334155; text-align: center;`;
            card.innerText = item.text;
            card.addEventListener('click', () => {
                if (isPaired) {
                    delete pairs[item.id]; // فك الربط عند الضغط على بطاقة مربوطة مسبقاً
                    selectedLeftId = null;
                } else {
                    selectedLeftId = (selectedLeftId === item.id) ? null : item.id;
                }
                persistAnswer();
                renderCards();
            });
            leftContainer.appendChild(card);
        });

        q.rightItems.forEach(item => {
            const pairedLeftId = Object.keys(pairs).find(l => pairs[l] === item.id);
            const isPaired = !!pairedLeftId;
            const borderColor = isPaired ? colorForLeft(pairedLeftId) : '#cbd5e1';

            const card = document.createElement('div');
            card.className = 'hp-match-card';
            card.style.cssText = `padding: 14px; background: white; border: 3px solid ${borderColor}; border-radius: 10px; cursor: pointer; font-family: 'Amiri Quran', serif; font-size: 1.3rem; color: #334155; text-align: center;`;
            card.innerText = item.text;
            card.addEventListener('click', () => {
                if (isPaired) {
                    delete pairs[pairedLeftId];
                    persistAnswer();
                    renderCards();
                    return;
                }
                if (!selectedLeftId) return; // لازم يختار بداية أولاً قبل الربط
                // لو هذه النهاية مربوطة ببداية أخرى مسبقاً، نفكّ ذلك الربط القديم أولاً
                Object.keys(pairs).forEach(l => { if (pairs[l] === item.id) delete pairs[l]; });
                pairs[selectedLeftId] = item.id;
                selectedLeftId = null;
                persistAnswer();
                renderCards();
            });
            rightContainer.appendChild(card);
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
        if (textIn && textIn.value.trim()) answers[q.id] = textIn.value.trim();
    } else if (q.type === 'write_3_ayahs') {
        const textareaIn = document.getElementById(`hp_q_${q.id}_textarea`);
        if (textareaIn && textareaIn.value.trim()) answers[q.id] = textareaIn.value.trim();
    } else if (q.type === 'dual_dropdown') {
        const sel1 = document.getElementById(`hp_q_${q.id}_select1`);
        const sel2 = document.getElementById(`hp_q_${q.id}_select2`);
        const val1 = (sel1 && sel1.value) ? sel1.value : "";
        const val2 = (sel2 && sel2.value) ? sel2.value : "";
        if (val1 || val2) answers[q.id] = [val1, val2];
    } else if (q.type === 'matrix_order') {
        let studentOrder = [];
        q.options.forEach((opt, rIdx) => {
            const checked = document.querySelector(`input[name="hp_q_${q.id}_r${rIdx}"]:checked`);
            if (checked) {
                const colIndex = parseInt(checked.value) - 1;
                studentOrder[colIndex] = opt;
            }
        });
        answers[q.id] = studentOrder;
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

    const badgeStyles = {
        ok: 'background:#dcfce7; color:#166534;', info: 'background:#e0f2fe; color:#0369a1;',
        warn: 'background:#fef3c7; color:#92400e;', bad: 'background:#fee2e2; color:#b91c1c;'
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
}
