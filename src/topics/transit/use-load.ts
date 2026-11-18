import {useEffect,useState} from 'react';
export type Load<T>={data:T|null;error:string;loading:boolean};
/** 비동기 자료 읽기. 조건이 바뀌면 이전 응답은 버린다. fn이 null이면 읽지 않는다. */
export function useLoad<T>(fn:(()=>Promise<T>)|null,deps:unknown[]):Load<T>{
  const [s,setS]=useState<Load<T>>({data:null,error:'',loading:!!fn});
  useEffect(()=>{
    if(!fn){setS({data:null,error:'',loading:false});return}
    let alive=true;setS(p=>({data:p.data,error:'',loading:true}));
    fn().then(d=>alive&&setS({data:d,error:'',loading:false}),e=>alive&&setS({data:null,error:String(e?.message||e),loading:false}));
    return()=>{alive=false};
  },deps);// eslint-disable-line
  return s;
}
