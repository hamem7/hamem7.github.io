// components/homeFast.js
// 🌟🌟 [جديد 2026-10-01 — "الدخول السريع" بطلب المعلم، تنفيذ نموذج المعاينة] كل منطق تسريع الشاشة الرئيسية في ملف واحد
// مستقل حتى لا يتضخم core/app.js:
//   1) مربع بحث عن طالب → لكل نتيجة زرّان: "اختبار في الكبار" / "اختبار في الأطفال" (بلا أي تصنيف بجوار الاسم، لأن
//      المعلم يختبر الطالب نفسه أحياناً في هذه الواجهة وأحياناً في تلك).
//   2) [حُذفت 2026-10-03 بطلب المعلم] بطاقة "تابع من حيث توقفت" — كانت تظهر حتى بعد إتمام الاختبار فلا فائدة منها؛
//      استكمال الاختبار غير المكتمل تتولاه بطاقة "اختبار غير مكتمل" في enterStudentEvaluation (student/student.js).
//   3) شارات على أزرار الواجبات والاختبارات الثنائية + شريط "قريباً" للميزات قيد التطوير + زر لغة (الترويسة مخفية بالرئيسية).
//   4) على الهاتف: شريط تنقّل سفلي (الرئيسية · الألعاب · الكبار · الصغار · طلابي · المزيد) مع لوحتين سفليتين للألعاب والمزيد، في الشاشات الأساسية فقط.
//      والترويسة تختفي بالتمرير للأسفل في الشاشات الداخلية الأساسية.
//   5) اختصارات PWA: ‎index.html?go=students|homework|dual|evaluate‎ (راجع manifest.json).
// ⚠️ افتراضات صريحة:
//   - شارة الواجبات = عدد التسليمات الجديدة التي وصلت (حدث dh:new-homework-submissions) منذ آخر دخول لشاشة الواجبات.
//     دقتها محدودة بالأوقات التي تكون فيها المنصة مفتوحة (لا خادم يخبرنا بما فات وهي مغلقة).
//   - شارة الاختبارات الثنائية = عدد المواجهات غير المكتملة (status !== 'completed').
//   - الشاشات "الأساسية" (القائمة المسموحة للشريط السفلي والترويسة المنزلقة) محددة في CORE_SCREENS أدناه؛ شاشات الألعاب
//     والاختبارات تُترك كما هي تماماً حتى لا يتداخل الشريط مع أزرارها.
// كل التنسيق في css/homeFast.css بأسماء dh-fast-* و dh-bnav-* الجديدة فقط (لا تعديل على أي قاعدة قائمة). 🌟🌟

import { translations, t, tf, applyLanguage } from '../core/i18n.js';
import { AppState, setEvaluationMode, openHomeworkPrep, openDualTestSetup, openSimilaritiesBrowser, openTajweedSection, loadSplashScreen, loadLoginScreen } from '../core/app.js';
import { switchTheme } from '../core/navigation.js';
import { loadMyStudentsScreen, loadAllStudentsScreen, enterStudentEvaluation, rankStudentMatches, normName } from '../student/student.js';

