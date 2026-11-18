#!/usr/bin/env python3
"""공식 역간거리(OA-12034) → public/data/transit/subway/lines.json (w48).
호선별 공식 역 순서와 역간거리(km), 호선별 누계. 이름은 좌표 파일 표기로 맞춘다(서울역→서울, 7호선 이수/자양 등).
manifest.json에 transit.subway.lines 항목을 추가·갱신한다(다른 항목은 건드리지 않음)."""
import csv, datetime, hashlib, json, os, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = pathlib.Path(os.environ.get('SUBWAY_RAW_DIR', ROOT / 'data/raw/transit/subway'))
OUT = ROOT / 'public/data/transit/subway'
ALIAS = {'서울역': '서울', '신내역': '신내'}
LINE_ALIAS = {(7, '자양'): '뚝섬유원지', (7, '이수'): '총신대입구'}
norm = lambda n, line: LINE_ALIAS.get((line, n.strip()), ALIAS.get(n.strip(), n.strip()))

def main():
    src = RAW / 'OA-12034-station-distance-240810.csv'
    rows = list(csv.reader(open(src, encoding='cp949')))[1:]
    lines = {}
    for r in rows:
        line = int(r[1]); lines.setdefault(line, []).append({'name': norm(r[2], line), 'officialName': r[2].strip(), 'km': float(r[4]), 'cumKm': float(r[5])})
    payload = {'source': 'OA-12034 서울교통공사 역간거리 및 소요시간(2024-08-10 기준)', 'note': '공식 파일의 행 순서 그대로(갈래·순환은 이름이 다시 나오는 곳에서 이어짐). 이름은 좌표 파일 표기로 맞춤.', 'lines': {str(k): v for k, v in sorted(lines.items())}}
    raw = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    (OUT / 'lines.json').write_bytes(raw)
    man = json.loads((OUT / 'manifest.json').read_text(encoding='utf-8'))
    man['datasets'] = [d for d in man['datasets'] if d['id'] != 'transit.subway.lines']
    rawref = [{'path': src.name, 'sha256': hashlib.sha256(src.read_bytes()).hexdigest(), 'bytes': src.stat().st_size, 'period': '2024-08-10 기준'}]
    man['datasets'].append({'id': 'transit.subway.lines', 'topic': 'transit', 'title': '호선별 공식 역 순서·역간거리', 'schemaVersion': 1, 'version': man.get('version'), 'period': {'kind': 'snapshot', 'start': '2024-08-10', 'end': '2024-08-10'},
        'measures': [{'id': 'distance', 'label': '역간거리', 'unit': 'km', 'nullMeaning': '값이 없으면 null(이 파일에는 없음). 0이 아님'}], 'dimensions': ['line', 'station'], 'partitions': {'by': []},
        'files': [{'path': 'lines.json', 'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw), 'encoding': 'json'}],
        'source': {'id': 'OA-12034', 'url': 'https://data.seoul.go.kr/dataList/OA-12034/F/1/datasetView.do', 'license': '공공누리 1유형(출처표시, 상업 이용·변경 가능)', 'retrievedAt': '2026-11-18'},
        'rawRef': rawref, 'updatedAt': datetime.date(2026, 11, 18).isoformat(), 'supersedes': None, 'notes': '노선도 인포그래픽과 노선 선의 역 순서 검증용. 9호선은 포함하지 않음.'})
    (OUT / 'manifest.json').write_text(json.dumps(man, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print({k: len(v) for k, v in lines.items()}, len(raw))
if __name__ == '__main__':
    main()
