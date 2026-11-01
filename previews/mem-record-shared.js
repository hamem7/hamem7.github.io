// previews/mem-record-shared.js
// مشترك بين معاينتَي «تسجيل حفظ الطالب» (mem-record-a-card.html / mem-record-b-path.html).
// بيانات تجريبية فقط — لا يمسّ التطبيق. اللغتان (عربي/English) والاتجاه والمظهر الفاتح/الداكن كلها هنا.
(function () {
  // [اسم عربي, English, عدد الآيات] — الترتيب المصحفي 1..114
  const S = [
    ['الفاتحة','Al-Fatihah',7],['البقرة','Al-Baqarah',286],['آل عمران','Al-Imran',200],['النساء','An-Nisa',176],['المائدة','Al-Maidah',120],
    ['الأنعام','Al-Anam',165],['الأعراف','Al-Araf',206],['الأنفال','Al-Anfal',75],['التوبة','At-Tawbah',129],['يونس','Yunus',109],
    ['هود','Hud',123],['يوسف','Yusuf',111],['الرعد','Ar-Rad',43],['إبراهيم','Ibrahim',52],['الحجر','Al-Hijr',99],
    ['النحل','An-Nahl',128],['الإسراء','Al-Isra',111],['الكهف','Al-Kahf',110],['مريم','Maryam',98],['طه','Ta-Ha',135],
    ['الأنبياء','Al-Anbiya',112],['الحج','Al-Hajj',78],['المؤمنون','Al-Muminun',118],['النور','An-Nur',64],['الفرقان','Al-Furqan',77],
    ['الشعراء','Ash-Shuara',227],['النمل','An-Naml',93],['القصص','Al-Qasas',88],['العنكبوت','Al-Ankabut',69],['الروم','Ar-Rum',60],
    ['لقمان','Luqman',34],['السجدة','As-Sajdah',30],['الأحزاب','Al-Ahzab',73],['سبأ','Saba',54],['فاطر','Fatir',45],
    ['يس','Ya-Sin',83],['الصافات','As-Saffat',182],['ص','Sad',88],['الزمر','Az-Zumar',75],['غافر','Ghafir',85],
    ['فصلت','Fussilat',54],['الشورى','Ash-Shura',53],['الزخرف','Az-Zukhruf',89],['الدخان','Ad-Dukhan',59],['الجاثية','Al-Jathiyah',37],
    ['الأحقاف','Al-Ahqaf',35],['محمد','Muhammad',38],['الفتح','Al-Fath',29],['الحجرات','Al-Hujurat',18],['ق','Qaf',45],
    ['الذاريات','Adh-Dhariyat',60],['الطور','At-Tur',49],['النجم','An-Najm',62],['القمر','Al-Qamar',55],['الرحمن','Ar-Rahman',78],
    ['الواقعة','Al-Waqiah',96],['الحديد','Al-Hadid',29],['المجادلة','Al-Mujadila',22],['الحشر','Al-Hashr',24],['الممتحنة','Al-Mumtahanah',13],
    ['الصف','As-Saff',14],['الجمعة','Al-Jumuah',11],['المنافقون','Al-Munafiqun',11],['التغابن','At-Taghabun',18],['الطلاق','At-Talaq',12],
    ['التحريم','At-Tahrim',12],['الملك','Al-Mulk',30],['القلم','Al-Qalam',52],['الحاقة','Al-Haqqah',52],['المعارج','Al-Maarij',44],
    ['نوح','Nuh',28],['الجن','Al-Jinn',28],['المزمل','Al-Muzzammil',20],['المدثر','Al-Muddaththir',56],['القيامة','Al-Qiyamah',40],
    ['الإنسان','Al-Insan',31],['المرسلات','Al-Mursalat',50],['النبأ','An-Naba',40],['النازعات','An-Naziat',46],['عبس','Abasa',42],
    ['التكوير','At-Takwir',29],['الانفطار','Al-Infitar',19],['المطففين','Al-Mutaffifin',36],['الانشقاق','Al-Inshiqaq',25],['البروج','Al-Buruj',22],
    ['الطارق','At-Tariq',17],['الأعلى','Al-Ala',19],['الغاشية','Al-Ghashiyah',26],['الفجر','Al-Fajr',30],['البلد','Al-Balad',20],
    ['الشمس','Ash-Shams',15],['الليل','Al-Layl',21],['الضحى','Ad-Duha',11],['الشرح','Ash-Sharh',8],['التين','At-Tin',8],
    ['العلق','Al-Alaq',19],['القدر','Al-Qadr',5],['البينة','Al-Bayyinah',8],['الزلزلة','Az-Zalzalah',8],['العاديات','Al-Adiyat',11],
    ['القارعة','Al-Qariah',11],['التكاثر','At-Takathur',8],['العصر','Al-Asr',3],['الهمزة','Al-Humazah',9],['الفيل','Al-Fil',5],
    ['قريش','Quraysh',4],['الماعون','Al-Maun',7],['الكوثر','Al-Kawthar',3],['الكافرون','Al-Kafirun',6],['النصر','An-Nasr',3],
    ['المسد','Al-Masad',5],['الإخلاص','Al-Ikhlas',4],['الفلق','Al-Falaq',5],['الناس','An-Nas',6]
  ];

  const I18N = {
    ar: {
      topTitle: 'معاينة — شاشة تسجيل حفظ الطالب', note: 'معاينة تصميم فقط — لا تغيّر أي بيانات',
      lang: 'English', theme: 'المظهر', kind: 'نهاية الشهر', month: 'شهر {m}/{y}',
      lastTitle: 'آخر ما سُجّل لهذا الطالب', lastSub: 'سُجّل في {d}', startMonth: 'بداية هذا الشهر',
      surah: 'السورة', ayah: 'آخر آية محفوظة', ayahOf: 'من {n}', range: 'من 1 إلى {n}',
      skip: 'تخطٍّ', next: 'التالي', sameSurah: 'نفس السورة', nextSurah: 'السورة التالية',
      finishSurah: 'أكملتُ السورة', reset: 'العودة لآخر تسجيل',
      newAyahs: 'الحفظ الجديد هذا الشهر', ayahsUnit: 'آية', noProgress: 'لم يتقدّم بعد',
      backward: 'الموضع قبل آخر تسجيل — راجع السورة أو الآية',
      from: 'من', to: 'إلى', progressLabel: 'مسار الحفظ (من الناس نحو الفاتحة)', here: 'وصل إلى',
      student: 'أحمد', stepOf: 'الطالب {i} من {n}', dateSample: 'سبتمبر 2026'
    },
    en: {
      topTitle: 'Preview — Record student memorization', note: 'Design preview only — no data is changed',
      lang: 'العربية', theme: 'Theme', kind: 'End of month', month: 'Month {m}/{y}',
      lastTitle: 'Last recorded for this student', lastSub: 'Recorded in {d}', startMonth: 'Start of this month',
      surah: 'Surah', ayah: 'Last memorized ayah', ayahOf: 'of {n}', range: 'From 1 to {n}',
      skip: 'Skip', next: 'Next', sameSurah: 'Same surah', nextSurah: 'Next surah',
      finishSurah: 'Finished the surah', reset: 'Back to last record',
      newAyahs: 'New memorization this month', ayahsUnit: 'ayahs', noProgress: 'No progress yet',
      backward: 'Position is before the last record — check the surah or ayah',
      from: 'From', to: 'To', progressLabel: 'Memorization path (An-Nas toward Al-Fatihah)', here: 'Reached',
      student: 'Ahmad', stepOf: 'Student {i} of {n}', dateSample: 'September 2026'
    }
  };

  // طالب تجريبي: آخر تسجيل = المجادلة (58) آية 12
  const SAMPLE = { last: { s: 58, a: 12 }, month: 10, year: 2026 };

  const store = {
    get(k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* لا شيء */ } }
  };

  const MR = {
    SURAHS: S, SAMPLE,
    lang: store.get('mr_lang', 'ar'),
    theme: store.get('mr_theme', 'auto'),
    listeners: [],
    count(n) { return S[n - 1][2]; },
    name(n) { return S[n - 1][MR.lang === 'ar' ? 0 : 1]; },
    t(k, vars) {
      let s = (I18N[MR.lang] || I18N.ar)[k] || k;
      if (vars) Object.keys(vars).forEach(v => { s = s.replace('{' + v + '}', vars[v]); });
      return s;
    },
    // فهرس الموضع على مسار الحفظ: الناس أولًا، فكلما زاد الفهرس تقدّم الطالب نحو الفاتحة
    idx(s, a) { let c = 0; for (let n = 114; n > s; n--) c += S[n - 1][2]; return c + a; },
    total() { return S.reduce((x, r) => x + r[2], 0) - S[0][2]; },
    newAyahs(from, to) { return MR.idx(to.s, to.a) - MR.idx(from.s, from.a); },
    surahOptions(sel) {
      let h = '';
      for (let n = 114; n >= 1; n--) h += `<option value="${n}"${n === sel ? ' selected' : ''}>${n}. ${MR.name(n)}</option>`;
      return h;
    },
    onChange(fn) { MR.listeners.push(fn); },
    applyChrome() {
      const d = document.documentElement;
      d.lang = MR.lang; d.dir = MR.lang === 'ar' ? 'rtl' : 'ltr';
      const dark = MR.theme === 'dark' || (MR.theme === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
      d.setAttribute('data-theme', dark ? 'dark' : 'light');
      document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = MR.t(el.dataset.i18n); });
      const lb = document.getElementById('mr-lang'); if (lb) lb.textContent = MR.t('lang');
      const tb = document.getElementById('mr-theme'); if (tb) tb.textContent = (dark ? '☾ ' : '☀ ') + MR.t('theme');
      document.title = MR.t('topTitle');
    },
    refresh() { MR.applyChrome(); MR.listeners.forEach(fn => fn()); }
  };

  document.addEventListener('DOMContentLoaded', () => {
    const lb = document.getElementById('mr-lang');
    if (lb) lb.addEventListener('click', () => { MR.lang = MR.lang === 'ar' ? 'en' : 'ar'; store.set('mr_lang', MR.lang); MR.refresh(); });
    const tb = document.getElementById('mr-theme');
    if (tb) tb.addEventListener('click', () => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      MR.theme = dark ? 'light' : 'dark'; store.set('mr_theme', MR.theme); MR.refresh();
    });
    MR.refresh();
  });
  window.MR = MR;
})();
