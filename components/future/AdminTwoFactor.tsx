"use client"
import {useEffect, useState, type FormEvent, type ReactNode} from "react"
import {codeKind, groupSetupKey, mustRestart, qrImageSource} from "@/lib/admin-two-factor.mjs"

/**
 * Authenticator (TOTP) second factor for the private admin area.
 * Shared verbatim between the regional sites; it only talks to /api/auth/2fa/*.
 */

type Setup = {secret: string; otpauth_uri: string; qr_svg: string; issuer: string; account: string}

class TwoFactorError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

const defaultApiBase = "/api/auth/2fa/"

async function call(path: string, body: Record<string, string> | undefined, apiBase: string) {
  const response = await fetch(apiBase + path, {
    method: body ? "POST" : "GET",
    headers: body ? {"Content-Type": "application/json"} : undefined,
    credentials: "include",
    cache: "no-store",
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new TwoFactorError(data?.error?.code || "error", data?.error?.message || "Request failed. Try again.")
  return data
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Request failed. Try again."
}

const defaultFormClass = "fwt-form"
const buttonClass = "fwt-btn gold"

/** Sites whose admin API or form styling differs pass these; the defaults fit the others. */
type SiteOptions = {apiBase?: string; formClassName?: string; loginPath?: string}

function CodeField({id, label, hint, recovery = false}: {id: string; label: string; hint?: string; recovery?: boolean}) {
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} name="code" inputMode={recovery ? "text" : "numeric"} autoComplete="one-time-code" autoCapitalize="characters" autoCorrect="off" spellCheck={false} required maxLength={32} />
      {hint ? <p className="fwt-two-factor-hint">{hint}</p> : null}
    </>
  )
}

function SetupInstructions({setup}: {setup: Setup}) {
  const image = qrImageSource(setup.qr_svg)
  return (
    <div className="fwt-two-factor-setup">
      <p>Scan this QR code with Google Authenticator or another authenticator app, then enter the 6-digit code it shows.</p>
      {image ? <img src={image} width={220} height={220} alt="Authenticator setup QR code" style={{background: "#fff", padding: 8, borderRadius: 8, maxWidth: "100%", height: "auto"}} /> : null}
      <p>
        Cannot scan? Enter this setup key manually (time-based, 6 digits):<br />
        <code style={{wordBreak: "break-all", userSelect: "all"}}>{groupSetupKey(setup.secret)}</code>
      </p>
    </div>
  )
}

function RecoveryCodes({codes, action}: {codes: string[]; action: ReactNode}) {
  const [saved, setSaved] = useState(false)
  return (
    <div className="fwt-two-factor-recovery" role="group" aria-label="Recovery codes">
      <p>
        <strong>Save these recovery codes now.</strong> Each code signs you in once if you lose your authenticator. They are shown only this one time.
      </p>
      <pre style={{userSelect: "all", whiteSpace: "pre-wrap", padding: 12, border: "1px solid currentColor", borderRadius: 8}}>{codes.join("\n")}</pre>
      <label style={{display: "flex", gap: 8, alignItems: "flex-start"}}>
        <input type="checkbox" checked={saved} onChange={event => setSaved(event.target.checked)} style={{width: "auto"}} />
        <span>I have stored these codes somewhere safe.</span>
      </label>
      {saved ? action : null}
    </div>
  )
}

