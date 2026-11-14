import {createContext} from 'react';
export const MapDataContext=createContext<{selected:string;select:(key:string)=>void|Promise<void>}>({selected:'population',select:()=>{}});
