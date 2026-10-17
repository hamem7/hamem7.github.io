// engine/tajweedLetterGames.js
//
// 🌟 [جديد] محرك بيانات خالص (بلا DOM ولا IndexedDB) لأنواع التدريبات المستوحاة من كتاب «فتوحات الرحمن»
// (اجمع الحروف في دوائرها، صنّف الحرف، اختر الحكم، صِل الكلمة بحكمها) وشجرة التلخيص لكل مرحلة.
// كلها مولَّدة من الكتالوج (حقل letters) ومن ملفَّي الأزواج والأمثلة، فتُعمَّم تلقائياً على كل حكم
// قائم على حروف أو أزواج حروف: القلقلة، الغنة، الميم والنون الساكنتان، لام «ال»، المد الطبيعي،
// المثلان والمتقاربان والمتجانسان. الأحكام القائمة على مواقف (بقية المد واللازم وإظهار لام الفعل)
// لا حروف لها، فتبقى لها أنشطتها الحالية فقط.
//
// أنواع الأسئلة (type) وكيف يعرضها tajweed-activity.js:
// (كلها ألعاب إضافية: mode='letters' للحكم الواحد، و mode='tree' للمرحلة، وسؤال «صِل المثال» ضمن mode='link')
//   letter_collect  — لوح حروف يضغط الطالب فيه كل حروف الحكم (متعدد النقرات)
//   odd_letter      — خيار واحد من حروف: «الحرف الدخيل» أو «أي حرف من حروف الحكم»
//   classify_letter — حرف كبير + أسماء أحكام المرحلة (يستعمل معالج data-choose-rule نفسه)
//   classify_pair   — زوج حروف + أسماء أحكام المرحلة (المثلان/المتقاربان/المتجانسان)
//   pair_link       — حرف أول ثم اختيار الحرف الذي يكوّن معه زوجاً من الحكم
import { getTajweedStage, getAllRulesFlat } from './tajweedRulesCatalog.js';
import { LETTER_PAIRS } from './tajweedLetterPairs.js';

export const ALL_LETTERS = 'ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي'.split(' ');
const MARKS_RE = /[ً-ٰٟۖ-ۭ]/g;
const strip = (s) => s.replace(MARKS_RE, '');

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
}
const pick = (arr, n) => shuffle(arr).slice(0, n);

// ============================================================
// معرفة نوع الحكم: حروف، أزواج، أو مواقف
// ============================================================
// حروف الحكم مفردة بلا تشكيل، أو null إن كان الحكم وصفاً لا حروفاً (إظهار لام الفعل، أقسام المد…)
export function getRuleLetters(rule) {
    if (!rule) return null;
    if (rule.id === 'izhar_shafawi') return ALL_LETTERS.filter(c => c !== 'ب' && c !== 'م'); // «كل الحروف عدا الباء والميم»
    const toks = String(rule.letters || '').split(/\s+/).filter(Boolean).map(strip);
    return toks.length && toks.every(t => t.length === 1) ? toks : null;
}
export function getRulePairs(rule) {
    return rule && LETTER_PAIRS[rule.id] ? LETTER_PAIRS[rule.id] : null;
}
export const isLetterGameRule = (rule) => !!(getRuleLetters(rule) || getRulePairs(rule));

const complementOf = (letters) => ALL_LETTERS.filter(c => !letters.includes(c));
const stageLetterRules = (stageId) => { const s = getTajweedStage(stageId); return s ? s.rules.filter(r => getRuleLetters(r)) : []; };
const stagePairRules = (stageId) => { const s = getTajweedStage(stageId); return s ? s.rules.filter(r => getRulePairs(r)) : []; };
const stageOf = (ruleId) => (getAllRulesFlat().find(x => x.rule.id === ruleId) || {}).stageId;

