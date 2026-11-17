"""Publish lossless daily OA-23016 JSON in gzip containers for static hosting.
The browser decompresses the selected day only. Original monthly archives remain ignored.
"""
import argparse,calendar,collections,contextlib,csv,gzip,hashlib,io,itertools,json,pathlib,zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'public/data/population'
def prepare(record):
 period=record['period'];dates=collections.defaultdict(list);columns=None;seen=set()
 with contextlib.ExitStack() as stack:
  if record.get('format')=='csv':
   sources=[stack.enter_context((ROOT/record['path']).open('rb'))]
  else:
   z=stack.enter_context(zipfile.ZipFile(ROOT/record['path']))
   sources=[stack.enter_context(z.open(name)) for name in sorted(x for x in z.namelist() if x.lower().endswith('.csv'))]
  for raw in sources:
   with raw:
    text=io.TextIOWrapper(raw,encoding=record.get('encoding','cp949'));header=next(csv.reader([text.readline()]));first=text.readline();delimiter=';' if ';' in first else ','
    if columns is None:columns=header
    if columns!=header:raise ValueError('Inconsistent header')
    for row in csv.reader(itertools.chain([first],text),delimiter=delimiter):
     if not row:continue
     if len(row)!=32:raise ValueError('Unexpected columns')
     date=row[0].strip();hour=int(row[1]);code=row[2].strip();key=(date,hour,code)
     if key in seen or not date.startswith(period) or not 0<=hour<24:raise ValueError('Duplicate or invalid row')
     seen.add(key);values=[None if x.strip() in ('','*',r'\N') else float(x) for x in row[3:]]
     dates[date].append([date,hour,code,*values])
 end=record.get('availableThrough',period+str(calendar.monthrange(int(period[:4]),int(period[4:]))[1]))
 if not end.startswith(period):raise ValueError('Coverage end does not match month')
 expected=[period+f'{day:02}' for day in range(1,int(end[6:])+1)]
 if sorted(dates)!=expected:raise ValueError('Missing dates')
 entries=[]
 for date,rows in sorted(dates.items()):
  if len(rows)!=427*24:raise ValueError('Incomplete daily grid')
  rows.sort(key=lambda r:(r[1],r[2]));payload=json.dumps({'source':'OA-23016','unit':'persons_estimated_at_hour','columns':columns,'rows':rows},ensure_ascii=False,separators=(',',':')).encode()
  dest=OUT/f'250_LOCAL_RESD_ADMDONG_{date}.json.gz';compressed=gzip.compress(payload,compresslevel=6,mtime=0)
  if dest.exists() and dest.read_bytes()!=compressed:raise ValueError(f'Refusing to overwrite changed existing date: {date}')
  if not dest.exists():dest.write_bytes(compressed)
  # Round-trip equality verifies the container, without rounding source values.
  if gzip.decompress(dest.read_bytes())!=payload:raise ValueError('Round-trip mismatch')
  entries.append({'path':'data/population/'+dest.name,'date':date,'rows':len(rows),'bytes':dest.stat().st_size,'encoding':'gzip','sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
 print(period,len(entries),sum(e['bytes'] for e in entries),flush=True)
 return entries
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--months',nargs='*');parser.add_argument('--source-manifest',type=pathlib.Path,default=ROOT/'data/population-history-manifest.json');parser.add_argument('--output-dir',type=pathlib.Path,default=OUT);args=parser.parse_args();manifest=json.loads(args.source_manifest.read_text());OUT=args.output_dir;OUT.mkdir(parents=True,exist_ok=True)
 index_path=OUT/'index.json';index=json.loads(index_path.read_text()) if index_path.exists() else [];by_date={e['date']:e for e in index}
 for record in manifest['records']:
  if record['period']=='202610' or args.months and record['period'] not in args.months:continue
  for entry in prepare(record):by_date[entry['date']]=entry
  (OUT/'index.json').write_text(json.dumps([by_date[d] for d in sorted(by_date)],ensure_ascii=False,separators=(',',':')))
 print('Published dates',len(by_date),'bytes',sum(e['bytes'] for e in by_date.values()),flush=True)
