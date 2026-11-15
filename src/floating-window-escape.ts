/** One Escape dismisses one visible, focused (or frontmost) free-moving window. */
const handledEvents=new WeakSet<KeyboardEvent>();
export function visibleFloatingWindows():HTMLElement[]{
 return [...document.querySelectorAll<HTMLElement>('.floatingQueryLayer aside')].filter(panel=>panel.getClientRects().length>0&&getComputedStyle(panel).visibility!=='hidden');
}
export function floatingEscapeHandled(event:KeyboardEvent){return handledEvents.has(event)}
export function markFloatingEscapeHandled(event:KeyboardEvent){handledEvents.add(event)}
export function claimFloatingEscape(event:KeyboardEvent,panel:HTMLElement|null){
 if(event.key!=='Escape'||handledEvents.has(event)||!panel)return false;
 if([...document.querySelectorAll('.dataMeaningTooltip,.mapPopup')].some(tooltip=>tooltip.getClientRects().length))return false;
 const visible=visibleFloatingWindows();
 const focused=document.activeElement instanceof HTMLElement?document.activeElement.closest<HTMLElement>('aside'):null;
 const chosen=focused&&visible.includes(focused)?focused:visible.at(-1);
 if(chosen!==panel)return false;
 handledEvents.add(event);event.preventDefault();return true;
}
