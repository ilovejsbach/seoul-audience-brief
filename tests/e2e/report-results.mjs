import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
const base = resolve('docs/workers-2026-11-17/w5-playwright');
const result = JSON.parse(await readFile(`${base}/results.json`, 'utf8'));
const entries = await readdir(`${base}/test-results`, { withFileTypes: true });
const measurements = [];
for (const entry of entries.filter(e => e.isDirectory())) {
  try { measurements.push(JSON.parse(await readFile(`${base}/test-results/${entry.name}/measurements.json`, 'utf8'))); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
}
const totals = {};
const defects = [];
const matrix = [];
for (const m of measurements.sort((a,b) => `${a.project}/${a.mode}/${a.topic}`.localeCompare(`${b.project}/${b.mode}/${b.topic}`))) {
  let pass = 0, fail = 0;
  for (const check of m.checks) {
    const rule = check.rule.split(' / ')[0];
    totals[rule] ||= { pass: 0, fail: 0 };
    totals[rule][check.pass ? 'pass' : 'fail']++;
    check.pass ? pass++ : fail++;
    if (!check.pass) defects.push({ project: m.project, mode: m.mode, topic: m.topic, ...check,
      screenshot: check.screenshot ? relative(base, check.screenshot) : undefined });
  }
  matrix.push({ project: m.project, mode: m.mode, topic: m.topic, pass, fail,
    blocked: m.checks.some(c => c.rule === 'execution-blocker'),
    optionsVisited: m.checks.filter(c => c.rule.startsWith('c / ') && !c.rule.includes('options discovered')).length,
    measuredViewport: m.checks.find(c => c.rule === 'a / map')?.state });
}
const summary = { generatedAt: new Date().toISOString(), playwrightStats: result.stats, combinations: matrix.length, totals, matrix, defects };
await writeFile(`${base}/summary.json`, JSON.stringify(summary, null, 2));
let md = '# 현재 실행 결과\n\n';
md += `Playwright 여정: ${result.stats.expected} 통과, ${result.stats.unexpected} 실패, ${result.stats.skipped} 건너뜀. 측정 파일 ${matrix.length}/32.\n\n`;
md += '| 규칙 | 통과 판정 | 실패 판정 |\n|---|---:|---:|\n';
for (const [rule,n] of Object.entries(totals)) md += `| ${rule} | ${n.pass} | ${n.fail} |\n`;
md += '\n| 화면 | 모드 | 자료 | 통과 | 실패 | 옵션 순회 | 차단 |\n|---|---|---|---:|---:|---:|---|\n';
for (const m of matrix) md += `| ${m.project} | ${m.mode} | ${m.topic} | ${m.pass} | ${m.fail} | ${m.optionsVisited} | ${m.blocked ? '예' : '아니오'} |\n`;
md += '\n## 실패 목록\n\n규칙별 실측 상세는 summary.json defects에 보존한다. 아래 링크는 실패가 난 바로 그 화면이다. 차단은 제품 결함 확정과 구분한다.\n\n';
for (const [i,d] of defects.entries()) md += `${i+1}. ${d.project} / ${d.mode} / ${d.topic} — ${d.rule}${d.screenshot ? ` · [화면](${d.screenshot})` : ''}\n`;
await writeFile(`${base}/RESULTS.md`, md);
console.log(JSON.stringify({ stats: result.stats, totals, combinations: matrix.length, defects: defects.length }));
