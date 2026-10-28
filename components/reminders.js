// components/reminders.js
// ==========================================================
// 🌟 [جديد — «تذكيراتي» منبّه المعلم الشخصي] واجهة التذكيرات (التخزين والمراقب في core/reminders.js، والمنطق في engine/reminders.js):
//   1) مجموعة «تذكيراتي» داخل بطاقة «مهام اليوم» في الرئيسية (#home-quickcard-reminders) — هي المكان الأساسي.
//   2) شاشة «تذكيراتي» الكاملة (اليوم/القادمة/متأخرة/منجزة + تصفية بالنوع) كغطاء يبدأ من أسفل الترويسة الموحّدة.
//   3) نموذج إضافة/تعديل (ورقة سفلية على الهاتف، نافذة وسط الشاشة على الحاسوب).
//   4) التنبيه عند الموعد: شريط علوي هادئ (الافتراضي) أو نافذة وسط الشاشة للتذكير «العاجل»، مع صوت + إشعار المتصفح إن كانت الصفحة مخفية.
// كل النصوص ثنائية اللغة بمفاتيح rem_* تُدمج في القاموس المركزي عند تحميل الملف. لا data-i18n داخل الواجهة المولَّدة: تُعاد الرسمة عند
// حدث app-lang-changed. لا ألوان ثابتة: التنسيق كله في css/reminders.css برموز الهوية فيعمل المظهر الداكن تلقائياً.
// ==========================================================

import { translations, t, tf, isEnglish } from '../core/i18n.js';
import { AppState } from '../core/app.js';
import { esc } from '../core/escape.js';
import { loadStudentProfileScreen } from '../student/student.js';
import {
    getSorted, getReminders, getReminder, addReminder, updateReminder, removeReminder, completeReminder, snoozeReminder,
    snoozeReminderToTomorrow, actionableCount, playReminderChime, notifyHidden, askNotificationPermissionOnce
} from '../core/reminders.js';
import { fireAt, bucketOf, summarize, dayStart, addDays, quickTimes, SNOOZE_MINUTES } from '../engine/reminders.js';

