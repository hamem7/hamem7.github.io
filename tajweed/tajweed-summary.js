// tajweed/tajweed-summary.js
//
// 🌟 [جديد] نافذة «ملخص جاهز للولي»: يضغط المعلم زراً بعد حكم أو حصة فتظهر رسالة مرتّبة قابلة للتعديل، ينسخها أو يرسلها
// على واتساب. هذا الملف يجلب سجلات الطالب (إتقان، جلسات، أوسمة، مراجعات) ويرسم النافذة؛ كل الحساب وصياغة النص في
// engine/tajweedSummary.js (خالص). النسخ هو الأساس (بطلب المعلم: ينسخ ويلصق في واتساب بنفسه): زر واحد كبير ينسخ النص بعد
// تنظيفه (cleanForCopy)، وإن منع المتصفح الحافظة يُحدَّد النص كله ليُنسخ بـ Ctrl+C. لا يُرسَل شيء تلقائياً.
import { AppState, t } from '../core/app.js';
import { TAJWEED_STAGES, getAllRulesFlat } from '../engine/tajweedRulesCatalog.js';
import { TAJWEED_BADGE_CATALOG } from '../engine/tajweedEngine.js';
import { ensureJourney } from '../engine/tajweedJourney.js';
import { buildSessionSummary, buildRuleSummary, formatSummaryText, cleanForCopy } from '../engine/tajweedSummary.js';
import { buildLessonModel, formatLessonSummary } from '../engine/tajweedLessonSummary.js';
import { summarizeStudent } from '../engine/tajweedEntry.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tr = (key, vars = {}) => plain(Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(v), t(key)));
// أسماء الأحكام في الترجمة تُخزَّن بترميز HTML (&amp;) لأنها تُحقن في صفحات؛ والملخص نصٌّ عاديّ يُلصق في واتساب فيجب فكّ الترميز
const plain = (s) => String(s == null ? '' : s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&');
const flat = getAllRulesFlat();
const ruleOf = (id) => (flat.find(x => x.rule.id === id) || {}).rule;

function formatDate(x) {
    const d = typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) ? new Date(+x.slice(0, 4), +x.slice(5, 7) - 1, +x.slice(8, 10), 12) : new Date(x);
    const lang = AppState.currentLang === 'en' ? 'en-GB' : 'ar-EG-u-nu-latn';
    try { return new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d); } catch (e) { return d.toLocaleDateString(); }
}

// ينسخ النص. الأساس واجهة الحافظة الحديثة (تحتاج https أو localhost وضغطة مستخدم)؛ وإن رُفضت يُنسخ من المربع الظاهر نفسه
// بعد تحديده كله (execCommand) — المربع الظاهر لا المخفي لأن iOS لا ينسخ من عنصر مخفي. يعيد true عند النجاح.
async function copyText(text, textEl) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* احتياطي أدناه */ }
    try {
        if (textEl.value !== text) textEl.value = text;
        textEl.focus(); textEl.select(); textEl.setSelectionRange(0, text.length);
        return !!document.execCommand('copy');
    } catch (e) { return false; }
}

async function loadStudentData(studentId) {
    const student = (await AppState.studentManager.getAllStudents()).find(s => String(s.id) === String(studentId));
    if (!student) return null;
    const [mastery, sessions, achievements] = await Promise.all([
        AppState.tajweedManager.getMasteryByStudent(student.id),
        AppState.tajweedManager.getSessionsByStudent(student.id),
        AppState.tajweedManager.getAchievementsByStudent(student.id)
    ]);
    const started = mastery.filter(m => (m.attemptsCount || 0) > 0).map(m => m.ruleId);
    const dueRuleIds = started.length ? await AppState.reviewScheduleManager.getDueRuleIds(student.id, started) : [];
    return { student, mastery, sessions, achievements, dueRuleIds };
}

// الأحكام التي لها نشاط أو تقدّم (بترتيب الكتالوج) لقائمة «ملخص الحكم»؛ والحكم المطلوب صراحةً يُضاف دائماً
function ruleOptions(data, wanted) {
    const active = new Set(data.sessions.map(s => s.ruleId).filter(Boolean));
    data.mastery.forEach(m => { const j = ensureJourney(m); if (j.learnedAt || (m.attemptsCount || 0) > 0) active.add(m.ruleId); });
    if (wanted) active.add(wanted);
    return flat.filter(x => active.has(x.rule.id)).map(x => x.rule);
}

