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
import { AppState, loadSplashScreen } from '../core/app.js';
import { loadScreen, switchTheme } from '../core/navigation.js';
import { esc } from '../core/escape.js';
import { loadStudentProfileScreen } from '../student/student.js';
import {
    getSorted, getReminders, getReminder, addReminder, updateReminder, removeReminder, completeReminder, snoozeReminder,
    snoozeReminderToTomorrow, actionableCount, playReminderChime, notifyHidden, askNotificationPermissionOnce
} from '../core/reminders.js';
import { fireAt, bucketOf, summarize, dayStart, addDays, quickTimes, firstOccurrence, SNOOZE_MINUTES } from '../engine/reminders.js';

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
        rem_f_repeat: 'التكرار', rem_r_none: 'مرة واحدة', rem_r_daily: 'كل يوم', rem_r_weekly: 'كل أسبوع',
        rem_rep_daily: 'يتكرر كل يوم', rem_rep_weekly: 'يتكرر كل أسبوع', rem_rep_weekly_days: 'كل {days}',
        rem_f_day: 'اليوم', rem_f_days: 'في أي الأيام؟', rem_f_time: 'الساعة', rem_other_date: 'تاريخ آخر…',
        rem_am: 'ص', rem_pm: 'م', rem_hour_up: 'زيادة الساعة', rem_hour_down: 'إنقاص الساعة', rem_min_up: 'زيادة الدقائق', rem_min_down: 'إنقاص الدقائق',
        rem_sum_once: '{day}، {time}', rem_sum_daily: 'كل يوم، {time}', rem_sum_weekly: 'كل {days}، {time}',
        rem_sum_next: 'أول تنبيه: {when}', rem_sum_forget: 'اضبطه مرة وسنُذكّرك دائمًا، ويتجدد وحده.',
        rem_err_days: 'اختر يومًا واحدًا على الأقل.',
        rem_and: ' و',
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
        rem_edit: 'تعديل', rem_back: 'رجوع', rem_hero_next: 'التالي', rem_hero_late: 'حان موعده', rem_all_clear: 'لا شيء بانتظارك', rem_all_clear_sub: 'كل تذكيراتك منجزة. أضف تذكيرًا جديدًا متى شئت.',
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
        rem_f_repeat: 'Repeat', rem_r_none: 'Once', rem_r_daily: 'Every day', rem_r_weekly: 'Every week',
        rem_rep_daily: 'Repeats every day', rem_rep_weekly: 'Repeats every week', rem_rep_weekly_days: 'Every {days}',
        rem_f_day: 'Day', rem_f_days: 'On which days?', rem_f_time: 'Time', rem_other_date: 'Other date…',
        rem_am: 'AM', rem_pm: 'PM', rem_hour_up: 'Hour up', rem_hour_down: 'Hour down', rem_min_up: 'Minutes up', rem_min_down: 'Minutes down',
        rem_sum_once: '{day}, {time}', rem_sum_daily: 'Every day, {time}', rem_sum_weekly: 'Every {days}, {time}',
        rem_sum_next: 'First alert: {when}', rem_sum_forget: 'Set it once and we will keep reminding you; it renews itself.',
        rem_err_days: 'Pick at least one day.',
        rem_and: ' & ',
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
        rem_edit: 'Edit', rem_back: 'Back', rem_hero_next: 'Next up', rem_hero_late: 'Due now', rem_all_clear: 'Nothing waiting', rem_all_clear_sub: 'All your reminders are done. Add a new one anytime.',
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
const ICON_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
const ICON_TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';
const ICON_BELL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 17V11a6 6 0 1 1 12 0v6l1.5 2h-15z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>';

function placeBelowMainHeader(el) {
    const h = document.getElementById('main-header');
    const bottom = h ? Math.max(0, Math.round(h.getBoundingClientRect().bottom)) : 0;
    el.style.top = bottom + 'px';
}

