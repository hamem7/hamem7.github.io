// settings/dashboard.js
import { AppState, loadLoginScreen, t, tf, surahNameLocal } from '../core/app.js';
import { attachJuzAmmaCoverageNote, attachKidsRangeCoverageNote } from '../components/juzAmmaCoverageNote.js';
import { openAdultGameScreen } from '../games/adultGame.js'; 
import { openKidsGameScreen } from '../games/kidsGame.js';   

// نطاق ركن الأطفال: من أول الأحقاف (الجزء 26) إلى الناس
const KIDS_MIN_SURAH = 46;
const KIDS_MIN_JUZ = 26;

export function populateDashboardData() {
    // 🌟 [إصلاح فحص الأزرار] عرض اسم الطالب في شريحة اللوحة (كانت فارغة بمعرّف مكرر) 🌟
    const _chip = document.getElementById('dash-student-chip');
    if (_chip) _chip.textContent = AppState.currentStudent ? `🏅 ${AppState.currentStudent.name}` : '';

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

    const selSurah = document.getElementById('surah-select');
    const rangeFrom = document.getElementById('range-from-surah');
    const rangeTo = document.getElementById('range-to-surah');
    
    if (selSurah && rangeFrom && rangeTo) {
        selSurah.innerHTML = `<option value="" disabled selected>${t('dash_choose_surah')}</option>`;
        rangeFrom.innerHTML = ''; 
        rangeTo.innerHTML = '';
        
        AppState.surahsData.forEach(s => {
            if (AppState.isKidsMode && (s.number < KIDS_MIN_SURAH || s.number > 114)) return;
            let optStr = tf('dash_surah_option', { n: s.number, name: surahNameLocal(s.name) });
            selSurah.appendChild(new Option(optStr, s.number));
            rangeFrom.appendChild(new Option(optStr, s.number));
            rangeTo.appendChild(new Option(optStr, s.number));
        });
    }

    const juzSel = document.getElementById('juz-select');
    if (juzSel) {
        juzSel.innerHTML = '';
        const juzNames = (AppState.currentLang === 'en' ? ["(Alif Lam Mim)","(Sayaqul)","(Tilka ar-Rusul)","(Lan Tanalu)","(Wal-Muhsanat)","(La Yuhibbullah)","(Wa Idha Sami'u)","(Wa Law Annana)","(Qalal-Mala')","(Wa'lamu)","(Ya'tadhirun)","(Wa Ma Min Dabbah)","(Wa Ma Ubarri'u)","(Rubama)","(Subhan)","(Qal Alam)","(Iqtaraba lin-Nas)","(Qad Aflaha)","(Wa Qalalladhina)","(A'man Khalaq)","(Utlu Ma Uhiya)","(Wa Man Yaqnut)","(Wa Ma Anzalna)","(Fa Man Azlam)","(Ilayhi Yuraddu)","(Ha Mim)","(Qala Fa Ma Khatbukum)","(Qad Sami'a)","(Tabarak)","(Amma)"] : ["(الم)", "(سيقول)", "(تلك الرسل)", "(لن تنالوا)", "(والمحصنات)", "(لا يحب الله)", "(وإذا سمعوا)", "(ولو أننا)", "(قال الملأ)", "(واعلموا)", "(يعتذرون)", "(وما من دابة)", "(وما أبرئ)", "(ربما)", "(سبحان)", "(قال ألم)", "(اقترب للناس)", "(قد أفلح)", "(وقال الذين)", "(أمن خلق)", "(اتل ما أوحي)", "(ومن يقنت)", "(وما أنزلنا)", "(فمن أظلم)", "(إليه يرد)", "(حم)", "(قال فما خطبكم)", "(قد سمع)", "(تبارك)", "(عم)"]); // 🌟 أسماء الأجزاء بنطق إنجليزي في الوضع الإنجليزي (تسمية الجزء ليست نص آية)
        for (let i = 30; i >= (AppState.isKidsMode ? KIDS_MIN_JUZ : 1); i--) {
            juzSel.appendChild(new Option(tf('dash_juz_label', { n: i, name: juzNames[i-1] }), i));
        }
        attachJuzAmmaCoverageNote('juz-select', 'q-count-juz');
    }

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
        
        kFrom.value = 114;
        kTo.value = 67;
        attachKidsRangeCoverageNote('kids-from-surah', 'kids-to-surah', 'q-count-kids');
    }
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
        const isRangeMode = !AppState.isKidsMode && evalType === 'range';
        const isKidsRange = AppState.isKidsMode && evalType === 'range';
        
        let qCountVal = 10;
        if (isKidsRange) qCountVal = document.getElementById('q-count-kids').value;
        else if (isJuzMode) qCountVal = document.getElementById('q-count-juz').value;
        else if (isRangeMode) qCountVal = document.getElementById('q-count-range').value;
        else qCountVal = document.getElementById('q-count-surah').value;

        return {
            mode: evalType,
            isKidsMode: AppState.isKidsMode,
            isJuzMode: isJuzMode,
            isRangeMode: isRangeMode,
            isKidsRange: isKidsRange,
            qCount: parseInt(qCountVal),
            surahNum: parseInt(document.getElementById('surah-select')?.value),
            startAyah: parseInt(document.getElementById('ayah-from')?.value),
            endAyah: parseInt(document.getElementById('ayah-to')?.value),
            rangeFrom: parseInt(document.getElementById('range-from-surah')?.value),
            rangeTo: parseInt(document.getElementById('range-to-surah')?.value),
            juzNum: parseInt(document.getElementById('juz-select')?.value),
            kidsFrom: parseInt(document.getElementById('kids-from-surah')?.value),
            kidsTo: parseInt(document.getElementById('kids-to-surah')?.value)
        };
    };

    document.getElementById('btn-start-mission')?.addEventListener('click', () => {
        const config = getTeacherConfig();

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
    } else if (mode === 'range') {
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