// ============================================================
// أسئلة الحروف
// ============================================================
// اجمع الحروف: حتى 6 حروف هدف + مشتِّتات حتى 12 لوحة. يحتاج 3 مشتِّتات على الأقل من خارج الحكم.
export function generateLetterCollectQuestion(rule) {
    const set = getRuleLetters(rule);
    if (!set) return null;
    const outside = complementOf(set);
    if (outside.length < 3) return null;
    const targets = pick(set, Math.min(6, set.length));
    const tiles = shuffle([...targets.map(letter => ({ letter, isTarget: true })), ...pick(outside, 12 - targets.length).map(letter => ({ letter, isTarget: false }))]);
    return { type: 'letter_collect', ruleId: rule.id, targets, tiles };
}

// الحرف الدخيل (حكم فيه 3 حروف فأكثر): ثلاثة من الحكم وحرف من خارجه، والمطلوب الدخيل.
// حكم فيه حرف أو حرفان: حرف واحد من الحكم وثلاثة من خارجه، والمطلوب حرف الحكم.
export function generateOddLetterQuestion(rule) {
    const set = getRuleLetters(rule);
    if (!set) return null;
    const outside = complementOf(set);
    const askNot = set.length >= 3;
    if (askNot ? outside.length < 1 : outside.length < 3) return null;
    const correctLetter = askNot ? pick(outside, 1)[0] : pick(set, 1)[0];
    const others = askNot ? pick(set, 3) : pick(outside, 3);
    return { type: 'odd_letter', ruleId: rule.id, askNot, correctLetter, options: shuffle([correctLetter, ...others]) };
}

// صنّف الحرف: يحتاج مرحلة فيها حكمان قائمان على حروف فأكثر. الخيارات أسماء الأحكام (حتى 4).
export function generateClassifyLetterQuestion(rule) {
    const set = getRuleLetters(rule);
    const bins = stageLetterRules(stageOf(rule.id));
    if (!set || bins.length < 2) return null;
    const others = pick(bins.filter(r => r.id !== rule.id), 3);
    return {
        type: 'classify_letter', ruleId: rule.id, letter: pick(set, 1)[0], correctRuleId: rule.id,
        options: shuffle([rule, ...others]).map(r => ({ ruleId: r.id, nameKey: r.nameKey }))
    };
}

// ============================================================
// أسئلة الأزواج
// ============================================================
export function generateClassifyPairQuestion(rule) {
    const pairs = getRulePairs(rule);
    const bins = stagePairRules(stageOf(rule.id));
    if (!pairs || bins.length < 2) return null;
    const p = pick(pairs, 1)[0];
    return {
        type: 'classify_pair', ruleId: rule.id, pair: { a: p.a, b: p.b }, correctRuleId: rule.id,
        options: shuffle(bins).map(r => ({ ruleId: r.id, nameKey: r.nameKey }))
    };
}

// اربط الحرفين: الحرف الأول معروض، والخيارات حروف ثانية؛ المشتِّتات لا تكوّن مع الأول زوجاً في أي حكم من المرحلة
export function generatePairLinkQuestion(rule) {
    const pairs = getRulePairs(rule);
    if (!pairs) return null;
    const p = pick(pairs, 1)[0];
    const taken = new Set(stagePairRules(stageOf(rule.id)).flatMap(r => getRulePairs(r)).filter(x => x.a === p.a).map(x => x.b));
    const distractors = pick(ALL_LETTERS.filter(c => !taken.has(c) && c !== p.a), 3);
    return { type: 'pair_link', ruleId: rule.id, first: p.a, correctLetter: p.b, options: shuffle([p.b, ...distractors]) };
}

// ============================================================
// تجميعات جاهزة للتطبيق والاختبار ونشاط المرحلة
// ============================================================
const clean = (arr) => arr.filter(Boolean);

