// engine/trackingEngine.js
// ==========================================
// 🌟 [جديد — الواجب الذكي] محرك التتبّع والتخطيط. ملف خالص (لا DOM ولا IndexedDB)، يُختبر بـNode:
//   node tests/trackingEngine.test.js
//
// الفكرة: كل أداء للطالب = "حدث" (event) يحمل: الموضع (سورة/آية/مقطع) + المهارة + الصيغة + الدقة + الزمن + جودة الخطأ.
// من سجل الأحداث وحده تُحسب كل الإحصاءات (مستوى كل مقطع، دقة كل مهارة، التشخيص، خطة الواجب القادم)،
// فلا حالة مكرّرة يمكن أن تتناقض، ولو غيّرنا القواعد لاحقاً أعدنا الحساب من نفس الأحداث.
//
// المقطع = عشر آيات متتالية داخل السورة الواحدة (والسورة الأقصر من ذلك مقطع واحد).
// مسار الحفظ = من سورة الناس صعوداً إلى موضع توقّف الطالب (السور تنازلياً بالرقم، والآيات تصاعدياً داخل السورة).
// ==========================================

import { SKILLS, HW_FORMATS, QUALITY, SKILLS_NOT_TRAINABLE_BY_HOMEWORK } from './skillMap.js';

export const SEGMENT_SIZE = 10;
export const DAY_MS = 86400000;

export const THRESHOLDS = {
    weakAcc: 0.6,          // أقل من هذا = مهارة ضعيفة
    strongAcc: 0.9,        // أعلى من هذا = مهارة ممتازة
    minEvidence: 3,        // أقل وزن أدلة للحكم على مهارة
    halfLifeDays: 45,      // أحداث أقدم تفقد وزنها تدريجياً حتى يظهر التحسّن
    errCap: 0.25,          // سقف الأسئلة العلاجية من الواجب
    skillCap: 0.35,        // سقف حصة المهارة الضعيفة من الواجب
    manualCap: 0.2,        // سقف الأسئلة اليدوية التصحيح (حتى لا يُثقَل المعلم)
    staleDays: 30          // موضع الحفظ الأقدم من هذا يُنبَّه المعلم لتحديثه
};

// الفاصل (بالأيام) قبل أن يستحق المقطع المراجعة، بحسب مستواه
export const LEVEL_INTERVAL_DAYS = { needs_fix: 3, shaky: 5, solid: 14, mastered: 30, unseen: 0 };

// ------------------------------------------
// ١) المقاطع ومسار الحفظ
// ------------------------------------------

export function segmentsOfSurah(surahNumber, ayahsCount) {
    const out = [];
    for (let from = 1; from <= ayahsCount; from += SEGMENT_SIZE) {
        out.push({ surah: surahNumber, from, to: Math.min(from + SEGMENT_SIZE - 1, ayahsCount) });
    }
    // ذيل قصير (أقل من 4 آيات) يُضمّ للمقطع السابق بدل مقطع تافه
    if (out.length > 1) {
        const last = out[out.length - 1];
        if (last.to - last.from + 1 < 4) { out[out.length - 2].to = last.to; out.pop(); }
    }
    return out.map(s => ({ ...s, id: `${s.surah}:${s.from}-${s.to}` }));
}

export function segmentIdFor(surahsData, surahNumber, ayahNumber) {
    const surah = (surahsData || []).find(s => s.number === surahNumber);
    if (!surah || !Number.isInteger(ayahNumber) || ayahNumber < 1 || ayahNumber > surah.ayahsCount) return null;
    const seg = segmentsOfSurah(surahNumber, surah.ayahsCount).find(s => ayahNumber >= s.from && ayahNumber <= s.to);
    return seg ? seg.id : null;
}

export function parseSegmentId(id) {
    const m = /^(\d+):(\d+)-(\d+)$/.exec(String(id || ''));
    return m ? { surah: +m[1], from: +m[2], to: +m[3] } : null;
}

// فهرس الحفظ: نفس تعريف engine/memorizationEngine.js (الناس = أول المسار)
export function memorizationIndex(surahsData, surahNumber, ayahNumber) {
    let sum = 0;
    for (const s of surahsData) if (s.number > surahNumber) sum += s.ayahsCount;
    return sum + ayahNumber;
}

function validPosition(surahsData, pos) {
    if (!pos) return false;
    const s = surahsData.find(x => x.number === pos.surahNumber);
    return !!s && Number.isInteger(pos.ayahNumber) && pos.ayahNumber >= 1 && pos.ayahNumber <= s.ayahsCount;
}

