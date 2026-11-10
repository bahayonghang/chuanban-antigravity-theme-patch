// 只读取 Agents 表面，不输出会话正文；所有临时样式变更均在同步 finally 内还原。
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const port = Number(fs.readFileSync(`${process.env.APPDATA}/Antigravity/DevToolsActivePort`, 'utf8').split(/\r?\n/)[0]);
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const target = targets.find(t => t.type === 'page' && /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(t.url));
if (!target) throw new Error('No Agents page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let id = 0;
const calls = new Map();
ws.onmessage = ({data}) => { const r = JSON.parse(data); if (calls.has(r.id)) { calls.get(r.id)(r); calls.delete(r.id); } };
async function call(method, params) {
  const key = ++id;
  const response = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { calls.delete(key); reject(new Error(`Timeout: ${method}`)); }, 10000);
    calls.set(key, value => { clearTimeout(timer); resolve(value); });
    ws.send(JSON.stringify({id: key, method, params}));
  });
  if (response.error) throw new Error(JSON.stringify(response.error));
  return response.result;
}
try {
  if (process.argv.includes('--capture')) {
    const css=fs.readFileSync('core/theme.css','utf8');
    const baseline=execFileSync('git',['show','c832ff5:core/theme.css'],{encoding:'utf8'});
    const output=path.join(process.env.TEMP,'antigravity-light-polish-20261110');
    fs.mkdirSync(output,{recursive:true});
    await call('Runtime.evaluate',{expression:`window.__agLightReviewRestore=(()=>{const r=document.documentElement,b=document.body,s=document.getElementById('ag-custom-fonts');const saved={scheme:r.getAttribute('data-ag-scheme'),preset:r.getAttribute('data-ag-preset'),body:b.className,css:s.textContent};return ()=>{for(const [k,v] of [['data-ag-scheme',saved.scheme],['data-ag-preset',saved.preset]]){if(v===null)r.removeAttribute(k);else r.setAttribute(k,v)}b.className=saved.body;s.textContent=saved.css;delete window.__agLightReviewRestore;};})()`});
    try {
      for(const [name,text] of [['before',baseline],['after',css]]) {
        await call('Runtime.evaluate',{expression:`(()=>{const r=document.documentElement,b=document.body;r.dataset.agScheme='light';r.dataset.agPreset='high-contrast';b.className=b.className.replace(/\\b(dark-theme|light-theme|theme-dark|theme-light|dark|light)\\b/g,'').trim()+' light light-theme theme-light';document.getElementById('ag-custom-fonts').textContent=${JSON.stringify(text)}+'\\n*,*::before,*::after{transition:none!important;animation:none!important}';})()`});
        await call('Runtime.evaluate',{expression:'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))',awaitPromise:true});
        const sampled=await call('Runtime.evaluate',{expression:`(()=>{const e=document.elementFromPoint(innerWidth*.08,innerHeight*.45),rows=[];for(let n=e;n;n=n.parentElement){if(!n.matches('.bg-sidebar,.agy-inset-shell,.agy-shell,.contents'))continue;const s=getComputedStyle(n);rows.push({tag:n.tagName,classes:n.className,background:s.backgroundColor,sidebar:s.getPropertyValue('--sidebar'),shell:s.getPropertyValue('--shell-canvas')})}return {scheme:document.documentElement.dataset.agScheme,body:document.body.className,rows}})()`,returnByValue:true});
        console.log(JSON.stringify({name,points:sampled.result.value},null,2));
        const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
        fs.writeFileSync(path.join(output,`${name}.png`),Buffer.from(shot.data,'base64'));
      }
    } finally { await call('Runtime.evaluate',{expression:'window.__agLightReviewRestore?.()'}); }
    console.log(JSON.stringify({screenshots:output,restored:true}));
  } else {
  let expression = `(() => {
    const selectors = ['html','body','.agy-shell','.agy-sheet','.bg-background','.bg-sidebar','.agy-inset-shell','[data-main-content-body]','[data-side-panel-body]','[id="antigravity.agentSidePanelInputBox"]','.surface-composer-card','[data-testid="send-button"]'];
    const props = ['background-color','background-image','color','border-color','box-shadow','--background','--sidebar','--foreground','--muted-foreground','--ag-composer-bg','--ag-line','--ag-wax','--ag-wax-soft'];
    return {scheme:document.documentElement.dataset.agScheme, preset:document.documentElement.dataset.agPreset, bodyClass:document.body.className, nodes:selectors.map(selector => { const el=document.querySelector(selector); if (!el) return {selector,missing:true}; const s=getComputedStyle(el); return {selector,tag:el.tagName,classes:el.className,styles:Object.fromEntries(props.map(p=>[p,s.getPropertyValue(p)]))}; })};
  })()`;
  if (process.argv.includes('--compare')) {
    const oldCss = execFileSync('git', ['show', 'c832ff5:core/theme.css'], {encoding:'utf8'});
    const newCss = fs.readFileSync('core/theme.css','utf8');
    expression = `(${compare.toString()})(${JSON.stringify(oldCss)},${JSON.stringify(newCss)})`;
  }
  const result = await call('Runtime.evaluate', {expression, returnByValue:true});
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  console.log(JSON.stringify(result.result.value,null,2));
  if (result.result.value?.failures?.length) process.exitCode=1;
  }
} finally { ws.close(); }

