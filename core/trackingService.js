// core/trackingService.js
// ==========================================================
// 🌟 [جديد — الواجب الذكي] طبقة الربط بين المحرك الخالص (engine/trackingEngine.js، trackingAdapters.js) وبيانات المنصة الفعلية
// (ملف الطالب، السجل الشهري، الواجبات، سجل التقييمات، قاعدة أحداث الأداء). كل ما يلمس AppState/IndexedDB/localStorage هنا،
// وكل المنطق القابل للاختبار في المحرك.
//
// القاعدة الذهبية: فشل أي دالة تسجيل هنا لا يُوقف أبداً مسار المعلم الأصلي (اعتماد درجة، إنهاء لعبة) — الأخطاء تُسجَّل في
// الكونسول فقط، والمستدعون يستعملون .catch(() => {}).
// ==========================================================

import { AppState } from './app.js';
import {
    buildContext, planHomework, skillSummaryForWindow, monthlyStaleness, segmentIdFor
} from '../engine/trackingEngine.js';
import {
    eventsFromHomeworkSubmission, eventsFromGameDetails, eventsFromWeaknesses, buildAyahTextIndex
} from '../engine/trackingAdapters.js';
import { HW_FORMATS } from '../engine/skillMap.js';
import { splitAyahWords } from '../engine/quranEngine.js';
import { readStudentHistory } from './homeworkRecords.js';
import { fetchHomeworkFull } from './homeworkApi.js';

const BACKFILL_FLAG = (id) => `dh_tracking_bf_${id}`;
const RECENT_AYAHS_PER_SEGMENT = 5;

function manager() { return AppState.trackingManager || null; }

async function monthlyRecordsOf(student) {
    try { return await AppState.monthlyMemorizationManager.getAllForStudent(student.id); }
    catch (e) { return []; }
}

// ------------------------------------------
// السياق الكامل لطالب (يشغّل بناء الملف من البيانات الحالية تلقائياً مرة واحدة لكل طالب)
// ------------------------------------------
export async function loadContext(student, { ensureBackfill = true } = {}) {
    if (!manager() || !student) return null;
    if (ensureBackfill) await ensureBackfilled(student);
    const [events, records] = await Promise.all([manager().getEventsForStudent(student.id), monthlyRecordsOf(student)]);
    return buildContext({ surahsData: AppState.surahsData, student, records, events, now: Date.now() });
}

// ------------------------------------------
// تسجيل الأداء الحيّ
// ------------------------------------------

// عند اعتماد تسليم واجب (core/homeworkRecords.js → recordApprovedResult). إعادة الاعتماد تستبدل أحداث نفس التسليم.
export async function recordHomeworkApproval(student, submission) {
    if (!manager() || !student || !submission || !Array.isArray(submission.details)) return 0;
    let hw = null;
    try {
        const all = await AppState.homeworkManager.getAllHomeworks() || [];
        hw = all.find(h => String(h.id) === String(submission.hwId)) || null;
    } catch (e) { /* ننتقل للخادم */ }

    let tracking = hw && hw.tracking || null;
    let questions = hw && hw.questions || null;
    if (!tracking || !questions) {
        const full = await fetchHomeworkFull(submission.hwId);
        if (full) {
            tracking = tracking || (full.meta && full.meta.tracking) || null;
            questions = questions || full.questions || null;
        }
    }
    const ts = Date.parse(submission.approvedAt) || Date.now();
    const sub = { ...submission, id: submission.id || submission.submissionId };
    let textIndex = null;
    if (!tracking && questions) textIndex = await getTextIndex();
    const events = eventsFromHomeworkSubmission({
        studentId: student.id, submission: sub, tracking, questions, surahsData: AppState.surahsData, textIndex, ts
    });
    await manager().replaceEventsForRef(student.id, 'homework', sub.id, events);
    return events.length;
}

// عند انتهاء جلسة لعبة/اختبار فردي (games/kidsGame.js وadultGame.js)
export async function recordGameSession(student, details) {
    if (!manager() || !student || !Array.isArray(details) || !details.length) return 0;
    const ts = Date.now();
    const events = eventsFromGameDetails({
        studentId: student.id, details, surahsData: AppState.surahsData, ts, refId: `game:${student.id}:${ts}`
    });
    return manager().addEvents(events);
}

// ------------------------------------------
// بناء ملف التتبّع من البيانات الحالية (واجبات معتمدة + قائمة الأخطاء وأرشيفها)
// ------------------------------------------
let _textIndexPromise = null;
function getTextIndex() {
    if (!_textIndexPromise) {
        _textIndexPromise = (async () => {
            const all = await AppState.quranEngine.getAyahsBySurahRange(1, 114);
            const bySurah = new Map();
            all.forEach(a => {
                if (!bySurah.has(a.surahNumber)) bySurah.set(a.surahNumber, { number: a.surahNumber, ayahs: [] });
                bySurah.get(a.surahNumber).ayahs.push(a);
            });
            return buildAyahTextIndex([...bySurah.values()]);
        })().catch(e => { _textIndexPromise = null; throw e; });
    }
    return _textIndexPromise;
}

