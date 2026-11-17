import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const topics = [
  ['population', '생활인구'], ['mobility', '생활이동'],
  ['migration', '거주지 전입·전출'], ['market', '상권'],
];
const activeSurface = page => page.locator('dialog.analysisDetailModal[open], .analysisMainDetail:not([hidden])').filter({ visible: true });
const menu = page => page.getByRole('combobox', { name: '상세 분석 선택', exact: true }).filter({ visible: true });
const settle = async page => {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
};

// Includes nested scroll/clip boundaries, not just the outer document width.
async function geometry(page, selector) {
  return page.locator(selector).filter({ visible: true }).evaluateAll(elements => elements.map(el => {
    const r = el.getBoundingClientRect();
    const bounds = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
    for (let p = el.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p), b = p.getBoundingClientRect();
      if (/(hidden|clip|auto|scroll)/.test(s.overflowX) || p instanceof SVGSVGElement) {
        bounds.left = Math.max(bounds.left, b.left + p.clientLeft);
        bounds.right = Math.min(bounds.right, b.right);
      }
      if (/(hidden|clip|auto|scroll)/.test(s.overflowY) || p instanceof SVGSVGElement) {
        bounds.top = Math.max(bounds.top, b.top + p.clientTop);
        bounds.bottom = Math.min(bounds.bottom, b.bottom);
      }
      // Native modal is in the top layer; DOM ancestors cannot clip it.
      if (p instanceof HTMLDialogElement && p.open) break;
    }
    return { text: el.textContent?.trim(), rect: r.toJSON(), bounds,
      fits: r.width > 0 && r.height > 0 && r.left >= bounds.left - 1 && r.top >= bounds.top - 1 && r.right <= bounds.right + 1 && r.bottom <= bounds.bottom + 1 };
  }));
}

async function fonts(page) {
  return page.evaluate(() => {
    const sizes = new Map();
    const modal = document.querySelector('dialog[open]');
    for (const el of (modal || document.body).querySelectorAll('*')) {
      if (el.closest('[hidden], [inert], dialog:not([open])') || ![...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim())) continue;
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      if (s.visibility !== 'visible' || s.display === 'none' || Number(s.opacity) === 0 || !r.width || !r.height || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) continue;
      let visible = true;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const ps = getComputedStyle(p), b = p.getBoundingClientRect();
        if (ps.visibility !== 'visible' || Number(ps.opacity) === 0 || (p.tagName === 'DETAILS' && !p.open && !p.querySelector(':scope > summary')?.contains(el))) { visible = false; break; }
        if (/(hidden|clip|auto|scroll)/.test(ps.overflow) && (r.bottom <= b.top || r.top >= b.bottom || r.right <= b.left || r.left >= b.right)) { visible = false; break; }
        if (p === modal) break; // top-layer text is not clipped by modal's DOM ancestors
      }
      if (!visible) continue;
      // SVG viewBox and nested map-camera transforms affect the rendered size.
      const m = el instanceof SVGGraphicsElement ? el.getScreenCTM() : null;
      const scale = m ? Math.hypot(m.c, m.d) : 1;
      const px = Math.round(parseFloat(s.fontSize) * scale * 10) / 10;
      if (px <= 0) continue; // zero-size icon replacement text is not rendered text
      if (!sizes.has(px)) sizes.set(px, []);
      if (sizes.get(px).length < 4) sizes.get(px).push(el.textContent.trim().slice(0, 65));
    }
    return [...sizes].sort((a, b) => a[0] - b[0]).map(([px, examples]) => ({ px, examples }));
  });
}

async function querySnapshot(page, topic) {
  return page.evaluate(topic => {
    const root = topic === 'market' ? document.querySelector('.mapWorkspaceTopQuery') : [...document.querySelectorAll('.analysisView .controls')].find(e => !e.closest('[hidden]'));
    if (!root) throw Error('Query host missing');
    return [...root.querySelectorAll('input,select,button[aria-pressed],[role="combobox"]')].map(el => ({
      id: el.id, name: el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 40),
      value: el.getAttribute('role') === 'combobox' ? el.getAttribute('title') : el.value ?? null, pressed: el.getAttribute('aria-pressed'), disabled: el.disabled,
    }));
  }, topic);
}

async function enter(page, topic, label, mode) {
  await page.goto('/');
  await page.getByRole('heading', { name: '지역별 광고 입지 분석', exact: true }).waitFor();
  if (topic === 'market') {
    // Pick the mode before entering the market workspace, which shares this state.
    if (mode === 'presentation') await page.getByRole('button', { name: '시연용', exact: true }).click();
    await page.getByRole('button', { name: '상권 지도', exact: true }).click();
    await page.locator('.marketMapSvg path[data-market-code]').first().waitFor();
    await page.locator('#market-query-period').selectOption('20261');
  } else {
    await page.locator('.analysisDatasets > button').filter({ has: page.getByRole('heading', { name: new RegExp(`^${label}`) }) }).click();
    if (mode === 'presentation') await page.getByRole('button', { name: '시연용', exact: true }).click();
    await page.locator(`#map-${topic} svg`).filter({ visible: true }).first().waitFor();
    const id = topic === 'population' ? '#population-query-hour' : topic === 'mobility' ? '#extra-hour-mobility' : '#extra-period-migration';
    await page.locator(id).filter({ visible: true }).selectOption(topic === 'migration' ? '2024' : '12');
  }
  await settle(page);
  await expect(page.locator('#root > .app')).toHaveClass(new RegExp(`mode-${mode}`));
  // Launch navigation uses smooth scroll; reset once before the first-screen oracle.
  await page.evaluate(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); });
  await settle(page);
}

