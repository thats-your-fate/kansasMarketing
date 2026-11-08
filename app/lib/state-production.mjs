import {reportedNumber} from './monthly-production.mjs'
export function kansasLeases(items,total){
 let rows=items
 if(total>items.length&&items.length){const boundary=items.at(-1).month.slice(0,7);rows=items.filter(row=>row.month.slice(0,7)!==boundary)}
 return [...Map.groupBy(rows,row=>row.lease_kid)].map(([kid,rows])=>({kid,name:rows[0].lease_name||kid,months:[...Map.groupBy(rows,row=>row.month.slice(0,7))].map(([month,reports])=>{
  const products=Map.groupBy(reports,row=>row.product)
  const value=product=>{const entries=products.get(product)||[];return entries.length===1&&entries[0].unit===(product==='oil'?'bbl':'Mcf')?reportedNumber(entries[0].volume):null}
  return {month,oil:value('oil'),gas:value('gas'),reportCount:reports.length,unresolved:[...products.values()].some(entries=>entries.length!==1),details:[`Lease ${kid}`,`Imported ${[...new Set(reports.map(row=>row.imported_at?.slice(0,10)).filter(Boolean))].join(', ')||'date unavailable'}`]}
 })}))
}
