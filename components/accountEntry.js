// components/accountEntry.js
// ☁️ [جديد 2026-10-16] أيقونة «حسابي والنسخ الاحتياطي» في الترويسة (index.html #header-account-btn): تعرض صورة المعلم أو أول حرف من اسمه،
// وتفتح شاشة components/account-screen.html، وتُظهر نقطة تنبيه (برتقالية: تحتاج نسخة / حمراء: لا توجد نسخة) إن كان على الجهاز طلاب
// ولا توجد نسخة حديثة (engine/backupHealth.js). لا تُظهر نقطة لمن لا طلاب عنده بعد (لا شيء يستحق الحماية فلا إزعاج).
import { AppState, openAccountScreen } from '../core/app.js';
import { t } from '../core/i18n.js';
import { backupHealth } from '../engine/backupHealth.js';

let inited = false;

async function studentsCount() {
    try { return AppState.studentManager ? (await AppState.studentManager.getAllStudents()).length : 0; } catch (e) { return 0; }
}

export async function refreshAccountEntry() {
    const btn = document.getElementById('header-account-btn');
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
    try {
        const drive = await import('../core/driveBackup.js');
        const { getLastBackupAt } = await import('../core/backupRestore.js');
        level = backupHealth({ driveAt: drive.isDriveEnabled() ? drive.getDriveLastOk() : null, localAt: getLastBackupAt() }).level;
    } catch (e) { /* نُبقي بلا نقطة */ }
    const show = level !== 'ok' && (await studentsCount()) > 0;
    ['header-account-dot', 'home-account-dot'].forEach(id => {
        const dot = document.getElementById(id);
        if (dot) { dot.hidden = !show; dot.dataset.level = level; }
    });
}

export function initAccountEntry() {
    if (inited) return;
    inited = true;
    // تفويض على المستند: زر الرئيسية يُعاد إنشاؤه مع كل تحميل للشاشة الرئيسية
    document.addEventListener('click', (e) => { if (e.target.closest('#header-account-btn, #home-account-btn')) openAccountScreen(); });
    ['dh:screen', 'dh:drive-backup-done', 'dh:local-backup-done', 'dh:backup-health'].forEach(ev => document.addEventListener(ev, () => refreshAccountEntry()));
    refreshAccountEntry();
}
