// js/submitQueue.js — student-device persistence + truthful submission state machine.
//
// Guarantees:
//  * Answers are saved to the device on every change (draft) and BEFORE the first network attempt.
//  * The attempt record survives closing the tab / losing internet / restarting the phone.
//  * "confirmed" is set ONLY when the server answered {ok:true, persisted:true}.
//  * Retrying is always safe: the same clientSubmissionId is reused; the server is idempotent.
//
// States:  draft(saved locally) -> pending(sending) -> confirmed
//                                      \-> failed(retry possible) -> pending ...
//                                      \-> rejected(server said no: closed / already submitted / not found)
import { call, ApiError } from './api.js';

const mem = new Map();          // fallback if localStorage is blocked (private mode / quota)
let storageOk = true;
function read(k) {
  try { const v = localStorage.getItem(k); if (v !== null) return JSON.parse(v); } catch (e) { storageOk = false; }
  return mem.has(k) ? mem.get(k) : null;
}
function write(k, obj) {
  mem.set(k, obj);
  try { localStorage.setItem(k, JSON.stringify(obj)); return true; } catch (e) { storageOk = false; return false; }
}
function remove(k) { mem.delete(k); try { localStorage.removeItem(k); } catch (e) {} }
export function isLocalStorageWorking() { try { localStorage.setItem('dhlab_probe', '1'); localStorage.removeItem('dhlab_probe'); return true; } catch (e) { return false; } }

const dKey = (hw) => 'dhlab_draft_' + hw;
const aKey = (hw) => 'dhlab_attempt_' + hw;

export const saveDraft = (hwId, draft) => write(dKey(hwId), { ...draft, updatedAt: Date.now() });
export const loadDraft = (hwId) => read(dKey(hwId));
export const clearDraft = (hwId) => remove(dKey(hwId));
export const getAttempt = (hwId) => read(aKey(hwId));

function newClientId() {
  if (crypto && crypto.randomUUID) return 'c_' + crypto.randomUUID().replace(/-/g, '');
  return 'c_' + Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Freeze answers into an attempt record (persisted before any network call). Returns the attempt. */
export function startSubmission(hwId, studentName, answers) {
  const existing = getAttempt(hwId);
  if (existing && existing.state !== 'rejected') return existing;     // never create a second id for the same homework
  const attempt = { v: 1, clientSubmissionId: newClientId(), hwId, studentName, answers, createdAt: Date.now(),
    state: 'pending', attempts: 0, lastError: null, lastAttemptAt: null, confirmedAt: null, receipt: null };
  write(aKey(hwId), attempt);
  return attempt;
}

const inFlight = new Set();
const timers = new Map();

function save(attempt, onChange) { write(aKey(attempt.hwId), attempt); if (onChange) onChange(attempt); return attempt; }

/** One send attempt. Never throws. Updates + persists the state and reports through onChange. */
export async function attemptSend(hwId, onChange) {
  const attempt = getAttempt(hwId);
  if (!attempt || attempt.state === 'confirmed' || attempt.state === 'rejected') return attempt;
  if (inFlight.has(hwId)) return attempt;
  inFlight.add(hwId);
  attempt.state = 'pending'; attempt.attempts++; attempt.lastAttemptAt = Date.now();
  save(attempt, onChange);
  try {
    const r = await call('submit', {
      hwId, clientSubmissionId: attempt.clientSubmissionId, studentName: attempt.studentName, answers: attempt.answers,
      clientMeta: { ua: navigator.userAgent.slice(0, 120), attempts: attempt.attempts, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }
    }, { method: 'POST', write: true, timeoutMs: 30000 });
    attempt.state = 'confirmed'; attempt.confirmedAt = Date.now(); attempt.lastError = null;
    attempt.receipt = { submissionId: r.submissionId, submittedAt: r.submittedAt, duplicate: !!r.duplicate };
    clearDraft(hwId);
    stopAutoRetry(hwId);
    return save(attempt, onChange);
  } catch (e) {
    const code = (e instanceof ApiError) ? e.code : 'UNKNOWN';
    const retryable = (e instanceof ApiError) ? e.retryable : true;
    attempt.lastError = { code, message: e.message };
    if (!retryable) {                       // server understood and refused: retrying cannot help
      attempt.state = 'rejected'; attempt.rejectReason = code;
      stopAutoRetry(hwId);
    } else {
      attempt.state = 'failed';
    }
    return save(attempt, onChange);
  } finally {
    inFlight.delete(hwId);
  }
}

/** Retry with backoff while the page is open + immediately when the browser reports it is online again. */
export function startAutoRetry(hwId, onChange) {
  stopAutoRetry(hwId);
  let delay = 4000;
  const tick = async () => {
    const a = getAttempt(hwId);
    if (!a || a.state === 'confirmed' || a.state === 'rejected') return stopAutoRetry(hwId);
    if (navigator.onLine !== false) await attemptSend(hwId, onChange);
    const b = getAttempt(hwId);
    if (b && (b.state === 'failed' || b.state === 'pending')) { delay = Math.min(delay * 2, 60000); timers.set(hwId, setTimeout(tick, delay)); }
  };
  timers.set(hwId, setTimeout(tick, delay));
  if (!startAutoRetry._bound) {
    startAutoRetry._bound = true;
    window.addEventListener('online', () => { for (const id of [...timers.keys()]) { clearTimeout(timers.get(id)); timers.delete(id); attemptSend(id, onChange).then(() => { const a = getAttempt(id); if (a && a.state === 'failed') startAutoRetry(id, onChange); }); } });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { const a = getAttempt(hwId); if (a && a.state === 'failed') attemptSend(hwId, onChange); } });
  }
}
export function stopAutoRetry(hwId) { if (timers.has(hwId)) { clearTimeout(timers.get(hwId)); timers.delete(hwId); } }
export function isStorageOk() { return storageOk; }
