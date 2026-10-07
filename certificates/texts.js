// certificates/texts.js
// ==========================================================
// 🏅 بنك نصوص الشهادات الجاهزة — ثنائي اللغة (ar/en): أنواع الشهادات + صيغ متعددة لكل نوع + آيات وأحاديث.
// كل صيغة دالة تستلم s (قيم مُهرَّبة بـ esc مسبقاً: name, what, f = طالبة؟) وتُرجع HTML صغيراً (<b> فقط للإبراز)،
// وتراعي المذكر/المؤنث. لغة الشهادة (spec.lang) مستقلة عن لغة واجهة المنصة: قد يُصدر المعلم شهادة عربية من واجهة إنجليزية والعكس.
// الترجمة الإنجليزية للآيات بمعنى (Sahih International) وللأحاديث بنص معنى مختصر، مع ذكر المصدر.
// ==========================================================

// ترتيب الأجزاء الـ30 لاسم الجزء ("الجزء الخامس")
export const JUZ_ORD = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر',
    'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون',
    'الحادي والعشرون', 'الثاني والعشرون', 'الثالث والعشرون', 'الرابع والعشرون', 'الخامس والعشرون', 'السادس والعشرون', 'السابع والعشرون',
    'الثامن والعشرون', 'التاسع والعشرون', 'الثلاثون'];

// أسماء الأجزاء المعروفة (جزء عمّ، جزء تبارك...) — تُكتب هكذا في الشهادة بدل الترتيب العددي
export const JUZ_NAMES_AR = ['الم', 'سيقول', 'تلك الرسل', 'لن تنالوا', 'والمحصنات', 'لا يحب الله', 'وإذا سمعوا', 'ولو أننا', 'قال الملأ', 'واعلموا',
    'يعتذرون', 'وما من دابة', 'وما أبرئ', 'ربما', 'سبحان', 'قال ألم', 'اقترب', 'قد أفلح', 'وقال الذين', 'أمّن خلق',
    'اتل ما أوحي', 'ومن يقنت', 'وما لي', 'فمن أظلم', 'إليه يردّ', 'حم', 'قال فما خطبكم', 'قد سمع', 'تبارك', 'عمّ'];

export const juzName = (n, lang) => (lang === 'en'
    ? `Juz' ${n}` + (n === 30 ? " (Juz' Amma)" : '')
    : 'جزء ' + JUZ_NAMES_AR[n - 1]);

// ---------- أدوات الصياغة العربية حسب الجنس ----------
const stu = (s) => (s.f ? 'الطالبة' : 'الطالب');
const lstu = (s) => (s.f ? 'للطالبة' : 'للطالب');
const t = (s) => (s.f ? 'ت' : '');              // أتمّ / أتمّت
const h = (s) => (s.f ? 'ها' : 'ه');            // ضمير الغائب: له / لها
const you = (s) => (s.f ? 'تِ' : 'تَ');         // أتممتَ / أتممتِ
const ka = (s) => (s.f ? 'كِ' : 'كَ');
const lh = (s) => (s.f ? 'لها' : 'له');
const ya = (s) => (s.f ? 'ا' : '');             // جزاه / جزاها

// ---------- أدوات الصياغة الإنجليزية حسب الجنس ----------
const he = (s) => (s.f ? 'she' : 'he');
const his = (s) => (s.f ? 'her' : 'his');
const him = (s) => (s.f ? 'her' : 'him');
const feek = (s) => (s.f ? 'feeki' : 'feek');

