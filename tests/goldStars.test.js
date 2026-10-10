// tests/goldStars.test.js — تشغيل: node tests/goldStars.test.js
import { addGoldStar, starsSuffix, getGoldStars, STAR_MILESTONES } from '../core/goldStars.js';
import { getType } from '../certificates/texts.js';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('✅', m); } else { fail++; console.log('❌', m); } };

const st = { name: 'أحمد' };
ok(starsSuffix(st) === '' && getGoldStars(st) === 0, 'طالب بلا نجوم: لا لاحقة');
let r;
for (let i = 1; i <= 4; i++) { r = addGoldStar(st); ok(r.count === i && r.milestone === null, `نجمة ${i}: لا عتبة`); }
r = addGoldStar(st);
ok(r.count === 5 && r.milestone === 5, 'النجمة 5 تبلغ العتبة 5');
ok(starsSuffix(st) === ' ⭐×5', 'اللاحقة ⭐×5');
r = addGoldStar(st);
ok(r.milestone === null, 'النجمة 6: لا تكرار للشهادة');
const old = { goldStars: 11, starCertMilestones: [] };
r = addGoldStar(old);
ok(r.milestone === 10 && old.starCertMilestones.includes(5) && old.starCertMilestones.includes(10), 'طالب تخطّى عتبتين: شهادة واحدة لأعلى عتبة ولا تتكرر');
ok(starsSuffix({ goldStars: 1 }) === ' ⭐', 'نجمة واحدة: ⭐ بلا عدد');
ok(STAR_MILESTONES.every((m, i, a) => i === 0 || m > a[i - 1]), 'العتبات تصاعدية');

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
