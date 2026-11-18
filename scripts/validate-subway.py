#!/usr/bin/env python3
"""지하철 준비 파일 독립 검증 (w31). 준비 코드를 가져오지 않고 원본 행에서 다시 계산해 대조한다."""
import collections, csv, datetime, gzip, hashlib, json, os, pathlib, random, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
P = pathlib.Path(os.environ.get('SUBWAY_PREPARED_DIR', ROOT / 'public/data/transit/subway'))
RESULT_PATH = pathlib.Path(os.environ.get('SUBWAY_VALIDATE_OUT', P / 'validate-results.json'))
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


# ---- 8. (w41) 이름 기준 독립 대조: 원본 3종의 행을 (호선, 역명)으로 모아 준비 파일의 같은 역 값과 전부 비교 ----
# 준비 코드와 무관하게 이 파일 안에서 따로 정규화한다. 좌표 파일과 원본 3종의 외부역코드가 6호선에서 한 칸 어긋나 있으므로(w35) 코드로 연결하지 않는다.
import re
def nm(s):
    s = re.sub(r'\(.*?\)', '', str(s).replace(' ', ''))
    return s[:-1] if s.endswith('역') and len(s) > 2 else s
RENAMED = {(7, '이수'): '총신대입구', (7, '자양(뚝섬한강공원)'): '뚝섬유원지', (4, '불암산'): '당고개'}   # 좌표 파일 이름
by_ln = collections.defaultdict(list)
for s in stations:
    by_ln[(s['line'], nm(s['name']))].append(s['id'])
def sid_by_name(line, name):
    key = RENAMED.get((line, name), name)
    ids = by_ln.get((line, nm(key)), [])
    return ids[0] if len(ids) == 1 else None

def name_hourly():
    cells = 0; unresolved = collections.Counter()
    for year in (2023, 2024, 2025):
        r = rows(RAW / f'OA-12921-hourly-{year}.csv'); acc = {}
        for x in r[1:]:
            if len(x) < 26 or not x[2].endswith('호선') or int(x[3]) >= 9000:
                continue
            line = int(x[2][:-2]); sid = sid_by_name(line, x[4])
            if sid is None:
                unresolved[(x[2], x[4])] += 1; continue
            dt = datetime.date.fromisoformat(x[1]); k = 1 if dt.weekday() >= 5 else 0
            rec = acc.setdefault((sid, f'{dt.month:02d}'), {'d': [set(), set()], 'b': [[0] * 20, [0] * 20], 'a': [[0] * 20, [0] * 20]})
            rec['d'][k].add(x[1]); tgt = rec['b' if x[5] == '승차' else 'a'][k]
            for i in range(20):
                tgt[i] += int(x[6 + i])
        got = load(f'hourly/{year}.json.gz')['stations']
        for (sid, mo), rec in acc.items():
            g = got[sid][mo]
            req(g['b'] == rec['b'] and g['a'] == rec['a'], f'{year} {sid} {by_id[sid]["name"]} {mo} 시간대 값이 이름 기준 원본과 다름')
            req(g['d'] == [len(rec['d'][0]), len(rec['d'][1])], f'{year} {sid} {mo} 관측 일수'); cells += 1
        extra = [(sid, mo) for sid, ms in got.items() for mo in ms if (sid, mo) not in acc]
        req(not extra, f'{year} 원본에 없는 준비 항목 {extra[:3]}')
    return {'stationMonthsCompared(2023~2025)': cells, 'unresolvedNamesSkipped': {f'{k[0]} {k[1]}': v for k, v in unresolved.items()}}
check('시간대: 이름 기준 원본 대조(전 역·전 월, 20개 구간 배열 전부)', name_hourly)

