#!/usr/bin/env python3
"""w41 1단계: 좌표 파일(15099316)과 원본 3종(시간대·유형·혼잡도)·일별(역명)의 (호선, 코드, 역명) 대응을 전 호선에서 비교한다.
원본은 읽기만 한다. 출력: audit_codes.json"""
import collections, csv, io, json, re, pathlib, datetime as dt, glob
import openpyxl
RAW=pathlib.Path('/Users/koscom/workspace2/seoul human/data/raw/transit/subway')
OUT=pathlib.Path(__file__).resolve().parent/'audit_codes.json'
def rd(p):
    b=open(p,'rb').read()
    for e in('utf-8-sig','cp949'):
        try:return b.decode(e)
        except UnicodeDecodeError:pass
def rows(p): return list(csv.reader(io.StringIO(rd(p))))
norm=lambda s: re.sub(r'\(.*?\)','',s.replace(' ','')).rstrip('역') if len(s)>2 else re.sub(r'\(.*?\)','',s)
def nm(s):
    s=s.replace(' ','');s=re.sub(r'\(.*?\)','',s)
    return s[:-1] if s.endswith('역') and len(s)>2 else s
coords={}
for x in rows(RAW/'15099316-station-coords-20250814.csv')[1:]:
    coords[(int(x[1]),x[2].zfill(4))]=x[3]
src={}
# 시간대
for y in(2023,2024,2025):
    for x in rows(RAW/f'OA-12921-hourly-{y}.csv')[1:]:
        if len(x)>5 and x[2].endswith('호선') and x[2][:-2].isdigit():
            src.setdefault('시간대',{})[(int(x[2][:-2]),x[3].zfill(4))]=x[4]
for x in rows(RAW/'15099330-passenger-type-2026H1.csv')[1:]:
    if len(x)>5 and x[2].endswith('호선'): src.setdefault('승객유형',{})[(int(x[2][:-2]),x[3].zfill(4))]=x[4]
for fn in sorted(glob.glob(str(RAW/'OA-12928-crowding-*.xlsx'))):
    wb=openpyxl.load_workbook(fn,read_only=True,data_only=True);ws=wb['평일'];it=ws.iter_rows(values_only=True);h=list(next(it));ci={v:i for i,v in enumerate(h)}
    for r in it:
        if r[ci['호선']] is None or not str(r[ci['호선']]).endswith('호선'):continue
        src.setdefault('혼잡도',{})[(int(str(r[ci['호선']])[:-2]),str(int(r[ci['역번호']])).zfill(4))]=r[ci['역명']]
# 일별 역명(코드 없음): 호선별 역명 집합
daily=collections.defaultdict(set)
for f in sorted(RAW.glob('OA-12914-CARD_SUBWAY_MONTH_*.csv')):
    for x in rows(f)[1:]:
        if len(x)>4 and x[1].endswith('호선') and x[1][:-2].isdigit() and int(x[1][:-2])<=8: daily[int(x[1][:-2])].add(x[2])
dn={ln:{nm(n):n for n in s} for ln,s in daily.items()}
out={'sources':{},'mismatch':[],'alias':[]}
allmis=collections.defaultdict(dict)
for k,p in src.items():
    mism=[];miss=[]
    for (ln,cd),name in sorted(p.items()):
        c=coords.get((ln,cd))
        if c is None: miss.append(f'{ln}:{cd} {name}');continue
        if nm(c)!=nm(name): mism.append({'line':ln,'code':cd,'sourceName':name,'coordsName':c})
    out['sources'][k]={'codes':len(p),'notInCoords':miss,'nameMismatch':len(mism)}
    for m in mism: allmis[(m['line'],m['code'])][k]=m
# 이름 기준 위치: 원본 코드의 역이 좌표 파일의 어느 코드에 해당하는지(호선 안에서 이름 일치)
c_by_name=collections.defaultdict(list)
for (ln,cd),n in coords.items(): c_by_name[(ln,nm(n))].append(cd)
for (ln,cd),d in sorted(allmis.items()):
    any_=next(iter(d.values()))
    tgt=c_by_name.get((ln,nm(any_['sourceName'])),[])
    out['mismatch'].append({'line':ln,'sourceCode':cd,'sourceName':any_['sourceName'],'coordsNameAtThatCode':any_['coordsName'],'coordsCodeForSameName':tgt,'sources':sorted(d),'shift':(int(tgt[0])-int(cd)) if len(tgt)==1 else None})
# 일별(이름 기준)이 좌표 이름과 맞는지: 12914 이름 → coords 이름
unm=[]
for ln,names in dn.items():
    for n,raw in names.items():
        if (ln,n) not in c_by_name: unm.append(f'{ln}호선 {raw}')
out['daily_names_without_coords']=sorted(unm)
by=collections.Counter(m['line'] for m in out['mismatch']);out['mismatchByLine']=dict(by)
json.dump(out,open(OUT,'w'),ensure_ascii=False,indent=1)
print(json.dumps({'sources':out['sources'],'byLine':out['mismatchByLine']},ensure_ascii=False)[:1500])
for m in out['mismatch']: print(m['line'],m['sourceCode'],m['sourceName'],'| 좌표파일 그 코드=',m['coordsNameAtThatCode'],'| 같은 이름 좌표코드=',m['coordsCodeForSameName'],'shift',m['shift'],m['sources'])
print('일별 이름 중 좌표 이름 없음:',out['daily_names_without_coords'])
