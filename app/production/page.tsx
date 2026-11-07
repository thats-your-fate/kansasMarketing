import Link from "next/link"
import { MarketingLayout } from "@/components/future/MarketingLayout"
import { apiBaseUrl } from "@/app/config"
import { seoMetadata } from "@/app/seo"

export const dynamic = "force-dynamic"
export const metadata = seoMetadata({ title: "Kansas monthly lease production", description: "Imported KGS monthly oil and gas production by lease, with reporting months and source import dates.", path: "/production" })
type Row = { id: string; lease_name: string; lease_kid: string; product: string; month: string; volume: number; unit: string; county: string; operator: string; imported_at: string; source_url: string }

export default async function Production({ searchParams }: { searchParams: Promise<{ api?: string; county?: string; month?: string; page?: string }> }) {
  const params = await searchParams
  const query = new URLSearchParams()
  for (const key of ["api", "county", "page"] as const) if (params[key]) query.set(key, params[key]!)
  if (params.month) query.set("month", /^\d{4}-\d{2}$/.test(params.month) ? `${params.month}-01` : params.month)
  let data: { items: Row[]; page: number; total_items: number; total_pages: number } | null = null
  try {
    const response = await fetch(`${apiBaseUrl}/api/ks/production?${query}`, { cache: "no-store" })
    if (response.ok) data = (await response.json()).data
  } catch { /* The page keeps source scope visible when the API is unavailable. */ }
  const pageLink = (page: number) => { const q = new URLSearchParams(query); q.set("page", String(page)); return `/production?${q}` }
  return <MarketingLayout>
    <section className="fwt-section"><div className="fwt-container">
      <span className="fwt-eyebrow">KGS monthly records</span><h1>Kansas lease production</h1>
      <p>Imported records from June 2025 onward. Oil is measured in barrels; gas in Mcf. Kansas reports by lease, which can cover multiple wells. Missing reports do not mean zero production; the latest reporting month can be partial.</p>
      <form method="get" className="fwt-county-card-meta">
        <label>Well API <input name="api" defaultValue={params.api} /></label>
        <label>County <input name="county" defaultValue={params.county} /></label>
        <label>Reporting month <input name="month" type="month" defaultValue={params.month?.slice(0, 7)} /></label>
        <button type="submit">Apply</button>{" "}<Link href="/production">Clear filters</Link>
      </form>
      {data ? <>
        <p>{data.total_items.toLocaleString()} lease/month/product records · Page {data.page} of {Math.max(1, data.total_pages)}</p>
        <div style={{ overflowX: "auto", maxWidth: "100%" }}><table style={{ width: "100%", borderCollapse: "collapse", background: "white" }}>
          <thead><tr>{["Reporting month", "Lease", "County", "Product", "Volume", "Imported"].map(x => <th key={x} style={{ textAlign: "left", padding: "12px" }}>{x}</th>)}</tr></thead>
          <tbody>{data.items.map(row => <tr key={row.id}>
            <td style={{ padding: "12px" }}>{row.month.slice(0, 7)}</td>
            <td style={{ padding: "12px" }}><strong>{row.lease_name || row.lease_kid}</strong><br /><small>{row.operator}</small></td>
            <td style={{ padding: "12px" }}>{row.county}</td><td style={{ padding: "12px" }}>{row.product}</td>
            <td style={{ padding: "12px", whiteSpace: "nowrap" }}>{row.volume.toLocaleString(undefined, { maximumFractionDigits: 2 })} {row.unit}</td>
            <td style={{ padding: "12px" }}>{row.imported_at?.slice(0, 10)}<br /><a href={row.source_url}>Source archive</a></td>
          </tr>)}</tbody>
        </table></div>
        {!data.items.length ? <p>No imported lease production matches these filters.</p> : null}
        <p>{data.page > 1 ? <Link href={pageLink(data.page - 1)}>Previous</Link> : null}{" "}{data.page < data.total_pages ? <Link href={pageLink(data.page + 1)}>Next</Link> : null}</p>
      </> : <p>Monthly production is temporarily unavailable. Check the filters or try again shortly.</p>}
      <p><a href="https://www.kgs.ku.edu/Magellan/Field/lease.html">Official KGS coverage and downloads</a></p>
    </div></section>
  </MarketingLayout>
}
