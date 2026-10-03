// components/guidedTour.js
//
// 🌟 [جديد 2026-10-02] "الجولة الإرشادية" (Guided Tour) — خدمة مشتركة واحدة لكل أقسام المنصة.
// تحلّ محل نصوص التعريف التي كانت تظهر أول مرة (بطاقة sectionHint: 'general' و'homework_prep'
// و'dual_test_setup'): ترحيب قصير ثم تعتيم الشاشة مع إبراز (Spotlight) العنصر المستهدف وبطاقة
// شرح قصيرة بجانبه، وأزرار «التالي/السابق/تخطي الجولة».
//
// البنية: مكوّن عرض واحد (هذا الملف) + تعريف خطوات مستقل لكل جولة في TOURS أدناه. كل جولة لها
// علم "شوهدت" مستقل في localStorage (نفس فلسفة components/sectionHint.js: كائن JSON واحد، وفشل
// التخزين لا يكسر شيئاً). إكمال جولة أو تخطيها يمنع ظهورها تلقائياً مرة أخرى، ولا يمنع جولة قسم آخر.
//
// نقطة الربط: من داخل initFunction الخاصة بكل شاشة (maybeStartTour('home') ...) — بنفس قرار
// sectionHint.js، فلا يمسّ أي خطأ هنا التنقل العام. لا إحداثيات ثابتة: كل خطوة تحدّد عنصرها
// بمحدِّد CSS وتنتظر ظهوره فعلياً، وموضع الإبراز يُعاد حسابه كل إطار (تمرير/تغيير حجم/دوران).

import { t } from '../core/i18n.js';

const SEEN_TOURS_STORAGE_KEY = 'dh_seen_tours';

