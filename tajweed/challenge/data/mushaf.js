// data/mushaf.js — محتوى قسم «تعرّف على مصحفك» (٧ دروس) ثنائي اللغة.
//
// المصدر: نصوص الدروس وتعريفات العلامات منسوخة من نصوص المنصة المعتمدة (core/i18nMushaf.js — «تعريفات العلامات مأخوذة من دليل المصحف
// المطبوع: علامات الوقف ومصطلحات الضبط») وبنية الدروس والأسئلة من engine/tajweedMushaf.js ومعاينة docs/review/tajweed-mushaf-stage-preview.html.
// صور الفانوس واللوحة والوردة والسجدة: نسخ من assets/tajweed/mushaf (مقتطعة من صور المصحف المطبوع، انظر assets/mushaf/SOURCE.md).
// لا نص آيات هنا: الأمثلة تُستخرج من data/pool.js. ما أضفتُه أنا (أسئلة الحقائق الإضافية، صياغة الخيارات) موسوم review.
const T = (ar, en) => ({ ar, en });
// مسار أصل ثابت بالنسبة لهذا الملف (الوحدة تُحمَّل من صفحة المنصة، فلا تصلح المسارات النسبية للصفحة)
export const A = (p) => new URL('../assets/' + p, import.meta.url).href;

export const MUSHAF_FACTS = { juz: 30, hizb: 60, quarter: 240 };

