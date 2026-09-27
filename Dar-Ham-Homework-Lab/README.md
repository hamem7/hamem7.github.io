# Dar Ham Homework Lab (Sandbox / Proof of Concept)

An isolated test bed for the **Homework backend** of the Dar Ham platform. It contains no Firebase, no App Check, no
reCAPTCHA and no login for students. It does **not** touch the 100+ file platform.

```
Teacher page ─┐                                     ┌─ Google Sheet (storage only, nobody opens it)
              ├─ js/api.js ─ fetch ─▶ Apps Script ──┤
Student page ─┘   (text/plain POST)   Web App /exec └─ Script Properties (TEACHER_KEY, never in frontend JS)
```

## Status — read this first

| Layer | State |
|---|---|
| Backend logic (`backend/Code.gs`) | ✅ 34 logic tests pass on an in-memory Sheets emulator (`node tests/backend.test.mjs`) — 27 original + 7 new multi-teacher tests (Google Sign-In, per-teacher isolation, legacy-key migration) |
| Lab frontend + backend, two "devices", offline/retry/duplicate/XSS | ✅ 11 browser scenarios pass (`python3 tests/e2e.py`) against the emulator |
| **Real Google Apps Script + Sheets** (deployed 2026-09-25, account elmayah.27) | ✅ 17/17 API checks passed against the LIVE /exec URL from a foreign origin (desktop Chrome): redirect+CORS, POST text/plain, persisted read-back, no answer leak, idempotent replay, 8 parallel submits (8/8), grading, approve, closed link. Latency p50 ≈ 3.0 s, p95 ≈ 12.7 s (the 8-parallel burst serialises on the script lock, ≈14 s total). |
| **Multi-teacher (Google Sign-In)** — added since | ✅ Logic proven on the emulator (34/34). ⏳ **NOT YET run against the live deployment** — needs a real Google Cloud OAuth Client ID (step 0 below), a redeploy of `Code.gs`, and a real Google sign-in from a browser. |
| **GitHub Pages hosting + real phone + full UI flow on the live backend** | ⏳ **NOT YET PROVEN.** Needs: host the Lab, then run `diagnostics.html` + the two-device WhatsApp protocol on a real phone. |

The emulator runs the real `Code.gs` but is **not Google**. Redirect/CORS behaviour, latency, quotas and cold starts
can only be proven by `diagnostics.html` against your real deployment. The system is **not "done"** until the
real-world protocol at the bottom passes.

## 0. Multi-teacher: Google Cloud configuration (do this once, manually)

The Lab now supports **Google Sign-In** so more than one teacher can use it, each seeing only their own
homeworks. This needs one manual step in Google Cloud Console — nothing here can create it for you:

1. Go to **console.cloud.google.com** → pick or create a project → **APIs & Services → Credentials**.
2. **Create Credentials → OAuth client ID → Application type: Web application**.
3. Under **Authorized JavaScript origins**, add every origin the Lab will be opened from, e.g.
   `https://<you>.github.io` (GitHub Pages) and `http://localhost:8080` (local dev). No path, no trailing slash.
4. **Create**. Copy the **Client ID** (ends with `.apps.googleusercontent.com` — it is not secret, no "Client secret" is needed for this flow).
5. Paste it into **`js/api.js`**, replacing `GOOGLE_CLIENT_ID`'s placeholder value.
6. Paste the **same** Client ID into the backend too, so the server rejects tokens meant for a different app:
   Apps Script editor → **Project Settings → Script properties → Add property** → name `GOOGLE_CLIENT_ID`, value = the same client id.
7. Redeploy the backend (step 1 below) — Apps Script will ask you to re-approve permissions because `Code.gs`
   now also calls Google's `tokeninfo` endpoint to verify sign-ins (new scope: "Connect to an external service").

If you skip step 6, sign-in still works but the server does not check *which* app a token was issued for — fine for
a single trusted deployment, but step 6 costs one extra minute and is worth doing.

## 1. Deploy the backend (~5 minutes)

1. Create a **new Google Sheet** (e.g. "DarHam Homework DB"). Nobody will ever open it after this.
2. **Extensions → Apps Script**. Delete the default code, paste all of `backend/Code.gs`. Save.
   (Optional: Project Settings → "Show appsscript.json" and paste `backend/appsscript.json`.)
