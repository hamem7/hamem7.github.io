// components/accountScreen.js
// ☁️ [جديد 2026-10-16] منطق شاشة «حسابي والنسخ الاحتياطي» (components/account-screen.html، المعاينة «أ»):
// سلامة البيانات (engine/backupHealth.js) + Google Drive (core/driveBackup.js) + نسخة الجهاز (core/backupRestore.js)
// + حساب الواجبات (مزامنة الأجهزة أُخفيت من الواجهة 2026-10-16 — راجع core/cloudSync.js). لا شيء هنا يلمس بيانات الطلاب مباشرة؛ كل الاستعادات تمرّ بـrestoreFromBackupFile (لقطة أمان قبلها).

import { AppState, loadSplashScreen } from '../core/app.js';
import { t } from '../core/i18n.js';
import { getTeacherEmail, isTeacherAuthed, signOutTeacher } from '../core/api.js';
import {
    exportFullBackup, restoreFromBackupFile, getLastBackupAt, inspectBackupFile, getSafetySnapshotInfo, restoreFromSafetySnapshot
} from '../core/backupRestore.js';
import { backupHealth } from '../engine/backupHealth.js';

const $ = (id) => document.getElementById(id);

function fmtDateTime(iso) {
    return new Intl.DateTimeFormat(AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US', {
        day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(new Date(iso));
}
function relDays(iso) {
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) return '';
    const d = Math.max(0, Math.floor((Date.now() - ms) / 86400000));
    if (d === 0) return t('acct_rel_today');
    if (d === 1) return t('acct_rel_yesterday');
    return t('acct_rel_days').replace('{n}', d);
}

const driveErrKey = (r) => ({
    ACCESS_DENIED: 'drive_err_denied', SCOPE_NOT_GRANTED: 'drive_err_scope', QUOTA: 'drive_err_quota',
    NETWORK: 'drive_err_network', GIS_UNAVAILABLE: 'drive_err_network', AUTH_REQUIRED: 'drive_err_auth',
    VERIFY_FAILED: 'drive_err_verify'
})[r && r.code] || 'drive_err_generic';

