// engine/similarityQuestions.js
//
// مولّد أسئلة المتشابهات (النسخة المعتمدة) — منطق بحت (بلا DOM ولا IndexedDB) فيُختبر بـ Node على القرآن كله.
// منقول عن النسخة المرجعية mutashabihat_questions.py مع تكييفه لبيانات المنصة (surahNumber + ayahNumber/ayahRange).
//
// المبدأ: نص الآيات يُقرأ دائماً من مصحف المنصة (database/quran-uthmani.json / IndexedDB) عبر QuranIndex،
// ولا يُؤخذ حرف واحد من حقل fullText في بيانات المتشابهات (فهو نسخة للمراجعة وقد يخالف المصحف).
// ما تأخذه من المجموعة فقط: عبارتها المشتركة (anchorPhrase) ومواضعها (سورة + رقم آية).
//
// القواعد (من PROMPT_FOR_CODE.md):
//  1) لا رقم آية في نص السؤال ولا في الخيارات. الموضع يُعرَّف باسم السورة + الآية السابقة/اللاحقة.
//     الرقم يبقى في حقل ref للمعلم فقط.
//  2) أربعة أنواع: sim_pair | sim_complete | sim_which | sim_match — غرضها تمييز الآية/الكلمة عن شبيهتها في سورة أخرى.
//     (حُذف «من أي سورة وردت هذه الآية؟»: جوابه يُعرف من الجزء المميِّز للآية لا من المتشابه، فليس من المتشابهات.)
//     sim_pair «في أي سورتين وردت العبارة؟» وsim_notin «أيُّ سورة لم ترد فيها؟» (3–5 سور) للأجزاء 26–30 فقط (جزء عمّ والأجزاء الخمسة الأخيرة).
//     أسئلة «ماذا بعدها؟/ما قبلها؟» محذوفة: هي ترتيب عادي موجود أصلاً في أسئلة السابقة واللاحقة وليست من التمييز بين المتشابهات
//  3) تطابق لفظ الآيتين في موضعين: يُعرض معهما السياق حتى يكون الجواب واحداً.
//  4) منع التكرار داخل المجموعة: لا سؤالان يسألان الحقيقة نفسها ولا يكشف أحدهما جواب الآخر.
//  5) كل الخيارات الخاطئة من نص القرآن نفسه، ويُتحقق آلياً أنها ليست جواباً صحيحاً في السياق المذكور.

import { tl, nameL, labelL } from '../core/langBridge.js';

// ---------------- تطبيع النص ----------------
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭـ\u08F0-\u08FF]/g;
const BASMALA_SKEL = 'بسم الله الرحمن الرحيم';

// تطبيع للمقارنة بين نصين من المصحف نفسه (أو بحث نص داخل نص): بلا تشكيل ولا فروق ألف/ياء/تاء مربوطة
export function norm(s) {
    return String(s == null ? '' : s).replace(/﻿/g, '').replace(MARKS, '')
        .replace(/[أإآٱ]/g, 'ا').replace(/[ى\u06CC]/g, 'ي').replace(/ة/g, 'ه')
        .replace(/\s+/g, ' ').trim();
}

// هيكل صامت (بلا حروف المدّ ولا الهمزات): لمطابقة عبارة المجموعة (مكتوبة بإملاء مبسّط) بنص المصحف العثماني
// (مثال: «أتاك» بالإملاء المبسّط ↔ «أتىٰك» بالعثماني). يُستعمل لتحديد موضع العبارة فقط، لا للمقارنة بين آيات المصحف.
export function skel(s) {
    return norm(s).replace(/[ايوءئؤ]/g, '');
}

// ۞ (علامة بداية الحزب) ليست من نص الآية: تُحذف من كل ما يُعرض (العبارات والآيات والخيارات)
export const stripHizbMark = (s) => String(s == null ? '' : s).replace(/[\u06DE\u06E9]\s*/g, '').replace(/\s+/g, ' ').trim();

const wordsOf = (s) => String(s).split(/\s+/).filter(Boolean);
const cutWords = (text, k) => { const w = wordsOf(text); return [w.slice(0, k).join(' '), w.slice(k).join(' ')]; };

// عبارة المجموعة قد تحمل رموز تلخيص يدوية («يَوْمَ ...»، «إِذَا ... / وَإِذَا ...»): نأخذ ما قبلها فقط
export function cleanPhrase(p) {
    return stripHizbMark(p).split('/')[0].replace(/\.{2,}|…|…/g, ' ').replace(/[ـ]/g, '').replace(/\s+/g, ' ').trim();
}

