/** Pure helpers for the admin authenticator (TOTP) second-factor screens. */

/**
 * The second step a successful password response asks for, or null when the response does
 * not demand one. The password response never signs the admin in by itself.
 */
export function twoFactorStep(body) {
  const step = body && typeof body === "object" ? body.two_factor : null;
  if (!step || step.required !== true) return null;
  return step.state === "verify" || step.state === "enroll" ? step.state : null;
}

/** Classify what the admin typed: a 6-digit authenticator code or a recovery code. */
export function codeKind(value) {
  const code = normalizeCode(value);
  if (/^[0-9]{6}$/.test(code)) return "authenticator";
  if (/^[A-HJ-NP-Z2-9]{16}$/.test(code)) return "recovery";
  return null;
}

export function normalizeCode(value) {
  return typeof value === "string" ? value.replace(/[\s-]/g, "").toUpperCase() : "";
}

/** Setup key in groups of four for manual entry into an authenticator app. */
export function groupSetupKey(secret) {
  return typeof secret === "string" && /^[A-Z2-7]+$/.test(secret) ? secret.match(/.{1,4}/g).join(" ") : "";
}

/**
 * Image source for the enrollment QR code. The SVG is only ever used as an <img> source,
 * never injected as markup, and anything that is not a plain SVG document is refused.
 */
export function qrImageSource(svg) {
  if (typeof svg !== "string" || svg.length > 200000) return "";
  const start = svg.trimStart();
  if (!(start.startsWith("<?xml") || start.startsWith("<svg")) || /<script|<foreignObject|\son[a-z]+\s*=/i.test(svg)) return "";
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/** Whether the admin must return to the password step. */
export function mustRestart(code) {
  return code === "challenge_expired" || code === "unauthorized";
}
