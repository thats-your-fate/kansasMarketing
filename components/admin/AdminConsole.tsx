"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import { MarketingLayout } from "@/components/future/MarketingLayout"
import AdminWorkspace, { type Admin, type ExportStatus } from "./AdminWorkspace"
import styles from "./admin.module.css"
import AdminTurnstile from "@/components/future/AdminTurnstile"

export default function AdminConsole({ view = "overview" }: { view?: "overview" | "exports" }) {
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
      if (response.status === 401) { setAdmin(null); setStatus(null); return }
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

  async function signOut() {
    setBusy(true)
    try {
      const response = await fetch("/api/admin/auth/logout", { method: "POST" })
      if (!response.ok) throw new Error("Unable to sign out. Please try again.")
      setAdmin(null); setStatus(null); setError("")
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to sign out") }
    finally { setBusy(false) }
  }

  if (admin) return <AdminWorkspace admin={admin} status={status} view={view} busy={busy} error={error}
    onExport={() => void exportPackage()} onRefresh={() => void refresh()} onSignOut={() => void signOut()} />

  return <MarketingLayout><main className={styles.loginWrap}>
    <section className={styles.loginCard} aria-labelledby="admin-login-heading">
      <span className="fwt-eyebrow">Kansas administration</span>
      <h1 id="admin-login-heading">Login</h1>
      {checking ? <p role="status">Checking sign-in…</p> : <>
        <p>Sign in to manage Kansas data exports.</p>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <form className={styles.loginForm} onSubmit={signIn}>
          <label>Username<input name="username" autoComplete="username" placeholder="Username" required value={username} onChange={event => setUsername(event.target.value)} maxLength={128} /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" placeholder="Password" required value={password} onChange={event => setPassword(event.target.value)} maxLength={256} /></label>
          <AdminTurnstile configUrl="/api/admin/auth/turnstile" onVerify={setTurnstileToken} resetKey={verificationAttempt} />
          <button className="fwt-btn gold" type="submit" disabled={busy || !turnstileToken}>{busy ? "Signing in…" : "Login"}</button>
        </form>
      </>}
    </section>
  </main></MarketingLayout>
}
