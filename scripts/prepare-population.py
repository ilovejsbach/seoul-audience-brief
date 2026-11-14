import pathlib,zipfile,csv,io,json,collections
root=pathlib.Path(__file__).resolve().parents[1]
p=next((root/'data/raw/mobility').glob('OA-23016*'))
out=root/'data/prepared/population';out.mkdir(parents=True,exist_ok=True)
manifest=[]
with zipfile.ZipFile(p) as z:
 for name in sorted(z.namelist()):
  if not name.endswith('.csv'):continue
  with z.open(name) as f:
   text=io.TextIOWrapper(f,encoding='cp949');header=next(csv.reader([text.readline()])); rows=[]
   first=text.readline(); delimiter=';' if ';' in first else ','
   import itertools
   for row in csv.reader(itertools.chain([first],text),delimiter=delimiter):
    if not row:continue
    if len(row)!=len(header):raise ValueError(f'Column mismatch {name}')
    vals=[None if x.strip() in ('','*',r'\N') else float(x) for x in row[3:]]
    rows.append([row[0],int(row[1]),row[2].strip(),*vals])
  dest=out/(name.removesuffix('.csv')+'.json')
  dest.write_text(json.dumps({'source':'OA-23016','unit':'persons_estimated_at_hour','columns':header,'rows':rows},ensure_ascii=False,separators=(',',':')))
  manifest.append({'path':str(dest.relative_to(root)),'date':rows[0][0] if rows else None,'rows':len(rows),'bytes':dest.stat().st_size})
(out/'index.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print('Prepared',len(manifest),'daily files;',sum(x['rows'] for x in manifest),'rows')
