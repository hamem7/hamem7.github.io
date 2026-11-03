// data/stories.js — محتوى «الدرس المصوّر» (حكاية للأطفال) لكل دروس الركن الخمسة والعشرين، ثنائي اللغة.
//
// كل درس شرائح قصيرة: حكاية بكلمات الأطفال + رسم توضيحي (js/art.js) أو صورة حقيقية (صفحات المصحف وعلاماته، رسوم مخارج
// «التجويد المصوّر»، شرائح عرض المعلم) + آيات من بنك الركن بالحرف ملوَّنًا وصوت المنشاوي + سؤال سريع + فكرة للمعلم داخل الفصل.
// ⚠️ لا نص قرآني مكتوب هنا: الآيات تُشار إليها بمفتاح «سورة:آية» وفهرس الكلمة فقط، وتُقرأ من data/pool.js (يفحصه tools/verify.mjs).
//    الحروف المفردة بحركاتها (بَ، نۡ…) رموز تعليمية لا آيات.
// ⚠️ دروس الأحكام تبني على محتوى الأحكام الموثَّق في data/rules.js (التعريف، الخطوات، التنبيه، المقارنات، أبيات التحفة، الأمثلة)
//    وتضيف إليه الحكاية والرسم والصور والسؤال فقط (انظر ruleStory أسفل الملف).
//
// أنواع الكتل (يعرضها js/story.js): kid · p · def · art · viz · img · row · signs · dodont · check · ayahs · signAyahs · ayah ·
// explore · lanterns · media · letters · steps · vs · poem · custom · facts
import { RULES } from './rules.js';

const T = (ar, en) => ({ ar, en });