// code: الرمز كما في نص المصحف. demo: عرض العلامة على حرف حامل (العلامة وحدها بلا حرف تُرسم شكلاً مختلفًا). where: 'wq' علامة مستقلة بين الكلمات، 'word' على حرف داخل كلمة.
export const SIGNS = {
  ayah_end: { lesson: 'ayah_number', glyph: '﴿١﴾', name: T('رقم الآية', 'Ayah number'), def: T('للدلالة على نهاية الآية ورقمها: الرقم دائماً بعد الآية لا قبلها.', 'Marks the end of the ayah and its number: the number always comes after the ayah, never before it.') },
  rub_mark: { lesson: 'juz_hizb', code: '۞', glyph: '۞', where: 'lead', name: T('علامة الربع', 'Quarter mark'), def: T('للدلالة على بداية الأجزاء والأحزاب وأنصافها وأرباعها (ويقابلها فانوس الهامش).', 'Marks the start of a juz, hizb, half-hizb or quarter-hizb (the margin lantern appears beside it).') },
  waqf_lazim: { lesson: 'waqf', code: 'ۘ', glyph: 'ـۘـ', abbr: 'م', where: 'wq', name: T('وقف لازم (م)', 'Compulsory stop (م)'), def: T('تفيد لزوم الوقف: يجب الوقوف عندها لأن الوصل يغيّر المعنى.', 'Means a stop is required: you must stop here, because continuing would change the meaning.') },
  waqf_jaiz: { lesson: 'waqf', code: 'ۚ', glyph: 'ـۚـ', abbr: 'ج', where: 'wq', name: T('وقف جائز (ج)', 'Permissible stop (ج)'), def: T('تفيد جواز الوقف: الوقف والوصل جائزان على السواء.', 'Stopping is permissible: stopping and continuing are equally allowed.') },
  waqf_sala: { lesson: 'waqf', code: 'ۖ', glyph: 'ـۖـ', abbr: 'صلى', where: 'wq', name: T('الوصل أولى (صلى)', 'Continuing is preferred (صلى)'), def: T('تفيد بأن الوصل أولى مع جواز الوقف.', 'Continuing is better, although stopping is permitted.') },
  waqf_qala: { lesson: 'waqf', code: 'ۗ', glyph: 'ـۗـ', abbr: 'قلى', where: 'wq', name: T('الوقف أولى (قلى)', 'Stopping is preferred (قلى)'), def: T('تفيد أن الوقف أولى (ويجوز الوصل).', 'Stopping is better (continuing is also permitted).') },
  waqf_muanaqa: { lesson: 'waqf', code: 'ۛ', glyph: 'ـۛـ', abbr: '∴', where: 'wq', name: T('تعانق الوقف (∴)', 'Paired stops (∴)'), def: T('تفيد جواز الوقف بأحد الموضعين وليس في كليهما: ثلاث نقاط في موضعين قريبين.', 'Stopping is permitted at one of the two marked places but not at both: three dots appear in two nearby spots.') },
  saktah: { lesson: 'waqf', code: 'ۜ', glyph: 'ـۜـ', abbr: 'س', where: 'wq', refs: ['83:14', '75:27', '36:52', '18:1', '69:28'], name: T('السكتة (س)', 'Saktah — short pause (س)'), def: T('توقّف قصير بقدر حركتين دون أخذ نفس، ثم أكمل. تأتي علامة «س» وحدها بعد الكلمة.', 'A short pause of about two counts without taking a breath, then continue. The letter س appears on its own after the word.') },
  zero_round: { lesson: 'silent_sukun', code: '۟', glyph: 'ا۟', where: 'word', name: T('الصفر الدائري', 'Round zero'), def: T('للدلالة على زيادة الحرف وعدم النطق به: يُكتب ولا يُقرأ، لا في الوصل ولا في الوقف.', 'Marks an extra letter that is not pronounced: it is written but never read, neither when joining nor when stopping.') },
  zero_rect: { lesson: 'silent_sukun', code: '۠', glyph: 'ا۠', where: 'word', name: T('الصفر المستطيل', 'Rectangular zero'), def: T('للدلالة على زيادة الحرف حين الوصل: لا يُنطق إذا وصلتَ الكلام، ويُنطق عند الوقف عليه.', 'Marks a letter that is extra when joining: not pronounced when you continue reading, but pronounced when you stop on it.') },
  sukun: { lesson: 'silent_sukun', code: 'ۡ', glyph: 'مۡ', where: 'word', name: T('السكون', 'Sukun'), def: T('للدلالة على سكون الحرف: رأس حاء صغيرة فوق الحرف.', 'Shows that the letter is still (has no vowel): a small head of the letter ḥā’ above it.') },
  shadda: { lesson: 'silent_sukun', code: 'ّ', glyph: 'لَّ', where: 'word', name: T('الشدّة', 'Shadda'), def: T('للدلالة على تضعيف الحرف: حرفان مدغم أولهما في الثاني، الأول ساكن والثاني متحرك (مثل: ربَّ).', 'Marks a doubled letter: two identical letters merged into one, the first without a vowel and the second with one (as in rabb).') },
  small_meem: { lesson: 'silent_sukun', code: 'ۢ', glyph: 'نۢ', where: 'word', name: T('الميم الصغيرة', 'Small meem'), def: T('للدلالة على وجود الإقلاب: ميم صغيرة فوق النون أو التنوين تُنطق ميماً قبل الباء.', 'Marks iqlab: a small meem above the noon or tanween, pronounced as a meem before the letter baa.') },
  madd: { lesson: 'madd_letters', code: 'ۤ', glyph: 'حمۤ', where: 'word', name: T('المدّة', 'Madd sign'), def: T('للدلالة على لزوم المدّ الزائد على الطبيعي (متصل أو منفصل أو لازم…) بحسب ما بعدها.', 'Marks a lengthening beyond the natural madd (connected, separated, obligatory…), depending on what follows.') },
  dagger_alif: { lesson: 'madd_letters', code: 'ٰ', glyph: 'ذَٰلِكَ', where: 'word', name: T('الألف الخنجرية', 'Dagger alif'), def: T('للدلالة على وجوب النطق بالحروف المتروكة: ألف تُنطق مدّاً لكنها لا تُكتب كاملة (مثل: الرحمٰن).', 'Marks an omitted letter that must be pronounced: an alif that is lengthened but not written in full (as in ar-Raḥmān).') },
  small_waw: { lesson: 'madd_letters', code: 'ۥ', glyph: 'لَهُۥ', where: 'word', name: T('الواو الصغيرة', 'Small waw'), def: T('للدلالة على وجوب النطق بالحرف المتروك: تُنطق ضمة طويلة بعد هاء الضمير في الوصل (له، به).', 'An omitted letter that must be pronounced: a long “oo” after the pronoun hā’ when joining (lahu, bihi).') },
  small_yaa: { lesson: 'madd_letters', code: 'ۦ', glyph: 'بِهِۦ', where: 'word', name: T('الياء الصغيرة', 'Small yaa'), def: T('للدلالة على وجوب النطق بالحرف المتروك: تُنطق كسرة طويلة بعد هاء الضمير في الوصل (فيه، عليه).', 'An omitted letter that must be pronounced: a long “ee” after the pronoun hā’ when joining (fīhi, ʿalayhi).') },
  sin_over: { lesson: 'sin_saad', code: 'ۜ', glyph: 'صۜ', where: 'word', refs: ['2:245', '7:69'], name: T('س فوق الحرف', 'Seen above a letter'), def: T('للدلالة على وجوب النطق بالسين بدل الصاد، وتأتي داخل الكلمة فوق الصاد.', 'Means you must pronounce a seen instead of the saad. It sits inside the word, above the saad.') },
  sin_under: { lesson: 'sin_saad', code: 'ۣ', glyph: 'صۣ', where: 'word', refs: ['52:37'], name: T('س تحت الحرف', 'Seen below a letter'), def: T('إذا وُضعت السين بالأسفل فالنطق بالصاد أشهر (مع جواز السين).', 'When the seen is written below, pronouncing saad is more common (seen is also allowed).') },
  sajda_sign: { lesson: 'sajda', code: '۩', glyph: '۩', where: 'wq', name: T('علامة السجدة', 'Sajdah sign'), def: T('للدلالة على موضع السجود، أما كلمة وجوب السجود فقد وُضع فوقها خط.', 'Marks the place of prostration; a line is drawn above the words at which you prostrate.') },
  // ───── علامات إضافية (غير موجودة في مرحلة المنصة): الصورة من صفحة المصحف المطبوع، والتعريف بصياغة مبسّطة موسومة للمراجعة ─────
  fatha: { lesson: 'harakat', img: true, name: T('الفتحة', 'Fatha'), def: T('خط صغير مائل فوق الحرف: يُنطق الحرف معها بصوت «َ» (فتح الفم).', 'A small slanted stroke above a letter: the letter is read with an “a” sound (the mouth opens).') },
  damma: { lesson: 'harakat', img: true, name: T('الضمّة', 'Damma'), def: T('واو صغيرة فوق الحرف: يُنطق الحرف معها بصوت «ُ» (تُضمّ الشفتان).', 'A tiny curled stroke, like a small waw, above a letter: the letter is read with an “u” sound (the lips round).') },
  kasra: { lesson: 'harakat', img: true, name: T('الكسرة', 'Kasra'), def: T('خط صغير مائل تحت الحرف: يُنطق الحرف معها بصوت «ِ» (كسر الفم نحو الأسفل).', 'A small slanted stroke below a letter: the letter is read with an “i” sound.') },
  fathatan: { lesson: 'harakat', img: true, name: T('تنوين الفتح', 'Fathatan'), def: T('فتحتان فوق الحرف في آخر الاسم: يُنطق الحرف مع صوت «ـً» ثم نون ساكنة (an)، ولا تُكتب النون.', 'Two fatha strokes above the last letter of a noun: read as an “an” sound — a noon sound that is not written.') },
  dammatan: { lesson: 'harakat', img: true, name: T('تنوين الضمّ', 'Dammatan'), def: T('ضمّتان فوق الحرف في آخر الاسم: يُنطق الحرف مع صوت «ـٌ» ثم نون ساكنة (un)، ولا تُكتب النون.', 'Two damma strokes above the last letter of a noun: read as an “un” sound — a noon sound that is not written.') },
  kasratan: { lesson: 'harakat', img: true, name: T('تنوين الكسر', 'Kasratan'), def: T('كسرتان تحت الحرف في آخر الاسم: يُنطق الحرف مع صوت «ـٍ» ثم نون ساكنة (in)، ولا تُكتب النون.', 'Two kasra strokes below the last letter of a noun: read as an “in” sound — a noon sound that is not written.') },
  alif_wasla: { lesson: 'hamza', img: true, name: T('ألف الوصل', 'Alif wasla'), def: T('ألف تُنطق إذا ابتدأنا الكلام بها، وتسقط من النطق إذا وصلناها بما قبلها (مثل «ٱل» التعريف).', 'An alif that is pronounced when we start a phrase with it, and dropped when we join it to the word before (like the “al-” of “the”).') },
  hamza_above: { lesson: 'hamza', img: true, name: T('الهمزة فوق الألف', 'Hamza above alif'), def: T('رأس عين صغيرة فوق الألف (أ): همزة قطع تُنطق دائمًا في أول الكلام وفي الوصل.', 'A tiny ʿayn-shaped head above the alif (أ): a hamza that is always pronounced, whether you start with it or join to it.') },
  hamza_below: { lesson: 'hamza', img: true, name: T('الهمزة تحت الألف', 'Hamza below alif'), def: T('رأس عين صغيرة تحت الألف (إ): همزة قطع مكسورة تُنطق دائمًا.', 'A tiny ʿayn-shaped head below the alif (إ): a hamza with a kasra, always pronounced.') },
  hamza_line: { lesson: 'hamza', img: true, name: T('الهمزة على السطر', 'Hamza on the line'), def: T('همزة تُكتب وحدها على السطر بلا حرف يحملها (ء)، وتُنطق همزة، وتأتي بعد حرف مدّ في مواضع كثيرة.', 'A hamza written on its own on the line with no letter carrying it (ء); it is pronounced as a hamza, often after a madd letter.') },
  ishmam: { lesson: 'special', img: true, name: T('علامة الإشمام', 'Ishmam sign'), def: T('علامة نادرة تدلّ على ضمّ الشفتين قبل النطق بالنون المشدّدة دون صوت للضمّة؛ وهي في موضع واحد من القرآن (سورة يوسف).', 'A rare sign meaning: round the lips before saying the doubled noon, without any “u” sound. It occurs in just one place in the Quran (Surah Yusuf).') },
  imala: { lesson: 'special', img: true, name: T('علامة الإمالة', 'Imala sign'), def: T('علامة نادرة تدلّ على إمالة الألف نحو الياء والفتحة نحو الكسرة؛ وهي في موضع واحد في قراءة حفص (سورة هود).', 'A rare sign meaning: lean the alif toward a “ee” sound and the fatha toward a kasra. In Hafs it occurs in just one place (Surah Hud).') }
};


