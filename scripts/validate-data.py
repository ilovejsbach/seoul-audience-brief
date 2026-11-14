#!/usr/bin/env python3
"""Independent validation of published data against schemas and raw commerce."""
import pathlib,json,csv,io,zipfile,collections,math,decimal,sys
ROOT=pathlib.Path(__file__).resolve().parents[1];P=ROOT/'public/data';results=[]
def load(path):return json.loads(path.read_text())
def check(name,fn):
 try:detail=fn();results.append({'check':name,'status':'passed','detail':detail})
 except Exception as e:results.append({'check':name,'status':'failed','detail':str(e)})
def require(ok,msg):
 if not ok:raise ValueError(msg)
regions=load(P/'regions.json');districts={r['code'] for r in regions['districts']};dongs={r['code']:r for r in regions['dongs']}
def population():
 idx=load(P/'population/index.json');require(len(idx)==31,'Expected 31 indexed days');require({r['date'] for r in idx}=={f'202610{i:02d}' for i in range(1,32)},'Wrong dates');total=0;allcodes=set();nulls=collections.Counter()
 for item in idx:
  path=ROOT/'public'/item['path'];x=load(path);rows=x['rows'];cols=x['columns'];require(len(cols)==32,f'{path.name}: expected 32 fields');require(len(rows)==427*24,f'{path.name}: row count {len(rows)}');require(item['rows']==len(rows),'Index count mismatch');require(item['bytes']==path.stat().st_size,'Index bytes mismatch');keys=set();byhour=collections.Counter()
  for n,r in enumerate(rows):
   require(len(r)==len(cols),f'{path.name} row {n}: field width');require(r[0]==item['date'],'Date mismatch');require(isinstance(r[1],int) and 0<=r[1]<24,'Invalid hour');require(r[2] in dongs,f'Unmapped dong {r[2]}');require(dongs[r[2]]['districtCode'] in districts,'Unmapped district');key=(r[0],r[1],r[2]);require(key not in keys,'Duplicate date/hour/dong');keys.add(key);byhour[r[1]]+=1;allcodes.add(r[2]);require(all(v is None or isinstance(v,(int,float)) and math.isfinite(v) and v>=0 for v in r[3:]),'Negative/non-numeric/non-finite population');require(r[3] is not None,'Missing population total');nulls.update(i for i,v in enumerate(r) if v is None)
  require(set(byhour)==set(range(24)) and set(byhour.values())=={427},'Incomplete hour/dong grid');total+=len(rows)
 require(len(allcodes)==427,'Not 427 population dong codes')
 return {'maskedOrMissingCells':sum(nulls.values()),'nullsByColumnIndex':dict(nulls),'days':31,'rows':total,'fields':32,'dongCodes':len(allcodes),'mappingCoverage':'100%','note':'No assertion that age/sex rounded cells sum exactly to rounded total.'}
def commerce():
 x=load(P/'commerce.json');raw=collections.defaultdict(lambda:[0]*8);n=0
 with zipfile.ZipFile(ROOT/'data/raw/commerce/OA-22175_7.zip') as z:
  require(z.testzip() is None,'Bad raw ZIP')
  for name in z.namelist():
   if not name.endswith('.csv'):continue
   with z.open(name) as f:
    for r in csv.DictReader(io.TextIOWrapper(f,encoding='cp949')):
     n+=1;a=raw[(r['기준_년분기_코드'],r['행정동_코드'])];a[0]+=int(r['당월_매출_금액']);a[1]+=int(r['당월_매출_건수'])
     for i,t in enumerate(['00~06','06~11','11~14','14~17','17~21','21~24']):a[i+2]+=int(r[f'시간대_{t}_매출_금액'])
 seen=set();unmapped=set()
 for r in x['records']:
  k=(r['period'],r['code']);require(k not in seen,'Duplicate commerce key');seen.add(k);require([r['sales'],r['transactions'],*r['timeSales']]==raw[k],f'Raw mismatch {k}');require(all(v>=0 for v in raw[k]),'Negative commerce');
  if r['code'] not in dongs:unmapped.add(r['code'])
 require(seen==set(raw),'Raw/published key coverage differs');require(not unmapped,f'Raw equality PASSED for {n} rows -> {len(seen)} records; unmapped historical commerce codes {sorted(unmapped)}')
 return {'rawRows':n,'publishedRows':len(seen),'rawEquality':'All period/dong sales, transactions and six time-band totals exact','salesTotal':sum(v[0] for v in raw.values())}
