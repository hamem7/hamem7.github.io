// js/studentRecords.js — writes approved homework results into the SAME record structures Dar Ham uses:
//   * IndexedDB "DarHamStudents" / store "students"  (vendor/database/studentDB.js, byte-identical copy)
//   * localStorage  history_<studentId>  = array of {date, range, score, hwId, details, ...}
// so a later merge into the platform needs no data migration: same keys, same shapes (+ additive fields).
import { initStudentDB, StudentManager } from '../vendor/database/studentDB.js';

let mgr = null;
async function manager() { if (!mgr) mgr = new StudentManager(await initStudentDB()); return mgr; }

export const normName = (s) => String(s || '').replace(/[ً-ٰٟـ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

export async function listStudents() { return (await manager()).getAllStudents(); }
export async function addStudent(name) {
  const m = await manager();
  const id = 'std_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const s = { id, name: String(name).trim(), isHidden: false };
  await m.addStudent(s);
  return s;
}
export async function findStudentByName(name) { const n = normName(name); return (await listStudents()).find(s => normName(s.name) === n) || null; }
export async function findStudentById(id) { return (await listStudents()).find(s => String(s.id) === String(id)) || null; }

export function readHistory(studentId) { try { return JSON.parse(localStorage.getItem('history_' + studentId)) || []; } catch (e) { return []; } }

/**
 * Idempotent: approving/re-approving the same submission REPLACES its history entry and only credits
 * the point difference to totalScore (mirrors saveManualGrades' delta logic; no double counting).
 * Returns {ok, verified} where verified = the value was read back from storage after writing.
 */
export async function recordApprovedResult(student, submission, homework) {
  const m = await manager();
  const key = 'history_' + student.id;
  const list = readHistory(student.id);
  const idx = list.findIndex(h => h.submissionId === submission.id);
  const prev = idx >= 0 ? list[idx] : null;
  const approvedMs = Date.parse(submission.approvedAt) || Date.now();
  const entry = {
    date: new Date(approvedMs).toLocaleDateString('ar-EG'),
    range: `واجب منزلي (${(submission.details || []).length} أسئلة)`,
    score: submission.finalScore,                     // percentage 0-100 — same meaning as existing `score`
    hwId: submission.hwId,
    details: submission.details,
    // additive fields (older readers ignore them):
    submissionId: submission.id, source: 'homework', approved: true, timestamp: approvedMs,
    earnedPoints: submission.earnedPoints, totalPoints: submission.totalPoints, creditedPoints: submission.earnedPoints
  };
  if (idx >= 0) list[idx] = entry; else list.push(entry);
  localStorage.setItem(key, JSON.stringify(list));

  const delta = (submission.earnedPoints || 0) - ((prev && prev.creditedPoints) || 0);
  if (delta !== 0) { student.totalScore = (student.totalScore || 0) + delta; await m.updateStudent(student); }

  const back = readHistory(student.id).find(h => h.submissionId === submission.id);
  return { ok: true, verified: !!back && back.score === submission.finalScore, delta };
}