// ═════════════════════════ تعرّف على مصحفك ═════════════════════════
const MUSHAF_STORIES = {
  mushaf_ayah_number: {
    title: T('قطار الآيات 🚂', 'The Ayah Train 🚂'), mins: 8, cover: { art: 'ayah_train' },
    hook: T('كيف نعرف أين تنتهي الآية؟ ومن أين تبدأ السورة؟', 'How do we know where an ayah ends, and where a surah begins?'),
    goals: [T('يعرف أن رقم الآية يأتي في آخرها.', 'Knows the ayah number comes at its end.'), T('يعرف بداية السورة: لوحة الاسم ثم البسملة ثم أول آية.', 'Knows how a surah starts: name panel, basmala, first ayah.'), T('يقرأ رأس الصفحة: اسم الجزء واسم السورة.', 'Reads the page header: juz name and surah name.')],
    slides: [
      { icon: '🚂', k: T('ما الآية؟', 'What is an ayah?'), t: T('السورة قطار طويل', 'A surah is a long train'),
        b: [{ row: [{ kid: T('القرآن فيه ١١٤ سورة. كل سورة مثل قطار، وعرباتُ القطار هي الآيات.\nوفي آخر كل عربة لافتة مستديرة جميلة فيها رقمها، تقول لك: «انتهت هذه الآية!»', 'The Qur’an has 114 surahs. Each surah is like a train, and its cars are the ayahs.\nAt the end of every car there is a pretty round sign with its number, telling you: “This ayah has ended!”') }, { art: 'ayah_train' }] },
          { row: [{ img: 'mushaf/ayah-number.webp', cap: T('هكذا تبدو علامة نهاية الآية في المصحف', 'This is how the end-of-ayah mark looks in the mushaf'), credit: 'mushaf', small: true }, { def: T('رقم الآية يُكتب في نهايتها داخل وردة مستديرة، لا في أولها. وهو علامة لا تُقرأ مع الآية.', 'The ayah number is written at its end inside a round rosette, never at its start. It is a mark, not something we read aloud.') }] }],
        tip: T('ارسم على السبورة قطارًا من ثلاث عربات، واطلب من طفل أن يضع رقم كل عربة في آخرها.', 'Draw a three-car train on the board and ask a child to put each car’s number at its end.') },
      { icon: '🔢', k: T('أين الرقم؟', 'Where is the number?'), t: T('الرقم في آخر الآية، لا في أولها', 'The number is at the end, not the start'),
        b: [{ custom: 'ayah_compare' }, { kid: T('نقرأ الآية كلها أولًا، ثم نجد رقمها. فإذا رأيت الرقم عرفت أن الآية انتهت.', 'We read the whole ayah first, then we find its number. When you see the number, you know the ayah is over.') },
          { check: { q: T('أين يُكتب رقم الآية؟', 'Where is the ayah number written?'), opts: [{ t: T('قبل الآية', 'Before the ayah'), fb: T('لا، الرقم لا يأتي قبلها.', 'No, the number never comes before it.') }, { t: T('في آخر الآية', 'At the end of the ayah'), ok: true, fb: T('أحسنت! الرقم في آخر الآية دائمًا.', 'Well done! The number is always at the end.') }, { t: T('في وسط الآية', 'In the middle'), fb: T('لا، الرقم لا يقطع الآية.', 'No, the number never splits an ayah.') }] } }],
        tip: T('اقرأ آية قصيرة وتوقف عند رقمها، واطلب من الأطفال أن يرفعوا أيديهم عندما يرون الوردة.', 'Read a short ayah and stop at its number; children raise their hands when they see the rosette.') },
      { icon: '🏷️', k: T('بطاقة السورة', 'The surah’s ID card'), t: T('كيف تبدأ كل سورة؟', 'How does every surah begin?'),
        b: [{ row: [{ kid: T('قبل أول آية في كل سورة ترى ثلاثة أشياء بالترتيب:\n١) لوحة مزخرفة مكتوب فيها اسم السورة.\n٢) البسملة.\n٣) أول آية، وفي آخرها الرقم ١.\nإلا سورة التوبة: تبدأ بلا بسملة.', 'Before the first ayah of every surah you see three things, in order:\n1) A decorated panel with the surah’s name.\n2) The basmala.\n3) The first ayah, ending with the number 1.\nExcept Surah At-Tawbah: it starts without a basmala.') }, { art: 'surah_start' }] },
          { row: [{ img: 'mushaf/signs/part_banner.webp', cap: T('لوحة اسم السورة', 'The surah name panel'), credit: 'mushaf' }, { img: 'mushaf/signs/part_basmala.webp', cap: T('البسملة', 'The basmala'), credit: 'mushaf' }] }],
        tip: T('افتح مصحفًا حقيقيًا على أول جزء عمّ، ودع الأطفال يعدّون: لوحة، بسملة، آية.', 'Open a real mushaf at the start of Juz ʿAmma and let the children count: panel, basmala, ayah.') },
      { icon: '🗺️', k: T('رأس الصفحة', 'The page header'), t: T('خريطة صفحة المصحف', 'Map of a mushaf page'),
        b: [{ row: [{ art: 'page_map' }, { kid: T('كل صفحة في المصحف تخبرك أين أنت:\n• في أعلاها اسم الجزء واسم السورة.\n• في أسفلها رقم الصفحة.\n• وعلى الهامش فانوس مزخرف يظهر حيث يبدأ ربع جديد (ستتعلّمه في الدرس القادم).', 'Every mushaf page tells you where you are:\n• At the top: the juz name and the surah name.\n• At the bottom: the page number.\n• In the margin: a decorated lantern where a new quarter starts (next lesson).') }] },
          { media: { kind: 'pagehead', juz: 30, surah: 78 }, cap: T('رأس صفحة من سورة النبأ في الجزء الثلاثين', 'A page header from Surah An-Naba in Juz 30') }],
        tip: T('اطلب من كل طفل أن يفتح مصحفه على أي صفحة ويقرأ اسم الجزء واسم السورة في أعلاها.', 'Ask each child to open any page and read the juz and surah names at the top.') },
      { icon: '🔎', k: T('استكشف', 'Explore'), t: T('ابحث بنفسك في صفحة حقيقية', 'Find them yourself on a real page'), b: [{ explore: 'mushaf_ayah_number' }],
        tip: T('اعرض الصفحة على الشاشة الكبيرة، وليختر كل طفل رقمًا ذهبيًا ويشرح ما هو.', 'Show the page on the big screen; each child picks a golden number and explains it.') }
    ],
    recap: [T('رقم الآية في آخرها، ولا يُقرأ.', 'The ayah number is at its end, and is not read.'), T('السورة تبدأ بلوحة اسمها ثم البسملة (إلا التوبة).', 'A surah starts with its name panel, then the basmala (except At-Tawbah).'), T('رأس الصفحة فيه اسم الجزء واسم السورة.', 'The page header shows the juz and surah names.')]
  },

  mushaf_juz_hizb: {
    title: T('كعكة القرآن 🎂', 'The Qur’an Cake 🎂'), mins: 8, cover: { art: 'cake' },
    hook: T('كيف قسّم العلماء القرآن ليسهل حفظه ومراجعته؟', 'How did scholars divide the Qur’an to make it easier to memorize and revise?'),
    goals: [T('يعرف أن القرآن ٣٠ جزءًا و٦٠ حزبًا و٢٤٠ ربعًا.', 'Knows the Qur’an has 30 juz, 60 hizb and 240 quarters.'), T('يقرأ الفانوس على هامش الصفحة.', 'Reads the lantern in the page margin.'), T('يعرف علامة الربع ۞ داخل السطر.', 'Recognizes the quarter mark ۞ in the line.')],
    slides: [
      { icon: '🎂', k: T('القسمة', 'Dividing'), t: T('ثلاثون كعكة!', 'Thirty cakes!'),
        b: [{ art: 'facts' }, { row: [{ kid: T('تخيّل القرآن ثلاثين كعكة: كل كعكة اسمها «جزء».\nنقطع الكعكة نصفين: كل نصف اسمه «حزب».\nثم نقطع كل حزب أربع قطع: كل قطعة اسمها «ربع».\nفالجزء فيه حزبان، وثمانية أرباع.', 'Imagine the Qur’an as thirty cakes: each cake is a “juz”.\nWe cut a cake in two: each half is a “hizb”.\nThen we cut each hizb into four slices: each slice is a “quarter”.\nSo a juz has two hizbs and eight quarters.') }, { art: 'cake' }] },
          { check: { q: T('كم ربعًا في الجزء الواحد؟', 'How many quarters are in one juz?'), opts: [{ t: T('أربعة', 'Four'), fb: T('أربعة في الحزب الواحد، والجزء حزبان.', 'Four in one hizb — and a juz is two hizbs.') }, { t: T('ثمانية', 'Eight'), ok: true, fb: T('صحيح! حزبان × ٤ أرباع = ٨.', 'Correct! 2 hizbs × 4 quarters = 8.') }, { t: T('اثنان', 'Two'), fb: T('اثنان هما الحزبان، لا الأرباع.', 'Two is the number of hizbs, not quarters.') }] } }],
        tip: T('أحضر ورقة دائرية وقصّها أمام الأطفال إلى نصفين ثم ثمانية أجزاء.', 'Bring a paper circle and cut it in front of the children into halves, then eight slices.') },
      { icon: '🏮', k: T('الفانوس', 'The lantern'), t: T('فانوس على هامش الصفحة', 'A lantern in the page margin'),
        b: [{ kid: T('عندما يبدأ ربع جديد ترى على هامش الصفحة فانوسًا مزخرفًا، مكتوب فيه أين وصلت: ربع الحزب، أو نصفه، أو ثلاثة أرباعه، أو بداية حزب أو جزء.', 'When a new quarter begins you see a decorated lantern in the page margin, telling you where you are: a quarter, a half or three quarters of the hizb, or the start of a hizb or a juz.') },
          { lanterns: [2, 3, 4, 5, 9] },
          { row: [{ kid: T('سرّ صغير: الفانوس بقبّتين (فوق وتحت) = بداية حزب أو جزء.\nالفانوس بقبّة واحدة = ربع أو نصف أو ثلاثة أرباع.', 'A little secret: a lantern with two domes (top and bottom) = the start of a hizb or juz.\nA lantern with one dome = a quarter, a half or three quarters.') }, { check: { q: T('فانوس بقبّتين يعني:', 'A lantern with two domes means:'), opts: [{ t: T('بداية حزب أو جزء', 'The start of a hizb or juz'), ok: true, fb: T('أحسنت!', 'Well done!') }, { t: T('ربع الحزب', 'A quarter of a hizb'), fb: T('الربع فانوسه بقبّة واحدة.', 'A quarter’s lantern has one dome.') }] } }] }],
        tip: T('تصفّح مع الأطفال جزء عمّ، وليصِح أول من يرى فانوسًا: «فانوس!» ثم يقرأ ما فيه.', 'Leaf through Juz ʿAmma with the children; the first to spot a lantern shouts “lantern!” and reads it.') },
      { icon: '۞', k: T('علامة الربع', 'The quarter mark'), t: T('وردة صغيرة داخل السطر', 'A little flower inside the line'),
        b: [{ signs: [{ id: 'rub_mark', kid: T('وفي السطر نفسه، قبل أول كلمة من الربع الجديد، ترى هذه العلامة ۞. فالفانوس على الهامش، والوردة داخل السطر.', 'In the line itself, just before the first word of the new quarter, you see this mark ۞. The lantern is in the margin; the flower is inside the line.') }] },
          { signAyahs: ['rub_mark'], n: 2 }],
        tip: T('اطلب من الطفل أن يضع إصبعه على ۞ ثم ينظر إلى الهامش ليجد الفانوس في السطر نفسه.', 'Ask the child to put a finger on ۞, then look at the margin to find the lantern on the same line.') },
      { icon: '🔎', k: T('استكشف', 'Explore'), t: T('جد الفانوس والوردة', 'Find the lantern and the flower'), b: [{ explore: 'mushaf_juz_hizb' }],
        tip: T('سؤال للمسابقة: «في أي ربع نحن الآن؟» ويجيب الطفل من الفانوس.', 'Quiz question: “Which quarter are we in now?” The child answers from the lantern.') }
    ],
    recap: [T('القرآن ٣٠ جزءًا، والجزء حزبان، والحزب ٤ أرباع.', '30 juz; a juz is 2 hizbs; a hizb is 4 quarters.'), T('الفانوس على الهامش يخبرك أين وصلت.', 'The margin lantern tells you where you are.'), T('علامة ۞ داخل السطر عند بداية الربع.', 'The ۞ mark sits in the line where a quarter begins.')]
  },

  mushaf_harakat: {
    title: T('أصوات الفم 👄', 'Mouth Sounds 👄'), mins: 8, cover: { art: 'mouths' },
    hook: T('الحرف وحده لا يتكلّم… فمن يعطيه صوته؟', 'A letter alone cannot speak… so who gives it a voice?'),
    goals: [T('يعرف الفتحة والضمّة والكسرة وأماكنها.', 'Knows fatha, damma and kasra and where they go.'), T('يربط كل حركة بشكل الفم.', 'Links each vowel to a mouth shape.'), T('يعرف أن التنوين حركة ومعها نون لا تُكتب.', 'Knows tanween is a vowel plus an unwritten noon.')],
    slides: [
      { icon: '👄', k: T('الحركات الثلاث', 'Three vowels'), t: T('كل حركة لها شكل فم', 'Each vowel has a mouth shape'),
        b: [{ kid: T('الحرف وحده صامت. الحركة الصغيرة فوقه أو تحته تعطيه صوته:\n• الفتحة: نفتح الفم.\n• الضمّة: نضمّ الشفتين كأننا ننفخ شمعة.\n• الكسرة: نُنزل الفك إلى الأسفل.', 'A letter alone is silent. The small mark above or below it gives it a voice:\n• Fatha: we open our mouth.\n• Damma: we round our lips as if blowing a candle.\n• Kasra: we lower our jaw.') }, { art: 'mouths' }],
        tip: T('ليقف الأطفال أمام مرآة صغيرة (أو أمام زميل) ويقولوا: بَ بُ بِ، ويلاحظوا شكل الفم.', 'Let the children say “ba, bu, bi” in front of a small mirror (or a classmate) and watch their mouths.') },
      { icon: '📍', k: T('أين تُكتب؟', 'Where is it written?'), t: T('فوق الحرف أو تحته', 'Above or below the letter'),
        b: [{ art: 'harakat_pos' }, { signs: [{ id: 'fatha', kid: T('خط صغير مائل فوق الحرف.', 'A small slanted stroke above the letter.') }, { id: 'damma', kid: T('واو صغيرة فوق الحرف.', 'A tiny waw above the letter.') }, { id: 'kasra', kid: T('خط صغير مائل تحت الحرف.', 'A small slanted stroke below the letter.') }] }],
        tip: T('اكتب «ب» كبيرة على السبورة، وليضع كل طفل حركة في مكانها الصحيح.', 'Write a big “ب” on the board and let each child place a vowel in its correct spot.') },
      { icon: '➕', k: T('التنوين', 'Tanween'), t: T('حركتان = حركة + نون مخفية', 'Two marks = a vowel + a hidden noon'),
        b: [{ row: [{ kid: T('إذا رأيت الحركة مكرّرة مرتين في آخر الكلمة فهذا «تنوين».\nنقرأ الحركة ثم نونًا ساكنة لا نراها مكتوبة: بً = بَنْ، بٌ = بُنْ، بٍ = بِنْ.', 'If you see a vowel mark doubled at the end of a word, that is “tanween”.\nWe read the vowel and then a silent noon that is not written: بً = ban, بٌ = bun, بٍ = bin.') }, { art: 'tanween_eq' }] },
          { signs: [{ id: 'fathatan', kid: T('فتحتان فوق الحرف: «ـَنْ».', 'Two fathas above: “an”.') }, { id: 'dammatan', kid: T('ضمّتان فوق الحرف: «ـُنْ».', 'Two dammas above: “un”.') }, { id: 'kasratan', kid: T('كسرتان تحت الحرف: «ـِنْ».', 'Two kasras below: “in”.') }] },
          { check: { q: T('اختر كل الحروف التي عليها تنوين:', 'Pick every letter that has tanween:'), multi: true, opts: [{ g: 'بَ', fb: T('حركة واحدة: فتحة فقط.', 'Just one fatha.') }, { g: 'بٌ', ok: true, fb: T('تنوين ضم: «بُنْ».', 'Dammatan: “bun”.') }, { g: 'بِ', fb: T('حركة واحدة: كسرة فقط.', 'Just one kasra.') }, { g: 'بً', ok: true, fb: T('تنوين فتح: «بَنْ».', 'Fathatan: “ban”.') }] } }],
        tip: T('صفّق مرة للحركة ومرتين للتنوين: «بَ» تصفيقة، «بً» تصفيقتان.', 'Clap once for a vowel and twice for tanween: “ba” one clap, “ban” two claps.') },
      { icon: '🔎', k: T('استكشف', 'Explore'), t: T('جد الحركات في صفحة حقيقية', 'Find the vowels on a real page'), b: [{ explore: 'mushaf_harakat' }],
        tip: T('ليبحث كل طفل في صفحته عن تنوين واحد ويقرأ الكلمة.', 'Each child finds one tanween on the page and reads the word.') }
    ],
    recap: [T('الفتحة والضمة فوق الحرف، والكسرة تحته.', 'Fatha and damma above the letter, kasra below.'), T('لكل حركة شكل فم: فتح، ضمّ، كسر.', 'Each vowel has a mouth shape: open, round, lowered.'), T('التنوين = حركة + نون ساكنة لا تُكتب.', 'Tanween = a vowel + a silent, unwritten noon.')]
  },

  mushaf_hamza: {
    title: T('ألف تختفي وهمزة لا تختفي 🚪', 'An Alif That Hides, a Hamza That Never Does 🚪'), mins: 8, cover: { art: 'hamza_wasla' },
    hook: T('لماذا نقرأ الألف أحيانًا ولا نقرؤها أحيانًا؟', 'Why do we sometimes read an alif and sometimes not?'),
    goals: [T('يميّز همزة القطع (أ إ) من ألف الوصل (ٱ).', 'Tells the hamza (أ إ) from the alif wasla (ٱ).'), T('يعرف أن ألف الوصل تسقط إذا وصلنا.', 'Knows the alif wasla drops when we join.'), T('يعرف الهمزة على السطر (ء).', 'Recognizes the hamza on the line (ء).')],
    slides: [
      { icon: '🚪', k: T('الحكاية', 'The story'), t: T('طرقة الباب والباب المنزلق', 'The knock and the sliding door'),
        b: [{ row: [{ kid: T('في المصحف نوعان من الألف:\n• ألف عليها أو تحتها رأس عين صغيرة (أ إ): هذه «همزة القطع»، صوتها مثل طرقة على الباب، نسمعه دائمًا.\n• ألف عليها رأس صاد صغيرة (ٱ): هذه «ألف الوصل»، مثل باب منزلق: إذا بدأنا بها نطقناها، وإذا جئنا من الكلمة التي قبلها اختفت.', 'The mushaf has two kinds of alif:\n• An alif with a tiny ʿayn head above or below it (أ إ): the “hamza”. It sounds like a knock on a door — we always hear it.\n• An alif with a tiny ṣād head on it (ٱ): the “alif wasla”, like a sliding door. If we start with it we say it; if we come from the word before, it disappears.') }, { art: 'hamza_wasla' }] }],
        tip: T('اطرق الطاولة مع كل همزة قطع تقرؤها، واسحب يدك بهدوء مع ألف الوصل.', 'Knock on the table for each hamza you read, and slide your hand quietly for the alif wasla.') },
      { icon: '🔤', k: T('العلامات', 'The marks'), t: T('أربع صور في المصحف', 'Four shapes in the mushaf'),
        b: [{ signs: [{ id: 'hamza_above', kid: T('همزة فوق الألف: تُقرأ دائمًا.', 'Hamza above the alif: always read.') }, { id: 'hamza_below', kid: T('همزة تحت الألف (بكسرة): تُقرأ دائمًا.', 'Hamza below the alif (with kasra): always read.') }, { id: 'hamza_line', kid: T('همزة وحدها على السطر: تُقرأ أيضًا.', 'A hamza alone on the line: also read.') }, { id: 'alif_wasla', kid: T('ألف عليها رأس صاد صغيرة: تسقط إذا وصلنا.', 'An alif with a small ṣād head: drops when joining.') }] }],
        tip: T('اكتب على بطاقات: أ، إ، ء، ٱ — وليصنّفها الأطفال في سلّتين: «تُقرأ دائمًا» و«تختفي في الوصل».', 'Write أ إ ء ٱ on cards; children sort them into two baskets: “always read” and “drops when joining”.') },
      { icon: '📖', k: T('في القرآن', 'In the Qur’an'), t: T('شاهدها في الفاتحة', 'See it in Al-Fatiha'),
        b: [{ ayah: '1:1', hl: { 1: { 0: 'trigger' } }, note: T('هنا وصلنا الكلمة بما قبلها، فألف الوصل الملوَّنة لا تُنطق.', 'Here we join the word to the one before it, so the coloured alif wasla is not pronounced.') },
          { ayah: '1:2', hl: { 0: { 0: 'cause' } }, note: T('هنا بدأنا القراءة بألف الوصل، فنطقناها بفتحة.', 'Here we start reading with the alif wasla, so we pronounce it with a fatha.') },
          { ayah: '1:5', hl: { 0: { 0: 'cause' } }, note: T('همزة القطع تحت الألف: تُنطق دائمًا.', 'The hamza below the alif: always pronounced.') }],
        tip: T('اقرأ «بسم الله» ببطء ودع الأطفال يلاحظوا أننا لم نقل «بسم ألله».', 'Read the basmala slowly and let the children notice that we do not say “bismi Allah” with an extra a.') },
      { icon: '✅', k: T('اختبر نفسك', 'Test yourself'), t: T('أيها يُقرأ دائمًا؟', 'Which one is always read?'),
        b: [{ check: { q: T('اختر كل ألف تُقرأ دائمًا:', 'Pick every alif that is always read:'), multi: true, opts: [{ g: 'أ', ok: true, fb: T('همزة قطع: تُقرأ دائمًا.', 'A hamza: always read.') }, { g: 'ٱ', fb: T('ألف وصل: تسقط في الوصل.', 'Alif wasla: drops when joining.') }, { g: 'إ', ok: true, fb: T('همزة قطع مكسورة: تُقرأ دائمًا.', 'A hamza with kasra: always read.') }] } }, { explore: 'mushaf_hamza' }],
        tip: T('مسابقة سريعة: اعرض صفحة، والفائز أول من يجد ألف وصل.', 'Quick contest: show a page; the winner is first to find an alif wasla.') }
    ],
    recap: [T('أ إ ء: همزة تُقرأ دائمًا.', 'أ إ ء: a hamza, always read.'), T('ٱ: ألف وصل، تُقرأ في البداية وتسقط في الوصل.', 'ٱ: alif wasla — read at the start, dropped when joining.'), T('مثالها في «بسم الله»: لا نقول الألف.', 'Example: in the basmala we do not say that alif.')]
  },

  mushaf_waqf: {
    title: T('إشارات المرور في المصحف 🚦', 'Traffic Lights in the Mushaf 🚦'), mins: 10, cover: { art: 'traffic' },
    hook: T('متى نقف لنأخذ نفَسًا، ومتى نكمل القراءة؟', 'When do we stop for a breath, and when do we keep reading?'),
    goals: [T('يعرف أن علامات الوقف فوق السطر بين الكلمات.', 'Knows the stop signs sit above the line, between words.'), T('يعرف معنى: م، قلى، ج، صلى، ∴.', 'Knows what م، قلى، ج، صلى، ∴ mean.'), T('يعرف أن السكتة وقفة قصيرة بلا نفَس.', 'Knows the saktah is a short pause without breath.')],
    slides: [
      { icon: '🚦', k: T('الحكاية', 'The story'), t: T('القراءة طريق، والعلامات إشارات', 'Reading is a road; the signs are traffic lights'),
        b: [{ kid: T('عندما تقرأ فأنت تسير في طريق. وفوق السطر بين الكلمات إشارات صغيرة تقول لك: قف، أو أكمل، أو كما تحب.', 'When you read, you travel along a road. Above the line, between words, small signs tell you: stop, go on, or as you like.') }, { art: 'traffic' }],
        tip: T('العب «إشارة المرور»: ارفع بطاقة «م» فيقف الجميع، و«صلى» فيمشون، و«ج» فيختار كل طفل.', 'Play “traffic light”: hold up «م» and everyone stops, «صلى» and they walk, «ج» and each child chooses.') },
      { icon: '🪧', k: T('العلامات', 'The signs'), t: T('ست علامات وما تعنيه', 'Six signs and what they mean'),
        b: [{ signs: [{ id: 'waqf_lazim', kid: T('قف هنا لازمًا، لأن الوصل يغيّر المعنى.', 'You must stop here, because going on changes the meaning.') }, { id: 'waqf_qala', kid: T('الوقف أحسن، والوصل جائز.', 'Stopping is better; going on is allowed.') }, { id: 'waqf_jaiz', kid: T('كما تحب: قف أو أكمل.', 'As you like: stop or go on.') }, { id: 'waqf_sala', kid: T('الوصل أحسن، والوقف جائز.', 'Going on is better; stopping is allowed.') }, { id: 'waqf_muanaqa', kid: T('ثلاث نقاط في مكانين قريبين: قف عند واحد منهما فقط.', 'Three dots in two nearby places: stop at only one of them.') }, { id: 'saktah', kid: T('سكتة: وقفة قصيرة بلا نفَس ثم أكمل.', 'Saktah: a short pause without breath, then go on.') }] }],
        tip: T('رتّب العلامات مع الأطفال من «قف حتمًا» إلى «أكمل»: م ← قلى ← ج ← صلى.', 'Order the signs with the children from “must stop” to “go on”: م ← قلى ← ج ← صلى.') },
      { icon: '📖', k: T('في القرآن', 'In the Qur’an'), t: T('شاهد العلامات في الآيات', 'See the signs in the verses'),
        b: [{ signAyahs: ['waqf_lazim', 'waqf_qala', 'waqf_jaiz', 'waqf_sala', 'waqf_muanaqa', 'saktah'], n: 1 }],
        tip: T('اقرأ الآية مرة بالوقف عند العلامة، ثم اسأل: «هل كان يجوز أن نكمل؟»', 'Read the verse stopping at the sign, then ask: “Could we have gone on?”') },
      { icon: '🤫', k: T('السكتة', 'The saktah'), t: T('السكتة ليست وقفًا', 'A saktah is not a stop'),
        b: [{ row: [{ art: 'saktah' }, { dodont: { no: [T('لا تأخذ نفَسًا عند السكتة.', 'Don’t take a breath at the saktah.'), T('لا تقف طويلًا كأنه آخر الآية.', 'Don’t pause long as if the ayah ended.')], yes: [T('توقّف قصير بقدر حركتين.', 'A short two-count pause.'), T('ثم أكمل القراءة فورًا.', 'Then carry on at once.')] } }] },
          { check: { q: T('علامة «م» فوق السطر تعني:', 'The sign «م» above the line means:'), opts: [{ t: T('يجب أن أقف', 'I must stop'), ok: true, fb: T('أحسنت! الوقف هنا لازم.', 'Well done! Stopping is required here.') }, { t: T('يجب أن أكمل', 'I must go on'), fb: T('هذا عكسها تمامًا.', 'That is the exact opposite.') }, { t: T('كما أحب', 'As I like'), fb: T('«كما تحب» هي علامة «ج».', '“As you like” is the sign «ج».') }] } }],
        tip: T('درّبهم على السكتة بالعدّ همسًا: «واحد، اثنان» ثم إكمال القراءة بلا نفَس.', 'Practise the saktah by whispering “one, two” then continuing without a breath.') },
      { icon: '🔎', k: T('استكشف', 'Explore'), t: T('ابحث عن الإشارات', 'Find the signs'), b: [{ explore: 'mushaf_waqf' }],
        tip: T('اطلب من الأطفال أن يعدّوا علامات الوقف في صفحة واحدة.', 'Ask the children to count the stop signs on one page.') }
    ],
    recap: [T('علامات الوقف فوق السطر بين الكلمات.', 'Stop signs sit above the line, between words.'), T('م قف لازمًا، قلى الوقف أحسن، ج كما تحب، صلى الوصل أحسن، ∴ قف عند واحدة.', 'م must stop · قلى stop is better · ج either · صلى go is better · ∴ stop at one.'), T('السكتة: وقفة قصيرة بلا نفَس.', 'Saktah: a short pause, no breath.')]
  },

  mushaf_silent_sukun: {
    title: T('حروف نائمة وحروف مختفية 😴', 'Sleeping Letters and Hidden Letters 😴'), mins: 10, cover: { art: 'sukun_sleep' },
    hook: T('هناك حروف مكتوبة لكننا لا نقرؤها! كيف نعرفها؟', 'Some letters are written but not read! How can we tell?'),
    goals: [T('يعرف شكل السكون في المصحف (رأس خاء صغيرة).', 'Knows the mushaf sukun (a small khā’ head).'), T('يعرف أن الشدّة حرفان: ساكن ثم متحرك.', 'Knows a shadda is two letters: still then moving.'), T('يميّز الصفر الدائري والمستطيل والميم الصغيرة.', 'Tells apart the round zero, oblong zero and small meem.')],
    slides: [
      { icon: '😴', k: T('السكون', 'Sukun'), t: T('حرف نائم بلا حركة', 'A letter asleep, with no vowel'),
        b: [{ row: [{ kid: T('السكون في المصحف رأس خاء صغيرة بلا نقطة فوق الحرف. معناه: الحرف نائم، ليس عليه فتحة ولا ضمّة ولا كسرة.\nانتبه! الدائرة الصغيرة ليست سكونًا: هي علامة حرف لا يُقرأ (سنراها بعد قليل).', 'In the mushaf the sukun is a small head of the letter khā’, without its dot, above the letter. It means the letter is asleep: no fatha, no damma, no kasra.\nCareful! The small circle is not a sukun: it marks a letter that is not read (coming up).') }, { art: 'sukun_sleep' }] },
          { signs: [{ id: 'sukun', kid: T('هذا هو السكون في المصحف.', 'This is the sukun in the mushaf.') }] }],
        tip: T('نبّه الأطفال الذين تعلّموا السكون دائرةً في المدرسة: في المصحف شكله رأس خاء.', 'Point out to children who learned the sukun as a circle at school: in the mushaf it is a khā’ head.') },
      { icon: '✌️', k: T('الشدّة', 'Shadda'), t: T('حرفان في حرف واحد', 'Two letters in one'),
        b: [{ row: [{ kid: T('الشدّة تعني أن الحرف مكرّر: الأول ساكن والثاني متحرّك. فنضغط على الحرف قليلًا.', 'A shadda means the letter is doubled: the first one still, the second one moving. So we press on the letter a little.') }, { art: 'shadda_eq' }] }, { signs: [{ id: 'shadda', kid: T('هكذا تبدو الشدّة في المصحف.', 'This is how a shadda looks in the mushaf.') }] }],
        tip: T('قل «رَبْ — بَ» ببطء ثم اجمعهما سريعًا «ربَّ» ليشعر الطفل بالحرفين.', 'Say “rab — ba” slowly, then join them fast, “rabba”, so the child feels the two letters.') },
      { icon: '👻', k: T('حروف مختفية', 'Hidden letters'), t: T('الصفر الدائري والصفر المستطيل', 'The round zero and the oblong zero'),
        b: [{ row: [{ kid: T('بعض الحروف مثل الأشباح: مكتوبة ولا تُسمع.\n• فوقها صفر دائري ۟: لا نقرؤها أبدًا.\n• فوقها صفر مستطيل ۠: لا نقرؤها إذا وصلنا، ونقرؤها إذا وقفنا عليها.', 'Some letters are like ghosts: written but silent.\n• With a round zero ۟ on top: never read.\n• With an oblong zero ۠ on top: not read when we join, read when we stop on it.') }, { art: 'ghost_letters' }] },
          { signs: [{ id: 'zero_round', kid: T('صفر دائري: الحرف لا يُقرأ أبدًا.', 'Round zero: the letter is never read.') }, { id: 'zero_rect', kid: T('صفر مستطيل: يُقرأ عند الوقف فقط.', 'Oblong zero: read only when stopping.') }] },
          { signAyahs: ['zero_round', 'zero_rect'], n: 1 }],
        tip: T('ارسم شبحًا صغيرًا فوق الحرف الزائد في الآية المعروضة ليتذكّر الأطفال أنه لا يُقرأ.', 'Draw a little ghost over the extra letter in the shown verse so the children remember it is silent.') },
      { icon: '🪄', k: T('الميم الصغيرة', 'The small meem'), t: T('ميم صغيرة فوق النون', 'A small meem above the noon'),
        b: [{ signs: [{ id: 'small_meem', kid: T('ميم صغيرة فوق النون أو التنوين قبل الباء: نقرؤها ميمًا (ستتعلّم هذا في درس «الإقلاب»).', 'A small meem above a noon or tanween before a baa: we read it as a meem (you will learn this in the “Iqlab” lesson).') }] }, { signAyahs: ['small_meem'], n: 1 },
          { check: { q: T('الحرف الذي فوقه صفر دائري ۟:', 'A letter with a round zero ۟ on it is:'), opts: [{ t: T('لا يُقرأ أبدًا', 'Never read'), ok: true, fb: T('صحيح! هو حرف زائد صامت.', 'Correct! It is a silent extra letter.') }, { t: T('ساكن نقرؤه', 'A still letter we read'), fb: T('السكون رأس خاء، لا دائرة.', 'The sukun is a khā’ head, not a circle.') }, { t: T('يُقرأ عند الوقف فقط', 'Read only when stopping'), fb: T('هذا الصفر المستطيل.', 'That is the oblong zero.') }] } }],
        tip: T('اربط الميم الصغيرة بدرس الإقلاب: «تذكّروا هذه الميم، ستعود قريبًا!»', 'Link the small meem to the Iqlab lesson: “Remember this meem — it’s coming back soon!”') },
      { icon: '🔎', k: T('استكشف', 'Explore'), t: T('جد العلامات في صفحة حقيقية', 'Find the marks on a real page'), b: [{ explore: 'mushaf_silent_sukun' }],
        tip: T('ليبحث الأطفال عن سكون وشدّة وصفر دائري في الصفحة نفسها.', 'Children look for a sukun, a shadda and a round zero on the same page.') }
    ],
    recap: [T('السكون رأس خاء صغيرة، والدائرة ليست سكونًا.', 'The sukun is a small khā’ head; the circle is not a sukun.'), T('الشدّة = حرف ساكن + حرف متحرك.', 'Shadda = a still letter + a moving letter.'), T('الصفر الدائري لا يُقرأ أبدًا، والمستطيل يُقرأ عند الوقف.', 'The round zero is never read; the oblong one is read when stopping.')]
  },

  mushaf_madd_letters: {
    title: T('حروف صغيرة لها صوت 🔊', 'Small Letters With a Voice 🔊'), mins: 8, cover: { art: 'small_helpers' },
    hook: T('حروف صغيرة جدًا في المصحف… هل نقرؤها؟', 'Tiny letters in the mushaf… do we read them?'),
    goals: [T('يعرف الألف الصغيرة وأنها تُقرأ مدًّا.', 'Knows the small alif is read long.'), T('يعرف الواو والياء الصغيرتين بعد هاء الضمير.', 'Knows the small waw and yaa after the pronoun hā’.'), T('يعرف أن المدّة ۤ تعني مدًّا أطول.', 'Knows the madd sign ۤ means a longer stretch.')],
    slides: [
      { icon: '🧚', k: T('الحكاية', 'The story'), t: T('مساعدون صغار', 'Little helpers'),
        b: [{ row: [{ kid: T('في المصحف حروف صغيرة كأنها مساعدون صغار: لم تُكتب كبيرة، لكنها تُقرأ!\n• ألف صغيرة واقفة فوق الحرف: نقرؤها ألفًا ممدودة.\n• واو صغيرة بعد «هُ» وياء صغيرة بعد «هِ»: نقرؤهما إذا وصلنا الكلام.', 'The mushaf has tiny letters, like little helpers: not written big, but read!\n• A small upright alif above a letter: read as a long alif.\n• A small waw after “hu” and a small yaa after “hi”: read when we join the words.') }, { art: 'small_helpers' }] },
          { signs: [{ id: 'dagger_alif', kid: T('ألف صغيرة: تُقرأ مدًّا بحركتين.', 'Small alif: read long, two counts.') }, { id: 'small_waw', kid: T('واو صغيرة بعد هاء الضمير المضمومة.', 'Small waw after the pronoun hā’ with damma.') }, { id: 'small_yaa', kid: T('ياء صغيرة بعد هاء الضمير المكسورة.', 'Small yaa after the pronoun hā’ with kasra.') }] }],
        tip: T('اكتب حرفًا كبيرًا وفوقه ألف صغيرة، واسأل: «هل نسمعها؟» ثم اقرأها ممدودة.', 'Write a big letter with a small alif above and ask: “Do we hear it?” Then read it long.') },
      { icon: '📏', k: T('المدّة', 'The madd sign'), t: T('مدّ أطول من العادة', 'A longer stretch than usual'),
        b: [{ row: [{ art: 'stretch' }, { kid: T('المدّة علامة متموّجة فوق حرف المد. معناها: امدد أكثر من حركتين (أربعًا أو خمسًا أو ستًّا بحسب ما بعدها)، مثل شريط مطاطي نشدّه طويلًا.', 'The madd sign is a wavy mark above the madd letter. It means: stretch longer than two counts (four, five or six depending on what follows), like pulling a rubber band far.') }] },
          { signs: [{ id: 'madd', kid: T('المدّة: امدد أطول من الطبيعي.', 'Madd sign: stretch longer than natural.') }] }],
        tip: T('استعمل شريطًا مطاطيًا: شدّه قليلًا للمدّ الطبيعي، وكثيرًا للمدّة.', 'Use a rubber band: pull it a little for natural madd and a lot for the madd sign.') },
      { icon: '📖', k: T('في القرآن', 'In the Qur’an'), t: T('شاهد الحروف الصغيرة', 'See the small letters'), b: [{ signAyahs: ['dagger_alif', 'small_waw', 'small_yaa', 'madd'], n: 1 },
        { check: { q: T('الألف الصغيرة فوق الحرف:', 'The small alif above a letter:'), opts: [{ t: T('تُقرأ مدًّا', 'Is read long'), ok: true, fb: T('أحسنت! هي ألف حقيقية في النطق.', 'Well done! It is a real alif when spoken.') }, { t: T('لا تُقرأ', 'Is not read'), fb: T('بل تُقرأ، وإن كُتبت صغيرة.', 'It is read, even though it is written small.') }] } }],
        tip: T('شغّل الآية واطلب من الأطفال أن يرفعوا إصبعين عند سماع المدّ.', 'Play the verse; children raise two fingers when they hear the stretch.') },
      { icon: '🔎', k: T('استكشف', 'Explore'), t: T('جد الحروف الصغيرة', 'Find the small letters'), b: [{ explore: 'mushaf_madd_letters' }],
        tip: T('مسابقة: من يجد أكثر عدد من الألفات الصغيرة في الصفحة؟', 'Contest: who finds the most small alifs on the page?') }
    ],
    recap: [T('الألف الصغيرة تُقرأ مدًّا بحركتين.', 'The small alif is read long, two counts.'), T('الواو والياء الصغيرتان بعد هاء الضمير تُقرآن في الوصل.', 'The small waw and yaa after the pronoun hā’ are read when joining.'), T('المدّة ۤ: مدّ أطول من الطبيعي.', 'The madd sign ۤ: longer than natural.')]
  },

  mushaf_special: {
    title: T('كنزان نادران 💎', 'Two Rare Treasures 💎'), mins: 5, cover: { art: 'gems' },
    hook: T('علامتان لن تراهما إلا مرة واحدة في المصحف كله!', 'Two marks you will see only once in the whole mushaf!'),
    goals: [T('يعرف علامة الإشمام وموضعها (سورة يوسف).', 'Knows the ishmam mark and where it is (Surah Yusuf).'), T('يعرف علامة الإمالة وموضعها (سورة هود).', 'Knows the imala mark and where it is (Surah Hud).'), T('يعرف أنهما تُتعلَّمان بالسماع من المعلم.', 'Knows they are learned by listening to the teacher.')],
    slides: [
      { icon: '💎', k: T('الكنزان', 'The treasures'), t: T('كل كنز في مكان واحد', 'Each treasure in one place'),
        b: [{ row: [{ kid: T('في المصحف علامتان نادرتان جدًا، كل واحدة في مكان واحد فقط:\n• علامة الإشمام في سورة يوسف: نضمّ الشفتين قليلًا دون صوت.\n• علامة الإمالة في سورة هود: نميل بالصوت قليلًا.\nإذا رأيت واحدة منهما فاستمع إلى معلّمك ليعلّمك نطقها.', 'The mushaf has two very rare marks, each in one place only:\n• The ishmam mark in Surah Yusuf: we round our lips a little, silently.\n• The imala mark in Surah Hud: we tilt the sound a little.\nIf you see one, listen to your teacher to learn how to say it.') }, { art: 'gems' }] },
          { signs: [{ id: 'ishmam', kid: T('الإشمام: ضمّ الشفتين بلا صوت (سورة يوسف).', 'Ishmam: round the lips silently (Surah Yusuf).') }, { id: 'imala', kid: T('الإمالة: إمالة الصوت (سورة هود).', 'Imala: tilting the sound (Surah Hud).') }] },
          { check: { q: T('كم مرة تأتي علامة الإمالة في المصحف (رواية حفص)؟', 'How many times does the imala mark appear in the mushaf (Hafs)?'), opts: [{ t: T('مرة واحدة', 'Once'), ok: true, fb: T('صحيح! في سورة هود.', 'Correct! In Surah Hud.') }, { t: T('في كل صفحة', 'On every page'), fb: T('لا، هي نادرة جدًا.', 'No, it is very rare.') }] } }],
        tip: T('هذا الدرس للمعرفة فقط؛ النطق الصحيح يُتعلَّم منك سماعًا عند الوصول إلى السورتين.', 'This lesson is for recognition only; the pronunciation is learned from you by listening, when you reach the two surahs.') },
      { icon: '🔎', k: T('استكشف', 'Explore'), t: T('جد الكنزين', 'Find the treasures'), b: [{ explore: 'mushaf_special' }],
        tip: T('دع الطفل يكتشف العلامة على الصفحة، ثم اقرأ الكلمة أمامه.', 'Let the child discover the mark on the page, then read the word to them.') }
    ],
    recap: [T('الإشمام في سورة يوسف: ضمّ الشفتين بلا صوت.', 'Ishmam in Surah Yusuf: rounding the lips silently.'), T('الإمالة في سورة هود.', 'Imala in Surah Hud.'), T('كلاهما يُتعلَّم بالسماع من المعلم.', 'Both are learned by listening to the teacher.')]
  },

  mushaf_sin_saad: {
    title: T('الصاد تلبس قبعة السين 🎩', 'The Saad Wears a Seen Hat 🎩'), mins: 6, cover: { art: 'costume' },
    hook: T('حرف مكتوب صادًا… ونقرؤه سينًا!', 'A letter written as saad… read as seen!'),
    goals: [T('يعرف أن السين الصغيرة فوق الصاد تعني قراءتها سينًا.', 'Knows a small seen above a saad means reading it as seen.'), T('يعرف أن السين تحت الصاد تعني أن الصاد أشهر.', 'Knows a seen below the saad means saad is more common.'), T('يفرّق بينها وبين السكتة «س».', 'Tells it apart from the saktah «س».')],
    slides: [
      { icon: '🎩', k: T('الحكاية', 'The story'), t: T('حرف يلبس قبعة', 'A letter wearing a hat'),
        b: [{ row: [{ kid: T('في كلمات قليلة تُكتب «ص» وفوقها سين صغيرة كأنها قبعة. القبعة تقول: «اقرأني سينًا!»\nوإذا كانت السين الصغيرة تحت الصاد، فقراءتها صادًا أشهر.', 'In a few words a «ص» is written with a small seen above it, like a hat. The hat says: “Read me as seen!”\nIf the small seen is below the saad, reading it as saad is more common.') }, { art: 'costume' }] },
          { signs: [{ id: 'sin_over', kid: T('سين فوق الصاد: اقرأها سينًا.', 'Seen above the saad: read it as seen.') }, { id: 'sin_under', kid: T('سين تحت الصاد: الصاد أشهر.', 'Seen below the saad: saad is more common.') }] }],
        tip: T('ضع قبعة ورقية صغيرة على بطاقة «ص» وقل: «لبست القبعة، فصارت سينًا!»', 'Put a little paper hat on a «ص» card and say: “It wore the hat, so it became a seen!”') },
      { icon: '📖', k: T('في القرآن', 'In the Qur’an'), t: T('شاهدها في الآيات', 'See it in the verses'), b: [{ signAyahs: ['sin_over', 'sin_under'], n: 1 }, { kid: T('انتبه: «س» التي تأتي وحدها بين كلمتين هي السكتة، أما هذه فداخل الكلمة فوق الصاد.', 'Careful: a «س» standing alone between two words is the saktah; this one is inside the word, on the saad.') },
        { check: { q: T('صاد فوقها سين صغيرة نقرؤها:', 'A saad with a small seen above is read as:'), opts: [{ t: T('سينًا', 'Seen'), ok: true, fb: T('أحسنت!', 'Well done!') }, { t: T('صادًا', 'Saad'), fb: T('القبعة تقول: اقرأني سينًا.', 'The hat says: read me as seen.') }] } }],
        tip: T('هذه الكلمات خارج جزء عمّ؛ يكفي أن يعرفها الطفل عند رؤيتها.', 'These words are outside Juz ʿAmma; it is enough for the child to recognize them.') },
      { icon: '🔎', k: T('استكشف', 'Explore'), t: T('جد القبعة', 'Find the hat'), b: [{ explore: 'mushaf_sin_saad' }], tip: T('اطلب من الطفل أن يشير إلى السين الصغيرة ويقرأ الكلمة.', 'Ask the child to point at the small seen and read the word.') }
    ],
    recap: [T('سين فوق الصاد: نقرؤها سينًا.', 'Seen above the saad: read as seen.'), T('سين تحت الصاد: الصاد أشهر.', 'Seen below the saad: saad is more common.'), T('«س» وحدها بين كلمتين هي السكتة.', '«س» alone between two words is the saktah.')]
  },

  mushaf_sajda: {
    title: T('مكان السجود 🕌', 'The Place of Prostration 🕌'), mins: 6, cover: { art: 'sajda_map' },
    hook: T('كيف تعرف أن هذه الآية فيها سجدة؟', 'How do you know a verse has a sajdah?'),
    goals: [T('يعرف أن في المصحف خمس عشرة سجدة.', 'Knows the mushaf has fifteen sajdahs.'), T('يعرف العلامات الثلاث: «سجدة» على الهامش، ۩ في السطر، وخط فوق الكلمة.', 'Knows the three signs: «سجدة» in the margin, ۩ in the line, a line over the word.'), T('يعرف أن القارئ يسجد سجدة واحدة عندها.', 'Knows the reader makes one prostration there.')],
    slides: [
      { icon: '🕌', k: T('العلامات الثلاث', 'Three signs'), t: T('ثلاث علامات تدلّك', 'Three signs point the way'),
        b: [{ row: [{ kid: T('في المصحف خمس عشرة سجدة. وعندها ترى ثلاث علامات معًا:\n١) كلمة «سجدة» في إطار على الهامش.\n٢) رمز يشبه قبّة المسجد ۩ داخل السطر.\n٣) خط فوق الكلمة التي نسجد عندها.\nفإذا قرأتها سجد القارئ سجدة واحدة اسمها «سجود التلاوة».', 'The mushaf has fifteen sajdahs. At each one you see three signs together:\n1) The word «سجدة» in a frame in the margin.\n2) A symbol like a mosque dome ۩ inside the line.\n3) A line over the word where we prostrate.\nWhen you read it, the reader makes one prostration called “the prostration of recitation”.') }, { art: 'sajda_map' }] },
          { row: [{ media: { kind: 'frame', text: 'سجدة' }, cap: T('«سجدة» على الهامش', '«سجدة» in the margin') }, { img: 'mushaf/sajda-mark.webp', cap: T('قبّة السجدة في السطر', 'The sajdah dome in the line'), credit: 'mushaf' }, { img: 'mushaf/sajda-overline.webp', cap: T('خط فوق كلمة السجود', 'A line over the sajdah word'), credit: 'mushaf' }] }],
        tip: T('اذكر للأطفال أن في جزء عمّ سجدتين: في سورة الانشقاق وسورة العلق.', 'Tell the children Juz ʿAmma has two sajdahs: in Surah Al-Inshiqaq and Surah Al-ʿAlaq.') },
      { icon: '📖', k: T('في القرآن', 'In the Qur’an'), t: T('سجدتا جزء عمّ', 'The two sajdahs of Juz ʿAmma'), b: [{ signAyahs: ['sajda_sign'], n: 2 },
        { check: { q: T('كم سجدة في المصحف؟', 'How many sajdahs are in the mushaf?'), opts: [{ t: T('خمس عشرة', 'Fifteen'), ok: true, fb: T('صحيح!', 'Correct!') }, { t: T('ثلاثون', 'Thirty'), fb: T('ثلاثون هو عدد الأجزاء.', 'Thirty is the number of juz.') }, { t: T('سجدتان', 'Two'), fb: T('سجدتان في جزء عمّ فقط.', 'Two in Juz ʿAmma only.') }] } }],
        tip: T('اقرأ آية السجدة في سورة العلق، وعلّم الأطفال سجود التلاوة عمليًا.', 'Read the sajdah verse of Surah Al-ʿAlaq and show the children the prostration of recitation.') },
      { icon: '🔎', k: T('استكشف', 'Explore'), t: T('جد علامات السجدة', 'Find the sajdah signs'), b: [{ explore: 'mushaf_sajda' }], tip: T('اطلب من الطفل أن يشير إلى العلامات الثلاث في الصفحة نفسها.', 'Ask the child to point to all three signs on the same page.') }
    ],
    recap: [T('في المصحف خمس عشرة سجدة.', 'The mushaf has fifteen sajdahs.'), T('ثلاث علامات: «سجدة» على الهامش، ۩ في السطر، خط فوق الكلمة.', 'Three signs: «سجدة» in the margin, ۩ in the line, a line over the word.'), T('في جزء عمّ سجدتان: الانشقاق والعلق.', 'Juz ʿAmma has two: Al-Inshiqaq and Al-ʿAlaq.')]
  }
};

