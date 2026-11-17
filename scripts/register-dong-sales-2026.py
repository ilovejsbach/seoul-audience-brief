#!/usr/bin/env python3
"""Register an existing OA-22175 Sheet CSV offline, without changing raw files."""
import argparse
import collections
import csv
import hashlib
import io
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'data/dong-sales-2026-manifest.json'
SOURCE = 'https://data.seoul.go.kr/dataList/OA-22175/S/1/datasetView.do'
ENDPOINT = 'https://datafile.seoul.go.kr/bigfile/iot/sheet/csv/download.do'


def register(receipt_path, check=False):
    receipt = json.loads(receipt_path.read_text())
    assert receipt['url'] == ENDPOINT and receipt['method'] == 'POST'
    assert receipt['form']['infId'] == 'OA-22175'
    source = (ROOT / receipt['savedPath']).resolve()
    assert source.parent == ROOT / 'data/raw/commerce'
    payload = source.read_bytes()
    assert len(payload) == receipt['bytes']
    assert hashlib.sha256(payload).hexdigest() == receipt['sha256']
    reader = csv.DictReader(io.StringIO(payload.decode('cp949')))
    columns = reader.fieldnames
    counts = collections.Counter()
    seen = set()
    for row in reader:
        assert None not in row and None not in row.values() and len(row) == 53
        key = tuple(row[field] for field in ['기준_년분기_코드', '행정동_코드', '서비스_업종_코드'])
        assert key not in seen, 'Duplicate source quarter/dong/industry'
        seen.add(key)
        counts[key[0]] += 1
    assert dict(counts) == {'20262': 16659, '20261': 16659, '20254': 16718,
                            '20253': 16831, '20252': 16794, '20251': 16770}
    baseline = ROOT / 'data/raw/commerce/OA-22175_7.zip'
    result = {
        'datasetId': 'OA-22175', 'sourceUrl': SOURCE,
        'sheetSource': 'https://data.seoul.go.kr/dataList/sheetView.do?infId=OA-22175&srvType=S&serviceKind=1',
        'endpoint': ENDPOINT, 'method': receipt['method'], 'form': receipt['form'],
        'requestedAt': receipt['requestedAt'], 'retrievedAt': receipt['retrievedAt'],
        'path': receipt['savedPath'], 'encoding': 'cp949',
        'bytes': len(payload), 'sha256': receipt['sha256'], 'columns': columns,
        'actualFullCsvRows': sum(counts.values()), 'periodRows': dict(sorted(counts.items())),
        'selectedPeriods': ['20261', '20262'], 'selected2026Rows': 33318,
        'downloadFilterAppliedByServer': False,
        'baseline': {'path': str(baseline.relative_to(ROOT)), 'periods': ['20251', '20252', '20253', '20254'],
                     'rows': 67113, 'sha256': hashlib.sha256(baseline.read_bytes()).hexdigest()},
        'numericAuthority': 'Official CSV literals; Sheet preview differs, cause unresolved.',
        'registration': 'Offline registration of an existing immutable raw CSV; no network request.',
    }
    data = (json.dumps(result, ensure_ascii=False, indent=2) + '\n').encode()
    if MANIFEST.exists():
        assert MANIFEST.read_bytes() == data, 'Manifest changed; review a separately versioned source'
    else:
        assert not check, 'Missing registered manifest'
        with MANIFEST.open('xb') as stream:
            stream.write(data)
    print(json.dumps({'status': 'passed', 'manifest': str(MANIFEST.relative_to(ROOT)),
                      'fullRows': sum(counts.values()), 'selected2026Rows': 33318}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--receipt', type=pathlib.Path, required=True)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    register(args.receipt, args.check)
