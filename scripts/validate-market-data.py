#!/usr/bin/env python3
"""Independently compare every prepared market observation with official raw files.
Does not import the preparation script or assume marginal sums equal totals.
Writes one validation report; never changes raw or prepared data.
"""
import argparse
import collections
import csv
import datetime
import hashlib
import io
import json
import pathlib
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / 'data/raw/commerce'
OUT = ROOT / 'tests/e2e-artifacts/market-data-validation.json'
SAMPLE_CODE = '3120107'


def file_info(path):
    payload = path.read_bytes()
    return {'path': str(path.relative_to(ROOT)), 'bytes': len(payload),
            'sha256': hashlib.sha256(payload).hexdigest()}


def numeric(text):
    return None if text in ('', '*', '-', '\\N') else int(text.replace(',', ''))


def marginal_report(records, total_field, fields):
    result = {}
    for label, extractor in fields.items():
        differences, missing = [], 0
        for row in records:
            values, total = extractor(row), row[total_field]
            if total is None or any(value is None for value in values):
                missing += 1
            else:
                differences.append(sum(values) - total)
        result[label] = {
            'comparableRows': len(differences), 'missingRows': missing,
            'nonZeroDifferenceCount': sum(value != 0 for value in differences),
            'minDifference': min(differences, default=None),
            'maxDifference': max(differences, default=None),
            'maxAbsoluteDifference': max(map(abs, differences), default=None),
        }
    return result


