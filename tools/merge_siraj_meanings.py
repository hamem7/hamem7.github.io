#!/usr/bin/env python3
"""يدمج مسودة نسخ «السراج في بيان غريب القرآن» (الخضيري) مع database/data/wordMeanings.json.
الاستعمال: python3 tools/merge_siraj_meanings.py   (يقرأ tools/siraj-transcription/b*.txt)
السراج مصدر أول للمعنى القصير؛ ويبقى مخلوف (tools/build_word_meanings.py) احتياطاً للكلمات التي لا يغطيها السراج في الآية نفسها،
وتُختصر معاني مخلوف الطويلة: نأخذ أول البدائل قبل «أو» ثم نقطع عند فاصلة إن زادت عن الحد.
صيغة المسودة: «آية|كلمة|معنى» وسطر «#رقم_السورة» عند بداية كل سورة. لا نثق بالرقم إلا إذا طابقت الكلمة نص الآية.
الناتج: {"سورة":[[آية, كلمة, معنى], ...]} كما في السابق، مع حفظ نسخة مخلوف الأصلية في database/data/wordMeanings.makhlouf.json."""
import re, os, sys, json, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIAC = re.compile('[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640\u08d3-\u08ff]')
MAX_MEANING = 90
SHORT_MEANING = 60


def norm(s):
    s = DIAC.sub('', s)
    s = re.sub('[ٱأإآ]', 'ا', s).replace('ى', 'ي').replace('﻿', '')
    s = re.sub(r'\(.*?\)', '', s)
    s = re.sub('[ءؤئ]', '', s)  # الهمزة تُكتب بصور مختلفة بين المصحف والكتاب
    s = re.sub(r'[^ء-ي]', '', s)
    return s.replace('ا', '')  # الألف الخنجرية والإملاء العثماني يختلفان عن إملاء الكتاب


def norm2(s):
    """مطابقة أوسع للكلمات التي يختلف رسمها (ياء/ألف مقصورة، تاء/هاء، واو...): نحذف حروف العلة أيضاً."""
    return re.sub('[يوةه]', '', norm(s))


def tokens(text):
    return [t for t in text.replace('﻿', '').split() if t]


def vocalized(ayah_text, word):
    """يرجع الكلمة بتشكيلها من الآية (أقصر مدى من الكلمات يحتوي الكلمة المطلوبة) أو None."""
    toks = tokens(ayah_text)
    want = max(1, len(word.split()))
    for fn, minlen in ((norm, 2), (norm2, 3)):
        nw = fn(word)
        if len(nw) < minlen:
            continue
        nt = [fn(t) for t in toks]
        for width in range(1, want + 3):
            for i in range(0, len(toks) - width + 1):
                if nw in ''.join(nt[i:i + width]):
                    return ' '.join(toks[i:i + width])
    return None


def shorten(m):
    m = re.sub(r'\s+', ' ', m).strip()
    first = re.split(r'\s*(?:،\s*)?أو\s+', m)[0].strip(' ،.')
    if first and len(first) >= 3:
        m = first
    if len(m) > SHORT_MEANING:
        cut = [p.strip(' ،.') for p in m.split('،')]
        acc = ''
        for p in cut:
            nxt = (acc + '، ' + p) if acc else p
            if len(nxt) > SHORT_MEANING and acc:
                break
            acc = nxt
        m = acc or m
    return m


def parse_siraj():
    entries, surah, bad = [], None, 0
    for path in sorted(glob.glob(os.path.join(ROOT, 'tools/siraj-transcription/b*.txt'))):
        for ln in open(path, encoding='utf-8').read().splitlines():
            ln = ln.strip()
            if not ln:
                continue
            if ln.startswith('#'):
                surah = int(ln[1:]); continue
            parts = ln.split('|')
            if len(parts) < 3 or not parts[0].isdigit() or surah is None:
                bad += 1; continue
            entries.append((surah, int(parts[0]), parts[1].strip(), '|'.join(parts[2:]).strip()))
    return entries, bad


def main():
    q = json.load(open(os.path.join(ROOT, 'database/quran-uthmani.json'), encoding='utf-8'))
    ayat = {}
    for sr in q['data']['surahs']:
        for a in sr['ayahs']:
            ayat[(sr['number'], a['numberInSurah'])] = a['text']
    entries, bad = parse_siraj()

    siraj, dropped = {}, []
    for sn, v, w, m in entries:
        text = ayat.get((sn, v))
        word = vocalized(text, w) if text else None
        if not word or not m:
            dropped.append((sn, v, w)); continue
        m = re.sub(r'^أي\s*[:：]\s*', '', re.sub(r'\s+', ' ', m.replace('ـ', '')))
        siraj.setdefault(str(sn), []).append([v, word, m])

    mk_path = os.path.join(ROOT, 'database/data/wordMeanings.makhlouf.json')
    dst = os.path.join(ROOT, 'database/data/wordMeanings.json')
    if not os.path.exists(mk_path):
        os.replace(dst, mk_path)  # نحفظ النسخة الأصلية لمخلوف مرة واحدة
    mk = json.load(open(mk_path, encoding='utf-8'))

    out, kept_mk, skipped_mk, shortened = {}, 0, 0, 0
    for sn in set(siraj) | set(mk):
        rows, seen = [], set()
        for e in siraj.get(sn, []):
            key = (e[0], norm(e[1]), e[2])
            if key not in seen:
                seen.add(key); rows.append(e)
        covered = {}
        for e in rows:
            covered.setdefault(e[0], []).append(norm(e[1]))
        for v, w, m in mk.get(sn, []):
            nw = norm(w)
            if any(nw and c and (nw in c or c in nw) for c in covered.get(v, [])):
                skipped_mk += 1; continue
            sm = shorten(m)
            if sm != m:
                shortened += 1
            rows.append([v, w, sm]); kept_mk += 1
        rows.sort(key=lambda e: e[0])
        out[sn] = rows
    out = {k: out[k] for k in sorted(out, key=int)}
    json.dump(out, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    n_siraj = sum(len(v) for v in siraj.values())
    print(f'siraj_lines={len(entries)} siraj_kept={n_siraj} siraj_dropped={len(dropped)} bad_lines={bad}')
    print(f'makhlouf_kept={kept_mk} makhlouf_covered_by_siraj={skipped_mk} shortened={shortened} surahs={len(out)}')
    rep = os.path.join(ROOT, 'tools/siraj-transcription/dropped.txt')
    open(rep, 'w', encoding='utf-8').write('\n'.join(f'{s}:{v}|{w}' for s, v, w in dropped) + '\n')


if __name__ == '__main__':
    main()
