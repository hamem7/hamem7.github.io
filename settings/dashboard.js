// settings/dashboard.js
import { starsSuffix } from '../core/goldStars.js';
import { AppState, loadLoginScreen, t, tf, surahNameLocal } from '../core/app.js';
import { resolveRange, monthlyStaleness } from '../engine/trackingEngine.js';
import { juzBounds, ayahIndex } from '../engine/reviewParts.js';
import { attachJuzAmmaCoverageNote, attachKidsRangeCoverageNote } from '../components/juzAmmaCoverageNote.js';
import { openAdultGameScreen } from '../games/adultGame.js'; 
import { openKidsGameScreen } from '../games/kidsGame.js';   

// نطاق ركن الأطفال: من أول الأحقاف (الجزء 26) إلى الناس
const KIDS_MIN_SURAH = 46;
const KIDS_MIN_JUZ = 26;

export function populateDashboardData() {
    studentRange = null;
    try { adultScope = localStorage.getItem('dh_adult_scope') === 'student' ? 'student' : 'all'; } catch (e) { adultScope = 'all'; }
    // 🌟 [إصلاح فحص الأزرار] عرض اسم الطالب في شريحة اللوحة (كانت فارغة بمعرّف مكرر) 🌟
    const _chip = document.getElementById('dash-student-chip');
    if (_chip) _chip.textContent = AppState.currentStudent ? `🏅 ${AppState.currentStudent.name}${starsSuffix(AppState.currentStudent)}` : '';

    const headerTitle = document.getElementById('header-title');
    
    if (AppState.isKidsMode) { 
        if (headerTitle) headerTitle.innerText = t('header_title_kids'); 
        // 🌟 [جديد] الصغار لهم نفس أنواع النطاق عند الكبار (سورة محددة / عدة سور / بالأجزاء) لكن ضمن
        // نطاق ركن الأطفال فقط (السور 46–114 والأجزاء 26–30)؛ «عدة سور» تعرض لوحة kids-settings القديمة
        document.getElementById('eval-radios').style.display = 'flex';
        document.getElementById('dash-title').innerText = t('dash_kids_play_title');
        toggleEvalType();
    } else { 
        document.getElementById('eval-radios').style.display = 'flex';
        document.getElementById('kids-settings').style.display = 'none';
        document.getElementById('dash-title').innerText = t('dash_title');
        toggleEvalType(); 
    }

    buildScopeSelectors();

    const kFrom = document.getElementById('kids-from-surah'); 
    const kTo = document.getElementById('kids-to-surah');
    
    if (kFrom && kTo) {
        kFrom.innerHTML = ''; 
        kTo.innerHTML = '';
        
        // 🌟 [تعديل] نطاق ركن الأطفال صار من الجزء 26 (أول سورة الأحقاف = 46) حتى الجزء 30 (الناس = 114)،
        // بعد أن كان محصورًا في جزأي تبارك وعمّ فقط (من 67). الأجزاء: 26 الأحقاف، 27 الذاريات، 28 المجادلة،
        // 29 تبارك، 30 عمّ. الافتراضي أدناه (114 → 67) لم يتغيّر حتى لا يختلف سلوك المعلم المعتاد.
        // ملاحظة: سورة الأحقاف (46) هي أول سورة في الجزء 26 حسب JUZ_STARTS في engine/reviewParts.js.
        const kidsSurahs = AppState.surahsData.filter(s => s.number >= KIDS_MIN_SURAH && s.number <= 114);
        kidsSurahs.forEach(s => { 
            kFrom.appendChild(new Option(tf('dash_surah_option', { n: s.number, name: surahNameLocal(s.name) }), s.number)); 
            kTo.appendChild(new Option(tf('dash_surah_option', { n: s.number, name: surahNameLocal(s.name) }), s.number)); 
        });
        
        // الافتراضي: كامل نطاق ركن الأطفال (من الناس إلى الأحقاف) بعد أن كان ينتهي عند الملك
        kFrom.value = 114;
        kTo.value = KIDS_MIN_SURAH;
        attachKidsRangeCoverageNote('kids-from-surah', 'kids-to-surah', 'q-count-kids');
    }

    // بطاقتا المصدر (الكبار) وزر «كل حفظ الطالب»؛ تُحسب بعد معرفة نطاق الطالب
    applyAdultScope();
    loadStudentRange().then(applyAdultScope);
}


