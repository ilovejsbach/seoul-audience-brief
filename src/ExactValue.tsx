import DataMeaning from './DataMeaning';
import {displayNumber,exactNumber} from './display-number';
import './exact-value.css';
/**
 * A shortened number that reveals its exact value in the project's existing tooltip (DataMeaning):
 * mouse hover, keyboard focus, Esc to close, viewport clamping and aria-describedby come from there.
 * It replaces the old "정확한 수치" expandable and the browser-only title attribute.
 *
 * Why the tooltip can be skipped: when the shortened text already equals the exact text (small values,
 * or "자료 없음" for null) there is nothing more to show, so a plain text node is rendered. null is never
 * turned into 0. Display and exact text are compared as produced by display-number, which is the only
 * place those texts are made, so the check cannot drift from what the user sees.
 * Print: tooltips are not printed, so the exact value is also written in a print-only span.
 */
export default function ExactValue({value,unit='',prefix='',label}:{value:number|null|undefined;unit?:string;prefix?:string;label?:string}){
 const shown=displayNumber(value,unit),exact=exactNumber(value,unit);
 if(shown===exact)return <>{prefix&&value!=null?prefix:''}{shown}</>;
 const text=`${prefix}${shown}`;
 return <><DataMeaning term="정확한 값" definition="" interpretation="" buttonLabel={text} buttonClass="exactValueButton" anchorClass="exactValueAnchor" ariaLabel={`${label?label+' ':''}${text}, 정확한 값 ${exact}`} content={<p className="exactValueText">{exact}</p>}/><span className="exactPrint"> ({exact})</span></>;
}
