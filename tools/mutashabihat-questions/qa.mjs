// فحوص جودة أسئلة المتشابهات على القرآن كله — تنفيذ مستقل عن المولّد (لا يستورد منه إلا دالة التوليد نفسها)
// ولا يستعمل QuranIndex في الفحص: يقرأ ملف المصحف الخام ويطبّع بطريقته الخاصة.
import { loadQuranSurahs, loadQuran, loadGroups } from './load.mjs';
import { generateGroupQuestions, mulberry32, SIM_TYPES } from '../../engine/similarityQuestions.js';

// تطبيع مستقل: حروف عربية أساسية فقط، مع توحيد الألف والياء والتاء المربوطة
const letters = (s) => String(s).replace(/[أإآٱ]/g, 'ا').replace(/ٰ/g, '')
    .replace(/[ىی]/g, 'ي').replace(/ة/g, 'ه').replace(/[^ء-غف-يا ]/g, '')
    .replace(/\s+/g, ' ').trim();
const BASMALA = 'بسم الله الرحمن الرحيم';

export function buildRaw() {
    const surahs = loadQuranSurahs();
    const bySurah = new Map(), nameToNum = new Map(), allText = new Set();
    for (const s of surahs) {
        const arr = [];
        for (const a of s.ayahs) {
            let t = a.text.replace(/\uFEFF/g, '').replace(/[\u06DE\u06E9]\s*/g, '').trim(); // ۞ تُحذف من العرض
            if (a.numberInSurah === 1 && s.number !== 1 && s.number !== 9) {
                const w = t.split(/\s+/);
                if (letters(w.slice(0, 4).join(' ')) === BASMALA) t = w.slice(4).join(' ');
            }
            arr.push({ n: a.numberInSurah, text: t, l: letters(t) });
            allText.add(t);
        }
        bySurah.set(s.number, arr);
        nameToNum.set(letters(s.name).replace(/^سوره /, ''), s.number);
    }
    const prefixes = new Set(), suffixes = new Set(), full = new Set();
    for (const t of allText) {
        const w = t.split(/\s+/);
        for (let i = 1; i <= w.length; i++) { prefixes.add(w.slice(0, i).join(' ')); suffixes.add(letters(w.slice(w.length - i).join(' '))); }
        full.add(letters(t));
    }
    const names = [...nameToNum.keys()].sort((a, b) => b.length - a.length);
    return { bySurah, nameToNum, allText, surahs, prefixes, suffixes, full, names };
}

// آية مقتطعة للعرض: «… نهايتها» (tail) أو «بدايتها …» (head). يُرجع { core, mode } أو null للآية الكاملة
const clip = (p) => p.startsWith('… ') ? { core: p.slice(2), mode: 'tail' } : (p.endsWith(' …') && !/ \.{6}$/.test(p) ? { core: p.slice(0, -2), mode: 'head' } : null);
const matchShown = (v, s, c) => !c ? v.l === s : (c.mode === 'tail' ? (v.l === s || v.l.endsWith(' ' + s)) : (v.l === s || v.l.startsWith(s + ' ')));
const pieces = (text) => [...text.matchAll(/﴿([^﴾]*)﴾/g)].map(m => m[1]);

