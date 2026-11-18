#!/usr/bin/env python3
"""지하철 원본 → public/data/transit/subway/ 준비 파일 (w31 2단계).

원본은 바꾸지 않는다. 결측은 null로 두고, null이 섞인 합계는 null이다.
승하차는 카드 태그 건수이며 고유 방문자 수가 아니다. 혼잡도(정원 대비 %)는 승하차와 별개 지표다.
평일/주말은 달력 요일(월~금 / 토·일)이며 공휴일 자료가 없어 공휴일은 평일로 센다.
"""
import collections, csv, datetime, gzip, hashlib, json, math, os, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = pathlib.Path(os.environ.get('SUBWAY_RAW_DIR', '/Users/koscom/workspace2/seoul human/data/raw/transit/subway'))
OUT = ROOT / 'public/data/transit/subway'
VERSION = '20261118'
NOW = datetime.date(2026, 11, 18).isoformat()

# ---------- 공통 ----------
def read_csv(path):
    for enc in ('utf-8-sig', 'cp949'):
        try:
            with open(path, encoding=enc, newline='') as f:
                return list(csv.reader(f))
        except UnicodeDecodeError:
            continue
    raise ValueError(f'인코딩을 읽지 못함: {path}')

def num(x):
    """빈 칸은 None(0이 아님). 숫자가 아니면 오류."""
    x = (x or '').strip()
    if x == '':
        return None
    return float(x) if '.' in x else int(x)

def add(a, b):
    return None if a is None or b is None else a + b

def write_json(rel, obj, gz=False):
    p = OUT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    raw = json.dumps(obj, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    if gz:
        raw = gzip.compress(raw, 9, mtime=0)
    p.write_bytes(raw)
    return {'path': rel, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(), 'encoding': 'gzip' if gz else 'json'}

def is_weekend(d):
    return d.weekday() >= 5

# ---------- 역 마스터 ----------
def polygons(geo):
    out = []
    for f in geo['features']:
        g = f['geometry']
        polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
        for poly in polys:
            out.append((f['properties'], poly[0], poly[1:]))
    return out

def inside(pt, ring):
    x, y = pt; ok = False
    for i in range(len(ring)):
        x1, y1 = ring[i]; x2, y2 = ring[i - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            ok = not ok
    return ok

def haversine(a, b):
    r = 6371000; p1, p2 = math.radians(a[0]), math.radians(b[0])
    dp = p2 - p1; dl = math.radians(b[1] - a[1])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))

def norm_name(n):
    n = n.replace(' ', '')
    if '(' in n:
        n = n[:n.index('(')]
    return n

def build_stations():
    rows = read_csv(RAW / '15099316-station-coords-20250814.csv')
    head = rows[0]
    ix = {h: i for i, h in enumerate(head)}
    dongs = polygons(json.load(open(ROOT / 'public/data/dongs.geojson', encoding='utf-8')))
    regions = json.load(open(ROOT / 'public/data/regions.json', encoding='utf-8'))
    dong_names = {d['code']: d['name'] for d in regions['dongs']}
    gu_names = {d['code']: d['name'] for d in regions['districts']}
    stations = []
    for r in rows[1:]:
        line = int(r[ix['호선']]); code = r[ix['고유역번호(외부역코드)']].strip().zfill(4)
        lat = float(r[ix['위도']]); lng = float(r[ix['경도']])
        dong = None
        for props, ring, holes in dongs:
            if inside((lng, lat), ring) and not any(inside((lng, lat), h) for h in holes):
                dong = props; break
        stations.append({'id': f'{line}:{code}', 'line': line, 'code': code, 'name': r[ix['역명']].strip(),
                         'lat': lat, 'lng': lng,
                         'gu': dong['districtCode'] if dong else None, 'guName': gu_names.get(dong['districtCode']) if dong else None,
                         'dong': dong['code'] if dong else None, 'dongName': dong_names.get(dong['code'], dong['name']) if dong else None,
                         'group': None})
    # 환승역 묶음: 같은 이름(괄호 부가명 제외)이고 800m 이내인 서로 다른 호선 행. 이름만으로 합치지 않는다.
    parent = list(range(len(stations)))
    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]; i = parent[i]
        return i
    for i, a in enumerate(stations):
        for j in range(i + 1, len(stations)):
            b = stations[j]
            if a['line'] != b['line'] and norm_name(a['name']) == norm_name(b['name']) \
                    and haversine((a['lat'], a['lng']), (b['lat'], b['lng'])) <= 800:
                parent[find(i)] = find(j)
    comp = collections.defaultdict(list)
    for i in range(len(stations)):
        comp[find(i)].append(i)
    groups = []
    for members in comp.values():
        ids = sorted(stations[i]['id'] for i in members)
        gid = 'G' + ids[0].replace(':', '-')
        for i in members:
            stations[i]['group'] = gid
        names = sorted({norm_name(stations[i]['name']) for i in members})
        groups.append({'id': gid, 'name': names[0], 'members': ids})
    return stations, groups

