import pathlib,zipfile,csv,io,json,collections
root=pathlib.Path(__file__).resolve().parents[1]
p=next((root/'data/raw/commerce').glob('OA-22175*'))
agg={}
with zipfile.ZipFile(p) as z:
 with z.open(z.namelist()[0]) as f:
  for r in csv.DictReader(io.TextIOWrapper(f,encoding='cp949')):
   key=(r['기준_년분기_코드'],r['행정동_코드'])
   if key not in agg:agg[key]={'period':key[0],'code':key[1],'name':r['행정동_코드_명'],'sales':0,'transactions':0,'timeSales':[0]*6}
   a=agg[key]
   a['sales']+=int(r['당월_매출_금액']);a['transactions']+=int(r['당월_매출_건수'])
   for i,t in enumerate(['00~06','06~11','11~14','14~17','17~21','21~24']):a['timeSales'][i]+=int(r[f'시간대_{t}_매출_금액'])
out={'sourceUrl':'https://data.seoul.go.kr/dataList/OA-22175/S/1/datasetView.do','periods':sorted(set(k[0] for k in agg)),'timeBands':['00–06','06–11','11–14','14–17','17–21','21–24'],'records':list(agg.values()),'notes':['서울시 상권분석서비스 행정동 추정매출. 원 단위. 2025년 분기별 제공 업종 합계.','당월_매출_금액은 원본 필드명이며 기준_년분기_코드로 구분된 원본 값을 사용.','전체 소비나 실제 개별 점포 회계매출이 아님. 인구와 나누어 광고 전환율로 해석하지 않음.']}
(root/'public/data/commerce.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')))
print(len(agg),'records',out['periods'])
