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
    buildContext, planHomework, skillSummaryForWindow, monthlyStaleness, segmentIdFor,
    hizbOfQuarter, groupSegments, coverageOf, coverageAdvice, suggestGroups, selectionSegIds, DAY_MS
} from '../engine/trackingEngine.js';
import {
    eventsFromHomeworkSubmission, eventsFromGameDetails, eventsFromWeaknesses, buildAyahTextIndex
} from '../engine/trackingAdapters.js';
import { HW_FORMATS } from '../engine/skillMap.js';
import { splitAyahWords, cleanAyahText } from '../engine/quranEngine.js';
import { buildHomeworkSimilarityQuestion } from '../engine/similarityEngine.js';
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
            const all = await getAllAyahs();
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

// ------------------------------------------
// بيانات المصحف المشتركة (كل الآيات مرة واحدة): فهرس النصوص، خريطة الأرباع/الأحزاب، وآيات الطالب المحفوظة
// ------------------------------------------
let _allAyahsPromise = null;
function getAllAyahs() {
    if (!_allAyahsPromise) {
        _allAyahsPromise = AppState.quranEngine.getAyahsBySurahRange(1, 114).catch(e => { _allAyahsPromise = null; throw e; });
    }
    return _allAyahsPromise;
}

let _quranMeta = null;
async function getQuranMeta() {
    if (_quranMeta) return _quranMeta;
    const all = await getAllAyahs();
    const quarterByAyah = new Map(), hizbTotal = new Map(), quarterTotal = new Map(), quarterName = new Map();
    all.forEach(a => {
        const q = a.hizbQuarter;
        if (!q) return;
        // اسم الربع/الحزب = أول كلمات أول آية فيه (كما يُسمّى الحزب في المصحف: «سيقول السفهاء»...)
        if (!quarterName.has(q) && a.text) quarterName.set(q, cleanAyahText(a.text).split(/\s+/).slice(0, 3).join(' '));   // بلا البسملة الملصقة بأول آية السورة
        quarterByAyah.set(`${a.surahNumber}:${a.numberInSurah}`, q);
        const h = hizbOfQuarter(q);
        hizbTotal.set(h, (hizbTotal.get(h) || 0) + 1);
        quarterTotal.set(q, (quarterTotal.get(q) || 0) + 1);
    });
    _quranMeta = { quarterByAyah, hizbTotal, quarterTotal, quarterName };
    return _quranMeta;
}

// آيات الطالب المحفوظة فعلاً (ضمن مقاطع مساره وحتى موضع توقّفه). نسخ سطحية: صيغ الأسئلة تعدّل نص الآية في مكانها
async function loadMemorizedPool(ctx) {
    const all = await getAllAyahs();
    return all.filter(a => {
        const id = segmentIdFor(AppState.surahsData, a.surahNumber, a.numberInSurah);
        const seg = id && ctx.path.byId.get(id);
        return seg && a.numberInSurah <= seg.limit;
    }).map(a => ({ ...a }));
}

// ------------------------------------------
// خريطة الحفظ في شاشة الإعداد: الأحزاب (أو الأرباع لحفظ صغير)، التغطية، «اقترح لي»، «أكمل»
// ------------------------------------------
const PENDING_DAYS = 14;                       // واجب أُسند ولم يُسلَّم خلال هذه المدة يُعدّ «مُسنَداً» لا «غير مغطّى»
const DEFAULT_CYCLE_WEEKS = 6;                 // دورة المراجعة: كل مقطع يُفحص مرة كل هذه المدة تقريباً

export function getCycleWeeks() {
    try { const v = Number(localStorage.getItem('dh_hw_cycle_weeks')); if (v >= 1 && v <= 26) return Math.round(v); } catch (e) { /* لا شيء */ }
    return DEFAULT_CYCLE_WEEKS;
}
export function setCycleWeeks(v) {
    try { localStorage.setItem('dh_hw_cycle_weeks', String(Math.max(1, Math.min(26, Math.round(Number(v) || DEFAULT_CYCLE_WEEKS))))); } catch (e) { /* لا شيء */ }
}

// مقاطع أُسندت للطالب في واجبات منشورة حديثة قد لا تكون سُلّمت بعد (فلا تظهر بعد في أحداث الأداء)
export async function getPendingSegIds(student, now = Date.now()) {
    const out = new Set();
    try {
        const all = (await AppState.homeworkManager.getAllHomeworks()) || [];
        const since = now - PENDING_DAYS * DAY_MS;
        all.forEach(h => {
            if (h.status !== 'published' || h.assignedStudentName !== student.name || !h.tracking) return;
            if ((Date.parse(h.createdAt) || 0) < since) return;
            Object.values(h.tracking).forEach(m => { if (m && m.segment) out.add(m.segment); });
        });
    } catch (e) { /* التنبيه إضافي */ }
    return out;
}

