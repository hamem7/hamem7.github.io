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
//  2) أربعة أنواع: sim_surah | sim_complete | sim_next | sim_prev
//  3) تطابق لفظ الآيتين في موضعين: يُعرض معهما السياق حتى يكون الجواب واحداً.
//  4) منع التكرار داخل المجموعة: لا سؤالان يسألان الحقيقة نفسها ولا يكشف أحدهما جواب الآخر.
//  5) كل الخيارات الخاطئة من نص القرآن نفسه، ويُتحقق آلياً أنها ليست جواباً صحيحاً في السياق المذكور.

// ---------------- تطبيع النص ----------------
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭـ]/g;
const BASMALA_SKEL = 'بسم الله الرحمن الرحيم';

// تطبيع للمقارنة بين نصين من المصحف نفسه (أو بحث نص داخل نص): بلا تشكيل ولا فروق ألف/ياء/تاء مربوطة
export function norm(s) {
    return String(s == null ? '' : s).replace(/﻿/g, '').replace(MARKS, '')
        .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
        .replace(/\s+/g, ' ').trim();
}

// هيكل صامت (بلا حروف المدّ ولا الهمزات): لمطابقة عبارة المجموعة (مكتوبة بإملاء مبسّط) بنص المصحف العثماني
// (مثال: «أتاك» بالإملاء المبسّط ↔ «أتىٰك» بالعثماني). يُستعمل لتحديد موضع العبارة فقط، لا للمقارنة بين آيات المصحف.
export function skel(s) {
    return norm(s).replace(/[ايوءئؤ]/g, '');
}

// ۞ (علامة بداية الحزب) ليست من نص الآية: تُحذف من كل ما يُعرض (العبارات والآيات والخيارات)
export const stripHizbMark = (s) => String(s == null ? '' : s).replace(/\u06DE\s*/g, '').replace(/\s+/g, ' ').trim();

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
const setHas = (a, b) => { for (const x of a) if (b.has(x)) return true; return false; };