// ---------------------------------------------------------------------------
// مصدر التقييم عند الكبار: «كل المصحف» (الوضع المعتاد) / «نطاق حفظ الطالب» (ما حفظه فقط).
// الاختيار يُحفظ في localStorage.dh_adult_scope؛ الافتراضي «كل المصحف». طالب بلا نطاق صالح يبقى على «كل المصحف».
// ---------------------------------------------------------------------------
let studentRange = null;      // نتيجة resolveRange الصالحة للطالب الحالي أو null
let adultScope = 'all';       // تفضيل المعلم: 'all' | 'student'
let _rangeLoadRun = 0;

function effectiveScope() {
    return (!AppState.isKidsMode && adultScope === 'student' && studentRange) ? 'student' : 'all';
}
// نطاق الحفظ الذي تُقصر عليه القوائم (الكبار داخل «نطاق حفظ الطالب» فقط)
function scopeRange() { return effectiveScope() === 'student' ? studentRange : null; }
function inStudentScope(n) {
    const r = scopeRange();
    return !r || (n <= r.fromSurah && n >= r.toSurah && n !== 1);
}
function partialSuffix(surah) {
    const r = scopeRange();
    if (!r || surah.number !== r.toSurah || r.frontierAyah >= surah.ayahsCount) return '';
    return ' — ' + tf('scope_partial', { a: r.frontierAyah });
}
// تغطية الجزء بما حفظه الطالب: 'full' | 'part' | 'none' (الطالب يحفظ كل سورة من آية 1، والسور تنزل من الناس نحو البقرة)
function juzCoverage(k) {
    const r = scopeRange(), sd = AppState.surahsData;
    const b = juzBounds(sd, k);
    if (!r || !b) return '';
    const lo = ayahIndex(sd, b.start.surah, b.start.ayah), hi = ayahIndex(sd, b.end.surah, b.end.ayah);
    const cnt = (n) => (sd.find(x => x.number === n) || {}).ayahsCount || 0;
    const mem = [[ayahIndex(sd, r.toSurah, 1), ayahIndex(sd, r.toSurah, Math.min(r.frontierAyah, cnt(r.toSurah)))]];
    if (r.toSurah + 1 <= r.fromSurah) mem.push([ayahIndex(sd, r.toSurah + 1, 1), ayahIndex(sd, r.fromSurah, cnt(r.fromSurah))]);
    const covered = mem.reduce((sum, [a, z]) => sum + Math.max(0, Math.min(hi, z) - Math.max(lo, a) + 1), 0);
    return covered <= 0 ? 'none' : covered >= hi - lo + 1 ? 'full' : 'part';
}

async function loadStudentRange() {
    const run = ++_rangeLoadRun;
    const student = AppState.currentStudent;
    let found = null;
    if (student && !AppState.isKidsMode) {
        let records = [];
        try { records = await AppState.monthlyMemorizationManager.getAllForStudent(student.id); } catch (e) { records = []; }
        const r = resolveRange(AppState.surahsData, student, records);
        if (r.ok) found = r;
    }
    if (run === _rangeLoadRun) studentRange = found;
}

function applyAdultScope() {
    const adult = !AppState.isKidsMode;
    const box = document.getElementById('adult-scope'), note = document.getElementById('scope-note');
    if (box) box.style.display = adult ? 'grid' : 'none';
    if (note) note.style.display = adult ? 'block' : 'none';
    const eff = effectiveScope();
    const bAll = document.getElementById('scope-all'), bStu = document.getElementById('scope-student');
    if (bAll && bStu) {
        bAll.setAttribute('aria-pressed', String(eff === 'all'));
        bStu.setAttribute('aria-pressed', String(eff === 'student'));
        bStu.disabled = !studentRange;
    }
    if (note && adult) {
        const nm = (n) => surahNameLocal((AppState.surahsData.find(s => s.number === n) || {}).name || '');
        note.textContent = !studentRange ? t('scope_no_range')
            : eff === 'student' ? tf('scope_student_note', { name: AppState.currentStudent.name, from: nm(studentRange.fromSurah), to: nm(studentRange.toSurah) })
            : t('scope_all_note');
    }
    const pill = document.getElementById('eval-all-pill'), lbl = document.getElementById('eval-all-label');
    if (pill) pill.style.display = (!adult || eff === 'student') ? '' : 'none';
    if (lbl) lbl.textContent = t(adult ? 'scope_all_range_btn' : 'kids_all_btn');
    if (adult && eff !== 'student' && document.querySelector('input[name="evalType"]:checked')?.value === 'all') {
        const first = document.querySelector('input[name="evalType"][value="surah"]');
        if (first) first.checked = true;
    } else if (!adult && document.querySelector('input[name="evalType"]:checked')?.value === 'all') {
        const first = document.querySelector('input[name="evalType"][value="surah"]');
        if (first) first.checked = true;
    }
    buildScopeSelectors();
    toggleEvalType();
}

