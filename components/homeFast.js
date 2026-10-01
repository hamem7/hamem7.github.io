// components/homeFast.js
// 🌟🌟 [جديد 2026-10-01 — "الدخول السريع" بطلب المعلم، تنفيذ نموذج المعاينة] كل منطق تسريع الشاشة الرئيسية في ملف واحد
// مستقل حتى لا يتضخم core/app.js:
//   1) مربع بحث عن طالب → لكل نتيجة زرّان: "اختبار في الكبار" / "اختبار في الأطفال" (بلا أي تصنيف بجوار الاسم، لأن
//      المعلم يختبر الطالب نفسه أحياناً في هذه الواجهة وأحياناً في تلك).
//   2) بطاقة "تابع من حيث توقفت": آخر طالب بدأ المعلم تقييمه (تُسجَّل في enterStudentEvaluation بـ student/student.js)
//      بنفس الوضع (كبار/أطفال) الذي استُخدم حينها. لا تظهر إن لم يوجد سجل أو حُذف الطالب.
//   3) شارات على أزرار الواجبات والاختبارات الثنائية + شريط "قريباً" للميزات قيد التطوير + زر لغة (الترويسة مخفية بالرئيسية).
//   4) على الهاتف: شريط تنقّل سفلي في الشاشات الأساسية فقط. والترويسة تختفي بالتمرير للأسفل في الشاشات الداخلية الأساسية.
//   5) اختصارات PWA: ‎index.html?go=students|homework|dual|evaluate‎ (راجع manifest.json).
// ⚠️ افتراضات صريحة:
//   - شارة الواجبات = عدد التسليمات الجديدة التي وصلت (حدث dh:new-homework-submissions) منذ آخر دخول لشاشة الواجبات.
//     دقتها محدودة بالأوقات التي تكون فيها المنصة مفتوحة (لا خادم يخبرنا بما فات وهي مغلقة).
//   - شارة الاختبارات الثنائية = عدد المواجهات غير المكتملة (status !== 'completed').
//   - الشاشات "الأساسية" (القائمة المسموحة للشريط السفلي والترويسة المنزلقة) محددة في CORE_SCREENS أدناه؛ شاشات الألعاب
//     والاختبارات تُترك كما هي تماماً حتى لا يتداخل الشريط مع أزرارها.
// كل التنسيق في css/homeFast.css بأسماء dh-fast-* و dh-bnav-* الجديدة فقط (لا تعديل على أي قاعدة قائمة). 🌟🌟

import { translations, t, tf, applyLanguage } from '../core/i18n.js';
import { AppState, setEvaluationMode, openHomeworkPrep, openDualTestSetup, loadSplashScreen } from '../core/app.js';
import { switchTheme } from '../core/navigation.js';
import { loadMyStudentsScreen, enterStudentEvaluation, rankStudentMatches, normName } from '../student/student.js';

const HOME_SCREEN = 'components/splash.html';
// الشاشات الأساسية: يظهر فيها الشريط السفلي (هاتف) وتنزلق ترويستها
const CORE_SCREENS = [HOME_SCREEN, 'student/my-students.html', 'student/all-students.html', 'student/student-profile.html', 'settings/homework-prep.html', 'dualtests/dual-test-setup.html'];

export const LAST_EVAL_KEY = 'dh_last_evaluation';   // يكتبه enterStudentEvaluation
const HW_NEW_KEY = 'dh_hw_new_count';

