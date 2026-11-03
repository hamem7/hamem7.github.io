// tests/badgesAttendanceKhatm.test.mjs — تشغيل: node tests/badgesAttendanceKhatm.test.mjs
import { computeMonthBadges, summarizeEarned, countCappedPerDay, closestToNext, BADGE_DEFS, TIER_KEYS } from '../engine/badgesEngine.js';
import { summarizeMonth, evidenceDays, setDayStatus, setDayMinutes, needsConfirmation, dateKey, scheduledDaysInMonth, collectEvidenceTimestamps } from '../engine/attendanceEngine.js';
import { paceFrom, projectMilestones, unitsBetween, sessionsToFinish, buildNextMonthPlan, buildPathMap, weightsFromPages } from '../engine/khatmPlan.js';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('✅', m); } else { fail++; console.log('❌', m); } };
const at = (y, m, d, h = 10) => new Date(y, m, d, h).getTime();
const by = (res, k) => res.find(r => r.key === k);

// ---- الأوسمة ----
ok(BADGE_DEFS.length === 9, '٩ أوسمة درجاتية فقط');
ok(['perfect','active','steady','tjLearn','tjExam','tjMaster'].every(k => !BADGE_DEFS.some(b => b.key === k)), 'الأوسمة المحذوفة غير موجودة');
ok(BADGE_DEFS.every(b => b.th.length === 4 && b.th.every((x, i, a) => i === 0 || x >= a[i - 1])), 'عتبات كل وسام 4 وتصاعدية');
// الماهر بالقرآن: ١٠٠٪ في ٣ حلقات (أيام لعب) متتالية
const g = [];
[1, 2, 3].forEach(d => g.push({ timestamp: at(2026, 9, d), score: 100, mode: 'eval' }));
g.push({ timestamp: at(2026, 9, 3, 15), score: 60, mode: 'eval' }); // لعبة أخرى في نفس الحلقة لا تقطع السلسلة
g.push({ timestamp: at(2026, 9, 6), score: 90, mode: 'eval' });    // حلقة بلا ١٠٠٪ تقطع السلسلة
[8, 9].forEach(d => g.push({ timestamp: at(2026, 9, d), score: 100, mode: 'eval' }));
let r = computeMonthBadges({ games: g });
ok(by(r, 'skilled').value === 3 && by(r, 'skilled').tierKey === 'bronze', 'الماهر بالقرآن: ٣ حلقات متتالية بـ١٠٠٪ → برونزي');
const g2 = [1, 2, 4, 5].map(d => ({ timestamp: at(2026, 9, d), score: 100, mode: 'eval' })); g2.splice(2, 0, { timestamp: at(2026, 9, 3), score: 95, mode: 'eval' });
ok(computeMonthBadges({ games: g2 }).find(x => x.key === 'skilled').tier === -1, 'الماهر بالقرآن: حلقة دون ١٠٠٪ في الوسط تقطع السلسلة');
// مصحّح الأخطاء: «تحدي الأخطاء» ١٠٠٪ في ٣ حلقات متتالية (حلقات الألعاب الأخرى لا تُعدّ)
const fx = [1, 3, 5].map(d => ({ timestamp: at(2026, 9, d), score: 100, mode: 'weakness' })).concat([{ timestamp: at(2026, 9, 2), score: 40, mode: 'eval' }]);
r = computeMonthBadges({ games: fx });
ok(by(r, 'fixer').value === 3 && by(r, 'fixer').tierKey === 'bronze', 'مصحّح الأخطاء: ٣ حلقات تحدي أخطاء متتالية بـ١٠٠٪ → برونزي');
r = computeMonthBadges({ games: fx.map((x, i) => i === 1 ? { ...x, score: 80 } : x) });
ok(by(r, 'fixer').tier === -1, 'مصحّح الأخطاء: ٨٠٪ لا تكفي');
ok(!by(r, 'hero') && !by(r, 'star') && !by(r, 'reviewer'), 'بلا بيانات (null) لا يظهر الوسام');
ok(by(r, 'riser') === undefined, 'النجم الصاعد بلا شهر سابق: لا يُحسب');
// سقف اليوم
const spam = Array.from({ length: 12 }, (_, i) => ({ timestamp: at(2026, 9, 5, 8 + (i % 10)), score: 99 }));
ok(countCappedPerDay(spam, x => x.score >= 90) === 2, 'سقف لعبتين في اليوم يمنع التكديس');
r = computeMonthBadges({ games: spam });
ok(by(r, 'skilled').tier === -1, 'تكديس يوم واحد لا يمنح وسامًا');
// النجم الصاعد: شهران متتاليان أعلى من الشهر الذي قبلهما
ok(by(computeMonthBadges({ monthAvgs: [85, 78, 70, null] }), 'riser').tierKey === 'bronze', 'النجم الصاعد: شهران صاعدان → برونزي');
ok(by(computeMonthBadges({ monthAvgs: [85, 78] }), 'riser').tier === -1, 'النجم الصاعد: شهر صاعد واحد لا يكفي');
ok(by(computeMonthBadges({ monthAvgs: [85, 90, 70] }), 'riser').tier === -1, 'النجم الصاعد: هبوط هذا الشهر → لا وسام');
ok(by(computeMonthBadges({ monthAvgs: [null, 90] }), 'riser') === undefined, 'النجم الصاعد يحتاج ٣ ألعاب في الشهر');
// بقية المصادر
r = computeMonthBadges({ newAyahs: 40, reviewQuestions: 320, reviewParts: 5, stars: 20, duelWins: 6, tajweedCorrect: 50, tajweed: { learned: 1, practiced: 2, examFirstTry: 0, approved: 3 } });
ok(by(r, 'hero').tierKey === 'bronze' && by(r, 'reviewer').tierKey === 'bronze' && by(r, 'rasikh').tierKey === 'bronze' && by(r, 'star').tierKey === 'bronze', 'بطل الحفظ ٤٠ / بطل المراجعة ٣٠٠ / الراسخ ٥ / نجم السؤال ٢٠');
ok(by(computeMonthBadges({ newAyahs: 39, reviewQuestions: 299, reviewParts: 4, stars: 19, tajweedCorrect: 49 }), 'hero').tier === -1, 'دون العتبة: لا وسام');
ok(by(r, 'tjApply').tierKey === 'bronze' && by(r, 'duelist').tierKey === 'gold', 'مطبّق التجويد ٥٠ سؤالًا + المواجهات');
ok(by(r, 'hero').next.at === 80 && by(r, 'hero').next.remaining === 40, 'المتبقي للدرجة التالية');
const s = summarizeEarned(r);
ok(s.total === 6 && s.byTier.gold === 1, 'الملخص: العدد والمجموع حسب الدرجة');
ok(closestToNext(r) !== null, 'أقرب وسام قادم');