// علامات تأتي على حرف وتكثر في النص: تُعرَّف ولا يُسأل عنها «اضغط الكلمة» (كما في المنصة)
export const NO_TAP = new Set(['sukun', 'shadda', 'ayah_end']);
// علامات صورتها من الصفحة الحقيقية فقط (لا رمز لها في نص الآيات): تُدرَّس بالاستكشاف والأسئلة المصوّرة لا بالضغط في آية
export const IMG_ONLY = new Set(Object.keys(SIGNS).filter((k) => SIGNS[k].img));
// علامتان بشكل واحد (س): لا يُسأل عن شكلها منفردةً بلا سياق
export const AMBIGUOUS = new Set(['saktah', 'sin_over']);

export const MUSHAF = {
  mushaf_ayah_number: {
    id: 'mushaf_ayah_number', kind: 'mushaf', lesson: 'ayah_number', stage: 'mushaf', signs: ['ayah_end'],
    name: T('رقم الآية ولوحة السورة', 'Ayah Number & Surah Title'), short: T('﴿١﴾', '﴿١﴾'), tagline: T('الرقم في نهاية الآية لا في بدايتها', 'The number comes at the end, not the start'),
    def: T('رقم الآية يُكتب في نهايتها داخل وردة مستديرة لا في أولها. وقبل أول آية في السورة لوحة مزخرفة فيها اسمها ثم البسملة، وفي أعلى كل صفحة اسم الجزء واسم السورة.', 'The ayah number is written at the end of the ayah inside a round rosette — not at its beginning. Before a surah’s first ayah is an ornamental panel with its name, then the basmala; at the top of every page are the juz and surah names.'),
    notice: T('انظر إلى الآية: أين وقع الرقم؟ وما الذي تراه قبل أول آية في السورة وفي أعلى الصفحة؟', 'Look at the ayah: where is the number? What do you see before a surah’s first ayah and at the top of the page?'),
    watch: T('ما يظنه كثير من الأطفال: أن الرقم قبل الآية. الصواب: الرقم في نهاية الآية، ويُقرأ بعد انتهائها.', 'What many children think: that the number comes before the ayah. The truth: the number sits at the end of the ayah and belongs to the ayah before it.'),
    ex: [T('قبل أول آية في كل سورة لوحة مزخرفة فيها اسمها.', 'Before the first ayah of every surah there is an ornamental panel with its name.'), T('بعد لوحة اسم السورة تأتي البسملة (إلا في سورة التوبة)، ثم أول آية.', 'After the title panel comes the basmala (except in Surah At-Tawbah), then the first ayah.'), T('في أعلى الصفحة اسم الجزء على اليمين واسم السورة على اليسار.', 'At the top of the page: the juz name on the right and the surah name on the left.')],
    review: null
  },
  mushaf_juz_hizb: {
    id: 'mushaf_juz_hizb', kind: 'mushaf', lesson: 'juz_hizb', stage: 'mushaf', signs: ['rub_mark'],
    name: T('الجزء والحزب والربع', 'Juz, Hizb & Quarter'), short: T('۞', '۞'), tagline: T('فانوس الهامش وعلامة ۞', 'The margin lantern and the ۞ mark'),
    def: T('القرآن ثلاثون جزءاً، والجزء حزبان، والحزب أربعة أرباع، فالجزء ثمانية أرباع. وتُعرف مواضعها بفانوس على هامش الصفحة وبالرمز ۞ داخل السطر.', 'The Quran has 30 juz; each juz is 2 hizb and each hizb is 4 quarters, so a juz is 8 quarters. They are marked by a lantern in the page margin and by the ۞ symbol inside the line.'),
    notice: T('لاحظ الفانوس على هامش الصفحة: ماذا كُتب فيه؟ وأين الرمز ۞ في السطر؟', 'Notice the lantern in the page margin: what is written in it? Where is the ۞ symbol in the line?'),
    watch: T('الفانوس بقبّتين = بداية جزء أو حزب. الفانوس بقبّة واحدة = ربع أو نصف أو ثلاثة أرباع.', 'Two domes = the start of a juz or a hizb. One dome = a quarter, a half or three quarters.'),
    ex: [T('الفانوس على الهامش يبيّن أين يبدأ جزء أو حزب أو نصف أو ربع. وبداية الحزب والجزء بقبّتين، والربع والنصف وثلاثة الأرباع بقبّة واحدة.', 'The lantern in the margin shows where a juz, hizb, half or quarter begins. The start of a hizb or a juz has two domes; a quarter, a half and three quarters have one dome.'), T('ثلاثون جزءاً، وستون حزباً، ومئتان وأربعون ربعاً. الجزء حزبان، والحزب أربعة أرباع، والجزء ثمانية أرباع. وفي القرآن خمس عشرة سجدة.', 'Thirty juz, sixty hizb and 240 quarters. A juz is 2 hizb, a hizb is 4 quarters, a juz is 8 quarters. And the Quran has fifteen places of prostration.')],
    review: null
  },
  mushaf_waqf: {
    id: 'mushaf_waqf', kind: 'mushaf', lesson: 'waqf', stage: 'mushaf', signs: ['waqf_lazim', 'waqf_jaiz', 'waqf_sala', 'waqf_qala', 'waqf_muanaqa', 'saktah'],
    name: T('علامات الوقف', 'Stopping (Waqf) Signs'), short: T('م ج صلى قلى', 'م ج صلى قلى'), tagline: T('أين نقف وأين نصل', 'Where to stop and where to continue'),
    def: T('علامات صغيرة فوق السطر بين الكلمات تدلّ على أين نقف وأين نصل، ولكل علامة حكمها: لازم، جائز، الوصل أولى، الوقف أولى، التعانق، والسكتة.', 'Small marks above the line between words tell us where to stop and where to continue. Each has its meaning: required, permissible, continuing is preferred, stopping is preferred, paired stops, and the short pause.'),
    notice: T('هل ترى علامة صغيرة بين كلمتين؟ هل نقف عندها أم نكمل؟', 'Do you see a small mark between two words? Do we stop there or continue?'),
    watch: T('السكتة ليست وقفًا: لا تأخذ نفسًا، توقّف قصيرًا بقدر حركتين ثم أكمل.', 'The saktah is not a full stop: do not take a breath; pause briefly for about two counts, then continue.'),
    ex: [T('علامات الوقف حروف أو رموز صغيرة تأتي بين الكلمات فوق السطر.', 'Stopping signs are small letters or symbols between words, above the line.'), T('م: لازم، ج: جائز، صلى: الوصل أولى، قلى: الوقف أولى، ∴: تعانق.', 'م: required · ج: permissible · صلى: continuing is preferred · قلى: stopping is preferred · ∴: paired stops.')],
    review: 'علامة «لا» (لا وقف) لا تظهر في نص المصحف المعتمد في المنصة، فلا تُدرَّس هنا (كما في المنصة)'
  },
  mushaf_silent_sukun: {
    id: 'mushaf_silent_sukun', kind: 'mushaf', lesson: 'silent_sukun', stage: 'mushaf', signs: ['zero_round', 'zero_rect', 'sukun', 'shadda', 'small_meem'],
    name: T('السكون والحروف الصامتة', 'Sukun & Silent Letters'), short: T('ۡ ۟ ۠ ّ ۢ', 'ۡ ۟ ۠ ّ ۢ'), tagline: T('ما يُقرأ وما لا يُقرأ', 'What is read and what is not'),
    def: T('السكون رأس حاء صغيرة فوق الحرف. والصفر الدائري فوق حرف زائد لا يُنطق، والصفر المستطيل فوق حرف زائد حين الوصل فقط، والميم الصغيرة للإقلاب، والشدّة فوق الحرف المضعّف.', 'The sukun is a small head of the letter ḥā’ above a letter. The round zero marks an extra letter that is not pronounced; the rectangular zero marks a letter that is extra only when joining; the small meem marks iqlab; the shadda marks a doubled letter.'),
    notice: T('هناك حروف مكتوبة ولا تُقرأ. كيف نعرفها؟', 'Some letters are written but not read. How can we tell?'),
    watch: T('الصفر الدائري: لا يُقرأ الحرف أبدًا. الصفر المستطيل: لا يُقرأ عند الوصل ويُقرأ عند الوقف.', 'Round zero: the letter is never read. Rectangular zero: not read when joining, read when stopping.'),
    ex: [], review: null
  },
  mushaf_madd_letters: {
    id: 'mushaf_madd_letters', kind: 'mushaf', lesson: 'madd_letters', stage: 'mushaf', signs: ['madd', 'dagger_alif', 'small_waw', 'small_yaa'],
    name: T('المدّ والحروف الصغيرة', 'Madd & Small Letters'), short: T('ۤ ٰ ۥ ۦ', 'ۤ ٰ ۥ ۦ'), tagline: T('حروف تُنطق ولا تُكتب كاملة', 'Letters pronounced but not written in full'),
    def: T('المدّة فوق الحرف تدلّ على مدّ زائد على الطبيعي. والألف الخنجرية والواو والياء الصغيرة حروف تُنطق ولا تُكتب كاملة.', 'The madd sign above a letter means a lengthening beyond the natural one. The dagger alif and the small waw and yaa are letters that are pronounced but not written in full.'),
    notice: T('ألف صغيرة فوق الحرف وواو صغيرة بعد الهاء: هل تُقرأ أم لا؟', 'A tiny alif above a letter and a tiny waw after the hā’: are they read or not?'),
    watch: T('الواو والياء الصغيرتان بعد هاء الضمير تُنطقان في الوصل (مدّ طبيعي)، أما المدّة ۤ فتدل على مدّ زائد.', 'The small waw and yaa after the pronoun hā’ are pronounced when joining (natural madd), while the madd sign ۤ marks an extra lengthening.'),
    ex: [], review: null
  },
  mushaf_sin_saad: {
    id: 'mushaf_sin_saad', kind: 'mushaf', lesson: 'sin_saad', stage: 'mushaf', signs: ['sin_over', 'sin_under'],
    name: T('السين مكان الصاد', 'Seen in Place of Saad'), short: T('صۜ', 'صۜ'), tagline: T('سين صغيرة داخل الكلمة', 'A small seen inside a word'),
    def: T('في كلمات قليلة تُكتب صاد وفوقها سين صغيرة، فتُنطق سيناً. وإذا وُضعت السين تحتها فالنطق بالصاد أشهر. وليست هذه السكتة التي تأتي وحدها بين كلمتين.', 'In a few words a saad is written with a small seen above it, and it is pronounced as a seen. If the seen is written below it, saad is more common. This is not the saktah, which stands alone between two words.'),
    notice: T('سين صغيرة داخل كلمة: هل هي سكتة أم تغيّر نطق الحرف؟', 'A small seen inside a word: is it a pause, or does it change how the letter is pronounced?'),
    watch: T('السكتة تأتي وحدها بين كلمتين، أما هنا فالسين الصغيرة على الصاد داخل الكلمة نفسها.', 'The saktah stands alone between two words; here the small seen sits on the saad inside the word itself.'),
    ex: [], review: 'كلمات هذا الدرس قليلة جدًا في المصحف؛ الأمثلة من آيات خارج جزء عمّ (2:245، 7:69، 52:37)'
  },
  mushaf_harakat: {
    id: 'mushaf_harakat', kind: 'mushaf', lesson: 'harakat', stage: 'mushaf', signs: ['fatha', 'damma', 'kasra', 'fathatan', 'dammatan', 'kasratan'], noVerses: true,
    name: T('الحركات والتنوين', 'Vowel Marks & Tanween'), short: T('ـَ ـُ ـِ', 'ـَ ـُ ـِ'), tagline: T('ثلاث حركات وثلاثة تنوين', 'Three vowels and three tanween'),
    def: T('الحركات ثلاث: الفتحة فوق الحرف والضمّة فوقه والكسرة تحته. وإذا تكرّرت العلامة في آخر الاسم صارت تنوينًا: تنوين فتح وضمّ وكسر، وتُنطق معه نون ساكنة لا تُكتب.', 'There are three vowels: the fatha above a letter, the damma above it, the kasra below it. When the mark is doubled at the end of a noun it becomes tanween — fathatan, dammatan, kasratan — and an unwritten noon sound is added.'),
    notice: T('انظر إلى أواخر الكلمات: هل ترى علامتين متجاورتين بدل علامة واحدة؟', 'Look at the ends of words: do you see two marks side by side instead of one?'),
    watch: T('الحركة الواحدة: صوت قصير. التنوين (علامتان): صوت الحركة ثم نون لا تُكتب. تنوين الكسر يكون تحت الحرف.', 'One mark: a short vowel sound. Tanween (two marks): the vowel sound plus an unwritten noon. Kasratan is written below the letter.'),
    ex: [], review: 'هذا الدرس إضافة من عندي (ليس في مرحلة المنصة): الصور حقيقية من صفحات المصحف، لكن نصوص التعريف بصياغتي وتحتاج مراجعة معلّم'
  },
  mushaf_hamza: {
    id: 'mushaf_hamza', kind: 'mushaf', lesson: 'hamza', stage: 'mushaf', signs: ['alif_wasla', 'hamza_above', 'hamza_below', 'hamza_line'], noVerses: true,
    name: T('الألف والهمزة', 'Alif & Hamza'), short: T('ٱ أ إ ء', 'ٱ أ إ ء'), tagline: T('ألف تسقط وهمزة لا تسقط', 'An alif that drops and a hamza that stays'),
    def: T('ألف الوصل تُنطق في بدء الكلام وتسقط في وصله. أما الهمزة فتُنطق دائمًا: تُكتب فوق الألف أو تحتها أو وحدها على السطر.', 'The alif of joining is pronounced when you start with it and dropped when you join. The hamza is always pronounced: it is written above the alif, below it, or on its own on the line.'),
    notice: T('هل تحمل الألف رأس عين صغيرة؟ فوقها أو تحتها؟ أم لا تحمل شيئًا؟', 'Does the alif carry a tiny ʿayn-shaped head — above it, below it — or nothing at all?'),
    watch: T('الألف التي لا تحمل رأس عين (ٱ) قد تسقط في الوصل. التي تحمله (أ إ) تُنطق دائمًا.', 'An alif without the ʿayn-shaped head (ٱ) may drop when joining. One with the head (أ إ) is always pronounced.'),
    ex: [], review: 'هذا الدرس إضافة من عندي (ليس في مرحلة المنصة): الصور حقيقية من صفحات المصحف، لكن نصوص التعريف بصياغتي وتحتاج مراجعة معلّم'
  },
  mushaf_special: {
    id: 'mushaf_special', kind: 'mushaf', lesson: 'special', stage: 'mushaf', signs: ['ishmam', 'imala'], noVerses: true,
    name: T('علامات نادرة', 'Rare Marks'), short: T('إشمام · إمالة', 'Ishmam · Imala'), tagline: T('علامتان لا تأتيان إلا مرة واحدة', 'Two marks that appear only once'),
    def: T('في المصحف علامتان لا تأتيان إلا في موضع واحد: علامة الإشمام (ضمّ الشفتين) في سورة يوسف، وعلامة الإمالة في سورة هود. إذا رأيت واحدة منهما فاسأل معلّمك عن طريقة نطقها.', 'The mushaf has two marks that appear in only one place each: the ishmam sign (rounding the lips) in Surah Yusuf and the imala sign in Surah Hud. If you see one, ask your teacher to model the pronunciation.'),
    notice: T('علامة صغيرة غريبة لم ترها من قبل: لا تخف! هي نادرة جدًا.', 'A strange little mark you have not seen before: do not worry — it is very rare.'),
    watch: T('هاتان العلامتان تُتعلَّمان بالسماع من المعلّم: الصورة تعرّفك بهما فقط.', 'These two marks are learned by listening to a teacher: the picture only helps you recognise them.'),
    ex: [], review: 'هذا الدرس إضافة من عندي (ليس في مرحلة المنصة): الصور حقيقية من صفحات المصحف، لكن نصوص التعريف بصياغتي وتحتاج مراجعة معلّم، وأحكام النطق يُرجع فيها للمعلّم'
  },
  mushaf_sajda: {
    id: 'mushaf_sajda', kind: 'mushaf', lesson: 'sajda', stage: 'mushaf', signs: ['sajda_sign'],
    name: T('علامات السجدة', 'Sajdah Signs'), short: T('۩', '۩'), tagline: T('ثلاث علامات تدلّك على موضع السجود', 'Three signs show where to prostrate'),
    def: T('في المصحف خمس عشرة سجدة، تُعرف بثلاث علامات: «سجدة» على الهامش، ورمز يشبه قبة المسجد داخل السطر، وخط فوق كلمات السجود.', 'The mushaf has fifteen places of prostration, recognised by three signs: “سجدة” in the margin, a symbol like a mosque dome in the line, and a line above the words of prostration.'),
    notice: T('ما الذي يدلّك على موضع السجود في الصفحة؟', 'What tells you where to prostrate on the page?'),
    watch: T('في هذا النموذج بنك الآيات يضم سجدتين من جزء عمّ (الانشقاق، العلق) و١٣ سجدة أخرى للتدريب.', 'The verse bank here includes the two sajdahs of Juz Amma (Al-Inshiqaq, Al-Alaq) plus 13 more for practice.'),
    ex: [T('نعم، فيها علامة السجدة ۩ وخط فوق كلمات السجود.', 'Yes — it has the sajdah sign ۩ and a line above the words of prostration.'), T('لا، ليس فيها علامة سجدة.', 'No — it has no sajdah sign.')],
    review: null
  }
};