// ---------------------------------------------------------------------------
// الترجمات
// ---------------------------------------------------------------------------
const NEW_KEYS = {
    ar: {
        rem_title: 'تذكيراتي',
        bnav_reminders: 'تذكيراتي',
        rem_add: 'تذكير جديد',
        rem_add_plus: '＋ تذكير جديد',
        rem_view_all: 'عرض الكل',
        rem_empty: 'لا توجد تذكيرات معلّقة اليوم. أضف ما تريد إنجازه مع طلابك أو لنفسك، وسنُنبّهك في موعده.',
        rem_tab_today: 'اليوم', rem_tab_upcoming: 'القادمة', rem_tab_overdue: 'متأخرة', rem_tab_done: 'منجزة',
        rem_kind_all: 'الكل', rem_kind_student: 'طالب', rem_kind_personal: 'شخصي', rem_kind_work: 'عمل',
        rem_nothing: 'لا توجد تذكيرات هنا.',
        rem_form_new: 'تذكير جديد', rem_form_edit: 'تعديل التذكير',
        rem_f_title: 'ما المطلوب؟', rem_f_title_ph: 'مثال: الاتصال بولي أمر الطالب…',
        rem_f_kind: 'النوع',
        rem_f_student: 'الطالب (اختياري)', rem_no_student: 'بدون طالب',
        rem_f_when: 'متى؟',
        rem_q_hour: 'بعد ساعة', rem_q_evening: 'المساء 6:00', rem_q_tomorrow: 'غدًا صباحًا',
        rem_f_repeat: 'التكرار', rem_r_none: 'مرة واحدة', rem_r_daily: 'يوميًا', rem_r_weekly: 'أسبوعيًا',
        rem_rep_daily: 'يتكرر يوميًا', rem_rep_weekly: 'يتكرر أسبوعيًا',
        rem_f_urgent: 'عاجل: نافذة تنبيه وسط الشاشة',
        rem_save: 'حفظ التذكير', rem_delete: 'حذف', rem_cancel: 'إلغاء', rem_close: 'إغلاق',
        rem_err_title: 'اكتب ما تريد تذكّره.', rem_err_time: 'اختر وقتًا صحيحًا.', rem_err_past: 'اختر وقتًا في المستقبل.',
        rem_delete_confirm: 'هل تريد حذف هذا التذكير؟',
        rem_alert_now: 'حان موعد تذكيرك',
        rem_done: 'تمّت', rem_done_aria: 'تمّت', rem_reopen_aria: 'إعادة فتح التذكير',
        rem_snooze: 'أجّل', rem_snooze_or: 'أو أجّل التذكير',
        rem_sn_5: '5 د', rem_sn_10: '10 د', rem_sn_30: '30 د', rem_sn_60: 'ساعة', rem_sn_tomorrow: 'غدًا',
        rem_open_student: 'افتح ملف الطالب',
        rem_student_missing: 'لم يُعثر على هذا الطالب (ربما حُذف).',
        rem_missed: 'فاتتك {n} تذكيرات أثناء غيابك', rem_missed_one: 'فاتك تذكير أثناء غيابك', rem_missed_view: 'عرض',
        rem_more_waiting: '+{n} تذكيرات أخرى بانتظارك',
        rem_day_today: 'اليوم', rem_day_tomorrow: 'غدًا', rem_day_yesterday: 'أمس',
        rem_late: 'متأخر',
        rem_notif_title: 'تذكير: {title}'
    },
    en: {
        rem_title: 'My reminders',
        bnav_reminders: 'Reminders',
        rem_add: 'New reminder',
        rem_add_plus: '＋ New reminder',
        rem_view_all: 'View all',
        rem_empty: 'No pending reminders today. Add what you want to do with your students or for yourself, and we will remind you on time.',
        rem_tab_today: 'Today', rem_tab_upcoming: 'Upcoming', rem_tab_overdue: 'Overdue', rem_tab_done: 'Done',
        rem_kind_all: 'All', rem_kind_student: 'Student', rem_kind_personal: 'Personal', rem_kind_work: 'Work',
        rem_nothing: 'No reminders here.',
        rem_form_new: 'New reminder', rem_form_edit: 'Edit reminder',
        rem_f_title: 'What needs to be done?', rem_f_title_ph: 'e.g. Call the student’s parent…',
        rem_f_kind: 'Type',
        rem_f_student: 'Student (optional)', rem_no_student: 'No student',
        rem_f_when: 'When?',
        rem_q_hour: 'In 1 hour', rem_q_evening: 'This evening 6:00', rem_q_tomorrow: 'Tomorrow morning',
        rem_f_repeat: 'Repeat', rem_r_none: 'Once', rem_r_daily: 'Daily', rem_r_weekly: 'Weekly',
        rem_rep_daily: 'Repeats daily', rem_rep_weekly: 'Repeats weekly',
        rem_f_urgent: 'Urgent: show a full pop-up alert',
        rem_save: 'Save reminder', rem_delete: 'Delete', rem_cancel: 'Cancel', rem_close: 'Close',
        rem_err_title: 'Write what you want to be reminded of.', rem_err_time: 'Pick a valid time.', rem_err_past: 'Pick a time in the future.',
        rem_delete_confirm: 'Delete this reminder?',
        rem_alert_now: 'Your reminder is due',
        rem_done: 'Done', rem_done_aria: 'Mark done', rem_reopen_aria: 'Reopen reminder',
        rem_snooze: 'Snooze', rem_snooze_or: 'Or snooze it',
        rem_sn_5: '5 min', rem_sn_10: '10 min', rem_sn_30: '30 min', rem_sn_60: '1 hour', rem_sn_tomorrow: 'Tomorrow',
        rem_open_student: 'Open student profile',
        rem_student_missing: 'This student was not found (maybe deleted).',
        rem_missed: 'You missed {n} reminders while away', rem_missed_one: 'You missed a reminder while away', rem_missed_view: 'View',
        rem_more_waiting: '+{n} more reminders waiting',
        rem_day_today: 'Today', rem_day_tomorrow: 'Tomorrow', rem_day_yesterday: 'Yesterday',
        rem_late: 'Late',
        rem_notif_title: 'Reminder: {title}'
    }
};
['ar', 'en'].forEach(lang => Object.assign(translations[lang], NEW_KEYS[lang]));

// ---------------------------------------------------------------------------
// أدوات
// ---------------------------------------------------------------------------
const DAY = 86400000;
const loc = () => (isEnglish() ? 'en-US' : 'ar-u-nu-latn');
const fmtTime = (ts) => new Date(ts).toLocaleTimeString(loc(), { hour: 'numeric', minute: '2-digit' });
function dayLabel(ts, now) {
    const d = dayStart(ts), today = dayStart(now);
    if (d === today) return t('rem_day_today');
    if (d === addDays(today, 1)) return t('rem_day_tomorrow');
    if (d === addDays(today, -1)) return t('rem_day_yesterday');
    return new Date(ts).toLocaleDateString(loc(), { weekday: 'short', day: 'numeric', month: 'short' });
}
const kindLabel = (k) => t('rem_kind_' + k);
const SNOOZE_KEYS = { 5: 'rem_sn_5', 10: 'rem_sn_10', 30: 'rem_sn_30', 60: 'rem_sn_60' };

