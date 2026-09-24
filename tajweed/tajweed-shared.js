// tajweed/tajweed-shared.js
//
// 🌟 [جديد — المرحلة 2] دوال مشتركة بين شاشات "أبطال التجويد" (tajweed-map.js وtajweed-
// activity.js معاً) — استُخرجت من tajweed-map.js بدل تكرارها حرفياً في كل ملف: جلب نص آية
// حقيقي من محرك القرآن (بلا أي نص ثابت مكتوب يدوياً)، تظليل بادئة tjw- المعزولة، ومزامنة
// حقل tajweedProgress في سجل الطالب بعد أي جلسة نشاط (راجع §3 من المستند المعماري).
import { AppState } from '../core/app.js';
import { cleanAyahText, cleanName } from '../engine/quranEngine.js';
import { findPhraseRanges } from '../core/quranTextUtils.js';
import { getFirstStageId, getAllRulesFlat } from '../engine/tajweedRulesCatalog.js';
import { computeAllStageProgress, isStageUnlocked } from '../engine/tajweedEngine.js';

// 🌟 تخزين مؤقت لكل سورة تُجلَب من QuranEngine — نفس فكرة surahCache في similarities.js
const surahCache = new Map();

export async function getAyahForExample(surahNumber, ayahNumber) {
    try {
        let surah = surahCache.get(surahNumber);
        if (!surah) {
            surah = await AppState.quranEngine.getSurah(surahNumber);
            surahCache.set(surahNumber, surah);
        }
        if (!surah || !surah.ayahs || !surah.ayahs[ayahNumber - 1]) return null;
        const ayah = surah.ayahs[ayahNumber - 1];
        return {
            text: cleanAyahText(ayah.text),
            number: ayah.number,
            surahName: cleanName(surah.name)
        };
    } catch (e) {
        console.warn('تعذر جلب نص الآية لمسار التجويد:', e);
        return null;
    }
}

// 🌟 نسخة مخصّصة من التظليل تلتزم ببادئة tjw- المعزولة (راجع الملاحظة الأصلية في
// tajweed-map.js) — مبنية فوق findPhraseRanges المشتركة النقية من core/quranTextUtils.js
export function highlightForTajweed(text, phrase) {
    if (!text || !phrase) return text || '';
    const ranges = findPhraseRanges(text, phrase);
    if (ranges.length === 0) return text;

    let html = '';
    let cursor = 0;
    ranges.forEach(([start, end]) => {
        html += text.slice(cursor, start);
        html += `<mark class="tjw-highlight">${text.slice(start, end)}</mark>`;
        cursor = end;
    });
    html += text.slice(cursor);
    return html;
}

// 🌟 [جديد — المرحلة 3] يعيد حساب tajweedProgress كاملاً من سجلات الإتقان الفعلية ويحفظه في
// سجل الطالب عبر AppState.studentManager.updateStudent — نقطة استدعاء واحدة موحّدة تُستدعى
// من tajweed-activity.js فور إتمام أي جلسة نشاط، حتى لا يتكرر نفس منطق "أين نكمل" في أكثر
// من مكان. lastActivityType اختياري (لعرضه لاحقاً في ملف الطالب إن احتجنا).
export async function syncStudentTajweedProgress(student, lastActivityType, lastRuleId) {
    if (!student || !AppState.tajweedManager) return null;
    const allMastery = await AppState.tajweedManager.getMasteryByStudent(student.id);
    const stageProgress = computeAllStageProgress(allMastery);

    // 🌟 تحديد "أين نكمل تلقائياً": أول حكم غير 'mastered' في أول مرحلة مفتوحة وغير مكتملة،
    // وإلا (كل شيء متقن) نبقى على آخر حكم لمسه الطالب فعلياً
    let currentStageId = getFirstStageId();
    let currentRuleId = null;
    const flatRules = getAllRulesFlat();
    for (const { stageId, rule } of flatRules) {
        if (!isStageUnlocked(stageId, stageProgress)) continue;
        const rec = allMastery.find(m => m.ruleId === rule.id);
        if (!rec || rec.status !== 'mastered') {
            currentStageId = stageId;
            currentRuleId = rule.id;
            break;
        }
    }

    student.tajweedProgress = {
        currentStageId,
        currentRuleId,
        lastActivityAt: new Date().toISOString(),
        lastActivityType: lastActivityType || (student.tajweedProgress && student.tajweedProgress.lastActivityType) || null,
        stageProgress
    };

    await AppState.studentManager.updateStudent(student);
    return student.tajweedProgress;
}