/** Second step of the admin login, shown after the password was accepted. */
export default function AdminTwoFactor({initialStep, destination, onRestart, apiBase = defaultApiBase, formClassName: formClass = defaultFormClass}: {initialStep: "verify" | "enroll"; destination: string; onRestart: (reason: string) => void} & SiteOptions) {
  const [step] = useState(initialStep)
  const [setup, setSetup] = useState<Setup | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [useRecovery, setUseRecovery] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function run(event: FormEvent<HTMLFormElement>, action: (form: FormData) => Promise<void>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError("")
    setBusy(true)
    try {
      await action(form)
    } catch (failure) {
      if (failure instanceof TwoFactorError && mustRestart(failure.code)) onRestart("Your sign-in step expired. Enter your password again.")
      else setError(message(failure))
    } finally {
      setBusy(false)
    }
  }

  if (recoveryCodes) {
    return (
      <div className={formClass}>
        <p>Your authenticator is now required for every sign-in to this admin area.</p>
        <RecoveryCodes codes={recoveryCodes} action={<button className={buttonClass} type="button" onClick={() => window.location.assign(destination)}>Continue to admin</button>} />
      </div>
    )
  }

  if (step === "verify") {
    return (
      <form className={formClass} onSubmit={event => run(event, async form => {
        const code = String(form.get("code") || "")
        if (!codeKind(code)) throw new TwoFactorError("invalid_code", useRecovery ? "Enter one of your recovery codes." : "Enter the 6-digit code from your authenticator app.")
        await call("verify", {code}, apiBase)
        window.location.assign(destination)
      })}>
        <p>Password accepted. Confirm it is you with your authenticator app.</p>
        {useRecovery ? <CodeField id="admin-recovery-code" label="Recovery code" hint="Each recovery code works once." recovery /> : <CodeField id="admin-totp-code" label="Authenticator code" hint="The 6-digit code for this site in your authenticator app." />}
        {error ? <p role="alert">{error}</p> : null}
        <button className={buttonClass} disabled={busy} type="submit">{busy ? "Checking…" : "Verify"}</button>
        <button className="fwt-btn light" type="button" onClick={() => {setError(""); setUseRecovery(value => !value)}}>{useRecovery ? "Use authenticator code" : "Use a recovery code"}</button>
      </form>
    )
  }

  if (!setup) {
    return (
      <form className={formClass} onSubmit={event => run(event, async form => {
        const data = await call("enroll/start", {enrollment_code: String(form.get("enrollment_code") || "")}, apiBase)
        setSetup(data.enrollment)
      })}>
        <p>Password accepted. This account must set up an authenticator app before it can enter the admin area.</p>
        <label htmlFor="admin-enrollment-code">Enrollment code</label>
        <input id="admin-enrollment-code" name="enrollment_code" type="password" autoComplete="off" required maxLength={256} />
        <p className="fwt-two-factor-hint">The site owner issues this one-time setup code. A password alone cannot register an authenticator.</p>
        {error ? <p role="alert">{error}</p> : null}
        <button className={buttonClass} disabled={busy} type="submit">{busy ? "Checking…" : "Start setup"}</button>
      </form>
    )
  }

  return (
    <form className={formClass} onSubmit={event => run(event, async form => {
      const data = await call("enroll/confirm", {code: String(form.get("code") || "")}, apiBase)
      setRecoveryCodes(data.recovery_codes)
    })}>
      <SetupInstructions setup={setup} />
      <CodeField id="admin-totp-confirm" label="Code from the app" />
      {error ? <p role="alert">{error}</p> : null}
      <button className={buttonClass} disabled={busy} type="submit">{busy ? "Checking…" : "Turn on two-factor sign-in"}</button>
    </form>
  )
}