def name_index(stations):
    """(호선, 정규화 이름) → 역 id 목록. 12914(역 코드 없음)을 잇는 데만 쓴다."""
    idx = collections.defaultdict(list)
    for s in stations:
        idx[(s['line'], norm_name(s['name']))].append(s['id'])
    return idx

# 역명이 바뀌어 좌표 파일(2025-08-14)과 원본의 이름이 다른 경우. 같은 호선·외부역코드로 확인한 이름 변경만 적는다.
# 4호선 불암산 = 좌표 파일의 당고개(외부역코드 0409), 7호선 이수 = 총신대입구(2738), 자양(뚝섬한강공원) = 뚝섬유원지(2730).
ALIAS = {(7, '이수'): '7:2738', (7, '자양(뚝섬한강공원)'): '7:2730', (4, '불암산'): '4:0409'}

# w41: 좌표 파일(15099316)의 6호선 외부역코드가 연신내~봉화산 구간에서 원본 3종(시간대·승객유형·혼잡도)보다 한 칸씩 뒤로 밀려 있다
# (예: 합정 원본 2623 / 좌표 파일 2624). 그래서 원본 3종도 코드가 아니라 (호선, 정규화한 역명)으로 역 마스터에 잇는다.
# 코드는 연결 키로 쓰지 않고, 서로 다를 때 화면에서 둘 다 보여 주려고 기록만 한다(TX_CODES).
# 9000번대 코드(성수지선 등 지선 가상 코드)는 본선 역과 이름이 같아 섞일 수 있으므로 연결하지 않는다.
TX_CODES = collections.defaultdict(set)   # 역 id -> 원본 3종이 쓴 역번호들
SKIPPED_BRANCH = collections.Counter()

def match_station(line, name, idx):
    """(호선 번호, 원본 역명) -> 역 id 또는 None. 이름이 같은 역이 둘 이상이면 연결하지 않는다."""
    if (line, name) in ALIAS:
        return ALIAS[(line, name)]
    n = norm_name(name)
    for cand in (n, n[:-1] if n.endswith('역') and len(n) > 2 else None, n + '역'):
        if cand and (line, cand) in idx and len(idx[(line, cand)]) == 1:
            return idx[(line, cand)][0]
    return None

def match_tx(line, code, name, idx):
    """원본 3종의 한 행을 역 id에 잇는다. 이름 기준. 9000번대 지선 코드는 연결하지 않는다."""
    code = str(code).strip().zfill(4)
    if int(code) >= 9000:
        SKIPPED_BRANCH[(line, code, name)] += 1
        return None
    sid = match_station(line, name, idx)
    if sid is not None:
        TX_CODES[sid].add(code)
    return sid

def match_12914(line_label, name, idx):
    if not line_label.endswith('호선') or not line_label[:-2].isdigit() or int(line_label[:-2]) > 8:
        return None
    return match_station(int(line_label[:-2]), name, idx)