3. Select function **`setup`** → **Run**. Approve permissions (Google says the app is unverified because *you* wrote
   it: Advanced → "Go to … (unsafe)" → Allow). Open **Execution log** and copy the **TEACHER KEY** it prints.
   (Or set your own: Project Settings → Script properties → `TEACHER_KEY`.) This key still works exactly as before —
   see "Old Teacher Key migration" below.
4. Set the `GOOGLE_CLIENT_ID` script property from step 0.6 above (skip only if you skipped step 0.6).
5. **Deploy → New deployment → ⚙️ Web app** → *Execute as*: **Me** → *Who has access*: **Anyone** → Deploy.
   Copy the **Web app URL** (ends with `/exec`).
6. Later code edits: Deploy → **Manage deployments → ✏️ → Version: New version → Deploy** (the URL stays the same).
   Saving the script alone does **not** update the live web app. A new Teachers sheet is created automatically the
   first time anyone signs in — you do **not** need to re-run `setup()` for existing deployments.

## 2. Host the Lab (students must open an https link)

Put the folder in a **new GitHub repository** (e.g. `dar-ham-homework-lab`) → Settings → Pages → deploy from `main`.
Open `https://<you>.github.io/dar-ham-homework-lab/`, paste the `/exec` URL in "ربط الخادم", press
"حفظ واختبار الاتصال" — that's it, you're in as a guest. Sign in with Google only when you create/publish a
homework or want to see your saved ones (teacher.html / results.html will prompt you at that point).
(Optional: put the URL in `DEFAULT_API_URL` in `js/api.js` for shorter student links.)

### Old Teacher Key migration

If you were already using the shared Teacher Key before this update:

