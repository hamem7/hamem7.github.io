# يبني database/data/mutashabihatSeedPart1.js من work/groups.json (الشريحة الآمنة فقط)
import json
g=json.load(open('work/groups.json',encoding='utf8'))
# الشريحة الآمنة (A): كل المواضع محسومة بمطابقة نصية قوية فقط (دقتها ~97٪ على السور 46–77) وبعنوان من الكتاب أو مقطع مشترك
keep=[x for x in g if all(q in ('strong','digit') for q in x['_qs']) and x['_anchorHow'] in ('heading','lcw')]
per={};out=[]
for x in keep:
    s=x['surahs'][0];per[s]=per.get(s,0)+1
    out.append({'groupId':f'{s}-{per[s]}','scope':'internal','surahs':x['surahs'],'anchorPhrase':x['anchorPhrase'],'category':x['category'],'occurrences':x['occurrences']})
hdr='''// database/data/mutashabihatSeedPart1.js
// 🌟 [جديد — 2026-10-10] متشابهات «السورة مع نفسها» للسور 2–45 (الصفحات 1–233 من كتاب docs/متشابهات السورة مع نفسها.pdf).
// مولَّدة آلياً بأدوات tools/mutashabihat-extract (انظر README هناك): المجموعات المكتملة فقط (كل مواضعها محسومة)
// بعنوان مفكوك من الكتاب أو أطول مقطع مشترك. نص الآيات (fullText) منسوخ من database/quran-uthmani.json كما هو.
// المجموعات الناقصة أو بلا عنوان موثوق لم تُضمَّن، وتُراجَع لاحقاً. نفس بنية mutashabihatSeed.js بالضبط.
export const MUTASHABIHAT_SEED_PART1 = '''
open('../../database/data/mutashabihatSeedPart1.js','w',encoding='utf8').write(hdr+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n')
print(len(out),'groups',sum(len(x['occurrences']) for x in out),'occurrences')