const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
const ICON_BELL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 17V11a6 6 0 1 1 12 0v6l1.5 2h-15z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>';

function placeBelowMainHeader(el) {
    const h = document.getElementById('main-header');
    const bottom = h ? Math.max(0, Math.round(h.getBoundingClientRect().bottom)) : 0;
    el.style.top = bottom + 'px';
}

function repeatNote(r) {
    return r.repeat === 'daily' ? t('rem_rep_daily') : (r.repeat === 'weekly' ? t('rem_rep_weekly') : '');
}

function rowHtml(r, now, opts = {}) {
    const f = fireAt(r);
    const late = !r.done && f <= now;
    const meta = [`<span class="dh-rem-pill k-${esc(r.kind)}">${esc(kindLabel(r.kind))}</span>`];
    if (r.studentName) meta.push(`<span>${esc(r.studentName)}</span>`);
    const rep = repeatNote(r);
    if (rep) meta.push(`<span>${esc(rep)}</span>`);
    const dayLine = opts.showDate ? `<small>${esc(dayLabel(f, now))}</small>` : '';
    return `<div class="dh-rem-row${late ? ' is-late' : ''}${r.done ? ' is-done' : ''}" data-id="${esc(r.id)}" data-kind="${esc(r.kind)}">
        <span class="dh-rem-when"><b>${esc(fmtTime(f))}</b>${dayLine}</span>
        <button type="button" class="dh-rem-main" data-act="edit"><span class="dh-rem-name">${esc(r.title)}</span><span class="dh-rem-meta">${meta.join('')}</span></button>
        <button type="button" class="dh-rem-ck" data-act="${r.done ? 'reopen' : 'done'}" aria-label="${esc(r.done ? t('rem_reopen_aria') : t('rem_done_aria'))}">${ICON_CHECK}</button>
    </div>`;
}

function handleRowAction(e, afterChange) {
    const btn = e.target.closest('[data-act]');
    if (!btn) return false;
    const row = btn.closest('.dh-rem-row');
    const id = row && row.dataset.id;
    if (!id) return false;
    const act = btn.dataset.act;
    if (act === 'done') completeReminder(id);
    else if (act === 'reopen') updateReminder(id, { done: false, doneAt: null });
    else if (act === 'edit') openReminderForm(getReminder(id));
    if (afterChange) afterChange();
    return true;
}

// ---------------------------------------------------------------------------
// 1) المجموعة داخل بطاقة «مهام اليوم»
// ---------------------------------------------------------------------------
const GROUP_MAX_ROWS = 4;
let groupBound = false;

/** يجمع بطاقتي الرئيسية في غلاف واحد (تذكيراتي فوق «مهام اليوم») ليتنقّلا معاً؛ يُرجع بطاقة التذكيرات. */
function ensureReminderCard() {
    let host = document.getElementById('home-quickcard-reminders');
    if (host && host.isConnected) return host;
    const card = document.getElementById('home-quickcard');
    if (!card) return null;
    let stack = card.parentElement && card.parentElement.id === 'home-quick-stack' ? card.parentElement : null;
    if (!stack) {
        stack = document.createElement('div');
        stack.id = 'home-quick-stack';
        stack.className = 'home-quick-stack';
        card.parentNode.insertBefore(stack, card);
        stack.appendChild(card);
    }
    host = document.createElement('section');
    host.id = 'home-quickcard-reminders';
    host.className = 'dh-remcard';
    host.setAttribute('aria-label', t('rem_title'));
    stack.insertBefore(host, card);
    return host;
}

