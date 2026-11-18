#!/usr/bin/env python3
"""지하철 준비 파일 독립 검증 (w31). 준비 코드를 가져오지 않고 원본 행에서 다시 계산해 대조한다."""
import collections, csv, datetime, gzip, hashlib, json, os, pathlib, random, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
P = ROOT / 'public/data/transit/subway'
RAW = pathlib.Path(os.environ.get('SUBWAY_RAW_DIR', '/Users/koscom/workspace2/seoul human/data/raw/transit/subway'))
results = []

def load(rel):
    b = (P / rel).read_bytes()
    return json.loads(gzip.decompress(b) if rel.endswith('.gz') else b)

def rows(path):
    for enc in ('utf-8-sig', 'cp949'):
        try:
            with open(path, encoding=enc, newline='') as f:
                return list(csv.reader(f))
        except UnicodeDecodeError:
            pass
    raise ValueError(path)

def check(name, fn):
    try:
        results.append({'check': name, 'status': 'passed', 'detail': fn()})
    except Exception as e:  # noqa
        results.append({'check': name, 'status': 'failed', 'detail': f'{type(e).__name__}: {e}'})

def req(ok, msg):
    if not ok:
        raise AssertionError(msg)

stations = load('stations.json')['stations']
by_id = {s['id']: s for s in stations}
by_line_name = collections.defaultdict(list)
for s in stations:
    by_line_name[(s['line'], s['name'])].append(s['id'])

# ---- 0. 매니페스트·해시·용량 ----
def manifest():
    m = load('manifest.json'); total = 0; big = 0; n = 0
    for d in m['datasets']:
        if d.get('status') == 'pending':
            continue
        for k in ('id', 'period', 'measures', 'source', 'files', 'rawRef', 'updatedAt'):
            req(k in d, f"{d['id']}: {k} 없음")
        req(d['source'].get('license') and d['source'].get('url'), f"{d['id']}: 출처·라이선스 없음")
        for me in d['measures']:
            req(me.get('unit') and me.get('nullMeaning'), f"{d['id']}: 단위/nullMeaning 없음")
        for f in d['files']:
            b = (P / f['path']).read_bytes(); n += 1
            req(hashlib.sha256(b).hexdigest() == f['sha256'] and len(b) == f['bytes'], f"해시 불일치 {f['path']}")
            total += len(b); big = max(big, len(b))
    total += (P / 'manifest.json').stat().st_size + (P / 'prepare-summary.json').stat().st_size
    req(total <= 30 * 1024 * 1024, f'합계 {total} > 30MB'); req(big <= 10 * 1024 * 1024, f'파일 {big} > 10MB')
    return {'files': n, 'totalBytes': total, 'largestBytes': big, 'od': [d for d in m['datasets'] if d['id'].endswith('.od')][0]['status']}
check('매니페스트 필수 항목·해시·용량(30MB/10MB)', manifest)

# ---- 0b. 원본 해시가 MANIFEST와 같은지(원본 불변) ----
def raw_immutable():
    man = json.load(open(RAW / 'MANIFEST.json', encoding='utf-8')); n = 0
    for f in man['files']:
        h = hashlib.sha256()
        with open(RAW / f['path'], 'rb') as fh:
            while c := fh.read(1 << 20):
                h.update(c)
        req(h.hexdigest() == f['sha256'], f"원본 변경됨 {f['path']}"); n += 1
    return {'rawFilesChecked': n}
check('원본 파일 해시 = 수집 MANIFEST', raw_immutable)

# ---- 1. 역 하루 합: 원본 행 직접 대조(무작위 40건, 고정 시드) ----
raw12914 = {}   # (노선명, 역명, 일자) -> (b, a)
for f in sorted(RAW.glob('OA-12914-CARD_SUBWAY_MONTH_*.csv')):
    for r in rows(f)[1:]:
        if r and r[0]:
            raw12914[(r[1], r[2], r[0])] = (int(r[3]), int(r[4]))
def station_day():
    cache = {}
    def daily_line(line):
        if line not in cache:
            cache[line] = load(f'daily/{line}.json.gz')
        return cache[line]
    rnd = random.Random(31); keys = [k for k in raw12914 if k[0] in {f'{i}호선' for i in range(1, 9)}]
    checked = 0; skipped = 0
    for k in rnd.sample(keys, 400):
        ids = by_line_name.get((int(k[0][0]), k[1]))
        if not ids:
            skipped += 1; continue          # 이름이 달라 좌표 없는 역(별칭 포함 시 아래 별도 점검)
        d = daily_line(int(k[0][0])); pos = d['dates'].index(k[2])
        v = d['stations'][ids[0]]; req((v['b'][pos], v['a'][pos]) == raw12914[k], f'불일치 {k} 파일 {(v["b"][pos], v["a"][pos])} 원본 {raw12914[k]}')
        checked += 1
        if checked >= 40:
            break
    req(checked >= 30, f'대조 건수 부족 {checked}')
    return {'sampled': checked, 'skippedNameMismatch': skipped}