// ───────────────────────────── تعريف الجولات ─────────────────────────────
// step: { target: محدِّد CSS أو null (بطاقة وسط الشاشة بلا إبراز), textKey, titleKey?, before?: async fn }
// ⚠️ كل العناصر المذكورة موجودة فعلاً في القوالب الحالية؛ أي عنصر غير موجود/مخفي يُتخطّى تلقائياً.
const TOURS = {
    // الشاشة الرئيسية (components/splash.html)
    home: {
        welcome: true,
        steps: [
            { target: '.home-greeting-row', textKey: 'tour_home_name' },
            { target: '#btn-my-students-main', textKey: 'tour_home_students' },
            { target: '#btn-kids-main', textKey: 'tour_home_kids' },
            { target: '#btn-adult-main', textKey: 'tour_home_adults' },
            { target: '#btn-homework-main', textKey: 'tour_home_homework' },
            { target: '#btn-dual-main', textKey: 'tour_home_dual' },
            { target: '.home-footer-contact', textKey: 'tour_home_contact' }
        ]
    },
    // طلابي (student/my-students.html)
    // 🌟 [2026-10-03] كانت الجولة تعرّف بعنصرين فقط؛ الآن تمرّ على كل محتوى الشاشة (بتصميمها الجديد: أرقام + بطاقات).
    // المفتاح أصبح 'my_students' (بدل 'students') حتى تظهر الجولة الكاملة مرة أخرى لمن شاهد النسخة القديمة.
    my_students: {
        steps: [
            { target: '#ms-screen .ms-head', textKey: 'tour_students_intro' },
            { target: '#ms-stats', textKey: 'tour_students_stats' },
            { target: '#btn-all-students', textKey: 'tour_students_all' },
            { target: '#btn-add-student', textKey: 'tour_students_add' },
            { target: '#btn-monthly-memo-bulk', textKey: 'tour_students_monthly_memo' },
            { target: '#btn-monthly-reports-hub', textKey: 'tour_students_reports' },
            { target: '#btn-back-my-students', textKey: 'tour_students_back' }
        ]
    },
    // مدخل ركن الأطفال / واجهة الكبار = شاشة اختيار الطالب (student/login.html)
    kids: {
        steps: [
            { target: '#login-title', textKey: 'tour_kids_intro' },
            { target: '#student-search-input', textKey: 'tour_login_search' },
            { target: '#btn-login-submit', textKey: 'tour_login_start' }
        ]
    },
    adults: {
        steps: [
            { target: '#login-title', textKey: 'tour_adults_intro' },
            { target: '#student-search-input', textKey: 'tour_login_search' },
            { target: '#btn-login-submit', textKey: 'tour_login_start' }
        ]
    },
    // 🌟 [2026-10-02] لوحة التقييم (settings/dashboard.html): هنا يُختار نوع/نطاق النشاط فعلاً، لذلك لها جولة قصيرة
    // لكل مسار (كبار/أطفال) تبدأ تلقائياً من مستمع dh:screen أسفل الملف (بلا أي تعديل على dashboard.js).
    adults_dashboard: {
        steps: [
            { target: '#eval-radios', textKey: 'tour_dash_type' },
            { target: '#btn-start-mission', textKey: 'tour_dash_start' }
        ]
    },
    kids_dashboard: {
        steps: [
            { target: '#kids-settings', textKey: 'tour_kdash_scope' },
            { target: '#btn-start-mission', textKey: 'tour_dash_start' }
        ]
    },
    // الواجبات المنزلية (settings/homework-prep.html) — يفتح تبويب الإعداد بنفس الزر الموجود (#btn-hero-new)
    // ثم يعود لسجل الواجبات؛ لا منطق جديد، مجرد نقرات على أزرار المعلم نفسها.
    homework: {
        onEnd: () => { clickIfPresent('#btn-tab-history'); },
        steps: [
            { target: '#btn-hero-new', textKey: 'tour_hw_new' },
            // 🌟 [2026-10-02] قُسمت خطوة الإعداد إلى خطوتين (لمن الواجب / نطاقه): العنصر الواحد #hw-config-section أطول
            // من شاشة الهاتف فكانت بطاقة الشرح تغطي جزءاً منه. before يضغط زر المعلم نفسه إن لم يكن تبويب الإعداد مفتوحاً.
            {
                target: '.hwp2-assign-box', textKey: 'tour_hw_assign',
                before: () => { if (!isShown(document.querySelector('#tab-new-hw'))) clickIfPresent('#btn-hero-new'); }
            },
            {
                target: '.hwp2-config-col-right', textKey: 'tour_hw_config',
                before: () => { if (!isShown(document.querySelector('#tab-new-hw'))) clickIfPresent('#btn-hero-new'); }
            },
            { target: '#btn-generate-hw', textKey: 'tour_hw_generate' },
            { target: null, textKey: 'tour_hw_share' },
            {
                target: '#btn-tab-history', textKey: 'tour_hw_history',
                before: () => { clickIfPresent('#btn-tab-history'); }
            },
            { target: '#stat-needs-grading-card', textKey: 'tour_hw_grading' },
            { target: '#btn-final-results', textKey: 'tour_hw_final' }
        ]
    },
    // الاختبارات الثنائية (dualtests/dual-test-setup.html) — قائمة الاختبارات فقط (لا نفتح المحرر)
    dual: {
        steps: [
            { target: '#dts-new-test-btn', textKey: 'tour_dual_new' },
            { target: ['#dts-tests-container', '#dts-list-view .dts-panel'], textKey: 'tour_dual_saved' }
        ]
    }
};

function clickIfPresent(selector) {
    try { document.querySelector(selector)?.click(); } catch (e) { /* تجاهل */ }
}

// ───────────────────────────── حالة "شوهدت" ─────────────────────────────
function getSeenMap() {
    try {
        const raw = localStorage.getItem(SEEN_TOURS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};   // تخزين محظور/تالف: نتعامل كأنها لم تُشاهد (أسوأ حالة: تظهر مرة أخرى)
    }
}

function markSeen(key) {
    const map = getSeenMap();
    map[key] = true;
    try { localStorage.setItem(SEEN_TOURS_STORAGE_KEY, JSON.stringify(map)); } catch (e) { /* تجاهل بصمت */ }
}

export function hasSeenTour(key) { return !!getSeenMap()[key]; }

// إعادة تعيين كل الجولات (لإعادة عرضها لاحقاً من أي مكان مناسب للمساعدة/الإعدادات)
export function resetAllTours() {
    try { localStorage.removeItem(SEEN_TOURS_STORAGE_KEY); } catch (e) { /* تجاهل */ }
}

// ───────────────────────────── أدوات مساعدة ─────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const currentScreen = () => document.body.dataset.dhScreen || '';

function isShown(el) {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none';
}