export function renderHomeReminders() {
    const host = ensureReminderCard();
    if (!host) return;
    host.setAttribute('aria-label', t('rem_title'));
    const now = Date.now();
    const tomorrow = addDays(dayStart(now), 1);
    const pending = getSorted().filter(r => !r.done && fireAt(r) < tomorrow);
    const total = getReminders().length;
    const shown = pending.slice(0, GROUP_MAX_ROWS);
    let body;
    if (shown.length) {
        body = `<div class="dh-rem-list">${shown.map(r => rowHtml(r, now, { showDate: dayStart(fireAt(r)) < dayStart(now) })).join('')}</div>
            <div class="dh-rem-foot"><button type="button" class="dh-rem-link" data-go="all">${esc(t('rem_view_all'))}${pending.length > shown.length ? ' (' + pending.length + ')' : ''}</button></div>`;
    } else {
        body = `<p class="dh-rem-empty">${esc(t('rem_empty'))}</p>
            <button type="button" class="dh-rem-addwide" data-go="add">${esc(t('rem_add_plus'))}</button>
            ${total ? `<div class="dh-rem-foot"><button type="button" class="dh-rem-link" data-go="all">${esc(t('rem_view_all'))}</button></div>` : ''}`;
    }
    host.innerHTML = `<div class="dh-rem-head"><span class="dh-rem-bellic">${ICON_BELL}</span><span class="dh-rem-title">${esc(t('rem_title'))}</span>
            ${pending.length ? `<span class="dh-rem-count">${pending.length}</span>` : ''}
            <button type="button" class="dh-rem-add" data-go="add" aria-label="${esc(t('rem_add'))}" title="${esc(t('rem_add'))}">＋</button></div>
        ${body}`;
    if (!host.dataset.remBound) {
        host.dataset.remBound = '1';
        host.addEventListener('click', (e) => {
            const go = e.target.closest('[data-go]');
            if (go) { if (go.dataset.go === 'add') openReminderForm(null); else openRemindersScreen(); return; }
            handleRowAction(e);
        });
    }
}

/** يُستدعى من setupSplashListeners (core/app.js) عند كل تحميل للرئيسية. */
export function initHomeReminders() {
    renderHomeReminders();
    if (groupBound) return;
    groupBound = true;
    document.addEventListener('dh:reminders-changed', renderHomeReminders);
    document.addEventListener('app-lang-changed', renderHomeReminders);
    // يتحدّث وضع «متأخر» والترتيب مع مرور الوقت دون تدخل
    setInterval(() => { if (document.getElementById('home-quickcard-reminders')) renderHomeReminders(); }, 60000);
}

// ---------------------------------------------------------------------------
// 2) الشاشة الكاملة
// ---------------------------------------------------------------------------
let screenEl = null;
let screenState = { tab: null, kind: 'all' };
let headerHomeHandler = null;

function defaultTab(now) {
    const s = summarize(getReminders(), now);
    return (s.today === 0 && s.overdue > 0) ? 'overdue' : 'today';
}

function renderScreen() {
    if (!screenEl) return;
    const now = Date.now();
    const all = getSorted();
    const sum = summarize(all, now);
    const kind = screenState.kind;
    const tab = screenState.tab;
    const items = all.filter(r => bucketOf(r, now) === tab && (kind === 'all' || r.kind === kind));
    const tabs = [['today', sum.today], ['upcoming', sum.upcoming], ['overdue', sum.overdue], ['done', sum.done]];
    let list = '';
    if (!items.length) {
        list = `<p class="dh-rem-nothing">${esc(t('rem_nothing'))}</p>`;
    } else if (tab === 'upcoming' || tab === 'overdue') {
        let last = null;
        for (const r of items) {
            const label = dayLabel(fireAt(r), now);
            if (label !== last) { list += `<div class="dh-rem-gh"><span>${esc(label)}</span></div>`; last = label; }
            list += rowHtml(r, now);
        }
    } else {
        list = items.map(r => rowHtml(r, now, { showDate: tab === 'done' })).join('');
    }
    const body = screenEl.querySelector('.dh-rem-sbody');
    const keep = body ? body.scrollTop : 0;
    body.innerHTML = `
        <div class="dh-rem-seg" role="tablist">${tabs.map(([k, n]) => `<button type="button" role="tab" aria-selected="${k === tab}" class="${k === tab ? 'is-on' : ''}${k === 'overdue' && n ? ' is-red' : ''}" data-tab="${k}"><b>${n}</b>${esc(t('rem_tab_' + k))}</button>`).join('')}</div>
        <div class="dh-rem-chips">${['all', 'student', 'personal', 'work'].map(k => `<button type="button" class="dh-rem-chip${k === kind ? ' is-on' : ''}" data-kind="${k}" aria-pressed="${k === kind}">${esc(t('rem_kind_' + k))}</button>`).join('')}</div>
        <div class="dh-rem-slist">${list}</div>`;
    body.scrollTop = keep;
    screenEl.querySelector('.dh-rem-scount').textContent = String(sum.actionable || '');
}

function onScreenKey(e) { if (e.key === 'Escape' && !document.querySelector('.dh-rem-modal')) closeRemindersScreen(); }
function onScreenResize() { if (screenEl) placeBelowMainHeader(screenEl); }

