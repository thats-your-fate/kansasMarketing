import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { overlayFilesystem } = require('../cache-handler.cjs')
const { nodeFs } = require('next/dist/server/lib/node-fs-methods')
const FileSystemCache = require('next/dist/server/lib/incremental-cache/file-system-cache').default

test('Next route cache writes outside its immutable build and retains seed fallback', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-cache-'))
  try {
    const serverDistDir = path.join(root, 'release/.next/server')
    const seed = path.join(serverDistDir, 'app/seed.html')
    fs.mkdirSync(path.dirname(seed), { recursive: true }); fs.writeFileSync(seed, 'immutable seed')
    const overlay = overlayFilesystem(nodeFs, serverDistDir, path.join(root, 'cache'))
    assert.equal(await overlay.readFile(seed, 'utf8'), 'immutable seed')
    await overlay.mkdir(path.dirname(seed)); await overlay.writeFile(seed, 'regenerated page')
    assert.equal(await overlay.readFile(seed, 'utf8'), 'regenerated page')
    assert.equal(overlay.readFileSync(seed, 'utf8'), 'regenerated page')
    assert.equal(fs.readFileSync(seed, 'utf8'), 'immutable seed')
    const cache = new FileSystemCache({ fs: overlay, serverDistDir, flushToDisk: true, revalidatedTags: [], maxMemoryCacheSize: 0 })
    await cache.set('new-route', { kind: 'APP_ROUTE', body: Buffer.from('new route'), status: 200, headers: { 'content-type': 'text/plain' } }, {})
    const result = await cache.get('new-route', { kind: 'APP_ROUTE' })
    assert.equal(result.value.body.toString(), 'new route')
    assert.equal(fs.existsSync(path.join(serverDistDir, 'app/new-route.body')), false)
    assert.equal(fs.existsSync(path.join(root, 'cache/server/app/new-route.body')), true)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('cache rejects escapes and internal destinations, and atomic seeds never overwrite', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-cache-'))
  try {
    const dist = path.join(root, 'release/.next')
    assert.throws(() => overlayFilesystem(nodeFs, path.join(dist, 'server'), path.join(dist, 'cache')), /external/)
    const overlay = overlayFilesystem(nodeFs, path.join(dist, 'server'), path.join(root, 'cache'))
    assert.throws(() => overlay.existsSync(path.join(root, 'other-state/secret')), /escapes/)
    const file = path.join(dist, 'server/app/page.html')
    await overlay.mkdir(path.dirname(file))
    assert.equal(await overlay.writeFileAtomic(file, 'first'), true)
    assert.equal(await overlay.writeFileAtomic(file, 'second'), false)
    assert.equal(await overlay.readFile(file, 'utf8'), 'first')
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})
