// js/homework.js — teacher-side homework logic. Reuses the platform's own engine UNCHANGED
// (vendor/engine/homeworkEngine.js = byte-identical copy of engine/homeworkEngine.js).
import { ensureQuranLoaded } from '../vendor/database/quranDB.js';
import { QuranEngine } from '../vendor/engine/quranEngine.js';
import { HomeworkEngine } from '../vendor/engine/homeworkEngine.js';
import { initHomeworkDB, HomeworkManager } from '../vendor/database/homeworkDB.js';
import { DEFAULT_API_URL, getApiUrl } from './api.js';

let cache = null;
export async function initQuran() {
  if (cache) return cache;
  const db = await ensureQuranLoaded();               // first run downloads the Uthmani text once, then IndexedDB
  const quran = new QuranEngine(db);
  cache = { quran, engine: new HomeworkEngine(quran) };
  return cache;
}
export async function listSurahs() { const { quran } = await initQuran(); return quran.getAllSurahsList(); }

/** cfg = {surahNum, startAyah, endAyah, qCount}  — same config object shape settings/homework-prep.js passes today. */
export async function generateQuestions(cfg) {
  const { engine } = await initQuran();
  return engine.generateAutoQuestions({ mode: 'surah', surahNum: cfg.surahNum, startAyah: cfg.startAyah, endAyah: cfg.endAyah, qCount: cfg.qCount });
}

const TYPE_LABEL = { mcq: 'اختيار من متعدد', dropdown: 'إكمال بقائمة', written_blank: 'فراغ كتابي (تصحيح يدوي)', dual_dropdown: 'فراغان', checkbox: 'تحديد متعدد',
  matrix_order: 'ترتيب آيات', write_3_ayahs: 'تسميع كتابي (تصحيح يدوي)', audio_record: 'تسميع صوتي', matching: 'مطابقة (تصحيح يدوي)' };
export const typeLabel = (t) => TYPE_LABEL[t] || t;
export function typeSummary(questions) { const m = {}; questions.forEach(q => { m[q.type] = (m[q.type] || 0) + 1; }); return m; }

export function studentLink(hwId) {
  const dir = location.origin + location.pathname.replace(/[^/]*$/, '');
  const api = getApiUrl();
  return `${dir}student.html?hw=${hwId}` + (api && api !== DEFAULT_API_URL ? `&api=${encodeURIComponent(api)}` : '');
}
export function whatsappUrl(link, text) { return 'https://wa.me/?text=' + encodeURIComponent(`${text}\n${link}`); }

let hwMgr = null;
/** Local copy in the same IndexedDB (DarHamHomeworks) + record shape the platform already uses. */
export async function saveLocalCopy(homework) {
  if (!hwMgr) hwMgr = new HomeworkManager(await initHomeworkDB());
  await hwMgr.updateHomework({ ...homework, cloudConfirmed: true });
}