export function openRemindersScreen(tab) {
    if (screenEl) { if (tab) { screenState.tab = tab; renderScreen(); } return; }
    const now = Date.now();
    screenState = { tab: tab || defaultTab(now), kind: 'all' };
    screenEl = document.createElement('div');
    screenEl.className = 'dh-rem-screen';
    screenEl.setAttribute('role', 'dialog');
    screenEl.setAttribute('aria-label', t('rem_title'));
    screenEl.setAttribute('dir', isEnglish() ? 'ltr' : 'rtl');
    screenEl.innerHTML = `
        <div class="dh-rem-shead">
            <button type="button" class="dh-rem-ibtn" data-close="1" aria-label="${esc(t('rem_close'))}" title="${esc(t('rem_close'))}">✕</button>
            <h2>${esc(t('rem_title'))} <span class="dh-rem-count dh-rem-scount"></span></h2>
            <button type="button" class="dh-rem-pbtn" data-go="add">${esc(t('rem_add_plus'))}</button>
        </div>
        <div class="dh-rem-sbody"></div>
        <button type="button" class="dh-rem-fab" data-go="add" aria-label="${esc(t('rem_add'))}" title="${esc(t('rem_add'))}">＋</button>`;
    document.body.appendChild(screenEl);
    placeBelowMainHeader(screenEl);
    screenEl.addEventListener('click', (e) => {
        if (e.target.closest('[data-close]')) { closeRemindersScreen(); return; }
        if (e.target.closest('[data-go="add"]')) { openReminderForm(null); return; }
        const tabBtn = e.target.closest('[data-tab]');
        if (tabBtn) { screenState.tab = tabBtn.dataset.tab; renderScreen(); return; }
        const kindBtn = e.target.closest('[data-kind]');
        if (kindBtn) { screenState.kind = kindBtn.dataset.kind; renderScreen(); return; }
        handleRowAction(e);
    });
    document.addEventListener('keydown', onScreenKey);
    window.addEventListener('resize', onScreenResize);
    document.addEventListener('dh:reminders-changed', renderScreen);
    document.addEventListener('app-lang-changed', onScreenLang);
    document.addEventListener('dh:screen', closeRemindersScreen);
    headerHomeHandler = () => closeRemindersScreen();
    document.getElementById('header-home-btn')?.addEventListener('click', headerHomeHandler);
    renderScreen();
}

function onScreenLang() {
    if (!screenEl) return;
    const tab = screenState.tab, kind = screenState.kind;
    closeRemindersScreen();
    openRemindersScreen(tab);
    screenState.kind = kind;
    renderScreen();
}

export function closeRemindersScreen() {
    if (!screenEl) return;
    document.removeEventListener('keydown', onScreenKey);
    window.removeEventListener('resize', onScreenResize);
    document.removeEventListener('dh:reminders-changed', renderScreen);
    document.removeEventListener('app-lang-changed', onScreenLang);
    document.removeEventListener('dh:screen', closeRemindersScreen);
    if (headerHomeHandler) document.getElementById('header-home-btn')?.removeEventListener('click', headerHomeHandler);
    headerHomeHandler = null;
    screenEl.remove();
    screenEl = null;
}