// «أيُّ الآيتين من سورة كذا؟»: الصحيحة ترد في السورة المذكورة، والخاطئة لا ترد فيها (بحث مستقل في المصحف الخام)
function checkWhich(q, R) {
    const errs = [], fail = (m) => errs.push(m);
    if (/[0-9٠-٩۰-۹]/.test([q.text, ...q.options].join('\n'))) fail('رقم داخل السؤال أو الخيارات');
    if (q.options.length !== 2) fail('عدد الخيارات ' + q.options.length);
    if (q.options[q.correctIndex] !== q.correctAnswer) fail('correctIndex لا يطابق correctAnswer');
    q.options.forEach(o => { if (!R.allText.has(o)) fail('خيار ليس آية حرفية: ' + o); });
    const sn = R.nameToNum.get(letters(((q.text.match(/سورة ([^؟\n]*)/) || [])[1] || '')));
    const arr = R.bySurah.get(sn);
    if (!arr) return [...errs, 'اسم السورة غير معروف'];
    const inS = (o) => arr.some(v => v.l.includes(letters(o)));
    q.options.forEach((o, i) => { if (inS(o) !== (i === q.correctIndex)) fail(i === q.correctIndex ? 'الصحيحة ليست في السورة' : 'الخاطئة ترد في السورة'); });
    if (new Set(q.options.map(letters)).size !== 2) fail('خياران متطابقان');
    if (new Set(q.optionsDisplay.map(letters)).size !== 2) fail('خياران متطابقان بعد القص');
    return errs;
}
// «صِل الآية بسورتها»: كل آية ترد في سورتها المقصودة وحدها بين السور المعروضة
function checkMatch(q, R) {
    const errs = [], fail = (m) => errs.push(m), m = q.match;
    if (!m || m.left.length < 3 || m.left.length > 5 || m.right.length !== m.left.length) return ['شكل التوصيل غير صالح'];
    if (/[0-9٠-٩۰-۹]/.test(m.left.map(x => x.text).join('\n'))) fail('رقم داخل الآيات');
    const nums = m.pairs.map(p => R.nameToNum.get(letters(m.right.find(r => r.id === p.right).text)));
    if (nums.some(n => n == null) || new Set(nums).size !== nums.length) fail('سور غير معروفة أو مكررة');
    if (new Set(m.left.map(x => letters(x.text))).size !== m.left.length) fail('آيات متطابقة بعد القص');
    if (m.right.every((r, k) => r.id === 'R' + k)) fail('عمود السور بنفس ترتيب الآيات');
    m.pairs.forEach((p, k) => {
        const txt = m.left.find(x => x.id === p.left).text.replace(/ …$/, ''), l = letters(txt);
        nums.forEach((n, j) => {
            const has = R.bySurah.get(n).some(v => v.l === l || v.l.startsWith(l + ' '));
            if (j === k && !has) fail('الآية ليست في سورتها'); if (j !== k && has) fail('الآية ترد في سورة أخرى معروضة');
        });
    });
    return errs;
}

// «في أي سورتين؟»: العبارة ترد (ككلمات كاملة داخل آية) في السورتين الصحيحتين وحدهما ضمن نطاق السؤال، والخياران الآخران خاطئان
function checkPair(q, R) {
    const errs = [], fail = (m) => errs.push(m);
    if (/[0-9٠-٩۰-۹]/.test([q.text, ...q.options].join('\n'))) fail('رقم داخل السؤال أو الخيارات');
    if (q.options.length !== 3) fail('عدد الخيارات ' + q.options.length);
    if (q.options[q.correctIndex] !== q.correctAnswer) fail('correctIndex لا يطابق correctAnswer');
    const phrase = pieces(q.text)[0];
    if (!phrase || pieces(q.text).length !== 1) return [...errs, 'العبارة غير موجودة أو متعددة'];
    const scopeJuz30 = /من سور جزء عمّ/.test(q.text);
    if (!scopeJuz30 && !/الأجزاء الخمسة الأخيرة/.test(q.text)) fail('نطاق غير معروف');
    const pl = ' ' + letters(phrase) + ' ';
    const range = scopeJuz30 ? [78, 114] : [46, 114];
    const holders = new Set();
    for (const [num, arr] of R.bySurah) if (num >= range[0] && num <= range[1] && arr.some(v => (' ' + v.l + ' ').includes(pl))) holders.add(num);
    const optNums = q.options.map(o => o.split('|').map(n => R.nameToNum.get(letters(n))));
    if (optNums.some(p => p.length !== 2 || p.some(n => n == null || n < range[0] || n > range[1]) || p[0] === p[1])) fail('خيار ليس سورتين صالحتين ضمن النطاق');
    if (holders.size !== 2) fail('عدد السور التي ترد فيها العبارة ' + holders.size);
    const same = (p) => p.length === 2 && p.every(n => holders.has(n));
    const rightIdx = optNums.map((p, i) => same(p) ? i : -1).filter(i => i >= 0);
    if (rightIdx.length !== 1 || rightIdx[0] !== q.correctIndex) fail('الخيار الصحيح المحسوب ≠ المعلَّم صحيحاً');
    if (!optNums.some(p => !p.some(n => holders.has(n)))) fail('لا خيار بسورتين خاطئتين');
    if (!optNums.some(p => p.filter(n => holders.has(n)).length === 1)) fail('لا خيار بسورة صحيحة وأخرى خاطئة');
    if (![...R.allText].some(t => letters(t).includes(letters(phrase)))) fail('العبارة ليست من المصحف');
    return errs;
}