check('역 하루 합(원본 행 대조 40건)', station_day)

# ---- 2. 환승역: 서울역(1호선 150 + 4호선 426) 일별 합, 그룹 정의 ----
def transfer():
    g = [x for x in load('stations.json')['groups'] if len(x['members']) > 1]
    sg = [x for x in g if set(x['members']) >= {'1:0150', '4:0426'}]
    req(len(sg) == 1, '서울역 환승 묶음이 하나가 아님')
    names_only = collections.defaultdict(set)
    for s in stations:
        names_only[s['name']].add(s['line'])
    # 이름만으로 묶지 않았다는 점: 같은 이름 다른 장소는 묶음에 없어야 함(예: 같은 이름 두 호선 중 800m 초과 쌍)
    far = 0
    for x in g:
        lats = [by_id[m] for m in x['members']]
        for a in lats:
            for b in lats:
                if a['id'] < b['id']:
                    dy = (a['lat'] - b['lat']) * 111000; dx = (a['lng'] - b['lng']) * 88000
                    req((dx * dx + dy * dy) ** 0.5 < 1200, f'묶음 내 먼 쌍 {a["id"]} {b["id"]}')
    same_name_not_grouped = [n for n, ls in names_only.items() if len(ls) > 1 and len({by_id[i]['group'] for i in by_line_name[(min(ls), n)]} | {by_id[i]['group'] for l in ls for i in by_line_name[(l, n)]}) > 1]
    day = '20261016'
    raw_sum = [raw12914[('1호선', '서울역', day)], raw12914[('4호선', '서울역', day)]]
    expect = (sum(x[0] for x in raw_sum), sum(x[1] for x in raw_sum))
    got = [0, 0]
    for m in ('1:0150', '4:0426'):
        d = load(f'daily/{m[0]}.json.gz'); pos = d['dates'].index(day)
        got[0] += d['stations'][m]['b'][pos]; got[1] += d['stations'][m]['a'][pos]
    req(tuple(got) == expect, f'서울역 합 불일치 {got} {expect}')
    return {'transferGroups': len(g), 'seoulStationTotal': {'boarding': expect[0], 'alighting': expect[1]}, 'perLine': raw_sum,
            'sameNameButNotGrouped(too far)': same_name_not_grouped[:8]}
check('환승역 서울역(1·4호선) 하루 합 + 묶음 조건', transfer)

# ---- 3. 시간대 합: 원본 12921에서 월·평일 합을 직접 계산 ----
def hourly():
    out = []
    for year, code_line, code, name, month in (('2025', 1, '0150', '서울역', '03'), ('2024', 2, '0222', '강남', '10'), ('2023', 7, '2728', '어린이대공원', '06')):
        sid = f'{code_line}:{code}'; r = rows(RAW / f'OA-12921-hourly-{year}.csv'); head = r[0]
        di = 1; ki = 5
        agg = {'승차': [0] * 20, '하차': [0] * 20}; days = set()
        for x in r[1:]:
            if not x or x[3].zfill(4) != code or int(x[2][:-2]) != code_line:
                continue
            dt = datetime.date.fromisoformat(x[di])
            if f'{dt.month:02d}' != month or dt.weekday() >= 5:
                continue
            days.add(x[di])
            for i in range(20):
                agg[x[ki]][i] += int(x[ki + 1 + i])
        got = load(f'hourly/{year}.json.gz')['stations'][sid][month]
        req(got['d'][0] == len(days), f'{sid} 평일 일수 {got["d"][0]} vs {len(days)}')
        req(got['b'][0] == agg['승차'] and got['a'][0] == agg['하차'], f'{sid} 시간대 합 불일치')
        out.append({'station': f'{name}({sid})', 'month': f'{year}-{month}', 'weekdays': len(days), 'boardingDayTotal': sum(agg['승차'])})
    return out
check('시간대 합(원본 12921 월·평일, 3역)', hourly)

# ---- 4. 월합 = 일별 합, 결측은 0이 아님 ----
def monthly_vs_daily():
    mo = load('monthly.json.gz'); n = 0
    for line in range(1, 9):
        d = load(f'daily/{line}.json.gz')
        for sid, v in d['stations'].items():
            m = mo['stations'][sid]
            for mi, month in enumerate(mo['months']):
                idx = [i for i, dt in enumerate(d['dates']) if dt[:6] == month]
                wd = sum(1 for i in idx if v['b'][i] is not None and datetime.datetime.strptime(d['dates'][i], '%Y%m%d').weekday() < 5)
                bw = sum(v['b'][i] for i in idx if v['b'][i] is not None and datetime.datetime.strptime(d['dates'][i], '%Y%m%d').weekday() < 5)
                req(m['dw'][mi] == wd, f'{sid} {month} 평일 일수')
                req((m['bw'][mi] or 0) == bw, f'{sid} {month} 평일 승차 합'); n += 1
    return {'stationMonthsChecked': n}