// ---------------------------------------------------------------------------
// 3) نموذج الإضافة/التعديل
// ---------------------------------------------------------------------------
function toLocalInput(ts) {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function openReminderForm(reminder) {
    if (document.querySelector('.dh-rem-modal.dh-rem-form')) return;
    const editing = !!reminder;
    const now = Date.now();
    const q = quickTimes(now);
    const state = {
        kind: editing ? reminder.kind : 'personal',
        studentId: editing ? reminder.studentId : null,
        studentName: editing ? reminder.studentName : ''
    };
    const initialTs = editing ? fireAt(reminder) : q.hour;
    const ov = document.createElement('div');
    ov.className = 'dh-rem-modal dh-rem-form';
    ov.setAttribute('dir', isEnglish() ? 'ltr' : 'rtl');
    ov.innerHTML = `
        <div class="dh-rem-panel" role="dialog" aria-modal="true" aria-labelledby="dh-rem-f-h">
            <h3 id="dh-rem-f-h">${esc(t(editing ? 'rem_form_edit' : 'rem_form_new'))}</h3>
            <div><label class="dh-rem-lab" for="dh-rem-f-title">${esc(t('rem_f_title'))}</label>
                <input class="dh-rem-field" id="dh-rem-f-title" type="text" maxlength="140" placeholder="${esc(t('rem_f_title_ph'))}" value="${editing ? esc(reminder.title) : ''}" autocomplete="off"></div>
            <div><span class="dh-rem-lab">${esc(t('rem_f_kind'))}</span>
                <div class="dh-rem-chips" data-kinds>${['student', 'personal', 'work'].map(k => `<button type="button" class="dh-rem-chip${k === state.kind ? ' is-on' : ''}" data-kind="${k}">${esc(kindLabel(k))}</button>`).join('')}</div></div>
            <div data-student-wrap ${state.kind === 'student' ? '' : 'hidden'}><label class="dh-rem-lab" for="dh-rem-f-student">${esc(t('rem_f_student'))}</label>
                <select class="dh-rem-field" id="dh-rem-f-student"><option value="">${esc(t('rem_no_student'))}</option></select></div>
            <div><span class="dh-rem-lab">${esc(t('rem_f_when'))}</span>
                <div class="dh-rem-chips" data-quick>
                    <button type="button" class="dh-rem-chip" data-ts="${q.hour}">${esc(t('rem_q_hour'))}</button>
                    <button type="button" class="dh-rem-chip" data-ts="${q.evening}">${esc(t('rem_q_evening'))}</button>
                    <button type="button" class="dh-rem-chip" data-ts="${q.tomorrow}">${esc(t('rem_q_tomorrow'))}</button>
                </div>
                <input class="dh-rem-field" id="dh-rem-f-when" type="datetime-local" value="${toLocalInput(initialTs)}" style="margin-top:8px" aria-label="${esc(t('rem_f_when'))}"></div>
            <div><label class="dh-rem-lab" for="dh-rem-f-repeat">${esc(t('rem_f_repeat'))}</label>
                <select class="dh-rem-field" id="dh-rem-f-repeat">${['none', 'daily', 'weekly'].map(k => `<option value="${k}"${editing && reminder.repeat === k ? ' selected' : ''}>${esc(t('rem_r_' + k))}</option>`).join('')}</select></div>
            <label class="dh-rem-check"><input type="checkbox" id="dh-rem-f-urgent"${editing && reminder.urgent ? ' checked' : ''}> ${esc(t('rem_f_urgent'))}</label>
            <div class="dh-rem-err" id="dh-rem-f-err" role="alert"></div>
            <div class="dh-rem-actions">
                <button type="button" class="dh-rem-pbtn" data-save="1">${esc(t('rem_save'))}</button>
                <button type="button" class="dh-rem-sbtn" data-cancel="1">${esc(t('rem_cancel'))}</button>
                ${editing ? `<button type="button" class="dh-rem-dbtn" data-del="1">${esc(t('rem_delete'))}</button>` : ''}
            </div>
        </div>`;
    document.body.appendChild(ov);
    const $ = (s) => ov.querySelector(s);
    const titleEl = $('#dh-rem-f-title'), whenEl = $('#dh-rem-f-when'), errEl = $('#dh-rem-f-err'), stuSel = $('#dh-rem-f-student');

    const close = () => { document.removeEventListener('keydown', onKey); ov.remove(); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', onKey);

    const markQuick = () => {
        const v = new Date(whenEl.value).getTime();
        ov.querySelectorAll('[data-quick] .dh-rem-chip').forEach(c => c.classList.toggle('is-on', Number(c.dataset.ts) === v));
    };
    markQuick();

    // قائمة الطلاب (غير متزامنة؛ فشلها لا يمنع إضافة التذكير)
    (async () => {
        try {
            const students = AppState.studentManager ? await AppState.studentManager.getAllStudents() : [];
            students.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar')).forEach(s => {
                const o = document.createElement('option');
                o.value = String(s.id);
                o.textContent = s.name || String(s.id);
                stuSel.appendChild(o);
            });
            if (state.studentId != null) stuSel.value = String(state.studentId);
        } catch (e) { /* القائمة تبقى «بدون طالب» */ }
    })();

    ov.addEventListener('click', (e) => {
        if (e.target === ov || e.target.closest('[data-cancel]')) { close(); return; }
        const kindBtn = e.target.closest('[data-kinds] [data-kind]');
        if (kindBtn) {
            state.kind = kindBtn.dataset.kind;
            ov.querySelectorAll('[data-kinds] .dh-rem-chip').forEach(c => c.classList.toggle('is-on', c === kindBtn));
            $('[data-student-wrap]').hidden = state.kind !== 'student';
            return;
        }
        const quick = e.target.closest('[data-quick] [data-ts]');
        if (quick) { whenEl.value = toLocalInput(Number(quick.dataset.ts)); markQuick(); return; }
        if (e.target.closest('[data-del]')) {
            Promise.resolve(window.hamConfirm ? window.hamConfirm(t('rem_delete_confirm')) : true).then(ok => { if (ok) { removeReminder(reminder.id); close(); } });
            return;
        }
        if (e.target.closest('[data-save]')) save();
    });
    whenEl.addEventListener('input', markQuick);
    titleEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } });

    function save() {
        const title = titleEl.value.trim();
        if (!title) { errEl.textContent = t('rem_err_title'); titleEl.focus(); return; }
        const ts = new Date(whenEl.value).getTime();
        if (!Number.isFinite(ts)) { errEl.textContent = t('rem_err_time'); whenEl.focus(); return; }
        const unchangedTime = editing && ts === fireAt(reminder);
        if (!unchangedTime && ts < Date.now() - 60000) { errEl.textContent = t('rem_err_past'); whenEl.focus(); return; }
        const withStudent = state.kind === 'student' && stuSel.value !== '';
        const opt = stuSel.options[stuSel.selectedIndex];
        const sid = withStudent ? (isNaN(Number(stuSel.value)) ? stuSel.value : Number(stuSel.value)) : null;
        const fields = {
            title, kind: state.kind, repeat: $('#dh-rem-f-repeat').value, urgent: $('#dh-rem-f-urgent').checked,
            studentId: sid, studentName: withStudent && opt ? opt.textContent : ''
        };
        if (editing) updateReminder(reminder.id, { ...fields, ...(unchangedTime ? {} : { at: ts }) });
        else addReminder({ ...fields, at: ts });
        askNotificationPermissionOnce();
        close();
    }
    titleEl.focus();
}

