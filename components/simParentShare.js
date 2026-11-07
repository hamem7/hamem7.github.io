// components/simParentShare.js
//
// 🌟 [2026-11-07] لوحة «إرسال لولي الأمر» لركن المتشابهات: تُدرَج تحت الزر نفسه (لا نافذة منبثقة ولا شاشة جديدة)،
// فيها نص الرسالة قابلاً للتعديل + «فتح واتساب» (برقم ولي الأمر إن كان دولياً صالحاً، وإلا يختار المعلم جهة الاتصال) + «نسخ».
// تستعملها شاشة نتيجة «تدريب اليوم» (similarities-play.js) وبطاقة الطالب في «طلابي في المتشابهات» (similarities.js).
import { t, tf } from '../core/app.js';
import { parentWaUrl } from '../engine/similarityParentMsg.js';

const esc = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// يفتح اللوحة بعد العنصر anchor (أو يغلقها إن كانت مفتوحة: الزر نفسه يبدّل)
export function toggleParentShare(anchor, text, phone) {
    if (!anchor) return;
    const next = anchor.nextElementSibling;
    if (next && next.classList.contains('sim-pm-panel')) { next.remove(); return; }
    const { hasPhone } = parentWaUrl(phone, '');
    anchor.insertAdjacentHTML('afterend', `
        <div class="sim-pm-panel">
            <label class="sim-pm-label">${esc(t('sim_pm_preview'))}
                <textarea class="sim-pm-text" rows="9" dir="auto">${esc(text)}</textarea>
            </label>
            <p class="sim-pm-note">${esc(hasPhone ? tf('sim_pm_to_phone', { phone }) : t('sim_pm_no_phone'))}</p>
            <div class="sim-pm-actions">
                <button type="button" class="btn sim-pm-wa">${esc(t('sim_pm_open_wa'))}</button>
                <button type="button" class="btn btn-outline sim-pm-copy">${esc(t('sim_pm_copy'))}</button>
                <button type="button" class="btn btn-outline sim-pm-cancel">${esc(t('sim_pm_cancel'))}</button>
            </div>
        </div>`);
    const panel = anchor.nextElementSibling;
    const area = panel.querySelector('.sim-pm-text');
    panel.querySelector('.sim-pm-wa').addEventListener('click', () => {
        const { url } = parentWaUrl(phone, area.value);
        const w = window.open(url, '_blank', 'noopener');
        if (!w) location.href = url;
    });
    panel.querySelector('.sim-pm-copy').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        try { await navigator.clipboard.writeText(area.value); }
        catch (err) { area.select(); try { document.execCommand('copy'); } catch (e2) { /* لا شيء */ } }
        btn.textContent = t('sim_pm_copied');
        setTimeout(() => { btn.textContent = t('sim_pm_copy'); }, 1600);
    });
    panel.querySelector('.sim-pm-cancel').addEventListener('click', () => panel.remove());
    area.focus({ preventScroll: true });
}