export async function initAccountScreen() {
    if (!$('acct-screen')) return;
    const drive = await import('../core/driveBackup.js');

    // ---------- الملخص ----------
    function renderProfile() {
        const p = AppState.currentTeacher || {};
        $('acct-name').textContent = p.name || t('acct_name_none');
        const mail = getTeacherEmail() || drive.getDriveAccountEmail();
        $('acct-email').textContent = mail || t('acct_not_signed_in');
        const ph = $('acct-photo');
        ph.textContent = '';
        if (p.photo) { const img = document.createElement('img'); img.src = p.photo; img.alt = ''; ph.appendChild(img); }
        else ph.textContent = '👤';
    }
    $('acct-edit-btn').addEventListener('click', async () => {
        await loadSplashScreen();
        document.getElementById('teacher-profile-edit-btn')?.click();
    });
    $('btn-back-account').setAttribute('aria-label', t('ms_back'));
    $('btn-back-account').setAttribute('title', t('ms_back'));
    $('btn-back-account').addEventListener('click', loadSplashScreen);

    // ---------- سلامة البيانات ----------
    function renderHealth() {
        const enabled = drive.isDriveEnabled();
        const driveAt = enabled ? drive.getDriveLastOk() : null;
        const localAt = getLastBackupAt();
        const h = backupHealth({ driveAt, localAt, warnAfterDays: drive.getDriveWarnAfterDays() });
        const box = $('acct-status');
        box.dataset.level = h.level;
        $('acct-status-ic').textContent = { ok: '✅', warn: '⚠️', bad: '🚨' }[h.level];
        $('acct-status-title').textContent = t('acct_status_' + h.level);
        const ul = $('acct-status-lines');
        ul.textContent = '';
        const add = (txt) => { const li = document.createElement('li'); li.textContent = txt; ul.appendChild(li); };
        if (h.level === 'bad') add(t('acct_status_bad_hint'));
        else {
            if (driveAt) {
                const n = drive.getDriveLastStudents();
                add(t('acct_status_line_drive').replace('{when}', relDays(driveAt)).replace('{students}', n ? ' — ' + t('drive_students_n').replace('{n}', n) : ''));
            }
            if (localAt) add(t('acct_status_line_local').replace('{when}', relDays(localAt)));
        }
        $('acct-status-cta-row').style.display = h.level === 'ok' ? 'none' : '';
        $('acct-status-cta').textContent = t(enabled ? 'drive_backup_now_btn' : 'drive_connect_btn');
        document.dispatchEvent(new CustomEvent('dh:backup-health', { detail: { level: h.level } }));
    }
    $('acct-status-cta').addEventListener('click', () => $('acct-drive-backup-btn').click());

    // ---------- Google Drive ----------
    function renderDrive() {
        const enabled = drive.isDriveEnabled();
        $('acct-drive-backup-btn').textContent = t(enabled ? 'drive_backup_now_btn' : 'drive_connect_btn');
        $('acct-drive-rows').style.display = enabled ? '' : 'none';
        $('acct-drive-auto-row').style.display = enabled ? 'flex' : 'none';
        $('acct-drive-disconnect').style.display = enabled ? '' : 'none';
        $('acct-drive-auto').checked = drive.isDriveAuto();
        $('acct-drive-freq-row').style.display = enabled && drive.isDriveAuto() ? 'flex' : 'none';
        $('acct-drive-freq').value = drive.getDriveAutoFreq();
        let info = t('drive_info_off');
        if (enabled) {
            const last = drive.getDriveLastOk();
            info = last ? '' : t('drive_info_none_yet');
            if (drive.driveNeedsReconnect()) info = (info ? info + '\n' : '') + t('drive_info_reconnect');
            $('acct-drive-email').textContent = drive.getDriveAccountEmail() || t('acct_drive_email_unknown');
            $('acct-drive-last').textContent = last ? `${fmtDateTime(last)} (${relDays(last)})` : t('acct_drive_never');
            const n = drive.getDriveBackupCount();
            $('acct-drive-count').textContent = n === null ? '—' : t('acct_drive_count_n').replace('{n}', n);
        }
        $('acct-drive-info').textContent = info;
        $('acct-drive-info').style.display = info ? '' : 'none';
        const mm = enabled && drive.driveAccountMismatch();
        $('acct-drive-mismatch').style.display = mm ? '' : 'none';
        if (mm) $('acct-drive-mismatch-text').textContent = t('acct_mismatch_text')
            .replace('{drive}', drive.getDriveAccountEmail() || '').replace('{hw}', getTeacherEmail() || '');
    }

    $('acct-drive-backup-btn').addEventListener('click', async () => {
        const btn = $('acct-drive-backup-btn');
        btn.disabled = true;
        $('acct-drive-info').style.display = '';
        $('acct-drive-info').textContent = t('drive_working');
        try {
            const r = await drive.runDriveBackup({ interactive: true });
            if (r.ok && r.skipped === 'no_students') alert(t('drive_skip_no_students'));
            else if (r.ok) alert(t('drive_done').replace('{students}', r.students).replace('{kb}', Math.max(1, Math.round(r.size / 1024))));
            else alert(t(driveErrKey(r)));
        } catch (e) {
            console.error('تعذرت النسخة على Drive:', e);
            alert(t('drive_err_generic'));
        } finally { btn.disabled = false; refresh(); }
    });

    $('acct-drive-change').addEventListener('click', async () => {
        const r = await drive.changeDriveAccount();
        if (!r.ok) alert(t(driveErrKey(r)));
        else alert(t('acct_drive_changed').replace('{email}', r.email || ''));
        refresh();
    });
    $('acct-drive-mismatch-keep').addEventListener('click', () => { drive.setDriveCustomAccount(true); refresh(); });
    $('acct-drive-mismatch-retry').addEventListener('click', async () => {
        const r = await drive.changeDriveAccount({ useHomeworkAccount: true });
        if (!r.ok) alert(t(driveErrKey(r)));
        refresh();
    });
    $('acct-drive-auto').addEventListener('change', () => { drive.setDriveAuto($('acct-drive-auto').checked); renderDrive(); });
    $('acct-drive-freq').addEventListener('change', () => drive.setDriveAutoFreq($('acct-drive-freq').value));
    $('acct-drive-disconnect').addEventListener('click', async () => {
        if (!await hamConfirm(t('drive_disconnect_confirm'))) return;
        drive.disconnectDrive();
        $('acct-drive-picker').style.display = 'none';
        refresh();
    });

    $('acct-drive-restore-btn').addEventListener('click', async () => {
        const btn = $('acct-drive-restore-btn');
        btn.disabled = true;
        try {
            const list = await drive.listBackupsForRestore();
            if (!list.length) { alert(t('drive_restore_none')); return; }
            const sel = $('acct-drive-select');
            sel.textContent = '';
            list.forEach(f => {
                const o = document.createElement('option');
                o.value = f.id; o.dataset.name = f.name;
                let when = f.createdTime;
                try { when = fmtDateTime(f.createdTime); } catch (e) { /* نعرض الخام */ }
                const n = f.appProperties && f.appProperties.students;
                o.textContent = `${when}${n ? ' — ' + t('drive_students_n').replace('{n}', n) : ''}`;
                sel.appendChild(o);
            });
            $('acct-drive-picker').style.display = '';
        } catch (e) {
            console.error('تعذر جلب نسخ Drive:', e);
            alert(t(driveErrKey(e)));
        } finally { btn.disabled = false; refresh(); }
    });
    $('acct-drive-pick-cancel').addEventListener('click', () => { $('acct-drive-picker').style.display = 'none'; });
    $('acct-drive-pick-go').addEventListener('click', async () => {
        const opt = $('acct-drive-select').selectedOptions && $('acct-drive-select').selectedOptions[0];
        if (!opt) return;
        const btn = $('acct-drive-pick-go');
        btn.disabled = true;
        try {
            const file = await drive.downloadBackupAsFile(opt.value, opt.dataset.name);
            await confirmAndRestore(file);
        } catch (e) {
            console.error('تعذر تنزيل نسخة Drive:', e);
            alert(t(driveErrKey(e)));
        } finally { btn.disabled = false; }
    });

    // ---------- على جهازي ----------
    function renderLocal() {
        const last = getLastBackupAt();
        $('acct-local-last').textContent = last ? `${t('profile_backup_last_prefix')}${fmtDateTime(last)}` : t('profile_backup_last_never');
    }
    async function renderUndo() {
        const btn = $('acct-local-undo-btn');
        const info = await getSafetySnapshotInfo();
        btn.style.display = info ? '' : 'none';
        if (info) { let when = info.createdAt; try { when = fmtDateTime(info.createdAt); } catch (e) { /* خام */ } btn.textContent = t('acct_undo_label').replace('{date}', when); btn.dataset.when = when; }
    }
    $('acct-local-backup-btn').addEventListener('click', async () => {
        const btn = $('acct-local-backup-btn');
        btn.disabled = true;
        try { await exportFullBackup(); } catch (e) { console.error('تعذر إنشاء النسخة الاحتياطية:', e); alert(t('backup_export_error')); }
        finally { btn.disabled = false; refresh(); }
    });
    $('acct-local-restore-btn').addEventListener('click', () => $('acct-local-restore-input').click());
    $('acct-local-restore-input').addEventListener('change', async () => {
        const input = $('acct-local-restore-input');
        const file = input.files && input.files[0];
        input.value = '';
        if (file) await confirmAndRestore(file);
    });
    $('acct-local-undo-btn').addEventListener('click', async () => {
        const btn = $('acct-local-undo-btn');
        if (!await hamConfirm(t('profile_backup_undo_confirm').replace('{date}', btn.dataset.when || ''))) return;
        btn.disabled = true;
        try { await restoreFromSafetySnapshot(); alert(t('profile_backup_undo_success')); location.reload(); }
        catch (e) { console.error('تعذر التراجع عن الاستعادة:', e); alert(t('profile_backup_restore_error')); btn.disabled = false; }
    });

    // معاينة + تأكيد + استعادة آمنة (لملف الجهاز ولنسخة Drive معاً)
    async function confirmAndRestore(file) {
        let msg = t('profile_backup_restore_confirm');
        try {
            const info = await inspectBackupFile(file);
            let when = info.exportedAt || '—';
            try { if (info.exportedAt) when = fmtDateTime(info.exportedAt); } catch (e2) { /* خام */ }
            msg = t('profile_backup_restore_confirm_detail').replace('{date}', when)
                .replace('{backupStudents}', info.studentsInBackup).replace('{nowStudents}', info.studentsNow);
        } catch (e) {
            alert(t(restoreErrKey(e, true)));
            return false;
        }
        if (!await hamConfirm(msg)) return false;
        try {
            await restoreFromBackupFile(file);
            alert(t('profile_backup_restore_success'));
            location.reload();   // أبسط وأضمن طريقة لتعكس كل الشاشات البيانات المُسترجَعة
            return true;
        } catch (e) {
            console.error('تعذر استرجاع النسخة الاحتياطية:', e);
            alert(t(restoreErrKey(e, false)));
            return false;
        }
    }
    function restoreErrKey(e, inspectOnly) {
        const m = e && e.message;
        if (m === 'STUDENTS_ONLY_BACKUP') return 'profile_backup_restore_students_only';
        if (m === 'INVALID_JSON' || m === 'INVALID_FORMAT') return 'profile_backup_restore_invalid_file';
        if (!inspectOnly && m === 'SAFETY_SNAPSHOT_FAILED') return 'profile_backup_restore_no_safety';
        if (!inspectOnly && m === 'RESTORE_FAILED_ROLLED_BACK') return 'profile_backup_restore_rolled_back';
        return 'profile_backup_restore_error';
    }

    // ---------- حساب الواجبات والمزامنة (مطوي) ----------
    function renderHw() {
        const authed = isTeacherAuthed();
        const mail = getTeacherEmail();
        $('acct-hw-email').textContent = authed ? (mail || t('acct_signed_in_unknown')) : t('acct_not_signed_in');
        $('acct-hw-change-btn').textContent = authed ? t('acct_change_btn') : t('acct_signin_btn');
        $('acct-hw-signout-btn').style.display = authed ? '' : 'none';
    }
    $('acct-hw-change-btn').addEventListener('click', async () => {
        const { changeTeacherAccount } = await import('./teacherAccount.js');
        await changeTeacherAccount();
        refresh();
    });
    $('acct-hw-signout-btn').addEventListener('click', async () => {
        if (!await hamConfirm(t('acct_signout_confirm'))) return;
        signOutTeacher();
        refresh();
    });
    function refresh() {
        if (!$('acct-screen')) return;   // خرج المعلم من الشاشة أثناء عملية طويلة
        renderProfile(); renderHealth(); renderDrive(); renderLocal(); renderUndo(); renderHw();
    }
    refresh();
}
