import test from "node:test"
import assert from "node:assert/strict"
import { verifyAdminTurnstile } from "../lib/admin-turnstile.ts"

const config = { siteKey: "test-site-key", secret: "test-secret" }
const valid = { success: true, action: "admin_login", hostname: "futurewellskansas.com" }
const mock = body => async (url, request) => {
  assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify")
  assert.equal(request.method, "POST")
  assert.equal(request.redirect, "error")
  assert.deepEqual(JSON.parse(request.body), { secret: "test-secret", response: "token" })
  return Response.json(body)
}

test("requires a bounded nonempty token before any provider request", async () => {
  let calls = 0
  for (const token of [undefined, null, false, {}, "", "  ", "x".repeat(2049)]) {
    const result = await verifyAdminTurnstile(token, config, async () => { calls++; throw Error() })
    assert.equal(result.status, 403)
  }
  assert.equal(calls, 0)
})
test("missing configuration fails closed", async () => {
  assert.equal((await verifyAdminTurnstile("token", null, mock(valid))).status, 503)
})
test("accepts a verified admin token from either canonical hostname", async () => {
  assert.deepEqual(await verifyAdminTurnstile("token", config, mock(valid)), { ok: true })
  assert.deepEqual(await verifyAdminTurnstile("token", config, mock({ ...valid, hostname: "www.futurewellskansas.com" })), { ok: true })
})
test("rejects failed, replayed, wrong-host and wrong-action tokens", async () => {
  for (const body of [{ success: false, "error-codes": ["timeout-or-duplicate"] }, { ...valid, hostname: "attacker.example" }, { ...valid, action: "contact" }, { ...valid, success: "true" }]) {
    assert.equal((await verifyAdminTurnstile("token", config, mock(body))).status, 403)
  }
})
test("network failures, provider errors and malformed JSON fail closed", async () => {
  for (const fetcher of [async () => { throw Error("offline") }, async () => new Response("down", { status: 503 }), async () => new Response("invalid json")]) {
    assert.equal((await verifyAdminTurnstile("token", config, fetcher)).status, 503)
  }
})
