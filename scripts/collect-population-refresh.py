"""Acquire the OA-23016 daily Sheet CSV beyond the latest complete monthly ZIP.
Only the two official Seoul data hosts are permitted. Raw destinations are new-only.
--check is fully offline; --download records every request and raw response hash.
"""
import argparse,collections,csv,datetime,decimal,hashlib,json,pathlib,re,urllib.parse,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
PAGE='https://data.seoul.go.kr/dataList/OA-23016/F/1/datasetView.do'
SHEET='https://data.seoul.go.kr/dataList/sheetView.do?infId=OA-23016&srvType=S&serviceKind=1'
PREVIEW='https://data.seoul.go.kr/dataList/dataView.do'
DOWNLOAD='https://datafile.seoul.go.kr/bigfile/iot/sheet/csv/download.do'
BASE={'srvType':'S','infId':'OA-23016','serviceKind':'1','pageNo':'1','ssUserId':'SAMPLE_VIEW','strWhere':" AND YMD >= to_char(now() - interval '2 months' - interval '5 days','YYYYMMDD')",'strOrderby':'YMD DESC,TT ASC,H_DNG_CD ASC'}
ALLOWED={'data.seoul.go.kr','datafile.seoul.go.kr'}
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
class OfficialRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  if urllib.parse.urlsplit(newurl).hostname not in ALLOWED:raise ValueError('Unexpected redirect host')
  return super().redirect_request(req,fp,code,msg,headers,newurl)
def inspect_csv(path,through):
 dates=collections.Counter();codes=set();seen=set();missing=0;columns=None
 with path.open(encoding='cp949',newline='') as f:
  reader=csv.reader(f);columns=next(reader)
  if len(columns)!=32 or columns[:4]!=['일자','시간','행정동코드','생활인구합계']:raise ValueError('Unexpected columns')
  for row in reader:
   if len(row)!=32:raise ValueError('Unexpected row width')
   date,hour,code=row[0].strip(),int(row[1]),row[2].strip();key=(date,hour,code)
   if not re.fullmatch(through[:6]+r'\d{2}',date) or not 0<=hour<24 or not re.fullmatch(r'\d{8}',code) or key in seen:raise ValueError('Invalid or duplicate date/hour/code')
   seen.add(key);dates[date]+=1;codes.add(code)
   for text in row[3:]:
    if text.strip() in ('','*',r'\N'):missing+=1
    else:
     v=decimal.Decimal(text)
     if not v.is_finite() or v<0:raise ValueError('Invalid source population')
 expected=[through[:6]+f'{d:02}' for d in range(1,int(through[6:])+1)]
 if sorted(dates)!=expected or len(codes)!=427 or set(dates.values())!={427*24}:raise ValueError('Incomplete date/hour/dong coverage')
 return columns,{'dailyRows':dict(sorted(dates.items())),'duplicateKeys':0,'maskedCells':missing}
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--raw-dir',type=pathlib.Path,required=True);parser.add_argument('--since',default='20261101');mode=parser.add_mutually_exclusive_group();mode.add_argument('--download',action='store_true');mode.add_argument('--check',action='store_true');args=parser.parse_args()
 raw=args.raw_dir.resolve();raw.relative_to(ROOT/'data/raw');manifest_path=raw/'manifest.json'
 if args.download:
  if manifest_path.exists():raise ValueError('Raw manifest already exists; use --check or a new raw directory')
  raw.mkdir(parents=True,exist_ok=True);requests=[];opener=urllib.request.build_opener(OfficialRedirect)
  def fetch(url,name,params=None,method='GET'):
   path=raw/name
   if path.exists():raise ValueError('Refusing to overwrite raw response: '+str(path))
   request_url=url+('?' + urllib.parse.urlencode(params) if method=='GET' and params else '')
   request=urllib.request.Request(request_url,data=urllib.parse.urlencode(params).encode() if method=='POST' else None)
   started=datetime.datetime.now(datetime.timezone.utc).isoformat()
   with opener.open(request,timeout=180) as response,path.open('xb') as output:
    headers=dict(response.headers)
    while chunk:=response.read(1024*1024):output.write(chunk)
   requests.append({'source':'OA-23016','url':url,'method':method,'params':params,'retrievedAt':started,'path':str(path.relative_to(ROOT)),'bytes':path.stat().st_size,'sha256':digest(path),'responseHeaders':headers})
   return path
  page=fetch(PAGE,'source-page.html').read_text();fetch(SHEET,'sheet-view.html')
  preview=fetch(PREVIEW,'preview-latest.json',dict(BASE,onepagerow='1000')).read_text()
  latest=max(re.findall(r'YMD:"(\d{8})"',preview));since=datetime.date.fromisoformat(args.since[:4]+'-'+args.since[4:6]+'-'+args.since[6:])
  if latest[:6]!=args.since[:6] or since.day!=1:raise ValueError('Run separately for a month starting at day 1')
  params=dict(BASE,gridTotalCnt=str(427*24*int(latest[6:])),filterCol='YMD',txtFilter=latest[:6])
  path=fetch(DOWNLOAD,'OA-23016-'+latest[:6]+'-sheet.csv',params,'POST');columns,validation=inspect_csv(path,latest)
  record={'period':latest[:6],'source':'OA-23016','sourceUrl':'https://data.seoul.go.kr/dataList/OA-23016/S/1/datasetView.do','downloadUrl':DOWNLOAD,'path':str(path.relative_to(ROOT)),'encoding':'cp949','format':'csv','columns':columns,'status':'downloaded','sha256':digest(path),'bytes':path.stat().st_size,'availableThrough':latest,'sourceRows':sum(validation['dailyRows'].values()),'partialMonth':True}
  manifest={'source':'OA-23016','sourceUrl':record['sourceUrl'],'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'latestListedMonthlyArchive':max(re.findall(r'250_LOCAL_RESD_ADMDONG_(\d{6})\.zip',page)),'latestSheetDate':latest,'requests':requests,'records':[record],'validation':validation}
  with manifest_path.open('x') as f:f.write(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 else:
  manifest=json.loads(manifest_path.read_text())
  for request in manifest['requests']:
   path=ROOT/request['path']
   if path.stat().st_size!=request['bytes'] or digest(path)!=request['sha256']:raise ValueError('Raw response hash differs')
  for record in manifest['records']:
   path=ROOT/record['path'];columns,validation=inspect_csv(path,record['availableThrough'])
   if columns!=record['columns'] or digest(path)!=record['sha256'] or validation!=manifest['validation']:raise ValueError('Offline validation differs')
 print(json.dumps({'latestSheetDate':manifest['latestSheetDate'],'records':sum(r['sourceRows'] for r in manifest['records']),'validation':manifest['validation']},ensure_ascii=False))
if __name__=='__main__':main()