function setAdultScope(scope) {
    adultScope = scope;
    try { localStorage.setItem('dh_adult_scope', scope); } catch (e) { /* اختياري */ }
    // داخل «نطاق حفظ الطالب» نبدأ على «كل النطاق»، وفي «كل المصحف» على «سورة محددة»
    const target = document.querySelector(`input[name="evalType"][value="${scope === 'student' && studentRange ? 'all' : 'surah'}"]`);
    if (target) target.checked = true;
    applyAdultScope();
}

function buildScopeSelectors() {
    const selSurah = document.getElementById('surah-select');
    const rangeFrom = document.getElementById('range-from-surah');
    const rangeTo = document.getElementById('range-to-surah');
    
    if (selSurah && rangeFrom && rangeTo) {
        selSurah.innerHTML = `<option value="" disabled selected>${t('dash_choose_surah')}</option>`;
        rangeFrom.innerHTML = ''; 
        rangeTo.innerHTML = '';
        
        AppState.surahsData.forEach(s => {
            if (AppState.isKidsMode && (s.number < KIDS_MIN_SURAH || s.number > 114)) return;
            if (!inStudentScope(s.number)) return;
            let optStr = tf('dash_surah_option', { n: s.number, name: surahNameLocal(s.name) }) + partialSuffix(s);
            selSurah.appendChild(new Option(optStr, s.number));
            rangeFrom.appendChild(new Option(optStr, s.number));
            rangeTo.appendChild(new Option(optStr, s.number));
        });
        const sr0 = scopeRange();
        if (sr0) { rangeFrom.value = sr0.fromSurah; rangeTo.value = sr0.toSurah; }
    }

    const juzSel = document.getElementById('juz-select');
    if (juzSel) {
        juzSel.innerHTML = '';
        const juzNames = (AppState.currentLang === 'en' ? ["(Alif Lam Mim)","(Sayaqul)","(Tilka ar-Rusul)","(Lan Tanalu)","(Wal-Muhsanat)","(La Yuhibbullah)","(Wa Idha Sami'u)","(Wa Law Annana)","(Qalal-Mala')","(Wa'lamu)","(Ya'tadhirun)","(Wa Ma Min Dabbah)","(Wa Ma Ubarri'u)","(Rubama)","(Subhan)","(Qal Alam)","(Iqtaraba lin-Nas)","(Qad Aflaha)","(Wa Qalalladhina)","(A'man Khalaq)","(Utlu Ma Uhiya)","(Wa Man Yaqnut)","(Wa Ma Anzalna)","(Fa Man Azlam)","(Ilayhi Yuraddu)","(Ha Mim)","(Qala Fa Ma Khatbukum)","(Qad Sami'a)","(Tabarak)","(Amma)"] : ["(الم)", "(سيقول)", "(تلك الرسل)", "(لن تنالوا)", "(والمحصنات)", "(لا يحب الله)", "(وإذا سمعوا)", "(ولو أننا)", "(قال الملأ)", "(واعلموا)", "(يعتذرون)", "(وما من دابة)", "(وما أبرئ)", "(ربما)", "(سبحان)", "(قال ألم)", "(اقترب للناس)", "(قد أفلح)", "(وقال الذين)", "(أمن خلق)", "(اتل ما أوحي)", "(ومن يقنت)", "(وما أنزلنا)", "(فمن أظلم)", "(إليه يرد)", "(حم)", "(قال فما خطبكم)", "(قد سمع)", "(تبارك)", "(عم)"]); // 🌟 أسماء الأجزاء بنطق إنجليزي في الوضع الإنجليزي (تسمية الجزء ليست نص آية)
        for (let i = 30; i >= (AppState.isKidsMode ? KIDS_MIN_JUZ : 1); i--) {
            const cov = scopeRange() ? juzCoverage(i) : '';
            if (cov === 'none') continue;
            const suffix = cov === 'full' ? ' — ' + t('scope_juz_full') : cov === 'part' ? ' — ' + t('scope_juz_part') : '';
            juzSel.appendChild(new Option(tf('dash_juz_label', { n: i, name: juzNames[i-1] }) + suffix, i));
        }
        attachJuzAmmaCoverageNote('juz-select', 'q-count-juz');
    }
}

