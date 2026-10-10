import sys,re,json,itertools,collections;sys.path.insert(0,'.')
from norm import *
def grams(s,n=3): return {s[i:i+n] for i in range(max(0,len(s)-n+1))}
A=json.load(open('work/assign.json'))
raw=open('work/raw.txt',encoding='utf8').read().split('\f')[:278]
QN={s:[(n,norm(t)) for n,t in v] for s,v in QURAN.items()}
G3={s:[(n,grams(t),grams(t[::-1])) for n,t in v] for s,v in QN.items()}
def sc3(u,gf,gr):
    g=grams(u);return max(len(g&gf),len(g&gr))/len(g) if g else 0
CH={'1':'19','2':'7','7':'2','4':'6','6':'4'}
IND='٠١٢٣٤٥٦٧٨٩'
def cands(dg):
    opts=[CH.get(c,c) for c in dg];return {int(''.join(p)) for p in itertools.product(*opts)}|{int(dg)}
def clean(t): return re.sub(r'[‎‏‪-‮⁦-⁩]','',t)
def decode_heading(seg):
    seg=re.sub(r'^[\s\S]*?:\s*\)','',seg,count=1) if re.search(r':\s*\)',seg) else seg
    lines=[l for l in seg.split('\n') if l.strip()]
    lines=lines[::-1]
    return ''.join(l[::-1] for l in lines)
def find_window(words,target):
    nw=[norm(w) for w in words]
    for i in range(len(words)):
        acc=''
        for j in range(i,len(words)):
            acc+=nw[j]
            if acc==target: return i,j+1
            if len(acc)>len(target): break
    return None
def lcw(verses):
    ws=[[norm(w) for w in v.split()] for v in verses];first=ws[0];best=None
    for i in range(len(first)):
        for j in range(len(first),i,-1):
            seq=first[i:j]
            if best and len(seq)<=len(best[1]): break
            if all(any(x[k:k+len(seq)]==seq for k in range(len(x)-len(seq)+1)) for x in ws[1:]): best=(i,seq,j);break
    return ' '.join(verses[0].split()[best[0]:best[2]]) if best else None
MAXS=int(sys.argv[1]);out=[];review=[];st=collections.Counter()
for k,(a,b) in enumerate(A['sections']):
    surah=A['assign'][k][0]
    if surah>MAXS: continue
    L=len(QN[surah]);text=clean('\n'.join(raw[a-2:b-1]));pos=0;groups=[];cur=None
    for m in re.finditer(r'(\*+)|(\d{1,3}|[٠-٩]{1,3})(?:\s*-\s*(\d{1,3}))?\s*[.،]?\s*[\)\}]{2}',text):
        seg=text[pos:m.start()];pos=m.end()
        if m.group(1):
            if len(m.group(1))>=4: continue
            cur={'heading':decode_heading(seg),'raw':[]};groups.append(cur);continue
        if cur is None: continue
        dg=''.join(str(IND.index(c)) if c in IND else c for c in m.group(2))
        cur['raw'].append((norm(seg),dg))
    gi=0
    for g in groups:
        h=re.sub(r'[\(\):\*ً-ٰٟ]','',g['heading']).strip()
        hn=norm(h.split(' - ')[0].split('-')[0]) if h else ''
        allowed=[n for n,t in QN[surah] if hn and hn in t] if hn else []
        occ=[];info=[]
        for u,dg in g['raw']:
            C={c for c in cands(dg) if 1<=c<=L} if dg else set()
            pool=allowed if len(allowed)>=2 else [n for n,_ in QN[surah]]
            ranked=sorted(((sc3(u,*G3[surah][n-1][1:]),n) for n in pool),reverse=True) if len(u)>=6 else []
            ch=None
            if ranked:
                top=ranked[0];sec=ranked[1] if len(ranked)>1 else (0,0)
                inC=[r for r in ranked[:4] if r[1] in C]
                if top[0]>=0.5 and top[0]-sec[0]>=0.1: ch=top[1];q='strong'
                elif inC and inC[0][0]>=0.35 and inC[0][0]>=top[0]-0.2: ch=inC[0][1];q='digit'
                elif top[0]>=0.45 and len(pool)<=40: ch=top[1];q='pool'
            if ch is None and len(allowed)>=2:
                cc=[n for n in allowed if n in C]
                if len(cc)==1: ch=cc[0];q='anchor_digit'
                elif len(cc)>1 and ranked: ch=max(cc,key=lambda n:sc3(u,*G3[surah][n-1][1:]));q='anchor_digit'
            if ch is None:
                st['unres']+=1;review.append(dict(surah=surah,heading=h[:30],digits=dg,why='unresolved'));continue
            st[q]+=1
            info.append((q,ch in C,top[0]))
            if ch not in occ: occ.append(ch)
        if len(occ)<2: st['drop_small']+=1;continue
        gi+=1;st['groups']+=1
        vs=[QURAN[surah][c-1][1] for c in occ]
        ph=None
        if hn:
            vn=[norm(v) for v in vs];best=(0,)
            for vi,v in enumerate(vs[:2]):
                ws=v.split();nw=[norm(w) for w in ws]
                for i in range(len(ws)):
                    acc=''
                    for j in range(i,min(len(ws),i+9)):
                        acc+=nw[j]
                        if not acc: continue
                        cov=sum(1 for x in vn if acc in x)/len(vn)
                        if cov<0.6: continue
                        ca,cb=collections.Counter(acc),collections.Counter(hn)
                        dice=2*sum((ca&cb).values())/(len(acc)+len(hn))
                        key=(round(dice,3),cov,-len(acc))
                        if dice>=0.82 and (len(best)==1 or key>best[0]): best=(key,' '.join(ws[i:j+1]))
            if len(best)>1: ph=best[1]
        how='heading'
        if not ph: ph=lcw(vs);how='lcw'
        if not ph: ph=vs[0].split()[0];how='first'
        st['anchor_'+how]+=1
        out.append({'groupId':f'{surah}-{gi}','scope':'internal','surahs':[surah],'anchorPhrase':ph,'category':'لفظ_مشترك','_anchorHow':how,'_unres':len(g['raw'])-len(info),'_allStrong':all(i[0]=='strong' for i in info),'_digitAgree':sum(1 for i in info if i[1])/max(1,len(info)),'_minScore':round(min(i[2] for i in info),2),'_heading':h,
          'occurrences':[{'surahNumber':surah,'surahName':NAMES[surah].replace('سُورَةُ ','').strip(),'ayahNumber':c,'fullText':QURAN[surah][c-1][1].strip()} for c in occ]})
print(dict(st),len(out),sum(len(g['occurrences']) for g in out))
json.dump(out,open('work/groups.json','w'),ensure_ascii=False);json.dump(review,open('work/review.json','w'),ensure_ascii=False)
