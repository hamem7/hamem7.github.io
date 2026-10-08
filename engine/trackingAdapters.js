// engine/trackingAdapters.js
// ==========================================
// 🌟 [جديد — الواجب الذكي] محوّلات خالصة: تحوّل بيانات المنصة الموجودة (تسليم واجب، جلسة لعبة/اختبار فردي،
// قائمة الأخطاء وأرشيفها) إلى "أحداث أداء" بصيغة واحدة يفهمها trackingEngine. لا وصول لقاعدة بيانات هنا.
//
// شكل الحدث:
//   { studentId, ts, source, refId, qid?, surah, ayah, segment, skill, fmt, score(0..1), weight, hint, timeSec, quality[] }
//   source: 'homework' | 'game' | 'weakness' | 'backfill_homework'
//   refId : معرّف المصدر (رقم التسليم/الجلسة) — يضمن عدم تكرار الأحداث عند إعادة التصحيح أو إعادة بناء الملف
// ==========================================

import { HW_FORMATS, inferHwFormat, skillOfHwFormat, skillOfGameType, parseQualityCodes } from './skillMap.js';
import { segmentIdFor } from './trackingEngine.js';

// ------------------------------------------
// أنواع/عناوين قديمة → ayah text لاستنتاج الموضع (واجبات قديمة بلا meta تتبّع)
// ------------------------------------------
export function normalizeForMatch(s) {
    return String(s || '')
        .replace(/[ً-ٰٟۖ-ۭـ]/g, '')   // الحركات وعلامات الوقف والتطويل
        .replace(/[ٱأإآ]/g, 'ا').replace(/[ى]/g, 'ي').replace(/[ۀة]/g, 'ه')
        .replace(/[﴿﴾ ]/g, ' ')
        .replace(/\s+/g, ' ').trim();
}

// يبني فهرساً نصّ الآية المنظَّف ← [{surah, ayah}] (آيات مكرّرة حرفياً ترجع أكثر من موضع، فنتجنّب التخمين)
export function buildAyahTextIndex(surahs /* [{number, ayahs:[{numberInSurah,text}]}] */) {
    const idx = new Map();
    (surahs || []).forEach(s => (s.ayahs || []).forEach(a => {
        const key = normalizeForMatch(a.text);
        if (!key) return;
        if (!idx.has(key)) idx.set(key, []);
        idx.get(key).push({ surah: s.number, ayah: a.numberInSurah });
    }));
    return idx;
}

export function locateByText(index, text) {
    const key = normalizeForMatch(text);
    const hits = index.get(key);
    return (hits && hits.length === 1) ? hits[0] : null;   // غير فريد = لا نخمّن
}

function questionScore(d) {
    const pts = (typeof d.points === 'number' && d.points > 0) ? d.points : 1;
    if (d.needsManualGrading) {
        if (typeof d.manualScore !== 'number') return null;   // لم يُصحَّح بعد → لا حدث
        return Math.max(0, Math.min(1, d.manualScore / pts));
    }
    if (typeof d.earnedPoints === 'number') return Math.max(0, Math.min(1, d.earnedPoints / pts));
    return d.isCorrect ? 1 : 0;
}

// ------------------------------------------
// تسليم واجب معتمد ← أحداث
//   tracking: { [qid]: {surah, ayah, segment, skill, fmt} } من meta الواجب الذكي (قد يكون null لواجب قديم)
//   questions: أسئلة الواجب (لاستنتاج الصيغة/الموضع في الواجبات القديمة)
//   textIndex: فهرس نصوص الآيات (اختياري، للواجبات القديمة)
// ------------------------------------------
export function eventsFromHomeworkSubmission({ studentId, submission, tracking, questions, surahsData, textIndex, ts, source = 'homework' }) {
    const refId = String(submission.id || submission.submissionId || '');
    const qById = new Map((questions || []).map(q => [q.id, q]));
    const events = [];
    (submission.details || []).forEach(d => {
        const score = questionScore(d);
        if (score === null) return;
        const meta = tracking && tracking[d.qid];
        const q = qById.get(d.qid) || null;
        let fmt = meta && meta.fmt || inferHwFormat(q || { type: d.type, question: d.question });
        let skill = (meta && meta.skill) || skillOfHwFormat(fmt);
        let surah = meta ? meta.surah : null, ayah = meta ? meta.ayah : null, segment = meta ? meta.segment : null;
        if (!meta && textIndex && d.question) {
            const hit = locateByText(textIndex, d.question);
            if (hit) { surah = hit.surah; ayah = hit.ayah; segment = segmentIdFor(surahsData, surah, ayah); }
        }
        if (!skill && !segment) return;   // لا مهارة ولا موضع: لا قيمة للحدث
        events.push({
            studentId, ts, source, refId, qid: d.qid,
            surah, ayah, segment, skill: skill || null, fmt: fmt || null,
            score, weight: (fmt && HW_FORMATS[fmt]) ? HW_FORMATS[fmt].weight : 1,
            hint: false, timeSec: null, quality: []
        });
    });
    return events;
}