// ============================ العربية ============================
const HIFZ_AR = [
    (s) => `يشهد المعلم بأنّ ${stu(s)} <b>${s.name}</b> قد أتمّ${t(s)} حفظ <b>${s.what}</b> بفضل الله وتوفيقه، ثم بجدّ${h(s)} واجتهاد${h(s)}. نسأل الله أن ينفع${h(s)} بما حفظ، وأن يجعل القرآن ربيع قلب${h(s)}.`,
    (s) => `بارك الله ${s.f ? 'فيكِ' : 'فيكَ'} يا <b>${s.name}</b>! لقد أتمم${you(s)} حفظ <b>${s.what}</b> بإتقان، فهنيئاً ${s.f ? 'لكِ' : 'لكَ'} هذا الإنجاز، وزادك الله حرصاً وتوفيقاً وجعل القرآن رفيقك دائماً.`,
    (s) => `تقديراً لحرص ${stu(s)} <b>${s.name}</b> على كتاب الله، وبمناسبة إتمام${h(s)} حفظ <b>${s.what}</b>، تُمنح هذه الشهادة، سائلين الله ${lh(s)} الثبات والإتقان والبركة في العلم والعمر.`,
    (s) => `أتمّ${t(s)} ${stu(s)} <b>${s.name}</b> حفظ <b>${s.what}</b> مع العناية بالتجويد وحسن الأداء، فجزاه${ya(s)} الله خيراً، ونسأله سبحانه أن يثبّت${h(s)} على حفظ كتابه ويرفع قدر${h(s)} به في الدنيا والآخرة.`,
    (s) => `مبارك ${s.f ? 'لكِ' : 'لكَ'} يا <b>${s.name}</b> إتمام حفظ <b>${s.what}</b>. نفع الله ${s.f ? 'بكِ' : 'بكَ'} وبحفظك، وجعل${ka(s)} من أهل القرآن العاملين به.`
];
const REVIEW_AR = [
    (s) => `تقديراً لالتزام ${stu(s)} <b>${s.name}</b> بمراجعة محفوظ${h(s)} وتميّز${h(s)} في إتقان <b>${s.what}</b>. جزاه${ya(s)} الله خيراً، وزاد${h(s)} حرصاً وثباتاً على كتابه الكريم.`,
    (s) => `يشهد المعلم بأنّ ${stu(s)} <b>${s.name}</b> قد تميّز${t(s)} في <b>${s.what}</b> بالمداومة على المراجعة وضبط المحفوظ، فبارك الله في جهد${h(s)} ونفع${h(s)} بما حفظ.`,
    (s) => `ثباتُ الحفظ بالمراجعة، وقد أحسن${t(s)} ${stu(s)} <b>${s.name}</b> في <b>${s.what}</b> إحساناً يستحق الشكر والتقدير، فنسأل الله ${lh(s)} المزيد من التوفيق والسداد.`,
    (s) => `بكل فخر نمنح ${stu(s)} <b>${s.name}</b> هذه الشهادة تقديراً لتميّز${h(s)} في <b>${s.what}</b>، وحرص${h(s)} على مراجعة ما حفظ من كتاب الله.`
];
const KHATM_AR = [
    (s) => `الحمد لله الذي بنعمته تتمّ الصالحات؛ يشهد المعلم بأنّ ${stu(s)} <b>${s.name}</b> قد أتمّ${t(s)} <b>حفظ القرآن الكريم كاملاً</b>، فنسأل الله أن يتقبّل منه${ya(s)} وأن ينفع بحفظ${h(s)} الأمة، وأن يجعل${h(s)} من أهل القرآن العاملين به.`,
    (s) => `هنيئاً لك يا <b>${s.name}</b> هذا الفضل العظيم؛ فقد أتمم${you(s)} <b>حفظ القرآن الكريم كاملاً</b>. زادك الله علماً وعملاً، ورزقك الإخلاص والثبات إلى أن تلقاه.`,
    (s) => `تتشرّف الحلقة بتكريم ${stu(s)} <b>${s.name}</b> على <b>ختم حفظ القرآن الكريم كاملاً</b>، وهو إنجاز يستحق الفخر والدعاء، نسأل الله أن يبارك فيه ويكتب ${lh(s)} أجره.`
];
const TAJWEED_AR = [
    (s) => `تقديراً لتميّز ${stu(s)} <b>${s.name}</b> في أحكام التجويد وحسن الأداء${s.what ? '، وبخاصة في <b>' + s.what + '</b>' : ''}. جزاه${ya(s)} الله خيراً، وزاد${h(s)} إتقاناً وترتيلاً.`,
    (s) => `يشهد المعلم بأنّ ${stu(s)} <b>${s.name}</b> قد أحسن${t(s)} في التجويد${s.what ? ' (<b>' + s.what + '</b>)' : ''} وتلاوة القرآن الكريم كما أُنزل، فبارك الله في جهد${h(s)} وصوت${h(s)}.`,
    (s) => `ترتيلٌ وإتقان؛ ${stu(s)} <b>${s.name}</b> نموذج في حسن الأداء وتطبيق أحكام التجويد${s.what ? ' في <b>' + s.what + '</b>' : ''}. نسأل الله ${lh(s)} المزيد من التوفيق.`
];
const MONTH_AR = [
    (s) => `تقديراً لجهد ${stu(s)} <b>${s.name}</b> وتميّز${h(s)} وحسن التزام${h(s)}، يُمنح لقب <b>${s.f ? 'طالبة' : 'طالب'} ${s.what}</b>. بارك الله فيه${ya(s)} وزاد${h(s)} حرصاً ونجاحاً.`,
    (s) => `يسرّنا أن نعلن اختيار ${stu(s)} <b>${s.name}</b> <b>${s.f ? 'طالبة' : 'طالب'} ${s.what}</b> لما أظهر${t(s)} من اجتهاد وانضباط وحرص على كتاب الله. فهنيئاً ${lh(s)} هذا التكريم.`,
    (s) => `لأنّ الاجتهاد يستحق التقدير، نمنح ${stu(s)} <b>${s.name}</b> هذه الشهادة بمناسبة اختيار${h(s)} <b>${s.f ? 'طالبة' : 'طالب'} ${s.what}</b>، سائلين الله ${lh(s)} دوام التوفيق.`
];
const COMMIT_AR = [
    (s) => `شكراً وتقديراً ${lstu(s)} <b>${s.name}</b> على مواظبت${h(s)} والتزام${h(s)}${s.what ? ' <b>' + s.what + '</b>' : ' بحضور الحلقة'}، فبارك الله فيه${ya(s)} وجعل${h(s)} من المحافظين على كتابه.`,
    (s) => `من علامات التوفيق المواظبة؛ وقد كان ${stu(s)} <b>${s.name}</b> مثالاً في الالتزام${s.what ? ' <b>' + s.what + '</b>' : ' والحضور'}. جزاه${ya(s)} الله خيراً ونفع به.`,
    (s) => `تقديراً لانضباط ${stu(s)} <b>${s.name}</b> وحرص${h(s)} الدائم${s.what ? ' <b>' + s.what + '</b>' : ' على الحضور والمتابعة'}، وفّق${h(s)} الله لكل خير.`
];
const THANKS_AR = [
    (s) => `تتقدّم الحلقة بخالص الشكر والتقدير ${lstu(s)} <b>${s.name}</b>${s.what ? ' <b>' + s.what + '</b>' : ' على جهد' + h(s) + ' المبارك وحسن خلق' + h(s)}، فجزاه${ya(s)} الله خيراً، وبارك في علم${h(s)} وعمل${h(s)}.`,
    (s) => `شكراً لك يا <b>${s.name}</b>${s.what ? ' <b>' + s.what + '</b>' : ' على اجتهادك وحسن تعاملك'}. ${s.f ? 'جعلكِ' : 'جعلكَ'} الله مباركاً أينما كنت${s.f ? 'ِ' : ''}، وزادك علماً ونفعاً.`,
    (s) => `عرفاناً بالفضل وتقديراً للجهد، تُهدى هذه الشهادة إلى ${stu(s)} <b>${s.name}</b>${s.what ? ' <b>' + s.what + '</b>' : ''}. نسأل الله أن يكتب ${lh(s)} أجر ما قدّم${t(s)} ويبارك في عمل${h(s)}.`
];