// ---- الحضور ----
const st = { schedule: { days: [0, 2], minutes: 30 } }; // الأحد والثلاثاء
const days = scheduledDaysInMonth(st, 2026, 9); // أكتوبر 2026
ok(days.length === 8 && days[0] === '2026-10-04', `حصص أكتوبر المجدولة (${days.length})`);
const ev = evidenceDays([at(2026, 9, 4), at(2026, 9, 6), '2026-10-08T09:00:00']);
let sm = summarizeMonth(st, 2026, 9, ev);
ok(sm.present === 2 && sm.extra === 1 && sm.unconfirmed === 6 && sm.expected === 8, 'نشاط يومين مجدولين + يوم إضافي بلا جدول');
setDayStatus(st, '2026-10-13', 'absent'); setDayStatus(st, '2026-10-18', 'cancelled');
setDayStatus(st, '2026-10-20', 'present');
sm = summarizeMonth(st, 2026, 9, ev);
ok(sm.absent === 1 && sm.cancelled === 1 && sm.expected === 7 && sm.present === 3, 'تأكيد المعلم: غاب/لم تُعقد (لا تُحتسب)/حضر');
ok(sm.hours === 0 && sm.hoursMissing === 4 && sm.complete === false, 'لا ساعات بلا مدد مسجَّلة (لا افتراض بمدة الجدول)');
st.attendanceMinutes = { '2026-10-04': 30, '2026-10-06': 45, '2026-10-08': 60, '2026-10-20': 15 };
sm = summarizeMonth(st, 2026, 9, ev);
ok(sm.hours === 2.5 && sm.hoursMissing === 0 && sm.totalMinutes === 150, 'الساعات = مجموع المدد الفعلية (30+45+60+15 = 150د = 2.5س)');
const st2 = { id: 9, schedule: { days: [0], minutes: 60 } }; setDayMinutes(st2, '2026-10-04', 40); setDayMinutes(st2, '2026-10-11', 0); setDayMinutes(st2, '2026-10-18', 9999);
ok(st2.attendanceMinutes['2026-10-04'] === 40 && !('2026-10-11' in st2.attendanceMinutes) && !('2026-10-18' in st2.attendanceMinutes), 'setDayMinutes يقبل مدة معقولة فقط');
ok(needsConfirmation(st, '2026-10-25', ev) === true && needsConfirmation(st, '2026-10-04', ev) === false, 'يُسأل فقط عن مجدول بلا دليل');
ok(needsConfirmation({}, '2026-10-25', ev) === false, 'بلا جدول: لا أسئلة');
ok(summarizeMonth({}, 2026, 9, ev).hasSchedule === false && summarizeMonth({}, 2026, 9, ev).pct === null, 'بلا جدول: لا نسبة حضور');
ok(dateKey(new Date(2026, 0, 5)) === '2026-01-05', 'مفتاح التاريخ');

