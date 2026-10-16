// core/driveBackup.js
// ==========================================================
// ☁️ [جديد 2026-10-16] نسخة احتياطية على Google Drive الخاص بالمعلم نفسه (مجلد التطبيق المخفي appDataFolder).
// المتصفح يكلّم Drive مباشرة بصلاحية drive.appdata فقط — لا يمرّ شيء عبر Apps Script ولا عبر أي خادم لصاحب المنصة،
// والمساحة المستهلكة من حساب المعلم نفسه. رمز الدخول (access token) يبقى في الذاكرة فقط ولا يُخزَّن أبداً.
//
// الحمولة هي نفسها حمولة النسخة الشاملة (core/backupRestore.js: buildBackupPayload) مضغوطة gzip، وتستثني قاعدتين قابلتين
// لإعادة التحميل من الإنترنت (نص القرآن وصوت ركن الأطفال) لتبقى النسخة صغيرة. النسخة اليدوية المنزَّلة لم تتغيّر (كل شيء).
//
// ضمانات:
//  - النسخة الجديدة تُرفع باسم فريد بالتاريخ ثم يُتحقق منها (إعادة تنزيلها ومقارنة البصمة SHA-256) قبل حذف أي نسخة قديمة.
//  - لا تُحذف نسخة إلا وفق سياسة engine/backupRetention.js وبعد نجاح التحقق فقط.
//  - لا تُرفع نسخة إن كان على الجهاز صفر طلاب (جهاز جديد فارغ) حتى لا تُزاحم نسخٌ فارغة نسخَك الجيدة.
//  - التلقائي: عند فتح المنصة مرة كل 24 ساعة إن فعّله المعلم؛ وإن رفضت Google فتح نافذة الإذن بلا نقرة يُسجَّل «يحتاج إعادة ربط»
//    ويظهر ذلك في نافذة ملف المعلم (النسخ اليدوي «انسخ الآن» يعمل دائماً لأنه بنقرة).
// ==========================================================

import { buildBackupPayload } from './backupRestore.js';
import { selectBackupsToDelete } from '../engine/backupRetention.js';

// ⚠️ مشروع تجريبي (ham-backup-test): شاشة الموافقة بوضع Testing فلا يعمل الربط إلا لمستخدمي التجربة المضافين.
// لا يُنشر للمعلمين قبل نشر شاشة الموافقة (Production) وتبديل هذا المعرّف إن لزم. ليس سرّاً (علني بطبيعته).
export const DRIVE_CLIENT_ID = '83653421223-elms4erdb1j540joopi2mc23t7nlp1ce.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

// قاعدتان لا تدخلان نسخ Drive (يعاد تحميلهما من الإنترنت عند الحاجة، والاستعادة لا تلمسهما لغيابهما عن الحمولة)
const DRIVE_SKIP_DBS = ['DarHamDatabase', 'DarHamKidsAudio'];

const LS_ENABLED = 'dh_drive_enabled';
const LS_AUTO = 'dh_drive_auto';
const LS_LAST_OK = 'dh_drive_last_ok';
const LS_NEEDS_RECONNECT = 'dh_drive_needs_reconnect';
const AUTO_EVERY_MS = 24 * 3600 * 1000;
const NAME_PREFIX = 'dh-backup-';

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* لا شيء */ } }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* لا شيء */ } }

export class DriveError extends Error {
    constructor(code, message) { super(message || code); this.code = code; }
}

// ---------- حالة الإعداد ----------
export function isDriveEnabled() { return lsGet(LS_ENABLED) === '1'; }
export function isDriveAuto() { return lsGet(LS_AUTO) === '1'; }
export function setDriveAuto(on) { lsSet(LS_AUTO, on ? '1' : '0'); }
export function getDriveLastOk() { return lsGet(LS_LAST_OK); }
export function driveNeedsReconnect() { return lsGet(LS_NEEDS_RECONNECT) === '1'; }

// ---------- رمز الدخول (ذاكرة فقط) ----------
let tokenState = null;   // { token, exp }
let tokenClient = null;

function waitForGis(timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
        const t0 = Date.now();
        (function poll() {
            if (window.google && window.google.accounts && window.google.accounts.oauth2) return resolve(window.google.accounts.oauth2);
            if (Date.now() - t0 > timeoutMs) return reject(new DriveError('GIS_UNAVAILABLE', 'Google sign-in library not loaded'));
            setTimeout(poll, 200);
        })();
    });
}