for (const mode of ['analysis', 'presentation']) for (const [topic, label] of topics) {
  test(`${mode} / ${topic} / R05 R07 R15 R20`, async ({ page }, info) => {
    const checks = [];
    async function check(rule, state, pass) {
      const record = { rule, pass: !!pass, state };
      checks.push(record);
      if (!pass) {
        const path = info.outputPath(`failure-${String(checks.length).padStart(3, '0')}.png`);
        await page.screenshot({ path });
        record.screenshot = path;
      }
      expect.soft(!!pass, `${rule}: ${JSON.stringify(state).slice(0, 1600)}`).toBe(true);
    }
    async function common(stage) {
      const width = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, innerWidth, innerHeight, dpr: devicePixelRatio, scale: visualViewport?.scale, scrollX, scrollY }));
      await check(`a / ${stage}`, width, width.scrollWidth <= width.clientWidth);
      const sizes = await fonts(page);
      await check(`f / ${stage}`, sizes, sizes.length > 0 && sizes.length <= (mode === 'presentation' ? 4 : 6));
    }
    try {
      await enter(page, topic, label, mode);
      await common('map');
      const mapSelector = topic === 'market' ? '.marketMapSvg' : `#map-${topic} .mapWrap > svg`;
      const map = await geometry(page, mapSelector);
      await check('b / main map first screen', map, map.length === 1 && map[0].fits);

      if (topic === 'market') {
        // Pointer activation of a tiny polygon is unreliable; Enter is a supported UI path.
        await page.locator('.marketMapSvg path[data-market-code="3120107"]').press('Enter');
        await page.getByRole('combobox', { name: '상권 상세 분석 선택', exact: true }).selectOption('trend');
      } else {
        await menu(page).selectOption(`trend-${topic}`);
      }
      await activeSurface(page).waitFor();
      const options = await activeSurface(page).getByRole('combobox', { name: '상세 분석 선택', exact: true }).locator('option').evaluateAll(es => es.filter(e => e.value && !e.disabled).map(e => ({ value: e.value, label: e.textContent })));
      await check('c / options discovered', options, options.length > 0);
      for (const display of ['popup', 'main']) {
        if (display === 'main') await activeSurface(page).getByRole('button', { name: '본문에서 보기', exact: true }).click();
        for (const option of options) {
          const before = await querySnapshot(page, topic);
          await activeSurface(page).getByRole('combobox', { name: '상세 분석 선택', exact: true }).selectOption(option.value);
          await settle(page);
          const surface = activeSurface(page);
          const combo = await geometry(page, 'dialog[open] .detailNavigationSelect, .analysisMainDetail:not([hidden]) .detailNavigationSelect');
          const returnSelector = display === 'popup' ? 'dialog[open] .analysisDetailClose' : '.analysisMainDetail:not([hidden]) .analysisDetailSurfaceActions button:last-child';
          const back = await geometry(page, returnSelector);
          await check(`c / ${display} / ${option.value}`, { combo, back, selected: await surface.locator('.detailNavigationSelect').inputValue() }, combo.length === 1 && combo[0].fits && back.length === 1 && back[0].fits && await surface.locator('.detailNavigationSelect').inputValue() === option.value);
          await common(`${display} / ${option.value}`);
          const detailGraphics = await geometry(page, 'dialog[open] .analysisDetailContent svg[role="img"], .analysisMainDetail:not([hidden]) .analysisDetailContent svg[role="img"]');
          if (detailGraphics.length) await check(`b / ${display} / ${option.value} graphics`, detailGraphics, detailGraphics.every(g => g.fits));
          if (option.value === 'trend' || option.value === `trend-${topic}`) {
            const graphs = await geometry(page, 'dialog[open] .trendSvgWrap > svg, .analysisMainDetail:not([hidden]) .trendSvgWrap > svg');
            await check(`b / ${display} / trend first screen`, graphs, graphs.length === 1 && graphs[0].fits);
            const axes = await geometry(page, 'dialog[open] .trendAxis, .analysisMainDetail:not([hidden]) .trendAxis');
            await check(`e / ${display} / trend axis`, axes, axes.length > 0 && axes.every(a => a.fits));
          }
          // Actually return after EVERY option, then reopen it. No skipped option after a soft failure.
          await surface.locator(display === 'popup' ? '.analysisDetailClose' : '.analysisDetailSurfaceActions button:last-child').click();
          await expect(activeSurface(page)).toHaveCount(0);
          await settle(page);
          const after = await querySnapshot(page, topic);
          await check(`d / ${display} / ${option.value}`, { before, after }, JSON.stringify(before) === JSON.stringify(after));
          const restored = await geometry(page, mapSelector);
          await check(`b / returned / ${display} / ${option.value}`, restored, restored.length === 1 && restored[0].fits);
          if (topic === 'market') await page.getByRole('combobox', { name: '상권 상세 분석 선택', exact: true }).selectOption(option.value);
          else await menu(page).selectOption(option.value);
          await activeSurface(page).waitFor();
        }
      }
    } catch (error) {
      checks.push({ rule: 'execution-blocker', pass: false, state: { message: String(error), remainingChecks: 'not executed; see results.json' } });
      throw error;
    } finally {
      const payload = { title: info.title, project: info.project.name, viewport: page.viewportSize(), mode, topic, checks };
      const file = info.outputPath('measurements.json');
      await writeFile(file, JSON.stringify(payload, null, 2));
      await info.attach('rule-measurements', { path: file, contentType: 'application/json' });
    }
  });
}