1. Open `index.html` → expand **"مفتاح المعلم القديم"** → paste your old key (saved locally only, never sent anywhere by itself).
2. Click **"تسجيل الدخول باستخدام Google"** and sign in with your usual Google account.
3. In that same step the Lab silently calls `migrateLegacyKey` with both the key and your new Google session — if
   this is the *first* Google account ever to do this, all of your pre-existing (un-owned) homeworks become yours
   permanently; the raw key itself is never removed and keeps working as a full-access admin key (see
   `backend/Code.gs`'s `canAccessHw_` for the exact rule, documented inline).
4. From then on you are never asked for the old key again — only Google Sign-In.

New teachers never see or need the old key at all: they just click "تسجيل الدخول باستخدام Google" the first time
they publish a homework, and get their own empty homework list.

## 3. Real-world test protocol (this is what "DONE" means)

Use **Device A = teacher (laptop/phone)**, **Device B = a real student phone on mobile data**.

1. On A: `teacher.html` → pick a surah → Generate → **Create Homework** → all 3 steps ✅ → copy link → send via WhatsApp.
2. On B: open the WhatsApp link, enter name, answer, **Submit**. Expect ✅ *"وصل واجبك إلى معلمك"* only after confirmation.
3. On A: `results.html` → see the student, answers, correct answers → enter manual scores → **Approve**.
4. Reload A's `results.html` and the student-records table → result still there.
5. Failure drills on B: (a) airplane mode before Submit → must show ⚠️ *"لم يصل"*, answers kept; reload the tab / close and
   reopen Chrome → still there; turn network on → auto-sends or press retry; (b) submit twice / open old link again →
   no duplicate; (c) open a wrong id → clear error.
6. `diagnostics.html` on B (mobile data), then again on Wi-Fi → **Copy report**. Re-run **"إعادة فحص"** after ≥ 1 hour
   and after ≥ 1 day (Apps Script/Sheets persistence + cold start). Then press **Clean up**.

### Acceptance criteria
Teacher can create · questions generated & distributed by the existing engine · unique unguessable link · student opens on
another device · completes · submits · **server confirms persistence (read-back)** · teacher retrieves · grades · approves ·
result stored in the student record · survives reload · linked to the existing record structure · network failures never
silently lose answers · no Firebase/App Check/reCAPTCHA · **no fake success message** · no manual Sheet entry · works on a
real mobile device.

### If `diagnostics.html` fails on the real deployment
| Symptom | Meaning | Next step |
|---|---|---|
| Test 1/2 fail with `NETWORK`/`BAD_RESPONSE` from GitHub Pages but work locally | Apps Script redirect/CORS not usable from your origin/browser | Cloudflare Workers + D1/KV (same `js/api.js` contract) |
| Tests 8/11 fail with `BUSY`/timeouts under 8 parallel submits | Script lock/quota contention | Cloudflare Workers + D1, or Supabase (free tier pauses after 1 week idle) |
| p95 latency > ~8 s or frequent `BAD_RESPONSE` HTML | Consumer-account Apps Script instability | Cloudflare Workers |
| Test 15/"re-check" loses data | Storage problem | Stop; report |
Only `js/api.js` (transport) and the backend change; every page, the state machine and the data contract stay.

## Data contract (compatible with Dar Ham)
* **Question**: exactly what `HomeworkEngine` emits (`id,type,title,text,options…,correctAnswer,points,needsManualGrading`).
  The public API strips `correctAnswer`; the server grades.
* **Homework**: `{id ('HW_'+32 hex, unguessable), createdAt, status, assignedStudentName, assignedStudentId, questions, meta}`.
* **Submission**: existing fields (`id,hwId,studentId,studentName,score(=percentage),date,timestamp,details[]`) **plus**
  `status (submitted|graded|approved|void), provisionalScore, finalScore, earnedPoints, totalPoints, submittedAt,
  approvedAt, version, answers`. `details[]` keeps `question,type,studentAnswer,correctAnswer,isCorrect,needsManualGrading,
  points,manualScore,audioData,matchingData` (+ `qid, rawAnswer`).
* **Student record** (`js/studentRecords.js`): IndexedDB `DarHamStudents/students` and `localStorage history_<studentId>`
  entries `{date,range,score,hwId,details}` (+ additive `submissionId,source:'homework',approved,timestamp,earnedPoints,totalPoints`).
  Approval is idempotent (replaces the entry, credits only the points delta).

## Submission states
Student: `saved locally (draft)` → `pending` → **`confirmed`** (server: `ok:true, persisted:true` after re-reading the row)
| `failed` (retryable, answers kept, auto-retry on `online`/backoff/button) | `rejected` (closed / already submitted / not found).
Teacher side: `submitted` → `graded` (draft scores) → `approved`. The same `clientSubmissionId` is reused on every retry and the
server is idempotent, so retries can never duplicate.

## Security decisions
* Homework URL = `?hw=<122-bit random id>` (+ optional `api=` restricted to `script.google.com/macros/s/*/exec`). No answers, no keys.
* Teacher key lives in Apps Script *Script Properties*, sent only in POST bodies, brute-force lockout after 20 wrong tries.
* Server validates ids/sizes/names, grades from the stored definition, ignores client scores/status/studentId, uses its own clock.
* Public GET can only read a student-safe homework by id. Everything else is POST + key.
* Sheets hazards handled: text-formatted columns (no formula injection / numeric coercion), row-cap growth, 45k-char chunking.

## Known limitations (honest)
* `audio_record` (voice) questions are not supported in the Lab (Sheets cannot hold audio; needs Drive storage). Auto-generation never
  produces them anyway; manual add-question is not in the Lab.
* One active submission per (homework, normalised name). Teacher "void" (API `voidSubmission`) exists; no UI button yet.
* Apps Script quotas/latency (1–3 s typical) and the unverified-app consent screen are inherent to the platform.
* A student who clears browser data before the message turns ✅ loses local drafts (server copies are unaffected).
* Quran text is downloaded once from `api.alquran.cloud` by the existing `quranDB.js` (same as the platform).

## Files
`vendor/*` are **byte-identical copies** of platform files (do not edit): `engine/homeworkEngine.js` md5 `c3b397f8…`,
`engine/quranEngine.js`, `database/quranDB.js|studentDB.js|homeworkDB.js`.
Local emulator (optional): `node dev/server.mjs` → http://localhost:8080 (prints a demo teacher key). Tests: see Status.
