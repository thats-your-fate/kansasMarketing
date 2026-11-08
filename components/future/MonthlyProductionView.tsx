import type { ProductionMonth } from "@/app/lib/monthly-production"
import { chartPoints, displayTotal, metricLabel, monthLabel, reportedNumber } from "@/app/lib/monthly-production.mjs"

type Props={months:ProductionMonth[];basis:string;showWater?:boolean;showDays?:boolean;totalReports?:number;loadedReports?:number}
export function MonthlyProductionView({months,basis,showWater=true,showDays=false,totalReports,loadedReports}:Props){
 const ordered=[...months].sort((a,b)=>b.month.localeCompare(a.month)).slice(0,24)
 if(!ordered.length)return <p>No unambiguous monthly reports are available in this selection. Missing reports remain unknown.</p>
 const points=chartPoints(ordered)
 const range=`${monthLabel(ordered.at(-1)!.month)}–${monthLabel(ordered[0].month)}`
 const metrics: {key:"oil"|"gas"|"water"|"days";label:string;unit:string}[]=[{key:"oil",label:"Oil",unit:"bbl"},{key:"gas",label:"Gas",unit:"Mcf"},...(showWater?[{key:"water" as const,label:"Water",unit:"bbl"}]:[]),...(showDays?[{key:"days" as const,label:"Days producing",unit:"days"}]:[])]
 return <div className="fwt-production-panel">
  <div className="fwt-stat-grid fwt-production-stats">
   <div><span>Displayed reporting period</span><strong>{range}</strong></div>
   <div><span>Reported months displayed</span><strong>{ordered.length.toLocaleString("en-US")}</strong></div>
   {metrics.filter(metric=>metric.key!=="days").map(metric=>{const total=displayTotal(ordered,metric.key);return <div key={metric.key}><span>Reported {metric.label.toLowerCase()} in displayed months</span><strong>{metricLabel(total.value,metric.unit)}{total.value!==null&&total.partial?" · partial":""}</strong></div>})}
  </div>
  <section className="fwt-production-chart" aria-label={`${basis} monthly production charts`}>
   <div className="fwt-production-chart-head"><div><span className="fwt-eyebrow">Monthly trend</span><h3>Reported production by month</h3></div><span>{basis}</span></div>
   <div className="fwt-production-chart-grid">{([{key:"oil",title:"Oil",unit:"bbl",color:"#c79a45"},{key:"gas",title:"Gas",unit:"Mcf",color:"#0f766e"}] as const).map(metric=>{
    const values=points.map(point=>reportedNumber(point[metric.key]));const known=values.filter((value):value is number=>value!==null);const peak=known.length?Math.max(...known):null;const scale=Math.max(1,peak??0);const step=520/points.length;const width=Math.max(2,Math.min(18,step-3))
    return <div key={metric.key} className="fwt-production-chart-series"><div><strong>{metric.title}</strong><span>{peak===null?"Not reported":`Peak ${metricLabel(peak,metric.unit)}`}</span></div>
     <svg viewBox="0 0 520 134" role="img" aria-label={`${metric.title} reported per month; gaps mean unknown`}><line x1="0" y1="112" x2="520" y2="112" stroke="rgba(8,17,31,.18)"/>{points.map((point,index)=>{
      const value=values[index];const x=index*step+(step-width)/2;const label=`${monthLabel(point.month)}: ${metricLabel(value,metric.unit)}`
      if(value===null)return <g key={point.month}><title>{label}</title><path d={`M${x} 122h${width}`} stroke="#94a3b8" strokeDasharray="2 2"/></g>
      if(value===0)return <circle key={point.month} cx={x+width/2} cy={112} r="2" fill={metric.color}><title>{label}</title></circle>
      const height=value/scale*88;return <rect key={point.month} x={x} y={112-height} width={width} height={height} rx="1.5" fill={metric.color}><title>{label}</title></rect>
     })}</svg><div className="fwt-production-chart-axis"><span>{monthLabel(points[0].month)}</span><span>{monthLabel(points.at(-1)!.month)}</span></div>
    </div>
   })}</div><p className="fwt-production-meta">Bars show reported volumes; dots show reported zero. Dashed gaps mean missing or unresolved values.</p>
  </section>
  <div className="fwt-production-list">{ordered.map(month=><article className="fwt-production-month" key={month.month}>
   <div className="fwt-production-month-head"><strong>{monthLabel(month.month)}</strong><div className="fwt-production-badges"><span className={month.unresolved?"warning":undefined}>{month.unresolved?"Totals unresolved":`${month.reportCount} source report${month.reportCount===1?"":"s"}`}</span></div></div>
   <div className="fwt-production-values">{metrics.map(metric=><div key={metric.key}><span>{metric.label}</span><strong>{metricLabel(month[metric.key],metric.unit)}</strong></div>)}</div>
   {month.details?.length?<p className="fwt-production-meta">{month.details.join(" · ")}</p>:null}
   {month.reports?.length?<details className="fwt-production-breakdown"><summary>Separate source reports ({month.reports.length})</summary><div>{month.reports.map((report,index)=><div className="fwt-production-breakdown-row" key={index}><strong>{report.label}</strong><div className="fwt-production-breakdown-values">{metrics.filter(metric=>metric.key!=="days").map(metric=><span key={metric.key}>{metric.label}: {metricLabel(report[metric.key],metric.unit)}</span>)}</div></div>)}</div></details>:null}
  </article>)}</div>
  <p className="fwt-production-note">Totals cover displayed reports only. Missing values and unresolved reports are excluded; a partial total is not complete production for the period. Recent months may still be reported.{totalReports!==undefined&&loadedReports!==undefined&&totalReports>loadedReports?` Showing the latest ${loadedReports.toLocaleString()} of ${totalReports.toLocaleString()} source reports; the oldest partially loaded month is omitted.`:""}</p>
 </div>
}