/** يطلب رمزاً. interactive=false: بلا نافذة اختيار حساب (تنجح فقط إن سبق للمعلم الموافقة وجوجل تسمح بنافذة صامتة). */
async function getToken({ interactive }) {
    if (tokenState && tokenState.exp > Date.now() + 60000) return tokenState.token;
    const oauth2 = await waitForGis();
    return new Promise((resolve, reject) => {
        tokenClient = oauth2.initTokenClient({
            client_id: DRIVE_CLIENT_ID,
            scope: SCOPE,
            prompt: interactive ? '' : 'none',
            callback: (resp) => {
                if (!resp || resp.error) return reject(new DriveError(resp && resp.error === 'access_denied' ? 'ACCESS_DENIED' : 'AUTH_REQUIRED', resp && resp.error));
                if (!oauth2.hasGrantedAllScopes(resp, SCOPE)) return reject(new DriveError('SCOPE_NOT_GRANTED'));
                tokenState = { token: resp.access_token, exp: Date.now() + (Number(resp.expires_in) || 3000) * 1000 };
                lsDel(LS_NEEDS_RECONNECT);
                lsSet(LS_ENABLED, '1');   // موافقة المعلم = ربط Drive (يشمل جهازاً جديداً فارغاً يريد الاسترجاع فقط)
                resolve(tokenState.token);
            },
            error_callback: (err) => reject(new DriveError(err && err.type === 'popup_closed' ? 'ACCESS_DENIED' : 'AUTH_REQUIRED', err && err.type))
        });
        tokenClient.requestAccessToken();
    });
}

// ---------- طبقة Drive REST ----------
async function driveFetch(url, token, init = {}) {
    let res;
    try { res = await fetch(url, { ...init, headers: { ...(init.headers || {}), Authorization: 'Bearer ' + token } }); }
    catch (e) { throw new DriveError('NETWORK', String(e && e.message || e)); }
    if (res.status === 401) { tokenState = null; throw new DriveError('AUTH_REQUIRED', 'token expired'); }
    if (res.status === 403) {
        let reason = '';
        try { reason = JSON.stringify(await res.clone().json()); } catch (e) { /* لا شيء */ }
        throw new DriveError(/storageQuotaExceeded|quota/i.test(reason) ? 'QUOTA' : 'FORBIDDEN', reason);
    }
    if (!res.ok) throw new DriveError('HTTP_' + res.status, await res.text().catch(() => ''));
    return res;
}

export async function listDriveBackups(token) {
    const out = [];
    let pageToken = '';
    do {
        const q = new URLSearchParams({
            spaces: 'appDataFolder', pageSize: '100', orderBy: 'createdTime desc',
            fields: 'nextPageToken,files(id,name,size,createdTime,appProperties)'
        });
        if (pageToken) q.set('pageToken', pageToken);
        const j = await (await driveFetch(`${FILES_URL}?${q}`, token)).json();
        (j.files || []).filter(f => (f.name || '').startsWith(NAME_PREFIX)).forEach(f => out.push(f));
        pageToken = j.nextPageToken || '';
    } while (pageToken);
    return out;
}