// ---------------- فهرس المصحف ----------------
// surahs: مصفوفة بشكل data.surahs في quran-uthmani.json (وهو ما يُخزَّن بحرفيته في IndexedDB):
//   [{ number, name, ayahs: [{ numberInSurah, text, juz }] }]
// الآية الأولى من كل سورة (عدا الفاتحة والتوبة) تحمل البسملة في بداية نصها في هذا المصدر وهي ليست من الآية،
// فتُحذف هنا وقت القراءة فقط (لا يُعدَّل الملف نفسه). وتُحذف علامة BOM غير المرئية في أول الفاتحة.
export class QuranIndex {
    constructor(surahs) {
        this.surahs = new Map();    // number -> { number, name, plainName, verses: Map(n -> {n, text, norm, juz}) , count }
        this.flat = [];             // كل الآيات بالترتيب
        for (const s of surahs) {
            const verses = new Map();
            for (const a of s.ayahs) {
                let text = stripHizbMark(String(a.text).replace(/\uFEFF/g, ''));
                if (a.numberInSurah === 1 && s.number !== 1 && s.number !== 9) text = stripBasmala(text);
                const v = { s: s.number, n: a.numberInSurah, text, norm: norm(text), juz: a.juz };
                verses.set(a.numberInSurah, v);
                this.flat.push(v);
            }
            this.surahs.set(s.number, { number: s.number, name: s.name, plainName: plainSurahName(s.name), verses, count: verses.size });
        }
    }
    verse(s, n) { const x = this.surahs.get(s); return x ? x.verses.get(n) || null : null; }
    surahName(s) { const x = this.surahs.get(s); return x ? x.plainName : String(s); }
    ayahCount(s) { const x = this.surahs.get(s); return x ? x.count : 0; }
    // السور التي فيها آيات من هذا الجزء
    juzSurahs(juz) {
        const out = [];
        for (const [num, sd] of this.surahs) for (const v of sd.verses.values()) if (v.juz === juz) { out.push(num); break; }
        return out;
    }
    // السور التي تحتوي نصاً (بعد التطبيع) داخل أي من آياتها
    surahsContaining(text) {
        const t = norm(text), out = new Set();
        for (const v of this.flat) if (v.norm.includes(t)) out.add(v.s);
        return out;
    }
    // السور التي تحتوي الآيتين متتاليتين (a ثم b)
    surahsContainingPair(a, b) {
        const na = norm(a), nb = norm(b), out = new Set();
        for (const sd of this.surahs.values()) {
            for (const v of sd.verses.values()) {
                if (v.norm !== na) continue;
                const nx = sd.verses.get(v.n + 1);
                if (nx && nx.norm === nb) { out.add(v.s); break; }
            }
        }
        return out;
    }
    // نصوص (بعد التطبيع) الآيات التي تلي كل ورود لسلسلة آيات متتالية داخل سورة معيّنة
    followersIn(surah, seqNorms) {
        return this._around(surah, seqNorms, +1);
    }
    precedersIn(surah, seqNorms) {
        return this._around(surah, seqNorms, -1);
    }
    _around(surah, seq, dir) {
        const sd = this.surahs.get(surah), out = new Set();
        if (!sd) return out;
        const L = seq.length;
        for (let n = 1; n + L - 1 <= sd.count; n++) {
            let ok = true;
            for (let i = 0; i < L; i++) if (sd.verses.get(n + i).norm !== seq[i]) { ok = false; break; }
            if (!ok) continue;
            const t = sd.verses.get(dir > 0 ? n + L : n - 1);
            if (t) out.add(t.norm);
        }
        return out;
    }
    // ذيول كل آية في القرآن ترد فيها العبارة (في أي موضع منها): ما يلي العبارة مباشرة
    tailsAfterPhrase(phrase) {
        const sp = skel(phrase), k = wordsOf(phrase).length, out = [];
        if (!sp || !k) return out;
        this._pc = this._pc || new Map();
        if (this._pc.has(sp)) return this._pc.get(sp);
        for (const v of this.flat) {
            const w = wordsOf(v.text);
            for (let i = 0; i + k < w.length; i++) {
                if (skel(w.slice(i, i + k).join(' ')) === sp) { out.push(w.slice(i + k).join(' ')); break; }
            }
        }
        this._pc.set(sp, out);
        return out;
    }
    // ذيول كل آية في القرآن تبدأ بالمطلع نفسه (متشابهات حقيقية تصلح مشتّتات)
    tailsAfterStem(stem) {
        const ns = norm(stem), k = wordsOf(stem).length, out = [];
        for (const v of this.flat) if (v.norm.startsWith(ns + ' ')) out.push(cutWords(v.text, k)[1]);
        return out;
    }
}

export function stripBasmala(text) {
    const w = wordsOf(text);
    if (w.length > 4 && norm(w.slice(0, 4).join(' ')) === norm('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ')) return w.slice(4).join(' ');
    return text;
}

// «سُورَةُ ٱلْبَقَرَةِ» ← «البقرة» (بلا تشكيل ولا كلمة سورة)، ليصلح بعد «في سورة» و«سورة»
const NAME_MARKS = /[\u0610-\u061A\u064B-\u0652\u0654-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]/g; // بدون المدّة ٓ ليبقى «آل عمران»
export function plainSurahName(name) {
    return String(name || '').replace(NAME_MARKS, '').replace(/ٱ/g, 'ا').replace(/^\s*سورة\s*/, '').trim();
}

// ---------------- أدوات ----------------
export function mulberry32(a) {
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function shuffled(arr, rng) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
}
const verse = (t) => '﴿' + t + '﴾';
// عرض الآية الطويلة في نص السؤال: إن زادت عن SHOW_WORDS كلمة (+2 هامش) تُقتطع بـ «…».
// side='tail': تبقى النهاية («ماذا بعدها؟» والمهم ما قبل الجواب مباشرة)، side='head': تبقى البداية («ما قبلها؟»).
// العرض فقط: يُوسَّع المقطع حتى يكون وحيداً داخل السورة (فلا تتشابه آيتان في الجزء المعروض)، والتحقق يبقى على النص الكامل.
export const SHOW_WORDS = 12;
function shownVerse(Q, s, text, side) {
    const w = wordsOf(text);
    if (w.length <= SHOW_WORDS + 2) return verse(text);
    const sd = Q.surahs.get(s);
    for (let K = SHOW_WORDS; K + 2 < w.length; K++) {
        const part = side === 'head' ? w.slice(0, K) : w.slice(-K);
        const n = norm(part.join(' '));
        let c = 0;
        for (const v of sd.verses.values()) if (side === 'head' ? (v.norm === n || v.norm.startsWith(n + ' ')) : (v.norm === n || v.norm.endsWith(' ' + n))) c++;
        if (c === 1) return side === 'head' ? '﴿' + part.join(' ') + ' …﴾' : '﴿… ' + part.join(' ') + '﴾';
    }
    return verse(text);
}
const setHas = (a, b) => { for (const x of a) if (b.has(x)) return true; return false; };

