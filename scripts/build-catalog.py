import pathlib,json,datetime
root=pathlib.Path(__file__).resolve().parents[1]
items=[]
for p in sorted((root/'data').glob('catalog-*.json')):
 obj=json.loads(p.read_text()); items.append({'category':p.stem.removeprefix('catalog-'),'catalog':str(p.relative_to(root)),'datasets':obj})
(root/'data/catalog.json').write_text(json.dumps({'updated_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'categories':items},ensure_ascii=False,indent=2))
print('Catalogs:',len(items))