// «أيُّ سورة لم ترد؟»: العبارة ترد في العدد المذكور (ثلاث/أربع/خمس) من سور النطاق، وخيار واحد فقط سورة لا ترد فيها والباقي ترد فيها
function checkNotin(q, R) {
    const errs = [], fail = (m) => errs.push(m);
    if (/[0-9٠-٩۰-۹]/.test([q.text, ...q.options].join('\n'))) fail('رقم داخل السؤال أو الخيارات');
    if (q.options.length !== 3) fail('عدد الخيارات ' + q.options.length);
    if (q.options[q.correctIndex] !== q.correctAnswer) fail('correctIndex لا يطابق correctAnswer');
    const phrase = pieces(q.text)[0];
    if (!phrase || pieces(q.text).length !== 1) return [...errs, 'العبارة غير موجودة أو متعددة'];
    const scopeJuz30 = /من سور جزء عمّ/.test(q.text);
    if (!scopeJuz30 && !/الأجزاء الخمسة الأخيرة/.test(q.text)) fail('نطاق غير معروف');
    const cnt = { 'ثلاث': 3, 'أربع': 4, 'خمس': 5 }[(q.text.match(/وردت في (\S+) سور/) || [])[1]];
    const pl = ' ' + letters(phrase) + ' ';
    const range = scopeJuz30 ? [78, 114] : [46, 114];
    const holders = new Set();
    for (const [num, arr] of R.bySurah) if (num >= range[0] && num <= range[1] && arr.some(v => (' ' + v.l + ' ').includes(pl))) holders.add(num);
    if (holders.size !== cnt) fail(`عدد السور المذكور ${cnt} ≠ الفعلي ${holders.size}`);
    const nums = q.options.map(o => R.nameToNum.get(letters(o)));
    if (nums.some(n => n == null || n < range[0] || n > range[1])) fail('خيار ليس سورة ضمن النطاق');
    const notIdx = nums.map((n, i) => holders.has(n) ? -1 : i).filter(i => i >= 0);
    if (notIdx.length !== 1 || notIdx[0] !== q.correctIndex) fail('الخيار الذي لا ترد فيه العبارة ليس هو المعلَّم صحيحاً');
    if (![...R.allText].some(t => letters(t).includes(letters(phrase)))) fail('العبارة ليست من المصحف');
    return errs;
}

