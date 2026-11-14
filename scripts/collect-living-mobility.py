#!/usr/bin/env python3
"""Official Seoul living-mobility OD file -> district/hour sums of cnt."""
import csv,io,json,pathlib,zipfile,urllib.request,urllib.parse,collections,decimal,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
URL='https://data.seoul.go.kr/dataList/OA-22300/S/1/datasetView.do'
RAW=ROOT/'data/raw/living-mobility/OA-22300-20261031.zip'
NAMES=dict(zip(['11110','11140','11170','11200','11215','11230','11260','11290','11305','11320','11350','11380','11410','11440','11470','11500','11530','11545','11560','11590','11620','11650','11680','11710','11740'],['종로구','중구','용산구','성동구','광진구','동대문구','중랑구','성북구','강북구','도봉구','노원구','은평구','서대문구','마포구','양천구','강서구','구로구','금천구','영등포구','동작구','관악구','서초구','강남구','송파구','강동구']))
def district(code):return code[:5] if code[:5] in NAMES else 'outside-seoul'
def main():
 if not RAW.exists():
  RAW.parent.mkdir(parents=True,exist_ok=True)
  req=urllib.request.Request('https://datafile.seoul.go.kr/bigfile/iot/inf/nio_download.do?useCache=false',data=urllib.parse.urlencode({'infId':'OA-22300','infSeq':'1','seq':'261031'}).encode())
  with urllib.request.urlopen(req,timeout=180) as response,RAW.with_suffix('.zip.partial').open('wb') as out:
   while b:=response.read(1024*1024):out.write(b)
  RAW.with_suffix('.zip.partial').rename(RAW)
 sums=collections.defaultdict(decimal.Decimal);n=0;outside=0;hours=collections.Counter();rawtotal=decimal.Decimal(0)
 with zipfile.ZipFile(RAW) as z:
  if z.testzip():raise ValueError('ZIP CRC failed')
  for name in z.namelist():
   if not name.endswith('.csv'):continue
   with z.open(name) as f:
    for r in csv.DictReader(io.TextIOWrapper(f,encoding='utf-8-sig')):
     n+=1;o=district(r['o_admdong_cd']);d=district(r['d_admdong_cd']);t=r['st_time_cd'];hour=int(t if len(t)<=2 else t[:2]);hours[t]+=1
     if not 0<=hour<=23:raise ValueError('Unknown hour '+t)
     if o==d=='outside-seoul':outside+=1;continue
     c=decimal.Decimal(r['cnt']);rawtotal+=c;sums[(r['etl_ymd'],hour,o,d)]+=c
 records=[{'date':dt[:4]+'-'+dt[4:6]+'-'+dt[6:],'hour':h,'originCode':o,'originName':NAMES.get(o,'서울 외 지역'),'destinationCode':d,'destinationName':NAMES.get(d,'서울 외 지역'),'count':float(c)} for (dt,h,o,d),c in sorted(sums.items())]
 output={'sourceUrl':URL,'periods':['2026-10-31'],'records':records,'notes':['서울 생활이동 목적별 행정동 원본의 cnt를 출발시각 시간별·구별 OD로 합산. 내국인·장단기 외국인, 모든 이동목적 포함.','count는 추정 이동 건수이며 고유 인원수가 아님. 소수점 유지. 같은 구 안 이동도 포함.','hour는 출발시각 st_time_cd의 시간. HH 및 HHMM 표기를 시간 단위로 통합. 도착시각 기준 통계와 다름.','서울 외 행정구역은 outside-seoul로 묶음. 서울 내 출발 또는 도착 기록만 포함.','행정동 8자리 코드 앞5자리(행안부 자치구 코드)로 합산. 경계 변경 시 코드표 재검증 필요.'],'provenance':{'datasetId':'OA-22300','rawPath':str(RAW.relative_to(ROOT)),'rawBytes':RAW.stat().st_size,'sha256':hashlib.sha256(RAW.read_bytes()).hexdigest(),'sourceRows':n,'excludedOutsideBothRows':outside,'recordCount':len(records),'sourceIncludedCountSum':str(rawtotal),'zipCRC':'passed','rawColumns':['o_admdong_cd','d_admdong_cd','st_time_cd','fns_time_cd','in_forn_div_nm','forn_citiz_nm','move_purpose','move_dist','move_time','cnt','etl_ymd'],'timeTokens':sorted(hours)}}
 path=ROOT/'public/data/living-mobility.json';path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(output,ensure_ascii=False,separators=(',',':')));print(json.dumps(output['provenance'],ensure_ascii=False))
if __name__=='__main__':main()
