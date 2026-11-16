#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prepare official market geometry and industry sales; never change raw archives."""
import csv,io,json,pathlib,zipfile,collections,hashlib
import shapefile
from pyproj import CRS,Transformer
R=pathlib.Path(__file__).resolve().parents[1];P=R/'public/data';RAW=R/'data/raw/commerce'
def readzip(path):
 z=zipfile.ZipFile(path)
 if z.testzip():raise ValueError('Invalid raw ZIP')
 return z
def number(v):
 if v is None or str(v).strip() in ('','*',r'\N','null'):return None
 return int(v)
def transform_coords(x,tr):
 if isinstance(x[0],(int,float)):
  lon,lat=tr.transform(x[0],x[1]);return [round(lon,7),round(lat,7)]
 return [transform_coords(y,tr) for y in x]
def main():
 boundary=RAW/'OA-15560_5.zip';salesfile=RAW/'OA-15572_51.zip';z=readzip(boundary)
 get=lambda ext:z.read(next(n for n in z.namelist() if n.endswith(ext)))
 prj=get('.prj').decode();tr=Transformer.from_crs(CRS.from_wkt(prj),CRS.from_epsg(4326),always_xy=True)
 reader=shapefile.Reader(shp=io.BytesIO(get('.shp')),dbf=io.BytesIO(get('.dbf')),encoding='utf-8');areas={};features=[]
 for sr in reader.iterShapeRecords():
  row=sr.record.as_dict();code=row['TRDAR_CD'];a={'code':code,'areaCode':code,'name':row['TRDAR_CD_N'],'typeCode':row['TRDAR_SE_C'],'type':row['TRDAR_SE_1'],'gu':row['SIGNGU_CD'],'districtCode':row['SIGNGU_CD'],'guName':row['SIGNGU_CD_'],'dong':row['ADSTRD_CD'],'dongName':row['ADSTRD_CD_'],'area':number(row['RELM_AR'])}
  assert code not in areas;areas[code]=a;g=sr.shape.__geo_interface__;g['coordinates']=transform_coords(g['coordinates'],tr);features.append({'type':'Feature','properties':a,'geometry':g})
 (P/'market-areas.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False,separators=(',',':')))
 records=[];industries={};keys=set();raw_sums=collections.defaultdict(int);z=readzip(salesfile);source_rows=0;nulls=0
 bands=['00~06','06~11','11~14','14~17','17~21','21~24']
 with z.open(next(n for n in z.namelist() if n.endswith('.csv'))) as f:
  for r in csv.DictReader(io.TextIOWrapper(f,encoding='cp949')):
   source_rows+=1;code=r['상권_코드'];period=r['기준_년분기_코드'];industry=r['서비스_업종_코드'];key=(period,code,industry);assert key not in keys;keys.add(key);industries[industry]=r['서비스_업종_코드_명']
   record={'period':period,'areaCode':code,'industryCode':industry,'industryName':industries[industry],'sales':number(r['당월_매출_금액']),'transactions':number(r['당월_매출_건수']),'timeSales':[number(r[f'시간대_{b}_매출_금액']) for b in bands],'sexSales':[number(r[f'{sex}_매출_금액']) for sex in ['남성','여성']],'ageSales':[number(r[f'연령대_{age}_매출_금액']) for age in ['10','20','30','40','50','60_이상']],'weekdaySales':[number(r[f'{day}요일_매출_금액']) for day in ['월','화','수','목','금','토','일']]}
   for k,v in record.items():
    if isinstance(v,list):nulls+=sum(x is None for x in v)
    elif v is None:nulls+=1
   assert all(v is None or v>=0 for k in ['sales','transactions'] for v in [record[k]])
   if record['sales'] is not None:raw_sums[period]+=int(r['당월_매출_금액'])
   records.append(record)
 unmatched=sorted({r['areaCode'] for r in records}-set(areas));assert not unmatched,unmatched
 periods=sorted({r['period'] for r in records});published_sums={period:sum(r['sales'] for r in records if r['period']==period and r['sales'] is not None) for period in periods};assert published_sums==dict(raw_sums)
 out={'sourceUrl':'https://data.seoul.go.kr/dataList/OA-15572/S/1/datasetView.do','boundarySourceUrl':'https://data.seoul.go.kr/dataList/OA-15560/S/1/datasetView.do','periods':periods,'industries':[{'code':code,'name':name} for code,name in sorted(industries.items())],'timeBands':bands,'sexBands':['남성','여성'],'ageBands':['10대','20대','30대','40대','50대','60세 이상'],'weekdayBands':['월','화','수','목','금','토','일'],'areas':list(areas.values()),'records':records,'notes':['2025년 상권별·업종별 분기 추정매출 원본. sales는 원, transactions는 건. 원본 필드명 당월_매출_금액이나 기간은 원본 년분기코드를 유지.','경계파일 제작시점2023-10, 매출2025. 매출 상권코드는 경계와 모두 연결되지만 2025년 실제형상·면적과 동일함을 검증한 것은 아님.','구/동은 상권 원본의 대표 행정구역 속성. 상권 경계가 행정동을 넘을 수 있으며 해당동 전체매출과 같지 않음.','서로 다른 유형 상권이 공간상 겹칠 수 있으므로 상권 합계를 서울전체 소비총액으로 해석하지 않음.','성별·연령별·요일별·시간대별 배열은 각각 별도 주변분포이며 서로 교차한 성별×연령×요일×시간대 매출이 아님.','비공개·결측은 null 유지. 주변분포 합계가 총매출과 불일치할 수 있어 비율 재정규화 또는 임의보정하지 않음.'],'provenance':{'sourceRows':source_rows,'recordCount':len(records),'boundaryCount':len(features),'boundaryFileDate':'2023-10-20','boundaryReferenceYear':2023,'crs':'EPSG:4326','sourceCRS':CRS.from_wkt(prj).to_string(),'matchedSalesAreaCount':len({r['areaCode'] for r in records}),'unmatchedSalesAreaCodes':unmatched,'nullCells':nulls,'salesSumByPeriod':published_sums,'rawVsPublishedSalesSum':'exact','uniquePeriodAreaIndustryKeys':True,'shapeTemporalCompatibility':'not_verified_2023_boundary_vs_2025_sales','rawSha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [boundary,salesfile]}}}
 (P/'market-sales.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')))
 # Independent readback verifies serialized scalar and marginal values without frontend code.
 check=json.loads((P/'market-sales.json').read_text());assert len(check['records'])==source_rows
 with readzip(salesfile) as zz:
  with zz.open(next(n for n in zz.namelist() if n.endswith('.csv'))) as f:
   for rr,published in zip(csv.DictReader(io.TextIOWrapper(f,encoding='cp949')),check['records']):
    assert published['sales']==number(rr['당월_매출_금액']);assert published['transactions']==number(rr['당월_매출_건수']);assert published['timeSales']==[number(rr[f'시간대_{b}_매출_금액']) for b in bands]
 print(json.dumps(out['provenance'],ensure_ascii=False));print('bytes', (P/'market-sales.json').stat().st_size,(P/'market-areas.geojson').stat().st_size)
if __name__=='__main__':
 main()
 # Keep the base ZIP preparation reproducible without silently discarding an
 # independently acquired official 2026 extension already present locally.
 if (RAW/'market-sales-2026-public-download.manifest.json').exists():
  import subprocess,sys
  subprocess.run([sys.executable,str(R/'scripts/extend-market-sales-2026.py')],check=True)