// ثلاثة خيارات فقط (بطلب المعلم): تُزال التكرارات بعد التطبيع، ويُقتصر على الصحيح + 2 إن زادت. null إن قلّت عن 3
function finalize(opts, correct, rng) {
    const seen = new Set(), u = [];
    for (const o of opts) { const k = norm(o); if (!seen.has(k)) { seen.add(k); u.push(o); } }
    const nc = norm(correct);
    let ci = u.findIndex(o => norm(o) === nc);
    if (ci < 0) return null;
    let res = u;
    if (u.length > 3) {
        const others = shuffled(u.filter((_, i) => i !== ci), rng);
        res = [u[ci], ...others.slice(0, 2)]; ci = 0;
    }
    return res.length >= 3 ? { opts: res, ci } : null;
}

// ---------------- مواضع المجموعة ----------------
// الموضع = آية واحدة. موضع جزء عمّ قد يكون نطاقاً (ayahRange = "15" / "23-24" / "1...13"): نأخذ أول آية في النطاق
// تحوي عبارة المجموعة (إن وُجدت) وإلا يُهمَل الموضع ويُسجَّل سببه.
function parseRange(r) {
    const m = String(r == null ? '' : r).match(/(\d+)\s*(?:-|–|\.{2,3}|…)?\s*(\d+)?/);
    if (!m) return null;
    const a = +m[1], b = m[2] ? +m[2] : a;
    return [Math.min(a, b), Math.max(a, b)];
}

function resolveLocations(Q, group, notes, midVerse = true) {
    const phrase = cleanPhrase(group.anchorPhrase);
    const sphrase = skel(phrase);
    const hasPhrase = (v) => sphrase.length >= 2 && skel(v.text).includes(sphrase);
    const out = [], seen = new Set();
    for (const o of group.occurrences || []) {
        let v = null;
        if (o.ayahNumber != null) {
            v = Q.verse(o.surahNumber, Number(o.ayahNumber));
            if (!v) { notes.push(`موضع غير موجود في المصحف: ${o.surahNumber}:${o.ayahNumber}`); continue; }
        } else {
            const r = parseRange(o.ayahRange);
            if (!r) { notes.push(`نطاق غير مفهوم: ${o.surahNumber}:${o.ayahRange}`); continue; }
            for (let n = r[0]; n <= r[1] && !v; n++) { const c = Q.verse(o.surahNumber, n); if (c && hasPhrase(c)) v = c; }
            if (!v && r[0] === r[1]) v = Q.verse(o.surahNumber, r[0]);
            if (!v) { notes.push(`عبارة المجموعة غير موجودة في النطاق ${o.surahNumber}:${o.ayahRange}`); continue; }
        }
        const key = v.s + ':' + v.n;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(makeLoc(Q, v, phrase, midVerse));
    }
    return { locs: out, phrase };
}

// أقصى طول للمطلع حين تقع العبارة في وسط الآية (كل ما قبلها ومعها): الأطول يُهمَل حتى لا يكشف أغلب الآية (بقرار المعلم: 15 كلمة)
export const MAX_MID_STEM_WORDS = 15;
function makeLoc(Q, v, phrase, midVerse = true) {
    const loc = { v, s: v.s, n: v.n, text: v.text, norm: v.norm, surahName: Q.surahName(v.s),
        prev: Q.verse(v.s, v.n - 1), next: Q.verse(v.s, v.n + 1), stem: null, tail: null, stemMid: false };
    loc.ref = `سورة ${loc.surahName}، الآية ${v.n}`;
    loc.vid = v.s + ':' + v.n;
    // موضع العبارة في الآية: start (في أولها) | mid (في وسطها) | end (في آخرها فلا ما يُكمَل) | whole (هي الآية كلها) | none (لم تُطابَق)
    const w = wordsOf(v.text), k = wordsOf(phrase).length, sp = skel(phrase);
    let idx = -1;
    if (k > 0 && sp) for (let i = 0; i + k <= w.length; i++) if (skel(w.slice(i, i + k).join(' ')) === sp) { idx = i; break; }
    loc.phraseAt = idx < 0 ? 'none' : idx === 0 ? (w.length > k ? 'start' : 'whole') : (idx + k < w.length ? 'mid' : 'end');
    if (loc.phraseAt === 'start') [loc.stem, loc.tail] = cutWords(v.text, k);
    // العبارة في وسط الآية ← المطلع = كل ما قبلها مع العبارة (حتى MAX_MID_STEM_WORDS كلمة)، والمطلوب إكمال الباقي
    else if (midVerse && loc.phraseAt === 'mid' && idx + k <= MAX_MID_STEM_WORDS) { [loc.stem, loc.tail] = cutWords(v.text, idx + k); loc.stemMid = true; }
    return loc;
}