// «ألعاب الحروف» للحكم الواحد: لعبة إضافية مستقلة عن جلسة التطبيق والاختبار (لا تُغيّر خطوات رحلة الحكم).
// خمسة أسئلة متنوّعة: حرف قائم على حروف ← (اجمع، الدخيل، صنّف إن أمكن، الدخيل، اجمع)؛ وحكم أزواج ← (صنّف الزوج، اربط الحرفين) بالتناوب
export function buildRuleLetterGameQuestions(rule) {
    if (getRulePairs(rule)) return clean([generateClassifyPairQuestion(rule), generatePairLinkQuestion(rule), generateClassifyPairQuestion(rule), generatePairLinkQuestion(rule), generateClassifyPairQuestion(rule)]);
    if (getRuleLetters(rule)) {
        const classify = () => generateClassifyLetterQuestion(rule);
        return clean([generateLetterCollectQuestion(rule), generateOddLetterQuestion(rule), classify() || generateOddLetterQuestion(rule), generateOddLetterQuestion(rule), generateLetterCollectQuestion(rule) || classify()]);
    }
    return [];
}

// نشاط «شجرة الحكم» للمرحلة: حتى 8 أسئلة تصنيف موزّعة بالتساوي على أحكام المرحلة؛
// وللمرحلة ذات الحكم الواحد: لوح جمع حروفه ثم سؤالا الحرف الدخيل. يرجع [] إن لم يصلح للمرحلة.
export function buildStageTreeQuestions(stageId, size = 8) {
    const pairRules = stagePairRules(stageId);
    if (pairRules.length >= 2) return fromBins(pairRules, generateClassifyPairQuestion, size);
    const letterRules = stageLetterRules(stageId);
    if (letterRules.length >= 2) return fromBins(letterRules, generateClassifyLetterQuestion, size);
    if (letterRules.length === 1) return clean([generateLetterCollectQuestion(letterRules[0]), generateOddLetterQuestion(letterRules[0]), generateOddLetterQuestion(letterRules[0])]);
    return [];
}
function fromBins(rules, gen, size) {
    const qs = [];
    for (let i = 0; qs.length < size && i < size * 3; i++) { const q = gen(rules[i % rules.length]); if (q) qs.push(q); }
    return shuffle(qs);
}
export const hasStageTreeActivity = (stageId) => buildStageTreeQuestions(stageId).length > 0;

// ============================================================
// شجرة التلخيص (بيانات العرض): المرحلة ← الأحكام ← حروفها أو أزواجها، على غرار ص١٧ في الكتاب
// ============================================================
// تجميع أحكام مرحلة تحت عنوان فرعي (الإدغام بغنة وبغير غنة تحت «الإدغام» كما في الكتاب)
const TREE_GROUPS = {
    noon_sakinah: [{ key: 'tjw_tree_group_idgham', rules: ['idgham_bighunnah', 'idgham_bila_ghunnah'] }]
};

export function buildStageTree(stageId) {
    const stage = getTajweedStage(stageId);
    if (!stage) return null;
    const nodeOf = (rule) => {
        const pairs = getRulePairs(rule), letters = getRuleLetters(rule);
        return {
            ruleId: rule.id, nameKey: rule.nameKey,
            kind: pairs ? 'pairs' : letters ? 'letters' : 'text',
            items: pairs ? pairs.map(p => ({ a: p.a, b: p.b })) : letters ? (rule.letters.split(/\s+/).filter(Boolean)) : [],
            text: pairs || letters ? '' : rule.letters,
            count: pairs ? pairs.length : letters ? letters.length : 0
        };
    };
    const groups = TREE_GROUPS[stageId] || [];
    const grouped = new Set(groups.flatMap(g => g.rules));
    const branches = [];
    stage.rules.forEach(rule => {
        if (grouped.has(rule.id)) {
            const g = groups.find(x => x.rules[0] === rule.id);
            if (g) branches.push({ groupKey: g.key, children: g.rules.map(id => nodeOf(stage.rules.find(r => r.id === id))) });
        } else branches.push({ children: [nodeOf(rule)] });
    });
    return { stageId, nameKey: stage.nameKey, colorVar: stage.colorVar, branches };
}