// ---------------------------------------------------------------------------
// 🌟 ترجمات الميزة (عربي + إنجليزي). تُدمج في القاموس المركزي عند تحميل هذا الملف (قبل أي رسم للشاشة).
// تتضمن أيضاً 4 مفاتيح كانت أُضيفت لـ core/i18n.js ثم ضاعت بسبب كتابة متزامنة من جلسة أخرى (بطاقة "يحتاج منك اليوم"
// وبطاقة الخصوصية وسطر "عن حمٓ") — إضافتها هنا آمنة لأنها لا تكتب فوق مفتاح موجود مسبقاً.
const NEW_KEYS = {
    ar: {
        home_fast_placeholder: 'ابحث عن طالب للاختبار…',
        home_fast_in_adult: 'اختبار في الكبار',
        home_fast_in_kids: 'اختبار في الأطفال',
        home_fast_none: 'لا يوجد طالب بهذا الاسم',
        home_fast_continue: 'تابع من حيث توقفت',
        home_fast_continue_mode_adult: 'الكبار',
        home_fast_continue_mode_kids: 'الأطفال',
        home_soon_label: 'قريبًا',
        home_fast_continue_go: 'تابع التقييم',
        home_fast_continue_close: 'إخفاء',
        home_badge_new: '{n} جديدة',
        home_badge_matches: '{n} معلّقة',
        bnav_home: 'الرئيسية',
        bnav_students: 'طلابي',
        bnav_evaluate: 'اختبار',
        bnav_homework: 'الواجبات',
        bnav_dual: 'ثنائي',
        footer_donate_note: 'منصة حمٓ خدمةٌ مجانية لتعليم القرآن. ومن أراد أن يكون له سهم في استمرارها وتطويرها فليتواصل مع مطوّر المنصة.',
        home_today_label: 'يحتاج منك اليوم',
        home_today_clear: 'لا شيء معلّق اليوم',
        why_privacy_link: 'سياسة الخصوصية ←',
        footer_about_more: 'تقييم دقيق وتقارير احترافية وواجبات منزلية، بأدوات أُعدّت لخدمة تعليم القرآن.'
    },
    en: {
        home_fast_placeholder: 'Search a student to test…',
        home_fast_in_adult: 'Test in Adults',
        home_fast_in_kids: 'Test in Kids',
        home_fast_none: 'No student with this name',
        home_fast_continue: 'Continue where you left off',
        home_fast_continue_mode_adult: 'Adults',
        home_fast_continue_mode_kids: 'Kids',
        home_soon_label: 'Coming soon',
        home_fast_continue_go: 'Continue',
        home_fast_continue_close: 'Hide',
        home_badge_new: '{n} new',
        home_badge_matches: '{n} pending',
        bnav_home: 'Home',
        bnav_students: 'Students',
        bnav_evaluate: 'Test',
        bnav_homework: 'Homework',
        bnav_dual: 'Dual',
        footer_donate_note: 'Hamm is a free service for teaching the Quran. If you would like to share in its continuity and development, please contact the platform developer.',
        home_today_label: 'Needs you today',
        home_today_clear: 'Nothing pending today',
        why_privacy_link: 'Privacy policy →',
        footer_about_more: 'Accurate evaluation, professional reports and homework, with tools built to serve Quran teaching.'
    }
};
['ar', 'en'].forEach(lang => {
    translations[lang] = translations[lang] || {};
    Object.keys(NEW_KEYS[lang]).forEach(k => { if (!(k in translations[lang])) translations[lang][k] = NEW_KEYS[lang][k]; });
});

// 🌟 [2026-10-01 — بطلب المعلم] أوصاف بطاقات الدخول الثلاث بصياغة "من صف … إلى …" (تُفرَض هنا بدل تعديل core/i18n.js
// تفادياً لتضارب الكتابة المتزامنة عليه). ⚠️ افتراض صريح: "كبار" = من الأول الإعدادي فما فوق، و"أطفال" = من التمهيدي إلى السادس
// الابتدائي (نفس KIDS_GRADES في student/student.js)، و"طلابي" = سجلات الطلاب وتقاريرهم.
// [تحديث بطلب المعلم] صياغة الكبار/الصغار صارت وصفاً لنوع الألعاب لا لنطاق الصفوف.
const OVERRIDE_KEYS = {
    ar: { card_students_desc: 'سجلات الطلاب وتقاريرهم', card_adult_desc: 'ألعاب تناسب سن الكبار لتثبيت الحفظ والمراجعة', card_kids_desc: 'ألعاب ممتعة تناسب سن الصغار لتثبيت الحفظ والمراجعة' },
    en: { card_students_desc: 'Student records and reports', card_adult_desc: 'Games suited to adults to strengthen memorization and review', card_kids_desc: 'Fun games suited to children to strengthen memorization and review' }
};
['ar', 'en'].forEach(lang => Object.assign(translations[lang], OVERRIDE_KEYS[lang]));

// ---------------------------------------------------------------------------
// 🌟 سجل "آخر تقييم" (localStorage خفيف: اسم + معرّف + وضع + وقت — لا صور ولا بيانات كبيرة)
export function recordLastEvaluation(student, kids) {
    try {
        if (!student || student.id == null) return;
        localStorage.setItem(LAST_EVAL_KEY, JSON.stringify({ id: student.id, name: student.name || '', kids: !!kids, at: Date.now() }));
    } catch (e) { /* التخزين غير متاح: الميزة اختيارية */ }
}
function readLastEvaluation() {
    try { const r = JSON.parse(localStorage.getItem(LAST_EVAL_KEY) || 'null'); return (r && r.id != null) ? r : null; } catch (e) { return null; }
}