const HOME_SCREEN = 'components/splash.html';
// الشاشات الأساسية: يظهر فيها الشريط السفلي (هاتف) وتنزلق ترويستها
// 🌟 [2026-10-02] أُضيفت student/login.html (شاشة اختيار الطالب لركني الكبار/الأطفال) ليبقى الشريط ظاهراً عند الدخول للأركان
const LOGIN_SCREEN = 'student/login.html';
// 🌟 [2026-10-03 — مراجعة تجربة الهاتف] أُضيفت شاشتا تصفّح المتشابهات والتجويد (ألعاب) ليبقى الشريط متاحاً فيهما؛ شاشات اللعب الفعلي تبقى بلا شريط
const SIM_SCREEN = 'similarities/similarities-home.html';
const TAJWEED_SCREEN = 'tajweed/tajweed-map.html';
const CORE_SCREENS = [HOME_SCREEN, 'student/my-students.html', 'student/all-students.html', 'student/student-profile.html', 'settings/homework-prep.html', 'dualtests/dual-test-setup.html', LOGIN_SCREEN, SIM_SCREEN, TAJWEED_SCREEN];

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
        home_soon_label: 'قريبًا',
        home_badge_new: '{n} جديدة',
        home_badge_matches: '{n} معلّقة',
        bnav_home: 'الرئيسية',
        bnav_students: 'طلابي',
        bnav_evaluate: 'اختبار',
        bnav_adult: 'الكبار',
        bnav_kids: 'الأطفال',
        bnav_homework: 'الواجبات',
        bnav_dual: 'ثنائي',
        bnav_more: 'المزيد',
        bnav_tasks: 'مهام',
        sheet_tasks_title: 'مهام اليوم',
        bnav_kids_short: 'الصغار',
        sheet_more_title: 'المزيد',
        sheet_close: 'إغلاق',
        sheet_sim_title: 'تحدي المتشابهات',
        sheet_tajweed_title: 'أبطال التجويد',
        sheet_soon_tag: 'قيد التطوير',
        sheet_homework: 'الواجبات المنزلية',
        sheet_dual: 'الاختبارات الثنائية',
        sheet_reports: 'تقارير الشهر',
        sheet_all_students: 'سجل الطلاب العام',
        sheet_memo_bulk: 'الحفظ الشهري',
        sheet_profile: 'بياناتي والنسخ الاحتياطي',
        sheet_privacy: 'سياسة الخصوصية',
        sheet_contact: 'تواصل معنا',
        home_sec_games: 'الألعاب والأركان',
        home_sec_tools: 'أدوات المعلم',
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
        home_soon_label: 'Coming soon',
        home_badge_new: '{n} new',
        home_badge_matches: '{n} pending',
        bnav_home: 'Home',
        bnav_students: 'Students',
        bnav_evaluate: 'Test',
        bnav_adult: 'Adults',
        bnav_kids: 'Kids',
        bnav_homework: 'Homework',
        bnav_dual: 'Dual',
        bnav_more: 'More',
        bnav_tasks: 'Tasks',
        sheet_tasks_title: "Today's tasks",
        bnav_kids_short: 'Kids',
        sheet_more_title: 'More',
        sheet_close: 'Close',
        sheet_sim_title: 'Similar Verses Challenge',
        sheet_tajweed_title: 'Tajweed Heroes',
        sheet_soon_tag: 'In development',
        sheet_homework: 'Homework',
        sheet_dual: 'Dual Tests',
        sheet_reports: 'Monthly reports',
        sheet_all_students: 'All students record',
        sheet_memo_bulk: 'Monthly memorization',
        sheet_profile: 'My profile & backup',
        sheet_privacy: 'Privacy policy',
        sheet_contact: 'Contact us',
        home_sec_games: 'Games & corners',
        home_sec_tools: 'Teacher tools',
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
        .then(all => { cache = (all || []).filter(s => !s.isHidden); applyEmptyState(!all || all.length === 0); if (input.value) render(); })
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

    return { focus: () => { input.focus(); input.scrollIntoView({ block: 'center', behavior: 'smooth' }); } };
}

