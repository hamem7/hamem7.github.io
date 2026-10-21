// tajweed/tajweed-entry.js
//
// 🌟 [جديد] واجهة شاشة الدخول إلى «أبطال التجويد» (تحلّ محل حقل البحث والقائمة المنسدلة): بطاقات طلاب، «أكمل من حيث
// توقفتَ»، لمحة الرحلة، تنبيه المراجعة، معاينة لوحة الأبطال، نظرة المعلم على الصف، وبداية الطالب الجديد.
// كل الحسابات في engine/tajweedEntry.js (خالصة)؛ هذا الملف يجلب السجلات ويبني HTML ويحفظ حالة العرض فقط.
// التنقل (دخول طالب، فتح مراجعة...) يبقى في tajweed-map.js الذي يستدعي دوال هذا الملف.
import { AppState, t } from '../core/app.js';
import { TAJWEED_STAGES, getAllRulesFlat } from '../engine/tajweedRulesCatalog.js';
import {
    summarizeStudent, sortByRecency, pickPreselected, classOverview, sortForTeacher, timeAgo
} from '../engine/tajweedEntry.js';

const SEARCH_FROM = 9;      // يظهر حقل البحث لمن عدد طلابهم أكثر من ثمانية
const STEP_KEYS = ['learn', 'practice', 'exam', 'teacher'];
const STEP_INDEX = { learn: 0, practice: 1, exam: 2, awaiting_teacher: 3, mastered: 4 };

// حالة العرض (تبقى بين إعادة الرسم؛ تُصفَّر عند فتح القسم من جديد)
export const entryState = { mode: 'student', sel: null, q: '', all: false, sort: 'progress', initialized: false };
export function resetEntryState() { Object.assign(entryState, { mode: 'student', sel: null, q: '', all: false, sort: 'progress', initialized: false }); }

let summaries = [];
export const getEntrySummaries = () => summaries;
export const getSelectedSummary = () => summaries.find(s => s.studentId === entryState.sel) || null;

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tpl = (key, vars = {}) => Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(v), t(key));
const normName = (s) => String(s || '').replace(/[ً-ٰٟ]/g, '').replace(/[أإآٱ]/g, 'ا').trim().toLowerCase();
const stageById = (id) => TAJWEED_STAGES.find(s => s.id === id);
const ruleById = (id) => (getAllRulesFlat().find(x => x.rule.id === id) || {}).rule;
const stageColor = (stage) => `var(${stage.colorVar})`;

// ============================================================
// جلب البيانات
// ============================================================
export async function loadEntrySummaries() {
    const students = (await AppState.studentManager.getAllStudents()).filter(s => !s.isHidden);
    summaries = await Promise.all(students.map(async student => {
        const [mastery, sessions] = await Promise.all([
            AppState.tajweedManager.getMasteryByStudent(student.id),
            AppState.tajweedManager.getSessionsByStudent(student.id)
        ]);
        // نفس تعريف بوّابة المراجعة في خريطة التقدّم: تُحسب فقط من الأحكام التي بدأها الطالب فعلاً
        const startedRuleIds = mastery.filter(m => (m.attemptsCount || 0) > 0).map(m => m.ruleId);
        const dueRuleIds = startedRuleIds.length ? await AppState.reviewScheduleManager.getDueRuleIds(student.id, startedRuleIds) : [];
        return summarizeStudent({ student, mastery, sessions, dueRuleIds });
    }));
    if (!entryState.initialized) {
        // الأحدث نشاطاً يُحدَّد مسبقاً فقط (بلا دخول): الدخول الفعلي يبقى بضغطة صريحة على «أكمل»
        const pre = pickPreselected(summaries);
        entryState.sel = pre ? pre.studentId : null;
        entryState.initialized = true;
    }
    if (entryState.sel !== null && !summaries.some(s => s.studentId === entryState.sel)) entryState.sel = null;
    return summaries;
}