export async function buildBackfill(student) {
    const stats = { homeworkEntries: 0, homeworkEvents: 0, weaknessEvents: 0, gameSessionsNoDetail: 0 };
    const live = await manager().getEventsForStudent(student.id);
    const liveHomeworkRefs = new Set(live.filter(e => e.source === 'homework').map(e => String(e.refId)));
    const liveGameMin = live.filter(e => e.source === 'game').reduce((m, e) => Math.min(m, e.ts), Infinity);

    const events = [];
    const history = readStudentHistory(student.id);
    let hwById = null;
    let textIndex = null;
    for (const entry of history) {
        const hasDetails = Array.isArray(entry.details) && entry.details.length && entry.hwId;
        if (!hasDetails) { if (/game/.test(String(entry.source || ''))) stats.gameSessionsNoDetail++; continue; }
        const refId = String(entry.submissionId || `hist:${entry.hwId}:${entry.timestamp || entry.date}`);
        if (liveHomeworkRefs.has(refId)) continue;      // مغطّى بحدث حيّ
        stats.homeworkEntries++;
        if (!hwById) {
            const all = (await AppState.homeworkManager.getAllHomeworks()) || [];
            hwById = new Map(all.map(h => [String(h.id), h]));
        }
        const hw = hwById.get(String(entry.hwId)) || null;
        const tracking = hw && hw.tracking || null;
        if (!tracking && entry.details.some(d => d.question) && !textIndex) textIndex = await getTextIndex();
        const evs = eventsFromHomeworkSubmission({
            studentId: student.id, submission: { id: refId, details: entry.details },
            tracking, questions: hw && hw.questions || null, surahsData: AppState.surahsData, textIndex,
            ts: entry.timestamp || Date.now(), source: 'backfill_homework'
        });
        stats.homeworkEvents += evs.length;
        events.push(...evs);
    }
    const weak = eventsFromWeaknesses({
        studentId: student.id, weaknesses: student.weaknesses, resolved: student.resolvedWeaknesses,
        surahsData: AppState.surahsData, beforeTs: liveGameMin
    });
    stats.weaknessEvents = weak.length;
    events.push(...weak);
    return { events, stats };
}

// يحذف أحداث الاستخراج القديمة لهذا الطالب ثم يعيد بناءها (آمن للتكرار؛ لا يلمس الأحداث الحيّة)
export async function rebuildFromExisting(student) {
    const { events, stats } = await buildBackfill(student);
    await manager().deleteBySource(student.id, ['backfill_homework', 'weakness']);
    await manager().addEvents(events);
    try { localStorage.setItem(BACKFILL_FLAG(student.id), String(Date.now())); } catch (e) { /* لا يمنع شيئاً */ }
    return stats;
}

async function ensureBackfilled(student) {
    let done = null;
    try { done = localStorage.getItem(BACKFILL_FLAG(student.id)); } catch (e) { /* لا شيء */ }
    if (done) return;
    try { await rebuildFromExisting(student); }
    catch (e) { console.warn('تعذر بناء ملف التتبّع من البيانات الحالية:', e); }
}

// لكل الطلاب دفعة واحدة؛ يرجع مجاميع للعرض. onProgress(done,total)
export async function rebuildAllStudents(onProgress) {
    const students = await AppState.studentManager.getAllStudents();
    const total = { students: students.length, withData: 0, homeworkEvents: 0, weaknessEvents: 0, gameSessionsNoDetail: 0 };
    for (let i = 0; i < students.length; i++) {
        try {
            const st = await rebuildFromExisting(students[i]);
            if (st.homeworkEvents + st.weaknessEvents > 0) total.withData++;
            total.homeworkEvents += st.homeworkEvents; total.weaknessEvents += st.weaknessEvents;
            total.gameSessionsNoDetail += st.gameSessionsNoDetail;
        } catch (e) { console.warn('تعذر بناء ملف التتبّع للطالب', students[i].name, e); }
        if (onProgress) onProgress(i + 1, students.length);
    }
    return total;
}

// ------------------------------------------
// موضع الحفظ الشهري: هل هو قديم؟
// ------------------------------------------
export async function getMonthlyStaleness(student) {
    return monthlyStaleness(await monthlyRecordsOf(student), Date.now());
}