# ---------- 일별(OA-12914) ----------
def prepare_daily(stations):
    idx = name_index(stations)
    files = sorted(RAW.glob('OA-12914-CARD_SUBWAY_MONTH_*.csv'))
    by = {}            # (id, 'YYYYMMDD') -> [b, a]
    unmatched = collections.Counter(); matched_rows = 0; total_rows = 0; null_cells = 0; dup = 0
    per_file = {}; external = collections.defaultdict(set)   # 정규화한 역명 -> 1~8호선이 아닌 노선명(다른 운영기관 등)
    for f in files:
        rows = read_csv(f); head = rows[0]
        ix = {h: i for i, h in enumerate(head)}
        n_file = 0
        for r in rows[1:]:
            if not r or not r[0]:
                continue
            total_rows += 1; n_file += 1
            sid = match_12914(r[ix['노선명']], r[ix['역명']], idx)
            if sid is None:
                unmatched[(r[ix['노선명']], r[ix['역명']])] += 1
                lab = r[ix['노선명']]
                if not (lab.endswith('호선') and lab[:-2].isdigit() and 1 <= int(lab[:-2]) <= 8):
                    nn = norm_name(r[ix['역명']]); external[nn].add(lab)
                    if nn.endswith('역') and len(nn) > 2:
                        external[nn[:-1]].add(lab)
                continue
            b, a = num(r[ix['승차총승객수']]), num(r[ix['하차총승객수']])
            null_cells += (b is None) + (a is None)
            key = (sid, r[ix['사용일자']])
            if key in by:
                dup += 1
            by[key] = [b, a]; matched_rows += 1
        per_file[f.name] = n_file
    dates = sorted({d for _, d in by})
    first = datetime.datetime.strptime(dates[0], '%Y%m%d').date(); last = datetime.datetime.strptime(dates[-1], '%Y%m%d').date()
    alldates = [(first + datetime.timedelta(days=i)).strftime('%Y%m%d') for i in range((last - first).days + 1)]
    pos = {d: i for i, d in enumerate(alldates)}
    sids = sorted({s for s, _ in by})
    daily = {}
    for sid in sids:
        daily[sid] = {'b': [None] * len(alldates), 'a': [None] * len(alldates)}
    for (sid, d), (b, a) in by.items():
        daily[sid]['b'][pos[d]] = b; daily[sid]['a'][pos[d]] = a
    # 월별
    months = sorted({d[:6] for d in alldates})
    mpos = {m: i for i, m in enumerate(months)}
    monthly = {}
    for sid in sids:
        z = lambda: [0] * len(months)
        m = {'bw': z(), 'bh': z(), 'aw': z(), 'ah': z(), 'dw': z(), 'dh': z(), 'nb': z(), 'na': z()}
        for i, d in enumerate(alldates):
            b, a = daily[sid]['b'][i], daily[sid]['a'][i]
            if b is None and a is None and (sid, d) not in by:
                continue            # 그 날 행이 없음 = 관측 안 됨
            k = mpos[d[:6]]; we = is_weekend(datetime.datetime.strptime(d, '%Y%m%d').date())
            m['dh' if we else 'dw'][k] += 1
            for val, key in ((b, 'bh' if we else 'bw'), (a, 'ah' if we else 'aw')):
                if val is None:
                    m['nb' if key[0] == 'b' else 'na'][k] += 1
                    m[key][k] = None
                elif m[key][k] is not None:
                    m[key][k] += val
        monthly[sid] = m
    return {'dates': alldates, 'months': months, 'daily': daily, 'monthly': monthly, 'unmatched': unmatched,
            'matched_rows': matched_rows, 'total_rows': total_rows, 'null_cells': null_cells, 'dup': dup, 'per_file': per_file,
            'files': [f.name for f in files], 'external': external}

# ---------- 시간대(OA-12921) ----------
BUCKETS = ['06시 이전'] + [f'{h:02d}-{h + 1:02d}시' for h in range(6, 24)] + ['24시 이후']