// خيارات 3–4: تُزال التكرارات بعد التطبيع، ويُقتصر على الصحيح + 3 إن زادت. null إن قلّت عن 3
function finalize(opts, correct, rng) {
    const seen = new Set(), u = [];
    for (const o of opts) { const k = norm(o); if (!seen.has(k)) { seen.add(k); u.push(o); } }
    const nc = norm(correct);
    let ci = u.findIndex(o => norm(o) === nc);
    if (ci < 0) return null;
    let res = u;
    if (u.length > 4) {
        const others = shuffled(u.filter((_, i) => i !== ci), rng);
        res = [u[ci], ...others.slice(0, 3)]; ci = 0;
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

function resolveLocations(Q, group, notes, midVerse = false) {
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

function makeLoc(Q, v, phrase, midVerse = false) {
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
    // دعم اختياري (معطّل افتراضياً): العبارة في وسط الآية ← المطلع = كل ما قبلها مع العبارة، والمطلوب إكمال الباقي
    else if (midVerse && loc.phraseAt === 'mid') { [loc.stem, loc.tail] = cutWords(v.text, idx + k); loc.stemMid = true; }
    return loc;
}

// ---------------- بناء مرشّحات الأسئلة ----------------
const vidOf = (l, d = 0) => l.s + ':' + (l.n + d);
// هوية الآية للكشف عن التكرار: السورة + نصها (فالآية المتطابقة اللفظ في موضعين تُعدّ آية واحدة)
const tid = (v) => v.s + '|' + v.norm;
// «حقيقة» السؤال: الآية الفلانية تتبع الآية الفلانية (أو الموضع الفلاني في سورة كذا). سؤالان بحقيقة واحدة مكرران ولو اختلف نوعهما
const fact = (a, b) => (a ? tid(a) : 'START') + '>' + (b ? tid(b) : 'END');

function buildCandidates(Q, group, locs, juz, rng, stats = null) {
    const cphrase = cleanPhrase(group.anchorPhrase);
    const surahs = [...new Set(locs.map(l => l.s))];
    const sameSurah = surahs.length === 1;
    const identical = new Set(locs.map(l => l.norm)).size < locs.length;
    const anchored = sameSurah && identical;
    const cand = [];
    const juzSurahs = Q.juzSurahs(juz);

    for (const l of locs) {
        // ---- من أي سورة؟ (فقط حين تتعدد السور) ----
        if (!sameSurah) {
            let text, shown, seq;
            if (identical) {
                const useNext = !!l.next;
                const a = useNext ? l.v : l.prev, b = useNext ? l.next : l.v;
                if (!a || !b) continue;
                text = 'قال تعالى: ' + verse(a.text) + ' ثم تليها: ' + verse(b.text) + '\nفي أي سورة من سور الجزء وردت هاتان الآيتان؟';
                shown = [tid(a), tid(b)]; seq = [a.text, b.text];
            } else {
                text = 'في أي سورة من سور الجزء وردت هذه الآية؟\n' + verse(l.text);
                shown = [tid(l.v)]; seq = [l.text];
            }
            // السور التي تحوي الموضع المعروض فعلاً: يجب أن تكون سورة الجواب وحدها بين الخيارات
            const holders = seq.length === 2 ? Q.surahsContainingPair(seq[0], seq[1]) : Q.surahsContaining(seq[0]);
            const groupOpts = surahs.filter(s => s === l.s || !holders.has(s));
            const decoys = shuffled(juzSurahs.filter(s => !surahs.includes(s) && !holders.has(s)), rng)
                .slice(0, Math.max(0, 4 - groupOpts.length));
            const f = finalize([...groupOpts, ...decoys].map(s => Q.surahName(s)), Q.surahName(l.s), rng);
            if (f && holders.has(l.s)) {
                const optSurahs = f.opts.map(n => [...Q.surahs.values()].find(x => x.plainName === n).number);
                if (optSurahs.filter(s => holders.has(s)).length === 1) {
                    cand.push({ type: 'sim_surah', text, opts: f.opts, ci: f.ci, loc: l, shown: new Set(shown), answer: new Set(),
                        key: 'map|' + l.vid + '|' + (identical ? 'pair' : 'one'), facts: new Set(['map|' + shown.join('+')]) });
                }
            }
        }

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

    // ---- ماذا بعدها؟ ----
    const cn = locs.filter(l => l.next);
    for (const l of cn) {
        const pool = [...cn.map(x => x.next.text), ...locs.filter(x => x.prev).map(x => x.prev.text)];
        let text, shown, seq;
        if (anchored && l.prev) {
            text = `أنت تقرأ سورة ${l.surahName} وبلغت قوله تعالى:\n` + verse(l.prev.text) + ' ثم ' + verse(l.text) + '\nفما الآية التي تليها مباشرة؟';
            shown = [tid(l.v), tid(l.prev)]; seq = [l.prev.norm, l.norm];
        } else {
            text = `أنت تقرأ سورة ${l.surahName} وبلغت قوله تعالى:\n` + verse(l.text) + '\nفما الآية التي تليها مباشرة؟';
            shown = [tid(l.v)]; seq = [l.norm];
        }
        const f = finalize(pool.filter(t => !seq.includes(norm(t))), l.next.text, rng);
        if (!f) continue;
        const valid = Q.followersIn(l.s, seq);
        if (valid.size !== 1 || !valid.has(l.next.norm)) continue; // الجواب غير وحيد في السياق المعروض
        if (f.opts.some((o, i) => i !== f.ci && valid.has(norm(o)))) continue;
        cand.push({ type: 'sim_next', text, opts: f.opts, ci: f.ci, loc: l, shown: new Set(shown), answer: new Set([tid(l.next)]), key: 'adj|' + l.vid + '|' + vidOf(l, 1), facts: new Set([fact(l.v, l.next)]) });
    }

    // ---- ما الآية التي قبلها؟ ----
    const cp = locs.filter(l => l.prev);
    for (const l of cp) {
        const pool = [...cp.map(x => x.prev.text), ...locs.filter(x => x.next).map(x => x.next.text)];
        let text, shown, seq;
        if (anchored && l.next) {
            text = `في سورة ${l.surahName} جاءت الآيتان:\n` + verse(l.text) + ' ثم ' + verse(l.next.text) + '\nفما الآية التي تسبق الآية الأولى منهما مباشرة؟';
            shown = [tid(l.v), tid(l.next)]; seq = [l.norm, l.next.norm];
        } else {
            text = `في سورة ${l.surahName} جاءت الآية:\n` + verse(l.text) + '\nفما الآية التي تسبقها مباشرة؟';
            shown = [tid(l.v)]; seq = [l.norm];
        }
        const f = finalize(pool.filter(t => !seq.includes(norm(t))), l.prev.text, rng);
        if (!f) continue;
        const valid = Q.precedersIn(l.s, seq);
        if (valid.size !== 1 || !valid.has(l.prev.norm)) continue;
        if (f.opts.some((o, i) => i !== f.ci && valid.has(norm(o)))) continue;
        cand.push({ type: 'sim_prev', text, opts: f.opts, ci: f.ci, loc: l, shown: new Set(shown), answer: new Set([tid(l.prev)]), key: 'adj|' + vidOf(l, -1) + '|' + l.vid, facts: new Set([fact(l.prev, l.v)]) });
    }
    return cand;
}

// سؤالان مكرران: يسألان الحقيقة نفسها، أو جواب أحدهما ظاهر في نص الآخر
const isDup = (a, b) => a.key === b.key || setHas(a.facts, b.facts) || setHas(a.answer, b.shown) || setHas(b.answer, a.shown);

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

// stats: كائن اختياري لتجميع قمع «أكمل الآية» (للتقارير فقط). midVerse: دعم عبارة وسط الآية (معطّل افتراضياً)
export function newCompleteStats() { return { locs: 0, at: {}, identicalBlocked: 0, stemLocs: 0, fewOptions: 0, notUnique: 0, built: 0, groupsWithCand: 0, groupsChosen: 0, completeChosen: 0 }; }
export function generateGroupQuestions(Q, group, { rng = Math.random, posRef = { n: 0 }, midVerse = false, stats = null } = {}) {
    const notes = [];
    const { locs, phrase } = resolveLocations(Q, group, notes, midVerse);
    const res = { groupId: group.groupId, questions: [], locations: locs.length, notes, reason: '' };
    if (locs.length < 2) { res.reason = 'أقل من موضعين صالحين بعد مطابقة المصحف'; return res; }
    const juz = locs[0].v.juz;
    const cand = shuffled(buildCandidates(Q, group, locs, juz, rng, stats), rng)
        .sort((a, b) => ['sim_surah', 'sim_complete', 'sim_next', 'sim_prev'].indexOf(a.type) - ['sim_surah', 'sim_complete', 'sim_next', 'sim_prev'].indexOf(b.type));
    const chosen = chooseBest(cand, 4);
    if (stats) { const nc = cand.filter(c => c.type === 'sim_complete').length; if (nc) stats.groupsWithCand++; const cc = chosen.filter(c => c.type === 'sim_complete').length; if (cc) stats.groupsChosen++; stats.completeChosen += cc; }
    for (const c of chosen) {
        const correct = c.opts[c.ci];
        const others = shuffled(c.opts.filter((_, i) => i !== c.ci), rng);
        const at = posRef.n % c.opts.length; posRef.n++;
        others.splice(at, 0, correct);
        const l = c.loc;
        // السور قصيرة دائماً؛ الخيارات القرآنية تُقصّ للعرض فقط
        const optionsDisplay = c.type === 'sim_surah' ? [...others] : shortenOptions(others);
        res.questions.push({
            type: c.type, text: c.text, options: others, optionsDisplay, correctIndex: at, correctAnswer: correct, ref: l.ref,
            groupId: group.groupId, anchorPhrase: stripHizbMark(group.anchorPhrase), scope: group.scope, category: group.category,
            occurrence: { surahNumber: l.s, surahName: l.surahName, ayahNumber: l.n, fullText: l.text },
            juz
        });
    }
    if (res.questions.length < 4) {
        const types = new Set(cand.map(c => c.type));
        if (cand.length === 0) res.reason = 'لا مرشّحات: ' + (locs.some(l => l.next || l.prev) ? 'الجواب غير وحيد في السياق أو خيارات أقل من 3' : 'مواضع بلا آيات مجاورة');
        else res.reason = `المرشّحات ${cand.length} (${[...types].join('،')}) لكن الباقي يكرر حقيقة أو يكشف جواباً`;
    }
    return res;
}

export const SIM_TYPES = ['sim_surah', 'sim_complete', 'sim_next', 'sim_prev'];
export const SIM_TYPE_LABELS = { sim_surah: 'من أي سورة؟', sim_complete: 'أكمل الآية', sim_next: 'ماذا بعدها؟', sim_prev: 'ما الآية التي قبلها؟' };

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