// ═════════════════════════ أحكام التجويد ═════════════════════════
// إضافات كل حكم فوق محتواه في data/rules.js: الحكاية والرسم وصور «التجويد المصوّر» وأسئلة الحروف وأفكار المعلم.
// lettersQuiz: حرفان من الحكم + حرفان من غيره (يُبنى منه سؤال «اختر حروف الحكم»).
const RULE_EXTRAS = {
  ghunna: { title: T('النحلة في الأنف 🐝', 'The Bee in the Nose 🐝'), art: 'bee_nose', mins: 8,
    hook: T('ما هذا الصوت الجميل الذي يخرج من الأنف؟', 'What is that lovely sound coming from the nose?'),
    story: T('النون والميم إذا كان عليهما شدّة صارتا نحلتين صغيرتين: تطنّان في أنفك «نننن… ممممم» قليلًا قبل أن تكمل.\nكم تطنّ؟ بمقدار حركتين: عدّ على إصبعين ✌️.', 'When noon and meem carry a shadda they become two little bees: they hum in your nose, “nnnn… mmmm”, for a moment before you go on.\nFor how long? Two counts: count on two fingers ✌️.'),
    book: ['p123_1', 'p123_0'], lettersQuiz: { yes: ['ن', 'م'], no: ['ق', 'ل'] },
    tips: { intro: T('اطلب من الأطفال أن يمسكوا أنوفهم وهم يقولون «إنّ»: سيشعرون باهتزاز الغنّة!', 'Have the children hold their noses while saying “inna”: they will feel the hum vibrate!'), ayahs: T('شغّل الآية وليرفع الأطفال إصبعين عند سماع الغنّة.', 'Play the verse; children raise two fingers when they hear the ghunna.') } },
  qalqalah: { title: T('الحروف النطّاطة 🏀', 'The Bouncing Letters 🏀'), art: 'ball', mins: 12,
    hook: T('حروف لا تستطيع أن تسكت… فتقفز!', 'Letters that cannot keep still… so they bounce!'),
    story: T('القلقلة يعني الاهتزاز والحركة.\nخمسة حروف «قطب جد» إذا وضعنا عليها سكونًا لا تبقى هادئة… بل تقفز قفزة صغيرة مثل الكرة حين تضرب الأرض.', 'Qalqalah means shaking and moving.\nWhen the five letters “qutb jad” carry a sukun they cannot stay still… they make a small bounce, like a ball hitting the floor.'),
    book: ['p185_0'], makhraj: { 'ق': 'p101_0', 'ط': 'p116_1', 'ب': 'p121_0', 'ج': 'p103_0', 'د': 'p116_0' },
    lettersQuiz: { yes: ['ق', 'د'], no: ['م', 'س'] },
    deck: [{ f: '02-meaning', cap: T('ماذا تعني كلمة قلقلة؟', 'What does “qalqalah” mean?') }, { f: '03-letters', cap: T('أبطال القلقلة الخمسة: قطب جد', 'The five qalqalah letters: Qutb Jad') }, { f: '04-why', cap: T('لماذا تقفز هذه الحروف؟', 'Why do these letters bounce?') }],
    levels: [{ f: '06-minor', t: T('القلقلة الصغرى', 'Minor qalqalah'), d: T('الحرف الساكن في وسط الكلمة: قفزة خفيفة.', 'A still letter mid-word: a light bounce.') }, { f: '07-major', t: T('القلقلة الكبرى', 'Major qalqalah'), d: T('نقف على الحرف في آخر الكلمة: قفزة أعلى.', 'Stopping on the letter at a word’s end: a higher bounce.') }, { f: '08-shaddah', t: T('الكبرى المشدّدة', 'Doubled major'), d: T('نقف على حرف مشدّد: أعلى قفزة.', 'Stopping on a doubled letter: the highest bounce.') }],
    why: T('لأن الصوت ينحبس عندها تمامًا (لا يجري نفَس ولا صوت)، ثم ينفتح فجأة… فتسمع صوت القفزة! وللمعلم: تجمع حروف القلقلة صفتَي الشدّة والجهر.', 'Because the sound is completely blocked at them (no breath, no sound), then opens suddenly… and you hear the bounce! For the teacher: the qalqalah letters combine the qualities of shiddah and jahr.'),
    tips: { intro: T('ارمِ كرة صغيرة على الأرض وقل مع ارتدادها: «أَبْ!» ثم اطلب من الأطفال تقليدها.', 'Bounce a small ball and say “ab!” as it bounces; then the children copy it.'), letters: T('وزّع بطاقات الحروف الخمسة؛ كل طفل «بطل حرف» يقفز حين تنطق حرفه ساكنًا.', 'Hand out the five letter cards; each child is a letter “hero” who jumps when you say it with a sukun.'), ayahs: T('شغّل الآية مرتين: للاستماع، ثم يردّد الأطفال ويرفعون أيديهم لحظة القفزة.', 'Play the verse twice: to listen, then children repeat and raise their hands at the bounce.') } },
  meem_ikhfa: { title: T('الميم خلف الستارة 🎭', 'The Meem Behind the Curtain 🎭'), art: 'meem_curtain', mins: 7,
    hook: T('ماذا تفعل الميم الساكنة إذا جاءت بعدها باء؟', 'What does a silent meem do when a baa comes after it?'),
    story: T('الميم والباء جارتان تخرجان من الشفتين. فإذا جاءت ميم ساكنة وبعدها باء، اختبأت الميم قليلًا خلف ستارة: نُطبق الشفتين برفق مع غنّة من الأنف، ثم نقول الباء.', 'Meem and baa are neighbours that both come from the lips. When a silent meem meets a baa, the meem hides a little behind a curtain: we close the lips gently with a hum from the nose, then say the baa.'),
    book: ['p122_0', 'p121_0'], lettersQuiz: { yes: ['ب'], no: ['م', 'ت', 'ف'] },
    tips: { intro: T('اطلب من الأطفال أن يضعوا إصبعًا على الشفتين: لا ضغط قوي، لمسة خفيفة مع غنّة.', 'Have the children put a finger on their lips: no hard press, a light touch with a hum.') } },
  meem_idgham: { title: T('ميمان تتعانقان 🤗', 'Two Meems Hug 🤗'), art: 'meem_hug', mins: 6,
    hook: T('ماذا يحدث إذا التقت ميمان؟', 'What happens when two meems meet?'),
    story: T('إذا جاءت ميم ساكنة وبعدها ميم أخرى، تعانقتا وصارتا ميمًا واحدة مشدّدة، ومعها غنّة جميلة من الأنف بمقدار حركتين. ولهذا يسمّيه العلماء «المثلين الصغير».', 'When a silent meem is followed by another meem, they hug and become one doubled meem, with a lovely hum from the nose for two counts. Scholars call this “the small mithlayn”.'),
    lettersQuiz: { yes: ['م'], no: ['ب', 'ن', 'ر'] },
    tips: { intro: T('اطلب من طفلين أن يتعانقا كأنهما ميمان، وقل: «صارتا ميمًا واحدة قوية».', 'Ask two children to hug like two meems and say: “Now they are one strong meem.”') } },
  meem_izhar: { title: T('الميم الواضحة ☀️', 'The Clear Meem ☀️'), art: 'meem_clear', mins: 6,
    hook: T('متى تبقى الميم الساكنة واضحة تمامًا؟', 'When does a silent meem stay perfectly clear?'),
    story: T('الميم الساكنة تبقى واضحة صافية مع كل الحروف، إلا مع صديقتيها الباء والميم.\nانتبه خصوصًا إذا جاءت بعدها الواو أو الفاء: لا تُخفِها!', 'A silent meem stays crisp and clear before every letter except its two friends, baa and meem.\nTake special care before waw and faa: do not hide it!'),
    lettersQuiz: { yes: ['ت', 'ف'], no: ['ب', 'م'], q: T('اختر الحروف التي تبقى الميم الساكنة قبلها واضحة:', 'Pick the letters before which a silent meem stays clear:') },
    tips: { intro: T('اقرأ مثالًا من الآيات المعروضة بفصل واضح بين الميم وما بعدها، ثم اطلب من الأطفال تقليدك.', 'Read an example from the verses shown with a clear break after the meem, then let the children copy you.') } },
  noon_izhar: { title: T('النون تحت المصباح 💡', 'The Noon Under the Lamp 💡'), art: 'noon_lamp', mins: 8,
    hook: T('لماذا تبقى النون واضحة قبل بعض الحروف؟', 'Why does the noon stay clear before some letters?'),
    story: T('حروف الحلق الستة (ء هـ ع ح غ خ) تسكن بعيدًا في آخر الحلق، والنون تسكن في مقدّمة الفم.\nلأنهما بعيدتان، تقول النون اسمها كاملًا واضحًا تحت المصباح، ثم يأتي حرف الحلق.', 'The six throat letters (ء هـ ع ح غ خ) live far back in the throat, while the noon lives at the front of the mouth.\nBecause they are far apart, the noon says its name fully and clearly, under the lamp, then the throat letter comes.'),
    book: ['p098_0', 'p099_0', 'p099_1', 'p100_0', 'p100_1', 'p112_0'], lettersQuiz: { yes: ['ع', 'خ'], no: ['ب', 'ت'] },
    tips: { intro: T('ضع يدك على حلقك وقل «ء هـ ع ح غ خ»: كلها من الحلق!', 'Put your hand on your throat and say “ء هـ ع ح غ خ”: all from the throat!') } },
  noon_idgham_ghunna: { title: T('النون تذوب 💧', 'The Noon Melts 💧'), art: 'noon_melt', mins: 8,
    hook: T('أين تذهب النون إذا جاء بعدها حرف من «ينمو»؟', 'Where does the noon go before a letter of “yanmū”?'),
    story: T('إذا جاءت نون ساكنة أو تنوين في آخر كلمة، وبعدها في الكلمة التالية حرف من «ينمو» (ي ن م و)، ذابت النون في هذا الحرف كقطرة ماء في كوب، لكن صوت الغنّة الجميل يبقى بمقدار حركتين.', 'When a silent noon or tanween ends a word and the next word begins with a letter of “yanmū” (ي ن م و), the noon melts into that letter like a drop in a cup — but its lovely hum stays, for two counts.'),
    lettersQuiz: { yes: ['ي', 'و'], no: ['ل', 'ب'] },
    teacher: T('للمعلم: الإدغام يكون بين كلمتين فقط؛ فإن اجتمعت النون وحرف «ينمو» في كلمة واحدة فالحكم إظهار مطلق (أربع كلمات في القرآن).', 'For the teacher: idgham happens only across two words; if the noon and a “yanmū” letter meet inside one word the rule is absolute izhar (four words in the Qur’an).'),
    tips: { intro: T('ضع قطرة ماء ملوّنة في كوب أمام الأطفال: «اختفت القطرة، لكن لونها بقي… مثل الغنّة!»', 'Drop coloured water into a cup: “The drop is gone, but its colour stays… like the ghunna!”') } },
  noon_idgham_no_ghunna: { title: T('النون تختفي تمامًا 🫥', 'The Noon Vanishes 🫥'), art: 'noon_vanish', mins: 6,
    hook: T('ماذا يحدث للنون قبل اللام والراء؟', 'What happens to the noon before lam and raa?'),
    story: T('إذا جاءت بعد النون الساكنة أو التنوين لامٌ أو راء في الكلمة التالية، اختفت النون تمامًا كأنها لم تكن: لا نون ولا غنّة، وصار اللام أو الراء مشدّدًا.', 'When a lam or raa begins the next word after a silent noon or tanween, the noon vanishes completely, as if it was never there: no noon, no hum — and the lam or raa becomes doubled.'),
    lettersQuiz: { yes: ['ل', 'ر'], no: ['ي', 'م'] },
    tips: { intro: T('اقرأ مثالًا للإدغام بغنّة ثم مثالًا بلا غنّة من الآيات المعروضة، ليسمع الأطفال الفرق.', 'Read an idgham-with-ghunna example and then one without, from the verses shown, so the children hear the difference.') } },
  noon_iqlab: { title: T('قبعة الساحر 🎩', 'The Magician’s Hat 🎩'), art: 'noon_hat', mins: 6,
    hook: T('كيف تتحوّل النون إلى ميم؟', 'How does a noon turn into a meem?'),
    story: T('إذا جاءت باء بعد النون الساكنة أو التنوين، لبست النون قبعة الساحر فصارت ميمًا! نقولها ميمًا مخفاة بغنّة، ثم نقول الباء.\nوفي المصحف ترى ميمًا صغيرة فوق النون تذكّرك بذلك.', 'When a baa comes after a silent noon or tanween, the noon puts on a magician’s hat and becomes a meem! We say it as a hidden meem with a hum, then say the baa.\nIn the mushaf you see a small meem above the noon to remind you.'),
    book: ['p121_0', 'p122_0'], signs: ['small_meem'], lettersQuiz: { yes: ['ب'], no: ['م', 'ن', 'ت'] },
    tips: { intro: T('أحضر قبعة ورقية وضعها على بطاقة «ن» فتظهر تحتها «م».', 'Bring a paper hat; put it on a «ن» card to reveal a «م» underneath.') } },
  noon_ikhfa: { title: T('النون خلف الستارة 🎭', 'The Noon Behind the Curtain 🎭'), art: 'noon_curtain', mins: 9,
    hook: T('النون هنا لا تظهر ولا تختفي… فماذا تفعل؟', 'Here the noon neither shows nor vanishes… so what does it do?'),
    story: T('مع خمسة عشر حرفًا تختبئ النون خلف ستارة رقيقة: لا تظهر واضحة، ولا تذوب تمامًا. اللسان لا يلمس مكان النون، بل يستعدّ للحرف التالي، والغنّة تخرج من الأنف بمقدار حركتين.', 'Before fifteen letters the noon hides behind a thin curtain: it is not clear, and it does not melt away. The tongue does not touch the noon’s spot; it gets ready for the next letter, while the hum comes from the nose for two counts.'),
    book: ['p301_0', 'p302_0', 'p302_1'], lettersQuiz: { yes: ['ت', 'ك'], no: ['ع', 'ل'] },
    tips: { intro: T('علّق قطعة قماش رقيقة وضع خلفها بطاقة «ن»: تُرى ظلًّا لا واضحة ولا غائبة.', 'Hang a thin cloth with a «ن» card behind it: you see a shadow, neither clear nor gone.') } },
  lam_qamari: { title: T('لام القمر 🌙', 'The Moon Lam 🌙'), art: 'moon', mins: 6,
    hook: T('لماذا نسمع اللام في «القمر» ولا نسمعها في «الشمس»؟', 'Why do we hear the lam in “al-qamar” but not in “ash-shams”?'),
    story: T('في «ال» التعريف لام. فإذا جاء بعدها حرف من حروف «ابغِ حجّك وخف عقيمه» بقيت اللام ظاهرة ساكنة، مثل القمر نراه في السماء: «القمر».', 'The “al-” prefix has a lam. If the next letter is one of “ibghi hajjaka wa khaf ʿaqīmah”, the lam stays clear and still, like the moon we can see in the sky: “al-qamar”.'),
    lettersQuiz: { yes: ['ق', 'ب'], no: ['ش', 'ر'] },
    tips: { intro: T('اكتب «القمر» و«الشمس» على السبورة، واطلب من الأطفال أن يقرؤوهما ويلاحظوا اللام.', 'Write “al-qamar” and “ash-shams” on the board; children read them and notice the lam.') } },
  lam_shamsi: { title: T('لام الشمس ☀️', 'The Sun Lam ☀️'), art: 'sun', mins: 6,
    hook: T('أين اختفت اللام في «الشمس»؟', 'Where did the lam go in “ash-shams”?'),
    story: T('إذا جاء بعد «ال» حرف شمسي، اختفت اللام كما تُخفي الشمس النجوم بنورها، وصار الحرف الذي بعدها مشدّدًا: «الشّمس» لا «الْشمس».', 'If a sun letter follows “al-”, the lam disappears, the way the sun hides the stars with its light, and the next letter becomes doubled: “ash-shams”, not “al-shams”.'),
    lettersQuiz: { yes: ['ش', 'ر'], no: ['ق', 'ب'] },
    tips: { intro: T('اطفئ ضوءًا صغيرًا ثم أشعل ضوءًا كبيرًا: «اختفى الصغير أمام الكبير، مثل اللام أمام الحرف الشمسي».', 'Switch off a small light and turn on a big one: “The small one disappeared next to the big one — like the lam before a sun letter.”') } },
  madd_tabii: { title: T('الحرف المطاطي ✌️', 'The Stretchy Letter ✌️'), art: 'madd2', mins: 7,
    hook: T('كيف نمدّ الصوت بالمقدار الصحيح؟', 'How do we stretch a sound by the right amount?'),
    story: T('حروف المدّ ثلاثة: ألف قبلها فتحة، وواو ساكنة قبلها ضمّة، وياء ساكنة قبلها كسرة.\nإذا لم يأتِ بعدها همزة ولا سكون، نمدّها حركتين فقط: عدّ على إصبعين ✌️، لا أقل ولا أكثر.', 'The madd letters are three: alif after a fatha, a silent waw after a damma, and a silent yaa after a kasra.\nIf no hamza or sukun comes after them, we stretch them two counts only: count on two fingers ✌️, no less, no more.'),
    book: ['p089_0', 'p090_0', 'p091_0', 'p094_0'],
    tips: { intro: T('علّم الأطفال «الحركة» بقبض الإصبع وبسطه، ثم امدد حرف المد في مثال من الآيات على إصبعين.', 'Teach one count as folding and opening a finger, then stretch the madd letter of a verse example over two fingers.') } },
  madd_muttasil: { title: T('المدّ المتّصل 🔗', 'The Connected Madd 🔗'), art: 'madd_one_word', mins: 6,
    hook: T('ماذا يحدث إذا جاءت الهمزة بعد حرف المد في الكلمة نفسها؟', 'What happens when a hamza follows a madd letter in the same word?'),
    story: T('إذا جاءت الهمزة بعد حرف المدّ في الكلمة نفسها، كأن الصوت يركض نحو الهمزة فيحتاج مسافة أطول: نمدّه أربع حركات أو خمسًا. وهذا المدّ واجب لا يُترك.', 'When a hamza follows a madd letter in the same word, it is as if the sound runs towards the hamza and needs a longer track: we stretch it four or five counts. This madd is required.'),
    tips: { intro: T('ارسم كلمة واحدة في صندوق، وضع حرف المد والهمزة داخله: «متّصلان في بيت واحد».', 'Draw one word in a box with the madd letter and hamza inside: “connected, in one house.”') } },
  madd_munfasil: { title: T('المدّ المنفصل 🌉', 'The Separated Madd 🌉'), art: 'madd_two_words', mins: 6,
    hook: T('وإذا كانت الهمزة في الكلمة التالية؟', 'And if the hamza is in the next word?'),
    story: T('إذا انتهت الكلمة بحرف مدّ، وبدأت الكلمة التالية بهمزة، كأن بينهما جسرًا: نمدّ أربع حركات أو خمسًا. واسمه «منفصل» لأن المدّ في كلمة والهمزة في أخرى.', 'When a word ends with a madd letter and the next word begins with a hamza, it is as if there were a bridge between them: we stretch four or five counts. It is called “separated” because the madd is in one word and the hamza in another.'),
    tips: { intro: T('ارسم كلمتين في صندوقين وبينهما جسر، وامدد صوتك وأنت تعبر الجسر.', 'Draw two words in two boxes with a bridge between them, and stretch your voice as you cross.') } },
  mithlain: { title: T('التوأمان 👯', 'The Twins 👯'), art: 'twins', mins: 6,
    hook: T('ماذا يحدث إذا التقى حرفان متشابهان تمامًا؟', 'What happens when two identical letters meet?'),
    story: T('حرفان توأمان متشابهان تمامًا: الأول ساكن في آخر كلمة، والثاني متحرّك في أول الكلمة التالية.\nلا نقرأ الأول وحده، بل يدخل في أخيه فنقرؤهما حرفًا واحدًا مشدّدًا.', 'Two twin letters, exactly alike: the first is silent at the end of a word, the second is voweled at the start of the next.\nWe do not read the first alone; it slips into its twin, and we read them as one doubled letter.'),
    tips: { intro: T('اطلب من طفلين متشابهين في الطول أن يقفا متلاصقين ثم يصيرا «شخصًا واحدًا» بخطوة واحدة.', 'Ask two children of similar height to stand together, then step forward as “one person”.') } },
  mutajanisain: { title: T('من بيت واحد 🏠', 'From One House 🏠'), art: 'same_house', mins: 7,
    hook: T('حرفان مختلفان… لكنهما يخرجان من المكان نفسه!', 'Two different letters… from the very same spot!'),
    story: T('الدال والتاء يخرجان من مكان واحد في الفم (طرف اللسان مع أصول الأسنان العليا)، لكن لكل منهما صوتًا مختلفًا. فإذا سكنت الدال وجاءت بعدها التاء، دخلت الدال في التاء فقرأناهما تاءً واحدة مشدّدة.', 'Dal and taa come from the same spot in the mouth (the tip of the tongue at the roots of the upper teeth), but each sounds different. When a silent dal is followed by taa, the dal goes into the taa and we read one doubled taa.'),
    book: ['p116_0'],
    tips: { intro: T('اطلب من الأطفال أن ينطقوا «د» ثم «ت» ويلاحظوا أن اللسان في المكان نفسه.', 'Have the children say «د» then «ت» and notice the tongue is in the same place.') } },
  mutaqaribain: { title: T('الجاران 🏘️', 'The Neighbours 🏘️'), art: 'neighbours', mins: 6,
    hook: T('لماذا لا نسمع اللام في بعض الكلمات قبل الراء؟', 'Why don’t we hear the lam before raa in some words?'),
    story: T('اللام والراء جاران يسكنان في بيتين متجاورين في اللسان. فإذا سكنت اللام في آخر كلمة وجاءت بعدها راء، ذهبت اللام إلى جارتها، فنقرأ الراء مشدّدة ولا نسمع اللام.', 'Lam and raa are neighbours living in houses side by side on the tongue. When a silent lam ends a word and a raa follows, the lam goes over to its neighbour: we read the raa doubled and do not hear the lam.'),
    book: ['p109_1', 'p113_0'],
    tips: { intro: T('ضع بطاقتي «ل» و«ر» متجاورتين، ثم حرّك بطاقة اللام خلف الراء: «اختفت عند جارتها».', 'Put «ل» and «ر» cards side by side, then slide the lam behind the raa: “it went to its neighbour”.') } },
  ra_tafkhim: { title: T('الراء السمينة 🎈', 'The Chubby Raa 🎈'), art: 'ra_heavy', mins: 6,
    hook: T('لماذا نسمع الراء أحيانًا ممتلئة كبيرة؟', 'Why does the raa sometimes sound big and full?'),
    story: T('الراء مثل البالون: إذا كانت عليها فتحة أو ضمّة انتفخت فصارت سمينة، فنملأ الفم بصوتها.\nارفع مؤخرة لسانك قليلًا وقل: «رَ… رُ».', 'The raa is like a balloon: with a fatha or damma it puffs up and becomes chubby, so we fill the mouth with its sound.\nLift the back of your tongue a little and say: “ra… ru”.'),
    book: ['p113_0'], lettersQuiz: { yes: ['رَ', 'رُ'], no: ['رِ'], q: T('اختر الراء السمينة (المفخّمة):', 'Pick the chubby (heavy) raa:') },
    tips: { intro: T('انفخ بالونًا أمام الأطفال وقل «رَ» بصوت ممتلئ، ثم أفرغه وقل «رِ» بصوت رقيق.', 'Blow up a balloon and say a full “ra”, then let it out and say a thin “ri”.') } },
  ra_tarqiq: { title: T('الراء النحيفة 🪶', 'The Thin Raa 🪶'), art: 'ra_light', mins: 5,
    hook: T('ومتى تكون الراء خفيفة رقيقة؟', 'And when is the raa thin and light?'),
    story: T('إذا كانت تحت الراء كسرة صارت نحيفة رقيقة مثل الريشة. ابتسم قليلًا وقل: «رِ».', 'With a kasra under it, the raa becomes thin and light like a feather. Smile a little and say: “ri”.'),
    book: ['p113_0'], lettersQuiz: { yes: ['رِ'], no: ['رَ', 'رُ'], q: T('اختر الراء النحيفة (المرقّقة):', 'Pick the thin (light) raa:') },
    tips: { intro: T('مرّر ريشة أمام الأطفال وهم يقولون «رِ» برقّة.', 'Pass a feather in front of the children as they say a gentle “ri”.') } },
  lam_jalala_tafkhim: { title: T('اللام العظيمة 👑', 'The Majestic Lam 👑'), art: 'lam_heavy', mins: 5,
    hook: T('كيف ننطق اسم «الله» بعد الفتح والضم؟', 'How do we say the name “Allah” after fatha and damma?'),
    story: T('اسم «الله» أعظم اسم. إذا جاء قبله فتح أو ضمّ نطقنا لامه ممتلئة عظيمة يملأ صوتها الفم.', 'The name “Allah” is the greatest name. After a fatha or damma we say its lam full and majestic, filling the mouth.'),
    lettersQuiz: { yes: ['ـَ', 'ـُ'], no: ['ـِ'], q: T('بعد أيّ حركة تُفخَّم لام «الله»؟', 'After which vowel is the lam of “Allah” heavy?') },
    tips: { intro: T('قارن بين مثالين معروضين: بعد الفتح «لام ممتلئة»، وبعد الكسر في البسملة «لام رقيقة».', 'Compare two shown examples: after a fatha the lam is full; after the kasra in the basmala it is light.') } },
  lam_jalala_tarqiq: { title: T('اللام الرقيقة 🌸', 'The Gentle Lam 🌸'), art: 'lam_light', mins: 5,
    hook: T('لماذا نقول لام «الله» رقيقة في البسملة؟', 'Why is the lam of “Allah” light in the basmala?'),
    story: T('إذا جاء قبل اسم «الله» كسرة، مثل «بِسْمِ» في البسملة، نطقنا لامه رقيقة خفيفة.', 'When a kasra comes before the name “Allah”, like “bismi” in the basmala, we say its lam light and gentle.'),
    lettersQuiz: { yes: ['ـِ'], no: ['ـَ', 'ـُ'], q: T('بعد أيّ حركة تُرقَّق لام «الله»؟', 'After which vowel is the lam of “Allah” light?') },
    tips: { intro: T('ابدأ بالبسملة: يعرفها كل الأطفال، ونبّههم إلى أن لامها رقيقة.', 'Start with the basmala, which every child knows, and point out its light lam.') } },
  madd_aridh: { title: T('قف… وامدد 🛑', 'Stop… and Stretch 🛑'), art: 'aridh', mins: 7,
    hook: T('لماذا نمدّ في آخر الآية أكثر من وسطها؟', 'Why do we stretch more at the end of an ayah?'),
    story: T('في آخر الآية نقف، فيصير الحرف الأخير ساكنًا. وإذا كان قبله حرف مد، صار المد «عارضًا للسكون»: نمدّه ٢ أو ٤ أو ٦ حركات.\nالمهم: نختار مقدارًا واحدًا ونلتزمه في كل الآيات.', 'At the end of an ayah we stop, so the last letter becomes silent. If a madd letter comes before it, the madd is “ʿarid”: we stretch it 2, 4 or 6 counts.\nThe key: choose one length and keep it for every ayah.'),
    tips: { intro: T('اقرأ الفاتحة مع الأطفال واتفقوا على مقدار واحد (٤ حركات مثلًا) في كل آخر آية.', 'Recite Al-Fatiha with the children and agree on one length (4 counts, say) at every ayah end.') } },
  madd_leen: { title: T('الصوت الليّن 🪶', 'The Soft Sound 🪶'), art: 'leen', mins: 5,
    hook: T('واو وياء ساكنتان بعد فتحة… ماذا نفعل عند الوقف؟', 'A silent waw or yaa after a fatha… what do we do when stopping?'),
    story: T('الواو والياء الساكنتان بعد فتحة صوتهما ناعم ليّن. فإذا وقفنا على الحرف الذي بعدهما مددناهما مدًّا لطيفًا (٢ أو ٤ أو ٦)، وفي الوصل لا نمدّهما.', 'A silent waw or yaa after a fatha has a soft, gentle sound. When we stop on the letter after them we stretch gently (2, 4 or 6); when joining we do not stretch.'),
    tips: { intro: T('اقرأ سورة قريش مع الأطفال ولاحظوا المدّ الليّن في أواخر آياتها.', 'Read Surah Quraysh with the children and notice the soft madd at its ayah ends.') } },
  madd_badal: { title: T('الهمزة تفتح الباب 🚪', 'The Hamza Opens the Door 🚪'), art: 'badal', mins: 5,
    hook: T('ماذا لو جاءت الهمزة قبل حرف المد؟', 'What if the hamza comes before the madd letter?'),
    story: T('هنا الهمزة تسبق حرف المد كأنها تفتح له الباب. نمدّه حركتين فقط مثل المد الطبيعي، ولا نطيله.', 'Here the hamza goes before the madd letter, as if opening the door for it. We stretch it two counts only, like the natural madd — no longer.'),
    tips: { intro: T('قارن بين المد المتصل (مد ثم همزة: طويل) والبدل (همزة ثم مد: قصير).', 'Compare muttasil (madd then hamza: long) with badal (hamza then madd: short).') } },
  madd_lazim: { title: T('أطول مد 📏', 'The Longest Madd 📏'), art: 'lazim6', mins: 6,
    hook: T('ما أطول مد في القرآن؟', 'What is the longest madd in the Qur’an?'),
    story: T('حرف مد عليه علامة المدّة، وبعده حرف مشدّد في الكلمة نفسها: هذا المد اللازم، أطول مد في القرآن! نمدّه ست حركات دائمًا: عدّ على ست أصابع.', 'A madd letter with the madd sign, followed by a doubled letter in the same word: madd lazim, the longest madd in the Qur’an! Always stretch it six counts — count on six fingers.'),
    tips: { intro: T('اختم الفاتحة مع الأطفال وعدّوا الحركات الست معًا في آخر كلمة منها.', 'Finish Al-Fatiha with the children and count the six counts together on its last word.') } }

};