// الطلاب الذين مضى على تحديث موضع حفظهم أكثر من المهلة (أو لا سجل لهم أصلاً وعندهم نطاق مسجَّل)
export async function listStaleMonthlyStudents() {
    const students = (await AppState.studentManager.getAllStudents()).filter(s => !s.isHidden && s.memoFrom && s.memoTo);
    const out = [];
    for (const s of students) {
        const st = await getMonthlyStaleness(s);
        if (st.stale) out.push({ student: s, days: st.days, hasRecords: st.hasRecords });
    }
    return out;
}

// ------------------------------------------
// التقرير الشهري: ملخص المهارات لشهر معيّن (monthIndex من 0 كما في reports/)
// ------------------------------------------
export async function getMonthSkillSummary(student, year, monthIndex) {
    if (!manager()) return null;
    const events = await manager().getEventsForStudent(student.id);
    const from = new Date(year, monthIndex, 1).getTime();
    const to = new Date(year, monthIndex + 1, 1).getTime();
    const sum = skillSummaryForWindow(events, from, to);
    return sum.eventCount ? sum : null;
}

// ------------------------------------------
// تخطيط الواجب الذكي وتوليد أسئلته
// ------------------------------------------

function wordsCount(ayah) { return splitAyahWords(ayah.text).length; }

// focus: null | { type: 'surah', value: رقم } | { type: 'juz', value: رقم }
function makeFocusFilter(focus, pool, path) {
    if (!focus) return { filter: null, multiSurah: new Set(path.segments.map(s => s.surah)).size > 1 };
    let filter;
    if (focus.type === 'surah') {
        filter = (seg) => seg.surah === focus.value;
    } else {
        const ids = new Set();
        pool.forEach(a => { if (a.juz === focus.value) { const id = segmentIdFor(AppState.surahsData, a.surahNumber, a.numberInSurah); if (id) ids.add(id); } });
        filter = (seg) => ids.has(seg.id);
    }
    const surahs = new Set(path.segments.filter(filter).map(s => s.surah));
    return { filter, multiSurah: surahs.size > 1 };
}

function pickAyahFor(item, cands, ctx, poolIndex, rng) {
    const recent = ctx.events.filter(e => e.segment === item.seg.id && e.ayah).sort((a, b) => b.ts - a.ts)
        .slice(0, RECENT_AYAHS_PER_SEGMENT).map(e => e.ayah);
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    let pool = cands;

    if (item.cat === 'err') {
        const st = ctx.states.get(item.seg.id);
        const wanted = st && st.lastWrong && st.lastWrong.ayah;
        const same = wanted ? cands.find(a => a.numberInSurah === wanted) : null;
        if (same && rng() < 0.7) return same;            // نفس الموضع الذي أخطأ فيه بصيغة مختلفة
    }
    if (item.fmt === 'mcq_next') {
        // "ربط": آخر آية في المقطع إن كان المقطع التالي في السورة محفوظاً، وإلا آية تليها آية محفوظة
        const link = poolIndex.has(`${item.seg.surah}:${item.seg.to + 1}`) ? cands.find(a => a.numberInSurah === item.seg.to) : null;
        if (link && rng() < 0.4) return link;
        const ok = cands.filter(a => poolIndex.has(`${a.surahNumber}:${a.numberInSurah + 1}`));
        if (ok.length) pool = ok;
    } else if (item.fmt === 'mcq_prev') {
        const ok = cands.filter(a => a.numberInSurah > 1);
        if (ok.length) pool = ok;
    } else if (item.fmt === 'visual_page') {
        const ok = cands.filter(a => { const n = poolIndex.get(`${a.surahNumber}:${a.numberInSurah + 1}`); return n && n.page === a.page; });
        if (ok.length) pool = ok;
    }
    const fresh = pool.filter(a => !recent.includes(a.numberInSurah));
    return pick(fresh.length ? fresh : pool);
}

// آيات الطالب المحفوظة فعلاً (ضمن مقاطع مساره وحتى موضع توقّفه)
async function loadMemorizedPool(ctx) {
    const surahNums = ctx.path.segments.map(s => s.surah);
    const all = await AppState.quranEngine.getAyahsBySurahRange(Math.min(...surahNums), Math.max(...surahNums));
    return all.filter(a => {
        const id = segmentIdFor(AppState.surahsData, a.surahNumber, a.numberInSurah);
        const seg = id && ctx.path.byId.get(id);
        return seg && a.numberInSurah <= seg.limit;
    });
}

