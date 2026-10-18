// engine/ayahAudio.js
//
// 🌟 [جديد — 2026-10-18] سؤال «استمع للشيخ… ثم كمّل» (داخل ألعاب الكبار والأطفال): يسمع الطالب آية بصوت الشيخ المنشاوي
// ثم يذكر التي بعدها أو التي قبلها. هذا الملف نقيّ (بلا DOM ولا استيراد) ليستورده quranEngine وkidsEngine معاً.
// الصوت: ملف لكل آية من everyayah.com بصيغة SSSAAA.mp3، قارئ «المنشاوي — مرتّل» (مجلد Minshawy_Murattal_128kbps).
// ⚠️ منفصل عمداً عن صوت «استمع وخمّن الآية» للأطفال (عبد الباسط عبر cdn.islamic.network + تخزين IndexedDB) فلا يتداخل التخزين.

export const LISTEN_RECITER = { id: 'minshawi', folder: 'Minshawy_Murattal_128kbps' };

// 🌟 اللعبة محصورة في آخر خمسة أجزاء (٢٦–٣٠): من أول سورة الأحقاف (٤٦) إلى الناس (١١٤) — بطلب صاحب المنصة.
export const LISTEN_MIN_SURAH = 46;

const pad = (n, w) => String(n).padStart(w, '0');

export function ayahAudioUrl(surah, ayah, reciter = LISTEN_RECITER) {
    return `https://everyayah.com/data/${reciter.folder}/${pad(surah, 3)}${pad(ayah, 3)}.mp3`;
}

// تلميح: أول كلمتين من نص الإجابة
export function listenHint(text, words = 2) {
    const w = String(text || '').trim().split(/\s+/).filter(Boolean);
    return w.slice(0, words).join(' ') + (w.length > words ? ' …' : '');
}

// 🌟 جسم السؤال (HTML): سطر التعليمة + عنصر الصوت + زر التشغيل. التشغيل عبر window.playListenAyahAudio
// (components/listenAyahAudio.js) وهو يبحث عن <audio> الشقيق، فلا حاجة لمعرّفات (يعمل أيضاً في شاشة «علاج الخطأ»).
// btnClass: كلاس الزر الموجود أصلاً في اللعبة (الأطفال: kids-listen-play-btn، الكبار: btn) — لا أنماط جديدة.
export function listenBodyHTML({ url, instruction, btnLabel, btnClass }) {
    return `<div style="text-align:center;">` +
        `<div style="font-size:1.8rem; font-weight:bold; margin-bottom:20px;">${instruction}</div>` +
        `<audio src="${url}" preload="auto"></audio>` +
        `<button type="button" class="${btnClass}" onclick="window.playListenAyahAudio(this)">${btnLabel}</button>` +
        `</div>`;
}
