// components/accountEntry.js
// ☁️ [جديد 2026-10-16] أيقونة «حسابي والنسخ الاحتياطي» في الترويسة (index.html #header-account-btn): تعرض صورة المعلم أو أول حرف من اسمه،
// وتفتح شاشة components/account-screen.html، وتُظهر نقطة تنبيه (برتقالية: تحتاج نسخة / حمراء: لا توجد نسخة) إن كان على الجهاز طلاب
// ولا توجد نسخة حديثة (engine/backupHealth.js). لا تُظهر نقطة لمن لا طلاب عنده بعد (لا شيء يستحق الحماية فلا إزعاج).
import { AppState, openAccountScreen } from '../core/app.js';
import { getTeacherEmail, isTeacherAuthed, signOutTeacher } from '../core/api.js';
import { t } from '../core/i18n.js';
import { canLeave } from '../core/leaveGuard.js';
import { backupHealth } from '../engine/backupHealth.js';
import { backupReminder } from '../engine/backupReminder.js';

let inited = false;

async function studentsCount() {
    try { return AppState.studentManager ? (await AppState.studentManager.getAllStudents()).length : 0; } catch (e) { return 0; }
}

/** حالة النسخ الاحتياطي: الزمن (backupHealth) + التغيّر منذ آخر نسخة (backupReminder). مع تذكير ينتقل ok ← warn. */
export async function computeBackupState() {
    const drive = await import('../core/driveBackup.js');
    const { getLastBackupAt, getLastBackupStudents } = await import('../core/backupRestore.js');
    const driveAt = drive.isDriveEnabled() ? drive.getDriveLastOk() : null;
    const localAt = getLastBackupAt();
    const health = backupHealth({ driveAt, localAt, warnAfterDays: drive.getDriveWarnAfterDays() });
    // عدد طلاب أحدث نسخة (Drive أو ملف الجهاز، أيهما أحدث)
    const dMs = Date.parse(driveAt || ''), lMs = Date.parse(localAt || '');
    const driveNewer = Number.isFinite(dMs) && (!Number.isFinite(lMs) || dMs >= lMs);
    const backedStudents = driveNewer ? drive.getDriveLastStudents() : getLastBackupStudents();
    const students = await studentsCount();
    const reminder = backupReminder({ students, backedStudents, ageDays: health.ageDays });
    const level = health.level === 'ok' && reminder.remind ? 'warn' : health.level;
    return { level, health, reminder, students };
}

export async function refreshAccountEntry() {
    const btn = document.getElementById('header-account-btn');
    const wrap = document.getElementById('header-account-wrap');
    if (wrap) wrap.style.display = '';
    if (btn) btn.style.display = '';
    const p = AppState.currentTeacher || {};
    const ic = document.getElementById('header-account-ic');
    if (ic) {
        ic.textContent = '';
        if (p.photo) { const img = document.createElement('img'); img.src = p.photo; img.alt = ''; ic.appendChild(img); }
        else ic.textContent = (p.name || '').trim().charAt(0) || '👤';
    }
    if (btn) { const label = t('acct_entry_title'); btn.title = label; btn.setAttribute('aria-label', label); }

    let level = 'ok';
    try { level = (await computeBackupState()).level; } catch (e) { /* نُبقي بلا نقطة */ }
    const show = level !== 'ok' && (await studentsCount()) > 0;
    ['header-account-dot', 'home-account-dot'].forEach(id => {
        const dot = document.getElementById(id);
        if (dot) { dot.hidden = !show; dot.dataset.level = level; }
    });
    // نقطة الترويسة نقطة حالة دائمة: بلا تنبيه تكون خضراء (سليم)، وبه تأخذ لون المستوى
    const hdot = document.getElementById('header-account-dot');
    if (hdot) {
        const lv = show ? level : 'ok';
        hdot.hidden = false;
        hdot.dataset.level = lv;
        hdot.title = t('acct_status_' + lv);
    }
    refreshAccountMenu();
}

/** رأس القائمة المنسدلة (الاسم والإيميل) وإظهار «تسجيل الخروج» فقط عند وجود جلسة جوجل. */
function refreshAccountMenu() {
    const p = AppState.currentTeacher || {};
    const name = document.getElementById('ham-name');
    if (name) name.textContent = p.name || t('acct_name_none');
    const mail = document.getElementById('ham-email');
    if (mail) mail.textContent = (isTeacherAuthed() && getTeacherEmail()) || '';
    const out = document.getElementById('ham-logout');
    if (out) out.hidden = !isTeacherAuthed();
}

function setMenuOpen(open) {
    const wrap = document.getElementById('header-account-wrap');
    if (!wrap) return;
    wrap.classList.toggle('is-open', open);
    document.getElementById('header-account-btn')?.setAttribute('aria-expanded', String(open));
}

async function openProfile() {
    await openAccountScreen();
    document.getElementById('acct-edit-btn')?.click();   // يفتح بطاقة «تعديل بياناتي» داخل شاشة الحساب
}

async function doLogout() {
    if (!await hamConfirm(t('acct_menu_logout_confirm'))) return;
    signOutTeacher();
    refreshAccountMenu();
    document.dispatchEvent(new CustomEvent('dh:backup-health'));
}

export function initAccountEntry() {
    if (inited) return;
    inited = true;
    // تفويض على المستند: زر الرئيسية يُعاد إنشاؤه مع كل تحميل للشاشة الرئيسية
    document.addEventListener('click', (e) => {
        if (e.target.closest('#home-account-btn')) { canLeave().then(ok => { if (ok) openAccountScreen(); }); return; }
        // زر الترويسة يفتح/يغلق القائمة المنسدلة (النقر للجوال؛ على الحاسوب تظهر أيضاً بمرور الماوس)
        if (e.target.closest('#header-account-btn')) { const w = document.getElementById('header-account-wrap'); setMenuOpen(!w?.classList.contains('is-open')); return; }
        const item = e.target.closest('#header-account-menu .ham-item');
        if (item) {
            setMenuOpen(false);
            item.blur();
            if (item.id === 'ham-logout') { doLogout(); return; }
            // حارس الخروج من اختبار جارٍ (core/leaveGuard.js) قبل مغادرة الشاشة الحالية
            canLeave().then(ok => { if (ok) (item.id === 'ham-profile' ? openProfile() : openAccountScreen()); });
            return;
        }
        setMenuOpen(false);   // نقر خارج القائمة
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { setMenuOpen(false); }
    });
    document.addEventListener('app-lang-changed', refreshAccountEntry);
    ['dh:screen', 'dh:drive-backup-done', 'dh:local-backup-done', 'dh:backup-health'].forEach(ev => document.addEventListener(ev, () => refreshAccountEntry()));
    refreshAccountEntry();
}