// خيارات «ركّز على»: الأجزاء والسور التي يشملها حفظ الطالب فقط (الأحدث حفظاً أولاً)
export async function listFocusOptions(ctx) {
    const pool = await loadMemorizedPool(ctx);
    const juz = [...new Set(pool.map(a => a.juz).filter(Boolean))].sort((a, b) => b - a);
    const seen = new Set();
    const surahs = [];
    for (let i = ctx.path.segments.length - 1; i >= 0; i--) {
        const n = ctx.path.segments[i].surah;
        if (seen.has(n)) continue;
        seen.add(n);
        const s = AppState.surahsData.find(x => x.number === n);
        if (s) surahs.push({ number: n, name: s.name });
    }
    return { juz, surahs };
}

// صيغ بديلة بترتيب الأنسب حين لا تلائم الآيةُ الصيغةَ المخطَّطة (آيات قصيرة جداً، آخر آية في السورة...). اليدوية التصحيح لا تُستعمل بديلاً
const FALLBACK_FORMATS = ['dropdown', 'mcq_next', 'mcq_prev', 'intruder_word', 'mcq_surah', 'ayah_ending', 'visual_page', 'dual_dropdown', 'checkbox'];

// يبني سؤال البند: الصيغة المخطَّطة أولاً على الآية المختارة، ثم آيات أخرى من نفس المقطع، ثم صيغ بديلة. للبند العلاجي نتجنّب
// صيغة الخطأ السابق في أول جولة (نفس الموضع بشكل مختلف) ثم نسمح بها كحل أخير. يرجع {question, fmt, ayah} أو null.
async function buildWithFallback(item, cands, ctx, poolIndex, pool, hwEngine, multiSurah, rng) {
    const first = pickAyahFor(item, cands, ctx, poolIndex, rng);
    const others = cands.filter(a => a !== first).sort(() => rng() - 0.5).slice(0, 3);
    const ayahs = [first, ...others];
    const state = ctx.states.get(item.seg.id);
    const avoid = new Set(item.cat === 'err' && state && state.lastWrong && state.lastWrong.fmt ? [state.lastWrong.fmt] : []);
    const baseFmts = [item.fmt, ...FALLBACK_FORMATS.filter(f => f !== item.fmt && (multiSurah || f !== 'mcq_surah'))];
    for (const pass of [true, false]) {
        const fmts = pass ? baseFmts.filter(f => !avoid.has(f)) : baseFmts;
        if (pass && !avoid.size) continue;           // لا شيء نتجنّبه: الجولة الثانية تكفي
        for (const ayah of ayahs) {
            for (const fmt of fmts) {
                const built = await hwEngine.buildQuestionForPlan(fmt, ayah, pool, { allowFallback: false });
                if (built) return { ...built, ayah };
            }
        }
    }
    return null;
}

export async function planSmartHomework(student, n, { focus = null, hwEngine, rng = Math.random } = {}) {
    const ctx = await loadContext(student);
    if (!ctx) return { ok: false, reason: 'unavailable' };
    if (!ctx.range.ok) return { ok: false, reason: 'no_range', ctx };

    const pool = await loadMemorizedPool(ctx);
    if (!pool.length) return { ok: false, reason: 'empty', ctx };

    const poolIndex = new Map(pool.map(a => [`${a.surahNumber}:${a.numberInSurah}`, a]));
    const bySeg = new Map();
    pool.forEach(a => {
        const id = segmentIdFor(AppState.surahsData, a.surahNumber, a.numberInSurah);
        if (!bySeg.has(id)) bySeg.set(id, []);
        bySeg.get(id).push(a);
    });

    const { filter, multiSurah } = makeFocusFilter(focus, pool, ctx.path);
    const plan = planHomework({
        n, path: ctx.path, classes: ctx.classes, states: ctx.states, skillStats: ctx.stats,
        now: Date.now(), rng, focusFilter: filter, multiSurah
    });
    if (!plan.items.length) return { ok: false, reason: 'empty', ctx };

    const questions = [], tracking = {}, why = [];
    for (const item of plan.items) {
        const all = bySeg.get(item.seg.id) || [];
        const long = all.filter(a => wordsCount(a) > 3);
        const cands = long.length ? long : all;
        if (!cands.length) continue;
        const built = await buildWithFallback(item, cands, ctx, poolIndex, pool, hwEngine, multiSurah, rng);
        if (!built) continue;
        const { ayah } = built;
        const meta = {
            surah: ayah.surahNumber, ayah: ayah.numberInSurah, segment: item.seg.id,
            skill: HW_FORMATS[built.fmt] ? HW_FORMATS[built.fmt].skill : item.skill, fmt: built.fmt,
            cat: item.cat, level: item.reason.level, skillFocus: item.reason.skillFocus || null,
            lastWrongTs: item.reason.lastWrongTs || null
        };
        tracking[built.question.id] = meta;
        questions.push(built.question);
        why.push(meta);
    }
    return { ok: !!questions.length, reason: questions.length ? null : 'empty', questions, tracking, why, plan, ctx };
}