// ============================================================
// مكوّنات العرض
// ============================================================
function avatarInner(student) {
    const av = student && student.avatar ? String(student.avatar) : '';
    if (av && av.length >= 10) return `<img src="${esc(av)}" alt="">`;      // صورة محفوظة (نفس تمييز بطاقة الترحيب المشتركة)
    return av ? esc(av) : esc(String(student.name || '؟').trim()[0] || '؟');
}
function ringAvatar(s, color) {
    return `<span class="tjw-e-av" style="--p:${s.progressPct}; --col:${color};"><span class="tjw-e-av-in">${avatarInner(s.student)}</span></span>`;
}
function agoText(ts) {
    const a = timeAgo(ts);
    return a.key === 'never' ? t('tjw_e_never') : a.key === 'now' ? t('tjw_e_ago_now') : tpl('tjw_e_ago_' + a.key, { n: a.n });
}
function stepperHTML(step) {
    const cur = STEP_INDEX[step];
    return `<div class="tjw-e-stepper">${STEP_KEYS.map((k, i) =>
        `<i class="${i < cur ? 'is-done' : i === cur ? 'is-cur' : ''}">${i < cur ? '✓' : i + 1} ${t('tjw_step_' + k)}</i>`).join('')}</div>`;
}
function currentTexts(s) {
    if (!s.started && s.current) return t('tjw_e_fresh_sub');
    if (!s.current) return t('tjw_e_all_done');
    return t(ruleById(s.current.ruleId).nameKey);
}

function studentCard(s) {
    const stage = s.current ? stageById(s.current.stageId) : null;
    const selected = entryState.sel === s.studentId;
    return `
        <button type="button" class="tjw-st" data-action="entry-select" data-id="${esc(s.studentId)}" data-name="${esc(s.student.name)}" aria-pressed="${selected}"
                aria-label="${esc(tpl('tjw_e_aria_progress', { name: s.student.name, p: s.progressPct }))}">
            ${ringAvatar(s, stage ? stageColor(stage) : 'var(--tjw-good)')}
            <span class="tjw-st-body">
                <b>${esc(s.student.name)}</b>
                <small>${currentTexts(s)}</small>
                <span class="tjw-e-badges">
                    <span class="tjw-e-bd">${s.progressPct}%</span>
                    ${s.due ? `<span class="tjw-e-bd is-due">🔁 ${s.due}</span>` : ''}
                    ${s.streak > 1 ? `<span class="tjw-e-bd is-fire">🔥 ${s.streak}</span>` : ''}
                </span>
            </span>
        </button>`;
}

