"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { MarketingLayout } from "@/components/future/MarketingLayout"
import { AdminSecuritySettings } from "@/components/future/AdminTwoFactor"
import styles from "./admin.module.css"

const loginPath = "/app/admin"

/** Authenticator and recovery-code management for the signed-in Kansas admin. */
export default function AdminSecurity() {
  const [signedIn, setSignedIn] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    // Same guard as the console: only a second-factor-verified session may see this page.
    fetch("/api/admin/auth/me", { cache: "no-store" }).then(response => {
      if (response.ok) setSignedIn(true)
      else if (response.status === 401) window.location.assign(loginPath)
      else setError("Sign-in is temporarily unavailable. Please try again.")
    }).catch(() => setError("Unable to connect. Please try again."))
  }, [])

  return <MarketingLayout><main className={styles.loginWrap}>
    <section className={`${styles.loginCard} ${styles.securityCard}`} aria-labelledby="admin-security-heading">
      <span className="fwt-eyebrow">Kansas administration</span>
      <h1 id="admin-security-heading">Sign-in security</h1>
      <p>Manage the authenticator app and recovery codes for this admin account.</p>
      <div className={styles.actions}>
        <Link className="fwt-btn light" href="/app/admin">Overview</Link>
        <Link className="fwt-btn light" href="/app/admin/exports">State exports</Link>
      </div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {signedIn
        ? <AdminSecuritySettings apiBase="/api/admin/auth/2fa/" formClassName={styles.loginForm} loginPath={loginPath} />
        : !error && <p role="status">Checking sign-in…</p>}
    </section>
  </main></MarketingLayout>
}