// ---- أدلة الحضور: أي أثر ولو لم يكتمل ----
const stu = { id: 7, pausedEvaluation: { pausedAt: '2026-10-03T10:00:00' } };
const evs = collectEvidenceTimestamps(stu, {
  games: [{ timestamp: at(2026, 9, 1) }],
  matches: [{ studentIdA: 7, studentIdB: 9, startedAt: '2026-10-05T09:00:00', finishedAt: null }, { studentIdA: 1, studentIdB: 2, startedAt: '2026-10-06T09:00:00' }],
  tjSessions: [{ studentId: 7, timestamp: '2026-10-07T09:00:00' }, { studentId: 8, timestamp: '2026-10-08T09:00:00' }],
  mastery: [{ studentId: 7, journey: { learnedAt: '2026-10-10T09:00:00', examAttempts: [{ at: '2026-10-11T09:00:00' }], teacherApprovedAt: '2026-10-12T09:00:00' } }],
  ruleReviews: [{ studentId: 7, lastReviewedAt: '2026-10-13T09:00:00' }]
});
const dk = [...evidenceDays(evs)].sort();
ok(JSON.stringify(dk) === JSON.stringify(['2026-10-01', '2026-10-03', '2026-10-05', '2026-10-07', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13']), 'أدلة الحضور: لعبة، اختبار معلّق، مواجهة غير مكتملة، جلسة تجويد، خطوات الرحلة، مراجعة — ولا أثر لطالب آخر');
ok(collectEvidenceTimestamps({ id: 5 }, {}).length === 0, 'بلا أثر: لا أدلة');

// ---- الختم ----
const pace = paceFrom([{ newUnits: 40, sessions: 8 }, { newUnits: 56, sessions: 8 }]);
ok(pace.basis === 'actual' && Math.abs(pace.perSession - 6) < 1e-9 && pace.perMonth === 48, 'الوتيرة: 96 ÷ 16 = 6 لكل حصة');
ok(paceFrom([]).basis === 'none', 'بلا بيانات: لا وتيرة');
const proj = projectMilestones({ pace, remaining: { juz: 60, half: 600 }, attendancePct: 80, now: new Date(2026, 10, 1) });
ok(proj[0].sessions === 10 && proj[1].sessions === 100, 'الحصص = المتبقي ÷ الوتيرة (تقريبًا للأعلى)');
ok(proj[1].monthsFull === 12.5 && proj[1].monthsAvg > proj[1].monthsFull, 'سيناريو الحضور الفعلي أبطأ من الالتزام الكامل');
ok(sessionsToFinish(60, pace) === 10 && sessionsToFinish(0, pace) === 0 && sessionsToFinish(5, { perSession: 0 }) === null, 'حصص إتمام الجزء');
const surahs = [{ number: 1, ayahsCount: 3 }, { number: 2, ayahsCount: 4 }, { number: 3, ayahsCount: 2 }];
const pm = buildPathMap(surahs);
ok(JSON.stringify(pm) === JSON.stringify([7, 8, 3, 4, 5, 6, 0, 1, 2]), 'مسار الحفظ: السور من الأخيرة والآيات تصاعديًا');
const pages = [1, 1, 1, 2, 2, 3, 3, 3, 3];
const w = weightsFromPages(pages);
ok(Math.abs(w.reduce((a, b) => a + b, 0) - 3) < 1e-9, 'مجموع الأوزان = عدد الصفحات');
ok(Math.abs(unitsBetween(0, 2, w, pm) - 0.5) < 1e-9 && unitsBetween(0, 2) === 2, 'تحويل آيات المسار إلى صفحات (آيتان من صفحة 3 = 0.5)');
const plan = buildNextMonthPlan({ pace, sessionsNext: 8, thisMonthNewAyahs: 40, farReviewParts: [3, 4] });
ok(plan.tentative === true && plan.newUnits === 48 && plan.weekly.length === 4, 'خطة الشهر القادم: مبدئية وبوتيرة الطالب');
console.log(`\nالنتيجة: ${pass} ناجح، ${fail} فاشل`);
process.exit(fail ? 1 : 0);
