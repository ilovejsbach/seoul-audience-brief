#!/usr/bin/env python3
"""Prepare OA-22175 offline: preserve the 2025 ZIP and append only 2026 Q1/Q2."""
import argparse
import collections
import csv
import hashlib
import io
import json
import pathlib
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public/data/commerce.json'
TIME_BANDS = ['00~06', '06~11', '11~14', '14~17', '17~21', '21~24']


def number(value):
    if value.strip() in ('', '*', '-', '\\N', 'null'):
        return None
    result = int(value.replace(',', ''))
    assert result >= 0, 'Negative source value'
    return result


def aggregate(rows):
    result = {}
    seen = set()
    for row in rows:
        key = (row['기준_년분기_코드'], row['행정동_코드'])
        source_key = (*key, row['서비스_업종_코드'])
        assert source_key not in seen, 'Duplicate quarter/dong/industry'
        seen.add(source_key)
        if key not in result:
            result[key] = {'period': key[0], 'code': key[1], 'name': row['행정동_코드_명'],
                           'sales': 0, 'transactions': 0, 'timeSales': [0] * 6}
        target = result[key]
        for name, field in [('sales', '당월_매출_금액'), ('transactions', '당월_매출_건수')]:
            value = number(row[field])
            target[name] = None if value is None or target[name] is None else target[name] + value
        for i, band in enumerate(TIME_BANDS):
            value = number(row[f'시간대_{band}_매출_금액'])
            old = target['timeSales'][i]
            target['timeSales'][i] = None if value is None or old is None else old + value
    return list(result.values())


