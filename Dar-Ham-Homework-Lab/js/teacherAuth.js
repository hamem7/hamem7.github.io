// js/teacherAuth.js — 🌟 multi-teacher: the ONLY place that talks to Google Identity Services.
// Guest-first: nothing here runs automatically on page load. It only runs when a page calls
// ensureTeacherAuth() right before a teacher-only action (createHomework, listHomeworks, ...),
// exactly like the brief asks ("show the prompt only when the teacher does something that needs
// a teacher identity"). A teacher who is already signed in (Google session OR legacy key) never
// sees the modal — ensureTeacherAuth() resolves immediately.
import { GOOGLE_CLIENT_ID, googleSignIn, migrateLegacyKey, isTeacherAuthed, getTeacherAuth, getTeacherKey, clearTeacherAuth, friendlyError } from './api.js';

let gsiPromise = null;
function loadGsi() {
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise((resolve, reject) => {
    if (window.google && window.google.accounts && window.google.accounts.id) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('تعذّر تحميل مكتبة تسجيل الدخول من Google (تحقق من الإنترنت)'));
    document.head.appendChild(s);
  });
  return gsiPromise;
}

let modalEl = null;
let pendingResolve = null;

function buildModal() {
  if (modalEl) return modalEl;
  modalEl = document.createElement('div');
  modalEl.className = 'dh-auth-overlay';
  modalEl.innerHTML =
    '<div class="dh-auth-card">' +
      '<p class="dh-auth-msg">لإصدار الواجب وحفظه باسمك كمعلم، سجّل الدخول باستخدام Google.</p>' +
      '<div id="dh-gsi-btn" class="dh-gsi-btn"></div>' +
      '<p class="dh-auth-err hidden"></p>' +
      '<button type="button" class="btn ghost small dh-auth-cancel">إلغاء</button>' +
    '</div>';
  modalEl.querySelector('.dh-auth-cancel').addEventListener('click', () => closeModal(false));
  document.body.appendChild(modalEl);
  return modalEl;
}

function closeModal(success) {
  if (modalEl) modalEl.classList.remove('open');
  if (pendingResolve) { const r = pendingResolve; pendingResolve = null; r(success); }
}

async function handleCredential(resp) {
  const modal = buildModal();
  const err = modal.querySelector('.dh-auth-err');
  err.classList.add('hidden');
  try {
    await googleSignIn(resp.credential);
    // Old Teacher Key → Sign in with Google → new userId/ownerId: if this browser still has the
    // legacy key saved (from before this teacher migrated), claim their pre-existing homeworks now,
    // in the same click — best-effort, never blocks sign-in if it fails or was already claimed.
    const legacyKey = getTeacherKey();
    if (legacyKey) { try { await migrateLegacyKey(resp.credential, legacyKey); } catch (e) { /* best-effort */ } }
    closeModal(true);
  } catch (e) {
    err.textContent = 'تعذّر تسجيل الدخول: ' + friendlyError(e);
    err.classList.remove('hidden');
  }
}

/**
 * Resolves `true` once a teacher identity exists (Google session or legacy key), `false` if the
 * teacher cancels the prompt. Guests are NEVER forced through this — only call it right before an
 * action that needs a teacher identity (see README "GUEST-FIRST EXPERIENCE").
 */
export async function ensureTeacherAuth() {
  if (isTeacherAuthed()) return true;
  try { await loadGsi(); }
  catch (e) { alert(e.message); return false; }
  const modal = buildModal();
  modal.querySelector('.dh-auth-err').classList.add('hidden');
  google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleCredential, auto_select: true });
  modal.classList.add('open');
  modal.querySelector('#dh-gsi-btn').innerHTML = '';
  google.accounts.id.renderButton(modal.querySelector('#dh-gsi-btn'), { type: 'standard', theme: 'filled_blue', text: 'continue_with', locale: 'ar', shape: 'pill' });
  google.accounts.id.prompt(); // offers One Tap silent sign-in when the browser already has a Google session
  return new Promise((resolve) => { pendingResolve = resolve; });
}

export function signOutTeacher() {
  clearTeacherAuth();
  try { if (window.google && window.google.accounts) google.accounts.id.disableAutoSelect(); } catch (e) {}
}

/** Small "signed in as teacher / sign out" status line, used by teacher.html and results.html.
 *  Returns a `refresh()` you can call after sign-in/out to repaint it. */
export function renderAuthStatus(el, onSignedOut) {
  function paint() {
    const auth = getTeacherAuth();
    if (auth) {
      el.innerHTML = '';
      const span = document.createElement('span'); span.textContent = '👤 مسجَّل الدخول كمعلم';
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn ghost small'; btn.textContent = 'تسجيل الخروج';
      btn.style.marginInlineStart = '8px';
      btn.addEventListener('click', () => { signOutTeacher(); paint(); if (onSignedOut) onSignedOut(); });
      el.append(span, btn);
      el.classList.remove('hidden');
    } else if (getTeacherKey()) {
      el.textContent = '🔑 وضع مفتاح المعلم القديم (مؤقت)';
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }
  paint();
  return paint;
}
