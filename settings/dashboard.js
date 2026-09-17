// settings/dashboard.js
import { AppState, loadLoginScreen } from '../core/app.js';
import { openAdultGameScreen } from '../games/adultGame.js'; 
import { openKidsGameScreen } from '../games/kidsGame.js';   

export function populateDashboardData() {
    const headerTitle = document.getElementById('header-title');
    
    if (AppState.isKidsMode) { 
        if (headerTitle) headerTitle.innerText = "🎈 ركن الأبطال الصغار"; 
        document.getElementById('eval-radios').style.display = 'none';
        document.getElementById('surah-settings').style.display = 'none';
        document.getElementById('range-settings').style.display = 'none';
        document.getElementById('juz-settings').style.display = 'none';
        document.getElementById('kids-settings').style.display = 'grid';
        document.getElementById('dash-title').innerText = "🎈 هيا نلعب 🎈";
    } else { 
        document.getElementById('eval-radios').style.display = 'flex';
        document.getElementById('kids-settings').style.display = 'none';
        document.getElementById('dash-title').innerText = "لوحة التقييم ⚙️";
        toggleEvalType(); 
    }

    const selSurah = document.getElementById('surah-select');
    const rangeFrom = document.getElementById('range-from-surah');
    const rangeTo = document.getElementById('range-to-surah');
    
    if (selSurah && rangeFrom && rangeTo) {
        selSurah.innerHTML = '<option value="" disabled selected>-- اختر السورة --</option>';
        rangeFrom.innerHTML = ''; 
        rangeTo.innerHTML = '';
        
        AppState.surahsData.forEach(s => {
            let optStr = `${s.number}. سورة ${s.name}`;
            selSurah.appendChild(new Option(optStr, s.number));
            rangeFrom.appendChild(new Option(optStr, s.number));
            rangeTo.appendChild(new Option(optStr, s.number));
        });
    }

    const juzSel = document.getElementById('juz-select');
    if (juzSel) {
        juzSel.innerHTML = '';
        const juzNames = ["(الم)", "(سيقول)", "(تلك الرسل)", "(لن تنالوا)", "(والمحصنات)", "(لا يحب الله)", "(وإذا سمعوا)", "(ولو أننا)", "(قال الملأ)", "(واعلموا)", "(يعتذرون)", "(وما من دابة)", "(وما أبرئ)", "(ربما)", "(سبحان)", "(قال ألم)", "(اقترب للناس)", "(قد أفلح)", "(وقال الذين)", "(أمن خلق)", "(اتل ما أوحي)", "(ومن يقنت)", "(وما أنزلنا)", "(فمن أظلم)", "(إليه يرد)", "(حم)", "(قال فما خطبكم)", "(قد سمع)", "(تبارك)", "(عم)"];
        for (let i = 30; i >= 1; i--) {
            juzSel.appendChild(new Option(`الجزء ${i} ${juzNames[i-1]}`, i));
        }
    }

    const kFrom = document.getElementById('kids-from-surah'); 
    const kTo = document.getElementById('kids-to-surah');
    
    if (kFrom && kTo) {
        kFrom.innerHTML = ''; 
        kTo.innerHTML = '';
        
        const kidsSurahs = AppState.surahsData.filter(s => s.number >= 67 && s.number <= 114);
        kidsSurahs.forEach(s => { 
            kFrom.appendChild(new Option(`${s.number}. سورة ${s.name}`, s.number)); 
            kTo.appendChild(new Option(`${s.number}. سورة ${s.name}`, s.number)); 
        });
        
        kFrom.value = 114; 
        kTo.value = 67; 
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
        const isJuzMode = !AppState.isKidsMode && evalType === 'juz';
        const isRangeMode = !AppState.isKidsMode && evalType === 'range';
        
        let qCountVal = 10;
        if (AppState.isKidsMode) qCountVal = document.getElementById('q-count-kids').value;
        else if (isJuzMode) qCountVal = document.getElementById('q-count-juz').value;
        else if (isRangeMode) qCountVal = document.getElementById('q-count-range').value;
        else qCountVal = document.getElementById('q-count-surah').value;

        return {
            mode: evalType,
            isKidsMode: AppState.isKidsMode,
            isJuzMode: isJuzMode,
            isRangeMode: isRangeMode,
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

        if (!AppState.isKidsMode && !config.isJuzMode && !config.isRangeMode && isNaN(config.surahNum)) return alert("الرجاء اختيار السورة أولاً!");
        if (!AppState.isKidsMode && !config.isJuzMode && !config.isRangeMode && config.startAyah > config.endAyah) return alert("نطاق الآيات غير صحيح!");

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
    document.getElementById('range-settings').style.display = (mode === 'range') ? 'grid' : 'none';
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
            const pureName = selSurah.options[selSurah.selectedIndex].text.replace(/^\d+\.\s*سورة\s*/, '').replace(/^سورة\s*/, '').trim();
            headerTitle.innerText = `🏆 رحلة إتقان القرآن - سورة ${pureName}`;
        } else { headerTitle.innerText = `🏆 رحلة إتقان القرآن`; }
    } else if (mode === 'range') {
        headerTitle.innerText = `🏆 رحلة إتقان القرآن - عدة سور`;
    } else if (mode === 'juz') {
        const selJuz = document.getElementById('juz-select');
        if (selJuz.selectedIndex >= 0) headerTitle.innerText = `🏆 رحلة إتقان القرآن - ${selJuz.options[selJuz.selectedIndex].text}`;
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
        fromSelect.appendChild(new Option(`آية ${i}`, i)); 
        toSelect.appendChild(new Option(`آية ${i}`, i)); 
    }
    toSelect.value = surah.ayahsCount;
}