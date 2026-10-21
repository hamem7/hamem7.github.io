// engine/tajweedPath.js
//
// 🌟 [مسار الحكم المتصل — 2026-10-21] ألعاب كل حكم (حزمة تُلعب متتابعة قبل التحدي): تدرّب، ألعاب الحروف (لأحكام الحروف والأزواج)، شجرة
// الحكم، ربط المرحلة (لمرحلة بأكثر من حكم). خالص بلا DOM. نتائجها تُسجَّل في journey.gameScores (engine/tajweedJourney.js).
import { getTajweedStage, getAllRulesFlat } from './tajweedRulesCatalog.js';
import { isLetterGameRule, hasStageTreeActivity } from './tajweedLetterGames.js';

export const GAME_KEYS = ['practice', 'letters', 'tree', 'link', 'mushaf'];
// مفتاح اللعبة هو نفسه وضع النشاط (mode) في tajweed-activity.js
export const gameModeOf = (key) => key;
export const gameLabelKey = (key) => `tjw_game_${key}`;

export function gamesForRule(rule, stageId) {
    // 🌟 دروس «تعرّف على مصحفك»: تدرّب (أسئلة تعرّف) ثم «استكشف المصحف» (ضغط ووصل)؛ لا حروف ولا شجرة ولا ربط حروف
    if (rule && rule.mushaf) return ['practice', 'mushaf'];
    const keys = ['practice'];
    if (rule && isLetterGameRule(rule)) keys.push('letters');
    if (stageId && hasStageTreeActivity(stageId)) keys.push('tree');
    const stage = stageId ? getTajweedStage(stageId) : null;
    if (stage && stage.rules.length >= 2) keys.push('link');
    return keys;
}

export function gamesForRuleId(ruleId) {
    const f = getAllRulesFlat().find(x => x.rule.id === ruleId);
    return f ? gamesForRule(f.rule, f.stageId) : ['practice'];
}
