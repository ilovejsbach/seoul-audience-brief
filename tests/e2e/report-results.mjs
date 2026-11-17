import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
const base = resolve(process.env.PLAYWRIGHT_EVIDENCE_DIR || 'docs/workers-2026-11-17/w5-playwright');
const result = JSON.parse(await readFile(`${base}/results.json`, 'utf8'));
const entries = await readdir(`${base}/test-results`, { withFileTypes: true });
const measurements = [];
for (const entry of entries.filter(e => e.isDirectory())) {
  try { measurements.push(JSON.parse(await readFile(`${base}/test-results/${entry.name}/measurements.json`, 'utf8'))); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
}
const totals = {};
const defects = [];
const indeterminate = [];
const contrastAudit = { pass: 0, defects: [], indeterminate: [], decorativeExcluded: [] };
const matrix = [];
const uniformityAudit = { pass: 0, fail: 0, groups: [] };
for (const m of measurements.sort((a,b) => `${a.project}/${a.mode}/${a.topic}`.localeCompare(`${b.project}/${b.mode}/${b.topic}`))) {
  let pass = 0, fail = 0;
  for (const check of m.checks) {
    if (check.rule.startsWith('g / ')) {
      contrastAudit.pass += check.state?.passed || 0;
      for (const item of check.state?.defects || []) {
        const record={project:m.project,mode:m.mode,topic:m.topic,...item};
        contrastAudit.defects.push(record);
      }
      for (const item of check.state?.decorativeExcluded || []) contrastAudit.decorativeExcluded.push({project:m.project,mode:m.mode,topic:m.topic,...item});
      for (const item of check.state?.indeterminate || []) contrastAudit.indeterminate.push({ project:m.project,mode:m.mode,topic:m.topic,...item });
      for (const item of check.state?.focus || []) contrastAudit.indeterminate.push({ project:m.project,mode:m.mode,topic:m.topic,focus:true,...item });
    }
    if (check.rule.startsWith('h / ') && Array.isArray(check.state)) {
      for (const group of check.state) {
        uniformityAudit[group.pass ? 'pass' : 'fail']++;
        uniformityAudit.groups.push({project:m.project,mode:m.mode,topic:m.topic,...group});
      }
    }
    const rule = check.rule.split(' / ')[0];
    const unknown = check.pass === null;
    totals[rule] ||= { pass: 0, fail: 0, indeterminate: 0 };
    totals[rule][unknown ? 'indeterminate' : check.pass ? 'pass' : 'fail']++;
    if (!unknown) check.pass ? pass++ : fail++;
    if (unknown) indeterminate.push({ project: m.project, mode: m.mode, topic: m.topic, ...check });
    if (check.pass === false) defects.push({ project: m.project, mode: m.mode, topic: m.topic, ...check,
      screenshot: check.screenshot ? relative(base, check.screenshot) : undefined });
  }
  matrix.push({ project: m.project, mode: m.mode, topic: m.topic, pass, fail,
    blocked: m.checks.some(c => c.rule === 'execution-blocker'),
    optionsVisited: m.checks.filter(c => c.rule.startsWith('c / ') && !c.rule.includes('options discovered')).length,
    measuredViewport: m.checks.find(c => c.rule === 'a / map')?.state });
}
const summary = { generatedAt: new Date().toISOString(), playwrightStats: result.stats, combinations: matrix.length, totals, matrix, defects, indeterminate, contrastAudit, uniformityAudit };
await writeFile(`${base}/summary.json`, JSON.stringify(summary, null, 2));
const planned = result.stats.expected + result.stats.unexpected + result.stats.flaky + result.stats.skipped;
let md = '# 현재 실행 결과\n\n';
md += `Playwright 여정: ${result.stats.expected} 통과, ${result.stats.unexpected} 실패, ${result.stats.skipped} 건너뜀. 측정 파일 ${matrix.length}/${planned}.\n\n`;
md += '| 규칙 | 통과 판정 | 실패 판정 | 규칙 판정 불가 |\n|---|---:|---:|---:|\n';
for (const [rule,n] of Object.entries(totals)) md += `| ${rule} | ${n.pass} | ${n.fail} | ${n.indeterminate} |\n`;
md += '\n| 화면 | 모드 | 자료 | 통과 | 실패 | 옵션 순회 | 차단 |\n|---|---|---|---:|---:|---:|---|\n';
for (const m of matrix) md += `| ${m.project} | ${m.mode} | ${m.topic} | ${m.pass} | ${m.fail} | ${m.optionsVisited} | ${m.blocked ? '예' : '아니오'} |\n`;
md += `\n동위 크기 h의 개별 비교 묶음: ${uniformityAudit.pass} 통과 / ${uniformityAudit.fail} 실패. 위 표는 여정별 규칙 판정 수다. g의 텍스트·초점 판정 불가 수는 아래 대비 상세에 별도로 기록한다.\n`;
md += '\n## 실패 목록\n\n규칙별 실측 상세는 summary.json defects에 보존한다. 아래 링크는 실패가 난 바로 그 화면이다. 차단은 제품 결함 확정과 구분한다.\n\n';
for (const [i,d] of defects.entries()) md += `${i+1}. ${d.project} / ${d.mode} / ${d.topic} — ${d.rule}${d.screenshot ? ` · [화면](${d.screenshot})` : ''}\n`;
md += '\n## 판정 불가\n\n';
for (const d of indeterminate) md += `- ${d.project} / ${d.mode} / ${d.topic} — ${d.rule}: ${JSON.stringify(d.state).slice(0,500)}\n`;
md += `\n## 대비 상세: 신뢰 가능한 결함 ${contrastAudit.defects.length}건, 판정 불가 ${contrastAudit.indeterminate.length}건, 장식 제외 ${contrastAudit.decorativeExcluded.length}건, 통과 텍스트 ${contrastAudit.pass}건\n\n`;
for (const d of contrastAudit.defects) md += `- ${d.project} / ${d.mode} / ${d.topic}: “${d.text}” (${d.selector}), ${d.foreground?.join(',')} / ${d.background?.join(',')} = ${d.ratio}:1, 기준 ${d.threshold}:1\n`;
md += '\n### 대비 판정 불가\n\n';
for (const d of contrastAudit.indeterminate) md += `- ${d.project} / ${d.mode} / ${d.topic}: “${d.text||'focus ring'}” (${d.selector||'focus'}): ${d.indeterminate||'실측 색을 신뢰성 있게 분리하지 못함'}\n`;
md += `\n### 장식 제외 ${contrastAudit.decorativeExcluded.length}건\n\n`;
for (const d of contrastAudit.decorativeExcluded) md += `- ${d.project} / ${d.mode} / ${d.topic}: “${d.text}” (${d.selector}): ${d.reason}\n`;
await writeFile(`${base}/RESULTS.md`, md);
console.log(JSON.stringify({ stats: result.stats, totals, combinations: matrix.length, defects: defects.length, indeterminate: indeterminate.length, contrastAudit:{pass:contrastAudit.pass,defects:contrastAudit.defects.length,indeterminate:contrastAudit.indeterminate.length,decorativeExcluded:contrastAudit.decorativeExcluded.length} }));