// ═════════════════════════ دروس المعرفة (data/know.js) ═════════════════════════
const KNOW_STORIES = {
  mushaf_adab: {
    title: T('ضيوف على كلام الله 🤲', 'Guests of Allah’s Words 🤲'), mins: 6, cover: { art: 'adab' },
    hook: T('كيف نستعد لقراءة القرآن؟', 'How do we get ready to read the Qur’an?'),
    goals: [T('يستعيذ قبل القراءة.', 'Seeks refuge before reading.'), T('يعرف متى يقرأ البسملة.', 'Knows when to read the basmala.'), T('يجلس بأدب وينصت ويحفظ للمصحف مكانه.', 'Sits politely, listens, and keeps the mushaf in its place.')],
    slides: [
      { icon: '🧼', k: T('قبل أن نقرأ', 'Before we read'), t: T('نستعد لكلام الله', 'Getting ready for Allah’s words'),
        b: [{ kid: T('القرآن كلام الله، فنستعد له كما نستعد لضيف عزيز:\n• نتوضّأ ونجلس في مكان نظيف.\n• نجلس بأدب واحترام.\n• ثم نقول: «أعوذ بالله من الشيطان الرجيم».', 'The Qur’an is the word of Allah, so we prepare for it as for a dear guest:\n• We make wudu and sit in a clean place.\n• We sit politely and respectfully.\n• Then we say: “I seek refuge in Allah from the accursed Satan.”') },
          { check: { q: T('ماذا نقول قبل أن نبدأ القراءة؟', 'What do we say before we start reading?'), opts: [{ t: T('أعوذ بالله من الشيطان الرجيم', 'I seek refuge in Allah from the accursed Satan'), ok: true, fb: T('أحسنت! هذه الاستعاذة.', 'Well done! That is seeking refuge.') }, { t: T('السلام عليكم', 'Assalamu alaikum'), fb: T('نقولها للناس، أما قبل القراءة فنستعيذ.', 'We say it to people; before reading we seek refuge.') }] } }],
        tip: T('اجعل للحصة بداية ثابتة: وضوء، جلسة، استعاذة جماعية بصوت واحد.', 'Give the lesson a fixed opening: wudu, sitting, and seeking refuge together in one voice.') },
      { icon: '📖', k: T('البسملة', 'The basmala'), t: T('في أول كل سورة', 'At the start of every surah'),
        b: [{ row: [{ kid: T('في أول كل سورة نقول: «بسم الله الرحمن الرحيم»، إلا سورة التوبة فإنها تبدأ بلا بسملة.', 'At the start of every surah we say the basmala — except Surah At-Tawbah, which starts without it.') }, { img: 'mushaf/signs/part_basmala.webp', cap: T('البسملة في المصحف', 'The basmala in the mushaf'), credit: 'mushaf' }] }, { ayah: '1:1', hl: null }],
        tip: T('اسأل: «أي سورة بلا بسملة؟» حتى يحفظها الأطفال: التوبة.', 'Ask: “Which surah has no basmala?” until the children remember: At-Tawbah.') },
      { icon: '👂', k: T('نقرأ ونستمع', 'Reading and listening'), t: T('افعل ولا تفعل', 'Do and don’t'),
        b: [{ dodont: { no: [T('لا نقرأ بسرعة كبيرة.', 'Don’t read too fast.'), T('لا نتكلّم ونلعب إذا قُرئ القرآن.', 'Don’t chat or play while the Qur’an is recited.'), T('لا نضع المصحف على الأرض.', 'Don’t put the mushaf on the floor.')], yes: [T('نقرأ بتمهّل وترتيل.', 'Read slowly and clearly.'), T('ننصت ونستمع.', 'Listen quietly.'), T('نضع المصحف في مكان مرتفع نظيف.', 'Keep the mushaf in a clean, raised place.')] } },
          { check: { q: T('أين نضع المصحف بعد القراءة؟', 'Where do we put the mushaf after reading?'), opts: [{ t: T('في مكان مرتفع نظيف', 'In a clean, raised place'), ok: true, fb: T('أحسنت!', 'Well done!') }, { t: T('على الأرض', 'On the floor'), fb: T('نكرم المصحف فلا نضعه على الأرض.', 'We honour the mushaf, so not on the floor.') }] } }],
        tip: T('خصّص في الفصل رفًّا جميلًا للمصاحف يرتّبه الأطفال بأنفسهم.', 'Give the mushafs a nice shelf in class that the children arrange themselves.') }
    ],
    recap: [T('نتوضّأ ونجلس بأدب ونستعيذ قبل القراءة.', 'We make wudu, sit politely and seek refuge before reading.'), T('البسملة في أول كل سورة إلا التوبة.', 'The basmala starts every surah except At-Tawbah.'), T('نقرأ بتمهّل وننصت، ونكرم المصحف.', 'We read slowly, listen, and honour the mushaf.')]
  },
  mushaf_surahs: {
    title: T('رفّ السور 📚', 'The Surah Shelf 📚'), mins: 6, cover: { art: 'shelf' },
    hook: T('كم سورة في القرآن؟ ومن أولها وآخرها؟', 'How many surahs are there, and which come first and last?'),
    goals: [T('يعرف أن في القرآن ١١٤ سورة.', 'Knows the Qur’an has 114 surahs.'), T('يعرف أول سورة وآخرها وبداية جزء عمّ.', 'Knows the first and last surahs and where Juz ʿAmma starts.'), T('يرتّب سور جزء عمّ.', 'Orders the surahs of Juz ʿAmma.')],
    slides: [
      { icon: '📚', k: T('١١٤ سورة', '114 surahs'), t: T('رفّ مرتّب لا يتغيّر', 'A shelf that never changes order'),
        b: [{ row: [{ kid: T('تخيّل رفًّا عليه ١١٤ كتابًا مرقّمًا: هذه سور القرآن.\nأولها الفاتحة (١)، وآخرها الناس (١١٤)، وترتيبها في المصحف ثابت لا يتغيّر.', 'Imagine a shelf with 114 numbered books: these are the surahs of the Qur’an.\nThe first is Al-Fatiha (1), the last An-Nas (114), and their order in the mushaf never changes.') }, { art: 'shelf' }] },
          { check: { q: T('كم سورة في القرآن؟', 'How many surahs are in the Qur’an?'), opts: [{ t: T('١١٤', '114'), ok: true, fb: T('صحيح!', 'Correct!') }, { t: T('٣٠', '30'), fb: T('٣٠ عدد الأجزاء.', '30 is the number of juz.') }, { t: T('٦٠', '60'), fb: T('٦٠ عدد الأحزاب.', '60 is the number of hizb.') }] } }],
        tip: T('اكتب أرقام سور جزء عمّ على بطاقات ودع الأطفال يرتّبونها على الأرض كالقطار.', 'Write the Juz ʿAmma surah numbers on cards and let the children line them up like a train.') },
      { icon: '🏁', k: T('البداية والنهاية', 'Start and end'), t: T('جزء عمّ: آخر جزء', 'Juz ʿAmma: the last juz'),
        b: [{ row: [{ kid: T('جزء عمّ هو الجزء الثلاثون والأخير. يبدأ بسورة النبأ (٧٨) وينتهي بسورة الناس (١١٤)، وفيه ٣٧ سورة قصيرة نحفظها أولًا.', 'Juz ʿAmma is the thirtieth and last juz. It starts with An-Naba (78) and ends with An-Nas (114): 37 short surahs we memorize first.') }, { media: { kind: 'banner', surah: 78 }, cap: T('لوحة اسم سورة النبأ: أول جزء عمّ', 'The An-Naba title panel: the start of Juz ʿAmma') }] },
          { check: { q: T('أيّ السورتين قبل الأخرى في المصحف؟', 'Which of the two surahs comes first in the mushaf?'), opts: [{ t: T('الفيل (١٠٥)', 'Al-Fil (105)'), ok: true, fb: T('أحسنت! الفيل ١٠٥ ثم قريش ١٠٦.', 'Well done! Al-Fil is 105, then Quraysh 106.') }, { t: T('قريش (١٠٦)', 'Quraysh (106)'), fb: T('قريش بعد الفيل مباشرة.', 'Quraysh comes right after Al-Fil.') }] } }],
        tip: T('ردّدوا أسماء سور جزء عمّ من النبأ إلى الناس كنشيد.', 'Chant the names of the Juz ʿAmma surahs from An-Naba to An-Nas like a song.') },
      { icon: '📏', k: T('الأطول والأقصر', 'Longest and shortest'), t: T('البقرة والكوثر', 'Al-Baqarah and Al-Kawthar'),
        b: [{ kid: T('أطول سورة في القرآن البقرة (٢٨٦ آية)، وأقصرها الكوثر (ثلاث آيات قصيرة).', 'The longest surah is Al-Baqarah (286 ayahs); the shortest is Al-Kawthar (three short ayahs).') }, { ayah: '108:1', hl: null }],
        tip: T('اقرأ سورة الكوثر كاملة مع الأطفال ليشعروا أنهم أتمّوا سورة كاملة.', 'Read Al-Kawthar in full with the children so they feel they finished a whole surah.') }
    ],
    recap: [T('في القرآن ١١٤ سورة بترتيب ثابت.', 'The Qur’an has 114 surahs in a fixed order.'), T('أولها الفاتحة وآخرها الناس، وجزء عمّ من النبأ إلى الناس.', 'First Al-Fatiha, last An-Nas; Juz ʿAmma runs from An-Naba to An-Nas.'), T('أطولها البقرة وأقصرها الكوثر.', 'The longest is Al-Baqarah, the shortest Al-Kawthar.')]
  },
  mushaf_find: {
    title: T('المستكشف الصغير 🔍', 'The Little Explorer 🔍'), mins: 7, cover: { art: 'find_steps' },
    hook: T('كيف تجد أي آية في المصحف بنفسك؟', 'How can you find any ayah in the mushaf yourself?'),
    goals: [T('يعرف خطوات البحث: الجزء ثم السورة ثم الآية.', 'Knows the steps: juz, surah, then ayah.'), T('يقرأ رأس الصفحة ليعرف السورة.', 'Reads the page header to know the surah.'), T('يصل إلى الآية برقمها.', 'Reaches the ayah by its number.')],
    slides: [
      { icon: '🗺️', k: T('ثلاث خطوات', 'Three steps'), t: T('خريطة الكنز', 'The treasure map'),
        b: [{ row: [{ kid: T('للعثور على آية مثل البحث عن كنز:\n١) نعرف الجزء.\n٢) نجد السورة من اسمها في أعلى الصفحة.\n٣) نتبع أرقام الآيات حتى نصل إلى رقمها.', 'Finding an ayah is like a treasure hunt:\n1) Know the juz.\n2) Find the surah from its name at the top of the page.\n3) Follow the ayah numbers until you reach it.') }, { art: 'find_steps' }] }],
        tip: T('اكتب على السبورة «سورة الإخلاص، الآية ٤» ودع الأطفال يتسابقون إليها في مصاحفهم.', 'Write “Surah Al-Ikhlas, ayah 4” on the board and let the children race to find it.') },
      { icon: '🏷️', k: T('اسم السورة', 'The surah name'), t: T('انظر إلى أعلى الصفحة', 'Look at the top of the page'),
        b: [{ media: { kind: 'pagehead', juz: 30, surah: 112 }, cap: T('رأس صفحة: الجزء الثلاثون وسورة الإخلاص', 'A page header: juz 30 and Surah Al-Ikhlas') },
          { check: { q: T('أين تجد اسم السورة في الصفحة؟', 'Where is the surah name on the page?'), opts: [{ t: T('في أعلى الصفحة', 'At the top of the page'), ok: true, fb: T('أحسنت!', 'Well done!') }, { t: T('في أسفل الصفحة', 'At the bottom of the page'), fb: T('في الأسفل رقم الصفحة.', 'The bottom has the page number.') }] } }],
        tip: T('درّبهم على قراءة رأس الصفحة بصوت عالٍ في كل مرة يفتحون المصحف.', 'Train them to read the page header aloud every time they open the mushaf.') },
      { icon: '🔢', k: T('رقم الآية', 'The ayah number'), t: T('الرقم في آخر الآية', 'The number is at the end'),
        b: [{ custom: 'ayah_compare' }, { stepsT: [T('ابحث عن الرقم الذي تريده في نهايات الآيات.', 'Look for the number you want at the ends of the ayahs.'), T('الآية هي الكلام الذي قبل هذا الرقم.', 'The ayah is the words just before that number.'), T('ضع إصبعك على أول الآية وابدأ القراءة.', 'Put your finger at the start of the ayah and begin.')] },
          { check: { q: T('أيّ آية هي الآية الخامسة؟', 'Which is the fifth ayah?'), opts: [{ t: T('التي تنتهي بالرقم ٥', 'The one ending with 5'), ok: true, fb: T('صحيح!', 'Correct!') }, { t: T('التي تبدأ بعد الرقم ٥', 'The one starting after 5'), fb: T('تلك هي السادسة.', 'That is the sixth.') }] } }],
        tip: T('العب «أين الآية؟»: تقول رقمًا، فيضع الأطفال أصابعهم على أول آيته.', 'Play “Where’s the ayah?”: call a number and the children put a finger at its start.') }
    ],
    recap: [T('الجزء ← السورة ← رقم الآية.', 'Juz → surah → ayah number.'), T('اسم السورة في أعلى الصفحة، ورقم الصفحة في أسفلها.', 'The surah name is at the top; the page number at the bottom.'), T('الآية تنتهي برقمها.', 'An ayah ends with its number.')]
  },
  know_makharij: {
    title: T('خريطة الفم 👄', 'The Mouth Map 👄'), mins: 9, cover: { art: 'makharij' },
    hook: T('من أين يخرج كل حرف؟', 'Where does each letter come from?'),
    goals: [T('يعرف المخارج العامة الخمسة.', 'Knows the five general articulation areas.'), T('يعرف حروف الحلق وحروف الشفتين.', 'Knows the throat letters and the lip letters.'), T('يعرف أن الغنّة من الخيشوم.', 'Knows the ghunna comes from the nose.')],
    slides: [
      { icon: '👄', k: T('الحكاية', 'The story'), t: T('لكل حرف بيت', 'Every letter has a home'),
        b: [{ row: [{ kid: T('كل حرف له بيت يخرج منه، اسمه «المخرج». وفي فمنا خمسة أحياء كبيرة:\nالجوف، والحلق، واللسان، والشفتان، والخيشوم (الأنف).', 'Every letter has a home it comes out of, called its “makhraj”. Our mouth has five big neighbourhoods:\nthe jawf, the throat, the tongue, the lips and the nose.') }, { art: 'makharij' }] }],
        tip: T('ارسم رأسًا كبيرًا على السبورة ولوّن الأحياء الخمسة مع الأطفال.', 'Draw a big head on the board and colour the five neighbourhoods with the children.') },
      { icon: '🗺️', k: T('الأحياء الخمسة', 'The five neighbourhoods'), t: T('أين يسكن كل حرف؟', 'Where does each letter live?'), b: [{ areas: true }],
        tip: T('وزّع بطاقات الحروف واطلب من كل طفل أن يضعها في «حيّها» على الرسم.', 'Hand out letter cards; each child places theirs in its “neighbourhood” on the drawing.') },
      { icon: '✋', k: T('جرّب بنفسك', 'Try it yourself'), t: T('ضع يدك وانطق', 'Hand on, then speak'),
        b: [{ kid: T('ضع يدك على حلقك وقل «أَعْ»: تشعر بالحرف في الحلق.\nثم المس شفتيك وقل «أَبْ»: تنطبق الشفتان.\nثم أمسك أنفك وقل «إنَّ»: تشعر بالغنّة.', 'Put your hand on your throat and say “aʿ”: you feel it in the throat.\nTouch your lips and say “ab”: your lips close.\nHold your nose and say “inna”: you feel the ghunna.') },
          { check: { q: T('من أين يخرج حرف «ع»؟', 'Where does «ع» come from?'), opts: [{ t: T('الحلق', 'The throat'), ok: true, fb: T('أحسنت! العين من وسط الحلق.', 'Well done! ʿAyn comes from mid-throat.') }, { t: T('الشفتين', 'The lips'), fb: T('من الشفتين: ف و ب م.', 'The lips give ف و ب م.') }, { t: T('اللسان', 'The tongue'), fb: T('العين من حروف الحلق الستة.', 'ʿAyn is one of the six throat letters.') }] } }],
        tip: T('اجعلها لعبة «حلق أم شفتان؟»: تقول حرفًا ويشير الأطفال إلى مكانه.', 'Make it a game, “throat or lips?”: say a letter and the children point to its place.') }
    ],
    recap: [T('المخارج العامة خمسة: الجوف والحلق واللسان والشفتان والخيشوم.', 'Five areas: jawf, throat, tongue, lips and nose.'), T('حروف الحلق: ء هـ ع ح غ خ · حروف الشفتين: ف و ب م.', 'Throat: ء هـ ع ح غ خ · lips: ف و ب م.'), T('أكثر الحروف من اللسان، والغنّة من الخيشوم.', 'Most letters come from the tongue; the ghunna from the nose.')]
  },
  know_sifat: {
    title: T('حروف تهمس وحروف ثقيلة 🌬️', 'Whispering and Heavy Letters 🌬️'), mins: 8, cover: { art: 'sifat' },
    hook: T('لماذا نهمس ببعض الحروف ونفخّم بعضها؟', 'Why do we whisper some letters and make others heavy?'),
    goals: [T('يعرف حروف الهمس «فحثه شخص سكت».', 'Knows the whispering letters «فحثه شخص سكت».'), T('يعرف حروف الاستعلاء «خص ضغط قظ» وأنها مفخّمة.', 'Knows the heavy letters «خص ضغط قظ».'), T('يتذكّر حروف القلقلة «قطب جد».', 'Remembers the bouncing letters «قطب جد».')],
    slides: [
      { icon: '🌬️', k: T('الحكاية', 'The story'), t: T('لكل حرف طبع', 'Every letter has a character'),
        b: [{ row: [{ kid: T('الحروف مثل الناس، لكل منها طبع:\n• حروف تهمس فيجري معها النفَس.\n• حروف ثقيلة يرتفع معها اللسان فتملأ الفم.\n• حروف نطّاطة تقفز إذا سكنت.', 'Letters are like people — each has a character:\n• Some whisper, and breath flows with them.\n• Some are heavy: the tongue rises and they fill the mouth.\n• Some bounce when they are silent.') }, { art: 'sifat' }] }],
        tip: T('ضع ورقة رقيقة أمام فمك وقل «أَسْ» فتتحرّك (همس)، ثم «أَدْ» فلا تتحرّك.', 'Hold a thin paper in front of your mouth: say “as” and it moves (whisper), then “ad” and it doesn’t.') },
      { icon: '🔤', k: T('المجموعات الثلاث', 'The three groups'), t: T('احفظ الكلمات السرّية', 'Learn the secret words'), b: [{ sifat: true }],
        tip: T('ردّدوا الكلمات الثلاث بإيقاع: «فحثه شخص سكت · خص ضغط قظ · قطب جد».', 'Chant the three phrases rhythmically: «فحثه شخص سكت · خص ضغط قظ · قطب جد».') },
      { icon: '✅', k: T('اختبر نفسك', 'Test yourself'), t: T('من الثقيل؟', 'Who is heavy?'),
        b: [{ check: { q: T('اختر حروف الاستعلاء (الثقيلة):', 'Pick the heavy (istiʿla’) letters:'), multi: true, opts: [{ g: 'ص', ok: true, fb: T('من «خص ضغط قظ».', 'One of «خص ضغط قظ».') }, { g: 'ق', ok: true, fb: T('من «خص ضغط قظ».', 'One of «خص ضغط قظ».') }, { g: 'س', fb: T('السين مرقّقة.', 'Seen is light.') }, { g: 'ل', fb: T('اللام ليست منها.', 'Lam is not one of them.') }] } }],
        tip: T('قارن بين «س» و«ص»: نفس المكان تقريبًا، لكن الصاد ثقيلة والسين خفيفة.', 'Compare «س» and «ص»: almost the same place, but saad is heavy and seen is light.') }
    ],
    recap: [T('الهمس: «فحثه شخص سكت» يجري معها النفَس.', 'Hams: «فحثه شخص سكت», breath flows.'), T('الاستعلاء: «خص ضغط قظ» حروف مفخّمة دائمًا.', 'Istiʿla’: «خص ضغط قظ», always heavy.'), T('القلقلة: «قطب جد» تقفز إذا سكنت.', 'Qalqalah: «قطب جد», bounce when silent.')]
  },
  know_silah: {
    title: T('الهاء التي تمسك بيد صديقتها 🤝', 'The Haa That Holds a Friend’s Hand 🤝'), mins: 8, cover: { art: 'silah' },
    hook: T('لماذا نمدّ الهاء في «لَهُو» ولا نمدّها في «لَهْ» عند الوقف؟', 'Why do we stretch the haa when reading on, but not when we stop?'),
    goals: [T('يعرف علامة الصلة: واو أو ياء صغيرة بعد هاء الضمير.', 'Knows the silah mark: a small waw or yaa after the pronoun haa.'), T('يفرّق بين الصلة الصغرى (حركتان) والكبرى قبل الهمزة (٤ أو ٥).', 'Tells lesser silah (2 counts) from greater silah before a hamza (4–5).'), T('يقف على الهاء ساكنة بلا مدّ.', 'Stops on the haa as silent, with no madd.')],
    slides: [
      { icon: '🤝', k: T('الحكاية', 'The story'), t: T('هاء تمسك بيد واو صغيرة', 'A haa holding a small waw’s hand'),
        b: [{ row: [{ kid: T('هاء الضمير (لهُ، بهِ) إذا كانت بين حرفين متحرّكين أمسكت بيد صديقة صغيرة:\n• المضمومة تمسك واوًا صغيرة.\n• المكسورة تمسك ياءً صغيرة.\nفنمدّها كأنّ الحرف الصغير مكتوب.', 'When the pronoun haa sits between two voweled letters it holds a little friend’s hand:\n• with damma it holds a small waw;\n• with kasra it holds a small yaa.\nSo we stretch it as if that little letter were written.') }, { art: 'silah' }] }],
        tip: T('اكتب «لَهُ» على السبورة ثم أضف واوًا صغيرة بلون مختلف، واطلب من الأطفال قراءتها بالمدّ.', 'Write the haa on the board, then add a small waw in a different colour and ask the children to read it stretched.') },
      { icon: '📏', k: T('نوعان', 'Two kinds'), t: T('صغرى وكبرى', 'Lesser and greater'),
        b: [{ def: T('الصلة الصغرى: لا يأتي بعد الهاء همزة، فتُمدّ حركتين.\nالصلة الكبرى: يأتي بعد الهاء همزة قطع، فتُمدّ أربعًا أو خمسًا كالمد المنفصل، وتُكتب فوق الحرف الصغير مدّة.', 'Lesser silah: no hamza after the haa — two counts.\nGreater silah: a hamza comes after the haa — four or five counts like munfasil, with a madd sign over the small letter.') },
          { check: { q: T('جاءت بعد الهاء همزة. كم حركة نمدّ؟', 'A hamza comes after the haa. How many counts?'), opts: [{ t: T('أربع أو خمس', 'Four or five'), ok: true, fb: T('أحسنت! هذه صلة كبرى.', 'Well done! That is greater silah.') }, { t: T('حركتان', 'Two'), fb: T('حركتان للصغرى، أما قبل الهمزة فأربع أو خمس.', 'Two is for the lesser one; before a hamza it is four or five.') }] } }],
        tip: T('اجعل الأطفال يعدّون على أصابعهم: إصبعان للصغرى، وأربعة أو خمسة للكبرى.', 'Have the children count on their fingers: two for lesser, four or five for greater.') },
      { icon: '📖', k: T('في القرآن', 'In the Qur’an'), t: T('شاهدها واسمعها', 'See and hear it'), b: [{ silahEx: true }],
        tip: T('شغّل كل آية واطلب من الأطفال أن يرفعوا إصبعين عند الصغرى وخمسة عند الكبرى.', 'Play each ayah; children raise two fingers for lesser silah and five for greater.') },
      { icon: '🛑', k: T('انتبه', 'Watch out'), t: T('لا صلة عند الوقف', 'No silah when stopping'),
        b: [{ warn: T('إذا وقفنا على الهاء نقف بهاء ساكنة ولا نمدّ.\nوإذا جاء بعد الهاء حرف ساكن (مثل «ال») لا تُكتب الواو الصغيرة ولا نمدّ.', 'If we stop on the haa we stop with a silent haa and no madd.\nIf a silent letter follows the haa (like “al”), no small waw is written and there is no madd.') },
          { check: { q: T('وقفنا على كلمة آخرها هاء بعدها واو صغيرة. كيف ننطقها؟', 'We stop on a word ending in a haa with a small waw. How do we say it?'), opts: [{ t: T('هاء ساكنة', 'A silent haa'), ok: true, fb: T('صحيح! الصلة في الوصل فقط.', 'Right! Silah is only when reading on.') }, { t: T('نمدّ حركتين', 'Stretch two counts'), fb: T('عند الوقف لا نمدّ.', 'When stopping we do not stretch.') }] } }],
        tip: T('اقرأ آخر آية مرة بالوصل ومرة بالوقف، ودع الأطفال يميّزون الفرق.', 'Read an ayah end once joined and once stopped; let the children hear the difference.') }
    ],
    recap: [T('هاء الضمير بين متحرّكين: واو أو ياء صغيرة نمدّها.', 'The pronoun haa between two voweled letters: a small waw or yaa we stretch.'), T('صغرى: حركتان · كبرى قبل الهمزة: ٤ أو ٥.', 'Lesser: 2 counts · greater before a hamza: 4–5.'), T('عند الوقف، أو قبل ساكن: لا صلة.', 'When stopping, or before a silent letter: no silah.')]
  },
  know_wasl: {
    title: T('الهمزة المختفية 🫥', 'The Disappearing Hamza 🫥'), mins: 8, cover: { art: 'hamza_wasla' },
    hook: T('همزة تختفي إذا وصلنا، وتظهر إذا بدأنا. فبأيّ حركة تظهر؟', 'A hamza that hides when we join and appears when we start. With which vowel does it appear?'),
    goals: [T('يعرف أن همزة الوصل تسقط في وسط الكلام.', 'Knows hamzat al-wasl drops mid-speech.'), T('يبدأ «ال» بالفتح.', 'Starts “al” with fatha.'), T('ينظر إلى الحرف الثالث في الفعل: مضموم ← ضمّ، وإلا ← كسر.', 'Looks at the verb’s third letter: damma → damma, otherwise → kasra.')],
    slides: [
      { icon: '🫥', k: T('الحكاية', 'The story'), t: T('همزة تلعب الغمّيضة', 'A hamza playing hide-and-seek'),
        b: [{ row: [{ kid: T('همزة الوصل (ٱ) تختبئ إذا وصلنا الكلام، فلا نسمعها.\nفإذا بدأنا بها خرجت من مخبئها، ولبست واحدة من ثلاث حركات:\n• فتحة في «ال».\n• ضمّة إذا كان ثالث الفعل مضمومًا.\n• كسرة في غير ذلك.', 'Hamzat al-wasl (ٱ) hides when we join speech, so we do not hear it.\nWhen we start with it, it comes out and wears one of three vowels:\n• fatha in “al”;\n• damma if the verb’s third letter has damma;\n• kasra otherwise.') }, { art: 'hamza_wasla' }] }],
        tip: T('العب «اختبئ واظهر»: يصل الأطفال كلمتين فتختفي الهمزة، ثم يبدؤون بالثانية فتظهر.', 'Play “hide and appear”: join two words so the hamza hides, then start with the second so it appears.') },
      { icon: '🔢', k: T('القاعدة', 'The rule'), t: T('عُدّ إلى الحرف الثالث', 'Count to the third letter'),
        b: [{ stepsT: [T('هل الكلمة تبدأ بـ«ال»؟ ابدأ بالفتح: أَلْ.', 'Does the word start with “al”? Start with fatha: al-.'), T('هل هي من الأسماء: اسم، ابن، امرؤ، اثنان…؟ ابدأ بالكسر.', 'Is it one of the nouns ism, ibn, imru’, ithnan…? Start with kasra.'), T('هل هي فعل؟ انظر إلى الحرف الثالث: مضموم ← ابدأ بالضمّ، مفتوح أو مكسور ← ابدأ بالكسر.', 'Is it a verb? Look at the third letter: damma → start with damma; fatha or kasra → start with kasra.')] },
          { check: { q: T('ثالث الفعل مكسور. بأيّ حركة نبدأ؟', 'The verb’s third letter has kasra. Which vowel do we start with?'), opts: [{ t: T('الكسرة', 'Kasra'), ok: true, fb: T('أحسنت!', 'Well done!') }, { t: T('الضمّة', 'Damma'), fb: T('الضمّ فقط إذا كان الثالث مضمومًا.', 'Damma only if the third letter has damma.') }, { t: T('الفتحة', 'Fatha'), fb: T('الفتح في «ال» فقط.', 'Fatha is only for “al”.') }] } }],
        tip: T('اكتب أفعالًا تعليمية (اُكتب، اِذهب، اِرجع) وعدّوا الحروف معًا حتى الثالث.', 'Write practice verbs (uktub, idhhab, irjiʿ) and count the letters together up to the third.') },
      { icon: '📖', k: T('في القرآن', 'In the Qur’an'), t: T('ثلاث حركات للبدء', 'Three starting vowels'), b: [{ waslEx: true }],
        tip: T('اطلب من كل طفل أن يبدأ القراءة من الكلمة المظلّلة بصوت عالٍ.', 'Ask each child to start reading aloud from the highlighted word.') },
      { icon: '⚠️', k: T('انتبه', 'Watch out'), t: T('ضمّ عارض', 'A temporary damma'),
        b: [{ warn: T('في أفعال قليلة ضمّ الحرف الثالث عارض لأجل الواو بعده، فنبدأ بالكسر: اِمشوا، اِقضوا، اِبنوا، اِئتوا.', 'In a few verbs the third letter’s damma is only there because of the waw after it, so we start with kasra: imshū, iqḍū, ibnū, i’tū.') }],
        tip: T('هذه للمتقدّمين؛ يكفي الصغار «ال» بالفتح والقاعدة العامة.', 'This is for advanced pupils; young ones only need “al” with fatha and the general rule.') }
    ],
    recap: [T('همزة الوصل تسقط في الوصل وتُنطق في البدء.', 'Hamzat al-wasl drops when joining and is said when starting.'), T('«ال» ← فتح · ثالث الفعل مضموم ← ضمّ.', '“al” → fatha · verb’s third letter damma → damma.'), T('ثالثه مفتوح أو مكسور، والأسماء (اسم، ابن…) ← كسر.', 'Third letter fatha or kasra, and the nouns (ism, ibn…) → kasra.')]
  },
  know_waqf_types: {
    title: T('أين أقف؟ 🚦', 'Where Do I Stop? 🚦'), mins: 9, cover: { art: 'waqf_types' },
    hook: T('إذا انقطع نفَسك في وسط الآية، أين تقف؟ ومن أين تكمل؟', 'If you run out of breath mid-ayah, where do you stop, and where do you continue?'),
    goals: [T('يعرف أنواع الوقف الأربعة: التامّ والكافي والحسن والقبيح.', 'Knows the four kinds of stop: complete, sufficient, good and bad.'), T('يعرف أن الوقف على رؤوس الآي سنّة.', 'Knows that stopping at ayah ends is a sunnah.'), T('يبتدئ من كلام يستقيم به المعنى.', 'Starts again from words whose meaning is sound.')],
    slides: [
      { icon: '🚦', k: T('الحكاية', 'The story'), t: T('محطات القطار', 'Train stations'),
        b: [{ row: [{ kid: T('الآية مثل رحلة قطار، وفيها محطات:\n• محطة كبيرة ينتهي عندها الكلام كله (تامّ).\n• محطة جيدة تمّ عندها المعنى (كافٍ وحسن).\n• ومكان ليس محطة؛ لو نزلت فيه ضاع المعنى (قبيح).', 'An ayah is like a train ride with stations:\n• a big station where everything ends (complete);\n• good stations where the meaning is done (sufficient and good);\n• and places that are not stations — get off there and the meaning is lost (bad).') }, { art: 'waqf_types' }] }],
        tip: T('ارسم خط قطار على السبورة وضع عليه محطات بألوان الأنواع الأربعة.', 'Draw a railway on the board with stations coloured by the four kinds.') },
      { icon: '📘', k: T('الأنواع الأربعة', 'The four kinds'), t: T('من الأتمّ إلى القبيح', 'From complete to bad'),
        b: [{ def: T('التامّ: يتمّ المعنى ولا يتعلّق ما بعده به لفظًا ولا معنى.\nالكافي: يتمّ المعنى ويتعلّق ما بعده به في المعنى فقط.\nالحسن: يتمّ المعنى ويتعلّق ما بعده به في اللفظ.\nالقبيح: لا يتمّ المعنى.', 'Complete: the meaning is done; what follows is not linked in wording or meaning.\nSufficient: the meaning is done; what follows is linked in meaning only.\nGood: the meaning is done; what follows is linked in wording.\nBad: the meaning is not done.') },
          { check: { q: T('وقف لم يتمّ عنده المعنى:', 'A stop where the meaning is not complete:'), opts: [{ t: T('قبيح', 'Bad'), ok: true, fb: T('صحيح! لا نقف عليه إلا لضرورة.', 'Right! Only out of need.') }, { t: T('تامّ', 'Complete'), fb: T('التامّ يتمّ عنده المعنى كله.', 'Complete means the meaning is fully done.') }] } }],
        tip: T('أعطِ كل نوع حركة يد: كفّ مفتوحة للتامّ، وإبهام للكافي والحسن، وعلامة ✋ للقبيح.', 'Give each kind a hand sign: open palm for complete, thumbs up for sufficient/good, a stop hand for bad.') },
      { icon: '📖', k: T('في القرآن', 'In the Qur’an'), t: T('أمثلة مشهورة', 'Famous examples'), b: [{ waqfEx: true }],
        tip: T('اقرأ كل مثال وقف عند الكلمة المظلّلة، واسأل الأطفال: هل تمّ المعنى؟', 'Read each example and stop at the highlighted word; ask the children: is the meaning complete?') },
      { icon: '↩️', k: T('الابتداء', 'Starting again'), t: T('من أين أكمل؟', 'Where do I continue?'),
        b: [{ stepsT: [T('على رأس آية: قف، فهو سنّة، ثم ابدأ بالآية التالية.', 'At an ayah end: stop — it is a sunnah — then start the next ayah.'), T('بعد وقف تامّ أو كافٍ: ابدأ بما بعده.', 'After a complete or sufficient stop: start with what follows.'), T('بعد وقف حسن في وسط الآية أو وقف قبيح: ارجع إلى كلمة يصحّ البدء بها.', 'After a good stop mid-ayah, or a bad stop: go back to a word where it is right to start.')] }],
        tip: T('درّبهم على «الرجوع خطوة»: وقفة للنفَس ثم إعادة كلمة أو كلمتين قبلها.', 'Practise “one step back”: a breath, then repeat a word or two before.') }
    ],
    recap: [T('التامّ والكافي: نقف ونبدأ بما بعده.', 'Complete and sufficient: stop and start with what follows.'), T('الحسن في وسط الآية والقبيح: نرجع عند الابتداء.', 'Good mid-ayah, and bad: go back when starting again.'), T('الوقف على رؤوس الآي سنّة.', 'Stopping at ayah ends is a sunnah.')]
  },
  know_makharij2: {
    title: T('عناوين الحروف في الفم 🏠', 'The Letters’ Addresses in the Mouth 🏠'), mins: 12, cover: { art: 'makharij17' },
    hook: T('عرفنا الأحياء الخمسة؛ فما عنوان كل حرف بالضبط؟', 'We know the five neighbourhoods — but what is each letter’s exact address?'),
    goals: [T('يعرف أن المخارج التفصيلية سبعة عشر.', 'Knows there are seventeen detailed points.'), T('يعرف مخارج الحلق الثلاثة وحروفها.', 'Knows the three throat points and their letters.'), T('يربط كل حرف من حروف اللسان بمخرجه.', 'Links each tongue letter to its point.')],
    slides: [
      { icon: '🏠', k: T('الحكاية', 'The story'), t: T('من الحيّ إلى البيت', 'From neighbourhood to house'),
        b: [{ row: [{ kid: T('في درس المخارج عرفنا خمسة أحياء.\nواليوم نعرف عنوان كل حرف بالضبط:\nفي الجوف بيت واحد، وفي الحلق ثلاثة، وفي اللسان عشرة، وفي الشفتين اثنان، وفي الخيشوم واحد.\nالمجموع سبعة عشر بيتًا!', 'In the articulation lesson we met five neighbourhoods.\nToday we learn each letter’s exact address:\none house in the jawf, three in the throat, ten on the tongue, two at the lips and one in the nose.\nSeventeen houses in all!') }, { art: 'makharij17' }] }],
        tip: T('ابدأ هذا الدرس بعد إتقان المخارج الخمسة؛ وراجعها أولًا بلعبة سريعة.', 'Start this lesson only after the five areas are mastered; review them first with a quick game.') },
      { icon: '🗺️', k: T('السبعة عشر', 'The seventeen'), t: T('عنوان كل حرف', 'Every letter’s address'), b: [{ makharij17: true }],
        tip: T('خذ كل يوم مخرجًا أو اثنين: انطق الحرف ساكنًا بعد همزة مفتوحة (أَقْ، أَكْ) لتحسّ بمكانه.', 'Take one or two points a day: say the letter silent after a hamza with fatha (aq, ak) to feel its place.') },
      { icon: '✅', k: T('اختبر نفسك', 'Test yourself'), t: T('أين يسكن؟', 'Where does it live?'),
        b: [{ check: { q: T('من أين تخرج الضاد؟', 'Where does ḍaad come from?'), opts: [{ t: T('حافّة اللسان مع الأضراس العليا', 'The edge of the tongue with the upper molars'), ok: true, fb: T('أحسنت! وهذا سرّ صعوبتها.', 'Well done! That is why it is hard.') }, { t: T('طرف اللسان مع الثنايا', 'The tongue tip with the front teeth'), fb: T('هذا مخرج الطاء والدال والتاء.', 'That is the point of ṭaa, dal and taa.') }] } }],
        tip: T('قارن بين الظاء والضاد: مخرجان مختلفان رغم تشابه الشكل.', 'Compare ẓaa and ḍaad: two different points despite similar shapes.') }
    ],
    recap: [T('١٧ مخرجًا: ١ جوف، ٣ حلق، ١٠ لسان، ٢ شفتان، ١ خيشوم.', '17 points: 1 jawf, 3 throat, 10 tongue, 2 lips, 1 nose.'), T('الحلق: ء هـ · ع ح · غ خ.', 'Throat: ء هـ · ع ح · غ خ.'), T('ق ثم ك من أقصى اللسان، وج ش ي من وسطه.', 'ق then ك from the back of the tongue; ج ش ي from its middle.')]
  },
  know_sifat2: {
    title: T('أزواج الحروف وصفاتها الخاصة 🎭', 'Letter Pairs and Special Qualities 🎭'), mins: 12, cover: { art: 'sifat_pairs' },
    hook: T('لكل حرف خمس صفات من خمسة أزواج، وبعض الحروف لها صفة خاصة!', 'Every letter has five qualities from five pairs — and some letters have a special one!'),
    goals: [T('يعرف الأزواج الخمسة المتضادة.', 'Knows the five opposite pairs.'), T('يحفظ الكلمات الجامعة: فحثه شخص سكت، أجد قط بكت، لن عمر، خص ضغط قظ، فرّ من لبّ.', 'Memorises the phrases for each pair.'), T('يعرف الصفات السبع المميّزة وحروفها.', 'Knows the seven special qualities and their letters.')],
    slides: [
      { icon: '🎭', k: T('الحكاية', 'The story'), t: T('بطاقة هوية لكل حرف', 'An ID card for every letter'),
        b: [{ row: [{ kid: T('لكل حرف بطاقة هوية فيها خمس خانات، في كل خانة يختار واحدة من زوج:\nهامس أو مجهور، شديد أو متوسّط أو رخو، مستعلٍ أو مستفل، مُطبَق أو منفتح، مُذلَق أو مُصمَت.\nوبعض الحروف لها خانة إضافية خاصة بها!', 'Every letter has an ID card with five boxes; in each box it picks one from a pair:\nwhispered or voiced, strong/in-between/soft, raised or lowered, closed or open, fluent or restrained.\nAnd some letters have an extra special box!') }, { art: 'sifat_pairs' }] }],
        tip: T('اصنع مع الأطفال «بطاقة هوية» لحرف واحد كل حصة واملأوا خاناتها معًا.', 'Make an “ID card” for one letter each lesson and fill in its boxes together.') },
      { icon: '⚖️', k: T('الأزواج الخمسة', 'The five pairs'), t: T('لكل صفة ضدّ', 'Every quality has an opposite'), b: [{ sifaPairs: true }],
        tip: T('احفظوا الكلمات الجامعة بإيقاع، والحروف الباقية تأخذ الصفة المقابلة.', 'Chant the phrases; the remaining letters take the opposite quality.') },
      { icon: '⭐', k: T('صفات مميّزة', 'Special qualities'), t: T('سبع صفات بلا ضدّ', 'Seven with no opposite'), b: [{ sifaSingle: true }],
        tip: T('اربط كل صفة بصوت: صفّارة للصفير، كرة للقلقلة، رشّاش للتفشّي.', 'Link each to a sound: a whistle for safir, a ball for qalqalah, a sprinkler for tafashi.') },
      { icon: '✅', k: T('اختبر نفسك', 'Test yourself'), t: T('من صاحب الصفة؟', 'Whose quality is it?'),
        b: [{ check: { q: T('أيّ حرف فيه صفة التفشّي؟', 'Which letter has the quality of spreading (tafashi)?'), opts: [{ g: 'ش', ok: true, fb: T('صحيح! ينتشر الهواء مع الشين.', 'Right! The air spreads with sheen.') }, { g: 'س', fb: T('السين فيها الصفير.', 'Seen has whistling.') }, { g: 'ر', fb: T('الراء فيها التكرير والانحراف.', 'Raa has repetition and deviation.') }] } }],
        tip: T('هذا درس للمستوى المتقدّم؛ لا تطلب من الصغار حفظ الصفات كلها دفعة واحدة.', 'This is an advanced lesson; do not ask young pupils to memorise all the qualities at once.') }
    ],
    recap: [T('خمسة أزواج متضادة: لكل حرف واحدة من كل زوج.', 'Five opposite pairs: every letter has one from each.'), T('الكلمات الجامعة: فحثه شخص سكت · أجد قط بكت · لن عمر · خص ضغط قظ · فرّ من لبّ.', 'Phrases: فحثه شخص سكت · أجد قط بكت · لن عمر · خص ضغط قظ · فرّ من لبّ.'), T('سبع صفات مميّزة: الصفير والقلقلة واللين والانحراف والتكرير والتفشّي والاستطالة.', 'Seven special: whistling, bouncing, softness, deviation, repetition, spreading, lengthening.')]
  },
  know_waqf: {
    title: T('كيف أقف؟ 🛑', 'How Do I Stop? 🛑'), mins: 7, cover: { art: 'waqf_end' },
    hook: T('ماذا يحدث لآخر الكلمة إذا وقفنا عليها؟', 'What happens to the end of a word when we stop on it?'),
    goals: [T('يقف بالسكون على الحرف المتحرّك.', 'Stops on a voweled letter with a sukun.'), T('يقف على تنوين الفتح بألف.', 'Stops on fathatan with an alif.'), T('يقف على التاء المربوطة بهاء ساكنة.', 'Stops on taa marbuta with a silent haa.')],
    slides: [
      { icon: '🛑', k: T('الحكاية', 'The story'), t: T('آخر الكلمة يستريح', 'The end of the word takes a rest'),
        b: [{ row: [{ kid: T('إذا وقفنا على كلمة، يستريح آخرها:\n• الحرف المتحرّك يصير ساكنًا.\n• تنوين الفتح يصير ألفًا.\n• التاء المربوطة تصير هاءً ساكنة.\n• وما آخره حرف مد يبقى كما هو.', 'When we stop on a word, its end takes a rest:\n• A voweled letter becomes silent.\n• Fathatan becomes an alif.\n• Taa marbuta becomes a silent haa.\n• A word ending in a madd letter stays as it is.') }, { art: 'waqf_end' }] }],
        tip: T('اقرأ آخر آية بالوصل ثم بالوقف، واطلب من الأطفال أن يصفوا الفرق.', 'Read an ayah end joined and then stopped, and ask the children to describe the difference.') },
      { icon: '📖', k: T('في القرآن', 'In the Qur’an'), t: T('أربعة أمثلة من أواخر الآيات', 'Four examples from ayah ends'), b: [{ stops: true }],
        tip: T('شغّل كل آية واطلب من الأطفال أن يقلّدوا طريقة الوقف في آخرها.', 'Play each verse and have the children imitate how it stops.') },
      { icon: '✅', k: T('اختبر نفسك', 'Test yourself'), t: T('كيف نقف؟', 'How do we stop?'),
        b: [{ check: { q: T('كلمة آخرها تاء مربوطة (ة)، نقف عليها:', 'A word ending in taa marbuta (ة) — we stop with:'), opts: [{ t: T('بهاء ساكنة', 'A silent haa'), ok: true, fb: T('أحسنت!', 'Well done!') }, { t: T('بتاء مضمومة', 'A taa with damma'), fb: T('لا نقف بالحركة.', 'We never stop with a vowel.') }] } },
          { def: T('الرَّوم (الإتيان ببعض الحركة بصوت خفيّ) والإشمام (ضمّ الشفتين بلا صوت بعد الإسكان) وجهان آخران في الوقف، يُتلقّيان بالسماع من المعلم.', 'Rawm (a faint part of the vowel) and ishmam (rounding the lips silently after the sukun) are two further ways of stopping, learned by listening to the teacher.') }],
        tip: T('الرَّوم والإشمام للمتقدّمين؛ يكفي الصغار الإسكان والألف والهاء.', 'Rawm and ishmam are for advanced pupils; young ones need sukun, alif and haa.') }
    ],
    recap: [T('نقف على المتحرّك بالسكون.', 'Stop on a voweled letter with a sukun.'), T('تنوين الفتح ← ألف · التاء المربوطة ← هاء ساكنة.', 'Fathatan → alif · taa marbuta → silent haa.'), T('ما آخره حرف مد يبقى كما هو.', 'A word ending in a madd letter stays as it is.')]
  }
};

