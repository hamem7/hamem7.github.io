// components/driveReconnectBanner.js
// ☁️ [جديد 2026-10-23] شريط في الشاشة الرئيسية يظهر فقط لمن فعّل النسخ التلقائي على Google Drive وانتهى ربطه (driveNeedsReconnect).
// بدل أن يفتح الموقع نافذة جوجل بنفسه فيحظرها المتصفح، يضغط المعلم «إعادة الربط» فتُفتح النافذة بنقرة مشروعة.
// النصوص (عربي/إنجليزي) من core/i18n.js: drive_banner_*. الإغلاق بـ× يُخفيه لهذه الجلسة فقط.
import { t } from '../core/i18n.js';

const SS_DISMISSED = 'dh_drive_banner_dismissed';

function ssGet() { try { return sessionStorage.getItem(SS_DISMISSED) === '1'; } catch (e) { return false; } }
function ssSet() { try { sessionStorage.setItem(SS_DISMISSED, '1'); } catch (e) { /* لا شيء */ } }

export async function refreshDriveReconnectBanner() {
    const el = document.getElementById('drive-reconnect-banner');
    if (!el) return;
    let show = false;
    try {
        const d = await import('../core/driveBackup.js');
        show = d.isDriveEnabled() && d.isDriveAuto() && d.driveNeedsReconnect() && !ssGet();
    } catch (e) { /* يبقى مخفياً */ }
    if (show) {
        const set = (id, key) => { const n = document.getElementById(id); if (n) n.textContent = t(key); };
        set('drb-title', 'drive_banner_title');
        set('drb-desc', 'drive_banner_desc');
        set('drb-reconnect-btn', 'drive_banner_btn');
        const x = document.getElementById('drb-close-btn');
        if (x) { x.title = t('drive_banner_close'); x.setAttribute('aria-label', t('drive_banner_close')); }
    }
    el.hidden = !show;
}

async function onReconnect(btn) {
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = t('drive_working');
    try {
        const d = await import('../core/driveBackup.js');
        const r = await d.runDriveBackup({ interactive: true });
        if (r && r.ok) document.dispatchEvent(new CustomEvent('dh:backup-health'));
    } catch (e) { /* يبقى الشريط ظاهراً ليحاول مجدداً */ }
    btn.disabled = false;
    btn.textContent = label;
    refreshDriveReconnectBanner();
}

export function initDriveReconnectBanner() {
    // تفويض على المستند: الشاشة الرئيسية تُعاد إنشاؤها مع كل تحميل
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('#drb-reconnect-btn');
        if (btn) return void onReconnect(btn);
        if (e.target.closest('#drb-close-btn')) { ssSet(); const el = document.getElementById('drive-reconnect-banner'); if (el) el.hidden = true; }
    });
    ['dh:screen', 'dh:drive-backup-done', 'dh:backup-health'].forEach(ev => document.addEventListener(ev, () => refreshDriveReconnectBanner()));
    refreshDriveReconnectBanner();
}
