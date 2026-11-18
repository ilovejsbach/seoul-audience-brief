#!/usr/bin/env python3
"""지하철 원본 수집 (w31 1단계).

- 인증키·로그인·결제 없이 공식 페이지에서 받을 수 있는 파일만 받는다.
- 원본 폴더: data/raw/transit/subway/ (환경변수 SUBWAY_RAW_DIR로 바꿀 수 있다).
- 이미 있는 파일은 절대 덮어쓰지 않는다. 다시 실행하면 없는 파일만 받고,
  MANIFEST.json에 없는 파일은 해시를 계산해 항목만 추가한다.
- 허용 도메인 밖 요청은 하지 않는다.
사용: python3 scripts/collect-subway.py [--dry-run] [--only a,b,...]
"""
import argparse, datetime, hashlib, http.cookiejar, json, os, re, sys, time
import urllib.parse, urllib.request

import pathlib
RAW = pathlib.Path(os.environ.get('SUBWAY_RAW_DIR', '/Users/koscom/workspace2/seoul human/data/raw/transit/subway'))
ALLOWED = ('data.seoul.go.kr', 'datafile.seoul.go.kr', 'data.go.kr', 'www.data.go.kr', 'file.go.kr', 'seoulmetro.co.kr', 'www.seoulmetro.co.kr')
UA = 'Mozilla/5.0 (research; subway-collector)'
SEOUL_DL = 'https://datafile.seoul.go.kr/bigfile/iot/inf/nio_download.do?&useCache=false'
KST = datetime.timezone(datetime.timedelta(hours=9))

jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def check(url):
    host = urllib.parse.urlparse(url).hostname or ''
    if not any(host == h or host.endswith('.' + h) for h in ALLOWED):
        raise SystemExit(f'허용 도메인 밖 요청 차단: {url}')


def get(url, data=None, timeout=60):
    check(url)
    req = urllib.request.Request(url, data=data, headers={'User-Agent': UA})
    return opener.open(req, timeout=timeout)


def page(url):
    return get(url).read().decode('utf-8', 'replace')


def stream_to(resp, dest):
    part = dest.with_name(dest.name + '.part')
    h = hashlib.sha256(); n = 0
    with part.open('wb') as out:
        while chunk := resp.read(1 << 20):
            out.write(chunk); h.update(chunk); n += len(chunk)
    return part, n, h.hexdigest()


def sniff_ok(part):
    head = part.read_bytes()[:2048].lower() if part.stat().st_size else b''
    return b'<html' not in head and b'<!doctype html' not in head and b'"datasetfiledetailinfo"' not in head


# ---------- 서울 열린데이터광장 ----------
def seoul_files(inf_id):
    html = page(f'https://data.seoul.go.kr/dataList/{inf_id}/F/1/datasetView.do')
    files = re.findall(r'<span title="([^"]+)" onclick="javascript:downloadFile\(\x27([^\x27]+)\x27\)', html)
    m = re.search(r'name="frmFile".*?name="infSeq" value="(\d*)"', html, re.S)
    return {n: s for n, s in files}, (m.group(1) if m else '1')


SEOUL_CACHE = {}


def seoul_item(it):
    inf = it['inf']
    if inf not in SEOUL_CACHE:
        SEOUL_CACHE[inf] = seoul_files(inf)
    files, inf_seq = SEOUL_CACHE[inf]
    if it['orig'] not in files:
        return None
    seq = files[it['orig']]
    form = {'infId': inf, 'infSeq': inf_seq, 'seq': seq}
    return dict(
        sourcePage=f'https://data.seoul.go.kr/dataList/{inf}/F/1/datasetView.do',
        downloadUrl=SEOUL_DL, downloadForm=form,
        open=lambda: get(SEOUL_DL, urllib.parse.urlencode(form).encode(), timeout=300))