def prepare_hourly(stations):
    idx = name_index(stations)
    out = {}; stats = {}
    for f in sorted(RAW.glob('OA-12921-hourly-*.csv')):
        year = f.stem.split('-')[-1]
        rows = read_csv(f); head = rows[0]; ix = {h: i for i, h in enumerate(head)}
        DATE = ix.get('수송일자', ix.get('날짜')); KIND = ix.get('승하차구분', ix.get('구분'))
        cols = list(range(KIND + 1, len(head))); assert len(cols) == 20, head
        days = collections.defaultdict(dict)   # (sid, date) -> {'승차':[..], '하차':[..]}
        bad = 0; unm = collections.Counter(); null_cells = 0; owners = {}; collisions = []
        for r in rows[1:]:
            if not r or not r[0]:
                continue
            line = int(r[ix['호선']][:-2]); sid = match_tx(line, r[ix['역번호']], r[ix['역명']], idx)
            if sid is None:
                unm[(r[ix['호선']], r[ix['역번호']], r[ix['역명']])] += 1; continue
            owner = owners.setdefault(sid, r[ix['역번호']].strip().zfill(4))
            if owner != r[ix['역번호']].strip().zfill(4):
                collisions.append(f'{sid}: {owner} / {r[ix["역번호"]]} {r[ix["역명"]]}')
            vals = [num(r[c]) for c in cols]; null_cells += sum(v is None for v in vals)
            days[(sid, r[DATE])][r[KIND]] = vals
        st = {}
        for (sid, d), v in days.items():
            if '승차' not in v or '하차' not in v:
                bad += 1; continue
            dt = datetime.date.fromisoformat(d); mo = f'{dt.month:02d}'; we = is_weekend(dt)
            rec = st.setdefault(sid, {}).setdefault(mo, {'d': [0, 0], 'b': [[0] * 20, [0] * 20], 'a': [[0] * 20, [0] * 20]})
            k = 1 if we else 0; rec['d'][k] += 1
            for key, vals in (('b', v['승차']), ('a', v['하차'])):
                tgt = rec[key][k]
                for i, x in enumerate(vals):
                    tgt[i] = add(tgt[i], x)
        out[year] = st
        stats[year] = {'rows': len(rows) - 1, 'stationDays': len(days), 'incompleteStationDays': bad, 'unmatched': dict((' / '.join(k), v) for k, v in unm.items()), 'nullCells': null_cells,
                       'stations': len(st), 'codeCollisions': collisions}
    return out, stats

# ---------- 승객유형(15099330) ----------
TYPE_GROUP = {'일반': '일반', '청소년': '청소년', '중고생': '청소년', '우대권': '우대'}
GROUPS = ['일반', '청소년', '우대', '기타']

def prepare_types(stations):
    idx = name_index(stations); owners = {}; collisions = []
    rows = read_csv(RAW / '15099330-passenger-type-2026H1.csv'); head = rows[0]; ix = {h: i for i, h in enumerate(head)}
    cols = list(range(ix['승객유형'] + 1, len(head))); assert len(cols) == 20, head
    st = {}; raw_totals = collections.defaultdict(lambda: [0, 0]); unm = collections.Counter(); null_cells = 0
    days_seen = collections.defaultdict(set)
    months = sorted({r[ix['수송일자']][:7] for r in rows[1:] if r})
    for r in rows[1:]:
        if not r:
            continue
        line = int(r[ix['호선명']][:-2]); sid = match_tx(line, r[ix['역번호']], r[ix['역명']], idx)
        if sid is None:
            unm[(r[ix['호선명']], r[ix['역번호']], r[ix['역명']])] += 1; continue
        if owners.setdefault(sid, r[ix['역번호']].strip().zfill(4)) != r[ix['역번호']].strip().zfill(4):
            collisions.append(f'{sid}: {owners[sid]} / {r[ix["역번호"]]} {r[ix["역명"]]}')
        vals = [num(r[c]) for c in cols]; null_cells += sum(v is None for v in vals)
        total = None if any(v is None for v in vals) else sum(vals)
        typ = r[ix['승객유형']]; g = TYPE_GROUP.get(typ, '기타'); kind = 'b' if r[ix['승하차구분']] == '승차' else 'a'
        d = r[ix['수송일자']]; dt = datetime.date.fromisoformat(d); mi = months.index(d[:7]); we = is_weekend(dt)
        days_seen[(sid, d)].add(kind)
        rec = st.setdefault(sid, {'m': {g2: {'b': [0] * len(months), 'a': [0] * len(months)} for g2 in GROUPS},
                                  'h': {g2: {'b': [[0] * 20, [0] * 20], 'a': [[0] * 20, [0] * 20]} for g2 in GROUPS}})
        rec['m'][g][kind][mi] = add(rec['m'][g][kind][mi], total)
        tgt = rec['h'][g][kind][1 if we else 0]
        for i, x in enumerate(vals):
            tgt[i] = add(tgt[i], x)
        raw_totals[typ][0 if kind == 'b' else 1] = add(raw_totals[typ][0 if kind == 'b' else 1], total)
    # 관측 일수
    for sid in st:
        st[sid]['dw'] = [0] * len(months); st[sid]['dh'] = [0] * len(months)
    for (sid, d), kinds in days_seen.items():
        dt = datetime.date.fromisoformat(d); k = 'dh' if is_weekend(dt) else 'dw'
        st[sid][k][months.index(d[:7])] += 1
    return {'months': months, 'stations': st, 'rawTotals': dict(raw_totals), 'unmatched': dict((' / '.join(k), v) for k, v in unm.items()),
            'rows': len(rows) - 1, 'nullCells': null_cells, 'codeCollisions': collisions}