// مقاييس الفانوس (من رقم ربع الحزب ١–٢٤٠) — كما في engine/tajweedMushaf.js في المنصة
const AR = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
export function quarterMarker(q) {
  const hizb = Math.floor((q - 1) / 4) + 1, r = (q - 1) % 4, juz = Math.floor((q - 1) / 8) + 1;
  if (q % 8 === 1) return { kind: 'juz', full: true, juz, hizb, lines: ['الجزء ' + AR(juz), 'الحزب ' + AR(hizb)] };
  if (r === 0) return { kind: 'hizb', full: true, juz, hizb, lines: ['الحزب', AR(hizb)] };
  if (r === 1) return { kind: 'rub', full: false, juz, hizb, lines: ['ربع', 'الحزب', AR(hizb)] };
  if (r === 2) return { kind: 'nisf', full: false, juz, hizb, lines: ['نصف', 'الحزب', AR(hizb)] };
  return { kind: 'thalatha', full: false, juz, hizb, lines: ['ثلاثة أرباع', 'الحزب', AR(hizb)] };
}
export const MARKER_KINDS = ['rub', 'nisf', 'thalatha', 'hizb', 'juz'];
export const MARKER_NAMES = {
  rub: T('ربع الحزب', 'Quarter of a hizb'), nisf: T('نصف الحزب', 'Half of a hizb'), thalatha: T('ثلاثة أرباع الحزب', 'Three quarters of a hizb'), hizb: T('بداية حزب', 'Start of a hizb'), juz: T('بداية جزء', 'Start of a juz')
};
export const JUZ_ORDINALS_AR = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون', 'الحادي والعشرون', 'الثاني والعشرون', 'الثالث والعشرون', 'الرابع والعشرون', 'الخامس والعشرون', 'السادس والعشرون', 'السابع والعشرون', 'الثامن والعشرون', 'التاسع والعشرون', 'الثلاثون'];