def name_types():
    r = rows(RAW / '15099330-passenger-type-2026H1.csv'); mp = {'일반': '일반', '청소년': '청소년', '중고생': '청소년', '우대권': '우대'}
    d = load('passenger-types.json.gz'); months = d['months']; acc = {}; unresolved = collections.Counter()
    for x in r[1:]:
        if len(x) < 27 or not x[2].endswith('호선') or int(x[3]) >= 9000:
            continue
        sid = sid_by_name(int(x[2][:-2]), x[4])
        if sid is None:
            unresolved[(x[2], x[4])] += 1; continue
        g = mp.get(x[6], '기타'); k = 'b' if x[5] == '승차' else 'a'; mi = months.index(x[1][:7])
        a = acc.setdefault((sid, g, k), [0] * len(months)); a[mi] += sum(int(v) for v in x[7:27])
    cells = 0
    for (sid, g, k), arr in acc.items():
        req(d['stations'][sid]['m'][g][k] == arr, f'{sid} {by_id[sid]["name"]} {g} {k} 유형 합이 이름 기준 원본과 다름'); cells += 1
    return {'stationGroupKindsCompared': cells, 'unresolvedNamesSkipped': {f'{k[0]} {k[1]}': v for k, v in unresolved.items()}}
check('승객유형: 이름 기준 원본 대조(전 역·그룹·월)', name_types)

def name_crowding():
    import openpyxl
    d = load('crowding.json.gz'); n = 0; vec_names = 0
    for qd, fn in (('2026-06-30', 'OA-12928-crowding-20260630.xlsx'), ('2026-09-30', 'OA-12928-crowding-20260930.xlsx')):
        wb = openpyxl.load_workbook(RAW / fn, read_only=True, data_only=True)
        for sheet, key in (('평일', 'wd'), ('토요일', 'sat'), ('일요일', 'sun')):
            it = wb[sheet].iter_rows(values_only=True); head = list(next(it)); ci = {h: i for i, h in enumerate(head)}; s0 = head.index('05:30~06:00')
            q = d['quarters'][qd][key]; vec = {}
            for r in it:
                if r[ci['호선']] is None or not str(r[ci['호선']]).endswith('호선') or int(r[ci['역번호']]) >= 9000:
                    continue
                line = int(str(r[ci['호선']])[:-2]); sid = sid_by_name(line, r[ci['역명']])
                if sid is None:
                    continue
                exp = [None if v is None else round(float(v), 2) for v in r[s0:]]
                req(q[sid][str(r[ci['상하구분']])] == exp, f'{qd} {key} {sid} {by_id[sid]["name"]} {r[ci["상하구분"]]} 혼잡도 값이 이름 기준 원본과 다름'); n += 1
                if key == 'wd' and r[ci['상하구분']] == '상선':
                    vec.setdefault(tuple(exp), set()).add((line, nm(RENAMED.get((line, r[ci['역명']]), r[ci['역명']]))))
            # 값 벡터로 되짚기: 준비 파일의 각 역 값은 원본에서 같은 이름의 행에서 온 것이어야 한다(승하차 역 이름과 같은지)
            for sid, dirs in q.items():
                if key == 'wd' and '상선' in dirs and tuple(dirs['상선']) in vec:
                    cand = vec[tuple(dirs['상선'])]      # 값이 같은 원본 행이 여럿(종점 등)이면 그 중 하나가 이름이 같으면 된다
                    req((by_id[sid]['line'], nm(by_id[sid]['name'])) in cand, f'{qd} {sid} {by_id[sid]["name"]}의 혼잡도 값이 원본의 다른 이름 역{sorted(cand)}에서 옴'); vec_names += 1
    return {'cellRowsCompared': n, 'crowdingStationsNameChecked(값→원본 이름)': vec_names}
check('혼잡도: 이름 기준 원본 대조 + 승하차 역 이름과 같은지', name_crowding)

