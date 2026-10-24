"use client"

import Script from "next/script"
import { useEffect, useRef, useState } from "react"

type TurnstileAPI = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
  reset: (id: string) => void
  remove: (id: string) => void
}
const api = () => (window as unknown as { turnstile?: TurnstileAPI }).turnstile

export default function AdminTurnstile({ onVerify, resetKey = 0, configUrl = "/api/auth/turnstile" }: {
  onVerify: (token: string) => void
  resetKey?: number
  configUrl?: string
}) {
  const container = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)
  const callback = useRef(onVerify)
  callback.current = onVerify
  const [siteKey, setSiteKey] = useState("")
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    callback.current("")
    setError("")
    fetch(configUrl, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const config = await response.json()
        if (!response.ok || typeof config.site_key !== "string" || !config.site_key) throw new Error()
        setSiteKey(config.site_key)
      })
      .catch(() => { if (!controller.signal.aborted) setError("Security verification is unavailable. Please try again.") })
    return () => controller.abort()
  }, [configUrl, retry])

  useEffect(() => {
    const turnstile = api()
    if (!ready || !siteKey || !turnstile || !container.current) return
    widget.current = turnstile.render(container.current, {
      sitekey: siteKey,
      action: "admin_login",
      theme: "auto",
      size: "flexible",
      callback: (token: string) => { setError(""); callback.current(token) },
      "expired-callback": () => callback.current(""),
      "error-callback": () => { callback.current(""); setError("Security verification failed. Please try again.") },
    })
    return () => {
      if (widget.current !== null) turnstile.remove(widget.current)
      widget.current = null
    }
  }, [ready, siteKey, retry])

  useEffect(() => {
    callback.current("")
    if (widget.current !== null) api()?.reset(widget.current)
  }, [resetKey])

  return <div aria-label="Security verification">
    {siteKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      strategy="afterInteractive" onReady={() => setReady(true)}
      onError={() => { callback.current(""); setError("Could not load security verification. Please reload this page.") }} />}
    <div ref={container} />
    {!siteKey && !error && <p role="status">Loading security verification…</p>}
    {error && <p role="alert">{error} <button type="button" onClick={() => { callback.current(""); setRetry(value => value + 1) }}>Retry verification</button></p>}
  </div>
}