def prepare():
    manifest = json.loads((ROOT / 'data/dong-sales-2026-manifest.json').read_text())
    payload = (ROOT / manifest['path']).read_bytes()
    assert hashlib.sha256(payload).hexdigest() == manifest['sha256'], '2026 raw hash changed'
    assert len(payload) == manifest['bytes']
    baseline_path = ROOT / manifest['baseline']['path']
    assert hashlib.sha256(baseline_path.read_bytes()).hexdigest() == manifest['baseline']['sha256']
    with zipfile.ZipFile(baseline_path) as archive:
        assert archive.testzip() is None
        filename = next(name for name in archive.namelist() if name.endswith('.csv'))
        baseline_reader = csv.DictReader(io.StringIO(archive.read(filename).decode('cp949')))
        baseline_columns = baseline_reader.fieldnames
        baseline_rows = list(baseline_reader)
    assert len(baseline_rows) == 67113
    baseline = aggregate(baseline_rows)
    assert len(baseline) == 1700
    if OUTPUT.exists():
        previous = json.loads(OUTPUT.read_text())
        assert [row for row in previous['records'] if row['period'].startswith('2025')] == baseline, '2025 fields/order/names changed'
    reader = csv.DictReader(io.StringIO(payload.decode(manifest['encoding'])))
    assert reader.fieldnames == baseline_columns == manifest['columns']
    full_rows = list(reader)
    counts = collections.Counter(row['기준_년분기_코드'] for row in full_rows)
    assert dict(counts) == manifest['periodRows'] and len(full_rows) == manifest['actualFullCsvRows']
    selected = [row for row in full_rows if row['기준_년분기_코드'] in ('20261', '20262')]
    assert len(selected) == manifest['selected2026Rows'] == 33318
    # Display only: resolve damaged 2026 names by the same source code in 2025.
    # Keep the CSV literal on the affected record and in provenance; never alter raw.
    baseline_names = collections.defaultdict(set)
    for row in baseline:
        baseline_names[row['code']].add(row['name'])
    added = aggregate(selected)
    name_corrections = []
    for row in added:
        if '?' not in row['name']:
            continue
        names = baseline_names[row['code']]
        assert len(names) == 1, 'Damaged name needs an unambiguous same-code 2025 reference'
        display_name = next(iter(names))
        assert '?' not in display_name
        row['sourceName'] = row['name']
        row['name'] = display_name
        name_corrections.append({'period': row['period'], 'code': row['code'],
                                 'sourceName': row['sourceName'], 'displayName': display_name,
                                 'reference': 'same administrative dong code in 2025 official ZIP'})
    assert len(name_corrections) == 14 and len({row['code'] for row in name_corrections}) == 7
    records = baseline + added
    assert len(records) == 2550
    periods = sorted({row['period'] for row in records})
    geometry = json.loads((ROOT / 'public/data/dongs.geojson').read_text())
    codes = {str(feature['properties']['code']) for feature in geometry['features']}
    coverage = {}
    for period in periods:
        observations = [row for row in records if row['period'] == period]
        observed_codes = {row['code'] for row in observations}
        source_rows = [row for row in baseline_rows + selected if row['기준_년분기_코드'] == period]
        coverage[period] = {'sourceRows': len(source_rows), 'records': len(observations),
                            'sourceDongCount': len(observed_codes), 'industryCount': len({row['서비스_업종_코드'] for row in source_rows}),
                            'matchedBoundaryDongCount': len(observed_codes & codes),
                            'unmatchedBoundaryDongCodes': sorted(observed_codes - codes),
                            'boundaryWithoutObservationCodes': sorted(codes - observed_codes)}
    out = {
        'sourceUrl': manifest['sourceUrl'], 'periods': periods,
        'timeBands': [band.replace('~', '–') for band in TIME_BANDS], 'records': records,
        'notes': [
            '서울시 OA-22175 행정동 추정매출. 원 단위. 2025년 1분기–2026년 2분기 제공 업종 합계이며 상권 단위 매출과 별도 자료입니다.',
            '2025년 공식 ZIP의 레코드·필드·순서·동명은 보존하고 2026년 1·2분기 공식 Sheet CSV만 추가했습니다. 분기당 425동·63업종입니다.',
            '당월_매출_금액은 원본 필드명이며 기준_년분기_코드로 구분된 분기 값을 사용합니다. 직전 분기 비교는 전년동기 비교와 다릅니다.',
            '보유 2025-06-30 경계에 분기당 423동이 연결됩니다. 일원2동(11680740)·상일동(11740520)은 도형 미연결이지만 원값과 지역 합계에 보존합니다. 경계에 관측이 없는 동은 자료 없음이며 0으로 채우지 않습니다.',
            '코드 연결과 2026년 실제 경계·행정소속의 동일성은 별개이며 후자는 미검증입니다. 옛 코드를 새 동으로 임의 분할하지 않습니다.',
            '수치는 공식 CSV 리터럴 기준입니다. 공식 Sheet 미리보기와 빈칸·수치 차이가 있고 원인은 미확정입니다. 2026년 물음표가 든 7개 동명은 같은 행정동 코드의 2025년 ZIP 이름으로 표시하며, CSV 원문 이름은 sourceName과 출처 이력에 보존합니다.',
            '화면용 이름의 CSV 원문: ' + ' / '.join(f"{row['displayName']} ← {row['sourceName']}" for row in name_corrections if row['period'] == '20262'),
            '빈값·비공개는 null이며 부분 결측을 포함하는 합계는 자료 없음입니다. 시간·성별·연령 주변분포를 교차하거나 총계에 맞춰 보정하지 않습니다.',
            '전체 소비나 실제 개별 점포 회계매출이 아닙니다. 인구와 나누어 광고 전환율로 해석하지 않습니다.',
        ],
        'coverage': coverage,
        'sourceVersion': {'datasetId': 'OA-22175', 'latestPeriod': '20262', 'datasetUpdatedAt': '2026-09-11',
                          'retrievedAt': manifest['retrievedAt'], 'sheetSource': manifest['sheetSource'],
                          'boundaryReferenceDate': '2025-06-30', 'geometryCompatibility': 'not_verified',
                          'displayNameVersion': '2025-same-code-reference-v1'},
        'provenance': {'spatialUnit': 'source administrative dong', 'unit': 'KRW',
                       'supportedDimensions': ['quarter', 'dong', 'provided-industry-total', 'six-time-band-sales'],
                       'missingPolicy': 'null; any missing contributing cell makes that aggregate null; absent dong is not zero',
                       'baseline': manifest['baseline'], 'extension2026': manifest,
                       'sourceRows': 100431, 'recordCount': len(records), 'preserved2025Records': len(baseline),
                       'preserved2025Values': 'exact_all_fields_order_and_names',
                       'displayNamePolicy': 'Only damaged 2026 names use the unique 2025 ZIP name for the same code; sourceName retains the CSV literal.',
                       'displayNameCorrections': name_corrections,
                       'salesSumByPeriod': {p: sum(row['sales'] for row in records if row['period'] == p and row['sales'] is not None) for p in periods}},
    }
    return json.dumps(out, ensure_ascii=False, separators=(',', ':')).encode('utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verify byte reproduction without writing')
    args = parser.parse_args()
    result = prepare()
    if args.check:
        assert OUTPUT.read_bytes() == result, 'Prepared output not byte reproducible'
    else:
        OUTPUT.write_bytes(result)
    print(json.dumps({'status': 'passed', 'mode': 'check' if args.check else 'write',
                      'records': len(json.loads(result)['records']), 'bytes': len(result),
                      'sha256': hashlib.sha256(result).hexdigest()}))