// تواريخ السجل الشهري محفوظة كنص ISO (updatedAt/createdAt)؛ نحوّلها لرقم لتعمل المقارنة والـmax
function recordTimestamp(r) {
    const v = r.updatedAt || r.createdAt || 0;
    return typeof v === 'number' ? v : (Date.parse(v) || 0);
}

// أبعد موضع معروف في السجلات الشهرية (بداية أو نهاية أي شهر) على مسار الحفظ
function furthestMonthlyPosition(surahsData, records) {
    let best = null;
    (records || []).forEach(r => {
        [r.beginning, r.ending].forEach(pos => {
            if (!validPosition(surahsData, pos)) return;
            const idx = memorizationIndex(surahsData, pos.surahNumber, pos.ayahNumber);
            if (!best || idx > best.idx) best = { surah: pos.surahNumber, ayah: pos.ayahNumber, idx };
        });
    });
    return best;
}

// يحدّد نطاق حفظ الطالب وموضع توقّفه:
//   مسار الحفظ المعتاد (من الناس نحو البقرة): from >= to بالرقم.
//   الموضع = الأبعد تقدّماً بين (السجل الشهري، نهاية سورة memoTo المسجّلة في ملف الطالب).
//   مسار عكسي (من الأصغر إلى الأكبر): يُعتمد ملف الطالب فقط (لا سجل شهري لأن فهرسه يفترض الاتجاه المعتاد).
export function resolveRange(surahsData, student, records) {
    const byName = (n) => (surahsData || []).find(s => s.name === n);
    const fromS = byName(student && student.memoFrom);
    const toS = byName(student && student.memoTo);
    if (!fromS || !toS) return { ok: false, reason: 'no_range' };

    const backward = fromS.number >= toS.number;
    if (!backward) {
        return { ok: true, direction: 'forward', fromSurah: fromS.number, toSurah: toS.number, frontierAyah: toS.ayahsCount, source: 'student' };
    }
    let frontier = { surah: toS.number, ayah: toS.ayahsCount };
    let source = 'student';
    const monthly = furthestMonthlyPosition(surahsData, records);
    if (monthly && monthly.surah <= fromS.number) {
        const studentIdx = memorizationIndex(surahsData, toS.number, toS.ayahsCount);
        if (monthly.idx > studentIdx) { frontier = { surah: monthly.surah, ayah: monthly.ayah }; source = 'monthly'; }
        else if (monthly.surah === toS.number) { frontier = { surah: monthly.surah, ayah: monthly.ayah }; source = 'monthly'; }
    }
    return { ok: true, direction: 'backward', fromSurah: fromS.number, toSurah: frontier.surah, frontierAyah: frontier.ayah, source };
}

// يبني مسار الحفظ كقائمة مقاطع مرتّبة (الأقدم حفظاً أولاً)
export function buildPath(surahsData, range) {
    const segments = [];
    let cum = 0;
    const step = range.direction === 'backward' ? -1 : 1;
    for (let n = range.fromSurah; step < 0 ? n >= range.toSurah : n <= range.toSurah; n += step) {
        const surah = surahsData.find(s => s.number === n);
        if (!surah) continue;
        const limit = (n === range.toSurah) ? Math.min(range.frontierAyah, surah.ayahsCount) : surah.ayahsCount;
        segmentsOfSurah(n, surah.ayahsCount).forEach(seg => {
            if (seg.from > limit) return;
            const lim = Math.min(seg.to, limit);
            const count = lim - seg.from + 1;
            segments.push({ ...seg, limit: lim, count, cumBefore: cum, cumEnd: cum + count });
            cum += count;
        });
    }
    return { segments, total: cum, byId: new Map(segments.map(s => [s.id, s])) };
}

export function pathPosition(path, surah, ayah) {
    const seg = path.segments.find(s => s.surah === surah && ayah >= s.from && ayah <= s.to);
    if (!seg) return null;
    return seg.cumBefore + Math.min(ayah, seg.limit) - seg.from + 1;
}