// عناوين رسوم «التجويد المصوّر» المستعملة (منسوخة من engine/tajweedBookImages.js في المنصة)
export const BOOK_CAPS = {
  p089_0: T('الألف المدّية', 'The madd alif'), p090_0: T('الواو المدّية', 'The madd waw'), p091_0: T('الياء المدّية', 'The madd yaa'), p094_0: T('الجوف: مخرج حروف المد', 'The jawf: where the madd letters come from'),
  p098_0: T('أقصى الحلق: الهمزة والهاء', 'Deepest throat: hamzah and haa'), p099_0: T('الحاء', 'Haa (ح)'), p099_1: T('العين', 'Ayn (ع)'), p100_0: T('الخاء', 'Khaa (خ)'), p100_1: T('الغين', 'Ghayn (غ)'),
  p101_0: T('القاف', 'Qaf (ق)'), p103_0: T('الجيم', 'Jeem (ج)'), p112_0: T('النون', 'Noon (ن)'), p116_0: T('الدال والتاء', 'Dal and taa (د ت)'), p116_1: T('الطاء', 'Taa, emphatic (ط)'),
  p121_0: T('الباء', 'Baa (ب)'), p109_1: T('اللام', 'Lam (ل)'), p113_0: T('الراء', 'Raa (ر)'), p099_1: T('العين', 'Ayn (ع)'), p122_0: T('الميم', 'Meem (م)'), p123_0: T('غنّة الميم من الخيشوم', 'The ghunna of meem, from the nasal passage'), p123_1: T('غنّة النون من الخيشوم', 'The ghunna of noon, from the nasal passage'),
  p185_0: T('باء ساكنة مقلقلة: تتباعد الشفتان دون الفكّين', 'A silent qalqalah baa: the lips part, not the jaws'),
  p301_0: T('إخفاء النون عند التاء والدال', 'Ikhfa of noon before taa and dal'), p302_0: T('إخفاء النون عند الكاف: وضع اللسان', 'Ikhfa of noon before kaf: tongue position'), p302_1: T('إخفاء النون عند القاف: وضع اللسان', 'Ikhfa of noon before qaf: tongue position')
};

