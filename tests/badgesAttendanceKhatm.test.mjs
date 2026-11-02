// tests/badgesAttendanceKhatm.test.mjs — تشغيل: node tests/badgesAttendanceKhatm.test.mjs
import { computeMonthBadges, summarizeEarned, countCappedPerDay, closestToNext, BADGE_DEFS, TIER_KEYS } from '../engine/badgesEngine.js';
import { summarizeMonth, evidenceDays, setDayStatus, needsConfirmation, dateKey, scheduledDaysInMonth } from '../engine/attendanceEngine.js';
import { paceFrom, projectMilestones, unitsBetween, sessionsToFinish, buildNextMonthPlan } from '../engine/khatmPlan.js';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('✅', m); } else { fail++; console.log('❌', m); } };
const at = (y, m, d, h = 10) => new Date(y, m, d, h).getTime();
const by = (res, k) => res.find(r => r.key === k);

// ---- الأوسمة ----
ok(BADGE_DEFS.length === 14, '14 وسامًا درجاتيًا');
ok(BADGE_DEFS.every(b => b.th.length === 4 && b.th.every((x, i, a) => i === 0 || x >= a[i - 1])), 'عتبات كل وسام 4 وتصاعدية');
const g = [];
for (let d = 1; d <= 9; d++) g.push({ timestamp: at(2026, 9, d), score: 95, mode: 'eval' });
g.push({ timestamp: at(2026, 9, 10), score: 100, mode: 'eval' });
g.push({ timestamp: at(2026, 9, 11), score: 85, mode: 'weakness' });
let r = computeMonthBadges({ games: g });
ok(by(r, 'skilled').value === 10 && by(r, 'skilled').tierKey === 'silver', 'الماهر: 10 ألعاب ≥90 → فضي');
ok(by(r, 'perfect').value === 1 && by(r, 'perfect').tierKey === 'bronze', 'الكامل: لعبة 100% → برونزي');
ok(by(r, 'fixer').value === 1 && by(r, 'fixer').tierKey === 'bronze', 'المُصلِح: تحدي أخطاء ≥80 → برونزي');
ok(!by(r, 'hero') && !by(r, 'star') && !by(r, 'steady'), 'بلا بيانات (null) لا يظهر الوسام');
ok(by(r, 'riser') === undefined, 'الصاعد بلا شهر سابق: لا يُحسب');
// سقف اليوم
const spam = Array.from({ length: 12 }, (_, i) => ({ timestamp: at(2026, 9, 5, 8 + (i % 10)), score: 99 }));
ok(countCappedPerDay(spam, x => x.score >= 90) === 2, 'سقف لعبتين في اليوم يمنع التكديس');
r = computeMonthBadges({ games: spam });
ok(by(r, 'skilled').tier === -1, 'تكديس يوم واحد لا يمنح وسامًا');
// الصاعد
const prev = [70, 72, 75].map((s, i) => ({ timestamp: at(2026, 8, 3 + i), score: s }));
const cur = [80, 85, 90].map((s, i) => ({ timestamp: at(2026, 9, 3 + i), score: s }));
r = computeMonthBadges({ games: cur, prevGames: prev });
ok(by(r, 'riser').value === 13 && by(r, 'riser').tierKey === 'gold', 'الصاعد: +13 نقطة → ذهبي');
r = computeMonthBadges({ games: cur.slice(0, 2), prevGames: prev });
ok(by(r, 'riser') === undefined, 'الصاعد يحتاج 3 ألعاب على الأقل في الشهرين');
// بقية المصادر
r = computeMonthBadges({ newAyahs: 52, reviewParts: 2, stars: 3, duelWins: 6, tajweed: { learned: 1, practiced: 2, examFirstTry: 0, approved: 3 } });
ok(by(r, 'hero').tierKey === 'gold' && by(r, 'rasikh').tierKey === 'silver' && by(r, 'star').tierKey === 'bronze', 'البطل/الراسخ/النجم');
ok(by(r, 'duelist').tierKey === 'gold' && by(r, 'tjMaster').tierKey === 'gold' && by(r, 'tjExam').tier === -1, 'المنافس + التجويد (والاختبار 0 ← بلا درجة)');
ok(by(r, 'hero').next.at === 100 && by(r, 'hero').next.remaining === 48, 'المتبقي للدرجة التالية');
const s = summarizeEarned(r);
ok(s.total === 7 && s.byTier.gold === 3, 'الملخص: العدد والمجموع حسب الدرجة');
ok(closestToNext(r) !== null, 'أقرب وسام قادم');
// المواظب
r = computeMonthBadges({ attendance: { expected: 8, present: 8 } });
ok(by(r, 'steady').tierKey === 'diamond', 'المواظب: 100% من 8 حصص → ماسي');
r = computeMonthBadges({ attendance: { expected: 2, present: 2 } });
ok(by(r, 'steady').tierKey === 'gold', 'المواظب: 100% من حصتين فقط → ذهبي (لا ماسي)');
r = computeMonthBadges({ attendance: { expected: 8, present: 6 } });
ok(by(r, 'steady').tierKey === 'bronze' && by(r, 'steady').value === 75, 'المواظب: 75% → برونزي');
ok(computeMonthBadges({ attendance: { expected: 0, present: 0 } }).length === 0, 'بلا حصص متوقعة: لا وسام حضور');