export function checkQuestion(q, R) {
    if (q.type === 'sim_notin') return checkNotin(q, R);
    if (q.type === 'sim_pair') return checkPair(q, R);
    if (q.type === 'sim_which') return checkWhich(q, R);
    if (q.type === 'sim_match') return checkMatch(q, R);
    const errs = [];
    const fail = (m) => errs.push(m);
    const all = [q.text, ...q.options].join('\n');
    // 1) لا أرقام
    if (/[0-9٠-٩۰-۹]/.test(all)) fail('رقم داخل السؤال أو الخيارات');
    // 2) ما بين ﴿ ﴾ حرفي من المصحف
    const ps = pieces(q.text);
    for (const p of ps) {
        const isStem = / \.{6}$/.test(p);
        if (isStem) {
            const stem = p.replace(/ \.{6}$/, '');
            const ok = R.prefixes.has(stem);
            if (!ok) fail('مطلع ليس بداية آية في المصحف: ' + p);
        } else if (clip(p)) {
            const c = clip(p), l = letters(c.core);
            const ok = c.mode === 'head' ? R.prefixes.has(c.core) : R.suffixes.has(l);
            if (!ok) fail('نص مقتطع ليس بداية/نهاية آية حرفية في المصحف: ' + p);
        } else if (!R.allText.has(p)) fail('نص بين ﴿﴾ ليس آية حرفية في المصحف: ' + p);
    }
    // 3) الخيارات
    if (q.options.length < 3 || q.options.length > 4) fail('عدد الخيارات ' + q.options.length);
    if (new Set(q.options.map(letters)).size !== q.options.length) fail('خيارات مكررة');
    if (q.options[q.correctIndex] !== q.correctAnswer) fail('correctIndex لا يطابق correctAnswer');
    // 3ب) عرض الخيارات المقصوصة: موازٍ للكاملة، بادئة حرفية منها (+ «…») بعد 12 كلمة على الأقل، ولا يتطابق خياران بعد القص
    const D = q.optionsDisplay;
    if (!Array.isArray(D) || D.length !== q.options.length) fail('optionsDisplay غير موازٍ للخيارات');
    else {
        D.forEach((d, i) => {
            const full = q.options[i];
            if (d === full) return;
            if (!d.endsWith(' …')) return fail('خيار مقصوص بلا «…»: ' + d);
            const head = d.slice(0, -2), hw = head.split(/\s+/).length, fw = full.split(/\s+/).length;
            if (!(full === head || full.startsWith(head + ' '))) fail('العرض ليس بادئة حرفية من الخيار الكامل');
            if (hw < 12) fail('قُصّ قبل 12 كلمة: ' + hw);
            if (fw <= hw + 2) fail('قصّ بلا فائدة (يحذف كلمتين فأقل)');
        });
        if (new Set(D.map(letters)).size !== D.length) fail('خياران متطابقان بعد القص');
        if (D.some((d, i) => i !== q.correctIndex && letters(d) === letters(D[q.correctIndex]))) fail('خيار خاطئ يتطابق مع الصحيح بعد القص');
    }
    // 4) خيار صحيح واحد في السياق المذكور (بحث في المصحف كله)
    const afterSurah = letters((q.text.match(/سورة ([^﴿\n:]*)/) || [])[1] || '').replace(/ (وبلغت|جاءت|بقوله|جاء)$/, '');
    const sname = R.names.find(n => afterSurah === n || afterSurah.startsWith(n + ' ')) || afterSurah;
    const optL = q.options.map(letters);
    const corrL = letters(q.correctAnswer);
    {
        const sn = R.nameToNum.get(letters(sname || ''));
        const arr = R.bySurah.get(sn);
        if (!arr) { fail('اسم السورة في السؤال غير معروف: ' + sname); return errs; }
        const shownRaw = ps.filter(p => !/ \.{6}$/.test(p));
        const shownClips = shownRaw.map(clip);
        const shownVerses = shownRaw.map((p, i) => letters(shownClips[i] ? shownClips[i].core : p));
        if (q.type === 'sim_next' || q.type === 'sim_prev') {
            const L = shownVerses.length, valid = new Set();
            for (let i = 0; i + L <= arr.length; i++) {
                if (shownVerses.every((s, k) => matchShown(arr[i + k], s, shownClips[k]))) {
                    const t = arr[q.type === 'sim_next' ? i + L : i - 1];
                    if (t) valid.add(t.l);
                }
            }
            if (valid.size !== 1) fail('الجواب غير وحيد في السياق: ' + valid.size);
            if (!valid.has(corrL)) fail('الجواب المعلَّم ليس صحيحاً في السياق');
            optL.forEach((o, i) => { if (i !== q.correctIndex && valid.has(o)) fail('خيار خاطئ هو في الحقيقة صحيح: ' + q.options[i]); });
        } else if (q.type === 'sim_complete') {
            const stemP = ps.find(p => / \.{6}$/.test(p)), stem = letters(stemP.replace(/ \.{6}$/, ''));
            let base;
            if (shownVerses.length) { base = []; arr.forEach((v, i) => { if (matchShown(v, shownVerses[0], shownClips[0]) && arr[i + 1]) base.push(arr[i + 1]); }); }
            else base = [arr[0]];
            const valid = new Set(base.filter(v => v.l.startsWith(stem + ' ')).map(v => v.l));
            const corrFull = letters(stemP.replace(/ \.{6}$/, '') + ' ' + q.correctAnswer);
            if (valid.size !== 1) fail('الإكمال غير وحيد في السياق: ' + valid.size);
            if (!valid.has(corrFull)) fail('الإكمال المعلَّم ليس صحيحاً في السياق');
            q.options.forEach((o, i) => { if (i !== q.correctIndex && valid.has(letters(stemP.replace(/ \.{6}$/, '') + ' ' + o))) fail('خيار خاطئ يكمل الآية فعلاً'); });
            // كل خيار نهاية آية حقيقية في المصحف
            q.options.forEach(o => { const lo = letters(o); if (!R.suffixes.has(lo)) fail('خيار ليس نهاية آية في المصحف: ' + o); });
        }
    }
    // كل خيار من نص المصحف (للآيات الكاملة)
    if (q.type === 'sim_next' || q.type === 'sim_prev') q.options.forEach(o => { if (!R.allText.has(o)) fail('خيار ليس آية حرفية: ' + o); });
    return errs;
}

