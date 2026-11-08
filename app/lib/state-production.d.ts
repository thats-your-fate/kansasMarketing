import type {ProductionMonth} from './monthly-production.mjs'
export type KansasFact={id:string;lease_kid:string;lease_name:string|null;month:string;product:string;volume:number|null;unit:string;imported_at:string|null}
export type KansasProduction={items:KansasFact[];total_items:number;total_pages:number}
export function kansasLeases(items:KansasFact[],total:number):{kid:string;name:string;months:ProductionMonth[]}[]
