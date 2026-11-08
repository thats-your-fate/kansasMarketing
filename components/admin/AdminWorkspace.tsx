"use client"

import Link from "next/link"
import { useState } from "react"
import styles from "./admin.module.css"

export type Admin = { username: string; role: string }
export type ExportStatus = {
  active: boolean
  job: {
    status: string; phase: string; started_at: string; completed_at?: string
    export_id?: string; records_total?: number; wells?: number; uploaded?: boolean; error?: string
  } | null
}

type Props = {
  admin: Admin; status: ExportStatus | null; view: "overview" | "exports"
  busy: boolean; error: string; onExport: () => void; onRefresh: () => void; onSignOut: () => void
}

function count(value?: number) { return value === undefined ? "—" : value.toLocaleString() }
function date(value?: string) {
  if (!value || Number.isNaN(Date.parse(value))) return "—"
  return new Date(value).toLocaleString()
}
function jobLabel(status: ExportStatus | null) {
  if (!status) return "Loading status"
  if (!status.job) return "No exports yet"
  if (status.active) return status.job.phase === "uploading" ? "Uploading" : "Creating snapshot"
  if (status.job.status === "completed") return status.job.uploaded === false ? "Snapshot created" : "Ready to import"
  return status.job.status === "failed" ? "Export failed" : status.job.status
}

export default function AdminWorkspace({ admin, status, view, busy, error, onExport, onRefresh, onSignOut }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const job = status?.job
  const title = view === "exports" ? "State exports" : "Administration"
  const label = jobLabel(status)
  const ready = job?.status === "completed" && job.uploaded !== false

  return <div className={`fwt-page ${styles.shell}`}>
    {menuOpen && <button className={styles.backdrop} type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    <aside id="kansas-admin-navigation" className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`} onKeyDown={event => { if (event.key === "Escape") setMenuOpen(false) }}>
      <div className={styles.sidebarHeader}>
        <Link href="/app/admin" className={styles.brand}><span className={styles.mark}>KS</span><span>Future Wells<span className={styles.brandDetail}>Kansas administration</span></span></Link>
        <button className={styles.mobileClose} type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)}>×</button>
      </div>
      <p className={styles.navLabel}>Administration</p>
      <nav aria-label="Kansas administration" className={styles.navigation}>
        <Link href="/app/admin" aria-current={view === "overview" ? "page" : undefined}>Overview</Link>
        <Link href="/app/admin/exports" aria-current={view === "exports" ? "page" : undefined}>State exports</Link>
      </nav>
      <p className={styles.navLabel}>Kansas public site</p>
      <nav aria-label="Kansas public site" className={styles.navigation}>
        <Link href="/browse">Browse Kansas</Link><Link href="/map">Well map</Link><Link href="/activity">Activity</Link>
      </nav>
      <div className={styles.sidebarFooter}>
        <span className={styles.signedIn}>Signed in as <strong>{admin.username}</strong></span>
        <button className={styles.signOut} type="button" disabled={busy} onClick={onSignOut}>Sign out</button>
      </div>
    </aside>
    <div className={styles.main}>
      <header className={styles.topbar}>
        <div className={styles.topbarStart}>
          <button className={styles.menuButton} type="button" aria-label="Open navigation" aria-controls="kansas-admin-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>☰</button>
          <span className={styles.breadcrumb}><strong>Kansas</strong><span aria-hidden="true"> / </span>{title}</span>
        </div>
        <div className={styles.account}><span>{admin.username}</span><span className={styles.role}>{admin.role}</span></div>
      </header>
      <main className={styles.content}>
        <div className={styles.pageHeading}>
          <div><span className="fwt-eyebrow">Kansas administration</span><h1>{title}</h1><p>{view === "exports" ? "Create a Kansas snapshot and deliver it to Future Wells Co." : "Manage Kansas data exports and review the latest delivery."}</p></div>
          <Link className="fwt-btn light" href="/">View public site ↗</Link>
        </div>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <div className={styles.metrics}>
          <div className={styles.metric}><span>Latest export</span><strong className={styles.metricStatus}>{label}</strong></div>
          <div className={styles.metric}><span>Wells in latest snapshot</span><strong>{count(job?.wells)}</strong></div>
          <div className={styles.metric}><span>Total records in latest snapshot</span><strong>{count(job?.records_total)}</strong></div>
        </div>
        <div className={styles.workspace}>
          <section className={styles.panel} aria-labelledby="export-heading">
            <div className={styles.panelHeader}><div><span className="fwt-eyebrow">State delivery</span><h2 id="export-heading">{view === "exports" ? "Latest export" : "Kansas state exports"}</h2></div><span className={`${styles.badge} ${ready ? styles.success : job?.status === "failed" ? styles.failure : ""}`} role="status">{label}</span></div>
            {view === "overview" ? <>
              <p className={styles.panelCopy}>Create a full Kansas snapshot, upload it to Future Wells Co, and review its delivery status.</p>
              <div className={styles.actions}><Link className="fwt-btn dark" href="/app/admin/exports">Open state exports →</Link><button className="fwt-btn light" type="button" disabled={busy} onClick={onRefresh}>Refresh status</button></div>
            </> : <>
              <p className={styles.panelCopy}>Exports continue after you leave this page. Status refreshes automatically.</p>
              <div className={styles.actions}><button className="fwt-btn dark" type="button" disabled={busy || status === null || status.active} onClick={onExport}>{busy || status?.active ? "Export in progress…" : "Create and upload export"}</button><button className="fwt-btn light" type="button" disabled={busy} onClick={onRefresh}>Refresh status</button></div>
            </>}
            {job ? <dl className={styles.details}>
              <div><dt>Export ID</dt><dd className={styles.identifier}>{job.export_id || "Assigned when the snapshot is created"}</dd></div>
              <div><dt>Started</dt><dd>{date(job.started_at)}</dd></div>
              <div><dt>Completed</dt><dd>{job.completed_at ? date(job.completed_at) : status?.active ? "In progress" : "—"}</dd></div>
              <div><dt>Delivery</dt><dd>{ready ? "Uploaded to Future Wells Co" : status?.active && job.phase === "uploading" ? "Uploading package" : job.uploaded === false ? "Not uploaded" : "Awaiting completed export"}</dd></div>
            </dl> : <p className={styles.empty}>{status === null ? "Loading the latest export…" : "No manual export has been created yet."}</p>}
            {job?.error && <p role="alert" className={styles.error}>The export failed. Try again or contact the site administrator.</p>}
          </section>
          <aside className={styles.panel} aria-labelledby="delivery-heading">
            <div className={styles.panelHeader}><div><span className="fwt-eyebrow">Future Wells Co</span><h2 id="delivery-heading">Import the package</h2></div></div>
            <ol className={styles.steps}><li>Create and upload the Kansas export.</li><li>Open State imports on Future Wells Co.</li><li>Select Kansas and match the export ID before importing.</li></ol>
            <a className={`fwt-btn gold ${styles.importLink}`} href="https://futurewells.co/superadmin/imports" target="_blank" rel="noreferrer">Open State imports ↗</a>
            <p className={styles.note}>Importing is a separate admin action. Signing in to Future Wells Co is separate.</p>
          </aside>
        </div>
        <p className={styles.footnote}>Kansas source records may be delayed or corrected. Verify critical information with the KCC and KGS.</p>
      </main>
    </div>
  </div>
}
