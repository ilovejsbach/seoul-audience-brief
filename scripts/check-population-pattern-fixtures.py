"""Independent Decimal expectations from official ZIPs, not profile preparation code."""
import calendar,collections,csv,datetime,decimal,hashlib,io,itertools,json,pathlib,zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
D=decimal.Decimal
round2=lambda x:str(x.quantize(D('.01'),rounding=decimal.ROUND_HALF_UP))
manifest=json.loads((ROOT/'data/population-history-manifest.json').read_text())
by_month={item['period']:item for item in manifest['records']}
cohorts={'all-all':{'indices':[3],'columns':['생활인구합계'],'age':'all','sex':'all'},'young-male':{'indices':[7,8,9,10],'columns':['남자 20~24세','남자 25~29세','남자 30~34세','남자 35~39세'],'age':'young','sex':'male'}}
cohorts['all-female']={'indices':list(range(18,32)),'columns':['여자 0~9세','여자 10~14세','여자 15~19세','여자 20~24세','여자 25~29세','여자 30~34세','여자 35~39세','여자 40~44세','여자 45~49세','여자 50~54세','여자 55~59세','여자 60~64세','여자 65~69세','여자 70세 이상'],'age':'all','sex':'female'}
queries=[
 ('202610','11500620','공항동','young-male','weekday','monday',12),
 ('202610','11500620','공항동','young-male','weekday','monday',18),
 ('202610','11500620','공항동','young-male','monthphase','early',12),
 ('202610','11500620','공항동','young-male','monthphase','early',18),
 ('202610','11500620','공항동','young-male','monthphase','late',12),
 ('202610','11500620','공항동','young-male','monthphase','late',18),
 ('202601','all','서울 전체','all-all','weekday','monday',18),
 ('202601','all','서울 전체','all-all','monthphase','early',18),
 ('202601','11440','마포구','all-all','weekday','monday',18),
 ('202610','11440','마포구','all-all','weekday','monday',18),
 ('202610','11110670','창신1동','all-female','monthphase','early',0),
]
# Every relevant region/hour/day total is built directly from its contributing source rows.
sums={};counts=collections.Counter();invalid=collections.Counter();archives=[]
for month in ['202601','202610']:
 item=by_month[month];path=ROOT/item['path'];archives.append({'month':month,'path':item['path'],'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
 wanted={(region,cohort,hour) for m,region,name,cohort,kind,group,hour in queries if m==month}
 with zipfile.ZipFile(path) as archive:
  for name in archive.namelist():
   if not name.lower().endswith('.csv'):continue
   with archive.open(name) as binary:
    text=io.TextIOWrapper(binary,encoding='cp949');header=next(csv.reader([text.readline()]));first=text.readline();sep=';' if ';' in first else ','
    for cohort in cohorts.values():
     for index,label in zip(cohort['indices'],cohort['columns']):
      if header[index]!=label:raise AssertionError('Independent expected source column no longer matches')
    for row in csv.reader(itertools.chain([first],text),delimiter=sep):
     if not row:continue
     date,hour,code=row[0].strip(),int(row[1]),row[2].strip()
     for region,cohort_key,target_hour in wanted:
      if hour!=target_hour or region!='all' and not (code.startswith(region) if len(region)==5 else code==region):continue
      key=(month,region,cohort_key,hour,date);counts[key]+=1
      vals=[row[index].strip() for index in cohorts[cohort_key]['indices']]
      if any(v in ('','*',r'\N') for v in vals):invalid[key]+=1;continue
      sums[key]=sums.get(key,D(0))+sum((D(v) for v in vals),D(0))
results=[]
for month,region,name,cohort_key,kind,group,hour in queries:
 dates=[f'{month}{day:02}' for day in range(1,calendar.monthrange(int(month[:4]),int(month[4:]))[1]+1)]
 selected=[date for date in dates if datetime.date(int(date[:4]),int(date[4:6]),int(date[6:])).weekday()==0] if kind=='weekday' else [date for date in dates if int(date[6:])<=10] if group=='early' else [date for date in dates if int(date[6:])>=21]
 day_records=[];valid=[]
 for date in selected:
  key=(month,region,cohort_key,hour,date);n=counts[key];missing=invalid[key]
  total=None if n==0 or missing else sums[key]
  if total is not None:valid.append(total)
  day_records.append({'date':date,'sourceRowCount':n,'maskedOrMissingRows':missing,'totalDecimal':None if total is None else str(total)})
 mean=sum(valid,D(0))/len(valid) if valid else None
 results.append({'id':f'{month}-{region}-{cohort_key}-{kind}-{group}-{hour:02}', 'month':month,'regionCode':region,'regionName':name,'cohort':cohorts[cohort_key], 'grouping':kind,'group':group,'hour':hour,'unit':'명','expectedDays':len(selected),'validDays':len(valid),'missingDays':len(selected)-len(valid),'includedDates':[r['date'] for r in day_records if r['totalDecimal'] is not None],'excludedDates':[r['date'] for r in day_records if r['totalDecimal'] is None],'sumOfValidDayTotalsDecimal':str(sum(valid,D(0))) if valid else None,'averageDecimal':str(mean) if mean is not None else None,'averageRounded2':round2(mean) if mean is not None else None,'uiRoundedInteger':format(mean.quantize(D(1),rounding=decimal.ROUND_HALF_UP),',') if mean is not None else '자료 없음','dailyTotals':day_records})
output={'source':'OA-23016','sourceUrl':'https://data.seoul.go.kr/dataList/OA-23016/F/1/datasetView.do','method':'independent Python csv + Decimal summation of official archives; no profile generation code imported or copied','weekdayConvention':'Monday selected with datetime.date.weekday()==0; do not assume UI weekday index order','monthPhaseDefinitions':{'early':'1–10일','middle':'11–20일','late':'21–말일'},'missingPolicy':'If any contributing row has any missing selected cohort cell, that region/hour/date total is null. The group mean uses only complete valid day totals; expected/valid/missing day counts remain explicit. No missing date is filled with0.','archives':archives,'cases':results}
path=ROOT/'data/population-pattern-fixtures.json';path.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
for result in results:print(result['id'],result['averageRounded2'],result['uiRoundedInteger'],f"n={result['validDays']}/{result['expectedDays']}",flush=True)
print(path)
