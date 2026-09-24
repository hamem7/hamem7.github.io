// dualtests/dual-test-sounds.js
//
// 🌟 [جديد بالكامل] أصوات بسيطة لشاشة اللعب الفعلية — بطلب صريح من المعلم ("نغمة نجاح عند
// الإجابة الصحيحة، نغمة تنبيه عند الخطأ، صوت تصفيق أو تكبير عند الفوز النهائي"). ملف مستقل
// تماماً في مجلد dualtests/ (نفس فلسفة العزل الكودي المتبعة في كل هذه الميزة)، ولا يستخدم أي
// ملف صوتي خارجي — كل الأصوات مُصطنَعة برمجياً عبر Web Audio API المدمجة في المتصفح، تفضيلاً
// للحلول المدمجة على أي مكتبة أو ملف وسائط خارجي (يعمل حتى بلا إنترنت، يناسب فلسفة PWA).
//
// 🌟 ملاحظة صريحة مهمة: "صوت تصفيق أو تكبير" الحقيقي (كلام مسجَّل أو تصفيق بشري فعلي) لا يمكن
// توليده برمجياً بهذه الطريقة — هو صوت اصطناعي "يشبه" التصفيق (نبضات ضوضاء قصيرة متتابعة) ممزوج
// بنغمة احتفالية، وليس تسجيلاً حقيقياً. لو رغب المعلم لاحقاً في صوت تكبير أو تصفيق حقيقي، يحتاج
// توفير ملف صوتي فعلي (mp3/ogg) لوضعه هنا بدلاً من الصوت المُصطنَع، أو بجانبه.

let audioCtx = null;

function getAudioCtx() {
    try {
        if (!audioCtx) {
            const Ctor = window.AudioContext || window.webkitAudioContext;
            if (!Ctor) return null;
            audioCtx = new Ctor();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => { /* best-effort */ });
        }
        return audioCtx;
    } catch (e) {
        return null; // 🌟 بعض المتصفحات القديمة جداً قد لا تدعم Web Audio API إطلاقاً — لا نكسر اللعب بسبب هذا
    }
}

// نغمة واحدة بسيطة (Oscillator) — لبنة بناء لكل الأصوات أدناه
function playTone(freq, duration = 0.15, type = 'sine', when = 0, gainPeak = 0.2) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        const startAt = ctx.currentTime + when;
        gain.gain.setValueAtTime(0, startAt);
        gain.gain.linearRampToValueAtTime(gainPeak, startAt + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startAt);
        osc.stop(startAt + duration + 0.05);
    } catch (e) { /* best-effort — أي فشل هنا لا يوقف اللعب */ }
}

// نبضة ضوضاء قصيرة مفلترة — تشبه "تصفيقة" واحدة، تُستخدَم عدة مرات متتالية لمحاكاة التصفيق
function playClapBurst(when = 0, gainPeak = 0.3) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
        const duration = 0.09;
        const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1800;
        const gain = ctx.createGain();
        const startAt = ctx.currentTime + when;
        gain.gain.setValueAtTime(gainPeak, startAt);
        gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        src.start(startAt);
    } catch (e) { /* best-effort */ }
}

/** 🌟 نغمة تنبيه قصيرة عند تسجيل خطأ (❌ تسجيل خطأ) */
export function playMistakeSound() {
    playTone(220, 0.16, 'square', 0, 0.14);
}

/** 🌟 نغمة نجاح صاعدة (3 نغمات) عند اعتماد إجابة بلا أي خطأ فيها */
export function playSuccessSound() {
    playTone(523.25, 0.14, 'sine', 0, 0.18);    // C5
    playTone(659.25, 0.14, 'sine', 0.12, 0.18); // E5
    playTone(783.99, 0.22, 'sine', 0.24, 0.2);  // G5
}

/** 🌟 احتفال الفوز النهائي: تصفيق مُصطنَع + نغمات احتفالية متتالية (راجع الملاحظة أعلى الملف) */
export function playWinSound() {
    for (let i = 0; i < 6; i++) {
        playClapBurst(i * 0.09 + Math.random() * 0.02, 0.32);
    }
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        playTone(f, 0.2, 'triangle', 0.55 + i * 0.13, 0.2);
    });
}

/** 🌟 [جديد] احتفال خفيف بفوز طالب بـ"جولة" واحدة (شاشة نتيجة الجولة الجديدة) — ثلاث نغمات
 * صاعدة سريعة + تصفيقتان فقط. مقصود أن تكون أقصر وأهدأ بوضوح من playWinSound أعلاه (التي
 * تخص نهاية المواجهة كلها)، حتى تبقى لحظة النتيجة النهائية هي الأقوى بصرياً وصوتياً، ولا
 * يمل الطالبان من احتفال كامل بعد كل جولة من الثلاث. راجع finishRound في dual-test-play.js */
export function playRoundWinSound() {
    playClapBurst(0, 0.22);
    playClapBurst(0.1, 0.2);
    [659.25, 830.61, 1046.5].forEach((f, i) => {
        playTone(f, 0.16, 'triangle', 0.16 + i * 0.11, 0.18);
    });
}

/** 🌟 [جديد] "تكة" خفيفة جداً مع كل تبديل اسم في شاشة القرعة الجديدة (ملء الشاشة، أسلوب
 * سلوت مشين) — بديل عجلة الدوران القديمة بطلب صريح من المعلم. نغمة قصيرة جداً حتى لا تُزعج
 * مع تكرارها السريع أول القرعة. راجع runNameDraw في dual-test-play.js لمكان الاستدعاء. */
export function playDrawTickSound() {
    playTone(320, 0.045, 'square', 0, 0.06);
}

/** 🌟 [جديد] نغمة استقرار القرعة على اسم الطالب الفائز بها (نهاية شاشة القرعة الجديدة) —
 * نغمتان صاعدتان خفيفتان، أهدأ من playSuccessSound حتى تبقى مميّزة عنها في سياقها الخاص */
export function playDrawLandSound() {
    playTone(659.25, 0.12, 'sine', 0, 0.16);
    playTone(987.77, 0.22, 'sine', 0.09, 0.18);
}