// ---------------- بناء مرشّحات الأسئلة ----------------
const vidOf = (l, d = 0) => l.s + ':' + (l.n + d);
// هوية الآية للكشف عن التكرار: السورة + نصها (فالآية المتطابقة اللفظ في موضعين تُعدّ آية واحدة)
const tid = (v) => v.s + '|' + v.norm;
// «حقيقة» السؤال: الآية الفلانية تتبع الآية الفلانية (أو الموضع الفلاني في سورة كذا). سؤالان بحقيقة واحدة مكرران ولو اختلف نوعهما
const fact = (a, b) => (a ? tid(a) : 'START') + '>' + (b ? tid(b) : 'END');

// الآية تذكر اسم سورتها (مثل «وما أدراك ما الطارق» في الطارق) فلا تصلح للتمييز: الاسم يكشف الجواب
function namesItsSurah(l) {
    const n = norm(l.surahName).replace(/^ال/, '');
    return n.length >= 3 && l.norm.includes(n);
}

// السور التي ترد فيها الآية (مخزَّنة لكل فهرس)
function holdersOf(Q, text) {
    Q._hc = Q._hc || new Map();
    if (!Q._hc.has(text)) Q._hc.set(text, Q.surahsContaining(text));
    return Q._hc.get(text);
}

// ---------------- «في أي سورتين وردت العبارة؟» (sim_pair) ----------------
// للأجزاء الخمسة الأخيرة (26–30) بطلب المعلم. العبارة تُحدَّد بالنص المشترك بين مواضع المجموعة، والجواب هو السورتان
// الوحيدتان اللتان ترد فيهما العبارة ضمن النطاق المذكور في السؤال (جزء عمّ، أو الأجزاء الخمسة الأخيرة)، ويُحسب من المصحف مباشرة.
export const PAIR_FIRST_JUZ = 26;
export const PAIR_LAST_JUZ = 30;
const PAIR_SEP = '|';
// كلمات الآية بتطبيع صارم (بلا تشكيل فقط): المطابقة بين آيات المصحف نفسه لا بالهيكل الصامت، فـ«صراطًا» ≠ «صراطٍ»
// علامات الوقف المستقلة (ۚ ۖ ...) ليست كلمات: تُستبعد من العبارة المعروضة ومن المطابقة
const contentWords = (text) => wordsOf(text).filter(w => norm(w));
const strictWords = (Q, v) => {
    Q._ws = Q._ws || new Map();
    const k = v.s + ':' + v.n;
    if (!Q._ws.has(k)) Q._ws.set(k, contentWords(v.text).map(norm));
    return Q._ws.get(k);
};
const hasRun = (ws, run) => { for (let i = 0; i + run.length <= ws.length; i++) if (run.every((x, j) => ws[i + j] === x)) return true; return false; };
// أطول مقطع كلمات متصل مشترك بين كل المواضع (بنص المصحف العثماني للموضع الأول)، أو null
function commonRun(Q, locs) {
    const base = contentWords(locs[0].text), bs = strictWords(Q, locs[0].v), others = locs.slice(1).map(l => strictWords(Q, l.v));
    let best = null;
    for (let i = 0; i < bs.length; i++) {
        for (let j = bs.length; j > i && (!best || j - i > best.len); j--) {
            const run = bs.slice(i, j);
            if (others.every(o => hasRun(o, run))) { best = { len: j - i, words: base.slice(i, j) }; break; }
        }
    }
    return best ? best.words.join(' ') : null;
}
// عبارة المجموعة بنص المصحف (الكلمات الفعلية من الموضع الأول)، أو null إن لم ترد في كل المواضع
function anchorRun(Q, locs, phrase) {
    // العبارة في بيانات المجموعة بإملاء مبسّط: تُحدَّد بالهيكل الصامت في الموضع الأول، ثم يُشترط تطابق كلماتها الفعلية في كل المواضع
    const sp = wordsOf(phrase).map(skel);
    if (!sp.length) return null;
    const first = locs[0], fw = contentWords(first.text), fs = fw.map(skel);
    for (let i = 0; i + sp.length <= fs.length; i++) {
        if (!sp.every((x, j) => fs[i + j] === x)) continue;
        const run = fw.slice(i, i + sp.length).map(norm);
        return locs.every(l => hasRun(strictWords(Q, l.v), run)) ? fw.slice(i, i + sp.length).join(' ') : null;
    }
    return null;
}
// السور (ضمن النطاق) التي ترد فيها العبارة داخل آية واحدة
function phraseHolders(Q, phrase, scopeSet) {
    const sp = wordsOf(phrase).map(norm), out = new Set();
    for (const v of Q.flat) if (scopeSet.has(v.s) && !out.has(v.s) && hasRun(strictWords(Q, v), sp)) out.add(v.s);
    return out;
}
const juzRange = (Q, from, to) => { const s = new Set(); for (let j = from; j <= to; j++) Q.juzSurahs(j).forEach(x => s.add(x)); return s; };

// عبارة ضعيفة لا تصلح سؤال متشابهات: كلمة واحدة، أو أقل من خمسة حروف أصلية في مجموع الكلمات (مثل «إنا كنا»، «هذا يوم»)
export function isWeakPhrase(phrase) {
    const sk = contentWords(phrase).map(skel);
    return sk.length < 2 || sk.join('').length < 5;
}
const NOTIN_MIN = 3, NOTIN_MAX = 5;
const COUNT_WORD = { 3: 'ثلاث', 4: 'أربع', 5: 'خمس' };

