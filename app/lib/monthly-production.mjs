// Display only: source parsers and state-specific resolution rules stay upstream.
export function reportedNumber(value) {
 if(value === null || value === undefined || (typeof value === "string" && !value.trim())) return null
 if(typeof value !== "number" && typeof value !== "string") return null
 const number = Number(value)
 return Number.isFinite(number) && number >= 0 ? number : null
}
export function monthLabel(value) {
 return /^\d{4}-(0[1-9]|1[0-2])$/.test(value || "") ? new Intl.DateTimeFormat("en-US", {month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(`${value}-01T00:00:00Z`)) : "Not reported"
}
export function metricLabel(value, unit) {
 const number = reportedNumber(value)
 return number === null ? "Not reported" : `${number.toLocaleString("en-US",{maximumFractionDigits:2})} ${unit}`
}
export function displayTotal(months, key) {
 const values=months.map(month=>reportedNumber(month[key]))
 const known=values.filter(value=>value!==null)
 return {value:known.length ? known.reduce((a,b)=>a+b,0) : null,partial:known.length<values.length}
}
export function chartPoints(months) {
 const byMonth=new Map(months.map(month=>[month.month,month]))
 const ordered=[...byMonth.keys()].filter(month=>/^\d{4}-(0[1-9]|1[0-2])$/.test(month)).sort()
 if(!ordered.length)return []
 const end=new Date(`${ordered.at(-1)}-01T00:00:00Z`)
 const start=new Date(`${ordered[0]}-01T00:00:00Z`)
 const floor=new Date(end);floor.setUTCMonth(floor.getUTCMonth()-23)
 const points=[]
 for(let date=new Date(Math.max(start.getTime(),floor.getTime()));date<=end;date.setUTCMonth(date.getUTCMonth()+1)){
  const month=date.toISOString().slice(0,7)
  points.push(byMonth.get(month)||{month,oil:null,gas:null,water:null,days:null})
 }
 return points
}