// 🌟 [جديد — تنفيذ تصميم المعاينة] إعادة ترتيب بنية الشاشة الرئيسية بنقل العناصر القائمة (بنفس الـid والمستمعين، لا نسخ):
//   - خانة #home-quickcard-slot داخل .home-menu تستقبل بطاقة "نظرة سريعة" على سطح المكتب (عمود جانبي) — راجع arrangeHomeForMobile
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

    const row = document.querySelector('.home-hero-text .home-greeting-row');
    if (row && !document.getElementById('dh-fast-lang')) {
        const b = document.createElement('button');
        b.type = 'button'; b.id = 'dh-fast-lang'; b.className = 'dh-fast-lang';
        b.setAttribute('data-i18n', 'lang_toggle'); b.textContent = t('lang_toggle');
        b.addEventListener('click', () => document.getElementById('lang-toggle-btn')?.click());
        row.appendChild(b);
    }

    // 🌟 [2026-10-03 — مراجعة تجربة الهاتف] عنوانا قسمين قصيران (يظهران على الهاتف فقط — راجع css/mobile.css): "الألعاب والأركان"
    // فوق الكبار/الصغار/طلابي و"أدوات المعلم" فوق الواجبات/الثنائية، حتى يُقرأ ترتيب الأولوية من أول نظرة بلا تمرير
    const addSec = (before, id, key) => {
        if (!before || document.getElementById(id)) return;
        const h = document.createElement('h2');
        h.id = id; h.className = 'dh-home-sec';
        h.setAttribute('data-i18n', key); h.textContent = t(key);
        before.before(h);
    };
    addSec(menu.querySelector('.home-menu-main'), 'dh-sec-games', 'home_sec_games');
    addSec(menu.querySelector('.home-menu-two'), 'dh-sec-tools', 'home_sec_tools');

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
let searchApi = null;
// 🌟 [إعادة هيكلة 2026-10-03 — مراجعة تجربة الهاتف بطلب المعلم] الشريط السفلي بحسب أولوية المعلم:
//   الرئيسية · الكبار · الصغار · طلابي · مهام · المزيد
//   - «مهام» (بطلب المعلم بدل «الألعاب» التي كانت تكرر زرّي الكبار/الصغار): لوحة سفلية تعرض بطاقة «نظرة سريعة» نفسها (نفس العنصر
//     #home-quickcard ينتقل إليها ثم يعود، بنفس البيانات والمستمعين — components/homeQuickview.js بلا تغيير في الحساب)، وعلى الزر رقم
//     المهام المعلّقة (عيد ميلاد طالب + مراجعات مستحقة + مواجهات معلّقة) من حدث dh:tasks-count. البطاقة تُبنى في الرئيسية، فلو ضُغط
//     الزر من شاشة أخرى نفتح الرئيسية أولًا ثم اللوحة. الرقم يُحفظ (localStorage) ليظهر في كل الشاشات حتى تُفتح الرئيسية مجددًا.
//   - «المزيد»: الوظائف الثانوية + تحدي المتشابهات وأبطال التجويد (كانا في لوحة الألعاب). كل عنصر يستدعي نفس دالة زرّه الأصلي.
//   when: شرط تمييز العنصر الحالي لشاشة مشتركة (login.html يخدم الركنين معاً، ويُميَّز الركن الحالي بحسب AppState.isKidsMode).
function goAdult() { setEvaluationMode(false); return loadLoginScreen(); }
function goKids() { setEvaluationMode(true); return loadLoginScreen(); }
const IC = {
    home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6.5 10v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-9"/>',
    tasks: '<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M8 9l1.6 1.6L12.5 7.7M8 15l1.6 1.6 2.9-2.9M14.5 9.5H17M14.5 15.5H17"/>',
    adult: '<path d="M2 9l10-5 10 5-10 5-10-5Z"/><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5"/>',
    kids: '<circle cx="12" cy="8" r="4"/><path d="M4 20c1.4-4.4 4.4-6.5 8-6.5s6.6 2.1 8 6.5"/>',
    students: '<circle cx="9" cy="7" r="3.2"/><path d="M2.5 20c1-4 3.6-6 6.5-6s5.5 2 6.5 6"/><circle cx="17.5" cy="8" r="2.6"/>',
    more: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
    sim: '<path d="M4 5h7v14H4zM13 5h7v14h-7z"/><path d="M7 9h1M16 9h1"/>',
    tajweed: '<path d="M12 3v18M5 8c2 0 3-1 3-3M19 8c-2 0-3-1-3-3M5 16c2 0 3 1 3 3M19 16c-2 0-3 1-3 3"/>',
    homework: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    dual: '<path d="M5 5l6 6M19 5l-6 6M5 19l6-6M19 19l-6-6"/>',
    reports: '<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2.5v3M16 2.5v3M4 9.5h16M8 14h3M8 17h6"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/>',
    memo: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h5"/>',
    profile: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.2-3.6 3.8-5.5 7-5.5s5.8 1.9 7 5.5"/><path d="M18.5 4.5l1 1"/>',
    lang: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/>',
    privacy: '<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6Z"/>',
    contact: '<path d="M4 5h16v11H8l-4 4Z"/>'
};
const ITEMS = [
    { id: 'home', key: 'bnav_home', screens: [HOME_SCREEN], run: goHome, icon: IC.home },
    { id: 'adult', key: 'bnav_adult', screens: [LOGIN_SCREEN], when: () => !AppState.isKidsMode, run: goAdult, icon: IC.adult },
    { id: 'kids', key: 'bnav_kids_short', screens: [LOGIN_SCREEN], when: () => !!AppState.isKidsMode, run: goKids, icon: IC.kids },
    { id: 'students', key: 'bnav_students', screens: ['student/my-students.html', 'student/all-students.html', 'student/student-profile.html'], run: goStudents, icon: IC.students },
    { id: 'tasks', key: 'bnav_tasks', screens: [], run: openTasks, icon: IC.tasks },
    { id: 'more', key: 'bnav_more', screens: ['settings/homework-prep.html', 'dualtests/dual-test-setup.html', SIM_SCREEN, TAJWEED_SCREEN], run: () => openSheet('more'), icon: IC.more }
];