function continueBanner(s) {
    if (!s) return `<section class="tjw-e-cont is-hint"><b>${t('tjw_e_pick_hint_title')}</b><small>${t('tjw_e_pick_hint_sub')}</small></section>`;
    const name = esc(s.student.name);
    const mapBtn = `<button type="button" class="tjw-e-ghost" data-action="entry-map">${t('tjw_e_btn_map')}</button>`;
    // «ملخص الحصة للولي» لمن له نشاط مسجَّل (لا ملخص لطالب لم يبدأ)
    const summaryBtn = s.lastTs !== null ? `<button type="button" class="tjw-e-ghost" data-action="entry-summary">${t('tjw_sum_btn_session')}</button>` : '';
    if (!s.current) {
        return `<section class="tjw-e-cont"><div class="tjw-e-who">${ringAvatar(s, 'var(--tjw-good)')}<div><h2>${tpl('tjw_e_done_title', { name })}</h2><small>${t('tjw_e_all_done')}</small></div></div>
            <div class="tjw-e-row"><button type="button" class="tjw-e-cta" data-action="entry-map">${t('tjw_e_btn_map')}</button>${summaryBtn}<button type="button" class="tjw-e-ghost" data-action="entry-other">${t('tjw_e_btn_other')}</button></div></section>`;
    }
    const stage = stageById(s.current.stageId), rule = ruleById(s.current.ruleId);
    if (!s.started) {
        // بداية الطالب الجديد: الخطوات الأربع ثم زر أول حكم
        const steps = STEP_KEYS.map((k, i) => `<div class="tjw-e-ob"><div class="tjw-e-ob-n">${i + 1}</div><b>${t('tjw_e_onb_' + (i + 1) + '_t')}</b><small>${t('tjw_e_onb_' + (i + 1) + '_s')}</small></div>`).join('');
        return `<section class="tjw-e-card tjw-e-onb"><h2>${tpl('tjw_e_onb_title', { name })}</h2><p class="tjw-e-sub">${t('tjw_e_onb_sub')}</p>
            <div class="tjw-e-ob-grid">${steps}</div>
            <div class="tjw-e-row"><button type="button" class="tjw-e-cta" data-action="entry-go">${tpl('tjw_e_btn_first', { rule: t(rule.nameKey) })}</button>${mapBtn}<button type="button" class="tjw-e-ghost" data-action="entry-other">${t('tjw_e_btn_other')}</button></div></section>`;
    }
    return `<section class="tjw-e-cont" aria-label="${t('tjw_e_continue_aria')}">
        <div class="tjw-e-who">${ringAvatar(s, stageColor(stage))}<div><h2>${tpl('tjw_e_continue_title', { name })}</h2><small>${tpl('tjw_e_last_seen', { when: agoText(s.lastTs) })}</small></div></div>
        <div class="tjw-e-row"><span class="tjw-e-rulechip" style="--c:${stageColor(stage)};">${stage.icon} ${t(rule.nameKey)}</span>
            <small>${tpl('tjw_e_rule_pos', { stage: t(stage.nameKey), i: s.current.ruleIndex + 1, n: s.current.ruleCount })}</small></div>
        ${stepperHTML(s.current.step)}
        <div class="tjw-e-row"><button type="button" class="tjw-e-cta" data-action="entry-go">${t('tjw_e_btn_continue')}</button>${mapBtn}${summaryBtn}<button type="button" class="tjw-e-ghost" data-action="entry-other">${t('tjw_e_btn_other')}</button></div></section>`;
}

function studentsPanel(list) {
    const many = list.length >= SEARCH_FROM;
    const q = normName(entryState.q);
    let shown = sortByRecency(list).filter(s => !q || normName(s.student.name).includes(q));
    // مع كثرة الطلاب: لا تُعرض الأسماء إلا عند البحث (أو بطاقة الطالب المختار فقط)
    if (many && !q) shown = shown.filter(s => s.studentId === entryState.sel);
    return `
        <section class="tjw-e-card tjw-e-plain" aria-label="${t('tjw_e_who_title')}">
            <h2>${t('tjw_e_who_title')}</h2>
            <p class="tjw-e-sub">${t(many ? 'tjw_e_who_sub_search' : 'tjw_e_who_sub_tap')}</p>
            ${many ? `<label class="tjw-e-search"><span aria-hidden="true">🔍</span><input id="tjw-student-search-input" type="search" autocomplete="off" placeholder="${esc(t('tjw_e_search_ph'))}" value="${esc(entryState.q)}" aria-label="${esc(t('tjw_e_search_ph'))}"></label>` : ''}
            ${many && !q && !shown.length ? '' : `<div class="tjw-e-lbl">${t(q ? 'tjw_e_results' : 'tjw_e_recent')}</div>
            <div class="tjw-e-students">${shown.map(studentCard).join('') || `<p class="tjw-e-empty-note">${t('tjw_e_no_match')}</p>`}</div>`}
        </section>`;
}

