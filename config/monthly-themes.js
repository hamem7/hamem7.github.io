// config/monthly-themes.js
// ==========================================================
// 🌙 ثيمات الواجب الشهرية (حسب الشهر الهجري لتاريخ جهاز الطالب) — تتبدّل تلقائياً بلا تدخل.
// تُطبَّق على شاشتي الطالب: ترحيب الواجب (student/homework-welcome) وحلّه (games/homework-play).
// الهيكل ثابت؛ يتجدّد «الجلد» فقط: ألوان فاتحة/داكنة + صورة الشهر + زخرفة + عبارات تشجيع + وسام.
// • النصوص ثنائية اللغة {ar,en} هنا عمداً (محتوى شهري كالـ CHANGELOG، لا مفاتيح i18n).
// • الألوان: [bg, surface, ink, ink2, accent, onAccent, hi, onHi, frame, frameLine, chip, line] لكل من L (فاتح) وD (داكن).
// • الخط القرآني لا يتأثر إطلاقاً بالثيمات (لا تُعدَّل font-family/weight للنص القرآني).
// • للتجربة: ?hm=1..12 في الرابط أو localStorage.dh_hm = 1..12؛ ولتعطيل الثيمة: localStorage.dh_hm = 'off'.
// • الصور في assets/themes/mXX-{hero|strip|medal|corner|deco|logo}.webp (انظر FLAGS أدناه).
// • حقول اختيارية في نصوص الشهر: cap = عنوان فوق صورة الترحيب، quote = نص (حديث/آية) نصًّا حقيقيًّا تحت الوسام، prog = عبارة شريط التقدّم.
// ⚠️ ربيع الآخر (4) ثيمة مؤقتة بصور مبدئية، وتُستكمل صورها لاحقاً (جمادى الأولى = «الصدق» اكتملت).
// ==========================================================
export const THEMES = [
 { n:1, icon:'🌙', glyph:'✦', pat:'spark', corner:'✦', conf:['🌙','✨','⭐'],
   ar:{ name:'مُحرَّم', occ:'بداية العام الهجري — صفحة جديدة وعزيمة جديدة', badge:'واجب شهر محرّم', title:'عامٌ هجري جديد.. وتحدٍّ جديد!', sub:'ابدأ عامك بآية.. هل أنت مستعد يا بطل؟', enc:['بداية موفقة! 🌙','خطوة بعد خطوة يبدأ العام','ما شاء الله، ثبات جميل'], done:'افتتحتَ عامك بإنجاز!', medal:'وسام البداية' },
   en:{ name:'Muharram', occ:'The Hijri new year — a fresh page, a fresh resolve', badge:'Muharram Homework', title:'A new Hijri year.. a new challenge!', sub:'Start your year with an ayah.. are you ready, hero?', enc:['A blessed start! 🌙','The year begins one step at a time','MashaAllah, lovely consistency'], done:'You opened your year with an achievement!', medal:'Fresh Start Medal' },
   L:['#eaf0f7','#fbfdff','#0f1f33','#4a5b70','#1e3a8a','#ffffff','#c9a227','#2b2100','#eef3fb','#8fa6d1','#dde7f6','#cdd9ec'],
   D:['#0a1220','#121d33','#e8eefb','#a9b8d3','#8fb0ff','#0a1220','#e0bb44','#241b00','#16233f','#4a6aa8','#1d2d4f','#2a3d63'] },
 { n:2, icon:'🏜️', glyph:'◈', pat:'diamond', corner:'◈', conf:['🍂','🌾','✨'],
   ar:{ name:'صَفَر', occ:'الصبر والمثابرة — ألوان الرمال الدافئة', badge:'واجب شهر صفر', title:'تحدّي الصبر والمثابرة!', sub:'بالصبر تُتقن التلاوة.. هيا يا بطل!', enc:['صبرٌ جميل، واصل! 🏜️','كل محاولة تقرّبك أكثر','أحسنت، ثابت على الطريق'], done:'ثمرة صبرك إنجاز رائع!', medal:'وسام المثابر' },
   en:{ name:'Safar', occ:'Patience and perseverance — warm desert tones', badge:'Safar Homework', title:'The Patience & Perseverance Challenge!', sub:'Patience perfects recitation.. let’s go, hero!', enc:['Beautiful patience, keep going! 🏜️','Every try brings you closer','Well done, steady on the path'], done:'The fruit of your patience is great!', medal:'Perseverance Medal' },
   L:['#f6ece2','#fffaf4','#3a1f12','#7a5a49','#9a3f1d','#ffffff','#d98a3d','#2b1400','#fbefe0','#d9a77a','#f1dfcb','#e6d2bb'],
   D:['#1a0f0a','#271710','#f6e6d9','#c9a994','#f0a77a','#2a1205','#e6a04f','#2a1400','#301c13','#8a5a3a','#3a2418','#4a3022'] },
 { n:3, icon:'🌿', glyph:'❀', pat:'dots', corner:'❀', conf:['🌿','🌸','🍃'],
   ar:{ name:'رَبيع الأول', occ:'شهر مولد النبي ﷺ — القبة الخضراء للمسجد النبوي', badge:'واجب ربيع الأول', title:'ربيعُ قلبك مع القرآن!', sub:'في شهر مولد نبينا ﷺ.. صلِّ عليه وهيا نبدأ!', enc:['أزهرت إجابتك! 🌿','نموّ جميل يوماً بعد يوم','ما شاء الله، تقدّم ممتاز'], done:'أزهر إنجازك هذا الشهر!', medal:'وسام الربيع' },
   en:{ name:'Rabi‘ al-Awwal', occ:'The month of the Prophet’s ﷺ birth — the Green Dome of the Prophet’s Mosque', badge:'Rabi‘ I Homework', title:'Spring for your heart with the Qur’an!', sub:'In the month of our Prophet’s ﷺ birth.. send blessings upon him and let’s begin!', enc:['Your answer bloomed! 🌿','Lovely growth day by day','MashaAllah, excellent progress'], done:'Your achievement bloomed this month!', medal:'Spring Medal' },
   L:['#eaf6ee','#fbfffc','#0f2a1b','#4a6b57','#14693f','#ffffff','#e0c24a','#2b2300','#effaf2','#7fc59a','#d9f0e1','#c4e3cf'],
   D:['#08140d','#10241a','#e5f6ec','#a4c7b2','#6fd49b','#06210f','#e6cb5a','#231c00','#14301f','#3f8a5f','#1a3a28','#25503a'] },
 { n:4, icon:'🌸', glyph:'✿', pat:'waves', corner:'✿', conf:['🌸','🌷','🦋'],
   ar:{ name:'رَبيع الآخر', occ:'هلال وورود ناعمة — وردي لطيف', badge:'واجب ربيع الآخر', title:'بستان الحفظ يزهر!', sub:'اقطف أجمل الآيات اليوم.. هل أنت جاهز؟', enc:['إجابة جميلة كالوردة! 🌸','لطيف وهادئ ومتقن','أحسنت، واصل القطف'], done:'بستانك مليء بالإنجازات!', medal:'وسام الوردة' },
   en:{ name:'Rabi‘ al-Akhir', occ:'Soft blossoms and calm — gentle rose tones', badge:'Rabi‘ II Homework', title:'The memorization garden blooms!', sub:'Pick the loveliest ayat today.. ready?', enc:['A beautiful answer, like a rose! 🌸','Gentle, calm and precise','Well done, keep picking'], done:'Your garden is full of achievements!', medal:'Rose Medal' },
   L:['#f9ecef','#fffafb','#3a1520','#7a4f5c','#a3214a','#ffffff','#d4a24a','#2b1a00','#fdeff2','#e3a2b4','#f6dce3','#ecc9d3'],
   D:['#1a0b11','#281219','#fbe5ea','#d0a3b0','#f08aa8','#2e0a16','#e5b055','#281700','#32161f','#8e3f58','#3c1c27','#502c38'] },
 { n:5, icon:'✅', glyph:'✓', pat:'spark', corner:'✓', conf:['✅','💚','✨'],
   ar:{ name:'جُمادى الأولى', occ:'قيمة الشهر: الصدق — «عليكم بالصدق فإن الصدق يهدي إلى البرّ»', badge:'واجب جمادى الأولى', title:'اختر الصدق.. تكن سعيدًا!', sub:'الصدق راحة للقلب وثقة من الناس.. هيا يا بطل!', enc:['صادق وأمين، أحسنت! ✅','الصدق يهدي إلى البرّ','ما شاء الله، طريقك نور'], done:'صدقتَ في عملك.. بارك الله فيك!', medal:'وسام الصدق', cap:'الصدق يهدي إلى الجنّة', quote:'«عليكم بالصدق فإن الصدق يهدي إلى البرّ»', prog:'الصدق راحة للقلب' },
   en:{ name:'Jumada al-Ula', occ:'Value of the month: honesty — “Hold fast to truthfulness, for truthfulness leads to righteousness”', badge:'Jumada I Homework', title:'Choose honesty.. be happy!', sub:'Honesty brings peace to the heart and trust from people.. let’s go, hero!', enc:['Honest and trustworthy, well done! ✅','Truthfulness leads to righteousness','MashaAllah, your path is light'], done:'You were honest in your work.. barakAllahu feek!', medal:'Honesty Medal', cap:'Honesty leads to Paradise', quote:'“Hold fast to truthfulness, for truthfulness leads to righteousness”', prog:'Honesty is peace for the heart' },
   L:['#e9f4fa','#fafdff','#0c2433','#476579','#0b6a8f','#ffffff','#7cc4e0','#06222f','#eef8fd','#86c1dc','#d6ebf6','#c2dfee'],
   D:['#08141c','#0f2330','#e4f3fb','#a2c4d6','#6cc3ea','#06212d','#8fd3ee','#05222e','#122c3d','#3a7a9a','#183649','#24506a'] },
 { n:6, icon:'🌨️', glyph:'❖', pat:'grid', corner:'❖', conf:['🌨️','⛄','✨'],
   ar:{ name:'جُمادى الآخرة', occ:'قيمة الشهر: حسن الخُلُق — «كان خُلُقه القرآن»', badge:'واجب جمادى الآخرة', title:'خُلُقك من القرآن!', sub:'تعلّم من القرآن أجمل الأخلاق.. هيا يا بطل!', enc:['خُلُق رفيع، أحسنت! 🌟','قرآن وأخلاق وإتقان','ما شاء الله، قدوة طيبة'], done:'أخلاقك مع حفظك نور.. بارك الله فيك!', medal:'وسام الخُلُق' },
   en:{ name:'Jumada al-Akhira', occ:'Value of the month: good character — “His character was the Qur’an”', badge:'Jumada II Homework', title:'Your character from the Qur’an!', sub:'Learn the finest manners from the Qur’an.. let’s go, hero!', enc:['Noble character, well done! 🌟','Qur’an, manners and precision','MashaAllah, a good role model'], done:'Your manners with your memorization are light.. barakAllahu feek!', medal:'Character Medal' },
   L:['#e8f3fa','#fbfdff','#10283a','#4a6479','#1f6f9a','#ffffff','#f0b73a','#2b1d00','#f1f8fd','#8fc3e0','#dcecf7','#c9e0ef'],
   D:['#0a1722','#122a3d','#e6f2fa','#a6c2d4','#6bb8e6','#06202f','#f0c24d','#281c00','#16324a','#3f7ea8','#1b3a55','#27506f'] },
 { n:7, icon:'✨', glyph:'✧', pat:'spark', corner:'✧', conf:['✨','🌟','🌌'],
   ar:{ name:'رَجَب', occ:'من الأشهر الحُرُم — ليل صافٍ ونجوم', badge:'واجب شهر رجب', title:'رحلة بين النجوم والآيات!', sub:'في الشهر الحرام نزداد قرباً.. هل أنت مستعد؟', enc:['نجمة جديدة لك! ✨','تألّقت في الإجابة','ما شاء الله، ارتقاء جميل'], done:'سطعتَ كنجمٍ في سماء رجب!', medal:'وسام النجمة' },
   en:{ name:'Rajab', occ:'One of the sacred months — clear night and stars', badge:'Rajab Homework', title:'A journey among stars and ayat!', sub:'In the sacred month we draw closer.. ready?', enc:['A new star for you! ✨','You shone in that answer','MashaAllah, beautiful rise'], done:'You shone like a star in Rajab’s sky!', medal:'Star Medal' },
   L:['#eeeaf8','#fcfbff','#1c1236','#5b5180','#5b34a8','#ffffff','#e8c04a','#2a1f00','#f3effc','#a591d6','#e3dcf5','#d3c9ee'],
   D:['#0d0a1c','#181332','#ece7fb','#b3a9d8','#b49cf5','#1a0e3a','#f0cd5c','#2a2000','#1d1740','#5f4ca6','#261e52','#372d6e'] },
 { n:8, icon:'🌅', glyph:'❋', pat:'waves', corner:'❋', conf:['🌅','🌙','✨'],
   ar:{ name:'شَعبان', occ:'التهيّؤ لرمضان — غروب بنفسجي وعنبري', badge:'واجب شهر شعبان', title:'استعد لرمضان بالقرآن!', sub:'يقترب الشهر الكريم.. جهّز قلبك ولسانك!', enc:['تهيّؤ موفق! 🌅','رمضان على الأبواب','أحسنت، قلبك جاهز'], done:'أنت تستعد بأجمل صورة!', medal:'وسام الاستعداد' },
   en:{ name:'Sha‘ban', occ:'Getting ready for Ramadan — violet-amber sunset', badge:'Sha‘ban Homework', title:'Get ready for Ramadan with the Qur’an!', sub:'The blessed month nears.. prepare heart and tongue!', enc:['Great preparation! 🌅','Ramadan is at the door','Well done, your heart is ready'], done:'You are preparing in the best way!', medal:'Readiness Medal' },
   L:['#f4eaf0','#fffafd','#301528','#755065','#8a2a6a','#ffffff','#f0a23a','#2a1500','#faeff6','#d49bbf','#f0dce9','#e4c7d8'],
   D:['#180b15','#261220','#f8e6f1','#cca3bd','#e48fc6','#2e0a22','#f2ae4c','#281500','#301729','#86467a','#3b1d33','#50304a'] },
 { n:9, icon:'🏮', glyph:'☪', pat:'diamond', corner:'☪', conf:['🏮','🌙','⭐'],
   ar:{ name:'رَمَضان', occ:'شهر القرآن — تمر وفانوس على سماء كحلية', badge:'واجب شهر رمضان', title:'تحدّي شهر القرآن!', sub:'شهرٌ أُنزل فيه القرآن.. هل أنت مستعد يا بطل؟', enc:['رمضان كريم! 🏮','نور على نور','ما شاء الله، همّة عالية'], done:'أنرتَ رمضان بإنجازك!', medal:'وسام الفانوس' },
   en:{ name:'Ramadan', occ:'The month of the Qur’an — navy, gold and a lantern', badge:'Ramadan Homework', title:'The Month-of-the-Qur’an Challenge!', sub:'The month in which the Qur’an was revealed.. ready, hero?', enc:['Ramadan Kareem! 🏮','Light upon light','MashaAllah, high spirit'], done:'You lit up Ramadan with your success!', medal:'Lantern Medal' },
   L:['#f4efe0','#fffdf3','#0e1b3d','#4b5878','#14275e','#ffffff','#d4a62a','#261c00','#fbf3d6','#d2ad45','#f1e6bd','#e4d7a5'],
   D:['#070d1f','#0f1a3a','#f1ecd6','#b5bdd6','#f0c94f','#1b1500','#8ea6ff','#070d1f','#142250','#b8962f','#1c2c63','#2b3d7a'] },
 { n:10, icon:'🎉', glyph:'✺', pat:'dots', corner:'✺', conf:['🎉','🎊','🎈'],
   ar:{ name:'شَوّال', occ:'فرحة العيد — مرجاني وفيروزي', badge:'واجب شهر شوال', title:'عيدٌ سعيد وتحدٍّ سعيد!', sub:'بعد رمضان تواصل الهمّة.. هيا نحتفل بالقرآن!', enc:['عيدك مبارك! 🎉','فرحة إنجاز جديدة','أحسنت، همّتك لا تهدأ'], done:'إنجاز بحجم فرحة العيد!', medal:'وسام العيد' },
   en:{ name:'Shawwal', occ:'The joy of Eid — coral and turquoise', badge:'Shawwal Homework', title:'A happy Eid and a happy challenge!', sub:'The momentum continues after Ramadan.. let’s celebrate the Qur’an!', enc:['Eid Mubarak! 🎉','A new joy of achievement','Well done, your drive never rests'], done:'An achievement as big as Eid joy!', medal:'Eid Medal' },
   L:['#fff0e8','#fffaf7','#3a1710','#855244','#0f766e','#ffffff','#ff8a5c','#3a1000','#fff3ea','#f0a78a','#fddccd','#f3cbb8'],
   D:['#1c0e0a','#2a1612','#fde9df','#d0a496','#4fd1c1','#04211e','#ff9a72','#3a1100','#341b15','#a65a44','#40231b','#55342a'] },
 { n:11, icon:'🕊️', glyph:'❦', pat:'stripes', corner:'❦', conf:['🕊️','🍃','✨'],
   ar:{ name:'ذو القَعدة', occ:'من الأشهر الحُرُم — سلام وسكينة، القدس والأقصى', badge:'واجب ذي القعدة', title:'سلامٌ وسكينة مع القرآن!', sub:'شهر حرام وسلام.. اقرأ بقلب هادئ يا بطل!', enc:['سكينة وإتقان! 🕊️','هدوء جميل في الأداء','ما شاء الله، تدبّر رائع'], done:'إنجازٌ يغمره السلام!', medal:'وسام السكينة' },
   en:{ name:'Dhul Qa‘dah', occ:'A sacred month — peace and tranquility, Jerusalem and Al-Aqsa', badge:'Dhul Qa‘dah Homework', title:'Peace and tranquility with the Qur’an!', sub:'A sacred month of peace.. read with a calm heart, hero!', enc:['Calm and precise! 🕊️','Beautiful serenity in your work','MashaAllah, wonderful reflection'], done:'An achievement wrapped in peace!', medal:'Serenity Medal' },
   L:['#f0f1e2','#fcfdf5','#232a10','#5d6740','#5a6b17','#ffffff','#d1a93c','#2a2000','#f5f6e6','#a8b26a','#e3e7c6','#d3d9ad'],
   D:['#10130a','#1b2010','#eef2d9','#b6bf93','#b5c95a','#1a2204','#e0bc4c','#262000','#232a14','#6c7a35','#2c3419','#3c4725'] },
 { n:12, icon:'🕋', glyph:'۞', pat:'diamond', corner:'۞', conf:['🕋','🌟','✨'],
   ar:{ name:'ذو الحِجّة', occ:'الحج وعرفة والعيد — أسود وذهبي وأبيض', badge:'واجب ذي الحجة', title:'لبّيك.. تحدّي الأيام العشر!', sub:'أفضل الأيام.. أكثر فيها من القرآن والذكر!', enc:['لبّيك اللهم لبّيك! 🕋','عشر مباركة، أحسنت','ما شاء الله، بارك الله فيك'], done:'ختمتَ العام بأجمل الإنجازات!', medal:'وسام الحجيج' },
   en:{ name:'Dhul Hijjah', occ:'Hajj, ‘Arafah and Eid — black, gold and white', badge:'Dhul Hijjah Homework', title:'Labbayk.. the Ten Days Challenge!', sub:'The best of days.. increase your Qur’an and dhikr!', enc:['Labbayk Allahumma labbayk! 🕋','Blessed ten days, well done','MashaAllah, barakAllahu feek'], done:'You closed the year with great achievements!', medal:'Pilgrim Medal' },
   L:['#efeeea','#ffffff','#121212','#55524b','#1a1a1a','#ffffff','#c9a227','#261d00','#faf6e6','#c9a227','#ebe7d6','#d9d5c3'],
   D:['#0b0b0b','#171717','#f3f0e6','#b5b0a0','#e6c24c','#1a1400','#f1f0ea','#141414','#1f1c10','#a8872a','#272414','#38341f'] }
];