// ---------------------------------------------------------------------------
// 🌟 اللوحتان السفليتان (Bottom Sheets): عنصر واحد يُعاد ملؤه. لا تخزين ولا حالة؛ كل عنصر يستدعي دالة موجودة أصلاً.
function openReportsHub() { return import('../components/monthlyReportsHub.js').then(m => m.openMonthlyReportsHub()).catch(err => console.error('تعذر فتح مركز التقارير الشهرية:', err)); }
function openMemoBulk() { return import('../components/monthlyMemorizationBulkScreen.js').then(m => m.openMonthlyMemorizationBulkScreen()).catch(err => console.error('تعذر فتح شاشة الحفظ الشهري:', err)); }
async function openProfile() {
    if (document.body.dataset.dhScreen !== HOME_SCREEN) await goHome();
    document.getElementById('teacher-profile-edit-btn')?.click();
}
function sheetItems(kind) {
    return [
        { key: 'sheet_homework', icon: IC.homework, run: openHomeworkPrep, badge: () => getHwNew() },
        { key: 'sheet_dual', icon: IC.dual, run: openDualTestSetup },
        { key: 'sheet_reports', icon: IC.reports, run: openReportsHub },
        { key: 'sheet_all_students', icon: IC.table, run: () => { switchTheme('adult'); document.body.style.backgroundImage = ''; return loadAllStudentsScreen(); } },
        { key: 'sheet_memo_bulk', icon: IC.memo, run: openMemoBulk },
        { key: 'sheet_sim_title', tag: 'sheet_soon_tag', icon: IC.sim, run: openSimilaritiesBrowser },
        { key: 'sheet_tajweed_title', tag: 'sheet_soon_tag', icon: IC.tajweed, run: openTajweedSection },
        { key: 'sheet_profile', icon: IC.profile, run: openProfile },
        { key: 'lang_toggle', icon: IC.lang, run: () => document.getElementById('lang-toggle-btn')?.click(), keep: true },
        { key: 'sheet_privacy', icon: IC.privacy, href: 'privacy.html' },
        { key: 'sheet_contact', icon: IC.contact, href: 'https://wa.me/201027814948' }
    ];
}
let sheet = null;
let sheetReturnFocus = null;
function ensureSheet() {
    if (sheet && sheet.isConnected) return sheet;
    sheet = document.createElement('div');
    sheet.className = 'dh-sheet';
    sheet.id = 'dh-sheet';
    sheet.hidden = true;
    sheet.innerHTML = `
        <div class="dh-sheet-backdrop" data-close="1"></div>
        <div class="dh-sheet-panel" role="dialog" aria-modal="true" aria-labelledby="dh-sheet-title">
            <div class="dh-sheet-head">
                <span class="dh-sheet-grip" aria-hidden="true"></span>
                <h2 class="dh-sheet-title" id="dh-sheet-title"></h2>
                <button type="button" class="dh-sheet-x" data-close="1" data-i18n-title="sheet_close" title="${t('sheet_close')}" aria-label="${t('sheet_close')}">✕</button>
            </div>
            <div class="dh-sheet-grid"></div>
        </div>`;
    sheet.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSheet(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheet && !sheet.hidden) closeSheet(); });
    document.body.appendChild(sheet);
    return sheet;
}
// «مهام»: بطاقة #home-quickcard نفسها تنتقل إلى اللوحة ثم تعود لمكانها في الرئيسية عند الإغلاق (هاتف: .home-quick-mobile، وإلا
// خانة سطح المكتب). لو تغيّرت الشاشة واللوحة مفتوحة تُترك البطاقة القديمة لتُحذف مع اللوحة (الرئيسية الجديدة تبني بطاقتها).
function returnTasksCard() {
    const card = sheet && sheet.querySelector('#home-quickcard');
    if (!card) return;
    const home = document.querySelector('.home-quick-mobile') || document.getElementById('home-quickcard-slot');
    if (home && document.body.dataset.dhScreen === HOME_SCREEN) home.appendChild(card); else card.remove();
}
function closeSheet() {
    if (!sheet || sheet.hidden) return;
    returnTasksCard();
    sheet.hidden = true;
    document.body.classList.remove('dh-sheet-open');
    bnav?.querySelectorAll('.dh-bnav-item').forEach(b => b.classList.remove('is-open'));
    if (sheetReturnFocus && sheetReturnFocus.isConnected) sheetReturnFocus.focus({ preventScroll: true });
}
function openSheet(kind) {
    const el = ensureSheet();
    if (!el.hidden && el.dataset.kind === kind) { closeSheet(); return; }
    sheetReturnFocus = document.activeElement;
    el.dataset.kind = kind;
    const title = el.querySelector('.dh-sheet-title');
    const titleKey = kind === 'tasks' ? 'sheet_tasks_title' : 'sheet_more_title';
    title.setAttribute('data-i18n', titleKey);
    title.textContent = t(titleKey);
    const grid = el.querySelector('.dh-sheet-grid');
    grid.className = 'dh-sheet-grid is-' + kind;
    returnTasksCard();
    grid.innerHTML = '';
    if (kind === 'tasks') {
        const card = document.getElementById('home-quickcard');
        if (card) grid.appendChild(card);
    } else sheetItems(kind).forEach(it => {
        const b = document.createElement(it.href ? 'a' : 'button');
        if (it.href) { b.href = it.href; b.target = '_blank'; b.rel = 'noopener noreferrer'; } else { b.type = 'button'; }
        b.className = 'dh-sheet-item';
        b.innerHTML = `<span class="dh-sheet-ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${it.icon}</svg></span>`;
        const txt = document.createElement('span');
        txt.className = 'dh-sheet-txt';
        const lb = document.createElement('span');
        lb.className = 'dh-sheet-lb'; lb.setAttribute('data-i18n', it.key); lb.textContent = t(it.key);
        txt.appendChild(lb);
        if (it.desc) { const d = document.createElement('span'); d.className = 'dh-sheet-desc'; d.setAttribute('data-i18n', it.desc); d.textContent = t(it.desc); txt.appendChild(d); }
        if (it.tag) { const g = document.createElement('span'); g.className = 'dh-sheet-tag'; g.setAttribute('data-i18n', it.tag); g.textContent = t(it.tag); txt.appendChild(g); }
        b.appendChild(txt);
        const n = it.badge ? it.badge() : 0;
        if (n > 0) { const c = document.createElement('span'); c.className = 'dh-sheet-badge'; c.textContent = String(n); b.appendChild(c); }
        b.addEventListener('click', () => {
            if (it.keep) { it.run(); return; }     // تبديل اللغة: تبقى اللوحة مفتوحة بنصوصها الجديدة
            closeSheet();
            if (it.run) it.run();
        });
        grid.appendChild(b);
    });
    el.hidden = false;
    document.body.classList.add('dh-sheet-open');
    bnav?.querySelectorAll('.dh-bnav-item').forEach(b => b.classList.toggle('is-open', b.dataset.id === kind));
    el.querySelector('.dh-sheet-x')?.focus({ preventScroll: true });
}

