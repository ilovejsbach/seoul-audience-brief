"""Build display summaries from immutable OA-23016 monthly ZIPs.
First sum the same date/hour/cohort across dongs, propagating any missing cell.
Then average only valid dates within weekday/month-part groups and retain counts.
No sum of hourly observations is labeled a daily unique population.
"""
import argparse,calendar,collections,contextlib,csv,datetime,hashlib,io,itertools,json,pathlib,re,zipfile
from decimal import Decimal,ROUND_HALF_UP
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'public/data/population-patterns'
AGES=['all','young','middle','senior'];SEXES=['all','male','female'];COHORTS=[(a,s) for a in AGES for s in SEXES]
WEEK=[('mon','월요일'),('tue','화요일'),('wed','수요일'),('thu','목요일'),('fri','금요일'),('sat','토요일'),('sun','일요일')]
def indices(columns,age,sex):
 if age=='all' and sex=='all':return[3]
 out=[]
 for i,c in enumerate(columns):
  if i<4:continue
  if sex=='male' and not c.startswith('남자') or sex=='female' and not c.startswith('여자'):continue
  if age=='all':out.append(i);continue
  m=re.search(r'(\d+)[~세]',c);start=int(m.group(1)) if m else -1
  if age=='young' and 20<=start<40 or age=='middle' and 40<=start<60 or age=='senior' and start>=60:out.append(i)
 return out

def source_cents(text):
 text=text.strip()
 if text in ('','*',r'\N'):return None
 whole,dot,fraction=text.partition('.')
 if whole.startswith('-'):raise ValueError(f'Negative population source {text}')
 if len(fraction)>2 and any(c!='0' for c in fraction[2:]):raise ValueError(f'Unexpected source precision {text}')
 return int(whole)*100+int((fraction+'00')[:2])

def prepare(record):
 period=record['period'];path=ROOT/record['path'];daily={};columns=None;rows=0;source_codes=set();seen=set()
 with contextlib.ExitStack() as stack:
  if record.get('format')=='csv':
   sources=[('official-sheet.csv',stack.enter_context(path.open('rb')))]
  else:
   z=stack.enter_context(zipfile.ZipFile(path))
   sources=[(name,stack.enter_context(z.open(name))) for name in sorted(n for n in z.namelist() if n.lower().endswith('.csv'))]
  for name,raw in sources:
   with raw:
    text=io.TextIOWrapper(raw,encoding=record.get('encoding','cp949'));header=next(csv.reader([text.readline()]));first=text.readline();delimiter=';' if ';' in first else ','
    if columns is None:columns=header;cohort_columns=[indices(columns,a,s) for a,s in COHORTS]
    if header!=columns:raise ValueError(f'{period}: inconsistent columns')
    for row in csv.reader(itertools.chain([first],text),delimiter=delimiter):
     if not row:continue
     if len(row)!=len(columns):raise ValueError(f'{period}/{name}: field width')
     date=row[0].strip();hour=int(row[1]);code=row[2].strip();key=(date,hour,code)
     if not date.startswith(period) or not 0<=hour<24 or key in seen:raise ValueError(f'Invalid or duplicate {key}')
     seen.add(key);source_codes.add(code)
     values=[None]*3+[source_cents(x) for x in row[3:]]
     cohorts=[None if any(values[i] is None for i in ids) else sum(values[i] for i in ids) for ids in cohort_columns]
     daily.setdefault(date,{}).setdefault(code,[None]*24)[hour]=cohorts;rows+=1
 dates=sorted(daily);last=calendar.monthrange(int(period[:4]),int(period[4:]))[1]
 through=record.get('availableThrough',period+str(last))
 if not through.startswith(period):raise ValueError('Coverage end does not match month')
 expected_dates=[period+f'{d:02}' for d in range(1,int(through[6:])+1)]
 if dates!=expected_dates:raise ValueError(f'{period}: incomplete calendar dates {dates}')
 # Monthly source-code union is the completeness denominator. An absent dong-hour
 # makes the corresponding gu/Seoul scope null; it is never silently treated as 0.
 gu_codes=sorted({c[:5] for c in source_codes});all_codes=sorted(source_codes)+gu_codes+['all']
 for date,regions in daily.items():
  totals={g:[[0]*12 for _ in range(24)] for g in gu_codes+['all']}
  for code in source_codes:
   for h,cohorts in enumerate(regions.get(code,[None]*24)):
    for scope in (code[:5],'all'):
     vals=totals[scope][h]
     for k in range(12):
      value=cohorts[k] if cohorts is not None else None
      if value is None:vals[k]=None
      elif vals[k] is not None:vals[k]+=value
  regions.update(totals)
 groups=[{'kind':'weekday','key':key,'label':label,'dates':[]} for key,label in WEEK]+[{'kind':'monthPart','key':key,'label':label,'dates':[]} for key,label in [('early','월초 · 1–10일'),('middle','월중 · 11–20일'),('late','월말 · 21일–말일')]]
 date_groups={}
 for date in dates:
  day=int(date[6:]);weekday=datetime.date(int(date[:4]),int(date[4:6]),day).weekday();part=7+(0 if day<=10 else 1 if day<=20 else 2);date_groups[date]=(weekday,part)
  groups[weekday]['dates'].append(date);groups[part]['dates'].append(date)
 outputs=[]
 for k,(age,sex) in enumerate(COHORTS):
  regions_out={}
  for code in all_codes:
   sums=[[0]*24 for _ in groups];counts=[[0]*24 for _ in groups]
   for date in dates:
    hrs=daily[date].get(code)
    if hrs is None:continue
    for h,cohorts in enumerate(hrs):
     value=cohorts[k] if cohorts is not None else None
     if value is None:continue
     for gi in date_groups[date]:sums[gi][h]+=value;counts[gi][h]+=1
   means=[[float((Decimal(sums[g][h])/Decimal(counts[g][h]*100)).quantize(Decimal('0.01'),rounding=ROUND_HALF_UP)) if counts[g][h] else None for h in range(24)] for g in range(10)]
   compressed_counts=[c[0] if len(set(c))==1 else c for c in counts]
   regions_out[code]={'means':means,'counts':compressed_counts}
  payload={'schemaVersion':1,'month':period,'age':age,'sex':sex,'source':'OA-23016','sourceUrl':record['sourceUrl'],'sourceSha256':record.get('sha256'),'unit':'같은 시각 생활인구의 유효 날짜 평균 · 명','dates':dates,'groups':groups,'regions':regions_out,'precision':2,'rounding':'source decimal cents summed exactly; group mean ROUND_HALF_UP to 0.01','notes':['각 날짜·시간·타깃의 지역합계를 먼저 계산한 뒤 날짜별 평균을 구함.','지역합계에 비공개·결측이 하나라도 있으면 그 날짜·시간의 합계는 null. 그룹 평균은 유효 날짜만 포함하며 counts로 분모를 제공.','월초1–10일·월중11–20일·월말21일–말일. 날짜 수가 다르므로 합계가 아닌 하루 평균으로 비교.','평일·공휴일을 별도로 분리하지 않음. 한 달의 관찰 특성이며 장기적인 반복 특성이나 광고 성과를 의미하지 않음.','행정동은 해당 월 원본 코드 기준. 월 사이 코드·경계 변화가 있으면 동일 동 장기 비교에 주의.','means는 소수 둘째 자리 반올림. counts의 정수는 해당 그룹24시간에 동일한 유효 날짜 수, 배열은 시간별 유효 날짜 수.']}
  if record.get('partialMonth'):
   payload.update(availableThrough=through,partialMonth=True,calendarDays=last)
   payload['notes'].append(f'부분월: {through}까지 실제 제공된 날짜만 포함. 이후 미제공 날짜는 0이나 유효일수로 채우지 않으며, 빈 월 구간의 평균은 null·유효일수는 0.')
  filename=f'{period}-{age}-{sex}.json';dest=OUT/filename;temporary=dest.with_suffix('.json.tmp');temporary.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')));temporary.replace(dest)
  outputs.append({'month':period,'age':age,'sex':sex,'path':'data/population-patterns/'+filename,'bytes':dest.stat().st_size})
 print(period,rows,'rows',len(all_codes),'regions',sum(o['bytes'] for o in outputs),'bytes',flush=True)
 result={'month':period,'dates':len(dates),'regions':len(all_codes),'sourceRows':rows,'files':outputs}
 if record.get('partialMonth'):result.update(availableThrough=through,partialMonth=True,calendarDays=last)
 return result