// تكرار/كشف داخل المجموعة: لا نص مكرر، ولا جواب سؤال ظاهر (كآية كاملة) في نص سؤال آخر
// «حقيقة» السؤال مستخرجة من نصه (مستقلة عن المولّد): سؤالان بحقيقة واحدة مكرران ولو اختلف نوعهما
export function factOf(q) {
    if (q.type === 'sim_pair' || q.type === 'sim_notin') return 'phrase|' + letters(q.pair.phrase);
    if (q.type === 'sim_which') return 'which|' + q.options.map(letters).sort().join('+');
    if (q.type === 'sim_match') return 'match|' + q.match.left.map(x => letters(x.text)).sort().join('+');
    const ps = pieces(q.text), full = ps.filter(p => !/ \.{6}$/.test(p)).map(letters);
    const sn = q.occurrence.surahNumber, a = letters(q.correctAnswer);
    if (q.type === 'sim_next') return `${sn}|${full[full.length - 1]}>${a}`;
    if (q.type === 'sim_prev') return `${sn}|${a}>${full[0]}`;
    if (q.type === 'sim_complete') {
        const stem = letters(ps.find(p => / \.{6}$/.test(p)).replace(/ \.{6}$/, ''));
        return `${sn}|${full.length ? full[0] : 'START'}>${letters(stem + ' ' + q.correctAnswer)}`;
    }
    return 'map|' + full.join('+');
}

export function checkGroup(qs) {
    const errs = [];
    const facts = qs.map(factOf);
    if (new Set(facts).size !== facts.length) errs.push('سؤالان يسألان الحقيقة نفسها');
    const texts = qs.map(q => q.text);
    if (new Set(texts).size !== texts.length) errs.push('أسئلة بنص مكرر');
    qs.forEach((a, i) => qs.forEach((b, j) => {
        if (i === j) return;
        if (a.type === 'sim_next' || a.type === 'sim_prev') {
            const ans = a.correctAnswer;
            if (pieces(b.text).includes(ans) && a.occurrence.surahNumber === b.occurrence.surahNumber)
                errs.push(`جواب ${a.type} ظاهر في نص ${b.type}`);
        }
        if (a.type === 'sim_complete') {
            const full = pieces(a.text).find(p => / \.{6}$/.test(p));
            const stem = full.replace(/ \.{6}$/, '');
            if (pieces(b.text).some(p => p.startsWith(stem + ' ') && letters(p).endsWith(letters(a.correctAnswer))) && a.occurrence.surahNumber === b.occurrence.surahNumber)
                errs.push(`جواب sim_complete ظاهر في نص ${b.type}`);
        }
    }));
    return errs;
}

export async function runAll({ seed = 7, midVerse = undefined, stats = null } = {}) {
    const Q = loadQuran(), R = buildRaw(), G = await loadGroups();
    const rng = mulberry32(seed), posRef = { n: 0 };
    const out = { groups: [], failures: [], groupFailures: [], total: 0 };
    for (const g of G) {
        const r = generateGroupQuestions(Q, g, { rng, posRef, midVerse, stats });
        out.groups.push({ groupId: g.groupId, scope: g.scope, anchorPhrase: g.anchorPhrase, count: r.questions.length, reason: r.reason, notes: r.notes, juz: r.questions[0] ? r.questions[0].juz : null, questions: r.questions });
        out.total += r.questions.length;
        r.questions.forEach(q => { const e = checkQuestion(q, R); if (e.length) out.failures.push({ groupId: g.groupId, type: q.type, ref: q.ref, errors: e }); });
        const ge = checkGroup(r.questions); if (ge.length) out.groupFailures.push({ groupId: g.groupId, errors: ge });
    }
    return { ...out, Q, R };
}

export function summarize(res) {
    const byType = {}, pos = {}, byCount = {};
    const byJuz = {};
    for (const g of res.groups) {
        byCount[g.count] = (byCount[g.count] || 0) + 1;
        for (const q of g.questions) {
            byType[q.type] = (byType[q.type] || 0) + 1;
            pos[q.correctIndex] = (pos[q.correctIndex] || 0) + 1;
        }
    }
    return { total: res.total, groups: res.groups.length, byType, pos, byCount, failures: res.failures.length, groupFailures: res.groupFailures.length };
}
