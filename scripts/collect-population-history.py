"""Acquire official OA-23016 monthly archives; raw archives stay git-ignored."""
import concurrent.futures, csv, datetime, hashlib, io, json, pathlib, re, sys, urllib.parse, urllib.request, zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
RAW=ROOT/'data/raw/population-history'
SOURCE='https://data.seoul.go.kr/dataList/OA-23016/F/1/datasetView.do'
DOWNLOAD='https://datafile.seoul.go.kr/bigfile/iot/inf/nio_download.do?useCache=false'
MANIFEST=ROOT/'data/population-history-manifest.json'
RAW.mkdir(parents=True,exist_ok=True)
html=urllib.request.urlopen(SOURCE,timeout=30).read().decode('utf-8')
(RAW/'OA-23016-source-page.html').write_text(html)
files=re.findall(r'<span title="([^"]+)" onclick="javascript:downloadFile\(\x27([^\x27]+)\x27\)',html)
monthly={seq:name for name,seq in files if re.fullmatch(r'\d{6}',seq) and name==f'250_LOCAL_RESD_ADMDONG_{seq}.zip'}
requested=sys.argv[1:] or [f'2026{month:02}' for month in range(10,0,-1)]
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
manifest={'source':'OA-23016','sourceUrl':SOURCE,'retrievedAt':now,'listedPeriods':sorted(monthly),'requestedPeriods':requested,'records':[]}
if MANIFEST.exists():
 previous=json.loads(MANIFEST.read_text())
 manifest['records']=[r for r in previous.get('records',[]) if r.get('period') not in requested]
def collect(period):
 record={'period':period,'source':'OA-23016','sourceUrl':SOURCE,'downloadUrl':DOWNLOAD,'seq':period,'infSeq':'1','retrievedAt':now}
 try:
  if period not in monthly:raise ValueError('Period is not listed on official source page')
  name=monthly[period];dest=RAW/name
  record['filename']=name
  if period=='202610' and not dest.exists():
   candidates=list((ROOT/'data/raw/mobility').glob('*202610*.zip'))
   candidates=[p for p in candidates if '23016' in p.name]
   if candidates:dest=candidates[0]
  if not dest.exists():
   request=urllib.request.Request(DOWNLOAD,data=urllib.parse.urlencode({'infId':'OA-23016','seq':period,'infSeq':'1'}).encode())
   partial=dest.with_suffix('.zip.partial')
   with urllib.request.urlopen(request,timeout=120) as response,partial.open('wb') as output:
    while chunk:=response.read(1024*1024):output.write(chunk)
   if not zipfile.is_zipfile(partial):raise ValueError('Official download did not return a ZIP')
   partial.replace(dest)
  with zipfile.ZipFile(dest) as archive:
   members=archive.namelist();csv_members=[m for m in members if m.lower().endswith('.csv')]
   if not csv_members:raise ValueError('ZIP contains no CSV')
   with archive.open(csv_members[0]) as first:header=first.readline()
   for encoding in ['utf-8-sig','cp949']:
    try:decoded=header.decode(encoding).strip();break
    except UnicodeDecodeError:continue
   else:raise ValueError('CSV header decoding failed')
   with archive.open(csv_members[0]) as first:
    text=io.TextIOWrapper(first,encoding=encoding);columns=next(csv.reader([text.readline()]));line=text.readline();delimiter=';' if ';' in line else ',';sample=next(csv.reader([line],delimiter=delimiter))
   if len(columns)!=32 or len(sample)!=32:raise ValueError('Unexpected first-data-row CSV schema')
   if not sample[0].startswith(period):raise ValueError('First data row period differs from archive')
   record.update(members=members,csvMembers=csv_members,encoding=encoding,header=decoded,columns=columns,dataDelimiter=delimiter,firstRowDate=sample[0],memberLayout='monthly CSV' if len(csv_members)==1 else 'daily CSV files',uncompressedBytes=sum(i.file_size for i in archive.infolist()),validation='ZIP directory, first header and first data row decoded; full-data validation is separate')
  digest=hashlib.sha256()
  with dest.open('rb') as source:
   while chunk:=source.read(1024*1024):digest.update(chunk)
  record.update(status='downloaded',path=str(dest.relative_to(ROOT)),bytes=dest.stat().st_size,sha256=digest.hexdigest())
 except Exception as error:record.update(status='failed',error=str(error))
 print(json.dumps({'period':period,'status':record['status'],'bytes':record.get('bytes'),'path':record.get('path'),'error':record.get('error')},ensure_ascii=False),flush=True)
 return record
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 for record in pool.map(collect,requested):
  manifest['records'].append(record)
  manifest['records'].sort(key=lambda r:r['period'])
  MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Manifest:',MANIFEST,flush=True)
