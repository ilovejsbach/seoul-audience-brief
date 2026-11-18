import React,{useEffect,useRef,useState} from 'react';

/** 측정한 실제 픽셀 크기로 SVG를 그려 글자 배율이 1이 되게 한다(R07). */
export function useSize<T extends HTMLElement>(){
  const ref=useRef<T>(null);const [size,setSize]=useState({w:0,h:0});
  useEffect(()=>{
    const el=ref.current;if(!el)return;
    const update=()=>setSize({w:Math.floor(el.clientWidth),h:Math.floor(el.clientHeight)});
    update();const ro=new ResizeObserver(update);ro.observe(el);return()=>ro.disconnect();
  },[]);
  return {ref,...size};
}

export type Series={label:string;color:string;values:(number|null)[];dash?:string};
const niceMax=(v:number)=>{if(v<=0)return 1;const p=Math.pow(10,Math.floor(Math.log10(v)));const n=v/p;return (n<=1?1:n<=2?2:n<=5?5:10)*p};
export const compact=(v:number)=>v>=1e8?`${+(v/1e8).toFixed(1)}억`:v>=1e4?`${+(v/1e4).toFixed(1)}만`:v.toLocaleString('ko-KR');

type LineProps={series:Series[];xLabels:string[];unit:string;ariaLabel:string;tickEvery?:number;yMax?:number;onPoint?:(i:number)=>void;emptyText?:string};
export function LineChart({series,xLabels,unit,ariaLabel,tickEvery=1,yMax,emptyText='선택한 조건에 표시할 값이 없습니다'}:LineProps){
  const {ref,w,h}=useSize<HTMLDivElement>();
  const all=series.flatMap(s=>s.values).filter((v):v is number=>v!=null);
  const M={l:64,r:16,t:12,b:44};
  const max=yMax??niceMax(Math.max(0,...all));
  const iw=Math.max(10,w-M.l-M.r),ih=Math.max(10,h-M.t-M.b);
  const x=(i:number)=>M.l+(xLabels.length<2?iw/2:i*iw/(xLabels.length-1));
  const y=(v:number)=>M.t+ih-(v/max)*ih;
  return <div ref={ref} className="swChartBox">
    {w>0&&h>0&&(all.length?<svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={ariaLabel}>
      {[0,.25,.5,.75,1].map(t=><g key={t}><line x1={M.l} x2={w-M.r} y1={y(max*t)} y2={y(max*t)} className="swGrid"/><text x={M.l-8} y={y(max*t)+4} textAnchor="end" className="swAxis">{compact(Math.round(max*t*10)/10)}</text></g>)}
      {xLabels.map((l,i)=>i%tickEvery===0&&<text key={i} x={x(i)} y={h-M.b+20} textAnchor="middle" className="swAxis">{l}</text>)}
      <text x={M.l} y={h-6} className="swAxis">{unit}</text>
      {series.map(s=>{
        const segs:string[]=[];let cur='';
        s.values.forEach((v,i)=>{if(v==null){if(cur)segs.push(cur);cur='';return}cur+=`${cur?'L':'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`});
        if(cur)segs.push(cur);
        return <g key={s.label}>{segs.map((d,k)=><path key={k} d={d} fill="none" stroke={s.color} strokeWidth={2.5} strokeDasharray={s.dash}/>)}
          {s.values.map((v,i)=>v!=null&&xLabels.length<=24?<circle key={i} cx={x(i)} cy={y(v)} r={3} fill={s.color}/>:null)}</g>;
      })}
    </svg>:<div className="swEmpty">{emptyText}</div>)}
  </div>;
}

export type Bar={label:string;value:number|null;color?:string;note?:string};
export function BarChart({bars,unit,ariaLabel,max}:{bars:Bar[];unit:string;ariaLabel:string;max?:number}){
  const {ref,w,h}=useSize<HTMLDivElement>();
  const M={l:64,r:16,t:20,b:44};
  const vals=bars.map(b=>b.value).filter((v):v is number=>v!=null);
  const top=max??niceMax(Math.max(0,...vals));
  const iw=Math.max(10,w-M.l-M.r),ih=Math.max(10,h-M.t-M.b),bw=iw/Math.max(1,bars.length);
  const y=(v:number)=>M.t+ih-(v/top)*ih;
  return <div ref={ref} className="swChartBox">
    {w>0&&h>0&&<svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={ariaLabel}>
      {[0,.5,1].map(t=><g key={t}><line x1={M.l} x2={w-M.r} y1={y(top*t)} y2={y(top*t)} className="swGrid"/><text x={M.l-8} y={y(top*t)+4} textAnchor="end" className="swAxis">{compact(Math.round(top*t))}</text></g>)}
      {bars.map((b,i)=>{
        const bx=M.l+i*bw+bw*.18,ww=bw*.64;
        return <g key={b.label}>
          {b.value==null?<text x={bx+ww/2} y={y(0)-6} textAnchor="middle" className="swAxis">자료 없음</text>
            :<><rect x={bx} y={y(b.value)} width={ww} height={Math.max(1,y(0)-y(b.value))} fill={b.color||'#24558b'}/>
              <text x={bx+ww/2} y={y(b.value)-6} textAnchor="middle" className="swBarValue">{compact(Math.round(b.value))}</text></>}
          <text x={bx+ww/2} y={h-M.b+20} textAnchor="middle" className="swAxis">{b.label}</text>
        </g>;
      })}
      <text x={M.l} y={h-6} className="swAxis">{unit}</text>
    </svg>}
  </div>;
}