def main():
 global OUT
 parser=argparse.ArgumentParser();parser.add_argument('--months',nargs='*');parser.add_argument('--source-manifest',type=pathlib.Path,default=ROOT/'data/population-history-manifest.json');parser.add_argument('--output-dir',type=pathlib.Path,default=OUT);args=parser.parse_args();OUT=args.output_dir;OUT.mkdir(parents=True,exist_ok=True)
 manifest=json.loads(args.source_manifest.read_text());records=[r for r in manifest['records'] if r.get('status')=='downloaded' and (not args.months or r['period'] in args.months)]
 results=[]
 for record in sorted(records,key=lambda r:r['period'],reverse=True):results.append(prepare(record))
 old=json.loads((OUT/'index.json').read_text()) if (OUT/'index.json').exists() else {'months':[]}
 by_month={r['month']:r for r in old['months']};by_month.update({r['month']:r for r in results})
 index={'source':'OA-23016','sourceUrl':manifest['sourceUrl'],'definition':'같은 시각·지역·타깃의 생활인구를 날짜별로 먼저 집계한 뒤 요일/월 구간별 평균','months':sorted(by_month.values(),key=lambda r:r['month']),'availableCohorts':[{'age':a,'sex':s} for a,s in COHORTS],'limitations':['월별 같은250m자료이며 구 OA-14991 방식과 혼합하지 않음.','공휴일 별도 분리 없음. 날짜별 유효 표본 수를 함께 확인.']}
 index_temp=OUT/'index.json.tmp';index_temp.write_text(json.dumps(index,ensure_ascii=False,indent=2));index_temp.replace(OUT/'index.json')
 print('Total',len(index['months']),'months',sum(f['bytes'] for r in index['months'] for f in r['files']),'bytes',flush=True)
if __name__=='__main__':main()