# ---------- 공공데이터포털 ----------
def datago_item(it):
    pk = it['pk']
    src = f'https://www.data.go.kr/data/{pk}/fileData.do'
    html = page(src)
    m = re.search(r"fn_fileDataDown\('(\d+)', '([^']+)', '',\s*'(\d+)'", html)
    if not m:
        return None
    detail, sn = m.group(2), m.group(3)
    meta_url = ('https://www.data.go.kr/tcs/dss/selectFileDataDownload.do?'
                + urllib.parse.urlencode({'publicDataPk': pk, 'publicDataDetailPk': detail, 'fileDetailSn': sn}))
    meta = json.loads(get(meta_url).read().decode('utf-8'))
    atch = meta.get('atchFileId')
    if not atch:
        return None
    dl = ('https://www.data.go.kr/cmm/cmm/fileDownload.do?'
          + urllib.parse.urlencode({'atchFileId': atch, 'fileDetailSn': sn, 'dataNm': it['dest'].rsplit('.', 1)[0]}))
    ld = re.search(r'"temporalCoverage":"([^"]*)"', html)
    mod = re.search(r'"dateModified":"([^"]*)"', html)
    return dict(sourcePage=src, downloadUrl=dl, downloadForm={'publicDataPk': pk, 'fileDetailSn': sn},
                extra={'portalTemporalCoverage': ld.group(1) if ld else None, 'portalDateModified': mod.group(1) if mod else None},
                open=lambda: get(dl, timeout=300))


def months(a, b):
    y, m = divmod(a, 100)
    out = []
    while y * 100 + m <= b:
        out.append(y * 100 + m)
        m += 1
        if m > 12:
            y, m = y + 1, 1
    return out


def targets():
    t = []
    # a. 역별 일별 승하차 OA-12914, 2023-01 ~ 2026-10 월 파일 (기존 2026-10 표본은 건너뜀)
    for ym in months(202301, 202610):
        t.append(dict(key='a', kind='seoul', inf='OA-12914', orig=f'CARD_SUBWAY_MONTH_{ym}.csv',
                      dest=f'OA-12914-CARD_SUBWAY_MONTH_{ym}.csv', period=f'{ym // 100}-{ym % 100:02d}',
                      dataset='OA-12914', note='카드 승하차 총승객수, 노선·역명·일자'))
    # b. 시간대 승하차. OA-12252는 파일 내려받기가 없고 Open API(인증키)만 있어 키 없이는 받을 수 없다.
    #    같은 목적의 대체: OA-12921 서울교통공사 일별 시간대별 승하차(1~8호선 관할, 연도 CSV) 최근 3개 연도.
    for yr, orig in ((2025, '서울교통공사_역별 일별 시간대별 승하차인원_20251231.csv'),
                     (2024, '서울교통공사_역별 시간대별 승하차인원(24.1~24.12).csv'),
                     (2023, '서울교통공사_역별 시간대별 승하차인원(23.1~23.12).csv')):
        t.append(dict(key='b', kind='seoul', inf='OA-12921', orig=orig, dest=f'OA-12921-hourly-{yr}.csv',
                      period=f'{yr}-01-01/{yr}-12-31', dataset='OA-12921',
                      note='OA-12252 대체(키 필요). 서울교통공사 관할 1~8호선 일×역×시간대'))
    # c. 승객유형 15099330 (2026 상반기)
    t.append(dict(key='c', kind='datago', pk='15099330', dest='15099330-passenger-type-2026H1.csv',
                  period='2026-01/2026-06', dataset='15099330', note='역·일·시간·승객유형 승하차, 1~8호선'))
    # d. 혼잡도 OA-12928 최신(2026-09-30 기준), 9호선 OA-22197 2026
    t.append(dict(key='d', kind='seoul', inf='OA-12928', orig='서울교통공사_지하철혼잡도정보_20260930.xlsx',
                  dest='OA-12928-crowding-20260930.xlsx', period='2026-09-30 기준 분기 혼잡도; 평일·토요일·일요일',
                  dataset='OA-12928', note='1~8호선 30분 평균 혼잡도(정원 대비 %)'))
    t.append(dict(key='d', kind='seoul', inf='OA-22197', orig='2026년 9호선(종합) 역별 시간별 혼잡도 자료.xlsx',
                  dest='OA-22197-line9-crowding-2026.xlsx', period='2026', dataset='OA-22197',
                  note='9호선 혼잡도, 정의가 다르므로 1~8호선과 합치지 않음'))
    # e. 역 좌표 15099316
    t.append(dict(key='e', kind='datago', pk='15099316', dest='15099316-station-coords-20250814.csv',
                  period='기준일 2025-08-14', dataset='15099316', note='1~8호선 276역 위경도·외부역코드'))
    # f. OA-21222 표본 1개월 (OA-12914 표본과 같은 2026-10)
    t.append(dict(key='f', kind='seoul', inf='OA-21222', orig='kscc_dx_ra_od_202610.zip',
                  dest='OA-21222-od-202610.zip', period='2026-10', dataset='OA-21222',
                  note='정류장/역사별 수단 출발/도착 표본 1개월; OD 검증용'))
    # g. 역간거리 및 소요시간 OA-12034 (w46: 노선 선의 역 순서 대조용, 파일 1개)
    t.append(dict(key='g', kind='seoul', inf='OA-12034', orig='서울교통공사 역간거리 및 소요시간_240810.csv',
                  dest='OA-12034-station-distance-240810.csv', period='2024-08-10 기준', dataset='OA-12034',
                  note='1~8호선 호선·역명·역간거리(km)·호선별 누계; 공공누리 1유형'))
    return t