// ---------------------------------------------------------------------------
// «كل حفظ الطالب» / «كل النطاق»: النطاق من أول ما حفظه (memoFrom) حتى آخر موضع توقف
// (memoTo، يمتد تلقائياً مع السجل الشهري). للأطفال مقصوص على نطاقهم 46–114، وللكبار داخل «نطاق حفظ الطالب».
// ---------------------------------------------------------------------------
const KIDS_ALL_STALE_DAYS = 14;   // تنبيه المعلم لتحديث الموضع إذا مضى أكثر من أسبوعين
let allRange = null;          // { from, to } عند جاهزية «كل الحفظ»
let allStale = false;         // هل موضع الحفظ قديم/غير مسجَّل (يُسأل المعلم عند البدء)

function isAllOn() {
    return (AppState.isKidsMode || effectiveScope() === 'student') && document.querySelector('input[name="evalType"]:checked')?.value === 'all';
}

// يُستدعى من toggleEvalType عند تغيّر النوع؛ يحسب النطاق التلقائي فقط عند اختيار «كل حفظ الطالب»
function syncAll() {
    allRange = null;
    allStale = false;
    if (isAllOn()) refreshAllInfo();
}

// نافذة تذكير عند البدء بـ«كل حفظ الطالب» والموضع قديم: يحدّث المعلم الآن أو يكمل بنطاق قد يكون ناقصاً
function askAllStale() {
    return new Promise((resolve) => {
        const ov = document.createElement('div');
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-modal', 'true');
        ov.style.cssText = 'position:fixed;inset:0;z-index:20000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.55);';
        const box = document.createElement('div');
        box.style.cssText = 'max-width:460px;width:100%;padding:22px;border-radius:18px;text-align:center;background:var(--dh-surface-3,#fff);color:var(--dh-ink,#10241c);border:1px solid var(--dh-border-strong,#cfc9b0);box-shadow:0 14px 40px rgba(0,0,0,.35);';
        const msg = document.createElement('div');
        msg.style.cssText = 'font-size:1.15rem;font-weight:700;line-height:1.9;margin-bottom:16px;';
        msg.textContent = t('kids_all_stale_prompt');
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;justify-content:center;';
        const done = (v) => { ov.remove(); resolve(v); };
        const mk = (key, cls, v) => {
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'btn ' + cls; b.textContent = t(key);
            b.style.cssText = 'font-size:1.05rem;padding:10px 16px;';
            b.addEventListener('click', () => done(v));
            return b;
        };
        row.append(mk('kids_all_stale_update', 'dash-btn-primary', 'update'), mk('kids_all_stale_continue', 'btn-outline', 'continue'));
        box.append(msg, row);
        ov.appendChild(box);
        ov.addEventListener('click', (e) => { if (e.target === ov) done('cancel'); });
        document.body.appendChild(ov);
    });
}

async function updatePositionNow() {
    const student = AppState.currentStudent;
    if (!student) return;
    const { openMonthEndingForStudent } = await import('../components/monthlyMemorizationBulkScreen.js');
    const now = new Date();
    await openMonthEndingForStudent(student, now.getFullYear(), now.getMonth() + 1);
    if (isAllOn()) await refreshAllInfo();
}