def validate():
    manifest = json.loads((RAW / 'market-population-manifest.json').read_text())
    population_path = ROOT / 'public/data/market-population.json'
    sales_path = ROOT / 'public/data/market-sales.json'
    geo_path = ROOT / 'public/data/market-areas.geojson'
    population = json.loads(population_path.read_text())
    sales = json.loads(sales_path.read_text())
    geo = json.loads(geo_path.read_text())
    pop_index = {(r['period'], r['code']): r for r in population['records']}
    sale_index = {(r['period'], r['areaCode'], r['industryCode']): r for r in sales['records']}
    assert len(pop_index) == len(population['records']), 'Duplicate prepared population key'
    assert len(sale_index) == len(sales['records']), 'Duplicate prepared sales key'
    geometry = {str(f['properties']['code']): f['properties'] for f in geo['features']}
    assert len(geometry) == len(geo['features']) == 1650, 'Invalid geometry code coverage'
    mismatch_count, examples = 0, []

    def compare(key, actual, expected):
        nonlocal mismatch_count
        if actual != expected:
            mismatch_count += 1
            if len(examples) < 20:
                examples.append({'key': key, 'actual': actual, 'expected': expected})

    population_counts = collections.Counter()
    population_codes, seen_population = set(), set()
    raw_population_sample = None
    source_csv = ROOT / manifest['provenance']['path']
    assert file_info(source_csv)['sha256'] == manifest['provenance']['sha256'], 'Raw population hash changed'
    with source_csv.open(encoding='cp949', newline='') as stream:
        reader = csv.reader(stream)
        columns = next(reader)
        assert len(columns) == 27, 'Unexpected population source schema'
        for raw in reader:
            assert len(raw) == 27
            key = (raw[0], raw[3])
            assert key not in seen_population, 'Duplicate raw population key'
            seen_population.add(key)
            population_counts[raw[0]] += 1
            population_codes.add(raw[3])
            prepared = pop_index.get(key)
            assert prepared is not None, 'Missing prepared population row'
            expected = {
                'period': raw[0], 'code': raw[3], 'name': raw[4],
                'marketTypeCode': raw[1], 'marketTypeName': raw[2],
                'total': numeric(raw[5]), 'male': numeric(raw[6]), 'female': numeric(raw[7]),
                'agePopulation': list(map(numeric, raw[8:14])),
                'timePopulation': list(map(numeric, raw[14:20])),
                'weekdayPopulation': list(map(numeric, raw[20:27])),
            }
            for field, value in expected.items():
                compare(['population', *key, field], prepared[field], value)
            area = geometry.get(raw[3])
            assert area is not None, 'Population market missing geometry code'
            compare(['population', *key, 'districtCode'], prepared['districtCode'], area['gu'])
            compare(['population', *key, 'dongCode'], prepared['dongCode'], area['dong'])
            if key == ('20262', SAMPLE_CODE):
                raw_population_sample = expected
    assert len(seen_population) == len(pop_index) == manifest['provenance']['officialPreviewTotalCount'] == 36281
    compare(['population', 'periods'], population['periods'], sorted(population_counts))
    assert len(population_counts) == 22 and min(population_counts) == '20211' and max(population_counts) == '20262'
    assert population_codes == set(geometry), 'Population/geometry overall code sets differ'

    sale_counts = collections.Counter()
    sale_codes, industry_codes, seen_sales = set(), set(), set()
    raw_sales_sample = []
    source_zip = RAW / 'OA-15572_51.zip'
    sales_sources = [source_zip]
    raw_2026 = RAW / 'market-sales-2026-public-download.csv'
    include_2026 = any(period.startswith('2026') for period in sales['periods'])
    if include_2026:
        manifest_2026 = json.loads((RAW / 'market-sales-2026-public-download.manifest.json').read_text())
        assert file_info(raw_2026)['sha256'] == manifest_2026['sha256'], 'Raw 2026 sales hash changed'
        sales_sources.append(raw_2026)
    for source in sales_sources:
        if source.suffix == '.zip':
            archive = zipfile.ZipFile(source)
            assert archive.testzip() is None, 'Sales ZIP CRC failure'
            csv_name = next(n for n in archive.namelist() if n.endswith('.csv'))
            stream = io.TextIOWrapper(archive.open(csv_name), encoding='cp949', newline='')
        else:
            archive = None
            stream = source.open(encoding='cp949', newline='')
        with stream:
            reader = csv.reader(stream)
            next(reader)
            for raw in reader:
                assert len(raw) == 55, 'Unexpected sales source schema'
                if source == raw_2026 and not raw[0].startswith('2026'):
                    continue
                key = (raw[0], raw[3], raw[5])
                assert key not in seen_sales, 'Duplicate raw sales key'
                seen_sales.add(key)
                sale_counts[raw[0]] += 1
                sale_codes.add(raw[3])
                industry_codes.add(raw[5])
                prepared = sale_index.get(key)
                assert prepared is not None, 'Missing prepared sales row'
                expected = {
                    'period': raw[0], 'areaCode': raw[3], 'industryCode': raw[5], 'industryName': raw[6],
                    'sales': numeric(raw[7]), 'transactions': numeric(raw[8]),
                    'timeSales': list(map(numeric, raw[18:24])),
                    'sexSales': list(map(numeric, raw[24:26])),
                    'ageSales': list(map(numeric, raw[26:32])),
                    'weekdaySales': list(map(numeric, raw[11:18])),
                }
                for field, value in expected.items():
                    compare(['sales', *key, field], prepared[field], value)
                if key[:2] == ('20254', SAMPLE_CODE):
                    raw_sales_sample.append(expected)
        if archive:
            archive.close()
    assert len(seen_sales) == len(sale_index), 'Prepared/raw sales key counts differ'
    assert sum(count for period, count in sale_counts.items() if period.startswith('2025')) == 85732
    if include_2026:
        assert {p: n for p, n in sale_counts.items() if p.startswith('2026')} == {'20261': 21188, '20262': 21133}, 'Unexpected 2026 quarter counts'
    compare(['sales', 'periods'], sales['periods'], sorted(sale_counts))
    assert len(industry_codes) == len(sales['industries']) == 62
    assert {r['code'] for r in sales['industries']} == industry_codes

    # Independent fixed checkpoints: selected from raw records, not prepared sums.
    raw_all_sales = sum(r['sales'] for r in raw_sales_sample)
    raw_time_sales = sum(r['timeSales'][4] for r in raw_sales_sample)
    raw_korean = next(r for r in raw_sales_sample if r['industryCode'] == 'CS100001')
    assert len(raw_sales_sample) == 27
    assert raw_all_sales == 38997707684 and raw_time_sales == 10450795765
    assert raw_korean['sales'] == 8705416425 and raw_korean['timeSales'][4] == 4393912588
    assert raw_population_sample['total'] == 1237934 and raw_population_sample['timePopulation'][4] == 250000
    assert mismatch_count == 0, f'{mismatch_count} raw/prepared mismatches: {examples}'

    return {
        'status': 'passed', 'validatedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'validationMethod': 'Every prepared population and sales source numeric field compared with official raw CSV; no preparation-script import.',
        'mismatchCount': mismatch_count, 'mismatchExamples': examples,
        'population': {'rows': len(pop_index), 'periodRows': dict(sorted(population_counts.items())),
                       'periodCount': len(population_counts), 'marketCodes': len(population_codes),
                       'geometryCodeMatches': len(population_codes & set(geometry)),
                       'sourceUrl': population['sourceUrl']},
        'sales': {'rows': len(sale_index), 'periodRows': dict(sorted(sale_counts.items())),
                  'marketCodes': len(sale_codes), 'industryCodes': len(industry_codes),
                  'geometryCodeMatches': len(sale_codes & set(geometry)), 'unmatchedGeometryCodes': sorted(sale_codes - set(geometry)), 'sourceUrl': sales['sourceUrl']},
        'marginalSumPolicy': 'Diagnostic differences only; no assertion that sex/age/time/weekday sums equal totals, and no zero imputation.',
        'populationMarginalDifferences': marginal_report(population['records'], 'total', {
            'sex': lambda r: [r['male'], r['female']], 'ageSixGroups': lambda r: r['agePopulation'],
            'timeSixBands': lambda r: r['timePopulation'], 'weekdays': lambda r: r['weekdayPopulation']}),
        'salesMarginalDifferences': marginal_report(sales['records'], 'sales', {
            'sex': lambda r: r['sexSales'], 'ageSixGroups': lambda r: r['ageSales'],
            'timeSixBands': lambda r: r['timeSales'], 'weekdays': lambda r: r['weekdaySales']}),
        'gongdeokStationRawCheckpoints': {
            'code': SAMPLE_CODE, 'name': geometry[SAMPLE_CODE]['name'], 'salesPeriod': '20254',
            'allProvidedIndustryRows': len(raw_sales_sample), 'allSales': raw_all_sales,
            'allTimeBand4Sales': raw_time_sales, 'koreanFoodIndustryCode': 'CS100001',
            'koreanFoodSales': raw_korean['sales'], 'koreanFoodTimeBand4Sales': raw_korean['timeSales'][4],
            'populationPeriod': '20262', 'populationTotal': raw_population_sample['total'],
            'populationTimeBand4': raw_population_sample['timePopulation'][4],
            'timeBand4': '17-21', 'note': 'Sales and population checkpoint periods differ; not a conversion-rate calculation.'},
        'files': [file_info(path) for path in [source_csv, *sales_sources, population_path, sales_path, geo_path]],
        'limitations': ['Code joins do not establish current boundary geometry equivalence.',
                        'Population source daily-average versus quarterly normalization remains unverified.',
                        'Overlapping markets must not be summed as unique population.'],
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=pathlib.Path, default=OUT, help='Report destination; use a new path to preserve existing evidence')
    args = parser.parse_args()
    OUT = args.output.resolve()
    result = validate()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(json.dumps({'status': result['status'], 'mismatchCount': result['mismatchCount'],
                      'populationRows': result['population']['rows'], 'salesRows': result['sales']['rows'],
                      'report': str(OUT)}, indent=2))
