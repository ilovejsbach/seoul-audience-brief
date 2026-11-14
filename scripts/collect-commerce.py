#!/usr/bin/env python3
"""Download public Seoul commerce files via the official page's download form (no key)."""
import urllib.request,urllib.parse,re,json,pathlib,hashlib,zipfile,datetime
ROOT=pathlib.Path(__file__).resolve().parents[1]; DEST=ROOT/'data/raw/commerce';DEST.mkdir(parents=True,exist_ok=True)
items=[('OA-15560','영역-상권','상권 경계'),('OA-22175','추정매출-행정동','행정동·업종·분기 / 원·건'),('OA-15577','점포-상권','상권·업종·분기 / 개소'),('OA-22178','길단위인구-행정동','행정동·분기 / 인구 추정치'),('OA-22181','상주인구-행정동','행정동·분기 / 명'),('OA-22184','직장인구-행정동','행정동·분기 / 명')]
records=[]
for id,name,unit in items:
 url=f'https://data.seoul.go.kr/dataList/{id}/S/1/datasetView.do'; rec={'id':id,'name':name,'official_url':url,'unit':unit,'retrieved_at':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 try:
  s=urllib.request.urlopen(url,timeout=30).read().decode();form=re.search(r'<form name="frmFile".*?</form>',s,re.S).group(); infseq=re.search(r'name="infSeq" value="(\d*)"',form).group(1)
  files=re.findall(r'title="([^"]+\.(?:zip|csv))" onclick="javascript:downloadFile\(\'(\d+)\'\)',s)
  if not files:raise ValueError('공식 페이지 파일이 없습니다. API 경로 별도 확인 필요')
  filename,seq=files[0];rec.update(source_filename=filename,period=re.search(r'(20\d\d)년',filename).group(1) if re.search(r'(20\d\d)년',filename) else '파일 수정일 2023-10-23, 경계 기준일 확인 필요',download_url='https://datafile.seoul.go.kr/bigfile/iot/inf/nio_download.do?useCache=false',download_form={'infId':id,'infSeq':infseq,'seq':seq})
  request=urllib.request.Request(rec['download_url'],data=urllib.parse.urlencode(rec['download_form']).encode());data=urllib.request.urlopen(request,timeout=90).read()
  if not data.startswith(b'PK') and filename.endswith('.zip'):raise ValueError('Response is not ZIP: '+data[:100].decode(errors='replace'))
  path=DEST/(id+'_'+seq+pathlib.Path(filename).suffix);path.write_bytes(data);rec.update(status='downloaded',path=str(path.relative_to(ROOT)),bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
  if path.suffix=='.zip':
   with zipfile.ZipFile(path) as z:
    rec['archive_members']=[{'name':i.filename,'bytes':i.file_size} for i in z.infolist()];rec['zip_validation']=z.testzip() or 'passed'
  print(id,len(data),flush=True)
 except Exception as e:rec.update(status='failed',error=str(e));print(id,str(e),flush=True)
 records.append(rec);(ROOT/'data/catalog-commerce.json').write_text(json.dumps({'note':'Official public download forms; no API key. Raw files unchanged. Units need schema/manual confirmation before aggregation.','datasets':records},ensure_ascii=False,indent=2))