// ============================ الإنجليزية ============================
const HIFZ_EN = [
    (s) => `The teacher certifies that the student <b>${s.name}</b> has completed the memorization of <b>${s.what}</b>, by the grace and success of Allah, and through ${his(s)} own diligence and effort. We ask Allah to benefit ${him(s)} with what ${he(s)} has memorized and to make the Qur'an the delight of ${his(s)} heart.`,
    (s) => `Barakallahu ${feek(s)}, <b>${s.name}</b>! You have completed the memorization of <b>${s.what}</b> with excellence. Congratulations on this achievement. May Allah increase you in dedication and success, and keep the Qur'an your constant companion.`,
    (s) => `In appreciation of the student <b>${s.name}</b>'s devotion to the Book of Allah, and on the occasion of completing the memorization of <b>${s.what}</b>, this certificate is awarded. We ask Allah to grant ${him(s)} steadfastness, mastery, and blessing in knowledge and in life.`,
    (s) => `The student <b>${s.name}</b> has completed the memorization of <b>${s.what}</b> with attention to Tajweed and beautiful recitation. May Allah reward ${him(s)} with goodness, keep ${him(s)} firm upon memorizing His Book, and raise ${his(s)} rank by it in this life and the Hereafter.`,
    (s) => `Congratulations, <b>${s.name}</b>, on completing the memorization of <b>${s.what}</b>. May Allah benefit others through you and your memorization, and make you among the people of the Qur'an who act upon it.`
];
const REVIEW_EN = [
    (s) => `In appreciation of the student <b>${s.name}</b>'s commitment to reviewing ${his(s)} memorization and ${his(s)} excellence in <b>${s.what}</b>. May Allah reward ${him(s)} and increase ${him(s)} in dedication and steadfastness upon His noble Book.`,
    (s) => `The teacher certifies that the student <b>${s.name}</b> has excelled in <b>${s.what}</b> through consistent review and careful retention. May Allah bless ${his(s)} effort and benefit ${him(s)} with what ${he(s)} has memorized.`,
    (s) => `Memorization is made firm through review, and the student <b>${s.name}</b> has done an outstanding job in <b>${s.what}</b>, worthy of thanks and appreciation. We ask Allah to grant ${him(s)} further success and guidance.`,
    (s) => `With great pride we award the student <b>${s.name}</b> this certificate in recognition of ${his(s)} excellence in <b>${s.what}</b> and ${his(s)} eagerness to review what ${he(s)} has memorized of the Book of Allah.`
];
const KHATM_EN = [
    (s) => `Praise be to Allah, by whose grace good deeds are completed. The teacher certifies that the student <b>${s.name}</b> has completed <b>the memorization of the entire Holy Qur'an</b>. We ask Allah to accept it from ${him(s)}, to benefit the Ummah through ${his(s)} memorization, and to make ${him(s)} among the people of the Qur'an who act upon it.`,
    (s) => `Congratulations, <b>${s.name}</b>, on this great blessing! You have completed <b>the memorization of the entire Holy Qur'an</b>. May Allah increase you in knowledge and action, and grant you sincerity and steadfastness until you meet Him.`,
    (s) => `The circle is honored to recognize the student <b>${s.name}</b> for <b>completing the memorization of the entire Holy Qur'an</b>, an achievement worthy of pride and prayers. We ask Allah to bless it and to write its reward for ${him(s)}.`
];
const TAJWEED_EN = [
    (s) => `In appreciation of the student <b>${s.name}</b>'s excellence in the rules of Tajweed and beautiful recitation${s.what ? ', particularly in <b>' + s.what + '</b>' : ''}. May Allah reward ${him(s)} and increase ${him(s)} in mastery and tarteel.`,
    (s) => `The teacher certifies that the student <b>${s.name}</b> has excelled in Tajweed${s.what ? ' (<b>' + s.what + '</b>)' : ''} and in reciting the Holy Qur'an as it was revealed. May Allah bless ${his(s)} effort and ${his(s)} voice.`,
    (s) => `Mastery and measured recitation: the student <b>${s.name}</b> is a model of beautiful recitation and of applying the rules of Tajweed${s.what ? ' in <b>' + s.what + '</b>' : ''}. We ask Allah to grant ${him(s)} further success.`
];
const MONTH_EN = [
    (s) => `In appreciation of the student <b>${s.name}</b>'s effort, excellence, and good commitment, ${he(s)} is awarded the title of <b>Student of ${s.what}</b>. May Allah bless ${him(s)} and increase ${him(s)} in dedication and success.`,
    (s) => `We are pleased to announce the selection of the student <b>${s.name}</b> as <b>Student of ${s.what}</b>, for the diligence, discipline, and devotion to the Book of Allah that ${he(s)} has shown. Congratulations on this honor.`,
    (s) => `Because effort deserves appreciation, we award the student <b>${s.name}</b> this certificate on being chosen <b>Student of ${s.what}</b>, asking Allah to grant ${him(s)} continued success.`
];
const COMMIT_EN = [
    (s) => `With thanks and appreciation to the student <b>${s.name}</b> for ${his(s)} regularity and commitment${s.what ? ' <b>' + s.what + '</b>' : ' in attending the circle'}. May Allah bless ${him(s)} and make ${him(s)} among those who hold fast to His Book.`,
    (s) => `Regularity is a sign of success, and the student <b>${s.name}</b> has been a model of commitment${s.what ? ' <b>' + s.what + '</b>' : ' and attendance'}. May Allah reward ${him(s)} well and benefit others through ${him(s)}.`,
    (s) => `In appreciation of the student <b>${s.name}</b>'s discipline and constant diligence${s.what ? ' <b>' + s.what + '</b>' : ' in attending and following up'}, may Allah grant ${him(s)} every good.`
];
const THANKS_EN = [
    (s) => `The circle extends its sincere thanks and appreciation to the student <b>${s.name}</b>${s.what ? ' <b>' + s.what + '</b>' : ' for ' + his(s) + ' blessed effort and good character'}. May Allah reward ${him(s)} well and bless ${his(s)} knowledge and deeds.`,
    (s) => `Thank you, <b>${s.name}</b>${s.what ? ' <b>' + s.what + '</b>' : ' for your diligence and good conduct'}. May Allah make you blessed wherever you are, and increase you in knowledge and benefit.`,
    (s) => `In recognition of the favor and in appreciation of effort, this certificate is presented to the student <b>${s.name}</b>${s.what ? ' <b>' + s.what + '</b>' : ''}. We ask Allah to write the reward of what ${he(s)} has given and to bless ${his(s)} work.`
];