// لوحة الرمز على بلاطات الرئيسية (علامات على حروف حاملة ليظهر شكلها كما في المصحف)
export const PLATES = {
  mushaf_ayah_number: '﴿١﴾', mushaf_juz_hizb: '۞', mushaf_waqf: 'ـۘـ ـۚـ ـۖـ',
  mushaf_silent_sukun: 'ا۟ مۡ نۢ', mushaf_madd_letters: 'حمۤ ذَٰلِكَ', mushaf_sin_saad: 'صۜ', mushaf_sajda: '۩', mushaf_harakat: 'بَ بُ بِ', mushaf_hamza: 'ٱ أ إ ء', mushaf_special: 'ۜ ۬'
};

// ───── صور حقيقية من المصحف المطبوع ─────
// كل صورة مقتطعة من صفحة مصحف حقيقية (tools/crop-signs.py، والتوثيق في assets/mushaf/signs/PROVENANCE.json)، أو من مقتطعات المنصة (assets/tajweed/mushaf).
export const SIGN_IMG = { ayah_end: A('mushaf/ayah-number.webp'), rub_mark: A('mushaf/hizb-mark.webp'), sajda_sign: A('mushaf/sajda-mark.webp') };
export const signImg = (id) => SIGN_IMG[id] || A(`mushaf/signs/${id}.webp`);
export const partImg = (id) => A(`mushaf/signs/part_${id}.webp`);
export const pageImg = (n) => A(`mushaf/pages/page${String(n).padStart(3, '0')}.webp`);
export const PAGE_W = 800, PAGE_H = 1294;

