// games/homework-play.js
import { AppState, loadSplashScreen } from '../core/app.js';
// 🌟 استدعاء دوال جديدة: رفع الصوت لـ Storage، وطابور إعادة الإرسال المحلي
import { saveSubmissionToCloud, uploadAudioAndGetUrl, queuePendingSubmission, flushPendingSubmissions } from '../core/firebase.js';

let hw = null;
let student = null;
let currentIndex = 0;
let answers = {};

// متغيرات خاصة بنظام تسجيل الصوت
let mediaRecorder = null;
let audioChunks = [];

export function initHomeworkPlay() {
    hw = AppState.currentHomework;
    student = AppState.currentStudent;

    if (!hw || !student) {
        alert("بيانات التحدي غير مكتملة، سنعود للرئيسية.");
        loadSplashScreen();
        return;
    }

    document.getElementById('hp-student-name').innerText = `البطل: ${student.name}`;
    currentIndex = 0;
    answers = {};

    // 🌟 محاولة إعادة إرسال أي تسليمات سابقة فشلت في الرفع للسحابة (بصمت، دون إزعاج الطالب)
    flushPendingSubmissions().catch(() => {});

    setupListeners();
    renderQuestion();
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
                    <h1 style="color: #10b981; font-size: 2.5rem; margin-bottom: 10px;">تم إرسال التقييم!</h1>
                    <p style="color: #475569; font-size: 1.5rem;">يمكنك إغلاق هذه الصفحة (النافذة) الآن بأمان يا بطل.</p>
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
        <h3 style="color: #1e293b; font-size: 1.5rem; margin-bottom: 15px;">${q.title}</h3>
        <!-- 🌟 الخط كان 'Amiri' العادي — تم تغييره لـ 'Amiri Quran' لأن هذا الصندوق يعرض نص
             الآية الفعلي (نفس خط class="quran-text" المستخدم بباقي المنصة) حتى يظهر برسم عثماني
             دقيق يشمل كل علامات الضبط الخاصة بالقرآن 🌟 -->
        <div style="background: #f8fafc; padding: 20px; border-radius: 10px; border: 2px solid #e2e8f0; font-size: 1.8rem; color: #047857; margin-bottom: 25px; line-height: 1.6; font-family: 'Amiri Quran', serif;">
            ${q.text}
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
                    <input type="radio" name="hp_q_${q.id}" value="${opt}" ${isChecked} style="margin-left: 15px; transform: scale(1.5);">
                    ${opt}
                </label>
            `;
        });
    } else if (q.type === 'checkbox') {
        const savedArr = Array.isArray(savedAns) ? savedAns : [];
        q.options.forEach(opt => {
            const isChecked = savedArr.includes(opt) ? 'checked' : '';
            html += `
                <label style="display: flex; align-items: center; padding: 15px; background: white; border: 2px solid ${isChecked ? '#10b981' : '#cbd5e1'}; border-radius: 10px; cursor: pointer; transition: 0.3s; font-size: 1.3rem; color: #334155; font-weight: ${isChecked ? 'bold' : 'normal'}; font-family: 'Amiri Quran', serif;">
                    <input type="checkbox" name="hp_q_${q.id}" value="${opt}" ${isChecked} style="margin-left: 15px; transform: scale(1.5);">
                    ${opt}
                </label>
            `;
        });
    } else if (q.type === 'dropdown') {
        // 🌟 خيارات القائمة المنسدلة هنا كلمات قرآنية (إكمال الفراغ) — الخط تغيّر لـ 'Amiri Quran'
        // بدل 'Tajawal' حتى تظهر الكلمة بنفس رسمها العثماني الصحيح 🌟
        html += `<select id="hp_q_${q.id}_select" style="padding: 15px; font-size: 1.4rem; border: 2px solid #cbd5e1; border-radius: 10px; font-family: 'Amiri Quran', serif; outline: none;">
            <option value="" disabled ${!savedAns ? 'selected' : ''}>-- اختر الكلمة الصحيحة --</option>
        `;
        q.options.forEach(opt => {
            const isSelected = savedAns === opt ? 'selected' : '';
            html += `<option value="${opt}" ${isSelected}>${opt}</option>`;
        });
        html += `</select>`;
    } else if (q.type === 'written_blank') {
        // 🌟 حقول كتابة الطالب هنا أيضاً تغيّرت لـ 'Amiri Quran' (بدل 'Amiri' العادي) حتى يرى
        // الطالب أثناء الكتابة نفس رسم الحروف والتشكيل المستخدم في بقية المنصة 🌟
        html += `<input type="text" id="hp_q_${q.id}_text" value="${savedAns}" placeholder="اكتب الكلمة الناقصة هنا..." style="width: 100%; padding: 15px; font-size: 1.5rem; border: 2px solid #cbd5e1; border-radius: 10px; font-family: 'Amiri Quran', serif; outline: none;">`;
    } else if (q.type === 'write_3_ayahs') {
        html += `<textarea id="hp_q_${q.id}_textarea" rows="4" placeholder="اكتب الآيات الثلاث هنا بتركيز..." style="width: 100%; padding: 15px; font-size: 1.5rem; border: 2px solid #cbd5e1; border-radius: 10px; font-family: 'Amiri Quran', serif; outline: none; resize: vertical;">${savedAns}</textarea>`;
    } else if (q.type === 'audio_record') {
        // 🌟 واجهة تسجيل المقطع الصوتي المباشر والرفع 🌟
        html += `
            <div style="display: flex; flex-direction: column; gap: 15px; background: white; padding: 20px; border-radius: 10px; border: 2px solid #cbd5e1;">

                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button id="btn-start-record-${q.id}" style="background: #ef4444; color: white; padding: 12px 20px; border: none; border-radius: 8px; font-size: 1.2rem; cursor: pointer; font-weight: bold; flex: 1; min-width: 150px;">
                        🔴 ابدأ التسجيل المباشر
                    </button>
                    <button id="btn-stop-record-${q.id}" style="background: #64748b; color: white; padding: 12px 20px; border: none; border-radius: 8px; font-size: 1.2rem; cursor: pointer; font-weight: bold; flex: 1; min-width: 150px; display: none;">
                        ⬛ إيقاف التسجيل
                    </button>
                </div>

                <div style="text-align: center; color: #64748b; font-weight: bold;">--- أو ---</div>

                <label style="display: block; background: #0ea5e9; color: white; padding: 12px; border-radius: 8px; text-align: center; cursor: pointer; font-size: 1.2rem; font-weight: bold;">
                    📁 ارفع مقطعاً صوتياً جاهزاً
                    <input type="file" id="hp_q_${q.id}_audio" accept="audio/*" style="display: none;">
                </label>

                <div id="hp_q_${q.id}_audio_status" style="margin-top: 10px; color: ${savedAns ? '#10b981' : '#f59e0b'}; font-weight: bold; text-align: center; font-size: 1.2rem; background: ${savedAns ? '#dcfce7' : '#fef3c7'}; padding: 10px; border-radius: 8px;">
                    ${savedAns ? '✅ تم حفظ تسجيلك بنجاح. يمكنك المتابعة.' : '⚠️ لم تقم بالتسجيل أو الرفع بعد'}
                </div>
            </div>
        `;
    } else if (q.type === 'dual_dropdown') {
        const savedArr = Array.isArray(savedAns) ? savedAns : ["", ""];
        html += `<div style="display: flex; gap: 15px; flex-wrap: wrap;">`;
        html += `<div style="flex: 1; min-width: 200px;">
            <label style="display: block; margin-bottom: 5px; color: #475569; font-weight: bold;">اختر الفراغ الأول [ 1 ]:</label>
            <select id="hp_q_${q.id}_select1" style="width: 100%; padding: 15px; font-size: 1.4rem; border: 2px solid #cbd5e1; border-radius: 10px; font-family: 'Amiri Quran', serif; outline: none;">
            <option value="" disabled ${!savedArr[0] ? 'selected' : ''}>-- اختر الكلمة الأولى --</option>`;
        q.options1.forEach(opt => {
            const isSelected = savedArr[0] === opt ? 'selected' : '';
            html += `<option value="${opt}" ${isSelected}>${opt}</option>`;
        });
        html += `</select></div>`;
        html += `<div style="flex: 1; min-width: 200px;">
            <label style="display: block; margin-bottom: 5px; color: #475569; font-weight: bold;">اختر الفراغ الثاني [ 2 ]:</label>
            <select id="hp_q_${q.id}_select2" style="width: 100%; padding: 15px; font-size: 1.4rem; border: 2px solid #cbd5e1; border-radius: 10px; font-family: 'Amiri Quran', serif; outline: none;">
            <option value="" disabled ${!savedArr[1] ? 'selected' : ''}>-- اختر الكلمة الثانية --</option>`;
        q.options2.forEach(opt => {
            const isSelected = savedArr[1] === opt ? 'selected' : '';
            html += `<option value="${opt}" ${isSelected}>${opt}</option>`;
        });
        html += `</select></div>`;
        html += `</div>`;
    } else if (q.type === 'matrix_order') {
        const savedArr = Array.isArray(savedAns) ? savedAns : [];
        const colsCount = q.options.length;
        html += `<div style="overflow-x: auto; background: white; border-radius: 10px; border: 1px solid #cbd5e1; direction: rtl;">
            <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 1.2rem;">
                <tr style="background: #f1f5f9; color: #334155;">
                    <th style="padding: 15px; text-align: right;">الآية المبعثرة</th>`;
        for (let c = 1; c <= colsCount; c++) { html += `<th style="padding: 15px;">${c}</th>`; }
        html += `</tr>`;
        q.options.forEach((opt, rIdx) => {
            html += `<tr><td style="text-align: right; padding: 15px; border-bottom: 1px solid #e2e8f0; font-family: 'Amiri Quran', serif; font-size: 1.5rem; color: #047857; line-height: 1.6; min-width: 250px;">${opt}</td>`;
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
                    <div style="font-weight: bold; color: #475569; text-align: center; margin-bottom: 5px;">البدايات</div>
                </div>
                <div id="hp-match-right-${q.id}" style="flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: 10px;">
                    <div style="font-weight: bold; color: #475569; text-align: center; margin-bottom: 5px;">النهايات</div>
                </div>
            </div>
            <div style="margin-top: 15px; text-align: center; color: #64748b; font-size: 1rem;">اضغط على بداية، ثم على نهايتها المطابقة لها. اضغط على أي بطاقة مربوطة لفك ربطها.</div>
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

    // 🌟 تفعيل أحداث الميكروفون المباشر ورفع الملف للصوت 🌟
    if (q.type === 'audio_record') {
        const btnStart = document.getElementById(`btn-start-record-${q.id}`);
        const btnStop = document.getElementById(`btn-stop-record-${q.id}`);
        const statusDiv = document.getElementById(`hp_q_${q.id}_audio_status`);
        const fileInput = document.getElementById(`hp_q_${q.id}_audio`);

        // رفع ملف جاهز
        fileInput.addEventListener('change', (e) => {
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const reader = new FileReader();
                reader.onload = (ev) => {
                    answers[q.id] = ev.target.result;
                    statusDiv.innerHTML = "✅ تم رفع الملف الصوتي وحفظه بنجاح!";
                    statusDiv.style.color = "#10b981"; statusDiv.style.background = "#dcfce7";
                };
                reader.readAsDataURL(file);
            }
        });

        // تسجيل مباشر من المايكروفون
        btnStart.addEventListener('click', async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = event => {
                    if (event.data.size > 0) audioChunks.push(event.data);
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        answers[q.id] = reader.result; // حفظ كـ Base64 (سيُرفع لاحقاً لـ Storage عند الإرسال النهائي)
                        statusDiv.innerHTML = "✅ اكتمل التسجيل المباشر وتم الحفظ!";
                        statusDiv.style.color = "#10b981"; statusDiv.style.background = "#dcfce7";
                    };
                    reader.readAsDataURL(audioBlob);
                    // إغلاق المايكروفون بعد الانتهاء
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start();
                btnStart.style.display = "none";
                btnStop.style.display = "block";
                statusDiv.innerHTML = "🎙️ جاري التسجيل الآن... تحدث بوضوح.";
                statusDiv.style.color = "#ef4444"; statusDiv.style.background = "#fee2e2";

            } catch (err) {
                console.error("خطأ في الميكروفون:", err);
                alert("لم نتمكن من الوصول للميكروفون. تأكد من إعطاء الصلاحية للمتصفح، أو استخدم خيار (رفع ملف).");
            }
        });

        btnStop.addEventListener('click', () => {
            if (mediaRecorder && mediaRecorder.state !== "inactive") {
                mediaRecorder.stop();
                btnStop.style.display = "none";
                btnStart.style.display = "block";
                btnStart.innerHTML = "🔄 إعادة التسجيل";
            }
        });
    }

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
    // ملاحظة: audio_record يُحفظ تلقائياً في الحدث (onstop أو change) لتجنب فقدانه
    // ملاحظة: matching يُحفظ أيضاً تلقائياً فور كل ضغطة ربط/فك ربط (renderMatchingColumns)، لنفس سبب الصوت
}

// 🌟 [جديد] دالة حماية عامة: تُنفّذ أي Promise لكن لا تنتظره أبداً أكثر من مهلة محددة.
// إن لم يُنجز الـ Promise خلال المهلة، تُرجع القيمة الاحتياطية فوراً بدل تعليق الصفحة للأبد.
// هذا هو الإصلاح الأساسي لمشكلة "جاري الاعتماد..." التي لا تنتهي أبداً.
function withTimeout(promise, ms, fallbackValue = null) {
    return new Promise((resolve) => {
        let settled = false;
        const timer = setTimeout(() => {
            if (!settled) { settled = true; resolve(fallbackValue); }
        }, ms);
        promise.then((val) => {
            if (!settled) { settled = true; clearTimeout(timer); resolve(val); }
        }).catch(() => {
            if (!settled) { settled = true; clearTimeout(timer); resolve(fallbackValue); }
        });
    });
}

async function submitHomework() {
    const submitBtn = document.getElementById('btn-hp-submit');
    submitBtn.innerHTML = "⏳ جاري الاعتماد...";
    submitBtn.disabled = true;

    let totalPoints = 0;
    let earnedPoints = 0;
    const detailedLog = [];
    const submissionId = `${hw.id}_${student.id}_${Date.now()}`;

    // 🌟🌟 إصلاح جوهري (كان هو سبب تجمّد "جاري الاعتماد..." للأبد): كان رفع الصوت لـ Storage
    // يحدث هنا في أول الدالة، وإن كانت خدمة Storage غير مفعّلة أو بها مشكلة اتصال، يمكن أن
    // يُعلَّق الطلب دون أن ينجح أو يفشل أبداً، فتتجمد كل الشاشة قبل حتى حساب النتيجة.
    // الحل: حساب النتيجة وعرضها للطالب أولاً (لا يعتمد على الشبكة إطلاقاً)، ثم تنفيذ رفع
    // الصوت والحفظ في السحابة بعد ذلك، بمهلة قصوى (20 ثانية) لكل عملية شبكة حتى لا تتجمد الصفحة مهما حدث.

    hw.questions.forEach(q => {
        const stdAns = answers[q.id];
        let isCorrect = false;
        const qPoints = q.points || 1;

        if (q.needsManualGrading) {
            isCorrect = false;
        } else {
            totalPoints += qPoints;
            if (q.type === 'matrix_order') {
                let correctRows = 0;
                if (Array.isArray(stdAns)) {
                    q.correctAnswer.forEach((correctAyah, idx) => {
                        if (stdAns[idx] === correctAyah) correctRows++;
                    });
                }
                earnedPoints += correctRows;
                isCorrect = (correctRows === qPoints);
            } else if (q.type === 'dual_dropdown') {
                let correctParts = 0;
                if (Array.isArray(stdAns)) {
                    if (stdAns[0] === q.correctAnswer[0]) correctParts++;
                    if (stdAns[1] === q.correctAnswer[1]) correctParts++;
                }
                earnedPoints += correctParts;
                isCorrect = (correctParts === qPoints);
            } else if (q.type === 'checkbox') {
                if (Array.isArray(stdAns) && Array.isArray(q.correctAnswer) && stdAns.length === q.correctAnswer.length) {
                    const sortedStd = [...stdAns].sort();
                    const sortedCorr = [...q.correctAnswer].sort();
                    isCorrect = sortedStd.every((val, idx) => val === sortedCorr[idx]);
                }
                if (isCorrect) earnedPoints += qPoints;
            } else {
                isCorrect = (stdAns === q.correctAnswer);
                if (isCorrect) earnedPoints += qPoints;
            }
        }

        let safeStdAns = stdAns;
        if (q.type === 'audio_record') {
            safeStdAns = stdAns ? '[مقطع صوتي مُسجل 🎤]' : 'لم يُسجل';
        } else if (q.type === 'matching') {
            // 🌟 [جديد] نلخّص أزواج المطابقة كنص مقروء (نسخة احتياطية نصية فقط؛ العرض التفاعلي
            // الحقيقي في غرفة التصحيح يعتمد على matchingData الخام أدناه لا هذا النص الملخّص)
            const pairsObj = (stdAns && typeof stdAns === 'object') ? stdAns : {};
            const pairEntries = Object.keys(pairsObj);
            if (pairEntries.length === 0) {
                safeStdAns = 'لم يُجب';
            } else {
                safeStdAns = pairEntries.map(leftId => {
                    const leftItem = q.leftItems.find(it => it.id === leftId);
                    const rightItem = q.rightItems.find(it => it.id === pairsObj[leftId]);
                    return `(${leftItem ? leftItem.text : leftId} ⇄ ${rightItem ? rightItem.text : pairsObj[leftId]})`;
                }).join(' ، ');
            }
        } else if (Array.isArray(stdAns)) {
            safeStdAns = stdAns.map(x => x || 'فارغ').join(' ، ');
        } else if (!stdAns) {
            safeStdAns = 'لم يُجب';
        }

        let safeCorrAns;
        if (q.type === 'matching') {
            // 🌟 [جديد] الأزواج الصحيحة نص مقروء (بديل احتياطي فقط، نفس سبب safeStdAns أعلاه)
            safeCorrAns = q.correctAnswer.map(p => {
                const leftItem = q.leftItems.find(it => it.id === p.left);
                const rightItem = q.rightItems.find(it => it.id === p.right);
                return `(${leftItem ? leftItem.text : p.left} ⇄ ${rightItem ? rightItem.text : p.right})`;
            }).join(' ، ');
        } else {
            safeCorrAns = Array.isArray(q.correctAnswer) ? q.correctAnswer.join(' ، ') : q.correctAnswer;
        }
        // 🌟 حماية إضافية: لو correctAnswer غير معرّف لأي سبب، نستبدلها بقيمة صالحة بدل undefined
        if (safeCorrAns === undefined) safeCorrAns = '';

        if (q.needsManualGrading) safeStdAns += " (بانتظار تقييم المعلم)";

        detailedLog.push({
            question: q.text,
            type: q.type,
            studentAnswer: safeStdAns,
            correctAnswer: safeCorrAns,
            isCorrect: isCorrect,
            // 🌟🌟 إصلاح جوهري (هذا هو السبب الحقيقي وراء فشل حفظ كل التسليمات منذ البداية):
            // Firestore يرفض تمامًا أي حقل قيمته undefined ويفشل الحفظ بالكامل برسالة
            // "Unsupported field value: undefined". أسئلة الاختيار من متعدد والقوائم المنسدلة
            // وغيرها لا تحمل خانة needsManualGrading أصلاً من homeworkEngine.js، فتكون قيمتها
            // undefined هنا. نستخدم "|| false" لضمان أنها دائماً true أو false، لا أكثر ولا أقل.
            needsManualGrading: q.needsManualGrading || false,
            // 🌟 [جديد] نخزّن الدرجة القصوى لهذا السؤال مباشرة بدل ترك المعلم (homework-prep.js)
            // يعيد تخمينها لاحقاً من نوع السؤال فقط، وهو أسلوب هش يفقد التزامن إن تغيرت نقاط الأنواع مستقبلاً.
            points: qPoints,
            // 🌟 نفس المشكلة بالضبط: لو سؤال صوتي والطالب لم يسجل شيئاً، stdAns تكون undefined.
            // "|| null" يضمن قيمة صالحة دائماً (null مقبول في Firestore، undefined غير مقبول أبداً).
            audioData: q.type === 'audio_record' ? (stdAns || null) : null,
            // 🌟 [جديد] بيانات المطابقة الخام (الأعمدة + ربط الطالب + الأزواج الصحيحة) لعرضها
            // بشكل تفاعلي في غرفة التصحيح بـ homework-prep.js، بدل الاكتفاء بالنص الملخّص أعلاه فقط.
            // نفس منطق "|| null" السابق: matchingData لازم تكون null لا undefined لأي سؤال آخر.
            matchingData: q.type === 'matching' ? {
                leftItems: q.leftItems,
                rightItems: q.rightItems,
                studentPairs: (stdAns && typeof stdAns === 'object') ? stdAns : {},
                correctPairs: q.correctAnswer
            } : null
        });
    });

    const scorePercent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 100;

    const historyKey = `history_${student.id}`;
    let historyArray = JSON.parse(localStorage.getItem(historyKey)) || [];
    historyArray.push({
        date: new Date().toLocaleDateString('ar-EG'),
        range: `واجب منزلي (${hw.questions.length} أسئلة)`,
        score: scorePercent,
        hwId: hw.id,
        details: detailedLog
    });
    localStorage.setItem(historyKey, JSON.stringify(historyArray));

    // 🌟🌟 [تعديل بناءً على طلب المعلم] لا نعرض للطالب أي نتيجة أو نسبة مئوية إطلاقاً عند
    // التسليم — حتى لو كانت كل الأسئلة تلقائية التصحيح بالكامل — لأن المعلم طلب صراحة ألا يرى
    // الطالب أي رقم إلا بعد انتهاء المعلم من المراجعة والتصحيح اليدوي الكامل لكل الواجب، حتى
    // تكون النتيجة التي يراها الطالب في النهاية دقيقة ونهائية، بدل رقم أولي قد يتغير لاحقاً.
    // ملحوظة: النتيجة (scorePercent) ما زالت تُحسب وتُحفظ بالكامل كالمعتاد في السجل المحلي
    // وفي السحابة (يستخدمها المعلم كنتيجة أولية قابلة للتعديل من نافذة التصحيح) — نحن فقط لا
    // نعرضها في واجهة الطالب هنا.
    submitBtn.innerHTML = "✅ تم الاعتماد";
    const resultScoreEl = document.getElementById('hp-result-score');
    resultScoreEl.style.color = '#0ea5e9';
    resultScoreEl.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 10px;">📨</div>
        تم استلام إجاباتك بنجاح يا بطل!
        <br><span style="font-size: 1.1rem; color:#475569;">سيقوم معلمك بمراجعة إجاباتك واعتماد نتيجتك النهائية، وستُبلَّغ بها منه مباشرة. 🌟</span>
    `;

    const resultModal = document.getElementById('hp-result-modal');
    if (resultModal) {
        resultModal.style.display = 'flex';
    } else {
        // 🌟 خطة بديلة: لو كان معرّف العنصر مختلفاً في ملف HTML لديك، لن نفقد الرسالة بصمت
        console.error("⚠️ لم يتم العثور على عنصر hp-result-modal في الصفحة! تحقق من homework-play.html");
        alert(`تم استلام إجاباتك بنجاح! سيقوم معلمك بمراجعتها واعتماد نتيجتك النهائية قريباً.`);
    }

    // ==========================================
    // 🌐 من هنا فصاعداً: كل ما يخص الشبكة (لا يجب أن يُعلّق الصفحة أبداً بعد الآن)
    // ==========================================

    // 1) تحديث رصيد نقاط الطالب محلياً — بمهلة قصوى ومعالجة أخطاء منفصلة
    try {
        student.totalScore = (student.totalScore || 0) + earnedPoints;
        await withTimeout(AppState.studentManager.updateStudent(student), 10000);
    } catch (e) {
        console.error("تعذر تحديث رصيد نقاط الطالب:", e);
    }

    // 2) رفع أي تسجيل صوتي إلى Firebase Storage، بمهلة قصوى 20 ثانية لكل تسجيل
    for (let i = 0; i < hw.questions.length; i++) {
        const q = hw.questions[i];
        if (q.type === 'audio_record' && answers[q.id] && String(answers[q.id]).startsWith('data:')) {
            const url = await withTimeout(uploadAudioAndGetUrl(answers[q.id], submissionId, q.id), 20000, null);
            // 🌟 نطابق بالفهرس (i) مباشرة بدل البحث بنص السؤال، لأن detailedLog بُني بنفس
            // ترتيب hw.questions تماماً في الحلقة أعلاه — هذا أضمن من مطابقة النص.
            if (url) {
                // نحدّث الرابط في نسخة التفاصيل التي سترسل للسحابة (وليس فقط answers المحلية)
                detailedLog[i].audioData = url;
            } else {
                // فشل الرفع (Storage غير مفعّل / لا إنترنت): لا نُرسل Base64 ضخماً للسحابة
                // لأنه سيفشل حتماً بسبب حد حجم مستند Firestore، ونكتفي بترك ملاحظة واضحة.
                detailedLog[i].audioData = null;
                console.warn(`تعذر رفع التسجيل الصوتي للسؤال ${q.id} إلى Storage — تأكد من تفعيل Firebase Storage.`);
            }
        }
    }

    const cloudSubmissionData = {
        // 🌟🌟 [جديد — المرحلة 2] حقل id ثابت للتسليم نفسه (نفس submissionId المستخدَم أصلاً
        // أعلاه كمسار تخزين الصوت في Storage، لم يكن يُخزَّن داخل بيانات التسليم نفسها من قبل).
        // يُمكّن core/firebase.js من تتبّع "هل هذا التسليم بعينه لا يزال عالقاً في طابور إعادة
        // المحاولة المحلي؟" (isSubmissionPendingSync/getPendingSubmissionsCountForHomework) —
        // إضافة حقل جديد بحتة، لا تؤثر على أي كود قديم يقرأ هذا الكائن.
        id: submissionId,
        hwId: hw.id,
        studentId: student.id,
        studentName: student.name,
        score: scorePercent,
        date: new Date().toLocaleDateString('ar-EG'),
        timestamp: Date.now(),
        details: detailedLog
    };

    // 3) إرسال النتيجة للسحابة، بمهلة قصوى 20 ثانية أيضاً حتى لا تتعلق أي شاشة أخرى مستقبلاً
    const uploaded = await withTimeout(saveSubmissionToCloud(cloudSubmissionData), 20000, false);
    if (!uploaded) {
        queuePendingSubmission(cloudSubmissionData);
        resultScoreEl.innerHTML += '<br><span style="color:#ef4444; font-size:1.05rem;">⚠️ تعذر إرسال نتيجتك للمعلم الآن (تحقق من اتصال الإنترنت). سيُعاد إرسالها تلقائياً بمجرد توفر الاتصال.</span>';
    }
}