// 🌟 مشتتات «في أي سورتين؟»: سورة قريبة من السورة المقصودة في الطول (عدد الآيات) وفي الموضع من المصحف، مع قدر من العشوائية،
// فلا يستبعد الطالب سورتين قصيرتين لمجرد أن الجواب من سور كبيرة (ولا العكس)
function surahLen(Q, s) {
    if (!Q._sl) { Q._sl = new Map(); for (const v of Q.flat) Q._sl.set(v.s, (Q._sl.get(v.s) || 0) + 1); }
    return Q._sl.get(s) || 1;
}
function pickNear(Q, pool, target, rng, taken) {
    const lt = Math.log(surahLen(Q, target));
    const scored = pool.filter(s => !taken.has(s)).map(s => ({ s, d: Math.abs(Math.log(surahLen(Q, s)) - lt) + Math.abs(s - target) / 114 + rng() * 0.35 }));
    if (!scored.length) return null;
    scored.sort((a, b) => a.d - b.d);
    taken.add(scored[0].s);
    return scored[0].s;
}

// «في أي سورتين؟» (العبارة في سورتين بالضبط) أو «أي سورة لم ترد؟» (في 3–5 سور: الجواب سورة من النطاق لا ترد فيها)
function pairCandidate(Q, group, locs, rng) {
    if (!locs.every(l => l.v.juz >= PAIR_FIRST_JUZ && l.v.juz <= PAIR_LAST_JUZ)) return null;
    const surahs = [...new Set(locs.map(l => l.s))];
    const scopes = [];
    if (locs.every(l => l.v.juz === PAIR_LAST_JUZ)) scopes.push({ id: 'juz30', set: juzRange(Q, 30, 30) });
    scopes.push({ id: 'last5', set: juzRange(Q, PAIR_FIRST_JUZ, PAIR_LAST_JUZ) });
    const phrases = [anchorRun(Q, locs, cleanPhrase(group.anchorPhrase)), locs.length > 1 ? commonRun(Q, locs) : null].filter(Boolean);
    for (const phrase of [...new Set(phrases)]) {
        if (isWeakPhrase(phrase)) continue;
        const sk = contentWords(phrase).map(skel);
        const np = norm(phrase);
        const hides = (s) => { const n = norm(Q.surahName(s)).replace(/^ال/, ''); return n.length >= 3 && np.includes(n); }; // اسم السورة داخل العبارة يكشف الجواب
        for (const sc of scopes) {
            const holders = phraseHolders(Q, phrase, sc.set);
            if (!surahs.every(s => holders.has(s)) || holders.size < 2 || holders.size > NOTIN_MAX) continue;
            const hs = [...holders].sort((a, b) => a - b);
            if (hs.some(hides)) continue;
            const decoys = [...sc.set].filter(s => !holders.has(s) && !hides(s));
            if (decoys.length < 3) continue;
            const occ = locs.filter(l => holders.has(l.s)).map(l => ({ surahNumber: l.s, surahName: l.surahName, ayahNumber: l.n, fullText: l.text }));
            const base = { shown: new Set(), answer: new Set(), key: 'pair|' + group.groupId, facts: new Set(['phrase|' + sk.join(' ')]) };
            const name = (n) => Q.surahName(n);
            if (hs.length === 2) {
                const key = (a) => [...a].sort((x, y) => x - y).map(name).join(PAIR_SEP);
                const ki = Math.floor(rng() * 2), keep = hs[ki], drop = hs[1 - ki];
                const taken = new Set();
                const d1 = pickNear(Q, decoys, drop, rng, taken), d2 = pickNear(Q, decoys, hs[0], rng, taken), d3 = pickNear(Q, decoys, hs[1], rng, taken);
                if (d1 == null || d2 == null || d3 == null) continue;
                const f = finalize([key(hs), key([keep, d1]), key([d2, d3])], key(hs), rng);
                if (!f) continue;
                return { ...base, type: 'sim_pair', text: pairQuestionText(phrase, sc.id), opts: f.opts, ci: f.ci, loc: locs.find(l => l.s === hs[0]) || locs[0],
                    extra: { pair: { phrase, scope: sc.id, surahs: hs, occurrences: occ } } };
            }
            if (hs.length < NOTIN_MIN) continue;
            const two = shuffled(hs, rng).slice(0, 2);
            const dn = pickNear(Q, decoys, two[0], rng, new Set());
            if (dn == null) continue;
            const f = finalize([name(dn), ...two.map(name)], name(dn), rng);
            if (!f) continue;
            return { ...base, type: 'sim_notin', text: pairQuestionText(phrase, sc.id, hs.length), opts: f.opts, ci: f.ci, loc: locs.find(l => l.s === hs[0]) || locs[0],
                extra: { pair: { phrase, scope: sc.id, surahs: hs, count: hs.length, occurrences: occ } } };
        }
    }
    return null;
}