async function refreshAllInfo() {
    const rangeEl = document.getElementById('kids-all-range');
    const freshEl = document.getElementById('kids-all-fresh');
    const updBtn = document.getElementById('btn-kids-all-update');
    const student = AppState.currentStudent;
    updBtn.style.display = 'none';
    freshEl.textContent = '';
    freshEl.style.color = '';
    let records = [];
    try { records = await AppState.monthlyMemorizationManager.getAllForStudent(student.id); } catch (e) { records = []; }
    const r = resolveRange(AppState.surahsData, student, records);
    if (!r.ok) {
        rangeEl.textContent = t('kids_all_no_range');
        updBtn.style.display = '';
        return;
    }
    const kids = AppState.isKidsMode;
    const from = Math.min(r.fromSurah, 114);
    const to = kids ? Math.max(r.toSurah, KIDS_MIN_SURAH) : Math.max(r.toSurah, 2);
    if (kids && from < KIDS_MIN_SURAH) { rangeEl.textContent = t('kids_all_no_range'); return; }
    allRange = { from, to };
    const nm = (n) => surahNameLocal(AppState.surahsData.find(s => s.number === n).name);
    rangeEl.textContent = tf('kids_all_range', { from: nm(from), to: nm(to) })
        + (kids && r.toSurah < KIDS_MIN_SURAH ? ' — ' + t('kids_all_capped') : '');

    const st = monthlyStaleness(records, Date.now());
    const stale = !st.hasRecords || st.days > KIDS_ALL_STALE_DAYS;
    allStale = stale;
    freshEl.textContent = !st.hasRecords ? t('kids_all_fresh_none')
        : tf(stale ? 'kids_all_fresh_stale' : 'kids_all_fresh_ok', { n: st.days });
    freshEl.style.color = stale ? 'var(--dh-warn, #b45309)' : 'var(--dh-ok, #15803d)';
    updBtn.style.display = stale ? '' : 'none';
}

export function setupDashboardListeners() {
    document.querySelectorAll('input[name="evalType"]').forEach(r => r.addEventListener('change', toggleEvalType));
    document.getElementById('surah-select')?.addEventListener('change', () => { updateHeaderSurahName(); updateAyahRange(); });
    document.getElementById('range-from-surah')?.addEventListener('change', updateHeaderSurahName);
    document.getElementById('range-to-surah')?.addEventListener('change', updateHeaderSurahName);
    document.getElementById('juz-select')?.addEventListener('change', updateHeaderSurahName);
    document.getElementById('btn-change-student')?.addEventListener('click', loadLoginScreen);
    
    const getTeacherConfig = () => {
        const evalType = document.querySelector('input[name="evalType"]:checked')?.value || 'surah';
        const isJuzMode = evalType === 'juz';
        const isAll = evalType === 'all';
        const isRangeMode = !AppState.isKidsMode && (evalType === 'range' || isAll);
        const isKidsRange = AppState.isKidsMode && (evalType === 'range' || isAll);
        
        let qCountVal = 10;
        if (isAll) qCountVal = document.getElementById('q-count-all').value;
        else if (isKidsRange) qCountVal = document.getElementById('q-count-kids').value;
        else if (isJuzMode) qCountVal = document.getElementById('q-count-juz').value;
        else if (isRangeMode) qCountVal = document.getElementById('q-count-range').value;
        else qCountVal = document.getElementById('q-count-surah').value;

        return {
            mode: evalType,
            isKidsMode: AppState.isKidsMode,
            isJuzMode: isJuzMode,
            isRangeMode: isRangeMode,
            isKidsRange: isKidsRange,
            qCount: Math.max(5, parseInt(qCountVal) || 15),
            surahNum: parseInt(document.getElementById('surah-select')?.value),
            startAyah: parseInt(document.getElementById('ayah-from')?.value),
            endAyah: parseInt(document.getElementById('ayah-to')?.value),
            rangeFrom: (isRangeMode && isAll && allRange) ? allRange.from : parseInt(document.getElementById('range-from-surah')?.value),
            rangeTo: (isRangeMode && isAll && allRange) ? allRange.to : parseInt(document.getElementById('range-to-surah')?.value),
            juzNum: parseInt(document.getElementById('juz-select')?.value),
            kidsFrom: (isKidsRange && isAllOn() && allRange) ? allRange.from : parseInt(document.getElementById('kids-from-surah')?.value),
            kidsTo: (isKidsRange && isAllOn() && allRange) ? allRange.to : parseInt(document.getElementById('kids-to-surah')?.value)
        };
    };

    document.getElementById('btn-kids-all-update')?.addEventListener('click', updatePositionNow);
    document.getElementById('scope-all')?.addEventListener('click', () => setAdultScope('all'));
    document.getElementById('scope-student')?.addEventListener('click', () => { if (studentRange) setAdultScope('student'); });

    document.getElementById('btn-start-mission')?.addEventListener('click', async () => {
        const config = getTeacherConfig();

        if (isAllOn() && !allRange) return alert(t('kids_all_no_range'));
        // تذكير: موضع الحفظ قديم → يحدّث المعلم الآن (ثم يضغط ابدأ مجدداً) أو يكمل بنطاق قد يكون ناقصاً
        if (isAllOn() && allStale) {
            const choice = await askAllStale();
            if (choice === 'update') { await updatePositionNow(); return; }
            if (choice !== 'continue') return;
        }

        const isSingleSurah = !config.isJuzMode && !config.isRangeMode && !config.isKidsRange;
        if (isSingleSurah && isNaN(config.surahNum)) return alert(t('dash_alert_choose_surah'));
        if (isSingleSurah && config.startAyah > config.endAyah) return alert(t('dash_alert_bad_range'));

        if (config.isKidsMode) {
            openKidsGameScreen(config, false);
        } else {
            openAdultGameScreen(config, false);
        }
    });
}

