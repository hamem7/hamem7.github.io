// engine/recallQuestions.js
//
// سؤالان لقياس «استحضار المتشابهات» في لعبة الكبار (منطق بحت بلا DOM ولا IndexedDB فيُختبر بـ Node):
//   sim_missing  «ما الكلمة الناقصة؟»  — آية من نطاق الاختبار وفيها كلمة ناقصة عند موضع افتراقها عن آية شبيهة؛ الخيارات:
//                كلمتها الصحيحة وكلمة الآية الشبيهة في سورة أخرى وكلمة ثالثة. تُصحَّح آلياً.
//   sim_named    «اقرأ الآية من السورة المذكورة» — تُذكر للطالب السور التي وردت فيها العبارة ويُطلب منه قراءة الآية في إحداها.
//                استحضار حر يقيّمه المعلم، وله مساعدات متدرجة: أول كلمة ← الآية التي قبلها ← ثلاث آيات للاختيار.
//
// الفكرة: التشابه يُستخرج من نص المصحف نفسه (لا من بيانات المتشابهات اليدوية) داخل «محفوظ الطالب كله» لا داخل نطاق الاختبار
// وحده؛ فآية من الأحقاف تُقارَن بشبيهاتها في أي سورة يحفظها الطالب. وكل أسئلتها وخياراتها من القرآن نفسه.
//
// لا رقم آية في نص السؤال ولا في الخيارات (الرقم يظهر في الجواب والمراجعة فقط).
import { norm, plainSurahName } from './similarityQuestions.js';
import { tl, nameL, sepL } from '../core/langBridge.js';

export const RECALL_TYPES = ['sim_missing', 'sim_named'];
const GRAM = 4;          // أقصر عبارة مشتركة (كلمات) لاعتبار آيتين متشابهتين
const VWIN = 5;          // صيغ متقاربة: نافذة من 5 كلمات تتفق آيتان في 4 منها وتختلفان في كلمة واحدة من الثلاث الوسطى («بما كانوا يعملون» / «بما كنتم تعملون»)
const MAX_LOCS = 7;      // أكثر من هذا = صيغة عامة («على كل شيء قدير») لا يُخلط فيها شيء بشيء
const NAMED_MAX = 5;     // «اقرأ الآية من السورة المذكورة»: 2–5 سور
const MAX_STEM_WORDS = 15;

const wordsOf = (s) => String(s).split(/\s+/).filter(Boolean);
function shuffled(arr, rng) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
}

// ---------------- نطاق الحفظ ----------------
// الحفظ في المنصة يبدأ من الناس صعوداً: memoFrom (الأكبر رقماً) ← memoTo (آخر سورة وصل إليها). الفاتحة لا تدخل أي نطاق.
// surahsData: مصفوفة [{ number, name }] بأسماء السور العربية كما في ملف الطالب. يرجع Set أرقام السور، أو null لو لا نطاق صالح.
export function memorizedSurahsOf(student, surahsData) {
    const byName = (n) => (surahsData || []).find(s => s.name === n);
    const from = byName(student && student.memoFrom), to = byName(student && student.memoTo);
    if (!from || !to || from.number < to.number) return null;
    const out = new Set();
    for (let n = to.number; n <= from.number; n++) if (n !== 1) out.add(n);
    return out;
}

// ---------------- بنك المقارنة (يُبنى مرة لكل نطاق حفظ) ----------------
const bankCache = new WeakMap();
function allVerses(Q) {
    if (!Q._rcAll) {
        Q._rcAll = Q.flat.map(v => {
            const w = [], x = [];
            for (const tok of wordsOf(v.text)) { const k = norm(tok); if (k) { w.push(tok); x.push(k); } }   // علامات الوقف المستقلة ليست كلمات
            return { s: v.s, n: v.n, w, x, key: x.join(' ') };
        });
        Q._rcByKey = new Map(Q._rcAll.map(v => [v.s + ':' + v.n, v]));
    }
    return Q._rcAll;
}
export const verseAt = (Q, s, n) => { allVerses(Q); return Q._rcByKey.get(s + ':' + n) || null; };

