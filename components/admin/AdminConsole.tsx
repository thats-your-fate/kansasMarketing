"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import AdminTurnstile from "@/components/future/AdminTurnstile"

type Admin = { username: string; role: string }
type ExportStatus = { active: boolean; job: { status: string; phase: string; started_at: string; completed_at?: string; export_id?: string; records_total?: number; wells?: number; uploaded?: boolean; error?: string } | null }

export default function AdminConsole() {
  const [turnstileToken, setTurnstileToken] = useState("")
  const [verificationAttempt, setVerificationAttempt] = useState(0)
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [status, setStatus] = useState<ExportStatus | null>(null)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/exports", { cache: "no-store" })
      const data = await response.json()
      if (response.status === 401) { setAdmin(null); return }
      if (!response.ok) throw new Error(data.error)
      setStatus(data)
      setError("")
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load export status") }
  }, [])

  useEffect(() => {
    fetch("/api/admin/auth/me", { cache: "no-store" }).then(async response => {
      if (response.ok) setAdmin((await response.json()).admin)
    }).catch(() => setError("Unable to connect. Please try again.")).finally(() => setChecking(false))
  }, [])
  useEffect(() => {
    if (!admin) return
    void refresh()
    const timer = setInterval(() => void refresh(), 5000)
    return () => clearInterval(timer)
  }, [admin, refresh])

  async function signIn(event: FormEvent) {
    event.preventDefault()
    if (!turnstileToken) { setError("Complete security verification first."); return }
    setBusy(true); setError("")
    try {
      const response = await fetch("/api/admin/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password, turnstile_token: turnstileToken }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setPassword(""); setAdmin(data.admin)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Sign-in failed") }
    finally { setTurnstileToken(""); setVerificationAttempt(value => value + 1); setBusy(false) }
  }

  async function exportPackage() {
    setBusy(true); setError("")
    try {
      const response = await fetch("/api/admin/exports", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setStatus(data)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to start export") }
    finally { setBusy(false) }
  }

  const job = status?.job
  return <main className="ks-admin">
    <style>{`
      .ks-admin{min-height:100vh;background:#f1f5f9;color:#0f172a;padding:64px 24px;font-family:Arial,sans-serif}
      .ks-admin article{max-width:780px;margin:auto;background:white;border:1px solid #cbd5e1;border-radius:16px;padding:32px}
      .ks-admin h1{font-size:28px;font-weight:700;margin:12px 0 24px}.ks-admin h2{font-size:20px;font-weight:700;margin:24px 0 12px}
      .ks-admin p{line-height:1.6;margin:12px 0}.ks-admin a{color:#0369a1;text-decoration:underline}
      .ks-admin label{display:block;margin:18px 0}.ks-admin input{display:block;width:100%;box-sizing:border-box;padding:12px;border:1px solid #94a3b8;border-radius:6px;margin-top:8px;color:#0f172a;background:white}
      .ks-admin button{background:#075985;color:white;border:0;border-radius:6px;padding:12px 20px;cursor:pointer;margin:12px 12px 12px 0}.ks-admin button:disabled{opacity:.5;cursor:wait}
      .ks-admin .muted{color:#475569}.ks-admin .error{color:#991b1b;background:#fef2f2;padding:12px;border-radius:6px}
      .ks-admin dl{display:grid;grid-template-columns:140px 1fr;gap:12px;margin:20px 0}.ks-admin dd{overflow-wrap:anywhere;margin:0}.ks-admin dt{color:#475569}
    `}</style>
    <article>
      <Link href="/">Future Wells Kansas</Link>
      <h1>Kansas administration</h1>
      {error && <p role="alert" className="error">{error}</p>}
      {checking ? <p>Checking sign-in…</p> : !admin ? <form onSubmit={signIn}>
        <p>Sign in to manage Kansas data exports.</p>
        <label>Username<input name="username" autoComplete="username" required value={username} onChange={event => setUsername(event.target.value)} maxLength={128} /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} maxLength={256} /></label>
        <AdminTurnstile configUrl="/api/admin/auth/turnstile" onVerify={setTurnstileToken} resetKey={verificationAttempt} />
        <button type="submit" disabled={busy || !turnstileToken}>{busy ? "Signing in…" : "Sign in"}</button>
      </form> : <>
        <p className="muted">Signed in as {admin.username} · {admin.role}</p>
        <h2>Manual Kansas export</h2>
        <p>Create a full Kansas snapshot and upload it to Future Wells Co. Once it is ready, an administrator can select the package on the central import page.</p>
        <button onClick={() => void exportPackage()} disabled={busy || status === null || status.active}>{busy || status?.active ? "Export in progress…" : "Create and upload export"}</button>
        <button onClick={() => void refresh()} disabled={busy}>Refresh status</button>
        {job ? <dl aria-live="polite">
          <dt>Status</dt><dd>{status?.active ? job.phase === "uploading" ? "Uploading" : "Creating snapshot" : job.status === "completed" ? "Ready to import" : job.status}</dd>
          <dt>Started</dt><dd>{new Date(job.started_at).toLocaleString()}</dd>
          {job.export_id && <><dt>Export ID</dt><dd>{job.export_id}</dd></>}
          {job.wells !== undefined && <><dt>Wells</dt><dd>{job.wells.toLocaleString()}</dd></>}
          {job.records_total !== undefined && <><dt>Total records</dt><dd>{job.records_total.toLocaleString()}</dd></>}
          {job.completed_at && <><dt>Completed</dt><dd>{new Date(job.completed_at).toLocaleString()}</dd></>}
        </dl> : <p className="muted">No manual export has been created yet.</p>}
        {job?.error && <p role="alert" className="error">The export failed. Try again or contact the site administrator.</p>}
        <p><a href="https://futurewells.co/superadmin/imports" target="_blank" rel="noreferrer">Open Future Wells Co manual imports →</a></p>
        <p className="muted">On the import page, select Kansas and match the export ID above. Signing in to Future Wells Co is separate.</p>
        <button onClick={async () => { const response = await fetch("/api/admin/auth/logout", { method: "POST" }); if (response.ok) { setAdmin(null); setStatus(null) } else setError("Unable to sign out. Please try again.") }}>Sign out</button>
      </>}
    </article>
  </main>
}
