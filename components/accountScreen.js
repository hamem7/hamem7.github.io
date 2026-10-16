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
import { accountProgress } from '../engine/accountProgress.js';
import { computeBackupState } from './accountEntry.js';

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
    VERIFY_FAILED: 'drive_err_verify', POPUP_STALLED: 'drive_err_popup', POPUP_BLOCKED: 'drive_err_popup'
})[r && r.code] || 'drive_err_generic';

export async function initAccountScreen() {
    if (!$('acct-screen')) return;
    const drive = await import('../core/driveBackup.js');

    const card = $('acct-edit-card');
    const profileEmpty = () => { const p = AppState.currentTeacher || {}; return !(p.name || p.photo || p.dob || p.stamp); };
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
        // أول دخول (لا اسم ولا صورة ولا ميلاد ولا ختم): «إضافة بياناتي» بدل «تعديل بياناتي»
        const key = profileEmpty() ? 'acct_page_add_btn' : 'acct_page_edit_btn';
        const eb = $('acct-edit-btn'); eb.dataset.i18n = key; eb.textContent = t(key);
        const tk = profileEmpty() ? 'acct_edit_add_title' : 'profile_modal_title';
        const th = card.querySelector('h3'); th.dataset.i18n = tk; th.textContent = t(tk);
    }
    function renderEditEmail() {
        const mail = getTeacherEmail();
        $('acct-edit-email').textContent = mail || t('acct_edit_email_none');
        $('acct-edit-email-btn').textContent = t(mail ? 'acct_edit_email_change_btn' : 'acct_edit_email_link_btn');
    }
    // ---------- تعديل البيانات داخل نفس الشاشة (بدل نافذة الرئيسية) ----------
    const dayEl = $('acct-edit-dob-day'), monEl = $('acct-edit-dob-month'), yearEl = $('acct-edit-dob-year');
    let pendingPhoto = null, pendingStamp = null;
    const fillSel = (sel, key, from, to, desc) => {
        sel.innerHTML = '';
        const ph = document.createElement('option'); ph.value = ''; ph.textContent = t(key); sel.appendChild(ph);
        const add = (n) => { const o = document.createElement('option'); o.value = String(n); o.textContent = String(n); sel.appendChild(o); };
        if (desc) { for (let n = to; n >= from; n--) add(n); } else { for (let n = from; n <= to; n++) add(n); }
        sel.setAttribute('aria-label', t(key));
    };
    const renderStamp = () => {
        const img = $('acct-edit-stamp'), lbl = $('acct-edit-stamp-zone').querySelector('span');
        img.hidden = !pendingStamp; if (pendingStamp) img.src = pendingStamp;
        lbl.textContent = pendingStamp ? '' : t('acct_edit_stamp_empty');
    };
    const readDob = () => {
        const y = parseInt(yearEl.value, 10), mo = parseInt(monEl.value, 10), d = parseInt(dayEl.value, 10);
        if (!y || !mo || !d) return null;
        const c = new Date(y, mo - 1, d);
        if (c.getFullYear() !== y || c.getMonth() !== mo - 1 || c.getDate() !== d) return null;
        return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    };
    function openEdit() {
        const p = AppState.currentTeacher || {};
        $('acct-edit-name').value = p.name || '';
        $('acct-edit-gender').value = p.gender === 'female' ? 'female' : 'male';
        fillSel(dayEl, 'profile_dob_day', 1, 31); fillSel(monEl, 'profile_dob_month', 1, 12); fillSel(yearEl, 'profile_dob_year', 1900, new Date().getFullYear(), true);
        const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(p.dob || '');
        if (m) { yearEl.value = String(+m[1]); monEl.value = String(+m[2]); dayEl.value = String(+m[3]); }
        pendingPhoto = p.photo || null; $('acct-edit-photo').src = p.photo || 'icons/icon-192.png';
        pendingStamp = p.stamp || null; renderStamp();
        renderEditEmail();
        card.hidden = false;
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        $('acct-edit-name').focus({ preventScroll: true });
    }
    const closeEdit = () => { card.hidden = true; };
    $('acct-edit-btn').addEventListener('click', () => { if (card.hidden) openEdit(); else closeEdit(); });
    $('acct-edit-cancel').addEventListener('click', closeEdit);
    $('acct-edit-email-btn').addEventListener('click', async () => {
        const { changeTeacherAccount } = await import('./teacherAccount.js');
        await changeTeacherAccount();
        renderEditEmail(); refresh();
    });
    const pickImage = (zoneId, inputId, apply) => {
        $(zoneId).addEventListener('click', () => $(inputId).click());
        $(inputId).addEventListener('change', async () => {
            const f = $(inputId).files && $(inputId).files[0]; $(inputId).value = '';
            if (!f || !f.type || !f.type.startsWith('image/')) return;
            try { await apply(f); } catch (e) { console.error('تعذر معالجة الصورة:', e); }
        });
    };
    const { resizeImageToDataUrl } = await import('./teacherProfile.js');
    pickImage('acct-edit-photo-zone', 'acct-edit-photo-input', async (f) => { pendingPhoto = await resizeImageToDataUrl(f, 300, 0.85); $('acct-edit-photo').src = pendingPhoto; });
    pickImage('acct-edit-stamp-zone', 'acct-edit-stamp-input', async (f) => { pendingStamp = await resizeImageToDataUrl(f, 420, 0.9, 'image/png'); renderStamp(); });
    $('acct-edit-save').addEventListener('click', async () => {
        const btn = $('acct-edit-save'); btn.disabled = true;
        const wasFirstTime = profileEmpty();
        try {
            const saved = await AppState.teacherManager.saveProfile({
                name: $('acct-edit-name').value.trim(),
                dob: readDob(),
                gender: $('acct-edit-gender').value === 'female' ? 'female' : 'male',
                photo: pendingPhoto || null,
                stamp: pendingStamp || null
            });
            AppState.currentTeacher = saved;
            AppState.teacherName = saved.name || '';
            renderProfile(); renderProgress();
            closeEdit();
            document.dispatchEvent(new CustomEvent('dh:backup-health'));   // يحدّث أيقونة الحساب في الترويسة (الصورة/الحرف الأول)
            if (wasFirstTime) startSetup();   // أول مرة: الإيميل ← Drive ← استرجاع بيانات سابقة
        } catch (e) { console.error('تعذر حفظ بيانات المعلم:', e); alert(t('profile_backup_restore_error')); }
        finally { btn.disabled = false; }
    });
    $('btn-back-account').setAttribute('aria-label', t('ms_back'));
    $('btn-back-account').setAttribute('title', t('ms_back'));
    $('btn-back-account').addEventListener('click', loadSplashScreen);

    // ---------- سلامة البيانات ----------
    let lastHealthLevel = 'bad';
    async function renderHealth() {
        const enabled = drive.isDriveEnabled();
        const driveAt = enabled ? drive.getDriveLastOk() : null;
        const localAt = getLastBackupAt();
        let st;
        try { st = await computeBackupState(); } catch (e) { return; }
        if (!$('acct-screen')) return;   // خرج المعلم من الشاشة أثناء الحساب
        const h = st.health;
        lastHealthLevel = h.level;
        const box = $('acct-status');
        box.dataset.level = st.level;
        $('acct-status-ic').textContent = { ok: '✅', warn: '⚠️', bad: '🚨' }[st.level];
        $('acct-status-title').textContent = t('acct_status_' + st.level);
        const ul = $('acct-status-lines');
        ul.textContent = '';
        const add = (txt) => { const li = document.createElement('li'); li.textContent = txt; ul.appendChild(li); };
        if (h.level === 'bad') add(t('acct_status_bad_hint'));
        else {
            // 🔔 تذكير ذكي: طلاب جدد منذ آخر نسخة (حتى لو النسخة حديثة زمنياً)
            if (st.reminder.remind) add(t('acct_remind_growth').replace('{n}', st.reminder.added));
            if (driveAt) {
                const n = drive.getDriveLastStudents();
                add(t('acct_status_line_drive').replace('{when}', relDays(driveAt)).replace('{students}', n ? ' — ' + t('drive_students_n').replace('{n}', n) : ''));
            }
            if (localAt) add(t('acct_status_line_local').replace('{when}', relDays(localAt)));
        }
        $('acct-status-cta-row').style.display = st.level === 'ok' ? 'none' : '';
        $('acct-status-cta').textContent = t(enabled ? 'drive_backup_now_btn' : 'drive_connect_btn');
        renderProgress();
        document.dispatchEvent(new CustomEvent('dh:backup-health', { detail: { level: st.level } }));
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
        // 🔐 النسخة لحساب مختلف عن الحساب الحالي؟ تنبيه إضافي قبل التأكيد
        try {
            const cur = getTeacherEmail() || drive.getDriveAccountEmail();
            const bk = (await inspectBackupFile(file)).email;
            if (cur && bk && cur.trim().toLowerCase() !== bk.trim().toLowerCase()) {
                msg = t('acct_restore_other_account').replace('{backup}', bk).replace('{current}', cur) + '\n\n' + msg;
            }
        } catch (e) { /* inspect نجح أعلاه؛ نتجاهل أي خلل ثانوي */ }
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
    // ---------- اكتمال الحساب + استئناف الإعداد ----------
    function renderProgress() {
        const p = AppState.currentTeacher || {};
        const pr = accountProgress({
            name: p.name, photo: p.photo, dob: p.dob,
            email: getTeacherEmail(), driveOn: drive.isDriveEnabled(),
            hasBackup: lastHealthLevel !== 'bad'
        });
        const box = $('acct-progress-card');
        box.hidden = pr.pct >= 100;
        if (box.hidden) return;
        $('acct-progress-pct').textContent = pr.pct + '%';
        $('acct-progress-bar').style.width = pr.pct + '%';
        const ul = $('acct-progress-items');
        ul.textContent = '';
        pr.items.forEach(i => {
            const li = document.createElement('li');
            li.textContent = (i.done ? '✅ ' : '⬜ ') + t('acct_progress_' + i.key);
            if (i.done) li.className = 'done';
            ul.appendChild(li);
        });
        $('acct-progress-next').dataset.next = pr.next || '';
    }
    // يكمل من أول خطوة ناقصة (البيانات ← الإيميل ← Drive ← أول نسخة)
    $('acct-progress-next').addEventListener('click', () => {
        const next = $('acct-progress-next').dataset.next;
        if (next === 'profile') return openEdit();
        if (next === 'email') return setupEmail();
        if (next === 'drive') return setupDrive();
        if (next === 'backup') return $('acct-drive-backup-btn').click();
    });

    // ---------- معالج الإعداد بعد أول حفظ: الإيميل ← Drive ← استرجاع بيانات سابقة ----------
    // كل خطوة اختيارية ويمكن تخطيها، وتُستأنف لاحقًا من أقسام الصفحة نفسها.
    const setupCard = $('acct-setup-card');
    let setupList = [];
    function setupShow(title, text, primary, onPrimary, alt, onAlt, skipLabel, onSkip) {
        $('acct-setup-title').textContent = title;
        $('acct-setup-text').textContent = text;
        const set = (id, label, fn) => { const b = $(id); b.hidden = !label; b.textContent = label || ''; b.onclick = fn || null; };
        set('acct-setup-primary', primary, async () => { const b = $('acct-setup-primary'); b.disabled = true; try { await onPrimary(); } finally { b.disabled = false; } });
        set('acct-setup-alt', alt, onAlt);
        set('acct-setup-skip', skipLabel, onSkip);
        setupCard.hidden = false;
        setupCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    const setupEnd = () => { setupCard.hidden = true; refresh(); };
    function setupDone() {
        setupShow(t('acct_setup_done_title'), t('acct_setup_done_text'), t('acct_setup_done_btn'), setupEnd, null, null, null, null);
    }
    function startSetup() {
        if (!isTeacherAuthed()) return setupEmail();
        if (!drive.isDriveEnabled()) return setupDrive();
        return setupRestore(false);
    }
    function setupEmail() {
        setupShow(t('acct_setup_email_title'), t('acct_setup_email_text'), t('acct_setup_email_btn'), async () => {
            const { ensureHomeworkSignIn } = await import('./teacherAuthGate.js');
            if (await ensureHomeworkSignIn()) { refresh(); setupDrive(); }
        }, null, null, t('acct_setup_skip'), setupEnd);
    }
    function setupDrive() {
        const text = t('acct_setup_drive_text').replace('{email}', getTeacherEmail() || drive.getDriveAccountEmail() || '');
        setupShow(t('acct_setup_drive_title'), text, t('acct_setup_drive_btn'), async () => {
            try { setupList = await drive.listBackupsForRestore(); }
            catch (e) { alert(t(driveErrKey(e))); return; }
            refresh();
            setupRestore(true);
        }, null, null, t('acct_setup_skip'), setupEnd);
    }
    // list جاهزة (من خطوة Drive) أو تُجلب الآن لو Drive كان مفعّلاً مسبقًا
    async function setupRestore(haveList) {
        if (!haveList) { try { setupList = await drive.listBackupsForRestore(); } catch (e) { setupList = []; } }
        const pickFile = () => { setupEnd(); $('acct-local-restore-input').click(); };
        if (!setupList.length) {
            return setupShow(t('acct_setup_restore_title'), t('acct_setup_restore_none'), t('acct_setup_restore_file_btn'), pickFile, null, null, t('acct_setup_restore_skip'), setupDone);
        }
        const newest = setupList[0];
        let when = newest.createdTime; try { when = fmtDateTime(newest.createdTime); } catch (e) { /* خام */ }
        const n = newest.appProperties && newest.appProperties.students;
        const text = t('acct_setup_restore_found').replace('{n}', setupList.length).replace('{when}', when)
            .replace('{students}', n ? ' — ' + t('drive_students_n').replace('{n}', n) : '');
        setupShow(t('acct_setup_restore_title'), text, t('acct_setup_restore_btn'), async () => {
            try {
                const file = await drive.downloadBackupAsFile(newest.id, newest.name);
                if (await confirmAndRestore(file)) return;   // نجح الاسترجاع → إعادة تحميل
            } catch (e) { console.error('تعذر تنزيل نسخة Drive:', e); alert(t(driveErrKey(e))); }
        }, t('acct_setup_restore_file_btn'), pickFile, t('acct_setup_restore_skip'), setupDone);
    }

    function refresh() {
        if (!$('acct-screen')) return;   // خرج المعلم من الشاشة أثناء عملية طويلة
        renderProfile(); renderHealth(); renderProgress(); renderDrive(); renderLocal(); renderUndo(); renderHw();
    }
    refresh();
    if (AppState.acctOpenEdit) { AppState.acctOpenEdit = false; openEdit(); }   // جاء من شارة «أكمل بياناتك»
}
