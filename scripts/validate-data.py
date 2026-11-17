#!/usr/bin/env python3
"""Independent validation of published data against schemas and raw commerce."""
import pathlib,json,csv,io,zipfile,collections,math,decimal,sys,gzip,datetime
ROOT=pathlib.Path(__file__).resolve().parents[1];P=ROOT/'public/data';results=[]
def load(path):return json.loads(gzip.decompress(path.read_bytes()).decode() if path.suffix=='.gz' else path.read_text())
def check(name,fn):
 try:detail=fn();results.append({'check':name,'status':'passed','detail':detail})
 except Exception as e:results.append({'check':name,'status':'failed','detail':str(e)})
def require(ok,msg):
 if not ok:raise ValueError(msg)
regions=load(P/'regions.json');districts={r['code'] for r in regions['districts']};dongs={r['code']:r for r in regions['dongs']}
def population():
 idx=load(P/'population/index.json');expected={(datetime.date(2026,1,1)+datetime.timedelta(days=i)).strftime('%Y%m%d') for i in range(316)};require(len(idx)==316,'Expected 316 indexed days through 2026-11-12');require({r['date'] for r in idx}==expected,'Wrong dates');total=0;allcodes=set();nulls=collections.Counter()
 for item in idx:
  path=ROOT/'public'/item['path'];x=load(path);rows=x['rows'];cols=x['columns'];require(len(cols)==32,f'{path.name}: expected 32 fields');require(len(rows)==427*24,f'{path.name}: row count {len(rows)}');require(item['rows']==len(rows),'Index count mismatch');require(item['bytes']==path.stat().st_size,'Index bytes mismatch');keys=set();byhour=collections.Counter()
  for n,r in enumerate(rows):
   require(len(r)==len(cols),f'{path.name} row {n}: field width');require(r[0]==item['date'],'Date mismatch');require(isinstance(r[1],int) and 0<=r[1]<24,'Invalid hour');require(r[2] in dongs,f'Unmapped dong {r[2]}');require(dongs[r[2]]['districtCode'] in districts,'Unmapped district');key=(r[0],r[1],r[2]);require(key not in keys,'Duplicate date/hour/dong');keys.add(key);byhour[r[1]]+=1;allcodes.add(r[2]);require(all(v is None or isinstance(v,(int,float)) and math.isfinite(v) and v>=0 for v in r[3:]),'Negative/non-numeric/non-finite population');require(r[3] is not None,'Missing population total');nulls.update(i for i,v in enumerate(r) if v is None)
  require(set(byhour)==set(range(24)) and set(byhour.values())=={427},'Incomplete hour/dong grid');total+=len(rows)
 require(len(allcodes)==427,'Not 427 population dong codes')
 return {'maskedOrMissingCells':sum(nulls.values()),'nullsByColumnIndex':dict(nulls),'days':len(idx),'rows':total,'fields':32,'dongCodes':len(allcodes),'mappingCoverage':'100%','note':'No assertion that age/sex rounded cells sum exactly to rounded total.'}