function compare(oldCss, newCss) {
  const root=document.documentElement, body=document.body, style=document.getElementById('ag-custom-fonts');
  if (!style) throw new Error('Missing injected CSS');
  const saved={scheme:root.getAttribute('data-ag-scheme'),preset:root.getAttribute('data-ag-preset'),page:root.getAttribute('data-ag-page-type'),body:body.className,css:style.textContent,inline:root.getAttribute('style'),active:document.activeElement};
  const composer=document.getElementById('antigravity.agentSidePanelInputBox');
  const composerInline=composer.getAttribute('style');
  composer.style.setProperty('transition','none','important');
  const selectors=['html','body','.agy-shell','.agy-inset-shell','.agy-sheet','.bg-background','.bg-sidebar','.agy-sidebar-row[data-selected="true"]','.agy-sidebar-row','[data-main-content-body]','[data-side-panel-body]','[id="antigravity.agentSidePanelInputBox"]','.surface-composer-card','.bg-border','.text-muted-foreground','.text-secondary-foreground','.text-foreground','.agy-send-button','[data-testid="send-button"]'];
  const nodes=[...new Set(selectors.flatMap(s=>[...document.querySelectorAll(s)].slice(0,8)))];
  const properties=['color','background-color','background-image','border-top-color','border-top-width','box-shadow','text-shadow','outline-color','opacity','font-family','font-size','--background','--foreground','--sidebar','--sidebar-border','--card','--card-border','--card-edge','--sash-line','--muted-foreground','--secondary-foreground','--ag-composer-bg','--ag-composer-card-bg','--ag-ink','--ag-ink-strong','--ag-ink-soft','--ag-ink-muted','--ag-line','--ag-wax','--ag-wax-soft'];
  const stopMotion='\n*,*::before,*::after{transition:none!important;animation:none!important}';
  const snapshot=()=>nodes.flatMap((node,i)=>[null,'::before','::after'].map(pseudo=>({node:i,pseudo,styles:Object.fromEntries(properties.map(p=>[p,getComputedStyle(node,pseudo).getPropertyValue(p)]))})));
  const failures=[],cases=[],light=[];
  const expect=(condition,message)=>{if(!condition)failures.push(message);};
  const presets=['high-contrast','chuanban-warm-white','claude-desktop-purewhite','claude-desktop-official','vintage-deep','absoulutely-chuanban'];
  try {
    for (const bodyTheme of ['light','dark']) {
      body.className=saved.body.replace(/\b(dark-theme|light-theme|theme-dark|theme-light|dark|light)\b/g,'').trim()+` ${bodyTheme} ${bodyTheme}-theme theme-${bodyTheme}`;
      for (const scheme of ['dark','light']) for (const preset of presets) {
        root.dataset.agScheme=scheme; root.dataset.agPreset=preset;
        style.textContent=oldCss+stopMotion; const before=snapshot();
        style.textContent=newCss+stopMotion; const after=snapshot();
        const targeted=scheme==='light' && ['high-contrast','chuanban-warm-white'].includes(preset);
        let differences=0;
        before.forEach((row,i)=>{for(const p of properties)if(row.styles[p]!==after[i].styles[p]){differences++;if(!targeted && failures.length<25) failures.push(`${bodyTheme}/${scheme}/${preset} node ${row.node} ${row.pseudo} ${p}: ${row.styles[p]} -> ${after[i].styles[p]}`);}});
        cases.push({bodyTheme,scheme,preset,targeted,differences});
        if (targeted) {
          const css=s=>getComputedStyle(document.querySelector(s));
          for(const s of ['.agy-shell','.agy-inset-shell','.bg-sidebar']) for(const el of document.querySelectorAll(s)) expect(getComputedStyle(el).backgroundColor==='rgb(240, 238, 230)',`${bodyTheme}/${preset} ${s} shell mismatch: ${getComputedStyle(el).backgroundColor}`);
          for(const s of ['.agy-sheet','[data-main-content-body]','[data-side-panel-body]']) expect(css(s).backgroundColor==='rgb(250, 249, 245)',`${bodyTheme}/${preset} ${s} paper mismatch: ${css(s).backgroundColor}`);
          expect(css('.agy-sheet').backgroundImage==='none',`${bodyTheme}/${preset} cold gradient`);
          expect(css('[id="antigravity.agentSidePanelInputBox"]').backgroundColor==='rgb(240, 238, 230)',`${bodyTheme}/${preset} composer outer`);
          expect(css('.surface-composer-card').backgroundColor==='rgb(255, 255, 255)',`${bodyTheme}/${preset} composer inner`);
          for(const row of document.querySelectorAll('.agy-sidebar-row[data-selected="true"]'))expect(getComputedStyle(row).backgroundColor==='rgb(227, 224, 213)',`${bodyTheme}/${preset} selected row ${getComputedStyle(row).backgroundColor}`);
          light.push({bodyTheme,preset,body:css('body').backgroundColor,shell:css('.agy-shell').backgroundColor,paper:css('.agy-sheet').backgroundColor,composer:css('[id="antigravity.agentSidePanelInputBox"]').backgroundColor,line:css('html').getPropertyValue('--ag-line'),wax:css('html').getPropertyValue('--ag-wax')});
        }
      }
    }
    root.dataset.agScheme='light'; root.dataset.agPreset='high-contrast'; style.textContent=newCss+stopMotion;
    root.style.setProperty('--ag-composer-bg','#123456'); root.style.setProperty('--ag-wax-seal-hover','#456789');
    expect(getComputedStyle(document.getElementById('antigravity.agentSidePanelInputBox')).backgroundColor==='rgb(18, 52, 86)','themeVars composer override lost');
    expect(getComputedStyle(root).getPropertyValue('--ag-wax').trim()==='#456789','themeVars wax override lost');
    if(saved.inline===null)root.removeAttribute('style');else root.setAttribute('style',saved.inline);
    root.dataset.agScheme='light'; root.dataset.agPreset='high-contrast';
    const field=composer.querySelector('[contenteditable="true"],textarea,input');
    if(!field) throw new Error('Missing composer focus target');
    const states=[];
    for(const page of ['home','chat']) {
      root.dataset.agPageType=page;
      document.activeElement?.blur();
      const base=getComputedStyle(composer);const before={color:base.borderTopColor,width:base.borderTopWidth,focused:composer.matches(':focus-within'),hovered:composer.matches(':hover')};
      field.focus({preventScroll:true});
      const focus=getComputedStyle(composer);const after={color:focus.borderTopColor,width:focus.borderTopWidth,focused:composer.matches(':focus-within')};
      expect(after.focused,`${page} focus-within missing`);
      expect(before.width===after.width,`${page} border width moved`);
      expect(after.color===(page==='home'?'rgba(198, 97, 63, 0.4)':'rgb(198, 97, 63)'),`${page} focus border ${after.color}`);
      if(!before.hovered)expect(before.color===(page==='home'?'rgba(0, 0, 0, 0)':'rgba(198, 97, 63, 0.4)'),`${page} resting border ${before.color}`);
      states.push({page,before,after});
    }
    return {nodeCount:nodes.length,properties:properties.length,pseudoStates:3,cases,light,themeVars:'checked',states,failures};
  } finally {
    for(const [name,value] of [['data-ag-scheme',saved.scheme],['data-ag-preset',saved.preset],['data-ag-page-type',saved.page],['style',saved.inline]]){if(value===null)root.removeAttribute(name);else root.setAttribute(name,value);}
    body.className=saved.body; style.textContent=saved.css;
    if(composerInline===null)composer.removeAttribute('style');else composer.setAttribute('style',composerInline);
    saved.active?.focus({preventScroll:true});
  }
}
