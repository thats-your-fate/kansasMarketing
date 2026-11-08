import type { KansasProduction } from '@/app/lib/state-production'
import { apiBaseUrl } from '@/app/config'
import { kansasLeases } from '@/app/lib/state-production.mjs'
import { MonthlyProductionView } from './MonthlyProductionView'
export async function KansasMonthlyProduction({api}:{api:string|null}){
 let data:KansasProduction|null=null
 if(api)try{
  const query=new URLSearchParams({api})
  const response=await fetch(`${apiBaseUrl}/api/ks/production?${query}`,{cache:'no-store',signal:AbortSignal.timeout(20000)})
  if(response.ok){data=(await response.json()).data;if(data&&data.total_pages>1){query.set('page','2');const second=await fetch(`${apiBaseUrl}/api/ks/production?${query}`,{cache:'no-store',signal:AbortSignal.timeout(20000)});if(second.ok){const more:KansasProduction=(await second.json()).data;if(more.total_items===data.total_items)data.items.push(...more.items)}}}
 }catch{/* Keep the independently available well profile visible. */}
 const leases=data?kansasLeases(data.items,data.total_items):[]
 return <section className="fwt-copy fwt-county-panel fwt-well-panel"><span className="fwt-eyebrow">KGS monthly lease reports</span><h2>Monthly lease production</h2>
 <p>These are volumes for leases linked to this well, which may include other wells. Each lease is shown separately; its volumes are not allocated to this individual well. Oil is in barrels and gas in Mcf.</p>
 {data?leases.length?leases.slice(0,4).map(lease=><section key={lease.kid}><h3>{lease.name} · Lease {lease.kid}</h3><MonthlyProductionView months={lease.months} basis="Lease level · not individual well volumes" showWater={false}/></section>):<p>No imported lease production is available for this well in the displayed reporting window.</p>:<p>Monthly lease production is temporarily unavailable.</p>}
 {data&&data.total_items>data.items.length?<p>Loaded the latest {data.items.length} of {data.total_items.toLocaleString()} lease/month/product records. The oldest partially loaded month is omitted.</p>:null}
 {leases.length>4?<p>Showing four of {leases.length} linked leases in the loaded records.</p>:null}
 {api?<p><a href={`/production?api=${encodeURIComponent(api)}`}>All linked lease production and reporting coverage →</a></p>:null}</section>
}