// ----- أنواع الشهادات -----
// label/title/...: {ar, en} | fields: ما يختاره المعلم | whatDefault: النص لو لم يُدخل شيئاً | verse: الآية/الحديث الافتراضي
export const TYPES = [
    { id: 'surah', icon: '📖', fields: ['surah'], verse: 'khair',
      label: { ar: 'إتمام حفظ سورة', en: 'Surah memorization' }, title: { ar: 'شهادة إتمام حفظ سورة', en: 'Certificate of Surah Memorization' },
      bodies: { ar: HIFZ_AR, en: HIFZ_EN } },
    { id: 'juz', icon: '📗', fields: ['juz'], verse: 'khair',
      label: { ar: 'إتمام حفظ جزء', en: "Juz' memorization" }, title: { ar: 'شهادة إتمام حفظ جزء', en: "Certificate of Juz' Memorization" },
      bodies: { ar: HIFZ_AR, en: HIFZ_EN } },
    { id: 'half', icon: '📘', fields: ['juz', 'half'], verse: 'khair',
      label: { ar: 'إتمام نصف جزء', en: "Half-Juz' memorization" }, title: { ar: 'شهادة إتمام حفظ نصف جزء', en: "Certificate of Half-Juz' Memorization" },
      bodies: { ar: HIFZ_AR, en: HIFZ_EN } },
    { id: 'review', icon: '🔁', fields: ['text'], verse: 'maher',
      label: { ar: 'التميز في المراجعة', en: 'Excellence in review' }, title: { ar: 'شهادة التميز في المراجعة', en: 'Certificate of Excellence in Review' },
      textLabel: { ar: 'ما الذي تميّز فيه؟ (اختياري)', en: 'What did they excel in? (optional)' },
      textPlaceholder: { ar: 'مثال: مراجعة جزء عمّ', en: "e.g. reviewing Juz' Amma" },
      whatDefault: { ar: 'مراجعة المحفوظ', en: 'reviewing the memorized portions' },
      bodies: { ar: REVIEW_AR, en: REVIEW_EN } },
    { id: 'khatm', icon: '🌟', fields: [], verse: 'iqra',
      label: { ar: 'ختم القرآن الكريم', en: 'Qur\'an completion' }, title: { ar: 'شهادة ختم القرآن الكريم', en: "Certificate of Qur'an Memorization Completion" },
      bodies: { ar: KHATM_AR, en: KHATM_EN } },
    { id: 'tajweed', icon: '🎙️', fields: ['text'], verse: 'rattil',
      label: { ar: 'التميز في التجويد', en: 'Excellence in Tajweed' }, title: { ar: 'شهادة التميز في التجويد', en: 'Certificate of Excellence in Tajweed' },
      textLabel: { ar: 'حكم أو موضوع محدد (اختياري)', en: 'A specific rule or topic (optional)' },
      textPlaceholder: { ar: 'مثال: أحكام النون الساكنة والتنوين', en: 'e.g. rules of noon sakinah and tanween' },
      bodies: { ar: TAJWEED_AR, en: TAJWEED_EN } },
    { id: 'month', icon: '🏆', fields: ['monthAuto'], verse: 'yassarna',
      label: { ar: 'طالب الشهر', en: 'Student of the month' }, title: { ar: 'شهادة طالب الشهر', en: 'Student of the Month Certificate' },
      bodies: { ar: MONTH_AR, en: MONTH_EN } },
    { id: 'commit', icon: '⏰', fields: ['text'], verse: 'zidni',
      label: { ar: 'المواظبة والالتزام', en: 'Commitment & attendance' }, title: { ar: 'شهادة المواظبة والالتزام', en: 'Certificate of Commitment & Attendance' },
      textLabel: { ar: 'على ماذا؟ (اختياري)', en: 'For what? (optional)' },
      textPlaceholder: { ar: 'مثال: على الحضور طوال الفصل', en: 'e.g. for attending throughout the term' },
      bodies: { ar: COMMIT_AR, en: COMMIT_EN } },
    { id: 'thanks', icon: '🤝', fields: ['text'], verse: 'shukr',
      label: { ar: 'شكر وتقدير', en: 'Thanks & appreciation' }, title: { ar: 'شهادة شكر وتقدير', en: 'Certificate of Appreciation' },
      textLabel: { ar: 'سبب الشكر (اختياري)', en: 'Reason for thanks (optional)' },
      textPlaceholder: { ar: 'مثال: على مساعدته لزملائه', en: 'e.g. for helping classmates' },
      bodies: { ar: THANKS_AR, en: THANKS_EN } }
];
export const getType = (id) => TYPES.find(x => x.id === id) || TYPES[0];
// نص بحسب اللغة مع رجوع للعربية
export const L = (obj, lang) => (obj && (obj[lang] || obj.ar)) || '';