// ============================================================
// النافذة
// ============================================================
export async function openParentSummary({ studentId, ruleId = null, kind = null, onClose = null } = {}) {
    document.getElementById('tjw-sum-overlay')?.remove();
    const data = await loadStudentData(studentId);
    if (!data) return;
    const opts = ruleOptions(data, ruleId);
    // الحكم الافتراضي لتبويب «ملخص الحكم»: المطلوب صراحةً، وإلا صاحب آخر نشاط مسجَّل (وهو ما يهم المعلم عادةً)، وإلا أول حكم له نشاط
    const lastActive = data.sessions.filter(s => s.ruleId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    const defaultRule = lastActive && opts.some(r => r.id === lastActive.ruleId) ? lastActive.ruleId : (opts[0] && opts[0].id) || null;
    const st = { kind: kind || (ruleId ? 'rule' : 'session'), ruleId: ruleId || defaultRule, note: '', home: true, dirty: false };
    if ((st.kind === 'rule' || st.kind === 'lesson') && !st.ruleId) st.kind = 'session';
    const returnFocus = document.activeElement;

    const ctx = () => ({
        tr, ruleName: id => plain(t(ruleOf(id).nameKey)), stageName: id => plain(t(TAJWEED_STAGES.find(s => s.id === id).nameKey)),
        badgeName: k => (TAJWEED_BADGE_CATALOG[k] ? plain(t(TAJWEED_BADGE_CATALOG[k].nameKey)) : k), formatDate, note: st.note, includeHome: st.home
    });
    const build = () => {
        const base = { student: data.student, sessions: data.sessions, mastery: data.mastery, dueRuleIds: data.dueRuleIds };
        if (st.kind === 'lesson') return buildLessonModel({ student: data.student, ruleId: st.ruleId, mastery: data.mastery, sessions: data.sessions });
        return st.kind === 'rule'
            ? buildRuleSummary({ ...base, ruleId: st.ruleId })
            : buildSessionSummary({ ...base, achievements: data.achievements });
    };

    const ov = document.createElement('div');
    ov.id = 'tjw-sum-overlay';
    ov.className = 'tjw-sum-overlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', t('tjw_sum_aria'));
    ov.innerHTML = `
        <div class="tjw-sum-card">
            <div class="tjw-sum-head"><h2>${t('tjw_sum_title')}</h2><button type="button" class="tjw-sum-x" data-sum="close" aria-label="${esc(t('tjw_sum_close'))}">✕</button></div>
            <p class="tjw-sum-student">👤 ${esc(data.student.name)}</p>
            <div class="tjw-sum-tabs" role="tablist">
                <button type="button" role="tab" data-sum="tab" data-kind="lesson">${t('tjw_sum_tab_lesson')}</button>
                <button type="button" role="tab" data-sum="tab" data-kind="session">${t('tjw_sum_tab_session')}</button>
                <button type="button" role="tab" data-sum="tab" data-kind="rule">${t('tjw_sum_tab_rule')}</button>
            </div>
            <label class="tjw-sum-rulepick" id="tjw-sum-rulepick"><span>${t('tjw_sum_rule_label')}</span>
                <select id="tjw-sum-rule">${opts.map(r => `<option value="${esc(r.id)}">${esc(t(r.nameKey))}</option>`).join('') || `<option value="">${esc(t('tjw_sum_no_rules'))}</option>`}</select></label>
            <p class="tjw-sum-dayold" id="tjw-sum-dayold" hidden></p>
            <label class="tjw-sum-field"><span>${t('tjw_sum_note_label')}</span><input type="text" id="tjw-sum-note" maxlength="300" placeholder="${esc(t('tjw_sum_note_ph'))}"></label>
            <label class="tjw-sum-check"><input type="checkbox" id="tjw-sum-home" checked> <span>${t('tjw_sum_home_check')}</span></label>
            <textarea id="tjw-sum-text" class="tjw-sum-text" rows="6" dir="auto" aria-label="${esc(t('tjw_sum_title'))}"></textarea>
            <p class="tjw-sum-hint">${t('tjw_sum_hint')}</p>
            <div class="tjw-sum-actions">
                <button type="button" class="tjw-sum-copy" id="tjw-sum-copy" data-sum="copy">${t('tjw_sum_copy')}</button>
                <button type="button" class="tjw-sum-regen" data-sum="regen">${t('tjw_sum_regen')}</button>
            </div>
            <p class="tjw-sum-toast" id="tjw-sum-toast" role="status" aria-live="polite"></p>
        </div>`;
    document.body.appendChild(ov);

    const $ = (sel) => ov.querySelector(sel);
    const textEl = $('#tjw-sum-text'), toastEl = $('#tjw-sum-toast');
    const toast = (msg) => { toastEl.textContent = msg; clearTimeout(toast._t); toast._t = setTimeout(() => { toastEl.textContent = ''; }, 2500); };
    const close = () => { ov.remove(); if (typeof onClose === 'function') { try { onClose(); } catch (e) { /* لا شيء */ } } document.removeEventListener('keydown', onKey); if (returnFocus && returnFocus.focus) try { returnFocus.focus(); } catch (e) { /* العنصر لم يعد موجوداً */ } };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);

    // المربع يتّسع ليُظهر الرسالة كلها (حتى نصف ارتفاع الشاشة ثم يمرَّر داخلياً) فيراها المعلم من أولها دون تمرير
    const autosize = () => { textEl.style.height = 'auto'; textEl.style.height = Math.min(textEl.scrollHeight + 4, Math.round(window.innerHeight * 0.5)) + 'px'; };
    const sync = () => {
        ov.querySelectorAll('[data-sum="tab"]').forEach(b => { const on = b.dataset.kind === st.kind; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', String(on)); });
        $('#tjw-sum-rulepick').hidden = st.kind === 'session';
        $('#tjw-sum-home').closest('label').style.display = st.kind === 'lesson' ? 'none' : '';
        const sel = $('#tjw-sum-rule'); if (st.ruleId) sel.value = st.ruleId;
        const model = build();
        if (st.kind === 'lesson') {
            const sInfo = summarizeStudent({ student: data.student, mastery: data.mastery, sessions: data.sessions, dueRuleIds: data.dueRuleIds });
            const nextId = sInfo.current && sInfo.current.ruleId !== st.ruleId ? sInfo.current.ruleId : null;
            textEl.value = formatLessonSummary(model, { tr, ruleName: id => plain(t(ruleOf(id).nameKey)), nextRuleName: nextId ? plain(t(ruleOf(nextId).nameKey)) : null, note: st.note });
        } else textEl.value = formatSummaryText(model, ctx());
        st.dirty = false;
        autosize(); textEl.scrollTop = 0;
        const old = $('#tjw-sum-dayold');
        old.hidden = !(st.kind === 'session' && !model.empty && !model.isToday);
        if (st.kind === 'lesson') old.hidden = true;
        if (!old.hidden) old.textContent = tr('tjw_sum_day_old', { date: formatDate(model.day) });
    };
    // تغيير أي عنصر تحكم بعد أن عدّل المعلم النص يسأله قبل الاستبدال
    const regenerate = () => { if (st.dirty && !confirm(t('tjw_sum_edited_confirm'))) return false; sync(); return true; };

    ov.addEventListener('click', async (e) => {
        if (e.target === ov) return close();
        const b = e.target.closest('[data-sum]'); if (!b) return;
        const act = b.dataset.sum;
        if (act === 'close') return close();
        if (act === 'tab') { const prev = st.kind; st.kind = b.dataset.kind; if ((st.kind === 'rule' || st.kind === 'lesson') && !st.ruleId) { st.kind = prev; return; } if (!regenerate()) st.kind = prev, ov.querySelectorAll('[data-sum="tab"]').forEach(x => x.classList.toggle('is-on', x.dataset.kind === st.kind)); return; }
        if (act === 'regen') return void regenerate();
        if (act === 'copy') {
            const text = cleanForCopy(textEl.value);            // ما يُنسخ هو النص المنظَّف كما يراه المعلم بعد تعديله
            const ok = await copyText(text, textEl);
            const btn = $('#tjw-sum-copy');
            btn.classList.toggle('is-done', ok);
            if (ok) { btn.textContent = t('tjw_sum_copied'); clearTimeout(btn._t); btn._t = setTimeout(() => { btn.textContent = t('tjw_sum_copy'); btn.classList.remove('is-done'); }, 2500); }
            else { textEl.focus(); textEl.select(); }            // تعذّر: نحدّد النص كله ليُنسخ يدوياً
            return toast(t(ok ? 'tjw_sum_copied' : 'tjw_sum_copy_failed'));
        }
    });
    $('#tjw-sum-rule').addEventListener('change', (e) => { const prev = st.ruleId; st.ruleId = e.target.value; if (!regenerate()) { st.ruleId = prev; e.target.value = prev; } });
    $('#tjw-sum-home').addEventListener('change', (e) => { st.home = e.target.checked; if (!regenerate()) { st.home = !st.home; e.target.checked = st.home; } });
    $('#tjw-sum-note').addEventListener('input', (e) => { st.note = e.target.value; if (!st.dirty) sync(); });   // الملاحظة تُدرج حيّةً ما لم يعدّل المعلم النص بيده
    textEl.addEventListener('input', () => { st.dirty = true; autosize(); });

    sync();
    textEl.focus({ preventScroll: true });   // التركيز لا يمرّر المربع إلى نهاية النص
    textEl.setSelectionRange(0, 0);
}