// 🌟 [2026-10-02] يقبل محدّداً واحداً أو قائمة بدائل (يُستخدم أول عنصر ظاهر منها)
// 🌟 [2026-10-03] استُخرجت من waitForElement لتُستعمل أيضاً في إعادة العثور على الهدف لو استُبدلت عقدته بعد بدء الخطوة
function resolveTarget(selector) {
    if (!selector) return null;
    return [].concat(selector).map(sel => document.querySelector(sel)).find(isShown) || null;
}

// ينتظر ظهور العنصر فعلياً (تحميل الشاشة/تبويب غير مكتمل)، ويُرجع null بعد المهلة
async function waitForElement(selector, timeout, isStale) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
        if (isStale()) return null;
        const el = resolveTarget(selector);
        if (el) return el;
        await sleep(120);
    }
    return null;
}

// 🌟 [2026-10-03] إطار رسم تالٍ — مع مؤقّت احتياطي حتى لا تعلق الجولة لو توقفت rAF (تبويب في الخلفية)
const nextFrame = () => new Promise(resolve => {
    let done = false;
    const fin = () => { if (!done) { done = true; resolve(); } };
    requestAnimationFrame(fin);
    setTimeout(fin, 100);
});

// 🌟 [2026-10-03] ينتظر حتى يتوقف مستطيل العنصر عن الحركة فعلياً (٥ إطارات متتالية بلا تغيّر): نهاية التمرير الناعم،
// حركة دخول الشاشة/التبويب (fadeIn/slideUp في global.css)، إزاحة تخطيط متأخرة (شارات homeFast تُحقن بعد الإقلاع).
// السبب الجذري للإبراز "المتأخر/المزاح": كان الإبراز يُوضع فوراً بمستطيل العنصر قبل أن يستقر، فيظهر في غير موضعه.
async function waitForStableRect(getEl, timeout, isStale) {
    const t0 = performance.now();
    let last = '', still = 0;
    while (performance.now() - t0 < timeout) {
        if (isStale()) return;
        await nextFrame();
        const el = getEl();
        if (!el) { last = ''; still = 0; continue; }
        const r = el.getBoundingClientRect();
        const key = `${r.top.toFixed(1)}|${r.left.toFixed(1)}|${r.width.toFixed(1)}|${r.height.toFixed(1)}`;
        if (key === last) { if (++still >= 5) return; }
        else { last = key; still = 0; }
    }
}

// نوافذ/بطاقات حاجبة قد تكون ظاهرة على الشاشة الرئيسية (الجديد في التحديث، تذكير النسخة الاحتياطية...)
const BLOCKER_IDS = ['whats-new-modal', 'backup-reminder-modal', 'teacher-profile-modal', 'section-hint-card'];
function blockerVisible() {
    return BLOCKER_IDS.some(id => {
        const el = document.getElementById(id);
        return el && getComputedStyle(el).display !== 'none';
    });
}

// ───────────────────────────── العرض ─────────────────────────────
let session = null;   // الجولة الجارية حالياً (واحدة فقط في أي وقت)

function buildRoot() {
    const root = document.createElement('div');
    root.className = 'dh-tour-root';
    root.innerHTML = `
        <div class="dh-tour-shield"></div>
        <div class="dh-tour-dim"></div>
        <div class="dh-tour-spot" style="display:none;"></div>
        <div class="dh-tour-card" role="dialog" aria-modal="true" aria-live="polite">
            <div class="dh-tour-icon" aria-hidden="true"></div>
            <div class="dh-tour-title"></div>
            <p class="dh-tour-text"></p>
            <div class="dh-tour-footer">
                <span class="dh-tour-counter"></span>
                <div class="dh-tour-actions">
                    <button type="button" class="dh-tour-btn dh-tour-btn-ghost dh-tour-prev"></button>
                    <button type="button" class="dh-tour-btn dh-tour-btn-primary dh-tour-next"></button>
                </div>
            </div>
            <button type="button" class="dh-tour-skip"></button>
        </div>`;
    document.body.appendChild(root);
    return root;
}