function reviewAlert(list, sel) {
    if (sel && !sel.started) return '';
    if (sel && sel.due) return `<div class="tjw-e-alert"><span class="tjw-e-em">🔁</span><div><b>${tpl('tjw_e_due_title', { n: sel.due })}</b>${t('tjw_e_due_sub')}</div><button type="button" class="tjw-e-cta" data-action="entry-review">${t('tjw_e_btn_review')}</button></div>`;
    if (sel) return `<div class="tjw-e-alert is-ok"><span class="tjw-e-em">✅</span><div><b>${t('tjw_e_nodue_title')}</b>${t('tjw_e_nodue_sub')}</div>${sel.streak > 1 ? `<span class="tjw-e-streak">🔥 ${tpl('tjw_e_streak_days', { n: sel.streak })}</span>` : ''}</div>`;
    const due = list.reduce((a, s) => a + s.due, 0);
    return due ? `<div class="tjw-e-alert"><span class="tjw-e-em">🔁</span><div><b>${tpl('tjw_e_class_due', { n: due })}</b>${t('tjw_e_class_due_sub')}</div></div>` : '';
}

// مسار تقدّم مصغّر بدل شبكة البطاقات: شريط أفقي واحد بدوائر المراحل (الحلقة = التقدّم) يتمرّر على الجوال، وتحته اسم المرحلة الجارية فقط
function journeyPanel(sel) {
    const nodes = TAJWEED_STAGES.map((stage, i) => {
        const n = stage.rules.length;
        const c = sel ? sel.stageCounts[i] : null;
        const p = c ? Math.round((c.mastered + (c.active ? stepFraction(sel.current.step) : 0)) / n * 100) : 0;
        const cls = c ? (c.complete ? 'is-done' : c.active ? 'is-active' : !c.unlocked ? 'is-locked' : '') : '';
        const label = c ? tpl('tjw_e_mastered_of', { m: c.mastered, n }) : tpl('tjw_e_n_rules', { n });
        return `<div class="tjw-e-sg ${cls}" style="--c:${stageColor(stage)};" title="${esc(t(stage.nameKey) + ' — ' + label)}"><div class="tjw-e-ic" style="--p:${p};"><span>${c && c.complete ? '✅' : stage.icon}</span></div>
            <div class="tjw-e-nm">${t(stage.nameKey)}</div><div class="tjw-e-ct">${label}</div></div>`;
    }).join('');
    return `<section class="tjw-e-track" aria-label="${t('tjw_e_journey_title')}"><div class="tjw-e-track-head"><b>${t('tjw_e_journey_title')}</b></div><div class="tjw-e-path">${nodes}</div></section>`;
}
// وزن الخطوة الحالية داخل الحكم الجاري في حلقة المرحلة (نفس أوزان تقدّم الحكم التقريبية في الرحلة)
const stepFraction = (step) => ({ learn: 0.1, practice: 0.35, exam: 0.6, awaiting_teacher: 0.85 }[step] || 0);

function teacherView(list) {
    if (!list.length) return `<section class="tjw-e-card"><div class="tjw-e-empty"><div class="tjw-e-big">📋</div><b>${t('tjw_e_t_empty')}</b></div></section>`;
    const ov = classOverview(list);
    const rows = sortForTeacher(list, entryState.sort).map(s => {
        const cells = s.stageCounts.map(c => {
            const k = c.complete ? 'c2' : c.active ? (s.due > 0 ? 'c3' : 'c1') : c.mastered > 0 ? 'c1' : 'c0';
            return `<td><span class="tjw-e-cell ${k}">${c.mastered}/${c.total}</span></td>`;
        }).join('');
        return `<tr class="tjw-e-clk" data-action="entry-row" data-id="${esc(s.studentId)}" tabindex="0"><td><b>${esc(s.student.name)}</b>${s.due ? ` <small>🔁 ${s.due}</small>` : ''}</td>${cells}<td><b>${s.progressPct}%</b></td></tr>`;
    }).join('');
    const sortBtn = (k) => `<button type="button" class="tjw-e-ghost ${entryState.sort === k ? 'is-on' : ''}" data-action="entry-sort" data-sort="${k}">${t('tjw_e_t_sort_' + k)}</button>`;
    return `<section class="tjw-e-card"><h2>${t('tjw_e_t_title')}</h2><p class="tjw-e-sub">${t('tjw_e_t_sub')}</p>
        <div class="tjw-e-tsum">
            <span class="tjw-e-stat"><b>${ov.total}</b>${t('tjw_e_t_students')}</span><span class="tjw-e-stat"><b>${ov.withDue}</b>${t('tjw_e_t_due')}</span>
            <span class="tjw-e-stat"><b>${ov.idle}</b>${t('tjw_e_t_idle')}</span><span class="tjw-e-stat"><b>${ov.notStarted}</b>${t('tjw_e_t_new')}</span>
            <span class="tjw-e-stat"><b>${ov.allDone}</b>${t('tjw_e_t_done')}</span></div>
        <div class="tjw-e-row tjw-e-sortrow"><span class="tjw-e-lbl">${t('tjw_e_t_sort')}</span>${sortBtn('progress')}${sortBtn('attention')}${sortBtn('name')}</div>
        <div class="tjw-e-scroll"><table class="tjw-e-tbl"><thead><tr><th class="is-start">${t('tjw_e_t_col_student')}</th>${TAJWEED_STAGES.map(s => `<th title="${esc(t(s.nameKey))}">${s.icon}</th>`).join('')}<th>%</th></tr></thead><tbody>${rows}</tbody></table></div>
        <div class="tjw-e-legend"><span><span class="tjw-e-cell c2">✓</span> ${t('tjw_e_cell_done')}</span><span><span class="tjw-e-cell c1">·</span> ${t('tjw_e_cell_cur')}</span><span><span class="tjw-e-cell c3">·</span> ${t('tjw_e_cell_review')}</span><span><span class="tjw-e-cell c0">·</span> ${t('tjw_e_cell_none')}</span></div></section>`;
}

