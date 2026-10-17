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
import { isWaqfMark } from '../engine/quranEngine.js';
import { resolveRange, buildPath } from '../engine/trackingEngine.js';
import { createAnnotationIndex, memorizedAyahsFromPath, findCandidateAyahs } from '../engine/tajweedAnnotations.js';

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
export function highlightForTajweed(text, phrase, firstOnly = false) {
    if (!text || !phrase) return text || '';
    let ranges = findPhraseRanges(text, phrase);
    if (firstOnly) ranges = ranges.slice(0, 1);
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

// ============================================================
// 🌟 [جديد] آيات من حفظ الطالب نفسه عبر جدول التوسيم (database/data/tajweedAnnotations.json)
// ============================================================
let annotationIndexPromise = null;
export function loadAnnotationIndex() {
    if (!annotationIndexPromise) {
        annotationIndexPromise = (async () => {
            try {
                const res = await fetch(new URL('../database/data/tajweedAnnotations.json', import.meta.url));
                return res.ok ? createAnnotationIndex(await res.json()) : null;
            } catch (e) { console.warn('تعذر تحميل جدول توسيم التجويد:', e); return null; }
        })();
    }
    return annotationIndexPromise;
}

// آيات حفظ الطالب (من نطاق memoFrom/memoTo والسجل الشهري، بنفس منطق ملف الطالب في التتبّع)
const poolCache = new Map();
export async function getStudentAyahPool(student) {
    if (!student || !AppState.surahsData || !AppState.surahsData.length) return [];
    const key = `${student.id}|${student.memoFrom}|${student.memoTo}`;
    if (poolCache.has(key)) return poolCache.get(key);
    let records = [];
    try { records = await AppState.monthlyMemorizationManager.getAllForStudent(student.id); } catch (e) { records = []; }
    const range = resolveRange(AppState.surahsData, student, records);
    const pool = range.ok ? memorizedAyahsFromPath(buildPath(AppState.surahsData, range)) : [];
    poolCache.set(key, pool);
    return pool;
}

// حتى n آيات من حفظ الطالب فيها الحكم، كل منها {surah, ayah, occurrences, ayahInfo}؛ [] لو لا نطاق حفظ أو لا موضع.
// نتجنّب الآيات الطويلة جداً (أكثر من 25 كلمة) ولا نقبل إلا آية فيها 3 كلمات غير موسومة على الأقل للمشتِّتات.
export async function pickStudentExamples(rule, student, n = 1) {
    const index = await loadAnnotationIndex();
    if (!index || !index.has(rule.id)) return [];
    const pool = await getStudentAyahPool(student);
    if (!pool.length) return [];
    const candidates = findCandidateAyahs(index, rule.id, pool);
    const out = [];
    for (const c of candidates.slice(0, 40)) {
        if (out.length >= n) break;
        const ayahInfo = await getAyahForExample(c.surah, c.ayah);
        if (!ayahInfo) continue;
        const words = ayahInfo.text.split(/\s+/).filter(w => w && !isWaqfMark(w));
        const covered = new Set();
        c.occurrences.forEach(o => { for (let w = o.w1; w <= o.w2; w++) covered.add(w); });
        if (words.length > 25 || words.length - covered.size < 3) continue;
        out.push({ ...c, ayahInfo });
    }
    return out;
}

// تظليل كلمات محدَّدة (فهارس كلمات بعد حذف رموز الوقف) داخل نص الآية
export function highlightWordsHTML(text, occurrences) {
    const covered = new Set();
    (occurrences || []).forEach(o => { for (let w = o.w1; w <= o.w2; w++) covered.add(w); });
    let wi = 0;
    return (text || '').split(/(\s+)/).map(tok => {
        if (!tok.trim() || isWaqfMark(tok)) return tok;
        const html = covered.has(wi) ? `<mark class="tjw-highlight">${tok}</mark>` : tok;
        wi++;
        return html;
    }).join('');
}
