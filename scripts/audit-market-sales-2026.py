#!/usr/bin/env python3
"""Independent raw CSV audit. No preparation or frontend imports; never rewrites data."""
import argparse, collections, csv, datetime, hashlib, io, json, pathlib, zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
RAW=ROOT/'data/raw/commerce'
FIELDS={'sales':7,'transactions':8,'timeSales':slice(18,24),'sexSales':slice(24,26),'ageSales':slice(26,32),'weekdaySales':slice(11,18)}
def number(v):
    return None if v.strip() in ('','*','-',r'\N','null') else int(v.replace(',',''))
def digest(obj):
    return hashlib.sha256(json.dumps(obj,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def read_rows(path):
    if path.suffix=='.zip':
        with zipfile.ZipFile(path) as z:
            with io.TextIOWrapper(z.open(next(n for n in z.namelist() if n.endswith('.csv'))),encoding='cp949',newline='') as f:
                r=csv.reader(f);header=next(r);return header,list(r)
    with path.open(encoding='cp949',newline='') as f:
        r=csv.reader(f);header=next(r);return header,list(r)
def key(r):return r[0],r[3],r[5]
def prepared(r):
    return dict(period=r[0],areaCode=r[3],industryCode=r[5],industryName=r[6],**{field:[number(v) for v in r[col]] if isinstance(col,slice) else number(r[col]) for field,col in FIELDS.items()})
def safe_sum(values):
    return sum(values) if values and all(v is not None for v in values) else None
def checkpoint(rows,code,period,industry=None):
    selected=[r for r in rows if r[0]==period and r[3]==code and (industry is None or r[5]==industry)]
    return {'rows':len(selected),'sales':safe_sum([number(r[7]) for r in selected]),'time17to21':safe_sum([number(r[22]) for r in selected]),'female':safe_sum([number(r[25]) for r in selected]),'age30':safe_sum([number(r[28]) for r in selected])}
def main():
    p=argparse.ArgumentParser();p.add_argument('--output',type=pathlib.Path,default=ROOT/'docs/evidence/market-sales-2026/independent-data-audit.json');p.add_argument('--baseline',type=pathlib.Path,default=pathlib.Path('/tmp/seoul-market-sales-2025-audit-baseline.json'));args=p.parse_args()
    old_path=RAW/'OA-15572_51.zip';new_path=RAW/'market-sales-2026-public-download.csv'
    old_header,old=read_rows(old_path);new_header,download=read_rows(new_path);assert old_header==new_header and len(new_header)==55
    assert all(len(r)==55 for r in old+download)
    manifest=json.loads((RAW/'market-sales-2026-public-download.manifest.json').read_text());assert hashlib.sha256(new_path.read_bytes()).hexdigest()==manifest['sha256']
    assert len({key(r) for r in old})==len(old);assert len({key(r) for r in download})==len(download)
    old_index={key(r):r for r in old};old_again={key(r):r for r in download if r[0].startswith('2025')};assert set(old_index)==set(old_again), '2025 key sets changed'
    old_download_differences=[{'key':k,'columns':[i for i,(a,b) in enumerate(zip(r,old_again[k])) if a!=b]} for k,r in old_index.items() if r!=old_again[k]]
    assert all(prepared(r)==prepared(old_again[k]) for k,r in old_index.items()), '2025 exposed numeric values changed in download'
    new=[r for r in download if r[0] in ('20261','20262')];assert len(new)==42321
    data=json.loads((ROOT/'public/data/market-sales.json').read_text());index={(r['period'],r['areaCode'],r['industryCode']):r for r in data['records']};assert len(index)==len(data['records'])
    all_raw=old+new;assert set(index)=={key(r) for r in all_raw},'Prepared periods or key sets differ'
    mismatches=[]
    for row in all_raw:
        expected=prepared(row)
        if index[key(row)]!=expected:mismatches.append(key(row))
    assert not mismatches,f'Raw/prepared mismatch: {mismatches[:10]}'
    baseline_source='session snapshot' if args.baseline.exists() else 'independent normalization of original 2025 ZIP'
    before=json.loads(args.baseline.read_text()) if args.baseline.exists() else [prepared(r) for r in old];now=[r for r in data['records'] if r['period'].startswith('2025')];assert before==now,'Existing 2025 prepared rows changed'
    geo=json.loads((ROOT/'public/data/market-areas.geojson').read_text());areas={f['properties']['code']:f['properties'] for f in geo['features']};assert len(areas)==len(geo['features'])==1650
    numeric_types=collections.Counter();nulls=0;negative=[]
    for r in data['records']:
        for field in FIELDS:
            for value in r[field] if isinstance(r[field],list) else [r[field]]:
                numeric_types[type(value).__name__]+=1
                if value is None:nulls+=1
                elif type(value) is not int or value<0:negative.append((r['period'],r['areaCode'],field,value))
    assert not negative
    metadata_changes=[]
    for r in new:
        area=areas.get(r[3]);assert area is not None,'Unmatched code must be disclosed; no zero/fallback allowed'
        if (r[1],r[2],r[4])!=(area['typeCode'],area['type'],area['name']):metadata_changes.append({'code':r[3],'raw':[r[1],r[2],r[4]],'geometry':[area['typeCode'],area['type'],area['name']]})
    prepared_areas={a['code']:a for a in data['areas']};mapping_changes=[c for c,a in prepared_areas.items() if c not in areas or (a['gu'],a['dong'])!=(areas[c]['gu'],areas[c]['dong'])]
    names={name:next(c for c,a in areas.items() if name in a['name']) for name in ['종로3가역','강남역','공덕역']};names['긴 이름']=max(areas,key=lambda c:len(areas[c]['name']))
    checkpoints={}
    for label,code in names.items():
        periods={period:{'allIndustries':checkpoint(all_raw,code,period),'CS100001':checkpoint(all_raw,code,period,'CS100001')} for period in ['20251','20252','20254','20261','20262']}
        for scope in ['allIndustries','CS100001']:
            current=periods['20262'][scope];base=periods['20252'][scope]
            periods.setdefault('Q2yearOverYear',{})[scope]={field:current[field]-base[field] if current[field] is not None and base[field] is not None else None for field in ['sales','time17to21','female','age30']}
        for scope in ['allIndustries','CS100001']:
            current=periods['20261'][scope];base=periods['20251'][scope]
            periods.setdefault('Q1yearOverYear',{})[scope]={field:current[field]-base[field] if current[field] is not None and base[field] is not None else None for field in ['sales','time17to21','female','age30']}
        checkpoints[label]={'code':code,'name':areas[code]['name'],'districtCode':areas[code]['gu'],'dongCode':areas[code]['dong'],'periods':periods}
    invalid_geometry={'status':'not_run','reason':'Shapely unavailable; no shape-validity claim'}
    try:
        from shapely.geometry import shape
        from shapely.validation import explain_validity
        bad=[{'code':f['properties']['code'],'reason':explain_validity(shape(f['geometry']))} for f in geo['features'] if not shape(f['geometry']).is_valid]
        invalid_geometry={'status':'checked','invalidCount':len(bad),'features':bad}
    except ImportError:pass
    report={'status':'passed','checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'redownload2025TextDifferences':old_download_differences,'rawDownloadRows':len(download),'rawRowsByPeriod':dict(sorted(collections.Counter(r[0] for r in download).items())),'preparedRows':len(index),'allNumericFieldsExact':True,'duplicateKeys':0,'baselineSource':baseline_source,'baseline2025Rows':len(before),'baseline2025Digest':digest(before),'unchanged2025':True,'nullNumericCells':nulls,'numericTypes':dict(numeric_types),'negativeOrWrongTypeCells':negative,'geometryAreasWithoutSalesByPeriod':{period:sorted(set(areas)-{r[3] for r in new if r[0]==period}) for period in ['20261','20262']},'new2026Codes':sorted({r[3] for r in new}-{r[3] for r in old}),'missingGeometryCodes':sorted({r[3] for r in new}-set(areas)),'rawVsGeometryMetadataChanges':list({digest(x):x for x in metadata_changes}.values()),'preparedGuDongVsGeometryChanges':mapping_changes,'geometryValidity':invalid_geometry,'checkpoints':checkpoints,'limitations':['2023 geometry code match does not prove 2026 boundary shape, administrative affiliation or name unchanged.','Sales source has no gu/dong columns: these remain representative 2023 geometry metadata, not independently verified 2026 administrative mapping.','Overlapping markets must not be summed as unique consumption.','Missing/hidden values are null; dimensions are independent marginals, never demographic cross-tabs.','Only supported numeric fields are compared; 55-column source retains transaction marginals not exposed by prepared schema.','Browser interactions and deployed page not tested by this script.'],'files':{str(path.relative_to(ROOT)):hashlib.sha256(path.read_bytes()).hexdigest() for path in [old_path,new_path,ROOT/'public/data/market-sales.json',ROOT/'public/data/market-areas.geojson']}}
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({k:report[k] for k in ['status','preparedRows','unchanged2025','missingGeometryCodes','rawVsGeometryMetadataChanges']},ensure_ascii=False))
if __name__=='__main__':main()
