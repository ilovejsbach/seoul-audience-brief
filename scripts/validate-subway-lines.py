#!/usr/bin/env python3
"""노선 선의 역 순서를 공식 자료(서울교통공사 역간거리 OA-12034)와 대조한다 (w46).
src/topics/transit/subway-lines.ts의 LINE_ROUTES(이름 순서)를 읽어, 공식 CSV의 호선별 순서와 같은지,
공식 역간거리와 좌표 직선거리가 크게 다른 구간(좌표 오류 의심)이 어디인지 보고한다."""
import csv, json, math, os, pathlib, re, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = pathlib.Path(os.environ.get('SUBWAY_RAW_DIR', ROOT / 'data/raw/transit/subway'))
ALIAS = {'서울역': '서울', '신내역': '신내'}          # 공식 표기 → 좌표 파일 표기
LINE_ALIAS = {(7, '자양'): '뚝섬유원지', (7, '이수'): '총신대입구'}   # 역명 변경(좌표 파일은 옛 이름), prepare-subway.py의 별칭과 같음
norm = lambda n, line=0: LINE_ALIAS.get((line, n.strip()), ALIAS.get(n.strip(), n.strip()))

def read_routes():
    src = (ROOT / 'src/topics/transit/subway-lines.ts').read_text(encoding='utf-8')
    body = src[src.index('export const LINE_ROUTES'):src.index('export const MAX_SEGMENT_KM')]
    routes = {}
    for m in re.finditer(r"(\d): \[(.*?)\n  \],?|(\d): \[\{(.*?)\}\],", body, re.S):
        pass
    # 간단 파서: 노선 번호 블록 단위로 {label, closed, names} 추출
    for line_no in range(1, 9):
        i = body.index(f"\n  {line_no}: [")
        j = body.index(f"\n  {line_no + 1}: [") if line_no < 8 else len(body)
        block = body[i:j]
        rs = []
        for r in re.finditer(r"\{label: '([^']*)'(, closed: true)?, names: \[(.*?)\]\}", block, re.S):
            rs.append({'label': r.group(1), 'closed': bool(r.group(2)), 'names': re.findall(r"'([^']*)'", r.group(3))})
        routes[line_no] = rs
    return routes

def flatten(rs):
    seq = []
    for r in rs:
        names = list(r['names'])
        if seq and names[0] in seq and not r['closed']:
            names = names[1:]                      # 갈래의 첫 역은 분기점(이미 있음)
        seq += names
        if r['closed']:
            seq.append(r['names'][0])               # 순환선은 시작 역으로 돌아옴
    return seq

def main():
    off = {}
    for r in list(csv.reader(open(RAW / 'OA-12034-station-distance-240810.csv', encoding='cp949')))[1:]:
        off.setdefault(int(r[1]), []).append((norm(r[2], int(r[1])), float(r[4])))
    coords = {(s['line'], s['name']): s for s in json.load(open(ROOT / 'public/data/transit/subway/stations.json', encoding='utf-8'))['stations']}
    routes = read_routes(); report = {'lines': {}, 'differences': [], 'officialOnly': [], 'suspectCoordinates': []}
    for line, rs in routes.items():
        official = [n for n, _ in off[line]]
        only = [n for n in official if (line, n) not in coords]
        for n in only: report['officialOnly'].append(f'{line}호선 {n}')
        pos = {}
        for k, n in enumerate(official): pos.setdefault(n, []).append(k)
        bad = []
        for ri, r in enumerate(rs):
            names = r['names']
            for i in range(1, len(names)):
                a, b = names[i - 1], names[i]
                if i == 1 and ri > 0 and not r['closed']:
                    ok = any(kb > ka for ka in pos.get(a, []) for kb in pos.get(b, []))   # 갈래 첫 구간: 공식 목록에 분기점 뒤에 나온다
                else:
                    ok = any(kb == ka + 1 for ka in pos.get(a, []) for kb in pos.get(b, [])) or (a, b) in [(x, y) for x, y in zip(official, official[1:])]
                if not ok: bad.append({'route': r['label'], 'from': a, 'to': b})
            if r['closed'] and not any(kb == ka + 1 for ka in pos.get(names[-1], []) for kb in pos.get(names[0], [])):
                bad.append({'route': r['label'], 'from': names[-1], 'to': names[0], 'note': '순환 닫힘 구간'})
        used = {n for r in rs for n in r['names']}
        missing_from_mine = [n for n in official if n not in used and (line, n) in coords]
        same = not bad and not missing_from_mine
        report['lines'][line] = {'official': len(official), 'mine': sum(len(r['names']) for r in rs), 'sameOrder': same}
        for b in bad: report['differences'].append({'line': line, **b})
        for n in missing_from_mine: report['differences'].append({'line': line, 'note': '공식에만 있는 역(좌표 있음)', 'name': n})
        # 공식 역간거리 대 좌표 직선거리
        prev = None; od = {}
        for n, d in off[line]: od[n] = d
        for r in rs:
            names = r['names'] + ([r['names'][0]] if r['closed'] else [])
            for a, b in zip(names, names[1:]):
                if (line, a) in coords and (line, b) in coords:
                    A, B = coords[(line, a)], coords[(line, b)]
                    dy, dx = (A['lat'] - B['lat']) * 111.2, (A['lng'] - B['lng']) * 88.0
                    km = math.hypot(dx, dy); off_km = od.get(b if b in od else a)
                    if off_km and (km > off_km * 3 + 1 or km > 4.5):
                        report['suspectCoordinates'].append({'line': line, 'from': a, 'to': b, 'coordKm': round(km, 1), 'officialKm': off_km})
    print(json.dumps(report, ensure_ascii=False, indent=1))
    ok = all(v['sameOrder'] for v in report['lines'].values())
    sys.exit(0 if ok else 1)
if __name__ == '__main__':
    main()
