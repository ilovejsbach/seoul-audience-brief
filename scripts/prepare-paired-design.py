"""Build self-contained, review-only mockups. Does not alter runtime or publish."""
from pathlib import Path
import base64
import json

repo = Path(__file__).resolve().parent.parent
template = (repo / 'docs/prototypes/paired-template.html').read_text()
data = json.loads((repo / 'docs/prototypes/paired-review-data.json').read_text())
for domain, name, images in [
    ('population', '생활인구', {'analysis': 'before-pop-analysis-selected.jpg', 'consult': 'before-pop-consult-selected.jpg'}),
    ('market', '상권', {'analysis': 'before-market-analysis.jpg', 'consult': 'before-market-consult.jpg'}),
]:
    selected = dict(data)
    if domain == 'population':
        selected['markets'] = []
        selected['marketOutline'] = ''
        selected['meta'] = {k: v for k, v in data['meta'].items() if k not in ['industries', 'industriesAll', 'marketMarginals']}
    else:
        selected['population'] = {}
        selected['populationCoverage'] = {}
        selected['dongs'] = []
    before = {k: 'data:image/jpeg;base64,' + base64.b64encode((repo / 'docs/evidence/paired-design' / v).read_bytes()).decode() for k, v in images.items()}
    result = template.replace('__ROOT__', 'paired-' + domain).replace('__NAME__', name).replace('__DOMAIN__', domain)
    result = result.replace('__DATA__', json.dumps(selected, ensure_ascii=False, separators=(',', ':'))).replace('__BEFORE__', json.dumps(before, separators=(',', ':')))
    assert len(result.encode()) < 1_000_000
    filename = 'paired-' + domain + '.html'
    (repo / 'docs/prototypes' / filename).write_text(result)
    print(filename, len(result.encode()))