// تصنيف المقاطع: new (حفظ الشهر الحالي) / near (الشهر السابق) / far (ما قبله)
export function classifyPath(path, surahsData, records) {
    const classes = new Map();
    const N = path.total;
    if (!N) return classes;

    const dated = (records || [])
        .filter(r => validPosition(surahsData, r.beginning))
        .sort((a, b) => (a.year - b.year) || (a.month - b.month));
    let newStart, nearStart;
    if (dated.length) {
        const posOf = (r) => pathPosition(path, r.beginning.surahNumber, r.beginning.ayahNumber);
        const last = posOf(dated[dated.length - 1]);
        const prev = dated.length > 1 ? posOf(dated[dated.length - 2]) : null;
        newStart = (last != null) ? last - 1 : N - Math.max(10, Math.round(N * 0.1));
        nearStart = (prev != null && prev < newStart) ? prev - 1 : newStart - Math.max(20, Math.round(N * 0.2));
    } else {
        newStart = N - Math.max(10, Math.round(N * 0.1));
        nearStart = newStart - Math.max(20, Math.round(N * 0.2));
    }
    path.segments.forEach(seg => {
        classes.set(seg.id, seg.cumEnd > newStart ? 'new' : (seg.cumEnd > nearStart ? 'near' : 'far'));
    });
    return classes;
}

// عمر آخر تحديث لموضع الحفظ الشهري (بالأيام)؛ null = لا سجلات إطلاقاً
export function monthlyStaleness(records, now) {
    const stamps = (records || []).map(recordTimestamp).filter(Boolean);
    if (!stamps.length) return { hasRecords: false, days: null, stale: true };
    const days = Math.floor((now - Math.max(...stamps)) / DAY_MS);
    return { hasRecords: true, days, stale: days > THRESHOLDS.staleDays };
}

// ------------------------------------------
// ٢) من الأحداث إلى حالة كل مقطع
// ------------------------------------------

export function eventScore(ev) {
    if (typeof ev.score === 'number') return Math.max(0, Math.min(1, ev.score));
    return ev.isCorrect ? 1 : 0;
}

function qualityForces(ev) {
    return (ev.quality || []).some(c => QUALITY[c] && QUALITY[c].forceFix);
}

export const UNSEEN_STATE = Object.freeze({
    level: 'unseen', attempts: 0, wrong: 0, lastTs: 0, dueTs: 0, streak: 0,
    recentFmts: [], lastWrong: null, lastWrongTs: 0, formatsSeen: 0
});

export function computeSegmentStates(events, now = Date.now()) {
    const groups = new Map();
    (events || []).forEach(ev => {
        if (!ev.segment) return;
        if (!groups.has(ev.segment)) groups.set(ev.segment, []);
        groups.get(ev.segment).push(ev);
    });

    const states = new Map();
    groups.forEach((list, segId) => {
        list.sort((a, b) => a.ts - b.ts);
        let streak = 0, streakStart = 0, streakFmts = new Set(), wrong = 0;
        let lastWrong = null, lastWrongTs = 0;
        const outcomes = [];
        const allFmts = new Set();
        list.forEach(ev => {
            const s = eventScore(ev);
            const forced = qualityForces(ev);
            const isCorrect = s >= 0.99 && !forced && !ev.hint;
            const isWrong = s < 0.5 || forced;
            if (ev.fmt) allFmts.add(ev.fmt);
            if (isCorrect) {
                streak++;
                if (streak === 1) { streakStart = ev.ts; streakFmts = new Set(); }
                streakFmts.add(ev.fmt || ev.skill || 'x');
                outcomes.push('c');
            } else if (isWrong) {
                streak = 0; wrong++;
                lastWrong = { ayah: ev.ayah || null, fmt: ev.fmt || null, skill: ev.skill || null, ts: ev.ts };
                lastWrongTs = ev.ts;
                outcomes.push('w');
            } else {
                streak = 0;
                outcomes.push('p');
            }
        });
        const last = list[list.length - 1];
        const last3 = outcomes.slice(-3);
        let level;
        if (outcomes[outcomes.length - 1] === 'w' || last3.filter(o => o === 'w').length >= 2) level = 'needs_fix';
        else if (streak >= 3 && streakFmts.size >= 2 && (last.ts - streakStart) >= 14 * DAY_MS) level = 'mastered';
        else if (streak >= 2) level = 'solid';
        else level = 'shaky';

        states.set(segId, {
            level, attempts: list.length, wrong, streak,
            lastTs: last.ts, dueTs: last.ts + LEVEL_INTERVAL_DAYS[level] * DAY_MS,
            recentFmts: list.slice(-3).map(e => e.fmt).filter(Boolean),
            lastWrong, lastWrongTs, formatsSeen: allFmts.size
        });
    });
    return states;
}

