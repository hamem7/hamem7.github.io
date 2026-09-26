// tests/fake-quran.mjs
// ⚠️ TEST-ONLY synthetic data. These are NOT Quran verses — they are made-up Arabic-looking words
// so the REAL engine/homeworkEngine.js can be exercised in the sandbox (which has no access to
// api.alquran.cloud). Shape matches the alquran.cloud "quran-uthmani" payload the platform stores
// in IndexedDB (DarHamDatabase / quran).

const WORDS = ['كتاب', 'نور', 'هدى', 'رحمة', 'علم', 'صبر', 'حكمة', 'شكر', 'ذكر', 'فضل', 'يقين', 'أمان',
  'سلام', 'بركة', 'خير', 'حق', 'عدل', 'صدق', 'وفاء', 'رجاء', 'تقوى', 'إيمان', 'يسر', 'عون', 'حمد',
  'سعي', 'قلب', 'عقل', 'لسان', 'يد', 'بصر', 'سمع', 'طريق', 'باب', 'سبيل', 'ميزان', 'قسط', 'برهان',
  'بيان', 'تبيان', 'شفاء', 'ضياء', 'فرقان', 'مثاني', 'تنزيل', 'موعظة', 'بشرى', 'نذير', 'مبين', 'كريم'];

function seeded(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

export function buildFakeSurahs() {
  const rnd = seeded(42);
  const defs = [
    { number: 101, name: 'سُورَةُ الاختبار الأولى', ayahs: 12, juz: 30 },
    { number: 102, name: 'سُورَةُ الاختبار الثانية', ayahs: 9, juz: 30 },
    { number: 103, name: 'سُورَةُ الاختبار الثالثة', ayahs: 10, juz: 30 }
  ];
  let globalNumber = 1;
  return defs.map(d => ({
    number: d.number, name: d.name, englishName: 'Test ' + d.number,
    ayahs: Array.from({ length: d.ayahs }, (_, i) => {
      const n = 7 + Math.floor(rnd() * 4);
      const text = Array.from({ length: n }, () => WORDS[Math.floor(rnd() * WORDS.length)]).join(' ');
      return { number: globalNumber++, text, numberInSurah: i + 1, juz: d.juz, page: 600 + i };
    })
  }));
}

const clean = (name) => name.replace(/سُورَةُ\s*/g, '').replace(/سورة\s*/g, '').trim();

/** Minimal stand-in for QuranEngine (same method names HomeworkEngine calls). */
export function buildFakeQuranEngine() {
  const surahs = buildFakeSurahs();
  const decorate = (s, a) => { a.surahName = clean(s.name); a.surahNumber = s.number; return a; };
  return {
    async getSurah(num) { return surahs.find(s => s.number === num) || null; },
    getAyahsInRange(surah, start, end) { return surah.ayahs.filter(a => a.numberInSurah >= start && a.numberInSurah <= end).map(a => decorate(surah, a)); },
    async getAllSurahsList() { return surahs.map(s => ({ number: s.number, name: clean(s.name), ayahsCount: s.ayahs.length })); },
    async getAyahsBySurahRange(from, to) { const out = []; surahs.filter(s => s.number >= Math.min(from, to) && s.number <= Math.max(from, to)).forEach(s => s.ayahs.forEach(a => out.push(decorate(s, a)))); return out; },
    async getAyahsByJuz(j) { const out = []; surahs.forEach(s => s.ayahs.filter(a => a.juz === j).forEach(a => out.push(decorate(s, a)))); return out; }
  };
}
