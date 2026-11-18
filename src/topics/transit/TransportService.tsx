import React,{Suspense,useEffect,useState} from 'react';
const SubwayWorkspace=React.lazy(()=>import('./SubwayWorkspace'));
/**
 * 교통 서비스의 단일 연결 지점. 처음 열릴 때 한 번 올리고 이후에는 숨김만 바꿔
 * 서비스를 왕복해도 조건·선택 역·후보 상태가 유지된다. 모드는 지역 분석과 같은 mode 상태를 받는다.
 */
export default function TransportService({active,mode}:{active:boolean;mode:'analysis'|'presentation'}){
  const [opened,setOpened]=useState(false);
  useEffect(()=>{if(active)setOpened(true)},[active]);
  if(!opened)return null;
  return <div className="transportService" hidden={!active}><Suspense fallback={<div className="notice">교통 화면을 불러오는 중입니다…</div>}><SubwayWorkspace mode={mode} active={active}/></Suspense></div>;
}
