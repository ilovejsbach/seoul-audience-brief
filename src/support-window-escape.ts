import {floatingEscapeHandled,markFloatingEscapeHandled} from './floating-window-escape';
export function claimSupportEscape(event:KeyboardEvent,panel:HTMLElement|null){
 if(event.key!=='Escape'||event.defaultPrevented||floatingEscapeHandled(event)||!panel)return false;
 if([...document.querySelectorAll('.dataMeaningTooltip,.queryPopover')].some(node=>node.getClientRects().length))return false;
 const settings=document.activeElement?.closest<HTMLDetailsElement>('.supportDockTools[open]');if(settings&&panel.contains(settings)){settings.open=false;settings.querySelector<HTMLElement>('summary')?.focus();markFloatingEscapeHandled(event);event.preventDefault();event.stopImmediatePropagation();return false}
 const windows=[...document.querySelectorAll<HTMLElement>('.floatingQueryLayer aside,.supportRanking[data-support-mode=floating],.mapPopup')].filter(node=>node.getClientRects().length&&getComputedStyle(node).visibility!=='hidden');
 const focused=windows.find(node=>node.contains(document.activeElement));const chosen=focused||windows.sort((a,b)=>(Number(getComputedStyle(a).zIndex)||0)-(Number(getComputedStyle(b).zIndex)||0)).at(-1);
 if(chosen!==panel)return false;markFloatingEscapeHandled(event);event.preventDefault();event.stopImmediatePropagation();return true;
}