const PAIR_TEXTS = {
    juz30: { key: 'sim_q_pair_juz30', ar: '﴿{word}﴾ وردت في سورتين من سور جزء عمّ، ما هما؟' },
    last5: { key: 'sim_q_pair_last5', ar: '﴿{word}﴾ وردت في سورتين من سور الأجزاء الخمسة الأخيرة من القرآن، ما هما؟' }
};
const NOTIN_TEXTS = {
    juz30: (n) => ({ key: 'sim_q_notin_juz30_' + n, ar: '﴿{word}﴾ وردت في ' + COUNT_WORD[n] + ' سور من سور جزء عمّ. أيُّ السور الآتية لم ترد فيها؟' }),
    last5: (n) => ({ key: 'sim_q_notin_last5_' + n, ar: '﴿{word}﴾ وردت في ' + COUNT_WORD[n] + ' سور من سور الأجزاء الخمسة الأخيرة من القرآن. أيُّ السور الآتية لم ترد فيها؟' })
};
const fillTpl = (s, params) => { Object.keys(params || {}).forEach(k => { s = s.split('{' + k + '}').join(String(params[k])); }); return s; };
const pairTpl = (scope, count) => count ? NOTIN_TEXTS[scope](count) : PAIR_TEXTS[scope];
export function pairQuestionText(phrase, scope, count = 0) { return fillTpl(pairTpl(scope, count).ar, { word: phrase }); }
// نص السؤال بلغة الواجهة (نصه المخزَّن عربي دائماً): في Node أو قبل تسجيل المترجم يرجع العربي نفسه
export function localizedQuestionText(q) {
    const kind = q && (q.type || q.kind);
    if ((kind === 'sim_pair' || kind === 'sim_notin') && q.pair && q.pair.scope) {
        const tpl = pairTpl(q.pair.scope, kind === 'sim_notin' ? q.pair.count : 0);
        return tl(tpl.key, tpl.ar, { word: q.pair.phrase });
    }
    // [2026-10-22] «أكمل الآية» و«أيُّ الآيتين»: نصهما المخزَّن عربي، فيُعاد بناؤه بقوالب i18n عند العرض (كانا يظهران عربيين في واجهة الإنجليزية)
    if (q && q.occurrence && typeof q.text === 'string') {
        const name = () => nameL(q.occurrence.surahName);
        if (kind === 'sim_which') return tl('sim_q_which', 'أيُّ الآيتين الآتيتين وردت في سورة {name}؟', { name: name() });
        if (kind === 'sim_complete') {
            let m = q.text.match(/^في سورة .+?، جاء قوله تعالى: (﴿[^﴾]*﴾)\nثم جاءت بعدها الآية:\n(﴿[^﴾]*﴾)\nما الذي يُكمل الآية؟$/);
            if (m) return tl('sim_q_complete_prev', 'في سورة {name}، جاء قوله تعالى: {v1}\nثم جاءت بعدها الآية:\n{v2}\nما الذي يُكمل الآية؟', { name: name(), v1: m[1], v2: m[2] });
            m = q.text.match(/^افتتح الله تعالى سورة .+? بقوله:\n(﴿[^﴾]*﴾)\nما الذي يُكمل الآية؟$/);
            if (m) return tl('sim_q_complete_first', 'افتتح الله تعالى سورة {name} بقوله:\n{v1}\nما الذي يُكمل الآية؟', { name: name(), v1: m[1] });
        }
    }
    return q ? q.text : '';
}
// خيار داخلي: «أ|ب» (سورتان) يُعرض «أ و ب»، واسم سورة واحدة يُعرض «سورة أ»، بلغة الواجهة
export const pairNames = (opt) => String(opt).split(PAIR_SEP);
export function pairOptionLabel(opt) {
    const names = pairNames(opt);
    if (names.length === 1) return labelL(names[0]);
    return names.map(n => nameL(n)).join(tl('sim_pair_and', ' و '));
}

