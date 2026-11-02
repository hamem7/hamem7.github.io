// core/tajweedHomeworkProfile.js
//
// 🌟 [جديد] يبني «ملف التجويد» الذي تُسحب منه أسئلة التجويد في الواجب (engine/tajweedHomework.js):
// الأحكام التي شُرحت للطالب فعلاً (رحلة الحكم: learnedAt) بنصوص الشرح العربية نفسها، وآيات من حفظه يقع فيها كل حكم (جدول التوسيم).
// أي إخفاق (لا مدير تجويد، لا سجلات، لا شرح...) يرجع null فيبقى سؤال التجويد العام القديم كما كان.
import { AppState } from './app.js';
import { translations } from './i18n.js';
import { ensureJourney } from '../engine/tajweedJourney.js';
import { getAllRulesFlat, isMushafRule } from '../engine/tajweedRulesCatalog.js';
import { createAnnotationIndex } from '../engine/tajweedAnnotations.js';

const MAX_SOURCES_PER_RULE = 3;

let annotationPromise = null;
function loadIndex() {
    if (!annotationPromise) {
        annotationPromise = (async () => {
            try {
                const res = await fetch(new URL('../database/data/tajweedAnnotations.json', import.meta.url));
                return res.ok ? createAnnotationIndex(await res.json()) : null;
            } catch (e) { return null; }
        })();
    }
    return annotationPromise;
}

const arText = (key) => { const v = translations && translations.ar ? translations.ar[key] : null; return typeof v === 'string' ? v.trim() : null; };

export async function buildTajweedHomeworkProfile(student, pool, { rng = Math.random } = {}) {
    try {
        if (!student || !AppState.tajweedManager) return null;
        const mastery = await AppState.tajweedManager.getMasteryByStudent(student.id);
        const learnedIds = new Set(mastery.filter(m => ensureJourney(m).learnedAt).map(m => m.ruleId));
        if (!learnedIds.size) return null;

        const flat = getAllRulesFlat().filter(x => !isMushafRule(x.rule));
        const nameCache = new Map(flat.map(x => [x.rule.id, arText(x.rule.nameKey)]));
        const nameOf = (id) => nameCache.get(id) || null;
        const rules = flat
            .filter(x => learnedIds.has(x.rule.id))
            .map(x => ({ id: x.rule.id, stageId: x.stageId, name: arText(x.rule.nameKey), def: arText(x.rule.defKey) }))
            .filter(r => r.name && r.def);
        if (!rules.length) return null;

        // آيات من نطاق حفظه فيها الحكم (للسؤال «طبّق»): نعرف مواضعه ومواضع أي حكم آخر على الكلمة نفسها لاستبعاده من الخيارات
        const sources = [];
        const index = await loadIndex();
        if (index && Array.isArray(pool) && pool.length) {
            const allIds = flat.map(x => x.rule.id);
            for (const rule of rules) {
                if (!index.has(rule.id)) continue;
                const hits = [];
                for (const a of pool) {
                    const occ = index.occurrences(a.surahNumber, a.numberInSurah, rule.id);
                    if (occ.length) hits.push({ a, occ });
                }
                hits.sort(() => rng() - 0.5);
                for (const { a, occ } of hits.slice(0, MAX_SOURCES_PER_RULE)) {
                    const covered = new Set();
                    occ.forEach(o => { for (let w = o.w1; w <= o.w2; w++) covered.add(w); });
                    const otherRuleIds = allIds.filter(id => id !== rule.id && index.has(id) &&
                        index.occurrences(a.surahNumber, a.numberInSurah, id).some(o => { for (let w = o.w1; w <= o.w2; w++) if (covered.has(w)) return true; return false; }));
                    sources.push({ ruleId: rule.id, surah: a.surahNumber, ayah: a.numberInSurah, text: a.text, occurrences: occ, otherRuleIds });
                }
            }
        }
        return { rules, nameOf, sources };
    } catch (err) {
        console.warn('تعذر بناء ملف التجويد لأسئلة الواجب:', err);
        return null;
    }
}