// «استكشف الصفحة»: صفحات حقيقية بدبابيس على مواضع العلامات (إحداثيات بكسلات الصفحة ٨٠٠×١٢٩٤)
export const EXPLORE = {
  mushaf_ayah_number: [{ page: 582, label: T('أول سورة النبأ', 'The start of Surah An-Naba'), pins: [{ part: 'banner', x: 400, y: 48 }, { part: 'basmala', x: 400, y: 138 }, { sign: 'ayah_end', x: 603, y: 222 }, { sign: 'ayah_end', x: 358, y: 222 }] }],
  mushaf_juz_hizb: [{ page: 39, label: T('علامة الربع ۞ في السطر', 'The ۞ mark inside a line'), pins: [{ sign: 'rub_mark', x: 237, y: 711 }] }],
  mushaf_waqf: [
    { page: 588, label: T('الوصل أولى والسكتة', 'Continue-preferred and the saktah'), pins: [{ sign: 'waqf_sala', x: 600, y: 256 }, { sign: 'saktah', x: 528, y: 262 }] },
    { page: 528, label: T('وقف لازم', 'Compulsory stop'), pins: [{ sign: 'waqf_lazim', x: 555, y: 1195 }] },
    { page: 584, label: T('وقف جائز', 'Permissible stop'), pins: [{ sign: 'waqf_jaiz', x: 100, y: 352 }] },
    { page: 443, label: T('الوقف أولى', 'Stopping is preferred'), pins: [{ sign: 'waqf_qala', x: 300, y: 942 }] },
    { page: 2, label: T('تعانق الوقف', 'Paired stops'), pins: [{ sign: 'waqf_muanaqa', x: 300, y: 232 }] }
  ],
  mushaf_silent_sukun: [
    { page: 582, label: T('الشدّة والصفر الدائري', 'Shadda and the round zero'), pins: [{ sign: 'shadda', x: 735, y: 205 }, { sign: 'zero_round', x: 410, y: 1105 }] },
    { page: 584, label: T('الصفر المستطيل', 'The rectangular zero'), pins: [{ sign: 'zero_rect', x: 548, y: 283 }] },
    { page: 585, label: T('الميم الصغيرة', 'The small meem'), pins: [{ sign: 'small_meem', x: 370, y: 766 }] },
    { page: 2, label: T('السكون', 'The sukun'), pins: [{ sign: 'sukun', x: 340, y: 262 }] }
  ],
  mushaf_madd_letters: [
    { page: 582, label: T('المدّة والياء الصغيرة', 'The madd sign and the small yaa'), pins: [{ sign: 'madd', x: 556, y: 618 }, { sign: 'small_yaa', x: 345, y: 638 }] },
    { page: 585, label: T('الواو الصغيرة', 'The small waw'), pins: [{ sign: 'small_waw', x: 222, y: 218 }] },
    { page: 2, label: T('الألف الخنجرية', 'The dagger alif'), pins: [{ sign: 'dagger_alif', x: 505, y: 245 }] }
  ],
  mushaf_sin_saad: [
    { page: 39, label: T('س فوق الصاد', 'Seen above the saad'), pins: [{ sign: 'sin_over', x: 402, y: 1205 }] },
    { page: 525, label: T('س تحت الصاد', 'Seen below the saad'), pins: [{ sign: 'sin_under', x: 585, y: 402 }] }
  ],
  mushaf_harakat: [
    { page: 583, label: T('الفتحة والضمّة والكسرة', 'Fatha, damma and kasra'), pins: [{ sign: 'kasra', x: 605, y: 218 }, { sign: 'fatha', x: 537, y: 310 }, { sign: 'damma', x: 470, y: 307 }] },
    { page: 582, label: T('تنوين الفتح', 'Fathatan'), pins: [{ sign: 'fathatan', x: 532, y: 646 }] },
    { page: 226, label: T('تنوين الضمّ', 'Dammatan'), pins: [{ sign: 'dammatan', x: 268, y: 565 }] },
    { page: 585, label: T('تنوين الكسر', 'Kasratan'), pins: [{ sign: 'kasratan', x: 80, y: 380 }] }
  ],
  mushaf_hamza: [
    { page: 582, label: T('ألف الوصل والهمزة تحت الألف', 'Alif wasla and hamza below alif'), pins: [{ sign: 'alif_wasla', x: 485, y: 218 }, { sign: 'hamza_below', x: 612, y: 725 }] },
    { page: 585, label: T('الهمزة فوق الألف وعلى السطر', 'Hamza above alif and on the line'), pins: [{ sign: 'hamza_above', x: 455, y: 214 }, { sign: 'hamza_line', x: 345, y: 385 }] }
  ],
  mushaf_special: [
    { page: 236, label: T('الإشمام (سورة يوسف)', 'Ishmam (Surah Yusuf)'), pins: [{ sign: 'ishmam', x: 325, y: 903 }] },
    { page: 226, label: T('الإمالة (سورة هود)', 'Imala (Surah Hud)'), pins: [{ sign: 'imala', x: 548, y: 567 }] }
  ],
  mushaf_sajda: [{ page: 528, label: T('سجدة سورة النجم', 'The sajdah of Surah An-Najm'), pins: [{ sign: 'sajda_sign', x: 118, y: 640 }, { part: 'overline', x: 300, y: 612 }] }]
};
// بطاقات أجزاء الصفحة التي ليست علامات
export const PARTS = {
  banner: { name: T('لوحة اسم السورة', 'The surah title panel'), def: T('قبل أول آية في كل سورة لوحة مزخرفة فيها اسمها.', 'Before the first ayah of every surah there is an ornamental panel with its name.') },
  basmala: { name: T('البسملة', 'The basmala'), def: T('بعد لوحة اسم السورة تأتي البسملة (إلا في سورة التوبة)، ثم أول آية.', 'After the title panel comes the basmala (except in Surah At-Tawbah), then the first ayah.') },
  overline: { name: T('خط فوق كلمات السجود', 'The line above the words of prostration'), def: T('للدلالة على موضع السجود، أما كلمة وجوب السجود فقد وُضع فوقها خط.', 'Marks the place of prostration; a line is drawn above the words at which you prostrate.') }
};
// صورة تمثّل الدرس على بلاط الرئيسية
export const LESSON_IMG = { mushaf_ayah_number: 'ayah_end', mushaf_juz_hizb: 'rub_mark', mushaf_waqf: 'waqf_sala', mushaf_silent_sukun: 'zero_round', mushaf_madd_letters: 'madd', mushaf_sin_saad: 'sin_over', mushaf_sajda: 'sajda_sign', mushaf_harakat: 'fatha', mushaf_hamza: 'alif_wasla', mushaf_special: 'ishmam' };

