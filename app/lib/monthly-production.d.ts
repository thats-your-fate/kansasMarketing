export type ProductionMonth = {month:string;oil:number|null;gas:number|null;water?:number|null;days?:number|null;reportCount:number;unresolved?:boolean;details?:string[];reports?:{label:string;oil:number|null;gas:number|null;water?:number|null;days?:number|null}[]}
export function reportedNumber(value:unknown):number|null
export function monthLabel(value:string):string
export function metricLabel(value:unknown,unit:string):string
export function displayTotal(months:ProductionMonth[],key:string):{value:number|null;partial:boolean}
export function chartPoints(months:ProductionMonth[]):ProductionMonth[]