// ----- الآيات والأحاديث (النص العربي + ترجمة المعنى + المصدر) -----
export const VERSES = [
    { id: 'none', label: { ar: 'بدون', en: 'None' }, text: '', tr: '', ref: { ar: '', en: '' } },
    { id: 'khair', label: { ar: 'خيركم من تعلّم القرآن', en: 'The best of you learn the Qur\'an' },
      text: '«خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ»',
      tr: '"The best among you are those who learn the Qur\'an and teach it."', ref: { ar: 'رواه البخاري', en: 'Narrated by al-Bukhari' } },
    { id: 'iqra', label: { ar: 'اقرأ وارتق', en: 'Recite and ascend' },
      text: '«يُقَالُ لِصَاحِبِ الْقُرْآنِ: اقْرَأْ وَارْتَقِ وَرَتِّلْ كَمَا كُنْتَ تُرَتِّلُ فِي الدُّنْيَا، فَإِنَّ مَنْزِلَتَكَ عِنْدَ آخِرِ آيَةٍ تَقْرَؤُهَا»',
      tr: '"It will be said to the companion of the Qur\'an: Recite and ascend, and recite as you used to recite in the world, for your rank will be at the last verse you recite."',
      ref: { ar: 'رواه أبو داود والترمذي', en: 'Narrated by Abu Dawud and at-Tirmidhi' } },
    { id: 'maher', label: { ar: 'الماهر بالقرآن', en: 'The one skilled in the Qur\'an' },
      text: '«الْمَاهِرُ بِالْقُرْآنِ مَعَ السَّفَرَةِ الْكِرَامِ الْبَرَرَةِ»',
      tr: '"The one who is skilled in the Qur\'an will be with the noble and obedient angels."', ref: { ar: 'متفق عليه', en: 'Agreed upon (al-Bukhari and Muslim)' } },
    { id: 'rattil', label: { ar: 'ورتّل القرآن ترتيلاً', en: 'Recite with measured recitation' },
      text: '﴿وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا﴾', tr: '"...and recite the Qur\'an with measured recitation."', ref: { ar: 'المزمل: ٤', en: 'Al-Muzzammil 73:4' } },
    { id: 'aqwam', label: { ar: 'يهدي للتي هي أقوم', en: 'Guides to what is most suitable' },
      text: '﴿إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ﴾', tr: '"Indeed, this Qur\'an guides to that which is most suitable."', ref: { ar: 'الإسراء: ٩', en: 'Al-Isra 17:9' } },
    { id: 'yassarna', label: { ar: 'ولقد يسّرنا القرآن', en: 'We made the Qur\'an easy' },
      text: '﴿وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ﴾',
      tr: '"And We have certainly made the Qur\'an easy for remembrance, so is there any who will remember?"', ref: { ar: 'القمر: ١٧', en: 'Al-Qamar 54:17' } },
    { id: 'ihsan', label: { ar: 'هل جزاء الإحسان', en: 'Is the reward of goodness' },
      text: '﴿هَلْ جَزَاءُ الْإِحْسَانِ إِلَّا الْإِحْسَانُ﴾', tr: '"Is the reward for good [anything] but good?"', ref: { ar: 'الرحمن: ٦٠', en: 'Ar-Rahman 55:60' } },
    { id: 'zidni', label: { ar: 'ربّ زدني علماً', en: 'My Lord, increase me in knowledge' },
      text: '﴿وَقُل رَّبِّ زِدْنِي عِلْمًا﴾', tr: '"And say, \'My Lord, increase me in knowledge.\'"', ref: { ar: 'طه: ١١٤', en: 'Ta-Ha 20:114' } },
    { id: 'shukr', label: { ar: 'من لا يشكر الناس', en: 'Whoever does not thank people' },
      text: '«لَا يَشْكُرُ اللَّهَ مَنْ لَا يَشْكُرُ النَّاسَ»',
      tr: '"Whoever does not thank people has not thanked Allah."', ref: { ar: 'رواه أبو داود والترمذي', en: 'Narrated by Abu Dawud and at-Tirmidhi' } }
];
export const getVerse = (id) => VERSES.find(v => v.id === id) || VERSES[0];
