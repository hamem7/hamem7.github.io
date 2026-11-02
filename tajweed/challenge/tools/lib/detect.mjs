// كاشف أحكام التجويد المستقل — يشتق الحكم من حروف النص وعلاماته مباشرة، دون الرجوع إلى أي جدول جاهز.
// الغرض: مصدر ثان للتحقق يقارن بجدول التوسيم القديم (ghunna). نتيجة كل كشف: {rule, w1, w2, trigger, ...}
// القاعدة المتبعة: التحفظ — أي حالة ملتبسة (وصل بهمزة وصل، علامة وقف بين الكلمتين، نون داخل الكلمة قبل و/ي،
// «يا أيها»، لفظ الجلالة والأسماء الموصولة...) تترك ولا تدخل بنك الأسئلة.
import { clusters, norm, hasSukun, hasShadda, hasVowel, hasTanween, isHamza, TANWEEN_STACKED, TANWEEN_OPEN, IQLAB_MARKS, MADDA_SIGN, WASLA, DAGGER_ALIF, FATHA, DAMMA, KASRA, tokenize } from '../../js/arabic.js';

const L = (s) => new Set(s.split(' '));
export const IZHAR_LETTERS = L('ء ه ع ح غ خ');
export const IDGHAM_GHUNNA_LETTERS = L('ي ن م و');
export const IDGHAM_NO_GHUNNA_LETTERS = L('ل ر');
export const IKHFA_LETTERS = L('ت ث ج د ذ ز س ش ص ض ط ظ ف ق ك');
export const QALQALAH_LETTERS = L('ق ط ب ج د');
export const QAMARI_LETTERS = L('ا ب غ ح ج ك و خ ف ع ق ي م ه ء');
export const SHAMSI_LETTERS = L('ت ث د ذ ر ز س ش ص ض ط ظ ل ن');
// المتجانسان: اتحدا مخرجًا واختلفا صفة (د↔ت، ت↔ط، ذ↔ظ، ث←ذ، ب←م)
const JANIS = { 'د': 'ت', 'ت': 'د', 'ط': 'ت', 'ذ': 'ظ', 'ث': 'ذ', 'ب': 'م' };
const JANIS2 = { 'ت': 'ط' };

function noonRule(letter) {
  if (IZHAR_LETTERS.has(letter)) return 'izhar';
  if (IDGHAM_GHUNNA_LETTERS.has(letter)) return 'idgham_ghunna';
  if (IDGHAM_NO_GHUNNA_LETTERS.has(letter)) return 'idgham_no_ghunna';
  if (letter === 'ب') return 'iqlab';
  if (IKHFA_LETTERS.has(letter)) return 'ikhfa';
  return null;
}
const hasMark = (c, set) => [...c.marks].some(m => set.has(m));
const isMaddaSigned = (c) => hasMark(c, MADDA_SIGN);
const MADD_BASES = new Set(['ا', 'و', 'ي', 'ی', 'ى']);

// حاسمة النهاية: هل تنتهي الكلمة بنون ساكنة أو تنوين؟ (التنوين بالفتح يقع على الحرف قبل الألف الأخيرة)
function endState(cs) {
  const last = cs[cs.length - 1];
  if (!last) return null;
  if (hasMark(last, TANWEEN_STACKED) || hasMark(last, TANWEEN_OPEN)) return { kind: 'tanween', carrier: last };
  if (last.base === 'ن' && !hasVowel(last) && !hasShadda(last)) return { kind: 'noon', carrier: last };
  if (hasMark(last, IQLAB_MARKS)) return { kind: 'tanween', carrier: last };
  const prev = cs[cs.length - 2];
  if (prev && ['ا', '\u0649', '\u06CC'].includes(last.base) && last.marks.size === 0 && hasTanween(prev)) return { kind: 'tanween', carrier: prev };
  return null;
}