// 🌟 [جديد] إخفاء بطاقة "تابع من حيث توقفت" بعلامة ✕: نخزّن وقت التقييم المُغلَق فقط (localStorage خفيف).
// ⚠️ افتراض صريح: الإغلاق خاص بهذا التقييم؛ أي تقييم جديد يبدأه المعلم يُظهر البطاقة من جديد.
const DISMISS_KEY = 'dh_last_evaluation_dismissed';
function readDismissedAt() { try { return localStorage.getItem(DISMISS_KEY); } catch (e) { return null; } }
function writeDismissedAt(at) { try { localStorage.setItem(DISMISS_KEY, String(at)); } catch (e) { /* التخزين غير متاح: تعود البطاقة فقط */ } }

function startEvaluation(student, kids) {
    setEvaluationMode(!!kids);
    enterStudentEvaluation(student);
}

// ---------------------------------------------------------------------------
// 🌟 عدّاد التسليمات الجديدة للواجبات (يُسجَّل مرة واحدة على مستوى الوحدة ليعدّ حتى والمعلم في شاشة أخرى)
function getHwNew() { try { return parseInt(localStorage.getItem(HW_NEW_KEY) || '0', 10) || 0; } catch (e) { return 0; } }
function setHwNew(n) { try { localStorage.setItem(HW_NEW_KEY, String(Math.max(0, n))); } catch (e) { /* */ } }
document.addEventListener('dh:new-homework-submissions', (e) => {
    const n = (e && e.detail && e.detail.submissions && e.detail.submissions.length) || 1;
    // لو شاشة الواجبات مفتوحة الآن فهو يراها فوراً: لا داعي لعدّها
    if (document.body.dataset.dhScreen !== 'settings/homework-prep.html') setHwNew(getHwNew() + n);
    renderBadges();
});
document.addEventListener('dh:screen', (e) => {
    const s = e.detail && e.detail.screen;
    if (s === 'settings/homework-prep.html') setHwNew(0);
    updateChrome();
});

function setBadge(btn, key, n) {
    if (!btn) return;
    let b = btn.querySelector('.dh-fast-badge');
    if (!n || n <= 0) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('span'); b.className = 'dh-fast-badge'; btn.appendChild(b); }
    b.setAttribute('data-n', String(n));
    b.textContent = tf(key, { n });
}
async function renderBadges() {
    const hw = document.getElementById('btn-homework-main');
    if (hw) setBadge(hw, 'home_badge_new', getHwNew());
    const dual = document.getElementById('btn-dual-main');
    if (dual && AppState.dualTestsManager) {
        try {
            const all = await AppState.dualTestsManager.getAllMatches();
            const n = (all || []).filter(m => m.status !== 'completed').length;
            if (dual.isConnected) setBadge(dual, 'home_badge_matches', n);
        } catch (e) { /* بلا شارة */ }
    }
}

// ---------------------------------------------------------------------------
// 🌟 مربع البحث + بطاقة المتابعة (تُحقن داخل عمود نص الهيرو بعد صف الترحيب)
function buildPanel() {
    const host = document.querySelector('.home-hero-text .home-greeting-row');
    if (!host || document.getElementById('dh-fast')) return null;
    const sec = document.createElement('section');
    sec.className = 'dh-fast';
    sec.id = 'dh-fast';
    sec.innerHTML = `
        <div class="dh-fast-row">
            <div class="dh-fast-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
                <input id="dh-fast-input" type="search" autocomplete="off" spellcheck="false" data-i18n-placeholder="home_fast_placeholder" placeholder="${t('home_fast_placeholder')}" aria-label="${t('home_fast_placeholder')}">
                <kbd class="dh-fast-kbd" aria-hidden="true">/</kbd>
            </div>
        </div>
        <div class="dh-fast-results" id="dh-fast-results" hidden></div>`;
    host.after(sec);
    return sec;
}

