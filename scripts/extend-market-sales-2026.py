#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Append verified 2026 Q1/Q2 official Sheet sales, preserving every 2025 value.

Run --download once to acquire the public CSV via the official full-download form.
Run --check for an offline, byte-for-byte prepared-data reproduction check.
This script never changes or fabricates market geometry.
"""
import argparse
import csv
import datetime
import hashlib
import io
import json
import pathlib
import urllib.parse
import urllib.request
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / 'data/raw/commerce'
CSV = RAW / 'market-sales-2026-public-download.csv'
MANIFEST = CSV.with_suffix('.manifest.json')
OUTPUT = ROOT / 'public/data/market-sales.json'
ENDPOINT = 'https://datafile.seoul.go.kr/bigfile/iot/sheet/csv/download.do'
SOURCE = 'https://data.seoul.go.kr/dataList/OA-15572/S/1/datasetView.do'
SHEET = 'https://data.seoul.go.kr/dataList/sheetView.do?infId=OA-15572&srvType=S&serviceKind=1'
TIME_BANDS = ['00~06', '06~11', '11~14', '14~17', '17~21', '21~24']


def numeric(value):
    value = '' if value is None else value.strip()
    if value in ('', '*', '-', '\\N', 'null'):
        return None
    number = int(value.replace(',', ''))
    assert number >= 0, 'Negative sales/source count'
    return number


def normalize(row):
    return {
        'period': row['기준_년분기_코드'], 'areaCode': row['상권_코드'],
        'industryCode': row['서비스_업종_코드'], 'industryName': row['서비스_업종_코드_명'],
        'sales': numeric(row['당월_매출_금액']), 'transactions': numeric(row['당월_매출_건수']),
        'timeSales': [numeric(row['시간대_' + band + '_매출_금액']) for band in TIME_BANDS],
        'sexSales': [numeric(row[sex + '_매출_금액']) for sex in ['남성', '여성']],
        'ageSales': [numeric(row['연령대_' + age + '_매출_금액']) for age in ['10', '20', '30', '40', '50', '60_이상']],
        'weekdaySales': [numeric(row[day + '요일_매출_금액']) for day in ['월', '화', '수', '목', '금', '토', '일']],
    }


def download():
    form = {'srvType': 'S', 'infId': 'OA-15572', 'serviceKind': '1', 'pageNo': '1',
            'gridTotalCnt': '', 'ssUserId': 'SAMPLE_VIEW',
            'strWhere': " AND STDR_YYQU_CD >= '20261' AND STDR_YYQU_CD <= '20262'",
            'strOrderby': 'STDR_YYQU_CD DESC', 'txtFilter': ''}
    preview = urllib.parse.urlencode({**form, 'onepagerow': '5'})
    with urllib.request.urlopen('https://data.seoul.go.kr/dataList/dataView.do?' + preview, timeout=60) as response:
        preview_text = response.read().decode('utf-8')
    import re
    count = int(re.search(r'totalCount:\s*(\d+)', preview_text).group(1))
    form['gridTotalCnt'] = str(count)
    request = urllib.request.Request(ENDPOINT, data=urllib.parse.urlencode(form).encode(),
                                     headers={'User-Agent': 'Mozilla/5.0', 'Referer': SOURCE})
    with urllib.request.urlopen(request, timeout=180) as response:
        payload = response.read()
    rows = list(csv.DictReader(io.StringIO(payload.decode('cp949'))))
    selected = [row for row in rows if row['기준_년분기_코드'] in ('20261', '20262')]
    assert len(selected) == count and rows, 'Official selected-period CSV was incomplete'
    assert {row['기준_년분기_코드'] for row in selected} == {'20261', '20262'}
    RAW.mkdir(parents=True, exist_ok=True)
    if CSV.exists():
        assert CSV.read_bytes() == payload, 'Official CSV changed; retain old raw and review a separately versioned acquisition'
        assert MANIFEST.exists(), 'Raw CSV needs its original acquisition manifest'
        return
    CSV.write_bytes(payload)
    MANIFEST.write_text(json.dumps({
        'sourceUrl': SOURCE, 'sheetSource': SHEET, 'retrievedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'clientDate': '2026-11-17', 'endpoint': ENDPOINT, 'method': 'POST', 'form': form,
        'bytes': len(payload), 'sha256': hashlib.sha256(payload).hexdigest(),
        'encoding': 'cp949', 'path': str(CSV.relative_to(ROOT)), 'officialPreviewRows': count,
        'actualFullCsvRows': len(rows), 'selected2026CsvRows': len(selected),
        'downloadFilterAppliedByServer': len(rows) == len(selected),
    }, ensure_ascii=False, indent=2))


def prepare():
    previous = json.loads(OUTPUT.read_text())
    manifest = json.loads(MANIFEST.read_text())
    payload = CSV.read_bytes()
    assert hashlib.sha256(payload).hexdigest() == manifest['sha256'], 'Immutable CSV hash mismatch'
    with zipfile.ZipFile(RAW / 'OA-15572_51.zip') as archive:
        assert archive.testzip() is None
        filename = next(name for name in archive.namelist() if name.endswith('.csv'))
        baseline = [normalize(row) for row in csv.DictReader(io.StringIO(archive.read(filename).decode('cp949')))]
    assert len(baseline) == 85732
    assert [row for row in previous['records'] if row['period'].startswith('2025')] == baseline, '2025 baseline changed'
    full_source_rows = list(csv.DictReader(io.StringIO(payload.decode(manifest['encoding']))))
    source_rows = [row for row in full_source_rows if row['기준_년분기_코드'] in ('20261', '20262')]
    assert len(source_rows) == manifest['officialPreviewRows']
    manifest.update(sourceUrl=SOURCE, sheetSource=SHEET, actualFullCsvRows=len(full_source_rows),
                    selected2026CsvRows=len(source_rows), downloadFilterAppliedByServer=len(full_source_rows) == len(source_rows))
    added = [normalize(row) for row in source_rows]
    assert {row['period'] for row in added} == {'20261', '20262'}
    records = baseline + added
    keys = [(row['period'], row['areaCode'], row['industryCode']) for row in records]
    assert len(keys) == len(set(keys)), 'Duplicate quarter/market/industry key'
    geometry = json.loads((ROOT / 'public/data/market-areas.geojson').read_text())
    geometry_codes = {str(feature['properties']['code']) for feature in geometry['features']}
    source_areas = {row['상권_코드']: {'code': row['상권_코드'], 'name': row['상권_코드_명'],
                    'typeCode': row['상권_구분_코드'], 'type': row['상권_구분_코드_명']} for row in source_rows}
    periods = sorted({row['period'] for row in records})
    coverage = {}
    for period in periods:
        selected = [row for row in records if row['period'] == period]
        codes = {row['areaCode'] for row in selected}
        coverage[period] = {'records': len(selected), 'sourceAreaCount': len(codes),
                            'matchedBoundaryAreaCount': len(codes & geometry_codes),
                            'unmatchedBoundaryAreaCodes': sorted(codes - geometry_codes),
                            'boundaryWithoutSalesCount': len(geometry_codes - codes)}
    industries = {row['code']: row['name'] for row in previous['industries']}
    for row in added:
        industries.setdefault(row['industryCode'], row['industryName'])
    numeric_values = [value for row in records for key in ['sales', 'transactions', 'timeSales', 'sexSales', 'ageSales', 'weekdaySales']
                      for value in (row[key] if isinstance(row[key], list) else [row[key]])]
    previous.update(periods=periods, records=records,
                    industries=[{'code': code, 'name': name} for code, name in sorted(industries.items())])
    previous['coverage'] = coverage
    previous['unmappedSourceAreas'] = [source_areas[code] for code in sorted(set(source_areas) - geometry_codes)]
    previous['sourceVersion'] = {
        'datasetId': 'OA-15572', 'latestPeriod': '20262', 'datasetUpdatedAt': '2026-09-11',
        'retrievedAt': manifest['retrievedAt'], 'sheetSource': SHEET,
        'methodologyNoticeEffectiveDate': '2026-07-03',
        'methodologyNotice': '공식 2026년 7월 3일 공지: 2024년부터 표준단위구역으로 변경, 2021년 이후 자료 제공.',
        'boundaryReferenceDate': '2023-10-20', 'geometryCompatibility': 'not_verified',
    }
    previous['notes'] = [
        '2025년 1–4분기 공식 ZIP에 2026년 1–2분기 공식 Sheet 전체 CSV를 추가했습니다. 2025년 모든 원값·주변분포는 그대로 보존했습니다.',
        '2026년 자료도 원 단위 분기 추정매출입니다. 공식 기준_년분기_코드를 유지하며 일평균·점포 실제매출로 환산하지 않습니다.',
        '경계는 2023년 10월 자료입니다. 상권 코드 연결과 통계 시점의 동일 경계·면적은 별개이며 최신 형상 동일성은 미검증입니다.',
        '2026년 원본 상권 코드 중 보유 경계와 미연결인 코드는 삭제하지 않고 records·coverage·unmappedSourceAreas에 보존합니다.',
        '구/동은 보유 경계의 대표 행정구역 속성이며 상권 경계가 행정동을 넘을 수 있습니다. 중첩 상권을 서울 전체 소비총액으로 합산하지 않습니다.',
        '성별·연령·요일·시간대는 각각 별도 주변분포이며 성별×연령×요일×시간대 교차표가 아닙니다.',
        '비공개·빈값은 null입니다. 0으로 채우거나 주변분포를 총계에 맞춰 재정규화하지 않습니다. 연도·분기 비교는 같은 상권·업종·세부 조건에서 제공값을 확인합니다.',
    ]
    provenance = previous['provenance']
    provenance.update(sourceRows=len(records), recordCount=len(records),
                      matchedSalesAreaCount=len({row['areaCode'] for row in records} & geometry_codes),
                      unmatchedSalesAreaCodes=sorted({row['areaCode'] for row in records} - geometry_codes),
                      nullCells=sum(value is None for value in numeric_values),
                      salesSumByPeriod={period: sum(row['sales'] for row in records if row['period'] == period and row['sales'] is not None) for period in periods},
                      shapeTemporalCompatibility='not_verified_2023_boundary_vs_2025_2026_sales',
                      extension2026={**manifest, 'sourceColumns': list(source_rows[0]),
                                     'actualCsvRows': len(full_source_rows), 'prepared2026Rows': len(source_rows),
                                     'preserved2025Records': len(baseline),
                                     'preserved2025Values': 'exact_all_fields', 'coverage': {p: coverage[p] for p in ['20261', '20262']}})
    provenance['rawSha256'][CSV.name] = manifest['sha256']
    return json.dumps(previous, ensure_ascii=False, separators=(',', ':')).encode('utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--download', action='store_true')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if args.download:
        download()
    result = prepare()
    if args.check:
        assert OUTPUT.read_bytes() == result, 'Prepared output not byte reproducible'
    else:
        OUTPUT.write_bytes(result)
    data = json.loads(result)
    print(json.dumps({'status': 'passed', 'mode': 'check' if args.check else 'write',
                      'bytes': len(result), 'sha256': hashlib.sha256(result).hexdigest(),
                      'coverage': data['coverage'], 'sums': data['provenance']['salesSumByPeriod'],
                      'unmappedSourceAreas': data['unmappedSourceAreas']}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
