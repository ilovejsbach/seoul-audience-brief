"""Read every downloaded OA-23016 row without extracting or publishing raw CSVs."""
import calendar,collections,csv,io,json,pathlib,re,zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'data/population-history-manifest.json').read_text())
results=[]
for record in manifest['records']:
 period=record['period'];result={'period':period,'path':record.get('path'),'status':'pending'}
 try:
  if record['status']!='downloaded':raise ValueError('Archive not downloaded')
  dates=collections.Counter();hours=collections.Counter();codes=set();bydate=collections.defaultdict(set);seen=set();count=0;delimiters=set()
  with zipfile.ZipFile(ROOT/record['path']) as archive:
   for name in record['csvMembers']:
    with archive.open(name) as binary:
     text=io.TextIOWrapper(binary,encoding=record['encoding']);header=next(csv.reader([text.readline()]));line=text.readline();delimiter=';' if ';' in line else ',';delimiters.add(delimiter)
     if header!=record['columns']:raise ValueError('Header changes within month: '+name)
     import itertools
     for row in csv.reader(itertools.chain([line],text),delimiter=delimiter):
      if not row:continue
      if len(row)!=32:raise ValueError('Row width differs from32: '+name)
      date,hour,code=row[0].strip(),int(row[1]),row[2].strip()
      if not re.fullmatch(period+r'\d{2}',date) or not 0<=hour<24 or not re.fullmatch(r'\d{8}',code):raise ValueError('Invalid date/hour/code: '+str(row[:3]))
      key=f'{date}:{hour}:{code}'
      if key in seen:raise ValueError('Duplicate date/hour/dong key: '+key)
      seen.add(key);dates[date]+=1;hours[hour]+=1;codes.add(code);bydate[date].add(code);count+=1
  expected=[f'{period}{day:02}' for day in range(1,calendar.monthrange(int(period[:4]),int(period[4:]))[1]+1)]
  if sorted(dates)!=expected:raise ValueError('Calendar coverage differs')
  incomplete=[date for date,n in dates.items() if n!=24*len(bydate[date])]
  if incomplete:raise ValueError('Incomplete date/hour/dong grid: '+','.join(incomplete))
  result.update(status='passed',rows=count,days=len(dates),hours=sorted(hours),dongCount=len(codes),dailyDongCounts=sorted(set(len(v) for v in bydate.values())),firstDate=min(dates),lastDate=max(dates),delimiters=sorted(delimiters),allRowsSchema=32,duplicateKeys=0,zipCrc='all members read to EOF without CRC error')
 except Exception as error:result.update(status='failed',error=str(error))
 results.append(result);print(json.dumps(result,ensure_ascii=False),flush=True)
 (ROOT/'data/population-history-validation.json').write_text(json.dumps({'source':'OA-23016','validationScope':'all CSV rows: column count, date/hour/dong keys, duplicates, monthly calendar coverage, per-day complete24h grid, ZIP CRC on full read; numeric cell interpretation belongs to profile preparation','records':results},ensure_ascii=False,indent=2)+'\n')
if any(r['status']!='passed' for r in results):raise SystemExit(1)