function initSearch(sec) {
    const input = sec.querySelector('#dh-fast-input');
    const list = sec.querySelector('#dh-fast-results');
    let cache = [];
    AppState.studentManager?.getAllStudents()
        .then(all => { cache = (all || []).filter(s => !s.isHidden); applyEmptyState(!all || all.length === 0); renderContinue(); if (input.value) render(); })
        .catch(() => { /* بلا بحث لو فشلت القراءة */ });

    // 🌟 [جديد — اقتراح المعلم] معلم بلا أي طالب: البحث بلا فائدة، فتحلّ بطاقة "ابدأ من هنا" محلّه في الهيرو؛ وبمجرد وجود طالب
    // يعود البحث وتعود البطاقة للعمود الجانبي (⚠️ نفس تعريف initStartHereCard: العدّ يشمل الطلاب المخفيين).
    function applyEmptyState(none) {
        const sh = document.getElementById('home-start-here');
        sec.hidden = !!none;
        if (!sh) return;
        if (none) { sh.dataset.dhInHero = '1'; sh.classList.add('dh-fast-start-hero'); sec.after(sh); }
    }

    function render() {
        const q = input.value;
        list.innerHTML = '';
        if (!normName(q)) { list.hidden = true; return; }
        const found = rankStudentMatches(cache, q).slice(0, 6);
        if (!found.length) {
            const d = document.createElement('div');
            d.className = 'dh-fast-empty';
            d.textContent = t('home_fast_none');
            list.appendChild(d);
        }
        found.forEach(st => {
            const row = document.createElement('div');
            row.className = 'dh-fast-item';
            const name = document.createElement('span');
            name.className = 'dh-fast-name';
            name.textContent = st.name;
            const mk = (kids) => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'dh-fast-go ' + (kids ? 'is-kids' : 'is-adult');
                b.textContent = t(kids ? 'home_fast_in_kids' : 'home_fast_in_adult');
                b.addEventListener('click', () => startEvaluation(st, kids));
                return b;
            };
            row.append(name, mk(false), mk(true));
            list.appendChild(row);
        });
        list.hidden = false;
    }
    input.addEventListener('input', render);
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { input.value = ''; render(); input.blur(); } });

    // اختصار "/" لتركيز البحث (لا يعمل أثناء الكتابة في أي حقل)
    const onKey = (e) => {
        if (!input.isConnected) { document.removeEventListener('keydown', onKey); return; }
        const tag = (e.target && e.target.tagName) || '';
        if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(tag) && !(e.target && e.target.isContentEditable)) { e.preventDefault(); input.focus(); }
    };
    document.addEventListener('keydown', onKey);

    function renderContinue() {
        const btn = document.getElementById('dh-fast-continue');
        if (!btn) return;
        const last = readLastEvaluation();
        const st = last && cache.find(s => s.id === last.id);
        if (!st) { btn.hidden = true; return; }
        // 🌟 [جديد] لو أغلق المعلم البطاقة (✕) لهذا التقييم بعينه فلا تظهر ثانيةً حتى يبدأ تقييماً جديداً (يتغيّر last.at)
        const xBtn = document.getElementById('dh-fast-continue-x');
        if (readDismissedAt() === String(last.at)) { btn.hidden = true; if (xBtn) xBtn.hidden = true; return; }
        // 🌟 [إصلاح] النصوص صارت بسمة data-i18n بدل t() لمرة واحدة، فتتبدّل مع زر اللغة عبر applyLanguage (كانت تبقى عربية)
        const modeKey = last.kids ? 'home_fast_continue_mode_kids' : 'home_fast_continue_mode_adult';
        const k = btn.querySelector('.dh-fast-continue-k');
        k.setAttribute('data-i18n', 'home_fast_continue');
        k.textContent = t('home_fast_continue');
        const v = btn.querySelector('.dh-fast-continue-v');
        v.textContent = st.name + ' ';
        const m = document.createElement('span'); m.className = 'dh-fast-continue-m'; m.append('· ');
        const mi = document.createElement('span'); mi.setAttribute('data-i18n', modeKey); mi.textContent = t(modeKey);
        m.appendChild(mi);
        v.appendChild(m);
        btn.onclick = () => startEvaluation(st, last.kids);
        btn.hidden = false;
        if (xBtn) {
            xBtn.hidden = false;
            xBtn.onclick = () => { writeDismissedAt(last.at); btn.hidden = true; xBtn.hidden = true; };
        }
    }
    return { focus: () => { input.focus(); input.scrollIntoView({ block: 'center', behavior: 'smooth' }); } };
}