const findRun = (x, run, from = 0) => {
    for (let i = from; i + run.length <= x.length; i++) {
        let ok = true;
        for (let j = 0; j < run.length; j++) if (x[i + j] !== run[j]) { ok = false; break; }
        if (ok) return i;
    }
    return -1;
};

function bankFor(Q, memorized) {
    const key = [...memorized].sort((a, b) => a - b).join(',');
    let perQ = bankCache.get(Q);
    if (!perQ) { perQ = new Map(); bankCache.set(Q, perQ); }
    if (perQ.has(key)) return perQ.get(key);
    const M = allVerses(Q).filter(v => memorized.has(v.s) && v.s !== 1), idx = new Map();
    for (const v of M) for (let i = 0; i + GRAM <= v.x.length; i++) {
        const g = v.x.slice(i, i + GRAM).join(' ');
        let a = idx.get(g); if (!a) { a = new Set(); idx.set(g, a); } a.add(v);
    }
    const vidx = new Map();   // مفتاح نافذة بنجمة مكان كلمة وسطى ← الآيات التي تطابقها (النافذة، ومكان النجمة)
    for (const v of M) for (let i = 0; i + VWIN <= v.x.length; i++) for (let m = 1; m <= VWIN - 2; m++) {
        const k = v.x.slice(i, i + VWIN).map((w, q) => (q === m ? '*' : w)).join(' ');
        let a = vidx.get(k); if (!a) { a = []; vidx.set(k, a); } a.push({ v, p: i, m });
    }
    const bank = { M, idx, vidx, surahs: [...new Set(M.map(v => v.s))] };
    perQ.set(key, bank);
    return bank;
}

// ---------------- مجموعات المتشابهات: آية من النطاق + كل مواضع عبارتها المشتركة في المحفوظ ----------------
function buildGroups(bank, scopeKeys) {
    const seen = new Set(), out = [];
    for (const v of bank.M) {
        if (!scopeKeys.has(v.s + ':' + v.n)) continue;
        let best = null;
        for (let i = 0; i + GRAM <= v.x.length; i++) {
            const set = bank.idx.get(v.x.slice(i, i + GRAM).join(' '));
            if (!set || set.size < 2 || set.size > MAX_LOCS) continue;
            const gram = v.x.slice(i, i + GRAM), locs = [...set].map(l => ({ v: l, p: findRun(l.x, gram) }));
            let a = i, b = i + GRAM;
            while (b < v.x.length && locs.every(l => l.p + (b - i) < l.v.x.length && l.v.x[l.p + (b - i)] === v.x[b])) b++;
            while (a > 0 && locs.every(l => l.p - (i - a) - 1 >= 0 && l.v.x[l.p - (i - a) - 1] === v.x[a - 1])) a--;
            const k = b - a, L = locs.map(l => ({ v: l.v, p: l.p - (i - a), k }));
            const letters = v.x.slice(a, b).join('').replace(/[اويءئؤ]/g, '').length;
            if (letters < 8) continue;                                   // عبارة ضعيفة
            const nS = new Set(L.map(l => l.v.s)).size, score = nS * 20 + Math.min(k, 8) + Math.min(letters, 20) / 10;
            if (!best || score > best.score) best = { score, k, L, nS, x: v.x.slice(a, b), text: v.w.slice(a, b).join(' ') };
        }
        if (!best) continue;
        const id = best.L.map(l => l.v.s + ':' + l.v.n).sort().join('|');
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({ id, phrase: best.text, x: best.x, k: best.k, locs: best.L, anchor: best.L.find(l => l.v === v), nS: best.nS });
    }
    return out;
}

