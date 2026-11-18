export type TwoFactorState = {version: 1; accounts: Record<string, Record<string, unknown>>; challenges: Record<string, Record<string, unknown>>}
export const STATE_FILE_ENV: "KANSAS_ADMIN_TOTP_STATE_FILE"
export class StateUnavailable extends Error {
  reason: string
  constructor(reason: string)
}
export function stateFilePath(env: Record<string, string | undefined>): string
export function readState(file: string): Promise<TwoFactorState>
export function writeState(file: string, state: TwoFactorState): Promise<void>
export function withState<T>(file: string, change: (state: TwoFactorState) => T | Promise<T>): Promise<T>
export function accountOf(state: TwoFactorState, username: string): Record<string, unknown>
export function revokeSessions(account: Record<string, unknown>, nowMs: number): number
export function removeSecondFactor(state: TwoFactorState, username: string, nowMs: number): boolean
export function resetSecondFactor(file: string, username: string, nowMs?: number): Promise<{known: boolean; hadAuthenticator: boolean}>
