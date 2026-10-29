// js/audio.js — تشغيل تلاوة الآية (اختياري). المصدر قابل للتبديل بسطر واحد؛ التطبيق يعمل كاملا دون الصوت.
// ⚠ لم يتحقق من الروابط وصحة التلاوة من بيئة التطوير (الشبكة محجوبة) — البند مسجل في docs/REVIEW_CHECKLIST.md.
export const AUDIO_BASE = 'https://everyayah.com/data/Husary_128kbps/';
export const ayahAudioUrl = (key) => { const [s, a] = key.split(':').map(Number); return `${AUDIO_BASE}${String(s).padStart(3, '0')}${String(a).padStart(3, '0')}.mp3`; };

let el = null;
export function stopAudio() { if (el) { try { el.pause(); } catch { /* لا شيء */ } el = null; } }
// onState('playing'|'ended'|'error')
export function playAyah(key, onState = () => {}) {
  stopAudio();
  try {
    el = new Audio(ayahAudioUrl(key));
    el.addEventListener('playing', () => onState('playing'));
    el.addEventListener('ended', () => onState('ended'));
    el.addEventListener('error', () => onState('error'));
    const p = el.play(); if (p && p.catch) p.catch(() => onState('error'));
  } catch { onState('error'); }
}
