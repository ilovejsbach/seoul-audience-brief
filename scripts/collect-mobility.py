import urllib.request,urllib.parse,re,json,pathlib,zipfile,hashlib,datetime,concurrent.futures
ROOT=pathlib.Path(__file__).resolve().parents[1]
SOURCES=[('OA-23016','내국인 생활인구·행정동','행정동'),('OA-23017','장기외국인 생활인구·행정동','행정동'),('OA-23018','단기외국인 생활인구·행정동','행정동'),('OA-23019','내국인 생활인구·자치구','자치구'),('OA-22300','생활이동 출발·도착','출발·도착 지역'),('OA-12252','지하철 시간대별 승하차','역'),('OA-12913','버스 시간대별 승하차','정류장·노선')]
def collect(item):
 id,title,unit=item; url=f'https://data.seoul.go.kr/dataList/{id}/F/1/datasetView.do'; r={'id':id,'title':title,'source_url':url,'spatial_unit':unit,'retrieved_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'pending'}
 try:
  html=urllib.request.urlopen(url,timeout=30).read().decode('utf-8'); matches=re.findall(r'<span title="([^"]+)" onclick="javascript:downloadFile\(\x27([^\x27]+)\x27\)',html)
  if not matches: raise ValueError('No downloadable file in official page')
  name,seq=matches[0]; dest=ROOT/'data/raw/mobility'/f'{id}-{name}'; dest.parent.mkdir(parents=True,exist_ok=True)
  existing=ROOT/'data/raw/mobility/OA-23016-202610.zip'
  if id=='OA-23016' and existing.exists(): existing.rename(dest)
  if not dest.exists():
   req=urllib.request.Request('https://datafile.seoul.go.kr/bigfile/iot/inf/nio_download.do?useCache=false',data=urllib.parse.urlencode({'infId':id,'seq':seq,'infSeq':'1'}).encode())
   with urllib.request.urlopen(req,timeout=90) as res, dest.open('wb') as out:
    while chunk:=res.read(1024*1024): out.write(chunk)
  r.update(path=str(dest.relative_to(ROOT)),bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),filename=name)
  if zipfile.is_zipfile(dest):
   with zipfile.ZipFile(dest) as z:
    r['members']=z.namelist(); r['validation']='zip directory read'
    with z.open(z.namelist()[0]) as f: line=f.readline()
  elif dest.suffix.lower()=='.csv':
   line=dest.open('rb').readline()
   if b'<html' in line.lower():
    dest.unlink(); raise ValueError('Download returned HTML error')
   r['validation']='CSV first line read'
  else: raise ValueError('Unexpected file format')
  for enc in ['utf-8-sig','cp949']:
   try:r['header']=line.decode(enc).strip();r['encoding']=enc;break
   except UnicodeDecodeError:pass
  r['status']='downloaded'
 except Exception as e:r['error']=str(e)
 print(id,r['status'],r.get('bytes',0),flush=True);return r
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool: results=list(pool.map(collect,SOURCES))
(ROOT/'data/catalog-mobility.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