// نصوص المقدمة والنصيحة لكل درس (من نصوص المنصة المعتمدة، انظر data/mushaf-texts.js)
export const LESSON_TXT = { ayah_number: ['mul_an_intro', 'mul_an_tip'], juz_hizb: ['mul_jh_intro', 'mul_jh_tip'], waqf: ['mul_wq_intro', 'mul_wq_tip'], silent_sukun: ['mul_sk_intro', 'mul_sk_tip'], madd_letters: ['mul_md_intro', 'mul_md_tip'], sin_saad: ['mul_sn_intro', 'mul_sn_tip'], sajda: ['mul_sj_intro', 'mul_sj_tip'] };

// نافذة مكبّرة حول دبابيس الصفحة (بكسلات الصفحة الأصلية) — تُستعمل في «استكشف» وفي أسئلة «ما العلامة عند الدبوس؟»
export function pageWindow(pins) {
  const xs = pins.map((p) => p.x), ys = pins.map((p) => p.y);
  const W = Math.min(PAGE_W, Math.max(480, Math.max(...xs) - Math.min(...xs) + 380)); const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const left = Math.min(Math.max(cx - W / 2, 0), PAGE_W - W);
  const H = Math.min(PAGE_H, Math.max(W * 0.62, Math.max(...ys) - Math.min(...ys) + 300)); const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const top = Math.min(Math.max(cy - H / 2, 0), PAGE_H - H);
  return { W, H, left, top };
}