const LASTSCOPE_KEY = (studentId) => `dh_hw_lastscope_${studentId}`;
// نطاق آخر واجب أُنشئ لطالب: { mode, ids, unit, label, segIds[], ts } — يُبنى منه اقتراح «أكمل»
export function saveLastScope(student, scope) {
    try { localStorage.setItem(LASTSCOPE_KEY(student.id), JSON.stringify({ ...scope, ts: Date.now() })); } catch (e) { /* لا شيء */ }
}
export function getLastScope(student) {
    try {
        const v = JSON.parse(localStorage.getItem(LASTSCOPE_KEY(student.id)));
        return v && Array.isArray(v.segIds) && v.segIds.length ? v : null;
    } catch (e) { return null; }
}

// نموذج الاختيار: المجموعات (أحزاب/أرباع) بتغطيتها، والسور، والتغطية الكلية
export async function buildSelectionModel(student, ctx, { unit = null, cycleWeeks = getCycleWeeks() } = {}) {
    const now = Date.now();
    const meta = await getQuranMeta();
    const useUnit = unit || (ctx.path.total <= 700 ? 'quarter' : 'hizb');   // حفظ حتى ~3 أجزاء: أرباع، وأكبر: أحزاب
    const groups = groupSegments(ctx.path, (s, a) => meta.quarterByAyah.get(`${s}:${a}`) || null, useUnit);
    const pendingSegIds = await getPendingSegIds(student, now);
    const cycleDays = cycleWeeks * 7;
    const cov = (segIds) => coverageOf(segIds, ctx.events, now, { cycleDays, pendingSegIds });
    const lastTsBySeg = new Map();
    ctx.events.forEach(e => { if (e.segment) lastTsBySeg.set(e.segment, Math.max(lastTsBySeg.get(e.segment) || 0, e.ts)); });
    groups.forEach(g => {
        g.name = meta.quarterName.get(useUnit === 'quarter' ? g.key : (g.hizb - 1) * 4 + 1) || '';
        g.cov = cov(g.segIds);
        g.lastTs = g.segIds.reduce((m, id) => Math.max(m, lastTsBySeg.get(id) || 0), 0);
        g.fixCount = g.segIds.filter(id => (ctx.states.get(id) || {}).level === 'needs_fix').length;
        const total = useUnit === 'quarter' ? meta.quarterTotal.get(g.key) : meta.hizbTotal.get(g.key);
        g.pctMemorized = total ? Math.min(100, Math.round(g.ayahs / total * 100)) : 100;
    });
    // الجزئية ذات معنى للمجموعة الأخيرة فقط (آخر ما بلغه الطالب)؛ غيرها مكتمل، وفرقها الظاهري سببه نسب المقطع لمجموعة أول آية فيه
    groups.forEach((g, i) => { if (i < groups.length - 1) g.pctMemorized = 100; });
    const bySurah = new Map();
    ctx.path.segments.forEach(seg => {
        if (!bySurah.has(seg.surah)) bySurah.set(seg.surah, { number: seg.surah, name: (AppState.surahsData.find(x => x.number === seg.surah) || {}).name || String(seg.surah), segIds: [] });
        bySurah.get(seg.surah).segIds.push(seg.id);
    });
    const surahs = [...bySurah.values()].map(x => ({ ...x, cov: cov(x.segIds) }));
    return { unit: useUnit, groups, surahs, cov, pendingSegIds, cycleWeeks, cycleDays, now, allSegIds: ctx.path.segments.map(s => s.id) };
}

// «أكمل»: ما لم يُغطَّ بعد من نطاق آخر واجب (إن كان ضمن الدورة)، أو null
export function getResumeInfo(student, ctx, model) {
    const last = getLastScope(student);
    if (!last || Date.now() - last.ts > model.cycleDays * DAY_MS) return null;
    const valid = last.segIds.filter(id => ctx.path.byId.has(id));
    if (!valid.length) return null;
    const c = model.cov(valid);
    return { label: last.label || '', total: valid.length, uncoveredCount: c.uncoveredCount, uncovered: c.uncovered, pendingCount: c.pending,
             pct: Math.round((valid.length - c.uncoveredCount) / valid.length * 100) };
}

// «اقترح لي»: معرّفات المجموعات الأحوج للفحص بحيث يغطيها n سؤال تقريباً
export function suggestSelection(model, ctx, n) {
    return suggestGroups(model.groups, ctx.states, (g) => g.cov, model.now, { targetSegs: n, maxGroups: 3 });
}

// المقاطع المسموحة لاختيار (null = كل النطاق)
export function resolveAllowedSegIds(student, ctx, model, selection) {
    const last = getLastScope(student);
    const resume = selection && selection.mode === 'resume' ? getResumeInfo(student, ctx, model) : null;
    return selectionSegIds({
        path: ctx.path, groups: model.groups, selection,
        lastScopeSegIds: last ? last.segIds : [], uncoveredSet: new Set(resume ? resume.uncovered : [])
    });
}