def migration():
 path=P/'residential-migration.json'
 if not path.exists():return {'status':'not present'}
 x=load(path);seen=set();counts=collections.Counter();levels=collections.Counter();nulls=[];required={'period','code','name','level','inflow','outflow','net'}
 for r in x['records']:
  require(required<=set(r),'Migration required field missing');level=r['level'];code=r['code'];period=r['period'];key=(period,level,code)
  require(level in {'gu','dong'},'Unknown migration spatial level');require(key not in seen,'Duplicate migration period/level/code');seen.add(key)
  require(isinstance(code,str) and code.isdigit() and len(code)==(5 if level=='gu' else 10),'Migration code format inconsistent with level')
  if level=='gu':require(code in districts,'Unmapped migration district')
  else:require(code[:5] in districts,'Dong has unmapped parent district');require(period>='2015','Dong period before source coverage')
  for field in ['inflow','outflow']:
   v=r[field];require(v is None or isinstance(v,(int,float)) and math.isfinite(v) and v>=0,'Invalid migration flow')
  if r['inflow'] is None or r['outflow'] is None:
   require(r['net'] is None,'Missing migration flow must preserve null net');nulls.append(key)
  else:require(r['net']==r['inflow']-r['outflow'],f'Net mismatch {key}')
  counts[(period,level)]+=1;levels[level]+=1
 require(levels=={'gu':625,'dong':4676},f'Unexpected migration level counts {levels}')
 require({p for p,l in counts if l=='gu'}==set(x['periods']),'Gu periods differ from declared coverage')
 require(all(counts[(p,'gu')]==25 for p in x['periods']),'Not 25 gu per period')
 require(counts[('2025','dong')]==427,'2025 dong count must be 427')
 require({p for p,l in counts if l=='dong'}=={str(y) for y in range(2015,2026)},'Wrong dong period coverage')
 # Spatial levels are checked independently. Never add gu totals to dong totals:
 # both represent overlapping populations, and district-internal moves differ in aggregation.
 require(any('함께 더하지' in note for note in x.get('notes',[])),'Missing explicit warning against combining gu and dong totals')
 return {'records':len(seen),'guRecords':levels['gu'],'dongRecords':levels['dong'],'dong2025':counts[('2025','dong')],'nullFlowRecords':len(nulls),'nullKeys':nulls,'netEquality':'all non-missing passed; missing preserved','aggregation':'gu/dong validated separately; no cross-level summation'}

def living():
 x=load(P/'living-mobility.json');seen=set();s=decimal.Decimal(0)
 for r in x['records']:
  k=(r['date'],r['hour'],r['originCode'],r['destinationCode']);require(k not in seen,'Duplicate OD key');seen.add(k);require(0<=r['hour']<24,'Invalid OD hour');require(r['originCode'] in districts|{'outside-seoul'} and r['destinationCode'] in districts|{'outside-seoul'},'Unknown OD district');require(r['count']>=0,'Negative OD count');s+=decimal.Decimal(str(r['count']))
 require(s==decimal.Decimal(x['provenance']['sourceIncludedCountSum']),'OD sum mismatch')
 return {'records':len(seen),'countSum':str(s),'sumEquality':'exact against recorded raw aggregate'}
def boundaries():
 gu=load(P/'districts.geojson');dong=load(P/'dongs.geojson');meta=load(P/'dongs-metadata.json')
 require(len(gu['features'])==25,'Wrong district boundary count')
 require(len(dong['features'])==426,'Wrong dong boundary count')
 codes=[f['properties']['code'] for f in dong['features']]
 require(len(set(codes))==426,'Duplicate dong boundaries')
 for f in dong['features']:
  require(f['properties']['districtCode'] in districts,'Boundary has unknown district')
  require(f['geometry']['type'] in {'Polygon','MultiPolygon'},'Not polygon geometry')
 actual={str(r[2]) for r in load(next((P/'population').glob('250_*.json')))['rows']}
 missing=actual-set(codes)
 require(missing=={'11230515','11230533'},'Unexpected boundary mismatches')
 require(meta['boundaryDate']=='2025-06-30','Boundary reference date changed')
 return {'districts':25,'dongBoundaries':426,'populationMatches':len(actual&set(codes)),'explicitUnmapped':sorted(missing),'referenceDate':meta['boundaryDate']}
def arrival_mobility():
 departure=load(P/'living-mobility.json');x=load(P/'living-mobility-arrival.json');seen=set();total=decimal.Decimal(0)
 for r in x['records']:
  key=(r['date'],r['hour'],r['originCode'],r['destinationCode'])
  require(key not in seen,'Duplicate arrival OD');seen.add(key)
  require(0<=r['hour']<=23,'Invalid arrival hour');require(r['count']>=0,'Negative arrival count')
  total+=decimal.Decimal(str(r['count']))
 require(total==decimal.Decimal(departure['provenance']['sourceIncludedCountSum']),'Arrival and departure totals differ')
 require(x['provenance']['timeBasis']=='arrival','Missing explicit arrival basis')
 require(x['provenance']['calendarArrivalDateVerified'] is False,'Calendar arrival date must remain unverified')
 return {'records':len(seen),'sum':str(total),'basis':'arrival time code; original source date, not verified calendar arrival date'}
check('arrival OD sum and explicit time/date semantics',arrival_mobility)
check('official boundary coverage and explicit mismatches',boundaries)
check('population schema, grid, duplicates, values, mapping',population);check('commerce equality to raw ZIP',commerce);check('residential migration net=inflow-outflow',migration);check('living mobility schema and sums',living)
report={'results':results,'passed':all(r['status']=='passed' for r in results)};print(json.dumps(report,ensure_ascii=False,indent=2));sys.exit(0 if report['passed'] else 1)