function endSession({ complete, silent }) {
    const s = session;
    if (!s) return;
    session = null;
    s.alive = false;
    cancelAnimationFrame(s.raf);
    document.removeEventListener('keydown', s.onKey, true);
    // 🌟 [2026-10-03] إزالة مستمعي إعادة الحساب (تمرير/تغيير حجم/دوران) ومؤقتاتها
    window.removeEventListener('scroll', s.onScroll, true);
    window.removeEventListener('resize', s.onViewport);
    window.removeEventListener('orientationchange', s.onViewport);
    if (window.visualViewport) window.visualViewport.removeEventListener('resize', s.onViewport);
    clearTimeout(s.reflowTimer);
    clearTimeout(s.glideTimer);
    s.target = null; s.targetSel = null;
    // إكمال أو تخطي = لا تظهر تلقائياً مرة أخرى. (إلغاء صامت بسبب تغيير الشاشة لا يُسجَّل)
    if (!silent) markSeen(s.key);
    let finished = false;
    const finish = () => {
        if (finished) return;   // قد تُستدعى من النقر ومن المؤقّت معاً
        finished = true;
        s.root.remove();
        try { s.def.onEnd && s.def.onEnd(); } catch (e) { /* تجاهل */ }
    };
    if (complete) {
        // رسالة نجاح قصيرة ثم عودة للاستخدام الطبيعي
        s.card.classList.add('dh-tour-card-center', 'dh-tour-card-done');
        s.spot.style.display = 'none';
        s.dim.style.display = 'block';
        s.card.querySelector('.dh-tour-icon').textContent = '🎉';
        s.card.querySelector('.dh-tour-title').textContent = '';
        s.card.querySelector('.dh-tour-text').textContent = t('tour_done');
        s.card.querySelector('.dh-tour-footer').style.display = 'none';
        s.skipBtn.style.display = 'none';
        placeCardCenter(s);
        s.shield.onclick = finish;
        setTimeout(finish, 1700);
    } else {
        finish();
    }
}

function placeCardCenter(s) {
    s.card.style.left = '50%';
    s.card.style.top = '50%';
    s.card.style.transform = 'translate(-50%, -50%)';
    s.card.classList.add('dh-tour-visible');
}