/** Authenticator management for a signed-in admin. Every change asks for password and code again. */
export function AdminSecuritySettings({apiBase = defaultApiBase, formClassName: formClass = defaultFormClass, loginPath = "/login"}: SiteOptions = {}) {
  const [remaining, setRemaining] = useState<number | null>(null)
  const [setup, setSetup] = useState<Setup | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState("")

  async function refresh() {
    try {
      const data = await call("status", undefined, apiBase)
      setRemaining(data?.two_factor?.recovery_codes_remaining ?? null)
    } catch (failure) {
      if (failure instanceof TwoFactorError && mustRestart(failure.code)) window.location.assign(loginPath)
    }
  }
  useEffect(() => {void refresh()}, [])

  async function run(name: string, event: FormEvent<HTMLFormElement>, action: (form: FormData) => Promise<void>) {
    event.preventDefault()
    const target = event.currentTarget
    const form = new FormData(target)
    setError("")
    setNotice("")
    setBusy(name)
    try {
      await action(form)
      target.reset()
    } catch (failure) {
      if (failure instanceof TwoFactorError && failure.code === "unauthorized") window.location.assign(loginPath)
      else setError(message(failure))
    } finally {
      setBusy("")
    }
  }

  const credentials = (form: FormData) => ({password: String(form.get("password") || ""), code: String(form.get("code") || "")})
  const reauthFields = (prefix: string) => (
    <>
      <label htmlFor={prefix + "-password"}>Current password</label>
      <input id={prefix + "-password"} name="password" type="password" autoComplete="current-password" required minLength={8} maxLength={512} />
      <CodeField id={prefix + "-code"} label="Authenticator or recovery code" recovery />
    </>
  )

  if (recoveryCodes) {
    return <RecoveryCodes codes={recoveryCodes} action={<button className={buttonClass} type="button" onClick={() => {setRecoveryCodes(null); void refresh()}}>Done</button>} />
  }

  return (
    <div className="fwt-two-factor-settings" style={{display: "grid", gap: 32, maxWidth: 520}}>
      <p>
        Two-factor sign-in is on for this account.{remaining === null ? "" : ` Unused recovery codes: ${remaining}.`}
      </p>
      {notice ? <p role="status">{notice}</p> : null}
      {error ? <p role="alert">{error}</p> : null}

      {setup ? (
        <form className={formClass} onSubmit={event => run("confirm", event, async form => {
          const data = await call("replace/confirm", {code: String(form.get("code") || "")}, apiBase)
          setSetup(null)
          setRecoveryCodes(data.recovery_codes)
        })}>
          <h2>Confirm the new authenticator</h2>
          <SetupInstructions setup={setup} />
          <CodeField id="admin-replace-confirm" label="Code from the new app entry" />
          <p className="fwt-two-factor-hint">Your current authenticator keeps working until this code is accepted. Other signed-in sessions are then signed out and new recovery codes are issued.</p>
          <button className={buttonClass} disabled={busy !== ""} type="submit">{busy === "confirm" ? "Checking…" : "Switch to new authenticator"}</button>
        </form>
      ) : (
        <form className={formClass} onSubmit={event => run("replace", event, async form => {
          const data = await call("replace/start", credentials(form), apiBase)
          setSetup(data.enrollment)
        })}>
          <h2>Replace authenticator</h2>
          <p>Move two-factor sign-in to a new phone or app.</p>
          {reauthFields("admin-replace")}
          <button className={buttonClass} disabled={busy !== ""} type="submit">{busy === "replace" ? "Checking…" : "Set up a new authenticator"}</button>
        </form>
      )}

      <form className={formClass} onSubmit={event => run("codes", event, async form => {
        const data = await call("recovery-codes", credentials(form), apiBase)
        setRecoveryCodes(data.recovery_codes)
      })}>
        <h2>New recovery codes</h2>
        <p>Issues ten new single-use codes. All earlier recovery codes stop working.</p>
        {reauthFields("admin-codes")}
        <button className={buttonClass} disabled={busy !== ""} type="submit">{busy === "codes" ? "Checking…" : "Generate new recovery codes"}</button>
      </form>

      <form className={formClass} onSubmit={event => run("disable", event, async form => {
        if (!window.confirm("Remove the authenticator from this account? You will be signed out and will need a new enrollment code from the site owner to sign in again.")) return
        await call("disable", credentials(form), apiBase)
        window.location.assign(loginPath)
      })}>
        <h2>Remove authenticator</h2>
        <p>Two-factor sign-in stays mandatory: removing the authenticator signs this account out everywhere, and the next sign-in needs a new enrollment code from the site owner.</p>
        {reauthFields("admin-disable")}
        <button className="fwt-btn light" disabled={busy !== ""} type="submit">{busy === "disable" ? "Checking…" : "Remove authenticator"}</button>
      </form>
    </div>
  )
}