async function openTasks() {
    if (document.body.dataset.dhScreen !== HOME_SCREEN) await goHome();
    openSheet('tasks');
}
// رقم المهام المعلّقة على زر «مهام» (يُحدَّث عند كل فتح للرئيسية؛ يُحفظ ليبقى ظاهرًا في الشاشات الأخرى)
const TASKS_COUNT_KEY = 'dh_tasks_count';
function readTasksCount() { try { return parseInt(localStorage.getItem(TASKS_COUNT_KEY) || '0', 10) || 0; } catch (e) { return 0; } }
function renderTasksBadge() {
    const btn = bnav && bnav.querySelector('.dh-bnav-item[data-id="tasks"] .dh-bnav-ic');
    if (!btn) return;
    const n = readTasksCount();
    let b = btn.querySelector('.dh-bnav-badge');
    if (n <= 0) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('span'); b.className = 'dh-bnav-badge'; btn.appendChild(b); }
    b.textContent = n > 9 ? '9+' : String(n);
}
document.addEventListener('dh:tasks-count', (e) => {
    try { localStorage.setItem(TASKS_COUNT_KEY, String((e.detail && e.detail.n) || 0)); } catch (err) { /* التخزين غير متاح: يبقى الرقم لهذه الجلسة فقط */ }
    renderTasksBadge();
});