// مجموعات الصيغ المتقاربة: آية من النطاق تشارك آيات أخرى نافذة من 5 كلمات تختلف في كلمة وسطى واحدة (على الأقل كلمتان مختلفتان بين المواضع).
function buildVariantGroups(bank, scopeKeys) {
    const seen = new Set(), out = [];
    for (const v of bank.M) {
        if (!scopeKeys.has(v.s + ':' + v.n)) continue;
        let best = null;
        for (let i = 0; i + VWIN <= v.x.length; i++) for (let m = 1; m <= VWIN - 2; m++) {
            const k = v.x.slice(i, i + VWIN).map((w, q) => (q === m ? '*' : w)).join(' ');
            const hits = bank.vidx.get(k);
            if (!hits || hits.length < 2 || hits.length > MAX_LOCS) continue;
            if (new Set(hits.map(h => h.v.x[h.p + m])).size < 2) continue;      // كلها الكلمة نفسها = مجموعة متطابقة (تغطيها المجموعات العادية)
            const shared = v.x.slice(i, i + VWIN).filter((_, q) => q !== m).join('').replace(/[اويءئؤ]/g, '').length;
            if (shared < 8) continue;                                              // عبارة ضعيفة
            const nS = new Set(hits.map(h => h.v.s)).size, score = nS * 20 + shared / 10;
            if (!best || score > best.score) best = { score, m, i, hits, nS, k };
        }
        if (!best) continue;
        const id = 'v|' + best.hits.map(h => h.v.s + ':' + h.v.n).sort().join('|');
        if (seen.has(id)) continue;
        seen.add(id);
        const locs = best.hits.map(h => ({ v: h.v, p: h.p, k: VWIN, m: h.m }));
        const text = v.w.slice(best.i, best.i + VWIN).map((w, q) => (q === best.m ? '…' : w)).join(' ');
        out.push({ id, variant: true, key: best.k, phrase: text, x: v.x.slice(best.i, best.i + VWIN), k: VWIN, locs, anchor: locs.find(l => l.v === v), nS: best.nS });
    }
    return out;
}

function tailsAfterRun(bank, run) {
    const out = [];
    for (const v of bank.M) { const p = findRun(v.x, run); if (p >= 0 && p + run.length < v.w.length) out.push({ v, i: p + run.length }); }
    return out;
}

const verseRec = (Q, l, mark) => ({ surahNumber: l.v.s, surahName: Q.surahName(l.v.s), ayahNumber: l.v.n, words: l.v.w.slice(), mark });
const occurrenceOf = (Q, l) => ({ surahNumber: l.v.s, surahName: Q.surahName(l.v.s), ayahNumber: l.v.n, fullText: l.v.w.join(' ') });
const baseOf = (Q, g, type) => {
    const a = g.anchor;
    return { kind: type, groupId: 'recall-' + g.id, anchorPhrase: g.phrase, scope: 'recall', category: 'recall',
        ref: `سورة ${Q.surahName(a.v.s)}، الآية ${a.v.n}`, occurrence: occurrenceOf(Q, a), juz: null };
};

