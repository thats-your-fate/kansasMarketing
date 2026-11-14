// Conservative policy: preserve existing scripts, maps, analytics and Turnstile.
module.exports = [
  {
    "key": "X-Content-Type-Options",
    "value": "nosniff"
  },
  {
    "key": "X-Frame-Options",
    "value": "DENY"
  },
  {
    "key": "Referrer-Policy",
    "value": "strict-origin-when-cross-origin"
  },
  {
    "key": "Permissions-Policy",
    "value": "camera=(), microphone=(), payment=()"
  },
  {
    "key": "Content-Security-Policy",
    "value": "object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
  },
  {
    "key": "Strict-Transport-Security",
    "value": "max-age=86400"
  }
];