// ------------------------------------------
// جلسة لعبة/اختبار فردي ← أحداث (reportDetails كما في games/kidsGame.js وadultGame.js)
//   كل عنصر: { type, title, label, num, surahName, isCorrect, errors, usedHint, timeTaken, orderAttempts }
// ------------------------------------------
export function eventsFromGameDetails({ studentId, details, surahsData, ts, refId, source = 'game' }) {
    const events = [];
    (details || []).forEach((d, i) => {
        const skill = skillOfGameType(d.type, d.title || d.label);
        const surah = (surahsData || []).find(s => s.name === d.surahName);
        const ayah = Number(d.num) > 0 ? Number(d.num) : null;
        const segment = surah && ayah ? segmentIdFor(surahsData, surah.number, ayah) : null;
        if (!skill && !segment) return;
        const reordered = (d.orderAttempts || 0) >= 1;
        events.push({
            studentId, ts, source, refId: String(refId), qid: 'g' + i,
            surah: surah ? surah.number : null, ayah, segment, skill, fmt: d.type || null,
            score: d.isCorrect ? (reordered ? 0.75 : 1) : 0,
            weight: 1, hint: !!d.usedHint,
            timeSec: typeof d.timeTaken === 'number' ? Math.round(d.timeTaken) : null,
            quality: parseQualityCodes(d.errors)
        });
    });
    return events;
}

// ------------------------------------------
// قائمة الأخطاء (weaknesses) وأرشيفها (resolvedWeaknesses) ← أحداث
//   خطأ نشط = حدث خاطئ عند dateRecorded. مؤرشَف = خطأ ثم صواب عند dateResolved.
// ------------------------------------------
export function eventsFromWeaknesses({ studentId, weaknesses, resolved, surahsData, beforeTs = Infinity }) {
    const events = [];
    const make = (w, ts, score, tag) => {
        const surah = (surahsData || []).find(s => s.name === w.surahName);
        const ayah = Number(w.num) > 0 ? Number(w.num) : null;
        const segment = surah && ayah ? segmentIdFor(surahsData, surah.number, ayah) : null;
        const skill = skillOfGameType(w.questionType, w.questionTitle || w.questionTypeLabel);
        if (!skill && !segment) return;
        const refId = `weak:${w.dateRecorded || ''}:${w.surahName || ''}:${w.num || ''}:${tag}`;
        events.push({
            studentId, ts, source: 'weakness', refId, qid: tag,
            surah: surah ? surah.number : null, ayah, segment, skill, fmt: w.questionType || null,
            score, weight: 1, hint: false, timeSec: null,
            quality: score < 0.5 ? parseQualityCodes(w.errorTypesList || w.errorTypes) : []
        });
    };
    (weaknesses || []).forEach(w => make(w, Date.parse(w.dateRecorded) || 0, 0, 'wrong'));
    (resolved || []).forEach(w => {
        make(w, Date.parse(w.dateRecorded) || 0, 0, 'wrong');
        if (w.dateResolved) make(w, Date.parse(w.dateResolved) || 0, 1, 'fixed');
    });
    // أخطاء سُجّلت بعد بدء التسجيل الحيّ لجلسات اللعب مغطّاة بأحداث الجلسات نفسها: نستبعدها لئلا تُعدّ مرتين
    return events.filter(e => e.ts > 0 && e.ts < beforeTs);
}
