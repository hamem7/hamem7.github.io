// engine/similarityMastery.js
//
// 🌟 [جديد — 2026-10-11] نموذج إتقان المتشابهات لكل طالب: دوال خالصة (بلا DOM ولا IndexedDB) فيمكن
// اختبارها بـ Node مباشرة. الفكرة: لكل (طالب × مجموعة متشابهة) سجل واحد بـ"صندوق" 0–5 (طريقة لايتنر
// المبسّطة): جولة بلا أخطاء في المجموعة ترفع الصندوق درجة، وأي خطأ يُنزله درجتين. الصندوق يحدد موعد
// المراجعة القادم (dueAt) ومستوى الإتقان المعروض للمعلم.
//
// ⚠️ المفتاح هو "توقيع" المجموعة (groupSignature) وليس groupId، لأن groupId ترقيم يتغيّر كلما أُعيد بناء
// بيانات الـ Seed (رُفعت نسخته عدة مرات)، بينما توقيع (السورة + أرقام الآيات) يبقى ثابتاً لنفس المتشابهة.

export const BOX_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];
export const MAX_BOX = BOX_INTERVAL_DAYS.length - 1;
export const MASTERED_BOX = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

// توقيع ثابت للمجموعة: متشابهات داخل السورة = "<سورة>:<آيات مرتّبة>"، وجزء عمّ = "amma:<سورة-نطاق,...>"
export function groupSignature(group) {
    const occs = (group && group.occurrences) || [];
    if (group && group.scope === 'internal') {
        const surah = (group.surahs && group.surahs[0]) || (occs[0] && occs[0].surahNumber) || 0;
        const ayahs = occs.map(o => o.ayahNumber).filter(n => n != null).sort((a, b) => a - b);
        return `${surah}:${[...new Set(ayahs)].join(',')}`;
    }
    const parts = occs.map(o => `${o.surahNumber}-${o.ayahRange || o.ayahNumber || ''}`).sort();
    return `amma:${parts.join(',')}`;
}

export function createEmptyProgress(studentId, sig, meta = {}) {
    return {
        studentId, sig,
        groupId: meta.groupId || null,
        anchorPhrase: meta.anchorPhrase || '',
        surahs: meta.surahs || [],
        scope: meta.scope || 'internal',
        attempts: 0,      // عدد الأسئلة المُجابة
        correct: 0,       // عدد الأسئلة الصحيحة
        rounds: 0,        // عدد الجولات التي ظهرت فيها المجموعة
        box: 0,
        streak: 0,        // جولات متتالية بلا أخطاء
        lastAt: null,
        dueAt: null
    };
}

// تطبيق نتيجة جولة واحدة على سجل المجموعة. results = [{ isCorrect, type }] لأسئلة هذه المجموعة في الجولة.
export function applyRoundToProgress(record, results, now = Date.now()) {
    const rec = { ...record };
    const total = results.length;
    if (total === 0) return rec;
    const right = results.filter(r => r.isCorrect).length;
    rec.attempts += total;
    rec.correct += right;
    rec.rounds += 1;
    if (right === total) {
        rec.box = Math.min(MAX_BOX, rec.box + 1);
        rec.streak += 1;
    } else {
        rec.box = Math.max(0, rec.box - 2);
        rec.streak = 0;
    }
    rec.lastAt = now;
    rec.dueAt = now + BOX_INTERVAL_DAYS[rec.box] * DAY_MS;
    return rec;
}

// مستوى الإتقان: new (لم يُلعب) | learning | improving | mastered | review (متقن لكن حان موعد مراجعته)
export function levelOf(record, now = Date.now()) {
    if (!record || !record.attempts) return 'new';
    if (record.box >= MASTERED_BOX) return (record.dueAt && now > record.dueAt) ? 'review' : 'mastered';
    if (record.box >= 2) return 'improving';
    return 'learning';
}

export function isDue(record, now = Date.now()) {
    return !!record && !!record.attempts && !!record.dueAt && now >= record.dueAt;
}

// نسبة الإجابات الصحيحة (0–100) أو null بلا محاولات
export function accuracyOf(record) {
    if (!record || !record.attempts) return null;
    return Math.round((record.correct / record.attempts) * 100);
}

// ملخص عام لطالب من كل سجلاته
export function summarizeProgress(records, now = Date.now()) {
    const s = { total: records.length, mastered: 0, improving: 0, learning: 0, review: 0, attempts: 0, correct: 0 };
    records.forEach(r => {
        const lv = levelOf(r, now);
        if (s[lv] !== undefined) s[lv] += 1;
        s.attempts += r.attempts || 0;
        s.correct += r.correct || 0;
    });
    s.accuracy = s.attempts ? Math.round((s.correct / s.attempts) * 100) : null;
    return s;
}

// تجميع إجابات جولة كاملة حسب المجموعة. answers = [{ sig, groupId, anchorPhrase, surahs, scope, type, isCorrect }]
export function groupAnswersBySignature(answers) {
    const map = new Map();
    answers.forEach(a => {
        if (!map.has(a.sig)) map.set(a.sig, { sig: a.sig, groupId: a.groupId, anchorPhrase: a.anchorPhrase, surahs: a.surahs, scope: a.scope, results: [] });
        map.get(a.sig).results.push({ isCorrect: a.isCorrect, type: a.type });
    });
    return [...map.values()];
}

// ملخص حسب نوع السؤال: { type: { n, c } }
export function summarizeByType(answers) {
    const out = {};
    answers.forEach(a => {
        const o = out[a.type] || (out[a.type] = { n: 0, c: 0 });
        o.n += 1;
        if (a.isCorrect) o.c += 1;
    });
    return out;
}
