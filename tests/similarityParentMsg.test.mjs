// رسالة ولي الأمر عن المتشابهات: المؤنّث، مواضع الخطأ (3 على الأكثر بلا تكرار)، ورابط واتساب
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSessionMessage, buildWeeklyMessage, weakPlaces, parentWaUrl, placeOf } from '../engine/similarityParentMsg.js';

const D = {
  sim_pm_greet: 'السلام عليكم', sim_pm_intro: 'تدرّب ابنكم {name}', sim_pm_intro_f: 'تدرّبت ابنتكم {name}',
  sim_pm_score: 'النتيجة: {c} من {n}', sim_pm_mastered: 'أتقن {m} من {t}', sim_pm_weak_h: 'يحتاج:', sim_pm_weak_h_f: 'تحتاج:',
  sim_pm_in_one: 'في سورة {s}', sim_pm_in_two: 'في سورتي {a} و{b}', sim_pm_in_many: 'في سور {list}', sim_pm_list_sep: '، ', sim_pm_and_more: ' وغيرها', sim_pm_started: 'بدأ على {t}', sim_pm_week_start: '{name}: {s} جلسات، بدأ {t}',
  sim_pm_home: 'نرجو', sim_pm_all_right: 'بلا خطأ', sim_pm_bless: 'بارك الله فيه', sim_pm_bless_f: 'بارك الله فيها', sim_pm_sign: 'المعلم: {teacher}',
  sim_pm_week: '{name}: {s} جلسات، {m}/{t}', sim_pm_week_none: '{name}: لا جلسات، {m}/{t}', sim_pm_week_need: 'تثبيت: {w}', sim_pm_week_ask: 'شجّعوه',
};
const tr = (k, p) => { let s = D[k] ?? k; Object.keys(p || {}).forEach(x => { s = s.split('{' + x + '}').join(String(p[x])); }); return s; };

test('مواضع الخطأ: بلا تكرار وبحد 3', () => {
  const a = [
    { sig: 'x', anchorPhrase: 'أ', surahs: [80, 86], isCorrect: false }, { sig: 'x', anchorPhrase: 'أ', surahs: [80, 86], isCorrect: false },
    { sig: 'y', anchorPhrase: 'ب', surahs: [81], isCorrect: true }, { sig: 'z', anchorPhrase: 'ج', surahs: [2], isCorrect: false },
    { sig: 'w', anchorPhrase: 'د', surahs: [3], isCorrect: false }, { sig: 'v', anchorPhrase: 'هـ', surahs: [4], isCorrect: false },
  ];
  assert.deepEqual(weakPlaces(a).map(w => w.phrase), ['أ', 'ج', 'د']);
});

test('رسالة الجلسة: مؤنث + مواضع', () => {
  const m = buildSessionMessage(tr, { name: 'مريم', girl: true, correct: 7, total: 9, mastered: 3, eligible: 25, teacher: 'أحمد',
    weak: [{ phrase: 'فلينظر الإنسان', surahNames: ['عبس', 'الطارق'] }] });
  assert.match(m, /تدرّبت ابنتكم مريم/);
  assert.match(m, /تحتاج:/);
  assert.match(m, /﴿ فلينظر الإنسان ﴾ — في سورتي عبس والطارق/);
  assert.match(m, /بارك الله فيها/);
  assert.match(m, /المعلم: أحمد/);
});

test('رسالة الجلسة بلا أخطاء + أسبوعي', () => {
  const m = buildSessionMessage(tr, { name: 'أحمد', girl: false, correct: 9, total: 9, mastered: 0, eligible: 0, weak: [] });
  assert.match(m, /بلا خطأ/); assert.doesNotMatch(m, /أتقن|بدأ/); assert.doesNotMatch(m, /المعلم/);
  assert.match(buildWeeklyMessage(tr, { name: 'أحمد', sessions: 0, mastered: 2, eligible: 25, needWork: 4 }), /لا جلسات، 2\/25 تثبيت: 4 شجّعوه/);
  assert.equal(placeOf(tr, ['أ', 'ب', 'ج']), 'في سور أ، ب، ج');
});

test('رابط واتساب: رقم دولي فقط', () => {
  assert.equal(parentWaUrl('+20 102 781 4948', 'س').hasPhone, true);
  assert.match(parentWaUrl('00201027814948', 'س').url, /^https:\/\/wa\.me\/201027814948\?text=/);
  assert.equal(parentWaUrl('01027814948', 'س').hasPhone, false);
  assert.match(parentWaUrl('', 'س').url, /^https:\/\/wa\.me\/\?text=/);
});

test('عبارة التلخيص وقائمة السور الطويلة', () => {
  assert.equal(weakPlaces([{ sig: 'a', anchorPhrase: 'يَوْمَ ...', surahs: [78], isCorrect: false }])[0].phrase, 'يَوْمَ');
  assert.equal(placeOf(tr, ['أ', 'ب', 'ج', 'د', 'هـ']), 'في سور أ، ب، ج وغيرها');
  const m = buildSessionMessage(tr, { name: 'أحمد', correct: 1, total: 2, mastered: 0, eligible: 28, weak: [] });
  assert.match(m, /بدأ على 28/);
});