// ---------------------------------------------------------------------------
// 4) التنبيه عند الموعد
// ---------------------------------------------------------------------------
async function openStudentOf(r) {
    try {
        const students = AppState.studentManager ? await AppState.studentManager.getAllStudents() : [];
        const s = students.find(x => String(x.id) === String(r.studentId));
        if (!s) { alert(t('rem_student_missing')); return; }
        AppState.currentStudent = s;
        closeRemindersScreen();
        loadStudentProfileScreen();
    } catch (e) { alert(t('rem_student_missing')); }
}

function snoozeChipsHtml() {
    return SNOOZE_MINUTES.map(m => `<button type="button" class="dh-rem-chip" data-sn="${m}">${esc(t(SNOOZE_KEYS[m]))}</button>`).join('')
        + `<button type="button" class="dh-rem-chip" data-sn="tomorrow">${esc(t('rem_sn_tomorrow'))}</button>`;
}
function applySnooze(id, v) { if (v === 'tomorrow') snoozeReminderToTomorrow(id); else snoozeReminder(id, Number(v)); }

// شريط علوي (الافتراضي): ينزلق تحت الترويسة، لا يقاطع، ويبقى حتى يتصرّف المعلم
const MAX_BANNERS = 3;
function ensureStack() {
    let s = document.getElementById('dh-rem-stack');
    if (!s) { s = document.createElement('div'); s.id = 'dh-rem-stack'; s.className = 'dh-rem-stack'; document.body.appendChild(s); }
    placeBelowMainHeader(s);
    return s;
}
function showBanner(opts) {
    const stack = ensureStack();
    while (stack.children.length >= MAX_BANNERS) stack.firstElementChild.remove();
    const b = document.createElement('div');
    b.className = 'dh-rem-banner';
    b.setAttribute('role', 'status');
    b.setAttribute('dir', isEnglish() ? 'ltr' : 'rtl');
    b.innerHTML = `
        <div class="dh-rem-btop">
            <span class="dh-rem-bic">${ICON_BELL}</span>
            <div class="dh-rem-btxt"><b>${esc(opts.title)}</b><small>${esc(opts.sub || '')}</small></div>
            <button type="button" class="dh-rem-bx" data-x="1" aria-label="${esc(t('rem_close'))}">✕</button>
        </div>
        <div class="dh-rem-bbtns">${opts.buttons}</div>
        <div class="dh-rem-bbtns" data-snz hidden>${opts.snooze ? snoozeChipsHtml() : ''}</div>`;
    stack.appendChild(b);
    b.addEventListener('click', (e) => {
        if (e.target.closest('[data-x]')) { b.remove(); return; }
        if (opts.onClick && opts.onClick(e, b)) return;
    });
    return b;
}

function dueBanner(r) {
    const sub = [fmtTime(fireAt(r)), r.studentName].filter(Boolean).join(' · ');
    showBanner({
        title: r.title, sub, snooze: true,
        buttons: `<button type="button" class="dh-rem-bbtn is-pri" data-do="done">${esc(t('rem_done'))}</button>
            <button type="button" class="dh-rem-bbtn" data-do="snooze">${esc(t('rem_snooze'))}</button>
            ${r.studentId != null ? `<button type="button" class="dh-rem-bbtn" data-do="student">${esc(t('rem_open_student'))}</button>` : ''}`,
        onClick: (e, b) => {
            const act = e.target.closest('[data-do]');
            if (act) {
                if (act.dataset.do === 'done') { completeReminder(r.id); b.remove(); }
                else if (act.dataset.do === 'snooze') { const z = b.querySelector('[data-snz]'); z.hidden = !z.hidden; }
                else if (act.dataset.do === 'student') { openStudentOf(r); b.remove(); }
                return true;
            }
            const sn = e.target.closest('[data-sn]');
            if (sn) { applySnooze(r.id, sn.dataset.sn); b.remove(); return true; }
            return false;
        }
    });
}