// نصوص ثابتة لشرائح دروس الأحكام
const K = {
  story: T('الحكاية', 'The story'), pics: T('بالصور', 'In pictures'), picsT: T('شرائح الدرس', 'Lesson slides'), letters: T('الحروف', 'The letters'), where: T('من أين يخرج؟', 'Where does it come from?'),
  whereT: T('شاهد مكان الصوت', 'See where the sound is made'), quran: T('في القرآن', 'In the Qur’an'), quranT: T('شاهده واسمعه في الآيات', 'See and hear it in the verses'),
  how: T('كيف أنطقه؟', 'How do I say it?'), howT: T('خطوة خطوة', 'Step by step'), levels: T('مقياس القفزة', 'The bounce scale'), levelsT: T('ثلاث قفزات: خفيفة وعالية وعملاقة', 'Three bounces: light, high and giant'),
  vs: T('لا تخلط', 'Don’t mix them up'), vsT: T('ما الفرق؟', 'What’s the difference?'), poem: T('بيت للحفظ', 'A verse to memorize'), poemT: T('من متن «تحفة الأطفال»', 'From «Tuhfat al-Atfal»'),
  quizQ: T('اختر كل حروف هذا الحكم:', 'Pick every letter of this rule:'), quizOk: T('نعم، من حروف هذا الحكم.', 'Yes — one of this rule’s letters.'), quizNo: T('ليس من حروف هذا الحكم.', 'Not one of this rule’s letters.'),
  tipLetters: T('اكتب الحروف على بطاقات ملوّنة، وليختر كل طفل بطاقة وينطقها في كلمة.', 'Write the letters on coloured cards; each child picks one and says it in a word.'),
  tipAyahs: T('شغّل الآية، واطلب من الأطفال أن يشيروا إلى الحرف الملوَّن ثم يردّدوا.', 'Play the verse; children point to the coloured letter, then repeat.'),
  tipHow: T('ليقرأ كل طفل مثالًا واحدًا أمامك، وصحّح بلطف وبكلمة تشجيع.', 'Let each child read one example to you; correct gently, with a word of encouragement.'),
  tipVs: T('اقرأ مثالين متتاليين واسأل: «أيّهما هذا الحكم؟»', 'Read two examples in a row and ask: “Which one is this rule?”'),
  tipPoem: T('ردّد البيت مع الأطفال جملة جملة؛ الحفظ بالإيقاع أسهل.', 'Chant the verse with the children phrase by phrase; rhythm makes memorizing easy.'),
  tipWhere: T('اطلب من الأطفال أن يضعوا أيديهم حيث يخرج الصوت وهم ينطقونه.', 'Ask the children to place a hand where the sound comes from as they say it.'),
  tipLevels: T('هذا الجزء للمتقدّمين؛ مع الصغار يكفي أن يعرفوا أن القفزة تكبر عند الوقف.', 'This part is for advanced pupils; younger ones only need to know the bounce grows when we stop.')
};