function toggleEvalType() {
    const checkedRadio = document.querySelector('input[name="evalType"]:checked');
    if (!checkedRadio) return;
    const mode = checkedRadio.value;
    
    document.getElementById('surah-settings').style.display = (mode === 'surah') ? 'grid' : 'none';
    const kids = AppState.isKidsMode;
    document.getElementById('range-settings').style.display = (mode === 'range' && !kids) ? 'grid' : 'none';
    document.getElementById('kids-settings').style.display = (mode === 'range' && kids) ? 'grid' : 'none';
    const isAll = mode === 'all' && (kids || effectiveScope() === 'student');
    document.getElementById('all-settings').style.display = isAll ? 'block' : 'none';
    const qa = document.getElementById('q-count-all'); if (qa) qa.max = kids ? 37 : 50;
    syncAll();
    document.getElementById('juz-settings').style.display = (mode === 'juz') ? 'grid' : 'none';
    
    updateHeaderSurahName();
}

function updateHeaderSurahName() {
    const headerTitle = document.getElementById('header-title');
    if (AppState.isKidsMode || !headerTitle) return;
    
    const mode = document.querySelector('input[name="evalType"]:checked').value;
    if (mode === 'surah') {
        const selSurah = document.getElementById('surah-select');
        if (selSurah.selectedIndex > 0 && selSurah.value) {
            const pureName = surahNameLocal(selSurah.value);
            headerTitle.innerText = tf('dash_header_surah', { name: pureName });
        } else { headerTitle.innerText = t('header_title'); }
    } else if (mode === 'range' || mode === 'all') {
        headerTitle.innerText = t('dash_header_multi');
    } else if (mode === 'juz') {
        const selJuz = document.getElementById('juz-select');
        if (selJuz.selectedIndex >= 0) headerTitle.innerText = tf('dash_header_other', { label: selJuz.options[selJuz.selectedIndex].text });
    }
}

function updateAyahRange() {
    const surahNum = parseInt(document.getElementById('surah-select').value);
    if (isNaN(surahNum)) return;
    const surah = AppState.surahsData.find(s => s.number === surahNum);
    const fromSelect = document.getElementById('ayah-from'); 
    const toSelect = document.getElementById('ayah-to');
    
    fromSelect.innerHTML = ""; 
    toSelect.innerHTML = "";
    
    for (let i = 1; i <= surah.ayahsCount; i++) { 
        fromSelect.appendChild(new Option(tf('dash_ayah_label', { n: i }), i)); 
        toSelect.appendChild(new Option(tf('dash_ayah_label', { n: i }), i)); 
    }
    toSelect.value = surah.ayahsCount;
}