// ---- الحضور ----
const st = { schedule: { days: [0, 2], minutes: 30 } }; // الأحد والثلاثاء
const days = scheduledDaysInMonth(st, 2026, 9); // أكتوبر 2026
ok(days.length === 8 && days[0] === '2026-10-04', `حصص أكتوبر المجدولة (${days.length})`);
const ev = evidenceDays([at(2026, 9, 4), at(2026, 9, 6), '2026-10-08T09:00:00']);
let sm = summarizeMonth(st, 2026, 9, ev);
ok(sm.present === 2 && sm.extra === 1 && sm.unconfirmed === 6 && sm.expected === 8, 'نشاط يومين مجدولين + يوم إضافي بلا جدول');
setDayStatus(st, '2026-10-13', 'absent_excused'); setDayStatus(st, '2026-10-18', 'cancelled');
setDayStatus(st, '2026-10-20', 'present');
sm = summarizeMonth(st, 2026, 9, ev);
ok(sm.absentExcused === 1 && sm.cancelled === 1 && sm.expected === 7 && sm.present === 3, 'تأكيد المعلم: غياب بعذر/ملغاة لا تُحتسب/حضور مؤكَّد');
ok(sm.hours === 2 && sm.minutes === 30, 'الساعات = (حاضر+إضافي) × مدة الحصة (4 × 30د = 2س)');
ok(needsConfirmation(st, '2026-10-25', ev) === true && needsConfirmation(st, '2026-10-04', ev) === false, 'يُسأل فقط عن مجدول بلا دليل');
ok(needsConfirmation({}, '2026-10-25', ev) === false, 'بلا جدول: لا أسئلة');
ok(summarizeMonth({}, 2026, 9, ev).hasSchedule === false && summarizeMonth({}, 2026, 9, ev).pct === null, 'بلا جدول: لا نسبة حضور');
ok(dateKey(new Date(2026, 0, 5)) === '2026-01-05', 'مفتاح التاريخ');

// ---- الختم ----
const pace = paceFrom([{ newUnits: 40, sessions: 8 }, { newUnits: 56, sessions: 8 }]);
ok(pace.basis === 'actual' && Math.abs(pace.perSession - 6) < 1e-9 && pace.perMonth === 48, 'الوتيرة: 96 ÷ 16 = 6 لكل حصة');
ok(paceFrom([]).basis === 'none', 'بلا بيانات: لا وتيرة');
const proj = projectMilestones({ pace, remaining: { juz: 60, half: 600 }, attendancePct: 80, now: new Date(2026, 10, 1) });
ok(proj[0].sessions === 10 && proj[1].sessions === 100, 'الحصص = المتبقي ÷ الوتيرة (تقريبًا للأعلى)');
ok(proj[1].monthsFull === 12.5 && proj[1].monthsAvg > proj[1].monthsFull, 'سيناريو الحضور الفعلي أبطأ من الالتزام الكامل');
ok(sessionsToFinish(60, pace) === 10 && sessionsToFinish(0, pace) === 0 && sessionsToFinish(5, { perSession: 0 }) === null, 'حصص إتمام الجزء');
const w = new Array(6236).fill(0.1);
ok(Math.abs(unitsBetween(0, 100, w) - 10) < 1e-6 && unitsBetween(0, 100) === 100, 'تحويل الآيات إلى صفحات بالأوزان');
const plan = buildNextMonthPlan({ pace, sessionsNext: 8, thisMonthNewAyahs: 40, farReviewParts: [3, 4] });
ok(plan.tentative === true && plan.newUnits === 48 && plan.weekly.length === 4, 'خطة الشهر القادم: مبدئية وبوتيرة الطالب');
console.log(`\nالنتيجة: ${pass} ناجح، ${fail} فاشل`);
process.exit(fail ? 1 : 0);