// ملاحظات الأصول: ORI = جهة ثقل زخرفة الزاوية في ملفها الأصلي (تُقلب لتوضع أعلى البطاقة)؛ STRIP/MEDALP = صورة مخصصة لشريط
// الحل/الوسام الدائري؛ DECO = صورة علوية في شاشة الإنجاز؛ MEDAL_IMG = وسام جاهز بدل الدائرة؛ LOGO_END = شعار في آخر صفحة.
export const FLAGS = {
    ORI: { 1: 'bl', 2: 'tl', 3: 'bl', 4: 'bl', 7: 'br', 8: 'bl', 10: 'bl', 12: 'bl' },
    STRIP: { 5: 1, 6: 1, 7: 1, 11: 1 },
    MEDALP: { 6: 1, 7: 1, 11: 1 },
    DECO: { 8: 1, 9: 1, 10: 1 },
    MEDAL_IMG: { 5: 1, 9: 1 },
    PROG: { 5: 'path' },   // شريط تقدّم مخصّص: path = مسار من الغيم إلى الشمس ورأس الطفل عند حدّ التقدّم
    LOGO_END: { 6: 1 }
};

export const COLOR_KEYS = ['bg', 'surface', 'ink', 'ink2', 'accent', 'onAccent', 'hi', 'onHi', 'frame', 'frameLine', 'chip', 'line'];
const pad = n => String(n).padStart(2, '0');