# ---- 9. (w41) 일별 합 ↔ 시간대 합 교차 검사 (준비 파일 안에서) ----
# 같은 역·월의 평일 승차(하차) 합을 일별(OA-12914)과 시간대(OA-12921) 두 원본에서 따로 구해 비교한다. 코드 어긋남이 있으면 다른 역의 값끼리 비교되어 크게 어긋난다.
def cross_daily_hourly():
    import statistics
    mo = load('monthly.json.gz'); mi = {m: i for i, m in enumerate(mo['months'])}; per = collections.defaultdict(list); cells = 0; skipped_small = 0
    for year in (2023, 2024, 2025):
        for sid, months in load(f'hourly/{year}.json.gz')['stations'].items():
            m = mo['stations'].get(sid)
            if not m:
                continue
            for mm, rec in months.items():
                i = mi[f'{year}{mm}']
                for hk, mk in (('b', 'bw'), ('a', 'aw')):
                    if None in rec[hk][0] or m[mk][i] is None:
                        continue
                    hv, mv = sum(rec[hk][0]), m[mk][i]
                    if mv < 1000:
                        skipped_small += 1; continue      # 한 달 평일 합이 1000 미만인 역-월(환승 집계로 거의 비어 있는 역)은 비율이 의미 없다
                    per[sid].append(abs(hv - mv) / mv); cells += 1
    med = {sid: statistics.median(v) for sid, v in per.items()}
    bad = {sid: round(v, 3) for sid, v in med.items() if v > 0.10}
    # 두 원본이 원래 크게 다른 역은 같은 이름 기준으로 원본에서 직접 계산한 차이와 같을 때만 허용한다.
    explained = {}
    if bad:
        raw_h = collections.defaultdict(lambda: collections.defaultdict(int)); raw_dd = collections.defaultdict(lambda: collections.defaultdict(int))
        for year in (2023, 2024, 2025):
            for x in rows(RAW / f'OA-12921-hourly-{year}.csv')[1:]:
                if len(x) > 25 and x[2].endswith('호선') and datetime.date.fromisoformat(x[1]).weekday() < 5:
                    sid = sid_by_name(int(x[2][:-2]), x[4])
                    if sid in bad:
                        raw_h[sid][(x[1][:7].replace('-', ''), x[5])] += sum(int(v) for v in x[6:26])
        for k, (b, a) in raw12914.items():
            if k[0].endswith('호선') and k[0][:-2].isdigit() and datetime.datetime.strptime(k[2], '%Y%m%d').weekday() < 5 and k[2][:4] in ('2023', '2024', '2025'):
                sid = sid_by_name(int(k[0][:-2]), k[1])
                if sid in bad:
                    raw_dd[sid][(k[2][:6], '승차')] += b; raw_dd[sid][(k[2][:6], '하차')] += a
        for sid in list(bad):
            diffs = [abs(raw_h[sid][m] - raw_dd[sid][m]) / raw_dd[sid][m] for m in raw_dd[sid] if raw_dd[sid][m] >= 1000 and m in raw_h[sid]]
            med_raw = statistics.median(diffs) if diffs else None
            if med_raw is not None and abs(med_raw - bad[sid]) < 0.02:
                explained[sid] = {'name': by_id[sid]['name'], 'preparedMedianDiff': bad[sid], 'rawByNameMedianDiff': round(med_raw, 3)}
    unexplained = {sid: v for sid, v in bad.items() if sid not in explained}
    req(not unexplained, f'일별 합과 시간대 합이 크게 다른 역 {len(unexplained)}개: {dict(list(unexplained.items())[:6])}')
    over2 = sum(1 for v in per.values() for d in v if d > 0.02) / cells
    req(over2 <= 0.10, f'2% 넘게 다른 역-월 비율 {over2:.3f}')
    return {'stationMonthCells': cells, 'smallMonthsSkipped(<1000)': skipped_small, 'share>2%': round(over2, 4), 'stationsMedianDiff>10%': len(bad),
            'explainedBySource': explained, 'toleranceNote': '시간대(OA-12921)와 일별(OA-12914)은 같은 역이라도 집계 차이로 중앙값 0.5%, 드물게 수% 어긋난다. 코드가 한 칸 어긋난 6호선은 역 중앙값 차이가 수십~수천 %가 된다.'}
check('교차: 같은 역·월의 일별 합 ↔ 시간대 합(평일 승·하차)', cross_daily_hourly)

failed = [r for r in results if r['status'] != 'passed']
out = {'generatedAt': datetime.datetime.now().isoformat(timespec='seconds'), 'passed': len(results) - len(failed), 'failed': len(failed), 'results': results}
RESULT_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
for r in results:
    print(r['status'].upper(), r['check'], json.dumps(r['detail'], ensure_ascii=False)[:300])
sys.exit(1 if failed else 0)