/** أسماء أيام الأسبوع (0=أحد … 6=سبت) باللغة الحالية. */
function weekdayName(dow, style = 'long') {
    return new Date(2026, 9, 25 + dow).toLocaleDateString(loc(), { weekday: style });   // 25 أكتوبر 2026 = أحد
}
/** ترتيب عرض الأيام: السبت أولاً بالعربية (أسبوع العمل في المنصة)، والأحد أولاً بالإنجليزية. */
const weekOrder = () => (isEnglish() ? [0, 1, 2, 3, 4, 5, 6] : [6, 0, 1, 2, 3, 4, 5]);
const daysText = (days) => days.slice().sort((a, b) => weekOrder().indexOf(a) - weekOrder().indexOf(b)).map(d => weekdayName(d)).join(t('rem_and'));

function repeatNote(r) {
    if (r.repeat === 'daily') return t('rem_rep_daily');
    if (r.repeat === 'weekly') return r.days && r.days.length ? tf('rem_rep_weekly_days', { days: daysText(r.days) }) : t('rem_rep_weekly');
    return '';
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
        ${opts.actions ? `<span class="dh-rem-tools"><button type="button" class="dh-rem-tool" data-act="edit" aria-label="${esc(t('rem_edit'))}" title="${esc(t('rem_edit'))}">${ICON_EDIT}</button><button type="button" class="dh-rem-tool is-del" data-act="delete" aria-label="${esc(t('rem_delete'))}" title="${esc(t('rem_delete'))}">${ICON_TRASH}</button></span>` : ''}
        <button type="button" class="dh-rem-ck" data-act="${r.done ? 'reopen' : 'done'}" aria-label="${esc(r.done ? t('rem_reopen_aria') : t('rem_done_aria'))}">${ICON_CHECK}</button>
    </div>`;
}

function handleRowAction(e, afterChange) {
    const btn = e.target.closest('[data-act]');
    if (!btn) return false;
    const row = btn.closest('[data-id]');
    const id = row && row.dataset.id;
    if (!id) return false;
    const act = btn.dataset.act;
    if (act === 'done') completeReminder(id);
    else if (act === 'reopen') updateReminder(id, { done: false, doneAt: null });
    else if (act === 'edit') openReminderForm(getReminder(id));
    else if (act === 'delete') {
        Promise.resolve(window.hamConfirm ? window.hamConfirm(t('rem_delete_confirm')) : confirm(t('rem_delete_confirm'))).then(ok => { if (ok) removeReminder(id); });
        return true;   // الحذف يُحدّث القائمة عبر dh:reminders-changed
    }
    if (afterChange) afterChange();
    return true;
}

// ---------------------------------------------------------------------------
// 1) المجموعة داخل بطاقة «مهام اليوم»
// ---------------------------------------------------------------------------
const GROUP_MAX_ROWS = 4;
let groupBound = false;

/** يجمع بطاقتي الرئيسية في غلاف واحد («مهام اليوم» فوق وتذكيراتي تحتها) ليتنقّلا معاً؛ يُرجع بطاقة التذكيرات. */
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
    stack.appendChild(host);   // تحت «مهام اليوم»
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
// 2) الشاشة الكاملة: شاشة عادية تُحقن في #app-root تحت الترويسة الموحّدة (كباقي المنصة) عبر loadScreen
// ---------------------------------------------------------------------------
const SCREEN_URL = 'components/reminders-screen.html';
let screenEl = null;
let screenState = { tab: null, kind: 'all' };
const ICON_BACK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
const TAB_ORDER = ['overdue', 'today', 'upcoming', 'done'];

function defaultTab(now) {
    const s = summarize(getReminders(), now);
    return (s.today === 0 && s.overdue > 0) ? 'overdue' : 'today';
}

/** «بعد ساعتين» / «in 2 hours» — بلا مفاتيح ترجمة إضافية (Intl يتكفّل باللغتين). */
function relText(ts, now) {
    const mins = Math.round((ts - now) / 60000);
    const rtf = new Intl.RelativeTimeFormat(loc(), { numeric: 'auto' });
    const abs = Math.abs(mins);
    if (abs < 1) return rtf.format(0, 'minute');
    if (abs < 60) return rtf.format(mins, 'minute');
    if (abs < 2880) return rtf.format(Math.round(mins / 60), 'hour');
    return rtf.format(Math.round(mins / 1440), 'day');
}

function heroHtml(all, now) {
    const next = all.filter(r => !r.done).sort((a, b) => fireAt(a) - fireAt(b))[0];
    if (!next) return `<div class="dh-rem-hero is-clear"><span class="dh-rem-hero-ic">${ICON_BELL}</span><div><b>${esc(t('rem_all_clear'))}</b><small>${esc(t('rem_all_clear_sub'))}</small></div></div>`;
    const f = fireAt(next), late = f <= now;
    const sub = [dayLabel(f, now), next.studentName].filter(Boolean).join(' · ');
    return `<div class="dh-rem-hero${late ? ' is-late' : ''}" data-id="${esc(next.id)}">
        <span class="dh-rem-hero-ic">${ICON_BELL}</span>
        <div class="dh-rem-hero-txt"><small>${esc(t(late ? 'rem_hero_late' : 'rem_hero_next'))} · ${esc(relText(f, now))}</small><b>${esc(next.title)}</b><small>${esc(sub)}</small></div>
        <span class="dh-rem-hero-time">${esc(fmtTime(f))}</span>
        <button type="button" class="dh-rem-ck" data-act="done" aria-label="${esc(t('rem_done_aria'))}">${ICON_CHECK}</button>
    </div>`;
}

function renderScreen() {
    if (!screenEl || !screenEl.isConnected) return;
    const now = Date.now();
    const all = getSorted();
    const sum = summarize(all, now);
    const { tab, kind } = screenState;
    const items = all.filter(r => bucketOf(r, now) === tab && (kind === 'all' || r.kind === kind));
    let list = '';
    if (!items.length) {
        list = `<div class="dh-rem-nothing">${ICON_BELL}<p>${esc(t('rem_nothing'))}</p><button type="button" class="dh-rem-addwide" data-go="add">${esc(t('rem_add_plus'))}</button></div>`;
    } else if (tab === 'upcoming' || tab === 'overdue') {
        let last = null;
        for (const r of items) {
            const label = dayLabel(fireAt(r), now);
            if (label !== last) { list += `<div class="dh-rem-gh"><span>${esc(label)}</span></div>`; last = label; }
            list += rowHtml(r, now, { actions: true });
        }
    } else {
        list = items.map(r => rowHtml(r, now, { showDate: tab === 'done', actions: true })).join('');
    }
    const dateLine = new Date(now).toLocaleDateString(loc(), { weekday: 'long', day: 'numeric', month: 'long' });
    const keep = window.scrollY;
    screenEl.innerHTML = `
        <div class="dh-rem-phead">
            <button type="button" class="dh-rem-back" data-close="1" aria-label="${esc(t('rem_back'))}" title="${esc(t('rem_back'))}">${ICON_BACK}</button>
            <div class="dh-rem-ptitle"><h2>${esc(t('rem_title'))}</h2><small>${esc(dateLine)}</small></div>
            <button type="button" class="dh-rem-pbtn" data-go="add">${esc(t('rem_add_plus'))}</button>
        </div>
        ${heroHtml(all, now)}
        <div class="dh-rem-tiles" role="tablist">${TAB_ORDER.map(k => `<button type="button" role="tab" aria-selected="${k === tab}" class="dh-rem-tile t-${k}${k === tab ? ' is-on' : ''}${k === 'overdue' && sum.overdue ? ' is-red' : ''}" data-tab="${k}"><b>${sum[k]}</b><span>${esc(t('rem_tab_' + k))}</span></button>`).join('')}</div>
        <div class="dh-rem-chips">${['all', 'student', 'personal', 'work'].map(k => `<button type="button" class="dh-rem-chip${k === kind ? ' is-on' : ''}" data-kind="${k}" aria-pressed="${k === kind}">${esc(t('rem_kind_' + k))}</button>`).join('')}</div>
        <div class="dh-rem-slist">${list}</div>`;
    window.scrollTo(0, keep);
}

function onScreenNav(e) {
    // أي شاشة أخرى تُحقن مكان هذه (dh:screen) → نفكّ المستمعين
    if (e.detail && e.detail.screen === SCREEN_URL) return;
    closeRemindersScreen();
}
function onScreenClick(e) {
    if (e.target.closest('[data-close]')) { loadSplashScreen(); return; }
    if (e.target.closest('[data-go="add"]')) { openReminderForm(null); return; }
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) { screenState.tab = tabBtn.dataset.tab; renderScreen(); return; }
    if (handleRowAction(e)) return;   // قبل شرائح النوع: الصف نفسه يحمل data-kind فكان يبتلع النقر
    const kindBtn = e.target.closest('.dh-rem-chip[data-kind]');
    if (kindBtn) { screenState.kind = kindBtn.dataset.kind; renderScreen(); }
}

export function openRemindersScreen(tab) {
    if (screenEl && screenEl.isConnected) { if (tab) { screenState.tab = tab; renderScreen(); } return; }
    screenState = { tab: tab || defaultTab(Date.now()), kind: 'all' };
    switchTheme('adult');
    document.body.style.backgroundImage = '';
    return loadScreen({
        templateUrl: SCREEN_URL,
        initFunction: () => {
            screenEl = document.getElementById('rem-screen');
            if (!screenEl) return;
            screenEl.addEventListener('click', onScreenClick);
            document.addEventListener('dh:reminders-changed', renderScreen);
            document.addEventListener('app-lang-changed', renderScreen);
            document.addEventListener('dh:screen', onScreenNav);
            if (!screenEl.dataset.tick) screenEl.dataset.tick = String(setInterval(renderScreen, 60000));
            renderScreen();
        }
    }).catch(err => console.error('تعذر فتح شاشة تذكيراتي:', err));
}

export function closeRemindersScreen() {
    if (!screenEl) return;
    clearInterval(Number(screenEl.dataset.tick));
    document.removeEventListener('dh:reminders-changed', renderScreen);
    document.removeEventListener('app-lang-changed', renderScreen);
    document.removeEventListener('dh:screen', onScreenNav);
    screenEl = null;
}

// ---------------------------------------------------------------------------
// 3) نموذج الإضافة/التعديل
// ---------------------------------------------------------------------------
const pad2 = (n) => String(n).padStart(2, '0');
const QUICK_HOURS = [[8, 0], [10, 0], [13, 0], [16, 0], [18, 0], [21, 0]];
const timeText = (h, m) => new Date(2026, 0, 1, h, m).toLocaleTimeString(loc(), { hour: 'numeric', minute: '2-digit' });
const atOf = (dayTs, h, m) => { const d = new Date(dayTs); d.setHours(h, m, 0, 0); return d.getTime(); };

export function openReminderForm(reminder) {
    if (document.querySelector('.dh-rem-modal.dh-rem-form')) return;
    const editing = !!reminder;
    const now = Date.now();
    // الحالة الابتدائية: جديد = اليوم بعد ساعة تقريباً (مقرَّبة لأقرب 5 دقائق)؛ تعديل = من موعد التذكير الأساسي
    const seed = new Date(editing ? reminder.at : quickTimes(now).hour);
    if (!editing) { seed.setMinutes(Math.ceil(seed.getMinutes() / 5) * 5, 0, 0); }
    const state = {
        kind: editing ? reminder.kind : 'personal',
        studentId: editing ? reminder.studentId : null,
        repeat: editing ? reminder.repeat : 'none',
        days: editing ? (reminder.days.length ? reminder.days.slice() : [seed.getDay()]) : [seed.getDay()],
        dayTs: dayStart(seed.getTime()),
        h: seed.getHours(),
        m: seed.getMinutes()
    };
    const orig = editing ? { repeat: reminder.repeat, days: reminder.days.slice(), dayTs: dayStart(reminder.at), h: seed.getHours(), m: seed.getMinutes() } : null;

    const ov = document.createElement('div');
    ov.className = 'dh-rem-modal dh-rem-form';
    ov.setAttribute('dir', isEnglish() ? 'ltr' : 'rtl');
    const dayStrip = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(i => {
        const ts = addDays(dayStart(now), i);
        const top = i === 0 ? t('rem_day_today') : (i === 1 ? t('rem_day_tomorrow') : weekdayName(new Date(ts).getDay(), 'short'));
        return `<button type="button" class="dh-rem-day" data-day="${ts}"><small>${esc(top)}</small><b>${new Date(ts).getDate()}</b></button>`;
    }).join('');
    ov.innerHTML = `
        <div class="dh-rem-panel" role="dialog" aria-modal="true" aria-labelledby="dh-rem-f-h">
            <h3 id="dh-rem-f-h">${esc(t(editing ? 'rem_form_edit' : 'rem_form_new'))}</h3>
            <div><label class="dh-rem-lab" for="dh-rem-f-title">${esc(t('rem_f_title'))}</label>
                <input class="dh-rem-field" id="dh-rem-f-title" type="text" maxlength="140" placeholder="${esc(t('rem_f_title_ph'))}" value="${editing ? esc(reminder.title) : ''}" autocomplete="off"></div>
            <div><span class="dh-rem-lab">${esc(t('rem_f_kind'))}</span>
                <div class="dh-rem-chips" data-kinds>${['student', 'personal', 'work'].map(k => `<button type="button" class="dh-rem-chip" data-kind="${k}">${esc(kindLabel(k))}</button>`).join('')}</div></div>
            <div data-student-wrap hidden><label class="dh-rem-lab" for="dh-rem-f-student">${esc(t('rem_f_student'))}</label>
                <select class="dh-rem-field" id="dh-rem-f-student"><option value="">${esc(t('rem_no_student'))}</option></select></div>
            <div><span class="dh-rem-lab">${esc(t('rem_f_repeat'))}</span>
                <div class="dh-rem-chips" data-reps>${['none', 'daily', 'weekly'].map(k => `<button type="button" class="dh-rem-chip" data-rep="${k}">${esc(t('rem_r_' + k))}</button>`).join('')}</div></div>
            <div data-once><span class="dh-rem-lab">${esc(t('rem_f_day'))}</span>
                <div class="dh-rem-days" data-strip>${dayStrip}<button type="button" class="dh-rem-day is-other" data-other><b>…</b><small>${esc(t('rem_other_date'))}</small></button></div>
                <input class="dh-rem-field" id="dh-rem-f-date" type="date" hidden aria-label="${esc(t('rem_other_date'))}" style="margin-top:8px"></div>
            <div data-weekly hidden><span class="dh-rem-lab">${esc(t('rem_f_days'))}</span>
                <div class="dh-rem-chips" data-wds>${weekOrder().map(d => `<button type="button" class="dh-rem-chip" data-wd="${d}">${esc(weekdayName(d))}</button>`).join('')}</div></div>
            <div><span class="dh-rem-lab">${esc(t('rem_f_time'))}</span>
                <div class="dh-rem-timebox" dir="ltr">
                    <div class="dh-rem-step"><button type="button" class="dh-rem-sb" data-step="h:-1" aria-label="${esc(t('rem_hour_down'))}">−</button><output class="dh-rem-tv" data-out="h"></output><button type="button" class="dh-rem-sb" data-step="h:1" aria-label="${esc(t('rem_hour_up'))}">+</button></div>
                    <span class="dh-rem-colon">:</span>
                    <div class="dh-rem-step"><button type="button" class="dh-rem-sb" data-step="m:-5" aria-label="${esc(t('rem_min_down'))}">−</button><output class="dh-rem-tv" data-out="m"></output><button type="button" class="dh-rem-sb" data-step="m:5" aria-label="${esc(t('rem_min_up'))}">+</button></div>
                    <div class="dh-rem-ampm"><button type="button" class="dh-rem-chip" data-ap="am">${esc(t('rem_am'))}</button><button type="button" class="dh-rem-chip" data-ap="pm">${esc(t('rem_pm'))}</button></div>
                </div>
                <div class="dh-rem-chips" data-quick style="margin-top:8px">${QUICK_HOURS.map(([h, m]) => `<button type="button" class="dh-rem-chip" data-qh="${h}" data-qm="${m}">${esc(timeText(h, m))}</button>`).join('')}</div></div>
            <div class="dh-rem-sum" id="dh-rem-f-sum" aria-live="polite"></div>
            <label class="dh-rem-check"><input type="checkbox" id="dh-rem-f-urgent"${editing && reminder.urgent ? ' checked' : ''}> ${esc(t('rem_f_urgent'))}</label>
            <div class="dh-rem-err" id="dh-rem-f-err" role="alert"></div>
            <div class="dh-rem-actions">
                <button type="button" class="dh-rem-pbtn" data-save="1">${esc(t('rem_save'))}</button>
                <button type="button" class="dh-rem-sbtn" data-cancel="1">${esc(t('rem_cancel'))}</button>
                ${editing ? `<button type="button" class="dh-rem-dbtn" data-del="1">${esc(t('rem_delete'))}</button>` : ''}
            </div>
        </div>`;
    document.body.appendChild(ov);
    const $ = (sel) => ov.querySelector(sel);
    const $$ = (sel) => Array.from(ov.querySelectorAll(sel));
    const titleEl = $('#dh-rem-f-title'), errEl = $('#dh-rem-f-err'), stuSel = $('#dh-rem-f-student'), dateEl = $('#dh-rem-f-date');

    const close = () => { document.removeEventListener('keydown', onKey); ov.remove(); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', onKey);

    /** موعد التنبيه الأول بحسب الحالة الحالية (أو null مع سبب الخطأ). */
    function computeAt() {
        if (state.repeat === 'none') return { at: atOf(state.dayTs, state.h, state.m) };
        if (state.repeat === 'daily') return { at: firstOccurrence('daily', [], state.h, state.m, Date.now()) };
        if (!state.days.length) return { err: 'rem_err_days' };
        return { at: firstOccurrence('weekly', state.days, state.h, state.m, Date.now()) };
    }
    const sameSchedule = () => !!orig && orig.repeat === state.repeat && orig.h === state.h && orig.m === state.m
        && (state.repeat === 'none' ? orig.dayTs === state.dayTs : (state.repeat === 'daily' || orig.days.slice().sort().join() === state.days.slice().sort().join()));

    function render() {
        $$('[data-kinds] .dh-rem-chip').forEach(c => c.classList.toggle('is-on', c.dataset.kind === state.kind));
        $('[data-student-wrap]').hidden = state.kind !== 'student';
        $$('[data-reps] .dh-rem-chip').forEach(c => c.classList.toggle('is-on', c.dataset.rep === state.repeat));
        $('[data-once]').hidden = state.repeat !== 'none';
        $('[data-weekly]').hidden = state.repeat !== 'weekly';
        $$('[data-strip] .dh-rem-day[data-day]').forEach(c => c.classList.toggle('is-on', Number(c.dataset.day) === state.dayTs));
        const inStrip = !!$(`[data-strip] [data-day="${state.dayTs}"]`);
        const other = $('[data-other]');
        other.classList.toggle('is-on', !inStrip);
        other.querySelector('small').textContent = inStrip ? t('rem_other_date') : dayLabel(state.dayTs, now);
        $$('[data-wd]').forEach(c => c.classList.toggle('is-on', state.days.includes(Number(c.dataset.wd))));
        const h12 = state.h % 12 === 0 ? 12 : state.h % 12;
        $('[data-out="h"]').textContent = String(h12);
        $('[data-out="m"]').textContent = pad2(state.m);
        $$('[data-ap]').forEach(c => c.classList.toggle('is-on', (c.dataset.ap === 'pm') === (state.h >= 12)));
        $$('[data-quick] .dh-rem-chip').forEach(c => c.classList.toggle('is-on', Number(c.dataset.qh) === state.h && Number(c.dataset.qm) === state.m));
        // الملخص: ما سيحدث بالضبط (ويؤكد «اضبطه وانسه» للمتكرر)
        const when = timeText(state.h, state.m);
        let line;
        if (state.repeat === 'none') line = tf('rem_sum_once', { day: dayLabel(state.dayTs, now), time: when });
        else if (state.repeat === 'daily') line = tf('rem_sum_daily', { time: when });
        else line = state.days.length ? tf('rem_sum_weekly', { days: daysText(state.days), time: when }) : '';
        const c = computeAt();
        const first = c.at ? tf('rem_sum_next', { when: `${dayLabel(c.at, now)}، ${fmtTime(c.at)}` }) : '';
        const forget = state.repeat !== 'none' ? t('rem_sum_forget') : '';
        $('#dh-rem-f-sum').innerHTML = `<b>${esc(line)}</b>${state.repeat !== 'none' && first ? `<span>${esc(first)}</span>` : ''}${forget ? `<span>${esc(forget)}</span>` : ''}`;
        errEl.textContent = '';
    }
    render();

    // قائمة الطلاب (غير متزامنة؛ فشلها لا يمنع إضافة التذكير)
    (async () => {
        try {
            const students = AppState.studentManager ? await AppState.studentManager.getAllStudents() : [];
            students.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar')).forEach(st => {
                const o = document.createElement('option');
                o.value = String(st.id);
                o.textContent = st.name || String(st.id);
                stuSel.appendChild(o);
            });
            if (state.studentId != null) stuSel.value = String(state.studentId);
        } catch (e) { /* القائمة تبقى «بدون طالب» */ }
    })();

    ov.addEventListener('click', (e) => {
        if (e.target === ov || e.target.closest('[data-cancel]')) { close(); return; }
        const kindBtn = e.target.closest('[data-kinds] [data-kind]');
        if (kindBtn) { state.kind = kindBtn.dataset.kind; render(); return; }
        const rep = e.target.closest('[data-rep]');
        if (rep) { state.repeat = rep.dataset.rep; render(); return; }
        const day = e.target.closest('[data-strip] [data-day]');
        if (day) { state.dayTs = Number(day.dataset.day); render(); return; }
        if (e.target.closest('[data-other]')) { dateEl.hidden = false; try { dateEl.showPicker ? dateEl.showPicker() : dateEl.focus(); } catch (err) { dateEl.focus(); } return; }
        const wd = e.target.closest('[data-wd]');
        if (wd) {
            const d = Number(wd.dataset.wd);
            state.days = state.days.includes(d) ? state.days.filter(x => x !== d) : state.days.concat(d);
            render(); return;
        }
        const step = e.target.closest('[data-step]');
        if (step) {
            const [k, n] = step.dataset.step.split(':'); const delta = Number(n);
            if (k === 'h') state.h = (state.h + delta + 24) % 24;
            else { const total = (state.h * 60 + state.m + delta + 1440) % 1440; state.h = Math.floor(total / 60); state.m = total % 60; }
            render(); return;
        }
        const ap = e.target.closest('[data-ap]');
        if (ap) { const pm = ap.dataset.ap === 'pm'; if (pm !== (state.h >= 12)) state.h = (state.h + 12) % 24; render(); return; }
        const q = e.target.closest('[data-qh]');
        if (q) { state.h = Number(q.dataset.qh); state.m = Number(q.dataset.qm); render(); return; }
        if (e.target.closest('[data-del]')) {
            Promise.resolve(window.hamConfirm ? window.hamConfirm(t('rem_delete_confirm')) : true).then(ok => { if (ok) { removeReminder(reminder.id); close(); } });
            return;
        }
        if (e.target.closest('[data-save]')) save();
    });
    dateEl.addEventListener('change', () => {
        const [y, mo, d] = String(dateEl.value).split('-').map(Number);
        if (y && mo && d) { state.dayTs = new Date(y, mo - 1, d).getTime(); dateEl.hidden = true; render(); }
    });
    titleEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } });

    function save() {
        const title = titleEl.value.trim();
        if (!title) { errEl.textContent = t('rem_err_title'); titleEl.focus(); return; }
        const c = computeAt();
        if (c.err) { errEl.textContent = t(c.err); return; }
        const unchanged = sameSchedule();
        if (!unchanged && state.repeat === 'none' && c.at < Date.now() - 60000) { errEl.textContent = t('rem_err_past'); return; }
        const withStudent = state.kind === 'student' && stuSel.value !== '';
        const opt = stuSel.options[stuSel.selectedIndex];
        const sid = withStudent ? (isNaN(Number(stuSel.value)) ? stuSel.value : Number(stuSel.value)) : null;
        const fields = {
            title, kind: state.kind, repeat: state.repeat, days: state.repeat === 'weekly' ? state.days : [], urgent: $('#dh-rem-f-urgent').checked,
            studentId: sid, studentName: withStudent && opt ? opt.textContent : ''
        };
        if (editing) updateReminder(reminder.id, { ...fields, ...(unchanged ? {} : { at: c.at }) });
        else addReminder({ ...fields, at: c.at });
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