// ---------------- «ما الكلمة الناقصة؟» ----------------
// الكلمة الناقصة = أول كلمة بعد العبارة المشتركة (موضع الافتراق بين الآيات)، وإن كانت العبارة في آخر الآية فالكلمة التي قبلها.
// يُعرض من الآية ما قبل الكلمة الناقصة فقط (أو ما بعدها في الحالة الثانية) حتى لا يُستدل على الجواب من الباقي.
function mkMissingVariant(Q, bank, g, rng) {
    // الكلمة الناقصة هنا وسط عبارة مشتركة: تختلف بين المواضع («بما كانوا يعملون» / «بما كنتم تعملون»). تُعرض الآية كلها والفراغ مكانها.
    const a = g.anchor, i = a.p + a.m, cw = a.v.x[i];
    let cnt = 0;                                   // ألا توجد في سورة الآية آية أخرى بالنافذة نفسها فيلتبس الفراغ
    for (const h of bank.vidx.get(g.key) || []) if (h.v.s === a.v.s) cnt++;
    if (cnt !== 1) return null;
    const by = new Map();
    for (const l of g.locs) { const w = l.v.x[l.p + l.m]; if (w !== cw && !by.has(w)) by.set(w, { l, w, ww: l.v.w[l.p + l.m] }); }
    const others = [...by.values()];
    if (!others.length) return null;
    const crossFirst = shuffled(others, rng).sort((x, y) => (y.l.v.s !== a.v.s) - (x.l.v.s !== a.v.s));
    const twin = crossFirst[0];
    if (twin.l.v.s === a.v.s) return null;       // الشبيهة من سورة أخرى (لعلّ الخلط بين السور هو المقصود)
    const pool = crossFirst.slice(1).map(o => ({ w: o.ww, k: o.w }));
    if (pool.length < 1 && i >= 1) { const L = a.v.x.slice(i - 1, i); for (const v of bank.M) { if (v === a.v) continue; const p = findRun(v.x, L); if (p >= 0 && p + 1 < v.x.length) pool.push({ w: v.w[p + 1], k: v.x[p + 1] }); } }
    const seen = new Set([cw, twin.w]), d = [];
    for (const p of shuffled(pool, rng)) if (!seen.has(p.k)) { seen.add(p.k); d.push(p); }
    if (!d.length) return null;
    const opts = shuffled([{ w: a.v.w[i], ok: true }, { w: twin.ww }, { w: d[0].w }], rng);
    const blank = '......', words = a.v.w.map((x, q) => (q === i ? blank : x));
    const from = a.v.w.length > 24 ? Math.max(0, i - 8) : 0, to = a.v.w.length > 24 ? Math.min(a.v.w.length, i + 9) : a.v.w.length;
    const stemLine = (from > 0 ? '… ' : '') + words.slice(from, to).join(' ') + (to < a.v.w.length ? ' …' : '');
    const name = Q.surahName(a.v.s);
    const bj = twin.l.p + twin.l.m;
    return { ...baseOf(Q, g, 'sim_missing'), anchorPhrase: g.phrase,
        text: `في سورة ${name} جاءت الآية الآتية وفيها كلمة ناقصة. ما الكلمة الناقصة؟\n﴿${stemLine}﴾`,
        tpl: { key: 'sim_q_missing', params: { name } }, stemLine,
        options: opts.map(o => o.w), optionsDisplay: opts.map(o => o.w), correctAnswer: a.v.w[i], correctIndex: opts.findIndex(o => o.ok),
        reveal: { a: verseRec(Q, a, [i]), b: verseRec(Q, twin.l, [bj]) } };
}
function mkMissing(Q, bank, g, rng) {
    if (g.variant) return mkMissingVariant(Q, bank, g, rng);
    const a = g.anchor, right = a.p + a.k < a.v.x.length, i = right ? a.p + a.k : a.p - 1;
    if (i < 0 || i > MAX_STEM_WORDS) return null;
    const cw = a.v.x[i], pool = [], at = (l) => (right ? l.p + l.k : l.p - 1);
    let b = null, j = -1;
    for (const l of shuffled(g.locs.filter(l => l.v.s !== a.v.s), rng)) {
        const jj = at(l);
        if (jj < 0 || jj >= l.v.x.length || l.v.x[jj] === cw) continue;
        if (!b) { b = l; j = jj; } else pool.push({ w: l.v.w[jj], k: l.v.x[jj] });
    }
    if (!b) return null;
    const twin = { w: b.v.w[j], k: b.v.x[j] };
    // المقطع المعروض يجب أن يعرّف الآية وحدها داخل سورتها
    let cnt = 0;
    for (const v of bank.M) {
        if (v.s !== a.v.s) continue;
        if (right) { if (a.v.x.slice(0, i).every((x, q) => v.x[q] === x)) cnt++; }
        else { const r = a.v.x.slice(i + 1); if (v.x.length >= r.length && r.every((x, q) => v.x[v.x.length - r.length + q] === x)) cnt++; }
    }
    if (cnt !== 1) return null;
    if (right && i >= 2) for (const r of tailsAfterRun(bank, a.v.x.slice(i - 2, i))) if (r.v !== a.v) pool.push({ w: r.v.w[r.i], k: r.v.x[r.i] });
    if (!right) { const R = a.v.x.slice(i + 1, i + 3); if (R.length === 2) for (const v of bank.M) { if (v === a.v) continue; const p = findRun(v.x, R); if (p >= 1) pool.push({ w: v.w[p - 1], k: v.x[p - 1] }); } }
    const seen = new Set([cw, twin.k]), d = [];
    for (const p of shuffled(pool, rng)) if (!seen.has(p.k)) { seen.add(p.k); d.push(p); }
    if (!d.length) return null;
    const opts = shuffled([{ w: a.v.w[i], ok: true }, { w: twin.w }, { w: d[0].w }], rng);
    const blank = '......';
    const stemLine = right ? a.v.w.slice(0, i).join(' ') + ' ' + blank : blank + ' ' + a.v.w.slice(i + 1).join(' ');
    const name = Q.surahName(a.v.s);
    return { ...baseOf(Q, g, 'sim_missing'),
        text: `في سورة ${name} جاءت الآية الآتية وفيها كلمة ناقصة. ما الكلمة الناقصة؟\n﴿${stemLine}﴾`,
        tpl: { key: 'sim_q_missing', params: { name } }, stemLine,
        options: opts.map(o => o.w), optionsDisplay: opts.map(o => o.w), correctAnswer: a.v.w[i], correctIndex: opts.findIndex(o => o.ok),
        reveal: { a: verseRec(Q, a, [i]), b: verseRec(Q, b, [j]) } };
}

