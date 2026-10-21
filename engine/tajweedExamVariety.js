// engine/tajweedExamVariety.js
//
// 🌟 [2026-10-21 — بطلب المعلم] تنويع اختبار الحكم حتى لا يمل الطالب ويكون اختباراً حقيقياً: تشكيلة جديدة من الأنواع في كل مرة (لا تكرر
// تشكيلة آخر اختبار)، وأسئلة من آيات حفظ الطالب أولاً ثم أمثلة الكتالوج (مصادر buildExamSources). الأنواع القديمة (اختر الحكم، حكم الكلمة
// المظلَّلة، اكتشف الكلمة) باقية كما هي، وتنضم إليها: استمع واحكم، أين الخطأ، صح أم خطأ عن حروف الحكم أو قاعدته، ولغز «من أنا؟».
// خالص بلا DOM. يعتمد على مولّدات tajweedEngine.js ولا يعتمد عليه tajweedEngine (لا استيراد دائري).
import { getAllRulesFlat } from './tajweedRulesCatalog.js';
import { getRuleLetters, ALL_LETTERS } from './tajweedLetterGames.js';
import { RULE_FACTS } from './tajweedFacts.js';
import { EXAM_SIZE } from './tajweedJourney.js';
import { generateChooseRuleQuestion, generateIdentifyQuestion, examDiscoverFromSource, rulesConflict, shuffleArray } from './tajweedEngine.js';

const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => shuffleArray(arr).slice(0, n);

// «استمع واحكم»: سؤال تمييز الكلمة المظلَّلة نفسه، لكن الصوت (المنشاوي) ظاهر في الاختبار أيضاً ويبدأ الطالب منه
function listenQuestion(rule, src, conflicts) {
    const q = generateIdentifyQuestion(rule, src, { conflicts });
    return q ? { ...q, kind: 'listen', listenFirst: true } : null;
}

// «أين الخطأ؟»: طالب يدّعي حكماً للكلمة المظلَّلة (صحيحاً في 30% من الأحيان)؛ يحكم الطالب بأنه مصيب أو مخطئ ويختار الصواب
function spotQuestion(rule, src, conflicts) {
    const base = generateIdentifyQuestion(rule, src, { conflicts });
    if (!base) return null;
    const distractors = base.options.filter(o => o.ruleId !== rule.id);
    if (distractors.length < 2) return null;
    const claimTrue = Math.random() < 0.3;
    const claim = claimTrue ? base.options.find(o => o.ruleId === rule.id) : pickOne(distractors);
    const others = claimTrue ? pickN(distractors, 2) : [base.options.find(o => o.ruleId === rule.id), ...distractors.filter(o => o.ruleId !== claim.ruleId).slice(0, 1)];
    const { options: _drop, correctRuleId: _drop2, ...rest } = base;
    return {
        ...rest, type: 'spot_rule', kind: 'spot', ruleId: rule.id,
        claimRuleId: claim.ruleId, claimNameKey: claim.nameKey, claimTrue,
        options: [{ value: 'ok' }, ...others.map(o => ({ value: o.ruleId, nameKey: o.nameKey }))],
        correctValue: claimTrue ? 'ok' : rule.id
    };
}

// «صح أم خطأ» عن حرف: «حرف X من حروف حكم Y» (صحيح من حروفه، وخاطئ من خارجها وغالباً من حروف حكم قريب)
function tfLetterQuestion(rule) {
    const letters = getRuleLetters(rule);
    if (!letters || letters.length < 2) return null;
    const outside = ALL_LETTERS.filter(c => !letters.includes(c));
    if (!outside.length) return null;
    const truth = Math.random() < 0.5;
    let letter;
    if (truth) letter = pickOne(letters);
    else {
        const flat = getAllRulesFlat();
        const near = flat.filter(x => x.rule.id !== rule.id).flatMap(x => getRuleLetters(x.rule) || []).filter(c => outside.includes(c));
        letter = pickOne(near.length ? near : outside);
    }
    return { type: 'tf_statement', kind: 'tf', ruleId: rule.id, textKey: 'tjw_ex_tf_letter', letter, ruleNameKey: rule.nameKey, truth };
}