// ------------------------------------------
// ٣) إحصاءات المهارات والتشخيص
// ------------------------------------------

export function computeSkillStats(events, now = Date.now(), { decay = true } = {}) {
    const stats = {};
    SKILLS.forEach(sk => { stats[sk] = { rawN: 0, n: 0, correct: 0, count: 0, acc: null, enough: false, wrongSegments: new Set(), wrongCount: 0 }; });
    (events || []).forEach(ev => {
        const st = stats[ev.skill];
        if (!st) return;
        let w = (typeof ev.weight === 'number') ? ev.weight : 1;
        if (ev.hint) w *= 0.5;
        const ageDays = Math.max(0, (now - ev.ts) / DAY_MS);
        const decayed = decay ? w * Math.pow(0.5, ageDays / THRESHOLDS.halfLifeDays) : w;
        const s = eventScore(ev);
        st.rawN += w; st.n += decayed; st.correct += decayed * s; st.count++;
        if (s < 0.5) { st.wrongCount++; if (ev.segment) st.wrongSegments.add(ev.segment); }
    });
    SKILLS.forEach(sk => {
        const st = stats[sk];
        st.acc = st.n > 0 ? st.correct / st.n : null;
        st.enough = st.rawN >= THRESHOLDS.minEvidence;
    });
    return stats;
}

export function qualityCounts(events) {
    const out = {};
    Object.keys(QUALITY).forEach(k => { out[k] = 0; });
    (events || []).forEach(ev => (ev.quality || []).forEach(c => { if (c in out) out[c]++; }));
    return out;
}

// تشخيص تلقائي بالرموز؛ الواجهة تصوغ الجمل العربية منها
//   skill_weak   : مهارة دقتها ضعيفة وأخطاؤها متفرقة على ≥2 مقطع (ضعف مهارة)
//   segment_weak : مقطع أخطأ فيه الطالب بصيغ/مهارات مختلفة (ضعف موضع لا مهارة)
//   skill_strong : مهارة ممتازة
//   skill_few    : بيانات غير كافية
export function diagnose(events, states, stats) {
    const out = [];
    SKILLS.forEach(sk => {
        const st = stats[sk];
        if (!st || st.count === 0) return;
        if (!st.enough) { out.push({ kind: 'skill_few', skill: sk, count: st.count }); return; }
        if (st.acc < THRESHOLDS.weakAcc) {
            const segs = st.wrongSegments.size;
            if (segs >= 2) out.push({ kind: 'skill_weak', skill: sk, acc: st.acc, segments: segs });
        } else if (st.acc >= THRESHOLDS.strongAcc) {
            out.push({ kind: 'skill_strong', skill: sk, acc: st.acc });
        }
    });
    // ضعف المواضع: مقطع بأخطاء متعددة بصيغ مختلفة
    const wrongBySeg = new Map();
    (events || []).forEach(ev => {
        if (!ev.segment || eventScore(ev) >= 0.5) return;
        if (!wrongBySeg.has(ev.segment)) wrongBySeg.set(ev.segment, { fmts: new Set(), n: 0 });
        const g = wrongBySeg.get(ev.segment);
        g.n++; g.fmts.add(ev.fmt || ev.skill || 'x');
    });
    wrongBySeg.forEach((g, seg) => {
        const lvl = states.get(seg);
        if (g.n >= 2 && lvl && lvl.level === 'needs_fix') out.push({ kind: 'segment_weak', segment: seg, wrongs: g.n, formats: g.fmts.size });
    });
    out.sort((a, b) => rank(a.kind) - rank(b.kind));
    return out;
    function rank(k) { return { skill_weak: 0, segment_weak: 1, skill_strong: 2, skill_few: 3 }[k] ?? 9; }
}

// ملخص شهري/فترة: إحصاءات المهارات لأحداث نافذة زمنية [fromTs, toTs) بلا تقادم (للتقرير الشهري)
export function skillSummaryForWindow(events, fromTs, toTs) {
    const inWindow = (events || []).filter(e => e.ts >= fromTs && e.ts < toTs);
    return {
        eventCount: inWindow.length,
        stats: computeSkillStats(inWindow, toTs, { decay: false }),
        quality: qualityCounts(inWindow)
    };
}