// ---------------- «اقرأ الآية من السورة المذكورة» ----------------
function mkNamed(Q, bank, g, rng) {
    if (g.variant) return null;               // العبارة هنا بكلمة متغيّرة فلا يصلح عرضها كعبارة واحدة
    const by = new Map();
    for (const l of g.locs) if (!by.has(l.v.s)) by.set(l.v.s, l);
    const locs = [...by.values()].sort((x, y) => x.v.s - y.v.s);
    if (locs.length < 2 || locs.length > NAMED_MAX) return null;
    const tg = shuffled(locs, rng)[0];
    const prev = tg.v.n > 1 ? verseAt(Q, tg.v.s, tg.v.n - 1) : null;
    const hints = [{ k: 'first', word: tg.v.w[0] }];
    if (prev) hints.push({ k: 'prev', surahName: Q.surahName(prev.s), ayahNumber: prev.n, text: prev.w.join(' ') });
    const pool = g.locs.filter(l => l.v.s !== tg.v.s).map(l => l.v);
    for (const r of tailsAfterRun(bank, tg.v.x.slice(tg.p, tg.p + 3))) pool.push(r.v);
    const seen = new Set([tg.v.key]), d = [];
    for (const v of shuffled(pool, rng)) if (v.s !== tg.v.s && !seen.has(v.key)) { seen.add(v.key); d.push(v); }
    if (d.length >= 2) hints.push({ k: 'opts', verses: shuffled([tg.v, ...d.slice(0, 2)], rng).map(v => v.w.join(' ')) });
    const names = locs.map(l => Q.surahName(l.v.s)), name = Q.surahName(tg.v.s);
    const two = locs.length === 2;
    const text = two
        ? `الآية ﴿${g.phrase}﴾ وردت في سورتين من محفوظك، هما: ${names.join('، ')}. اقرأ من حفظك الآية الواردة في سورة ${name}.`
        : `الآية ﴿${g.phrase}﴾ وردت في ${locs.length} سور من محفوظك، هي: ${names.join('، ')}. اقرأ من حفظك الآية الواردة في سورة ${name}.`;
    return { ...baseOf(Q, g, 'sim_named'), text,
        tpl: { key: two ? 'sim_q_named_2' : 'sim_q_named_n', params: { word: g.phrase, n: locs.length, names: names.join('، '), name } },
        options: [], optionsDisplay: [], correctAnswer: tg.v.w.join(' '), correctIndex: -1, hints,
        reveal: { target: verseRec(Q, tg, [tg.p, tg.p + tg.k]), others: locs.filter(l => l !== tg).map(l => verseRec(Q, l, [l.p, l.p + l.k])) } };
}

