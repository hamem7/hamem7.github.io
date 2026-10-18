// engine/listenEngine.js
//
// 🌟 [جديد — 2026-10-18] لعبة «استمع للشيخ… ثم كمّل» — منطق بحت (بلا DOM ولا IndexedDB) فيُختبر بـ Node.
// الفكرة: يسمع الطالب آية بصوت الشيخ المنشاوي، ثم يُكمل بصوته هو الآية التي بعدها (أو التي قبلها)،
// ثم يكشف الإجابة ويحكم على نفسه (أو يحكم المعلم). لا تقييم آلي للتلاوة (لا تعرّف على الصوت).
//
// المبدأ: الأسئلة تُبنى من «نطاق الطالب» (سور حفظه) أو نطاق مخصّص، ولا تعبر الحدّ بين سورتين:
// الآية التي بعد آخر آية في السورة (أو قبل الآية الأولى) ليست سؤالاً.

import { resolveRange } from './trackingEngine.js';

// 🌟 القرّاء: المعتمد المنشاوي (مرتّل). المجلد من موقع everyayah.com — ملف لكل آية بصيغة SSSAAA.mp3.
// أُضيف الإطار كمصفوفة ليسهل إضافة قارئ آخر لاحقاً دون لمس اللعبة.
export const RECITERS = [
    { id: 'minshawi', folder: 'Minshawy_Murattal_128kbps', name: { ar: 'الشيخ محمد صديق المنشاوي', en: 'Sheikh Muhammad Siddiq Al-Minshawi' } }
];
export const DEFAULT_RECITER = RECITERS[0];

// 🌟 اللعبة محصورة في آخر خمسة أجزاء (٢٦–٣٠): من أول سورة الأحقاف (٤٦) إلى الناس (١١٤) — بطلب صاحب المنصة.
export const MIN_SURAH = 46;
export const MAX_SURAH = 114;

const pad = (n, w) => String(n).padStart(w, '0');

export function ayahAudioUrl(surah, ayah, reciter = DEFAULT_RECITER) {
    return `https://everyayah.com/data/${reciter.folder}/${pad(surah, 3)}${pad(ayah, 3)}.mp3`;
}

// 🌟 سور نطاق الطالب (أرقام، من الأصغر للأكبر). resolveRange يرفض النطاق المعكوس أو غير المعروف فنُرجع reason للواجهة.
// يُقصّ على آخر خمسة أجزاء (٤٦..١١٤).
export function studentSurahs(surahsData, student) {
    const r = resolveRange(surahsData, student, []);
    if (!r.ok) return { ok: false, reason: r.reason, surahs: [] };
    const out = [];
    for (let n = Math.max(r.toSurah, MIN_SURAH); n <= Math.min(r.fromSurah, MAX_SURAH); n++) out.push(n);
    // 🌟 نطاق الطالب كله خارج آخر خمسة أجزاء (مثل البقرة فقط): لا يصلح للعبة
    if (!out.length) return { ok: false, reason: 'out_of_scope', surahs: [] };
    return { ok: true, surahs: out };
}

// نطاق مخصّص بين سورتين (بأي ترتيب)
export function customSurahs(from, to) {
    const a = Math.max(MIN_SURAH, Math.min(from, to)), b = Math.min(MAX_SURAH, Math.max(from, to));
    const out = [];
    for (let n = a; n <= b; n++) out.push(n);
    return out;
}

// خلط حتمي اختياري (لاختبار ثابت)؛ الافتراضي Math.random
function shuffle(arr, rnd = Math.random) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// كل الأسئلة الممكنة: {surah, ayah, answer, dir:'next'|'prev'} داخل السور المعطاة.
// surahsData: [{number, ayahsCount}] — يكفي العدّ؛ النص يُجلب في الواجهة عند العرض فقط.
export function allCandidates(surahsData, surahNumbers, mode) {
    const wantNext = mode === 'next' || mode === 'mixed';
    const wantPrev = mode === 'prev' || mode === 'mixed';
    const out = [];
    for (const n of surahNumbers) {
        const s = (surahsData || []).find(x => x.number === n);
        if (!s) continue;
        for (let a = 1; a <= s.ayahsCount; a++) {
            if (wantNext && a < s.ayahsCount) out.push({ surah: n, ayah: a, answer: a + 1, dir: 'next' });
            if (wantPrev && a > 1) out.push({ surah: n, ayah: a, answer: a - 1, dir: 'prev' });
        }
    }
    return out;
}

// جولة من count سؤال. في الوضع المختلط نوازن بين «بعدها» و«قبلها» قدر الإمكان.
// كل آية مسموعة تظهر مرة واحدة في الجولة (حتى لا يُكشف جواب سؤال بسؤال آخر).
export function buildRound(surahsData, surahNumbers, { mode = 'next', count = 10, rnd = Math.random } = {}) {
    const cands = allCandidates(surahsData, surahNumbers, mode);
    const pickedKeys = new Set();
    const result = [];
    const take = (list, limit) => {
        for (const c of shuffle(list, rnd)) {
            if (result.length >= limit) break;
            const k = c.surah + ':' + c.ayah;
            if (pickedKeys.has(k)) continue;
            pickedKeys.add(k);
            result.push(c);
        }
    };
    if (mode === 'mixed') {
        const half = Math.ceil(count / 2);
        take(cands.filter(c => c.dir === 'next'), half);
        take(cands.filter(c => c.dir === 'prev'), count);
        take(cands, count); // تعويض لو نقص أحد الاتجاهين
        return shuffle(result, rnd).slice(0, count);
    }
    take(cands, count);
    return result.slice(0, count);
}

// جولة «راجع ما أخطأت فيه» من أسئلة سابقة (نفس الأسئلة بترتيب جديد)
export function retryRound(missed, rnd = Math.random) {
    return shuffle(missed.map(({ surah, ayah, answer, dir }) => ({ surah, ayah, answer, dir })), rnd);
}

// تلميح: أول كلمتين من نص الإجابة (النص المعروض، بلا فاصل آية)
export function hintOf(text, words = 2) {
    const w = String(text || '').trim().split(/\s+/).filter(Boolean);
    return w.slice(0, words).join(' ') + (w.length > words ? ' …' : '');
}

// نتيجة الجولة: نجوم 0-3 من النسبة (بلا احتساب التلميح كخطأ؛ التلميح يُسجَّل فقط للعرض)
export function summarize(answers) {
    const total = answers.length;
    const correct = answers.filter(a => a.ok).length;
    const pct = total ? Math.round((correct / total) * 100) : 0;
    const stars = pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 40 ? 1 : 0;
    return { total, correct, pct, stars, missed: answers.filter(a => !a.ok) };
}