// السياق الكامل لطالب: كل ما تحتاجه شاشات الملف والتخطيط، محسوباً من الأحداث والسجلات الشهرية وملف الطالب
export function buildContext({ surahsData, student, records, events, now = Date.now() }) {
    const range = resolveRange(surahsData, student, records);
    const stale = monthlyStaleness(records, now);
    const stats = computeSkillStats(events, now);
    const quality = qualityCounts(events);
    const base = { range, stale, events: events || [], stats, quality, eventCount: (events || []).length };
    if (!range.ok) return { ...base, path: null, classes: null, states: new Map(), diagnosis: [], levels: {} };

    const path = buildPath(surahsData, range);
    const classes = classifyPath(path, surahsData, records);
    const states = computeSegmentStates(events, now);
    const levels = { unseen: 0, needs_fix: 0, shaky: 0, solid: 0, mastered: 0 };
    path.segments.forEach(seg => { const st = states.get(seg.id); levels[st ? st.level : 'unseen']++; });
    return { ...base, path, classes, states, levels, diagnosis: diagnose(events, states, stats) };
}

// ------------------------------------------
// ٤) تخطيط الواجب الذكي
// ------------------------------------------

const LEVEL_PREF = {
    unseen:    { recognition: 3,   recall: 1, production: 0 },
    needs_fix: { recognition: 2,   recall: 2, production: 0 },
    shaky:     { recognition: 2,   recall: 2, production: 0 },
    solid:     { recognition: 1,   recall: 3, production: 0.5 },
    mastered:  { recognition: 0.5, recall: 2, production: 2 }
};

function weightedPick(candidates, weightOf, rng) {
    const total = candidates.reduce((s, c) => s + weightOf(c), 0);
    if (total <= 0) return candidates[Math.floor(rng() * candidates.length)];
    let r = rng() * total;
    for (const c of candidates) { r -= weightOf(c); if (r <= 0) return c; }
    return candidates[candidates.length - 1];
}

function shuffled(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
}

function scoreSegment(seg, state, now, rng) {
    let sc = rng() * 0.3;
    if (state.level === 'unseen') return sc + 1.0;
    const interval = Math.max(1, LEVEL_INTERVAL_DAYS[state.level]) * DAY_MS;
    sc += Math.max(-1, Math.min(3, (now - state.dueTs) / interval));
    if (state.level === 'shaky') sc += 0.5;
    return sc;
}

function takeSegments(pool, k, states, now, rng) {
    const picks = [];
    if (!pool.length || k <= 0) return picks;
    while (picks.length < k) {
        const ranked = pool
            .map(s => ({ s, sc: scoreSegment(s, states.get(s.id) || UNSEEN_STATE, now, rng) }))
            .sort((a, b) => b.sc - a.sc);
        for (const r of ranked) { picks.push(r.s); if (picks.length >= k) break; }
    }
    return picks;
}

