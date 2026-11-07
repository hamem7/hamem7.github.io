// tests/goldStars.test.js — تشغيل: node tests/goldStars.test.js
import { addGoldStar, starsSuffix, getGoldStars, STAR_MILESTONES, starsInMonth, getStarRank, nextStarGoal, crownExtras } from '../core/goldStars.js';
import { getType } from '../certificates/texts.js';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('✅', m); } else { fail++; console.log('❌', m); } };

const st = { name: 'أحمد' };
ok(starsSuffix(st) === '' && getGoldStars(st) === 0, 'طالب بلا نجوم: لا لاحقة');
let r;
for (let i = 1; i <= 4; i++) { r = addGoldStar(st); ok(r.count === i && r.milestone === null, `نجمة ${i}: لا عتبة`); }
r = addGoldStar(st);
ok(r.count === 5 && r.milestone === 5, 'النجمة 5 تبلغ العتبة 5');
ok(starsSuffix(st) === ' 🌟×5', 'اللاحقة 🌟×5 (رتبة نجم لامع)');
ok(r.rankUp === true && r.rank.id === 'shining', 'النجمة 5 ترقية إلى «نجم لامع»');
r = addGoldStar(st);
ok(r.milestone === null && r.rankUp === false, 'النجمة 6: لا تكرار للشهادة ولا ترقية');
const old = { goldStars: 11, starCertMilestones: [] };
r = addGoldStar(old);
ok(r.milestone === 10 && old.starCertMilestones.includes(5) && old.starCertMilestones.includes(10), 'طالب تخطّى عتبتين: شهادة واحدة لأعلى عتبة ولا تتكرر');
ok(starsSuffix({ goldStars: 1 }) === ' ⭐', 'نجمة واحدة: ⭐ بلا عدد');
ok(STAR_MILESTONES.every((m, i, a) => i === 0 || m > a[i - 1]), 'العتبات تصاعدية');

ok(starsSuffix({ goldStars: 3 }) === ' ⭐×3', '3 نجوم: ⭐×3');
ok(starsSuffix({ goldStars: 13 }) === ' 🏅×13', '13 نجمة: 🏅×13');
ok(starsSuffix({ goldStars: 30 }) === ' 🏆×30', '30 نجمة: 🏆×30');
ok(starsSuffix({ goldStars: 50 }) === ' 👑×50' && starsSuffix({ goldStars: 80 }) === ' 👑⭐×80', 'التاج ونجمته الصغيرة');
ok(crownExtras(1000) === 5, 'سقف نجوم التاج');
ok(getStarRank(0) === null && getStarRank(9).id === 'shining' && getStarRank(10).id === 'medal', 'حدود الرتب');
let g = nextStarGoal(8); ok(g.left === 2 && g.at === 10, 'باقي 2 على الوسام');
g = nextStarGoal(55); ok(g.crownStep && g.at === 75 && g.left === 20, 'الهدف بعد التاج: نجمة تاج');
ok(nextStarGoal(200) === null, 'لا هدف بعد آخر نجمة تاج');
const up = { goldStars: 9 }; r = addGoldStar(up);
ok(r.rankUp && r.rank.id === 'medal' && r.milestone === 10, 'النجمة 10: ترقية لوسام + شهادة');
const lg = { goldStars: 0 };
addGoldStar(lg, new Date(2026, 9, 5).getTime()); addGoldStar(lg, new Date(2026, 9, 20).getTime()); addGoldStar(lg, new Date(2026, 10, 2).getTime());
ok(lg.starLog.length === 3 && starsInMonth(lg, 2026, 9) === 2 && starsInMonth(lg, 2026, 10) === 1, 'سجل تواريخ النجوم يُحصي كل شهر');
ok(starsInMonth({ goldStars: 4 }, 2026, 9) === null, 'نجوم قديمة بلا تواريخ: لا حساب شهري (null)');
ok(starsInMonth({}, 2026, 9) === 0, 'طالب بلا نجوم: صفر');

const type = getType('star');
ok(type.id === 'star', 'نوع شهادة star موجود');
for (const lang of ['ar', 'en']) for (const female of [false, true]) {
    type.bodies[lang].forEach((fn, i) => {
        const html = fn({ name: 'س', f: female, what: '5 نجوم' });
        ok(html.includes('5 نجوم') && !html.includes('undefined'), `صيغة ${lang}/${female ? 'مؤنث' : 'مذكر'} #${i}`);
    });
}
console.log(`\nالنتيجة: ${pass} ناجح، ${fail} فاشل`);
process.exit(fail ? 1 : 0);