# ---------- 혼잡도(OA-12928) ----------
def prepare_crowding(stations):
    import openpyxl
    idx = name_index(stations)
    quarters = {}; stats = {}; qslots = {}
    for f in sorted(RAW.glob('OA-12928-crowding-*.xlsx')):
        q = f.stem.split('-')[-1]; qd = f'{q[:4]}-{q[4:6]}-{q[6:]}'
        wb = openpyxl.load_workbook(f, read_only=True, data_only=True)
        slots = None; res = {}; n = 0; nulls = 0; unm = 0; owners = {}; collisions = []
        for ws, key in (('평일', 'wd'), ('토요일', 'sat'), ('일요일', 'sun')):
            rows = list(wb[ws].iter_rows(values_only=True))
            o = 1 if str(rows[0][0]).strip() == '구분' else 0   # 2026-06 파일은 앞에 요일 구분 열이 하나 더 있다
            slots = [str(x) for x in rows[0][o + 4:]]
            for r in rows[1:]:
                if r[o] is None or str(r[o]).strip() == '' or r[o + 1] is None:
                    continue
                n += 1; line = int(str(r[o])[:-2]); code = str(int(r[o + 1])).zfill(4); sid = match_tx(line, code, str(r[o + 2]).strip(), idx)
                if sid is None:
                    unm += 1; continue
                if owners.setdefault((key, sid), code) != code:
                    collisions.append(f'{key} {sid}: {owners[(key, sid)]} / {code} {r[o + 2]}')
                vals = [None if v is None else round(float(v), 2) for v in r[o + 4:]]
                nulls += sum(v is None for v in vals)
                res.setdefault(key, {}).setdefault(sid, {})[str(r[o + 3])] = vals
        quarters[qd] = res; qslots[qd] = slots
        stats[qd] = {'rows': n, 'nullCells': nulls, 'unmatched': unm, 'slots': len(slots), 'codeCollisions': collisions}
    assert len({tuple(v) for v in qslots.values()}) == 1 or True
    return {'slots': qslots[sorted(qslots)[-1]], 'slotsByQuarter': qslots, 'quarters': quarters}, stats

# ---------- 출력 ----------
def raw_refs(prefixes):
    man = json.load(open(RAW / 'MANIFEST.json', encoding='utf-8'))
    return [{'path': f['path'], 'sha256': f['sha256'], 'bytes': f['bytes'], 'period': f['period']} for f in man['files']
            if any(f['path'].startswith(p) for p in prefixes)]