function buildCandidates(Q, group, locs, juz, rng, stats = null, allowMatch = true) {
    const cphrase = cleanPhrase(group.anchorPhrase);
    const surahs = [...new Set(locs.map(l => l.s))];
    const sameSurah = surahs.length === 1;
    const identical = new Set(locs.map(l => l.norm)).size < locs.length;
    const anchored = sameSurah && identical;
    const cand = [];
    const pc = pairCandidate(Q, group, locs, rng);
    if (pc) cand.push(pc);

    for (const l of locs) {
        // ---- أكمل الآية ----
        if (stats) { stats.locs++; stats.at[l.phraseAt] = (stats.at[l.phraseAt] || 0) + 1; }
        if (l.stem && identical) { if (stats) stats.identicalBlocked++; }
        else if (l.stem) {
            if (stats) stats.stemLocs++;
            const tails = locs.filter(x => x.stem).map(x => x.tail);
            const base = l.stemMid ? Q.tailsAfterPhrase(cphrase) : Q.tailsAfterStem(l.stem);
            const extra = shuffled(base.filter(t => norm(t) !== norm(l.tail)), rng);
            let text, shown, seq = null;
            if (l.prev) {
                text = `في سورة ${l.surahName}، جاء قوله تعالى: ` + verse(l.prev.text) + '\nثم جاءت بعدها الآية:\n' + verse(l.stem + ' ......') + '\nما الذي يُكمل الآية؟';
                shown = [tid(l.prev)]; seq = [l.prev.norm];
            } else {
                text = `افتتح الله تعالى سورة ${l.surahName} بقوله:\n` + verse(l.stem + ' ......') + '\nما الذي يُكمل الآية؟';
                shown = [];
            }
            const f = finalize([...tails, ...extra], l.tail, rng);
            if (!f) { if (stats) stats.fewOptions++; }
            else {
                // الجواب الصحيح وحده يُكمل المطلع في هذا السياق (بعد الآية المعروضة، أو أول السورة)
                const ns = norm(l.stem);
                const sd = Q.surahs.get(l.s);
                const baseV = seq ? Q.followersIn(l.s, seq) : new Set(sd.verses.get(1) ? [sd.verses.get(1).norm] : []);
                const valid = new Set([...baseV].filter(vn => vn.startsWith(ns + ' ')));
                const wrongValid = f.opts.some((o, i) => i !== f.ci && valid.has(norm(l.stem + ' ' + o)));
                if (valid.size === 1 && valid.has(l.norm) && !wrongValid) {
                    if (stats) stats.built++;
                    cand.push({ type: 'sim_complete', text, opts: f.opts, ci: f.ci, loc: l, shown: new Set(shown), answer: new Set([tid(l.v)]), key: 'end|' + l.vid, facts: new Set([fact(l.prev, l.v)]) });
                } else if (stats) stats.notUnique++;
            }
        }
    }


    // ---- أيّ الآيتين من سورة كذا؟ ----
    // آيتان متشابهتان من موضعين في سورتين مختلفتين، والمطلوب تحديد التي وردت في السورة المذكورة (تمييز الآية عن شبيهتها)
    for (const l of locs) {
        if (l.n === 1 || namesItsSurah(l)) continue; // الأولى معروفة بمطلعها، وذكر اسم السورة يكشف الجواب
        for (const w of locs) {
            if (w.s === l.s || w.norm === l.norm) continue;
            if (holdersOf(Q, w.text).has(l.s)) continue; // الآية الخاطئة يجب ألا ترد في سورة السؤال
            if (!holdersOf(Q, l.text).has(l.s)) continue;
            cand.push({ type: 'sim_which', text: `أيُّ الآيتين الآتيتين وردت في سورة ${l.surahName}؟`, opts: [l.text, w.text], ci: 0, loc: l,
                shown: new Set([tid(l.v), tid(w.v)]), answer: new Set(), key: 'which|' + l.vid + '|' + w.vid,
                facts: new Set(['which|' + [tid(l.v), tid(w.v)].sort().join('+')]) });
        }
    }

    // ---- توصيل الآيات بسورها (للواجب فقط) ----
    // آيات المجموعة المتشابهة من ثلاث سور فأكثر (حتى 5)، وتُوصَّل كل آية بسورتها. كل آية تردّ في سورتها وحدها بين السور المعروضة
    if (allowMatch) {
        let items = [];
        const seenS = new Set(), seenT = new Set();
        for (const l of shuffled(locs, rng)) { if (seenS.has(l.s) || seenT.has(l.norm) || namesItsSurah(l)) continue; seenS.add(l.s); seenT.add(l.norm); items.push(l); }
        for (let again = true; again;) {
            again = false;
            const S = new Set(items.map(i => i.s));
            const bad = items.find(i => { const h = holdersOf(Q, i.text); return !h.has(i.s) || [...S].some(x => x !== i.s && h.has(x)); });
            if (bad) { items = items.filter(i => i !== bad); again = true; }
        }
        items = items.slice(0, 5);
        if (items.length >= 3) {
            const disp = shortenOptions(items.map(i => i.text));
            const left = items.map((i, k) => ({ id: 'L' + k, text: disp[k] }));
            let right = items.map((i, k) => ({ id: 'R' + k, text: i.surahName }));
            for (let t = 0; t < 10; t++) { right = shuffled(right, rng); if (right.some((r, k) => r.id !== 'R' + k)) break; }
            cand.push({ type: 'sim_match', text: 'صِل كل آية بالسورة التي وردت فيها:', opts: [], ci: -1, loc: items[0],
                match: { left, right, pairs: items.map((i, k) => ({ left: 'L' + k, right: 'R' + k })) },
                shown: new Set(items.map(i => tid(i.v))), answer: new Set(), key: 'match|' + group.groupId,
                facts: new Set(items.map(i => 'map|' + tid(i.v))) });
        }
    }
    return cand;
}

// سؤالان مكرران: يسألان الحقيقة نفسها، أو جواب أحدهما ظاهر في نص الآخر
const isDup = (a, b) => a.key === b.key || a.text === b.text || setHas(a.facts, b.facts) || setHas(a.answer, b.shown) || setHas(b.answer, a.shown);

// أكبر مجموعة (حتى 4) من المرشّحات لا تكرار بينها؛ وعند التساوي: الأكثر تنوعاً في الأنواع ثم في المواضع
function chooseBest(cands, max = 4) {
    let best = [], bestScore = -1;
    const n = cands.length;
    const score = (arr) => arr.length * 100 + new Set(arr.map(c => c.type)).size * 10 + new Set(arr.map(c => c.loc.vid)).size;
    const dfs = (start, cur) => {
        const sc = score(cur);
        if (cur.length && sc > bestScore) { best = [...cur]; bestScore = sc; }
        if (cur.length >= max) return;
        for (let i = start; i < n; i++) {
            if (cur.some(x => isDup(x, cands[i]))) continue;
            cur.push(cands[i]); dfs(i + 1, cur); cur.pop();
        }
    };
    dfs(0, []);
    return best;
}

// ---------------- الواجهة العامة ----------------
// يعيد { questions, locations, notes, reason } — reason يوضّح سبب قلة الأسئلة عن 4 (للتقرير)
// عرض الخيارات الطويلة: أول ~12 كلمة ثم «…» بشرط ألا يتطابق خياران بعد القص (يُوسَّع القص إن تطابقا).
// العرض فقط: التحقق من الجواب وحدانيته يبقى على النص الكامل (options)، ويُرجع هذا مصفوفة موازية للعرض.
export const OPTION_WORDS = 12;
export function shortenOptions(opts, max = OPTION_WORDS) {
    const ws = opts.map(wordsOf);
    const longest = Math.max(...ws.map(w => w.length));
    for (let K = max; K <= longest; K++) {
        // لا قصّ لخيار لا يزيد إلا كلمة أو كلمتين على الحد (لا فائدة من «…» لحذف كلمة)
        const disp = ws.map(w => (w.length <= K + 2 ? w.join(' ') : w.slice(0, K).join(' ') + ' …'));
        if (new Set(disp.map(norm)).size === disp.length) return disp;
    }
    return opts.map(String);
}

