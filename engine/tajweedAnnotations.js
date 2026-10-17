// engine/tajweedAnnotations.js
//
// وحدة خالصة (بلا DOM ولا شبكة) لاستعمال جدول التوسيم database/data/tajweedAnnotations.json (يولّده
// tools/tajweed-annotations/build.mjs من محرك ghunna). الجدول يقول لكل آية أين يقع كل حكم على مستوى
// «فهرس الكلمة» (كلمات cleanAyahText بعد حذف رموز الوقف). بهذا تُبنى أسئلة التجويد من آيات حفظ الطالب
// نفسه بدل أمثلة ثابتة، وتُعرف كل مواضع الحكم في الآية فلا يظهر موضع صحيح بين الخيارات الخاطئة.

// حكم الكتالوج ← قواعد ghunna التي تمثّله. لام الفعل غير موسومة في المصدر (تبقى أمثلتها يدوية).
export const CATALOG_TO_ANNOTATION = {
    qalqalah: ['qalqalah-sughra', 'qalqalah-kubra'],
    ghunna_wajiba: ['ghunnah-mushaddadah'],
    ikhfa_shafawi: ['ikhfa-shafawi'],
    idgham_shafawi: ['idgham-shafawi'],
    izhar_shafawi: ['izhar-shafawi'],
    izhar: ['izhar-halqi'],
    idgham_bighunnah: ['idgham-bighunnah'],
    idgham_bila_ghunnah: ['idgham-bila-ghunnah'],
    iqlab: ['iqlab'],
    ikhfa: ['ikhfa-haqiqi'],
    izhar_qamari: ['lam-qamariyyah'],
    idgham_shamsi: ['lam-shamsiyyah'],
    mithlain: ['idgham-mithlayn'],
    mutaqaribain: ['idgham-mutaqaribayn'],
    mutajanisain: ['idgham-mutajanisayn'],
    madd_wajib_muttasil: ['madd-muttasil'],
    madd_jaiz_munfasil: ['madd-munfasil'],
    madd_arid_sukun: ['madd-arid-lissukun'],
    madd_leen: ['madd-lin'],
    madd_badal: ['madd-badal'],
    madd_lazim: ['madd-lazim-kalimi-muthaqqal', 'madd-lazim-kalimi-mukhaffaf', 'madd-lazim-harfi-muthaqqal', 'madd-lazim-harfi-mukhaffaf'],
    lazim_kalami_muthaqqal: ['madd-lazim-kalimi-muthaqqal'],
    lazim_kalami_mukhaffaf: ['madd-lazim-kalimi-mukhaffaf'],
    lazim_harfi_muthaqqal: ['madd-lazim-harfi-muthaqqal'],
    lazim_harfi_mukhaffaf: ['madd-lazim-harfi-mukhaffaf']
};

// فهرس للبحث السريع: occurrences(surah, ayah, ruleId) ← [{w1, w2}] (فهارس كلمات، w2 ≥ w1)
export function createAnnotationIndex(data) {
    const rules = (data && data.rules) || [];
    const ayahs = (data && data.ayahs) || {};
    const nameIdx = new Map(rules.map((r, i) => [r, i]));
    return {
        has: (ruleId) => !!CATALOG_TO_ANNOTATION[ruleId],
        occurrences(surah, ayah, ruleId) {
            const names = CATALOG_TO_ANNOTATION[ruleId];
            const flat = ayahs[`${surah}:${ayah}`];
            if (!names || !flat) return [];
            const wanted = new Set(names.map(n => nameIdx.get(n)).filter(i => i !== undefined));
            const out = [];
            for (let i = 0; i < flat.length; i += 3) if (wanted.has(flat[i])) out.push({ w1: flat[i + 1], w2: flat[i + 2] });
            return out;
        },
        // كل أسماء قواعد ghunna الموجودة في الآية (للفحص والتقارير)
        ruleNamesIn(surah, ayah) {
            const flat = ayahs[`${surah}:${ayah}`] || [];
            const names = new Set();
            for (let i = 0; i < flat.length; i += 3) names.add(rules[flat[i]]);
            return [...names];
        }
    };
}

// كل آيات الحفظ من مسار الطالب (buildPath في trackingEngine): [{surah, ayah}] بالترتيب الأقدم حفظاً أولاً
export function memorizedAyahsFromPath(path) {
    const out = [];
    ((path && path.segments) || []).forEach(seg => {
        const last = Math.min(seg.limit || seg.to, seg.to);
        for (let a = seg.from; a <= last; a++) out.push({ surah: seg.surah, ayah: a });
    });
    return out;
}

// آيات مرشَّحة لحكم معيّن من آيات حفظ الطالب. wordCountOf(surah, ayah) اختياري لاشتراط آية فيها كلمات كافية
// (4 فأكثر: الصحيحة + 3 مشتِّتات). النتيجة مرتّبة عشوائياً حتى لا يتكرر السؤال نفسه كل مرة.
export function findCandidateAyahs(index, ruleId, ayahList, { wordCountOf = null, minWords = 4, rng = Math.random } = {}) {
    const found = [];
    for (const { surah, ayah } of ayahList || []) {
        const occ = index.occurrences(surah, ayah, ruleId);
        if (!occ.length) continue;
        if (wordCountOf) {
            const n = wordCountOf(surah, ayah);
            const covered = new Set();
            occ.forEach(o => { for (let w = o.w1; w <= o.w2; w++) covered.add(w); });
            if (n - covered.size < minWords - 1) continue;
        }
        found.push({ surah, ayah, occurrences: occ });
    }
    for (let i = found.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [found[i], found[j]] = [found[j], found[i]]; }
    return found;
}
