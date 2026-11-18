import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const topics = [
  ['population', '생활인구'], ['mobility', '생활이동'],
  ['migration', '거주지 전입·전출'], ['market', '상권'],
];
const activeSurface = page => page.locator('dialog.analysisDetailModal[open], .analysisMainDetail:not([hidden])').filter({ visible: true });
const menu = page => page.getByRole('combobox', { name: '상세 분석 선택', exact: true }).filter({ visible: true });
const heroHeading = page => page.getByRole('heading', { name: '서울의 흐름을, 광고 입지의 근거로', exact: true });
const tabNames = { population: '생활인구', mobility: '생활이동', migration: '거주지 이동', commerce: '추정매출' };
// Start screen -> 지역 분석 시작 -> data tab (the data tabs stay in the header row until stage 2).
async function startRegion(page, topic, mode) {
  await page.goto('/');
  await heroHeading(page).waitFor();
  await page.getByRole('button', { name: '지역 분석 시작', exact: true }).click();
  if (topic !== 'population') await page.locator('.analysisNavData [role=tab]').filter({ hasText: tabNames[topic] }).click();
  if (mode === 'presentation') await page.getByRole('button', { name: '시연용', exact: true }).click();
}
const openMarketTopic = page => page.getByRole('button', { name: '상권 분석', exact: true }).click();
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

