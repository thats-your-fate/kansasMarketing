export function twoFactorStep(body: unknown): "verify" | "enroll" | null;
export function codeKind(value: unknown): "authenticator" | "recovery" | null;
export function normalizeCode(value: unknown): string;
export function groupSetupKey(secret: unknown): string;
export function qrImageSource(svg: unknown): string;
export function mustRestart(code: unknown): boolean;
