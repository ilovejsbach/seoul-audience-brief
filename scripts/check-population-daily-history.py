"""Independent source-CSV Decimal fixtures for expanded day queries."""
import csv,io,itertools,json,pathlib,re,zipfile
from decimal import Decimal
ROOT=pathlib.Path(__file__).resolve().parents[1]
CASES=[('20260101',18,'all','all','all'),('20260131',12,'11500620','young','male'),('20260228',18,'11680','all','female'),('20260731',0,'11110670','all','female'),('20260930',12,'11500','middle','all'),('20261031',12,'11500620','young','male')]
records=json.loads((ROOT/'data/population-history-manifest.json').read_text())['records'];out=[]
for record in records:
 cases=[c for c in CASES if c[0].startswith(record['period'])]
 if not cases:continue
 state={c:{'total':Decimal(0),'rows':0,'masked':0} for c in cases}
 with zipfile.ZipFile(ROOT/record['path']) as z:
  for name in z.namelist():
   if not name.lower().endswith('.csv'):continue
   with z.open(name) as raw:
    t=io.TextIOWrapper(raw,encoding='cp949');columns=next(csv.reader([t.readline()]));first=t.readline();delimiter=';' if ';' in first else ','
    for row in csv.reader(itertools.chain([first],t),delimiter=delimiter):
     for c in cases:
      date,hour,code,age,sex=c
      if not row or row[0].strip()!=date or int(row[1])!=hour or code!='all' and not row[2].strip().startswith(code):continue
      ids=[3] if age==sex=='all' else [i for i,col in enumerate(columns) if i>=4 and (sex=='all' or col.startswith('남자' if sex=='male' else '여자')) and (age=='all' or (lambda n:20<=n<40 if age=='young' else 40<=n<60 if age=='middle' else n>=60)(int(re.search(r'\d+',col)[0])))]
      texts=[row[i].strip() for i in ids];s=state[c];s['rows']+=1
      if any(x in ('','*',r'\N') for x in texts):s['masked']+=1
      else:s['total']+=sum(Decimal(x) for x in texts)
 for c,s in state.items():
  date,hour,code,age,sex=c;out.append({'date':date,'hour':hour,'regionCode':code,'age':age,'sex':sex,'sourceRows':s['rows'],'maskedRows':s['masked'],'expectedValue':None if s['masked'] else str(s['total']),'archiveSha256':record['sha256']})
(ROOT/'data/population-daily-fixtures.json').write_text(json.dumps({'source':'OA-23016','method':'Independent CSV Decimal sums; any masked component masks the selected region','cases':out},ensure_ascii=False,indent=2))
print(json.dumps(out,ensure_ascii=False,indent=2))