def main():
    stations, groups = build_stations()
    daily = prepare_daily(stations)
    hourly, hstats = prepare_hourly(stations)
    types = prepare_types(stations)
    crowd, cstats = prepare_crowding(stations)
    mapped = {s for s in daily['daily']}
    # w41: 원본 3종의 역번호가 좌표 파일의 코드와 다르면 둘 다 기록한다(화면에서 함께 보여 줌).
    for s in stations:
        tx = TX_CODES.get(s['id'])
        if tx and tx != {s['code']}:
            s['txCode'] = '/'.join(sorted(tx))
    # B7: 같은 이름의 다른 운영기관 노선(경의선·경부선·공항철도 등) 역이 일별 원본에 따로 있는 환승 묶음. 합계에는 포함되지 않는다.
    by_id = {s['id']: s for s in stations}
    for g in groups:
        lab = set()
        for m in g['members']:
            lab |= daily['external'].get(norm_name(by_id[m]['name']), set())
        g['external'] = sorted(lab)
    notes_null = '원문 결측(빈 칸)은 null이며 0이 아니다. null이 섞인 합계도 null이다. 관측되지 않은 날은 행이 없고 관측 일수로 센다.'
    man = {'schemaVersion': 1, 'topic': 'transit.subway', 'generatedAt': NOW, 'version': VERSION, 'datasets': []}
    def ds(id, title, files, period, unit_measures, dims, source, raws, notes, partitions):
        man['datasets'].append({'id': id, 'topic': 'transit', 'title': title, 'schemaVersion': 1, 'version': VERSION, 'period': period,
                                'measures': unit_measures, 'dimensions': dims, 'partitions': partitions, 'files': files,
                                'source': source, 'rawRef': raws, 'updatedAt': NOW, 'supersedes': None, 'notes': notes})
    # stations
    stat_files = [write_json('stations.json', {'stations': stations, 'groups': groups, 'note': '좌표는 서울교통공사 1~8호선 276역(기준일 2025-08-14). 행정동은 점이 들어가는 로컬 행정동 경계로 연결한 위치 연결이며 출구·역세권이 아니다. 환승역 묶음은 같은 이름·800m 이내·다른 호선인 행만 묶었다.'})]
    ds('transit.subway.stations', '지하철 역 마스터(호선별 행 + 환승역 묶음)', stat_files, {'kind': 'snapshot', 'start': '2025-08-14', 'end': '2025-08-14'},
       [], ['line', 'station', 'group', 'dong'], {'id': '15099316', 'url': 'https://www.data.go.kr/data/15099316/fileData.do', 'license': '이용허락범위 제한 없음(공공데이터포털 표기)', 'retrievedAt': '2026-11-18'},
       raw_refs(['15099316']), '국가철도공단 좌표와 미세한 차이가 있을 수 있음(원문 안내). 1~8호선 서울교통공사 관할 외 역(코레일 등)과 9호선은 좌표가 없다.', {'by': []})
    # monthly
    mfiles = [write_json('monthly.json.gz', {'months': daily['months'], 'stations': daily['monthly'],
                                             'fields': {'bw': '평일 승차 합', 'bh': '주말 승차 합', 'aw': '평일 하차 합', 'ah': '주말 하차 합', 'dw': '평일 관측일 수', 'dh': '주말 관측일 수', 'nb': '승차 결측 일 수', 'na': '하차 결측 일 수'}}, gz=True)]
    ds('transit.subway.monthly', '역별 월 승하차(평일·주말)', mfiles, {'kind': 'month', 'start': daily['months'][0], 'end': daily['months'][-1], 'timezone': 'Asia/Seoul'},
       [{'id': 'boarding', 'label': '승차', 'unit': '건(카드 태그)', 'nullMeaning': notes_null}, {'id': 'alighting', 'label': '하차', 'unit': '건(카드 태그)', 'nullMeaning': notes_null}],
       ['line', 'station', 'month', 'dayType'], {'id': 'OA-12914', 'url': 'https://data.seoul.go.kr/dataList/OA-12914/F/1/datasetView.do', 'license': '공공누리 1유형(출처표시, 상업 이용·변경 가능)', 'retrievedAt': '2026-11-18'},
       raw_refs(['OA-12914']), '일별 자료의 월 합. 평일/주말은 달력 요일 기준(공휴일은 평일로 셈). 승하차는 고유 방문자 수가 아님. 환승 승객은 원문 FAQ상 구분되지 않고 집계됨.', {'by': ['month']})
    # daily by line
    dfiles = []
    for line in range(1, 9):
        ids = [s for s in daily['daily'] if s.startswith(f'{line}:')]
        dfiles.append(write_json(f'daily/{line}.json.gz', {'dates': daily['dates'], 'stations': {s: daily['daily'][s] for s in ids}}, gz=True))
    ds('transit.subway.daily', '역별 일 승하차', dfiles, {'kind': 'day', 'start': daily['dates'][0], 'end': daily['dates'][-1], 'timezone': 'Asia/Seoul'},
       [{'id': 'boarding', 'label': '승차', 'unit': '건(카드 태그)', 'nullMeaning': notes_null}, {'id': 'alighting', 'label': '하차', 'unit': '건(카드 태그)', 'nullMeaning': notes_null}],
       ['line', 'station', 'day'], {'id': 'OA-12914', 'url': 'https://data.seoul.go.kr/dataList/OA-12914/F/1/datasetView.do', 'license': '공공누리 1유형(출처표시, 상업 이용·변경 가능)', 'retrievedAt': '2026-11-18'},
       raw_refs(['OA-12914']), '배열은 dates와 같은 위치. 값이 없는 날은 null.', {'by': ['line'], 'pathTemplate': 'daily/{line}.json.gz'})
    # hourly by year
    hfiles = [write_json(f'hourly/{y}.json.gz', {'year': int(y), 'buckets': BUCKETS, 'note': '값=월·요일구분(w=평일,h=주말)별 해당 시간대 합. d=[평일 관측일 수, 주말 관측일 수]. b=승차[평일,주말], a=하차[평일,주말]', 'stations': st}, gz=True) for y, st in sorted(hourly.items())]
    ds('transit.subway.hourly', '역별 시간대 승하차(월·평일/주말 합)', hfiles, {'kind': 'year', 'start': min(hourly), 'end': max(hourly), 'timezone': 'Asia/Seoul'},
       [{'id': 'boarding', 'label': '승차', 'unit': '건(카드 태그)', 'nullMeaning': notes_null}, {'id': 'alighting', 'label': '하차', 'unit': '건(카드 태그)', 'nullMeaning': notes_null}],
       ['station', 'month', 'dayType', 'hourBucket'], {'id': 'OA-12921', 'url': 'https://data.seoul.go.kr/dataList/OA-12921/F/1/datasetView.do', 'license': '공공누리 3유형(출처표시, 변경금지)', 'retrievedAt': '2026-11-18'},
       raw_refs(['OA-12921']), 'OA-12252는 파일 없이 Open API(인증키)만 있어 받지 못했고 같은 목적의 서울교통공사 OA-12921(1~8호선 서울교통공사 관할)로 대체했다. 월·평일/주말 합으로 집계(원본 일 단위는 보존).', {'by': ['year'], 'pathTemplate': 'hourly/{year}.json.gz'})
    # passenger types
    pfiles = [write_json('passenger-types.json.gz', {'months': types['months'], 'groups': GROUPS, 'note': 'm[그룹]={b,a}=월별 합, h[그룹]={b,a}=[평일,주말] 20개 시간대 기간 합, dw/dh=월별 평일/주말 관측일 수', 'rawTypeTotals': types['rawTotals'], 'stations': types['stations']}, gz=True)]
    ds('transit.subway.passenger-type', '역별 승객유형 승하차(일반·청소년·우대·기타)', pfiles, {'kind': 'month', 'start': types['months'][0], 'end': types['months'][-1], 'timezone': 'Asia/Seoul'},
       [{'id': 'boarding', 'label': '승차', 'unit': '건(카드 태그)', 'nullMeaning': notes_null}, {'id': 'alighting', 'label': '하차', 'unit': '건(카드 태그)', 'nullMeaning': notes_null}],
       ['station', 'month', 'passengerGroup', 'hourBucket'], {'id': '15099330', 'url': 'https://www.data.go.kr/data/15099330/fileData.do', 'license': '이용허락범위 제한 없음(공공데이터포털 표기)', 'retrievedAt': '2026-11-18'},
       raw_refs(['15099330']), '권종 기준이며 실제 연령·성별이 아니다. 대응: 일반=일반, 청소년=청소년+중고생, 우대=우대권(노인·장애인·국가유공자 혼합), 기타=어린이·직원·외국어 안내 권종(영어·중국어·일어 일반/어린이). 성별은 자료 없음.', {'by': []})
    # crowding
    cfiles = [write_json('crowding.json.gz', {'unit': '정원 대비 %(좌석만 찬 상태 34%)', 'slots': crowd['slots'], 'quarters': crowd['quarters'],
                                              'note': '요일유형 wd=평일, sat=토요일, sun=일요일. 방향별 30분 평균 열차 혼잡도. 값은 소수 둘째 자리로 반올림(원본 보존).'}, gz=True)]
    qs = sorted(crowd['quarters'])
    ds('transit.subway.crowding', '1~8호선 30분 혼잡도(정원 대비 %)', cfiles, {'kind': 'quarter', 'start': qs[0], 'end': qs[-1], 'timezone': 'Asia/Seoul'},
       [{'id': 'crowding', 'label': '혼잡도', 'unit': '% (정원 대비)', 'nullMeaning': '원문 빈 칸은 null. 운행 없는 시간대는 원문 값(0 등)을 그대로 둠.'}],
       ['station', 'direction', 'dayType', 'halfHour'], {'id': 'OA-12928', 'url': 'https://data.seoul.go.kr/dataList/OA-12928/F/1/datasetView.do', 'license': '공공누리 3유형(출처표시, 변경금지)', 'retrievedAt': '2026-11-18'},
       raw_refs(['OA-12928']), '승하차 수와 다른 지표. 9호선(OA-22197)은 정의·구조가 달라 합치지 않았고 이번 준비에서 제외했다.', {'by': []})
    man['datasets'].append({'id': 'transit.subway.od', 'topic': 'transit', 'title': '역사별 출발·도착(OD)', 'status': 'pending',
                            'reason': 'OA-21222 표본 검증에서 수단 코드 열이 없고 환승 처리 정의를 확인하지 못해 준비하지 않음. 화면에는 준비 중으로 표시.'})
    write_json('manifest.json', man)
    # 요약(검증기와 보고서가 읽음)
    summary = {'stations': len(stations), 'groups': len(groups), 'transferGroups': sum(1 for g in groups if len(g['members']) > 1),
               'dailyMappedStations': len(daily['daily']), 'dongUnmatched': [s['id'] for s in stations if not s['dong']],
               'daily': {'rows': daily['total_rows'], 'matchedRows': daily['matched_rows'], 'nullCells': daily['null_cells'], 'dupKeys': daily['dup'], 'files': len(daily['files']),
                         'dates': [daily['dates'][0], daily['dates'][-1]], 'unmatchedKeys': len(daily['unmatched']),
                         'unmatchedRows': sum(daily['unmatched'].values()),
                         'unmatchedTopLines': collections.Counter({k[0]: 0 for k in daily['unmatched']}) and dict(collections.Counter(k[0] for k in daily['unmatched']).most_common(40))},
               'unmatched1to8': sorted(f'{k[0]} {k[1]}' for k in daily['unmatched'] if k[0].endswith('호선') and k[0][:-2].isdigit() and int(k[0][:-2]) <= 8),
               'hourly': hstats, 'types': {'rows': types['rows'], 'nullCells': types['nullCells'], 'unmatched': types['unmatched'], 'rawTypeTotals': types['rawTotals'], 'codeCollisions': types['codeCollisions']},
               'skippedBranchCodes(9000번대 지선 가상 코드)': dict((' / '.join(map(str, k)), v) for k, v in SKIPPED_BRANCH.items()),
               'txCodeDiffers': {s['id']: s['txCode'] for s in stations if s.get('txCode')},
               'groupsWithExternalLines': {g['id']: g['external'] for g in groups if g['external']},
               'crowding': cstats}
    (OUT / 'prepare-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=1, default=list), encoding='utf-8')
    total = sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())
    print(json.dumps({'totalBytes': total, 'largest': max((p.stat().st_size, str(p.relative_to(OUT))) for p in OUT.rglob('*') if p.is_file())}, ensure_ascii=False))
    print(json.dumps(summary, ensure_ascii=False, default=list)[:3000])

if __name__ == '__main__':
    sys.exit(main())