// WCAG 2.2 AA contrast (R07-R09,R20). CSS backgrounds are composited from
// the text element upward. Image/gradient/SVG backgrounds use screenshot pixels.
async function contrast(page) {
  const shot = (await page.screenshot()).toString('base64');
  return page.evaluate(async shot => {
    const parse = value => {
      const m = value.match(/^rgba?\(([^)]+)\)$/); if (!m) return null;
      const n = m[1].split(',').map(x => parseFloat(x));
      return [n[0], n[1], n[2], n.length > 3 ? n[3] : 1];
    };
    const luminance = c => { const s=c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}); return .2126*s[0]+.7152*s[1]+.0722*s[2]; };
    const composite = (fg,bg) => { const a=fg[3]; return [0,1,2].map(i=>fg[i]*a+bg[i]*(1-a)).concat(1); };
    const ratio = (a,b) => { const x=luminance(a),y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
    const visible = el => { const r=el.getBoundingClientRect(),s=getComputedStyle(el); return r.width&&r.height&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth&&s.display!=='none'&&s.visibility==='visible'&&!el.closest('[hidden],[inert],dialog:not([open])'); };
    const image = new Image(); image.src=`data:image/png;base64,${shot}`; await image.decode();
    const canvas=document.createElement('canvas'); canvas.width=image.width; canvas.height=image.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true}); ctx.drawImage(image,0,0);
    const pixel=(x,y)=>{x=Math.max(0,Math.min(canvas.width-1,Math.round(x)));y=Math.max(0,Math.min(canvas.height-1,Math.round(y)));return [...ctx.getImageData(x,y,1,1).data]};
    const results=[], excluded=[];
    const describe=el=>({text:el.textContent.trim().replace(/\s+/g,' ').slice(0,60),selector:el.tagName.toLowerCase()+(el.className&&typeof el.className==='string'?'.'+el.className.trim().split(/\s+/).slice(0,2).join('.'):'' )});
    for(const el of document.querySelectorAll('body *')) {
      if(!visible(el)||![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())) continue;
      // aria-hidden applies to the element and its descendants, including a
      // descendant with aria-hidden=false. Keep exclusions separate from unknowns.
      const decorative=el.closest('[aria-hidden="true"]');
      if(decorative){excluded.push({...describe(el),reason:'decorative text inside aria-hidden="true"',ancestor:describe(decorative).selector});continue;}
      let fg=parse(getComputedStyle(el).color);
      if(!fg){results.push({...describe(el),ratio:null,pass:null,indeterminate:'unsupported computed foreground color'});continue;}
      let bg=[255,255,255,1], indeterminate=null, complex=false;
      const chain=[]; for(let p=el;p&&p!==document.documentElement;p=p.parentElement)chain.push(p);
      let opacity=1; for(const p of chain)opacity*=Number(getComputedStyle(p).opacity);
      for(const p of [...chain].reverse()){
        const st=getComputedStyle(p);
        if(st.backgroundImage!=='none' || (p instanceof SVGGraphicsElement && p.tagName!=='svg')) complex=true;
        const c=parse(st.backgroundColor); let layerOpacity=1; for(let n=p;n&&n!==document.documentElement;n=n.parentElement)layerOpacity*=Number(getComputedStyle(n).opacity);
        if(c&&c[3]>0) bg=composite([c[0],c[1],c[2],c[3]*layerOpacity],bg);
      }
      const rawFg=[fg[0],fg[1],fg[2],fg[3]*opacity]; fg=composite(rawFg,bg);
      let sampled=null;
      if(complex){
        const r=el.getBoundingClientRect(), sx=canvas.width/innerWidth, sy=canvas.height/innerHeight;
        const l=Math.max(0,Math.floor(r.left*sx)), t=Math.max(0,Math.floor(r.top*sy)), right=Math.min(canvas.width,Math.ceil(r.right*sx)), bottom=Math.min(canvas.height,Math.ceil(r.bottom*sy));
        const bgs=[]; for(let x=l-2;x<=right+2;x+=Math.max(1,Math.floor((right-l)/12))) {bgs.push(pixel(x,t-2));bgs.push(pixel(x,bottom+1));} for(let y=t;y<=bottom;y+=Math.max(1,Math.floor((bottom-t)/8))) {bgs.push(pixel(l-2,y));bgs.push(pixel(right+1,y));}
        const valid=bgs.filter(p=>p[3]>245), bins=new Map(); for(const p of valid){const k=p.slice(0,3).join(',');bins.set(k,(bins.get(k)||0)+1);}
        const dominant=[...bins].sort((a,b)=>b[1]-a[1])[0];
        if(dominant&&dominant[1]/valid.length>=.7){bg=dominant[0].split(',').map(Number).concat(1);sampled='screenshot-border-dominant';}
        const ink=[]; for(let y=t;y<bottom;y+=2)for(let x=l;x<right;x+=2){const p=pixel(x,y); if(p[3]>245&&Math.sqrt((p[0]-fg[0])**2+(p[1]-fg[1])**2+(p[2]-fg[2])**2)<75)ink.push(p);}
        if(ink.length<2 || !sampled) indeterminate='screenshot pixels did not yield reliable local foreground/background';
        if(el instanceof SVGGraphicsElement && getComputedStyle(el).stroke!=='none') indeterminate='SVG text has an outline; pixel samples cannot separate fill, stroke and map background reliably';
      }
      const px=parseFloat(getComputedStyle(el).fontSize), bold=parseInt(getComputedStyle(el).fontWeight)>=700;
      const threshold=px>=24||(px>=18.66&&bold)?3:4.5;
      results.push({text:el.textContent.trim().replace(/\s+/g,' ').slice(0,60),selector:el.tagName.toLowerCase()+(el.className&&typeof el.className==='string'?'.'+el.className.trim().split(/\s+/).slice(0,2).join('.'):''),foreground:fg.slice(0,3).map(Math.round),background:bg.slice(0,3).map(Math.round),ratio:indeterminate?null:+ratio(fg,bg).toFixed(2),threshold,pass:indeterminate?null:ratio(fg,bg)>=threshold,indeterminate,sampled,opacity:+opacity.toFixed(3)});
    }
    const focus=[];
    for(const el of document.querySelectorAll(':focus-visible')) { const s=getComputedStyle(el),color=parse(s.outlineColor); if(color&&parseFloat(s.outlineWidth)>0)focus.push({text:el.textContent.trim().slice(0,40),outline:s.outlineColor,background:s.backgroundColor,width:s.outlineWidth,style:s.outlineStyle,ratio:null,indeterminate:'outline contrast needs adjacent pixel sampling'}); }
    return {texts:results,focus,excluded};
  },shot);
}