def commerce():
 # Independent raw aggregation: do not import the preparation/registration code.
 import hashlib
 x=load(P/'commerce.json');manifest=load(ROOT/'data/dong-sales-2026-manifest.json')
 require(manifest['datasetId']=='OA-22175','Wrong source dataset')
 source=ROOT/manifest['path'];payload=source.read_bytes()
 require(hashlib.sha256(payload).hexdigest()==manifest['sha256'],'2026 raw CSV hash changed')
 require(len(payload)==manifest['bytes'],'2026 raw CSV byte count changed')
 baseline_path=ROOT/'data/raw/commerce/OA-22175_7.zip'
 require(hashlib.sha256(baseline_path.read_bytes()).hexdigest()==manifest['baseline']['sha256'],'2025 ZIP hash changed')
 raw={};source_keys=set();counts=collections.Counter();industries=collections.defaultdict(set)
 fields=['당월_매출_금액','당월_매출_건수',*[f'시간대_{t}_매출_금액' for t in ['00~06','06~11','11~14','14~17','17~21','21~24']]]
 def consume(rows,periods):
  for row in rows:
   if row['기준_년분기_코드'] not in periods:continue
   require(None not in row and None not in row.values() and len(row)==53,'Invalid commerce source width')
   period,code=row['기준_년분기_코드'],row['행정동_코드'];key=(period,code);source_key=(*key,row['서비스_업종_코드'])
   require(source_key not in source_keys,'Duplicate raw quarter/dong/industry');source_keys.add(source_key)
   counts[period]+=1;industries[period].add(row['서비스_업종_코드'])
   if key not in raw:raw[key]={'name':row['행정동_코드_명'],'values':[0]*8}
   target=raw[key]['values']
   for i,field in enumerate(fields):
    cell=row[field].strip();value=None if cell in ('','*','-','\\N','null') else int(cell.replace(',',''))
    require(value is None or value>=0,'Negative raw commerce')
    target[i]=None if value is None or target[i] is None else target[i]+value
 with zipfile.ZipFile(baseline_path) as archive:
  require(archive.testzip() is None,'Bad raw ZIP')
  for name in archive.namelist():
   if not name.endswith('.csv'):continue
   with archive.open(name) as stream:
    reader=csv.DictReader(io.TextIOWrapper(stream,encoding='cp949'));baseline_columns=reader.fieldnames
    consume(reader,{'20251','20252','20253','20254'})
 reader=csv.DictReader(io.StringIO(payload.decode('cp949')))
 require(reader.fieldnames==baseline_columns==manifest['columns'],'CSV/ZIP schema differs')
 all_rows=list(reader);all_counts=collections.Counter(row['기준_년분기_코드'] for row in all_rows)
 require(len(all_rows)==100431 and dict(all_counts)==manifest['periodRows'],'Full CSV count differs')
 consume(all_rows,{'20261','20262'})
 require(dict(counts)=={'20251':16770,'20252':16794,'20253':16831,'20254':16718,'20261':16659,'20262':16659},'Unexpected quarter counts')
 require(all(len(v)==63 for v in industries.values()),'Wrong industry coverage')
 reference_names=collections.defaultdict(set)
 for (period,code),row in raw.items():
  if period.startswith('2025'):reference_names[code].add(row['name'])
 expected=[];name_corrections=[]
 for (period,code),row in raw.items():
  v=row['values'];record={'period':period,'code':code,'name':row['name'],'sales':v[0],'transactions':v[1],'timeSales':v[2:]}
  if period.startswith('2026') and '?' in row['name']:
   require(len(reference_names[code])==1,'Ambiguous same-code 2025 display name')
   display_name=next(iter(reference_names[code]));require('?' not in display_name,'Damaged 2025 reference name')
   record['sourceName']=row['name'];record['name']=display_name
   name_corrections.append({'period':period,'code':code,'sourceName':row['name'],'displayName':display_name,'reference':'same administrative dong code in 2025 official ZIP'})
  expected.append(record)
 require(len(name_corrections)==14 and len({r['code'] for r in name_corrections})==7,'Unexpected display-name correction coverage')
 require(x['provenance']['displayNameCorrections']==name_corrections,'Original/display name provenance differs')
 require(x['sourceVersion']['displayNameVersion']=='2025-same-code-reference-v1','Display name version missing')
 require(len(expected)==2550 and x['records']==expected,'Raw/prepared fields, names, order or key coverage differ')
 require(len({(r['period'],r['code']) for r in x['records']})==2550,'Duplicate prepared commerce key')
 require(len([r for r in expected if r['period'].startswith('2025')])==1700,'2025 coverage changed')
 require(x['periods']==sorted(counts),'Declared periods differ')
 geometry=load(P/'dongs.geojson');geometry_codes={str(f['properties']['code']) for f in geometry['features']}
 coverage={}
 for period in sorted(counts):
  selected=[r for r in expected if r['period']==period];codes={r['code'] for r in selected}
  require(codes<=set(dongs),'Commerce missing region-list join')
  detail={'sourceRows':counts[period],'records':len(selected),'sourceDongCount':len(codes),'industryCount':len(industries[period]),'matchedBoundaryDongCount':len(codes&geometry_codes),'unmatchedBoundaryDongCodes':sorted(codes-geometry_codes),'boundaryWithoutObservationCodes':sorted(geometry_codes-codes)}
  require(detail==x['coverage'][period],f'Coverage mismatch {period}')
  require(len(codes)==425 and len(codes&geometry_codes)==423,'Unexpected geometry coverage')
  require(codes-geometry_codes=={'11680740','11740520'},'Unexpected unmatched source dong')
  require(geometry_codes-codes=={'11680675','11740525','11740526'},'Absent observations changed')
  coverage[period]=detail
 require(x['sourceVersion']['latestPeriod']=='20262','Latest period differs')
 require(x['provenance']['extension2026']==manifest,'Published source manifest differs')
 totals={period:sum(r['sales'] for r in expected if r['period']==period and r['sales'] is not None) for period in sorted(counts)}
 require(totals==x['provenance']['salesSumByPeriod'],'Declared sums differ')
 require(totals['20261']==25721602043376 and totals['20262']==26166677565829,'2026 fixed source checkpoints differ')
 return {'rawRows':sum(counts.values()),'preserved2025RawRows':67113,'added2026RawRows':33318,'publishedRows':len(expected),'preserved2025Records':1700,'rawEquality':'Numeric fields and order exact; 2025 names unchanged; 2026 damaged display names independently resolved by same-code 2025 ZIP with original sourceName preserved','displayNameCorrectedRecords':len(name_corrections),'displayNameCorrectedCodes':7,'periodCoverage':coverage,'salesSumByPeriod':totals,'geometryCompatibility':'Code joins only; actual 2026 geometry not verified'}
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
check('population schema, grid, duplicates, values, mapping',population);check('commerce equality to 2025 ZIP and 2026 CSV',commerce);check('residential migration net=inflow-outflow',migration);check('living mobility schema and sums',living)
report={'results':results,'passed':all(r['status']=='passed' for r in results)};print(json.dumps(report,ensure_ascii=False,indent=2));sys.exit(0 if report['passed'] else 1)
