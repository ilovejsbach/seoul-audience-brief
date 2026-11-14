#!/usr/bin/env python3
"""Reproduce market-population.json from the immutable official CSV and DBF ZIP.
Standard library only; no network and no inferred observations.
Run with --check to compare bytes without writing any data.
"""
import argparse
import csv
import hashlib
import json
import pathlib
import struct
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / 'data/raw/commerce'
MANIFEST = RAW / 'market-population-manifest.json'
OUTPUT = ROOT / 'public/data/market-population.json'


def boundary_records(path):
    with zipfile.ZipFile(path) as archive:
        if archive.testzip() is not None:
            raise ValueError('Invalid boundary ZIP CRC')
        data = archive.read(next(n for n in archive.namelist() if n.endswith('.dbf')))
    count, header_length, record_length = struct.unpack_from('<IHH', data, 4)
    fields, position = [], 32
    while data[position] != 13:
        fields.append((data[position:position + 11].split(b'\0')[0].decode('ascii'), data[position + 16]))
        position += 32
    result = {}
    for index in range(count):
        block = data[header_length + index * record_length:header_length + (index + 1) * record_length]
        if block[:1] == b'*':
            continue
        row, offset = {}, 1
        for name, length in fields:
            row[name] = block[offset:offset + length].decode('utf-8').strip()
            offset += length
        assert row['TRDAR_CD'] not in result, 'Duplicate boundary code'
        result[row['TRDAR_CD']] = row
    return result


def source_number(value):
    return None if value in ('', '*', '-', '\\N') else int(value.replace(',', ''))


def prepare():
    manifest = json.loads(MANIFEST.read_text())
    provenance = manifest['provenance']
    source = ROOT / provenance['path']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == provenance['sha256'], 'Raw CSV hash changed'
    areas = boundary_records(ROOT / provenance['boundaryPath'])
    with source.open(encoding=provenance['encoding'], newline='') as stream:
        reader = csv.reader(stream)
        columns = next(reader)
        assert columns == provenance['sourceColumns'], 'Source schema changed'
        records, keys = [], set()
        for row in reader:
            assert len(row) == 27, 'Expected 27 source columns'
            period, code = row[0], row[3]
            assert (period, code) not in keys, 'Duplicate quarter/market key'
            keys.add((period, code))
            area = areas.get(code)
            records.append({
                'period': period, 'code': code, 'name': row[4],
                'marketTypeCode': row[1], 'marketTypeName': row[2],
                'districtCode': area['SIGNGU_CD'] if area else None,
                'districtName': area['SIGNGU_CD_'] if area else None,
                'dongCode': area['ADSTRD_CD'] if area else None,
                'dongName': area['ADSTRD_CD_'] if area else None,
                'total': source_number(row[5]), 'male': source_number(row[6]), 'female': source_number(row[7]),
                'agePopulation': [source_number(v) for v in row[8:14]],
                'timePopulation': [source_number(v) for v in row[14:20]],
                'weekdayPopulation': [source_number(v) for v in row[20:27]],
            })
    assert len(records) == provenance['officialPreviewTotalCount'] == provenance['actualCsvRows'], 'Incomplete source'
    periods = sorted({row['period'] for row in records})
    coverage = {}
    for period in periods:
        codes = {row['code'] for row in records if row['period'] == period}
        coverage[period] = {
            'records': len(codes), 'matchedBoundaryCodes': len(codes & set(areas)),
            'missingFromBoundary': sorted(codes - set(areas)),
            'boundaryWithoutPopulation': sorted(set(areas) - codes),
        }
    config = manifest['normalizationConfig']
    output = {
        'sourceUrl': provenance['sourceUrl'], 'title': config['title'], 'unit': config['unit'],
        'periods': periods, 'timeBands': config['timeBands'], 'ageBands': config['ageBands'],
        'weekdayLabels': config['weekdayLabels'],
        'records': sorted(records, key=lambda row: (row['period'], row['code'])),
        'coverage': coverage, 'notes': manifest['notes'], 'provenance': provenance,
        'definitionReferences': manifest['definitionReferences'],
    }
    return json.dumps(output, ensure_ascii=False, separators=(',', ':')).encode('utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verify exact existing output bytes without writing')
    args = parser.parse_args()
    payload = prepare()
    if args.check:
        assert OUTPUT.read_bytes() == payload, 'Prepared output is not byte-reproducible'
    else:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_bytes(payload)
    print(json.dumps({'status': 'passed', 'mode': 'check' if args.check else 'write',
                      'bytes': len(payload), 'sha256': hashlib.sha256(payload).hexdigest()}, indent=2))


if __name__ == '__main__':
    main()