// R04/R20: data tabs, same-purpose mode choices and zoom +/- controls only.
async function uniformity(page) {
  return page.evaluate(() => {
    const groups=[];
    const add=(name,selector,equalWidth=false)=>{const els=[...document.querySelectorAll(selector)].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&getComputedStyle(e).visibility==='visible'&&!e.closest('[hidden]')}); if(els.length>1)groups.push({name,equalWidth,items:els.map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent.trim().replace(/\s+/g,' ').slice(0,35),x:r.x,y:r.y,width:r.width,height:r.height,centerY:r.top+r.height/2}})});};
    add('four dataset tabs','.analysisNavData [role=tab]',true);
    add('analysis/presentation mode choices','.modeToggle button');
    add('market zoom +/- controls','.marketZoom button');
    for(const g of groups){const heights=g.items.map(i=>i.height),centers=g.items.map(i=>i.centerY),widths=g.items.map(i=>i.width);g.maxHeightDelta=Math.max(...heights)-Math.min(...heights);g.maxCenterDelta=Math.max(...centers)-Math.min(...centers);g.maxWidthDelta=Math.max(...widths)-Math.min(...widths);g.pass=g.maxHeightDelta<=1&&g.maxCenterDelta<=1&&(!g.equalWidth||g.maxWidthDelta<=1);}
    return groups;
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
  if (topic === 'market') {
    // Enter through the region (in the chosen mode) so the I04 inheritance path is exercised.
    await startRegion(page, 'population', mode);
    await openMarketTopic(page);
    await page.locator('.marketMapSvg path[data-market-code]').first().waitFor();
    await page.locator('#market-query-period').selectOption('20261');
  } else {
    await startRegion(page, topic, mode);
    await page.locator(`#map-${topic} svg`).filter({ visible: true }).first().waitFor();
    const id = topic === 'population' ? '#population-query-hour' : topic === 'mobility' ? '#extra-hour-mobility' : '#extra-period-migration';
    await page.locator(id).filter({ visible: true }).selectOption(topic === 'migration' ? '2024' : '12');
  }
  await settle(page);
  // I04: the market has no mode; entering it from presentation must not inherit it.
  if (topic === 'market') {
    await expect(page.locator('#root > .app')).toHaveClass(/service-market/);
    await expect(page.locator('#root > .app')).not.toHaveClass(/mode-presentation/);
  } else await expect(page.locator('#root > .app')).toHaveClass(new RegExp(`mode-${mode}`));
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
      await check(`f / ${stage}`, sizes, sizes.length > 0 && sizes.length <= (mode === 'presentation' && topic !== 'market' ? 4 : 6));
    }
    try {
      await enter(page, topic, label, mode);
      await common('map');
      const focusTarget=topic==='market'?'.integratedMarketHeader .integratedBrand':'.analysisNavData [role=tab][aria-selected=true]';
      await page.locator(focusTarget).focus();
      await page.keyboard.press('Tab');
      const g=await contrast(page);
      const reliableDefects=g.texts.filter(x=>x.pass===false&&!x.indeterminate);
      await check('g / text contrast / map',{
        passed:g.texts.filter(x=>x.pass===true&&!x.indeterminate).length,
        defects:reliableDefects,
        indeterminate:g.texts.filter(x=>x.pass===null||x.indeterminate),
        decorativeExcluded:g.excluded,
        focus:g.focus,
      },reliableDefects.length===0);
      const h=await uniformity(page); await check('h / normative peer sizes / map',h,h.every(x=>x.pass));
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

// I01 / R05 R06 R11 R14 R20: the map's "색상·표시 설정" panel must open to a
// readable, operable width. Opened by the real keyboard (Enter) and pointer.
// Every "must exist" step asserts a count first so a missing target cannot pass.
const displayTopics = [['population', '생활인구'], ['mobility', '생활이동'], ['migration', '거주지 전입·전출'], ['commerce', '행정동 추정매출']];
for (const mode of ['analysis', 'presentation']) for (const fullscreen of [false, true]) for (const [topic, label] of displayTopics) {
  test(`${mode} / ${fullscreen ? 'fullscreen' : 'normal'} / ${topic} / display settings I01`, async ({ page }, info) => {
    await startRegion(page, topic, mode);
    await page.locator(`#map-${topic} svg`).filter({ visible: true }).first().waitFor();
    if (fullscreen) { await page.getByRole('button', { name: '지도 전체화면 보기' }).click(); await expect(page.getByRole('button', { name: '지도 전체화면 닫기' })).toBeVisible(); }
    await settle(page);
    const panel = page.locator('.mapDisplaySettings').filter({ visible: true });
    await expect(panel, 'exactly one visible display-settings control').toHaveCount(1);
    const summary = panel.locator('> summary');
    const measure = async stage => {
      const m = await page.evaluate(() => {
        const d = [...document.querySelectorAll('.mapDisplaySettings')].find(e => e.open);
        if (!d) return null;
        const rect = x => x.getBoundingClientRect().toJSON(), host = d.closest('.mapWrap');
        return { rect: rect(d), host: rect(host), innerWidth, innerHeight, position: getComputedStyle(d).position };
      });
      const state = { stage, mode, fullscreen, topic, project: info.project.name, ...m };
      const ok = !!m && m.rect.width >= 300 && m.rect.height > 80 && m.rect.left >= m.host.left - 1 && m.rect.right <= m.host.right + 1 && m.rect.top >= m.host.top - 1 && m.rect.right <= m.innerWidth + 1;
      expect.soft(ok, `${stage}: ${JSON.stringify(state)}`).toBe(true);
      return state;
    };
    const states = [];
    // 1) keyboard open
    await summary.focus(); await page.keyboard.press('Enter');
    await expect(panel).toHaveJSProperty('open', true);
    states.push(await measure('keyboard Enter'));
    await page.screenshot({ path: info.outputPath('settings-open.png') });
    // 2) operate: observed-minimum padding, invalid then valid (error recovery)
    await panel.getByLabel('색상 시작 기준').selectOption('observed');
    const pad = panel.getByLabel('최솟값 아래 여유(%)');
    await expect(pad).toHaveCount(1);
    const status = panel.locator('.mapColorRangeNotice[role="status"]');
    await pad.fill('150'); await panel.getByRole('button', { name: '시작 여유 적용' }).click();
    await expect(panel.locator('.mapColorRangeError')).toBeVisible();
    await pad.fill('20'); await panel.getByRole('button', { name: '시작 여유 적용' }).click();
    await expect(panel.locator('.mapColorRangeError')).toHaveCount(0);
    await expect(status).toContainText('20%');
    // 3) operate: manual min/max, invalid (min=max) then valid, then reset
    await panel.locator('.mapManualRange > details > summary').click();
    const lowInput = panel.getByLabel('색상 최솟값'), highInput = panel.getByLabel('색상 최댓값');
    await expect(lowInput).toHaveCount(1); await expect(highInput).toHaveCount(1);
    const summaryEl = panel.locator('.mapManualRangeSummary');
    const low = Number(await summaryEl.getAttribute('data-color-low')), high = Number(await summaryEl.getAttribute('data-color-high'));
    expect(high).toBeGreaterThan(low);
    await lowInput.fill(String(low)); await highInput.fill(String(low));
    await panel.getByRole('button', { name: '색상 범위 적용' }).click();
    await expect(panel.locator('.mapManualRange [role="alert"]')).toBeVisible();
    const target = Math.round((low + high) / 2);
    await highInput.fill(String(target)); await panel.getByRole('button', { name: '색상 범위 적용' }).click();
    await expect(panel.locator('.mapManualRange [role="alert"]')).toHaveCount(0);
    expect(Number(await summaryEl.getAttribute('data-color-high'))).toBe(target);
    await expect(summaryEl).toContainText('직접 범위');
    await panel.getByRole('button', { name: '직접 범위 초기화' }).click();
    await expect(summaryEl).toContainText('자동 범위');
    states.push(await measure('after operating controls'));
    // 4) Esc closes and returns focus to the summary
    await page.keyboard.press('Escape');
    await expect(panel).toHaveJSProperty('open', false);
    expect(await page.evaluate(() => document.activeElement?.matches('.mapDisplaySettings > summary'))).toBe(true);
    // 5) pointer reopen
    await summary.click();
    await expect(panel).toHaveJSProperty('open', true);
    states.push(await measure('pointer click reopen'));
    await writeFile(info.outputPath('display-settings-measurements.json'), JSON.stringify(states, null, 2));
    await info.attach('display-settings-measurements', { path: info.outputPath('display-settings-measurements.json'), contentType: 'application/json' });
  });
}

// I04 / REQ-23 / R03 R13 R20: the market must look and behave the same whichever
// region mode the user came from, and the region mode must survive the round trip.
const marketProbe = page => page.evaluate(() => {
  const px = sel => { const e = [...document.querySelectorAll(sel)].find(x => x.getClientRects().length); return e ? { font: getComputedStyle(e).fontSize, weight: getComputedStyle(e).fontWeight, width: Math.round(e.getBoundingClientRect().width) } : null; };
  return { root: document.querySelector('#root > .app').className.replace(/\s+/g, ' '),
    period: px('#market-query-period'), heading: px('.mapWorkspaceHeader h1'), back: px('.mapWorkspaceHeaderActions button:last-child'), query: px('.mapWorkspaceTopQuery label'), tabs: px('.integratedMarketHeader .integratedBrand'),
    modeToggleVisible: [...document.querySelectorAll('.modeToggle')].some(e => e.getClientRects().length) };
});
test('I04 market has no mode: both region modes give the same market', async ({ page }, info) => {
  const results = {};
  for (const mode of ['analysis', 'presentation']) {
    await startRegion(page, 'population', mode);
    await page.locator('#map-population svg').filter({ visible: true }).first().waitFor();
    await page.locator('#population-query-hour').filter({ visible: true }).selectOption('12');
    await openMarketTopic(page);
    await page.locator('.marketMapSvg path[data-market-code]').first().waitFor();
    await page.locator('#market-query-period').selectOption('20261');
    await settle(page);
    const probe = await marketProbe(page);
    const sizes = await fonts(page);
    results[mode] = { probe, sizes };
    expect(probe.root, `${mode}: market root must not carry mode-presentation`).not.toMatch(/mode-presentation/);
    expect(probe.modeToggleVisible, `${mode}: no mode toggle in market`).toBe(false);
    expect(probe.period, 'target missing').not.toBeNull(); expect(probe.heading).not.toBeNull(); expect(probe.query).not.toBeNull();
    expect(sizes.length).toBeLessThanOrEqual(6);
    // return to the region: mode and condition are preserved
    await page.getByRole('button', { name: '지역 분석 지도', exact: true }).click();
    await expect(page.locator('#root > .app')).toHaveClass(new RegExp(`mode-${mode}`));
    await expect(page.getByRole('button', { name: mode === 'presentation' ? '시연용' : '분석용', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#population-query-hour').filter({ visible: true })).toHaveValue('12');
    // and the market keeps its own condition on a second visit
    await openMarketTopic(page);
    await expect(page.locator('#market-query-period')).toHaveValue('20261');
    // The topic menu returns to the region exactly like the in-market button does.
    await page.getByRole('button', { name: '지역 분석', exact: true }).click();
    await expect(page.locator('#root > .app')).toHaveClass(new RegExp(`mode-${mode}`));
    await expect(page.locator('#population-query-hour').filter({ visible: true })).toHaveValue('12');
  }
  expect(results.presentation.probe).toEqual(results.analysis.probe);
  expect(results.presentation.sizes.map(x => x.px)).toEqual(results.analysis.sizes.map(x => x.px));
  await writeFile(info.outputPath('i04-market-probe.json'), JSON.stringify(results, null, 2));
});

// ---- 1b: start screen, topic menu, more menu (N01, I08, I09, sticky) ----
import { readFileSync } from 'node:fs';
const dataJson = file => JSON.parse(readFileSync(new URL(`../../public/data/${file}`, import.meta.url), 'utf8'));
const topicButtons = page => page.locator('.topicNav button');

test('N01 start screen: two equal starts, disabled resume, topic menu and planned items', async ({ page }, info) => {
  const requests = [];
  await page.goto('/');
  await heroHeading(page).waitFor();
  await settle(page);
  // two start buttons, same size (R04)
  const starts = await page.locator('.heroActions button').evaluateAll(es => es.map(e => { const r = e.getBoundingClientRect(); return { text: e.textContent.trim(), w: r.width, h: r.height }; }));
  expect(starts.map(x => x.text)).toEqual(['지역 분석 시작', '상권 분석 시작']);
  expect(Math.abs(starts[0].w - starts[1].w) <= 1 && Math.abs(starts[0].h - starts[1].h) <= 1, JSON.stringify(starts)).toBe(true);
  // first visit: resume disabled, no topic selected, 4 topics of equal size
  await expect(page.getByRole('button', { name: '이어보기', exact: true })).toBeDisabled();
  await expect(topicButtons(page)).toHaveCount(4);
  const topics = await topicButtons(page).evaluateAll(es => es.map(e => { const r = e.getBoundingClientRect(); return { text: e.textContent.trim(), w: r.width, h: r.height, cy: r.top + r.height / 2, pressed: e.getAttribute('aria-pressed'), disabled: e.disabled }; }));
  expect(topics.map(x => x.text)).toEqual(['지역 분석', '상권 분석', '교통', '부동산(예정)']);
  expect(topics.every(x => x.pressed !== 'true'), 'no topic selected on the start screen').toBe(true);
  expect(Math.max(...topics.map(x => x.w)) - Math.min(...topics.map(x => x.w)) <= 1 && Math.max(...topics.map(x => x.h)) - Math.min(...topics.map(x => x.h)) <= 1 && Math.max(...topics.map(x => x.cy)) - Math.min(...topics.map(x => x.cy)) <= 1, JSON.stringify(topics)).toBe(true);
  expect(topics.map(x => x.disabled)).toEqual([false, false, false, true]);
  // 교통은 이제 활성이다(w34). 아직 예정인 부동산만 아무 일도 하지 않고 요청도 없다.
  page.on('request', r => requests.push(r.url()));
  await topicButtons(page).nth(3).click({ force: true });
  await page.waitForTimeout(400);
  expect(requests, 'the planned topic must not request data').toEqual([]);
  await expect(heroHeading(page)).toBeVisible();
  // no mode toggle on the start screen
  await expect(page.locator('.modeToggle')).toHaveCount(0);
  // start region -> mode toggle exists only there
  await page.getByRole('button', { name: '지역 분석 시작', exact: true }).click();
  await expect(page.locator('.modeToggle')).toHaveCount(1);
  await expect(topicButtons(page).nth(0)).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#population-query-hour').filter({ visible: true }).selectOption('9');
  await page.getByRole('button', { name: '시연용', exact: true }).click();
  // back to start via brand, resume restores region, mode and condition
  await page.locator('.appTopbar .integratedBrand').click();
  await heroHeading(page).waitFor();
  await expect(page.locator('.modeToggle')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '이어보기', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '이어보기', exact: true }).click();
  await expect(page.locator('#root > .app')).toHaveClass(/mode-presentation/);
  await expect(page.locator('#population-query-hour').filter({ visible: true })).toHaveValue('9');
  // market: no mode toggle; resume goes to the market the second time
  await openMarketTopic(page);
  await expect(page.locator('.modeToggle')).toHaveCount(0);
  await expect(topicButtons(page).nth(1)).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.appTopbar .integratedBrand').click();
  await expect(page.getByText('마지막으로 보던 상권 분석 화면으로 돌아갑니다.')).toBeVisible();
  await page.getByRole('button', { name: '이어보기', exact: true }).click();
  await expect(page.locator('.marketMapSvg path[data-market-code]').first()).toBeVisible();
  await writeFile(info.outputPath('n01.json'), JSON.stringify({ starts, topics }, null, 2));
});

test('start screen figures equal the source files and I08 old range text is gone', async ({ page }) => {
  await page.goto('/');
  await heroHeading(page).waitFor();
  const days = new Set(dataJson('population/index.json').map(e => e.date)).size;
  const dongs = dataJson('regions.json').dongs.filter(d => d.activePopulation !== false).length;
  const periods = dataJson('commerce.json').periods;
  const areas = dataJson('market-areas.geojson').features.length;
  await expect(page.locator('.heroStat')).toHaveCount(4);
  await expect(page.locator('.heroStat dd strong')).toHaveText([String(days), String(dongs), areas.toLocaleString('ko-KR'), String(periods.length)]);
  const dates = dataJson('population/index.json').map(e => e.date).sort();
  const f = d => `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}`;
  await expect(page.locator('.heroStat').nth(0)).toContainText(`${f(dates[0])}–${f(dates.at(-1))}`);
  await expect(page.locator('.heroStat').nth(3)).toContainText(`${periods[0].slice(0, 4)}Q${periods[0].slice(4)}–${periods.at(-1).slice(0, 4)}Q${periods.at(-1).slice(4)}`);
  const text = await page.locator('#root').innerText();
  expect(text, 'I08: the old fixed range text must be gone').not.toMatch(/2026\.01–10|1–10월/);
  // silhouette: 25 single-colour paths, no data colouring
  const fills = await page.locator('.seoulSilhouette path').evaluateAll(es => [...new Set(es.map(e => getComputedStyle(e).fill))]);
  expect(await page.locator('.seoulSilhouette path').count()).toBe(25);
  expect(fills.length).toBe(1);
});

test('sticky top bar and type sizes on the start screen', async ({ page }) => {
  await page.goto('/');
  await heroHeading(page).waitFor();
  await page.locator('#root > .app > main').evaluate(m => { m.scrollTop = 200; });
  const top = await page.locator('.appTopbar').evaluate(e => Math.round(e.getBoundingClientRect().top));
  expect(top).toBe(0);
  await expect(topicButtons(page).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const sizes = await fonts(page);
  expect(sizes.length, JSON.stringify(sizes)).toBeLessThanOrEqual(6);
});

test('I09 more menu tooltip equals the real items in every state', async ({ page }, info) => {
  const read = async () => {
    await page.locator('.moreButton').click();
    const state = await page.evaluate(() => {
      const list = document.querySelector('.moreMenuList');
      const names = [...list.children].filter(c => c.getClientRects().length).map(c => c.matches('button') ? c.textContent.trim() : (c.querySelector('button')?.getAttribute('aria-label') || c.querySelector('button')?.textContent.trim()));
      const b = document.querySelector('.moreButton');
      return { names, title: b.title, label: b.getAttribute('aria-label') };
    });
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => document.activeElement?.classList.contains('moreButton')), 'Esc returns focus to the button').toBe(true);
    await expect(page.locator('.moreMenuList')).toBeHidden();
    expect(state.names.length).toBeGreaterThan(0);
    expect(state.title).toBe(`더보기: ${state.names.join('·')}`);
    expect(state.label).toBe(state.title);
    return state;
  };
  const seen = {};
  await page.goto('/'); await heroHeading(page).waitFor();
  seen.home = await read();
  await page.getByRole('button', { name: '지역 분석 시작', exact: true }).click();
  seen.region = await read();
  await page.getByRole('button', { name: '시연용', exact: true }).click();
  seen.presentation = await read();
  await openMarketTopic(page);
  seen.market = await read();
  expect(seen.home.names).not.toContain('시작 화면');
  expect(seen.presentation.names).toContain('근거 정보 보기');
  expect(seen.region.names).not.toContain('근거 정보 보기');
  expect(seen.market.names).toEqual(['브리핑 인쇄', '시작 화면']);
  await writeFile(info.outputPath('i09.json'), JSON.stringify(seen, null, 2));
});

test('advanced layout stays inside the more menu and survives a start-screen round trip', async ({ page }) => {
  await startRegion(page, 'population', 'analysis');
  await page.locator('.moreButton').click();
  await page.getByRole('button', { name: '화면 배치', exact: true }).click();
  await expect(page.locator('.layoutOptions')).toBeVisible();
  await page.getByRole('button', { name: '균형형', exact: true }).click();
  const track = () => page.locator('#root > .app').evaluate(e => e.style.getPropertyValue('--workspace-map-track'));
  expect(await track()).toBe('67fr');
  await page.keyboard.press('Escape');
  await expect(page.locator('.layoutOptions')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.moreMenuList')).toBeHidden();
  await page.locator('.appTopbar .integratedBrand').click();
  await heroHeading(page).waitFor();
  await page.getByRole('button', { name: '이어보기', exact: true }).click();
  expect(await track(), 'ratio is kept after the start-screen round trip').toBe('67fr');
});

test('first screen with the two-row header (R05, 1365x768 and 1920)', async ({ page }, info) => {
  const rows = [];
  for (const [label, go] of [
    ['region analysis', async () => startRegion(page, 'population', 'analysis')],
    ['region presentation', async () => startRegion(page, 'population', 'presentation')],
    ['market', async () => { await startRegion(page, 'population', 'analysis'); await openMarketTopic(page); await page.locator('.marketMapSvg path[data-market-code]').first().waitFor(); }],
  ]) {
    await go(); await settle(page);
    const m = await page.evaluate(() => {
      const svg = [...document.querySelectorAll('#map-population .mapWrap > svg, .marketMapSvg')].find(e => e.getClientRects().length);
      const r = svg.getBoundingClientRect(), h = document.querySelector('#root > .app > header').getBoundingClientRect();
      return { header: Math.round(h.height), map: { top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height), bottom: Math.round(r.bottom) }, innerHeight, innerWidth, docOverflow: document.documentElement.scrollHeight > document.documentElement.clientHeight };
    });
    rows.push({ label, ...m });
    expect(m.map.bottom <= m.innerHeight + 1 && m.map.height >= 300 && !m.docOverflow, JSON.stringify(m)).toBe(true);
  }
  await writeFile(info.outputPath('first-screen.json'), JSON.stringify(rows, null, 2));
});