// الشهر الهجري (1..12) لتاريخ معيّن؛ 0 إن تعذّر الحساب (متصفح بلا دعم) فلا تُطبَّق ثيمة.
export function hijriMonth(date) {
    try {
        const m = parseInt(new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric' }).format(date || new Date()), 10);
        return m >= 1 && m <= 12 ? m : 0;
    } catch (e) { return 0; }
}

// الشهر المعتمد: تجاوز اختباري (?hm= أو localStorage.dh_hm) ثم الشهر الهجري الحالي. 'off' = بلا ثيمة.
export function activeMonth(opts) {
    const o = opts || {};
    let force = o.force;
    if (force == null) {
        try { force = new URLSearchParams(o.search != null ? o.search : (typeof location !== 'undefined' ? location.search : '')).get('hm'); } catch (e) { force = null; }
    }
    if (force == null) { try { force = typeof localStorage !== 'undefined' ? localStorage.getItem('dh_hm') : null; } catch (e) { force = null; } }
    if (force === 'off') return 0;
    const f = parseInt(force, 10);
    if (f >= 1 && f <= 12) return f;
    return hijriMonth(o.date);
}

export function getTheme(n) { return THEMES.find(t => t.n === n) || null; }
export function themeColors(th, dark) { const a = dark ? th.D : th.L; const o = {}; COLOR_KEYS.forEach((k, i) => { o[k] = a[i]; }); return o; }
// مسار ملف أصل: يُحسب نسبةً لهذا الملف فيعمل من أي صفحة.
export function assetUrl(n, kind, base) {
    const b = base || new URL('../assets/themes/', import.meta.url).href;
    return b + 'm' + pad(n) + '-' + kind + '.webp';
}
// عبارة التشجيع حسب نسبة الإجابات (n = عدد المجاب، total = العدد الكلي). تُرجع null لحالة الاكتمال (تبقى العبارة الافتراضية).
export function encouragement(th, lang, n, total) {
    const e = th[lang === 'en' ? 'en' : 'ar'].enc, frac = total ? n / total : 0;
    if (frac >= 1) return null;
    return n === 1 ? e[0] : frac >= 0.5 ? e[2] : e[1];
}
