// تحميل مصحف المنصة وبيانات المتشابهات في Node (للاختبارات والتقارير)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { QuranIndex } from '../../engine/similarityQuestions.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export function loadQuranSurahs() {
    return JSON.parse(fs.readFileSync(path.join(root, 'database/quran-uthmani.json'), 'utf8')).data.surahs;
}
export function loadQuran() { return new QuranIndex(loadQuranSurahs()); }
export async function loadGroups() {
    const a = await import('../../database/data/mutashabihatSeed.js');
    const b = await import('../../database/data/mutashabihatSeedPart1.js');
    return [...b.MUTASHABIHAT_SEED_PART1, ...a.MUTASHABIHAT_SEED];
}
