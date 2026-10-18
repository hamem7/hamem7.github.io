// engine/ayahAudio.js
//
// 🌟 [جديد — 2026-10-18] سؤال «استمع للشيخ… ثم كمّل» (داخل ألعاب الكبار والأطفال): يسمع الطالب آية بصوت الشيخ المنشاوي
// ثم يذكر التي بعدها أو التي قبلها. هذا الملف نقيّ (بلا DOM ولا استيراد) ليستورده quranEngine وkidsEngine معاً.
// الصوت: قارئ واحد لكل المنصة — الشيخ المنشاوي (مرتّل) — يُستخدم في «استمع وخمّن الآية» (الأطفال) و«استمع وكمّل» (الكبار والأطفال).
// المصادر مرتّبة من الأخف إلى الأثقل، فيجرّب المشغّل التالي إن لم يتوفر السابق (بقرار صاحب المنصة: الحجم الأصغر مقبول):
//   1) cdn.islamic.network جودة 64 (الأخف) — برقم الآية العام في المصحف.
//   2) cdn.islamic.network جودة 128.
//   3) everyayah.com جودة 128 (مجلد Minshawy_Murattal_128kbps، ملف لكل آية بصيغة SSSAAA.mp3).
// ⚠️ توفّر المنشاوي بجودة 64 على cdn.islamic.network لم يُتحقق منه من بيئة التطوير (الشبكة محجوبة)؛ لذلك السلسلة.

export const LISTEN_RECITER = { id: 'minshawi', cdnEdition: 'ar.minshawi', folder: 'Minshawy_Murattal_128kbps' };

export const LISTEN_MIN_SURAH = 46;

const pad = (n, w) => String(n).padStart(w, '0');

export function ayahAudioUrl(surah, ayah, reciter = LISTEN_RECITER) {
    return `https://everyayah.com/data/${reciter.folder}/${pad(surah, 3)}${pad(ayah, 3)}.mp3`;
}

// 🌟 روابط صوت آية، مرتّبة بالأفضلية. number = رقم الآية العام (1..6236) كما في بيانات المنصة (ayah.number).
export function ayahAudioSources(number, surah, ayah, reciter = LISTEN_RECITER) {
    const list = [];
    if (number) {
        list.push(`https://cdn.islamic.network/quran/audio/64/${reciter.cdnEdition}/${number}.mp3`);
        list.push(`https://cdn.islamic.network/quran/audio/128/${reciter.cdnEdition}/${number}.mp3`);
    }
    list.push(ayahAudioUrl(surah, ayah, reciter));
    return list;
}

// تلميح: أول كلمتين من نص الإجابة
export function listenHint(text, words = 2) {
    const w = String(text || '').trim().split(/\s+/).filter(Boolean);
    return w.slice(0, words).join(' ') + (w.length > words ? ' …' : '');
}

// 🌟 جسم السؤال (HTML): سطر التعليمة + عنصر الصوت + زر التشغيل. التشغيل عبر window.playListenAyahAudio
// (components/listenAyahAudio.js) وهو يقرأ رقم الآية من data-* على الزر ويبحث عن <audio> الشقيق، فلا حاجة لمعرّفات
// (يعمل أيضاً حين يُعاد عرض جسم السؤال في «علاج الخطأ»). ayah = كائن الآية (number, surahNumber, numberInSurah).
// btnClass: كلاس الزر الموجود أصلاً في اللعبة (الأطفال: kids-listen-play-btn، الكبار: btn) — لا أنماط جديدة.
export function listenBodyHTML({ ayah, instruction, btnLabel, btnClass }) {
    return `<div style="text-align:center;">` +
        `<div style="font-size:${btnClass === 'btn' ? '1.8rem' : '1.5rem'}; font-weight:bold; margin-bottom:20px;${btnClass === 'btn' ? '' : ' color:#1e3a5f;'}">${instruction}</div>` +
        `<audio preload="none"></audio>` +
        `<button type="button" class="${btnClass}" data-n="${ayah.number || ''}" data-s="${ayah.surahNumber}" data-a="${ayah.numberInSurah}" onclick="window.playListenAyahAudio(this)">${btnLabel}</button>` +
        `</div>`;
}