export { coverageAdvice };

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


// 🌟 [جديد — 2026-10-10] أسئلة المتشابهات داخل الواجب الذكي (بطلب المعلم: سؤالان). نختار مجموعات متشابهات محفوظة كلها
// عند الطالب (كل مواضعها داخل مجمّع آياته المحفوظة) ومن السور الواقعة في نطاق الواجب المختار، ثم نحوّل كل واحدة لسؤال mcq.
// أي فشل (لا مدير متشابهات، لا مجموعات صالحة...) يرجع مصفوفة فارغة فيستمر الواجب بدونها كما كان.
// العدد يتناسب مع طول الواجب: سؤال لكل 10 أسئلة (10 → 1، 20 → 2، 30 → 3...) وبحدٍّ أدنى سؤال واحد
export const similarityCountFor = (n) => Math.max(1, Math.round(n / 10));

async function pickSimilarityQuestions(k, poolIndex, scopeSurahs, rng, manager) {
    if (k <= 0) return [];
    try {
        manager = manager || AppState.similaritiesManager;
        if (!manager) return [];
        if (AppState.similaritiesReady) await AppState.similaritiesReady;
        const all = await manager.getAllSimilarities();
        const memorized = (o) => {
            const ayah = o.ayahNumber != null ? o.ayahNumber : parseInt(o.ayahRange, 10);
            return Number.isFinite(ayah) && scopeSurahs.has(o.surahNumber) && poolIndex.has(`${o.surahNumber}:${ayah}`);
        };
        const eligible = all.filter(g => g && (g.occurrences || []).length >= 2 && g.occurrences.every(memorized));
        const out = [], usedGroups = new Set();
        for (const g of eligible.sort(() => rng() - 0.5)) {
            if (out.length >= k) break;
            if (usedGroups.has(g.groupId)) continue;
            const q = buildHomeworkSimilarityQuestion(g, all);
            if (!q) continue;
            q.id = 'q_' + Date.now() + '_sim' + out.length + Math.random().toString(36).slice(2, 6);
            usedGroups.add(g.groupId);
            out.push(q);
        }
        return out;
    } catch (err) {
        console.warn('تعذر بناء أسئلة المتشابهات للواجب الذكي:', err);
        return [];
    }
}

export async function planSmartHomework(student, n, { selection = { mode: 'all' }, hwEngine, rng = Math.random, similaritiesManager = null, similarityCount = null } = {}) {
    const ctx = await loadContext(student);
    if (!ctx) return { ok: false, reason: 'unavailable' };
    if (!ctx.range.ok) return { ok: false, reason: 'no_range', ctx };

    const model = await buildSelectionModel(student, ctx, { unit: selection.unit || null });
    const allowed = resolveAllowedSegIds(student, ctx, model, selection);
    if (allowed && allowed.size === 0) return { ok: false, reason: 'empty_selection', ctx };

    const pool = await loadMemorizedPool(ctx);
    if (!pool.length) return { ok: false, reason: 'empty', ctx };
    const poolIndex = new Map(pool.map(a => [`${a.surahNumber}:${a.numberInSurah}`, a]));
    const bySeg = new Map();
    pool.forEach(a => {
        const id = segmentIdFor(AppState.surahsData, a.surahNumber, a.numberInSurah);
        if (!bySeg.has(id)) bySeg.set(id, []);
        bySeg.get(id).push(a);
    });

    const focusFilter = allowed ? (seg) => allowed.has(seg.id) : null;
    const scopeSegs = ctx.path.segments.filter(s => !allowed || allowed.has(s.id));
    const multiSurah = new Set(scopeSegs.map(s => s.surah)).size > 1;
    // أسئلة المتشابهات تُضاف فوق العدد المطلوب (لا تزاحم أسئلة التتبّع) كي لا تتأثر حسابات التغطية ومقترح «أكمل»
    const simQs = await pickSimilarityQuestions(similarityCount == null ? similarityCountFor(n) : similarityCount, poolIndex, new Set(scopeSegs.map(s => s.surah)), rng, similaritiesManager);
    const plan = planHomework({
        n, path: ctx.path, classes: ctx.classes, states: ctx.states, skillStats: ctx.stats,
        now: Date.now(), rng, focusFilter, multiSurah, avoidSegIds: model.pendingSegIds
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
    const scopeSegIds = scopeSegs.map(s => s.id);
    if (questions.length) questions.push(...simQs);
    return {
        ok: !!questions.length, reason: questions.length ? null : 'empty', questions, tracking, why, plan, ctx, model,
        scopeSegIds, distinctSegments: new Set(why.map(m => m.segment)).size
    };
}