function ruleStory(id) {
  const r = RULES[id], x = RULE_EXTRAS[id], tips = x.tips || {}; const slides = [];
  slides.push({ icon: '✨', k: K.story, t: r.name, b: [{ row: [{ kid: x.story }, { viz: r.viz }] }, { def: r.def }], tip: tips.intro });
  if (x.deck) slides.push({ icon: '🖼️', k: K.pics, t: K.picsT, b: [{ deck: x.deck }, ...(x.why ? [{ kid: x.why }] : [])], tip: tips.pics || K.tipWhere });
  const hasLetters = r.letters.list.length > 0;
  if (hasLetters) {
    const b = [{ letters: id, makhraj: x.makhraj || null }];
    if (x.lettersQuiz) b.push({ check: { q: x.lettersQuiz.q || K.quizQ, multi: true, opts: [...x.lettersQuiz.yes.map((g) => ({ g, ok: true, fb: K.quizOk })), ...x.lettersQuiz.no.map((g) => ({ g, fb: K.quizNo }))].sort((a, b2) => a.g.localeCompare(b2.g)) } });
    slides.push({ icon: '🔤', k: K.letters, t: r.letters.label, b, tip: tips.letters || K.tipLetters });
  } else if (x.lettersQuiz) {
    slides.push({ icon: '🔤', k: K.letters, t: x.lettersQuiz.q, b: [{ check: { q: x.lettersQuiz.q, multi: true, opts: [...x.lettersQuiz.yes.map((g) => ({ g, ok: true, fb: K.quizOk })), ...x.lettersQuiz.no.map((g) => ({ g, fb: K.quizNo }))] } }], tip: tips.letters || K.tipLetters });
  }
  if (x.book && !x.makhraj) slides.push({ icon: '👄', k: K.where, t: K.whereT, b: [{ book: x.book }, ...(x.signs ? [{ signs: x.signs.map((sid) => ({ id: sid })) }] : [])], tip: K.tipWhere });
  slides.push({ icon: '📖', k: K.quran, t: K.quranT, b: [{ ayahs: id }], tip: tips.ayahs || K.tipAyahs });
  slides.push({ icon: '👄', k: K.how, t: K.howT, b: [{ row: [{ steps: id }, ...(x.makhraj && x.book ? [{ book: x.book }] : [{ warn: r.watch }])] }, ...(x.makhraj && x.book ? [{ warn: r.watch }] : []), ...(x.teacher ? [{ def: x.teacher }] : [])], tip: tips.how || K.tipHow });
  if (x.levels) slides.push({ icon: '📏', k: K.levels, t: K.levelsT, b: [{ deck: [{ f: '05-levels', cap: T('مقياس القفز: مستويات القلقلة الثلاثة', 'The bounce scale: three levels of qalqalah') }], adv: true }, { levels: x.levels }], tip: K.tipLevels });
  slides.push({ icon: '⚖️', k: K.vs, t: K.vsT, b: [{ vs: id }], tip: K.tipVs });
  slides.push({ icon: '📜', k: K.poem, t: r.poem.src === 'tuhfa' ? K.poemT : r.poem.ref, b: [{ poem: id }], tip: K.tipPoem });
  const vsName = r.vs.length ? RULES[r.vs[0].with].name : null;
  return {
    title: x.title, mins: x.mins, cover: { art: x.art }, hook: x.hook, rule: id,
    goals: [T(`يعرف متى يقع حكم «${r.name.ar}».`, `Knows when “${r.name.en}” happens.`), T('يجده في الآيات ويسمعه بصوت المنشاوي.', 'Finds it in the verses and hears it recited by Minshawi.'),
      vsName ? T(`ينطقه صحيحًا ويفرّق بينه وبين «${vsName.ar}».`, `Says it correctly and tells it apart from “${vsName.en}”.`) : T('ينطقه نطقًا صحيحًا.', 'Says it correctly.')],
    slides,
    recap: [T(`${r.name.ar}: ${r.tagline.ar}.`, `${r.name.en}: ${r.tagline.en}.`), T(`يقع إذا وجدنا: ${r.needs.ar}.`, `It happens with ${r.needs.en}.`), T(`مقداره: ${r.length.ar}.`, `Length: ${r.length.en}.`)]
  };
}

export const STORIES = { ...MUSHAF_STORIES, ...KNOW_STORIES };
for (const id of Object.keys(RULE_EXTRAS)) STORIES[id] = ruleStory(id);
export { RULE_EXTRAS };