// نافذة وسط الشاشة (للتذكير «العاجل»): تُرتَّب في طابور فلا تتراكم نوافذ
const alertQueue = [];
let alertOpen = false;
function showAlertModal(r) {
    if (alertOpen) { alertQueue.push(r); return; }
    alertOpen = true;
    const ov = document.createElement('div');
    ov.className = 'dh-rem-modal dh-rem-alert';
    ov.setAttribute('dir', isEnglish() ? 'ltr' : 'rtl');
    ov.innerHTML = `
        <div class="dh-rem-panel" role="alertdialog" aria-modal="true" aria-labelledby="dh-rem-a-h">
            <div class="dh-rem-bell">${ICON_BELL}</div>
            <div class="dh-rem-when">${esc(t('rem_alert_now'))} · ${esc(fmtTime(fireAt(r)))}</div>
            <h3 id="dh-rem-a-h">${esc(r.title)}</h3>
            ${r.studentName ? `<div class="dh-rem-when">${esc(r.studentName)}</div>` : ''}
            ${alertQueue.length ? `<div class="dh-rem-more">${esc(tf('rem_more_waiting', { n: alertQueue.length }))}</div>` : ''}
            <div class="dh-rem-actions"><button type="button" class="dh-rem-pbtn" data-do="done">${esc(t('rem_done'))}</button>
                ${r.studentId != null ? `<button type="button" class="dh-rem-sbtn" data-do="student">${esc(t('rem_open_student'))}</button>` : ''}</div>
            <div class="dh-rem-snooze"><div class="dh-rem-lab">${esc(t('rem_snooze_or'))}</div><div class="dh-rem-chips">${snoozeChipsHtml()}</div></div>
        </div>`;
    document.body.appendChild(ov);
    const finish = () => {
        document.removeEventListener('keydown', onKey);
        ov.remove();
        alertOpen = false;
        const next = alertQueue.shift();
        if (next && getReminder(next.id)) showAlertModal(getReminder(next.id));
    };
    const onKey = (e) => { if (e.key === 'Escape') finish(); };   // الإغلاق بلا تصرّف يُبقي التذكير «متأخراً» في القائمة
    document.addEventListener('keydown', onKey);
    ov.addEventListener('click', (e) => {
        const act = e.target.closest('[data-do]');
        if (act) {
            if (act.dataset.do === 'done') completeReminder(r.id);
            else if (act.dataset.do === 'student') openStudentOf(r);
            finish();
            return;
        }
        const sn = e.target.closest('[data-sn]');
        if (sn) { applySnooze(r.id, sn.dataset.sn); finish(); }
    });
    ov.querySelector('[data-do="done"]').focus();
}

function onDue(e) {
    const r = e.detail && e.detail.reminder;
    if (!r) return;
    playReminderChime();
    notifyHidden(tf('rem_notif_title', { title: r.title }), [fmtTime(fireAt(r)), r.studentName].filter(Boolean).join(' · '), r.id);
    if (r.urgent) showAlertModal(r); else dueBanner(r);
}

function onMissed(e) {
    const list = (e.detail && e.detail.reminders) || [];
    if (!list.length) return;
    playReminderChime();
    notifyHidden(list.length === 1 ? t('rem_missed_one') : tf('rem_missed', { n: list.length }), list.map(r => r.title).slice(0, 3).join(' · '), 'missed');
    showBanner({
        title: list.length === 1 ? t('rem_missed_one') : tf('rem_missed', { n: list.length }),
        sub: list.slice(0, 2).map(r => r.title).join(' · '),
        buttons: `<button type="button" class="dh-rem-bbtn is-pri" data-do="view">${esc(t('rem_missed_view'))}</button>`,
        onClick: (ev, b) => {
            if (ev.target.closest('[data-do="view"]')) { openRemindersScreen(); b.remove(); return true; }
            return false;
        }
    });
}

let alertsBound = false;
/** يُستدعى مرة واحدة عند إقلاع المنصة (core/app.js) بجانب startReminderWatcher. */
export function bindReminderAlerts() {
    if (alertsBound) return;
    alertsBound = true;
    document.addEventListener('dh:reminder-due', onDue);
    document.addEventListener('dh:reminders-missed', onMissed);
}

export { actionableCount };