async function uploadBlob(token, name, blob, appProperties) {
    const boundary = 'dh' + Math.random().toString(36).slice(2);
    const meta = JSON.stringify({ name, parents: ['appDataFolder'], appProperties });
    const body = new Blob([
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`,
        `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`,
        blob,
        `\r\n--${boundary}--`
    ]);
    const res = await driveFetch(`${UPLOAD_URL}?uploadType=multipart&fields=id,name,size`, token, {
        method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body
    });
    return res.json();
}

async function downloadBytes(token, id) {
    const res = await driveFetch(`${FILES_URL}/${encodeURIComponent(id)}?alt=media`, token);
    return new Uint8Array(await res.arrayBuffer());
}

async function deleteFile(token, id) { await driveFetch(`${FILES_URL}/${encodeURIComponent(id)}`, token, { method: 'DELETE' }); }

async function sha256Hex(bytes) {
    const d = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------- الضغط ----------
async function gzipBytes(text) {
    const raw = new TextEncoder().encode(text);
    if (typeof CompressionStream === 'undefined') return { bytes: raw, gz: false };
    const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'));
    return { bytes: new Uint8Array(await new Response(stream).arrayBuffer()), gz: true };
}
async function bytesToText(bytes) {
    const isGz = bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
    if (!isGz) return new TextDecoder().decode(bytes);
    if (typeof DecompressionStream === 'undefined') throw new DriveError('NO_DECOMPRESS', 'This browser cannot open compressed backups');
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new TextDecoder().decode(await new Response(stream).arrayBuffer());
}

function stamp() { return new Date().toISOString().replace(/[-:]/g, '').replace(/\..*$/, '').replace('T', '-'); }
function studentsIn(payload) {
    const st = payload && payload.databases && payload.databases.DarHamStudents && payload.databases.DarHamStudents.stores &&
        payload.databases.DarHamStudents.stores.students;
    return Array.isArray(st) ? st.length : 0;
}

// ---------- النسخ ----------
let running = null;

/**
 * يأخذ نسخة ويرفعها ويتحقق منها ثم يطبّق سياسة الاحتفاظ. لا يرمي للحالات المتوقعة؛ يرجع
 * { ok, skipped?, code?, name?, size?, deleted?, students? }
 * skipped: 'no_students' | 'busy'.
 */
export function runDriveBackup({ interactive = true } = {}) {
    if (running) return running;
    running = (async () => {
        try {
            const token = await getToken({ interactive });
            const payload = await buildBackupPayload({ skipDbs: DRIVE_SKIP_DBS });
            const students = studentsIn(payload);
            if (students === 0) return { ok: true, skipped: 'no_students' };

            const { bytes, gz } = await gzipBytes(JSON.stringify(payload));
            const name = `${NAME_PREFIX}${stamp()}.json${gz ? '.gz' : ''}`;
            const created = await uploadBlob(token, name, new Blob([bytes]), { students: String(students), app: 'dar-ham' });

            // تحقق: إعادة تنزيل ومقارنة البصمة — لا حذف قبل نجاحه
            const back = await downloadBytes(token, created.id);
            if (back.length !== bytes.length || (await sha256Hex(back)) !== (await sha256Hex(bytes))) {
                try { await deleteFile(token, created.id); } catch (e) { /* لا شيء */ }
                throw new DriveError('VERIFY_FAILED', 'uploaded backup did not match');
            }

            lsSet(LS_ENABLED, '1');
            lsSet(LS_LAST_OK, new Date().toISOString());
            lsDel(LS_NEEDS_RECONNECT);

            let deleted = 0;
            try {
                const all = await listDriveBackups(token);
                for (const id of selectBackupsToDelete(all.map(f => ({ id: f.id, createdTime: f.createdTime })))) {
                    try { await deleteFile(token, id); deleted++; } catch (e) { console.warn('تعذر حذف نسخة قديمة:', e); }
                }
            } catch (e) { console.warn('تعذر تطبيق سياسة الاحتفاظ (النسخة الجديدة سليمة):', e); }

            try { document.dispatchEvent(new CustomEvent('dh:drive-backup-done')); } catch (e) { /* لا شيء */ }
            return { ok: true, name, size: bytes.length, deleted, students };
        } catch (e) {
            const code = e instanceof DriveError ? e.code : 'ERROR';
            if (code === 'AUTH_REQUIRED' && !interactive) lsSet(LS_NEEDS_RECONNECT, '1');
            console.warn('تعذرت النسخة على Drive:', e);
            return { ok: false, code, message: String(e && e.message || e) };
        } finally { running = null; }
    })();
    return running;
}

/** قائمة نسخ Drive للاستعادة (تفتح نافذة الإذن إن لزم لأنها بنقرة من المعلم). */
export async function listBackupsForRestore() {
    const token = await getToken({ interactive: true });
    return listDriveBackups(token);
}

/** تنزيل نسخة من Drive كملف File جاهز لـrestoreFromBackupFile / inspectBackupFile (JSON نصي بعد فك الضغط). */
export async function downloadBackupAsFile(id, name = 'drive-backup.json') {
    const token = await getToken({ interactive: true });
    const text = await bytesToText(await downloadBytes(token, id));
    return new File([text], name.replace(/\.gz$/, ''), { type: 'application/json' });
}

/** فصل Drive: يُوقف الربط والتلقائي على هذا الجهاز ويسحب إذن التطبيق. النسخ الموجودة في Drive تبقى كما هي. */
export function disconnectDrive() {
    const token = tokenState && tokenState.token;
    tokenState = null;
    [LS_ENABLED, LS_AUTO, LS_NEEDS_RECONNECT].forEach(lsDel);
    try { if (token && window.google && window.google.accounts && window.google.accounts.oauth2) window.google.accounts.oauth2.revoke(token, () => {}); } catch (e) { /* لا شيء */ }
}

/** تلقائي: مرة كل 24 ساعة عند فتح المنصة لمن فعّله. صامت ولا يُزعج؛ فشل الإذن الصامت يُسجَّل «يحتاج إعادة ربط». */
export function maybeAutoDriveBackup() {
    try {
        if (!isDriveEnabled() || !isDriveAuto() || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
        const last = Date.parse(getDriveLastOk() || '') || 0;
        if (Date.now() - last < AUTO_EVERY_MS) return;
        setTimeout(() => { runDriveBackup({ interactive: false }).catch(() => {}); }, 20000);
    } catch (e) { /* لا شيء */ }
}