const BUILDERS = { sim_missing: mkMissing, sim_named: mkNamed };

// ---------------- نص السؤال بلغة الواجهة ----------------
// النص المخزَّن عربي دائماً (يُترجم عند العرض فقط)؛ في Node أو قبل تسجيل المترجم يرجع العربي نفسه. القوالب في core/i18n.js بالمفاتيح نفسها.
const TPL_AR = {
    sim_q_missing: 'في سورة {name} جاءت الآية الآتية وفيها كلمة ناقصة. ما الكلمة الناقصة؟',
    sim_q_named_2: 'الآية ﴿{word}﴾ وردت في سورتين من محفوظك، هما: {names}. اقرأ من حفظك الآية الواردة في سورة {name}.',
    sim_q_named_n: 'الآية ﴿{word}﴾ وردت في {n} سور من محفوظك، هي: {names}. اقرأ من حفظك الآية الواردة في سورة {name}.'
};
export function localizedRecallText(q) {
    if (!q || !q.tpl || !TPL_AR[q.tpl.key]) return q ? q.text : '';
    const p = { ...q.tpl.params };
    if (p.name) p.name = nameL(p.name);
    if (p.names) p.names = String(p.names).split('، ').map(nameL).join(sepL());
    const first = tl(q.tpl.key, TPL_AR[q.tpl.key], p);
    return q.stemLine ? first + '\n﴿' + q.stemLine + '﴾' : first;
}

// ---------------- الواجهة العامة ----------------
// Q: QuranIndex (راجع similarityQuestions.js) · memorized: Set أرقام السور المحفوظة · scopePool: آيات نطاق الاختبار
// (surahNumber/numberInSurah) · يرجع حتى `count` سؤالاً، كل واحد من عبارة مختلفة، بالتناوب بين النوعين (الأول: sim_missing).
export function generateRecallQuestions(Q, memorized, scopePool, { count = 1, rng = Math.random, types = RECALL_TYPES } = {}) {
    if (!Q || !memorized || !memorized.size || !count) return [];
    const scopeKeys = new Set((scopePool || []).map(a => a.surahNumber + ':' + a.numberInSurah));
    const all = new Set(memorized);
    for (const k of scopeKeys) all.add(+k.split(':')[0]);                  // آيات الاختبار تُقارَن دائماً بشبيهاتها ولو خرجت عن النطاق المسجَّل
    const bank = bankFor(Q, all);
    const groups = shuffled([...buildGroups(bank, scopeKeys), ...buildVariantGroups(bank, scopeKeys)], rng);
    groups.sort((x, y) => (y.nS > 1) - (x.nS > 1));                          // العابرة للسور أولاً (ثبات الترتيب العشوائي داخل كل فئة)
    const out = [], usedAnchor = new Set();      // سؤال واحد لكل آية مرجعية
    let turn = 0;
    for (const g of groups) {
        if (out.length >= count) break;
        const ak = g.anchor.v.s + ':' + g.anchor.v.n;
        if (usedAnchor.has(ak)) continue;
        for (let j = 0; j < types.length; j++) {
            const q = BUILDERS[types[(turn + j) % types.length]](Q, bank, g, rng);
            if (q) { out.push(q); usedAnchor.add(ak); turn = (turn + j + 1) % types.length; break; }
        }
    }
    return out;
}

// أسماء السور بلا «سورة» — للاختبارات
export { plainSurahName };
