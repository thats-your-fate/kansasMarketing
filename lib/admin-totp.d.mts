export type TwoFactorAccount = {username: string; role: string; session_key: string}
export type TwoFactorContext = {
  /** Environment holding KANSAS_ADMIN_TOTP_KEY, KANSAS_ADMIN_TOTP_ENROLLMENT_CODE and KANSAS_ADMIN_TOTP_STATE_FILE. */
  env: Record<string, string | undefined>
  /** Current Unix time in milliseconds. */
  now: () => number
  /** The single admin account from the credentials file. */
  account: () => Promise<TwoFactorAccount>
  /** Checks the account's current password. */
  verifyPassword: (password: string) => Promise<boolean>
}
export type TwoFactorRequest = {sameOrigin?: boolean; session?: string; challenge?: string; input?: unknown}
/** `undefined` leaves a cookie untouched, `null` clears it. */
export type TwoFactorCookie = {token: string; maxAge: number} | null | undefined
export type TwoFactorResult = {status: number; body: Record<string, unknown>; session: TwoFactorCookie; challenge: TwoFactorCookie}
export class TwoFactorFailure extends Error {
  status: number
  code: string
  retryAfter: number | null
  persist: true
  constructor(status: number, code: string, message: string, retryAfter?: number | null)
}
export const KEY_ENV: "KANSAS_ADMIN_TOTP_KEY"
export const ENROLLMENT_ENV: "KANSAS_ADMIN_TOTP_ENROLLMENT_CODE"
export const ISSUER: string
export const SESSION_SECONDS: number
export const CHALLENGE_SECONDS: number
export function unavailable(): TwoFactorFailure
export function loginRequired(): TwoFactorFailure
export function begin(ctx: TwoFactorContext): Promise<TwoFactorResult>
export function sessionAdmin(ctx: TwoFactorContext, token: string | undefined): Promise<{username: string; role: string} | null>
export function status(ctx: TwoFactorContext, request: TwoFactorRequest): Promise<TwoFactorResult>
export function enrollStart(ctx: TwoFactorContext, request: TwoFactorRequest): Promise<TwoFactorResult>
export function enrollConfirm(ctx: TwoFactorContext, request: TwoFactorRequest): Promise<TwoFactorResult>
export function verify(ctx: TwoFactorContext, request: TwoFactorRequest): Promise<TwoFactorResult>
export function replaceStart(ctx: TwoFactorContext, request: TwoFactorRequest): Promise<TwoFactorResult>
export function replaceConfirm(ctx: TwoFactorContext, request: TwoFactorRequest): Promise<TwoFactorResult>
export function regenerateRecoveryCodes(ctx: TwoFactorContext, request: TwoFactorRequest): Promise<TwoFactorResult>
export function disable(ctx: TwoFactorContext, request: TwoFactorRequest): Promise<TwoFactorResult>
