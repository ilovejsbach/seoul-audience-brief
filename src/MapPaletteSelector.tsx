import {useEffect,useId,useState} from 'react';
import {getMapPalette,mapPalettes,mapPaletteGradient,type MapPaletteId} from './map-palettes';
import './map-palette-selector.css';
const key='seoul-map-palette-v1',eventName='dashboard-map-palette';
const read=()=>{try{return getMapPalette(localStorage.getItem(key)).id}catch{return 'blue' as MapPaletteId}};
export function useMapPalette(){
 const [paletteId,setId]=useState<MapPaletteId>(read);
 useEffect(()=>{const change=(event:Event)=>setId(getMapPalette((event as CustomEvent).detail).id),storage=(event:StorageEvent)=>{if(event.key===key)setId(read())};window.addEventListener(eventName,change);window.addEventListener('storage',storage);return()=>{window.removeEventListener(eventName,change);window.removeEventListener('storage',storage)}},[]);
 const setPaletteId=(id:string)=>{const next=getMapPalette(id).id;setId(next);try{localStorage.setItem(key,next)}catch{/* The selected palette still works when storage is unavailable. */}window.dispatchEvent(new CustomEvent(eventName,{detail:next}))};
 return {paletteId,palette:getMapPalette(paletteId),setPaletteId};
}
export function MapPalettePreview({value,diverging=false,stepped=false}:{value:MapPaletteId;diverging?:boolean;stepped?:boolean}){const current=getMapPalette(value),base=mapPalettes[0];return <div className="mapPalettePreview" aria-label="기본·선택 색상 비교"><div><span>기본</span><i aria-hidden="true" style={{background:mapPaletteGradient(base,diverging,stepped)}}/><span>{diverging?base.signLabel:base.name}</span></div><div><span>선택</span><i aria-hidden="true" style={{background:mapPaletteGradient(current,diverging,stepped)}}/><span>{diverging?current.signLabel:current.name}</span></div></div>}
export default function MapPaletteSelector({value,onChange,diverging=false,stepped=false}:{value:MapPaletteId;onChange:(id:string)=>void;diverging?:boolean;stepped?:boolean}){const id='map-palette-'+useId().replace(/:/g,'');return <div className="mapPaletteControl"><label htmlFor={id}>색상 팔레트<select id={id} aria-label="지도 색상 팔레트" value={value} onChange={e=>onChange(e.target.value)}>{mapPalettes.map(p=><option key={p.id} value={p.id}>{p.name}{diverging?` · ${p.signLabel}`:''}</option>)}</select></label><MapPalettePreview value={value} diverging={diverging} stepped={stepped}/></div>}