// ============================================================
// الشاشة كاملة
// ============================================================
export function renderEntryHTML() {
    const list = summaries, sel = getSelectedSummary();
    const header = `
        <nav class="tjw-e-crumbs" aria-label="${t('tjw_e_crumb_aria')}"><button type="button" class="tjw-e-link" data-action="entry-home">${t('tjw_e_crumb_home')}</button><span>›</span><b>${t('tjw_home_title')}</b></nav>
        <header class="tjw-e-hero"><div><h1>${t('tjw_home_title')}</h1>
            <p>${tpl('tjw_e_hero_sub', { stages: TAJWEED_STAGES.length, rules: getAllRulesFlat().length })}</p></div>
            ${list.length ? `<div class="tjw-e-seg" role="tablist" aria-label="${t('tjw_e_mode_aria')}">
                <button type="button" role="tab" aria-selected="${entryState.mode === 'student'}" class="${entryState.mode === 'student' ? 'is-on' : ''}" data-action="entry-mode" data-mode="student">🧒 ${t('tjw_e_mode_student')}</button>
                <button type="button" role="tab" aria-selected="${entryState.mode === 'teacher'}" class="${entryState.mode === 'teacher' ? 'is-on' : ''}" data-action="entry-mode" data-mode="teacher">👩‍🏫 ${t('tjw_e_mode_teacher')}</button></div>` : ''}
        </header>`;
    if (!list.length) {
        return `<div class="tjw-entry">${header}<div class="tjw-e-col"><section class="tjw-e-card"><div class="tjw-e-empty"><div class="tjw-e-big">🌟</div><b>${t('tjw_no_students')}</b></div></section>${journeyPanel(null)}</div></div>`;
    }
    // عمود واحد مرتَّب: بطاقة «أكمل» ← مسار التقدّم المصغّر ← تنبيه المراجعة ← اختيار الطالب ← لوحة الأبطال
    const body = entryState.mode === 'teacher'
        ? teacherView(list)
        : `<div class="tjw-e-col tjw-e-single">${continueBanner(sel)}${journeyPanel(sel)}${reviewAlert(list, sel)}${studentsPanel(list)}
            ${list.length >= 3 ? `<div class="tjw-e-foot"><button type="button" class="tjw-e-ghost" data-action="open-leaderboard">🏆 ${t('tjw_e_btn_lb')}</button></div>` : ''}</div>`;
    return `<div class="tjw-entry">${header}${body}</div>`;
}
