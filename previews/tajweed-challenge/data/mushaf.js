// data/mushaf.js — محتوى قسم «تعرّف على مصحفك» (٧ دروس) ثنائي اللغة.
//
// المصدر: نصوص الدروس وتعريفات العلامات منسوخة من نصوص المنصة المعتمدة (core/i18nMushaf.js — «تعريفات العلامات مأخوذة من دليل المصحف
// المطبوع: علامات الوقف ومصطلحات الضبط») وبنية الدروس والأسئلة من engine/tajweedMushaf.js ومعاينة docs/review/tajweed-mushaf-stage-preview.html.
// صور الفانوس واللوحة والوردة والسجدة: نسخ من assets/tajweed/mushaf (مقتطعة من صور المصحف المطبوع، انظر assets/mushaf/SOURCE.md).
// لا نص آيات هنا: الأمثلة تُستخرج من data/pool.js. ما أضفتُه أنا (أسئلة الحقائق الإضافية، صياغة الخيارات) موسوم review.
const T = (ar, en) => ({ ar, en });

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
  sajda_sign: { lesson: 'sajda', code: '۩', glyph: '۩', where: 'wq', name: T('علامة السجدة', 'Sajdah sign'), def: T('للدلالة على موضع السجود، أما كلمة وجوب السجود فقد وُضع فوقها خط.', 'Marks the place of prostration; a line is drawn above the words at which you prostrate.') }
};

// علامات تأتي على حرف وتكثر في النص: تُعرَّف ولا يُسأل عنها «اضغط الكلمة» (كما في المنصة)
export const NO_TAP = new Set(['sukun', 'shadda', 'ayah_end', 'rub_mark', 'sajda_sign']);
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
