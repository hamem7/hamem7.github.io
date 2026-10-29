// أدوات نصية عربية/قرآنية خالصة (بلا DOM) — تستعمل في أدوات البناء والتحقق فقط.
// تعمل على نص المصحف كما هو (رسم «النسخة المصححة» المعتمدة في المنصة) ولا تعدله.

export const SUKUN = new Set(['\u0652', '\u06E1']);
export const SHADDA = '\u0651';
export const FATHA = '\u064E', DAMMA = '\u064F', KASRA = '\u0650';
export const TANWEEN_STACKED = new Set(['\u064B', '\u064C', '\u064D']);
export const TANWEEN_OPEN = new Set(['\u08F0', '\u08F1', '\u08F2']);
export const IQLAB_MARKS = new Set(['\u06E2', '\u06ED']);
export const MADDA_SIGN = new Set(['\u06E4', '\u0653']);
export const DAGGER_ALIF = '\u0670';
export const WASLA = 'ٱ';
export const HAMZA_FORMS = new Set(['ء', 'أ', 'ؤ', 'إ', 'ئ']);

const isBase = (c) => { const k = c.codePointAt(0); return (k >= 0x0621 && k <= 0x063A) || (k >= 0x0641 && k <= 0x064A) || k === 0x0671 || k === 0x06CC; };
export const isWaqfToken = (w) => /^[\u06D6-\u06DC\u06DE\u06E9]+$/.test(w);

// حرف أساسي موحد للمقارنة: الهمزات ← ء ؛ ى/ی ← ي
export function norm(ch) {
  if (HAMZA_FORMS.has(ch)) return 'ء';
  if (ch === 'ى' || ch === 'ی') return 'ي';
  return ch;
}

// يقسم الكلمة إلى مقاطع: {base, marks:Set<string>, raw, s, e} — raw شريحة حرفية من الكلمة الأصلية (s..e) فتتطابق المقاطع مجتمعة مع الكلمة تماما.
export function clusters(word) {
  const out = []; let pos = 0, pendingStart = -1, prevE = -1;
  for (const ch of word) {
    const end = pos + ch.length;
    if (ch === '\u0640') {
      pendingStart = pos;
      if (out.length) { prevE = out[out.length - 1].e; out[out.length - 1].e = end; }
    } else if ((ch === '\u0654' || ch === '\u0655') && pendingStart === pos - 1) {
      // كرسي همزة بلا حرف (): مقطع مستقل بدل أن يلصق بما قبله
      if (out.length) out[out.length - 1].e = prevE;
      out.push({ base: '\u0621', marks: new Set(), s: pendingStart, e: end });
      pendingStart = -1;
    } else if (isBase(ch)) {
      out.push({ base: ch, marks: new Set(), s: pos, e: end });
      pendingStart = -1;
    } else if (out.length) {
      const prev = out[out.length - 1];
      if ((ch === '\u0654' || ch === '\u0655') && ['\u06CC', '\u064A', '\u0649'].includes(prev.base)) prev.hamzaSeat = true;
      prev.marks.add(ch); prev.e = end; pendingStart = -1;
    }
    pos = end;
  }
  for (const c of out) c.raw = word.slice(c.s, c.e);
  return out;
}

const hasAny = (set, group) => { for (const m of set) if (group.has(m)) return true; return false; };
export const hasSukun = (c) => hasAny(c.marks, SUKUN);
export const isHamza = (c) => !!c && (HAMZA_FORMS.has(c.base) || !!c.hamzaSeat);
export const hasShadda = (c) => c.marks.has(SHADDA);
export const hasVowel = (c) => ['\u064E', '\u064F', '\u0650', '\u064B', '\u064C', '\u064D', '\u08F0', '\u08F1', '\u08F2'].some(m => c.marks.has(m));
export const hasTanween = (c) => hasAny(c.marks, TANWEEN_STACKED) || hasAny(c.marks, TANWEEN_OPEN) || hasAny(c.marks, IQLAB_MARKS);

// يقسم نص الآية إلى كلمات (بلا رموز الوقف) مع معرفة هل وقعت علامة وقف بعد الكلمة
export function tokenize(text) {
  const words = [], waqfAfter = [];
  for (const tok of text.trim().split(/\s+/)) {
    if (!tok) continue;
    if (isWaqfToken(tok)) { if (words.length) waqfAfter[words.length - 1] = true; continue; }
    // علامة وقف ملتصقة بآخر الكلمة
    words.push(tok); waqfAfter.push(false);
  }
  return { words, waqfAfter };
}