// قرينة ترميز المصحف: التنوين المتراكب = إظهار، المفتوح = إدغام/إخفاء، علامة الميم الصغيرة = إقلاب
function cueOk(rule, st, next) {
  const c = st.carrier;
  if (st.kind === 'tanween') {
    const stacked = hasMark(c, TANWEEN_STACKED), open = hasMark(c, TANWEEN_OPEN), iq = hasMark(c, IQLAB_MARKS);
    if (rule === 'izhar') return stacked;
    if (rule === 'iqlab') return iq;
    return open;
  }
  const iq = hasMark(c, IQLAB_MARKS);
  if (rule === 'iqlab') return iq;
  if (rule === 'izhar') return hasSukun(c);
  if (rule === 'idgham_no_ghunna' || (rule === 'idgham_ghunna' && next.base !== 'و' && next.base !== 'ي' && next.base !== 'ی')) return hasShadda(next) && !hasSukun(c);
  return !hasSukun(c);
}

export function detectAyah(text) {
  const { words, waqfAfter } = tokenize(text);
  const cl = words.map(clusters);
  const occ = [];
  const push = (rule, w1, w2, trigger, extra = {}) => occ.push({ rule, w1, w2, trigger, ...extra });

  for (let i = 0; i < words.length; i++) {
    const cs = cl[i];
    if (!cs.length) continue;
    const last = cs[cs.length - 1];
    const hasNext = i + 1 < words.length && !waqfAfter[i] && cl[i + 1].length > 0;
    const next = hasNext ? cl[i + 1][0] : null;
    const prevWord = i > 0 ? cl[i - 1] : null;

    if (hasNext && next.base !== WASLA) {
      // ---------- النون الساكنة والتنوين عبر كلمتين ----------
      const st = endState(cs);
      if (st) {
        const trig = norm(isHamza(next) ? 'ء' : next.base);
        const rule = noonRule(trig);
        if (rule && cueOk(rule, st, next)) push('noon_' + rule, i, i + 1, trig, { kind: st.kind });
      }
      // ---------- الميم الساكنة ----------
      if (last.base === 'م' && !hasVowel(last) && !hasShadda(last) && !hasTanween(last)) {
        const trig = norm(isHamza(next) ? 'ء' : next.base);
        if (trig === 'ب') push('meem_ikhfa', i, i + 1, trig);
        else if (trig === 'م') { if (hasShadda(next)) push('meem_idgham', i, i + 1, trig); }
        else push('meem_izhar', i, i + 1, trig);
      }
      // ---------- المد المنفصل: مد في آخر الكلمة وهمزة في أول التالية ----------
      if (isHamza(next)) {
        const pen = cs[cs.length - 2];
        const direct = MADD_BASES.has(last.base) && isMaddaSigned(last);
        const dagger = last.marks.has(DAGGER_ALIF) && isMaddaSigned(last);
        const silentAlif = pen && MADD_BASES.has(pen.base) && isMaddaSigned(pen) && last.base === 'ا' && last.marks.has('\u06DF');
        if ((direct || dagger || silentAlif) && !(i === 0 && cs.length <= 3 && cs[0].base === 'ي' && last.marks.has(DAGGER_ALIF))) push('madd_munfasil', i, i + 1, 'ء');
      }
    }

    // ---------- النون الساكنة داخل الكلمة (غير قبل و/ي) ----------
    for (let j = 0; j < cs.length - 1; j++) {
      const c = cs[j];
      if (c.base !== 'ن' || hasVowel(c) || hasShadda(c)) continue;
      const nxt = cs[j + 1]; const trig = norm(isHamza(nxt) ? '\u0621' : nxt.base);
      if (trig === 'و' || trig === 'ي') continue; // إظهار مطلق (دنيا، صنوان) — خارج نطاق التجربة
      const rule = noonRule(trig);
      if (!rule || rule.startsWith('idgham')) continue;
      const iq = hasMark(c, IQLAB_MARKS);
      if ((rule === 'iqlab') !== iq) continue;
      if (rule === 'izhar' && !hasSukun(c)) continue;
      if (rule === 'ikhfa' && hasSukun(c)) continue;
      push('noon_' + rule, i, i, trig, { kind: 'noon', inWord: true, at: j });
    }

    // ---------- الغنة: النون والميم المشددتان (الأصليتان فقط، لا الناتجتان عن إدغام) ----------
    for (let j = 0; j < cs.length; j++) {
      const c = cs[j];
      if ((c.base === 'ن' || c.base === 'م') && hasShadda(c)) {
        if (j === 0 && prevWord && prevWord.length) {
          const pst = endState(prevWord); const pl = prevWord[prevWord.length - 1];
          const afterMeem = pl.base === 'م' && !hasVowel(pl) && !hasShadda(pl);
          if (pst || afterMeem) continue; // الشدة ناتجة عن إدغام ما قبلها
        }
        push('ghunna', i, i, c.base, { at: j });
      }
    }

    // ---------- القلقلة (الصغرى: ساكن أصلي) ----------
    for (let j = 0; j < cs.length; j++) {
      const c = cs[j];
      if (QALQALAH_LETTERS.has(c.base) && hasSukun(c)) {
        const nxt = cs[j + 1] || (hasNext ? next : null);
        if (nxt && hasShadda(nxt)) continue;
        if (c.base === 'ط' && nxt && nxt.base === 'ت') continue;
        if (j === cs.length - 1 && !hasNext) continue; // عند آخر الآية: يتعلق بالوقف (صغرى/كبرى) — خارج بنك الأسئلة
        push('qalqalah', i, i, c.base, { at: j });
      }
    }

    // ---------- أل التعريف ----------
    for (let k = 0; k < Math.min(cs.length - 2, 2); k++) {
      if (cs[k].base === WASLA && cs[k + 1].base === 'ل') {
        const x = cs[k + 2]; const xb = norm(isHamza(x) ? 'ء' : x.base);
        const word = cs.map(c => c.base).join('');
        // لفظ الجلالة والأسماء الموصولة (الذي/التي..): عدها «أل التعريف» محل خلاف تعليمي — تستبعد من بنك الأسئلة
        if (/^.?ٱلل/.test(word) || /^.?ٱل(ذ|ت)/.test(word)) break;
        if (hasShadda(x) && !hasSukun(cs[k + 1]) && SHAMSI_LETTERS.has(xb)) push('lam_shamsi', i, i, xb, { at: k + 2 });
        else if (hasSukun(cs[k + 1]) && !hasShadda(x) && QAMARI_LETTERS.has(xb)) push('lam_qamari', i, i, xb, { at: k + 2 });
        break;
      }
    }

    // ---------- المد المتصل: مد ثم همزة في الكلمة نفسها ----------
    for (let j = 0; j < cs.length - 1; j++) {
      const c = cs[j];
      if (!isMaddaSigned(c) || !isHamza(cs[j + 1])) continue;
      const isMadd = MADD_BASES.has(c.base) || c.marks.has(DAGGER_ALIF);
      if (!isMadd) continue;
      if (j === 0 && c.marks.has(DAGGER_ALIF) && (c.base === 'ي' || c.base === '\u06CC' || c.base === 'ه')) continue; // «يا أيها» — يعد منفصلا، يستبعد
      push('madd_muttasil', i, i, 'ء', { at: j });
    }

    // ---------- المد اللازم الكلمي: حرف مد عليه علامة المدة وبعده حرف مشدد أو ساكن في الكلمة نفسها ----------
    for (let j = 0; j < cs.length - 1; j++) {
      const c = cs[j], nxt = cs[j + 1];
      if (!isMaddaSigned(c) || !(MADD_BASES.has(c.base) || c.marks.has(DAGGER_ALIF)) || isHamza(nxt)) continue;
      if (hasShadda(nxt) || hasSukun(nxt)) push('madd_lazim', i, i, norm(nxt.base), { at: j });
    }

    // ---------- مد البدل: همزة متحركة بعدها حرف مد (بلا علامة مدة) داخل الكلمة ----------
    for (let j = 0; j < cs.length - 2; j++) {
      const h = cs[j], m = cs[j + 1], after = cs[j + 2];
      if (!isHamza(h) || isMaddaSigned(m) || m.marks.size > 0) continue;
      const okPair = (m.base === 'ا' && h.marks.has(FATHA)) || (m.base === 'و' && h.marks.has(DAMMA)) || ((m.base === 'ي' || m.base === 'ی') && h.marks.has(KASRA));
      if (okPair && !isHamza(after) && !hasShadda(after) && !hasSukun(after)) push('madd_badal', i, i, 'ء', { at: j + 1 });
    }

    // ---------- العارض للسكون واللين: عند آخر الآية فقط (الوقف) ----------
    if (i === words.length - 1 && cs.length >= 3) {
      const n = cs.length, lastC = cs[n - 1], pen = cs[n - 2], before = cs[n - 3];
      const voweled = hasVowel(lastC) && !hasShadda(lastC) && !lastC.marks.has('ً') && !lastC.marks.has('ࣰ') && !isHamza(lastC);
      if (voweled && !isMaddaSigned(pen)) {
        const tabii = pen.marks.size === 0 && ((pen.base === 'ا' && before.marks.has(FATHA)) || (pen.base === 'و' && before.marks.has(DAMMA)) || ((pen.base === 'ي' || pen.base === 'ی') && before.marks.has(KASRA)));
        const dagger = pen.marks.has(DAGGER_ALIF) && !hasShadda(pen);
        const leen = (pen.base === 'و' || pen.base === 'ي' || pen.base === 'ی') && hasSukun(pen) && before.marks.has(FATHA);
        if (tabii) push('madd_aridh', i, i, norm(lastC.base), { at: n - 2 });
        else if (dagger) push('madd_aridh', i, i, norm(lastC.base), { at: n - 2, dagger: true });
        else if (leen) push('madd_leen', i, i, norm(lastC.base), { at: n - 2 });
      }
    }

    // ---------- المثلان والمتجانسان والمتقاربان (الإدغام الصغير) ----------
    // الأول بلا حركة ولا سكون مكتوب (علامة الإدغام في المصحف)، والثاني مشدد
    const plain = (c) => !hasVowel(c) && !hasSukun(c) && !hasShadda(c) && !hasTanween(c);
    if (hasNext && plain(last) && hasShadda(next) && !['م', 'ن'].includes(last.base)) {
      const a = last.base, b = next.base;
      if (a === b) push('mithlain', i, i + 1, b);
      else if (JANIS[a] === b || JANIS2[a] === b) push('mutajanisain', i, i + 1, b);
      else if (a === 'ل' && b === 'ر') push('mutaqaribain', i, i + 1, b);
    }
    for (let j = 0; j < cs.length - 1; j++) {
      const c = cs[j], nxt = cs[j + 1];
      if (!plain(c) || !hasShadda(nxt) || j === 0) continue;
      if (JANIS[c.base] === nxt.base || JANIS2[c.base] === nxt.base) push('mutajanisain', i, i, nxt.base, { at: j });
      else if (c.base === 'ق' && nxt.base === 'ك') push('mutaqaribain', i, i, nxt.base, { at: j });
    }

    // ---------- الراء المتحركة: مفتوحة/مضمومة ← تفخيم، مكسورة ← ترقيق (لا تدخل الراء الساكنة ولا آخر الآية) ----------
    for (let j = 0; j < cs.length; j++) {
      const c = cs[j]; if (c.base !== 'ر') continue;
      if (j === cs.length - 1 && (i === words.length - 1 || waqfAfter[i])) continue; // الوقف يغيّر حركتها
      const heavy = c.marks.has(FATHA) || c.marks.has(DAMMA) || c.marks.has('ً') || c.marks.has('ٌ') || c.marks.has('ࣰ') || c.marks.has('ࣱ');
      const light = c.marks.has(KASRA) || c.marks.has('ٍ') || c.marks.has('ࣲ');
      if (heavy && !light) push('ra_tafkhim', i, i, c.marks.has(DAMMA) || c.marks.has('ٌ') || c.marks.has('ࣱ') ? 'رُ' : 'رَ', { at: j });
      else if (light && !heavy) push('ra_tarqiq', i, i, 'رِ', { at: j });
    }

    // ---------- لام لفظ الجلالة: بعد فتح أو ضم ← تفخيم، بعد كسر ← ترقيق ----------
    // صورتان في الرسم: «ٱ ل لّ ه» (مع سابقة اختيارية و/ف/ب/ت قبل ٱ) و«لِ لّ ه» (لام الجر)
    const isAllah = (x, y) => x && y && x.base === 'ل' && hasShadda(x) && y.base === 'ه' && hasVowel(y);
    for (let k = 0; k < cs.length; k++) {
      let lamAt = -1, vowel = null, glyphT = null;
      if (cs[k].base === WASLA && cs[k + 1] && cs[k + 1].base === 'ل' && !hasShadda(cs[k + 1]) && isAllah(cs[k + 2], cs[k + 3])) {
        lamAt = k + 2;
        if (k >= 1) { const p = cs[k - 1]; vowel = p.marks.has(KASRA) ? 'k' : (p.marks.has(FATHA) || p.marks.has(DAMMA)) ? 'f' : null; glyphT = p.raw; }
        // أول كلمة في الآية: الحكم يتبع وصلها بما قبلها أو الابتداء بها — يُترك
        else if (i > 0 && !waqfAfter[i - 1]) {
          const pw = cl[i - 1]; const pl = pw[pw.length - 1], pp = pw[pw.length - 2];
          if (hasTanween(pl) || hasSukun(pl)) vowel = null;
          else if (pl.marks.has(KASRA)) { vowel = 'k'; glyphT = pl.raw; }
          else if (pl.marks.has(FATHA) || pl.marks.has(DAMMA)) { vowel = 'f'; glyphT = pl.raw; }
          else if (pp && pl.marks.size === 0 && MADD_BASES.has(pl.base)) { vowel = pp.marks.has(KASRA) ? 'k' : (pp.marks.has(FATHA) || pp.marks.has(DAMMA)) ? 'f' : null; glyphT = pp.raw; }
        }
      } else if (cs[k].base === 'ل' && cs[k].marks.has(KASRA) && k <= 1 && isAllah(cs[k + 1], cs[k + 2])) { lamAt = k + 1; vowel = 'k'; glyphT = cs[k].raw; }
      if (lamAt < 0) continue;
      if (vowel === 'f') push('lam_jalala_tafkhim', i, i, glyphT, { at: lamAt });
      else if (vowel === 'k') push('lam_jalala_tarqiq', i, i, glyphT, { at: lamAt });
      break;
    }

    // ---------- المد الطبيعي (حالات واضحة فقط) ----------
    for (let j = 1; j < cs.length - 1; j++) {
      const c = cs[j], prev = cs[j - 1], nxt = cs[j + 1];
      const unmarked = c.marks.size === 0;
      const isMadd = (c.base === 'ا' && prev.marks.has('\u064E')) || (c.base === 'و' && prev.marks.has('\u064F')) || ((c.base === 'ي' || c.base === 'ی') && prev.marks.has('\u0650'));
      if (unmarked && isMadd && !isHamza(prev) && hasVowel(nxt) && !hasShadda(nxt) && !isHamza(nxt)) push('madd_tabii', i, i, norm(c.base), { at: j });
    }
    for (let j = 0; j < cs.length - 1; j++) {
      const c = cs[j], nxt = cs[j + 1];
      if (c.marks.has(DAGGER_ALIF) && !isMaddaSigned(c) && hasVowel(nxt) && !hasShadda(nxt) && !isHamza(nxt)) push('madd_tabii', i, i, 'ا', { at: j, dagger: true });
    }
  }
  return { words, waqfAfter, occ };
}
