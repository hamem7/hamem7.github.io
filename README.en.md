# 🏆 Ham (حمٓ) Platform — Champions of the Quran

[العربية](README.md) · **English**

An interactive web platform for memorizing, reviewing and assessing the Holy Quran, built for a single teacher (personal use, not a multi-teacher system).

🔗 **Live site:** [hamem7.github.io](https://hamem7.github.io/)

---

## What it does

- Student records and a teacher profile (`student/`, `components/teacherProfile.js`).
- Assessment and review games for adults and for children (`games/adultGame.js`, `games/kidsGame.js`), driven by the engines in `engine/`.
- Similar-verses corner (`similarities/`), dual tests (`dualtests/`), and the Tajweed Heroes path (`tajweed/`). Some of these are still marked "in development".
- Full homework system: the teacher prepares and publishes homework, the student solves it from a link on any device, the teacher grades it. It includes smart homework, a weekly schedule, bulk send and certificates.
- Printable/shareable reports (PDF/PNG): individual report, monthly report, certificates.
- Backup and restore of all platform data from the teacher's device.
- Installable PWA, light/dark theme, full Arabic (RTL) / English (LTR) UI.
- Local-first: data lives in the browser (IndexedDB). Only homework talks to an external server (Google Apps Script + Google Sheets, see `backend/Code.gs` and `core/api.js`).

## Tech stack

Plain HTML / CSS / JavaScript (ES Modules). No framework and **no build step**. Hosted on GitHub Pages from the `main` branch.

## Run locally

```bash
git clone https://github.com/hamem7/hamem7.github.io.git
cd hamem7.github.io
python3 -m http.server 5500
# open http://localhost:5500
```

Any static file server works. Opening `index.html` directly from disk will not work (ES Modules need HTTP).

## Project layout

| Folder / file | Purpose |
|---|---|
| `index.html` | App shell and the single main header (`#main-header`) |
| `core/` | App logic, i18n, theme, API, backup, sync |
| `components/` | Screens and UI pieces |
| `engine/` | Question generators and scoring engines |
| `games/` | Adult, kids and homework-play games |
| `database/` | IndexedDB layers and Quran data |
| `student/`, `settings/`, `similarities/`, `tajweed/`, `dualtests/` | Feature areas |
| `css/` | Tokens, global styles, light/dark themes |
| `backend/Code.gs` | Google Apps Script backend for homework |
| `tools/` | Checkers and generators (Node) |
| `tests/` | Unit and end-to-end tests |
| `CLAUDE.md` | Project rules (languages, header, dark theme, Quran font) |
| `PROJECT_MASTER.md`, `PROJECT_STATE.md`, `docs/` | Detailed handover documentation |

## Before every change

```bash
node tools/check-syntax.mjs
node tools/check-header.mjs
node tools/gen-dark-theme.mjs --check
```

These also run in GitHub Actions (`.github/workflows/`). Tests: `node tests/<name>.test.js` (unit) and `node tests/<name>.e2e.mjs` (end-to-end, needs Playwright).

## Project rules (summary of `CLAUDE.md`)

1. Every new text or feature must ship in **both Arabic and English** using the existing i18n mechanism.
2. Do not create a per-screen header; screens are injected under the single `#main-header`.
3. New screens use the design tokens (`--dh-*`) so dark mode works; never hard-code light colors.
4. **Never change the Quranic font** (Amiri Quran / `.quran-text`), its weight or letter-spacing.
5. Scoped quizzes (e.g. one surah) must only ask about that surah.

## Backups and ownership

- **Code:** everything is in this repository. Keep a full copy: `git clone --mirror https://github.com/hamem7/hamem7.github.io.git`, plus a ZIP on Drive or an external disk.
- **Teacher data:** use the in-app backup/export regularly. It is stored on the teacher's device, not in this repository.
- **Homework server:** the Google Apps Script project and its Google Sheet belong to the owner's Google account. Back them up separately.
- Enable two-factor authentication on the GitHub account and keep the recovery codes.

## Continuing without an AI assistant

Edit with any editor (e.g. VS Code), run the three checks above, then:

```bash
git pull origin main
git add -A && git commit -m "describe the change"
git push origin main
```

Read `CLAUDE.md`, `PROJECT_MASTER.md` and `PROJECT_STATE.md` first; they explain decisions and current status.

## License

© 2026 Abdullah bin Al-Mayah Al-Azhari. Free for teachers and students for educational, personal and non-commercial use. Licensed under [PolyForm Noncommercial 1.0.0](LICENSE). Selling, republishing for a fee, or using the code or design commercially requires written permission from the owner.
