// engine/tajweedHomework.js
//
// 🌟 [جديد — بطلب المعلم] أسئلة التجويد في الواجب تُسحب من «ملف التجويد» الخاص بالطالب: الأحكام التي شُرحت له فعلاً
// (journey.learnedAt في سجل الإتقان) لا أحكام عشوائية لم يرها. يُبنى السؤال من نص الشرح نفسه الذي قرأه في الدرس:
//   • «explain» (تذكّر الشرح): يُعرض تعريف الحكم كما شُرح للطالب ويُسأل «ما اسم هذا الحكم؟»
//   • «apply» (طبّق الشرح): كلمة مظلَّلة من آية في حفظه (من جدول التوسيم) ويُسأل «ما حكمها؟»
// الخيارات: أسماء الأحكام (المشتِّتات من أحكامه المشروحة أولاً ثم من بقية الكتالوج، بلا حكمين قد يجتمعان على الكلمة نفسها).
// دالة خالصة بلا DOM ولا قاعدة بيانات: كل ما تحتاجه يأتي في profile (يبنيه core/tajweedHomeworkProfile.js)، فتُختبر في Node.
//
// profile = {
//   rules:   [{ id, stageId, name, def }]                      // الأحكام المشروحة للطالب (نصوص عربية كما في ملف الطالب)
//   nameOf:  (ruleId) => string|null                           // اسم أي حكم في الكتالوج (للمشتِّتات)
//   sources: [{ ruleId, text, occurrences:[{w1,w2}], otherRuleIds:[] }]   // آيات من حفظه فيها الحكم (اختياري)
// }
import { getAllRulesFlat, isMushafRule } from './tajweedRulesCatalog.js';
import { rulesConflict } from './tajweedEngine.js';
import { splitAyahWords } from './quranEngine.js';

export const TJW_HW_EXPLAIN_PREFIX = 'قيل لك في درس التجويد: ';
export const TJW_HW_EXPLAIN_ASK = 'ما اسم هذا الحكم؟';
export const TJW_HW_APPLY_TITLE = 'ما الحكم التجويدي للكلمة المظلّلة في الآية؟';
const MARK_STYLE = 'background:rgba(224,176,79,.55);color:#3d0a14;border-radius:6px;padding:0 4px;';

const shuffle = (arr, rng) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
};

// أحكام الكتالوج الصالحة خياراً: غير «تعرّف على مصحفك» ولها اسم
function distractorsFor(ruleId, profile, rng, extraExclude = new Set()) {
    const learnedIds = new Set(profile.rules.map(r => r.id));
    const flat = getAllRulesFlat();
    const myStage = (flat.find(x => x.rule.id === ruleId) || {}).stageId;
    const myName = profile.nameOf(ruleId);
    const seen = new Set([myName]);
    const eligible = flat.filter(x => {
        if (x.rule.id === ruleId || isMushafRule(x.rule) || rulesConflict(ruleId, x.rule.id) || extraExclude.has(x.rule.id)) return false;
        const name = profile.nameOf(x.rule.id);
        if (!name || seen.has(name)) return false;
        seen.add(name);
        return true;
    });
    // الأولوية: أحكامه المشروحة، ثم نفس المرحلة، ثم الباقي (كلٌّ مخلوط)
    const tiers = [
        eligible.filter(x => learnedIds.has(x.rule.id)),
        eligible.filter(x => !learnedIds.has(x.rule.id) && x.stageId === myStage),
        eligible.filter(x => !learnedIds.has(x.rule.id) && x.stageId !== myStage)
    ];
    const out = [];
    for (const tier of tiers) for (const x of shuffle(tier, rng)) { if (out.length < 3) out.push(profile.nameOf(x.rule.id)); }
    return out;
}

function buildExplain(profile, rng) {
    // الشرح كما قرأه الطالب حرفياً (فتُترجَم جملته من القاموس)؛ نستبعد حكماً يرد اسمه في شرحه حتى لا يُكشف الجواب
    const usable = profile.rules.filter(r => r.name && r.def && String(r.def).trim().length >= 12 && !String(r.def).includes(r.name));
    for (const rule of shuffle(usable, rng)) {
        const wrong = distractorsFor(rule.id, profile, rng);
        if (wrong.length < 2) continue;
        return {
            ruleId: rule.id,
            question: {
                type: 'mcq',
                title: `${TJW_HW_EXPLAIN_PREFIX}«${String(rule.def).trim()}» — ${TJW_HW_EXPLAIN_ASK}`,
                text: '',
                options: shuffle([rule.name, ...wrong], rng),
                correctAnswer: rule.name,
                points: 1,
                tajweedRuleId: rule.id,
                tajweedVariant: 'explain'
            }
        };
    }
    return null;
}

function buildApply(profile, rng) {
    const byId = new Map(profile.rules.map(r => [r.id, r]));
    for (const src of shuffle(profile.sources || [], rng)) {
        const rule = byId.get(src.ruleId);
        if (!rule || !rule.name || !src.occurrences || !src.occurrences.length) continue;
        const words = splitAyahWords(src.text);
        const covered = new Set();
        src.occurrences.forEach(o => { for (let w = o.w1; w <= o.w2; w++) covered.add(w); });
        if (!covered.size || words.length < 3 || words.length > 25) continue;
        const wrong = distractorsFor(rule.id, profile, rng, new Set(src.otherRuleIds || []));
        if (wrong.length < 2) continue;
        const html = words.map((w, i) => covered.has(i) ? `<span style="${MARK_STYLE}">${w}</span>` : w).join(' ');
        return {
            ruleId: rule.id,
            question: {
                type: 'mcq',
                title: TJW_HW_APPLY_TITLE,
                text: `﴿ ${html} ﴾`,
                options: shuffle([rule.name, ...wrong], rng),
                correctAnswer: rule.name,
                points: 1,
                tajweedRuleId: rule.id,
                tajweedVariant: 'apply',
                tajweedAyah: { surah: src.surah, ayah: src.ayah }
            }
        };
    }
    return null;
}

// يرجع { ruleId, question } أو null إن لم يكن في ملف الطالب ما يكفي (فيعود المحرك للسؤال العام القديم)
export function buildTajweedHomeworkQuestion(profile, { rng = Math.random } = {}) {
    if (!profile || !Array.isArray(profile.rules) || !profile.rules.length || typeof profile.nameOf !== 'function') return null;
    const first = profile.sources && profile.sources.length && rng() < 0.5 ? [buildApply, buildExplain] : [buildExplain, buildApply];
    for (const fn of first) { const r = fn(profile, rng); if (r) return r; }
    return null;
}
