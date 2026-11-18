import {createContext} from 'react';
/** The right support column of the region service. One open/closed state for all region datasets. */
export type SupportState={host:HTMLElement|null;expected:boolean;open:boolean;setOpen:(open:boolean)=>void;hostId:string};
export const SupportContext=createContext<SupportState>({host:null,expected:false,open:true,setOpen:()=>{},hostId:'region-support-host'});