// 🌟 [جديد — تنفيذ تصميم المعاينة] إعادة ترتيب بنية الشاشة الرئيسية بنقل العناصر القائمة (بنفس الـid والمستمعين، لا نسخ):
//   - خانة #home-quickcard-slot داخل .home-menu تستقبل بطاقة "نظرة سريعة" على سطح المكتب (عمود جانبي) — راجع arrangeHomeForMobile
//   - بطاقة "تابع من حيث توقفت" تُبنى هنا أعلى الأزرار
//   - زر اللغة ينتقل إلى صف الترحيب (الترويسة العليا مخفية في الرئيسية)
//   - عنوان "قريباً" داخل صف المتشابهات/التجويد ليصيرا شريطاً واحداً
function buildLayout() {
    const menu = document.querySelector('.home-menu');
    if (!menu || document.getElementById('home-quickcard-slot')) return;
    const slot = document.createElement('aside');
    slot.id = 'home-quickcard-slot';
    slot.className = 'dh-fast-slot';
    menu.appendChild(slot);

    // بطاقة "ابدأ من هنا" (للمعلم الجديد بلا طلاب): على سطح المكتب تُوضع في العمود الجانبي فوق "نظرة سريعة" بعيداً عن الأزرار،
    // وعلى الهاتف تعود لأعلى قسم الأزرار. ما زال الـid ومستمع initStartHereCard كما هما (نقل العنصر لا نسخه)
    const startHere = document.getElementById('home-start-here');
    if (startHere && window.matchMedia) {
        const mq = window.matchMedia('(max-width: 768px)');
        const place = () => {
            if (!startHere.isConnected || startHere.dataset.dhInHero) return;   // في الهيرو (معلم بلا طلاب): لا تُنقل
            if (mq.matches) menu.prepend(startHere); else slot.prepend(startHere);
        };
        place();
        if (mq.addEventListener) mq.addEventListener('change', place);
    }

    const cont = document.createElement('div');
    cont.className = 'dh-fast-continue-wrap';
    cont.innerHTML = `
        <button type="button" class="dh-fast-continue" id="dh-fast-continue" hidden>
            <span class="dh-fast-continue-ic" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4l14 8-14 8Z"/></svg></span>
            <span class="dh-fast-continue-txt"><span class="dh-fast-continue-k"></span><span class="dh-fast-continue-v"></span></span>
            <span class="dh-fast-continue-go" data-i18n="home_fast_continue_go">${t('home_fast_continue_go')}</span>
        </button>
        <button type="button" class="dh-fast-continue-x" id="dh-fast-continue-x" hidden data-i18n-title="home_fast_continue_close" title="${t('home_fast_continue_close')}" aria-label="${t('home_fast_continue_close')}">✕</button>`;
    const first = menu.querySelector('.home-menu-main');
    if (first) first.before(cont); else menu.prepend(cont);

    const row = document.querySelector('.home-hero-text .home-greeting-row');
    if (row && !document.getElementById('dh-fast-lang')) {
        const b = document.createElement('button');
        b.type = 'button'; b.id = 'dh-fast-lang'; b.className = 'dh-fast-lang';
        b.setAttribute('data-i18n', 'lang_toggle'); b.textContent = t('lang_toggle');
        b.addEventListener('click', () => document.getElementById('lang-toggle-btn')?.click());
        row.appendChild(b);
    }

    const later = document.querySelector('.home-menu-later');
    if (later && !document.getElementById('dh-fast-soon')) {
        const lab = document.createElement('div');
        lab.id = 'dh-fast-soon'; lab.className = 'dh-fast-soon';
        lab.setAttribute('data-i18n', 'home_soon_label'); lab.textContent = t('home_soon_label');
        later.prepend(lab);
    }
}

