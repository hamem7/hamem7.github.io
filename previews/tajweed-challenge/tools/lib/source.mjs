// قراءة المصادر الأصلية للمنصة (قراءة فقط — لا يكتب شيء خارج مجلد التجربة)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PLATFORM = path.resolve(HERE, '../../../..');
export const loadQuran = () => JSON.parse(fs.readFileSync(path.join(PLATFORM, 'database/quran-uthmani.json'), 'utf8')).data.surahs;
export const loadAnnotations = () => JSON.parse(fs.readFileSync(path.join(PLATFORM, 'database/data/tajweedAnnotations.json'), 'utf8'));
export const ANN_NAME = {
  noon_izhar: ['izhar-halqi'], noon_idgham_ghunna: ['idgham-bighunnah'], noon_idgham_no_ghunna: ['idgham-bila-ghunnah'],
  noon_iqlab: ['iqlab'], noon_ikhfa: ['ikhfa-haqiqi'], meem_ikhfa: ['ikhfa-shafawi'], meem_idgham: ['idgham-shafawi'],
  meem_izhar: ['izhar-shafawi'], ghunna: ['ghunnah-mushaddadah'], qalqalah: ['qalqalah-sughra'],
  lam_qamari: ['lam-qamariyyah'], lam_shamsi: ['lam-shamsiyyah'], madd_muttasil: ['madd-muttasil'], madd_munfasil: ['madd-munfasil']
};
export function annotationOccurrences(ann, key, rule) {
  const names = ANN_NAME[rule]; const flat = ann.ayahs[key]; if (!names || !flat) return null;
  const idx = new Set(names.map(n => ann.rules.indexOf(n)));
  const out = []; for (let i = 0; i < flat.length; i += 3) if (idx.has(flat[i])) out.push([flat[i + 1], flat[i + 2]]);
  return out;
}

// نص الآية كما في المصحف، مع حذف البسملة المضافة في أول كل سورة (عدا الفاتحة) — كما تفعل المنصة (cleanAyahText)
export function ayahText(surah, a) {
  let t = a.text.trim();
  if (surah.number !== 1 && a.numberInSurah === 1) { const w = t.split(/\s+/); if (w.length > 4 && w[0].replace(/[^\u0621-\u064A]/g, '') === 'بسم') t = w.slice(4).join(' '); }
  return t;
}

// آيات البنك: الفاتحة وسور جزء عم، + آيات إضافية لدرس «تعرف على مصحفك» (السجدات الخمس عشرة، السكتات، السين مكان الصاد)
export const EXTRA_AYAHS = new Set(['7:206', '13:15', '16:50', '17:109', '19:58', '22:18', '22:77', '25:60', '27:26', '32:15', '38:24', '41:38', '53:62',
  '83:14', '75:27', '36:52', '18:1', '69:28', '2:245', '7:69', '52:37', '2:2', '54:6', '5:26']);
export const inPool = (surahNo, ayahNo) => surahNo === 1 || surahNo >= 78 || EXTRA_AYAHS.has(`${surahNo}:${ayahNo}`);
