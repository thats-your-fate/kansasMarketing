import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { publicBaseUrlFromEnv } from "./sitemap-env.mjs"
import { expandedEligibleSitemapUrls, sitemapXml } from "../app/sitemap-policy.mjs"

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const outputPath = resolve(rootDir, "public/sitemap.xml")

const origin = publicBaseUrlFromEnv()
const apiBaseUrl = process.env.BACKEND_API_URL || "http://127.0.0.1:4008"
const minimumUrlCount = Number(process.env.SITEMAP_MIN_URLS || "1000")
const guidePaths = await readGuidePaths(resolve(rootDir, "app/lib/explainers.ts"))

const urls = await expandedEligibleSitemapUrls({ origin, guidePaths, apiBaseUrl })
if (Number.isInteger(minimumUrlCount) && minimumUrlCount > 0 && urls.length < minimumUrlCount) {
	throw new Error(`Generated sitemap has ${urls.length} URLs, below required minimum ${minimumUrlCount}`)
}
const body = sitemapXml(urls)

await assertParseableXml(body)
await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, body)

console.log(`Generated ${outputPath} with ${urls.length} URLs`)

async function readGuidePaths(path) {
	const source = await readFile(path, "utf8")
	const slugs = [...source.matchAll(/slug:\s*"([^"]+)"/g)].map((match) => match[1])
	return [...new Set(slugs)].map((slug) => `/guides/${slug}`)
}

async function assertParseableXml(body) {
	if (
		!body.startsWith('<?xml version="1.0" encoding="UTF-8"?>') ||
		!body.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">') ||
		!body.endsWith("</urlset>\n")
	) {
		throw new Error("Generated sitemap XML failed basic validation")
	}
}