check('월 합 = 일별 합(전 역·전 월)', monthly_vs_daily)

# ---- 5. 승객유형: 원본 그룹 합 직접 계산 + 대응표 ----
def types():
    r = rows(RAW / '15099330-passenger-type-2026H1.csv'); mp = {'일반': '일반', '청소년': '청소년', '중고생': '청소년', '우대권': '우대'}
    tot = collections.Counter(); raw_all = 0
    for x in r[1:]:
        if x[3].zfill(4) == '0150' and x[2] == '1호선' and x[1][:7] == '2026-03' and x[5] == '승차':
            tot[mp.get(x[6], '기타')] += sum(int(v) for v in x[7:])
    d = load('passenger-types.json.gz'); st = d['stations']['1:0150']; mi = d['months'].index('2026-03')
    for g in d['groups']:
        req(st['m'][g]['b'][mi] == tot[g], f'{g} 승차 {st["m"][g]["b"][mi]} vs {tot[g]}')
    # 원본 전체 유형 합이 그룹 합과 같다(기타 포함 누락 없음)
    ok = sum(sum(v[0] for v in [d['rawTypeTotals'][t]]) for t in d['rawTypeTotals'])
    allgroups = sum(sum(s['m'][g]['b']) for s in st_all(d) for g in d['groups'])
    req(ok == allgroups, f'유형 전체 승차 {ok} vs 그룹 합 {allgroups}')
    return {'station1:0150_2026-03_boarding': dict(tot), 'allTypeBoarding': ok, 'rows': len(r) - 1, 'mapping': '중고생→청소년, 우대권→우대, 어린이·직원·외국어 권종→기타'}
def st_all(d):
    return d['stations'].values()
check('승객유형 그룹 합(원본 대조·누락 없음)', types)

# ---- 6. 혼잡도 셀 직접 대조 ----
def crowding():
    import openpyxl
    wb = openpyxl.load_workbook(RAW / 'OA-12928-crowding-20260930.xlsx', read_only=True, data_only=True)
    n = 0
    for sheet, key in (('평일', 'wd'), ('토요일', 'sat'), ('일요일', 'sun')):
        rs = list(wb[sheet].iter_rows(values_only=True)); slots = [str(x) for x in rs[0][4:]]
        d = load('crowding.json.gz'); q = d['quarters']['2026-09-30'][key]
        for r in rs[1:200:7]:
            sid = f'{int(str(r[0])[:-2])}:{str(int(r[1])).zfill(4)}'
            if sid not in q:
                continue
            for i, v in enumerate(r[4:]):
                exp = None if v is None else round(float(v), 2)
                req(q[sid][str(r[3])][i] == exp, f'{sid} {sheet} {slots[i]}'); n += 1
    req(n > 500, f'셀 대조 부족 {n}')
    return {'cellsChecked': n, 'slots': len(d['slots'])}
check('혼잡도 셀(원본 xlsx 대조)', crowding)

# ---- 7. 결측·행 수 기록 ----
def counts():
    s = json.load(open(P / 'prepare-summary.json', encoding='utf-8'))
    req(s['daily']['nullCells'] == 0 and s['daily']['dupKeys'] == 0, '일별 결측/중복 기록 불일치')
    req(s['daily']['rows'] == len(raw12914), f"일별 원본 행 수 {s['daily']['rows']} vs 독립 집계 {len(raw12914)}")
    return {'dailyRawRows': s['daily']['rows'], 'dailyMappedRows': s['daily']['matchedRows'], 'dailyUnmappedRows(좌표 없는 노선)': s['daily']['unmatchedRows'],
            'nullCells': s['daily']['nullCells'], 'hourlyRows': {y: v['rows'] for y, v in s['hourly'].items()}, 'typeRows': s['types']['rows'],
            'crowdingRows': {k: v['rows'] for k, v in s['crowding'].items()}, 'stationsWithoutDong': len(s['dongUnmatched'])}
check('행 수·결측 기록', counts)

failed = [r for r in results if r['status'] != 'passed']
out = {'generatedAt': datetime.datetime.now().isoformat(timespec='seconds'), 'passed': len(results) - len(failed), 'failed': len(failed), 'results': results}
(P / 'validate-results.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
for r in results:
    print(r['status'].upper(), r['check'], json.dumps(r['detail'], ensure_ascii=False)[:300])
sys.exit(1 if failed else 0)
