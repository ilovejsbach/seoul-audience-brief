#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Collect Korean registered resident stock, not daily visits or migration flows."""
import hashlib,json,pathlib,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1];RAW=ROOT/'data/raw/residential-migration-demographics';RAW.mkdir(parents=True,exist_ok=True)
URL='https://data.seoul.go.kr/bsp/wgs/dataset/dataTypeList.do'
params={'id':32,'rowFilterList':[{'varColumn':'stats_yr','varSign':'g','varValue':'2025'},{'varColumn':'sex_nm','varSign':'g','varValue':'계'},{'varColumn':'frgnr_div','varSign':'g','varValue':'한국인'}],'currentPage':1,'pagePer':1000}
path=RAW/'resident-stock-hub32-2025-korean-total.json'
if path.exists():raw=path.read_bytes()
else:
 raw=urllib.request.urlopen(urllib.request.Request(URL,data=json.dumps(params).encode(),headers={'Content-Type':'application/json'}),timeout=30).read();path.write_bytes(raw)
j=json.loads(raw);rows=j['dataTypeList'];assert len(rows)==int(j['dataTypeListCount']) and len(rows)<1000
records=[]
for r in rows:
 assert r['stats_yr']=='2025' and r['sex_nm']=='계' and r['frgnr_div']=='한국인'
 code=r['admdong_cd'];level='seoul' if code=='1100000000' else 'gu' if code.endswith('00000') else 'dong'
 records.append({'code':'all' if level=='seoul' else code[:5] if level=='gu' else code,'level':level,'name':'서울 전체' if level=='seoul' else r['sigungu_nm'] if level=='gu' else r['epmndn_nm'],'gu':r['sigungu_nm'] if level!='seoul' else None,'period':r['stats_yr'],'value':r['popl_cnt']})
city=next(r['value'] for r in records if r['level']=='seoul');gu_total=sum(r['value'] for r in records if r['level']=='gu');dong_total=sum(r['value'] for r in records if r['level']=='dong');assert city==gu_total==dong_total
checks=[]
for gu in [r for r in records if r['level']=='gu']:
 ds=[r for r in records if r['level']=='dong' and r['gu']==gu['name']];actual=sum(r['value'] for r in ds);assert actual==gu['value'];checks.append({'code':gu['code'],'guTotal':gu['value'],'dongSum':actual,'dongCount':len(ds)})
result={'title':'서울 주민등록인구(한국인)','period':'2025','periodLabel':'2025년 원본 연도 기준','referenceDate':None,'referenceDateStatus':'원본 응답은 stats_yr=2025이며 특정 기준일 필드는 제공하지 않음. 별도 말일 확인 전 일자를 임의 기재하지 않음.','unit':'명','populationScope':'한국인 주민등록인구 · 전체 연령·성별 · 등록외국인 제외','sourceUrl':'https://data.seoul.go.kr/bsp/wgs/dataView/data300View/32.do','endpoint':URL,'collectedAt':'2026-11-14','records':sorted(records,key=lambda r:(r['level'],r['code'])),'validation':{'recordCount':len(records),'seoul':city,'guSum':gu_total,'dongSum':dong_total,'districtChecks':checks},'notes':['주민등록표 기반 등록 인구. 해당 시간에 실제 머무는 인구나 일중 유입 인구가 아님.','원본 한국인 분류만 사용하며 등록외국인은 포함하지 않음. 전체 연령·성별 총계.','선택한 생활인구 기준일과 주민등록인구 기준연도가 다름. 두 자료의 차이·비율을 순유입·유출이나 광고 도달효과로 해석하지 말 것.','구와 동을 함께 더하지 말 것. 서울 전체는 공식 서울 총계를 사용.','연도별 행정동 변동·미연결 코드는 임의로 분할·대체하지 말 것.','주민등록인구는 거주자 외 거주불명자·재외국민을 포함하므로 실제 상주인구와 다를 수 있음.'],'provenance':{'path':str(path.relative_to(ROOT)),'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'request':params}}
out=ROOT/'public/data/resident-population.json';out.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')));print(json.dumps({'records':len(records),'seoul':city,'guSum':gu_total,'dongSum':dong_total,'guChecks':len(checks),'bytes':out.stat().st_size}))
