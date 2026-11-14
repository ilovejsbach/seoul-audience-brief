#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Official Seoul residence migration marginal demographics; never infer joint sex×age."""
import concurrent.futures,hashlib,json,pathlib,urllib.parse,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
RAW=ROOT/'data/raw/residential-migration-demographics';RAW.mkdir(parents=True,exist_ok=True)
HUB='https://data.seoul.go.kr/bsp/wgs/dataset/dataTypeList.do'
BOARD='https://stat.eseoul.go.kr/stat/sip/sts/move/getMapBoardDataList.do'
SOURCE='https://stat.eseoul.go.kr/stat/sip/sts/move/statsMoveBoard.do'
base=json.loads((ROOT/'public/data/residential-migration.json').read_text())
provenance=[];records={}
def fetch(url,params,path,is_json=False):
 raw=RAW/path
 if raw.exists():b=raw.read_bytes()
 else:
  req=urllib.request.Request(url,data=(json.dumps(params).encode() if is_json else urllib.parse.urlencode(params).encode()),headers={'Content-Type':'application/json' if is_json else 'application/x-www-form-urlencoded','Referer':SOURCE})
  b=urllib.request.urlopen(req,timeout=30).read();raw.write_bytes(b)
 return json.loads(b),{'path':str(raw.relative_to(ROOT)),'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'endpoint':url,'request':params}
def sex_task(task):
 year,sex,band=task
 params={'id':64,'rowFilterList':[{'varColumn':'stats_yr','varSign':'g','varValue':str(year)},{'varColumn':'sex_nm','varSign':'g','varValue':sex},{'varColumn':'mvmn_type_nm','varSign':'k','varValue':'총'}],'currentPage':1,'pagePer':1000}
 j,pr=fetch(HUB,params,f'hub64-{year}-{band}.json',True)
 rows=j['dataTypeList'];assert len(rows)==int(j['dataTypeListCount']) and len(rows)<1000
 return year,sex,band,rows,pr
def age_task(task):
 reg,direction=task
 params={'statsClsfId':'1104','mapChartId':'24','areaCode':reg['code'],'mapngId':'11','treeCode':'00','moveType':direction,'prdDe':'2025'}
 j,pr=fetch(BOARD,params,f'board24-2025-{reg["code"]}-{direction.lower()}.json')
 rows=j['mapData']['dataList'];assert len(rows)==9
 return reg,direction,rows,pr
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 for year,sex,band,rows,pr in pool.map(sex_task,[(y,s,b) for y in range(2015,2026) for s,b in [('남자','male'),('여자','female')]]):
  provenance.append(pr)
  for r in rows:
   code=r['admdong_cd']
   if code=='1100000000':continue
   assert r['sex_nm']==sex and r['mvmn_type_nm'] in ['총전입','총전출']
   level='gu' if code.endswith('00000') else 'dong';code=code[:5] if level=='gu' else code
   key=(str(year),code,'sex',band)
   rec=records.setdefault(key,dict(period=str(year),code=code,name=r['sigungu_nm'] if level=='gu' else r['epmndn_nm'],gu=r['sigungu_nm'],level=level,dimension='sex',band=band,inflow=None,outflow=None,net=None,source='seoul-data-hub64'))
   rec['inflow' if r['mvmn_type_nm']=='총전입' else 'outflow']=r['popl_cnt']
 regs=[r for r in base['regions'] if r['level']=='gu']
 for reg,direction,rows,pr in pool.map(age_task,[(r,d) for r in regs for d in ['IN','OUT']]):
  provenance.append(pr)
  for r in rows:
   band=r['id'];key=('2025',reg['code'],'age',band)
   rec=records.setdefault(key,dict(period='2025',code=reg['code'],name=reg['name'],gu=reg['name'],level='gu',dimension='age',band=band,inflow=None,outflow=None,net=None,source='seoul-stat-move-chart24'))
   assert isinstance(r['val'],(int,float));rec['inflow' if direction=='IN' else 'outflow']=r['val']
for r in records.values():r['net']=r['inflow']-r['outflow'] if r['inflow'] is not None and r['outflow'] is not None else None
checks=[];errors=[]
for overall in base['records']:
 for dimension,bands in [('sex',['male','female']),('age',[f'00300{i}' for i in range(1,10)])]:
  selected=[records.get((overall['period'],overall['code'],dimension,b)) for b in bands]
  if not all(selected):continue
  for metric in ['inflow','outflow','net']:
   vals=[r[metric] for r in selected]
   if any(x is None for x in vals) or overall[metric] is None:continue
   expected=overall[metric];actual=sum(vals);checks.append(dict(period=overall['period'],code=overall['code'],dimension=dimension,metric=metric,expected=expected,actual=actual))
   if actual!=expected:errors.append(checks[-1])
assert not errors,errors[:5]
out=dict(title='서울 거주지 전입·전출 성별·연령별 통계',collectedAt='2026-11-14',unit='명/년',sourceUrl='https://data.seoul.go.kr/bsp/wgs/dataView/data300View/64.do',ageSourceUrl=SOURCE,periodsByDimension={'sex':sorted({r['period'] for r in records.values() if r['dimension']=='sex'}),'age':['2025']},bands={'sex':[{'value':'male','label':'남성'},{'value':'female','label':'여성'}],'age':[{'value':f'00300{i}','label':label} for i,label in enumerate(['10대 미만','10대','20대','30대','40대','50대','60대','70대','80대 이상'],1)]},records=sorted(records.values(),key=lambda r:(r['period'],r['code'],r['dimension'],r['band'])),notes=['전입신고 기반 연간 거주지 이동. 생활이동·생활인구와 다름.','성별: 2021–2025 구·동. 연령별: 2025 구만. 자료가 없는 연도·동은 총계로 대체하지 않음.','성별과 연령별은 각각 주변분포. 성별×연령 교차값으로 결합하지 않음.','순이동=전입−전출. null은 0으로 대체하지 않음.','구 합계와 동 합계를 함께 더하지 말 것. 성별·연령 그룹 합계와 전체값도 함께 더하지 말 것.','성별 수집은 공식 공개미리보기 응답행수와 전체행수 일치 확인. 연령별은 공식 공개대시보드 원값.'],validation={'marginalTotalComparisons':len(checks),'mismatches':errors},provenance=provenance)
path=ROOT/'public/data/residential-migration-demographics.json';path.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')))
print(json.dumps({'records':len(records),'bytes':path.stat().st_size,'checks':len(checks),'errors':errors},ensure_ascii=False))
