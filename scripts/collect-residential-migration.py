#!/usr/bin/env python3
"""Collect official public Seoul residential migration dashboard, annual gu totals.
No authentication or synthetic values. This is residence-registration migration,
not daily footfall, unique visitors or commuter movements.
"""
import argparse, concurrent.futures, hashlib, json, pathlib, urllib.parse, urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
RAW=ROOT/'data/raw/residential-migration'
OUT=ROOT/'public/data/residential-migration.json'
URL='https://stat.eseoul.go.kr/stat/sip/sts/move/getMapBoardDataList.do'
SOURCE='https://stat.eseoul.go.kr/stat/sip/sts/move/statsMoveBoard.do'

def collect(task):
 year, direction=task
 params=dict(statsClsfId='1104',mapChartId='22',areaCode='11',mapngId='11',treeCode='00',moveType=direction,prdDe=str(year))
 req=urllib.request.Request(URL,data=urllib.parse.urlencode(params).encode(),headers={'Referer':SOURCE,'User-Agent':'Seoul population research'})
 cache=RAW/f'gu-{year}-{direction.lower()}.json'
 b=cache.read_bytes() if cache.exists() else urllib.request.urlopen(req,timeout=30).read();j=json.loads(b)
 rows=j['mapData']['dataList']
 if len(rows)!=25:raise ValueError(f'{year} {direction}: expected 25 gu, got {len(rows)}')
 for row in rows:
  if not isinstance(row['val'],(int,float)) or len(row['originCode'])!=5:raise ValueError('invalid gu/value')
 p=RAW/f'gu-{year}-{direction.lower()}.json';p.write_bytes(b)
 return year,direction,rows,{'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(b).hexdigest(),'request':params,'bytes':len(b)}

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--start',type=int,default=2001);ap.add_argument('--end',type=int,default=2025);a=ap.parse_args();RAW.mkdir(parents=True,exist_ok=True);OUT.parent.mkdir(parents=True,exist_ok=True)
 joined={};provenance=[];errors=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  futs={pool.submit(collect,(y,d)):(y,d) for y in range(a.start,a.end+1) for d in ['IN','OUT']}
  for f in concurrent.futures.as_completed(futs):
   try:
    y,d,rows,pr=f.result();provenance.append(pr)
    for r in rows:
     key=(str(y),r['originCode']);record=joined.setdefault(key,dict(period=str(y),code=r['originCode'],name=r['nm'],inflow=None,outflow=None,net=None));record['inflow' if d=='IN' else 'outflow']=r['val']
   except Exception as e:errors.append({'task':futs[f],'error':str(e)})
 # The hub's public preview is capped at 1000 rows; filter each year, sex=total,
 # movement=total IN/OUT to obtain fewer than 1000 rows and verify count.
 hub_url='https://data.seoul.go.kr/bsp/wgs/dataset/dataTypeList.do'
 hub_records={};hub_raw_counts={};cross_source_differences=[]
 for year in range(max(2015,a.start),a.end+1):
  params={'id':64,'rowFilterList':[{'varColumn':'stats_yr','varSign':'g','varValue':str(year)},{'varColumn':'sex_nm','varSign':'g','varValue':'계'},{'varColumn':'mvmn_type_nm','varSign':'k','varValue':'총'}],'currentPage':1,'pagePer':1000}
  cache=RAW/f'hub64-{year}-totals.json'
  try:
   if cache.exists():b=cache.read_bytes()
   else:b=urllib.request.urlopen(urllib.request.Request(hub_url,data=json.dumps(params).encode(),headers={'Content-Type':'application/json'}),timeout=30).read()
   j=json.loads(b);rows=j['dataTypeList']
   if len(rows)!=int(j['dataTypeListCount']) or len(rows)>=1000:raise ValueError('hub preview truncation risk')
   cache.write_bytes(b);hub_raw_counts[str(year)]=len(rows)
   provenance.append({'path':str(cache.relative_to(ROOT)),'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'request':params})
   for r in rows:
    code=r['admdong_cd'];is_gu=code.endswith('00000');is_seoul=code=='1100000000'
    if is_seoul:continue
    if r['sex_nm']!='계' or r['mvmn_type_nm'] not in ['총전입','총전출']:raise ValueError('unexpected filter response')
    if is_gu:
     old=joined[(str(year),code[:5])];field='inflow' if r['mvmn_type_nm']=='총전입' else 'outflow'
     if old[field]!=r['popl_cnt']:cross_source_differences.append({'period':str(year),'code':code[:5],'field':field,'dashboard':old[field],'hub':r['popl_cnt']})
     old[field]=r['popl_cnt'];old['source']='seoul-data-hub64'
     continue
    key=(str(year),code);record=hub_records.setdefault(key,{'period':str(year),'code':code,'name':r['epmndn_nm'],'gu':r['sigungu_nm'],'level':'dong','inflow':None,'outflow':None,'net':None})
    record['inflow' if r['mvmn_type_nm']=='총전입' else 'outflow']=r['popl_cnt']
  except Exception as e:errors.append({'task':['hub',year],'error':str(e)})
 for r in joined.values():r['level']='gu'
 records=sorted([*joined.values(),*hub_records.values()],key=lambda r:(r['period'],r['code']))
 for r in records:
  if r['inflow'] is not None and r['outflow'] is not None:r['net']=r['inflow']-r['outflow']
 result=dict(sourceUrl='https://data.seoul.go.kr/bsp/wgs/dataView/data300View/64.do',guSourceUrl=SOURCE,endpoint=URL,hubEndpoint=hub_url,title='서울 자치구·행정동 거주지 전입·전출',unit='명/년',spatialLevel='gu,dong',codeSystem='구: 시군구 5자리; 동: 허브 원본 행정동 10자리',collectedAt='2026-11-14',periods=sorted({r['period'] for r in records}),regions=[dict(code=r['code'],name=r['name'],level=r['level']) for r in records if r['period']==max(x['period'] for x in records)],records=records,notes=['주민등록 거주지 이동. 일상 유입·유출·통행·유동인구와 구분.','2001~2014 구는 공식 대시보드 val, 2015~2025 구·동은 서울 허브 popl_cnt 원값. 순이동만 전입-전출 산출.', '대시보드와 허브 수치가 다른 행은 crossSourceDifferences에 보존. 2015년 이후는 구·동 동일 출처인 허브를 우선 사용.','자치구: 2001~2025; 행정동: 2015~2025. 연도별 행정동 구역 변동을 유지하며 최신 구역으로 소급 재분배하지 않음.', '행정동 데이터는 공개 미리보기의 연도·성별 계·총전입/총전출 필터로 1000행 미만을 확보하고 응답 행수와 count 일치 검증.', '구 합계와 동 합계를 함께 더하지 말 것. 구 값은 공식 자치구 총계이며 동 값은 개별 동 총전입·총전출.', '2023년 25구 전입·전출이 두 공식 소스 사이에 불일치하므로 해당 연도는 교차검증 미완료로 표시. 2025년은 두 소스 25구 값 일치.', '둔촌1동 2022·2023 전입은 원본 null이며 0으로 채우지 않고 순이동도 null 유지.','같은 사람이 연중 여러 번 거주지를 옮기면 고유 인원과 다를 수 있음.','서울 25구 전입수를 합산하면 서울 내부 구간 이동도 포함되므로 서울 외부 유입 총계와 다름.'],provenance=sorted(provenance,key=lambda p:p['path']),crossSourceDifferences=cross_source_differences,errors=errors)
 OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps({'records':len(records),'periods':len(result['periods']),'files':len(provenance),'errors':errors},ensure_ascii=False))
if __name__=='__main__':main()