// يضبط موضع الإبراز والبطاقة حسب مستطيل العنصر الحالي
function layout(s, force) {
    // 🌟 [2026-10-03] holding: أثناء انتظار استقرار العنصر (تمرير ناعم/حركة دخول) لا نُظهر أي إبراز حتى لا يُرسم في غير موضعه
    if (!s.alive || s.holding) return;
    let el = s.target;
    if (!el) return;
    let r = el.getBoundingClientRect();
    // 🌟 [2026-10-03] العقدة المستهدفة قد تُستبدل أو تُخفى بعد بدء الخطوة (إعادة رسم لاحقة للشاشة/التبويب). كان الكود هنا
    // يتوقف عند أول عقدة منفصلة فيبقى الإبراز "معلّقاً" في مكان العنصر القديم؛ الآن نعيد العثور على الهدف بمحدِّده،
    // وإن لم يوجد نخفي الإبراز بدل رسمه فوق موضع خاطئ.
    if (!el.isConnected || r.width <= 0 || r.height <= 0) {
        const fresh = resolveTarget(s.targetSel);
        if (!fresh) {
            s.spot.style.display = 'none';
            s.dim.style.display = 'block';
            s.lastKey = '';
            return;
        }
        s.target = el = fresh;
        r = el.getBoundingClientRect();
        s.dim.style.display = 'none';
        s.lastKey = '';
    }
    const key = `${r.top}|${r.left}|${r.width}|${r.height}|${window.innerWidth}|${window.innerHeight}`;
    if (!force && key === s.lastKey) return;
    s.lastKey = key;

    const pad = 6;
    const vw = window.innerWidth, vh = window.innerHeight;
    const radius = parseFloat(getComputedStyle(el).borderRadius) || 12;
    Object.assign(s.spot.style, {
        display: 'block',
        top: `${r.top - pad}px`, left: `${r.left - pad}px`,
        width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px`,
        borderRadius: `${radius + pad}px`
    });

    // موضع البطاقة: أسفل العنصر ثم أعلاه، وإلا في الجهة الأوسع مع بقائها داخل الشاشة دائماً
    const margin = 12, gap = 14;
    const cw = s.card.offsetWidth, ch = s.card.offsetHeight;
    const below = vh - (r.bottom + pad) - gap - margin;
    const above = (r.top - pad) - gap - margin;
    let top;
    if (ch <= below) top = r.bottom + pad + gap;
    else if (ch <= above) top = r.top - pad - gap - ch;
    else top = below >= above ? vh - ch - margin : margin;   // لا مساحة كافية: ألصقها بالحافة الأوسع
    top = Math.max(margin, Math.min(top, vh - ch - margin));
    let left = r.left + r.width / 2 - cw / 2;
    left = Math.max(margin, Math.min(left, vw - cw - margin));
    s.card.style.transform = 'none';
    s.card.style.top = `${top}px`;
    s.card.style.left = `${left}px`;
    s.card.classList.add('dh-tour-visible');
}

function frameLoop(s) {
    if (!s.alive) return;
    layout(s, false);
    s.raf = requestAnimationFrame(() => frameLoop(s));
}

// 🌟 [2026-10-03] يعرض العنصر المستهدف: يُدخله إلى مجال الرؤية (تمرير ناعم كالسابق)، ثم ينتظر حتى يستقر مستطيله فعلياً،
// وبعدها فقط يضع الإبراز والبطاقة. يُستدعى عند كل خطوة، وعند تغيير حجم الشاشة/دورانها (glide=false).
// glide: انزلاق الإبراز من العنصر السابق إلى الحالي (الحركة التجميلية الأصلية) — يُفعَّل فقط لأول وضع في الخطوة وبلا تمرير؛
// أما أثناء التتبع المستمر فلا يوجد أي transition (كان transition الإبراز 0.25ث يجعله يتأخر عن العنصر المتحرك).
async function presentTarget(s, el, glide) {
    const token = ++s.presentToken;
    const stale = () => !s.alive || token !== s.presentToken || currentScreen() !== s.screen;

    const r0 = el.getBoundingClientRect();
    const needsScroll = r0.top < 70 || r0.bottom > window.innerHeight - 70;
    const hadSpot = s.spot.style.display === 'block';
    // لا إبراز سابق نُزلقه، أو سيتحرك العنصر بالتمرير: أخفِ الإبراز (تعتيم كامل) حتى يستقر العنصر
    const hold = needsScroll || !hadSpot;

    s.holding = true;
    s.target = el;
    s.card.classList.remove('dh-tour-visible');
    if (hold) {
        s.spot.style.display = 'none';
        s.dim.style.display = 'block';
    }
    if (needsScroll) {
        const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
        try { el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); } catch (e) { /* تجاهل */ }
    }

    await waitForStableRect(() => resolveTarget(s.targetSel) || el, 1500, stale);
    if (stale()) return;

    // قد تُستبدل العقدة أثناء الانتظار: خذ الحالية بالمحدِّد
    s.target = resolveTarget(s.targetSel) || el;
    s.lastKey = '';
    s.holding = false;
    s.dim.style.display = 'none';
    clearTimeout(s.glideTimer);
    if (glide && !hold) {
        s.spot.classList.add('dh-tour-spot-glide');
        s.glideTimer = setTimeout(() => s.spot.classList.remove('dh-tour-spot-glide'), 300);
    } else {
        s.spot.classList.remove('dh-tour-spot-glide');
    }
    layout(s, true);
}

// 🌟 [2026-10-03] تغيّر حجم الشاشة/اتجاهها: أعد حساب الإبراز فوراً، وبعد استقرار الأبعاد أعد إدخال العنصر إلى مجال الرؤية
// (بعد تدوير الهاتف قد يصير الهدف خارج الشاشة تماماً بينما إحداثيات الإبراز "صحيحة" — فلا يُرى شيء مضاء).
function onViewportChanged(s) {
    if (!s.alive) return;
    s.lastKey = '';
    layout(s, true);
    clearTimeout(s.reflowTimer);
    s.reflowTimer = setTimeout(() => {
        if (!s.alive || !s.targetSel) return;
        const el = resolveTarget(s.targetSel) || s.target;
        if (el && el.isConnected) presentTarget(s, el, false);
    }, 160);
}

async function showStep(s, index, dir) {
    if (!s.alive) return;
    const steps = s.steps;
    if (index < 0) index = 0;
    if (index >= steps.length) { endSession({ complete: true }); return; }
    s.index = index;
    const step = steps[index];
    const isStale = () => !s.alive || currentScreen() !== s.screen;

    s.presentToken++;   // 🌟 [2026-10-03] يُبطل أي عرض سابق ما زال ينتظر استقرار عنصره (ضغط سريع على التالي/السابق)
    s.card.classList.remove('dh-tour-visible');
    try { if (step.before) await step.before(); } catch (e) { /* تجاهل */ }

    let el = null;
    if (step.target) {
        el = await waitForElement(step.target, 5000, isStale);
        if (isStale()) { endSession({ silent: true }); return; }
        // عنصر غير موجود/مخفي (مثلاً على هذا الحجم من الشاشة): نتخطى الخطوة بدل شرح عنصر وهمي
        if (!el) { showStep(s, index + (dir || 1), dir || 1); return; }
    }

    s.target = null;                              // يُعيَّن في presentTarget بعد استقرار العنصر
    s.targetSel = el ? step.target : null;        // 🌟 [2026-10-03] المحدِّد يُحفظ لإعادة العثور على الهدف عند استبدال عقدته
    s.holding = false;
    s.lastKey = '';
    const total = steps.length;
    s.card.querySelector('.dh-tour-icon').textContent = '';
    s.card.querySelector('.dh-tour-title').textContent = step.titleKey ? t(step.titleKey) : '';
    s.card.querySelector('.dh-tour-text').textContent = t(step.textKey);
    s.card.querySelector('.dh-tour-counter').textContent = `${index + 1} / ${total}`;
    s.prevBtn.style.display = index === 0 ? 'none' : '';
    s.nextBtn.textContent = index === total - 1 ? t('tour_btn_finish') : t('tour_btn_next');
    s.skipBtn.textContent = t('tour_btn_skip');
    s.prevBtn.textContent = t('tour_btn_prev');
    s.card.classList.remove('dh-tour-card-center');

    s.nextBtn.focus({ preventScroll: true });

    if (el) {
        // 🌟 [2026-10-03] التمرير + انتظار الاستقرار + وضع الإبراز صارت كلها في presentTarget (كان هنا: مرّر ثم layout فوراً
        // بمستطيل ما قبل التمرير، فيبدأ الإبراز في غير موضعه ويلحق بالعنصر المتحرك بتأخّر).
        await presentTarget(s, el, true);
    } else {
        // خطوة معلومة بلا عنصر: بطاقة وسط الشاشة فوق تعتيم كامل
        s.spot.classList.remove('dh-tour-spot-glide');
        s.spot.style.display = 'none';
        s.dim.style.display = 'block';
        s.card.classList.add('dh-tour-card-center');
        placeCardCenter(s);
    }
}

async function runTour(key, def, { withWelcome }) {
    if (session) return;
    const screen = currentScreen();
    const root = buildRoot();
    const s = session = {
        key, def, root, screen, alive: true, index: 0, target: null, lastKey: '', raf: 0,
        // 🌟 [2026-10-03] targetSel: محدِّد الهدف الحالي · holding: انتظار استقرار العنصر · presentToken: إبطال العروض القديمة
        targetSel: null, holding: false, presentToken: 0, glideTimer: 0, reflowTimer: 0,
        steps: def.steps,
        shield: root.querySelector('.dh-tour-shield'),
        dim: root.querySelector('.dh-tour-dim'),
        spot: root.querySelector('.dh-tour-spot'),
        card: root.querySelector('.dh-tour-card'),
        prevBtn: root.querySelector('.dh-tour-prev'),
        nextBtn: root.querySelector('.dh-tour-next'),
        skipBtn: root.querySelector('.dh-tour-skip')
    };
    const rtl = document.documentElement.dir === 'rtl';
    s.onKey = (e) => {
        if (!s.alive) return;
        if (e.key === 'Escape') { e.preventDefault(); endSession({ complete: false }); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            // الاتجاه يتبع لغة الواجهة: في RTL السهم الأيسر = التالي
            const forward = (e.key === 'ArrowLeft') === rtl;
            e.preventDefault();
            showStep(s, s.index + (forward ? 1 : -1), forward ? 1 : -1);
        }
    };
    document.addEventListener('keydown', s.onKey, true);
    // 🌟 [2026-10-03] إعادة حساب موضع الإبراز عند: التمرير (حتى داخل الحاويات القابلة للتمرير — capture)، تغيير الحجم،
    // دوران الهاتف، وتغيّر حجم المنظور البصري (ظهور/اختفاء شريط المتصفح أو لوحة المفاتيح). حلقة الإطارات تبقى كشبكة أمان.
    s.onScroll = () => { if (s.alive && !s.holding) layout(s, false); };
    s.onViewport = () => onViewportChanged(s);
    window.addEventListener('scroll', s.onScroll, { passive: true, capture: true });
    window.addEventListener('resize', s.onViewport);
    window.addEventListener('orientationchange', s.onViewport);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', s.onViewport);
    s.skipBtn.onclick = () => endSession({ complete: false });
    s.prevBtn.onclick = () => showStep(s, s.index - 1, -1);
    s.nextBtn.onclick = () => showStep(s, s.index + 1, 1);
    frameLoop(s);

    if (withWelcome) {
        // رسالة الترحيب القصيرة: ابدأ الجولة / تخطي
        s.dim.style.display = 'block';
        s.card.classList.add('dh-tour-card-center');
        s.card.querySelector('.dh-tour-icon').textContent = '';
        s.card.querySelector('.dh-tour-title').textContent = t('tour_welcome_title');
        s.card.querySelector('.dh-tour-text').textContent = t('tour_welcome_body');
        s.card.querySelector('.dh-tour-counter').textContent = '';
        s.prevBtn.style.display = 'none';
        s.skipBtn.style.display = 'none';
        s.nextBtn.textContent = t('tour_btn_start');
        // في الترحيب زر «تخطي» يظهر كزر ثانوي بدل «السابق»
        s.prevBtn.style.display = '';
        s.prevBtn.textContent = t('tour_btn_skip_welcome');
        s.prevBtn.onclick = () => endSession({ complete: false });
        s.nextBtn.onclick = () => {
            s.skipBtn.style.display = '';
            s.prevBtn.onclick = () => showStep(s, s.index - 1, -1);
            s.nextBtn.onclick = () => showStep(s, s.index + 1, 1);
            showStep(s, 0, 1);
        };
        placeCardCenter(s);
        s.nextBtn.focus({ preventScroll: true });
    } else {
        showStep(s, 0, 1);
    }
}

// ───────────────────────────── الواجهة العامة ─────────────────────────────
/**
 * تبدأ جولة القسم تلقائياً إن لم تُشاهد من قبل على هذا الجهاز. آمنة: أي خطأ هنا لا يؤثر على الشاشة.
 * @param {string} key - home | students | kids | adults | homework | dual
 * @param {{force?: boolean}} [opts] - force: تجاهل علم "شوهدت" (لإعادة الجولة يدوياً)
 */
export async function maybeStartTour(key, opts = {}) {
    try {
        const def = TOURS[key];
        if (!def || session) return;
        if (!opts.force && hasSeenTour(key)) return;

        const screen = currentScreen();
        const isStale = () => currentScreen() !== screen;

        // على الشاشة الرئيسية ننتظر انتهاء أي نافذة حاجبة (الجديد في التحديث/تذكير النسخة/بيانات المعلم)
        await sleep(700);
        for (let i = 0; i < 90 && blockerVisible(); i++) {
            if (isStale()) return;
            await sleep(700);
        }
        if (isStale() || session || blockerVisible()) return;

        await runTour(key, def, { withWelcome: !!def.welcome });
    } catch (err) {
        console.error('تعذر بدء الجولة الإرشادية:', err);
        if (session) endSession({ silent: true });
    }
}

// تغيير الشاشة أثناء الجولة = إلغاء صامت (لا يُسجَّل كمشاهدة، فتظهر عند العودة)
document.addEventListener('dh:screen', () => {
    if (session && session.screen !== currentScreen()) endSession({ silent: true });
    // 🌟 [2026-10-02] لوحة التقييم: تبدأ جولتها تلقائياً حسب المسار (الأطفال/الكبار)
    if (currentScreen() === 'settings/dashboard.html') {
        const kids = !!document.getElementById('main-body')?.classList.contains('kids-theme');
        maybeStartTour(kids ? 'kids_dashboard' : 'adults_dashboard');
    }
});

// 🌟 [2026-10-02] زر «إعادة الجولات الإرشادية» في نافذة بيانات المعلم (components/splash.html) — بتفويض الحدث
document.addEventListener('click', (e) => {
    if (!(e.target.closest && e.target.closest('#teacher-profile-tour-reset-btn'))) return;
    resetAllTours();
    const msg = document.createElement('div');
    msg.textContent = t('tour_restart_done');
    msg.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:9500;max-width:calc(100vw - 32px);padding:12px 20px;border-radius:14px;background:var(--dh-emerald-800,#0b3d30);color:#fffdf6;font-weight:700;box-shadow:0 10px 28px rgba(0,0,0,.3);';
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 3200);
});