// stats: كائن اختياري لتجميع قمع «أكمل الآية» (للتقارير فقط). midVerse: دعم عبارة وسط الآية (مفعّل افتراضياً بسقف 15 كلمة للمطلع)
export function newCompleteStats() { return { locs: 0, at: {}, identicalBlocked: 0, stemLocs: 0, fewOptions: 0, notUnique: 0, built: 0, groupsWithCand: 0, groupsChosen: 0, completeChosen: 0 }; }
export function generateGroupQuestions(Q, group, { rng = Math.random, posRef = { n: 0 }, midVerse = true, stats = null, match = true, types = null } = {}) {
    const notes = [];
    const { locs, phrase } = resolveLocations(Q, group, notes, midVerse);
    const res = { groupId: group.groupId, questions: [], locations: locs.length, notes, reason: '' };
    if (locs.length < 2) { res.reason = 'أقل من موضعين صالحين بعد مطابقة المصحف'; return res; }
    const juz = locs[0].v.juz;
    const cand = shuffled(buildCandidates(Q, group, locs, juz, rng, stats, match), rng).filter(c => !types || types.includes(c.type))
        .sort((a, b) => SIM_TYPES.indexOf(a.type) - SIM_TYPES.indexOf(b.type));
    const chosen = chooseBest(cand, 4);
    if (stats) { const nc = cand.filter(c => c.type === 'sim_complete').length; if (nc) stats.groupsWithCand++; const cc = chosen.filter(c => c.type === 'sim_complete').length; if (cc) stats.groupsChosen++; stats.completeChosen += cc; }
    for (const c of chosen) {
        if (c.type === 'sim_match') {
            const l = c.loc;
            res.questions.push({
                type: c.type, text: c.text, options: [], optionsDisplay: [], correctIndex: -1, correctAnswer: '', match: c.match, ref: l.ref,
                groupId: group.groupId, anchorPhrase: stripHizbMark(group.anchorPhrase), scope: group.scope, category: group.category,
                occurrence: { surahNumber: l.s, surahName: l.surahName, ayahNumber: l.n, fullText: l.text }, juz
            });
            continue;
        }
        const correct = c.opts[c.ci];
        const others = shuffled(c.opts.filter((_, i) => i !== c.ci), rng);
        const at = posRef.n % c.opts.length; posRef.n++;
        others.splice(at, 0, correct);
        const l = c.loc;
        // أسماء السور قصيرة دائماً؛ الخيارات القرآنية تُقصّ للعرض فقط
        const optionsDisplay = (c.type === 'sim_pair' || c.type === 'sim_notin') ? others.map(o => pairNames(o).join(' و ')) : shortenOptions(others);
        res.questions.push({
            type: c.type, text: c.text, options: others, optionsDisplay, correctIndex: at, correctAnswer: correct, ref: l.ref,
            groupId: group.groupId, anchorPhrase: stripHizbMark(group.anchorPhrase), scope: group.scope, category: group.category,
            occurrence: { surahNumber: l.s, surahName: l.surahName, ayahNumber: l.n, fullText: l.text },
            juz, ...(c.extra || {})
        });
    }
    if (res.questions.length < 4) {
        const types = new Set(cand.map(c => c.type));
        if (cand.length === 0) res.reason = 'لا مرشّحات: ' + (locs.some(l => l.next || l.prev) ? 'الجواب غير وحيد في السياق أو خيارات أقل من 3' : 'مواضع بلا آيات مجاورة');
        else res.reason = `المرشّحات ${cand.length} (${[...types].join('،')}) لكن الباقي يكرر حقيقة أو يكشف جواباً`;
    }
    return res;
}

export const SIM_TYPES = ['sim_pair', 'sim_notin', 'sim_complete', 'sim_which', 'sim_match'];
export const SIM_TYPE_LABELS = { sim_pair: 'في أي سورتين؟', sim_notin: 'أيُّ سورة لم ترد؟', sim_complete: 'أكمل الآية', sim_which: 'أيُّ الآيتين من السورة؟', sim_match: 'صِل الآية بسورتها', sim_next: 'ماذا بعدها؟', sim_prev: 'ما الآية التي قبلها؟' };

// ---------------- مصحف المنصة في المتصفح ----------------
// يُحمَّل مرة واحدة من IndexedDB عبر QuranEngine (نفس النص الذي تعرضه بقية الشاشات) ويُحفظ هنا
let _quran = null;
export function setSimilarityQuran(surahsArray) { _quran = surahsArray ? new QuranIndex(surahsArray) : null; return _quran; }
export function getSimilarityQuran() { return _quran; }
export async function ensureSimilarityQuran(quranEngine) {
    if (_quran) return _quran;
    const list = await Promise.all(Array.from({ length: 114 }, (_, i) => quranEngine.getSurah(i + 1)));
    if (list.some(s => !s || !s.ayahs)) throw new Error('QURAN_NOT_READY');
    return setSimilarityQuran(list);
}

// ---------------- عرض نص السؤال ----------------
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// نص السؤال → HTML: كل ما بين ﴿ ﴾ بخط المصحف، والأسطر بـ <br>. fix: دالة اختيارية تُطبَّق على الآيات (كالسكون القرآني)
export function questionTextToHTML(text, fix = (x) => x) {
    return escapeHtml(text).split('\n').map(line =>
        line.replace(/﴿([^﴾]*)﴾/g, (_, v) => `<span class="quran-text sim-q-verse">﴿ ${fix(v)} ﴾</span>`)
    ).join('<br>');
}
