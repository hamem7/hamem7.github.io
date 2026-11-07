// components/driveReconnectBanner.js
// ☁️ [جديد 2026-10-23] شريط في الشاشة الرئيسية يظهر فقط لمن فعّل النسخ التلقائي على Google Drive وانتهى ربطه (driveNeedsReconnect).
// بدل أن يفتح الموقع نافذة جوجل بنفسه فيحظرها المتصفح، يضغط المعلم «إعادة الربط» فتُفتح النافذة بنقرة مشروعة.
// النصوص (عربي/إنجليزي) من core/i18n.js: drive_banner_*. الإغلاق بـ× يؤجّل التذكير تصاعدياً: يوم ثم 3 أيام ثم 7 (يُصفَّر عند نجاح إعادة الربط).
import { t } from '../core/i18n.js';

// التأجيل يتصاعد مع كل إغلاق: يوم ← 3 أيام ← 7 أيام (يبقى 7 بعدها). يُحفظ في localStorage ليبقى بعد إغلاق المنصة.
// يرتبط بآخر نسخة ناجحة (lastOk): نجاح جديد ثم انقطاع جديد = حلقة جديدة فيظهر الشريط فوراً.
const LS_SNOOZE = 'dh_drive_banner_snooze';
const DAY = 86400000;
const STEPS_DAYS = [1, 3, 7];

function lsRead() { try { return JSON.parse(localStorage.getItem(LS_SNOOZE) || 'null'); } catch (e) { return null; } }
function lsWrite(v) { try { if (v) localStorage.setItem(LS_SNOOZE, JSON.stringify(v)); else localStorage.removeItem(LS_SNOOZE); } catch (e) { /* لا شيء */ } }

async function currentEpisode() {
    try { const d = await import('../core/driveBackup.js'); return d.getDriveLastOk() || ''; } catch (e) { return ''; }
}
async function isSnoozed() {
    const st = lsRead();
    if (!st || typeof st.until !== 'number') return false;
    if ((st.ep || '') !== await currentEpisode()) { lsWrite(null); return false; }   // نجاح جديد ثم انقطاع جديد
    return Date.now() < st.until;
}
async function snooze() {
    const st = lsRead();
    const ep = await currentEpisode();
    const n = st && (st.ep || '') === ep ? (st.n || 0) : 0;
    lsWrite({ n: n + 1, ep, until: Date.now() + STEPS_DAYS[Math.min(n, STEPS_DAYS.length - 1)] * DAY });
}

export async function refreshDriveReconnectBanner() {
    const el = document.getElementById('drive-reconnect-banner');
    if (!el) return;
    let show = false;
    try {
        const d = await import('../core/driveBackup.js');
        show = d.isDriveEnabled() && d.isDriveAuto() && d.driveNeedsReconnect() && !(await isSnoozed());
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
        if (r && r.ok) lsWrite(null);
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
        if (e.target.closest('#drb-close-btn')) { snooze(); const el = document.getElementById('drive-reconnect-banner'); if (el) el.hidden = true; }
    });
    ['dh:screen', 'dh:drive-backup-done', 'dh:backup-health'].forEach(ev => document.addEventListener(ev, () => refreshDriveReconnectBanner()));
    refreshDriveReconnectBanner();
}