// يرجع: { items:[{seg, cat, fmt, skill, reason}], quotas, weakSkills, skillSlots }
export function planHomework({ n, path, classes, states, skillStats, now = Date.now(), rng = Math.random,
                               focusFilter = null, multiSurah = true, opts = {} }) {
    const o = { errCap: THRESHOLDS.errCap, skillCap: THRESHOLDS.skillCap, manualCap: THRESHOLDS.manualCap, ...opts };
    const segs = (path.segments || []).filter(s => !focusFilter || focusFilter(s));
    if (!segs.length || !(n > 0)) return { items: [], quotas: {}, weakSkills: [], skillSlots: 0 };
    const stOf = (id) => states.get(id) || UNSEEN_STATE;

    // ١) المقاطع العلاجية (سقف 25%، ولا شيء لمن لا أخطاء له)
    const errCands = segs.filter(s => stOf(s.id).level === 'needs_fix')
        .sort((a, b) => stOf(b.id).lastWrongTs - stOf(a.id).lastWrongTs);
    const errN = n >= 4 ? Math.min(errCands.length, Math.max(1, Math.floor(n * o.errCap))) : 0;
    const errSegs = errCands.slice(0, errN);
    const errSet = new Set(errSegs.map(s => s.id));

    // ٢) باقي الحصص: جديد 25% / بعيد 25% / قريب الباقي
    const r = n - errN;
    const quota = { new: Math.round(r * 0.25), far: Math.round(r * 0.25), near: 0 };
    quota.near = r - quota.new - quota.far;
    const pools = { new: [], near: [], far: [] };
    segs.forEach(s => { if (!errSet.has(s.id)) pools[classes.get(s.id) || 'far'].push(s); });

    let spill = 0;
    ['new', 'near', 'far'].forEach(c => {
        if (!pools[c].length && quota[c] > 0) {
            const target = ['near', 'far', 'new'].find(x => pools[x].length && x !== c);
            if (target) quota[target] += quota[c]; else spill += quota[c];
            quota[c] = 0;
        }
    });

    const picked = [];
    errSegs.forEach(s => picked.push({ seg: s, cat: 'err' }));
    ['new', 'near', 'far'].forEach(c => takeSegments(pools[c], quota[c], states, now, rng).forEach(s => picked.push({ seg: s, cat: c })));
    if (spill > 0) takeSegments(segs, spill, states, now, rng).forEach(s => picked.push({ seg: s, cat: classes.get(s.id) || 'far' }));

    // ٣) المهارات الضعيفة تأخذ حصة موزونة (لا كل الواجب)
    const weakSkills = SKILLS
        .filter(sk => !SKILLS_NOT_TRAINABLE_BY_HOMEWORK.includes(sk) && skillStats[sk] && skillStats[sk].enough && skillStats[sk].acc < THRESHOLDS.weakAcc)
        .sort((a, b) => skillStats[a].acc - skillStats[b].acc);
    const skillSlots = weakSkills.length ? Math.min(picked.length, Math.ceil(n * o.skillCap)) : 0;

    // ٤) اختيار الصيغة لكل بند
    const order = shuffled(picked, rng);
    const maxManual = Math.floor(n * o.manualCap);
    const maxVisual = n >= 6 ? Math.max(1, Math.floor(n / 8)) : 0;
    const maxSurahQ = Math.max(1, Math.round(n / 6));
    let manualUsed = 0, visualUsed = 0, surahQUsed = 0, rr = 0;

    order.forEach((item, idx) => {
        const state = stOf(item.seg.id);
        let skillFocus = null;
        if (idx < skillSlots) skillFocus = weakSkills[rr++ % weakSkills.length];

        const baseFilter = (fmt) => {
            const def = HW_FORMATS[fmt];
            if (fmt === 'mcq_surah' && (!multiSurah || surahQUsed >= maxSurahQ)) return false;
            if (fmt === 'visual_page' && visualUsed >= maxVisual) return false;
            if (def.manual && manualUsed >= maxManual) return false;
            return true;
        };
        let fmts = Object.keys(HW_FORMATS).filter(baseFilter);
        // لا نكرر صيغ هذا المقطع الأخيرة، ولا صيغة الخطأ الأخير (نفس السؤال بشكل مختلف)
        const avoid = new Set(state.recentFmts.slice(-2));
        if (state.lastWrong && state.lastWrong.fmt) avoid.add(state.lastWrong.fmt);
        const fresh = fmts.filter(f => !avoid.has(f));
        if (fresh.length) fmts = fresh;
        if (skillFocus) {
            const forSkill = fmts.filter(f => HW_FORMATS[f].skill === skillFocus);
            if (forSkill.length) fmts = forSkill;
        } else if (item.cat === 'err' && state.lastWrong && state.lastWrong.skill) {
            const same = fmts.filter(f => HW_FORMATS[f].skill === state.lastWrong.skill);
            if (same.length && rng() < 0.6) fmts = same;
        }
        const pref = LEVEL_PREF[state.level] || LEVEL_PREF.unseen;
        const fmt = weightedPick(fmts, f => {
            const d = HW_FORMATS[f];
            let w = pref[d.level] || 0.1;
            if (d.skill === 'visual') w *= 0.5;
            return w;
        }, rng);

        const def = HW_FORMATS[fmt];
        if (def.manual) manualUsed++;
        if (fmt === 'visual_page') visualUsed++;
        if (fmt === 'mcq_surah') surahQUsed++;
        item.fmt = fmt;
        item.skill = def.skill;
        item.reason = { cat: item.cat, level: state.level, skillFocus, lastWrongTs: state.lastWrongTs || null };
    });

    // ٥) ترتيب مخلوط (لا مصحف ولا مسار حفظ)، ويبدأ الواجب بسؤال سهل لبناء الثقة
    let finalOrder = shuffled(order, rng);
    const easy = finalOrder.findIndex(it => it.cat !== 'err' && HW_FORMATS[it.fmt].level === 'recognition' && !HW_FORMATS[it.fmt].manual);
    if (easy > 0) { const [it] = finalOrder.splice(easy, 1); finalOrder.unshift(it); }

    return {
        items: finalOrder,
        quotas: { err: errN, new: quota.new, near: quota.near, far: quota.far },
        weakSkills, skillSlots
    };
}