function ensureBnav() {
    if (bnav && bnav.isConnected) return;
    bnav = document.createElement('nav');
    bnav.id = 'dh-bnav';
    bnav.className = 'dh-bnav';
    bnav.hidden = true;
    ITEMS.forEach(it => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'dh-bnav-item';
        b.dataset.id = it.id;
        b.innerHTML = `<span class="dh-bnav-ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${it.icon}</svg></span><span class="dh-bnav-lb" data-i18n="${it.key}">${t(it.key)}</span>`;
        b.addEventListener('click', () => {
            if (it.id !== 'tasks' && it.id !== 'more') closeSheet();
            it.run();
        });
        bnav.appendChild(b);
    });
    document.body.appendChild(bnav);
    renderTasksBadge();
}
function updateChrome() {
    const scr = document.body.dataset.dhScreen || '';
    const core = CORE_SCREENS.includes(scr);
    document.body.classList.toggle('dh-core-screen', core);
    document.body.classList.toggle('dh-home-screen', scr === HOME_SCREEN);
    document.body.classList.remove('dh-header-hidden');
    closeSheet();
    if (!bnav) return;
    bnav.hidden = !core;
    bnav.querySelectorAll('.dh-bnav-item').forEach(b => {
        const it = ITEMS.find(x => x.id === b.dataset.id);
        b.classList.toggle('is-active', !!it && it.screens.includes(scr) && (!it.when || it.when()));
    });
}

// ترويسة تنزلق للأعلى عند التمرير للأسفل وتعود عند التمرير للأعلى (الشاشات الأساسية غير الرئيسية فقط)
// 🌟 [2026-10-03] لوحة المفاتيح على الهاتف: عند التركيز على حقل داخل نافذة منبثقة أو لوحة سفلية نُبقيه في منتصف الجزء الظاهر
// (المتصفح لا يمرّر محتوى النوافذ الثابتة position:fixed تلقائياً فيختفي الحقل خلف لوحة المفاتيح)
function initKeyboardFocusFix() {
    const mq = window.matchMedia ? window.matchMedia('(max-width: 768px)') : null;
    document.addEventListener('focusin', (e) => {
        const el = e.target;
        if (!mq || !mq.matches || !el || !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
        if (!el.closest('.modal-content, .whats-new-modal-box, .teacher-profile-modal-box, .dh-sheet-panel, .mrh-card')) return;
        setTimeout(() => { if (document.activeElement === el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 320);
    });
}
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
    if (!chromeReady) { chromeReady = true; ensureBnav(); initHeaderAutoHide(); initKeyboardFocusFix(); }
    updateChrome();
    buildLayout();
    const sec = buildPanel();
    if (sec) searchApi = initSearch(sec);
    renderBadges();
    applyLanguage();
    consumeGoParam();
}