// ---------------------------------------------------------------------------
// 🌟 الشريط السفلي (هاتف) + سلوك الترويسة
let bnav = null;
function goHome() { switchTheme('adult'); document.body.style.backgroundImage = ''; return loadSplashScreen(); }
function goStudents() { switchTheme('adult'); document.body.style.backgroundImage = ''; return loadMyStudentsScreen(); }
let pendingFocus = false;
let searchApi = null;
async function goEvaluate() {
    if (document.body.dataset.dhScreen === HOME_SCREEN && searchApi) { searchApi.focus(); return; }
    pendingFocus = true;
    await goHome();
}
const ITEMS = [
    { id: 'home', key: 'bnav_home', screens: [HOME_SCREEN], run: goHome, icon: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6.5 10v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-9"/>' },
    { id: 'students', key: 'bnav_students', screens: ['student/my-students.html', 'student/all-students.html', 'student/student-profile.html'], run: goStudents, icon: '<circle cx="9" cy="7" r="3.2"/><path d="M2.5 20c1-4 3.6-6 6.5-6s5.5 2 6.5 6"/><circle cx="17.5" cy="8" r="2.6"/>' },
    { id: 'evaluate', key: 'bnav_evaluate', screens: [], run: goEvaluate, icon: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', center: true },
    { id: 'homework', key: 'bnav_homework', screens: ['settings/homework-prep.html'], run: () => openHomeworkPrep(), badge: () => getHwNew(), icon: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>' },
    { id: 'dual', key: 'bnav_dual', screens: ['dualtests/dual-test-setup.html'], run: () => openDualTestSetup(), icon: '<path d="M5 5l6 6M19 5l-6 6M5 19l6-6M19 19l-6-6"/>' }
];
function ensureBnav() {
    if (bnav && bnav.isConnected) return;
    bnav = document.createElement('nav');
    bnav.id = 'dh-bnav';
    bnav.className = 'dh-bnav';
    bnav.hidden = true;
    ITEMS.forEach(it => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'dh-bnav-item' + (it.center ? ' is-center' : '');
        b.dataset.id = it.id;
        b.innerHTML = `<span class="dh-bnav-ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${it.icon}</svg></span><span class="dh-bnav-lb" data-i18n="${it.key}">${t(it.key)}</span>`;
        b.addEventListener('click', () => { if (it.id === 'homework') setHwNew(0); it.run(); });
        bnav.appendChild(b);
    });
    document.body.appendChild(bnav);
}
function updateChrome() {
    const scr = document.body.dataset.dhScreen || '';
    const core = CORE_SCREENS.includes(scr);
    document.body.classList.toggle('dh-core-screen', core);
    document.body.classList.toggle('dh-home-screen', scr === HOME_SCREEN);
    document.body.classList.remove('dh-header-hidden');
    if (!bnav) return;
    bnav.hidden = !core;
    bnav.querySelectorAll('.dh-bnav-item').forEach(b => {
        const it = ITEMS.find(x => x.id === b.dataset.id);
        b.classList.toggle('is-active', !!it && it.screens.includes(scr));
    });
}
// ترويسة تنزلق للأعلى عند التمرير للأسفل وتعود عند التمرير للأعلى (الشاشات الأساسية غير الرئيسية فقط)
function initHeaderAutoHide() {
    let lastY = window.scrollY || 0;
    window.addEventListener('scroll', () => {
        const y = window.scrollY || 0;
        if (document.body.classList.contains('dh-core-screen') && !document.body.classList.contains('dh-home-screen')) {
            if (y > lastY + 6 && y > 90) document.body.classList.add('dh-header-hidden');
            else if (y < lastY - 6 || y <= 90) document.body.classList.remove('dh-header-hidden');
        }
        lastY = y;
    }, { passive: true });
}

// ---------------------------------------------------------------------------
// 🌟 اختصارات PWA (?go=...) — تُستهلك مرة واحدة ثم يُنظَّف الرابط
let goConsumed = false;
function consumeGoParam() {
    if (goConsumed) return;
    goConsumed = true;
    let go = null;
    try { go = new URLSearchParams(window.location.search).get('go'); } catch (e) { return; }
    if (!go) return;
    try { const u = new URL(window.location.href); u.searchParams.delete('go'); history.replaceState(null, '', u.pathname + (u.search || '') + u.hash); } catch (e) { /* */ }
    if (go === 'students') goStudents();
    else if (go === 'homework') openHomeworkPrep();
    else if (go === 'dual') openDualTestSetup();
    else if (go === 'evaluate') setTimeout(() => searchApi && searchApi.focus(), 150);
}

// ---------------------------------------------------------------------------
let chromeReady = false;
export function initHomeFast() {
    if (!chromeReady) { chromeReady = true; ensureBnav(); initHeaderAutoHide(); }
    updateChrome();
    buildLayout();
    const sec = buildPanel();
    if (sec) searchApi = initSearch(sec);
    renderBadges();
    applyLanguage();
    if (pendingFocus) { pendingFocus = false; setTimeout(() => searchApi && searchApi.focus(), 120); }
    consumeGoParam();
}
