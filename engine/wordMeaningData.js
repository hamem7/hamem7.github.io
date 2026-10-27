// engine/wordMeaningData.js — معاني الكلمات: الاختصار، وتحميل الترجمة الإنجليزية، والبحث عنها.
// الملف العربي: database/data/wordMeanings.json  {سورة: [[رقم الآية، الكلمة، المعنى]]}
// الملف الإنجليزي: database/data/wordMeanings.en.json {سورة: [المعنى بالإنجليزية]} بنفس ترتيب الملف العربي تماماً
// (كل معنى ≤ 4 كلمات). المخزَّن في الواجبات والسجلات يبقى عربياً، والترجمة تُطبَّق وقت العرض فقط.

export const MAX_MEANING_WORDS = 5;
export const MAX_MEANING_WORDS_EN = 4;

// اختصار معنى الكلمة ليكون ≤ 5 كلمات (4–5 مثالية) فيقرأه الطالب بسهولة: نأخذ أول جملة/عبارة قبل
// أول فاصل (؛ : ، .) ثم نتحقق من العدد؛ لو بقي أطول يرجع null فتُتخطّى الكلمة (ويُختار غيرها). المعنى الكامل يبقى في الملف.
export function shortMeaning(text, max = MAX_MEANING_WORDS) {
    const t = String(text || '').trim();
    const cnt = (x) => x.split(/\s+/).filter(Boolean).length;
    if (cnt(t) <= max) return t.replace(/[.؛:،\s]+$/, '');
    const first = t.split(/[؛:،.]/).map(x => x.trim()).find(Boolean) || '';
    return first && cnt(first) <= max ? first : null;
}

let _enMap;          // undefined = لم يُحمَّل بعد، null = تعذّر، Map = جاهز (المعنى العربي المختصر ← الإنجليزي)
let _enPromise = null;

// يحمّل الملفين ويبني خريطة {المعنى العربي (المختصر أو الكامل) ← الإنجليزي}. آمن لو تعذّر التحميل أو اختلف الشكل.
export function loadWordMeaningsEn() {
    if (_enMap !== undefined) return Promise.resolve(_enMap);
    if (_enPromise) return _enPromise;
    _enPromise = (async () => {
        try {
            const [ra, re] = await Promise.all([
                fetch(new URL('../database/data/wordMeanings.json', import.meta.url)),
                fetch(new URL('../database/data/wordMeanings.en.json', import.meta.url))
            ]);
            if (!ra.ok || !re.ok) throw new Error('word meanings fetch');
            const ar = await ra.json(), en = await re.json();
            const map = new Map();
            for (const s of Object.keys(ar)) {
                const a = ar[s], e = en && en[s];
                if (!Array.isArray(a) || !Array.isArray(e) || a.length !== e.length) continue;
                a.forEach((row, i) => {
                    const txt = e[i];
                    if (typeof txt !== 'string' || !txt) return;
                    const full = String(row[2] || '').trim();
                    const short = shortMeaning(full);
                    if (short && !map.has(short)) map.set(short, txt);
                    if (full && !map.has(full)) map.set(full, txt);
                });
            }
            _enMap = map.size ? map : null;
        } catch (e) { _enMap = null; }
        return _enMap;
    })();
    return _enPromise;
}

// الإنجليزية الجاهزة لمعنى عربي (بعد loadWordMeaningsEn) أو null لو غير متاحة
export function meaningEn(arText) {
    if (!_enMap || typeof arText !== 'string') return null;
    return _enMap.get(arText.trim()) || null;
}

// يُبقي المشتتات التي لا تتطابق ترجمتها الإنجليزية مع الصحيحة ولا مع بعضها (حتى لا يظهر خياران متطابقان بالإنجليزية)
export function distinctInEnglish(correctAr, candidatesAr) {
    const seen = new Set();
    const key = (ar) => (meaningEn(ar) || ar).toLowerCase();
    seen.add(key(correctAr));
    const out = [];
    for (const c of candidatesAr) {
        const k = key(c);
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(c);
    }
    return out;
}