def load_manifest():
    p = RAW / 'MANIFEST.json'
    return json.loads(p.read_text(encoding='utf-8')) if p.exists() else {'files': []}


def save_manifest(m):
    p = RAW / 'MANIFEST.json'
    tmp = p.with_name('MANIFEST.json.tmp')
    tmp.write_text(json.dumps(m, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    tmp.replace(p)


def count_rows(path):
    if path.suffix.lower() != '.csv':
        return None
    with path.open('rb') as f:
        return max(sum(1 for _ in f) - 1, 0)


def entry(it, path, src, received):
    h = hashlib.sha256()
    with path.open('rb') as f:
        while c := f.read(1 << 20):
            h.update(c)
    e = {'path': path.name, 'datasetId': it['dataset'], 'receivedAt': received, 'sourcePage': src['sourcePage'],
         'downloadUrl': src['downloadUrl'], 'downloadForm': src['downloadForm'], 'period': it['period'],
         'bytes': path.stat().st_size, 'sha256': h.hexdigest(), 'note': it['note'],
         'authentication': '공식 페이지 파일 내려받기; 인증키·로그인 불필요'}
    rows = count_rows(path)
    if rows is not None:
        e['csvLines'] = rows
    e.update(src.get('extra') or {})
    return e


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--only', default='')
    a = ap.parse_args()
    only = set(filter(None, a.only.split(',')))
    RAW.mkdir(parents=True, exist_ok=True)
    man = load_manifest()
    known = {f['path'] for f in man['files']}
    summary = []
    for it in targets():
        if only and it['key'] not in only:
            continue
        dest = RAW / it['dest']
        if dest.exists():
            if dest.name not in known and not a.dry_run:
                src = (seoul_item(it) if it['kind'] == 'seoul' else datago_item(it)) or {'sourcePage': '', 'downloadUrl': '', 'downloadForm': {}}
                man['files'].append(entry(it, dest, src, datetime.datetime.fromtimestamp(dest.stat().st_mtime, KST).isoformat(timespec='seconds')))
                save_manifest(man); known.add(dest.name)
                summary.append((it['dest'], '기존 파일 목록에 추가'))
            else:
                summary.append((it['dest'], '이미 있음(건너뜀)'))
            continue
        try:
            src = seoul_item(it) if it['kind'] == 'seoul' else datago_item(it)
        except Exception as ex:  # 네트워크 오류는 항목별로 기록하고 계속
            summary.append((it['dest'], f'실패: {ex}')); continue
        if not src:
            summary.append((it['dest'], '공식 페이지에서 파일을 찾지 못함')); continue
        if a.dry_run:
            summary.append((it['dest'], '받을 수 있음(드라이런)')); continue
        try:
            resp = src['open']()
            received = datetime.datetime.now(KST).isoformat(timespec='seconds')
            part, n, sha = stream_to(resp, dest)
            if n == 0 or not sniff_ok(part):
                part.unlink(missing_ok=True)
                summary.append((it['dest'], '응답이 파일이 아님(HTML/JSON); 저장 안 함')); continue
            if dest.exists():  # 경쟁 상황에서도 덮어쓰지 않는다
                part.unlink(missing_ok=True); summary.append((it['dest'], '이미 있음(건너뜀)')); continue
            part.rename(dest)
            man['files'].append(entry(it, dest, src, received)); save_manifest(man); known.add(dest.name)
            summary.append((it['dest'], f'받음 {n:,}B'))
        except Exception as ex:
            (dest.with_name(dest.name + '.part')).unlink(missing_ok=True)
            summary.append((it['dest'], f'실패: {ex}'))
        time.sleep(1.0)
    for name, st in summary:
        print(f'{name}\t{st}')
    bad = [s for s in summary if s[1].startswith(('실패', '공식', '응답'))]
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
