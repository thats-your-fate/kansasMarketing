export type AdminCredentials = {username: string; role: "admin" | "superadmin"; salt: string; password_hash: string; session_key: string}
export function credentialAccounts(value: unknown): AdminCredentials[]
export function adminCredentials(username?: string): Promise<AdminCredentials | null>
/** Routing hint only; callers must verify the token's signature. */
export function cookieUsername(token?: string): string | undefined