// «صح أم خطأ» عن قاعدة الحكم من tajweedFacts.js (عربية فقط)
function tfFactQuestion(rule, usedTexts) {
    const list = (RULE_FACTS[rule.id] || []).filter(f => !usedTexts.has(f.text));
    if (!list.length) return null;
    const f = pickOne(list);
    usedTexts.add(f.text);
    return { type: 'tf_statement', kind: 'fact', ruleId: rule.id, text: f.text, truth: f.truth };
}

// لغز «من أنا؟»: عدد حروف الحكم وأحد حروفه؛ المشتِّتات أحكام لا تحوي ذلك الحرف
function riddleQuestion(rule) {
    const letters = getRuleLetters(rule);
    if (!letters || letters.length < 2 || letters.length > 10) return null;
    const letter = pickOne(letters);
    const flat = getAllRulesFlat();
    const pool = flat.filter(x => x.rule.id !== rule.id && !rulesConflict(rule.id, x.rule.id) && !(getRuleLetters(x.rule) || []).includes(letter));
    const distractors = pickN(pool.map(x => x.rule), 3);
    if (distractors.length < 2) return null;
    return {
        type: 'choose_rule', kind: 'riddle', ruleId: rule.id, riddle: { n: letters.length, letter },
        letters: rule.promptLetters || rule.letters, correctRuleId: rule.id,
        options: shuffleArray([rule, ...distractors]).map(r => ({ ruleId: r.id, nameKey: r.nameKey }))
    };
}

// يبني اختباراً متنوعاً: «اختر الحكم» أولاً ثم أنواع بالتناوب، والأنواع التي لم تظهر في آخر اختبار (prevKinds) أولاً.
// lang 'en' يُسقط الحقائق العربية. sources من buildExamSources (الحفظ أولاً).
export function buildVariedExamQuestions(rule, sources, { conflicts = null, size = EXAM_SIZE, prevKinds = [], lang = 'ar' } = {}) {
    const out = [{ ...generateChooseRuleQuestion(rule), kind: 'choose' }];
    const kinds = ['identify', 'discover', 'listen', 'spot', 'tf', 'riddle', ...(lang === 'ar' ? ['fact'] : [])];
    const order = shuffleArray(kinds).sort((a, b) => (prevKinds.includes(a) ? 1 : 0) - (prevKinds.includes(b) ? 1 : 0));
    const n = (sources || []).length;
    const usedFacts = new Set(), usedTf = new Set(), usedRiddle = new Set(), used = new Set();
    let cursor = 0, attempts = 0;
    while (out.length < size && attempts < 60) {
        const kind = order[attempts % order.length];
        attempts++;
        let q = null;
        if (['identify', 'discover', 'listen', 'spot'].includes(kind)) {
            for (let k = 0; k < n && !q; k++) {
                const idx = (cursor + k) % n, key = `${idx}:${kind}`;
                if (used.has(key)) continue;
                const src = sources[idx];
                q = kind === 'identify' ? generateIdentifyQuestion(rule, src, { conflicts })
                    : kind === 'discover' ? examDiscoverFromSource(rule, src)
                    : kind === 'listen' ? listenQuestion(rule, src, conflicts)
                    : spotQuestion(rule, src, conflicts);
                if (q) { used.add(key); cursor = idx + 1; q = { ...q, kind: q.kind || kind }; }
            }
        } else if (kind === 'tf') {
            q = usedTf.size >= 2 ? null : tfLetterQuestion(rule);
            if (q) { const key = q.letter + q.truth; if (usedTf.has(q.letter)) q = null; else usedTf.add(q.letter); }
        } else if (kind === 'riddle') {
            if (usedRiddle.size === 0) { q = riddleQuestion(rule); if (q) usedRiddle.add(1); }
        } else if (kind === 'fact') {
            q = usedFacts.size >= 2 ? null : tfFactQuestion(rule, usedFacts);
        }
        if (q) out.push(q);
    }
    return shuffleArray(out);
}

export const examKindsOf = (questions) => [...new Set(questions.map(q => q.kind).filter(Boolean))];
